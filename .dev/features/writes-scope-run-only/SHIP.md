# SHIP — writes-scope-run-only

An advisory roll-up of the `/pharn-dev-ship` chain for this increment: in an installed project, the write
guard is fail-closed only while PHARN is working (6.24.0, roadmap Phase 0.2). It records that the chain ran
and its floor verdicts. It is not a "shipped" claim, an approval or a seal.

- stage: `/pharn-dev-ship` Steps 2b, 2c and 3 — opus, set by the maintainer's instruction and overriding
  pharn.config.json's sonnet for ship; routed via Agent subagent; effort not routed
- where the run ended: **GATE 2**, after the re-check, the human apply and the verify run that followed it

## Stages run, in order, and on which model

Every stage ran as an Agent subagent; no stage's effort was routed.

1. `/pharn-dev-plan` → `PLAN.md` (`0898393`), on **opus** (pharn.config.json's plan model).
2. **GATE 1** — approved 2026-09-25 by the orchestrator (`PLAN.md`, "GATE 1 record").
3. `/pharn-dev-grill` → `GRILL.md` (`c05205a`), on **opus** (pharn.config.json's grill model).
4. `/pharn-dev-build`, `/pharn-dev-regress` and `/pharn-dev-verify` (`6b349f8`), on **sonnet**, per
   pharn.config.json. Verify failed by design: the human-only half was not yet applied.
5. `/pharn-dev-review` → `REVIEW.md` (`a154214`), on opus (pharn.config.json's review model; the section
   itself records only the routing).
6. **GATE 2 → FIX** (orchestrator).
7. The round-1 fixes started on **sonnet** (`fd1c387`, a partial pass that was handed off). The maintainer
   then said "use opus not sonnet", and the pass was finished on **opus** (`67847e5`). Every stage after
   this point ran on opus.
8. Merge of `origin/main` (`1524c6f`, #277), the renumber to 6.24.0 and the regenerated patch (`d869cc8`).
9. Re-review (`b9d2de5`).
10. **GATE 2 → FIX** (orchestrator).
11. The R1–R4 fixes (`d24b282`).
12. Re-check (`e607bcb`).
13. **The human apply** — the maintainer ran `proposed/apply.sh` in this worktree. It passed 483/483 tests
    and committed `093ad54`, "feat(hooks): the write guard is fail-closed only while PHARN is working
    (human-applied)". It then re-ran the PLAN setter and re-anchored the epoch over 2339 paths.
14. `/pharn-dev-verify` after the apply → PASS.
15. This ship-wrap.

Regress and verify re-ran after steps 7, 8 and 11. Those records are kept in `REGRESSION.md`, `VERIFY.md`
and `BUILD.md`.

## Decisions, and whose

**The orchestrator's**, made under the maintainer's 2026-09-25 delegation ("Deliver all things … when all
check green merge pull request"). These are model decisions, not human approvals:

- GATE 1, approved;
- GATE 2 = FIX after the first review;
- GATE 2 = FIX after the re-review, with the rulings recorded in `PLAN.md`, "GATE-2 rulings" and
  "Re-review rulings and fixes";
- the Step 2b answer below.

**The maintainer's own:**

- roadmap Phase 0.2 and its decisions D1–D9, approved in chat 2026-09-25 (`PLAN.md`, "Trigger");
- D2 narrowed in chat 2026-09-26: outside the project the permissive default allows only Claude Code's
  memory folders and the temp roots (`PLAN.md`, "Amended at GATE 2");
- the instruction "use opus not sonnet";
- the human apply of the reviewed patch, commit `093ad54`.

## The review rounds

Each round is cited, not restated (P4); read `REVIEW.md`.

1. **Review** (`a154214`): blocked-with-1-floor-finding, plus 2 important and 8 minor findings. All were
   fixed or narrowed in `67847e5`. The fixes include the maintainer's D2 and one regression found while
   verifying them: the backslash rule, approved at GATE 2.
2. **Re-review of the final patch** (`b9d2de5`): blocked-with-1-floor-finding (R1), plus R2 (important), and
   R3 and R4 (minor). All four were fixed in `d24b282`.
3. **Re-check of R1–R4** (`e607bcb`): "GREEN, 0 floor-gate findings. The patch is safe to apply as it
   stands." It records one unmeasured residual (below).

`GRILL.md`, which is advisory, gives the Step 1b lessons-declaration verdict GREEN (exit 0), and 14
concerns (0 blocking, 7 important, 7 minor), all amended or recorded.

## The standing verdicts, verbatim

- `/pharn-dev-build` → `validate` exit **0** (`FLOOR: GREEN — 36 capabilities checked`, re-read by verify
  after the apply).
- `/pharn-dev-regress` → `regression-report.json` `.verdict`: **`no-regressions`**, base `1524c6f`. Regress
  ran before the apply, the order the PLAN sets. After the apply, verify's full `npm test` passed 3581/3581,
  and that suite contains every outside test regress ran.
- `/pharn-dev-verify` → `verify-report.json` `.verdict`: **`PASS`**. Every gate exited 0, `test` passed
  3581/3581, and `reconcile` read CLEAN under the apply epoch (`VERIFY.md`, "After the human apply").

changelog-entry: exit 0

## Lesson (Step 2b)

lesson: skipped

The candidate was put to the 2b.3 gate and not taken to `/pharn-dev-memory-promote`. The orchestrator
decided, under the maintainer's delegation, to defer it rather than promote it now. That was a model's
answer, not a human's answer to the form. The candidate is carried below, not dropped.

deferred:

- "On a case-insensitive volume, JS `realpathSync` keeps the caller's case; guard containment must compare
  `realpathSync.native` or folded keys." Evidence, the second occurrence of the class:
  - R1 (`REVIEW.md`, "Re-review of the final patch");
  - B2's fold-widening (`REVIEW.md`, the first review's blocking finding (b)).

  `REVIEW.md`'s own "Lesson candidate, extended" counts R1 among the instances of its broader candidate.

## Follow-ups, named and not built (P7)

- `protect-backslash-separator` — the segment walk in `protect-trusted-paths.cjs` still reads `\` as a
  separator, so a symlink whose name contains a backslash can still make it miss a trusted doc (`PLAN.md`,
  "Named follow-ups").
- `reconcile-escape-attribution-wording` — reconcile's finding says "outside the guarded tool surface", an
  attribution it cannot make. An ordinary Write-tool edit made outside a run can now reach that finding.
- `dev-posture-pin` (grill G11) — a one-assertion test that this repository's own tree computes the dev
  posture, so an accidental flip to the permissive install posture fails CI.
- The reviewer's unmeasured residual: a bind mount of the project under `/tmp` would plausibly evade both
  R1 defences, as a hard link does. Measuring it needs Linux and root (`REVIEW.md`, "Re-check of R1–R4").

`PLAN.md`'s list also still names `stale-scope-expiry` and `reconcile-import-crash-label`, both open. Its
`run-marker-open-failure` is closed:

- `/pharn-ship` and `/pharn-review` STOP on a failed open (GATE-2 review, S1);
- `/pharn-loop` STOPs on one too (re-review R2).

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is the human's call at the post-review gate.
