import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { api, ApiError } from "@/lib/api";
import { FolderOpen, Plus } from "lucide-react-native";
import { useRouter } from "expo-router";

type Case = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type CasesResponse = { cases: Case[] };

const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  active: "En cours",
  pending: "En attente",
  closed: "Clos",
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function DossiersScreen() {
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await api<CasesResponse>("/api/cases");
      setCases(data.cases ?? []);
    } catch (e) {
      const msg =
        e instanceof ApiError && e.status === 401
          ? "Reconnecte-toi pour voir tes dossiers."
          : "Chargement impossible. Tire pour rafraîchir.";
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <Screen scroll={false}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator color="#C9A84C" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          marginTop: 8,
        }}
      >
        <View>
          <Text style={{ color: "#C9A84C", fontSize: 12, letterSpacing: 2 }}>
            CABINET
          </Text>
          <Text
            style={{ color: "#F5F5F7", fontSize: 24, fontWeight: "700" }}
          >
            Tes dossiers
          </Text>
        </View>
        <Button
          testID="dossiers-new"
          variant="secondary"
          onPress={() => router.push("/(tabs)/chat")}
        >
          + Nouveau
        </Button>
      </View>

      {error ? (
        <Card>
          <Text style={{ color: "#EF4444", fontSize: 14 }}>{error}</Text>
        </Card>
      ) : null}

      <FlatList
        data={cases}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingBottom: 80, gap: 12 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor="#C9A84C"
          />
        }
        ListEmptyComponent={
          !error ? (
            <Card>
              <View style={{ alignItems: "center", paddingVertical: 20 }}>
                <FolderOpen color="#6B7280" size={32} />
                <Text
                  style={{
                    color: "#F5F5F7",
                    fontSize: 16,
                    fontWeight: "600",
                    marginTop: 12,
                  }}
                >
                  Aucun dossier pour l'instant
                </Text>
                <Text
                  style={{
                    color: "#9CA3AF",
                    fontSize: 13,
                    marginTop: 4,
                    textAlign: "center",
                  }}
                >
                  Démarre une conversation avec JurisIA, on créera un dossier
                  pour toi automatiquement.
                </Text>
                <View style={{ marginTop: 16, width: "100%" }}>
                  <Button
                    testID="dossiers-empty-cta"
                    onPress={() => router.push("/(tabs)/chat")}
                  >
                    Démarrer un dossier
                  </Button>
                </View>
              </View>
            </Card>
          ) : null
        }
        renderItem={({ item }) => (
          <Card testID={`dossier-${item.id}`}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: "rgba(201,168,76,0.15)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FolderOpen color="#C9A84C" size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: "#F5F5F7",
                    fontSize: 15,
                    fontWeight: "600",
                  }}
                  numberOfLines={1}
                >
                  {item.title || "Dossier sans titre"}
                </Text>
                <Text
                  style={{ color: "#9CA3AF", fontSize: 12, marginTop: 2 }}
                >
                  {STATUS_LABEL[item.status] ?? item.status} ·{" "}
                  {formatDate(item.updated_at)}
                </Text>
              </View>
              <Plus color="#6B7280" size={16} />
            </View>
          </Card>
        )}
      />
    </Screen>
  );
}
