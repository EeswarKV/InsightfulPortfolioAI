import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../../lib/theme";

type BadgeColor = "accent" | "green" | "red" | "yellow" | "purple";

interface BadgeProps {
  children: React.ReactNode;
  color?: BadgeColor;
  small?: boolean;
}

const colorMap: Record<BadgeColor, { bg: string; text: string }> = {
  accent: { bg: theme.colors.accentSoft, text: theme.colors.accent },
  green: { bg: theme.colors.greenSoft, text: theme.colors.green },
  red: { bg: theme.colors.redSoft, text: theme.colors.red },
  yellow: { bg: theme.colors.yellowSoft, text: theme.colors.yellow },
  purple: { bg: theme.colors.purpleSoft, text: theme.colors.purple },
};

export function Badge({ children, color = "accent", small }: BadgeProps) {
  const c = colorMap[color];
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: c.bg },
        small && styles.small,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: c.text },
          small && styles.smallText,
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  small: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  text: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  smallText: {
    fontSize: 10,
  },
});
