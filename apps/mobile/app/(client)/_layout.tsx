import { Tabs, Slot, usePathname, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { theme } from "../../lib/theme";
import { useIsWebWide } from "../../lib/platform";
import { WebShell, type NavItem } from "../../components/layout";
import { signOut } from "../../store/slices/authSlice";
import type { AppDispatch, RootState } from "../../store";

const TAB_TITLES: Record<string, { title: string; subtitle?: string }> = {
  index: { title: "My Portfolio", subtitle: "Your portfolio overview" },
  research: { title: "Research", subtitle: "Search any company for instant analysis" },
  updates: { title: "Notifications", subtitle: "Portfolio updates and alerts" },
  news: { title: "Market News", subtitle: "Latest news for your portfolio" },
  chat: { title: "Fund Manager Assistant", subtitle: "Powered by Claude · Ask about your portfolio" },
  profile: { title: "Profile", subtitle: "Manage your account settings" },
};

const CLIENT_NAV: NavItem[] = [
  { id: "index", icon: "grid", label: "Portfolio" },
  { id: "research", icon: "search", label: "Research" },
  { id: "updates", icon: "bell", label: "Notifications" },
  { id: "news", icon: "rss", label: "News" },
  { id: "chat", icon: "message-circle", label: "Fund Manager Assistant" },
  { id: "profile", icon: "user", label: "Profile" },
];

export default function ClientLayout() {
  const isWebWide = useIsWebWide();
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((s: RootState) => s.auth);
  const { unreadCount } = useSelector((s: RootState) => s.alerts);

  const handleLogout = () => {
    dispatch(signOut());
  };

  // Get user's full name from auth metadata
  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  if (isWebWide) {
    const segment = pathname.split("/").pop() || "index";
    const activeRoute = segment === "(client)" ? "index" : segment;
    const meta = TAB_TITLES[activeRoute] || TAB_TITLES.index;

    return (
      <WebShell
        activeRoute={activeRoute}
        onNavigate={(route) => {
          if (route === "index") {
            router.push("/(client)");
          } else {
            router.push(`/(client)/${route}` as any);
          }
        }}
        navItems={CLIENT_NAV}
        title={meta.title}
        subtitle={meta.subtitle}
        userName={userName}
        userRole="Client"
        onLogout={handleLogout}
        badgeCounts={{ updates: unreadCount }}
      >
        <Slot />
      </WebShell>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Portfolio",
          tabBarIcon: ({ color, size }) => (
            <Feather name="grid" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="research"
        options={{
          title: "Research",
          tabBarIcon: ({ color, size }) => (
            <Feather name="search" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="updates"
        options={{
          title: "Notifications",
          tabBarIcon: ({ color, size }) => (
            <Feather name="bell" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="news"
        options={{
          title: "News",
          tabBarIcon: ({ color, size }) => (
            <Feather name="rss" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "AI Chat",
          tabBarIcon: ({ color, size }) => (
            <Feather name="message-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
