import { useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setTick, setStatus } from "../store/slices/marketSlice";
import type { RootState, AppDispatch } from "../store";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";
const WS_URL = API_URL.replace(/^http/, "ws"); // http→ws, https→wss

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;

/**
 * Connects to the backend WebSocket price stream and dispatches
 * live ticks + status to the Redux market slice.
 *
 * @param symbols  Array of "NSE:RELIANCE" style symbols to subscribe to.
 *                 Pass an empty array to connect without subscribing yet.
 * @returns        { connected, source } — current connection state.
 */
export function useMarketWebSocket(symbols: string[]) {
  const dispatch = useDispatch<AppDispatch>();
  const session = useSelector((s: RootState) => s.auth.session);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelay = useRef(RECONNECT_BASE_MS);
  const mountedRef = useRef(true);
  const symbolsRef = useRef<string[]>(symbols);

  // Keep symbols ref in sync without triggering reconnect
  useEffect(() => {
    symbolsRef.current = symbols;
  }, [symbols]);

  const subscribe = useCallback((ws: WebSocket) => {
    if (symbolsRef.current.length === 0) return;
    const msg = JSON.stringify({
      action: "subscribe",
      symbols: symbolsRef.current,
    });
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  }, []);

  const connect = useCallback(() => {
    if (!session?.access_token) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const url = `${WS_URL}/ws/prices?token=${session.access_token}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectDelay.current = RECONNECT_BASE_MS; // reset backoff on success
      subscribe(ws);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.type === "tick") {
          dispatch(
            setTick({
              symbol: msg.symbol,
              ltp: msg.ltp,
              change: msg.change,
              changePct: msg.change_pct,
              volume: msg.volume ?? 0,
              updatedAt: Date.now(),
            })
          );
        } else if (msg.type === "status") {
          dispatch(
            setStatus({ connected: msg.connected, source: msg.source })
          );
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      dispatch(setStatus({ connected: false, source: "disconnected" }));

      // Exponential backoff reconnect
      reconnectTimer.current = setTimeout(() => {
        if (!mountedRef.current) return;
        reconnectDelay.current = Math.min(
          reconnectDelay.current * 2,
          RECONNECT_MAX_MS
        );
        connect();
      }, reconnectDelay.current);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [session?.access_token, dispatch, subscribe]);

  // Connect on mount / when session becomes available
  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  // Re-subscribe when symbol list changes while already connected
  useEffect(() => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN && symbols.length > 0) {
      ws.send(JSON.stringify({ action: "subscribe", symbols }));
    }
  }, [symbols]);

  const connected = useSelector((s: RootState) => s.market.connected);
  const source = useSelector((s: RootState) => s.market.source);
  return { connected, source };
}
