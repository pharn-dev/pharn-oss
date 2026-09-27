# BUILD — cost-ledger-run-scope

- plan: `.dev/features/cost-ledger-run-scope/PLAN.md` (GATE 1 decided by the orchestrating model under the
  maintainer's delegation, with three requirements R1–R3 and the three open questions resolved; GRILL G1–G8 folded
  into the plan's "Build carry-overs"). Spec hash re-checked at build Step 1: `d831d30d…f4f4`, unchanged. No open
  questions.
- scope (Step 0): `set-writes-scope.cjs --from-plan` → **26 paths**, equal to the plan's 26 `## Files` bullets; the
  reconcile epoch was anchored after it (`2452` paths, scope 26, `2026-09-27T15:53:40Z`, by `pharn-dev-build`).
- stage model: opus, by the maintainer's instruction for this batch (not a `pharn.config.json` route).
- base: `70cb51c` (6.28.2). `origin/main` moved to `f255f0c` (6.28.3, #286) during the build; it touches none of this
  increment's floor files, only `CHANGELOG.md`, `README.md` and `SKILLS_VERSION` in common. It is merged at the
  commit, after GATE 2 — the batch's recorded flow — and 6.29.0 stays the next minor.

## What landed

- `pharn/floor/run-window-core.mjs` — the header claims both halves of membership (GRILL G7) and adds rules 5–8. New:
  `MEMBERSHIP_METHOD` `run-window/2`, `MEMBERSHIP_METHOD_V1`, `MEMBERSHIP_METHODS`, three `UNKNOWN_REASONS`
  (`NO_CONTEXT`, `AMBIGUOUS_CONTEXT`, `UNLINKED_CONTEXT`) and their `CONTEXT_REASONS` subset, `MAIN_CONTEXT`,
  `AGENT_CONTEXT_PREFIX`, `agentContext`, `bindingMarkers`, `bindRun`, `runContexts`.
- `pharn/floor/transcript-core.mjs` — `recordContext`, `fileContext`, `contextOf` (a record's claim kept only when its
  file agrees, GRILL G2), and `sessionScan`: ONE pass returning the requests (the same collector as
  `sessionRequests()`, which is unchanged), each request's context, the tool-result holders of the wanted lines (a
  common-prefix pre-test before the split, GRILL G8), the spawn links (meta files found by LISTING `subagents/`, regular
  files only, the fork's own context excluded) and `named` (each context's earliest timestamp).
- `pharn/floor/mark-phase.mjs` — `markerLine()`, the one encoding of the printed line; the CLI prints through it; the
  header section "THE PRINTED LINE IS LOAD-BEARING" (R2).
- `pharn/floor/render-cost-ledger.mjs` — binds the run, builds its set, counts a window member only when its context
  is in the set, fails closed on an undecidable one, records `membership.context`/`contexts`, and splits the note's
  excluded count; `rowContext` (read back from `sidechain` + `agent_id`) and a defensive equality with the reader's
  context; `MEMBERSHIP_KEYS` gains the two keys, `MEMBERSHIP_KEYS_V1` is derived from it.
- `pharn/floor/check-cost-ledger.mjs` — rule 8 per method (closed key set each), the context shape, every row's context
  in `contexts`, a context-unknown membership only over a known window, the `run-window/1` WARN; under
  `--verify-transcript` the context comparison, the no-longer-binds WARN, and the legacy RED that counts the rows that
  are not the run's own.
- `pharn/floor/render-run-report.mjs` — the measurement label reads the method (`run-window/2`: the run's own
  contexts, with `context`/`contexts` quoted as DATA; `run-window/1`: a not-context-scoped caution; any other method:
  `unrecognized`), and the UNKNOWN label no longer says the cause was the markers.
- `pharn/pharn-contracts/cost-ledger.md` — "Run membership — `run-window/2`" with "The context half": the rule, what
  the binding reads and what that costs (R1's two delivery shapes), the bounds (the undocumented, machine-local layout;
  the advisory binding; the struck "never counted" claim); the field table; rule 6; Compatibility (the `run-window/1`
  reading and the old-reader direction, G3); the Route section's rows sentence; four named residuals.
- Fixtures: `with-subagents`' two agent files move to the measured shape (`agentId` = the file's id) and gain metas;
  the routed-stage and usage-snapshots metas gain `toolUseId`. Every spawn RECORD a test needs is staged in the scratch
  copy, never committed (it is message content).
- Tests: `transcript-core.test.mjs` (◆ CONTEXTS, a mutant for the fork self-exclusion, `sessionScan` following the
  first-line mutant), `run-window-core.test.mjs` (the vocabulary, `bindingMarkers`, `bindRun`, `runContexts` including
  the L58 case), `mark-phase.test.mjs` (★ DIFFERENTIAL over ten marker shapes, ★ END TO END through the emitter with a
  one-character negative control, ✧ GOLDEN, ✧ ONE ENCODING), `render-cost-ledger.test.mjs` (the RUN CONTEXT section:
  ★ H3 and its control, ★ R1 and its control, the reasons, nesting, the spawn window, G2, EMITTER == CHECKER, and one
  test per named residual), `check-cost-ledger.test.mjs` (rule 8 mutation controls, per-method key sets,
  `--verify-transcript` over the context set, the legacy RED/GREEN, G4, L58, the growth closure), `cost-hostile-input.test.mjs` (the scratch
  run is bound; shape B sits in the session's own file; 18 ★ CONTEXT DOMAIN CLOSURE over the four context records),
  `render-run-report.test.mjs` (the labels; the CLI chain staged with a binding).
- `.dev/measurements/cost-ledger-run-scope-2026-09-27.md` (R3), `CHANGELOG.md` `[6.29.0]`, `SKILLS_VERSION` 6.29.0,
  the README badge and its checker row (it claimed unrelated activity "cannot be summed in"), `CLAUDE.md`'s cost-ledger
  block.

## GATE 2 fixes (after the orchestrator's MERGE decision, under the maintainer's delegation)

The build-time decisions 1 (`contexts` reported over the contexts named by the window's end) and 4 (the
`unrecognized` label) were **accepted at GATE 2 as build-time amendments to the approved plan**. The review's findings
were fixed under the same 26-path scope, re-set from `PLAN.md`:

- the contract's "A second copy refuses" lead sentence is limited to copies in TOOL RESULTS (the important finding);
- "every marker shape" → "each marker kind and each field that changes the line" (CHANGELOG, contract, the
  differential's test name and comment);
- rule 6 states that a fabricated context-unknown membership passes both checker modes, the safe direction (the
  CHANGELOG's bounds bullet says it too);
- "Every ledger binds" → "Every measured ledger binds"; the measurement record's `f34b7a70` heading names its one
  `/pharn-ship` ledger; the contract's "`null` when nothing was measured" list adds a transcript with no usage-bearing
  record.

## Decisions taken while building (each is in the contract and the tests)

1. **`contexts` is reported over the contexts named by the window's end** (L58, found while writing the contract's
   verify sentence). The plan reported S over every context the transcript names. An agent the run spawns shortly
   before its `run-stop` can write its first line after the emission — measured: an agent's first record follows its
   spawn by up to 96 s — so the re-derived set would grow and `--verify-transcript` would RED a correct ledger.
   `sessionScan` returns `named` (context → earliest timestamp) instead of `seen`, and `runContexts` filters on it.
   Membership itself is unchanged: such an agent has no request inside the window.
2. **The meta-file timing is stated as measured, not assumed.** A meta's last write followed the agent's first record by
   5 ms at least and 33 ms at the median, and some are rewritten hours later, so its FIRST write is not observable. The
   contract says "written moments after", advisory.
3. **The old-reader direction was probed, not reasoned** (G3): the 6.28.2 checker REDs a `run-window/2` ledger twice
   (the two extra keys, and the method). The contract now says both.
4. **`render-run-report.mjs` labels an unknown method `unrecognized`.** Before, any `/2` membership was labelled the
   run window; now a method the report does not know is never given a scope (L6). A test covers absent, a future
   method, a number and an object.
5. **Shape B of the hostile suite says `isSidechain: false`.** It sits in the session's own file; a sidechain claim
   with no `agentId` now makes the ledger `unknown`, which 8 ★ walks as its context node and 18 ★ walks as a whole
   record.
6. **Four residual tests** pin today's behaviour of `cost-ledger-workflow-agents` (unknown), `cost-ledger-mention-only`
   (bound to the reader), `cost-ledger-shared-markers-file` (ambiguous only when both printed a current-run line) and
   the spawn window `cost-ledger-spawn-batched` rests on — L37: each stated bound is probed.
7. **A GROWTH CLOSURE for `--verify-transcript`** (`check-cost-ledger.test.mjs`), added once decision 1 showed the
   L58/L63 family recurring inside a plan that cited both: one fresh fixture per KIND of line a session writes after a
   closed run's emission (the run's own later request, a run agent's, an agent spawned after the end, an agent spawned
   inside whose first line lands after it, an unlinked agent, a marker line copied into another context), each
   required to leave the genuine ledger free of RED. It is the enumeration, not one member (L29, L52).

## Negative controls, run once each (L60)

Each edit was applied to a COPY of `pharn/floor/` under the OS temp dir — never this repository — and the named test run
over the copy, unmutated first (must pass) and mutated (must fail) (`.pharn/pharn-dev-build/mutants.mjs`, and
`mutant-growth.mjs` for the last two rows, both deleted after; each copy was removed by its script):

| mutant                                                       | test                                                              | result |
| ------------------------------------------------------------ | ----------------------------------------------------------------- | ------ |
| M1 — a binding line counts as a substring                    | `transcript-core` "◆ holders: a wanted line counts only …"        | red    |
| M2 — a second holder re-binds to the first                   | `run-window-core` "bindRun (rule 6) …"                            | red    |
| M2                                                           | `render-cost-ledger` "★ R1: a FOREGROUND agent's report …"        | red    |
| M3 — `main` is always in the set                             | `render-cost-ledger` "★ H3: two concurrent runs …"                | red    |
| M3                                                           | `run-window-core` "runContexts (rule 7): an AGENT as the run …"   | red    |
| M4 — no spawn-inside-the-window test                         | `render-cost-ledger` "the run's agents are … spawned DURING it …" | red    |
| M4                                                           | `run-window-core` "runContexts (rule 7): the bound context …"     | red    |
| M5 — an undecidable context is silently dropped              | `render-cost-ledger` "UNLINKED_CONTEXT: an agent with no spawn …" | red    |
| M5                                                           | `cost-hostile-input` "18 ★ each DECIDING node …"                  | red    |
| M6 — a missing `isSidechain` reads as main                   | `transcript-core` "◆ recordContext: exactly …"                    | red    |
| M6                                                           | `cost-hostile-input` "8 ★ TRANSCRIPT DOMAIN CLOSURE …"            | red    |
| M6b — a sidechain naming no agent reads as main              | `transcript-core` "◆ recordContext: exactly …"                    | red    |
| M6b                                                          | `render-cost-ledger` "D2 (6.29.0): …"                             | green  |
| M7 — a record's claim kept without its file's agreement      | `transcript-core` "◆ contextOf keeps …"                           | red    |
| M7                                                           | `render-cost-ledger` "a record whose context disagrees …"         | red    |
| M7                                                           | `cost-hostile-input` "18 ★ named departures …"                    | red    |
| M8 — `contexts` over every named context                     | `run-window-core` "runContexts (L58) …"                           | red    |
| M8                                                           | `check-cost-ledger` "--verify-transcript ctx (L58) …"             | red    |
| M9 — the checker's row-context test removed                  | `check-cost-ledger` "RULE 8 ctx — MUTATION CONTROLS …"            | red    |
| M10 — `--verify-transcript` no longer compares the set       | `check-cost-ledger` "--verify-transcript ctx — a TAMPERED …"      | red    |
| M11 — the CLI prints one character more than `markerLine()`  | `mark-phase` "★ DIFFERENTIAL (R2) …"                              | red    |
| M11                                                          | `mark-phase` "✧ ONE ENCODING (L35) …"                             | red    |
| M12 — the line's format moves (printer and matcher together) | `mark-phase` "✧ GOLDEN (R2) …"                                    | red    |
| M8 (again)                                                   | `check-cost-ledger` "--verify-transcript ctx — GROWTH CLOSURE …"  | red    |
| M13 — the excluded count compared with no growing tail       | `check-cost-ledger` "--verify-transcript ctx — GROWTH CLOSURE …"  | red    |

- **M6b stays green under `D2 (6.29.0)`, and that is two rules, not a gap.** The D2 line sits in an agent file, so even
  a record rule that read it as `main` is refused by the file-agreement rule (M7's): the ledger is `unknown` either way.
  M6b is killed by the `recordContext` table.
- **M7 was not killed by the first version of `18 ★ named departures`**, whose "another valid agent" case claimed an
  agent with no link: that agent was unlinked either way. The case now gives the claimed agent its own meta and spawn,
  so only the file-agreement rule keeps the claim from being counted, and M7 turns it red. Found by this table.
- **M12 is the point of the golden test**: a format change moves printer and matcher together, so every other test
  stays green, and only the literal bytes notice. The contract states what such a change costs.

## Measurements (L24, L37 — measured this run, not inherited)

- **R3, the real ledgers, with the built code:** the measurement record's §9. Session `3c47cb74`: six ledgers, shared
  rows 1,538 / 2,070 committed and at HEAD → 0 / 1,063 built. Session `f34b7a70`: 400 / 2,724 at HEAD → 0 / 2,486
  built. The control session `ed110cbf`: unchanged. Session `bb54cf03`: gone.
- **G8, the emitter's time** over the same ledger's session, seven alternating rounds: `f34b7a70` (79.3 MB) median
  6,053 ms at HEAD, 6,232 ms built; `3c47cb74` (78.2 MB) 2,998 → 3,038 ms.
- **The layout, re-run at build** (§3–§5 of the record): 97,274 usage-bearing records, all agreeing with their file;
  385 of 386 agents linked (380 to the main thread, 5 to an agent, 1 with no meta), all agreeing with the meta's own
  parent; first record 0 ms to 96 s after the spawn; meta last write 5 ms to 15.4 h after the first record.
- **The environment** of this agent: 30 variable names matching `claude`; the session id is the parent's; no variable
  names this agent.
- **The suites touched**, the eight cost suites run together after the L58 change: 399 tests, all passing. The full
  `npm test` before that change: 4,111 passing. The final counts are in the gates below.

## Probes of the built floor

- The 6.28.2 checker over a `run-window/2` ledger the built emitter wrote from a real session: 2 RED (the key set, the
  method). The built checker over the committed `run-window/1` file: 0 RED, the not-context-scoped WARN.
- The built `--verify-transcript` over each committed ledger of the two sessions: RED with the counted clause on every
  one holding other contexts' rows (208, 231, 74, 164, 179, 151; 3, 133, 99, 3), GREEN on the rest.

## Advisory orchestration, stated

- Step 2b's pinned block pipes paths through `xargs`, which the isolated worktree refuses. It ran as a node runner under
  `.pharn/pharn-dev-build/` with argv arrays, over the same 26-path scope list and the same three gates (prettier,
  `markdownlint-cli2 --no-globs --fix`, read-only eslint) — 25 paths present, `BUILD.md` not yet written; re-run after.
- Loops over computed arguments and heredocs are refused the same way; the measurements and the mutants ran as node
  scripts under `.pharn/`, all deleted before `npm run lint` (eslint descends into `.pharn/`).
- `GRILL.md`'s headings were once edited through a Bash `node -e` call during grill (in scope; noted so it is not
  mistaken for a Write-tool edit).

## Gates at build

- **Step 2b** (the node runner): prettier `--write` over the 26 scoped paths (25 present on the first pass, `BUILD.md`
  not yet written; 26 on the second), `markdownlint-cli2 --no-globs --fix` over the six `.md` among them — 0 issues —
  and read-only eslint over the fourteen JS paths — clean. One prettier rewrite was fixed by hand: a code span that
  wrapped across a line in the CHANGELOG entry lost its indentation, so the sentence was reworded to keep the span on
  one line.
- **Step 3, the floor:** `node pharn/floor/validate.mjs .` → **FLOOR: GREEN — 36 capabilities checked, exit 0.**
- **The repo-wide confirmation:** `npm run check` → **exit 0** — `format:check`, `lint`, `lint:md`, `docs:check`,
  `check:markers`, `check:badge`, `check:changelog`, `check:contributing`, `check:reconcile` and `test` (**4,118 tests,
  4,118 passing**, none skipped). The GROWTH CLOSURE test was added after that run: its suite, 59 of 59 passing, with
  prettier and eslint clean over the file. `/pharn-dev-verify` re-runs the whole set.
- **The writes-scope was released** (`set-writes-scope.cjs --clear`) after this note, the build's last write.
