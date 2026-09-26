# SHIP — ship-quick-mode

An advisory roll-up of the `/pharn-dev-ship` chain for this increment: `/pharn-ship --quick`, a shorter
product-pipeline spine for a small change (6.25.0). It records that the chain ran and its floor verdicts. It is not
a "shipped" claim, an approval or a seal.

- stage: `/pharn-dev-ship` Steps 2b, 2c and 3 — opus, set by the maintainer's instruction, overriding
  pharn.config.json's sonnet for ship; routed via Agent subagent; effort not routed
- where the run ended: **GATE 2**, after the final merge of `main` (`ec06f7b`, 6.24.0), the maintainer's apply of
  the human-only patch (`fb8bf5b`), and the verify run that followed the apply. The apply result is appended at the
  end of this file.

## Stages run, in order, and on which model

Every stage ran as an Agent subagent; no stage's effort was routed.

1. `/pharn-dev-plan` → `PLAN.md` (`4dedae8`), on **opus** (pharn.config.json's plan model).
2. **GATE 1** — approved 2026-09-26 by the orchestrator (`PLAN.md`'s header, and Q1).
3. `/pharn-dev-grill` → `GRILL.md` (`8e91269`), on **opus** (pharn.config.json's grill model).
4. `/pharn-dev-build`, `/pharn-dev-regress` and `/pharn-dev-verify` (`4a3de25`), on **sonnet**, per
   pharn.config.json.
5. `/pharn-dev-review` → `REVIEW.md` (`2071a97`), on opus (pharn.config.json's review model; the section records
   only the routing).
6. **GATE 2 → FIX** (orchestrator).
7. The review fixes, F1–F3 plus the advisory and wording items (`036393f`), on **opus**, by the maintainer's
   instruction, which overrode pharn.config.json's sonnet for build, regress and verify. Every stage after this
   point ran on opus.
8. Re-review (`bbea1bb`), on opus, by the same instruction.
9. **GATE 2 → fix N1–N3 and merge `main`** (orchestrator).
10. The N1–N3 fixes, the merge of `origin/main` (`1524c6f`, `stage-regress-script`, 6.23.0), the renumber to 6.24.0
    and the regenerated patch (`e586e28`), each with regress and verify re-run after the merge.
11. **GATE 2 → final merge** (orchestrator), after `writes-scope-run-only` merged as 6.24.0 (`ec06f7b`, #278).
12. The final merge of `origin/main`, the renumber to 6.25.0, the regenerated patch, regress and verify re-run, and
    this ship-wrap (`5b7b59b`).
13. **The human apply** — the maintainer ran `proposed/apply.sh` in this worktree and committed `fb8bf5b`.
14. `/pharn-dev-verify` after the apply → PASS, on opus.

Regress re-ran after steps 7, 10 and 12, and verify after steps 7, 10, 12 and 14. Each run is kept in
`REGRESSION.md`, `VERIFY.md` and `BUILD.md`, newest first.

## Decisions, and whose

**The orchestrator's**, made under the maintainer's 2026-09-25 delegation. These are model decisions, not human
approvals:

- GATE 1, approved (the ten Decisions for GATE 1 accepted as written; Q1 → (a));
- GATE 2 = FIX after the review (F1–F3 and the advisory items);
- GATE 2 = fix N1–N3 and merge `main` now, after the re-review;
- GATE 2 = the final merge and this ship-wrap, after `writes-scope-run-only` merged;
- the Step 2b answer below.

**The maintainer's own:**

- the 2026-09-25 choice of three levels that started this phase (roadmap Phase 3.1): plain work without PHARN,
  `--quick` for small changes, and the full pipeline for large features (`PLAN.md`, "Trigger");
- the 2026-09-26 instruction to run the fix rounds on opus;
- **the human apply of `proposed/human-only.patch`**, commit `fb8bf5b` (the result is appended at the end).

## The review rounds

Each round is cited, not restated (P4); read `REVIEW.md`.

1. **Review** (`2071a97`): blocked-with-3-floor-findings (F1, F2, F3), plus seven advisory findings. All were fixed
   or narrowed in `036393f`.
2. **Re-review** (`bbea1bb`): "GREEN — 0 floor-gate findings open", with three new minor advisory findings, N1–N3.
   All three were fixed in `e586e28` (`PLAN.md`, "Amended at GATE 2 (merge of main)").

No review ran on the two merges of `main`, nor on the final renumber; the orchestrator did not ask for one.

`GRILL.md`, which is advisory, gives the Step 1b lessons-declaration verdict GREEN and twelve findings, G1–G12, all
folded into `PLAN.md` ("Amended after grill").

## The standing verdicts, verbatim

After the final merge, on the committed tree, **without** the human-only patch:

- `/pharn-dev-build` → `validate` exit **0** (`FLOOR: GREEN — 36 capabilities checked`).
- `/pharn-dev-regress` → `regression-report.json` `.verdict`: **`no-regressions`**, base `ec06f7b`, 44 inside, no
  escape, 100 outside tests (`REGRESSION.md`, "After the final merge of main").
- `/pharn-dev-verify` → `verify-report.json` `.verdict`: **`PASS`**. All seven gates exited 0, `test` passed
  3663/3663, and `reconcile` read CLEAN, 32 paths reconciled, no escape (`VERIFY.md`, "After the final merge of
  main").

`npm run check` exited 0 on the same tree.

changelog-entry: exit 0

## The human-only patch — as it stood at the ship-wrap (applied since; see the end)

The maintainer applies `proposed/human-only.patch` at GATE 2, after this record and before the merge (`PLAN.md`,
Q1 → (a)), with `sh .dev/features/ship-quick-mode/proposed/apply.sh`, run from the root of this phase's worktree.
It lands `LIMITS.md §3a` and `§6`, and `pharn/ARCHITECTURE.md §6` and `§4`. `apply.sh` re-runs the sums,
`validate`, `check:markers` and `hash-doc.test` on the applied bytes, and commits only those two files.

- `human-only.sha256`: `LIMITS.md` `deea816cd5c3441a2b3924fbdbaa2e594961066e104e2963770eec41e48c2b19`,
  `pharn/ARCHITECTURE.md` `d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4`.
- The ARCHITECTURE pin moves from `4950796f…` to `d831d30d…`.
- The patch was applied to a scratch copy of the tree only. There it applies, the sums match, and `validate`,
  `check:markers`, `hash-doc.test` and the hook, product-floor and dev-floor suites exit 0 (`BUILD.md`, "GATE 2 —
  the final merge of main").

The apply's result was not recorded here at the ship-wrap. It is appended at the end of this file.

## Lesson (Step 2b)

lesson: skipped

`REVIEW.md` proposed one candidate. It was not taken to `/pharn-dev-memory-promote`: the orchestrator decided,
under the maintainer's delegation, to defer it rather than promote it now. That was a model's answer, not a human's
answer to the 2b.3 form. The candidate is carried below, not dropped.

deferred:

- "A safety argument about an advisory boundary marker must be probed with the marker ABSENT, not only with a wrong
  value." `REVIEW.md`, "Proposed lesson", source finding F1: the quick run whose run-start was skipped. The
  re-review's N1 is a second instance of the class, a bound probed with an earlier run's markers present but not
  with an earlier run that shares none of this run's stages.

## Follow-ups, named and not built (P7)

- `loop-quick` — roadmap Phase 3.2: `/pharn-loop --quick`, a verify-only `check-loop` mode, and its freshness and
  record.
- `quick-size-signal` — any measurement of change size. Today a human chooses the flag and the SPEC kind.
- `briefing-run-binding` — `render-ship-briefing.mjs` copies whatever reports sit on disk, whether or not they belong
  to the run. It is pre-existing and applies to full mode too; quick mode never renders a briefing.
- `quick-stop-tokens` — quick-specific `stop:` forms, if a reader ever needs the mode without `markers[]`.
- The `spec_template` line sits outside the approval pin, so adding it to an Approved legacy SPEC that already
  carries `spec_kind: quick` can make the SPEC quick-eligible without re-approval. Pinning that line's presence is
  a possible follow-up (named in `spec-template.md` and `pharn-ship.md`).
- A stage that starts and then refuses before rewriting its report leaves the earlier report, which the outcome
  accepts. `stage-regress-script` narrowed this for regress; it stays at full width for verify. Closing it needs a
  report-side run identity (`cost-ledger.md`).
- `BUILD.md`'s one open deviation: the structural call counts were never re-derived on the build's HEAD, as the
  PLAN's Build procedure step 7 asked. `PLAN.md`'s figures at `767bf61` stand unre-counted, and `stage-regress-script`
  has since changed what a full run's regress stage costs.
- After the apply, any plan written against the old ARCHITECTURE pin `4950796f…` must be re-pinned
  (`proposed/APPLY.md`).

## The human apply — result (appended after the apply)

- **The apply.** The maintainer ran `proposed/apply.sh` in this phase's worktree. It reported the sums OK,
  `validate` GREEN, `check:markers` GREEN and `hash-doc.test` 11/11, then committed `fb8bf5b`, "docs(trusted): quick
  mode in LIMITS.md and ARCHITECTURE.md (human-applied)". That commit touches `LIMITS.md` and
  `pharn/ARCHITECTURE.md` only. A re-run of `shasum -a 256 -c proposed/human-only.sha256` on the committed bytes
  passes for both.
- **The new ARCHITECTURE pin** is `d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4`
  (`node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md`), replacing `4950796f…`.
- **Verify after the apply** → `verify-report.json` `.verdict`: **`PASS`**. All seven gates exited 0, `test` passed
  3663/3663, and `reconcile` read CLEAN (`VERIFY.md`, "After the human apply at GATE 2").
  - Against the final-merge epoch, `reconcile` first read `ESCAPE` on exactly `fb8bf5b`'s two files, which
    `protect-trusted-paths.cjs` denies to the agent. That is the human's own commit.
  - `proposed/APPLY.md`'s procedure for an apply that precedes a verify was then followed: the setter from
    `PLAN.md`, then `reconcile-baseline.mjs --anchor --by ship-quick-mode-after-apply`. No baseline was edited or
    deleted.
- **`npm run check:changelog-entry`**, re-run after the apply, exited 0.

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is the human's call at the post-review gate.
