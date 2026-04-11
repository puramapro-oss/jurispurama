import { useState } from "react";
import { Text, View, Alert } from "react-native";
import { Link, useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { supabase } from "@/lib/supabase";

function frError(msg: string): string {
  if (msg.includes("Invalid login")) return "Email ou mot de passe incorrect.";
  if (msg.includes("Email not confirmed"))
    return "Confirme d'abord ton email (vérifie tes spams).";
  if (msg.includes("rate limit"))
    return "Trop de tentatives. Réessaie dans 1 minute.";
  return "Connexion impossible. Vérifie tes identifiants et réessaie.";
}

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );

  async function onSubmit() {
    const next: typeof errors = {};
    if (!email.trim() || !email.includes("@")) next.email = "Email invalide.";
    if (!password || password.length < 6)
      next.password = "6 caractères minimum.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);

    if (error) {
      Alert.alert("Connexion échouée", frError(error.message));
      return;
    }
    router.replace("/(tabs)/dashboard");
  }

  return (
    <Screen>
      <View style={{ marginTop: 60, marginBottom: 40 }}>
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
            fontSize: 32,
            fontWeight: "700",
            marginBottom: 8,
          }}
        >
          Bon retour, maître.
        </Text>
        <Text style={{ color: "#9CA3AF", fontSize: 15 }}>
          Connecte-toi pour reprendre tes dossiers.
        </Text>
      </View>

      <View style={{ gap: 16 }}>
        <Input
          label="Email"
          testID="login-email"
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
          testID="login-password"
          secureTextEntry
          autoComplete="password"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
        />

        <View style={{ marginTop: 8 }}>
          <Button
            testID="login-submit"
            onPress={onSubmit}
            loading={loading}
          >
            Se connecter
          </Button>
        </View>

        <Link href="/(auth)/forgot-password" asChild>
          <Text
            style={{
              color: "#C9A84C",
              textAlign: "center",
              marginTop: 8,
              fontSize: 14,
            }}
            testID="login-forgot"
          >
            Mot de passe oublié ?
          </Text>
        </Link>
      </View>

      <View
        style={{
          marginTop: 32,
          flexDirection: "row",
          justifyContent: "center",
          gap: 6,
        }}
      >
        <Text style={{ color: "#9CA3AF", fontSize: 14 }}>Pas de compte ?</Text>
        <Link href="/(auth)/signup" asChild>
          <Text
            testID="login-go-signup"
            style={{ color: "#C9A84C", fontSize: 14, fontWeight: "600" }}
          >
            Crée-le en 30s
          </Text>
        </Link>
      </View>
    </Screen>
  );
}
