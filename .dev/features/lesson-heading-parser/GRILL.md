# GRILL — lesson-heading-parser

Plan: `.dev/features/lesson-heading-parser/PLAN.md` · spec-hash: `d5a97430…` recomputed, equals the plan's pin (no
drift) · **Step 1b lessons declaration: GREEN** — `applied_lessons: L6, L7, L14, L25, L29, L35, L36, L50, L55, L56,
L62, L74, L75, L81`; all 14 cited ids resolve in `.dev/memory-bank/lessons-learned.md` and are referenced in the
plan body (`check-plan-lessons.mjs` exit 0). That verdict covers the declaration, never the application (P0).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  migrations griller's judgment.
- `scan-plan-observability`: mentions true — lines 32 (tracing), 95 (tracing), 131 (tracing), 203 (tracing). Not a
  finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings

### Architecture / coupling (P3)

```yaml
- type: FINDING
  rule_id: P3
  severity: important
  file: ".dev/features/lesson-heading-parser/PLAN.md:79"
  problem: "lessons-index-core.mjs (the canon ENTRY contract) gains an import of spec-template-core.mjs (the SPEC template axis), so a block-model change made for SPEC sections silently moves which lessons exist; the plan should either accept and state that coupling in both headers, or move blockSpans to a neutral module."
  evidence: "`visible[i]` false when line `i` sits in a column-0 fenced block, HTML comment or `<pre>/<script>/<style>/<textarea>` block (`spec-template-core.mjs` `blockSpans()`, exported from the existing `spanned()` with its body unchanged)"
```

### Documentation (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/lesson-heading-parser/PLAN.md:1"
  problem: "The dev floor guide's sections for check-plan-lessons, product check-provenance and the product lessons index (.dev/guides/floor-checks.md:53-78, :228-275) describe the heading as a plain `## L<n> ` line and say nothing about blocks, BOM or the generator's RED; the guide is not in ## Files."
  evidence: "## Files lists the checkers, tests and commands; no `.dev/guides/floor-checks.md` entry"
```

### Error handling (P5 / P6)

```yaml
- type: FINDING
  rule_id: P6
  severity: important
  file: ".dev/features/lesson-heading-parser/PLAN.md:85"
  problem: "The new unclosed-block refusal turns one stray column-0 `<!--` or fence opener in dev canon into a docs:check RED for every contributor; the plan should say the RED names the opener's line, that dev canon has no column-0 opener today (measured), and what the remedy is (a human closes the block in canon — never the agent)."
  evidence: "`parseLessons` … THROWS when `unclosed` is set: a block left open hides every later lesson from a reader"
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/features/lesson-heading-parser/PLAN.md:99"
  problem: "Moving the setter after the accept moves its refusals (a /pharn-loop marker open, a wrong --target) after the human's review; the plan should state that a non-zero setter exit or a count other than `1 path(s)` at Step 6 is a HALT with nothing written."
  evidence: "the setter line and the `--amend-scope` line move, verbatim, to the head of Step 6"
```

### Guarantee audit (P0)

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/lesson-heading-parser/PLAN.md:203"
  problem: "`floor-adjacent` is neither of the two labels P0 allows; the generator's no-stack-trace behaviour is CLI hygiene pinned by a test, not a guarantee, and should be labelled advisory (or dropped from the audit)."
  evidence: '"the generator never prints a stack trace" → floor-adjacent: a tested catch; exit code unchanged (1).'
```

### Scope (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/lesson-heading-parser/PLAN.md:228"
  problem: "Decision 6 widens the increment past the finding's named lines (merge-findings.mjs, mark-phase.mjs, four test comments, pharn-dev-ship.md); each hit is a restatement of the same false claim (L50/L75), but the orchestrator should approve the wider scope explicitly."
  evidence: "L50 sweep hits outside the finding's lines are fixed here (two product floor comment-only files, four comment sites in tests and one in `pharn-dev-ship.md`)."
```

## Griller notes (no finding)

- **testability** — a verification approach is declared (`## Evals to write`: fixtures × three readers, ✧ closure, ✧
  ordering pin, generator RED, the L14 assertion) — presence recognized.
- **architecture** — beyond F1, the tree fits: the reader lives in the module that owns the lessons grammar; the two
  checkers import it in the `.dev/ → pharn/`-safe direction (all three are product floor).
- **coupling** — F1 is the only cross-axis edge; the three consumers read one immutable function's output.
- **comprehension** — the regex choice (`[1-9][0-9]*`, optional title) and the superset rule for provenance carry
  their WHY in the plan's decisions list.
- **error-handling** — F3/F4 above; the generator catch and the provenance `canon` RED are declared.
- **observability** — the scanner's `tracing` hits are the word "traceable"-style incidental vocabulary; these are
  CLI checkers whose RED/GREEN lines are their observability; no finding.
- **performance** — one pass per canon read (canon is ~230 KB); no scaling risk recognized.
- **security / privacy** — scanner clean. Trust audit present: canon structure can only hide a heading (fail-closed
  for a citation), refusal messages quote line numbers, never canon text.
- **a11y / i18n / migrations** — no UI, no user-facing text, no persisted schema; nothing warranted.

## Summary

The plan's core design (one regex, one renderer-faithful reader reused from `spec-template-core.mjs`, BOM strip,
generator RED, promote scope after the accept, prose and comment corrections) answers every item of the finding.
The concerns are: a cross-axis import worth stating or relocating (F1), a missing guide update (F2), the operational
cost of the new unclosed-block refusal and the late setter refusal (F3, F4-P5), one non-P0 label (F5-P0), and an
explicitly wider sweep scope for the orchestrator to approve (F6).

ADVISORY VERDICT: 6 concerns raised (0 blocking-severity, 6 advisory: 3 important, 3 minor) — for the human to weigh
before /pharn-dev-build.
