import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAppTheme, useThemedStyles } from "../../lib/useAppTheme";
import type { ThemeColors } from "../../lib/themes";

interface KPICardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  subtitleColor?: string;
  icon?: keyof typeof Feather.glyphMap;
  iconColor?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

function makeStyles(t: ThemeColors) {
  return StyleSheet.create({
    container: {
      backgroundColor: t.card,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: t.border,
    },
    topRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    label: {
      color: t.textMuted,
      fontSize: 11,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      fontWeight: "600",
      flex: 1,
    },
    iconWrap: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    value: {
      color: t.textPrimary,
      fontSize: 20,
      fontWeight: "700",
      marginBottom: 2,
    },
    subtitle: {
      color: t.textMuted,
      fontSize: 11,
      marginTop: 2,
    },
  });
}

export function KPICard({
  label,
  value,
  subtitle,
  subtitleColor,
  icon,
  iconColor,
  action,
  children,
}: KPICardProps) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useAppTheme();
  const resolvedIconColor = iconColor ?? colors.accent;

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
        {action}
        {icon && (
          <View style={[styles.iconWrap, { backgroundColor: `${resolvedIconColor}18` }]}>
            <Feather name={icon} size={14} color={resolvedIconColor} />
          </View>
        )}
      </View>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>
      {children ? (
        children
      ) : subtitle ? (
        <Text
          style={[styles.subtitle, subtitleColor ? { color: subtitleColor } : null]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
