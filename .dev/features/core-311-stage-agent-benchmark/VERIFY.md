# VERIFY — core-311-stage-agent-benchmark

**VERIFIED: floor gates PASS** (`check-verify.mjs --stamp`, exit 0; `verify-report.json` `.verdict: "PASS"`).

| Gate               | Exit | Duration |
| ------------------ | ---: | -------: |
| test               |    0 |    578 s |
| validate           |    0 |    0.1 s |
| lint               |    0 |    4.7 s |
| format:check       |    0 |     31 s |
| lint:md            |    0 |     11 s |
| instruction-growth |    0 |    0.2 s |
| reconcile          |    0 |    0.2 s |

`reconcile`: `CLEAN`, epoch `2026-11-23T15:21:52.501Z` (the re-anchor after merging origin/main), no escapes; exempted
this feature's `REGRESSION.md` and `regression-report.json`. Build completeness: every concrete `## Files` path is
present (stamp `aux`).

Verifiers: no verifiers registered — floor gates only (`count-verifiers.mjs`: `{"registered":0,"verifiers":[]}`).

## The earlier attempt, recorded (a FAIL that was re-run after fixing the environment)

The first verify run (17:26–17:39) read **`FAIL`, `failing_gates: ["format:check"]`**. Prettier flagged two files the
increment does not touch: `.dev/features/observability-code-side-limit/LIMITS-5-PROPOSED.md` and
`.dev/features/release-workflow/HUMAN-PATCH.md`. The cause was the environment. This worktree had no `node_modules`
of its own, so `npm run format:check` resolved the main checkout's stale prettier 3.9.10, while `package-lock.json`
pins 3.10.1, the version #464 reformatted those two files for. `npm ci` in the worktree installed 3.10.1 (no tracked
file changed), and the stage was re-run from `init`. The first run's stamp and verdict are kept in
`pharn/.run/pharn-dev-verify-attempt1/`.

_Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those deterministic gates
check. The record's figures are advisory readings of transcripts, which no gate checks._
