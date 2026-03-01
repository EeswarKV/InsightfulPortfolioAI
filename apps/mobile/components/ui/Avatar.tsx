import React from "react";
import { Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAppTheme, useThemedStyles } from "../../lib/useAppTheme";
import type { ThemeColors } from "../../lib/themes";
import { getInitials } from "../../lib/formatters";

interface AvatarProps {
  name: string;
  size?: number;
}

function makeStyles(t: ThemeColors) {
  return StyleSheet.create({
    container: {
      alignItems: "center",
      justifyContent: "center",
    },
    text: {
      color: t.accent,
      fontWeight: "700",
    },
  });
}

export function Avatar({ name, size = 38 }: AvatarProps) {
  const styles = useThemedStyles(makeStyles);
  const { gradients } = useAppTheme();
  const initials = getInitials(name);
  const fontSize = size * 0.34;

  return (
    <LinearGradient
      colors={gradients.accentAvatar}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size * 0.26,
        },
      ]}
    >
      <Text style={[styles.text, { fontSize }]}>{initials}</Text>
    </LinearGradient>
  );
}
