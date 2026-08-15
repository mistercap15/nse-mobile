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
import type { PlaybookPick, PromoterActivity, QualifierFlag, RejectedPick } from "@/lib/types";

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

const FLAG_ICONS: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
  earnings: "podium-outline",
  earnings_estimated: "podium-outline",
  dividend: "cash-outline",
  fundraise: "trending-up-outline",
  corporate_action: "git-branch-outline",
  board_meeting: "people-outline",
  stake_falling: "trending-down-outline",
};

/**
 * Warnings from the qualifier layer — things the conviction score can't see.
 *
 * Amber rather than red on purpose: none of these blocks the trade. An earnings
 * date inside the hold is a legitimate trade whose risk simply isn't the one
 * the stop describes, and the card should say so instead of implying the stop
 * covers it.
 */
function FlagChips({ flags }: { flags?: QualifierFlag[] }) {
  const c = useColors();
  const warnings = (flags ?? []).filter((f) => f.level === "warn");
  if (!warnings.length) return null;

  return (
    <View style={{ gap: 5, marginTop: Spacing.sm }}>
      {warnings.map((f, i) => (
        <View
          key={`${f.code}-${i}`}
          style={[styles.flag, { backgroundColor: c.amberBg, borderColor: `${c.amber}44` }]}
        >
          <Ionicons name={FLAG_ICONS[f.code] ?? "alert-circle-outline"} size={11} color={c.amber} />
          <Text style={{ color: c.amber, fontSize: 10, flex: 1, lineHeight: 14 }}>{f.message}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Recent promoter dealing. Shown, never scored.
 *
 * NSE's insider archive can't be queried backwards consistently — the same
 * company returns hundreds of filings for one year and none for another — so
 * there is no history to calibrate a weight against. It stays context until
 * forward-collected snapshots build that history.
 */
function PromoterNote({ p }: { p?: PromoterActivity | null }) {
  const c = useColors();
  if (!p) return null;

  const bullish = p.netValue > 0 || p.revoked > 0;
  const tint = bullish ? c.green : p.netValue < 0 ? c.red : c.dim;
  const parts: string[] = [];
  if (p.buys) parts.push(`${p.buys} open-market ${p.buys === 1 ? "buy" : "buys"} (${rupeesCompact(p.buyValue)})`);
  if (p.sells) parts.push(`${p.sells} ${p.sells === 1 ? "sale" : "sales"} (${rupeesCompact(p.sellValue)})`);
  if (p.revoked) parts.push(`${p.revoked} pledge ${p.revoked === 1 ? "release" : "releases"}`);
  if (p.pledged) parts.push(`${p.pledged} new ${p.pledged === 1 ? "pledge" : "pledges"}`);
  if (!parts.length) return null;

  return (
    <View style={{ marginTop: Spacing.md }}>
      <Label style={{ fontSize: 9.5 }}>Promoter activity</Label>
      <View style={{ flexDirection: "row", gap: 7, marginTop: 6, alignItems: "flex-start" }}>
        <Ionicons name="person-circle-outline" size={13} color={tint} style={{ marginTop: 1 }} />
        <Text style={{ color: c.soft, fontSize: 11, flex: 1, lineHeight: 16 }}>
          {parts.join(" · ")} in the last {p.windowDays} days.
        </Text>
      </View>
      <Text style={{ color: c.dim, fontSize: 9.5, marginTop: 5, lineHeight: 13.5 }}>
        Context only — this doesn&apos;t affect the conviction score or your lot size.
      </Text>
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

        <FlagChips flags={pick.flags} />

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

          <PromoterNote p={pick.promoter} />

          <View style={{ marginTop: Spacing.md }}>
            <KV k="Stop sits under" v={lv ? lv.stop.basis.replace(/_/g, " ").toLowerCase() : DASH} />
            <KV
              k="Risk : reward"
              v={lv?.riskReward != null ? `${lv.riskReward.toFixed(1)}×` : DASH}
              color={lv?.riskReward != null && lv.riskReward >= 2 ? c.green : c.amber}
            />
            <KV
              k="Risk per lot"
              v={`${rupees(pick.riskPerLot)} · ${pick.riskPerLotPct}% of capital`}
              color={c.red}
            />
            <KV k="Risk at this size" v={pick.lots ? rupees(pick.riskAmount) : DASH} color={c.red} />
            <KV k="Size limited by" v={pick.cappedBy} />
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
              <Text style={{ color: c.amber, fontSize: 10.5, fontWeight: "700" }}>
                {pick.tooRisky ? "Too big for your account" : "No capital left"}
              </Text>
              <Text style={{ color: c.soft, fontSize: 10, lineHeight: 15, marginTop: 4 }}>
                {pick.tooRisky
                  ? `One lot risks ${rupees(pick.riskPerLot)} — ${pick.riskPerLotPct}% of your capital, above your ${pick.levels ? "" : ""}limit. Sizing this properly needs about ${rupeesCompact(pick.capitalNeededForOneLot ?? 0)}.`
                  : `Capped by ${pick.cappedBy}. One lot needs ${rupees(pick.lotCost)} of margin.`}
              </Text>
            </View>
          ) : pick.lots < pick.wantedLots ? (
            <Text style={{ color: c.dim, fontSize: 10, marginTop: Spacing.md, lineHeight: 15 }}>
              Conviction earned {pick.wantedLots} lots; {pick.cappedBy} allowed {pick.lots}.
            </Text>
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

/**
 * A candidate that didn't make the cut, shown with the plan it would have been.
 *
 * Styled to read as "not this one" at a glance and never be mistaken for a
 * trade: a dashed border rather than solid, no conviction colour, no elevation,
 * flat surface, and the numbers in muted grey instead of the red/green the real
 * cards use. The blocking reason is the only thing here with any colour.
 */
function RejectedCard({ pick }: { pick: RejectedPick }) {
  const c = useColors();
  const isDark = useIsDark();
  const [open, setOpen] = useState(false);
  const lv = pick.levels;

  return (
    <Pressable
      onPress={() => setOpen((o) => !o)}
      style={({ pressed }) => [
        styles.rejected,
        {
          borderColor: c.border,
          backgroundColor: isDark ? "transparent" : c.surface,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
        <View style={[styles.rejectedMark, { borderColor: c.border }]}>
          <Ionicons name="close" size={12} color={c.dim} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: c.soft, fontSize: 13.5, fontWeight: "700" }}>{pick.symbol}</Text>
          <Text numberOfLines={1} style={{ color: c.dim, fontSize: 9.5, marginTop: 2 }}>
            {pick.sector ?? "—"}
            {pick.lotSize ? ` · lot ${num(pick.lotSize)}` : ""}
          </Text>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ color: c.dim, fontSize: 14, fontWeight: "700", ...Type.numeric }}>
            {pick.conviction.toFixed(0)}
          </Text>
          <Text style={{ color: c.dim, fontSize: 8, letterSpacing: 0.5 }}>SCORE</Text>
        </View>
      </View>

      {/* The plan it would have been — same four numbers, all in grey. */}
      {lv ? (
        <View style={[styles.rejectedLevels, { borderTopColor: c.border }]}>
          <MutedLevel label="Would enter" value={rupees(lv.entry.price)} />
          <MutedLevel label="Stop" value={rupees(lv.stop.price)} sub={pct(-lv.stop.pct, 1, false)} />
          <MutedLevel
            label="Target"
            value={lv.target ? rupees(lv.target.price) : DASH}
            sub={lv.target ? pct(lv.target.pct) : undefined}
          />
          <MutedLevel
            label="R:R"
            value={lv.riskReward != null ? `${lv.riskReward.toFixed(1)}×` : DASH}
          />
        </View>
      ) : null}

      {/* The one thing that gets colour: why it was dropped. */}
      <View style={{ flexDirection: "row", gap: 6, marginTop: Spacing.sm, alignItems: "flex-start" }}>
        <Ionicons name="ban-outline" size={11} color={c.amber} style={{ marginTop: 1 }} />
        <Text style={{ color: c.amber, fontSize: 10.5, flex: 1, lineHeight: 15 }}>
          {pick.why.join(" · ")}
        </Text>
      </View>

      {open && pick.components ? (
        <View style={{ marginTop: Spacing.md }}>
          <Label style={{ fontSize: 9 }}>Where it fell short</Label>
          <View style={{ marginTop: Spacing.sm, opacity: 0.65 }}>
            <ConvictionBars components={pick.components} />
          </View>
          {lv?.stop?.basis ? (
            <Text style={{ color: c.dim, fontSize: 9.5, marginTop: Spacing.sm, lineHeight: 14 }}>
              Stop would have sat {lv.stop.basis.replace(/_/g, " ").toLowerCase()}.
            </Text>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

function MutedLevel({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const c = useColors();
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: c.dim, fontSize: 8, letterSpacing: 0.4 }}>{label.toUpperCase()}</Text>
      <Text style={{ color: c.soft, fontSize: 12, fontWeight: "700", marginTop: 2, ...Type.numeric }}>
        {value}
      </Text>
      {sub ? <Text style={{ color: c.dim, fontSize: 8, marginTop: 1 }}>{sub}</Text> : null}
    </View>
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

  const { data, isLoading, error, refetch } = usePlaybook(month, sizing, 6, started);

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
                { label: "At risk", value: rupeesCompact(cap.totalRisk), color: c.red },
                { label: "Of capital", value: `${cap.riskPctOfCapital}%`, color: c.amber },
                { label: "Budget used", value: `${cap.riskBudgetUsedPct}%`, color: c.accent },
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
              {/* Risk leads. "% deployed" is a leveraged number — ₹3L of margin
                  can carry ₹37L of contract — so it reads as spare capacity
                  when the account is already fully committed on risk. */}
              <StatRow>
                <StatCard
                  label="Risk if all stop"
                  value={rupees(cap.totalRisk)}
                  sub={`${cap.riskPctOfCapital}% of capital`}
                  color={c.red}
                />
                <StatCard
                  label="Risk budget"
                  value={`${cap.riskBudgetUsedPct}%`}
                  sub={`${rupeesCompact(cap.riskBudgetLeft)} left of ${rupeesCompact(cap.portfolioBudget)}`}
                  color={cap.riskBudgetUsedPct >= 90 ? c.amber : c.accent}
                />
                <StatCard
                  label="Reward if all hit"
                  value={rupees(cap.totalReward)}
                  color={c.green}
                />
              </StatRow>
              <View style={{ height: Spacing.sm }} />
              <StatRow>
                <StatCard label="Margin used" value={rupeesCompact(cap.deployed)} sub={`of ${rupeesCompact(cap.usable)} usable`} />
                <StatCard
                  label="Exposure"
                  value={rupeesCompact(cap.notional)}
                  sub={cap.deployed ? `${(cap.notional / cap.deployed).toFixed(1)}× leverage` : "contract notional"}
                  color={c.purple}
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
              <SectionHeader icon="close-circle" tint={c.dim} title="Considered but rejected" />
              <Text style={{ color: c.dim, fontSize: 10.5, lineHeight: 15, marginBottom: Spacing.sm }}>
                Scored, priced, then dropped at a gate. The plan each would have been is here so you
                can judge the call rather than take it on trust — but these are not trades to take.
              </Text>
              <View style={{ gap: Spacing.sm }}>
                {data.rejected.slice(0, 8).map((r) => (
                  <RejectedCard key={r.symbol} pick={r} />
                ))}
              </View>
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
  flag: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  expanded: { borderTopWidth: 1, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, paddingTop: Spacing.md },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  barLabel: { fontSize: 9.5, width: 44, fontWeight: "600" },
  barTrack: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  barValue: { fontSize: 10, width: 22, textAlign: "right", fontWeight: "700" },
  warn: { marginTop: Spacing.md, borderWidth: 1, borderRadius: Radius.sm, padding: Spacing.sm },
  shortRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5 },
  // Dashed and flat on purpose: it should never be mistaken for a pick.
  rejected: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  rejectedMark: {
    width: 26,
    height: 26,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  rejectedLevels: {
    flexDirection: "row",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
});
