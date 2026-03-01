import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useIsWebWide } from "../../../lib/platform";
import { getInviteByToken, acceptInvite } from "../../../lib/api";
import type { Invite } from "../../../lib/api";
import { useThemeColors, useThemedStyles } from "../../../lib/useAppTheme";
import type { ThemeColors } from "../../../lib/themes";

function makeStyles(t: ThemeColors) {
  return StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: t.bg,
    },
    container: {
      flex: 1,
    },
    contentContainer: {
      flexGrow: 1,
      padding: 20,
      justifyContent: "center",
    },
    contentContainerWide: {
      alignItems: "center",
    },
    loadingContainer: {
      alignItems: "center",
      gap: 16,
    },
    loadingText: {
      color: t.textMuted,
      fontSize: 14,
    },
    errorContainer: {
      alignItems: "center",
      gap: 16,
      padding: 24,
    },
    errorIcon: {
      marginBottom: 8,
    },
    errorTitle: {
      color: t.textPrimary,
      fontSize: 20,
      fontWeight: "700",
    },
    errorText: {
      color: t.textMuted,
      fontSize: 14,
      textAlign: "center",
      lineHeight: 20,
    },
    backBtn: {
      marginTop: 16,
      paddingHorizontal: 24,
      paddingVertical: 12,
      backgroundColor: t.accent,
      borderRadius: 10,
    },
    backBtnText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "600",
    },
    card: {
      backgroundColor: t.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: t.border,
      overflow: "hidden",
    },
    cardWide: {
      width: 500,
      maxWidth: "100%",
    },
    header: {
      padding: 32,
      alignItems: "center",
      backgroundColor: t.surface,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
    },
    iconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: t.card,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
      borderWidth: 2,
      borderColor: t.accent,
    },
    title: {
      color: t.textPrimary,
      fontSize: 24,
      fontWeight: "700",
      marginBottom: 8,
    },
    subtitle: {
      color: t.textMuted,
      fontSize: 14,
      textAlign: "center",
      lineHeight: 20,
    },
    infoBox: {
      padding: 20,
      backgroundColor: t.surface,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
      gap: 12,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    infoLabel: {
      color: t.textMuted,
      fontSize: 13,
      flex: 1,
    },
    infoValue: {
      color: t.textPrimary,
      fontSize: 13,
      fontWeight: "600",
    },
    form: {
      padding: 24,
    },
    formTitle: {
      color: t.textPrimary,
      fontSize: 16,
      fontWeight: "700",
      marginBottom: 4,
    },
    formHint: {
      color: t.textMuted,
      fontSize: 12,
      marginBottom: 20,
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      color: t.textPrimary,
      fontSize: 13,
      fontWeight: "600",
      marginBottom: 8,
    },
    passwordContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 10,
      paddingRight: 12,
    },
    passwordInput: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 14,
      color: t.textPrimary,
      fontSize: 14,
    },
    eyeBtn: {
      padding: 4,
    },
    acceptBtn: {
      backgroundColor: t.accent,
      borderRadius: 10,
      paddingVertical: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 8,
    },
    acceptBtnDisabled: {
      opacity: 0.6,
    },
    acceptBtnText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "600",
    },
    footer: {
      marginTop: 20,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: t.border,
    },
    footerText: {
      color: t.textMuted,
      fontSize: 11,
      textAlign: "center",
      lineHeight: 16,
    },
  });
}

export default function AcceptInvitePage() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const isWide = useIsWebWide();
  const styles = useThemedStyles(makeStyles);
  const colors = useThemeColors();

  const [invite, setInvite] = useState<Invite & { manager: { full_name: string; email: string } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (token) {
      fetchInviteDetails();
    }
  }, [token]);

  const fetchInviteDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getInviteByToken(token as string);
      setInvite(data);
    } catch (err: any) {
      setError(err.message || "Failed to load invite details");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!password.trim()) {
      Alert.alert("Error", "Please enter a password");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    try {
      setAccepting(true);
      await acceptInvite(token as string, { password });

      Alert.alert(
        "Success!",
        `Your account has been created and linked to ${invite?.manager.full_name}. Please log in to continue.`,
        [
          {
            text: "Go to Login",
            onPress: () => router.replace("/(auth)/login"),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to accept invite");
    } finally {
      setAccepting(false);
    }
  };

  const content = (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        isWide && styles.contentContainerWide,
      ]}
    >
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading invite details...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Feather name="alert-circle" size={48} color={colors.red} />
          </View>
          <Text style={styles.errorTitle}>Invalid or Expired Invite</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.replace("/(auth)/login")}
          >
            <Text style={styles.backBtnText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      ) : invite ? (
        <View style={[styles.card, isWide && styles.cardWide]}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Feather name="mail" size={32} color={colors.accent} />
            </View>
            <Text style={styles.title}>You've been invited!</Text>
            <Text style={styles.subtitle}>
              {invite.manager.full_name} has invited you to join PortfolioAI
            </Text>
          </View>

          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Feather name="user" size={16} color={colors.textMuted} />
              <Text style={styles.infoLabel}>Your Name:</Text>
              <Text style={styles.infoValue}>{invite.client_name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Feather name="mail" size={16} color={colors.textMuted} />
              <Text style={styles.infoLabel}>Your Email:</Text>
              <Text style={styles.infoValue}>{invite.client_email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Feather name="briefcase" size={16} color={colors.textMuted} />
              <Text style={styles.infoLabel}>Manager:</Text>
              <Text style={styles.infoValue}>{invite.manager.full_name}</Text>
            </View>
          </View>

          <View style={styles.form}>
            <Text style={styles.formTitle}>Create Your Password</Text>
            <Text style={styles.formHint}>
              Set a secure password for your account
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter password (min. 6 characters)"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={18}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Re-enter password"
                  placeholderTextColor={colors.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Feather
                    name={showConfirmPassword ? "eye-off" : "eye"}
                    size={18}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.acceptBtn, accepting && styles.acceptBtnDisabled]}
              onPress={handleAcceptInvite}
              disabled={accepting}
            >
              {accepting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="check-circle" size={18} color="#fff" />
                  <Text style={styles.acceptBtnText}>Accept & Create Account</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                By accepting, you agree to link your portfolio with {invite.manager.full_name}
              </Text>
            </View>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );

  return <View style={styles.wrapper}>{content}</View>;
}
