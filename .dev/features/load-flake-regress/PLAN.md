# PLAN — load-flake-regress

- spec_content_hash: 2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e
- applied_lessons: [L20, L22, L34, L60, L66]
- increment: (a) Make the floor tests that go red only from machine load independent of load, without weakening any behavioural assertion; (b) give `check-regress.mjs verdict` an opt-in PER-TEST comparison for one gate, and wire `/pharn-dev-regress`'s outside `tests` gate to it through a node:test reporter, so a red base no longer hides a new head failure.
- layer(s): product floor (`pharn/floor/check-regress.mjs`) + contract (`pharn/pharn-contracts/regression-report.md`) → `SKILLS_VERSION` minor bump 6.72.0; build apparatus (`.dev/floor/`, `pharn-dev-regress.md`, tests, a test fixture, a guide).
- constitution_refs: [P0, P2, P5, P6, P7]

## Why (P7 — real, recorded failures)

**(a) Load-red floor tests.** In the 2026-10-19/20 MEDIUM batch (PRs #359–#375) every PR's local `npm test`, and so every
`/pharn-dev-regress` and `/pharn-dev-verify`, went red on timing tests while they passed alone and in CI. The agents had to
override a FAIL verdict under delegation each time. Recorded in `.dev/features/{loop-grant-seam-skill,regress-install-config,
test-infra-pin-all-gates,surface-bump-check,loop-honest-stop,scanner-redos-bounds,ship-step2-part,stage-load-budget,
cost-ledger-run-scope,frontmatter-parser-parity}/{VERIFY,REGRESSION}.md`, at load averages 40–272. The failing tests, read
from those logs, and the cause found in the code this run:

| test                                                                                                        | symptom recorded                                                      | cause in the test                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stage-verify.test.mjs` "★ budget clock — … 2 s window" (~:1112)                                            | the old-clock MUTANT exits 5, not 0                                   | the mutant must finish its first gate inside a REAL 2 s window (budget 32000 − timeout 30000)                                                                                     |
| `stage-regress.test.mjs` "budget clock (round 2)"                                                           | control `continue` instead of `done`                                  | the 90000 control needs every step in 60 s of real time                                                                                                                           |
| `stage-regress.test.mjs` "never recorded — a timed-out base gate" (~:2207)                                  | base install exit 124, verdict changes                                | `--timeout-ms 1500` for every gate; the slow gate sleeps only 5 s                                                                                                                 |
| `stage-regress.test.mjs` "★ P2-C (f2)" (~:2948)                                                             | green-head control reads `inconclusive`                               | `--timeout-ms 1500`: the FAST head gate times out too; the slow base waits only 4 s                                                                                               |
| `stage-regress.test.mjs` "A3 (round 2) — kill during `git worktree add`"                                    | kill lands outside the worktree phase                                 | a 30 s ceiling to reach the base checkout, which comes after the whole head side                                                                                                  |
| `stage-regress.test.mjs` "★ WIRING" (fresh, and reuse)                                                      | `continue` at a budgeted phase                                        | the pinned line's window is `570000 − 540000` = 30 s of real time; the test runs ONE invocation                                                                                   |
| `stage-verify.test.mjs` "★ WIRING"                                                                          | (same shape)                                                          | the pinned verify line, same 30 s window                                                                                                                                          |
| `entry-base-evidence.test.mjs` (7–8 per run: "★ equivalent environment", "environment divergence", :691, …) | `TypeError` reading `source` of a null record; extra counts           | its `regress()` runs the pinned regress line ONCE: a `continue` has no report, so `be` is null                                                                                    |
| `entry-gates.test.mjs` (:799 and others)                                                                    | "result file never appeared"; `continue` where a verdict was expected | `--wait --budget-ms 60000`, `--timeout-ms 60000`, `waitForFile` 15 s, `untilEvent` 10 s ceilings                                                                                  |
| `run-gates.test.mjs` (named by the batch)                                                                   | gate exit 124 / missing marker                                        | a 700 ms gate timeout that must outlive `sh` writing its marker; fixed `sleep 3` before the group-kill check; 5/20 s poll ceilings; a "slow" gate that exits by itself after 30 s |

**Measured this run (before).** Three parallel `npm test` at load ≤ 112: 5,825 / 5,826 pass, 0 fail, in all three — so
that load does not reproduce the flakes today; a harsher targeted stress (three copies of the five files plus CPU
burners) is the before/after measurement (recorded in `VERIFY.md`).

**(b) The regress blind spot.** `/pharn-dev-regress` runs the outside suite as ONE gate, `tests`, one exit code.
`check-regress.mjs verdict` classes a gate red at base as `pre_existing`, so a load-red base masks every NEW failure at
head. Recorded: `frontmatter-parser-parity/REGRESSION.md` run 1 — 11 real head failures (`render-review-assignments`,
`lens-groups`) under a `pre_existing` `tests` gate, found only by reading the log; the same candidate in
`test-infra-pin-all-gates/SHIP.md` and `surface-bump-check/SHIP.md`. L20: reading logs is a discipline-only defence.

## Design decisions

**D1 — load independence by kind, never by weakening.** Every behavioural assertion stays byte-for-byte; only the
fixture's clock, ceiling or protocol changes:

1. **Inject the clock** where a test measures the BUDGET ARITHMETIC (`stage-verify` budget clock, `stage-regress` budget
   clock round 2). A test-only preload, `pharn/floor/test-fixtures/virtual-clock/preload.mjs`, passed with
   `node --import <file>?<query>` to the stage process only: it freezes `Date.now()` and advances it by a fixed amount
   after the FIRST `git` call whose argv starts with the configured args (replacing the PATH shim's real `sleep 3`).
   Elapsed time is then exactly what the fixture says, at any load. Children (the runner, git) keep the real clock; the
   stage's budget is the only reader of its `Date.now()` besides delivery-run identity, which these two fixtures do not
   open. The mutants and controls stay, and each still flips: real code `continue`, old-clock mutant `done`, wide window
   `done`.
2. **Follow the command's own protocol** where a test executes a PINNED line (both ★ WIRING tests, the reuse WIRING
   test, `entry-base-evidence`'s `regress()`): on exit 5 run the PINNED `--resume` line (extracted from the same command
   file) until a terminal exit. That is exactly what `pharn-regress.md` / `pharn-verify.md` tell the model to do on `5`,
   so the WIRING tests now also execute the resume line. Counts, verdicts and report bytes are asserted unchanged.
3. **Generous ceilings with explicit headroom** where a test must let something slow happen while something fast
   finishes (`--timeout-ms` for a run with one deliberately hung gate: 1500 → 20000, the hung gate now waits until it
   is killed; `--wait` budgets and gate timeouts in `entry-gates`; the 700 ms runner timeout → 10000). A ceiling only
   costs time when it is reached, so it is raised only where nothing waits on it on the happy path, and every raised
   constant carries a one-line comment naming its headroom.
4. **Poll for the condition** instead of a fixed sleep (`run-gates` group-kill check, `A3` base-checkout wait), with a
   generous ceiling.

Rejected: retrying a failed test, `{ timeout }` bumps on `node:test`, an env switch in product code. Each either hides a
real failure or adds a test hook to shipped code.

**D2 — per-test comparison: per-test records, not "re-run the failing files alone".** A re-run alone measures load, not
masking: a gate genuinely red at base (a real pre-existing failure) still hides every new head failure behind one exit
code. Per-test records fix the masking itself, whatever made the base red. They need no re-run, so regress does not get
slower.

**D3 — the checker surface.** `check-regress.mjs verdict` (positional path only) gains
`--per-test <gate-id> --base-tests <file> --head-tests <file>`. The two files are `pharn-test-results/1` documents
(`test-results-record.md`'s `pharn-json`), parsed by the EXISTING adapter and record builder (`parseResults`,
`buildRecord`, `readResultsFile` — one grammar, L35), with the gate's exit from the results maps as the record's exit.
For that gate:

- base 0 → the exit table decides as today (0/0 OK, 0/≠0 regression); the block is reported.
- base ≠ 0, head 0 → OK (a fix).
- base ≠ 0, head ≠ 0 → **regression** iff some test `failed` at head whose base status is not `failed` (passed,
  skipped or absent), or head `suite_errors` > base `suite_errors`; else `pre_existing`, as today.
- Fail-closed (exit 2, `inconclusive`, closed `reason_code`s): the three flags not all present; `--per-test` on the stamp
  path (product wiring is a follow-up); the gate absent from either map; a file unreadable, malformed, over a cap or
  contradicting its exit (`buildRecord`'s `results-exit-contradiction`); a record with ANOMALIES (ambiguous identity);
  and — L34 — a gate that exited non-zero whose record holds no failed test and no suite error (the red is not accounted
  for, so no comparison can claim it).
- The report gains `per_test: { gate, base: {passed, failed, skipped, suite_errors}, head: {…}, new_failures: [{id,
base}], still_failing }`. `new_failures[].id` is test-title text: untrusted DATA, ADVISORY, read by no floor op.
  Without `--per-test` the output is byte-identical (the EQUIVALENCE test keeps holding).

**D4 — the producer.** `.dev/floor/node-test-results-reporter.mjs`, a node:test custom reporter (stdlib) that writes one
`pharn-test-results/1` document: a test's path is its `test:start` ancestry; `passed`/`failed`, with `skip`/`todo` →
`skipped`; a suite counts only when it fails for its own reason (a hook), not for `subtestsFailed`; a file that fails to
load or exits non-zero is node's own file-level `test:fail` and is recorded as a failed test; a repeated id in one file
gets `#n` in declaration order, so the record has no duplicate-id anomaly. Paths relative to the run's cwd, so the
base worktree and the working tree produce the same ids. Measured on node 24.13.1 (the event shapes probed this run).

**D5 — `/pharn-dev-regress` wiring (L22: pinned, wrong forms named).** Step 2's pinned `tests` line becomes the same
`xargs node --test` line plus `--test-reporter=<working tree>/.dev/floor/node-test-results-reporter.mjs
--test-reporter-destination=<working tree>/.pharn/pharn-dev-regress/<side>-tests.json` (absolute paths: the base
worktree has no reporter of its own, and the record lands in the run's own capture dir, L66). Step 3's pinned verdict line
adds `--per-test tests --base-tests … --head-tests …`. An empty outside list still records `tests: 0` without a run, and
then the verdict line omits the three flags (stated in that branch). `/pharn-regress` (product) is unchanged: its outside
suite is the project's own gates through `run-gates.mjs`, its records need the base root the stamp drops, and
`check-loop-fresh.mjs` check E re-derives its verdict from the stamps — the named follow-up `regress-per-test-product`.

## Files

- `pharn/floor/check-regress.mjs` — `--per-test` comparison on the positional verdict path — layer product floor
- `pharn/floor/check-regress.test.mjs` — per-test cases, negative controls, fail-closed cases — apparatus
- `pharn/pharn-contracts/regression-report.md` — the `per_test` block and the changed `regressions` meaning — layer pharn-contracts
- `pharn/floor/gate-run-core.mjs` — `per-test-record-refused`, `per-test-unaccounted-red` join the closed `REASON_CODES` (Amendment 1) — layer product floor
- `.dev/floor/node-test-results-reporter.mjs` — the node:test reporter — apparatus
- `.dev/floor/node-test-results-reporter.test.mjs` — reporter cases, and its output through `check-regress` end to end — apparatus
- `.claude/commands/pharn-dev-regress.md` — pinned reporter + verdict lines — apparatus (dev command)
- `pharn/floor/test-fixtures/virtual-clock/preload.mjs` — test-only clock preload — apparatus
- `pharn/floor/stage-verify.test.mjs` — budget clock via the preload; WIRING drains with the pinned resume line — apparatus
- `pharn/floor/stage-regress.test.mjs` — budget clock via the preload; 1500 ms runs; A3 wait; both WIRING tests drain — apparatus
- `pharn/floor/entry-base-evidence.test.mjs` — `regress()` drains with the pinned resume line — apparatus
- `pharn/floor/entry-gates.test.mjs` — wait/timeout ceilings, poll ceilings — apparatus
- `pharn/floor/run-gates.test.mjs` — timeout and poll ceilings, slow gate runs until killed — apparatus
- `.dev/guides/floor-gates.md` — `check-regress.mjs verdict --per-test` paragraph — apparatus
- `SKILLS_VERSION` — 6.71.0 → 6.72.0 — repo meta
- `README.md` — version badge — repo meta
- `CHANGELOG.md` — `[6.72.0]` entry — repo meta

## Contracts satisfied

- `test-results-record.md` — consumed, not changed: the `pharn-json` format and `buildRecord`'s record shape and exit
  cross-check are reused as they are (cite, P4).
- `regression-report.md` — additive optional `per_test` field (ADVISORY); `verdict` stays the one floor-relevant field
  with the same enum.

## Evals to write (P1)

No Capability is added or changed (no `role:`), so no `evals/` pair. The checker and reporter are covered by tests:

- check-regress: masked new failure (base red, head red, a new failing id) → `regressions`; the same failing set at both
  → `pre_existing`; head-only suite error → regression; base-absent failing test → regression; base 0 → table unchanged;
  base red/head green → OK; each fail-closed reason (exit 2); without `--per-test` → byte-identical output to before.
  Negative control per property (L60): drop the new-failure rule in a scratch copy → the masked case reads
  `no-regressions`.
- reporter: nested describe, skip/todo, a hook-failed suite, a load-failing file, a non-zero exit, duplicate titles,
  relative paths; its document passes `parseResults("pharn-json")` + `buildRecord`; end to end through `check-regress`
  over two real `node --test` runs (a masked new failure caught).
- each load fix: the assertion it guards still fails on its own defect where a mutant exists (the budget-clock mutants
  keep their flip; P2-C's red head still reads `inconclusive`).

## Guarantee audit (P0)

- "a NEW failing outside test under a red base is a regression" → floor: enum/set membership over two records
  (`check-regress.mjs`), on the dev path, when the reporter's records are passed. ADVISORY: that `/pharn-dev-regress`
  passes them (orchestration; the lines are pinned).
- "the records are the run's" → advisory: they are unauthenticated files under `.pharn/`, which Bash reaches (L43's
  bound; same as the results maps today). `buildRecord`'s exit cross-check and the unaccounted-red refusal narrow, not
  close, a forged record.
- "the reporter records every test node ran" → advisory: measured on node 24.13.1 event shapes; a node change in event
  shape is caught only by the reporter's tests.
- "these tests no longer go red from load" → advisory: measured under one stress profile; a ceiling is still a ceiling.
- The product `/pharn-regress` keeps its exit-code-only comparison — stated in the contract and the CHANGELOG.

## Trust audit (P2)

- Test titles from `node --test` (repository code at base and head) become record ids → `per_test.new_failures[].id` in
  the report: untrusted free text, carried as DATA, never read by a floor op, rendered fenced in `REGRESSION.md`.
- The records are parsed by the existing adapter under its byte and count caps; nothing is evaluated.

## Applied lessons

- L20 — the masking defence was "read the log", a discipline-only remedy that recurred (three SHIP.md candidates, one with
  11 hidden failures); this increment gives it a floor comparison instead of a louder reminder.
- L22 — the new `tests` capture and verdict lines in `pharn-dev-regress.md` are pinned literally, with the wrong forms
  (relative reporter path at base, omitting the flags with a non-empty list) named beside them.
- L34 — a non-zero gate whose record shows no failure and no suite error refuses instead of comparing an empty set; an
  empty outside list passes no per-test flags at all rather than two empty records.
- L60 — every new check-regress property gets its own negative control, and each load fix keeps the mutant/control that
  makes its assertion falsifiable (the budget-clock mutants still flip under the virtual clock).
- L66 — the per-test records are captured into the run's own `.pharn/pharn-dev-regress/` capture paths and read only
  after the `node --test` process has exited (the `; T=$?` line returns after it).

## Open questions (HALT)

- None blocking. GATE 1 is delegated to this session by the user (AskUserQuestion, this run): recorded below.
- Write route: this desktop worktree session's write hooks judge the main checkout, so every Write/Edit is denied. The
  user chose (AskUserQuestion, this run) "Bash writes, reconciled": every write goes through a helper that first runs
  BOTH real hooks with the worktree as their root and writes only on exit 0, plus verify's reconcile. Recorded as a
  deviation in SHIP.md and the PR.

## GATE 1 decision

**APPROVED as written — a model decision under the user's delegation** (AskUserQuestion this run: "You decide,
recorded"), not a human approval. Basis: both parts answer recorded failures (P7); every load fix keeps its assertion
and its mutant/control; the per-test comparison is opt-in, so `/pharn-regress` and every existing verdict stay
byte-identical; the product wiring is left as a named follow-up rather than built on a guess.

## Amendment 1 — the two new reason codes join the closed set

`/pharn-dev-regress` (per-test, this increment's own wiring) reported `tests` 0 → 1 with one new failure:
`pharn/floor/gate-run-core.test.mjs` "✧ L36 CLOSURE — every reason_code LITERAL the shipped modules emit is a member of
REASON_CODES". `check-regress.mjs` now emits `per-test-record-refused` and `per-test-unaccounted-red`, which
`gate-run-core.mjs`'s closed `REASON_CODES` did not name. Fix: add both to that set (one file added to `## Files`).
Build Step 0 (setter, then `--anchor`) re-runs after this amendment, so the anchored epoch names the path; every
earlier write of this build went through the hook-checking helper under the original 16-path scope. A model decision
under the user's delegation, like GATE 1.
