import { Stack, Slot } from "expo-router";
import { useIsWebWide } from "../../../lib/platform";

export default function PortfolioLayout() {
  const isWide = useIsWebWide();
  // On tablet/web the portfolio screen is rendered inside WebShell's ScrollView
  // which has no defined height — a Stack navigator would collapse to 0px.
  // Use <Slot /> there so content flows directly into the parent container.
  // On mobile, keep <Stack> so back-navigation history works correctly within
  // the portfolio tab (back from client A goes back to wherever you came from,
  // not to another client's portfolio that happened to be in the global history).
  if (isWide) return <Slot />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
