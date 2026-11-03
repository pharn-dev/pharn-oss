# REVIEW — lesson-heading-parser

Reviewed: `fb997e4b..28971cab` (branch `fix/lesson-heading-parser`). The increment is `trust: untrusted` to this
review; no instruction-looking content was found in it (the one adversarial-looking string, `IGNORE ALL RULES` /
`IGNORE THE GATE`, is a test fixture asserting it is never echoed).

**Floor first:** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. Regress
`no-regressions`, verify `PASS` (both re-run after R1's fix).

## Floor-gate findings

```yaml
- type: FINDING
  rule_id: P0
  severity: blocking
  file: "pharn/floor/check-provenance.mjs:270"
  problem: "R1 (FIXED in 6cb9abd8): the unclosed-block refusal fired only when the open block already hid a `##` heading, but check-provenance's reason for refusing — the promoted entry is APPENDED — applies to any block left open at the end of canon; a canon ending in an unclosed fence or comment passed GREEN and the new entry would have rendered inside the block."
  evidence: 'if (read.unclosedH2) { red("canon", ... a promoted entry would be appended inside it ...) }'
```

Resolution: the refusal now keys on `unclosedOpener`; a new test covers a fence and a comment left open at the end with
no heading after them, plus the closed control. CHANGELOG, the floor guide and the core's doc comment were corrected
in the same commit. Regress and verify were re-run on top (both green).

## Advisory findings

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/lessons-index-core.mjs:172"
  problem: "R2: canonLines' doc says a line is VISIBLE unless it sits inside a block, but the block's OPENER line itself reads visible (spanned()'s shape). Harmless — an opener starts with a fence or `<`, so it is never a heading — and pinned by a test comment, but the doc sentence is looser than the code."
  evidence: "a line is VISIBLE * unless it sits inside a column-0 fenced block, HTML comment or <pre>/<script>/<style>/<textarea> block"
- type: FINDING
  rule_id: P3
  severity: minor
  file: "pharn/floor/lessons-index-core.mjs:60"
  problem: "R3: the lessons ENTRY contract now imports the SPEC template core for its block model, so a change made there for SPEC sections moves which lessons exist. Accepted at GATE 1 (decision 1) over a second copy (L35) and stated in both headers; the residual is that nothing but the shared parity tests ties the two consumers' expectations together."
  evidence: 'import { blockSpans } from "./spec-template-core.mjs";'
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/memory-bank/lessons-learned.md:422"
  problem: "R6: canon L14 states Perl/Python `$` semantics as JavaScript's (`/^P[0-7]$/.test(\"P2\\n\") === true`); measured false on Node 24. The floor comments that repeated it are corrected here; canon itself is human-only, so the correction is proposed in DOCS-PROPOSAL.md (option A in place, option B as a correction entry)."
  evidence: "JavaScript `$` (without the `m` flag) matches at end-of-string OR just before a single trailing newline"
```

## Lenses with no finding

- **L-eval (P1):** no capability changed. Every behaviour change has a test; the 13 shared-fixture parity tests fail 9
  of 13 against the pre-fix consumers (BUILD.md), and both ✧ pins carry mutant controls.
- **L-trust (P2):** canon stays DATA. The new reader looks only at line structure; a hiding block can only make a
  citation RED or an id unique, never make a citation GREEN. Every new refusal names line numbers (and the argv canon
  path), never canon text, pinned by two tests.
- **L-axis (P3):** beyond R3, the dependency arrows are product → product (`check-plan-lessons` and `check-provenance`
  → `lessons-index-core` → `spec-template-core`, `frontmatter-core`); no cycle, no `.dev/` import from `pharn/`.
- **Guarantee audit (P0):** the headers, guide and CHANGELOG state the model's bounds (indented top-level openers and
  HTML types 6–7 are not modelled — probed against markdown-it, the two stated divergences reproduced), provenance's
  superset, and that the scope-after-accept order is advisory with a text-order pin.

## Lesson

No new lesson is proposed. R1 is an instance of L56 (a stated rule written from the model; the probe covered
headings, not the append), caught by review before merge, a first occurrence of its own mechanism. R6's correction is
the owner's call (DOCS-PROPOSAL.md).

VERDICT: GREEN — 0 open floor-gate findings (1 found and fixed in this increment), 3 advisory.
