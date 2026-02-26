import { supabase } from "./supabase";
import { API_URL } from "./constants";
import type {
  DBClient,
  DBPortfolio,
  DBHolding,
  DBTransaction,
  AssetType,
  TransactionType,
} from "../types";

// ============================================================
// Clients
// ============================================================

export async function fetchClients(_managerId: string): Promise<DBClient[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not authenticated");
  const resp = await fetch(`${API_URL}/users/clients`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error("Failed to fetch clients");
  return resp.json();
}

export async function assignClientToManager(
  clientEmail: string,
  managerId: string
): Promise<DBClient> {
  const normalizedEmail = clientEmail.toLowerCase().trim();

  // Step 1: Find unassigned client by email
  const { data: client, error: findError } = await supabase
    .from("users")
    .select("*")
    .ilike("email", normalizedEmail)
    .eq("role", "client")
    .is("manager_id", null)
    .single();

  if (findError) {
    console.log("[LinkClient] SELECT error:", findError.message, findError.code);
    throw new Error("Client not found or already assigned");
  }
  if (!client) throw new Error("Client not found or already assigned");

  console.log("[LinkClient] Found client:", client.id, client.email);

  // Step 2: Set manager_id on the client
  const { data, error } = await supabase
    .from("users")
    .update({ manager_id: managerId })
    .eq("id", client.id)
    .select()
    .single();

  if (error) {
    console.log("[LinkClient] UPDATE error:", error.message, error.code);
    throw new Error("Failed to link client: " + error.message);
  }

  console.log("[LinkClient] Successfully linked:", data.email, "→ manager", managerId);
  return data;
}

export async function unlinkClient(clientId: string): Promise<void> {
  const { error } = await supabase
    .from("users")
    .update({ manager_id: null })
    .eq("id", clientId)
    .select()
    .single();
  if (error) throw new Error("Failed to unlink client: " + error.message);
}

// ============================================================
// Portfolios
// ============================================================

export async function fetchPortfolios(clientId: string): Promise<DBPortfolio[]> {
  const { data, error } = await supabase
    .from("portfolios")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createPortfolio(
  clientId: string,
  name: string
): Promise<DBPortfolio> {
  const { data, error } = await supabase
    .from("portfolios")
    .insert({ client_id: clientId, name })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchAllPortfoliosForClients(
  clientIds: string[]
): Promise<DBPortfolio[]> {
  if (clientIds.length === 0) return [];
  const { data, error } = await supabase
    .from("portfolios")
    .select("*")
    .in("client_id", clientIds);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchAllHoldingsForPortfolios(
  portfolioIds: string[]
): Promise<{ portfolioId: string; holdings: DBHolding[] }[]> {
  if (portfolioIds.length === 0) return [];
  const { data, error } = await supabase
    .from("holdings")
    .select("*")
    .in("portfolio_id", portfolioIds);
  if (error) throw new Error(error.message);
  const grouped: Record<string, DBHolding[]> = {};
  for (const h of data ?? []) {
    if (!grouped[h.portfolio_id]) grouped[h.portfolio_id] = [];
    grouped[h.portfolio_id].push(h);
  }
  return portfolioIds.map((pid) => ({
    portfolioId: pid,
    holdings: grouped[pid] ?? [],
  }));
}

// ============================================================
// Holdings
// ============================================================

export async function fetchHoldings(portfolioId: string): Promise<DBHolding[]> {
  const { data, error } = await supabase
    .from("holdings")
    .select("*")
    .eq("portfolio_id", portfolioId)
    .order("symbol", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function addHolding(
  portfolioId: string,
  holding: {
    symbol: string;
    quantity: number;
    avg_cost: number;
    asset_type: AssetType;
    source?: string;
    purchase_date?: string;
  }
): Promise<DBHolding> {
  const { data, error } = await supabase
    .from("holdings")
    .insert({
      portfolio_id: portfolioId,
      symbol: holding.symbol.toUpperCase(),
      quantity: holding.quantity,
      avg_cost: holding.avg_cost,
      asset_type: holding.asset_type,
      source: holding.source || null,
      purchase_date: holding.purchase_date || null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateHolding(
  holdingId: string,
  updates: {
    symbol?: string;
    quantity?: number;
    avg_cost?: number;
    asset_type?: AssetType;
    source?: string | null;
    purchase_date?: string | null;
  }
): Promise<DBHolding> {
  const payload: Record<string, unknown> = {};
  if (updates.symbol !== undefined) payload.symbol = updates.symbol.toUpperCase();
  if (updates.quantity !== undefined) payload.quantity = updates.quantity;
  if (updates.avg_cost !== undefined) payload.avg_cost = updates.avg_cost;
  if (updates.asset_type !== undefined) payload.asset_type = updates.asset_type;
  if (updates.source !== undefined) payload.source = updates.source;
  if (updates.purchase_date !== undefined) payload.purchase_date = updates.purchase_date;

  const { data, error } = await supabase
    .from("holdings")
    .update(payload)
    .eq("id", holdingId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateManualNAV(
  portfolioId: string,
  holdingId: string,
  manualPrice: number
): Promise<DBHolding> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const response = await fetch(
    `${API_URL}/portfolios/${portfolioId}/holdings/${holdingId}/price?manual_price=${manualPrice}`,
    {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to update NAV" }));
    throw new Error(error.detail || "Failed to update NAV");
  }

  return response.json();
}

export async function deleteHolding(holdingId: string, portfolioId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const response = await fetch(
    `${API_URL}/portfolios/${portfolioId}/holdings/${holdingId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok && response.status !== 204) {
    const err = await response.json().catch(() => ({ detail: "Failed to delete holding" }));
    throw new Error(err.detail || "Failed to delete holding");
  }
}

// ============================================================
// Transactions
// ============================================================

export async function fetchTransactions(
  portfolioId: string
): Promise<DBTransaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("portfolio_id", portfolioId)
    .order("date", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchAllTransactionsForPortfolios(
  portfolioIds: string[]
): Promise<{ portfolioId: string; transactions: DBTransaction[] }[]> {
  if (portfolioIds.length === 0) return [];
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .in("portfolio_id", portfolioIds)
    .order("date", { ascending: false });
  if (error) throw new Error(error.message);
  const grouped: Record<string, DBTransaction[]> = {};
  for (const t of data ?? []) {
    if (!grouped[t.portfolio_id]) grouped[t.portfolio_id] = [];
    grouped[t.portfolio_id].push(t);
  }
  return portfolioIds.map((pid) => ({
    portfolioId: pid,
    transactions: grouped[pid] ?? [],
  }));
}

export async function addTransaction(
  portfolioId: string,
  transaction: {
    symbol: string;
    type: TransactionType;
    quantity: number;
    price: number;
    date?: string;
  }
): Promise<DBTransaction> {
  // Route through the Railway API so the backend can update the holding's
  // avg_cost/quantity when a buy or sell is recorded.
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not authenticated");
  const resp = await fetch(`${API_URL}/portfolios/${portfolioId}/transactions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      symbol: transaction.symbol.toUpperCase(),
      type: transaction.type,
      quantity: transaction.quantity,
      price: transaction.price,
      ...(transaction.date ? { date: transaction.date } : {}),
    }),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "Unknown error");
    throw new Error(text);
  }
  return resp.json();
}

// ============================================================
// Profile
// ============================================================

export async function fetchProfile(): Promise<DBClient> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateProfile(
  updates: { full_name?: string; phone_number?: string; avatar_url?: string }
): Promise<DBClient> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", user.id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// ============================================================
// Portfolio Snapshots
// ============================================================

export interface PortfolioSnapshot {
  id: string;
  portfolio_id: string;
  snapshot_date: string;
  total_value: number;
  invested_value: number;
  returns_amount: number;
  returns_percent: number;
  holdings_count: number;
  snapshot_data: any;
  created_at: string;
}

export async function fetchPortfolioSnapshots(
  portfolioId: string,
  startDate?: string,
  endDate?: string
): Promise<PortfolioSnapshot[]> {
  let query = supabase
    .from("portfolio_snapshots")
    .select("*")
    .eq("portfolio_id", portfolioId)
    .order("snapshot_date", { ascending: false });

  if (startDate) {
    query = query.gte("snapshot_date", startDate);
  }
  if (endDate) {
    query = query.lte("snapshot_date", endDate);
  }

  const { data, error } = await query.limit(365);
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ============================================================
// Client Invites
// ============================================================

export interface Invite {
  id: string;
  manager_id: string;
  client_email: string;
  client_name: string;
  client_phone?: string | null;
  invite_token: string;
  expires_at: string;
  status: "pending" | "accepted" | "expired" | "cancelled";
  accepted_at?: string | null;
  created_at: string;
  updated_at: string;
  invite_url?: string;
}

export interface InviteCreateRequest {
  email: string;
  full_name: string;
  phone?: string;
}

export interface InviteAcceptRequest {
  password: string;
}

/**
 * Create a client invite (Manager only)
 */
export async function createInvite(data: InviteCreateRequest): Promise<Invite> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const response = await fetch(`${API_URL}/invites`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to create invite");
  }

  return response.json();
}

/**
 * List all invites created by manager
 */
export async function fetchInvites(statusFilter?: string): Promise<Invite[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const url = statusFilter
    ? `${API_URL}/invites?status_filter=${statusFilter}`
    : `${API_URL}/invites`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch invites");
  }

  return response.json();
}

/**
 * Get invite details by token (Public - no auth required)
 */
export async function getInviteByToken(token: string): Promise<Invite & { manager: { full_name: string; email: string } }> {
  const response = await fetch(`${API_URL}/invites/${token}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch invite");
  }

  return response.json();
}

/**
 * Accept an invite and create client account
 */
export async function acceptInvite(
  token: string,
  data: InviteAcceptRequest
): Promise<{ message: string; user_id: string; email: string }> {
  const response = await fetch(`${API_URL}/invites/${token}/accept`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to accept invite");
  }

  return response.json();
}

/**
 * Cancel a pending invite (Manager only)
 */
export async function cancelInvite(inviteId: string): Promise<{ message: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const response = await fetch(`${API_URL}/invites/${inviteId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to cancel invite");
  }

  return response.json();
}
