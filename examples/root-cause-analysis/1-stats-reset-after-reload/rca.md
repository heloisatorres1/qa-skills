# RCA: Achievement counters reset to 0 on every page load, in loadState, after F5

## Summary
- **Root cause:** `loadState` merges the saved stats and the defaults in the wrong order, so the all-zero defaults overwrite the saved counters on every load (`js/app.js:97`).
- **Confidence:** Confirmed
- **Fix:** Swap the arguments on line 97 to `Object.assign({}, DEFAULT_STATE.stats, s.stats)`, the same order lines 96 and 98 already use.
- **Blast radius:** The zeros are saved straight back at boot (`js/app.js:3134`), so the player's stats are lost for good; boosters re-lock (verified by running the game) and the "booster unlocked" pop-up can fire again.
- **Why it slipped through:** No test covers loading a save that has stats, and the dev shortcut `#achievements` sets stats in memory so the screen never goes through a load.

## Bug
- Symptom: after F5, every Achievements card shows 0 (Levels Won 0, Coins Earned 0, ...). Coins, gems and completed levels on the map are still there.
- Expected: same numbers as before the refresh.
- Environment: web build, Edge, 390x844. Reported rate: every time.
- Steps: win levels (or use a save with progress), open Collections > Achievements (12 shown), press F5, open Achievements again.
- Not in the report: the exact build, whether the save was old (before version 2, no wrapper), touch or mouse input.

## Reproduction
- Script: `repro/repro.mjs <port> <tag> <outDir> <mode>`. Edge, 390x844, touch enabled. Clicks the real Collections button and the Achievements tab, reloads with `page.reload()`, reads the cards and the saved stats in `localStorage`.
- Clean start: a save I wrote into `localStorage` before the page loads (`pixelswarm.save.v1`, version 2) with coins 900, gems 40, one completed level and stats levels 12, firstTry 7, perfect 5, hard 2, pixels 4321, boosters 3, coinsEarned 560, daily 4, eventWins 1. Writing the save is setup; the trigger (reload) is a real browser reload.
- Mode B (matches the report): the numbers are live in memory first (set through the dev shortcut `index.html#achievements`, so this part is assisted: I did not play 12 levels), the hash is cleared, then F5. Before F5: Levels Won=12. After F5: Levels Won=0. Result 2/2 (`repro/run1-bug-modeB.txt`, `repro/run2-bug-modeB.txt`).
- Mode A (a save with progress, no shortcut): the first load already shows 0 and the stored stats are already all 0 before any F5 (`repro/run1-bug-modeA.txt`), because a page load runs the same code as a refresh. 1/1.
- Screenshots: `evidence/bug1-before-refresh.png`, `evidence/bug1-after-refresh.png`, `evidence/bug2-after-refresh.png`, `evidence/bugA-before-refresh.png`.
- Not reproduced through real play (I did not win levels by hand). The mechanism does not depend on how the stats got there, only on what is in the save.

## Causal chain
1. `js/app.js:97` `loadState` copies the saved stats first and the all-zero `DEFAULT_STATE.stats` (`js/app.js:33`) second, so the defaults win and every counter is 0. Confirmed (after load the `localStorage` stats are all 0, `repro/run1-bug-modeA.txt`).
2. `js/app.js:135` `const state = loadState()` makes this the live state for the whole session. Confirmed.
3. `js/app.js:3134` boot calls `saveState()`, which writes the zeroed stats over the good save (`js/app.js:116` copies the previous save into the backup slot on the next save). Confirmed (saved stats are zero right after load).
4. `js/app.js:946-956` and `js/app.js:988-990` the Achievements screen reads `state.stats.*` as is and shows 0. Confirmed. This display code is correct.

## Root cause
```js
s.stats = Object.assign({}, s.stats, DEFAULT_STATE.stats);           // js/app.js:97  (defaults override saved)
s.settings = Object.assign({}, DEFAULT_STATE.settings, s.settings);  // js/app.js:96  (correct order)
s.event = Object.assign({}, DEFAULT_STATE.event, s.event);           // js/app.js:98  (correct order)
```
`Object.assign` lets the last argument win. Lines 96 and 98 put the defaults first so saved values win; line 97 has the two arguments the other way round. Nothing else resets stats on load: every other write to `state.stats` is a `+= 1` during play or a debug command (`js/app.js:367, 493, 930-937, 1988, 2613, 2736, 2851`).

## Proof
| Run | Change in the work copy | Result |
|---|---|---|
| Bug present | none | Before F5 Levels Won=12; after F5 Levels Won=0, saved stats all 0 (`repro/run1-bug-modeB.txt`, `run2`) |
| Cause off | `proof/fix.diff` applied | After F5 Levels Won=12, all 9 cards unchanged, saved stats unchanged (`proof/cause-off-modeB.txt`, `proof/cause-off-modeA.txt`) |
| Cause on again | diff removed (`workcopy/js/app.js` identical to the project again) | After F5 Levels Won=0 (`proof/cause-on-again-modeB.txt`) |

## Hypotheses rejected
- None: the first trace held and the on/off proof confirmed it. Settings and event use the right order (lines 96, 98), so only line 97 is wrong. The Achievements display and the save writer (`saveState`, `js/app.js:111`) are fine: they write and show what `state` holds.

## Blast radius
- **Data loss (most serious):** the boot `saveState()` (`js/app.js:3134`) writes zeros over the good save at every launch. A player who already opened the game has lost the counters for good (the backup slot is overwritten at the next save). Checked by running: stored stats are 0 right after the first load (mode A). Read, not run: the phone copy `PSNative.storeSet` (`js/app.js:118`) is overwritten the same way.
- **Boosters re-lock (checked by running):** `renderBoosters` (`js/app.js:1733`) uses `state.stats.levels >= unlockAt`. With 12 levels won in the save, Shuffle (unlockAt 11) is locked in a level; with the fix it is open (`proof/blast-boosters-bug.txt`: Shuffle [LOCKED]; `proof/blast-boosters-fixed.txt`: Shuffle [open]; screenshots `evidence/blast-bug-boosters-in-level.png`, `evidence/blast-fixed-boosters-in-level.png`).
- Read only, not run: the "booster unlocked" pop-up (`js/app.js:2199`) compares `unlockAt === state.stats.levels`, so it fires again as the counter climbs from 0; the first-level tutorial and welcome pop-up (`js/app.js:672`, `js/app.js:1528`) test `stats.levels === 0` and are guarded only by `tutorialSeen`; the diagnostic report field `levelsWon` (`js/app.js:3066`) reports 0.
- Daily tasks, the event and the save code (`saveCode`, `js/app.js:122`) carry the zeroed stats too (read only).
- Progress, coins, gems and the map are not touched (other fields), which matches the report.
- The fix changes nothing else: a save with no `stats` field still falls back to the defaults.

## Why it slipped through
- Existing tests: the project has no unit test runner. The only automated checks are the in-game `#featuretest` (saves, backup, save code; it never checks `stats`, read at `js/app.js:2884-2941`) and `tools/check-pictures.mjs`. I read them; I did not run `#featuretest`.
- CI: `.github/workflows/deploy-pages.yml` only runs `npm ci` and `npm run build:debug`, no tests.
- Design: three near-identical merge lines where only the argument order differs, with nothing marking which order is right. The dev shortcut `#achievements` (`js/app.js:2851`) sets stats in memory, so manual checks with it never go through `loadState`. A fresh test save has all-zero stats, where the bug is invisible.
- Types: plain JavaScript, no type checker or linter flags a swapped argument order.

## Fix
- Change `js/app.js:97` to `s.stats = Object.assign({}, DEFAULT_STATE.stats, s.stats);` (`proof/fix.diff`, one line).
- Does not cover: players whose save was already overwritten with zeros (the data is gone; only an earlier save-code backup can restore it). The team should decide whether to tell those players.
- Alternative (labelled): rebuild the stats from the completed levels in `progress`. Worse: `pixels`, `coinsEarned`, `boosters` and `daily` cannot be rebuilt, so it is only a partial repair and does not fix the cause.
- Alternative (labelled): stop calling `saveState()` at boot. Worse: hides the data loss but the screen still shows 0 after every load.

## Regression test
- File: `proof/regression.test.mjs` (`node proof/regression.test.mjs <port>`, port of the server for the project under test). It should live in the project as `tests/save-stats.test.mjs`, run in CI after `npm run build:debug` with the dev server up.
- It writes a save with stats (12 levels, etc.), loads the page, opens Achievements, and checks both the screen and the stored stats, on first load and after F5.
- With the bug: FAIL (`FAIL first load: screen says "Levels won: 0" (expected 12)` and the same after F5; exit code 1, `proof/regression-with-bug.txt`)
- With the fix: PASS (exit code 0, `proof/regression-with-fix.txt`)

## Not checked
- Real play to earn the stats: the 12-level number before F5 came from the dev shortcut `#achievements`, not from winning levels.
- Other browsers, a real phone and the Capacitor phone app (the native-storage copy is read from code only).
- Old saves without the `v` wrapper (before version 2): the same line applies to them, but I did not load one.
- The reporter's real save and exact build; the live GitHub Pages site (I tested a local copy only).
- Whether any player already lost data in production (no access to player data).
- I did not run the in-game `#featuretest`.

## Questions for the reporter
- Did the numbers already read 0 on the first load after you updated or opened the game, before any F5?
- If you have a Settings > Back up code from before, can you attach it?

## Other defects noticed
- `DEBUG = true` at `js/app.js:80` while a comment at `js/app.js:2565` says to set it false before publishing, and the DBG button shows on the main menu. The Pages workflow builds with `build:debug`, so this may be intentional; not investigated further.
