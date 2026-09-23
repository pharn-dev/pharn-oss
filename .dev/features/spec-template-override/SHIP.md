# SHIP — spec-template-override

Roll-up of one `/pharn-dev-ship` run (advisory). The run ended at **GATE 2, after one fix round**. The standing
decision is the human's.

## Stages, in order

| stage                                 | result read                                                                                                                                                 |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/pharn-dev-plan`                     | `PLAN.md`; GATE 1 answered by the human: approved as written, decisions (a) path, (b) layout, (c) not now, the patch-and-apply hook step, duplicate refusal |
| `/pharn-dev-grill`                    | `check-plan-lessons.mjs` exit **0** (17 cited ids); 20 advisory concerns (0 blocking-severity), all folded into `PLAN.md` before build                      |
| `/pharn-dev-build`                    | `validate.mjs` exit **0** (36 capabilities); stopped by design for the human-applied hook patch                                                             |
| _human apply_                         | `sh …/proposed/apply.sh`: reconcile checkpoint CLEAN, patch applied, sha256 OK, 547/547 tests on the applied bytes, commit `ba46b7b` (hook only)            |
| `/pharn-dev-regress` (iteration 1, 2) | `regression-report.json` `.verdict` = **`no-regressions`** both times                                                                                       |
| `/pharn-dev-verify` (iteration 1, 2)  | `verify-report.json` `.verdict` = **`PASS`** both times                                                                                                     |
| `/pharn-dev-review` (iteration 1)     | 1 floor-gate finding (F1: a symlinked `pharn/` silently skipped the project template) + 8 advisory                                                          |
| GATE 2 → fix round                    | the human chose "Fix F1 in code": new `symlinked-root` refusal + advisory fixes; regress/verify re-run (above)                                              |
| `/pharn-dev-review` (iteration 2)     | **0 floor-gate findings**; F1 resolved and re-probed; open advisory items listed in `REVIEW.md`                                                             |

- **Verdicts, verbatim:** `validate` exit `0`; `.verdict` `no-regressions`; `.verdict` `PASS`.
- **How they were captured — read this before trusting them.** Three other Claude sessions keep worktrees under
  `.claude/worktrees/`, which is git-excluded locally, so CI never has it. Whole-repo gates run in the working tree
  descend into them. So regress and verify measured in equivalent environments: a byte-copy of the working tree
  without `.claude/worktrees/`, and a base worktree with `node_modules` linked. Reconcile ran in the real working
  tree. The raw working-tree captures (regress `tests` 0→1; verify FAIL on `format:check`, `lint:md` and `test`) are
  kept in `REGRESSION.md` / `VERIFY.md`, with every failure attributed to a path under `.claude/worktrees/`. That
  choice of environment is orchestration and ADVISORY.
- **Final tree:** clean-copy `npm run check` exit 0 (2918/2918 tests, 0 skipped); `check-bash-reconcile` `CLEAN`
  (10 paths, no escapes).
- **Coverage** (`node --test --experimental-test-coverage pharn/floor/check-spec.test.mjs`): `spec-template-core.mjs`
  100% lines; `check-spec.mjs` 90.54% lines, a lower bound. The project-template tests run COPIES of the checker in
  scratch installs, so their lines are credited to the copies. Two race-only branches are untested by design.
- **markdown-it probe (L56):** it agrees with the validator. The default renders 9 h2 headings, 1 visible example item
  and 1 Out-of-scope label, and both hidden-heading mutants lose the Acceptance Criteria heading.

## Pointers

- `REVIEW.md` — findings and the lesson candidate (not restated here).
- `GRILL.md` — advisory.
- `PLAN.md` — the "Correcting the record" list, grill and review dispositions, follow-ups.

changelog-entry: exit 0

lesson: promoted L57

deferred: none

**Merge note (after GATE 2, when merging into `main`).** The follow-up "Scope markdownlint --fix to named files
only" merged first as pull request 254 (6.13.1). It promoted its own L57 for the same incident, with the remedy applied. This
branch's L57 duplicated it, so the merge keeps `main`'s entry and drops this branch's. The canon L57 is therefore
the text from pull request 254, and it describes the same lesson the human accepted here. `docs/lessons-index.md` follows `main`.
This increment's `SKILLS_VERSION` stays 6.14.0 and its CHANGELOG section now sits above `[6.13.1]`.

## Incident, recorded

The build's pinned `markdownlint-cli2 --fix` line rewrote 124 files in another session's worktree: 2 tracked
fixtures and 122 `node_modules` docs. The config's `globs` widened it. All 124 were restored: the fixtures'
trailing blank line was re-added and the docs were copied from identical package versions, leaving that worktree
clean against its HEAD. Every later markdownlint run in this session used `--no-globs`. That incident is L57, and
the follow-up "Scope markdownlint --fix to named files only" is running as a separate session.

## Follow-ups (not built here)

- `template-cli-split` (P3)
- `protect-spec-template-subtree` (the hook allows `pharn.spec-template.md/x`; `foldName`/`toKey` are not pinned)
- `loop-s9-before-feature-dir` (a `/pharn-loop` stuck-point row for the template refusal)
- `protect-shipped-spec-template`
- `template-required-sections` (decision c)
- the three human-only trusted-doc suggestions in `PLAN.md` (`LIMITS.md` §1d, `THREAT-MODEL.md` §2,
  `pharn/ARCHITECTURE.md` §4)

Nothing is committed beyond the human-applied hook commit `ba46b7b`; the rest of the increment is in the working
tree on branch `feat/spec-template-override`.

_Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise;
that is the human's call at the post-review gate._
