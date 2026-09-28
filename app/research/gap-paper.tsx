import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useIsFocused } from '@react-navigation/native';
import { Card, SectionHeader } from '@/components/ui';
import { request, ApiError } from '@/lib/client';
import { Spacing, useColors } from '@/lib/theme';
import bundledPilot from '@/assets/data/gapPaperPilot.json';

type Row = Record<string, unknown>;
type Summary = { trades: number; net_pnl: number; account_return: number; max_marked_drawdown_rupees: number; annual: Row[]; by_stock: Record<string, Row> };
type Pilot = { as_of: string; label: string; warning: string; ambiguity_warning: string; equity_sampling: string; summary: Summary; scenarios: Row[]; trades: Row[]; coverage: Row[]; equity_curve: Row[] };
type Paper = { data_status: string; message?: string; last_event?: string; execution?: string; paused?: boolean; halted?: boolean; equity?: number; cash?: number; drawdown?: number; universe_size?: number; excluded_stocks?: number; shortlist?: Row[]; stocks?: Record<string, Row>; positions?: Record<string, Row>; signals?: Row[]; trades?: Row[]; rejections?: Row[]; equity_curve?: Row[] };
const display = (v: unknown): string => v == null ? '—' : typeof v === 'number' ? v.toLocaleString('en-IN', { maximumFractionDigits: 3 }) : typeof v === 'object' ? Object.entries(v as Row).map(([k,n]) => `${k}: ${display(n)}`).join(' · ') : String(v);
function Records({ title, rows, fields }: { title: string; rows: Row[]; fields: string[] }) {
  const c = useColors(); const [open, setOpen] = useState(false); const [limit, setLimit] = useState(20);
  return <Card style={{ padding: Spacing.md }}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)}><Text style={{ color: c.text, fontWeight: '700', fontSize: 15 }}>{open ? '−' : '+'} {title} ({rows.length})</Text></Pressable>
    {open && <View style={{ gap: 12, marginTop: 12 }}>{!rows.length && <Text style={{ color: c.dim }}>No records yet.</Text>}{rows.slice(0, limit).map((row,i) => <View key={i} style={{ borderTopWidth: 1, borderColor: c.border, paddingTop: 10 }}>{fields.map(field => <Text key={field} selectable style={{ color: c.text, lineHeight: 21, fontSize: 12 }}>{field.replaceAll('_', ' ')}: {display(row[field])}</Text>)}</View>)}{rows.length > limit && <Pressable accessibilityRole="button" onPress={() => setLimit(limit + 20)}><Text style={{ color: c.accent }}>Show 20 more</Text></Pressable>}</View>}
  </Card>;
}
export default function GapPaperScreen() {
  const c = useColors(); const focused = useIsFocused();
  const pilot = useQuery({ queryKey: ['gap-paper-pilot'], queryFn: () => request<Pilot>('/api/research/gap-paper/pilot'), staleTime: 300000, enabled: focused, retry: 1 });
  const account = useQuery({ queryKey: ['gap-paper-account'], queryFn: () => request<Paper>('/api/research/gap-paper'), refetchInterval: focused ? 15000 : false, enabled: focused, retry: 1 });
  const p: Pilot = pilot.data ?? bundledPilot; const a = account.data;
  const errorText = (e: Error) => e instanceof ApiError && e.status === 404 ? 'This server does not have the paper research update yet. Update the dashboard backend to view this screen.' : e.message;
  const refresh = () => { void pilot.refetch(); void account.refetch(); };
  const stats = p ? [['Trades', p.summary.trades], ['Net P&L ₹',p.summary.net_pnl], ['Account return %',p.summary.account_return*100], ['Maximum drawdown ₹',p.summary.max_marked_drawdown_rupees]] : [];
  return <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: Spacing.md, paddingBottom: Spacing.xxl, gap: Spacing.md }} refreshControl={<RefreshControl refreshing={pilot.isRefetching || account.isRefetching} onRefresh={refresh} tintColor={c.accent} />}>
    <Text style={{ color: c.accent, fontWeight: '800' }}>PAPER — NO LIVE ORDERS</Text>
    <Text style={{ color: c.dim }}>Gap & first pullback · V1 · View only</Text>
    <Text style={{ color: c.dim }}>Opening this screen does not start a scanner or trading bot.</Text>
    <SectionHeader title="Historical pilot" />
    {!pilot.data && <Text style={{ color: c.dim, fontSize: 12 }}>Showing the bundled research snapshot through {p.as_of}. Pull down to check for a newer server snapshot.</Text>}
    {pilot.error && <Text accessibilityRole="alert" style={{ color: c.text }}>{errorText(pilot.error)} Saved research results below remain available.</Text>}
    {p && <>
      <Text style={{ color: c.text }}>{p.label} · through {p.as_of}</Text>
      <Card style={{ padding: Spacing.md }}><Text style={{ color: c.text, lineHeight: 21 }}>{p.warning}</Text></Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>{stats.map(([label,value]) => <Card key={String(label)} style={{ padding: Spacing.md, width: '47%' }}><Text style={{ color: c.dim, fontSize: 11 }}>{label}</Text><Text style={{ color: c.text, fontSize: 20, fontWeight: '800', marginTop: 4 }}>{display(value)}</Text></Card>)}</View>
      <Records title="Yearly account results" rows={p.summary.annual.map(r => ({ ...r, return_percent: Number(r.account_return)*100 }))} fields={['year','trades','net_account_pnl','return_percent','profit_factor']} />
      <Records title="Results by stock" rows={Object.entries(p.summary.by_stock).map(([symbol,r]) => ({ symbol,...r }))} fields={['symbol','trades','net_pnl','win_rate','profit_factor']} />
      <Records title="Cost and data sensitivity" rows={p.scenarios.map(r=>({...r,return_percent:Number(r.account_return)*100}))} fields={['scenario','trades','net_pnl','return_percent','profit_factor']} />
      <Text style={{ color: c.dim, fontSize: 12 }}>{p.ambiguity_warning}</Text>
      <Records title="Pilot trades and costs" rows={p.trades} fields={['symbol','qty','entry_at','exit_at','entry','exit','pnl','reason','entry_costs','exit_costs']} />
      <Text style={{ color: c.dim, fontSize: 12 }}>{p.equity_sampling}</Text>
      <Records title="Pilot equity" rows={p.equity_curve} fields={['at','equity']} />
      <Records title="Data coverage" rows={p.coverage} fields={['symbol','earliest','latest','valid_unique_rows','invalid_rows','zero_volume_bars']} />
    </>}
    <SectionHeader title="Current paper account" />
    {account.isPending && <Text style={{ color: c.dim }}>Loading account status…</Text>}
    {account.error && <Text accessibilityRole="alert" style={{ color: c.text }}>{errorText(account.error)} Any retained account figures may be stale.</Text>}
    {a && <>
      <Card style={{ padding: Spacing.md }}><Text style={{ color: c.text, lineHeight: 22 }}>Status: {a.data_status}{'\n'}Last event: {a.last_event || 'none'}{'\n'}Fill model: {a.execution || 'not active'}{'\n'}Paper entries: {a.paused ? 'paused' : a.equity == null ? 'not initialized' : 'enabled'} · Daily halt: {a.halted ? 'yes' : 'no'}{'\n'}Observed stocks: {a.universe_size || 0} · Excluded: {a.excluded_stocks || 0}{'\n'}Cash ₹{display(a.cash)} · Equity ₹{display(a.equity)}{'\n'}Maximum drawdown ₹{display(a.drawdown)}</Text><Text style={{ color: c.dim, marginTop: 8 }}>{a.data_status === 'disabled' || a.data_status === 'not_initialized' ? 'Paper observation is not active on this server. Historical pilot results above remain available.' : a.message}</Text></Card>
      <Records title="Frozen shortlist" rows={a.shortlist || []} fields={['symbol','rank','gap','median_value']} />
      <Records title="Setups and exclusions" rows={Object.entries(a.stocks || {}).map(([symbol,r])=>({symbol,...r}))} fields={['symbol','phase','reason','ema','vwap','pending','proposed_quantity','proposed_target']} />
      <Records title="Signals" rows={a.signals || []} fields={['symbol','at','observed_at','trigger','stop','rank']} />
      <Records title="Open paper positions" rows={Object.values(a.positions || {})} fields={['symbol','qty','entry','stop','target','mark']} />
      <Records title="Closed paper trades" rows={a.trades || []} fields={['symbol','entry','exit','pnl','entry_costs','exit_costs','reason']} />
      <Records title="Rejected signals" rows={a.rejections || []} fields={['symbol','at','reason']} />
      <Records title="Recent paper equity" rows={(a.equity_curve || []).slice(-20)} fields={['at','equity','drawdown','stale_marks']} />
    </>}
    <Text style={{ color: c.dim, fontSize: 12 }}>Historical results and the current account are separate. Gaps and win rates are fractions: 0.02 = 2%. Paper pause/reset controls remain on the dashboard.</Text>
  </ScrollView>;
}
