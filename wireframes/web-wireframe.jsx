import { useState } from "react";

const C = {
  bg: "#0A0E1A", surface: "#111628", card: "#151B2E", border: "#1D2540",
  accent: "#4F8CFF", accentSoft: "rgba(79,140,255,0.1)", accentGrad: "linear-gradient(135deg, #4F8CFF, #6C5CE7)",
  green: "#34D399", greenSoft: "rgba(52,211,153,0.1)", red: "#F87171", redSoft: "rgba(248,113,113,0.1)",
  yellow: "#FBBF24", yellowSoft: "rgba(251,191,36,0.1)", purple: "#A78BFA", purpleSoft: "rgba(167,139,250,0.1)",
  text: "#E8ECF4", textSec: "#8B95B0", textMuted: "#5A6480",
};

const clients = [
  { id: 1, name: "Sarah Mitchell", aum: 2450000, change: 3.2, holdings: 12, risk: "Moderate", email: "sarah@email.com" },
  { id: 2, name: "James Chen", aum: 5800000, change: -1.1, holdings: 18, risk: "Aggressive", email: "james@email.com" },
  { id: 3, name: "Emily Rodriguez", aum: 1200000, change: 5.7, holdings: 8, risk: "Conservative", email: "emily@email.com" },
  { id: 4, name: "Michael Thompson", aum: 3750000, change: 2.1, holdings: 15, risk: "Moderate", email: "michael@email.com" },
  { id: 5, name: "Aisha Patel", aum: 8900000, change: -0.4, holdings: 22, risk: "Aggressive", email: "aisha@email.com" },
  { id: 6, name: "David Kim", aum: 980000, change: 4.3, holdings: 6, risk: "Conservative", email: "david@email.com" },
];

const allHoldings = [
  { symbol: "AAPL", name: "Apple Inc.", shares: 450, price: 198.5, change: 1.8, value: 89325, allocation: 18.2 },
  { symbol: "MSFT", name: "Microsoft Corp.", shares: 280, price: 425.3, change: -0.6, value: 119084, allocation: 24.3 },
  { symbol: "GOOGL", name: "Alphabet Inc.", shares: 120, price: 175.8, change: 2.4, value: 21096, allocation: 4.3 },
  { symbol: "AMZN", name: "Amazon.com", shares: 200, price: 195.2, change: 0.9, value: 39040, allocation: 8.0 },
  { symbol: "NVDA", name: "NVIDIA Corp.", shares: 150, price: 875.4, change: 3.5, value: 131310, allocation: 26.8 },
  { symbol: "BRK.B", name: "Berkshire Hathaway", shares: 90, price: 420.1, change: 0.3, value: 37809, allocation: 7.7 },
  { symbol: "VOO", name: "Vanguard S&P 500 ETF", shares: 100, price: 520.8, change: 1.1, value: 52080, allocation: 10.6 },
];

const newsItems = [
  { id: 1, title: "Apple announces Q4 earnings beat, stock rises in after-hours trading", source: "Bloomberg", time: "2h ago", symbol: "AAPL", sentiment: "positive" },
  { id: 2, title: "Fed signals potential rate cut in March amid cooling inflation data", source: "Reuters", time: "4h ago", symbol: null, sentiment: "positive" },
  { id: 3, title: "NVIDIA faces new US export restrictions targeting AI chips to China", source: "WSJ", time: "5h ago", symbol: "NVDA", sentiment: "negative" },
  { id: 4, title: "Microsoft Azure cloud revenue grows 29% YoY, beating analyst estimates", source: "CNBC", time: "6h ago", symbol: "MSFT", sentiment: "positive" },
  { id: 5, title: "S&P 500 closes at new all-time high on broad market rally", source: "MarketWatch", time: "8h ago", symbol: null, sentiment: "positive" },
];

const chatMessages = [
  { role: "client", text: "What's the current risk exposure across all client portfolios?" },
  { role: "bot", text: "Across all 6 client portfolios, the aggregate risk breakdown is: 42% in high-growth tech (NVDA, AAPL, MSFT), 18.3% in defensive positions (BRK.B, VOO), and 39.7% in mid-risk allocations. Two clients (James Chen and Aisha Patel) are flagged as 'Aggressive' — their combined tech exposure is above 65%. I'd recommend reviewing their positions given the current export restriction news affecting NVDA." },
  { role: "client", text: "Show me the top 3 holdings by unrealized gain" },
  { role: "bot", text: "Here are the top performers by unrealized gain:\n\n1. NVDA — +$48,200 (+58.2%) across 3 client portfolios\n2. MSFT — +$32,100 (+36.9%) across 4 client portfolios\n3. AAPL — +$18,700 (+26.5%) across 5 client portfolios\n\nNVDA's outsized gain is concentrated in James Chen's and Aisha Patel's accounts. Want me to draft a rebalancing proposal?" },
];

const companyDB = {
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
    name: "Microsoft Corp.", sector: "Technology", industry: "Software — Infrastructure", marketCap: "$3.16T", pe: 36.4, forwardPe: 31.1,
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

const fmt = (n) => n >= 1e6 ? `$${(n/1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n/1e3).toFixed(1)}K` : `$${n.toFixed(2)}`;

const Badge = ({ children, color = "accent", small }) => {
  const map = { accent: { bg: C.accentSoft, t: C.accent }, green: { bg: C.greenSoft, t: C.green }, red: { bg: C.redSoft, t: C.red }, yellow: { bg: C.yellowSoft, t: C.yellow }, purple: { bg: C.purpleSoft, t: C.purple } };
  const s = map[color] || map.accent;
  return <span style={{ background: s.bg, color: s.t, padding: small ? "2px 8px" : "4px 12px", borderRadius: 6, fontSize: small ? 10 : 11, fontWeight: 600, letterSpacing: 0.3, whiteSpace: "nowrap" }}>{children}</span>;
};

const Ico = ({ d, size = 20, color = C.textSec }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d}/>
  </svg>
);

const icons = {
  dashboard: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  clients: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  research: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35M8 11h6M11 8v6",
  news: "M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2",
  chat: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35",
  bell: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0",
  bar: "M12 20V10M18 20V4M6 20v-4",
  back: "M15 18l-6-6 6-6",
  send: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  trending: "M23 6l-9.5 9.5-5-5L1 18M17 6h6v6",
};

const StatusDot = ({ s }) => <div style={{ width: 8, height: 8, borderRadius: "50%", background: s === "good" ? C.green : s === "warning" ? C.yellow : C.textMuted }}/>;

const DonutChart = ({ data, size = 160 }) => {
  let cum = 0;
  const total = data.reduce((s, d) => s + d.value, 0);
  const cols = ["#4F8CFF", "#34D399", "#FBBF24", "#F87171", "#A78BFA", "#FB923C", "#38BDF8"];
  return (
    <svg viewBox="0 0 100 100" width={size} height={size}>
      {data.map((d, i) => {
        const pct = d.value / total, start = cum; cum += pct;
        const s = start * 2 * Math.PI - Math.PI / 2, e = cum * 2 * Math.PI - Math.PI / 2;
        const r = 42, cx = 50, cy = 50;
        return <path key={i} d={`M ${cx} ${cy} L ${cx + r * Math.cos(s)} ${cy + r * Math.sin(s)} A ${r} ${r} 0 ${pct > 0.5 ? 1 : 0} 1 ${cx + r * Math.cos(e)} ${cy + r * Math.sin(e)} Z`} fill={cols[i % cols.length]} opacity={0.85}/>;
      })}
      <circle cx="50" cy="50" r="26" fill={C.card}/>
    </svg>
  );
};

const BarChart = ({ data, h = 100 }) => {
  const max = Math.max(...data.map(d => Math.abs(d.value)));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: h }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
          <div style={{ width: "100%", maxWidth: 36, height: Math.max(4, (Math.abs(d.value) / max) * (h - 24)), background: d.value >= 0 ? C.green : C.red, borderRadius: "4px 4px 0 0", opacity: 0.8 }}/>
          <span style={{ fontSize: 10, color: C.textMuted, marginTop: 6 }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
};

// ============ SIDEBAR ============
const Sidebar = ({ active, onNav }) => {
  const items = [
    { id: "dashboard", icon: icons.dashboard, label: "Dashboard" },
    { id: "clients", icon: icons.clients, label: "Clients" },
    { id: "research", icon: icons.research, label: "Research" },
    { id: "news", icon: icons.news, label: "Updates" },
    { id: "chat", icon: icons.chat, label: "AI Assistant" },
  ];
  return (
    <div style={{ width: 240, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "24px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: C.accentGrad, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(79,140,255,0.25)" }}>
          <Ico d={icons.bar} size={18} color="#fff"/>
        </div>
        <div>
          <p style={{ color: C.text, fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: -0.3 }}>Insightful</p>
          <p style={{ color: C.textMuted, fontSize: 10, margin: 0, letterSpacing: 0.5, textTransform: "uppercase" }}>Portfolio</p>
        </div>
      </div>
      <div style={{ flex: 1, padding: "8px 12px" }}>
        {items.map(item => (
          <div key={item.id} onClick={() => onNav(item.id)}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", borderRadius: 10, marginBottom: 2, cursor: "pointer",
              background: active === item.id ? C.accentSoft : "transparent",
              transition: "background 0.15s" }}>
            <Ico d={item.icon} size={18} color={active === item.id ? C.accent : C.textMuted}/>
            <span style={{ fontSize: 13, fontWeight: active === item.id ? 600 : 400, color: active === item.id ? C.text : C.textSec }}>{item.label}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: "16px 12px", borderTop: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px" }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: C.accentGrad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>DU</div>
          <div>
            <p style={{ color: C.text, fontSize: 13, fontWeight: 500, margin: 0 }}>Demo User</p>
            <p style={{ color: C.textMuted, fontSize: 11, margin: 0 }}>Fund Manager</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============ HEADER ============
const Header = ({ title, subtitle }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 32px 16px", borderBottom: `1px solid ${C.border}` }}>
    <div>
      <h1 style={{ color: C.text, fontSize: 24, fontWeight: 700, margin: 0, fontFamily: "'Playfair Display', serif" }}>{title}</h1>
      {subtitle && <p style={{ color: C.textMuted, fontSize: 13, margin: "4px 0 0" }}>{subtitle}</p>}
    </div>
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <div style={{ position: "relative", width: 260 }}>
        <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}><Ico d={icons.search} size={15} color={C.textMuted}/></div>
        <input style={{ width: "100%", padding: "10px 14px 10px 36px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} placeholder="Search anything..."/>
      </div>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: C.card, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.border}`, position: "relative", cursor: "pointer" }}>
        <Ico d={icons.bell} size={17}/>
        <div style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: "50%", background: C.red }}/>
      </div>
    </div>
  </div>
);

// ============ DASHBOARD ============
const DashboardPage = ({ onNav }) => {
  const totalAUM = clients.reduce((s, c) => s + c.aum, 0);
  const monthlyData = [{ label: "Jul", value: 2.1 }, { label: "Aug", value: -0.8 }, { label: "Sep", value: 3.4 }, { label: "Oct", value: 1.2 }, { label: "Nov", value: -1.5 }, { label: "Dec", value: 4.1 }];
  const allocationData = allHoldings.slice(0, 5).map(h => ({ label: h.symbol, value: h.allocation }));
  const donutColors = ["#4F8CFF", "#34D399", "#FBBF24", "#F87171", "#A78BFA"];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Header title="Dashboard" subtitle="Good morning, John. Here's your portfolio overview."/>
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Total AUM", value: fmt(totalAUM), sub: "+2.3% MTD", color: "green", icon: icons.bar },
            { label: "Active Clients", value: "6", sub: "2 need review", color: "yellow", icon: icons.clients },
            { label: "Today's P&L", value: "+$45.2K", sub: "+1.8% today", color: "green", icon: icons.trending },
            { label: "Pending Alerts", value: "3", sub: "1 urgent", color: "red", icon: icons.bell },
          ].map((kpi, i) => (
            <div key={i} style={{ background: C.card, borderRadius: 16, padding: "20px", border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <p style={{ color: C.textMuted, fontSize: 11, margin: 0, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>{kpi.label}</p>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: C.accentSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Ico d={kpi.icon} size={16} color={C.accent}/>
                </div>
              </div>
              <p style={{ color: C.text, fontSize: 28, fontWeight: 700, margin: "0 0 8px" }}>{kpi.value}</p>
              <Badge color={kpi.color} small>{kpi.sub}</Badge>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          <div style={{ background: C.card, borderRadius: 16, padding: 24, border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <p style={{ color: C.text, fontSize: 15, fontWeight: 600, margin: 0 }}>Monthly Performance</p>
              <Badge>6 months</Badge>
            </div>
            <BarChart data={monthlyData} h={120}/>
          </div>
          <div style={{ background: C.card, borderRadius: 16, padding: 24, border: `1px solid ${C.border}` }}>
            <p style={{ color: C.text, fontSize: 15, fontWeight: 600, margin: "0 0 16px" }}>Aggregate Allocation</p>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <DonutChart data={allocationData} size={140}/>
              <div style={{ flex: 1 }}>
                {allocationData.map((d, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: donutColors[i] }}/>
                      <span style={{ color: C.textSec, fontSize: 13 }}>{d.label}</span>
                    </div>
                    <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{d.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Clients + News */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 16 }}>
          <div style={{ background: C.card, borderRadius: 16, padding: 24, border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <p style={{ color: C.text, fontSize: 15, fontWeight: 600, margin: 0 }}>Client Portfolios</p>
              <span onClick={() => onNav("clients")} style={{ color: C.accent, fontSize: 12, cursor: "pointer", fontWeight: 500 }}>View All →</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>{["Client", "AUM", "Change", "Holdings", "Risk"].map((h, i) => (
                  <th key={i} style={{ color: C.textMuted, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, padding: "0 8px 12px", textAlign: i === 0 ? "left" : "right", borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {clients.map(c => (
                  <tr key={c.id} onClick={() => onNav("portfolio", c)} style={{ cursor: "pointer" }}>
                    <td style={{ padding: "12px 8px", display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${C.accent}33, #6C5CE733)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: C.accent, flexShrink: 0 }}>
                        {c.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                        <p style={{ color: C.text, fontSize: 13, fontWeight: 500, margin: 0 }}>{c.name}</p>
                        <p style={{ color: C.textMuted, fontSize: 11, margin: 0 }}>{c.email}</p>
                      </div>
                    </td>
                    <td style={{ padding: "12px 8px", textAlign: "right", color: C.text, fontSize: 13, fontWeight: 600 }}>{fmt(c.aum)}</td>
                    <td style={{ padding: "12px 8px", textAlign: "right", color: c.change >= 0 ? C.green : C.red, fontSize: 13, fontWeight: 600 }}>{c.change >= 0 ? "+" : ""}{c.change}%</td>
                    <td style={{ padding: "12px 8px", textAlign: "right", color: C.textSec, fontSize: 13 }}>{c.holdings}</td>
                    <td style={{ padding: "12px 8px", textAlign: "right" }}>
                      <Badge color={c.risk === "Aggressive" ? "red" : c.risk === "Conservative" ? "green" : "accent"} small>{c.risk}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ background: C.card, borderRadius: 16, padding: 24, border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <p style={{ color: C.text, fontSize: 15, fontWeight: 600, margin: 0 }}>Latest Updates</p>
              <span onClick={() => onNav("news")} style={{ color: C.accent, fontSize: 12, cursor: "pointer", fontWeight: 500 }}>View All →</span>
            </div>
            {newsItems.slice(0, 4).map(n => (
              <div key={n.id} style={{ padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                  {n.symbol && <Badge color={n.sentiment === "positive" ? "green" : "red"} small>{n.symbol}</Badge>}
                  <span style={{ color: C.textMuted, fontSize: 11 }}>{n.time}</span>
                </div>
                <p style={{ color: C.text, fontSize: 13, margin: 0, lineHeight: 1.4 }}>{n.title}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============ CLIENTS ============
const ClientsPage = ({ onNav }) => {
  const [search, setSearch] = useState("");
  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Header title="Clients" subtitle={`Managing ${clients.length} client portfolios`}/>
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 400 }}>
            <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}><Ico d={icons.search} size={15} color={C.textMuted}/></div>
            <input value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", padding: "10px 14px 10px 36px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" }}
              placeholder="Search clients..."/>
          </div>
          <button style={{ padding: "10px 20px", background: C.accentGrad, border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Add Client</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {filtered.map(c => (
            <div key={c.id} onClick={() => onNav("portfolio", c)}
              style={{ background: C.card, borderRadius: 16, padding: 24, border: `1px solid ${C.border}`, cursor: "pointer", transition: "border-color 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.accent + "50"}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg, ${C.accent}33, #6C5CE733)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: C.accent }}>
                  {c.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <p style={{ color: C.text, fontSize: 15, fontWeight: 600, margin: 0 }}>{c.name}</p>
                  <p style={{ color: C.textMuted, fontSize: 12, margin: "2px 0 0" }}>{c.email}</p>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><p style={{ color: C.textMuted, fontSize: 10, margin: 0, textTransform: "uppercase", letterSpacing: 0.3 }}>AUM</p><p style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: "4px 0 0" }}>{fmt(c.aum)}</p></div>
                <div><p style={{ color: C.textMuted, fontSize: 10, margin: 0, textTransform: "uppercase", letterSpacing: 0.3 }}>MTD Return</p><p style={{ color: c.change >= 0 ? C.green : C.red, fontSize: 18, fontWeight: 700, margin: "4px 0 0" }}>{c.change >= 0 ? "+" : ""}{c.change}%</p></div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <Badge color={c.risk === "Aggressive" ? "red" : c.risk === "Conservative" ? "green" : "accent"} small>{c.risk}</Badge>
                <Badge small>{c.holdings} holdings</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============ PORTFOLIO DETAIL ============
const PortfolioPage = ({ client, onBack }) => {
  const allocationData = allHoldings.slice(0, 5).map(h => ({ label: h.symbol, value: h.allocation }));
  const donutColors = ["#4F8CFF", "#34D399", "#FBBF24", "#F87171", "#A78BFA"];
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "24px 32px 16px", borderBottom: `1px solid ${C.border}` }}>
        <div onClick={onBack} style={{ cursor: "pointer", width: 36, height: 36, borderRadius: 10, background: C.card, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.border}` }}>
          <Ico d={icons.back} size={18}/>
        </div>
        <div>
          <h1 style={{ color: C.text, fontSize: 24, fontWeight: 700, margin: 0, fontFamily: "'Playfair Display', serif" }}>{client.name}</h1>
          <p style={{ color: C.textMuted, fontSize: 13, margin: "2px 0 0" }}>Portfolio Overview · {client.risk} Risk Profile</p>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Total Value", value: fmt(client.aum) },
            { label: "MTD Return", value: `${client.change >= 0 ? "+" : ""}${client.change}%`, color: client.change >= 0 ? C.green : C.red },
            { label: "Holdings", value: client.holdings },
            { label: "Risk Profile", value: client.risk },
          ].map((m, i) => (
            <div key={i} style={{ background: C.card, borderRadius: 14, padding: 20, border: `1px solid ${C.border}` }}>
              <p style={{ color: C.textMuted, fontSize: 10, margin: 0, textTransform: "uppercase", letterSpacing: 0.5 }}>{m.label}</p>
              <p style={{ color: m.color || C.text, fontSize: 24, fontWeight: 700, margin: "8px 0 0" }}>{m.value}</p>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "0.4fr 0.6fr", gap: 16, marginBottom: 24 }}>
          <div style={{ background: C.card, borderRadius: 16, padding: 24, border: `1px solid ${C.border}` }}>
            <p style={{ color: C.text, fontSize: 15, fontWeight: 600, margin: "0 0 16px" }}>Allocation</p>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <DonutChart data={allocationData} size={160}/>
              <div style={{ width: "100%" }}>
                {allocationData.map((d, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: donutColors[i] }}/>
                      <span style={{ color: C.textSec, fontSize: 13 }}>{d.label}</span>
                    </div>
                    <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{d.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ background: C.card, borderRadius: 16, padding: 24, border: `1px solid ${C.border}` }}>
            <p style={{ color: C.text, fontSize: 15, fontWeight: 600, margin: "0 0 16px" }}>Holdings</p>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>{["Symbol", "Shares", "Price", "Value", "Change"].map((h, i) => (
                  <th key={i} style={{ color: C.textMuted, fontSize: 10, fontWeight: 600, textTransform: "uppercase", padding: "0 6px 10px", textAlign: i === 0 ? "left" : "right", borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {allHoldings.map((h, i) => (
                  <tr key={i}>
                    <td style={{ padding: "10px 6px" }}><span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{h.symbol}</span><br/><span style={{ color: C.textMuted, fontSize: 11 }}>{h.name}</span></td>
                    <td style={{ padding: "10px 6px", textAlign: "right", color: C.textSec, fontSize: 13 }}>{h.shares}</td>
                    <td style={{ padding: "10px 6px", textAlign: "right", color: C.text, fontSize: 13 }}>${h.price}</td>
                    <td style={{ padding: "10px 6px", textAlign: "right", color: C.text, fontSize: 13, fontWeight: 600 }}>{fmt(h.value)}</td>
                    <td style={{ padding: "10px 6px", textAlign: "right", color: h.change >= 0 ? C.green : C.red, fontSize: 13, fontWeight: 600 }}>{h.change >= 0 ? "+" : ""}{h.change}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============ RESEARCH ============
const ResearchPage = () => {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("overview");
  const trending = [
    { symbol: "AAPL", name: "Apple Inc.", change: "+1.8%", pos: true },
    { symbol: "NVDA", name: "NVIDIA Corp.", change: "+3.5%", pos: true },
    { symbol: "MSFT", name: "Microsoft", change: "-0.6%", pos: false },
  ];

  if (selected && companyDB[selected]) {
    const co = companyDB[selected];
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "24px 32px 16px", borderBottom: `1px solid ${C.border}` }}>
          <div onClick={() => setSelected(null)} style={{ cursor: "pointer", width: 36, height: 36, borderRadius: 10, background: C.card, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.border}` }}>
            <Ico d={icons.back} size={18}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <h1 style={{ color: C.text, fontSize: 24, fontWeight: 700, margin: 0, fontFamily: "'Playfair Display', serif" }}>{selected}</h1>
              <Badge color={co.analystRating === "Strong Buy" ? "green" : "accent"}>{co.analystRating}</Badge>
              <span style={{ color: C.textMuted, fontSize: 13 }}>Target: {co.priceTarget}</span>
            </div>
            <p style={{ color: C.textMuted, fontSize: 13, margin: "2px 0 0" }}>{co.name} · {co.sector} · {co.industry}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: C.text, fontSize: 28, fontWeight: 700, margin: 0 }}>{co.price}</p>
            <p style={{ color: co.change.startsWith("+") ? C.green : C.red, fontSize: 15, fontWeight: 600, margin: "2px 0 0" }}>{co.change} today</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 0, padding: "0 32px", background: C.surface, borderBottom: `1px solid ${C.border}` }}>
          {["overview", "financials", "analysis"].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: "14px 24px", border: "none", background: "transparent", color: tab === t ? C.accent : C.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer", borderBottom: tab === t ? `2px solid ${C.accent}` : "2px solid transparent", textTransform: "capitalize" }}>
              {t}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
          {tab === "overview" && (
            <>
              <p style={{ color: C.textSec, fontSize: 14, lineHeight: 1.7, margin: "0 0 24px", maxWidth: 800 }}>{co.description}</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
                {[
                  { l: "Market Cap", v: co.marketCap }, { l: "P/E Ratio", v: co.pe }, { l: "Forward P/E", v: co.forwardPe }, { l: "EPS", v: `$${co.eps}` },
                  { l: "Dividend Yield", v: co.dividendYield }, { l: "Beta", v: co.beta }, { l: "52W High", v: co.fiftyTwoHigh }, { l: "52W Low", v: co.fiftyTwoLow },
                ].map((m, i) => (
                  <div key={i} style={{ background: C.card, borderRadius: 12, padding: "14px 16px", border: `1px solid ${C.border}` }}>
                    <p style={{ color: C.textMuted, fontSize: 10, margin: 0, textTransform: "uppercase", letterSpacing: 0.3 }}>{m.l}</p>
                    <p style={{ color: C.text, fontSize: 16, fontWeight: 600, margin: "6px 0 0" }}>{m.v}</p>
                  </div>
                ))}
              </div>
              <div style={{ background: C.card, borderRadius: 16, padding: 24, border: `1px solid ${C.border}` }}>
                <p style={{ color: C.text, fontSize: 15, fontWeight: 600, margin: "0 0 16px" }}>Quarterly Revenue ($B)</p>
                <BarChart data={co.quarterlyRevenue.map(q => ({ label: q.q, value: q.value }))} h={120}/>
              </div>
            </>
          )}
          {tab === "financials" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                <div style={{ background: C.card, borderRadius: 16, padding: 24, border: `1px solid ${C.border}` }}>
                  <p style={{ color: C.text, fontSize: 15, fontWeight: 600, margin: "0 0 16px" }}>Key Metrics</p>
                  {co.keyMetrics.map((m, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < co.keyMetrics.length - 1 ? `1px solid ${C.border}` : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <StatusDot s={m.status}/>
                        <span style={{ color: C.textSec, fontSize: 13 }}>{m.label}</span>
                      </div>
                      <span style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>{m.value}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: C.card, borderRadius: 16, padding: 24, border: `1px solid ${C.border}` }}>
                  <p style={{ color: C.text, fontSize: 15, fontWeight: 600, margin: "0 0 16px" }}>Financial Summary</p>
                  {[
                    { l: "Revenue", v: co.revenue }, { l: "Revenue Growth", v: co.revenueGrowth },
                    { l: "Gross Margin", v: co.grossMargin }, { l: "Operating Margin", v: co.operatingMargin },
                    { l: "Net Margin", v: co.netMargin }, { l: "ROE", v: co.roe },
                    { l: "Debt/Equity", v: co.debtToEquity }, { l: "Current Ratio", v: co.currentRatio },
                  ].map((m, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < 7 ? `1px solid ${C.border}` : "none" }}>
                      <span style={{ color: C.textSec, fontSize: 13 }}>{m.l}</span>
                      <span style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>{m.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          {tab === "analysis" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: C.card, borderRadius: 16, padding: 24, border: `1px solid ${C.border}` }}>
                <p style={{ color: C.green, fontSize: 15, fontWeight: 600, margin: "0 0 14px" }}>Strengths</p>
                {co.strengths.map((s, i) => (
                  <div key={i} style={{ background: C.greenSoft, borderRadius: 10, padding: "12px 16px", marginBottom: 8, borderLeft: `3px solid ${C.green}` }}>
                    <p style={{ color: C.text, fontSize: 13, margin: 0, lineHeight: 1.5 }}>{s}</p>
                  </div>
                ))}
              </div>
              <div style={{ background: C.card, borderRadius: 16, padding: 24, border: `1px solid ${C.border}` }}>
                <p style={{ color: C.yellow, fontSize: 15, fontWeight: 600, margin: "0 0 14px" }}>Risks</p>
                {co.risks.map((r, i) => (
                  <div key={i} style={{ background: C.yellowSoft, borderRadius: 10, padding: "12px 16px", marginBottom: 8, borderLeft: `3px solid ${C.yellow}` }}>
                    <p style={{ color: C.text, fontSize: 13, margin: 0, lineHeight: 1.5 }}>{r}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Header title="Research" subtitle="Search any company for instant fundamental analysis"/>
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
        <div style={{ position: "relative", maxWidth: 600, marginBottom: 32 }}>
          <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }}><Ico d={icons.search} size={18} color={C.textMuted}/></div>
          <input value={query} onChange={e => setQuery(e.target.value)}
            style={{ width: "100%", padding: "16px 20px 16px 48px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, color: C.text, fontSize: 15, outline: "none", boxSizing: "border-box" }}
            placeholder="Search by company name or ticker symbol..."/>
        </div>

        {query && (
          <div style={{ marginBottom: 32 }}>
            <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 12px" }}>Search Results</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {Object.entries(companyDB).filter(([k, v]) => k.toLowerCase().includes(query.toLowerCase()) || v.name.toLowerCase().includes(query.toLowerCase())).map(([sym, co]) => (
                <div key={sym} onClick={() => { setSelected(sym); setQuery(""); setTab("overview"); }}
                  style={{ background: C.card, borderRadius: 14, padding: 20, border: `1px solid ${C.border}`, cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = C.accent + "50"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <p style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: 0 }}>{sym}</p>
                      <p style={{ color: C.textMuted, fontSize: 12, margin: "2px 0 0" }}>{co.name}</p>
                    </div>
                    <Badge color={co.analystRating === "Strong Buy" ? "green" : "accent"} small>{co.analystRating}</Badge>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                    <span style={{ color: C.text, fontSize: 20, fontWeight: 700 }}>{co.price}</span>
                    <span style={{ color: co.change.startsWith("+") ? C.green : C.red, fontSize: 14, fontWeight: 600 }}>{co.change}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!query && (
          <>
            <p style={{ color: C.textMuted, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 14px", display: "flex", alignItems: "center", gap: 6 }}>
              <Ico d={icons.trending} size={14} color={C.textMuted}/> Trending Companies
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 32 }}>
              {trending.map((tc, i) => (
                <div key={i} onClick={() => { setSelected(tc.symbol); setTab("overview"); }}
                  style={{ background: C.card, borderRadius: 14, padding: 20, border: `1px solid ${C.border}`, cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = C.accent + "50"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ color: C.text, fontSize: 17, fontWeight: 700, margin: 0 }}>{tc.symbol}</p>
                      <p style={{ color: C.textMuted, fontSize: 12, margin: "2px 0 0" }}>{tc.name}</p>
                    </div>
                    <span style={{ color: tc.pos ? C.green : C.red, fontSize: 16, fontWeight: 700 }}>{tc.change}</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: `linear-gradient(135deg, ${C.purple}10, ${C.accent}10)`, borderRadius: 16, padding: 28, border: `1px solid ${C.purple}20`, maxWidth: 600 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <Ico d={icons.chat} size={18} color={C.purple}/>
                <p style={{ color: C.purple, fontSize: 15, fontWeight: 600, margin: 0 }}>AI-Powered Research</p>
              </div>
              <p style={{ color: C.textSec, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                Search any company to get instant fundamental analysis. In the future, this will be powered by your research notes, uploaded documents, and Claude AI for deep analysis.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ============ NEWS ============
const NewsPage = () => (
  <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
    <Header title="Market Updates" subtitle="Latest news affecting your portfolios"/>
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
      <div style={{ maxWidth: 800 }}>
        {newsItems.map(n => (
          <div key={n.id} style={{ background: C.card, borderRadius: 14, padding: 20, border: `1px solid ${C.border}`, marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
              {n.symbol && <Badge color={n.sentiment === "positive" ? "green" : "red"}>{n.symbol}</Badge>}
              <span style={{ color: C.textMuted, fontSize: 12 }}>{n.source}</span>
              <span style={{ color: C.textMuted, fontSize: 12, marginLeft: "auto" }}>{n.time}</span>
            </div>
            <p style={{ color: C.text, fontSize: 15, fontWeight: 500, margin: 0, lineHeight: 1.5 }}>{n.title}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ============ AI CHAT ============
const ChatPage = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(chatMessages);
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "24px 32px 16px", borderBottom: `1px solid ${C.border}` }}>
        <h1 style={{ color: C.text, fontSize: 24, fontWeight: 700, margin: 0, fontFamily: "'Playfair Display', serif" }}>AI Assistant</h1>
        <p style={{ color: C.textMuted, fontSize: 13, margin: "4px 0 0" }}>Powered by Claude · Trained on your research & portfolio data</p>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.role === "client" ? "flex-end" : "flex-start", marginBottom: 16 }}>
              {msg.role === "bot" && (
                <div style={{ width: 32, height: 32, borderRadius: 10, background: C.accentGrad, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 12, flexShrink: 0, marginTop: 4 }}>
                  <Ico d={icons.chat} size={14} color="#fff"/>
                </div>
              )}
              <div style={{
                maxWidth: "75%", padding: "16px 20px", borderRadius: 16,
                background: msg.role === "client" ? C.accentGrad : C.card,
                border: msg.role === "bot" ? `1px solid ${C.border}` : "none",
                borderBottomRightRadius: msg.role === "client" ? 4 : 16,
                borderBottomLeftRadius: msg.role === "bot" ? 4 : 16,
              }}>
                <p style={{ color: msg.role === "client" ? "#fff" : C.text, fontSize: 14, margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{msg.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: "16px 32px 24px", borderTop: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", maxWidth: 800, margin: "0 auto" }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            style={{ flex: 1, padding: "14px 18px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 14, outline: "none" }}
            placeholder="Ask about portfolios, risk exposure, market impact..."
            onKeyDown={e => {
              if (e.key === "Enter" && input.trim()) {
                setMessages(prev => [...prev, { role: "client", text: input }]);
                setInput("");
                setTimeout(() => setMessages(prev => [...prev, { role: "bot", text: "Analyzing your request across all client portfolios. Based on the latest market data and your research notes, here's what I found..." }]), 800);
              }
            }}/>
          <button style={{ width: 48, height: 48, borderRadius: 12, background: C.accentGrad, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, boxShadow: "0 4px 16px rgba(79,140,255,0.25)" }}>
            <Ico d={icons.send} size={18} color="#fff"/>
          </button>
        </div>
      </div>
    </div>
  );
};

// ============ MAIN APP ============
export default function App() {
  const [page, setPage] = useState("dashboard");
  const [selectedClient, setSelectedClient] = useState(null);

  const nav = (target, data) => {
    if (target === "portfolio") {
      setSelectedClient(data);
      setPage("portfolio");
    } else {
      setSelectedClient(null);
      setPage(target);
    }
  };

  const renderPage = () => {
    if (page === "portfolio" && selectedClient) return <PortfolioPage client={selectedClient} onBack={() => nav("clients")}/>;
    switch (page) {
      case "dashboard": return <DashboardPage onNav={nav}/>;
      case "clients": return <ClientsPage onNav={nav}/>;
      case "research": return <ResearchPage/>;
      case "news": return <NewsPage/>;
      case "chat": return <ChatPage/>;
      default: return <DashboardPage onNav={nav}/>;
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: C.bg, fontFamily: "'DM Sans', sans-serif", color: C.text, overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet"/>
      <Sidebar active={page === "portfolio" ? "clients" : page} onNav={nav}/>
      {renderPage()}
    </div>
  );
}
