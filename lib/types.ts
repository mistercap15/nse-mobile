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
  /** 0–1 ratio (good / entries), NOT a percentage — multiply by 100 to display. */
  bounceRate: number | null;
  /** Already a percentage. */
  bounceAvgPct: number | null;
  bounceSamples: number;
  rr: RewardRisk | null;
  /** Shared-engine detail behind `rr` — stop basis, warnings, risk check. */
  levels?: Levels | null;
  seasonalWR: number | null;
  seasonalN: number | null;
  inSeason: boolean;
  score: number;
  grade?: string;
  /** Uppercase from the engine — compare case-insensitively, never as a literal. */
  tier: "PRIME" | "STRONG" | "WATCH" | string;
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

// ── Universe (search) ───────────────────────────────────────────────────────

export interface UniverseSymbol {
  symbol: string;
  sector: string | null;
  lotSize: number | null;
}

export interface UniverseResponse {
  count: number;
  symbols: UniverseSymbol[];
  sectors: string[];
  generatedAt: string | null;
  minYear: number | null;
  maxYear: number | null;
  error?: string;
}

// ── Trade levels ────────────────────────────────────────────────────────────
// Produced by the backend's shared engine (app/lib/levels.js). Every screen
// renders these rather than computing its own, which is what stops the sizing,
// swing-low and early-entry screens disagreeing about the same stock.

export interface SeasonalStats {
  medianReturn: number;
  worst: number;
  best: number;
  winRate: number;
  n: number;
}

export interface Levels {
  strategy: "seasonal" | "reversion" | string;
  entry: { price: number; basis: string };
  stop: {
    price: number;
    pct: number;
    /** MA50 / 52W_LOW / FLOOR / SEASONAL_WORST / FALLBACK … */
    basis: string;
    anchorPrice: number | null;
    /** Structural stop risks more than the month's worst case — size down. */
    exceedsSeasonalRisk: boolean;
    seasonalRiskNormPct: number | null;
  };
  target: {
    price: number;
    pct: number;
    basis: "SEASONAL_MEDIAN" | "MEAN_REVERSION" | string;
    capped: boolean;
  } | null;
  riskReward: number | null;
  averageIn: number | null;
  riskAmount: number | null;
  rewardAmount: number | null;
  warnings: string[];
  /** Present on /api/levels rows, absent inside swing-low's embedded copy. */
  sector?: string | null;
  lotSize?: number | null;
  ma200?: number | null;
  supports?: SupportZone[];
  seasonality?: SeasonalStats | null;
}

export interface LevelsResponse {
  month: number;
  strategy: string;
  entryMode: string;
  seasonality: Record<string, SeasonalStats | null>;
  levels: Record<string, Levels>;
  count: number;
  connected: boolean;
  cached?: boolean;
  note?: string;
  error?: string;
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
  /**
   * Promoter dealing and stake history, as context. Absent when the offline
   * filings snapshot doesn't cover this symbol — which is common and means
   * "unknown", never "clean".
   */
  promoter?: {
    activity: PromoterActivity | null;
    holding: { date: string; promoterPct: number }[];
    asOf: string | null;
  };
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
  /** Only ever true of the daily OAuth token; an analytics token never expires. */
  expired: boolean;
  /**
   * Which credential is serving market data.
   *   "analytics" — the backend's long-lived read-only token. No login involved,
   *                 and none is possible: tapping Connect would change nothing.
   *   "oauth"     — a per-session token from the Upstox login, daily expiry.
   *   null        — neither; price fields fall back to em dashes.
   * Absent on a backend older than the analytics-token change.
   */
  source?: "analytics" | "oauth" | null;
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
  action: "LONG" | "SHORT" | "PAIRED" | "FLAT" | string;
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

// ── Playbook (conviction) ───────────────────────────────────────────────────
// The month's few highest-conviction trades, blended from the seasonal edge
// (rankings), the structural setup (swing-low) and the timing checks
// (early-entry). See nse-dashboard/app/lib/conviction.js for the scoring.

export interface ConvictionComponents {
  edge: number;
  structure: number;
  timing: number;
}

export interface PlaybookPick {
  symbol: string;
  sector: string | null;
  lotSize: number | null;
  conviction: number;
  band: "HIGH" | "GOOD" | "FAIR" | "LOW" | string;
  /** How many of the three screeners independently surfaced this name (1-3). */
  sources: number;
  components: ConvictionComponents;
  levels: Levels | null;
  seasonality: SeasonalStats | null;
  swingLow: {
    tier: string;
    score: number;
    floor: SwingFloor | null;
    bounceRate: number | null;
    bounceSamples: number;
    rsi: number;
    distToFloorPct: number | null;
    inZone: boolean;
    drawdownFromHighPct: number;
  } | null;
  inSwingLowScreener: boolean;
  checklist: { result: string; passCount: number; totalChecks: number; summary: string };
  support: { nearest: SupportZone | null; distancePct: number | null };
  context: PriceContext | null;
  reasons: string[];
  /** Warnings from the qualifier layer. Present but empty for a clean pick. */
  flags?: QualifierFlag[];
  /** Shadow-mode promoter dealing — shown, never scored. */
  promoter?: PromoterActivity | null;

  // Added by the capital allocator.
  lots: number;
  wantedLots: number;
  /** Which ceiling bound this position: conviction / per-trade risk / portfolio risk / margin. */
  cappedBy: string;
  riskPerLot: number;
  /** One lot's risk as a share of the whole account. */
  riskPerLotPct: number;
  /** True when even one lot breaches the per-trade limit. */
  tooRisky: boolean;
  /** What the account would need to be worth for one lot to fit. */
  capitalNeededForOneLot: number | null;
  lotCost: number;
  /** Face value of one contract — the exposure behind the margin. */
  notionalPerLot: number;
  notional: number;
  capitalUsed: number;
  riskAmount: number;
  rewardAmount: number;
  affordable: boolean;
}

/**
 * A candidate that scored but failed a gate. Carries the plan it WOULD have
 * been, so the list is something you can disagree with rather than a verdict.
 */
/**
 * A disqualifying fact the conviction score can't see — illiquidity, promoter
 * distress, a regulatory filing, an earnings date inside the hold.
 *
 * `warn` rides along on a pick that still passed; `reject` is folded into the
 * rejection reasons and never appears here.
 */
export interface QualifierFlag {
  level: "warn" | "reject";
  code: string;
  message: string;
}

/**
 * Recent promoter dealing. DISPLAY ONLY — never feeds conviction or sizing,
 * because NSE's insider archive can't be queried backwards consistently enough
 * to backtest it.
 */
export interface PromoterActivity {
  windowDays: number;
  buys: number;
  sells: number;
  buyValue: number;
  sellValue: number;
  netValue: number;
  pledged: number;
  revoked: number;
  shadow: true;
}

export interface RejectedPick {
  symbol: string;
  sector: string | null;
  conviction: number;
  band: string | null;
  components: ConvictionComponents | null;
  lotSize: number | null;
  levels: Levels | null;
  why: string[];
  flags?: QualifierFlag[];
}

export interface PlaybookCapital {
  capital: number;
  reserve: number;
  avgLotCost?: number;
  usable: number;
  deployed: number;
  /** Total contract face value across the plan. */
  notional: number;
  dryPowder: number;
  deployedPct: number;
  totalRisk: number;
  totalReward: number;
  /** Total risk as a share of the whole account — the number that matters. */
  riskPctOfCapital: number;
  riskPerTradePct: number;
  maxPortfolioRiskPct: number;
  perTradeBudget: number;
  portfolioBudget: number;
  riskBudgetLeft: number;
  riskBudgetUsedPct: number;
  tooRisky: string[];
  unaffordable: string[];
}

export interface PlaybookResponse {
  month: number;
  monthName: string;
  generatedAt: string;
  connected: boolean;
  picks: PlaybookPick[];
  rejected: RejectedPick[];
  considered?: number;
  shortlisted?: number;
  capital: PlaybookCapital | null;
  cached?: boolean;
  note?: string;
  error?: string;
  /** Freshness and hit-rate of the offline filings snapshot. */
  filings?: {
    generatedAt: string | null;
    coverage: { symbols: number; withPit: number; withHolding: number; withAnnouncements: number } | null;
    ageDays: number | null;
    /** F&O expiry the hold is measured against. */
    holdEndsOn: string;
    /** How many candidates a qualifier rejected — a calibration check. */
    gatedOut: number;
    flagged: number;
  };
  /** Present only when Upstox is down: seasonal ranking with no levels. */
  shortlist?: { symbol: string; sector: string; edge: number; winRate: number; medianReturn: number }[];
}

// ── Fib Bot (Nifty futures) ─────────────────────────────────────────────────
// Mirrors GET /api/fib/signal. Every field is computed server-side by
// app/lib/fib.js — the app renders these numbers and derives none of them.

/** The front-month futures contract, read off the Upstox instrument master. */
export interface FibContract {
  instrumentKey: string;
  tradingSymbol: string;
  /** Epoch ms of the expiry instant. */
  expiry: number;
  /** YYYY-MM-DD in IST. */
  expiryDate: string;
  lotSize: number;
  freezeQty: number;
  tickSize: number;
  daysToExpiry: number;
  rollsInto: { instrumentKey: string; tradingSymbol: string; expiryDate: string } | null;
}

/**
 * The signal from the last CLOSED hourly bar. Every price field is null
 * together when the engine could not produce a signal (too little history, a
 * flat swing range) — `reason` always says which.
 */
export interface FibSignal {
  /** Bar-open timestamp the signal reflects, e.g. "2026-08-18T15:15:00+05:30". */
  asOf: string | null;
  swingHigh: number | null;
  swingLow: number | null;
  range: number | null;
  lastClose: number | null;
  /** The limit price a buy would rest at. */
  fibEntry: number | null;
  stopPrice: number | null;
  targetPrice: number | null;
  atr: number | null;
  stopDistancePts: number | null;
  targetDistancePts: number | null;
  rewardRiskRatio: number | null;
  /** Whether an order should be resting right now. */
  entryValid: boolean;
  reason: string;
}

export interface FibSignalResponse {
  underlying: string;
  contract: FibContract | null;
  signal: FibSignal | null;
  barsUsed: number;
  dataAsOf: string | null;
  /** False when Upstox is disconnected or the token lapsed — show Connect. */
  tokenValid: boolean;
  config: {
    swingLookback: number;
    fibLevel: number;
    atrPeriod: number;
    atrStopMult: number;
    timeoutBars: number;
    trendFilter: number;
  };
  cached?: boolean;
  /** Set instead of a signal; the route returns 200 either way. */
  error: string | null;
}
