import { supabase } from "./supabase";
import type { CompanyData, KeyMetric, QuarterlyRevenue } from "../types";
import { API_URL } from "./constants";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    console.log("[ResearchAPI] No session, trying to refresh...");
    const { data: refreshed } = await supabase.auth.refreshSession();
    if (!refreshed.session?.access_token) {
      throw new Error("Not authenticated — please log in again");
    }
    return {
      Authorization: `Bearer ${refreshed.session.access_token}`,
      "Content-Type": "application/json",
    };
  }
  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  };
}

// ============================================================
// Search stocks (Yahoo Finance — supports Indian NSE/BSE)
// ============================================================

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

export async function searchStocks(query: string): Promise<SearchResult[]> {
  const headers = await getAuthHeaders();
  const resp = await fetch(
    `${API_URL}/research/search?q=${encodeURIComponent(query)}`,
    { headers }
  );
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: `Search failed (${resp.status})` }));
    console.log("[ResearchAPI] Search error:", resp.status, err);
    throw new Error(err.detail || "Search failed");
  }
  return resp.json();
}

// ============================================================
// Get fundamentals (yfinance — full Indian stock support)
// ============================================================

interface FundamentalsResponse {
  name: string;
  sector: string;
  industry: string;
  marketCap: string;
  pe: number;
  forwardPe: number;
  eps: number;
  revenue: string;
  revenueGrowth: string;
  grossMargin: string;
  operatingMargin: string;
  netMargin: string;
  roe: string;
  debtToEquity: string;
  currentRatio: string;
  dividendYield: string;
  beta: number;
  fiftyTwoHigh: string;
  fiftyTwoLow: string;
  price: string;
  change: string;
  description: string;
  currency: string;
  exchange: string;
  quarterlyRevenue: QuarterlyRevenue[];
}

export async function getFundamentals(
  symbol: string
): Promise<FundamentalsResponse> {
  const headers = await getAuthHeaders();
  const resp = await fetch(
    `${API_URL}/research/fundamentals/${encodeURIComponent(symbol)}`,
    { headers }
  );
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: "Failed to fetch" }));
    throw new Error(err.detail || "Failed to fetch fundamentals");
  }
  return resp.json();
}

// ============================================================
// AI Analysis (Claude Haiku via backend)
// ============================================================

interface AnalysisResponse {
  analystRating: string;
  priceTarget: string;
  strengths: string[];
  risks: string[];
  keyMetrics: KeyMetric[];
}

export async function analyzeStock(
  symbol: string,
  fundamentals: FundamentalsResponse
): Promise<AnalysisResponse> {
  const headers = await getAuthHeaders();
  const resp = await fetch(`${API_URL}/research/analyze`, {
    method: "POST",
    headers,
    body: JSON.stringify({ symbol, fundamentals }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: "Analysis failed" }));
    throw new Error(err.detail || "AI analysis failed");
  }
  return resp.json();
}

// ============================================================
// Combined: fetch fundamentals + AI analysis → CompanyData
// ============================================================

export async function getFullCompanyData(
  symbol: string
): Promise<CompanyData> {
  const fundamentals = await getFundamentals(symbol);

  let analysis: AnalysisResponse;
  try {
    analysis = await analyzeStock(symbol, fundamentals);
  } catch {
    // Fallback if AI analysis fails (no API key, etc.)
    analysis = {
      analystRating: "Hold",
      priceTarget: fundamentals.price,
      strengths: ["Fundamental data loaded successfully"],
      risks: ["AI analysis unavailable — check ANTHROPIC_API_KEY"],
      keyMetrics: [
        { label: "P/E Ratio", value: String(fundamentals.pe), status: "neutral" },
        { label: "ROE", value: fundamentals.roe, status: "neutral" },
        { label: "Debt/Equity", value: fundamentals.debtToEquity, status: "neutral" },
        { label: "Beta", value: String(fundamentals.beta), status: "neutral" },
      ],
    };
  }

  return {
    name: fundamentals.name,
    sector: fundamentals.sector,
    industry: fundamentals.industry,
    marketCap: fundamentals.marketCap,
    pe: fundamentals.pe,
    forwardPe: fundamentals.forwardPe,
    eps: fundamentals.eps,
    revenue: fundamentals.revenue,
    revenueGrowth: fundamentals.revenueGrowth,
    grossMargin: fundamentals.grossMargin,
    operatingMargin: fundamentals.operatingMargin,
    netMargin: fundamentals.netMargin,
    roe: fundamentals.roe,
    debtToEquity: fundamentals.debtToEquity,
    currentRatio: fundamentals.currentRatio,
    dividendYield: fundamentals.dividendYield,
    beta: fundamentals.beta,
    fiftyTwoHigh: fundamentals.fiftyTwoHigh,
    fiftyTwoLow: fundamentals.fiftyTwoLow,
    price: fundamentals.price,
    change: fundamentals.change,
    description: fundamentals.description,
    analystRating: analysis.analystRating,
    priceTarget: analysis.priceTarget,
    strengths: analysis.strengths,
    risks: analysis.risks,
    keyMetrics: analysis.keyMetrics,
    quarterlyRevenue: fundamentals.quarterlyRevenue,
  };
}
