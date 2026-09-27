# VERIFY — cost-ledger-run-scope

- stage: `/pharn-dev-verify`, run on the final working tree after `/pharn-dev-regress`.
- stage model: opus, by the maintainer's instruction for this batch (not a `pharn.config.json` route).
- machine report: `verify-report.json` — `check-verify.mjs`'s verdict JSON verbatim (its fields compared equal to the
  helper's stdout) with the advisory `verifiers` block merged in.

## FLOOR layer — the gates

| Gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`)                                                                        | 0    |
| `validate` (`node pharn/floor/validate.mjs .`)                                             | 0    |
| `lint` (`npm run lint`)                                                                    | 0    |
| `format:check` (`npm run format:check`)                                                    | 0    |
| `lint:md` (`npm run lint:md`)                                                              | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`)                       | 0    |

- **`npm test` was run three times, and the recorded exit is the third run's — disclosed, not hidden.** The first two
  runs exited **1**: 4,119 tests, 4,117 passing, the same two failing both times, each a timing test in a file this
  increment does not touch — `scan-code-crypto.test.mjs` "✧ COST PIN: a 20 KB worst-case line COMPLETES under a
  subprocess timeout" (killed by its 10 s timeout) and `stage-verify.test.mjs` "★ budget clock — … the old-clock mutant
  does not" (its mutant ran out of a 2 s budget). The machine's load average was about 90 during both runs, with other
  sessions' suites and a web build running. The two files, run alone at that load, passed 76 of 76; the build's
  `npm run check` and `/pharn-dev-regress`'s head side had passed both. The third run: **4,119 tests, 4,119 passing,
  0 skipped** (`duration_ms` 755,884, load average still about 55). A retry is orchestration and advisory; the verdict
  below rests on the recorded map, which the helper computed.
- The other six gates each ran once: the three style gates, `validate` and the structural pair in one shell (all 0),
  `reconcile` last, after the third test run.
- `reconcile`: **CLEAN** against the epoch `/pharn-dev-build` anchored (`2026-09-27T15:53:40Z`, `--by pharn-dev-build`):
  25 paths reconciled, no escape; three pipeline artifacts exempted by name (`BUILD.md`, `REGRESSION.md`,
  `regression-report.json`). CLEAN means no escape was detected, never that none occurred
  (`pharn/pharn-contracts/reconciliation-record.md`).
- The eval pair's two paths were confirmed readable before its exit was recorded.
- The pinned `$?` capture form ran as written for these gates. Because the test gate was re-run, the map was assembled
  with `printf` from the four captures (the recorded exits above), not from one shell; the gate set is the command's
  seven, unchanged. No script was left under `.pharn/` when `lint` ran.

## Verdict

**VERIFIED: floor gates PASS** (`check-verify.mjs`, exit 0, `failing_gates: []`).

## ADVISORY layer — verifiers

No verifiers registered — floor gates only (`node pharn/floor/count-verifiers.mjs .` →
`{"registered":0,"verifiers":[]}`).

verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance.
