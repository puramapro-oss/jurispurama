import { useState } from "react";
import { Text, View, Alert } from "react-native";
import { Link, useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { supabase } from "@/lib/supabase";

function frError(msg: string): string {
  if (msg.includes("already registered"))
    return "Cet email existe déjà. Connecte-toi à la place.";
  if (msg.includes("Password should"))
    return "Mot de passe trop court (8 caractères minimum).";
  if (msg.includes("rate limit"))
    return "Trop de tentatives. Réessaie dans 1 minute.";
  return "Inscription impossible. Vérifie tes informations.";
}

export default function SignupScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
  }>({});

  async function onSubmit() {
    const next: typeof errors = {};
    if (!fullName.trim() || fullName.trim().length < 2)
      next.fullName = "Indique ton nom complet.";
    if (!email.trim() || !email.includes("@")) next.email = "Email invalide.";
    if (!password || password.length < 8)
      next.password = "8 caractères minimum.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: "https://jurispurama.purama.dev/auth/callback",
      },
    });
    setLoading(false);

    if (error) {
      Alert.alert("Inscription échouée", frError(error.message));
      return;
    }
    Alert.alert(
      "Bienvenue sur JurisPurama 👋",
      "Vérifie ta boîte email pour confirmer ton compte, puis connecte-toi.",
      [{ text: "OK", onPress: () => router.replace("/(auth)/login") }]
    );
  }

  return (
    <Screen>
      <View style={{ marginTop: 60, marginBottom: 32 }}>
        <Text
          style={{
            color: "#C9A84C",
            fontSize: 14,
            fontWeight: "600",
            letterSpacing: 2,
            marginBottom: 8,
          }}
        >
          JURISPURAMA
        </Text>
        <Text
          style={{
            color: "#F5F5F7",
            fontSize: 30,
            fontWeight: "700",
            marginBottom: 8,
          }}
        >
          Crée ton cabinet IA.
        </Text>
        <Text style={{ color: "#9CA3AF", fontSize: 15 }}>
          14 jours d'essai. Sans CB.
        </Text>
      </View>

      <View style={{ gap: 16 }}>
        <Input
          label="Nom complet"
          testID="signup-name"
          placeholder="Jean Dupont"
          autoCapitalize="words"
          autoComplete="name"
          value={fullName}
          onChangeText={setFullName}
          error={errors.fullName}
        />
        <Input
          label="Email professionnel"
          testID="signup-email"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="avocat@cabinet.fr"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
        />
        <Input
          label="Mot de passe"
          testID="signup-password"
          secureTextEntry
          autoComplete="password-new"
          placeholder="8 caractères minimum"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
        />

        <View style={{ marginTop: 8 }}>
          <Button
            testID="signup-submit"
            onPress={onSubmit}
            loading={loading}
          >
            Démarrer l'essai gratuit
          </Button>
        </View>

        <Text
          style={{
            color: "#6B7280",
            textAlign: "center",
            fontSize: 12,
            marginTop: 4,
          }}
        >
          En créant un compte, tu acceptes les CGU et la politique de
          confidentialité.
        </Text>
      </View>

      <View
        style={{
          marginTop: 32,
          flexDirection: "row",
          justifyContent: "center",
          gap: 6,
        }}
      >
        <Text style={{ color: "#9CA3AF", fontSize: 14 }}>Déjà inscrit ?</Text>
        <Link href="/(auth)/login" asChild>
          <Text
            testID="signup-go-login"
            style={{ color: "#C9A84C", fontSize: 14, fontWeight: "600" }}
          >
            Se connecter
          </Text>
        </Link>
      </View>
    </Screen>
  );
}
