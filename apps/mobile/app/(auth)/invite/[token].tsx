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
import { theme } from "../../../lib/theme";
import { useIsWebWide } from "../../../lib/platform";
import { getInviteByToken, acceptInvite } from "../../../lib/api";
import type { Invite } from "../../../lib/api";

export default function AcceptInvitePage() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const isWide = useIsWebWide();

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
    // Validation
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
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading invite details...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Feather name="alert-circle" size={48} color={theme.colors.red} />
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
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Feather name="mail" size={32} color={theme.colors.accent} />
            </View>
            <Text style={styles.title}>You've been invited!</Text>
            <Text style={styles.subtitle}>
              {invite.manager.full_name} has invited you to join PortfolioAI
            </Text>
          </View>

          {/* Invite Details */}
          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Feather name="user" size={16} color={theme.colors.textMuted} />
              <Text style={styles.infoLabel}>Your Name:</Text>
              <Text style={styles.infoValue}>{invite.client_name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Feather name="mail" size={16} color={theme.colors.textMuted} />
              <Text style={styles.infoLabel}>Your Email:</Text>
              <Text style={styles.infoValue}>{invite.client_email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Feather name="briefcase" size={16} color={theme.colors.textMuted} />
              <Text style={styles.infoLabel}>Manager:</Text>
              <Text style={styles.infoValue}>{invite.manager.full_name}</Text>
            </View>
          </View>

          {/* Password Form */}
          <View style={styles.form}>
            <Text style={styles.formTitle}>Create Your Password</Text>
            <Text style={styles.formHint}>
              Set a secure password for your account
            </Text>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter password (min. 6 characters)"
                  placeholderTextColor={theme.colors.textMuted}
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
                    color={theme.colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Re-enter password"
                  placeholderTextColor={theme.colors.textMuted}
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
                    color={theme.colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Accept Button */}
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

            {/* Footer */}
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

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    color: theme.colors.textMuted,
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
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
  errorText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  backBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
  },
  backBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  cardWide: {
    width: 500,
    maxWidth: "100%",
  },
  header: {
    padding: 32,
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: theme.colors.accent,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  infoBox: {
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoLabel: {
    color: theme.colors.textMuted,
    fontSize: 13,
    flex: 1,
  },
  infoValue: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  form: {
    padding: 24,
  },
  formTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  formHint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingRight: 12,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: theme.colors.textPrimary,
    fontSize: 14,
  },
  eyeBtn: {
    padding: 4,
  },
  acceptBtn: {
    backgroundColor: theme.colors.accent,
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
    borderTopColor: theme.colors.border,
  },
  footerText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
  },
});
