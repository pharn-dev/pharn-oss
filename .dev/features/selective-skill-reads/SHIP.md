# SHIP — selective-skill-reads

Gated `/pharn-dev-ship` run, 2026-10-06, base `c441b0965825f9e2e2f8d5e2ef543cc4991ed56a` (main, 6.46.1; main had
not moved at the final fetch). Branch `feat/selective-skill-reads`, uncommitted. The run ended at **GATE 2**, after
one fix round.

## Stages, in order, and the verdict each one read

1. `/pharn-dev-plan` → `PLAN.md`, `check-plan-lessons` GREEN (`applied_lessons: L4, L6, L22, L35, L41, L59, L67`).
   **GATE 1:** approved as written, with the eval run live.
2. `/pharn-dev-grill` → [`GRILL.md`](./GRILL.md), run by a subagent. `check-plan-lessons.mjs` exit **0**. Advisory:
   17 concerns (0 blocking). Three post-grill decisions were asked and recorded in `PLAN.md` under "Post-grill
   amendments":
   - the procedure moved to `pharn/pharn-core/`;
   - each review lens runs the catalogue itself;
   - the eval uses 2 candidates plus 1 baseline per case.
3. `/pharn-dev-build`. `node pharn/floor/validate.mjs .` exit **0** (`FLOOR: GREEN — 37 capabilities`). The live
   semantic eval (21 agents) is recorded in [`EVAL.md`](./EVAL.md), and the byte measurements in
   [`MEASUREMENTS.md`](./MEASUREMENTS.md).
4. `/pharn-dev-regress` → `regression-report.json` `.verdict` = **`no-regressions`**.
5. `/pharn-dev-verify` → `verify-report.json` `.verdict` = **`PASS`** (`reconcile` `CLEAN`).
6. `/pharn-dev-review` → [`REVIEW.md`](./REVIEW.md), run by a subagent (advisory; 0 floor-gate findings, 7 advisory).

**GATE 2, first pass: fix.** The human chose to fix review findings 1, 2, 3, 5 and 7 (A1, A2, A3, A5, A7) inside the
plan's `## Files`. `PLAN.md` "GATE 2 fix round" records each one:

- **A1:** grill and each review lens now state the `skills:` line for every mode, including
  `legacy-fallback (catalogue exit <n>)` and `unavailable`, plus a "scanner fails too" branch. Build already had
  these. A further edit to `pharn-build.md` was proposed in this round and rejected by the human, so build's prose
  is as it was. Sizes are within their ceilings: grill 23,012 / 23,040 and review 23,220 / 24,064 bytes.
- **A2:** the 29 fixture skills moved from `<case>/.claude/skills/` to `<case>/skills/`, so this repository's sessions
  no longer load them as live skills. The consumer test and `measure.mjs` copy them into a scratch repo, and a test
  asserts that no fixture sits under `.claude`. The embedded catalogues and every measured byte count are unchanged.
- **A3:** the core header now labels the consumer half of `unsafe` as ADVISORY.
- **A5:** an all-`unsafe` roster now reports `mode_reason` `all-unsafe`. The CHANGELOG and README disclose that
  skills reached through a `.claude` symlink that leaves the project are no longer read.
- **A7:** the fifo path-kind case now really skips when `mkfifo` is missing.

**After the fix round, the gates were re-run:**

- `npm run check` exit 0 (4,984 tests, 0 fail, 0 skipped); `validate` GREEN (37 capabilities).
- `/pharn-dev-regress` → `regression-report.json` `.verdict` = **`no-regressions`**. The base side ran in a fresh
  worktree at c441b09: 142 outside test files, `validate` and the trust-fence pair, all 0 → 0.
- `/pharn-dev-verify` → `verify-report.json` `.verdict` = **`PASS`**. `test`, `validate`, `lint`, `format:check`,
  `lint:md`, `structural:` (trust-fence) and `reconcile` all exit 0. Reconcile is `CLEAN`, with `escapes: []`.

Review was not re-run. `REVIEW.md` is the pre-fix review. A4 (no `pharn-contracts` schema for `installed-skills/1`)
and A6 (the procedure is 5,066 B against a ~4.5 KB target) were left as recorded.

changelog-entry: exit 0

lesson: promoted L70

deferred:

- `installed-skills-catalogue-contract`: move the `installed-skills/1` shape from the core header into
  `pharn/pharn-contracts/` (REVIEW A4). The plan chose no new contract; this is for the human to decide.
- Human-only follow-up: apply [`TRUSTED-DOC-PROPOSAL.md`](./TRUSTED-DOC-PROPOSAL.md) (THREAT-MODEL §2 item 8, §3, §5;
  ARCHITECTURE §4) outside the anchor→verify window, per L68.

After promotion, `npm run check:reconcile` stays `CLEAN` (68 paths reconciled, `escapes: []`), and
`check-lessons-index` is GREEN (70 lessons).

## Orchestration notes (advisory)

- **Bash writes inside scope.** Twice, early in the build, `perl` and `sed -i` were used on declared paths
  (`PLAN.md` and a test file) before the agent switched to Edit and Write. The fix round moved the fixtures with
  `mv` onto declared paths. One-off generators were run from `.pharn/` and then deleted. All of these are covered by
  the reconcile `CLEAN`, which records what changed, never who changed it.
- **Background runs.** The first regress command overran the Bash tool's 600 s limit and finished in the
  background. It was not retried; its results were read from disk. In the fix round, `npm run check` and both
  regress sides ran as background calls, each read after it exited 0.
- **Delegated stages.** Grill and review ran as subagents; their artifacts are quoted DATA here.

Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
