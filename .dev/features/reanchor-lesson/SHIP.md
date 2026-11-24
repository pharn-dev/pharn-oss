# SHIP — reanchor-lesson

`/pharn-dev-ship` run, 2026-11-23 to 2026-11-24, in the git worktree `~/Projects/pharn-measure/reanchor-lesson` on
branch `docs/reanchor-lesson` (base `0b2ec87a`). Intent, from the maintainer's chat: "promote the lesson with
pharn-dev-ship" — the lesson the CORE-314 run proposed in `.dev/features/delegated-signoff-2026-11-23/REVIEW.md`.

## Stages, in order

1. `/pharn-dev-plan` → `PLAN.md` (`check-plan-lessons` GREEN; setter `--check` exit 0).
2. **GATE 1 — decided by the model under the maintainer's delegation, not a human approval.** The maintainer's
   standing instruction for this batch is "You make all decisions, do not ask me"; the plan was accepted as written.
3. `/pharn-dev-grill` → `GRILL.md` (advisory; 3 minor/important concerns, none blocking).
4. `/pharn-dev-build` → `CHANGELOG.md` entry; Step 0 setter then `--anchor` once; floor GREEN.
5. `/pharn-dev-regress` → iteration 1 `regressions` (one load-timing test under host load 236), re-run whole once the
   load fell below 20 → iteration 2 `no-regressions` (`REGRESSION.md` records both).
6. `/pharn-dev-verify` → `PASS`, reconcile `CLEAN` with `reconciled: 1`.
7. `/pharn-dev-review` → `REVIEW.md` GREEN (0 floor-gate, 3 advisory findings).
8. **GATE 2 — decided by the model under the same delegation, not a human approval:** merge. Every floor verdict is
   green; the three advisory findings are recorded, not fixed (two are wording in this feature's own plan and the
   CHANGELOG entry's timing, now true; one is the `type` choice the maintainer saw at the promote gate).
9. Step 2b → the CORE-314 candidate, re-drafted after the grill's P7 finding. Step 2b.3's question ("take this
   candidate to `/pharn-dev-memory-promote`?") was answered by the maintainer's own chat request to promote it. The
   promote command's own gate (Step 5) asked the maintainer through an interactive form with the full rendered entry;
   the maintainer selected **Accept & write**. `check-provenance.mjs` GREEN before the gate and again before the write;
   the canon content-hash matched its Step-1 pin; the scope was the one canon file, amended onto the epoch.
   `gen-lessons-index.mjs` regenerated the index; `check-lessons-index.mjs` GREEN.
10. Step 2c → `check:changelog-entry` exit 0.

Where the run ended: **GATE 2**, then the promotion.

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

- Review: `.dev/features/reanchor-lesson/REVIEW.md` (GREEN; 0 floor-gate findings, 3 advisory).
- Grill log: `.dev/features/reanchor-lesson/GRILL.md` (advisory).

changelog-entry: exit 0

lesson: promoted L85

deferred: regress iteration 1's `pharn/floor/entry-gates.test.mjs` "CLI cache (AC3)" red under host load 236 (passes
alone in 12.4 s and in iteration 2) — the known load-timing class, not proposed this run.

## Orchestration deviations (advisory)

- Build Step 2b formatted its one scoped path (`CHANGELOG.md`) by name, not through the pinned `PICK | xargs` block:
  this worktree-isolated session refuses compound shell lines that name git. Same files, same tools.
- Regress ran its base and head sides through a scratch node runner (argv-array spawns), and verify's last six
  `run --next` calls ran one at a time from one background node process; each is described in its stage record.
- The canon entry and the index were written after verify, outside the build's window (the plan's ordering, L68), so
  verify does not cover them; CI's `npm run check` does.

_Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate._
