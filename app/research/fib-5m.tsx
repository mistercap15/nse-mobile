import React from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { Badge, Card, ErrorState, KV, Label, StatCard, StatRow } from "@/components/ui";
import { SkeletonCard, SkeletonStatRow } from "@/components/Skeleton";
import { useFib5mSignal, useFibSignal } from "@/lib/queries";
import { DASH, num } from "@/lib/format";
import { Radius, Spacing, Type, useColors } from "@/lib/theme";

// ─────────────────────────────────────────────────────────────────────────────
// 5-minute Fib bot — the same strategy as the hourly Nifty screen, faster bars.
//
// The one thing this screen has that the others do not is the PRIORITY card,
// and it is the reason the screen exists. This bot only trades while the hourly
// bot is idle, so its own signal cannot answer "what is it doing". Both signals
// are fetched and shown together, senior above junior.
//
// HONEST ABOUT WHAT IT CAN SEE, on screen and not just here. This reads the two
// signal routes. It cannot see the droplet's state files, the exchange position
// or the contract claim — and the bot weighs all three — so the card says what
// the SIGNALS imply and labels itself as derived. Telegram and /status stay the
// authority on what the bot actually did.
// ─────────────────────────────────────────────────────────────────────────────

const px = (n: number | null | undefined, d = 2) => num(n, d);

function barLabel(iso: string | null | undefined) {
  if (typeof iso !== "string" || iso.length < 16) return null;
  return { time: `${iso.slice(11, 16)} IST`, date: iso.slice(0, 10) };
}

export default function Fib5mScreen() {
  const c = useColors();
  const { data, isLoading, isRefetching, error, refetch } = useFib5mSignal();
  const hourly = useFibSignal();

  const signal = data?.signal ?? null;
  const armed = signal?.entryValid === true;
  const bar = barLabel(signal?.asOf);
  const contract = data?.contract ?? null;

  const hourlySignal = hourly.data?.signal ?? null;
  const hourlyArmed = hourlySignal?.entryValid === true;
  const yielding = hourlyArmed;

  const riskPts =
    signal?.fibEntry != null && signal?.stopPrice != null
      ? signal.fibEntry - signal.stopPrice
      : null;

  const tint = !signal ? c.dim : yielding ? c.purple : armed ? c.green : c.amber;
  const label = !signal
    ? "NO SIGNAL"
    : yielding
      ? "STANDING DOWN"
      : armed
        ? "READY TO BUY"
        : "WAITING FOR A SETUP";
  const note = !signal
    ? data?.error ?? "Nothing to act on yet."
    : yielding
      ? "The hourly bot has a live setup, so this bot opens nothing until it clears."
      : armed
        ? "The hourly bot looks idle, so a buy order should be waiting at this price."
        : "No order should be waiting right now.";

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: Spacing.md, paddingBottom: Spacing.xxl }}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => { refetch(); hourly.refetch(); }}
          tintColor={c.accent}
        />
      }
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Label>Nifty futures · 5-minute · fills the idle time</Label>
        <Badge text="LIVE · REAL" color={c.red} small />
      </View>

      {isLoading ? (
        <View style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
          <SkeletonCard height={110} />
          <SkeletonCard height={120} />
          <SkeletonStatRow count={3} />
        </View>
      ) : error ? (
        <View style={{ marginTop: Spacing.md }}>
          <ErrorState message={(error as Error).message} onRetry={refetch} />
        </View>
      ) : (
        <>
          {/* ── Who owns the contract ───────────────────────────────── */}
          <Card style={{ padding: Spacing.md, marginTop: Spacing.sm }}>
            <Label>Who has priority on this contract</Label>
            <View style={{ height: Spacing.xs }} />
            <KV
              k="Hourly bot · senior"
              v={hourly.data?.signal ? (hourlyArmed ? "Has a live setup" : "Idle") : "No signal"}
            />
            <KV
              k="5-min bot · junior"
              v={yielding ? "Stands down" : armed ? "Free to trade" : "Waiting for a setup"}
            />
            <Text style={{ color: c.dim, fontSize: 10, marginTop: Spacing.sm, lineHeight: 15 }}>
              Derived from the two signals, not from the bot. It also checks the exchange position, the
              order book and the contract claim on its own machine, so it can stand down for reasons this
              screen cannot see. Telegram and /status are the authority.
            </Text>
          </Card>

          {/* ── State ───────────────────────────────────────────────── */}
          <Card tint={tint} stripe={tint} style={{ padding: Spacing.md, marginTop: Spacing.sm }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: tint, fontSize: 20, fontWeight: "800", letterSpacing: -0.3 }}>
                  {label}
                </Text>
                <Text style={{ color: c.dim, fontSize: 11, marginTop: 3, lineHeight: 15 }}>{note}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Label style={{ fontSize: 9 }}>As of</Label>
                <Text style={{ color: c.text, fontSize: 14, fontWeight: "800", ...Type.numeric }}>
                  {bar?.time ?? DASH}
                </Text>
                {bar ? <Text style={{ color: c.dim, fontSize: 9.5, ...Type.numeric }}>{bar.date}</Text> : null}
              </View>
            </View>
            {signal?.reason || data?.error ? (
              <Text style={{ color: c.soft, fontSize: 11.5, marginTop: Spacing.sm, lineHeight: 17 }}>
                {signal?.reason ?? data?.error}
              </Text>
            ) : null}
          </Card>

          {/* ── The level ───────────────────────────────────────────── */}
          <Card
            tint={armed && !yielding ? c.accent : undefined}
            style={{ padding: Spacing.md, marginTop: Spacing.sm }}
          >
            <Label style={{ fontSize: 9.5 }}>Buy at — the fib level</Label>
            <Text
              style={{
                color: armed && !yielding ? c.accent : c.text, fontSize: 30, fontWeight: "800",
                letterSpacing: -1, marginTop: 4, ...Type.numeric,
              }}
            >
              {px(signal?.fibEntry)}
            </Text>
            <Text style={{ color: c.dim, fontSize: 10.5, marginTop: 2 }}>
              {contract?.tradingSymbol ?? DASH}
              {contract?.lotSize ? ` · 1 lot = ${contract.lotSize}` : ""}
            </Text>
          </Card>

          <View style={{ marginTop: Spacing.sm }}>
            <StatRow>
              <StatCard
                label="Stop" value={px(signal?.stopPrice)}
                sub={riskPts != null ? `${num(riskPts, 0)} pts below` : undefined}
                color={c.red}
              />
              <StatCard label="Target" value={px(signal?.targetPrice)} sub="swing high" color={c.green} />
              <StatCard
                label="Reward : risk"
                value={signal?.rewardRiskRatio != null ? `${num(signal.rewardRiskRatio, 2)}×` : DASH}
                sub="per trade"
                color={
                  signal?.rewardRiskRatio == null ? undefined
                    : signal.rewardRiskRatio >= 2 ? c.green
                      : signal.rewardRiskRatio >= 1.5 ? c.amber : c.red
                }
              />
            </StatRow>
          </View>

          <Card style={{ padding: Spacing.md, marginTop: Spacing.sm }}>
            <Label>The swing behind it</Label>
            <View style={{ height: Spacing.xs }} />
            <KV k="Swing high (target)" v={px(signal?.swingHigh)} />
            <KV k="Swing low" v={px(signal?.swingLow)} />
            <KV k="ATR (14)" v={px(signal?.atr)} />
            <KV k="Last close" v={px(signal?.lastClose)} />
            <KV k="Days to expiry" v={contract?.daysToExpiry != null ? `${contract.daysToExpiry}` : null} />
          </Card>

          <View style={{ marginTop: Spacing.md, padding: Spacing.md, borderRadius: Radius.md,
                         borderWidth: 1, borderColor: c.border, backgroundColor: c.surface }}>
            <Text style={{ color: c.dim, fontSize: 10.5, lineHeight: 16 }}>
              The same engine as the hourly Fib bot, one copy — only the candle feed differs. The buy is a
              waiting limit order, so it fills at that price or better, or not at all. Both bots trade this
              one contract on one Upstox account and Upstox nets positions, which is why only one of them
              may ever hold it. /halt to the Telegram bot stops it placing anything at all; /stop only
              stops new entries and keeps protecting an open trade.
              {data?.barsUsed ? ` Computed from ${data.barsUsed} closed 5-minute bars.` : ""}
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}
