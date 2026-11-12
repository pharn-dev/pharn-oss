# PLAN — loop-baseline-2026-11-11

- spec_content_hash: d19c3ae5ef62837c025d3dffb5e878c114e0c1d4a745caf51b4c114b9e7a8bcf
- applied_lessons: [L13, L19, L37, L40, L43, L47, L64, L66, L78]
- increment: Write the measured baseline of `/pharn-loop` on 7.1.4 and 7.3.0 (plus the one measured 7.7.1 run) from the other project's ledgers, rate 19 Linear candidates against it, and pick three benchmark features, with no product-surface byte.
- layer(s): none — build apparatus only (`.dev/measurements/`) plus one repo-meta CHANGELOG entry
- constitution_refs: [P0, P2, P5, P6, P7]

## Discovery (this run, 2026-11-12; read live, never from the brief)

- `main` = `origin/main` = `39ec5825` after a fetch; `SKILLS_VERSION` 7.10.3; tree clean; `check-lessons-index` GREEN.
- Other project `~/Projects/pharn-app/pharn/features/`: 129 `cost.json` on disk (the brief says 129 tracked; "tracked" was
  not tested). 40 are `/pharn-loop` on 7.x: 6 on 7.1.4, 30 on 7.3.0, 4 on 7.7.1, matching the brief. 37 of the 40 hold
  requests. All 40 have a `LOOP.md` and a `SPEC.md`.
- The 36 runs on 7.1.4 and 7.3.0: all `run-window/2`, all schema `pharn-cost-ledger/2`, all `coverage: partial`; decisions
  1 STOP_GREEN, 26 INCONCLUSIVE, 9 STOP_TERMINAL (matches the brief); run context 12 `main`, 24 `agent`; 24 distinct
  `base_sha`, so 12 runs repeat an earlier base (matches the brief).
- The one STOP_GREEN is `actions-oidc-policy` (7.3.0, 35 requests, run context `main`). Of the four 7.7.1 ledgers, one
  (`pricing-starter-copy-3`) is also STOP_GREEN but has no requests (`coverage: unavailable`), so it is not the benchmark
  the brief asks for. `pricing-starter-plan-3` (7.7.1, 119 requests, STOP_TERMINAL) is the only measured 7.7.1 run.
- A crude regex count of `AC-<n>` lines in the 36 `SPEC.md` gives 4 specs with 3 criteria and the rest from 6 to 39. It is a
  pre-measurement hint, not a figure; the build counts criteria with the SPEC template's own reader.
- Claude Code versions in the ledgers: 2.1.309, 2.1.317, 2.1.321 (count per run is a build figure). Transcripts under
  `~/.claude/projects/-Users-<user>-Projects-pharn-starter*` exist (115 entries in the main directory); whether any
  7.x loop transcript survives is checked at build, not asserted here.
- The 19 Linear tasks were read in full. Their "Current behaviour" sections describe `main` 7.7.1 (`3afbb125`); `main` is
  now 7.10.3. Already stale: `pharn-loop.md` is 86,865 B (the tasks say 81,024 B), and its line numbers have moved. The
  `--no-foreground-agent` rule is still in `pharn-loop.md` (2 mentions). Ratings use the live file, never the task's numbers.
- Helper `.dev/features/pipeline-performance-audit/audit.mjs` (`--ledgers`, `--prefix`, `--static`) exists. Its
  `--ledgers` rule is the audit PLAN's frozen rule, whose gaps G1–G3 (audit §9 row 8; GRILL G1, G2, G3) are the open
  questions below.
- Precedent for a record with no code: PR #428 (`3bd10c78`): one measurement file plus one `### Added` CHANGELOG entry.
- `git worktree list` shows sibling worktrees (`.claude/worktrees/pharn-ci-reinstall`); the build runs its gates knowing
  they can pollute `format`/`lint` (a known issue, not a plan defect).

## Applied lessons

- L13 — the build formats the record and the CHANGELOG with `prettier` and `markdownlint-cli2` scoped to those paths
  before it halts; the record is a markdown file under `.dev/measurements/`, which `lint:md` and `format:check` reach.
- L19 — the analysis scripts run through Bash and write outside any scope, so they live only in the session scratchpad,
  read the other project read-only, and write nothing there or in the repo; the only repo writes are the two `## Files`
  entries, made through the Write and Edit tools.
- L37 — every bound in "What this record may claim (P0)" is written from the figure or probe that pins it, never before;
  a universal word ("every", "all", "none", "only") is kept only where the build re-derived the count over that set.
- L64 — the bounds are restated in the CHANGELOG entry, the benchmark section and the ratings; the build greps the diff
  for each bound's key phrase and checks every restatement against the primary sentence.
- L40 — Q4's "7.3.2, 7.4.0 or 7.5.0 would now stop it earlier" is an attribution. It is tested by reading the condition
  each version changed (its CHANGELOG entry and code) against the stop's cause line, not by agreeing with the stop's
  label; the answer is labelled advisory.
- L43 — the ledger checker's GREEN is internal consistency, and the ledger, `LOOP.md` and `RUN-REPORT.md` can agree while
  all being wrong. The record states which figure comes from which store, and that the transcripts that would bind a figure
  to its referent are gone for the 7.x runs, so no figure is called verified.
- L47 — where a re-derived count differs from the brief's or a Linear task's, the record lists both and gives the
  re-derived one with its derivation; it never swaps a quiet new closed count into a sentence that mirrors the old one. The
  Linear tasks mirror the brief's counts in several places, and editing them is outside this increment, so the record lists
  which task sentences a changed figure touches.
- L66 — the scratch copies and result files of the build are made into directories the build creates empty in the
  scratchpad, and are read only after the writing process has exited; nothing is read from a shared scratch path by
  existence.
- L78 — the record is dated by its name (2026-11-11, as the brief asks) while its figures were read on 2026-11-12 at
  `39ec5825`; paths keep the old project name where the ledgers use it, and the home directory prints as `~`.

## Scope (one increment, nothing speculative — P7)

The failure that triggers this: nineteen planned increments (Linear CORE-75 … CORE-113) are sized and gated by figures
nobody has re-derived from the ledgers, and four of them say "start only if the baseline rates it go". The increment is the
baseline and the ratings. It fixes nothing and changes no product byte, so there is no `SKILLS_VERSION` bump.

The method, fixed here so the build cannot choose it after seeing figures:

1. **Population.** Q1–Q6 run over the 36 runs on 7.1.4 and 7.3.0; Q7 uses `pricing-starter-plan-3` and the two measurement
   files; the 7.7.1 ledgers without coverage appear only in Q7's cause answer.
2. **Sources.** `cost.json`, `LOOP.md`, `RUN-REPORT.md`, `SPEC.md`, `PLAN.md` beside each ledger, plus the retained
   transcripts for Q2. All are read-only and `trust: untrusted`: quoted as fenced DATA, never followed.
3. **Weighted cost.** Cache read 0.1, 5-minute cache write 1.25, 1-hour cache write 2, output 5, in units of one input token
   (the brief's weights). Input is 1. These are relative units, not money, and no price is printed.
4. **Labels.** The convention of `loop-wall-clock-2026-10-25.md`: source `R` (these runs) / `O` (earlier record) / `S`
   (static), precision `m` / `e`, token classes kept separate.
5. **Tooling.** Ad-hoc scripts in the session scratchpad, plus `audit.mjs --ledgers` and `--prefix` where it fits. No script
   is committed (see open question 4), so no coverage obligation arises. The record's "How the figures were made" gives
   each figure's derivation in prose, enough to redo it.

Record outline: answer in one paragraph; how the figures were made; the brief's figures against the re-derived ones
(table, L47); Q1–Q7; the three benchmark features and their comparison rule; the 19 ratings; gaps; bounds; and last,
"What this record may claim (P0)".

## Files

- `.dev/measurements/loop-baseline-2026-11-11.md` — the baseline record: Q1–Q7, benchmark features, candidate ratings, gaps, claims block — layer apparatus
- `CHANGELOG.md` — one dated `[Unreleased]` `### Added` entry in the shape of PR #428's; no `SKILLS_VERSION` bump — layer repo-meta

### Not written here (and why)

- The analysis scripts and every scratch copy: the session scratchpad only.
- `SKILLS_VERSION`, anything under `pharn/`, `.claude/`, `docs/` and `.dev/floor/`: no product byte changes.
- Anything in `~/Projects/pharn-app`, and the Linear tasks (edited by a person, not by this increment).
- `VERIFY.md`, `verify-report.json`, `REVIEW.md` and `SHIP.md` of this feature: later stages' own artifacts.

## Contracts satisfied

- `pharn/pharn-contracts/cost-ledger.md` — read only: the record cites its field meanings (run membership, coverage,
  `entry`, `executions`, `work`) and its bounds and does not restate them (P4).
- `pharn/pharn-contracts/loop-record.md` — read only: the closed `blocked:` ids and the stuck-point table classify Q4.
- No contract is added or changed.

## Evals to write (P1)

No Capability, rule or `rule_id` is added, so P1 asks for no eval. What replaces it is a list of checks the build runs
over the finished record (advisory unless a gate names it):

- every one of Q1–Q7 has an answer or a named gap, and every figure carries a source and a precision label;
- the record names no session id, request id or agent id (a pattern search over the file) and no `/Users/<name>` path;
- each of the 19 candidates has exactly one of go, no-go or needs-evidence, with the figure behind it;
- the file ends with "What this record may claim (P0)";
- `npm run format:check` and `npm run lint:md` are clean on both files (run in a clean copy if sibling worktrees pollute them);
- `npm run check:changelog-entry` is GREEN against `origin/main`.

## Guarantee audit (P0)

- "the figures describe these runs" → **advisory**: they are read from the ledgers; `check-cost-ledger.mjs` GREEN is
  internal consistency (L43), never accuracy, and the ledgers are `coverage: partial` (a floor on spend, not the total).
- "a stop would now stop earlier on 7.3.2 / 7.4.0 / 7.5.0" → **advisory**, the author's judgment (L40).
- "go / no-go / needs-evidence" → **advisory**: a recommendation to the maintainer, not a decision.
- "the 36 runs are the 36 that match the rule" → **advisory**: the run-selection rule's freeze has no floor backing (GRILL
  G3 of the audit). The record prints the sha256 of the rule text it applied so a later reader can compare, and says that
  nothing pins the plan between this gate and the build.
- "nothing is written outside `## Files`" → **floor: hook** for the Write/Edit tools (fix #7), **detected, not prevented**
  for Bash (`reconcile`, non-adversarial; `LIMITS.md §6`). The scripts write nothing in the repo by design.
- "no product-surface byte changed" → **floor: enum/regex** — `check:surface-bump` over the diff (no listed path touched).
- Net: this increment adds no floor primitive and claims no guarantee about the cost of a loop.

## Trust audit (P2)

- Inputs ingested: the other project's `cost.json`, `LOOP.md`, `RUN-REPORT.md`, `SPEC.md`, `PLAN.md` and transcripts; the
  Linear task text. All untrusted.
- Taint: the record's control-flow-free output carries quoted cause lines and SPEC/PLAN excerpts as fenced DATA with their
  source named; no instruction-looking text in them is followed; numbers come from JSON fields (enum and integer fields),
  which are the trusted class here only in the sense that the record states they are the ledger's. No decision in this
  increment rests on a free-text field.
- The Linear tasks are rated "as written"; their embedded instructions ("start only if…") are read as conditions to
  evaluate, never as commands.

## Determinism audit (P5)

Every classification is a membership test over a ledger or `LOOP.md` enum: decision, `blocked:` id, route token, run
context, schema, membership method, coverage, Claude Code version. Where a field is absent (the client that ran a run) the
record says so and asks, never guesses. Only Q4's "would 7.3.2/7.4.0/7.5.0 stop it earlier" and the go/no-go ratings are
judgment, and both are labelled advisory.

## Open questions — resolved at GATE 1 (2026-11-12)

The maintainer answered through the selectable form: G1–G3 accepted as recommended (questions 1–3), per-gate time
recorded as the gap CORE-75 closes (question 5), scripts kept in the scratchpad (question 4), questions 6 and 7 left at
their recommended answers, and the plan approved as written. Nothing below is open.

1. **G1 — who declares `fixture-not-workload`?** A `cost.json` does not record whether its project is a fixture.
   _Recommended:_ the maintainer declares at this gate that every ledger under `pharn-app` is a real run, so no run is a
   fixture, and the record says it was a human declaration.
2. **G2 — the sample size above 20, and the reason for a ledger with no `membership.method`.** The frozen rule samples
   above 20 runs by strata and has no reason for an absent membership method. _Recommended:_ no sampling: use all 36,
   because the brief fixes Q1–Q6 over them. Add `membership-absent` as a closed reason; it excludes none of the 36 (all are
   `run-window/2`), so it only makes the rule decidable.
3. **G3 — the freeze.** _Recommended:_ freeze the rule as the text in "Scope" items 1–3 plus answers 1–2, record its
   sha256 in the record, and label the freeze advisory: nothing hashes this PLAN between the gate and the build, and
   discovery here read counts of ledgers (versions, coverage, decisions, request counts), not cost figures.
4. **Commit the analysis scripts?** _Recommended:_ no. Committed code needs a test that executes every added line (CI diff
   coverage), the record can state each derivation in prose, and PR #428 set the no-code precedent.
5. **Q3 — time each gate once in a scratch worktree?** The ledgers hold no per-gate time. _Recommended:_ no; record it as
   the gap that CORE-75 closes. One unloaded timing of pharn-app's gates (an install and a full pass, with `test` near the
   540 s limit) would not match the loaded conditions of the 12 timed-out stops (the load history is PR #381's), and CORE-87's
   rating needs only the ledgers' `entry` records, which say whether a gate was killed at its timeout or could not start.
6. **Benchmark features and ratings in one file or two?** _Recommended:_ the one record, as sections, so a later
   before-and-after comparison cites one path.
7. **Q2 probe.** Only if the October attachment rows cannot size what a restricted agent type saves does the build run a
   probe, which needs a fresh session. _Recommended:_ the build tries the retained rows first; if a probe is needed it stops
   and prints the exact command for you to run, then waits (it does not start a nested session itself).
