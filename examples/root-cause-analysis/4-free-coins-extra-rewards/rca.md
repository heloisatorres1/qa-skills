# RCA: Free Coins pays a 6th time in one day in the Store when Enter/Space is pressed while the ad plays

## Summary
- **Root cause:** `showAd` has no "an ad is already playing" guard, and the 5-a-day check in `watchFreeCoins` runs when the button is pressed but the count only goes up when the ad ends 3 s later, so several presses during one ad all pass the check (`js/app.js:418`, `js/app.js:442`).
- **Confidence:** Confirmed for this mechanism (Enter/Space on the still-focused Watch button: 6 rewards, 2/2 runs, cause off/on proven). Likely that this is what the reporter did (seen once, input method not given).
- **Fix:** In `showAd`, return at once if `#ad-overlay` is not hidden (1 line, `proof/fix.diff`); optionally also re-check `freeCoinsLeft()` inside the reward callback.
- **Blast radius:** Every rewarded ad goes through `showAd` (x2 win reward, +1 slot, booster ad, fail add-slot), so the same repeated press can pay them twice (read only, not run).
- **Why it slipped through:** The project has no tests and CI runs none; the ad overlay blocks mouse clicks but not keyboard presses, so mouse testing never shows it.

## Bug
- Symptom: Free Coins was received 6 times in one day.
- Expected: at most 5 per day; the Store shows "5 left today" and counts down.
- Steps: open the Store, use Free Coins (watch the video) repeatedly.
- Environment: web build, Edge. Reported rate: seen once, by a player.
- Not given in the report: input method (mouse, touch, keyboard), how fast the presses were, save state at the start, time of day (a midnight crossing is also possible).
- Work copy: `workcopy/` is a copy of the project folder (no git history, so no commit id; `node_modules` absent, not needed). The user's project was not edited.

## Reproduction
- Script: `repro/repro.mjs <projectDir> <port> <outPrefix>`. Real input through Playwright on Edge. Clean state: new browser context, with a returning-player save seeded only for setup (intro, tutorial and age question done, 0 free coins used). The Store is opened with a real click.
- Three scenarios, each from that clean state:
  - A, mouse, one click per finished ad, 6 attempts: 5 rewards, button disabled after 5. Works as designed.
  - B, mouse double-click (the overlay covers the button after the first click): 1 reward per attempt, 4 after 4 attempts. Not reproduced.
  - C, one click on Watch, then Enter/Space pressed 5 more times, 400 ms apart, while the ad plays: **6 rewards, 600 coins**, label "0 left today".
- Runs: `repro/run1.txt` and `repro/run2.txt`: C = 6 rewards in both (2/2). Screenshots: `evidence/run1-C-keyboard-repeat.png` (600 coins, "+100 coins" toast, Watch greyed out) and `evidence/run2-C-keyboard-repeat.png`; scenario A and B screenshots sit next to them.
- Each extra press starts its own 3 s ad timer, and each timer pays its own reward.

## Causal chain
1. `js/app.js:442` `watchFreeCoins` checks `freeCoinsLeft()` (`js/app.js:305`) at press time. The count is still 0 for every press made during the first ad. Confirmed (run1: all 6 presses pass the check).
2. `js/app.js:418-431` `showAd` starts a new timer for every call and never checks whether an ad is already playing. Presses 2 to 6 each start a 3 s countdown. Confirmed (the one-line guard in `proof/fix.diff` stops it).
3. `js/app.js:443-448` each timer, when it ends, runs the reward callback: `count += 1` and `grant({coins: 100})`. The callback does not check the limit again. Result: count 6, coins 600 (`repro/run1.txt`). Confirmed.
4. `js/app.js:359` the Store only shows the count, and the Watch button is disabled only after `renderStore`, which the first reward calls. It faithfully shows "0 left today" after 6 rewards. Confirmed.
5. Why a person gets there: the ad overlay (`index.html:528`, `css/style.css:1016`) covers the screen for the mouse, but keyboard focus stays on the Watch button, so Enter/Space still activate it. Confirmed for keyboard; mouse (A, B) did not reach it.

## Root cause
```js
function showAd(onReward) {                        // js/app.js:418
  const el = $('ad-overlay'), ad = nextHouseAd();  // no check that an ad is already showing
...
function watchFreeCoins() {                        // js/app.js:441
  if (!freeCoinsLeft()) return toast(...);         // checked now ...
  showAd(() => { ... state.freeCoins.count += 1;   // ... but counted 3 s later
```
Why it was possible: the limit is checked at request time and counted at completion time, and nothing stops a second request in between. The ad flow assumes the overlay blocks input, which is true for the mouse only.

## Proof
| Run | Change in the work copy | Result |
|---|---|---|
| Bug present | none | scenario C: 6 rewards, 600 coins, "0 left today" (`repro/run1.txt`, `repro/run2.txt`) |
| Cause off | `proof/fix.diff` applied | scenario C: 1 reward, 100 coins, "4 left today" (`proof/cause-off.txt`); A and B unchanged |
| Cause on again | diff removed (file identical to the original) | scenario C: 6 rewards, 600 coins (`proof/cause-on-again.txt`) |

## Hypotheses rejected
- Mouse double-click starts two ads: rejected. The overlay covers the button after the first click; scenario B gave 1 reward per attempt (run1, run2).
- Day key reset (`js/app.js:445`, `today()` at `js/app.js:303`) wipes the count: not seen. Slow mouse use (A) stops at 5. A midnight crossing is not excluded (see Not checked).
- Save/load loses `freeCoins`: `loadState` (`js/app.js:92`) shallow-merges the saved object, which keeps `freeCoins` whole; not a cause here.

## Blast radius
- Other `showAd` callers have the same missing guard: `js/app.js:1813` (booster ad), `2209` (ad between levels), `2661` (+1 slot), `2679` (x2 win reward, `finishWin(2)`), `2681` (fail add-slot). Read only, not run: a repeated Enter/Space could pay the x2 win reward or add slots more than once. The x2 one involves coins and is the most serious.
- `progressTask('video1')` (`js/app.js:444`) also runs once per ad but is capped at the task goal, so no harm.
- Wrong data is saved: `freeCoins.count` can be above 5 and `coins` includes the extra 100. The fix does not take back coins already given. `freeCoinsLeft()` copes with a count above 5 (`Math.max(0, ...)`), so loading such a save is safe.
- Ignoring a second request in `showAd` changes nothing for normal use: no caller intends two overlapping ads.

## Why it slipped through
- No automated tests exist in the project (no test folder, no `test` script in `package.json`).
- CI (`.github/workflows/deploy-pages.yml`) only builds and deploys; it runs no tests.
- Design: a limit checked at the start of a 3 s action and counted at the end, with a full-screen overlay as the only protection, which keyboard focus bypasses.
- Mouse or touch testing cannot reach it (scenarios A, B).
- No type check or linter (plain JavaScript).

## Fix
- In `js/app.js` `showAd`, after the `const el = ...` line, add `if (!el.hidden) return;` (`proof/fix.diff`). This closes the hole for all rewarded ads at once.
- Optional hardening: in the `watchFreeCoins` reward callback, do nothing if `freeCoinsLeft()` is 0.
- Alternative (worse): disable the Watch button when the ad starts. It fixes only Free Coins, and `renderStore` re-creates the button.
- Alternative (worse): blur the button on click. Fragile; Tab then Enter still works.
- Not covered: coins already granted to affected players.

## Regression test
- Test: `proof/regression-test.mjs <projectDir> <port>`. It belongs in the project as an end-to-end test, e.g. `tests/free-coins-limit.e2e.mjs`, run in CI before deploy (the project has no test runner yet).
- With the bug: FAIL (`proof/test-with-bug.txt`: "one Watch click plus 5 key presses during the ad must pay once, paid 6 times (600 coins)")
- With the fix: PASS (`proof/test-with-fix.txt`: "Free Coins paid 5 times, 500 coins")

## Not checked
- The reporter's real input method: touch, controller and screen reader were not tried; keyboard is the only path that reproduces.
- A midnight crossing (day key changing during an ad or between uses) and a changed device clock.
- Two browser tabs sharing one save.
- Other rewarded ads (x2, slots, boosters): read only.
- Other browsers, the phone app build, and the live site.
- Save restore (Settings) bringing back an old count.

## Questions for the reporter
- Did you use the keyboard (Enter/Space) or mouse/touch? Fast repeated presses while the video played?
- Was it near midnight, did you restore a save, or have the game open in two tabs?

## Other defects noticed
None.
