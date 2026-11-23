# PLAN — core-298-gate-timeout: `/pharn-build`'s gate and the standalone `/pharn-regress` / `/pharn-verify` honour `gates.timeoutMs`

- spec_content_hash: f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d
- applied_lessons: [L33, L35, L41, L50, L62, L75, L84]
- increment: 7.22.1 (PATCH, Linear CORE-298) — `build-gate.mjs`, `stage-regress.mjs` and `stage-verify.mjs` resolve
  their per-gate timeout through `gate-timeout-core.mjs` `resolveRunTimeout` over the project's `pharn.config.json`,
  as the two detached runners already do, so a declared `gates.timeoutMs` reaches `/pharn-build`'s gate and the
  standalone `/pharn-regress` / `/pharn-verify`. No pinned command line changes; with no declaration every argv,
  record and output is byte-identical.
- layer(s): product floor (three CLIs, one registry, two header comments), pharn-contracts (`gate-run-record.md`,
  `stage-exit.md`), product commands (`pharn-build.md`, `pharn-regress.md`, `pharn-verify.md`), user doc
  (`docs/pipeline.md`), dev guide, floor tests
- constitution_refs: [P0, P2, P3, P4, P5, P7]

## Applied lessons

- L33 — "the key does not reach these callers" is a claim that expires the moment this lands; the sweep below is
  anchored on short invariant substrings (`timeoutMs`, `pinned`, `every other caller`, `two runners`, `does not reach`)
  over the product surface, the docs and the guides, not on the one sentence the ticket quoted.
- L35 — 540000 keeps its ONE home, the pinned command lines; no CLI gains a default. The three CLIs call the existing
  `resolveRunTimeout` (the one rule) instead of re-deriving it, and the module's header stops saying "both detached
  runners" without adding a second copy of the rule anywhere.
- L41 — every existing test passes an explicit `--timeout-ms` and no `pharn.config.json`, so the new path is reached by
  nothing today; each CLI gets a test WITH a declaration (and the no-declaration control stays the existing suite).
- L50 — the referent that changes is "the set of callers that apply `gates.timeoutMs`"; the sweep enumerates every cite
  of that set (the contract's "Where it applies", the core's and `gate-exclusion-core.mjs`'s headers, `stage-exit.md`,
  the guide, `docs/pipeline.md`), not only the ticket's sentence.
- L62 — the refusal reason for a declaration below the pinned value is `effectiveTimeoutMs`'s own string, which quotes
  the value through quote-core's total `shown()`; no new quoting is written.
- L75 — the sweep below lists each phrase with every hit (`path:line`) and one disposition per hit.
- L84 — the feature's only effect is a branch off a safe default (no declaration → the pinned value), so each CLI gets a
  test that takes the branch on realistic input: a gate that sleeps past the pinned `--timeout-ms` but inside the
  declared value passes with the declaration and is killed (red / timed out) without it.

## The failure (P7)

CORE-298 (from the 2026-11-22 review, epic CORE-294). CORE-77 (#447, 7.17.0 — the CHANGELOG `[7.16.0]` section
introduced the key) let a project with a slow suite declare `gates.timeoutMs`, but only `entry-gates.mjs` and
`stage-direct.mjs` apply it. `.claude/commands/pharn-build.md:243-244` pins `build-gate.mjs … --timeout-ms 540000
--budget-ms 570000`, and `build-gate-core.mjs` `decide(stamp)` is green only if every run exits 0, so for a suite that
needs more than 540 s every build iteration runs the full gate for 9 minutes, is killed, and records `gate:fail`;
`pharn-loop.md` treats that as continue, so 9 minutes are wasted every iteration. The standalone `/pharn-regress` and
`/pharn-verify` (`pharn-regress.md:112`, `pharn-verify.md:107`) report the suite as unmeasured. The underlying
measurement is the one CORE-87 cited (`.dev/measurements/loop-baseline-2026-11-11.md` §7/§12).

## Discovery (read this run, worktree at `476882bc`, SKILLS_VERSION 7.22.0)

1. `pharn/floor/gate-timeout-core.mjs` `resolveRunTimeout(block, pinnedMs)`: a block that refuses or declares nothing →
   `{ok, value: pinnedMs}` untouched; a declaration → `effectiveTimeoutMs`, which refuses a value below the pinned one
   (reason names `pharn.config.json` `gates.timeoutMs` and the remedy). Header lines 27-29 state the key does not reach
   the in-Bash callers; line 83 "the ONE resolution rule both detached runners apply".
2. `entry-gates.mjs:521` and `stage-direct.mjs:1011` both call `resolveRunTimeout(loadGateExclusion(root), pinned)`.
   `stage-direct.mjs` rewrites only the fresh argv's `--timeout-ms` (`withTimeout`), keeping `--budget-ms 570000`, so a
   detached stage script already runs with timeout > budget; `mayStartSlowStep` (`stage-exit-core.mjs:552`) then lets
   only each invocation's first slow step start. Neither stage script refuses budget ≤ timeout.
3. `build-gate.mjs:231-237`: `parseTimeoutMs`, `parseBudgetMs`, then `usage-error: --budget-ms must exceed
--timeout-ms`. Its CONTINUE (exit 5) re-runs the SAME pinned line, not a `--resume`.
4. `stage-regress.mjs` `parseRestOfArgv` (`:327-390`) and `stage-verify.mjs` `parseRestOfArgv` (`:247-260`) take
   `--timeout-ms` into the progress record (`timeoutMs`); `--resume` reads it from there and overrides only
   `budgetMs` (`--resume --budget-ms 570000`). Both run after the stale-output removal, so an argv refusal there leaves
   no earlier report.
5. The stage scripts' closed `unusable` vocabularies (`stage-exit-core.mjs` REGISTRY, pinned by
   `stage-exit-core.test.mjs`, listed in `stage-exit.md`) hold no code for a bad timeout declaration; entry's is
   `bad-gate-timeout` (`entry-gates.mjs:527`), stage-direct's `timeout-unusable`.
6. `pharn/pharn-contracts/gate-run-record.md:318-330` "Where it applies … Every other caller keeps its pinned value";
   `stage-exit.md:266-274` the 600 s tie; `stage-exit.md:299-` "A Bash-tool timeout is not a kill" — the harness
   moves a call that reaches the tool's timeout to the background and reports its exit later.
7. `/pharn-test`'s red run (`pharn-test.md:244`) calls `run-gates.mjs run --next … --timeout-ms 540000` directly from
   command prose; the runner takes only the flag by design (`gate-run-record.md:498-500`, L41), and the red run runs
   the AC tests only (`init --stage ac-test … --ac-tests`), never the whole suite.

## Approach (the decision the ticket left to plan time)

**Resolve inside the floor CLIs, unconditionally, with no new flag.** Each of the three CLIs, right after its existing
`parseTimeoutMs`, calls `resolveRunTimeout(loadGateExclusion("."), timeout.value)` and uses the result as its per-gate
timeout. Why this over a flag or prose:

- **No command line changes.** The pinned lines (and `/pharn-loop`'s permission allowlist entries for them) stay byte
  for byte; a flag would change both, and prose arithmetic would be model work (P5).
- **Idempotent under the detached runner.** `stage-direct.mjs` already hands the stage scripts the resolved value; the
  script resolves it again to the same value (a declaration equal to the pinned value is accepted), so the loop and
  ship paths are unchanged. `stage-direct.mjs` keeps its own resolution, because it needs the value for its run pin and
  `runner.json` before the script starts.
- **No declaration → byte-identical.** `resolveRunTimeout` returns the pinned value untouched; a `gates` block that
  refuses also returns it, and the runner's `init` refuses the block as before.

Per CLI:

- **`build-gate.mjs`** (both modes): the effective timeout replaces `timeout.value` everywhere (the budget tracker and
  the drain). The budget is raised by the same amount, `budget + (effective − pinned)` when `--budget-ms` is given,
  so the slack the pinned line chose (30 s) is kept and the line's own `budget > timeout` check, still made on the argv
  values, never refuses a declared run. A declaration below the pinned value → `UNUSABLE — bad-gate-timeout: <reason>`
  (exit 2). The targeted mode takes it too: the resolution sits before the mode split, and a branch to exclude it would
  be code with no failure behind it (P7).
- **`stage-regress.mjs` / `stage-verify.mjs`** (fresh invocations only; `--resume` reads the record): the effective
  timeout goes into the progress record, so regress uses it on both sides and for the base install exactly as the
  detached path does. The budget is NOT raised: that is what the detached path does, and a raise would be undone by
  the pinned `--resume --budget-ms 570000` anyway. A declaration below the pinned value → `unusable
bad-gate-timeout`, a new member of both stages' closed `unusable` sets (entry's name for the same refusal).
- **`/pharn-test`'s red run stays pinned (stated decision).** It runs only the AC tests, it calls the generic runner
  directly, and honouring the key there would mean either the runner reading project config (a contract change to a
  runner that "takes only the flag") or prose the model computes. No failure has been recorded there (P7).

**Commands.** No pinned line changes. `pharn-build.md` Step 4, `pharn-regress.md` and `pharn-verify.md` each gain one
sentence: with a declared `gates.timeoutMs` above the Bash timeout the call can outlast it; the harness then moves it
to the background (`stage-exit.md`, "A Bash-tool timeout is not a kill") — wait for its completion notice and branch on
the exit it reports; never run the line (or `--resume`) again while it runs. `pharn-regress.md`'s "The Bash-tool
timeout must exceed `--timeout-ms`" bullet is corrected to say the same.

## Files

- `pharn/floor/build-gate.mjs` — resolve the timeout, raise the budget by the difference, refuse `bad-gate-timeout`;
  header
- `pharn/floor/build-gate.test.mjs` — a declared value lets a gate run past the pinned timeout (and its no-declaration
  control is killed); a below-pinned declaration is UNUSABLE; the raised budget runs two quick gates in one invocation
- `pharn/floor/stage-regress.mjs` — resolve the timeout in `parseRestOfArgv`, refuse `bad-gate-timeout`; header
- `pharn/floor/stage-regress.test.mjs` — the declared value reaches the progress record and the gate runs; a
  below-pinned declaration is `unusable bad-gate-timeout`
- `pharn/floor/stage-verify.mjs` — the same as regress
- `pharn/floor/stage-verify.test.mjs` — the same as regress
- `pharn/floor/stage-exit-core.mjs` — `bad-gate-timeout` in the regress and verify `unusable` sets
- `pharn/floor/stage-exit-core.test.mjs` — the two closed sets and the verify count updated
- `pharn/floor/gate-timeout-core.mjs` — header: where the rule applies now; what still keeps the pinned value
- `pharn/floor/gate-exclusion-core.mjs` — header lines 22-23 ("only the two detached runners APPLY it")
- `pharn/pharn-contracts/gate-run-record.md` — "Where it applies", "What it proves"
- `pharn/pharn-contracts/stage-exit.md` — the two `unusable` lists, the budget/600 s paragraph
- `.claude/commands/pharn-build.md` — Step 4: the outlasting-call sentence
- `.claude/commands/pharn-regress.md` — Step 1 sentence; the Bash-timeout bullet; `bad-gate-timeout` under exit 2
- `.claude/commands/pharn-verify.md` — Step 1 sentence; `bad-gate-timeout` under exit 2
- `docs/pipeline.md` — "Lengthening the per-gate timeout": where it applies
- `.dev/guides/floor-gates.md` — gate exclusion, `stage-regress.mjs`, `stage-verify.mjs`, `build-gate.mjs` sections
- `CHANGELOG.md` — `[7.22.1]` entry (moves the `[Unreleased]` entries into it)
- `SKILLS_VERSION` — 7.22.1
- `README.md` — badge 7.22.1
- `pharn-install.json` — regenerated by `npm run docs:generate` (the version, and any installed file's entry)

### Not written

- `.claude/commands/pharn-test.md` and `run-gates.mjs` — the red run stays pinned (Approach).
- `pharn/floor/stage-direct.mjs` / `entry-gates.mjs` — unchanged; they already resolve.
- `.claude/commands/pharn-loop.md`, `pharn-ship-stages.md` — no pinned line or allowlist entry changes.
- The four trusted docs — none states where the key applies (swept: `pharn/LIMITS.md`, `pharn/ARCHITECTURE.md`,
  `pharn/THREAT-MODEL.md`, `pharn/CONSTITUTION.md` hold no `timeoutMs`). No protected file is needed.

## Sweep (L33, L50, L75) — phrase → every hit → disposition

Phrases over `pharn/ .claude/ docs/ README.md CLAUDE.md CONTRIBUTING.md .dev/guides/` (tests and `pharn/features/`
excluded): `timeoutMs` (config key sites), `keep(s) its/their pinned`, `every other caller`, `both/two (detached)
runners`, `only (in) the two`, `does not reach the gate`.

- `pharn/floor/gate-timeout-core.mjs:9-11` (only the two detached runners may honour it) — edited.
- `pharn/floor/gate-timeout-core.mjs:27-29` (does not reach … keep their pinned 540000) — edited: names the red run
  as the remaining pinned caller.
- `pharn/floor/gate-timeout-core.mjs:83` (the ONE resolution rule both detached runners apply) — edited.
- `pharn/floor/gate-exclusion-core.mjs:22-23` (only the two detached runners APPLY it) — edited.
- `pharn/pharn-contracts/gate-run-record.md:318` (Only in the two runners that do not run their gates inside a Bash
  call) — edited.
- `pharn/pharn-contracts/gate-run-record.md:327-330` (Every other caller keeps its pinned value) — edited.
- `pharn/pharn-contracts/gate-run-record.md:342` (That both runners apply the resolved value is tested runner
  behaviour) — edited (five callers).
- `pharn/pharn-contracts/gate-run-record.md:500` (the entry and stage runners pass a project's declared value; the
  runner takes only the flag) — still true for `run-gates.mjs`; edited to name the three CLIs too.
- `pharn/pharn-contracts/stage-exit.md:266-274` (the 600 s tie; the detached runners carry the declared value) —
  edited: a thin caller's invocation can now outlast the call too.
- `pharn/floor/entry-gates.mjs:25-34,48`, `pharn/floor/stage-direct.mjs:107-124,147-148,1003`,
  `pharn/floor/entry-gates-core.mjs:135`, `pharn/floor/stage-direct-core.mjs:177,234` — still true (they describe
  their own resolution); unchanged.
- `.dev/guides/floor-gates.md:108-113` (Only the two detached runners apply it) — edited.
- `.dev/guides/floor-gates.md:739` (entry `--start` uses it) — still true; unchanged.
- `.dev/guides/floor-orchestration.md:590-591` (stage-direct resolves it) — still true; unchanged.
- `docs/pipeline.md:131` (the same per-gate limit … or the longer `gates.timeoutMs`) — still true; unchanged.
- `docs/pipeline.md:240-243` ("Where it applies" … does not apply … `/pharn-regress` and `/pharn-verify` run by hand,
  `/pharn-build`'s full gate … keep 540 s) — edited.
- `README.md:150`, `.claude/commands/pharn-loop.md:949`, `.claude/commands/pharn-ship-stages.md:325`,
  `.claude/commands/pharn-loop-close.md:83` (a slow gate can get a longer timeout) — still true; unchanged.
- `pharn/floor/stage-regress.mjs:965` (pinned 540000/570000 budget arithmetic comment) — read at build; edited only if
  it claims the pinned value is the only one.
- `.claude/commands/pharn-regress.md:320` (The Bash-tool timeout must exceed `--timeout-ms` (540000 < 600000)) —
  edited.

## Contracts satisfied

- `gate-run-record.md` "A longer per-gate timeout" — the value rule is unchanged and still owned by
  `gate-timeout-core.mjs` (cited); only the set of callers that apply it grows.
- `stage-exit.md` — exit codes unchanged; one new `unusable` member per stage, registered in the closed sets
  (`validateStageExit`), so no unregistered code can be emitted.

## Evals to write (P1)

No capability is added or changed (no `role:` file), so no eval pair. Tests (hermetic fixtures):

- build-gate: config `{"gates":{"timeoutMs":3000}}`, line `--timeout-ms 300 --budget-ms 600`, one gate sleeping 1 s →
  exit 0; the same without the config → exit 3 (killed at 300 ms).
- build-gate: config `timeoutMs: 200` under `--timeout-ms 300` → exit 2, `bad-gate-timeout`, nothing run.
- build-gate: config `timeoutMs: 5000`, `--timeout-ms 1000 --budget-ms 1500`, two quick gates → exit 0 in one
  invocation: the raised budget (1500 + 4000) lets the second start, where an unraised 1500 under a 5000 timeout
  would exit 5 after the first (and the line's own `budget > timeout` check would refuse if made on the resolved
  values) — so the test fails on either wrong implementation.
- stage-regress / stage-verify: config `timeoutMs` above the line's value → the progress record's `timeoutMs` is the
  declared value and a gate sleeping past the line's value is measured; below it → exit 2 `unusable
bad-gate-timeout`, and no report on disk.
- stage-exit-core: the closed sets with `bad-gate-timeout`.

## Guarantee audit (P0)

- "with a declaration, these three CLIs kill a gate at the declared value, not the pinned one" → tested runner
  behaviour (the value reaches `run-gates.mjs --timeout-ms`); the kill itself is the runner's existing timer. Not a new
  floor primitive.
- "a declaration outside 100..1800000 or below the pinned value is refused" → floor: enum-regex (integer range,
  `gate-timeout-core.mjs`, unchanged).
- "`bad-gate-timeout` is a registered code" → floor: enum (`validateStageExit` over the closed REGISTRY).
- "no declaration → byte-identical argv, records and output" → tested (existing suite, unchanged expectations) +
  `resolveRunTimeout`'s untouched pass-through; advisory beyond the tests.
- "the call waits for the background notice instead of re-running" → advisory (command prose, a harness behaviour).
- The value's provenance stays unproven (L43): it is agent-editable project input, as before.

## Trust audit (P2)

- `pharn.config.json` `gates.timeoutMs` → untrusted DATA, read through the existing block reader, used only as an
  integer after the range test; a refusal quotes it via `shown()` (L62). It reaches nothing but the timeout and the
  build gate's budget arithmetic.

## Determinism audit (P5)

- The branch is `resolveRunTimeout`'s: declaration absent/refused → pinned; in range and ≥ pinned → declared; else →
  refuse. Membership and integer comparisons only.

## Open questions (HALT)

- None blocking. Decisions for GATE 1: (a) resolve inside the CLIs with no flag; (b) build gate raises the budget by
  the difference, stage scripts do not; (c) targeted build gate takes it, `/pharn-test`'s red run stays pinned;
  (d) new `unusable` code `bad-gate-timeout` in both stage vocabularies rather than reusing `usage-error`.
