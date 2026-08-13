import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Radius, Spacing, useColors } from "@/lib/theme";
import { useAppStore } from "@/lib/store";
import { useUniverse } from "@/lib/queries";
import { num } from "@/lib/format";
import { Label } from "./ui";

// ─────────────────────────────────────────────────────────────────────────────
// Symbol search over the whole F&O universe.
//
// This used to scrape candidates out of the current month's rankings, which is
// about 75 of the 181 names — so typing any of the other 106 produced no
// suggestion at all. It now reads /api/universe, which is snapshot-derived,
// needs no Upstox and is fetched once per session.
//
// Ranking: exact match, then prefix, then substring, so typing "REL" puts
// RELIANCE at the top rather than burying it behind an alphabetical accident.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_RESULTS = 12;

export function StockSearch({ onSelect }: { onSelect: (symbol: string) => void }) {
  const c = useColors();
  const [query, setQuery] = useState("");
  const recent = useAppStore((s) => s.recentStocks);
  const { data, isLoading, error } = useUniverse();

  const universe = useMemo(() => data?.symbols ?? [], [data]);
  const q = query.trim().toUpperCase();

  const matches = useMemo(() => {
    if (!q) return [];
    const scored = universe
      .map((s) => {
        const sym = s.symbol;
        if (sym === q) return { s, rank: 0 };
        if (sym.startsWith(q)) return { s, rank: 1 };
        if (sym.includes(q)) return { s, rank: 2 };
        // Sector is worth matching too — "BANK" should surface the banks.
        if (s.sector?.toUpperCase().includes(q)) return { s, rank: 3 };
        return null;
      })
      .filter((x): x is { s: (typeof universe)[number]; rank: number } => x !== null)
      .sort((a, b) => a.rank - b.rank || a.s.symbol.localeCompare(b.s.symbol));
    return scored.slice(0, MAX_RESULTS).map((x) => x.s);
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
          placeholder={
            isLoading ? "Loading symbols…" : `Search ${num(universe.length || 181)} F&O stocks`
          }
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

      {error ? (
        <Text style={{ color: c.amber, fontSize: 11, marginTop: 6 }}>
          Couldn&apos;t load the symbol list — you can still type a symbol exactly and press search.
        </Text>
      ) : null}

      {q ? (
        matches.length ? (
          <View style={{ marginTop: Spacing.sm, gap: 4 }}>
            {matches.map((s) => (
              <Pressable
                key={s.symbol}
                onPress={() => submit(s.symbol)}
                style={({ pressed }) => [
                  styles.suggestion,
                  { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: c.text, fontSize: 13, fontWeight: "700" }}>{s.symbol}</Text>
                  {s.sector ? (
                    <Text style={{ color: c.dim, fontSize: 10, marginTop: 1 }}>{s.sector}</Text>
                  ) : null}
                </View>
                {s.lotSize ? (
                  <Text style={{ color: c.dim, fontSize: 10 }}>lot {num(s.lotSize)}</Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={{ color: c.dim, fontSize: 11, marginTop: 8 }}>
            No F&amp;O stock matches “{q}”.
          </Text>
        )
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
  suggestion: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
});
