import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { supabase } from "../../lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  role: "manager" | "client" | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  session: null,
  role: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
};

export const signIn = createAsyncThunk(
  "auth/signIn",
  async (
    { email, password }: { email: string; password: string },
    { rejectWithValue }
  ) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

export const signUp = createAsyncThunk(
  "auth/signUp",
  async (
    {
      email,
      password,
      fullName,
      role,
      managerId,
    }: {
      email: string;
      password: string;
      fullName: string;
      role: string;
      managerId?: string;
    },
    { rejectWithValue }
  ) => {
    const metadata: Record<string, string> = { full_name: fullName, role };
    if (managerId) metadata.manager_id = managerId;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (error) return rejectWithValue(error.message);
    return data;
  }
);

export const signOut = createAsyncThunk(
  "auth/signOut",
  async (_, { dispatch }) => {
    await supabase.auth.signOut();
    // Clear other slices when user signs out
    const { resetPortfolioState } = await import("./portfolioSlice");
    dispatch(resetPortfolioState());
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setSession(
      state,
      action: PayloadAction<{ session: Session | null; user: User | null }>
    ) {
      state.session = action.payload.session;
      state.user = action.payload.user;
      state.isAuthenticated = !!action.payload.session;
      state.role =
        (action.payload.user?.user_metadata?.role as
          | "manager"
          | "client") ?? null;
      state.isLoading = false;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signIn.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.session = action.payload.session;
        state.user = action.payload.user;
        state.role =
          (action.payload.user?.user_metadata?.role as
            | "manager"
            | "client") ?? null;
        state.isAuthenticated = true;
        state.isLoading = false;
      })
      .addCase(signIn.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(signUp.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signUp.fulfilled, (state, action) => {
        state.session = action.payload.session;
        state.user = action.payload.user;
        state.role =
          (action.payload.user?.user_metadata?.role as
            | "manager"
            | "client") ?? null;
        state.isAuthenticated = !!action.payload.session;
        state.isLoading = false;
      })
      .addCase(signUp.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(signOut.fulfilled, (state) => {
        state.user = null;
        state.session = null;
        state.role = null;
        state.isAuthenticated = false;
        state.isLoading = false;
      });
  },
});

export const { setSession, clearError } = authSlice.actions;
export default authSlice.reducer;
