import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = path => readFile(join(root, path), 'utf8');
const navigation = await read('app/(tabs)/research.tsx');
const layout = await read('app/_layout.tsx');
for (const name of ['fib-bot', 'fib-5m', 'crypto-fib', 'protection', 'protection-detail', 'protection-tracked']) {
  assert.ok(!navigation.includes(`/research/${name}"`), name);
  assert.ok(!layout.includes(`name="research/${name}"`), name);
  const screen = await read(`app/research/${name}.tsx`);
  assert.match(screen, /<Redirect href="\/\(tabs\)\/research"/);
  assert.doesNotMatch(screen, /useQuery|useEffect|fetch\(|useBot|useFib|useCrypto|request\(/);
}
for (const name of ['screener', 'sector-rotation', 'calendar', 'backtest', 'gap-paper']) {
  assert.ok(navigation.includes(`/research/${name}"`), name);
}
console.log('Retired features hidden; deep links inert; remaining research tools preserved.');
