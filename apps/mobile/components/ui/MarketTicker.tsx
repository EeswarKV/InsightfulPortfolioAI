import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Platform,
} from "react-native";
import { useThemeColors, useThemedStyles } from "../../lib/useAppTheme";
import type { ThemeColors } from "../../lib/themes";
import { fetchGlobalQuotes, type GlobalQuote } from "../../lib/globalMarketApi";

const ITEM_WIDTH = 200;
const SPEED_PX_PER_MS = 0.055; // ~18px/s — comfortable reading speed
const REFRESH_INTERVAL = 60_000; // 1 minute

function formatPrice(price: number, currency: string): string {
  if (price === 0) return "—";
  if (currency === "USD") {
    if (price >= 1000) return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
    if (price >= 100) return price.toFixed(2);
    return price.toFixed(4);
  }
  if (price >= 1000) return price.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  return price.toFixed(2);
}

const SKELETON_ITEMS = [
  "S&P 500", "NASDAQ", "Nifty 50", "Sensex",
  "Nikkei 225", "Shanghai", "FTSE 100", "DAX",
  "Gold", "Silver", "Bitcoin", "Ethereum",
];

function makeStyles(t: ThemeColors) {
  return StyleSheet.create({
    container: {
      height: 40,
      backgroundColor: t.surface,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
      overflow: "hidden",
      flexDirection: "row",
      alignItems: "center",
    },
    track: {
      flexDirection: "row",
      alignItems: "center",
    },
    item: {
      width: ITEM_WIDTH,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
    },
    name: {
      color: t.textMuted,
      fontSize: 11,
      fontWeight: "500",
      width: 64,
    },
    price: {
      color: t.textPrimary,
      fontSize: 11,
      fontWeight: "600",
      width: 56,
      textAlign: "right",
    },
    change: {
      fontSize: 10,
      fontWeight: "600",
      width: 48,
      textAlign: "right",
    },
    sep: {
      width: 1,
      height: 16,
      backgroundColor: t.border,
      marginLeft: 4,
    },
    fadeLeft: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: 24,
      zIndex: 1,
    },
    fadeRight: {
      position: "absolute",
      right: 0,
      top: 0,
      bottom: 0,
      width: 24,
      zIndex: 1,
    },
  });
}

export function MarketTicker() {
  const [items, setItems] = useState<GlobalQuote[]>([]);
  const translateX = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();

  const loadData = async () => {
    const data = await fetchGlobalQuotes();
    if (data.length > 0) setItems(data);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Restart animation when items change
  useEffect(() => {
    animRef.current?.stop();
    translateX.setValue(0);

    const count = items.length || SKELETON_ITEMS.length;
    const totalW = count * ITEM_WIDTH;
    const duration = totalW / SPEED_PX_PER_MS;

    animRef.current = Animated.loop(
      Animated.timing(translateX, {
        toValue: -totalW,
        duration,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== "web",
      })
    );
    animRef.current.start();

    return () => {
      animRef.current?.stop();
    };
  }, [items.length]);

  const displayItems = items.length > 0
    ? [...items, ...items]  // duplicate for seamless loop
    : [...SKELETON_ITEMS, ...SKELETON_ITEMS].map((name) => ({
        symbol: name,
        name,
        price: 0,
        change: 0,
        changePercent: 0,
        currency: "USD",
      }));

  return (
    <View style={styles.container}>
      {/* Left fade mask */}
      <View style={styles.fadeLeft} pointerEvents="none" />

      <Animated.View
        style={[styles.track, { transform: [{ translateX }] }]}
      >
        {displayItems.map((item, i) => {
          const isPos = item.changePercent >= 0;
          const changeColor = item.price === 0
            ? colors.textMuted
            : isPos ? colors.green : colors.red;

          return (
            <View key={i} style={styles.item}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.price} numberOfLines={1}>
                {item.price === 0
                  ? "···"
                  : formatPrice(item.price, item.currency)}
              </Text>
              <Text style={[styles.change, { color: changeColor }]} numberOfLines={1}>
                {item.price === 0
                  ? ""
                  : `${isPos ? "▲" : "▼"} ${Math.abs(item.changePercent).toFixed(2)}%`}
              </Text>
              {/* Separator */}
              <View style={styles.sep} />
            </View>
          );
        })}
      </Animated.View>

      {/* Right fade mask */}
      <View style={styles.fadeRight} pointerEvents="none" />
    </View>
  );
}
