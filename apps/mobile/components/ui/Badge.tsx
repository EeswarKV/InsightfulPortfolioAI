import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppTheme, useThemedStyles } from "../../lib/useAppTheme";
import type { ThemeColors } from "../../lib/themes";

type BadgeColor = "accent" | "green" | "red" | "yellow" | "purple";

interface BadgeProps {
  children: React.ReactNode;
  color?: BadgeColor;
  small?: boolean;
}

function makeStyles(t: ThemeColors) {
  return StyleSheet.create({
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
}

export function Badge({ children, color = "accent", small }: BadgeProps) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useAppTheme();

  const colorMap: Record<BadgeColor, { bg: string; text: string }> = {
    accent: { bg: colors.accentSoft, text: colors.accent },
    green: { bg: colors.greenSoft, text: colors.green },
    red: { bg: colors.redSoft, text: colors.red },
    yellow: { bg: colors.yellowSoft, text: colors.yellow },
    purple: { bg: colors.purpleSoft, text: colors.purple },
  };

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
