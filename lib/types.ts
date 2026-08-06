// ─────────────────────────────────────────────────────────────────────────────
// Shapes returned by the Next.js API. Kept deliberately loose where the backend
// is loose (optional fields that only appear when Upstox is connected, or when
// a symbol has enough history for stats) so a partial response never crashes a
// screen — every consumer has to handle the degraded case anyway.
// ─────────────────────────────────────────────────────────────────────────────

export interface Significance {
  n: number;
  t: number;
  p: number;
  ciLow: number;
  ciHigh: number;
  significant: boolean;
}

export interface TrendState {
  above: boolean;
  rising: boolean;
  pctFromMA: number;
  state: string;
}

/** A row in top_stocks / avoid_stocks / short_candidates. */
export interface RankedStock {
  symbol: string;
  win_rate: number;
  avg_return: number;
  median_return: number;
  best: number;
  worst: number;
  signal: string;
  sector: string;
  lot_size: number;
  data_points: number;
  positive_years: number;
  negative_years: number;
  score: number;
  short_score?: number;
  /** Short-side extras, present only on short_candidates. */
  short_sl_pct?: number;
  short_win_prob?: number;
  sig?: Significance;
  trend?: TrendState;
}

export interface Regime {
  riskOn: boolean;
  breadth: number;
  pctFromMA: number;
  label: string;
  note: string;
}

export interface Sentiment {
  bullishScore: number;
  bearishScore: number;
  sentiment: string;
  confidence: string;
  liveCount: number;
  marketOpen: boolean;
  factors: {
    priceAction: number | null;
    breadth: number | null;
    bidAskSpread: number | null;
    volume: number | null;
    volatility: number | null;
  };
}

export interface CalendarInfo {
  expiry?: { date: string; daysAway: number };
  events?: { date?: string; title?: string; [k: string]: unknown }[];
}

export interface RankingsResponse {
  top_stocks: RankedStock[];
  avoid_stocks: RankedStock[];
  short_candidates?: RankedStock[];
  regime?: Regime;
  sentiment?: Sentiment;
  calendar?: CalendarInfo;
  stats_coverage?: boolean;
  month: number;
  month_name: string;
  total_stocks?: number;
  sector_filter?: string;
  last_updated?: string;
  error?: string;
}

// ── Swing low ───────────────────────────────────────────────────────────────

/** A clustered multi-touch support band. `touches` is the floor's strength. */
export interface SwingFloor {
  low: number;
  high: number;
  mid: number;
  touches: number;
  lastTouch?: string | number;
}

/** Reward:risk, with the target capped server-side at +30%. */
export interface RewardRisk {
  target: number;
  stop: number;
  upsidePct: number;
  downsidePct: number;
  ratio: number;
}

export interface SwingLowStock {
  symbol: string;
  sector: string;
  lotSize: number | null;
  price: number;
  floor: SwingFloor | null;
  distToFloorPct: number;
  inZone: boolean;
  rsi: number;
  drawdownFromHighPct: number;
  ma200: number | null;
  bounceRate: number | null;
  bounceAvgPct: number | null;
  bounceSamples: number;
  rr: RewardRisk | null;
  seasonalWR: number | null;
  seasonalN: number | null;
  inSeason: boolean;
  score: number;
  grade?: string;
  tier: "Prime" | "Strong" | "Watch" | string;
  components?: Record<string, number>;
  reasons?: string[];
}

export interface SwingLowResponse {
  generatedAt?: string;
  connected: boolean;
  universeSize: number;
  scanned: number;
  failed?: number;
  nextMonth?: number;
  nextMonthName: string;
  lookbackDays?: number;
  atSwingLow: SwingLowStock[];
  approaching: SwingLowStock[];
  cached?: boolean;
  error?: string;
}

// ── Sizing ──────────────────────────────────────────────────────────────────

export interface EntryPrice {
  entry: number;
  provisional: boolean;
  date?: string;
}

export interface EntryPricesResponse {
  prices: Record<string, EntryPrice>;
  count: number;
  month: number;
  year: number;
  provisionalMonth: boolean;
}

// ── Single-stock analysis ───────────────────────────────────────────────────

/** Per-month seasonality for one symbol, 12 entries Jan→Dec. */
export interface MonthSeasonality {
  month: string;
  month_num: number;
  win_rate: number;
  avg_return: number;
  median_return: number;
  positive_years: number;
  negative_years: number;
  best: number;
  worst: number;
  data_points: number;
}

export interface PricePoint {
  date: string; // "YYYY-MM"
  close: number;
  return_pct: number | null;
}

export interface AnalysisResponse {
  symbol: string;
  exchange: string;
  interval: string;
  start_year: number;
  end_year: number;
  data_points: number;
  lot_size: number;
  prices: PricePoint[];
  seasonality: MonthSeasonality[];
  error?: string;
}

// ── Early entry ─────────────────────────────────────────────────────────────

export interface ChecklistCheck {
  name: string;
  desc: string;
  passed: boolean;
  warning?: boolean;
  detail: string;
  isInformational?: boolean;
}

export interface Checklist {
  checks: ChecklistCheck[];
  result: "PASS" | "CAUTION" | "FAIL" | string;
  passCount: number;
  totalChecks: number;
  scorePenalty: number;
  summary: string;
}

export interface SupportZone {
  price: number;
  type: string;
  strength: string;
}

export interface Support {
  zones: SupportZone[];
  nearest: SupportZone | null;
  second: SupportZone | null;
  distancePct: number | null;
  isNearSupport: boolean;
  isAtSupport: boolean;
}

export interface PriceContext {
  ma10: number | null;
  ma20: number | null;
  ma50: number | null;
  momentum: number;
  positionInRange: number;
  pctFromMa20: number | null;
  pctFromMa50: number | null;
  pctFromYearHigh: number;
  isAboveMa20: boolean | null;
  isAboveMa50: boolean | null;
  isBelowMa20: boolean | null;
  isBelowMa50: boolean | null;
  monthHigh: number;
  monthLow: number;
}

export interface EarlyEntryPick {
  symbol: string;
  sector: string;
  lot_size: number;
  nextMonth: {
    month: number;
    win_rate: number;
    avg_return: number;
    median_return: number;
    data_points: number;
  };
  currentMonth: { month: number; win_rate: number; is_weak: boolean };
  price: { current: number | null; error: string | null; candles: Candle[] };
  support: Support | null;
  context: PriceContext | null;
  checklist: Checklist;
  signal: { score: number; originalScore?: number; scorePenalty?: number; [k: string]: unknown };
  status: "BUY" | "BUY_HALF" | "WATCH" | "MONITOR" | "SKIP" | string;
}

export interface EarlyEntryResponse {
  targetMonth: number;
  currentMonth: number;
  scannedAt: string;
  totalCandidates: number;
  results: EarlyEntryPick[];
  buySignals: number;
  watchlist: number;
  sentiment?: Sentiment;
  error?: string;
  message?: string;
}

// ── Market data ─────────────────────────────────────────────────────────────

export interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CandlesResponse {
  symbol: string;
  instrumentKey?: string;
  days: number;
  candles: Candle[];
  count: number;
  error?: string;
}

export interface Quote {
  symbol: string;
  ltp: number;
  change: number;
  changePct: number;
  high?: number;
  low?: number;
  open?: number;
  prevClose?: number;
  volume?: number;
}

export interface QuotesResponse {
  quotes: Record<string, Quote>;
  count: number;
  error?: string;
}

export interface UpstoxStatus {
  connected: boolean;
  expired: boolean;
}

export interface SessionResponse {
  ok: boolean;
  upstox: boolean;
  expiresAt: number | null;
}

// ── Backtest ────────────────────────────────────────────────────────────────

export interface BacktestStats {
  months: number;
  totalReturn: number;
  cagr: number;
  sharpe: number;
  sortino: number;
  maxDrawdown: number;
  profitFactor: number;
  winRate: number;
  avgMonth: number;
  bestMonth: number;
  worstMonth?: number;
}

export interface BacktestResponse {
  params: { direction: string; topN: number; startYear: number; minHistory: number };
  stats: BacktestStats;
  benchStats: BacktestStats;
  curve: { ym: string; equity: number; benchmark: number }[];
  yearly: { year: string; ret: number }[];
  latest: {
    ym: string;
    ret: number;
    benchmark: number;
    longSymbols: string[];
    shortSymbols: string[];
  };
  coverage: { from: string; to: string; months: number };
  universe: { symbols: number; from: number; to: number; generatedAt: string };
  error?: string;
}

// ── Strategies (sector rotation) ────────────────────────────────────────────

export interface MonthStrategy {
  month: number;
  monthName: string;
  totalScanned: number;
  lastUpdated: string;
  action: "LONG" | "SHORT" | "AVOID" | "MIXED" | string;
  dominantSector: string;
  reason: string;
  macroCheck?: string;
  isResultsMonth?: boolean;
  qualityScore: number;
  dataQualityWarning: string | null;
  totalQualityStocks: number;
  longTrades: RankedStock[];
  shortTrades: RankedStock[];
}

export interface StrategiesResponse {
  strategies: MonthStrategy[];
  generated_at: string;
  min_data_points: number;
  long_threshold: number;
  short_threshold: number;
  error?: string;
}
