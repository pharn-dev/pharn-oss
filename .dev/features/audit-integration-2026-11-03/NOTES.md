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

## Phase A, round 2 (2026-11-03)

- `fix/loop-marker-integrity` (G2) @`65b72253` → `64bddc96`. Conflict: `CHANGELOG.md` only. G2's one `### Fixed` entry
  (with sub-bullets) moved to the top of `### Fixed`; its second heading dropped. Auto-merged with S:
  `check-run-isolation{,-core}.mjs` (S's `cred:env:GITHUB_TOKEN` / `CREDENTIAL_ENV_OFF_ACTIONS` and G2's flag-first
  `parseArgs` + usage line both present), `check-run-isolation.test.mjs`, `entry-gates.test.mjs`, `loop-record.md`,
  `command-hygiene.test.mjs`, `protect-trusted-paths.test.cjs`, `CLAUDE.md`, `README.md`. One INT edit:
  `check-run-isolation.mjs`'s header said the witness is state "the Write tool and Bash both reach"; since G2's
  `RUN_STATE_SUBTREES` deny in `protect-trusted-paths.cjs` only Bash does, and the header now says so (the contract,
  `loop-record.md`, already did). The protected hook scripts arrived only through the merge: `require-loop-record.cjs`
  and `protect-trusted-paths.cjs` are byte-equal to G2's head, `enforce-writes-scope.cjs` / `set-writes-scope.cjs`
  unchanged, `.claude/settings.json` byte-equal to G3's head.
- `fix/loop-record-honesty` (G6) @`bec9e110` → `e4c1da77`. Conflict: `CHANGELOG.md` only. G6's three `### Fixed`
  entries moved to the top of `### Fixed`. Auto-merged with G2: `pharn-loop-close.md`, `pre-run-snapshot-core.mjs`,
  `.dev/guides/floor-gates.md`, `.dev/guides/floor-orchestration.md` (disjoint hunks; read and kept). `loop-closeout.mjs`
  was touched by G6 only.
- CHANGELOG check (same script, all six branches' added lines): OK; `[Unreleased]` holds one heading per type, 27
  entries. No lockfile change.

### Gates after round 2

- `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked in "."`.
- `npm run check` at `e4c1da77` → exit 0. Every pre-test gate green as in round 1 (reconcile `NO_BASELINE`);
  `node --test`: tests 6327, pass 6326, fail 0, cancelled 0, skipped 1, duration 1 583 s.

## Phase A, rounds 3–5 (2026-11-03)

- `fix/lesson-heading-parser` (G9) @`0fdc39c3` → `5e8cb595`. Conflict: `CHANGELOG.md` only (three `### Fixed`
  entries to the group's top). Auto-merged and kept: `command-hygiene.test.mjs` (G9's removal of
  `pharn-dev-memory-promote.md` from `NPX_PENDING` and `MARKDOWNLINT_SITES`), the `enforce-writes-scope.test.cjs:326`
  comment, `pharn-dev-ship.md`'s header and 2b.4 comments. `npm run check` exit 0: tests 6359, pass 6358, fail 0,
  skipped 1. Pushed.
- `fix/dev-verdict-discipline` (G5) @`74122688` → `f469d5e2`. Conflict: `CHANGELOG.md` (G5's Added, Changed and Fixed
  entries each to its group's top). `pharn-dev-ship.md` auto-merged (G5's STOP rules + verdict block, G9's header
  comments, S's `npx --no-install` lines all present). INT edit: `pharn-dev-review.md` and `pharn-dev-verify.md` left
  `NPX_PENDING`. Ceilings re-measured: `pharn-dev-ship.md` 47 157 B ≤ 52 224, `pharn-dev-verify.md` 29 381 B ≤ 31 232
  (no change). `npm run check:ship-record` (`--merge-base origin/main`): GREEN, 56 product paths, green record
  `.dev/features/dev-verdict-discipline/SHIP.md`. `npm run check` exit 0: tests 6400, pass 6399, fail 0, skipped 1.
  Pushed.
- `fix/plan-scope-hardening` (G1) @`968441ed` → `8e58309b`. Conflicts: `CHANGELOG.md` (Added, Changed, Fixed to each
  group's top) and `.claude/hooks/set-writes-scope.test.cjs` (G1's widened flag list kept under S's corrected comment;
  G1's side still said "RED until that increment's apply.py has run"). The owner-applied `set-writes-scope.cjs`
  arrived through the merge and equals G1's head; `pharn-loop.md` carries G1's `--check` grant beside G2's grants.
  INT edit: `pharn-dev-build.md` left `NPX_PENDING`, which is now empty.
- Integration fixes for G1, `017ff1d5` (the plan's `## Files` widened first, setter re-run, 25 paths):
  - (a) `/pharn-dev-build` Step 2b PICK adds `&& real === path.join(root, p)`. Probe
    (`scratchpad/g1/probe-symparent.mjs`, run in a throwaway clone): G1's PICK → `canon via symlinked parent:
REFORMATTED`; with the check → `untouched`, `gp/mb/zz-probe.md` named on stderr, the plain control still
    reformatted. Pinned by a new `command-hygiene.test.mjs` assertion (mutant control: the regex fails on the PICK line
    with the clause removed); the build comment, the test comment, `.dev/guides/writes-scope.md` and G1's CHANGELOG
    entry say so.
  - (b) `apply-plan-deletions.mjs`'s reader-reason comment names the contiguous-list rule, not round 1's `:` rule.
  - (c) Re-measured (`scratchpad/int-tools/wf-count.mjs`, the dd0bb3d3 setter vs G1's, dev posture): of 342 committed
    plans the pre-batch scope named a `.github/workflows/` path for 16 (28 mention it in text); 7.3.0 refuses 14 of them
    first for exec config and 2 first for a split list. The guide's "17 of 342" became that statement; the CHANGELOG's
    "14 CI workflow" now says it counts by first refusing rule.
  - (d) G1's CHANGELOG line: only `/pharn-dev-memory-promote`'s canon `--check` line was a no-op, and G9 removed it;
    `/pharn-memory-promote`'s `vendor/bin/prettier --check` line reads an installed project's canon. S's two entries
    no longer call four dev commands pending.
  - `npm run check` exit 0: tests 6435, pass 6434, fail 0, skipped 1. Pushed.
- `fix/review-quoting` (G8) @`790c0f72` → `9d4c08b9`. Conflicts: `CHANGELOG.md` (Changed and Fixed to each group's top),
  `pharn/floor/cli-stdout-flush.test.mjs` (`FLUSH_CLIS` keeps G4's `validate.mjs` row and G8's `merge-findings.mjs`
  row), `.dev/guides/floor-checks.md` (G5's `check-ship-record` section, with its code fence closed, then G8's
  merge/render section). Auto-merged: `.prettierignore` and `.markdownlint-cli2.jsonc` (G1's two canon dirs and G8's
  `pharn/features/*/REVIEW.md`), `command-hygiene.test.mjs` (`pharn-review.md` 30 877 B ≤ 34 304 beside G5's
  ceilings), `merge-findings.mjs` (G8 only). G8 tracks no file under `pharn/.run/`.

### Gates after round 5 (head `9d4c08b9`)

- `npm run check` exit 0: every pre-test gate green, reconcile `NO_BASELINE`; tests 6467, pass 6466, fail 0,
  cancelled 0, skipped 1, duration 600 s. No `entry-gates.test.mjs` TAKEOVER failure in any of the six runs.
- `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked in "."`.
- `npm run check:ship-record` → `SHIP-RECORD: GREEN — 66 product-surface path(s) changed; green record(s):
".dev/features/dev-verdict-discipline/SHIP.md"` (`--merge-base origin/main`, `dd0bb3d3`). Every other SHIP.md carries
  no verdict block (legacy: neither green nor red).
- `npm run check:changelog-entry` → `CHANGELOG-ENTRY: GREEN — 39 new entr(ies) … no merged entry or released heading
changed`.
- `npm run check:surface-bump` → RED `NOT_BUMPED`, expected until Phase C's 7.3.0 bump.
- CHANGELOG `[Unreleased]`: one heading per type, 39 entries, no duplicate; every branch's added line present except
  the four G1 lines rewritten by fixes (a), (c) and (d).

## Phase B — owner docs script (2026-11-03)

- Script: `apply-docs.py` in this session's scratchpad (`int-docs/`), untracked and outside the repo. It is 476 KB
  (the five targets' full new bytes, base64), too large to write through the Write tool, and a Bash write inside the
  repo is the bypass CLAUDE.md forbids, so it lives outside. Generated by `int-tools/gen-apply-docs.mjs` from 27 edit
  blocks plus the canon entry; every block's old text matched the live file exactly once.
- Sources: the six `DOCS-PROPOSAL.md` files (G3 guard-wiring 2, G2 loop-marker-integrity 5, G1 plan-scope-hardening 4
  with sub-parts, G7 reconcile-window 3, G8 review-quoting 2, G9 lesson-heading-parser Option B) and the orchestrator's
  SPEC list 1–7, each re-verified live first. SPEC 1 checked against `gh api` (rulesets 18045407 / 25907495 /
  25907484, classic protection); SPEC 4 measured (three of the four hooks contain the word `kind`, none reads a
  capability's `kind:`); SPEC 5 measured (62 of 65 `pharn/floor/` CLIs and all 13 `.dev/floor/` CLIs import
  `runtime-floor.mjs` first; three load it inside `run()`).
- Canon: L82 correction entry (G9 Option B), candidate re-validated with `check-provenance.mjs` (GREEN, id unique).
- Repo edit that must land with the applied docs (Phase C): `.dev/floor/specified-primitives.json`'s
  `community-privilege` LIMITS marker and its comment (`scratchpad/int-tools/marker-edit.mjs` holds the two exact
  replacements). Without it `check:markers` REDs (measured in the clone).
- Clone proof (fresh clone of `9c8c1e6d`, own `npm ci`): script exit 0, every BEFORE and AFTER hash ok; marker edit;
  `npm run docs:generate` (lessons index: 82 lessons); committed; `npm run check` exit 0 (all pre-test gates GREEN incl.
  `check:markers` and `docs:check`, reconcile `NO_BASELINE`, tests 6467 / pass 6466 / fail 0 / skipped 1);
  `validate.mjs` GREEN.

## Phase C — applied docs and the 7.3.0 release (2026-11-03)

- Orchestrator decisions done before the apply: `CONTRIBUTING.md:79, 92, 160` no longer say an admin merge bypasses
  required checks (ruleset 25907495 has no bypass actor; the per-PR steps run in the required `check` job), with a
  CHANGELOG entry; G9's entry says "`## L20` with and without a trailing space" (`b6cc3840`). The same stale claim in
  two test comments (`instruction-growth-wiring.test.mjs:21`, `check-surface-bump.test.mjs:19`) is corrected
  (`b9e6ce2f`).
- The owner ran `apply-docs.py`. AFTER hashes verified on disk, all five equal the pins (LIMITS `5fa849f6…`,
  THREAT-MODEL `73a6a524…`, CONSTITUTION `8f0c7cad…`, ARCHITECTURE `ab4dbd92…`, lessons-learned `8d7e7fd3…`).
  `origin/main` had not moved (`dd0bb3d3`), so no merge.
- `84153e16` "audit-integration: maintainer-applied docs patch": the five files, the `specified-primitives.json` marker
  edit (Edit; byte-equal to the clone-proven file) and the regenerated `docs/lessons-index.md` (byte-equal to the
  clone's), committed before any gate ran (L68). Both scratchpad scripts (`apply-docs.py`, `apply-docs.lab.py`) were
  then deleted.
- `151ce894` "release: 7.3.0": `SKILLS_VERSION` 7.3.0, README badge, `## [7.3.0] - 2026-11-03` opened directly above
  `[7.2.1]` with every `[Unreleased]` entry moved into it (the `[Unreleased]` heading and its guidance comment stay,
  empty), plus one entry for the trusted-doc and canon patch. `MIN_CLI` unchanged (no installed path moved).

### Gates at `151ce894`

- `npm run check` exit 0: Prettier clean, markdownlint 0 issues, CATALOG / LESSONS-INDEX / SPECIFIED-MARKERS /
  VERSION-BADGE (7.3.0) / SKILLS-VERSION-RECORDED (`[7.3.0]` newest, 0 `[Unreleased]` entries) / CONTRIBUTING-GATES
  GREEN, reconcile `NO_BASELINE`; tests 6467, pass 6466, fail 0, cancelled 0, skipped 1.
- `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked in "."`.
- `npm run check:changelog-entry` → GREEN, 41 new entries, opens `## [7.3.0] - 2026-11-03`.
- `npm run check:surface-bump` → GREEN, 70 product paths, `7.2.1` → `7.3.0`.
- `npm run check:ship-record` → GREEN, green record `.dev/features/dev-verdict-discipline/SHIP.md`.
- `npm run check:instruction-growth` → `within`.
