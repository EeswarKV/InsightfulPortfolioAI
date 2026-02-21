import { Tabs, Slot, usePathname, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { theme } from "../../lib/theme";
import { useIsWebWide } from "../../lib/platform";
import { WebShell } from "../../components/layout";
import { signOut } from "../../store/slices/authSlice";
import type { AppDispatch, RootState } from "../../store";

const TAB_TITLES: Record<string, { title: string; subtitle?: string }> = {
  index: { title: "Dashboard", subtitle: "Your portfolio overview" },
  clients: { title: "Clients", subtitle: "Manage client portfolios" },
  research: { title: "Research", subtitle: "Search any company for instant analysis" },
  updates: { title: "Notifications", subtitle: "Portfolio updates, alerts and call requests" },
  chat: { title: "My AI Assistant", subtitle: "Powered by Claude · Market analysis & strategy" },
  profile: { title: "Profile", subtitle: "Manage your account settings" },
};

export default function ManagerLayout() {
  const isWebWide = useIsWebWide();
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((s: RootState) => s.auth);

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
        name="chat"
        options={{
          title: "AI Chat",
          tabBarIcon: ({ color, size }) => (
            <Feather name="message-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          href: null,
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
