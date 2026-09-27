# SHIP — write-guard-narrowing

An advisory roll-up of the `/pharn-dev-ship` chain for this increment: the write guards judge the path the kernel
writes (M4), and the install-posture out-of-project allowance reaches only this project's memory and this session's
scratch (M7). It records that the chain ran and its floor verdicts. It is not a "shipped" claim, an approval or a
seal.

- stage: `/pharn-dev-ship` — every stage of this run on opus (`claude-opus-5-5`), by the maintainer's instruction
  for this batch; not a `pharn.config.json` route; effort not routed
- where the run ended: **GATE 2 → FIX**, then the fix pass, which stops again before anyone applies anything: the
  human apply waits for the orchestrator's independent review of the regenerated `proposed/human-only.patch`

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
9. **GATE 2 → FIX** (the orchestrator), then the fix pass (`BUILD.md`, "After the GATE-2 fix pass"): the GATE-2
   snapshot committed (`0a27990`), the branch renamed `write-guard-narrowing`, `origin/main` (`c1bf663`, 6.29.0)
   merged (`b8b8e1b`) and renumbered to 6.29.1, F1–F4 fixed, the new tests audited for case sensitivity, the patch
   regenerated once and re-verified, the reconciliation baseline re-anchored, the non-test gates re-run.

## Decisions, and whose

**The orchestrating model's**, made under the maintainer's delegation of both gates for this batch. These are model
decisions, **not human approvals**:

- GATE 1, approved, with rulings 1–5 and the two added requirements (no PHARN version string in the human-only bytes;
  nobody is asked to apply the patch at GATE 2) — `PLAN.md`, "GATE 1 record";
- decision 1, applied at verify: continue to review only if `failing_gates == ["test"]` and the TAP failing titles
  exactly equal `BUILD.md`'s expected-fail list, each shown passing in the patched throwaway worktree. It held:
  `failing_gates` was `["test"]`, the 30 titles matched line for line, and all 30 passed against the patch
  (`VERIFY.md`, which carries the exact list);
- GATE 2 = **FIX**, one pass, then stop again before any apply: F1 drop the unverified clause (no other route to the
  binary), F2 a reachable remedy, F3 the key bound wherever stated, F4 the count; the Step 2b answer below; the
  merge, the renumber, one regeneration, the re-anchor; and, added during the pass, the case-sensitivity audit of
  the new tests (`PLAN.md`, "GATE 2 record, and the fix pass").

## The standing verdicts, verbatim

- `/pharn-dev-grill` → `check-plan-lessons.mjs`: exit **0** (GREEN).
- `/pharn-dev-build` → `node pharn/floor/validate.mjs .`: exit **0** (`FLOOR: GREEN — 36 capabilities checked in
"."` on a clean tree; `BUILD.md` misrecords 72, `REVIEW.md` F4).
- `/pharn-dev-regress` → `regression-report.json` `.verdict`: **`no-regressions`** (base `70cb51c`, 15 paths inside,
  none escaped; 120 outside test files, `validate` and the trust-fence structural pair exit 0 at base and head).
- `/pharn-dev-verify` → `verify-report.json` `.verdict`: **`FAIL`**, `failing_gates: ["test"]` — the designed STOP
  before the human apply. Every other gate exited 0, and `reconcile` read CLEAN (12 paths, 0 escapes).
- `/pharn-dev-review` → `REVIEW.md`: GREEN, 0 floor-gate findings; F1 important, F2–F5 minor — cited, not restated.
  F1–F4 fixed and F5 accepted in the fix pass (`BUILD.md`).
- After the fix pass, over the merged tree: `validate` exit 0 (36 capabilities); the regenerated patch's runner —
  every gate 0, the chain 0, the full suite 4157 of 4157 against the patched hooks, the 30 expected-fail titles all
  `ok` there; unpatched here, the same 30 titles fail and nothing else. The verify verdict above predates the merge
  and is re-read at `/pharn-dev-verify` after the apply.

changelog-entry: exit 0

The check was re-run after the merge, against `c1bf663`: GREEN, and this PR opens `## [6.29.1]`.

## Lesson (Step 2b)

lesson: skipped

The orchestrator answered the 2b.3 question **Skip**, under the maintainer's delegation — a model's answer, not a
human's answer to the form. The reason it gave: a first occurrence, and the concrete instance is fixed by this
review (F1). The candidate, kept here so it is not lost, from `REVIEW.md` F1 (with `GRILL.md` G2):

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
- **Named by the independent patch review, pre-existing, not fixed here:** `protect-fifo-git-hang`,
  `protect-firmlink-spelling`, `deep-path-segment-slowness` (`BUILD.md`, "After the patch review").

## For the orchestrator, before the apply

- the patch: `.dev/features/write-guard-narrowing/proposed/human-only.patch` (730 lines, regenerated once in the fix
  pass), its checksums `proposed/human-only.sha256`, and `proposed/apply.sh` (what it runs: `APPLY.md`);
- `main` was merged at `c1bf663` (6.29.0) and this increment is now 6.29.1. If another PR releases 6.29.1 first
  (the AC-gate PR, as 6.30.0, say), the renumber touches `CHANGELOG.md`, `CLAUDE.md`, `README.md`,
  `pharn/floor/README.md` and `SKILLS_VERSION` only: the patch carries no version string. A merge after the apply
  re-opens the reconcile epoch the way `.dev/features/writes-scope-run-only/BUILD.md` records.
- **`main` moved again during the fix pass**, to `109a4af` (#292, 6.30.0). It touches none of the three human-only
  files nor either hook test file, so the patch still applies; it does touch `CHANGELOG.md`, `CLAUDE.md`,
  `README.md` and `SKILLS_VERSION`, so the next merge renumbers this to 6.30.1. Not merged here: the GATE-2
  instruction named `c1bf663`.
- **Merge #2, before the apply** (the orchestrator's instruction): `origin/main` at `17dda60` (6.31.0) merged as
  `db3543b`, renumbered to **6.31.1**; `docs:generate` changed nothing; the patch still passes `git apply --check`
  and, applied in a throwaway directory, `shasum -a 256 -c`; the expected-fail list on the merged tree is the same 30
  (4248 tests, 4218 pass); the reconcile epoch re-anchored as `write-guard-narrowing-post-merge-2`, after which
  `apply.sh`'s step 2 reads CLEAN (`BUILD.md`, "After merge #2").
- **The independent patch review, and its fix pass** (`PLAN.md` and `BUILD.md`, "After the patch review"): I1 and
  m4 fixed in `apply.sh` (a file-list bound, per-path `--include`, a before/after working-tree check, the patch's own
  sha256 printed first, and a restore from HEAD on every failure, the commit included); m1 and m3 fixed in the
  patch, both deny-only; m2 named in `LIMITS.md §7`. The patch was regenerated once (753 lines, sha256
  `6cceeebc…6d82b5aff`). The expected-fail list is now **32** — the 30 plus the two new m1/m3 tests. The reviewer's
  I1 tamper repro is refused by the committed `apply.sh`, a failing commit is restored, and the honest run commits
  and re-anchors (`BUILD.md`). The reconcile epoch was re-anchored as `write-guard-narrowing-post-review`.

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
