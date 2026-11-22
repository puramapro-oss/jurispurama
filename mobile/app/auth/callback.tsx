import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { useAuth } from "@/store/auth";
import { exchangeRecoveryCode, parseRecoveryCode, RecoverySessionChangedError } from "@/lib/password-recovery";

export default function AuthCallbackScreen() {
  const router = useRouter();
  const linkedURL = Linking.useURL();
  const [initialURL, setInitialURL] = useState<string | null | undefined>();
  const [failure, setFailure] = useState<{ url: string | null | undefined; message: string } | null>(null);
  const pending = useRef<{
    url: string; attempt: number; active: boolean; handedOff: boolean; promise: Promise<void>;
  } | null>(null);
  const url = linkedURL ?? initialURL;
  let code: string | null = null;
  let linkError: string | null = null;
  if (url !== undefined) {
    try { code = parseRecoveryCode(url); }
    catch { linkError = "Lien de réinitialisation invalide. Demande un nouveau lien depuis cette application."; }
  }
  const error = linkError ?? (failure?.url === url ? failure?.message : null);
  if (failure && failure.url !== url) setFailure(null);

  useEffect(() => {
    let active = true;
    Linking.getInitialURL().then(
      (value) => { if (active) setInitialURL(value); },
      () => { if (active) setInitialURL(null); },
    );
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!code || !url) return;
    let active = true;
    if (!pending.current || pending.current.url !== url) {
      const attempt = useAuth.getState().beginPasswordRecovery();
      const operation = { url, attempt, active: true, handedOff: false, promise: Promise.resolve() };
      const isCurrent = () => operation.active && useAuth.getState().passwordRecovery?.attempt === attempt;
      operation.promise = (async () => {
        const { client, session } = await exchangeRecoveryCode(code, isCurrent);
        if (!useAuth.getState().finishPasswordRecovery(attempt, session, client)) {
          throw new RecoverySessionChangedError();
        }
      })();
      pending.current = operation;
    }
    const operation = pending.current;
    operation.active = true;
    operation.promise.then(
      () => {
        if (active && operation.active && useAuth.getState().passwordRecovery?.attempt === operation.attempt) {
          operation.handedOff = true;
          router.replace("/(auth)/update-password");
        }
      },
      () => {
        useAuth.getState().clearPasswordRecovery(operation.attempt);
        if (active) setFailure({ url, message: "Lien invalide, expiré ou session modifiée. Demande un nouveau lien depuis cette application." });
      },
    );
    return () => {
      active = false;
      operation.active = false;
      // StrictMode reattaches the same effect synchronously. A real departure
      // invalidates the attempt before a late exchange can open another screen.
      void Promise.resolve().then(() => {
        if (!operation.active && !operation.handedOff) useAuth.getState().clearPasswordRecovery(operation.attempt);
      });
    };
  }, [code, url, router]);

  function restart() {
    useAuth.getState().clearPasswordRecovery();
    router.replace("/(auth)/forgot-password");
  }

  return (
    <Screen>
      <View style={{ marginTop: 60, gap: 20 }}>
        <Text style={{ color: "#F5F5F7", fontSize: 28, fontWeight: "700" }}>
          Réinitialisation du mot de passe
        </Text>
        {error ? (
          <>
            <Text testID="recovery-link-error" style={{ color: "#EF4444", fontSize: 15 }}>{error}</Text>
            <Button testID="recovery-restart" onPress={restart}>Demander un nouveau lien</Button>
          </>
        ) : (
          <>
            <ActivityIndicator color="#C9A84C" size="large" />
            <Text style={{ color: "#9CA3AF", fontSize: 15 }}>Vérification du lien…</Text>
          </>
        )}
      </View>
    </Screen>
  );
}
