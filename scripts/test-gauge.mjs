// Geometry checks for the Market Mood dial. Run: npm test
//
// WHY THIS EXISTS. tsc and eslint both pass on a gauge whose needle points at
// the wrong zone — trigonometry is exactly the kind of code that type-checks
// perfectly and is silently wrong on screen, and the only other way to catch it
// is to look at a phone. The last assertion here is the one that matters: the
// needle's rotation and the arc's own maths must land on the same point for
// every position, or the needle sits in green while the label says Correction.
//
// It reads the REAL component source and strips the type annotations off the
// three pure functions, rather than testing a copy that can drift.
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
  .replace(/ as number/g, "");

const { gaugePosition, at, arc } = await import(
  "data:text/javascript," + encodeURIComponent(js + "\nexport { gaugePosition, at, arc };")
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

console.log("\n── scale: each zone owns exactly one third ──");
ok("at the high → hard left", gaugePosition(0) === 0);
ok("above the high (negative drawdown) → hard left", gaugePosition(-3) === 0);
ok("5% lands EXACTLY on the Healthy/Caution boundary", near(gaugePosition(5), 1 / 3), gaugePosition(5));
ok("10% lands EXACTLY on the Caution/Correction boundary", near(gaugePosition(10), 2 / 3), gaugePosition(10));
ok("20% → hard right", near(gaugePosition(20), 1), gaugePosition(20));
ok("2.5% → middle of the green third", near(gaugePosition(2.5), 1 / 6));
ok("7.5% → middle of the amber third", near(gaugePosition(7.5), 0.5));
ok("15% → middle of the red third", near(gaugePosition(15), 5 / 6));

console.log("\n── beyond full scale it PINS, never runs off the dial ──");
for (const p of [20.1, 25, 40, 99, 1e9]) ok(`${p}% pins at the stop`, gaugePosition(p) === 1, gaugePosition(p));

console.log("\n── monotonic: more drawdown never moves the needle left ──");
let prev = -1, mono = true;
for (let p = -5; p <= 30; p += 0.1) { const t = gaugePosition(p); if (t < prev - 1e-12) mono = false; prev = t; }
ok("non-decreasing across -5%..30%", mono);
ok("never leaves [0,1]", [-9, 0, 3, 5, 9, 10, 14, 20, 50].every((p) => { const t = gaugePosition(p); return t >= 0 && t <= 1; }));

console.log("\n── junk parks the needle rather than producing NaN ──");
// A NaN rotation silently blanks the needle on Android; 0 is a visible,
// explainable resting position and the card shows "—" beside it.
for (const [n, v] of [["null", null], ["undefined", undefined], ["NaN", NaN], ["Infinity", Infinity], ["a string", "x"]])
  ok(`${n} → 0`, gaugePosition(v) === 0, String(gaugePosition(v)));

console.log("\n── dial geometry (cx=150, cy=150, r=140) ──");
const [cx, cy, r] = [150, 150, 140];
const L = at(cx, cy, r, 0), T = at(cx, cy, r, 0.5), R = at(cx, cy, r, 1);
ok("t=0 is the LEFT end of the arc", near(L[0], cx - r) && near(L[1], cy), L);
ok("t=0.5 is straight UP", near(T[0], cx) && near(T[1], cy - r), T);
ok("t=1 is the RIGHT end", near(R[0], cx + r) && near(R[1], cy), R);
ok("the arc never dips below the hub baseline — it would clip the card",
   Array.from({ length: 101 }, (_, i) => at(cx, cy, r, i / 100)[1]).every((y) => y <= cy + 1e-9));

const d = arc(cx, cy, r, 0, 1 / 3);
ok("arc() emits one move + one elliptical arc", /^M[\d.,-]+ A[\d.]+,[\d.]+ 0 0 1 [\d.,-]+$/.test(d), d);
ok("  ...with sweep=1 — clockwise, which is left→top→right when y points down", d.includes(" 0 0 1 "));
ok("  ...starting at the left end", d.startsWith("M10.00,150.00"), d.slice(0, 16));

console.log("\n── THE ONE THAT MATTERS: needle and arc agree ──");
// The needle is a View rotated by position*180deg, pointing left at 0deg. If
// this disagrees with at(), the needle sits in the wrong colour band.
const needleTip = (t) => { const a = Math.PI * t; return [cx - r * Math.cos(a), cy - r * Math.sin(a)]; };
for (const t of [0, 0.25, 1 / 3, 0.5, 2 / 3, 0.9, 1]) {
  const n = needleTip(t), a = at(cx, cy, r, t);
  ok(`t=${t.toFixed(3)}: needle points where the arc says`, near(n[0], a[0]) && near(n[1], a[1]), `${n} vs ${a}`);
}

console.log("\n── the drawn zones match the dashboard's thresholds ──");
ok("FULL_SCALE / HEALTHY_MAX / CAUTION_MAX are 20 / 5 / 10",
   /FULL_SCALE = 20/.test(src) && /HEALTHY_MAX = 5/.test(src) && /CAUTION_MAX = 10/.test(src));
ok("the tick labels print the real boundaries",
   /HEALTHY_MAX}%/.test(src) && /CAUTION_MAX}%/.test(src) && /FULL_SCALE}%\+/.test(src));
ok("the label is taken from the payload, never re-derived from the drawing constants",
   !/function labelFor|regime_label =/.test(src));

console.log("\n── the dial survives every screen width ──");
// Reimplements the component's sizing line-for-line from its own source, so a
// change there without a change here shows up as a failure rather than as a
// crash on somebody's phone.
const sizing = (w) => {
  const SW = Math.max(10, Math.min(16, w * 0.048));
  const r = Math.max(46, Math.min((w - SW) / 2 - 6, 128));
  const cy = r + SW / 2 + 4;
  return { SW, r, cy, height: cy + 46, needleLen: Math.max(12, r - SW - 26), gap: SW / 2 / (Math.PI * r) };
};
for (const w of [80, 240, 262, 300, 330, 360, 430, 700, 1024]) {
  const g = sizing(w);
  ok(`w=${w}: needle has a positive length`, g.needleLen > 0, JSON.stringify(g));
  ok(`  ...and stops short of the tick labels`, g.needleLen < g.r - g.SW / 2 - 11, `${g.needleLen} vs ${(g.r - g.SW / 2 - 11).toFixed(1)}`);
  ok(`  ...the arc fits the width`, 2 * g.r + g.SW <= Math.max(w, 120), `${(2 * g.r + g.SW).toFixed(1)} > ${w}`);
  // The gap is half a stroke width by construction, so it is a fixed number of
  // PIXELS and a growing number of DEGREES as the radius shrinks. What matters
  // is not the angle but whether the middle zone — the one with a gap at both
  // ends — survives it and still reads as a band.
  const middle = 1 / 3 - 2 * g.gap;
  ok(`  ...the amber band keeps most of its third at this size`,
     middle > 0.33 / 1.35, `${(middle * 3 * 100).toFixed(0)}% of a third`);
}
ok("the sizing constants in the component match the ones asserted here",
   /Math.max\(10, Math.min\(16, w \* 0.048\)\)/.test(src)
   && /Math.max\(46, Math.min\(\(w - SW\) \/ 2 - 6, 128\)\)/.test(src)
   && /Math.max\(12, r - SW - 26\)/.test(src)
   && /READOUT_H = 46/.test(src));

console.log("\n── the readout cannot be swept by the needle ──");
// The needle sweeps the entire well above the hub, so the number has to live
// below it. This is the assertion that keeps it there.
ok("the readout is positioned below the hub, not in the well",
   /position: "absolute", top: cy \+ 6/.test(src));
ok("  ...and the component says why", /never visits/.test(src));

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
