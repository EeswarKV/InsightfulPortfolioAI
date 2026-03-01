export type ThemeColors = {
  bg: string;
  surface: string;
  surfaceHover: string;
  card: string;
  border: string;
  accent: string;
  accentSoft: string;
  green: string;
  greenSoft: string;
  red: string;
  redSoft: string;
  yellow: string;
  yellowSoft: string;
  purple: string;
  purpleSoft: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  white: string;
};

export type ThemeGradients = {
  accent: [string, string];
  accentAvatar: [string, string];
};

export type AppTheme = {
  name: ThemeName;
  colors: ThemeColors;
  gradients: ThemeGradients;
  statusBarStyle: "light" | "dark";
};

export type ThemeName = "dark" | "light" | "orange";

// ── Dark (default) ──────────────────────────────────────────────────────────────
const dark: AppTheme = {
  name: "dark",
  statusBarStyle: "light",
  colors: {
    bg: "#0A0E1A",
    surface: "#111628",
    surfaceHover: "#1A2035",
    card: "#151B2E",
    border: "#1D2540",
    accent: "#4F8CFF",
    accentSoft: "rgba(79,140,255,0.12)",
    green: "#34D399",
    greenSoft: "rgba(52,211,153,0.12)",
    red: "#F87171",
    redSoft: "rgba(248,113,113,0.12)",
    yellow: "#FBBF24",
    yellowSoft: "rgba(251,191,36,0.12)",
    purple: "#A78BFA",
    purpleSoft: "rgba(167,139,250,0.12)",
    textPrimary: "#E8ECF4",
    textSecondary: "#8B95B0",
    textMuted: "#5A6480",
    white: "#FFFFFF",
  },
  gradients: {
    accent: ["#4F8CFF", "#6C5CE7"],
    accentAvatar: ["rgba(79,140,255,0.2)", "rgba(108,92,231,0.2)"],
  },
};

// ── Light ───────────────────────────────────────────────────────────────────────
const light: AppTheme = {
  name: "light",
  statusBarStyle: "dark",
  colors: {
    bg: "#F0F4F8",
    surface: "#FFFFFF",
    surfaceHover: "#F8FAFC",
    card: "#FFFFFF",
    border: "#E2E8F0",
    accent: "#3B82F6",
    accentSoft: "rgba(59,130,246,0.10)",
    green: "#10B981",
    greenSoft: "rgba(16,185,129,0.10)",
    red: "#EF4444",
    redSoft: "rgba(239,68,68,0.10)",
    yellow: "#F59E0B",
    yellowSoft: "rgba(245,158,11,0.10)",
    purple: "#8B5CF6",
    purpleSoft: "rgba(139,92,246,0.10)",
    textPrimary: "#0F172A",
    textSecondary: "#475569",
    textMuted: "#94A3B8",
    white: "#FFFFFF",
  },
  gradients: {
    accent: ["#3B82F6", "#6C5CE7"],
    accentAvatar: ["rgba(59,130,246,0.15)", "rgba(108,92,231,0.15)"],
  },
};

// ── Orange ──────────────────────────────────────────────────────────────────────
const orange: AppTheme = {
  name: "orange",
  statusBarStyle: "light",
  colors: {
    bg: "#0D0A07",
    surface: "#161009",
    surfaceHover: "#1E160C",
    card: "#1A1209",
    border: "#2A1E10",
    accent: "#F97316",
    accentSoft: "rgba(249,115,22,0.12)",
    green: "#34D399",
    greenSoft: "rgba(52,211,153,0.12)",
    red: "#F87171",
    redSoft: "rgba(248,113,113,0.12)",
    yellow: "#FBBF24",
    yellowSoft: "rgba(251,191,36,0.12)",
    purple: "#A78BFA",
    purpleSoft: "rgba(167,139,250,0.12)",
    textPrimary: "#FFF3E0",
    textSecondary: "#C4A882",
    textMuted: "#7A6045",
    white: "#FFFFFF",
  },
  gradients: {
    accent: ["#F97316", "#EA580C"],
    accentAvatar: ["rgba(249,115,22,0.2)", "rgba(234,88,12,0.2)"],
  },
};

export const THEMES: Record<ThemeName, AppTheme> = { dark, light, orange };

export const THEME_META: Record<ThemeName, { label: string; preview: string; bg: string; accent: string }> = {
  dark:   { label: "Dark",   preview: "Deep blue dark mode",      bg: "#0A0E1A", accent: "#4F8CFF" },
  light:  { label: "Light",  preview: "Clean light mode",         bg: "#F0F4F8", accent: "#3B82F6" },
  orange: { label: "Orange", preview: "Warm dark with orange",    bg: "#0D0A07", accent: "#F97316" },
};

// Shared non-color tokens (same across all themes)
export const spacing  = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius   = { sm: 6, md: 10, lg: 14, xl: 16 } as const;
export const fontSize = { xs: 10, sm: 12, md: 14, lg: 16, xl: 20, xxl: 24, hero: 30 } as const;
