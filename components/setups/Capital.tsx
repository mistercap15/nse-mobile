import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Card, Label, SectionHeader, StatCard, StatRow } from "@/components/ui";
import { useAppStore } from "@/lib/store";
import { num, rupeesCompact } from "@/lib/format";
import { Radius, Spacing, hairline, useColors, useIsDark } from "@/lib/theme";

// ─────────────────────────────────────────────────────────────────────────────
// Capital — the money settings the rest of the app sizes against.
//
// This was the Sizing screen, which ranked and allocated across fifty names.
// The Playbook does that now, for the handful of trades actually worth taking,
// so what's left here is the inputs: how much you have, how much you keep back,
// and what a typical lot costs. Everything is persisted locally.
// ─────────────────────────────────────────────────────────────────────────────

function MoneyInput({
  label,
  hint,
  icon,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  value: number;
  onChange: (n: number) => void;
}) {
  const c = useColors();
  const isDark = useIsDark();
  const [text, setText] = useState(String(value));

  // Commit on blur so a half-typed number never re-runs anything downstream.
  const commit = () => {
    const n = Number(text.replace(/[^0-9.]/g, ""));
    const next = Number.isFinite(n) && n >= 0 ? n : value;
    onChange(next);
    setText(String(next));
  };

  return (
    <Card style={{ padding: Spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={[styles.icon, { backgroundColor: c.accentBg }]}>
          <Ionicons name={icon} size={15} color={c.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Label style={{ fontSize: 10 }}>{label}</Label>
          <Text style={{ color: c.dim, fontSize: 10, marginTop: 2, lineHeight: 14 }}>{hint}</Text>
        </View>
      </View>
      <View style={[styles.inputRow, { borderColor: hairline(c, isDark), backgroundColor: c.surface }]}>
        <Text style={{ color: c.soft, fontSize: 16, fontWeight: "700" }}>₹</Text>
        <TextInput
          value={text}
          onChangeText={setText}
          onBlur={commit}
          onSubmitEditing={commit}
          keyboardType="number-pad"
          returnKeyType="done"
          selectTextOnFocus
          style={{ flex: 1, color: c.text, fontSize: 18, fontWeight: "800", paddingVertical: 8 }}
        />
        <Text style={{ color: c.dim, fontSize: 11 }}>{rupeesCompact(value)}</Text>
      </View>
    </Card>
  );
}

export function CapitalPanel() {
  const c = useColors();
  const sizing = useAppStore((s) => s.sizing);
  const setSizing = useAppStore((s) => s.setSizing);

  const usable = Math.max(0, sizing.capital - sizing.reserve);
  const lots = sizing.avgLotCost > 0 ? Math.floor(usable / sizing.avgLotCost) : 0;
  const reservePct =
    sizing.capital > 0 ? Math.round((sizing.reserve / sizing.capital) * 100) : 0;

  return (
    <View>
      <Label>Money settings</Label>
      <Text style={{ color: c.dim, fontSize: 11, marginTop: 6, lineHeight: 16 }}>
        What the Playbook sizes against. Changed here, applied everywhere — nothing else to set up.
      </Text>

      <View style={{ marginTop: Spacing.md }}>
        <StatRow>
          <StatCard label="Usable" value={rupeesCompact(usable)} sub="capital − reserve" color={c.accent} />
          <StatCard label="Lot budget" value={num(lots)} sub="at avg lot cost" />
          <StatCard label="Held back" value={`${reservePct}%`} sub={rupeesCompact(sizing.reserve)} color={c.amber} />
        </StatRow>
      </View>

      <SectionHeader icon="wallet" title="Your capital" />
      <View style={{ gap: Spacing.sm }}>
        <MoneyInput
          icon="cash-outline"
          label="Trading capital"
          hint="Total you're willing to put behind F&O positions."
          value={sizing.capital}
          onChange={(capital) => setSizing({ capital })}
        />
        <MoneyInput
          icon="shield-checkmark-outline"
          label="Reserve"
          hint="Kept back for margin calls and averaging in. Never allocated."
          value={sizing.reserve}
          onChange={(reserve) => setSizing({ reserve })}
        />
        <MoneyInput
          icon="layers-outline"
          label="Average lot cost"
          hint="Rough notional of one F&O lot, used to estimate how many you can carry."
          value={sizing.avgLotCost}
          onChange={(avgLotCost) => setSizing({ avgLotCost })}
        />
      </View>

      <SectionHeader icon="information-circle" title="How this is used" />
      <Card flat style={{ padding: Spacing.md }}>
        <Text style={{ color: c.soft, fontSize: 11, lineHeight: 17 }}>
          The Playbook ranks trades by conviction, then fills them in order until the usable capital
          runs out — high-conviction names earn two lots, the rest one. Anything that doesn&apos;t
          fit is still listed, marked as unaffordable, so you can see what you&apos;re missing
          rather than being quietly shown a shorter list.
        </Text>
        <Text style={{ color: c.dim, fontSize: 10, lineHeight: 15, marginTop: Spacing.sm }}>
          The reserve is deliberately excluded from every calculation. It is there so a position
          moving against you doesn&apos;t force an exit at the worst moment.
        </Text>
      </Card>

      <Card tint={c.amber} style={{ padding: Spacing.md, marginTop: Spacing.md }}>
        <Text style={{ color: c.amber, fontSize: 11, fontWeight: "700" }}>
          Position sizing is the only risk control you fully own
        </Text>
        <Text style={{ color: c.soft, fontSize: 11, marginTop: 5, lineHeight: 16 }}>
          Entries and targets are estimates; the amount you commit is a certainty. If the
          Playbook&apos;s total risk reads high against your capital, lower the capital here rather
          than moving stops.
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  icon: { width: 30, height: 30, borderRadius: Radius.sm, alignItems: "center", justifyContent: "center" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    marginTop: Spacing.md,
  },
});
