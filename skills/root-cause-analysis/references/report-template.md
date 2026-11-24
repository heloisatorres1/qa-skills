# rca.md format

Use these headings, in this order, with these exact names. The checker (`scripts/check-rca.mjs`) reads them. Write for a developer who has five minutes: short sentences, `file:line` for every code claim, real values instead of adjectives.

```markdown
# RCA: <bug title: what is wrong + where + when>

## Summary
- **Root cause:** <one sentence> (`path/file.ext:line`)
- **Confidence:** Confirmed | Likely | Unproven | Not reproduced
- **Fix:** <one sentence: what to change, where>
- **Blast radius:** <one sentence: what else the same cause breaks>
- **Why it slipped through:** <one sentence>

## Bug
Symptom, expected result, environment, steps, reported rate. Then the facts the report did not give (device, input method...).

## Reproduction
How you reproduced it (script path in `repro/`, or exact manual steps), the clean starting state, the user input used, and the result of each run: `2/2`, plus the evidence files.

## Causal chain
Numbered, from the root cause to the symptom. Each link: `file:line`, what happens to the value, the evidence (a logged value, a dump), and its confidence.
1. `js/app.js:97` loadState merges the defaults over the saved stats, so `stats.levels` becomes 0 (dump: `repro/run1.txt`). Confirmed.
2. ...
3. The Achievements screen shows `stats.levels` as is: 0. Confirmed.

## Root cause
The first place where correct input becomes a wrong result, with the code quoted (1 to 3 lines) and the "why it was possible" in one or two sentences. If the cause is missing code, say what is missing and how you know (every write to the value searched).

## Proof
| Run | Change in the work copy | Result |
|---|---|---|
| Bug present | none | <symptom seen, with the value> |
| Cause off | `proof/fix.diff` applied | <symptom gone, with the value> |
| Cause on again | diff removed | <symptom back> |

If a run was not possible, write "Not run" and why. Then the confidence cannot be Confirmed.

## Hypotheses rejected
Each one with the evidence that rejected it. "None: the first trace held, confirmed by the proof" is acceptable.

## Blast radius
Every other place that reads the faulty value or calls the faulty code, what goes wrong there, and whether you checked it by running it or by reading. Say if wrong data is saved and needs a repair.

## Why it slipped through
The contributing factors, each with evidence: existing tests (ran? failing already? missing?), type checks, CI, an easy-to-misuse pattern. No names of people.

## Fix
The recommended change (a short description; a diff of 10 lines or fewer may be shown), where, and what it does not cover (for example, data already saved wrong). Alternatives, each labelled, with why they are worse.

## Regression test
Where the test is (`proof/...`), where it should live in the project, and both runs:
- With the bug: FAIL (<the assertion message>)
- With the fix: PASS

## Not checked
What you did not verify and why (other browsers, real devices, the reporter's exact path, production data). Never empty.

## Questions for the reporter
Optional. What would raise the confidence (device, input method, a save file).

## Other defects noticed
Optional. Defects found on the way that are not this bug, each with its evidence.
```
