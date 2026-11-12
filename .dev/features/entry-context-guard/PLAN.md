# PLAN — entry-context-guard

- spec_content_hash: d19c3ae5ef62837c025d3dffb5e878c114e0c1d4a745caf51b4c114b9e7a8bcf
- applied_lessons: [L15, L35, L41, L62, L68, L81, L84]
- increment: At `/pharn-loop` entry, right after the run-start marker, a floor CLI measures the context that is running
  the command (bound by the run-start line's tool result, never by the session file alone) and stops the run (S15b,
  `blocked: context-too-large`) when it holds more tokens than `budget.entryContextTokens` (default 320,000);
  `/pharn-ship` runs the same line at Step 1 and only warns.
- layer(s): product floor (`pharn/floor/`), the `pharn-contracts` loop-record contract, the product `.claude` command
  surface (`/pharn-loop`, its close part, `/pharn-ship`); dev apparatus (`.dev/floor/command-hygiene.test.mjs`,
  `.dev/guides/floor-gates.md`)
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]
- linear: CORE-103 (epic CORE-13); baseline `.dev/measurements/loop-baseline-2026-11-11.md` §4, §12 (rated **go**)

## Why (P7 — a measured failure, not a hypothetical)

The baseline's 36 `/pharn-loop` runs (7.1.4 and 7.3.0, one user project): the 12 started in a main session carried a
median of 484k tokens on their **first** orchestrator request (210k–905k) and 505k per request over the run; the 24
started inside an agent started at 163k–280k. Every later request of a run re-sends that context. Nothing checks it
today. Re-derived this run from the same 36 ledgers (`pharn-app/pharn/features/*/cost.json`, read-only, first request
of the ledger's own `membership.context`, size = input + cache writes + cache reads): the figures above reproduce
exactly (main sorted: 210,150 · 217,278 · 344,983 · 384,284 · 458,441 · 461,657 · 507,209 · 600,657 · 654,507 · 797,162
· 798,271 · 904,823; agent max 280,210).

## The probe (the ticket's last criterion) — DONE before this plan, result: on disk by the next Bash call

Run in this session, as a subagent (whose Bash sees its parent's session id, as a loop inside an agent does):

1. One Bash call printed a unique marker line.
2. The **next** Bash call found it in this agent's own transcript (`<projects>/<project>/<session>/subagents/agent-<id>.jsonl`):
   record 50 of 55, `type: user`, a `tool_result` block — written before the second call ran. (Record 52, the second
   call's own `tool_use`, also held the string, which is why the classification below matters.)
3. A third call ran `transcript-core.mjs`'s own `findTranscriptDirs` + `sessionScan(dir, session, [line])`: holders of
   the line = exactly one context, `agent:<this agent>` — not `main`, not a sibling agent. The latest request in that
   context (the one issuing the call, timestamped 11 s before "now") was already on disk with its usage:
   208,625 tokens; the session's main thread read 182,905 at the same moment.

So the run-start tool result is on disk by the next Bash call, binding works through the existing reader, and the
measured row is the request that issues the check. No reshaping is needed. **Bound:** one probe, one client (this
desktop app's agent tool), one Claude Code version; the transcript format is undocumented (`transcript-core.mjs`
header), so this is evidence, not a floor fact.

## Applied lessons

- L35 — the binding is not re-spelled: the CLI reads markers with `render-cost-ledger.mjs`'s exported `readMarkers`,
  builds the window with `run-window-core.mjs` `runWindow`, the lines with `bindingMarkers` + `mark-phase.mjs`
  `markerLine`, the holders with `transcript-core.mjs` `sessionScan` and the context with `bindRun` — each imported from
  its one owner, so the guard binds exactly as the cost ledger does. The threshold default lives once
  (`DEFAULT_ENTRY_CONTEXT_TOKENS` in the core). The projects-dir default is a fourth inline copy of a three-copy fact;
  retiring all four into one owner touches the cost-ledger files CORE-75 is editing now, so it is named as follow-up
  `projects-dir-default-one-owner` rather than done here (stated, not hidden).
- L41 — one CLI test runs with **no** `--session`, **no** `--projects-dir` and **no** `pharn.config.json`: the session
  comes from `CLAUDE_CODE_SESSION_ID`, the projects dir from `CLAUDE_CONFIG_DIR/projects`, and the threshold from the
  default — so the production path is exercised, not only the hermetic flags.
- L15 — the config is read by own-property tests (`Object.hasOwn`) at both levels (`budget`, `entryContextTokens`); a
  test pins that `{"__proto__": {...}}` and an inherited `toString` read as "absent", never as a value.
- L62 — every value quoted into an `unknown` reason goes through `quote-core.mjs`'s total `shown()`; a test feeds
  `{"budget":{"entryContextTokens":{"toString":1}}}` with a control asserting `String()` throws on that value.
- L84 — `unknown` is the safe default and prints a go-on line, so a dead stop branch would look like "nothing to do".
  The tests build the realistic input — a transcript whose bound context's latest request is over the threshold — and
  assert exit 3; a mutation control (strict `>` turned to "never over") must fail them.
- L68 — the `pharn/LIMITS.md §3g` sentence is human-only. It is delivered as a patch script outside the repo and applied
  by the maintainer in a separate commit **after** `/pharn-dev-verify` (after the PR is green), never inside the build's
  anchor→verify window, where reconcile would read the correct edit as an escape.
- L81 — no test copies a hand-picked list of floor modules; a mutation control (L84's) copies the whole
  `pharn/floor/*.mjs` set into a temp dir, as `render-cost-ledger.test.mjs`'s mutant control does.

## Files

- `pharn/floor/entry-context-core.mjs` — NEW. The rule: `parseEntryThreshold(text)` (closed shape, bounds, default),
  `contextSize(usage)` (`input_tokens + cache_creation_input_tokens + cache_read_input_tokens`, each `isTokenCount`),
  `measureEntryContext({ markers, sessionId, projectsDir })` (window → binding lines → `sessionScan` → `bindRun` → the
  bound context's latest request), `decide(measure, threshold)`, the closed `REASONS` and `EXIT` sets, the line
  renderer. Imports `transcript-core.mjs` (its third consumer), `run-window-core.mjs`, `mark-phase.mjs`,
  `cost-value-core.mjs`, `quote-core.mjs`. — product floor
- `pharn/floor/check-entry-context.mjs` — NEW. The CLI: `--feature <name>` (checked by `FEATURE_SLUG_RE`), hermetic
  `--session` / `--projects-dir` / `--markers-base` / `--root`, env defaults, reads `pharn.config.json` at `--root`,
  prints ONE line, exits `0` within or unknown · `3` over · `2` usage; a top-level catch prints `unknown crashed` and
  exits 0. Writes nothing. — product floor
- `pharn/floor/entry-context-core.test.mjs` — NEW. Unit tests of the rule. — product floor tests (do not ship)
- `pharn/floor/check-entry-context.test.mjs` — NEW. CLI tests over fixture transcripts (the six criteria below). —
  product floor tests
- `pharn/floor/transcript-core.mjs` — header only: name `entry-context-core.mjs` as the third consumer (the header asks
  that a third be a deliberate addition). — product floor
- `pharn/floor/loop-record-core.mjs` — `BLOCKED_IDS` gains `context-too-large` after `not-isolated` (table order). —
  product floor
- `pharn/pharn-contracts/loop-record.md` — the `LOOP-BLOCKED-IDS` list gains `context-too-large`. — pharn-contracts
- `.claude/commands/pharn-loop.md` — `reads:` + one `allowed-tools` grant; Step 1a item 5: the check line right after
  the run-start marker (stdout redirected to the witness `pharn/.run/pharn-loop/<name>/entry-context.txt`), before the
  instruction-files report and the entry gates, with its exit mapping; the S15b row. — product command
- `.claude/commands/pharn-loop-close.md` — Step 7: the witness's line, quoted whenever it starts `entry-context: over`
  or `entry-context: unknown`, with the S15b row's ways out on a stop. — product command part
- `.claude/commands/pharn-ship.md` — Step 1: the same line right after the run-start marker; exit 3 is a warning shown
  at GATE 1, never a stop. — product command
- `.dev/floor/command-hygiene.test.mjs` — `STUCK_POINTS` gains S15b (count 22 → 23, its message names S15b); pins for
  the loop block (position and exit mapping) and the ship warning; a size-ceiling raise only if a measured file goes
  over its row (by the rule, visibly). — dev apparatus
- `.dev/guides/floor-gates.md` — a `## check-entry-context.mjs` section after the isolation check's. — dev apparatus
- `README.md` — the generated `## Current state` floor-checker count (160 → 162), via `npm run docs:generate` only. —
  repo meta (generated region)
- `SKILLS_VERSION` — 7.10.3 → 7.11.0 (minor: a new checker and stop). — repo meta
- `CHANGELOG.md` — a new `## [7.11.0] - 2026-11-12` section with this entry. — repo meta

### Not in this increment (human-only or later)

- `pharn/LIMITS.md` §3g — one paragraph, delivered as a Python patch script in the session scratchpad (sha256-checked
  before and after), applied by the maintainer after verify (L68). Pending, named in the PR body.

## Design

**Where it runs.** `/pharn-loop` Step 1a item 5, immediately after `mark-phase.mjs --kind run-start`, so the run-start
marker exists for this session and its printed line is in the calling context's tool result (the probe above). Before
`check-instruction-files.mjs --report` and before `entry-gates.mjs --start`, so a stop leaves no background runner to
abort. `require-loop-record.cjs --open` has already run, so the Stop guard holds; no `pharn/features/<name>/` exists, so
no record is written (as for S15 and S4), the close part's Step 7 summary runs, and the Final step's `--close` line runs
"on a stop before `pharn/features/<name>/` exists" (unchanged text).

**The rule (floor, deterministic).**

1. Window: `runWindow(markers, session)`; `unknown` → reason `window-unknown`.
2. Lines: `bindingMarkers(markers, session).map(markerLine)` — the ledger's binding evidence.
3. Holders: `sessionScan(dir, session, lines)`; `bindRun(held)` → one context, else `no-holder` / `several-holders`.
4. Measure: among `requests` whose `context` equals the bound one, the LAST in walk order (grill finding 1: one
   context is one append-only file, so walk order is append order and no timestamp is parsed); none → `no-request`.
   The command text says the check is its own Bash call, issued after the run-start line's result is back, never in
   one parallel batch with it (grill finding 2); the core's header says it reads files through `transcript-core.mjs`
   (grill finding 3). Size = `input_tokens + cache_creation_input_tokens +
cache_read_input_tokens`, each admitted by `isTokenCount`, else `usage-unreadable`.
5. Decide: `size > threshold` → `over` (exit 3); else `within` (exit 0).

**Unknown always means go on (exit 0)**, with a closed reason: `no-session`, `no-transcript`, `several-transcripts`,
`window-unknown`, `no-holder`, `several-holders`, `no-request`, `usage-unreadable`, `threshold-malformed`, `crashed`.
`/pharn-loop` stops on exit `3` only; every other exit goes on (a usage error included — it can only come from a
mistyped pinned line).

**The threshold.** `pharn.config.json` → `budget.entryContextTokens`, read from the working tree at the project root:
absent file, absent `budget` or absent key → the default **320,000**; present → a safe integer in **[1, 1,000,000]**,
else `threshold-malformed` (go on). Own-property reads (L15). No shipped config carries the key, so no install needs
it and no `MIN_CLI` change follows: no floor or CLI in this repo validates `pharn.config.json`'s key set closed
(`budget` is already an open sibling key, `instructionGrowthBytes`); the installer is in pharn-cli and is not read here,
so whether it rejects an unknown key is unverified — but the default applies when the key is absent, so nothing needs
the CLI to write it. Setting 1,000,000 effectively disables the stop (no current context window is larger).

**Which runs the default stops** (the 36 baseline runs, first orchestrator request): **10 of 12** main-session runs
(every one from 344,983 up); it lets through `github-login` (210,150) and `pricing-plan-catalog` (217,278); **0 of 24**
agent runs (largest 280,210). Margins: 39,790 above the largest agent run (14%), 24,983 below the smallest main run it
stops. Rationale for 320k over the midpoint 312.6k: orchestrators inside an agent grow with `pharn-loop.md` (81 KB at
7.3.0 → 87 KB now), so the margin is kept on that side. A naive read of the session's main thread instead would refuse
the 24 agent runs whose parent session was large — criterion 2 pins that the bound context, not the session, decides.

**The printed line** (one line, no session or agent id): `entry-context: within <n> <= <t> tokens (context
main|agent, threshold default|config)`, `entry-context: over <n> > <t> tokens (context main|agent, …) — <ways out>`,
`entry-context: unknown <code> — <reason>; going on`.

**`/pharn-ship`.** Step 1, right after its run-start line: the same pinned line. Exit `3` → say so at GATE 1 (the line
verbatim, and that every later request re-sends this context; the person may stop and re-run in a fresh session) and
go on; a line starting `entry-context: unknown` → quote it at GATE 1 and go on (GATE 1 decision Q3); a `within` line →
go on silently. Bound: ship's run-start runs once `/pharn-spec` has resolved `<name>`, so its measure includes the spec
stage's own reads — a later, larger point than the loop's.

**An `unknown` line is never silent (GATE 1 decision Q3).** `/pharn-loop` redirects the line into a run-state witness,
`pharn/.run/pharn-loop/<name>/entry-context.txt` (as Step 1a's isolation line does with `isolation.json`), so the close
part's Step 7 summary can quote it at any stop, long after entry and across a compaction: it quotes the witness's line
whenever it starts `entry-context: over` (the S15b stop) or `entry-context: unknown` (a malformed
`budget.entryContextTokens` included). The exit code still decides; the witness is only quoted. Cost: the redirect on
the pinned line and grant, one Step 7 bullet, one hygiene pin. Bound: the witness is run-writable state (Bash reaches
it; the write tools are denied `pharn/.run/pharn-loop/**` since 7.3.0), so the quote repeats whatever the file holds.

## GATE 1 — decision (recorded)

Approved by the orchestrating model under the maintainer's delegation (never a human approval): Q1 320,000 (the
stopped / let-through table and margins go into the floor-gates guide section, summarized in the CHANGELOG); Q2 S15b /
`blocked: context-too-large`; Q3 every unknown reason exits 0 and goes on, but the loop's summary and ship's GATE-1
note quote an `unknown` line (design above); Q4 a fourth inline projects-dir copy with follow-up
`projects-dir-default-one-owner`. The PR body names the unchecked point: whether pharn-cli refuses an unknown `budget`
key (the key is optional; no shipped config carries it). The probe result is advisory evidence (one client, one
version).

## Acceptance criteria → how each is met and tested

1. **Main-thread context over the threshold exits 3; under it, exit 0.** Fixture: a projects dir with
   `<session>.jsonl` whose tool result carries the run-start marker line and whose latest assistant request reads
   400,000 (threshold default) → exit 3 and an `over` line; the same at 300,000 → exit 0 `within`; exactly 320,000 →
   exit 0 (strict `>`). Test: `check-entry-context.test.mjs` ★ main over / under / equal.
2. **Agent context under the threshold inside a parent session over it exits 0.** Fixture: the main thread's latest
   request at 900,000; `subagents/agent-<id>.jsonl` (records `isSidechain: true`, `agentId`) holds the marker line in
   its tool result and a latest request at 200,000 → exit 0, `context agent`. Non-vacuity control in the same test: the
   main thread's own latest request in that fixture is over the threshold, and the swapped fixture (marker in main) →
   exit 3.
3. **No holder, two holders, no transcript → exit 0 with a closed `unknown` reason.** Fixtures for each (marker line
   in no tool result; in main's and an agent's; no `<session>.jsonl` under the projects dir) → exit 0,
   `unknown no-holder` / `several-holders` / `no-transcript`. Closure (L29/L36): one test per member of the closed
   `REASONS` set, and a test that the printed code set equals `REASONS`.
4. **Stop-table ids, `BLOCKED_IDS` and the contract list stay equal both ways.** The existing tests cover the new row:
   `command-hygiene.test.mjs` "the stuck-point table's blocked ids EQUAL … BLOCKED_IDS" (after `STUCK_POINTS` gains
   S15b) and `check-loop-record.test.mjs` "the contract's LOOP-BLOCKED-IDS list EQUALS BLOCKED_IDS, both ways".
5. **The stop writes no feature directory, and the Final step closes the run marker.** CLI: a test lists the fixture
   repo's tree before and after a run that exits 3 and finds no new path (no `pharn/features/<name>/`, nothing at
   all). Command: a `command-hygiene` pin that the check line sits after the run-start line and before the
   instruction-files and entry-gates `--start` lines, that its exit mapping says no record is written and the close
   part's Step 7 follows, and that the close part's Final step still names the stop before `pharn/features/<name>/`
   exists as a path that runs `--close`.
6. **The probe.** Done; result above (on disk by the next Bash call). No reshape. Advisory evidence.
7. **(GATE 1 Q3) An `unknown` line is quoted.** `command-hygiene` pins that the loop's pinned line redirects into
   `entry-context.txt`, that the close part's Step 7 quotes that witness when it starts `entry-context: over` or
   `entry-context: unknown`, and that `/pharn-ship` Step 1 quotes an `unknown` line at GATE 1.

## Contracts satisfied

- `pharn/pharn-contracts/loop-record.md` — the blocked-id set (rendered list, its markers) gains one member; no shape
  change, no new record field (a pre-feature-directory stop writes no record).
- `pharn/pharn-contracts/cost-ledger.md` "Run membership" — reused, not changed: the guard binds by the ledger's rule 6
  through the same functions. Cited in the core's header, not restated (P4).

## Evals to write (P1)

- None: no Capability (`role:`) is added or changed. The floor CLI is held by its `node --test` suites, which are the
  repo's convention for `pharn/floor/` (P1 binds capabilities and `rule_id`s).

## Guarantee audit (P0)

- "Over the threshold → exit 3; at or under → exit 0" → floor: enum-regex class (an integer compare over admitted token
  counts, a closed reason set). Tested.
- "The size read is the calling context's size" → **advisory**. The transcript format is undocumented and
  agent-writable (`pharn/LIMITS.md §6`); the binding rests on the run-start line reaching the calling context's tool
  result (probed once, above); the latest request is taken to be the one issuing the check.
- "The run stops on exit 3" → **advisory** orchestration (the model runs the line and obeys it).
- "Unknown means go on" → floor for the exit code (every unknown path exits 0, tested per reason); that going on is
  the right call is the ticket's decision.
- "No `MIN_CLI` change is needed" → advisory, from reading this repo: nothing here validates the config's key set and
  the key is optional; the installer's behaviour is unverified here.
- "The guard binds as the ledger does" → floor for the shared code path (same imported functions); a test asserts the
  core imports them rather than re-spelling them.
- Struck: "the guard prevents expensive runs", "the context is N tokens" as a fact (it is the transcript's figure).

## Trust audit (P2)

- The transcript (untrusted, agent-writable): only `isSidechain`/`agentId`/paths (through `contextOf`), tool-result
  text equality against our own marker lines, timestamps (`tsMs`) and integer counts (`isTokenCount`) are read. No
  free text reaches the output except the closed reason code and its fixed sentence; a forged line can trip the stop
  (the safe direction) or lift it (today's behaviour).
- `pharn.config.json` (project input, untrusted): parsed as JSON, own-property reads, an integer bound test; a refused
  value is quoted through `shown()` (L62).
- The markers file (`pharn/.run/cost/<name>/markers.jsonl`, run-writable state): read through the ledger's
  `readMarkers`, which normalizes it.

## Determinism audit (P5)

Every branch is a membership or integer test: set sizes (`bindRun`), equality of context keys, `tsMs` compares,
`isTokenCount`, `Number.isSafeInteger` + bounds. The loop branches on the exit code alone. No fallback ends in a guess:
an undecidable measure is `unknown` and the run goes on, as the ticket decides.

## Size ceilings (measured at build)

`pharn-loop.md` is 86,865 B against its row 93,184; `pharn-loop-close.md` 40,657 / 43,520; `pharn-ship.md` 16,082 /
17,920. Expected additions (about 1.5 KB, 0.3 KB, 0.6 KB) fit, so no raise is planned; if a measured file exceeds its
row, the row is raised by the rule (measured + 10%, up to 512) in the same table, visibly, and the CHANGELOG says so.

## Resolved at GATE 1 (formerly open questions)

1. Threshold default 320,000 — accepted.
2. S15b, `blocked: context-too-large` — accepted (keeps the "S4–S18 stop" sentence and the `S1–S18` cites true).
3. `budget.entryContextTokens`, bounds [1, 1,000,000], malformed → `unknown` (go on) — accepted, with the `unknown`
   line quoted by the loop's summary and ship's GATE-1 note.
4. A fourth inline projects-dir copy, follow-up `projects-dir-default-one-owner` — accepted.
