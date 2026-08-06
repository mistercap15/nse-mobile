import Constants from "expo-constants";
import { Platform } from "react-native";

// ─────────────────────────────────────────────────────────────────────────────
// Where the backend lives. The app is a native front-end over the existing
// Next.js API — there is no second backend and no bundled dataset.
//
// Resolution order:
//   1. EXPO_PUBLIC_API_BASE          (set in .env / EAS build env)
//   2. app.json → expo.extra.apiBase
//   3. the dev fallback below
//
// ⚠️ SET YOUR PRODUCTION DOMAIN before building for a device: put it in
//    app.json under expo.extra.apiBase, or export EXPO_PUBLIC_API_BASE.
//    It must match UPSTOX_REDIRECT_URI's origin in the backend's Vercel env,
//    or the OAuth round-trip will bounce.
// ─────────────────────────────────────────────────────────────────────────────

// Android emulators can't see the host's "localhost".
const DEV_FALLBACK = Platform.select({
  android: "http://10.0.2.2:3000",
  default: "http://127.0.0.1:3000",
})!;

const extra = (Constants.expoConfig?.extra ?? {}) as { apiBase?: string };

const configured = process.env.EXPO_PUBLIC_API_BASE || extra.apiBase || "";

export const API_BASE = (configured || DEV_FALLBACK).replace(/\/+$/, "");

/** True while pointing at a local dev server — surfaced in Settings as a hint. */
export const IS_LOCAL_API = /127\.0\.0\.1|localhost|10\.0\.2\.2/.test(API_BASE);

// Deep link the Upstox callback hands back to. Must match `expo.scheme` in
// app.json and MOBILE_RETURN in the backend's app/lib/auth.js.
export const UPSTOX_RETURN_PATH = "upstox/connected";
