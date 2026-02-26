import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "watchlists_v1";

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

// Persist to AsyncStorage
async function persist(watchlists: Watchlist[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(watchlists));
}

export const loadWatchlists = createAsyncThunk("watchlists/load", async () => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as Watchlist[]) : [];
});

const watchlistSlice = createSlice({
  name: "watchlists",
  initialState,
  reducers: {
    createWatchlist(state, action: PayloadAction<{ name: string }>) {
      const newList: Watchlist = {
        id: Date.now().toString(),
        name: action.payload.name,
        items: [],
        createdAt: new Date().toISOString(),
      };
      state.watchlists.push(newList);
      persist(state.watchlists);
    },
    deleteWatchlist(state, action: PayloadAction<string>) {
      state.watchlists = state.watchlists.filter((w) => w.id !== action.payload);
      persist(state.watchlists);
    },
    renameWatchlist(state, action: PayloadAction<{ id: string; name: string }>) {
      const w = state.watchlists.find((w) => w.id === action.payload.id);
      if (w) w.name = action.payload.name;
      persist(state.watchlists);
    },
    addToWatchlist(
      state,
      action: PayloadAction<{ watchlistId: string; item: WatchlistItem }>
    ) {
      const w = state.watchlists.find((w) => w.id === action.payload.watchlistId);
      if (w && !w.items.some((i) => i.symbol === action.payload.item.symbol)) {
        w.items.push(action.payload.item);
        persist(state.watchlists);
      }
    },
    removeFromWatchlist(
      state,
      action: PayloadAction<{ watchlistId: string; symbol: string }>
    ) {
      const w = state.watchlists.find((w) => w.id === action.payload.watchlistId);
      if (w) {
        w.items = w.items.filter((i) => i.symbol !== action.payload.symbol);
        persist(state.watchlists);
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadWatchlists.fulfilled, (state, action) => {
      state.watchlists = action.payload;
      state.loaded = true;
    });
  },
});

export const {
  createWatchlist,
  deleteWatchlist,
  renameWatchlist,
  addToWatchlist,
  removeFromWatchlist,
} = watchlistSlice.actions;

export default watchlistSlice.reducer;
