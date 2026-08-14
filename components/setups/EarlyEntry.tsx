import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ConnectionBanner } from "@/components/ConnectionBanner";
import { SentimentPanel } from "@/components/Banners";
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
import { useEarlyEntry, useLevels, useUpstoxStatus } from "@/lib/queries";
import { LevelsCard } from "@/components/LevelsCard";
import { DASH, MONTH_FULL, num, pct, rupees } from "@/lib/format";
import { Spacing, useColors, type AppColors } from "@/lib/theme";
import type { EarlyEntryPick, Levels } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Early entry — next month's seasonal picks measured against live price and
// support, with the pre-trade checklist that penalises the raw signal score.
//
// The status shown is the checklist-adjusted one, matching the web: a strong
// seasonal name that fails its checks should not read as a clean BUY.
// ─────────────────────────────────────────────────────────────────────────────

function statusColor(c: AppColors, status: string): string {
  switch (status) {
    case "BUY":      return c.green;
    case "BUY_HALF": return c.accent;
    case "WATCH":    return c.amber;
    case "MONITOR":  return c.soft;
    default:         return c.dim;
  }
}

function resultColor(c: AppColors, result: string): string {
  return result === "PASS" ? c.green : result === "CAUTION" ? c.amber : c.red;
}

function PickCard({ p, levels }: { p: EarlyEntryPick; levels?: Levels | null }) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const tint = statusColor(c, p.status);
  const nearest = p.support?.nearest;

  return (
    <Card stripe={tint} style={{ padding: Spacing.md, paddingLeft: Spacing.md + 4 }}>
      <Pressable onPress={() => setOpen((o) => !o)}>
        <View style={styles.head}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ color: c.text, fontSize: 15, fontWeight: "700" }}>{p.symbol}</Text>
              <Badge text={p.status.replace("_", " ")} color={tint} small />
              <Badge
                text={p.checklist.result}
                color={resultColor(c, p.checklist.result)}
                small
              />
            </View>
            <Text style={{ color: c.dim, fontSize: 10, marginTop: 3 }}>
              {p.sector} · next-month WR {p.nextMonth.win_rate?.toFixed(0)}% ·{" "}
              {p.nextMonth.data_points} pts
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ color: tint, fontSize: 17, fontWeight: "800" }}>
              {p.signal.score?.toFixed(0)}
            </Text>
            <Text style={{ color: c.dim, fontSize: 9 }}>
              {p.signal.scorePenalty ? `−${p.signal.scorePenalty} pen` : "score"}
            </Text>
          </View>
        </View>

        <View style={styles.metrics}>
          <Metric label="Price" value={p.price.current ? rupees(p.price.current) : DASH} />
          <Metric
            label="Support"
            value={nearest ? rupees(nearest.price) : DASH}
            sub={nearest?.type}
          />
          <Metric
            label="To support"
            value={p.support?.distancePct != null ? pct(p.support.distancePct, 1, false) : DASH}
            color={p.support?.isAtSupport ? c.green : undefined}
          />
          <Metric label="Median" value={pct(p.nextMonth.median_return)} color={c.green} />
        </View>
      </Pressable>

      {open ? (
        <View style={[styles.expanded, { borderTopColor: c.border }]}>
          <Text style={{ color: c.soft, fontSize: 11, marginBottom: Spacing.sm, lineHeight: 16 }}>
            {p.checklist.summary} ({p.checklist.passCount}/{p.checklist.totalChecks} checks)
          </Text>

          {p.checklist.checks.map((ck) => (
            <View key={ck.name} style={styles.check}>
              <Text
                style={{
                  color: ck.isInformational
                    ? c.dim
                    : ck.passed
                      ? ck.warning
                        ? c.amber
                        : c.green
                      : c.red,
                  fontSize: 12,
                  width: 16,
                }}
              >
                {ck.isInformational ? "•" : ck.passed ? (ck.warning ? "!" : "✓") : "✕"}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text, fontSize: 11, fontWeight: "600" }}>{ck.name}</Text>
                <Text style={{ color: c.dim, fontSize: 10, marginTop: 1, lineHeight: 14 }}>
                  {ck.detail}
                </Text>
              </View>
            </View>
          ))}

          {/* Early entry previously showed support zones but no levels at all —
              the web page invented its own stop client-side. Both now read the
              shared engine, so this matches Swing Low and Sizing. */}
          <View style={{ marginTop: Spacing.sm }}>
            <LevelsCard levels={levels} title="Levels" compact />
          </View>

          <View style={{ marginTop: Spacing.sm }}>
            <KV k="Current-month WR" v={`${p.currentMonth.win_rate?.toFixed(0)}%`} color={p.currentMonth.is_weak ? c.green : c.amber} />
            <KV k="Momentum" v={p.context ? pct(p.context.momentum) : DASH} />
            <KV k="vs MA20" v={p.context?.pctFromMa20 != null ? pct(p.context.pctFromMa20) : DASH} />
            <KV k="vs MA50" v={p.context?.pctFromMa50 != null ? pct(p.context.pctFromMa50) : DASH} />
            <KV k="From year high" v={p.context ? pct(p.context.pctFromYearHigh) : DASH} color={c.red} />
            <KV k="Lot size" v={num(p.lot_size)} />
          </View>

          {p.price.error ? (
            <Text style={{ color: c.amber, fontSize: 10, marginTop: 8 }}>
              Price note: {p.price.error}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

function Metric({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  const c = useColors();
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: c.dim, fontSize: 9, letterSpacing: 0.4 }}>{label}</Text>
      <Text style={{ color: color ?? c.text, fontSize: 12, fontWeight: "700", marginTop: 2 }}>
        {value}
      </Text>
      {sub ? <Text style={{ color: c.dim, fontSize: 8, marginTop: 1 }}>{sub}</Text> : null}
    </View>
  );
}

export function EarlyEntryPanel() {
  const c = useColors();
  const upstox = useUpstoxStatus();
  const [started, setStarted] = useState(false);
  const { data, isLoading, error, refetch } = useEarlyEntry(started);

  // Levels for every pick, from the shared engine, keyed to the month the scan
  // targets so the seasonal basis matches what the checklist reasoned about.
  const symbols = useMemo(() => (data?.results ?? []).map((r) => r.symbol), [data]);
  const levelsQuery = useLevels(symbols, {
    month: data?.targetMonth,
    enabled: symbols.length > 0,
  });

  return (
    <View>
      <ConnectionBanner />

      <Label>Next-month picks vs live price</Label>
      <Text style={{ color: c.dim, fontSize: 11, marginTop: 6, lineHeight: 16 }}>
        Takes next month&apos;s seasonal candidates and checks where each one actually trades
        relative to its support zones — so you enter before the month turns, not after.
      </Text>

      <View style={{ marginTop: Spacing.md }}>
        <Button
          label={isLoading ? "Scanning…" : started ? "Re-scan" : "Scan next month"}
          onPress={() => (started ? refetch() : setStarted(true))}
          loading={isLoading}
          disabled={!upstox.data?.connected}
        />
      </View>

      {!upstox.data?.connected ? (
        <Text style={{ color: c.dim, fontSize: 11, marginTop: Spacing.sm, lineHeight: 16 }}>
          Needs live prices and daily candles — connect Upstox to scan.
        </Text>
      ) : null}

      {isLoading ? (
        <View style={{ marginTop: Spacing.lg }}>
          <SkeletonScreen stats={3} usedAbove={230} />
        </View>
      ) : error ? (
        <ErrorState message={(error as Error).message} onRetry={refetch} />
      ) : data ? (
        data.message || !data.results?.length ? (
          <EmptyState
            emoji="🌾"
            title="No candidates"
            hint={data.message || "Nothing cleared the 75% win-rate / 5-year bar for next month."}
          />
        ) : (
          <>
            <View style={{ marginTop: Spacing.md }}>
              <StatRow>
                <StatCard label="Buy signals" value={num(data.buySignals)} color={c.green} />
                <StatCard label="Watchlist" value={num(data.watchlist)} color={c.amber} />
                <StatCard label="Candidates" value={num(data.totalCandidates)} />
              </StatRow>
            </View>

            <View style={{ marginTop: Spacing.md }}>
              <SentimentPanel sentiment={data.sentiment} />
            </View>

            <SectionHeader
              title={`${MONTH_FULL[(data.targetMonth ?? 1) - 1]} picks (${data.results.length})`}
            />
            <View style={{ gap: Spacing.sm }}>
              {data.results.map((p) => (
                <PickCard
                  key={p.symbol}
                  p={p}
                  levels={levelsQuery.data?.levels?.[p.symbol]}
                />
              ))}
            </View>
          </>
        )
      ) : (
        <EmptyState
          emoji="🔭"
          title="Not scanned yet"
          hint="Tap Scan next month to check next month's picks against live price and support."
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.sm },
  metrics: { flexDirection: "row", marginTop: Spacing.md, gap: Spacing.xs },
  expanded: { borderTopWidth: 1, marginTop: Spacing.md, paddingTop: Spacing.sm },
  check: { flexDirection: "row", gap: 4, marginBottom: 8, alignItems: "flex-start" },
});
