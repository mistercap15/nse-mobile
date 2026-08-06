import * as SecureStore from "expo-secure-store";

// ─────────────────────────────────────────────────────────────────────────────
// The PIN-session token, in the device keychain.
//
// It is an encrypted JWE minted by the backend. After Upstox OAuth the backend
// re-mints it with the Upstox access token sealed inside, so this one value is
// the app's entire credential set — it never holds a raw Upstox token, and the
// secrets that produced it never leave the server.
//
// Lifetime is the backend's: it expires at the next 03:30 IST, which is when
// Upstox tokens die. On any 401 we drop it and fall back to the PIN screen.
// ─────────────────────────────────────────────────────────────────────────────

const KEY = "nserank.session";

// Module-level mirror so the fetch wrapper doesn't await the keychain on every
// request. Kept in sync by every writer below.
let cached: string | null = null;
let loaded = false;

export async function loadSession(): Promise<string | null> {
  if (!loaded) {
    try {
      cached = await SecureStore.getItemAsync(KEY);
    } catch {
      cached = null; // keychain unavailable — treat as logged out
    }
    loaded = true;
  }
  return cached;
}

export async function saveSession(token: string): Promise<void> {
  cached = token;
  loaded = true;
  await SecureStore.setItemAsync(KEY, token);
}

export async function clearSession(): Promise<void> {
  cached = null;
  loaded = true;
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    // Already gone — the in-memory clear above is what matters.
  }
}

/** Synchronous read for the request path. Null until loadSession() has run. */
export function peekSession(): string | null {
  return cached;
}
