import React, { useState } from "react";
import { View, ScrollView, StyleSheet, Platform, TouchableOpacity, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
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
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // On native (iPad) apply safe area padding; web browsers handle this themselves
  const nativePadding = Platform.OS !== "web"
    ? { paddingTop: insets.top, paddingBottom: insets.bottom }
    : undefined;

  return (
    <View style={[styles.root, nativePadding]}>
      {sidebarOpen && (
        <WebSidebar
          activeRoute={activeRoute}
          onNavigate={onNavigate}
          navItems={navItems}
          userName={userName}
          userRole={userRole}
          onLogout={onLogout}
        />
      )}
      <View style={styles.main}>
        <View style={styles.headerRow}>
          {/* Sidebar toggle button */}
          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={() => setSidebarOpen(o => !o)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather
              name={sidebarOpen ? "sidebar" : "menu"}
              size={18}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
          <View style={styles.headerFlex}>
            <WebHeader title={title} subtitle={subtitle} />
          </View>
        </View>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  toggleBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    flexShrink: 0,
  },
  headerFlex: {
    flex: 1,
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
