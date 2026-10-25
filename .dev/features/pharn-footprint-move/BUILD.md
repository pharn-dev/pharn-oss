# BUILD — pharn-footprint-move

Phase B of PLAN.md revision 3, built by `/pharn-dev-build` on top of the Phase A commit `54fe8f3a`. Step 0 set the
plan scope (316 paths, equal to the 316 `## Files` bullets, L71) and then anchored the reconciliation epoch at
`pharn/.run/reconcile/baseline.json`, the new store (3,233 paths). Step 1: `spec_content_hash` equals
`hash-doc.mjs pharn/ARCHITECTURE.md` (`d5a97430…`, re-pinned after the human patch), and no open questions remain.

## What landed

- The 253 section-B files, written through the hook-checked helper (each write spawned both real `PreToolUse` hooks
  with this worktree as the root and wrote only on exit 0 from both). Every file is byte-identical to the scratch
  build `wc3`, which `build/rebuild.sh` reproduces from scripts alone. After the writes, the whole worktree equals that
  copy, outside this feature folder and the runtime scratch.
- One edit after the copy: `pharn/floor/check-red-run.test.mjs` pins the live fingerprint ALGO in a message, so it
  follows `/2` → `/3`. The copy's full `npm test` (6,015 tests) had found it, as its single failure. The edit is one
  line, made under the build scope, and the same edit was applied to the copy.
- Step 2b ran the pinned format block over all 316 scoped paths. Prettier reformatted only the build-record scripts.
  ESLint then found 157 errors, all in the build record. The four `new-tests/*.cjs` files are fragments appended to
  the hook suites (they use the suites' imports), and two scripts are records that are never run. Those six files now
  carry an explained `eslint-disable` header. The other fourteen do not, so no directive is unused.

## Floor and checks

- `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`, exit 0.
- Repo-wide read-only confirmation: `format:check`, `lint` and `lint:md` all exit 0.
- Hook suites in place: 568/568. That includes the 31 new 7.0.0 security tests, and the seven promotion-origin tests
  that failed between Phase A and Phase B, as predicted in the Phase A commit.
- The PLAN's acceptance grep (explicit character class, PLAN revision 3 item 7) finds 0 lines over `.claude/` +
  `pharn/`.

## Decisions

- The build record under `build/` is kept as a record: its scripts carry the scratchpad paths they ran with, and
  `rebuild.sh` documents the order. `handfix-9d` (the one-line ALGO pin above) is described here rather than added
  as a file, because adding a path after the anchor would widen the plan (`plan-widened-after-anchor`).
- The L57/L61 probe added no ignore entry (PLAN revision 3 item 6).

## Fix round (PLAN.md revision 4)

- Human patch 2 (`apply.py` run 2, 14 edits to three hooks and `pharn/LIMITS.md`) landed and was committed in
  `2ae9f024`, before this round's anchor. All four files are byte-identical to the tested scratch copy.
- Step 0 re-anchored the epoch (3,240 paths, scope 329; the setter needed `--allow-claude-dir` because Section C names
  the hooks, which protect-trusted-paths still denies to every write tool). Step 1: the spec hash is unchanged.
- Step 2 wrote the 19 agent-side fixes, byte-identical to the copy. Their test suites ran there first: 1,755 tests,
  one expected failure, which the round also fixes by exempting and pinning the migration path.
- Steps 2b/3: `format:check`, `lint` and `lint:md` exit 0; `FLOOR: GREEN — 37 capabilities checked`.
