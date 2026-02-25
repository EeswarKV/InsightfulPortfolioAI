import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { theme } from "../../lib/theme";

export interface PieSlice {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieSlice[];
  size?: number;
  innerRadius?: number;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function slicePath(
  cx: number,
  cy: number,
  r: number,
  ri: number,
  startDeg: number,
  sweepDeg: number
): string {
  const clamped = Math.min(sweepDeg, 359.9999);
  const endDeg = startDeg + clamped;
  const large = clamped > 180 ? 1 : 0;
  const s = polarToCartesian(cx, cy, r, startDeg);
  const e = polarToCartesian(cx, cy, r, endDeg);
  const si = polarToCartesian(cx, cy, ri, startDeg);
  const ei = polarToCartesian(cx, cy, ri, endDeg);
  return [
    `M ${s.x.toFixed(3)} ${s.y.toFixed(3)}`,
    `A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(3)} ${e.y.toFixed(3)}`,
    `L ${ei.x.toFixed(3)} ${ei.y.toFixed(3)}`,
    `A ${ri} ${ri} 0 ${large} 0 ${si.x.toFixed(3)} ${si.y.toFixed(3)}`,
    "Z",
  ].join(" ");
}

export function PieChart({ data, size = 110, innerRadius = 30 }: PieChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0 || data.length === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 3;

  let startDeg = 0;
  const slices = data.map((slice) => {
    const sweep = (slice.value / total) * 360;
    const path = slicePath(cx, cy, r, innerRadius, startDeg, sweep);
    startDeg += sweep;
    return { ...slice, pct: (slice.value / total) * 100, path };
  });

  return (
    <View style={styles.row}>
      <Svg width={size} height={size} style={styles.svg}>
        {slices.map((s, i) => (
          <Path key={i} d={s.path} fill={s.color} />
        ))}
        <Circle cx={cx} cy={cy} r={innerRadius} fill={theme.colors.card} />
      </Svg>
      <View style={styles.legend}>
        {slices.map((s, i) => (
          <View key={i} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <Text style={styles.legendLabel} numberOfLines={1} ellipsizeMode="tail">
              {s.label.replace(/_/g, " ")}
            </Text>
            <Text style={styles.legendPct}>{s.pct.toFixed(1)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  svg: {
    flexShrink: 0,
  },
  legend: {
    flexShrink: 1,
    minWidth: 0,
    gap: 6,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  legendLabel: {
    flexShrink: 1,
    minWidth: 0,
    color: theme.colors.textSecondary,
    fontSize: 11,
    textTransform: "capitalize",
  },
  legendPct: {
    color: theme.colors.textPrimary,
    fontSize: 11,
    fontWeight: "600",
    flexShrink: 0,
  },
});
