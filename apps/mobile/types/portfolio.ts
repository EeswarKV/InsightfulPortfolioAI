// ============================================================
// Mock data types (used by research, updates, chat screens)
// ============================================================

export interface Client {
  id: number;
  name: string;
  email?: string;
  aum: number;
  change: number;
  holdings: number;
  risk: "Conservative" | "Moderate" | "Aggressive";
}

export interface Holding {
  symbol: string;
  name: string;
  shares: number;
  price: number;
  change: number;
  value: number;
  allocation: number;
}

export interface NewsItem {
  id: number;
  title: string;
  source: string;
  time: string;
  symbol: string | null;
  sentiment: "positive" | "negative" | "neutral";
}

export interface ChatMessage {
  role: "client" | "bot";
  text: string;
}

export interface KeyMetric {
  label: string;
  value: string;
  status: "good" | "warning" | "neutral";
}

export interface QuarterlyRevenue {
  q: string;
  value: number;
}

export interface CompanyData {
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
  analystRating: string;
  priceTarget: string;
  description: string;
  strengths: string[];
  risks: string[];
  keyMetrics: KeyMetric[];
  quarterlyRevenue: QuarterlyRevenue[];
}

export interface TrendingCompany {
  symbol: string;
  name: string;
  change: string;
  positive: boolean;
}

// ============================================================
// Database types (match Supabase schema)
// ============================================================

export type AssetType = "stock" | "etf" | "mutual_fund" | "bond" | "crypto";
export type TransactionType = "buy" | "sell" | "dividend";

export interface DBClient {
  id: string;
  email: string;
  full_name: string;
  role: "manager" | "client";
  manager_id: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface DBPortfolio {
  id: string;
  client_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface DBHolding {
  id: string;
  portfolio_id: string;
  symbol: string;
  quantity: number;
  avg_cost: number;
  asset_type: AssetType;
  source: string | null;
  purchase_date: string;
  created_at: string;
  updated_at: string;
  manual_price: number | null;
  last_price_update: string | null;
}

export interface DBTransaction {
  id: string;
  portfolio_id: string;
  symbol: string;
  type: TransactionType;
  quantity: number;
  price: number;
  date: string;
  created_at: string;
}
