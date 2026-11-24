# PLAN — pre-anchor-deletion

- spec_content_hash: f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d
- applied_lessons: [L48, L54, L60]
- increment: Stop reconcile reporting a tracked file that was already missing from the worktree at the build anchor,
  and is still missing at verify, as an escape (CORE-346). `--anchor` records each such path in a new additive
  `absent_at_anchor` list; the checker clears a path only when it is in that list, has no `entries` value, and
  `lstat` proves it absent now. Every other unhashable path stays a fail-closed candidate.
- layer(s): product floor (`pharn/floor/`), contract (`pharn/pharn-contracts/`)
- constitution_refs: [P0, P5, P6, P7]

## Why (P7 — the trigger)

A real failure, measured: CORE-311 run 2 attempt 2 (pharn-app at 8c896454, skillsVersion 7.22.0). The benchmark
deleted the tracked `.claude/agents/pharn-stage.md` before the session. It was absent at the anchor and at verify, and
nothing in the run touched it. Verify's `reconcile` gate still read `ESCAPE` ("unreadable during reconcile, treated as
changed: .claude/agents/pharn-stage.md", `denied_by: writes-scope (snapshot)`), so the loop stopped `STOP_TERMINAL`
(`terminal_cause: reconcile`). Evidence: `.dev/measurements/stage-agent-benchmark-2026-11-23.md` and the run archive
named in the ticket.

Read live at 08d7f63e (7.23.0):

- `reconcile-baseline.mjs` `enumerate()` runs `git ls-files --cached --others --exclude-standard`, which lists a
  tracked path that is missing from the worktree. `buildRecord()` stores an entry only when `hashFile` is non-null,
  so the missing path gets no entry and nothing else records it.
- `check-bash-reconcile.mjs` (the candidates loop, ~line 740) hashes every enumerated path; `hashFile` returns null
  and the fail-closed branch makes it a candidate before the `entries` lookup.

## Design

**Why a recorded list, not "no entry + absent now".** "No `entries` value" alone does not tell "absent at the anchor"
from "the anchor never listed the path". A path added to the index during the window with no file on disk
(`git update-index --add --cacheinfo`, or `git add x && rm x`) also has no entry and no file. Clearing on "no entry +
absent now" would clear that path too. So `--anchor` writes down which enumerated paths `lstat` proved absent, and the
checker clears only those.

`pharn/floor/reconcile-baseline.mjs` (kept small: CORE-343 may edit this file in parallel):

- a new exported `provenAbsent(abs)` — true only when `lstatSync` throws `ENOENT` or `ENOTDIR`, the same proof of
  absence `absenceState` uses (L54). Any other `lstat` error, or any entry at the path (a directory, a FIFO, a
  dangling link), is not proof of absence.
- `buildRecord()`: when `hashFile` returns null and `provenAbsent` is true, push the path onto `absent_at_anchor`. The
  record gains `absent_at_anchor: [...]`, always an array. Additive, so `RECORD_VERSION` stays 1 (the `scope_amendments`
  and `anchored_head` precedent). `entry_count` is unchanged (it counts `entries`).

`pharn/floor/check-bash-reconcile.mjs`, in the `now === null` branch only: when the baseline's `absent_at_anchor` (an
array of strings, else read as empty) contains the path, `baseline.entries[rel]` is undefined, and
`provenAbsent(abs)` is true now → push the warning `absent at anchor, absent now — not a change: <path>` and skip it.
Otherwise the existing fail-closed candidate, unchanged.

### Cases (each one gets a test)

| at anchor                   | at verify                       | before         | after                                                              |
| --------------------------- | ------------------------------- | -------------- | ------------------------------------------------------------------ |
| tracked, missing            | missing                         | ESCAPE (false) | CLEAN + warning (the fix)                                          |
| tracked, present            | missing (rm in window)          | ESCAPE         | ESCAPE, unchanged (negative control)                               |
| tracked, missing            | present (re-created, any bytes) | ESCAPE         | ESCAPE, unchanged (`hashFile` non-null, no entry)                  |
| tracked, missing            | present but unreadable (EACCES) | ESCAPE         | ESCAPE (`hashFile` null, `provenAbsent` false — `lstat` succeeds)  |
| tracked, missing            | a directory at the path         | ESCAPE         | ESCAPE (`lstat` succeeds)                                          |
| not in the index            | in the index, no file           | ESCAPE         | ESCAPE (not in `absent_at_anchor`)                                 |
| tracked, missing, legacy    | missing                         | ESCAPE         | ESCAPE, unchanged (no field → empty list; a re-anchor records it)  |
| tracked, missing            | created then deleted in window  | ESCAPE         | CLEAN — net state unchanged, the existing write-then-restore bound |
| tracked, present-unreadable | missing                         | ESCAPE         | ESCAPE (not proven absent at the anchor, so not listed)            |

The last-but-one row is not a new hole. Reconcile compares two instants by design, so a write in the window that ends
at the anchored state is invisible, whether bytes or absence. The contract already states this for bytes (the
"restores the bytes" bound). The contract gets one sentence saying that absence is now one of the anchored states.

A control-surface path deleted before the anchor and not committed is still reported. `controlSurfaceChanges()`
compares with HEAD's blobs whatever the baseline says (contract §4a, L68 behaviour). Unchanged.

## Applied lessons

- L54 — absence is proved only by `lstat` ENOENT/ENOTDIR at both ends (new `provenAbsent`), never `existsSync`/`stat`.
  A dangling link, a directory, or an unreadable entry at the path is "present", so it stays a candidate.
- L60 — one negative control per asserted property: deleted after the anchor (ESCAPE), re-created (ESCAPE), unreadable
  at verify (ESCAPE), index-added with no file (ESCAPE), a legacy baseline without the field (ESCAPE). The positive case
  also asserts that the anchor recorded the path, so the CLEAN cannot come from some other branch.
- L48 — the detector's quiet direction is the one that matters. The fix removes one false red, so it must not add a
  silent CLEAN. Clearing needs three conjuncts (recorded absent, no entry, proven absent now), and every case above
  that was a real change before is still a candidate.

## Files

- `pharn/floor/reconcile-baseline.mjs` — `provenAbsent` + `absent_at_anchor` in `buildRecord` — product floor
- `pharn/floor/reconcile-baseline.test.mjs` — the anchor records a missing tracked path, and only a proven-absent one —
  test (not shipped)
- `pharn/floor/check-bash-reconcile.mjs` — clear a path absent at both ends; fail-closed otherwise — product floor
- `pharn/floor/check-bash-reconcile.test.mjs` — the case table above — test (not shipped)
- `pharn/pharn-contracts/reconciliation-record.md` — §1 field row + example, §3 paragraph — contract
- `.dev/guides/floor-checks.md` — one line in the reconcile section — dev apparatus
- `SKILLS_VERSION` — 7.23.0 → 7.23.1 (patch: a correction to a shipped checker; additive record field) — repo meta
- `README.md` — the version badge `check-version-badge` holds equal to `SKILLS_VERSION` — repo meta
- `CHANGELOG.md` — a new `## [7.23.1]` section — repo meta
- `pharn-install.json` — the install manifest `npm run docs:generate` recomputes (it records the bytes of the changed
  product files) — generated repo meta. Added during build: the first build pass found `docs:check` RED on it; the build
  restarted from Step 0 (setter, then a fresh anchor taken over the unchanged tree) so every write sits inside one window

## Contracts satisfied

- `pharn/pharn-contracts/reconciliation-record.md` — §1 gains the `absent_at_anchor` row; §3's unreadable-is-changed
  rule gains its one exception, worded as above. Cited, not restated, in the checkers' comments (P4).

## Evals to write (P1)

No Capability changes (both files are floor infrastructure with no `role:`), so no `evals/` cases. The behaviour is
pinned by `node:test` cases in the two test files (the table above).

## Guarantee audit (P0)

- "a tracked path missing at the anchor and at verify reads unchanged" → floor: content-hash/enum (set membership in
  the recorded list + an `lstat` errno membership test). It is as strong as the baseline, which is unauthenticated
  state under `pharn/.run/`. A writer who adds a path to `absent_at_anchor` and deletes the file gets a silent CLEAN,
  exactly as one who forges an `entries` value does today. That is the stated non-adversarial bound, unchanged; the
  control surface is still compared with HEAD.
- "every other unhashable path stays a candidate" → floor: the same branch as before; tests pin each case.
- "MIN_CLI need not move" → advisory, reasoned: the field is additive and an older checker ignores it (it keeps its
  old fail-closed behaviour, the bug, never a false CLEAN).

## Trust audit (P2)

- Paths in `absent_at_anchor` come from git's enumeration, like `entries` keys. They are used only for set membership
  and as an `lstat` argument, never interpolated into a command. A path in a warning is data.

## Open questions (HALT)

- none
