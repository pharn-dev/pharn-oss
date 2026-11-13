# VERIFY — stage-wait-once

- measured: 2026-11-13, 13:24–13:50 CET, re-run after plan v3 (the `run-gates.mjs` init reap, the cleared-runner
  check), at the working tree (`7d5ffcd6` plus that round's uncommitted changes). Earlier runs (stamps `170cdb7a…`,
  `2588449f…`, `c0e06e88…`) measured earlier trees and are superseded
- runner: `pharn/floor/run-gates.mjs` (`init --stage verify`, then `run --next` per gate, each in a background call)
- verdict: `check-verify.mjs --stamp pharn/.run/pharn-dev-verify/gates/stamp.json --feature stage-wait-once`, exit 0
- stamp sha256: `787e2e2c09075ed0b9f5a92959ea24d646100225333c7eeda7ad96776bdacd77`; fingerprint
  `worktree-fingerprint/3+sha256` `223e6f6d…67c9e3`

## Floor gates

| gate                 | exit | note                                                         |
| -------------------- | ---- | ------------------------------------------------------------ |
| `test`               | 0    | `npm test`, 702.4 s, 6813 pass / 0 fail                      |
| `validate`           | 0    | `node pharn/floor/validate.mjs .`                            |
| `lint`               | 0    | `npm run lint`                                               |
| `format:check`       | 0    | `npm run format:check`                                       |
| `lint:md`            | 0    | `npm run lint:md`                                            |
| `instruction-growth` | 0    | added by the runner                                          |
| `reconcile`          | 0    | added last by the runner, `--require-baseline` (build epoch) |

No eval pair ships with this feature, so there is no `eval:*` gate. Build completeness (`stamp.aux`): every concrete
`## Files` path present (the verdict is not INCOMPLETE).

**VERIFIED: floor gates PASS.**

## Verifiers (advisory)

No verifiers registered — floor gates only (`count-verifiers.mjs`: `{"registered":0,"verifiers":[]}`).

Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance. The stamp certifies internal consistency, never provenance (as
`check-verify.mjs` prints).
