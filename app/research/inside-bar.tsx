import React from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { ConnectionBanner } from "@/components/ConnectionBanner";
import { Badge, Card, ErrorState, KV, Label, StatCard, StatRow } from "@/components/ui";
import { SkeletonCard, SkeletonStatRow } from "@/components/Skeleton";
import { useInsideBarSignal } from "@/lib/queries";
import { DASH, num } from "@/lib/format";
import { Radius, Spacing, Type, useColors, type AppColors } from "@/lib/theme";
import type { InsideBarSignal, InsideBarState } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Inside Bar bot — mirrors the Fib Bot screen, different strategy.
//
// The structural difference is direction: this one trades both ways, so the
// levels come in a long pair and a short pair and the screen has to say which
// side, if either, is live. Everything else is deliberately identical, because
// two monitors that read differently cost you a beat when it matters.
//
// Presentation only. Every number comes from GET /api/inside-bar/signal.
// ─────────────────────────────────────────────────────────────────────────────

const px = (n: number | null | undefined) => num(n, 2);

/** The offset is in the string, so slicing shows IST whatever the phone is set to. */
function barLabel(iso: string | null | undefined): { time: string; date: string } | null {
  if (typeof iso !== "string" || iso.length < 16) return null;
  return { time: iso.slice(11, 16), date: iso.slice(0, 10) };
}

function tone(c: AppColors, state: InsideBarState | undefined, ok: boolean) {
  if (!ok || !state) return { tint: c.dim, label: "SIGNAL UNAVAILABLE", note: "Nothing to act on yet." };
  switch (state) {
    case "long_signal":
      return { tint: c.green, label: "LONG SIGNAL", note: "Breakout above the mother bar." };
    case "short_signal":
      return { tint: c.red, label: "SHORT SIGNAL", note: "Breakout below the mother bar." };
    case "watching_breakout":
      return { tint: c.amber, label: "WATCHING BREAKOUT", note: "Inside bar formed. Waiting for price to leave the range." };
    default:
      return { tint: c.dim, label: "NO SETUP", note: "No inside bar in the recent window." };
  }
}

function Side({ side, live, armed, entry, stop, target, tint }: {
  side: string; live: boolean; armed: boolean;
  entry: number | null | undefined; stop: number | null | undefined;
  target: number | null | undefined; tint: string;
}) {
  const c = useColors();
  return (
    <Card tint={live && armed ? tint : undefined} style={{ padding: Spacing.md, flex: 1, minWidth: 0 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Label style={{ fontSize: 9.5, color: live ? tint : undefined }}>{side}</Label>
        {live ? <Badge text={armed ? "LIVE" : "TOO LATE"} color={armed ? tint : c.dim} small /> : null}
      </View>
      <View style={{ height: Spacing.xs }} />
      <KV k="Entry" v={px(entry)} />
      <KV k="Stop" v={px(stop)} color={c.red} />
      <KV k="Target" v={px(target)} color={c.green} />
    </Card>
  );
}

export default function InsideBarScreen() {
  const c = useColors();
  const { data, isLoading, isRefetching, error, refetch } = useInsideBarSignal();

  const contract = data?.contract ?? null;
  const signal: InsideBarSignal | null = data?.signal ?? null;
  const tokenValid = data?.tokenValid === true;
  const t = tone(c, signal?.state, tokenValid && !!signal);
  const bar = barLabel(signal?.asOf);
  const armed = signal?.entryValid === true;
  const dir = signal?.direction;

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: Spacing.md, paddingBottom: Spacing.xxl }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.accent} />}
    >
      <ConnectionBanner />
      <Label>Nifty futures · hourly · watch-only</Label>

      {isLoading ? (
        <View style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
          <SkeletonCard height={120} />
          <SkeletonStatRow count={3} />
          <SkeletonCard height={160} />
        </View>
      ) : error ? (
        <View style={{ marginTop: Spacing.md }}>
          <ErrorState message={(error as Error).message} onRetry={refetch} />
        </View>
      ) : (
        <>
          <Card style={{ padding: Spacing.md, marginTop: Spacing.md }}>
            <Text style={{ color: c.text, fontSize: 15, fontWeight: "800", ...Type.numeric }}>
              {contract?.tradingSymbol ?? DASH}
            </Text>
            <View style={{ height: Spacing.sm }} />
            <KV k="Expiry" v={contract?.expiryDate ?? null} />
            <KV k="Days to expiry"
                v={contract ? (contract.daysToExpiry === 0 ? "expires today" : `${contract.daysToExpiry}d`) : null}
                color={contract && contract.daysToExpiry <= 3 ? c.amber : undefined} />
            <KV k="Lot size" v={contract ? String(contract.lotSize) : null} />
          </Card>

          <Card tint={t.tint} stripe={t.tint} style={{ padding: Spacing.md, marginTop: Spacing.sm }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: t.tint, fontSize: 20, fontWeight: "800", letterSpacing: -0.3 }}>
                  {t.label}
                </Text>
                <Text style={{ color: c.dim, fontSize: 11, marginTop: 3, lineHeight: 15 }}>{t.note}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Label style={{ fontSize: 9 }}>As of</Label>
                <Text style={{ color: c.text, fontSize: 16, fontWeight: "800", ...Type.numeric }}>
                  {bar?.time ?? DASH}
                </Text>
                {bar ? <Text style={{ color: c.dim, fontSize: 9.5, ...Type.numeric }}>{bar.date} bar</Text> : null}
              </View>
            </View>
            {signal?.reason || data?.error ? (
              <Text style={{ color: c.soft, fontSize: 11.5, marginTop: Spacing.sm, lineHeight: 17 }}>
                {signal?.reason ?? data?.error}
              </Text>
            ) : null}
          </Card>

          <View style={{ marginTop: Spacing.sm }}>
            <StatRow>
              <StatCard label="Mother high" value={px(signal?.motherHigh)} sub="break up = long" color={c.green} />
              <StatCard label="Mother low" value={px(signal?.motherLow)} sub="break down = short" color={c.red} />
              <StatCard label="Range" value={px(signal?.range)} sub="= initial risk" />
            </StatRow>
          </View>

          <View style={{ flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.sm }}>
            <Side side="LONG" live={dir === "long"} armed={armed} tint={c.green}
                  entry={signal?.longTrigger} stop={signal?.longStop} target={signal?.longTarget} />
            <Side side="SHORT" live={dir === "short"} armed={armed} tint={c.red}
                  entry={signal?.shortTrigger} stop={signal?.shortStop} target={signal?.shortTarget} />
          </View>

          <Card style={{ padding: Spacing.md, marginTop: Spacing.sm }}>
            <Label>Detail</Label>
            <View style={{ height: Spacing.xs }} />
            <KV k="Last close" v={px(signal?.lastClose)} />
            <KV k="Inside bar just closed" v={signal?.isInsideBar ? "yes" : "no"} />
            <KV k="Breakout age"
                v={signal?.breakoutBarsAgo == null ? null : `${signal.breakoutBarsAgo} bar(s)`} />
            {data?.config ? (
              <KV k="Rule" mono={false}
                  v={`${data.config.targetMult}× range target · ${data.config.timeoutBars}-bar timeout`} />
            ) : null}
          </Card>

          <View style={{ marginTop: Spacing.md, padding: Spacing.md, borderRadius: Radius.md,
                         borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
            <Text style={{ color: c.dim, fontSize: 10.5, lineHeight: 16 }}>
              An inside bar never signals on its own — the breakout is always a later bar. Levels come
              from the last closed bar; the forming one is excluded. A single bar breaking both sides
              voids the setup, because hourly data cannot say which side went first.
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
