import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import {
  AppColors,
  Radius,
  Spacing,
  Type,
  elevation,
  hairline,
  surfaceGradient,
  tintGradient,
  useColors,
  useIsDark,
} from "@/lib/theme";
import { DASH } from "@/lib/format";

// ─────────────────────────────────────────────────────────────────────────────
// The shared primitives every screen is built from — the RN counterparts of the
// web's StatCard / badges / section headers. Anything used on more than one
// screen belongs here so the two clients stay visually in step.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Surface primitive. A flat fill reads as a rectangle; a two-stop gradient plus
 * a hairline gives the card an edge and a little light, which is most of what
 * separates "boxes of data" from something that looks designed.
 *
 * `tint` washes the surface with a status colour — used sparingly, for the one
 * card on a screen that deserves the eye.
 */
export function Card({
  children,
  style,
  tint,
  level = 1,
  flat = false,
  stripe,
  radius = Radius.lg,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  tint?: string;
  level?: 1 | 2 | 3;
  flat?: boolean;
  /** Colour bar down the left edge, clipped to the card's corners. */
  stripe?: string;
  radius?: number;
}) {
  const c = useColors();
  const isDark = useIsDark();
  const colors = tint ? tintGradient(tint, isDark) : surfaceGradient(c, isDark);

  // iOS clips a shadow when the same view sets overflow:hidden, so the shadow
  // lives on the outer view and the clipping on the inner one.
  return (
    <View
      style={[
        { borderRadius: radius, backgroundColor: c.card },
        !flat && elevation(isDark, level, tint ?? stripe),
        style,
      ]}
    >
      {/* Everything decorative lives inside this clipped layer, so bars follow
          the card's curve instead of squaring off at the corners. A 3px bar
          cannot fake an 18px radius on its own. */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: radius,
            borderWidth: 1,
            // Tint at partial alpha: a full-strength border on a small card
            // reads as an alert box rather than an accent.
            borderColor: tint ? `${tint}59` : hairline(c, isDark),
            overflow: "hidden",
          },
        ]}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {stripe ? (
          <LinearGradient
            colors={[stripe, `${stripe}99`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3.5 }}
          />
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** Small uppercase label — the web's `text-dim uppercase tracking-widest`. */
export function Label({
  children,
  style,
  numberOfLines,
}: {
  children: React.ReactNode;
  style?: TextStyle;
  numberOfLines?: number;
}) {
  const c = useColors();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        { color: c.dim, fontSize: 11, fontWeight: "600", letterSpacing: 1.2, textTransform: "uppercase" },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function ScreenTitle({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  const c = useColors();
  return (
    <View style={{ marginBottom: Spacing.lg }}>
      <Label>{eyebrow}</Label>
      <Text style={{ color: c.text, fontSize: 28, fontWeight: "800", marginTop: 6 }}>
        {title}
        <Text style={{ color: c.accent }}>.</Text>
      </Text>
      {subtitle ? (
        <Text style={{ color: c.dim, fontSize: 12, marginTop: 6, lineHeight: 17 }}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

export function SectionHeader({
  title,
  right,
  icon,
  tint,
}: {
  title: string;
  right?: React.ReactNode;
  /** Ionicons name. Falls back to the accent rule when omitted. */
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  tint?: string;
}) {
  const c = useColors();
  const isDark = useIsDark();
  const color = tint ?? c.accent;
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
        {icon ? (
          // A small tinted chip. Gives each section a glanceable identity
          // instead of six identical grey captions down the screen.
          <View style={[styles.sectionIcon, { backgroundColor: tintGradient(color, isDark)[0] }]}>
            <Ionicons name={icon} size={12} color={color} />
          </View>
        ) : (
          <View style={{ width: 3, height: 13, borderRadius: 2, backgroundColor: color }} />
        )}
        <Label numberOfLines={1}>{title}</Label>
      </View>
      {right}
    </View>
  );
}

// ── StatCard — {label, value, sub, color} exactly as the web's ──────────────

export function StatCard({
  label,
  value,
  sub,
  color,
  flex = 1,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  flex?: number;
}) {
  const c = useColors();
  // No bar along the top edge. At an 18px corner radius a 2.5px line at y=0
  // falls almost entirely outside the card's silhouette at both ends, so it
  // reads as a detached floating line however it's clipped or inset. The tinted
  // surface carries the same meaning and follows the curve.
  return (
    <Card tint={color} style={{ flex, padding: Spacing.md, minWidth: 0 }}>
      <Label style={{ fontSize: 9.5, letterSpacing: 0.9 }} numberOfLines={1}>
        {label}
      </Label>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{
          color: color ?? c.text,
          fontSize: 21,
          fontWeight: "800",
          letterSpacing: -0.4,
          marginTop: 7,
          ...Type.numeric,
        }}
      >
        {value}
      </Text>
      {sub ? (
        <Text numberOfLines={2} style={{ color: c.dim, fontSize: 10, marginTop: 4, lineHeight: 14 }}>
          {sub}
        </Text>
      ) : null}
    </Card>
  );
}

export function StatRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.statRow}>{children}</View>;
}

// ── Badges ──────────────────────────────────────────────────────────────────

export function Badge({
  text,
  color,
  filled = false,
  small = false,
}: {
  text: string;
  color: string;
  filled?: boolean;
  small?: boolean;
}) {
  const isDark = useIsDark();
  // Outlined badges get a faint wash of their own colour rather than sitting
  // hollow — legible at 9px without shouting.
  const wash = tintGradient(color, isDark)[0];
  return (
    <View
      style={{
        paddingHorizontal: small ? 7 : 9,
        paddingVertical: small ? 2.5 : 4,
        borderRadius: Radius.full,
        borderWidth: 1,
        borderColor: filled ? color : `${color}66`,
        backgroundColor: filled ? color : wash,
      }}
    >
      <Text
        style={{
          color: filled ? (isDark ? "#0A0A0A" : "#FFFFFF") : color,
          fontSize: small ? 9 : 10,
          fontWeight: "800",
          letterSpacing: 0.6,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

/** Statistical-significance mark from the rankings t-test: ✓ or ≈. */
export function SigMark({ significant }: { significant?: boolean }) {
  const c = useColors();
  if (significant === undefined) return null;
  return (
    <Text style={{ color: significant ? c.green : c.dim, fontSize: 12, fontWeight: "700" }}>
      {significant ? "✓" : "≈"}
    </Text>
  );
}

// ── Buttons ─────────────────────────────────────────────────────────────────

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const c = useColors();
  const isDark = useIsDark();
  const tint = variant === "danger" ? c.red : c.accent;
  const solid = variant === "primary";
  const onSolid = isDark ? "#08101F" : "#FFFFFF";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          borderRadius: Radius.full,
          borderWidth: 1,
          borderColor: solid ? "transparent" : `${tint}80`,
          overflow: "hidden",
          opacity: disabled ? 0.4 : 1,
          // Scale beats an opacity dip: it reads as a press rather than a
          // momentary render glitch.
          transform: [{ scale: pressed ? 0.975 : 1 }],
        },
        solid && !disabled && elevation(isDark, 2),
        style,
      ]}
    >
      {solid ? (
        // Only "primary" is solid, so this is always the accent→purple ramp.
        // Destructive actions stay outlined on purpose: a big filled red button
        // invites the tap it is trying to make you think about.
        <LinearGradient
          colors={[tint, c.purple]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: tintGradient(tint, isDark)[0] }]} />
      )}
      <View style={styles.buttonInner}>
        {loading ? <ActivityIndicator size="small" color={solid ? onSolid : tint} /> : null}
        <Text style={{ color: solid ? onSolid : tint, fontWeight: "800", fontSize: 13, letterSpacing: 0.2 }}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

/** Horizontal segmented control — used for sub-screens and long/short toggles. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  scroll = false,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  scroll?: boolean;
}) {
  const c = useColors();
  const content = (
    <View style={[styles.segmented, { backgroundColor: c.surface, borderColor: c.border }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 15,
              borderRadius: Radius.full,
              backgroundColor: active ? c.accent : "transparent",
            }}
          >
            <Text
              style={{
                color: active ? c.bg : c.soft,
                fontSize: 12,
                fontWeight: active ? "800" : "600",
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
  if (!scroll) return content;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {content}
    </ScrollView>
  );
}

// ── States ──────────────────────────────────────────────────────────────────

export function Loading({ text = "Loading…", sub }: { text?: string; sub?: string }) {
  const c = useColors();
  return (
    <View style={styles.centered}>
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: Radius.full,
          backgroundColor: c.accentBg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={c.accent} />
      </View>
      <Text style={{ color: c.soft, fontSize: 13, marginTop: 12, fontWeight: "600" }}>{text}</Text>
      {sub ? (
        <Text style={{ color: c.dim, fontSize: 11, marginTop: 5, textAlign: "center", lineHeight: 16 }}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

export function EmptyState({
  title,
  hint,
  emoji = "🔍",
}: {
  title: string;
  hint?: string;
  emoji?: string;
}) {
  const c = useColors();
  return (
    <View style={styles.centered}>
      <Text style={{ fontSize: 30, marginBottom: 10 }}>{emoji}</Text>
      <Text style={{ color: c.soft, fontSize: 14, fontWeight: "600", textAlign: "center" }}>
        {title}
      </Text>
      {hint ? (
        <Text style={{ color: c.dim, fontSize: 12, marginTop: 6, textAlign: "center", lineHeight: 17 }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const c = useColors();
  return (
    <View style={styles.centered}>
      <Text style={{ fontSize: 30, marginBottom: 10 }}>⚠️</Text>
      <Text style={{ color: c.red, fontSize: 13, fontWeight: "700" }}>Something went wrong</Text>
      <Text style={{ color: c.dim, fontSize: 12, marginTop: 6, textAlign: "center", lineHeight: 17 }}>
        {message}
      </Text>
      {onRetry ? <Button label="Try again" variant="ghost" onPress={onRetry} style={{ marginTop: Spacing.md }} /> : null}
    </View>
  );
}

// Loading placeholders live in ./Skeleton; re-exported so screens keep a single
// import from "@/components/ui".
export {
  Skeleton,
  SkeletonRow,
  SkeletonList,
  SkeletonStatRow,
  SkeletonCard,
  SkeletonScreen,
  SkeletonChart,
  SkeletonHero,
  SkeletonPills,
  useFillCount,
} from "./Skeleton";

// ── Key/value line, used inside expanded rows ───────────────────────────────

export function KV({
  k,
  v,
  color,
  mono = true,
}: {
  k: string;
  v: string | null | undefined;
  color?: string;
  mono?: boolean;
}) {
  const c = useColors();
  return (
    <View style={styles.kv}>
      <Text style={{ color: c.dim, fontSize: 11 }}>{k}</Text>
      <Text
        style={{
          color: color ?? c.text,
          fontSize: 12,
          fontWeight: mono ? "700" : "500",
        }}
      >
        {v || DASH}
      </Text>
    </View>
  );
}

export function makeStyles<T extends Record<string, ViewStyle | TextStyle>>(fn: (c: AppColors) => T) {
  return fn;
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  statRow: { flexDirection: "row", gap: Spacing.sm },
  sectionIcon: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  segmented: {
    flexDirection: "row",
    borderRadius: Radius.full,
    borderWidth: 1,
    padding: 3,
    gap: 3,
    alignSelf: "flex-start",
  },
  buttonInner: {
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  centered: { alignItems: "center", justifyContent: "center", paddingVertical: 48, paddingHorizontal: Spacing.lg },
  kv: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
});
