import React from "react";
import { Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../../lib/theme";
import { getInitials } from "../../lib/formatters";

interface AvatarProps {
  name: string;
  size?: number;
}

export function Avatar({ name, size = 38 }: AvatarProps) {
  const initials = getInitials(name);
  const fontSize = size * 0.34;

  return (
    <LinearGradient
      colors={theme.gradients.accentAvatar}
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

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: theme.colors.accent,
    fontWeight: "700",
  },
});
