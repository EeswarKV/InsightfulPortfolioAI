import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../../lib/theme";

interface ScreenContainerProps {
  children: React.ReactNode;
  scroll?: boolean;
}

export function ScreenContainer({
  children,
  scroll = true,
}: ScreenContainerProps) {
  if (scroll) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.flex}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 20,
  },
  flex: {
    flex: 1,
  },
});
