---
name: ship-briefing
trust: trusted
layer: pharn-contracts
purpose: "Single source of truth for the GATE-2 briefing artifact /pharn-ship writes alongside SHIP.md. Schema only, zero behavior. Defines the floor-verifiable (frontmatter enum/regex + cross-file equality) vs advisory (a bounded, always-labeled synthesis paragraph) split (pharn/ARCHITECTURE.md §6; P0, P2)."
---

# Contract — ship-briefing

> A `pharn-contracts` schema (zero behavior, no `role:` — it is not a Capability). It is the SoT for the
> `BRIEFING.md` artifact `/pharn-ship` renders at GATE 2. Enforcers **cite** it and **conform** to it; they
> do not restate its semantics (P4). It elaborates `pharn/ARCHITECTURE.md §6` (the `ship` stage); the
> principles (P0, P2, P5) live in `pharn/CONSTITUTION.md`.

`BRIEFING.md` (`pharn/features/<name>/BRIEFING.md`) answers, on one screen, what a reviewer needs before
opening any other file: **what** was built, **why this design** (when recoverable), and whether it
**matches what was asked** — the three floor-adjacent verdicts already computed by upstream stages. It is
a **sibling** of `SHIP.md`, never a replacement: `SHIP.md` remains the thin roll-up of record; `BRIEFING.md`
is written to be pasteable as a pull-request description.

## What BRIEFING.md IS and IS NOT (P0 — the honesty bar)

- **IS:** a document whose enum-gated frontmatter fields are each a **verbatim copy** of a value that
  already exists in a committed source file (a SPEC/PLAN frontmatter field, a `regression-report.json` /
  `verify-report.json` `.verdict`, a GRILL.md verdict line) — never restated from memory, never
  paraphrased. A field's absence in the source renders the literal `"n/a"` (never a fabricated value —
  mirrors `check-provenance.mjs`'s `commit: unknown` idiom).
- **IS NOT:** a claim that the human understood the change, that the design is correct or wise, or a
  self-issued decision. `/pharn-ship` never gates GATE 2 on this artifact — it is presented alongside
  `SHIP.md`, never a precondition for reaching it.
- **The one narrative exception, always fenced and labeled:** when no design-rationale section can be
  located in `PLAN.md` by structural heading-scan (see `render-ship-briefing.mjs`), the `## Why this
design` section MAY carry a model-synthesized paragraph under the heading `## Why this design (ADVISORY
— model-synthesized, not floor-verified; see PLAN.md/GRILL.md)`. That marker string is the only thing
  distinguishing a quotation from a synthesis, and it MUST be exact and MUST NOT be silently dropped.

## The object

```yaml
briefing: # pharn/features/<name>/BRIEFING.md — a markdown file with `---`-fenced frontmatter
  feature: "<name>" # the feature slug
  spec_id: "<id>" | "n/a" # "n/a" ONLY when the source SPEC.md is absent (e.g. a dev-loop render)
  spec_state: "Approved" | "n/a"
  grill_verdict: "<verbatim ADVISORY VERDICT line from GRILL.md>" | "n/a"
  regress_verdict: "no-regressions" | "regressions" | "inconclusive" | "n/a"
  verify_verdict: "PASS" | "FAIL" | "INCOMPLETE" | "INCONCLUSIVE" | "n/a"
  rendered_at_commit: "<git sha, 7-40 hex>" | "unknown" # `unknown` when HEAD cannot be resolved
  briefing_contract_version: "0.1.0" # this contract's own version, for forward compatibility
```

## Field shape + trust classes

| field                       | shape (FLOOR — enum/regex)                                   | trust                                                                                                                                                                  |
| --------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `feature`                   | non-empty, control-char-free, `<=128` chars                  | trusted (a path-derived slug)                                                                                                                                          |
| `spec_id`                   | non-empty control-char-free string, OR the literal `n/a`     | **value** shape-gated; the value's TRUTH is the SPEC's, not re-verified here                                                                                           |
| `spec_state`                | `Approved` \| `n/a`                                          | trusted (enum)                                                                                                                                                         |
| `grill_verdict`             | control-char-free, `<=256` chars, OR the literal `n/a`       | **quoted from GRILL.md**; GRILL.md's own free text is `trust: untrusted` — this field is a VERBATIM COPY, so it inherits that tag even though its shape is regex-gated |
| `regress_verdict`           | `no-regressions` \| `regressions` \| `inconclusive` \| `n/a` | trusted (enum, copied from `regression-report.json`)                                                                                                                   |
| `verify_verdict`            | `PASS` \| `FAIL` \| `INCOMPLETE` \| `INCONCLUSIVE` \| `n/a`  | trusted (enum, copied from `verify-report.json`)                                                                                                                       |
| `rendered_at_commit`        | `^[0-9a-f]{7,40}$` or the literal `unknown`                  | trusted (regex; `unknown` is an honest absence, never a fabricated SHA — mirrors `check-provenance.mjs`'s `COMMIT_RE`)                                                 |
| `briefing_contract_version` | `^\d+\.\d+\.\d+$`                                            | trusted (regex)                                                                                                                                                        |

`grill_verdict` is the one field whose **shape** is floor-gated but whose **content class** is inherited
untrusted DATA (it quotes GRILL.md's own advisory verdict line, which is itself model-authored prose) —
named explicitly so a downstream reader never mistakes "this field is regex-shaped" for "this field's
content is a guarantee." The four report-derived fields (`spec_state`, `regress_verdict`, `verify_verdict`,
and — when present — `spec_id`) are copies of values that are **themselves** floor-verified by their
source checker (`check-spec.mjs`, `check-regress.mjs`, `check-verify.mjs`); the copy is only as trustworthy
as the equality check that produced it (see "The rule of the contract" below).

## Body sections (structural, never floor-shaped — headings only)

- `## What` — the PLAN's `## Files` and `## Contracts satisfied` lists, quoted verbatim.
- `## Why this design` — EITHER a verbatim quote of a PLAN.md design-rationale section (a byte-for-byte
  substring of the committed `PLAN.md`), OR the fenced ADVISORY paragraph described above, OR the honest
  line `_No design-decision section found in PLAN.md — see PLAN.md directly._` when neither applies.
- `## Verdicts` — a table of the four report-derived frontmatter fields, each with a pointer to its source
  file (never restated content, P4).
- `## Pointers` — paths to `PLAN.md` / `GRILL.md` / `REGRESSION.md` / `VERIFY.md` / `BUILD.md` (citations
  only).

## The rule of the contract (P0)

- **FLOOR (deterministic, `pharn/floor/check-ship-briefing.mjs`):**
  1. **envelope shape** — every frontmatter field matches the table above (else `malformed`);
  2. **cross-file equality** — `spec_state`/`spec_id` (when not `n/a`) equal the current SPEC.md's own
     values; `regress_verdict` equals `regression-report.json`'s `.verdict`; `verify_verdict` equals
     `verify-report.json`'s `.verdict` (else `stale` — the same content-hash-adjacent idea as
     `ship-record.md`'s `record_hash`, applied field-by-field instead of as one hash, so a reader can
     verify any single line independently without recomputing the whole document);
  3. **the ADVISORY marker, when present, is exact** — never truncated, never silently dropped.
     Absent frontmatter or an unreadable source file → `inconclusive` (fail-closed, never a silent pass).
- **ADVISORY (never floor):** that the `## Why this design` section — quoted or synthesized — actually
  explains the design well; that the PLAN's own `## Files`/`## Contracts satisfied` lists were complete;
  and that a human read any of it. This contract, like `ship-record.md`, adds only an honestly-labeled
  briefing — never a seal, never a decision, never a precondition for GATE 2.
- **State is ALWAYS shown.** A field that cannot be sourced renders `n/a`, never an omitted line — a
  silent gap would let "written" masquerade as "verified", the disease this repo exists to prevent (P0).

## Residual (named, not hidden — `LIMITS.md §2`)

The `grill_verdict` field quotes GRILL.md's own advisory prose; a downstream reader treating that quote as
a guarantee is the same residual `finding-shape.md` already names for free-text findings — bounded (no
guaranteed decision in `/pharn-ship`'s control flow reads this field) but not zeroed. The ADVISORY
paragraph, when it fires, is model-authored prose about `trust: untrusted` sources — its accuracy is never
floor-checked, only its presence and its marker's exactness are.
