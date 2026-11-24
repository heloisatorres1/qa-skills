# RCA: Critical bug CP-104 (In progress) is missing from the release blockers and Triage's default view

## Summary
- **Root cause:** `isOpen()` treats only status `open` as open, so every `in_progress` bug is dropped everywhere "open" is used (`src/domain/findings.ts:29`).
- **Confidence:** Confirmed
- **Fix:** Change `OPEN_STATUSES` to `['open', 'in_progress']` (`src/domain/findings.ts:29`); one line, shown in `proof/fix.diff`.
- **Blast radius:** The same helper feeds release blockers, the "Ready" gate, the Slack message, risk counts, Overview counters and Triage's default filter, so all of them ignore in-progress bugs (CP-112, High, is missed too).
- **Why it slipped through:** The existing unit test that expects `['CP-104','CP-109']` already fails in this copy (2 failures); types cannot see a missing list member.

## Bug
- Symptom: Releases > Orbit Garden > 0.8.4 shows "1 critical bug unresolved" and only CP-109 as a blocker. CP-104 is also missing from Triage's default view ("Open + in progress").
- Expected: 2 blockers (CP-104 and CP-109). Triage with Critical + Any status shows CP-104 as Critical, In progress.
- Environment: QA Workspace 0.1.0 (Vite + React + TypeScript), demo seed data, Edge via Playwright. Reported rate: every time.
- Not stated in the report: browser, saved state (I used clean seed data), whether a decision was already saved. The project copy has no git history, so I could not check which commit introduced it.

## Reproduction
- Script: `repro/repro.mjs` (run `node repro.mjs <label>` against `npx vite --port 5541`). Clean state: `localStorage.clear()` and reload, so the seed data loads.
- User input: real selection of the Release dropdown "0.8.4 (Hotfix) · hotfix", real click on the Triage link, real selection of Severity = Critical, then Status = Any status.
- Result: 2/2 runs show the bug (`repro/bug-run1.txt`, `repro/bug-run2.txt`):
  - Release callout: "1 critical bug unresolved".
  - Triage, Critical, default status: only CP-109.
  - Triage, Critical, Any status: CP-106 (closed), CP-109, CP-104 "In progress".
- Evidence: `evidence/bug1-1-release.png`, `evidence/bug1-2-triage-default.png`, `evidence/bug1-3-triage-any.png`.
- A third run after the cause-off run, with the cause back on, shows the bug again (`proof/cause-on-again-run.txt`).

## Causal chain
1. `src/domain/findings.ts:29` `OPEN_STATUSES = ['open']`, so `isOpen()` (line 30) is false for `in_progress`. CP-104 has status `in_progress` (`src/data/fixtures.ts:63`). Confirmed (the cause-off run changes the outcome).
2. `src/domain/release.ts:27` `captureEvidence` filters bugs with `isOpen(f)`, so CP-104 is not in `bugs`. Confirmed.
3. `src/domain/release.ts:36` `blockers` is built from those `bugs` filtered by severity critical: only CP-109. `openBySeverity` is also short by one (critical 1 instead of 2, high 4 instead of 5; `proof/existing-tests-bug.txt`). Confirmed.
4. `src/routes/Releases.tsx:172,197` reads `live.blockers` and shows "1 critical bug unresolved". Confirmed (`evidence/bug1-1-release.png`).
5. `src/routes/Triage.tsx:67` the default filter `status === 'active' ? isOpen(f)` hides CP-104, although the label at line 94 says "Open + in progress". Confirmed (`repro/bug-run1.txt`).

## Root cause
```ts
const OPEN_STATUSES: FindingStatus[] = ['open'];
export const isOpen = (f: Finding) => OPEN_STATUSES.includes(f.status);
```
The list of "unresolved" statuses omits `in_progress`. The statuses are `draft | open | in_progress | resolved | closed` (`src/domain/types.ts:16`), and an in-progress bug is not resolved. The rule is a hand-kept list in one place, so a missing status fails silently. All the code downstream correctly uses this wrong value (the display code is not at fault). The UI label "Open + in progress" (`Triage.tsx:94`) and the existing test show the intent.

## Proof
| Run | Change in the work copy | Result |
|---|---|---|
| Bug present | none | Callout "1 critical bug unresolved"; Triage default shows only CP-109; unit tests 2 failed / 39 passed (`proof/existing-tests-bug.txt`) |
| Cause off | `proof/fix.diff` applied | Callout "2 critical bugs unresolved"; Triage default shows CP-109 and CP-104 (`proof/cause-off-run.txt`); unit tests 41 passed (`proof/existing-tests-fix.txt`) |
| Cause on again | diff removed | Callout "1 critical bug unresolved"; CP-104 missing from the default view again (`proof/cause-on-again-run.txt`) |

## Hypotheses rejected
- Triage filter or the release code has its own bug: rejected. Both call the same `isOpen`; with the one-line fix both are correct and neither was changed.
- Severity or project mapping of CP-104 is wrong: rejected. Triage with Any status shows CP-104 as Critical on Orbit Garden, and the fix alone makes it a blocker.
- Duplicate handling hides it: rejected. CP-104 has no `duplicateOf` (CP-106 is the duplicate of it, and it stays closed).

## Blast radius
Every reader of `isOpen` ignores in-progress bugs:
- `src/domain/release.ts:27`: blockers and `openBySeverity`. Checked by running (count mismatch in the failing test).
- `src/domain/release.ts:60` `validateDecision` and `src/routes/Releases.tsx:174`: "Ready" can be chosen when the only critical bug is in progress. Read only; follows from `blockers`.
- `src/domain/release.ts:79` Slack release message: omits the blocker and under-counts open risks. Read only.
- `src/domain/release.ts:108` `evidenceChanged`: compares blocker lists, so it reports a change once the fix lands. Read only.
- `src/routes/Releases.tsx:92,172`: risk table and open-bug list. Read only.
- `src/routes/Overview.tsx:19-20`: "Open bugs" and "Critical" counters and the priority queue. Read only.
- `src/routes/Triage.tsx:67`: default filter. Checked by running.
- Other in-progress bugs are affected too, for example CP-112 (High, `src/data/fixtures.ts:65`).
- Wrong data is saved: a release decision saved while CP-104 was in progress froze an incomplete blocker list and message in its revision (`saveRevision`, `release.ts:97`). The fix does not repair revisions already saved. Not run.
- Risk: a release can be recommended "Ready" while a critical bug is still being worked on.

## Why it slipped through
- Existing tests: `tests/domain.test.ts:118-120` and line 130 already cover this and already fail in this copy (2 failures, `proof/existing-tests-bug.txt`). So the check existed.
- CI: `.github/workflows/deploy-pages.yml` runs `npm test` and the e2e tests on every push and pull request, so it should fail on this. I cannot tell from the files why the change got through.
- Types: `tsc --noEmit` passes, since `['open']` is a valid `FindingStatus[]`. Types cannot see a missing member.
- Design: "unresolved" is a hand-kept list of statuses in one place, with no test per status.

## Fix
Change `src/domain/findings.ts:29`:
```diff
-const OPEN_STATUSES: FindingStatus[] = ['open'];
+const OPEN_STATUSES: FindingStatus[] = ['open', 'in_progress'];
```
- Does not cover: release decisions already saved with an incomplete blocker list (see blast radius); they need a re-save.
- Alternative (workaround, worse): add `|| f.status === 'in_progress'` inside `captureEvidence` only. It fixes the release page but leaves Overview and Triage wrong and keeps two definitions of "open".

## Regression test
- Test: `proof/open-status.test.ts` (run as `tests/open-status.test.ts` in the work copy). It should live at `tests/open-status.test.ts` in the project, next to `tests/domain.test.ts`. It checks `isOpen` for every status and that CP-104 is a blocker.
- With the bug: FAIL (`isOpen(in_progress)` expected true; "expected [ 'CP-109' ] to include 'CP-104'"), 2 failed / 4 passed, `proof/regression-bug.txt`.
- With the fix: PASS, all 47 tests pass, `proof/regression-fix.txt`.

## Not checked
- Other browsers or devices (Edge only).
- Git history or blame (the project copy has no `.git`), so no commit is named.
- Whether CI actually ran and was bypassed.
- Real saved user data (only the clean seed was used) and the real tracker sync (mock only).
- The Slack message and Overview counters were read, not run.

## Questions for the reporter
- Was a release decision for 0.8.4 saved before CP-104 moved to In progress? That revision needs a re-save after the fix.

## Other defects noticed
- None.
