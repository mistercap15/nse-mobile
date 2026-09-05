import React, { useCallback, useMemo, useRef } from "react";
import { PanResponder, StyleSheet, Text, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useColors, useIsDark } from "@/lib/theme";

// ─────────────────────────────────────────────────────────────────────────────
// Floating glass tab bar.
//
// Custom rather than styled-default because the active state is a tinted pill
// wrapping icon *and* label — react-navigation can only style those two
// separately, so the highlight can't enclose both. Five tabs also need tighter
// control over widths than the default item layout gives.
//
// The whole row is one touch responder rather than five Pressables, so a
// finger can be dragged across it and the tab changes as it crosses each slot.
// That needs a single view tracking the touch for the life of the gesture —
// five siblings each owning their own press cannot hand the touch between
// themselves mid-drag.
// ─────────────────────────────────────────────────────────────────────────────

/** Matches styles.row's paddingHorizontal; the slot maths has to subtract it. */
const ROW_PAD = 6;

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

  // Only the routes this bar actually draws. The slide indexes into these, not
  // into state.routes, which may carry routes with no tab.
  const items = useMemo(() => {
    const out: { route: (typeof state.routes)[number]; index: number; meta: TabMeta }[] = [];
    state.routes.forEach((route, index) => {
      const meta = tabs[route.name];
      if (meta) out.push({ route, index, meta });
    });
    return out;
  }, [state.routes, tabs]);

  const goTo = useCallback(
    (slot: number) => {
      const it = items[slot];
      if (!it) return;
      const event = navigation.emit({
        type: "tabPress",
        target: it.route.key,
        canPreventDefault: true,
      });
      if (state.index !== it.index && !event.defaultPrevented) {
        navigation.navigate(it.route.name);
      }
    },
    [items, navigation, state.index],
  );

  // The responder is built once and must survive the gesture, so everything it
  // reads goes through a ref — rebuilding it mid-drag would drop the touch.
  const widthRef = useRef(0);
  const countRef = useRef(items.length);
  const goToRef = useRef(goTo);
  const lastSlot = useRef(-1);
  countRef.current = items.length;
  goToRef.current = goTo;

  const slotAt = (x: number) => {
    const usable = widthRef.current - ROW_PAD * 2;
    const n = countRef.current;
    if (usable <= 0 || !n) return -1;
    const slot = Math.floor(((x - ROW_PAD) / usable) * n);
    return Math.max(0, Math.min(n - 1, slot));
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const slot = slotAt(e.nativeEvent.locationX);
        lastSlot.current = slot;
        if (slot >= 0) goToRef.current(slot);
      },
      onPanResponderMove: (e) => {
        const slot = slotAt(e.nativeEvent.locationX);
        // Only on crossing into a different slot — every move event otherwise
        // re-navigates to the tab the finger is already sitting on.
        if (slot >= 0 && slot !== lastSlot.current) {
          lastSlot.current = slot;
          goToRef.current(slot);
        }
      },
      onPanResponderRelease: () => {
        lastSlot.current = -1;
      },
      onPanResponderTerminate: () => {
        lastSlot.current = -1;
      },
      // The bar floats over scrollables; nothing underneath should be able to
      // steal a drag that started here.
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

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
          { backgroundColor: isDark ? "rgba(7,11,18,0.82)" : "rgba(255,255,255,0.82)" },
        ]}
      />

      <View
        style={styles.row}
        onLayout={(e) => {
          widthRef.current = e.nativeEvent.layout.width;
        }}
        {...pan.panHandlers}
      >
        {items.map(({ route, index, meta }, slot) => {
          const focused = state.index === index;

          return (
            // Not a Pressable: the row owns the touch so the drag can carry
            // across slots. onAccessibilityTap keeps screen-reader activation
            // working, which is what Pressable was providing here.
            <View
              key={route.key}
              accessible
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={meta.label}
              onAccessibilityTap={() => goTo(slot)}
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
            </View>
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
  row: { flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: ROW_PAD },
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
  dot: { width: 4, height: 4, borderRadius: 2 },
  label: { fontSize: 9.5, letterSpacing: 0.2 },
});
