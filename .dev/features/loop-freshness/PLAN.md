# PLAN — loop-freshness

- spec_content_hash: 2f8b92646bdf31d51169f46c74c14c10debdb456291fb0213be63cfc4d77e838
- applied_lessons: [L5, L18, L20, L22, L29, L30, L33, L34, L35, L36, L39, L41, L43, L44, L45, L46, L50, L51, L52]
- increment: `/pharn-loop` reads a stop only from evidence that belongs to this tree, and re-runs the stage when it does not — a new floor checker `pharn/floor/check-loop-fresh.mjs`, read before `check-loop.mjs` and again at the Step 6c commit gate.
- layer(s): pharn/floor (product floor), pharn-contracts (vocabulary + two report contracts), `.claude/commands/pharn-loop.md` (product command), `.dev/floor` (hygiene pins)
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]

## Why (P7 — the recorded failure)

`CHANGELOG.md` §6.3.0 records a dogfooded unattended `/pharn-loop` run that "skipped `/pharn-grill`,
`/pharn-regress` and `/pharn-verify` entirely" and still wrote a floor-grade-looking decision. #222
re-derives a decision from the reports it cites. #230 made the gate map tested code. Both say, in their
own text, what they do not prove. `gate-run-record.md` "What it does NOT prove" says so under
**Freshness** ("`fingerprint.final` is written here and compared against nothing") and under **that the
stage ran at all**. `pharn-loop.md:638-640` says a self-consistent fabricated pair still passes. So a
loop iteration that skips `/pharn-regress` or `/pharn-verify` still finds the previous iteration's report
and stamp on disk, and nothing notices. The user's requirement is that every stage is mandatory and the
loop runs to a real stop, rather than to a summary that names skipped gates.

## Correcting the record (the prompt's claims, re-verified at `9fc6f86`, SKILLS 6.9.3)

- **Main moved** from `cd764cc` (6.8.1) to `9fc6f86` (6.9.3: #232–#236, #241), so several line numbers
  shifted. `pharn-loop.md`'s exit-code branch list is at `:314-323` (not `:306-313`). The commit gate is
  `:472-479` (not `:456-462`). The stale reconcile bullet is `:618-620` (not `:602-604`). The
  fabricated-pair bound is `:638-640` (not `:622-624`). The record-repair bound is `:401-404` (not
  `:390-393`). `run-gates.mjs`'s `stdout_sha256` write is `:691` (not `:667`) and the log naming is at
  `:644-646`. These all verified as stated: Step 1a `:133`; `check-verify.mjs:265`;
  `gate-run-core.mjs:86-108`, `:129`, `:504-510`; `check-regress.mjs:439/:560`; `STUCK_POINTS` at
  `command-hygiene.test.mjs:1361` with its `=== 10` at `:1470`; the closure test at
  `gate-run-core.test.mjs:122-141`; `pharn-verify.md:21`; `pharn-regress.md:18`.
- **"Stamp paths the commands pin: … `.pharn/pharn-regress/base-gates/stamp.json`"** — the path was
  pinned, but **no pinned line could produce a file there** until #241 (6.9.3). The pinned base `init`
  exited 2 `spec-mismatch` in every real run. This was reproduced in a scratch repo and fixed first, as its
  own increment, because checks C/G/H below read that stamp.
- **"A repo whose gates mutate a tracked file will now see `tree-moved-since-verify` at every
  decision"** — **false as stated.** Check F compares verify's **final** fingerprint (taken AFTER its own
  gates, so a gate's own mutation is inside the stamp's window) against the live tree. It trips only on a
  write that lands AFTER verify finalized. Check G compares regress's head **final** with verify's
  **init**. Every write between those two points is excluded (`REGRESSION.md`, `regression-report.json`,
  the `.pharn/` worktree removal), so a mutating gate trips neither check. Measured on this repo: the #230
  dogfood stamp at `.pharn/pharn-verify/gates/stamp.json` has no `mutated: true` run and
  `init === final`. The incident project is not in this tree, so Q6 is answered for this repo only and the
  bound is stated.
- **Not in the prompt:** on a RED spec→plan chain, `/pharn-regress` writes **no**
  `regression-report.json` (`pharn-regress.md:352`), so the previous iteration's report survives on disk.
  Check G catches that whenever the build changed the tree. Otherwise it is the recency bound below.

## Phase 0 answers (path:line)

1. **Gap 6 — confirmed.** `output-hash-mismatch` appears ONLY in its definition
   (`gate-run-core.mjs:97`). There is no `fail(`/`err(`/`reason_code:` site in `gate-run-core.mjs`,
   `run-gates.mjs`, `check-verify.mjs` or `check-regress.mjs`. The closure test
   (`gate-run-core.test.mjs:122-141`) runs one way only: emitted ⊆ `REASON_CODES`. A member with no
   emitter passes. `run-gates.mjs:691-692` records `stdout_sha256`/`stderr_sha256`, and nothing ever
   re-hashes the files. This increment gives the member its first emitter (check J) and adds the reverse
   closure.
2. **Which members reach a written report.** `verify-report.json` is `check-verify.mjs --stamp`'s stdout
   verbatim (`pharn-verify.md:389`). Its stamp path emits `usage-error` (`:182,:195,:257`),
   `stamp-missing` (`:208`), `stamp-malformed` (`:226,:244`), and every `validateStamp` code
   (`gate-run-core.mjs:395-482`): `stamp-malformed`, `stamp-unfinalized`, `entry-not-run`,
   `tree-changed-between-gates`, `reconcile-not-last`, `coverage-violation`, `stage-mismatch`,
   `feature-mismatch`, `side-mismatch`. Via the model-written Step-6 fail-closed path taken on a runner
   exit 2 (`pharn-verify.md:241-242,255`), every `run-gates.mjs` code can also land there:
   `path-containment`, `lock-busy`, `bad-gates`, `bad-extra` and the ones above. `regression-report.json`
   is `check-regress.mjs verdict`'s stdout verbatim (`pharn-regress.md:349-351`). It adds `base-not-sha`
   (`:466`), `base-head-mismatch` (`:491`) and `spec-mismatch` (`:505`). **LAPSE_CODES** (re-run the
   stage) are:
   - **`stamp-missing`, `stamp-unfinalized`, `tree-changed-between-gates`** — the contract names these
     three (`gate-run-record.md:118-119`). Each means the runner never produced one finished stamp for the
     current state.
   - **added: `entry-not-run`** — `validateStamp`'s own comment (`gate-run-core.mjs:445-446`) names it
     "separately from the malformed class so a later increment can route it to 're-run the stage'". An
     entry that never ran is a runner that stopped mid-drain, the same class as unfinalized.
   - **added: `lock-busy`** — two runner invocations contended (`run-gates.mjs:269,275,284`). That is
     orchestration, not input, and a single re-run under the budget is the fitting response.
   - **not added:** `usage-error` (it covers a hand-passed `--complete` disagreeing with the stamp,
     `check-verify.mjs:257`, which is not a lapse); `stamp-malformed` / `*-mismatch` / `coverage-violation`
     / `reconcile-not-last` (a stamp that exists and is wrong is evidence to stop on, never to paper over);
     `path-containment`, `bad-*` (configuration, re-running reproduces them).
   - **`empty-source-set`** is not a lapse: it routes to the existing **S4** `blocked: no-gates`.
3. **Where in Step 5.** Sub-step 3 (`pharn-loop.md:308-323`), after the verify `orchestrator` marker and
   BEFORE `check-loop.mjs`. On exit 1 the named stage is re-invoked inside the SAME iteration `<N>`, with
   its existing `mark-phase.mjs --iteration <N>` lines, so it consumes no iteration. The freshness check
   then runs again. If the re-run itself refuses, that is **S9** (`blocked: stage-refused`), which fires at
   the stage exactly as today, before any second freshness call.
4. **`blocked:` is unconstrained by the record checkers.** `check-loop-record.mjs` and
   `loop-record-core.mjs` never read it. The contract says extra keys are ignored
   (`loop-record.md:101-102`), and the only mention is a comment at `check-loop-record.mjs:54`. The
   hygiene closure (`command-hygiene.test.mjs:1435-1438,1498-1502`) is the only enforcement, and it covers
   command prose.
5. **Check J on a legitimate run.** Nothing in the pipeline writes `<out>/<seq>-<id>.{out,err}` after the
   runner hashed it. `init` recreates `<out>` (`run-gates.mjs:448-449`), and no stage or `mark-phase`
   touches those directories. A mismatch therefore means an edit or a manual prune of `.pharn/`. One
   legitimate-looking exception is named: a gate that leaves a **detached descendant** still holding the
   log fd (the runner kills the group only on timeout) can append after the hash. The checker says so
   in its reason text instead of letting it surface as a mystery stop.
6. **Mutating gates:** see the correction above. On this repo, no gate mutates a tracked file (measured).

## Applied lessons

- L5 — the report is only as trustworthy as whatever captured it. This increment binds each report to
  the stamp it came from (D: hash equality) and re-derives the verdict live (E), rather than trusting the
  file.
- L18 — the exclusion block under `## Files` is a real `###` heading.
- L20 — the skipped-stage incident has recurred past a discipline-only remedy, and this is the floor
  check it earns.
- L22 — every new invocation in `pharn-loop.md` is a pinned fenced line, never described in prose.
- L29 — `LAPSE_CODES`, the check set A–J and the exit map are each materialized once and iterated.
- L30 — Step 5 now RUNS the freshness check it names, instead of relying on the model having run the
  stages.
- L33 — the "later increment" / "compared against nothing" / "evidence for a human" sentences expire
  here. Each is swept (the "Sweep" section) and re-stated in its present tense.
- L34 — each check's failure test has a non-vacuity control that passes the same fixture once repaired.
  The check set is counted.
- L35 — the log-file naming rule the runner writes and check J reads is extracted ONCE into
  `gate-run-core.mjs` (`logBasename`) and imported by both. There is no second copy.
- L36 — the reverse closure: every `REASON_CODES` member has an emitter or an explicit
  reserved-with-reason entry, and every emitted literal is a member.
- L39 — the fingerprint's exclusion set is the right question here ("does a change alter what the gates
  judged?"). Freshness inherits the PLAN.md divergence, and a test pins it.
- L41 — every default (the three stamp paths, `--max-reruns 1`, `--repo .`) is exercised by a test that
  passes none of those flags.
- L43 — the checker certifies agreement between artifacts and the live tree, never provenance, and a test
  builds a self-consistent fabricated set to prove it.
- L44 — each new fenced block in `pharn-loop.md` carries no shell state. The hygiene pin already covers
  the file.
- L45 — the pinned `pharn-loop.md` lines are extracted and EXECUTED against a fixture, both call sites,
  with a negative control.
- L46 — the recency residual is recorded with its status (pending, trigger named), so it cannot read as
  handled.
- L50 — the sweep is by referent. It covers every cite of `fingerprint.final`, `gate_run`, the
  "orchestration-lapse" routing and the reconcile-bullet's "orchestration (advisory)", not just one
  sentence's spelling.
- L51 — no existing guard is deleted as unreachable. `check-loop-decision.mjs` stays exactly as it is.
- L52 — each rule quantified over a set covers every member: every check A–J, both call sites, all three
  stamps, and every `LAPSE_CODES` member.

## Design (HALT 1 decided under the user's delegation — D1–D8 kept except where noted)

- **D1 kept, one addition.** `gate-run-core.mjs` also gains `logBasename(seq, id)` (L35), because check J
  must name the log files exactly as the runner does. `run-gates.mjs:644-646` becomes a call to it.
- **D2 kept.** CLI:

  ```text
  node pharn/floor/check-loop-fresh.mjs --feature <name> --base <40-hex> (--iter <N> | --commit-gate) [--front]
       [--repo <dir>] [--verify-stamp <p>] [--regress-head-stamp <p>] [--regress-base-stamp <p>] [--max-reruns <R>]
  ```

  Exits: `0` FRESH · `1` RERUN (the named stage) · `2` unusable input (fail-closed) · `4` STOP (not
  re-runnable). `--iter` is required unless `--commit-gate`. stdout is one JSON document
  `{verdict, stage_to_rerun, reason_code, reason, checks, reruns_used}`.

- **D3 kept**, with the order fixed so fabrication is judged before staleness: A → B → C → D → J → E →
  H → F → G → I, first failure decides. E compares `verdict` + `failing_gates` + `gates` (verify) and
  `verdict` + `regressions` + `pre_existing` + `outside_gates` (regress). These are the fields
  `check-loop.mjs` reads (`failing_gates` decides a reconcile red) plus the verbatim spine. A B-failure
  with a non-lapse code exits 4 carrying the report's OWN code, which is already a member.
- **D4 kept (counter, not prose).** `.pharn/pharn-loop/<name>/freshness.jsonl`, one row per authorized
  re-run, `R = 1` per `(iter, stage)`. `--commit-gate` never reads budget and never writes. The prose
  alternative is rejected: `pharn-loop.md:401-404` already shows a prose bound is "command prose, not a
  counter".
- **D5 kept.** New **S11** `blocked: stale-evidence`, distinct from S9: S9 is a stage saying it refused,
  S11 is evidence that does not match the tree. `empty-source-set` maps to S4. A new commit outcome is
  added, `not committed: evidence stale`.
- **D6 kept.** A re-run is the same stage command, same `--iteration <N>` markers. Consequences stated:
  more `stage-start` markers (the ledger's counted WARN, gates nothing), and a verify re-run repeats the
  whole suite (≤ 540 s per gate).
- **D7 kept.** `spawnSync` for the five checkers. Library imports only from `gate-run-core.mjs` and
  `worktree-fingerprint.mjs`. The slug grammar is imported (`FEATURE_SLUG_RE`), not copied.
- **D8 kept.** Sweep below.
- **Scope stays one axis.** The commit gate, the front checks and check J all answer "is the evidence
  this stop rests on evidence about THIS tree?". Splitting them would ship a checker whose commit-time
  verdict could not be asked for.
- **SKILLS_VERSION 6.9.3 → 6.10.0** (minor: a new product checker and a new command capability).
  `pharn-loop.md` `version: 0.6.0 → 0.7.0`. **`MIN_CLI` untouched** — no installed path moves, and the CLI
  copies all of `pharn/floor` minus tests.

## Files

- `pharn/floor/check-loop-fresh.mjs` — NEW: the freshness checker (checks A–J, budget ledger, commit
  gate); header carries the FLOOR/NOT-COVERED split — layer pharn/floor
- `pharn/floor/check-loop-fresh.test.mjs` — NEW: every check fails with its own code and passes once
  repaired, lapse-vs-fabrication both ways, S4 routing, the recency bound proven, the tree-move cases, the
  budget, defaults, a git-subdirectory root, and the pinned `pharn-loop.md` lines executed — layer
  pharn/floor
- `pharn/floor/gate-run-core.mjs` — the new `REASON_CODES` members, `LAPSE_CODES`,
  `RESERVED_REASON_CODES`, `logBasename`; the expired "later increment" comments re-stated — layer
  pharn/floor
- `pharn/floor/gate-run-core.test.mjs` — the reverse closure, `LAPSE_CODES ⊂ REASON_CODES`,
  `logBasename` — layer pharn/floor
- `pharn/floor/run-gates.mjs` — the log names come from `logBasename` (no behaviour change) — layer
  pharn/floor
- `pharn/floor/worktree-fingerprint.mjs` — header: freshness now has its consumer — layer pharn/floor
- `pharn/floor/check-verify.mjs` — comment only: the lapse routing now exists — layer pharn/floor
- `pharn/floor/check-regress.mjs` — comment only: the lapse routing now exists — layer pharn/floor
- `pharn/pharn-contracts/gate-run-record.md` — the vocabulary section (LAPSE subset, reserved members,
  the reverse closure) and the expired Freshness bullet — layer pharn-contracts
- `pharn/pharn-contracts/verify-report.md` — `gate_run` now has a machine consumer — layer
  pharn-contracts
- `pharn/pharn-contracts/regression-report.md` — the same, per side — layer pharn-contracts
- `.claude/commands/pharn-loop.md` — S11, the Step 5 freshness call and its exit map, the Step 6c commit
  gate, Step 6d/7 outcome, Step 7 re-run summary, the audits; `reads:` gains the checker; `version:` 0.7.0
  — product command
- `.dev/floor/command-hygiene.test.mjs` — `STUCK_POINTS` (11), `COMMIT_OUTCOMES`, the call-site and
  ordering pins with DISCRIMINATES mutants — dev apparatus
- `CLAUDE.md` — a block for the checker in the gate-runner block's style, and the gate-runner block's
  expired Freshness sentence — repo meta
- `CHANGELOG.md` — `[Unreleased]` → `### Added` entry, `6.10.0` — repo meta
- `SKILLS_VERSION` — `6.10.0` — repo meta
- `README.md` — the badge, the `/pharn-loop` paragraph (`:386-395`), and the generated floor-checker
  count — repo meta

### Written by `npm run docs:generate` (Bash, declared rather than implied — L19/L39)

- `README.md`'s `CURRENT-STATE` region (the floor-checker count moves 67 → 68).
- `docs/capabilities/README.md` — if, and only if, the generator changes it.

### Deliberately NOT in scope

- `pharn/floor/check-loop.mjs` — its input signature ("ONLY the two verdict reports + iter/cap") is
  load-bearing in the loop's own description, and a filesystem input would break it.
- `pharn/floor/check-loop-decision.mjs` — unchanged. Its bound narrows because a second checker now runs
  beside it, not because it changed.
- `.claude/commands/pharn-ship.md` — wiring ship's Step 2b "no fresh verify-report" is a named follow-up.
- `.claude/commands/pharn-verify.md`, `.claude/commands/pharn-regress.md` — nothing in them becomes false.
- `MIN_CLI`, the four trusted docs, `.claude/settings.json`, every hook script.

## Checks A–J (the contract of the new checker)

| #   | check                                                                                                             | failure → exit / reason_code                                                                                                                    |
| --- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | both reports exist and parse under `pharn/features/<name>/`                                                       | 1 re-run that stage · `report-missing` / `report-malformed`                                                                                     |
| B   | a report's `reason_code`, when present, is a member and in `LAPSE_CODES`                                          | lapse → 1 re-run · `empty-source-set` → 4 (the command maps it to S4) · any other member → 4 with that code · non-member → 4 `report-malformed` |
| C   | each stamp exists and `validateStamp` passes for its stage/side/feature                                           | missing/unfinalized/entry-not-run → 1 · malformed/mismatch → 4 with the validator's code                                                        |
| D   | `gate_run.stamp_sha256` (verify) / `gate_run.{base,head}.stamp_sha256` (regress) = sha256(raw)                    | 1 re-run · `report-stamp-unbound`                                                                                                               |
| J   | every `runs[].stdout_sha256` / `stderr_sha256` = sha256 of its log under the stamp's directory                    | 4 · `output-hash-mismatch` (first emitter)                                                                                                      |
| E   | a live re-run of `check-verify.mjs --stamp` / `check-regress.mjs verdict` reproduces the report's FLOOR fields    | 4 · `report-verdict-mismatch`                                                                                                                   |
| H   | regress base stamp `head` = `--base`                                                                              | 4 · `base-head-mismatch`                                                                                                                        |
| F   | verify stamp `fingerprint.{algo,final}` = `fingerprint(repo, {feature})` now                                      | 1 re-run verify · `tree-moved-since-verify`                                                                                                     |
| G   | regress head stamp `fingerprint.final` = verify stamp `fingerprint.init` (same algo)                              | 1 re-run regress · `regress-verify-tree-mismatch`                                                                                               |
| I   | with `--front`: `check-spec-approved`, `check-plan-spec-agree`, `check-plan-lessons` exit 0 and `GRILL.md` exists | 4 · `front-stage-red`                                                                                                                           |

A would-be exit 1 becomes **4 `rerun-budget-exhausted`** once `R` rows exist for that `(iter, stage)`, and
becomes **4 with the same code** under `--commit-gate`, which never re-runs.

## Contracts satisfied

- `gate-run-record` — consumes the stamp exactly as specified; adds three members to the closed
  vocabulary's documented subsets. Schema unchanged, `gate-run-record/1`.
- `verify-report`, `regression-report` — reads their named fields only; the additive `gate_run` block now
  has a machine consumer, and the contracts say so.
- `loop-record` — unchanged; `blocked: stale-evidence` is one more stuck-point id, and the contract already
  admits any.

## Evals to write (P1)

No Capability is added (no `role:`), so no eval is owed. The floor tests are the specification, listed
under `## Files`.

## Guarantee audit (P0)

- **FLOOR, at the decision point, given the flags the command passes:** each report is the output its
  checker produces from a stamp that validates (C + D + E, enum/regex + content-hash + a live
  re-derivation). The verify stamp describes the tree as it is now (F, content-hash). The regress head
  stamp describes the tree verify started from (G, content-hash). The regress base stamp is the loop's
  own base SHA (H, string equality). The recorded logs are the logs on disk (J, content-hash). An
  orchestration-lapse code re-runs the stage and a fabricated verdict stops the run (B/E, enum
  membership). A `STOP_GREEN` commit additionally requires freshness at commit time (the Step 6c call).
- **ADVISORY:** that the command CALLS the checker at both points, obeys its exit, and re-runs the named
  stage — command prose (L19). The hygiene pins prove the lines are present and ordered, never that a run
  executed them. The budget counter is unauthenticated state under `.pharn/`, which Bash reaches
  (`LIMITS.md §6`). It beats a prose bound. It is not tamper-proof.
- **NOT COVERED, each stated in the header, the contract and the PR:**
  - **Forgery.** Stamps, reports, logs and the ledger live in the writable tree. This certifies agreement
    between artifacts and the tree, never provenance (L43). A test builds a self-consistent fabricated
    set to prove it.
  - **Recency.** Freshness is TREE IDENTITY, not run recency. If a build changed nothing, the previous
    iteration's stamp still matches and passes. The stamp has no timestamp. A test proves the bound.
    Closing it needs referent binding (the transcript), a named follow-up. Status: pending (L46).
  - **Whether the front stages did real work.** `GRILL.md` presence is membership only.
  - **Markers are not consulted.**

## Trust audit (P2)

- Inputs are two reports and three stamps (deterministic-tool JSON), their logs (UNTRUSTED free text,
  hashed, never read), and the SPEC/PLAN/lessons paths, which are only handed to the three front checkers.
  No free-text field is read. Every operand is a string, int or hex digest. JSON is parsed and used as
  operands only, never eval'd or imported. The child processes are the five existing checkers with fixed
  argv built from shape-gated values (a validated slug, a 40-hex SHA, and paths under the invoking
  directory).
- The checker's own `reason` is its deterministic diagnostic, not untrusted text. It never quotes a log.

## Determinism audit (P5)

Every branch is enum membership, integer comparison, or hex equality. The command branches on the exit
code and on `reason_code` membership (`empty-source-set` → S4). The terminal fallback of every refusal is a
recorded blocked stop, which is the loop's delivered form of "ask the human".

## Tests (the plan the build must meet)

- Each check A–J fails with its own `reason_code` and `stage_to_rerun`, and passes once repaired. The check
  set is counted.
- Lapse versus fabrication, both directions: a lapse `reason_code` → exit 1; a `.verdict` that disagrees
  with the live re-derivation → exit 4.
- `empty-source-set` → exit 4 with that code (S4), never S11.
- The recency bound, proven: last iteration's stamps over an unchanged tree → FRESH, and the test says this
  is the header's stated bound.
- Tree moves: an edit to an included file → `tree-moved-since-verify`; an edit to an excluded artifact
  (`VERIFY.md`, `cost.json`) → still FRESH; an edit to `PLAN.md` → stale (the L39 divergence).
- Budget: R rows then exit 4; a new `--iter` resets; `--commit-gate` writes no row; `--max-reruns` moves R.
- Defaults: a run with none of the three stamp flags, no `--repo`, no `--max-reruns`.
- Root semantics: a project whose root is a subdirectory of a git repo.
- Reverse closure in `gate-run-core.test.mjs`, with a mutation control (an unemitted, unreserved member
  fails).
- Hygiene: `STUCK_POINTS` has 11 members and S11 spells `blocked: stale-evidence`; `COMMIT_OUTCOMES` gains
  `not committed: evidence stale`; the loop calls the checker before `check-loop.mjs` in Step 5 and again
  in Step 6c, each with a DISCRIMINATES mutant.
- Invocation (L45): extract the two pinned `pharn-loop.md` lines, substitute the placeholders, and execute
  them against a fixture carrying a feature directory, both reports, all three stamps and their logs. The
  negative control uses the previous iteration's stamps and a changed tree, and must exit 1.
- ≥90% line coverage on the new file (`node --test --experimental-test-coverage`).

## Sweep (L33/L50 — by referent, re-run at build)

The cites of `fingerprint.final` / "compared against nothing" / "later increment" / "evidence for a human"
/ the lapse routing:

- `pharn/floor/worktree-fingerprint.mjs:6,16-18,76`;
- `pharn/floor/gate-run-core.mjs:34,81-82,446`;
- `pharn/floor/check-verify.mjs:169`;
- `pharn/floor/check-regress.mjs:418`;
- `pharn/pharn-contracts/gate-run-record.md:118-120,133-135`;
- `pharn/pharn-contracts/verify-report.md:213,217`;
- `pharn/pharn-contracts/regression-report.md` (`gate_run` bullets);
- `CLAUDE.md:235` (the gate-runner block);
- `pharn-loop.md:618-620` (the reconcile bullet's "orchestration (advisory)") and `:638-640` (the
  fabricated-pair bound, which narrows but does not close);
- `README.md:386-395`.

The four trusted docs were grepped for `fingerprint`, `freshness`, `gate_run` and `stamp`. No sentence in
them becomes false, so no human-applied patch is needed. The PR body says so.

## Open questions (HALT)

- None. GATE 1 is delegated for this batch, and HALT 1's options are decided above with their evidence.
