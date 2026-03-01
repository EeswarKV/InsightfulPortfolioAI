import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useThemeColors, useThemedStyles } from "../../lib/useAppTheme";
import type { ThemeColors } from "../../lib/themes";
import { useIsWebWide } from "../../lib/platform";
import { ScreenContainer } from "../../components/layout";
import { SearchInput, Badge, StatusDot } from "../../components/ui";
import { BarChart } from "../../components/charts";
import {
  searchStocks,
  getFullCompanyData,
  type SearchResult,
} from "../../lib/researchApi";
import type { CompanyData } from "../../types";
import { supabase } from "../../lib/supabase";
import { API_URL } from "../../lib/constants";

type SectionTab = "overview" | "financials" | "analysis" | "ai";

// Indian stock suggestions
const TRENDING_INDIAN: { symbol: string; name: string; exchange: string }[] = [
  { symbol: "RELIANCE.NS", name: "Reliance Industries", exchange: "NSE" },
  { symbol: "TCS.NS", name: "Tata Consultancy Services", exchange: "NSE" },
  { symbol: "INFY.NS", name: "Infosys", exchange: "NSE" },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank", exchange: "NSE" },
  { symbol: "ICICIBANK.NS", name: "ICICI Bank", exchange: "NSE" },
  { symbol: "BHARTIARTL.NS", name: "Bharti Airtel", exchange: "NSE" },
];

function makeStyles(t: ThemeColors) {
  return StyleSheet.create({
    webWrap: { flex: 1 },
    loadingWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.bg,
      gap: 12,
    },
    loadingText: {
      color: t.textPrimary,
      fontSize: 16,
      fontWeight: "600",
    },
    loadingHint: {
      color: t.textMuted,
      fontSize: 13,
    },
    errorCard: {
      backgroundColor: t.card,
      borderRadius: 14,
      padding: 32,
      borderWidth: 1,
      borderColor: t.border,
      alignItems: "center",
      gap: 8,
      marginTop: 40,
    },
    errorTitle: {
      color: t.textPrimary,
      fontSize: 16,
      fontWeight: "600",
    },
    errorText: {
      color: t.textMuted,
      fontSize: 13,
      textAlign: "center",
    },
    retryBtn: {
      backgroundColor: t.accent,
      borderRadius: 10,
      paddingHorizontal: 24,
      paddingVertical: 10,
      marginTop: 8,
    },
    retryBtnText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "600",
    },
    backLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 16,
      alignSelf: "center",
    },
    backLinkText: {
      color: t.accent,
      fontSize: 13,
      fontWeight: "500",
    },
    emptyCard: {
      backgroundColor: t.card,
      borderRadius: 14,
      padding: 32,
      borderWidth: 1,
      borderColor: t.border,
      alignItems: "center",
      gap: 8,
      marginTop: 16,
    },
    emptyText: {
      color: t.textPrimary,
      fontSize: 14,
      fontWeight: "500",
    },
    emptyHint: {
      color: t.textMuted,
      fontSize: 12,
      textAlign: "center",
    },
    pageTitle: {
      color: t.textPrimary,
      fontSize: 22,
      fontWeight: "700",
      marginBottom: 16,
    },
    searchWide: {
      maxWidth: 600,
      marginBottom: 32,
    },
    section: {
      marginTop: 16,
    },
    sectionLabel: {
      color: t.textMuted,
      fontSize: 11,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 10,
    },
    resultsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    resultCard: {
      backgroundColor: t.card,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: t.border,
      marginBottom: 8,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    resultCardWide: {
      width: "31%",
      borderRadius: 14,
      padding: 20,
      marginBottom: 0,
    },
    symbolText: {
      color: t.textPrimary,
      fontSize: 15,
      fontWeight: "600",
    },
    companyMeta: {
      color: t.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    trendingLabel: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 10,
    },
    trendingCard: {
      backgroundColor: t.card,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: t.border,
      marginBottom: 6,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    trendingCardWide: {
      borderRadius: 14,
      padding: 20,
      marginBottom: 0,
      width: "31%",
    },
    trendingLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    trendingIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      alignItems: "center",
      justifyContent: "center",
    },
    trendingSymbol: {
      color: t.accent,
      fontSize: 11,
      fontWeight: "700",
    },
    trendingName: {
      color: t.textPrimary,
      fontSize: 14,
      fontWeight: "500",
    },
    trendingHint: {
      color: t.textMuted,
      fontSize: 11,
      marginTop: 2,
    },
    aiHint: {
      backgroundColor: "rgba(167,139,250,0.06)",
      borderRadius: 14,
      padding: 18,
      borderWidth: 1,
      borderColor: "rgba(167,139,250,0.15)",
      marginTop: 20,
    },
    aiHintWide: {
      maxWidth: 600,
      padding: 28,
      marginTop: 32,
    },
    aiHintHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
    },
    aiHintTitle: {
      color: t.purple,
      fontSize: 13,
      fontWeight: "600",
    },
    aiHintBody: {
      color: t.textSecondary,
      fontSize: 12,
      lineHeight: 18,
    },

    // Detail view
    detailHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 16,
    },
    detailHeaderWide: {
      gap: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
      marginBottom: 0,
    },
    backBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: t.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    detailTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    detailSymbol: {
      color: t.textPrimary,
      fontSize: 20,
      fontWeight: "700",
    },
    detailMeta: {
      color: t.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    detailPrice: {
      color: t.textPrimary,
      fontSize: 28,
      fontWeight: "700",
    },
    detailChange: {
      fontSize: 15,
      fontWeight: "600",
      marginTop: 2,
    },
    priceCard: {
      backgroundColor: "rgba(79,140,255,0.06)",
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: "rgba(79,140,255,0.15)",
      marginBottom: 14,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    priceCardValue: {
      color: t.textPrimary,
      fontSize: 28,
      fontWeight: "700",
    },
    priceCardChange: {
      fontSize: 14,
      fontWeight: "600",
      marginTop: 4,
    },
    priceCardLabel: {
      color: t.textMuted,
      fontSize: 11,
    },
    priceCardMcap: {
      color: t.textPrimary,
      fontSize: 16,
      fontWeight: "600",
      marginTop: 2,
    },
    // Mobile horizontal-scroll pill tab bar
    tabScrollMobile: {
      borderBottomWidth: 1,
      borderBottomColor: t.border,
      marginBottom: 16,
    },
    tabScrollContent: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 8,
    },
    tabPillMobile: {
      paddingHorizontal: 18,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
    },
    tabPillMobileActive: {
      backgroundColor: t.accentSoft,
      borderColor: t.accent,
    },
    // Wide underline tab bar
    tabBarWide: {
      flexDirection: "row",
      backgroundColor: t.surface,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
      paddingHorizontal: 32,
      marginBottom: 0,
    },
    tabBtnWide: {
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
    },
    tabBtnActiveWide: {
      borderBottomColor: t.accent,
    },
    tabText: {
      color: t.textMuted,
      fontSize: 13,
      fontWeight: "600",
    },
    tabTextActive: {
      color: t.textPrimary,
    },
    descText: {
      color: t.textSecondary,
      fontSize: 13,
      lineHeight: 20,
      marginBottom: 16,
    },
    metricGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 16,
    },
    metricGridWide: {
      gap: 12,
      marginBottom: 24,
    },
    metricCard: {
      backgroundColor: t.card,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: t.border,
      width: "48%",
    },
    metricLabel: {
      color: t.textMuted,
      fontSize: 10,
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    metricValue: {
      color: t.textPrimary,
      fontSize: 14,
      fontWeight: "600",
      marginTop: 4,
    },
    subHeading: {
      color: t.textPrimary,
      fontSize: 13,
      fontWeight: "600",
      marginBottom: 8,
    },
    chartCard: {
      backgroundColor: t.card,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: t.border,
      marginBottom: 16,
    },
    chartFooter: {
      color: t.textMuted,
      fontSize: 10,
      textAlign: "center",
      marginTop: 8,
    },

    // Financials
    financialsRow: {
      flexDirection: "row",
      gap: 16,
    },
    sectionCard: {
      backgroundColor: t.card,
      borderRadius: 14,
      padding: 18,
      borderWidth: 1,
      borderColor: t.border,
      marginBottom: 16,
    },
    sectionCardTitle: {
      color: t.textPrimary,
      fontSize: 15,
      fontWeight: "600",
      marginBottom: 16,
    },
    metricRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 10,
    },
    metricRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: t.border,
    },
    metricRowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    metricRowLabel: {
      color: t.textSecondary,
      fontSize: 13,
    },
    metricRowValue: {
      color: t.textPrimary,
      fontSize: 14,
      fontWeight: "600",
    },

    // Analysis
    analystRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    analystLabel: {
      color: t.textPrimary,
      fontSize: 13,
      fontWeight: "600",
    },
    analystTarget: {
      color: t.accent,
      fontSize: 18,
      fontWeight: "700",
    },
    analysisColumns: {
      flexDirection: "row",
      gap: 16,
    },
    analysisCol: {
      flex: 1,
    },
    analysisLabel: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 8,
    },
    analysisLabelText: {
      fontSize: 13,
      fontWeight: "600",
    },
    strengthItem: {
      backgroundColor: t.greenSoft,
      borderRadius: 10,
      padding: 14,
      marginBottom: 6,
      borderLeftWidth: 3,
      borderLeftColor: t.green,
    },
    riskItem: {
      backgroundColor: t.yellowSoft,
      borderRadius: 10,
      padding: 14,
      marginBottom: 6,
      borderLeftWidth: 3,
      borderLeftColor: t.yellow,
    },
    analysisItemText: {
      color: t.textPrimary,
      fontSize: 13,
      lineHeight: 20,
    },
  });
}

function makeAiStyles(t: ThemeColors) {
  return StyleSheet.create({
    keyContainer: {
      padding: 20,
    },
    keyLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: t.accent,
      letterSpacing: 1,
      marginBottom: 8,
    },
    keyHint: {
      fontSize: 11,
      color: t.textMuted,
      marginBottom: 12,
      lineHeight: 16,
    },
    keyInput: {
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 8,
      padding: 12,
      color: t.textPrimary,
      fontSize: 13,
      marginBottom: 16,
    },
    keyActions: {
      flexDirection: "row",
      gap: 10,
    },
    cancelBtn: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: t.border,
      alignItems: "center",
    },
    cancelText: {
      color: t.textSecondary,
      fontSize: 13,
      fontWeight: "600",
    },
    saveBtn: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      backgroundColor: t.accent,
      alignItems: "center",
    },
    saveText: {
      color: "#fff",
      fontSize: 13,
      fontWeight: "600",
    },
    initContainer: {
      padding: 20,
    },
    initCard: {
      backgroundColor: t.card,
      borderRadius: 14,
      padding: 24,
      borderWidth: 1,
      borderColor: t.border,
      alignItems: "center",
    },
    initIcon: {
      fontSize: 48,
      marginBottom: 12,
    },
    initTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: t.textPrimary,
      marginBottom: 8,
    },
    initDesc: {
      fontSize: 13,
      color: t.textSecondary,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 16,
    },
    framework: {
      backgroundColor: t.surface,
      borderRadius: 10,
      padding: 14,
      width: "100%",
      marginBottom: 20,
    },
    frameworkTitle: {
      fontSize: 11,
      fontWeight: "700",
      color: t.textPrimary,
      marginBottom: 8,
    },
    frameworkItem: {
      fontSize: 11,
      color: t.textSecondary,
      marginBottom: 4,
    },
    analyzeBtn: {
      backgroundColor: t.accent,
      borderRadius: 10,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 12,
    },
    analyzeBtnText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "700",
      letterSpacing: 0.5,
    },
    keyLinkBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      padding: 8,
    },
    keyLinkText: {
      color: t.accent,
      fontSize: 12,
      fontWeight: "600",
    },
    verdictCard: {
      borderRadius: 14,
      padding: 24,
      alignItems: "center",
      borderWidth: 1,
      borderColor: t.border,
      marginBottom: 16,
    },
    verdictLabel: {
      fontSize: 10,
      color: t.textMuted,
      letterSpacing: 1.5,
      marginBottom: 8,
    },
    companyName: {
      fontSize: 20,
      fontWeight: "700",
      color: t.textPrimary,
      textAlign: "center",
      marginBottom: 16,
    },
    scoreContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: "rgba(0,0,0,0.2)",
      borderRadius: 50,
      padding: 12,
      paddingHorizontal: 20,
    },
    scoreValue: {
      fontSize: 32,
      fontWeight: "800",
    },
    scoreLabel: {
      fontSize: 9,
      color: t.textMuted,
    },
    verdictText: {
      fontSize: 14,
      fontWeight: "700",
    },
    layerRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 16,
    },
    layerCard: {
      flex: 1,
      backgroundColor: t.card,
      borderRadius: 10,
      padding: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: t.border,
    },
    layerScore: {
      fontSize: 24,
      fontWeight: "800",
    },
    layerLabel: {
      fontSize: 9,
      color: t.textMuted,
      marginTop: 2,
    },
    layerName: {
      fontSize: 9,
      color: t.textMuted,
      marginTop: 4,
      fontWeight: "600",
    },
    insightsRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 16,
    },
    strengthsCard: {
      flex: 1,
      backgroundColor: "rgba(34,197,94,0.05)",
      borderWidth: 1,
      borderColor: "rgba(34,197,94,0.2)",
      borderRadius: 10,
      padding: 14,
    },
    redFlagsCard: {
      flex: 1,
      backgroundColor: "rgba(239,68,68,0.05)",
      borderWidth: 1,
      borderColor: "rgba(239,68,68,0.2)",
      borderRadius: 10,
      padding: 14,
    },
    insightTitle: {
      fontSize: 9,
      fontWeight: "700",
      letterSpacing: 1,
      marginBottom: 8,
      color: t.textSecondary,
    },
    strengthText: {
      fontSize: 11,
      color: t.green,
      lineHeight: 16,
      marginBottom: 4,
    },
    redFlagText: {
      fontSize: 11,
      color: t.red,
      lineHeight: 16,
      marginBottom: 4,
    },
    actionCard: {
      backgroundColor: "rgba(79,140,255,0.08)",
      borderWidth: 1,
      borderColor: "rgba(79,140,255,0.2)",
      borderRadius: 10,
      padding: 16,
      marginBottom: 16,
    },
    actionTitle: {
      fontSize: 9,
      fontWeight: "700",
      color: t.accent,
      letterSpacing: 1,
      marginBottom: 8,
    },
    actionText: {
      fontSize: 12,
      color: t.textPrimary,
      lineHeight: 18,
    },
    patternsCard: {
      backgroundColor: t.card,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: t.border,
      marginBottom: 16,
    },
    patternsTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: t.textPrimary,
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    patternsSubtitle: {
      fontSize: 12,
      color: t.textSecondary,
      marginBottom: 16,
    },
    patternItem: {
      marginBottom: 12,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
    },
    patternHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 4,
    },
    patternIcon: {
      fontSize: 16,
      fontWeight: "700",
    },
    patternName: {
      fontSize: 13,
      fontWeight: "600",
      color: t.textPrimary,
      flex: 1,
    },
    patternDetail: {
      fontSize: 12,
      color: t.textSecondary,
      marginLeft: 24,
      lineHeight: 18,
    },
    reanalyzeBtn: {
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 10,
      padding: 14,
      alignItems: "center",
      marginBottom: 20,
    },
    reanalyzeBtnText: {
      color: t.textSecondary,
      fontSize: 13,
      fontWeight: "600",
    },
  });
}

export default function ResearchScreen() {
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<SectionTab>("overview");
  const isWide = useIsWebWide();

  // Debounced search
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchQuery(text);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

      if (text.length < 2) {
        setSearchResults([]);
        setSearching(false);
        return;
      }

      setSearching(true);
      searchTimerRef.current = setTimeout(async () => {
        try {
          const results = await searchStocks(text);
          setSearchResults(results);
        } catch (err) {
          console.log("[Research] Search error:", err);
          setSearchResults([]);
        } finally {
          setSearching(false);
        }
      }, 400);
    },
    []
  );

  const selectCompany = async (symbol: string) => {
    setSelectedSymbol(symbol);
    setSearchQuery("");
    setSearchResults([]);
    setActiveTab("overview");
    setLoadingCompany(true);
    setCompanyError(null);
    setCompanyData(null);

    try {
      const data = await getFullCompanyData(symbol);
      setCompanyData(data);
    } catch (err: any) {
      setCompanyError(err.message || "Failed to load company data");
    } finally {
      setLoadingCompany(false);
    }
  };

  // Company detail view
  if (selectedSymbol) {
    if (loadingCompany) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>
            Loading fundamentals for {selectedSymbol}...
          </Text>
          <Text style={styles.loadingHint}>
            Fetching data & AI analysis
          </Text>
        </View>
      );
    }

    if (companyError) {
      const errorContent = (
        <>
          <View style={styles.errorCard}>
            <Feather name="alert-circle" size={32} color={colors.red} />
            <Text style={styles.errorTitle}>Failed to load data</Text>
            <Text style={styles.errorText}>{companyError}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => selectCompany(selectedSymbol)}
            >
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => {
              setSelectedSymbol(null);
              setCompanyError(null);
            }}
          >
            <Feather name="arrow-left" size={14} color={colors.accent} />
            <Text style={styles.backLinkText}>Back to search</Text>
          </TouchableOpacity>
        </>
      );

      if (isWide) return <View style={styles.webWrap}>{errorContent}</View>;
      return <ScreenContainer>{errorContent}</ScreenContainer>;
    }

    if (companyData) {
      return (
        <CompanyDetail
          symbol={selectedSymbol}
          company={companyData}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onBack={() => {
            setSelectedSymbol(null);
            setCompanyData(null);
          }}
          isWide={isWide}
        />
      );
    }
  }

  // Main search view
  const content = (
    <>
      {!isWide && <Text style={styles.pageTitle}>Research</Text>}

      <View style={isWide ? styles.searchWide : undefined}>
        <SearchInput
          value={searchQuery}
          onChangeText={handleSearchChange}
          placeholder={
            isWide
              ? "Search Indian & global stocks (e.g. RELIANCE, TCS, INFY)..."
              : "Search stock (e.g. RELIANCE)..."
          }
        />
      </View>

      {searching && (
        <ActivityIndicator
          color={colors.accent}
          style={{ marginTop: 16 }}
        />
      )}

      {searchQuery && searchResults.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            {isWide ? "Search Results" : "Results"}
          </Text>
          <View style={isWide ? styles.resultsGrid : undefined}>
            {searchResults.map((result) => (
              <TouchableOpacity
                key={result.symbol}
                style={[styles.resultCard, isWide && styles.resultCardWide]}
                onPress={() => selectCompany(result.symbol)}
                activeOpacity={0.7}
              >
                <View>
                  <Text style={styles.symbolText}>{result.symbol}</Text>
                  <Text style={styles.companyMeta}>
                    {result.name} · {result.exchange}
                  </Text>
                </View>
                <Badge>{result.type}</Badge>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : searchQuery && !searching && searchResults.length === 0 ? (
        <View style={styles.emptyCard}>
          <Feather name="search" size={24} color={colors.textMuted} />
          <Text style={styles.emptyText}>No results for "{searchQuery}"</Text>
          <Text style={styles.emptyHint}>
            Try the full name or add .NS for NSE, .BO for BSE
          </Text>
        </View>
      ) : (
        <>
          {/* Trending Indian stocks */}
          <View style={styles.section}>
            <View style={styles.trendingLabel}>
              <Feather
                name="trending-up"
                size={14}
                color={colors.textMuted}
              />
              <Text style={styles.sectionLabel}>
                {isWide ? "Popular Indian Stocks" : "Popular Stocks"}
              </Text>
            </View>
            <View style={isWide ? styles.resultsGrid : undefined}>
              {TRENDING_INDIAN.map((tc) => (
                <TouchableOpacity
                  key={tc.symbol}
                  style={[
                    styles.trendingCard,
                    isWide && styles.trendingCardWide,
                  ]}
                  onPress={() => selectCompany(tc.symbol)}
                  activeOpacity={0.7}
                >
                  <View style={styles.trendingLeft}>
                    <View style={styles.trendingIcon}>
                      <Text style={styles.trendingSymbol}>
                        {tc.symbol.replace(".NS", "").slice(0, 4)}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.trendingName}>{tc.name}</Text>
                      {!isWide && (
                        <Text style={styles.trendingHint}>
                          Tap to view analysis
                        </Text>
                      )}
                    </View>
                  </View>
                  <Badge>{tc.exchange}</Badge>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* AI hint */}
          <View style={[styles.aiHint, isWide && styles.aiHintWide]}>
            <View style={styles.aiHintHeader}>
              <Feather
                name="message-circle"
                size={16}
                color={colors.purple}
              />
              <Text style={styles.aiHintTitle}>AI-Powered Analysis</Text>
            </View>
            <Text style={styles.aiHintBody}>
              Search any company to get real fundamentals from Yahoo Finance,
              plus AI-generated investment analysis powered by Claude.
              Supports NSE, BSE, and global exchanges.
            </Text>
          </View>
        </>
      )}
    </>
  );

  if (isWide) {
    return <View style={styles.webWrap}>{content}</View>;
  }
  return <ScreenContainer>{content}</ScreenContainer>;
}

// ─── Company Detail ──────────────────────────────────────────────────

function CompanyDetail({
  symbol,
  company: co,
  activeTab,
  onTabChange,
  onBack,
  isWide,
}: {
  symbol: string;
  company: CompanyData;
  activeTab: SectionTab;
  onTabChange: (t: SectionTab) => void;
  onBack: () => void;
  isWide: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();

  const tabs: SectionTab[] = ["overview", "financials", "analysis", "ai"];

  const header = (
    <View style={[styles.detailHeader, isWide && styles.detailHeaderWide]}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <Feather
          name="chevron-left"
          size={18}
          color={colors.textSecondary}
        />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <View style={styles.detailTitleRow}>
          <Text style={styles.detailSymbol}>{symbol}</Text>
          <Badge
            color={co.analystRating === "Strong Buy" ? "green" : "accent"}
          >
            {co.analystRating}
          </Badge>
        </View>
        <Text style={styles.detailMeta}>
          {co.name} · {co.sector}
        </Text>
      </View>
      {isWide && (
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.detailPrice}>{co.price}</Text>
          <Text
            style={[
              styles.detailChange,
              {
                color: co.change.startsWith("+")
                  ? colors.green
                  : colors.red,
              },
            ]}
          >
            {co.change} today
          </Text>
        </View>
      )}
    </View>
  );

  const priceCard = !isWide ? (
    <View style={styles.priceCard}>
      <View>
        <Text style={styles.priceCardValue}>{co.price}</Text>
        <Text
          style={[
            styles.priceCardChange,
            {
              color: co.change.startsWith("+")
                ? colors.green
                : colors.red,
            },
          ]}
        >
          {co.change} today
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={styles.priceCardLabel}>Market Cap</Text>
        <Text style={styles.priceCardMcap}>{co.marketCap}</Text>
      </View>
    </View>
  ) : null;

  const TAB_LABELS: Record<SectionTab, string> = {
    overview: "Overview",
    financials: "Financials",
    analysis: "Analysis",
    ai: "AI Score",
  };

  const tabBar = isWide ? (
    <View style={styles.tabBarWide}>
      {tabs.map((t) => (
        <TouchableOpacity
          key={t}
          style={[styles.tabBtnWide, activeTab === t && styles.tabBtnActiveWide]}
          onPress={() => onTabChange(t)}
        >
          <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
            {TAB_LABELS[t]}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  ) : (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabScrollMobile}
      contentContainerStyle={styles.tabScrollContent}
    >
      {tabs.map((t) => (
        <TouchableOpacity
          key={t}
          style={[styles.tabPillMobile, activeTab === t && styles.tabPillMobileActive]}
          onPress={() => onTabChange(t)}
        >
          <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
            {TAB_LABELS[t]}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const tabContent = (
    <View>
      {activeTab === "overview" && <OverviewTab co={co} isWide={isWide} />}
      {activeTab === "financials" && <FinancialsTab co={co} isWide={isWide} />}
      {activeTab === "analysis" && <AnalysisTab co={co} isWide={isWide} />}
      {activeTab === "ai" && <AIScoreTab symbol={symbol} co={co} isWide={isWide} />}
    </View>
  );

  if (isWide) {
    return (
      <View style={{ flex: 1 }}>
        {header}
        {tabBar}
        <ScrollView
          contentContainerStyle={{ padding: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {tabContent}
        </ScrollView>
      </View>
    );
  }

  return (
    <ScreenContainer>
      {header}
      {priceCard}
      {tabBar}
      {tabContent}
    </ScreenContainer>
  );
}

// ─── Tab: Overview ───────────────────────────────────────────────────

function OverviewTab({ co, isWide }: { co: CompanyData; isWide: boolean }) {
  const styles = useThemedStyles(makeStyles);

  const overviewMetrics = [
    { label: "P/E Ratio", value: co.pe },
    { label: "Forward P/E", value: co.forwardPe },
    { label: "EPS", value: co.eps },
    { label: "Dividend", value: co.dividendYield },
    { label: "Beta", value: co.beta },
    { label: "52W Range", value: `${co.fiftyTwoLow} - ${co.fiftyTwoHigh}` },
  ];
  if (isWide) {
    overviewMetrics.splice(0, 0, {
      label: "Market Cap",
      value: co.marketCap as any,
    });
    overviewMetrics.push({ label: "52W High", value: co.fiftyTwoHigh as any });
  }

  return (
    <>
      <Text style={styles.descText}>{co.description}</Text>
      <View style={[styles.metricGrid, isWide && styles.metricGridWide]}>
        {overviewMetrics.map((m, i) => (
          <View key={i} style={styles.metricCard}>
            <Text style={styles.metricLabel}>{m.label}</Text>
            <Text style={styles.metricValue}>{String(m.value)}</Text>
          </View>
        ))}
      </View>

      {co.quarterlyRevenue.length > 0 && (
        <>
          <Text style={styles.subHeading}>Quarterly Revenue</Text>
          <View style={styles.chartCard}>
            <BarChart
              data={co.quarterlyRevenue.map((q) => ({
                label: q.q,
                value: q.value,
              }))}
              height={isWide ? 120 : 70}
            />
            <Text style={styles.chartFooter}>Revenue in billions</Text>
          </View>
        </>
      )}
    </>
  );
}

// ─── Tab: Financials ─────────────────────────────────────────────────

function FinancialsTab({ co, isWide }: { co: CompanyData; isWide: boolean }) {
  const styles = useThemedStyles(makeStyles);

  const summaryItems = [
    { l: "Revenue", v: co.revenue },
    { l: "Revenue Growth", v: co.revenueGrowth },
    { l: "Gross Margin", v: co.grossMargin },
    { l: "Operating Margin", v: co.operatingMargin },
    { l: "Net Margin", v: co.netMargin },
    { l: "ROE", v: co.roe },
    { l: "Debt/Equity", v: co.debtToEquity },
    { l: "Current Ratio", v: co.currentRatio },
  ];

  return (
    <View style={isWide ? styles.financialsRow : undefined}>
      <View style={[styles.sectionCard, isWide && { flex: 1 }]}>
        <Text style={styles.sectionCardTitle}>Key Metrics</Text>
        {co.keyMetrics.map((m, i) => (
          <View
            key={i}
            style={[
              styles.metricRow,
              i < co.keyMetrics.length - 1 && styles.metricRowBorder,
            ]}
          >
            <View style={styles.metricRowLeft}>
              <StatusDot status={m.status} />
              <Text style={styles.metricRowLabel}>{m.label}</Text>
            </View>
            <Text style={styles.metricRowValue}>{m.value}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.sectionCard, isWide && { flex: 1 }]}>
        <Text style={styles.sectionCardTitle}>
          {isWide ? "Financial Summary" : "More Metrics"}
        </Text>
        {isWide ? (
          summaryItems.map((m, i) => (
            <View
              key={i}
              style={[
                styles.metricRow,
                i < summaryItems.length - 1 && styles.metricRowBorder,
              ]}
            >
              <Text style={styles.metricRowLabel}>{m.l}</Text>
              <Text style={styles.metricRowValue}>{m.v}</Text>
            </View>
          ))
        ) : (
          <View style={styles.metricGrid}>
            {summaryItems.map((m, i) => (
              <View key={i} style={styles.metricCard}>
                <Text style={styles.metricLabel}>{m.l}</Text>
                <Text style={styles.metricValue}>{m.v}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Tab: AI Multibagger Score ────────────────────────────────────────

interface AIAnalysisResult {
  company: string;
  sector: string;
  verdict: string;
  verdictEmoji: string;
  totalScore: number;
  macro: {
    score: number;
    maxScore: number;
    summary: string;
    breakdown: Array<{ param: string; score: number; max: number; note: string }>;
  };
  sector: {
    score: number;
    maxScore: number;
    summary: string;
    breakdown: Array<{ param: string; score: number; max: number; note: string }>;
  };
  stock: {
    score: number;
    maxScore: number;
    summary: string;
    breakdown: Array<{ param: string; score: number; max: number; note: string }>;
  };
  keyStrengths: string[];
  redFlags: string[];
  missingData: string[];
  actionableInsight: string;
  pegRatio: string;
  comparablePeers: string[];
  patternsCovered?: {
    pattern1_globalToLocal: { covered: boolean; detail: string };
    pattern2_newSectorThisCycle: { covered: boolean; detail: string };
    pattern3_aboveAvgGrowth: { covered: boolean; detail: string };
    pattern4_massiveTAM: { covered: boolean; detail: string };
    pattern5_firstGenFounder: { covered: boolean; detail: string };
    pattern6_allTimeHigh: { covered: boolean; detail: string };
    pattern7_smallMarketCap: { covered: boolean; detail: string };
    pattern8_fairValuation: { covered: boolean; detail: string };
  };
}

const AI_SYSTEM_PROMPT = `You are an expert Indian stock market analyst specializing in identifying multibagger stocks. You analyze stocks using a precise 3-layer framework:

LAYER 1 - MACRO FILTER (25 points):
- Current bull market phase alignment (5pts)
- Dominant market narrative fit (5pts)
- Government/policy tailwind (5pts)
- FII/DII institutional interest (5pts)
- Sector momentum score (5pts)

LAYER 2 - SECTOR FILTER (25 points):
- New/emerging sector this cycle, not last cycle winner (5pts)
- Global trend already proven (US/China proxy) (5pts)
- TAM (Total Addressable Market) size - prefer ₹50,000Cr+ (5pts)
- Policy/PLI scheme backing (5pts)
- Early in growth curve, not over-owned (5pts)

LAYER 3 - STOCK FILTER (50 points based on 8 parameters):
1. Revenue Growth: >20% YoY for 3 consecutive years (6pts)
2. PAT/Earnings Growth: PAT growing faster than revenue (6pts)
3. Order Book Visibility: 2-3x order book vs annual revenue (6pts)
4. Market Cap: Prefer <₹5,000 Cr for max upside, up to ₹20,000Cr acceptable (6pts)
5. Promoter Quality: First-gen, high holding >50%, zero pledging (6pts)
6. Price Action: Near or at All-Time High, not in downtrend (6pts)
7. Valuation (PEG): PEG ratio <1.5 ideal, <2 acceptable (8pts)
8. Global-Local Alignment: Indian proxy of proven global model (6pts)

TOTAL: 100 points

VERDICT THRESHOLDS:
- 75-100: STRONG BUY 🟢 (High Conviction)
- 55-74: WATCHLIST 🟡 (Wait for trigger)
- 35-54: PASS 🟠 (Revisit later)
- Below 35: REJECT 🔴

CURRENT INDIA CONTEXT (2026):
Hot themes: Defence & Aerospace, EMS/Electronics Manufacturing, AI Infrastructure, Power/Energy transition, Railways, Capital Goods, Specialty Chemicals recovery
Policy tailwinds: PLI schemes, Make in India, Defence indigenization, Semiconductor mission
Market phase: Mid-to-late bull market, selective stock picking phase

You must respond ONLY in valid JSON format with the exact structure provided.`;

function AIScoreTab({ symbol, co, isWide }: { symbol: string; co: CompanyData; isWide: boolean }) {
  const aiStyles = useThemedStyles(makeAiStyles);
  const colors = useThemeColors();

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIAnalysisResult | null>(null);

  const runAIAnalysis = async () => {
    setLoading(true);
    setResult(null);

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error("Not authenticated");
      }

      // Helper to convert values to string
      const toStr = (val: any): string => {
        if (val === null || val === undefined || val === "") return "N/A";
        return String(val);
      };

      // Call backend proxy endpoint
      const response = await fetch(`${API_URL}/ai/analyze-stock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          company_name: co.name || "Unknown",
          symbol: symbol,
          sector: toStr(co.sector),
          market_cap: toStr(co.marketCap),
          pe: toStr(co.pe),
          forward_pe: toStr(co.forwardPe),
          eps: toStr(co.eps),
          revenue: toStr(co.revenue),
          revenue_growth: toStr(co.revenueGrowth),
          gross_margin: toStr(co.grossMargin),
          operating_margin: toStr(co.operatingMargin),
          net_margin: toStr(co.netMargin),
          roe: toStr(co.roe),
          debt_to_equity: toStr(co.debtToEquity),
          current_ratio: toStr(co.currentRatio),
          dividend_yield: toStr(co.dividendYield),
          beta: toStr(co.beta),
          fifty_two_high: toStr(co.fiftyTwoHigh),
          fifty_two_low: toStr(co.fiftyTwoLow),
          price: toStr(co.price),
          change: toStr(co.change),
          description: co.description || "",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Analysis failed" }));
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();

      // Extract the AI response content
      const text = data.content?.map((b: any) => b.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed: AIAnalysisResult = JSON.parse(clean);
      setResult(parsed);
    } catch (error: any) {
      console.error("AI Analysis error:", error);
      Alert.alert("Analysis Failed", error.message || "Unable to analyze stock. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const verdictColors: Record<string, { color: string; bg: string }> = {
    "STRONG BUY": { color: colors.green, bg: "rgba(34,197,94,0.1)" },
    WATCHLIST: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
    PASS: { color: "#f97316", bg: "rgba(249,115,22,0.1)" },
    REJECT: { color: colors.red, bg: "rgba(239,68,68,0.1)" },
  };

  if (!result) {
    return (
      <View style={aiStyles.initContainer}>
        <View style={aiStyles.initCard}>
          <Text style={aiStyles.initIcon}>🎯</Text>
          <Text style={aiStyles.initTitle}>AI Multibagger Analysis</Text>
          <Text style={aiStyles.initDesc}>
            Get a comprehensive 3-layer investment score powered by Claude AI. Analyzes macro trends, sector positioning, and stock fundamentals to identify potential multibagger opportunities.
          </Text>
          <View style={aiStyles.framework}>
            <Text style={aiStyles.frameworkTitle}>Scoring Framework:</Text>
            <Text style={aiStyles.frameworkItem}>• Layer 1: Macro Environment (25 pts)</Text>
            <Text style={aiStyles.frameworkItem}>• Layer 2: Sector Validation (25 pts)</Text>
            <Text style={aiStyles.frameworkItem}>• Layer 3: Stock Fundamentals (50 pts)</Text>
          </View>
          {loading ? (
            <ActivityIndicator color={colors.accent} size="large" style={{ marginTop: 16 }} />
          ) : (
            <TouchableOpacity style={aiStyles.analyzeBtn} onPress={runAIAnalysis}>
              <Feather name="zap" size={16} color="#fff" />
              <Text style={aiStyles.analyzeBtnText}>Run AI Analysis</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Results view
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Verdict Card */}
      <View style={[aiStyles.verdictCard, { backgroundColor: verdictColors[result.verdict]?.bg }]}>
        <Text style={aiStyles.verdictLabel}>AI ANALYSIS COMPLETE</Text>
        <Text style={aiStyles.companyName}>{result.company}</Text>
        <View style={aiStyles.scoreContainer}>
          <Text style={[aiStyles.scoreValue, { color: verdictColors[result.verdict]?.color }]}>
            {result.totalScore}
          </Text>
          <View>
            <Text style={aiStyles.scoreLabel}>OUT OF 100</Text>
            <Text style={[aiStyles.verdictText, { color: verdictColors[result.verdict]?.color }]}>
              {result.verdictEmoji} {result.verdict}
            </Text>
          </View>
        </View>
      </View>

      {/* Layer Scores */}
      <View style={aiStyles.layerRow}>
        {[
          { label: "MACRO", score: result.macro?.score, max: 25, color: colors.blue },
          { label: "SECTOR", score: result.sector?.score, max: 25, color: colors.accent },
          { label: "STOCK", score: result.stock?.score, max: 50, color: colors.green },
        ].map((layer) => (
          <View key={layer.label} style={aiStyles.layerCard}>
            <Text style={[aiStyles.layerScore, { color: layer.color }]}>{layer.score}</Text>
            <Text style={aiStyles.layerLabel}>/ {layer.max}</Text>
            <Text style={aiStyles.layerName}>{layer.label}</Text>
          </View>
        ))}
      </View>

      {/* Insights */}
      <View style={aiStyles.insightsRow}>
        <View style={aiStyles.strengthsCard}>
          <Text style={aiStyles.insightTitle}>✓ KEY STRENGTHS</Text>
          {result.keyStrengths?.map((s, i) => (
            <Text key={i} style={aiStyles.strengthText}>• {s}</Text>
          ))}
        </View>
        <View style={aiStyles.redFlagsCard}>
          <Text style={aiStyles.insightTitle}>⚠ RED FLAGS</Text>
          {result.redFlags?.map((f, i) => (
            <Text key={i} style={aiStyles.redFlagText}>• {f}</Text>
          ))}
        </View>
      </View>

      {/* Actionable Insight */}
      <View style={aiStyles.actionCard}>
        <Text style={aiStyles.actionTitle}>⚡ ACTIONABLE INTELLIGENCE</Text>
        <Text style={aiStyles.actionText}>{result.actionableInsight}</Text>
      </View>

      {/* 8 Patterns Covered */}
      {result.patternsCovered && (
        <View style={aiStyles.patternsCard}>
          <Text style={aiStyles.patternsTitle}>📊 MULTIBAGGER PATTERNS ANALYSIS</Text>
          <Text style={aiStyles.patternsSubtitle}>8 proven patterns evaluated for this stock:</Text>

          {Object.entries(result.patternsCovered).map(([key, value], idx) => {
            const patternNames: Record<string, string> = {
              pattern1_globalToLocal: "1. Global to Local (10-15Y Lag)",
              pattern2_newSectorThisCycle: "2. New Sector This Cycle",
              pattern3_aboveAvgGrowth: "3. Above Average Growth",
              pattern4_massiveTAM: "4. Massive TAM Size",
              pattern5_firstGenFounder: "5. First-Gen Entrepreneur",
              pattern6_allTimeHigh: "6. All-Time High Signal",
              pattern7_smallMarketCap: "7. Small Market Cap",
              pattern8_fairValuation: "8. Fair Valuation (PEG)",
            };

            return (
              <View key={idx} style={aiStyles.patternItem}>
                <View style={aiStyles.patternHeader}>
                  <Text style={[aiStyles.patternIcon, { color: value.covered ? colors.green : colors.textMuted }]}>
                    {value.covered ? "✓" : "○"}
                  </Text>
                  <Text style={[aiStyles.patternName, !value.covered && { color: colors.textMuted }]}>
                    {patternNames[key]}
                  </Text>
                </View>
                <Text style={aiStyles.patternDetail}>{value.detail}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Reanalyze */}
      <TouchableOpacity style={aiStyles.reanalyzeBtn} onPress={() => setResult(null)}>
        <Text style={aiStyles.reanalyzeBtnText}>Run New Analysis</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Tab: Analysis ───────────────────────────────────────────────────

function AnalysisTab({ co, isWide }: { co: CompanyData; isWide: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();

  return (
    <>
      {!isWide && (
        <View style={styles.analystRow}>
          <Text style={styles.analystLabel}>AI Target Price</Text>
          <Text style={styles.analystTarget}>{co.priceTarget}</Text>
        </View>
      )}

      <View style={isWide ? styles.analysisColumns : undefined}>
        <View style={isWide ? styles.analysisCol : undefined}>
          {isWide ? (
            <View style={styles.sectionCard}>
              <Text
                style={[
                  styles.sectionCardTitle,
                  { color: colors.green },
                ]}
              >
                Strengths
              </Text>
              {co.strengths.map((s, i) => (
                <View key={i} style={styles.strengthItem}>
                  <Text style={styles.analysisItemText}>{s}</Text>
                </View>
              ))}
            </View>
          ) : (
            <>
              <View style={styles.analysisLabel}>
                <Feather
                  name="check-circle"
                  size={14}
                  color={colors.green}
                />
                <Text
                  style={[
                    styles.analysisLabelText,
                    { color: colors.green },
                  ]}
                >
                  Strengths
                </Text>
              </View>
              {co.strengths.map((s, i) => (
                <View key={i} style={styles.strengthItem}>
                  <Text style={styles.analysisItemText}>{s}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        <View style={isWide ? styles.analysisCol : undefined}>
          {isWide ? (
            <View style={styles.sectionCard}>
              <Text
                style={[
                  styles.sectionCardTitle,
                  { color: colors.yellow },
                ]}
              >
                Risks
              </Text>
              {co.risks.map((r, i) => (
                <View key={i} style={styles.riskItem}>
                  <Text style={styles.analysisItemText}>{r}</Text>
                </View>
              ))}
            </View>
          ) : (
            <>
              <View style={[styles.analysisLabel, { marginTop: 16 }]}>
                <Feather
                  name="alert-triangle"
                  size={14}
                  color={colors.yellow}
                />
                <Text
                  style={[
                    styles.analysisLabelText,
                    { color: colors.yellow },
                  ]}
                >
                  Risks
                </Text>
              </View>
              {co.risks.map((r, i) => (
                <View key={i} style={styles.riskItem}>
                  <Text style={styles.analysisItemText}>{r}</Text>
                </View>
              ))}
            </>
          )}
        </View>
      </View>
    </>
  );
}
