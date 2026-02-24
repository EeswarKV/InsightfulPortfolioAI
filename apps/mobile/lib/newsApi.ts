import { supabase } from "./supabase";
import { API_URL } from "./constants";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    if (!refreshed.session?.access_token) {
      throw new Error("Not authenticated");
    }
    return { Authorization: `Bearer ${refreshed.session.access_token}` };
  }
  return { Authorization: `Bearer ${session.access_token}` };
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  published_at: string;
  symbols: string[];
  thumbnail: string | null;
}

export async function fetchMarketNews(limit = 25): Promise<NewsItem[]> {
  const headers = await getAuthHeaders();
  const resp = await fetch(`${API_URL}/news/market?limit=${limit}`, { headers });
  if (!resp.ok) return [];
  return resp.json();
}

export async function fetchResultsNews(limit = 25): Promise<NewsItem[]> {
  const headers = await getAuthHeaders();
  const resp = await fetch(`${API_URL}/news/results?limit=${limit}`, { headers });
  if (!resp.ok) return [];
  return resp.json();
}

export async function fetchCompanyNews(
  symbols: string[],
  limit = 8
): Promise<NewsItem[]> {
  if (!symbols.length) return [];
  const headers = await getAuthHeaders();
  const symsParam = symbols.join(",");
  const resp = await fetch(
    `${API_URL}/news/company?symbols=${encodeURIComponent(symsParam)}&limit=${limit}`,
    { headers }
  );
  if (!resp.ok) return [];
  return resp.json();
}
