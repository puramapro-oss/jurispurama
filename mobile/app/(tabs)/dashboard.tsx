import { useEffect, useState } from "react";
import { Text, View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useAuth } from "@/store/auth";
import { api } from "@/lib/api";
import {
  Scale,
  FileText,
  MessageSquare,
  Sparkles,
  ArrowRight,
} from "lucide-react-native";

type CasesResponse = {
  cases: Array<{
    id: string;
    title: string;
    status: string;
    updated_at: string;
  }>;
};

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const [stats, setStats] = useState<{ cases: number; updated?: string }>({
    cases: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api<CasesResponse>("/api/cases");
        if (cancelled) return;
        setStats({
          cases: data.cases.length,
          updated: data.cases[0]?.updated_at,
        });
      } catch {
        if (!cancelled) setStats({ cases: 0 });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    "Maître";

  return (
    <Screen>
      <View style={{ marginBottom: 24, marginTop: 8 }}>
        <Text style={{ color: "#C9A84C", fontSize: 12, letterSpacing: 2 }}>
          JURISPURAMA
        </Text>
        <Text
          style={{
            color: "#F5F5F7",
            fontSize: 28,
            fontWeight: "700",
            marginTop: 4,
          }}
        >
          Bonjour {firstName}.
        </Text>
        <Text style={{ color: "#9CA3AF", fontSize: 14, marginTop: 4 }}>
          Que veux-tu faire aujourd'hui ?
        </Text>
      </View>

      <View style={{ gap: 12 }}>
        <Card testID="dashboard-cases-card">
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <Scale color="#C9A84C" size={18} />
                <Text style={{ color: "#9CA3AF", fontSize: 12 }}>
                  Tes dossiers
                </Text>
              </View>
              {loading ? (
                <ActivityIndicator color="#C9A84C" />
              ) : (
                <Text
                  style={{
                    color: "#F5F5F7",
                    fontSize: 32,
                    fontWeight: "700",
                  }}
                >
                  {stats.cases}
                </Text>
              )}
              <Text style={{ color: "#6B7280", fontSize: 11, marginTop: 2 }}>
                actifs sur ton cabinet
              </Text>
            </View>
            <Button
              testID="dashboard-go-cases"
              variant="ghost"
              onPress={() => router.push("/(tabs)/dossiers")}
            >
              Voir →
            </Button>
          </View>
        </Card>

        <Card
          testID="dashboard-chat-card"
          onPress={() => router.push("/(tabs)/chat")}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: "rgba(109,40,217,0.2)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MessageSquare color="#6D28D9" size={22} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: "#F5F5F7",
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                Demander à JurisIA
              </Text>
              <Text style={{ color: "#9CA3AF", fontSize: 12, marginTop: 2 }}>
                Avocat IA, 30 ans d'expérience
              </Text>
            </View>
            <ArrowRight color="#6B7280" size={18} />
          </View>
        </Card>

        <Card
          testID="dashboard-doc-card"
          onPress={() => router.push("/(tabs)/dossiers")}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: "rgba(201,168,76,0.18)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileText color="#C9A84C" size={22} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: "#F5F5F7",
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                Générer un document
              </Text>
              <Text style={{ color: "#9CA3AF", fontSize: 12, marginTop: 2 }}>
                Mise en demeure, contrat, requête…
              </Text>
            </View>
            <ArrowRight color="#6B7280" size={18} />
          </View>
        </Card>

        <Card
          testID="dashboard-upgrade-card"
          onPress={() => router.push("/(tabs)/abonnement")}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: "rgba(30,58,95,0.4)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sparkles color="#C9A84C" size={22} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: "#F5F5F7",
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                Passe Pro — 14 j gratuits
              </Text>
              <Text style={{ color: "#9CA3AF", fontSize: 12, marginTop: 2 }}>
                Documents illimités, signature, AR
              </Text>
            </View>
            <ArrowRight color="#C9A84C" size={18} />
          </View>
        </Card>
      </View>
    </Screen>
  );
}
