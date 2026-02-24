import { supabase } from "./supabase";
import { API_URL } from "./constants";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    if (!refreshed.session?.access_token) throw new Error("Not authenticated");
    return { Authorization: `Bearer ${refreshed.session.access_token}` };
  }
  return { Authorization: `Bearer ${session.access_token}` };
}

export interface GlobalQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
}

export interface IndexDataPoint {
  date: string;
  close: number;
}

export async function fetchGlobalQuotes(): Promise<GlobalQuote[]> {
  try {
    const headers = await getAuthHeaders();
    const resp = await fetch(`${API_URL}/market/global-quotes`, { headers });
    if (!resp.ok) return [];
    return resp.json();
  } catch {
    return [];
  }
}

export async function fetchIndexHistory(
  symbol: string,
  days: number
): Promise<IndexDataPoint[]> {
  try {
    const headers = await getAuthHeaders();
    const resp = await fetch(
      `${API_URL}/market/index-history?symbol=${encodeURIComponent(symbol)}&days=${days}`,
      { headers }
    );
    if (!resp.ok) return [];
    return resp.json();
  } catch {
    return [];
  }
}

export const INDEX_OPTIONS: { label: string; symbol: string }[] = [
  { label: "Nifty 50", symbol: "^NSEI" },
  { label: "Sensex", symbol: "^BSESN" },
  { label: "S&P 500", symbol: "^GSPC" },
  { label: "NASDAQ", symbol: "^IXIC" },
];
