import React from "react";
import { View, ScrollView, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebSidebar, NavItem } from "./WebSidebar";
import { WebHeader } from "./WebHeader";
import { MarketTicker } from "../ui/MarketTicker";
import { theme } from "../../lib/theme";

interface WebShellProps {
  children: React.ReactNode;
  activeRoute: string;
  onNavigate: (route: string) => void;
  navItems?: NavItem[];
  title: string;
  subtitle?: string;
  userName?: string;
  userRole?: string;
  onLogout?: () => void;
  scroll?: boolean;
}

export function WebShell({
  children,
  activeRoute,
  onNavigate,
  navItems,
  title,
  subtitle,
  userName,
  userRole,
  onLogout,
  scroll = true,
}: WebShellProps) {
  const insets = useSafeAreaInsets();
  // On native (iPad) apply safe area padding; web browsers handle this themselves
  const nativePadding = Platform.OS !== "web"
    ? { paddingTop: insets.top, paddingBottom: insets.bottom }
    : undefined;

  return (
    <View style={[styles.root, nativePadding]}>
      <WebSidebar
        activeRoute={activeRoute}
        onNavigate={onNavigate}
        navItems={navItems}
        userName={userName}
        userRole={userRole}
        onLogout={onLogout}
      />
      <View style={styles.main}>
        <WebHeader title={title} subtitle={subtitle} />
        <MarketTicker />
        {scroll ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={styles.fill}>{children}</View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: theme.colors.bg,
  },
  main: {
    flex: 1,
    flexDirection: "column",
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 32,
  },
  fill: {
    flex: 1,
  },
});
