import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useColors, useIsDark } from "@/lib/theme";

// ─────────────────────────────────────────────────────────────────────────────
// Floating glass tab bar.
//
// Custom rather than styled-default because the active state is a tinted pill
// wrapping icon *and* label — react-navigation can only style those two
// separately, so the highlight can't enclose both. Five tabs also need tighter
// control over widths than the default item layout gives.
// ─────────────────────────────────────────────────────────────────────────────

export type TabIcon = React.ComponentProps<typeof Ionicons>["name"];

export interface TabMeta {
  active: TabIcon;
  inactive: TabIcon;
  label: string;
}

export function TabBar({
  state,
  navigation,
  tabs,
}: BottomTabBarProps & { tabs: Record<string, TabMeta> }) {
  const c = useColors();
  const isDark = useIsDark();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrap,
        {
          bottom: insets.bottom + 10,
          borderColor: isDark ? "rgba(255,255,255,0.14)" : c.border,
          shadowOpacity: isDark ? 0.45 : 0.14,
        },
      ]}
    >
      {/* experimentalBlurMethod is what actually turns the blur on for Android —
          it defaults to "none" there, which is why this used to be a flat
          translucent slab and needed a near-opaque scrim to look deliberate. */}
      <BlurView
        intensity={isDark ? 72 : 88}
        tint={isDark ? "dark" : "light"}
        experimentalBlurMethod="dimezisBlurView"
        blurReductionFactor={3}
        style={StyleSheet.absoluteFill}
      />

      {/* Thin enough to let the blur read as glass, heavy enough that labels
          stay legible when a bright chart scrolls underneath. */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: isDark ? "rgba(8,12,20,0.45)" : "rgba(255,255,255,0.62)" },
        ]}
      />

      {/* Sheen. Light gathers along the top face of a glass slab and falls off
          fast — without it the bar reads as flat frosted plastic. */}
      <LinearGradient
        pointerEvents="none"
        colors={
          isDark
            ? ["rgba(255,255,255,0.13)", "rgba(255,255,255,0.025)", "rgba(255,255,255,0)"]
            : ["rgba(255,255,255,0.80)", "rgba(255,255,255,0.22)", "rgba(255,255,255,0)"]
        }
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Rim light: the lit edge of the slab, brightest mid-span so it curves
          away at the corners instead of ending abruptly. */}
      <LinearGradient
        pointerEvents="none"
        colors={[
          "rgba(255,255,255,0)",
          isDark ? "rgba(255,255,255,0.40)" : "rgba(255,255,255,0.95)",
          "rgba(255,255,255,0)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.rim}
      />

      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const meta = tabs[route.name];
          if (!meta) return null;

          const focused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={() =>
                navigation.emit({ type: "tabLongPress", target: route.key })
              }
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={meta.label}
              style={styles.item}
            >
              <View style={styles.pill}>
                <Ionicons
                  name={focused ? meta.active : meta.inactive}
                  size={19}
                  color={focused ? c.accent : c.dim}
                />
                {/* Always rendered, transparent when inactive — reserving the
                    space stops the icons shifting as you change tabs. */}
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: focused ? c.accent : "transparent" },
                  ]}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.label,
                    { color: focused ? c.accent : c.dim, fontWeight: focused ? "800" : "600" },
                  ]}
                >
                  {meta.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 14,
    right: 14,
    height: 64,
    borderRadius: 26,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 22,
    elevation: 12,
  },
  row: { flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 6 },
  // Horizontal padding here (not on the pill) is what keeps adjacent
  // highlights from meeting in the middle.
  item: { flex: 1, alignItems: "center", justifyContent: "center", height: "100%", paddingHorizontal: 3 },
  pill: {
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    gap: 2,
  },
  rim: { position: "absolute", top: 0, left: 18, right: 18, height: 1 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  label: { fontSize: 9.5, letterSpacing: 0.2 },
});
