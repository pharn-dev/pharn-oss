# SHIP — hook-hardening-batch

Batch group O (audit 2026-10-12: TST-4, TST-11, the SEC-5 remainder, SEC-7's prose, CTX-13, and the 6.67.0
THREAT-MODEL follow-ups). Branch `fix/hook-hardening-batch`. Released as **6.71.0**: the minor bump comes from the new
`--allow-exec-config` flag, and the number was renumbered twice as main moved.

## Stages, in order

1. `/pharn-dev-plan`: PLAN.md, lessons declaration GREEN.
2. **GATE 1:** delegated to the batch orchestrator, who approved Q1–Q5 as recommended. That is a model decision made
   under the maintainer's delegation, not a human approval.
3. `/pharn-dev-grill`: `check-plan-lessons.mjs` exit **0**; 5 advisory concerns (GRILL.md).
4. `/pharn-dev-build`: tests, the sha256-pinned `apply.py`, HUMAN-PATCH.md and the restatements. `validate` exit
   **0**.
5. `/pharn-dev-review`, before the apply: GREEN, 0 floor-gate and 6 advisory findings (REVIEW.md).
   - An independent read-only subagent probed the patch in two rounds.
   - Every fail-open it reproduced was fixed and is now pinned by a test, before the maintainer ran anything.
6. Two merges of `origin/main`.
   - Group G (6.68.0) is in. The five targets still matched the BEFORE hashes.
   - The read-only precheck matched every AFTER hash.
7. **The apply.** The maintainer ran `python3 .dev/features/hook-hardening-batch/apply.py` at `72c5484f`.
   - The agent checked all five AFTER hashes, then committed the five files and the script's deletion as `74638672`.
   - Those bytes were written by the maintainer, not the agent, and the commit message says so.
8. A fresh `/pharn-dev-build` Step 0 (setter, then anchor) ran over the committed tree. That is REVIEW A1, approved by
   the orchestrator under the same delegation.
9. `/pharn-dev-regress`: `regression-report.json` `.verdict` = **`no-regressions`**.
   - Its scope check first flagged the three maintainer-applied hooks: PLAN.md named them only in prose.
   - PLAN.md now lists them, with a dated note (REGRESSION.md).
10. `/pharn-dev-verify`: `verify-report.json` `.verdict` = **`PASS`**, `reconcile` `CLEAN`.
    - The first `lint` red came from this stage's own scratch runner under `.pharn/`, not from a tracked file.
    - That runner was fixed and lint re-run; VERIFY.md records both runs.
11. **GATE 2:** delegated to the orchestrator: merge on green CI and fix any blocking finding. There were no blocking
    findings to fix.

## Verdicts read

- validate: exit 0
- regression-report.json `.verdict`: `no-regressions`
- verify-report.json `.verdict`: `PASS`
- `check:surface-bump`: GREEN (6.70.0 → 6.71.0)
- `docs:check`, `check:markers`, `check:badge`, `check:changelog`, `check:contributing`, `check:reconcile`: each exit 0

Pointers: GRILL.md, REVIEW.md, REGRESSION.md, VERIFY.md, BUILD.md, HUMAN-PATCH.md (all advisory records).

changelog-entry: exit 0

lesson: deferred — per the batch brief, canon is not promoted in this batch. Candidate (REVIEW.md, "Proposed lesson
candidate"): a fix to a parser that mirrors an external tool's grammar can open a new bypass, so check the change
against the tool itself, not against the finding's wording. Round 1 asked for lone-CR line ends to be honored. The fix
split lines on a lone `\r`, which let a crafted config move a key out of `[core]` (round 2, finding 1).

deferred: none

_Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate (here delegated to the orchestrator)._
