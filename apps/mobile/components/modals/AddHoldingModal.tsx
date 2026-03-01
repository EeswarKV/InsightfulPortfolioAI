import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useThemeColors, useThemedStyles } from "../../lib/useAppTheme";
import type { ThemeColors } from "../../lib/themes";
import type { AssetType, DBHolding } from "../../types";
import { searchStocks, type SearchResult } from "../../lib/researchApi";
import { searchMutualFunds } from "../../lib/mutualFundSearch";

const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: "stock", label: "Stock" },
  { value: "etf", label: "ETF" },
  { value: "mutual_fund", label: "Mutual Fund" },
  { value: "bond", label: "Bond" },
  { value: "crypto", label: "Crypto" },
];

interface AddHoldingModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    symbol: string;
    quantity: number;
    avg_cost: number;
    asset_type: AssetType;
    source?: string;
    purchase_date?: string;
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
  editing?: DBHolding | null;
}

function makeStyles(t: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: t.bg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 24,
      maxHeight: "85%",
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    title: {
      color: t.textPrimary,
      fontSize: 18,
      fontWeight: "700",
    },
    label: {
      fontSize: 11,
      color: t.textSecondary,
      fontWeight: "600",
      letterSpacing: 0.5,
      marginBottom: 6,
      marginTop: 14,
    },
    input: {
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 10,
      color: t.textPrimary,
      fontSize: 14,
    },
    searchWrapper: {
      zIndex: 100,
    },
    searchLoader: {
      position: "absolute",
      right: 12,
      top: 12,
    },
    resultsDropdown: {
      position: "absolute",
      top: 48,
      left: 0,
      right: 0,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 10,
      maxHeight: 200,
      zIndex: 1000,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    resultsScroll: {
      maxHeight: 200,
    },
    resultItem: {
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    resultMain: {
      flex: 1,
      marginRight: 8,
    },
    resultHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 2,
    },
    resultName: {
      color: t.textPrimary,
      fontSize: 14,
      fontWeight: "600",
      flex: 1,
    },
    mfBadge: {
      backgroundColor: t.accentSoft,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    mfBadgeText: {
      color: t.accent,
      fontSize: 10,
      fontWeight: "700",
    },
    resultSymbol: {
      color: t.accent,
      fontSize: 12,
      fontWeight: "600",
    },
    resultExchange: {
      color: t.textMuted,
      fontSize: 11,
      fontWeight: "500",
    },
    selectedSymbol: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: "rgba(34, 197, 94, 0.1)",
      borderRadius: 8,
    },
    selectedSymbolText: {
      color: t.green,
      fontSize: 13,
      fontWeight: "600",
    },
    manualEntryItem: {
      backgroundColor: t.bg,
      borderTopWidth: 1,
      borderTopColor: t.border,
    },
    manualEntryText: {
      color: t.accent,
      fontSize: 13,
      fontWeight: "600",
      marginBottom: 2,
    },
    manualEntryHint: {
      color: t.textMuted,
      fontSize: 11,
    },
    noResultsCard: {
      position: "absolute",
      top: 48,
      left: 0,
      right: 0,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 10,
      padding: 16,
      zIndex: 1000,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    noResultsText: {
      color: t.textSecondary,
      fontSize: 13,
      marginBottom: 12,
      textAlign: "center",
    },
    manualEntryBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: t.accentSoft,
      borderWidth: 1,
      borderColor: t.accent,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
      marginBottom: 8,
    },
    manualEntryBtnText: {
      color: t.accent,
      fontSize: 13,
      fontWeight: "600",
    },
    manualEntryNote: {
      color: t.textMuted,
      fontSize: 11,
      textAlign: "center",
    },
    typeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    typeChip: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 8,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
    },
    typeChipActive: {
      backgroundColor: t.accentSoft,
      borderColor: t.accent,
    },
    typeChipText: {
      color: t.textMuted,
      fontSize: 13,
      fontWeight: "500",
    },
    typeChipTextActive: {
      color: t.accent,
    },
    saveBtn: {
      backgroundColor: t.accent,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 24,
    },
    saveBtnText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "600",
    },
    deleteBtn: {
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 12,
      borderWidth: 1,
      borderColor: t.red,
    },
    deleteBtnText: {
      color: t.red,
      fontSize: 15,
      fontWeight: "600",
    },
  });
}

export function AddHoldingModal({
  visible,
  onClose,
  onSave,
  onDelete,
  editing,
}: AddHoldingModalProps) {
  const colors = useThemeColors();
  const styles = useThemedStyles(makeStyles);
  const [symbol, setSymbol] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [assetType, setAssetType] = useState<AssetType>("stock");
  const [source, setSource] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (editing) {
      setSymbol(editing.symbol);
      setSearchQuery(editing.symbol);
      setQuantity(String(editing.quantity));
      setAvgCost(String(editing.avg_cost));
      setAssetType(editing.asset_type);
      setSource(editing.source || "");
      setPurchaseDate(editing.purchase_date || new Date().toISOString().split('T')[0]);
    } else {
      setSymbol("");
      setSearchQuery("");
      setQuantity("");
      setAvgCost("");
      setAssetType("stock");
      setSource("");
      setPurchaseDate(new Date().toISOString().split('T')[0]);
    }
    setSearchResults([]);
    setShowResults(false);
  }, [editing, visible]);

  // Search stocks AND mutual funds when user types
  useEffect(() => {
    if (!searchQuery.trim() || editing) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        // Search both stocks and mutual funds in parallel
        const [stockResults, mfResults] = await Promise.all([
          searchStocks(searchQuery).catch(() => []),
          searchMutualFunds(searchQuery).catch(() => []),
        ]);

        // Combine results: stocks first, then mutual funds
        const combined = [...stockResults, ...mfResults];
        setSearchResults(combined);
        setShowResults(combined.length > 0);
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, editing]);

  const handleSelectStock = (result: SearchResult) => {
    // Ensure symbol is always a string (MF scheme codes can be numbers)
    setSymbol(String(result.symbol));
    setSearchQuery(`${result.name} (${result.symbol})`);
    setShowResults(false);
    setSearchResults([]);

    // Auto-set asset type based on search result
    if (result.exchange === "MF" || result.type === "mutual_fund") {
      setAssetType("mutual_fund");
    } else if (result.type === "etf") {
      setAssetType("etf");
    } else {
      setAssetType("stock");
    }
  };

  const handleManualEntry = () => {
    // Allow user to manually enter the symbol from their search query
    const trimmed = searchQuery.trim();
    if (trimmed) {
      setSymbol(trimmed);
      setShowResults(false);
    }
  };

  const handleSave = async () => {
    // Convert symbol to string and trim (handles both string and number inputs)
    const symbolStr = String(symbol).trim();
    if (!symbolStr || !quantity || !avgCost || !purchaseDate) return;

    setSaving(true);
    try {
      await onSave({
        symbol: symbolStr,
        quantity: parseFloat(quantity),
        avg_cost: parseFloat(avgCost),
        asset_type: assetType,
        source: source.trim() || undefined,
        purchase_date: purchaseDate,
      });
      onClose();
    } catch {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
      onClose();
    } catch {
      // error handled by parent
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {editing ? "Edit Holding" : "Add Holding"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Search section is OUTSIDE the ScrollView so the dropdown
              can float over the content below without being clipped */}
          <Text style={styles.label}>SEARCH COMPANY</Text>
          <View style={styles.searchWrapper}>
            <TextInput
              style={styles.input}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by name or symbol (e.g. Reliance, INFY)"
              placeholderTextColor={colors.textMuted}
              editable={!editing}
            />
            {searching && (
              <ActivityIndicator
                size="small"
                color={colors.accent}
                style={styles.searchLoader}
              />
            )}

            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
              <View style={styles.resultsDropdown}>
                <ScrollView
                  style={styles.resultsScroll}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                >
                  {searchResults.map((result, idx) => {
                    const isMF = result.exchange === "MF" || result.type === "mutual_fund";
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={styles.resultItem}
                        onPress={() => handleSelectStock(result)}
                      >
                        <View style={styles.resultMain}>
                          <View style={styles.resultHeader}>
                            <Text style={styles.resultName} numberOfLines={1}>
                              {result.name}
                            </Text>
                            {isMF && (
                              <View style={styles.mfBadge}>
                                <Text style={styles.mfBadgeText}>MF</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.resultSymbol}>{result.symbol}</Text>
                        </View>
                        <Text style={styles.resultExchange}>
                          {isMF ? "Mutual Fund" : result.exchange}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  {/* Manual entry option */}
                  <TouchableOpacity
                    style={[styles.resultItem, styles.manualEntryItem]}
                    onPress={handleManualEntry}
                  >
                    <View style={styles.resultMain}>
                      <Text style={styles.manualEntryText}>
                        ✍️ Use "{searchQuery}" as symbol
                      </Text>
                      <Text style={styles.manualEntryHint}>
                        For mutual funds, bonds, or unlisted securities
                      </Text>
                    </View>
                    <Feather name="arrow-right" size={16} color={colors.accent} />
                  </TouchableOpacity>
                </ScrollView>
              </View>
            )}

            {/* No results - show manual entry */}
            {!searching && searchQuery.trim() && searchResults.length === 0 && showResults && (
              <View style={styles.noResultsCard}>
                <Text style={styles.noResultsText}>
                  No stocks found for "{searchQuery}"
                </Text>
                <TouchableOpacity
                  style={styles.manualEntryBtn}
                  onPress={handleManualEntry}
                >
                  <Feather name="edit-3" size={14} color={colors.accent} />
                  <Text style={styles.manualEntryBtnText}>
                    Add as Manual Entry
                  </Text>
                </TouchableOpacity>
                <Text style={styles.manualEntryNote}>
                  Perfect for mutual funds, bonds, or unlisted securities
                </Text>
              </View>
            )}
          </View>

          {symbol && (
            <View style={styles.selectedSymbol}>
              <Feather name="check-circle" size={14} color={colors.green} />
              <Text style={styles.selectedSymbolText}>Selected: {symbol}</Text>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>ASSET TYPE</Text>
            <View style={styles.typeRow}>
              {ASSET_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[
                    styles.typeChip,
                    assetType === t.value && styles.typeChipActive,
                  ]}
                  onPress={() => setAssetType(t.value)}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      assetType === t.value && styles.typeChipTextActive,
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>QUANTITY</Text>
            <TextInput
              style={styles.input}
              value={quantity}
              onChangeText={setQuantity}
              placeholder="e.g. 100"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>AVG COST (per unit)</Text>
            <TextInput
              style={styles.input}
              value={avgCost}
              onChangeText={setAvgCost}
              placeholder="e.g. 150.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>PURCHASE DATE</Text>
            <TextInput
              style={styles.input}
              value={purchaseDate}
              onChangeText={setPurchaseDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>SOURCE (optional)</Text>
            <TextInput
              style={styles.input}
              value={source}
              onChangeText={setSource}
              placeholder="e.g. Fidelity, Schwab"
              placeholderTextColor={colors.textMuted}
            />

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>
                  {editing ? "Update Holding" : "Add Holding"}
                </Text>
              )}
            </TouchableOpacity>

            {editing && onDelete && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color={colors.red} />
                ) : (
                  <Text style={styles.deleteBtnText}>Delete Holding</Text>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
