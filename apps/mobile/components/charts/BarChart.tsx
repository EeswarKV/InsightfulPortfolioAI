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

export function BarChart({ data, height = 80 }: BarChartProps) {
  const max = Math.max(...data.map((d) => Math.abs(d.value)));

  return (
    <View style={[styles.container, { height }]}>
      {data.map((d, i) => {
        const barHeight = Math.max(4, (Math.abs(d.value) / max) * (height - 20));
        return (
          <View key={i} style={styles.barWrapper}>
            {d.percentage !== undefined && (
              <Text
                style={[
                  styles.percentLabel,
                  { color: d.percentage >= 0 ? theme.colors.green : theme.colors.red },
                ]}
              >
                {d.percentage >= 0 ? "+" : ""}
                {d.percentage.toFixed(1)}%
              </Text>
            )}
            <View
              style={[
                styles.bar,
                {
                  height: barHeight,
                  backgroundColor:
                    d.value >= 0 ? theme.colors.green : theme.colors.red,
                },
              ]}
            />
            <Text style={styles.label}>{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  barWrapper: {
    flex: 1,
    alignItems: "center",
  },
  percentLabel: {
    fontSize: 9,
    fontWeight: "600",
    marginBottom: 4,
  },
  bar: {
    width: "100%",
    maxWidth: 28,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    opacity: 0.8,
  },
  label: {
    fontSize: 9,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
});
