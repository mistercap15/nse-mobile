import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useColors, useIsDark, useReducedMotion } from "@/lib/theme";

// ─────────────────────────────────────────────────────────────────────────────
// The Market Mood dial — Extreme Fear ‥ Extreme Greed, from how far the Nifty
// has fallen below its own trailing high.
//
// WHAT THE WORDS MEAN HERE. "Extreme Greed" is one specific, checkable thing:
// the Nifty is within 2% of its own 252-session closing high. It is a name for
// a distance, not a reading of the market's mood — a real fear/greed index
// folds in volatility, breadth, options positioning and safe-haven flows, and
// this folds in none of them.
//
// FEAR IS ON THE LEFT AND RED, GREED ON THE RIGHT AND GREEN, which is the usual
// convention — but on this dial the colours are the EMOTION, not a verdict. For
// this system the 56-month sample says seasonal longs opened in Extreme Greed
// did best and ones opened in Extreme Fear did worst, so the green end is not a
// warning and the red end is not an invitation. The historical line under the
// dial carries that, which is exactly why it is not optional.
//
// THE SCALE IS PIECEWISE AND THE TICKS SAY SO. Each band owns a quarter of the
// arc. A straight linear scale would crush the 2% and 5% edges — the ones worth
// reading — into slivers and hand half the dial to a drawdown depth the market
// reaches once a decade. The printed ticks (20+ / 10 / 5 / 2 / 0) keep the
// compression visible, and the exact number sits under the needle regardless.
//
// Past 20% off the high the needle PINS at the left stop rather than running
// off. A 25% and a 40% drawdown are the same message at this resolution, and a
// dial that silently rescales its own end stop is one you cannot read twice.
//
// Geometry is hand-drawn for the same reason as charts.tsx: this is ~70 lines
// of trigonometry, and a gauge library would cost a dependency and the palette.
// ─────────────────────────────────────────────────────────────────────────────

/** Drawdown at the left-hand stop. Past this the needle pins. */
const FULL_SCALE = 20;

/** Band edges in percent off the high — these MUST match THRESHOLDS in the
 *  dashboard's app/lib/marketRegime.js. They are duplicated because they are
 *  drawing constants here, not a decision: the label shown is always the one
 *  the server sent, never re-derived from these. scripts/test-gauge.mjs asserts
 *  the numbers still agree. */
const T_EXTREME_GREED = 2;
const T_GREED = 5;
const T_FEAR = 10;

/** Left→right order of the bands, one quarter of the arc each. */
export const BANDS = ["Extreme Fear", "Fear", "Greed", "Extreme Greed"] as const;

/**
 * Drawdown → position along the arc: 0 is the left stop (deepest drawdown,
 * Extreme Fear) and 1 the right (at the high, Extreme Greed). Piecewise so each
 * band gets a quarter — see the note above.
 *
 * Junk parks the needle at the CENTRE, not at an end. 0 is now the Extreme Fear
 * stop, and a missing number that pins the needle to a panic reading is the
 * worst failure this component could have; the middle says nothing.
 */
export function gaugePosition(pctOffHigh: number | null | undefined): number {
  if (!Number.isFinite(pctOffHigh as number)) return 0.5;
  const p = pctOffHigh as number;
  if (p <= 0) return 1;
  if (p < T_EXTREME_GREED) return 0.75 + ((T_EXTREME_GREED - p) / T_EXTREME_GREED) * 0.25;
  if (p < T_GREED) return 0.5 + ((T_GREED - p) / (T_GREED - T_EXTREME_GREED)) * 0.25;
  if (p <= T_FEAR) return 0.25 + ((T_FEAR - p) / (T_FEAR - T_GREED)) * 0.25;
  if (p <= FULL_SCALE) return ((FULL_SCALE - p) / (FULL_SCALE - T_FEAR)) * 0.25;
  return 0;
}

/** Point on the dial at arc position t (0 = left, 1 = right). */
function at(cx: number, cy: number, r: number, t: number): [number, number] {
  const theta = Math.PI * (1 - t);
  return [cx + r * Math.cos(theta), cy - r * Math.sin(theta)];
}

/** Arc path between two positions. Every band is 45°, so large-arc is always 0;
 *  sweep is 1 because left→top→right is clockwise with y pointing down. */
function arc(cx: number, cy: number, r: number, t0: number, t1: number): string {
  const [x0, y0] = at(cx, cy, r, t0);
  const [x1, y1] = at(cx, cy, r, t1);
  return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r.toFixed(2)},${r.toFixed(2)} 0 0 1 ${x1.toFixed(2)},${y1.toFixed(2)}`;
}

const TICKS: { t: number; text: string }[] = [
  { t: 0, text: `${FULL_SCALE}%+` },
  { t: 0.25, text: `${T_FEAR}%` },
  { t: 0.5, text: `${T_GREED}%` },
  { t: 0.75, text: `${T_EXTREME_GREED}%` },
  { t: 1, text: "0%" },
];

/** Readout metrics. Fixed line heights, not platform defaults — the readout is
 *  absolutely positioned, so if its real height exceeds what the container
 *  reserves it silently draws on top of whatever the card puts underneath. That
 *  is exactly the overlap this file shipped with once. */
const READOUT_TOP = 6;
const NUM_LH = 32;
const CAP_LH = 12;
const READOUT_H = READOUT_TOP + NUM_LH + 1 + CAP_LH + 4;

/** The vivid end of the green ramp, for Extreme Greed. The palette has one
 *  green, and two adjacent bands in the identical colour read as a bug. */
function brightGreen(isDark: boolean): string {
  return isDark ? "#4ADE80" : "#16A34A";
}

/** Colour for a band or for the current label. Exported so the card's badge,
 *  needle and number cannot drift apart from the arc. */
export function moodTint(label: string, c: ReturnType<typeof useColors>, isDark: boolean): string {
  if (label === "Extreme Fear") return c.red;
  if (label === "Fear") return c.amber;
  if (label === "Greed") return c.green;
  if (label === "Extreme Greed") return brightGreen(isDark);
  return c.dim;
}

export function MoodGauge({
  pctOffHigh,
  label,
  caption,
}: {
  /** Percent off the trailing high. null → the dial reads Unknown. */
  pctOffHigh: number | null;
  label: string;
  /** Small line under the number, e.g. "off 252-session high". */
  caption?: string;
}) {
  const c = useColors();
  const isDark = useIsDark();
  const reduced = useReducedMotion();

  // Measured, not assumed — the card is full-width and the phone is not always
  // 390pt wide. Nothing renders until we know the width, which costs one frame
  // and guarantees the dial can never overflow its card.
  const [w, setW] = useState(0);

  const known = label !== "Unknown" && Number.isFinite(pctOffHigh as number);
  const target = known ? gaugePosition(pctOffHigh) : 0.5;

  // The needle sweeps in from the centre on mount. `reduced` respects the OS
  // reduce-motion switch by jumping straight to the value.
  const sweep = useSharedValue(0.5);
  useEffect(() => {
    sweep.value = reduced
      ? target
      : withTiming(target, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [target, reduced, sweep]);

  const tint = moodTint(label, c, isDark);

  // ── geometry ──────────────────────────────────────────────────────────────
  // THE READOUT SITS BELOW THE HUB, NOT IN THE WELL OF THE ARC. Centred in the
  // well it looks right at the two ends and the needle draws a line straight
  // through the digits everywhere in between — the needle sweeps the whole well
  // by definition, so nothing can live there. Below the pivot is the only part
  // of a semicircular dial the needle never visits.
  const SW = Math.max(10, Math.min(16, w * 0.048));       // arc thickness
  // Clamped at both ends: capped so the dial does not become a billboard on a
  // tablet, floored so a freak narrow layout cannot drive the radius — and with
  // it the needle length — negative, which renders a View with a negative width
  // and throws on Android.
  const r = Math.max(46, Math.min((w - SW) / 2 - 6, 128));
  const cx = w / 2;
  const cy = r + SW / 2 + 4;                               // hub / baseline
  const height = cy + READOUT_H;
  // Stops short of the tick labels, which live just inside the rim. A needle
  // long enough to touch them looks like it is pointing AT a number it is not.
  const needleLen = Math.max(12, r - SW - 26);
  // Half a stroke width, as a fraction of the arc — the separation that keeps
  // one band's stroke out of the next one.
  const GAP = SW / 2 / (Math.PI * r);

  const needleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sweep.value * 180}deg` }],
  }));

  // Only the band we are actually in is lit; the other three stay as faint
  // context. A dial with four saturated bands makes the reader hunt for the
  // needle to find out which one counts.
  const bandOpacity = (band: string) => (!known ? 0.16 : label === band ? 1 : 0.18);

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ width: "100%" }}>
      {w > 0 ? (
        <View style={{ height, width: w }}>
          <Svg width={w} height={height}>
            <Defs>
              <LinearGradient id="moodEF" x1="0" y1="1" x2="1" y2="0">
                <Stop offset="0" stopColor={c.red} stopOpacity="0.8" />
                <Stop offset="1" stopColor={c.red} stopOpacity="1" />
              </LinearGradient>
              <LinearGradient id="moodF" x1="0" y1="1" x2="1" y2="0">
                <Stop offset="0" stopColor={c.amber} stopOpacity="0.85" />
                <Stop offset="1" stopColor={c.amber} stopOpacity="1" />
              </LinearGradient>
              <LinearGradient id="moodG" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={c.green} stopOpacity="1" />
                <Stop offset="1" stopColor={c.green} stopOpacity="0.85" />
              </LinearGradient>
              <LinearGradient id="moodEG" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={brightGreen(isDark)} stopOpacity="1" />
                <Stop offset="1" stopColor={brightGreen(isDark)} stopOpacity="0.8" />
              </LinearGradient>
            </Defs>

            {/* Unlit track underneath, so the dial still reads as a dial when
                every band is dimmed — which is the Unknown state. */}
            <Path d={arc(cx, cy, r, 0, 1)} stroke={isDark ? c.card : c.border}
              strokeWidth={SW} fill="none" />

            {/* BUTT CAPS, NOT ROUND, AND A GAP AT EACH INTERNAL BOUNDARY.
                A round cap extends half a stroke width along the path, so a
                round-capped band would bleed into its neighbour and the needle
                would sit on a colour that is not its own band near an edge —
                the one thing this dial exists to get right. Round caps at the
                outer ends have the same problem vertically: the tangent at t=0
                and t=1 points straight down, so the cap would hang below the
                hub line and clip the card. */}
            <Path d={arc(cx, cy, r, 0, 0.25 - GAP)} stroke="url(#moodEF)" strokeWidth={SW}
              fill="none" opacity={bandOpacity("Extreme Fear")} />
            <Path d={arc(cx, cy, r, 0.25 + GAP, 0.5 - GAP)} stroke="url(#moodF)" strokeWidth={SW}
              fill="none" opacity={bandOpacity("Fear")} />
            <Path d={arc(cx, cy, r, 0.5 + GAP, 0.75 - GAP)} stroke="url(#moodG)" strokeWidth={SW}
              fill="none" opacity={bandOpacity("Greed")} />
            <Path d={arc(cx, cy, r, 0.75 + GAP, 1)} stroke="url(#moodEG)" strokeWidth={SW}
              fill="none" opacity={bandOpacity("Extreme Greed")} />

            {/* Boundary ticks, drawn INSIDE the arc. Outside, the end labels
                would sit past the card's edge on a narrow screen. */}
            {TICKS.map(({ t, text }) => {
              const [lx, ly] = at(cx, cy, r - SW / 2 - 11, t);
              return (
                <SvgText
                  key={text}
                  x={lx}
                  y={ly + 3}
                  fill={c.dim}
                  fontSize={9}
                  textAnchor={t === 0 ? "start" : t === 1 ? "end" : "middle"}
                >
                  {text}
                </SvgText>
              );
            })}

            <Circle cx={cx} cy={cy} r={5} fill={tint} opacity={known ? 1 : 0.4} />
          </Svg>

          {/* The needle is a rotated View rather than an SVG path: rotation is
              a native transform, so the sweep runs on the UI thread and never
              re-renders the dial. The container is symmetric about the hub so
              its own centre IS the pivot — no transformOrigin needed. */}
          {known ? (
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: "absolute",
                  left: cx - needleLen,
                  top: cy - 2,
                  width: needleLen * 2,
                  height: 4,
                  justifyContent: "center",
                },
                needleStyle,
              ]}
            >
              <View style={{ width: needleLen, height: 4, borderRadius: 2, backgroundColor: tint }} />
            </Animated.View>
          ) : null}

          {/* Readout, below the hub — see the geometry note. Line heights are
              explicit so the block's real height matches READOUT_H. */}
          <View
            pointerEvents="none"
            style={{ position: "absolute", top: cy + READOUT_TOP, left: 0, right: 0, alignItems: "center" }}
          >
            <Text
              style={{ color: tint, fontSize: 28, lineHeight: NUM_LH, fontWeight: "800", letterSpacing: -0.6 }}
            >
              {known ? `${(pctOffHigh as number).toFixed(1)}%` : "—"}
            </Text>
            {caption ? (
              <Text style={{ color: c.dim, fontSize: 9.5, lineHeight: CAP_LH, marginTop: 1 }}>
                {caption}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}
