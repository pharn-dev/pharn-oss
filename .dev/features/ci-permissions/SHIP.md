# SHIP — ci-permissions

A thin, **advisory** roll-up of the `/pharn-dev-ship` chain for this increment. Nothing here is a seal, an
approval, or a claim that the increment is good.

## Stages that ran, in order

`/pharn-dev-plan` → **GATE 1 (human approved)** → `/pharn-dev-grill` → `/pharn-dev-build` →
`/pharn-dev-regress` → `/pharn-dev-verify` → `/pharn-dev-review` → **GATE 2 (where this run ends)**.

The run ended at **GATE 2**, not at a RED-verdict STOP. It was interrupted once mid-`/pharn-dev-grill` by a
session rate limit and resumed; live state was re-verified on resume (worktree, branch, spec hash, active
scope) rather than assumed.

## Structural verdicts read, verbatim

| stage                | verdict source                              | value                                            |
| -------------------- | ------------------------------------------- | ------------------------------------------------ |
| `/pharn-dev-grill`   | `check-plan-lessons.mjs` exit code          | **0** (GREEN — declaration holds)                |
| `/pharn-dev-build`   | `node pharn/floor/validate.mjs .` exit code | **0** (`FLOOR: GREEN — 36 capabilities checked`) |
| `/pharn-dev-regress` | `regression-report.json` `.verdict`         | **`"no-regressions"`**                           |
| `/pharn-dev-verify`  | `verify-report.json` `.verdict`             | **`"PASS"`** (`failing_gates: []`)               |

The spec content-hash pin held at every stage that checks it:
`sha256(pharn/ARCHITECTURE.md)` = `69c8395365abb719cc3132ffa7a7607051b1e04ca3a3fa70ee563b86b857f18e`,
equal to the plan's `spec_content_hash` at grill (warn-only) and at build (blocking).

## Pointers (cited, not restated — P4)

- `.dev/features/ci-permissions/REVIEW.md` — 0 floor-gate findings, 3 advisory. Read it for the R1 finding
  and the proposed lesson candidate.
- `.dev/features/ci-permissions/GRILL.md` — advisory, 3 concerns (0 blocking, 1 important, 2 minor).
- `.dev/features/ci-permissions/REGRESSION.md` — includes the non-standard baseline method and why.
- `.dev/features/ci-permissions/VERIFY.md` — includes why this feature carries no `structural:*` gate.

## Lesson

lesson: skipped

**Why `skipped` and not `promoted`.** A candidate cleared the `L20` bar and is written up in full in
`REVIEW.md` — _a prose cardinality word is a second copy of a list's length; drain it_ — with two live
occurrences one stage apart (`PLAN.md:69`, `REGRESSION.md:50`) and a third in an earlier draft of
`REVIEW.md` itself. Step 2b's gate is an explicit **human** accept/deny, and this run had no human in its
loop to answer it: the coordinator relays to the human between turns, so the question is carried to GATE 2
rather than answered by the model. **The model never self-promotes**, and a default-yes on a canon write is
the thing that gate exists to refuse. If the human accepts at GATE 2, promotion is a separate
`/pharn-dev-memory-promote` run under its own scope, behind `check-provenance.mjs` and its own accept/deny
halt — never from here.

deferred: none

## Post-GATE-1 edits to `PLAN.md` — declared, not hidden

At GATE 2 the human directed two repairs to `PLAN.md` and they were made **after** the plan's GATE-1
approval, under a writes-scope set explicitly to that file. Both are declared here because a plan edited
after approval is exactly the shape that must never happen silently — `check-regress.mjs` documents giving
up the detection of a build that rewrites its own `## Files` to retroactively authorize a path, so the
honesty has to come from declaration rather than from a checker.

**Neither edit changes substance.** The `## Files` list, the guarantee audit, the twelve-step permission
audit, `applied_lessons`, and `spec_content_hash` are all byte-unchanged; `check-plan-lessons.mjs` was
re-run after the edits and still exits 0. The diff under review is unaffected.

1. **Cardinality corrected.** `PLAN.md:69` read "**Two** tests parse `ci.yml`" above **three** enumerated
   test files (the R1 finding's first instance, raised in `GRILL.md` as G1). It now reads "Three test files
   parse `ci.yml`". The count was wrong; the enumeration and the conclusion were always right.
2. **The three GATE-1 answers recorded in the plan.** `## Open questions (HALT)` listed three questions
   whose answers existed only outside the document. Each is now written as resolved, attributed to the human
   at GATE 1: bare key (no comment); workflow level (not job level); the `cache: npm` bound accepted, with
   its failure signature kept — if cache restore breaks after this change, audit row 2 is the row to check.

**Why this was permitted at all:** the plan had **never been committed** at the time of the edits — it was a
working file, not yet the audit record. Correcting it before its first commit means the record is right from
the moment it becomes one, rather than enshrining a known-wrong count and a section that reads unresolved.
The scope argument that stopped the model from self-repairing at GATE 2 still stands and is not weakened by
this: no stage repaired the plan on its own initiative; a human directed it.

## Standing statement

The chain ran; the named floor verdicts are as shown above. **This is NOT a judgment that the increment is
good or wise; that is the human's call at the post-review gate.** No merge, no push, no commit, no
`PHARN ✓ reviewed` seal was issued by this run, and `/pharn-dev-ship` issues none.

**Read the GREENs narrowly (P0).** Every verdict above is green, and not one of them evaluated a GitHub
Actions workflow file — `validate.mjs` does not scan `.github/`, `npm test` never loads it, and the style
gates only prove the three added lines are prettier-clean. The gates are green because the change is inert
to them. What stands behind the change is the twelve-step permission audit in `PLAN.md`, the byte-shape
agreement with `floor.yml` and `gitleaks.yml`, and the human's GATE-1 approval — **all advisory**. Whether
`contents: read` is sufficient is settled by GitHub on the next CI run, which no clock in this repository
owns.
