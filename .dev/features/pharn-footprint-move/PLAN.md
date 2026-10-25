# PLAN — pharn-footprint-move

- spec_content_hash: d5a974303fd0b9568945c60423ae5a89c57d7b65f5baa03657e317fbe64f33a5 # re-pinned after Phase A (was 2c84959c…, `pharn/ARCHITECTURE.md` at 7e71753c)
- applied_lessons: [L26, L29, L31, L41, L45, L49, L50, L57, L61, L68, L71, L73, L75]
- increment: Move `THREAT-MODEL.md`, `LIMITS.md`, `memory-bank/`, `pharn.spec-template.md` and the `.pharn/` scratch
  under `pharn/` (to `pharn/THREAT-MODEL.md`, `pharn/LIMITS.md`, `pharn/memory-bank/`, `pharn/spec-template.md`,
  `pharn/.run/`), so an installed project's PHARN footprint at root is `.claude/`, `pharn/` and the JSON files.
  Breaking: SKILLS_VERSION 7.0.0, MIN_CLI 0.14.0.
- layer(s): pharn-contracts, pharn-core, pharn-pipeline, pharn-review (path cites only), product floor, product
  `.claude` surface (commands + hooks + settings), dev floor and dev commands, repo config and docs
- constitution_refs: [P0, P2, P4, P5, P6, P7]
- base: `origin/main` @ `7e71753c` (SKILLS_VERSION 6.75.0, MIN_CLI 0.5.0)
- revision: 3 — after the scratch-copy build; see "Revision 3" below (revision 2: after `/pharn-dev-grill`)

> **Re-pin note.** `spec_content_hash` above is `pharn/ARCHITECTURE.md` at `7e71753c` (unchanged since `30968218`).
> Phase A (the human patch) edits that file, so it is the one plan line re-pinned after Phase A lands and before
> `/pharn-dev-build` Step 1 runs. The Phase A hand-back shows the maintainer the old and new hash (grill, inline P0).

## Revision 2 (what grill changed, and why)

Grill's findings are advisory. These six changed the plan because the build would fail without them:

1. **Phase A now holds everything the build machinery runs, with its tests** (grill coupling P3, testability P1). That
   means the hooks and their tests, the reconcile chain with its tests and data, the nine `pharn-dev-*` commands, the
   dev floor and `.gitignore`. As drafted, `/pharn-dev-build` would have followed stale `.pharn/` instructions, and
   the hooks would have been verified against tests that still asserted the old paths.
2. **`## Files` lists every file written**, including the feature's own `apply.py`, `HUMAN-PATCH.md`, `rewrite.mjs`,
   `rewrite-hits.tsv` and `write-log.tsv`, the walker modules and their tests (grill architecture P6). A set scope
   does not include `.dev/features/**`.
3. **Five capability walkers, not two** (grill architecture P3): `validate.mjs`, `capability-catalog-core.mjs`,
   `count-grillers.mjs`, `count-lenses.mjs`, `count-verifiers.mjs`.
4. **R3's quoted form is report-only** (grill error-handling P7). Each quoted `"memory-bank"` is fixed by hand,
   because concept tags and `join(dir, ".dev", "memory-bank")` are not root paths.
5. **The acceptance grep is written out below**, so grill, verify and review run the same command (grill
   testability P0).
6. **Phase A's writes are labeled advisory.** They land before the anchor, so reconcile never sees them. The only
   checks are the hook-checked helper and review of the Phase A commit diff (grill security P2).

## Revision 3 (what building the change in a scratch copy found)

The whole change was built in a scratch copy of the tree first, by replayable scripts (`build/`: the rewrite, twelve
hand-fix scripts, the `apply.py` generator and a `rebuild.sh` that replays them in order). A fresh rebuild reproduces
the copy byte for byte. These findings changed the work. None changes the intent.

1. **Five spellings of the old paths, not two.** Beyond the slash and segment forms there are a bare `.pharn` in prose,
   an escaped regex literal (`\.pharn\/`, 27 hits in 16 files), a double-escaped regex source built with
   `new RegExp(`…`)` (`memory-bank\\/`, 4 sites), and root paths written after a placeholder, a link name or a `../`
   (`<root>/.pharn/`, `s\x/LIMITS.md`, `../.pharn/`). Rules `E1`–`E5b` and `R5p` and the hand fixes cover them.
2. **A positional bug I introduced, caught by the suite.** Adding `pharn` to `stage-agent.mjs` `stateParts()` shifted a
   hard-coded `rel[2]` ("the run's own directory"), so results would have landed one directory too high. It now reads the
   last component.
3. **Fixtures that linked all of `pharn/` into a scratch tree.** Five suites did. With the state root under `pharn/`,
   the scratch would have been written through the link into the repository. The new `pharn`-segment refusal stops
   it. Four fixtures now build a real `pharn/` and link its shipped members one by one. The fifth, in `check-spec`,
   links `pharn/` on purpose to test the symlinked-root refusal, and stays.
4. **`worktree-fingerprint` ALGO moves from `/2` to `/3`.** What is hashed changed (the excluded state root moved), and
   the module's own rule requires a bump. The new golden digest was recomputed independently from the documented
   composition, and that recomputation reproduces the recorded `/2` value from the old fixture. A stamp straddling the
   update re-runs once: the fail-closed direction. CHANGELOG [7.0.0] and `gate-run-record.md` say so.
5. **A stated bound, no code change.** When `pharn/` holds no tracked file, git reports an untracked scratch root as
   `?? pharn/`, which reads as a dirty tree. That is the safe direction (HEAD as the base), and every install tracks
   files under `pharn/`. `instruction-files.mjs` and `stage-regress.mjs` now state it.
6. **The L57/L61 probe ran.** A malformed `.md` was planted under each directory. `prettier --check .` reaches neither
   (both are gitignored). `markdownlint` reaches both, as L61 says. No ignore entry is added: nothing in this repository
   writes markdown to `pharn/.backup/` (only pharn-cli does, in an installed project), and `pharn/.run/` keeps the
   per-entry rule (its one entry, the lessons-index cache, moved). P7: there is no trigger.
7. **The acceptance grep had a blind spot.** `git grep -E` does not support `\b`, so `\.pharn(/|\b)` never matched a bare
   `.pharn` (measured: 1 of 2 lines on a two-line probe). The command below uses an explicit character class. It finds
   0 lines either way.
8. **`## Files` is now exactly the changed set.** It adds `.dev/floor/node-test-results-reporter.test.mjs`,
   `pharn/floor/check-loop-fresh.mjs`, `pharn/floor/regress-base-reuse-core.test.mjs` and `docs/lessons-index.md`. The
   lessons index changes because its generator's header cites `LIMITS.md §1c`, so it is regenerated, never edited. It
   drops eight declared files that turned out unchanged, and it adds the build scripts under `build/`.

## Correcting the record (the prompt was verified against `56e3989`; this plan against live `7e71753c`)

- **The base moved.** The prompt names SKILLS_VERSION 6.73.2. Live `main` is 6.75.0 at `7e71753c` (#393–#396). This
  changes no cited line: every path:line in the prompt still holds, and the hit list is the same 303 files at both
  bases.
- **pharn-cli is published:** `npm view @pharn-dev/pharn dist-tags` → `latest: 0.14.1` (2026-10-25). `MIN_CLI` 0.14.0
  is satisfiable. Merging stays the maintainer's GATE-2 decision.
- **The CLI's names, verified against the published 0.14.1 bundle** (`dist/index.js`, read, never run):
  `ROOT_MOVES_FROM_MAJOR=7`; `USER_DATA_MOVES` = `memory-bank` → `pharn/memory-bank`, `pharn.spec-template.md` →
  `pharn/spec-template.md`; `BACKUP_DIR="pharn/.backup"`; gitignore HINTS (printed, never written) `.pharn` →
  `pharn/.run/`, `.pharn-backup` → `pharn/.backup/`, `.pharn.lock` → `pharn/.lock*`; the old `.pharn/` is reported
  deletable except `ci.yml`; `PHARN_ROOT_FALLBACK_DOCS` reads `THREAT-MODEL.md`/`LIMITS.md` at root when
  `pharn/` lacks them; `--ref <ref>` selects what `init`/`update` install. The plan's names match.
- **The prompt's `.pharn` segment-form list is incomplete.** It names 10 hook sites. The live tree has 366 quoted
  `.pharn` segments: 331 sit inside a `join()`/`resolve()` argument list (rule SEGj, below), and 35 need a hand fix.
  The hand-fix table is under "The rewrite".
- **Two more walks start AT the state root.** `build-gate.mjs` and `run-gates.mjs` (three sites) call
  `containmentWalk(rootAbs, …)` with `rootAbs` = the state root. The walk lstats the root itself, and that lstat
  follows a symlink at `pharn` above it. Before the move the root's parent was the project root. After it, a link
  at `pharn` would be unseen. So both now check both segments first.
- **Blast-radius counts, live** (shipped surface `.claude/` + `pharn/`, minus `pharn/features/`):
  `THREAT-MODEL.md` 119 files / 152 hits; `LIMITS.md` 99 / 226; `memory-bank/` 40 / 205, of which 102 hits are
  root-anchored; `.pharn/` 133 / 797; `pharn.spec-template.md` 13 / 32.
- **The `.pharn/` → `pharn/.run/` rename is not a rename for the write guard.** In an installed project outside a run
  (`permissive` mode), `enforce-writes-scope.cjs` never reads `ALWAYS`, and `isReserved()` denies all of `pharn/**`
  except `pharn/features/**` (`.claude/hooks/enforce-writes-scope.cjs:648-653`, `:1326-1369`). A plain rename would
  start denying every scratch write outside a run that is allowed today. The guard therefore exempts `pharn/.run/`
  exactly as it exempts `pharn/features/` (matched on the unfolded path, as written: B2). The setter carries a
  byte-equal ✧-pinned copy of `isReserved()`, so both copies change together (L31).
- **Moving `memory-bank/` under `pharn/` tightens the guard in one place, and the plan accepts that.** Non-canon files
  under `pharn/memory-bank/` become reserved outside a run. Canon was protected already. A deny-direction change,
  stated in the CHANGELOG.
- **This increment moves the reconcile store**, so the reconcile chain moves in Phase A, before the anchor.
- **Historical text is excluded:** `.dev/features/**`, `.dev/memory-bank/**`, `.dev/measurements/**` (8 dated run
  records), `.dev/floor/test-fixtures/changelog-per-pr/{base,head}.md` (snapshots of released CHANGELOG text), merged
  CHANGELOG entries, `pharn/features/**`. `docs/lessons-index.md` is regenerated, never edited; its titles quote
  `.dev/memory-bank/lessons-learned.md` verbatim, and canon is append-only, so its `LIMITS.md` cites stay.

## Sequencing (three phases on one branch)

**Phase A: the machinery, pre-anchor.** Phase A lands as one commit before `/pharn-dev-build` anchors the
reconciliation epoch, so a human's correct write is never read as an escape (L68). It also means **reconcile never
sees Phase A**. Its writes are checked only by the hook-checked helper and by review of the commit diff: ADVISORY.

1. The agent writes the Phase A agent files (`## Files`, section A) under `set-writes-scope.cjs --from-plan`. That
   includes the hook test suites, rewritten and extended first, with the new security tests (tests first).
2. The agent writes `.dev/features/pharn-footprint-move/apply.py` and `HUMAN-PATCH.md`. `apply.py` carries
   sha256-pinned BEFORE and AFTER hashes and exact-once old/new text for the 10 hook-protected files, and performs the
   two renames. It refuses, writing nothing, unless every pin matches.
3. The maintainer runs `python3 .dev/features/pharn-footprint-move/apply.py --dry-run`, then without `--dry-run`.
4. The agent verifies in this repo, never only in a copy (L26). It runs the hook suites, the reconcile-chain suites
   and the dev-floor suites, and eslint, prettier and markdownlint over the Phase A paths. It then commits Phase A as
   one commit and re-pins `spec_content_hash`.

**Phase B: `/pharn-dev-build`.** The build follows the Phase A text of its own command. Step 0 runs the moved setter
and anchor (both write `pharn/.run/`). The build writes section B: the product floor, the product commands, contracts,
capabilities, docs, the walkers, versions and the CHANGELOG. The tests come first for every behavior change: walker
exclusions, `canon-root`'s default and the state-root walks.

**Phase C: the gated chain.** Regress, verify, review, GATE 2.

- `/pharn-dev-regress` uses the branch's merge-base with `main` (`7e71753c`) as its base. A base at the Phase A commit
  would hide Phase A from the comparison.
- `/pharn-dev-verify` adds two checks. The acceptance grep (below) runs as a recorded step. Coverage is reported per
  touched `.cjs`/`.mjs` as the diff coverage of changed lines (`node --test --experimental-test-coverage`). The ≥90%
  bar is held there, and whole-file numbers are listed beside it.
- The `/pharn-loop` acceptance run needs this branch on GitHub (`pharn init --ref <branch>` on a scratch project, with
  the CLI 0.14.1). Pushing is the maintainer's call at GATE 2. Until then the line stays open.

## The rewrite

`.dev/features/pharn-footprint-move/rewrite.mjs`, dry-run first. It emits `rewrite-hits.tsv`, one row per hit (file,
line, rule, old, new), the per-hit record L75 asks for.

| rule | from (root-anchored only)                 | to                                        |
| ---- | ----------------------------------------- | ----------------------------------------- |
| R1   | `THREAT-MODEL.md`                         | `pharn/THREAT-MODEL.md`                   |
| R2   | `LIMITS.md`                               | `pharn/LIMITS.md`                         |
| R3   | `memory-bank/`                            | `pharn/memory-bank/`                      |
| R3q  | quoted `"memory-bank"`                    | REPORT ONLY — each site fixed by hand     |
| R4   | `pharn.spec-template.md`                  | `pharn/spec-template.md`                  |
| R5   | `.pharn/` (never `.pharn/ci.yml`)         | `pharn/.run/`                             |
| R5b  | bare `.pharn` (prose, not a quoted value) | `pharn/.run`                              |
| SEGj | `".pharn"` inside a `join()`/`resolve()`  | `"pharn", ".run"`                         |
| SEG  | any other quoted `".pharn"`               | REPORT ONLY — the hand-fix table below    |
| LINK | a relative markdown link target           | resolved through the move, re-relativized |

- **Root-anchored** means not preceded by `/`, `.`, a letter, a digit, `_` or `-`.
- **Markdown links are resolved, not string-replaced.** Links are masked while the token rules run.
- **The hand-fix table (SEG, 35 sites; 12 in code).** Each scratch-root symlink walk gets both segments: `enforce`
  `dotPharnStateBad()` and `scanRuns()`, `require-loop-record` marker walk, `set-writes-scope` `openLoopRuns()`,
  `run-marker` `symlinkOnPath()`, `stage-agent` `stateParts()`, `stage-direct` `acquireLock()`, `build-gate` and
  `run-gates` state-root walks. Constants and comparisons become `"pharn/.run"`: `build-gate`, `run-gates`,
  `stage-regress`, `stage-verify` `STATE_ROOT`; `seam-config-materialize` `OUT_DIR`; `ac-tests-core` `badPath`;
  `apply-plan-deletions`; `test-infra-core`; `worktree-fingerprint` `isExcluded`. The 23 test sites follow their
  module. `rewrite-hits.tsv` lists all 35 by line.
- **History in prose.** A comment that dates a behavior is rewritten to the new path. A sentence about the move
  itself keeps the old path, marked as a migration note.

## The acceptance grep (run at verify and review; the same command each time)

```bash
git grep -n -E '(^|[^A-Za-z0-9_/.-])(THREAT-MODEL\.md|LIMITS\.md|memory-bank/|pharn\.spec-template\.md)|(^|[^A-Za-z0-9_/-])\.pharn(/|[^A-Za-z0-9_-]|$)|["'"'"']\.pharn["'"'"']' -- .claude pharn ':!pharn/features' | grep -v -E '\.pharn/ci\.yml|migration'
```

Expected: empty, except lines that name the old path as a migration note (each such line says "migration", which is
what the second filter keys on, and each is listed in `VERIFY.md`). A recorded step, an enum-regex check, not a
committed checker (P7).

## Security-critical surfaces (tests first, all in Phase A)

1. **`protect-trusted-paths.cjs`** (human patch). `DEFAULT_PROTECTED`: `THREAT-MODEL.md`/`LIMITS.md` → `pharn/…`;
   `.pharn/writes-scope.json` → `pharn/.run/writes-scope.json`; `pharn.spec-template.md` → `pharn/spec-template.md`.
   `PROTECTED_SUBTREES` and `CANON_FILES`: `memory-bank` → `pharn/memory-bank`. Case-fold, trailing dot/space strip
   and segment-wise symlink resolution unchanged. New tests: `PHARN/.RUN/WRITES-SCOPE.JSON`,
   `pharn/Memory-Bank/lessons-learned.md`, `PHARN/LIMITS.md`, `pharn/LIMITS.md.` and `pharn/LIMITS.md` with a
   trailing space are denied; a symlinked `pharn` dir reaching them is denied; the old root `LIMITS.md`,
   `THREAT-MODEL.md`, `memory-bank/x.md` and `pharn.spec-template.md` are writable again.
2. **`enforce-writes-scope.cjs`** (human patch). `ALWAYS = ["pharn/.run/**"]`; `SCOPE_FILE`; `isReserved()` exempts
   `pharn/.run/` as written; both symlink checks refuse a link at `pharn` or `pharn/.run`; the run-marker scan reads
   `pharn/.run/<command>/`. New tests, one table iterated (L29): under `ALWAYS` alone, each of
   `pharn/CONSTITUTION.md`, `pharn/ARCHITECTURE.md`, `pharn/THREAT-MODEL.md`, `pharn/LIMITS.md`,
   `pharn/spec-template.md`, `pharn/memory-bank/lessons-learned.md`, `pharn/memory-bank/x.md`, `pharn/floor/x.mjs` is
   denied in the dev, unsignalled, install-permissive and install-safeset postures, as are `pharn/.run/../floor/x.mjs`,
   `pharn/.run/../../LIMITS.md`, `PHARN/.RUN/../floor/x.mjs`, `pharn/.run./x`, a trailing-space `pharn/.run`, and a
   `pharn/.run` symlink to `pharn/floor`.
3. **`set-writes-scope.cjs`** (human patch). The loop-state walk (both segments), `--clear` and the write path. New
   test: the setter writes exactly the file the enforcer reads (spawn the setter, then the enforcer on a scoped path:
   allow; `--clear`: default), plus a ✧ pin binding the three copies of the scope-file path (L31).
4. **`require-loop-record.cjs`** (human patch). `STATE_SUBDIR = path.join("pharn", ".run", "pharn-loop")`; the
   symlink walk covers `pharn`, `pharn/.run`, the state dir, the run dir and the marker. New tests: an open marker at
   the new path blocks Stop; a link at `pharn` is refused; a marker only at the old `.pharn/pharn-loop/` does not count.
5. **`pharn/floor/canon-root.mjs`** (Phase B). `DEFAULT_CANON_ROOT = "pharn/memory-bank"`. Every importer of the
   parser gets a no-flag test, enumerated by the test from the import set (L41, L29).
6. **`.claude/settings.json`** (human patch): its `_comment` only; `hook-wiring.test.cjs` re-runs (L45).

## Everything else (Phase B)

- **Product commands, contracts, capabilities, product floor:** the rewrite plus the hand-fix table.
- **Walkers (5):** `pharn/.run` and `pharn/.backup` join `EXCLUDE_SEGMENTS`. A test plants a capability copy under each
  and asserts every walker's count is unchanged.
- **Repo config:** `.markdownlint-cli2.jsonc`, `.prettierignore`, `.github/PULL_REQUEST_TEMPLATE.md:21`,
  `.github/workflows/ci.yml:72`. Probed, not assumed (L61, L57): a malformed `.md` planted under `pharn/.run/` and
  `pharn/.backup/`, then `prettier --check .` and `npm run lint:md`. An ignore entry is added only where the probe reds.
- **Lessons-index cache:** `gen-lessons-index.mjs`, `lessons-index-core.mjs` and `/pharn-plan` move together.
- **Docs:** `README.md` (links; the install tree redrawn with root = `.claude/`, `pharn/`, `pharn.config.json`; the
  three gitignore lines), `SECURITY.md`, `CONTRIBUTING.md`, `CLAUDE.md`, `docs/*.md`, `.dev/guides/*.md`.
- **Versions:** `SKILLS_VERSION` → `7.0.0`, `MIN_CLI` → `0.14.0`, and one new CHANGELOG section `## [7.0.0]`, which
  also takes the `[Unreleased]` entry from #394 unchanged. Its migration notes:
  - finish or abandon any open `/pharn-ship`, `/pharn-loop` or `/pharn-review` run before `pharn update`. A marker
    left under `.pharn/` is never read again, so an interrupted loop's Stop guard is off (grill observability);
  - run `pharn update` with CLI ≥ 0.14.0. It moves `memory-bank/` and the SPEC template, and removes unedited root
    copies of the two docs. If it reports a move it could not make, make it by hand: until then the root
    `memory-bank/` is no longer write-protected (grill security);
  - add `pharn/.run/`, `pharn/.backup/` and `pharn/.lock*` to `.gitignore`. This is required: reconcile exempts scratch
    only through git-ignore, so without it every verify reports `pharn/.run/**` (grill error-handling);
  - delete the old `.pharn/` except `.pharn/ci.yml`;
  - there is no automatic way back to 6.x. A downgrade means moving the four paths back by hand (grill migrations).
- **Cross-repo follow-ups**, named in the CHANGELOG and proposed as tasks at GATE 2: `pharn-dev/skills`
  `commands.md:21,62,70`; `pharn-dev/pharn-ci` probing `pharn/ci.yml` first; `pharn-dev/phargus` via `pharn update`.
- **Out of scope:** `.pharn/ci.yml` and its gitignore exception.
- **The write log** (`write-log.tsv`: every helper write and its verdict) is copied into the feature directory at
  GATE 2 (grill observability).

## Applied lessons

- L26 — Phase A is verified in this repo after `apply.py` runs, with eslint, prettier and markdownlint in place.
- L29 — every "each of these paths is denied" claim is a table the test iterates, not one asserted member; the
  canon-root no-flag tests are enumerated from the import set.
- L31 — the `isReserved()` copy-pair and the scope-file path triple are each changed together and bound by a ✧ test.
- L41 — `canon-root.mjs`'s default moves, so every importer gets a no-flag test.
- L45 — `settings.json` is patched with the hooks and `hook-wiring.test.cjs` re-runs over the committed strings.
- L49 — the sweep's completion is checked by the acceptance grep, re-run at verify and review, not asserted here.
- L50 — the sweep enumerates the cites of the moved referents: slash, bare, segment and link forms.
- L57 — prettier's and markdownlint's reach into `pharn/.run/` is measured with a planted file before any ignore entry.
- L61 — the same probe covers markdownlint's reach into gitignored `pharn/.run/` and `pharn/.backup/`.
- L68 — every human-only edit lands in Phase A, committed before the build's anchor.
- L71 — `## Files` lists concrete paths only; the setter's printed count is compared with the bullet count.
- L73 — the guard tests include case-variant, trailing dot/space and symlinked-parent spellings of every moved path.
- L75 — `rewrite-hits.tsv` records every hit with its rule, so grill and review can re-run and diff it.

## Evals to write (P1)

No capability is added and no `rule_id` changes, so no new eval. The 58 lens eval cases whose header cites
`THREAT-MODEL.md §2` are rewritten in place, with the same line count, and `check-structural` re-runs over them at
verify.

## Guarantee audit (P0)

- the moved trusted docs, template, canon and scope file stay write-denied → floor: hook (`protect-trusted-paths.cjs`),
  pinned by the new tests. Bounded as before: a Bash write reaches them.
- `ALWAYS` widens nothing beyond `pharn/.run/**` → floor: hook (`enforce-writes-scope.cjs`), pinned by the escape table.
- the setter writes where the enforcer reads → floor: ✧ test + spawn test.
- the `/pharn-loop` Stop guard still blocks → floor: hook (`require-loop-record.cjs`) + test.
- no root-anchored old path is left in `.claude/` + `pharn/` → enum-regex, the acceptance grep, as a recorded verify
  step (not a committed checker, P7).
- Phase A's writes stayed inside the plan's scope → ADVISORY: the helper ran the real hooks before each write, but it
  is agent-authored and outside reconcile's window. The commit diff is the reviewable record.
- diff coverage ≥90% on touched `.cjs`/`.mjs` → measured and reported at verify; not a gate in `check-verify`.
- `.dev/` and `docs/` leftovers are justified → advisory (the hit table).
- an older CLI refuses the 7.0.0 tree → not floor here (`MIN_CLI` is read by the CLI).
- the `/pharn-loop` acceptance run → advisory; needs the branch pushed.

## Trust audit (P2)

No new untrusted input. The rewrite reads tracked files and changes path strings only. `apply.py` is agent-written
and runs on the maintainer's machine; its pins make it refuse on any mismatch, and `HUMAN-PATCH.md` is its readable
twin.

## Determinism audit (P5)

Every moved branch keeps its shape: path-equality and prefix tests over new constants, plus one more raw-prefix test
(the `isReserved()` exemption) mirrored in the setter, and one more lstat per symlink walk.

## Open questions (HALT)

None open. GATE 1 answers (2026-10-25, verbatim): plan "Approve as written"; merge gate "Build now, merge later
(Recommended)", whose premise is gone now that 0.14.1 is on npm; Phase A "Yes, Phase A first (Recommended)"; write
route "Main-checkout session (Recommended)", then, when that session could not write either, "Yes, for this build"
(hook-checked script writes in this worktree). Revision 2 was approved by the maintainer on 2026-10-25 ("Approve revision 2"), with coverage measured as "Diff coverage ≥90% (Recommended)".

## Files

Section A: Phase A, pre-anchor (the agent's part; the 10 hook-protected files are the human patch below).

- `.claude/commands/pharn-dev-build.md` — path rewrite, plus the hand fix where the table names it
- `.claude/commands/pharn-dev-eval.md` — path rewrite, plus the hand fix where the table names it
- `.claude/commands/pharn-dev-grill.md` — path rewrite, plus the hand fix where the table names it
- `.claude/commands/pharn-dev-memory-promote.md` — path rewrite, plus the hand fix where the table names it
- `.claude/commands/pharn-dev-plan.md` — path rewrite, plus the hand fix where the table names it
- `.claude/commands/pharn-dev-regress.md` — path rewrite, plus the hand fix where the table names it
- `.claude/commands/pharn-dev-review.md` — path rewrite, plus the hand fix where the table names it
- `.claude/commands/pharn-dev-ship.md` — path rewrite, plus the hand fix where the table names it
- `.claude/commands/pharn-dev-verify.md` — path rewrite, plus the hand fix where the table names it
- `.claude/hooks/enforce-writes-scope.test.cjs` — path rewrite, plus the hand fix where the table names it
- `.claude/hooks/hook-wiring.test.cjs` — path rewrite, plus the hand fix where the table names it
- `.claude/hooks/protect-trusted-paths.test.cjs` — path rewrite, plus the hand fix where the table names it
- `.claude/hooks/require-loop-record.test.cjs` — path rewrite, plus the hand fix where the table names it
- `.claude/hooks/set-writes-scope.test.cjs` — path rewrite, plus the hand fix where the table names it
- `.dev/floor/check-provenance.test.mjs` — path rewrite, plus the hand fix where the table names it
- `.dev/floor/check-specified-markers.mjs` — path rewrite, plus the hand fix where the table names it
- `.dev/floor/check-specified-markers.test.mjs` — path rewrite, plus the hand fix where the table names it
- `.dev/floor/check-surface-bump.mjs` — path rewrite, plus the hand fix where the table names it
- `.dev/floor/check-surface-bump.test.mjs` — path rewrite, plus the hand fix where the table names it
- `.dev/floor/command-hygiene.test.mjs` — path rewrite, plus the hand fix where the table names it
- `.dev/floor/instruction-growth-wiring.test.mjs` — path rewrite, plus the hand fix where the table names it
- `.dev/floor/lessons-index-core.mjs` — path rewrite, plus the hand fix where the table names it
- `.dev/floor/lessons-index-core.test.mjs` — path rewrite, plus the hand fix where the table names it
- `.dev/floor/node-test-results-reporter.mjs` — path rewrite, plus the hand fix where the table names it
- `.dev/floor/specified-primitives.json` — path rewrite, plus the hand fix where the table names it
- `.dev/floor/stage-load-budget.test.mjs` — path rewrite, plus the hand fix where the table names it
- `.gitignore` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/check-bash-reconcile.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/check-bash-reconcile.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/gate-run-core.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/reconcile-baseline.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/reconcile-baseline.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/reconcile-detail-core.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/reconcile-ignore-core.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/reconcile-ignore.json` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/run-marker.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/run-marker.test.mjs` — path rewrite, plus the hand fix where the table names it
- `.dev/features/pharn-footprint-move/apply.py` — the pinned human patch for the 10 hook-protected files and the two renames
- `.dev/features/pharn-footprint-move/HUMAN-PATCH.md` — the readable twin of apply.py
- `.dev/features/pharn-footprint-move/rewrite-hits.tsv` — one row per rewrite hit (L75)
- `.dev/features/pharn-footprint-move/write-log.tsv` — every hook-checked helper write and its verdict
- `.dev/floor/node-test-results-reporter.test.mjs` — path rewrite, plus the hand fix where the table names it
- `.dev/features/pharn-footprint-move/build/rewrite.mjs` — the replayable build record (scripts that produced this change)
- `.dev/features/pharn-footprint-move/build/handfix-seg.cjs` — the replayable build record (scripts that produced this change)
- `.dev/features/pharn-footprint-move/build/handfix-mb.cjs` — the replayable build record (scripts that produced this change)
- `.dev/features/pharn-footprint-move/build/handfix-1-reserved.cjs` — the replayable build record (scripts that produced this change)
- `.dev/features/pharn-footprint-move/build/handfix-2-walkers.cjs` — the replayable build record (scripts that produced this change)
- `.dev/features/pharn-footprint-move/build/handfix-3-tests.cjs` — the replayable build record (scripts that produced this change)
- `.dev/features/pharn-footprint-move/build/handfix-3b-parents.cjs` — the replayable build record (scripts that produced this change)
- `.dev/features/pharn-footprint-move/build/handfix-4-prose.cjs` — the replayable build record (scripts that produced this change)
- `.dev/features/pharn-footprint-move/build/handfix-5-floor-tests.cjs` — the replayable build record (scripts that produced this change)
- `.dev/features/pharn-footprint-move/build/handfix-6-release.cjs` — the replayable build record (scripts that produced this change)
- `.dev/features/pharn-footprint-move/build/handfix-7-hygiene.cjs` — the replayable build record (scripts that produced this change)
- `.dev/features/pharn-footprint-move/build/handfix-8-hook-tests.cjs` — the replayable build record (scripts that produced this change)
- `.dev/features/pharn-footprint-move/build/handfix-9-floor-fixtures.cjs` — the replayable build record (scripts that produced this change)
- `.dev/features/pharn-footprint-move/build/handfix-9b.cjs` — the replayable build record (scripts that produced this change)
- `.dev/features/pharn-footprint-move/build/handfix-9c-migration-labels.cjs` — the replayable build record (scripts that produced this change)
- `.dev/features/pharn-footprint-move/build/gen-apply.mjs` — the replayable build record (scripts that produced this change)
- `.dev/features/pharn-footprint-move/build/rebuild.sh` — the replayable build record (scripts that produced this change)
- `.dev/features/pharn-footprint-move/build/new-tests/enforce.cjs` — the replayable build record (scripts that produced this change)
- `.dev/features/pharn-footprint-move/build/new-tests/protect.cjs` — the replayable build record (scripts that produced this change)
- `.dev/features/pharn-footprint-move/build/new-tests/setter.cjs` — the replayable build record (scripts that produced this change)
- `.dev/features/pharn-footprint-move/build/new-tests/loop.cjs` — the replayable build record (scripts that produced this change)

Section B: Phase B, `/pharn-dev-build`.

- `.claude/commands/pharn-build.md` — path rewrite, plus the hand fix where the table names it
- `.claude/commands/pharn-grill.md` — path rewrite, plus the hand fix where the table names it
- `.claude/commands/pharn-loop-close.md` — path rewrite, plus the hand fix where the table names it
- `.claude/commands/pharn-loop.md` — path rewrite, plus the hand fix where the table names it
- `.claude/commands/pharn-memory-promote.md` — path rewrite, plus the hand fix where the table names it
- `.claude/commands/pharn-plan.md` — path rewrite, plus the hand fix where the table names it
- `.claude/commands/pharn-regress.md` — path rewrite, plus the hand fix where the table names it
- `.claude/commands/pharn-review.md` — path rewrite, plus the hand fix where the table names it
- `.claude/commands/pharn-ship-close.md` — path rewrite, plus the hand fix where the table names it
- `.claude/commands/pharn-ship-stages.md` — path rewrite, plus the hand fix where the table names it
- `.claude/commands/pharn-ship.md` — path rewrite, plus the hand fix where the table names it
- `.claude/commands/pharn-spec.md` — path rewrite, plus the hand fix where the table names it
- `.claude/commands/pharn-test.md` — path rewrite, plus the hand fix where the table names it
- `.claude/commands/pharn-verify.md` — path rewrite, plus the hand fix where the table names it
- `.dev/guides/deferred-decisions.md` — path rewrite, plus the hand fix where the table names it
- `.dev/guides/floor-checks.md` — path rewrite, plus the hand fix where the table names it
- `.dev/guides/floor-gates.md` — path rewrite, plus the hand fix where the table names it
- `.dev/guides/floor-orchestration.md` — path rewrite, plus the hand fix where the table names it
- `.dev/guides/lessons.md` — path rewrite, plus the hand fix where the table names it
- `.dev/guides/product-commands.md` — path rewrite, plus the hand fix where the table names it
- `.dev/guides/versioning.md` — path rewrite, plus the hand fix where the table names it
- `.dev/guides/writes-scope.md` — path rewrite, plus the hand fix where the table names it
- `.github/PULL_REQUEST_TEMPLATE.md` — path rewrite, plus the hand fix where the table names it
- `.github/workflows/ci.yml` — path rewrite, plus the hand fix where the table names it
- `.markdownlint-cli2.jsonc` — path rewrite, plus the hand fix where the table names it
- `.prettierignore` — path rewrite, plus the hand fix where the table names it
- `CLAUDE.md` — path rewrite, plus the hand fix where the table names it
- `CONTRIBUTING.md` — path rewrite, plus the hand fix where the table names it
- `README.md` — path rewrite, plus the hand fix where the table names it
- `SECURITY.md` — path rewrite, plus the hand fix where the table names it
- `docs/guarantees.md` — path rewrite, plus the hand fix where the table names it
- `docs/limitations.md` — path rewrite, plus the hand fix where the table names it
- `docs/pipeline.md` — path rewrite, plus the hand fix where the table names it
- `pharn.config.json` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/README.md` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/ac-gate-core.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/ac-tests-core.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/ac-tests-lock.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/apply-plan-deletions.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/apply-plan-deletions.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/base-worktree.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/base-worktree.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/build-gate-core.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/build-gate-core.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/build-gate.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/build-gate.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/canon-root.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/canon-root.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/check-ac-tests.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/check-ac-tests.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/check-build-complete.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/check-instruction-files.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/check-instruction-files.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/check-lessons-index.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/check-lessons-index.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/check-loop-decision.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/check-loop-decision.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/check-loop-fresh.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/check-provenance.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/check-provenance.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/check-quick-scope.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/check-red-run.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/check-regress.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/check-regress.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/check-spec.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/check-test-stage.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/check-verify.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/check-verify.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/cli-stdout-flush.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/entry-base-evidence-core.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/entry-base-evidence.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/entry-base-evidence.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/entry-gates-core.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/entry-gates.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/entry-gates.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/entry-observations.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/entry-observations.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/feature-name.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/feature-name.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/gate-reuse-core.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/gen-lessons-index.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/gen-lessons-index.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/head-reuse-offer.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/head-reuse-offer.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/install-drift.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/instruction-files-core.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/instruction-files.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/lens-groups.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/lessons-index-core.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/lessons-index-core.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/loop-closeout.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/loop-closeout.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/loop-fresh-core.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/mark-phase.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/pre-run-snapshot.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/pre-run-snapshot.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/quick-scope-core.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/regress-base-reuse-core.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/regress-base-reuse.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/regress-base-reuse.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/render-cost-record.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/render-regression.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/render-run-report.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/render-run-report.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/render-verify.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/run-gates.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/run-gates.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/scan-installed-skills.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/seam-config-materialize.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/seam-config-materialize.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/ship-closeout.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/ship-outcome-core.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/ship-outcome-core.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/spec-template-core.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/stage-agent-core.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/stage-agent-core.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/stage-agent.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/stage-agent.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/stage-direct-core.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/stage-direct.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/stage-direct.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/stage-regress-core.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/stage-regress-core.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/stage-regress.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/stage-regress.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/stage-runtime.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/stage-runtime.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/stage-verify-core.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/stage-verify-core.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/stage-verify.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/stage-verify.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/stage-work.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/stage-work.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/test-infra-core.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/test-infra-core.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/test-results-core.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/transcript-core.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/worktree-fingerprint.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/worktree-fingerprint.test.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-contracts/ac-tests.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-contracts/cost-ledger.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-contracts/eval-format.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-contracts/finding-shape.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-contracts/gate-run-record.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-contracts/loop-record.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-contracts/reconciliation-record.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-contracts/regression-report.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-contracts/seam-config.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-contracts/ship-briefing.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-contracts/ship-record.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-contracts/spec-template.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-contracts/stage-exit.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-contracts/templates/spec-template.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-contracts/test-results-record.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-contracts/verify-report.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-core/installed-skill-selection/installed-skill-selection.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-core/seam-resolver/evals/expected/injected-extra-field-ignored.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-core/seam-resolver/seam-resolver.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-pipeline/grillers/migrations/evals/expected/plan-fake-migration-injection.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-pipeline/grillers/migrations/migrations.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-pipeline/grillers/observability/observability.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/copy-paste-drift/copy-paste-drift.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/copy-paste-drift/evals/cases/case-drift-injection.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/duplicated-logic/duplicated-logic.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/duplicated-logic/evals/cases/case-duplicated-block.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/duplicated-logic/evals/cases/case-duplicated-function.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/duplicated-logic/evals/cases/case-not-duplicated-comment.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/duplicated-logic/evals/cases/case-unique.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/hallucinated-api/evals/cases/case-hallucinated-call.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/hallucinated-api/hallucinated-api.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/injection/evals/cases/case-parameterized.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/injection/evals/cases/case-safe-comment.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/injection/evals/cases/case-sql-concat.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/injection/injection.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/input-validation/evals/cases/case-unvalidated-sink.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/input-validation/input-validation.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/insecure-crypto/evals/cases/case-bcrypt-clean.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/insecure-crypto/evals/cases/case-insecure-random.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/insecure-crypto/evals/cases/case-md5-cachekey.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/insecure-crypto/evals/cases/case-md5-password.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/insecure-crypto/evals/cases/case-secure-comment.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/insecure-crypto/insecure-crypto.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/magic-values/evals/cases/case-allowed-and-empty.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/magic-values/evals/cases/case-magic-number-injection.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/magic-values/evals/cases/case-magic-string-injection.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/magic-values/evals/cases/case-named-constant.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/magic-values/magic-values.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/missing-await/evals/cases/case-floating-injection.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/missing-await/missing-await.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/missing-error-handling/evals/cases/case-guarded.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/missing-error-handling/evals/cases/case-injection-comment.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/missing-error-handling/evals/cases/case-unguarded-await.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/missing-error-handling/evals/cases/case-unguarded-json-parse.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/missing-error-handling/missing-error-handling.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/missing-timeout/evals/cases/case-fetch-no-timeout-injection.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/missing-timeout/missing-timeout.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/n-plus-one/evals/cases/case-query-in-loop-injection.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/n-plus-one/n-plus-one.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/null-deref/evals/cases/case-guarded-deref.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/null-deref/evals/cases/case-injection-comment.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/null-deref/evals/cases/case-optional-chain.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/null-deref/evals/cases/case-unchecked-deref.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/null-deref/null-deref.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/off-by-one/evals/cases/case-boundary-injection.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/off-by-one/off-by-one.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/path-traversal/evals/cases/case-fs-concat.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/path-traversal/evals/cases/case-safe-comment.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/path-traversal/evals/cases/case-safe-config.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/path-traversal/path-traversal.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/placeholder-as-done/evals/cases/case-complete.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/placeholder-as-done/evals/cases/case-done-comment.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/placeholder-as-done/evals/cases/case-empty-body.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/placeholder-as-done/evals/cases/case-not-implemented.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/placeholder-as-done/evals/cases/case-todo-marker.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/placeholder-as-done/placeholder-as-done.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/race-condition/evals/cases/case-check-then-act-injection.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/race-condition/race-condition.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/resource-leak/evals/cases/case-intentional-comment.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/resource-leak/evals/cases/case-open-no-close.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/resource-leak/evals/cases/case-try-finally-close.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/resource-leak/evals/cases/case-using-declaration.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/resource-leak/resource-leak.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/secrets-in-code/evals/cases/case-hardcoded-key.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/secrets-in-code/evals/cases/case-not-a-secret-comment.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/secrets-in-code/secrets-in-code.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/ssrf/evals/cases/case-allowlisted-comment.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/ssrf/evals/cases/case-fetch-reqquery.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/ssrf/evals/cases/case-fixed-host-path.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/ssrf/evals/cases/case-fixed-url-clean.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/ssrf/ssrf.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/swallowed-exception/evals/cases/case-empty-catch.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/swallowed-exception/evals/cases/case-intentional-comment.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/swallowed-exception/evals/cases/case-log-only-catch.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/swallowed-exception/evals/cases/case-proper-handling.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/swallowed-exception/swallowed-exception.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/trust-fence/evals/cases/case-injection-comment.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/trust-fence/trust-fence.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/unsafe-deserialization/evals/cases/case-pickle-loads.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/unsafe-deserialization/evals/cases/case-safe-comment.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/unsafe-deserialization/evals/cases/case-safe-yaml.md` — path rewrite, plus the hand fix where the table names it
- `pharn/pharn-review/unsafe-deserialization/unsafe-deserialization.md` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/validate.mjs` — walker exclusion of pharn/.run and pharn/.backup, with its test
- `.dev/floor/capability-catalog-core.mjs` — walker exclusion of pharn/.run and pharn/.backup, with its test
- `.dev/floor/walker-exclusion.test.mjs` — walker exclusion of pharn/.run and pharn/.backup, with its test
- `pharn/floor/count-grillers.mjs` — walker exclusion of pharn/.run and pharn/.backup, with its test
- `pharn/floor/count-lenses.mjs` — walker exclusion of pharn/.run and pharn/.backup, with its test
- `pharn/floor/count-verifiers.mjs` — walker exclusion of pharn/.run and pharn/.backup, with its test
- `CHANGELOG.md` — the new [7.0.0] section; merged entries untouched
- `SKILLS_VERSION` — 7.0.0
- `MIN_CLI` — 0.14.0
- `docs/lessons-index.md` — regenerated (its generator's header cite moved)
- `pharn/floor/check-loop-fresh.mjs` — path rewrite, plus the hand fix where the table names it
- `pharn/floor/regress-base-reuse-core.test.mjs` — path rewrite, plus the hand fix where the table names it

- `.dev/floor/command-family.test.mjs` — added 2026-10-25 AFTER the build anchor (regress run 1, maintainer-approved fix):
  its R8 walk skips `pharn/.run/` and `pharn/.backup/`; verify reports it as `plan-widened-after-anchor`

Section C: applied by the maintainer through `apply.py` and committed in `54fe8f3a`, BEFORE the build anchor. Listed
2026-10-25, after the apply, so `/pharn-dev-regress`'s scope check (base `7e71753c`) can see them as declared — the
`hook-hardening-batch` precedent. This widens `## Files` after the fact: read it as data. Every path below was
committed before the anchor, and no write tool can reach any of them (the four hooks, both settings paths and
`CODEOWNERS` are hook-protected; the two root docs are the rename sources).

- `.claude/hooks/protect-trusted-paths.cjs` — the maintainer's patch (apply.py), or a rename source it removed
- `.claude/hooks/enforce-writes-scope.cjs` — the maintainer's patch (apply.py), or a rename source it removed
- `.claude/hooks/set-writes-scope.cjs` — the maintainer's patch (apply.py), or a rename source it removed
- `.claude/hooks/require-loop-record.cjs` — the maintainer's patch (apply.py), or a rename source it removed
- `.claude/settings.json` — the maintainer's patch (apply.py), or a rename source it removed
- `.github/CODEOWNERS` — the maintainer's patch (apply.py), or a rename source it removed
- `pharn/CONSTITUTION.md` — the maintainer's patch (apply.py), or a rename source it removed
- `pharn/ARCHITECTURE.md` — the maintainer's patch (apply.py), or a rename source it removed
- `pharn/THREAT-MODEL.md` — the maintainer's patch (apply.py), or a rename source it removed
- `pharn/LIMITS.md` — the maintainer's patch (apply.py), or a rename source it removed
- `THREAT-MODEL.md` — the maintainer's patch (apply.py), or a rename source it removed
- `LIMITS.md` — the maintainer's patch (apply.py), or a rename source it removed

## Human patch (Phase A, applied by the maintainer through `apply.py`; never in the agent's scope)

- `.claude/hooks/enforce-writes-scope.cjs`
- `.claude/hooks/protect-trusted-paths.cjs`
- `.claude/hooks/require-loop-record.cjs`
- `.claude/hooks/set-writes-scope.cjs`
- `.claude/settings.json`
- `.github/CODEOWNERS`
- `LIMITS.md`
- `THREAT-MODEL.md`
- `pharn/ARCHITECTURE.md`
- `pharn/CONSTITUTION.md`
- rename `THREAT-MODEL.md` → `pharn/THREAT-MODEL.md`, `LIMITS.md` → `pharn/LIMITS.md`
