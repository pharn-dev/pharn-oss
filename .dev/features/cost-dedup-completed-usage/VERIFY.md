# VERIFY — cost-dedup-completed-usage

This is iteration 3, after the second GATE-2 fix iteration. Iterations 1 and 2 also returned `PASS`, over 3353 and
3358 tests.

Machine report: `verify-report.json`. Its `feature`, `gates`, `verdict` and `failing_gates` fields are
`pharn/floor/check-verify.mjs`'s stdout verbatim (checked field by field), and the advisory `verifiers` block is
appended after them.

## FLOOR layer — the gates (exit codes)

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`: 3360 tests, 3360 pass, 0 fail, 0 skipped)                              | 0    |
| `validate` (`node pharn/floor/validate.mjs .`)                                             | 0    |
| `lint` (`npm run lint`)                                                                    | 0    |
| `format:check` (`npm run format:check`)                                                    | 0    |
| `lint:md` (`npm run lint:md`)                                                              | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`)                       | 0    |

**VERIFIED: floor gates PASS.** `check-verify.mjs` exit 0, `"verdict": "PASS"`, `failing_gates: []`.

- **The feature's own signal** is carried by `test`, which collects the four suites this increment touches. Measured
  per file with `node --test --test-reporter=tap`:
  - `transcript-core.test.mjs`: 12;
  - `render-cost-record.test.mjs`: 38;
  - `render-cost-ledger.test.mjs`: 68;
  - `check-cost-ledger.test.mjs`: 46.

  They include the mutant controls. Further negative controls were run by hand; see `BUILD.md`. The increment ships
  no new eval pair, so the one `structural:*` gate is the existing trust-fence pair (both paths confirmed readable
  first).

- **`reconcile`: `CLEAN`.** This iteration's build anchored the epoch at 2026-09-26T13:50:11Z. Ten changed paths were
  reconciled against the recorded scopes, with 0 escapes and no warnings. Four pipeline artifacts written after the
  anchor are exempted by name. `CLEAN` means no escape was detected, never that none occurred. The contract's bounds
  apply: git-ignored paths are outside the set, the window is anchor → reconcile, one worktree per session, and there
  is no attribution.

## The first run of this iteration was RED, on `reconcile` alone

The first verify run of iteration 3 returned `reconcile` exit 1 and every other gate exit 0. The one escape was
`.dev/memory-bank/lessons-learned.md`, `denied_by: protect-trusted-paths.cjs`.

- **The cause was a bookkeeping error in this iteration's plan, not an unguarded write.** The plan listed canon in
  `## Files` when the build anchored the epoch, so the opening scope snapshot names canon. `check-bash-reconcile.mjs`
  attributes a path to the FIRST recorded scope that names it, "so a later amendment can never re-attribute a path the
  opening scope already covered". The K7 edit was made through the `Edit` tool under a promote-origin scope, recorded
  as amendment 1, but the checker judged it under the build-origin snapshot, which cannot authorize canon. That is the
  checker working as designed.
- **The maintainer chose "Revert for verify, re-apply after".** L63's sentence was put back to the accepted text
  under a promote-origin scope, and `npm run docs:generate` regenerated the index. Both files were then byte-equal to
  the anchor's recorded hashes, compared read-only against `.pharn/reconcile/baseline.json`. The baseline was not
  edited or re-anchored.
- **So this verdict covers a tree where L63 reads as accepted.** The K7 correction is re-applied after this stage,
  under a promote-origin scope, as 3.1.2's L10 repair was, and the index is regenerated. The post-merge local
  `check:reconcile` will list both paths, beside the files PR #277 changed. `SHIP.md` records it.

## ADVISORY layer — verifiers

`node pharn/floor/count-verifiers.mjs .` → `{"registered":0,"verifiers":[]}`. **No verifiers registered — floor gates
only.** `verifiers: { registered: 0, findings: [] }`.

---

Verified = the named gates passed. This is NOT a guarantee of correctness beyond what those gates check. In
particular, it does not show that the largest line is always a request's completed usage (an advisory, measured
assumption), and it does not show that `--verify-transcript`'s bound is the right trade-off (a design choice made at
GATE 2). Verifier concerns would be advisory help, not assurance, and there are none today.
