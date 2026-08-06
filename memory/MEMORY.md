# NSE Mobile App — Memory

## Project
React Native Expo app for NSE F&O seasonality analysis.
Working dir: `/Users/khilanpatel/Desktop/Live Projects/nse-mobile`

## Key Files
- `lib/api.ts` — MCP calls, helpers (getSignalLabel, getSignalColor, getHeatmapColor, MONTHS, FO_SYMBOLS)
- `lib/theme.ts` — Colors, Fonts, Spacing, Radius
- `lib/store.ts` — Zustand store (selectedMonth, recentStocks, positions, pendingPortfolioSymbol)
- `app/tabs/` — Tab screens (index, rankings, analysis, portfolio, calendar)
- `app/screens/stock.tsx` — Stock detail screen (navigate via `/screens/stock?symbol=X`)
- `components/SignalBadge.tsx` — Colored signal pill { winRate, size? }
- `components/StockRow.tsx` — Reusable stock list row { stock, rank, direction?, onPress }

## Architecture
- expo-router v6, Stack + Tabs navigation
- `app/_layout.tsx` registers Stack screens including `screens/stock` and `screens/search`
- `app/tabs/_layout.tsx` registers 5 tabs: index, rankings, analysis, portfolio, calendar
- Data: MCP server at https://nse-data-mcp.vercel.app/mcp via `callMCP()`
- State: Zustand (no persistence — in-memory only)

## Theme System
- `DarkColors` and `LightColors` in lib/theme.ts; `useColors()` hook returns the right set
- `isDark: true` default + `toggleTheme()` in Zustand store
- Every screen uses `const colors = useColors()` + `const styles = useMemo(() => makeStyles(colors), [colors])`
- `makeStyles(c: AppColors)` factory function at bottom of each file
- Theme toggle: sun/moon icon in every tab header (headerRight in _layout.tsx)
- Tab bar: Ionicons from @expo/vector-icons (already in package.json); safe area via `useSafeAreaInsets()`
- NO circular deps: theme.ts imports store.ts, store.ts does NOT import theme.ts

## Design System
- ALL colors from `colors` (useColors() result) — no hardcoded hex
- ALL spacing from `Spacing`, ALL radius from `Radius`
- Monetary: `.toLocaleString('en-IN')` with ₹ prefix
- Percentages: `.toFixed(2)`
- Monospace numbers: `fontFamily: "monospace"`
- Footer on every screen: "Crafted by Khilan Patel"
- Loading: `<ActivityIndicator color={Colors.accent} />`
- Error: red-bordered card with `Colors.redBg` + `Colors.red + "40"` border

## Add-to-Portfolio Flow
`setPendingPortfolioSymbol(symbol)` in store → `router.push('/tabs/portfolio')`
portfolio.tsx reads `pendingPortfolioSymbol` on mount, pre-fills symbol, clears it.

## No New Packages
FlashList NOT available — use FlatList or map() inside ScrollView.
