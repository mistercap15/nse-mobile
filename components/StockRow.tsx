import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  Radius,
  Spacing,
  Type,
  deltaColor,
  elevation,
  hairline,
  signalColor,
  surfaceGradient,
  useColors,
  useIsDark,
} from "@/lib/theme";
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
  const isDark = useIsDark();
  const router = useRouter();

  const go = onPress ?? (() => router.push(`/stock/${stock.symbol}` as never));
  const wrColor = signalColor(c, stock.win_rate);

  return (
    <Pressable
      onPress={go}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: c.card },
        elevation(isDark, 1, wrColor),
        pressed && { transform: [{ scale: 0.99 }], opacity: 0.9 },
      ]}
    >
      {/* Clipped layer: gradient surface + the signal stripe. The stripe has to
          live in here or its corners square off against the row's radius — a
          3px bar can't fake an 18px curve by setting its own borderRadius. */}
      <View style={[StyleSheet.absoluteFill, styles.clip, { borderColor: hairline(c, isDark) }]}>
        <LinearGradient
          colors={surfaceGradient(c, isDark)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={[wrColor, `${wrColor}88`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.stripe}
        />
      </View>

      {rank !== undefined ? (
        <Text style={[styles.rank, { color: rank <= 3 ? c.accent : c.dim }]}>{rank}</Text>
      ) : null}

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
    borderRadius: Radius.lg,
    paddingVertical: 12,
    paddingLeft: Spacing.md + 4,
    paddingRight: Spacing.md,
    gap: Spacing.sm,
  },
  clip: { borderRadius: Radius.lg, borderWidth: 1, overflow: "hidden" },
  stripe: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3.5 },
  rank: { width: 22, fontSize: 11, fontWeight: "800" },
  main: { flex: 1, minWidth: 0 },
  symbolLine: { flexDirection: "row", alignItems: "center", gap: 5 },
  symbol: { fontSize: 14.5, fontWeight: "800", letterSpacing: -0.1 },
  sector: { fontSize: 10, marginTop: 2 },
  stat: { alignItems: "flex-end", minWidth: 52 },
  statValue: { fontSize: 14, fontWeight: "800", letterSpacing: -0.2, ...Type.numeric },
  statLabel: { fontSize: 9, marginTop: 1, textTransform: "uppercase", letterSpacing: 0.5 },
});
