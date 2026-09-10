# SHIP — readme-audit-repairs

**Run ended at a RED-verdict STOP in `/pharn-dev-regress`.** Not at GATE 2. Nothing here is a decision,
an approval, or a seal.

## Stages that ran, in order

| #   | stage                | structural verdict read                                                | outcome  |
| --- | -------------------- | ---------------------------------------------------------------------- | -------- |
| 1   | `/pharn-dev-plan`    | GATE 1 — human approved as written                                     | proceed  |
| 2   | `/pharn-dev-grill`   | `check-plan-lessons.mjs` **exit 0**                                    | proceed  |
| 3   | `/pharn-dev-build`   | `node pharn/floor/validate.mjs .` **exit 0** (GREEN — 36 capabilities) | proceed  |
| 4   | `/pharn-dev-regress` | `regression-report.json` **absent — no `.verdict` computed**           | **STOP** |
| 5   | `/pharn-dev-verify`  | not run                                                                | —        |
| 6   | `/pharn-dev-review`  | not run                                                                | —        |

**Where the run ended:** `/pharn-dev-regress`, at its Step-1 scope check. `check-regress.mjs scope` exited
**1** with a blocking fix #7 escape finding, which that stage's spec classifies as _"a scope breach, not a
regression — surface it and stop."_ The comparison never ran.

## The structural verdicts, verbatim

- `/pharn-dev-grill` → `check-plan-lessons.mjs`: `GREEN — applied_lessons: L1, L18, L19, L20, L28, L33,
L35, L36, L37 … all 9 cited id(s) resolve … and are referenced in the plan body.` **exit 0**
- `/pharn-dev-build` → `validate.mjs`: `FLOOR: GREEN — 36 capabilities checked in "."` **exit 0**
- `/pharn-dev-regress` → **no verdict**. `regression-report.json` is deliberately not written; that file is
  contractually the helper's `verdict` JSON verbatim, and no `verdict` run occurred.

Spec pin held throughout: `bed2c2a58c113a374056ab23d2c74fe1a3395fa62be12e7a654e3b260552e299`, recomputed
at plan, grill and build.

## What actually landed

Five prose repairs in `README.md`, the single path the plan's `## Files` authorizes (F1, F3, F4, F5, F6).
**F2 was dropped at the post-grill halt** by the human, on the grill's blocking finding that its premise is
contradicted by the installer's own published table and cannot be adjudicated from this tree; the install
tree is untouched. Whole-repo confirmations after the build: `format:check`, `lint:md`, `lint`,
`docs:check`, `check:badge` all exit 0; the `CURRENT-STATE` generated block is byte-identical.

**The `README.md` edit is uncommitted and stands on its own** — the stop happened after the build, so the
repairs exist in the working tree with no regression or verify evidence behind them.

## Why the stop is a false escape, and what it really found

The escaped path is `.dev/features/claude-dir-scan-exclusion/PLAN.md` — **another session's artifact**, not
this build's. Evidence is recorded in full in [`REGRESSION.md`](./REGRESSION.md): different increment,
different `applied_lessons`, written 10:38:21 versus this build's 10:43:54 `README.md` write, and this
build's writes-scope was `['README.md']` throughout under a guard that demonstrably fired on this very
session.

What the stop genuinely surfaced is a **method limitation**: `scope` derives `escaped` from
`git diff <base>`, which answers _what changed_, not _what this build wrote_. `--feature` closes that gap
for the feature's own artifacts; a second agent session writing into the same tree is the same gap in a
case `--feature` does not cover. It was **not** hand-filtered — L17 and L20 are exactly about not
excluding paths by hand to make this check pass.

## Pointers (cited, not restated — P4)

- Interrogation: [`GRILL.md`](./GRILL.md) — advisory, 3 concerns (1 blocking-severity, 2 important).
- Scope-breach detail and unblock options: [`REGRESSION.md`](./REGRESSION.md).
- Approved intent, the dropped F2, and the `install-tree-vs-installer` residual: [`PLAN.md`](./PLAN.md).

lesson: not-reached (pharn-dev-regress)

deferred:

- **L18 recurred inside this run's own plan** — the first draft's exclusion block used the bold-prose form
  and `set-writes-scope.cjs --from-plan` granted **3 paths against the 1** `## Files` authorized, including
  `SKILLS_VERSION`. Caught only by reading the setter's printed count. This was flagged at GATE 1 as the
  run's leading lesson candidate and was to be judged at GATE 2, which the run never reached.
- **Two concurrent agent sessions share one working tree and one mutable `.pharn/writes-scope.json`** —
  observed twice this run: a scope clobber that correctly denied this session's `GRILL.md` write, and the
  false escape that stopped `/pharn-dev-regress`. Candidate shape: a stage's scope record should be
  identifiable to its own run, or concurrent runs should be worktree-isolated.

Both are recorded rather than dropped. Neither has been promoted, and neither passed a human gate —
Step 2b (lesson-extract) does not run on a RED-verdict STOP, by design, because a lesson drawn from a
half-run has no traceable `source`.

---

Chain ran to `/pharn-dev-regress`; the named floor verdicts are as shown — this is **NOT** a judgment that
the increment is good or wise, and **not** a certification that nothing broke. That is the human's call.
The run stopped short of both `/pharn-dev-verify` and `/pharn-dev-review`, so no verify or review evidence
exists for this increment.
