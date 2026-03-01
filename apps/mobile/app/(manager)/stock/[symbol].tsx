import { useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { ScreenContainer } from "../../../components/layout";
import { useAppTheme, useThemeColors, useThemedStyles } from "../../../lib/useAppTheme";
import type { ThemeColors } from "../../../lib/themes";

type Interval = "1D" | "1W" | "1M" | "3M" | "1Y" | "ALL";

const INTERVALS: { label: Interval; tv: string }[] = [
  { label: "1D",  tv: "5"   },   // 5-minute candles for 1 day
  { label: "1W",  tv: "60"  },   // 1-hour candles for 1 week
  { label: "1M",  tv: "D"   },   // daily for 1 month
  { label: "3M",  tv: "D"   },   // daily for 3 months
  { label: "1Y",  tv: "W"   },   // weekly for 1 year
  { label: "ALL", tv: "M"   },   // monthly for all time
];

// Range params TradingView widget accepts
const TV_RANGE: Record<Interval, string> = {
  "1D":  "1D",
  "1W":  "1W",
  "1M":  "1M",
  "3M":  "3M",
  "1Y":  "12M",
  "ALL": "60M",
};

function makeStyles(t: ThemeColors) {
  return StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
      gap: 12,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      alignItems: "center",
      justifyContent: "center",
    },
    symbolText: {
      color: t.textPrimary,
      fontSize: 20,
      fontWeight: "700",
      flex: 1,
    },
    intervalRow: {
      flexDirection: "row",
      marginHorizontal: 16,
      marginBottom: 10,
      backgroundColor: t.surface,
      borderRadius: 10,
      padding: 3,
    },
    intervalBtn: {
      flex: 1,
      paddingVertical: 7,
      alignItems: "center",
      borderRadius: 8,
    },
    intervalBtnActive: {
      backgroundColor: t.accent,
    },
    intervalText: {
      color: t.textMuted,
      fontSize: 11,
      fontWeight: "600",
    },
    intervalTextActive: {
      color: "#fff",
    },
    chartWrap: {
      flex: 1,
      marginHorizontal: 0,
      backgroundColor: t.surface,
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.surface,
      zIndex: 10,
    },
  });
}

function buildTvHtml(tvSymbol: string, interval: string, range: string, theme: "dark" | "light"): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: transparent; }
    #tv_chart_container { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="tv_chart_container"></div>
  <script src="https://s3.tradingview.com/tv.js"></script>
  <script>
    new TradingView.widget({
      container_id: "tv_chart_container",
      width: "100%",
      height: "100%",
      symbol: "${tvSymbol}",
      interval: "${interval}",
      range: "${range}",
      timezone: "Asia/Kolkata",
      theme: "${theme}",
      style: "1",
      locale: "en",
      toolbar_bg: "transparent",
      enable_publishing: false,
      hide_side_toolbar: true,
      hide_top_toolbar: false,
      allow_symbol_change: false,
      save_image: false,
      studies: [],
      show_popup_button: false,
      withdateranges: false,
      details: false,
      hotlist: false,
      calendar: false,
      hide_volume: false,
    });
  </script>
</body>
</html>`;
}

export default function StockDetailScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();
  const { name: themeName } = useAppTheme();

  const [interval, setInterval] = useState<Interval>("3M");
  const [webviewLoading, setWebviewLoading] = useState(true);
  const webviewRef = useRef<WebView>(null);

  // TradingView uses "NSE:RELIANCE" format
  const tvSymbol = `NSE:${symbol?.replace(/\.(NS|BSE|NSE|BO)$/i, "").toUpperCase()}`;

  // Map app theme to TradingView theme
  const tvTheme = themeName === "light" ? "light" : "dark";

  const current = INTERVALS.find((i) => i.label === interval) ?? INTERVALS[2];
  const tvHtml = buildTvHtml(tvSymbol, current.tv, TV_RANGE[interval], tvTheme);

  return (
    <ScreenContainer scroll={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.symbolText}>{symbol}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>NSE</Text>
      </View>

      {/* Interval selector */}
      <View style={styles.intervalRow}>
        {INTERVALS.map((iv) => (
          <TouchableOpacity
            key={iv.label}
            style={[styles.intervalBtn, interval === iv.label && styles.intervalBtnActive]}
            onPress={() => {
              setWebviewLoading(true);
              setInterval(iv.label);
            }}
          >
            <Text style={[styles.intervalText, interval === iv.label && styles.intervalTextActive]}>
              {iv.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* TradingView chart */}
      <View style={styles.chartWrap}>
        <WebView
          ref={webviewRef}
          key={`${tvSymbol}-${interval}-${tvTheme}`}
          source={{ html: tvHtml }}
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          onLoadEnd={() => setWebviewLoading(false)}
          onError={() => setWebviewLoading(false)}
          scrollEnabled={false}
          style={{ flex: 1, backgroundColor: "transparent" }}
        />
        {webviewLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 10 }}>
              Loading chart…
            </Text>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}
