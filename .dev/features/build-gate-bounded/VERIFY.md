# VERIFY — build-gate-bounded

- head: `ce7568d` (the build commit) plus this stage's and `/pharn-dev-regress`'s own artifacts in the working tree.
- driver: `.pharn/pharn-dev-verify/run.mjs`, a node runner for Step 1 (the isolated worktree refuses the pinned
  `x=$?` capture form). Each gate's exit code is the runner's own; each gate's output is kept under
  `.pharn/pharn-dev-verify/`. The verdict is `pharn/floor/check-verify.mjs`'s, copied verbatim into
  `verify-report.json`.

## Floor gates (exit codes)

| gate           | exit |
| -------------- | ---- |
| `test`         | 0    |
| `validate`     | 0    |
| `lint`         | 0    |
| `format:check` | 0    |
| `lint:md`      | 0    |
| `reconcile`    | 0    |

- `test`: `npm test`, 4,574 tests, 4,574 pass — the feature's own `build-gate.test.mjs` (9 tests),
  `build-gate-core.test.mjs` (12) and the added cases in `gate-run-core`, `run-gates` and `test-results-core` among them.
- `validate`: `FLOOR: GREEN — 36 capabilities checked`.
- `reconcile`: `CLEAN` — 19 paths changed since `/pharn-dev-build`'s anchor, none the guards would have denied;
  `REGRESSION.md` and `regression-report.json` exempted as pipeline artifacts. Two Bash writes inside the build's
  scope are disclosed rather than found by it: `npm run docs:generate` rewrote `README.md`'s generated block (and
  rewrote the 37 `docs/capabilities/` files byte-identically), and one `sed -i` on `pharn/floor/build-gate.test.mjs`
  was reverted with the Edit tool in the same minute. Reconcile cannot see an in-scope write (its bound,
  `pharn/pharn-contracts/reconciliation-record.md`).
- `structural:*`: none — this increment ships no eval pair (it adds no capability).

**VERIFIED: floor gates PASS.**

## Verifiers (advisory)

No verifiers registered — floor gates only (`count-verifiers.mjs`: `{"registered":0,"verifiers":[]}`).

_Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._
