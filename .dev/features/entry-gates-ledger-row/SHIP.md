# SHIP — entry-gates-ledger-row

Base: `origin/main` `6aa4f59492a7ad4108abd91e65e426b768081afc` (SKILLS_VERSION 6.47.0 → 6.48.0), branch
`feat/entry-gates-ledger-row`, uncommitted. The prompt's "last reviewed main" `c441b09` (6.46.1) is one commit behind
this base.

## Stages run, in order

1. `/pharn-dev-plan` → `PLAN.md`. **GATE 1: approved as written by the human** (interactive form).
2. `/pharn-dev-grill` → `GRILL.md`. Lessons declaration: `check-plan-lessons.mjs` **exit 0**. Interrogation: 6
   advisory concerns, all addressed in the build (the overlap labelled as placement, the unbound direction tested, the
   regression proved field by field, the supersession and session-id bounds stated in the contract).
3. `/pharn-dev-build` → `validate.mjs` **exit 0** (GREEN, 37 capabilities).
4. `/pharn-dev-regress` → `regression-report.json` `.verdict` = **`no-regressions`** (base = HEAD `6aa4f59`; 142
   outside tests, `validate` and one structural pair, all 0 → 0).
5. `/pharn-dev-verify` → `verify-report.json` `.verdict` = **`PASS`** (`test` 5015/5015, `validate`, `lint`,
   `format:check`, `lint:md`, `structural:…`, `reconcile` CLEAN — all exit 0).
6. `/pharn-dev-review` → `REVIEW.md` (an independent Opus reviewer; 0 blocking, 0 important, 8 minor advisory
   findings — read the file, not restated here). `GRILL.md` is advisory.

**Where the run ended: GATE 2.**

**GATE 2 decision (the human, in chat): "fix all review findings, then open the PR".**

- All 8 advisory findings in `REVIEW.md` were fixed within the plan's `## Files`, each pinned by a new test. The changes:
  - admission by every timestamp (`isAdmitted`);
  - null instead of 0 for an unobserved wait union or overlap;
  - conflicting starts left unbound;
  - a begin/end `kind` mismatch counted as a conflict;
  - a read-side lstat walk (`stateDirState`);
  - observation arguments built inside their guard;
  - the overhead figure corrected to include module load (≈1.4 ms per process);
  - the telemetry-failure test widened to `--abort` stdout, with its wording narrowed.
- The same reviewer re-verified all 8 as fixed. It added one minor residual, stated in `stateDirState`'s doc and left
  as-is: an absolute `--markers-base`'s own ancestors are not link-checked.
- Re-run on the fixed tree: `npm run check` exit 0 (5023/5023 tests, reconcile CLEAN), `validate` GREEN,
  `check:changelog-entry` GREEN against freshly fetched `origin/main` (`6aa4f59`, unchanged).
- Mid-run another session switched this checkout from `feat/entry-gates-ledger-row` to `main` (the same commit, so the
  uncommitted work was intact). It was switched back before any further edit.

changelog-entry: exit 0

lesson: none — no finding showed a recurring mechanism beyond canon (finding 2 is an application slip of L58, finding 7
sits next to L62); none clears L20's second-occurrence bar.

deferred: none

Orchestration notes (advisory):

- A gitignored scratch file left by an earlier session (`.pharn/pr-body.md`, #320's PR body) was moved to this
  session's scratchpad so that local `lint:md` reflects tracked files only. It was not deleted.
- Two planned paths (`stage-work.mjs`, `check-cost-ledger.mjs`) and two test files were edited through Bash `node`
  scripts and heredocs rather than the Edit tool. All are declared in `## Files`, and `reconcile` is CLEAN.

_Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate._
