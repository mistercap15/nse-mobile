# NSERank — Full Project Context

A personal F&O (Futures & Options) seasonality trading system for Indian (NSE) stocks,
built by and for a single user. It ranks ~181 F&O stocks by historical monthly seasonal
edge, then layers live-price tooling on top: trade levels, mean-reversion setups,
risk-based position sizing, and a shortlist of the month's highest-conviction trades.

**This document covers both repos.** Paste it into a fresh conversation to give full
context on the system.

---

## 1. The two repos

Both live side by side in `~/Desktop/Live Projects/`.

| Repo | What it is | Deploy |
|---|---|---|
| **`nse-dashboard`** | Next.js 14 web app **and the backend for everything**. Owns all analytics. | Vercel, auto-deploys on push to `master` |
| **`nse-mobile`** | Expo / React Native app. A **native front-end over the same backend**. | EAS Build (APK) + EAS Update (OTA) |

**The single most important architectural rule: the mobile app owns no analytics.**
Every number it shows comes from `nse-dashboard`'s `/api/*`. When a calculation needs
to change, it changes server-side once and both clients follow. The app is presentation
plus local preferences, nothing more.

Single-owner project. Pushes go **directly to `master`** on both repos, no feature
branches, unless stated otherwise.

---

## 2. Three data sources

Everything in the system traces back to one of these.

**1. `data/universe.json`** — a committed snapshot of **monthly return history**
(2009–2026) for 181 F&O symbols. Built offline by `scripts/build-universe.mjs`.

```
{ generatedAt, minYear, maxYear, symbols:[...], sectors:{SYM:sector},
  lotSize:{SYM:n}, series:{ SYM: { "YYYY-MM": returnPct, ... } } }
```

Loaded via `app/lib/dataset.js` (`loadUniverse()`). This is **monthly percentages, not
daily prices** — the source for all seasonality analytics (win rate, median, statistical
significance, regime).

**2. NSE MCP server** (`https://nse-data-mcp.vercel.app/mcp`, JSON-RPC) — live ranking
data. Tools: `get_monthly_ranking`, `get_all_rankings`, `get_stock_data`,
`get_seasonality_summary`, `get_lot_size`, `get_batch_data`. Structured payload is under
`result._raw`. Ranking objects carry `symbol, win_rate, avg_return, median_return, best,
worst, signal, sector, lot_size, data_points, positive_years, negative_years, score`.

**3. Upstox API** (`https://api.upstox.com/v2` + `/v3`) — live quotes, **daily OHLCV
candles**, and hourly candles for the Fib Bot. Wrapped in `app/lib/upstox.js`. Powers
anything needing real price levels. Served by a long-lived read-only **analytics token**
(`UPSTOX_ANALYTICS_TOKEN`) on the backend — **no daily login, and none is possible from
the app**.

**4. NSE corporate filings** (added Aug 2026) — `data/promoter.json`, built offline by
`scripts/build-promoter.mjs`. Insider trades, promoter shareholding, announcements, board
meetings. See §7.

> **Key distinction:** seasonality = monthly snapshot + MCP. Real price levels = Upstox
> daily candles. Never mix them up.

---

## 3. The engines (`nse-dashboard/app/lib/`)

These are the heart of the system. All are ESM. **Never reimplement any of this in a
screen** — that mistake has been made and fixed twice.

| Module | Lines | Responsibility |
|---|---|---|
| `qualify.js` | 439 | Disqualifying facts a score can't see. §6 |
| `conviction.js` | 391 | Playbook scoring, gates, capital allocation. §5 |
| `swinglow.js` | 312 | Floor detection, bounce stats, swing-low tiers |
| `levels.js` | 296 | **Single source of truth for entry / stop / target** |
| `stats.js` | 221 | t-tests, significance, Sharpe, Sortino, drawdown |
| `technicals.js` | 194 | Support zones, price context, SMA, swing lows |
| `upstox.js` | 194 | Broker API wrapper |
| `auth.js` | 209 | PIN sessions, JWE, Upstox token custody. §8 |
| `checklist.js` | 120 | Pre-trade checks, shared by Early Entry and Playbook |
| `promoter.js` | 72 | Filings snapshot access |
| `dataset.js` | 57 | `loadUniverse()` |
| `events.js` | 41 | F&O expiry (last Thursday), event calendar |

### `levels.js` — one engine, three strategies

Every entry/stop/target in the system comes from `computeLevels()`. Before it existed,
Swing Low and Early Entry disagreed with each other on the same stock.

- `TARGET_CAP_PCT = 30` (exported) — targets never exceed +30%
- `STOP_BUFFER = 0.97` — stop sits 3% under its anchor
- `RISK_NORM_MULTIPLE = 1.2`, `SEASONAL_MIN_STOP_FRACTION = 0.6`
  (these three are module-private; only `TARGET_CAP_PCT` is exported)
- `pickStopAnchor(supports, entry, { minRiskPct, maxRiskPct })` — chooses which support
  the stop hides under. `minRiskPct` exists because month-long holds need stops wide
  enough to survive a month; a 3% stop on a 30-day trade is noise, not risk management.
- `strategy: "reversion" | "seasonal"` changes how the target is derived.

---

## 4. Domain concepts

**Seasonality** — "how has this stock behaved in September, historically?" Win rate =
share of Septembers that closed green. Median return is preferred over mean because one
freak year distorts a mean.

**Significance (✓ / ≈ on the rankings screen)** — a Student's t-test on the monthly
returns (`stats.js: significance()`). ✓ means the edge is unlikely to be chance
(p < 0.05); ≈ means it could be. A high win rate over 6 years is a weaker claim than a
modest one over 18, and this is what encodes that.

**Swing Low** — price sitting on a floor that has actually held before. Tiers are
`PRIME / STRONG / WATCH`. **Tier strings are UPPERCASE from the engine** — comparing
against `"Prime"` silently produced a zero count once.

**Early Entry** — is now the moment? Runs `runPreTradeChecklist`, result is
`PASS / CAUTION / FAIL`.

**Conviction** — the Playbook's blend. Bands: `HIGH ≥75`, `GOOD ≥60`, `FAIR ≥45`, else `LOW`.

**F&O lots** — you trade whole lots, not shares. Lot sizes are large (TVSMOTOR = 700), so
a single lot can carry ₹30L+ of notional. This dominates position sizing.

---

## 5. The Playbook — the month's best trades

`app/lib/conviction.js` + `app/api/playbook/route.js`. Both clients render it.

### Scoring: cut by evidence type, never by screen

```js
export const WEIGHTS = { edge: 0.45, structure: 0.30, timing: 0.25 };
```

- **EDGE (45%)** — seasonality + significance, from rankings
- **STRUCTURE (30%)** — floor quality, bounce history, reward:risk, from swing-low
- **TIMING (25%)** — checklist, distance to support, momentum, from early-entry

**This must not double-count.** Rankings and early-entry both read seasonality from the
same snapshot, so blending *screen* scores would weigh identical evidence twice. The
components are cut by underlying measurement instead. Confluence (appearing in multiple
screeners) then earns a modest ×1.1 / ×1.05 multiplier — corroboration, not new edge.

### Gates

```js
export const GATES = { minYears: 5, minRiskReward: 1.2, minConviction: 45 };
```

Anything failing a gate is returned in `rejected[]` **with the plan it would have been**
— entry, stop, target, conviction. "RELIANCE was rejected" is an assertion; "RELIANCE
would have been ₹1,329, stop ₹1,262, 0.3× — rejected on reward:risk" is something you can
disagree with, and disagreeing is the point of showing the list.

> Currently only ~2 of 28 September candidates clear `minRiskReward`. Loosening it is an
> open question and the owner's call.

### Position sizing is risk-based, not margin-based

```js
export const RISK = { perTradePct: 5, portfolioPct: 15 };
```

Margin is the wrong thing to size against for a leveraged instrument — ₹3L of margin can
carry ₹37L of notional, so "24% deployed" was already risking 15% of the account. Lots
are derived from **what a trade loses at its stop**. Four ceilings, tightest wins:

1. what conviction earns (2 lots ≥75, else 1)
2. per-trade risk budget
3. remaining portfolio risk budget
4. margin

Every position reports `cappedBy`, so a lone lot is never unexplained. When even one lot
breaches the limit it returns 0 lots plus `capitalNeededForOneLot` — actionable, rather
than a dead end.

**Why 5/15 and not the textbook 2/6:** Indian F&O lots are large enough that one lot with
a normal stop routinely risks 10%+ of a retail account. One TVSMOTOR lot risks ₹1,81,300 —
12% of a ₹15L account. A 2% default would refuse essentially every trade and read as
broken rather than disciplined. Editable in Capital.

---

## 6. The qualifier layer (`qualify.js`)

Added Aug 2026 after investigating three candidate alpha sources. **All three failed as
predictors and ship as vetoes instead.**

### What was tested, and what the data said

Both tests used **market-neutral returns** — each stock minus the median F&O name over the
same window. This matters: the raw sample shows ~+2%/month drift purely from survivorship,
since all 181 names are *today's* F&O constituents.

- **Volume** — 35,957 monthly observations, 2000–2026. "Accumulation on heavy volume at
  the lows" earned **−0.09% in 2019–2026 (t = −0.16)**, worse than buying near-lows
  unfiltered. Accumulation (+1.12%) and distribution (+1.08%) were indistinguishable, and
  both beat balanced flow (+0.34%) — a U-shape, so it measures volatility, not direction.
- **Promoter stake trend** — 2,651 observations, 166 names, forward quarter, 45-day filing
  lag. Baseline +2.07%; falling stake +1.66%, **rising** stake +1.17%. Both below flat.
- **News sentiment** — never built. Decays in hours; these are liquid large caps.

**The one robust finding:** price in the lower third of its 3-month range earns **+0.72%
excess (t = 6.90), positive in all three eras** — independent confirmation of the
reversion premise already underpinning Swing Low.

> **Do not re-propose volume or promoter buying as conviction components.** The tests
> already said no. Re-run them market-neutral if you disagree.

### The design

Each qualifier is a pure function `(cand, ctx) => null | { level, code, message }` where
level is `"reject"` or `"warn"`. Two invariants:

1. **FAIL OPEN.** Missing data never rejects. Coverage is genuinely uneven, so a symbol
   absent from the snapshot is *unknown*, not guilty.
2. **PURE.** No fetching, no reading the clock. Every one is testable without a token.

The route computes them and attaches `cand.gate`; `buildPlaybook` folds `rejects` into
its existing `why[]` array and passes `warnings` through as `flags`. **Conviction weights
are untouched**, so the existing tests stayed valid.

| Qualifier | Effect | Basis |
|---|---|---|
| Liquidity collapse | reject | execution — the stop won't fill |
| Promoter pledge invoked | reject | structural distress |
| Auditor resignation / forensic audit / fraud / licence pulled / rating cut / insolvency | reject | structural distress |
| Board meeting inside the hold | warn | risk ≠ what the stop describes |
| Results due on the company's own cadence | warn | same, estimated |
| Promoter stake falling 3 quarters | warn | backtested, failed — stays a warning |
| Promoter open-market buying | display only | unprovable, shadow mode |

**Calibration, measured against all 181 real symbols: 0% rejected, 3.9% flagged.** These
are insurance, not filters. If they ever reject more than ~a quarter of a month's
candidates, they are miscalibrated.

---

## 7. Corporate filings data (NSE)

`scripts/build-promoter.mjs` → `data/promoter.json`. **Must stay an offline script**: NSE
blocks datacenter IPs, so Vercel calls fail intermittently and silently — the worst
failure mode for something gating a trade. Same pattern as `universe.json`.

Endpoint behaviour, verified Aug 2026:

| Endpoint | State | Coverage |
|---|---|---|
| `api/corporates-pit` | **per-symbol only**; archive not queryable backwards (RELIANCE: 572 rows for 2018, 17 for 2021, **0 for 2024**) — cannot be backtested | 47/181 |
| `api/corporate-share-holdings-master` | clean, ~22 evenly spaced quarters | 170/181 |
| `api/corporate-announcements` | whole universe in one call, ~94 typed categories | 180/181 |
| `api/corporate-board-meetings` | forthcoming, but firms intimate only ~2 weeks ahead | 1/181 intimated |
| `api/quote-equity?section=trade_info` | blocked, returns non-JSON | — |

Because forward intimations are sparse, **results cadence is learned from each company's
past meetings and projected forward** — 180/181 covered that way.

### Two traps that cost real debugging

**Match on the `category` field, never the narrative text.** Every Indian filing cites
"SEBI (LODR) Regulations, 2015" in its boilerplate, so a `/sebi/` text match rejected
**180 of 181 names** — RVNL winning a railway contract read as a regulatory action.

**Beware categories whose own label enumerates outcomes.** NSE's licence category is named
"Granting/**withdrawal**/surrender/**cancellation**/**suspension** of key licenses", so
testing a withdraw|cancel|suspend refinement against category+text made every filing match
its own label — rejecting CAMS, PAYTM, MOTILALOFS and ICICIPRULI for approvals being
*granted*. Refinements test the narrative only.

Also: both pledge invocations in the live snapshot belong to **employees** at HCLTECH and
NAUKRI, not promoters. The `who === "promoter"` check is load-bearing.

---

## 8. Authentication

Two independent layers.

**PIN gate** — a 6-digit `APP_PIN`. `middleware.js` (Edge runtime) calls
`verifySession(sessionToken(request))`, which accepts **either** a cookie (web) **or** an
`Authorization: Bearer` header (mobile).

**Upstox access is NOT an auth concern.** The PIN session alone gets you in, and market
data comes from the backend's analytics token — the app fetches real quotes, candles and
signals on a PIN session with no Upstox step at all. `/api/upstox/status` returns
`{ connected, expired, source }` where `source` is `"analytics" | "oauth" | null`; when it
is `"analytics"`, show what is serving data rather than a Connect button, which would do
nothing.

**The OAuth flow is kept but dormant.** The web stores its token in a cookie; mobile can't
use cookies, so `createMobileSession` mints a **JWE** (`dir` + `A256GCM`, key = SHA-256 of
`AUTH_SECRET`) carrying the Upstox token in an encrypted `ut` claim. Still wired
(`useUpstoxConnect`, `nserank://upstox/connected`) for the deliberate account login the
bot-token sync will need — never forced.

**The security constraint that shaped this:** `/api/upstox/login` is public, so minting a
session on OAuth success would have bypassed the PIN entirely. The mobile callback
therefore requires a **signed, short-lived link token** (`state = "m:<linkToken>"`), and
`verifySession` **rejects any token carrying a `purpose` claim** so a link token can never
be replayed as a session.

`resolveAccessToken()` in `app/lib/upstox.js` is the single choke-point every market-data
call funnels through: analytics token first, then the per-request/cookie OAuth token. Gate
on `hasValidToken() && !isTokenExpired()`, **not** on the request token alone — both
account for the analytics token.

Secrets never ship in the app. `.env.local` and `.upstox_token` are gitignored.

---

## 9. `nse-dashboard` — web app

**Stack:** Next.js 14.2.5 App Router (JavaScript, not TS), React 18, Tailwind 3.4 with
CSS-variable tokens, lucide-react, recharts, next-themes, jose, @react-pdf/renderer,
resend. No database.

**Pages:** `/` `/rankings` `/analysis` `/swing-low` `/early-entry` `/playbook` `/sizing`
(titled **Capital**) `/screener` `/sector-rotation` `/backtest` `/calendar` `/login`

**API routes:** `analysis`, `stock/[symbol]`, `rankings`, `swing-low`, `early-entry`,
`playbook`, `levels`, `universe`, `sizing/entry-prices`, `backtest`, `portfolio`,
`strategies`, `auth/{login,logout,session}`, `upstox/{login,callback,mobile-login,status,quotes,candles}`

**Commands**

```bash
npm run dev            # localhost:3000
npm run build
npm test               # levels (35) + conviction (59) + qualify (52) = 146
npm run refresh-data   # rebuild universe.json — run monthly, needs Upstox token
npm run build-promoter # rebuild promoter.json — needs a residential IP
```

Tests copy the ESM lib to a temp `.mjs` first, because `package.json` has no
`"type": "module"` and bare Node would parse it as CommonJS.

---

## 10. `nse-mobile` — Expo app

**Stack:** Expo SDK 54, React Native 0.81.5, React 19.1, TypeScript, expo-router
(typed routes, React Compiler), TanStack Query v5 for all server state, Zustand +
AsyncStorage for preferences, reanimated 4 + worklets, expo-linear-gradient,
react-native-svg, expo-secure-store, expo-web-browser, expo-linking.

**Tabs:** Home · Rankings · Setups · Research · About
**Setups segments:** Playbook · Swing Low · Early Entry · Capital

```
app/(tabs)/       index, rankings, setups, research, about
app/research/     backtest, calendar, screener, sector-rotation
app/stock/[symbol].tsx
app/upstox/connected.tsx     absorbs the OAuth deep link
components/       ui.tsx, Skeleton, Hero, StockRow, LevelsCard, StockSearch,
                  PinInput, TabBar, charts, SeasonalityHeatmap …
components/setups/  Playbook, SwingLow, EarlyEntry, Capital
lib/              queries.ts (17 hooks), client.ts, session.ts, store.ts,
                  theme.ts, types.ts, format.ts, sizing.ts, config.ts
```

**State split:** server state is React Query's job and never goes in Zustand. Zustand holds
only preferences (`themeMode`, `sizing`, `recentStocks`) persisted at `nserank.prefs`,
currently **version 2**. Migrations must **deep-fill nested objects** — Zustand replaces
rather than merges, so adding a field to `sizing` without a migration leaves it `undefined`
and sizes everything against `NaN`.

**Config:** `API_BASE` resolves `EXPO_PUBLIC_API_BASE` → `app.json extra.apiBase` →
localhost. Production is `https://nse-dashboard-gamma.vercel.app`. Scheme `nserank://`.

**Commands**

```bash
npm run typecheck
npm run lint
npm run build:apk      # EAS Build, APK, internal distribution
npm run update         # OTA to the `preview` channel
```

**Shipping:** `runtimeVersion` policy is `appVersion`. OTA can fix JS and assets only —
anything touching native code or `app.json` needs a new build. Publish OTA from a **clean
tree**; the update records the commit. Two relaunches to pick one up. `babel-preset-expo`
is declared explicitly in devDependencies because a nested-only copy breaks EAS's clean
install.

---

## 11. Environment variables

Dashboard `.env.local` and Vercel Project Settings. **Never in the mobile app.**

`APP_PIN` · `AUTH_SECRET` · `UPSTOX_ANALYTICS_TOKEN` (serves all market data) ·
`UPSTOX_API_KEY` · `UPSTOX_API_SECRET` · `UPSTOX_REDIRECT_URI` ·
`UPSTOX_ACCESS_TOKEN` (optional local) · `MCP_URL` · `MCP_SECRET`

---

## 12. Conventions & gotchas

**Shared engines, always.** Levels lived in three screens and disagreed; the checklist was
inline in Early Entry. Both were extracted. When a fact is a property of the *stock* rather
than of a screen, it belongs in a lib, not a component.

**Two stock-detail routes exist.** Mobile calls `/api/analysis?symbol=`; the web calls
`/api/stock/[symbol]`. They have drifted before — a field was added to one and the mobile
card silently rendered nothing. Shared response pieces belong in a helper both import.
**When verifying a change, hit the endpoint the client actually calls.**

**Enum case matters.** The swing-low engine emits `"PRIME"`, not `"Prime"`. Sector rotation
emits `LONG/SHORT/PAIRED/FLAT` — there is no `MIXED`.

**Ratios vs percentages.** `bounceRate` is 0–1, not a percentage. It once displayed as "1%"
for every stock.

**Never throw from an API route.** Return an empty payload with a reason; a 500 tells the
user nothing.

**RN shadows and `overflow: hidden` don't coexist** on the same view — iOS drops the
shadow. Split into an outer shadow view and an inner clipping view.

**Theme:** three states, not two — explicit light, explicit dark, and system (unstamped).
Define tokens for all three or the page renders one theme's text on the other's ground.

**Verify with real data, not just unit tests.** Every live run against this system has
caught bugs the tests missed: the PRIME casing, `lotSize` nulls, margin-vs-notional
sizing, and five separate qualifier bugs. Unit tests confirm the logic you thought of.

**Dates are IST.** Use `istDay()`; a run just after midnight UTC otherwise shifts the
window by a day. F&O expiry is the last Thursday (`events.js: lastThursday`).

---

## 13. Current open items

- `GATES.minRiskReward = 1.2` rejects 26 of 28 September candidates. Loosening it is the
  owner's call, not a bug.
- **TATAMOTORS** is absent from `universe.json` after its 2025 demerger — 186 candles, no
  seasonality, so no target. Needs the symbol list reseeded from a current F&O list.
- Production `/api/rankings` omits `sentiment` (its internal `/api/early-entry` call
  doesn't complete); mobile falls back to the Early Entry query cache.
- Promoter buy clusters are in **shadow mode** — displayed, never scored — accumulating
  forward history until there is something honest to calibrate against.
- `nse-dashboard/CLAUDE.md` predates the Playbook, conviction, levels and qualifier work
  and is partially stale. This document supersedes it.
