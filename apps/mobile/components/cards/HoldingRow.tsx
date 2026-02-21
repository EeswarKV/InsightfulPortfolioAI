import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { theme } from "../../lib/theme";
import { formatCurrency, formatPercentChange } from "../../lib/formatters";
import type { Holding, DBHolding, AssetType } from "../../types";

const ASSET_LABELS: Record<AssetType, string> = {
  stock: "Stock",
  etf: "ETF",
  mutual_fund: "Mutual Fund",
  bond: "Bond",
  crypto: "Crypto",
};

// ---- Mock holding row (used by research/mock screens) ----

interface MockHoldingRowProps {
  holding: Holding;
  onEdit?: never;
  onDelete?: never;
  dbHolding?: never;
}

// ---- Real DB holding row (used by portfolio detail) ----

interface DBHoldingRowProps {
  dbHolding: DBHolding;
  currentPrice?: number; // Live/manual price for this holding
  onEdit?: (h: DBHolding) => void;
  onDelete?: (h: DBHolding) => void;
  onUpdateNAV?: (h: DBHolding) => void;
  holding?: never;
}

type HoldingRowProps = MockHoldingRowProps | DBHoldingRowProps;

export function HoldingRow(props: HoldingRowProps) {
  if (props.dbHolding) {
    const h = props.dbHolding;
    const qty = Number(h.quantity);
    const avgCost = Number(h.avg_cost);

    // Determine current price (manual > live > avg cost)
    const currentPrice = props.currentPrice || avgCost;

    // Calculate values
    const investedValue = qty * avgCost;
    const currentValue = qty * currentPrice;
    const gainLoss = currentValue - investedValue;
    const gainLossPercent = investedValue > 0 ? (gainLoss / investedValue) * 100 : 0;

    const hasPerformance = currentPrice !== avgCost;
    const isPriceStale = !props.currentPrice && h.asset_type !== "bond";

    // Asset type icons
    const assetIcons: Record<AssetType, string> = {
      stock: "trending-up",
      etf: "bar-chart-2",
      mutual_fund: "pie-chart",
      bond: "shield",
      crypto: "cpu",
    };

    return (
      <View style={styles.container}>
        <View style={styles.left}>
          <View style={styles.symbolRow}>
            <Feather
              name={assetIcons[h.asset_type] as any}
              size={14}
              color={theme.colors.accent}
            />
            <Text style={styles.symbol}>{h.symbol}</Text>
            <Text style={styles.assetBadge}>{ASSET_LABELS[h.asset_type]}</Text>
          </View>
          <Text style={styles.detail}>
            {qty} units @ ₹{avgCost.toFixed(2)}
          </Text>
          {hasPerformance && (
            <Text style={styles.currentPrice}>
              Current: ₹{currentPrice.toFixed(2)}
              {h.manual_price && <Text style={styles.manualBadge}> • Manual</Text>}
              {isPriceStale && <Text style={styles.staleBadge}> • Stale</Text>}
            </Text>
          )}
        </View>
        <View style={styles.rightActions}>
          <Text style={styles.value}>{formatCurrency(currentValue)}</Text>
          {hasPerformance && (
            <View style={styles.performanceRow}>
              <Text
                style={[
                  styles.gainLoss,
                  { color: gainLoss >= 0 ? theme.colors.green : theme.colors.red },
                ]}
              >
                {gainLoss >= 0 ? "+" : ""}
                {formatCurrency(gainLoss)}
              </Text>
              <Text
                style={[
                  styles.gainPercent,
                  { color: gainLoss >= 0 ? theme.colors.green : theme.colors.red },
                ]}
              >
                ({gainLossPercent >= 0 ? "+" : ""}
                {gainLossPercent.toFixed(2)}%)
              </Text>
            </View>
          )}
          {(props.onEdit || props.onDelete || props.onUpdateNAV) && (
            <View style={styles.actions}>
              {props.onUpdateNAV && h.asset_type !== "stock" && h.asset_type !== "etf" && (
                <TouchableOpacity
                  style={styles.navBtn}
                  onPress={() => props.onUpdateNAV!(h)}
                >
                  <Feather name="edit-3" size={12} color={theme.colors.accent} />
                  <Text style={styles.navBtnText}>NAV</Text>
                </TouchableOpacity>
              )}
              {props.onEdit && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => props.onEdit!(h)}
                >
                  <Feather name="edit-2" size={14} color={theme.colors.accent} />
                </TouchableOpacity>
              )}
              {props.onDelete && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => props.onDelete!(h)}
                >
                  <Feather name="trash-2" size={14} color={theme.colors.red} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    );
  }

  // Legacy mock holding
  const h = props.holding;
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <View style={styles.symbolRow}>
          <Text style={styles.symbol}>{h.symbol}</Text>
          <Text style={styles.shares}>{h.shares} shares</Text>
        </View>
        <Text style={styles.name}>{h.name}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.value}>{formatCurrency(h.value)}</Text>
        <Text
          style={[
            styles.change,
            {
              color:
                h.change >= 0
                  ? theme.colors.green
                  : theme.colors.red,
            },
          ]}
        >
          {formatPercentChange(h.change)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  left: {
    flex: 1,
  },
  symbolRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  symbol: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  shares: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  assetBadge: {
    color: theme.colors.accent,
    fontSize: 10,
    fontWeight: "600",
    backgroundColor: theme.colors.accentSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  name: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  detail: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  source: {
    color: theme.colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  currentPrice: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  manualBadge: {
    color: theme.colors.accent,
    fontWeight: "600",
  },
  staleBadge: {
    color: theme.colors.yellow,
    fontWeight: "600",
  },
  right: {
    alignItems: "flex-end",
  },
  performanceRow: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    marginTop: 2,
  },
  gainLoss: {
    fontSize: 12,
    fontWeight: "600",
  },
  gainPercent: {
    fontSize: 11,
  },
  rightActions: {
    alignItems: "flex-end",
    gap: 6,
  },
  value: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  change: {
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: theme.colors.accentSoft,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  navBtnText: {
    color: theme.colors.accent,
    fontSize: 10,
    fontWeight: "600",
  },
});
