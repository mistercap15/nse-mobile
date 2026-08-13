import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Badge, Card, KV, Label } from "@/components/ui";
import { DASH, num, pct, rupees } from "@/lib/format";
import { Radius, Spacing, useColors } from "@/lib/theme";
import type { Levels } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Suggested entry / stop / target, straight from the backend's shared engine.
//
// Every number carries its basis, because the honest answer to "why this stop?"
// is the level it hides behind. The two strategies deliberately differ on the
// TARGET only — the stop rule is identical, which is the whole point of routing
// all three screens through one engine.
// ─────────────────────────────────────────────────────────────────────────────

const STOP_BASIS_LABEL: Record<string, string> = {
  MA10: "below the 10-day average",
  MA20: "below the 20-day average",
  MA50: "below the 50-day average",
  PREV_MONTH_LOW: "below last month's low",
  "52W_LOW": "below the 52-week low",
  SWING_LOW: "below a swing low",
  FLOOR: "below the support floor",
  SEASONAL_WORST: "from the seasonal worst case",
  FALLBACK: "flat 7% (no structure found)",
};

const TARGET_BASIS_LABEL: Record<string, string> = {
  SEASONAL_MEDIAN: "median return for the month",
  MEAN_REVERSION: "reversion to the mean (MA200)",
};

export function LevelsCard({
  levels,
  title = "Suggested trade",
  compact = false,
}: {
  levels: Levels | null | undefined;
  title?: string;
  compact?: boolean;
}) {
  const c = useColors();

  if (!levels) {
    return (
      <Card style={{ padding: Spacing.md }}>
        <Label>{title}</Label>
        <Text style={{ color: c.dim, fontSize: 11, marginTop: 8, lineHeight: 16 }}>
          {DASH} Entry, stop and target need live prices from Upstox. Seasonality above is
          unaffected.
        </Text>
      </Card>
    );
  }

  const { entry, stop, target, riskReward } = levels;
  const rrColor = riskReward == null ? c.dim : riskReward >= 2 ? c.green : riskReward >= 1 ? c.amber : c.red;

  return (
    <Card style={{ padding: Spacing.md }}>
      <View style={styles.head}>
        <Label>{title}</Label>
        <Badge
          text={levels.strategy === "reversion" ? "MEAN REVERSION" : "SEASONAL"}
          color={levels.strategy === "reversion" ? c.purple : c.accent}
          small
        />
      </View>

      <View style={styles.row}>
        <Level label="Entry" value={rupees(entry.price)} color={c.text} sub={entry.basis} />
        <Level
          label="Stop"
          value={rupees(stop.price)}
          color={c.red}
          sub={pct(-stop.pct, 1, false)}
        />
        <Level
          label="Target"
          value={target ? rupees(target.price) : DASH}
          color={target ? c.green : c.dim}
          sub={target ? pct(target.pct) : undefined}
        />
        <Level
          label="R:R"
          value={riskReward != null ? `${riskReward.toFixed(1)}×` : DASH}
          color={rrColor}
          sub={riskReward != null && riskReward >= 2 ? "favourable" : undefined}
        />
      </View>

      {!compact ? (
        <View style={[styles.detail, { borderTopColor: c.border }]}>
          <KV
            k="Stop sits"
            v={`${STOP_BASIS_LABEL[stop.basis] ?? stop.basis}${
              stop.anchorPrice ? ` (${rupees(stop.anchorPrice)})` : ""
            }`}
          />
          {target ? (
            <KV
              k="Target from"
              v={`${TARGET_BASIS_LABEL[target.basis] ?? target.basis}${
                target.capped ? " · capped at +30%" : ""
              }`}
            />
          ) : null}
          {levels.averageIn ? (
            <KV k="Average-in" v={rupees(levels.averageIn)} color={c.amber} />
          ) : null}
          {levels.riskAmount != null ? (
            <KV k="Risk at stop" v={rupees(levels.riskAmount)} color={c.red} />
          ) : null}
          {levels.rewardAmount != null ? (
            <KV k="Reward at target" v={rupees(levels.rewardAmount)} color={c.green} />
          ) : null}
          {levels.lotSize ? <KV k="Lot size" v={num(levels.lotSize)} /> : null}
        </View>
      ) : null}

      {/* Risk check — a structural stop that costs more than the month usually
          does is a smaller position, not a tighter stop. */}
      {stop.exceedsSeasonalRisk ? (
        <View style={[styles.warn, { borderColor: c.amber, backgroundColor: c.amberBg }]}>
          <Text style={{ color: c.amber, fontSize: 10, lineHeight: 15 }}>
            Risking {stop.pct}% to hold this level, against a {stop.seasonalRiskNormPct}% seasonal
            norm — size down rather than moving the stop up.
          </Text>
        </View>
      ) : null}

      {levels.warnings?.length && !compact ? (
        <View style={{ marginTop: Spacing.sm, gap: 3 }}>
          {levels.warnings.map((w, i) => (
            <Text key={i} style={{ color: c.dim, fontSize: 10, lineHeight: 15 }}>
              · {w}
            </Text>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

function Level({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: string;
  color: string;
  sub?: string;
}) {
  const c = useColors();
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: c.dim, fontSize: 9, letterSpacing: 0.4 }}>{label}</Text>
      <Text style={{ color, fontSize: 13, fontWeight: "700", marginTop: 2 }}>{value}</Text>
      {sub ? (
        <Text numberOfLines={1} style={{ color: c.dim, fontSize: 8, marginTop: 1 }}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  row: { flexDirection: "row", marginTop: Spacing.md, gap: Spacing.xs },
  detail: { borderTopWidth: 1, marginTop: Spacing.md, paddingTop: Spacing.sm },
  warn: {
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
  },
});
