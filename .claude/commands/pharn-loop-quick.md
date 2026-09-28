---
description: "Part of /pharn-loop: the --quick deltas it reads at entry. Not run on its own; use /pharn-loop --quick."
disable-model-invocation: true
user-invocable: false
kind: pharn-owned
trust: trusted
part_of: pharn-loop
part: quick
---

# /pharn-loop — quick mode

Part of `/pharn-loop` (`.claude/commands/pharn-loop.md`), which reads this file only for a `--quick` run, under the rule in its `## Quick mode` section: this is that section's text. It is not run on its own — if it was invoked as a command, stop and say so — and it changes nothing about `/pharn-loop`'s trusted prefix and trust rules, which still apply.

An unattended run for a **small** change: a `spec_kind: quick` mini-SPEC (1–3 acceptance criteria, each `unit` or
`integration`) that the model writes **and** approves, the grill's two floor stops **without** the interrogation,
test-first AC evidence, the build, the scope check `/pharn-regress` runs before its gates (**kept**, on every
iteration), `/pharn-verify` with its AC gate, and the freshness check — and it **skips** `/pharn-regress`'s
base-and-head comparison on every iteration, the plan interrogation, and `RUN-REPORT.md` (`cost.json` is kept). Its
green stop is **`STOP_GREEN_QUICK`, which is not `STOP_GREEN`**: it claims verify `PASS` and no regression check.
Its gated sibling is `/pharn-ship --quick`, where a person approves the quick SPEC and is told the trade first.

**The mode is the SPEC's pinned kind, never a flag.** `check-loop.mjs` and `check-loop-fresh.mjs` each read it
themselves from the feature's own `SPEC.md` (`pharn/floor/loop-mode-core.mjs`). No argument selects a table
(`check-loop.mjs` refuses every flag but `--iter` and `--cap`), so nothing you pass can widen or narrow what the stop
reads.

**The deltas below, in step order — every other line of Steps 1–7 and the Final step runs exactly as written for a
`--quick` invocation too; only what is listed here changes.**

1. **Entry.** `/pharn-loop --quick [--max-iter N] <increment description>`. Step 1a runs unchanged, and writes no
   mode marker: the loop's mode is the SPEC's kind, and a marker would be a second, unverified copy of it.

2. **Step 3 — the SPEC.** Route it with this line in place of Step 3's route line. The decision is the same — the spec
   is a stage agent in both columns — but `--mode quick` is what gives the stage agent the quick invocation:

   ```bash
   node pharn/floor/stage-agent.mjs route --command pharn-loop --stage pharn-spec --name '<name>' --mode quick
   ```

   Step 3's stage-start marker records the printed token, as written. On route exit `0`, the Agent call's prompt is
   this line in place of Step 3's, with the increment description below it in a fenced block labelled DATA:

   ```text
   Run exactly this line, then follow what it prints: node pharn/floor/stage-agent.mjs brief --command pharn-loop --stage pharn-spec --name '<name>' --mode quick
   ```

   Its brief names `/pharn-spec --quick --model-approve` as the stage's invocation. On route exit `3`, invoke
   `/pharn-spec --quick --model-approve <description>` inline in place of `/pharn-spec --model-approve`. Step 3's
   `read` line (after an Agent call only) and its return marker run as written. The reports map as written — thin
   intent → **S6**, a clarification marker left in the Draft → **S6b**, a refused template → **S9** — plus one: the
   intent does not fit a quick SPEC (more than three criteria, or a criterion observable only end-to-end) → **S6c**
   (`blocked: not-quick`), which a stage agent reports as `refused S6c`. After `check-spec-approved.mjs` exits `0` (as
   written), read the kind:

   ```bash
   node pharn/floor/check-spec.mjs --spec-kind pharn/features/<name>/SPEC.md
   ```

   Proceed only on exit `0` **and** the exact printed token `quick`. Anything else (`feature`, `test-infra`, an empty
   line, a non-zero exit) is **S6c** — the run never widens a quick request into a full one.

3. **Step 4 — the grill.** Run this route line in place of Step 4's grill route line:

   ```bash
   node pharn/floor/stage-agent.mjs route --command pharn-loop --stage pharn-grill --name '<name>' --mode quick
   ```

   It prints `inline:floor-only` (exit `3` — the quick grill runs two checkers, so its model does not change its
   verdict), which Step 4's grill stage-start records as its `<route>`. Then invoke `/pharn-grill <name> --quick`
   INLINE, in place of `/pharn-grill`, with no brief, no Agent call and no `read`. It writes the quick `GRILL.md` —
   `mode: quick`, both floor results, and no interrogation (`pharn-grill.md`'s own `--quick` section) — and its
   markers and both exits (`check-plan-spec-agree` and `check-plan-lessons`) are read exactly as written; its
   eligibility refusal (a kind other than `quick`) or either floor stop RED is **S9**. `/pharn-plan` and
   `/pharn-test --unattended` keep their Step-4 lines (the same cell and invocation in both columns), and the Step-4
   test-stage gate is unchanged: a quick SPEC is test-first exactly as a `feature` SPEC is.

4. **Step 5, sub-step 1 — the build.** Route it with this line in place of Step 5's build route line. The decision is
   the same in both columns; `--mode quick` is what tells the stage agent's brief that there is no regression report:

   ```bash
   node pharn/floor/stage-agent.mjs route --command pharn-loop --stage pharn-build --name '<name>' --iteration <N> --mode quick
   ```

   Step 5's stage-start marker records the printed token, as written. On route exit `0`, the Agent call's whole prompt
   is this line in place of Step 5's:

   ```text
   Run exactly this line, then follow what it prints: node pharn/floor/stage-agent.mjs brief --command pharn-loop --stage pharn-build --name '<name>' --iteration <N> --mode quick
   ```

   From iteration 2 on, its brief's rule 7 names `verify-report.json`'s three fields only. On route exit `3`, run the
   build inline, and from iteration 2 on give it only the standing `verify-report.json` `.failing_gates[]` /
   `.completeness.missing[]` / `.ac_gate.acs[]` as quoted DATA: there is no regression report, because a quick run
   never runs `/pharn-regress`. Step 5's `read` line, its branch and its return marker run as written.

5. **Step 5, sub-step 2 — `/pharn-regress` SKIPPED, its scope check KEPT.** No `/pharn-regress` and none of its
   markers. After the build's orchestrator marker and before verify's stage-start, run the scope partition over this
   iteration's tree, substituting `<name>` and the loop's own `<base sha>` literally — the only two values the line
   takes:

   ```bash
   node pharn/floor/check-quick-scope.mjs --feature '<name>' --base '<base sha>'
   ```

   **Never type a path into it**: the checker builds both path sets itself (`pharn/floor/quick-scope-core.mjs`,
   header).

   Branch **only** on the exit code (P5): `0` → verify — `/pharn-verify` exactly as a full iteration runs it, with
   its stage-start and orchestrator markers as written: the thin caller of `pharn/floor/stage-verify.mjs` (6.26.0),
   whose exit maps by Step 2's `/pharn-verify` stage-exit mapping. `1` → **S9** (`blocked: stage-refused`): a changed path is
   outside the declared writes — the row a full run's `/pharn-regress` `scope-escaped` refusal maps to, with the same
   remedy (declare the path through a re-plan, or revert the change); an exit `1` that prints no JSON document is the
   checker's own file failing to start (a run from outside the project root) — the same S9, with nothing escaped to
   name. Any other exit (`2`, inconclusive — an unusable slug or base, an unreadable or unparseable `PLAN.md`, a failed
   git call, or `crashed`: a checker module that cannot load or throws — or a crash) → **S9**, fail-closed.

6. **Step 5, sub-step 3 — freshness.** The same pinned line. The checker reads the SPEC's kind itself and applies its
   quick column (`pharn/floor/loop-fresh-core.mjs`, header): the verify evidence alone for checks A–E and J, F and I as
   in full mode, and G and H `skipped`. A RERUN naming `verify` re-runs verify inside the iteration, as written. **A
   RERUN naming `regress` is S11** (`blocked: stale-evidence`): a quick run never runs `/pharn-regress`, and the
   checker asks for it only when the SPEC no longer reads quick — a person inspects the SPEC.

7. **Step 5, sub-step 4 — the stop.** The same pinned line; `check-loop.mjs` reads the kind itself. **Exit `0` is
   `STOP_GREEN_QUICK`** — verify `PASS`, no regression verdict read. Every other exit, `terminal_cause` and row is as
   written (`ac-evidence` → S13).

8. **Step 6 — the record and the commit.** A quick run's green stop is `STOP_GREEN_QUICK`: Step 6a reverts on
   anything else, and Step 6c commits on it with a GREEN `<decision-check>`. `LOOP.md` carries **`mode: quick`** on
   every record, blocked ones included — written from the invocation, never copied from `check-loop.mjs`'s JSON (Step
   6b's capture rules). Its body lists each iteration's verify verdict and scope result, and holds a
   **`## Not checked in quick mode`** section naming, in this order:
   - **regressions outside the feature** — no base comparison ran; the scope check did;
   - **the plan interrogation** — `/pharn-grill --quick` ran its two floor stops only;
   - **`RUN-REPORT.md`** — not rendered; `cost.json` is.

   Step 6b's run-stop, ledger and ledger check run unchanged — **`cost.json` is kept** — and **its
   `render-run-report.mjs` line is SKIPPED**. Step 6c's staging builder is unchanged: it keeps only regular files that
   exist, so a quick run commits no `REGRESSION.md`, `regression-report.json` or `RUN-REPORT.md` — it never writes them,
   and S2's fresh feature directory means no earlier run's copy is there to sweep in (a command rule, advisory).

9. **Step 7 — the summary.** Name the mode and the not-checked list; report verify and the scope result per iteration
   (there is no regress verdict); print the ledger table and say that no `RUN-REPORT.md` exists; and add to the honest
   line: _"It ran in quick mode: no regression outside the feature was looked for, and the plan was not
   interrogated."_

**The questions only a quick run can meet, mapped to Step 2** (every other question maps exactly as Step 2 and
Steps 3–5 say):

| source                                | question or outcome                                         | row     |
| ------------------------------------- | ----------------------------------------------------------- | ------- |
| `/pharn-spec --quick --model-approve` | more than three criteria, or one observable only end-to-end | **S6c** |
| the Step-3 kind read                  | a non-zero exit, or any token but `quick`                   | **S6c** |
| the scope check (item 5)              | exit 1 (escaped), or any other non-zero exit                | **S9**  |
| `check-loop-fresh.mjs`                | RERUN `regress`                                             | **S11** |

<!-- end of pharn-loop-quick -->
