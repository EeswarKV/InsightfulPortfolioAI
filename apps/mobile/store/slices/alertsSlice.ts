import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "../../lib/supabase";
import { API_URL } from "../../lib/constants";

interface Alert {
  id: string;
  user_id: string;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
}

interface AlertsState {
  alerts: Alert[];
  unreadCount: number;
  isLoading: boolean;
}

const initialState: AlertsState = {
  alerts: [],
  unreadCount: 0,
  isLoading: false,
};

async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error("Not authenticated");
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export const fetchAlerts = createAsyncThunk(
  "alerts/fetchAlerts",
  async (_, { rejectWithValue }) => {
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${API_URL}/alerts/`, { headers });
      if (!resp.ok) throw new Error("Failed to fetch alerts");
      return (await resp.json()) as Alert[];
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  }
);

export const fetchUnreadCount = createAsyncThunk(
  "alerts/fetchUnreadCount",
  async (_, { rejectWithValue }) => {
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`${API_URL}/alerts/unread-count`, { headers });
      if (resp.status === 401 || resp.status === 403) {
        // Session is invalid on server — sign out to stop stale polling
        await supabase.auth.signOut().catch(() => {});
        return rejectWithValue("Session expired");
      }
      if (!resp.ok) throw new Error("Failed to fetch unread count");
      const data = await resp.json();
      return data.count as number;
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  }
);

export const markAlertRead = createAsyncThunk(
  "alerts/markAlertRead",
  async (alertId: string, { rejectWithValue }) => {
    try {
      const headers = await getAuthHeaders();
      await fetch(`${API_URL}/alerts/${alertId}/read`, {
        method: "PATCH",
        headers,
      });
      return alertId;
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  }
);

const alertsSlice = createSlice({
  name: "alerts",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAlerts.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchAlerts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.alerts = action.payload;
        state.unreadCount = action.payload.filter((a) => !a.read).length;
      })
      .addCase(fetchAlerts.rejected, (state) => {
        state.isLoading = false;
      })
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      })
      .addCase(markAlertRead.fulfilled, (state, action) => {
        const alert = state.alerts.find((a) => a.id === action.payload);
        if (alert && !alert.read) {
          alert.read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      });
  },
});

export default alertsSlice.reducer;
