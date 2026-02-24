import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { Feather } from "@expo/vector-icons";
import { theme } from "../../../lib/theme";
import { useIsWebWide } from "../../../lib/platform";
import { ScreenContainer } from "../../../components/layout";
import { Badge, KPICard, SkeletonKPICard } from "../../../components/ui";
import { HoldingRow } from "../../../components/cards";
import { AddHoldingModal, AddTransactionModal, UpdateNAVModal } from "../../../components/modals";
import { formatCurrency } from "../../../lib/formatters";
import { calculatePortfolioMetrics } from "../../../lib/marketData";
import { fetchPortfolioSnapshots, updateManualNAV, type PortfolioSnapshot } from "../../../lib/api";
import {
  fetchPortfolios,
  createPortfolio,
  fetchHoldings,
  addHolding,
  updateHolding,
  deleteHolding,
  addTransaction,
  fetchTransactions,
} from "../../../store/slices/portfolioSlice";
import type { AppDispatch, RootState } from "../../../store";
import type { DBHolding, AssetType, TransactionType } from "../../../types";

export default function PortfolioDetailScreen() {
  const { id: clientId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isWide = useIsWebWide();
  const dispatch = useDispatch<AppDispatch>();

  const { clients, portfolios, holdings, transactions, isLoading } = useSelector(
    (s: RootState) => s.portfolio
  );

  const client = clients.find((c) => c.id === clientId);
  // Get the oldest portfolio for this client (in case there are multiple)
  const clientPortfolios = portfolios.filter((p) => p.client_id === clientId);
  const portfolio = clientPortfolios.sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )[0];
  const portfolioId = portfolio?.id;
  const holdingsList = portfolioId ? holdings[portfolioId] ?? [] : [];
  const txList = portfolioId ? transactions[portfolioId] ?? [] : [];

  // Modal state
  const [showHoldingModal, setShowHoldingModal] = useState(false);
  const [editingHolding, setEditingHolding] = useState<DBHolding | null>(null);
  const [showTxModal, setShowTxModal] = useState(false);
  const [txDefaultSymbol, setTxDefaultSymbol] = useState("");
  const [activeTab, setActiveTab] = useState<"holdings" | "transactions">("holdings");
  const [showNAVModal, setShowNAVModal] = useState(false);
  const [updatingNAVHolding, setUpdatingNAVHolding] = useState<DBHolding | null>(null);

  // Performance metrics state
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

  // Load portfolios → holdings → transactions
  useEffect(() => {
    if (clientId) {
      dispatch(fetchPortfolios(clientId));
    }
  }, [clientId, dispatch]);

  useEffect(() => {
    if (portfolioId) {
      dispatch(fetchHoldings(portfolioId));
      dispatch(fetchTransactions(portfolioId));
    }
  }, [portfolioId, dispatch]);

  // Auto-create portfolio if client has none
  useEffect(() => {
    if (!isLoading && clientId && portfolios.length === 0 && !portfolio) {
      dispatch(createPortfolio({ clientId, name: "Main Portfolio" }));
    }
  }, [isLoading, clientId, portfolios.length, portfolio, dispatch]);

  // Fetch live prices for this client's holdings
  useEffect(() => {
    if (holdingsList.length > 0) {
      setIsLoadingPrices(true);
      calculatePortfolioMetrics(holdingsList)
        .then(setPortfolioMetrics)
        .finally(() => setIsLoadingPrices(false));
    }
  }, [holdingsList]);

  // Fetch snapshots for this portfolio
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

  // KPIs
  const totalValue = holdingsList.reduce((sum, h) => sum + Number(h.quantity) * Number(h.avg_cost), 0);
  const holdingCount = holdingsList.length;

  // Debug logging
  useEffect(() => {
    console.log("=== Client Portfolio Detail Debug ===");
    console.log("Client ID:", clientId);
    console.log("Client:", client);
    console.log("Portfolio:", portfolio);
    console.log("Portfolio ID:", portfolioId);
    console.log("Holdings list length:", holdingsList.length);
    console.log("Holdings:", holdingsList);
    console.log("Holdings state keys:", Object.keys(holdings));
    console.log("Holdings state:", holdings);
    console.log("Total Value:", totalValue);
    console.log("isLoading:", isLoading);
    console.log("======================================");
  }, [clientId, client, portfolio, portfolioId, holdingsList, holdings, totalValue, isLoading]);

  // Handlers
  const handleAddHolding = useCallback(
    async (data: {
      symbol: string;
      quantity: number;
      avg_cost: number;
      asset_type: AssetType;
      source?: string;
    }) => {
      if (!portfolioId) return;
      await dispatch(addHolding({ portfolioId, holding: data })).unwrap();
    },
    [portfolioId, dispatch]
  );

  const handleUpdateNAV = useCallback(
    async (holdingId: string, newNAV: number) => {
      if (!portfolioId) return;
      await updateManualNAV(portfolioId, holdingId, newNAV);
      // Refresh holdings to get updated data
      await dispatch(fetchHoldings(portfolioId));
      Alert.alert("Success", "NAV updated successfully");
    },
    [portfolioId, dispatch]
  );

  const handleOpenNAVModal = (holding: DBHolding) => {
    setUpdatingNAVHolding(holding);
    setShowNAVModal(true);
  };

  const handleUpdateHolding = useCallback(
    async (data: {
      symbol: string;
      quantity: number;
      avg_cost: number;
      asset_type: AssetType;
      source?: string;
    }) => {
      if (!portfolioId || !editingHolding) return;
      await dispatch(
        updateHolding({
          holdingId: editingHolding.id,
          portfolioId,
          updates: data,
        })
      ).unwrap();
    },
    [portfolioId, editingHolding, dispatch]
  );

  const handleDeleteHolding = useCallback(
    async () => {
      if (!portfolioId || !editingHolding) return;
      await dispatch(
        deleteHolding({ holdingId: editingHolding.id, portfolioId })
      ).unwrap();
    },
    [portfolioId, editingHolding, dispatch]
  );

  const handleDeleteFromRow = useCallback(
    (h: DBHolding) => {
      if (!portfolioId) return;
      Alert.alert("Delete Holding", `Remove ${h.symbol} from this portfolio?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await dispatch(
                deleteHolding({ holdingId: h.id, portfolioId })
              ).unwrap();
            } catch (err: any) {
              Alert.alert("Error", err?.message ?? "Failed to delete holding");
            }
          },
        },
      ]);
    },
    [portfolioId, dispatch]
  );

  const handleAddTransaction = useCallback(
    async (data: {
      symbol: string;
      type: TransactionType;
      quantity: number;
      price: number;
    }) => {
      if (!portfolioId) return;
      await dispatch(addTransaction({ portfolioId, transaction: data })).unwrap();
    },
    [portfolioId, dispatch]
  );

  const openEditHolding = (h: DBHolding) => {
    setEditingHolding(h);
    setShowHoldingModal(true);
  };

  const openAddHolding = () => {
    setEditingHolding(null);
    setShowHoldingModal(true);
  };

  const openAddTx = (symbol?: string) => {
    setTxDefaultSymbol(symbol || "");
    setShowTxModal(true);
  };

  // Loading state
  if (isLoading && holdingsList.length === 0) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  const header = (
    <View style={[styles.header, isWide && styles.headerWide]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Feather name="chevron-left" size={18} color={theme.colors.textSecondary} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle}>
          {client?.full_name || "Client Portfolio"}
        </Text>
        <Text style={styles.headerMeta}>
          {portfolio?.name || "Portfolio"} · {client?.email || ""}
        </Text>
      </View>
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.actionBtnHeader} onPress={openAddHolding}>
          <Feather name="plus" size={16} color="#fff" />
          {isWide && <Text style={styles.actionBtnText}>Add Holding</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtnHeader, { backgroundColor: theme.colors.green }]}
          onPress={() => openAddTx()}
        >
          <Feather name="repeat" size={16} color="#fff" />
          {isWide && <Text style={styles.actionBtnText}>Record Transaction</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );

  const valueCard = (
    <View style={styles.valueCard}>
      <Text style={styles.valueLabel}>TOTAL VALUE</Text>
      <Text style={styles.valueAmount}>{formatCurrency(totalValue)}</Text>
      <View style={styles.valueBadges}>
        <Badge>{holdingCount} holdings</Badge>
        <Badge>{txList.length} transactions</Badge>
      </View>
    </View>
  );

  // Tab switcher
  const tabSwitcher = (
    <View style={styles.tabRow}>
      <TouchableOpacity
        style={[styles.tab, activeTab === "holdings" && styles.tabActive]}
        onPress={() => setActiveTab("holdings")}
      >
        <Feather
          name="briefcase"
          size={14}
          color={activeTab === "holdings" ? theme.colors.accent : theme.colors.textMuted}
        />
        <Text
          style={[styles.tabText, activeTab === "holdings" && styles.tabTextActive]}
        >
          Holdings ({holdingCount})
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === "transactions" && styles.tabActive]}
        onPress={() => setActiveTab("transactions")}
      >
        <Feather
          name="list"
          size={14}
          color={activeTab === "transactions" ? theme.colors.accent : theme.colors.textMuted}
        />
        <Text
          style={[styles.tabText, activeTab === "transactions" && styles.tabTextActive]}
        >
          Transactions ({txList.length})
        </Text>
      </TouchableOpacity>
    </View>
  );

  const holdingsContent = (
    <>
      {holdingsList.length === 0 ? (
        <View style={styles.emptyCard}>
          <Feather name="briefcase" size={32} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>No holdings yet</Text>
          <Text style={styles.emptyText}>
            Tap "Add Holding" to add stocks, ETFs, funds, or crypto to this portfolio.
          </Text>
        </View>
      ) : (
        holdingsList.map((h) => (
          <HoldingRow
            key={h.id}
            dbHolding={h}
            currentPrice={portfolioMetrics.currentPrices.get(h.symbol)}
            onEdit={openEditHolding}
            onDelete={handleDeleteFromRow}
            onUpdateNAV={handleOpenNAVModal}
          />
        ))
      )}
    </>
  );

  const transactionsContent = (
    <>
      {txList.length === 0 ? (
        <View style={styles.emptyCard}>
          <Feather name="list" size={32} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>No transactions yet</Text>
          <Text style={styles.emptyText}>
            Record buy, sell, or dividend transactions to track activity.
          </Text>
        </View>
      ) : (
        txList.map((tx) => (
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
                  {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)} · {tx.quantity} @ ₹
                  {tx.price.toFixed(2)}
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
                {tx.type === "sell" ? "-" : "+"}₹{(tx.quantity * tx.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
              <Text style={styles.txDate}>
                {new Date(tx.date).toLocaleDateString()}
              </Text>
            </View>
          </View>
        ))
      )}
    </>
  );

  const content = (
    <>
      {header}

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

      {isWide ? (
        <>
          {/* KPI Cards Grid */}
          <View style={styles.kpiGrid}>
            <View style={styles.kpiRowFlex}>
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
                    subtitle="Live prices"
                    icon="trending-up"
                    iconColor={theme.colors.green}
                  />
                )}
              </View>
            </View>
            <View style={styles.kpiRowFlex}>
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
                  subtitle={txList.length > 0 ? "Total recorded" : "None yet"}
                  icon="repeat"
                  iconColor={theme.colors.accent}
                />
              </View>
            </View>
          </View>
          {tabSwitcher}
          <View style={styles.card}>
            {activeTab === "holdings" ? holdingsContent : transactionsContent}
          </View>
        </>
      ) : (
        <>
          {/* Mobile KPI Cards */}
          <View style={styles.kpiGrid}>
            <View style={styles.kpiRowFlex}>
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
                    subtitle="Live prices"
                    icon="trending-up"
                    iconColor={theme.colors.green}
                  />
                )}
              </View>
            </View>
            <View style={styles.kpiRowFlex}>
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
          {tabSwitcher}
          {activeTab === "holdings" ? holdingsContent : transactionsContent}
        </>
      )}

      {/* Modals */}
      <AddHoldingModal
        visible={showHoldingModal}
        onClose={() => {
          setShowHoldingModal(false);
          setEditingHolding(null);
        }}
        onSave={editingHolding ? handleUpdateHolding : handleAddHolding}
        onDelete={editingHolding ? handleDeleteHolding : undefined}
        editing={editingHolding}
      />

      <AddTransactionModal
        visible={showTxModal}
        onClose={() => setShowTxModal(false)}
        onSave={handleAddTransaction}
        defaultSymbol={txDefaultSymbol}
      />

      <UpdateNAVModal
        visible={showNAVModal}
        holding={updatingNAVHolding}
        onClose={() => {
          setShowNAVModal(false);
          setUpdatingNAVHolding(null);
        }}
        onUpdate={handleUpdateNAV}
      />
    </>
  );

  if (isWide) {
    // WebShell already provides ScrollView + padding
    return <View style={{ flex: 1 }}>{content}</View>;
  }

  return <ScreenContainer>{content}</ScreenContainer>;
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.bg,
  },
  webScroll: {
    flex: 1,
  },
  webContent: {
    padding: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  headerWide: {
    gap: 16,
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
  headerMeta: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtnHeader: {
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
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
  kpiRowFlex: {
    flexDirection: "row",
    gap: 10,
  },
  kpiCell: {
    flex: 1,
  },
  valueCard: {
    backgroundColor: "rgba(79,140,255,0.08)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(79,140,255,0.18)",
    marginBottom: 16,
  },
  valueLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  valueAmount: {
    color: theme.colors.textPrimary,
    fontSize: 30,
    fontWeight: "700",
    marginVertical: 6,
  },
  valueBadges: {
    flexDirection: "row",
    gap: 12,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  tabRow: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: theme.colors.card,
  },
  tabText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "500",
  },
  tabTextActive: {
    color: theme.colors.accent,
    fontWeight: "600",
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
  kpiRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  kpiLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  kpiValue: {
    color: theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
    marginTop: 8,
  },
  // Transaction rows
  txRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
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
});
