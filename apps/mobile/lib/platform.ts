import { Platform, useWindowDimensions } from "react-native";

export function useIsWebWide(): boolean {
  const { width } = useWindowDimensions();
  // iPad gets the full wide layout (sidebar + two-column) just like web
  if (Platform.OS === "ios" && (Platform as any).isPad) return true;
  return Platform.OS === "web" && width >= 768;
}

/** True on any non-phone screen: iPad (via Platform.isPad), Android tablet, or web ≥ 500px. */
export function useIsTabletOrWide(): boolean {
  const { width } = useWindowDimensions();
  // Platform.isPad is the definitive iOS iPad detector — more reliable than dimension checks
  if (Platform.OS === "ios" && (Platform as any).isPad) return true;
  return width >= 500;
}

export const isWeb = Platform.OS === "web";
export const isIOS = Platform.OS === "ios";
export const isAndroid = Platform.OS === "android";
