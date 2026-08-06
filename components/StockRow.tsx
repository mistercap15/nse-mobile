import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Radius, Spacing, deltaColor, signalColor, useColors } from "@/lib/theme";
import { num, pct } from "@/lib/format";
import type { RankedStock } from "@/lib/types";
import { SigMark } from "./ui";

// ─────────────────────────────────────────────────────────────────────────────
// A row in the monthly ranked list. Mirrors the web's RankingsTable row: rank,
// symbol + sector, win rate with its significance mark, median return, and the
// sample size behind them. Tapping pushes the stock detail screen.
// ─────────────────────────────────────────────────────────────────────────────

export function StockRow({
  stock,
  rank,
  onPress,
}: {
  stock: RankedStock;
  rank?: number;
  onPress?: () => void;
}) {
  const c = useColors();
  const router = useRouter();

  const go = onPress ?? (() => router.push(`/stock/${stock.symbol}` as never));
  const wrColor = signalColor(c, stock.win_rate);

  return (
    <Pressable
      onPress={go}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      {rank !== undefined ? <Text style={[styles.rank, { color: c.dim }]}>{rank}</Text> : null}

      <View style={styles.main}>
        <View style={styles.symbolLine}>
          <Text numberOfLines={1} style={[styles.symbol, { color: c.text }]}>
            {stock.symbol}
          </Text>
          <SigMark significant={stock.sig?.significant} />
        </View>
        <Text numberOfLines={1} style={[styles.sector, { color: c.dim }]}>
          {stock.sector || "—"} · {num(stock.data_points)} pts · lot {num(stock.lot_size)}
        </Text>
      </View>

      <View style={styles.stat}>
        <Text style={[styles.statValue, { color: wrColor }]}>
          {Number.isFinite(stock.win_rate) ? `${stock.win_rate.toFixed(0)}%` : "—"}
        </Text>
        <Text style={[styles.statLabel, { color: c.dim }]}>win</Text>
      </View>

      <View style={styles.stat}>
        <Text style={[styles.statValue, { color: deltaColor(c, stock.median_return) }]}>
          {pct(stock.median_return)}
        </Text>
        <Text style={[styles.statLabel, { color: c.dim }]}>median</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: 11,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  rank: { width: 22, fontSize: 11, fontWeight: "700" },
  main: { flex: 1, minWidth: 0 },
  symbolLine: { flexDirection: "row", alignItems: "center", gap: 5 },
  symbol: { fontSize: 14, fontWeight: "700", letterSpacing: 0.2 },
  sector: { fontSize: 10, marginTop: 2 },
  stat: { alignItems: "flex-end", minWidth: 52 },
  statValue: { fontSize: 14, fontWeight: "700" },
  statLabel: { fontSize: 9, marginTop: 1, textTransform: "uppercase", letterSpacing: 0.5 },
});
