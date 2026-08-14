import React, { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  StyleSheet,
  View,
  useWindowDimensions,
  type DimensionValue,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Radius, Spacing, TAB_BAR_CLEARANCE, hairline, useColors, useIsDark } from "@/lib/theme";

// ─────────────────────────────────────────────────────────────────────────────
// Loading placeholders with a shimmer sweep.
//
// Two rules:
//   1. The shape mirrors the real content — a row skeleton is laid out like a
//      StockRow, a chart skeleton like a chart card — so nothing jumps when data
//      lands.
//   2. It FILLS the screen. A fixed handful of rows left the lower half blank,
//      which reads as a broken screen rather than a loading one, so the row
//      count is derived from the viewport and whatever sits above it.
// ─────────────────────────────────────────────────────────────────────────────

const DURATION = 1150;
const ROW_H = 62;
const ROW_GAP = Spacing.sm;
const STATROW_H = 86;
const CHART_H = 196;

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => alive && setReduced(v));
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

/**
 * How many rows it takes to reach the bottom of the screen, given what's
 * already above them. Clamped so a short screen still shows a few and a tablet
 * doesn't render dozens.
 */
function useFillRows(usedAbove: number): number {
  return useFillCount(ROW_H + ROW_GAP, usedAbove);
}

/**
 * Same idea for any repeated block — calendar months, strategy cards — so those
 * screens don't stop halfway down either.
 */
export function useFillCount(itemHeight: number, usedAbove = 0, max = 12): number {
  const { height } = useWindowDimensions();
  const available = height - usedAbove - TAB_BAR_CLEARANCE;
  return Math.max(3, Math.min(max, Math.floor(available / itemHeight)));
}

export function Skeleton({
  width = "100%",
  height = 14,
  radius = Radius.sm,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const c = useColors();
  const isDark = useIsDark();
  const reduced = useReducedMotion();
  const [w, setW] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduced || w === 0) return;
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration: DURATION, easing: Easing.inOut(Easing.quad) }),
      -1,
      false,
    );
  }, [reduced, w, progress]);

  const sweep = useAnimatedStyle(() => ({
    transform: [{ translateX: -w + progress.value * (w * 2) }],
  }));

  const highlight = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)";

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[
        { width, height, borderRadius: radius, backgroundColor: c.surface, overflow: "hidden" },
        style,
      ]}
    >
      {!reduced && w > 0 ? (
        <Animated.View style={[StyleSheet.absoluteFill, sweep]}>
          <LinearGradient
            colors={["transparent", highlight, "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

function Shell({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const c = useColors();
  const isDark = useIsDark();
  return (
    <View
      style={[
        { backgroundColor: c.card, borderColor: hairline(c, isDark), borderWidth: 1, borderRadius: Radius.lg },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Placeholder shaped like a StockRow: stripe, symbol + sector, two stats. */
export function SkeletonRow() {
  const c = useColors();
  return (
    <Shell style={styles.row}>
      <View style={[styles.stripe, { backgroundColor: c.surface }]} />
      <Skeleton width={14} height={10} />
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton width="45%" height={13} />
        <Skeleton width="70%" height={9} />
      </View>
      <View style={{ gap: 6, alignItems: "flex-end" }}>
        <Skeleton width={38} height={13} />
        <Skeleton width={26} height={8} />
      </View>
      <View style={{ gap: 6, alignItems: "flex-end" }}>
        <Skeleton width={44} height={13} />
        <Skeleton width={30} height={8} />
      </View>
    </Shell>
  );
}

export function SkeletonList({ rows = 6 }: { rows?: number }) {
  return (
    <View style={{ gap: ROW_GAP }}>
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonRow key={i} />
      ))}
    </View>
  );
}

/** Placeholder shaped like a row of StatCards. */
export function SkeletonStatRow({ count = 3 }: { count?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: Spacing.sm }}>
      {Array.from({ length: count }, (_, i) => (
        <Shell key={i} style={{ flex: 1, padding: Spacing.md }}>
          <Skeleton width="65%" height={8} />
          <Skeleton width="50%" height={18} style={{ marginTop: 8 }} />
          <Skeleton width="80%" height={8} style={{ marginTop: 6 }} />
        </Shell>
      ))}
    </View>
  );
}

/** A generic card-sized block, for charts and panels. */
export function SkeletonCard({ height = 150 }: { height?: number }) {
  return (
    <Shell style={{ padding: Spacing.md }}>
      <Skeleton width="40%" height={10} />
      <Skeleton height={height} style={{ marginTop: Spacing.sm }} />
    </Shell>
  );
}

/** Chart card: caption line above a tall block. */
export function SkeletonChart({ height = 150 }: { height?: number }) {
  return (
    <Shell style={{ padding: Spacing.md }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Skeleton width="35%" height={9} />
        <Skeleton width="18%" height={9} />
      </View>
      <Skeleton height={height} style={{ marginTop: Spacing.md }} />
    </Shell>
  );
}

/** The Home banner. */
export function SkeletonHero() {
  return (
    <Shell style={{ padding: Spacing.lg, borderRadius: Radius.xl }}>
      <Skeleton width="30%" height={9} />
      <Skeleton width="55%" height={28} style={{ marginTop: 10 }} />
      <Skeleton width="80%" height={11} style={{ marginTop: 9 }} />
      <View style={{ flexDirection: "row", gap: Spacing.md, marginTop: Spacing.lg }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ flex: 1, gap: 5 }}>
            <Skeleton width="60%" height={17} />
            <Skeleton width="85%" height={8} />
          </View>
        ))}
      </View>
    </Shell>
  );
}

/** Wrapping pills, for the calendar and sector-rotation cards. */
export function SkeletonPills({ count = 5 }: { count?: number }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} width={72} height={30} radius={Radius.sm} />
      ))}
    </View>
  );
}

/**
 * The default full-screen loading state. Composes the pieces a screen actually
 * has, then fills whatever height is left with rows so the lower half is never
 * blank.
 *
 * `rows` can be pinned; leave it out to auto-fill.
 */
export function SkeletonScreen({
  rows,
  stats = 3,
  hero = false,
  charts = 0,
  usedAbove = 0,
}: {
  rows?: number;
  stats?: number;
  hero?: boolean;
  charts?: number;
  /** Height of controls already rendered above this skeleton. */
  usedAbove?: number;
}) {
  const consumed =
    usedAbove +
    (hero ? 210 : 0) +
    (stats ? STATROW_H + Spacing.md : 0) +
    charts * (CHART_H + Spacing.md) +
    120; // header + section label + breathing room

  const auto = useFillRows(consumed);
  const count = rows ?? auto;

  return (
    <View style={{ gap: Spacing.md }}>
      {hero ? <SkeletonHero /> : null}
      {stats ? <SkeletonStatRow count={stats} /> : null}
      {Array.from({ length: charts }, (_, i) => (
        <SkeletonChart key={i} />
      ))}
      {count > 0 ? <SkeletonList rows={count} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingLeft: Spacing.md + 4,
    paddingRight: Spacing.md,
    gap: Spacing.sm,
    overflow: "hidden",
  },
  stripe: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3.5 },
});
