# RCA: in-progress critical bug missing from release blockers

## Root cause
`isOpen` in `src/domain/findings.ts` (line 29-30) treats only status `open` as open:

    const OPEN_STATUSES: FindingStatus[] = ['open'];
    export const isOpen = (f: Finding) => OPEN_STATUSES.includes(f.status);

The status `in_progress` (a valid FindingStatus, types.ts line 16) is missing from the list. Every "open / unresolved" check uses this helper, so any bug that is `in_progress` is treated as resolved.

CP-104 (critical, status `in_progress`, fixtures.ts line 63) is therefore dropped everywhere.

## How it produces the symptoms
- Release blockers: `captureEvidence` in `src/domain/release.ts` (line 27) filters bugs with `isOpen(f)`. It then builds `blockers` from the critical ones. CP-104 is filtered out, so only CP-109 is a blocker. This gives "1 critical bug unresolved" (validateDecision) and a wrong `openBySeverity`.
- Triage default view "Open + in progress" (`Triage.tsx` line 67, `status === 'active'`) uses `isOpen`, so it hides in-progress bugs, contradicting its own label. The "Any status" filter bypasses `isOpen`, so CP-104 shows there. That is why the tester saw it only with that filter.
- The same helper is used in `Releases.tsx` (lines 92, 172) and `Overview.tsx` (line 19), so open-bug counts there are also too low. Other in-progress bugs, such as CP-112 (high), are affected the same way.

## Fix
Make `OPEN_STATUSES` `['open', 'in_progress']` (the comment on captureEvidence and the Triage label both say in-progress counts as unresolved). Drafts, resolved and closed stay excluded.

Not run in a browser; found by code reading and checking the fixture data.
