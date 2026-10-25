# VERIFY — loop-cost-6-73-2

**Verdict: `PASS`** on the clean map (`pharn/floor/check-verify.mjs`, exit 0). On the raw working-tree map the same
helper read **`FAIL`**, with `failing_gates: ["lint:md"]` (exit 1). Both maps are below, with why the clean one is
the one recorded in `verify-report.json`.

## Gates

| gate                                                            |        raw (working tree) | clean copy |
| --------------------------------------------------------------- | ------------------------: | ---------: |
| `test` (`npm test`: 5,958 tests, 5,957 pass, 0 fail, 1 skipped) |                         0 |    0 (raw) |
| `validate`                                                      |                         0 |    0 (raw) |
| `lint`                                                          |                         0 |    0 (raw) |
| `format:check`                                                  |                         0 |    0 (raw) |
| `lint:md`                                                       |                     **1** |      **0** |
| `structural:…/expected-injection-comment.json`                  |                         0 |    0 (raw) |
| `reconcile` (`--require-baseline`)                              | 0 (`CLEAN`, 4 reconciled) |    0 (raw) |

Only `lint:md` was re-run in the clean copy; every other clean-map value is the raw one.

## Why `lint:md` is red in the working tree only

All 10 errors (MD022, MD032) are in `.pharn/batch-2026-10-19/followups-discovery.md`, a gitignored scratch file left by
an earlier batch session. It is not this increment's and is not tracked, so CI never sees it. markdownlint-cli2 still
reaches gitignored paths (L61). Following the recorded method for environment-only reds, `lint:md` was re-run in a
clean copy: the tree rsynced without `.git`, `.pharn`, `.claude/worktrees` and `node_modules` (the last one symlinked
back), plus `git init`. Result: exit 0, `Linting: 2030 files`, `0 issues`. The scratch file was left untouched.

**What this is and is not (P0).** The clean map is the verify helper's verdict over a map in which one gate was
measured on a different tree, the tracked files without gitignored scratch. That tree is what CI checks; the
substitution is a judgment, recorded here, not a floor operation. The raw `FAIL` is what the working tree read.

## Verifiers

`node pharn/floor/count-verifiers.mjs .` → `{"registered":0,"verifiers":[]}`. No advisory layer ran.
