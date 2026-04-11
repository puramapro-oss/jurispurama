import { useState } from "react";
import { Text, View, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function onSubmit() {
    if (!email.trim() || !email.includes("@")) {
      setError("Email invalide.");
      return;
    }
    setError(undefined);
    setLoading(true);
    const { error: authError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: "https://jurispurama.purama.dev/auth/callback" }
    );
    setLoading(false);
    if (authError) {
      Alert.alert(
        "Envoi impossible",
        "Vérifie ton email et réessaie. Si le problème persiste, contacte le support."
      );
      return;
    }
    Alert.alert(
      "Email envoyé 📩",
      "Si un compte existe avec cet email, tu vas recevoir un lien de réinitialisation.",
      [{ text: "Retour", onPress: () => router.replace("/(auth)/login") }]
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
          Indique ton email, on t'envoie un lien de réinitialisation.
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
