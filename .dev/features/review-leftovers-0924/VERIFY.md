# VERIFY — review-leftovers-0924

**VERIFIED: floor gates PASS** (`check-verify.mjs` exit 0, `"PASS"`, `failing_gates: []`), over the map captured in
an environment equivalent to CI. The raw capture failed `lint:md` only, on files that all sit in a gitignored
directory CI never has; both captures are recorded.

| gate                | raw working tree | clean copy (verdict input) |
| ------------------- | ---------------- | -------------------------- |
| `test`              | 0 (3289/3289)    | 0 (same run)               |
| `validate`          | 0                | 0 (same run)               |
| `lint`              | 0                | 0 (same run)               |
| `format:check`      | 0                | 0 (also 0 in the copy)     |
| `lint:md`           | **1**            | 0 (1465 files, 0 issues)   |
| `structural:…` pair | 0                | 0 (same run)               |
| `reconcile`         | 0 (`CLEAN`)      | 0 (same run)               |

- `lint:md` raw: 18 errors, **every one under `.agents/skills/`**, and 0 elsewhere. `.agents/` is gitignored
  (`.gitignore:12 /.agents/`), untracked, and dated 2026-09-24, before this session. No file of this increment is
  among them. The clean copy excludes it (`rsync` without `.claude/worktrees`, `.git`, `.pharn`, `.agents`,
  `node_modules` symlinked back, `git init`) and exits 0.
- `reconcile`: `check-bash-reconcile.mjs --base . --require-baseline` → `CLEAN` against the build's anchor
  (`anchored_by: pharn-dev-build`), 15 paths reconciled, `escapes: []`. The three exempted paths are this feature's
  pipeline artifacts. `CLEAN` means no escape was detected, never that none occurred.
- The structural pair is `pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
  `.dev/features/trust-fence/findings.json`. This increment ships no capability and so no eval pair of its own. Its
  correctness signal is its own tests inside `test`: `check-spec.test.mjs` 211/211 and `render-run-report.test.mjs`
  77/77, with their discrimination against the pre-fix code recorded in `BUILD.md`.

## Verifiers

`node pharn/floor/count-verifiers.mjs .` → `{"registered":0,"verifiers":[]}`. No verifiers registered — floor
gates only.

_verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._

## Iteration 2 (after the GATE-2 fix pass)

Raw: `test` 0 (3290/3290), `validate` 0, `lint` 0, `format:check` 0, `lint:md` **1** (18 errors, all under the
gitignored `.agents/`, 0 elsewhere), the eval pair 0, `reconcile` 0 (`CLEAN`, 15 reconciled, `escapes: []`, against
the same build anchor). Clean copy: `lint:md` 0. `check-verify.mjs` exit **0**, **`PASS`**, `failing_gates: []`. The
verdict JSON is byte-identical to iteration 1 (`cmp`), so `verify-report.json` is unchanged.

**VERIFIED: floor gates PASS.** _verified = the named gates passed; this is NOT a guarantee of correctness beyond what
those gates check._
