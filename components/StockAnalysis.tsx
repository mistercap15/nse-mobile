import React, { useMemo, useState } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { BarChart, LineChart } from "@/components/charts";
import { SeasonalityHeatmap, type MonthlySeries } from "@/components/SeasonalityHeatmap";
import {
  Card,
  EmptyState,
  ErrorState,
  Label,
  SectionHeader,
  Segmented,
  Skeleton,
  SkeletonScreen,
  StatCard,
  StatRow,
} from "@/components/ui";
import { ConnectionBanner } from "@/components/ConnectionBanner";
import { LevelsCard } from "@/components/LevelsCard";
import { useAnalysis, useCandles, useLevels, useQuotes } from "@/lib/queries";
import { DASH, MONTHS, currentMonthIST, num, pct, rupees, rupeesCompact } from "@/lib/format";
import { Spacing, deltaColor, signalColor, useColors, useIsDark } from "@/lib/theme";
import type { AnalysisResponse, MonthSeasonality } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// The single-stock deep dive, shared by the Analysis tab and the pushed stock
// detail screen so both always show the same thing.
//
// Seasonality comes from the monthly snapshot and needs no Upstox. The daily
// price chart does, so it degrades to a note rather than an error.
// ─────────────────────────────────────────────────────────────────────────────

type Range = "6M" | "1Y" | "3Y";
const RANGE_DAYS: Record<Range, number> = { "6M": 190, "1Y": 380, "3Y": 1100 };

/**
 * Promoter dealing and stake trend — context, never a signal.
 *
 * This is the browsable home for the promoter data, and deliberately the only
 * one: a screener listing "stocks promoters are buying" would imply you can
 * find trades by scanning it, and the backtest says you can't. Beside a single
 * stock it's useful background; as a screener it would be a promise the data
 * can't keep.
 */
function PromoterCard({ promoter }: { promoter?: AnalysisResponse["promoter"] }) {
  const c = useColors();
  const a = promoter?.activity ?? null;
  const holding = promoter?.holding ?? [];
  if (!a && holding.length < 2) return null;

  const latest = holding[0];
  const oldest = holding[holding.length - 1];
  const drift = latest && oldest ? latest.promoterPct - oldest.promoterPct : null;

  const parts: string[] = [];
  if (a?.buys) parts.push(`${a.buys} open-market ${a.buys === 1 ? "buy" : "buys"} (${rupeesCompact(a.buyValue)})`);
  if (a?.sells) parts.push(`${a.sells} ${a.sells === 1 ? "sale" : "sales"} (${rupeesCompact(a.sellValue)})`);
  if (a?.revoked) parts.push(`${a.revoked} pledge ${a.revoked === 1 ? "release" : "releases"}`);
  if (a?.pledged) parts.push(`${a.pledged} new ${a.pledged === 1 ? "pledge" : "pledges"}`);

  return (
    <>
      <SectionHeader icon="person-circle" title="Promoters" />
      <Card style={{ padding: Spacing.md }}>
        {latest ? (
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
            <Text style={{ color: c.text, fontSize: 24, fontWeight: "800" }}>
              {latest.promoterPct.toFixed(2)}%
            </Text>
            <Text style={{ color: c.dim, fontSize: 10, marginBottom: 5 }}>
              holding as of {latest.date}
            </Text>
          </View>
        ) : null}

        {drift != null && holding.length >= 3 ? (
          <Text style={{ color: c.soft, fontSize: 11, marginTop: 4, lineHeight: 16 }}>
            {Math.abs(drift) < 0.1
              ? `Unchanged across the last ${holding.length} quarters.`
              : `${drift > 0 ? "Up" : "Down"} ${Math.abs(drift).toFixed(2)}pts over ${holding.length} quarters (from ${oldest.promoterPct.toFixed(2)}%).`}
          </Text>
        ) : null}

        {parts.length ? (
          <Text style={{ color: c.soft, fontSize: 11, marginTop: Spacing.sm, lineHeight: 16 }}>
            {parts.join(" · ")} in the last {a?.windowDays} days.
          </Text>
        ) : null}

        <Text style={{ color: c.dim, fontSize: 9.5, marginTop: Spacing.sm, lineHeight: 14 }}>
          Background only. Stake direction was tested against four years of returns and didn&apos;t
          predict them, so nothing here affects the suggested trade above.
        </Text>
      </Card>
    </>
  );
}

export function StockAnalysis({ symbol }: { symbol: string }) {
  const c = useColors();
  const isDark = useIsDark();
  const { width } = useWindowDimensions();
  const [range, setRange] = useState<Range>("1Y");

  const analysis = useAnalysis(symbol);
  const candles = useCandles(symbol, RANGE_DAYS[range]);
  const quotes = useQuotes([symbol]);
  const quote = quotes.data?.quotes?.[symbol];

  // Suggested entry/stop/target from the shared backend engine — the same
  // numbers the setup screens show, rather than a fourth local calculation.
  const levelsQuery = useLevels([symbol], { month: currentMonthIST() });
  const levels = levelsQuery.data?.levels?.[symbol] ?? null;

  const thisMonth = currentMonthIST();

  // "YYYY-MM" → return %, for the heatmap.
  const series: MonthlySeries = useMemo(() => {
    const out: MonthlySeries = {};
    for (const p of analysis.data?.prices ?? []) {
      if (p.return_pct != null) out[p.date] = p.return_pct;
    }
    return out;
  }, [analysis.data]);

  const seasonality = useMemo(() => analysis.data?.seasonality ?? [], [analysis.data]);

  const { best, worst } = useMemo(() => {
    if (!seasonality.length) return { best: null, worst: null };
    const sorted = [...seasonality].sort((a, b) => b.median_return - a.median_return);
    return { best: sorted[0] ?? null, worst: sorted[sorted.length - 1] ?? null };
  }, [seasonality]);

  const current = seasonality.find((s) => s.month_num === thisMonth) ?? null;
  const chartWidth = width - Spacing.md * 2 - 2 /* card border */ - Spacing.md * 2;

  if (analysis.isLoading) return <SkeletonScreen stats={3} charts={2} rows={2} usedAbove={120} />;
  if (analysis.error) {
    return <ErrorState message={(analysis.error as Error).message} onRetry={analysis.refetch} />;
  }
  if (!analysis.data || !seasonality.length) {
    return <EmptyState emoji="🕳️" title={`No data for ${symbol}`} hint="This symbol may not be in the F&O universe." />;
  }

  return (
    <View>
      <ConnectionBanner />

      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
        <Text style={{ color: c.text, fontSize: 26, fontWeight: "800" }}>{symbol}</Text>
        <Text style={{ color: c.dim, fontSize: 11 }}>
          lot {num(analysis.data.lot_size)} · {analysis.data.start_year}–{analysis.data.end_year} ·{" "}
          {num(analysis.data.data_points)} pts
        </Text>
      </View>

      {/* Live price, when Upstox is up. Absent rather than "—" so the screen
          doesn't lead with a blank where the interesting number goes. */}
      {quote?.ltp ? (
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: Spacing.sm }}>
          <Text style={{ color: c.text, fontSize: 20, fontWeight: "700" }}>
            {rupees(quote.ltp, 2)}
          </Text>
          <Text style={{ color: deltaColor(c, quote.changePct), fontSize: 13, fontWeight: "700" }}>
            {pct(quote.changePct, 2)}
          </Text>
          <Text style={{ color: c.dim, fontSize: 10 }}>
            O {rupees(quote.open)} · H {rupees(quote.high)} · L {rupees(quote.low)}
          </Text>
        </View>
      ) : null}

      <View style={{ marginTop: Spacing.md }}>
        <LevelsCard levels={levels} title={`Suggested trade · ${MONTHS[thisMonth - 1]}`} />
      </View>

      <PromoterCard promoter={analysis.data.promoter} />

      {/* Current-month seasonality up front — it's why you opened this screen. */}
      <View style={{ marginTop: Spacing.md }}>
        <StatRow>
          <StatCard
            label={`${MONTHS[thisMonth - 1]} win rate`}
            value={current ? `${current.win_rate.toFixed(0)}%` : DASH}
            sub={current ? `${current.positive_years}/${current.data_points} years` : undefined}
            color={current ? signalColor(c, current.win_rate) : undefined}
          />
          <StatCard
            label={`${MONTHS[thisMonth - 1]} median`}
            value={current ? pct(current.median_return) : DASH}
            color={deltaColor(c, current?.median_return)}
          />
          <StatCard
            label={`${MONTHS[thisMonth - 1]} range`}
            value={current ? pct(current.best) : DASH}
            sub={current ? `worst ${pct(current.worst)}` : undefined}
          />
        </StatRow>
      </View>

      <View style={{ marginTop: Spacing.sm }}>
        <StatRow>
          <StatCard
            label="Best month"
            value={best ? best.month : DASH}
            sub={best ? `${pct(best.median_return)} median · ${best.win_rate.toFixed(0)}% WR` : undefined}
            color={c.green}
          />
          <StatCard
            label="Worst month"
            value={worst ? worst.month : DASH}
            sub={worst ? `${pct(worst.median_return)} median · ${worst.win_rate.toFixed(0)}% WR` : undefined}
            color={c.red}
          />
        </StatRow>
      </View>

      {/* Median return by month */}
      <SectionHeader title="Median return by month" icon="bar-chart" />
      <Card style={{ padding: Spacing.md }}>
        <BarChart
          values={seasonality.map((s) => s.median_return)}
          labels={seasonality.map((s) => s.month.slice(0, 1))}
          width={chartWidth}
        />
      </Card>

      {/* Price history */}
      <SectionHeader
        icon="pulse"
        title="Daily price"
        right={
          <Segmented<Range>
            value={range}
            onChange={setRange}
            options={[
              { value: "6M", label: "6M" },
              { value: "1Y", label: "1Y" },
              { value: "3Y", label: "3Y" },
            ]}
          />
        }
      />
      <Card style={{ padding: Spacing.md }}>
        {candles.isLoading ? (
          <Skeleton height={160} />
        ) : candles.data?.candles?.length ? (
          <>
            <LineChart
              values={candles.data.candles.map((k) => k.close)}
              width={chartWidth}
              label={`${range} close`}
            />
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
              <Text style={{ color: c.dim, fontSize: 10 }}>
                {candles.data.candles[0]?.date}
              </Text>
              <Text style={{ color: c.text, fontSize: 11, fontWeight: "700" }}>
                {rupees(candles.data.candles[candles.data.candles.length - 1]?.close)}
              </Text>
            </View>
          </>
        ) : (
          <Text style={{ color: c.dim, fontSize: 11, paddingVertical: 20, textAlign: "center", lineHeight: 16 }}>
            {DASH} Price history needs Upstox. Seasonality below is unaffected.
          </Text>
        )}
      </Card>

      {/* Heatmap */}
      <SectionHeader title="Seasonality heatmap" icon="grid" />
      <Card style={{ padding: Spacing.md }}>
        <SeasonalityHeatmap series={series} isDark={isDark} highlightMonth={thisMonth} />
        <Text style={{ color: c.dim, fontSize: 10, marginTop: Spacing.sm, lineHeight: 15 }}>
          Monthly % returns. Green = up, red = down, intensity clamped at ±15%.
        </Text>
      </Card>

      {/* Month table */}
      <SectionHeader title="Month by month" icon="calendar" />
      <Card style={{ padding: Spacing.sm }}>
        {seasonality.map((s: MonthSeasonality) => (
          <View
            key={s.month_num}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 7,
              paddingHorizontal: Spacing.sm,
              backgroundColor: s.month_num === thisMonth ? c.accentBg : "transparent",
              borderRadius: 6,
            }}
          >
            <Text style={{ color: c.soft, fontSize: 12, width: 38, fontWeight: "600" }}>
              {s.month}
            </Text>
            <Text
              style={{
                color: signalColor(c, s.win_rate),
                fontSize: 12,
                fontWeight: "700",
                width: 46,
              }}
            >
              {s.win_rate.toFixed(0)}%
            </Text>
            <Text
              style={{ color: deltaColor(c, s.median_return), fontSize: 12, width: 62, fontWeight: "600" }}
            >
              {pct(s.median_return)}
            </Text>
            <Text style={{ color: c.dim, fontSize: 10, flex: 1, textAlign: "right" }}>
              {s.positive_years}↑ {s.negative_years}↓ · {pct(s.best)} / {pct(s.worst)}
            </Text>
          </View>
        ))}
      </Card>

      <View style={{ height: Spacing.lg }} />
      <Label>Sample sizes</Label>
      <Text style={{ color: c.dim, fontSize: 11, marginTop: 6, lineHeight: 16 }}>
        Win rates are computed over completed months only, from {analysis.data.start_year} onward.
        A high rate on few years is a weaker claim than the same rate on fifteen — the year counts
        above are there to be read alongside it.
      </Text>
    </View>
  );
}
