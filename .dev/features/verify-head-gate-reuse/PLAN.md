# PLAN — verify-head-gate-reuse: VERIFY reuses equivalent REGRESS/HEAD gate executions

- spec_content_hash: d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4
- applied_lessons: [L24, L29, L34, L35, L41, L43, L45, L54, L59, L60, L62, L65]
- increment: when this delivery run's `/pharn-regress` HEAD side already completed a gate execution whose execution identity (command, files, cwd, timeout, PHARN-added env, tree fingerprint) equals the one `/pharn-verify` now needs, the verify runner records that completed result — with its provenance — instead of spawning the process again; every other gate runs exactly as today.
- layer(s): pharn-floor (product), pharn-contracts (two contracts, additive), product `.claude/commands/pharn-verify.md` (one claims bullet)
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]

## Why (P7)

**The trigger is the maintainer's explicit direction** — this run's prompt ("PR 3: Reuse Equivalent HEAD Gate
Executions"), recorded as such (P5), not a failure this plan re-derives. The benefit claimed is the one measured
(`MEASUREMENT.md`): gate processes and wall-clock per verify. No token saving is claimed.

## Confirmed current behavior (read this run, `main` at `2cf0e85`, 6.33.0)

- `/pharn-regress` (`stage-regress.mjs`) runs its HEAD side with `run-gates.mjs init --stage regress --side head`
  **at the invoking directory** (no `--cwd`), then `run --next` per entry; the finalized stamp stays at
  `.pharn/pharn-regress/head/stamp.json` (REGRESS_PATHS.head) with every gate's `.out`/`.err` beside it, until the
  next regress fresh start clears it (`clearScratchKeepingBaseEvidence` keeps only `base-gates/`).
- `/pharn-verify` (`stage-verify.mjs`) then runs `run-gates.mjs init --stage verify` at the same directory; its fresh
  start clears `.pharn/pharn-verify/`; every entry is spawned by `run --next` (`spawnGate`).
- `/pharn-loop` and `/pharn-ship` run regress then verify inline, both with `--timeout-ms 540000`, neither with
  `--gates`. `check-loop-fresh.mjs` G already requires `regress head fingerprint.final == verify fingerprint.init`.
- A run entry's execution inputs, read from `spawnGate`: `shell` (→ `/bin/sh -c '<shell> "$@"' sh <files…>`) or
  `argv` (+ `--` + files), the ordered `files`, `cwd`, `stdin` ignored, a new process group, the inherited
  environment plus ONE PHARN-added variable (`PHARN_TEST_RESULTS` = that gate's own results path under `<out>`), and
  the `--timeout-ms` kill timer. The tree each gate judged is `fp_before` (worktree-fingerprint `ALGO`).

### Discovery matrix — gates that can occur in both REGRESS/HEAD and VERIFY

| gate                              | regress/head execution                                                                                               | verify execution                                                                                          | equivalent?                                                                             |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `test`                            | `npm run test -- <outside tests>` (files = `scope.outside_tests`); **not executed** (`ran:false no-files`) when none | `npm run test`, files `[]` (whole suite); the AC gate reads its per-test record from verify's own `<out>` | **no** — files differ, and the AC gate needs verify's own results file → never reusable |
| `lint`, `format:check`, `lint:md` | `npm run <id>` — but **skipped by default** (`--skip-style` unless a style config is in `inside`)                    | `npm run <id>`                                                                                            | **yes** when regress ran it (a style-config-touching change); else absent → run         |
| `typecheck`, `type-check`         | `npm run <id>`                                                                                                       | `npm run <id>`                                                                                            | **yes** (same tree, same identity)                                                      |
| `build`                           | `npm run build`                                                                                                      | `npm run build`                                                                                           | **yes** unless it mutated the tree (`mutated:true` → never reusable)                    |
| `test:e2e`, `e2e`                 | never discovered at regress (E2E rule)                                                                               | `npm run <id>`, per-test record read by the AC gate                                                       | **no** — absent from regress; also never reusable (AC level gate)                       |
| `structural:<expected>`           | only OUTSIDE-feature pairs (`outside_eval_pairs`)                                                                    | only pairs in PLAN-declared capability dirs (EVAL_PAIR_RULE)                                              | **yes** only if the same `<expected>` lands in both (argv identical); normally disjoint |
| explicit `--gates` token          | `/bin/sh -c`; `test` gets the outside files appended                                                                 | `/bin/sh -c`, no files                                                                                    | **yes** iff shell text and files are identical                                          |
| `reconcile`                       | absent                                                                                                               | injected last, judges the whole verify window                                                             | **no** — verify-only, must run live                                                     |
| `completeness` (aux, not a gate)  | absent                                                                                                               | captured at verify init                                                                                   | not a gate; never reused                                                                |

Same id is never the equivalence test: `test` has the same id on both sides and different files.

## The design

### 1. Execution identity — `pharn/floor/gate-reuse-core.mjs` (NEW, pure)

`executionIdentity({shell, argv, files, cwdAbs, timeoutMs, fingerprintAlgo, fpBefore})` = sha256 of the canonical
JSON of `{schema: "gate-execution-identity/1", shell, argv, files, cwd, stdin: "ignore", env_added: [RESULTS_ENV],
timeout_ms, fingerprint: {algo, before}}` (fixed key order). Every component is an input `spawnGate` actually uses:

- **in**: shell / argv / ordered files (what runs), `cwd` as the realpath the gate ran in (where), `timeout_ms`
  (the kill timer), the fingerprint algo + `fp_before` digest (the tree judged), the NAME of the one PHARN-added
  variable, the identity schema.
- **out, each on purpose**: the gate `id` (a label — it is used only as the lookup key, see §3), `seq`, the stage /
  side, `<out>`, and the VALUE of `PHARN_TEST_RESULTS` (a per-stage path by construction; §3 requires the source to
  have written nothing there). **Not bound, named**: the inherited environment and the machine (the BASE-reuse
  bound, `regress-base-reuse-core.mjs`), and git-ignored content the fingerprint does not see (`node_modules/`).

`run-gates.mjs run --next` records the identity on **every** run it executes as an optional additive
`runs[].identity_sha256` (hex64), so the HEAD side carries it without any change to `stage-regress.mjs`.

### 2. The source — only this delivery run's REGRESS/HEAD stamp (`stage-verify.mjs`, phase `init`)

`stage-verify.mjs` passes `--reuse-stamp .pharn/pharn-regress/head/stamp.json` to `run-gates.mjs init` only when
`gate-reuse-core.mjs acceptReuseSource` accepts, over inputs read this invocation:

- exactly one open `/pharn-loop` or `/pharn-ship` run marker for the feature — the BASE-reuse rule reused, not
  copied (`regress-base-reuse.mjs readMarkers` + `regress-base-reuse-core.mjs deliveryRunIdentity`, L35);
- the head stamp is a regular file (containment-walked, `O_NOFOLLOW`: `readInProject`) whose mtime is **not before**
  the marker's (it was produced inside this run — a stamp an earlier run left is refused).

Otherwise no `--reuse-stamp` is passed: every gate runs, exactly as today. Never an error, never a question.

### 3. The per-entry decision — `run-gates.mjs run --next` (verify only)

`init --reuse-stamp <path>` (refused for any stage but `verify`) reads the file once (regular, `O_NOFOLLOW`), and
records `reuse: {stamp, stamp_sha256}` in the in-progress record — or `reuse: null` when it is unreadable (a MISS,
never a refusal). `run --next`, for the next entry, after its usual `fp_before`:

1. compute the live identity (§1);
2. if `reuse` is set, `findReusable` (pure) over the source re-read NOW: bytes' sha256 == `reuse.stamp_sha256`; the
   stamp validates (`validateStamp`, stage `regress`, side `head`, this feature); a source run with the same `id`
   exists and is ELIGIBLE —
   - `ran === true`, `reason === null` (never a no-files entry, never a reused one — no chains);
   - `timed_out === false`, `mutated === false` (`fp_before === fp_after`);
   - `exit` an integer in `0..125` — a COMPLETED process exit, green **or red** (126/127 are spawn failures,
     ≥128 a signal, 124-with-timeout is excluded by `timed_out`);
   - `results_sha256 === null` (the field present and null: it wrote no per-test file);
   - the id is not in `NON_REUSABLE_IDS` = ∪ `LEVEL_GATES` (`test`, `test:e2e`, `e2e` — the AC gate reads their
     per-test records from verify's own `<out>` and requires the pinned run) ∪ `{reconcile}`;
   - `shell`, `argv`, `files` equal the verify entry's, and `identity_sha256` equals the live identity (so the
     recorded fp_before equals the live tree, and algo, cwd and timeout agree);
3. the source logs are read (`O_NOFOLLOW`, regular, capped) and must hash to the recorded `stdout_sha256` /
   `stderr_sha256`; they are copied into verify's `<out>` under verify's own `logBasename(seq, id)`;
4. HIT → the run is recorded with `ran: false`, `reason: "reused"`, `reused: {stage, side, seq, stamp_sha256}`, the
   source's `exit` / `stdout_sha256` / `stderr_sha256`, `timed_out: false`, `mutated: false`,
   `fp_before = fp_after = live`, `results_sha256: null`, `identity_sha256` — **no process is spawned**;
   any failure at any step → MISS → the gate is spawned exactly as today.

`ran: false` is the truthful value: VERIFY did not run it. `validateStamp` admits `ran: false` only with
`reason: "no-files"` (unchanged) or `reason: "reused"` + a well-formed `reused` block + `identity_sha256`, and the
runner's finalize refusal (`entry-not-run`) admits the same. `SCHEMA` stays `gate-run-record/1` — additive, like
`results_sha256` (6.15.0); a pre-6.34.0 floor reads a reused entry as `entry-not-run`, a LAPSE (re-run), fail-closed.

### 4. What does NOT change

The required gate set (`resolveSet`), `aux.completeness`, the AC gate, `check-verify.mjs`, `check-regress.mjs`,
`stage-regress.mjs`, `check-loop-fresh.mjs` (J re-hashes the copied logs, E re-derives from the stamp, F/G compare
fingerprints — all unchanged and all pass over a reused entry), the lock, the drain/budget/resume (one `run --next`
per entry, the same atomic state write, the same lock — a crash before the state write re-decides the entry), the
BASE-reuse increment. VERIFY coverage is always `resolveSet`'s: REGRESS only offers results.

### 5. The report and the render

`stage-verify.mjs` reads its own finalized stamp and adds an ADDITIVE, ADVISORY block to `verify-report.json`:
`gate_reuse: {reused: [{id, stage, side, seq}]}` (empty list when nothing was reused) — `MERGED_KEYS` gains it.
`VERIFY.md` says which gate results were reused and that they were not re-executed here. No verdict reads it.

## Files

- `pharn/floor/gate-reuse-core.mjs` — NEW: execution identity, eligibility, source acceptance, closed miss set — pure
- `pharn/floor/gate-reuse-core.test.mjs` — NEW: identity negative controls per component, eligibility per rule
- `pharn/floor/gate-run-core.mjs` — validateStamp: optional `identity_sha256`; `reason: "reused"` + `reused` block
- `pharn/floor/gate-run-core.test.mjs` — the new validateStamp rules, with controls
- `pharn/floor/run-gates.mjs` — `init --reuse-stamp`; identity on every run; the reuse path in `run --next`
- `pharn/floor/run-gates.test.mjs` — reuse at the runner: spawn-count proof, MISS paths, crash/resume
- `pharn/floor/stage-verify.mjs` — source acceptance at init; the `gate_reuse` block
- `pharn/floor/stage-verify-core.mjs` — `gateReuseBlock`, `composeReport` gains it, `MERGED_KEYS`
- `pharn/floor/stage-verify-core.test.mjs` — the block and the merged key
- `pharn/floor/render-verify.mjs` — render the reused gates
- `pharn/floor/render-verify.test.mjs` — the render line
- `pharn/floor/stage-verify.test.mjs` — scenarios A–H, fresh-vs-reuse equivalence, freshness after reuse
- `pharn/pharn-contracts/gate-run-record.md` — `identity_sha256`, reused runs (additive)
- `pharn/pharn-contracts/verify-report.md` — the additive `gate_reuse` block
- `.claude/commands/pharn-verify.md` — one claims bullet: a gate result may be reused, named in the report
- `.dev/features/verify-head-gate-reuse/measure.mjs` — NEW: before/after process counts and wall-clock
- `.dev/features/verify-head-gate-reuse/MEASUREMENT.md` — NEW: the measured numbers
- `.dev/features/verify-head-gate-reuse/PLAN.md` — this plan
- `CHANGELOG.md` — `[6.34.0]`
- `SKILLS_VERSION` — 6.34.0 (minor: a new shipped capability)
- `README.md` — the version badge
- `CLAUDE.md` — the floor command list gains the reuse paragraph
- `docs/capabilities/**` — regenerated by `npm run docs:generate` if the catalog moves
- `README.md` CURRENT-STATE region — regenerated likewise
- `pharn/floor/head-reuse-offer.mjs` — NEW (grill B2): publish / discard / read the git-dir offer record
- `pharn/floor/head-reuse-offer.test.mjs` — NEW: publication rules, the ★ HOOK test on the record path
- `pharn/floor/regress-base-reuse.mjs` — `gitDirFile(name)` exported, `recordPath` built on it (one owner)
- `pharn/floor/stage-regress.mjs` — discard the offer at the fresh start, publish it once the HEAD side is finalized
- `pharn/floor/stage-regress.test.mjs` — the offer's lifecycle through the real script
- `.dev/floor/command-hygiene.test.mjs` — apparatus: its ✧ pin on `composeReport`'s spread gains the `gate_reuse` block

## Contracts satisfied

- `pharn/pharn-contracts/gate-run-record.md` — extended additively; a validating stamp still proves what it proved,
  and a reused entry's exit is the recorded exit of the named source execution.
- `pharn/pharn-contracts/verify-report.md` — one additive advisory block, read by no verdict.
- `pharn/pharn-contracts/stage-exit.md` — unchanged (no new exit, question or reason code).

## Evals to write (P1)

No capability (`role:`) is added; the floor modules ship with tests (below), the repo's convention for floor code.

## Tests and negative controls (the build must deliver each)

Scenarios, each through the REAL `stage-verify.mjs` (and `stage-regress.mjs` where named), with a spawn counter in
the fixture's gate scripts (a line appended to a counter file OUTSIDE the tree), so "not spawned" is measured, never
read off `reused: true`:

- **A** equivalent gate: regress/head runs `typecheck`; verify reuses it; the counter shows ONE `typecheck` run; the
  verify stamp validates, the entry is `ran:false reason:reused` with provenance, `check-verify --stamp` agrees.
- **B** same id, different command: `--gates "…::typecheck"` differing text → MISS, counter shows two runs.
- **C** different files: `test` subset at regress vs full at verify → run (also NON_REUSABLE).
- **D** regress skipped a verify gate (default style skip) → `lint` runs at verify.
- **E** verify-only gate (`test:e2e`) → runs.
- **F** changed tree after regress → MISS for every gate.
- **G** partial overlap: `typecheck` + `build` HIT, `lint` + `test` + `reconcile` run; the stamp is complete.
- **H** unusable source (absent, no marker, stale marker, earlier-run stamp, corrupted stamp, a log edited, a
  symlinked stamp) → every gate runs, `done`, same verdict, no new failure.
- **Fresh-vs-reuse equivalence (mandatory)**: the same fixture and tree through verify without and with the source:
  equal `resolveSet` coverage (stamp `required` + run ids), equal exit map, verdict, `completeness`, `ac_gate`, and a
  `check-loop-fresh.mjs` run over each that reads FRESH.
- **Negative controls per identity component** (L29/L60): shell, argv, each file, file order, cwd, timeout, fp algo,
  fp digest → each alone flips HIT to MISS; **irrelevant metadata** (seq position, `<out>`, stage label, the
  `PHARN_TEST_RESULTS` value) → still HIT.
- **Eligibility controls**: timed_out, mutated, exit 126/127/≥128, results_sha256 non-null or absent, ran:false,
  reason:reused, NON_REUSABLE id, no identity recorded → MISS; exit 1 (a completed red) → HIT and verify FAIL.
- **Resume**: a crash after the logs are copied but before the state write re-decides the entry once (no duplicate
  run entry); a stamp is never finalized with an unrecorded entry.
- **validateStamp**: a reused entry without its block, with a malformed block, with `ran:true`, or without
  `identity_sha256` → refused; the old no-files rule unchanged.
- **BASE-reuse interaction**: the stage-regress BASE-reuse suite still passes unchanged (identity_sha256 on runs does
  not enter `baseSpecFrom` / `evidenceRequirement`).

## Measurement

`measure.mjs <floorDir> <label>` builds a fixture with `typecheck`, `build`, `lint` (a style config touched, so regress
runs it), `test`, opens a `/pharn-loop` marker, runs `stage-regress.mjs` then `stage-verify.mjs`, and reports per
stage: gate processes (counter), reused entries, total, wall-clock; plus the in-process cost of the reuse decision.
Before = `main`'s floor (`git archive 2cf0e85 pharn/floor`), after = this branch.

## Guarantee audit (P0)

- "a reused entry is recorded only when its execution identity equals the live one" → **floor: enum-regex +
  content-hash** (the identity is a sha256 over structured inputs; the comparison is string equality) — tested.
- "the source is the stamp bytes bound at init and its logs are the bytes it recorded" → **floor: content-hash**.
- "the reused gate judged the same tree" → **floor: content-hash** (`fp_before` inside the identity), bounded by the
  fingerprint's own documented limits (content only, ignored paths outside it).
- "a reused result equals what a fresh run would produce now" → **advisory** (assumes the gate is deterministic for
  one identity and that nothing unbound — inherited env, ignored files, the machine — changed). Stated in the
  contract and the command's claims block; never a guarantee.
- "the source belongs to this delivery run" → **advisory-narrowed**: marker presence/age + an mtime order, both
  ordinary `.pharn/` state; a Bash writer or a write-tool edit during a paused regress chain can forge a consistent
  source (agreement, never provenance — L43/L65; the named follow-up `regress-paused-chain-integrity`).
- "VERIFY's coverage is unchanged" → **floor**: `resolveSet` is untouched and `validateStamp`'s coverage rule still
  requires every `required` id in `runs`.

## Trust audit (P2)

The source stamp and its logs are deterministic-tool output in writable `.pharn/`; only ints, enums, hex digests and
path/argv strings are compared, never evaluated. Log bytes are copied as opaque data and only hashed. The report's
`gate_reuse` ids are rendered fenced (gate ids are attacker-nameable).

## Determinism audit (P5)

Every branch is a membership or equality test (identity string, closed miss set, integer ranges). Every fallback is
"run the gate" — the pre-6.34.0 behaviour — never a guess and never a question.

## Applied lessons

- L24 — the wall-clock saving is measured on a fixture, not inherited; the decision's own cost is measured too.
- L29 — the identity components and the eligibility rules are each an ENUMERATION the negative-control tests iterate.
- L34 — the equivalence test asserts a non-empty reused set (a verify that reused nothing would pass vacuously).
- L35 — markers/run identity come from the BASE-reuse modules; identity lives in one module both sides use.
- L41 — the stage-verify tests run the real CLI with the pinned flags, so no default is left unexercised.
- L43 — every "HIT" is agreement over stores the writer can reach; the contract says so, never "provenance".
- L45 — the scenarios run the committed `stage-verify.mjs` entry point, not the core alone.
- L54 — every source read is `lstat`/`O_NOFOLLOW` first; absence only from ENOENT.
- L59 — a symlinked stamp or log is a MISS, tested (link to file, dangling).
- L60 — each identity component and each eligibility rule has its own mutant that must flip the result.
- L62 — any value quoted into a miss reason goes through a total function (`dataText`), and misses carry codes.
- L65 — the source record sits in `.pharn/`, reachable by a paused chain; stated as a residual, and the build (which
  precedes regress) cannot plant it because regress clears `head/` on every fresh start.

## Named residuals (not closed here)

- `verify-reuse-inherited-env` — the inherited environment is not in the identity (as for BASE reuse).
- `regress-paused-chain-integrity` — extended: a write-tool edit to the head stamp during a paused regress chain.
- Budget: a reused entry still spends one budgeted `run --next` call (instant), unchanged accounting.
- BUILD's own gate runs are not reused (out of scope by direction).

## Grill amendments (orchestrator, before the build continues)

Every grill finding is accepted (`GRILL.md`). They supersede the sections above where they conflict:

- **B1 → style gates are never reused.** `NON_REUSABLE_IDS` = ∪ `LEVEL_GATES` ∪ `STYLE_SET` ∪ `{reconcile}`, derived in
  `gate-run-core.mjs` (so `validateStamp` can use it without a cycle) and re-exported by `gate-reuse-core.mjs`. The
  representative reusable overlap is therefore `typecheck` / `type-check` / `build` (and a structural pair that lands
  in both sets). Named residual `verify-reuse-excluded-artifacts`: a `typecheck`/`build` that reads the feature's
  fingerprint-excluded artifacts (`REGRESSION.md`, `verify-report.json`, …) is unbound — the fingerprint's own bound.
- **B2 → the source is bound by an OFFER record in the git dir.** `stage-regress.mjs` discards
  `<git-dir>/pharn-regress-head-offer.json` at its fresh start and, once the HEAD stamp is finalized, publishes
  `{schema: "pharn-regress-head-offer/1", feature, run: {command, marker_sha256}, stamp_sha256}` for the current delivery
  run (none without exactly one open marker). `acceptReuseSource` (pure) now requires the offer: the current run's
  marker digest, this feature, and the head stamp's bytes equal to the bound digest. The mtime rule is dropped (the
  marker binding replaces it). The write tools cannot write the git dir (`protect-trusted-paths.cjs` denies a `.git`
  segment; a linked worktree's git dir is outside the project), so a stamp the build plants under `.pharn/` — under
  `--quick`, where no regress runs — is never offered; a ★ HOOK test runs both hooks on the record path. A Bash writer
  can still forge record + stamp together (L19 — detected-not-prevented class; stated). `run-gates.mjs init` takes
  `--reuse-sha256 <hex>` beside `--reuse-stamp`, so the bytes the offer bound are the bytes init binds.
- **I1 → `validateStamp` refuses a reused entry whose id is in `NON_REUSABLE_IDS`.**
- **I2 → the P0 wording.** "The map's values are the exit codes the runner recorded from the listed argv" now says:
  for a reused entry, recorded by the SOURCE execution's runner, named in its `reused` block. The reuse DECISION is
  tested runner code at execution time (floor for that run); nothing later re-derives it — `check-loop-fresh.mjs` is
  unchanged by direction (freshness semantics are out of scope), which is the named residual
  `verify-reuse-rederive`. "Coverage unchanged" is floor for the KEYS (`validateStamp`'s coverage rule) only.
- **I3 → the claims.** `pharn-verify.md`'s claims block gains the reuse bullet and the lost-second-sample residual,
  within the byte ceiling; `LIMITS.md` ("/pharn-verify re-runs the project's own gates") is human-only and is FLAGGED
  for the maintainer, not edited.
- **M1 → git HEAD joins the identity** (`head`, the stamp's recorded `head`, null outside git). The index stays
  unbound (named).
- **M2 → budget.** The drain is unchanged: a reused entry still spends one budgeted `run --next` call. Reuse saves gate
  processes and wall-clock inside an invocation, not Bash calls or model turns; `measure.mjs` uses the pinned flags.
- **M3–M7** → wording (`results_sha256: null` = no REGULAR results file), the named `e2e`-after-reused-`build`
  residual, the log-copy cap named (64 MiB, a miss beyond it), usage strings and CLAUDE.md updated. `fp_after` on a HIT
  stays `fp_before` by design: nothing ran in the slot, and any concurrent tree change is caught at the next entry's
  boundary (`tree-changed-between-gates`), exactly as today.

## GATE 1

Plan acceptance was **delegated to the orchestrating model** by the maintainer's prompt ("Do not stop at a proposal
or PLAN… Complete implementation, tests and validation"). Recorded as a delegated decision, not a human approval.

## Open questions (HALT)

- none — every design choice above has a stated default the prompt allows; the maintainer reviews at GATE 2.
