# NOTES — audit-integration-2026-11-03

Worker INT. Local branch `int/audit-2026-11-03`, cut from `origin/batch/audit-2026-11-03` at `fb997e4b` (group S
already merged). Pushed back to `batch/audit-2026-11-03` only as fast-forwards. Scope: the setter
`--from-plan` on this directory's `PLAN.md` (20 paths); every conflict resolved with Edit under it.

## Phase A, round 1 (2026-11-03)

| Merge                          | Branch head | Conflicts      | Resolution                                                                                                                                                                                                                                                                           |
| ------------------------------ | ----------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `fix/guard-wiring` (G3)        | `2d47bb29`  | `CHANGELOG.md` | G3's three `### Fixed` entries moved to the top of S's `### Fixed` group; G3's own second `### Fixed` heading dropped (one heading per type). `README.md`, `SECURITY.md`, `enforce-writes-scope.test.cjs` auto-merged; README/SECURITY diffs read and kept as both sides wrote them. |
| `fix/family-grammar-crlf` (G4) | `ffa6c8b4`  | `CHANGELOG.md` | G4's five `### Fixed` entries moved to the top of `### Fixed`; its second `### Fixed` heading dropped.                                                                                                                                                                               |
| `fix/reconcile-window` (G7)    | `f48bc71d`  | `CHANGELOG.md` | G7's two `### Fixed` entries moved to the top of `### Fixed`; its two `### Changed` entries auto-merged at the top of `### Changed`. `.dev/guides/floor-checks.md` auto-merged (G4 + G7 hunks are disjoint; read and kept).                                                          |

CHANGELOG check after each resolution (scratchpad script: every line each branch added to `CHANGELOG.md` is present,
no conflict marker, one heading per type in `[Unreleased]`, no duplicated entry): OK each time; after round 1
`[Unreleased]` holds `### Added | ### Changed | ### Fixed`, 23 entries.

No branch in round 1 changed `package-lock.json`, so no `npm ci` was needed beyond the initial one.

No `apply.py` is tracked on any merged branch. DOCS-PROPOSAL.md files now on the branch:
`.dev/features/guard-wiring/DOCS-PROPOSAL.md`, `.dev/features/reconcile-window/DOCS-PROPOSAL.md`.

### Gates after round 1

- `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked in "."`, exit 0.
- `npm run check` at `0a43da0f` → exit 0. Every gate green: Prettier "All matched files use Prettier code style!",
  ESLint clean, markdownlint "0 issues in 0 files", CATALOG GREEN, LESSONS-INDEX GREEN, SPECIFIED-MARKERS GREEN,
  VERSION-BADGE GREEN (7.2.1), SKILLS-VERSION-RECORDED GREEN (23 dated `[Unreleased]` entries), CONTRIBUTING-GATES GREEN,
  reconcile `NO_BASELINE` (this worktree never anchored), `node --test`: tests 6244, pass 6243, fail 0, skipped 1,
  duration 2 577 s (host load average 130–320 from other agents' suites; no timing failure).
