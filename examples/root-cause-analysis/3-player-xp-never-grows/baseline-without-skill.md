# RCA: Player level never goes up

## Root cause
No code awards XP or levels the player up when a level is won. The XP/level-up step is missing from the win handler `track('level', ...)` in `js/app.js` (about lines 921-939).

That handler updates progress, gallery, `stats.levels`, firstTry/perfect/hard/event stats and daily tasks. It never changes `state.xp`, `state.xpToNext` or `state.playerLevel`, and it never gives the coin reward.

## Evidence (static code search of the whole project, no browser run)
- `state.xp` is never incremented anywhere. Its only writes are:
  - the default state, `xp: 1, xpToNext: 2, playerLevel: 1` (`js/app.js` lines 10-12);
  - the debug commands `levelup` and `xp` (about lines 2611-2612), which set `xp = 0`.
- `state.playerLevel` is only incremented by the debug `levelup` command (line 2611). The `xp` debug command sets it to 20.
- `LEVEL_UP_REWARD = 50` (line 570) is only displayed in the Profile (line 576). Nothing grants it, so the level-up logic (add XP, compare with `xpToNext`, level up, grow the threshold, pay coins) is absent.
- The Profile screen only reads state. `renderProfile` (line 572) shows `${state.xp}/${state.xpToNext}`, which is the default 1/2. `renderHud` (lines 150-151) shows the level and the bar fill. The display code is correct. It shows exactly what is stored.
- No other file touches xp: `data.js`, `report.js` and the other scripts have no xp or level-up writes.

## Why the symptom matches
A fresh save starts at level 1 with xp 1 of 2 (bar half full). Winning levels runs `track('level')`, which saves state but never changes those fields. The Profile therefore always shows level 1 and 1/2, however many levels are won.

Features gated on player level (avatars at line 578, skins at lines 761, 816 and 829) stay locked too.

## Fix direction
In `track('level')`, add XP, then loop while `xp >= xpToNext`: level up, subtract the threshold, set a new `xpToNext`, and add `LEVEL_UP_REWARD` coins. Then call `renderHud`.
