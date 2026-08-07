import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ConnectionBanner } from "@/components/ConnectionBanner";
import { MonthPicker } from "@/components/MonthPicker";
import {
  Badge,
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
import { useEntryPrices, useRankings } from "@/lib/queries";
import { useAppStore } from "@/lib/store";
import { buildSizingModel, type SizedPosition } from "@/lib/sizing";
import { DASH, MONTH_FULL, num, pct, rupees, rupeesCompact } from "@/lib/format";
import { Radius, Spacing, gradeColor, useColors } from "@/lib/theme";

// ─────────────────────────────────────────────────────────────────────────────
// Position sizing. Conviction-graded lots, hard risk caps, then rationed against
// real capital. The scoring is ported in lib/sizing.ts; this screen is the UI
// over it plus the entry/target/stop levels from /api/sizing/entry-prices.
//
// Works with Upstox disconnected: grades, lots and capital math are all
// snapshot-derived. Only the price columns fall back to "—".
// ─────────────────────────────────────────────────────────────────────────────

function MoneyInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  const c = useColors();
  const [text, setText] = useState(String(value));

  // Commit on blur so a half-typed number never re-runs the whole allocation.
  const commit = () => {
    const n = Number(text.replace(/[^0-9.]/g, ""));
    const next = Number.isFinite(n) && n >= 0 ? n : value;
    onChange(next);
    setText(String(next));
  };

  return (
    <View style={{ flex: 1 }}>
      <Label style={{ fontSize: 10 }}>{label}</Label>
      <TextInput
        value={text}
        onChangeText={setText}
        onBlur={commit}
        onSubmitEditing={commit}
        keyboardType="number-pad"
        returnKeyType="done"
        style={[
          styles.input,
          { backgroundColor: c.card, borderColor: c.border, color: c.text },
        ]}
      />
    </View>
  );
}

function PositionCard({ p }: { p: SizedPosition }) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const lv = p.levels;

  return (
    <Card style={{ padding: Spacing.md }}>
      <Pressable onPress={() => setOpen((o) => !o)}>
        <View style={styles.posHead}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ color: c.text, fontSize: 15, fontWeight: "700" }}>{p.symbol}</Text>
              <Badge text={p.grade} color={gradeColor(c, p.grade)} small />
              {p.provisional ? <Badge text="PROV" color={c.amber} small /> : null}
            </View>
            <Text style={{ color: c.dim, fontSize: 10, marginTop: 3 }}>
              {p.sector} · score {p.score} · {p.years}y · WR {p.win_rate?.toFixed(0)}%
            </Text>
          </View>

          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ color: c.accent, fontSize: 17, fontWeight: "800" }}>
              {p.allocLots}
              <Text style={{ fontSize: 10, color: c.dim }}> lot{p.allocLots === 1 ? "" : "s"}</Text>
            </Text>
            <Text style={{ color: c.dim, fontSize: 10 }}>{rupeesCompact(p.capitalUsed)}</Text>
          </View>
        </View>

        <View style={styles.levelRow}>
          <LevelCell label="Entry" value={p.entry ? rupees(p.entry) : DASH} color={c.text} />
          <LevelCell
            label="Target"
            value={lv ? rupees(lv.targetPrice) : DASH}
            color={lv ? c.green : c.dim}
          />
          <LevelCell
            label="Stop"
            value={lv ? rupees(lv.stopPrice) : DASH}
            color={lv ? c.red : c.dim}
          />
          <LevelCell
            label="Avg-in"
            value={lv?.avgInPrice ? rupees(lv.avgInPrice) : DASH}
            color={lv?.avgInPrice ? c.amber : c.dim}
          />
        </View>
      </Pressable>

      {open ? (
        <View style={[styles.expanded, { borderTopColor: c.border }]}>
          <KV k="Median return (target basis)" v={pct(p.median_return)} />
          <KV k="Worst month (stop basis)" v={pct(p.worst)} />
          <KV k="Stop distance" v={lv ? pct(lv.stopPct) : DASH} color={c.red} />
          <KV
            k="Expected profit"
            v={lv ? rupees(lv.expectedProfit) : DASH}
            color={c.green}
          />
          <KV k="Risk at stop" v={lv ? rupees(lv.riskAmount) : DASH} color={c.red} />
          <KV k="Lot size" v={num(p.lot_size)} />
          <KV
            k="Per-lot cost"
            v={`${rupees(p.lotCost)}${p.lotCostReal ? "" : " (est)"}`}
          />
          {p.capReasons.length ? (
            <Text style={{ color: c.amber, fontSize: 10, marginTop: 6, lineHeight: 15 }}>
              Risk-capped to 1 lot — {p.capReasons.join(", ")}
            </Text>
          ) : null}
          {p.allocLots >= 2 ? (
            <Text style={{ color: c.dim, fontSize: 10, marginTop: 6, lineHeight: 15 }}>
              Average-in fills the same {p.allocLots}-lot size in two stages. It does not add
              beyond it — below the stop you exit.
            </Text>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

function LevelCell({ label, value, color }: { label: string; value: string; color: string }) {
  const c = useColors();
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: c.dim, fontSize: 9, letterSpacing: 0.4 }}>{label}</Text>
      <Text style={{ color, fontSize: 12, fontWeight: "700", marginTop: 2 }}>{value}</Text>
    </View>
  );
}

export function SizingPanel() {
  const c = useColors();
  const month = useAppStore((s) => s.selectedMonth);
  const setMonth = useAppStore((s) => s.setSelectedMonth);
  const sizing = useAppStore((s) => s.sizing);
  const setSizing = useAppStore((s) => s.setSizing);

  const rankings = useRankings(month, "ALL", 50);
  // Memoised so the fallback array doesn't get a new identity every render —
  // otherwise the allocation below re-runs on every keystroke in the inputs.
  const stocks = useMemo(() => rankings.data?.top_stocks ?? [], [rankings.data]);
  const symbols = useMemo(() => stocks.map((s) => s.symbol), [stocks]);

  const entries = useEntryPrices(month, symbols, symbols.length > 0);

  const model = useMemo(
    () =>
      buildSizingModel(
        stocks,
        sizing.capital,
        sizing.reserve,
        sizing.avgLotCost,
        entries.data?.prices ?? {},
      ),
    [stocks, sizing, entries.data],
  );

  return (
    <View>
      <ConnectionBanner />

      <Label>Capital plan · {MONTH_FULL[month - 1]}</Label>
      <View style={{ height: Spacing.sm }} />
      <MonthPicker value={month} onChange={setMonth} />

      <View style={{ flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.md }}>
        <MoneyInput
          label="Capital"
          value={sizing.capital}
          onChange={(capital) => setSizing({ capital })}
        />
        <MoneyInput
          label="Reserve"
          value={sizing.reserve}
          onChange={(reserve) => setSizing({ reserve })}
        />
        <MoneyInput
          label="Avg lot ₹"
          value={sizing.avgLotCost}
          onChange={(avgLotCost) => setSizing({ avgLotCost })}
        />
      </View>

      <View style={{ marginTop: Spacing.md }}>
        <StatRow>
          <StatCard label="Usable" value={rupeesCompact(model.usable)} sub="capital − reserve" />
          <StatCard label="Lot budget" value={num(model.budget)} sub="at avg lot cost" />
          <StatCard
            label="Deployed"
            value={`${model.deployedPct}%`}
            sub={rupeesCompact(model.deployed)}
            color={c.accent}
          />
        </StatRow>
        <View style={{ height: Spacing.sm }} />
        <StatRow>
          <StatCard label="Positions" value={num(model.positions)} sub={`${model.totalLots} lots`} />
          <StatCard label="Dry powder" value={rupeesCompact(model.dryPowder)} color={c.amber} />
        </StatRow>
      </View>

      {model.thin ? (
        <View
          style={{
            marginTop: Spacing.md,
            padding: Spacing.md,
            borderRadius: Radius.md,
            borderWidth: 1,
            borderColor: c.amber,
            backgroundColor: c.amberBg,
          }}
        >
          <Text style={{ color: c.amber, fontSize: 11, fontWeight: "700" }}>
            Thin month — only {model.qualifiedCount} name
            {model.qualifiedCount === 1 ? "" : "s"} qualified
          </Text>
          <Text style={{ color: c.soft, fontSize: 11, marginTop: 4, lineHeight: 16 }}>
            Seasonal edge is scarce this month. Sizing down or sitting out is a legitimate
            outcome — don&apos;t force the capital to work.
          </Text>
        </View>
      ) : null}

      {!model.hasEntryPrices && !entries.isLoading ? (
        <Text style={{ color: c.dim, fontSize: 10, marginTop: Spacing.sm, lineHeight: 15 }}>
          No entry prices — grades, lots and capital math are unaffected; price levels show
          &ldquo;—&rdquo; until Upstox is connected.
        </Text>
      ) : null}

      {rankings.isLoading ? (
        <View style={{ marginTop: Spacing.lg }}>
          <SkeletonScreen rows={5} stats={3} />
        </View>
      ) : rankings.error ? (
        <ErrorState message={(rankings.error as Error).message} onRetry={rankings.refetch} />
      ) : (
        <>
          <SectionHeader
            title={`Sized positions (${model.sized.length})`}
            right={
              entries.isLoading ? (
                <Text style={{ color: c.dim, fontSize: 10 }}>loading prices…</Text>
              ) : entries.data?.provisionalMonth ? (
                <Text style={{ color: c.amber, fontSize: 10 }}>provisional — live quotes</Text>
              ) : null
            }
          />

          {model.sized.length === 0 ? (
            <EmptyState
              title="Nothing sized"
              hint="No stock cleared the conviction bar, or the lot budget is zero. Check your capital inputs."
            />
          ) : (
            <View style={{ gap: Spacing.sm }}>
              {model.sized.map((p) => (
                <PositionCard key={p.symbol} p={p} />
              ))}
            </View>
          )}

          {model.reserved.length ? (
            <>
              <SectionHeader title={`Reserve list (${model.reserved.length})`} />
              <Text style={{ color: c.dim, fontSize: 11, marginBottom: Spacing.sm, lineHeight: 16 }}>
                Qualified on conviction but out of capital — the next names in if something frees up.
              </Text>
              <View style={{ gap: Spacing.sm }}>
                {model.reserved.map((p) => (
                  <Card key={p.symbol} style={{ padding: Spacing.md }}>
                    <View style={styles.posHead}>
                      <Text style={{ color: c.soft, fontSize: 13, fontWeight: "700" }}>
                        {p.symbol}
                      </Text>
                      <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                        <Badge text={p.grade} color={gradeColor(c, p.grade)} small />
                        <Text style={{ color: c.dim, fontSize: 10 }}>
                          wanted {p.recLots} lot{p.recLots === 1 ? "" : "s"}
                        </Text>
                      </View>
                    </View>
                  </Card>
                ))}
              </View>
            </>
          ) : null}

          {model.belowBar.length ? (
            <>
              <SectionHeader title={`Below the bar (${model.belowBar.length})`} />
              <View style={{ gap: Spacing.sm }}>
                {model.belowBar.map((p) => (
                  <Card key={p.symbol} style={{ padding: Spacing.md }}>
                    <Text style={{ color: c.soft, fontSize: 13, fontWeight: "700" }}>
                      {p.symbol}
                    </Text>
                    <Text style={{ color: c.dim, fontSize: 10, marginTop: 3 }}>
                      {p.skipReasons.join(" · ")}
                    </Text>
                  </Card>
                ))}
              </View>
            </>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 5,
  },
  posHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.sm },
  levelRow: { flexDirection: "row", marginTop: Spacing.md, gap: Spacing.xs },
  expanded: { borderTopWidth: 1, marginTop: Spacing.md, paddingTop: Spacing.sm },
});
