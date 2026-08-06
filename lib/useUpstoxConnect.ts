import { useCallback, useState } from "react";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useQueryClient } from "@tanstack/react-query";
import { API_BASE } from "./config";
import { peekSession, saveSession } from "./session";
import { queryKeys } from "./queries";

// ─────────────────────────────────────────────────────────────────────────────
// The daily Upstox re-connect, as one tap.
//
// Upstox forbids app-to-app login and issues no refresh token, so the access
// token genuinely dies at ~03:30 IST every day and the only way back is the
// authorization dialog. We open it in an in-app auth session (which on the same
// phone auto-reads the OTP / offers biometrics, so it's quick) and the backend
// hands us a re-minted session over the app's deep link.
//
// The API secret needed for the code→token exchange never leaves the server:
// the app only ever sees the finished session.
// ─────────────────────────────────────────────────────────────────────────────

const RETURN_URL = Linking.createURL("upstox/connected");

export interface UpstoxConnectState {
  connect: () => Promise<void>;
  connecting: boolean;
  error: string | null;
  clearError: () => void;
}

export function useUpstoxConnect(): UpstoxConnectState {
  const qc = useQueryClient();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      // The authorization URL is built server-side so `state` carries a signed,
      // short-lived link token — the callback mints a session only against one.
      // We send our own return URL because it differs between a standalone
      // build (nserank://) and a dev client (exp://…); the backend validates it
      // and seals it into that token.
      const res = await fetch(
        `${API_BASE}/api/upstox/mobile-login?return=${encodeURIComponent(RETURN_URL)}`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${peekSession() ?? ""}`,
          },
        },
      );
      if (!res.ok) throw new Error(`Couldn't start the Upstox login (${res.status}).`);
      const { url } = (await res.json()) as { url: string };

      const result = await WebBrowser.openAuthSessionAsync(url, RETURN_URL);

      if (result.type === "cancel" || result.type === "dismiss") {
        return; // user backed out — not an error worth showing
      }
      if (result.type !== "success") {
        throw new Error("Upstox login didn't complete.");
      }

      const { queryParams } = Linking.parse(result.url);
      const returnedError = queryParams?.error;
      if (typeof returnedError === "string" && returnedError) {
        throw new Error(returnedError);
      }

      const session = queryParams?.session;
      if (typeof session !== "string" || !session) {
        throw new Error("Upstox connected but no session came back — try again.");
      }

      // Swap in the re-minted session (same PIN identity, now carrying Upstox).
      await saveSession(session);
      await qc.invalidateQueries();
      qc.removeQueries({ queryKey: queryKeys.swingLow(false) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upstox connection failed.");
    } finally {
      setConnecting(false);
    }
  }, [qc]);

  return { connect, connecting, error, clearError: () => setError(null) };
}
