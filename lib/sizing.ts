import type { Levels, RankedStock } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Position-sizing engine — conviction score, risk caps and lot allocation.
//
// Entry/stop/target used to be computed here too, ported from the web's sizing
// page. They no longer are: those come from /api/levels, so this screen, Swing
// Low and Early Entry all quote the same numbers instead of three variants.
//
// What remains is the sizing decision itself — how many lots a stock earns and
// whether capital stretches that far — which is still a port of the web page's
// scoreStock/allocateLots. Change both together.
// ─────────────────────────────────────────────────────────────────────────────

export interface ScoredStock extends RankedStock {
  years: number;
  score: number;
  grade: "A+" | "A" | "B" | "SKIP";
  baseLots: number;
  cappedLots: number;
  recLots: number;
  capReasons: string[];
  belowBar: boolean;
  skipReasons: string[];
}

export interface SizedPosition extends ScoredStock {
  allocLots: number;
  entry: number | null;
  provisional: boolean;
  /** From the shared backend engine; null when Upstox is disconnected. */
  levels: Levels | null;
  lotCost: number;
  lotCostReal: boolean;
  capitalUsed: number;
}

/** Data-years derivation — identical to the web's rankings + sizing pages. */
export function deriveYears(s: RankedStock): number {
  if (s.win_rate > 0) return Math.round((s.positive_years || 0) / (s.win_rate / 100));
  return Math.round((s.data_points || 0) / 12);
}

// ── Conviction score (0–100) + base lots + hard risk caps ───────────────────
export function scoreStock(s: RankedStock): ScoredStock {
  const years = deriveYears(s);
  const wr = s.win_rate ?? 0;
  const med = s.median_return ?? 0;
  const worst = s.worst ?? 0;

  // Win rate — dominant signal (max 40)
  const wrPts = wr >= 90 ? 40 : wr >= 85 ? 35 : wr >= 80 ? 30 : wr >= 75 ? 18 : 5;
  // Median return — typical-year edge, outlier-resistant (max 25)
  const medPts = med >= 9 ? 25 : med >= 7 ? 20 : med >= 5 ? 15 : 5;
  // Data years — sample size / reliability (max 20)
  const yrPts = years >= 15 ? 20 : years >= 10 ? 15 : years >= 7 ? 8 : 2;
  // Worst case — downside tolerance (max 15)
  const worstPts = worst >= -3 ? 15 : worst >= -6 ? 10 : worst >= -10 ? 5 : 0;

  const score = wrPts + medPts + yrPts + worstPts;

  const baseLots = score >= 82 ? 3 : score >= 68 ? 2 : score >= 55 ? 1 : 0;
  const grade: ScoredStock["grade"] =
    score >= 82 ? "A+" : score >= 68 ? "A" : score >= 55 ? "B" : "SKIP";

  // Hard risk caps — may only REDUCE lots, never raise. Record which fired.
  const capReasons: string[] = [];
  let cappedLots = baseLots;
  if (baseLots > 0) {
    if (years < 7) {
      cappedLots = Math.min(cappedLots, 1);
      capReasons.push(`<7y history (${years}y)`);
    }
    if (worst <= -10) {
      cappedLots = Math.min(cappedLots, 1);
      capReasons.push(`worst ${worst.toFixed(1)}%`);
    }
    if (wr < 80) {
      cappedLots = Math.min(cappedLots, 1);
      capReasons.push(`WR ${wr.toFixed(0)}%<80`);
    }
  }

  // Below-bar stocks (base 0) are never sized — explain why.
  const belowBar = baseLots === 0;
  const skipReasons: string[] = [];
  if (belowBar) {
    if (wr < 80) skipReasons.push(`WR ${wr.toFixed(0)}%<80`);
    if (med < 5) skipReasons.push(`median ${med.toFixed(1)}%<5`);
    skipReasons.push(`score ${score}<55`);
  }

  return {
    ...s,
    years,
    score,
    grade,
    baseLots,
    cappedLots,
    recLots: cappedLots,
    capReasons,
    belowBar,
    skipReasons,
  };
}

/**
 * Ration recommended lots against a global lot budget. `candidates` must be
 * pre-scored and sorted by score desc; the stock that overflows the budget takes
 * the remainder and everyone after it gets 0 (→ the reserve list).
 */
export function allocateLots<T extends { recLots: number }>(
  candidates: T[],
  maxLots: number,
): (T & { allocLots: number })[] {
  let remaining = Math.max(0, maxLots);
  return candidates.map((c) => {
    const give = Math.max(0, Math.min(c.recLots, remaining));
    remaining -= give;
    return { ...c, allocLots: give };
  });
}

export interface SizingModel {
  usable: number;
  budget: number;
  hasEntryPrices: boolean;
  sized: SizedPosition[];
  reserved: SizedPosition[];
  belowBar: ScoredStock[];
  qualifiedCount: number;
  totalLots: number;
  deployed: number;
  dryPowder: number;
  deployedPct: number;
  positions: number;
  /** Fewer than 5 qualifying names — the month is seasonally thin. */
  thin: boolean;
}

export function buildSizingModel(
  stocks: RankedStock[],
  capital: number,
  reserve: number,
  avgLotCost: number,
  levelsMap: Record<string, Levels>,
): SizingModel {
  const usable = Math.max(0, capital - reserve);
  const budget = avgLotCost > 0 ? Math.floor(usable / avgLotCost) : 0;

  const scored = stocks.map(scoreStock);
  const belowBar = scored.filter((s) => s.belowBar);
  const candidates = scored
    .filter((s) => !s.belowBar && s.cappedLots >= 1)
    .sort((a, b) => b.score - a.score);

  const allocated: SizedPosition[] = allocateLots(candidates, budget).map((c) => {
    const levels = levelsMap[c.symbol] ?? null;
    const entry = levels?.entry?.price ?? null;
    const provisional = levels?.entry?.basis === "provisional";

    // Per-lot cost: real notional when we have an entry, else the flat
    // avg-cost assumption. The lot budget above always uses avgLotCost.
    const lotCost = entry && c.lot_size ? entry * c.lot_size : avgLotCost;

    return {
      ...c,
      entry,
      provisional,
      levels,
      lotCost,
      lotCostReal: Boolean(entry && c.lot_size),
      capitalUsed: c.allocLots * lotCost,
    };
  });

  const hasEntryPrices = allocated.some((c) => c.entry !== null);
  const sized = allocated.filter((c) => c.allocLots >= 1);
  const reserved = allocated.filter((c) => c.allocLots === 0); // qualified, no capital left

  const totalLots = sized.reduce((a, c) => a + c.allocLots, 0);
  const deployed = sized.reduce((a, c) => a + c.capitalUsed, 0);
  const dryPowder = Math.max(0, usable - deployed);
  const deployedPct = usable > 0 ? Math.round((deployed / usable) * 100) : 0;

  return {
    usable,
    budget,
    hasEntryPrices,
    sized,
    reserved,
    belowBar,
    qualifiedCount: candidates.length,
    totalLots,
    deployed,
    dryPowder,
    deployedPct,
    positions: sized.length,
    thin: candidates.length > 0 && candidates.length < 5,
  };
}
