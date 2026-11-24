# PLAN — early-marker-refusal

- spec_content_hash: f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d
- applied_lessons: [L35, L29]
- increment: `/pharn-loop` (Step 1a) and `/pharn-ship` (Step 2.1) run the build anchor's own epoch-owner test at entry,
  through a new read-only `reconcile-baseline.mjs --check-epoch <name>` mode, and stop before any stage runs when
  another feature's open run owns the reconcile epoch (CORE-343).
- layer(s): product floor (`pharn/floor/`), product commands (`.claude/commands/`), pharn-contracts (prose)
- constitution_refs: [P0, P4, P5, P6, P7]

## Applied lessons

- L35 — the entry check is the SAME function the anchor runs (`epochOwnerOpen`), called from a new CLI mode of the
  module that owns it; no second copy of the open-run rule is written in the command or another checker, so there is
  nothing to keep in sync with the anchor.
- L29 — the remedy ranges over a set of callers and refusal branches: both entry callers (`/pharn-loop` Step 1a and
  `/pharn-ship` Step 2.1) get the line and a test each, and the CLI tests cover both refusal branches (attributed owner;
  unreadable record) plus the non-refusals (same feature, no baseline, legacy null snapshot).

## The failure (P7)

CORE-310 attempt 1 (pharn-app, 7.22.0) was killed by a host reboot during build, leaving
`pharn/.run/pharn-loop/profile-todo-cleanup/active.json` open and a baseline whose `scope_snapshot` names that feature.
A fresh `/pharn-loop` for any other slug within 24 h runs entry, spec, plan, grill, triage and test (about 41 minutes
measured in attempt 1) before build Step 0's `reconcile-baseline.mjs --anchor` refuses via `epochOwnerOpen`. Nothing at
entry looks. A real failure, measured; not hypothetical.

## Approach

1. `pharn/floor/reconcile-baseline.mjs` gains one mode, `--check-epoch <name>` (`--base <dir>` as for the others). It
   validates `<name>` with `FEATURE_SLUG_RE` (exit 2 on a bad or missing name), then calls
   `epochOwnerOpen(root, { set_by: "pharn/features/<name>/PLAN.md" })` — the scope record the build's Step-0 setter
   will write for that feature, so `activeFeatureSlug` derives exactly `<name>`. Refusal → exit 2 with
   `epochRefusalMessage` (its head reworded for the check: "refusing to start"); otherwise one stdout line, exit 0. It
   reads only the baseline and `lstat`s markers: no git, no write. The `--anchor` path is unchanged (its test stays
   at the build). The edit is confined to `main()`'s argv parse, the message head parameter and the header/usage
   comment — nothing in `enumerate()` / hashing (CORE-346 is editing near there).
2. `/pharn-loop` Step 1a: a new paragraph at the end of item 3 (after S3's base capture, BEFORE item 4's `mkdir` /
   snapshot and the marker `--open`), so a refusal writes nothing at all:
   `node pharn/floor/reconcile-baseline.mjs --check-epoch '<name>'`. Non-zero → STOP, S9 (`blocked: stage-refused`),
   no feature directory, no marker → straight to the Step 7 summary, quoting the refusal's stderr as DATA; the
   loop never runs the `--close` line the message names (a human decides the run is dead). The S9 row names this
   line too. One grant added: `Bash(node pharn/floor/reconcile-baseline.mjs --check-epoch *)`. The quick part says
   "Step 1a runs unchanged", so it needs no edit.
3. `/pharn-ship` (`pharn-ship-stages.md` Step 2.1): the same line right after the base capture and before
   `run-marker.mjs --open`; non-zero → STOP before `/pharn-plan`, through Steps 3 and 3a like every STOP, presenting the
   refusal and handing to the human. Ship's `<name>` exists only after `/pharn-spec`, so the earliest point after GATE 1
   is here; it still saves plan, grill and test.
4. Contract `reconciliation-record.md §1`: the "CLI takes no new argument" sentence becomes a statement of the
   read-only check mode and its two callers; the guarantee-audit bullet gains the entry check (same FLOOR-within-bounds;
   running it is ADVISORY, a Bash call).
5. Floor guide `.dev/guides/floor-checks.md` (apparatus): the reconcile section's comment + usage line.
6. `SKILLS_VERSION` 7.23.0 → **7.24.0 (minor: a newly shipped checker mode and command step)**; CHANGELOG section;
   README badge (`check:badge`).

## Files

- `pharn/floor/reconcile-baseline.mjs` — the `--check-epoch <name>` mode, message head parameter, header — product floor
- `pharn/floor/reconcile-baseline.test.mjs` — CLI pins for the check mode (both refusal branches, non-refusals, bad name,
  writes nothing) and an executed run of each command's pinned line — test (apparatus)
- `.claude/commands/pharn-loop.md` — Step 1a epoch check line, S9 row, one grant — product command
- `.claude/commands/pharn-ship-stages.md` — Step 2.1 epoch check line — product command part
- `.dev/floor/command-hygiene.test.mjs` — ordering pins (loop: after S3, before the snapshot/`--open`; ship: after the
  base capture, before `run-marker.mjs --open`); a byte-ceiling row raised only if measured over — test (apparatus)
- `.dev/floor/stage-load-budget.test.mjs` — a `STAGE_LOAD_CEILINGS` row raised only if the loop/ship load set is measured
  over — test (apparatus)
- `.claude/commands/pharn-ship-quick.md` — item 3's restated Step 2.1 order gains the epoch check (GRILL F1) —
  product command part
- `pharn/pharn-contracts/reconciliation-record.md` — §1 check mode + guarantee-audit bullet — pharn-contracts
- `.dev/guides/floor-checks.md` — reconcile section comment + usage — apparatus
- `SKILLS_VERSION` — 7.24.0 — repo meta
- `CHANGELOG.md` — 7.24.0 section — repo meta
- `README.md` — version badge — repo meta
- `pharn-install.json` — regenerated by `npm run docs:generate` (the install manifest records shipped bytes and the
  version) — generated

## Grill dispositions

- F1 (quick ship part restates the order) → fixed: `pharn-ship-quick.md` added to `## Files`.
- F2 (which close line a pre-marker stop runs) → the loop text says the stop runs no `--close` at all: no marker of
  its own is open yet, and the owner's marker is a human's to close.
- F3 (exit 2 overloaded) → tests assert the bad-name stderr and the refusal stderr separately.
- F4 (pre-approved `--close *` grant) → stated in the loop step and as a bound in the contract; advisory.

## Build restart (recorded)

The first build pass anchored without `pharn-install.json` in `## Files`, and `docs:check` then reported it drifted.
Adding it after the anchor would read as `plan-widened-after-anchor`. So the build restarted from Step 0: the pass's
edits were saved as a patch, the tree restored to HEAD, the plan amended, the setter and anchor re-run, and the patch
re-applied, so every edit of this increment still lands inside the reconcile window.

## Contracts satisfied

- `pharn/pharn-contracts/reconciliation-record.md` §1 — the epoch-owner rule is unchanged; the check mode is a second
  caller of the same predicate (cited, not restated, in the commands).

## Evals to write (P1)

No new Capability (no `role:` file), so no evals/cases; the behavior is pinned by `node --test`:

- check mode, baseline of feature `a` + open `pharn-loop/a` marker, name `b` → exit 2, stderr names `a` and
  `require-loop-record.cjs --close a`; same with a `pharn-ship/a` marker → names `run-marker.mjs --close pharn-ship a`.
- check mode, unreadable baseline + another feature's open marker → exit 2, "cannot be read".
- check mode, name == owner, no baseline, legacy null snapshot, owner marker absent or > 24 h → exit 0.
- check mode, bad/missing name → exit 2; the tree (baseline bytes, no new files) is unchanged after every case.
- each command's pinned line, extracted from the command text, executed in the refusing sandbox → non-zero.
- command-hygiene: loop line sits after `git rev-parse HEAD` (S3) and before the `mkdir -p pharn/.run/pharn-loop`
  snapshot line; ship line after `git rev-parse --verify HEAD` and before `run-marker.mjs --open pharn-ship`.

## Guarantee audit (P0)

- "the check mode refuses exactly when the anchor would, for that feature" → floor: enum-regex (the same
  `epochOwnerOpen`: slug regex, closed directory membership, lstat error-code membership, integer age compare); the
  synthesized scope is the build's own `set_by` form — bound: the build anchors against the scope the setter writes,
  so if a plan's `set_by` ever differed from `pharn/features/<name>/PLAN.md` the two could disagree (today both
  stages' setters write exactly that path).
- "a loop/ship stops at entry instead of at build" → advisory (a Bash line a model runs, L19); the anchor's own
  refusal stays as the backstop between entry and build.
- "the check writes nothing" → floor by test (no write call in that branch; the test compares the tree).
- Liveness (pid/session) is still NOT checked — presence + 24 h age only, as at the anchor. Stated, not fixed (P7: the
  ticket asks only to move the existing test earlier).

## Trust audit (P2)

- The marker directory names and the baseline are Bash-writable state; every interpolated name in the message already
  passed `FEATURE_SLUG_RE`, and `<name>` was validated by `feature-name.mjs` (loop S1 / spec Step 0) and again by the
  check. The refusal text is quoted to the human as DATA; the loop never executes the `--close` line it names.

## Determinism audit (P5)

- The command branches only on the line's exit code (0 → continue, non-zero → STOP).

## Open questions (HALT)

None blocking. Decisions for the orchestrator (GATE 1): exit 2 for a refusal (as `--anchor`, rather than a distinct
code); S9 rather than a new stuck point; ship check at Step 2.1 (post-GATE-1) rather than before GATE 1; minor bump.
No protected file is needed (`require-loop-record.cjs` is not touched).
