import { useEffect, useRef, useState } from "react";
import { Linking, Text, View, Alert } from "react-native";
import { uuid } from "expo-modules-core";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { api, ApiError, API_BASE } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { Check, Sparkles } from "lucide-react-native";
import { PLANS as PLAN_CATALOGUE } from "../../../src/lib/constants";

type CheckoutResponse = { url: string };

const PLAN_IDS = ["essentiel", "pro", "avocat_virtuel"] as const;
type PlanId = (typeof PLAN_IDS)[number];
const PLANS = PLAN_IDS.map((id) => {
  const plan = PLAN_CATALOGUE[id];
  return {
    id,
    name: plan.label,
    price: (plan.priceMonthly / 100).toLocaleString("fr-FR", {
      style: "currency",
      currency: "EUR",
    }),
    period: "/mois",
    features: plan.features,
    cta: `Choisir ${plan.label}`,
    popular: id === "pro",
  };
});

export default function AbonnementScreen() {
  const userId = useAuth((state) => state.user?.id ?? null);
  const [pending, setPending] = useState<{ owner: string | null; value: string | null }>({ owner: userId, value: null });
  const loading = pending.owner === userId ? pending.value : null;
  if (pending.owner !== userId) setPending({ owner: userId, value: null });
  const setLoading = (value: string | null) => setPending({ owner: userId, value });
  const inFlight = useRef<AbortController | null>(null);
  const checkoutIntent = useRef<{
    userId: string | null;
    plan: PlanId;
    idempotencyKey: string;
  } | null>(null);

  useEffect(() => {
    checkoutIntent.current = null;
    return () => {
      inFlight.current?.abort();
      inFlight.current = null;
    };
  }, [userId]);

  async function checkout(planId: PlanId) {
    if (inFlight.current) return;
    const controller = new AbortController();
    inFlight.current = controller;
    const isCurrent = () => inFlight.current === controller &&
      !controller.signal.aborted && (useAuth.getState().user?.id ?? null) === userId;
    setLoading(planId);
    try {
      // Keep the same Stripe session when a response or browser handoff is lost.
      // A different plan or account is a distinct purchase intention.
      if (
        checkoutIntent.current?.plan !== planId ||
        checkoutIntent.current.userId !== userId
      ) {
        checkoutIntent.current = {
          userId,
          plan: planId,
          idempotencyKey: uuid.v4(),
        };
      }
      const data = await api<CheckoutResponse>("/api/stripe/checkout", {
        method: "POST",
        signal: controller.signal,
        body: JSON.stringify({
          plan: planId,
          billing: "monthly",
          idempotencyKey: checkoutIntent.current.idempotencyKey,
        }),
      });
      if (!isCurrent()) return;
      if (data.url) {
        await Linking.openURL(data.url);
      } else {
        throw new Error("URL Stripe manquante.");
      }
    } catch (e) {
      if (!isCurrent()) return;
      const msg =
        e instanceof ApiError && e.status === 401
          ? "Connecte-toi avant de souscrire."
          : "Paiement indisponible. Réessaie dans un instant.";
      Alert.alert("Oups", msg);
    } finally {
      if (inFlight.current === controller) {
        inFlight.current = null;
        setLoading(null);
      }
    }
  }

  async function openPortal() {
    if (inFlight.current) return;
    const controller = new AbortController();
    inFlight.current = controller;
    const isCurrent = () => inFlight.current === controller &&
      !controller.signal.aborted && (useAuth.getState().user?.id ?? null) === userId;
    setLoading("portal");
    try {
      const data = await api<CheckoutResponse>("/api/stripe/portal", {
        method: "POST",
        signal: controller.signal,
      });
      if (!isCurrent()) return;
      if (data.url) await Linking.openURL(data.url);
    } catch {
      if (!isCurrent()) return;
      await Linking.openURL(`${API_BASE}/abonnement`);
    } finally {
      if (inFlight.current === controller) {
        inFlight.current = null;
        setLoading(null);
      }
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
          Compare les offres et gère ton abonnement.
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
              disabled={loading !== null}
              onPress={() => checkout(plan.id)}
            >
              {plan.cta}
            </Button>
          </Card>
        ))}

        <View style={{ marginTop: 8 }}>
          <Button testID="abo-portal" variant="ghost" loading={loading === "portal"}
            disabled={loading !== null} onPress={openPortal}>
            Gérer mon abonnement →
          </Button>
        </View>
      </View>
    </Screen>
  );
}
