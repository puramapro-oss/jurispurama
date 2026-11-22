import { useEffect, useRef, useState } from "react";
import { Text, View, Alert, Linking, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { requestPasswordRecovery } from "@/lib/password-recovery";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const active = useRef(true);
  const inFlight = useRef(false);

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  async function onSubmit() {
    if (inFlight.current) return;
    if (!email.trim() || !email.includes("@")) {
      setError("Email invalide.");
      return;
    }
    setError(undefined);
    setLoading(true);
    inFlight.current = true;
    try {
      const { error: authError } = await requestPasswordRecovery(email.trim().toLowerCase());
      if (!active.current) return;
      if (authError) throw authError;
      Alert.alert(
        "Email envoyé 📩",
        "Si un compte existe avec cet email, tu vas recevoir un lien. Ouvre-le sur cet appareil, avec cette application, pour choisir ton nouveau mot de passe.",
        [{ text: "Retour", onPress: () => router.replace("/(auth)/login") }]
      );
    } catch {
      if (active.current) Alert.alert(
        "Envoi impossible",
        "Vérifie ton email et réessaie. Si le problème persiste, contacte le support."
      );
    } finally {
      inFlight.current = false;
      if (active.current) setLoading(false);
    }
  }

  if (Platform.OS === "web") {
    return (
      <Screen>
        <View style={{ marginTop: 60, gap: 20 }}>
          <Text style={{ color: "#F5F5F7", fontSize: 28, fontWeight: "700" }}>Mot de passe oublié ?</Text>
          <Text style={{ color: "#9CA3AF", fontSize: 15 }}>
            Continue sur le site JurisPurama pour réinitialiser ton mot de passe dans ce navigateur.
          </Text>
          <Button testID="forgot-web" onPress={() => {
            void Linking.openURL("https://jurispurama.purama.dev/forgot-password").catch(() => {
              Alert.alert("Ouverture impossible", "Réessaie dans un instant.");
            });
          }}>Continuer sur le site</Button>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ marginTop: 60, marginBottom: 32 }}>
        <Text
          style={{
            color: "#F5F5F7",
            fontSize: 28,
            fontWeight: "700",
            marginBottom: 8,
          }}
        >
          Mot de passe oublié ?
        </Text>
        <Text style={{ color: "#9CA3AF", fontSize: 15 }}>
          Indique ton email, on t’envoie un lien de réinitialisation.
        </Text>
      </View>

      <View style={{ gap: 16 }}>
        <Input
          label="Email"
          testID="forgot-email"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="avocat@cabinet.fr"
          value={email}
          onChangeText={setEmail}
          error={error}
        />
        <Button
          testID="forgot-submit"
          onPress={onSubmit}
          loading={loading}
        >
          Envoyer le lien
        </Button>
        <Button
          testID="forgot-back"
          variant="ghost"
          onPress={() => router.back()}
        >
          ← Retour
        </Button>
      </View>
    </Screen>
  );
}
