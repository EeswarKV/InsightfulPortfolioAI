import Constants from "expo-constants";
import { Platform } from "react-native";

export { theme } from "./theme";

function resolveApiUrl(): string {
  // Explicit env var always wins
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // On web, localhost works fine
  if (Platform.OS === "web") {
    return "http://localhost:8000";
  }
  // On native (iOS/Android), derive dev machine IP from Expo's hostUri
  // hostUri looks like "192.168.1.5:8081"
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    return `http://${host}:8000`;
  }
  return "http://localhost:8000";
}

export const API_URL = resolveApiUrl();

export const Colors = {
  primary: "#4F8CFF",
  primaryDark: "#6C5CE7",
  background: "#0A0E1A",
  surface: "#111628",
  text: "#E8ECF4",
  textSecondary: "#8B95B0",
  border: "#1D2540",
  error: "#F87171",
  success: "#34D399",
} as const;
