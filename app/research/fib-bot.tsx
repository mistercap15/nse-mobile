import React from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { ConnectionBanner } from "@/components/ConnectionBanner";
import { Card, ErrorState, KV, Label, StatCard, StatRow } from "@/components/ui";
import { SkeletonCard, SkeletonStatRow } from "@/components/Skeleton";
import { useFibSignal } from "@/lib/queries";
import { DASH, num } from "@/lib/format";
import { Radius, Spacing, Type, useColors, type AppColors } from "@/lib/theme";
import type { FibSignal } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Fib Bot — the Nifty futures monitor, mirroring the web's /fib screen.
//
// Presentation only. Every number here arrives from GET /api/fib/signal; the
// app computes none of them, which is why the two clients can never disagree
// about what the bot would do.
//
// Watch-only: nothing is traded from this screen, and there is no order code in
// this app at all.
// ─────────────────────────────────────────────────────────────────────────────

/** Display formatting only — index levels are quoted to 2dp. */
const px = (n: number | null | undefined) => num(n, 2);

/**
 * Bar timestamps arrive as "2026-08-18T15:15:00+05:30". The offset is part of
 * the string, so slicing shows IST regardless of the phone's timezone — parsing
 * to a Date and formatting locally would quietly re-label a 15:15 IST bar for a
 * traveller, which is the kind of wrongness a trading screen cannot afford.
 */
function barLabel(iso: string | null | undefined): { time: string; date: string } | null {
  if (typeof iso !== "string" || iso.length < 16) return null;
  return { time: iso.slice(11, 16), date: iso.slice(0, 10) };
}

type State = "armed" | "aside" | "unavailable";

function stateOf(signal: FibSignal | null, tokenValid: boolean): State {
  if (!tokenValid || !signal) return "unavailable";
  return signal.entryValid ? "armed" : "aside";
}

function stateTone(c: AppColors, state: State): { tint: string; label: string; note: string } {
  switch (state) {
    case "armed":
      return { tint: c.green, label: "ORDER ARMED", note: "A buy order should be resting at the entry price." };
    case "aside":
      return { tint: c.amber, label: "STAND ASIDE", note: "No order should be resting right now." };
    default:
      return { tint: c.dim, label: "SIGNAL UNAVAILABLE", note: "Nothing to act on yet." };
  }
}

export default function FibBotScreen() {
  const c = useColors();
  const { data, isLoading, isRefetching, error, refetch } = useFibSignal();

  const contract = data?.contract ?? null;
  const signal = data?.signal ?? null;
  const tokenValid = data?.tokenValid === true;
  const state = stateOf(signal, tokenValid);
  const tone = stateTone(c, state);
  const bar = barLabel(signal?.asOf);
  const rr = signal?.rewardRiskRatio;

  const rrColor =
    rr == null ? c.text : rr >= 2 ? c.green : rr >= 1.5 ? c.amber : c.red;

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: Spacing.md, paddingBottom: Spacing.xxl }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.accent} />
      }
    >
      {/* Upstox tokens lapse at 03:30 IST daily — the app's standard banner. */}
      <ConnectionBanner />

      <Label>Nifty futures · hourly · watch-only</Label>

      {isLoading ? (
        <View style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
          <SkeletonCard height={120} />
          <SkeletonStatRow count={3} />
          <SkeletonCard height={160} />
        </View>
      ) : error ? (
        // The route itself answers 200 even when it fails, so reaching here means
        // the network or the deployment is down — not a signal problem.
        <View style={{ marginTop: Spacing.md }}>
          <ErrorState message={(error as Error).message} onRetry={refetch} />
        </View>
      ) : (
        <>
          {/* ── Contract strip ─────────────────────────────────────────── */}
          <Card style={{ padding: Spacing.md, marginTop: Spacing.md }}>
            <Text style={{ color: c.text, fontSize: 15, fontWeight: "800", ...Type.numeric }}>
              {contract?.tradingSymbol ?? DASH}
            </Text>
            <Text style={{ color: c.dim, fontSize: 10, marginTop: 2, ...Type.numeric }}>
              {contract?.instrumentKey ?? DASH}
            </Text>
            <View style={{ height: Spacing.sm }} />
            <KV k="Expiry" v={contract?.expiryDate ?? null} />
            <KV
              k="Days to expiry"
              v={contract ? (contract.daysToExpiry === 0 ? "expires today" : `${contract.daysToExpiry}d`) : null}
              color={contract && contract.daysToExpiry <= 3 ? c.amber : undefined}
            />
            <KV k="Lot size" v={contract ? String(contract.lotSize) : null} />
            {contract?.rollsInto ? <KV k="Rolls into" v={contract.rollsInto.tradingSymbol} /> : null}
          </Card>

          {/* ── Signal state (the hero) ────────────────────────────────── */}
          <Card
            tint={tone.tint}
            stripe={tone.tint}
            style={{ padding: Spacing.md, marginTop: Spacing.sm }}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: tone.tint, fontSize: 20, fontWeight: "800", letterSpacing: -0.3 }}>
                  {tone.label}
                </Text>
                <Text style={{ color: c.dim, fontSize: 11, marginTop: 3, lineHeight: 15 }}>
                  {tone.note}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Label style={{ fontSize: 9 }}>As of</Label>
                <Text style={{ color: c.text, fontSize: 16, fontWeight: "800", ...Type.numeric }}>
                  {bar?.time ?? DASH}
                </Text>
                {bar ? (
                  <Text style={{ color: c.dim, fontSize: 9.5, ...Type.numeric }}>{bar.date} bar</Text>
                ) : null}
              </View>
            </View>

            {/* The engine's own words, verbatim — it already explains itself. */}
            {signal?.reason || data?.error ? (
              <Text style={{ color: c.soft, fontSize: 11.5, marginTop: Spacing.sm, lineHeight: 17 }}>
                {signal?.reason ?? data?.error}
              </Text>
            ) : null}
          </Card>

          {/* ── Entry, the number that matters most ────────────────────── */}
          <Card
            tint={state === "armed" ? c.accent : undefined}
            style={{ padding: Spacing.md, marginTop: Spacing.sm }}
          >
            <Label style={{ fontSize: 9.5 }}>Fib entry — limit buy</Label>
            <Text
              style={{
                color: state === "armed" ? c.accent : c.text,
                fontSize: 34,
                fontWeight: "800",
                letterSpacing: -1,
                marginTop: 4,
                ...Type.numeric,
              }}
            >
              {px(signal?.fibEntry)}
            </Text>
            <Text style={{ color: c.dim, fontSize: 10.5, marginTop: 2 }}>
              {state === "armed"
                ? "An order should be resting here now"
                : "Where an order would rest if the setup re-arms"}
            </Text>
          </Card>

          {/* ── Stop / target / reward:risk ────────────────────────────── */}
          <View style={{ marginTop: Spacing.sm }}>
            <StatRow>
              <StatCard
                label="Stop"
                value={px(signal?.stopPrice)}
                sub={signal?.stopDistancePts != null ? `${px(signal.stopDistancePts)} pts risk` : undefined}
                color={c.red}
              />
              <StatCard
                label="Target"
                value={px(signal?.targetPrice)}
                sub={signal?.targetDistancePts != null ? `${px(signal.targetDistancePts)} pts reward` : undefined}
                color={c.green}
              />
              <StatCard
                label="R : R"
                value={rr != null ? `${num(rr, 2)}×` : DASH}
                sub="target ÷ risk"
                color={rrColor}
              />
            </StatRow>
          </View>

          {/* ── Supporting detail ──────────────────────────────────────── */}
          <Card style={{ padding: Spacing.md, marginTop: Spacing.sm }}>
            <Label>The swing behind it</Label>
            <View style={{ height: Spacing.xs }} />
            <KV k="Swing high (target)" v={px(signal?.swingHigh)} />
            <KV k="Swing low" v={px(signal?.swingLow)} />
            <KV k="Range" v={signal?.range != null ? `${px(signal.range)} pts` : null} />
            <KV k="Last close" v={px(signal?.lastClose)} />
            <KV k="ATR (14)" v={px(signal?.atr)} />
            {data?.config ? (
              <KV
                k="Rule"
                v={`${data.config.fibLevel} retrace · ${data.config.atrStopMult}× ATR stop · ${data.config.swingLookback}-bar swing`}
                mono={false}
              />
            ) : null}
          </Card>

          {/* ── Footnotes ──────────────────────────────────────────────── */}
          <View
            style={{
              marginTop: Spacing.md,
              padding: Spacing.md,
              borderRadius: Radius.md,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.surface,
            }}
          >
            <Text style={{ color: c.dim, fontSize: 10.5, lineHeight: 16 }}>
              Levels come from the last closed hourly bar — the bar still forming is excluded, so
              nothing flickers mid-hour. Bars run 09:15, 10:15 … 15:15 IST, and the 15:15 bar is a
              15-minute stub closing with the session.
              {data?.barsUsed ? ` Computed from ${data.barsUsed} closed bars.` : ""}
            </Text>
            <Text style={{ color: c.dim, fontSize: 10.5, lineHeight: 16, marginTop: Spacing.sm }}>
              Watch-only. No orders are placed from this app.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}
