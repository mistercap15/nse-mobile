import React from "react";
import { Pressable } from "react-native";
import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { TabBar, type TabMeta } from "@/components/TabBar";
import { HomeHeaderTitle } from "@/components/HeaderTitle";
import { APP_TITLE } from "@/lib/developer";
import { useColors, useIsDark } from "@/lib/theme";
import { useAppStore } from "@/lib/store";
import { useUpstoxForegroundRefresh } from "@/components/ConnectionBanner";

// Grouped like the web sidebar: Overview / Seasonality / Trade Setups /
// Research, plus About for app info and settings.
const TABS: Record<string, TabMeta & { header: string }> = {
  index:    { label: "Home",     header: APP_TITLE,      active: "home",           inactive: "home-outline" },
  rankings: { label: "Rankings", header: "Rankings",     active: "podium",         inactive: "podium-outline" },
  setups:   { label: "Setups",   header: "Trade Setups", active: "flash",          inactive: "flash-outline" },
  research: { label: "Research", header: "Research",     active: "analytics",      inactive: "analytics-outline" },
  about:    { label: "About",    header: "About",        active: "person-circle",  inactive: "person-circle-outline" },
};

const ORDER = ["index", "rankings", "setups", "research", "about"] as const;

export default function TabLayout() {
  const c = useColors();
  const isDark = useIsDark();
  const setExplicitTheme = useAppStore((s) => s.setExplicitTheme);

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
            onPress={() => setExplicitTheme(!isDark)}
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
          options={{
            title: TABS[name].label,
            // Home carries the app name + byline; the rest are plain labels.
            ...(name === "index"
              ? { headerTitle: () => <HomeHeaderTitle />, headerTitleAlign: "center" as const }
              : { headerTitle: TABS[name].header }),
          }}
        />
      ))}
    </Tabs>
  );
}
