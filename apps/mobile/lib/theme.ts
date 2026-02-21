export const theme = {
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
    accent: ["#4F8CFF", "#6C5CE7"] as [string, string],
    accentAvatar: [
      "rgba(79,140,255,0.2)",
      "rgba(108,92,231,0.2)",
    ] as [string, string],
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 16,
  },
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 20,
    xxl: 24,
    hero: 30,
  },
} as const;

export type Theme = typeof theme;
