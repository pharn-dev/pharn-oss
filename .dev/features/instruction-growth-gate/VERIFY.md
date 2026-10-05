# VERIFY — instruction-growth-gate

**FLOOR verdict: PASS** (`check-verify.mjs`, exit 0). Every gate in the map exited 0.

| gate           | exit | note                                                                         |
| -------------- | ---: | ---------------------------------------------------------------------------- |
| `test`         |    0 | `npm test`: 4549 tests, 4549 pass, 0 fail                                    |
| `validate`     |    0 | `FLOOR: GREEN — 36 capabilities checked`                                     |
| `lint`         |    0 | eslint, whole repo                                                           |
| `format:check` |    0 | prettier, whole repo                                                         |
| `lint:md`      |    0 | markdownlint, whole repo                                                     |
| `reconcile`    |    0 | `CLEAN`: 18 paths reconciled, 0 escapes, 3 pipeline artifacts exempt by name |

No `structural:*` gate applies: the increment ships no capability eval pair.

**ADVISORY layer:** no verifiers registered — floor gates only (`count-verifiers.mjs`: `registered: 0`).

**What this means and does not mean (P0).** The named gates passed. Nothing more is certified. A defect that no test,
rule or check covers is invisible here.

**Orchestration deviation, recorded (ADVISORY).** The pinned `cmd; t=$?` capture forms are refused in this
worktree-isolated session. So the same six gates ran through a scratch node runner,
`.pharn/pharn-dev-verify/capture.mjs`, which uses `spawnSync` argv arrays and records only exit statuses. The verdict is
`check-verify.mjs` over that map; `verify-report.json` carries its fields verbatim, plus the advisory `verifiers` block.
