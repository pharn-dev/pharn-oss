# BUILD — test-infra-plan-scope

Built on `review-fix/test-infra-plan-scope` from `7bcd7a8` (6.20.5). Spec hash re-computed with
`.dev/floor/hash-doc.mjs` = the plan's pin (`4950796f…`). Scope set `--from-plan` (24 paths), reconcile baseline
anchored AFTER the setter (`--by pharn-dev-build`, 2230 paths). **Floor: `node pharn/floor/validate.mjs .` exit 0 —
`FLOOR: GREEN — 36 capabilities checked`.**

## What landed

- **`pharn/floor/test-infra-core.mjs`** — `isRunnerConfigName` (the one predicate: `CONFIG_NAME_RE` over `foldName`),
  `MANIFEST_FILE`, `PIN_MANIFESTS` (`package.json` + test-results-core's `CONFIG_FILE`), `testInfraPathKind(entry)`
  (the raw `## Files` entry through ac-tests-core's `scopedPath`, then `config` | `manifest` | `null`). The root
  listing, `pinShapeError` and `readScripts` go through them. Header: the fold and why, the plan-time reuse, the
  "does not catch" list amended (the fold's bound, the case-sensitive over-pinning), the remedy split (accidental vs
  intended change).
- **`pharn/floor/check-ac-tests.mjs`** — KINDS + `test-infra-in-plan`; `checkMapping` returns `notes`; the CLI prints
  `NOTE —` lines on both paths without touching the exit code; the GREEN line names the new coverage; header.
- **Tests** — `test-infra-core.test.mjs` (name set folded, the old `VITEST.CONFIG.TS`-is-not-a-member assertion
  reversed deliberately; the review's case-variant repro; a case-variant config present at pin time is pinned and
  shape-valid; `testInfraPathKind` over 16 entries; ✧ closure over every non-test floor module),
  `check-ac-tests.test.mjs` (the kind over five spellings; non-reaching entries stay GREEN with no note; manifests exit
  0 with exactly one NOTE, and on the RED path too; a bootstrap SPEC never reaches the check; ★ HOOK with the real
  setter + enforcer), `check-test-stage.test.mjs` (appended `describe` block: `mapping-red` carrying the kind; a config
  and a case-variant config after the lock → `lock-red`; `package.json` keeps READY), `check-red-run.test.mjs` (the
  interactive offer and `blockedLine` name exactly `/pharn-ship`). Every test creates ONE spelling per directory, so
  APFS and CI's Linux agree (grill G-fs).
- **Prose** — `ac-tests.md` (the kind after the table — the table is not re-padded, to keep group F's rebase local;
  the pin section: the fold, its bounds, the remedy split, the `/3` and forward-compatibility migration; the rebuild
  bullet; the proof line), `pharn-build.md` (the rebuild paragraph + the never-change instruction), `pharn-plan.md`
  (Step 4c bullet, RED handling, guarantee-audit line), `pharn-test.md` (the offer), `CLAUDE.md`, `README.md` (one
  paragraph + the badge), `CHANGELOG.md` `[6.21.0]`, `SKILLS_VERSION` 6.21.0. `npm run docs:generate`: every
  generated region already current (no generated file changed).

## Measured on the fix (the review's repros, re-pointed at this worktree)

- `review/a3/infra-repro.mjs`: `check-ac-tests FULL (PLAN names vite.config.ts)` → **exit 1**
  `RED — test-infra-in-plan` (was exit 0 GREEN).
- `angleE/repro5-case-config.mjs`: configs `[]` → `[{"path":"Vitest.config.ts",…}]`, `diffTestInfra` →
  `["Vitest.config.ts: a runner config was added"]` (was `[]`).
- Suites, with this increment's tests: `test-infra-core` 11/11, `check-ac-tests` 41/41, `check-test-stage` 30/30,
  `check-red-run` 27/27 (109 across the four, re-run after formatting).

## Amended during the rebase onto `8eec2d7` (6.20.6, PR #269)

- Main's 6.20.6 made `check-test-stage.mjs` read a child's exit 1 without a `RED —` line as a crash (exit 2). The
  NOTE lines on `check-ac-tests.mjs`'s RED path now print BEFORE the closing `RED — N … failed` summary, so the
  closing line stays the RED line (main's ✧ L29 source pin was already satisfied; this keeps its wording true).
- Main's crashed-child test broke `test-infra-core.mjs` to crash the LOCK child. Since this increment
  `check-ac-tests.mjs` imports it too, so the mapping child's `--spec` call crashed first and the test read
  `UNUSABLE — check-ac-tests.mjs --spec exited 1` (still exit 2, never a RED — the property held; the attribution
  moved). Measured the two children's static import closures: only `ac-tests-lock.mjs`, `red-run-core.mjs`,
  `reconcile-baseline.mjs` and `worktree-fingerprint.mjs` load in the lock child alone. The lock cases now break
  `red-run-core.mjs` (a direct import of the lock child; the parent imports only node builtins), the mapping case's
  anchor follows the renamed line, and a fourth case pins the shared-dependency crash. `check-test-stage.test.mjs`
  32/32.
- Conflicts resolved: `SKILLS_VERSION` and the README badge → 6.21.0; `CHANGELOG.md` taken from main (its `[6.20.6]`
  byte-identical) with the `[6.21.0]` section re-inserted above it (renumbered "6.20.6 → 6.21.0"). `CLAUDE.md`,
  `ac-tests.md` and `check-test-stage.test.mjs` merged without conflict; both sides kept.

## Deviation (advisory orchestration, recorded)

Step 2b's pinned shell form (`xargs`, `$VAR` capture) is refused by this isolated worktree's Bash guard. The same
three scoped gates ran through a node runner under `.pharn/pharn-dev-build/` (spawnSync, argv arrays, the paths in
`.pharn/writes-scope.json` that exist — 17): prettier exit 0 (re-wrapped `check-ac-tests.test.mjs` and
`pharn-test.md`), markdownlint exit 0 (0 issues), eslint exit 0. The runner was deleted before the whole-repo lint.
The four suites were re-run after formatting: 109/109. The whole-repo READ-ONLY confirmations then ran clean:
`npm run format:check` ("All matched files use Prettier code style!"), `npm run lint:md` (0 issues), `npm run lint`
(exit 0). The machine was shared with other agents' gate runs, so `prettier --check .` took several minutes; no
timeout or retry was involved.
