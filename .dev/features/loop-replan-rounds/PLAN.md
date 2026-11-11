# PLAN — loop-replan-rounds

- spec_content_hash: f3d8748edb14bc13dfb4113b5678001380038740c9ac359c5d7d4b7e68a54750
- applied_lessons: [L29, L34, L35, L36, L43, L44, L54, L58, L62, L65, L66, L67, L68, L72, L83, L84]
- increment: part 2b of restore-loop-grill (7.8.0) — in a full `/pharn-loop`, a triage verdict of `replan` sends the
  run back to `/pharn-plan` for up to two automatic re-plan rounds, each round's plan and grill outputs archived by a
  new floor CLI `grill-round.mjs`; S16 (`blocked: grill-escalation`) fires on a `spec` verdict, or on a `replan` verdict
  when no re-plan round is left. No supervisor (part 3).
- layer(s): pharn-contracts (`grill-triage.md` rounds section, `finding-shape.md` round sentence), product floor (new
  `grill-round-core.mjs` / `grill-round.mjs`, artifact lists), product commands (`pharn-loop.md`, `pharn-plan.md`,
  `pharn-grill.md`, `pharn-triage.md`, `pharn-loop-close.md`), dev floor tests, repo meta
- constitution_refs: [P0, P2, P3, P5, P6, P7]

## The failure (P7) and where it stands

The 7.7.0 triage measurement (`.dev/features/loop-grill-triage/TRIAGE-CHECK-MEASUREMENT.md`) ran `/pharn-triage` on
five real grills: every triage file passed its check first time, and all five verdicts escalated — 3 `replan`, 2
`spec` — so all five full loops stop at S16 for a person. Before 7.7.0 the same five went on to the build with the
findings unread; since 7.7.0 every one stops. Part 2b is the automatic recovery the split planned for the `replan`
cases (`.dev/features/loop-grill-triage/PLAN.md`, Q1 and the parts table: "2b (7.8.0) = re-plan rounds: round counter
CLI, round archives, cap 2, S16 only on cap-with-`replan` or `spec`"). Its trigger is that measurement plus the
maintainer's approved split; whether a re-plan actually fixes what a triage escalated is not yet measured (see
`## Open questions`, Q5).

## Discovery (read live this run, 2026-11-11, `origin/main` `3afbb125`, SKILLS_VERSION 7.7.1)

An Explore pass mapped every place that assumes the front runs once; the facts below were then read here.

- **Routing tolerates a repeated front stage.** `stage-agent.mjs:630-646` keeps a second stage-start only while the
  same stage is still OPEN; after `finish` writes its return marker, the next `start` of that stage writes a fresh
  stage-start (`stage-agent.test.mjs:830` already pins that). One result file per run, cleared at `start` and consumed
  at `read` (`:119-134`, `:624`), so rounds do not collide. `INVOCATIONS` is a fixed `/pharn-plan <name>` /
  `/pharn-grill <name>` (`stage-agent-core.mjs:318-344`), and loop rule 5 passes only the first line
  (`:652-656`) — so a round must be discoverable from files on disk, not from the brief.
- **The cost ledger numbers repeats.** `cost-ledger.md:964-966`: rows sharing `(stage, iteration)` are `run 2` — "a
  freshness re-run or a re-plan" — and `stage-executions-core.mjs:111-117` implements it. `by_stage_iteration_model`
  merges the rounds of one stage into one `@null` bucket (totals exact, no per-round split). The derived outcome
  reads `undetermined` on a repeated non-verdict stage (`ship-outcome-core.mjs:346-381`) only when `LOOP.md` is
  missing or unreadable (`render-cost-ledger.mjs:772` reads the record first).
- **Rounds already exist in the data.** `grill-findings-core.mjs:39,170,182`: `round` 1–99 and ids
  `G<round>-<i+1>`; `grill-triage-core.mjs:111`: triage `round` must equal the findings' `round`. Nothing ties
  `round` to anything else, and `/pharn-grill` writes `"round": 1` as a literal (`pharn-grill.md:327-328`);
  `finding-shape.md:165` says so.
- **`/pharn-plan` overwrites silently** (`pharn-plan.md:151-152`, also `AC-TESTS.md` `:280-283`) and reads no grill
  output (`reads:` `:8-22`).
- **Archives need a writer.** `pharn-loop.md:59` `writes:` holds `SPEC.md` and `LOOP.md`; the grill's scope holds
  `GRILL.md` and `grill-findings.json` (`pharn-grill.md:24`). Nothing can write `GRILL.r1.md` today without a new
  floor CLI and its grant.
- **Every artifact list matches exact names.** `check-regress.mjs:159-184` `PIPELINE_ARTIFACTS` (`:150`: "Exact
  names, deliberately NOT a `**` glob"), `reconcile-ignore.json` `pipeline_artifacts.names`,
  `worktree-fingerprint.mjs:109-138` `INCLUDED_ARTIFACTS`, `loop-closeout.mjs:143-159` `STAGE_ARTIFACTS`. An archive
  outside them is untracked and new, so `/pharn-regress` refuses the run `scope-escaped` (`check-regress.mjs:407-411`,
  `stage-regress.mjs:676-683`) — S9 in iteration 1 — and a green commit would leave it uncommitted. Parity tests bind
  the lists (`check-bash-reconcile.test.mjs:833-848`, `worktree-fingerprint.test.mjs:260-285`), and
  `check-regress.test.mjs:193-211` reads every command for `features/<name>/<file>` names, so a literal
  `GRILL.r<n>.md` in prose would read as the name `GRILL.r`.
- **Tests pinning the once-only front:** `command-hygiene.test.mjs:2843-2886` (`LOOP_FRONT_ORDER`, each line once, in
  order), `:2876` (exit 3 → S16), `:2890-2914` (the 7.7.1 S16 re-run note), `:4734-4818` (`PHASE_MARKER_WIRING`: the
  routed start lines are exactly one set), `:5158-5167` (`routes 15`, `briefs 13`, `finishes 11`), `:6432`/`:6530`
  (every pinned line granted, no unused grant), `:5440-5450` (byte ceilings: `pharn-loop.md` 81,024 of 82,944,
  `pharn-plan.md` 25,556 of 26,624, `pharn-grill.md` 28,708 of 31,232, `pharn-triage.md` 7,466 of 8,704,
  `pharn-loop-close.md` 37,310 of 38,912).
- **Text that turns false:** `stage-agent-core.mjs:33-36` and `pharn-triage.md:83-84` ("anything but `proceed` stops
  the run", "`replan` … stops for a person"), the S16 row and branch (`pharn-loop.md:457`, `:778-789`), `## Step 4 — The
front, once` (`:685`), `pharn-loop-close.md:226-230` / `:279-281` (one route line and one triage line per stage),
  `docs/limitations.md:179`. Trusted, human-only (§ "Trusted-doc text" below): `ARCHITECTURE.md:259-260`,
  `THREAT-MODEL.md:216-219`, `LIMITS.md:282`.
- Lessons index: `check-lessons-index.mjs` GREEN (exit 0); candidates selected from it, the 16 cited read in full
  from canon this run.

## Applied lessons

- L29 — the archive names are ONE frozen list derived from the cap (`ARCHIVE_NAMES` in `grill-round-core.mjs`), and
  every artifact list's test iterates it, so a list that misses one archive fails.
- L34 — `current` over a feature with no archive returns round 1 explicitly; `next` refuses an empty or absent
  findings file rather than treating "no findings" as nothing to archive.
- L35 — the round is not stored a second time: it is the findings file's own `round` plus the archives on disk; no
  counter file under `pharn/.run/`.
- L36 — the archive set is closed both ways: `current` refuses a gap (`GRILL.r2.md` without `GRILL.r1.md`) or a
  partial round (some of a round's four files archived, not all).
- L43 — `next` checks that the live findings' `round` equals `1 + archived rounds` and that the triage binds to that
  findings file — agreement between run-written files, never that a re-plan fixed anything; the contract says so.
- L44 — each pinned loop line is self-contained: `grill-round.mjs next` prints the new round as JSON and the loop
  reads its exit code only; no shell variable crosses blocks.
- L54 — `grill-round.mjs` lstat-checks every source and destination, refuses a symlink or a non-regular file, and
  reads through `regular-file.mjs`'s one `O_NOFOLLOW` descriptor.
- L58 — the live files are still being written by the round in progress; `next` archives only after triage's check
  passed with exit 3, and refuses if any destination exists, so an archive is a snapshot of one finished round.
- L62 — every `grill-round.mjs` refusal is a fixed code plus a value-free hint; no file content is quoted.
- L65 — `/pharn-plan`, `/pharn-grill` and `/pharn-triage` never get an archive name in `writes:`; only
  `grill-round.mjs` writes archives, so a stage cannot rewrite the round it is judged against; a hygiene test pins
  the three `writes:` lists.
- L66 — the re-plan reads the archive `grill-round.mjs` just wrote for THIS run's round (`current` minus one), never
  "the newest file present"; `current` refuses a partial set.
- L67 — `grill-round.mjs`'s inputs are model-written files; its tests use a real round-1 findings/triage pair (one of
  the measured grills' shapes), not only hand-made minimal ones.
- L68 — the trusted-doc text below is a human patch applied and committed BEFORE `/pharn-dev-build` anchors; GATE 1
  says so.
- L72 — the S16 branch changes from "exit 3 or 4 → S16" to "4 → S16; 3 → `grill-round.mjs next`"; every test and
  doc that tests the old wording is found by grep and listed in `## Files` (the two S16 hygiene tests, the triage
  command, the stage-agent header, the close part).
- L83 — a re-plan that cannot be scoped is caught where it is pinned: `next` refuses (exit 1 → S9) before the
  re-plan starts, not at regress.
- L84 — the advance branch (`next` exit 0) gets a CLI test on a realistic round-1 pair, and the cap branch (exit 5)
  on a realistic round-3 pair, so a CLI that always prints "cap reached" or always advances fails.

## What is built

### 1. `pharn/floor/grill-round-core.mjs` (pure) + `pharn/floor/grill-round.mjs` (CLI)

- `REPLAN_CAP = 2` (two re-plan rounds: at most rounds 1, 2 and 3). `ARCHIVE_NAMES` derived from it, frozen:
  `PLAN.r1.md`, `GRILL.r1.md`, `grill-findings.r1.json`, `grill-triage.r1.json`, and the same four with `r2` — eight
  names. Round `r` archives the four live files `PLAN.md`, `GRILL.md`, `grill-findings.json`, `grill-triage.json`.
- `current <name>` — the round the next grill writes: `1 + k`, where `k` is the number of complete archived rounds.
  Exit `0` with one JSON line `{"schema":"pharn-grill-round/1","round":<n>,"archived":<k>}`; `1` a refusal (`gap`,
  `partial-round`, `not-regular`); `2` usage or an unreadable feature directory.
- `next <name>` — called by the loop only after `grill-triage.mjs check` exited `3`. Re-validates both live files
  (imports `grill-findings-core.mjs` and `grill-triage-core.mjs`, never copies them — L35), requires the verdict to be
  `replan`, the findings' `round` to equal `1 + k`, and no destination to exist. Then:
  - `round < REPLAN_CAP + 1` → renames the four live files to their `.r<round>` names (each rename lstat-checked,
    refusing a symlink — L54) and prints `{"schema":"pharn-grill-round/1","round":<round+1>,"archived":<round>}`,
    exit `0` (advance);
  - `round == REPLAN_CAP + 1` → writes nothing, exit `5` (no re-plan round left);
  - anything else → exit `1` with fixed codes (`not-replan`, `round-mismatch`, `archive-exists`, `findings-invalid`,
    `triage-invalid`, `gap`, `partial-round`, `not-regular`); `2` usage or unreadable.
- `next` renames rather than copies, so after an advance the live `PLAN.md` is absent until `/pharn-plan` writes the
  next one — a stage that ran out of order finds no plan and halts (`pharn-grill.md:70-73`), rather than grilling a
  stale one.

### 2. Commands

- `.claude/commands/pharn-loop.md`, Step 4 full column: the triage read's branch becomes `0` → entry gates and test;
  `4` (`spec`) → **S16**; `3` (`replan`) → run `node pharn/floor/grill-round.mjs next '<name>'` (pinned once, granted
  exactly): `0` → **go back to `/pharn-plan`'s start line above** and run the plan, the entry-gate peek, both grill
  stops, the grill, the findings read, the triage and the triage read again, in the same order and with the same
  lines (never a second copy of a line — the once-only pins hold); `5` → **S16** (no re-plan round left); anything
  else → **S9**. The S16 row reads "`4` (`spec`), or `3` (`replan`) when `grill-round.mjs next` exits `5`". The S16
  branch keeps its 7.7.1 re-run note, rewritten so the by-hand route names the round archives. The heading
  `## Step 4 — The front, once` becomes `## Step 4 — The front: plan → grill → triage (up to three rounds) → test →
iteration 1`. The entry-gate peek after the plan runs once per round (a read, never a wait; the "never re-run on
  `5`" rule is about one peek, and is reworded so it stays true). `reads:` gains `grill-round.mjs`.
- `.claude/commands/pharn-plan.md`: **re-plan mode, by membership (P5).** Run `grill-round.mjs current <name>`; when
  it prints `archived: k ≥ 1`, read `PLAN.r<k>.md`, `grill-findings.r<k>.json` and `grill-triage.r<k>.json` as
  `trust: untrusted` DATA (P2) and revise the plan so each finding triaged `replan` is addressed or its plan line
  changed, leaving `proceed` findings as they stand; the SPEC gate, the hash carry-forward, `applied_lessons` and
  `AC-TESTS.md` are as on a first plan. `archived: 0` → a first plan, unchanged. A refusal → HALT and ask (or, under
  the loop, report back blocked). `reads:` gains the three archive patterns; `writes:` unchanged (L65).
- `.claude/commands/pharn-grill.md`: write `"round": <n>` from `grill-round.mjs current <name>` instead of the
  literal `1`; ids follow (`G2-1`, …). A refusal from `current` → write `findings: NOT written (grill-round.mjs exit
<n>)` and skip the findings file, as a render failure does today.
- `.claude/commands/pharn-triage.md`: the `replan` description (`:83-84`) says that in a full loop it sends the plan
  back for a re-plan round while one is left, and stops for a person after that.
- `.claude/commands/pharn-loop-close.md`: Step 7's route list prints one line per stage start (a round's plan, grill
  and triage each get theirs, in order), and the triage honesty line reports the last round's verdict plus how many
  re-plan rounds ran; the record's pointers name the round archives when they exist.

### 3. Contracts

- `pharn/pharn-contracts/grill-triage.md`: a `## Rounds (7.8.0)` section — the cap, the eight archive names, what
  `next` checks and what it does not (agreement, never that a re-plan fixed a finding — L43), and that a re-plan reads
  the triage reasons as DATA (the trust paragraph extended).
- `pharn/pharn-contracts/finding-shape.md:165`: "`/pharn-grill` writes `1`" → "`/pharn-grill` writes the round
  `grill-round.mjs current` prints (1 on a first plan)".

### 4. Artifact lists and their tests

- The eight archive names join `check-regress.mjs` `PIPELINE_ARTIFACTS`, `reconcile-ignore.json`
  `pipeline_artifacts.names`, `worktree-fingerprint.mjs` `INCLUDED_ARTIFACTS` and `loop-closeout.mjs`
  `STAGE_ARTIFACTS` (a green commit carries every round). Each list is written out (exact names, as today), and a new
  test binds each to `ARCHIVE_NAMES` (L29). The four archived JSON names are `MODEL_WRITTEN` in
  `check-regress.test.mjs`. Command prose names archives as the literal eight names or through `grill-round.mjs`,
  never as a `<n>` pattern, so `check-regress.test.mjs:193-211`'s recurrence guard keeps reading real names.

### 5. Version, docs, guides

- 7.8.0 (minor: a new floor CLI and a new loop behaviour). `MIN_CLI` unchanged: pharn-cli installs `pharn/floor/` as a
  directory and commands by prefix (`src/lib/executable-unit.ts:29,48-50`, read for 7.7.0), and no config key is added.
- `stage-agent-core.mjs:33-36` header, `docs/limitations.md:179`, `.dev/guides/floor-checks.md` (a `grill-round.mjs`
  section), `.dev/guides/floor-orchestration.md` (the loop's front), CHANGELOG, README badge.

### 6. Trusted-doc text — a human patch, applied and committed BEFORE `/pharn-dev-build` anchors (L68)

Delivered as a Python patch script the maintainer runs (the standing instruction for files the agent cannot write),
then deleted. Exact replacements:

- `pharn/ARCHITECTURE.md:259-260`: "Any verdict but `proceed` stops the run." → "A `spec` verdict stops the run. A
  `replan` verdict sends the plan back to `/pharn-plan` for a re-plan round — at most two, each round's plan and grill
  outputs archived by `pharn/floor/grill-round.mjs` (7.8.0) — and stops the run when no round is left."
- `pharn/THREAT-MODEL.md`, channel (6), after "…a steer toward proceeding is the residual.": "Since 7.8.0 the same
  findings, with triage's reasons, also reach `/pharn-plan` in a re-plan round, which revises the plan from them: an
  injected finding can steer a revision as well as a disposition. The floor holds the round count, the archive set and
  the binding between each round's files; the revised plan passes the same spec-hash and lessons checks and a fresh
  grill and triage, and what it changed is the model's judgment."
- `pharn/LIMITS.md:282`: "…and its findings reach the run only through triage's dispositions." → "…and its findings
  reach the run only through triage's dispositions and, since 7.8.0, the re-plan rounds those dispositions start."

### 7. Amended after the grill (2026-11-11, before the build's anchor; no file added or removed)

`GRILL.md` raised four important concerns; each is fixed inside files the plan already names:

- **Reconcile does not reach archives** (P0): the guarantee audit is corrected above, and the contract's rounds section
  says the archives are protected at write time only.
- **Grants for `current`** (P6): `pharn-loop.md`'s `allowed-tools` grants `node pharn/floor/grill-round.mjs current *`
  (the inline `/pharn-plan` and `/pharn-grill` fallbacks) as well as `next`, so no inline stage prompts mid-run.
- **A part-way rename failure** (P7): `next` checks all four sources and all four destinations before the first
  rename; if a rename then fails it renames back the files already moved and exits `1` with code `rename-failed`; if
  that rollback also fails it exits `1` with `rename-partial` and prints which of the eight names exist (names only,
  no content — L62), so a person can restore them.
- **What a re-plan reads** (P7): `current` also prints `"replan_from"` — `"live"` when a live `grill-triage.json`
  binds to the live findings of round `1 + archived` (the state after an S16 stop: `spec`, or the cap), else `"r<k>"`
  for the newest complete archive, else `null` (a first plan). `/pharn-plan`'s re-plan mode reads exactly those three
  files (plan, findings, triage of that round), so a by-hand re-plan after a cap stop acts on round 3's findings. The
  S16 note says so.

## Files

- `pharn/floor/grill-round-core.mjs` — new, pure: cap, archive names, `current`, `next` decisions — layer product floor
- `pharn/floor/grill-round.mjs` — new CLI: `current`, `next` — layer product floor
- `pharn/floor/grill-round.test.mjs` — new tests (realistic pairs, every refusal, symlink, cap) — layer product floor
  (test)
- `pharn/floor/check-regress.mjs` — `PIPELINE_ARTIFACTS` gains the eight archive names — layer product floor
- `pharn/floor/reconcile-ignore.json` — `pipeline_artifacts.names` gains them — layer product floor
- `pharn/floor/worktree-fingerprint.mjs` — `INCLUDED_ARTIFACTS` gains them — layer product floor
- `pharn/floor/loop-closeout.mjs` — `STAGE_ARTIFACTS` gains them — layer product floor
- `pharn/floor/stage-agent-core.mjs` — the header's escalation sentence — layer product floor
- `pharn/floor/check-regress.test.mjs` — `MODEL_WRITTEN` gains the four archived JSON names — layer product floor
  (test)
- `pharn/floor/loop-closeout.test.mjs` — the `STAGE_ARTIFACTS` order pin — layer product floor (test)
- `pharn/pharn-contracts/grill-triage.md` — `## Rounds (7.8.0)` and the trust paragraph — layer pharn-contracts
- `pharn/pharn-contracts/finding-shape.md` — the round sentence — layer pharn-contracts
- `.claude/commands/pharn-loop.md` — Step 4 rounds, S16 row and branch, heading, peek wording, grant, `reads:` — layer
  command
- `.claude/commands/pharn-plan.md` — re-plan mode, `reads:` — layer command
- `.claude/commands/pharn-grill.md` — round from `grill-round.mjs current` — layer command
- `.claude/commands/pharn-triage.md` — the `replan` description — layer command
- `.claude/commands/pharn-loop-close.md` — route lines per stage start, the triage line, archive pointers — layer
  command
- `.dev/floor/command-hygiene.test.mjs` — `LOOP_FRONT_ORDER` gains the `next` line; the two S16 tests rewritten for the
  new branch; the three stages' `writes:` exclude archives (L65); byte ceilings re-measured — layer dev floor (test)
- `.dev/floor/stage-load-budget.test.mjs` — loop / plan / grill load rows re-measured — layer dev floor (test)
- `.dev/guides/floor-checks.md` — a `grill-round.mjs` section — layer dev guide
- `.dev/guides/floor-orchestration.md` — the loop front with rounds — layer dev guide
- `docs/limitations.md` — the loop triage sentence — layer repo docs
- `CHANGELOG.md` — the 7.8.0 section — layer repo meta
- `SKILLS_VERSION` — 7.8.0 — layer repo meta
- `README.md` — badge, regenerated CURRENT-STATE — layer repo meta

### Not touched

- The four trusted docs (the human patch in § 6, committed before the build), `pharn.config.json` and `MIN_CLI`,
  `stage-agent.mjs` (repeats already work), the cost ledger and its contract (rounds are already `run 2`; the merged
  `@null` bucket is a stated bound), `loop-record-core.mjs` `BLOCKED_IDS` (S16 keeps one id for both causes — Q3),
  `.claude/commands/pharn-ship*.md` (`/pharn-ship` runs no triage), `pharn-loop-quick.md` (a quick run has no triage).

## Contracts satisfied

- `pharn/pharn-contracts/grill-triage.md` — extended with the rounds section; the triage file's shape is unchanged.
- `pharn/pharn-contracts/finding-shape.md` — the `round` rule is unchanged; only who sets it.
- `pharn/pharn-contracts/loop-record.md` — unchanged; S16 keeps its id.
- `pharn/pharn-contracts/cost-ledger.md` — unchanged; a re-plan is already a `run 2` row (`:964-966`).

## Evals / tests to write (P1)

No Capability and no `rule_id` is added, so no eval pair is owed. Tests:

- `grill-round.test.mjs`: `current` with 0, 1 and 2 complete rounds; a gap and a partial round refused; `next` on a
  realistic round-1 `replan` pair advances (four renames, JSON line, exit 0); `next` on a realistic round-3 pair exits
  5 and writes nothing; `proceed`/`spec` verdicts, round mismatch, an existing destination, invalid findings, a
  symlinked source and a symlinked destination each refused with their code and no file moved; RED lines carry no file
  content (L62).
- Artifact-list tests: each of the four lists contains every `ARCHIVE_NAMES` member (L29); the existing parity tests
  then hold.
- `command-hygiene.test.mjs`: the front order with the `next` line, each line once; the S16 branch ("`4` → S16", "`3`
  → `grill-round.mjs next`", "`5` → S16", "go back to `/pharn-plan`'s start line"); the S16 re-run note's new wording;
  `pharn-plan.md` re-plan mode reads the three archives and keeps `writes:` at two files; no stage `writes:` names an
  archive (L65); each control (L60) shows a removed line is reported.

## Guarantee audit (P0)

- "At most two re-plan rounds" → floor (enum/regex + integer compare): `grill-round.mjs next` exits `5` at round 3
  and writes nothing; that the loop obeys the exit is orchestration (advisory).
- "Each round's files are archived intact and never overwritten" → floor at write time only: lstat checks, refusal on
  an existing destination, renames within one directory. After that nothing detects a change: the archive names are
  pipeline artifacts, which reconcile exempts, so a later Bash write to one is neither prevented nor detected
  (amended after the grill's P0 finding; `LIMITS.md §6`'s class, stated in the contract).
- "The grill writes the right round" → floor at the advance point only: `next` refuses a findings `round` that is not
  `1 + archived`; a grill that wrote a wrong round passes its own check and is caught by the next `next`, or by
  nothing if triage reads `proceed` or `spec` (a bound, stated in the contract).
- "A re-plan addresses the escalated findings" → advisory: the model's judgment, re-judged by a fresh grill and
  triage; nothing checks it against the earlier findings.
- The commands' re-plan mode, the loop's go-back and the trusted-doc sentences → advisory prose.

## Trust audit (P2)

- The archived findings' `problem` / `evidence` and triage's `reason` are untrusted free text, and in a re-plan round
  they reach `/pharn-plan`, which changes the plan from them — a new path for injected text to steer a stage's
  OUTPUT, not only a disposition. Bounded: the plan still passes the SPEC gate, `check-plan-spec-agree`,
  `check-plan-lessons`, a fresh full grill and a fresh triage, its `## Files` still passes the setter at build, and the
  round count is floor-capped. Not zeroed: named as an extension of THREAT-MODEL §5 channel (6), the human patch in
  § 6.
- `grill-round.mjs` reads no free text for meaning: it validates shapes, compares ids, rounds and the sha256, and
  prints ids and integers only.

## Determinism audit (P5)

- Re-plan mode in `/pharn-plan` is a membership test (`archived ≥ 1` from `current`); the loop branches on exit codes
  `0` / `3` / `4` (triage) and `0` / `5` / other (`next`); every refusal ends in S9 or, run by hand, in asking the
  person.

## Open questions — RESOLVED at the halt (human-selected, P6, 2026-11-11)

- Q1 → **two re-plan rounds** (up to three plan → grill → triage passes), `REPLAN_CAP = 2`.
- Q2 → **archive `PLAN.md` too** (`PLAN.r1.md`, `PLAN.r2.md`), with the three grill outputs.
- Q3 → **one stop id**: S16 `blocked: grill-escalation` for both causes; `### next_steps` says which.
- Q5 → **build now**, no measurement first; the cap and the S16 fallback bound the cost.
- Q4 → **patch script**: the maintainer ran it after approval; committed as `8839760` before the build. That edit
  changed `pharn/ARCHITECTURE.md`, so `spec_content_hash` was re-pinned from the approved plan's
  `afa7dd52…3bf7f` to the post-patch `f3d8748e…54750` — the edit this plan itself specifies, nothing else.
- Plan approved as written at GATE 1 (2026-11-11).
