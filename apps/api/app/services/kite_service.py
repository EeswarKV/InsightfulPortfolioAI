"""
Zerodha Kite Connect WebSocket service.
Streams real-time NSE/BSE tick data to connected mobile clients.
Falls back to 5-second Yahoo Finance polling when Kite is unavailable.
"""
import asyncio
import csv
import io
import json
import logging
import time
import threading
from typing import Any

import httpx
from fastapi import WebSocket

logger = logging.getLogger(__name__)


# ─── Instrument Cache ────────────────────────────────────────────────────────

class InstrumentCache:
    """Maps exchange:symbol ↔ Zerodha instrument_token."""

    def __init__(self):
        self._symbol_to_token: dict[str, int] = {}   # "NSE:RELIANCE" → 738561
        self._token_to_symbol: dict[int, str] = {}   # 738561 → "NSE:RELIANCE"
        self._loaded = False

    async def load(self):
        """Download instrument CSVs from Zerodha and build lookup tables."""
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                for exchange in ("NSE", "BSE"):
                    resp = await client.get(
                        f"https://api.kite.trade/instruments/{exchange}"
                    )
                    if resp.status_code != 200:
                        logger.warning("Could not fetch %s instruments: %s", exchange, resp.status_code)
                        continue

                    reader = csv.DictReader(io.StringIO(resp.text))
                    for row in reader:
                        try:
                            token = int(row["instrument_token"])
                            tradingsymbol = row["tradingsymbol"]
                            key = f"{exchange}:{tradingsymbol}"
                            self._symbol_to_token[key] = token
                            self._token_to_symbol[token] = key
                        except (KeyError, ValueError):
                            continue

            self._loaded = True
            logger.info(
                "Instrument cache loaded: %d symbols", len(self._symbol_to_token)
            )
        except Exception as exc:
            logger.error("Failed to load instrument cache: %s", exc)

    def token(self, symbol: str) -> int | None:
        """Return instrument_token for 'NSE:RELIANCE' style symbol."""
        return self._symbol_to_token.get(symbol)

    def symbol(self, token: int) -> str | None:
        """Return 'NSE:RELIANCE' style symbol for a token."""
        return self._token_to_symbol.get(token)

    def tokens_for(self, symbols: list[str]) -> list[int]:
        """Convert a list of symbols to instrument tokens, skipping unknowns."""
        result = []
        for s in symbols:
            t = self.token(s)
            if t is not None:
                result.append(t)
            else:
                logger.warning("No instrument token for symbol: %s", s)
        return result


# ─── Connection Manager ───────────────────────────────────────────────────────

class ConnectionManager:
    """Tracks WebSocket clients and their subscribed symbols, fans out ticks."""

    def __init__(self):
        self._client_symbols: dict[int, set[str]] = {}   # ws_id → {symbols}
        self._symbol_clients: dict[str, set[int]] = {}   # symbol → {ws_ids}
        self._clients: dict[int, WebSocket] = {}          # ws_id → WebSocket
        self._lock = asyncio.Lock()

    def _ws_id(self, ws: WebSocket) -> int:
        return id(ws)

    async def connect(self, ws: WebSocket):
        async with self._lock:
            wid = self._ws_id(ws)
            self._clients[wid] = ws
            self._client_symbols[wid] = set()

    async def disconnect(self, ws: WebSocket):
        async with self._lock:
            wid = self._ws_id(ws)
            for symbol in self._client_symbols.get(wid, set()):
                self._symbol_clients.get(symbol, set()).discard(wid)
            self._client_symbols.pop(wid, None)
            self._clients.pop(wid, None)

    async def subscribe(self, ws: WebSocket, symbols: list[str]):
        async with self._lock:
            wid = self._ws_id(ws)
            for symbol in symbols:
                self._client_symbols.setdefault(wid, set()).add(symbol)
                self._symbol_clients.setdefault(symbol, set()).add(wid)

    async def unsubscribe(self, ws: WebSocket, symbols: list[str]):
        async with self._lock:
            wid = self._ws_id(ws)
            for symbol in symbols:
                self._client_symbols.get(wid, set()).discard(symbol)
                self._symbol_clients.get(symbol, set()).discard(wid)

    def all_subscribed_symbols(self) -> set[str]:
        result: set[str] = set()
        for syms in self._client_symbols.values():
            result |= syms
        return result

    async def broadcast_tick(self, symbol: str, tick: dict):
        """Send tick JSON to all clients subscribed to this symbol."""
        wids = list(self._symbol_clients.get(symbol, set()))
        payload = json.dumps(tick)
        dead: list[int] = []
        for wid in wids:
            ws = self._clients.get(wid)
            if ws is None:
                dead.append(wid)
                continue
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(wid)
        # Cleanup dead connections
        async with self._lock:
            for wid in dead:
                for syms in self._client_symbols.get(wid, set()):
                    self._symbol_clients.get(syms, set()).discard(wid)
                self._client_symbols.pop(wid, None)
                self._clients.pop(wid, None)

    async def broadcast_status(self, connected: bool, source: str):
        """Send connection status to all connected clients."""
        payload = json.dumps({"type": "status", "connected": connected, "source": source})
        for ws in list(self._clients.values()):
            try:
                await ws.send_text(payload)
            except Exception:
                pass

    async def broadcast_all(self, payload: dict):
        """Send a JSON message to ALL connected WebSocket clients."""
        text = json.dumps(payload)
        dead: list[int] = []
        for wid, ws in list(self._clients.items()):
            try:
                await ws.send_text(text)
            except Exception:
                dead.append(wid)
        if dead:
            async with self._lock:
                for wid in dead:
                    for syms in self._client_symbols.get(wid, set()):
                        self._symbol_clients.get(syms, set()).discard(wid)
                    self._client_symbols.pop(wid, None)
                    self._clients.pop(wid, None)


# ─── Kite Service ─────────────────────────────────────────────────────────────

class KiteService:
    """
    Singleton that manages the KiteTicker connection and fans ticks
    out to connected WebSocket clients via ConnectionManager.
    """

    def __init__(self):
        self.instruments = InstrumentCache()
        self.manager = ConnectionManager()
        self._ticker = None
        self._connected = False
        self._source = "disconnected"
        self._fallback_task: asyncio.Task | None = None
        self._loop: asyncio.AbstractEventLoop | None = None

        # Populated from settings at startup
        self._api_key: str = ""
        self._access_token: str = ""

    async def start(self, api_key: str, access_token: str):
        self._api_key = api_key
        self._access_token = access_token
        self._loop = asyncio.get_event_loop()

        # Always load instrument cache (needed for symbol resolution)
        await self.instruments.load()

        if not api_key or not access_token:
            logger.warning("Kite credentials not configured — using fallback polling")
            self._source = "fallback"
            self._fallback_task = asyncio.create_task(self._poll_fallback())
            return

        self._start_ticker(api_key, access_token)

    def _start_ticker(self, api_key: str, access_token: str):
        """Start KiteTicker in a background thread (it manages its own loop)."""
        try:
            from kiteconnect import KiteTicker
        except ImportError:
            logger.error("kiteconnect package not installed")
            return

        ticker = KiteTicker(api_key, access_token, reconnect_max_tries=5)
        ticker.on_ticks = self._on_ticks
        ticker.on_connect = self._on_connect
        ticker.on_close = self._on_close
        ticker.on_error = self._on_error
        ticker.on_reconnect = self._on_reconnect

        self._ticker = ticker

        # KiteTicker runs its own thread with a blocking event loop
        thread = threading.Thread(target=ticker.connect, kwargs={"threaded": True}, daemon=True)
        thread.start()
        logger.info("KiteTicker thread started")

    def _on_connect(self, ws, response):
        logger.info("KiteTicker connected")
        self._connected = True
        self._source = "zerodha"

        # Subscribe to all symbols currently requested
        symbols = list(self.manager.all_subscribed_symbols())
        if symbols:
            tokens = self.instruments.tokens_for(symbols)
            if tokens:
                ws.subscribe(tokens)
                ws.set_mode(ws.MODE_LTP, tokens)

        # Notify all mobile clients of connection
        asyncio.run_coroutine_threadsafe(
            self.manager.broadcast_status(True, "zerodha"), self._loop
        )

    def _on_ticks(self, ws, ticks: list[dict]):
        """Called on every tick from Zerodha. Runs in ticker thread."""
        for tick in ticks:
            token = tick.get("instrument_token")
            symbol = self.instruments.symbol(token)
            if not symbol:
                continue

            last_price = tick.get("last_price", 0)
            ohlc = tick.get("ohlc", {})
            prev_close = ohlc.get("close", last_price)
            change = round(last_price - prev_close, 2)
            change_pct = round((change / prev_close * 100) if prev_close else 0, 2)

            payload = {
                "type": "tick",
                "symbol": symbol,
                "ltp": last_price,
                "change": change,
                "change_pct": change_pct,
                "volume": tick.get("volume_traded", 0),
                "ts": int(time.time()),
            }
            asyncio.run_coroutine_threadsafe(
                self.manager.broadcast_tick(symbol, payload), self._loop
            )

    def _on_close(self, ws, code, reason):
        logger.warning("KiteTicker closed: %s %s", code, reason)
        self._connected = False
        self._source = "disconnected"
        asyncio.run_coroutine_threadsafe(
            self.manager.broadcast_status(False, "disconnected"), self._loop
        )

    def _on_error(self, ws, code, reason):
        logger.error("KiteTicker error: %s %s", code, reason)

    def _on_reconnect(self, ws, attempts_count):
        logger.info("KiteTicker reconnecting (attempt %d)", attempts_count)

    async def subscribe_symbols(self, symbols: list[str]):
        """Called when a mobile client subscribes to new symbols."""
        if self._ticker and self._connected:
            tokens = self.instruments.tokens_for(symbols)
            if tokens:
                # KiteTicker API is thread-safe for subscribe
                self._ticker.subscribe(tokens)
                self._ticker.set_mode(self._ticker.MODE_LTP, tokens)

    async def refresh_token(self, new_access_token: str):
        """Hot-swap access token without redeployment."""
        logger.info("Refreshing Kite access token")
        self._access_token = new_access_token
        if self._ticker:
            try:
                self._ticker.close()
            except Exception:
                pass
        self._start_ticker(self._api_key, new_access_token)

    async def stop(self):
        if self._fallback_task:
            self._fallback_task.cancel()
        if self._ticker:
            try:
                self._ticker.close()
            except Exception:
                pass

    # ── Fallback polling ──────────────────────────────────────────────────────

    async def _poll_fallback(self):
        """Poll Yahoo Finance every 5s and emit fake ticks to subscribers."""
        logger.info("Fallback polling started (5s interval)")
        await self.manager.broadcast_status(False, "fallback")

        while True:
            try:
                await asyncio.sleep(5)
                symbols = list(self.manager.all_subscribed_symbols())
                if not symbols:
                    continue
                await self._fetch_and_broadcast(symbols)
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.error("Fallback poll error: %s", exc)

    async def _fetch_and_broadcast(self, symbols: list[str]):
        """Fetch prices from Yahoo Finance for given symbols and broadcast."""
        from app.config import settings

        if not settings.indian_api_key:
            return

        # Group by exchange, convert to Yahoo Finance format
        yf_symbols = []
        sym_map = {}
        for sym in symbols:
            if ":" in sym:
                exchange, ticker = sym.split(":", 1)
                suffix = ".NS" if exchange == "NSE" else ".BO"
                yf_sym = ticker + suffix
            else:
                yf_sym = sym
            yf_symbols.append(yf_sym)
            sym_map[yf_sym] = sym

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    "https://yh-finance.p.rapidapi.com/market/v2/get-quotes",
                    headers={
                        "X-RapidAPI-Key": settings.indian_api_key,
                        "X-RapidAPI-Host": "yh-finance.p.rapidapi.com",
                    },
                    params={"region": "IN", "symbols": ",".join(yf_symbols)},
                )
                if resp.status_code != 200:
                    return
                data = resp.json()
                results = data.get("quoteResponse", {}).get("result", [])

                for quote in results:
                    yf_sym = quote.get("symbol", "")
                    original_sym = sym_map.get(yf_sym, yf_sym)
                    ltp = quote.get("regularMarketPrice", 0)
                    change = round(quote.get("regularMarketChange", 0), 2)
                    change_pct = round(quote.get("regularMarketChangePercent", 0), 2)

                    payload = {
                        "type": "tick",
                        "symbol": original_sym,
                        "ltp": ltp,
                        "change": change,
                        "change_pct": change_pct,
                        "volume": quote.get("regularMarketVolume", 0),
                        "ts": int(time.time()),
                    }
                    await self.manager.broadcast_tick(original_sym, payload)
        except Exception as exc:
            logger.error("Yahoo Finance fallback fetch error: %s", exc)


# ── Global singleton ──────────────────────────────────────────────────────────
kite_service = KiteService()
