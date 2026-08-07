import React, { useEffect, useRef } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useQueryClient } from "@tanstack/react-query";
import { saveSession } from "@/lib/session";
import { Spacing, useColors } from "@/lib/theme";

// ─────────────────────────────────────────────────────────────────────────────
// Landing point for the Upstox OAuth deep link (nserank://upstox/connected).
//
// Normally openAuthSessionAsync intercepts the redirect and the app never
// navigates here. But Android often hands the custom-scheme redirect to the OS
// instead, which launches the app at this path — and with no route to match, the
// user was dropped on expo-router's "Unmatched Route" screen mid-login.
//
// So this route exists to absorb that case: it completes the handover (the
// session token is in the query string) and replaces itself with Home, leaving
// no dead screen in the back stack.
// ─────────────────────────────────────────────────────────────────────────────
export default function UpstoxConnectedScreen() {
  const c = useColors();
  const router = useRouter();
  const qc = useQueryClient();
  const { session, error } = useLocalSearchParams<{ session?: string; error?: string }>();

  // Both this route and openAuthSessionAsync can fire for one login; guard so
  // the session is only swapped in once.
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    (async () => {
      // If the in-app browser is somehow still up, close it before we navigate.
      try {
        WebBrowser.dismissBrowser();
      } catch {
        // Nothing open — fine.
      }

      if (session) {
        await saveSession(session);
        await qc.invalidateQueries();
      }

      // replace(), not push(): this screen must not be reachable via Back.
      router.replace("/");
    })();
  }, [session, error, qc, router]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.bg }}>
        <ActivityIndicator color={c.accent} />
        <Text style={{ color: c.soft, fontSize: 13, marginTop: Spacing.md, fontWeight: "600" }}>
          {error ? "Couldn't connect Upstox" : "Finishing Upstox sign-in…"}
        </Text>
        {error ? (
          <Text
            style={{
              color: c.dim,
              fontSize: 11,
              marginTop: 6,
              textAlign: "center",
              paddingHorizontal: Spacing.xl,
            }}
          >
            {error}
          </Text>
        ) : null}
      </View>
    </>
  );
}
