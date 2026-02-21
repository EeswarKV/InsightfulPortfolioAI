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
import { useSelector } from "react-redux";
import { Feather } from "@expo/vector-icons";
import { theme } from "../../lib/theme";
import { useIsWebWide } from "../../lib/platform";
import { ScreenContainer } from "../../components/layout";
import { Avatar } from "../../components/ui";
import { fetchProfile, updateProfile } from "../../lib/api";
import type { RootState } from "../../store";
import type { DBClient } from "../../types";

export default function ProfileScreen() {
  const isWide = useIsWebWide();
  const { user } = useSelector((s: RootState) => s.auth);
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
        <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 40 }} />
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
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Email</Text>
          <View style={styles.readOnlyField}>
            <Feather name="lock" size={12} color={theme.colors.textMuted} />
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
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Role</Text>
          <View style={styles.readOnlyField}>
            <Feather name="shield" size={12} color={theme.colors.textMuted} />
            <Text style={styles.readOnlyText}>
              {profile?.role === "manager" ? "Fund Manager" : "Client"}
            </Text>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Member Since</Text>
          <View style={styles.readOnlyField}>
            <Feather name="calendar" size={12} color={theme.colors.textMuted} />
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
    </View>
  );

  if (isWide) {
    return <View style={styles.webWrap}>{content}</View>;
  }

  return <ScreenContainer>{content}</ScreenContainer>;
}

const styles = StyleSheet.create({
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
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
  fieldsSection: {
    gap: 16,
    marginBottom: 28,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "600",
  },
  fieldInput: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.textPrimary,
    fontSize: 14,
  },
  readOnlyField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  readOnlyText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
