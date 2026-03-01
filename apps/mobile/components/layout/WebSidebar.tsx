import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../../lib/theme";

export interface NavItem {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  label: string;
}

interface WebSidebarProps {
  activeRoute: string;
  onNavigate: (route: string) => void;
  navItems?: NavItem[];
  userName?: string;
  userRole?: string;
  onLogout?: () => void;
  badgeCounts?: Record<string, number>;
  /** Safe area top inset — push logo below Dynamic Island / notch on native */
  topInset?: number;
}

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { id: "index", icon: "grid", label: "Dashboard" },
  { id: "clients", icon: "users", label: "Clients" },
  { id: "research", icon: "search", label: "Research" },
  { id: "watchlist", icon: "bookmark", label: "Watchlists" },
  { id: "news", icon: "rss", label: "News" },
  { id: "updates", icon: "bell", label: "Notifications" },
  { id: "chat", icon: "message-circle", label: "My Assistant" },
  { id: "profile", icon: "user", label: "Profile" },
];

export function WebSidebar({
  activeRoute,
  onNavigate,
  navItems = DEFAULT_NAV_ITEMS,
  userName = "User",
  userRole = "Fund Manager",
  onLogout,
  badgeCounts = {},
  topInset = 0,
}: WebSidebarProps) {
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("");

  return (
    <View style={styles.container}>
      {/* Logo area respects safe area so it sits below the Dynamic Island */}
      <View style={[styles.logoArea, { paddingTop: Math.max(24, topInset + 12) }]}>
        <LinearGradient
          colors={theme.gradients.accent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logoIcon}
        >
          <Feather name="bar-chart-2" size={18} color="#fff" />
        </LinearGradient>
        <View style={styles.logoText}>
          <Text style={styles.logoTitle} numberOfLines={1}>Insightful</Text>
          <Text style={styles.logoSub} numberOfLines={1}>PORTFOLIO</Text>
        </View>
      </View>

      <View style={styles.nav}>
        {navItems.map((item) => {
          const isActive = activeRoute === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => onNavigate(item.id)}
              activeOpacity={0.7}
            >
              <View style={styles.navIconWrap}>
                <Feather
                  name={item.icon}
                  size={18}
                  color={isActive ? theme.colors.accent : theme.colors.textMuted}
                />
                {(badgeCounts[item.id] ?? 0) > 0 && (
                  <View style={styles.iconBadge} />
                )}
              </View>
              <Text
                numberOfLines={1}
                style={[styles.navLabel, isActive && styles.navLabelActive]}
              >
                {item.label}
              </Text>
              {(badgeCounts[item.id] ?? 0) > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {badgeCounts[item.id] > 99 ? "99+" : badgeCounts[item.id]}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.userArea}>
        <LinearGradient
          colors={theme.gradients.accent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.userAvatar}
        >
          <Text style={styles.userInitials}>{initials}</Text>
        </LinearGradient>
        <View style={styles.userText}>
          <Text style={styles.userName} numberOfLines={1}>{userName}</Text>
          <Text style={styles.userRole} numberOfLines={1}>{userRole}</Text>
        </View>
        {onLogout && (
          <TouchableOpacity onPress={onLogout} activeOpacity={0.7} style={styles.logoutBtn}>
            <Feather name="log-out" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 240,
    backgroundColor: theme.colors.surface,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
    flexDirection: "column",
  },
  logoArea: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoText: {
    flex: 1,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  logoTitle: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  logoSub: {
    color: theme.colors.textMuted,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  nav: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 2,
  },
  navItemActive: {
    backgroundColor: theme.colors.accentSoft,
  },
  navLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "400",
    color: theme.colors.textSecondary,
  },
  navLabelActive: {
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  userArea: {
    padding: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  userText: {
    flex: 1,
    minWidth: 0,
  },
  userInitials: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  userName: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: "500",
  },
  userRole: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  logoutBtn: {
    padding: 8,
    borderRadius: 8,
    flexShrink: 0,
  },
  navIconWrap: {
    position: "relative",
  },
  iconBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.red,
    borderWidth: 1,
    borderColor: theme.colors.surface,
  },
  badge: {
    marginLeft: "auto" as any,
    backgroundColor: theme.colors.red,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
});
