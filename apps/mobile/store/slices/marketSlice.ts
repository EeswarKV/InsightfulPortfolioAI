import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../index";

interface PriceEntry {
  ltp: number;
  change: number;
  changePct: number;
  volume: number;
  updatedAt: number; // unix timestamp ms
}

interface MarketState {
  prices: Record<string, PriceEntry>; // "NSE:RELIANCE" → PriceEntry
  connected: boolean;
  source: "zerodha" | "fallback" | "disconnected";
}

const initialState: MarketState = {
  prices: {},
  connected: false,
  source: "disconnected",
};

const marketSlice = createSlice({
  name: "market",
  initialState,
  reducers: {
    setTick(state, action: PayloadAction<{ symbol: string } & PriceEntry>) {
      const { symbol, ...price } = action.payload;
      state.prices[symbol] = price;
    },
    setStatus(
      state,
      action: PayloadAction<{ connected: boolean; source: MarketState["source"] }>
    ) {
      state.connected = action.payload.connected;
      state.source = action.payload.source;
    },
    clearPrices(state) {
      state.prices = {};
      state.connected = false;
      state.source = "disconnected";
    },
  },
});

export const { setTick, setStatus, clearPrices } = marketSlice.actions;
export default marketSlice.reducer;

// ── Selectors ────────────────────────────────────────────────────────────────

export const selectPrice = (symbol: string) => (state: RootState) =>
  state.market.prices[symbol];

export const selectAllPrices = (state: RootState) => state.market.prices;
export const selectMarketConnected = (state: RootState) => state.market.connected;
export const selectMarketSource = (state: RootState) => state.market.source;
