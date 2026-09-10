---
name: regression-report
trust: trusted
layer: pharn-contracts
purpose: "Single source of truth for the machine regression-report — the features/<name>/regression-report.json /pharn-regress and /pharn-dev-regress emit at the regress stage. Schema only, zero behavior. Defines the ONE floor-relevant field (`verdict`, enum-gated at four live consumer sites) versus the rest of the object, which is ADVISORY shape documentation no floor op reads (pharn/ARCHITECTURE.md §6; P0, P2)."
---

# Contract — regression-report

> A `pharn-contracts` schema (zero behavior, no `role:` — it is not a Capability). It is the SoT for the
> machine report the regress stage emits. Enforcers **cite** it and **conform** to it; they do not restate
> their own rules through it (P4). It elaborates `pharn/ARCHITECTURE.md §6` (the `regress` stage); the
> principles (P0, P2, P5) live in `pharn/CONSTITUTION.md`, and the enum-gated vs tainted-free-text split
> it inherits is defined once in `pharn/pharn-contracts/finding-shape.md` — cited here, never re-defined.
>
> **Read this before quoting anything below (P0).** Exactly **one** field in this artifact is
> floor-relevant: `verdict`, and only because four live checkers test it for **enum membership**. Every
> other field in this document is **ADVISORY shape documentation** — a description of what the emitter
> writes, **not** a constraint anything enforces. **Writing this contract did not make any report conform
> to it**, and no checker validates a report against this file. "There is a contract for the
> regression-report" therefore does **not** mean "the regression-report's shape is guaranteed" — that
> inference is the exact disease this repo exists to prevent.

The regression-report is `features/<name>/regression-report.json` (product) /
`.dev/features/<name>/regression-report.json` (dev) — the machine half of the regress stage, written
beside the human-facing `REGRESSION.md`. It is `pharn/floor/check-regress.mjs`'s **`verdict` subcommand**
stdout **verbatim**; unlike the verify-report, the emitting command merges **nothing** into it.

## What this artifact IS and IS NOT (P0 — the honesty bar)

- **IS:** a machine-readable record of a **base→head exit-code comparison** over the gates that ran
  **outside** the feature's declared scope, plus the deterministic verdict computed from that comparison.
- **IS NOT** a claim that **nothing broke**. The regress stage catches exactly what the project's own
  deterministic suite catches — a regression with no covering test, rule or eval is **invisible** here.
  `verdict: "no-regressions"` means _"no gate that was green at base is red at head"_, nothing wider.
- **IS NOT** a report on the feature itself. Gates already red **at base** are classified `pre_existing`
  and deliberately **excluded** from the verdict — they are not the increment's fault, and blaming them
  on it would train an operator to wave through the one signal that must never be waved through.

## The object

```json
{
  "base": "HEAD",
  "inside": [".claude/commands/pharn-dev-ship.md", "CHANGELOG.md"],
  "outside_gates": { "tests": { "base": 0, "head": 0 }, "validate": { "base": 0, "head": 0 } },
  "regressions": [],
  "pre_existing": [],
  "verdict": "no-regressions"
}
```

## Field shape + trust classes

| field           | shape                                                        | class                                      |
| --------------- | ------------------------------------------------------------ | ------------------------------------------ |
| `base`          | the git ref the baseline was captured at, or `null`          | ADVISORY — no floor op reads it            |
| `inside`        | array of repo-relative paths counted as inside the feature   | ADVISORY — no floor op reads it            |
| `outside_gates` | `{ "<gate-id>": { "base": <int>, "head": <int> } }`          | ADVISORY — no floor op reads it            |
| `regressions`   | array of gate-ids that were `0` at base and non-zero at head | ADVISORY — no floor op reads it            |
| `pre_existing`  | array of gate-ids already non-zero at base                   | ADVISORY — no floor op reads it            |
| `verdict`       | **enum** — `no-regressions` · `regressions` · `inconclusive` | **FLOOR-RELEVANT** — enum-gated by 4 sites |
| `reason`        | a diagnostic sentence, present only on `inconclusive`        | ADVISORY — no floor op reads it            |

**`regressions` being empty is not the guarantee — `verdict` is.** The two always agree in emitter
output, but only one of them is read, so a hand-edited report with `regressions: []` beside
`verdict: "regressions"` would stop the pipeline, and one with a populated `regressions[]` beside
`verdict: "no-regressions"` would not. Stated because the array is the field a human's eye goes to.

**Trust (P2).** Every field carries deterministic-tool output — gate-id strings, integer exit codes, and
file paths from `git diff` and path-set membership: the enum-gated / floor-verifiable class. **This
artifact contains no untrusted free text**, which is a genuine difference from the verify-report and is
why its residual section is narrower. The `scope` subcommand (below) _does_ emit `finding-shape` objects
with free-text `problem` fields, but those go to the command's own output and `REGRESSION.md` — **not**
into this file.

## What is NOT in this artifact: the `scope` subcommand's output

`pharn/floor/check-regress.mjs` has **two** subcommands, and only one produces this artifact:

- **`verdict`** — the base→head comparison. Its stdout **is** `regression-report.json`.
- **`scope`** — the pre-suite path-set partition (`inside` ⊆ declared `writes:`; the fix #7 escape check).
  Its output object is a **different shape** (`inside`, `declared`, `escaped`, `escape_exempt`,
  `findings`, `outside_tests`, `outside_eval_pairs`) and is **not** this contract's subject. A reader
  finding an `escaped` or `findings` key in a committed regression-report is looking at a hand-assembled
  file, not emitter output — see the drift classification below.

## The `verdict` field — the one floor-relevant part

`verdict` is the only field any floor checker reads from a committed report. Four checkers read it, and
here — unlike `pharn/pharn-contracts/verify-report.md`, where the sets diverge — **all four accept the
same set**, `{no-regressions, regressions, inconclusive}`:

| consumer                               | on a value outside the set                 |
| -------------------------------------- | ------------------------------------------ |
| `pharn/floor/check-ship.mjs`           | `INCONCLUSIVE`, exit 2 — fail-closed       |
| `pharn/floor/check-loop.mjs`           | `INCONCLUSIVE`, exit 2 — fail-closed       |
| `pharn/floor/render-ship-briefing.mjs` | the honest literal `unknown` in the render |
| `pharn/floor/check-ship-briefing.mjs`  | RED (shape)                                |

The agreement is worth stating rather than assuming: the verify-report's four sets are **not** identical,
so "the two spine reports behave the same way here" is a fact about this artifact, not a symmetry a
reader may take for granted.

**A value outside the set is REFUSED, never defaulted.** One committed report exercises this live —
`.dev/features/dev-product-boundary/regression-report.json` carries `verdict: "not-applicable"`, and both
stop cores return `INCONCLUSIVE` exit 2 naming the value and the allowed set. A missing or unparseable
report reaches the same fail-closed state. Nothing anywhere reads an absent verdict as "fine".

## Who reads this artifact — and the distinction that matters

- **FLOOR consumers — exactly the four above, and each reads `verdict` and nothing else.** This is a
  measurement, not a reading of their source: see the probe record in
  `pharn/pharn-contracts/verify-report.md` § "How the \"only `verdict`\" claim was verified", which was
  executed over **both** reports in one pass.
- **The EMITTER is not a consumer.** `pharn/floor/check-regress.mjs` **produces** this object; it never
  reads a committed report. Feeding one back to its `verdict` subcommand yields `inconclusive` exit 2
  (`gate "base" is not an integer exit code`), because its inputs are two `{ "<gate-id>": <int> }` maps,
  not reports.
- **ORCHESTRATOR reads are a different class, and are ADVISORY.** `/pharn-ship` and `/pharn-dev-ship`
  present `regressions[]` to a human at their gates, and `REGRESSION.md` renders `outside_gates`. These
  are **LLM-performed presentation reads**, not floor reads: they steer what a human is shown, never a
  deterministic branch. So "only `verdict` is read" is true **of the floor** and false as an unqualified
  sentence.

## Extra keys are IGNORED (deliberately not a closed-key object)

Additional keys are **ignored, not RED** — the `pharn/pharn-contracts/loop-record.md` posture, for the
same structural reason: **nothing downstream reads them**, so there is no privileged decision for a
smuggled field to reach. Real runs have annotated their reports with `feature`, `style_gates`,
`base_rationale`, `escape_exempt` and similar; a closed-key object would retroactively invalidate those
honest artifacts to buy a guarantee no consumer needs.

## Measured conformance — a dated measurement, NOT an invariant

Measured **2026-09-09 at commit `8bc6c0a`** over **121** committed `regression-report.json` files, by
parsing every one (never by grepping prose):

- **121/121 (100%)** carry `{regressions, verdict}`.
- **118/121 (97.5%)** carry the full core `{base, inside, outside_gates, pre_existing, regressions,
verdict}`; **113** carry **exactly** that core, which is the emitter's output unmodified.
- **120/121** carry a `verdict` inside the enum (`no-regressions` ×120). The `regressions` and
  `inconclusive` members are reachable per the emitter but appear in **no** committed report.

**The three non-conforming reports are hand-assembled, not emitter output**, and each is classified here
rather than averaged away:

| file                                                                | classification                                                                                                                                                                                          |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.dev/features/dev-product-boundary/regression-report.json`         | **Excluded as a documented non-instance**, not drift. Its own `note` field states it "is NOT a check-regress.mjs base<->head verdict object". Its out-of-enum `verdict` is refused fail-closed (above). |
| `.dev/features/forward-looking-claims-sweep/regression-report.json` | **Legacy drift.** Hand-assembled with `baseline_commit` / `baseline_method` in place of `base` / `inside` / `outside_gates` / `pre_existing`. Its `verdict` is in-enum, so a consumer accepts it.       |
| `.dev/features/plan-cue-continuation/regression-report.json`        | **Legacy drift**, missing only `inside`.                                                                                                                                                                |

Legacy drift is recorded, **not** retro-fixed: rewriting a committed audit artifact to match a contract
written afterwards would falsify the record these files exist to preserve.

**This is a count over a growing corpus and it expires as runs accumulate** — the next pipeline run
commits a 122nd report this paragraph does not describe. It is recorded with its date and commit so a
reader can re-derive it, and it must **never** be read as an invariant the repo maintains.

## The rule of the contract (P0)

- **FLOOR (enum-regex, `pharn/ARCHITECTURE.md §2` primitive #3):** `verdict` is tested for membership at
  the four sites above, and a value outside the set is **refused fail-closed**, never guessed at. That
  guarantee belongs to **those checkers**, and it exists whether or not this document does.
- **ADVISORY (everything else, and it is most of the document):** that a report matches the object above,
  that `outside_gates` is complete, that `regressions[]` agrees with `verdict`, that `base` names the real
  baseline, that `inside` is the true partition. **No checker validates a report against this contract.**
  Three committed reports already diverge from it and every gate in this repo is green over them.
- **Consequently: this contract DOCUMENTS a shape; it does not ENFORCE one.** A shape-validating checker
  is deliberately not built (P7) — the review that prompted this document classed the drift as
  **structural, not an active defect**, and no dogfood run, eval, or user report has failed on report
  shape. Should a real failure surface, that is the trigger to give it a floor check, and this section is
  where the change would be recorded.

## Residual (named, not hidden — `LIMITS.md §2`)

Narrower than the verify-report's, and narrower for a structural reason rather than by luck: this
artifact carries **no untrusted free text**, so there is no injected-quote channel through it. The
residual that remains is the honest one about the verdict itself — a `no-regressions` verdict is only as
wide as the suite that produced it, and a reader who takes it as "the change is safe" has substituted a
guarantee about **gates** for a guarantee about **behavior**. The document says exactly what the gates
say; it cannot say more.
