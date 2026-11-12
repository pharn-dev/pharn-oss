# VERIFY — gate-durations

Verdict source: `pharn/floor/check-verify.mjs --stamp pharn/.run/pharn-dev-verify/gates/stamp.json --feature
gate-durations` (exit 0), with the advisory `verifiers` block merged into `verify-report.json`. This is iteration 2:
the gates re-ran on the tree after the review's CHANGELOG fix. Iteration 1 was PASS too, with the same exits.

## Floor gates (iteration 2)

| gate                 | exit | duration_ms (observation) | iteration 1 duration_ms |
| -------------------- | ---: | ------------------------: | ----------------------: |
| `test`               |    0 |                 1,131,341 |                 963,016 |
| `validate`           |    0 |                       140 |                     374 |
| `lint`               |    0 |                     5,271 |                  18,889 |
| `format:check`       |    0 |                    34,736 |                 104,576 |
| `lint:md`            |    0 |                    13,528 |                  20,269 |
| `instruction-growth` |    0 |                       228 |                     278 |
| `reconcile`          |    0 |                       876 |                   1,166 |

The durations come from this increment's own runner (`duration_ms` on each stamp run): the first per-gate record this
repo's own verify has produced. They are observations, and the verdict does not read them. The two columns differ by
up to 3x for the same gate on the same tree, which is the machine load the contracts warn about. Build completeness
(`aux.completeness`) was captured at `init` and is part of the verdict.

**VERIFIED: floor gates PASS.**

## Verifiers

No verifiers registered — floor gates only (`count-verifiers.mjs` → `{"registered":0,"verifiers":[]}`).

verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance.
