# PLAN — gates-parallel-drain (decision record: measured, deferred with preconditions)

- spec_content_hash: d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4
- applied_lessons: [L24, L58, L66]
- increment: record why `/pharn-regress` keeps running its HEAD and BASE sides one after the other, with the
  measurement and arithmetic behind that decision, and name two follow-ups, each with the preconditions it needs.
  APPARATUS ONLY: no product byte changes, no `SKILLS_VERSION` bump.
- layer(s): `.dev/` (build apparatus) + a `CHANGELOG.md` `[Unreleased]` entry
- constitution_refs: [P0, P6, P7]

## GATE 1 decision (recorded as made)

The first version of this plan (commit `4d40d03`) proposed an opt-in concurrent `sides` phase in
`pharn/floor/stage-regress.mjs`. At GATE 1 the **orchestrating model, deciding under the user's delegation for this
batch** (not a human approval), answered open question 3 with **SHRINK**: do not build the phase. Its recorded reasons:

1. it would be opt-in only, so no install gains anything until a project declares it;
2. the saving is ≈ 1.5–4 min per regress, ≈ 2–5 % of the 92-minute run;
3. on by default it would put a false `typecheck` regression on the target project as configured today;
4. on that project's 8 GB machine two `next build` processes at once are likely slower, not faster;
5. it adds a new resumable phase to the most complex stage script.

This increment is therefore the record below plus the two named follow-ups.

## The trigger (P7)

Batch brief §2 finding 6, checked in `.dev/measurements/loop-wall-clock-2026-10-05.md` §5: the 92-minute `/pharn-loop`
run's second `/pharn-regress` took **660.6 s over 4 `stage-regress.mjs` calls** (134.3 / 188.0 / 146.2 / 192.1 s; exits
`continue` ×3, then `done`). HEAD `test` / `typecheck` / `build` ran, then the BASE install (17.1 s) and the same three
gates, one process at a time. The per-gate split is that record's own inference (`[R·e]`): with the pinned 540 s timeout
and 570 s budget, a call starts its first slow step unconditionally and any other only within its first 30 s, so each
long gate cost one orchestrator round trip.

## Findings (P6 — read live in this run)

### F1 — HEAD gates can read the nested BASE checkout

The BASE checkout lives inside the HEAD tree at `.pharn/pharn-regress/base` (`pharn/floor/stage-regress-core.mjs`
`REGRESS_PATHS`). `regress-base-reuse-core.mjs`'s header says why it is nested: a parent-directory search from it
(node's module resolution, npm's `.bin` PATH, tsc/prettier/eslint config lookup) reaches the HEAD root, and a
`--no-install` run resolves HEAD's `node_modules/`.

The checkout is left out of the tree FINGERPRINT (`worktree-fingerprint.mjs` excludes `.pharn/`). That does not stop a
HEAD gate from READING it. Today nothing can: the checkout is created after the HEAD side has drained and removed at
cleanup. Run the two sides at once, and any HEAD gate that globs the tree sees a second checkout being written.

The target project shows this concretely (`~/Projects/pharn-starter`, read only):

- `tsconfig.json` `include` is `**/*.ts`, `**/*.tsx`, `**/*.mts`, and `exclude` is `["node_modules", ".claude/worktrees"]`
  with no `.pharn`. A concurrent HEAD `typecheck` (`tsc --noEmit`) would type-check the base checkout too, with its
  `@/*` paths resolving into HEAD: a false `typecheck` regression;
- `vitest.config.ts` and `eslint.config.mjs` already exclude `.pharn/**`. The vitest comment names the base checkout as
  the reason, so the project has met this hazard before and closed it in two configs out of three.

Whether a project's gates read `.pharn/` is a property of its tool configs. No PHARN check can decide it (P0).

### F2 — gates are not written to run twice at once

Fixed ports, a shared local database (the target project has `test:db` against one Postgres) and fixed temp paths are
normal in a test suite written for one CI runner. A concurrent second run of the same suite in another directory can
interfere with the first, and that reads as a regression, or hides one.

### F3 — what concurrency would need from the stage script (for the follow-up's author)

- **BASE-reuse timing.** The 6.33.0 reuse decision is made after the HEAD side drains, from the FINALIZED HEAD stamp
  (`regress-base-reuse.mjs` `decideFromDisk`, `HEAD_STAMP`). Running the sides at once needs it before the BASE side
  starts. `gate-run-core.mjs` `baseSpecFrom` already reads an in-progress record, and publication already refuses a
  moved requirement (`requirement-moved`), so deciding early from `head/state.json` can only lose a reuse, never bind
  wrong evidence. The early and late requirements must be shown EQUAL on the happy path, or concurrency quietly turns
  6.33.0's reuse off (L58: the in-progress record is a referent still being written).
- **The budget counts completed steps.** `stage-runtime.mjs` `makeBudget` calls `spent()` after a step. With two lanes
  it must count STARTS; otherwise lane B can start its "first" step at, say, elapsed 200 s while lane A's runs, and end
  at 740 s, past the 600 s Bash cap.
- **`emit*` prints, then throws** (`stage-regress.mjs` `emit`). A lane that emitted would print while the other lane's
  child still ran, and two lanes could print two documents. Lanes must return results; one coordinator prints once,
  after every child of the invocation has exited (L66).
- **`/pharn-verify` runs in one tree**, so running the sides at once cannot help it.

### F4 — contention, measured once (L24)

On this machine (Apple M2, 8 cores, 8 GB; load average 19.8 / 36.1 / 32.1 from the other builders), one CPU-bound
`node --test` set (`gate-run-core`, `check-regress`, `worktree-fingerprint` tests):

| run                 | wall (s) |
| ------------------- | -------: |
| alone, first        |     4.46 |
| alone, second       |     4.47 |
| twice in sequence   |     8.93 |
| twice, concurrently |     5.60 |

Concurrency saved 37 % of the wall clock, and each run was about 25 % slower than alone. That is one sample under heavy
load. `next build` is far more parallel and memory-hungry than `node --test`, and with 8 GB two builds at once can
swap and finish later than in sequence.

### F5 — the arithmetic for the 92-minute run

Inputs: per-gate times from the measurement record's inference (`test` ≈ 130 s, `typecheck` ≈ 7 s, `build` ≈ 180 s per
side), install 17.1 s, a contention factor of 1.25 from F4, and the unchanged 30 s start window. The factor is an
EXTRAPOLATION: it was measured on `node --test`, not on `vitest` or `next build` (grill finding, P0).

- **BASE `test` starts in call 1** (worktree and install finish inside the window): call 1 ≈ 150 × 1.25 ≈ 190 s, call
  2 ≈ 187 × 1.25 ≈ 235 s. **≈ 425 s in 2 calls, so −235 s and −2 round trips.**
- **BASE `test` misses the window** (an install slowed past ≈ 25 s): call 1 ≈ 165 s, call 2 ≈ 235 s, call 3 ≈ 187 s.
  **≈ 587 s in 3 calls, so −75 s and −1 round trip.**

Net: ≈ 1.5–4 min per regress invocation, reachable only after the project opts in and, for the target project, adds
`.pharn` to `tsconfig.json` `exclude`. The 92-minute run (5,505 s) had one measured regress, so ≈ 1.5–4.5 % of it: 75–235 s plus one or two
orchestrator round trips. The GATE 1 reasons above quote "2–5 %" as the GATE-1 report stated it; this line is the
corrected figure (grill finding, P0).

## Named follow-ups (not built)

### `regress-base-outside-tree` — the precondition for running the sides at once

Move the BASE checkout out of the HEAD tree, so no HEAD gate can glob it (closes F1 for every project, with no
per-project config). Preconditions before it can be built:

1. a base location outside the project, and a stated owner for it (the git dir or the OS temp root), reachable by the
   stage's `fs` writes but not inside another git tree the write guards judge;
2. a decision on `--no-install`: today the nested checkout resolves HEAD's `node_modules/` by walking up; outside the
   tree it resolves nothing, so `--no-install` either keeps a nested fallback or is redefined, and that change of what a
   BASE result means is disclosed;
3. parent-directory config search re-examined: the BASE gates would no longer reach HEAD root files, so
   `regress-base-reuse-core.mjs`'s `head_root` binding changes meaning (likely dropped), and base results may change
   for projects whose base commit lacks a root config the HEAD root has;
4. F2 still holds after the move: concurrency stays opt-in by the project (ports, databases, temp paths), with the
   default sequential path byte-identical;
5. F3's three stage-script changes (early reuse decision with an equality test, start-counting budget, one
   coordinator that emits after every child exits).

Trigger to reopen (P7): a measured `/pharn-loop` or `/pharn-ship` run, after this batch's other items have landed, in
which `/pharn-regress`'s wall clock is still one of the two largest buckets. (The first draft also named "a project that
has opted in". No opt-in was built, so that trigger could never fire; it was removed after a grill finding.)

### `gates-within-side-parallel` — the only lever for `/pharn-verify`

Run several gates of ONE side at once (style ∥ test ∥ typecheck; e2e still after build; `reconcile` still last).
Preconditions before it can be built:

1. a contract change: the stamp's "one tree state" claim IS the `fp_after[k-1] == fp_before[k]` chain (`run-gates.mjs`
   finalize refuses `tree-changed-between-gates`). Overlapping gates break its meaning, so `gate-run-record.md`,
   `validateStamp`, check-loop-fresh J/E and the 6.34.0 reuse identity's `fp_before` all need a new rule (for example a
   group fingerprint before and after a parallel group);
2. a declared, closed set of gates that may overlap, because gates write files other gates read. In the target
   project `tsconfig.json` includes `.next/types/**/*.ts`, which `next build` writes, so `typecheck` ∥ `build` reads
   half-written files;
3. F2 and F4 apply here too: same tree, same ports and databases, and on a small machine CPU and memory contention.

Trigger to reopen (P7): verify's wall clock measured as a top bucket on a run that otherwise ends green.

## Files

- `.dev/features/gates-parallel-drain/PLAN.md` — this decision record — layer `.dev`
- `.dev/features/gates-parallel-drain/GRILL.md` — `/pharn-dev-grill`'s log — layer `.dev`
- `.dev/features/gates-parallel-drain/SHIP.md` — the ship record — layer `.dev`
- `CHANGELOG.md` — one `[Unreleased]` entry dated 2026-10-05 (repo-meta; no bump)

## Contracts satisfied

None changed. The record cites `gate-run-record.md`, `stage-exit.md` and `regression-report.md` as they are (P4).

## Evals to write (P1)

None: no capability and no floor code change.

## Guarantee audit (P0)

- Every measured figure is labelled with its source (this run's sample, or the measurement record's `[R·m]` / `[R·e]`
  labels); the saving is ADVISORY arithmetic over an inferred per-gate split.
- F1 is an observation of one project's config files, not a claim about every project. No floor check is claimed for
  it, because none can decide it.
- No sentence here says the current sequential path is fast or sufficient; it records only why it is kept.

## Applied lessons

- L24 — the speed claim was re-measured for this mechanism (F4, one sample, labelled) instead of assumed, and every
  saving below it is labelled as arithmetic over an inferred split.
- L58 — F3 records that an early reuse decision reads a referent still being written (the in-progress HEAD record and
  root files HEAD gates may change) and names the equality test the follow-up must pin.
- L66 — F3 records that no lane may print or be read until every child of the invocation has exited.

## Open questions (HALT)

None: GATE 1 answered all three (above).
