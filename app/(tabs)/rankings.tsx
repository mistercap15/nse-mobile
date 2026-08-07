import React, { useMemo, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ConnectionBanner } from "@/components/ConnectionBanner";
import { RegimeBanner, SentimentPanel } from "@/components/Banners";
import { MonthPicker } from "@/components/MonthPicker";
import { StockRow } from "@/components/StockRow";
import {
  EmptyState,
  ErrorState,
  Label,
  Segmented,
  SectionHeader,
  SkeletonList,
  StatCard,
  StatRow,
} from "@/components/ui";
import { useEarlyEntry, useRankings } from "@/lib/queries";
import { useAppStore } from "@/lib/store";
import { MONTH_FULL, num, pct } from "@/lib/format";
import { Spacing, TAB_BAR_CLEARANCE, deltaColor, useColors } from "@/lib/theme";
import type { RankedStock } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Monthly ranked list. This is the template screen — every other data screen
// follows the same shape: controls → StatCards → context banners → list, with
// pull-to-refresh, skeletons and an explicit error state.
// ─────────────────────────────────────────────────────────────────────────────

type Side = "long" | "short";

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export default function RankingsScreen() {
  const c = useColors();
  const month = useAppStore((s) => s.selectedMonth);
  const setMonth = useAppStore((s) => s.setSelectedMonth);
  const [side, setSide] = useState<Side>("long");

  const { data, isLoading, isRefetching, error, refetch } = useRankings(month, "ALL", 50);

  // /api/rankings derives sentiment by calling /api/early-entry internally, and
  // on production that inner call doesn't complete — so the key is simply
  // absent and the panel would never appear. Fall back to the Early Entry
  // query's cache: enabled:false means we read what's already there and never
  // trigger that expensive scan ourselves.
  const cachedEarly = useEarlyEntry(false);
  const sentiment = data?.sentiment ?? cachedEarly.data?.sentiment;

  const list: RankedStock[] = useMemo(() => {
    if (!data) return [];
    return side === "long" ? data.top_stocks ?? [] : data.short_candidates ?? [];
  }, [data, side]);

  const stats = useMemo(() => {
    if (!list.length) return null;
    const wr = mean(list.map((s) => s.win_rate ?? 0));
    const med = mean(list.map((s) => s.median_return ?? 0));
    const significant = list.filter((s) => s.sig?.significant).length;
    return { wr, med, significant, count: list.length };
  }, [list]);

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: TAB_BAR_CLEARANCE }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.accent} />
        }
      >
        <ConnectionBanner />

        <Label>Seasonal edge · {MONTH_FULL[month - 1]}</Label>
        <View style={{ height: Spacing.sm }} />
        <MonthPicker value={month} onChange={setMonth} />

        <View style={{ marginTop: Spacing.md }}>
          <Segmented<Side>
            value={side}
            onChange={setSide}
            options={[
              { value: "long", label: "Longs" },
              { value: "short", label: "Shorts" },
            ]}
          />
        </View>

        {isLoading ? (
          <View style={{ marginTop: Spacing.lg }}>
            <SkeletonList rows={7} />
          </View>
        ) : error ? (
          <ErrorState message={(error as Error).message} onRetry={refetch} />
        ) : (
          <>
            {stats ? (
              <View style={{ marginTop: Spacing.md }}>
                <StatRow>
                  <StatCard label="Candidates" value={num(stats.count)} />
                  <StatCard
                    label="Avg win rate"
                    value={`${stats.wr.toFixed(0)}%`}
                    color={side === "long" ? c.green : c.red}
                  />
                  <StatCard
                    label="Avg median"
                    value={pct(stats.med)}
                    color={deltaColor(c, stats.med)}
                  />
                </StatRow>
                <View style={{ height: Spacing.sm }} />
                <StatRow>
                  <StatCard
                    label="Significant"
                    value={`${stats.significant}/${stats.count}`}
                    sub="t-test p<0.05"
                    color={c.accent}
                  />
                  <StatCard
                    label="Expiry"
                    value={
                      data?.calendar?.expiry ? `${data.calendar.expiry.daysAway}d` : "—"
                    }
                    sub={data?.calendar?.expiry?.date}
                  />
                </StatRow>
              </View>
            ) : null}

            <View style={{ marginTop: Spacing.md }}>
              <RegimeBanner regime={data?.regime} />
              <SentimentPanel sentiment={sentiment} />
            </View>

            <SectionHeader
              title={side === "long" ? "Ranked longs" : "Short candidates"}
              right={
                <Text style={{ color: c.dim, fontSize: 10 }}>
                  ✓ significant · ≈ not
                </Text>
              }
            />

            {list.length === 0 ? (
              <EmptyState
                title={side === "long" ? "No long candidates" : "No short candidates"}
                hint={`Nothing cleared the bar for ${MONTH_FULL[month - 1]}.`}
              />
            ) : (
              <View style={{ gap: Spacing.sm }}>
                {list.map((s, i) => (
                  <StockRow key={s.symbol} stock={s} rank={i + 1} />
                ))}
              </View>
            )}

            {side === "long" && (data?.avoid_stocks?.length ?? 0) > 0 ? (
              <>
                <SectionHeader title="Avoid this month" />
                <View style={{ gap: Spacing.sm }}>
                  {data!.avoid_stocks.map((s) => (
                    <StockRow key={s.symbol} stock={s} />
                  ))}
                </View>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
