# PLAN — core-301-no-progress-stop: `check-loop.mjs` stops a loop whose iteration repeats the previous failure

- spec_content_hash: f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d # fix #4
- applied_lessons: [L6, L15, L29, L36, L43, L44, L45, L50, L72, L84]
- increment: `check-loop.mjs` gains one terminal cause, `no-progress`: when iteration N ≥ 2 (under the cap) ends with verify `FAIL` and exactly the previous iteration's failing gates, failing acceptance criteria and (full table) regressions, it stops `STOP_TERMINAL` (exit 4) instead of `CONTINUE`, naming the repeated failures; the previous iteration's reports are copies `/pharn-loop` makes with one pinned `cp` line on every `CONTINUE`.
- layer(s): product floor (`pharn/floor/`), `pharn-contracts` (schemas only), product commands (`.claude/commands/pharn-loop*.md`), repo-meta (`CHANGELOG.md`, `SKILLS_VERSION`, `README.md`, `pharn-install.json`), dev guide. No `role:` capability; no trusted doc.
- constitution_refs: [P0, P2, P3, P5, P6, P7]
- ticket: Linear CORE-301 (epic CORE-294). Base `476882bc` (origin/main, `SKILLS_VERSION` 7.22.0). Bumps to **7.23.0** (minor — a new stop the product loop can take), pre-assigned by the batch orchestrator; renumbered by diff at merge time if `main` moved.

## Why (P7 — the real failure)

The CORE-113 driven run (`.dev/features/loop-driver-spike/RECORD.md` §4 and §6) stopped `STOP_CAP` at 3 of 3. In
all three iterations verify failed on `test` alone with the AC gate passing; builds 2 and 3 changed no code, and the
run paid 7.6 + 7.3 build minutes and 6.5 + 6.4 verify minutes (about 28) for iterations that repeated iteration 1's
failure. With this stop the run ends after iteration 2 (iteration 2 repeats iteration 1), saving iteration 3 (about
14 minutes at that run's rates). It cannot save iteration 2: two iterations are the least that show a repeat.

## Discovery (read this run)

- `pharn/floor/check-loop.mjs` at `476882bc` emits exactly five decisions — `STOP_TERMINAL` / `STOP_GREEN` /
  `STOP_GREEN_QUICK` / `STOP_CAP` / `CONTINUE` (plus its own `INCONCLUSIVE`) — and four terminal causes
  (`TERMINAL_CAUSES`: `unmeasured`, `ac-evidence`, `reconcile`, `reconcile-inconclusive`). No predicate compares an
  iteration with the one before: the orchestrator's pre-check is confirmed.
- No per-iteration copy of a verdict report exists. `/pharn-verify` and `/pharn-regress` overwrite
  `pharn/features/<name>/verify-report.json` / `regression-report.json` each iteration; `stage-direct.mjs` keeps only
  the last run's `pharn/.run/stage-direct/{runner,state,result}.json`; `freshness.jsonl` holds re-run rows only. So
  the previous iteration's verdict has to be KEPT by someone: this plan makes `/pharn-loop` copy it on `CONTINUE`.
- `pharn/.run/` is gitignored (`.gitignore:7`), so the copies are outside the reconciled set and never staged.
  `pharn/.run/pharn-loop/<name>/` exists from Step 1a (`mkdir -p`). The Write tools cannot write there
  (`protect-trusted-paths.cjs` `RUN_STATE_SUBTREES`), so the copy is a Bash line, as every other write there is.
- Choosing a terminal CAUSE, not a new decision TOKEN, keeps every token enumeration unchanged: `check-loop-record.mjs`
  and `check-loop-decision.mjs` (`DECISION_ENUM`), `loop-closeout.mjs` (green-token enum), `entry-gates-core.mjs`,
  `render-cost-ledger.mjs` / `check-cost-ledger.mjs`, `ship-outcome-core.mjs` and the ledger all key on the token
  (`grep -rl STOP_CAP`, 18 non-feature files). `terminal_cause` consumers: `/pharn-loop` Step 5.4 (maps
  `ac-evidence` → S13 by equality, so a new member falls to "go to Step 6 with the decision as emitted", L72 checked),
  `render-run-report.mjs` (re-applies the `reconcile` predicate itself and reads no check-loop output), and four
  contracts' prose. The ticket's "new closed reason" is this cause.
- `check-loop-decision.mjs` re-derives a record by re-running `check-loop.mjs` on `pharn/features/<name>/` reports.
  Because the previous-report location is derived from the verify report's own path (below) — never an argument —
  the re-derivation reads the same copies with no code change, and a `no-progress` record re-derives at close (the
  copies are still on disk: nothing between the last `CONTINUE` and the closeout removes them).
- Headroom (bytes, `COMMAND_BYTE_CEILINGS`): `pharn-loop.md` 84,084 / 91,136; `pharn-loop-close.md` 42,224 / 43,520;
  `pharn-loop-quick.md` 11,568 / 12,288. Edits are kept small; a ceiling raised (measured + 10%, next 512) is a
  visible diff in `.dev/floor/command-hygiene.test.mjs`.
- No trusted doc enumerates terminal causes or the stop core's inputs (`grep` over the four: only `LIMITS.md:165`,
  which says quick decides "over `/pharn-verify`'s verdict alone" — still true, the previous copy is a verify report
  too). No protected-file patch is needed.

## Design

1. **Where the previous iteration comes from (deterministic, no argument).** `check-loop.mjs` derives
   `pharn/.run/pharn-loop/<name>/prev-verify-report.json` and `…/prev-regression-report.json` from the verify report
   path exactly as `check-loop-decision.mjs`'s `markerRun` locates the marker: resolve it, require the shape
   `<root>/pharn/features/<name>/verify-report.json`, else there is no previous iteration (every existing fixture —
   today's behaviour). The parser still refuses every flag but `--iter` / `--cap`, so no argv selects or names a
   comparison input (P5).
2. **Who writes it.** `/pharn-loop` Step 5.4's `CONTINUE` bullet gains one fenced block, run before `N++`, two lines,
   no shell variables (L44):
   `cp pharn/features/<name>/verify-report.json pharn/.run/pharn-loop/<name>/prev-verify-report.json` and the same for
   `regression-report.json` → `prev-regression-report.json`. Quick mode (`pharn-loop-quick.md` item 7): the verify
   line alone (no regression report is written). Two `allowed-tools` grants added for the two exact forms.
3. **The predicate, `noProgress`** — evaluated only where the table would otherwise say `CONTINUE` (a measurable red,
   `iter < cap`), and only when `iter >= 2`, so a copy left by an earlier run is never compared at iteration 1. True
   iff ALL hold:
   - current verify verdict is `FAIL`, and the previous copy reads (same `readVerdict`: exists, JSON object, no
     repeated top-level key, verdict in enum) with verdict `FAIL` and a string-array `failing_gates`;
   - the two `failing_gates` are equal as SETS;
   - the failing-AC sets are equal — the `ac_gate.acs[]` ids whose `reason` is not `null` (an AC not delivered);
     `ac_gate` absent → the empty set; an `ac_gate` / `acs` / row that is not the contract's shape, or an id outside
     `^AC-[1-9][0-9]*$`, makes the report incomparable (L6: read from the structured location; own-property reads,
     L15);
   - full table only: the previous regression copy reads, its verdict equals the current one, and both
     `regressions` arrays are string arrays equal as sets. The quick table never opens either regression file.
     Anything unreadable or incomparable → `noProgress` is false → `CONTINUE`, exactly today's decision. It never
     yields `INCONCLUSIVE` and never a green: the worst a stale or forged copy can do is stop a red run early
     (non-green, never committed) or fail to stop it (today).
4. **The stop.** `noProgress` → `STOP_TERMINAL`, exit 4, `terminal_cause: "no-progress"` (`TERMINAL_CAUSES` gains it,
   five members), reason naming the repeated gates, ACs and regressions. The output gains one key, `repeated`:
   `null`, or `{ failing_gates: [...sorted], failing_acs: [...sorted], regressions: [...sorted] | null }` (null
   regressions in quick). At `iter >= cap` the table stays `STOP_CAP` — the stop only replaces a `CONTINUE`, the one
   place an extra iteration would be paid — so every run whose failure set changes, and every run at its cap, decides
   byte-for-byte as before (AC 3).
5. **Where the user sees it (AC 2).** The floor names the repeat in the JSON (`repeated`, `reason`). `/pharn-loop`
   Step 5.4's `STOP_TERMINAL` bullet adds `no-progress` to the causes that go to Step 6 as emitted; the close part's
   Step 6b capture rules add one line: on `no-progress`, the record's standing reds name the JSON's `repeated` sets
   (gate and AC ids, quoted as data). The Step 7 summary already lists per-iteration verdicts and standing reds.

## Applied lessons

- **L6** — the failing ACs are read from the verify report's structured `ac_gate.acs[]` rows (`id`, `reason`), never
  from `reason` prose or `failing_gates`' `ac-delivery` member; the previous iteration's location is derived from a
  fixed path shape, never parsed out of text.
- **L15** — every row read is an own-property read (`Object.hasOwn`) on a plain-object check; set equality uses `Set`
  objects, never an object keyed by file content.
- **L29** — the cause set is materialized once (`TERMINAL_CAUSES`) and the closure test iterates it; the comparison's
  components are one list in the predicate, each with its own negative test.
- **L36** — the existing `✧ L36 CLOSURE` test is extended to five causes, both ways (every emitted cause is a member;
  every member is emitted by some fixture), so a variant spelling of `no-progress` fails.
- **L43** — stated as the bound: `check-loop-decision.mjs`'s re-derivation proves the record agrees with the copies
  on disk, never that the copies are the previous iteration's (a Bash write reaches them, `LIMITS.md §6`); no test
  claims more.
- **L44** — the pinned copy block carries no shell variable and no state from another block; `<name>` is substituted
  literally, as in every other Step 5 line.
- **L45** — a ★ WIRING test executes the COMMITTED copy block(s) and the COMMITTED stop line from `pharn-loop.md` /
  `pharn-loop-quick.md` in a scratch project (iteration 1 reports → copy → iteration 2 reports → stop line), with a
  negative control that skips the copy and gets `CONTINUE`.
- **L50** — the sweep is over the CITES of the changed referent (the stop core's input set and its cause set), not
  one phrase: the restatement sites found by grep are `check-loop.mjs`, `check-loop-decision.mjs`,
  `check-loop-record.mjs`, `loop-fresh-core.mjs` (header comments), `loop-record.md`, `verify-report.md`,
  `regression-report.md`, `pharn-loop.md`, `pharn-loop-close.md`, `pharn-loop-quick.md` and the dev guide
  `floor-orchestration.md`; every one is in `## Files`.
- **L72** — adding a member to `terminal_cause`'s closed set is an API change: every consumer that compares it was
  read (Discovery) — only S13's `ac-evidence` equality exists, and a new member takes its "else" branch, which is the
  intended one.
- **L84** — the feature's only effect is a branch off the safe default (`CONTINUE`), so the ★ tests take it on
  REALISTIC input: verify reports shaped as `stage-verify.mjs` writes them (`gates`, `failing_gates`, a full
  `ac_gate` block with `acs[]` rows, `completeness`, `gate_reuse`), plus a mutation check at build (dropping the AC
  component, or the `iter >= 2` guard, must fail a test).

## Files

- `pharn/floor/check-loop.mjs` — the `noProgress` predicate, the previous-copy location, `no-progress` in `TERMINAL_CAUSES`, the `repeated` output key, header table + structural-claim restatement — product floor
- `pharn/floor/check-loop.test.mjs` — the no-progress cases, the closure test at five causes, the ★ WIRING test — product-floor test (never ships)
- `pharn/floor/check-loop-decision.mjs` — header comment only: the stop core's inputs now include the previous iteration's copies — product floor
- `pharn/floor/check-loop-decision.test.mjs` — a `no-progress` record re-derives GREEN with the copies, RED `DECISION_MISMATCH` without — test
- `pharn/floor/check-loop-record.mjs` — header comment only (the same restatement) — product floor
- `pharn/floor/loop-fresh-core.mjs` — header comment only (the same restatement) — product floor
- `.claude/commands/pharn-loop.md` — Step 5.4: the copy block on `CONTINUE`, `no-progress` in the `STOP_TERMINAL` bullet; two `allowed-tools` grants — product command
- `.claude/commands/pharn-loop-quick.md` — item 7: the verify-only copy line — product command part
- `.claude/commands/pharn-loop-close.md` — the Floor bullet's input restatement; one Step 6b capture line for `repeated` — product command part
- `pharn/pharn-contracts/loop-record.md` — the `STOP_TERMINAL` causes and the "Unchanged by this contract" input sentence — contracts
- `pharn/pharn-contracts/verify-report.md` — the floor-consumer paragraph and `ac_gate` row: `check-loop.mjs` reads `acs[].id` / `reason` for `no-progress` — contracts
- `pharn/pharn-contracts/regression-report.md` — the `regressions` row: read by `check-loop.mjs` for `no-progress` only — contracts
- `.dev/guides/floor-orchestration.md` — the `check-loop.mjs` entry — dev guide
- `.dev/floor/command-hygiene.test.mjs` — only if a command family outgrows its `COMMAND_BYTE_CEILINGS` row (measured + 10%, next 512) — dev test
- `.dev/floor/stage-load-budget.test.mjs` — only if the `/pharn-loop` load set outgrows its `STAGE_LOAD_CEILINGS` row — dev test
- `CHANGELOG.md` — the `[7.23.0]` entry — repo-meta
- `SKILLS_VERSION` — 7.22.0 → 7.23.0 — repo-meta
- `README.md` — the version badge, and the generated `## Current state` region if `docs:generate` moves it — repo-meta
- `pharn-install.json` — regenerated by `npm run docs:generate` (installed files changed, `SKILLS_VERSION` bumped) — repo-meta

## Contracts satisfied

- `pharn/pharn-contracts/verify-report.md` / `regression-report.md` — the reports' shapes are unchanged; the contracts
  gain `check-loop.mjs` as a reader of `ac_gate.acs[]` and `regressions` (gate and AC ids — deterministic-tool
  output, the floor-verifiable class).
- `pharn/pharn-contracts/loop-record.md` — the record's envelope is unchanged (`decision` stays `STOP_TERMINAL`); the
  causes list gains `no-progress`.

## Evals to write (P1)

No capability is added, so no `evals/` case is owed; the checker's behaviour is pinned by `node:test` cases:

- same failure set at iter 2 < cap → `STOP_TERMINAL` / `no-progress`, exit 4, `repeated` and `reason` name the ids
- gates differ / ACs differ / regressions differ / regress verdict differs / previous verdict `INCOMPLETE` → `CONTINUE`
- same set at iter 1 (a copy on disk) → `CONTINUE`; same set at iter == cap → `STOP_CAP`
- set equality ignores order; current `INCOMPLETE` twice, or a regression-only red twice → `CONTINUE`
- unusable copy (missing, not JSON, repeated top-level key, bad `failing_gates`, malformed `ac_gate`, AC id off-shape) → `CONTINUE`, never `INCONCLUSIVE`
- quick: same verify set → `no-progress` with `repeated.regressions: null`, and no regression file is opened
- a fixture outside the `pharn/features/<name>/` shape decides exactly as today (every existing case, unchanged)
- `✧ L36 CLOSURE` at five causes; ★ WIRING over the committed lines with a negative control
- `check-loop-decision`: a `no-progress` record → GREEN with the copies present, RED `DECISION_MISMATCH` with them removed

## Guarantee audit (P0)

- "a loop whose iteration repeats the previous iteration's failing gates, failing ACs and regressions stops instead
  of iterating, given the copies" → floor: enum-regex (set membership/equality over gate ids and AC ids, an integer
  compare), tested code.
- "the decision is read from verdict files, never model judgment" → floor (structural): the predicate's inputs are
  the current and copied reports; no argv names them; no review/finding/severity/record input exists.
- "the copy is the previous iteration's" → advisory: the `cp` is a pinned Bash line the model runs; a skipped copy
  disables the stop (today's behaviour) or, at iteration ≥ 2, leaves an older copy (from this run's earlier
  iteration, or — if every copy this run was skipped — an earlier run's) to compare against; a Bash write can forge
  it. Bounded to a non-green stop either way: `noProgress` never reaches a green token.
- "runs whose failure set changes decide exactly as today" → floor: tested (every pre-existing case unchanged; the
  changed-set cases).
- "the stop report names the repeated failures" → floor for the JSON (`repeated`, `reason`); advisory for the record
  and summary that copy it.

## Trust audit (P2)

- Inputs read: gate-id strings (`failing_gates`, `regressions`) and AC ids filtered by `^AC-[1-9][0-9]*$` plus the
  `reason` field's null-ness. No free text (`detail`, `tests[]` titles, `completeness.missing[]`, `problem` /
  `evidence`) is read or echoed. Echoed ids are bounded by the shape filter (AC ids) or are the same gate ids
  `check-loop.mjs` already reads.

## Determinism audit (P5)

- Every branch is set membership/equality or an integer compare; every unreadable operand falls to the existing
  `CONTINUE` branch. The location is a fixed path shape, never chosen by a model.

## Open questions (HALT)

- none — the version (7.23.0) and the token-vs-cause choice are surfaced at GATE 1 for the orchestrator.
