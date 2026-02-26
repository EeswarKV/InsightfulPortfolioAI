import { useEffect, useState, useMemo } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { Feather } from "@expo/vector-icons";
import { theme } from "../../lib/theme";
import { useIsWebWide } from "../../lib/platform";
import { ScreenContainer } from "../../components/layout";
import { KPICard, Avatar, Badge, SkeletonKPICard, MarketTicker } from "../../components/ui";
import { BarChart, LineChart, PieChart, type LineSeries, type LineDataPoint, type PieSlice } from "../../components/charts";
import { fetchIndexHistory, INDEX_OPTIONS, type IndexDataPoint } from "../../lib/globalMarketApi";
import { formatCurrency, getGreeting } from "../../lib/formatters";
import { computePerformanceData, computeHoldingsPerformance, computePerformanceFromSnapshots, type ChartPeriod } from "../../lib/chartUtils";
import { calculatePortfolioMetrics } from "../../lib/marketData";
import { fetchPortfolioSnapshots, type PortfolioSnapshot } from "../../lib/api";
import { signOut } from "../../store/slices/authSlice";
import { fetchManagerOverview } from "../../store/slices/portfolioSlice";
import { fetchUnreadCount } from "../../store/slices/alertsSlice";
import type { AppDispatch, RootState } from "../../store";
import type { DBTransaction, DBHolding } from "../../types";

const COMP_PERIODS = [
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
];

export default function DashboardScreen() {
  const router = useRouter();
  const isWide = useIsWebWide();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((s: RootState) => s.auth);
  const { clients, portfolios, holdings, transactions, isLoading } = useSelector(
    (s: RootState) => s.portfolio
  );
  const { unreadCount } = useSelector((s: RootState) => s.alerts);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("monthly");
  const [returnsMode, setReturnsMode] = useState<"amount" | "percent">("percent");
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [portfolioMetrics, setPortfolioMetrics] = useState({
    investedValue: 0,
    currentValue: 0,
    totalReturns: 0,
    returnsPercent: 0,
    xirr: null as number | null,
    livePrices: new Map(),
    currentPrices: new Map<string, number>(),
  });
  const [snapshotData, setSnapshotData] = useState<PortfolioSnapshot[]>([]);
  const [useSnapshots, setUseSnapshots] = useState(false);
  const [compPeriodDays, setCompPeriodDays] = useState(30);
  const [compIndexSymbol, setCompIndexSymbol] = useState("^NSEI");
  const [indexHistory, setIndexHistory] = useState<IndexDataPoint[]>([]);
  const [isLoadingIndex, setIsLoadingIndex] = useState(false);
  const [portfolioLineData, setPortfolioLineData] = useState<LineDataPoint[]>([]);
  const [barChartHeight, setBarChartHeight] = useState(100);

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchManagerOverview(user.id));
      dispatch(fetchUnreadCount());
    }
  }, [user?.id, dispatch]);

  // Fetch live prices for all holdings across all portfolios
  useEffect(() => {
    const allHoldings: DBHolding[] = [];
    for (const p of portfolios) {
      const pHoldings = holdings[p.id] ?? [];
      allHoldings.push(...pHoldings);
    }

    if (allHoldings.length > 0) {
      setIsLoadingPrices(true);
      calculatePortfolioMetrics(allHoldings)
        .then(setPortfolioMetrics)
        .finally(() => setIsLoadingPrices(false));
    }
  }, [portfolios, holdings]);

  // Fetch snapshots for all client portfolios
  useEffect(() => {
    const fetchAllSnapshots = async () => {
      if (portfolios.length > 0) {
        try {
          const allSnapshots: PortfolioSnapshot[] = [];
          for (const portfolio of portfolios) {
            const snapshots = await fetchPortfolioSnapshots(portfolio.id);
            allSnapshots.push(...snapshots);
          }
          setSnapshotData(allSnapshots);
          setUseSnapshots(allSnapshots.length > 0);
        } catch (error) {
          console.error("Failed to fetch snapshots:", error);
        }
      }
    };
    fetchAllSnapshots();
  }, [portfolios]);

  // Fetch index history for comparison chart
  useEffect(() => {
    setIsLoadingIndex(true);
    fetchIndexHistory(compIndexSymbol, compPeriodDays)
      .then(setIndexHistory)
      .finally(() => setIsLoadingIndex(false));
  }, [compPeriodDays, compIndexSymbol]);

  // Compute portfolio line: clip to each holding's purchase_date, normalize from avg_cost
  useEffect(() => {
    const allHoldings: DBHolding[] = [];
    for (const p of portfolios) allHoldings.push(...(holdings[p.id] ?? []));
    if (allHoldings.length === 0) { setPortfolioLineData([]); return; }

    let cancelled = false;
    Promise.all(
      allHoldings.map(h => {
        const baseSymbol = h.symbol.replace(/\.(NS|BO|NSE|BSE)$/i, "");
        return fetchIndexHistory(`${baseSymbol}.NS`, compPeriodDays)
          .then(data => ({
            qty: Number(h.quantity),
            avgCost: Number(h.avg_cost),
            purchaseDate: (h.purchase_date ?? "").slice(0, 10),
            data,
          }))
          .catch(() => ({ qty: 0, avgCost: 0, purchaseDate: "", data: [] as IndexDataPoint[] }));
      })
    ).then(results => {
      if (cancelled) return;
      // Per date: accumulate value (qty × close) and invested (qty × avg_cost)
      // only for holdings whose purchase_date ≤ that date
      const byDate = new Map<string, { value: number; invested: number }>();
      for (const { qty, avgCost, purchaseDate, data } of results) {
        if (qty === 0 || data.length === 0) continue;
        for (const pt of data) {
          if (purchaseDate && pt.date < purchaseDate) continue;
          const prev = byDate.get(pt.date) ?? { value: 0, invested: 0 };
          byDate.set(pt.date, {
            value: prev.value + qty * pt.close,
            invested: prev.invested + qty * avgCost,
          });
        }
      }
      const entries = [...byDate.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .filter(([, { invested }]) => invested > 0);
      if (entries.length < 2) { setPortfolioLineData([]); return; }
      setPortfolioLineData(entries.map(([date, { value, invested }]) => ({
        label: date,
        value: ((value - invested) / invested) * 100,
      })));
    }).catch(() => { if (!cancelled) setPortfolioLineData([]); });
    return () => { cancelled = true; };
  }, [portfolios, holdings, compPeriodDays]);

  // Normalize index history → % return aligned to portfolio's first date
  const indexLine: LineDataPoint[] = useMemo(() => {
    if (indexHistory.length < 2) return [];
    // Align index start to portfolio's first data point for a fair comparison;
    // if portfolio data isn't loaded yet, use the full period
    const portfolioStart = portfolioLineData.length > 0 ? portfolioLineData[0].label : null;
    const filtered = portfolioStart
      ? indexHistory.filter(d => d.date >= portfolioStart)
      : indexHistory;
    if (filtered.length < 2) return [];
    const base = filtered[0].close;
    return filtered.map(d => ({
      label: d.date,
      value: base === 0 ? 0 : ((d.close - base) / base) * 100,
    }));
  }, [indexHistory, portfolioLineData]);

  const compSeries: LineSeries[] = [
    ...(portfolioLineData.length >= 2 ? [{ name: "Portfolio", color: theme.colors.accent, data: portfolioLineData }] : []),
    ...(indexLine.length >= 2 ? [{ name: INDEX_OPTIONS.find(o => o.symbol === compIndexSymbol)?.label ?? "Index", color: theme.colors.yellow, data: indexLine }] : []),
  ];

  const portfolioReturn = portfolioLineData.length > 0 ? portfolioLineData[portfolioLineData.length - 1].value : null;
  const indexReturn = indexLine.length > 0 ? indexLine[indexLine.length - 1].value : null;
  const alpha = portfolioReturn !== null && indexReturn !== null ? portfolioReturn - indexReturn : null;
  const indexLabel = INDEX_OPTIONS.find(o => o.symbol === compIndexSymbol)?.label ?? "Index";

  // Compute total value across all client portfolios
  const totalValue = portfolios.reduce((sum, p) => {
    const pHoldings = holdings[p.id] ?? [];
    const pValue = pHoldings.reduce((s, h) => {
      const qty = Number(h.quantity);
      const cost = Number(h.avg_cost);
      const val = qty * cost;
      return s + val;
    }, 0);
    return sum + pValue;
  }, 0);

  const totalHoldings = portfolios.reduce((sum, p) => {
    return sum + (holdings[p.id]?.length ?? 0);
  }, 0);

  // Debug logging
  useEffect(() => {
    console.log("=== Manager Dashboard Debug ===");
    console.log("Clients:", clients.length, clients.map(c => c.email));
    console.log("Portfolios:", portfolios.length, portfolios.map(p => ({ id: p.id.slice(0, 8), client: p.client_id.slice(0, 8) })));
    console.log("Holdings keys:", Object.keys(holdings));
    portfolios.forEach(p => {
      const pHoldings = holdings[p.id] ?? [];
      console.log(`Portfolio ${p.id.slice(0, 8)}:`, pHoldings.length, "holdings");
      pHoldings.forEach(h => {
        console.log(`  - ${h.symbol}: qty=${h.quantity}, cost=${h.avg_cost}, value=${Number(h.quantity) * Number(h.avg_cost)}`);
      });
    });
    console.log("Total AUM:", totalValue);
    console.log("Total Holdings Count:", totalHoldings);
    console.log("===============================");
  }, [clients, portfolios, holdings, totalValue, totalHoldings]);

  // Compute unique asset types (sectors) across all holdings
  const allAssetTypes = new Set<string>();
  for (const p of portfolios) {
    for (const h of holdings[p.id] ?? []) {
      if (h.asset_type) allAssetTypes.add(h.asset_type);
    }
  }

  // Aggregate all holdings across portfolios for chart
  const allHoldingsForChart = useMemo(() => {
    const all: DBHolding[] = [];
    for (const p of portfolios) {
      const pHoldings = holdings[p.id] ?? [];
      all.push(...pHoldings);
    }
    return all;
  }, [portfolios, holdings]);

  const chartData = useSnapshots && snapshotData.length > 0
    ? computePerformanceFromSnapshots(snapshotData, chartPeriod)
    : computeHoldingsPerformance(
        allHoldingsForChart,
        portfolioMetrics.currentPrices,
        chartPeriod
      );

  // Allocation pie data
  const ASSET_COLORS: Record<string, string> = {
    stock: theme.colors.accent,
    etf: theme.colors.yellow,
    mutual_fund: theme.colors.green,
    bond: "#06b6d4",
    crypto: "#c084fc",
  };
  const HOLDING_COLORS = [theme.colors.accent, theme.colors.yellow, theme.colors.green, "#c084fc", "#f97316", "#06b6d4"];

  const assetTypeData = useMemo((): PieSlice[] => {
    const map = new Map<string, number>();
    for (const p of portfolios) {
      for (const h of holdings[p.id] ?? []) {
        const val = Number(h.quantity) * Number(h.avg_cost);
        map.set(h.asset_type, (map.get(h.asset_type) || 0) + val);
      }
    }
    return [...map.entries()]
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([type, value]) => ({ label: type, value, color: ASSET_COLORS[type] ?? theme.colors.textMuted }));
  }, [portfolios, holdings]);

  const holdingsData = useMemo((): PieSlice[] => {
    const sorted = allHoldingsForChart
      .map(h => ({ label: h.symbol, value: Number(h.quantity) * Number(h.avg_cost) }))
      .sort((a, b) => b.value - a.value);
    const top = sorted.slice(0, 7);
    const othersVal = sorted.slice(7).reduce((s, h) => s + h.value, 0);
    const slices: PieSlice[] = top.map((h, i) => ({ label: h.label, value: h.value, color: HOLDING_COLORS[i % HOLDING_COLORS.length] }));
    if (othersVal > 0) slices.push({ label: "Others", value: othersVal, color: theme.colors.textMuted });
    return slices;
  }, [allHoldingsForChart]);

  const content = (
    <>
      {/* Mobile-only market ticker (web ticker rendered in WebShell) */}
      {!isWide && <MarketTicker />}

      {/* Mobile header */}
      {!isWide && (
        <View style={styles.mobileHeader}>
          <View>
            <Text style={styles.greeting}>{getGreeting(user?.user_metadata?.full_name)}</Text>
            <Text style={styles.pageTitle}>Dashboard</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push("/(manager)/profile" as any)}
            >
              <Feather name="user" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => dispatch(signOut())}>
              <Feather name="log-out" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Returns toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, returnsMode === "amount" && styles.toggleBtnActive]}
          onPress={() => setReturnsMode("amount")}
        >
          <Text style={[styles.toggleText, returnsMode === "amount" && styles.toggleTextActive]}>
            ₹ Amount
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, returnsMode === "percent" && styles.toggleBtnActive]}
          onPress={() => setReturnsMode("percent")}
        >
          <Text style={[styles.toggleText, returnsMode === "percent" && styles.toggleTextActive]}>
            % Percent
          </Text>
        </TouchableOpacity>
      </View>

      {/* KPIs — 2x2 grid on mobile, 4 in a row on web */}
      <View style={[styles.kpiGrid, isWide && styles.kpiGridWide]}>
        <View style={[styles.kpiRow, isWide && styles.kpiRowWide]}>
          <View style={styles.kpiCell}>
            {isLoadingPrices ? (
              <SkeletonKPICard />
            ) : (
              <KPICard
                label="Invested Value"
                value={formatCurrency(portfolioMetrics.investedValue)}
                subtitle={`${totalHoldings} holdings`}
                icon="arrow-down-circle"
                iconColor={theme.colors.blue}
              />
            )}
          </View>
          <View style={styles.kpiCell}>
            {isLoadingPrices ? (
              <SkeletonKPICard />
            ) : (
              <KPICard
                label="Current Value"
                value={formatCurrency(portfolioMetrics.currentValue)}
                subtitle="Live prices"
                icon="trending-up"
                iconColor={theme.colors.green}
              />
            )}
          </View>
        </View>
        <View style={[styles.kpiRow, isWide && styles.kpiRowWide]}>
          <View style={styles.kpiCell}>
            {isLoadingPrices ? (
              <SkeletonKPICard />
            ) : (
              <KPICard
                label="Total Returns"
                value={
                  returnsMode === "percent"
                    ? `${portfolioMetrics.returnsPercent >= 0 ? "+" : ""}${portfolioMetrics.returnsPercent.toFixed(2)}%`
                    : formatCurrency(portfolioMetrics.totalReturns)
                }
                subtitle={
                  returnsMode === "percent"
                    ? `${formatCurrency(portfolioMetrics.totalReturns)}${portfolioMetrics.xirr !== null ? ` • XIRR: ${portfolioMetrics.xirr.toFixed(2)}%` : ''}`
                    : `${portfolioMetrics.returnsPercent.toFixed(2)}%${portfolioMetrics.xirr !== null ? ` • XIRR: ${portfolioMetrics.xirr.toFixed(2)}%` : ''}`
                }
                icon={portfolioMetrics.totalReturns >= 0 ? "arrow-up" : "arrow-down"}
                iconColor={portfolioMetrics.totalReturns >= 0 ? theme.colors.green : theme.colors.red}
              />
            )}
          </View>
          <View style={styles.kpiCell}>
            <KPICard
              label="Active Clients"
              value={`${clients.length}`}
              subtitle={clients.length > 0 ? "Managed" : "No clients yet"}
              icon="users"
              iconColor={theme.colors.accent}
            />
          </View>
        </View>
      </View>

      {/* Charts */}
      <View style={[styles.chartsRow, isWide && styles.chartsRowWide]}>
        <View style={[styles.card, isWide ? { flex: 1 } : { marginBottom: 16 }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Portfolio Performance</Text>
            <View style={styles.periodToggle}>
              {(["daily", "monthly", "yearly"] as ChartPeriod[]).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.periodBtn, chartPeriod === p && styles.periodBtnActive]}
                  onPress={() => setChartPeriod(p)}
                >
                  <Text
                    style={[styles.periodText, chartPeriod === p && styles.periodTextActive]}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {chartData.length > 0 ? (
            <View
              style={{ flex: 1, minHeight: 100 }}
              onLayout={(e) => {
                const h = e.nativeEvent.layout.height;
                if (h > 60) setBarChartHeight(h);
              }}
            >
              <BarChart data={chartData} height={isWide ? barChartHeight : 100} />
            </View>
          ) : (
            <Text style={styles.noDataText}>No transaction data for this period</Text>
          )}
        </View>

        {/* Portfolio vs Index Comparison Line Chart */}
        <View style={[styles.card, isWide && { flex: 1 }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>vs Index</Text>
            <View style={styles.periodToggle}>
              {COMP_PERIODS.map((p) => (
                <TouchableOpacity
                  key={p.label}
                  style={[styles.periodBtn, compPeriodDays === p.days && styles.periodBtnActive]}
                  onPress={() => setCompPeriodDays(p.days)}
                >
                  <Text style={[styles.periodText, compPeriodDays === p.days && styles.periodTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.indexSelector}>
            {INDEX_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.symbol}
                style={[styles.indexBtn, compIndexSymbol === opt.symbol && styles.indexBtnActive]}
                onPress={() => setCompIndexSymbol(opt.symbol)}
              >
                <Text style={[styles.indexBtnText, compIndexSymbol === opt.symbol && styles.indexBtnTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {isLoadingIndex ? (
            <ActivityIndicator color={theme.colors.accent} style={{ marginVertical: 30 }} />
          ) : compSeries.length > 0 ? (
            <>
              <LineChart series={compSeries} height={isWide ? 160 : 140} />
              <View style={styles.compStatsRow}>
                <View style={styles.compStat}>
                  <Text style={styles.compStatLabel}>Portfolio</Text>
                  <Text style={[styles.compStatValue, { color: (portfolioReturn ?? 0) >= 0 ? theme.colors.green : theme.colors.red }]}>
                    {portfolioReturn !== null ? `${portfolioReturn >= 0 ? "+" : ""}${portfolioReturn.toFixed(2)}%` : "—"}
                  </Text>
                </View>
                <View style={styles.compStatDivider} />
                <View style={styles.compStat}>
                  <Text style={styles.compStatLabel}>{indexLabel}</Text>
                  <Text style={[styles.compStatValue, { color: theme.colors.yellow }]}>
                    {indexReturn !== null ? `${indexReturn >= 0 ? "+" : ""}${indexReturn.toFixed(2)}%` : "—"}
                  </Text>
                </View>
                <View style={styles.compStatDivider} />
                <View style={styles.compStat}>
                  <Text style={styles.compStatLabel}>Alpha</Text>
                  <Text style={[styles.compStatValue, { color: (alpha ?? 0) >= 0 ? theme.colors.green : theme.colors.red }]}>
                    {alpha !== null ? `${alpha >= 0 ? "+" : ""}${alpha.toFixed(2)}%` : "—"}
                  </Text>
                  <Text style={styles.compStatSub}>
                    {alpha !== null ? (alpha >= 0 ? "outperformed" : "underperformed") : ""}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <Text style={styles.noDataText}>No data for this period</Text>
          )}
        </View>
      </View>

      {/* Allocation Charts */}
      {(assetTypeData.length > 0 || holdingsData.length > 0) && (
        <View style={[styles.chartsRow, isWide && styles.chartsRowWide]}>
          {assetTypeData.length > 0 && (
            <View style={[styles.card, isWide ? { flex: 1 } : { marginBottom: 16 }]}>
              <Text style={styles.cardTitle}>By Asset Type</Text>
              <View style={{ marginTop: 12 }}>
                <PieChart data={assetTypeData} />
              </View>
            </View>
          )}
          {holdingsData.length > 0 && (
            <View style={[styles.card, isWide && { flex: 1 }]}>
              <Text style={styles.cardTitle}>By Holding</Text>
              <View style={{ marginTop: 12 }}>
                <PieChart data={holdingsData} />
              </View>
            </View>
          )}
        </View>
      )}

      {/* Clients */}
      <View style={styles.sectionHeader}>
        <Text style={styles.cardTitle}>Your Clients</Text>
        <TouchableOpacity onPress={() => router.push("/(manager)/clients" as any)}>
          <Text style={styles.viewAll}>View All →</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 20 }} />
      ) : clients.length === 0 ? (
        <View style={styles.emptyCard}>
          <Feather name="users" size={32} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>No clients yet</Text>
          <Text style={styles.emptyText}>
            Go to the Clients tab to link client accounts
          </Text>
        </View>
      ) : (
        <View style={[styles.clientGrid, isWide && styles.clientGridWide]}>
          {clients.slice(0, isWide ? 6 : 3).map((client) => (
            <TouchableOpacity
              key={client.id}
              style={[styles.clientCard, isWide && styles.clientCardWide]}
              activeOpacity={0.7}
              onPress={() =>
                router.push(`/(manager)/portfolio/${client.id}` as any)
              }
            >
              <View style={styles.clientCardTop}>
                <Avatar name={client.full_name} size={isWide ? 44 : 38} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.clientName}>{client.full_name}</Text>
                  <Text style={styles.clientMeta}>{client.email}</Text>
                </View>
                <Feather name="chevron-right" size={14} color={theme.colors.textMuted} />
              </View>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                <Badge color="accent">{client.role}</Badge>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </>
  );

  if (isWide) {
    return <View style={styles.webWrap}>{content}</View>;
  }

  return <ScreenContainer>{content}</ScreenContainer>;
}

const styles = StyleSheet.create({
  webWrap: {
    flex: 1,
  },
  mobileHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greeting: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  pageTitle: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: "700",
    marginTop: 4,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleRow: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  toggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: theme.colors.accent,
  },
  toggleText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "500",
  },
  toggleTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  kpiGrid: {
    marginBottom: 20,
    gap: 10,
  },
  kpiGridWide: {
    marginBottom: 24,
    gap: 12,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 10,
  },
  kpiRowWide: {
    gap: 16,
  },
  kpiCell: {
    flex: 1,
  },
  chartsRow: {
    marginBottom: 20,
  },
  chartsRowWide: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    flexWrap: "wrap",
    rowGap: 8,
  },
  cardTitle: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  periodToggle: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 2,
    marginLeft: "auto",
  },
  periodBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  periodBtnActive: {
    backgroundColor: theme.colors.accent,
  },
  periodText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: "500",
  },
  periodTextActive: {
    color: "#fff",
  },
  noDataText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  viewAll: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: "500",
  },
  clientGrid: {
    marginTop: 4,
  },
  clientGridWide: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  clientCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
  },
  clientCardWide: {
    width: "31%",
    borderRadius: 16,
    padding: 20,
    marginBottom: 0,
  },
  clientCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  clientName: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  clientMeta: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    padding: 32,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: "center",
  },
  compStatsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  compStat: {
    flex: 1,
    alignItems: "center",
  },
  compStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: theme.colors.border,
  },
  compStatLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginBottom: 2,
  },
  compStatValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  compStatSub: {
    color: theme.colors.textMuted,
    fontSize: 10,
    marginTop: 1,
  },
  indexSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  indexBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  indexBtnActive: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accent,
  },
  indexBtnText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: "500",
  },
  indexBtnTextActive: {
    color: theme.colors.accent,
    fontWeight: "600",
  },
});
