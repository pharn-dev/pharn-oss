# VERIFY — loop-quick-mode

- stage model: verify — opus — set by the maintainer's instruction, overriding pharn.config.json; routed via Agent
  subagent; effort not routed.
- feature: `loop-quick-mode` (`/pharn-loop --quick`, 6.28.0), verified at HEAD `b88aebd`: the merge of `origin/main`
  (`c85be1b`, #283, 2.2 at 6.27.0) over the maintainer's `LIMITS.md` apply (`1cbb6c4`). This is the one run after the
  apply that `APPLY.md` orders, and it replaces the one recorded at the GATE-2 FIX round.
- the machine report: `verify-report.json` — `check-verify.mjs`'s fields verbatim, plus the advisory `verifiers` block.
  Re-derived from this run, it is byte-identical to the committed file (the same seven gates, all `0`), so it was not
  rewritten.

## FLOOR layer — the gates (exit codes)

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test` — 4,007 tests, 4,007 pass)                                              | 0    |
| `validate` (`node pharn/floor/validate.mjs .` — GREEN, 36 capabilities)                    | 0    |
| `lint` (`npm run lint`)                                                                    | 0    |
| `format:check` (`npm run format:check`, whole-repo)                                        | 0    |
| `lint:md` (`npm run lint:md`, whole-repo)                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`) — run last            | 0    |

`reconcile`: `CLEAN` over the epoch anchored after the merge commit (`--by loop-quick-mode-after-apply`,
2026-09-27T07:39:39Z, after the setter re-read `PLAN.md`), **no escapes**; 0 paths reconciled — since the anchor only
`/pharn-dev-regress`'s two artifacts changed, and both are exempt pipeline artifacts. The eval pair is the repo's one
committed pair; this feature ships no eval pair of its own (it adds no `role:` capability).

**Harness note:** the command's pinned block assembles the exit codes with `printf`; here each gate ran as its own
Bash call with its exit code echoed (never its output), and the `{gate-id: exit}` map was written with the Write tool
into `.pharn/pharn-dev-verify/results.json` — `reconcile` last.

## Verdict (`check-verify.mjs .pharn/pharn-dev-verify/results.json --feature loop-quick-mode`, exit 0)

**VERIFIED: floor gates PASS** — `failing_gates: []`.

## ADVISORY layer — verifiers

`node pharn/floor/count-verifiers.mjs .` → `{"registered":0,"verifiers":[]}`: no verifiers registered — floor gates
only.

_Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._
