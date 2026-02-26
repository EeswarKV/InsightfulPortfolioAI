import { Stack, Slot } from "expo-router";
import { Platform } from "react-native";

// Evaluated once at module load — no hook, no re-render risk.
// On iPad and web, portfolio sits inside WebShell's ScrollView which has no
// defined height; <Stack> would collapse to 0 px there, so use <Slot>.
// On phone, keep <Stack> so back-navigation is scoped to this tab.
const USE_SLOT =
  Platform.OS === "web" ||
  (Platform.OS === "ios" && (Platform as any).isPad);

export default function PortfolioLayout() {
  if (USE_SLOT) return <Slot />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
