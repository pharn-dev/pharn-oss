# VERIFY — loop-quick-mode

- stage model: verify — opus — set by the maintainer's instruction, overriding pharn.config.json; routed via Agent
  subagent; effort not routed.
- feature: `loop-quick-mode` (`/pharn-loop --quick`, 6.27.0), verified at HEAD `c9d279c` — the merge of `origin/main`
  at 6.26.0 (`008b24b`, #281, `stage-verify-script`) into the build. This run replaces the one on the pre-merge build.
- the machine report: `verify-report.json` — `check-verify.mjs`'s fields verbatim, plus the advisory `verifiers` block.
  Re-derived from this run, it is byte-identical to the committed file (same seven gates, all `0`), so it was not
  rewritten.

## FLOOR layer — the gates (exit codes)

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test` — 3,878 tests, 3,878 pass)                                              | 0    |
| `validate` (`node pharn/floor/validate.mjs .` — GREEN, 36 capabilities)                    | 0    |
| `lint` (`npm run lint`)                                                                    | 0    |
| `format:check` (`npm run format:check`, whole-repo)                                        | 0    |
| `lint:md` (`npm run lint:md`, whole-repo)                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`) — run last            | 0    |

`reconcile`: `CLEAN` over the epoch re-anchored after the merge commit (`--by loop-quick-mode-merge-main`,
2026-09-26T22:54:19Z, with the scope re-set from `PLAN.md` first), **no escapes**; 0 paths reconciled — the only
paths changed since that anchor are the two exempted pipeline artifacts, `REGRESSION.md` and `regression-report.json`,
written by the re-run `/pharn-dev-regress`. The eval pair is the repo's one committed pair; this feature ships no eval
pair of its own (it adds no `role:` capability).

**Harness note:** the command's pinned block captures exit codes with `$?` and assembles them with `printf`, forms this
isolated worktree refuses, so a scratch Node runner under `.pharn/pharn-dev-verify/` ran the same seven gates with argv
arrays and recorded each exit code (never the output) into the same `{gate-id: exit}` map — `reconcile` last. It ran
in two Bash calls (`test` and `validate`, then the other five and the verdict) only to stay inside one call's time
limit.

## Verdict (`check-verify.mjs .pharn/pharn-dev-verify/results.json --feature loop-quick-mode`, exit 0)

**VERIFIED: floor gates PASS** — `failing_gates: []`.

## ADVISORY layer — verifiers

`node pharn/floor/count-verifiers.mjs .` → `{"registered":0,"verifiers":[]}`: no verifiers registered — floor gates
only.

_Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._
