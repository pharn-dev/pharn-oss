# VERIFY — test-infra-plan-scope

Final run on the branch at `20ef275`, rebased onto `origin/main` = `67b7b8b` (6.20.7, #270), with the two GATE-2
review fixes (`3b5e696`) in. The machine report, `verify-report.json`, carries `check-verify.mjs`'s stdout fields
verbatim (compared field-for-field after writing) plus the advisory `verifiers` block. An earlier run on `36e09c7`
(based on 6.20.6) also read PASS, every gate 0; this run supersedes it.

## Floor gates (exit codes)

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test` — 3261 tests: 3259 pass, 0 fail, 2 skipped; see below)                  | 0    |
| `validate` (`FLOOR: GREEN`)                                                                | 0    |
| `lint` (`npm run lint`)                                                                    | 0    |
| `format:check` (`npm run format:check`)                                                    | 0    |
| `lint:md` (`npm run lint:md`)                                                              | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`)                       | 0    |

## Verdict (FLOOR — `check-verify.mjs`, exit 0)

**VERIFIED: floor gates PASS** — `failing_gates: []`.

## The reconciliation epochs

- **Build epoch** (anchored by `/pharn-dev-build` at 13:14:32Z, before any build write): reconciled just before the
  first rebase: `CLEAN`, 14 paths reconciled, no escapes (`BUILD.md` exempt as a pipeline artifact). That covers every
  build write, including the four Bash edits (`sed -i` on `test-infra-core.mjs`, `check-ac-tests.test.mjs` and
  `README.md`, and `printf` to `SKILLS_VERSION`), all of them to in-scope paths.
- **Post-rebase epochs.** Each rebase brought main's merged files in. Those are not this build's writes, so the epoch
  was re-anchored after each rebase (`--anchor --by pharn-dev-build`, after the plan's scope setter). The
  post-first-rebase verify read `CLEAN`, 0 paths reconciled. This run's epoch (14:34:59Z, after the second rebase):
  `CLEAN`, 0 paths reconciled, the two regress artifacts exempt. There are two **warnings**: `VERIFY.md` and
  `verify-report.json` were "present at anchor, absent now". They are the previous verify's outputs, removed after
  the anchor to get a clean tree for regress, and rewritten here. They are this stage's own artifacts, not an escape.

## The two skipped tests (a skip exits 0, so the verdict cannot see it — L37)

`npm test` skipped exactly two tests. Both self-skip when the dev toolchain is absent from the worktree: this
worktree has no `node_modules` of its own, and CI runs `npm ci`.

- `.dev/floor/capability-catalog-core.test.mjs`: "style: a spliced README passes the repo's prettier and
  markdownlint unchanged".
- `.dev/floor/command-hygiene.test.mjs`: "premise: --no-globs lints EXACTLY the named files under this repo's
  config, and .claude/worktrees is ignored".

Supplementary run on this tree, outside the verdict map, with the main checkout's `node_modules` symlinked in
(gitignored, removed straight after): `node --test` over those two files ran 194 tests, 194 pass, 0 fail, **0
skipped**. Both tests pass.

## Advisory layer — verifiers

`node pharn/floor/count-verifiers.mjs .` → `{"registered":0,"verifiers":[]}`. **No verifiers registered — floor gates
only.**

## Orchestration deviations (ADVISORY, stated)

The pinned `cmd; t=$?` capture lines are refused in an isolated worktree. So the gates ran from
`.pharn/pharn-dev-verify/run.mjs`: spawnSync with argv arrays, the command's gates in its order with `reconcile`
last, each gate's output to a log by file descriptor, and exit codes only into `results.json`. The runner was lint-
and format-checked before it ran, because `eslint .` descends into `.pharn/`, and it was deleted afterwards. The
regress runner had been deleted first for the same reason.

verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance.
