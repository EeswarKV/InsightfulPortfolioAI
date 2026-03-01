import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { API_URL } from "./constants";

// Show banners and play sound while app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function setupNotificationHandlers(): Promise<void> {
  // iOS requires explicitly setting the notification channel on Android 8+
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#4F8CFF",
    });
  }
}

export async function registerForPushNotifications(
  accessToken: string
): Promise<void> {
  // Physical device only — simulators/emulators don't support push tokens
  if (!Device.isDevice) {
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return;
  }

  // Get the Expo push token
  let tokenData: Notifications.ExpoPushToken;
  try {
    tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: "9e1a97f4-9544-4836-ab99-28ebf911081e",
    });
  } catch {
    return;
  }

  const token = tokenData.data;
  const platform = Platform.OS === "ios" ? "ios" : "android";

  // Register token with our backend
  try {
    await fetch(`${API_URL}/push/register-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token, platform }),
    });
  } catch {
    // Non-critical — ignore network errors
  }
}

export async function unregisterPushToken(
  accessToken: string,
  token: string
): Promise<void> {
  const platform = Platform.OS === "ios" ? "ios" : "android";
  try {
    await fetch(`${API_URL}/push/unregister-token`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token, platform }),
    });
  } catch {
    // Best-effort
  }
}
