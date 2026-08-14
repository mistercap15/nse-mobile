import React from "react";
import { Text, View } from "react-native";
import { Spacing, useColors } from "@/lib/theme";
import type { Regime, Sentiment } from "@/lib/types";
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
