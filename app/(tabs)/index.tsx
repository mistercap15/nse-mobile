import React from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ConnectionBanner } from "@/components/ConnectionBanner";
import { RegimeBanner } from "@/components/Banners";
import { StockRow } from "@/components/StockRow";
import {
  Card,
  ErrorState,
  Label,
  SectionHeader,
  SkeletonScreen,
  StatCard,
  StatRow,
} from "@/components/ui";
import { useRankings, useSession } from "@/lib/queries";
import { useAppStore } from "@/lib/store";
import { MONTH_FULL, currentMonthIST, num, pct, untilExpiry } from "@/lib/format";
import { Radius, Spacing, TAB_BAR_CLEARANCE, deltaColor, useColors } from "@/lib/theme";

// ─────────────────────────────────────────────────────────────────────────────
// Overview. The month you're in, what it favours, and one tap into each tool.
// Everything here is snapshot-derived, so the whole screen works without Upstox.
// ─────────────────────────────────────────────────────────────────────────────

const QUICK_LINKS: {
  href: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}[] = [
  { href: "/rankings", label: "Rankings", icon: "podium-outline" },
  { href: "/setups", label: "Setups", icon: "flash-outline" },
  { href: "/research/screener", label: "Screener", icon: "funnel-outline" },
  { href: "/research/backtest", label: "Backtest", icon: "trending-up-outline" },
];

export default function HomeScreen() {
  const c = useColors();
  const router = useRouter();
  const month = currentMonthIST();
  const recent = useAppStore((s) => s.recentStocks);
  const session = useSession();

  const { data, isLoading, isRefetching, error, refetch } = useRankings(month, "ALL", 50);

  const top = data?.top_stocks ?? [];
  const avgWR = top.length
    ? top.reduce((a, s) => a + (s.win_rate ?? 0), 0) / top.length
    : null;
  const significant = top.filter((s) => s.sig?.significant).length;

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: TAB_BAR_CLEARANCE }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.accent} />
        }
      >
        <ConnectionBanner />

        <Label>Current month</Label>
        <Text style={{ color: c.text, fontSize: 30, fontWeight: "800", marginTop: 6 }}>
          {MONTH_FULL[month - 1]}
          <Text style={{ color: c.accent }}>.</Text>
        </Text>
        <Text style={{ color: c.dim, fontSize: 12, marginTop: 4 }}>
          {data?.calendar?.expiry
            ? `F&O expiry in ${data.calendar.expiry.daysAway} days — ${data.calendar.expiry.date}`
            : "Seasonal edge across the F&O universe"}
        </Text>

        {isLoading ? (
          <View style={{ marginTop: Spacing.lg }}>
            <SkeletonScreen rows={5} stats={3} />
          </View>
        ) : error ? (
          <ErrorState message={(error as Error).message} onRetry={refetch} />
        ) : (
          <>
            <View style={{ marginTop: Spacing.md }}>
              <StatRow>
                <StatCard label="Candidates" value={num(top.length)} sub="ranked longs" />
                <StatCard
                  label="Avg win rate"
                  value={avgWR != null ? `${avgWR.toFixed(0)}%` : "—"}
                  color={c.green}
                />
                <StatCard
                  label="Significant"
                  value={`${significant}/${top.length}`}
                  sub="p<0.05"
                  color={c.accent}
                />
              </StatRow>
            </View>

            <View style={{ marginTop: Spacing.md }}>
              <RegimeBanner regime={data?.regime} />
            </View>

            {/* Quick links */}
            <SectionHeader title="Jump to" />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm }}>
              {QUICK_LINKS.map((l) => (
                <Pressable
                  key={l.href}
                  onPress={() => router.push(l.href as never)}
                  style={({ pressed }) => ({
                    flexBasis: "47%",
                    flexGrow: 1,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Card style={{ padding: Spacing.md, flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: Radius.sm,
                        backgroundColor: c.accentBg,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name={l.icon} size={16} color={c.accent} />
                    </View>
                    <Text style={{ color: c.text, fontSize: 13, fontWeight: "700" }}>{l.label}</Text>
                  </Card>
                </Pressable>
              ))}
            </View>

            <SectionHeader
              title={`Top ${MONTH_FULL[month - 1]} names`}
              right={
                <Pressable onPress={() => router.push("/rankings" as never)}>
                  <Text style={{ color: c.accent, fontSize: 11, fontWeight: "700" }}>See all</Text>
                </Pressable>
              }
            />
            <View style={{ gap: Spacing.sm }}>
              {top.slice(0, 5).map((s, i) => (
                <StockRow key={s.symbol} stock={s} rank={i + 1} />
              ))}
            </View>

            {data?.avoid_stocks?.length ? (
              <>
                <SectionHeader title="Worth avoiding" />
                <Card style={{ padding: Spacing.md }}>
                  {data.avoid_stocks.slice(0, 4).map((s) => (
                    <Pressable
                      key={s.symbol}
                      onPress={() => router.push(`/stock/${s.symbol}` as never)}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        paddingVertical: 6,
                      }}
                    >
                      <Text style={{ color: c.soft, fontSize: 12, fontWeight: "600" }}>
                        {s.symbol}
                      </Text>
                      <Text style={{ color: deltaColor(c, s.median_return), fontSize: 12, fontWeight: "700" }}>
                        {pct(s.median_return)} · {s.win_rate?.toFixed(0)}% WR
                      </Text>
                    </Pressable>
                  ))}
                </Card>
              </>
            ) : null}

            {recent.length ? (
              <>
                <SectionHeader title="Recently viewed" />
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {recent.map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => router.push(`/stock/${s}` as never)}
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
              </>
            ) : null}

            {session.data?.expiresAt ? (
              <Text style={{ color: c.dim, fontSize: 10, marginTop: Spacing.xl, textAlign: "center" }}>
                Session ends in {untilExpiry(session.data.expiresAt)} · re-login at 03:30 IST
              </Text>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
