import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Segmented } from "@/components/ui";
import { PlaybookPanel } from "@/components/setups/Playbook";
import { SwingLowPanel } from "@/components/setups/SwingLow";
import { EarlyEntryPanel } from "@/components/setups/EarlyEntry";
import { CapitalPanel } from "@/components/setups/Capital";
import { Spacing, TAB_BAR_CLEARANCE, useColors } from "@/lib/theme";

// The web's "Trade Setups" group. Playbook leads because it is the answer the
// other three panels are inputs to; Capital is last because it's configuration.
// Each panel owns its own fetching, so switching tabs never re-triggers a scan.
type Panel = "playbook" | "swing" | "early" | "capital";

export default function SetupsScreen() {
  const c = useColors();
  const [panel, setPanel] = useState<Panel>("playbook");

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: TAB_BAR_CLEARANCE }}
        keyboardShouldPersistTaps="handled"
      >
        <Segmented<Panel>
          scroll
          value={panel}
          onChange={setPanel}
          options={[
            { value: "playbook", label: "Playbook" },
            { value: "swing", label: "Swing Low" },
            { value: "early", label: "Early Entry" },
            { value: "capital", label: "Capital" },
          ]}
        />

        <View style={{ marginTop: Spacing.md }}>
          {panel === "playbook" ? (
            <PlaybookPanel />
          ) : panel === "swing" ? (
            <SwingLowPanel />
          ) : panel === "early" ? (
            <EarlyEntryPanel />
          ) : (
            <CapitalPanel />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
