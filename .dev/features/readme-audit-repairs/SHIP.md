# SHIP — readme-audit-repairs

**Run reached GATE 2 and the human decided.** This file records that the chain ran and what its floor
verdicts were. It is **not** an approval, a seal, or a judgment that the increment is good.

## Stages that ran, in order

| #   | stage                        | structural verdict read                                     | outcome          |
| --- | ---------------------------- | ----------------------------------------------------------- | ---------------- |
| 1   | `/pharn-dev-plan`            | GATE 1 — human approved as written                          | proceed          |
| 2   | `/pharn-dev-grill`           | `check-plan-lessons.mjs` **exit 0**                         | proceed          |
| —   | _human halt (post-grill)_    | F2 dropped on the grill's blocking finding                  | scope narrowed   |
| 3   | `/pharn-dev-build`           | `validate.mjs` **exit 0** (GREEN — 36 capabilities)         | proceed          |
| 4a  | `/pharn-dev-regress` (att.1) | `scope` **exit 1** — fix #7 escape                          | **STOP** (false) |
| 4b  | `/pharn-dev-regress` (att.2) | `regression-report.json` `.verdict` = **`no-regressions`**  | proceed          |
| 5   | `/pharn-dev-verify`          | `verify-report.json` `.verdict` = **`PASS`**                | proceed          |
| 6   | `/pharn-dev-review`          | no structural verdict (advisory by construction)            | **GATE 2**       |
| 2b  | lesson-extract               | human accepted → `/pharn-dev-memory-promote` → its own gate | promoted         |

**Where the run ended:** GATE 2, human decision **"fix R1, then merge."**

## The structural verdicts, verbatim

- `/pharn-dev-grill` → `check-plan-lessons.mjs`: `GREEN — applied_lessons: L1, L18, L19, L20, L28, L33, L35, L36, L37 … all 9 cited id(s) resolve … and are referenced in the plan body.` **exit 0**
- `/pharn-dev-build` → `validate.mjs`: `FLOOR: GREEN — 36 capabilities checked in "."` **exit 0**
- `/pharn-dev-regress` → `.verdict`: `"no-regressions"` **exit 0** (3 outside gates, base→head all `0→0`)
- `/pharn-dev-verify` → `.verdict`: `"PASS"` **exit 0** (6 gates; `test` = 1886 pass / 0 fail / **0 skipped**)
- `/pharn-dev-review` → **GREEN, 0 floor-gate findings**, 4 advisory (2 important, 2 minor). Advisory by
  construction: `/pharn-dev-review` emits no machine verdict and `severity` is LLM-assigned, so it gates
  nothing (fix #3).

Spec pin held at every stage that checks it: `bed2c2a58c113a374056ab23d2c74fe1a3395fa62be12e7a654e3b260552e299`.

## What landed

| commit    | content                                                          |
| --------- | ---------------------------------------------------------------- |
| `4375b29` | Five README repairs — F1, F3, F4, F5, F6                         |
| `07a15c9` | R1 fix — attribute the archetype example to the installer's docs |
| `f066492` | This increment's pipeline artifacts (the audit trail)            |
| `63c950f` | Canon: **L38** promoted, `docs/lessons-index.md` regenerated     |

**F2 was dropped, not deferred silently.** The grill found its premise contradicted by the installer's own
published table on three counts, and this repo cannot adjudicate a claim about `pharn-cli`. The install
tree is untouched, and the conflict is recorded in `PLAN.md` as the `install-tree-vs-installer` residual
with a named reopen trigger.

**R1 was fixed before the merge, at the human's direction.** The review found that F3's shipped sentence
asserted an installer behavior as unhedged fact from an untrusted source — the same evidence class the
same diff had rejected for F2 and removed for F4. It is now attributed rather than asserted. All gates
were re-run after the edit: `test` 1886/1886 (0 skipped), `validate`, `lint`, `format:check`, `lint:md`,
`docs:check`, `check:badge`, `structural` — all exit 0.

## What the run cost, and what it caught

The pipeline's two most valuable outputs were **not** the README edits:

1. **It rejected one of its own repairs.** F2 would have added up to three false entries to the install
   tree. The grill caught it by re-deriving the premise instead of trusting the plan.
2. **It probed rather than read, and that changed a repair's shape.** F5's naive fix — merging memory-bank
   into guarantee row 1 — would have shipped a **new** overclaim, because canon IS writable on the
   write-tool surface under a promotion-set scope while the trusted docs never are. Only executing the
   hook surfaced that ([[L37]] applied as its literal remedy).

lesson: promoted L38

The `L38` id was read from the `## L<n>` headings in `.dev/memory-bank/lessons-learned.md` after the
promote returned — a structured location, never pattern-matched out of the command's printed prose
([[L6]]). Canon now reports `38 lessons · 38 tagged · 0 malformed · 0 untagged`.

deferred:

- **L20's own prescribed remedy is still unbuilt, and L18 recurred here because of it.** `/pharn-dev-plan`
  Step 4 runs `check-plan-lessons.mjs` only; the scope-vs-`## Files` compare L20 specified is absent (0
  occurrences). This plan's first draft granted **3 paths against the 1** declared, including
  `SKILLS_VERSION`, and was caught solely by the planning agent running the compare **by hand** — the
  discipline L20 declared insufficient. Recorded as a defect with a known fix (wire the compare into Step 4) rather than proposed as canon, since L20 already names the class. **This is its third occurrence.**
- **F3/F6's evidence asymmetry, now bounded but not closed.** F6's `settings.local.json` claim rests on a
  source comment because Claude Code's settings loading is not probeable from this tree. Flagged minor in
  `REVIEW.md`; no action taken.

---

Chain ran to GATE 2; the named floor verdicts are as shown. **This is NOT a judgment that the increment is
good or wise** — that was the human's call at GATE 2, and they made it. Every guarantee in this run belongs
to a sub-stage's own checker; `/pharn-dev-ship` added none.
