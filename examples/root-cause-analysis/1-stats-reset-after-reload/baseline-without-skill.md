# RCA: Achievements reset to 0 after page refresh

## Root cause
In `js/app.js`, `loadState()` (line ~98) merges the saved stats with the defaults in the wrong order:

    s.stats = Object.assign({}, s.stats, DEFAULT_STATE.stats);

`Object.assign` lets later arguments win. `DEFAULT_STATE.stats` (all counters 0: levels, firstTry, perfect, hard, pixels, boosters, coinsEarned, daily, eventWins) is passed last, so it overwrites every saved counter with 0 on each load. The order should be `Object.assign({}, DEFAULT_STATE.stats, s.stats)`, so saved values win and defaults only fill in missing keys.

The sibling lines for `settings` and `event` use the correct order (defaults first, saved last), which is why coins, gems, map progress, and settings survive the refresh.

## Why it matches the report
- Saving works. `track('level')` increments `state.stats.*` and calls `saveState()`, which writes the full state including stats to localStorage. Levels Won shows 12 before the refresh.
- On reload, `loadState()` reads the save and then zeroes `stats`. All Achievement cards that read `state.stats.*` show 0.
- Coins, gems and `state.progress` are top-level keys and are not touched by the faulty merge. Bugs Collected (`ownedSkins`) and Pictures Done are not `stats`-based, so they stay correct.
- It reproduces every time because the faulty merge runs on every load.

## Fix
Swap the arguments of the `stats` merge in `loadState()`.
