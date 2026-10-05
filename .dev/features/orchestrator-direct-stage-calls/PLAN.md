# PLAN — orchestrator-direct-stage-calls: the orchestrators call the regress/verify stage scripts directly, and each routed stage's four pinned lines become two

- spec_content_hash: d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4
- applied_lessons: [L5, L19, L22, L29, L31, L35, L36, L41, L44, L45, L60, L62, L63]
- increment: `/pharn-loop` and `/pharn-ship` run `/pharn-regress` and `/pharn-verify` as ONE tested call each
  (`pharn/floor/stage-direct.mjs`: writes-scope set → stage script → scope release, with the stage's two markers),
  instead of invoking the thin-caller commands; and each routed stage's `route` + stage-start marker and `read` +
  return marker become one tested call each (`stage-agent.mjs start` / `finish`). Batch item 7, audit candidates C3
  and C1. Finding 7 (a model-invoked command does not get its frontmatter model) is recorded where the TURN SCOPE
  bound lives.
- layer(s): `pharn/floor/` (two new modules, `stage-agent.mjs` subcommands, `mark-phase.mjs` helpers, two header
  edits), the product `.claude/commands/` surface (`pharn-loop.md`, `pharn-ship.md` and their two quick parts),
  `pharn/pharn-contracts/cost-ledger.md` ("Route"), build apparatus (`.dev/floor/command-hygiene.test.mjs`, the
  feature folder).
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]

## Why (P7) — the recorded evidence

Batch brief §2 findings 7 and 8; audit `.dev/measurements/pipeline-performance-audit-2026-09-29.md` §4.1, C1 and C3.
Every figure below was re-derived this run from the 92-minute run's orchestrator transcript
(`~/.claude/projects/-Users-pgalarowicz-Projects-pharn-starter/f4b646c1-…jsonl`, main context only, read-only) and
from `.dev/measurements/loop-wall-clock-2026-10-05.md` (6.35.2), never copied from the brief (P6). The build commits
the read-only helper that prints them (`measure.mjs`, below). `[R·m]` = measured on the real run.

**C3 — the thin callers, as the orchestrator really invoked them** [R·m]:

- The model-invoked orchestrator called `Skill pharn-regress` (09:34:37.789Z, args `billing-plan-catalog --base 42d4…`)
  and `Skill pharn-verify` (10:05:21.095Z). Each injected its command body as an `isMeta` user message: **19,301 B**
  and **17,339 B** of text, **36,640 B** together (the files are 19,848 B and 17,929 B with frontmatter; the brief's
  19,449 / 17,500 do not reproduce exactly — a different count of the same messages).
- That text then rode in every later orchestrator request: the regress body in **29**, the verify body in **16**
  (of the run's 52). That is 29 × 19,301 + 16 × 17,339 = **837,153 B·requests** of carried text, about **209k
  cache-read tokens** at 4 B/token [R·e, the ratio an estimate — `LIMITS.md §1c`].
- Around each call the orchestrator spent requests on the thin caller's ceremony: regress run 1 = `[Skill + marker]`,
  setter, run, a read of `REGRESSION.md`, `--clear` (5 requests for a 1.1 s refusal); regress run 2 =
  `[marker;setter + run]`, three `--resume`, `[clear;marker;cat]`; verify = `[Skill + marker]`, `[setter;run]`. The
  name was passed as the argument, so no slug Write / `feature-name.mjs` call happened in this run (the audit's
  count assumed them).
- The audit's "confirm first" for C3 ("the tool-use names in a real orchestrator transcript") is met: it is the
  Skill tool, and the body is injected.

**C1 — the routed-stage ceremony** [R·m]: for each of the five routed stages the orchestrator spent `route` (1
request) → stage-start marker (1 request) → Agent → `read` (+ the return marker, which the model already chained into
the same Bash call). The marker needs the token `route` printed, so it can never share `route`'s request: **5 requests
in the run exist only because of that data dependency** (08:38:44/08:38:49, 08:42:23/08:42:27, 08:53:27/08:53:31,
08:59:43/08:59:47, 09:08:48/09:08:53). The model also typed that token into a shell line each time (a
`SHELL_VALUES` member, `<route>`).

**C1's own pre-registered bar is NOT met by the 92-minute run — stated, not glossed (P0/P7).** The audit (C1,
"Confirm first") pre-registered: orchestrator-role requests ≥ 20% of a run's requests. Measured from the record's
§3: billing-plan-catalog 52 / (52 + 289) = **15.2%**; workspace-wording-ui 33 / 222 = **14.9%**; locales-en-pl-only
(`--quick`) 32 / 151 = **21.2%**. One of three runs clears it. C1 is planned because the batch request names it,
and because it removes a model-typed token from five shell lines per loop, but the GATE-1 report asks whether to keep
it (Open questions).

**Finding 7 — a model-invoked command does not get its frontmatter model** [R·m, one session]: the person's own slash
`/pharn-loop` (08:19:16Z, frontmatter `model: sonnet`) was served `claude-sonnet-5-5` on all 19 requests of that
turn (08:19:20–08:23:37Z); the person's next message ("go", 08:32:44Z) started a turn served `claude-opus-5-5`, in
which the model invoked `Skill pharn-loop` (08:38:07Z) — and every request after it, through `Skill pharn-regress`
and `Skill pharn-verify` (both `model: sonnet`) to the run's stop at 10:10Z, was served `claude-opus-5-5` (185 opus
requests in the main context, 0 sonnet after 08:23:37Z). So the frontmatter override applied to a person's slash
invocation and to no model-invoked one. One session; not a platform statement.

## Discovery (P6) — the code as it stands

- `pharn/floor/stage-agent.mjs` `main()`: `route` decides through `route()` (`decideRoute` over the config probe),
  clears a leftover result on exit 0 (`clearResult`), prints ONE token line, exit 0/3/2; `read` runs `consumeResult`
  (validate, remove, print one closed line, exit 0/2/3/4). Both functions are exported; both subcommands stay.
- `pharn/floor/mark-phase.mjs`: `markPhase()` appends one marker; `markerLine()` is the ONE encoding of the printed
  line that binds a run to its context (`run-window-core.mjs` rule 6 matches it as a WHOLE LINE of a tool result —
  `transcript-core.mjs` splits each result on `\n`, so a multi-line result still binds). The CLI throws (node exit 1)
  on an fs failure.
- `pharn-loop.md` Step 5.2 and `pharn-ship.md` Step 2 items 6–7 / Step 2b mark `pharn-regress` / `pharn-verify` with
  two `mark-phase.mjs` lines each and say "invoke"/"…run the stage…"; the thin callers (`pharn-regress.md`,
  `pharn-verify.md` Step 0–Final) set the scope from their own `writes:` (`--from-frontmatter … --target
.pharn/pharn-<stage>/stage.json`), run `stage-<stage>.mjs --feature <name> --timeout-ms 540000 --budget-ms
570000` with the Bash-tool timeout at 600000, re-run `--resume --budget-ms 570000` on `5`, relay a `4`, and `--clear`.
- The scope targets have one owner each: `REGRESS_PATHS.stageJson` (`stage-regress-core.mjs`) and
  `VERIFY_PATHS.stageJson` (`stage-verify-core.mjs`).
- `ship-outcome-core.mjs` condition (b): a NON-verdict stage started twice at one iteration → `undetermined`;
  `VERDICT_STAGES` (regress, verify) may repeat. This decides two details below.
- Wiring pins that read these lines: `STAGE_AGENT_WIRING`, `PHASE_MARKER_WIRING`, `STAGE_SCRIPT_WIRING`,
  `SHELL_VALUES` (`<route>`), `RUN_MARKER_WIRING`, the quick-mode pointer sets in `command-hygiene.test.mjs`;
  `ship-outcome-core.test.mjs` ★ WIRING; `run-marker.test.mjs` ✧ WIRING anchors.

## Design

### D1 — `stage-agent.mjs start` and `finish` (C1)

Two new subcommands; `route`, `brief`, `report`, `read` are unchanged and stay for a person's direct use.

- **`start`** — `route`'s flags plus a bare `--no-agent-tool`. It decides the route exactly as `route` does, then
  writes the stage-start marker carrying that token (`markPhase`, in process), and prints two lines: the token, then
  the marker line (`markerLine`, the one encoding). Exit `0` agent / `3` inline, the inline remedy on stderr as
  `route` prints it. The decisions the model used to make around the old two lines move into tested code:
  - `--no-agent-tool` on an `agent` cell → `inline:no-agent-tool` (exit 3) without consulting the config (the
    model's reading of its own tool list stays ADVISORY, as today); on a policy-inline cell it changes nothing.
  - a `route` refusal other than "skipped", or a leftover result it cannot clear → `inline:route-unavailable`
    (exit 3), its reason on stderr — today the model ran inline with that token after `route` exited 2.
  - a skipped stage, or bad argv → exit 2, nothing written (as `route`).
  - **Idempotent over an open stage**: when the run's latest marker is already this stage's own stage-start (same
    stage, same iteration), `start` writes no second one (second line `marker: kept (stage already open)`). This is
    what lets `/pharn-ship`'s question relay re-route a fresh agent without a second stage-start, which
    `ship-outcome-core.mjs` (b) would read as `undetermined`.
  - a marker that cannot be written (an fs failure) → second line `marker: not written`, the route's exit unchanged:
    a marker is advisory and never fails the run (as today).
- **`finish`** — `read`'s flags. It consumes the result exactly as `read` does, then writes the `orchestrator`
  return marker, and prints the closed verdict line, then the marker line. Exit = `read`'s. **Except after a
  `question` (exit 4)**: no marker (`marker: deferred (question)`), because ship's round trip continues inside the
  stage (its agent's later rows must bill to the stage); the round trip's own `finish` writes it, and a run that
  STOPs on the question runs the inline return line first. Bad argv → `unusable usage`, exit 2, no marker.
- `mark-phase.mjs` gains the shared pieces both new callers need, one owner (L35): `tryMarkPhase()` (write a marker,
  return its line or the fixed `marker: not written`, never throw) and `latestMarker()` (the last parseable marker
  of a markers file).
- The brief's rule 4 forbids a stage agent `start`, `finish` and `stage-direct.mjs`, as it forbids `route`/`read`.

Per routed stage the orchestrator then runs `start` → Agent → `finish` (agent path) or `start` → the stage inline → the
inline return line (one generic `mark-phase.mjs --kind orchestrator` line in `## Running a stage`). The `<route>`
placeholder leaves every shell line (`SHELL_VALUES` loses a member), and the "if the marker exits 2, re-run it
without `--route`" instruction is gone with it.

### D2 — `pharn/floor/stage-direct.mjs` (+ `stage-direct-core.mjs`) (C3)

```text
node pharn/floor/stage-direct.mjs --stage <pharn-regress|pharn-verify> --name '<name>' --iteration <N> --timeout-ms <T> --budget-ms <B> [stage flags]
node pharn/floor/stage-direct.mjs --stage <pharn-regress|pharn-verify> --name '<name>' --resume --budget-ms <B>
```

- **Core (pure)** — `DIRECT_STAGES`, one closed table: per stage the script, the thin caller whose `writes:` the scope
  is set from, the target (imported `REGRESS_PATHS.stageJson` / `VERIFY_PATHS.stageJson`, never re-typed), and the
  stage flags it passes through (regress: `--base --gates --install --no-install --tests --no-tests`; verify:
  `--gates`). `parseDirectArgs` (closed both ways per mode; a fresh call needs `--iteration`, `--timeout-ms`,
  `--budget-ms`; a resume takes only `--budget-ms`; every flag at most once; refusals quote through a total
  `quote()` — L62), `scriptArgv`, `setterArgv`, and `returnMarkerDue(exit)` (every exit but `5`).
- **CLI**, in order: (1) set the scope by spawning `.claude/hooks/set-writes-scope.cjs --from-frontmatter
.claude/commands/pharn-<stage>.md --target <stageJson>` — exactly the thin caller's pinned setter line, so the A1
  claim ("while the script runs, no Write-tool write lands outside `.pharn/**`") holds for the direct call too; a
  setter that fails → exit 2, nothing else run or written; (2) a fresh call writes the stage-start marker
  (stage, iteration); (3) run the stage script beside this file with the script argv, stdout captured, stderr
  inherited, no timeout of its own (the script budgets itself); (4) `--clear`; (5) the return marker unless the
  script exited `5`; (6) print the start marker line, the script's stdout verbatim, the return marker line; exit
  with the script's own code (a signal or spawn failure → `1`, a crash, never a verdict).
- **Why the question rule differs from `finish`**: a stage SCRIPT that asks has ended — nothing continues — so its
  return marker is written, and `/pharn-ship` re-runs the same fresh line with the chosen option's `argv` appended (a
  second execution, `run 2`; regress/verify are `VERDICT_STAGES`, which may repeat). Because the orchestrators' fresh
  lines carry no flag a question replaces, that script argv equals the object's `resume.argv` + the option's argv.
- No new contract (P7): the module header is its spec, citing `pharn/pharn-contracts/stage-exit.md` for the
  protocol it passes through unchanged. The thin callers stay byte-identical, for a person's direct use.

### D3 — the commands

- `pharn-loop.md`: `## Running a stage` rewritten around `start` / `finish` and the inline return line; Steps 3, 4,
  5.1 use them; Step 5.2 pins the two `stage-direct.mjs` fresh lines and their two resume lines, with the Bash-tool
  timeout at 600000 (carried from the thin callers); Step 2's two stage-exit mapping paragraphs say what `continue`,
  a Bash-tool timeout and a refusal by the call itself map to (instead of "handled inside `/pharn-regress`"); Step
  5.3's RERUN re-runs the Step-5.2 line. One advisory line (finding 7): the frontmatter `model:` applies only to a
  person's slash invocation.
- `pharn-ship.md`: the same `## Running a stage` change, plus a paragraph for its two floor-only stages: the
  `stage-direct.mjs` exit mapping (done → the verdict read; refused/unusable → STOP with the DATA label and the thin
  caller's remedy cited; question → relay verbatim, re-run with the option appended; continue → resume line;
  crash → STOP) and the two resume lines; Step 2 items 2–7 and Step 2b use the new lines; the same advisory line.
- `pharn-loop-quick.md` items 2–5 and `pharn-ship-quick.md` items 4, 6, 9: the `--mode quick` start lines, and the
  regress line (not "its two markers") as what is skipped.
- Not touched: `pharn-loop-close.md`, `pharn-ship-close.md` (item 7 C2 is another builder's). Their "the route
  line printed" / "`stage-agent.mjs route` / `read`" wording stays true — `start` prints the route and runs
  `route`'s decision, `finish` runs `read`'s — and is named as a follow-up for that builder.

### D4 — finding 7

`pharn/floor/check-model-config.mjs`'s header, under TURN SCOPE, gains the observation and its bound (one session;
the person's slash invocation got the override, a model's Skill invocation did not). `LIMITS.md §8` cites that
header; every §8 sentence stays true ("when a person invokes it directly"), so no PROTECTED-FOLLOWUPS file.

### D5 — what moves in the ledger (L63: every re-derivation of a marker, asked once)

- Run binding (`run-window-core.mjs` rule 6): the marker line is now one line of a two- or three-line tool result;
  `transcript-core.mjs` matches whole lines, so it still binds (a ★ test reads it back through `markerLine`).
- Attribution: the request that issues `start` precedes its marker (orchestrator bucket, as `route`'s and the old
  marker's requests were); `finish`'s request precedes its marker (stage bucket, as `read`'s was). For regress and
  verify the stage bucket now holds only the resume requests — the old scope-set/run/clear requests are gone.
- `executions` (`stage-start-to-return/1`): regress/verify rows now span the script run plus the scope set/clear,
  no longer the orchestrator's think time between pinned lines — smaller, closer to deterministic work. A ship
  question now yields two regress/verify rows (`run 1` asked, `run 2` answered), the human's wait outside both.
- `ship-outcome-core.mjs`: unchanged inputs; a routed stage's `start` never writes a second stage-start for an open
  stage (D1), so condition (b) is not tripped by the relay.
- `check-cost-ledger.mjs`, `render-run-report.mjs` staleness: unchanged rules over the same marker objects (byte-
  identical marker JSON: the same keys, `route` only on routed stage-starts).

## Applied lessons

- L5 — the direct call is input capture for the regress/verify floor verdicts: it passes the script's exit code and
  object through unchanged, and a test proves every code (0/2/3/4/5, a crash, a signal) arrives intact.
- L19 — the call's own writes (the scope file, two markers) are Bash writes outside fix #7, declared here and in its
  header; all land under `.pharn/`, outside the reconciled set.
- L22 — each stage's call is a pinned literal line (fresh and resume), never prose describing the scope set/run/clear.
- L29 — the direct-call wiring is one enumeration (`DIRECT_STAGE_WIRING`: command × stage × iteration) that every new
  rule iterates; `STAGE_AGENT_WIRING` / `PHASE_MARKER_WIRING` are re-keyed on the new line forms, not special-cased.
- L31 — the thin callers and the orchestrators' direct calls are a deliberate copy-pair of one invocation; its
  obligation set (scope target, `--timeout-ms`/`--budget-ms`, the 600000 Bash timeout, the resume line, each exit's
  handling) is materialized in the hygiene test and checked across both.
- L35 — "must the second copy exist?": the scope target and setter argv are derived (imported path, the thin caller's
  own `writes:`), not re-typed; the timeout numbers must exist on both pinned lines (L41 forbids a default), so a
  parity pin binds them.
- L36 — closure, not presence: every `stage-direct.mjs` line in the corpus must be a member of the enumerated set, and
  no `stage-agent.mjs route`/`read` or `--route` line may remain in the two orchestrators.
- L41 — the call takes `--timeout-ms`/`--budget-ms` from its pinned line and has no default; a ★ test runs the
  committed lines, so the production path is the tested one.
- L44 — each pinned line stands alone: the resume line carries no state (the script reads its progress record), and
  `start`'s token is printed for the prose, never carried in a shell variable.
- L45 — the committed `start`, `finish` and `stage-direct.mjs` lines are EXECUTED from the command text in the suite,
  not only the modules by path.
- L60 — every new wiring rule gets a mutation control per asserted property, and every slice anchor is asserted found.
- L62 — every refusal in both CLIs quotes argv through the total `quote()`; `finish`'s stderr names only fixed codes.
- L63 — changing WHEN the markers are written re-bases derived values; D5 enumerates every re-derivation of a marker
  and says what each now reads.

## Files

- `pharn/floor/stage-direct-core.mjs` — new: the closed table, argv parsing, script/setter argv, the return-marker
  rule — product floor
- `pharn/floor/stage-direct.mjs` — new: the CLI (scope set, markers, script, release, pass-through) — product floor
- `pharn/floor/stage-direct.test.mjs` — new: core and CLI, every exit code, the scope during the run, markers —
  test, not shipped
- `pharn/floor/stage-agent.mjs` — `start` and `finish` subcommands; header — product floor
- `pharn/floor/stage-agent.test.mjs` — `start`/`finish` cases — test, not shipped
- `pharn/floor/stage-agent-core.mjs` — brief rule 4 forbids `start`, `finish`, `stage-direct.mjs`; header names the
  two subcommands — product floor
- `pharn/floor/stage-agent-core.test.mjs` — rule 4 names them (mutation control) — test, not shipped
- `pharn/floor/mark-phase.mjs` — `tryMarkPhase()`, `latestMarker()`, `MARKER_NOT_WRITTEN` — product floor
- `pharn/floor/mark-phase.test.mjs` — the two helpers — test, not shipped
- `pharn/floor/check-model-config.mjs` — header only: finding 7 under TURN SCOPE — product floor
- `pharn/pharn-contracts/cost-ledger.md` — "Route": the marker is written by `start`; the routed bucket names
  `finish` — product contract
- `.claude/commands/pharn-loop.md` — D3 — product command
- `.claude/commands/pharn-ship.md` — D3 — product command
- `.claude/commands/pharn-loop-quick.md` — D3 — product command part
- `.claude/commands/pharn-ship-quick.md` — D3 — product command part
- `.claude/commands/pharn-ship-close.md` — (added at GATE 2, review R4, an owner decision) the load-condition wording
  only: "with step 7's first `/pharn-verify` call that exits other than `5`" — product command part
- `pharn/floor/ship-outcome-core.test.mjs` — ★ WIRING reads the new committed lines — test, not shipped
- `pharn/floor/run-marker.test.mjs` — ✧ WIRING anchors move to the plan's `start` line — test, not shipped
- `pharn/floor/pre-run-snapshot.test.mjs` — (added at stacking, after 6.37.0 merged) its ✧ WIRING `next` anchor moves
  to ship's plan `start` line — test, not shipped
- `.dev/floor/command-hygiene.test.mjs` — `STAGE_AGENT_WIRING`, `PHASE_MARKER_WIRING`, `SHELL_VALUES`,
  `RUN_MARKER_WIRING`, the quick pointer pins, and the new `DIRECT_STAGE_WIRING` — apparatus
- `.dev/floor/command-family.test.mjs` — only if a pinned heading or paragraph moves — apparatus
- `.dev/features/orchestrator-direct-stage-calls/measure.mjs` — the read-only transcript helper behind every figure
  above — apparatus
- `CLAUDE.md` — the Commands block: `start`/`finish` and `stage-direct.mjs` — repo meta
- `SKILLS_VERSION` — 6.35.2 → 6.36.0, a minor (provisional; the orchestrator assigns the final number at stacking)
- `README.md` — the version badge
- `CHANGELOG.md` — a new section for this version

## Contracts satisfied

- `pharn/pharn-contracts/stage-exit.md` — passed through unchanged: one object, its exit code; the direct call adds
  lines around it and never rewrites it (cited by the new header, not restated — P4).
- `pharn/pharn-contracts/cost-ledger.md` — markers keep their keys and the one printed encoding (`markerLine`); the
  "Route" section is updated to name the new writer.
- `pharn/pharn-contracts/regression-report.md`, `verify-report.md` — unchanged; the scripts write them.

## Evals to write (P1)

No capability is added or changed (no `role:` file), so no eval. The tests are the specification:

- `stage-direct.test.mjs` — each exit 0/2/3/4/5 and a crash and a signal passes through; the scope file holds the
  thin caller's scope WHILE a fake script runs and is gone after; fresh writes start+return markers, resume only the
  return, `5` no return; a setter failure runs nothing; a marker failure keeps the exit; argv closed both ways.
- `stage-agent.test.mjs` — `start` per route outcome (agent, inline per reason, `--no-agent-tool`, an unclearable
  leftover, skipped, usage) and the idempotent open-stage case; `finish` per read outcome and the deferred question;
  each printed marker line equals `markerLine()` of the marker read back.
- `command-hygiene.test.mjs` — the wiring sets above, their ★ executed lines and their mutation controls.

## Guarantee audit (P0)

- "The direct call passes the stage script's exit code and object through unchanged" → floor: tested code (exit-code
  membership; the bytes are copied), executed over every code.
- "While the stage script runs, no Write-tool write lands outside `.pharn/**`" → floor: hook (fix #7) — the same
  setter line the thin caller pins, run by tested code before the script (a ★ test probes the live guard while a fake
  script runs). Bound: between two calls (around a `continue`) no stage scope is set; the default applies.
- "The call writes only the scope file and two markers, under `.pharn/`" → advisory beyond its tests: Bash writes
  outside fix #7 (L19); `.pharn/` is outside the reconciled set.
- "`start` records the route it decided" → floor: the token comes from `route()`'s tested decision and is written by
  code; the model no longer types it. `--no-agent-tool` remains the model's own reading (ADVISORY).
- "A routed stage ran on its configured model" → still struck (unchanged).
- "Every stage is marked" → advisory (a skipped line is unmarked, as before); the wiring pins prove presence/order.
- "Finding 7" → an observation of one session, labelled so; never a platform guarantee.
- "Calls / requests saved" → `[S·e]` by the audit's per-line accounting, `[R·e]` on the 92-minute run; never a
  measurement of a later run.

## Trust audit (P2)

- Inputs are argv the orchestrator substitutes (`<name>` — a validated slug; `<N>`; `<base sha>` — git's hex;
  a ship human's answer appended single-quoted, shape-checked by the script on re-invocation as today). The direct
  call never interprets a stage flag's value; it checks presence and control characters only, and the script
  validates (unchanged).
- The script's stdout is copied byte-for-byte; nothing in the call parses or branches on it. The orchestrator reads
  the object's free text (`detail`, a rendered refusal) as quoted DATA, as the thin callers say — the commands carry
  that label.
- `start`/`finish` read only the stage agent's closed result (`validateResult`) and the markers file's last line
  (`latestMarker`, JSON with a closed key test); a hostile markers file can at most make `start` skip a marker
  (fail toward "kept", which only an orchestrator re-run can reach) — stated as a bound.

## Determinism audit (P5)

Every branch is an exit code or a closed-set membership: the route decision (unchanged), `--no-agent-tool` (a bare
flag), the open-stage test (stage + iteration equality on the last marker), `returnMarkerDue` (exit ≠ 5), the
stage table. The orchestrators branch on the call's exit code by the existing stage-exit mappings; every fallback
ends in a stop or a question to the human (ship), never a guess.

## Expected time saving on the 92-minute run (arithmetic)

- **Requests the change would have removed in that run** [R·e]: C1 — the 5 `route`→marker request pairs become 5
  `start` calls (**−5**; `read` + marker were already chained by the model, so `finish` saves none there). C3 —
  regress run 1: `[Skill + marker]`, setter, `--clear` (**−3**); regress run 2: the closing `[clear;marker]` request
  (**−1**, the model chained a read into it, which may survive); verify: `[Skill + marker]` + `[setter;run]` → one
  call (**−1**). **≈ −10 orchestrator requests.**
- **Time**: the orchestrator's measured model time per request is median 3.1 s / mean 4.4 s (record §4; the brief's
  "~4 s / ~6.6 s" does not reproduce from the record — §3's gap median is 4.9 s), plus ~0.1–0.3 s of node start-up
  per removed Bash call. ≈ 10 × 4.4 s ≈ **44 s (≈ 0.7 min) of the 92 minutes** [R·e]. This item does not move the
  hour; the stage agents (55 min), the human wait (19 min) and regress (12 min) do.
- **Context**: 36,640 B of command text no longer injected per iteration, and the 837,153 B·requests (≈ 209k
  cache-read tokens [R·e]) it was carried for in that run.
- **By the audit's per-line accounting** [S·e] (each pinned line its own request): a green one-iteration full loop
  goes from ~70 to ~46 pinned/mandated calls (**−24**: Step 3 5→3, Step 4 13→7, Step 5 10→6, the two inline stages'
  12→0); each further iteration 23→7 (**−16**); a full `/pharn-ship` run ≈ −18. At 3.1–4.4 s that is 74–106 s per
  one-iteration loop and 50–70 s per further iteration — an upper bound, since the model already chains some
  independent lines.

## Risks

1. C1's pre-registered bar is unmet on 2 of 3 runs (Why, above); its time effect is ≈ 22 s per one-iteration loop.
2. The hygiene rewrite is large (`STAGE_AGENT_WIRING`, `PHASE_MARKER_WIRING`); a weakened pin is the failure mode —
   each rewritten rule keeps or gains a mutation control (L60).
3. Stacking: `pharn-loop.md` Step 2 / `pharn-ship.md` Step 2 also change in `gate-exclusion-config` (S4 wording, the
   build-gate sentence) and `regress-pre-run-snapshot` (Step 1a, ship entry); the hunks are disjoint lines.
4. `check-model-config.mjs` is vendored by pharn-cli, pinned by sha256: this header-only edit makes that copy lag (the
   residual `stage-agent-core.mjs` already names; no rule or output changes). pharn-cli is out of scope here.
5. Ship's question now yields two regress/verify executions in `cost.json` (D5): a reader comparing ledgers across
   versions sees it; the CHANGELOG says so.

## Grill amendments (G1–G8, `GRILL.md`; all taken)

- **G1 — a question that ends a loop run.** `finish` defers the return marker on `question` in both commands. In
  `/pharn-loop` a question is **S10**, so the loop's mapping says: run the inline return line, then stop (ship's
  STOP-on-question paths say the same).
- **G2 — the direct call's failure modes**, each in its header and here: the setter fails (no thin-caller command file
  in the install, an unusable `.pharn/`, the setter missing) → exit 2, nothing run, no marker (S9 / STOP); the
  start marker cannot be written → `marker: not written`, the run goes on; the script cannot be spawned, or dies on a
  signal → exit 1, a crash (the return marker is still written); `--clear` fails → a note on stderr, the script's
  exit unchanged, and a `.pharn/**`-only scope left for the next scoped step to overwrite.
- **G3 — the copy-pair obligation set (L31), closed, each with its rule in `DIRECT_STAGE_WIRING`:**
  1. the setter argv the call runs equals the thin caller's pinned setter line (module table vs command text);
  2. every direct fresh line's `--timeout-ms` / `--budget-ms` equal the thin caller's pinned numbers, `N < B < 600000`;
  3. every resume line's `--budget-ms` equals the thin caller's;
  4. each orchestrator names the 600000 Bash-tool timeout for these lines;
  5. each orchestrator's mapping names every stage-exit code — `0`, `2`, `3`, `4`, `5` — plus a crash and a Bash-tool
     timeout;
  6. the call's per-stage flag set holds every flag a registry question option appends (`stage-exit-core.mjs`
     `REGISTRY`), so every answer can be appended.
- **G4 — the two halves of the direct call's tests.** (a) `stage-direct.test.mjs`, with an injected script: every code
  0/2/3/4/5, a crash (1, 7) and a signal pass through; the scope file holds the thin caller's scope WHILE the script
  runs and the live guard denies a write outside `.pharn/**` then; markers per mode. (b) The hygiene ★ test runs each
  COMMITTED line with the real script in a scratch tree, where it refuses: it proves that line's pass-through, its
  markers and its release, never the other codes.
- **G5 — `latestMarker`'s trust bound**, in `mark-phase.mjs`'s header and tested with a torn last line, a non-object
  and a forged matching stage-start: a forged last line can only make `start` keep a marker instead of writing one;
  it never changes the route, the token printed or the exit.
- **G6 — the budget clock.** The call's own work (node's start-up, two setter spawns, two marker writes) is outside the
  stage script's clock; the header adds it to the thin callers' "not counted" list (the pinned numbers hold the 600 s
  cap only while uncounted work fits in the remaining 30 s).
- **G7 — `reads:`.** Both orchestrators' frontmatter lists gain `pharn/floor/stage-direct.mjs`.
- **G8 — not additions.** `--no-agent-tool` preserves today's `inline:no-agent-tool` route, which the fold would
  otherwise lose (the token is no longer typed by the model); the open-stage rule preserves ship's question relay,
  whose re-route today writes no second stage-start.

## Open questions (HALT)

None. The one question raised at GATE 1 (keep C1?) is answered below.

## GATE 1 — decisions (2026-10-05)

Approved by the batch's orchestrating model under the user's delegation. This was not a human approval. It decided:

- **Ship BOTH C3 and C1.** C1's own pre-registered bar (orchestrator-role requests ≥ 20% of a run's requests) was met
  in **1 of the 3 real runs** (15.2% / 14.9% / 21.2%). C1 is adopted because the user asked for item 7 to be
  addressed, and because it removes a model-typed route token from every shell line — **not** because the bar was
  met. The PLAN, the CHANGELOG and SHIP.md say so.
- **Keep the saving statement exactly as derived above:** ≈ 10 orchestrator requests ≈ 44 s on the 92-minute run;
  36,640 B per iteration no longer injected, ≈ 209k cache-read tokens estimated; it does not move the hour. The
  corrections to the brief's figures (3.1 / 4.4 s, not ~4 / ~6.6 s; 19,301 / 17,339 B, not 19,449 / 17,500 B) stay.
- **Keep each hygiene rewrite minimal**, and give every rewritten rule its mutation control (Risk 2).
- **State both ledger changes (Risk 5) in the CHANGELOG**: regress/verify `executions` rows shrink to the script's
  own time, and a ship question yields two regress/verify executions.
- **Stacking:** on the tip the orchestrator names when green (expected `feat/build-gate-bounded`, 6.39.0).
