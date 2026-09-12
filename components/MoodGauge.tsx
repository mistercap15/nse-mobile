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
// The Market Mood dial — how far the Nifty has fallen from its own trailing
// high, as a needle on a three-zone arc.
//
// THE SCALE IS PIECEWISE, AND THE TICK LABELS SAY SO. Each regime owns exactly
// one third of the arc: 0-5% Healthy, 5-10% Caution, 10-20%+ Correction. A
// straight linear 0→20 scale would give Healthy a quarter of the dial and paint
// half of it red, which both overstates the alarm and crushes the 5% boundary —
// the edge a reader actually cares about — into a sliver. Equal thirds put both
// boundaries at the two obvious points on the dial, and the printed ticks (0 /
// 5 / 10 / 20+) keep the compression visible instead of hidden. The honest
// number is printed in full underneath regardless; the arc is the glance.
//
// Beyond 20% the needle PINS at the right stop rather than running off. A 25%
// and a 40% drawdown are the same message at this resolution, and a dial that
// silently rescales its own end stop is a dial you cannot read twice.
//
// Geometry is hand-drawn for the same reason as charts.tsx: this is ~60 lines
// of trigonometry and a gauge library would cost a dependency and the palette.
// ─────────────────────────────────────────────────────────────────────────────

/** Drawdown at the right-hand stop. Past this the needle pins. */
const FULL_SCALE = 20;

/** Zone edges, in percent off the high — must match THRESHOLDS in the
 *  dashboard's app/lib/marketRegime.js. They are duplicated rather than fetched
 *  because they are drawing constants here, not a decision: the label on the
 *  payload is always the server's, never re-derived from these. */
const HEALTHY_MAX = 5;
const CAUTION_MAX = 10;

/**
 * Drawdown → position along the arc, 0 (left, at the high) to 1 (right, pinned).
 * Piecewise so each zone gets a third — see the note above.
 */
export function gaugePosition(pctOffHigh: number | null | undefined): number {
  if (!Number.isFinite(pctOffHigh as number)) return 0;
  const p = pctOffHigh as number;
  if (p <= 0) return 0;
  if (p <= HEALTHY_MAX) return p / HEALTHY_MAX / 3;
  if (p <= CAUTION_MAX) return 1 / 3 + (p - HEALTHY_MAX) / (CAUTION_MAX - HEALTHY_MAX) / 3;
  if (p <= FULL_SCALE) return 2 / 3 + (p - CAUTION_MAX) / (FULL_SCALE - CAUTION_MAX) / 3;
  return 1;
}

/** Point on the dial at arc position t (0 = left, 1 = right). */
function at(cx: number, cy: number, r: number, t: number): [number, number] {
  const theta = Math.PI * (1 - t);
  return [cx + r * Math.cos(theta), cy - r * Math.sin(theta)];
}

/** Arc path between two positions. Every segment is 60°, so large-arc is
 *  always 0; sweep is 1 because left→top→right is clockwise with y pointing
 *  down. */
function arc(cx: number, cy: number, r: number, t0: number, t1: number): string {
  const [x0, y0] = at(cx, cy, r, t0);
  const [x1, y1] = at(cx, cy, r, t1);
  return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r.toFixed(2)},${r.toFixed(2)} 0 0 1 ${x1.toFixed(2)},${y1.toFixed(2)}`;
}

const TICKS: { t: number; text: string }[] = [
  { t: 0, text: "0%" },
  { t: 1 / 3, text: `${HEALTHY_MAX}%` },
  { t: 2 / 3, text: `${CAUTION_MAX}%` },
  { t: 1, text: `${FULL_SCALE}%+` },
];

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
  const target = known ? gaugePosition(pctOffHigh) : 0;

  // The needle sweeps up from zero on mount. `reduced` respects the OS
  // reduce-motion switch by jumping straight to the value.
  const sweep = useSharedValue(0);
  useEffect(() => {
    if (!known) {
      sweep.value = 0;
      return;
    }
    sweep.value = reduced
      ? target
      : withTiming(target, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [known, target, reduced, sweep]);

  const tint =
    label === "Healthy" ? c.green
      : label === "Caution" ? c.amber
        : label === "Correction" ? c.red
          : c.dim;

  // ── geometry ──────────────────────────────────────────────────────────────
  // THE READOUT SITS BELOW THE HUB, NOT IN THE WELL OF THE ARC. Centred in the
  // well it looks right at 0% and at 20%, and the needle draws a line straight
  // through the digits everywhere in between — the needle sweeps the whole well
  // by definition, so nothing can live there. Below the pivot is the only
  // region of a semicircular dial the needle never visits.
  const SW = Math.max(10, Math.min(16, w * 0.048));       // arc thickness
  // Clamped at both ends: capped so the dial does not become a billboard on a
  // tablet, floored so a freak narrow layout cannot drive the radius — and
  // with it the needle length below — negative, which renders a View with a
  // negative width and throws on Android.
  const r = Math.max(46, Math.min((w - SW) / 2 - 6, 128));
  const cx = w / 2;
  const cy = r + SW / 2 + 4;                               // hub / baseline
  const READOUT_H = 46;                                    // number + caption
  const height = cy + READOUT_H;
  // Stops short of the tick labels, which live just inside the rim. A needle
  // long enough to touch them looks like it is pointing AT a number it is not.
  const needleLen = Math.max(12, r - SW - 26);
  // Half a stroke width, as a fraction of the arc — the separation that keeps
  // one zone's stroke out of the next one.
  const GAP = SW / 2 / (Math.PI * r);

  const needleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sweep.value * 180}deg` }],
  }));

  // Only the zone we are actually in is lit; the other two stay as faint
  // context. A dial with three saturated bands makes the reader hunt for the
  // needle to find out which one counts.
  const zoneOpacity = (zone: string) => (!known ? 0.16 : label === zone ? 1 : 0.18);

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ width: "100%" }}>
      {w > 0 ? (
        <View style={{ height, width: w }}>
          <Svg width={w} height={height}>
            <Defs>
              <LinearGradient id="moodGreen" x1="0" y1="1" x2="1" y2="0">
                <Stop offset="0" stopColor={c.green} stopOpacity="0.75" />
                <Stop offset="1" stopColor={c.green} stopOpacity="1" />
              </LinearGradient>
              <LinearGradient id="moodAmber" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={c.amber} stopOpacity="0.85" />
                <Stop offset="1" stopColor={c.amber} stopOpacity="1" />
              </LinearGradient>
              <LinearGradient id="moodRed" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={c.red} stopOpacity="1" />
                <Stop offset="1" stopColor={c.red} stopOpacity="0.75" />
              </LinearGradient>
            </Defs>

            {/* Unlit track underneath, so the dial still reads as a dial when
                every zone is dimmed — which is the Unknown state. */}
            <Path
              d={arc(cx, cy, r, 0, 1)}
              stroke={isDark ? c.card : c.border}
              strokeWidth={SW}
              fill="none"
            />

            {/* BUTT CAPS, NOT ROUND, AND A GAP AT EACH INTERNAL BOUNDARY.
                A round cap extends half a stroke width along the path, so a
                round-capped red segment starting at 2/3 would bleed ~7px
                backwards into the amber zone and a round-capped green would
                bleed forwards out of it — the needle would then sit on a colour
                that is not its own zone near a boundary, which is the one thing
                this dial exists to get right. Round caps at the outer ends have
                the same problem vertically: the tangent at t=0 and t=1 points
                straight down, so the cap would hang below the hub line and clip
                the card. GAP is half a stroke width expressed in arc position,
                which leaves a crisp hairline between zones at any size. */}
            <Path d={arc(cx, cy, r, 0, 1 / 3 - GAP)} stroke="url(#moodGreen)" strokeWidth={SW}
              fill="none" opacity={zoneOpacity("Healthy")} />
            <Path d={arc(cx, cy, r, 1 / 3 + GAP, 2 / 3 - GAP)} stroke="url(#moodAmber)"
              strokeWidth={SW} fill="none" opacity={zoneOpacity("Caution")} />
            <Path d={arc(cx, cy, r, 2 / 3 + GAP, 1)} stroke="url(#moodRed)" strokeWidth={SW}
              fill="none" opacity={zoneOpacity("Correction")} />

            {/* Boundary ticks, drawn INSIDE the arc. Outside, the 0% and 20%+
                labels would sit past the card's edge on a narrow screen. */}
            {TICKS.map(({ t, text }) => {
              const [lx, ly] = at(cx, cy, r - SW / 2 - 11, t);
              const anchor = t === 0 ? "start" : t === 1 ? "end" : "middle";
              return (
                <SvgText
                  key={text}
                  x={lx}
                  y={ly + 3}
                  fill={c.dim}
                  fontSize={9}
                  textAnchor={anchor}
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
              <View
                style={{
                  width: needleLen,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: tint,
                }}
              />
            </Animated.View>
          ) : null}

          {/* Readout, below the hub — see the geometry note. */}
          <View
            pointerEvents="none"
            style={{ position: "absolute", top: cy + 6, left: 0, right: 0, alignItems: "center" }}
          >
            <Text style={{ color: tint, fontSize: 28, fontWeight: "800", letterSpacing: -0.6 }}>
              {known ? `${(pctOffHigh as number).toFixed(1)}%` : "—"}
            </Text>
            {caption ? (
              <Text style={{ color: c.dim, fontSize: 9.5, marginTop: 1 }}>{caption}</Text>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}
