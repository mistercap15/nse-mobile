import { useColorScheme, type TextStyle } from "react-native";
import { useAppStore } from "./store";

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens, ported 1:1 from the web dashboard's CSS variables so the two
// clients read identically. Dark is the default; light is an override set.
//
// Convention (same as web): cards use `card` on `border`, up = green, down =
// red, warnings/Watch tier = amber, links = accent, labels = dim/soft.
// Never hardcode a colour in a screen — both themes have to work.
// ─────────────────────────────────────────────────────────────────────────────

// AMOLED: `bg` is true #000000 so the panel simply switches those pixels off —
// the black is absolute rather than a dark navy, and the raised surfaces read
// as genuinely lit against it. The faint blue cast is kept in `surface`/`card`
// so the app still looks like itself and doesn't flatten into grey.
export const DarkColors = {
  bg:      "#000000", // 0 0 0      — true black, the AMOLED ground
  surface: "#070B12", // 7 11 18    — barely lifted
  card:    "#10161F", // 16 22 31   — the step that makes a card a card
  border:  "#1F2A3D", // 31 42 61   — carries more of the structure now that
                      //              shadows have nothing to fall on
  text:    "#E2E8F0", // 226 232 240
  dim:     "#708097", // 114 130 153  — nudged up from #64748B: these are
                      //              9.5px labels, and this is the smallest
                      //              step that clears 4.5:1 on both the black
                      //              ground and a card (re-derived after the
                      //              card was lifted to #10161F)
  soft:    "#94A3B8", // 148 163 184
  muted:   "#334155", // 51 65 85
  accent:  "#4D9FFF", // 77 159 255
  green:   "#22C55E", // 34 197 94
  red:     "#F87171", // 248 113 113
  amber:   "#FCD34D", // 252 211 77
  purple:  "#8B5CF6", // 139 92 246

  // Tinted fills for badges / banners.
  greenBg:  "rgba(34,197,94,0.12)",
  redBg:    "rgba(248,113,113,0.12)",
  amberBg:  "rgba(252,211,77,0.12)",
  accentBg: "rgba(77,159,255,0.12)",
  purpleBg: "rgba(139,92,246,0.12)",
};

export const LightColors: typeof DarkColors = {
  bg:      "#F5F5F0", // 245 245 240
  surface: "#EEEEE8", // 238 238 232
  card:    "#FFFFFF", // 255 255 255
  border:  "#D4D4C8", // 212 212 200
  text:    "#1A1A1A", // 26 26 26
  dim:     "#666660", // 102 102 96
  soft:    "#999990", // 153 153 144
  muted:   "#999990", // 153 153 144
  accent:  "#1D6FE8", // 29 111 232
  green:   "#15803D", // 21 128 61
  red:     "#DC2626", // 220 38 38
  amber:   "#B45309", // 180 83 9
  purple:  "#6D28D9", // 109 40 217

  greenBg:  "rgba(21,128,61,0.10)",
  redBg:    "rgba(220,38,38,0.10)",
  amberBg:  "rgba(180,83,9,0.10)",
  accentBg: "rgba(29,111,232,0.10)",
  purpleBg: "rgba(109,40,217,0.10)",
};

export type AppColors = typeof DarkColors;

/**
 * Resolves the stored preference against the device appearance. "system" is the
 * default, so a fresh install matches whatever the phone is set to.
 *
 * useColorScheme returns null before the OS reports one; dark is the fallback
 * since that's the app's designed-for default.
 */
export function useIsDark(): boolean {
  const mode = useAppStore((s) => s.themeMode);
  const system = useColorScheme();
  if (mode === "system") return system !== "light";
  return mode === "dark";
}

export function useColors(): AppColors {
  return useIsDark() ? DarkColors : LightColors;
}

export const Spacing = { xs: 4, sm: 8, md: 14, lg: 20, xl: 28, xxl: 40 };

export const Radius = { sm: 8, md: 12, lg: 18, xl: 24, xxl: 32, full: 999 };

// ── Type scale ──────────────────────────────────────────────────────────────
// A fixed ramp rather than ad-hoc sizes per screen. Numbers get the tabular
// treatment so columns of figures line up instead of shimmering as they change.
export const Type = {
  display: { fontSize: 30, fontWeight: "800", letterSpacing: -0.6 },
  title:   { fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  heading: { fontSize: 15, fontWeight: "700", letterSpacing: -0.1 },
  body:    { fontSize: 13, fontWeight: "500" },
  small:   { fontSize: 11, fontWeight: "500" },
  micro:   { fontSize: 9.5, fontWeight: "600", letterSpacing: 0.5 },
  /** Figures: same width per glyph so tables don't jitter on refresh. */
  // Not `as const` — RN's TextStyle wants a mutable fontVariant array.
  numeric: { fontVariant: ["tabular-nums"] } as TextStyle,
};

// ── Depth ───────────────────────────────────────────────────────────────────
// Shadows are near-invisible on a near-black background, so dark mode leans on
// a lighter border for separation and light mode leans on the shadow.
export function elevation(isDark: boolean, level: 1 | 2 | 3 = 1, tint?: string) {
  const spec = {
    1: { radius: 8, y: 3, light: 0.07, dark: 0.26 },
    2: { radius: 16, y: 7, light: 0.10, dark: 0.36 },
    3: { radius: 28, y: 13, light: 0.14, dark: 0.46 },
  }[level];
  // A tinted shadow reads as a glow in the element's own colour rather than a
  // grey drop — it's what makes an accented card feel lit instead of stacked.
  const tinted = Boolean(tint) && isDark;
  return {
    shadowColor: tinted ? (tint as string) : "#000",
    shadowOffset: { width: 0, height: spec.y },
    shadowRadius: tinted ? spec.radius * 1.3 : spec.radius,
    shadowOpacity: tinted ? spec.dark * 0.85 : isDark ? spec.dark : spec.light,
    elevation: level * 3,
  };
}

/** Hairline that reads as a highlight on dark, a border on light. */
export function hairline(c: AppColors, isDark: boolean): string {
  // Nudged up from 0.06: against true black a hairline is doing the separating
  // that a drop shadow used to help with, and 0.06 all but disappeared.
  return isDark ? "rgba(255,255,255,0.08)" : c.border;
}

// ── Gradients ───────────────────────────────────────────────────────────────
// Two-stop only. Anything busier competes with the data, which is the thing the
// user is actually here to read.
export function surfaceGradient(c: AppColors, isDark: boolean): [string, string] {
  // A wider spread between the stops gives the card visible form rather than a
  // barely-there wash. On true black the lower stop runs almost to the ground
  // colour, so a card fades into the page instead of ending on a hard edge.
  return isDark ? ["#17202E", "#090C10"] : ["#FFFFFF", "#F1F1EA"];
}

export function tintGradient(hex: string, isDark: boolean): [string, string] {
  const a = isDark ? [0.30, 0.07] : [0.18, 0.04];
  const rgb = hexToRgb(hex);
  return [`rgba(${rgb},${a[0]})`, `rgba(${rgb},${a[1]})`];
}

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((x) => x + x).join("") : h, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

// Floating tab bar sits over the content, so every scroll view needs to clear it.
export const TAB_BAR_CLEARANCE = 110;

// ── Semantic helpers ────────────────────────────────────────────────────────
// The web derives these inline per page; centralising them here keeps every
// screen consistent and is the only place a token maps to a meaning.

/** Tier badges: Prime = green, Strong = accent, Watch = amber. */
export function tierColor(c: AppColors, tier?: string | null): string {
  switch ((tier || "").toUpperCase()) {
    case "PRIME":  return c.green;
    case "STRONG": return c.accent;
    case "WATCH":  return c.amber;
    default:       return c.dim;
  }
}

/** Sizing grades: A+ green, A accent, B amber. */
export function gradeColor(c: AppColors, grade?: string | null): string {
  switch (grade) {
    case "A+": return c.green;
    case "A":  return c.accent;
    case "B":  return c.amber;
    default:   return c.dim;
  }
}

/** Signal strength by win rate — mirrors the web's getSignalColor. */
export function signalColor(c: AppColors, winRate: number): string {
  if (winRate >= 93) return c.green;
  if (winRate >= 80) return c.accent;
  if (winRate >= 65) return c.amber;
  if (winRate >= 50) return c.soft;
  return c.red;
}

/** Positive/negative number colouring. */
export function deltaColor(c: AppColors, n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return c.dim;
  if (n > 0) return c.green;
  if (n < 0) return c.red;
  return c.soft;
}
