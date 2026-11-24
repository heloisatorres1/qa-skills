# Bug reports (as a tester would file them)

## case-1 - Achievements go back to 0 after refreshing the page
Project: Pixel Swarm (HTML5 game). Web build, Edge, 390x844.
Steps:
1. Play and win a few levels (or use any save with progress).
2. Open Collections > Achievements: Levels Won shows the right number (e.g. 12).
3. Refresh the page (F5).
4. Open Collections > Achievements again.
Expected: the same numbers as before the refresh.
Actual: every achievement shows 0 (Levels Won 0, Coins Earned 0...). Coins, gems and the completed levels on the map are still there.
Repro: every time.

## case-2 - Daily reward check mark disappears right after claiming
Project: Pixel Swarm (HTML5 game). Web build, Edge, 390x844.
Steps:
1. Fresh save. Open Activities (daily rewards).
2. Press Claim.
Expected: the Day 1 card shows a check mark, the button says Claimed.
Actual: the coins are added and the button says Claimed, but no card has a check mark. Closing and reopening Activities does not help.
Repro: every time.

## case-3 - Player level never goes up
Project: Pixel Swarm (HTML5 game). Web build, Edge.
Steps:
1. Fresh save. Win 10+ levels.
2. Open the Profile.
Expected: the XP bar fills and the player level goes up as you win.
Actual: player level stays 1 and the XP bar shows 1/2 no matter how many levels are won.
Repro: every time.

## case-4 - Free Coins video can be watched more than 5 times a day
Project: Pixel Swarm (HTML5 game). Web build, Edge.
Steps:
1. Open the Store.
2. Use Free Coins (watch the video) repeatedly.
Expected: at most 5 per day ("5 left today").
Actual: I got Free Coins 6 times today.
Repro: seen once, by a player.

## case-5 - Critical in-progress bug missing from the release blockers
Project: QA Workspace (web app: Vite + React + TypeScript). Run with `npx vite`, open the Releases page.
Steps:
1. Open Releases, project Orbit Garden, release 0.8.4.
2. Look at the blockers and the "critical bugs unresolved" message.
3. Open Triage, filter severity Critical, status Any status.
Expected: every unresolved critical bug is a blocker. Triage shows CP-104 "Player gets stuck in greenhouse after reconnect", Critical, In progress, so the release should list 2 blockers (CP-104 and CP-109).
Actual: the release lists only CP-109 ("1 critical bug unresolved"). CP-104 is also missing from Triage's default view ("Open + in progress").
Repro: every time.
