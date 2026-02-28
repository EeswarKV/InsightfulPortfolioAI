import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSelector } from "react-redux";
import { Feather } from "@expo/vector-icons";
import { theme } from "../../lib/theme";
import { useIsWebWide } from "../../lib/platform";
import { ScreenContainer } from "../../components/layout";
import { PieChart, type PieSlice } from "../../components/charts";
import { formatCurrency } from "../../lib/formatters";
import { getStockSector } from "../../lib/researchApi";
import type { RootState } from "../../store";
import type { DBHolding } from "../../types";

// Module-level cache — survives tab switches and re-mounts within the session
const _sectorCache = new Map<string, string>();

const ASSET_COLORS: Record<string, string> = {
  stock: theme.colors.accent,
  etf: theme.colors.yellow,
  mutual_fund: theme.colors.green,
  crypto: theme.colors.red,
  bond: "#06b6d4",
  other: "#fb923c",
};

const PIE_COLORS = [
  theme.colors.accent, theme.colors.yellow, theme.colors.green,
  "#c084fc", "#f97316", "#06b6d4", "#f43f5e", "#84cc16",
];


export default function HoldingsOverviewScreen() {
  const router = useRouter();
  const isWide = useIsWebWide();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const { clients, portfolios, holdings } = useSelector((s: RootState) => s.portfolio);

  const [activeSection, setActiveSection] = useState<"sector" | "company" | "client">(
    tab === "company" ? "company" : tab === "client" ? "client" : "sector"
  );

  // Sector cache as React state so UI re-renders when new sectors arrive
  const [sectorCache, setSectorCache] = useState<Map<string, string>>(new Map(_sectorCache));
  const [isFetchingSectors, setIsFetchingSectors] = useState(false);

  // Flatten all holdings
  const allHoldings = useMemo<DBHolding[]>(() => {
    const all: DBHolding[] = [];
    for (const p of portfolios) {
      const ph = holdings[p.id] ?? [];
      all.push(...ph);
    }
    return all;
  }, [portfolios, holdings]);

  // Total invested (cost basis)
  const totalInvested = useMemo(() =>
    allHoldings.reduce((s, h) => s + Number(h.quantity) * Number(h.avg_cost), 0),
    [allHoldings]
  );

  // Fetch real industry sectors when the "By Sector" tab is active
  useEffect(() => {
    if (activeSection !== "sector") return;

    // Collect unique original symbols that aren't cached yet
    const origSymbols = [...new Set(
      allHoldings
        .filter(h => h.asset_type === "stock" || h.asset_type === "etf")
        .map(h => h.symbol)
        .filter(sym => !_sectorCache.has(sym))
    )];

    if (origSymbols.length === 0) return;

    // Ensure .NS suffix so yfinance can resolve Indian stocks
    const fetchSymbol = (sym: string) =>
      /\.(NS|BO|NSE|BSE)$/i.test(sym) ? sym : `${sym}.NS`;

    // Treat these as "no sector data"
    const isBlank = (s: string | null | undefined) =>
      !s || s.trim() === "" || s === "N/A" || s === "None";

    setIsFetchingSectors(true);
    Promise.allSettled(
      origSymbols.map(orig =>
        getStockSector(fetchSymbol(orig))
          .then(sector => ({ orig, sector: isBlank(sector) ? "Others" : sector }))
          .catch(() => ({ orig, sector: "Others" }))
      )
    ).then(results => {
      for (const r of results) {
        if (r.status === "fulfilled") {
          _sectorCache.set(r.value.orig, r.value.sector);
        }
      }
      setSectorCache(new Map(_sectorCache));
    }).finally(() => setIsFetchingSectors(false));
  }, [activeSection, allHoldings]);

  // --- Real Sector Map (stocks and ETFs only) ---
  const realSectorMap = useMemo(() => {
    const map = new Map<string, { value: number; count: number }>();
    for (const h of allHoldings) {
      if (h.asset_type !== "stock" && h.asset_type !== "etf") continue;
      const sector = sectorCache.get(h.symbol) ?? "Fetching...";
      const val = Number(h.quantity) * Number(h.avg_cost);
      const prev = map.get(sector) ?? { value: 0, count: 0 };
      map.set(sector, { value: prev.value + val, count: prev.count + 1 });
    }
    return map;
  }, [allHoldings, sectorCache]);

  const realSectorSorted = useMemo(() =>
    [...realSectorMap.entries()]
      .filter(([s]) => s !== "Fetching...")
      .sort(([, a], [, b]) => b.value - a.value),
    [realSectorMap]
  );

  const realSectorPie = useMemo<PieSlice[]>(() =>
    realSectorSorted.map(([name, d], i) => ({
      label: name,
      value: d.value,
      color: PIE_COLORS[i % PIE_COLORS.length],
    })),
    [realSectorSorted]
  );

  // --- By Company/Symbol ---
  const companyMap = useMemo(() => {
    const map = new Map<string, { value: number; qty: number; avgCost: number; assetType: string }>();
    for (const h of allHoldings) {
      const sym = h.symbol;
      const val = Number(h.quantity) * Number(h.avg_cost);
      const prev = map.get(sym);
      if (prev) {
        const totalQty = prev.qty + Number(h.quantity);
        map.set(sym, {
          value: prev.value + val,
          qty: totalQty,
          avgCost: (prev.value + val) / totalQty,
          assetType: h.asset_type,
        });
      } else {
        map.set(sym, {
          value: val,
          qty: Number(h.quantity),
          avgCost: Number(h.avg_cost),
          assetType: h.asset_type,
        });
      }
    }
    return map;
  }, [allHoldings]);

  const companySorted = useMemo(() =>
    [...companyMap.entries()].sort(([, a], [, b]) => b.value - a.value),
    [companyMap]
  );

  const companyPie = useMemo<PieSlice[]>(() => {
    const top = companySorted.slice(0, 8);
    const othersVal = companySorted.slice(8).reduce((s, [, d]) => s + d.value, 0);
    const slices: PieSlice[] = top.map(([sym, d], i) => ({
      label: sym.replace(/\.(NS|BO)$/, ""),
      value: d.value,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }));
    if (othersVal > 0) slices.push({ label: "Others", value: othersVal, color: "#94a3b8" });
    return slices;
  }, [companySorted]);

  // --- By Client ---
  const clientMap = useMemo(() => {
    const map = new Map<string, { name: string; email: string; value: number; holdingCount: number }>();
    for (const p of portfolios) {
      const client = clients.find((c) => c.id === p.client_id);
      if (!client) continue;
      const ph = holdings[p.id] ?? [];
      const val = ph.reduce((s, h) => s + Number(h.quantity) * Number(h.avg_cost), 0);
      const prev = map.get(client.id) ?? { name: client.full_name, email: client.email, value: 0, holdingCount: 0 };
      map.set(client.id, {
        ...prev,
        value: prev.value + val,
        holdingCount: prev.holdingCount + ph.length,
      });
    }
    return map;
  }, [portfolios, holdings, clients]);

  const clientSorted = useMemo(() =>
    [...clientMap.entries()].sort(([, a], [, b]) => b.value - a.value),
    [clientMap]
  );

  const header = (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Feather name="chevron-left" size={18} color={theme.colors.textSecondary} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle}>Holdings Overview</Text>
        <Text style={styles.headerSub}>
          {allHoldings.length} holdings · {clients.length} clients
        </Text>
      </View>
    </View>
  );

  // Summary KPIs
  const summaryRow = (
    <View style={[styles.kpiRow, isWide && styles.kpiRowWide]}>
      <View style={styles.kpiCard}>
        <Text style={styles.kpiLabel}>TOTAL INVESTED</Text>
        <Text style={styles.kpiValue}>{formatCurrency(totalInvested)}</Text>
        <Text style={styles.kpiSub}>{allHoldings.length} holdings</Text>
      </View>
      <View style={styles.kpiCard}>
        <Text style={styles.kpiLabel}>SECTORS</Text>
        <Text style={styles.kpiValue}>{realSectorSorted.length || "—"}</Text>
        <Text style={styles.kpiSub}>stocks & ETFs only</Text>
      </View>
      <View style={styles.kpiCard}>
        <Text style={styles.kpiLabel}>COMPANIES</Text>
        <Text style={styles.kpiValue}>{companyMap.size}</Text>
        <Text style={styles.kpiSub}>unique symbols</Text>
      </View>
    </View>
  );

  // Section switcher
  const sectionTabs = (
    <View style={styles.tabRow}>
      {(["sector", "company", "client"] as const).map((s) => (
        <TouchableOpacity
          key={s}
          style={[styles.tab, activeSection === s && styles.tabActive]}
          onPress={() => setActiveSection(s)}
        >
          <Text style={[styles.tabText, activeSection === s && styles.tabTextActive]}>
            {s === "sector" ? "By Sector" : s === "company" ? "By Company" : "By Client"}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Sector section — real industry sectors
  const sectorContent = (
    <View style={[styles.card, isWide && styles.cardWide]}>
      <View style={styles.cardTitleRow}>
        <Text style={styles.cardTitle}>Sector Breakdown</Text>
        {isFetchingSectors && (
          <View style={styles.fetchingRow}>
            <ActivityIndicator size="small" color={theme.colors.accent} />
            <Text style={styles.fetchingText}>Loading sectors…</Text>
          </View>
        )}
      </View>
      {realSectorPie.length > 0 ? (
        <>
          <View style={styles.pieWrap}>
            <PieChart data={realSectorPie} size={isWide ? 160 : 140} />
          </View>
          <View style={styles.legendList}>
            {realSectorSorted.map(([sector, d], i) => {
              const pct = totalInvested > 0 ? (d.value / totalInvested) * 100 : 0;
              const color = PIE_COLORS[i % PIE_COLORS.length];
              return (
                <View key={sector} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: color }]} />
                  <Text style={styles.legendLabel} numberOfLines={1}>{sector}</Text>
                  <View style={styles.legendBar}>
                    <View style={[styles.legendBarFill, { width: `${pct}%` as any, backgroundColor: color }]} />
                  </View>
                  <Text style={styles.legendPct}>{pct.toFixed(1)}%</Text>
                  <Text style={styles.legendVal}>{formatCurrency(d.value)}</Text>
                  <Text style={styles.legendCount}>{d.count} holdings</Text>
                </View>
              );
            })}
          </View>
        </>
      ) : isFetchingSectors ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Fetching sector data…</Text>
        </View>
      ) : (
        <Text style={styles.empty}>No holdings yet</Text>
      )}
    </View>
  );

  // Company section
  const companyContent = (
    <View style={[styles.card, isWide && styles.cardWide]}>
      <Text style={styles.cardTitle}>Holdings by Company</Text>
      {companyPie.length > 0 ? (
        <>
          <View style={styles.pieWrap}>
            <PieChart data={companyPie} size={isWide ? 160 : 140} />
          </View>
          <View style={styles.legendList}>
            {companySorted.map(([sym, d], i) => {
              const pct = totalInvested > 0 ? (d.value / totalInvested) * 100 : 0;
              const color = PIE_COLORS[i % PIE_COLORS.length];
              const label = sym.replace(/\.(NS|BO)$/, "");
              // Show the fetched sector if available, otherwise fall back to asset type
              const sectorLabel = sectorCache.get(sym) ?? d.assetType?.replace("_", " ");
              return (
                <View key={sym} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: i < 8 ? color : "#94a3b8" }]} />
                  <Text style={styles.legendLabel}>{label}</Text>
                  <Text style={[styles.legendSectorBadge, { color: ASSET_COLORS[d.assetType] ?? "#94a3b8" }]}>
                    {sectorLabel}
                  </Text>
                  <View style={styles.legendBar}>
                    <View style={[styles.legendBarFill, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: i < 8 ? color : "#94a3b8" }]} />
                  </View>
                  <Text style={styles.legendPct}>{pct.toFixed(1)}%</Text>
                  <Text style={styles.legendVal}>{formatCurrency(d.value)}</Text>
                </View>
              );
            })}
          </View>
        </>
      ) : (
        <Text style={styles.empty}>No holdings yet</Text>
      )}
    </View>
  );

  // Client section
  const clientContent = (
    <View style={[styles.card, isWide && styles.cardWide]}>
      <Text style={styles.cardTitle}>Portfolio by Client</Text>
      {clientSorted.length > 0 ? (
        <View style={styles.legendList}>
          {clientSorted.map(([id, d]) => {
            const pct = totalInvested > 0 ? (d.value / totalInvested) * 100 : 0;
            return (
              <TouchableOpacity
                key={id}
                style={styles.clientRow}
                activeOpacity={0.7}
                onPress={() => router.push(`/(manager)/portfolio/${id}` as any)}
              >
                <View style={styles.clientRowLeft}>
                  <View style={styles.clientAvatar}>
                    <Text style={styles.clientAvatarText}>{d.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.clientName}>{d.name}</Text>
                    <Text style={styles.clientEmail}>{d.email}</Text>
                  </View>
                </View>
                <View style={styles.clientRowRight}>
                  <Text style={styles.clientValue}>{formatCurrency(d.value)}</Text>
                  <View style={styles.clientMeta}>
                    <Text style={styles.clientPct}>{pct.toFixed(1)}%</Text>
                    <Text style={styles.clientHoldings}>{d.holdingCount} holdings</Text>
                  </View>
                  <View style={styles.clientBar}>
                    <View style={[styles.clientBarFill, { width: `${Math.min(pct, 100)}%` as any }]} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <Text style={styles.empty}>No client data yet</Text>
      )}
    </View>
  );

  const content = (
    <>
      {header}
      {summaryRow}
      {sectionTabs}
      {activeSection === "sector" && sectorContent}
      {activeSection === "company" && companyContent}
      {activeSection === "client" && clientContent}
    </>
  );

  if (isWide) {
    return <View style={styles.webWrap}>{content}</View>;
  }
  return <ScreenContainer>{content}</ScreenContainer>;
}

const styles = StyleSheet.create({
  webWrap: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
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
  headerSub: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  kpiRow: {
    flexDirection: "column",
    gap: 10,
    marginBottom: 20,
  },
  kpiRowWide: {
    flexDirection: "row",
  },
  kpiCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  kpiLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  kpiValue: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: "700",
  },
  kpiSub: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 4,
    gap: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: theme.colors.card,
  },
  tabText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "500",
  },
  tabTextActive: {
    color: theme.colors.accent,
    fontWeight: "700",
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  cardWide: {
    padding: 24,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cardTitle: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
  },
  fetchingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  fetchingText: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  loadingWrap: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 12,
  },
  loadingText: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  pieWrap: {
    alignItems: "center",
    marginBottom: 16,
  },
  legendList: {
    gap: 10,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  legendLabel: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
    width: 90,
    flexShrink: 0,
  },
  legendSectorBadge: {
    fontSize: 10,
    fontWeight: "500",
    width: 56,
    flexShrink: 0,
  },
  legendBar: {
    flex: 1,
    height: 4,
    backgroundColor: theme.colors.surface,
    borderRadius: 2,
    overflow: "hidden",
  },
  legendBarFill: {
    height: 4,
    borderRadius: 2,
  },
  legendPct: {
    color: theme.colors.textMuted,
    fontSize: 11,
    width: 36,
    textAlign: "right",
    flexShrink: 0,
  },
  legendVal: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: "600",
    width: 72,
    textAlign: "right",
    flexShrink: 0,
  },
  legendCount: {
    color: theme.colors.textMuted,
    fontSize: 10,
    width: 60,
    textAlign: "right",
    flexShrink: 0,
  },
  clientRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 12,
  },
  clientRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  clientAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${theme.colors.accent}20`,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  clientAvatarText: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: "700",
  },
  clientName: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  clientEmail: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  clientRowRight: {
    alignItems: "flex-end",
    gap: 3,
    minWidth: 100,
  },
  clientValue: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  clientMeta: {
    flexDirection: "row",
    gap: 6,
  },
  clientPct: {
    color: theme.colors.accent,
    fontSize: 11,
    fontWeight: "600",
  },
  clientHoldings: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  clientBar: {
    width: 80,
    height: 3,
    backgroundColor: theme.colors.surface,
    borderRadius: 2,
    overflow: "hidden",
    alignSelf: "flex-end",
  },
  clientBarFill: {
    height: 3,
    backgroundColor: theme.colors.accent,
    borderRadius: 2,
  },
  empty: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 20,
  },
});
