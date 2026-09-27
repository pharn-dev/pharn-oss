# SHIP — cost-transcript-hostile-values

A thin, advisory roll-up of the chain and its floor verdicts. The decision to merge is the human's.

## Where the run ended

**GATE 2**, twice.

- **First time (on `b9b6a03`).** The chain was green, and the review blocked on two wording findings. The maintainer
  chose "Fix + integrate, local only": fix every review finding, merge `main`, renumber, re-verify, and commit on this
  branch with no push and no PR.
- **Second time (now, on `main` `008b24b` plus this branch).** The fix pass is done and re-verified.

## Stages, in order

1. `/pharn-dev-plan`: the plan, re-planned twice at the maintainer's choice (`PLAN.md`, decisions 1–10).
2. `/pharn-dev-grill`: two rounds, 21 advisory concerns, each disposed of in `PLAN.md`. The lessons declaration is
   GREEN every round.
3. `/pharn-dev-build`: GATE 1 approved.
4. `/pharn-dev-regress`.
5. `/pharn-dev-verify`.
6. `/pharn-dev-review`: blocked on R1 and R2.
7. GATE 2: fix. The lesson was promoted (below).
8. Merge `origin/main` and renumber 6.24.2 → 6.26.1 (`2c38d9a`).
9. The fix pass (`/pharn-dev-build` again, under the re-pinned plan).
10. `/pharn-dev-regress` and `/pharn-dev-verify`.
11. The focused re-review: blocked on F1 and F2.
12. The second fix iteration.
13. `/pharn-dev-verify` again.

## Structural verdicts, as read

- **`/pharn-dev-build` → `node pharn/floor/validate.mjs .`: exit 0** (`FLOOR: GREEN — 36 capabilities`), on every pass.
- **`/pharn-dev-regress` → `regression-report.json` `.verdict`: `no-regressions`.** The base is `origin/main`
  `008b24b`, and the report is the helper's output, byte for byte. It measured the tree before the F1–F5 iteration.
  That iteration changed prose, three checker message sites and one test. The reasoning that no outside gate could
  have flipped is ADVISORY: verify's `test` gate then ran every test in the tree (3,831 of 3,831 pass), outside tests
  included, and `validate` and the structural gate stayed exit 0. A pass→fail flip needs a gate that fails at HEAD,
  and none does.
- **`/pharn-dev-verify` → `verify-report.json` `.verdict`: `PASS`**, on the final tree:
  - test, validate, lint, format:check, lint:md, the structural pair and reconcile all exit 0;
  - reconcile is `CLEAN` (11 paths, 0 escapes).

## Review

- **`REVIEW.md`, the first review, blocked on R1 and R2.** R1–R9 are addressed in the fix pass (`PLAN.md`, "Fix
  pass").
- **`REVIEW.md`, "Re-review", blocked on F1 and F2.** F1–F5 are addressed in the second fix iteration (`PLAN.md`, the
  subsection on the re-review).
- **The second fix iteration has not been reviewed independently a third time.** Its F1–F5 fixes are recorded, with
  their own L64 sweep, in `BUILD.md`.
- **`GRILL.md`** holds the two grill rounds, advisory.

## Ship-stage records

changelog-entry: exit 0

lesson: promoted L64

- L64 ("a bound's RESTATEMENT re-derives its quantifier") came from the first review's R1, R2, R3 and R5.
- It passed `check-provenance` GREEN, was accepted at the promote gate, and was committed with its index in
  `18c12a4`.

deferred:

- The `## Files` parser (`set-writes-scope.cjs --from-plan`) reads a NESTED list item that starts with a back-ticked
  token as a scope path. It happened twice in this feature, and both times it was caught only by reading the printed
  path count. See `BUILD.md`, deviation 1. The remedy so far has been "remember to reword", which L20 says earns a
  floor check.
- The re-review's candidate: L64 recurred in its own fix pass, because each replacement sentence was probed only over
  the inputs its author pictured (`REVIEW.md`, "Re-review").

## Commits

- `df2e880`: the reviewed increment (as 6.24.2);
- `18c12a4`: L64 promoted;
- `2c38d9a`: the merge of `origin/main` (6.25.0 #280, 6.26.0 #281), renumbered to 6.26.1;
- `e76f419`: the fix pass, R1–R9 and then F1–F5;
- the commit that carries this section's current text.

At GATE 2 the maintainer chose to keep the branch local. On 2026-09-27 they chose to open a pull request, so the
branch was pushed. `main` was still `008b24b` at the push, so no further merge or renumber was needed.

_Chain ran; the named floor verdicts are as shown. This is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate._
