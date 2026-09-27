# SHIP — loop-quick-mode

An advisory roll-up of the `/pharn-dev-ship` chain for this increment: `/pharn-loop --quick`, the unattended loop for a
`spec_kind: quick` SPEC (roadmap Phase 3.2, 6.28.0). It records that the chain ran and its floor verdicts. It is not a
"shipped" claim, an approval or a seal.

- stage: `/pharn-dev-ship` Steps 2b, 2c and 3 — opus, set by the maintainer's instruction, overriding
  pharn.config.json's sonnet for ship; routed via Agent subagent; effort not routed
- where the run ended: **GATE 2**, after the maintainer's human apply of `proposed/human-only.patch` (`1cbb6c4`), the
  merge of `origin/main` at 6.27.0 (`c85be1b`, #283) as `b88aebd`, and the regress and verify runs that followed, on
  that tree.

## Stages run, in order, and on which model

Every stage ran as an Agent subagent on opus; no stage's effort was routed. Plan, grill and review ran on opus, which
is also pharn.config.json's model for them; build, regress, verify and this ship-wrap ran on opus by the maintainer's
instruction, which overrode the config's sonnet.

1. `/pharn-dev-plan` → `PLAN.md` (`0869490`), on a branch from `ship-quick-mode`'s tip (merged in as `8dd5148`).
2. **GATE 1** — approved 2026-09-26 by the orchestrator (`PLAN.md`'s `gate1:` line: Q1 → (a), D1–D15 as written),
   with its notes A–D folded in (`faaf32e`).
3. The merge of `origin/main` at 6.25.0 (#280) into the branch (`62b108b`).
4. `/pharn-dev-grill` → `GRILL.md` (`007bc87`); its G1–G8 were folded into `PLAN.md` in the same commit.
5. `/pharn-dev-build`, `/pharn-dev-regress` and `/pharn-dev-verify` (`fcdf521`).
6. The merge of `origin/main` at 6.26.0 (#281, `c9d279c`), then regress and verify on the merged tree (`29fe0fc`).
7. `/pharn-dev-review` → `REVIEW.md` (`5ea5e67`).
8. **GATE 2 → FIX** (orchestrator): F1–F6 fixed; F7 and the lesson candidate deferred.
9. The GATE-2 fixes, with regress and verify re-run (`6220299`).
10. **2.2 merges first** (orchestrator): the merge of `stage-model-routing` at 6.27.0 (`51cf513`), then the renumber to
    6.28.0 and the coupling this increment owed as the second merger, with `regress-scope-list-grammar` fixed
    (`8b2b8c3`).
11. The round-2 re-review → `REVIEW.md` `## Round 2` (`49e1b65`).
12. **Final prep** (orchestrator): the merge of 2.2's human-applied `LIMITS.md` §8 (`0344ff1`, as `6fca772`); R1–R3
    fixed and the patch regenerated against the post-§8 file (`ec3e5ff`).
13. **The human apply** — the maintainer ran `proposed/apply.sh` and committed `1cbb6c4`.
14. The merge of `origin/main` at 6.27.0 (#283, `c85be1b`, as `b88aebd`), then `APPLY.md`'s after-apply steps,
    regress, verify and this ship-wrap (the commit that carries this file).

Regress and verify ran after steps 5, 6, 9 and 14; the orchestrator held them back after steps 10 and 12, so that they
run once over the tree `main` will hold. `REGRESSION.md` and `VERIFY.md` keep the newest run. `BUILD.md` keeps every
build-side round: the build, the 6.26.0 merge, the GATE-2 fixes, the merge of 2.2 with the coupling, and final prep.

## Decisions, and whose

**The orchestrator's**, made under the maintainer's 2026-09-25 delegation. These are model decisions, not human
approvals:

- GATE 1, approved: Q1 → (a) (the `LIMITS.md` §6 clause travels in this increment's patch), D1–D15 as written, and
  notes A–D (the base moved to `8dd5148`; the version; the 2.2 coupling owned by whichever merges second; the
  `LIMITS.md` applies sequenced by the orchestrator);
- the three merges of `origin/main` (6.25.0, 6.26.0, 6.27.0) and the two of `stage-model-routing`, and the conflict
  rules for each (`BUILD.md`, one section per merge; this last one below, under the stage's own choices);
- GATE 2 = FIX: F1–F6 fixed; F7 deferred to the roadmap's Phase 4.1; the lesson candidate deferred. **F1 is a security
  fix to bytes that shipped in 6.25.0.** `/pharn-ship --quick`'s item 7 had the orchestrating model paste path lists
  into double-quoted shell arguments. Both quick modes now pin `check-quick-scope.mjs` with only the slug and the base
  (`CHANGELOG [6.28.0]`, Fixed);
- 2.2 merges first, as 6.27.0. This increment therefore renumbers to 6.28.0 and builds the coupling as the second
  merger (`PLAN.md`, "Coupling amendments"). `regress-scope-list-grammar` was fixed in that round, with
  `regress-inside-echo-list` named;
- final prep after the round-2 re-review: R1–R3 fixed, 2.2's §8 merged, the patch regenerated (`PLAN.md`, "Final-prep
  amendments");
- the regress base for each run: `git merge-base HEAD origin/main` — `2e5c2e3` at the build, `008b24b` after the
  6.26.0 merge and at the GATE-2 FIX round (passed explicitly there, since that tree was dirty), and `c85be1b` for the
  last run;
- the Step 2b answer below.

**The build stage's own choices, named** (`BUILD.md`): the quick build's route and brief lines, beyond the plan's list
of spec and grill, because rule 7 is rendered from the brief's `--mode`; `regress-scope-list-grammar` fixed for the
decision, with the verdict's advisory `inside` echo named rather than retired; R2 made true with `check-loop-fresh.mjs`'s
entry pattern rather than narrowed; and each merge committed before its regress and verify. In the last merge, every
`.dev/features/stage-model-routing/` file and CHANGELOG [6.27.0] took `main`'s version whole, and every other file kept
this branch's. A script checked the result: the CHANGELOG minus [6.28.0] equals `origin/main`'s byte for byte, and
`LIMITS.md` stays `1cbb6c4`'s bytes.

**The maintainer's own:**

- the 2026-09-25 approval of the token-reduction roadmap, whose Phase 3.2 this is, at the maintainer's explicit
  direction (`PLAN.md`, `roadmap:` line);
- the 2026-09-26 instruction to run every stage on opus;
- the human apply of `proposed/human-only.patch`: commit `1cbb6c4`, "docs(trusted): /pharn-loop --quick in LIMITS.md
  (human-applied)". Its result is below.

## The reviews

Cited, not restated (P4); read `REVIEW.md`.

- **Round 1** (`5ea5e67`): "GREEN — 0 floor-gate findings", with 7 advisory findings: F1 important (security), F2–F6
  minor, and F7 a size note. F1–F6 were fixed in `6220299`; F7 is deferred (below).
- **Round 2** (`49e1b65`, `## Round 2`): "GREEN — 0 floor-gate findings", with 3 minor findings, R1–R3. All three
  were fixed in `ec3e5ff`:
  - R1 — `apply.sh` refuses to start while `LIMITS.md` has any unstaged or staged change (2.2's guard); that is the
    script the maintainer ran;
  - R2 — "a crash is caught as 2, never 1" made true: `check-quick-scope.mjs` loads its checker,
    `quick-scope-core.mjs`, through `import()`; the entry file itself unloadable stays exit 1, stated and tested;
  - R3 — the untracked nested repository (`vendor/lib/`) named in the claim, and tested.
  - Round 2 also re-checked round 1's findings: F1 fixed at both call sites, F2–F6 folded, F7 deferred.
- No re-review ran on final prep or the apply; the orchestrator did not ask for one.

`GRILL.md`, which is advisory, gives the Step 1b lessons-declaration verdict GREEN and 8 concerns (G1–G8: 1 important,
7 minor), all folded into `PLAN.md`.

## The human apply — result

- The maintainer ran `proposed/apply.sh`. As relayed by the orchestrator, it printed `LIMITS.md: OK`, `FLOOR: GREEN`,
  `SPECIFIED-MARKERS: GREEN` and "applied, checked and committed". Checked here: `1cbb6c4` touches `LIMITS.md` only
  (+15 −3), and the committed file hashes to the recorded sums
  (`e7be1413b84f0198ced7e8f1dbc17b779d271a148e725b4b186685b7cd0bb5d7`), unchanged through the merge of `origin/main`.
- `pharn/ARCHITECTURE.md` was not touched, so its pin stays `d831d30d…`.
- `proposed/APPLY.md`'s after-apply steps were then followed: the setter from `PLAN.md` (44 paths), then
  `reconcile-baseline.mjs --anchor --by loop-quick-mode-after-apply` (2428 paths). No baseline was edited or deleted.

## The standing verdicts, verbatim

On the applied tree — `b88aebd` plus this stage's artifacts:

- `/pharn-dev-build` → `validate` exit **0** (`FLOOR: GREEN — 36 capabilities checked`).
- `/pharn-dev-regress` → `regression-report.json` `.verdict`: **`no-regressions`**, base `c85be1b`, 51 inside
  (`LIMITS.md` among them, exempt as a trusted doc), no escape, 109 outside test files (`REGRESSION.md`).
- `/pharn-dev-verify` → `verify-report.json` `.verdict`: **`PASS`**. All seven gates exited 0, `test` passed
  4007/4007, and `reconcile` read CLEAN against the epoch anchored after the merge commit (`VERIFY.md`).

`npm run check` exited 0 on the final tree, this file included.

changelog-entry: exit 0

## Lesson (Step 2b)

lesson: skipped

Round 1 of `REVIEW.md` proposed one candidate; round 2 proposed none. It was not taken to `/pharn-dev-memory-promote`:
the orchestrator decided, under the maintainer's delegation, to defer it rather than promote it now. That was a
model's answer, not a human's answer to the 2b.3 form. The candidate is carried below, not dropped.

deferred:

- The L5 recurrence: "Double quotes are not a boundary for untrusted text — a pinned line that substitutes a path list
  into `"…"` lets `$` and backticks rewrite it or run it (L5 recurred at the quick scope line)." `REVIEW.md`, "Proposed
  lesson candidate" (round 1), source finding F1, candidate `type` `tooling`. F1 itself is fixed (`6220299`); the
  candidate is the transferable part.

## Follow-ups, named and not built (P7)

- **F7, `pharn-loop.md`'s size → the roadmap's Phase 4.1.** `REVIEW.md` (F7) measured the file at 97,748 B then:
  78,020 B before this increment, +19,728 B, of which `## Quick mode` was 14,784 B. It is 112,538 B now, 25,012 B over
  `main`'s 87,526 B, with `## Quick mode` at 18,688 B. About 4.9 KB of the section is rationale or audit, not
  instruction:
  - the mode-binding paragraph (522 B), the D8 paragraph (852 B), the quick guarantee audit (2,266 B), item 5's
    divergence note (456 B, since replaced by its bound), the first-token rule's bound (~400 B), and item 1's
    mode-marker note (~150 B);
  - about 2 KB of the question table restates Step 2 rows; only four are quick-only;
  - moving `## Quick mode` to a file read only under `--quick` would save about 13–14 KB per full-run read, on the
    review's four conditions.

  The GATE-2 fixes, the coupling and final prep lengthened the section, so re-measure at Phase 4.1.

- **`regress-inside-echo-list`** — the regress verdict call's `inside` echo (ADVISORY, read by no floor op) still
  travels as a comma list, so a comma or newline changed path is refused (`unrepresentable-path`, fail-closed).
  Retiring it needs an array-safe verdict input, a stage-exit registry change and a decision on `REGRESSION.md`'s
  one-path-per-line listing.
- **The PLAN's named deferrals** (`PLAN.md`, "Deferred — named, not dropped"):
  - `architecture-loop-quick-line` — one sentence in `pharn/ARCHITECTURE.md §6` naming `/pharn-loop --quick`, at a
    trusted-docs catch-up (the pin moves then, once);
  - `loop-quick-run-report` — `render-run-report.mjs`'s regress line, if a quick loop ever renders a report (none
    does, by the maintainer's decision);
  - `quick-size-signal` (3.1's, still open) — any measurement of change size.
- **Closed by this increment:** `quick-scope-inputs-by-code` (the GATE-2 F1 fix), and `regress-scope-list-grammar`
  (found at GATE 2, fixed in the coupling round).
- **Reported by round 2, not findings:** the hygiene suite's quick hand-over check has no mutation control of its own
  (2.2's `handOverReasons` has none either); and `README.md`'s routing paragraph, 2.2's text, lists the stages that
  run on the session's model without the quick grills (the `CLAUDE.md` block says "(the quick grill excepted)").

chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
