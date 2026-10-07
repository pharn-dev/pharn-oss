# SHIP — reconcile-merged-paths

Stages run, in order: `/pharn-dev-plan` → GATE 1 → `/pharn-dev-grill` → `/pharn-dev-build` → `/pharn-dev-regress` →
`/pharn-dev-verify` → `/pharn-dev-review` → **GATE 2 (where this run ended)**.

- **GATE 1:** a delegated model decision by the orchestrator, not a human approval. The plan was approved as
  written, including recording `anchored_head` at the anchor only. Two tests were added: a rebase case and an
  uncommitted-edit-at-anchor case. The version moved to 6.51.0.
- `/pharn-dev-grill` → `check-plan-lessons.mjs` exit **0** (GREEN). The interrogation raised five advisory
  concerns (`GRILL.md`).
- `/pharn-dev-build` → `validate` exit **0** (GREEN).
- `/pharn-dev-regress` → `regression-report.json` `.verdict`: **`no-regressions`**.
- `/pharn-dev-verify` → `verify-report.json` `.verdict`: **`PASS`** (`reconcile` exit 0).
- `/pharn-dev-review` → `REVIEW.md` (advisory; 0 floor-gate findings, 4 advisory).
- changelog-entry: exit 0
- lesson: none. No candidate cleared L20's bar: the in-build catches were a working mechanism (the GIT CEILING
  enumeration test) and a one-off design correction (condition (f) moved from U to the merge base).
- deferred: none
- **GATE 2:** a delegated model decision by the orchestrator, not a human approval. The decision was FIX, then
  ship. The orchestrator accepted both build deviations (the merge base M instead of the upstream tip U, and the
  M-new check) and the three added files.
  - Fixed A1: `anchored_head` is shape-checked against the object-id regex before it reaches git, with a test
    using `--all`.
  - Fixed A2: one test for filenames holding pathspec magic or glob characters, and one for a merged mode-120000
    symlink. The probe found that `ls-tree` already reads `*` and `?` literally; `GIT_LITERAL_PATHSPECS` is what
    makes `:(top)…` literal. The header now says so, and the test uses `:(top)dep.json` as its falsifier.
  - Each new test fails when its mechanism is removed (mutation run).
  - A3: the trusted-doc text goes to the orchestrator for a human. A4: no action.
  - Verify was re-run after the fixes: PASS, `reconcile` CLEAN.

Disclosure: before the build anchor, one PLAN.md line was edited with `sed` through Bash rather than the Edit
tool. No scope was set at that moment, the path was in the fail-closed default-safe-set the Write tool would
have allowed, and it is a reconcile-exempt pipeline artifact. Every later repo write went through Write or Edit.

The chain ran, and the named floor verdicts are as shown. This is NOT a judgment that the increment is good or
wise; that is the call to make at the post-review gate.
