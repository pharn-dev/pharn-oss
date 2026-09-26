# APPLY — the human-only step for `loop-quick-mode`

This directory holds the patch that lands `LIMITS.md §3a` and `§6` — the edits this build could not make itself,
because `LIMITS.md` is Write/Edit/MultiEdit/NotebookEdit-denied (fix #2). Nothing in this directory is applied
automatically. A human runs it. `pharn/ARCHITECTURE.md` is **not** touched (the plan's D13), so the spec pin does
not move and no sibling plan needs re-pinning.

## What to read first

```sh
git apply --stat .dev/features/loop-quick-mode/proposed/human-only.patch
```

That prints a summary of what changes and where, without touching anything. Then read `human-only.patch` itself — a
plain unified diff against `LIMITS.md`.

## What `apply.sh` does

`sh .dev/features/loop-quick-mode/proposed/apply.sh`, run from the repo root:

1. Refuses on `main` (a trusted-doc commit belongs on the phase branch, merged normally).
2. `git apply --check`, then `git apply` the patch.
3. Re-runs, on the **applied bytes**: `shasum -a 256 -c human-only.sha256`, `pharn/floor/validate.mjs .` and
   `.dev/floor/check-specified-markers.mjs .`. Any failure restores `LIMITS.md` from the **index**
   (`git checkout -- LIMITS.md` — `HEAD`'s content unless you had staged edits to it) and commits nothing.
4. On success, commits **only** `LIMITS.md`, with the message
   `docs(trusted): /pharn-loop --quick in LIMITS.md (human-applied)`.

It carries no reconcile checkpoint or re-anchor: a GATE-2 apply follows the last `/pharn-dev-verify`, so no
reconciliation epoch is open for it to disturb.

## What the patch changes

- **`LIMITS.md §3a`** — 6.25.0's "The manual flag is `/pharn-ship --quick`" becomes "The **gated** manual flag", and a
  second paragraph follows on the **unattended** one, `/pharn-loop --quick` (6.27.0): the model writes and approves
  the quick SPEC, `check-loop.mjs` decides every stop over `/pharn-verify`'s verdict alone in a table the SPEC's
  pinned kind chooses, what it keeps (the grill's floor stops, test-first evidence, the scope check, the freshness
  check) and leaves out (the regression check, the plan interrogation, `RUN-REPORT.md`), and that
  `STOP_GREEN_QUICK` is not `STOP_GREEN`.
- **`LIMITS.md §6`** (GATE 1, Q1 → (a)) — the scope check's first bound, "it fires only if `/pharn-regress` runs — or
  … `/pharn-ship --quick`'s item 7", also names every `/pharn-loop --quick` iteration, which runs the same partition.

## When to apply

**At GATE 2, after the last `/pharn-dev-verify`, before this phase merges into `main`.** The chain from
`/pharn-dev-grill` through `/pharn-dev-verify` runs, and is designed to run, **green without this patch**: the only
readers of `LIMITS.md`'s bytes are `validate.mjs` CHECK 5 (the file holds neither `rule_id:` nor `problem:`) and
`check:markers` (every registered marker string is byte-identical after the edit, which the generator asserts in
memory) — `PLAN.md`, "Chain sequencing", item 1.

**The LIMITS applies are sequenced by the orchestrator (GATE 1, note D).** The sibling `stage-model-routing` patches
`LIMITS.md §8`. This patch is applied only after whichever sibling reached GATE 2 first has merged. Before applying,
regenerate against the post-merge tree:

```sh
node .dev/features/loop-quick-mode/handoff/make-patch.mjs
```

It reads the live `LIMITS.md`, requires each `find` to match exactly once, re-checks the registered markers and
CHECK 5 in memory, and runs `git apply --check` before writing `human-only.patch` and `human-only.sha256`. The sums
are **whole-file**, so any change to `LIMITS.md` outside these hunks (a sibling's §8, say) moves them: a patch
generated before that merge is refused by `apply.sh` — by `git apply --check` if a hunk no longer applies, and by the
sums otherwise — never half-applied. A regeneration prints its own sums line; read the sums from that line, never
from an earlier copy.

## The out-of-order case

If the patch is applied **before** a `/pharn-dev-verify` (a re-run after a fix, say), the applied `LIMITS.md` change
lands inside an open reconciliation epoch and `check-bash-reconcile.mjs` would report it. Re-open the epoch on the
plan's own scope before resuming — the setter first, then the anchor (the order is load-bearing: the anchor snapshots
the live scope, L38):

```sh
node .claude/hooks/set-writes-scope.cjs --from-plan .dev/features/loop-quick-mode/PLAN.md
node pharn/floor/reconcile-baseline.mjs --anchor --by pharn-dev-build
```

Then resume at `/pharn-dev-verify` (L17: a changed file the epoch did not see is an accounting question, never a
reason to hand-edit the baseline).
