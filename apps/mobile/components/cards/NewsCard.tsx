import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "../../lib/theme";
import { Badge } from "../ui/Badge";
import type { NewsItem } from "../../types";

interface NewsCardProps {
  item: NewsItem;
}

export function NewsCard({ item }: NewsCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {item.symbol && (
          <Badge
            color={item.sentiment === "positive" ? "green" : "red"}
            small
          >
            {item.symbol}
          </Badge>
        )}
        <Text style={styles.source}>{item.source}</Text>
        <Text style={styles.time}>{item.time}</Text>
      </View>
      <Text style={styles.title}>{item.title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  source: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  time: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginLeft: "auto",
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
});
