import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useThemeColors, useThemedStyles } from "../../lib/useAppTheme";
import type { ThemeColors } from "../../lib/themes";
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
  fundName?: string; // Mutual fund scheme name from mfapi.in
  onEdit?: (h: DBHolding) => void;
  onDelete?: (h: DBHolding) => void;
  onUpdateNAV?: (h: DBHolding) => void;
  onSetAlert?: (h: DBHolding) => void;
  holding?: never;
}

type HoldingRowProps = MockHoldingRowProps | DBHoldingRowProps;

function makeStyles(t: ThemeColors) {
  return StyleSheet.create({
    container: {
      backgroundColor: t.card,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: t.border,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6,
    },
    left: {
      flex: 1,
      minWidth: 0,
    },
    symbolRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      flexWrap: "wrap",
    },
    symbol: {
      color: t.textPrimary,
      fontSize: 14,
      fontWeight: "600",
    },
    shares: {
      color: t.textMuted,
      fontSize: 11,
    },
    assetBadge: {
      color: t.accent,
      fontSize: 10,
      fontWeight: "600",
      backgroundColor: t.accentSoft,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      overflow: "hidden",
    },
    name: {
      color: t.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    detail: {
      color: t.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    source: {
      color: t.textMuted,
      fontSize: 10,
      marginTop: 2,
    },
    currentPriceRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      marginTop: 2,
    },
    currentPrice: {
      color: t.textSecondary,
      fontSize: 11,
    },
    manualBadge: {
      color: t.accent,
      fontWeight: "600",
    },
    staleBadge: {
      color: t.yellow,
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
      flexWrap: "wrap",
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
      flexShrink: 0,
      maxWidth: 165,
    },
    value: {
      color: t.textPrimary,
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
      backgroundColor: t.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    navBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 4,
      backgroundColor: t.accentSoft,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: t.accent,
    },
    navBtnText: {
      color: t.accent,
      fontSize: 10,
      fontWeight: "600",
    },
  });
}

export function HoldingRow(props: HoldingRowProps) {
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();
  const router = useRouter();

  if (props.dbHolding) {
    const h = props.dbHolding;
    const qty = Number(h.quantity);
    const avgCost = Number(h.avg_cost);
    const isEquity = h.asset_type === "stock" || h.asset_type === "etf";
    const cleanSymbol = h.symbol.replace(/\.(NS|BSE|NSE|BO)$/i, "");

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

    const inner = (
      <View style={styles.container}>
        <View style={styles.left}>
          <View style={styles.symbolRow}>
            <Feather
              name={assetIcons[h.asset_type] as any}
              size={14}
              color={colors.accent}
            />
            <Text style={styles.symbol}>{h.symbol}</Text>
            <Text style={styles.assetBadge}>{ASSET_LABELS[h.asset_type]}</Text>
          </View>
          {!!props.fundName && (
            <Text style={styles.name} numberOfLines={1}>{props.fundName}</Text>
          )}
          <Text style={styles.detail}>
            {`${qty} units @ ₹${avgCost.toFixed(2)}`}
          </Text>
          {hasPerformance && (
            <View style={styles.currentPriceRow}>
              <Text style={styles.currentPrice}>
                {`Current: ₹${currentPrice.toFixed(2)}`}
              </Text>
              {!!h.manual_price && (
                <Text style={styles.manualBadge}> • Manual</Text>
              )}
              {isPriceStale && (
                <Text style={styles.staleBadge}> • Stale</Text>
              )}
            </View>
          )}
        </View>
        <View style={styles.rightActions}>
          <Text style={styles.value}>{formatCurrency(currentValue)}</Text>
          {hasPerformance && (
            <View style={styles.performanceRow}>
              <Text
                style={[
                  styles.gainLoss,
                  { color: gainLoss >= 0 ? colors.green : colors.red },
                ]}
              >
                {`${gainLoss >= 0 ? "+" : ""}${formatCurrency(gainLoss)}`}
              </Text>
              <Text
                style={[
                  styles.gainPercent,
                  { color: gainLoss >= 0 ? colors.green : colors.red },
                ]}
              >
                {`(${gainLossPercent >= 0 ? "+" : ""}${gainLossPercent.toFixed(2)}%)`}
              </Text>
            </View>
          )}
          {(props.onEdit || props.onDelete || props.onUpdateNAV || props.onSetAlert) && (
            <View style={styles.actions}>
              {props.onSetAlert && (h.asset_type === "stock" || h.asset_type === "etf") && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => props.onSetAlert!(h)}
                >
                  <Feather name="bell" size={14} color={colors.yellow} />
                </TouchableOpacity>
              )}
              {props.onUpdateNAV && h.asset_type !== "stock" && h.asset_type !== "etf" && (
                <TouchableOpacity
                  style={styles.navBtn}
                  onPress={() => props.onUpdateNAV!(h)}
                >
                  <Feather name="edit-3" size={12} color={colors.accent} />
                  <Text style={styles.navBtnText}>NAV</Text>
                </TouchableOpacity>
              )}
              {props.onEdit && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => props.onEdit!(h)}
                >
                  <Feather name="edit-2" size={14} color={colors.accent} />
                </TouchableOpacity>
              )}
              {props.onDelete && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => props.onDelete!(h)}
                >
                  <Feather name="trash-2" size={14} color={colors.red} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    );

    if (isEquity) {
      return (
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => router.push(`/(manager)/stock/${cleanSymbol}` as any)}
        >
          {inner}
        </TouchableOpacity>
      );
    }
    return inner;
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
                  ? colors.green
                  : colors.red,
            },
          ]}
        >
          {formatPercentChange(h.change)}
        </Text>
      </View>
    </View>
  );
}
