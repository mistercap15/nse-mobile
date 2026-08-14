import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Radius, Spacing, Type, elevation, hairline, useColors, useIsDark } from "@/lib/theme";

// ─────────────────────────────────────────────────────────────────────────────
// The Home banner. One large gradient panel carrying the month, the market's
// posture and a couple of headline figures.
//
// The point is hierarchy: a screen of equal-weight cards gives the eye nowhere
// to land, so the thing you open the app to check gets to be visibly the
// biggest thing on it.
// ─────────────────────────────────────────────────────────────────────────────

export function Hero({
  eyebrow,
  title,
  subtitle,
  accentWord,
  stats,
  tone,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  /** Rendered in accent after the title — e.g. the regime label. */
  accentWord?: string;
  stats?: { label: string; value: string; color?: string }[];
  /** Colours the wash: the regime's own colour, so the mood matches the data. */
  tone?: string;
}) {
  const c = useColors();
  const isDark = useIsDark();
  const base = tone ?? c.accent;

  return (
    <View style={[styles.wrap, { backgroundColor: c.card }, elevation(isDark, 3, base)]}>
      {/* Clipping lives on this inner layer; the shadow is on the parent,
          because iOS drops a shadow when the same view sets overflow:hidden. */}
      <View style={[StyleSheet.absoluteFill, styles.clip, { borderColor: hairline(c, isDark) }]}>
      <LinearGradient
        colors={
          isDark
            ? [`${base}4D`, `${base}17`, "transparent"]
            : [`${base}33`, `${base}0F`, "transparent"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Two offset blooms. One reads as a flat vignette; a second in a
          different hue gives the panel depth and a bit of life. */}
      <View style={[styles.bloom, { backgroundColor: base, opacity: isDark ? 0.3 : 0.16 }]} />
      <View
        style={[
          styles.bloomAlt,
          { backgroundColor: c.purple, opacity: isDark ? 0.2 : 0.1 },
        ]}
      />
      </View>

      <View style={{ padding: Spacing.lg }}>
        <Text style={[styles.eyebrow, { color: c.dim }]}>{eyebrow}</Text>

        <Text style={[styles.title, { color: c.text }]}>
          {title}
          {accentWord ? <Text style={{ color: base }}> {accentWord}</Text> : null}
        </Text>

        {subtitle ? (
          <Text style={[styles.subtitle, { color: c.soft }]}>{subtitle}</Text>
        ) : null}

        {stats?.length ? (
          <View style={[styles.stats, { borderTopColor: hairline(c, isDark) }]}>
            {stats.map((s) => (
              <View key={s.label} style={{ flex: 1 }}>
                <Text style={[styles.statValue, { color: s.color ?? c.text }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: c.dim }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: Radius.xl },
  clip: { borderRadius: Radius.xl, borderWidth: 1, overflow: "hidden" },
  bloom: {
    position: "absolute",
    top: -80,
    right: -55,
    width: 210,
    height: 210,
    borderRadius: 105,
  },
  bloomAlt: {
    position: "absolute",
    bottom: -90,
    left: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  eyebrow: { fontSize: 10, fontWeight: "700", letterSpacing: 1.4, textTransform: "uppercase" },
  title: { fontSize: 29, fontWeight: "800", letterSpacing: -0.7, marginTop: 8 },
  subtitle: { fontSize: 12, lineHeight: 17, marginTop: 7 },
  stats: { flexDirection: "row", gap: Spacing.md, marginTop: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: 1 },
  statValue: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3, ...Type.numeric },
  statLabel: { fontSize: 9.5, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase", marginTop: 3 },
});
