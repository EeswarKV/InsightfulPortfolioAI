import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { theme } from "../../lib/theme";
import type { DBHolding } from "../../types";

interface UpdateNAVModalProps {
  visible: boolean;
  holding: DBHolding | null;
  onClose: () => void;
  onUpdate: (holdingId: string, newNAV: number) => Promise<void>;
}

export function UpdateNAVModal({
  visible,
  holding,
  onClose,
  onUpdate,
}: UpdateNAVModalProps) {
  const [navInput, setNavInput] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (holding) {
      setNavInput(holding.manual_price?.toString() || holding.avg_cost.toString());
    }
  }, [holding, visible]);

  const handleUpdate = async () => {
    if (!holding || !navInput.trim()) return;

    const newNAV = parseFloat(navInput);
    if (isNaN(newNAV) || newNAV <= 0) {
      Alert.alert("Invalid NAV", "Please enter a valid positive number");
      return;
    }

    setUpdating(true);
    try {
      await onUpdate(holding.id, newNAV);
      onClose();
    } catch (error: any) {
      Alert.alert("Update Failed", error.message || "Failed to update NAV");
    } finally {
      setUpdating(false);
    }
  };

  if (!holding) return null;

  const lastUpdate = holding.last_price_update
    ? new Date(holding.last_price_update).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Never";

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Update NAV / Price</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={20} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.holdingInfo}>
            <Text style={styles.symbol}>{holding.symbol}</Text>
            <Text style={styles.assetType}>{holding.asset_type.toUpperCase()}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Quantity</Text>
              <Text style={styles.infoValue}>{holding.quantity} units</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Avg Cost</Text>
              <Text style={styles.infoValue}>₹{holding.avg_cost.toFixed(2)}</Text>
            </View>
          </View>

          <Text style={styles.label}>CURRENT NAV / PRICE</Text>
          <TextInput
            style={styles.input}
            value={navInput}
            onChangeText={setNavInput}
            placeholder="Enter current NAV"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />

          <View style={styles.lastUpdate}>
            <Feather name="clock" size={12} color={theme.colors.textMuted} />
            <Text style={styles.lastUpdateText}>Last updated: {lastUpdate}</Text>
          </View>

          <TouchableOpacity
            style={[styles.updateBtn, updating && { opacity: 0.7 }]}
            onPress={handleUpdate}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.updateBtnText}>Update NAV</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.hint}>
            💡 Get latest NAV from fund house website or AMFI India
          </Text>
        </View>
      </View>
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
    maxHeight: "70%",
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
  holdingInfo: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  symbol: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  assetType: {
    color: theme.colors.accent,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 20,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    fontWeight: "600",
  },
  label: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  lastUpdate: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 20,
  },
  lastUpdateText: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  updateBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  updateBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  hint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
});
