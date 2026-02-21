import React from "react";
import { View, StyleSheet } from "react-native";
import { theme } from "../../lib/theme";

interface StatusDotProps {
  status: "good" | "warning" | "neutral";
}

export function StatusDot({ status }: StatusDotProps) {
  const color =
    status === "good"
      ? theme.colors.green
      : status === "warning"
        ? theme.colors.yellow
        : theme.colors.textMuted;

  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

const styles = StyleSheet.create({
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
