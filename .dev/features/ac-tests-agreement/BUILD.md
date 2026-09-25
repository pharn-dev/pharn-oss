# BUILD — ac-tests-agreement

Built from `.dev/features/ac-tests-agreement/PLAN.md` (spec hash `4950796f…c7f` re-verified equal at Step 1; no open
questions). Scope set with `--from-plan` (28 paths), anchored with `reconcile-baseline.mjs --anchor --by
pharn-dev-build`, then re-set to 29 paths and recorded with `--amend-scope` (amendment 1) after the plan gained
`pharn/floor/run-gates.test.mjs` (see the plan's "Amended during build").

**What landed.** Finding 1: `frontmatter-core.mjs` exports `readValue` (moved byte-for-byte from `check-spec.mjs`) and
`readField` (last-wins). `check-spec.mjs` and `check-plan-spec-agree.mjs` import it instead of their private copies;
their existing suites pass unchanged (260/260 before any new test was added). `ac-tests-lock.mjs` reads both pins
through it. `ac-gate-core.mjs` reports an unreadable SPEC pin as `ac-tests-modified`, and its header states that a
Draft still carrying the locked pin passes there. Finding 2: `ac-tests-core.mjs` `scopedPath`, which the lock pins and
checks through. Finding 3: `MAPPING_RE` refuses edge whitespace, and `check-ac-tests.mjs` matches cells byte-exactly,
naming the entry when the only difference is case or Unicode form. Finding 4: `scopeKey` folds with `foldName` (NFC
plus full case folding). Finding 5: `.prettierignore` lists the lock, `assignments.json` and `findings.json`, held by
a ★ closed-classification test in `check-regress.test.mjs`. The contract (`ac-tests.md`) and `pharn-test.md` state
the new rules and bounds. `SKILLS_VERSION` is 6.20.4, the badge matches, and `CHANGELOG [6.20.4] - 2026-09-25` is
written. `npm run docs:generate` changed no generated region.

**Grill concerns folded in (advisory).** G1: the Draft-with-intact-pin residual is stated in the header and the
contract, and pinned by a test. G2: the migration note is in the CHANGELOG. G3/G6: the plan-text nits were not
re-edited, because the formatter strips the space again. G4: a test pins `scopeKey`'s equivalence by value. G5: the
module headers are updated. G7/G8: both residuals are stated in the contract's paths paragraph. G9: the new AC-gate
tests are appended at the end of the file.

**A defect found during the build, fixed in scope.** `run-gates.test.mjs`'s ★ WIRING test copied a HAND list of
floor modules into a scratch repo. The new `ac-tests-core → spec-template-core → frontmatter-core` import crashed the
pinned head init (exit 1), so the list is now the import closure of explicit roots (the `check-loop-fresh.test.mjs`
precedent).

**Deviations, stated.** Step 2b's pinned `xargs` form is refused in an isolated worktree, so the same three gates ran
over the same list from `.pharn/pharn-dev-build/format-scope.mjs` (argv arrays): 22 existing scoped paths, with
prettier, markdownlint and eslint all exiting 0. markdownlint's MD038 fix stripped the meaningful space from a
`` ` #` `` code span in the contract and the CHANGELOG, and both sentences were reworded to "a whitespace-preceded
`#`". Three in-scope files were written through Bash rather than Edit: the two PLAN.md appends, `SKILLS_VERSION` and
the README badge. All are declared in `## Files`, so they are reconciled against the scope rather than escaping it.

**Floor:** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked`, exit 0. Repo-wide read-only
`format:check`, `lint` and `lint:md` all exit 0. A green floor means the structural invariants hold, never that the
change is correct; that is `/pharn-dev-review`'s advisory job.
