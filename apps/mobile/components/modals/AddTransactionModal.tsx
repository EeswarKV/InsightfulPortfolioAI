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
import { theme } from "../../lib/theme";
import type { TransactionType } from "../../types";

const TX_TYPES: { value: TransactionType; label: string; icon: string; color: string }[] = [
  { value: "buy", label: "Buy", icon: "arrow-down-circle", color: theme.colors.green },
  { value: "sell", label: "Sell", icon: "arrow-up-circle", color: theme.colors.red },
  { value: "dividend", label: "Dividend", icon: "dollar-sign", color: theme.colors.accent },
];

interface AddTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    symbol: string;
    type: TransactionType;
    quantity: number;
    price: number;
    date?: string;
  }) => Promise<void>;
  defaultSymbol?: string;
}

export function AddTransactionModal({
  visible,
  onClose,
  onSave,
  defaultSymbol,
}: AddTransactionModalProps) {
  const [symbol, setSymbol] = useState("");
  const [txType, setTxType] = useState<TransactionType>("buy");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [txDate, setTxDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setSymbol(defaultSymbol || "");
      setTxType("buy");
      setQuantity("");
      setPrice("");
      setTxDate(new Date().toISOString().split("T")[0]);
    }
  }, [visible, defaultSymbol]);

  const handleSave = async () => {
    if (!symbol.trim() || !quantity || !price) return;
    setSaving(true);
    try {
      await onSave({
        symbol: symbol.trim().toUpperCase(),
        type: txType,
        quantity: parseFloat(quantity),
        price: parseFloat(price),
        date: txDate || undefined,
      });
      onClose();
    } catch {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  };

  const total = quantity && price ? (parseFloat(quantity) * parseFloat(price)) : 0;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Record Transaction</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>TYPE</Text>
            <View style={styles.typeRow}>
              {TX_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[
                    styles.typeChip,
                    txType === t.value && { borderColor: t.color, backgroundColor: `${t.color}15` },
                  ]}
                  onPress={() => setTxType(t.value)}
                >
                  <Feather
                    name={t.icon as any}
                    size={14}
                    color={txType === t.value ? t.color : theme.colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.typeChipText,
                      txType === t.value && { color: t.color },
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>SYMBOL</Text>
            <TextInput
              style={styles.input}
              value={symbol}
              onChangeText={setSymbol}
              placeholder="e.g. AAPL"
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="characters"
            />

            <Text style={styles.label}>QUANTITY</Text>
            <TextInput
              style={styles.input}
              value={quantity}
              onChangeText={setQuantity}
              placeholder="e.g. 50"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>PRICE (per unit)</Text>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              placeholder="e.g. 150.00"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>DATE</Text>
            <TextInput
              style={styles.input}
              value={txDate}
              onChangeText={setTxDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.colors.textMuted}
            />

            {(txType === "buy" || txType === "sell") && (
              <View style={styles.infoRow}>
                <Feather name="info" size={12} color={theme.colors.accent} />
                <Text style={styles.infoText}>
                  {txType === "buy"
                    ? "This will update the holding's quantity and average cost."
                    : "This will decrease the holding's quantity."}
                </Text>
              </View>
            )}

            {total > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Value</Text>
                <Text style={styles.totalValue}>
                  ₹{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Record Transaction</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: theme.colors.bg,
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
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  label: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    color: theme.colors.textPrimary,
    fontSize: 14,
  },
  typeRow: {
    flexDirection: "row",
    gap: 10,
  },
  typeChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  typeChipText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 14,
    marginTop: 16,
  },
  totalLabel: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  totalValue: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    padding: 10,
    backgroundColor: `${theme.colors.accent}12`,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${theme.colors.accent}30`,
  },
  infoText: {
    color: theme.colors.accent,
    fontSize: 12,
    flex: 1,
  },
  saveBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 16,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
