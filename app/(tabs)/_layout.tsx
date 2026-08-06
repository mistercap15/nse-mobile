import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useColors } from "@/lib/theme";
import { useAppStore } from "@/lib/store";
import { useUpstoxForegroundRefresh } from "@/components/ConnectionBanner";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

// Grouped like the web sidebar: Overview / Seasonality / Trade Setups / Research.
const TABS: {
  name: string;
  title: string;
  header: string;
  active: IoniconName;
  inactive: IoniconName;
}[] = [
  { name: "index",    title: "Home",     header: "NSERank",       active: "home",      inactive: "home-outline" },
  { name: "rankings", title: "Rankings", header: "Rankings",      active: "podium",    inactive: "podium-outline" },
  { name: "setups",   title: "Setups",   header: "Trade Setups",  active: "flash",     inactive: "flash-outline" },
  { name: "research", title: "Research", header: "Research",      active: "analytics", inactive: "analytics-outline" },
];

const TAB_HEIGHT = 62;
const RADIUS = 32;

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { isDark, toggleTheme } = useAppStore();

  useUpstoxForegroundRefresh();

  return (
    <Tabs
      screenOptions={{
        // Floating pill, so content scrolls underneath it.
        tabBarStyle: {
          position: "absolute",
          left: 16,
          right: 16,
          bottom: insets.bottom + 12,
          height: TAB_HEIGHT,
          borderRadius: RADIUS,
          borderTopWidth: 0,
          elevation: 0,
          backgroundColor: "transparent",
          borderWidth: 1,
          borderColor: c.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDark ? 0.35 : 0.12,
          shadowRadius: 20,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={isDark ? 70 : 90}
            tint={isDark ? "dark" : "light"}
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: RADIUS,
                overflow: "hidden",
                backgroundColor: isDark ? "rgba(14,21,37,0.65)" : "rgba(255,255,255,0.80)",
              },
            ]}
          />
        ),
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.dim,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700", letterSpacing: 0.3, marginTop: -2 },
        tabBarItemStyle: { paddingTop: 10, paddingBottom: 8 },

        headerStyle: { backgroundColor: c.bg, elevation: 0, shadowOpacity: 0 },
        headerTintColor: c.text,
        headerTitleStyle: { fontWeight: "800", fontSize: 17, color: c.text, letterSpacing: 0.3 },
        headerShadowVisible: false,
        headerRight: () => (
          <Pressable
            onPress={toggleTheme}
            hitSlop={12}
            style={{ marginRight: 16, padding: 6 }}
            accessibilityLabel="Toggle light and dark theme"
          >
            <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={18} color={c.soft} />
          </Pressable>
        ),
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            headerTitle: tab.header,
            tabBarIcon: ({ focused, color }) => (
              <View style={{ alignItems: "center", minWidth: 28 }}>
                <Ionicons name={focused ? tab.active : tab.inactive} size={21} color={color} />
                {focused ? (
                  <View
                    style={{ width: 4, height: 4, borderRadius: 2, marginTop: 4, backgroundColor: c.accent }}
                  />
                ) : null}
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
