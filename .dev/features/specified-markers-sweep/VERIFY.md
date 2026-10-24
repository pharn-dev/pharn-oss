# VERIFY — specified-markers-sweep

Verdict source: `pharn/floor/check-verify.mjs .pharn/pharn-dev-verify/results.json --feature specified-markers-sweep`
(exit 0), copied into `verify-report.json` with the advisory `verifiers` block appended.

## FLOOR layer — the deterministic gates (own the verdict)

| gate           | exit | what ran                                                                    |
| -------------- | ---: | --------------------------------------------------------------------------- |
| `test`         |    0 | `npm test` (the whole suite, including the 95 checker tests)                |
| `validate`     |    0 | `node pharn/floor/validate.mjs .`                                           |
| `lint`         |    0 | `npm run lint`                                                              |
| `format:check` |    0 | `npm run format:check`                                                      |
| `lint:md`      |    0 | `npm run lint:md`                                                           |
| `reconcile`    |    0 | `check-bash-reconcile.mjs --base . --require-baseline` → `CLEAN`, 0 escapes |

No `structural:*` gate: the increment ships no eval pair (it is a `.dev/floor/` checker with `node --test` tests).
The gate runs were spawned from a scratch node runner (`.pharn/specified-markers-sweep/verify.mjs`) with the same
commands and exit-code capture, because the isolated worktree refuses the pinned shell form.

## ADVISORY layer — verifiers

`node pharn/floor/count-verifiers.mjs .` → `{"registered":0,"verifiers":[]}` — no verifiers registered, floor gates only.

## Verdict

**PASS** — every named gate exited 0. This means the named deterministic gates passed, nothing more: it is not a
judgment that the sweep's scope or exemptions are right (that is `/pharn-dev-review`'s advisory work).
