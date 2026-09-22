# SHIP — ship-cost-ledger

_Advisory roll-up. `/pharn-dev-ship` ran the chain and read each stage's structural verdict; nothing
here is a self-issued approval, and this file is read by no checker._

## Stages that ran, in order, and where the run ended

| stage                | structural verdict read                                | value                                     |
| -------------------- | ------------------------------------------------------ | ----------------------------------------- |
| `/pharn-dev-plan`    | human approval halt (**GATE 1**)                       | approved as written                       |
| `/pharn-dev-grill`   | `check-plan-lessons.mjs` exit                          | **0** — GREEN                             |
| `/pharn-dev-build`   | `validate.mjs` exit                                    | **0** — GREEN, 36 capabilities            |
| `/pharn-dev-regress` | `regression-report.json` `.verdict`                    | **`no-regressions`**                      |
| `/pharn-dev-verify`  | `verify-report.json` `.verdict`                        | **`PASS`** (7 gates, `failing_gates: []`) |
| `/pharn-dev-review`  | _none — `/pharn-dev-review` has no structural verdict_ | 0 floor-gate findings, 4 advisory         |

**The run ended at GATE 2** — the post-review human decision. No stage returned a non-GREEN verdict, so
no RED-verdict STOP occurred.

**Both verdicts above were RE-DERIVED after the post-review F1 fix**, not carried over. That was not
ceremony: the fix left a parameter unused, `lint` went RED, and `check-verify.mjs` returned
`FAIL ["lint"]`. The parameter was dropped rather than the linter silenced, and both verdicts were then
recomputed against the tree as it now stands. An inherited PASS would have been a false one.

## Pointers (cited, never restated — P4)

- [`PLAN.md`](./PLAN.md) — the approved plan, with all four open questions resolved at the GATE-1 halt
  and the four grill fixes folded in.
- [`GRILL.md`](./GRILL.md) — advisory interrogation: 7 concerns (1 blocking-severity, 4 important,
  2 minor) plus one scanner hit recorded as a judged non-finding.
- [`REGRESSION.md`](./REGRESSION.md) · [`VERIFY.md`](./VERIFY.md) · [`REVIEW.md`](./REVIEW.md) — the
  three stage records, each carrying its own bounds.

## What the grill changed before a line was built

`/pharn-dev-grill`'s findings gate nothing (fix #3), but one was a **verified build-stopper** rather than
a judgment, and the human directed the plan be amended before building:

- **G1** — `README.md` was absent from the plan's `## Files` while the increment bumps `SKILLS_VERSION`.
  `set-writes-scope.cjs --from-plan` parses `## Files` and nothing else, so the badge edit would have
  been **denied** and `check:badge` would have REDdened at verify. Worth its own line: the plan **cited
  L49**, whose recorded instance is a plan that omitted _this same file, for this same badge, from this
  same kind of sweep table_. The lesson was read, quoted, applied to the table — and the file still did
  not reach the one list that makes it writable.
- **G2/G3/G4/G5** — the advisory-label carrier was named in the artifact rather than promised; the
  outcome derivation was **extracted** into its own module (P3, the `plan-files-core.mjs` precedent); the
  `decision` vocabulary's unenumerated third member was written down before the closure assertion was
  authored (L36); and Step 3a's position was pinned **before** Step 3b, with the reason.

## The lesson (Step 2b, closed set)

**`lesson: skipped`** — a candidate was proposed and the human declined it at the 2b.3 gate.

The candidate was: _a defect that is PINNED by a test feels handled, and the pin is not the deliverable —
the enumeration of the claim's cites is._ It rests on **REVIEW F3**: lesson **L14**'s stated mechanism is
factually wrong about JavaScript (`$` without `/m` matches only at end-of-input — the trailing-newline
behaviour is Perl/Python's), the repo **already knows** and pinned it in
`.dev/floor/check-version-badge.test.mjs:245`, and the correction reached neither canon nor six other
files — three of them on the **product surface**. One half of the deliberate `check-provenance.test.mjs`
pair now asserts the **opposite of its twin**, and a live probe refutes the dev half.

**The human chose the sweep over the lesson**, judging that a fifth entry in the L29/L31/L46/L50 family
returns less than simply correcting the seven sites. That is recorded as a follow-up, **not done here**:
canon moves only through `/pharn-dev-memory-promote`'s human gate, and the six comment sites are not in
this increment's approved `## Files`, so writing them would be the scope expansion fix #7 exists to
prevent.

`deferred: none` — no further candidate was surfaced.

## Follow-ups this run names (none actioned)

- **`l14-mechanism-sweep`** — correct L14's mechanism in canon via a gated promotion, and fix the six
  files repeating it (`pharn/floor/mark-phase.mjs:67`, `pharn/floor/lessons-index-core.mjs:128`,
  `pharn/floor/check-loop-record.mjs:112`, `.dev/floor/check-provenance.mjs:178`,
  `.dev/floor/lessons-index-core.mjs:102`, `.dev/floor/check-provenance.test.mjs:16`). The last is the
  sharpest: its comment states a test's purpose that the test does not serve.
- **REVIEW F2/F4** — accepted as-is, reasons on the record in `REVIEW.md`.

## The honest line

Chain ran; the named floor verdicts are as shown — this is **NOT** a judgment that the increment is good
or wise; that is the human's call at the post-review gate.
