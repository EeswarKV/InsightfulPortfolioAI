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
import { useThemeColors, useThemedStyles } from "../../lib/useAppTheme";
import type { ThemeColors } from "../../lib/themes";
import {
  fetchMarketMovers,
  type MarketMover,
  type MoverCategory,
} from "../../lib/globalMarketApi";
import { useIsWebWide } from "../../lib/platform";

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

function makeStyles(t: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
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
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      color: t.textPrimary,
      fontSize: 20,
      fontWeight: "700",
      letterSpacing: -0.5,
    },
    subtitle: {
      color: t.textMuted,
      fontSize: 12,
      marginTop: 3,
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
      borderColor: t.border,
      backgroundColor: t.card,
    },
    tabLabel: {
      color: t.textMuted,
      fontSize: 12,
      fontWeight: "600",
    },
    table: {
      backgroundColor: t.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.border,
      overflow: "hidden",
    },
    colHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: t.card,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
      gap: 8,
    },
    colLabel: {
      color: t.textMuted,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.6,
    },
    listRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 13,
      gap: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border,
    },
    rankText: {
      color: t.textMuted,
      fontSize: 12,
      fontWeight: "600",
      width: 20,
      textAlign: "center",
    },
    symbolText: {
      color: t.textPrimary,
      fontSize: 14,
      fontWeight: "700",
      letterSpacing: -0.2,
    },
    volText: {
      color: t.textMuted,
      fontSize: 11,
      marginTop: 2,
    },
    priceText: {
      color: t.textPrimary,
      fontSize: 14,
      fontWeight: "600",
      width: 90,
      textAlign: "right",
      letterSpacing: -0.2,
    },
    changeBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 7,
      paddingVertical: 4,
      borderRadius: 6,
      width: 72,
      justifyContent: "center",
    },
    changeText: {
      fontSize: 12,
      fontWeight: "700",
    },
    errorBox: {
      alignItems: "center",
      paddingVertical: 48,
      gap: 12,
    },
    errorText: {
      color: t.textMuted,
      fontSize: 14,
      textAlign: "center",
      maxWidth: 260,
    },
    retryBtn: {
      paddingHorizontal: 20,
      paddingVertical: 9,
      borderRadius: 10,
      backgroundColor: t.accent,
    },
    retryText: { color: "#fff", fontSize: 14, fontWeight: "600" },
    emptyText: {
      color: t.textMuted,
      fontSize: 14,
      textAlign: "center",
      padding: 32,
    },
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
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();

  const TABS: {
    key: MoverCategory;
    label: string;
    icon: keyof typeof Feather.glyphMap;
    color: string;
  }[] = [
    { key: "gainers", label: "Top Gainers", icon: "trending-up", color: colors.green },
    { key: "losers", label: "Top Losers", icon: "trending-down", color: colors.red },
    { key: "trending", label: "Trending", icon: "activity", color: colors.accent },
  ];

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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>NSE Market Movers</Text>
          <Text style={styles.subtitle}>Live top movers · NSE</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, active && { borderColor: tab.color, backgroundColor: `${tab.color}15` }]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Feather name={tab.icon} size={13} color={active ? tab.color : colors.textMuted} />
              <Text style={[styles.tabLabel, active && { color: tab.color, fontWeight: "700" }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 48 }} />
      ) : error ? (
        <View style={styles.errorBox}>
          <Feather name="alert-circle" size={28} color={colors.red} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadTab(activeTab, true)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : currentData.length === 0 ? (
        <Text style={styles.emptyText}>No data available</Text>
      ) : (
        <View style={styles.table}>
          <View style={styles.colHeader}>
            <Text style={[styles.colLabel, { width: 28 }]}>#</Text>
            <Text style={[styles.colLabel, { flex: 1 }]}>SYMBOL</Text>
            <Text style={[styles.colLabel, { width: 90, textAlign: "right" }]}>PRICE</Text>
            <Text style={[styles.colLabel, { width: 72, textAlign: "right" }]}>CHANGE</Text>
          </View>

          {currentData.map((item, idx) => {
            const isPos = item.changePercent >= 0;
            const pctColor =
              activeTab === "trending"
                ? isPos ? colors.green : colors.red
                : activeTab === "gainers"
                ? colors.green
                : colors.red;

            return (
              <View key={item.symbol} style={styles.listRow}>
                <Text style={styles.rankText}>{idx + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.symbolText}>{item.symbol}</Text>
                  <Text style={styles.volText}>Vol {formatVolume(item.volume)}</Text>
                </View>
                <Text style={styles.priceText}>₹{formatPrice(item.ltp)}</Text>
                <View style={[styles.changeBadge, { backgroundColor: `${pctColor}18` }]}>
                  <Feather
                    name={item.changePercent >= 0 ? "arrow-up" : "arrow-down"}
                    size={10}
                    color={pctColor}
                  />
                  <Text style={[styles.changeText, { color: pctColor }]}>
                    {Math.abs(item.changePercent).toFixed(2)}%
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </>
  );

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => loadTab(activeTab, true)}
      tintColor={colors.accent}
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
