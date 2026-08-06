// ─────────────────────────────────────────────────────────────────────────────
// Number formatting. Rupees use Indian digit grouping (₹1,23,456) exactly as the
// web does — the two clients show the same figures, so they must render the same
// way too. Anything unknown renders as an em dash, which is also what a screen
// shows for a price it couldn't fetch because Upstox is disconnected.
// ─────────────────────────────────────────────────────────────────────────────

export const DASH = "—";

const isNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

/** ₹1,23,456 — Indian grouping, no decimals by default. */
export function rupees(n: unknown, decimals = 0): string {
  if (!isNum(n)) return DASH;
  return `₹${n.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/** Compact rupees for tight stat cards: ₹1.2L, ₹3.4Cr. */
export function rupeesCompact(n: unknown): string {
  if (!isNum(n)) return DASH;
  const abs = Math.abs(n);
  if (abs >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (abs >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`;
  if (abs >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  return rupees(n);
}

/** +12.3% / -4.5% — signed unless `signed` is false. */
export function pct(n: unknown, decimals = 1, signed = true): string {
  if (!isNum(n)) return DASH;
  const sign = signed && n > 0 ? "+" : "";
  return `${sign}${n.toFixed(decimals)}%`;
}

export function num(n: unknown, decimals = 0): string {
  if (!isNum(n)) return DASH;
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Sample-size annotation the web shows inline next to bounce/seasonality stats. */
export function sampleNote(n: unknown): string {
  return isNum(n) ? `n=${n}` : "";
}

export const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const MONTH_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** IST-aware current month (1-12) — the backend reckons in IST, so we must too. */
export function currentMonthIST(): number {
  const ist = new Date(Date.now() + 5.5 * 3600000);
  return ist.getUTCMonth() + 1;
}

export function currentYearIST(): number {
  const ist = new Date(Date.now() + 5.5 * 3600000);
  return ist.getUTCFullYear();
}

export function nextMonthIST(): number {
  return (currentMonthIST() % 12) + 1;
}

/** "3h 12m" until the 03:30 IST session boundary. */
export function untilExpiry(expiresAt: number | null): string {
  if (!expiresAt) return DASH;
  const ms = expiresAt - Date.now();
  if (ms <= 0) return "expired";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
