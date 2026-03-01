import React from "react";
import { View, StyleSheet } from "react-native";
import { useAppTheme, useThemedStyles } from "../../lib/useAppTheme";
import type { ThemeColors } from "../../lib/themes";

interface StatusDotProps {
  status: "good" | "warning" | "neutral";
}

function makeStyles(t: ThemeColors) {
  return StyleSheet.create({
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
  });
}

export function StatusDot({ status }: StatusDotProps) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useAppTheme();

  const color =
    status === "good"
      ? colors.green
      : status === "warning"
        ? colors.yellow
        : colors.textMuted;

  return <View style={[styles.dot, { backgroundColor: color }]} />;
}
