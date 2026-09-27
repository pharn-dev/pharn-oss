# SHIP — slim-commands

An advisory roll-up of the `/pharn-dev-ship` chain for this increment: the product commands slimmed, each with a
short `description:` and one `## What you may claim` block, their rationale cited to its owners, and a byte budget in
`.dev/floor/command-hygiene.test.mjs` (roadmap Phase 4.1, 6.28.2). It records that the chain ran and its floor
verdicts. It is not a "shipped" claim, an approval or a seal.

- stage: `/pharn-dev-ship` Steps 2b, 2c and 3 — opus, set by the maintainer's instruction, overriding
  pharn.config.json's sonnet for ship; routed via Agent subagent; effort not routed
- where the run ended: **GATE 2**, after the FIX round, the merge of `origin/main` at 6.28.1 (#282, `b9c5a46`) as
  `9d5e2f9`, and the regress and verify runs that followed, on that tree.

## Stages run, in order, and on which model

Every stage ran as an Agent subagent on opus; no stage's effort was routed. Plan, grill and review ran on opus, which
is also pharn.config.json's model for them; build, regress, verify and this ship-wrap ran on opus by the maintainer's
instruction, which overrode the config's sonnet.

1. `/pharn-dev-plan` → `PLAN.md` (`d82b87b`), then the merge of `origin/main` at 6.28.0 (#284) as `83b1f89`, the tree
   unchanged.
2. **GATE 1** — approved 2026-09-27 by the orchestrator (`PLAN.md`'s `gate1:` line: D1–D10 as written, Q1 → (a)).
3. `/pharn-dev-grill` → `GRILL.md`; its G1–G12 were folded into `PLAN.md` (`59f2112`).
4. `/pharn-dev-build`, `/pharn-dev-regress` and `/pharn-dev-verify` (`db8abdf`).
5. `/pharn-dev-review` → `REVIEW.md` (`7f6c6c7`).
6. **GATE 2 → FIX, and the final merge in the same round** (orchestrator).
7. The GATE-2 fixes (`862bd76`), then the merge of `origin/main` at 6.28.1 (#282) with the renumber to 6.28.2
   (`9d5e2f9`), then the re-anchor, regress, verify and this ship-wrap (the commit that carries this file).

Regress and verify ran after steps 4 and 7. `REGRESSION.md` and `VERIFY.md` keep the newest run. `BUILD.md` keeps
both build-side rounds: the build, and `## GATE 2 — the FIX round and the merge`.

## Decisions, and whose

**The orchestrator's**, made under the maintainer's 2026-09-25 delegation. These are model decisions, not human
approvals:

- GATE 1, approved: D1–D10 as written; **Q1 → (a)** — the quick-mode sections stay in their commands, slimmed, and
  reading them on demand is the follow-up `quick-mode-on-demand`;
- **GATE 2 = FIX**: F1–F7 and the minors M1, M3–M12 fixed; M2 (three shipped module headers) left unedited per D3 and
  named `module-header-claims-cite`; the review's `disable-model-invocation` note named
  `disable-model-invocation-probe`;
- the final merge in the same round: `origin/main` at 6.28.1 (#282) merged, this increment renumbered to **6.28.2**
  (F7), main's CHANGELOG sections kept byte for byte with this one directly above;
- the regress base for each run: `b627409` (6.28.0) at the build, and `b9c5a46` (`git merge-base HEAD origin/main`)
  after the merge;
- the Step 2b answer below.

**The build stage's own choices, named** (`BUILD.md`): the budget ceilings were NOT raised after the fixes — every
command stays under the ceiling measured at the build; the fixes were committed before the merge (`git merge` refuses
local changes to the files it touches), and the merge was committed before regress and verify.

**The maintainer's own:** the 2026-09-25 approval of the token-reduction roadmap, whose Phase 4.1 this is, and the
2026-09-26 instruction to run every stage on opus.

## The review

Cited, not restated (P4); read `REVIEW.md` (`7f6c6c7`).

- "**GREEN at the floor — 0 floor-gate (blocking) findings.**" The lost-instruction hunt followed 130 removed
  decision-token lines to their destinations: 0 lost executed instructions, 14 dropped or re-broadened bounds.
- 7 important advisory findings: F1–F6, claims reading stronger than their source (F6 the CHANGELOG's mapping
  sentence); F7, the version collision with `origin/main`. All seven were fixed at GATE 2.
- 12 minor findings, M1–M12. Eleven were fixed; M2 was not (D3), and is the follow-up `module-header-claims-cite`.
- The BUDGET controls were re-run by the review over mutated copies: every rule went red where it should, and the
  stated bound held (a paraphrased claim passes R4).
- No re-review ran on the fix round; the orchestrator did not ask for one.

`GRILL.md`, which is advisory, gives the Step 1b lessons-declaration verdict GREEN and 12 concerns (G1–G12: 5
important, 7 minor), all folded into `PLAN.md`.

## Before and after, measured

On the final tree, bytes with `\r\n` folded, against 6.28.0 (`b627409`); `BUILD.md` has the per-command table with
each ceiling and its headroom.

- The product command bodies: **519,744 → 336,384 (−35.3%)**. `pharn-ship.md` 124,078 → 69,550, `pharn-loop.md`
  112,538 → 78,347, the other nine 283,128 → 188,487.
- The descriptions' text: **22,764 → 2,114 (−91%)**, each at most 250 bytes, the largest 244.
- Missed estimates, recorded rather than met by cutting: `pharn-loop.md` (~72,000), `pharn-spec.md` (~23,000),
  `pharn-plan.md` (~21,000). The total is inside its 336,500 estimate.
- Every saving per session or per request is an **estimate** from these bytes (`LIMITS.md §1c`); the measurement is
  M3, the maintainer's, after `pharn update`.

## The standing verdicts, verbatim

On the merged tree — `9d5e2f9` plus this round's artifacts:

- `/pharn-dev-build` → `validate` exit **0** (`FLOOR: GREEN — 36 capabilities checked`).
- `/pharn-dev-regress` → `regression-report.json` `.verdict`: **`no-regressions`**, base `b9c5a46`, 24 inside, no
  escape, 121 outside test files, exit 0 (`REGRESSION.md`).
- `/pharn-dev-verify` → `verify-report.json` `.verdict`: **`PASS`**. All seven gates exited 0, and `reconcile` read
  CLEAN against the epoch anchored after the merge commit (`--by slim-commands-final`), exit 0 (`VERIFY.md`). The
  gate discards the suite's output; the count is from the final `npm run check` on the same tree: 4061 tests, 4061
  pass (main's #282 added the 49 beyond the build's 4012).

`npm run check` exited 0 on the final tree, this file included.

changelog-entry: exit 0

## Lesson (Step 2b)

lesson: skipped

`REVIEW.md` proposed no new lesson ("Record the recurrence against L64 in its next promotion rather than adding a
sibling"). The orchestrator took none to `/pharn-dev-memory-promote` in this round — a model's answer under the
maintainer's delegation, not a human's answer to the 2b.3 form. The recurrence is carried below, not dropped.

deferred:

- The L64 recurrence: F1, F3 and F5 re-derived a narrowed quantifier when a bound was condensed ("a bound's
  restatement re-derives its quantifier", L64, merged in `b9c5a46`), although the plan's G5 rule targeted exactly that
  pattern; it did not hold for a condensation of about 1,600 decision lines. `REVIEW.md`, "Lessons (P7)". To be
  recorded against L64 at its next promotion, not as a sibling.

## Follow-ups, named and not built (P7)

- `quick-mode-on-demand` — Q1's option (b): read the `## Quick mode` sections on demand; needs a human amendment of
  `pharn/ARCHITECTURE.md §4` first, and is revisited after M3.
- `dev-command-slim` — the same slim for the `pharn-dev-*` commands (D8).
- `ship-closeout-script` — `/pharn-ship` Step 3a's close-out sequence as one tested script (D10).
- `reads-trim` — `reads:` entries a command never opens, and their share of each command's bytes.
- `module-header-claims-cite` — `pharn/floor/merge-findings.mjs:63`, `:81` and
  `pharn/floor/render-review-assignments.mjs:16` still cite `/pharn-review`'s "guarantee audit"; the content lives in
  its `## What you may claim` now. Re-point when those headers next change (REVIEW M2; D3 kept them unedited here).
- `disable-model-invocation-probe` — whether `/pharn-loop` and `/pharn-ship` should carry the documented
  `disable-model-invocation` frontmatter key, the one floor-grade barrier to a model invoking them; not probed (P6),
  and no failure has triggered it (P7). The descriptions' "only when the user asks" wording is advisory.
- Also named by the plan and still open: `description-claim-paraphrase` (R4 sees vocabulary, not meaning).

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
