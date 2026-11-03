# GRILL — review-quoting

Plan: `.dev/features/review-quoting/PLAN.md` · spec-hash: `d5a974303fd0b9568945c60423ae5a89c57d7b65f5baa03657e317fbe64f33a5`
matches the plan's pin · **Step 1b lessons declaration: GREEN** (`check-plan-lessons.mjs` exit 0 — L2, L14, L29, L36,
L41, L55, L60, L62, L64 resolve and are referenced; the declaration only, never the application).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings

All findings are ADVISORY. Each `severity` is this griller's assignment (fix #3); `problem`/`evidence` quote the plan
as untrusted DATA.

### Inline axes

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/features/review-quoting/PLAN.md:106"
  problem: "The renderer's output lands in an installed project's own tree, where that project's markdownlint/prettier configs apply; the plan adds this repo's ignore entries but never requires the render of a BENIGN review to be lint-clean, which today's model-written REVIEW.md was told to be."
  evidence: "Step 6 today: 'Keep the render markdownlint-clean'; plan: '.prettierignore — pharn/features/*/REVIEW.md'"
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/review-quoting/PLAN.md:174"
  problem: "The quoting guarantee holds only for the renderer's bytes; the plan states it, but the command must also tell the orchestrator not to edit REVIEW.md after rendering (Step 6b's RED path re-renders rather than appending), or the bound is stated where no reader of the command meets it."
  evidence: "'an orchestrator that edits REVIEW.md afterwards is outside it (advisory)'"
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/features/review-quoting/PLAN.md:124"
  problem: "Notes freshness is one mtime comparison against assignments.json; a notes file written in the same filesystem-timestamp tick as the record, or a record re-emitted after the notes, reads as stale. Say 'not newer than' (the lens-groups.mjs rule) and pin both branches."
  evidence: '''rendered only when newer than assignments.json, else a fixed "stale, not rendered" line'''
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/review-quoting/PLAN.md:130"
  problem: "Importing SKIP_REASON_ENUM from render-review-assignments.mjs pulls its child_process/count-lenses load graph into the renderer; state the load graph in the module header and pin it, as quote-core.test.mjs pins its own."
  evidence: "'closed-set values after a membership test (… SKIP_REASON_ENUM …)'"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/review-quoting/PLAN.md:99"
  problem: "Moving the backstop phrases out of the Step 6 table changes what two merge-findings tests read; the plan names the re-point but the banned-vocabulary rule must keep ranging over BOTH the enum and the rendered strings (now the module's), with a control."
  evidence: "'the backstop render-table pins re-pointed at render-review.mjs's exported phrases'"
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/review-quoting/PLAN.md:1"
  problem: "No `.dev/guides/floor-*.md` section exists for merge-findings.mjs or the new renderer, so CLAUDE.md's guidance index (grep the file in floor-*.md) finds nothing for either; decide whether this increment adds one or names the gap."
  evidence: "CLAUDE.md: 'its ## section in .dev/guides/floor-{checks,gates,ac-tests,orchestration}.md'"
```

### Grillers

- **testability** — presence recognized (`## Evals to write (P1)` lists node --test cases per change). Layer 2: the
  plan's cases cover each changed behaviour; the inline P2 finding above adds the benign-render lint case.
- **architecture** — fit recognized: the renderer follows render-verify / render-regression (pure core, quote-core,
  CLI writes), and enum reuse goes through exports rather than copies. The load-graph finding above is the one concern.
- **coupling** — fit recognized: one module per axis (merge assembles, renderer renders); the backstop phrase moves
  to the module that prints it.
- **error-handling** — declaration recognized (exit 1 on an unusable findings.json, fail-soft "not available" lines
  for the other inputs, total helpers for `{"toString":1}`); no further concern.
- **security** — scanner clean; the plan's subject is an injection channel and its trust audit covers it; no new
  concern beyond the inline P2/P0 findings.
- **performance** — the caps bound REVIEW.md; no concern.
- **documentation**, **comprehension** — the plan carries a Why per decision; the guide-section finding above.
- **a11y**, **i18n**, **privacy**, **migrations**, **observability** — no UI, user text, PII, schema migration or
  production telemetry in scope; no finding.

## Summary

The plan's two non-obvious decisions (renderer over relabel; closing `type`) each carry measured evidence. The
concerns are about where the plan's bounds reach a reader: a benign render should still be lint-clean in a user's
tree, the "do not edit after rendering" rule belongs in the command, and the notes-staleness rule should copy
`lens-groups.mjs`'s "not newer than" wording with both branches pinned.

ADVISORY VERDICT: 6 concerns raised (0 blocking-severity, 2 important, 4 minor) — for the human to weigh before
/pharn-dev-build
