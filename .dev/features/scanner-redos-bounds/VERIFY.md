# VERIFY — scanner-redos-bounds

This is run 3, recorded in `verify-report.json`. It ran at HEAD `f776f9d8` (the build, the review fixes, and
`origin/main` merged in), with load averages of 80–216 on a shared machine.

| gate                                     | exit |
| ---------------------------------------- | ---- |
| `test` (`npm test`)                      | 1    |
| `validate`                               | 0    |
| `lint`                                   | 0    |
| `format:check`                           | 0    |
| `lint:md`                                | 0    |
| `structural:…expected-injection-comment` | 0    |
| `reconcile` (`--require-baseline`)       | 0    |

**VERIFY FAILS: gate(s) `test` red — stage FAILS** (`check-verify.mjs` verdict `FAIL`, exit 1).

## The one red test

`npm test` ran 5,591 tests: 5,589 passed and 1 failed. The failure was
`pharn/floor/stage-regress.test.mjs:2207`, "never recorded — a timed-out base gate …". This increment does not touch
that file or anything it loads. The failure is environmental:

- The test's report shows its own base-commit install timing out (exit 124). The verdict then becomes
  `verdict-inconclusive` where the test expects `evidence-unreliable`.
- The same test failed at the base commit `94ad252b` in this increment's regress run 3, so it is red without this
  change.
- Run alone at head, it passed at a load average of about 105 and failed at about 165.

Every earlier verify run failed `test` on one different wall-clock test from `stage-regress.test.mjs`,
`stage-verify.test.mjs`, `entry-gates.test.mjs` or `entry-base-evidence.test.mjs`:

- run 1 also failed `lint`, on a scratch probe script under `.pharn/`. It was moved out of the tree.
- run 2 failed `test` only.

This increment's own suites passed in every run: `sink-span-core.test.mjs` and the four scanner suites.

**The floor verdict is FAIL and is recorded as FAIL.** That the failure is load rather than code is this stage's
reading of the evidence above. It is advisory and does not flip the verdict. CI's `npm test` on the pull request is
the clean measurement.

## Verifiers (advisory)

No verifiers are registered (`count-verifiers.mjs` → `{"registered":0}`), so these are floor gates only.

_Verified = the named gates passed. This is NOT a guarantee of correctness beyond what those gates check, and here
one gate did not pass. Verifier concerns are advisory help, not assurance._
