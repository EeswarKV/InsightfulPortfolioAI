import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemedStyles } from "../../lib/useAppTheme";
import type { ThemeColors } from "../../lib/themes";

interface ScreenContainerProps {
  children: React.ReactNode;
  scroll?: boolean;
}

function makeStyles(t: ThemeColors) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: t.card,
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
}

export function ScreenContainer({
  children,
  scroll = true,
}: ScreenContainerProps) {
  const styles = useThemedStyles(makeStyles);

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
