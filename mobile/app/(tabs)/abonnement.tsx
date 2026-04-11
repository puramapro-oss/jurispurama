import { useState } from "react";
import { Linking, Text, View, Alert } from "react-native";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { api, ApiError, API_BASE } from "@/lib/api";
import { Check, Sparkles } from "lucide-react-native";

type CheckoutResponse = { url: string };

const PLANS = [
  {
    id: "essentiel",
    name: "Essentiel",
    price: "9,99 €",
    period: "/mois",
    features: [
      "20 questions JurisIA / mois",
      "5 documents générés / mois",
      "1 dossier actif",
      "Support email 48h",
    ],
    cta: "Choisir Essentiel",
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "29,99 €",
    period: "/mois",
    features: [
      "JurisIA illimité",
      "Documents illimités",
      "Dossiers illimités",
      "Signature électronique Art. 1366",
      "Envoi recommandé AR24",
      "Support prioritaire",
    ],
    cta: "Démarrer 14 j gratuits",
    popular: true,
  },
  {
    id: "avocat",
    name: "Cabinet",
    price: "79,99 €",
    period: "/mois",
    features: [
      "Tout Pro",
      "Multi-utilisateurs (jusqu'à 5)",
      "API d'intégration",
      "Templates personnalisés",
      "Account manager dédié",
    ],
    cta: "Choisir Cabinet",
    popular: false,
  },
] as const;

export default function AbonnementScreen() {
  const [loading, setLoading] = useState<string | null>(null);

  async function checkout(planId: string) {
    setLoading(planId);
    try {
      const data = await api<CheckoutResponse>("/api/stripe/checkout", {
        method: "POST",
        body: JSON.stringify({ plan: planId, period: "monthly" }),
      });
      if (data.url) {
        await Linking.openURL(data.url);
      } else {
        throw new Error("URL Stripe manquante.");
      }
    } catch (e) {
      const msg =
        e instanceof ApiError && e.status === 401
          ? "Connecte-toi avant de souscrire."
          : "Paiement indisponible. Réessaie dans un instant.";
      Alert.alert("Oups", msg);
    } finally {
      setLoading(null);
    }
  }

  async function openPortal() {
    try {
      const data = await api<CheckoutResponse>("/api/stripe/portal", {
        method: "POST",
      });
      if (data.url) await Linking.openURL(data.url);
    } catch {
      await Linking.openURL(`${API_BASE}/abonnement`);
    }
  }

  return (
    <Screen>
      <View style={{ marginBottom: 24, marginTop: 8 }}>
        <Text style={{ color: "#C9A84C", fontSize: 12, letterSpacing: 2 }}>
          ABONNEMENT
        </Text>
        <Text
          style={{
            color: "#F5F5F7",
            fontSize: 26,
            fontWeight: "700",
            marginTop: 4,
          }}
        >
          Le bon plan pour ton cabinet.
        </Text>
        <Text style={{ color: "#9CA3AF", fontSize: 13, marginTop: 6 }}>
          14 jours d'essai sur Pro · Sans engagement · Annulable en 1 clic
        </Text>
      </View>

      <View style={{ gap: 12 }}>
        {PLANS.map((plan) => (
          <Card
            key={plan.id}
            testID={`plan-${plan.id}`}
            style={{
              borderColor: plan.popular
                ? "#C9A84C"
                : "rgba(255,255,255,0.06)",
              borderWidth: plan.popular ? 1.5 : 1,
            }}
          >
            {plan.popular ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 8,
                }}
              >
                <Sparkles color="#C9A84C" size={14} />
                <Text
                  style={{
                    color: "#C9A84C",
                    fontSize: 11,
                    fontWeight: "700",
                    letterSpacing: 1,
                  }}
                >
                  POPULAIRE
                </Text>
              </View>
            ) : null}
            <Text
              style={{
                color: "#F5F5F7",
                fontSize: 20,
                fontWeight: "700",
                marginBottom: 4,
              }}
            >
              {plan.name}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "baseline",
                marginBottom: 14,
              }}
            >
              <Text
                style={{
                  color: "#F5F5F7",
                  fontSize: 28,
                  fontWeight: "700",
                }}
              >
                {plan.price}
              </Text>
              <Text style={{ color: "#9CA3AF", fontSize: 14, marginLeft: 4 }}>
                {plan.period}
              </Text>
            </View>
            <View style={{ gap: 8, marginBottom: 16 }}>
              {plan.features.map((f) => (
                <View
                  key={f}
                  style={{ flexDirection: "row", gap: 8, alignItems: "center" }}
                >
                  <Check color="#10B981" size={16} />
                  <Text
                    style={{ color: "#9CA3AF", fontSize: 13, flex: 1 }}
                  >
                    {f}
                  </Text>
                </View>
              ))}
            </View>
            <Button
              testID={`plan-cta-${plan.id}`}
              variant={plan.popular ? "primary" : "secondary"}
              loading={loading === plan.id}
              onPress={() => checkout(plan.id)}
            >
              {plan.cta}
            </Button>
          </Card>
        ))}

        <View style={{ marginTop: 8 }}>
          <Button testID="abo-portal" variant="ghost" onPress={openPortal}>
            Gérer mon abonnement →
          </Button>
        </View>
      </View>
    </Screen>
  );
}
