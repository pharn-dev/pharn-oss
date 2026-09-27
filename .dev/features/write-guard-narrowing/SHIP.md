# SHIP — write-guard-narrowing

An advisory roll-up of the `/pharn-dev-ship` chain for this increment: the write guards judge the path the kernel
writes (M4), and the install-posture out-of-project allowance reaches only this project's memory and this session's
scratch (M7). It records that the chain ran and its floor verdicts. It is not a "shipped" claim, an approval or a
seal.

- stage: `/pharn-dev-ship` — every stage of this run on opus (`claude-opus-5-5`), by the maintainer's instruction
  for this batch; not a `pharn.config.json` route; effort not routed
- where the run ended: **GATE 2**, before the human apply, which waits for the orchestrator's independent review of
  `proposed/human-only.patch`

## Stages run, in order

1. `/pharn-dev-plan` → `PLAN.md`.
2. **GATE 1** — approved 2026-09-27 by the orchestrator, with five rulings (`PLAN.md`, "GATE 1 record").
3. `/pharn-dev-grill` → `GRILL.md`: Step 1b GREEN; 7 advisory concerns (0 blocking-severity, 4 important, 3 minor),
   each amended in place.
4. `/pharn-dev-build` → the agent-writable files, `BUILD.md`, and `proposed/` (the human-only patch, its checksums,
   `apply.sh`, `APPLY.md`). Three amendments to the plan made in build are recorded in `PLAN.md`, "Amended in build".
5. `/pharn-dev-regress` → `regression-report.json`, `REGRESSION.md`.
6. `/pharn-dev-verify` → `verify-report.json`, `VERIFY.md` — FAIL by design, then GATE-1 decision 1 applied (below).
7. `/pharn-dev-review` → `REVIEW.md`.
8. This roll-up: Step 2b, Step 2c, Step 3.

## Decisions, and whose

**The orchestrating model's**, made under the maintainer's delegation of both gates for this batch. These are model
decisions, **not human approvals**:

- GATE 1, approved, with rulings 1–5 and the two added requirements (no PHARN version string in the human-only bytes;
  nobody is asked to apply the patch at GATE 2) — `PLAN.md`, "GATE 1 record";
- decision 1, applied at verify: continue to review only if `failing_gates == ["test"]` and the TAP failing titles
  exactly equal `BUILD.md`'s expected-fail list, each shown passing in the patched throwaway worktree. It held:
  `failing_gates` was `["test"]`, the 30 titles matched line for line, and all 30 passed against the patch
  (`VERIFY.md`, which carries the exact list);
- GATE 2 is the orchestrator's next decision, and it has not been made.

## The standing verdicts, verbatim

- `/pharn-dev-grill` → `check-plan-lessons.mjs`: exit **0** (GREEN).
- `/pharn-dev-build` → `node pharn/floor/validate.mjs .`: exit **0** (`FLOOR: GREEN — 36 capabilities checked in
"."` on a clean tree; `BUILD.md` misrecords 72, `REVIEW.md` F4).
- `/pharn-dev-regress` → `regression-report.json` `.verdict`: **`no-regressions`** (base `70cb51c`, 15 paths inside,
  none escaped; 120 outside test files, `validate` and the trust-fence structural pair exit 0 at base and head).
- `/pharn-dev-verify` → `verify-report.json` `.verdict`: **`FAIL`**, `failing_gates: ["test"]` — the designed STOP
  before the human apply. Every other gate exited 0, and `reconcile` read CLEAN (12 paths, 0 escapes).
- `/pharn-dev-review` → `REVIEW.md`: GREEN, 0 floor-gate findings; F1 important, F2–F5 minor — cited, not restated.

changelog-entry: exit 0

## Lesson (Step 2b)

lesson: pending — the 2b.3 question is in the GATE-2 report, and this line becomes `promoted L<n>` or `skipped` when
the orchestrator answers

The candidate, from `REVIEW.md` F1 (with `GRILL.md` G2):

- title: "A grill finding's premise is advisory — the in-place amendment it asks for can carry an unmeasured claim
  into a trusted doc"
- type: `process` · concepts: `[grill, premise-check, trusted-doc, verification-fidelity]`
- source: `.dev/features/write-guard-narrowing/REVIEW.md F1`
- why: grill finding G2 asserted how Claude Code keys a non-git session started in a subdirectory, and the build
  applied the amendment as written, into human-only `LIMITS.md` text, while `PLAN.md`'s own discovery said the
  opposite. Grill amendments are always applied in place by the build, with no step that re-checks the premise
  behind them, so the only remedy today is "remember to probe it" — which is L20's shape.

deferred:

- "A deny message's FIX bullet is a claim about the guard in the case that renders it" — `REVIEW.md` F2 is L27's
  remedy-reachability rule recurring in a new variant, and F2/F3 are L37/L64's quantifier drift recurring. Per L20 a
  recurrence earns a floor check, and the testable one is narrow: render each deny variant in its triggering case
  and perform the remedy it names. Not a lesson here: the rules already exist in canon.

## Follow-ups

- **Closed by this increment:** `protect-backslash-separator`, named in 6.24.0
  (`.dev/features/writes-scope-run-only/SHIP.md`).
- **Named, not built (P7):** `windows-claude-temp-layout` (GATE-1 ruling 5) and `custom-auto-memory-dir`
  (`PLAN.md`, "Named follow-ups").

## For the orchestrator at GATE 2

- the patch: `.dev/features/write-guard-narrowing/proposed/human-only.patch` (703 lines), its checksums
  `proposed/human-only.sha256`, and `proposed/apply.sh` (what it runs: `APPLY.md`);
- `main` moved during the run, to `c1bf663` (6.29.0). The three human-only files and both hook suites are
  byte-identical there, so the patch applies unchanged. `CHANGELOG.md`, `CLAUDE.md`, `README.md` and
  `SKILLS_VERSION` will conflict and renumber (6.29.1 if this merges next).

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
