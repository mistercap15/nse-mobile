import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Radius, Spacing, useColors } from "@/lib/theme";
import { MONTHS, currentMonthIST } from "@/lib/format";

// Horizontal month strip. The current IST month is marked so the user can tell
// "this month" from whichever one they're browsing.
export function MonthPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (m: number) => void;
}) {
  const c = useColors();
  const now = currentMonthIST();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 6, paddingVertical: 2 }}
    >
      {MONTHS.map((m, i) => {
        const month = i + 1;
        const active = month === value;
        return (
          <Pressable
            key={m}
            onPress={() => onChange(month)}
            style={{
              paddingVertical: 7,
              paddingHorizontal: 13,
              borderRadius: Radius.sm,
              borderWidth: 1,
              borderColor: active ? c.accent : c.border,
              backgroundColor: active ? c.accent : c.card,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={{ color: active ? c.bg : c.soft, fontSize: 12, fontWeight: "700" }}>
                {m}
              </Text>
              {month === now ? (
                <View
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: active ? c.bg : c.accent,
                  }}
                />
              ) : null}
            </View>
          </Pressable>
        );
      })}
      <View style={{ width: Spacing.md }} />
    </ScrollView>
  );
}
