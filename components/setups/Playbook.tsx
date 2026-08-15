import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ConnectionBanner } from "@/components/ConnectionBanner";
import { Hero } from "@/components/Hero";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  KV,
  Label,
  SectionHeader,
  SkeletonScreen,
  StatCard,
  StatRow,
} from "@/components/ui";
import { usePlaybook, useUpstoxStatus } from "@/lib/queries";
import { useAppStore } from "@/lib/store";
import { DASH, MONTH_FULL, currentMonthIST, num, pct, rupees, rupeesCompact } from "@/lib/format";
import {
  Radius,
  Spacing,
  Type,
  hairline,
  tintGradient,
  useColors,
  useIsDark,
  type AppColors,
} from "@/lib/theme";
import type { PlaybookPick } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// The Playbook — the month's few highest-conviction trades, ready to act on.
//
// Every other screen answers a narrower question; this one is the answer to
// "what do I actually buy". Scoring lives server-side in lib/conviction.js so
// the app and the dashboard can't disagree; this file is purely how it reads.
//
// The design leads with the trade, not the analysis: symbol, conviction, then
// entry/stop/target/lots. The reasoning is one tap away rather than in your
// face, because by the time you're on this screen the question is "how much",
// not "why".
// ─────────────────────────────────────────────────────────────────────────────

function bandColor(c: AppColors, band: string): string {
  switch (band) {
    case "HIGH": return c.green;
    case "GOOD": return c.accent;
    case "FAIR": return c.amber;
    default:     return c.dim;
  }
}

/** Three stacked bars — which lens is carrying the pick, at a glance. */
function ConvictionBars({ components }: { components: PlaybookPick["components"] }) {
  const c = useColors();
  const rows: [string, number, string][] = [
    ["Edge", components.edge, c.accent],
    ["Setup", components.structure, c.purple],
    ["Timing", components.timing, c.green],
  ];
  return (
    <View style={{ gap: 5 }}>
      {rows.map(([label, value, color]) => (
        <View key={label} style={styles.barRow}>
          <Text style={[styles.barLabel, { color: c.dim }]}>{label}</Text>
          <View style={[styles.barTrack, { backgroundColor: c.surface }]}>
            <View
              style={{
                width: `${Math.max(2, Math.min(100, value))}%`,
                height: "100%",
                borderRadius: 3,
                backgroundColor: color,
              }}
            />
          </View>
          <Text style={[styles.barValue, { color: c.soft }]}>{value.toFixed(0)}</Text>
        </View>
      ))}
    </View>
  );
}

function PickCard({ pick, rank }: { pick: PlaybookPick; rank: number }) {
  const c = useColors();
  const isDark = useIsDark();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const tint = bandColor(c, pick.band);
  const lv = pick.levels;

  return (
    <Card stripe={tint} level={2} style={{ paddingLeft: Spacing.md + 4 }}>
      <Pressable onPress={() => setOpen((o) => !o)} style={{ padding: Spacing.md }}>
        {/* Headline: rank, symbol, conviction */}
        <View style={styles.head}>
          <View style={[styles.rank, { backgroundColor: tintGradient(tint, isDark)[0], borderColor: `${tint}66` }]}>
            <Text style={{ color: tint, fontSize: 13, fontWeight: "800" }}>{rank}</Text>
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ color: c.text, fontSize: 17, fontWeight: "800", letterSpacing: -0.3 }}>
                {pick.symbol}
              </Text>
              <Badge text={pick.band} color={tint} small />
              {pick.sources >= 3 ? <Badge text="★ ALL 3" color={c.purple} small /> : null}
            </View>
            <Text numberOfLines={1} style={{ color: c.dim, fontSize: 10, marginTop: 3 }}>
              {pick.sector ?? "—"} · lot {num(pick.lotSize)} · {pick.checklist.result.toLowerCase()}
            </Text>
          </View>

          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ color: tint, fontSize: 22, fontWeight: "800", ...Type.numeric }}>
              {pick.conviction.toFixed(0)}
            </Text>
            <Text style={{ color: c.dim, fontSize: 8.5, letterSpacing: 0.6 }}>CONVICTION</Text>
          </View>
        </View>

        {/* The trade itself */}
        <View style={[styles.levels, { borderTopColor: hairline(c, isDark) }]}>
          <Level label="Entry" value={lv ? rupees(lv.entry.price) : DASH} color={c.text} />
          <Level
            label="Stop"
            value={lv ? rupees(lv.stop.price) : DASH}
            sub={lv ? pct(-lv.stop.pct, 1, false) : undefined}
            color={c.red}
          />
          <Level
            label="Target"
            value={lv?.target ? rupees(lv.target.price) : DASH}
            sub={lv?.target ? pct(lv.target.pct) : undefined}
            color={c.green}
          />
          <Level
            label="Lots"
            value={pick.lots ? String(pick.lots) : "0"}
            sub={pick.lots ? `${rupeesCompact(pick.capitalUsed)} margin` : "no capital"}
            color={pick.lots ? c.accent : c.dim}
          />
        </View>

        {/* Top reason, always visible — the card should justify itself */}
        {pick.reasons.length ? (
          <View style={{ flexDirection: "row", gap: 6, marginTop: Spacing.sm, alignItems: "flex-start" }}>
            <Ionicons name="sparkles" size={11} color={tint} style={{ marginTop: 1.5 }} />
            <Text style={{ color: c.soft, fontSize: 11, flex: 1, lineHeight: 16 }}>
              {pick.reasons[0]}
            </Text>
          </View>
        ) : null}

        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: Spacing.sm }}>
          <Text style={{ color: c.dim, fontSize: 10, fontWeight: "600" }}>
            {open ? "Hide" : `${pick.reasons.length} reasons · full plan`}
          </Text>
          <Ionicons name={open ? "chevron-up" : "chevron-down"} size={11} color={c.dim} />
        </View>
      </Pressable>

      {open ? (
        <View style={[styles.expanded, { borderTopColor: hairline(c, isDark) }]}>
          <Label style={{ fontSize: 9.5 }}>Why this trade</Label>
          <View style={{ gap: 6, marginTop: Spacing.sm }}>
            {pick.reasons.map((r, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 7 }}>
                <Text style={{ color: tint, fontSize: 11, lineHeight: 16 }}>•</Text>
                <Text style={{ color: c.soft, fontSize: 11, flex: 1, lineHeight: 16 }}>{r}</Text>
              </View>
            ))}
          </View>

          <View style={{ marginTop: Spacing.md }}>
            <Label style={{ fontSize: 9.5 }}>Conviction breakdown</Label>
            <View style={{ marginTop: Spacing.sm }}>
              <ConvictionBars components={pick.components} />
            </View>
          </View>

          <View style={{ marginTop: Spacing.md }}>
            <KV k="Stop sits under" v={lv ? lv.stop.basis.replace(/_/g, " ").toLowerCase() : DASH} />
            <KV
              k="Risk : reward"
              v={lv?.riskReward != null ? `${lv.riskReward.toFixed(1)}×` : DASH}
              color={lv?.riskReward != null && lv.riskReward >= 2 ? c.green : c.amber}
            />
            <KV k="Risk at stop" v={pick.lots ? rupees(pick.riskAmount) : DASH} color={c.red} />
            <KV k="Reward at target" v={pick.lots ? rupees(pick.rewardAmount) : DASH} color={c.green} />
            <KV
              k="Contract notional"
              v={pick.lots ? `${rupees(pick.notional)} (${pick.lots}×)` : rupees(pick.notionalPerLot)}
            />
            {pick.swingLow?.floor ? (
              <KV
                k="Support floor"
                v={`${rupees(pick.swingLow.floor.low)} · ${pick.swingLow.floor.touches} touches`}
              />
            ) : null}
            <KV k="Pre-trade checks" v={`${pick.checklist.passCount}/${pick.checklist.totalChecks} — ${pick.checklist.result}`} />
            {pick.seasonality ? (
              <KV
                k="Seasonality"
                v={`${pick.seasonality.winRate}% WR · median ${pct(pick.seasonality.medianReturn)} (n=${pick.seasonality.n})`}
              />
            ) : null}
          </View>

          {pick.lots === 0 ? (
            <View style={[styles.warn, { borderColor: c.amber, backgroundColor: c.amberBg }]}>
              <Text style={{ color: c.amber, fontSize: 10, lineHeight: 15 }}>
                Capital ran out before this one. One lot needs {rupees(pick.lotCost)} — raise your
                capital in Settings or trade fewer names.
              </Text>
            </View>
          ) : null}

          <Button
            label={`Open ${pick.symbol}`}
            variant="ghost"
            onPress={() => router.push(`/stock/${pick.symbol}` as never)}
            style={{ marginTop: Spacing.md }}
          />
        </View>
      ) : null}
    </Card>
  );
}

function Level({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  const c = useColors();
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: c.dim, fontSize: 8.5, letterSpacing: 0.5 }}>{label.toUpperCase()}</Text>
      <Text style={{ color, fontSize: 13.5, fontWeight: "800", marginTop: 3, ...Type.numeric }}>
        {value}
      </Text>
      {sub ? (
        <Text numberOfLines={1} style={{ color: c.dim, fontSize: 8.5, marginTop: 1 }}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

export function PlaybookPanel() {
  const c = useColors();
  const isDark = useIsDark();
  const month = currentMonthIST();
  const sizing = useAppStore((s) => s.sizing);
  const upstox = useUpstoxStatus();
  const [started, setStarted] = useState(false);

  const { data, isLoading, error, refetch } = usePlaybook(
    month,
    sizing.capital,
    sizing.reserve,
    sizing.avgLotCost,
    6,
    started,
  );

  const cap = data?.capital;
  const picks = data?.picks ?? [];

  return (
    <View>
      <ConnectionBanner />

      <Hero
        eyebrow={`Playbook · ${MONTH_FULL[month - 1]}`}
        title="Top conviction"
        accentWord={picks.length ? `${picks.length} trades` : undefined}
        tone={c.purple}
        subtitle="Where the seasonal edge, the chart and the timing all agree — scored, ranked and sized to your capital."
        stats={
          cap
            ? [
                { label: "Deployed", value: rupeesCompact(cap.deployed), color: c.accent },
                { label: "At risk", value: rupeesCompact(cap.totalRisk), color: c.red },
                { label: "Of capital", value: `${cap.riskPctOfCapital}%`, color: c.amber },
              ]
            : undefined
        }
      />

      {!started ? (
        <View style={{ marginTop: Spacing.md }}>
          <Button
            label="Build my playbook"
            onPress={() => setStarted(true)}
            disabled={!upstox.data?.connected}
          />
          <Text style={{ color: c.dim, fontSize: 11, marginTop: Spacing.sm, lineHeight: 16 }}>
            {upstox.data?.connected
              ? "Scores this month's seasonal candidates against their charts and timing, then sizes the best few to your capital. Takes a minute the first time each day."
              : "Needs Upstox — conviction depends on live prices for the levels, the floor and the entry timing."}
          </Text>
        </View>
      ) : null}

      {isLoading ? (
        <View style={{ marginTop: Spacing.lg }}>
          <Text style={{ color: c.dim, fontSize: 11, marginBottom: Spacing.sm }}>
            Scoring the shortlist across seasonality, structure and timing…
          </Text>
          <SkeletonScreen stats={3} usedAbove={320} />
        </View>
      ) : error ? (
        <ErrorState message={(error as Error).message} onRetry={refetch} />
      ) : data ? (
        <>
          {data.note ? (
            <Card tint={c.amber} style={{ padding: Spacing.md, marginTop: Spacing.md }}>
              <Text style={{ color: c.amber, fontSize: 11, lineHeight: 16 }}>{data.note}</Text>
            </Card>
          ) : null}

          {cap ? (
            <View style={{ marginTop: Spacing.md }}>
              <StatRow>
                <StatCard label="Usable" value={rupeesCompact(cap.usable)} sub="capital − reserve" />
                <StatCard
                  label="Deployed"
                  value={`${cap.deployedPct}%`}
                  sub={rupeesCompact(cap.deployed)}
                  color={c.accent}
                />
                <StatCard
                  label="Exposure"
                  value={rupeesCompact(cap.notional)}
                  sub="contract notional"
                  color={c.purple}
                />
              </StatRow>
              <View style={{ height: Spacing.sm }} />
              <StatRow>
                <StatCard
                  label="Risk if all stop out"
                  value={rupees(cap.totalRisk)}
                  sub={`${cap.riskPctOfCapital}% of capital`}
                  color={c.red}
                />
                <StatCard
                  label="Reward if all hit"
                  value={rupees(cap.totalReward)}
                  color={c.green}
                />
              </StatRow>
            </View>
          ) : null}

          {picks.length ? (
            <>
              <SectionHeader
                icon="trophy"
                tint={c.purple}
                title={`${picks.length} trades to take`}
                right={
                  data.cached ? (
                    <Text style={{ color: c.dim, fontSize: 10 }}>cached today</Text>
                  ) : null
                }
              />
              <View style={{ gap: Spacing.sm }}>
                {picks.map((p, i) => (
                  <PickCard key={p.symbol} pick={p} rank={i + 1} />
                ))}
              </View>

              <Button
                label="Rebuild"
                variant="ghost"
                onPress={() => refetch()}
                style={{ marginTop: Spacing.md }}
              />
            </>
          ) : started && !data.shortlist ? (
            <EmptyState
              emoji="🪙"
              title="Nothing cleared the bar"
              hint={`Of ${data.considered ?? 0} candidates, none passed every gate this month. That is a legitimate answer — sitting out is a position.`}
            />
          ) : null}

          {/* Why some names didn't make it — "where's X?" is a fair question */}
          {data.rejected?.length ? (
            <>
              <SectionHeader icon="filter" tint={c.dim} title="Considered but rejected" />
              <Card flat style={{ padding: Spacing.md }}>
                {data.rejected.slice(0, 8).map((r) => (
                  <View key={r.symbol} style={{ flexDirection: "row", gap: 8, paddingVertical: 4 }}>
                    <Text style={{ color: c.soft, fontSize: 11, fontWeight: "700", width: 88 }}>
                      {r.symbol}
                    </Text>
                    <Text style={{ color: c.dim, fontSize: 10, flex: 1, lineHeight: 15 }}>
                      {r.why.join(" · ")}
                    </Text>
                  </View>
                ))}
              </Card>
            </>
          ) : null}

          {/* Seasonality-only fallback when Upstox is down */}
          {data.shortlist?.length ? (
            <>
              <SectionHeader icon="podium" title="Seasonal shortlist" />
              <Card flat style={{ padding: Spacing.md }}>
                {data.shortlist.slice(0, 10).map((s) => (
                  <View key={s.symbol} style={styles.shortRow}>
                    <Text style={{ color: c.text, fontSize: 12, fontWeight: "700", flex: 1 }}>
                      {s.symbol}
                    </Text>
                    <Text style={{ color: c.dim, fontSize: 10 }}>edge {s.edge}</Text>
                    <Text style={{ color: c.green, fontSize: 11, fontWeight: "700", width: 52, textAlign: "right" }}>
                      {pct(s.medianReturn)}
                    </Text>
                  </View>
                ))}
              </Card>
            </>
          ) : null}

          <View style={{ marginTop: Spacing.lg }}>
            <LinearGradient
              colors={tintGradient(c.dim, isDark)}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: Radius.md, padding: Spacing.md }}
            >
              <Text style={{ color: c.dim, fontSize: 10, lineHeight: 15 }}>
                Conviction blends three independent measurements — the seasonal edge (45%), the
                structural setup (30%) and the entry timing (25%) — and adds a small bonus when more
                than one screener surfaces the same name. It is a ranking of historical evidence,
                not a forecast, and every stop here is a level you should honour.
              </Text>
            </LinearGradient>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  rank: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  levels: { flexDirection: "row", gap: Spacing.xs, marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1 },
  expanded: { borderTopWidth: 1, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, paddingTop: Spacing.md },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  barLabel: { fontSize: 9.5, width: 44, fontWeight: "600" },
  barTrack: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  barValue: { fontSize: 10, width: 22, textAlign: "right", fontWeight: "700" },
  warn: { marginTop: Spacing.md, borderWidth: 1, borderRadius: Radius.sm, padding: Spacing.sm },
  shortRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5 },
});
