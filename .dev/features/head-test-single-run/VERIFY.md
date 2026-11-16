# VERIFY — head-test-single-run (CORE-89)

Tree: `232af72b` (the build plus the review fix round), working tree with this feature's uncommitted pipeline artifacts.
Gates run through `pharn/floor/run-gates.mjs` (stamp `e94ac751…`), verdict by `pharn/floor/check-verify.mjs --stamp`.

## Verdict (FLOOR)

**PASS** — every gate exit 0.

| gate                 | exit | note                                                                          |
| -------------------- | ---- | ----------------------------------------------------------------------------- |
| `test`               | 0    | `npm test`: 6903 tests, 6902 pass, 0 fail, 1 skipped (669 s on a loaded host) |
| `validate`           | 0    | 37 capabilities, GREEN                                                        |
| `lint`               | 0    |                                                                               |
| `format:check`       | 0    |                                                                               |
| `lint:md`            | 0    |                                                                               |
| `instruction-growth` | 0    |                                                                               |
| `reconcile`          | 0    | `CLEAN`: 25 paths reconciled, 0 escapes (pipeline artifacts exempted)         |

`failing_gates: []`. No eval pair ships with this feature, so there is no `eval:*` gate.

## Advisory layer

Verifiers: 0 registered, 0 findings (none authored, P7).

## What this does and does not say (P0)

The verdict is an exit-code threshold over the deterministic suite at this tree — exactly as good as that suite, never
more. It does not judge that the increment is good or wise. `pharn/LIMITS.md` §9's new bullet (the lost second sample)
was applied by a human and committed (`8c523e43`) before the build's anchor, so `reconcile` did not see it as an escape
(L68).
