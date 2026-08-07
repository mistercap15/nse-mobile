import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { MonthPicker } from "@/components/MonthPicker";
import { StockRow } from "@/components/StockRow";
import {
  EmptyState,
  ErrorState,
  Label,
  SectionHeader,
  SkeletonScreen,
  StatCard,
  StatRow,
} from "@/components/ui";
import { useRankings } from "@/lib/queries";
import { useAppStore } from "@/lib/store";
import { MONTH_FULL, num } from "@/lib/format";
import { Radius, Spacing, useColors } from "@/lib/theme";

// ─────────────────────────────────────────────────────────────────────────────
// Screener. Filters the month's ranked universe client-side — the same list the
// web filters, so the numbers are identical; only the predicate is local.
// ─────────────────────────────────────────────────────────────────────────────

const WR_STEPS = [0, 60, 70, 80, 90];
const YEAR_STEPS = [0, 5, 7, 10, 15];

export default function ScreenerScreen() {
  const c = useColors();
  const month = useAppStore((s) => s.selectedMonth);
  const setMonth = useAppStore((s) => s.setSelectedMonth);

  const [minWR, setMinWR] = useState(0);
  const [minYears, setMinYears] = useState(0);
  const [sector, setSector] = useState("ALL");
  const [sigOnly, setSigOnly] = useState(false);

  const { data, isLoading, error, refetch } = useRankings(month, "ALL", 100);

  const all = useMemo(
    () => [...(data?.top_stocks ?? []), ...(data?.avoid_stocks ?? [])],
    [data],
  );

  const sectors = useMemo(
    () => ["ALL", ...Array.from(new Set(all.map((s) => s.sector).filter(Boolean))).sort()],
    [all],
  );

  const rows = useMemo(
    () =>
      all
        .filter((s) => {
          const years = (s.positive_years ?? 0) + (s.negative_years ?? 0);
          if (s.win_rate < minWR) return false;
          if (years < minYears) return false;
          if (sector !== "ALL" && s.sector !== sector) return false;
          if (sigOnly && !s.sig?.significant) return false;
          return true;
        })
        .sort((a, b) => b.score - a.score),
    [all, minWR, minYears, sector, sigOnly],
  );

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: Spacing.md, paddingBottom: Spacing.xxl }}
    >
      <Label>Universe · {MONTH_FULL[month - 1]}</Label>
      <View style={{ height: Spacing.sm }} />
      <MonthPicker value={month} onChange={setMonth} />

      <View style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
        <ChipRow
          label="Min win rate"
          options={WR_STEPS.map((v) => ({ value: v, label: v === 0 ? "any" : `${v}%` }))}
          value={minWR}
          onChange={setMinWR}
        />
        <ChipRow
          label="Min years"
          options={YEAR_STEPS.map((v) => ({ value: v, label: v === 0 ? "any" : `${v}y` }))}
          value={minYears}
          onChange={setMinYears}
        />

        <View>
          <Label style={{ fontSize: 10 }}>Sector</Label>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
              {sectors.map((s) => (
                <Chip key={s} label={s} active={sector === s} onPress={() => setSector(s)} />
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: c.soft, fontSize: 12 }}>Statistically significant only</Text>
          <Switch
            value={sigOnly}
            onValueChange={setSigOnly}
            trackColor={{ true: c.accent, false: c.muted }}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={{ marginTop: Spacing.lg }}>
          <SkeletonScreen rows={6} stats={2} />
        </View>
      ) : error ? (
        <ErrorState message={(error as Error).message} onRetry={refetch} />
      ) : (
        <>
          <View style={{ marginTop: Spacing.md }}>
            <StatRow>
              <StatCard label="Matches" value={num(rows.length)} sub={`of ${all.length} scanned`} />
              <StatCard
                label="Significant"
                value={num(rows.filter((s) => s.sig?.significant).length)}
                color={c.accent}
              />
            </StatRow>
          </View>

          <SectionHeader title="Results" />
          {rows.length === 0 ? (
            <EmptyState title="Nothing matches" hint="Loosen a filter — the bar may be too high for this month." />
          ) : (
            <View style={{ gap: Spacing.sm }}>
              {rows.map((s, i) => (
                <StockRow key={s.symbol} stock={s} rank={i + 1} />
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function ChipRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: number; label: string }[];
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View>
      <Label style={{ fontSize: 10 }}>{label}</Label>
      <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
        {options.map((o) => (
          <Chip
            key={o.value}
            label={o.label}
            active={value === o.value}
            onPress={() => onChange(o.value)}
          />
        ))}
      </View>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 6,
        paddingHorizontal: 11,
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
