---
name: root-cause-analysis
description: Takes one bug (a bug report, a finding from another skill in this pack, or a short description) and finds its root cause in the code - the exact file and line, the chain from cause to symptom, proof that switching the cause off removes the bug, everything else the same cause breaks, why it slipped through, the fix and a regression test that fails before the fix and passes after. Every conclusion carries a confidence level tied to its evidence. Works on any software with source code (web apps, games, APIs); without source code it gives a labelled "likely" cause. Never changes the user's project. Use when the user shares a bug and asks why it happens, for the root cause, an RCA, a cause analysis, a 5 whys, or what a developer should fix.
argument-hint: "[bug report, finding ID or description] [project path or URL]"
---

# Root Cause Analysis

A developer reading your report must be able to **fix the right thing on the first try and trust that it is the right thing**. That needs four things code reading alone does not give: the bug reproduced, the cause switched off and on, the side effects mapped, and a test that will catch it next time.

**The trap this skill exists to avoid:** reading the code, spotting a plausible line and calling it the root cause. A plausible line is a hypothesis. It becomes a root cause only after step 5.

Load the shared standard first: read `../qa-evidence/SKILL.md` sections 1 and 4. Rules 1 (observe, don't assume), 4 (separate fact from guess), 5 (never fabricate) and 8 (leave the product as you found it) apply word for word.

**In scope:** one bug per run, in software you can run or read. **Out of scope:** fixing the user's project (you may suggest the fix and prove it in a copy), finding new bugs (if you trip over one, list it under "Other defects noticed").

## Confidence levels

Every root cause, and every claim in the causal chain, carries one of these. Pick the highest level whose test you **actually passed**.

| Level | All of these are true |
|---|---|
| **Confirmed** | Reproduced at least 2 times from a clean state, through an action a real user can do. Switching the cause off removes the symptom (same reproduction). Switching it back on brings the symptom back. |
| **Likely** | The code path is traced and the symptom is reproduced, but the on/off proof was not possible (no source code, cannot run the product, a third-party service), **or** the defect is proven but it is unknown whether it is what the reporter hit. |
| **Unproven** | Reasoning from the code only. Nothing was run. |
| **Not reproduced** | You followed the report and the symptom did not appear. List what you tried. Candidate mechanisms, if any, are Unproven. |

## The run

Write everything to `qa-reports/<YYYY-MM-DD>-rca-<bug-id-or-slug>/`:

```
rca.md            # the report (format: references/report-template.md), checked by scripts/check-rca.mjs
repro/            # the reproduction script or exact manual steps, and its output for each run
proof/            # cause-on / cause-off runs, the fix diff, the regression test runs
evidence/         # screenshots, video, logs, state dumps (named after the step: 1-before.png ...)
```

### 0. Make a work copy

**Never edit the user's project.** Copy it to `<run>/workcopy/` (skip `node_modules`, build output and large media you will not need; link `node_modules` back if the app needs it) or use a `git worktree`. Every experiment happens in the copy. Write down the version or commit you copied.

### 1. Restate the bug as facts

From the report, write: the symptom (exactly what is seen), the expected result, the steps, the environment, the reported rate. Mark what the report does **not** say (device, input method, account state, time of day). Missing facts become questions in the report. They do not stop you.

### 2. Reproduce it the way a user would

1. Start from a clean state (fresh load, or a save or seed data you write down).
2. Follow the report's steps with **real user input**: real clicks, taps, keys and navigation (Playwright `locator.click()`, `keyboard.press()`, `touchscreen.tap()`; or computer use). Writing a save file or seed data to **set up** the state is fine. The **action that triggers the bug** must be one a user can do. A debug menu or cheat that skips the long part (win a level, add currency) may be used for the steps before the trigger if you show it runs the same code a real player runs; label those steps `assisted` in the report.
3. Script it when you can (`repro/repro.mjs` or a test file). You will rerun it in steps 5 and 8, so it must print a clear result: the wrong value, the missing element, the error.
4. Run it at least 2 times. Save the output and at least one screenshot or video of the symptom (rule 10 of the shared standard).

If only a shortcut reproduces it (`element.click()` on a covered element, calling an internal function, editing state mid-action), you have found a **mechanism**, not the reporter's bug. Try the real input paths that could reach it (mouse, double-click, keyboard Enter/Space on a focused control, touch, back button, two tabs, slow network) and record each result. If none reaches it, the mechanism stays **Likely** at most, and it does not explain the report.

If you cannot reproduce it, say so, list what you tried, and go on to steps 3 and 5 with the best candidates, labelled.

### 3. Trace backwards from the symptom

Start at what the user sees and walk back, one link at a time. Each link is a `file:line` and what it does to the value:

> symptom on screen <- the code that draws it <- the value it reads <- where that value was set <- where it was saved / loaded / computed <- the first place it goes wrong

The **root cause** is the first place where correct input turns into a wrong result. It is usually not where the symptom shows. Display code that faithfully shows a wrong value is not the cause.

Use these to find that first wrong place:

- **Compare with a sibling that works.** The same pattern done correctly elsewhere (the next line, another popup, another field). The difference is often the bug.
- **Check what changed.** If the project has history: `git log -p` on the files in the chain, `git blame` on the suspect line, `git bisect` with the repro script. A cause with a commit is stronger evidence.
- **Read the values, not just the code.** Log or dump the real value at each link while the repro runs.
- **Absence is a cause too.** If no code ever does what the user expects (nothing writes the value), the root cause is the missing step, and you prove it by searching every write to that value.

When the cause is not obvious, write at least two hypotheses and test each one. Keep the rejected ones in the report with the evidence that rejected them. They save the developer from checking the same places.

### 4. Ask "why" until you reach something a developer can change

From the root cause, ask why it was possible: a wrong argument order, a status missing from a list, a check made at the wrong moment, a missing guard. Stop at a condition in the code, the data, the build or the process. **Never stop at a person** ("the developer forgot"). Ask what let the mistake through instead.

### 5. Prove it: cause off, cause on

In the work copy:

1. Apply the **smallest change** that removes the root cause (the fix you will suggest, or a minimal version of it).
2. Rerun the reproduction. The symptom must be gone. Save the output in `proof/`.
3. Undo the change. Rerun. The symptom must be back. Save the output.
4. Save the diff as `proof/fix.diff`.

Both results, with the same reproduction, are what make it **Confirmed**. If the symptom is gone only partly, there is a second cause: go back to step 3.

### 6. Map the blast radius

The same cause usually breaks more than the reported symptom. Search for **every reader of the faulty value or function** (`grep` the function name, the property, the constant) and list each place with what it shows or does wrong. Check the most serious one by running it, not just reading it. Also ask:

- Is wrong data **saved**? Then the fix alone does not repair users who already have it (a migration or repair may be needed).
- Does it affect money, progress, security or data loss? Say so first.
- Does the fix change behaviour that something else relies on?

### 7. Find why it slipped through

These are the contributing factors. Check each, with evidence:

- **Existing tests:** run them (`npm test`, `npx vitest run`, the project's runner). Do some already fail because of this bug? Do none cover this path?
- **Types and build checks:** would the type checker or linter have caught it?
- **CI:** is there a pipeline, and does it run those tests on every change?
- **Design:** an easy-to-misuse pattern (argument order of a merge, a list that must be kept in sync by hand, a check far from the action it guards).

### 8. Write the regression test

Write a test that **fails with the bug and passes with the fix**. Use the project's own test runner and style if it has one. Otherwise write a small standalone script in `proof/`. Run it both ways and save both outputs. A test that never failed proves nothing. Put the test in the work copy, never in the user's project. Suggest where it belongs.

### 9. Write the report and check it

Write `rca.md` following [references/report-template.md](references/report-template.md). The summary comes first and stands on its own: a developer who reads only the first five lines knows what to change, where, and how sure you are.

```bash
node <this-skill>/scripts/check-rca.mjs qa-reports/<run>/rca.md
```

The checker refuses a report with a missing section, no `file:line` in the root cause, an unknown confidence level, "Confirmed" without both proof results, a regression test without a fail and a pass run, or an empty "Not checked" list. Fix the report; do not delete the check.

Then hand over in chat: the one-line root cause with its confidence, the fix, the blast radius in one line, and the path to `rca.md`.

## Without source code (black box)

For a site or app whose code you cannot read (a third-party web app, a store build):

- Reproduce as above, and capture what the browser shows you: network requests and responses, console errors, storage, the DOM before and after.
- Narrow it down: which request returns the wrong data, which input value flips the result, which browser or account shows it.
- The root cause is then "the response from `POST /api/cart` already contains the old items" or "the client ignores field X". Its confidence is **Likely** at most. Say what the owners would need to check to confirm it.

## Red flags: stop and go back

| You are about to... | Instead |
|---|---|
| Call a line the root cause after reading it, without running anything | It is Unproven. Reproduce it (step 2) and switch it off and on (step 5). |
| Reproduce with `element.click()`, a direct function call or a state edit as the trigger | That proves a mechanism. Try real input paths before tying it to the report. |
| Blame the code that displays the wrong value | Walk back further. Find where the value first goes wrong. |
| Suggest a fix in the display or a workaround at the symptom | Fix the first wrong place. Workarounds go under "Alternatives", labelled as such. |
| Skip the blast radius because the report names one screen | Grep every reader. The worst effect is often somewhere else. |
| Say "add a test" | Write it, run it with the bug (FAIL) and with the fix (PASS). |
| Say "the developer forgot" | Name the condition that let it through: no test, no type, a pattern easy to misuse. |
| Edit the user's project to try a fix | Use the work copy. |
| Fill a proof row you did not run | Write "Not run" and the reason. A lower confidence is better than a false one. |
