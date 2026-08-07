import { useColorScheme } from "react-native";
import { useAppStore } from "./store";

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens, ported 1:1 from the web dashboard's CSS variables so the two
// clients read identically. Dark is the default; light is an override set.
//
// Convention (same as web): cards use `card` on `border`, up = green, down =
// red, warnings/Watch tier = amber, links = accent, labels = dim/soft.
// Never hardcode a colour in a screen — both themes have to work.
// ─────────────────────────────────────────────────────────────────────────────

export const DarkColors = {
  bg:      "#090E1A", // 9 14 26
  surface: "#0E1525", // 14 21 37
  card:    "#131D30", // 19 29 48
  border:  "#1E2D45", // 30 45 69
  text:    "#E2E8F0", // 226 232 240
  dim:     "#64748B", // 100 116 139
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
