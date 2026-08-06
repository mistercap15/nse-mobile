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

interface AppState {
  isDark: boolean;
  toggleTheme: () => void;

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
      isDark: true,
      toggleTheme: () => set((s) => ({ isDark: !s.isDark })),

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
      // selectedMonth is deliberately not persisted — it should reset to the
      // current month each launch rather than strand you in a stale one.
      partialize: (s) => ({
        isDark: s.isDark,
        sizing: s.sizing,
        recentStocks: s.recentStocks,
      }),
    },
  ),
);
