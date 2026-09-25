# BUILD — crash-routing

Built from `.dev/features/crash-routing/PLAN.md` (its `## Amended after grill` supersedes the body where they differ).
Spec pin re-checked at Step 1: `hash-doc.mjs pharn/ARCHITECTURE.md` = `4950796f…d2dc1c7f`, equal. The scope was set from
the plan (24 paths), the reconciliation epoch anchored after it, and — once the grill added `.claude/commands/pharn-ship.md`
— re-set from the amended plan (25 paths) and recorded on the open epoch with `reconcile-baseline.mjs --amend-scope`
(amendment 1).

## What landed

- **The entry/core split.** `pharn/floor/loop-fresh-core.mjs` is the old `check-loop-fresh.mjs`, copied with `cp` (a
  Bash write to a declared path) and then edited: `main()` removed, direct invocation exits 2, the header's
  load-failure bullet moved from NOT COVERED to FLOOR, check I's row names the grandchild crash, Usage/Exit moved to the
  entry. `pharn/floor/check-loop-fresh.mjs` is the new entry: no static import, `await import("./loop-fresh-core.mjs")`,
  and a result check (exit code in `{0, 1, 2, 4}`, exactly the six document keys, the verdict matching the code). Any
  failure is `INCONCLUSIVE` `checker-crashed`, exit 2, with `checks: null` and path-shortened `reason`.
- **`checker-crashed`** in `gate-run-core.mjs` `REASON_CODES`, not in `LAPSE_CODES`.
- **`pharn/floor/shelled-verdict-core.mjs`**: `RED_LINE`, `shelledVerdict`, `crashedDetail`, `CHILD_CRASHED`,
  `childCrashedLine`, `reportsChildCrash`. Imported by `check-ac-tests.mjs`, `ac-tests-lock.mjs` and
  `check-test-stage.mjs` (whose inline `^RED —` regex it replaces).
- **The children and the gate** as the plan's Design §2 describes; `checkLock` returns `{reds, crash}` and both its
  callers destructure.
- **Docs**: the two contracts, four command sentences (`pharn-loop`, `pharn-test`, `pharn-plan`, `pharn-ship`),
  `CLAUDE.md`, `gate-run-core.mjs`'s grill-R2 comment. `SKILLS_VERSION` 6.21.1, the badge, `CHANGELOG [6.21.1]`.
  `npm run docs:generate` rewrote README's generated floor count (two new floor modules) — `docs:check` GREEN.

## Decisions made while building

- **One defect caught by the reproduction script before any test existed:** `crashedDetail`'s error-line regex first
  read `/^[A-Z][A-Za-z]*Error\b/`, which cannot match a plain `Error:` line (the leading class needs a character before
  `Error`). Fixed to `/^(?:[A-Z][A-Za-z]*)?Error\b/`; the shelled-verdict suite pins `Error:`, `TypeError:` and
  `Error [ERR_…]:`.
- **The straddle test is its own top-level test** appended after the existing `★ UPGRADE STRADDLE` block, not an
  `await t.test` inside it (the plan's wording): the same shape, three subtests, and it rebases trivially.
- **The load-graph sweep's argv** runs the entry against a floor copy that is not a git repo and holds no reports; the
  intact control therefore reads `RERUN report-missing` (exit 1 with its document), and every broken case must turn that
  into exit 2. The control's ledger row is removed before the sweep, and the sweep asserts no crash wrote one.

## The straddle test's discriminating power (measured, not committed)

The grill's point was that the planned mutation (E stops subtracting the AC ids) was already caught elsewhere, and the
straddle-specific one was not. Measured on this build: `loop-fresh-core.mjs` line 544 was changed from
`const treeMoved = !fp.ok || sf.algo !== fp.algo || sf.final !== fp.digest;` to
`const treeMoved = !fp.ok || sf.final !== fp.digest;` and only the new test was run: **4 failures** (the test and its
three worlds), each `STOP report-verdict-mismatch` with `checks.E` `fail` on the "older wording" variant. The file was
restored from a byte copy and compared with `cmp` (identical) before anything else ran.

## Floor

`node pharn/floor/validate.mjs .` → **exit 0**, `FLOOR: GREEN — 36 capabilities checked`. Step 2b's scoped pass formatted
the 25 scoped paths (prettier, markdownlint `--no-globs --fix`, eslint read-only: clean). Whole-repo confirmation: `npm
run lint` and `npm run lint:md` clean; `npm run format:check` flagged only this feature's own PLAN.md and GRILL.md (a
markdownlint fix after prettier had re-wrapped them), fixed by re-running prettier on those two artifacts. The affected
suites passed during the build; the stage-owned verdicts are in REGRESSION.md and VERIFY.md.

## Review-fix iteration

`/pharn-dev-review`'s independent reviewer raised seven findings (REVIEW.md), all inside the plan's `## Files`. Under the
delegation recorded in PLAN.md, the model chose to fix them and re-run regress and verify rather than stop. The build
scope was re-set from the plan (amendment 3 on the open epoch) before the edits:

- `check-loop-fresh.mjs`: the contract check reads the SERIALIZED document (keys, verdict per code, a RERUN naming a
  stage); `firstLineOf` is total; process `uncaughtException` / `unhandledRejection` handlers; `shortPaths` maps the
  working and home directories first and anchors the `…/<basename>` rule at a word boundary; the header's residuals
  rewritten.
- `check-loop-fresh.test.mjs`: nine more contract stubs (undefined and null RERUN stages, values with no string form,
  a BigInt, a microtask throw, a bounded 1,000-character message, a late timer throw), a RERUN control, the
  spaced-directory path test, the hermetic L35 test with an `export … from` mutation control, and `staticClosure`
  following both static forms. The stray `pharn/floor/.pharn/` the first L35 version wrote was deleted.
- Docs: `pharn-loop.md`'s commit-gate line, `gate-run-record.md` and CLAUDE.md qualified ("not node's exit 1, outside
  the stated residuals"), `shelled-verdict-core.mjs`'s LOAD GRAPH note, and `CHANGELOG [6.21.1]`.

Floor after the fixes: `validate` GREEN; the 6.21.1 tests pass; regress iteration 2 `no-regressions` and verify
iteration 2 `PASS` (REGRESSION.md, VERIFY.md).
