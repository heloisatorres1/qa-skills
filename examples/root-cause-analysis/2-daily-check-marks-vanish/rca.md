# RCA: Daily reward check marks vanish right after claiming, in Activities > Daily Rewards, when today's reward was just claimed

## Summary
- **Root cause:** `dailyInfo()` counts the streak as 0 whenever the last claim was not yesterday, so on the day you claim (`last === today`) it shows 0 checked cards (`js/app.js:458`).
- **Confidence:** Confirmed
- **Fix:** Make `kept` true when the reward was already claimed today: `const kept = claimedToday || d.last === yesterday();` (`js/app.js:458`).
- **Blast radius:** Only the check marks and green "claimed" cards of the 7-day calendar; on a mid-streak claim the checks already earned also disappear (3 checks become 0). The saved streak is correct, so no data repair is needed.
- **Why it slipped through:** The project has no tests (CI only builds and deploys), and `claimedToday` and `kept` are two separate date checks that cannot both be true.

## Bug
- **Symptom:** After pressing Claim, coins are added and the button says "Claimed", but no card has a check mark. Closing and reopening Activities does not bring it back.
- **Expected:** Day 1 card shows a check mark, button says "Claimed".
- **Steps:** fresh save, open Activities, press Claim.
- **Environment:** web build, Edge, 390x844. Reported rate: every time.
- **Not given in the report:** input method (I used mouse clicks), whether it also happens mid-streak (it does, and it is worse), the device date or time zone.

## Reproduction
- Script: `repro/repro.mjs` (Playwright, Edge, 390x844, dev server from `workcopy/` on port 5511). It prints the number of check marks and the button text before claim, after claim, and after reload and reopen.
- Clean state: a new browser context (empty storage). Setup only: a seeded save that skips the age gate, intro story and tutorial (`ageGroup`, `storySeen`, `tutorialSeen`, `launches`). `daily` stays at the default `{streak:0,last:''}`. The special-offer pop-up is closed by clicking its X. `STREAK=N` seeds "N days claimed in a row until yesterday" for the mid-streak variants.
- User input: real clicks on the Activities button and on `#daily-claim`.
- Results (fresh save): run 1 and run 2, **2/2**, identical: before claim `checks = 0`, after claim `checks = 0 | button = Claimed | claimed cards = 0`, saved `daily = {"streak":1,"last":"2026-11-24"}`, after reload and reopen `checks = 0 | button = Claimed`.
- Outputs: `repro/run1.txt`, `repro/run2.txt`. Screenshots: `evidence/run1-1-before.png`, `evidence/run1-2-after.png`, `evidence/run1-3-reopen.png` (same with `run2-`).
- Variants: `STREAK=3` goes from 3 checks to 0 after claim (`repro/streak3-bug.txt`); `STREAK=6` goes from 6 checks to 0 (`repro/streak6-bug.txt`).

## Causal chain
1. `js/app.js:492` `claimDaily()` saves `state.daily = { streak: 1, last: today() }`. The saved value is correct (dump in `repro/run1.txt`). Confirmed.
2. `js/app.js:457-459` `dailyInfo()` computes `claimedToday = (d.last === today())` = true, but `kept = (d.last === yesterday())` = false, so `streak = kept ? d.streak : 0` = 0. This is the first wrong value. Confirmed (cause-off run).
3. `js/app.js:460-461` `shown = streak % 7` = 0, and the special case `claimedToday && shown === 0 && streak > 0` is skipped because `streak` is 0. So `shown = 0`. Confirmed.
4. `js/app.js:471` `renderDaily()` marks a card `claimed` only if `i < info.shown`, so no card is claimed and no `<b class="check">` is drawn (`js/app.js:475`, `js/app.js:479`). Confirmed (`checks = 0`).
5. The button says "Claimed" because `js/app.js:485` uses `claimedToday`, which is correct. That is why the report shows "Claimed" without checks. Confirmed.
6. Reopening runs the same `dailyInfo()` on the same saved value, so the result is the same on every render. Confirmed (`after reload+reopen: checks = 0`).

## Root cause
```js
const claimedToday = d.last === today();
const kept = d.last === yesterday();      // js/app.js:458
const streak = kept ? d.streak : 0;
```
`kept` answers "did the streak survive until today?" with a check that is only true when the last claim was yesterday. Once you claim today, `last` is today, so `kept` is false and the streak you just earned is thrown away for display. The special case on line 461 (`claimedToday && shown === 0 && streak > 0`) was clearly meant to handle the "claimed today" state, but it can never fire because `streak` is already 0. The calendar only looks right the next day, when `last === yesterday` again.

## Proof
| Run | Change in the work copy | Result |
|---|---|---|
| Bug present | none | After claim: `checks = 0`, `claimed cards = 0`, button "Claimed" (`proof/bug-run1.txt`, `repro/run2.txt`) |
| Cause off | `proof/fix.diff` applied | After claim: `checks = 1`, `claimed cards = 1`; reload and reopen still 1 (`proof/fixed-run1.txt`, `proof/fixed-run2.txt`). Mid-streak: 3 becomes 4, 6 becomes 7 (`proof/fixed-streak3.txt`, `proof/fixed-streak6.txt`) |
| Cause on again | diff removed (`app.js` restored byte for byte) | After claim: `checks = 0` again (`proof/reverted-run.txt`) |

## Hypotheses rejected
- **CSS hides the check** (`css/style.css:280`, `.day.claimed .check`): rejected. The DOM has `checks = 0` and `claimed cards = 0`, so the markup is never produced.
- **The save does not store the claim**: rejected. The saved `daily` is `{"streak":1,"last":"<today>"}` after the claim.
- **Render runs before the state is updated** (`claimDaily` calls `renderActivities` after `state.daily` is set, `js/app.js:492-496`): rejected, because reopening later gives the same result.
- **The Day 7 branch (`js/app.js:461`) is wrong**: rejected. It is correct in itself; it just never receives a non-zero `streak`.

## Blast radius
Readers of `dailyInfo()` (`js/app.js:468, 489, 540, 549, 550, 3006`):
- `renderDaily()` (`js/app.js:468-481`): wrong. No check marks and no green "claimed" cards on the day you claim. Mid-streak, the checks of earlier days vanish too (3 to 0, run). Day 7 claim: all 7 vanish (run, `STREAK=6`). Checked by running.
- `claimDaily()` (`js/app.js:489-492`): reads `info.streak` only when `claimedToday` is false, where `kept` is correct. Not affected (read only).
- `activityCount()` (`js/app.js:540`), the tab dots (`js/app.js:549-550`) and the tab choice (`js/app.js:3006`): use only `claimedToday`. Not affected (read only).
- Saved data: correct (`streak` and `last` are saved properly), so **no repair or migration is needed**. The next day the display is right again.
- Money and progress: coins and gems are granted correctly (the report itself says the coins are added).
- The DBG "New daily reward" button (`js/app.js:2614`) sets `last = yesterday`, a state where the display is right, so it hides the bug in manual testing.

## Why it slipped through
- **No automated tests:** no test files in the project and `package.json` has no test script (checked by listing the project).
- **CI only builds and deploys:** `.github/workflows/deploy-pages.yml` runs `npm ci` and `npm run build:debug`, no tests.
- **Easy-to-misuse pattern:** `claimedToday` and `kept` are two date comparisons that cannot both be true, but the streak logic needs "alive today" to include both. The special case on line 461 looks like it covers the claimed-today state, which hides the gap when reading the code.
- **The debug shortcut masks it:** the DBG button resets `last` to yesterday, where the display is right.
- The project copy has no git history, so I could not check when the line changed.

## Fix
Change `js/app.js:458`:
```diff
-    const kept = d.last === yesterday();
+    const kept = claimedToday || d.last === yesterday();
```
Full diff: `proof/fix.diff`. It does not need a data repair. It does not change what happens when a day is missed (`streak` still resets to 0).
- Alternative (worse): force the checks on inside `claimDaily()`. It fixes only the one screen after a claim, leaves `dailyInfo()` wrong, and breaks again on reopen.

## Regression test
- Test: `proof/daily-checks.test.mjs` (standalone Node script; it extracts `dailyInfo()` from `js/app.js` and runs it with a fixed "today" and "yesterday"). It should live in the project as `tests/daily-info.test.mjs` and run in CI before the build.
- With the bug: FAIL (`proof/test-with-bug.txt`): `fresh save, claimed today (streak 1) -> shown cards = 0 , expected 1`, and the same for streak 4 and Day 7 (3 FAIL, 2 ok). The script exits with code 1.
- With the fix: PASS (`proof/test-with-fix.txt`): 5 of 5 ok.

## Not checked
- Other browsers, a real phone, and the Android app build (only Edge at 390x844 with mouse clicks).
- The reporter's exact path (their device, whether they went through the age gate and tutorial, their time zone). I seeded a save to skip the onboarding.
- Midnight passing while Activities stays open, and a device clock or time zone change.
- Git history (not available in the copy).
- `npm run build` (production build) and the itch.io package.

## Questions for the reporter
- When you claim on Day 2 or later, do the check marks of earlier days also disappear? (They do in my mid-streak runs.)

## Other defects noticed
None.
