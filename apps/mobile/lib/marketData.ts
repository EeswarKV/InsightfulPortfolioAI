import { supabase } from "./supabase";
import { API_URL } from "./constants";
import type { DBHolding } from "../types";
import { calculateHoldingsXIRR } from "./xirr";
import { batchGetMutualFundNAVs } from "./mutualFundAPI";

interface LivePrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    if (!refreshed.session?.access_token) {
      throw new Error("Not authenticated");
    }
    return {
      Authorization: `Bearer ${refreshed.session.access_token}`,
      "Content-Type": "application/json",
    };
  }
  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  };
}

/**
 * Fetch last traded prices from Kite REST API.
 * Works 24/7 — returns last close price when market is closed.
 *
 * @param symbols  List of Kite-style symbols e.g. ["NSE:RELIANCE", "NSE:TCS"]
 * @returns Map of "NSE:RELIANCE" → ltp number
 */
async function fetchKiteQuotes(symbols: string[]): Promise<Map<string, { ltp: number; close: number }>> {
  if (symbols.length === 0) return new Map();
  try {
    const headers = await getAuthHeaders();
    const query = symbols.join(",");
    const resp = await fetch(
      `${API_URL}/kite/quotes?symbols=${encodeURIComponent(query)}`,
      { headers }
    );
    if (!resp.ok) return new Map();
    const data: Record<string, { ltp: number; close: number }> = await resp.json();
    const result = new Map<string, { ltp: number; close: number }>();
    for (const [sym, q] of Object.entries(data)) {
      if (q.ltp > 0) result.set(sym, { ltp: q.ltp, close: q.close ?? q.ltp });
    }
    console.log("Kite REST quotes fetched:", result.size, "symbols");
    return result;
  } catch (err) {
    console.warn("fetchKiteQuotes failed:", err);
    return new Map();
  }
}


/**
 * Fetch live prices for multiple symbols
 */
export async function fetchLivePrices(symbols: string[]): Promise<Map<string, LivePrice>> {
  if (symbols.length === 0) return new Map();

  console.log("=== Fetching Live Prices ===");
  console.log("Symbols to fetch:", symbols);

  const headers = await getAuthHeaders();
  const priceMap = new Map<string, LivePrice>();

  // Fetch prices in parallel (max 5 at a time to avoid rate limits)
  const batchSize = 5;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const promises = batch.map(async (symbol) => {
      try {
        const url = `${API_URL}/market/quote/${encodeURIComponent(symbol)}?region=IN`;
        console.log(`Fetching price for ${symbol} from ${url}`);
        const response = await fetch(url, { headers });
        console.log(`Response for ${symbol}: status=${response.status}`);
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to fetch price for ${symbol}: ${response.status} - ${errorText}`);
          return null;
        }
        const data = await response.json();
        console.log(`Price data for ${symbol}:`, data);
        return {
          symbol: data.symbol,
          price: data.close || 0,
          change: (data.close || 0) - (data.previousClose || 0),
          changePercent: data.previousClose
            ? (((data.close || 0) - data.previousClose) / data.previousClose) * 100
            : 0,
        };
      } catch (error) {
        console.error(`Failed to fetch price for ${symbol}:`, error);
        return null;
      }
    });

    const results = await Promise.all(promises);
    results.forEach((result) => {
      if (result) {
        priceMap.set(result.symbol, result);
      }
    });
  }

  console.log("Prices fetched successfully:", priceMap.size, "out of", symbols.length);
  console.log("===========================");

  return priceMap;
}

/**
 * Fetch historical OHLCV candles from Kite for a stock symbol.
 * symbol: NSE ticker without prefix (e.g. "RELIANCE")
 * interval: "day" | "week" | "month"
 * fromDate / toDate: "YYYY-MM-DD"
 */
export async function fetchKiteOHLC(
  symbol: string,
  interval: string,
  fromDate: string,
  toDate: string
): Promise<{ date: string; open: number; high: number; low: number; close: number; volume: number }[]> {
  try {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams({ interval, from_date: fromDate, to_date: toDate });
    const resp = await fetch(
      `${API_URL}/kite/ohlc/${encodeURIComponent(symbol)}?${params}`,
      { headers }
    );
    if (!resp.ok) return [];
    return await resp.json();
  } catch {
    return [];
  }
}

/**
 * Calculate portfolio metrics with live prices + mutual fund NAVs
 *
 * Price Priority:
 * 1. WebSocket live price (from Zerodha KiteTicker, if available)
 * 2. Manual price (if user set it)
 * 3. Auto-fetch MF NAV (for mutual_fund asset type)
 * 4. Live stock price (from Yahoo Finance HTTP)
 * 5. Average cost (fallback)
 *
 * @param wsLivePrices  Optional map of "NSE:SYMBOL" → price from Redux marketSlice.
 *                      When provided, skips the HTTP fetch for symbols covered by WS.
 */
export async function calculatePortfolioMetrics(
  holdings: DBHolding[],
  wsLivePrices?: Record<string, { ltp: number; change: number; changePct: number }>
) {
  console.log("=== Portfolio Metrics Calculation ===");

  // Step 1: Identify stocks/ETFs that need HTTP prices (not already in WS live prices)
  const wsSymbols = new Set(Object.keys(wsLivePrices ?? {}));
  const stocksNeedingHTTP = holdings
    .filter((h) => h.asset_type === "stock" || h.asset_type === "etf")
    .filter((h) => !wsSymbols.has(`NSE:${h.symbol}`) && !wsSymbols.has(`BSE:${h.symbol}`));

  // Try Kite REST first (works 24/7, no extra API key needed)
  const kiteQuotes = await fetchKiteQuotes(stocksNeedingHTTP.map((h) => `NSE:${h.symbol}`));

  // Yahoo Finance fallback for any symbols Kite didn't return
  const uncoveredSymbols = stocksNeedingHTTP
    .map((h) => h.symbol)
    .filter((s) => !kiteQuotes.has(`NSE:${s}`) && !kiteQuotes.has(`BSE:${s}`));
  const livePrices = await fetchLivePrices(uncoveredSymbols);

  // Step 2: Fetch mutual fund NAVs for mutual funds/bonds (with manual fallback)
  const mutualFunds = holdings.filter(
    (h) => h.asset_type === "mutual_fund" || h.asset_type === "bond"
  );
  const mfNAVs = await batchGetMutualFundNAVs(
    mutualFunds.map((h) => ({ symbol: h.symbol, manualNAV: h.manual_price }))
  );

  // Step 3: Calculate portfolio value
  let investedValue = 0;
  let currentValue = 0;
  const currentPrices = new Map<string, number>(); // Map of symbol → current price

  holdings.forEach((holding) => {
    const qty = Number(holding.quantity);
    const avgCost = Number(holding.avg_cost);

    // Determine current price based on asset type and available data
    let currentPrice = avgCost;
    let priceSource = "avg_cost";

    // Priority 1: Manual price (user override)
    if (holding.manual_price && holding.manual_price > 0) {
      currentPrice = holding.manual_price;
      priceSource = "manual";
    }
    // Priority 2: Auto-fetched MF NAV (mutual funds / bonds)
    else if (
      (holding.asset_type === "mutual_fund" || holding.asset_type === "bond") &&
      mfNAVs.has(holding.symbol)
    ) {
      const mfData = mfNAVs.get(holding.symbol);
      if (mfData) {
        currentPrice = mfData.nav;
        priceSource = `auto_${mfData.source}`;
      }
    }
    // Stocks / ETFs — cascade through available price sources
    else if (holding.asset_type === "stock" || holding.asset_type === "etf") {
      const nsKey = `NSE:${holding.symbol}`;
      const bsKey = `BSE:${holding.symbol}`;

      // Priority 3: WebSocket live tick (Zerodha KiteTicker, during market hours)
      const wsTick = wsLivePrices ? (wsLivePrices[nsKey] ?? wsLivePrices[bsKey]) : null;
      // Priority 4: Kite REST quote (last traded price, available 24/7)
      const kiteQuote = kiteQuotes.get(nsKey) ?? kiteQuotes.get(bsKey);
      const kitePrice = kiteQuote?.ltp;
      // Priority 5: Yahoo Finance HTTP fallback
      const httpPrice = livePrices.get(holding.symbol);

      if (wsTick && wsTick.ltp > 0) {
        currentPrice = wsTick.ltp;
        priceSource = "websocket";
      } else if (kitePrice && kitePrice > 0) {
        currentPrice = kitePrice;
        priceSource = "kite_rest";
      } else if (httpPrice && httpPrice.price > 0) {
        currentPrice = httpPrice.price;
        priceSource = "live";
      }
    }

    const invested = qty * avgCost;
    const current = qty * currentPrice;

    // Store the computed current price for this holding
    currentPrices.set(holding.symbol, currentPrice);

    console.log(
      `${holding.symbol} (${holding.asset_type}): qty=${qty}, avgCost=₹${avgCost}, currentPrice=₹${currentPrice} (${priceSource})`
    );
    console.log(`  Invested: ₹${invested.toFixed(2)}, Current: ₹${current.toFixed(2)}`);

    investedValue += invested;
    currentValue += current;
  });

  // Build a comprehensive change map keyed by holding.symbol, covering all price sources.
  // This is used by the dashboard for today's P&L and top movers.
  const comprehensivePrices = new Map<string, LivePrice>();
  for (const holding of holdings) {
    const sym = holding.symbol;
    const nsKey = `NSE:${sym}`;
    const bsKey = `BSE:${sym}`;
    const currentPrice = currentPrices.get(sym) ?? 0;

    // Source 1: WebSocket (most accurate, real-time)
    const wsTick = wsLivePrices ? (wsLivePrices[nsKey] ?? wsLivePrices[bsKey]) : null;
    if (wsTick && wsTick.ltp > 0) {
      comprehensivePrices.set(sym, {
        symbol: sym,
        price: wsTick.ltp,
        change: wsTick.change,
        changePercent: wsTick.changePct,
      });
      continue;
    }

    // Source 2: Kite REST — compute change from ltp vs previous close
    const kiteQuote = kiteQuotes.get(nsKey) ?? kiteQuotes.get(bsKey);
    if (kiteQuote && kiteQuote.ltp > 0 && kiteQuote.close > 0) {
      const change = kiteQuote.ltp - kiteQuote.close;
      const changePercent = (change / kiteQuote.close) * 100;
      comprehensivePrices.set(sym, {
        symbol: sym,
        price: kiteQuote.ltp,
        change,
        changePercent,
      });
      continue;
    }

    // Source 3: Yahoo Finance HTTP fallback
    const httpPrice = livePrices.get(sym);
    if (httpPrice) {
      comprehensivePrices.set(sym, { ...httpPrice, symbol: sym });
      continue;
    }

    // No live data — store zero change
    comprehensivePrices.set(sym, { symbol: sym, price: currentPrice, change: 0, changePercent: 0 });
  }

  const totalReturns = currentValue - investedValue;
  const returnsPercent = investedValue > 0 ? (totalReturns / investedValue) * 100 : 0;

  // Calculate XIRR (annualized return rate accounting for timing)
  const xirr = calculateHoldingsXIRR(holdings, livePrices);

  // Build mutual fund name map (scheme_name from mfapi.in)
  const mfNames = new Map<string, string>();
  for (const [sym, entry] of mfNAVs.entries()) {
    if (entry.name) mfNames.set(sym, entry.name);
  }

  console.log("Total Invested: ₹" + investedValue.toFixed(2));
  console.log("Total Current: ₹" + currentValue.toFixed(2));
  console.log(`Total Returns: ₹${totalReturns.toFixed(2)} (${returnsPercent.toFixed(2)}%)`);
  console.log(`XIRR: ${xirr !== null ? xirr.toFixed(2) + '%' : 'N/A'}`);
  console.log("====================================");

  return {
    investedValue,
    currentValue,
    totalReturns,
    returnsPercent,
    xirr,
    livePrices: comprehensivePrices, // keyed by holding.symbol, covers WS + Kite + HTTP sources
    currentPrices, // Map of symbol → computed current price for each holding
    mfNames, // Map of scheme_code → scheme_name from mfapi.in
  };
}
