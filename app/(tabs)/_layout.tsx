import React from "react";
import { Pressable } from "react-native";
import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { TabBar, type TabMeta } from "@/components/TabBar";
import { useColors } from "@/lib/theme";
import { useAppStore } from "@/lib/store";
import { useUpstoxForegroundRefresh } from "@/components/ConnectionBanner";

// Grouped like the web sidebar: Overview / Seasonality / Trade Setups /
// Research, plus About for app info and settings.
const TABS: Record<string, TabMeta & { header: string }> = {
  index:    { label: "Home",     header: "NSERank",      active: "home",           inactive: "home-outline" },
  rankings: { label: "Rankings", header: "Rankings",     active: "podium",         inactive: "podium-outline" },
  setups:   { label: "Setups",   header: "Trade Setups", active: "flash",          inactive: "flash-outline" },
  research: { label: "Research", header: "Research",     active: "analytics",      inactive: "analytics-outline" },
  about:    { label: "About",    header: "About",        active: "person-circle",  inactive: "person-circle-outline" },
};

const ORDER = ["index", "rankings", "setups", "research", "about"] as const;

export default function TabLayout() {
  const c = useColors();
  const { isDark, toggleTheme } = useAppStore();

  useUpstoxForegroundRefresh();

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} tabs={TABS} />}
      screenOptions={{
        headerStyle: { backgroundColor: c.bg, elevation: 0, shadowOpacity: 0 },
        headerTintColor: c.text,
        headerTitleStyle: { fontWeight: "800", fontSize: 17, color: c.text, letterSpacing: 0.3 },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: c.bg },
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
      {ORDER.map((name) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{ title: TABS[name].label, headerTitle: TABS[name].header }}
        />
      ))}
    </Tabs>
  );
}
