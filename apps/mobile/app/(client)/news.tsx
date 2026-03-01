import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Image,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Feather } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { useThemeColors, useThemedStyles } from "../../lib/useAppTheme";
import type { ThemeColors } from "../../lib/themes";
import { ScreenContainer } from "../../components/layout";
import { fetchMarketNews, fetchCompanyNews, type NewsItem } from "../../lib/newsApi";
import type { RootState } from "../../store";

type Tab = "market" | "portfolio";

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function makeStyles(t: ThemeColors) {
  return StyleSheet.create({
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: t.card,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 10,
      marginHorizontal: 16,
      marginTop: 16,
      marginBottom: 8,
      paddingHorizontal: 12,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 10,
      color: t.textPrimary,
      fontSize: 14,
    },
    clearBtn: {
      padding: 4,
    },
    tabRow: {
      flexDirection: "row",
      marginHorizontal: 16,
      marginBottom: 8,
      backgroundColor: t.card,
      borderRadius: 10,
      padding: 3,
      borderWidth: 1,
      borderColor: t.border,
    },
    tab: {
      flex: 1,
      paddingVertical: 8,
      alignItems: "center",
      borderRadius: 8,
    },
    tabActive: {
      backgroundColor: t.accent,
    },
    tabLabel: {
      fontSize: 13,
      fontWeight: "500",
      color: t.textMuted,
    },
    tabLabelActive: {
      color: "#fff",
      fontWeight: "600",
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },
    emptyText: {
      color: t.textMuted,
      fontSize: 14,
    },
    list: {
      flex: 1,
    },
    listContent: {
      padding: 16,
      paddingTop: 8,
      gap: 10,
    },
    card: {
      backgroundColor: t.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.border,
      padding: 14,
    },
    cardContent: {
      flexDirection: "row",
      gap: 12,
    },
    cardMain: {
      flex: 1,
      gap: 4,
    },
    cardTitle: {
      color: t.textPrimary,
      fontSize: 14,
      fontWeight: "600",
      lineHeight: 20,
    },
    cardSummary: {
      color: t.textSecondary,
      fontSize: 12,
      lineHeight: 17,
    },
    cardMeta: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 4,
      marginTop: 4,
    },
    metaSource: {
      color: t.textMuted,
      fontSize: 11,
      fontWeight: "500",
    },
    metaDot: {
      color: t.textMuted,
      fontSize: 11,
    },
    metaTime: {
      color: t.textMuted,
      fontSize: 11,
    },
    symBadge: {
      backgroundColor: t.accentSoft,
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    symBadgeText: {
      color: t.accent,
      fontSize: 10,
      fontWeight: "600",
    },
    thumbnail: {
      width: 72,
      height: 72,
      borderRadius: 8,
      backgroundColor: t.border,
    },
  });
}

type NewsStyles = ReturnType<typeof makeStyles>;

interface NewsCardProps {
  item: NewsItem;
  styles: NewsStyles;
}

function NewsCard({ item, styles }: NewsCardProps) {
  const handlePress = useCallback(() => {
    if (item.url) WebBrowser.openBrowserAsync(item.url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    }).catch(() => {});
  }, [item.url]);

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.7}>
      <View style={styles.cardContent}>
        <View style={styles.cardMain}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {!!item.summary && (
            <Text style={styles.cardSummary} numberOfLines={2}>
              {item.summary}
            </Text>
          )}
          <View style={styles.cardMeta}>
            <Text style={styles.metaSource}>{item.source}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaTime}>{timeAgo(item.published_at)}</Text>
            {item.symbols.length > 0 && (
              <>
                <Text style={styles.metaDot}>·</Text>
                {item.symbols.slice(0, 3).map((sym) => (
                  <View key={sym} style={styles.symBadge}>
                    <Text style={styles.symBadgeText}>{sym}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        </View>
        {!!item.thumbnail && (
          <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function ClientNewsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("market");
  const [searchQuery, setSearchQuery] = useState("");

  const [marketNews, setMarketNews] = useState<NewsItem[]>([]);
  const [portfolioNews, setPortfolioNews] = useState<NewsItem[]>([]);

  const [loadingMarket, setLoadingMarket] = useState(false);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);

  const holdings = useSelector((s: RootState) => s.portfolio.holdings);
  const portfolioSymbols = Array.from(
    new Set(
      Object.values(holdings)
        .flat()
        .filter((h) => h.asset_type === "stock" || h.asset_type === "etf")
        .map((h) => h.symbol.replace(/\.(NS|BSE)$/i, "").toUpperCase())
    )
  );

  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();

  useEffect(() => {
    setLoadingMarket(true);
    fetchMarketNews(30)
      .then(setMarketNews)
      .finally(() => setLoadingMarket(false));
  }, []);

  useEffect(() => {
    if (activeTab === "portfolio" && portfolioNews.length === 0 && portfolioSymbols.length > 0) {
      setLoadingPortfolio(true);
      fetchCompanyNews(portfolioSymbols, 10)
        .then(setPortfolioNews)
        .finally(() => setLoadingPortfolio(false));
    }
  }, [activeTab]);

  const currentNews = activeTab === "market" ? marketNews : portfolioNews;
  const isLoading = activeTab === "market" ? loadingMarket : loadingPortfolio;

  const q = searchQuery.toLowerCase();
  const filtered = q
    ? currentNews.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.source.toLowerCase().includes(q) ||
          item.symbols.some((s) => s.toLowerCase().includes(q))
      )
    : currentNews;

  const tabs: { id: Tab; label: string }[] = [
    { id: "market", label: "Market" },
    { id: "portfolio", label: "My Portfolio" },
  ];

  return (
    <ScreenContainer>
      <View style={styles.searchRow}>
        <Feather name="search" size={15} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search news..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        {!!searchQuery && (
          <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearBtn}>
            <Feather name="x" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabRow}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Feather name="inbox" size={32} color={colors.textMuted} />
          <Text style={styles.emptyText}>
            {activeTab === "portfolio" && portfolioSymbols.length === 0
              ? "No stock holdings found"
              : searchQuery
              ? "No matching news"
              : "No news available"}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {filtered.map((item) => (
            <NewsCard key={item.id} item={item} styles={styles} />
          ))}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}
