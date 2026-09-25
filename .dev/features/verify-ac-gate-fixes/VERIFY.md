# VERIFY — verify-ac-gate-fixes

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test` — hook, product-floor and dev-floor suites)                             | 0    |
| `validate` (`node pharn/floor/validate.mjs .`)                                             | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --require-baseline`, run last)                      | 0    |

**VERIFIED: floor gates PASS** — `pharn/floor/check-verify.mjs` exit 0, `failing_gates: []`. The machine report is
`verify-report.json` (the helper's stdout, plus the advisory `verifiers` block).

- **`reconcile`:** `CLEAN` over the build's epoch (anchored by `pharn-dev-build`, 15 reconciled paths, `escapes: []`;
  `REGRESSION.md` and `regression-report.json` exempted by name as pipeline artifacts). The build's Bash writes —
  `SKILLS_VERSION`, the README badge, and the two mutation checks that temporarily swapped `check-verify.mjs` and
  `check-loop.mjs` and restored them — all landed on paths the build's scope named. `CLEAN` means no escape was
  detected, never that none occurred (`pharn/pharn-contracts/reconciliation-record.md`).
- **GATE-1 condition 2, stated as required: flag-less `check-verify.mjs` output is byte-identical.** The flag-less
  and `--stamp` tests in `pharn/floor/check-verify.test.mjs` are unchanged and green (25/25, among them `★ EQUIVALENCE
— a stamp yields the IDENTICAL verdict to the flag-less run, over EVERY fixture map` and `★ backward-compat: ABSENT
--complete can NEVER yield INCOMPLETE`), and this stage's own `check-verify` run above is a flag-less one. The emit
  still prints `JSON.stringify(obj, null, 2)` once; only how the process ends changed.
- **GATE-1 conditions 1 and 3** are covered by tests inside `test`: `cli-stdout-flush.test.mjs` ("a crash stays a
  crash", a `--import` preload making `console.log` throw in each of the four CLIs → exit 1, the stack on stderr, no
  stdout) and the `PRECEDENCE` table in `ac-gate-core.test.mjs` (the `*/1/red` cells: a red real gate over an
  incomplete build under `--ac-gate` is FAIL). Both new test groups were mutation-checked during the build: against
  6.20.3's `check-verify.mjs` the precedence, bootstrap-repro and >64 KiB tests all failed; with the sentinel catch
  replaced by a swallow-all, the crash test failed (`exit 0 — the crash was swallowed`).
- **Platform note (grill finding 1):** this run is darwin, where the pipe round-trips discriminate. The new tests'
  measured negative controls reported the old pattern delivering 65,536 of 126,083 and 65,536 of 360,135 bytes. On
  CI's Linux the static pin is the guard that discriminates.

## Verifiers (advisory)

No verifiers registered — floor gates only (`count-verifiers.mjs` → `{"registered":0,"verifiers":[]}`).

## Orchestration deviation (advisory, recorded)

The pinned `$?` capture and `printf` assembly are refused in a worktree-isolated session, so Step 1 ran through
`.pharn/pharn-dev-verify/run-verify.mjs` (scratch, never committed): each gate through `spawnSync` with an argv array,
the map written from the recorded statuses (a non-integer status — a timeout — would have aborted rather than be
recorded), `reconcile` last, and `check-verify.mjs`'s stdout kept verbatim.

_verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._
