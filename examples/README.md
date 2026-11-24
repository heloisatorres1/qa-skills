# Examples

Real runs of the skills. The game skills ran on my game [Pixel Swarm](https://github.com/heloisatorres1/pixel-swarm) (v1.0.0, commit `db96df5`) on 2026-11-16. `test-design` ran on the public practice shop [SauceDemo](https://www.saucedemo.com/) and on Pixel Swarm's code on 2026-11-19. `root-cause-analysis` ran on 5 bugs in Pixel Swarm and [QA Workspace](https://github.com/heloisatorres1/qa-workspace) on 2026-11-24. Every result can be reproduced with the scripts in each folder.

| Example | Skill | What it shows | Result |
|---|---|---|---|
| [`root-cause-analysis`](root-cause-analysis) | `root-cause-analysis` | 5 bug reports, each run without and with the skill: root cause, proof with the fix on and off, blast radius, regression test. [Results with code and fixes](root-cause-analysis/results.md) | **60/60 with the skill vs 46/60 without**; found BUG-009 |
| [`saucedemo-test-design`](saucedemo-test-design) | `test-design` | Both phases on a live site with no code. Phase A writes cases, questions and an automation plan. Phase B builds and proves the approved tests | **54 cases, 12 questions; 13 Playwright tests**: 11 pass 3/3, 2 fail on real product faults |
| [`pixel-swarm-test-design`](pixel-swarm-test-design) | `test-design` | Phase A from source code and the live build: cases traced to `file:line`, stopping for approval | **31 cases, 6 questions**; covers 4 of the 5 main known bugs (not a blind test) |
| [`pixel-swarm-playthrough`](pixel-swarm-playthrough) | `full-playthrough` | Every level played with real taps, with rewards, stars, unlocks and saves checked after each one | **102/102 levels in 1 h 34 min** (1 h 12 min of play), 1 major bug (BUG-008) |
| [`pixel-swarm-full`](pixel-swarm-full) | `test-game-full` | Smoke gate, UI at 6 sizes, settings, puzzles, store, progression, tutorial/ads/lifecycle/accessibility, performance | 80 checks, 7 bugs (3 major), report + one-page [summary](pixel-swarm-full/summary.md) |
| [`pixel-swarm-text-review`](pixel-swarm-text-review) | `text-review` | All player-facing text (861 strings) plus in-game screenshots | 0 spelling errors, 6 text issues, 3 queries, a [term sheet](pixel-swarm-text-review/terms.md) |

## Bugs found

| ID | Severity | Bug | Found by | Status |
|---|---|---|---|---|
| BUG-001 | Major | Tapping outside Level Complete closes it: the reward is lost | test-game-full | Open |
| BUG-002 | Major | 360 px phones: Settings and the store's Close button pushed off screen | test-game-full | Open |
| BUG-003 | Major | The store sells the offer with No Ads to players who own No Ads | test-game-full | Open |
| BUG-008 | Major | Player XP never grows: level-gated content can't be unlocked | full-playthrough | Open |
| BUG-004 | Minor | Add Slot from Out of Slots has no limit | test-game-full | Open |
| BUG-009 | Minor | Free Coins pays again when Enter or Space is pressed during the ad | root-cause-analysis | Open |
| BUG-005 | Minor | Phone landscape (web): Levels/Play cover the Activities and Events buttons | test-game-full | Open |
| BUG-006 | Minor | Buttons below the 44 px touch-target guideline | test-game-full | Open |
| BUG-007 | Trivial | No favicon: a 404 in the console on every load | test-game-full | Open |

Storyboards, steps, causes and fixes for the main ones: [FOUND-BUGS.md](../FOUND-BUGS.md). The text issues (TXT-001 to TXT-006, TXT-101) and queries are in the [text review](pixel-swarm-text-review/report.md) and the [full pass report](pixel-swarm-full/report.md).

## How the evidence is kept honest

- A runtime bug counts as confirmed only after 2 or more reproductions from a clean state, and always comes with a screenshot or video.
- Anything the test did with a debug aid is labelled (for example "assisted", or the 8x speed in the playthrough).
- Every automated failure was reviewed by eye before it became a finding. The script mistakes caught that way are listed in the [full-pass test plan](pixel-swarm-full/test-plan.md#script-mistakes-caught-during-triage-not-game-bugs), and the one test interruption of the playthrough is explained in its [README](pixel-swarm-playthrough/README.md#notes-on-the-evidence).
