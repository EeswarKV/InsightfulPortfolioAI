import { Platform, useWindowDimensions } from "react-native";

export function useIsWebWide(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === "web" && width >= 768;
}

/** True on any non-phone screen (width ≥ 500). Phones max at ~430px; tablets start at ~600px. */
export function useIsTabletOrWide(): boolean {
  const { width } = useWindowDimensions();
  return width >= 500;
}

export const isWeb = Platform.OS === "web";
export const isIOS = Platform.OS === "ios";
export const isAndroid = Platform.OS === "android";
