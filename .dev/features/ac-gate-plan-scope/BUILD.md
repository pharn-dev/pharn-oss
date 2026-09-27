# BUILD — ac-gate-plan-scope

- spec_content_hash: `d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4` — re-hashed from
  `pharn/ARCHITECTURE.md` at Step 1, equal to the PLAN's pin; PLAN.md has no open question.
- Scope: `set-writes-scope.cjs --from-plan .dev/features/ac-gate-plan-scope/PLAN.md` → 34 paths (= the 34 `## Files`
  bullets); reconcile epoch anchored after the setter (`--by pharn-dev-build`).
- Model: this run is Claude Opus 5.5 (`claude-opus-5-5`), the maintainer's batch direction — recorded here as a
  fact about the run, never as a `pharn.config.json` route.
- Gates: GATE 1 was a decision DELEGATED by the maintainer to the orchestrating model (approved with the A3
  amendment and the A9 statement) — never recorded as a human approval. GATE 2 is delegated the same way.

## What landed

**Part A (H2) — the build cannot be scoped to what it is judged by, and what a level gate runs is pinned.**

- `pharn/floor/check-ac-tests.mjs` — new kind `ac-artifact-in-plan` (this feature's AC-TESTS.md / lock in PLAN.md,
  folded; `LOCK_NAME` a literal, parity-tested); `test-infra-in-plan` widened to root package-manager configs and to
  every file a level gate's script names (`scriptNamedFiles`, absent included); `checkMapping` takes `acArtifacts` and
  `scriptFiles` as REQUIRED inputs; `ownArtifacts()` spells the pair relative to the invoking directory; the NOTE names
  the chained scripts and the `jest` key; a tree the pin cannot read is a NOTE (the lock refuses it).
- `pharn/floor/test-infra-core.mjs` — rewritten: the ONE closed literal token pass (`scriptTokens`,
  `scriptPathCandidates`, `chainedIds`, `scriptWalk`), `PACKAGE_MANAGER_CONFIGS`, `EXECUTED_EXTENSIONS`, the `/4` pin
  (`chained`, `script_files`, `jest`), `pinShapeError(pin, {version})` per schema, `testInfraReds → {changed, unpinned}`,
  and the header's NOT-caught list (the one copy) headed by the in-process bound, with the costs stated.
- `pharn/floor/ac-tests-lock.mjs` — schema `ac-tests-lock/4` (`/3`, `/2`, `/1` still read); `pinReds → {changed,
unpinned}`; `--record-red-run` only on `/4`; the rollback direction in the header.
- `pharn/floor/ac-gate-core.mjs` — `test-infra-changed` / `test-infra-unpinned` from the two fields (L6); the header
  states the in-process bound and the anomaly scope.
- `.claude/commands/pharn-plan.md` (0.5.2), `.claude/commands/pharn-test.md` (0.4.2) — Step 4c's two bullets, the
  check's remedy line and claims block; Step 4's pin sentence and the red run's NOTE line. Both within their byte
  ceilings (22 090 / 24 064 and 18 961 / 20 480).
- Contracts: `ac-tests.md` (the two kinds, the lock example and schema bullets, the pin section with the token pass,
  the restated NOT-caught list, the costs, migration and rollback, the anomaly rule, reconcile, what it proves, the
  struck claims); `test-results-record.md` (the record's `anomalies`, the refusal/anomaly split of the reasons);
  `verify-report.md` (`ac_gate.unmapped_anomalies`).
- `LIMITS.md §9` — human-only, NOT edited: `proposed/human-only.patch` + `human-only.sha256` were produced by a scratch
  runner inside a throwaway detached worktree at HEAD (the replacement applied there, `check-specified-markers.mjs`
  exit 0, `git diff` taken, the worktree removed; `git apply --check` clean against this worktree). `apply.sh` and
  `APPLY.md` were written for the human. Nothing in the build depends on it.

**Part B (M6) — an anomaly outside the AC-mapped files is reported, never verdict-bearing.**

- `pharn/floor/test-results-formats.mjs` — an unmapped status is a per-entry `anomaly` (`ENTRY_ANOMALIES`), not a
  refusal of the document; a malformed Jest field still refuses the document whatever the status.
- `pharn/floor/test-results-core.mjs` — `ANOMALY_REASONS`; `buildRecord` lists `anomalies` (one `duplicate-test-id`
  per shared id, the adapter's own otherwise) apart from `tests`; the contradiction check counts every failed entry.
- `pharn/floor/red-run-core.mjs` — `observeAc` refuses an AC over an anomaly in a mapped file;
  `unmappedAnomalies()` (`MAX_ANOMALY_EXAMPLES = 3`); the verdict carries `unmapped_anomalies`.
- `pharn/floor/check-red-run.mjs` — one `NOTE —` line per unmapped anomaly group, never the exit.
- `pharn/floor/render-verify.mjs`, `pharn/floor/render-run-report.mjs` — the unmapped anomalies as fenced DATA.

**Docs:** `CLAUDE.md` (PER-TEST RESULTS, AC TESTS, THE RED RUN, THE AC GATE), `README.md` (badge, per-test results,
pharn-json guidance, what verify proves, the costs), `CHANGELOG.md` (`[6.30.0]`), `SKILLS_VERSION` 6.30.0.

**Tests** (every `*.test.mjs` the plan names): the token pass per clause and per closed-set member with controls, the
L59 path-kind table, the jest canonical form, `/3` and `/4` shapes both ways, the migration's `{changed, unpinned}`, the
stated bounds PROBED, the ★ HOOK measured-spellings table and the composed `package.json` proof, the parity test, the
required inputs, the anomaly model (record, red run, AC gate, CLI NOTE, both renderers), and `/3` locks at the lock,
the test-stage gate and the AC gate.

The grill's eight concerns and where the build differs from the plan are recorded in PLAN.md ("Grill resolutions
(applied at build)", "As built").

## Measurements — before (PLAN.md) and after (this build)

Every world is an install-like scratch project built by `.pharn/pharn-dev-plan/mkworld.mjs` from THIS worktree's floor
(the "after" runs are under the session scratchpad's `after/`). Each "after" run forces its way past every RED the way
the reviewer's did, so a later stage's verdict is visible too; a command that obeys the gates stops at the first RED.

| world                             | before (6.28.2)                                           | after (6.30.0)                                                                                                                                                                            |
| --------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| wE — PLAN names the lock          | plan GREEN (NOTE); test-stage READY; verify **PASS**      | plan **RED** `ac-artifact-in-plan`; test-stage **RED** before the build; forced past both: verify PASS (A5's bound — `/pharn-verify` does not re-run the mapping check; "As built")       |
| wB — PLAN names the reporter      | plan GREEN; verify **PASS** (the pin never read the file) | plan **RED** `test-infra-in-plan`; test-stage **RED**; forced past: `--check` **RED**, verify **FAIL** `ac-evidence`                                                                      |
| (b) chained script                | `--check` GREEN; verify **PASS**; `f()` = 0               | `--check` **RED** (3 lines: the chained value changed, a named file added…); test-stage **RED**; verify **FAIL** `test-infra-changed`                                                     |
| (c) root `.npmrc` `script-shell`  | verify **PASS**; `f()` = 0                                | plan **RED** `test-infra-in-plan`; test-stage **RED**; forced past: `--check` **RED** (`.npmrc` added), verify **FAIL** `test-infra-changed`                                              |
| (a) `jest` key                    | `--check` **GREEN** (the pin never read the key)          | `--check` **RED** "package.json's jest key changed"; verify **FAIL** (`test-infra-changed`; this world has no real Jest, so the forge itself is inert and the `test` gate fails honestly) |
| wA — in-process                   | verify **PASS**; `f()` = 0                                | verify **PASS**; `f()` = 0 — **unchanged, by design**: the stated in-process bound (A9)                                                                                                   |
| M6 wF — suite glob                | red run **RED** for both ACs (`duplicate-test-id`)        | red run **GREEN** + one `NOTE — … duplicate-test-id …`; recorded; verify **PASS**                                                                                                         |
| M6 wF2 — handed files only        | red run GREEN; verify **INCONCLUSIVE**                    | verify **PASS**; `ac_gate.unmapped_anomalies` = `[{test, duplicate-test-id, 1, ["tests/other/dup.test.js::handles 1"]}]`; `VERIFY.md` lists it fenced                                     |
| cost — `pretest` names `src/x.js` | n/a                                                       | plan **RED** `test-infra-in-plan` for the feature's own `src/x.js`; `--check` **RED** after an edit of it — the stated source-entry cost, measured                                        |

## Step 2b — format (advisory)

Run by a scratch node runner over the live `.pharn/writes-scope.json` (the worktree isolation refuses the pinned
xargs pipeline, so the same three commands run as argv arrays — advisory orchestration, stated): prettier
`--ignore-unknown --write` over the scoped paths that exist, markdownlint-cli2 `--no-globs --fix` over their `.md`
subset, eslint read-only over their JS subset. **34 scoped paths, all present:** prettier exit 0 (it reformatted this
build's own test files and three contracts/modules; `human-only.patch`, `.sha256` and `apply.sh` are unknown to it and
untouched); markdownlint 11 `.md` files, 0 issues; eslint 19 JS files, exit 0. The whole-repo read-only gates were then
confirmed clean: `format:check` ("All matched files use Prettier code style!"), `lint:md` (1557 files, 0 issues),
`lint` (exit 0), after the scratch runners were moved out of `.pharn/`.

## Pre-review corrections (made in the build, before regress)

Re-reading the diff before handing it on found three defects of the build's first cut, each fixed and tested in the
build rather than left for review (PLAN.md, "As built"): the GREEN line of `check-ac-tests.mjs` claimed "no file a level
gate's script names" even when those files could not be read — it now says they were NOT checked; `unmappedAnomalies`
dropped an anomaly in a mapped file that only ANOTHER level's gate reported (observeAc never reads it there), so it was
neither decided nor reported — it now keys on the row's level; and the token pass skipped the target of an INPUT
redirect, although `node < tools/x.mjs` executes it — only output redirects are skipped now. A chain to a script whose
name is over 1024 characters now refuses the pin, and the NOT-caught list names `package.json`'s `config` field and a
path over 1024 characters.

## The aggregate gate

`npm run check` over the first cut (before those corrections), run while other sessions' suites loaded the machine:
every style/docs/changelog/reconcile gate GREEN; `npm test` **4098 / 4099**, the one failure the timing-sensitive
`stage-verify.test.mjs` "★ budget clock" (its old-clock mutant ran out a 32 s budget under load — `5 !== 0`), which
passes in isolation (34 s, 1/1). The corrected tree's full suite runs as `/pharn-dev-verify`'s `test` gate.

## Step 3 — the floor

`node pharn/floor/validate.mjs .` → **`FLOOR: GREEN — 36 capabilities checked in "."`**.

## Build-time amendments to the approved plan (accepted at GATE 2)

GATE 2 (the orchestrator's decision under the maintainer's delegation — never a human approval) accepted every
refinement made after GATE 1; they are amendments to PLAN.md's design, recorded in full in its "Grill resolutions" and
"As built" sections:

1. the executed-extension set for script-named files (`EXECUTED_EXTENSIONS`), widened at GATE 2 by `.bash` and `.zsh`;
2. only OUTPUT redirects (`>`, `>>`, `2>`), `-o` and `--out…` targets are skipped — an input redirect's target executes;
3. `start` / `stop` / `restart`, `node --run`, and `.yarnrc` / `.yarnrc.yml` inside the closed chain and config sets;
4. `yarn t` / `pnpm tst` pin both readings (the `test` script and a script of that name);
5. the plan-time check covers ABSENT named files too (stricter than A2 as approved);
6. the `jest` nesting refusal is the engine's own serialization limit, not the planned 256-level cap;
7. the canonical JSON is a key-sorting `JSON.stringify` replacer (a second small copy, the grill's G6 resolution);
8. `unmapped_anomalies` is keyed on each gate's level, so every anomaly is either decided or reported;
9. `check-ac-tests.mjs`'s GREEN line says the named files were NOT checked when the tree cannot be read;
10. a chained script name over 1024 characters refuses the pin.

## GATE 2 — the FIX round

GATE 2 = FIX (the orchestrator, delegated). Fixed, each at every site it appeared:

- **F1** — the rollback verdict: a pre-6.30.0 AC gate reads a `/4` lock as `ac-tests-modified` (verify FAIL), not
  INCONCLUSIVE (`ac-tests-lock.mjs`'s header, `ac-tests.md` "Rolling back", `PLAN.md` G5).
- **F2** — README: the plan exclusion names the files, configs and lock; `package.json` stays plannable, and a change
  there to anything pinned fails verify.
- **F3** — CLAUDE.md: the NOTE is advisory because every part of `package.json` the pin READS is compared and cannot be
  re-pinned through the build's scope; the rest is the NOT-caught list's.
- **Minors** — `.bash` / `.zsh` added (tested); the `/3` pin over a tree the `/4` pin cannot be taken on reads
  `changed`, by decision (the refusal cannot tell a `/3`-covered change from a `/4`-only one) — stated in the module
  doc, the contract, the README and the CHANGELOG, and tested; "cannot re-pin" / "no build starts" narrowed to the
  write scope and to builds that read the test-stage gate; the Floor claims about script-named files say "when the
  tree can be read"; `test-results-record.md` names the per-level-gate rule; the CHANGELOG's MINOR rationale names the
  in-flight `/3` locks that read RED.
- **F4** — not fixed, by decision: stated as a bound in `ac-tests.md` ("What it proves", Bounded) and the CHANGELOG,
  with the follow-up `verify-rechecks-test-stage`.
- **The human-only `LIMITS.md §9` patch** stays in `proposed/` as an OPTIONAL staged edit, applied (if at all) after the
  merge on its own branch; `APPLY.md` says so. No gate waits on it.

## After the PR opened — the measured table assumed a case-insensitive volume (CI fix)

CI on PR #291 went red on Linux in one test: `check-ac-tests.test.mjs`, "★ HOOK — every PLAN spelling that opens the
lock, AC-TESTS.md or a script-named reporter to the build is RED (measured table)". Its "opens" column had been
measured on APFS, where a case variant of the lock IS the lock, so the guard denies it. On a case-sensitive volume
(ext4) the variant is a different, new file, which the guard allows. The row read `true`, but that file opens nothing.

The checker was not changed, only the test:

- **The table now keeps two facts apart.**
  - `opens` — the build may write a file it is judged by. This is decided by file identity (dev + inode), is the same
    on every volume, and is what "every spelling that opens is RED" rests on.
  - `probed` — the raw guard reading, which depends on a run-time case-sensitivity probe of the test's temp volume.
- **The rows that depend on the probe** are the four case variants, and a comment names them. `isRed` stays
  unconditional, because the fold is deliberately fail-closed.
- **A pure test injects both probe results**, so each branch is exercised on either kind of volume.

Measured, not only simulated:

- The file was run on the default APFS temp volume and on a case-sensitive APFS disk image mounted in the scratchpad
  (`TMPDIR` pointed at it). The old test reproduced CI's exact failure there (58/59); the new one reads 60/60 on both.
- The other eight test files this increment changed passed on the case-sensitive image (339/339). Their case-variant
  tests create the variant file themselves and never rely on aliasing.
- Two mutations:
  - Marking a variant row as not probe-dependent is caught on both volumes.
  - Replacing the identity check with a case-folded spelling match is caught only on the case-sensitive volume. This
    is expected, because on APFS the guard already denies every variant, and the code comment says so.
- The image was detached and deleted afterwards.

## Scratch

`.pharn/pharn-dev-plan/` (the plan's measurement runners) and `.pharn/pharn-dev-build/` (`limits-patch.mjs`, `cost.mjs`,
the format runner) are gitignored scratch, deleted before `npm run lint`; the scratch worlds live under the session
scratchpad, outside the repository.
