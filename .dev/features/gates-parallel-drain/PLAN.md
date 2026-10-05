# PLAN — gates-parallel-drain

- spec_content_hash: d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4
- applied_lessons: [L24, L41, L58, L66]
- increment: an OPT-IN concurrent mode for `/pharn-regress` — the HEAD side and the BASE side run at the same time
  (each side still one gate at a time, so the stamp contract is unchanged), declared by the project in
  `pharn.config.json` `{"regress": {"sides": "concurrent"}}`; absent, the stage is byte-identical to today.
- layer(s): pharn/floor (product floor stage script + its runtime + its pure core), pharn-contracts (prose)
- constitution_refs: [P0, P2, P3, P5, P6, P7]
- version: provisional 6.44.0 (minor — a new stage behaviour a project can turn on); the orchestrator assigns the
  final number at stacking.

## Why (P7 — the recorded trigger)

Batch brief §2 finding 6, checked in `.dev/measurements/loop-wall-clock-2026-10-05.md` §5: the 92-minute
`/pharn-loop` run's second `/pharn-regress` took **660.6 s over 4 `stage-regress.mjs` calls** (134.3 / 188.0 / 146.2 /
192.1 s, exits `continue` ×3 then `done`), HEAD `test`/`typecheck`/`build` then BASE install (17.1 s) + the same
three gates, strictly one process at a time. The per-gate split is the record's own inference (§5, `[R·e]`): a call
starts its first slow step unconditionally and another only within the first 30 s (540 s timeout, 570 s budget), so
each long gate cost one orchestrator round trip.

## What discovery found (P6 — read this run, and it changes the brief's direction)

1. **"The BASE worktree is fingerprint-excluded" is true and is NOT enough to make the two sides independent.** The
   base worktree is NESTED in the HEAD tree at `.pharn/pharn-regress/base` (`stage-regress-core.mjs` `REGRESS_PATHS`;
   `regress-base-reuse-core.mjs`'s header explains why it must stay nested: parent-directory search, and `--no-install`
   resolving HEAD's `node_modules/`). Excluding it from the FINGERPRINT says nothing about whether a HEAD gate READS it.
   Today it never can: the worktree is created after the HEAD side has drained and removed at cleanup. Run
   concurrently, a HEAD gate that globs the tree sees a second checkout being written.
   **Measured in the evidence project itself** (`~/Projects/pharn-starter`, read-only): `tsconfig.json` `include`
   is `**/*.ts` / `**/*.tsx` with `exclude: ["node_modules", ".claude/worktrees"]` — no `.pharn` — so a concurrent
   HEAD `typecheck` (`tsc --noEmit`) would type-check the base checkout too (its `@/*` paths resolving into HEAD). Its
   `vitest.config.ts` and `eslint.config.mjs` already exclude `.pharn/**` (the vitest comment names the base checkout),
   so the hazard is real and only partly closed there. Nothing PHARN can run decides whether an arbitrary gate reads
   `.pharn/` (P0: it is a property of the project's tool configs), so the mode is **opt-in, declared by the project**,
   and its precondition is stated where the declaration is documented. Default-on would turn a missing `exclude`
   into a false `typecheck` regression.
2. **Gates are not written for concurrent runs.** Fixed ports, a shared local database (`pharn-starter` has
   `test:db` against one Postgres), fixed temp paths. Another reason the mode is opt-in.
3. **The BASE-reuse decision (6.33.0) is made after the HEAD side drains** (`runPhases`, `drain-head`), reading the
   FINALIZED head stamp (`regress-base-reuse.mjs` `decideFromDisk`, `HEAD_STAMP`). Concurrency needs the decision
   BEFORE the base side starts. `gate-run-core.mjs` `baseSpecFrom` already reads an IN-PROGRESS record (its own comment:
   "both sides are initialized before either runs"), so the decision can be made right after head-init from
   `head/state.json`. Publication already re-derives the requirement and refuses a moved one (`requirement-moved`), and
   a persisted HIT is already re-decided in full at `verdict` — so an early decision cannot bind wrong evidence; at worst
   it loses a reuse (stated below, and pinned by a test that the early and late requirements are EQUAL on the happy
   path, so concurrent mode does not silently disable 6.33.0's reuse).
4. **The budget tracker counts COMPLETED slow steps** (`stage-runtime.mjs` `makeBudget`: `spent()` after the step).
   With two lanes, a completion count would let lane B start its "first" step at, say, elapsed 200 s while lane A's
   first step runs — ending at 740 s, past the 600 s Bash cap. The concurrent path must count STARTS.
5. **`emit*` prints the JSON document and then throws** (`stage-regress.mjs` `emit`). Inside a lane, that would print
   while the other lane's child still runs, and a second lane could print a second document. Lanes must RETURN, and
   one coordinator emits once, after both lanes have settled (L66: never read or act while a writer is live).
6. **`/pharn-verify` runs in ONE tree**, so side-concurrency does not apply to it; within-side parallelism (below) is the
   only lever there and it is deferred.

## Design

### The declaration (pure, `stage-regress-core.mjs`)

`readRegressSides(text)` over the project root's `pharn.config.json` TEXT (`null` = absent), closed in both directions
(L36): no file / no own `regress` key → `sequential`; `regress` must be a plain object whose only key is `sides`;
`sides` ∈ `SIDES_MODES = ["sequential", "concurrent"]`. Anything else → `{mode: "sequential", refused: <reason>}`:
**fall back to the stage's existing behaviour and DISCLOSE it** (stderr note + a `REGRESSION.md` line), never refuse
the stage. Rationale: both modes compute the same verdict by construction; a typo costs speed, not correctness, and
blocking a regress run over a speed preference is worse. (Open question 2.) Read once at the FRESH start; a resume
continues the mode its phase implies.

### The concurrent path (`stage-regress.mjs`)

After `head-init` (unchanged), when the mode is `concurrent`:

1. **Early reuse decision** — `decideFromDisk({... headStampPath: <head>/state.json})` (new optional parameter,
   default `HEAD_STAMP`, so every existing caller is unchanged).
   - **HIT → the existing sequential path, untouched** (`phase: "drain-head"`, `baseReuse: null`): it drains HEAD and
     re-decides as today. Nothing to overlap when the base side is reused.
   - **MISS → new phase `"sides"`** with `baseReuse` = that miss decision and a new progress field
     `baseLane ∈ {worktree, install, base-init, drain-base, done}`.
2. **Phase `"sides"`** runs two lanes over ONE shared budget tracker:
   - HEAD lane: drain `head/` (async `run --next`, one gate at a time), then publish the HEAD offer (6.34.0, same call
     as `drain-head`).
   - BASE lane: from `baseLane`: `worktree` (discardRetained + clearBaseWorktree + `git worktree add`, as today) →
     `install` (spawnGate, as today, recording `installResult`) → `base-init` (`--spec-from head/`, which reads the
     IN-PROGRESS head record — already supported) → `drain-base`. Each step advances `baseLane` and re-persists the
     record (checkpoint at every step, as `runPhases` does at every phase).
   - Lanes never emit. Each returns `done | budget | fail{reason_code, detail}`. When a lane FAILS, the coordinator
     stops the other lane from STARTING another step and AWAITS its in-flight step (bounded by `--timeout-ms`), then
     emits the failure (HEAD's first if both failed). So no child of this invocation is still writing when the
     document is printed, and no lane's half-done evidence is read: a side's evidence is read only through its
     finalized `stamp.json`, which the verdict alone consumes (L66).
   - Both `done` → `phase: "verdict"`, exactly today's verdict/cleanup/render. Either `budget` → persist
     (`phase: "sides"`, `baseLane`) and exit 5 `continue`; `--resume` re-enters `"sides"` (the HEAD drain is
     idempotent: run-gates exits 3 once finalized).
3. **Budget, counted by STARTS** (`makeBudget().claim()`, additive: `may()` + count in one synchronous call). A slow
   step starts only if it is the invocation's first claimed one OR `elapsed + timeoutMs <= budgetMs`, so every step of
   an invocation ends by `max(first-start + timeout, budget)` — the same bound the sequential path has; the 600 s Bash
   cap holds exactly as today with the pinned 540000/570000.
4. **Async drain** `drainGatesAsync` in `stage-runtime.mjs` (one owner), sharing a factored-out result interpreter
   with `drainGates` so the two cannot diverge (exit 3 = done, non-0/unparsable = refused, `finalized|remaining 0` =
   done). The sequential `drainGates` keeps its bytes of behaviour.

What stays IDENTICAL, and why it is sound: each side's stamp is still produced by ONE `run-gates.mjs` drain, one gate at
a time, into its own `--out` (`head/`, `base-gates/`), its own lock, its own logs — so `fp_after[k-1] == fp_before[k]`,
`validateStamp`, `check-regress.mjs verdict`, check-loop-fresh J/E/G/H, the 6.34.0 reuse identity and the 6.33.0 reuse
predicate are untouched. No path is written by both lanes: HEAD writes `head/` + the git-dir offer; BASE writes
`base-gates/`, `base/`, `install.out|err`; the progress record is written only by the coordinator's single thread.

### Disclosure

`REGRESSION.md` gains one line: `sides: concurrent (pharn.config.json regress.sides)` or, on a refused declaration,
`sides: sequential — pharn.config.json regress.sides was refused: <reason quoted as DATA>`. Nothing for the default
(byte-identical render, pinned). No JSON report key (no machine consumer; P7).

### Deferred, named (not built here)

- **`gates-within-side-parallel`** — running gates of ONE side at once (style ∥ test ∥ typecheck). Not sound in this
  increment: the stamp's "one tree state" claim IS the `fp_after[k-1] == fp_before[k]` chain (run-gates finalize
  refuses `tree-changed-between-gates`), and overlapping gates break its meaning — a contract change to
  `gate-run-record.md`, `validateStamp`, check-loop-fresh J/E and the 6.34.0 identity's `fp_before`. And the evidence
  project shows the hazard concretely: `tsconfig.json` includes `.next/types/**/*.ts`, which `next build` writes, so
  `typecheck` ∥ `build` reads half-written files. This is also the only lever for `/pharn-verify`.
- **`regress-base-outside-tree`** — moving the base checkout out of the HEAD tree would remove precondition 1, but it
  changes what BASE results mean (`--no-install` resolution, parent-directory config search; `regress-base-reuse-core`
  binds `head_root` because of the nesting), so it is its own increment.

## Expected saving (L24 — measured where possible, inferred where the record infers)

**Contention, measured on this machine (Apple M2, 8 cores, 8 GB, load average ~20–36 from the other builders):** one
CPU-bound `node --test` set (`gate-run-core`, `check-regress`, `worktree-fingerprint`): 4.46 s alone, twice in
sequence 8.93 s, twice concurrently **5.60 s wall** (each run slowed ~25%) — saving 37%. One sample under heavy load;
`next build` is far more parallel and memory-hungry than this, and on an 8 GB laptop two at once can swap and run
SLOWER than in sequence. That is the second reason for opt-in.

**The 92-minute run's regress (660.6 s, 4 calls), re-planned with lanes** (per-gate times from the record's inference:
test ~130 s, typecheck ~7 s, build ~180 s per side; install 17.1 s; contention factor 1.25 from the sample above):

- base `test` starts in call 1 (worktree + install end within the 30 s window): call 1 ≈ 150×1.25 ≈ 190 s, call 2 ≈
  187×1.25 ≈ 235 s → **≈ 425 s in 2 calls: −235 s and −2 round trips**;
- it misses the window (install slowed past ~25 s): call 1 ≈ 165 s, call 2 ≈ 235 s, call 3 ≈ 187 s → **≈ 587 s in 3
  calls: −75 s and −1 round trip**.

So **≈ 1.5–4 min per regress invocation, and only after the project opts in** (and, for pharn-starter, adds `.pharn` to
`tsconfig.json` `exclude`). The 92-minute run had one measured regress, so ≈ 2–5 % of it. Honest: this item is small next
to the brief's other buckets; its value grows with the number of regress iterations a loop runs.

## Files

- pharn/floor/stage-regress.mjs — read the declaration at the fresh start; early reuse decision; the `"sides"` phase
  (two lanes, one coordinator, one emit); render/progress carry the mode — layer floor
- pharn/floor/stage-regress-core.mjs — `SIDES_MODES`, `readRegressSides`, `BASE_LANE_STEPS`; `"sides"` in `PHASES`
  (resumable); `validateProgress` admits phase `"sides"` with `baseLane` + a miss decision, and the optional `sides`
  disclosure field (schema stays `/2`: both are optional additions, the `installResult.ms` precedent) — layer floor
- pharn/floor/stage-runtime.mjs — `makeBudget().claim()`; `drainGatesAsync` + the shared result interpreter — layer floor
- pharn/floor/regress-base-reuse.mjs — `decideFromDisk` optional `headStampPath` (default unchanged) — layer floor
- pharn/floor/render-regression.mjs — the one `sides:` disclosure line — layer floor
- pharn/floor/stage-regress.test.mjs — end-to-end: default byte-identical; concurrent run overlaps (membership, not a
  stopwatch: each side's gate records the other's marker file while it runs); budget `continue` + resume from
  `"sides"`; a failing lane awaits the other; early-HIT keeps the sequential path; refused declaration falls back +
  discloses; early == late requirement (reuse still publishes) — tests
- pharn/floor/stage-regress-core.test.mjs — `readRegressSides` closure both ways; progress validation of `"sides"` — tests
- pharn/floor/stage-runtime.test.mjs — `claim()` start-counting; `drainGatesAsync` ≡ `drainGates` on the shared cases — tests
- pharn/floor/render-regression.test.mjs — the disclosure line, and its absence by default — tests
- pharn/floor/regress-base-reuse.test.mjs — `headStampPath` over an in-progress record yields the finalized requirement — tests
- pharn/pharn-contracts/regression-report.md — the declaration, its precondition (gates must not read `.pharn/`, must
  tolerate a concurrent run of themselves), the fallback, the bounds — layer contracts
- pharn/pharn-contracts/stage-exit.md — the checkpoint/kill paragraph names `"sides"` beside `"drain-head"` — layer contracts
- .claude/commands/pharn-regress.md — the kill paragraph's "From drain-head onward" names `"sides"` (a few bytes; no
  new step) — product command
- CLAUDE.md — a short paragraph in the stage-regress block (repo-meta)
- CHANGELOG.md, SKILLS_VERSION, README.md (badge) — version 6.44.0 provisional
- .dev/features/gates-parallel-drain/PLAN.md, GRILL.md, BUILD.md, REGRESSION.md, VERIFY.md, REVIEW.md, SHIP.md — audit trail

## Contracts satisfied

- `stage-exit.md` — the envelope, exit codes and resume protocol are unchanged; `"sides"` is one more of the stage's own
  phase names in a `continue` (the contract leaves phase names to the stage).
- `gate-run-record.md` — unchanged; each side is still one sequential drain.
- `regression-report.md` — the report JSON is unchanged; the `base_evidence` block keeps its meaning.

## Evals to write (P1)

No capability (`role:`) is added; the floor modules carry `*.test.mjs` coverage as listed in `## Files`.

## Guarantee audit (P0)

- The declaration is read as a closed set (`sequential | concurrent`, one key) → floor: enum-regex (tested).
- Each side's stamp still satisfies the per-side tree-state chain → floor: content-hash (run-gates' fingerprint chain,
  unchanged code).
- No invocation starts a slow step that can end after `max(first start + timeout, budget)` → floor: tested code
  (`claim()` start-counting, a unit test drives two lanes through it).
- One JSON document per invocation, printed only after both lanes settled → floor: tested code (a test fails one lane
  while the other sleeps and asserts the other's gate log is complete when the document appears).
- **That the project's gates do not read `.pharn/` and tolerate a concurrent run of themselves → ADVISORY**, the
  project's own declaration; PHARN cannot decide it. A violation can produce a false regression or a false green; the
  mode is disclosed in REGRESSION.md so a reader can see it ran.
- **That concurrent is FASTER → ADVISORY**, measured once (above); contention can make it slower on a small machine.
- The early reuse decision can only lose a reuse, never bind wrong evidence → floor: the unchanged publication predicate
  (`requirement-moved`) and the unchanged full re-decision of a HIT at `verdict`.

## Trust audit (P2)

- `pharn.config.json` is untrusted project data: parsed as JSON, keys tested by own-property (L15), the value used only
  after a membership test; a refusal reason quotes a key through `quote-core.mjs` `shown()` and renders it as DATA
  (`quoteData`) in REGRESSION.md. Nothing in it is executed.
- No new free text reaches a decision.

## Determinism audit (P5)

- Mode: a membership test on a closed set; anything else → the conservative existing path, disclosed.
- Lane outcome → one closed result kind; coordinator order fixed (HEAD's failure first).

## Applied lessons

- L24 — the speed claim is re-measured for THIS mechanism (the contention sample above) and labelled advisory; the
  concurrency tests assert MEMBERSHIP (each side's gate saw the other's marker), never a stopwatch threshold.
- L41 — the default (no declaration) is the production path for every install: a test runs the stage with NO
  `pharn.config.json` and pins the render and the report byte-identical to a pre-change fixture.
- L58 — the early reuse decision binds a requirement computed from a referent still being written (the in-progress
  HEAD record, root files HEAD gates may still change): the fixed part (the spec) is pinned equal to the finalized one
  by a test; the moving part (`head_root`) is left to the unchanged publication check, which refuses a moved requirement.
- L66 — no lane's result is read, and no document emitted, until every child of the invocation has exited; evidence is
  read only from a side's finalized stamp.

## Open questions (HALT)

1. Opt-in via `pharn.config.json` `regress.sides` (my recommendation), or default-on with an opt-out? Default-on would
   reach every install with no action, but discovery shows it would put a false `typecheck` regression on the evidence
   project as configured today.
2. On a malformed declaration: fall back to sequential and disclose (recommended), or refuse the stage like
   `gates.exclude` does?
3. Is the expected saving (≈ 1.5–4 min per regress, opt-in) worth the added phase, or should this increment shrink to
   the measurement + the two named follow-ups?
