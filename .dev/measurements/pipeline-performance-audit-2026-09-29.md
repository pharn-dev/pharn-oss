# Post-optimization performance audit of the PHARN delivery pipeline (2026-09-29)

An analysis-only audit of the product delivery pipeline (`/pharn-ship`, `/pharn-loop`) as it stands at
`SKILLS_VERSION` 6.35.0, commit `c9737b4`. It follows the four optimization increments: 6.32.0 (#294), 6.33.0 (#297),
6.34.0 (#298) and 6.35.0 (#299).

- **Plan and selection rule:** `.dev/features/pipeline-performance-audit/PLAN.md`, approved at GATE 1 on 2026-09-29
  (route "audit now").
- **Grill:** `GRILL.md` in the same folder.
- **Review:** `REVIEW.md`. This version applies the review's findings F1–F10 and the re-review's R1–R3.

**Where the numbers come from.** Figures come from `.dev/features/pipeline-performance-audit/audit.mjs`, and the mode
is named with each one. There are three exceptions:

- CF1/CF2 are quoted from their `MEASUREMENT.md` files;
- pharn-starter's install date is read from its `pharn.config.json` (`installedAt`);
- the pre-routing request counts (11–426, median about 200) are quoted from the CHANGELOG [6.32.0] entry.

A derived figure shows its formula.

## The answer, in one paragraph

**No real delivery run exists on a post-optimization version.** All 69 real cost ledgers found were written by pharn
6.12.1 (56) or 6.7.0 (13). pharn-starter, the one project with real runs, still records `skillsVersion` 6.12.1, so none
of the four optimizations has run on real work. So this audit cannot say what consumes most measured model usage or
most observed wall-clock time. Section 9 names the smallest step that answers both.

What the code and the controlled observations do show:

- **Most PINNED orchestrator calls are deterministic.** A green one-iteration `/pharn-loop` makes at least 70
  orchestrator tool calls that are pinned or mandated (estimate). 57 of them run a pinned script and read its exit code
  or one short line. The pinned lines are sequential, because each branches on the exit code of the one before it. So
  nearly every call is its own model request carrying the orchestrator's whole context. The share of ALL orchestrator
  requests these make in a real run is **not** known: unpinned calls are not counted.
- **Every fresh stage agent pays a large fixed prefix on its first request.** Stage agents are spawned as
  `general-purpose`. In 29 such agents in this repo, that first request cache-wrote 68,223–129,646 tokens (median
  91,759), and 15 of the 29 also cache-read about 31k tokens.
- **The project's `test` gate runs at least twice per iteration**, and three or four times when any test file lies
  outside the feature:
  - inside the build agent, repeated until green, with its output in that agent's context;
  - at regress, HEAD and BASE (unless reused), over the outside-feature test files only. It is recorded `no-files`,
    and not run, when there are none;
  - at verify, where it is never reused.

Which of these dominates a real run is **unknown**. The best-evidenced structural candidates cut pinned orchestrator
calls (section 6, C1 and C2). Both are contingent on real runs showing that orchestrator requests are a material
share.

## Labels used throughout

Each figure carries a **source** and a **precision**, never one mixed label (GRILL G5).

**Source:**

- `R` — real, post-optimization user workload. There is none.
- `H` — real, pre-optimization. It is used only to report exclusions, never for a conclusion.
- `CF` — a controlled fixture. It names its fixture and floor.
- `CH` — a controlled harness observation: Claude Code's own transcripts in this repo, not a PHARN delivery run.
- `S` — static: this checkout at `c9737b4`.

**Precision:** `m` measured; `e` an estimate derived from measured numbers, with its formula.

So `[S·m]` is a byte count read from a file, and `[S·e]` is a figure derived from such counts.

- **Never compared across sources.** Figures of different sources are never expressed as percentages or ratios of
  each other.
- **Classes kept separate.** Token classes (uncached input, cache write, cache read, output, thinking output) are
  reported separately. The one all-classes total the helper prints is reference only, and no conclusion uses it.
- **No prices.** No figure is priced.

## 1. Evidence set

### Real runs: found, included, excluded

`audit.mjs --ledgers ~/Projects/pharn-starter/pharn/features/*/cost.json`. All values `[H·m]`:

| measure                                               | value                                                                                 |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------- |
| ledgers found (the rule's universe)                   | **69**                                                                                |
| included, full profile (≥ 6.35.0)                     | **0**                                                                                 |
| included, model usage only (6.32.0–6.34.x)            | **0**                                                                                 |
| denominators: tokens / elapsed / work                 | **0 / 0 / 0**                                                                         |
| `skills_version`                                      | 6.12.1 ×56, 6.7.0 ×13                                                                 |
| schema · membership                                   | `pharn-cost-ledger/2` · `run-window/1` ×56; `pharn-cost-ledger/1` · no membership ×13 |
| `coverage`                                            | `partial` ×69                                                                         |
| with `executions` or `work` (the 6.35.0 keys)         | 0                                                                                     |
| `check-cost-ledger.mjs` today                         | GREEN ×69 (internal consistency only, L43)                                            |
| checker WARN: the rows come from two or more contexts | 49 (all 6.12.1)                                                                       |
| ledgers sharing one `window_start`                    | 10 at 2026-09-22T17:06:51Z, 2 at 2026-09-23T08:56:20Z, 2 at 2026-09-25T20:39:38Z      |

**Exclusions, by the frozen rule's closed reasons:**

- `pre-optimization-version` ×69;
- `membership-run-window-1` ×56.

No other reason fired, and no ledger was eligible, so no per-metric exclusion applies. The 13 schema-`/1` ledgers have
no `membership` at all, so they fail the rule's `run-window/2` condition. The frozen reason set has no member for that
(GRILL G2). It is recorded here, not patched, because every one of them is already out on version.

**Two independent signals agree that none is post-optimization:**

- **The version field.** It is advisory under the cost-ledger contract, because it records the configured version
  (GRILL G1).
- **The structure.** No ledger has the 6.35.0 `executions`/`work` keys, and none has `run-window/2` membership
  (6.29.0).

**The ledgers are also weak on their own terms:**

- **Multi-context rows.** The checker's WARN on 49 `run-window/1` ledgers says their rows come from two or more
  contexts. A run's own spawned agents are contexts too, so this shows membership that `run-window/1` could not scope
  to the run. It does not prove that foreign rows are present.
- **Output under-counted.** Before 6.24.1, output was read from a request's first transcript line (L63).

**Other real run records, not ledgers (`H`, excluded):**

- this repo's `pharn/features/loop-decision-integrity/`, a 6.3.0-era `LOOP.md` and its reports;
- one `/pharn-loop` transcript in this repo's `pharn-loop-run` worktree project, dated 2026-09-21. The PLAN's inventory
  named it. It is excluded as pre-optimization by date: 6.32.0 was released on 2026-09-28;
- the pharn-starter orchestrator transcripts. pharn-starter's install record reads 6.12.1, installed 2026-09-23, so
  every one of them predates the four optimizations;
- the "37 orchestrator transcripts on the maintainer's machine" that the CHANGELOG [6.32.0] entry measured. That
  increment's plan (`.dev/features/orchestrator-context/PLAN.md`) says those transcripts "predate 6.27.0 routing".

The rule's universe named ledgers only. Leaving transcripts out is a scope choice recorded here (GRILL G7). None of
them could enter anyway.

**Fixtures.** No fixture delivery run was made: GATE 1 chose "audit now", so `fixture-not-workload` never fired.

**Limits of the rule, disclosed (GRILL G1–G3).**

- **The freeze and the "fixture" call.** The freeze is advisory: no floor pin held `PLAN.md` between GATE 1 and the
  build. `fixture-not-workload` is the caller's declaration (`--fixture`), because nothing in a `cost.json` records
  it.
- **The sample above 20** is not sized, and "mode" is not a top-level ledger field. The human should settle both
  before the first real-run pass.
- **What the planner saw before freezing the rule.** The planner read one pre-optimization ledger's totals and the
  version and schema fields of all 69. No post-optimization cost existed to bias the rule.

### Controlled evidence (used as controlled, never as workload, L4)

| id  | source                                                | what it measures                                                                                                                                                            | reps          |
| --- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| CF1 | `.dev/features/regress-base-reuse/MEASUREMENT.md`     | BASE reuse on a 2nd regress. Floors `a2b5f6b` (before) vs its branch (after). Fixture: 3 gates (0.8–1 s) + a 1.5 s `postinstall`                                            | 3 per variant |
| CF2 | `.dev/features/verify-head-gate-reuse/MEASUREMENT.md` | VERIFY reuse of REGRESS/HEAD executions. Floors `2cf0e85` vs its branch. Fixture: 4 gates (0.3–1 s), `--no-install`                                                         | 3 per variant |
| CH1 | `audit.mjs --prefix`, input set below                 | the FIRST request of each subagent in this repo from 2026-09-23 to 2026-09-29T07:00. It is grouped by the agent type the transcript's `.meta.json` records, per token class | 37 agents     |
| —   | `.dev/features/run-performance-breakdown/DEMO.md`     | **synthetic** token counts. Used for nothing in this audit                                                                                                                  | —             |

- **CH1's input set.** Every `subagents/agent-*.jsonl` under this checkout's Claude Code project directory, run as:

  ```text
  find ~/.claude/projects/<this checkout's project key> -path '*/subagents/agent-*.jsonl' \
    -exec node .dev/features/pipeline-performance-audit/audit.mjs --since 2026-09-23 --until 2026-09-29T07:00 --prefix {} +
  ```

  The window is fixed, so the set does not move as later agents are spawned. It holds 29 `general-purpose`, 6
  `Explore` and 2 `claude-code-guide` agents. PHARN spawns stage agents as `general-purpose`, so only that group
  describes them.

- **CF1 and CF2 are not pooled.** Both ran on floors older than 6.35.0, each with its own fixture.

### Static evidence

`audit.mjs --static --project ~/Projects/pharn-starter`, at commit `c9737b4`. It covers:

- the bytes of every orchestrator command and part, every stage command and every stage-agent brief (the build brief
  at iterations 1 and 2);
- the pinned shell blocks per command section, and the size of `ARCHITECTURE.md §6`;
- pharn-starter's `CLAUDE.md`, and the route its current `models` block would get.

## 2. Current execution profile (as the code stands, not as measured)

**Routing depends on the install's config (GRILL G8).**

- **This repo's `models.stages`:**
  - spec, plan, grill and `ac-test` (the test stage) request opus;
  - build, regress, verify, ship and loop request sonnet;
  - effort is `high` everywhere.
- **pharn-starter's current block** (the pre-0.7.0 shape, `opus-4-8`/`sonnet-5`, top-level `default`) makes every
  routed cell print `inline:config-red` [S·m]. Updated to 6.35.0 **without** a CLI ≥ 0.7.0 migrating that block, it
  would run every stage inline on the orchestrator's model. Stage-agent routing, and the context separation below,
  would then not happen.
- **Effort is never routed.** A stage agent inherits the parent session's effort (`stage-agent-core.mjs`, header).

Byte figures in the table are `[S·m]`.

| stage                                       | model or deterministic                                                                      | where it runs (full / quick)                               | requested model (this repo)       | major inputs                                                                                               | deterministic work                                                                                                                                                         | repeats when                                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| orchestrator (`/pharn-loop`, `/pharn-ship`) | model (sequencing, the stuck-point mapping, ship's GATE-2 text); mostly runs pinned scripts | the invoking session, inline                               | frontmatter `sonnet` for the turn | its command (43,164 / 35,982 B), `CONSTITUTION.md`, parts at their points, every tool result               | markers, route/read lines, freshness, stop decision, ledger/report/commit (loop)                                                                                           | the whole run                                                                                      |
| SPEC                                        | model                                                                                       | loop: agent / agent; ship: inline (it IS GATE 1)           | opus                              | description, template, the project                                                                         | `check-spec`, pin, `check-spec-approved`                                                                                                                                   | once per run                                                                                       |
| PLAN                                        | model                                                                                       | agent / agent                                              | opus                              | SPEC, lessons (index then canon), the §6 plan row, the project                                             | `check-plan-lessons`, AC-TESTS mapping                                                                                                                                     | once per run                                                                                       |
| GRILL                                       | model (full), checkers only (quick)                                                         | agent / inline `floor-only`                                | opus (full)                       | PLAN, SPEC, lessons, contracts, the §6 grill row                                                           | `check-plan-spec-agree`, `check-plan-lessons`                                                                                                                              | once per run                                                                                       |
| TEST                                        | model + deterministic red run                                                               | agent / agent                                              | opus (`ac-test` key)              | SPEC, PLAN, AC-TESTS.md                                                                                    | `run-gates --stage ac-test`, `check-red-run`, the lock                                                                                                                     | once per run (never re-run after build)                                                            |
| BUILD                                       | model + the project's own gate                                                              | agent / agent                                              | sonnet                            | PLAN.md only (not SPEC, not GRILL), the §6 build row, the project; iter ≥ 2 (loop): report fix-list fields | `check-test-stage`, scope set, anchor, **the user's `test`/`lint`, re-run until green** (un-stamped, un-budgeted)                                                          | every iteration (loop cap default 3); ship: one bounded rebuild on `INCOMPLETE` (Step 2b)          |
| REGRESS                                     | deterministic (`stage-regress.mjs`)                                                         | inline `floor-only` / skipped                              | (orchestrator's)                  | PLAN `## Files`, git                                                                                       | HEAD gates (outside-feature `test` subset + other discovered gates); BASE worktree + install + base gates unless the BASE requirement is unchanged within the run (6.33.0) | every iteration; + ≤ 1 freshness re-run per iteration; + a `continue` resume per 570 s budget      |
| VERIFY                                      | deterministic (`stage-verify.mjs`)                                                          | inline `floor-only` / inline                               | (orchestrator's)                  | stamps, AC evidence                                                                                        | every discovered gate at HEAD (typecheck/build reused from REGRESS/HEAD when eligible, 6.34.0; `test`, style gates, `reconcile` never) + AC gate + completeness            | as regress                                                                                         |
| retries                                     | the stop is deterministic (`check-loop.mjs`); the fix is model work                         | —                                                          | —                                 | loop: structured fix-list fields only                                                                      | `check-loop-fresh.mjs` before every stop read                                                                                                                              | `CONTINUE` → a new build agent + regress + verify; `RERUN` → the named stage again, same iteration |
| closeout                                    | mostly deterministic; `LOOP.md` Handoff is model text                                       | inline, from the close part (31,211 / 28,179 B, read once) | (orchestrator's)                  | reports, markers                                                                                           | loop green path: record checks, run-stop marker, ledger render + check, run report, commit-gate freshness, stage list, branch, add, commit, release                        | once                                                                                               |

**What one routed stage costs the orchestrator** [S·m]:

- four pinned lines: `route`, the stage-start marker, `read`, and the return marker;
- one Agent call.

**What a routed stage agent receives:**

- first, its harness prefix, on its first request (CH1);
- then, through its own tool calls:
  - its brief, 2,498–4,063 B [S·m]. The upper end is a loop rebuild at iteration ≥ 2; a first loop build's brief is
    3,598 B;
  - `CONSTITUTION.md`, 7,958 B [S·m];
  - its stage command, 19,125–26,261 B [S·m];
  - for plan, grill and build, the `ARCHITECTURE.md §6` row its command names (all of §6 is 4,754 B [S·m]);
  - whatever else the stage reads and runs.

## 3. Measured cost profile

### Model usage

- **Real:** no measurement (0 runs, all three denominators 0).
- **CH1, a fresh `general-purpose` agent's first request** [CH·m], 29 agents, by token class:

  | token class    | min    | median | max     | note                     |
  | -------------- | ------ | ------ | ------- | ------------------------ |
  | uncached input | 2      | 2      | 2       |                          |
  | cache write    | 68,223 | 91,759 | 129,646 |                          |
  | cache read     | 0      | 30,927 | 31,428  | non-zero in 15 of the 29 |

  The other agent types differ: `Explore` cache-wrote 34,934–46,732, and `claude-code-guide` (haiku) 72,869–73,357.
  They are not stage agents. The prefix's composition (system prompt, tool schemas, `CLAUDE.md`, memory) is **not**
  measured.

  This repo's `CLAUDE.md` is 172,421 B [S·m], and pharn-starter's is 387,549 B [S·m], 2.25× larger. The prefix
  there is **not measured**. Whether `CLAUDE.md` drives the prefix cannot be told apart from the rival causes with this
  data (L40).

- **PHARN-owned instruction bytes per routed stage agent** [S·m]:
  - brief + `CONSTITUTION.md` + stage command is 29,581 B (test, ship) to 37,485 B (spec, quick loop);
  - plan, grill and build add up to 4,754 B of §6.

  These enter through the agent's tool results after its first request, so they are not part of CH1's figure. No
  ratio of the two is stated (different sources).

- **Orchestrator instruction bytes** [S·m]:
  - `pharn-loop.md` 43,164 and `pharn-ship.md` 35,982 at invocation, carried by every later orchestrator request;
  - quick parts 11,091 / 11,223, only on a `--quick` run;
  - close parts 31,211 / 28,179, read once at the stop;
  - the inline thin callers `pharn-regress.md` 19,848 and `pharn-verify.md` 17,929. How the orchestrator loads these
    (a slash-command invocation per call, or one Read) is not pinned and not measured (section 9).

  The orchestrator's harness prefix is not measured: CH1 covers subagents only.

### Observed elapsed time

- **Real:** no measurement. The 6.35.0 `executions` view exists in no real ledger.
- **CF1 / CF2 whole-stage wall-clock**, for their fixtures only [CF·m]:
  - regress 10.1–10.6 s → 4.4 s on a BASE-reuse hit;
  - verify 4.8–4.9 s → 2.5 s with 2 of 4 gates reused.

  They illustrate what the counts save on those shapes. They say nothing about a real project.

### Deterministic work

- **Real:** no `work[]` record exists.
- **CF1** [CF·m]. On the 2nd regress of one run, per invocation:
  - worktree checkouts 1 → 0, installs 1 → 0, base gate processes 3 → 0;
  - all gate processes 6 → 3.

  The 1st invocation is unchanged.

- **CF2** [CF·m]. Per regress + verify pair:
  - verify gate processes 4 → 2 (`typecheck`, `build` reused);
  - total gate processes 12 → 10.

  `test` runs at both stages by design, and `lint` runs at both because style gates are never reused.

### Retries

- **Real:** no measurement. Frequency of `CONTINUE`, freshness `RERUN`, `continue` resumes and ship's Step 2b rebuild:
  unknown.

## 4. Dominant remaining costs

**Measured model usage: cannot be ranked (0 real runs).** **Observed wall-clock: cannot be ranked (0 real runs).**

What can be ranked is **static structure**, and it is ranked as structure only:

1. **Pinned orchestrator calls** [S·e]. The inputs are pinned shell blocks in the loop family [S·m]. In
   `pharn-loop.md`:
   - Step 1a: 5;
   - Step 3: 5;
   - Step 4: 14, of which a green run executes 13, because `check-red-run --preflight` runs only when
     `check-test-stage` fails;
   - Step 5: 10 per iteration.

   The green-path close part adds 16 (6b 8, 6c 5, Step 7 1, Final 2). The two inline stages, `/pharn-regress` and
   `/pharn-verify`, each cost 6 calls per iteration, because the loop pins them without the feature name:
   - the invocation;
   - the slug Write and the `feature-name.mjs` line;
   - the scope set, the run and the release.

   The Agent calls are 5 (spec, plan, grill, test, build). The model file operations are 4: the slug Write, the
   `CONSTITUTION.md` Read, the close-part Read and the `LOOP.md` Write.

   **A green one-iteration full loop:** 5 + 5 + 13 + 10 + 16 + (2 × 6) + 5 + 4 = **70 calls** [S·e].
   - **57 of them** run a pinned deterministic line and read its exit code or one short line: the 49 pinned blocks
     plus 4 per inline stage.
   - **The other 13** are the Agent calls, the invocations, the slug Writes and the file Reads and Writes.

   **Each further iteration:** 10 + 12 + 1 = **23 calls** [S·e], 18 of them deterministic.

   **What is NOT counted:**
   - grill's verdict reads, which the loop cites from ship and does not pin;
   - further mandated green-path reads and lines: Step 1b's lookup of a prior `LOOP.md`, Step 6b's Read of the
     loop-record contract, Step 6c's post-commit `git rev-parse HEAD`, and Step 7's reads of `RUN-REPORT.md` and the
     pre-run snapshot. With these the count is about 75 [S·e];
   - `continue` resumes, freshness re-runs, and any extra reads the model makes.

   So 70 is a **lower bound** on the pinned or mandated calls. It is not the run's request count. For scale, the
   6.32.0 entry measured pre-routing loop runs at 11–426 requests, median about 200 `[H·m]`. It describes a different
   pipeline and is not a denominator here.

   The pinned lines run one per turn, since each branches on the previous exit code. Each is therefore one model
   request that re-sends the orchestrator's whole context: its prefix, the 43 KB command, and every tool result and
   stage-agent reply so far. Independent calls issued in one turn would share a request (the loop command says so of
   its two entry Reads).

2. **Fresh-context prefixes** [CH·m, S·m]. The number of stage agents spawned per run [S·m]:

   | run                             | stage agents                    |
   | ------------------------------- | ------------------------------- |
   | `/pharn-loop` full, 1 iteration | 5, plus 1 per further iteration |
   | `/pharn-ship` full              | 4                               |
   | `/pharn-loop --quick`           | 4                               |
   | `/pharn-ship --quick`           | 3                               |

   Each `general-purpose` first request cache-wrote a median of 91,759 tokens in CH1. For 5 agents that is about
   459k cache-write tokens [CH·e] (5 × 91,759). Where the shared part hits, add about 155k cache-read tokens [CH·e]
   (5 × the median hit 30,927; at most 157k, 5 × 31,428). This is before any stage work, and it is this repo's
   harness, not pharn-starter's.

3. **Repeated `test` executions** [S·m]. Per iteration, `test` runs:
   - inside the build agent, repeated until green, with its output in the agent's context;
   - at regress HEAD, as the outside-feature subset;
   - at regress BASE, unless reused;
   - at verify, the whole suite; it is never reused, because it is an AC level gate.

   Regress records `test` as `no-files`, and does not run it, when no test file lies outside the feature. So the floor
   is two runs per iteration (build and verify), and three or four when such a file exists.

   `typecheck`/`build` run at regress HEAD and BASE, and at verify when not reused. Real durations: unmeasured. No
   per-gate duration is recorded anywhere (`gate-process-duration`).

## 5. Root-cause analysis

- **Pinned orchestrator calls (mechanism confirmed, magnitude unknown).**
  - The mechanism: each pinned line is its own Bash call by design (`pharn-loop.md`: "Each fenced block runs as its
    own shell and carries no state into the next"). Each call returns to the model, which issues the next request with
    the full context.
  - The design reason: it pins every deterministic step as a separate, testable, exit-code-branched line. That serves
    the P5 membership branching and L44, since a multi-block procedure must not carry shell state.
  - What is not known: whether this is a material share of a real run. The rival explanation is that stage agents'
    own requests dwarf it.

  Real ledgers settle it. Each stored row names its context (`sidechain` + `agent_id`), and the run's own context is
  `membership.context`. That may be `main`, or `agent:<id>` when the run itself started inside an agent. So
  `audit.mjs` splits requests per stage into `orchestrator` (the run's own context) and `stage-agent` (any other
  admitted context) (REVIEW F6).

- **Fresh-context prefix (mechanism confirmed in this repo, composition unknown).**
  - The mechanism: stage-agent routing (6.27.0) gives each routed stage a new context, which is the only way to
    request a stage's configured model. In CH1 the first request is mostly cache write, and cache sharing across agents
    is partial (about 31k in 15 of 29).
  - The cause of the prefix size is **not** separated. Candidates are `CLAUDE.md` (larger in pharn-starter), the tool
    schemas and MCP instructions of the session, and the skills listing. CH1's 68k–130k spread across one week in one
    repo points at session configuration as much as at `CLAUDE.md` (L40).
- **Repeated `test` (mechanism confirmed, magnitude unknown).**
  - The build agent's own gate is `/pharn-build` Step 4, "the user's `test` / `lint`", fix within scope until green.
  - Regress HEAD runs an outside-feature subset. It is a different execution from verify's whole suite, so 6.34.0
    cannot reuse it.
  - Verify never reuses an AC level gate (`NON_REUSABLE_IDS`).

  Real suite duration, and how many fix-and-rerun cycles a build makes, are unknown.

- **Artifacts are not a demonstrated cause.**
  - The loop's rebuild reads only the reports' structured fix-list fields (brief rule 7).
  - `/pharn-build` reads `PLAN.md` only.
  - The closeout cites `GRILL.md`/`REGRESSION.md`/`VERIFY.md` by pointer.
  - Verdicts are read from JSON `.verdict` by checkers.

  No case was found of a large human-readable artifact re-read by a model where a structured subset would do. Artifact
  sizes in post-optimization runs are unmeasured (0 runs).

### Stage boundaries (what crosses, what is re-acquired, what the separation is for)

| boundary                      | crosses (on disk)                     | receiver re-acquires                                         | semantic role today                                                                               | risk if merged (quality effect: **unknown**, no comparative evidence)                                 |
| ----------------------------- | ------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| spec → plan                   | `SPEC.md` (pinned hash)               | prefix, constitution, command, SPEC, lessons, repo discovery | model routing; a plan written against a pinned, approved intent                                   | the planner inherits the spec writer's framing (anchoring); larger persistent context                 |
| plan → grill                  | `PLAN.md`, `AC-TESTS.md`              | the same + contracts                                         | **independent review**: the grill treats the PLAN as `trust: untrusted` (P2) and did not write it | loss of independence; confirmation bias; a trust boundary becomes self-review                         |
| grill → test                  | none the test reads from grill        | SPEC, PLAN, AC-TESTS                                         | tests written before, and apart from, the code (the red run proves each can fail)                 | tests shaped by the implementer's intent; weaker red-run meaning                                      |
| test → build                  | the lock, the pinned tests            | PLAN only + repo                                             | the builder cannot rewrite the tests (the pinned tests sit outside PLAN `## Files`)               | the builder sees the tests' authoring context; stale assumptions carried across                       |
| build iter N → build iter N+1 | reports' fix-list fields (structured) | everything, in a new agent                                   | a fresh context per fix attempt; failure data arrives as quoted DATA                              | resuming one agent keeps its earlier reasoning (anchoring on a failed approach) and grows its context |

Every boundary re-pays the fixed prefix (CH1) and re-discovers the repo. How many requests that re-acquisition costs
is not measured.

## 6. Candidate optimizations

Each candidate cites the section above that motivates it. **None rests on real evidence**, so every one is
_contingent on real-run confirmation_. The confirming measurement is named with each.

### C1 — Fold each routed stage's four pinned lines into two (structural, low semantic risk)

- **Evidence.** §4.1: each routed stage costs the orchestrator 4 pinned lines + 1 Agent call [S·m]. A one-iteration
  loop has 5 routed stages, so 20 of its 70 counted calls are this ceremony [S·e].
- **Mechanism.** Pair `route` with its stage-start marker, and `read` with the return marker, as one tested CLI call
  each. Stage boundaries, markers, routes and exit mapping all stay as they are.
- **Expected benefit.**
  - Requests: −10 per one-iteration loop (5 × 2), −2 per further iteration [S·e].
  - Tokens: each removed request's full read of the orchestrator's context, mostly as cache read. That context's size
    in a post-optimization run is not measured. Its PHARN-owned floor is the 43,164 B command (about 10.8k tokens at
    4 B per token [S·e], no class). Output savings are small.
  - Wall-clock: one model round trip per removed call (unmeasured).
- **Quality / correctness risk.**
  - The marker timing must stay exactly where attribution and `executions` need it: start before the Agent call,
    return after `read`.
  - Two exit codes merge into one call, so route exit 3 (inline) versus a marker refusal must stay distinguishable.
  - The hygiene pins (`STAGE_AGENT_WIRING`, `PHASE_MARKER_WIRING`) move.
- **Scope.** Medium: `stage-agent.mjs`/`mark-phase.mjs` (or a small wrapper), `pharn-loop.md`, `pharn-ship.md`, the
  hygiene tests.
- **Reversibility.** High; it is one revert, since the ledger format is unchanged.
- **Validation.** On one fixed task and base, run current vs candidate sequentially. Compare:
  - `orchestrator`-role requests per stage (`by_stage_role`);
  - identical `executions` rows (same stages, same run numbering);
  - identical verdicts.
- **Confirm first.** In real ledgers, `orchestrator`-role requests (the run's own context, not "the main thread") are
  at least 20% of a run's requests. That threshold is pre-registered here.

### C2 — A closeout script for the green path (structural, low–medium semantic risk)

- **Evidence.** §4.1: the loop's green close runs 16 pinned blocks [S·m]. Two of them must precede the model's
  `LOOP.md` Write: the one block holding the `LOOP.md` scope set and its amend, and Step 6b's `git rev-parse HEAD`
  commit capture. The other 14 are a deterministic tail. The named follow-up `ship-closeout-script` already exists.
- **Mechanism.** After the model writes `LOOP.md`, one tested script runs the ordered tail:
  - the record checks;
  - the run-stop marker;
  - the ledger render and check, and the run report;
  - the commit-gate freshness check;
  - the scope and amend steps;
  - the stage list, branch, add and commit;
  - the releases.

  It returns one closed outcome (`committed` or `not committed: <reason>`).

- **Expected benefit.** Requests: 14 − k, where k (1–4) is the number of calls a design keeps separate. That is
  **−10 to −13** per run [S·e], at the orchestrator's largest context, the end of the run. Tokens: the same
  per-request logic as C1.
- **Risk.**
  - The ordering is load-bearing: the ledger is emitted before the attestation (ship), and the decision is
    re-derived before the commit.
  - Every `not committed:` path must keep its own outcome.
  - A script that commits is a larger blast radius than a line that commits.
- **Scope.** Medium: a new floor script + tests, the two close parts, the hygiene pins.
- **Reversibility.** High.
- **Validation.** On green, cap and blocked fixtures, compare the same commit, record, ledger and exit outcomes with
  fewer `orchestrator`-role requests.
- **Confirm first.** As for C1.

### C3 — Run the regress/verify stage scripts from the orchestrator directly (structural if the mechanism holds)

- **Evidence.** §4.1: each inline stage costs 6 orchestrator calls per iteration, 2 of which (the slug Write and the
  `feature-name.mjs` line) only re-derive a `<name>` the orchestrator already holds [S·m]. The loop already owns the
  stage-exit mapping (`pharn-loop.md` Step 2). **If** each invocation loads the command body, 37,777 B of thin-caller
  text [S·m] also enters the orchestrator's context per iteration.
- **Mechanism.** Pin `stage-regress.mjs` / `stage-verify.mjs` and their scope lines in the orchestrator, with
  `--feature '<name>'`, instead of invoking the commands.
- **Expected benefit.** −6 calls per iteration (2 invocations, 2 slug Writes, 2 `feature-name.mjs` lines) [S·e].
  Also up to about 9.4k tokens [S·e] (37,777 B at 4 B per token, no class) of carried text per iteration, which is **unknown until the invocation form is seen
  in a transcript**.
- **Risk.**
  - A second copy of each pinned line (L35), which needs a parity pin.
  - The thin callers' per-exit guidance (question relay, crash and timeout handling) must be carried or cited.
- **Scope.** Small–medium.
- **Reversibility.** High.
- **Validation.** Count `orchestrator`-role requests and cache-read per iteration, before and after.
- **Confirm first.** The tool-use names in a real orchestrator transcript.

### C4 — Bound the build agent's own gate output (EXPERIMENTAL: changes what BUILD sees)

- **Evidence.** §4.3/§5: the build agent runs the project's `test`/`lint` itself, repeatedly, with its output entering
  its context [S·m]. The volume is unknown.
- **Mechanism.** Run the build's gate through the runner (logs to files). The agent then sees an exit code and the
  failing test ids and titles (the per-test results record), and opens a log only on demand.
- **Expected benefit.** Tokens: unknown (it scales with the project's reporter verbosity and the fix-and-rerun count).
  Wall-clock: none by itself.
- **Risk.** The builder loses diagnostic detail it may need, so iterations may rise. This is exactly the risk class
  the prompt names.
- **Scope.** Medium.
- **Reversibility.** High.
- **Validation.** The counterfactual E1 below.

### C5 — Resume the build agent across loop iterations (EXPERIMENTAL: independence and context)

- **Evidence.** §4.2: each iteration spawns a fresh build agent, which pays the prefix (CH1) and rediscovers the repo.
- **Mechanism.** Iteration N+1 continues iteration N's agent, with the fix-list delivered as DATA.
- **Expected benefit.** One fewer first-request cache write per further iteration (CH1 median 91,759 tokens), plus the
  rediscovery requests. Unknown.
- **Risk.** Anchoring on a failed approach; a larger persistent context; fix-list DATA arriving in a context that
  "believes" it finished; a trust channel via the agent's own earlier output.
- **Scope.** Medium–large. The Agent tool's resume semantics are harness behaviour.
- **Reversibility.** High.
- **Validation.** E1 below.

### C6 — Model or effort per stage (EXPERIMENTAL; no candidate yet)

No stage's share is measured, so no stage is nominated (the prompt: never from a stage's name). Effort is not routed
at all today: stage agents inherit the parent's effort. So an effort experiment first needs effort routing
(`stage-agent-effort`, a named residual). When real ledgers exist, a stage becomes a candidate only if it holds a
material share of requests or output. Its experiment is E1 with the model or effort as the one varied factor. The
quality dimensions at risk are the stage's own:

- plan/grill: findings a later external review surfaces;
- build: iterations and verify `FAIL`s;
- test: red-run validity.

### Counterfactual experiment E1 (required before adopting C4, C5 or any C6)

- **Design.** Choose 6 comparable pharn-starter tasks before running anything: 3 small fixes and 3 medium features,
  sized by the PLAN `## Files` count of a dry plan. Run each task under A (current) and B (candidate), from the same
  base commit, in separate worktrees, **sequentially** (one run at a time, so no two share a measurement window). Keep
  the models and the config identical except for the one varied factor, and randomize A/B order per task.
- **Outcomes per pair:**
  - completion (`STOP_GREEN`) and iterations;
  - verify/regress verdicts and AC gate results;
  - blocking findings from one fixed external review (`/pharn-review` with a fixed lens set, or the human) on the
    final diff;
  - tokens by class (`cost.json`) and elapsed (`executions`).
- **Reading.** Report the per-task pairs. Six pairs support "no visible regression" at most, never "non-inferior".
  Adoption needs the human's call on those pairs.

## 7. Recommended next increments

The evidence supports **one prerequisite and two implementation increments**, in this order. It does not support a
fourth.

1. **Prerequisite (no code): produce post-optimization evidence.**
   - Run `pharn update` in pharn-starter with `@pharn-dev/pharn` ≥ 0.7.0. The CLI version is not optional: an older
     CLI leaves the `models` block unmigrated, so every stage runs `inline:config-red` and routing is off (§2).
   - Then run the normal workload.
   - After at least 5 full runs, and ideally some quick ones, run `audit.mjs --ledgers` over them. That fills sections
     3–4 with real, denominated numbers, including `by_stage_role` (orchestrator versus stage agents per stage),
     `executions` and `work`.
   - This is the only step that answers the success criterion's first two questions.
2. **C1 — the routed-stage pinned-line fold.** It is the smallest, most mechanical and most reversible change, and it
   preserves every boundary and verdict. Adopt it only if item 1 confirms that `orchestrator`-role requests are at
   least 20% of run requests. Otherwise stop here.
3. **C2 — the green-path closeout script.** It has the same confirmation gate. It is the named follow-up
   `ship-closeout-script`, extended to the loop.

C3 waits on the one transcript observation it needs (section 9, gap 3). C4–C6 are experiments, gated on E1.

## 8. Do not optimize yet

| idea                                                                  | why it waits                                                                                                                                                          |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| trim the stage command texts further                                  | there is no measured share: no post-optimization run has measured a stage agent's requests. 6.28.2 and 6.32.0 already cut these texts. Insufficient evidence          |
| cross-run BASE cache (roadmap 4.2)                                    | there are no real install or base-gate durations. `work[].base.install.ms` now records them, so wait for it. How often 6.33.0 reuse hits in real runs is also unknown |
| reuse `test` between regress and verify                               | these are different executions (a subset versus the whole suite), and `test` is an AC level gate the AC gate must observe. There is no real duration                  |
| run regress and verify in parallel, or the BASE side during the build | verify's reuse needs regress's final offer, and `reconcile` must run last. The BASE requirement includes the build's partition. Real stage durations: unmeasured      |
| merge stages (plan+grill, spec+plan, test+build)                      | the quality effect is unknown, and it removes independence and trust boundaries (§5). It needs E1                                                                     |
| cheaper model or lower effort for any stage                           | no stage's share is measured, and effort is not even routed yet                                                                                                       |
| a state capsule or handoff summary between stages                     | re-acquisition cost is unmeasured, and it changes what each agent sees (experimental)                                                                                 |
| slim `SPEC.md`/`PLAN.md`/reports                                      | no evidence that a model re-reads a large artifact where a structured subset would do (§5). Sizes are unmeasured                                                      |
| act on the 6.35.0 DEMO's numbers                                      | its tokens are synthetic                                                                                                                                              |
| act on the 69 pre-optimization ledgers                                | they describe a pipeline that no longer exists (no test stage, no routing, prose regress/verify), and their `run-window/1` membership is not run-scoped (L24)         |

## 9. Measurement gaps

| gap                                                                                        | why it matters                                                                       | smallest improvement                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. no post-optimization real run                                                           | blocks every model-usage and elapsed conclusion                                      | the section-7 prerequisite. No code                                                                                                                                                                                                         |
| 2. the prefix composition of a fresh agent in the target project                           | decides whether C5-style consolidation could matter, and how much `CLAUDE.md` weighs | a controlled probe: spawn a one-line `general-purpose` subagent in pharn-starter, then again with a trimmed `CLAUDE.md` in a scratch copy, and read both first requests with `audit.mjs --prefix`. Analysis-only                            |
| 3. how the orchestrator invokes an inline stage (slash-command body per call, or one Read) | decides part of C3's value                                                           | read the tool-use names in one real 6.35.0 orchestrator transcript. Analysis-only                                                                                                                                                           |
| 4. per-gate durations                                                                      | ranks the deterministic work; decides BASE caching and `test` reuse                  | the runner times each gate process into its stamp (`gate-process-duration`, a named residual). A measurement-only runtime change, when the first real `work[]` rows show regress or verify elapsed is material                              |
| 5. tool-result volume per request                                                          | the prompt's §12 (full test output in BUILD's context)                               | cost.json carries token classes per request, not what produced them. A transcript is perishable, so an analysis-only transcript pass soon after a run, attributing each cache-write jump to the preceding tool result, is the smallest step |
| 6. the orchestrator's own prefix and per-request context                                   | sizes C1–C3's per-request saving                                                     | the same `--prefix` read over the orchestrator's transcript (its first request) in a real run, plus the stored `requests[]` rows of its context                                                                                             |
| 7. served effort                                                                           | effort experiments cannot be read                                                    | none available: the platform does not report it                                                                                                                                                                                             |
| 8. the rule's own gaps (G1–G3)                                                             | the first real pass must be decidable                                                | the human sizes the sample above 20, names a membership-absent reason, and states who declares a fixture. Then the rule is frozen again before that pass                                                                                    |

## What this audit may claim (P0)

- **Floor.** Nothing this audit concludes is a floor guarantee. The one floor fact near it is `check-cost-ledger.mjs`'s
  GREEN on each ledger, which is internal consistency, never accuracy (L43). The build's own guard facts are the
  dev chain's (writes-scope hook, `reconcile`), not this report's.
- **Measured.**
  - byte counts, pinned-block counts, route tokens, and the ledgers' enum and version fields;
  - CH1's first-request usage per class as the transcripts record it;
  - CF1/CF2 as their files record them.
- **Advisory.**
  - Every estimate: 70 calls (a lower bound; about 75), 57, 23 per iteration, about 459k, about 155k, −10, −10 to
    −13, −6, about 9.4k, about 10.8k.
  - Every candidate's expected benefit and risk.
  - Every root-cause statement.
  - The mapping from static structure to cost.
- **Struck.**
  - "X is the most expensive stage";
  - "most orchestrator requests are ceremony" (only the PINNED calls are counted);
  - "C1 saves N% of a run";
  - "merging stages does not hurt quality".

  None of these has evidence.
