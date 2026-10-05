# PLAN — build-gate-bounded: `/pharn-build` runs the project's gates through one tested helper, targeted while fixing and once in full

- spec_content_hash: d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4
- applied_lessons: [L22, L30, L34, L35, L41, L44, L45, L54, L62, L66]
- increment: replace `/pharn-build` Step 4's hand-typed project gate with `pharn/floor/build-gate.mjs` — a
  `targeted` mode (the `test` gate over this feature's test files) for the fix loop and a `full` mode (the set
  `/pharn-verify` discovers, minus the e2e gates) whose exit decides the stage's `--gate` — run through the existing
  gate runner as a new `build` stage, with a bounded summary (per gate id, exit, duration; failing tests with bounded
  failure excerpts, or a bounded log tail) and full logs left on disk.
- layer(s): `pharn/floor/` (a new helper + its pure core; `gate-run-core.mjs`, `run-gates.mjs`, `stage-runtime.mjs`,
  `test-results-formats.mjs`, `test-results-core.mjs`), `pharn/pharn-contracts/` (`gate-run-record.md`,
  `test-results-record.md`), the product `.claude/commands/` surface (`pharn-build.md` Step 4, one `pharn-ship.md`
  bullet), build apparatus (one hygiene ceiling), repo meta (`CLAUDE.md`, `CHANGELOG.md`, `SKILLS_VERSION`, README
  badge).
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]

## Why (P7) — the recorded failure

Batch item 6 (batch brief finding 4, audit candidate C4 of `.dev/measurements/pipeline-performance-audit-2026-09-29.md`).
In pharn-starter's 92-minute `/pharn-loop` run (`billing-plan-catalog`, 2026-10-05, PHARN 6.35.0), the routed
`/pharn-build` agent (`agent-acb4f6f8e3b2c6e8a`, served `claude-sonnet-5-5`) ran the project's suites by hand at
Step 4, which says only "run the deterministic gate appropriate to the target (the user's `test` / `lint`, …)". The
measurement record `.dev/measurements/loop-wall-clock-2026-10-05.md` (§4, helper `long_bash`) gives **7.8 minutes
blocked on the project's own suites** in three calls: 116.5 s on a backgrounded full `vitest run`, 96.3 s on a
backgrounded `test:db`, 256.1 s on `npm run test` then `npm run test:db` [R·m]. The build stage took 1,541.4 s
(25.7 min, record §2).

Re-derived this run from the build agent's transcript (read-only; method `.pharn/build-gate-bounded/gate-output.mjs`,
scratch, not committed), P6:

- **The gate set was chosen by judgment.** The agent ran `vitest run`, `test:db`, `lint`, `typecheck` piped through
  `grep -v "sentry\|init-options"` (filtering the pre-existing Sentry errors by hand), `i18n:check`, `knip`,
  `format:check` and `prettier --check` [R·m]. `test:db`, `i18n:check` and `knip` are not in `ALLOWLIST`, so
  `/pharn-verify` never runs them; `build` (in the allowlist, discovered) was never run.
- **Its first full run found 39 failing tests in 14 files** (`Test Files 14 failed | 715 passed (729)`, `Duration
151.82s`) [R·m]. **All 14 files are in the PLAN's declared writes** — PLAN `## Files` ∪ AC-TESTS `## Files`, 111
  entries, 75 of them test files by `stage-regress-core.mjs` `isTestFile` [R·m, computed with `scope-inputs.mjs`
  `declaredWrites`]. So a run over the feature's own test files would have found the same failures.
- **A targeted vitest run in this project is fast:** `/pharn-test`'s red run of a later feature
  (`billing-plan-products`, 22 AC files, same suite) reports `Duration 13.35s` [R·m,
  `.pharn/pharn-test/gates/0-test.out`]. Scaled, 75 of 729 files ≈ 151.8 s × 75/729 ≈ 15.6 s [R·e].
- **The polling cost requests:** ~12 gate-related Bash requests (start in background, a refused `sleep 60`, two
  `until grep` waits, a `grep FAIL | uniq -c`, the end-of-build runs) [R·m].

### Correction to the brief's evidence (recorded, P6)

The brief says the agent "read their full output into its own context, which grew from ~302k to ~660k tokens".
**Not supported.** The agent already captured to `/tmp/*.log` and read `tail -30`, `tail -8`, `grep FAIL | uniq -c`.
Every gate-related Bash result in its context totals **~18 KB** (largest 5,864 B) of **484,341 B** of Bash results
[R·m]. The context growth came from file reads (`cat` / `sed -n` of sources and tests) and the 44 `python3` write
scripts' own text. So bounding output saves little context **in this run**; it removes the risk for a run that reads a
log whole — the project's full-suite `test.out` logs on disk are 74,919 B and 163,155 B [S·m] (≈ 19k–41k tokens at
4 B/token, R·e).

## Design

### The helper: `pharn/floor/build-gate.mjs` (execution) + `pharn/floor/build-gate-core.mjs` (pure rules)

```text
node pharn/floor/build-gate.mjs --feature <name> --mode targeted|full --timeout-ms <N> [--budget-ms <B>]
```

1. **Argv** via `stage-runtime.mjs` (`scanFlags`, `parseTimeoutMs`, `parseBudgetMs`); `<name>` against
   `gate-run-core.mjs` `FEATURE_SLUG_RE`; `--mode` a closed enum. No default for `--timeout-ms` (L41).
2. **Paths** (one owner, `BUILD_GATE_PATHS` in the core): root `.pharn/pharn-build/<name>/`; the runner's `<out>`
   `.pharn/pharn-build/<name>/<mode>/`; the targeted list `.pharn/pharn-build/<name>/targets.json`; per-call wall
   times `.pharn/pharn-build/<name>/<mode>.times.json`. Every path is walked with `stage-runtime.mjs`
   `containmentWalk` (lstat, ENOENT the only absence — L54) before anything is written.
3. **Continue or start (L44, L66).** The SAME pinned line both starts and continues a run, so no state rides between
   Bash calls. It continues only when `<out>/state.json` is an unfinalized record of this feature and stage whose last
   fingerprint (`fp_after` of its last run, else `fingerprint.init`) equals the live tree's (`worktree-fingerprint.mjs`
   `fingerprint`); otherwise it starts over — `init` recreates `<out>` empty, so no earlier run's log or results file
   is ever read as this run's (L66).
4. **Start = the runner's `init`, new stage `build`:**
   `run-gates.mjs init --stage build --feature <name> --out <out> --discover package.json [--targets <targets.json>]`.
   - `full`: no `--targets`. The set is `resolveSet`'s DISCOVERED set (ALLOWLIST ∩ `package.json` scripts — the one
     discovery `/pharn-verify` uses, L35) minus `E2E_SET` (the regress rule, now `regress` or `build`), no
     `reconcile`, no `aux.completeness`, no `--gates`/`--extra`/`--skip-style`.
   - `targeted`: the core's TARGET rule writes `targets.json` first, then `--targets` keeps only the `test` gate and
     hands it those files after `--` (`spawnGate`'s existing file append — how the red run hands a level gate its AC
     files). An empty list is NEVER passed to the runner (it would mean "the whole suite", L16/L34): the helper exits
     `4` before `init`.
   - **Gate exclusion (sibling item 3, `gate-exclusion-config`):** its `run-gates.mjs init` reads
     `pharn.config.json#gates.exclude` for any `--discover` run without `--gates` and filters resolveSet's discovered
     branch. The `build` stage sits in that branch, so once that PR is under this one the exclusion applies to both
     modes with no line of this increment's code (a stacking-time test asserts it).
5. **Drain** with `stage-runtime.mjs` `drainGates` and `makeBudget` — the stage scripts' one drain and budget rule. One
   additive change: an optional `onStep` callback receives each `run --next` result with its wall-clock ms, appended to
   `<mode>.times.json`. Budget reached → exit `5`; the summary says "run the same line again".
6. **Summarize** from the finalized `stamp.json` (`validateStamp`, `expect: {stage: "build", feature}`):
   - one line per gate: id, exit, wall time of its runner call (observed; it includes the runner's two tree
     fingerprints), `timed out` / `changed the tree` when the stamp says so;
   - for a gate with per-test results configured (`test`, the e2e ids — `RESULTS_GATES`): `test-results-core.mjs`'s
     record via a new `gateResults` (the record unchanged): counts, then each failing test's id + a bounded excerpt of
     its failure message, fenced; the first 20 with excerpts, ids only up to 50, then a count. When the record is
     refused, or reports suite errors (a file that would not load — no test owns its message), a bounded tail of the
     gate's `.out` and `.err` logs;
   - for any other red gate: the bounded log tail;
   - the log paths, so the agent can open a full log on demand;
   - a hard total cap per call (16 KiB); a section past it is replaced by its log path, never silently dropped.
7. **Exit codes (closed, documented in the header):** `0` GREEN (every gate exited 0) · `3` RED · `4` NO-GATES (nothing
   to run) · `5` CONTINUE (budget) · `2` UNUSABLE (usage, containment, a runner refusal, an unreadable PLAN or stamp)
   · anything else, `1` included, a crash — never a verdict.

### The TARGET rule (pure, `build-gate-core.mjs`)

Sorted, unique union of:

- the feature's declared test files: `scope-inputs.mjs` `declaredWrites(PLAN.md, AC-TESTS.md)` (PLAN `## Files` ∪
  AC-TESTS `## Files`, the setter's grammar — L35), kept when `ac-tests-core.mjs` `badPath` accepts it (no glob, not
  absolute, no leading `-` a runner would read as a flag, normalized, not under `.pharn/` or `pharn/features/`) and
  `stage-regress-core.mjs` `isTestFile` matches;
- the files of the tests that FAILED in this feature's last `full` run, when its stamp validates and its `test`
  record is readable (so the fix loop re-runs a full-run failure without a full run);

minus every file `AC-TESTS.md`'s mapping places at level `e2e` (an e2e test runs under an e2e gate, never `test`), and
keeping only paths that `lstat` as regular files now. The helper prints how many came from each source.

### The `build` stage in the runner (shared files, kept minimal)

- `gate-run-core.mjs`: `STAGES` gains `build`; `resolveSet` takes `targets`; the e2e drop reads
  `stage === "regress" || stage === "build"`; `targets` (an array of `badPath`-clean strings) is refused off the
  `build` stage, and `build` refuses `--gates`/`--extra`/`--skip-style`. `validateStamp` is already stage-generic.
- `run-gates.mjs` init: `--stage build` requires `--discover`, refuses the flags above plus `--scope-json`,
  `--spec-from`, `--side`, `--ac-tests` and `--reuse-*` (by presence, the `ac-test` pattern), and reads `--targets`
  (a JSON array file, shape-gated, the `--scope-json` pattern — no list through argv splitting, L5). Usage text gains
  the form. Nothing else in `run --next` changes.
- Every other stamp reader asserts its own stage, so a `build` stamp is `stage-mismatch` there.

### Failure messages (shared parsing, kept out of every record)

- `test-results-formats.mjs`: each parsed entry gains `messages` — vitest/Jest `failureMessages`, Playwright's
  per-result `error.message` / `errors[].message`, `[]` for `pharn-json` (its schema has no message field) — kept only
  when they are strings, never a refusal, never a status input.
- `test-results-core.mjs`: `testIdOf(entry)` (the id rule, now named once and used by `buildRecord`) and
  `gateResults({stamp, outDir, gateId, root})` (the stamp/config/hash/parse half of `testRecord`); `testRecord` becomes
  `gateResults` + `buildRecord`, its output byte-identical. `buildRecord` copies `id/file/title/status` only, so **no
  record — red run, AC gate, `verify-report.json` — ever carries a message.**

### The command (`pharn-build.md` Step 4)

Step 4 pins the two lines (with `--timeout-ms 540000 --budget-ms 570000`, the stage scripts' values), keeps
`validate.mjs <target>` for PHARN-shaped capabilities, and maps exits: targeted `0`/`4` → the full line, `3` → fix and
repeat; full `0` → Step 5, `3` → fix within scope (the targeted line now includes the full run's failing files) and
repeat — a red you cannot fix within `## Files` (outside them, or red before your change) → HALT, `5` → the same line
again, `4` → ask the human (S4 under `/pharn-loop`), `2`/crash → HALT. "Never run the project's gates another way" is
said once. The claims block's Step-4 Floor line names the helper. Expected growth ≈ 800 B against 818 B of headroom;
if it exceeds, the ceiling is raised in `COMMAND_BYTE_CEILINGS` by the documented rule, as a visible diff.

`pharn-ship.md`'s inline-build bullet says the build gate is discovered "explicit `--gates`, else the closed allowlist
… else ask the human"; `/pharn-build` never took `--gates`. It now cites `pharn/floor/build-gate.mjs --mode full`
instead of the `--gates` clause (one bullet, P4).

The routed build brief (`stage-agent-core.mjs` rule 6) says "`--gate` is the exit of the project gate the stage ran at
its Step 4" — still true (Step 4 names the full line as that gate), so the brief is NOT changed.

### Decisions

- **D1 — a runner stage, not a second runner.** The helper could spawn gates itself with `run-gates.mjs` `spawnGate`,
  but then the budget, resume, logs and per-test binding would be second copies (L35), and the sibling exclusion
  would not reach it. A `build` stage reuses `init`, `run --next`, `drainGates`, `validateStamp` and `testRecord`'s
  binding unchanged.
- **D2 — the full run is verify's discovered set minus the e2e gates.** `build` stays in: a `--gate pass` then
  predicts verify's non-e2e gates, and `pharn-ship.md` already describes the build gate as the allowlist minus e2e.
  E2E stays at `/pharn-verify`: it is the slowest set, needs servers or browsers, and could not run on the user's
  machine in 2 of 3 runs (measurement record §9). `reconcile` and the AC gate stay at verify. **GATE-1 question Q2**
  offers dropping `build` too.
- **D3 — targeted runs only `test`.** Lint, typecheck and build have no file-addressable form `ALLOWLIST` can rely on;
  they run in the full mode.
- **D4 — no new contract (P7).** The helper's output is read by the model only; its header is its spec, as for
  `render-run-report.mjs`. The `build` stage is documented in `gate-run-record.md`, whose stage list it extends.
- **D5 — no `--gates` for the build gate.** `/pharn-verify`'s `--gates` is a per-invocation human argument the build
  stage never receives; the gate-exclusion config is the configured way to shape discovery.

## Applied lessons

- L22 — Step 4 pins the two literal lines instead of describing "run the user's test / lint"; the agent has no
  technique left to choose (no backgrounding, no `tail`, no `grep -v`).
- L30 — Step 4 no longer runs some gates and asks for the rest: every gate it names, the helper invokes, from one
  materialized set (`resolveSet`).
- L34 — an empty target list never reaches the runner (it would run everything); a set with nothing to run exits `4`
  (NO-GATES), never GREEN; tests assert both, plus non-empty fixture sets.
- L35 — one discovery (`resolveSet`), one runner (`run-gates.mjs`), one drain (`drainGates`), one declared-writes
  reader (`declaredWrites`), one test-file rule (`isTestFile`), one path rule (`badPath`), one id rule (`testIdOf`,
  extracted rather than copied).
- L41 — `--timeout-ms` has no default in the helper; the pinned line passes it and a test runs the no-budget path.
- L44 — the same pinned line starts and continues, so nothing is carried between Bash blocks; the continue decision
  is computed from files and the live tree.
- L45 — `build-gate.test.mjs` reads the committed lines from `pharn-build.md` and EXECUTES them in a fixture repo, with
  a control that a changed flag set fails.
- L54 — every helper path goes through `containmentWalk` (lstat; a dangling link refused), with a dangling-link test.
- L62 — every untrusted value quoted on one line goes through `quote-core.mjs` `shown`; excerpts and log tails go
  through `quoteData`; a `{"toString":1}` message in a results file is a test case.
- L66 — `init` recreates `<out>` empty and the helper reads results only after the runner process has exited; a
  continue requires the live fingerprint to equal the run's last one, so another session's leftover run is restarted,
  not read.

## Files

- `pharn/floor/build-gate.mjs` — the helper's CLI: argv, containment, continue-or-start, `init`, drain, summary, exit
  codes — layer floor (product)
- `pharn/floor/build-gate-core.mjs` — pure rules: paths, the TARGET rule, excerpt and tail bounding, the summary
  renderer, the exit-code table — layer floor (product)
- `pharn/floor/build-gate.test.mjs` — CLI tests in fixture repos, incl. ★ WIRING over `pharn-build.md`'s pinned lines —
  test
- `pharn/floor/build-gate-core.test.mjs` — rule tests — test
- `pharn/floor/gate-run-core.mjs` — `STAGES` + `build`; `resolveSet` `targets` and the build rules — layer floor
- `pharn/floor/gate-run-core.test.mjs` — the build stage's resolution and refusals — test
- `pharn/floor/run-gates.mjs` — `init --stage build [--targets <file>]` — layer floor
- `pharn/floor/run-gates.test.mjs` — init/run for the build stage — test
- `pharn/floor/stage-runtime.mjs` — `drainGates`'s optional `onStep` — layer floor
- `pharn/floor/stage-runtime.test.mjs` — `onStep` called once per gate with a duration — test
- `pharn/floor/test-results-formats.mjs` — parsed entries carry `messages` — layer floor
- `pharn/floor/test-results-core.mjs` — `testIdOf`, `gateResults`; `testRecord` unchanged in output — layer floor
- `pharn/floor/test-results-core.test.mjs` — messages per format; record byte-identity — test
- `pharn/pharn-contracts/gate-run-record.md` — the `build` stage — layer pharn-contracts
- `pharn/pharn-contracts/test-results-record.md` — parsed entries carry messages; no record does — layer
  pharn-contracts
- `.claude/commands/pharn-build.md` — Step 4 pinned lines and exit mapping; the claims line — product command
- `.claude/commands/pharn-ship.md` — the inline-build bullet cites the helper — product command
- `.dev/floor/command-hygiene.test.mjs` — `COMMAND_BYTE_CEILINGS` raise for `pharn-build.md`, only if measured over —
  apparatus
- `CLAUDE.md` — a Commands entry for the helper — repo meta
- `CHANGELOG.md` — the 6.36.0 section (provisional number) — repo meta
- `SKILLS_VERSION` — 6.36.0 (provisional) — repo meta
- `README.md` — the version badge — repo meta
- `.dev/features/build-gate-bounded/PLAN.md` — this plan — apparatus
- `.dev/features/build-gate-bounded/GRILL.md` — the grill log — apparatus
- `.dev/features/build-gate-bounded/REGRESSION.md` — regress report (human) — apparatus
- `.dev/features/build-gate-bounded/regression-report.json` — regress report — apparatus
- `.dev/features/build-gate-bounded/VERIFY.md` — verify report (human) — apparatus
- `.dev/features/build-gate-bounded/verify-report.json` — verify report — apparatus
- `.dev/features/build-gate-bounded/REVIEW.md` — the review record — apparatus
- `.dev/features/build-gate-bounded/SHIP.md` — the ship record — apparatus

## Contracts satisfied

- `pharn/pharn-contracts/gate-run-record.md` — a `build` stamp is a `gate-run-record/1` stamp; the stage enum and the
  build stage's set rules are added there (cited by the code, not restated).
- `pharn/pharn-contracts/test-results-record.md` — the record is unchanged; the contract gains one sentence that
  parsed entries carry the reporter's messages for `/pharn-build`'s summary and no record does.
- `pharn/pharn-contracts/stage-exit.md` — NOT adopted: the helper is not a stage and prints text for a model; its exit
  set avoids `1` for the same reason that protocol does (a crash is never a verdict).

## Evals / tests to write (P1 — no capability is added, so no eval; the helper ships with tests)

- core: TARGET rule (declared ∩ test files ∩ badPath-clean ∩ existing; minus mapped e2e; plus last-full failures;
  empty → NO-GATES); excerpt bounding (lines, bytes, ANSI stripped, node_modules/node:internal stack frames dropped,
  the message's first line always kept); summary caps (20 excerpts, 50 ids, 16 KiB total, overflow names the log);
  fencing survives a back-tick run and a `{"toString":1}` value.
- CLI (fixture git repos with `package.json` scripts that write a vitest-shaped report to `$PHARN_TEST_RESULTS`):
  full = discovered minus e2e, in ALLOWLIST order, no reconcile; targeted hands `test` exactly the target files after
  `--`; exits 0/3/4/5/2; continue after `5` reuses the run, a tree edit between calls restarts it; a symlinked or
  dangling `.pharn/pharn-build` is `2`; a crash is not `0`/`3`; ★ WIRING: the committed `pharn-build.md` lines run
  verbatim (with `<name>` substituted) and reach GREEN and RED in the fixture; CONTROL: a line with a flag removed
  exits `2`.
- gate-run-core / run-gates: the build stage resolves and refuses as specified; a build stamp validates and is
  `stage-mismatch` for `expect.stage: "verify"`.
- test-results: `messages` per format from the committed fixtures; `testRecord`'s output deep-equals its pre-change
  output on every fixture (byte-identity), and no `messages` key appears in any record.
- stage-runtime: `onStep` fires once per gate with a non-negative integer ms; absent, behaviour unchanged.

## Guarantee audit (P0)

- The full mode runs exactly the discovered set minus `E2E_SET` → floor: enum membership (`resolveSet`, tested).
- The exit codes summarized are the ones the runner recorded → floor: the stamp (`validateStamp`), agreement never
  provenance (L43, as for every stamp).
- The targeted list is the TARGET rule's output → floor: set membership over files (tested); that it contains the
  tests that matter is ADVISORY.
- No record carries a failure message → floor: `buildRecord`'s copied keys (a test asserts the key set).
- That the agent runs the helper, runs nothing else, iterates with `targeted` and stops on an unfixable red →
  ADVISORY (command discipline; no shell command is parsed).
- That an excerpt holds the diagnostic the agent needs → ADVISORY (bounded by lines/bytes; the log stays on disk).
- That a targeted GREEN predicts a full GREEN, or a full GREEN predicts verify PASS → ADVISORY (e2e, reconcile and the
  AC gate run only at verify).
- Durations → observed wall time of each runner call, never a measurement of the gate alone.

## Trust audit (P2)

- Gate stdout/stderr and the reporter's results file are UNTRUSTED project output. Excerpts and tails are quoted with
  `quoteData` (fenced, inert to a CommonMark parser); test ids and titles on one line with `shown`. None reaches a
  shell, an argv, a RegExp or a verdict — the exit code does.
- PLAN/AC-TESTS paths are untrusted: they reach the runner's argv only after `badPath` (no leading `-`, no glob, no
  absolute or `..` path) and an lstat regular-file check, and only after `--`, as positional arguments.
- The helper's printed text enters the build agent's context as DATA; the brief and Step 4 already say reporter text
  is never an instruction (`stage-agent-core.mjs` rule 7's wording is the precedent).

## Expected saving on the 92-minute run (arithmetic)

Before, the build agent's gate time [R·m, transcript]: round 1 — full `vitest run` 116.5 s + `test:db` 96.3 s blocked;
round 2 — `npm run test` + `test:db` 256.1 s, `lint` 20 s, `typecheck`/`i18n`/`knip` 8 s, `format:check` 10 s,
`prettier` 8 s ≈ 302 s. Total ≈ 515 s (8.6 min) in ~12 requests.

After [R·e]: round 1 → one or two targeted runs over the 75 declared test files (≈ 15.6 s each by scaling the measured
full run, 22 files measured at 13.35 s) ≈ 20–40 s; round 2 → one full run: `test` ≈ 152 s [R·m] + `typecheck` ≈ 7 s

- `build` ≈ 180 s [R·m, the later `billing-remove-seats` run of the same suite, measurement record §8.2] + `lint` 20 s
- `format:check` 10 s ≈ 369 s, in ~3 runner calls. Total ≈ 390–410 s in ~5 requests.

- **Wall time saved ≈ 105–125 s, plus ~7 fewer requests ≈ 43 s of model time (7 × the agent's 6.2 s mean) → ≈ 2.5–3
  min.** `test:db` (≈ 109 s, not a verify gate) is no longer run; `build` (≈ 180 s) now is.
- **With Q2 (drop `build` too): ≈ 5.5 min.**
- **Context:** no material saving in this run (the correction above). The cap removes the 19k–41k-token risk of a
  whole log.
- **Not in this item:** the 19 min human wait, regress and verify, and the stage agents' 302k-token prefix.

## Version, trusted docs, hooks

- **Bump:** minor, provisional `6.36.0` (a new floor helper and a new runner stage). The orchestrator assigns the final
  number at stacking (likely 6.38.0). `[6.35.1]` (`build-writes-through-tools`, below this branch) is kept byte-for-byte.
- **Trusted docs:** none made stale — no trusted sentence describes `/pharn-build`'s project gate (searched
  `ARCHITECTURE.md` §6, `LIMITS.md`, `THREAT-MODEL.md`). No `PROTECTED-FOLLOWUPS.md`.
- **Hooks / settings / `MIN_CLI`:** none.

## Open questions (HALT)

- Q1 — `gate-exclusion-config` (de8bc3a) sits below this PR in the planned stack. May I merge
  `origin/feat/gate-exclusion-config` now, so the build stage is written against its `resolveSet` once and a test
  proves the exclusion reaches both modes? Default if no: write against today's `resolveSet`, resolve at stacking.
- Q2 — keep `build` in the full run (D2, ≈ 2.5–3 min saved here) or leave it to verify like e2e (≈ 5.5 min saved; a
  build-only break then costs a loop iteration)? Default: keep.
- Q3 — in a project with gates red at base (3 of 3 runs here: `typecheck`, `build`), the full run reads RED, so a
  routed build under `/pharn-ship` reports `done gate:fail` and ship STOPs after the build instead of at verify; the
  loop is unaffected. Accept (default), knowing `loop-entry-preflight` (item 1) detects base reds at entry?
