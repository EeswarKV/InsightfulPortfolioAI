import { useEffect, useState, useMemo } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { Feather } from "@expo/vector-icons";
import { theme } from "../../lib/theme";
import { useIsWebWide } from "../../lib/platform";
import { ScreenContainer } from "../../components/layout";
import { KPICard, Avatar, SkeletonKPICard, MarketTicker } from "../../components/ui";
import { BarChart, LineChart, type LineSeries, type LineDataPoint } from "../../components/charts";
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
  });
  const [snapshotData, setSnapshotData] = useState<PortfolioSnapshot[]>([]);
  const [useSnapshots, setUseSnapshots] = useState(false);
  const [compPeriodDays, setCompPeriodDays] = useState(30);
  const [compIndexSymbol, setCompIndexSymbol] = useState("^NSEI");
  const [indexHistory, setIndexHistory] = useState<IndexDataPoint[]>([]);
  const [isLoadingIndex, setIsLoadingIndex] = useState(false);
  const [portfolioLineData, setPortfolioLineData] = useState<LineDataPoint[]>([]);

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

  // Compute portfolio line from holdings price history (qty × daily close, summed across all holdings)
  useEffect(() => {
    const allHoldings: DBHolding[] = [];
    for (const p of portfolios) allHoldings.push(...(holdings[p.id] ?? []));
    if (allHoldings.length === 0) { setPortfolioLineData([]); return; }

    let cancelled = false;
    Promise.all(
      allHoldings.map(h => {
        // Clean symbol: strip any existing exchange suffix, then add .NS
        const baseSymbol = h.symbol.replace(/\.(NS|BO|NSE|BSE)$/i, "");
        return fetchIndexHistory(`${baseSymbol}.NS`, compPeriodDays)
          .then(data => ({ qty: Number(h.quantity), data }))
          .catch(() => ({ qty: 0, data: [] as IndexDataPoint[] }));
      })
    ).then(results => {
      if (cancelled) return;
      const byDate = new Map<string, number>();
      for (const { qty, data } of results) {
        for (const pt of data) {
          byDate.set(pt.date, (byDate.get(pt.date) || 0) + qty * pt.close);
        }
      }
      const entries = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));
      if (entries.length < 2) { setPortfolioLineData([]); return; }
      const base = entries[0][1];
      setPortfolioLineData(base === 0 ? [] : entries.map(([date, value]) => ({
        label: date,
        value: ((value - base) / base) * 100,
      })));
    }).catch(() => { if (!cancelled) setPortfolioLineData([]); });
    return () => { cancelled = true; };
  }, [portfolios, holdings, compPeriodDays]);

  // Normalize index history → % return from period start
  const indexLine: LineDataPoint[] = useMemo(() => {
    if (indexHistory.length < 2) return [];
    const base = indexHistory[0].close;
    return indexHistory.map(d => ({
      label: d.date,
      value: base === 0 ? 0 : ((d.close - base) / base) * 100,
    }));
  }, [indexHistory]);

  const compSeries: LineSeries[] = [
    ...(portfolioLineData.length >= 2 ? [{ name: "Portfolio", color: theme.colors.accent, data: portfolioLineData }] : []),
    ...(indexLine.length >= 2 ? [{ name: INDEX_OPTIONS.find(o => o.symbol === compIndexSymbol)?.label ?? "Index", color: theme.colors.yellow, data: indexLine }] : []),
  ];

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
        portfolioMetrics.livePrices,
        chartPeriod
      );

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
            <BarChart data={chartData} height={isWide ? 120 : 100} />
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
            <LineChart series={compSeries} height={isWide ? 160 : 140} />
          ) : (
            <Text style={styles.noDataText}>No data for this period</Text>
          )}
        </View>
      </View>

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
        clients.slice(0, isWide ? 6 : 3).map((client) => (
          <TouchableOpacity
            key={client.id}
            style={styles.clientRow}
            activeOpacity={0.7}
            onPress={() =>
              router.push(`/(manager)/portfolio/${client.id}` as any)
            }
          >
            <View style={styles.clientLeft}>
              <Avatar name={client.full_name} size={38} />
              <View>
                <Text style={styles.clientName}>{client.full_name}</Text>
                <Text style={styles.clientMeta}>{client.email}</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        ))
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
  clientRow: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  clientLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  clientName: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "500",
  },
  clientMeta: {
    color: theme.colors.textMuted,
    fontSize: 11,
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
