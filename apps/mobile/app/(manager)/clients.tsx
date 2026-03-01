import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
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
import { InviteClientModal, AddHoldingModal } from "../../components/modals";
import { fetchClients, assignClient, unlinkClient, addHolding } from "../../store/slices/portfolioSlice";
import type { AppDispatch, RootState } from "../../store";
import type { AssetType } from "../../types";

export default function ClientsScreen() {
  const [search, setSearch] = useState("");
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [linkEmail, setLinkEmail] = useState("");
  const [linking, setLinking] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkHoldingModal, setShowBulkHoldingModal] = useState(false);
  const router = useRouter();
  const isWide = useIsWebWide();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((s: RootState) => s.auth);
  const { clients, portfolios, holdings, isLoading } = useSelector((s: RootState) => s.portfolio);
  const [clientSort, setClientSort] = useState<"default" | "value_desc" | "value_asc" | "name">("default");

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchClients(user.id));
    }
  }, [user?.id, dispatch]);

  // Compute invested value per client from holdings
  const clientValues = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of portfolios) {
      const pHoldings = holdings[p.id] ?? [];
      const val = pHoldings.reduce((s, h) => s + Number(h.quantity) * Number(h.avg_cost), 0);
      map.set(p.client_id, (map.get(p.client_id) ?? 0) + val);
    }
    return map;
  }, [portfolios, holdings]);

  const filtered = useMemo(() => {
    const base = clients.filter((c) =>
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
    );
    if (clientSort === "default") return base;
    return [...base].sort((a, b) => {
      if (clientSort === "name") return a.full_name.localeCompare(b.full_name);
      const va = clientValues.get(a.id) ?? 0;
      const vb = clientValues.get(b.id) ?? 0;
      return clientSort === "value_desc" ? vb - va : va - vb;
    });
  }, [clients, search, clientSort, clientValues]);

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
    const performUnlink = async () => {
      try {
        await dispatch(unlinkClient(clientId)).unwrap();
      } catch (err: any) {
        const msg = err || "Could not unlink client";
        if (Platform.OS === "web") {
          (window as any).alert(msg);
        } else {
          Alert.alert("Error", msg);
        }
      }
    };

    if (Platform.OS === "web") {
      if ((window as any).confirm(`Unlink ${clientName}? This will remove access to their portfolios.`)) {
        performUnlink();
      }
    } else {
      Alert.alert(
        "Unlink Client",
        `Are you sure you want to unlink ${clientName}? This will remove access to their portfolios.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Unlink", style: "destructive", onPress: performUnlink },
        ]
      );
    }
  };

  const toggleSelect = (clientId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(clientId) ? next.delete(clientId) : next.add(clientId);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkAddHolding = async (data: {
    symbol: string;
    quantity: number;
    avg_cost: number;
    asset_type: AssetType;
    source?: string;
  }) => {
    try {
      const targetPortfolios = portfolios.filter((p) =>
        selectedIds.has(p.client_id)
      );
      await Promise.all(
        targetPortfolios.map((p) =>
          dispatch(addHolding({ portfolioId: p.id, holding: data })).unwrap()
        )
      );
      exitSelectMode();
      setShowBulkHoldingModal(false);
      Alert.alert(
        "Done",
        `Added ${data.symbol} to ${targetPortfolios.length} portfolio${targetPortfolios.length !== 1 ? "s" : ""}.`
      );
    } catch (err: any) {
      Alert.alert("Error", err || "Could not add holding to all clients");
      setShowBulkHoldingModal(false);
    }
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
          {selectMode ? (
            <TouchableOpacity style={styles.cancelBtn} onPress={exitSelectMode}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          ) : (
            <>
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
                <Feather name="user-plus" size={16} color="#fff" />
                {isWide && <Text style={styles.linkBtnText}>Link Client</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.selectBtn}
                onPress={() => setSelectMode(true)}
              >
                <Feather name="check-square" size={16} color={theme.colors.accent} />
                {isWide && <Text style={styles.selectBtnText}>Select</Text>}
              </TouchableOpacity>
            </>
          )}
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

      {/* Sort controls */}
      {!selectMode && clients.length > 1 && (
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Sort:</Text>
          {([
            { key: "default", label: "Default" },
            { key: "value_desc", label: "Value ↓" },
            { key: "value_asc", label: "Value ↑" },
            { key: "name", label: "A–Z" },
          ] as const).map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.sortChip, clientSort === key && styles.sortChipActive]}
              onPress={() => setClientSort(key)}
            >
              <Text style={[styles.sortChipText, clientSort === key && styles.sortChipTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
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
          {filtered.map((client) => {
            const isSelected = selectedIds.has(client.id);
            return (
              <TouchableOpacity
                key={client.id}
                style={[
                  styles.card,
                  isWide && styles.cardWide,
                  isSelected && styles.cardSelected,
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  if (selectMode) {
                    toggleSelect(client.id);
                  } else {
                    router.push(`/(manager)/portfolio/${client.id}` as any);
                  }
                }}
              >
                <View style={styles.cardTop}>
                  {selectMode && (
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Feather name="check" size={12} color="#fff" />}
                    </View>
                  )}
                  <Avatar name={client.full_name} size={isWide ? 48 : 42} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.clientName}>{client.full_name}</Text>
                    <Text style={styles.clientEmail}>{client.email}</Text>
                  </View>
                  {!selectMode && (
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleUnlinkClient(client.id, client.full_name);
                      }}
                    >
                      <Feather name="trash-2" size={16} color={theme.colors.red} />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.badges}>
                  <Badge color="accent">{client.role}</Badge>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

      )}

      {/* Bulk action bar */}
      {selectMode && selectedIds.size > 0 && (
        <View style={styles.bulkBar}>
          <Text style={styles.bulkBarText}>
            {selectedIds.size} client{selectedIds.size !== 1 ? "s" : ""} selected
          </Text>
          <TouchableOpacity
            style={styles.bulkBtn}
            onPress={() => setShowBulkHoldingModal(true)}
          >
            <Feather name="plus" size={14} color="#fff" />
            <Text style={styles.bulkBtnText}>Add Holding</Text>
          </TouchableOpacity>
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

      {/* Bulk Add Holding Modal */}
      <AddHoldingModal
        visible={showBulkHoldingModal}
        onClose={() => setShowBulkHoldingModal(false)}
        onSave={handleBulkAddHolding}
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
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  linkBtnText: {
    color: "#fff",
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
    flex: 1,
    minWidth: 240,
    maxWidth: 400,
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
  selectBtn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentSoft,
  },
  selectBtnText: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
  cancelBtn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  cancelBtnText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  cardSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accentSoft,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.accent,
  },
  bulkBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: theme.colors.accent + "40",
  },
  bulkBarText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  bulkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bulkBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  sortLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  sortChip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sortChipActive: {
    backgroundColor: theme.colors.accentSoft,
    borderColor: theme.colors.accent,
  },
  sortChipText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: "500",
  },
  sortChipTextActive: {
    color: theme.colors.accent,
    fontWeight: "600",
  },
});
