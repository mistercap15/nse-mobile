import React from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Badge, Button, Card, Label, SectionHeader } from "@/components/ui";
import { signOut } from "@/lib/client";
import { API_BASE, IS_LOCAL_API } from "@/lib/config";
import { APP_TITLE, DEVELOPER } from "@/lib/developer";
import { useSession, useUpstoxStatus } from "@/lib/queries";
import { useUpstoxConnect } from "@/lib/useUpstoxConnect";
import { useAppStore } from "@/lib/store";
import { untilExpiry } from "@/lib/format";
import { Radius, Spacing, TAB_BAR_CLEARANCE, useColors } from "@/lib/theme";

// ─────────────────────────────────────────────────────────────────────────────
// About + settings.
//
// Doubles as the app's only diagnostics surface: which backend it's talking to,
// how long the session has left, and whether Upstox is live — the three things
// worth checking when a screen shows "—" and you want to know why.
// ─────────────────────────────────────────────────────────────────────────────

const openURL = (url: string) => {
  Linking.openURL(url).catch(() =>
    Alert.alert("Couldn't open link", "No app on this device can handle that link."),
  );
};

function Row({
  icon,
  label,
  value,
  onPress,
  valueColor,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value?: string;
  onPress?: () => void;
  valueColor?: string;
}) {
  const c = useColors();
  const body = (
    <View style={styles.row}>
      <Ionicons name={icon} size={16} color={c.dim} style={{ width: 22 }} />
      <Text style={{ color: c.soft, fontSize: 12, flex: 1 }}>{label}</Text>
      {value ? (
        <Text
          numberOfLines={1}
          style={{ color: valueColor ?? c.text, fontSize: 12, fontWeight: "600", maxWidth: "55%" }}
        >
          {value}
        </Text>
      ) : null}
      {onPress ? <Ionicons name="chevron-forward" size={14} color={c.dim} /> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      {body}
    </Pressable>
  );
}

export default function AboutScreen() {
  const c = useColors();
  const { isDark, toggleTheme } = useAppStore();
  const session = useSession();
  const upstox = useUpstoxStatus();
  const { connect, connecting } = useUpstoxConnect();

  const version = Constants.expoConfig?.version ?? "1.0.0";
  const connected = Boolean(upstox.data?.connected && !upstox.data?.expired);

  const confirmSignOut = () => {
    Alert.alert(
      "Sign out?",
      "You'll need your PIN and a fresh Upstox connection to get back in.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign out", style: "destructive", onPress: () => void signOut() },
      ],
    );
  };

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: TAB_BAR_CLEARANCE }}>
        {/* Identity */}
        <View style={{ alignItems: "center", paddingVertical: Spacing.lg }}>
          <View
            style={{
              width: 62,
              height: 62,
              borderRadius: Radius.lg,
              backgroundColor: c.accentBg,
              borderWidth: 1,
              borderColor: c.accent,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="trending-up" size={28} color={c.accent} />
          </View>
          <Text style={{ color: c.text, fontSize: 24, fontWeight: "800", marginTop: Spacing.md }}>
            {APP_TITLE}
            <Text style={{ color: c.accent }}>.</Text>
          </Text>
          <Text style={{ fontSize: 13, fontWeight: "700", marginTop: 3 }}>
            <Text style={{ color: c.dim }}>by </Text>
            <Text style={{ color: c.accent }}>{DEVELOPER.name}</Text>
          </Text>
          <Text style={{ color: c.dim, fontSize: 12, marginTop: 6 }}>
            F&amp;O seasonality &amp; trade setups · v{version}
          </Text>
        </View>

        <Card style={{ padding: Spacing.md }}>
          <Text style={{ color: c.soft, fontSize: 12, lineHeight: 18 }}>
            Ranks the NSE F&amp;O universe by historical monthly seasonal edge, then layers on live
            price tooling — position sizing, a swing-low mean-reversion screener and early-entry
            scanning. A personal tool, not a product.
          </Text>
        </Card>

        {/* Developer */}
        <SectionHeader title="Developer" />
        <Card style={{ padding: Spacing.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: Radius.full,
                backgroundColor: c.purple,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 17, fontWeight: "800" }}>
                {DEVELOPER.name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.text, fontSize: 15, fontWeight: "700" }}>
                {DEVELOPER.name}
              </Text>
              <Text style={{ color: c.dim, fontSize: 11, marginTop: 2 }}>{DEVELOPER.tagline}</Text>
            </View>
          </View>

          <View style={{ marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 4 }}>
            <Row
              icon="mail-outline"
              label="Email"
              value={DEVELOPER.email}
              onPress={() => openURL(`mailto:${DEVELOPER.email}`)}
            />
            <Row
              icon="logo-github"
              label="GitHub"
              value={`@${DEVELOPER.github.split("/").pop()}`}
              onPress={() => openURL(DEVELOPER.github)}
            />
            <Row
              icon="code-slash-outline"
              label="Source"
              value="NSE-Dashboard"
              onPress={() => openURL(DEVELOPER.repo)}
            />
          </View>
        </Card>

        {/* Connection */}
        <SectionHeader title="Connection" />
        <Card style={{ padding: Spacing.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ color: c.soft, fontSize: 12 }}>Upstox</Text>
            <Badge
              text={connected ? "CONNECTED" : upstox.data?.expired ? "EXPIRED" : "NOT CONNECTED"}
              color={connected ? c.green : upstox.data?.expired ? c.amber : c.dim}
              small
            />
          </View>
          {!connected ? (
            <Button
              label={connecting ? "Connecting…" : "Connect Upstox"}
              onPress={connect}
              loading={connecting}
              style={{ marginTop: Spacing.md }}
            />
          ) : null}

          <View style={{ marginTop: Spacing.sm, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 4 }}>
            <Row
              icon="time-outline"
              label="Session ends in"
              value={untilExpiry(session.data?.expiresAt ?? null)}
            />
            <Row
              icon="cloud-outline"
              label="Backend"
              value={API_BASE.replace(/^https?:\/\//, "")}
              valueColor={IS_LOCAL_API ? c.amber : undefined}
            />
          </View>

          <Text style={{ color: c.dim, fontSize: 10, marginTop: Spacing.sm, lineHeight: 15 }}>
            Upstox tokens expire at 03:30 IST daily and there is no refresh token — reconnecting
            once a day is expected, not a fault. Everything except Swing Low and Early Entry works
            without it.
          </Text>
        </Card>

        {/* Settings */}
        <SectionHeader title="Settings" />
        <Card style={{ padding: Spacing.md }}>
          <View style={styles.row}>
            <Ionicons name={isDark ? "moon-outline" : "sunny-outline"} size={16} color={c.dim} style={{ width: 22 }} />
            <Text style={{ color: c.soft, fontSize: 12, flex: 1 }}>Dark theme</Text>
            <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ true: c.accent, false: c.muted }} />
          </View>
        </Card>

        <View style={{ marginTop: Spacing.md }}>
          <Button label="Sign out" variant="danger" onPress={confirmSignOut} />
        </View>

        {/* Method + disclaimer */}
        <SectionHeader title="How to read the numbers" />
        <Card style={{ padding: Spacing.md }}>
          <Label style={{ fontSize: 10 }}>Data</Label>
          <Text style={{ color: c.soft, fontSize: 11, marginTop: 5, lineHeight: 17 }}>
            Seasonality comes from a monthly-return snapshot going back to 2009, refreshed when a
            month closes. Real price levels come from Upstox daily candles. The app computes almost
            nothing itself — it renders what the same backend serves the web dashboard, so the two
            never disagree.
          </Text>

          <Label style={{ fontSize: 10, marginTop: Spacing.md }}>Caveat</Label>
          <Text style={{ color: c.soft, fontSize: 11, marginTop: 5, lineHeight: 17 }}>
            Win rates are historical frequencies over completed months, not forecasts. A 90% win
            rate on six years is a far smaller claim than the same figure on eighteen, which is why
            sample sizes sit next to every statistic and the significance mark (✓ / ≈) is shown at
            all. Backtests are in-sample by construction. Nothing here is investment advice.
          </Text>
        </Card>

        <Text style={{ color: c.dim, fontSize: 10, textAlign: "center", marginTop: Spacing.xl }}>
          Built with Expo · © {new Date().getFullYear()} {DEVELOPER.name}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10 },
});
