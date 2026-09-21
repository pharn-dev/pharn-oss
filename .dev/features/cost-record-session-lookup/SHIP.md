# SHIP — cost-record-session-lookup

**Run ended at:** **GATE 2** — the human decides merge / fix / abandon.

## Stages run, in order

| #   | stage                       | structural verdict read (FLOOR)                        | result   |
| --- | --------------------------- | ------------------------------------------------------ | -------- |
| 1   | `/pharn-dev-plan`           | — (ends at GATE 1, its own approval halt)              | approved |
| 2   | `/pharn-dev-grill`          | `check-plan-lessons.mjs` exit **0**                    | proceed  |
| 3   | `/pharn-dev-build`          | `validate.mjs` exit **0** (GREEN, 36 capabilities)     | proceed  |
| 4   | `/pharn-dev-regress`        | `regression-report.json` `.verdict` = `no-regressions` | proceed  |
| 5   | `/pharn-dev-verify`         | `verify-report.json` `.verdict` = **`PASS`**           | proceed  |
| 6   | `/pharn-dev-review`         | (no structural verdict — advisory by construction)     | GATE 2   |
| 2b  | `/pharn-dev-memory-promote` | `check-provenance.mjs` exit **0** + human accept       | L51      |

**GATE 1** was hit once: the human approved the plan after three option-halt decisions (remove the cwd
refusal · remove `--cwd` · name the unsplit-cache-write residual unbuilt).

## Verdicts, verbatim

- `/pharn-dev-grill` → `check-plan-lessons.mjs` exit `0`. **Bound:** GREEN covers the _declaration_
  (`applied_lessons: [L25, L34, L35, L41, L47, L50]` present, well-formed, ids resolve, each referenced in
  the body), never that the lessons were applied. Its six interrogation findings gated nothing; four were
  addressed during the build anyway.
- `/pharn-dev-build` → `node pharn/floor/validate.mjs .` exit `0`.
- `/pharn-dev-regress` → `.verdict`: `"no-regressions"`; `regressions[]` and `pre_existing[]` both empty;
  `scope` reported **zero** escapes across 81 outside gates.
- `/pharn-dev-verify` → `.verdict`: `"PASS"`, `failing_gates`: `[]`. All seven gates exit 0 — `test`
  (2179/2179), `validate`, `lint`, `format:check`, `lint:md`, `structural:expected-injection-comment`,
  `reconcile`.
- **`npm run check` → GREEN, exit 0**, run end to end (all ten gates).

## The run did not go straight through — two stops, both recorded

**1. `/pharn-dev-verify` FAILED on the first pass** (`reconcile` RED, `ESCAPE` on `README.md`) and
`/pharn-dev-ship` STOPped at stage 5. Cause: the `SKILLS_VERSION` bump _forces_ a README badge edit
(`check-version-badge.mjs` holds them equal), so `README.md` was declared in `## Files` mid-build and the
setter re-run — but the epoch's opening `scope_snapshot` still held the build's five-path scope. The write
itself went through the **Edit tool** and was allowed by both live guards; what was missing was
`reconcile-baseline.mjs --amend-scope` after the re-scope. That is `lessons-learned` **L48**'s over-report
direction composed with **L42**. Resolved with the contract's own designed remedy — `scope_amendments`
exists (5.1.0) precisely because judging later hook-approved writes against the opening snapshot produces
false escapes, and the contract names leaving such a RED standing as the outcome that "trains an operator
to wave through the one finding that must never be waved through." The baseline's content hashes were never
touched and the epoch was never re-anchored. Evidence: `VERIFY.md`.

**2. `/pharn-dev-review` returned BLOCKED** on F1, a real regression this increment introduced: the rewrite
dropped the pre-existing `files === 0 → unavailable` guard as "now unreachable", and it is not. Found by
probing the built module, not by reading the diff. Fixed within the approved `## Files`, with the boundary
test that was missing; the fix's non-vacuity was measured (the module stripped of _only_ that guard fails
the new test, 36/37). `REGRESSION.md`, `VERIFY.md` and `REVIEW.md` were all re-run and refreshed after the
fix. Evidence: `REVIEW.md` F1 + its iteration-2 disposition table.

Both are recorded rather than smoothed over, because a roll-up that shows only the final green would
misrepresent what the gates actually did — and in both cases the gates did their job.

## What landed

`pharn/floor/render-cost-record.mjs` locates a transcript by **session id** (a filename test over
`<projectsDir>`'s immediate children), refuses when an id resolves to 2+ directories, and returns an honest
`unavailable` for a missing/unreadable projects dir **and** for a located-but-empty aggregate.
`projectDirName`, the `cwdSeen` plumbing, the cwd-mismatch refusal and `--cwd` are retired. Suite 37/37,
line coverage **98.63%**; the entry-point-guard contract (`--nope` → exit 2, exact stderr) is preserved,
10/10. `pharn/pharn-contracts/ship-record.md` is unchanged — no key added or removed — and `/pharn-ship`'s
no-argument invocation still works. `SKILLS_VERSION` 6.4.2 → **6.4.3** (patch) with the README badge.

**Two claims in the increment's own trigger were overturned on evidence, and the CHANGELOG says so:** the
renderer was never dead code (`CLAUDE_CODE_SESSION_ID` is set; it produces live numbers today, so
`LIMITS.md §1c` is true as written and got no patch), and the missing `.`-replacement was not the root
cause (a worktree directory is named for a path the session's first-recorded `cwd` never equals, so a
dot-corrected rule still fails). **First measured `/pharn-loop` cost recorded in this repo:** the
`loop-decision-integrity` fixture renders 275 deduped requests, 91.5M cache-read, 171k output.

## Artifacts

- Plan: `PLAN.md` · Grill log (advisory): `GRILL.md`
- Regression: `REGRESSION.md` + `regression-report.json`
- Verify: `VERIFY.md` + `verify-report.json`
- Review: `REVIEW.md` (4 lenses, iteration-2 dispositions)
- Measurement: `.dev/measurements/cost-record-lookup-2026-09-21.md`

Findings in `GRILL.md` / `REVIEW.md` are cited, not restated (P4); their free text is untrusted DATA (P2)
and gated nothing in this run.

## Lesson

```text
lesson: promoted L51
deferred:
  - the SKILLS_VERSION/README badge coupling: a FORCED edit no plan's `## Files` predicted, because
    `check-version-badge.mjs` holds two stores of one fact equal (the L35 family). Surfaced by stop #1.
  - the L48 recurrence: a mid-build re-scope is invisible to an open reconciliation epoch, and
    `/pharn-dev-build` prescribes no `--amend-scope` after one. Arguably occurrence #2, which is L20's
    stated bar for a floor check. Fixing it edits `.claude/commands/pharn-dev-build.md` — a DIFFERENT
    axis of change, so it is deferred rather than bundled here (P3/P7).
```

`L51` was read from its structured location — the `## L<n>` headings in `.dev/memory-bank/lessons-learned.md`
— never pattern-matched out of the promote command's printed prose (**L6**). The promote stage set its own
scope, ran `check-provenance.mjs` (GREEN), re-checked canon's content hash against its Step-1 pin, re-ran the
floor gate, and halted for an explicit human accept before writing. `docs/lessons-index.md` was regenerated
with the narrow generator and its drift check is GREEN (51 lessons, 51 tagged, 0 malformed).

**Bound (P0):** the promotion means the entry's **shape** passed the floor and a human accepted it — never
that the lesson is sound. L51's own trigger is a **first** occurrence, not a recurrence, and the entry says
so rather than manufacturing a second.

## Standing decision

The chain ran to GATE 2 and the named floor verdicts are as shown — **this is NOT a judgment that the
increment is good or wise; that is the human's call at the post-review gate.** Nothing here is a
self-issued "shipped", an approval, or a `PHARN ✓ reviewed` seal. No merge, no push, no commit, no seal was
performed.
