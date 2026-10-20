# VERIFY — load-flake-regress

**FLOOR verdict: PASS** — `verify-report.json` `.verdict` from `pharn/floor/check-verify.mjs`, every gate exit 0.

| gate                                                 | exit |
| ---------------------------------------------------- | ---- |
| `test` (`npm test`: 5,839 tests, 5,838 pass, 0 fail) | 0    |
| `validate`                                           | 0    |
| `lint`                                               | 0    |
| `format:check`                                       | 0    |
| `lint:md`                                            | 0    |
| `structural:…trust-fence…`                           | 0    |
| `reconcile` (`--require-baseline`)                   | 0    |

Load average during the run: 27 at the start, 7 at the end. Verifiers: none registered (advisory slot empty).

## The load measurement (advisory evidence; it does not move the verdict)

Profile, the same before and after: `node --test` over the five files (`entry-base-evidence`, `entry-gates`,
`stage-regress`, `stage-verify`, `run-gates`), three copies in parallel, plus 24 `yes > /dev/null` CPU burners, on an
8-core machine shared with other sessions.

| run                                | per copy           | failing (same in each copy)                                                                   | load avg |
| ---------------------------------- | ------------------ | --------------------------------------------------------------------------------------------- | -------- |
| 3x parallel `npm test` (first try) | 5,825 pass, 0 fail | none — this load did not reproduce the flakes                                                 | ≤ 112    |
| before (unchanged tree)            | 292/300            | 7 in `entry-base-evidence` (null report after a `continue`), `stage-verify` budget clock      | 15–262   |
| after, first                       | 299/300            | `stage-verify` "★ WIRING (reuse, L45)" (the same 30 s-window cause, missed in the first pass) | ≤ ~270   |
| after, final tree                  | 300/300            | none                                                                                          | 95–199   |

One profile, one machine: a measurement, not a guarantee (stated in the CHANGELOG).

## Write route (deviation, recorded)

Every write of this run went through a scratch helper that first runs both real write hooks with this worktree as
their root (the desktop session's own hooks judge the main checkout and denied every write). The user chose this route.
`reconcile` is `CLEAN` over the epoch re-anchored at PLAN Amendment 1; the writes before that anchor went through the
same helper under the original 16-path scope.
