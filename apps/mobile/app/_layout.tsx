import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import * as WebBrowser from "expo-web-browser";
import { Slot, useRouter, useSegments } from "expo-router";
import { Provider, useDispatch, useSelector } from "react-redux";
import * as Notifications from "expo-notifications";
import { store, RootState, AppDispatch } from "../store";
import { setSession } from "../store/slices/authSlice";
import { fetchUnreadCount } from "../store/slices/alertsSlice";
import { setTheme, loadSavedTheme } from "../store/slices/themeSlice";
import { supabase } from "../lib/supabase";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { THEMES } from "../lib/themes";
import {
  registerForPushNotifications,
  setupNotificationHandlers,
} from "../lib/notifications";

/** Reads theme from Redux and applies background color + status bar style. */
function ThemedRoot({ children }: { children: ReactNode }) {
  const themeName = useSelector((s: RootState) => s.theme.name);
  const { colors, statusBarStyle } = THEMES[themeName];
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={statusBarStyle} />
      {children}
    </View>
  );
}

function AuthGate() {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isLoading, role } = useSelector(
    (s: RootState) => s.auth
  );
  const segments = useSegments();
  const router = useRouter();

  // Rehydrate saved theme preference on first mount
  useEffect(() => {
    loadSavedTheme().then((saved) => dispatch(setTheme(saved)));
  }, [dispatch]);

  // Keep a stable ref to current role so the notification handler never goes stale
  const roleRef = useRef(role);
  useEffect(() => { roleRef.current = role; }, [role]);

  // Configure notification display behaviour and tap handler once on mount
  useEffect(() => {
    setupNotificationHandlers();

    // When user taps a notification: navigate to News tab, then open article in-app
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data ?? {};
      const url = data.url as string | undefined;

      // Navigate to the correct news screen based on role
      const newsRoute = roleRef.current === "manager" ? "/(manager)/news" : "/(client)/news";
      router.navigate(newsRoute as any);

      // Open the article URL inside the app (SFSafariViewController / Chrome Custom Tabs)
      if (url) {
        WebBrowser.openBrowserAsync(url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        }).catch(() => {});
      }
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED" && !session) {
        // Refresh failed — force sign out
        supabase.auth.signOut().catch(() => {});
        dispatch(setSession({ session: null, user: null }));
        return;
      }
      if (event === "SIGNED_OUT") {
        dispatch(setSession({ session: null, user: null }));
        return;
      }
      dispatch(setSession({ session, user: session?.user ?? null }));
    });

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        // Stale/invalid refresh token — clear session and force re-login
        supabase.auth.signOut().catch(() => {});
        dispatch(setSession({ session: null, user: null }));
        return;
      }
      dispatch(setSession({ session, user: session?.user ?? null }));
    });

    return () => subscription.unsubscribe();
  }, [dispatch]);

  // Register push token and start polling when the user logs in
  useEffect(() => {
    if (!isAuthenticated) return;

    // Register push token (non-blocking, best-effort)
    supabase.auth.getSession().then(({ data: { session } }) => {
      const accessToken = session?.access_token;
      if (accessToken) {
        registerForPushNotifications(accessToken);
      }
    });

    // Small delay to let the new session fully establish
    const timeout = setTimeout(() => dispatch(fetchUnreadCount()), 2000);
    const interval = setInterval(() => dispatch(fetchUnreadCount()), 30000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [isAuthenticated, dispatch]);

  useEffect(() => {
    if (isLoading) return;

    const firstSegment = segments[0];
    const inAuthGroup = firstSegment === "(auth)";
    const inManagerGroup = firstSegment === "(manager)";
    const inClientGroup = firstSegment === "(client)";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isAuthenticated) {
      if (inAuthGroup) {
        // Logged in but on auth screen → redirect to correct home
        if (role === "manager") {
          router.replace("/(manager)");
        } else {
          router.replace("/(client)");
        }
      } else if (role === "manager" && !inManagerGroup) {
        // Manager somehow in wrong group → redirect
        router.replace("/(manager)");
      } else if (role === "client" && !inClientGroup) {
        // Client somehow in wrong group → redirect
        router.replace("/(client)");
      }
    }
  }, [isAuthenticated, isLoading, role, segments, router]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <ThemedRoot>
        <AuthGate />
      </ThemedRoot>
    </Provider>
  );
}
