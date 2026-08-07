import React, { useState } from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { BarChart, LineChart } from "@/components/charts";
import {
  Card,
  ErrorState,
  KV,
  Label,
  SectionHeader,
  Segmented,
  SkeletonScreen,
  StatCard,
  StatRow,
} from "@/components/ui";
import { useBacktest } from "@/lib/queries";
import { num, pct } from "@/lib/format";
import { Radius, Spacing, deltaColor, useColors } from "@/lib/theme";
import type { BacktestStats } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Backtest over the monthly snapshot. Equity curve against the benchmark, the
// headline risk metrics, and the yearly breakdown.
//
// The benchmark is shown next to every stat on purpose: a 20% CAGR only means
// something relative to what buying the universe would have returned anyway.
// ─────────────────────────────────────────────────────────────────────────────

type Direction = "long" | "short";
const TOP_N = [3, 5, 10];
const START_YEARS = [2010, 2015, 2020];

export default function BacktestScreen() {
  const c = useColors();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [direction, setDirection] = useState<Direction>("long");
  const [topN, setTopN] = useState(5);
  const [startYear, setStartYear] = useState(2015);

  const { data, isLoading, error, refetch } = useBacktest(
    { direction, topN, startYear },
    true,
  );

  const chartWidth = width - Spacing.md * 2 - 2 - Spacing.md * 2;
  const stats = data?.stats;
  const bench = data?.benchStats;

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: Spacing.md, paddingBottom: Spacing.xxl }}
    >
      <Label>Seasonal system vs benchmark</Label>

      <View style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
        <Segmented<Direction>
          value={direction}
          onChange={setDirection}
          options={[
            { value: "long", label: "Long" },
            { value: "short", label: "Short" },
          ]}
        />

        <View>
          <Label style={{ fontSize: 10 }}>Top N per month</Label>
          <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
            {TOP_N.map((n) => (
              <Chip key={n} label={String(n)} active={topN === n} onPress={() => setTopN(n)} />
            ))}
          </View>
        </View>

        <View>
          <Label style={{ fontSize: 10 }}>Start year</Label>
          <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
            {START_YEARS.map((y) => (
              <Chip
                key={y}
                label={String(y)}
                active={startYear === y}
                onPress={() => setStartYear(y)}
              />
            ))}
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={{ marginTop: Spacing.lg }}>
          <SkeletonScreen rows={4} stats={3} />
        </View>
      ) : error ? (
        <ErrorState message={(error as Error).message} onRetry={refetch} />
      ) : data && stats ? (
        <>
          <View style={{ marginTop: Spacing.md }}>
            <StatRow>
              <StatCard
                label="CAGR"
                value={pct(stats.cagr)}
                sub={`bench ${pct(bench?.cagr)}`}
                color={deltaColor(c, stats.cagr)}
              />
              <StatCard
                label="Total return"
                value={pct(stats.totalReturn, 0)}
                sub={`bench ${pct(bench?.totalReturn, 0)}`}
                color={deltaColor(c, stats.totalReturn)}
              />
              <StatCard
                label="Max DD"
                value={pct(stats.maxDrawdown)}
                sub={`bench ${pct(bench?.maxDrawdown)}`}
                color={c.red}
              />
            </StatRow>
            <View style={{ height: Spacing.sm }} />
            <StatRow>
              <StatCard label="Sharpe" value={stats.sharpe.toFixed(2)} sub={`bench ${bench?.sharpe.toFixed(2)}`} />
              <StatCard label="Sortino" value={stats.sortino.toFixed(2)} sub={`bench ${bench?.sortino.toFixed(2)}`} />
              <StatCard
                label="Win rate"
                value={`${stats.winRate.toFixed(0)}%`}
                sub={`${num(stats.months)} months`}
              />
            </StatRow>
          </View>

          <SectionHeader title="Equity curve" />
          <Card style={{ padding: Spacing.md }}>
            <LineChart
              values={data.curve.map((p) => p.equity)}
              width={chartWidth}
              label={`System · ${data.coverage.from} → ${data.coverage.to}`}
              color={c.accent}
            />
            <View style={{ height: Spacing.md }} />
            <LineChart
              values={data.curve.map((p) => p.benchmark)}
              width={chartWidth}
              label="Benchmark"
              color={c.dim}
            />
          </Card>

          <SectionHeader title="Yearly returns" />
          <Card style={{ padding: Spacing.md }}>
            <BarChart
              values={data.yearly.map((y) => y.ret)}
              labels={data.yearly.map((y) => y.year.slice(2))}
              width={chartWidth}
            />
          </Card>

          <SectionHeader title="Latest month" />
          <Card style={{ padding: Spacing.md }}>
            <KV k="Month" v={data.latest.ym} />
            <KV k="System return" v={pct(data.latest.ret)} color={deltaColor(c, data.latest.ret)} />
            <KV
              k="Benchmark"
              v={pct(data.latest.benchmark)}
              color={deltaColor(c, data.latest.benchmark)}
            />
            <Text style={{ color: c.dim, fontSize: 10, marginTop: Spacing.sm, letterSpacing: 0.5 }}>
              LONGS
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 5 }}>
              {data.latest.longSymbols?.map((s) => (
                <SymbolPill key={s} symbol={s} onPress={() => router.push(`/stock/${s}` as never)} />
              ))}
            </View>
            {data.latest.shortSymbols?.length ? (
              <>
                <Text style={{ color: c.dim, fontSize: 10, marginTop: Spacing.md, letterSpacing: 0.5 }}>
                  SHORTS
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 5 }}>
                  {data.latest.shortSymbols.map((s) => (
                    <SymbolPill
                      key={s}
                      symbol={s}
                      onPress={() => router.push(`/stock/${s}` as never)}
                    />
                  ))}
                </View>
              </>
            ) : null}
          </Card>

          <SectionHeader title="Detail" />
          <Card style={{ padding: Spacing.md }}>
            <StatsTable label="System" s={stats} />
            <View style={{ height: Spacing.md }} />
            <StatsTable label="Benchmark" s={bench} />
          </Card>

          <Text style={{ color: c.dim, fontSize: 10, marginTop: Spacing.md, lineHeight: 15 }}>
            Run over {num(data.universe.symbols)} symbols, {data.universe.from}–{data.universe.to}.
            Snapshot generated {new Date(data.universe.generatedAt).toLocaleDateString("en-IN")}.
            Backtests are in-sample by construction — the ranking rules were chosen knowing this
            history.
          </Text>
        </>
      ) : null}
    </ScrollView>
  );
}

function StatsTable({ label, s }: { label: string; s?: BacktestStats }) {
  const c = useColors();
  if (!s) return null;
  return (
    <View>
      <Label style={{ fontSize: 10 }}>{label}</Label>
      <View style={{ marginTop: 6 }}>
        <KV k="Profit factor" v={s.profitFactor.toFixed(2)} />
        <KV k="Avg month" v={pct(s.avgMonth)} color={deltaColor(c, s.avgMonth)} />
        <KV k="Best month" v={pct(s.bestMonth)} color={c.green} />
        {s.worstMonth != null ? <KV k="Worst month" v={pct(s.worstMonth)} color={c.red} /> : null}
        <KV k="Months" v={num(s.months)} />
      </View>
    </View>
  );
}

function SymbolPill({ symbol, onPress }: { symbol: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 5,
        paddingHorizontal: 9,
        borderRadius: Radius.sm,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.surface,
      }}
    >
      <Text style={{ color: c.text, fontSize: 11, fontWeight: "600" }}>{symbol}</Text>
    </Pressable>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 6,
        paddingHorizontal: 13,
        borderRadius: Radius.sm,
        borderWidth: 1,
        borderColor: active ? c.accent : c.border,
        backgroundColor: active ? c.accentBg : c.card,
      }}
    >
      <Text style={{ color: active ? c.accent : c.soft, fontSize: 11, fontWeight: "600" }}>
        {label}
      </Text>
    </Pressable>
  );
}
