import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { THEMES, type ThemeColors, type AppTheme } from "./themes";

/** Returns the full current theme (colors + gradients + statusBarStyle). */
export function useAppTheme(): AppTheme {
  const name = useSelector((s: RootState) => s.theme.name);
  return THEMES[name];
}

/** Returns current theme colors directly. */
export function useThemeColors(): ThemeColors {
  const name = useSelector((s: RootState) => s.theme.name);
  return THEMES[name].colors;
}

/**
 * Creates a memoized StyleSheet from the current theme.
 *
 * Usage:
 *   function makeStyles(t: ThemeColors) {
 *     return StyleSheet.create({ container: { backgroundColor: t.bg } });
 *   }
 *   const styles = useThemedStyles(makeStyles);
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  makeStyles: (t: ThemeColors) => T
): T {
  const colors = useThemeColors();
  // makeStyles is module-level so stable; colors is the only real dep
  return useMemo(() => makeStyles(colors), [colors]); // eslint-disable-line react-hooks/exhaustive-deps
}
