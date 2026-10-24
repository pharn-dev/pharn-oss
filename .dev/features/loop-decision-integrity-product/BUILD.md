# BUILD — loop-decision-integrity

**Plan built:** `pharn/features/loop-decision-integrity/PLAN.md`
**Chain-gate result:** GREEN (`pharn/floor/check-plan-spec-agree.mjs`, re-verified at build time)
**Writes-scope:** set from the plan's `## Files` via `set-writes-scope.cjs --from-plan` (11 → 12 paths
after two in-flight `## Files` corrections, described below); reconciliation anchored after each set.
**Floor status:** GREEN — `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked in "."`

## Files written

- `pharn/floor/check-loop-decision.mjs` (new)
- `pharn/floor/check-loop-decision.test.mjs` (new)
- `pharn/floor/check-loop-record.mjs` (edited — optional `cap` field)
- `pharn/floor/check-loop-record.test.mjs` (edited — `cap` test cases)
- `pharn/floor/frontmatter-core.test.mjs` (edited — new consumer)
- `pharn/pharn-contracts/loop-record.md` (edited — `cap` documented, new guarantee section)
- `.claude/commands/pharn-loop.md` (edited — `reads:`, version, Step 6b/6c/7, Guarantee audit)
- `.dev/floor/command-hygiene.test.mjs` (edited — new commit-outcome member)
- `CHANGELOG.md` (edited — one `### Added` entry)
- `SKILLS_VERSION` (edited — 6.1.0 → 6.2.0)
- `README.md` (edited — version badge; `## Current state` block regenerated)
- `docs/capabilities/**` (generated — `npm run docs:generate`, 37 files, no hand edits)

## Two in-flight `## Files` corrections (both via the designed remedy, not a bypass)

The plan's original `## Files` omitted two paths the build itself surfaced as genuinely needing edits;
both were closed by the command's own prescribed procedure — re-scope to `PLAN.md` under
`/pharn-plan`'s own writes-scope, add the path, re-verify the chain + lessons gate, restore the build
scope, re-anchor — never by writing outside the declared scope:

1. **A literal citation of this repository's separate build-apparatus canon path inside `PLAN.md`'s own
   prose**, flagged by `.dev/floor/command-hygiene.test.mjs`'s pre-existing "no SHIPPED file cites the
   dev canon" gate (an install has no dev-apparatus directory). Reworded to describe the file without
   spelling its path.
2. **The GRILL.md finding template didn't document the enum-gated/free-text split**, flagged by
   `pharn/floor/validate.mjs` CHECK 5. Added the same trust-split sentence the grill command itself
   carries.
3. **`README.md`'s version badge and generated `## Current state` block**, discovered via `npm run check`
   (`check:badge` and `docs:check`) once `SKILLS_VERSION` moved — genuinely missed at plan time, added and
   regenerated (`npm run docs:generate`), never hand-edited.

## Gates run

- `node pharn/floor/check-plan-spec-agree.mjs` — GREEN (re-run after each `## Files` correction; the
  chain held throughout, since none of the corrections touched `SPEC.md` or the plan's carried hash).
- `node pharn/floor/check-plan-lessons.mjs` — GREEN throughout (`applied_lessons: none`, unaffected).
- `node pharn/floor/validate.mjs .` — GREEN (`36 capabilities checked`), after the GRILL.md fix.
- `npm test` — GREEN, 2089/2089.
- `npm run check` (format, lint, lint:md, docs:check, check:markers, check:badge, check:changelog,
  check:contributing, check:reconcile, test) — GREEN, exit 0.

## Honest line

Built within the named scope from a current approved plan (two genuine gaps in that scope's declaration
were corrected in-flight through the designed re-scope procedure, never through an unscoped write) — this
is **not** a judgment that the code is correct; that is `/pharn-regress` / `/pharn-verify` + the human.
