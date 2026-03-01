import { Tabs, Slot, usePathname, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { useAppTheme } from "../../lib/useAppTheme";
import { useIsWebWide } from "../../lib/platform";
import { WebShell } from "../../components/layout";
import { signOut } from "../../store/slices/authSlice";
import type { AppDispatch, RootState } from "../../store";

const TAB_TITLES: Record<string, { title: string; subtitle?: string }> = {
  index: { title: "Dashboard", subtitle: "Your portfolio overview" },
  clients: { title: "Clients", subtitle: "Manage client portfolios" },
  research: { title: "Research", subtitle: "Search any company for instant analysis" },
  updates: { title: "Notifications", subtitle: "Portfolio updates, alerts and call requests" },
  news: { title: "Market News", subtitle: "Latest news and financial results" },
  chat: { title: "My Assistant", subtitle: "Powered by Claude · Market analysis & strategy" },
  watchlist: { title: "Watchlists", subtitle: "Track stocks across multiple watchlists" },
  profile: { title: "Profile", subtitle: "Manage your account settings" },
  markets: { title: "NSE Market Movers", subtitle: "Live top gainers, losers & trending" },
};

export default function ManagerLayout() {
  const isWebWide = useIsWebWide();
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((s: RootState) => s.auth);
  const { unreadCount } = useSelector((s: RootState) => s.alerts);
  const { colors } = useAppTheme();

  const handleLogout = () => {
    dispatch(signOut());
  };

  // Get user's full name from auth metadata
  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  if (isWebWide) {
    const segment = pathname.split("/").pop() || "index";
    const activeRoute = segment === "(manager)" ? "index" : segment;
    const meta = TAB_TITLES[activeRoute] || TAB_TITLES.index;

    return (
      <WebShell
        activeRoute={activeRoute}
        onNavigate={(route) => {
          if (route === "index") {
            router.push("/(manager)");
          } else {
            router.push(`/(manager)/${route}` as any);
          }
        }}
        title={meta.title}
        subtitle={meta.subtitle}
        userName={userName}
        userRole="Fund Manager"
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
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Feather name="grid" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: "Clients",
          tabBarIcon: ({ color, size }) => (
            <Feather name="users" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="watchlist"
        options={{
          title: "Watchlist",
          tabBarIcon: ({ color, size }) => (
            <Feather name="bookmark" size={size} color={color} />
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
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, size }) => (
            <Feather name="menu" size={size} color={color} />
          ),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.red, fontSize: 10 },
        }}
      />
      {/* Hidden screens — accessible via More menu or deep links */}
      <Tabs.Screen name="updates"           options={{ href: null }} />
      <Tabs.Screen name="news"              options={{ href: null }} />
      <Tabs.Screen name="chat"              options={{ href: null }} />
      <Tabs.Screen name="profile"           options={{ href: null }} />
      <Tabs.Screen name="portfolio"         options={{ href: null }} />
      <Tabs.Screen name="holdings-overview" options={{ href: null }} />
      <Tabs.Screen name="markets"           options={{ href: null }} />
    </Tabs>
  );
}
