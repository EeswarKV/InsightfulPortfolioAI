import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../../lib/theme";
import { useIsWebWide } from "../../lib/platform";
import { ScreenContainer } from "../../components/layout";
import { searchStocks, type SearchResult } from "../../lib/researchApi";
import { fetchLivePrices } from "../../lib/marketData";
import {
  loadWatchlists,
  createWatchlist,
  deleteWatchlist,
  renameWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  type Watchlist,
} from "../../store/slices/watchlistSlice";
import type { AppDispatch, RootState } from "../../store";

// Deterministic color per ticker symbol
const ICON_COLORS = [
  ["#6366F1", "#818CF8"],
  ["#0EA5E9", "#38BDF8"],
  ["#10B981", "#34D399"],
  ["#F59E0B", "#FCD34D"],
  ["#EF4444", "#F87171"],
  ["#8B5CF6", "#A78BFA"],
  ["#EC4899", "#F472B6"],
  ["#14B8A6", "#2DD4BF"],
];

function symbolColors(symbol: string): [string, string] {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) & 0xffff;
  return ICON_COLORS[h % ICON_COLORS.length];
}

function formatPrice(p: number) {
  if (p >= 1000) return p.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return p.toFixed(2);
}

export default function WatchlistScreen() {
  const isWide = useIsWebWide();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { watchlists, loaded } = useSelector((s: RootState) => s.watchlists);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [newListName, setNewListName] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [livePrices, setLivePrices] = useState<Map<string, { price: number; change: number; changePercent: number }>>(new Map());
  const [loadingPrices, setLoadingPrices] = useState(false);

  useEffect(() => {
    if (!loaded) dispatch(loadWatchlists());
  }, [loaded, dispatch]);

  useEffect(() => {
    if (watchlists.length > 0 && !activeId) {
      setActiveId(watchlists[0].id);
    }
  }, [watchlists, activeId]);

  const activeList = watchlists.find((w) => w.id === activeId) ?? null;

  const refreshPrices = useCallback(() => {
    if (!activeList || activeList.items.length === 0) {
      setLivePrices(new Map());
      return;
    }
    setLoadingPrices(true);
    fetchLivePrices(activeList.items.map((i) => i.symbol))
      .then((map) => setLivePrices(map))
      .catch(() => {})
      .finally(() => setLoadingPrices(false));
  }, [activeId, activeList?.items.map((i) => i.symbol).join(",")]);

  useEffect(() => {
    refreshPrices();
  }, [refreshPrices]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchStocks(searchQuery);
        setSearchResults(results.slice(0, 8));
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const handleCreateList = () => {
    const name = newListName.trim();
    if (!name) return;
    dispatch(createWatchlist({ name }));
    setNewListName("");
    setShowNewForm(false);
  };

  const handleDeleteList = (w: Watchlist) => {
    const doDelete = () => {
      dispatch(deleteWatchlist(w.id));
      if (activeId === w.id) setActiveId(watchlists.find((x) => x.id !== w.id)?.id ?? null);
    };
    if (Platform.OS === "web") {
      if ((window as any).confirm(`Delete watchlist "${w.name}"?`)) doDelete();
    } else {
      Alert.alert("Delete Watchlist", `Delete "${w.name}"?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  const handleAddSymbol = (result: SearchResult) => {
    if (!activeId) return;
    dispatch(addToWatchlist({
      watchlistId: activeId,
      item: { symbol: String(result.symbol), name: result.name, addedAt: new Date().toISOString() },
    }));
    setSearchQuery("");
    setSearchResults([]);
    setShowSearch(false);
  };

  const handleRemoveSymbol = (symbol: string) => {
    if (!activeId) return;
    dispatch(removeFromWatchlist({ watchlistId: activeId, symbol }));
  };

  const handleCommitRename = () => {
    if (renameId && renameText.trim()) {
      dispatch(renameWatchlist({ id: renameId, name: renameText.trim() }));
    }
    setRenameId(null);
    setRenameText("");
  };

  if (!loaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} size="large" />
      </View>
    );
  }

  // ── Sidebar ─────────────────────────────────────────────────────────────
  const sidebar = (
    <View style={styles.sidebar}>
      <View style={styles.sidebarHeader}>
        <Text style={styles.sidebarTitle}>WATCHLISTS</Text>
        <TouchableOpacity style={styles.newBtn} onPress={() => setShowNewForm((v) => !v)}>
          <Feather name="plus" size={14} color={theme.colors.accent} />
        </TouchableOpacity>
      </View>

      {showNewForm && (
        <View style={styles.newForm}>
          <TextInput
            style={styles.newInput}
            value={newListName}
            onChangeText={setNewListName}
            placeholder="List name…"
            placeholderTextColor={theme.colors.textMuted}
            autoFocus
            onSubmitEditing={handleCreateList}
          />
          <View style={{ flexDirection: "row", gap: 6 }}>
            <TouchableOpacity style={[styles.formBtn, { flex: 1 }]} onPress={handleCreateList}>
              <Text style={styles.formBtnText}>Create</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.formBtn, styles.formBtnCancel]}
              onPress={() => { setShowNewForm(false); setNewListName(""); }}
            >
              <Text style={[styles.formBtnText, { color: theme.colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {watchlists.length === 0 ? (
        <View style={styles.sidebarEmpty}>
          <Feather name="bookmark" size={20} color={theme.colors.textMuted} />
          <Text style={styles.sidebarEmptyText}>No lists yet</Text>
        </View>
      ) : (
        watchlists.map((w) => {
          const isActive = activeId === w.id;
          return (
            <View key={w.id} style={[styles.listItem, isActive && styles.listItemActive]}>
              {isActive && <View style={styles.listItemBar} />}
              {renameId === w.id ? (
                <TextInput
                  style={styles.renameInput}
                  value={renameText}
                  onChangeText={setRenameText}
                  autoFocus
                  onSubmitEditing={handleCommitRename}
                  onBlur={handleCommitRename}
                />
              ) : (
                <TouchableOpacity style={{ flex: 1 }} onPress={() => setActiveId(w.id)}>
                  <Text style={[styles.listItemText, isActive && styles.listItemTextActive]} numberOfLines={1}>
                    {w.name}
                  </Text>
                  <Text style={styles.listItemCount}>{w.items.length} symbol{w.items.length !== 1 ? "s" : ""}</Text>
                </TouchableOpacity>
              )}
              <View style={styles.listItemActions}>
                <TouchableOpacity
                  onPress={() => { setRenameId(w.id); setRenameText(w.name); }}
                  style={styles.iconBtn}
                >
                  <Feather name="edit-2" size={11} color={theme.colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteList(w)} style={styles.iconBtn}>
                  <Feather name="trash-2" size={11} color={theme.colors.red} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </View>
  );

  // ── Detail panel ─────────────────────────────────────────────────────────
  const totalValue = activeList
    ? activeList.items.reduce((sum, item) => sum + (livePrices.get(item.symbol)?.price ?? 0), 0)
    : 0;

  const detail = (
    <View style={styles.detail}>
      {!activeList ? (
        <View style={styles.center}>
          <Feather name="bar-chart-2" size={44} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>Select a watchlist</Text>
          <Text style={styles.emptyText}>Or create one using the + button</Text>
        </View>
      ) : (
        <>
          {/* Header */}
          <View style={styles.detailHeader}>
            <View>
              <Text style={styles.detailTitle}>{activeList.name}</Text>
              {totalValue > 0 && (
                <Text style={styles.detailSubtitle}>
                  {activeList.items.length} symbols · ₹{formatPrice(totalValue)} tracked
                </Text>
              )}
            </View>
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <TouchableOpacity style={styles.refreshBtn} onPress={refreshPrices} disabled={loadingPrices}>
                {loadingPrices
                  ? <ActivityIndicator size="small" color={theme.colors.accent} />
                  : <Feather name="refresh-cw" size={14} color={theme.colors.accent} />
                }
              </TouchableOpacity>
              <TouchableOpacity style={styles.addSymbolBtn} onPress={() => setShowSearch((v) => !v)}>
                <Feather name="plus" size={14} color="#fff" />
                <Text style={styles.addSymbolText}>Add Symbol</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Search box */}
          {showSearch && (
            <View style={styles.searchBox}>
              <View style={styles.searchRow}>
                <Feather name="search" size={14} color={theme.colors.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search stocks, ETFs, mutual funds…"
                  placeholderTextColor={theme.colors.textMuted}
                  autoFocus
                />
                {searching && <ActivityIndicator size="small" color={theme.colors.accent} />}
                <TouchableOpacity onPress={() => { setShowSearch(false); setSearchQuery(""); setSearchResults([]); }}>
                  <Feather name="x" size={14} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>
              {searchResults.length > 0 && (
                <View style={styles.searchDropdown}>
                  {searchResults.map((r, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.searchResult, i === searchResults.length - 1 && { borderBottomWidth: 0 }]}
                      onPress={() => handleAddSymbol(r)}
                    >
                      <View style={styles.searchResultIcon}>
                        <Text style={styles.searchResultIconText}>{String(r.symbol).slice(0, 1)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.resultSym}>{r.symbol}</Text>
                        <Text style={styles.resultName} numberOfLines={1}>{r.name}</Text>
                      </View>
                      <View style={styles.resultExchangePill}>
                        <Text style={styles.resultExchangeText}>{r.exchange}</Text>
                      </View>
                      <Feather name="plus" size={14} color={theme.colors.accent} style={{ marginLeft: 8 }} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Column headers */}
          {activeList.items.length > 0 && (
            <View style={styles.tableHeader}>
              <Text style={[styles.colHead, { flex: 1 }]}>SYMBOL</Text>
              <Text style={[styles.colHead, styles.colRight, { width: isWide ? 90 : 80 }]}>LTP</Text>
              {isWide && <Text style={[styles.colHead, styles.colRight, { width: 70 }]}>CHNG</Text>}
              <Text style={[styles.colHead, styles.colRight, { width: 72 }]}>% CHNG</Text>
              <View style={{ width: 28 }} />
            </View>
          )}

          {/* Symbol rows */}
          {activeList.items.length === 0 ? (
            <View style={styles.center}>
              <View style={styles.emptyIconWrap}>
                <Feather name="star" size={28} color={theme.colors.accent} />
              </View>
              <Text style={styles.emptyTitle}>Nothing here yet</Text>
              <Text style={styles.emptyText}>Tap "Add Symbol" to start tracking stocks</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {activeList.items.map((item, idx) => {
                const lp = livePrices.get(item.symbol);
                const isUp = lp ? lp.change >= 0 : null;
                const ticker = item.symbol.replace(/\.(NS|BO)$/, "");
                const [c1, c2] = symbolColors(item.symbol);
                const isLast = idx === activeList.items.length - 1;
                return (
                  <TouchableOpacity
                    key={item.symbol}
                    style={[styles.symbolRow, isLast && styles.symbolRowLast]}
                    activeOpacity={0.6}
                    onPress={() => router.push(`/(manager)/research?symbol=${encodeURIComponent(item.symbol)}` as any)}
                  >
                    {/* Symbol + name */}
                    <View style={styles.symbolLeft}>
                      <LinearGradient colors={[c1, c2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.symbolIcon}>
                        <Text style={styles.symbolIconText}>{ticker.slice(0, 2)}</Text>
                      </LinearGradient>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.symbolTicker}>{ticker}</Text>
                        <Text style={styles.symbolFullName} numberOfLines={1}>{item.name}</Text>
                      </View>
                    </View>

                    {/* LTP */}
                    <Text style={[styles.colVal, { width: isWide ? 90 : 80 }]}>
                      {loadingPrices && !lp
                        ? "—"
                        : lp ? `₹${formatPrice(lp.price)}` : "—"}
                    </Text>

                    {/* Absolute change — wide screens only */}
                    {isWide && (
                      <Text style={[
                        styles.colVal,
                        { width: 70 },
                        lp && (isUp ? styles.textUp : styles.textDown),
                      ]}>
                        {lp ? `${isUp ? "+" : ""}${lp.change.toFixed(2)}` : "—"}
                      </Text>
                    )}

                    {/* % change pill */}
                    <View style={{ width: 72, alignItems: "flex-end" }}>
                      {lp ? (
                        <View style={[styles.changePill, isUp ? styles.pillUp : styles.pillDown]}>
                          <Text style={[styles.pillText, isUp ? styles.textUp : styles.textDown]}>
                            {isUp ? "▲" : "▼"} {Math.abs(lp.changePercent).toFixed(2)}%
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.colVal}>—</Text>
                      )}
                    </View>

                    {/* Remove */}
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation(); handleRemoveSymbol(item.symbol); }}
                      style={styles.removeBtn}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Feather name="x" size={13} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </>
      )}
    </View>
  );

  // ── Mobile tabs ──────────────────────────────────────────────────────────
  const mobileTabs = (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mobileTabsScroll}>
        <View style={styles.mobileTabs}>
          {watchlists.map((w) => (
            <TouchableOpacity
              key={w.id}
              style={[styles.mobileTab, activeId === w.id && styles.mobileTabActive]}
              onPress={() => setActiveId(w.id)}
            >
              <Text style={[styles.mobileTabText, activeId === w.id && styles.mobileTabTextActive]}>
                {w.name}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.mobileNewTab} onPress={() => setShowNewForm((v) => !v)}>
            <Feather name="plus" size={13} color={theme.colors.accent} />
          </TouchableOpacity>
        </View>
      </ScrollView>
      {showNewForm && (
        <View style={styles.newForm}>
          <TextInput
            style={styles.newInput}
            value={newListName}
            onChangeText={setNewListName}
            placeholder="List name…"
            placeholderTextColor={theme.colors.textMuted}
            autoFocus
            onSubmitEditing={handleCreateList}
          />
          <View style={{ flexDirection: "row", gap: 6 }}>
            <TouchableOpacity style={[styles.formBtn, { flex: 1 }]} onPress={handleCreateList}>
              <Text style={styles.formBtnText}>Create</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.formBtn, styles.formBtnCancel]} onPress={() => { setShowNewForm(false); setNewListName(""); }}>
              <Text style={[styles.formBtnText, { color: theme.colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
  );

  const content = (
    <View style={[styles.container, isWide && styles.containerWide]}>
      {isWide ? (
        <>
          {sidebar}
          {detail}
        </>
      ) : (
        <>
          {mobileTabs}
          {detail}
        </>
      )}
    </View>
  );

  if (isWide) return <View style={{ flex: 1 }}>{content}</View>;
  return <ScreenContainer>{content}</ScreenContainer>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 32 },
  container: { flex: 1 },
  containerWide: { flexDirection: "row" },

  // ── Sidebar ──────────────────────────────────────────────────────────────
  sidebar: {
    width: 210,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
    paddingTop: 8,
  },
  sidebarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: 6,
  },
  sidebarTitle: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  newBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sidebarEmpty: { alignItems: "center", paddingTop: 32, gap: 6 },
  sidebarEmptyText: { color: theme.colors.textMuted, fontSize: 12 },

  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingRight: 8,
    paddingLeft: 16,
    borderRadius: 0,
    marginBottom: 1,
    position: "relative",
  },
  listItemActive: { backgroundColor: theme.colors.accentSoft },
  listItemBar: {
    position: "absolute",
    left: 0,
    top: 4,
    bottom: 4,
    width: 3,
    borderRadius: 2,
    backgroundColor: theme.colors.accent,
  },
  listItemText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: "500" },
  listItemTextActive: { color: theme.colors.textPrimary, fontWeight: "600" },
  listItemCount: { color: theme.colors.textMuted, fontSize: 10, marginTop: 1 },
  listItemActions: { flexDirection: "row", gap: 0 },
  iconBtn: { padding: 5, borderRadius: 4 },
  renameInput: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 13,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.accent,
    paddingVertical: 2,
  },

  // Create form
  newForm: {
    margin: 12,
    backgroundColor: theme.colors.card,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    gap: 8,
  },
  newInput: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  formBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  formBtnCancel: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  formBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  // ── Detail panel ─────────────────────────────────────────────────────────
  detail: { flex: 1, paddingTop: 0 },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  detailTitle: { color: theme.colors.textPrimary, fontSize: 17, fontWeight: "700" },
  detailSubtitle: { color: theme.colors.textMuted, fontSize: 11, marginTop: 2 },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
  },
  addSymbolBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: theme.colors.accent,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  addSymbolText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  // Search
  searchBox: {
    margin: 12,
    marginBottom: 0,
    backgroundColor: theme.colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    overflow: "hidden",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 13,
  },
  searchDropdown: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  searchResult: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 10,
  },
  searchResultIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: theme.colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  searchResultIconText: { color: theme.colors.accent, fontSize: 12, fontWeight: "700" },
  resultSym: { color: theme.colors.textPrimary, fontSize: 13, fontWeight: "700" },
  resultName: { color: theme.colors.textMuted, fontSize: 11, marginTop: 1 },
  resultExchangePill: {
    backgroundColor: theme.colors.surface,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  resultExchangeText: { color: theme.colors.textMuted, fontSize: 9, fontWeight: "600", letterSpacing: 0.5 },

  // Table
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginTop: 12,
  },
  colHead: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  colRight: { textAlign: "right" },
  colVal: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: "500",
    textAlign: "right",
  },
  textUp: { color: theme.colors.green },
  textDown: { color: theme.colors.red },

  symbolRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  symbolRowLast: { borderBottomWidth: 0 },
  symbolLeft: { flexDirection: "row", alignItems: "center", gap: 11, flex: 1 },
  symbolIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  symbolIconText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  symbolTicker: { color: theme.colors.textPrimary, fontSize: 13, fontWeight: "700" },
  symbolFullName: { color: theme.colors.textMuted, fontSize: 10, marginTop: 1 },
  changePill: {
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  pillUp: { backgroundColor: theme.colors.greenSoft },
  pillDown: { backgroundColor: theme.colors.redSoft },
  pillText: { fontSize: 11, fontWeight: "700" },
  removeBtn: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },

  // Empty state
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: theme.colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: "600" },
  emptyText: { color: theme.colors.textMuted, fontSize: 13, textAlign: "center", lineHeight: 19 },

  // Mobile tabs
  mobileTabsScroll: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  mobileTabs: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  mobileTab: {
    paddingVertical: 5,
    paddingHorizontal: 13,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  mobileTabActive: { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accent },
  mobileTabText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "500" },
  mobileTabTextActive: { color: theme.colors.accent, fontWeight: "700" },
  mobileNewTab: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
});
