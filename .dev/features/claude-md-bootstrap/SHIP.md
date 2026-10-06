# SHIP — claude-md-bootstrap

Gated `/pharn-dev-ship` run, 2026-10-06, base `6ff4dd1` (main, 6.46.0). The run ended at **GATE 2**.

## Stages, in order, and the verdict each one read

1. `/pharn-dev-plan` → `PLAN.md`, `check-plan-lessons` GREEN. **GATE 1:** approved as written, with three decisions:
   - fix `cost-ledger.md:197` with a 6.46.1 bump;
   - move the local `AGENTS.md` to the Trash; it was never tracked and `/AGENTS.md` was already git-ignored;
   - put the guides in `.dev/guides/`.
2. `/pharn-dev-grill` → `GRILL.md`. `check-plan-lessons.mjs` exit **0**. Advisory: 6 concerns (0 blocking).
3. `/pharn-dev-build`. `node pharn/floor/validate.mjs .` exit **0** (`FLOOR: GREEN — 36 capabilities`).
4. `/pharn-dev-regress` → `regression-report.json` `.verdict` = **`no-regressions`**.
5. `/pharn-dev-verify` → `verify-report.json` `.verdict` = **`PASS`**:
   - `test` 4,877/4,877;
   - `validate`, `lint`, `format:check`, `lint:md` and `structural:` all 0;
   - `reconcile` `CLEAN`.
6. `/pharn-dev-review` → see [`REVIEW.md`](./REVIEW.md) (advisory; 0 floor findings, 6 advisory) and
   [`GRILL.md`](./GRILL.md).

Measurements and the line accounting: [`MEASUREMENTS.md`](./MEASUREMENTS.md).

- Root `CLAUDE.md` went from 189,120 to 28,403 B (−85.0%).
- `--growth --base 6ff4dd1`: `within`, 1,722 B added.
- `check-migration.mjs` exit 0.

**GATE 2 decision: fix, then open the PR.** The REVIEW's important P6 finding was fixed: the index line for
`versioning.md` now also fires on "changing a contract or frontmatter shape that existing installs read". It was
edited in both `CLAUDE.md` and `split.mjs` (`NEW_INDEX`) under the plan's scope. It added 72 B (1,650 → 1,722; 18 → 19
new lines) and the root went from 28,331 to 28,403 B. `npm run check` and `validate` were re-run after the fix before
the commit. The five minor advisory findings were left as recorded.

changelog-entry: exit 0

lesson: promoted L69

deferred:

- `floor-guide-dedupe`: retire the floor guides' restatements of module headers (REVIEW P4 finding).
- `regress-declared-from-plan`: pin `/pharn-dev-regress` Step 1.3's `## Files` extraction to the canonical parser. This
  is L69's remedy, and it is not built.
- Human-only follow-up: `.claude/hooks/require-loop-record.cjs:16` still says its header is repeated in `CLAUDE.md`.

After promotion, `npm run check:reconcile` stays `CLEAN`: 21 paths reconciled, and `docs/lessons-index.md` is exempt.

Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
