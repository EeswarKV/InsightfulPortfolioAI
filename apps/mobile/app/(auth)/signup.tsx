import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { signUp, clearError } from "../../store/slices/authSlice";
import type { AppDispatch, RootState } from "../../store";
import { useAppTheme, useThemedStyles } from "../../lib/useAppTheme";
import type { ThemeColors } from "../../lib/themes";

function makeStyles(t: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.bg,
    },
    inner: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 32,
    },
    logoIcon: {
      width: 56,
      height: 56,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
      color: t.textPrimary,
      letterSpacing: -0.5,
    },
    tagline: {
      color: t.textMuted,
      fontSize: 12,
      marginTop: 6,
      marginBottom: 36,
    },
    form: {
      width: "100%",
      maxWidth: 300,
    },
    label: {
      fontSize: 11,
      color: t.textSecondary,
      fontWeight: "600",
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    input: {
      width: "100%",
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 10,
      color: t.textPrimary,
      fontSize: 14,
      marginTop: 6,
      marginBottom: 16,
    },
    roleRow: {
      flexDirection: "row",
      gap: 12,
      marginTop: 6,
      marginBottom: 24,
    },
    roleBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.surface,
    },
    roleBtnActive: {
      borderColor: t.accent,
      backgroundColor: t.accentSoft,
    },
    roleText: {
      fontSize: 13,
      fontWeight: "500",
      color: t.textSecondary,
    },
    roleTextActive: {
      color: t.accent,
    },
    button: {
      width: "100%",
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    buttonText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "600",
    },
    footerText: {
      textAlign: "center",
      fontSize: 12,
      color: t.textMuted,
      marginTop: 16,
    },
    footerLink: {
      color: t.accent,
    },
    hint: {
      color: t.textMuted,
      fontSize: 11,
      marginTop: -8,
      marginBottom: 16,
    },
    error: {
      color: t.red,
      textAlign: "center",
      marginBottom: 16,
      fontSize: 13,
    },
  });
}

export default function SignupScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"manager" | "client">("manager");
  const [managerCode, setManagerCode] = useState("");
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((s: RootState) => s.auth);
  const styles = useThemedStyles(makeStyles);
  const { gradients, colors } = useAppTheme();

  const handleSignup = () => {
    dispatch(clearError());
    dispatch(
      signUp({
        email: email.trim(),
        password,
        fullName,
        role,
        managerId: role === "client" && managerCode.trim() ? managerCode.trim() : undefined,
      })
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        <LinearGradient
          colors={gradients.accent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logoIcon}
        >
          <Feather name="bar-chart-2" size={28} color="#fff" />
        </LinearGradient>

        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.tagline}>Join InsightfulPortfolio</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.form}>
          <Text style={styles.label}>FULL NAME</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            placeholderTextColor={colors.textMuted}
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            style={styles.input}
            placeholder="you@email.com"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>PASSWORD</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text style={styles.label}>ACCOUNT TYPE</Text>
          <View style={styles.roleRow}>
            <TouchableOpacity
              style={[
                styles.roleBtn,
                role === "manager" && styles.roleBtnActive,
              ]}
              onPress={() => setRole("manager")}
              activeOpacity={0.7}
            >
              <Feather
                name="briefcase"
                size={16}
                color={
                  role === "manager"
                    ? colors.accent
                    : colors.textMuted
                }
              />
              <Text
                style={[
                  styles.roleText,
                  role === "manager" && styles.roleTextActive,
                ]}
              >
                Fund Manager
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.roleBtn,
                role === "client" && styles.roleBtnActive,
              ]}
              onPress={() => setRole("client")}
              activeOpacity={0.7}
            >
              <Feather
                name="user"
                size={16}
                color={
                  role === "client"
                    ? colors.accent
                    : colors.textMuted
                }
              />
              <Text
                style={[
                  styles.roleText,
                  role === "client" && styles.roleTextActive,
                ]}
              >
                Client
              </Text>
            </TouchableOpacity>
          </View>

          {role === "client" && (
            <>
              <Text style={styles.label}>MANAGER CODE (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Paste your manager's code"
                placeholderTextColor={colors.textMuted}
                value={managerCode}
                onChangeText={setManagerCode}
                autoCapitalize="none"
              />
              <Text style={styles.hint}>
                Your manager will provide this code to link your account.
              </Text>
            </>
          )}

          <TouchableOpacity
            onPress={handleSignup}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={gradients.accent}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.button, isLoading && styles.buttonDisabled]}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.footerText}>
            Already have an account?{" "}
            <Link href="/(auth)/login" style={styles.footerLink}>
              Sign In
            </Link>
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
