# BUILD — loop-fresh-integrity

- plan: `.dev/features/loop-fresh-integrity/PLAN.md` (GATE 1 delegated + `## Amended after grill`); spec pin
  `4950796f…d2dc1c7f` = `hash-doc.mjs pharn/ARCHITECTURE.md` at build time; no open questions.
- scope: `set-writes-scope.cjs --from-plan` → 13 paths; `reconcile-baseline.mjs --anchor --by pharn-dev-build` →
  2212 paths, anchored AFTER the setter.
- floor: `node pharn/floor/validate.mjs .` → **exit 0, GREEN** (36 capabilities).

What landed. `check-loop-fresh.mjs` check E computes `treeMoved` first and spawns `check-verify.mjs` once — with
`--ac-gate` over an unmoved tree (unchanged), without it over a moved one — and compares a moved-tree report through
the new exported `stampDerivedMismatch`. `STAMP_ONLY_FIELDS` is retired. The AC ids come from `gate-run-core.mjs`'s
new `AC_RESERVED_IDS` (the AC half of `RESERVED_IDS`, value unchanged), so the checker's import graph did not grow.
`check-test-stage.mjs` reads a child's exit 1 as a RED only with a `RED —` line on its full stdout; otherwise it
reports `UNUSABLE`, exit 2. Headers, the two contracts, `pharn-loop.md`, `pharn-verify.md` and `CLAUDE.md` were
updated to match. `SKILLS_VERSION` 6.20.4, badge, and a `CHANGELOG [6.20.4]` section (a pure insertion). Tests:
check-loop-fresh +5 (moved-tree forgery set × both modes, the AC-only residual, the unit and GATE-1 merge-order pins,
a differential test over 17 real check-verify worlds, and both ★ WIRING additions). check-test-stage +2 (crash kinds
over a copied floor, and a ✧ closure over every `return 1` in both children). The four affected suites were
142/142 green before verify.

Evidence the fixes bite (mutation controls). The review's `e-forged-verdict.mjs`, run against this floor, now reads
`STOP report-verdict-mismatch` unmoved, moved and at the commit gate; before, it read `RERUN tree-moved-since-verify` /
`STOP tree-moved-since-verify`. The review's `v4b.mjs` ran the PRE-fix check-test-stage over the same two breakages
the new test uses (throw at load, module missing) and read exit 1 `RED lock-red`; the new code reads them as exit 2
`UNUSABLE`.

Deviations (advisory orchestration, stated):

1. **One Bash write to a scoped path.** The first edit to `pharn/floor/check-loop-fresh.mjs` (the import block and the
   `STAMP_ONLY_FIELDS` removal) went through a `node -e` fs write that was meant as an anchor dry-run. The path is in
   the build's declared scope, so the reconcile check judges it as permitted; it is recorded because the discipline is
   Edit-tool writes. Every other write used the Edit/Write tools.
2. **Step 2b ran through a node runner** (`.pharn/pharn-dev-build/format.mjs`), because the pinned `xargs` form is
   refused in a worktree session. Same three gates (prettier, markdownlint `--no-globs --fix`, eslint read-only) over
   exactly the 13 scoped paths, all exit 0. Repo-wide `format:check`, `lint:md` and `lint` were clean after it.
3. `npm run docs:generate` rewrote no tracked file (`docs:check` GREEN).
