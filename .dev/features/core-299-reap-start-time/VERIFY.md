# VERIFY — core-299-reap-start-time

The gates ran through `pharn/floor/run-gates.mjs`, using the pinned `init` line and then `run --next --timeout-ms 3600000`
until finalized. The verdict is `check-verify.mjs --stamp pharn/.run/pharn-dev-verify/gates/stamp.json`, exit 0, at HEAD
`464c6ba9`. That HEAD is the regress commit, which sits on top of the merges of `origin/main` (302f26f8) and #464
(9a29df8a).

**Advisory orchestration, recorded:**

- **Driver.** The harness refuses the pinned shell forms in this isolated worktree, so
  `pharn/.run/pharn-dev-verify-driver/drive.mjs` ran the two pinned lines verbatim, one gate per call. It first waited for
  the batch load rule: 1-minute load below 40 and no other `node --test`. It started at load 4.92 (01:35:04Z) and ended
  at load 32.77 (01:48:37Z).
- **Re-anchor.** The two merges landed after the first build anchor. Per the orchestrator's instruction, build Step 0
  (setter plus `--anchor`) was re-run before this stage. The build was already committed, so the re-run wrote nothing.
  The baseline was never edited.

| gate                 | exit |
| -------------------- | ---- |
| `test`               | 0    |
| `validate`           | 0    |
| `lint`               | 0    |
| `format:check`       | 0    |
| `lint:md`            | 0    |
| `instruction-growth` | 0    |
| `reconcile`          | 0    |

- `test` took 633 s.
- Stamp sha256: `a7795bd40309cd39e934ab02d28e2e69d0bbf0240f4032805d64c8af9013010d`.
- Final fingerprint: `80d13323376d674929468290e227c3c64861d111438f26378b1c846ae2b3f701`.

VERIFIED: floor gates PASS

no verifiers registered — floor gates only.

Verified means the named gates passed. This is NOT a guarantee of correctness beyond what those gates check, and
verifier concerns are advisory help, not assurance. The stamp certifies internal consistency, never provenance. The
`reconcile` CLEAN covers only the window from the re-anchor to this run.
