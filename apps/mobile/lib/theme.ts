/**
 * theme.ts — re-exports the dark theme as `theme` for non-component usage
 * (tab bar inline styles, constants, etc.) and re-exports all types.
 *
 * In components with StyleSheet.create, use useThemedStyles() from useAppTheme.ts instead.
 */
export { THEMES, THEME_META, spacing, radius, fontSize } from "./themes";
export type { ThemeColors, AppTheme, ThemeName } from "./themes";
export { useAppTheme, useThemeColors, useThemedStyles } from "./useAppTheme";

import { THEMES } from "./themes";

/** Static dark theme — use only outside of React components (layout configs, etc.) */
export const theme = {
  colors: THEMES.dark.colors,
  gradients: THEMES.dark.gradients,
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  borderRadius: { sm: 6, md: 10, lg: 14, xl: 16 },
  fontSize: { xs: 10, sm: 12, md: 14, lg: 16, xl: 20, xxl: 24, hero: 30 },
} as const;

export type Theme = typeof theme;
