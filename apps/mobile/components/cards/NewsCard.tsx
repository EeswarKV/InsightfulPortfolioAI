import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useThemedStyles } from "../../lib/useAppTheme";
import type { ThemeColors } from "../../lib/themes";
import { Badge } from "../ui/Badge";
import type { NewsItem } from "../../types";

interface NewsCardProps {
  item: NewsItem;
}

function makeStyles(t: ThemeColors) {
  return StyleSheet.create({
    container: {
      backgroundColor: t.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: t.border,
      marginBottom: 8,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
    },
    source: {
      color: t.textMuted,
      fontSize: 12,
    },
    time: {
      color: t.textMuted,
      fontSize: 11,
      marginLeft: "auto" as any,
    },
    title: {
      color: t.textPrimary,
      fontSize: 14,
      fontWeight: "500",
      lineHeight: 20,
    },
  });
}

export function NewsCard({ item }: NewsCardProps) {
  const styles = useThemedStyles(makeStyles);

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
