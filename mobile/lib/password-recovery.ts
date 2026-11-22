import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { createPasswordRecoveryClient, createPasswordUpdateClient } from "@/lib/supabase";
import {
  recoveryIdentity,
  RecoverySessionChangedError,
  validatedRecoverySession,
  updateRecoveryPassword as updatePassword,
  type RecoveryIdentity,
} from "../../src/lib/password-recovery";
export {
  recoveryIdentity,
  matchesRecoverySession,
  RecoverySessionChangedError,
  type RecoveryIdentity,
} from "../../src/lib/password-recovery";

export const PASSWORD_RECOVERY_REDIRECT =
  "jurispurama://auth/callback?flow=recovery";

export function requestPasswordRecovery(email: string) {
  return createPasswordRecoveryClient().auth.resetPasswordForEmail(email, {
    redirectTo: PASSWORD_RECOVERY_REDIRECT,
  });
}

export function parseRecoveryCode(rawURL: string | null): string {
  const invalid = () => new Error("Lien invalide ou expiré. Demande un nouveau lien.");
  if (!rawURL || rawURL.length > 4096) throw invalid();
  let url: URL;
  try {
    url = new URL(rawURL);
  } catch {
    throw invalid();
  }
  // Only the native callback owned by this app can consume its PKCE verifier.
  if (
    url.protocol !== "jurispurama:" || url.hostname !== "auth" ||
    url.pathname !== "/callback" || url.port || url.username || url.password ||
    url.hash || url.searchParams.get("flow") !== "recovery"
  ) throw invalid();

  const allowed = new Set(["flow", "code", "error", "error_code", "error_description"]);
  for (const key of url.searchParams.keys()) {
    if (!allowed.has(key) || url.searchParams.getAll(key).length !== 1) throw invalid();
  }
  if (url.searchParams.has("error") || url.searchParams.has("error_code")) throw invalid();
  const code = url.searchParams.get("code");
  if (!code || !/^[A-Za-z0-9._~-]{8,512}$/.test(code)) throw invalid();
  return code;
}

export async function exchangeRecoveryCode(
  code: string,
  isCurrent: () => boolean,
): Promise<{ client: SupabaseClient; session: Session }> {
  if (!isCurrent()) throw new RecoverySessionChangedError();
  const client = createPasswordRecoveryClient();
  const { data, error } = await client.auth.exchangeCodeForSession(code);
  if (!isCurrent()) throw new RecoverySessionChangedError();
  if (error || !data.session) {
    throw new Error("Lien invalide ou expiré. Demande un nouveau lien depuis cette application.");
  }
  const session = await validatedRecoverySession(client, recoveryIdentity(data.session), isCurrent);
  return { client, session };
}

export function updateRecoveryPassword(
  client: SupabaseClient,
  password: string,
  expected: RecoveryIdentity,
  isCurrent: () => boolean,
): Promise<void> {
  return updatePassword(client, createPasswordUpdateClient, password, expected, isCurrent);
}
