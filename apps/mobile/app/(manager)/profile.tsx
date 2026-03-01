import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { Feather } from "@expo/vector-icons";
import { useAppTheme, useThemedStyles } from "../../lib/useAppTheme";
import type { ThemeColors } from "../../lib/themes";
import { THEME_META, type ThemeName } from "../../lib/themes";
import { setTheme } from "../../store/slices/themeSlice";
import { useIsWebWide } from "../../lib/platform";
import { ScreenContainer } from "../../components/layout";
import { Avatar } from "../../components/ui";
import { fetchProfile, updateProfile } from "../../lib/api";
import type { RootState, AppDispatch } from "../../store";
import type { DBClient } from "../../types";

function makeStyles(t: ThemeColors) {
  return StyleSheet.create({
    webWrap: {
      flex: 1,
    },
    container: {},
    containerWide: {
      maxWidth: 500,
    },
    avatarSection: {
      alignItems: "center",
      marginBottom: 28,
      gap: 8,
    },
    roleLabel: {
      color: t.accent,
      fontSize: 13,
      fontWeight: "600",
    },
    sectionTitle: {
      color: t.textMuted,
      fontSize: 11,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      fontWeight: "700",
      marginBottom: 10,
    },
    fieldsSection: {
      gap: 16,
      marginBottom: 28,
    },
    field: {
      gap: 6,
    },
    fieldLabel: {
      color: t.textMuted,
      fontSize: 11,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      fontWeight: "600",
    },
    fieldInput: {
      backgroundColor: t.card,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: t.textPrimary,
      fontSize: 14,
    },
    readOnlyField: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    readOnlyText: {
      color: t.textSecondary,
      fontSize: 14,
    },
    saveBtn: {
      backgroundColor: t.accent,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: "center",
      marginBottom: 32,
    },
    saveBtnDisabled: {
      opacity: 0.6,
    },
    saveBtnText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "600",
    },
    // Theme selector
    themeSection: {
      marginBottom: 28,
    },
    themeRow: {
      flexDirection: "row",
      gap: 10,
    },
    themeCard: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: t.border,
      overflow: "hidden",
      alignItems: "center",
      paddingBottom: 10,
    },
    themeCardActive: {
      borderColor: t.accent,
    },
    themePreview: {
      width: "100%",
      height: 48,
      marginBottom: 8,
      alignItems: "flex-end",
      justifyContent: "flex-end",
      padding: 6,
    },
    themeAccentDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    themeLabel: {
      color: t.textPrimary,
      fontSize: 12,
      fontWeight: "600",
    },
    themeCheck: {
      position: "absolute",
      top: 6,
      left: 6,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: t.accent,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}

export default function ProfileScreen() {
  const isWide = useIsWebWide();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((s: RootState) => s.auth);
  const { name: currentTheme, colors } = useAppTheme();
  const styles = useThemedStyles(makeStyles);

  const [profile, setProfile] = useState<DBClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const data = await fetchProfile();
      setProfile(data);
      setFullName(data.full_name || "");
      setPhoneNumber(data.phone_number || "");
    } catch (e: any) {
      console.error("Failed to load profile:", e.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const updated = await updateProfile({
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim() || undefined,
      });
      setProfile(updated);
      Alert.alert("Success", "Profile updated successfully");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <ScreenContainer>
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      </ScreenContainer>
    );
  }

  const content = (
    <View style={[styles.container, isWide && styles.containerWide]}>
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <Avatar name={fullName || "U"} size={80} />
        <Text style={styles.roleLabel}>
          {profile?.role === "manager" ? "Fund Manager" : "Client"}
        </Text>
      </View>

      {/* Fields */}
      <View style={styles.fieldsSection}>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Full Name</Text>
          <TextInput
            style={styles.fieldInput}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter your name"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Email</Text>
          <View style={styles.readOnlyField}>
            <Feather name="lock" size={12} color={colors.textMuted} />
            <Text style={styles.readOnlyText}>{profile?.email || "—"}</Text>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Phone Number</Text>
          <TextInput
            style={styles.fieldInput}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="Enter phone number"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Role</Text>
          <View style={styles.readOnlyField}>
            <Feather name="shield" size={12} color={colors.textMuted} />
            <Text style={styles.readOnlyText}>
              {profile?.role === "manager" ? "Fund Manager" : "Client"}
            </Text>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Member Since</Text>
          <View style={styles.readOnlyField}>
            <Feather name="calendar" size={12} color={colors.textMuted} />
            <Text style={styles.readOnlyText}>
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString()
                : "—"}
            </Text>
          </View>
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.saveBtnText}>Save Changes</Text>
        )}
      </TouchableOpacity>

      {/* Theme selector */}
      <View style={styles.themeSection}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.themeRow}>
          {(Object.keys(THEME_META) as ThemeName[]).map((name) => {
            const meta = THEME_META[name];
            const isSelected = currentTheme === name;
            return (
              <TouchableOpacity
                key={name}
                style={[styles.themeCard, isSelected && styles.themeCardActive]}
                onPress={() => dispatch(setTheme(name))}
                activeOpacity={0.7}
              >
                <View style={[styles.themePreview, { backgroundColor: meta.bg }]}>
                  <View style={[styles.themeAccentDot, { backgroundColor: meta.accent }]} />
                </View>
                <Text style={styles.themeLabel}>{meta.label}</Text>
                {isSelected && (
                  <View style={styles.themeCheck}>
                    <Feather name="check" size={10} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );

  if (isWide) {
    return <View style={styles.webWrap}>{content}</View>;
  }

  return <ScreenContainer>{content}</ScreenContainer>;
}
