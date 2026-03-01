import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useAppTheme, useThemedStyles } from "../../lib/useAppTheme";
import type { ThemeColors } from "../../lib/themes";
import { Avatar } from "../ui/Avatar";
import { Sparkline } from "../charts/Sparkline";
import { formatCurrency, formatPercentChange } from "../../lib/formatters";
import type { Client } from "../../types";

interface ClientCardProps {
  client: Client;
  onPress: () => void;
}

function makeStyles(t: ThemeColors) {
  return StyleSheet.create({
    container: {
      backgroundColor: t.card,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: t.border,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    left: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
    },
    info: {
      flex: 1,
    },
    name: {
      color: t.textPrimary,
      fontSize: 14,
      fontWeight: "600",
      letterSpacing: -0.2,
    },
    meta: {
      color: t.textMuted,
      fontSize: 11,
      marginTop: 3,
      letterSpacing: 0.1,
    },
    right: {
      alignItems: "flex-end",
    },
    aum: {
      color: t.textPrimary,
      fontSize: 14,
      fontWeight: "600",
    },
    changeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 2,
    },
    change: {
      fontSize: 12,
      fontWeight: "600",
    },
  });
}

export function ClientCard({ client, onPress }: ClientCardProps) {
  const styles = useThemedStyles(makeStyles);
  const appTheme = useAppTheme();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.left}>
        <Avatar name={client.name} />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{client.name}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {client.holdings} holdings · {client.risk}
          </Text>
        </View>
      </View>
      <View style={styles.right}>
        <Text style={styles.aum}>{formatCurrency(client.aum)}</Text>
        <View style={styles.changeRow}>
          <Sparkline positive={client.change >= 0} />
          <Text
            style={[
              styles.change,
              { color: client.change >= 0 ? appTheme.colors.green : appTheme.colors.red },
            ]}
          >
            {formatPercentChange(client.change)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
