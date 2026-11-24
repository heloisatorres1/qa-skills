// Regression test: after claiming today's daily reward, the claimed cards must stay checked.
// usage: node daily-checks.test.mjs <path to js/app.js>   (should live in the project as tests/daily-info.test.mjs)
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const src = readFileSync(process.argv[2], 'utf8');
const fn = src.match(/function dailyInfo\(\) \{[\s\S]*?\n  \}/)[0];
const make = (daily) => new Function('state', 'today', 'yesterday', fn + '; return dailyInfo();')({ daily }, () => 'D2', () => 'D1');
const cases = [
  ['fresh save, claimed today (streak 1)', { streak: 1, last: 'D2' }, 1],
  ['streak 4 claimed today', { streak: 4, last: 'D2' }, 4],
  ['day 7 claimed today (streak 7)', { streak: 7, last: 'D2' }, 7],
  ['claimed yesterday, not yet today (streak 3)', { streak: 3, last: 'D1' }, 3],
  ['missed a day (streak 3, last older)', { streak: 3, last: 'D0' }, 0],
];
let failed = 0;
for (const [name, daily, shown] of cases) {
  try { assert.equal(make(daily).shown, shown); console.log('ok   ', name); }
  catch (e) { failed++; console.log('FAIL ', name, '-> shown cards =', make(daily).shown, ', expected', shown); }
}
process.exit(failed ? 1 : 0);
