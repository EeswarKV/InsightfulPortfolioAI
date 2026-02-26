import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "../../lib/supabase";
import { API_URL } from "../../lib/constants";

export interface WatchlistItem {
  symbol: string;
  name: string;
  addedAt: string;
}

export interface Watchlist {
  id: string;
  name: string;
  items: WatchlistItem[];
  createdAt: string;
}

interface WatchlistState {
  watchlists: Watchlist[];
  loaded: boolean;
}

const initialState: WatchlistState = {
  watchlists: [],
  loaded: false,
};

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not authenticated");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function mapRow(w: any): Watchlist {
  return {
    id: w.id,
    name: w.name,
    createdAt: w.createdAt ?? w.created_at ?? "",
    items: (w.watchlist_items ?? []).map((i: any) => ({
      symbol: i.symbol,
      name: i.name ?? "",
      addedAt: i.added_at ?? "",
    })),
  };
}

// ── Thunks ────────────────────────────────────────────────────────────────────

export const loadWatchlists = createAsyncThunk("watchlists/load", async () => {
  const headers = await authHeaders();
  const resp = await fetch(`${API_URL}/watchlists`, { headers });
  if (!resp.ok) throw new Error("Failed to load watchlists");
  const data: any[] = await resp.json();
  return data.map(mapRow);
});

export const createWatchlist = createAsyncThunk(
  "watchlists/create",
  async ({ name }: { name: string }) => {
    const headers = await authHeaders();
    const resp = await fetch(`${API_URL}/watchlists`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name }),
    });
    if (!resp.ok) throw new Error("Failed to create watchlist");
    return mapRow(await resp.json());
  }
);

export const deleteWatchlist = createAsyncThunk(
  "watchlists/delete",
  async (id: string) => {
    const headers = await authHeaders();
    await fetch(`${API_URL}/watchlists/${id}`, { method: "DELETE", headers });
    return id;
  }
);

export const renameWatchlist = createAsyncThunk(
  "watchlists/rename",
  async ({ id, name }: { id: string; name: string }) => {
    const headers = await authHeaders();
    const resp = await fetch(`${API_URL}/watchlists/${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ name }),
    });
    if (!resp.ok) throw new Error("Failed to rename watchlist");
    return mapRow(await resp.json());
  }
);

export const addToWatchlist = createAsyncThunk(
  "watchlists/addItem",
  async ({ watchlistId, item }: { watchlistId: string; item: WatchlistItem }) => {
    const headers = await authHeaders();
    await fetch(`${API_URL}/watchlists/${watchlistId}/items`, {
      method: "POST",
      headers,
      body: JSON.stringify({ symbol: item.symbol, name: item.name }),
    });
    return { watchlistId, item };
  }
);

export const removeFromWatchlist = createAsyncThunk(
  "watchlists/removeItem",
  async ({ watchlistId, symbol }: { watchlistId: string; symbol: string }) => {
    const headers = await authHeaders();
    await fetch(
      `${API_URL}/watchlists/${watchlistId}/items/${encodeURIComponent(symbol)}`,
      { method: "DELETE", headers }
    );
    return { watchlistId, symbol };
  }
);

// ── Slice ─────────────────────────────────────────────────────────────────────

const watchlistSlice = createSlice({
  name: "watchlists",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // load
      .addCase(loadWatchlists.fulfilled, (state, action) => {
        state.watchlists = action.payload;
        state.loaded = true;
      })
      .addCase(loadWatchlists.rejected, (state) => {
        state.loaded = true; // stop spinner even on error
      })
      // create
      .addCase(createWatchlist.fulfilled, (state, action) => {
        state.watchlists.push(action.payload);
      })
      // delete
      .addCase(deleteWatchlist.fulfilled, (state, action) => {
        state.watchlists = state.watchlists.filter((w) => w.id !== action.payload);
      })
      // rename
      .addCase(renameWatchlist.fulfilled, (state, action) => {
        const idx = state.watchlists.findIndex((w) => w.id === action.payload.id);
        if (idx !== -1) state.watchlists[idx] = action.payload;
      })
      // add item
      .addCase(addToWatchlist.fulfilled, (state, action) => {
        const { watchlistId, item } = action.payload;
        const w = state.watchlists.find((w) => w.id === watchlistId);
        if (w && !w.items.some((i) => i.symbol === item.symbol)) {
          w.items.push(item);
        }
      })
      // remove item
      .addCase(removeFromWatchlist.fulfilled, (state, action) => {
        const { watchlistId, symbol } = action.payload;
        const w = state.watchlists.find((w) => w.id === watchlistId);
        if (w) {
          w.items = w.items.filter((i) => i.symbol !== symbol);
        }
      });
  },
});

export default watchlistSlice.reducer;
