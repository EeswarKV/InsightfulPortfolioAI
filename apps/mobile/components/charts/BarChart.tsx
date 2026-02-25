import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../../lib/theme";

interface BarData {
  label: string;
  value: number;
  percentage?: number;
}

interface BarChartProps {
  data: BarData[];
  height?: number;
}

export function BarChart({ data: rawData, height = 80 }: BarChartProps) {
  if (rawData.length === 0) return null;

  // Drop leading zero entries (days before any portfolio activity)
  let trimStart = 0;
  while (trimStart < rawData.length && Math.abs(rawData[trimStart].value) < 0.001 && rawData[trimStart].percentage === undefined) {
    trimStart++;
  }
  const data = trimStart > 0 ? rawData.slice(trimStart) : rawData;
  if (data.length === 0) return null;

  // Scale bars by percentage when available so a tiny -0.0% doesn't show as a tall bar
  const hasPercentages = data.some((d) => d.percentage !== undefined);
  const maxAbs = hasPercentages
    ? Math.max(...data.map((d) => (d.percentage !== undefined ? Math.abs(d.percentage) : 0)), 0.001)
    : Math.max(...data.map((d) => Math.abs(d.value)), 0.001);

  // Treat < 0.05% change as zero so linear-interpolation noise doesn't show as -0.0%
  const isEffectivelyZero = (d: BarData) =>
    hasPercentages && d.percentage !== undefined
      ? Math.abs(d.percentage) < 0.05
      : Math.abs(d.value) < 0.001;

  const hasPos = data.some((d) => d.value > 0 && !isEffectivelyZero(d));
  const hasNeg = data.some((d) => d.value < 0 && !isEffectivelyZero(d));
  const isMixed = hasPos && hasNeg;

  const LABEL_H = 18;
  const PERC_H = 14;
  const chartH = height - LABEL_H;

  // In mixed mode: split chart area in half around a zero line
  // In single-sign mode: full chart area
  const halfH = isMixed ? (chartH - 1) / 2 : chartH; // 1px zero line
  const maxBarH = Math.max(halfH - PERC_H - 4, 8);

  return (
    <View style={{ flexDirection: "row", height, gap: 6 }}>
      {data.map((d, i) => {
        const isPos = d.value >= 0;
        const isZero = isEffectivelyZero(d);
        const metric = hasPercentages && d.percentage !== undefined ? Math.abs(d.percentage) : Math.abs(d.value);
        const barH = isZero ? 0 : Math.max(3, (metric / maxAbs) * maxBarH);
        const color = isPos ? theme.colors.green : theme.colors.red;

        return (
          <View key={i} style={styles.column}>
            {isMixed ? (
              <>
                {/* Positive half — bar grows upward (justified to bottom) */}
                <View style={[styles.half, { height: halfH, justifyContent: "flex-end" }]}>
                  {isPos && !isZero && (
                    <>
                      {d.percentage !== undefined && (
                        <Text style={[styles.percLabel, { color }]}>
                          +{d.percentage.toFixed(1)}%
                        </Text>
                      )}
                      <View style={[styles.bar, { height: barH, backgroundColor: color }]} />
                    </>
                  )}
                </View>

                {/* Zero line */}
                <View style={styles.zeroLine} />

                {/* Negative half — bar grows downward (justified to top) */}
                <View style={[styles.half, { height: halfH, justifyContent: "flex-start" }]}>
                  {!isPos && !isZero && (
                    <>
                      <View style={[styles.bar, { height: barH, backgroundColor: color }]} />
                      {d.percentage !== undefined && (
                        <Text style={[styles.percLabel, { color }]}>
                          {d.percentage.toFixed(1)}%
                        </Text>
                      )}
                    </>
                  )}
                </View>
              </>
            ) : (
              /* Single-direction: all positive (up) or all negative (down) */
              <View
                style={[
                  styles.half,
                  { height: chartH, justifyContent: hasNeg ? "flex-start" : "flex-end" },
                ]}
              >
                {!isZero ? (
                  hasNeg ? (
                    // All-negative: bar then label below
                    <>
                      <View style={[styles.bar, { height: barH, backgroundColor: color }]} />
                      {d.percentage !== undefined && (
                        <Text style={[styles.percLabel, { color }]}>
                          {d.percentage.toFixed(1)}%
                        </Text>
                      )}
                    </>
                  ) : (
                    // All-positive: label then bar
                    <>
                      {d.percentage !== undefined && (
                        <Text style={[styles.percLabel, { color }]}>
                          +{d.percentage.toFixed(1)}%
                        </Text>
                      )}
                      <View style={[styles.bar, { height: barH, backgroundColor: color }]} />
                    </>
                  )
                ) : (
                  // Zero value — show a flat dash
                  <View style={styles.zeroDash} />
                )}
              </View>
            )}

            <Text style={styles.dayLabel}>{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    flex: 1,
    alignItems: "center",
  },
  half: {
    width: "100%",
    alignItems: "center",
  },
  bar: {
    width: "100%",
    maxWidth: 28,
    borderRadius: 3,
    opacity: 0.85,
  },
  percLabel: {
    fontSize: 9,
    fontWeight: "600",
    marginVertical: 2,
  },
  zeroLine: {
    height: 1,
    width: "100%",
    backgroundColor: theme.colors.border,
    opacity: 0.6,
  },
  zeroDash: {
    height: 2,
    width: "60%",
    borderRadius: 1,
    backgroundColor: theme.colors.border,
    opacity: 0.5,
  },
  dayLabel: {
    fontSize: 9,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
});
