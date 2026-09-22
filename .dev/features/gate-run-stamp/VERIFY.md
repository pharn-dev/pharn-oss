# VERIFY — gate-run-stamp

## FLOOR layer — the deterministic gates (these OWN the verdict)

| gate                                                    | exit |
| ------------------------------------------------------- | ---- |
| `test` (`npm test`, 2424 assertions)                    | 0    |
| `validate` (`pharn/floor/validate.mjs .`)               | 0    |
| `lint` (eslint)                                         | 0    |
| `format:check` (prettier)                               | 0    |
| `lint:md` (markdownlint)                                | 0    |
| `structural:…/expected-injection-comment.json`          | 0    |
| `reconcile` (`check-bash-reconcile --require-baseline`) | 0    |

**VERIFIED: floor gates PASS.** `pharn/floor/check-verify.mjs` exit **0**, verdict `PASS`,
`failing_gates: []`.

`reconcile` is green: **23 changed paths reconciled, 0 escapes** against the epoch
`/pharn-dev-build` anchored at Step 0. The 24th declared path and this stage's own artifacts are covered by
the pipeline-artifact exemption, which is reported rather than silently applied.

## ADVISORY layer — verifiers

`node pharn/floor/count-verifiers.mjs .` → `{"registered":0,"verifiers":[]}`.
**No verifiers registered — floor gates only.** Step 2 is a no-op and the verdict is the floor gates
alone. No verifier free-text exists, so nothing untrusted reached this report.

## Dogfood — the shipped runner, end to end, on this repository

Beyond the stage's own gates, the **product** path this increment adds was exercised against the real
repo, through the exact lines `pharn-verify.md` now pins. This is the L45 property demonstrated rather
than asserted: a fix that production never invokes reaches nothing.

```text
run-gates.mjs init  --stage verify --feature gate-run-stamp --out .pharn/pharn-verify/gates
                    --discover package.json --base .dev/features
  → ids: [test, lint, format:check, lint:md, reconcile]     (reconcile injected LAST, by the runner)
run-gates.mjs run --next  × 5  → each exit 0, remaining 4→0, finalized on the last call
check-verify.mjs --stamp .pharn/pharn-verify/gates/stamp.json --feature gate-run-stamp
  → verdict PASS, gate_run.source "discover", fingerprint chain intact, reconcile last, 0 mutated gates
```

**The dogfood found a real defect, which is why it was worth running.** On the first pass the checker
returned `INCONCLUSIVE` with the reason `build-completeness inconclusive (--complete undefined)`. Two
things were going on and only one was a bug:

- **Not a bug, and it fails in the right direction.** `aux.completeness` was `2` because a **product**
  runner was pointed at a **dev** feature, so `check-build-complete.mjs` looked under `pharn/features/`
  for a plan that lives under `.dev/features/`. An unreadable plan yielding `2` → `INCONCLUSIVE` is
  fail-closed and correct; re-run with `--base .dev/features` and completeness is `0`.
- **A real defect, now fixed.** The reason **misattributed its own source**: it named `--complete`, a
  flag the caller never passed, for a value that came from the stamp. That sends a reader to the wrong
  input at exactly the moment they are debugging a fail-closed stop. `check-verify.mjs` now records
  where the value came from and the message reads `stamp.aux.completeness 2 (<path>)`; the flag-less path
  still attributes to `--complete`, because there the flag really is the source. A test pins both
  directions, including that the message no longer contains `--complete undefined`. The gates were
  re-run after the fix — the table above is the post-fix run.

This is the increment's own thesis turned on itself: the floor verdict was right both times; the prose
**describing** it was not.

## Honest residual (P0/P7)

**verified = the named gates passed.** This is **not** a guarantee of correctness beyond what those gates
check — a defect no test, eval, rule or lint covers is invisible here, and the verifier layer that might
notice it does not exist yet and would be advisory if it did. Specifically **not** established by this
stage: that the stamp's `fingerprint.final` matches the tree at the moment any verdict is read
(freshness is a later increment), that a stage ran its runner at all, and that any stamp is **genuine** —
a self-consistent fabricated stamp passes, and a test builds one to prove it (**L43**).

The gate **set** is advisory orchestration: `check-verify.mjs` is generic over keys, so nothing floor-
locks `format:check` and `lint:md` into the map. Which gates are in it remains this command's
composition — stated because "verify runs the style gates" must not be read as floor-locked.
