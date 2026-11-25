# VERIFY — core-371-floor-only

Gates run through `pharn/floor/run-gates.mjs` (init exit 0; seven `run --next` calls, each exit 0, the last
`finalized: true`), verdict by `node pharn/floor/check-verify.mjs --stamp pharn/.run/pharn-dev-verify/gates/stamp.json
--feature core-371-floor-only` (exit 0). Stamp sha256 `2d135728…67333751`.

| gate                 | exit | duration |
| -------------------- | ---- | -------- |
| `test` (`npm test`)  | 0    | 590.4 s  |
| `validate`           | 0    | 0.1 s    |
| `lint`               | 0    | 4.6 s    |
| `format:check`       | 0    | 31.5 s   |
| `lint:md`            | 0    | 11.3 s   |
| `instruction-growth` | 0    | 0.2 s    |
| `reconcile`          | 0    | 0.4 s    |

VERIFIED: floor gates PASS

Build completeness (`stamp.aux`): every concrete `## Files` path present (the verdict would read INCOMPLETE otherwise).

Verifiers: no verifiers registered — floor gates only (`count-verifiers.mjs` → `{"registered":0,"verifiers":[]}`).

Environment note: this worktree had no `node_modules` of its own and resolved the main checkout's (prettier 3.9.10),
which reported two unrelated `.dev/features/` files at build time. `npm ci` installed the lockfile's versions (prettier
3.10.1) before this run; every gate above ran on those.

verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance.
