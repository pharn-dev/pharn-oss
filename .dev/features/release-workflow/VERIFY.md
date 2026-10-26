# VERIFY — release-workflow

**VERIFIED: floor gates PASS** (`check-verify.mjs` exit 0, on the third run; the first two are recorded below).

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`: 6,141 tests, 6,140 pass, 0 fail, 1 skip)                               | 0    |
| `validate`                                                                                 | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`--require-baseline`: `CLEAN`, no escapes)                                    | 0    |

Verifiers: no verifiers registered (`count-verifiers.mjs`: 0) — floor gates only.

## The two earlier runs (recorded, not hidden)

1. **Run 1 — FAIL** on `format:check` 1 and `lint:md` 1. Causes: (a) this run's own `PLAN.md`, edited after its
   format step to record the GATE-1 answers and not re-formatted — fixed with the scoped prettier/markdownlint
   pair; (b) a git-ignored pre-7.0.0 scratch file, `.pharn/batch-2026-10-19/followups-discovery.md`, which
   `markdownlint-cli2` still reaches (L61). A clean copy without the ignored scratch measured both gates 0. The human
   chose (form) to move `.pharn/` aside.
2. **Run 2 — FAIL** on `reconcile` 1: escape `.pharn/ci.yml`, denied by the build's scope snapshot. **Caused by this
   orchestration:** `.pharn/ci.yml` is tracked (pharn-ci's config, kept by a `.gitignore` exception), and moving the
   whole `.pharn/` directory deleted it from the tree. It was moved back; `git diff` is empty for it and a
   reconcile preview read `CLEAN`. Every other gate was 0.
3. **Run 3 — PASS**, the single map above, all gates in one pass after the restore.

The rest of the old `.pharn/` scratch sits in the session scratchpad (`pharn-legacy-dot-pharn/`), not deleted.

verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance. In particular the workflow's real behaviour on GitHub (API answers,
permissions, the tag ruleset) is exercised only by the first real run.
