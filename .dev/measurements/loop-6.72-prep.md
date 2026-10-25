# Preparing a two-run cost measurement of `/pharn-loop` on 6.73.1 (2026-10-25)

A preparation record, not a measurement. It sets up two `/pharn-loop` runs of pharn-starter's `billing-plan-catalog`
increment, from the commit the 2026-10-05 run started from, so a human can run them and compare their cost with that
run (`.dev/measurements/loop-wall-clock-2026-10-05.md`, PHARN 6.35.0). **No loop was run here.**

> **Superseded in part (same day).** Sections 1–7 cover the attempt at the 2026-10-05 base, which was BLOCKED. The
> human then chose to measure on pharn-starter HEAD instead, absolute cost only. Section 8 covers that, and it is
> BLOCKED too. The worktree now sits at HEAD, and the base-attempt install is gone.

- **Written by:** the `loop-6-72-cost-prep` increment (plan, grill and ship records in
  `.dev/features/loop-6-72-cost-prep/`).
- **Asked for:** PHARN 6.72.0 at `18037dd4`. **Installed: 6.73.1 at `9ee54c8b`** — the installer cannot pin a commit,
  and the human chose `main`'s tip at GATE 1 (section 3). The file and worktree keep the `6.72` name the request used.
- **Changes outside this repository:** a detached worktree of pharn-starter, a reference directory, and the global
  pharn-cli. Nothing in pharn-starter's own checkout was changed. Section 7 lists every path.

## Labels

The convention of the 2026-10-05 record: each figure carries a source and a precision, token classes are kept
separate, and nothing is priced. This record has no token figures.

- **Source:** `R` — read from the 2026-10-05 run's surviving files in pharn-starter (`cost.json`, `LOOP.md`,
  `RUN-REPORT.md`); `S` — static, read on 2026-10-25 from the new worktree, the reference copy, or the machine.
- **Precision:** `m` — measured; `e` — estimated, with its formula.

## 1. The baseline commit

**`42d419cd4de63fe2c11bcf3260d3401c8c707f7b`** — `refactor(db): rename the database's last "team" names to
"workspace" (A3a) (#186)`, 2026-10-04 21:10 +0200.

Two records written by the 2026-10-05 run agree [R·m]:

- `pharn/features/billing-plan-catalog/cost.json`: `base_sha` = `42d419cd…`;
- `pharn/features/billing-plan-catalog/LOOP.md` frontmatter: `commit:` = `42d419cd…`. Its `RUN-REPORT.md` repeats it
  as `base`.

The parent-of-first-commit fallback was not needed. Context [R·m / S·m]:

- the commit is on pharn-starter `main`'s first-parent line;
- `main` had moved one commit (`4bce1607`, docs, 2026-10-05 00:39 +0200) before the run started (10:38 +0200); the
  run's checkout had not pulled it, and the recorded base is what the run used;
- `pharn/features/billing-plan-catalog/` does not exist at the base. It first appears in `bd14d35a` (2026-10-07);
- `CLAUDE.md` at the base is 418,525 B. The 2026-10-05 record measured 418,456 B attached; the 69 B gap is not
  explained here.

## 2. The SPEC: kept as a reference, not copied into the tree

**Why not copied (GATE 1, Q2).** 6.72's and 6.73.1's `/pharn-loop` take an increment _description_, never a feature
name, and never reuse a feature directory: `pharn/floor/feature-name.mjs --fresh` takes the first of `<slug>`,
`<slug>-2`, … for which `pharn/features/<x>` does not exist [S·m, the CLI's header]. With the SPEC copied to
`pharn/features/billing-plan-catalog/SPEC.md`, `/pharn-loop billing-plan-catalog` would run as
`billing-plan-catalog-2` and write a new SPEC from those three words; the copy would never be read. The human chose:
nothing in `pharn/features/`, and each run gets the SPEC's `## Intent` as its description, so the spec stage writes
the SPEC in-run.

**Was the 6.35 SPEC also written in-run?** Probably: its spec agent produced 4,999 output tokens by the ledger
(6,192 by the 2026-10-05 record's transcript reading) for a 230-line SPEC [R·m]. Not verifiable now: that run's
orchestrator transcript `f4b646c1-b179-4a88-a414-3903de3bd435.jsonl` is no longer under
`~/.claude/projects/-Users-pgalarowicz-Projects-pharn-starter/` [S·m], and its original `/pharn-loop` description was
recorded nowhere else found. So whether `main`'s SPEC is byte-for-byte the SPEC that run wrote is unknown.

| item                    | value                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| source                  | `git show main:pharn/features/billing-plan-catalog/SPEC.md` in pharn-starter (blob `bf975f39`) |
| reference copy          | `~/Projects/pharn-measure/reference/SPEC.md`, 15,949 B                                         |
| sha256, copy and source | `0857fd2125908cae8fa7aa3d9df7da7bd01ccf3dbcdff6d4ec27df9517b4908d`, equal [S·m]                |
| state                   | `Draft`, `spec_content_hash: ""` (the run approved it by model, then reverted it)              |
| description file        | `~/Projects/pharn-measure/reference/intent.md`, 1,649 B: the `## Intent` body, verbatim        |

**Shape check on 6.73.1** (run from the worktree's installed floor, on the reference copy) [S·m]:

- `node pharn/floor/check-spec.mjs ~/Projects/pharn-measure/reference/SPEC.md` → exit 0, `GREEN — spec valid; state
"Draft"; 5 required sections present; template "pharn-default"; 18 AC item(s)`;
- `--spec-kind` → `feature`;
- `--resolve-template-ref` → `pharn-default@sha256:14a54668…df42e`, equal to the SPEC's own `spec_template` line;
- the copy's sha256 is unchanged after the checks.

## 3. The install

| item                              | value                                                                                                                                                    |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| pharn-cli                         | `npm i -g @pharn-dev/pharn@latest` → `pharn --version` **0.13.0** (it was not installed before) [S·m]                                                    |
| installer SHA option              | **none.** `src/lib/release.ts:47` `export type RefChoice = 'main' \| 'latest';` [S·m]                                                                    |
| command                           | `pharn update --yes` (the base already carries 6.35.0; `init --yes` refuses a re-install)                                                                |
| exit and summary                  | 0; `updated 155 · restored 53 · unchanged 376 · skipped 0 (35 capabilities, skills v6.73.1)` [S·m]                                                       |
| installed `skillsVersion`         | **6.73.1**, commit `9ee54c8bd97dde9756758f37359117a41be6bb75` (`pharn.config.json`) [S·m]                                                                |
| `pharn status` after              | 584 files OK, 0 modified, 0 missing; outdated: false [S·m]                                                                                               |
| before (6.35.0, commit `d10fc1c`) | 155 modified and 53 missing against upstream; every one an upstream change, none a local edit (the dry run planned 0 skipped, 0 forced, 0 backups) [S·m] |
| orphans                           | 14 files 6.73.1 no longer ships (e.g. `pharn/floor/check-ship.mjs`), left in place, as the CLI does [S·m]                                                |

**Why 6.73.1 and not 6.72.0.** `main` installs `main`'s tip; `latest` needs a published release and pharn-oss has
none, so it exits 1. No flag or environment variable names a commit, and hand-copying was ruled out. The human chose
`main`'s tip at GATE 1. Six commits separate the two (6.72.1, 6.72.2, 6.72.3, ENF-8, 6.73.0, 6.73.1). None changes a
loop stage's command text. Their product changes are `loop-closeout.mjs` (bounded git calls), `check-spec.mjs`,
`spec-template-core.mjs`, `gate-run-core.mjs`, `check-bash-reconcile.mjs`, `merge-findings.mjs` (review only), and
the two write hooks (a NUL path denied, the dev scratchpad).

**Settings the install did not wire.** `pharn update` never edits `.claude/settings.json`. Its dry run named three
entries 6.73.1 expects and the base lacks [S·m]:

- `PreToolUse` `Write|Edit|MultiEdit|NotebookEdit` → `node "${CLAUDE_PROJECT_DIR}"/.claude/hooks/protect-trusted-paths.cjs`;
- the same for `enforce-writes-scope.cjs`;
- `Stop` → `node ${CLAUDE_PROJECT_DIR}/.claude/hooks/require-loop-record.cjs`.

The base wires the first two in the relative form `node .claude/hooks/…` (which runs when the session starts at the
project root) and has no `Stop` hook, so the loop's Stop guard is inactive, as it was for the 2026-10-05 run, whose
base is the same file. Left as at base for comparability; adding them is the human's call.

## 4. Readiness at the base, on today's toolchain

All in the worktree at `42d419cd` plus the 6.73.1 install, Node 24.13.1. Each gate ran alone, one after another
[S·m].

| step / gate         | command                |  exit | seconds | result                                                                            |
| ------------------- | ---------------------- | ----: | ------: | --------------------------------------------------------------------------------- |
| install             | `npm ci`               |     0 |      13 | `@sentry/core@11.0.0` throughout: the 2026-10-05 stale `10.75.0` is absent        |
| lint                | `npm run lint`         |     0 |      21 | GREEN                                                                             |
| typecheck           | `npm run typecheck`    |     0 |      15 | GREEN                                                                             |
| **build**           | `npm run build`        | **1** |     306 | **RED**: compiles, then `next build` stops collecting page data for `/robots.txt` |
| format:check (info) | `npm run format:check` |     0 |      12 | GREEN                                                                             |
| test (info)         | `npm run test`         |     0 |     219 | GREEN: 711 test files, 8,010 tests passed                                         |

**Why `build` is red.** `env.ts:169` throws `Production environment validation failed`, naming four unset variables
(quoted as DATA): `NEXT_PUBLIC_SITE_URL`, `RESEND_API_KEY` (with `RESEND_FROM_EMAIL`), `CRON_SECRET`,
`BETTER_AUTH_ENCRYPTION_KEY`. That is the environment, not the feature: the code compiled and type-checked. The new
worktree has no `.env.local` (section 5); whether pharn-starter's own `.env.local` sets these four was not read, since
it holds secrets.

**The 2026-10-05 run had `build` red too:** its regression report lists `build` base exit 1 → head exit 1, under
`pre_existing` [R·m]. Its logs were overwritten later (that record, section 5), so its cause is not known. 6.35.0
classified it as pre-existing and went on.

**6.73.1 would stop at entry instead** [S·m, static reading of the installed floor]:

- `/pharn-loop` Step 4 runs the discovered gates on the starting tree, and a red one stops the run
  `blocked: gates-red-at-entry` (S14) unless `--allow-red-entry` is given. That flag is for a feature whose purpose is
  to fix the red gate, which this one is not.
- the entry set is `gate-run-core.mjs`'s `ALLOWLIST` filtered by the scripts the project has: here `test`, `lint`,
  `format:check`, `typecheck`, `build`, `e2e`. E2e is filtered out for regress and build only, so the entry step would
  also start `playwright test --project=app` locally, which the user does not allow (2026-10-05 record, section 9).
  `gates.exclude` would drop it, and the request says not to add it.
- e2e was not run here.

Steps 3 to 6 of the request (the SPEC check, the config readings, the hook, the project key) were done before the
build result came in, and are recorded in sections 2, 3 and 5. The step-5 STOP rule was then applied: nothing past
the readiness checks was done (section 6).

## 5. Comparability inputs

| input                          | 2026-10-05 run                                     | this preparation                                                                                                                   |
| ------------------------------ | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| PHARN                          | 6.35.0 [R·m]                                       | 6.73.1 [S·m]                                                                                                                       |
| Claude Code                    | 2.1.286 (`cost.json` `claude_code_versions`) [R·m] | 2.1.309 on this machine today [S·m]                                                                                                |
| Node                           | not recorded                                       | 24.13.1; `.nvmrc` asks 24.15.0 [S·m]                                                                                               |
| npm                            | not recorded                                       | 11.12.1 [S·m]                                                                                                                      |
| stage-model routing            | `pharn.config.json` `models` at the base [S·m]     | unchanged by the update (spec, plan, grill, review, ac-test: opus; build, regress, verify, loop: sonnet; all `effort: high`) [S·m] |
| `gates.exclude`                | absent [S·m]                                       | absent; not added [S·m]                                                                                                            |
| `regress.install`              | absent [S·m]                                       | absent; not added [S·m]                                                                                                            |
| PostToolUse hook `npm run tsc` | present, broken [R·m]                              | present, still broken: `npm error Missing script: "tsc"`, exit 1; `.claude/settings.json` byte-identical to the base [S·m]         |
| instruction files              | `CLAUDE.md` 418,456 B attached [R·m]               | 418,525 B at the base [S·m]                                                                                                        |
| SPEC                           | written in-run (probably, section 2)               | written in-run from `intent.md`; reference kept outside                                                                            |
| `.env.local`                   | present in pharn-starter's checkout                | absent: a new worktree carries no ignored files [S·m]                                                                              |
| Claude Code project key        | `-Users-pgalarowicz-Projects-pharn-starter`        | `-Users-pgalarowicz-Projects-pharn-starter-6-72` (each non-alphanumeric character → `-`); does not exist yet [S·m]                 |

## 6. Verdict

**BLOCKED.** `build` is red at the baseline commit on today's toolchain, for a reason unrelated to the feature (four
production environment variables unset). Per the request, the comparison with the 6.35 run is not possible at this SHA
as things stand, and the human decides what happens next. Therefore:

- `~/Projects/pharn-starter-6.72/RUN-PROTOCOL.md` was **not written**;
- the 6.73.1 install was **not committed** (it sits uncommitted in the worktree: 157 tracked files modified, 53
  untracked files added);
- no loop was run.

**The choices, as the request frames them, plus what each costs:**

1. **Measure on pharn-starter HEAD instead.** Absolute cost only, no 6.35 comparison. HEAD's gates were not run here.
2. **Stay at `42d419cd` and make `build` green by environment only:** give the worktree the four variables (in an
   ignored `.env.local`, which `git clean -fdx` would then remove between runs unless excluded). This changes an
   input the 6.35 run did not have (its build was red), and the entry step would still run `e2e` unless
   `gates.exclude` names it, which the request rules out.
3. **Stay at `42d419cd` with `--allow-red-entry`.** Misuses the flag (section 4), and `e2e` still runs at entry.

### The protocol, once unblocked (decided at GATE 1 and after, not yet written to the worktree)

Agreed in this session, recorded so the next step does not re-derive it:

- **Description, not a feature name** (Q2): each run is `/pharn-loop` followed by the contents of
  `~/Projects/pharn-measure/reference/intent.md`. Cap 3 (the default), full mode.
- **The run picks its own slug.** Output paths are `pharn/features/<name>/…` with `<name>` as the run prints it; the
  branch `pharn-loop/<name>` exists only after a green commit.
- **Commit the install first** (asked after GATE 1, answer "commit install locally"): one local commit of the 6.73.1
  install on a new branch `measure/base-6.73.1` on top of `42d419cd`, never pushed. Both runs start there, as the
  6.35 run started from a commit that held its install. The loop then records that commit as its base.
- **Reset between runs:** `git checkout --force measure/base-6.73.1 && git clean -fdx -e node_modules`. The
  prompt's `git checkout <SHA> && git clean …` would delete the 53 installed files and keep run 1's edits.
- **Git-dir records** (answer "copy out, then delete"): after each run, copy `pharn-pre-run-snapshot.json`,
  `pharn-entry-base-offer.json`, `pharn-entry-gate-changes.json`, `pharn-regress-base-reuse.json` and
  `pharn-regress-head-offer.json` from `/Users/pgalarowicz/Projects/pharn-starter/.git/worktrees/pharn-starter-6.72/`
  into `~/Projects/pharn-measure/run<N>/gitdir/`, then delete them, so run 2 cannot reuse run 1's base evidence.
- **Copy-out per run** to `~/Projects/pharn-measure/run<N>/`: `pharn/features/<name>/{cost.json,LOOP.md,RUN-REPORT.md,
VERIFY.md,REGRESSION.md}` (whichever exist), the run's `SPEC.md` (to diff against the reference), `.pharn/`, and the
  Claude Code transcripts under `~/.claude/projects/-Users-pgalarowicz-Projects-pharn-starter-6-72/` (the 6.35 run's
  were lost, section 2).
- **Unchanged from the request:** a fresh Claude Code session per run, wall-clock start and stop noted, the stop
  state noted, and no edit to the SPEC or PLAN during a run.

## 7. Everything this preparation created or changed

- `~/Projects/pharn-starter-6.72/` — `git -C ~/Projects/pharn-starter worktree add ~/Projects/pharn-starter-6.72
42d419cd…` (detached). Inside it: `pharn update --yes` (157 tracked files modified, 53 untracked files added),
  `npm ci`, and the gate runs' output (`.next/`, caches). No `RUN-PROTOCOL.md` (section 6), no commit.
- `~/Projects/pharn-measure/reference/SPEC.md` and `intent.md`.
- the global npm prefix: `@pharn-dev/pharn@0.13.0`.

## 8. Second attempt: pharn-starter HEAD, absolute cost only

Chosen by the human after section 6: measure on pharn-starter HEAD, with no 6.35 comparison, checking HEAD's gates
before writing the protocol.

**The tree** [S·m]:

- HEAD = pharn-starter `main` = `b42d397c0c87feae08354c05da26de7f9b2c31cf` (`chore(deps): Bump fast-uri from 3.1.8 to
3.1.9 (#255)`).
- The worktree was moved there: `git checkout --force b42d397c`, then `git clean -fdx -e node_modules`. That removed
  the uncommitted 6.73.1 install of section 3. `npm ci` exit 0. Tree clean afterwards (0 porcelain lines).

**PHARN at HEAD** [S·m]:

- **6.72.0 at `18037dd4`**, committed in the tree: the version the request first asked for. Kept as is, by the
  human's choice; no `pharn update`.
- Install records: 596 files match `pharn.records.json`. Two differ, both prose in contracts:
  `pharn/pharn-contracts/regression-report.md` and `verify-report.md` each name `pharn/floor/check-ship.mjs` where
  6.72.0 says `.dev/floor/check-ship.mjs`; they come from earlier pharn-starter commits (`7616fa2c`, `3c8cdcad`).
  `pharn status` lists 24 files as differing from upstream; those are the 6.72.0 → 6.73.1 changes.
- `pharn.config.json`: `gates.exclude: ["build", "e2e"]` (the project's own, present at HEAD); `regress` absent.
- `.claude/settings.json`: no `Stop` hook; relative PreToolUse hook commands; PostToolUse `npm run tsc` still
  present and still broken.

**The feature.** `billing-plan-catalog` is already built at HEAD (`pharn/features/billing-plan-catalog/`, from
`bd14d35a`). Later increments (U1–U4, `drop-workspace-billing`) moved billing to the user, which contradicts that
SPEC's "the workspace stays the billing entity". The human chose to name a new, unbuilt feature;
`~/Projects/pharn-measure/reference/intent.md` waits for it. The base-attempt `SPEC.md` and `intent.md` moved to
`~/Projects/pharn-measure/archive-base-42d419cd/`.

**The gates at HEAD** (Node 24.13.1, each alone, one after another) [S·m]:

| gate         |  exit | seconds | result                                                                                    |
| ------------ | ----: | ------: | ----------------------------------------------------------------------------------------- |
| lint         |     0 |      24 | GREEN                                                                                     |
| typecheck    |     0 |      26 | GREEN                                                                                     |
| format:check | **1** |      13 | **RED**: 24 files not Prettier-formatted (e.g. `features/pricing/lib/pricing-catalog.ts`) |
| test         | **1** |     487 | **RED**: 20 of 8,547 tests fail, in 11 of 990 files                                       |
| build        |     1 |     100 | RED, the same production env check as section 4; excluded by the project                  |

The `test` failures are stale tests, not load. Their errors (quoted as DATA) include
`Cannot find module '/app/(pages)/guides/page'`, `ENOENT … scandir '…/app/(pages)/(root)/(workspace)'`,
`IntlError: MISSING_MESSAGE … Sidebar.helpDiscordCommunity`, and changed class names.

**What 6.72.0's loop does with that** [S·m, static reading of the installed floor]:

- The entry set is `test`, `lint`, `format:check`, `typecheck` (discovered, minus the project's exclusion).
- A red `test` always counts at entry, so the run stops `blocked: gates-red-at-entry`.
- A red `format:check` counts too when it finishes before the run writes its feature directory, which
  `entry-gates-core.mjs` calls the normal case.
- With `--allow-red-entry` the run would go on, but verify could never pass, so it would end at the cap or blocked.

**Verdict: BLOCKED.** `~/Projects/pharn-measure/RUN-PROTOCOL.md` is written, with its status line saying so and two
unmet preconditions:

1. the four loop gates green at the base commit;
2. the feature intent in `intent.md`.

It sits outside the worktree because its own reset step (`git clean -fdx`) would delete it there. With PHARN committed
in HEAD's tree, the request's reset form works as written, plus `--force` and `git worktree prune`. The protocol also
moves PHARN's git-dir records aside between runs.

### Gates fixed (pharn-dev/pharn-starter#257)

On the human's instruction, the two red gates were fixed on a pharn-starter branch from `main`:

- branch `fix/stale-tests-and-format`, one commit `acdbf2a18652bd8a40ca13b547f8a16c156970df`, PR #257;
- the merge is left to the human.

In the worktree at that commit [S·m]:

| gate         | exit | seconds |
| ------------ | ---: | ------: |
| lint         |    0 |      17 |
| typecheck    |    0 |      21 |
| format:check |    0 |      12 |
| i18n:check   |    0 |       0 |
| test         |    0 |     503 |

`test` covered 990 files and 8,549 tests. `pharn:validate` (CI only, not a loop gate) is red on `main` already, from
`pharn/features/user-billing-account-2/GRILL.md`; the PR leaves it.

Of the 20 failures:

- most were stale tests (moved routes, deliberate restyles);
- two exposed real bugs, fixed in code: `trust` and `fonts` were not reserved workspace slugs, and the help menu
  rendered a Discord item whose copy #246 deleted;
- the two workspace-naming guards were re-scoped, with their reasons written next to each exclusion.

The PR body lists each change.

**`<BASE>` in the protocol is `9c6343b728dae211c3d41a51912cf8edc15e25c4`**, pharn-starter `main` after the human
squash-merged #257 (2026-10-25 00:50Z). Its tree `2a538428…` is byte-identical to `acdbf2a1`'s, where the gates were
checked green [S·m: `git rev-parse <commit>^{tree}`], so those results hold for it. The worktree is detached there,
clean, with no PHARN records in its git dir.

### The feature, and the final verdict

**The human asked the model to pick the feature** ("you have to make all done"). The pick is moving the legal
placeholders into `COMPANY` [S·m]:

- **What it is:** delete `content/legal.ts` and have its three importers read `content/company.ts`:
  - `app/(pages)/(legal)/privacy-policy/page.tsx`;
  - `app/(pages)/(legal)/terms-of-service/page.tsx`;
  - `features/about/lib/config.ts`.
- **Why it was picked:**
  - it is an item of pharn-starter's product epic E8, the first epic in `docs/product/EPICS.md`'s build order, and
    depends on no other epic;
  - it is unbuilt at the base (`content/legal.ts` exists, and no feature directory names it);
  - it touches only this repository.
- **Not picked:** E11 (Docs) depends on two unbuilt epics and needs pharn-ci's `action.yml`. The billing epic depends
  on the GitHub App.
- **Size:** smaller than `billing-plan-catalog`. The measurement is of absolute cost only, so that does not break a
  comparison.

`~/Projects/pharn-measure/reference/intent.md`: 1,232 B, sha256 `6cd32cedc23ac1b1bc3ce83e0df58defc72cd3fd3ac2dba9813e72b7c8471605`.
It states the owner's wants, keeps every `COMPANY` value as it is, and adds an empty `founderNote`.

Preconditions re-checked at `9c6343b7` after it was written [S·m]:

1. the gates: same tree as `acdbf2a1`, where they ran green;
2. `intent.md` present;
3. HEAD `9c6343b7`, detached, 0 dirty paths;
4. `npm ls` exit 0, and `package.json` / `package-lock.json` unchanged since `npm ci`;
5. 0 `pharn-*` records in the git dir.

Installed PHARN: 6.72.0.

**Verdict: GO.** `~/Projects/pharn-measure/RUN-PROTOCOL.md` says so on its status line. The two runs are the
human's to start.

## Bounds of this record

- **Nothing here predicts a run's cost.** It fixes the inputs it can and records the ones it cannot.
- **The SPEC is the run's, not `main`'s.** Each run writes its own SPEC from `intent.md`; diff it against the
  reference to see how far it moved.
- **The comparison is two versions apart in more than PHARN:** Claude Code 2.1.286 → 2.1.309, and the served models
  behind the same names may differ.
