# PLAN — loop-driver-spike

- spec_content_hash: f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d
- applied_lessons: [L4, L6, L36, L43, L44, L66]
- increment: The CORE-113 spike — a node driver (dev apparatus, never shipped) that sequences ONE `/pharn-loop --quick`
  over a benchmark feature by running the loop's own pinned floor lines itself and starting one headless `claude -p`
  session per model stage, a kit the maintainer runs from a terminal (the driven run plus the same feature through
  `/pharn-loop --quick`), and a record that states the five spike gates, the cost and minutes of both runs, what the
  cost ledger cannot attribute across several sessions, and a go or no-go beside the orchestrator's measured share
  after Epics 1 and 2.
- layer(s): dev apparatus only — `.dev/features/loop-driver-spike/**` and one `[Unreleased]` CHANGELOG entry. No
  product-surface byte, no `SKILLS_VERSION` bump.
- constitution_refs: [P0, P2, P5, P6, P7]

## Why (P7 — the measured trigger, and the start condition)

- **The trigger.** `.dev/measurements/loop-baseline-2026-11-11.md` §3 and §12: in the 24 runs started inside an agent
  the orchestrator was 21.5% of requests and **27.7% pooled / 30.2% per-run median** of weighted cost, at a median of
  231k tokens per request; §12 rates CORE-113 **needs-evidence**, its condition being that share after CORE-105 and
  the gate tasks land. The September spike left the driver route unmeasured: the auto-mode classifier refused the
  nested headless session (`.dev/features/stage-model-routing/route-a-evidence.txt`, "Route B … NOT MEASURABLE").
- **The start condition, read live this run.** Epic 1 (CORE-13, entry: CORE-75/86/87/103/105, main 7.11.0–7.16.0) and
  Epic 2 (CORE-15, context: CORE-76/107/109, 7.15.0–7.19.0) are both **Done** in Linear. No measured loop run exists
  on any version after them: the measured project `~/Projects/pharn-app` is installed at **7.10.3**
  (`pharn.config.json` `skillsVersion`), its newest ledgers (`public-repos-free*`, `pricing-starter-*-3`) are
  **7.7.1**, and `pharn/.run/cost/` holds only 7.x-or-older runs (read only; nothing there was written or cleared).
  **So no post-Epic-1/2 orchestrator share exists**, and the spike's comparison run — the same feature through
  `/pharn-loop --quick` on 7.19.0 — **is** that measurement (the orchestrator's GATE-1 decision). The go or no-go is
  written only from the measured share; if the comparison run does not produce a usable ledger, the share is recorded
  as not measurable and the record says no-go is not decidable either (P6), never a guess.

## Discovery (read live this run; main `155d1205`, `SKILLS_VERSION` 7.19.0, `MIN_CLI` 0.14.0)

- **What `/pharn-loop --quick` runs**, in order (`.claude/commands/pharn-loop.md` Steps 1a–5, `pharn-loop-quick.md`
  items 1–9, `pharn-loop-close.md` Steps 6a–6d and the Final step): slug check (`feature-name.mjs --fresh` over a
  candidate the model wrote), base capture, dirty-tree snapshot, `require-loop-record.cjs --open … --mode quick`,
  `check-run-isolation.mjs`, `pre-run-snapshot.mjs --capture`, `mark-phase.mjs --kind run-start`,
  `check-entry-context.mjs`, `check-instruction-files.mjs --report`, `entry-gates.mjs --start`; spec (routed, `--mode
quick`) → `check-spec-approved.mjs` → `check-spec.mjs --spec-kind` (token `quick`) → entry peek; plan (routed) →
  peek; grill (`start` prints `inline:floor-only`, then `/pharn-grill <name> --quick` inline, then the inline return
  line); `entry-gates.mjs --wait`; test (routed) → `check-test-stage.mjs --require-test-first` (→ preflight on red);
  per iteration: build (routed, `--mode quick`) → `check-quick-scope.mjs` → `stage-direct.mjs --stage pharn-verify`
  (resume on 5) → `check-loop-fresh.mjs --front` → `check-loop.mjs`; at the stop `entry-gates.mjs --abort`, the SPEC
  revert unless green, `LOOP.md`, `loop-closeout.mjs`, `set-writes-scope.cjs --clear`,
  `require-loop-record.cjs --close`. Every one of those lines is already a script; what stays the model's is the
  slug, sequencing, the Agent calls, the SPEC revert edit, the `LOOP.md` text and the summary — the ticket's list,
  confirmed.
- **Routed stage protocol** (`pharn/floor/stage-agent-core.mjs` header; `.dev/guides/floor-orchestration.md`
  `stage-agent.mjs`): `start` exit 0 prints `agent:<alias>` and writes the stage-start marker, exit 3 `inline:<reason>`;
  the agent's prompt is one pinned brief line (the spec's carries the description in a DATA fence); the agent's last
  action writes `pharn/.run/pharn-loop/<name>/stage-result.json`; `finish --budget-ms` waits on disk, prints one
  closed line and exits 0 done / 3 refused / 4 question / 2 unusable / 5 waiting / 6 capped. A node driver can run
  every one of those lines unchanged (the stage-exit contract was written for that caller:
  `.dev/features/stage-regress-script/PLAN.md:207`).
- **The session flags a driver needs exist** in Claude Code 2.1.323 (`claude --help`, read this run): `--model`,
  `--effort <low|medium|high|xhigh|max>`, `--agent <agent>` (run the session as an agent definition — so a driven
  stage can run as the same `pharn-stage` type the loop routes to), `--session-id <uuid>`, `--permission-mode auto`,
  `--output-format stream-json --verbose`, `--resume <id>`.
- **What a driver breaks, found while reading** (recorded for the decision, never edited here):
  - the Stop guard (`.claude/hooks/require-loop-record.cjs` header, "INERT when … the marker's session … is null"):
    a marker opened by a process with no `CLAUDE_CODE_SESSION_ID` holds no session's turn, so the guard is inert for
    every driven session — the driver's own control flow is the only thing that reaches the record step;
  - the cost ledger (`pharn/pharn-contracts/cost-ledger.md` "The selected session only";
    `pharn/floor/render-cost-ledger.mjs:779` "no session id available"): markers written with no session id, and N
    stage sessions, give the closeout's ledger nothing to bind — expected `coverage: unavailable`;
  - `check-entry-context.mjs` measures the context running the command; a driver has none.
- **The benchmark** (`loop-baseline-2026-11-11.md` §11): `lg3-remove-files` is the only benchmark feature that ran as
  a **quick** loop (its `LOOP.md`: `mode: quick`, 3 criteria, base `7e48564d71c510b223a2d56459e938c3d45f66d9`), and it
  stopped S14b because `test` was killed at the then-fixed 540 s gate timeout. Since 7.16.0 a project may declare
  `gates.timeoutMs` up to 1,800,000 ms (CHANGELOG 7.16.0). The project's `test` took about 9 minutes on 2026-11-08
  (`pharn-app/pharn/.run/pharn-entry/gates/` file times, read only).
- **The classifier constraint holds** for this session: launching `claude -p` from an agent's Bash is refused ("Create
  Unsafe Agents", memory + route-a-evidence). So nothing here launches a model session; the maintainer runs the kit
  from a terminal, and the record is written from the outputs the runs leave (L4).
- Lessons index freshness gate: `check-lessons-index.mjs` exit 0 (GREEN), so the two-step sweep ran over the index and
  the full canon entries of the selected candidates.

## Applied lessons

- L4 — every figure in the record comes from the live runs' own outputs; the unit tests and the LOOP.md fixture are
  plumbing checks, stated as such, never evidence that a driven loop works.
- L6 — the driver branches only on exit codes; where the loop reads a closed token a floor script printed (a `finish`
  row, the spec kind, `stage_to_rerun`, `reason_code`, `terminal_cause`) the token is turned into an exit code by
  `token-exit.mjs` over a frozen table, and no model output is ever read for a decision.
- L36 — the branch tables are closed: a closure test collects every exit code and every action across all tables and
  requires each to be a member of the declared sets, so a variant action spelling fails, not only a missing one.
- L43 — the record keeps the driver's own per-session figures (from each session's stream) apart from the ledger's
  `cost.json` and never presents their agreement as proof; the comparison run's share comes from its ledger, its
  bound (`coverage: partial`) stated.
- L44 — the driver is one node process holding its values (`<name>`, `<base sha>`, `<N>`) in memory and passing them
  as literal argv; the kit scripts take literal absolute paths, carry no state between invocations, and use no
  shell variable a previous block set.
- L66 — every run writes into its own output directory, which the driver creates and refuses if it already exists;
  a session's result is read only after its `claude -p` process has exited, never on a file's appearance.

## Scope

### The driver (`.dev/features/loop-driver-spike/driver/`)

1. **`driver-core.mjs` (pure).** The program as data: a frozen table `STEPS`, each step `{argv(ctx), on: {<exit>:
<action>}, otherwise: <stop action>}`; the closed action vocabulary (`next`, `again` — bounded, `stop <row>`,
   `rerun-verify`, `iterate`, `stop-decision`); the interpreter `interpret(program, ctx, runner)`, the ONLY function
   with conditionals; the `LOOP.md` renderer; the SPEC-revert text edit; argument validation.
2. **`loop-driver.mjs` (CLI).** `node loop-driver.mjs --project <tree> --out <dir> --slug <slug> --intent <file>
[--cap 3] [--accept-host-execution] [--answer <word>] [--claude <bin>]`. Spawns each floor line with `cwd` =
   project, writes every step's argv, exit code, stdout, stderr and wall time to `<out>/steps.jsonl`; spawns each
   model session as `claude -p [--agent pharn-stage] --model <alias> --effort <effort> --permission-mode auto
--session-id <uuid> --output-format stream-json --verbose <prompt>` with its stream to
   `<out>/sessions/<seq>-<stage>.jsonl`. `--agent pharn-stage` is passed only when `test -f
.claude/agents/pharn-stage.md` exits 0 in the project. The alias comes from `stage-agent.mjs start`'s printed
   token, the effort from `check-model-config.mjs resolve <stage>` (a value; on a non-zero exit no `--effort` is
   passed). An inline stage (the quick grill) runs on the config's `loop` alias.
3. **The sequence** is the quick loop above, line for line, with `--mode quick` where the quick part pins it; the
   driver writes the slug candidate itself (from `--slug`, typed by the operator) and the `LOOP.md` from captured
   values. The `## Handoff` is fixed templated text from closed facts — the synthesis a model writes today is
   recorded as lost, not imitated.
4. **Two probes inside the driven run**, after the test stage's verdict and before build iteration 1 (the run marker
   open, so the write guard is in its in-run posture):
   - **deny probe (AC4, G2):** one session (same flags as a stage) asked to Write `loop-driver-probe.txt` at the
     project root. Branch: `test -e loop-driver-probe.txt` exit 1 → go on; exit 0 → stop (`probe-write-landed`,
     recorded as S9 with the cause in `next_steps`). Evidence: the hook's deny text (`PHARN floor — write blocked`)
     in that session's stream.
   - **question probe (G4):** one session asked to put one question and end; the driver resumes the same session id
     (`claude -p --resume <id>`) with the operator's `--answer` word and asks it to write the word to
     `pharn/.run/loop-driver/<name>/answer.txt`; `cmp` exit 0 → G4 transport passed. Bound: the answer is typed
     before the question is seen, so it measures the round-trip transport (resume with context kept), never a person
     reading the question. Without `--answer` the probe is skipped and G4 is "not measured".
   - Probe sessions are counted apart and left out of the comparison.
5. **`token-exit.mjs`.** `node token-exit.mjs <table> <file> [--field <key>]` reads the first line (or one JSON
   field) and exits with the member's index code from a frozen table, 9 for a non-member or unreadable input.
6. **`measure.mjs`.** Reads `<driver-out>` (steps, sessions, streams) and the comparison run's out dir plus its
   `cost.json`, prints one JSON document: per stage and in total, deduped requests, token classes, weighted units
   (the baseline's formula, §2), minutes, served models, the CLI-reported USD (labelled the CLI's figure), deny text
   found, permission denials; and for the comparison the orchestrator's share of weighted cost (rows whose context
   equals `membership.context`).
7. **`loop-driver.test.mjs`** (runs under `npm test`'s `.dev/**/*.test.mjs` glob): AC2's closure over the tables and
   actions; a static scan that no conditional token appears in the driver files outside the interpreter region;
   scripted-runner walks of `interpret()` (a green path, STOP_CAP, a spec refusal, an unknown exit, a quick RERUN
   naming regress, a landed probe); token-exit tables; the `LOOP.md` renderer's output for a green, a cap and a
   blocked stop passed through the real `pharn/floor/check-loop-record.mjs` (exit 0); measure's weighting and dedupe
   on a small fixture stream.

### The kit (`.dev/features/loop-driver-spike/kit/`)

- `setup.sh <kit-root> <pharn-app>` — `git clone --no-hardlinks` of the project into `<kit-root>/base-repo` (the
  project itself is only read), detached at the benchmark base; `npx --yes @pharn-dev/pharn@latest update --yes`
  (7.19.0); copy `pharn-stage.md` from this repo's 7.19.0 into `.claude/agents/` (see Open question 4); set
  `gates.timeoutMs: 1800000`; commit as one local "measure base" commit; `npm ci`; then one timed run of the project's
  gates on that base, printed, so a red or slow base is seen before any model run.
- `run-driver.sh <kit-root> <run-id> <answer>` — clones `base-repo` into `<kit-root>/runs/<run-id>/tree`, `npm ci`,
  runs the driver with `--out <kit-root>/runs/<run-id>/out`; refuses an existing run dir.
- `run-loop.sh <kit-root> <run-id>` — the same clone, then
  `claude -p --permission-mode auto --session-id <uuid> --output-format stream-json --verbose "/pharn-loop --quick
--accept-host-execution <intent>"` with the stream and the session id written to the run's `out/`.
- `intent.md` — the increment description, taken from `lg3-remove-files/SPEC.md`'s `## Intent` and `## Scope` (DATA,
  read only), so both runs get the same text.
- `README.md` — the exact commands, the expected duration (each run likely 60–120 min: about 9 min per `test`
  execution, several executions), where outputs land, and what to send back.

### The record (`.dev/features/loop-driver-spike/RECORD.md`)

Written after the maintainer's runs, from their outputs only: the five gates (each passed / failed / not measurable
with its evidence); AC2's evidence (the closure test); AC3 (the driven `LOOP.md`'s `check-loop-record.mjs` result, as
the closeout printed it); AC4 (the deny probe); cost and minutes per stage for both runs under the §11 comparison rule
(per stage, only stages both reached); what the ledger cannot attribute across several sessions; the contradictions a
real driver would cause (the ticket's list plus the Stop-guard and entry-context findings above), listed for a human,
never edited; and **go or no-go** with the comparison run's measured orchestrator share beside it.

## Files

- `.dev/features/loop-driver-spike/driver/driver-core.mjs` — the program tables, the interpreter, the LOOP.md renderer — dev apparatus
- `.dev/features/loop-driver-spike/driver/loop-driver.mjs` — the CLI: spawns floor lines and `claude -p` sessions — dev apparatus
- `.dev/features/loop-driver-spike/driver/token-exit.mjs` — a closed printed token to an exit code — dev apparatus
- `.dev/features/loop-driver-spike/driver/measure.mjs` — per-stage figures of both runs from their outputs — dev apparatus
- `.dev/features/loop-driver-spike/driver/loop-driver.test.mjs` — AC2 closure, interpreter walks, LOOP.md shape, measure — dev apparatus
- `.dev/features/loop-driver-spike/kit/README.md` — the commands the maintainer runs — dev apparatus
- `.dev/features/loop-driver-spike/kit/setup.sh` — the measure base in a scratch clone — dev apparatus
- `.dev/features/loop-driver-spike/kit/preflight.sh` — one timed run of the project gates on the measure base, before any model run — dev apparatus
- `.dev/features/loop-driver-spike/kit/run-driver.sh` — one driven run in its own directory — dev apparatus
- `.dev/features/loop-driver-spike/kit/run-loop.sh` — one `/pharn-loop --quick` run in its own directory — dev apparatus
- `.dev/features/loop-driver-spike/kit/intent.md` — the shared increment description — dev apparatus
- `.dev/features/loop-driver-spike/RECORD.md` — the spike record, written from the measured outputs — dev apparatus
- `CHANGELOG.md` — one `[Unreleased]` entry — repo meta

### Not in this increment

- No product path (`pharn/**`, `.claude/commands/pharn-*.md`, `.claude/hooks/**`, `.claude/agents/**`, settings) and
  no trusted doc; the contradictions are listed in the record for a human.
- No write anywhere in `~/Projects/pharn-app` (its `pharn/.run/` holds measured evidence); the kit clones it.
- No driver ships; nothing outside `.dev/` changes but the CHANGELOG.

## Contracts satisfied

- `pharn/pharn-contracts/loop-record.md` — the driven `LOOP.md` is rendered to its canonical template and checked by
  `check-loop-record.mjs` (cited, not restated).
- `pharn/pharn-contracts/stage-exit.md` — the driver consumes `stage-direct.mjs`'s exit numbers exactly as Step 2's
  verify mapping does.
- `pharn/pharn-contracts/cost-ledger.md` — read for its bounds; the record states what its run-window membership
  cannot see in a multi-session run.

## Evals to write (P1)

No Capability is added (no `role:` frontmatter), so P1's eval obligation does not arise. The test file above is the
apparatus's own check.

## Guarantee audit (P0)

- "Every branch the driver takes on a child's outcome is an exit-code membership test" → **floor: enum-regex** by
  test — the closure test over the tables plus the static scan that conditionals sit only in the interpreter region.
  Bound: a static scan of two files; it does not see a branch smuggled through a data value the interpreter
  dispatches on, which is why the actions are a closed vocabulary the closure test pins.
- "The driven `LOOP.md` passes `check-loop-record.mjs`" → **floor: enum-regex** (the product checker), on the real
  run's record as the closeout printed it; the renderer fixtures are plumbing only (L4).
- "The hooks deny an out-of-scope write inside a driven stage" → **floor: hook**, evidenced by the deny text in the
  probe session's stream and the `test -e` exit; whether the model attempted the write is read from its stream
  (advisory evidence).
- "The served model matches the config" → **advisory evidence** from the streams' `message.model` (family substring
  against the alias), not a floor check; served effort is recorded as not observable unless a stream carries it.
- "No permission is bypassed" → **advisory evidence**: no `--dangerously-skip-permissions`, `bypassPermissions` or
  `--allowedTools` in any argv the driver logs (its own log, so agreement, L43), plus the streams'
  `permission_denials`.
- Every cost, minute and share figure → **measured** from the runs' outputs, labelled with its source; anything not
  measured is labelled not measurable (P6). The go or no-go is **advisory**: a recommendation for the maintainer.
- The kit's isolation from `pharn-app` → **advisory**: the scripts clone and never write the source checkout.

## Trust audit (P2)

- The intent text, every SPEC/PLAN/GRILL/BUILD/VERIFY free text, every model session's output and the comparison
  run's summary are `trust: untrusted` DATA. The driver never reads model prose; it reads exit codes and the closed
  tokens floor scripts print, through `token-exit.mjs`. The question probe's question text is logged as DATA and never
  parsed. The record quotes any instruction-looking text as DATA.
- The measured project's files are read only; its `pharn/.run/` is never cleared or written.

## Determinism audit (P5)

- Every driver branch on a child's outcome is a lookup of its exit code in a frozen table with a stop as the
  `otherwise`; the closed-token reads become exit codes first. The only other branches are the interpreter's own
  repeat bound on `again` (a counter it owns) and argument validation, both inside the interpreter region.
- The terminal fallback of every table is a stop with a recorded row, never a guess; the go or no-go is the
  maintainer's to accept.

## Decisions at GATE 1 (resolved — these were the open questions)

Decided 2026-11-16 by the orchestrating agent under the user's delegation — an agent decision, not a human approval:

1. Benchmark: `lg3-remove-files`, with `gates.timeoutMs: 1800000` in the measure base.
2. Base: a scratch no-hardlinks clone of `pharn-app` at `7e48564d` plus one local measure-base commit
   (`npx --yes @pharn-dev/pharn@latest update --yes` to 7.19.0, `gates.timeoutMs`, `pharn-stage.md`), under a stable
   scratch directory outside both repositories (`/private/tmp/claude-501/core-113/`). The base clone's `origin` remote
   is removed so no run can push. No `pharn-app` worktree.
3. Probes: both inside the driven run between test and build 1, excluded from the comparison; the record states the
   bound "the answer is typed in advance, so it measures the resume transport only".
4. `pharn-stage.md` is copied into the measure base so the comparison reflects Epic 2 as shipped; the record states that
   a real install today lacks it (pharn-cli `cli-install-agents`).
5. `--permission-mode auto` everywhere; no skip flags, no `--allowedTools`.
6. Cap 3 for both runs.
7. Grill concerns 1–6 are handled in the build as GRILL.md proposes: a driver crash still writes a blocked record and
   closes the marker; `finish` runs without `--budget-ms`; the driver's own unhooked writes go in the record's
   contradiction list; `--accept-host-execution` comes only from the driver's argv; the record names the baseline
   group the share is set beside; the conditional scan strips comments, strings and regex literals first.
8. The runs go sequentially — the driven run first, then the comparison — never in parallel; the README says so.
9. The timed gates run on the measure base is its own step (`kit/preflight.sh`, added to `## Files`), run first and
   printing its exit and minutes, so the maintainer can stop before the model runs if `test` is red there.
10. The test must run in CI: `npm test`'s first glob, `**/*.test.mjs`, reaches
    `.dev/features/loop-driver-spike/driver/loop-driver.test.mjs`; the build confirms it with a listed run.
