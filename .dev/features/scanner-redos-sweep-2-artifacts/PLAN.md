# PLAN — scanner-redos-sweep-2-artifacts

- spec_content_hash: 2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e
- applied_lessons: none
- increment: Land the four `/pharn-dev-ship` trail files of `scanner-redos-sweep-2` (VERIFY.md, verify-report.json,
  REVIEW.md, SHIP.md) that missed PR #377: it was squash-merged before the builder's last push (commit `41922bca` on
  `origin/fix/scanner-redos-sweep-2`). The files are taken byte-for-byte from that commit.
- layer(s): dev trail only (no SKILLS_VERSION bump)
- constitution_refs: [P6]

## Trigger (P7)

PR #377 merged at 08:53Z with PLAN, GRILL, REGRESSION and MEASUREMENTS but without the verify, review and ship records,
so main's trail for 6.71.2 stops at regress.

## Applied lessons

`none`: copying an existing audit trail onto main; no promoted lesson governs it.

## Change

`git checkout 41922bca -- .dev/features/scanner-redos-sweep-2/` (the four files, unchanged; SHIP.md still says the PR
was opened, as it was when written) and one dated `[Unreleased]` CHANGELOG entry.

## Files

- `.dev/features/scanner-redos-sweep-2-artifacts/PLAN.md` — this plan. — layer: dev trail
- `.dev/features/scanner-redos-sweep-2/VERIFY.md` — from `41922bca`. — layer: dev trail
- `.dev/features/scanner-redos-sweep-2/verify-report.json` — from `41922bca`. — layer: dev trail
- `.dev/features/scanner-redos-sweep-2/REVIEW.md` — from `41922bca`. — layer: dev trail
- `.dev/features/scanner-redos-sweep-2/SHIP.md` — from `41922bca`. — layer: dev trail
- `CHANGELOG.md` — one dated `[Unreleased]` entry. — layer: repo meta

## Gates

`npm run format:check`, `npm run lint:md`, `npm run check:changelog`, `npm run check:changelog-entry`,
`npm run check:surface-bump`, `node pharn/floor/validate.mjs .`; CI runs the full suite.
