import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { theme } from "../../lib/theme";
import {
  fetchMarketMovers,
  type MarketMover,
  type MoverCategory,
} from "../../lib/globalMarketApi";
import { useIsWebWide } from "../../lib/platform";

const TABS: {
  key: MoverCategory;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
}[] = [
  { key: "gainers", label: "Top Gainers", icon: "trending-up", color: theme.colors.green },
  { key: "losers", label: "Top Losers", icon: "trending-down", color: theme.colors.red },
  { key: "trending", label: "Trending", icon: "activity", color: theme.colors.accent },
];

function formatVolume(vol: number): string {
  if (vol >= 10_000_000) return `${(vol / 10_000_000).toFixed(1)}Cr`;
  if (vol >= 100_000) return `${(vol / 100_000).toFixed(1)}L`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(1)}K`;
  return String(vol);
}

function formatPrice(price: number): string {
  return price.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function MarketsScreen() {
  const router = useRouter();
  const isWide = useIsWebWide();
  const [activeTab, setActiveTab] = useState<MoverCategory>("gainers");
  const [cache, setCache] = useState<Partial<Record<MoverCategory, MarketMover[]>>>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTab = useCallback(
    async (cat: MoverCategory, force = false) => {
      if (cache[cat] && !force) return;
      force ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        const result = await fetchMarketMovers(cat);
        setCache((prev) => ({ ...prev, [cat]: result }));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load market data");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [cache]
  );

  useEffect(() => {
    loadTab(activeTab);
  }, [activeTab]);

  const currentData = cache[activeTab] ?? [];

  const content = (
    <>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>NSE Market Movers</Text>
          <Text style={styles.subtitle}>Live top movers · NSE</Text>
        </View>
      </View>

      {/* Tab buttons */}
      <View style={styles.tabs}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, active && { borderColor: tab.color, backgroundColor: `${tab.color}12` }]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Feather
                name={tab.icon}
                size={13}
                color={active ? tab.color : theme.colors.textMuted}
              />
              <Text style={[styles.tabLabel, active && { color: tab.color, fontWeight: "700" }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Body */}
      {loading ? (
        <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 48 }} />
      ) : error ? (
        <View style={styles.errorBox}>
          <Feather name="alert-circle" size={28} color={theme.colors.red} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadTab(activeTab, true)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {currentData.length === 0 ? (
            <Text style={styles.emptyText}>No data available</Text>
          ) : (
            currentData.map((item, idx) => {
              const isPos = item.changePercent >= 0;
              const pctColor =
                activeTab === "trending"
                  ? isPos ? theme.colors.green : theme.colors.red
                  : activeTab === "gainers"
                  ? theme.colors.green
                  : theme.colors.red;
              const isLast = idx === currentData.length - 1;

              return (
                <View
                  key={item.symbol}
                  style={[styles.row, !isLast && styles.rowDivider]}
                >
                  {/* Colored left accent bar */}
                  <View style={[styles.accentBar, { backgroundColor: pctColor }]} />

                  {/* Rank */}
                  <Text style={styles.rank}>{idx + 1}</Text>

                  {/* Symbol + volume */}
                  <View style={styles.symbolBlock}>
                    <Text style={styles.symbol}>{item.symbol}</Text>
                    <Text style={styles.volText}>Vol {formatVolume(item.volume)}</Text>
                  </View>

                  {/* Price + change pill */}
                  <View style={styles.rowRight}>
                    <Text style={styles.price}>₹{formatPrice(item.ltp)}</Text>
                    <View style={[styles.pill, { backgroundColor: `${pctColor}18` }]}>
                      <Feather
                        name={item.changePercent >= 0 ? "arrow-up" : "arrow-down"}
                        size={10}
                        color={pctColor}
                      />
                      <Text style={[styles.pillText, { color: pctColor }]}>
                        {Math.abs(item.changePercent).toFixed(2)}%
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}
    </>
  );

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => loadTab(activeTab, true)}
      tintColor={theme.colors.accent}
    />
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={isWide ? styles.webContent : styles.mobileContent}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        {content}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  scroll: { flex: 1 },
  mobileContent: { padding: 16, paddingTop: 20 },
  webContent: { padding: 24, maxWidth: 760, alignSelf: "center", width: "100%" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 3,
    letterSpacing: 0.1,
  },

  tabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  tabLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },

  listContainer: {
    backgroundColor: theme.colors.surfaceHover,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingRight: 16,
    gap: 12,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  accentBar: {
    width: 3,
    height: 38,
    borderRadius: 2,
    marginLeft: 12,
    flexShrink: 0,
  },
  symbolBlock: {
    flex: 1,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  rank: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    width: 20,
    textAlign: "center",
  },
  symbol: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  volText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.1,
  },
  rowRight: {
    alignItems: "flex-end",
    gap: 5,
  },
  price: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
  },

  errorBox: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 12,
  },
  errorText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    maxWidth: 260,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: theme.colors.accent,
  },
  retryText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    padding: 32,
  },
});
