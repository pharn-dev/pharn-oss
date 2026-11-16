# SHIP — regress-per-test-product (Linear CORE-77)

Branch `claude/regress-per-test-product`, from `origin/main` at `31f8b691` (7.16.0), in an isolated agent worktree;
`origin/main` 0da70efa (PR #446, dev-only) was merged in mid-run. SKILLS_VERSION 7.17.0 (minor), MIN_CLI unchanged at
0.14.0.

## Stages run, in order

1. `/pharn-dev-plan` → `PLAN.md` (26 declared paths after GATE 1). `spec_content_hash` `d19c3ae5…` equals
   `pharn/ARCHITECTURE.md`. **GATE 1 was a decision by the batch orchestrator (a model) under the user's delegation ("You
   make all decisions"), 2026-11-16 — not a human approval.** Approved as written, every recommendation taken (Q1–Q7,
   recorded in `PLAN.md` "GATE 1 questions and decisions"). Q1, the ticket's start condition, was GO on the baseline
   (`test` ≈ 9 min per run against a 16.1-min regress median, n = 11, `.dev/measurements/loop-baseline-2026-11-11.md`
   §12). It did not wait for CORE-88's timing pass, which landed afterwards and confirms it: one sequential pass of the
   measured project's gates through the 7.16.0 runner put `test` at 286.3 s of a 346.7 s sum, 82.6%, on a loaded M2
   (load average 33 during `test`). Record: `.dev/measurements/gates-within-side-parallel-2026-11-16.md` (PR #446).
2. `/pharn-dev-grill` → `GRILL.md`; `check-plan-lessons.mjs` exit 0; 6 advisory concerns (2 important, 4 minor). The
   build answered them in the code and contracts: the import choice and the config dependency are stated; the realistic
   e2e reporter and a captured-vitest unit test were written. The colon slot id maps to `1-base_test.test-results.json`
   on both sides of the copy (tested). Refusal reasons carry no path (tested).
3. `/pharn-dev-build` → setter from the plan's `## Files` (26 paths), then the anchor `--by pharn-dev-build`.
   `validate.mjs` exit 0.
   - Three declared paths were left unchanged: `pharn/floor/per-test-results-core.mjs` and
     `.dev/floor/command-hygiene.test.mjs` (both declared "only if"; neither was needed), and
     `pharn/floor/stage-regress.test.mjs`.
   - **Deviation from the plan:** the end-to-end tests the plan put in `stage-regress.test.mjs` went into
     `pharn/floor/entry-base-evidence.test.mjs`, also declared. That file's fixture drives both a fresh BASE worktree and
     an entry-derived BASE in one project, through the pinned lines. AC 3's byte-identity is pinned at the CLI level in
     `check-regress.test.mjs`.
   - `run-gates.mjs` needed no change (`PLAN.md` says why).
4. `/pharn-dev-regress` (base `31f8b691`) → `no-regressions` (189 outside test files, per test 6495 pass / 0 fail at
   head, 0 new failures). Superseded by step 8.
5. Merge of `origin/main` 0da70efa: one CHANGELOG conflict. Main's `[Unreleased]` entry was moved, byte for byte, into
   `[7.17.0]` under `### Changed`, as CONTRIBUTING's bump rule requires. `check:changelog-entry` exit 0.
6. `/pharn-dev-review` (an independent read-only reviewer agent; it ran in parallel with a verify chain that was later
   abandoned) → 1 floor-gate finding (a likely CI diff-coverage RED on one refusal branch) and 7 advisory findings.
7. Fix round, under GATE 2's delegated decision to fix what the orchestrating agent agreed with. Every finding but the
   PLAN deviation (recorded above) was fixed inside the plan's `## Files`, under a re-set plan scope (`--amend-scope` on
   the epoch). The re-review confirmed all fixes and raised 1 minor (stale contract text), also fixed. `REVIEW.md` has
   the findings and dispositions.
8. `/pharn-dev-regress` re-run on the final tree, `--base 0da70efa` (explicit: the build is committed) →
   `no-regressions` (189 outside test files; per test, head 6495 pass / 0 fail / 1 skipped, 0 new failures).
9. `/pharn-dev-verify` on the final tree → `PASS` (stamp `e9824ecd…`; `test` 6872 pass / 0 fail / 1 skipped;
   `reconcile` CLEAN, with the merged measurements file classified `merged`). The abandoned earlier chain had run `test`
   only (exit 0) and was replaced by this chain's `init`.
10. GATE 2: a **delegated model decision**, not a human one. The brief's condition holds (verify PASS ∧ regress clean ∧
    zero floor-gate findings outstanding), so the run proceeds to one pull request against `main`, which it does not
    merge.

## Verdicts

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

## Pointers

- Review: `.dev/features/regress-per-test-product/REVIEW.md` — 0 floor-gate findings outstanding.
- Grill: `.dev/features/regress-per-test-product/GRILL.md` (advisory).
- Regress / verify: `REGRESSION.md` + `regression-report.json`, `VERIFY.md` + `verify-report.json`.

changelog-entry: exit 0

lesson: none — every grill and review finding is a first occurrence in this run, not a recurring failure of a mechanism

deferred: none

Named follow-ups (not lessons): CORE-89 (one HEAD `test` run serving regress and verify). It must supply its own
comparison domain, the inside complement, for a whole-suite run with `files: []`. It must also decide how the L34
refusal, now judged over compared files, treats a head red owned only by inside tests.

Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
