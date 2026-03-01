import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Svg, { Polyline, Path, Line, Text as SvgText, Defs, LinearGradient, Stop } from "react-native-svg";
import { ScreenContainer } from "../../../components/layout";
import { useThemeColors, useThemedStyles } from "../../../lib/useAppTheme";
import type { ThemeColors } from "../../../lib/themes";
import { fetchStockOHLCV } from "../../../lib/marketData";

type Period = "1W" | "1M" | "3M" | "1Y";

interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const PERIODS: { label: Period; days: number }[] = [
  { label: "1W", days: 7 },
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "1Y", days: 365 },
];

function shortDate(iso: string): string {
  const d = new Date(iso);
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function formatVol(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return `${v}`;
}

function makeStyles(t: ThemeColors) {
  return StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
      gap: 12,
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
    symbolText: {
      color: t.textPrimary,
      fontSize: 20,
      fontWeight: "700",
    },
    content: {
      paddingHorizontal: 16,
      paddingBottom: 32,
      gap: 16,
    },
    priceRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 10,
    },
    currentPrice: {
      color: t.textPrimary,
      fontSize: 32,
      fontWeight: "800",
      letterSpacing: -0.5,
    },
    changeChip: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      marginBottom: 4,
    },
    changeText: {
      fontSize: 13,
      fontWeight: "600",
      color: "#fff",
    },
    statsRow: {
      flexDirection: "row",
      gap: 0,
    },
    statBox: {
      flex: 1,
      backgroundColor: t.card,
      borderWidth: 1,
      borderColor: t.border,
      padding: 12,
      alignItems: "center",
    },
    statLabel: {
      color: t.textMuted,
      fontSize: 10,
      fontWeight: "600",
      marginBottom: 4,
    },
    statValue: {
      color: t.textPrimary,
      fontSize: 13,
      fontWeight: "600",
    },
    periodRow: {
      flexDirection: "row",
      backgroundColor: t.surface,
      borderRadius: 10,
      padding: 3,
    },
    periodBtn: {
      flex: 1,
      paddingVertical: 7,
      alignItems: "center",
      borderRadius: 8,
    },
    periodBtnActive: {
      backgroundColor: t.accent,
    },
    periodText: {
      color: t.textMuted,
      fontSize: 12,
      fontWeight: "600",
    },
    periodTextActive: {
      color: "#fff",
    },
    chartCard: {
      backgroundColor: t.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.border,
      padding: 16,
    },
    center: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
    },
    errorText: {
      color: t.textMuted,
      fontSize: 13,
      textAlign: "center",
      marginTop: 8,
    },
  });
}

function PriceChart({
  candles,
  color,
  height = 180,
}: {
  candles: Candle[];
  color: string;
  height?: number;
}) {
  const t = useThemeColors();
  const [width, setWidth] = useState(320);
  const L = 52, R = 8, T = 12, B = 28;
  const chartW = width - L - R;
  const chartH = height - T - B;

  if (candles.length < 2) return null;

  const closes = candles.map((c) => c.close);
  const minVal = Math.min(...closes);
  const maxVal = Math.max(...closes);
  const spread = maxVal - minVal || 1;
  const pad = spread * 0.1;
  const lo = minVal - pad;
  const hi = maxVal + pad;
  const range = hi - lo;

  const toX = (i: number) => L + (i / (candles.length - 1)) * chartW;
  const toY = (v: number) => T + chartH - ((v - lo) / range) * chartH;

  const pts = candles.map((c, i) => ({ x: toX(i), y: toY(c.close) }));
  const polyPoints = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const pathD =
    `M ${pts[0].x} ${T + chartH} ` +
    pts.map((p) => `L ${p.x} ${p.y}`).join(" ") +
    ` L ${pts[pts.length - 1].x} ${T + chartH} Z`;

  // Y-axis ticks (4 levels)
  const yTicks = [lo, lo + range * 0.33, lo + range * 0.66, hi].map((v) =>
    Math.round(v)
  );
  // X-axis labels: first, mid, last
  const xIdxs = [0, Math.floor(candles.length / 2), candles.length - 1];

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.3" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        {yTicks.map((v, i) => (
          <Line
            key={i}
            x1={L}
            y1={toY(v)}
            x2={L + chartW}
            y2={toY(v)}
            stroke={t.border}
            strokeWidth={1}
            opacity={0.5}
          />
        ))}

        {/* Y labels */}
        {yTicks.map((v, i) => (
          <SvgText
            key={i}
            x={L - 4}
            y={toY(v) + 4}
            textAnchor="end"
            fontSize={9}
            fill={t.textMuted}
          >
            {v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`}
          </SvgText>
        ))}

        {/* Area fill */}
        <Path d={pathD} fill="url(#priceGrad)" />

        {/* Price line */}
        <Polyline
          points={polyPoints}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* X labels */}
        {xIdxs.map((idx) => (
          <SvgText
            key={idx}
            x={toX(idx)}
            y={height - 4}
            textAnchor="middle"
            fontSize={9}
            fill={t.textMuted}
          >
            {shortDate(candles[idx].date)}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

export default function StockDetailScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();

  const [period, setPeriod] = useState<Period>("3M");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!symbol) return;
    const days = PERIODS.find((p) => p.label === period)?.days ?? 90;
    // Append .NS for NSE stocks if not already a Yahoo Finance symbol
    const yfSymbol = symbol.includes(".") ? symbol : `${symbol}.NS`;

    setLoading(true);
    setError("");
    fetchStockOHLCV(yfSymbol, days)
      .then((data) => {
        if (data.length === 0) setError("No data available for this period");
        else setCandles(data);
      })
      .catch(() => setError("Failed to load chart data"))
      .finally(() => setLoading(false));
  }, [symbol, period]);

  const last = candles[candles.length - 1];
  const first = candles[0];
  const currentPrice = last?.close ?? 0;
  const priceChange = last && first ? last.close - first.close : 0;
  const changePct = first?.close ? (priceChange / first.close) * 100 : 0;
  const isUp = changePct >= 0;
  const periodHigh = candles.length ? Math.max(...candles.map((c) => c.high)) : 0;
  const periodLow = candles.length ? Math.min(...candles.map((c) => c.low)) : 0;
  const totalVolume = candles.reduce((s, c) => s + c.volume, 0);
  const chartColor = isUp ? colors.green : colors.red;

  return (
    <ScreenContainer>
      {/* Back + symbol header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.symbolText}>{symbol}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Current price + change */}
        <View style={styles.priceRow}>
          <Text style={styles.currentPrice}>
            {currentPrice > 0
              ? `₹${currentPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : "—"}
          </Text>
          {currentPrice > 0 && (
            <View
              style={[
                styles.changeChip,
                { backgroundColor: isUp ? colors.green : colors.red },
              ]}
            >
              <Text style={styles.changeText}>
                {isUp ? "▲" : "▼"} {Math.abs(changePct).toFixed(2)}%
              </Text>
            </View>
          )}
        </View>

        {/* Period selector */}
        <View style={styles.periodRow}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p.label}
              style={[styles.periodBtn, period === p.label && styles.periodBtnActive]}
              onPress={() => setPeriod(p.label)}
            >
              <Text
                style={[styles.periodText, period === p.label && styles.periodTextActive]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Chart */}
        <View style={styles.chartCard}>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : error ? (
            <View style={styles.center}>
              <Feather name="alert-circle" size={24} color={colors.textMuted} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <PriceChart candles={candles} color={chartColor} height={200} />
          )}
        </View>

        {/* Stats: Period high/low/volume */}
        {candles.length > 0 && (
          <View style={[styles.statsRow, { borderRadius: 12, overflow: "hidden" }]}>
            <View style={[styles.statBox, { borderTopLeftRadius: 12, borderBottomLeftRadius: 12 }]}>
              <Text style={styles.statLabel}>{period} HIGH</Text>
              <Text style={[styles.statValue, { color: colors.green }]}>
                ₹{periodHigh.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={[styles.statBox, { borderLeftWidth: 0, borderRightWidth: 0 }]}>
              <Text style={styles.statLabel}>{period} LOW</Text>
              <Text style={[styles.statValue, { color: colors.red }]}>
                ₹{periodLow.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={[styles.statBox, { borderTopRightRadius: 12, borderBottomRightRadius: 12 }]}>
              <Text style={styles.statLabel}>AVG VOL</Text>
              <Text style={styles.statValue}>
                {formatVol(Math.round(totalVolume / candles.length))}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
