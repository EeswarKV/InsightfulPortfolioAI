import React, { useState } from "react";
import { View, ScrollView, StyleSheet, Platform, TouchableOpacity } from "react-native";
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
  badgeCounts?: Record<string, number>;
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
  badgeCounts,
}: WebShellProps) {
  const insets = useSafeAreaInsets();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Top safe area — pushes header below Dynamic Island / notch on native
  const topInset = Platform.OS !== "web" ? insets.top : 0;
  const bottomInset = Platform.OS !== "web" ? insets.bottom : 0;

  return (
    <View style={[styles.root, { paddingBottom: bottomInset }]}>
      {sidebarOpen && (
        <WebSidebar
          activeRoute={activeRoute}
          onNavigate={onNavigate}
          navItems={navItems}
          userName={userName}
          userRole={userRole}
          onLogout={onLogout}
          badgeCounts={badgeCounts}
          topInset={topInset}
        />
      )}
      <View style={styles.main}>
        {/* Header row sits below Dynamic Island / notch */}
        <View style={[styles.headerRow, { paddingTop: topInset }]}>
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
