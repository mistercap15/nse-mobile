import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  Label,
  SectionHeader,
  SkeletonList,
} from "@/components/ui";
import { useStrategies } from "@/lib/queries";
import { currentMonthIST, num } from "@/lib/format";
import { Radius, Spacing, useColors, type AppColors } from "@/lib/theme";
import type { MonthStrategy, RankedStock } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Strategy calendar: one recommendation per month, filtered by the backend for
// 10+ years of data quality. The current month is pinned at the top.
// ─────────────────────────────────────────────────────────────────────────────

function actionColor(c: AppColors, action: string): string {
  switch (action) {
    case "LONG":  return c.green;
    case "SHORT": return c.red;
    case "MIXED": return c.amber;
    default:      return c.dim;
  }
}

function StockPill({ s, side }: { s: RankedStock; side: "long" | "short" }) {
  const c = useColors();
  const router = useRouter();
  const tint = side === "long" ? c.green : c.red;
  return (
    <Pressable
      onPress={() => router.push(`/stock/${s.symbol}` as never)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingVertical: 5,
        paddingHorizontal: 9,
        borderRadius: Radius.sm,
        borderWidth: 1,
        borderColor: tint,
        backgroundColor: side === "long" ? c.greenBg : c.redBg,
      }}
    >
      <Text style={{ color: c.text, fontSize: 11, fontWeight: "700" }}>{s.symbol}</Text>
      <Text style={{ color: tint, fontSize: 10, fontWeight: "600" }}>
        {s.win_rate?.toFixed(0)}%
      </Text>
    </Pressable>
  );
}

function StrategyCard({ s, highlight }: { s: MonthStrategy; highlight?: boolean }) {
  const c = useColors();
  const tint = actionColor(c, s.action);
  const trades = [...(s.longTrades ?? []), ...(s.shortTrades ?? [])];

  return (
    <Card
      style={{
        padding: Spacing.md,
        borderColor: highlight ? tint : c.border,
        borderWidth: highlight ? 1.5 : 1,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={{ color: c.text, fontSize: 15, fontWeight: "700" }}>{s.monthName}</Text>
        <Badge text={s.action} color={tint} small />
        {s.isResultsMonth ? <Badge text="RESULTS" color={c.purple} small /> : null}
        <View style={{ flex: 1 }} />
        <Text style={{ color: c.dim, fontSize: 10 }}>quality {s.qualityScore}</Text>
      </View>

      <Text style={{ color: c.soft, fontSize: 11, marginTop: 7, lineHeight: 16 }}>{s.reason}</Text>

      {s.macroCheck ? (
        <View
          style={{
            marginTop: Spacing.sm,
            padding: Spacing.sm,
            borderRadius: Radius.sm,
            backgroundColor: c.amberBg,
          }}
        >
          <Text style={{ color: c.amber, fontSize: 10, lineHeight: 15 }}>{s.macroCheck}</Text>
        </View>
      ) : null}

      {s.dataQualityWarning ? (
        <Text style={{ color: c.red, fontSize: 10, marginTop: 6 }}>{s.dataQualityWarning}</Text>
      ) : null}

      {trades.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: Spacing.sm }}>
          {s.longTrades?.map((t) => (
            <StockPill key={`L${t.symbol}`} s={t} side="long" />
          ))}
          {s.shortTrades?.map((t) => (
            <StockPill key={`S${t.symbol}`} s={t} side="short" />
          ))}
        </View>
      ) : (
        <Text style={{ color: c.dim, fontSize: 11, marginTop: Spacing.sm }}>
          No high-conviction setups this month.
        </Text>
      )}

      <Text style={{ color: c.dim, fontSize: 9, marginTop: Spacing.sm }}>
        {num(s.totalQualityStocks)} of {num(s.totalScanned)} names cleared the data-quality bar
        {s.dominantSector && s.dominantSector !== "Mixed" ? ` · ${s.dominantSector} led` : ""}
      </Text>
    </Card>
  );
}

export default function SectorRotationScreen() {
  const c = useColors();
  const { data, isLoading, error, refetch } = useStrategies();
  const now = currentMonthIST();

  const strategies = data?.strategies ?? [];
  const current = strategies.find((s) => s.month === now);
  const rest = strategies.filter((s) => s.month !== now);

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: Spacing.md, paddingBottom: Spacing.xxl }}
    >
      <Label>Monthly trade recommendations</Label>
      <Text style={{ color: c.dim, fontSize: 11, marginTop: 6, lineHeight: 16 }}>
        Filtered for names with at least {data?.min_data_points ?? 10} years of history. Long above{" "}
        {data?.long_threshold ?? 75}% win rate, short below {data?.short_threshold ?? 35}%.
      </Text>

      {isLoading ? (
        <View style={{ marginTop: Spacing.lg }}>
          <SkeletonList rows={4} />
        </View>
      ) : error ? (
        <ErrorState message={(error as Error).message} onRetry={refetch} />
      ) : !strategies.length ? (
        <EmptyState title="No strategies" hint="The strategy calendar returned nothing." />
      ) : (
        <>
          {current ? (
            <>
              <SectionHeader title="This month" />
              <StrategyCard s={current} highlight />
            </>
          ) : null}

          <SectionHeader title="The rest of the year" />
          <View style={{ gap: Spacing.sm }}>
            {rest.map((s) => (
              <StrategyCard key={s.month} s={s} />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}
