import { Platform, useWindowDimensions } from "react-native";

export function useIsWebWide(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === "web" && width >= 768;
}

/** True on any platform (web or native) when screen width ≥ 768 — e.g. tablets */
export function useIsTabletOrWide(): boolean {
  const { width } = useWindowDimensions();
  return width >= 768;
}

export const isWeb = Platform.OS === "web";
export const isIOS = Platform.OS === "ios";
export const isAndroid = Platform.OS === "android";
