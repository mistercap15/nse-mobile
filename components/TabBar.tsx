import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useColors } from "@/lib/theme";
import { useAppStore } from "@/lib/store";

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
  const isDark = useAppStore((s) => s.isDark);
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrap,
        {
          bottom: insets.bottom + 10,
          borderColor: isDark ? "rgba(255,255,255,0.10)" : c.border,
          shadowOpacity: isDark ? 0.45 : 0.14,
        },
      ]}
    >
      <BlurView
        intensity={isDark ? 60 : 80}
        tint={isDark ? "dark" : "light"}
        style={StyleSheet.absoluteFill}
      />
      {/* The blur alone reads muddy over bright charts; this keeps contrast. */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: isDark ? "rgba(14,21,37,0.72)" : "rgba(255,255,255,0.82)" },
        ]}
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
              if (Platform.OS !== "web") Haptics.selectionAsync();
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
              <View
                style={[
                  styles.pill,
                  focused && { backgroundColor: c.accentBgStrong, borderColor: c.accentEdge },
                ]}
              >
                <Ionicons
                  name={focused ? meta.active : meta.inactive}
                  size={19}
                  color={focused ? c.accent : c.dim}
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
    paddingVertical: 6,
    // Echoes the bar's own 26 rather than fighting it with a squarer corner.
    borderRadius: 18,
    // Always present, transparent when unselected — otherwise the border
    // appearing on focus would nudge every icon by a pixel.
    borderWidth: 1,
    borderColor: "transparent",
    gap: 3,
  },
  label: { fontSize: 9.5, letterSpacing: 0.2 },
});
