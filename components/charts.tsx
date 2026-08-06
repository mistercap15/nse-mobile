import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Rect, Stop, Line as SvgLine } from "react-native-svg";
import { Spacing, useColors } from "@/lib/theme";
import { pct } from "@/lib/format";

// ─────────────────────────────────────────────────────────────────────────────
// Two small SVG charts — a filled line for price/equity series and a signed bar
// chart for per-month returns.
//
// Drawn directly with react-native-svg rather than pulling in a charting
// library: the app needs exactly these two shapes, and hand-drawing them keeps
// the palette on the design tokens and avoids a Skia/New-Architecture
// dependency for ~120 lines of geometry.
// ─────────────────────────────────────────────────────────────────────────────

const PAD = 6;

function buildPath(values: number[], w: number, h: number): { line: string; area: string } {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = values.length > 1 ? (w - PAD * 2) / (values.length - 1) : 0;

  const pts = values.map((v, i) => {
    const x = PAD + i * stepX;
    const y = PAD + (1 - (v - min) / span) * (h - PAD * 2);
    return [x, y] as const;
  });

  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(2)},${h} L${pts[0][0].toFixed(2)},${h} Z`;
  return { line, area };
}

export function LineChart({
  values,
  height = 160,
  width,
  color,
  label,
}: {
  values: number[];
  height?: number;
  width: number;
  color?: string;
  label?: string;
}) {
  const c = useColors();

  const clean = useMemo(() => values.filter((v) => Number.isFinite(v)), [values]);
  const tint = color ?? (clean.length > 1 && clean[clean.length - 1] >= clean[0] ? c.green : c.red);

  if (clean.length < 2) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={{ color: c.dim, fontSize: 11 }}>Not enough data to chart</Text>
      </View>
    );
  }

  const { line, area } = buildPath(clean, width, height);
  const first = clean[0];
  const last = clean[clean.length - 1];
  const changePct = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;

  return (
    <View>
      {label ? (
        <View style={styles.legend}>
          <Text style={{ color: c.dim, fontSize: 10, letterSpacing: 0.6 }}>{label}</Text>
          <Text style={{ color: tint, fontSize: 11, fontWeight: "700" }}>{pct(changePct)}</Text>
        </View>
      ) : null}
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={tint} stopOpacity="0.28" />
            <Stop offset="1" stopColor={tint} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>
        <Path d={area} fill="url(#lineFill)" />
        <Path d={line} stroke={tint} strokeWidth={1.8} fill="none" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

/** Signed bars — green above the zero line, red below. */
export function BarChart({
  values,
  labels,
  height = 130,
  width,
}: {
  values: (number | null)[];
  labels?: string[];
  height?: number;
  width: number;
}) {
  const c = useColors();

  const finite = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (!finite.length) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={{ color: c.dim, fontSize: 11 }}>No data</Text>
      </View>
    );
  }

  const chartH = height - (labels ? 16 : 0);
  const max = Math.max(...finite.map(Math.abs)) || 1;
  const zeroY = chartH / 2;
  const slot = width / values.length;
  const barW = Math.max(3, slot * 0.6);

  return (
    <View>
      <Svg width={width} height={chartH}>
        <SvgLine x1={0} y1={zeroY} x2={width} y2={zeroY} stroke={c.border} strokeWidth={1} />
        {values.map((v, i) => {
          if (v == null || !Number.isFinite(v)) return null;
          const h = (Math.abs(v) / max) * (chartH / 2 - 4);
          const x = i * slot + (slot - barW) / 2;
          const y = v >= 0 ? zeroY - h : zeroY;
          return (
            <Rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={Math.max(h, 1)}
              rx={2}
              fill={v >= 0 ? c.green : c.red}
              opacity={0.85}
            />
          );
        })}
      </Svg>
      {labels ? (
        <View style={{ flexDirection: "row", width }}>
          {labels.map((l, i) => (
            <Text
              key={i}
              style={{ width: slot, textAlign: "center", color: c.dim, fontSize: 8 }}
            >
              {l}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: "center", justifyContent: "center" },
  legend: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
});
