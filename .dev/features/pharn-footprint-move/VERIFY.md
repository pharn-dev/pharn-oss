# VERIFY — pharn-footprint-move

Run in the footprint-move worktree at `54fe8f3a` plus the uncommitted Phase B build, with the build's reconciliation
epoch open (anchored at `/pharn-dev-build` Step 0).

## Fix round (the standing verdict)

Run at `2ae9f024` (human patch 2) plus the fix round's 19 agent-side files, under the fix round's own build anchor.

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`: 6,016 tests, 6,015 pass, 0 fail, 1 skipped)                            | 0    |
| `validate`                                                                                 | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`CLEAN`: 19 paths reconciled, no escape)                                      | 0    |

VERIFIED: floor gates PASS (`check-verify.mjs` exit 0). `verify-report.json` holds this run. The acceptance grep still
finds 0 lines over `.claude/` + `pharn/`. No verifiers registered: floor gates only.

Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check.

## First run (kept as the record)

### Floor gates (exit codes)

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test` (`npm test`: 6,015 tests, 6,014 pass, 0 fail, 1 skipped)                            | 0    |
| `validate`                                                                                 | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile` (`check-bash-reconcile.mjs --base . --require-baseline`)                       | 1    |

### Verdict (`check-verify.mjs`, exit 1)

VERIFY FAILS: gate(s) `reconcile` red — stage FAILS.

`reconcile` reconciled 272 paths, exempted 5, and reported exactly one escape (its `problem` text is DATA, quoted):

```text
'.dev/floor/command-family.test.mjs' changed since the reconciliation anchor, and the write guards would have DENIED a
write to it (writes-scope (snapshot)) — a write reached it outside the guarded tool surface
```

This is the fix the maintainer approved at the regress run-1 STOP ("Fix and re-run"). The fix makes R8 skip `pharn/.run/`
and `pharn/.backup/`. It was added to PLAN.md `## Files` after the anchor, so the anchored scope snapshot does not hold
it. The write itself went through the hook-checked helper under the re-set plan scope. Reconcile has no attribution, so
it reads the path exactly as it should: an escape from the anchored scope.

**Correcting the record.** At the regress STOP I said reconcile would label this path `plan-widened-after-anchor`. It
labelled it `writes-scope (snapshot)`. The path and the outcome (verify FAIL) are what was expected; the label I named
was wrong.

## Recorded steps (not gates)

- The PLAN's acceptance grep over `.claude/` + `pharn/` finds 0 lines. 20 old-path lines carry a migration label, the
  exemption the PLAN allows.
- Leftovers outside the acceptance scope, each justified:
  - 22 hits in 8 dated `.dev/measurements/` run records (history, excluded with `.dev/features/**`).
  - 4 hits in `.dev/floor/test-fixtures/changelog-per-pr/{base,head}.md` (snapshots of released CHANGELOG text).
  - 0 in `docs/`.
  - Root-level hits are all intentional: `.gitignore` keeps `.pharn/*` for the `ci.yml` exception, and the rest are
    comments and migration notes, plus README tree entries that sit inside the `pharn/` branch.
- Coverage: measured after this stage (`npm run test:coverage`, lcov). It is reported at GATE 2 against CI's pharn-ci
  diff-coverage gate, whose threshold in `.pharn/ci.yml` is 100.

## Verifiers

No verifiers registered (`count-verifiers.mjs` → `{"registered":0,"verifiers":[]}`): floor gates only.

Verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check. Verifier concerns
are advisory help, not assurance.
