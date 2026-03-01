import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAppTheme, useThemedStyles } from "../../lib/useAppTheme";
import type { ThemeColors } from "../../lib/themes";

interface GradientButtonProps {
  onPress: () => void;
  title: string;
  disabled?: boolean;
  loading?: boolean;
}

function makeStyles(t: ThemeColors) {
  return StyleSheet.create({
    gradient: {
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: "center",
    },
    disabled: {
      opacity: 0.6,
    },
    text: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "600",
    },
  });
}

export function GradientButton({
  onPress,
  title,
  disabled,
  loading,
}: GradientButtonProps) {
  const styles = useThemedStyles(makeStyles);
  const { gradients } = useAppTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={gradients.accent}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, (disabled || loading) && styles.disabled]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.text}>{title}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}
