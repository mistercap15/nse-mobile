import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useQueries } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Card, EmptyState, Label, SectionHeader, SkeletonCard, useFillCount } from "@/components/ui";
import { request } from "@/lib/client";
import { queryKeys } from "@/lib/queries";
import { MONTH_FULL, currentMonthIST, pct } from "@/lib/format";
import { Radius, Spacing, deltaColor, signalColor, useColors } from "@/lib/theme";
import type { RankingsResponse } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Seasonal calendar — the year at a glance. Twelve parallel rankings calls, the
// same as the web page does; React Query dedupes them against whatever the
// Rankings tab already fetched, so revisiting is cheap.
// ─────────────────────────────────────────────────────────────────────────────

const TOP = 5;

export default function CalendarScreen() {
  const c = useColors();
  const router = useRouter();
  const now = currentMonthIST();
  // Fill the viewport rather than stopping after a fixed few.
  const skeletonCards = useFillCount(100, 120);

  const results = useQueries({
    queries: Array.from({ length: 12 }, (_, i) => ({
      queryKey: queryKeys.rankings(i + 1, "ALL", TOP),
      queryFn: () =>
        request<RankingsResponse>("/api/rankings", {
          params: { month: i + 1, sector: "ALL", top: TOP },
          timeoutMs: 45_000,
        }),
      staleTime: 30 * 60_000,
    })),
  });

  const loading = results.some((r) => r.isLoading);
  const anyData = results.some((r) => r.data);

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: Spacing.md, paddingBottom: Spacing.xxl }}
    >
      <Label>Twelve months of seasonal edge</Label>
      <Text style={{ color: c.dim, fontSize: 11, marginTop: 6, lineHeight: 16 }}>
        The strongest and weakest names for each month. Tap any symbol for its full history.
      </Text>

      {loading && !anyData ? (
        <View style={{ marginTop: Spacing.lg }}>
          <View style={{ gap: Spacing.sm }}>
            {Array.from({ length: skeletonCards }, (_, i) => (
              <SkeletonCard key={i} height={54} />
            ))}
          </View>
        </View>
      ) : !anyData ? (
        <EmptyState emoji="🗓️" title="No calendar data" hint="The rankings service returned nothing." />
      ) : (
        <View style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
          {results.map((r, i) => {
            const month = i + 1;
            const isNow = month === now;
            const longs = r.data?.top_stocks?.slice(0, TOP) ?? [];
            const avoid = r.data?.avoid_stocks?.slice(0, 3) ?? [];

            return (
              <Card
                key={month}
                style={{
                  padding: Spacing.md,
                  borderColor: isNow ? c.accent : c.border,
                  borderWidth: isNow ? 1.5 : 1,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ color: isNow ? c.accent : c.text, fontSize: 14, fontWeight: "700" }}>
                    {MONTH_FULL[i]}
                  </Text>
                  {isNow ? (
                    <Text style={{ color: c.accent, fontSize: 9, fontWeight: "700", letterSpacing: 0.6 }}>
                      THIS MONTH
                    </Text>
                  ) : null}
                  <View style={{ flex: 1 }} />
                  {r.isLoading ? (
                    <Text style={{ color: c.dim, fontSize: 10 }}>loading…</Text>
                  ) : null}
                </View>

                {longs.length ? (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: Spacing.sm }}>
                    {longs.map((s) => (
                      <Pressable
                        key={s.symbol}
                        onPress={() => router.push(`/stock/${s.symbol}` as never)}
                        style={{
                          paddingVertical: 5,
                          paddingHorizontal: 9,
                          borderRadius: Radius.sm,
                          borderWidth: 1,
                          borderColor: c.border,
                          backgroundColor: c.surface,
                        }}
                      >
                        <Text style={{ color: c.text, fontSize: 11, fontWeight: "700" }}>
                          {s.symbol}
                        </Text>
                        <Text
                          style={{
                            color: signalColor(c, s.win_rate),
                            fontSize: 9,
                            fontWeight: "600",
                            marginTop: 1,
                          }}
                        >
                          {s.win_rate?.toFixed(0)}% ·{" "}
                          <Text style={{ color: deltaColor(c, s.median_return) }}>
                            {pct(s.median_return)}
                          </Text>
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : r.isLoading ? null : (
                  <Text style={{ color: c.dim, fontSize: 11, marginTop: 6 }}>
                    No qualifying longs.
                  </Text>
                )}

                {avoid.length ? (
                  <Text style={{ color: c.dim, fontSize: 10, marginTop: Spacing.sm, lineHeight: 15 }}>
                    Avoid: {avoid.map((s) => s.symbol).join(", ")}
                  </Text>
                ) : null}
              </Card>
            );
          })}
        </View>
      )}

      <SectionHeader title="Reading this" icon="help-circle" />
      <Text style={{ color: c.dim, fontSize: 11, lineHeight: 16 }}>
        Each pill shows the month&apos;s win rate and median return. These are historical
        frequencies over completed months, not forecasts — a 90% win rate on six years is a much
        smaller claim than the same number on eighteen.
      </Text>
    </ScrollView>
  );
}
