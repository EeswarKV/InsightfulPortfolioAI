import { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { Feather } from "@expo/vector-icons";
import { theme } from "../../lib/theme";
import { useIsWebWide } from "../../lib/platform";
import { ScreenContainer } from "../../components/layout";
import {
  fetchAlerts,
  markAlertRead,
} from "../../store/slices/alertsSlice";
import { checkPriceAlerts } from "../../store/slices/priceAlertsSlice";
import type { AppDispatch, RootState } from "../../store";

const ALERT_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  portfolio_update: "briefcase",
  transaction: "trending-up",
  call_request: "phone-incoming",
  call_scheduled: "phone-call",
  price_alert: "bell",
};

const ALERT_COLORS: Record<string, string> = {
  portfolio_update: theme.colors.accent,
  transaction: theme.colors.green,
  call_request: theme.colors.yellow ?? "#f59e0b",
  call_scheduled: theme.colors.green,
  price_alert: theme.colors.yellow ?? "#f59e0b",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function UpdatesScreen() {
  const isWide = useIsWebWide();
  const dispatch = useDispatch<AppDispatch>();
  const { alerts, isLoading } = useSelector((s: RootState) => s.alerts);

  useEffect(() => {
    dispatch(fetchAlerts());
    dispatch(checkPriceAlerts());
  }, [dispatch]);

  const handlePress = (alertId: string, read: boolean) => {
    if (!read) {
      dispatch(markAlertRead(alertId));
    }
  };

  const content = (
    <>
      {!isWide && (
        <Text style={styles.pageTitle}>Notifications</Text>
      )}

      <View style={isWide ? styles.narrowWrap : undefined}>
        {isLoading && alerts.length === 0 ? (
          <ActivityIndicator
            color={theme.colors.accent}
            style={{ marginTop: 40 }}
          />
        ) : alerts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="bell-off" size={32} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptyText}>
              You'll see portfolio updates and messages here.
            </Text>
          </View>
        ) : (
          alerts.map((alert) => (
            <TouchableOpacity
              key={alert.id}
              style={[
                styles.card,
                isWide && styles.cardWide,
                !alert.read && styles.cardUnread,
              ]}
              activeOpacity={0.7}
              onPress={() => handlePress(alert.id, alert.read)}
            >
              <View style={styles.topRow}>
                <View
                  style={[
                    styles.iconWrap,
                    {
                      backgroundColor:
                        (ALERT_COLORS[alert.type] || theme.colors.accent) + "18",
                    },
                  ]}
                >
                  <Feather
                    name={ALERT_ICONS[alert.type] || "bell"}
                    size={16}
                    color={ALERT_COLORS[alert.type] || theme.colors.accent}
                  />
                </View>
                <View style={styles.textWrap}>
                  <Text
                    style={[
                      styles.alertMessage,
                      !alert.read && styles.alertMessageUnread,
                    ]}
                  >
                    {alert.message}
                  </Text>
                  <Text style={styles.time}>{timeAgo(alert.created_at)}</Text>
                </View>
                {!alert.read && <View style={styles.unreadDot} />}
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </>
  );

  if (isWide) {
    return <View style={styles.webWrap}>{content}</View>;
  }

  return <ScreenContainer>{content}</ScreenContainer>;
}

const styles = StyleSheet.create({
  webWrap: {
    flex: 1,
  },
  pageTitle: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
  },
  narrowWrap: {
    maxWidth: 800,
  },
  emptyCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    padding: 32,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    gap: 8,
    marginTop: 16,
  },
  emptyTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: "center",
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
  },
  cardWide: {
    borderRadius: 14,
    padding: 20,
    marginBottom: 10,
  },
  cardUnread: {
    borderColor: theme.colors.accent + "40",
    backgroundColor: theme.colors.accent + "08",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
  },
  alertMessage: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    lineHeight: 19,
  },
  alertMessageUnread: {
    fontWeight: "600",
  },
  time: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.accent,
  },
});
