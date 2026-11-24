# VERIFY — pre-anchor-deletion

Machine report: `verify-report.json` (the `check-verify.mjs --stamp` output verbatim, plus the advisory `verifiers`
block). Stamp sha256 `1a4a3b3429f3d487f1f9e7f48c3feb75df63b94f77e747b23a33341c43a0688b`.

## Gates (run 3, the recorded verdict)

| gate                 | exit |
| -------------------- | ---- |
| `test`               | 0    |
| `validate`           | 0    |
| `lint`               | 0    |
| `format:check`       | 0    |
| `lint:md`            | 0    |
| `instruction-growth` | 0    |
| `reconcile`          | 0    |

`test`: 7098 tests, 7097 passed, 0 failed, 1 skipped. `reconcile`: `CLEAN`, 10 paths reconciled, no escape, no
warning; the two exempted paths are this feature's regress artifacts. Build completeness: every `## Files` path present.

VERIFIED: floor gates PASS.

## Earlier runs of this stage (recorded verbatim, not substituted)

- **Run 1 — FAIL, `failing_gates: ["test"]`.** One real failure caused by this build:
  `reconcile-baseline.test.mjs` "hashFile hashes what it INSPECTED — no check-then-reopen-by-name (CWE-367)" pins
  that the source region from `hashFile` to `snapshotScope` makes exactly two path-addressed calls. The new
  `provenAbsent` sat inside that region and added a third (`lstatSync(abs`). Fix, inside the plan's `## Files`:
  `provenAbsent` moved to just above `buildRecord`, with a comment saying why. `pharn-install.json` regenerated. The
  build's targeted test runs had used `--test-name-pattern`, which is how they missed it. The whole
  `reconcile-baseline.test.mjs` (59) and `check-bash-reconcile.test.mjs` (117) files then ran green on their own.
- **Run 2 — FAIL, `failing_gates: ["test"]`.** One failure outside this feature: `entry-gates.test.mjs` "CLI cache
  (AC3) …" ("red with an unmeasured gate beside it"), with the 1-minute load average above 70. It passed in isolation
  right after (12.9 s), and it passed in regress's outside run at head. Treated as environmental: the whole stage was
  re-run from `init` once a heavy slot was free.
- **Run 3 — PASS** (above).

## Verifiers

No verifiers registered — floor gates only (`count-verifiers.mjs`: `{"registered":0,"verifiers":[]}`).

## Orchestration notes (advisory)

The `run --next` calls were made one at a time, in a loop, by a small node runner in the background, because a
foreground Bash call cannot outlast `npm test` on this host. Each run started from `init`; nothing was re-measured
outside the runner.

Verified = the named gates passed. This is NOT a guarantee of correctness beyond what those gates check; verifier
concerns are advisory help, not assurance.
