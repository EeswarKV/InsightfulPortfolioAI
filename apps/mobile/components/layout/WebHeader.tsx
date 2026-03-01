import React from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useThemedStyles, useThemeColors } from "../../lib/useAppTheme";
import type { ThemeColors } from "../../lib/themes";

interface WebHeaderProps {
  title: string;
  subtitle?: string;
}

function makeStyles(t: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 32,
      paddingTop: 24,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
    },
    title: {
      color: t.textPrimary,
      fontSize: 24,
      fontWeight: "700",
    },
    subtitle: {
      color: t.textMuted,
      fontSize: 13,
      marginTop: 4,
    },
    right: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    searchWrap: {
      position: "relative",
      width: 260,
    },
    searchIcon: {
      position: "absolute",
      left: 12,
      top: 11,
      zIndex: 1,
    },
    searchInput: {
      width: "100%",
      paddingVertical: 10,
      paddingRight: 14,
      paddingLeft: 36,
      backgroundColor: t.card,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 10,
      color: t.textPrimary,
      fontSize: 13,
    },
    bellBtn: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: t.card,
      borderWidth: 1,
      borderColor: t.border,
      alignItems: "center",
      justifyContent: "center",
    },
    bellDot: {
      position: "absolute",
      top: -2,
      right: -2,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: t.red,
    },
  });
}

export function WebHeader({ title, subtitle }: WebHeaderProps) {
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.right}>
        <View style={styles.searchWrap}>
          <Feather
            name="search"
            size={15}
            color={colors.textMuted}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search anything..."
            placeholderTextColor={colors.textMuted}
          />
        </View>
      </View>
    </View>
  );
}
