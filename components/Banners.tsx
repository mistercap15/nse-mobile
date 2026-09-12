import React from "react";
import { Text, View } from "react-native";
import { Spacing, useColors } from "@/lib/theme";
import type { MarketRegimeResponse, Regime, Sentiment } from "@/lib/types";
import { MoodGauge } from "./MoodGauge";
import { Card, Label } from "./ui";

// ─────────────────────────────────────────────────────────────────────────────
// Market context strips shown above the rankings — the RN counterparts of the
// web's regime and real-time sentiment panels.
// ─────────────────────────────────────────────────────────────────────────────

export function RegimeBanner({ regime }: { regime?: Regime }) {
  const c = useColors();
  if (!regime) return null;

  const tint = regime.riskOn ? c.green : c.red;
  return (
    <Card stripe={tint} tint={tint} style={{ padding: Spacing.md, marginBottom: Spacing.sm, paddingLeft: Spacing.md + 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={{ color: tint, fontWeight: "800", fontSize: 12, letterSpacing: 0.5 }}>
          {regime.label?.toUpperCase()}
        </Text>
        <Text style={{ color: c.dim, fontSize: 11 }}>
          breadth {regime.breadth}% · {regime.pctFromMA > 0 ? "+" : ""}
          {regime.pctFromMA}% vs 10-mo MA
        </Text>
      </View>
      {regime.note ? (
        <Text style={{ color: c.soft, fontSize: 11, marginTop: 5, lineHeight: 16 }}>
          {regime.note}
        </Text>
      ) : null}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Market Mood — the Nifty's own price versus its trailing high, on a dial.
//
// READ-ONLY, AND THE CARD SAYS SO. No pick is filtered, re-sized or re-ordered
// by this; the footer states that in words because a needle sitting in a red
// zone above a list of trades reads as an instruction otherwise.
//
// It is the THIRD context strip on this screen. RegimeBanner is breadth, the
// SentimentPanel is a blended live score, and this is index price versus its own
// drawdown — different measurements that can legitimately disagree, which is why
// the heading names its source.
//
// The dial shows the DRAWDOWN, not the index level, because the drawdown is the
// thing with a scale and zones; the Nifty level itself is printed as plain text
// beside it. Layout stays wrap-first with no fixed widths — the earlier overflow
// bug on this app came from a header row that assumed it fit on one line.
// ─────────────────────────────────────────────────────────────────────────────

export function MarketMoodCard({ mood }: { mood?: MarketRegimeResponse }) {
  const c = useColors();
  if (!mood) return null;

  const label = mood.regime_label ?? "Unknown";
  const known = label !== "Unknown";
  const tint =
    label === "Healthy" ? c.green : label === "Caution" ? c.amber : label === "Correction" ? c.red : c.dim;

  // null = "not enough history for this MA", which must not be painted as a
  // bearish `false`.
  const maTint = (above: boolean | null) => (above === null ? c.dim : above ? c.green : c.red);
  const maWord = (above: boolean | null) => (above === null ? "n/a" : above ? "above" : "below");

  const Pill = ({ text, above }: { text: string; above: boolean | null }) => (
    <View
      style={{
        borderWidth: 1,
        borderColor: `${maTint(above)}59`,
        borderRadius: 6,
        paddingHorizontal: 7,
        paddingVertical: 2.5,
      }}
    >
      <Text style={{ color: maTint(above), fontSize: 10 }}>
        {maWord(above)} {text}
      </Text>
    </View>
  );

  return (
    <Card
      stripe={tint}
      tint={known ? tint : undefined}
      style={{ padding: Spacing.md, marginBottom: Spacing.sm, paddingLeft: Spacing.md + 4 }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Label>Market mood · Nifty price</Label>
        <Text style={{ color: tint, fontWeight: "800", fontSize: 12, letterSpacing: 0.5 }}>
          {label.toUpperCase()}
        </Text>
      </View>

      <View style={{ marginTop: Spacing.sm }}>
        <MoodGauge
          pctOffHigh={mood.pct_off_high}
          label={label}
          caption={known ? `off ${mood.window_sessions}-session high` : undefined}
        />
      </View>

      {/* The level and the high, under the dial. The gauge answers "how far
          down"; these answer "down from what", which the arc cannot show. */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          marginTop: 2,
        }}
      >
        <Text style={{ color: c.text, fontSize: 13, fontWeight: "700" }}>
          {known && mood.nifty_price !== null
            ? mood.nifty_price.toLocaleString("en-IN", { maximumFractionDigits: 0 })
            : "—"}
        </Text>
        {known && mood.trailing_high !== null ? (
          <Text style={{ color: c.dim, fontSize: 11, flexShrink: 1 }}>
            high {mood.trailing_high.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </Text>
        ) : null}
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
          <Pill text="50 DMA" above={mood.above_50dma} />
          <Pill text="200 DMA" above={mood.above_200dma} />
        </View>
      </View>

      {known && mood.historical_context ? (
        <Text style={{ color: c.soft, fontSize: 11, marginTop: 10, lineHeight: 16 }}>
          {mood.historical_context}
        </Text>
      ) : (
        <Text style={{ color: c.dim, fontSize: 11, marginTop: 10, lineHeight: 16 }}>
          {mood.error ?? "Nifty data unavailable."}
        </Text>
      )}

      <Text style={{ color: c.dim, fontSize: 10, marginTop: 6, lineHeight: 14 }}>
        {known ? `${mood.caveat} ` : ""}Context only — no pick below is filtered or re-sized by it.
      </Text>
    </Card>
  );
}

const FACTOR_LABELS: Record<string, string> = {
  priceAction: "Price action",
  breadth: "Breadth",
  bidAskSpread: "Spreads",
  volume: "Volume",
  volatility: "Volatility",
};

export function SentimentPanel({ sentiment }: { sentiment?: Sentiment }) {
  const c = useColors();
  if (!sentiment) return null;

  const bullish = sentiment.bullishScore ?? 50;
  const tint = bullish >= 60 ? c.green : bullish <= 40 ? c.red : c.amber;

  return (
    <Card style={{ padding: Spacing.md, marginBottom: Spacing.sm }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Label>Market sentiment</Label>
        <Text style={{ color: c.dim, fontSize: 10 }}>
          {sentiment.marketOpen ? "LIVE" : "CLOSED"} · {sentiment.confidence} confidence
        </Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 8 }}>
        <Text style={{ color: tint, fontSize: 20, fontWeight: "800" }}>{sentiment.sentiment}</Text>
        <Text style={{ color: c.dim, fontSize: 11 }}>
          {bullish}% bull / {sentiment.bearishScore}% bear
        </Text>
      </View>

      {/* Bull/bear split bar */}
      <View
        style={{
          height: 5,
          borderRadius: 3,
          backgroundColor: c.red,
          overflow: "hidden",
          marginTop: 9,
          flexDirection: "row",
        }}
      >
        <View style={{ width: `${Math.max(0, Math.min(100, bullish))}%`, backgroundColor: c.green }} />
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
        {Object.entries(sentiment.factors ?? {}).map(([k, v]) => (
          <View key={k} style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
            <Text style={{ color: c.dim, fontSize: 10 }}>{FACTOR_LABELS[k] ?? k}</Text>
            <Text
              style={{
                color: v == null ? c.muted : v >= 60 ? c.green : v <= 40 ? c.red : c.soft,
                fontSize: 10,
                fontWeight: "700",
              }}
            >
              {v == null ? "—" : v}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}
