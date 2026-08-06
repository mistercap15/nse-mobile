import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Radius, Spacing, useColors } from "@/lib/theme";
import { useAppStore } from "@/lib/store";
import { useRankings } from "@/lib/queries";
import { Label } from "./ui";

// ─────────────────────────────────────────────────────────────────────────────
// Symbol search. The universe isn't bundled in the app (§10 — no duplicated
// dataset), so the candidate list is drawn from the current month's rankings
// plus whatever the user has recently viewed. Typing any symbol still works:
// the analysis endpoint takes a free-text symbol.
// ─────────────────────────────────────────────────────────────────────────────

export function StockSearch({ onSelect }: { onSelect: (symbol: string) => void }) {
  const c = useColors();
  const [query, setQuery] = useState("");
  const month = useAppStore((s) => s.selectedMonth);
  const recent = useAppStore((s) => s.recentStocks);
  const { data } = useRankings(month, "ALL", 50);

  const universe = useMemo(() => {
    const all = [
      ...(data?.top_stocks ?? []),
      ...(data?.avoid_stocks ?? []),
      ...(data?.short_candidates ?? []),
    ].map((s) => s.symbol);
    return Array.from(new Set([...recent, ...all]));
  }, [data, recent]);

  const q = query.trim().toUpperCase();
  const matches = useMemo(() => {
    if (!q) return [];
    return universe.filter((s) => s.includes(q)).slice(0, 10);
  }, [q, universe]);

  const submit = (symbol: string) => {
    const s = symbol.trim().toUpperCase();
    if (!s) return;
    setQuery("");
    onSelect(s);
  };

  return (
    <View>
      <View style={[styles.searchBox, { backgroundColor: c.card, borderColor: c.border }]}>
        <Ionicons name="search" size={15} color={c.dim} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => submit(q)}
          placeholder="Search a symbol — e.g. RELIANCE"
          placeholderTextColor={c.dim}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="search"
          style={{ flex: 1, color: c.text, fontSize: 13, paddingVertical: 2 }}
        />
        {query ? (
          <Pressable onPress={() => setQuery("")} hitSlop={10}>
            <Ionicons name="close-circle" size={16} color={c.dim} />
          </Pressable>
        ) : null}
      </View>

      {q && matches.length ? (
        <View style={{ marginTop: Spacing.sm, gap: 4 }}>
          {matches.map((s) => (
            <Pressable
              key={s}
              onPress={() => submit(s)}
              style={({ pressed }) => [
                styles.suggestion,
                { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={{ color: c.text, fontSize: 13, fontWeight: "600" }}>{s}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {!q && recent.length ? (
        <View style={{ marginTop: Spacing.md }}>
          <Label>Recent</Label>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 6, marginTop: Spacing.sm }}>
              {recent.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => submit(s)}
                  style={{
                    paddingVertical: 7,
                    paddingHorizontal: 12,
                    borderRadius: Radius.sm,
                    borderWidth: 1,
                    borderColor: c.border,
                    backgroundColor: c.card,
                  }}
                >
                  <Text style={{ color: c.soft, fontSize: 12, fontWeight: "600" }}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  suggestion: { borderWidth: 1, borderRadius: Radius.sm, paddingVertical: 9, paddingHorizontal: 12 },
});
