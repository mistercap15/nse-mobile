import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { ConnectionBanner } from "@/components/ConnectionBanner";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  KV,
  Label,
  SectionHeader,
  Segmented,
  SkeletonList,
  StatCard,
  StatRow,
} from "@/components/ui";
import { useSwingLow, useUpstoxStatus } from "@/lib/queries";
import { DASH, num, pct, rupees, sampleNote } from "@/lib/format";
import { Radius, Spacing, deltaColor, tierColor, useColors } from "@/lib/theme";
import type { SwingLowStock } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Swing-low mean-reversion screener.
//
// The scan reads ~3yr of daily candles for the whole F&O universe, so it is
// explicitly user-triggered rather than running on mount — the backend caches
// the result for the rest of the trading day.
//
// Sample sizes are shown inline (n=…) on every stat that has one: a 100% bounce
// rate off two touches is not the same claim as 70% off twelve, and the tier
// already encodes that distinction.
// ─────────────────────────────────────────────────────────────────────────────

type Bucket = "at" | "approaching";

function SwingRow({ s }: { s: SwingLowStock }) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const tint = tierColor(c, s.tier);

  return (
    <Card style={{ padding: Spacing.md }}>
      <Pressable onPress={() => setOpen((o) => !o)}>
        <View style={styles.head}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ color: c.text, fontSize: 15, fontWeight: "700" }}>{s.symbol}</Text>
              <Badge text={s.tier?.toUpperCase()} color={tint} small />
              {s.inSeason ? <Badge text="IN SEASON" color={c.purple} small /> : null}
            </View>
            <Text style={{ color: c.dim, fontSize: 10, marginTop: 3 }}>
              {s.sector} · RSI {s.rsi?.toFixed(0)} ·{" "}
              {s.floor ? `${s.floor.touches} touches` : "no floor"}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ color: tint, fontSize: 17, fontWeight: "800" }}>
              {s.score?.toFixed(0)}
            </Text>
            <Text style={{ color: c.dim, fontSize: 9 }}>score</Text>
          </View>
        </View>

        <View style={styles.metrics}>
          <Metric label="Price" value={rupees(s.price)} color={c.text} />
          <Metric
            label="To floor"
            value={pct(s.distToFloorPct, 1, false)}
            color={s.inZone ? c.green : c.soft}
          />
          <Metric
            label="R:R"
            value={s.rr ? `${s.rr.ratio.toFixed(1)}×` : DASH}
            color={s.rr && s.rr.ratio >= 2 ? c.green : c.soft}
          />
          <Metric
            label="Bounce"
            value={s.bounceRate != null ? `${s.bounceRate.toFixed(0)}%` : DASH}
            sub={sampleNote(s.bounceSamples)}
            color={deltaColor(c, s.bounceRate != null ? s.bounceRate - 50 : null)}
          />
        </View>
      </Pressable>

      {open ? (
        <View style={[styles.expanded, { borderTopColor: c.border }]}>
          <KV
            k="Support band"
            v={s.floor ? `${rupees(s.floor.low)} – ${rupees(s.floor.high)}` : DASH}
          />
          <KV k="Floor touches" v={s.floor ? num(s.floor.touches) : DASH} />
          <KV k="Target (capped +30%)" v={s.rr ? rupees(s.rr.target) : DASH} color={c.green} />
          <KV k="Stop (below floor)" v={s.rr ? rupees(s.rr.stop) : DASH} color={c.red} />
          <KV k="Upside" v={s.rr ? pct(s.rr.upsidePct) : DASH} color={c.green} />
          <KV k="Downside" v={s.rr ? pct(-Math.abs(s.rr.downsidePct)) : DASH} color={c.red} />
          <KV k="Drawdown from high" v={pct(-Math.abs(s.drawdownFromHighPct))} color={c.red} />
          <KV k="MA200" v={s.ma200 ? rupees(s.ma200) : DASH} />
          <KV
            k="Avg bounce size"
            v={s.bounceAvgPct != null ? pct(s.bounceAvgPct) : DASH}
            color={c.green}
          />
          <KV
            k="Next-month seasonality"
            v={
              s.seasonalWR != null
                ? `${s.seasonalWR}% WR (${sampleNote(s.seasonalN)})`
                : DASH
            }
          />
          <KV k="Lot size" v={s.lotSize ? num(s.lotSize) : DASH} />
          {s.reasons?.length ? (
            <Text style={{ color: c.soft, fontSize: 10, marginTop: 8, lineHeight: 15 }}>
              {s.reasons.join(" · ")}
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
  color: string;
}) {
  const c = useColors();
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: c.dim, fontSize: 9, letterSpacing: 0.4 }}>{label}</Text>
      <Text style={{ color, fontSize: 12, fontWeight: "700", marginTop: 2 }}>{value}</Text>
      {sub ? <Text style={{ color: c.dim, fontSize: 8, marginTop: 1 }}>{sub}</Text> : null}
    </View>
  );
}

export function SwingLowPanel() {
  const c = useColors();
  const upstox = useUpstoxStatus();
  const [scanning, setScanning] = useState(false);
  const [bucket, setBucket] = useState<Bucket>("at");

  // Filters
  const [sector, setSector] = useState<string>("ALL");
  const [minRR, setMinRR] = useState(0);
  const [minTouches, setMinTouches] = useState(0);
  const [inSeasonOnly, setInSeasonOnly] = useState(false);

  const { data, isLoading, error, refetch } = useSwingLow(scanning);

  const rows = useMemo(() => {
    const src = bucket === "at" ? data?.atSwingLow ?? [] : data?.approaching ?? [];
    return src.filter((s) => {
      if (sector !== "ALL" && s.sector !== sector) return false;
      if (minRR > 0 && (!s.rr || s.rr.ratio < minRR)) return false;
      if (minTouches > 0 && (!s.floor || s.floor.touches < minTouches)) return false;
      if (inSeasonOnly && !s.inSeason) return false;
      return true;
    });
  }, [data, bucket, sector, minRR, minTouches, inSeasonOnly]);

  const sectors = useMemo(() => {
    const all = [...(data?.atSwingLow ?? []), ...(data?.approaching ?? [])];
    return ["ALL", ...Array.from(new Set(all.map((s) => s.sector))).sort()];
  }, [data]);

  const primeCount = (data?.atSwingLow ?? []).filter((s) => s.tier === "Prime").length;

  return (
    <View>
      <ConnectionBanner />

      <Label>Mean reversion at a proven floor</Label>
      <Text style={{ color: c.dim, fontSize: 11, marginTop: 6, lineHeight: 16 }}>
        Scans the whole F&amp;O universe for stocks sitting on a multi-touch support band while
        oversold. The first scan of the day does real work; later ones are instant.
      </Text>

      <View style={{ marginTop: Spacing.md, flexDirection: "row", gap: Spacing.sm }}>
        <Button
          label={isLoading ? "Scanning…" : scanning ? "Re-scan" : "Scan universe"}
          onPress={() => (scanning ? refetch() : setScanning(true))}
          loading={isLoading}
          disabled={!upstox.data?.connected}
        />
      </View>

      {!upstox.data?.connected ? (
        <Text style={{ color: c.dim, fontSize: 11, marginTop: Spacing.sm, lineHeight: 16 }}>
          This screener needs live daily candles, so it&apos;s the one screen that can&apos;t run
          without Upstox. Connect above to scan.
        </Text>
      ) : null}

      {isLoading ? (
        <View style={{ marginTop: Spacing.lg }}>
          <Text style={{ color: c.dim, fontSize: 11, marginBottom: Spacing.sm }}>
            Reading ~3 years of candles across the universe — this can take a minute.
          </Text>
          <SkeletonList rows={5} />
        </View>
      ) : error ? (
        <ErrorState message={(error as Error).message} onRetry={refetch} />
      ) : data ? (
        <>
          <View style={{ marginTop: Spacing.md }}>
            <StatRow>
              <StatCard
                label="⭐ Prime"
                value={num(primeCount)}
                sub="proven floor + R:R≥2"
                color={c.green}
              />
              <StatCard label="At floor" value={num(data.atSwingLow?.length)} />
              <StatCard label="Approaching" value={num(data.approaching?.length)} />
            </StatRow>
            <View style={{ height: Spacing.sm }} />
            <StatRow>
              <StatCard
                label="Scanned"
                value={`${num(data.scanned)}/${num(data.universeSize)}`}
                sub={data.cached ? "cached today" : "fresh scan"}
              />
              <StatCard label="Next month" value={data.nextMonthName ?? DASH} sub="seasonality lens" />
            </StatRow>
          </View>

          <View style={{ marginTop: Spacing.md }}>
            <Segmented<Bucket>
              value={bucket}
              onChange={setBucket}
              options={[
                { value: "at", label: `At floor (${data.atSwingLow?.length ?? 0})` },
                { value: "approaching", label: `Approaching (${data.approaching?.length ?? 0})` },
              ]}
            />
          </View>

          {/* Filters */}
          <View style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {sectors.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setSector(s)}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 11,
                      borderRadius: Radius.sm,
                      borderWidth: 1,
                      borderColor: sector === s ? c.accent : c.border,
                      backgroundColor: sector === s ? c.accentBg : c.card,
                    }}
                  >
                    <Text style={{ color: sector === s ? c.accent : c.soft, fontSize: 11 }}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <View style={{ flexDirection: "row", gap: Spacing.sm, alignItems: "center" }}>
              <FilterStepper label="Min R:R" value={minRR} step={0.5} onChange={setMinRR} suffix="×" />
              <FilterStepper label="Min touches" value={minTouches} step={1} onChange={setMinTouches} />
            </View>

            <View style={styles.switchRow}>
              <Text style={{ color: c.soft, fontSize: 12 }}>In season only</Text>
              <Switch
                value={inSeasonOnly}
                onValueChange={setInSeasonOnly}
                trackColor={{ true: c.accent, false: c.muted }}
              />
            </View>
          </View>

          <SectionHeader title={`${rows.length} setup${rows.length === 1 ? "" : "s"}`} />

          {rows.length === 0 ? (
            <EmptyState
              title="Nothing matches"
              hint="Loosen the filters, or check the other bucket."
            />
          ) : (
            <View style={{ gap: Spacing.sm }}>
              {rows.map((s) => (
                <SwingRow key={s.symbol} s={s} />
              ))}
            </View>
          )}
        </>
      ) : (
        <EmptyState
          title="Not scanned yet"
          hint="Tap Scan universe to look for stocks sitting on a proven support floor."
        />
      )}
    </View>
  );
}

function FilterStepper({
  label,
  value,
  step,
  onChange,
  suffix = "",
}: {
  label: string;
  value: number;
  step: number;
  onChange: (n: number) => void;
  suffix?: string;
}) {
  const c = useColors();
  return (
    <View
      style={[styles.stepper, { borderColor: c.border, backgroundColor: c.card }]}
    >
      <Text style={{ color: c.dim, fontSize: 10, flex: 1 }}>{label}</Text>
      <Pressable onPress={() => onChange(Math.max(0, value - step))} hitSlop={8}>
        <Text style={{ color: c.accent, fontSize: 16, fontWeight: "700", paddingHorizontal: 6 }}>−</Text>
      </Pressable>
      <Text style={{ color: c.text, fontSize: 12, fontWeight: "700", minWidth: 30, textAlign: "center" }}>
        {value === 0 ? "any" : `${value}${suffix}`}
      </Text>
      <Pressable onPress={() => onChange(value + step)} hitSlop={8}>
        <Text style={{ color: c.accent, fontSize: 16, fontWeight: "700", paddingHorizontal: 6 }}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.sm },
  metrics: { flexDirection: "row", marginTop: Spacing.md, gap: Spacing.xs },
  expanded: { borderTopWidth: 1, marginTop: Spacing.md, paddingTop: Spacing.sm },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stepper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 2,
  },
});
