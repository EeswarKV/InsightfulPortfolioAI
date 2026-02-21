import React from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { theme } from "../../lib/theme";

interface WebHeaderProps {
  title: string;
  subtitle?: string;
}

export function WebHeader({ title, subtitle }: WebHeaderProps) {
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
            color={theme.colors.textMuted}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search anything..."
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    color: theme.colors.textMuted,
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
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    color: theme.colors.textPrimary,
    fontSize: 13,
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    backgroundColor: theme.colors.red,
  },
});
