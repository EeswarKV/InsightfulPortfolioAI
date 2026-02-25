import { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { theme } from "../../lib/theme";
import { useIsWebWide } from "../../lib/platform";
import { ScreenContainer } from "../../components/layout";
import { KPICard, SkeletonKPICard, MarketTicker } from "../../components/ui";
import { HoldingRow } from "../../components/cards";
import { formatCurrency, getGreeting } from "../../lib/formatters";
import { BarChart, LineChart, type LineSeries, type LineDataPoint } from "../../components/charts";
import { fetchIndexHistory, INDEX_OPTIONS, type IndexDataPoint } from "../../lib/globalMarketApi";
import { computePerformanceData, computeHoldingsPerformance, computePerformanceFromSnapshots, type ChartPeriod } from "../../lib/chartUtils";
import { calculatePortfolioMetrics } from "../../lib/marketData";
import { fetchPortfolioSnapshots, type PortfolioSnapshot } from "../../lib/api";
import {
  fetchPortfolios,
  fetchHoldings,
  fetchTransactions,
} from "../../store/slices/portfolioSlice";
import { signOut } from "../../store/slices/authSlice";
import { fetchUnreadCount } from "../../store/slices/alertsSlice";
import { selectAllPrices, selectMarketConnected, selectMarketSource } from "../../store/slices/marketSlice";
import { useMarketWebSocket } from "../../hooks/useMarketWebSocket";
import type { AppDispatch, RootState } from "../../store";

const COMP_PERIODS = [
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
];

export default function ClientPortfolioScreen() {
  const isWide = useIsWebWide();
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { user } = useSelector((s: RootState) => s.auth);
  const { portfolios, holdings, transactions, isLoading } = useSelector(
    (s: RootState) => s.portfolio
  );
  const { unreadCount } = useSelector((s: RootState) => s.alerts);
  const wsLivePrices = useSelector(selectAllPrices);
  const marketConnected = useSelector(selectMarketConnected);
  const marketSource = useSelector(selectMarketSource);
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
    currentPrices: new Map<string, number>(), // Map of symbol → current price
  });
  const [snapshotData, setSnapshotData] = useState<PortfolioSnapshot[]>([]);
  const [useSnapshots, setUseSnapshots] = useState(false);
  const [compPeriodDays, setCompPeriodDays] = useState(30);
  const [compIndexSymbol, setCompIndexSymbol] = useState("^NSEI");
  const [indexHistory, setIndexHistory] = useState<IndexDataPoint[]>([]);
  const [isLoadingIndex, setIsLoadingIndex] = useState(false);
  const [portfolioLineData, setPortfolioLineData] = useState<LineDataPoint[]>([]);

  const clientId = user?.id;
  // Get the oldest portfolio for this client (in case there are multiple)
  const clientPortfolios = portfolios.filter((p) => p.client_id === clientId);
  const portfolio = clientPortfolios.sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )[0];
  const portfolioId = portfolio?.id;
  const holdingsList = portfolioId ? holdings[portfolioId] ?? [] : [];
  const txList = portfolioId ? transactions[portfolioId] ?? [] : [];

  // Build WebSocket symbol list from holdings
  const wsSymbols = holdingsList
    .filter((h) => h.asset_type === "stock" || h.asset_type === "etf")
    .map((h) => `NSE:${h.symbol}`);
  useMarketWebSocket(wsSymbols);

  // Load portfolios → holdings + unread count
  useEffect(() => {
    if (clientId) {
      dispatch(fetchPortfolios(clientId));
      dispatch(fetchUnreadCount());
    }
  }, [clientId, dispatch]);

  useEffect(() => {
    if (portfolioId) {
      dispatch(fetchHoldings(portfolioId));
      dispatch(fetchTransactions(portfolioId));
    }
  }, [portfolioId, dispatch]);

  // Recalculate portfolio metrics when holdings or live WebSocket prices change
  useEffect(() => {
    if (holdingsList.length > 0) {
      setIsLoadingPrices(true);
      calculatePortfolioMetrics(holdingsList, wsLivePrices)
        .then(setPortfolioMetrics)
        .finally(() => setIsLoadingPrices(false));
    }
  }, [holdingsList, wsLivePrices]);

  // Fetch snapshots for client's portfolio
  useEffect(() => {
    const fetchSnapshots = async () => {
      if (portfolioId) {
        try {
          const snapshots = await fetchPortfolioSnapshots(portfolioId);
          setSnapshotData(snapshots);
          setUseSnapshots(snapshots.length > 0);
        } catch (error) {
          console.error("Failed to fetch snapshots:", error);
        }
      }
    };
    fetchSnapshots();
  }, [portfolioId]);

  // Fetch index history for comparison chart
  useEffect(() => {
    setIsLoadingIndex(true);
    fetchIndexHistory(compIndexSymbol, compPeriodDays)
      .then(setIndexHistory)
      .finally(() => setIsLoadingIndex(false));
  }, [compPeriodDays, compIndexSymbol]);

  // Compute portfolio line: clip to each holding's purchase_date, normalize from avg_cost
  useEffect(() => {
    if (holdingsList.length === 0) { setPortfolioLineData([]); return; }

    let cancelled = false;
    Promise.all(
      holdingsList.map(h => {
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
  }, [holdingsList, compPeriodDays]);

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
    ...(portfolioLineData.length >= 2 ? [{ name: "My Portfolio", color: theme.colors.accent, data: portfolioLineData }] : []),
    ...(indexLine.length >= 2 ? [{ name: INDEX_OPTIONS.find(o => o.symbol === compIndexSymbol)?.label ?? "Index", color: theme.colors.yellow, data: indexLine }] : []),
  ];

  const totalValue = holdingsList.reduce((sum, h) => sum + Number(h.quantity) * Number(h.avg_cost), 0);
  const holdingCount = holdingsList.length;

  // Debug logging
  useEffect(() => {
    console.log("=== Client Portfolio Debug ===");
    console.log("Client ID:", clientId);
    console.log("Portfolios:", portfolios.length);
    console.log("Portfolio ID:", portfolioId);
    console.log("Holdings list length:", holdingsList.length);
    console.log("Holdings:", holdingsList);
    console.log("Total Value:", totalValue);
    console.log("isLoading:", isLoading);
  }, [clientId, portfolios, portfolioId, holdingsList, totalValue, isLoading]);

  // Compute unique asset types
  const assetTypes = new Set<string>();
  for (const h of holdingsList) {
    if (h.asset_type) assetTypes.add(h.asset_type);
  }

  const chartData = useSnapshots && snapshotData.length > 0
    ? computePerformanceFromSnapshots(snapshotData, chartPeriod)
    : computeHoldingsPerformance(
        holdingsList,
        portfolioMetrics.livePrices,
        chartPeriod
      );

  const content = (
    <>
      {/* Mobile-only market ticker (web ticker rendered in WebShell) */}
      {!isWide && <MarketTicker />}

      {!isWide && (
        <View style={styles.mobileHeader}>
          <View>
            <Text style={styles.greeting}>{getGreeting(user?.user_metadata?.full_name)}</Text>
            <Text style={styles.pageTitle}>My Portfolio</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push("/(client)/profile" as any)}
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

      {/* KPI Grid — 2x2 on mobile, 4 in a row on web */}
      <View style={[styles.kpiGrid, isWide && styles.kpiGridWide]}>
        <View style={[styles.kpiRow, isWide && styles.kpiRowWide]}>
          <View style={styles.kpiCell}>
            {isLoadingPrices ? (
              <SkeletonKPICard />
            ) : (
              <KPICard
                label="Invested Value"
                value={formatCurrency(portfolioMetrics.investedValue)}
                subtitle={`${holdingCount} holdings`}
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
                subtitle={marketSource === "zerodha" ? "● LIVE" : marketSource === "fallback" ? "↻ ~5s" : "Last price"}
                subtitleColor={marketSource === "zerodha" ? theme.colors.green : undefined}
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
              label="Transactions"
              value={`${txList.length}`}
              subtitle={txList.length > 0 ? "Total" : "None yet"}
              icon="repeat"
              iconColor={theme.colors.accent}
            />
          </View>
        </View>
      </View>

      {/* Performance Chart */}
      <View style={styles.card}>
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
      <View style={styles.card}>
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
          <LineChart series={compSeries} height={140} />
        ) : (
          <Text style={styles.noDataText}>No data for this period</Text>
        )}
      </View>

      {/* Holdings */}
      {isLoading && holdingsList.length === 0 ? (
        <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 40 }} />
      ) : holdingsList.length === 0 ? (
        <View style={styles.emptyCard}>
          <Feather name="briefcase" size={32} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>No holdings yet</Text>
          <Text style={styles.emptyText}>
            Your portfolio manager will add investments here.
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Holdings</Text>
          {holdingsList.map((h) => (
            <HoldingRow
              key={h.id}
              dbHolding={h}
              currentPrice={portfolioMetrics.currentPrices.get(h.symbol)}
            />
          ))}
        </>
      )}

      {/* Recent Transactions */}
      {txList.length > 0 && (
        <View style={styles.txSection}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {txList.slice(0, 10).map((tx) => (
            <View key={tx.id} style={styles.txRow}>
              <View style={styles.txLeft}>
                <View style={styles.txIconWrap}>
                  <Feather
                    name={
                      tx.type === "buy"
                        ? "arrow-down-circle"
                        : tx.type === "sell"
                        ? "arrow-up-circle"
                        : "dollar-sign"
                    }
                    size={16}
                    color={
                      tx.type === "buy"
                        ? theme.colors.green
                        : tx.type === "sell"
                        ? theme.colors.red
                        : theme.colors.accent
                    }
                  />
                </View>
                <View>
                  <Text style={styles.txSymbol}>{tx.symbol}</Text>
                  <Text style={styles.txMeta}>
                    {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)} · {tx.quantity} @
                    ₹{tx.price.toFixed(2)}
                  </Text>
                </View>
              </View>
              <View style={styles.txRight}>
                <Text
                  style={[
                    styles.txTotal,
                    {
                      color:
                        tx.type === "buy"
                          ? theme.colors.green
                          : tx.type === "sell"
                          ? theme.colors.red
                          : theme.colors.accent,
                    },
                  ]}
                >
                  {tx.type === "sell" ? "-" : "+"}₹
                  {(tx.quantity * tx.price).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
                <Text style={styles.txDate}>
                  {new Date(tx.date).toLocaleDateString()}
                </Text>
              </View>
            </View>
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
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 20,
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
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
  },
  emptyCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    padding: 32,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    gap: 8,
    marginTop: 16,
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
  txSection: {
    marginTop: 16,
  },
  txRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 6,
  },
  txLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  txIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  txSymbol: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  txMeta: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  txRight: {
    alignItems: "flex-end",
  },
  txTotal: {
    fontSize: 14,
    fontWeight: "600",
  },
  txDate: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
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
