import "react-native-url-polyfill/auto";
import * as SecureStore from "expo-secure-store";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://auth.purama.dev";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!SUPABASE_ANON_KEY) {
  console.warn(
    "[jurispurama] EXPO_PUBLIC_SUPABASE_ANON_KEY manquant. Auth ne fonctionnera pas."
  );
}

type BrowserStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};
function browserStorage(): BrowserStorage | undefined {
  if (typeof globalThis === "undefined") return undefined;
  return (globalThis as { localStorage?: BrowserStorage }).localStorage;
}

const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    if (Platform.OS === "web") {
      return browserStorage()?.getItem(key) ?? null;
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === "web") {
      browserStorage()?.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    if (Platform.OS === "web") {
      browserStorage()?.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === "web",
      flowType: "pkce",
    },
  }
);

// A password change must keep the identity that was verified by the recovery
// screen, even if another login replaces the application's session meanwhile.
// This client never writes the shared SecureStore/localStorage session.
export function createPasswordUpdateClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storageKey: "jurispurama-password-update",
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

let recoveryVerifierQueue: Promise<void> = Promise.resolve();
function withRecoveryVerifier<T>(operation: () => Promise<T>): Promise<T> {
  const result = recoveryVerifierQueue.then(operation);
  recoveryVerifierQueue = result.then(() => undefined, () => undefined);
  return result;
}

export function createPasswordRecoveryClient(): SupabaseClient {
  const storageKey = "jurispurama-password-recovery";
  const verifierKey = `${storageKey}-code-verifier`;
  const temporary = new Map<string, string>();
  let verifierSnapshot: string | null = null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storageKey,
      // Only the PKCE verifier survives an app restart. Recovery sessions stay
      // in this instance and cannot replace the application's signed-in user.
      storage: {
        getItem: (key) => key === verifierKey
          ? withRecoveryVerifier(async () => {
            verifierSnapshot = await ExpoSecureStoreAdapter.getItem(key);
            return verifierSnapshot;
          }) : Promise.resolve(temporary.get(key) ?? null),
        setItem: async (key, value) => {
          if (key === verifierKey) await withRecoveryVerifier(async () => {
            await ExpoSecureStoreAdapter.setItem(key, value);
            verifierSnapshot = value;
          });
          else temporary.set(key, value);
        },
        removeItem: async (key) => {
          if (key === verifierKey) await withRecoveryVerifier(async () => {
            // A late old exchange must not consume a newer reset email's verifier.
            if (verifierSnapshot !== null && await ExpoSecureStoreAdapter.getItem(key) === verifierSnapshot) {
              await ExpoSecureStoreAdapter.removeItem(key);
            }
            verifierSnapshot = null;
          });
          else temporary.delete(key);
        },
      },
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  });
}
