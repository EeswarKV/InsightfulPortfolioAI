import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { theme } from "../../lib/theme";

interface KPICardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  subtitleColor?: string;
  icon?: keyof typeof Feather.glyphMap;
  iconColor?: string;
  children?: React.ReactNode;
}

export function KPICard({
  label,
  value,
  subtitle,
  subtitleColor,
  icon,
  iconColor = theme.colors.accent,
  children,
}: KPICardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
        {icon && (
          <View style={[styles.iconWrap, { backgroundColor: `${iconColor}18` }]}>
            <Feather name={icon} size={14} color={iconColor} />
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    color: theme.colors.textMuted,
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
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 2,
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
});
