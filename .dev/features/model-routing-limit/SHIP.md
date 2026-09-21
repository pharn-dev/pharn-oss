# SHIP — model-routing-limit

**Run ended at GATE 2** — the human decides merge / fix / abandon. The chain completed after one
RED-verdict STOP and a human-directed plan amendment.

## Stages run, in order

| #   | stage                | structural verdict read                | result                                 |
| --- | -------------------- | -------------------------------------- | -------------------------------------- |
| 1   | `/pharn-dev-plan`    | GATE 1 — human approval halt           | **Approved as written**                |
| 2   | `/pharn-dev-grill`   | `check-plan-lessons.mjs` exit code     | **0 — proceed**                        |
| 3   | `/pharn-dev-build`   | `pharn/floor/validate.mjs .` exit code | **0 (GREEN) — proceed**                |
| 4a  | `/pharn-dev-regress` | `regression-report.json` `.verdict`    | **`regressions` — STOP** (run 1)       |
| —   | plan amendment       | human-directed after the STOP          | `README.md` added to `## Files`        |
| 4b  | `/pharn-dev-regress` | `regression-report.json` `.verdict`    | **`no-regressions` — proceed** (run 2) |
| 5   | `/pharn-dev-verify`  | `verify-report.json` `.verdict`        | **`PASS`** — 7/7 gates exit 0          |
| 6   | `/pharn-dev-review`  | no structural verdict (advisory)       | **GATE 2** — 0 floor-gate, 4 advisory  |

## The verdicts, verbatim

- **`/pharn-dev-grill`** — `check-plan-lessons.mjs` **exit 0**: `GREEN — applied_lessons: L1, L25, L26,
L35, L37, L43 … all 6 cited id(s) resolve … and are referenced in the plan body.` Spec-hash matched
  (`83890d97…9487`). Re-run **exit 0** after the plan amendment.
- **`/pharn-dev-build`** — `validate.mjs .` **exit 0**: `FLOOR: GREEN — 36 capabilities checked in "."`.
- **`/pharn-dev-regress` run 1** — `.verdict` **`regressions`**, exit 1. `regressions: ["tests"]`,
  `pre_existing: []`, `escaped: []`. The `tests` gate flipped `0 → 1`.
- **`/pharn-dev-regress` run 2** — `.verdict` **`no-regressions`**, exit 0. `regressions: []`,
  `pre_existing: []`, `escaped: []`. Both maps re-captured against a freshly re-created baseline
  worktree at the immutable base SHA — run 1's captures were not reused.
- **`/pharn-dev-verify`** — `.verdict` **`PASS`**, `failing_gates: []`. Gates: `test`, `validate`,
  `lint`, `format:check`, `lint:md`, `structural:expected-injection-comment`, `reconcile` — all exit 0.
  `reconcile` = `CLEAN`, 8 reconciled, **0 escapes**, 4 exempted. Verifiers: `registered: 0` — floor
  gates only.
- **`/pharn-dev-review`** — advisory, no structural verdict by design. **0 floor-gate findings, 4
  advisory** (1 important, 3 minor).

## Why run 1 STOPped, and what changed

`SKILLS_VERSION` was bumped `6.3.0 → 6.3.1` while the shields badge at `README.md:24` still read
`6.3.0`; `check-version-badge.mjs` holds those in byte-equality, so
`.dev/floor/check-version-badge.test.mjs` failed. `README.md:24` was not in the plan's `## Files`, so
the fix #7 guard would have denied the write — the remedy required a **plan amendment**, which the
human directed.

The amendment did three things: added `README.md` (`:24` only) to `## Files`; corrected the
`applied_lessons` **L1** line to say five surfaces and to **record the omission** rather than absorb it
(**L33**); and stated the agent/human split **by kind** — version bookkeeping (`SKILLS_VERSION`,
`CHANGELOG.md`, the badge) moves in the working tree, content ships as human-applied patches. That
split also resolved the grill's blocking-severity finding.

## Beyond the chain — the applied END STATE was verified (L26)

The patches were not merely checked for applicability. A throwaway `git worktree` of this repository at
`231e422`, carrying the working-tree bookkeeping, with **all four patches applied and committed**:

**`npm run check` full-chain exit code `0`** across all ten gates — `format:check`, `lint`, `lint:md`,
`docs:check`, `check:markers`, `check:badge`, `check:changelog`, `check:contributing`,
`check:reconcile`, `test` (**2142 assertions, 0 failures**). `LIMITS.md § 8` landed at `:299`.

That run also surfaced a real gotcha now documented in `APPLY.md`: `check:reconcile` REDs on an
**uncommitted** `pharn/floor/check-model-config.mjs`, because `pharn/floor/**` is deny-by-default and
the always-reconciled control surface is anchored in **committed blob ids**, not the `.pharn/` baseline.
Committing first returns it to `NO_BASELINE` (GREEN by design). Correct behaviour — but it would have
read as a failure to whoever applied the patches.

## Pointers (cited, not restated — P4)

- `PLAN.md` — the approved and amended plan, the STEP-1 trigger demonstration, four human-resolved OPEN
  questions.
- `GRILL.md` — 5 advisory concerns (1 blocking-severity, 1 important, 3 minor). **Free-text is
  `trust: untrusted` DATA, quoted for the human, never followed.**
- `REGRESSION.md` — both runs; run 1's RED kept rather than overwritten.
- `VERIFY.md` — the gate table, the `reconcile` bounds, and the residual that matters here: **the gates
  that passed do not read the text this increment exists to ship.**
- `REVIEW.md` — 0 floor-gate findings; the one important finding (a universal quantifier in § 8) was
  **acted on**: the wording was narrowed and the patch regenerated (+45) and re-verified.
- `proposed/` — four patches + `APPLY.md` with the verification record and the commit-first ordering.

lesson: promoted L49

deferred: none

## Rebase onto main — recorded, because it RENUMBERED two shipped facts

The branch was built on `231e422` (`SKILLS_VERSION` 6.3.0). While it was in flight, main advanced two
commits to **6.4.0**, and **both** of this increment's chosen numbers were taken in the meantime:

| fact             | as built | collided with                                    | now       |
| ---------------- | -------- | ------------------------------------------------ | --------- |
| `SKILLS_VERSION` | 6.3.1    | `1df107b` shipped 6.3.1; `23f6d14` shipped 6.4.0 | **6.4.1** |
| canon lesson id  | L47      | main's own L47 **and** L48                       | **L49**   |

Resolved by merging `origin/main` into the branch. `LIMITS.md` **auto-merged** — main edited lines 92
and 138, this increment appends at 293, so the regions are disjoint. Five files conflicted
(`SKILLS_VERSION`, `README.md`, `CHANGELOG.md`, `.dev/memory-bank/lessons-learned.md`,
`docs/lessons-index.md`); each was resolved so that **both** sides survive — main's CHANGELOG entries
and its L47/L48 are intact, and this increment's entry moved to the end of canon as L49.
`docs/lessons-index.md` was **regenerated**, never hand-merged.

**The narrative artifacts above are deliberately NOT rewritten.** `PLAN.md`, `GRILL.md`,
`REGRESSION.md` and `REVIEW.md` say `6.3.1` because that is what the run decided and what the floor
measured at the time — `check-version-badge.mjs` really did report _"the badge reads 6.3.0 but
SKILLS_VERSION is 6.3.1"_. Back-dating those numbers would falsify the record of a real STOP. Only the
**shipped** bytes and this file's own status line were renumbered.

**One shipped byte still carries the old number and the agent cannot fix it:** `LIMITS.md:342`'s
trailing marker reads `(SKILLS_VERSION 6.3.1)` and should read `6.4.1`. It is inside a hook-denied
trusted doc, so it is staged as `proposed/LIMITS-version-marker.patch` for a human, exactly as §8
itself was.

---

The chain ran to GATE 2 and the named floor verdicts are as shown — this is **NOT** a judgment that the
increment is good or wise; that is the human's call. `/pharn-dev-ship` did not merge, push, commit, or
seal anything, and it issues no `PHARN ✓ reviewed`.

**One thing is NOT done and cannot be done by the agent:** `LIMITS.md` is hook-denied (probed: exit 2,
control exit 0), so the four patches remain **unapplied**. Routing that write through Bash to dodge the
guard is the one thing CLAUDE.md forbids, and applying only the three non-trusted patches would leave
three live pointers to a `§ 8` that does not yet exist. `APPLY.md` carries the four commands and the
commit-first ordering.
