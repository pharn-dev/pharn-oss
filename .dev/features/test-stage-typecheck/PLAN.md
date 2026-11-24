# PLAN — test-stage-typecheck (CORE-347: a pinned AC test that fails typecheck is caught only after the build)

- spec_content_hash: f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d
- applied_lessons: [L11, L19, L29, L34, L35, L41, L45, L62, L83]
- increment: `/pharn-test` runs the project's typecheck gate(s) after it writes the AC tests and before it pins them, and refuses `ac-tests-typecheck` when a type error is located in a mapped AC test file and its code is not one of a closed set of missing-target codes (a target the build has not written yet) — so the test stage, which may still edit those files, sees the error instead of the post-build regress/verify, which may not.
- layer(s): product floor (`pharn/floor/`), product command (`.claude/commands/pharn-test.md`, `pharn-loop.md` grant lines only), dev apparatus (`.dev/floor/` budgets, `.dev/guides/floor-ac-tests.md`), generated (`README.md` region, `pharn-install.json`), repo-meta (`SKILLS_VERSION`, `CHANGELOG.md`)
- constitution_refs: [P0, P2, P3, P5, P6, P7]

## Applied lessons

- L83 — the refusal that fires today is post-build typecheck (regress/verify `typecheck` red over a pinned file the build may not touch); the earliest stage that pins the input it judges is `/pharn-test` Step 4, so the check runs there, before the pin, through the project's own typecheck script (the owner of the rule), never a copy of its rule.
- L11 — a whole-project typecheck can be red for reasons outside the AC tests (and is legitimately red-first when a test imports a target the build has not written), so the verdict is never "is typecheck red": only an error LOCATED in a mapped AC test file can refuse; everything else is a printed NOTE.
- L19 — the fix is the model editing its own mapped test files with Write/Edit; the checker only runs the project's typecheck script and never a writing form.
- L29 — the exempt set (MISSING_TARGET_CODES) is one frozen enumeration in `ac-types-core.mjs`, with one test per member proving it is exempt, plus the measured non-member (TS2741) proving it refuses.
- L34 — no typecheck gate discovered → an explicit printed `GREEN — no typecheck gate …` line and a test, never a silent pass over zero gates; a red gate with zero parseable lines is a printed NOTE, never GREEN-by-silence.
- L35 — the gate runner (`run-gates.mjs spawnGate`), "measured" (`ac-style-core.mjs measured` over `gate-run-core.mjs NOT_STARTED_EXITS`), discovery (`discoverGates`), the exclusion (`loadGateExclusion`) and the mapping reader (`acRowsOf`) are imported, not re-implemented.
- L41 — `--timeout-ms` is REQUIRED with no default; the pinned value (170000, two gates fit Bash's 600000 maximum) is the one the ★ WIRING test executes.
- L45 — a ★ WIRING test executes the committed `/pharn-test` line from the command file, so the CLI and its invocation cannot drift.
- L62 — every value quoted into a RED/NOTE line (paths, codes, gate ids) goes through `quote-core.mjs shown()`.

## The defect (verified live this run, P6)

CORE-311 run 2 (pharn-app, 7.22.0): `/pharn-test` pinned `…/profile-todo-cleanup-existing-tests.test.ts`; vitest does
not type-check, so the red run and the lock passed. After the build, regress and verify reported `typecheck` red:
`(69,9) TS2741 Property 'NODE_ENV' is missing in type '{}'` in that pinned file. The build cannot edit it (outside
PLAN.md `## Files`, pinned by the lock), so every iteration fails the same way until the cap. Live:
`.claude/commands/pharn-test.md` runs the style gates before the pin (Step 2c/3b, `check-ac-style.mjs`) but nothing runs
`typecheck`/`type-check` before Step 4.

Measured this run on real `tsc` 6.0.3 (pharn-app's binary, a scratch project): an in-body `await import()` of a missing
module is `TS2307`; a missing export destructured from an existing module is `TS2339`; an extra argument to an
existing function is `TS2554`; `const env: Env = {}` is `TS2741` (the CORE-311 shape). Non-pretty output (what a piped
`npm run` produces) is `path(l,c): error TSnnnn: msg`; `--pretty` is `path:l:c - error TSnnnn: msg` with ANSI colours,
and its related-information lines are indented (so they do not match a line-start rule).

## Design

New floor CLI `pharn/floor/check-ac-types.mjs` (execution: spawning, logs, reading the logs) and its pure rules
`pharn/floor/ac-types-core.mjs` (gate set, line parser, verdict, printed lines) — the `check-ac-style` split (P3).

`node pharn/floor/check-ac-types.mjs <name> --timeout-ms <N>` — ONE run (no before/after: attribution is by error
location in a file this stage owns, not by a flip):

1. Inputs: AC-TESTS.md mapping → the mapped test files (`acRowsOf`); `package.json` scripts; `gates.exclude`.
2. Gate set = `TYPE_SET` (`typecheck`, `type-check`; pinned ⊂ `gate-run-core.mjs ALLOWLIST` by a test) ∩ scripts −
   exclude, each run as `npm run <id>` via `spawnGate`, logs to `pharn/.run/pharn-test/types/<id>.out|.err`
   (directory recreated, containment-walked). No `CI=1`, no results env.
3. Per gate: exit 0 → nothing. Not measured (timed out / 126 / 127) → NOTE. Measured non-zero → read both logs, strip
   ANSI escapes, and match each line against the two anchored tsc forms. A matched path (relative to the invoking
   directory, or absolute) is resolved and compared case-folded with the resolved mapped files.
   - located in a mapped file, code ∉ `MISSING_TARGET_CODES` → RED `ac-tests-typecheck` (one line per error, capped at
     20 printed plus a count);
   - located in a mapped file, code ∈ the set → NOTE: not refused, the build must make it go away, /pharn-verify
     measures typecheck again;
   - anywhere else, or no line in tsc's format → NOTE "not attributed to the AC tests", naming the log.
4. Exit 0 GREEN (with NOTE lines) · 1 RED · 2 UNUSABLE (bad argv, unreadable inputs, a gate that could not spawn, a
   crash).

`MISSING_TARGET_CODES` (frozen, one enumeration): TS2304, TS2305, TS2306, TS2307, TS2339, TS2353, TS2459, TS2460,
TS2551, TS2552, TS2554, TS2555, TS2561, TS2613, TS2614, TS2694, TS2724 — each a "name / module / export / member /
argument count / known property does not exist (yet)" diagnostic, the shapes a red-first test produces against an
unbuilt or not-yet-extended target.

`/pharn-test`: a new **Step 3c** between Step 3b and Step 4 runs the line (Bash timeout 600000). Exit 1 → fix only the
mapped test files once with Write/Edit (reading the named log as untrusted data), run Step 3b's line and this line
again; RED again → refusal **`ac-tests-typecheck`**. Exit 2 → refusal **`typecheck-check-unusable`**. Step 5's revise
path names Step 3c. Claims block gets one Floor bullet with the bound. `pharn-loop.md` gets one `allowed-tools` grant for
the pinned line (no loop mapping: a refusal leaves no lock, so `check-test-stage` is non-zero → S9, the style check's
precedent). `check-test-stage.mjs` is NOT changed (stated bound; also keeps clear of CORE-344).

## Files

- `pharn/floor/ac-types-core.mjs` — pure rules: TYPE_SET, MISSING_TARGET_CODES, the tsc line parser, the verdict, the printed lines — layer product floor
- `pharn/floor/ac-types-core.test.mjs` — parser over the measured fixtures (both forms), every exempt code, TS2741 refuses, located-elsewhere NOTE, unparsed NOTE, not-measured NOTE, empty set GREEN, cap, `shown()` — layer product floor (test)
- `pharn/floor/check-ac-types.mjs` — the CLI: argv, inputs, containment, spawning via `spawnGate`, log reading, exit table — layer product floor
- `pharn/floor/check-ac-types.test.mjs` — CLI end-to-end over scratch projects with fake typecheck scripts printing the measured lines (RED, exempt-only GREEN, elsewhere NOTE, excluded gate, no gate, timeout, unusable argv), plus ★ WIRING executing the committed `/pharn-test` line — layer product floor (test)
- `pharn/floor/test-fixtures/typecheck/tsc-plain.out` — real tsc 6.0.3 non-pretty output of the probe (absolute probe path replaced by `/project`) — layer product floor (test fixture)
- `pharn/floor/test-fixtures/typecheck/tsc-pretty.out` — the same probe with `--pretty` — layer product floor (test fixture)
- `.claude/commands/pharn-test.md` — `reads:` entry, Step 3c, two refusal names, Step 5 revise path, one claims bullet — layer product command
- `.claude/commands/pharn-loop.md` — one `allowed-tools` grant for the pinned Step 3c line — layer product command
- `.dev/floor/command-hygiene.test.mjs` — `COMMAND_BYTE_CEILINGS` raise for `pharn-test.md` (and `pharn-loop.md` only if measured over) by the measured + 10% rule — layer dev apparatus
- `.dev/floor/stage-load-budget.test.mjs` — `STAGE_LOAD_CEILINGS` raise for the test (and loop) stage only if measured over — layer dev apparatus
- `.dev/guides/floor-ac-tests.md` — a new `## check-ac-types.mjs` section (usage, exit table, bounds) — layer dev apparatus
- `README.md` — the generated current-state region only, by `npm run docs:generate` — layer generated
- `pharn-install.json` — regenerated by `npm run docs:generate` (new floor files, skillsVersion) — layer generated
- `SKILLS_VERSION` — 7.23.0 → 7.24.0 (minor: a new shipped checker) — layer repo-meta
- `CHANGELOG.md` — one new 7.24.0 entry — layer repo-meta

## Contracts satisfied

- `pharn/pharn-contracts/ac-tests.md` — unchanged; the new step sits before "The lock" and changes neither the mapping, the lock nor the red run (cited, not restated, P4).

## Evals to write (P1)

No capability (no `role:` file) is added, so no `evals/` directory; the floor checker's behaviour is pinned by its
`node --test` suites:

- measured plain fixture, mapped file = `src/__tests__/a.test.ts` → RED with exactly `(5,9) TS2741`; TS2307/TS2554/TS2339 NOTE; `src/lib.ts` TS2322 NOTE elsewhere.
- measured pretty fixture → the same partition (ANSI stripped; the indented related-info line ignored).
- each MISSING_TARGET_CODES member in a mapped file → not RED (L29 enumeration).
- red gate, zero tsc-format lines → GREEN with a not-attributed NOTE (never silent).
- no typecheck script / excluded → `GREEN — no typecheck gate` line.
- timed-out gate → NOTE not measured, exit 0.
- ★ WIRING: the Step 3c line read from `.claude/commands/pharn-test.md` runs and REDs over a scratch project.

## Guarantee audit (P0)

- "a typecheck error located in a mapped AC test file, with a code outside MISSING_TARGET_CODES, is RED" → floor: enum-regex (anchored line regex + path set membership + code set membership) over the gate's output, given the output is in tsc's format.
- "/pharn-test runs it before pinning" → advisory (command orchestration; `check-test-stage.mjs` does not re-check it, as for the style check).
- "an exempt-code error will be resolved by the build" → advisory, and NOT claimed: such an error that the build never resolves is still pinned and reaches the same post-build dead end (stated bound).
- "an error outside the set is the test's own defect" → NOT claimed: the set is a closed list, not a judgment of cause. A legitimate test-first test can raise a code outside it (e.g. TS2322/TS2345 passing a value only the built target will accept) and is refused — a false refusal, stopping at the test stage. Stated in the module header and the claims bullet.
- "the parser sees every type error" → NOT claimed: only tsc's two line forms at line start (tsc, vue-tsc); a prefixed (turbo/nx) or other checker's output is "not attributed" NOTE, i.e. today's behaviour.
- "the logs are the gate's output" → agreement, not provenance (L43): logs live under `pharn/.run/`, which Bash reaches.

## Trust audit (P2)

- Gate stdout/stderr are UNTRUSTED free text (they quote source code). The checker extracts only (path, line, col, code) through an anchored regex; the message text is never printed, never interpreted. Path and code are compared by set membership; printed values go through `shown()`. The model reads the log itself to fix its tests, as untrusted data (the command says so).
- Mapped paths come from AC-TESTS.md through `acRowsOf` (its badPath rules); they reach only `resolve` and string compare.

## Determinism audit (P5)

Every branch is membership: gate id ∈ TYPE_SET ∩ scripts − exclude; measured per the shared rule; path ∈ mapped set; code ∈ MISSING_TARGET_CODES. No LLM classification.

## GATE 1 decision (model decision under delegation — orchestrator, 2026-11-24)

Approved as written: keep the closed MISSING_TARGET_CODES list, assignability codes (TS2322/TS2345/TS2741) outside it.
A false refusal lands at the test stage, which can still edit its own file (one fix attempt); a miss lands after the
build, where nobody can edit it, until the iteration cap. Conditions folded into the build: (1) the bound states both
directions — a legitimate test passing a value only the built target accepts IS refused, and the stage's remedy is to
rewrite its own test (type the value through the target's parameter type, or a narrow cast) in the one fix attempt; a
test-own TS2339 slips through to the post-build gates; (2) the Step 3c fix text names that remedy; (3) all four grill
concerns (TS2339 in the bound; an unreadable log after a red exit is UNUSABLE; the case-folded compare errs toward
refusing, stated; the timeout NOTE says the error may still reach the post-build gates).

## Open questions (HALT)

- none (resolved at GATE 1, above).
