import { useState } from "react";

const COLORS = {
  bg: "#0A0E1A",
  surface: "#111628",
  surfaceHover: "#1A2035",
  card: "#151B2E",
  border: "#1D2540",
  accent: "#4F8CFF",
  accentSoft: "rgba(79,140,255,0.12)",
  accentGrad: "linear-gradient(135deg, #4F8CFF, #6C5CE7)",
  green: "#34D399",
  greenSoft: "rgba(52,211,153,0.12)",
  red: "#F87171",
  redSoft: "rgba(248,113,113,0.12)",
  yellow: "#FBBF24",
  yellowSoft: "rgba(251,191,36,0.12)",
  purple: "#A78BFA",
  purpleSoft: "rgba(167,139,250,0.12)",
  textPrimary: "#E8ECF4",
  textSecondary: "#8B95B0",
  textMuted: "#5A6480",
};

const clients = [
  { id: 1, name: "Sarah Mitchell", aum: 2450000, change: 3.2, holdings: 12, risk: "Moderate" },
  { id: 2, name: "James Chen", aum: 5800000, change: -1.1, holdings: 18, risk: "Aggressive" },
  { id: 3, name: "Emily Rodriguez", aum: 1200000, change: 5.7, holdings: 8, risk: "Conservative" },
  { id: 4, name: "Michael Thompson", aum: 3750000, change: 2.1, holdings: 15, risk: "Moderate" },
  { id: 5, name: "Aisha Patel", aum: 8900000, change: -0.4, holdings: 22, risk: "Aggressive" },
  { id: 6, name: "David Kim", aum: 980000, change: 4.3, holdings: 6, risk: "Conservative" },
];

const holdings = [
  { symbol: "AAPL", name: "Apple Inc.", shares: 450, price: 198.5, change: 1.8, value: 89325, allocation: 18.2 },
  { symbol: "MSFT", name: "Microsoft Corp.", shares: 280, price: 425.3, change: -0.6, value: 119084, allocation: 24.3 },
  { symbol: "GOOGL", name: "Alphabet Inc.", shares: 120, price: 175.8, change: 2.4, value: 21096, allocation: 4.3 },
  { symbol: "AMZN", name: "Amazon.com", shares: 200, price: 195.2, change: 0.9, value: 39040, allocation: 8.0 },
  { symbol: "NVDA", name: "NVIDIA Corp.", shares: 150, price: 875.4, change: 3.5, value: 131310, allocation: 26.8 },
  { symbol: "BRK.B", name: "Berkshire Hathaway", shares: 90, price: 420.1, change: 0.3, value: 37809, allocation: 7.7 },
  { symbol: "VOO", name: "Vanguard S&P 500 ETF", shares: 100, price: 520.8, change: 1.1, value: 52080, allocation: 10.6 },
];

const newsItems = [
  { id: 1, title: "Apple announces Q4 earnings beat", source: "Bloomberg", time: "2h ago", symbol: "AAPL", sentiment: "positive" },
  { id: 2, title: "Fed signals potential rate cut in March", source: "Reuters", time: "4h ago", symbol: null, sentiment: "positive" },
  { id: 3, title: "NVIDIA faces new export restrictions", source: "WSJ", time: "5h ago", symbol: "NVDA", sentiment: "negative" },
  { id: 4, title: "Microsoft Azure revenue grows 29% YoY", source: "CNBC", time: "6h ago", symbol: "MSFT", sentiment: "positive" },
  { id: 5, title: "S&P 500 reaches new all-time high", source: "MarketWatch", time: "8h ago", symbol: null, sentiment: "positive" },
];

const chatMessages = [
  { role: "client", text: "Hi, I saw that NVIDIA dropped today. Should I be worried about my position?" },
  { role: "bot", text: "Based on your fund manager's research, NVIDIA remains a strong long-term hold. The recent dip is related to export restriction news, but the company's AI infrastructure dominance is intact. Your current allocation is 26.8% — your manager flagged this as a core conviction position." },
  { role: "client", text: "What about rebalancing into more defensive positions?" },
  { role: "bot", text: "Your portfolio's risk profile is set to 'Moderate' by your manager. Current defensive allocation (BRK.B + VOO) is at 18.3%. I can flag a rebalancing request to your manager if you'd like." },
];

const companyDatabase = {
  AAPL: {
    name: "Apple Inc.", sector: "Technology", industry: "Consumer Electronics", marketCap: "$3.08T", pe: 31.2, forwardPe: 28.5,
    eps: 6.42, revenue: "$394.3B", revenueGrowth: "2.8%", grossMargin: "46.2%", operatingMargin: "30.7%", netMargin: "26.3%",
    roe: "171.9%", debtToEquity: "1.87", currentRatio: "0.99", dividendYield: "0.52%", beta: 1.24, fiftyTwoHigh: "$237.49",
    fiftyTwoLow: "$164.08", price: "$198.50", change: "+1.8%", analystRating: "Buy", priceTarget: "$225.00",
    description: "Designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.",
    strengths: ["Ecosystem lock-in & brand loyalty", "Services revenue growing 16% YoY", "Strong cash generation ($110B+ annually)", "AI integration across product line"],
    risks: ["China revenue exposure (18%)", "Smartphone market saturation", "Regulatory pressure (App Store fees)", "High valuation premium"],
    keyMetrics: [
      { label: "P/E Ratio", value: "31.2x", status: "neutral" },
      { label: "PEG Ratio", value: "2.8x", status: "warning" },
      { label: "Free Cash Flow", value: "$111.4B", status: "good" },
      { label: "Debt/Equity", value: "1.87", status: "warning" },
      { label: "ROE", value: "171.9%", status: "good" },
      { label: "Revenue Growth", value: "2.8%", status: "neutral" },
    ],
    quarterlyRevenue: [
      { q: "Q1'24", value: 90 }, { q: "Q2'24", value: 82 }, { q: "Q3'24", value: 94 }, { q: "Q4'24", value: 128 },
    ]
  },
  NVDA: {
    name: "NVIDIA Corp.", sector: "Technology", industry: "Semiconductors", marketCap: "$2.15T", pe: 62.8, forwardPe: 38.2,
    eps: 14.01, revenue: "$113.3B", revenueGrowth: "122.4%", grossMargin: "75.3%", operatingMargin: "62.1%", netMargin: "55.8%",
    roe: "115.2%", debtToEquity: "0.41", currentRatio: "4.17", dividendYield: "0.02%", beta: 1.67, fiftyTwoHigh: "$974.00",
    fiftyTwoLow: "$473.20", price: "$875.40", change: "+3.5%", analystRating: "Strong Buy", priceTarget: "$1,050.00",
    description: "Provides graphics, computing, and networking solutions. Leading provider of AI training and inference chips.",
    strengths: ["Dominant AI/ML chip market share (80%+)", "Data center revenue exploding", "CUDA ecosystem moat", "Blackwell architecture leadership"],
    risks: ["US-China export restrictions", "Customer concentration (hyperscalers)", "Elevated valuation multiples", "Potential competition from custom ASICs"],
    keyMetrics: [
      { label: "P/E Ratio", value: "62.8x", status: "warning" },
      { label: "PEG Ratio", value: "0.51x", status: "good" },
      { label: "Free Cash Flow", value: "$60.9B", status: "good" },
      { label: "Debt/Equity", value: "0.41", status: "good" },
      { label: "ROE", value: "115.2%", status: "good" },
      { label: "Revenue Growth", value: "122.4%", status: "good" },
    ],
    quarterlyRevenue: [
      { q: "Q1'24", value: 26 }, { q: "Q2'24", value: 30 }, { q: "Q3'24", value: 35 }, { q: "Q4'24", value: 39 },
    ]
  },
  MSFT: {
    name: "Microsoft Corp.", sector: "Technology", industry: "Software — Infrastructure", marketCap: "$3.16T", pe: 36.4, forwardPe: 31.1,
    eps: 11.86, revenue: "$245.1B", revenueGrowth: "15.7%", grossMargin: "69.8%", operatingMargin: "44.6%", netMargin: "35.6%",
    roe: "38.5%", debtToEquity: "0.29", currentRatio: "1.24", dividendYield: "0.72%", beta: 0.89, fiftyTwoHigh: "$468.35",
    fiftyTwoLow: "$362.90", price: "$425.30", change: "-0.6%", analystRating: "Strong Buy", priceTarget: "$490.00",
    description: "Develops and supports software, services, devices, and solutions worldwide across cloud, productivity, and gaming.",
    strengths: ["Azure cloud growing 29% YoY", "AI Copilot monetization across products", "Enterprise dominance (Office 365)", "Diversified revenue streams"],
    risks: ["Increasing AI infrastructure capex", "Gaming division integration (Activision)", "Regulatory scrutiny (EU, FTC)", "Cloud margin pressure from AI costs"],
    keyMetrics: [
      { label: "P/E Ratio", value: "36.4x", status: "neutral" },
      { label: "PEG Ratio", value: "2.3x", status: "neutral" },
      { label: "Free Cash Flow", value: "$74.1B", status: "good" },
      { label: "Debt/Equity", value: "0.29", status: "good" },
      { label: "ROE", value: "38.5%", status: "good" },
      { label: "Revenue Growth", value: "15.7%", status: "good" },
    ],
    quarterlyRevenue: [
      { q: "Q1'24", value: 56 }, { q: "Q2'24", value: 62 }, { q: "Q3'24", value: 64 }, { q: "Q4'24", value: 69 },
    ]
  }
};

const trendingCompanies = [
  { symbol: "AAPL", name: "Apple Inc.", change: "+1.8%", positive: true },
  { symbol: "NVDA", name: "NVIDIA Corp.", change: "+3.5%", positive: true },
  { symbol: "MSFT", name: "Microsoft", change: "-0.6%", positive: false },
  { symbol: "TSLA", name: "Tesla Inc.", change: "+4.2%", positive: true },
  { symbol: "META", name: "Meta Platforms", change: "+1.1%", positive: true },
];

const formatCurrency = (n) => {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
};

const Badge = ({ children, color = "accent" }) => {
  const colorMap = {
    accent: { bg: COLORS.accentSoft, text: COLORS.accent },
    green: { bg: COLORS.greenSoft, text: COLORS.green },
    red: { bg: COLORS.redSoft, text: COLORS.red },
    yellow: { bg: COLORS.yellowSoft, text: COLORS.yellow },
    purple: { bg: COLORS.purpleSoft, text: COLORS.purple },
  };
  const c = colorMap[color] || colorMap.accent;
  return (
    <span style={{ background: c.bg, color: c.text, padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, letterSpacing: 0.3 }}>
      {children}
    </span>
  );
};

const Icon = ({ type, size = 20, color = COLORS.textSecondary }) => {
  const icons = {
    dashboard: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    clients: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    news: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2"/><line x1="10" y1="6" x2="18" y2="6"/><line x1="10" y1="10" x2="18" y2="10"/><line x1="10" y1="14" x2="14" y2="14"/></svg>,
    chat: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
    research: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/><line x1="11" y1="8" x2="11" y2="14"/></svg>,
    settings: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
    back: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>,
    search: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    bell: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
    portfolio: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>,
    send: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
    trending: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
    alert: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  };
  return icons[type] || null;
};

const Sparkline = ({ positive }) => {
  const points = positive
    ? "0,20 8,18 16,15 24,16 32,12 40,10 48,8 56,6 64,4"
    : "0,6 8,8 16,10 24,8 32,14 40,16 48,18 56,17 64,20";
  return (
    <svg width="64" height="24" viewBox="0 0 64 24">
      <polyline points={points} fill="none" stroke={positive ? COLORS.green : COLORS.red} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};

const DonutChart = ({ data }) => {
  let cumulative = 0;
  const total = data.reduce((s, d) => s + d.value, 0);
  const colors = ["#4F8CFF", "#34D399", "#FBBF24", "#F87171", "#A78BFA", "#FB923C", "#38BDF8"];
  const segments = data.map((d, i) => {
    const pct = d.value / total;
    const start = cumulative;
    cumulative += pct;
    const startAngle = start * 2 * Math.PI - Math.PI / 2;
    const endAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    const largeArc = pct > 0.5 ? 1 : 0;
    const r = 40;
    const cx = 50, cy = 50;
    return (
      <path key={i} d={`M ${cx} ${cy} L ${cx + r * Math.cos(startAngle)} ${cy + r * Math.sin(startAngle)} A ${r} ${r} 0 ${largeArc} 1 ${cx + r * Math.cos(endAngle)} ${cy + r * Math.sin(endAngle)} Z`}
        fill={colors[i % colors.length]} opacity={0.85}/>
    );
  });
  return (
    <svg viewBox="0 0 100 100" width="130" height="130">
      {segments}
      <circle cx="50" cy="50" r="24" fill={COLORS.card}/>
    </svg>
  );
};

const BarChart = ({ data, height = 80 }) => {
  const max = Math.max(...data.map(d => Math.abs(d.value)));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
          <div style={{ width: "100%", maxWidth: 28, height: Math.max(4, (Math.abs(d.value) / max) * (height - 20)), background: d.value >= 0 ? COLORS.green : COLORS.red, borderRadius: "4px 4px 0 0", opacity: 0.8 }}/>
          <span style={{ fontSize: 9, color: COLORS.textMuted, marginTop: 4 }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
};

const StatusDot = ({ status }) => {
  const color = status === "good" ? COLORS.green : status === "warning" ? COLORS.yellow : COLORS.textMuted;
  return <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }}/>;
};

// ============ SCREENS ============

const LoginScreen = ({ onLogin }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: 32 }}>
    <div style={{ width: 56, height: 56, borderRadius: 16, background: COLORS.accentGrad, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, boxShadow: "0 8px 32px rgba(79,140,255,0.3)" }}>
      <Icon type="portfolio" size={28} color="#fff"/>
    </div>
    <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: COLORS.textPrimary, margin: 0, letterSpacing: -0.5 }}>InsightfulPortfolio</h1>
    <p style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 6, marginBottom: 36 }}>Portfolio Intelligence Platform</p>
    <div style={{ width: "100%", maxWidth: 300 }}>
      <label style={{ fontSize: 11, color: COLORS.textSecondary, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>Email</label>
      <input style={{ width: "100%", padding: "12px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, color: COLORS.textPrimary, fontSize: 14, marginTop: 6, marginBottom: 16, outline: "none", boxSizing: "border-box" }} placeholder="manager@insightful.io"/>
      <label style={{ fontSize: 11, color: COLORS.textSecondary, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>Password</label>
      <input type="password" style={{ width: "100%", padding: "12px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, color: COLORS.textPrimary, fontSize: 14, marginTop: 6, marginBottom: 24, outline: "none", boxSizing: "border-box" }} placeholder="••••••••"/>
      <button onClick={onLogin} style={{ width: "100%", padding: "14px", background: COLORS.accentGrad, border: "none", borderRadius: 10, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 20px rgba(79,140,255,0.3)" }}>Sign In</button>
      <p style={{ textAlign: "center", fontSize: 12, color: COLORS.textMuted, marginTop: 16 }}>
        Don't have an account? <span style={{ color: COLORS.accent, cursor: "pointer" }}>Request Access</span>
      </p>
    </div>
  </div>
);

const DashboardScreen = ({ onNavigate }) => {
  const totalAUM = clients.reduce((s, c) => s + c.aum, 0);
  const monthlyData = [
    { label: "Jul", value: 2.1 }, { label: "Aug", value: -0.8 }, { label: "Sep", value: 3.4 },
    { label: "Oct", value: 1.2 }, { label: "Nov", value: -1.5 }, { label: "Dec", value: 4.1 },
  ];
  return (
    <div style={{ padding: "20px 16px", overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <p style={{ color: COLORS.textMuted, fontSize: 12, margin: 0 }}>Good morning</p>
          <h2 style={{ color: COLORS.textPrimary, fontSize: 22, margin: "4px 0 0", fontFamily: "'Playfair Display', serif" }}>Dashboard</h2>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: COLORS.surface, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${COLORS.border}`, position: "relative", cursor: "pointer" }}>
            <Icon type="bell" size={16}/>
            <div style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: "50%", background: COLORS.red }}/>
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Total AUM", value: formatCurrency(totalAUM), sub: "+2.3% MTD", color: "green" },
          { label: "Active Clients", value: clients.length, sub: "2 need review", color: "yellow" },
          { label: "Today's P&L", value: "+$45.2K", sub: "+1.8% today", color: "green" },
          { label: "Alerts", value: "3", sub: "1 urgent", color: "red" },
        ].map((kpi, i) => (
          <div key={i} style={{ background: COLORS.card, borderRadius: 14, padding: "16px 14px", border: `1px solid ${COLORS.border}` }}>
            <p style={{ color: COLORS.textMuted, fontSize: 10, margin: 0, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>{kpi.label}</p>
            <p style={{ color: COLORS.textPrimary, fontSize: 22, margin: "8px 0 4px", fontWeight: 700 }}>{kpi.value}</p>
            <Badge color={kpi.color}>{kpi.sub}</Badge>
          </div>
        ))}
      </div>
      <div style={{ background: COLORS.card, borderRadius: 14, padding: 18, border: `1px solid ${COLORS.border}`, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <p style={{ color: COLORS.textPrimary, fontSize: 14, fontWeight: 600, margin: 0 }}>Monthly Performance</p>
          <Badge>6 months</Badge>
        </div>
        <BarChart data={monthlyData}/>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <p style={{ color: COLORS.textPrimary, fontSize: 14, fontWeight: 600, margin: 0 }}>Top Clients</p>
        <span onClick={() => onNavigate("clients")} style={{ color: COLORS.accent, fontSize: 12, cursor: "pointer" }}>View All →</span>
      </div>
      {clients.slice(0, 3).map((client) => (
        <div key={client.id} onClick={() => onNavigate("portfolio", client)}
          style={{ background: COLORS.card, borderRadius: 12, padding: "14px", border: `1px solid ${COLORS.border}`, marginBottom: 8, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(135deg, ${COLORS.accent}33, #6C5CE733)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: COLORS.accent }}>
              {client.name.split(" ").map(n => n[0]).join("")}
            </div>
            <div>
              <p style={{ color: COLORS.textPrimary, fontSize: 14, fontWeight: 500, margin: 0 }}>{client.name}</p>
              <p style={{ color: COLORS.textMuted, fontSize: 11, margin: "2px 0 0" }}>{client.holdings} holdings · {client.risk}</p>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: COLORS.textPrimary, fontSize: 14, fontWeight: 600, margin: 0 }}>{formatCurrency(client.aum)}</p>
            <p style={{ color: client.change >= 0 ? COLORS.green : COLORS.red, fontSize: 12, margin: "2px 0 0" }}>
              {client.change >= 0 ? "+" : ""}{client.change}%
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

const ClientsScreen = ({ onNavigate }) => {
  const [search, setSearch] = useState("");
  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div style={{ padding: "20px 16px", overflowY: "auto", height: "100%" }}>
      <h2 style={{ color: COLORS.textPrimary, fontSize: 22, margin: "0 0 16px", fontFamily: "'Playfair Display', serif" }}>Clients</h2>
      <div style={{ position: "relative", marginBottom: 16 }}>
        <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}><Icon type="search" size={16} color={COLORS.textMuted}/></div>
        <input value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: "100%", padding: "12px 14px 12px 38px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, color: COLORS.textPrimary, fontSize: 14, outline: "none", boxSizing: "border-box" }}
          placeholder="Search clients..."/>
      </div>
      {filtered.map((client) => (
        <div key={client.id} onClick={() => onNavigate("portfolio", client)}
          style={{ background: COLORS.card, borderRadius: 12, padding: 16, border: `1px solid ${COLORS.border}`, marginBottom: 8, cursor: "pointer" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg, ${COLORS.accent}33, #6C5CE733)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: COLORS.accent }}>
                {client.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div>
                <p style={{ color: COLORS.textPrimary, fontSize: 15, fontWeight: 500, margin: 0 }}>{client.name}</p>
                <p style={{ color: COLORS.textMuted, fontSize: 12, margin: "3px 0 0" }}>{client.holdings} holdings · {client.risk}</p>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ color: COLORS.textPrimary, fontSize: 15, fontWeight: 600, margin: 0 }}>{formatCurrency(client.aum)}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end", marginTop: 2 }}>
                <Sparkline positive={client.change >= 0}/>
                <span style={{ color: client.change >= 0 ? COLORS.green : COLORS.red, fontSize: 12, fontWeight: 600 }}>
                  {client.change >= 0 ? "+" : ""}{client.change}%
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const PortfolioScreen = ({ client, onBack }) => {
  const allocationData = holdings.slice(0, 5).map(h => ({ label: h.symbol, value: h.allocation }));
  return (
    <div style={{ padding: "20px 16px", overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div onClick={onBack} style={{ cursor: "pointer", width: 32, height: 32, borderRadius: 8, background: COLORS.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon type="back" size={18}/>
        </div>
        <div>
          <h2 style={{ color: COLORS.textPrimary, fontSize: 20, margin: 0, fontFamily: "'Playfair Display', serif" }}>{client.name}</h2>
          <p style={{ color: COLORS.textMuted, fontSize: 12, margin: "2px 0 0" }}>Portfolio · {client.risk} Risk</p>
        </div>
      </div>
      <div style={{ background: `linear-gradient(135deg, ${COLORS.accent}15, #6C5CE715)`, borderRadius: 16, padding: 20, border: `1px solid ${COLORS.accent}30`, marginBottom: 16 }}>
        <p style={{ color: COLORS.textMuted, fontSize: 11, margin: 0, textTransform: "uppercase", letterSpacing: 0.5 }}>Total Value</p>
        <p style={{ color: COLORS.textPrimary, fontSize: 30, fontWeight: 700, margin: "6px 0" }}>{formatCurrency(client.aum)}</p>
        <div style={{ display: "flex", gap: 12 }}>
          <Badge color={client.change >= 0 ? "green" : "red"}>{client.change >= 0 ? "+" : ""}{client.change}% MTD</Badge>
          <Badge>{client.holdings} holdings</Badge>
        </div>
      </div>
      <div style={{ background: COLORS.card, borderRadius: 14, padding: 18, border: `1px solid ${COLORS.border}`, marginBottom: 16 }}>
        <p style={{ color: COLORS.textPrimary, fontSize: 14, fontWeight: 600, margin: "0 0 12px" }}>Allocation</p>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <DonutChart data={allocationData}/>
          <div style={{ flex: 1 }}>
            {allocationData.map((d, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: ["#4F8CFF","#34D399","#FBBF24","#F87171","#A78BFA"][i] }}/>
                  <span style={{ color: COLORS.textSecondary, fontSize: 12 }}>{d.label}</span>
                </div>
                <span style={{ color: COLORS.textPrimary, fontSize: 12, fontWeight: 600 }}>{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p style={{ color: COLORS.textPrimary, fontSize: 14, fontWeight: 600, margin: "0 0 10px" }}>Holdings</p>
      {holdings.map((h, i) => (
        <div key={i} style={{ background: COLORS.card, borderRadius: 12, padding: "12px 14px", border: `1px solid ${COLORS.border}`, marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: COLORS.textPrimary, fontSize: 14, fontWeight: 600 }}>{h.symbol}</span>
              <span style={{ color: COLORS.textMuted, fontSize: 11 }}>{h.shares} shares</span>
            </div>
            <p style={{ color: COLORS.textSecondary, fontSize: 12, margin: "2px 0 0" }}>{h.name}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: COLORS.textPrimary, fontSize: 14, fontWeight: 600, margin: 0 }}>{formatCurrency(h.value)}</p>
            <p style={{ color: h.change >= 0 ? COLORS.green : COLORS.red, fontSize: 12, margin: "2px 0 0" }}>
              {h.change >= 0 ? "+" : ""}{h.change}%
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

// ============ RESEARCH SCREEN ============
const ResearchScreen = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [activeSection, setActiveSection] = useState("overview");

  if (selectedCompany) {
    const c = companyDatabase[selectedCompany];
    if (!c) return null;
    const sections = ["overview", "financials", "analysis"];
    return (
      <div style={{ padding: "20px 16px", overflowY: "auto", height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div onClick={() => setSelectedCompany(null)} style={{ cursor: "pointer", width: 32, height: 32, borderRadius: 8, background: COLORS.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon type="back" size={18}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={{ color: COLORS.textPrimary, fontSize: 20, margin: 0, fontFamily: "'Playfair Display', serif" }}>{selectedCompany}</h2>
              <Badge color={c.analystRating === "Strong Buy" ? "green" : "accent"}>{c.analystRating}</Badge>
            </div>
            <p style={{ color: COLORS.textMuted, fontSize: 12, margin: "2px 0 0" }}>{c.name} · {c.sector}</p>
          </div>
        </div>

        {/* Price card */}
        <div style={{ background: `linear-gradient(135deg, ${COLORS.accent}12, #6C5CE712)`, borderRadius: 14, padding: 16, border: `1px solid ${COLORS.accent}25`, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ color: COLORS.textPrimary, fontSize: 28, fontWeight: 700, margin: 0 }}>{c.price}</p>
              <p style={{ color: c.change.startsWith("+") ? COLORS.green : COLORS.red, fontSize: 14, fontWeight: 600, margin: "4px 0 0" }}>{c.change} today</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ color: COLORS.textMuted, fontSize: 11, margin: 0 }}>Market Cap</p>
              <p style={{ color: COLORS.textPrimary, fontSize: 16, fontWeight: 600, margin: "2px 0 0" }}>{c.marketCap}</p>
            </div>
          </div>
        </div>

        {/* Section tabs */}
        <div style={{ display: "flex", gap: 0, marginBottom: 16, background: COLORS.surface, borderRadius: 10, padding: 3 }}>
          {sections.map(s => (
            <button key={s} onClick={() => setActiveSection(s)}
              style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", background: activeSection === s ? COLORS.card : "transparent", color: activeSection === s ? COLORS.textPrimary : COLORS.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>
              {s}
            </button>
          ))}
        </div>

        {activeSection === "overview" && (
          <>
            <p style={{ color: COLORS.textSecondary, fontSize: 13, lineHeight: 1.6, margin: "0 0 16px" }}>{c.description}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              {[
                { label: "P/E Ratio", value: c.pe },
                { label: "Forward P/E", value: c.forwardPe },
                { label: "EPS", value: `$${c.eps}` },
                { label: "Dividend", value: c.dividendYield },
                { label: "Beta", value: c.beta },
                { label: "52W Range", value: `${c.fiftyTwoLow} - ${c.fiftyTwoHigh}` },
              ].map((m, i) => (
                <div key={i} style={{ background: COLORS.card, borderRadius: 10, padding: "10px 12px", border: `1px solid ${COLORS.border}` }}>
                  <p style={{ color: COLORS.textMuted, fontSize: 10, margin: 0, textTransform: "uppercase", letterSpacing: 0.3 }}>{m.label}</p>
                  <p style={{ color: COLORS.textPrimary, fontSize: 14, fontWeight: 600, margin: "4px 0 0" }}>{m.value}</p>
                </div>
              ))}
            </div>
            <p style={{ color: COLORS.textPrimary, fontSize: 13, fontWeight: 600, margin: "0 0 8px" }}>Quarterly Revenue</p>
            <div style={{ background: COLORS.card, borderRadius: 12, padding: 14, border: `1px solid ${COLORS.border}`, marginBottom: 16 }}>
              <BarChart data={c.quarterlyRevenue.map(q => ({ label: q.q, value: q.value }))} height={70}/>
              <p style={{ color: COLORS.textMuted, fontSize: 10, margin: "8px 0 0", textAlign: "center" }}>Revenue in $B</p>
            </div>
          </>
        )}

        {activeSection === "financials" && (
          <>
            <p style={{ color: COLORS.textPrimary, fontSize: 13, fontWeight: 600, margin: "0 0 10px" }}>Key Metrics</p>
            {c.keyMetrics.map((m, i) => (
              <div key={i} style={{ background: COLORS.card, borderRadius: 10, padding: "12px 14px", border: `1px solid ${COLORS.border}`, marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <StatusDot status={m.status}/>
                  <span style={{ color: COLORS.textSecondary, fontSize: 13 }}>{m.label}</span>
                </div>
                <span style={{ color: COLORS.textPrimary, fontSize: 14, fontWeight: 600 }}>{m.value}</span>
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
              {[
                { label: "Revenue", value: c.revenue },
                { label: "Rev. Growth", value: c.revenueGrowth },
                { label: "Gross Margin", value: c.grossMargin },
                { label: "Op. Margin", value: c.operatingMargin },
                { label: "Net Margin", value: c.netMargin },
                { label: "ROE", value: c.roe },
                { label: "D/E Ratio", value: c.debtToEquity },
                { label: "Current Ratio", value: c.currentRatio },
              ].map((m, i) => (
                <div key={i} style={{ background: COLORS.card, borderRadius: 10, padding: "10px 12px", border: `1px solid ${COLORS.border}` }}>
                  <p style={{ color: COLORS.textMuted, fontSize: 10, margin: 0, textTransform: "uppercase", letterSpacing: 0.3 }}>{m.label}</p>
                  <p style={{ color: COLORS.textPrimary, fontSize: 14, fontWeight: 600, margin: "4px 0 0" }}>{m.value}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {activeSection === "analysis" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <p style={{ color: COLORS.textPrimary, fontSize: 13, fontWeight: 600, margin: 0 }}>Analyst Target</p>
              <span style={{ color: COLORS.accent, fontSize: 18, fontWeight: 700 }}>{c.priceTarget}</span>
            </div>

            <p style={{ color: COLORS.green, fontSize: 13, fontWeight: 600, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 6 }}>
              <Icon type="check" size={14} color={COLORS.green}/> Strengths
            </p>
            {c.strengths.map((s, i) => (
              <div key={i} style={{ background: COLORS.greenSoft, borderRadius: 10, padding: "10px 14px", marginBottom: 6, borderLeft: `3px solid ${COLORS.green}` }}>
                <p style={{ color: COLORS.textPrimary, fontSize: 13, margin: 0 }}>{s}</p>
              </div>
            ))}

            <p style={{ color: COLORS.yellow, fontSize: 13, fontWeight: 600, margin: "16px 0 8px", display: "flex", alignItems: "center", gap: 6 }}>
              <Icon type="alert" size={14} color={COLORS.yellow}/> Risks
            </p>
            {c.risks.map((r, i) => (
              <div key={i} style={{ background: COLORS.yellowSoft, borderRadius: 10, padding: "10px 14px", marginBottom: 6, borderLeft: `3px solid ${COLORS.yellow}` }}>
                <p style={{ color: COLORS.textPrimary, fontSize: 13, margin: 0 }}>{r}</p>
              </div>
            ))}
          </>
        )}
      </div>
    );
  }

  // Research home
  return (
    <div style={{ padding: "20px 16px", overflowY: "auto", height: "100%" }}>
      <h2 style={{ color: COLORS.textPrimary, fontSize: 22, margin: "0 0 16px", fontFamily: "'Playfair Display', serif" }}>Research</h2>
      <div style={{ position: "relative", marginBottom: 20 }}>
        <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}><Icon type="search" size={16} color={COLORS.textMuted}/></div>
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          style={{ width: "100%", padding: "12px 14px 12px 38px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, color: COLORS.textPrimary, fontSize: 14, outline: "none", boxSizing: "border-box" }}
          placeholder="Search company or ticker..."/>
      </div>

      {searchQuery && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 8px" }}>Results</p>
          {Object.entries(companyDatabase)
            .filter(([k, v]) => k.toLowerCase().includes(searchQuery.toLowerCase()) || v.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .map(([symbol, company]) => (
              <div key={symbol} onClick={() => { setSelectedCompany(symbol); setSearchQuery(""); }}
                style={{ background: COLORS.card, borderRadius: 12, padding: "14px", border: `1px solid ${COLORS.border}`, marginBottom: 8, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ color: COLORS.textPrimary, fontSize: 15, fontWeight: 600, margin: 0 }}>{symbol}</p>
                  <p style={{ color: COLORS.textMuted, fontSize: 12, margin: "2px 0 0" }}>{company.name} · {company.sector}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ color: COLORS.textPrimary, fontSize: 15, fontWeight: 600, margin: 0 }}>{company.price}</p>
                  <p style={{ color: company.change.startsWith("+") ? COLORS.green : COLORS.red, fontSize: 12, margin: "2px 0 0" }}>{company.change}</p>
                </div>
              </div>
            ))}
        </div>
      )}

      {!searchQuery && (
        <>
          <p style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
            <Icon type="trending" size={14} color={COLORS.textMuted}/> Trending
          </p>
          {trendingCompanies.map((tc, i) => (
            <div key={i} onClick={() => companyDatabase[tc.symbol] && setSelectedCompany(tc.symbol)}
              style={{ background: COLORS.card, borderRadius: 12, padding: "12px 14px", border: `1px solid ${COLORS.border}`, marginBottom: 6, cursor: companyDatabase[tc.symbol] ? "pointer" : "default", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: companyDatabase[tc.symbol] ? 1 : 0.5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: COLORS.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: COLORS.accent, border: `1px solid ${COLORS.border}` }}>{tc.symbol}</div>
                <div>
                  <p style={{ color: COLORS.textPrimary, fontSize: 14, fontWeight: 500, margin: 0 }}>{tc.name}</p>
                  <p style={{ color: COLORS.textMuted, fontSize: 11, margin: "2px 0 0" }}>Tap to view analysis</p>
                </div>
              </div>
              <span style={{ color: tc.positive ? COLORS.green : COLORS.red, fontSize: 13, fontWeight: 600 }}>{tc.change}</span>
            </div>
          ))}

          <div style={{ background: `linear-gradient(135deg, ${COLORS.purple}12, ${COLORS.accent}12)`, borderRadius: 14, padding: 18, border: `1px solid ${COLORS.purple}25`, marginTop: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Icon type="chat" size={16} color={COLORS.purple}/>
              <p style={{ color: COLORS.purple, fontSize: 13, fontWeight: 600, margin: 0 }}>AI-Powered Analysis</p>
            </div>
            <p style={{ color: COLORS.textSecondary, fontSize: 12, lineHeight: 1.5, margin: 0 }}>
              Search any company to get instant fundamental analysis powered by your research notes and market data.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

const NewsScreen = () => (
  <div style={{ padding: "20px 16px", overflowY: "auto", height: "100%" }}>
    <h2 style={{ color: COLORS.textPrimary, fontSize: 22, margin: "0 0 16px", fontFamily: "'Playfair Display', serif" }}>Market Updates</h2>
    {newsItems.map((item) => (
      <div key={item.id} style={{ background: COLORS.card, borderRadius: 12, padding: 16, border: `1px solid ${COLORS.border}`, marginBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          {item.symbol && <Badge color={item.sentiment === "positive" ? "green" : "red"}>{item.symbol}</Badge>}
          <span style={{ color: COLORS.textMuted, fontSize: 11, marginLeft: "auto" }}>{item.time}</span>
        </div>
        <p style={{ color: COLORS.textPrimary, fontSize: 14, fontWeight: 500, margin: "0 0 6px", lineHeight: 1.4 }}>{item.title}</p>
        <p style={{ color: COLORS.textMuted, fontSize: 12, margin: 0 }}>{item.source}</p>
      </div>
    ))}
  </div>
);

const ChatScreen = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(chatMessages);
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "20px 16px 12px" }}>
        <h2 style={{ color: COLORS.textPrimary, fontSize: 22, margin: 0, fontFamily: "'Playfair Display', serif" }}>AI Assistant</h2>
        <p style={{ color: COLORS.textMuted, fontSize: 12, margin: "4px 0 0" }}>Powered by Claude · Trained on manager's research</p>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px" }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "client" ? "flex-end" : "flex-start", marginBottom: 12 }}>
            <div style={{
              maxWidth: "82%", padding: "12px 16px", borderRadius: 16,
              background: msg.role === "client" ? COLORS.accentGrad : COLORS.card,
              border: msg.role === "bot" ? `1px solid ${COLORS.border}` : "none",
              borderBottomRightRadius: msg.role === "client" ? 4 : 16,
              borderBottomLeftRadius: msg.role === "bot" ? 4 : 16,
            }}>
              <p style={{ color: msg.role === "client" ? "#fff" : COLORS.textPrimary, fontSize: 13, margin: 0, lineHeight: 1.5 }}>{msg.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: "12px 16px 20px", borderTop: `1px solid ${COLORS.border}` }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            style={{ flex: 1, padding: "12px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, color: COLORS.textPrimary, fontSize: 14, outline: "none" }}
            placeholder="Ask about your investments..."
            onKeyDown={e => {
              if (e.key === "Enter" && input.trim()) {
                setMessages(prev => [...prev, { role: "client", text: input }]);
                setInput("");
                setTimeout(() => setMessages(prev => [...prev, { role: "bot", text: "I'll look into that for you. Based on your manager's latest research notes and current market data, I can provide a detailed analysis..." }]), 800);
              }
            }}/>
          <button style={{ width: 44, height: 44, borderRadius: 12, background: COLORS.accentGrad, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, boxShadow: "0 4px 16px rgba(79,140,255,0.25)" }}>
            <Icon type="send" size={18} color="#fff"/>
          </button>
        </div>
      </div>
    </div>
  );
};

// ============ MAIN APP ============
export default function App() {
  const [screen, setScreen] = useState("login");
  const [selectedClient, setSelectedClient] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  const navigate = (target, data) => {
    if (target === "portfolio") {
      setSelectedClient(data);
      setScreen("portfolio");
    } else {
      setActiveTab(target);
      setScreen(target);
    }
  };

  const tabs = [
    { id: "dashboard", icon: "dashboard", label: "Home" },
    { id: "clients", icon: "clients", label: "Clients" },
    { id: "research", icon: "research", label: "Research" },
    { id: "news", icon: "news", label: "Updates" },
    { id: "chat", icon: "chat", label: "AI Chat" },
  ];

  if (screen === "login") return (
    <div style={{ width: "100%", maxWidth: 390, margin: "0 auto", height: "100vh", maxHeight: 844, background: COLORS.bg, fontFamily: "'DM Sans', sans-serif", position: "relative", overflow: "hidden", borderRadius: 20, boxShadow: "0 25px 80px rgba(0,0,0,0.5)" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet"/>
      <LoginScreen onLogin={() => { setScreen("dashboard"); setActiveTab("dashboard"); }}/>
    </div>
  );

  const renderScreen = () => {
    if (screen === "portfolio" && selectedClient) return <PortfolioScreen client={selectedClient} onBack={() => { setScreen(activeTab); setSelectedClient(null); }}/>;
    switch (activeTab) {
      case "dashboard": return <DashboardScreen onNavigate={navigate}/>;
      case "clients": return <ClientsScreen onNavigate={navigate}/>;
      case "research": return <ResearchScreen/>;
      case "news": return <NewsScreen/>;
      case "chat": return <ChatScreen/>;
      default: return <DashboardScreen onNavigate={navigate}/>;
    }
  };

  return (
    <div style={{ width: "100%", maxWidth: 390, margin: "0 auto", height: "100vh", maxHeight: 844, background: COLORS.bg, fontFamily: "'DM Sans', sans-serif", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", borderRadius: 20, boxShadow: "0 25px 80px rgba(0,0,0,0.5)" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet"/>
      
      {/* Status bar */}
      <div style={{ padding: "8px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <span style={{ color: COLORS.textPrimary, fontSize: 13, fontWeight: 600 }}>9:41</span>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          <svg width="16" height="12" viewBox="0 0 16 12"><rect x="0" y="6" width="3" height="6" rx="1" fill={COLORS.textSecondary}/><rect x="4.5" y="4" width="3" height="8" rx="1" fill={COLORS.textSecondary}/><rect x="9" y="2" width="3" height="10" rx="1" fill={COLORS.textSecondary}/><rect x="13.5" y="0" width="3" height="12" rx="1" fill={COLORS.textSecondary}/></svg>
          <svg width="24" height="12" viewBox="0 0 24 12"><rect x="0" y="1" width="20" height="10" rx="2" stroke={COLORS.textSecondary} strokeWidth="1" fill="none"/><rect x="21" y="4" width="2" height="4" rx="1" fill={COLORS.textSecondary}/><rect x="1.5" y="2.5" width="14" height="7" rx="1" fill={COLORS.green}/></svg>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "hidden" }}>{renderScreen()}</div>

      {/* Bottom Tab Bar */}
      <div style={{ display: "flex", justifyContent: "space-around", padding: "8px 4px 18px", borderTop: `1px solid ${COLORS.border}`, background: COLORS.surface, flexShrink: 0 }}>
        {tabs.map(tab => (
          <div key={tab.id} onClick={() => { setActiveTab(tab.id); setScreen(tab.id); setSelectedClient(null); }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: "pointer", padding: "4px 6px", minWidth: 48 }}>
            <Icon type={tab.icon} size={19} color={activeTab === tab.id ? COLORS.accent : COLORS.textMuted}/>
            <span style={{ fontSize: 9, color: activeTab === tab.id ? COLORS.accent : COLORS.textMuted, fontWeight: activeTab === tab.id ? 600 : 400 }}>{tab.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
