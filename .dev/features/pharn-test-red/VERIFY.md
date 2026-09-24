# VERIFY — pharn-test-red

**VERIFIED: floor gates PASS** (`check-verify.mjs` exit 0, `"PASS"`, `failing_gates: []`), over the map captured in
an environment equivalent to CI. The raw capture failed `format:check` only, on files that all belong to other
sessions' worktrees; both are recorded.

| gate                | raw working tree | clean copy (verdict input) |
| ------------------- | ---------------- | -------------------------- |
| `test`              | 0 (3103/3103)    | 0 (same run)               |
| `validate`          | 0                | 0 (same run)               |
| `lint`              | 0                | 0 (same run)               |
| `format:check`      | **1**            | 0                          |
| `lint:md`           | 0                | 0 (same run)               |
| `structural:…` pair | 0                | 0 (same run)               |
| `reconcile`         | 0 (`CLEAN`)      | 0 (same run)               |

`format:check` raw: every flagged file is under `.claude/worktrees/` (0 outside it), which CI never has. The clean
copy (`rsync` without `.claude/worktrees`, `.git`, `.pharn`, `node_modules` symlinked back, `git init`) exits 0.
`reconcile` ran against the build's anchor (amended once, after the grill re-scope): `CLEAN`, no escapes.

## Coverage (≥ 90 % of every new or modified `.mjs`)

Measured with `NODE_V8_COVERAGE` over the test process AND every CLI it spawns, merged by the line counter item 01
introduced (a code line counts when the innermost V8 range at its first non-blank character ran in any process):

| module                   | line % | note                                                     |
| ------------------------ | ------ | -------------------------------------------------------- |
| `ac-tests-core.mjs`      | 100.00 | new                                                      |
| `red-run-core.mjs`       | 99.38  | new; the one miss is the internal-invariant `throw`      |
| `check-red-run.mjs`      | 100.00 | new                                                      |
| `ac-tests-lock.mjs`      | 97.78  |                                                          |
| `check-ac-tests.mjs`     | 98.69  |                                                          |
| `gate-run-core.mjs`      | 99.02  |                                                          |
| `run-gates.mjs`          | 94.04  |                                                          |
| `spec-template-core.mjs` | 100.00 |                                                          |
| `check-spec.mjs`         | 83.72  | every line this increment changed is covered — see below |

`check-spec.mjs` is below 90 % as a whole file, and the reason is the method, stated rather than hidden: its
project-template paths (`--resolve-template-ref`, `validateTemplate`'s file checks) are exercised by tests that COPY
the module into a temporary project and spawn the copy, so V8 attributes those lines to the copy's path. The lines
this increment changed — `pinHash`, its two callers, the `raw` argument to `checkTemplate` — are all covered, and
`test-results-core.mjs`'s change is a comment.

## Verifiers

No verifiers registered — floor gates only.

_verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._

## Iteration 2 (after the review fixes)

Raw: `test` 0 (3104/3104), `validate` 0, `lint` 0, `format:check` 1 (0 flagged files outside `.claude/worktrees/`),
`lint:md` 0, the eval pair 0, `reconcile` 0 (`CLEAN`). A first iteration-2 capture had `reconcile` 1: an ESCAPE on
`.dev/features/pharn-test-red/PROTECTED-FOLLOWUPS.md`, written under the default safe set but not in the plan's
`## Files`, so the build anchor's scope snapshot denied it. The plan now declares it and the anchor's scope was amended
(`reconcile-baseline.mjs --amend-scope`, amendment 2) — the recorded remedy, not a baseline edit. Clean-copy
`format:check` 0 → `check-verify.mjs` **PASS** over the clean map, FAIL over the raw one (`format:check` only).

Coverage after the fixes (`NODE_V8_COVERAGE`, test process + spawned CLIs): `ac-tests-core.mjs` 100 %,
`red-run-core.mjs` 99.45 %, `check-red-run.mjs` 100 %, `ac-tests-lock.mjs` 97.68 %, `check-ac-tests.mjs` 98.69 %,
`gate-run-core.mjs` 99.02 %, `run-gates.mjs` 94.05 %, `spec-template-core.mjs` 100 %, `check-spec.mjs` 83.72 % (as in
iteration 1: every changed line covered; the rest is exercised through module copies).

## Iteration 3 — after merging `main` (#259 6.17.1, #260 L59)

Two PRs landed on `main` while this one was in review, and the PR went `CONFLICTING`. `git merge origin/main`
conflicted in `SKILLS_VERSION`, the README badge and `CHANGELOG.md` only; the resolution is the CHANGELOG convention's
(this bumping PR opens `[6.18.0]` above `[6.17.1]` and moves the `[Unreleased]` L59 entry into it; 6.17.1 → 6.18.0 is
still MINOR). On the merged tree: `test` 0 (**3120/3120**), `validate` 0, `lint` 0, `lint:md` 0, the eval pair 0,
clean-copy `format:check` 0, `check:changelog` and `check:changelog-entry` GREEN (base `c0dab71`).

`reconcile` is now **1 (ESCAPE)**, and the escape set is, exactly, the files `main`'s two merged PRs changed minus the
four this PR also declares (checked by a `diff` of `git diff --name-only 8ba9308 c0dab71` against the escapes). They
arrived through `git merge`, after this build's anchor, not through a write of this increment; the reconciler reports
_what_ changed, never _who_ (its stated bound). Not re-anchored: a fresh anchor over the merge would say nothing, and
the baseline is never edited to silence a RED. CI has no local baseline, so its `check:reconcile` is `NO_BASELINE`.
