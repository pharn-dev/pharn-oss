# SHIP — head-test-single-run (Linear CORE-89)

Branch `claude/head-test-single-run`, cut from `origin/claude/regress-per-test-product` at `907da87d` (CORE-77, PR #447,
7.17.0) in an isolated agent worktree. #447 was squash-merged into `main` as `538658eb` during the run; its tree equals
`907da87d`, so the merge of `origin/main` (after verify) changed no file. SKILLS_VERSION 7.18.0 (minor), MIN_CLI
unchanged at 0.14.0.

## Decisions recorded

- **AC 1 — LOOP-8 reopened.** Decided by the batch orchestrator (a model) under the user's delegation ("You make all
  decisions"), 2026-11-16 — **not a human approval**. Evidence: `test` 286.3 s of a 346.7 s gate sum (82.6%) on the
  measured project through the 7.16.0 runner (`lint` 23.7 s, `format:check` 14.6 s, `typecheck` 22.2 s;
  `.dev/measurements/gates-within-side-parallel-2026-11-16.md`), and `.dev/measurements/loop-baseline-2026-11-11.md`
  (regress median 16.1 min; 6 of 9 `STOP_TERMINAL` stops were `test` timeouts). What one execution saves per loop
  iteration: the outside-subset `test` run HEAD used to make (about the whole suite minus the inside tests; roughly the
  286 s on that project), and one of the two chances per iteration to hit the 540 s per-gate timeout.
- **GATE 1** — a decision by the batch orchestrator (a model) under the user's delegation, 2026-11-16 — not a human
  approval. Approved as written: Q1 (a) BASE keeps running the outside tests via `baseSpecFrom`; Q2 (a) read both records
  whenever HEAD `test` is red (refined at build by grill finding L107: the BASE record is read only when the HEAD record
  holds a compared failure or a suite error, and a `no-files` BASE reads as empty); Q3 (a) a HEAD red owned only by
  inside tests is not a regression, L34 over the whole HEAD record, stated in `regression-report.md` and the CHANGELOG
  and pinned by tests (inside-only red → no regression; red with zero failed tests → refusal); Q4 (a) `stage-regress`
  decides from the config and passes `--test-whole-suite`, the stamp records `compare_files`; Q5 (a) the LIMITS §9
  patch before the build's anchor; Q6 7.18.0 minor.
- **`pharn/LIMITS.md` §9** — a human edit through the orchestrator's relayed patch script (new sha256 `189bbd35…c5cc1c`),
  committed as `8c523e43` before `/pharn-dev-build` Step 0 (L68).
- **GATE 2** — a **delegated model decision**, not a human one: verify PASS ∧ regress clean ∧ zero floor-gate findings
  hold, so the run proceeds to one pull request against `main`, not merged.

## Stages run, in order

1. `/pharn-dev-plan` → `PLAN.md` (`spec_content_hash` `d19c3ae5…`, 12 cited lessons; `check-plan-lessons` exit 0;
   `set-writes-scope --check` exit 0, 31 paths). GATE 1 as above.
2. `/pharn-dev-grill` → `GRILL.md`: lessons declaration GREEN; the interrogation and the 13 grillers were applied by an
   independent read-only reviewer agent: 10 advisory concerns (1 blocking-severity). The build answered each
   (dispositions in `GRILL.md`): the BASE-read narrowing, the removed-copy-on-miss rule, the refusal when the
   declaration is gone, the three missing tests, and the stated trades.
3. `/pharn-dev-build` → setter from `## Files`, anchor `--by pharn-dev-build`, build committed as `ebf7b0b1` and
   `3b7cac55`; `validate.mjs` exit 0. Declared paths left unchanged: `check-loop-fresh.test.mjs` (AC 6 is pinned
   end to end in `stage-verify.test.mjs`: E and J over a reused `test`, and J stopping on an edited copy),
   `check-verify.test.mjs`, `head-reuse-offer.mjs`, `stage-verify.mjs`, `.dev/floor/command-hygiene.test.mjs` (all
   "only if"), and `docs/capabilities/**` (regenerated, no byte moved).
4. `/pharn-dev-review` (an independent read-only reviewer agent, in parallel with regress) → GREEN, 0 floor-gate
   findings, 6 minor advisory; fixed in `232af72b` under a re-set plan scope (`--amend-scope` on the epoch) except A6,
   accepted. `REVIEW.md` has the findings and dispositions.
5. `/pharn-dev-regress --base 907da87d` (explicit: the build is committed) → `no-regressions` (189 outside test files;
   per test, head 6468 pass / 0 fail / 1 skipped, 0 new failures). The review fix round landed during the HEAD side and
   touched only inside paths (`REGRESSION.md`).
6. `/pharn-dev-verify` on `232af72b` → `PASS` (stamp `e94ac751…`; `test` 6902 pass / 0 fail / 1 skipped;
   `reconcile` CLEAN, 0 escapes). `check-ship.mjs` → `STOP_GREEN`.
7. Merge of `origin/main` `538658eb` (no file changed), then GATE 2 (delegated).

## Verdicts

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

## Pointers

- Review: `.dev/features/head-test-single-run/REVIEW.md` — 0 floor-gate findings.
- Grill: `.dev/features/head-test-single-run/GRILL.md` (advisory).
- Regress / verify: `REGRESSION.md` + `regression-report.json`, `VERIFY.md` + `verify-report.json`.

changelog-entry: exit 0

lesson: none — every grill and review finding is a first occurrence in this run, not a recurring failure of a mechanism

deferred: none

Named follow-ups (not lessons): a real `/pharn-loop` run on the measured project with `testResults.test` declared, to
measure the per-iteration saving and confirm the HEAD whole-suite run stays under the per-gate timeout; reusing the
build gate's run stays out of scope (`BUILD.md` is written after it and is fingerprinted).

Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
