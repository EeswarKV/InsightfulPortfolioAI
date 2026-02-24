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

  // Step 1: Fetch stock prices for stocks/ETFs — skip symbols already in wsLivePrices
  const wsSymbols = new Set(Object.keys(wsLivePrices ?? {}));
  const stockSymbols = holdings
    .filter((h) => h.asset_type === "stock" || h.asset_type === "etf")
    .map((h) => h.symbol)
    .filter((sym) => !wsSymbols.has(`NSE:${sym}`) && !wsSymbols.has(`BSE:${sym}`));
  const livePrices = await fetchLivePrices(stockSymbols);

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
    // Priority 2: Auto-fetched MF NAV
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
    // Priority 3: WebSocket live price (Zerodha tick)
    else if (wsLivePrices) {
      const wsKey = `NSE:${holding.symbol}`;
      const bseKey = `BSE:${holding.symbol}`;
      const wsTick = wsLivePrices[wsKey] ?? wsLivePrices[bseKey];
      if (wsTick && wsTick.ltp > 0) {
        currentPrice = wsTick.ltp;
        priceSource = "websocket";
      }
    }
    // Priority 4: Live stock price (Yahoo Finance HTTP)
    else if (livePrices.has(holding.symbol)) {
      const livePrice = livePrices.get(holding.symbol);
      if (livePrice) {
        currentPrice = livePrice.price;
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

  const totalReturns = currentValue - investedValue;
  const returnsPercent = investedValue > 0 ? (totalReturns / investedValue) * 100 : 0;

  // Calculate XIRR (annualized return rate accounting for timing)
  const xirr = calculateHoldingsXIRR(holdings, livePrices);

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
    livePrices,
    currentPrices, // Map of symbol → computed current price for each holding
  };
}
