# RCA: Daily reward check mark disappears right after claiming

## Root cause
`dailyInfo()` in `js/app.js` (lines 455-463) decides whether the saved streak still counts with:

    const kept = d.last === yesterday();
    const streak = kept ? d.streak : 0;

That test is only true when the last claim was **yesterday**. After claiming, `claimDaily()` (line 492) saves `state.daily = { streak: info.streak + 1, last: today() }`. From then on `d.last === today()`, so `claimedToday` is true but `kept` is false. The streak is therefore read as 0.

With the streak at 0, `shown = streak % 7 = 0`. The `if (claimedToday && shown === 0 && streak > 0)` guard that is meant to handle the Day 7 case is also false, because `streak > 0` fails. `renderDaily()` (line 471) marks a card as `claimed` only when `i < info.shown`, so no card is `claimed` and no `<b class="check">` is drawn. The button still says "Claimed" because it depends only on `claimedToday`. The coins are still granted because `claimDaily()` runs before the render.

## Why reopening does not help
The saved state is correct (streak 1, last = today). The bug is in how the state is read, so every render on the same day gives the same wrong result. The check mark would only appear on a later day (when `last === yesterday()`), and then it would show the old streak while the new day is still unclaimed.

## Repro
Fresh save, press Claim. State becomes `{streak:1,last:today}`, `dailyInfo()` returns `{claimedToday:true, streak:0, shown:0, nextIndex:0}`, and no card is checked. This was found by reading the code and tracing the values by hand. I did not run it in a browser.

## Suggested fix
Count the streak as kept when the last claim was today or yesterday:

    const kept = claimedToday || d.last === yesterday();

Then, right after claiming, `streak` is 1, `shown` is 1 and `nextIndex` is 1. Day 1 is checked, and no card is marked "today" because `claimedToday` is true. The Day 7 case (streak 7, so `shown` is 0 and is then set to 7) also works. The `nextIndex` shown in the toast is read from `info` before the state changes, so it is unaffected.

## Files
- `js/app.js` lines 455-463 (`dailyInfo`, the faulty `kept` test), 467-481 (`renderDaily`), 488-498 (`claimDaily`)
- `css/*.css` line 280 (`.day.claimed .check` styling, fine)
