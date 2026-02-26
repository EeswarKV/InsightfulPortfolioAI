import { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import * as Sharing from "expo-sharing";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { Feather } from "@expo/vector-icons";
import { theme } from "../../../lib/theme";
import { useIsWebWide } from "../../../lib/platform";
import { ScreenContainer } from "../../../components/layout";
import { Badge, KPICard, SkeletonKPICard } from "../../../components/ui";
import { PieChart, type PieSlice } from "../../../components/charts";
import { LinearGradient } from "expo-linear-gradient";
import { HoldingRow } from "../../../components/cards";
import { AddHoldingModal, AddTransactionModal, UpdateNAVModal, CreatePriceAlertModal } from "../../../components/modals";
import { formatCurrency } from "../../../lib/formatters";
import { calculatePortfolioMetrics } from "../../../lib/marketData";
import { fetchPortfolioSnapshots, updateManualNAV, type PortfolioSnapshot } from "../../../lib/api";
import { downloadPortfolioReport } from "../../../lib/reportApi";
import {
  fetchPortfolios,
  createPortfolio,
  fetchHoldings,
  addHolding,
  updateHolding,
  deleteHolding,
  addTransaction,
  fetchTransactions,
  updateClientNotes,
} from "../../../store/slices/portfolioSlice";
import type { AppDispatch, RootState } from "../../../store";
import type { DBHolding, AssetType, TransactionType } from "../../../types";

const ASSET_COLORS: Record<string, string> = {
  stock: "#4F8CFF", etf: "#34D399", mutual_fund: "#FBBF24",
  crypto: "#F87171", bond: "#A78BFA", other: "#FB923C",
};
const PIE_COLORS = ["#4F8CFF", "#34D399", "#FBBF24", "#F87171", "#A78BFA", "#FB923C", "#38BDF8"];

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
  const [pieContainerWidth, setPieContainerWidth] = useState(0);
  const [holdingSort, setHoldingSort] = useState<"default" | "return_asc" | "return_desc">("default");

  // Notes state
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // Price alert modal state
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertDefaultSymbol, setAlertDefaultSymbol] = useState("");

  // PDF report state
  const [generatingReport, setGeneratingReport] = useState(false);

  // Concentration warnings dismissed state
  const [dismissedWarnings, setDismissedWarnings] = useState(false);

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
    if (!isLoading && clientId && clientPortfolios.length === 0 && !portfolio) {
      dispatch(createPortfolio({ clientId, name: "Main Portfolio" }));
    }
  }, [isLoading, clientId, clientPortfolios.length, portfolio, dispatch]);

  // Fetch live prices for this client's holdings
  useEffect(() => {
    if (holdingsList.length > 0) {
      setIsLoadingPrices(true);
      calculatePortfolioMetrics(holdingsList)
        .then(setPortfolioMetrics)
        .catch((err) => console.warn("Price fetch failed (using avg cost fallback):", err))
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

  // Allocation pie chart data
  const assetTypeData = useMemo<PieSlice[]>(() => {
    const byType: Record<string, number> = {};
    for (const h of holdingsList) {
      const type = h.asset_type || "other";
      byType[type] = (byType[type] ?? 0) + Number(h.quantity) * Number(h.avg_cost);
    }
    return Object.entries(byType)
      .filter(([, v]) => v > 0)
      .map(([label, value]) => ({ label, value, color: ASSET_COLORS[label] ?? "#94A3B8" }));
  }, [holdingsList]);

  // Concentration warnings (>15% single holding, >60% single asset type)
  const concentrationWarnings = useMemo<string[]>(() => {
    const total = portfolioMetrics.currentValue ||
      holdingsList.reduce((s, h) => s + Number(h.quantity) * Number(h.avg_cost), 0);
    if (total === 0 || holdingsList.length === 0) return [];
    const warnings: string[] = [];
    for (const h of holdingsList) {
      const lp = portfolioMetrics.currentPrices?.get(h.symbol) ?? Number(h.avg_cost);
      const pct = (Number(h.quantity) * lp / total) * 100;
      if (pct > 15) warnings.push(`${h.symbol} — ${pct.toFixed(1)}% of portfolio`);
    }
    const byType: Record<string, number> = {};
    for (const h of holdingsList) {
      const lp = portfolioMetrics.currentPrices?.get(h.symbol) ?? Number(h.avg_cost);
      const type = h.asset_type || "other";
      byType[type] = (byType[type] ?? 0) + Number(h.quantity) * lp;
    }
    for (const [type, val] of Object.entries(byType)) {
      const pct = (val / total) * 100;
      if (pct > 60) warnings.push(`Overweight in ${type.replace("_", " ")} — ${pct.toFixed(1)}% of portfolio`);
    }
    return warnings;
  }, [holdingsList, portfolioMetrics]);

  const holdingsData = useMemo<PieSlice[]>(() => {
    const sorted = [...holdingsList]
      .map((h) => ({ label: h.symbol, value: Number(h.quantity) * Number(h.avg_cost) }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
    if (sorted.length <= 7) {
      return sorted.map((d, i) => ({ ...d, color: PIE_COLORS[i % PIE_COLORS.length] }));
    }
    const top = sorted.slice(0, 7);
    const othersValue = sorted.slice(7).reduce((s, d) => s + d.value, 0);
    return [
      ...top.map((d, i) => ({ ...d, color: PIE_COLORS[i % PIE_COLORS.length] })),
      { label: "Others", value: othersValue, color: "#94A3B8" },
    ];
  }, [holdingsList]);

  const todayGain = useMemo(() => {
    return holdingsList.reduce((sum, h) => {
      const lp = portfolioMetrics.livePrices.get(h.symbol);
      if (!lp) return sum;
      return sum + Number(h.quantity) * lp.change;
    }, 0);
  }, [holdingsList, portfolioMetrics.livePrices]);

  const todayGainPercent = useMemo(() => {
    if (portfolioMetrics.currentValue === 0) return 0;
    return (todayGain / portfolioMetrics.currentValue) * 100;
  }, [todayGain, portfolioMetrics.currentValue]);

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

      const performDelete = async () => {
        try {
          await dispatch(deleteHolding({ holdingId: h.id, portfolioId })).unwrap();
        } catch (err: any) {
          const msg = typeof err === "string" ? err : err?.message ?? "Failed to delete holding";
          Alert.alert("Error", msg);
        }
      };

      if (Platform.OS === "web") {
        // Alert.alert's onPress callback is unreliable on React Native Web —
        // use window.confirm directly instead.
        if ((window as any).confirm(`Remove ${h.symbol} from this portfolio?`)) {
          performDelete();
        }
      } else {
        Alert.alert("Delete Holding", `Remove ${h.symbol} from this portfolio?`, [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: performDelete },
        ]);
      }
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

  const handleSaveNotes = useCallback(async () => {
    if (!clientId) return;
    setSavingNotes(true);
    try {
      await dispatch(updateClientNotes({ clientId, notes: notesText })).unwrap();
      setEditingNotes(false);
    } catch (err: any) {
      Alert.alert("Error", err || "Could not save notes");
    } finally {
      setSavingNotes(false);
    }
  }, [clientId, notesText, dispatch]);

  const handleDownloadReport = useCallback(async () => {
    if (!clientId) return;
    setGeneratingReport(true);
    try {
      const uri = await downloadPortfolioReport(clientId);
      // On web the download is triggered inside downloadPortfolioReport directly
      if (uri) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Share Portfolio Report",
        });
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not generate report");
    } finally {
      setGeneratingReport(false);
    }
  }, [clientId]);

  // Must be before any early return (rules of hooks)
  const sortedHoldings = useMemo(() => {
    if (holdingSort === "default") return holdingsList;
    return [...holdingsList].sort((a, b) => {
      const priceA = portfolioMetrics.currentPrices.get(a.symbol) ?? Number(a.avg_cost);
      const priceB = portfolioMetrics.currentPrices.get(b.symbol) ?? Number(b.avg_cost);
      const retA = (priceA - Number(a.avg_cost)) / Number(a.avg_cost);
      const retB = (priceB - Number(b.avg_cost)) / Number(b.avg_cost);
      return holdingSort === "return_desc" ? retB - retA : retA - retB;
    });
  }, [holdingsList, holdingSort, portfolioMetrics.currentPrices]);

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
        <TouchableOpacity
          style={[styles.actionBtnHeader, { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }]}
          onPress={handleDownloadReport}
          disabled={generatingReport}
        >
          {generatingReport
            ? <ActivityIndicator size="small" color={theme.colors.accent} />
            : <Feather name="download" size={16} color={theme.colors.accent} />}
          {isWide && !generatingReport && <Text style={[styles.actionBtnText, { color: theme.colors.accent }]}>Report</Text>}
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
        <>
          {/* Sort controls */}
          <View style={styles.sortRow}>
            <Text style={styles.sortLabel}>Sort:</Text>
            {(["default", "return_desc", "return_asc"] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.sortChip, holdingSort === s && styles.sortChipActive]}
                onPress={() => setHoldingSort(s)}
              >
                <Text style={[styles.sortChipText, holdingSort === s && styles.sortChipTextActive]}>
                  {s === "default" ? "Default" : s === "return_desc" ? "Best Return" : "Worst Return"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {sortedHoldings.map((h) => (
            <HoldingRow
              key={h.id}
              dbHolding={h}
              currentPrice={portfolioMetrics.currentPrices.get(h.symbol)}
              onEdit={openEditHolding}
              onDelete={handleDeleteFromRow}
              onUpdateNAV={handleOpenNAVModal}
              onSetAlert={(holding) => {
                setAlertDefaultSymbol(holding.symbol);
                setShowAlertModal(true);
              }}
            />
          ))}
        </>
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

  const todayBanner = !isLoadingPrices && portfolioMetrics.currentValue > 0 ? (
    <LinearGradient
      colors={todayGain >= 0 ? ["#064E3B", "#065F46"] : ["#450A0A", "#7F1D1D"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.todayCard}
    >
      <View style={styles.todayLeft}>
        <Feather
          name={todayGain >= 0 ? "trending-up" : "trending-down"}
          size={20}
          color={todayGain >= 0 ? theme.colors.green : theme.colors.red}
        />
        <View>
          <Text style={styles.todayLabel}>Today's P&L</Text>
          <Text style={styles.todayHint}>Based on today's market movement</Text>
        </View>
      </View>
      <View style={styles.todayRight}>
        <Text style={[styles.todayAmount, { color: todayGain >= 0 ? theme.colors.green : theme.colors.red }]}>
          {todayGain >= 0 ? "+" : ""}{formatCurrency(todayGain)}
        </Text>
        <Text style={[styles.todayPercent, { color: todayGain >= 0 ? theme.colors.green : theme.colors.red }]}>
          {todayGainPercent >= 0 ? "+" : ""}{todayGainPercent.toFixed(2)}%
        </Text>
      </View>
    </LinearGradient>
  ) : null;

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

      {/* Manager Notes */}
      <View style={styles.notesCard}>
        <View style={styles.notesHeader}>
          <Text style={styles.notesLabel}>MANAGER NOTES</Text>
          {editingNotes ? (
            <View style={styles.notesActions}>
              <TouchableOpacity onPress={() => { setEditingNotes(false); setNotesText(client?.notes || ""); }}>
                <Text style={styles.notesCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveNotes} disabled={savingNotes}>
                {savingNotes
                  ? <ActivityIndicator size="small" color={theme.colors.accent} />
                  : <Text style={styles.notesSaveText}>Save</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => { setEditingNotes(true); setNotesText(client?.notes || ""); }}>
              <Feather name="edit-2" size={14} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        {editingNotes ? (
          <TextInput
            style={styles.notesInput}
            value={notesText}
            onChangeText={setNotesText}
            placeholder="Add private notes about this client..."
            placeholderTextColor={theme.colors.textMuted}
            multiline
            numberOfLines={3}
          />
        ) : (
          <Text style={styles.notesText}>
            {client?.notes || "No notes yet. Tap the edit icon to add notes."}
          </Text>
        )}
      </View>

      {/* Concentration Warnings */}
      {!dismissedWarnings && concentrationWarnings.length > 0 && (
        <View style={styles.warningCard}>
          <View style={styles.warningHeader}>
            <View style={styles.warningLeft}>
              <Feather name="alert-triangle" size={15} color={theme.colors.yellow} />
              <Text style={styles.warningTitle}>Concentration Alerts</Text>
            </View>
            <TouchableOpacity onPress={() => setDismissedWarnings(true)}>
              <Feather name="x" size={14} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
          {concentrationWarnings.map((w, i) => (
            <View key={i} style={styles.warningRow}>
              <Feather name="alert-circle" size={11} color={theme.colors.yellow} />
              <Text style={styles.warningText}>{w}</Text>
            </View>
          ))}
        </View>
      )}

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
                    iconColor={theme.colors.accent}
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
          {todayBanner}

          {/* Allocation Pie Charts */}
          {(assetTypeData.length > 0 || holdingsData.length > 0) && (
            <View style={styles.allocRow}>
              {assetTypeData.length > 0 && (
                <View style={[styles.card, { flex: 1, minWidth: 0, marginBottom: 16 }]}>
                  <Text style={styles.cardTitle}>By Asset Type</Text>
                  <View style={{ marginTop: 12 }}>
                    <PieChart data={assetTypeData} size={140} />
                  </View>
                </View>
              )}
              {holdingsData.length > 0 && (
                <View style={[styles.card, { flex: 1, minWidth: 0 }]}>
                  <Text style={styles.cardTitle}>By Holding</Text>
                  <View style={{ marginTop: 12 }}>
                    <PieChart data={holdingsData} size={140} />
                  </View>
                </View>
              )}
            </View>
          )}
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
                    iconColor={theme.colors.accent}
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
          {todayBanner}

          {/* Allocation Pie Charts (mobile / tablet)
              twoColPie is driven purely by the measured container width —
              no platform hooks, no dimension guessing. */}
          {(assetTypeData.length > 0 || holdingsData.length > 0) && (() => {
            const twoColPie = pieContainerWidth >= 400;
            const cardW = twoColPie ? Math.floor((pieContainerWidth - 12) / 2) : undefined;
            return (
              <View
                onLayout={e => setPieContainerWidth(e.nativeEvent.layout.width)}
                style={{ flexDirection: twoColPie ? "row" : "column", gap: 12, marginBottom: 16 }}
              >
                {assetTypeData.length > 0 && (
                  <View style={[styles.card, cardW ? { width: cardW } : undefined]}>
                    <Text style={styles.cardTitle}>By Asset Type</Text>
                    <View style={{ marginTop: 12 }}>
                      <PieChart data={assetTypeData} size={twoColPie ? 110 : undefined} />
                    </View>
                  </View>
                )}
                {holdingsData.length > 0 && (
                  <View style={[styles.card, cardW ? { width: cardW } : undefined]}>
                    <Text style={styles.cardTitle}>By Holding</Text>
                    <View style={{ marginTop: 12 }}>
                      <PieChart data={holdingsData} size={twoColPie ? 110 : undefined} />
                    </View>
                  </View>
                )}
              </View>
            );
          })()}
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

      <CreatePriceAlertModal
        visible={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        defaultSymbol={alertDefaultSymbol}
      />
    </>
  );

  if (isWide) {
    // WebShell provides the ScrollView. On native, flex:1 inside a ScrollView
    // contentContainer collapses to 0 height — use no flex so content sizes naturally.
    return <View>{content}</View>;
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
  cardTitle: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  allocRow: {
    flexDirection: "row",
    flex: 1,
    gap: 16,
    marginBottom: 16,
    alignItems: "flex-start",
  },
  // Manager notes card
  notesCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 14,
  },
  notesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  notesLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  notesActions: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  notesCancelText: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  notesSaveText: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
  notesInput: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    lineHeight: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 64,
    textAlignVertical: "top",
  },
  notesText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  // Concentration warnings card
  warningCard: {
    backgroundColor: `${theme.colors.yellow}10`,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: `${theme.colors.yellow}30`,
    marginBottom: 14,
  },
  warningHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  warningLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  warningTitle: {
    color: theme.colors.yellow,
    fontSize: 13,
    fontWeight: "600",
  },
  warningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  warningText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  sortLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  sortChip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sortChipActive: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accent,
  },
  sortChipText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: "500",
  },
  sortChipTextActive: {
    color: theme.colors.accent,
    fontWeight: "600",
  },
  todayCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  todayLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  todayLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  todayHint: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 10,
    marginTop: 2,
  },
  todayRight: {
    alignItems: "flex-end",
  },
  todayAmount: {
    fontSize: 18,
    fontWeight: "800",
  },
  todayPercent: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
});
