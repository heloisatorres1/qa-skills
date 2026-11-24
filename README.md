# QA Skills for Claude Code

QA skills for [Claude Code](https://claude.com/claude-code), written by a QA lead. They hold the agent to the rules a QA lead holds human testers to.

- **[`test-design`](skills/test-design/SKILL.md)** reads a website, app, game, source code or a spec. It suggests test cases (happy path, negative path, edge cases), what to automate, a CI/CD plan and the tools. You approve before anything is built. It works for any software and is strongest on the web. [Examples](#example-test-design-on-saucedemo-and-pixel-swarm).
- **[`root-cause-analysis`](skills/root-cause-analysis/SKILL.md)** takes one bug report and returns the line of code that causes it, a fix **proven** in a copy of the project (bug gone with the fix, back without it), everything else the same cause breaks, and a regression test. Tested on 5 bugs: **60/60 with the skill, 46/60 without**. [Results](examples/root-cause-analysis/results.md).
- **The game skills** find problems in any engine **and prove them** with screenshots, state reads, logs and `file:line` references. They then write a report a developer or producer can act on. Unity, Godot, Unreal, web, desktop or mobile: they only need a playable build, the source, or both.

![Generated QA report for Pixel Swarm](docs/report-preview.png)

*A real report produced by `text-review` on my game [Pixel Swarm](https://github.com/heloisatorres1/pixel-swarm). [Read it](examples/pixel-swarm-text-review/report.md).*

## Bugs these skills found

Run on my own game, [Pixel Swarm](https://github.com/heloisatorres1/pixel-swarm). Each bug has a video, screenshots, save data before and after, and the line of code involved. All details are in **[FOUND-BUGS.md](FOUND-BUGS.md)**.

| | Bug | Severity | Reproduced |
|---|---|---|---|
| [BUG-001](FOUND-BUGS.md#bug-001-level-complete-closes-on-a-tap-outside-it-the-reward-is-lost) | Tapping outside Level Complete closes it: the reward is lost and the board is left empty | Major | 12/12 |
| [BUG-002](FOUND-BUGS.md#bug-002-settings-and-close-pushed-off-screen-on-360-px-phones) | On 360 px phones the top bar pushes Settings and the store's Close button off screen | Major | 3/3 |
| [BUG-003](FOUND-BUGS.md#bug-003-the-store-sells-no-ads-again-to-players-who-own-it) | The store sells the $4.99 offer with No Ads to players who already own No Ads | Major | 4/4 |
| [BUG-008](FOUND-BUGS.md#bug-008-player-xp-never-grows-the-player-stays-level-1-forever) | Player XP never grows: after 102 wins the player is still level 1, so level-gated content stays locked (found by the full playthrough) | Major | 2/2 |
| [BUG-004](FOUND-BUGS.md#bug-004-add-slot-from-out-of-slots-has-no-limit) | Add Slot from Out of Slots has no limit: 10 squeezed slots (the booster stops at 7) | Minor | 5/5 |
| [BUG-009](FOUND-BUGS.md#bug-009-free-coins-pays-again-when-enter-or-space-is-pressed-during-the-ad) | Free Coins pays again when Enter or Space is pressed during the ad: 6 rewards from one ad (found by `root-cause-analysis` from a vague player report) | Minor | 2/2 |

All of them are open (reported, not fixed yet). The [examples index](examples/README.md) lists every run and all 9 bugs, including the minor ones.

![BUG-001 storyboard](docs/bugs/BUG-001.png)

## Why I built this

I've led game QA teams for 6+ years. AI agents can now play and inspect games, but an agent that says "I tested the store, it works" is no use to a team. These skills hold the agent to the same rules I hold human testers to:

- **No finding without proof.** Every bug has repro steps, expected vs actual, and evidence that opens in the report.
- **Reproduce before reporting.** A runtime bug is only `confirmed` after 2 reproductions from a clean state. Seen once? It's an `observation`.
- **Honest coverage.** Every area ends as `PASS`, `FAIL`, `PARTIAL`, `BLOCKED` or `NOT_TESTED`, with a reason. Things an AI can't judge (fun, audio quality, real devices) are listed as manual, not hidden.
- **Facts apart from guesses.** `actual` is what was seen. Root-cause ideas go in `suspected_cause`, worded as hypotheses.

The report builder enforces these rules: it refuses a `findings.json` with a "confirmed" bug seen once, a FAIL with no linked bug, or evidence files that don't exist.

## The skills

| Skill | What it does | Proven on |
|---|---|---|
| [`test-design`](skills/test-design/SKILL.md) | Reads a site, app, game, code or document and suggests test cases with named techniques (equivalence partitioning, boundary values, decision tables, state transitions), each with a source, a risk priority and an automation level. Adds an automation plan: CI/CD stages and tool options such as Allure. **Suggests only.** It builds starter tests and a CI file after you approve the cases and pick the tools, and proves them (3 runs in a row, plus one deliberate failure). A checker refuses vague or unsourced cases. | **SauceDemo** (site only): 54 cases, 12 questions. 13 approved tests: 11 passed 3/3, 2 failed 4/4 on real product faults. [Example](examples/saucedemo-test-design/README.md) · **Pixel Swarm** (code + build): 31 cases that cover 4 of the 5 main known bugs. [Example](examples/pixel-swarm-test-design/README.md) |
| [`root-cause-analysis`](skills/root-cause-analysis/SKILL.md) | Takes one bug (a report, a finding from another skill, or a short description) and finds its root cause: the exact `file:line`, the chain from cause to symptom, proof that switching the cause off removes the bug and switching it back on brings it back, the blast radius, why it slipped through, the fix and a regression test that fails before the fix and passes after. Every claim carries a confidence level (Confirmed, Likely, Unproven, Not reproduced). Works on a copy and never changes your project. A checker refuses a report without proof. | 5 bugs in Pixel Swarm and QA Workspace: **60/60 with the skill vs 46/60 without**. Found a new real bug ([BUG-009](FOUND-BUGS.md#bug-009-free-coins-pays-again-when-enter-or-space-is-pressed-during-the-ad)) from a vague player report. [Results](examples/root-cause-analysis/results.md) · [Benchmark](examples/root-cause-analysis/README.md) |
| [`text-review`](skills/text-review/SKILL.md) | Pulls every player-facing string from any engine (HTML, JSON, CSV/PO/XLIFF tables, Android/iOS strings, Godot scenes, Unity YAML, string literals in code), checks spelling, grammar, terms, placeholders and plurals, then screenshots the text in the running game to catch overlap and truncation. | 861 strings checked, 0 spelling errors, 6 text issues (2 only visible in the game) and 3 queries. [Report](examples/pixel-swarm-text-review/report.md) |
| [`full-playthrough`](skills/full-playthrough/SKILL.md) | Finishes the whole game: every level, theme, mode and ending. It builds a content inventory from the game data first, so locked or hidden content is not missed. It checks rewards and unlocks along the way, keeps a progress log it can resume from, and labels anything finished with cheats as `assisted`. | **102/102 levels** completed with real taps in 1 h 34 min (1 h 12 min of play), every reward and save checked. Found [BUG-008](FOUND-BUGS.md#bug-008-player-xp-never-grows-the-player-stays-level-1-forever). [Results](examples/pixel-swarm-playthrough/README.md) |
| [`test-game-full`](skills/test-game-full/SKILL.md) | The test lead. Detects which features the game has, writes a test plan, runs a smoke gate, then runs the matching feature skills and merges their results into one report with a release verdict. | 80 checks in 8 modules, 7 bugs (3 major), verdict "not ready for a store release". [Summary](examples/pixel-swarm-full/summary.md) |
| [`test-store`](skills/test-store/SKILL.md) | Prices vs data, currency deltas, insufficient funds, double purchase, restore, no-ads, rewarded ads, economy sources and sinks. Never spends real money. | 15 checks: prices and balances exact. Found [BUG-003](FOUND-BUGS.md#bug-003-the-store-sells-no-ads-again-to-players-who-own-it) (No Ads sold again) and a double-tap query. |
| [`test-puzzles`](skills/test-puzzles/SKILL.md) | Models the rules from the code, checks every level's data for solvability, then tries to break win/lose conditions and mechanics in the game. Every bug comes with a move trace. | All 102 levels solvable, all 10 mechanics won in the game. Found [BUG-004](FOUND-BUGS.md#bug-004-add-slot-from-out-of-slots-has-no-limit) (no slot limit). |
| [`test-progression`](skills/test-progression/SKILL.md) | Save/load, corrupted saves, unlock boundaries, XP, daily rewards, quests, achievements, events, clock and timezone changes. | 15 checks: 7-day rewards, unlocks and corrupted saves pass. Found [BUG-001](FOUND-BUGS.md#bug-001-level-complete-closes-on-a-tap-outside-it-the-reward-is-lost) (lost reward). Its XP check was not run in this pass; the playthrough caught the XP bug. |
| [`test-ui`](skills/test-ui/SKILL.md) | Screen map, navigation and back behaviour, popup stacking, and layout on 7 screen sizes from small phone to ultrawide. | 10 screens × 6 sizes. Found [BUG-002](FOUND-BUGS.md#bug-002-settings-and-close-pushed-off-screen-on-360-px-phones) (buttons off screen on 360 px) and a landscape overlap. |
| [`test-settings`](skills/test-settings/SKILL.md) | Every option: default, effect, persistence, reset. Audio is checked through real gain values. | 7/7 pass. "Sounds off" proven silent through the audio engine. |
| [`test-performance`](skills/test-performance/SKILL.md) | Boot and load times, frame time and 1% lows, memory over long sessions, throttled runs. Every number is measured against a budget, with 3 runs and the raw data. | 4/4 budgets met: boot 3.1 s, 1% low 58 fps at 4× CPU throttle, memory stable. |
| [`qa-evidence`](skills/qa-evidence/SKILL.md) | The shared standard all skills follow: how to reach the game, how to capture proof, statuses, severities and the `findings.json` format. Tools: the report builder (it enforces the rules), a Playwright harness that records **video without ffmpeg** and saves results crash-safe, and an evidence pruner. | Used by every run here: videos for every major bug, storyboards, and reports that refuse a bug without proof. |

"Proven" means a real run: on my game [Pixel Swarm](https://github.com/heloisatorres1/pixel-swarm) v1.0.0, on the public practice shop [SauceDemo](https://www.saucedemo.com/) for `test-design`, or on Pixel Swarm and my web app [QA Workspace](https://github.com/heloisatorres1/qa-workspace) for `root-cause-analysis`. Every result is in [examples](examples/README.md) and every bug in [FOUND-BUGS.md](FOUND-BUGS.md).

The full list of features `test-game-full` can cover, and how far an AI agent can go with each, is in the [feature catalog](skills/test-game-full/references/feature-catalog.md).

### How they fit together

```mermaid
flowchart LR
  F[test-game-full] --> S{Smoke gate}
  S -- fails --> R[Report: BLOCKED]
  S -- passes --> T[text-review] --> U[test-ui] --> SE[test-settings] --> P[test-puzzles] --> ST[test-store] --> PR[test-progression] --> C[catalog checklists] --> PF[test-performance] --> FP[full-playthrough]
  FP --> M[Merge + dedupe] --> R2[One report + release verdict]
  E[(qa-evidence standard)] -.-> T & U & SE & P & ST & PR & PF & FP
```

Each skill also works on its own. Start with `text-review`: it's the quickest to try.

## Example: test-design on SauceDemo and Pixel Swarm

`test-design` works in two phases. **Phase A** suggests: it writes test cases, questions and an automation plan, then stops and asks. **Phase B** builds only what you approved, with the tools you picked.

**On [SauceDemo](https://www.saucedemo.com/)**, read from the live site only ([results](examples/saucedemo-test-design/README.md)):

- **54 cases** in 8 features: 20 happy, 13 negative and 21 edge. Every expected result is an exact message or value seen on the site.
- **12 questions for the team.** Among them: an empty cart can be bought for $0.00, and a product URL with an unknown ID can be added to the cart. That leaves the badge at 1 with an empty cart list.
- **An automation plan.** It covers Playwright, the built-in report vs Allure, GitHub Actions stages, and the honest note that all tests sit at UI level because there is no code or API.
- **After approval, 13 Playwright tests.** The 11 P1 tests passed 3 runs in a row. One deliberate failure proved a test can fail. The 2 user-type tests failed every run on real product faults, and were reported instead of being "fixed".

**On Pixel Swarm**, read from the source code ([results](examples/pixel-swarm-test-design/README.md)):

- **31 cases with code references.** Cases come from gaps between two places in the code, such as the slot limit that the Out of Slots path skips.
- **4 of the 5 main known bugs covered.** This was not a blind test, as the example explains.

## Example: root cause analysis on 5 bugs

`root-cause-analysis` got 5 bug reports, written the way a tester files them: 3 bugs planted in copies of Pixel Swarm and QA Workspace, 1 real known bug (BUG-008), and 1 vague player report with no known answer. The same model ran each one without the skill and with it ([benchmark](examples/root-cause-analysis/README.md) · [results with code and fixes](examples/root-cause-analysis/results.md)):

| | Without skill | With skill |
|---|---|---|
| Found the right file and line | 5/5 | 5/5 |
| Ran the product to see the bug | 1/5 | 5/5 |
| Proved the cause (fix on, then off) | 0/5 | 5/5 |
| Wrote a regression test that fails, then passes | 0/5 | 5/5 |
| Said why the bug slipped through | 0/5 | 5/5 |
| **Score** | **46/60** | **60/60** |

- **Finding the line is not the hard part.** The skill adds what a developer needs to trust it: proof, side effects and a test.
- **It finds the damage around the bug.** For example, the achievements bug also saves the zeros, so players lose their stats for good. The fix alone does not bring them back.
- **It turned "I got Free Coins 6 times today" into a proven bug** ([BUG-009](FOUND-BUGS.md#bug-009-free-coins-pays-again-when-enter-or-space-is-pressed-during-the-ad)). It also kept two claims apart: the mechanism is Confirmed, but "this is what the player did" is only Likely.
- **It checks why the bug got through.** In the web app, 2 existing unit tests were already failing because of the bug.
- **The trade-off is time:** 4 to 23 minutes per bug, against about 30 seconds without the skill.

## Example: full playthrough of Pixel Swarm (102/102 levels)

`full-playthrough` finished every level of Pixel Swarm from a fresh install: 5 themes × 3 difficulties × 6 levels, plus 12 Halloween event levels. Results are in [`examples/pixel-swarm-playthrough`](examples/pixel-swarm-playthrough) (its [README](examples/pixel-swarm-playthrough/README.md) has every number), with the [completion report](examples/pixel-swarm-playthrough/completion-report.html) (download it and open it in a browser) and the [inventory](examples/pixel-swarm-playthrough/inventory.md):

- **102/102 levels completed** in **1 h 34 min** (1 h 12 min of actual play), every one on the first attempt with 3 stars, and the Level Complete screen of each level as proof.
- Played with **real taps** in the solution order, read from the screen. No auto-solve, skip or win cheat. The only aid was 500 debug gems spent on the game's 8× speed, and it is logged.
- After every win the script checked the reward paid (4,590 coins, exactly the rule), the stars saved and the next level. Progress survived a reload after every section (17/17). The event reward track paid all 5 rewards.
- **It found BUG-008:** XP never grows, so after 102 wins the player is still level 1, and the Firefly bug and two avatars can't be unlocked by playing.
- The run survived interruptions: it saves after every level, and on each start it compares the game save with the inventory. Once, stopping the run lost a just-won level from the save. The script noticed, replayed that level, and the report says so.

![BUG-008 storyboard](docs/bugs/BUG-008.png)

## Example: full QA pass on Pixel Swarm

I ran `test-game-full` on my own game, [Pixel Swarm](https://github.com/heloisatorres1/pixel-swarm). Results are in [`examples/pixel-swarm-full`](examples/pixel-swarm-full), with the [merged report](examples/pixel-swarm-full/report.md) and the [test plan](examples/pixel-swarm-full/test-plan.md):

- **80 scripted checks in 8 modules**: smoke gate, UI at 6 screen sizes, settings, puzzles (all 102 levels verified solvable, all 10 mechanics won in the real game), store, progression and daily rewards, tutorial / ads / lifecycle / accessibility, and performance.
- **7 bugs found and proven**, each reproduced at least twice, with video, screenshots, before/after save data and the line of code involved. Among them:
  - The **Level Complete popup closes on a tap outside it**: the coin reward is lost and the player is left on an empty board (4/4, video).
  - On **360 px phones the top bar pushes Settings and the store's Close button off screen** (15 balance cases × 2 runs).
  - The store **keeps selling the $4.99 offer that includes No Ads to players who own No Ads** (2/2, video).
- **Script mistakes are caught, not reported.** Six automated "failures" turned out to be problems in my own test scripts. They are listed in the test plan, not filed as bugs.
- [`scripts/`](examples/pixel-swarm-full/scripts) holds every Playwright script, so each result can be reproduced with one command.

## Example: Pixel Swarm text review

I ran `text-review` on my own web game, [Pixel Swarm](https://github.com/heloisatorres1/pixel-swarm). Results are in [`examples/pixel-swarm-text-review`](examples/pixel-swarm-text-review):

- **861 strings** extracted with `file:line`. No spelling or grammar errors.
- The numbers in the copy were checked against live game data ("Collect all 102 pictures" = 5 themes × 3 difficulties × 6 levels + 12 event levels).
- **6 text findings and 3 queries.** Two of them only show up in the running game: the tutorial's step dots are drawn over the ad banner text (reproduced 3/3), and a store subtitle is cramped on phone widths.
- [`terms.md`](examples/pixel-swarm-text-review/terms.md) is a term sheet the team can adopt as a style guide.
- [`scripts/session.mjs`](examples/pixel-swarm-text-review/scripts/session.mjs) is the Playwright script that captured the evidence, so anyone can run it again.

![Close-up evidence: tutorial dots over banner text](examples/pixel-swarm-text-review/evidence/TXT-tutorial-dots-crop.png)

## Install

In Claude Code:

```
/plugin marketplace add heloisatorres1/qa-skills
/plugin install qa-skills@qa-skills
```

Or copy any folder from `skills/` into your project's `.claude/skills/` (or `~/.claude/skills/` for all projects). Keep `qa-evidence` next to the others, because they all use it.

**Requirements:** Node.js 18+ for the helper scripts (no npm packages needed). For web games, `playwright-core` goes in the run folder, never in your game project. It drives the Edge or Chrome you already have, so no browser download is needed.

## Use

Ask in plain language, or call a skill by name (installed as a plugin, the names get a prefix: `/qa-skills:test-design`):

```
/test-design https://my-shop.example.com  scope: login and checkout
Suggest test cases and what to automate for ./my-app, reading the code and docs/spec.pdf
/text-review ./my-game
Proofread all the player-facing text in this project and show me proof in the running build at http://localhost:8080
/test-store
Run a full QA pass on the build in ./Builds/WebGL, standard depth
/full-playthrough https://mygame.itch.io  scope: main path
/root-cause-analysis "Achievements reset to 0 after a refresh" ./my-game
Find the root cause of BUG-004 in this project
```

Every run writes to `qa-reports/<date>-<skill>/`:

```
findings.json   # source of truth (schema: skills/qa-evidence/references/findings-schema.md)
evidence/       # screenshots, crops, state dumps, logs, save diffs
report.md       # paste into Jira, GitHub or Slack
report.html     # self-contained page (use --embed to inline the images)
```

`root-cause-analysis` writes `qa-reports/<date>-rca-<bug>/rca.md` with `repro/`, `proof/` (the fix, the on/off runs, the regression test) and `evidence/`. Its checker is `node skills/root-cause-analysis/scripts/check-rca.mjs <run>/rca.md`.

`test-design` writes `test-cases.json` (its source of truth), `test-cases.md`, `test-cases.csv`, `coverage.md`, `questions.md` and `automation-plan.md` instead. Its checker is `node skills/test-design/scripts/build-cases.mjs <run>/test-cases.json`.

You can also build a report from any `findings.json` yourself:

```bash
node skills/qa-evidence/scripts/build-report.mjs qa-reports/<run>/findings.json [--embed]
```

## Limits

These skills make an agent a disciplined tester. They do not replace one. An agent can't judge fun, game feel, audio quality, haptics or real-device performance, and it can't run real-money purchases or platform certification. The reports list these as manual checks, so a human tester knows exactly what's left.

## Repository layout

```
.claude-plugin/        plugin + marketplace manifests
skills/<name>/         SKILL.md, references/, scripts/
examples/              real runs with evidence and reports (index: examples/README.md)
  root-cause-analysis/       root-cause-analysis: 5 bugs with and without the skill, reports, proofs, tests
  saucedemo-test-design/     test-design: 54 cases, automation plan, 13 approved and proven Playwright tests
  pixel-swarm-test-design/   test-design from code: 31 cases, 6 questions, plan waiting for approval
  pixel-swarm-playthrough/   full-playthrough: 102/102 levels, completion report
  pixel-swarm-full/          test-game-full: 80 checks, merged report, summary
  pixel-swarm-text-review/   text-review: 861 strings, term sheet
FOUND-BUGS.md          the bugs found, with storyboards, causes and fixes
docs/                  report preview and bug storyboards (docs/bugs/)
```

## About

Made by **Heloisa Oller Torres**, QA Test Lead / Senior QA for games and software · [LinkedIn](https://www.linkedin.com/in/heloisa-torres-94250814a) · [GitHub](https://github.com/heloisatorres1)

Licensed under [MIT](LICENSE).
