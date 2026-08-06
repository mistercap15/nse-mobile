import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Radius, useColors, type AppColors } from "@/lib/theme";
import { MONTHS } from "@/lib/format";

// ─────────────────────────────────────────────────────────────────────────────
// Year × month grid of monthly returns — the web's SeasonalityHeatmap.
//
// Colour encodes sign and magnitude on a diverging red→green ramp, clamped at
// ±15% so one crash year doesn't flatten every other cell to the same tone.
// Cells with no data render as a neutral border-toned block, never as 0%.
// ─────────────────────────────────────────────────────────────────────────────

const CLAMP = 15;
const CELL = 26;

export type MonthlySeries = Record<string, number | null | undefined>; // "YYYY-MM" → return %

function cellColor(c: AppColors, v: number | null | undefined, isDark: boolean): string {
  if (v == null || !Number.isFinite(v)) return isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
  const t = Math.min(Math.abs(v), CLAMP) / CLAMP; // 0…1 intensity
  const alpha = 0.14 + t * 0.66;
  // Token RGB, so the ramp stays on-palette in both themes.
  const rgb = v >= 0 ? (isDark ? "34,197,94" : "21,128,61") : isDark ? "248,113,113" : "220,38,38";
  return `rgba(${rgb},${alpha.toFixed(3)})`;
}

export function SeasonalityHeatmap({
  series,
  isDark,
  highlightMonth,
}: {
  series: MonthlySeries;
  isDark: boolean;
  /** 1-12; draws an accent ring around that column. */
  highlightMonth?: number;
}) {
  const c = useColors();

  const years = Array.from(
    new Set(Object.keys(series).map((k) => k.slice(0, 4))),
  )
    .filter((y) => /^\d{4}$/.test(y))
    .sort((a, b) => Number(b) - Number(a));

  if (!years.length) {
    return (
      <Text style={{ color: c.dim, fontSize: 12, paddingVertical: 12 }}>
        No monthly history available for this symbol.
      </Text>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        {/* Month header */}
        <View style={styles.row}>
          <View style={{ width: 38 }} />
          {MONTHS.map((m, i) => (
            <View key={m} style={[styles.cell, styles.headerCell]}>
              <Text
                style={{
                  color: highlightMonth === i + 1 ? c.accent : c.dim,
                  fontSize: 9,
                  fontWeight: "700",
                }}
              >
                {m}
              </Text>
            </View>
          ))}
        </View>

        {years.map((year) => (
          <View key={year} style={styles.row}>
            <View style={{ width: 38, justifyContent: "center" }}>
              <Text style={{ color: c.dim, fontSize: 10, fontWeight: "600" }}>{year}</Text>
            </View>
            {MONTHS.map((_, i) => {
              const key = `${year}-${String(i + 1).padStart(2, "0")}`;
              const v = series[key];
              const highlighted = highlightMonth === i + 1;
              return (
                <View
                  key={key}
                  style={[
                    styles.cell,
                    {
                      backgroundColor: cellColor(c, v, isDark),
                      borderColor: highlighted ? c.accent : "transparent",
                      borderWidth: highlighted ? 1 : 0,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: v == null ? c.muted : c.text,
                      fontSize: 8,
                      fontWeight: "600",
                    }}
                  >
                    {v == null || !Number.isFinite(v) ? "" : v.toFixed(0)}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 2, marginBottom: 2 },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: Radius.sm - 4,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCell: { height: 18 },
});
