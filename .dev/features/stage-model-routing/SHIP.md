# SHIP — stage-model-routing

An advisory roll-up of the `/pharn-dev-ship` chain for this increment: `/pharn-ship` and `/pharn-loop` run each
routed pipeline stage as a subagent, requested on the model `pharn.config.json`'s `models.stages` resolves for it
(roadmap Phase 2.2, 6.27.0). It records that the chain ran and its floor verdicts. It is not a "shipped" claim, an
approval or a seal.

- stage: `/pharn-dev-ship` Steps 2b, 2c and 3 — opus, set by the maintainer's instruction, overriding
  pharn.config.json's sonnet for ship; routed via Agent subagent; effort not routed
- where the run ended: **GATE 2**, after the maintainer's human apply of `proposed/human-only.patch` (`0344ff1`) and
  the regress and verify runs that followed it, on the applied tree.

## Stages run, in order, and on which model

Every stage ran as an Agent subagent on opus; no stage's effort was routed. Plan, grill and review ran on opus, which
is also pharn.config.json's model for them; build, regress, verify and this ship-wrap ran on opus by the maintainer's
instruction, which overrode the config's sonnet.

1. `/pharn-dev-plan` → `PLAN.md` (`9192556`), on a branch from `ship-quick-mode`'s tip.
2. **GATE 1** — approved 2026-09-26 by the orchestrator (`PLAN.md`'s `gate1:` line; Q1–Q6 as recommended), after
   `ship-quick-mode` was merged in (`b49c2cb`, with #279 folded in), and its notes A–E folded in (`379b311`).
3. `/pharn-dev-grill` → `GRILL.md` (`a3d7b45`), a self-review by the plan's author agent; its 15 concerns were
   folded into `PLAN.md` in the same commit.
4. The merge of `origin/main` at 6.25.0 (#280) into the branch (`25a2599`).
5. `/pharn-dev-build`, `/pharn-dev-regress` and `/pharn-dev-verify` (`ac2c6d9`), after the orchestrator's decision on
   grill finding 1 was recorded in `PLAN.md`.
6. The merge of `origin/main` at 6.26.0 (#281, `28bbc1a`), then regress and verify on the merged tree (`3c62223`).
7. `/pharn-dev-review` → `REVIEW.md` (`1b4158e`).
8. **GATE 2 → FIX** (orchestrator): A1–A8 and A10 fixed, A9 and the lesson candidate deferred, and GATE-1 Q4's
   `MIN_CLI` bump reversed.
9. The GATE-2 fixes, with regress and verify re-run (`5bf6b18`).
10. **The human apply** — the maintainer ran `proposed/apply.sh` in this worktree and committed `0344ff1`.
11. `proposed/APPLY.md`'s after-apply steps, then regress, verify and this ship-wrap (the commit that carries this
    file).

Regress and verify ran after steps 5, 6, 9 and 11. `REGRESSION.md` and `VERIFY.md` keep every run, newest first.
`BUILD.md` keeps the build-side record of each round: the build, the merge of 6.26.0 and the GATE-2 fixes.

## Decisions, and whose

**The orchestrator's**, made under the maintainer's 2026-09-25 delegation. These are model decisions, not human
approvals:

- GATE 1, approved: Q1–Q6 as the plan recommended, Q4's `MIN_CLI` 0.7.0 bump included;
- accepting grill finding 1's contract change: the `brief` subcommand prints the stage agent's rules, so the
  orchestrator no longer copies them into the Agent prompt (`PLAN.md`, "Amended after grill");
- the two merges of `origin/main`, and the conflict rules for the second (`BUILD.md`, "Merge of main 6.26.0");
- GATE 2 = FIX: A1–A8 and A10 fixed; A9 deferred to the roadmap's Phase 4.1; the lesson candidate deferred; and
  **the reversal of GATE-1 Q4 — `MIN_CLI` stays 0.5.0**, because an older CLI's install is degraded, not broken
  (`PLAN.md`, "Amended at GATE 2");
- the regress base for each run: `2e5c2e3` for the build's, and `008b24b` (`git merge-base HEAD origin/main` after
  the 6.26.0 merge) for every later one;
- the Step 2b answer below.

**The build stage's own choices, named** (`BUILD.md`, "GATE-2 FIX round"): A4's outcome, `resolve-failed` — an
existing inline reason, so the token grammar did not move; A5 fixed by one prose sentence per command rather than
deferred as `route-marker-by-code`; and each merge committed before its regress and verify, because reconcile checks
`pharn/floor/` against committed blobs.

**The maintainer's own:**

- the 2026-09-25 approval of the token-reduction roadmap, whose Phase 2.2 this is (`PLAN.md`, `roadmap:` line);
- the 2026-09-26 instruction to run every stage on opus;
- the human apply of `proposed/human-only.patch`: commit `0344ff1`, "docs(trusted): LIMITS.md section 8 for
  stage-model routing (human-applied)". Its result is below.

## The review

Cited, not restated (P4); read `REVIEW.md`.

- **Review** (`1b4158e`): "GREEN — 0 floor-gate findings", with 3 important advisory findings (A1, A2, A6) and 7
  minor ones. Each was handled in `5bf6b18`, except A9:
  - A1 fixed — the headings and lead sentences say the model is requested; only the ledger's served-model rows are
    evidence;
  - A2 — `MIN_CLI` back to 0.5.0, by the orchestrator's reversal of GATE-1 Q4;
  - A3 fixed — "the session's model", and the patch regenerated (applied since, as `0344ff1`);
  - A4 fixed — a crashed or missing checker is `resolve-failed`, read through `shelledVerdict`, and the test that
    pinned `config-red` was flipped;
  - A5 fixed — one fallback sentence per command, no pinned line changed;
  - A6 fixed — the prose claim labelled ADVISORY in both commands, and the `THREAT-MODEL.md §5` free-text residual
    named;
  - A7 fixed — `read`'s stderr is one fixed code;
  - A8 fixed — a fresh stage agent gets the question with the answer, both fenced as DATA, and a re-run route line
    that exits anything but 0 is a STOP;
  - A9 deferred to Phase 4.1 (below);
  - A10 fixed — `apply.sh` refuses to start while `LIMITS.md` has any unstaged or staged change; that is the script
    the maintainer ran.
- The review judged the human-only patch "safe to apply as is" on its pre-A3 bytes. The applied patch is the A3
  regeneration, and `apply.sh` checked its sum on the applied bytes.
- No re-review ran on the fix round or the apply; the orchestrator did not ask for one.

`GRILL.md`, which is advisory and a self-review, gives the Step 1b lessons-declaration verdict GREEN and 15 concerns,
all folded into `PLAN.md`.

## The human apply — result

- The maintainer ran `proposed/apply.sh` in this worktree. As relayed by the orchestrator, it printed
  `LIMITS.md: OK`, `FLOOR: GREEN`, `SPECIFIED-MARKERS: GREEN` and "applied, checked and committed". Checked here:
  `0344ff1` touches `LIMITS.md` only (+39 −30), and `shasum -a 256 -c proposed/human-only.sha256` passes on the
  committed bytes (`b7e0754b79f9cb8ce4019f69f901a8637fe62bbc2a1d4badb0104a3bd26056fe`).
- `pharn/ARCHITECTURE.md` was not touched, so its pin stays `d831d30d…`.
- `proposed/APPLY.md`'s after-apply steps were then followed: the setter from `PLAN.md` (32 paths), then
  `reconcile-baseline.mjs --anchor --by stage-model-routing-after-apply` (2408 paths). No baseline was edited or
  deleted.

## The standing verdicts, verbatim

On the applied tree — `0344ff1` plus this stage's artifacts:

- `/pharn-dev-build` → `validate` exit **0** (`FLOOR: GREEN — 36 capabilities checked`).
- `/pharn-dev-regress` → `regression-report.json` `.verdict`: **`no-regressions`**, base `008b24b`, 39 inside (the
  GATE-2 run's 38 and `LIMITS.md`, exempt as a trusted doc), no escape, 111 outside tests (`REGRESSION.md`, "After
  the human apply at GATE 2").
- `/pharn-dev-verify` → `verify-report.json` `.verdict`: **`PASS`**. All seven gates exited 0, `test` passed
  3864/3864, and `reconcile` read CLEAN against the epoch anchored after the apply (`VERIFY.md`, "After the human
  apply at GATE 2").

`npm run check` exited 0 on the final tree, this file included.

changelog-entry: exit 0

## Lesson (Step 2b)

lesson: skipped

`REVIEW.md` proposed one candidate. It was not taken to `/pharn-dev-memory-promote`: the orchestrator decided, under
the maintainer's delegation, to defer it rather than promote it now. That was a model's answer, not a human's answer
to the 2b.3 form. The candidate is carried below, not dropped.

deferred:

- "A new caller of a floor checker reads its exit 1 through `shelledVerdict` — reading exit 1 as the RED recurred in
  `stage-agent.mjs route`, and its test pinned the crash reading as intended." `REVIEW.md`, "Proposed lesson
  candidate", source finding A4, candidate `type` `floor`. A4 itself is fixed (`5bf6b18`); the candidate is the
  transferable part, and the check it proposes is a closure pin over every `spawnSync` of a
  `pharn/floor/check-*.mjs` whose status 1 is branched on.

## Follow-ups, named and not built (P7)

- **A9, the orchestrators' size → the roadmap's Phase 4.1.** `REVIEW.md` (A9) lists about 6 KB of rationale the
  orchestrators never execute:
  - in `pharn-ship.md`, about 4.8 KB: the `## Running a stage` opening "why" (~769 B) and Bounds (~611 B), the
    Guarantee-audit bullets (+1,208 B), the Net narrowing (+691 B), the Trust bullet (+547 B), the "No new gating"
    note (+329 B), the "does NOT do" bullet (+383 B) and the spec-inline rationale (+290 B);
  - in `pharn-loop.md`, about 1.4 KB: the opening paragraph (~731 B) and Bounds (~630 B);
  - not needed at run time: each routed block's connective prose (five times per command), `reads:` naming
    `stage-agent-core.mjs` (32,962 B), and the loop's re-padded S1–S13 table.

  The GATE-2 fixes lengthened the Bounds and Trust paragraphs (A6, A8), so re-measure at Phase 4.1.

- **`shelled-verdict-load-graph-note`** — `shelled-verdict-core.mjs`'s header says three checkers import it, but
  `stage-regress.mjs` and `stage-verify.mjs` already did before this increment, and `stage-agent-core.mjs` now does
  too. A header-only correction for whenever that file next changes.
- **The live M2 measure** (`PLAN.md`, Design §12) — a real `/pharn-ship` run to GATE 2 in a user project installed
  by `@pharn-dev/pharn` ≥ 0.7.0, whose `cost.json` shows each routed stage's served model and its tokens against the
  M1 baseline. Nothing in this chain measured it: the ledger fixture is authored (L4), so routing is proven in shape
  only.
- **`pharn-cli`'s vendored `check-model-config.mjs`** — pinned there by sha256. This increment's header-only edits
  make that copy lag until the maintainer refreshes it in `pharn-cli`; no rule or output changed.
- **The PLAN's named deferrals** (`PLAN.md`, "Known residuals and follow-ups"):
  - `stage-agent-hang` and `stage-agent-background`;
  - `agent-model-set-drift` and `stage-agent-effort`;
  - `run-report-routing-view`, and `route-script-stages` (M2 revisits `floor-only`);
  - permission friction for a stage agent's Bash calls;
  - `/pharn-ship` after GATE 1 runs its orchestrator on the session's model;
  - the L14 canon observation, which goes to a human through `/pharn-dev-memory-promote`.
- **Reported for a human, never agent-edited:** `THREAT-MODEL.md §5` lists its free-text residuals in an open form,
  and `REVIEW.md` A6 suggests adding this instance, the Agent tool's return into the orchestrator's context.
- **Reported for the orchestrator:** the `[6.27.0]` CHANGELOG entry's Bounds bullet still says that until a person
  applies the `LIMITS.md §8` patch, that section is stale. Since `0344ff1` that condition is met; the clause could be
  tightened before the PR opens. It was left as is, because this ship-wrap writes `SHIP.md` alone.
- `route-marker-by-code` is **not** needed: A5 was fixed in prose.

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
