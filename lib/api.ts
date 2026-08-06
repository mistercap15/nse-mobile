// ── Config ────────────────────────────────────────────────────────────────────
// Your existing Vercel MCP server URL
const MCP_URL = "https://nse-data-mcp.vercel.app/mcp";

// ── MCP caller ────────────────────────────────────────────────────────────────
async function callMCP(toolName: string, args: Record<string, unknown> = {}) {
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: { name: toolName, arguments: args },
    }),
  });

  if (!res.ok) throw new Error(`MCP error ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.result?._raw;
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function getMonthlyRanking(month: number, top = 25, sector = "ALL") {
  return callMCP("get_monthly_ranking", { month, top, sector });
}

export async function getStockData(symbol: string, startYear = 2009) {
  return callMCP("get_stock_data", {
    symbol,
    start_year: startYear,
    interval: "MONTHLY",
    exchange: "NSE",
  });
}

export async function getSeasonalitySummary(symbol: string, month?: number) {
  const args: Record<string, unknown> = { symbol };
  if (month) args.month = month;
  return callMCP("get_seasonality_summary", args);
}

export async function getAllRankings(top = 5) {
  return callMCP("get_all_rankings", { top });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export const MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

export const MONTH_FULL = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export function getSignalLabel(winRate: number): string {
  if (winRate === 100) return "PERFECT";
  if (winRate >= 93)  return "EXCELLENT";
  if (winRate >= 80)  return "BULLISH";
  if (winRate >= 65)  return "MILD BULL";
  if (winRate >= 50)  return "NEUTRAL";
  if (winRate >= 40)  return "WEAK";
  return "AVOID";
}

export function getSignalColor(winRate: number): string {
  if (winRate >= 93)  return "#22C55E";
  if (winRate >= 80)  return "#4D9FFF";
  if (winRate >= 65)  return "#F59E0B";
  if (winRate >= 50)  return "#9CA3AF";
  if (winRate >= 40)  return "#FCA5A5";
  return "#EF4444";
}

export function getHeatmapColor(returnPct: number | null): string {
  if (returnPct === null || returnPct === undefined) return "#1E2D45";
  const v = Math.max(-15, Math.min(15, returnPct));
  if (returnPct >= 0) {
    const g = Math.round(80 + (v / 15) * 110);
    return `rgb(0, ${g}, 60)`;
  } else {
    const r = Math.round(120 + (Math.abs(v) / 15) * 119);
    return `rgb(${r}, 20, 30)`;
  }
}

export const FO_SYMBOLS = [
  "360ONE","ABB","ABCAPITAL","ADANIENSOL","ADANIENT","ADANIGREEN","ADANIPORTS",
  "ADANIPOWER","ALKEM","AMBER","AMBUJACEM","ANGELONE","APLAPOLLO","APOLLOHOSP",
  "ASHOKLEY","ASIANPAINT","ASTRAL","AUBANK","AUROPHARMA","AXISBANK","BAJAJ-AUTO",
  "BAJAJFINSV","BAJAJHLDNG","BAJFINANCE","BANDHANBNK","BANKBARODA","BANKINDIA",
  "BDL","BEL","BHARATFORG","BHARTIARTL","BHEL","BIOCON","BLUESTARCO","BOSCHLTD",
  "BPCL","BRITANNIA","BSE","CAMS","CANBK","CDSL","CGPOWER","CHOLAFIN","CIPLA",
  "COALINDIA","COCHINSHIP","COFORGE","COLPAL","CONCOR","CROMPTON","CUMMINSIND",
  "DABUR","DALBHARAT","DELHIVERY","DIVISLAB","DIXON","DLF","DMART","DRREDDY",
  "EICHERMOT","ETERNAL","EXIDEIND","FEDERALBNK","FORCEMOT","FORTIS","GAIL",
  "GLENMARK","GMRAIRPORT","GODFRYPHLP","GODREJCP","GODREJPROP","GRASIM","HAL",
  "HAVELLS","HCLTECH","HDFCAMC","HDFCBANK","HDFCLIFE","HEROMOTOCO","HINDALCO",
  "HINDPETRO","HINDUNILVR","HINDZINC","HYUNDAI","ICICIBANK","ICICIGI","ICICIPRULI",
  "IDFCFIRSTB","IEX","INDHOTEL","INDIANB","INDIGO","INDUSINDBK","INDUSTOWER",
  "INFY","INOXWIND","IOC","IREDA","IRFC","ITC","JINDALSTEL","JIOFIN","JSWENERGY",
  "JSWSTEEL","JUBLFOOD","KALYANKJIL","KAYNES","KEI","KFINTECH","KOTAKBANK",
  "KPITTECH","LAURUSLABS","LICHSGFIN","LICI","LODHA","LT","LTF","LTM","LUPIN",
  "M&M","MANAPPURAM","MANKIND","MARICO","MARUTI","MAXHEALTH","MAZDOCK","MCX",
  "MFSL","MOTHERSON","MOTILALOFS","MPHASIS","MUTHOOTFIN","NAM-INDIA","NATIONALUM",
  "NAUKRI","NBCC","NESTLEIND","NHPC","NMDC","NTPC","NUVAMA","NYKAA","OBEROIRLTY",
  "OFSS","OIL","ONGC","PAGEIND","PATANJALI","PAYTM","PERSISTENT","PETRONET",
  "PHOENIXLTD","PIDILITIND","PIIND","POLICYBZR","POLYCAB","POWERGRID","PFC",
  "PNBHOUSING","PNB","PRESTIGE","RBLBANK","RECLTD","RELIANCE","RVNL","SAIL",
  "SBICARD","SBILIFE","SHREECEM","SHRIRAMFIN","SIEMENS","SOLARINDS","SONACOMS",
  "SRF","SBIN","SUNPHARMA","SUPREMEIND","SUZLON","SWIGGY","TATACONSUM","TATAMOTORS",
  "TATAPOWER","TATASTEEL","TCS","TATAELXSI","TECHM","TIINDIA","TITAN","TORNTPHARM",
  "TRENT","TVSMOTOR","ULTRACEMCO","UNIONBANK","UNOMINDA","UPL","UNITDSPR","VBL",
  "VEDL","VOLTAS","WIPRO","ZYDUSLIFE",
];
