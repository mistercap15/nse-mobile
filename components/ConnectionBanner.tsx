import React, { useEffect } from "react";
import { AppState, Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { Radius, Spacing, useColors } from "@/lib/theme";
import { queryKeys, useUpstoxStatus } from "@/lib/queries";
import { useUpstoxConnect } from "@/lib/useUpstoxConnect";
import { Button } from "./ui";

// ─────────────────────────────────────────────────────────────────────────────
// The "Connect Upstox" banner, mirroring the web's.
//
// Upstox tokens die at ~03:30 IST daily, so this is a normal once-a-day prompt
// rather than an error — the copy stays matter-of-fact. Every screen renders
// fine without Upstox; only live-price fields degrade to "—", so this banner
// never blocks anything.
// ─────────────────────────────────────────────────────────────────────────────

/** Re-checks Upstox on app foreground, as the spec asks. */
export function useUpstoxForegroundRefresh() {
  const qc = useQueryClient();
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        qc.invalidateQueries({ queryKey: queryKeys.upstoxStatus });
      }
    });
    return () => sub.remove();
  }, [qc]);
}

export function ConnectionBanner({ compact = false }: { compact?: boolean }) {
  const c = useColors();
  const { data } = useUpstoxStatus();
  const { connect, connecting, error } = useUpstoxConnect();

  // No data yet, or connected and healthy → nothing to say.
  if (!data || (data.connected && !data.expired)) return null;

  const expired = data.expired;
  const tint = expired ? c.amber : c.accent;
  const bg = expired ? c.amberBg : c.accentBg;

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: tint,
        backgroundColor: bg,
        borderRadius: Radius.md,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        flexDirection: compact ? "row" : "column",
        alignItems: compact ? "center" : "stretch",
        justifyContent: "space-between",
        gap: Spacing.sm,
      }}
    >
      <View style={{ flex: compact ? 1 : undefined }}>
        <Text style={{ color: tint, fontWeight: "800", fontSize: 12, letterSpacing: 0.4 }}>
          {expired ? "UPSTOX SESSION EXPIRED" : "UPSTOX NOT CONNECTED"}
        </Text>
        <Text style={{ color: c.soft, fontSize: 11, marginTop: 4, lineHeight: 16 }}>
          {expired
            ? "Tokens lapse at 03:30 IST every day. One tap reconnects."
            : "Seasonality and sizing still work — live prices show “—” until you connect."}
        </Text>
        {error ? (
          <Text style={{ color: c.red, fontSize: 11, marginTop: 6 }}>{error}</Text>
        ) : null}
      </View>
      <Button
        label={connecting ? "Connecting…" : "Connect Upstox"}
        onPress={connect}
        loading={connecting}
        style={compact ? undefined : { marginTop: Spacing.xs }}
      />
    </View>
  );
}
