import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { supabase } from "../../lib/supabase";
import { API_URL } from "../../lib/constants";
import * as api from "../../lib/api";
import type {
  DBClient,
  DBPortfolio,
  DBHolding,
  DBTransaction,
  AssetType,
  TransactionType,
} from "../../types";

interface PortfolioState {
  clients: DBClient[];
  portfolios: DBPortfolio[];
  holdings: Record<string, DBHolding[]>; // keyed by portfolioId
  transactions: Record<string, DBTransaction[]>; // keyed by portfolioId
  isLoading: boolean;
  error: string | null;
}

const initialState: PortfolioState = {
  clients: [],
  portfolios: [],
  holdings: {},
  transactions: {},
  isLoading: false,
  error: null,
};

// ============================================================
// Async thunks
// ============================================================

export const fetchClients = createAsyncThunk(
  "portfolio/fetchClients",
  async (managerId: string, { rejectWithValue }) => {
    try {
      return await api.fetchClients(managerId);
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  }
);

export const assignClient = createAsyncThunk(
  "portfolio/assignClient",
  async (
    { clientEmail, managerId }: { clientEmail: string; managerId: string },
    { rejectWithValue }
  ) => {
    try {
      return await api.assignClientToManager(clientEmail, managerId);
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  }
);

export const unlinkClient = createAsyncThunk(
  "portfolio/unlinkClient",
  async (clientId: string, { rejectWithValue }) => {
    try {
      await api.unlinkClient(clientId);
      return clientId;
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  }
);

export const fetchManagerOverview = createAsyncThunk(
  "portfolio/fetchManagerOverview",
  async (managerId: string, { rejectWithValue }) => {
    try {
      const clients = await api.fetchClients(managerId);
      const clientIds = clients.map((c) => c.id);
      const portfolios = await api.fetchAllPortfoliosForClients(clientIds);
      const portfolioIds = portfolios.map((p) => p.id);
      const holdingsData = await api.fetchAllHoldingsForPortfolios(portfolioIds);
      const holdingsMap: Record<string, DBHolding[]> = {};
      for (const { portfolioId, holdings } of holdingsData) {
        holdingsMap[portfolioId] = holdings;
      }
      const txData = await api.fetchAllTransactionsForPortfolios(portfolioIds);
      const txMap: Record<string, DBTransaction[]> = {};
      for (const { portfolioId, transactions } of txData) {
        txMap[portfolioId] = transactions;
      }
      return { clients, portfolios, holdings: holdingsMap, transactions: txMap };
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  }
);

export const fetchPortfolios = createAsyncThunk(
  "portfolio/fetchPortfolios",
  async (clientId: string, { rejectWithValue }) => {
    try {
      return await api.fetchPortfolios(clientId);
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  }
);

export const createPortfolio = createAsyncThunk(
  "portfolio/createPortfolio",
  async (
    { clientId, name }: { clientId: string; name: string },
    { rejectWithValue }
  ) => {
    try {
      return await api.createPortfolio(clientId, name);
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  }
);

export const fetchHoldings = createAsyncThunk(
  "portfolio/fetchHoldings",
  async (portfolioId: string, { rejectWithValue }) => {
    try {
      const data = await api.fetchHoldings(portfolioId);
      return { portfolioId, data };
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  }
);

export const addHolding = createAsyncThunk(
  "portfolio/addHolding",
  async (
    {
      portfolioId,
      holding,
    }: {
      portfolioId: string;
      holding: {
        symbol: string;
        quantity: number;
        avg_cost: number;
        asset_type: AssetType;
        source?: string;
      };
    },
    { rejectWithValue }
  ) => {
    try {
      const data = await api.addHolding(portfolioId, holding);
      return { portfolioId, data };
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  }
);

export const updateHolding = createAsyncThunk(
  "portfolio/updateHolding",
  async (
    {
      holdingId,
      portfolioId,
      updates,
    }: {
      holdingId: string;
      portfolioId: string;
      updates: {
        symbol?: string;
        quantity?: number;
        avg_cost?: number;
        asset_type?: AssetType;
        source?: string | null;
        purchase_date?: string | null;
      };
    },
    { rejectWithValue }
  ) => {
    try {
      const data = await api.updateHolding(holdingId, updates);
      return { portfolioId, data };
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  }
);

export const deleteHolding = createAsyncThunk(
  "portfolio/deleteHolding",
  async (
    { holdingId, portfolioId }: { holdingId: string; portfolioId: string },
    { rejectWithValue }
  ) => {
    try {
      await api.deleteHolding(holdingId, portfolioId);
      return { holdingId, portfolioId };
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  }
);

export const fetchTransactions = createAsyncThunk(
  "portfolio/fetchTransactions",
  async (portfolioId: string, { rejectWithValue }) => {
    try {
      const data = await api.fetchTransactions(portfolioId);
      return { portfolioId, data };
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  }
);

export const addTransaction = createAsyncThunk(
  "portfolio/addTransaction",
  async (
    {
      portfolioId,
      transaction,
    }: {
      portfolioId: string;
      transaction: {
        symbol: string;
        type: TransactionType;
        quantity: number;
        price: number;
        date?: string;
      };
    },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const data = await api.addTransaction(portfolioId, transaction);
      // Refresh holdings so the averaged qty/avg_cost is reflected immediately
      if (transaction.type === "buy" || transaction.type === "sell") {
        dispatch(fetchHoldings(portfolioId));
      }
      return { portfolioId, data };
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  }
);

export const updateClientNotes = createAsyncThunk(
  "portfolio/updateClientNotes",
  async (
    { clientId, notes }: { clientId: string; notes: string },
    { rejectWithValue }
  ) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");
      const resp = await fetch(`${API_URL}/users/clients/${clientId}/notes`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!resp.ok) throw new Error("Failed to update notes");
      return { clientId, notes };
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  }
);

// ============================================================
// Slice
// ============================================================

const portfolioSlice = createSlice({
  name: "portfolio",
  initialState,
  reducers: {
    clearPortfolioError(state) {
      state.error = null;
    },
    resetPortfolioState() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // fetchManagerOverview
    builder
      .addCase(fetchManagerOverview.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        // Clear existing data to prevent stale holdings
        state.clients = [];
        state.portfolios = [];
        state.holdings = {};
        state.transactions = {};
      })
      .addCase(fetchManagerOverview.fulfilled, (state, action) => {
        state.clients = action.payload.clients;
        state.portfolios = action.payload.portfolios;
        state.holdings = action.payload.holdings;
        state.transactions = action.payload.transactions;
        state.isLoading = false;
      })
      .addCase(fetchManagerOverview.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // fetchClients
    builder
      .addCase(fetchClients.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.clients = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // assignClient
    builder.addCase(assignClient.fulfilled, (state, action) => {
      state.clients.push(action.payload);
    });

    // unlinkClient
    builder.addCase(unlinkClient.fulfilled, (state, action) => {
      state.clients = state.clients.filter((c) => c.id !== action.payload);
      // Also remove portfolios and holdings for this client
      const clientPortfolios = state.portfolios.filter((p) => p.client_id === action.payload);
      for (const p of clientPortfolios) {
        delete state.holdings[p.id];
        delete state.transactions[p.id];
      }
      state.portfolios = state.portfolios.filter((p) => p.client_id !== action.payload);
    });

    // fetchPortfolios
    builder
      .addCase(fetchPortfolios.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchPortfolios.fulfilled, (state, action) => {
        state.portfolios = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchPortfolios.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // createPortfolio
    builder.addCase(createPortfolio.fulfilled, (state, action) => {
      state.portfolios.push(action.payload);
    });

    // fetchHoldings
    builder
      .addCase(fetchHoldings.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchHoldings.fulfilled, (state, action) => {
        state.holdings[action.payload.portfolioId] = action.payload.data;
        state.isLoading = false;
      })
      .addCase(fetchHoldings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // addHolding
    builder.addCase(addHolding.fulfilled, (state, action) => {
      const { portfolioId, data } = action.payload;
      if (!state.holdings[portfolioId]) state.holdings[portfolioId] = [];
      state.holdings[portfolioId].push(data);
    });

    // updateHolding
    builder.addCase(updateHolding.fulfilled, (state, action) => {
      const { portfolioId, data } = action.payload;
      const list = state.holdings[portfolioId];
      if (list) {
        const idx = list.findIndex((h) => h.id === data.id);
        if (idx !== -1) list[idx] = data;
      }
    });

    // deleteHolding
    builder.addCase(deleteHolding.fulfilled, (state, action) => {
      const { holdingId, portfolioId } = action.payload;
      const list = state.holdings[portfolioId];
      if (list) {
        state.holdings[portfolioId] = list.filter((h) => h.id !== holdingId);
      }
    });

    // fetchTransactions
    builder
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.transactions[action.payload.portfolioId] = action.payload.data;
      });

    // addTransaction
    builder.addCase(addTransaction.fulfilled, (state, action) => {
      const { portfolioId, data } = action.payload;
      if (!state.transactions[portfolioId]) state.transactions[portfolioId] = [];
      state.transactions[portfolioId].unshift(data);
    });

    // updateClientNotes
    builder.addCase(updateClientNotes.fulfilled, (state, action) => {
      const { clientId, notes } = action.payload;
      const client = state.clients.find((c) => c.id === clientId);
      if (client) client.notes = notes;
    });
  },
});

export const { clearPortfolioError, resetPortfolioState } = portfolioSlice.actions;
export default portfolioSlice.reducer;
