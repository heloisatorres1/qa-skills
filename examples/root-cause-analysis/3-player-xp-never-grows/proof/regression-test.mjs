// Regression test: after winning 10 levels from a fresh save, the player level must be above 1.
// usage: node regression-test.mjs <projectDir>   (exit code 1 = FAIL, 0 = PASS)
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const dir = process.argv[2];
const out = execFileSync(process.execPath, ['repro/repro.mjs', dir, '5522', 'evidence/regtest', '10'], { encoding: 'utf8' });
const save = JSON.parse(out.match(/^SAVE (.*)$/m)[1]);
assert.equal(save.levelsWon, 10, 'setup: 10 levels should be won');
assert.ok(save.playerLevel > 1, `player level should go up after ${save.levelsWon} wins, got playerLevel=${save.playerLevel} xp=${save.xp}/${save.xpToNext}`);
console.log(`PASS: playerLevel=${save.playerLevel} after ${save.levelsWon} wins`);
