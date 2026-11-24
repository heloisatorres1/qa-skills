# Root cause analysis: 5 bugs, with and without the skill

A test of the `root-cause-analysis` skill on 2026-11-24. The same AI model got the same 5 bug reports twice. In the first run it had no skill, and in the second run it had the skill. Every run worked on a fresh copy of the project, so the real projects were never changed.

- **Projects:** [Pixel Swarm](https://github.com/heloisatorres1/pixel-swarm) (HTML5 game, commit `db96df5`) and [QA Workspace](https://github.com/heloisatorres1/qa-workspace) (React + TypeScript web app, commit `ef52157`).
- **Bugs:** 3 planted on purpose (each folder has its `planted-bug.diff`), 1 real known bug (BUG-008), and 1 vague player report with no known answer.
- **Quick read:** [results.md](results.md) shows each root cause, the wrong code and the proven fix on one page.
- **Input:** only the bug reports in [bug-reports.md](bug-reports.md), written the way a tester would file them. The answer key was never shown to the model.

## Results

Each case was scored out of 12 against an answer key written before the runs. There were 6 criteria, each worth 0 to 2 points: right file and line, right mechanism, proof, fix and test, blast radius, and honesty.

| Case | Bug | Without skill | With skill | Time with skill |
|---|---|---|---|---|
| [1](1-stats-reset-after-reload) | Achievements go back to 0 after a refresh (planted) | 9 | **12** | 10 min |
| [2](2-daily-check-marks-vanish) | Daily reward check mark disappears after claiming (planted) | 9 | **12** | 17 min |
| [3](3-player-xp-never-grows) | Player level never goes up (real, BUG-008) | 10 | **12** | 23 min |
| [4](4-free-coins-extra-rewards) | "I got Free Coins 6 times today" (real, unknown cause) | 8 | **12** | 13 min |
| [5](5-in-progress-bug-not-a-blocker) | Critical in-progress bug missing from release blockers (planted) | 10 | **12** | 4 min |
| | **Total** | **46 / 60** | **60 / 60** | |

What changed with the skill:

| | Without skill | With skill |
|---|---|---|
| Found the right file and line | 5 / 5 | 5 / 5 |
| Ran the product to see the bug | 1 / 5 | 5 / 5 |
| Proved the cause: fix on removes the bug, fix off brings it back | 0 / 5 | 5 / 5 |
| Wrote a regression test that fails with the bug and passes with the fix | 0 / 5 | 5 / 5 |
| Said why the bug slipped through | 0 / 5 | 5 / 5 |
| Report passes the checker (`check-rca.mjs`) | 0 / 5 | 5 / 5 |

Finding the line was never the hard part: the model did it without the skill too. The skill adds what a developer needs to **trust** that line: proof, side effects, and a test.

## What the skill found that the baseline missed

- **Case 1:** the zeros are saved back at start-up, so players **lose their stats for good**. The fix alone does not bring them back. The boosters also lock again in levels, which was checked by running the game.
- **Case 2:** in the middle of a streak, the earlier check marks disappear too, not only today's.
- **Case 4:** the run turned a vague report into a **new real bug**. Pressing Enter or Space on the Watch button while the ad plays pays the reward again, **6 rewards in 2 of 2 runs**. The report keeps two claims apart: the mechanism is **Confirmed**, but "this is what the player did" is only **Likely**, because the report does not say how the player clicked. The baseline "proved" it with a script click that no real player can do.
- **Case 5:** 2 of the project's existing unit tests were **already failing** because of this bug. Saved release decisions keep the wrong blocker list.

## What is in each folder

| File | What it is |
|---|---|
| `rca.md` | The report for developers. The 5-line summary comes first |
| `baseline-without-skill.md` | The answer the same model gave without the skill |
| `repro/` | The reproduction script and its output for each run |
| `proof/` | `fix.diff`, the "cause off" and "cause on again" runs, the regression test and its FAIL / PASS output |
| `evidence/` | Screenshots of the symptom |
| `planted-bug.diff` | Cases 1, 2 and 5 only: the change that planted the bug |

## Notes on the evidence

- File paths inside the outputs were shortened to `<run>/` to remove local folders.
- The scripts import Playwright from `playwright-core`, or from the path in the `PLAYWRIGHT_CORE` environment variable. They drive the installed Edge browser.
- **Case 1:** the original "after refresh" screenshots are covered by the game's Special Offer popup. The values were still read from the page and the save (`repro/*.txt`). For readers, `evidence/clean-before-refresh.png` and `evidence/clean-after-refresh.png` were taken again with the same script after the report was written, with the popup closed (12 levels won before the refresh, 0 after).
- **Case 1 and case 3** used the game's debug shortcuts to skip the long part. Both reports say so.
  - Case 1 filled the stats with a shortcut, and the trigger (the refresh) was a real browser reload.
  - Case 3 won 10 levels with the debug "Win level" button. That button opens the same win screen a real win does (`js/app.js:2175`). A level cleared by hand was not tried, and the report lists that under "Not checked". After this run, the skill was tightened: such steps must now be labelled `assisted`.
- **Time and cost:** the skill is slower. Without it, a case took about 30 seconds. With it, a case took 4 to 23 minutes, because it runs the product, the proof and the tests.
