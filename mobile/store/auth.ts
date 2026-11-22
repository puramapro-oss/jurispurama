import { create } from "zustand";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { RecoveryIdentity } from "@/lib/password-recovery";

type PasswordRecovery =
  | { attempt: number; phase: "exchanging"; ownerToken: string | null }
  | ({ attempt: number; phase: "ready"; ownerToken: string | null; client: SupabaseClient } & RecoveryIdentity);

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  passwordRecovery: PasswordRecovery | null;
  init: () => Promise<void>;
  signOut: () => Promise<void>;
  beginPasswordRecovery: () => number;
  finishPasswordRecovery: (attempt: number, session: Session, client: SupabaseClient) => boolean;
  clearPasswordRecovery: (attempt?: number) => void;
};

let initialization: Promise<void> | null = null;
let subscribed = false;
let authRevision = 0;
let recoveryAttempt = 0;

export const useAuth = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  loading: true,
  passwordRecovery: null,
  init: () => {
    if (initialization) return initialization;
    if (!subscribed) {
      subscribed = true;
      supabase.auth.onAuthStateChange((event, session) => {
        authRevision += 1;
        let recovery = get().passwordRecovery;
        if (recovery && event !== "INITIAL_SESSION") {
          if (event === "SIGNED_OUT" || (session?.access_token ?? null) !== recovery.ownerToken) recovery = null;
        }
        set({ session, user: session?.user ?? null, loading: false, passwordRecovery: recovery });
      });
    }
    const revision = authRevision;
    initialization = (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (authRevision === revision) {
          const session = error ? null : data.session;
          set({ session, user: session?.user ?? null, loading: false });
        }
      } catch {
        if (authRevision === revision) set({ session: null, user: null, loading: false });
      }
    })();
    return initialization;
  },
  beginPasswordRecovery: () => {
    const attempt = ++recoveryAttempt;
    set({ passwordRecovery: { attempt, phase: "exchanging", ownerToken: get().session?.access_token ?? null } });
    return attempt;
  },
  finishPasswordRecovery: (attempt, session, client) => {
    const recovery = get().passwordRecovery;
    const identity = { userId: session.user.id, accessToken: session.access_token };
    if (recovery?.attempt !== attempt || recovery.phase !== "exchanging" ||
      (get().session?.access_token ?? null) !== recovery.ownerToken) return false;
    set({ passwordRecovery: { attempt, phase: "ready", ownerToken: recovery.ownerToken, client, ...identity } });
    return true;
  },
  clearPasswordRecovery: (attempt) => {
    if (attempt === undefined || get().passwordRecovery?.attempt === attempt) {
      set({ passwordRecovery: null });
    }
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, passwordRecovery: null });
  },
}));
