import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useDispatch } from "react-redux";
import { theme } from "../../lib/theme";
import { createPriceAlert } from "../../store/slices/priceAlertsSlice";
import type { AppDispatch } from "../../store";

interface CreatePriceAlertModalProps {
  visible: boolean;
  onClose: () => void;
  defaultSymbol?: string;
}

export function CreatePriceAlertModal({
  visible,
  onClose,
  defaultSymbol,
}: CreatePriceAlertModalProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [symbol, setSymbol] = useState("");
  const [alertType, setAlertType] = useState<"above" | "below">("below");
  const [thresholdPrice, setThresholdPrice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setSymbol(defaultSymbol || "");
      setAlertType("below");
      setThresholdPrice("");
    }
  }, [visible, defaultSymbol]);

  const handleSave = async () => {
    if (!symbol.trim() || !thresholdPrice) return;
    const price = parseFloat(thresholdPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert("Invalid Price", "Please enter a valid threshold price.");
      return;
    }
    setSaving(true);
    try {
      await dispatch(
        createPriceAlert({
          symbol: symbol.trim().toUpperCase(),
          alert_type: alertType,
          threshold_price: price,
        })
      ).unwrap();
      onClose();
    } catch (err: any) {
      Alert.alert("Error", err || "Could not create alert");
    } finally {
      setSaving(false);
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
            <Text style={styles.title}>Set Price Alert</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>SYMBOL</Text>
          <TextInput
            style={styles.input}
            value={symbol}
            onChangeText={setSymbol}
            placeholder="e.g. RELIANCE"
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="characters"
          />

          <Text style={styles.label}>ALERT WHEN PRICE IS</Text>
          <View style={styles.typeRow}>
            {(["below", "above"] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeChip,
                  alertType === type && {
                    borderColor: type === "above" ? theme.colors.green : theme.colors.red,
                    backgroundColor: type === "above"
                      ? `${theme.colors.green}15`
                      : `${theme.colors.red}15`,
                  },
                ]}
                onPress={() => setAlertType(type)}
              >
                <Feather
                  name={type === "above" ? "trending-up" : "trending-down"}
                  size={14}
                  color={
                    alertType === type
                      ? type === "above" ? theme.colors.green : theme.colors.red
                      : theme.colors.textMuted
                  }
                />
                <Text
                  style={[
                    styles.typeChipText,
                    alertType === type && {
                      color: type === "above" ? theme.colors.green : theme.colors.red,
                    },
                  ]}
                >
                  {type === "above" ? "Above" : "Below"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>THRESHOLD PRICE (₹)</Text>
          <TextInput
            style={styles.input}
            value={thresholdPrice}
            onChangeText={setThresholdPrice}
            placeholder="e.g. 2400.00"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="decimal-pad"
          />

          {symbol && thresholdPrice ? (
            <View style={styles.summaryRow}>
              <Feather name="bell" size={14} color={theme.colors.accent} />
              <Text style={styles.summaryText}>
                Alert when{" "}
                <Text style={styles.summaryBold}>{symbol.toUpperCase()}</Text>
                {alertType === "above" ? " rises above " : " drops below "}
                <Text style={styles.summaryBold}>₹{parseFloat(thresholdPrice || "0").toLocaleString()}</Text>
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Create Alert</Text>
            )}
          </TouchableOpacity>
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
    paddingBottom: 32,
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
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  summaryText: {
    flex: 1,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  summaryBold: {
    color: theme.colors.textPrimary,
    fontWeight: "600",
  },
  saveBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 22,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
