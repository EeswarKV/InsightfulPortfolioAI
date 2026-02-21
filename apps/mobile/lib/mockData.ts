import type {
  Client,
  Holding,
  NewsItem,
  ChatMessage,
  CompanyData,
  TrendingCompany,
} from "../types";

export const clients: Client[] = [
  { id: 1, name: "Sarah Mitchell", email: "sarah@email.com", aum: 2450000, change: 3.2, holdings: 12, risk: "Moderate" },
  { id: 2, name: "James Chen", email: "james@email.com", aum: 5800000, change: -1.1, holdings: 18, risk: "Aggressive" },
  { id: 3, name: "Emily Rodriguez", email: "emily@email.com", aum: 1200000, change: 5.7, holdings: 8, risk: "Conservative" },
  { id: 4, name: "Michael Thompson", email: "michael@email.com", aum: 3750000, change: 2.1, holdings: 15, risk: "Moderate" },
  { id: 5, name: "Aisha Patel", email: "aisha@email.com", aum: 8900000, change: -0.4, holdings: 22, risk: "Aggressive" },
  { id: 6, name: "David Kim", email: "david@email.com", aum: 980000, change: 4.3, holdings: 6, risk: "Conservative" },
];

export const holdings: Holding[] = [
  { symbol: "AAPL", name: "Apple Inc.", shares: 450, price: 198.5, change: 1.8, value: 89325, allocation: 18.2 },
  { symbol: "MSFT", name: "Microsoft Corp.", shares: 280, price: 425.3, change: -0.6, value: 119084, allocation: 24.3 },
  { symbol: "GOOGL", name: "Alphabet Inc.", shares: 120, price: 175.8, change: 2.4, value: 21096, allocation: 4.3 },
  { symbol: "AMZN", name: "Amazon.com", shares: 200, price: 195.2, change: 0.9, value: 39040, allocation: 8.0 },
  { symbol: "NVDA", name: "NVIDIA Corp.", shares: 150, price: 875.4, change: 3.5, value: 131310, allocation: 26.8 },
  { symbol: "BRK.B", name: "Berkshire Hathaway", shares: 90, price: 420.1, change: 0.3, value: 37809, allocation: 7.7 },
  { symbol: "VOO", name: "Vanguard S&P 500 ETF", shares: 100, price: 520.8, change: 1.1, value: 52080, allocation: 10.6 },
];

export const newsItems: NewsItem[] = [
  { id: 1, title: "Apple announces Q4 earnings beat, stock rises in after-hours trading", source: "Bloomberg", time: "2h ago", symbol: "AAPL", sentiment: "positive" },
  { id: 2, title: "Fed signals potential rate cut in March amid cooling inflation data", source: "Reuters", time: "4h ago", symbol: null, sentiment: "positive" },
  { id: 3, title: "NVIDIA faces new US export restrictions targeting AI chips to China", source: "WSJ", time: "5h ago", symbol: "NVDA", sentiment: "negative" },
  { id: 4, title: "Microsoft Azure cloud revenue grows 29% YoY, beating analyst estimates", source: "CNBC", time: "6h ago", symbol: "MSFT", sentiment: "positive" },
  { id: 5, title: "S&P 500 closes at new all-time high on broad market rally", source: "MarketWatch", time: "8h ago", symbol: null, sentiment: "positive" },
];

export const chatMessages: ChatMessage[] = [
  { role: "client", text: "What's the current risk exposure across all client portfolios?" },
  { role: "bot", text: "Across all 6 client portfolios, the aggregate risk breakdown is: 42% in high-growth tech (NVDA, AAPL, MSFT), 18.3% in defensive positions (BRK.B, VOO), and 39.7% in mid-risk allocations. Two clients (James Chen and Aisha Patel) are flagged as 'Aggressive' — their combined tech exposure is above 65%. I'd recommend reviewing their positions given the current export restriction news affecting NVDA." },
  { role: "client", text: "Show me the top 3 holdings by unrealized gain" },
  { role: "bot", text: "Here are the top performers by unrealized gain:\n\n1. NVDA — +$48,200 (+58.2%) across 3 client portfolios\n2. MSFT — +$32,100 (+36.9%) across 4 client portfolios\n3. AAPL — +$18,700 (+26.5%) across 5 client portfolios\n\nNVDA's outsized gain is concentrated in James Chen's and Aisha Patel's accounts. Want me to draft a rebalancing proposal?" },
];

export const monthlyPerformance = [
  { label: "Jul", value: 2.1 },
  { label: "Aug", value: -0.8 },
  { label: "Sep", value: 3.4 },
  { label: "Oct", value: 1.2 },
  { label: "Nov", value: -1.5 },
  { label: "Dec", value: 4.1 },
];

export const trendingCompanies: TrendingCompany[] = [
  { symbol: "AAPL", name: "Apple Inc.", change: "+1.8%", positive: true },
  { symbol: "NVDA", name: "NVIDIA Corp.", change: "+3.5%", positive: true },
  { symbol: "MSFT", name: "Microsoft", change: "-0.6%", positive: false },
  { symbol: "TSLA", name: "Tesla Inc.", change: "+4.2%", positive: true },
  { symbol: "META", name: "Meta Platforms", change: "+1.1%", positive: true },
];

export const companyDatabase: Record<string, CompanyData> = {
  AAPL: {
    name: "Apple Inc.", sector: "Technology", industry: "Consumer Electronics", marketCap: "$3.08T", pe: 31.2, forwardPe: 28.5,
    eps: 6.42, revenue: "$394.3B", revenueGrowth: "2.8%", grossMargin: "46.2%", operatingMargin: "30.7%", netMargin: "26.3%",
    roe: "171.9%", debtToEquity: "1.87", currentRatio: "0.99", dividendYield: "0.52%", beta: 1.24, fiftyTwoHigh: "$237.49",
    fiftyTwoLow: "$164.08", price: "$198.50", change: "+1.8%", analystRating: "Buy", priceTarget: "$225.00",
    description: "Designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide. Known for iPhone, Mac, iPad, Apple Watch, and growing Services division.",
    strengths: ["Ecosystem lock-in & unrivaled brand loyalty", "Services revenue growing 16% YoY ($85B+)", "Strong cash generation ($110B+ annually)", "AI integration across product line (Apple Intelligence)"],
    risks: ["China revenue exposure (~18% of total)", "Smartphone market saturation globally", "Regulatory pressure on App Store fees (EU DMA)", "Premium valuation relative to growth rate"],
    keyMetrics: [
      { label: "P/E Ratio", value: "31.2x", status: "neutral" }, { label: "PEG Ratio", value: "2.8x", status: "warning" },
      { label: "Free Cash Flow", value: "$111.4B", status: "good" }, { label: "Debt/Equity", value: "1.87", status: "warning" },
      { label: "ROE", value: "171.9%", status: "good" }, { label: "Revenue Growth", value: "2.8%", status: "neutral" },
    ],
    quarterlyRevenue: [{ q: "Q1'24", value: 90 }, { q: "Q2'24", value: 82 }, { q: "Q3'24", value: 94 }, { q: "Q4'24", value: 128 }],
  },
  NVDA: {
    name: "NVIDIA Corp.", sector: "Technology", industry: "Semiconductors", marketCap: "$2.15T", pe: 62.8, forwardPe: 38.2,
    eps: 14.01, revenue: "$113.3B", revenueGrowth: "122.4%", grossMargin: "75.3%", operatingMargin: "62.1%", netMargin: "55.8%",
    roe: "115.2%", debtToEquity: "0.41", currentRatio: "4.17", dividendYield: "0.02%", beta: 1.67, fiftyTwoHigh: "$974.00",
    fiftyTwoLow: "$473.20", price: "$875.40", change: "+3.5%", analystRating: "Strong Buy", priceTarget: "$1,050.00",
    description: "Provides graphics, computing, and networking solutions. Leading provider of AI training and inference chips powering the global AI infrastructure buildout.",
    strengths: ["Dominant AI/ML chip market share (80%+)", "Data center revenue exploding (+217% YoY)", "CUDA ecosystem creates deep moat", "Blackwell architecture next-gen leadership"],
    risks: ["US-China export restrictions tightening", "Customer concentration risk (hyperscalers)", "Elevated valuation multiples", "Potential competition from custom ASICs (Google TPU, Amazon Trainium)"],
    keyMetrics: [
      { label: "P/E Ratio", value: "62.8x", status: "warning" }, { label: "PEG Ratio", value: "0.51x", status: "good" },
      { label: "Free Cash Flow", value: "$60.9B", status: "good" }, { label: "Debt/Equity", value: "0.41", status: "good" },
      { label: "ROE", value: "115.2%", status: "good" }, { label: "Revenue Growth", value: "122.4%", status: "good" },
    ],
    quarterlyRevenue: [{ q: "Q1'24", value: 26 }, { q: "Q2'24", value: 30 }, { q: "Q3'24", value: 35 }, { q: "Q4'24", value: 39 }],
  },
  MSFT: {
    name: "Microsoft Corp.", sector: "Technology", industry: "Software", marketCap: "$3.16T", pe: 36.4, forwardPe: 31.1,
    eps: 11.86, revenue: "$245.1B", revenueGrowth: "15.7%", grossMargin: "69.8%", operatingMargin: "44.6%", netMargin: "35.6%",
    roe: "38.5%", debtToEquity: "0.29", currentRatio: "1.24", dividendYield: "0.72%", beta: 0.89, fiftyTwoHigh: "$468.35",
    fiftyTwoLow: "$362.90", price: "$425.30", change: "-0.6%", analystRating: "Strong Buy", priceTarget: "$490.00",
    description: "Develops and supports software, services, devices, and solutions worldwide. Dominant in cloud (Azure), productivity (Office 365), and enterprise AI (Copilot).",
    strengths: ["Azure cloud growing 29% YoY", "AI Copilot monetization across all products", "Enterprise dominance with Office 365 (400M+ users)", "Diversified revenue streams across cloud, gaming, productivity"],
    risks: ["Massive AI infrastructure capex ($50B+ annually)", "Gaming division integration challenges (Activision)", "Regulatory scrutiny in EU and US", "Cloud margin pressure from AI compute costs"],
    keyMetrics: [
      { label: "P/E Ratio", value: "36.4x", status: "neutral" }, { label: "PEG Ratio", value: "2.3x", status: "neutral" },
      { label: "Free Cash Flow", value: "$74.1B", status: "good" }, { label: "Debt/Equity", value: "0.29", status: "good" },
      { label: "ROE", value: "38.5%", status: "good" }, { label: "Revenue Growth", value: "15.7%", status: "good" },
    ],
    quarterlyRevenue: [{ q: "Q1'24", value: 56 }, { q: "Q2'24", value: 62 }, { q: "Q3'24", value: 64 }, { q: "Q4'24", value: 69 }],
  },
};
