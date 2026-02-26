import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "../../lib/supabase";
import { API_URL } from "../../lib/constants";

export interface PriceAlert {
  id: string;
  user_id: string;
  symbol: string;
  alert_type: "above" | "below";
  threshold_price: number;
  is_active: boolean;
  triggered_at: string | null;
  created_at: string;
}

interface PriceAlertsState {
  alerts: PriceAlert[];
  isLoading: boolean;
}

const initialState: PriceAlertsState = {
  alerts: [],
  isLoading: false,
};

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export const fetchPriceAlerts = createAsyncThunk(
  "priceAlerts/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${API_URL}/price-alerts/`, { headers });
      if (!resp.ok) throw new Error("Failed to fetch price alerts");
      return (await resp.json()) as PriceAlert[];
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  }
);

export const createPriceAlert = createAsyncThunk(
  "priceAlerts/create",
  async (
    body: { symbol: string; alert_type: "above" | "below"; threshold_price: number },
    { rejectWithValue }
  ) => {
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${API_URL}/price-alerts/`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!resp.ok) throw new Error("Failed to create price alert");
      return (await resp.json()) as PriceAlert;
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  }
);

export const deletePriceAlert = createAsyncThunk(
  "priceAlerts/delete",
  async (alertId: string, { rejectWithValue }) => {
    try {
      const headers = await getAuthHeaders();
      await fetch(`${API_URL}/price-alerts/${alertId}`, { method: "DELETE", headers });
      return alertId;
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  }
);

export const checkPriceAlerts = createAsyncThunk(
  "priceAlerts/check",
  async (_, { rejectWithValue }) => {
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${API_URL}/price-alerts/check`, { method: "POST", headers });
      if (!resp.ok) throw new Error("Failed to check price alerts");
      return (await resp.json()) as { triggered: number; checked: number };
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  }
);

const priceAlertsSlice = createSlice({
  name: "priceAlerts",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPriceAlerts.pending, (state) => { state.isLoading = true; })
      .addCase(fetchPriceAlerts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.alerts = action.payload;
      })
      .addCase(fetchPriceAlerts.rejected, (state) => { state.isLoading = false; })
      .addCase(createPriceAlert.fulfilled, (state, action) => {
        state.alerts.unshift(action.payload);
      })
      .addCase(deletePriceAlert.fulfilled, (state, action) => {
        state.alerts = state.alerts.filter((a) => a.id !== action.payload);
      });
  },
});

export default priceAlertsSlice.reducer;
