import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { Feather } from "@expo/vector-icons";
import { theme } from "../../lib/theme";
import { useIsWebWide } from "../../lib/platform";
import { ScreenContainer } from "../../components/layout";
import { SearchInput } from "../../components/ui";
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

  // Auto-select first watchlist
  useEffect(() => {
    if (watchlists.length > 0 && !activeId) {
      setActiveId(watchlists[0].id);
    }
  }, [watchlists, activeId]);

  const activeList = watchlists.find((w) => w.id === activeId) ?? null;

  // Fetch live prices whenever the active watchlist's symbols change
  useEffect(() => {
    if (!activeList || activeList.items.length === 0) {
      setLivePrices(new Map());
      return;
    }
    let cancelled = false;
    setLoadingPrices(true);
    fetchLivePrices(activeList.items.map((i) => i.symbol))
      .then((map) => {
        if (!cancelled) setLivePrices(map);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingPrices(false); });
    return () => { cancelled = true; };
  }, [activeId, activeList?.items.map((i) => i.symbol).join(",")]);


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

  const handleStartRename = (w: Watchlist) => {
    setRenameId(w.id);
    setRenameText(w.name);
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
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  const sidebar = (
    <View style={styles.sidebar}>
      <View style={styles.sidebarHeader}>
        <Text style={styles.sidebarTitle}>Watchlists</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => setShowNewForm((v) => !v)}
        >
          <Feather name="plus" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      {showNewForm && (
        <View style={styles.newForm}>
          <TextInput
            style={styles.newInput}
            value={newListName}
            onChangeText={setNewListName}
            placeholder="Watchlist name…"
            placeholderTextColor={theme.colors.textMuted}
            autoFocus
            onSubmitEditing={handleCreateList}
          />
          <TouchableOpacity style={styles.newConfirmBtn} onPress={handleCreateList}>
            <Text style={styles.newConfirmText}>Create</Text>
          </TouchableOpacity>
        </View>
      )}

      {watchlists.length === 0 ? (
        <Text style={styles.emptyHint}>No watchlists yet. Tap + to create one.</Text>
      ) : (
        watchlists.map((w) => (
          <View key={w.id} style={[styles.listItem, activeId === w.id && styles.listItemActive]}>
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
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => setActiveId(w.id)}
              >
                <Text style={[styles.listItemText, activeId === w.id && styles.listItemTextActive]}>
                  {w.name}
                </Text>
                <Text style={styles.listItemCount}>{w.items.length} symbol{w.items.length !== 1 ? "s" : ""}</Text>
              </TouchableOpacity>
            )}
            <View style={styles.listItemActions}>
              <TouchableOpacity onPress={() => handleStartRename(w)} style={styles.iconBtn}>
                <Feather name="edit-2" size={13} color={theme.colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteList(w)} style={styles.iconBtn}>
                <Feather name="trash-2" size={13} color={theme.colors.red} />
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </View>
  );

  const detail = (
    <View style={styles.detail}>
      {!activeList ? (
        <View style={styles.center}>
          <Feather name="bookmark" size={40} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>Select a watchlist</Text>
          <Text style={styles.emptyText}>Or create one using the + button</Text>
        </View>
      ) : (
        <>
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle}>{activeList.name}</Text>
            <TouchableOpacity
              style={styles.addSymbolBtn}
              onPress={() => setShowSearch((v) => !v)}
            >
              <Feather name="plus" size={14} color="#fff" />
              <Text style={styles.addSymbolText}>Add Symbol</Text>
            </TouchableOpacity>
          </View>

          {showSearch && (
            <View style={styles.searchBox}>
              <SearchInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search stocks…"
              />
              {searching && (
                <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 8 }} />
              )}
              {searchResults.map((r, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.searchResult}
                  onPress={() => handleAddSymbol(r)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultName} numberOfLines={1}>{r.name}</Text>
                    <Text style={styles.resultSym}>{r.symbol} · {r.exchange}</Text>
                  </View>
                  <Feather name="plus-circle" size={16} color={theme.colors.accent} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {activeList.items.length === 0 ? (
            <View style={styles.center}>
              <Feather name="star" size={32} color={theme.colors.textMuted} />
              <Text style={styles.emptyTitle}>No symbols yet</Text>
              <Text style={styles.emptyText}>Tap "Add Symbol" to track stocks</Text>
            </View>
          ) : (
            activeList.items.map((item) => {
              const lp = livePrices.get(item.symbol);
              const isUp = lp ? lp.change >= 0 : null;
              return (
                <TouchableOpacity
                  key={item.symbol}
                  style={styles.symbolRow}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/(manager)/research?symbol=${encodeURIComponent(item.symbol)}` as any)}
                >
                  <View style={styles.symbolLeft}>
                    <View style={styles.symbolIcon}>
                      <Text style={styles.symbolIconText}>{item.symbol.slice(0, 2)}</Text>
                    </View>
                    <View>
                      <Text style={styles.symbolName}>{item.symbol.replace(/\.(NS|BO)$/, "")}</Text>
                      <Text style={styles.symbolFullName} numberOfLines={1}>{item.name}</Text>
                    </View>
                  </View>
                  <View style={styles.symbolRight}>
                    {loadingPrices && !lp ? (
                      <ActivityIndicator size="small" color={theme.colors.accent} />
                    ) : lp ? (
                      <View style={styles.priceBlock}>
                        <Text style={styles.priceText}>₹{lp.price.toFixed(2)}</Text>
                        <Text style={[styles.changeText, isUp ? styles.changeUp : styles.changeDown]}>
                          {isUp ? "▲" : "▼"} {Math.abs(lp.changePercent).toFixed(2)}%
                        </Text>
                      </View>
                    ) : null}
                    <TouchableOpacity
                      onPress={(e) => { e.stopPropagation(); handleRemoveSymbol(item.symbol); }}
                      style={styles.removeBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather name="x" size={14} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </>
      )}
    </View>
  );

  const content = (
    <View style={[styles.container, isWide && styles.containerWide]}>
      {!isWide && <Text style={styles.pageTitle}>Watchlists</Text>}
      {isWide ? (
        <>
          {sidebar}
          {detail}
        </>
      ) : (
        <>
          {/* Mobile: horizontal scrollable watchlist tabs */}
          <View style={styles.mobileTabs}>
            <TouchableOpacity
              style={styles.mobileNewBtn}
              onPress={() => setShowNewForm((v) => !v)}
            >
              <Feather name="plus" size={14} color={theme.colors.accent} />
            </TouchableOpacity>
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
          </View>
          {showNewForm && (
            <View style={styles.newForm}>
              <TextInput
                style={styles.newInput}
                value={newListName}
                onChangeText={setNewListName}
                placeholder="Watchlist name…"
                placeholderTextColor={theme.colors.textMuted}
                autoFocus
                onSubmitEditing={handleCreateList}
              />
              <TouchableOpacity style={styles.newConfirmBtn} onPress={handleCreateList}>
                <Text style={styles.newConfirmText}>Create</Text>
              </TouchableOpacity>
            </View>
          )}
          {detail}
        </>
      )}
    </View>
  );

  if (isWide) return <View style={{ flex: 1 }}>{content}</View>;
  return <ScreenContainer>{content}</ScreenContainer>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 32 },
  container: { flex: 1 },
  containerWide: { flexDirection: "row", gap: 0 },
  pageTitle: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
  },
  // Sidebar (web)
  sidebar: {
    width: 220,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  sidebarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sidebarTitle: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  newBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: 8,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  newForm: {
    backgroundColor: theme.colors.card,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    marginBottom: 10,
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
  newConfirmBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  newConfirmText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  emptyHint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 18,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 2,
  },
  listItemActive: { backgroundColor: theme.colors.accentSoft },
  listItemText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: "500" },
  listItemTextActive: { color: theme.colors.accent, fontWeight: "600" },
  listItemCount: { color: theme.colors.textMuted, fontSize: 11, marginTop: 1 },
  listItemActions: { flexDirection: "row", gap: 2 },
  iconBtn: { padding: 4, borderRadius: 6 },
  renameInput: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 13,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.accent,
    paddingVertical: 2,
  },
  // Detail panel
  detail: { flex: 1, paddingHorizontal: 16, paddingTop: 4 },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  detailTitle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: "700" },
  addSymbolBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.accent,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  addSymbolText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  searchBox: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    marginBottom: 14,
  },
  searchResult: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 10,
  },
  resultName: { color: theme.colors.textPrimary, fontSize: 13, fontWeight: "600" },
  resultSym: { color: theme.colors.textMuted, fontSize: 11, marginTop: 1 },
  symbolRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
  },
  symbolLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  symbolRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  priceBlock: { alignItems: "flex-end" },
  priceText: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: "600" },
  changeText: { fontSize: 11, fontWeight: "500", marginTop: 2 },
  changeUp: { color: theme.colors.green },
  changeDown: { color: theme.colors.red },
  symbolIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  symbolIconText: { color: theme.colors.accent, fontSize: 12, fontWeight: "700" },
  symbolName: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: "600" },
  symbolFullName: { color: theme.colors.textMuted, fontSize: 11, marginTop: 1 },
  removeBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyTitle: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: "600" },
  emptyText: { color: theme.colors.textMuted, fontSize: 13, textAlign: "center" },
  // Mobile tabs
  mobileTabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
    alignItems: "center",
  },
  mobileNewBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  mobileTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  mobileTabActive: { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accent },
  mobileTabText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: "500" },
  mobileTabTextActive: { color: theme.colors.accent, fontWeight: "600" },
});
