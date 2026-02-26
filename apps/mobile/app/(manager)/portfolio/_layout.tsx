import { Slot } from "expo-router";

// Always use <Slot> so each tab's own navigation stack manages push/pop.
// A nested <Stack> here accumulates client screens across navigations —
// e.g. visit Saral, back, visit Aparna → Stack becomes [Saral, Aparna],
// so back from Aparna goes to Saral instead of the dashboard/clients screen.
// With <Slot>, each router.push("/(manager)/portfolio/[id]") adds exactly
// one entry to the calling tab's stack and back correctly returns there.
export default function PortfolioLayout() {
  return <Slot />;
}
