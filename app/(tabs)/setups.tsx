import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Segmented } from "@/components/ui";
import { SizingPanel } from "@/components/setups/Sizing";
import { SwingLowPanel } from "@/components/setups/SwingLow";
import { EarlyEntryPanel } from "@/components/setups/EarlyEntry";
import { Spacing, TAB_BAR_CLEARANCE, useColors } from "@/lib/theme";

// The web's "Trade Setups" sidebar group, collapsed into one tab. Each panel
// owns its own data fetching, so switching tabs doesn't re-trigger a scan.
type Panel = "sizing" | "swing" | "early";

export default function SetupsScreen() {
  const c = useColors();
  const [panel, setPanel] = useState<Panel>("sizing");

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: TAB_BAR_CLEARANCE }}
        keyboardShouldPersistTaps="handled"
      >
        <Segmented<Panel>
          value={panel}
          onChange={setPanel}
          options={[
            { value: "sizing", label: "Sizing" },
            { value: "swing", label: "Swing Low" },
            { value: "early", label: "Early Entry" },
          ]}
        />

        <View style={{ marginTop: Spacing.md }}>
          {panel === "sizing" ? (
            <SizingPanel />
          ) : panel === "swing" ? (
            <SwingLowPanel />
          ) : (
            <EarlyEntryPanel />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
