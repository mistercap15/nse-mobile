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
import { AppColors, Radius, Spacing, useColors } from "@/lib/theme";
import { DASH } from "@/lib/format";

// ─────────────────────────────────────────────────────────────────────────────
// The shared primitives every screen is built from — the RN counterparts of the
// web's StatCard / badges / section headers. Anything used on more than one
// screen belongs here so the two clients stay visually in step.
// ─────────────────────────────────────────────────────────────────────────────

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}) {
  const c = useColors();
  return (
    <View
      style={[
        { backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: Radius.md },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Small uppercase label — the web's `text-dim uppercase tracking-widest`. */
export function Label({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  const c = useColors();
  return (
    <Text
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

export function SectionHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Label>{title}</Label>
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
  return (
    <Card style={{ flex, padding: Spacing.md, minWidth: 0 }}>
      <Label style={{ fontSize: 10 }}>{label}</Label>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{ color: color ?? c.text, fontSize: 19, fontWeight: "700", marginTop: 6 }}
      >
        {value}
      </Text>
      {sub ? (
        <Text numberOfLines={2} style={{ color: c.dim, fontSize: 10, marginTop: 3 }}>
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
  return (
    <View
      style={{
        paddingHorizontal: small ? 6 : 8,
        paddingVertical: small ? 2 : 3,
        borderRadius: Radius.sm,
        borderWidth: 1,
        borderColor: color,
        backgroundColor: filled ? color : "transparent",
      }}
    >
      <Text
        style={{
          color: filled ? "#000" : color,
          fontSize: small ? 9 : 10,
          fontWeight: "800",
          letterSpacing: 0.5,
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
  const tint = variant === "danger" ? c.red : c.accent;
  const solid = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          paddingVertical: 12,
          paddingHorizontal: Spacing.lg,
          borderRadius: Radius.md,
          borderWidth: 1,
          borderColor: tint,
          backgroundColor: solid ? tint : "transparent",
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
          flexDirection: "row",
          gap: 8,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={solid ? c.bg : tint} /> : null}
      <Text style={{ color: solid ? c.bg : tint, fontWeight: "700", fontSize: 13 }}>{label}</Text>
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
              paddingHorizontal: 14,
              borderRadius: Radius.sm,
              backgroundColor: active ? c.accent : "transparent",
            }}
          >
            <Text
              style={{
                color: active ? c.bg : c.soft,
                fontSize: 12,
                fontWeight: "700",
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

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  const c = useColors();
  return (
    <View style={styles.centered}>
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
  segmented: {
    flexDirection: "row",
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 3,
    gap: 3,
    alignSelf: "flex-start",
  },
  centered: { alignItems: "center", justifyContent: "center", paddingVertical: 48, paddingHorizontal: Spacing.lg },
  kv: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
});
