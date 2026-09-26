# SHIP — stage-verify-script

An advisory roll-up of the `/pharn-dev-ship` chain for this increment: `/pharn-verify` as one tested stage script,
with the stage-script mechanics in one shared owner (roadmap Phase 1.2, 6.26.0). It records that the chain ran and
its floor verdicts. It is not a "shipped" claim, an approval or a seal.

- stage: `/pharn-dev-ship` Steps 2b, 2c and 3 — opus, set by the maintainer's instruction, overriding
  pharn.config.json's sonnet for ship; routed via Agent subagent; effort not routed
- where the run ended: **GATE 2**, after the final merge of `main` (`2e5c2e3`: 6.25.0, #280, over `b9b6a03`: 6.24.1,
  #279) and the regress and verify runs that followed, on the merge commit `a470b71`.

## Stages run, in order, and on which model

Every stage ran as an Agent subagent; no stage's effort was routed. Plan, grill and review ran on opus, which is also
pharn.config.json's model for them; build, regress, verify and this ship-wrap ran on opus by the maintainer's
instruction, which overrode the config's sonnet.

1. `/pharn-dev-plan` → `PLAN.md` (`e1816eb`).
2. **GATE 1** — approved 2026-09-26 by the orchestrator (`PLAN.md`'s `gate1:` line; Q1–Q6 as recommended, with
   two conditions).
3. `/pharn-dev-grill` → `GRILL.md` (`ad426d9`); its G1–G19 were folded into `PLAN.md` (`557a513`).
4. `/pharn-dev-build`, `/pharn-dev-regress` and `/pharn-dev-verify` (`de2cfb0`).
5. `/pharn-dev-review` → `REVIEW.md` (`14fd386`).
6. **GATE 2 → FIX** (orchestrator): E1 and F1–F5.
7. The GATE 2 fixes, with regress and verify re-run (`c9cd073`).
8. **GATE 2 → merge 3.1 and renumber** (orchestrator), with 3.1's branch merged before #280 reached `main`.
9. The merge of `ship-quick-mode` at `eec6535`, the renumber to 6.26.0 and the ARCHITECTURE re-pin (`c989084`). Its
   regress and verify runs (`no-regressions`; `PASS`, 3759/3759) were never committed: the orchestrator paused the
   round when `main` moved again, and had those records discarded before the final merge.
10. **GATE 2 → final merge of `main`** (orchestrator), once #280 had squash-merged.
11. The merge of `origin/main` (`a470b71`, parents `c989084` and `2e5c2e3`), then regress, verify and this
    ship-wrap (the commit that carries this file).

Regress and verify ran after steps 4, 7, 9 and 11. `REGRESSION.md` and `VERIFY.md` keep the step-7 and step-11 runs,
newest first, and name the other two verdicts. `BUILD.md` keeps every build-side run, oldest first, both merges
included.

## Decisions, and whose

**The orchestrator's**, made under the maintainer's 2026-09-25 delegation. These are model decisions, not human
approvals:

- GATE 1, approved (Q1–Q6 as the plan recommended; the unchanged regress suite and the named completeness-crash
  change were its conditions, and both held);
- GATE 2 = FIX after the review (E1 and F1–F5);
- GATE 2 = merge 3.1's branch before it reached `main`, renumber to 6.26.0; then pause when `main` moved, discard
  that round's uncommitted records, and merge `main` once #280 landed;
- the regress base for the final run, `git merge-base HEAD origin/main` (`2e5c2e3`);
- the Step 2b answer below.

**This stage's own choices, named:** each merge was committed before its regress and verify, because reconcile checks
`pharn/floor/` against `HEAD`'s blobs (3.1 found the same); and each conflict in the final merge was resolved by the
rule the orchestrator gave — `BUILD.md`, "GATE 2 — the final merge of `main`", lists them and the script checks.

**The maintainer's own:**

- the 2026-09-25 approval of the token-reduction roadmap, whose Phase 1.2 this is (`PLAN.md`, "Why");
- the 2026-09-26 instruction to run every stage on opus;
- the human apply of 3.1's `human-only.patch` (`fb8bf5b`, now on `main` through #280), which moved the ARCHITECTURE
  pin this plan re-pinned to `d831d30d…`.

## The review

Cited, not restated (P4); read `REVIEW.md`.

- **Review** (`14fd386`): "GREEN — 0 floor-gate findings", with 1 important advisory finding (E1) and 5 minor ones
  (F1–F5). All six were addressed in `c9cd073`:
  - E1 fixed — 18 sentence-unique anchors, each required exactly once, and the reviewer's three repros as controls;
  - F1, F2 and F4 — the wording fixed;
  - F3 — stated as a bound;
  - F5 — fixed in code: one shared `removeIfPresent`, which closes `regress-stale-unlink-swallow`.
- No re-review ran on the fix round or on either merge; the orchestrator did not ask for one.
- The review's two merge notes are answered. The version collision is the renumber to 6.26.0. The executed
  `STAGE_SCRIPT_WIRING` A1 probe and RULE B's floor-of-5 domain pass under main's 6.24.0 guard, in the final merged
  suite (and, after the first merge, in a targeted run of the 10 named pins).

`GRILL.md`, which is advisory, gives the Step 1b lessons-declaration verdict GREEN and 19 concerns, G1–G19, all
folded into `PLAN.md`.

## The standing verdicts, verbatim

On final `main` plus this increment — the merge commit `a470b71`'s tree plus this stage's artifacts:

- `/pharn-dev-build` → `validate` exit **0** (`FLOOR: GREEN — 36 capabilities checked`).
- `/pharn-dev-regress` → `regression-report.json` `.verdict`: **`no-regressions`**, base `2e5c2e3`, 41 inside (this
  branch's 40 files and this file's draft), no escape, 108 outside tests (`REGRESSION.md`, "On final `main`").
- `/pharn-dev-verify` → `verify-report.json` `.verdict`: **`PASS`**. All six gates exited 0, `test` passed
  3782/3782, and `reconcile` read CLEAN against the epoch re-opened after the merge commit (`VERIFY.md`, "On final
  `main`").

`npm run check` exited 0 on the same tree, before this file was updated for it.

changelog-entry: exit 0

## Lesson (Step 2b)

lesson: skipped

`REVIEW.md` proposed one candidate. It was not taken to `/pharn-dev-memory-promote`: the orchestrator decided, under
the maintainer's delegation, to defer it rather than promote it now. That was a model's answer, not a human's answer
to the 2b.3 form. The candidate is carried below, not dropped.

deferred:

- "A presence pin's anchor must be unique to the sentence it guards — assert its count is 1, or the
  delete-the-anchor mutant cannot remove the sentence alone." `REVIEW.md`, "Proposed lesson candidate", source
  finding E1, candidate `type` `process`. E1 itself is fixed (`c9cd073`); the candidate is the transferable part.

## Follow-ups, named and not built (P7)

`PLAN.md`, "Deferred — named, not dropped", holds the full list; these are its open items plus one from the build:

- `dev-verify-stage-script` — `/pharn-dev-verify` keeps its prose flow.
- The verifier runner stays deferred until the first `role: verifier` capability is authored outside PHARN's own
  shipped surface.
- `stage-exit-runner-lapse-rerun` — a closed stage-exit code `/pharn-loop` could re-run once, if an observed lapse
  ever motivates it; today a runner lapse is `unusable child-refused` (S9).
- `run-gates-completeness-crash` — the runner still reads a crashed `check-build-complete.mjs` as "incomplete" for
  every caller except this stage.
- `count-verifiers-flush-rule` — `count-verifiers.mjs` still ends with `process.exit` while this stage parses its
  stdout; a listing past 64 KiB (zero verifiers exist) could be cut, which reads as `child-crashed`, fail-closed.
- `ship-regress-exit-binding` — the regress half of `/pharn-ship`'s `done`-exit binding.
- `regress-resume-budget-value` (`BUILD.md`, deviation 5) — `stage-regress.mjs`'s `--resume` still accepts a
  value-less trailing `--budget-ms`.
- Retiring the allowlist prose copy (kept, with its parity test).
- Closed by this increment: `regress-stale-unlink-swallow` (the GATE 2 fix). Closed by the merge:
  `architecture-contract-list-stage-exit` — 3.1's human-applied patch added `stage-exit` to `pharn/ARCHITECTURE.md`
  §4's contract list.
- `REVIEW.md` also records F2, F3 and F5 as unprobed quantified sentences outside the Guarantee audit: one more
  occurrence for 6.23.0's pending "L37 recurred" candidate, not a new one.

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is the human's call at the post-review gate.
