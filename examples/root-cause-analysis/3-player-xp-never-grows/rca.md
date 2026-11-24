# RCA: Player level never goes up after winning levels (Profile shows Lv. 1, XP 1/2)

## Summary
- **Root cause:** No code ever awards XP or raises `playerLevel` when a level is won; the win path `track('level')` counts the win but never touches `state.xp` or `state.playerLevel` (`js/app.js:930`).
- **Confidence:** Confirmed
- **Fix:** Add an `addXp(1)` step in `track()` right after `state.stats.levels += 1` (`js/app.js:930`) that adds XP, loops while `xp >= xpToNext`, raises `playerLevel` and pays `LEVEL_UP_REWARD` coins (diff: `proof/fix.diff`).
- **Blast radius:** Everything gated by player level stays locked for normal players (avatars `bee_fly` Lv 10 and `ladybug_fly` Lv 20, the Firefly skin Lv 5) and the "Next reward: 50 coins" level-up reward is never paid.
- **Why it slipped through:** The project has no automated tests (no test script in `package.json`), the CI only builds, and the only code that changes level or XP is the debug menu, which hides the gap.

## Bug
- Symptom: Profile shows "Level 1" and XP bar `1/2` however many levels were won.
- Expected: the XP bar fills and the player level goes up as levels are won.
- Steps: fresh save, win 10+ levels, open Profile. Reported rate: every time.
- Environment: web build, Edge. Source copied: Pixel Swarm `APP_VERSION = '1.0.0'` (`js/app.js:78`). There is no git history (no commit to record). The copy is `workcopy/`.
- Not given in the report: how much XP a win should give, the XP needed per level, whether replayed levels give XP, input method (mouse or touch), whether the levels were won by real play or with the debug menu.

## Reproduction
- Script: `repro/repro.mjs <projectDir> <port> <outPrefix> [wins]`. Output: `repro/run1.txt`, `repro/run2.txt`, `repro/run3.txt`.
- Start state: a fresh browser profile with an empty save. Setup only: an init script writes `{tutorialSeen, storySeen, ageGroup}` so the first-run story, tutorial and age gate do not block the script. All progress fields stay at their defaults (`playerLevel 1`, `xp 1`, `xpToNext 2`).
- Real user input used (Playwright mouse clicks): Play, DBG > "Win level" (the game's own debug menu; it opens the real win popup), Continue on the win popup (goes through `showWin` -> `track('level')` -> `finishWin`), waiting out the ad overlay, pause > Exit to Menu, the Profile button. 10 levels won per run.
- Results: 3/3 runs show `levelsWon 10, playerLevel 1, xp 1/2`, Profile text `1/2`, bar width `50%`, no page errors. Screenshots: `evidence/run1-profile.png`, `evidence/run2-profile.png`, `evidence/run3-profile.png` (and the `*-before-profile.png` files).
- Caveat: the levels were won with the debug "Win level" command, not by clearing a board by hand. It runs the same `showWin` (`js/app.js:2175`) that a real win runs; a hand-played board was not tried.

## Causal chain
1. `js/app.js:10-12` `DEFAULT_STATE` starts `playerLevel: 1, xp: 1, xpToNext: 2`. Confirmed (save dump line in `repro/run1.txt`).
2. `js/app.js:2175` `showWin` calls `track('level', ...)`. `js/app.js:930` `track` increments `stats.levels`, `firstTry`, `perfect`, tasks and gallery, but never touches `xp` or `playerLevel`. Confirmed: after 10 wins `levelsWon: 10` while `xp` and `playerLevel` equal the defaults (`repro/run1.txt`).
3. `js/app.js:2200` `finishWin` only grants coins (`grant`) and moves on. No XP. Confirmed by the run values.
4. `loadState` (`js/app.js:92`) and `saveState` (`js/app.js:111`) store `xp` and `playerLevel` unchanged. Confirmed (localStorage after 10 wins: `xp 1`, `playerLevel 1`).
5. `js/app.js:575` `renderProfile` shows `state.xp/state.xpToNext`, and `js/app.js:150-151` draw the level and the bar from the same fields. They faithfully show `1/2`, `Level 1`, 50%. Confirmed (`PROFILE UI` line in `repro/run1.txt`).

## Root cause
Missing code. Search of every write to `state.xp` and `state.playerLevel` in `js/` (grep for `xp` and `playerLevel`): the only assignments are the defaults (`js/app.js:10-11`) and the debug commands `levelup` and `xp` (`js/app.js:2611-2612`). `xpToNext` is never written at all. The constant `LEVEL_UP_REWARD = 50` (`js/app.js:570`) is only read to print a label (`js/app.js:576`) and is never paid.

```js
state.stats.levels += 1;   // js/app.js:930  wins are counted here, XP is not
```

It was possible because the progression system has the display, the constants and the debug cheats, but the one step that connects a win to XP was never written, and nothing in the project (no tests) checks that a win changes the player level.

## Proof
| Run | Change in the work copy | Result |
|---|---|---|
| Bug present | none | 10 wins -> `playerLevel 1, xp 1/2`, Profile `1/2` (`repro/run1.txt`, `run2.txt`, `run3.txt`) |
| Cause off | `proof/fix.diff` applied | 10 wins -> `playerLevel 6, xp 1/2`, Profile shows Level 6 (`proof/cause-off.txt`) |
| Cause on again | diff reverted (original file restored, identical to the project's file) | 10 wins -> `playerLevel 1, xp 1/2` (`proof/cause-on-again.txt`) |

Same reproduction script (`repro/repro.mjs`) for every run. The value 6 comes from the fix's simple placeholder rule: start XP 1 + 10 wins = 11 XP at 2 XP per level. Real XP rules are a design decision.

## Hypotheses rejected
- Load or save drops the level (a merge overwriting it): rejected. The dump after 10 wins shows `levelsWon: 10` saved correctly and `xp` / `playerLevel` equal to the defaults, and the fix works through the same save path.
- The Profile reads the wrong field: rejected. `renderProfile` (`js/app.js:575`) shows exactly `state.xp/state.xpToNext`; after the fix the same display shows Level 6.
- XP is only given on some paths (first win, new level) and was skipped: rejected, no XP code exists on any path.

## Blast radius
- Avatars `bee_fly` (Lv 10) and `ladybug_fly` (Lv 20) (`js/app.js:568`, `:578`, `:585`) stay locked. Checked by running: after 10 wins, clicking `bee_fly` shows the toast "Unlocks at player level 10" (`repro/run3.txt`).
- Firefly skin (`js/app.js:716`, level 5) is gated by `state.playerLevel < s.level` at `js/app.js:761`, `:816`, `:829`, so it cannot be unlocked by level. Checked by reading only.
- `LEVEL_UP_REWARD` (50 coins, `js/app.js:570`) shown as "Next reward" in the Profile is never paid. Checked by reading.
- The HUD level and bar on the menu, store and other screens (`js/app.js:150-151`, `index.html:60,126,270`) show the same stuck value. Checked by reading.
- Saved data: wrong data is saved (`playerLevel 1, xp 1`). Players who already won levels do not get their levels back from the fix alone; a one-time repair could derive XP from `state.stats.levels` on load.
- The fix changes nothing other code relies on; the debug `levelup` and `xp` commands still work.

## Why it slipped through
- Existing tests: none. `package.json` has no `test` script and the project has no test files. Nothing covers progression.
- CI: `.github/workflows/deploy-pages.yml` runs `npm ci` and the build only, no checks.
- Type checks and lint: none configured (plain JS; no type checker or linter in `package.json`).
- Design: the debug menu (`js/app.js:2611-2612`) can set the player level directly, so the UI and the level locks can be exercised without winning, and the display code looks complete.

## Fix
Add to `js/app.js` (`proof/fix.diff`, about 8 lines): in `track('level')` after `state.stats.levels += 1`, call `addXp(1)`. `addXp` adds XP and, while `xp >= xpToNext`, subtracts it, increments `playerLevel` and adds `LEVEL_UP_REWARD` coins.
- Does not cover: saves already stuck at Level 1 (needs a repair from `stats.levels`). The XP rules (1 XP per win, constant `xpToNext = 2`, replays counted) are placeholders; `xpToNext` should probably grow per level, by design. No level-up toast or sound was added; the fix adds coins directly (use `grant()` if the coin effect is wanted).
- Alternative (worse): compute the level from `stats.levels` only in the Profile display. It fixes the label but not the HUD, the locks or the reward, so it only hides the symptom.

## Regression test
- Test: `proof/regression-test.mjs` (runs `repro/repro.mjs`, wins 10 levels from a fresh save, asserts `playerLevel > 1`). It belongs in a new `tests/` folder of the project and should run in CI before the Pages deploy.
- With the bug: FAIL (`player level should go up after 10 wins, got playerLevel=1 xp=1/2`, `proof/regression-with-bug.txt`)
- With the fix: PASS (`playerLevel=6 after 10 wins`, `proof/regression-with-fix.txt`)

## Not checked
- Levels won by clearing a real board (the wins used the debug "Win level" command, which runs the same `showWin` and `track` path).
- Browsers other than Edge, touch input, the Android build, and the HUD on other screens by running.
- The intended XP values and XP curve (needs the design owner), and the Firefly skin lock by running.
- Real players' existing saves and a repair of them.

## Questions for the reporter
- Did you win levels by playing the board? (Expected: same result.)
- What XP per win and level-up curve does the design intend?

## Other defects noticed
- `DEFAULT_STATE` starts a new player at `xp: 1` of `xpToNext: 2` (`js/app.js:11-12`), so a brand-new player already sees a half-full bar; it was probably meant to be 0. Seen on the Profile screenshot only.
