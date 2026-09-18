# SHIP — hook-cwd-anchoring

- stage: `/pharn-dev-ship`
- feature: `hook-cwd-anchoring`
- date: 2026-09-18
- branch: `fix/hook-cwd-anchoring` · fork point `f66f4d3` · guard commit `a7f32a1`
- **run ended at: GATE 2 (reached)**
- lesson: promoted L45

## Where the chain got to

| stage                | verdict read (deterministic)        | result                                              |
| -------------------- | ----------------------------------- | --------------------------------------------------- |
| `/pharn-dev-plan`    | human approval halt                 | **GATE 1 passed** — plan accepted as written        |
| `/pharn-dev-grill`   | `check-plan-lessons.mjs` exit       | **0 (GREEN)** → proceed                             |
| `/pharn-dev-build`   | `validate.mjs .` exit               | **0 (GREEN)** → proceed                             |
| `/pharn-dev-regress` | `regression-report.json` `.verdict` | **`no-regressions`** → proceed                      |
| `/pharn-dev-verify`  | `verify-report.json` `.verdict`     | **run 1: `FAIL`** (`test`) → **STOP**               |
| _human apply_        | `apply.sh`                          | patch applied, 222/222 hook tests, commit `a7f32a1` |
| `/pharn-dev-regress` | `regression-report.json` `.verdict` | **`no-regressions`** (refreshed) → proceed          |
| `/pharn-dev-verify`  | `verify-report.json` `.verdict`     | **run 2: `PASS`** (7/7 gates) → proceed             |
| `/pharn-dev-review`  | prose only — no structural verdict  | **GREEN**, 0 blocking, 6 advisory                   |
| GATE 2               | —                                   | **reached**                                         |

Every proceed/stop was read from a floor exit code or a `.verdict` field — never from prose and never
from my assessment. **Running** the stages is advisory orchestration; only those verdicts are
floor-grade. `/pharn-dev-ship` added no floor primitive and issued no seal.

## The designed STOP, and how it cleared

Verify run 1 returned **FAIL** on `test`: 20 failures / 2066, every one inside this increment's three
in-flight hook suites. The tests assert the **patched** guard behavior; the two guard scripts plus
`settings.json` and `LIMITS.md` are fix #2-protected, so the agent could not write them and the patch was
staged for a human at `proposed/human-only.patch`.

The human ran `sh .dev/features/hook-cwd-anchoring/proposed/apply.sh`, which reconcile-checkpointed,
`git apply --check`ed, applied, re-verified the pinned sha256, ran all three hook suites **on the applied
bytes** (222/222), committed path-scoped as `a7f32a1`, re-ran the setter and re-anchored the epoch.

**That FAIL is not retroactively a pass.** `VERIFY.md` keeps both runs.

## Standing state at GATE 2

- `npm run check` **exit 0** — all ten aggregate gates (`format:check`, `lint`, `lint:md`, `docs:check`,
  `check:markers`, `check:badge`, `check:changelog`, `check:contributing`, `check:reconcile`, `test`)
- `npm test` **2066 / 2066**, 0 fail
- `check-bash-reconcile --require-baseline` → **`CLEAN`**, `escapes: []`; `docs/lessons-index.md` appears
  under `exempted`, so Step 6b's declared Bash write is **accounted for**, not silently ignored
- `SKILLS_VERSION` **6.1.0** (minor — the increment ships a new guard: fix #2 now denies tool writes to
  git metadata), badge and CHANGELOG entry in agreement

## Step 2b — lesson-extract: PROMOTED

`lesson: promoted L45`.

One candidate cleared the L20 bar and the human accepted it at the Step-5 gate:

> **L45 — A fix inside a guard never reaches production while the file that INVOKES it keeps the defect —
> and a suite that spawns the script by path cannot see the gap** · `type: process` ·
> `concepts: [hook-wiring, invocation-layer, negative-control, fail-open, test-blindspot]`

`check-provenance.mjs` returned GREEN twice (Step 3 and the Step-6 re-run), the Step-6 content-hash
compare confirmed canon had not moved during the human wait, the entry was written through the `Edit`
tool under a scope pinned to exactly `.dev/memory-bank/lessons-learned.md`, and
`.dev/floor/gen-lessons-index.mjs .` refreshed the committed index (`docs:check` exit 0). The id was read
from the structured location — the live `## L45` heading — never from printed prose (L6).

**One drafting correction is worth recording:** the candidate was first typed `tooling`; reading the
nearest neighbours live showed L41 and L40 are both `process`, and the concept vocabulary already had
`test-blindspot` rather than the near-miss `test-blind-spot` I had invented. Both were corrected **before**
the floor gate, and the alternative was put to the human at the gate rather than decided silently.

**Canon was not written by this command.** `/pharn-dev-ship` holds no scope to `.dev/memory-bank/**`;
the write happened inside `/pharn-dev-memory-promote` under its own scope, behind its own human gate.

## Deferred, not dropped

- **`hook-wiring-check`** — a floor check that the wired commands resolve from a cwd other than the launch
  root. `hook-wiring.test.cjs` pins and executes the **committed** command strings today; nothing can
  prove the running harness loaded that `settings.json`, because no floor primitive reaches the live
  harness. Raised here as a scope question for a later increment.
- **`check-regress.mjs` has no attribution** — it reports any undeclared changed path as "the build
  escaped its plan's `## Files`", so a **human-applied** commit to hook-protected control surface is
  reported as an agent escape whenever the resolved base predates it. Reproduced live this run (see
  `REGRESSION.md`). First occurrence, so no remedy is proposed (P7); recorded so a second is
  recognizable.
- The grill's 26 concerns each carry a recorded disposition in `GRILL.md`; the review's 6 advisory
  findings are in `REVIEW.md`.

## What this document does NOT do

No merge, no tag, no `PHARN ✓ reviewed` seal. Nothing reads this file — no checker parses `SHIP.md` and
`validate.mjs` ignores `.dev/` — so the `lesson:` line above is **advisory bookkeeping**, not an enforced
guarantee.

## GATE 2 — the human decision

The standing instruction for this run was to open a pull request and report when checks are green. The
verdicts above are what that decision rests on; the merge itself remains the human's, and no agent step
performs it.
