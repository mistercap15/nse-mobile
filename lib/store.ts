import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { currentMonthIST } from "./format";

// ─────────────────────────────────────────────────────────────────────────────
// Client-side state. Nothing derived from the API lives here — that's React
// Query's job. This is only user preferences and the sizing inputs, which the
// web persists to localStorage under the same `ps.*` names.
// ─────────────────────────────────────────────────────────────────────────────

export interface SizingInputs {
  capital: number;
  reserve: number;
  avgLotCost: number;
  /** Share of TOTAL capital riskable on one trade. Decides position size. */
  riskPerTradePct: number;
  /** Ceiling on risk across every open position. */
  maxPortfolioRiskPct: number;
}

/**
 * "system" follows the device appearance and is the default. Toggling from the
 * header commits to an explicit light/dark; About offers the way back.
 */
export type ThemeMode = "system" | "light" | "dark";

interface AppState {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  /** Commits to the opposite of whatever is currently showing. */
  setExplicitTheme: (dark: boolean) => void;

  selectedMonth: number;
  setSelectedMonth: (month: number) => void;

  sizing: SizingInputs;
  setSizing: (patch: Partial<SizingInputs>) => void;

  recentStocks: string[];
  addRecentStock: (symbol: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      themeMode: "system",
      setThemeMode: (themeMode) => set({ themeMode }),
      setExplicitTheme: (dark) => set({ themeMode: dark ? "dark" : "light" }),

      selectedMonth: currentMonthIST(),
      setSelectedMonth: (month) => set({ selectedMonth: month }),

      sizing: {
        capital: 500000,
        reserve: 100000,
        avgLotCost: 150000,
        // 5/15 rather than the textbook 2/6: Indian F&O lots are large enough
        // that 2% refuses almost every trade. Still a real constraint.
        riskPerTradePct: 5,
        maxPortfolioRiskPct: 15,
      },
      setSizing: (patch) => set((s) => ({ sizing: { ...s.sizing, ...patch } })),

      recentStocks: [],
      addRecentStock: (symbol) =>
        set((s) => ({
          recentStocks: [symbol, ...s.recentStocks.filter((x) => x !== symbol)].slice(0, 12),
        })),
    }),
    {
      name: "nserank.prefs",
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (persisted, version) => {
        if (!persisted || typeof persisted !== "object") return persisted as never;
        const state = { ...(persisted as Record<string, unknown>) };

        // v0 stored a hard isDark boolean. Drop it rather than translating it —
        // the point of that change is that the app follows the device unless
        // asked otherwise, and a migrated `true` would pin everyone to dark.
        if (version < 1) delete state.isDark;

        // v1's sizing object predates the risk budgets. Zustand replaces the
        // whole nested object rather than deep-merging it, so without this the
        // stored {capital, reserve, avgLotCost} would leave the two risk fields
        // undefined and every position would size against NaN.
        if (version < 2) {
          const sizing = (state.sizing ?? {}) as Partial<SizingInputs>;
          state.sizing = {
            capital: sizing.capital ?? 500000,
            reserve: sizing.reserve ?? 100000,
            avgLotCost: sizing.avgLotCost ?? 150000,
            riskPerTradePct: sizing.riskPerTradePct ?? 5,
            maxPortfolioRiskPct: sizing.maxPortfolioRiskPct ?? 15,
          };
        }
        return state as never;
      },
      // selectedMonth is deliberately not persisted — it should reset to the
      // current month each launch rather than strand you in a stale one.
      partialize: (s) => ({
        themeMode: s.themeMode,
        sizing: s.sizing,
        recentStocks: s.recentStocks,
      }),
    },
  ),
);
