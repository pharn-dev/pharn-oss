# VERIFY — writes-scope-run-only

## Gate → exit code

| gate                                                                                         | exit |
| -------------------------------------------------------------------------------------------- | ---- |
| `test` (`npm test` — the full hermetic suite, 3419 tests)                                    | 1    |
| `validate` (`pharn/floor/validate.mjs .`)                                                    | 0    |
| `lint` (`npm run lint` — eslint)                                                             | 0    |
| `format:check` (`npm run format:check` — prettier, whole-repo)                               | 0    |
| `lint:md` (`npm run lint:md` — markdownlint, whole-repo)                                     | 0    |
| `structural:…/expected-injection-comment.json` (the trust-fence committed eval pair)         | 0    |
| `reconcile` (`check-bash-reconcile.mjs --require-baseline` — the fix #7 Bash-write detector) | 0    |

## VERIFY FAILS: gate `test` red — stage FAILS

`check-verify.mjs` exited **1**, `"verdict": "FAIL"`, `"failing_gates": ["test"]`. **This is the STOP the
plan designs for, not a defect.** `.dev/features/writes-scope-run-only/PLAN.md`'s Chain-sequencing section states
it explicitly: verify is _expected_ to FAIL on `test`, because the new/changed hook and product-floor test
files assert the **patched** write-guard's behaviour against `.claude/hooks/enforce-writes-scope.cjs` and
`.claude/hooks/set-writes-scope.cjs`, which — being two of the four human-only files — are still their
**pre-patch** bytes in this worktree. The patch itself is staged at
`.dev/features/writes-scope-run-only/proposed/` for a human to apply; `BUILD.md` records that the SAME 22
tests were run to completion against the **patched** hooks (via the `handoff/` copies, before they were
deleted) and were **all green** there — 118/120, 25/29, 52/53 and 45/46 respectively, with every one of
the "missing" ones being exactly the pre-patch/post-patch difference, never a defect in the test itself.

**Confirmed: the failures are EXACTLY those expected tests, and nothing else.** `npm test`'s summary is
`tests 3419, pass 3397, fail 22`, and the 22 are distributed exactly as:

| file                                          | failing | total in file |
| --------------------------------------------- | ------- | ------------- |
| `.claude/hooks/enforce-writes-scope.test.cjs` | 16      | 120           |
| `.claude/hooks/set-writes-scope.test.cjs`     | 1       | 46            |
| `pharn/floor/check-bash-reconcile.test.mjs`   | 1       | 53            |
| `pharn/floor/run-marker.test.mjs`             | 4       | 29            |

No other file in the ~3400-test suite has a single failure. Every one of the 22 is a test that spawns the
**real, shipped** hook path (`.claude/hooks/enforce-writes-scope.cjs`) or asserts the new `--clear`
message wording (`set-writes-scope.cjs`), and asserts the **new** (6.23.0) three-posture / run-marker
behaviour this increment adds — behaviour that exists today only in `proposed/human-only.patch`, not yet
in the shipped file. None of the 22 are pre-existing tests that regressed; all 22 are tests THIS build
added or extended for the new behaviour (see `BUILD.md`'s "The probe of every quantified sentence" and
`REGRESSION.md`'s confirmation that all 98 **outside** the feature's declared scope stayed green,
base and head alike).

**Every other gate is GREEN**, including `reconcile` (`CLEAN`, 32 paths reconciled, 3 exempted pipeline
artifacts, 0 escapes) — the build's own writes-scope discipline held throughout, and no Bash write reached
a path the live guards would have denied.

## Verifiers

No verifiers registered — floor gates only. `node pharn/floor/count-verifiers.mjs .` → `{"registered":0,"verifiers":[]}`.

## The honest residual

Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check —
verifier concerns are advisory help, not assurance. Here it narrows further, honestly: `test` did **not**
pass, by design, because the human-only half of this increment has not yet been applied. The floor
verdict — `FAIL` — is the correct, deterministic reading of the tree exactly as it stands right now. It
becomes `PASS` the moment `proposed/apply.sh` lands the patch and this stage is re-run in this same
worktree (`/pharn-dev-verify` again, not `/pharn-dev-regress` — L17: a committed hook change would
misread as a scope escape there).
