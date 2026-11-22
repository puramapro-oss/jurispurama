import { useEffect, useRef, useState } from "react";
import { Alert, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { useAuth } from "@/store/auth";
import { updateRecoveryPassword } from "@/lib/password-recovery";

const EMPTY_FORM = { password: "", confirmation: "", error: undefined as string | undefined, loading: false };

export default function UpdatePasswordScreen() {
  const router = useRouter();
  const recovery = useAuth((state) => state.passwordRecovery);
  const attempt = recovery?.attempt;
  const [form, setForm] = useState({ attempt, ...EMPTY_FORM });
  const { password, confirmation, error, loading } = form.attempt === attempt ? form : EMPTY_FORM;
  if (form.attempt !== attempt) setForm({ attempt, ...EMPTY_FORM });
  const changeForm = (patch: Partial<typeof EMPTY_FORM>) => setForm((previous) => ({
    ...(previous.attempt === attempt ? previous : { attempt, ...EMPTY_FORM }), ...patch,
  }));
  const setPassword = (value: string) => changeForm({ password: value });
  const setConfirmation = (value: string) => changeForm({ confirmation: value });
  const setError = (value: string | undefined) => changeForm({ error: value });
  const setLoading = (value: boolean) => changeForm({ loading: value });
  const inFlight = useRef<AbortController | null>(null);
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      inFlight.current?.abort();
      inFlight.current = null;
      void Promise.resolve().then(() => {
        if (!active.current && attempt !== undefined) useAuth.getState().clearPasswordRecovery(attempt);
      });
    };
  }, [attempt]);

  async function onSubmit() {
    if (inFlight.current || recovery?.phase !== "ready") return;
    if (password.length < 8) {
      setError("Choisis un mot de passe d’au moins 8 caractères.");
      return;
    }
    if (password !== confirmation) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    const controller = new AbortController();
    inFlight.current = controller;
    const isCurrent = () => {
      const state = useAuth.getState();
      return inFlight.current === controller && !controller.signal.aborted &&
        state.passwordRecovery?.attempt === recovery.attempt &&
        state.passwordRecovery.phase === "ready" && state.passwordRecovery.client === recovery.client &&
        (state.session?.access_token ?? null) === recovery.ownerToken;
    };
    setLoading(true);
    setError(undefined);
    try {
      await updateRecoveryPassword(recovery.client, password, recovery, isCurrent);
      if (!isCurrent()) return;
      setPassword("");
      setConfirmation("");
      Alert.alert("Mot de passe modifié", "Ton nouveau mot de passe a été enregistré.");
      useAuth.getState().clearPasswordRecovery(recovery.attempt);
      router.replace(useAuth.getState().session ? "/(tabs)/dashboard" : "/(auth)/login");
    } catch (cause) {
      if (isCurrent()) {
        setError(cause instanceof Error ? cause.message : "Modification impossible. Réessaie.");
      }
    } finally {
      if (inFlight.current === controller) {
        inFlight.current = null;
        setLoading(false);
      }
    }
  }

  function restart() {
    useAuth.getState().clearPasswordRecovery();
    router.replace("/(auth)/forgot-password");
  }

  function cancel() {
    useAuth.getState().clearPasswordRecovery();
    router.replace(useAuth.getState().session ? "/(tabs)/dashboard" : "/(auth)/login");
  }

  return (
    <Screen>
      <View style={{ marginTop: 60, marginBottom: 32, gap: 10 }}>
        <Text style={{ color: "#F5F5F7", fontSize: 28, fontWeight: "700" }}>Nouveau mot de passe</Text>
        <Text style={{ color: "#9CA3AF", fontSize: 15 }}>
          {recovery?.phase === "ready"
            ? "Choisis un mot de passe unique d’au moins 8 caractères."
            : "Ta session de réinitialisation n’est plus disponible. Demande un nouveau lien depuis cette application."}
        </Text>
      </View>
      {recovery?.phase === "ready" ? (
        <View style={{ gap: 16 }}>
          <Input label="Nouveau mot de passe" testID="update-password" value={password}
            onChangeText={setPassword} secureTextEntry autoComplete="new-password" error={error} />
          <Input label="Confirmer le mot de passe" testID="update-password-confirm" value={confirmation}
            onChangeText={setConfirmation} secureTextEntry autoComplete="new-password" />
          <Button testID="update-password-submit" loading={loading} onPress={onSubmit}>Enregistrer le mot de passe</Button>
          <Button testID="update-password-cancel" variant="ghost" onPress={cancel}>Annuler</Button>
        </View>
      ) : (
        <Button testID="update-password-restart" onPress={restart}>Demander un nouveau lien</Button>
      )}
    </Screen>
  );
}
