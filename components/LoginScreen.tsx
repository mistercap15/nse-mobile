import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiError } from "@/lib/client";
import { IS_LOCAL_API, API_BASE } from "@/lib/config";
import { APP_TITLE, DEVELOPER } from "@/lib/developer";
import { useLogin } from "@/lib/queries";
import { Radius, Spacing, useColors } from "@/lib/theme";
import { PinInput } from "./PinInput";

// ─────────────────────────────────────────────────────────────────────────────
// PIN gate. Six digits, auto-submitting on the sixth.
//
// The backend locks out after 5 wrong attempts with an escalating cooldown and
// returns 429 + retryAfter; we count that down in place rather than letting the
// user keep tapping into a wall.
// ─────────────────────────────────────────────────────────────────────────────

export function LoginScreen({ onAuthenticated }: { onAuthenticated: () => void }) {
  const c = useColors();
  const login = useLogin();
  const [message, setMessage] = useState<string | null>(null);
  const [lockedFor, setLockedFor] = useState(0);
  const [failed, setFailed] = useState(false);

  // Tick the lockout down so the user can see when they may try again.
  useEffect(() => {
    if (lockedFor <= 0) return;
    const t = setTimeout(() => setLockedFor((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [lockedFor]);

  const submit = async (pin: string) => {
    setMessage(null);
    setFailed(false);
    try {
      await login.mutateAsync(pin);
      onAuthenticated();
    } catch (e) {
      setFailed(true);
      if (e instanceof ApiError) {
        setMessage(e.message);
        if (e.isLockedOut && e.retryAfter) setLockedFor(e.retryAfter);
      } else {
        setMessage("Login failed. Please try again.");
      }
    }
  };

  const locked = lockedFor > 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.brand, { color: c.text }]}>
            {APP_TITLE}
            <Text style={{ color: c.accent }}>.</Text>
          </Text>
          <Text style={styles.byline}>
            <Text style={{ color: c.dim }}>by </Text>
            <Text style={{ color: c.accent }}>{DEVELOPER.name}</Text>
          </Text>
          <Text style={[styles.tagline, { color: c.dim }]}>
            F&O seasonality &amp; trade setups
          </Text>

          <View style={styles.pinArea}>
            <View
              style={[
                styles.lockBadge,
                {
                  backgroundColor: locked ? c.redBg : c.accentBg,
                  borderColor: locked ? c.red : c.accent,
                },
              ]}
            >
              <Ionicons
                name={locked ? "lock-closed" : "keypad-outline"}
                size={20}
                color={locked ? c.red : c.accent}
              />
            </View>

            <Text style={[styles.prompt, { color: locked ? c.red : c.soft }]}>
              {locked ? `Locked — try again in ${lockedFor}s` : "Enter your 6-digit PIN"}
            </Text>

            <PinInput
              onComplete={submit}
              disabled={login.isPending || locked}
              error={failed}
            />

            {/* Fixed height so the boxes don't jump when a message appears. */}
            <View style={styles.messageSlot}>
              {login.isPending ? (
                <View style={styles.checkingRow}>
                  <ActivityIndicator size="small" color={c.accent} />
                  <Text style={{ color: c.dim, fontSize: 12 }}>Checking…</Text>
                </View>
              ) : message ? (
                <Text style={{ color: c.red, fontSize: 12, textAlign: "center" }}>{message}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footnote, { color: c.dim }]}>
              After the PIN you&apos;ll connect Upstox — it expires at 03:30 IST daily.
            </Text>
            {IS_LOCAL_API ? (
              <Text style={[styles.footnote, { color: c.amber, marginTop: 6 }]}>
                Dev build → {API_BASE}
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  // Top-aligned: the keyboard is up almost immediately here, and centred
  // content jumps as it appears. Anchored to the top it stays put.
  content: {
    flexGrow: 1,
    justifyContent: "flex-start",
    padding: Spacing.xl,
    paddingTop: Spacing.xxl,
  },
  brand: { fontSize: 34, fontWeight: "800", textAlign: "center", letterSpacing: -0.5 },
  byline: { fontSize: 14, fontWeight: "700", textAlign: "center", marginTop: 4 },
  tagline: { fontSize: 12, textAlign: "center", marginTop: 8, letterSpacing: 0.6 },
  pinArea: { marginTop: Spacing.xl, alignItems: "center" },
  lockBadge: {
    width: 46,
    height: 46,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  prompt: { fontSize: 13, textAlign: "center", marginBottom: Spacing.lg, fontWeight: "600" },
  messageSlot: { minHeight: 34, justifyContent: "center", marginTop: Spacing.md },
  checkingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  // Pushed to the bottom of whatever space is left, so it doesn't crowd the
  // PIN boxes now that the block above no longer fills the screen.
  footer: { marginTop: "auto", paddingTop: Spacing.xxl },
  footnote: { fontSize: 11, textAlign: "center", lineHeight: 16 },
});
