import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { Feather } from "@expo/vector-icons";
import { theme } from "../../lib/theme";
import { useIsWebWide } from "../../lib/platform";
import { ScreenContainer } from "../../components/layout";
import { SearchInput, Badge, Avatar } from "../../components/ui";
import { InviteClientModal } from "../../components/modals";
import { fetchClients, assignClient, unlinkClient } from "../../store/slices/portfolioSlice";
import type { AppDispatch, RootState } from "../../store";

export default function ClientsScreen() {
  const [search, setSearch] = useState("");
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [linkEmail, setLinkEmail] = useState("");
  const [linking, setLinking] = useState(false);
  const router = useRouter();
  const isWide = useIsWebWide();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((s: RootState) => s.auth);
  const { clients, isLoading } = useSelector((s: RootState) => s.portfolio);

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchClients(user.id));
    }
  }, [user?.id, dispatch]);

  const filtered = clients.filter((c) =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleLinkClient = async () => {
    if (!linkEmail.trim() || !user?.id) return;
    setLinking(true);
    try {
      await dispatch(
        assignClient({ clientEmail: linkEmail.trim(), managerId: user.id })
      ).unwrap();
      setLinkEmail("");
      setShowLinkModal(false);
    } catch (err: any) {
      Alert.alert("Error", err || "Could not link client");
    } finally {
      setLinking(false);
    }
  };

  const handleUnlinkClient = (clientId: string, clientName: string) => {
    Alert.alert(
      "Unlink Client",
      `Are you sure you want to unlink ${clientName}? This will remove access to their portfolios.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unlink",
          style: "destructive",
          onPress: async () => {
            try {
              await dispatch(unlinkClient(clientId)).unwrap();
            } catch (err: any) {
              Alert.alert("Error", err || "Could not unlink client");
            }
          },
        },
      ]
    );
  };

  const content = (
    <>
      {!isWide && <Text style={styles.pageTitle}>Clients</Text>}

      <View style={isWide ? styles.searchRowWide : undefined}>
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <SearchInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search clients..."
            />
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowInviteModal(true)}
          >
            <Feather name="mail" size={16} color="#fff" />
            {isWide && <Text style={styles.addBtnText}>Invite Client</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => setShowLinkModal(!showLinkModal)}
          >
            <Feather name="user-plus" size={16} color={theme.colors.accent} />
            {isWide && <Text style={styles.linkBtnText}>Link Client</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {/* Link client inline form */}
      {showLinkModal && (
        <View style={styles.linkCard}>
          <Text style={styles.linkTitle}>Link an existing client by email</Text>
          <Text style={styles.linkHint}>
            The client must have signed up already and not be assigned to another manager.
          </Text>
          <View style={styles.linkRow}>
            <TextInput
              style={styles.linkInput}
              placeholder="client@email.com"
              placeholderTextColor={theme.colors.textMuted}
              value={linkEmail}
              onChangeText={setLinkEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleLinkClient}
              disabled={linking}
            >
              {linking ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Link</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Client list */}
      {isLoading ? (
        <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyCard}>
          <Feather name="users" size={32} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>
            {search ? "No clients match your search" : "No clients yet"}
          </Text>
          <Text style={styles.emptyText}>
            {search
              ? "Try a different search term"
              : "Use 'Link Client' to add existing client accounts"}
          </Text>
        </View>
      ) : (
        <View style={[styles.grid, isWide && styles.gridWide]}>
          {filtered.map((client) => (
            <TouchableOpacity
              key={client.id}
              style={[styles.card, isWide && styles.cardWide]}
              activeOpacity={0.7}
              onPress={() =>
                router.push(`/(manager)/portfolio/${client.id}` as any)
              }
            >
              <View style={styles.cardTop}>
                <Avatar name={client.full_name} size={isWide ? 48 : 42} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.clientName}>{client.full_name}</Text>
                  <Text style={styles.clientEmail}>{client.email}</Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleUnlinkClient(client.id, client.full_name);
                  }}
                >
                  <Feather name="trash-2" size={16} color={theme.colors.red} />
                </TouchableOpacity>
              </View>

              <View style={styles.badges}>
                <Badge color="accent">{client.role}</Badge>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Invite Client Modal */}
      <InviteClientModal
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={() => {
          setShowInviteModal(false);
          if (user?.id) {
            dispatch(fetchClients(user.id));
          }
        }}
      />
    </>
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
  pageTitle: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
  },
  searchRowWide: {
    marginBottom: 24,
  },
  topRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  addBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  linkBtn: {
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  addBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  linkBtnText: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
  linkCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    marginTop: 12,
    marginBottom: 16,
  },
  linkTitle: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  linkHint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginBottom: 12,
  },
  linkRow: {
    flexDirection: "row",
    gap: 10,
  },
  linkInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    color: theme.colors.textPrimary,
    fontSize: 14,
  },
  submitBtn: {
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  grid: {
    marginTop: 16,
  },
  gridWide: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 0,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
  },
  cardWide: {
    width: "31%",
    borderRadius: 16,
    padding: 24,
    marginBottom: 0,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  deleteBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  clientName: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  clientEmail: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  badges: {
    flexDirection: "row",
    gap: 8,
  },
  emptyCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    padding: 32,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    gap: 8,
    marginTop: 16,
  },
  emptyTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: "center",
  },
});
