import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Feather } from "@expo/vector-icons";
import { useThemeColors, useThemedStyles } from "../../lib/useAppTheme";
import type { ThemeColors } from "../../lib/themes";
import { createInvite, type InviteCreateRequest } from "../../lib/api";

interface InviteClientModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function makeStyles(t: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.7)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    modal: {
      backgroundColor: t.card,
      borderRadius: 16,
      width: "100%",
      maxWidth: 500,
      maxHeight: "90%",
      borderWidth: 1,
      borderColor: t.border,
    },
    header: {
      padding: 24,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
    },
    headerTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: t.accentSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: t.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontSize: 20,
      fontWeight: "700",
      color: t.textPrimary,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 13,
      color: t.textSecondary,
      lineHeight: 18,
    },
    form: {
      padding: 24,
      maxHeight: 400,
    },
    field: {
      marginBottom: 20,
    },
    label: {
      fontSize: 11,
      fontWeight: "600",
      color: t.textMuted,
      marginBottom: 8,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    input: {
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 10,
      padding: 14,
      fontSize: 15,
      color: t.textPrimary,
    },
    error: {
      color: t.red,
      fontSize: 13,
      marginBottom: 16,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 8,
      borderLeftWidth: 3,
      borderLeftColor: t.red,
    },
    infoBox: {
      flexDirection: "row",
      gap: 10,
      backgroundColor: t.accentSoft,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: t.accent,
      marginTop: 4,
    },
    infoText: {
      flex: 1,
      fontSize: 12,
      color: t.accent,
      lineHeight: 17,
    },
    actions: {
      flexDirection: "row",
      gap: 12,
      padding: 24,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: t.border,
    },
    btn: {
      flex: 1,
      height: 48,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },
    btnSecondary: {
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
    },
    btnPrimary: {
      backgroundColor: t.accent,
    },
    btnDisabled: {
      opacity: 0.5,
    },
    btnTextSecondary: {
      color: t.textPrimary,
      fontSize: 15,
      fontWeight: "600",
    },
    btnTextPrimary: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "600",
    },
  });
}

export function InviteClientModal({
  visible,
  onClose,
  onSuccess,
}: InviteClientModalProps) {
  const colors = useThemeColors();
  const styles = useThemedStyles(makeStyles);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleReset = () => {
    setEmail("");
    setFullName("");
    setPhone("");
    setError("");
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async () => {
    // Validation
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!fullName.trim()) {
      setError("Full name is required");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const inviteData: InviteCreateRequest = {
        email: email.trim(),
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
      };

      const result = await createInvite(inviteData);

      Alert.alert(
        "Invite Sent!",
        `An invite has been sent to ${email}. They have 7 days to accept.`,
        [
          {
            text: "Copy Invite Link",
            onPress: async () => {
              await Clipboard.setStringAsync(result.invite_url);
              Alert.alert("Copied!", "Invite link copied to clipboard");
            },
          },
          { text: "Done", onPress: handleClose },
        ]
      );

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error("Failed to create invite:", err);
      setError(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.iconWrap}>
                <Feather name="user-plus" size={20} color={colors.accent} />
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={handleClose}
                disabled={loading}
              >
                <Feather name="x" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.title}>Invite Client</Text>
            <Text style={styles.subtitle}>
              Send an invitation to your client. They'll receive an email with a link to
              set up their account.
            </Text>
          </View>

          {/* Form */}
          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            {error ? (
              <Text style={[styles.error, { backgroundColor: `${colors.red}15` }]}>{error}</Text>
            ) : null}

            {/* Email */}
            <View style={styles.field}>
              <Text style={styles.label}>EMAIL ADDRESS *</Text>
              <TextInput
                style={styles.input}
                placeholder="client@example.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            {/* Full Name */}
            <View style={styles.field}>
              <Text style={styles.label}>FULL NAME *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter client's full name"
                placeholderTextColor={colors.textMuted}
                value={fullName}
                onChangeText={setFullName}
                editable={!loading}
              />
            </View>

            {/* Phone (Optional) */}
            <View style={styles.field}>
              <Text style={styles.label}>PHONE NUMBER (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="+91 98765 43210"
                placeholderTextColor={colors.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                editable={!loading}
              />
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Feather name="info" size={16} color={colors.accent} />
              <Text style={styles.infoText}>
                The invite link will expire in 7 days. You can resend or cancel the
                invite anytime from the Pending Invites section.
              </Text>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.btnTextSecondary}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary, loading && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="send" size={16} color="#fff" />
                  <Text style={styles.btnTextPrimary}>Send Invite</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
