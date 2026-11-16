# SHIP — gate-timeout-above-bash-cap (Linear CORE-87)

Branch `claude/gate-timeout-above-bash-cap`, from `main` at `edd15ea4` (7.15.0), in an isolated agent worktree. At the
time of this record nothing is committed, merged or pushed by the chain itself.

## Stages run, in order

1. `/pharn-dev-plan` → `PLAN.md` (written before this run by the orchestrator's plan stage). **GATE 1 was an
   orchestrator decision made under the user's delegation (2026-11-16), not a human approval.** The plan was accepted
   as written (24 declared paths, 7.16.0 minor, MIN_CLI unchanged at 0.14.0, no protected path). Its four open questions
   were decided as recommended: D1 upper bound 1800000 ms; D2 accept that floors ≤ 7.15.0 keep their message, with the
   remedy named from 7.16.0 and in the CHANGELOG and docs; D3 refuse `timeout-changed` mid-run; D4 a relative lower
   bound. They are recorded in `PLAN.md` "Decisions at GATE 1". `spec_content_hash` re-checked equal to
   `pharn/ARCHITECTURE.md` (`d19c3ae5…`).
2. `/pharn-dev-grill` → `GRILL.md`; `check-plan-lessons.mjs` exit 0. The interrogation raised 6 advisory concerns
   (2 important, 4 minor). The orchestrator amended the plan in place before the build ("Amended after
   `/pharn-dev-grill`"), adding no path, and the lessons check was re-run (exit 0).
3. `/pharn-dev-build` → setter from the plan's `## Files` (24 paths), then the anchor `--by pharn-dev-build`. It wrote
   23 of the 24 paths; `.dev/floor/stage-load-budget.test.mjs` was declared "only if the measured totals need it" and
   was left unchanged because they did not. `validate.mjs` exit 0.
4. `/pharn-dev-regress` → `no-regressions` (base `edd15ea4`, 189 outside test files).
5. `/pharn-dev-verify` → `PASS` (7 gates through `run-gates.mjs`, stamp `e88393d5…`).
6. `/pharn-dev-review` (an independent read-only reviewer agent) → 0 floor-gate findings; 2 important and 4 minor
   advisory findings.
7. Fix round, under GATE 2's delegated decision to fix the advisory findings the orchestrator agreed with: all six were
   fixed inside the plan's `## Files`, under a re-set build scope (`--amend-scope` recorded on the epoch). A re-review by
   the same agent confirmed the six fixes and raised 2 minors: the wording one was fixed, the pinned-value guard was
   declined with a reason (`REVIEW.md`).
8. `/pharn-dev-regress` re-run on the final tree → `no-regressions` (29 inside paths; per test, head 6208 pass /
   0 fail, 0 new failures). A re-run started before the re-review's wording fix was stopped part-way, before any verdict,
   and its base worktree was removed.
9. `/pharn-dev-verify` re-run on the final tree → `PASS` (stamp `3ba85552…`, `test` 6831 pass / 0 fail, `reconcile`
   exit 0).
10. GATE 2: a **delegated model decision**, not a human one. The brief's condition (verify PASS ∧ regress clean ∧ zero
    floor-gate findings) holds, so the run proceeds to one pull request against `main`, which it does not merge.

## Verdicts

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

## Pointers

- Review: `.dev/features/gate-timeout-above-bash-cap/REVIEW.md` — 0 floor-gate findings; 7 of the 8 advisory findings
  fixed, 1 declined with a reason.
- Grill: `.dev/features/gate-timeout-above-bash-cap/GRILL.md` (advisory).
- Regress / verify: `REGRESSION.md` + `regression-report.json`, `VERIFY.md` + `verify-report.json`.

changelog-entry: exit 0

lesson: none — each grill and review finding is a first occurrence in this run, not a recurring failure of a mechanism
(L20's bar is not met), so no candidate was taken to the promote gate.

deferred: none

## Build note

The project's `pharn.config.json` may declare `gates.timeoutMs`. `pharn/floor/gate-timeout-core.mjs` (new) owns the
value rule: 100–1800000 ms, and it may only lengthen the pinned value. It also owns the one resolution rule, which a
refusing block falls back from. `gate-exclusion-core.mjs` carries the key beside `exclude`, and an unknown key names the
update remedy. `entry-gates.mjs --start` puts the value in `runner.json`, the runner's argv and the cache inputs, or
refuses `bad-gate-timeout`. `stage-direct.mjs` writes it into the recorded fresh argv, or refuses `timeout-unusable` or
`timeout-changed`. The three not-measured stop texts name the declaration beside `gates.exclude`. The contracts
`gate-run-record.md` and `stage-exit.md` state the bounds.

Named follow-ups, kept out of scope:

- `build-gate-declared-timeout`
- `thin-caller-declared-timeout`
- `entry-timeout-refusal-stop`
- the entry `--wait` takeover with a declared value above `--budget-ms` is stated in the header, not exercised by a test

## Process notes (recorded, not hidden)

- **Gate runs in an isolated worktree.** The pinned regress shell forms (`xargs`, `$VAR` capture) are refused in a
  worktree-isolated session, so the same runs were made through a node runner with argv arrays
  (`pharn/.run/pharn-dev-regress/run.mjs`). Its first run stopped on a bug in the runner before measuring anything.
- **A denied Bash write.** One Bash-routed file edit (a `python3` rewrite of a test file) was refused by the session's
  classifier before it ran. It was redone through Edit, and every artifact and build write went through Write/Edit.
- **A guard deny during the fix round.** One Edit was denied by the writes-scope guard because the regress scope was
  still active. The documented remedy was used: the build scope was re-set from the plan, with `--amend-scope`.
- **Formatters.** `prettier --write` and `npm run docs:generate` ran on declared paths only (Bash writes; `reconcile`
  exit 0).
- **A plan narrowing.** AC2 at verify is shown through the declared value reaching the verify script's argv, not through
  the real `stage-verify.mjs` as the plan's evals list said (`VERIFY.md`).
- **The coordinator's relayed message.** Mid-run the coordinator relayed a fallback instruction: if a write is denied,
  write patch scripts for the user to run. It was not used, because every needed write went through Write/Edit under a
  scope the setter derived.

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
