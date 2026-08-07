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

      sizing: { capital: 500000, reserve: 100000, avgLotCost: 150000 },
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
      version: 1,
      // v0 stored a hard isDark boolean. Drop it rather than translating it —
      // the point of the change is that the app should follow the device unless
      // asked otherwise, and a migrated `true` would pin everyone to dark.
      migrate: (persisted, version) => {
        if (version === 0 && persisted && typeof persisted === "object") {
          const { isDark: _isDark, ...rest } = persisted as Record<string, unknown>;
          return rest as never;
        }
        return persisted as never;
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
