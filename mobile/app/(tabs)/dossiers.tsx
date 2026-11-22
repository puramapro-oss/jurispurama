import { useCallback, useEffect, useRef, useState } from "react";
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
import { useAuth } from "@/store/auth";
import { CASE_STATUS_LABELS, CASE_TYPE_LABELS } from "../../../src/lib/case-helpers";
import type { JurisCase } from "../../../src/types";

type Case = Pick<JurisCase, "id" | "type" | "summary" | "status" | "created_at" | "updated_at">;

type CasesResponse = { cases: Case[] };

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
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
  const userId = useAuth((state) => state.user?.id ?? null);
  const activeRequest = useRef<AbortController | null>(null);
  const [result, setResult] = useState<{
    owner: string | null;
    cases: Case[];
    loading: boolean;
    refreshing: boolean;
    error: string | null;
  }>({ owner: userId, cases: [], loading: true, refreshing: false, error: null });
  // Hide the previous account's data immediately, before the next effect runs.
  const empty = { owner: userId, cases: [], loading: !!userId, refreshing: false,
    error: userId ? null : "Reconnecte-toi pour voir tes dossiers." };
  if (result.owner !== userId) setResult(empty);
  const { cases, loading, refreshing, error } = !userId || result.owner !== userId ? empty : result;

  const load = useCallback(() => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    const isCurrent = () => activeRequest.current === controller &&
      !controller.signal.aborted && (useAuth.getState().user?.id ?? null) === userId;
    if (!userId) {
      activeRequest.current = null;
      return;
    }
    return api<CasesResponse>("/api/cases", { signal: controller.signal }).then((data) => {
      if (!isCurrent()) return;
      setResult({ owner: userId, cases: data.cases ?? [], loading: false, refreshing: false, error: null });
    }).catch((e) => {
      if (!isCurrent()) return;
      const msg =
        e instanceof ApiError && e.status === 401
          ? "Reconnecte-toi pour voir tes dossiers."
          : "Chargement impossible. Tire pour rafraîchir.";
      setResult((previous) => ({ ...previous, owner: userId, error: msg, loading: false, refreshing: false }));
    }).finally(() => {
      if (activeRequest.current === controller) activeRequest.current = null;
    });
  }, [userId]);

  useEffect(() => {
    void load();
    return () => {
      activeRequest.current?.abort();
      activeRequest.current = null;
    };
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
              setResult((previous) => ({ ...previous, owner: userId, error: null, refreshing: true }));
              void load();
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
                  Aucun dossier pour l’instant
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
                  {item.summary?.trim() || CASE_TYPE_LABELS[item.type]?.label || "Dossier sans résumé"}
                </Text>
                <Text
                  style={{ color: "#9CA3AF", fontSize: 12, marginTop: 2 }}
                >
                  {CASE_STATUS_LABELS[item.status]?.label ?? item.status} ·{" "}
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
