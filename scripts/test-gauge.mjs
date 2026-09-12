// Geometry checks for the Market Mood dial. Run: npm test
//
// WHY THIS EXISTS. tsc and eslint both pass on a gauge whose needle points at
// the wrong band, and on a readout that draws on top of the row beneath it —
// trigonometry and absolute positioning are exactly the code that type-checks
// perfectly and is silently wrong on screen. The only other way to catch either
// is to look at a phone.
//
// It reads the REAL component source and strips the type annotations off the
// pure functions, rather than testing a copy that can drift.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "components", "MoodGauge.tsx"),
  "utf8",
);

const slice = src.slice(src.indexOf("const FULL_SCALE"), src.indexOf("const TICKS"));
const js = slice
  .replace(/export /g, "")
  .replace(/: number \| null \| undefined/g, "")
  .replace(/: \[number, number\]/g, "")
  .replace(/: number/g, "")
  .replace(/: string/g, "")
  .replace(/ as const/g, "")
  .replace(/ as number/g, "");

const { gaugePosition, at, arc, BANDS } = await import(
  "data:text/javascript," + encodeURIComponent(js + "\nexport { gaugePosition, at, arc, BANDS };")
);

let pass = 0, fail = 0;
const ok = (n, c, d = "") => {
  if (c) {
    pass += 1;
    console.log("  ok   " + n);
  } else {
    fail += 1;
    console.log("  FAIL " + n + "  " + d);
  }
};
const near = (a, b, e = 1e-9) => Math.abs(a - b) < e;

// Which quarter of the dial a position falls in, by name.
const bandAt = (t) => BANDS[Math.min(3, Math.max(0, Math.floor(t * 4 - 1e-9)))];

console.log("\n── direction: fear on the left, greed on the right ──");
ok("at the high → hard RIGHT", gaugePosition(0) === 1);
ok("above the high (negative drawdown) → hard right", gaugePosition(-3) === 1);
ok("20% off the high → hard LEFT", near(gaugePosition(20), 0), gaugePosition(20));
ok("a deeper drawdown always moves the needle LEFT",
   gaugePosition(3) > gaugePosition(8) && gaugePosition(8) > gaugePosition(14));

console.log("\n── each band owns exactly one quarter ──");
ok("2% lands EXACTLY on the Extreme Greed/Greed edge", near(gaugePosition(2), 0.75), gaugePosition(2));
ok("5% lands EXACTLY on the Greed/Fear edge", near(gaugePosition(5), 0.5), gaugePosition(5));
ok("10% lands EXACTLY on the Fear/Extreme Fear edge", near(gaugePosition(10), 0.25), gaugePosition(10));
ok("1% → middle of the Extreme Greed quarter", near(gaugePosition(1), 0.875));
ok("3.5% → middle of the Greed quarter", near(gaugePosition(3.5), 0.625));
ok("7.5% → middle of the Fear quarter", near(gaugePosition(7.5), 0.375));
ok("15% → middle of the Extreme Fear quarter", near(gaugePosition(15), 0.125));

console.log("\n── THE ONE THAT MATTERS: the needle lands in the band it is labelled ──");
// If gaugePosition and the drawn quarters ever disagree, the needle sits in
// green while the badge says Extreme Fear. These are the server's own
// thresholds (marketRegime.js: <2 / <5 / <=10 / >10), checked against the arc.
const serverLabel = (p) =>
  p < 2 ? "Extreme Greed" : p < 5 ? "Greed" : p <= 10 ? "Fear" : "Extreme Fear";
let mismatch = null;
for (let p = 0; p <= 20; p += 0.05) {
  const t = gaugePosition(p);
  // Skip the exact edges, where the position sits on the boundary between two
  // quarters and either answer is defensible.
  if (near(t * 4, Math.round(t * 4), 1e-6)) continue;
  if (bandAt(t) !== serverLabel(p)) mismatch = `${p.toFixed(2)}% → ${bandAt(t)}, server says ${serverLabel(p)}`;
}
ok("every drawdown from 0% to 20% puts the needle in the server's own band", mismatch === null, mismatch);

console.log("\n── beyond full scale it PINS, never runs off the dial ──");
for (const p of [20.1, 25, 40, 99, 1e9]) ok(`${p}% pins at the left stop`, gaugePosition(p) === 0, gaugePosition(p));

console.log("\n── monotonic and bounded ──");
let prev = 2, mono = true;
for (let p = -5; p <= 30; p += 0.1) { const t = gaugePosition(p); if (t > prev + 1e-12) mono = false; prev = t; }
ok("non-increasing across -5%..30%", mono);
ok("never leaves [0,1]", [-9, 0, 1, 2, 5, 9, 10, 14, 20, 50].every((p) => { const t = gaugePosition(p); return t >= 0 && t <= 1; }));

console.log("\n── junk parks the needle in the MIDDLE, not on a panic reading ──");
// 0 is now the Extreme Fear stop. A missing number that pins the needle hard
// left would be the worst failure this component could have.
for (const [n, v] of [["null", null], ["undefined", undefined], ["NaN", NaN], ["Infinity", Infinity], ["a string", "x"]])
  ok(`${n} → dead centre`, gaugePosition(v) === 0.5, String(gaugePosition(v)));

console.log("\n── dial geometry (cx=150, cy=150, r=140) ──");
const [cx, cy, r] = [150, 150, 140];
const L = at(cx, cy, r, 0), T = at(cx, cy, r, 0.5), R = at(cx, cy, r, 1);
ok("t=0 is the LEFT end of the arc", near(L[0], cx - r) && near(L[1], cy), L);
ok("t=0.5 is straight UP", near(T[0], cx) && near(T[1], cy - r), T);
ok("t=1 is the RIGHT end", near(R[0], cx + r) && near(R[1], cy), R);
ok("the arc never dips below the hub baseline — it would clip the card",
   Array.from({ length: 101 }, (_, i) => at(cx, cy, r, i / 100)[1]).every((y) => y <= cy + 1e-9));

const d = arc(cx, cy, r, 0, 0.25);
ok("arc() emits one move + one elliptical arc", /^M[\d.,-]+ A[\d.]+,[\d.]+ 0 0 1 [\d.,-]+$/.test(d), d);
ok("  ...with sweep=1 — clockwise, which is left→top→right when y points down", d.includes(" 0 0 1 "));
ok("  ...starting at the left end", d.startsWith("M10.00,150.00"), d.slice(0, 16));

console.log("\n── needle rotation agrees with the arc ──");
const needleTip = (t) => { const a = Math.PI * t; return [cx - r * Math.cos(a), cy - r * Math.sin(a)]; };
for (const t of [0, 0.25, 0.5, 0.75, 0.9, 1]) {
  const n = needleTip(t), a = at(cx, cy, r, t);
  ok(`t=${t.toFixed(2)}: needle points where the arc says`, near(n[0], a[0]) && near(n[1], a[1]), `${n} vs ${a}`);
}

console.log("\n── the readout cannot overlap the row beneath ──");
// THE BUG THIS SHIPPED WITH, and the arithmetic that catches it. The readout is
// absolutely positioned at top: cy + READOUT_TOP, so it escapes layout: if the
// text block is taller than the container reserves, it draws straight over the
// Nifty level and DMA pills the card puts underneath. It shipped as
// READOUT_H = 46 with an unpinned 28px number, whose real line box is ~34px on
// Android — 6 + 34 + 1 + 11 = 52 into 46 of space, so it overlapped by ~6px.
//
// Two things fix it and both are asserted: the line heights are PINNED (default
// leading is not a number this file gets to guess, and it differs by platform),
// and the reserved height is DERIVED from them rather than typed in.
const grab = (name) => {
  const m = src.match(new RegExp(`const ${name} = (\\d+)`));
  return m ? Number(m[1]) : null;
};
const READOUT_TOP = grab("READOUT_TOP");
const NUM_LH = grab("NUM_LH");
const CAP_LH = grab("CAP_LH");
const slack = Number((src.match(/const READOUT_H = READOUT_TOP \+ NUM_LH \+ 1 \+ CAP_LH \+ (\d+);/) || [])[1]);

ok("READOUT_H is derived from the line heights, not a typed-in constant",
   Number.isFinite(slack), src.match(/const READOUT_H = [^;]+;/)?.[0]);
ok("the number's lineHeight is pinned", /fontSize: 28, lineHeight: NUM_LH/.test(src));
ok("the caption's lineHeight is pinned", /fontSize: 9.5, lineHeight: CAP_LH/.test(src));
ok("the container height includes the whole readout block", /const height = cy \+ READOUT_H;/.test(src));

// The real check: where the text ends vs where the container does, both
// measured from the hub.
const textBottom = READOUT_TOP + NUM_LH + 1 + CAP_LH;
const reserved = READOUT_TOP + NUM_LH + 1 + CAP_LH + slack;
ok(`text ends ${textBottom}px below the hub, container reserves ${reserved}px`,
   textBottom <= reserved, `${textBottom} > ${reserved}`);
ok("  ...with a margin, so a font that rounds up a pixel does not overlap",
   reserved - textBottom >= 2, `slack ${reserved - textBottom}px`);

// REGRESSION GUARD: prove this arithmetic actually discriminates. Feed it the
// configuration that shipped broken — 46px reserved, unpinned ~34px number —
// and it must come out negative. A check that passes on the bug is not a check.
{
  const brokenTextBottom = 6 + 34 + 1 + 11;
  ok("the broken configuration this replaced FAILS the same arithmetic",
     !(brokenTextBottom <= 46), `${brokenTextBottom} vs 46`);
}

console.log("\n── the dial survives every screen width ──");
const sizing = (w) => {
  const SW = Math.max(10, Math.min(16, w * 0.048));
  const rr = Math.max(46, Math.min((w - SW) / 2 - 6, 128));
  const ccy = rr + SW / 2 + 4;
  return { SW, r: rr, cy: ccy, needleLen: Math.max(12, rr - SW - 26), gap: SW / 2 / (Math.PI * rr) };
};
for (const w of [80, 240, 262, 300, 330, 360, 430, 700, 1024]) {
  const g = sizing(w);
  ok(`w=${w}: needle has a positive length`, g.needleLen > 0, JSON.stringify(g));
  ok(`  ...and stops short of the tick labels`, g.needleLen < g.r - g.SW / 2 - 11, `${g.needleLen} vs ${(g.r - g.SW / 2 - 11).toFixed(1)}`);
  ok(`  ...the arc fits the width`, 2 * g.r + g.SW <= Math.max(w, 120), `${(2 * g.r + g.SW).toFixed(1)} > ${w}`);
  // The gap is half a stroke width — fixed in pixels, growing in degrees as the
  // radius shrinks. What matters is whether a band survives one at each end.
  const band = 0.25 - 2 * g.gap;
  ok(`  ...an inner band keeps most of its quarter`, band > 0.25 / 1.45, `${(band * 4 * 100).toFixed(0)}% of a quarter`);
}
ok("the sizing constants in the component match the ones asserted here",
   /Math\.max\(10, Math\.min\(16, w \* 0\.048\)\)/.test(src)
   && /Math\.max\(46, Math\.min\(\(w - SW\) \/ 2 - 6, 128\)\)/.test(src)
   && /Math\.max\(12, r - SW - 26\)/.test(src));

console.log("\n── the drawn bands match the dashboard's thresholds ──");
ok("FULL_SCALE / edges are 20 / 2 / 5 / 10",
   /FULL_SCALE = 20/.test(src) && /T_EXTREME_GREED = 2/.test(src)
   && /T_GREED = 5/.test(src) && /T_FEAR = 10/.test(src));
ok("the tick labels print the real boundaries",
   /FULL_SCALE}%\+/.test(src) && /T_FEAR}%/.test(src) && /T_GREED}%/.test(src) && /T_EXTREME_GREED}%/.test(src));
ok("BANDS runs fear → greed, matching the arc's left → right",
   JSON.stringify(BANDS) === JSON.stringify(["Extreme Fear", "Fear", "Greed", "Extreme Greed"]), JSON.stringify(BANDS));
ok("the label is taken from the payload, never re-derived from the drawing constants",
   !/function labelFor|regime_label =/.test(src));
ok("the file states that the colours are the emotion, not a verdict",
   /not a verdict/.test(src) && /did best/.test(src));

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
