import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { WebSidebar, NavItem } from "./WebSidebar";
import { WebHeader } from "./WebHeader";
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
  return (
    <View style={styles.root}>
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
