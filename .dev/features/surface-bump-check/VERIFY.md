# VERIFY — surface-bump-check

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---: |
| `test` (`npm test`, 5673 tests: 5663 pass, 4 fail)                                         |    1 |
| `validate`                                                                                 |    0 |
| `lint`                                                                                     |    0 |
| `format:check`                                                                             |    0 |
| `lint:md`                                                                                  |    0 |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` |    0 |
| `reconcile` (`--require-baseline`: `CLEAN`, 8 reconciled, 0 escapes)                       |    0 |

**VERIFY FAILS: gate(s) `test` red — stage FAILS** (`check-verify.mjs` exit 1, `"verdict": "FAIL"`). The verdict is
recorded as computed; nothing below changes it.

## What the red `test` gate is (investigated; advisory context, not a verdict)

The four failing tests, from the kept `npm test` log, all sit in two product-floor files this increment does not
touch, and every one of them measures wall-clock time or a timeout:

- `pharn/floor/entry-base-evidence.test.mjs`: "★ equivalent environment — fresh BASE (no offer) and entry BASE …"
  (55.5 s, a `TypeError` reading `source` of a null record) and "environment divergence — an ignored local input …"
  (67.3 s);
- `pharn/floor/stage-verify.test.mjs`: "never recorded — a timed-out base gate …" (21.4 s) and "★ budget clock — the
  opening work counts: a slow first `git ls-files` exhausts a 2 s window …" (38.2 s).

Re-run of exactly those two files right after, alone: **61 tests, 61 pass, 0 fail** (exit 0). During the full run
about 15 other `node --test` processes from parallel batch agents were live on this machine; the regress stage's base
and head runs showed the same shape (6 and 3 failures on byte-identical outside files). All 22 of this increment's own
tests passed inside the full run (including the executed CI block and its negative control). The reading is
load-induced timing flakiness outside the increment. That reading is model judgment; the floor verdict stays FAIL, and
the full suite on a clean CI runner, plus the `npm run check` this batch requires after merging `origin/main`, are the
re-measurements.

## Verifiers

no verifiers registered — floor gates only (`count-verifiers.mjs`: `{"registered":0,"verifiers":[]}`).

verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance. Here one named gate did not pass.
