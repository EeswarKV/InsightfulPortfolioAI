import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../../lib/theme";
import { signOut } from "../../store/slices/authSlice";
import type { AppDispatch, RootState } from "../../store";

type FeatherIconName = keyof typeof Feather.glyphMap;

interface MenuItem {
  route: string;
  label: string;
  icon: FeatherIconName;
  badge?: number;
  description?: string;
  tint?: string;
}

export default function MoreScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((s: RootState) => s.auth);
  const { unreadCount } = useSelector((s: RootState) => s.alerts);

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const userEmail = user?.email || "";
  const initials = userName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  const menuItems: MenuItem[] = [
    {
      route: "/(manager)/updates",
      label: "Notifications",
      icon: "bell",
      badge: unreadCount > 0 ? unreadCount : undefined,
      description: "Alerts, price triggers & updates",
      tint: theme.colors.accent,
    },
    {
      route: "/(manager)/markets",
      label: "Market Movers",
      icon: "bar-chart-2",
      description: "NSE top gainers, losers & trending",
      tint: "#10B981",
    },
    {
      route: "/(manager)/news",
      label: "Market News",
      icon: "rss",
      description: "Latest headlines & financial results",
      tint: "#F59E0B",
    },
    {
      route: "/(manager)/chat",
      label: "My Assistant",
      icon: "message-circle",
      description: "Claude-powered market analysis",
      tint: "#8B5CF6",
    },
    {
      route: "/(manager)/profile",
      label: "Profile & Settings",
      icon: "user",
      description: "Account, preferences, security",
      tint: "#14B8A6",
    },
  ];

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* User card */}
      <LinearGradient
        colors={[theme.colors.accent, "#6366F1"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.userCard}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userEmail}>{userEmail}</Text>
        </View>
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => router.push("/(manager)/profile" as any)}
        >
          <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Menu items */}
      <View style={styles.menuCard}>
        {menuItems.map((item, idx) => (
          <TouchableOpacity
            key={item.route}
            style={[styles.menuItem, idx < menuItems.length - 1 && styles.menuItemBorder]}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.6}
          >
            <View style={[styles.menuIcon, { backgroundColor: `${item.tint}18` }]}>
              <Feather name={item.icon} size={18} color={item.tint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>{item.label}</Text>
              {item.description && (
                <Text style={styles.menuDesc}>{item.description}</Text>
              )}
            </View>
            {item.badge ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.badge > 99 ? "99+" : item.badge}</Text>
              </View>
            ) : (
              <Feather name="chevron-right" size={15} color={theme.colors.textMuted} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* App info */}
      <Text style={styles.version}>Insightful Portfolio · Fund Manager</Text>

      {/* Log out */}
      <TouchableOpacity style={styles.logoutBtn} onPress={() => dispatch(signOut())}>
        <Feather name="log-out" size={16} color={theme.colors.red} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 16, paddingBottom: 40 },

  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  userName: { color: "#fff", fontSize: 16, fontWeight: "700" },
  userEmail: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2 },
  profileBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  menuCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: "600" },
  menuDesc: { color: theme.colors.textMuted, fontSize: 11, marginTop: 2 },
  badge: {
    backgroundColor: theme.colors.red,
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  version: {
    color: theme.colors.textMuted,
    fontSize: 11,
    textAlign: "center",
    marginBottom: 16,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${theme.colors.red}40`,
    backgroundColor: `${theme.colors.red}0D`,
  },
  logoutText: { color: theme.colors.red, fontSize: 14, fontWeight: "600" },
});
