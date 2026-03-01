import React from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAppTheme, useThemedStyles } from "../../lib/useAppTheme";
import type { ThemeColors } from "../../lib/themes";

interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

function makeStyles(t: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 10,
      paddingHorizontal: 12,
    },
    icon: {
      marginRight: 8,
    },
    input: {
      flex: 1,
      paddingVertical: 12,
      fontSize: 14,
      color: t.textPrimary,
    },
  });
}

export function SearchInput({
  value,
  onChangeText,
  placeholder = "Search...",
}: SearchInputProps) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useAppTheme();

  return (
    <View style={styles.container}>
      <Feather
        name="search"
        size={16}
        color={colors.textMuted}
        style={styles.icon}
      />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
    </View>
  );
}
