# VERIFY — reanchor-lesson

**VERIFIED: floor gates PASS** (`check-verify.mjs --stamp … --feature reanchor-lesson` exit 0; `verify-report.json`
`.verdict` = `PASS`, `failing_gates: []`).

| gate                 | exit | duration (ms) |
| -------------------- | ---: | ------------: |
| `test`               |    0 |     1,054,927 |
| `validate`           |    0 |           133 |
| `lint`               |    0 |         5,016 |
| `format:check`       |    0 |        32,236 |
| `lint:md`            |    0 |        11,218 |
| `instruction-growth` |    0 |           228 |
| `reconcile`          |    0 |           231 |

- **Stamp:** `stamp_sha256` `a0753473449ac2c5427b0aea28a584fc2df5a8b426eecbc62e9fec2b160c9e6b`, fingerprint
  `worktree-fingerprint/3+sha256` final `957dce46e4f4487ad52762a5c1d0c10c5d5f4c749eeef0db560367c93e507ff2`. A stamp
  certifies internal consistency, never provenance (L43).
- **Completeness:** `aux.completeness` 0 — the one `## Files` path (`CHANGELOG.md`) exists.
- **Reconcile:** `CLEAN`, epoch `2026-11-23T21:32:31.736Z` anchored by `pharn-dev-build`, `reconciled: 1`
  (`CHANGELOG.md`, inside the build's scope), `escapes: []`, `merged: []`. Exempted as pipeline artifacts: this
  feature's `REGRESSION.md` and `regression-report.json`. `origin/main` did not move during the window, and the epoch
  was anchored once, so the window holds the build's only write.
- **Verifiers:** no verifiers registered — floor gates only (`count-verifiers.mjs` → `{"registered":0,"verifiers":[]}`).

_Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._

## Orchestration notes (advisory)

- Heavy slot held by `reanchor-lesson` from 22:51 to 00:22. 1-minute load at verify start 7.98; at the `test` gate's end
  22.15; at the last gate 10.83. Other projects' agent sessions pushed the load into the 40s during `test`; it passed.
- The `init` line and the first `run --next` ran as their own Bash calls. The other six `run --next` calls ran one at a
  time from one background node process (`spawnSync`, scratchpad), each call's exit and `finalized` read before the
  next, because this worktree-isolated session refuses some compound shell forms. No file in the tree was written
  while the gates ran.
- The canon entry and `docs/lessons-index.md` are written after this stage, at GATE 2, by `/pharn-dev-memory-promote`;
  this verdict does not cover them (the plan's ordering, L68). CI's `npm run check` (with `docs:check`) runs over them on
  the pull request.
