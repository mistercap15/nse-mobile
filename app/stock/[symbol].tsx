import React, { useEffect } from "react";
import { ScrollView } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { StockAnalysis } from "@/components/StockAnalysis";
import { useAppStore } from "@/lib/store";
import { Spacing, useColors } from "@/lib/theme";

// Per-symbol page, pushed from any list. Same view as the Analysis tab so the
// numbers can't drift between the two entry points.
export default function StockDetailScreen() {
  const c = useColors();
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const addRecent = useAppStore((s) => s.addRecentStock);

  const sym = (symbol ?? "").toUpperCase();

  useEffect(() => {
    if (sym) addRecent(sym);
  }, [sym, addRecent]);

  return (
    <>
      <Stack.Screen options={{ title: sym || "Stock" }} />
      <ScrollView
        style={{ backgroundColor: c.bg }}
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: Spacing.xxl }}
      >
        {sym ? <StockAnalysis symbol={sym} /> : null}
      </ScrollView>
    </>
  );
}
