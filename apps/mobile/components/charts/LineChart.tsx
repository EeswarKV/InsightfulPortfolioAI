import { useState } from "react";
import { View, Text, StyleSheet, LayoutChangeEvent } from "react-native";
import Svg, {
  Polyline,
  Line,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
  Path,
} from "react-native-svg";
import { theme } from "../../lib/theme";

export interface LineDataPoint {
  label: string; // date string YYYY-MM-DD
  value: number; // % return (0 = breakeven)
}

export interface LineSeries {
  name: string;
  color: string;
  data: LineDataPoint[];
}

interface LineChartProps {
  series: LineSeries[];
  height?: number;
}

const LEFT_PAD = 46;
const RIGHT_PAD = 12;
const TOP_PAD = 14;
const BOTTOM_PAD = 30;
const Y_TICKS = 5;

function shortDateLabel(iso: string): string {
  const d = new Date(iso);
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function LineChart({ series, height = 200 }: LineChartProps) {
  const [svgWidth, setSvgWidth] = useState(320);

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setSvgWidth(w);
  };

  const chartH = height - TOP_PAD - BOTTOM_PAD;
  const chartW = svgWidth - LEFT_PAD - RIGHT_PAD;

  // Collect all values to find range
  const allValues = series.flatMap((s) => s.data.map((d) => d.value));
  if (allValues.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>No data available</Text>
      </View>
    );
  }

  let minVal = Math.min(...allValues);
  let maxVal = Math.max(...allValues);

  // Always include 0 in range
  minVal = Math.min(minVal, 0);
  maxVal = Math.max(maxVal, 0);

  // Ensure at least ±2% visible range
  const spread = maxVal - minVal || 4;
  const pad = spread * 0.12;
  minVal -= pad;
  maxVal += pad;
  const range = maxVal - minVal;

  const toX = (i: number, total: number) =>
    LEFT_PAD + (total <= 1 ? chartW / 2 : (i / (total - 1)) * chartW);

  const toY = (val: number) =>
    TOP_PAD + chartH - ((val - minVal) / range) * chartH;

  const zeroY = toY(0);

  // Y-axis tick values
  const yStep = range / (Y_TICKS - 1);
  const yTicks = Array.from({ length: Y_TICKS }, (_, i) => minVal + i * yStep);

  // X-axis labels: pick ~4 evenly spaced
  const longestSeries = series.reduce(
    (best, s) => (s.data.length > best.data.length ? s : best),
    series[0]
  );
  const xCount = longestSeries.data.length;
  const xLabelIdxs =
    xCount <= 4
      ? longestSeries.data.map((_, i) => i)
      : [0, Math.floor(xCount / 3), Math.floor((2 * xCount) / 3), xCount - 1];

  return (
    <View>
      <View onLayout={handleLayout}>
        <Svg width={svgWidth} height={height}>
          <Defs>
            {series.map((s, si) => (
              <LinearGradient
                key={`grad${si}`}
                id={`grad${si}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <Stop offset="0" stopColor={s.color} stopOpacity="0.25" />
                <Stop offset="1" stopColor={s.color} stopOpacity="0" />
              </LinearGradient>
            ))}
          </Defs>

          {/* Horizontal grid + Y labels */}
          {yTicks.map((val, i) => {
            const y = toY(val);
            const label =
              Math.abs(val) < 0.05
                ? "0%"
                : `${val >= 0 ? "+" : ""}${val.toFixed(1)}%`;
            return (
              <Line
                key={`grid${i}`}
                x1={LEFT_PAD}
                y1={y}
                x2={LEFT_PAD + chartW}
                y2={y}
                stroke={theme.colors.border}
                strokeWidth={1}
                opacity={0.6}
              />
            );
          })}

          {yTicks.map((val, i) => {
            const y = toY(val);
            const label =
              Math.abs(val) < 0.05
                ? "0%"
                : `${val >= 0 ? "+" : ""}${val.toFixed(1)}%`;
            return (
              <SvgText
                key={`ylabel${i}`}
                x={LEFT_PAD - 4}
                y={y + 3.5}
                textAnchor="end"
                fontSize={9}
                fill={theme.colors.textMuted}
              >
                {label}
              </SvgText>
            );
          })}

          {/* Zero reference line */}
          <Line
            x1={LEFT_PAD}
            y1={zeroY}
            x2={LEFT_PAD + chartW}
            y2={zeroY}
            stroke={theme.colors.textMuted}
            strokeWidth={1.5}
            strokeDasharray="5 3"
            opacity={0.5}
          />

          {/* Area fills */}
          {series.map((s, si) => {
            if (s.data.length < 2) return null;
            const pts = s.data.map((d, i) => ({
              x: toX(i, s.data.length),
              y: toY(d.value),
            }));
            const pathD =
              `M ${pts[0].x} ${zeroY} ` +
              pts.map((p) => `L ${p.x} ${p.y}`).join(" ") +
              ` L ${pts[pts.length - 1].x} ${zeroY} Z`;
            return (
              <Path
                key={`area${si}`}
                d={pathD}
                fill={`url(#grad${si})`}
              />
            );
          })}

          {/* Series lines */}
          {series.map((s, si) => {
            if (s.data.length < 2) return null;
            const points = s.data
              .map((d, i) => `${toX(i, s.data.length)},${toY(d.value)}`)
              .join(" ");
            return (
              <Polyline
                key={`line${si}`}
                points={points}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}

          {/* X-axis labels */}
          {xLabelIdxs.map((idx) => {
            const d = longestSeries.data[idx];
            if (!d) return null;
            const x = toX(idx, xCount);
            return (
              <SvgText
                key={`xlabel${idx}`}
                x={x}
                y={height - 6}
                textAnchor="middle"
                fontSize={9}
                fill={theme.colors.textMuted}
              >
                {shortDateLabel(d.label)}
              </SvgText>
            );
          })}
        </Svg>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {series.map((s, i) => (
          <View key={i} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: s.color }]} />
            <Text style={styles.legendLabel}>{s.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
});
