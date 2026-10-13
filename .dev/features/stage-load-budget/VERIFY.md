# VERIFY — stage-load-budget

## Fix pass (GATE 2) — the current `verify-report.json`

Run at HEAD `06ad659`: the fix-pass commit `2131b31` plus `origin/main` `f37eabe` (SKILLS_VERSION 6.59.0, #345) merged
in. The machine's load average was 110–150 throughout, from other sessions' test suites.

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`: 5336 tests, 5334 pass, **1 fail**, 1 skipped)                          | 1    |
| `validate` (`node pharn/floor/validate.mjs .`)                                             | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`)                       | 0    |

**VERIFY FAILS: gate(s) `test` red — stage FAILS** (`check-verify.mjs`, exit 1, `failing_gates: ["test"]`).

The failing test is `pharn/floor/stage-regress.test.mjs:2207`, "never recorded — a timed-out base gate". Its fixture
expects only the BASE gate to time out. Under this load the HEAD gate timed out too, so the run reported
`verdict-inconclusive` rather than `evidence-unreliable`. Re-run alone right after, it passed. So did the other
timing-dependent tests that failed in the three earlier fix-pass runs:

- `stage-regress.test.mjs` "crash — a kill during drain-base…" and "★ P2-C (f2)";
- `entry-gates.test.mjs` "OBSERVED: TAKEOVER…", 41/41 when re-run alone.

| run | HEAD    | test gate                                                                        |
| --- | ------- | -------------------------------------------------------------------------------- |
| 1   | 2131b31 | 1 fail (`stage-regress` kill timing; its test ran 5.8 h across a machine sleep)  |
| 2   | 2131b31 | killed (runner exit 143, cause unknown); `stage-regress` fixture gates timed out |
| 3   | 06ad659 | `entry-gates` takeover counts                                                    |
| 4   | 06ad659 | `stage-regress` "never recorded — a timed-out base gate" — **this report**       |

None of the failing files is in this increment, which changes no file under `pharn/floor/`. The one test the increment
adds that spawns processes, W3, passed every run. This is attribution, and it is advisory. The floor verdict is
`FAIL` and stays `FAIL`; it is not re-decided here.

`reconcile` reported `CLEAN`: 39 paths reconciled, no escapes. The two regress artifacts are `exempted`. Thirty-four
paths are `merged`: the 6.59.0 merge's files (four commands, the `unmeasured-gates-inconclusive` feature folder, the
`pharn/floor` checkers and tests, `README.md`, `SKILLS_VERSION`). Their bytes are exactly the upstream bytes.

Verifiers: no verifiers registered — floor gates only (`count-verifiers.mjs`: `{"registered":0}`).

## First pass

At HEAD `e401ac0`, `b5760be` with `origin/main` `791d205` (6.58.1) merged in: all 7 gates 0 (`npm test` 5321 tests,
0 fail), **PASS**. `reconcile` `CLEAN`, with five 6.58.1 paths `merged`.

Orchestration note (advisory): the pinned Step 1 block uses `$?` captures this isolated worktree's shell refuses, so the
same gate commands ran through a node runner (`.pharn/pharn-dev-verify/run.mjs`, gitignored) with argv arrays, and the
map went to `check-verify.mjs` unchanged.

verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance.
