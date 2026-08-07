import React, { useEffect, useState } from "react";
import { AccessibilityInfo, StyleSheet, View, type DimensionValue, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Radius, Spacing, useColors, useIsDark } from "@/lib/theme";

// ─────────────────────────────────────────────────────────────────────────────
// Loading placeholders with a shimmer sweep.
//
// The shapes deliberately mirror the real content — a row skeleton is laid out
// like a StockRow, a stat skeleton like a StatCard — so the screen doesn't
// visibly re-flow the moment data lands. Generic grey bars would be less work
// but the jump between placeholder and content is what reads as cheap.
//
// The sweep width comes from onLayout rather than a guess, so it stays correct
// across screen sizes, and it's skipped entirely when the OS asks for reduced
// motion.
// ─────────────────────────────────────────────────────────────────────────────

const DURATION = 1150;

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

/** Placeholder shaped like a StockRow: rank, symbol + sector, two stats. */
export function SkeletonRow() {
  const c = useColors();
  return (
    <View style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}>
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
    </View>
  );
}

export function SkeletonList({ rows = 6 }: { rows?: number }) {
  return (
    <View style={{ gap: Spacing.sm }}>
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonRow key={i} />
      ))}
    </View>
  );
}

/** Placeholder shaped like a row of StatCards. */
export function SkeletonStatRow({ count = 3 }: { count?: number }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", gap: Spacing.sm }}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={[styles.stat, { backgroundColor: c.card, borderColor: c.border }]}
        >
          <Skeleton width="65%" height={8} />
          <Skeleton width="50%" height={18} style={{ marginTop: 8 }} />
          <Skeleton width="80%" height={8} style={{ marginTop: 6 }} />
        </View>
      ))}
    </View>
  );
}

/** A generic card-sized block, for charts and panels. */
export function SkeletonCard({ height = 150 }: { height?: number }) {
  const c = useColors();
  return (
    <View
      style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}
    >
      <Skeleton width="40%" height={10} />
      <Skeleton height={height} style={{ marginTop: Spacing.sm }} />
    </View>
  );
}

/**
 * The default full-screen loading state: a stat row over a list, which is the
 * shape almost every screen in the app resolves to.
 */
export function SkeletonScreen({ rows = 6, stats = 3 }: { rows?: number; stats?: number }) {
  return (
    <View style={{ gap: Spacing.md }}>
      <SkeletonStatRow count={stats} />
      <SkeletonList rows={rows} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: 13,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  stat: { flex: 1, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md },
  card: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md },
});
