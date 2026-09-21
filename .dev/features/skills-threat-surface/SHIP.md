# SHIP — skills-threat-surface

**Mode:** gated `/pharn-dev-ship` (no `--loop`). **Worktree:** `worktree-skills-threat-surface`, branched
from `a2d73eb`. **Run ended at: GATE 2** — the post-review human decision.

## Stages run, in order

| #   | stage                | structural verdict read                            | result                           |
| --- | -------------------- | -------------------------------------------------- | -------------------------------- |
| 1   | `/pharn-dev-plan`    | GATE 1 — human approval halt                       | **Approved as written**          |
| 2   | `/pharn-dev-grill`   | `check-plan-lessons.mjs` exit code                 | **0 — GREEN** → proceed          |
| 3   | `/pharn-dev-build`   | `pharn/floor/validate.mjs` exit code               | **0 — GREEN** (36 capabilities)  |
| 4   | `/pharn-dev-regress` | `regression-report.json` `.verdict`                | **`"no-regressions"`** → proceed |
| 5   | `/pharn-dev-verify`  | `verify-report.json` `.verdict`                    | **`"PASS"`** → proceed           |
| 6   | `/pharn-dev-review`  | _no structural verdict — advisory by construction_ | GREEN, 0 blocking / 3 advisory   |
| 2b  | lesson-extract       | _human gate_                                       | **promoted L47**                 |

Every proceed/stop above was read from a **deterministic verdict**, never from prose or judgment.
`/pharn-dev-review` has no structural verdict and `/pharn-dev-ship` did not invent one.

## Structural verdicts, verbatim

- **`/pharn-dev-build`** → `node pharn/floor/validate.mjs .` → **exit 0**, `FLOOR: GREEN — 36 capabilities`
- **`/pharn-dev-regress`** → `regression-report.json` → `"verdict": "no-regressions"` (exit 0);
  `regressions[]` empty, `pre_existing[]` empty
- **`/pharn-dev-verify`** → `verify-report.json` → `"verdict": "PASS"` (exit 0); `failing_gates[]` empty.
  Seven gates all 0: `test` (2066 pass / 0 fail), `validate`, `lint`, `format:check`, `lint:md`,
  `structural:…/expected-injection-comment.json`, **`reconcile`** (`CLEAN`, 4 reconciled, 0 escapes)
- **`/pharn-dev-grill`** → `check-plan-lessons.mjs` → **exit 0**, 10 cited ids resolve and are
  body-referenced

## What landed

Four staged artifacts under `.dev/features/skills-threat-surface/proposed/` — **no trusted doc was
written**, and none could be: `protect-trusted-paths.cjs` was probed in this worktree and denies an
`Edit` to `THREAT-MODEL.md` at **exit 2**.

- `THREAT-MODEL.md.patch` — 3 hunks: a new `§2` **item 8** (user-installed Claude Code skill), its
  paired `§3` row, and the `§5` quantifier retraction
- `LIMITS.md.patch` — 2 hunks: the mirrored count at `:95` / `:141`, opened rather than re-counted
- `specified-primitives.json.patch` — 1 hunk: the `named_artifacts` registration
- `APPLY.md` — the applier's note: all three apply as **ONE atomic edit**, with the probe table, the L26
  bound, and the `SKILLS_VERSION` 6.1.0 → 6.1.1 (patch) + `CHANGELOG` consequence

Plus the canon write this run gated: **`L47`** in `.dev/memory-bank/lessons-learned.md`, with
`docs/lessons-index.md` regenerated (47 lessons, `check-lessons-index` GREEN).

## Pointers (cited, not restated — P4)

- `.dev/features/skills-threat-surface/REVIEW.md` — the four lenses and the three advisory findings
- `.dev/features/skills-threat-surface/GRILL.md` — the interrogation (advisory); its 2 blocking-severity
  findings were resolved at the post-grill gate, not carried
- `.dev/features/skills-threat-surface/VERIFY.md` / `REGRESSION.md` — the gate tables and their bounds

## Decisions the human made during this run

Five at GATE 1 (D1–D5), two at the post-grill gate, two at GATE 2 — all recorded in `PLAN.md`'s
`## Decisions taken at the GATE-1 halt`. The two that changed the shape of the increment:

- **Grill F1** — D3 ("`LIMITS.md` is NOT touched") and D4 ("reword `§5`") were **jointly inconsistent**:
  the "one residual" claim is mirrored in `LIMITS.md:95`/`:141`, and `LIMITS.md` **wins on conflict**.
  Resolved by extending the patch set to `LIMITS.md` — a **retraction**, not the restatement D3 refused.
- **Grill F2** — D5's `forward_claims` half was **unimplementable**: the record requires a mandatory
  `probe` naming a real path, and "a gate that reads the skills roster" has none. Narrowed to
  `named_artifacts` only, on the manifest's own precedent (_"a probe would have to invent one. Deferred
  rather than guessed (P6)"_).
- **Review F1/F2** — applied: `§5`'s replacement count became an **open** form, and "every lens subagent"
  became "each lens subagent it spawns". Hunk headers were re-validated after the edits (one was
  off by 3 and corrected; `git apply --check` over all three → **exit 0**).

## Lesson

`lesson: promoted L47`

**Retracting a false quantifier by substituting a new count rebuilds the defect at the new value** —
`type: contract`, promoted 2026-09-21 through `/pharn-dev-memory-promote`'s own floor gate
(`check-provenance.mjs` GREEN) and its own accept/deny halt. Its **honest trigger is weak and says so**:
the replacement sentence was true when written, so it is a reproduced defect _shape_, not yet an observed
failure, and by L20's bar arguably a first occurrence. Promoted at the maintainer's explicit direction on
the L36 precedent.

`deferred: none` — no further candidate was surfaced that met the bar.

## The honest line

**The chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is
good or wise; that is the human's call at the post-review gate.**

Two bounds worth restating here, because this increment makes them unusually sharp:

1. **No gate in this run can see what the increment is actually about.** Nothing reads trusted-doc prose,
   so no deterministic check evaluated whether the new `§2` item 8, the `§3` row, or the `§5` rewording
   are true, honest, or non-inflating. The gates prove the repo is green with four `.dev/` files present.
2. **The post-apply state was never executed.** The pre-apply `check:markers` **RED** was measured (it is
   what makes the three patches atomic); the post-apply GREEN cannot be, because the guard denies the
   agent the write. `APPLY.md` says so rather than implying otherwise, and the applier owes an
   `npm run check` after applying.

`/pharn-dev-ship` added **no new floor primitive**: every verdict above belongs to a sub-stage.
