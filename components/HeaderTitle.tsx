import React from "react";
import { Text, View } from "react-native";
import { useColors } from "@/lib/theme";
import { APP_TITLE, DEVELOPER } from "@/lib/developer";

// ─────────────────────────────────────────────────────────────────────────────
// Home's navigation-bar title: the app name with the developer byline under it.
//
// Two lines because a single "NSE Ranking by Khilan Patel" runs ~250pt at header
// weight, which crowds the theme toggle on a 375pt screen. Stacking keeps the
// name legible and leaves the header its normal height.
// ─────────────────────────────────────────────────────────────────────────────
export function HomeHeaderTitle() {
  const c = useColors();
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ color: c.text, fontSize: 16, fontWeight: "800", letterSpacing: 0.2 }}>
        {APP_TITLE}
      </Text>
      <Text style={{ fontSize: 10, fontWeight: "700", marginTop: 1 }}>
        <Text style={{ color: c.dim }}>by </Text>
        <Text style={{ color: c.accent }}>{DEVELOPER.name}</Text>
      </Text>
    </View>
  );
}
