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
import { signIn, clearError } from "../../store/slices/authSlice";
import type { AppDispatch, RootState } from "../../store";
import { theme } from "../../lib/theme";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((s: RootState) => s.auth);

  const handleLogin = () => {
    dispatch(clearError());
    dispatch(signIn({ email: email.trim(), password }));
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        <LinearGradient
          colors={theme.gradients.accent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logoIcon}
        >
          <Feather name="bar-chart-2" size={28} color="#fff" />
        </LinearGradient>

        <Text style={styles.title}>InsightfulPortfolio</Text>
        <Text style={styles.tagline}>Portfolio Intelligence Platform</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.form}>
          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            style={styles.input}
            placeholder="manager@insightful.io"
            placeholderTextColor={theme.colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>PASSWORD</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={theme.colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={theme.gradients.accent}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.button, isLoading && styles.buttonDisabled]}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.footerText}>
            Don't have an account?{" "}
            <Link href="/(auth)/signup" style={styles.footerLink}>
              Request Access
            </Link>
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
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
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  tagline: {
    color: theme.colors.textMuted,
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
    color: theme.colors.textSecondary,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  input: {
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    color: theme.colors.textPrimary,
    fontSize: 14,
    marginTop: 6,
    marginBottom: 16,
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
    color: theme.colors.textMuted,
    marginTop: 16,
  },
  footerLink: {
    color: theme.colors.accent,
  },
  error: {
    color: theme.colors.red,
    textAlign: "center",
    marginBottom: 16,
    fontSize: 13,
  },
});
