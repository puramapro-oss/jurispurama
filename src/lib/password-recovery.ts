import type { Session, SupabaseClient } from "@supabase/supabase-js";

export type RecoveryAuthClient = Pick<SupabaseClient, "auth">;

export type RecoveryIdentity = { userId: string; accessToken: string };

export class RecoverySessionChangedError extends Error {
  constructor() {
    super("La session a changé. Demande un nouveau lien de réinitialisation.");
    this.name = "RecoverySessionChangedError";
  }
}

export function recoveryIdentity(session: Session): RecoveryIdentity {
  return { userId: session.user.id, accessToken: session.access_token };
}

export function matchesRecoverySession(
  session: Session | null,
  expected: RecoveryIdentity,
): session is Session {
  return session?.user.id === expected.userId &&
    session.access_token === expected.accessToken;
}

function assertCurrent(isCurrent: () => boolean) {
  if (!isCurrent()) throw new RecoverySessionChangedError();
}

export async function validatedRecoverySession(
  client: RecoveryAuthClient,
  expected: RecoveryIdentity,
  isCurrent: () => boolean,
): Promise<Session> {
  assertCurrent(isCurrent);
  const { data, error } = await client.auth.getSession();
  assertCurrent(isCurrent);
  if (error || !matchesRecoverySession(data.session, expected)) {
    throw new RecoverySessionChangedError();
  }
  const { data: userData, error: userError } = await client.auth.getUser(expected.accessToken);
  assertCurrent(isCurrent);
  if (userError || userData.user?.id !== expected.userId) {
    throw new RecoverySessionChangedError();
  }
  // The remote identity lookup can overlap a sign-out, refresh or account change.
  const current = await client.auth.getSession();
  assertCurrent(isCurrent);
  if (current.error || !matchesRecoverySession(current.data.session, expected)) {
    throw new RecoverySessionChangedError();
  }
  return current.data.session;
}

export async function updateRecoveryPassword(
  client: RecoveryAuthClient,
  createUpdateClient: () => RecoveryAuthClient,
  password: string,
  expected: RecoveryIdentity,
  isCurrent: () => boolean,
): Promise<void> {
  const session = await validatedRecoverySession(client, expected, isCurrent);
  assertCurrent(isCurrent);
  const isolated = createUpdateClient();
  const { data, error } = await isolated.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  assertCurrent(isCurrent);
  if (error || !matchesRecoverySession(data.session, expected) || data.user?.id !== expected.userId) {
    throw new RecoverySessionChangedError();
  }
  await validatedRecoverySession(isolated, expected, isCurrent);
  const current = await client.auth.getSession();
  assertCurrent(isCurrent);
  if (current.error || !matchesRecoverySession(current.data.session, expected)) {
    throw new RecoverySessionChangedError();
  }
  // updateUser reads only the isolated session. A concurrent login cannot change
  // the Authorization header or receive this operation's USER_UPDATED event.
  const updated = await isolated.auth.updateUser({ password });
  assertCurrent(isCurrent);
  if (updated.error) {
    throw new Error("Modification impossible. Vérifie le mot de passe et réessaie dans un instant.");
  }
  if (updated.data.user?.id !== expected.userId) throw new RecoverySessionChangedError();
  const after = await client.auth.getSession();
  assertCurrent(isCurrent);
  if (after.error || !matchesRecoverySession(after.data.session, expected)) {
    throw new RecoverySessionChangedError();
  }
}
