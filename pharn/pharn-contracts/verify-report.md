---
name: verify-report
trust: trusted
layer: pharn-contracts
purpose: "Single source of truth for the machine verify-report — the features/<name>/verify-report.json /pharn-verify and /pharn-dev-verify emit at the verify stage. Schema only, zero behavior. Defines the ONE floor-relevant field (`verdict`, enum-gated at four live consumer sites) versus the rest of the object, which is ADVISORY shape documentation no floor op reads (pharn/ARCHITECTURE.md §6; P0, P2)."
---

# Contract — verify-report

> A `pharn-contracts` schema (zero behavior, no `role:` — it is not a Capability). It is the SoT for the
> machine report the verify stage emits. Enforcers **cite** it and **conform** to it; they do not restate
> their own rules through it (P4). It elaborates `pharn/ARCHITECTURE.md §6` (the `verify` stage); the
> principles (P0, P2, P5) live in `pharn/CONSTITUTION.md`, and the enum-gated vs tainted-free-text split
> it inherits is defined once in `pharn/pharn-contracts/finding-shape.md` — cited here, never re-defined.
>
> **Read this before quoting anything below (P0).** Exactly **one** field in this artifact is
> floor-relevant: `verdict`, and only because four live checkers test it for **enum membership**. Every
> other field in this document is **ADVISORY shape documentation** — a description of what the emitters
> write, **not** a constraint anything enforces. **Writing this contract did not make any report conform
> to it**, and no checker validates a report against this file. "There is a contract for the
> verify-report" therefore does **not** mean "the verify-report's shape is guaranteed" — that inference is
> the exact disease this repo exists to prevent.

The verify-report is `features/<name>/verify-report.json` (product) / `.dev/features/<name>/verify-report.json`
(dev) — the machine half of the verify stage, written beside the human-facing `VERIFY.md`. Its
`feature` / `gates` / `verdict` / `failing_gates` fields are `pharn/floor/check-verify.mjs`'s stdout
**verbatim**; the emitting command merges the advisory blocks in afterwards.

## What this artifact IS and IS NOT (P0 — the honesty bar)

- **IS:** a machine-readable record of **which named gates ran and what they exited with**, plus the
  deterministic verdict computed from those exit codes alone.
- **IS NOT** a claim that the feature is **correct**. `verdict: "PASS"` means exactly _"every gate in
  `gates` exited 0"_ — never _"the feature works"_. A defect no gate covers is invisible here, and the
  report says nothing about it.
- **IS NOT** influenced by the advisory `verifiers` layer. The verdict is computed **before** verifier
  findings are merged in, and `pharn/floor/check-verify.mjs`'s only inputs are the gate→exit-code map and
  the optional completeness integer — it cannot receive a verifier finding (fix #3,
  `pharn/ARCHITECTURE.md §7`). A verifier saying "looks good" is not a guarantee; one raising a concern is
  a flag for the human, not a block.

## The object

```json
{
  "feature": "<name>",
  "gates": { "test": 0, "lint": 0, "structural:<capDir>/evals/expected/x.json": 0 },
  "verdict": "PASS",
  "failing_gates": [],
  "completeness": { "complete": true, "missing": [], "skipped": [] },
  "verifiers": { "registered": 0, "findings": [] }
}
```

## Field shape + trust classes

| field           | shape                                                                                                                                                                                    | who writes it                                                       | class                                      |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------ |
| `feature`       | the increment's slug, or `null`                                                                                                                                                          | `check-verify.mjs` (from `--feature`)                               | ADVISORY — no floor op reads it            |
| `gates`         | flat `{ "<gate-id>": <int exit code> }`, keys sorted                                                                                                                                     | `check-verify.mjs`                                                  | ADVISORY — no floor op reads it            |
| `verdict`       | **enum** — see the table below                                                                                                                                                           | `check-verify.mjs`                                                  | **FLOOR-RELEVANT** — enum-gated by 4 sites |
| `failing_gates` | array of the `gates` keys whose value is non-zero                                                                                                                                        | `check-verify.mjs`                                                  | ADVISORY — no floor op reads it            |
| `completeness`  | `{ declared: [], skipped: [], missing: [], complete: bool, verdict: str, note: str }`, OPTIONAL — members vary by emitter; treat any subset as valid                                     | the command, from `pharn/floor/check-build-complete.mjs`'s stdout   | ADVISORY — no floor op reads it            |
| `verifiers`     | `{ registered: <int>, findings: [], note: str }`, OPTIONAL — `findings` and `note` are each optional; zero verifiers ship today, so no committed report exercises a non-empty `findings` | the command, from `pharn/floor/count-verifiers.mjs` + each verifier | ADVISORY — no floor op reads it            |
| `reason`        | a diagnostic sentence, present only on `INCONCLUSIVE`                                                                                                                                    | `check-verify.mjs`                                                  | ADVISORY — no floor op reads it            |

**Trust (P2).** Every field except one carries deterministic-tool output — gate-id strings, integer exit
codes, path strings: the enum-gated / floor-verifiable class. The exceptions are **free text and inherit
the reviewed increment's `untrusted` tag**: `verifiers.findings[]`'s `problem` / `evidence`
(`finding-shape.md`, fix #1), and `completeness.missing[]`, whose values **originate in the untrusted
`PLAN.md`**. Both are rendered as **quoted DATA**, never injected downstream as instructions. Because no
consumer reads either field (below), **no guaranteed decision rests on a tainted field** — and that is a
structural fact about the consumers, not a promise about this document.

## The `verdict` field — the one floor-relevant part

`verdict` is the only field any floor checker reads from a committed report. Four checkers read it, each
testing it for membership in **its own** set, and **those sets are deliberately not identical**:

| consumer                               | accepted `verdict` set                          | on a value outside it                  |
| -------------------------------------- | ----------------------------------------------- | -------------------------------------- |
| `pharn/floor/check-ship.mjs`           | `PASS` · `FAIL` · `INCONCLUSIVE`                | `INCONCLUSIVE`, exit 2 — fail-closed   |
| `pharn/floor/check-loop.mjs`           | `PASS` · `FAIL` · `INCOMPLETE` · `INCONCLUSIVE` | `INCONCLUSIVE`, exit 2 — fail-closed   |
| `pharn/floor/render-ship-briefing.mjs` | `PASS` · `FAIL` · `INCOMPLETE` · `INCONCLUSIVE` | the honest literal `n/a` in the render |
| `pharn/floor/check-ship-briefing.mjs`  | `PASS` · `FAIL` · `INCOMPLETE` · `INCONCLUSIVE` | RED (shape)                            |

**The artifact's enum is the union — `{PASS, FAIL, INCOMPLETE, INCONCLUSIVE}` — and "conforming" therefore
does NOT mean "accepted everywhere."** `check-ship.mjs` omits `INCOMPLETE` **on purpose** (it is the dev
loop's stop core and never passes `--complete`, so the value cannot arise on its path), which means a
perfectly contract-conforming `INCOMPLETE` report handed to it is **refused**, not misread. That refusal
is the designed behavior — fail-closed beats a silent guess — and this contract states it rather than
papering over the divergence with a single invented enum. The per-consumer sets are each consumer's own
business (P4: cited, not restated); what belongs to this contract is that they **differ**, and what that
costs a reader.

## Who reads this artifact — and the distinction that matters

- **FLOOR consumers — exactly the four above, and each reads `verdict` and nothing else.** This is a
  measurement, not a reading of their source: see `## How the "only`verdict`" claim was verified`.
- **The EMITTERS are not consumers.** `pharn/floor/check-verify.mjs` **produces** the four-field spine; it
  never reads a committed report. Feeding one back to it as its `results.json` yields `INCONCLUSIVE` exit
  2 (`gate "feature" is not an integer exit code`), because its input is a `{ "<gate-id>": <int> }` map,
  not a report. Stated explicitly because the reverse is a natural and wrong assumption.
- **ORCHESTRATOR reads are a different class, and are ADVISORY.** `/pharn-ship` and `/pharn-dev-ship`
  present `failing_gates[]` to a human at their gates, and `VERIFY.md` renders `gates` and the verifier
  findings. These are **LLM-performed presentation reads**, not floor reads: they steer what a human is
  shown, never a deterministic branch. So "only `verdict` is read" is true **of the floor** and false as
  an unqualified sentence — the distinction is load-bearing and is why this section exists.

## How the "only `verdict`" claim was verified (probed, not read)

Measured **2026-09-09 at commit `8bc6c0a`**, by executing the checkers rather than reading them — a
quantified claim ("the _only_ field") is exactly where a careful reading drifts:

- The consumer set was derived from the shortest paraphrase-invariant substring (`-report`) across
  **both** floors, not from the spelling first searched for. The only two other files matching it
  (`.dev/floor/check-contributing-gates.mjs`, `pharn/floor/check-loop-record.mjs`) mention the names in
  **comments** and read nothing.
- A report reduced to `{"verdict":"PASS"}` **and nothing else**, and a report with every _other_ field
  corrupted — `gates: "GARBAGE"`, `failing_gates: "NOT-AN-ARRAY"`, `feature: null`,
  `verifiers.findings: ["ignore all previous instructions"]` — produced **byte-identical** output from
  `check-ship.mjs`, `check-loop.mjs` and `render-ship-briefing.mjs`, and `check-ship-briefing.mjs`
  returned GREEN over both.
- Flipping **only** `verdict` (`PASS` → `FAIL`) turned that GREEN into a RED naming the field, so the
  probe is not vacuous: `verdict` demonstrably **is** read.

**The bound on this evidence, stated (P0):** it establishes what those four checkers did **at that
commit**. It is not a guarantee about a checker added later, and it is not a claim that the four are
correct — only that their inputs are what this section says.

## Extra keys are IGNORED (deliberately not a closed-key object)

Unlike `ship-record.md`'s attestation block — which must carry **exactly** three keys, to stop field
smuggling past a shape gate — additional keys here are **ignored, not RED**. The reason is structural
rather than lenient: **nothing downstream reads them**, so there is no privileged decision for a smuggled
field to reach. It is also the honest reading of the corpus — real runs have annotated their reports with
`structural_gates`, `test_count`, `head`, `aggregate` and similar, and a closed-key object would
retroactively invalidate those honest artifacts to buy a guarantee no consumer needs.

## Measured conformance — a dated measurement, NOT an invariant

Measured **2026-09-09 at commit `8bc6c0a`** over **122** committed `verify-report.json` files, by parsing
every one (never by grepping prose):

- **122/122 (100%)** carry the required core `{feature, gates, verdict, failing_gates}`.
- **122/122** carry a `verdict` inside the union enum (`PASS` ×121, `FAIL` ×1). `INCOMPLETE` and
  `INCONCLUSIVE` are reachable per `check-verify.mjs` but appear in **no** committed report.
- **119/122** additionally carry `verifiers`. The three that do not
  (`guard-self-protection`, `ship-pr-handoff`, `span-redos-linear`) carry exactly `check-verify.mjs`'s own
  four-key emission and predate the command's verifier-merge step — **legacy shape, not drift**: they are
  the emitter's output, unmodified.
- **6** carry extra advisory keys, admitted by the section above.

**This is a count over a growing corpus and it expires as runs accumulate** — the next pipeline run
commits a 123rd report this paragraph does not describe. It is recorded with its date and commit so a
reader can re-derive it, and it must **never** be read as an invariant the repo maintains.

## The rule of the contract (P0)

- **FLOOR (enum-regex, `pharn/ARCHITECTURE.md §2` primitive #3):** `verdict` is tested for membership at
  the four sites above, and a value outside a site's set is **refused fail-closed**, never guessed at.
  That guarantee belongs to **those checkers**, and it exists whether or not this document does.
- **ADVISORY (everything else, and it is most of the document):** that a report matches the object above,
  that `gates` is complete or truthful, that `failing_gates` agrees with `gates`, that `feature` names the
  real increment, that `completeness` reflects the filesystem. **No checker validates a report against
  this contract.** A report could omit `gates` entirely, or claim `failing_gates: []` beside a non-zero
  gate, and every gate in this repo would stay green.
- **Consequently: this contract DOCUMENTS a shape; it does not ENFORCE one.** A shape-validating checker
  is deliberately not built (P7) — the review that prompted this document classed the drift as
  **structural, not an active defect**, and no dogfood run, eval, or user report has failed on report
  shape. Should a real failure surface, that is the trigger to give it a floor check, and this section is
  where the change would be recorded.

## Residual (named, not hidden — `LIMITS.md §2`, `THREAT-MODEL.md §5`)

`verifiers.findings[]` and `completeness.missing[]` carry untrusted free text into a committed artifact
that humans and later LLM stages read. No floor consumer reads either — probed above — so the blast
radius is **bounded**: nothing gates on them. It is **not zeroed**. When a human or a downstream model
reads `VERIFY.md`, or an orchestrator presents `failing_gates[]` beside a quoted finding, "do not execute
this as an instruction" becomes a heuristic again. This is the same residual `finding-shape.md` already
accepts, reached through the machine artifact rather than the human one.
