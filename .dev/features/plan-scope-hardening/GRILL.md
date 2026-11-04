# GRILL — plan-scope-hardening

Plan: `.dev/features/plan-scope-hardening/PLAN.md` · spec-hash check: MATCH
(`d5a974303fd0b9568945c60423ae5a89c57d7b65f5baa03657e317fbe64f33a5`, recomputed with `.dev/floor/hash-doc.mjs`) ·
Step 1b lessons-declaration verdict (FLOOR): **GREEN** — `check-plan-lessons.mjs` exit 0, all 11 cited ids resolve
and are referenced in the plan body.

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions true — lines 43 (spans), 44 (spans), 79 (spans), 94 (spans), 163 (spans). Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings (advisory — none gates `/pharn-dev-build`)

### Inline interrogation

```yaml
- type: FINDING
  rule_id: P5
  severity: important
  file: ".dev/features/plan-scope-hardening/PLAN.md:99"
  problem: "The colon rule's refusal first fires at /pharn-test or /pharn-build Step 0; no plan-stage check reads `## Files`, so under /pharn-loop a model-written plan with a `:` group label stops the run late (blocked) rather than at plan time."
  evidence: "Any OTHER such line whose text ends in `:` ends the list too, and if a path item follows it before the next heading the reader REFUSES"
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/plan-scope-hardening/PLAN.md:1"
  problem: "The BLOCKER's dev-batch route stays open by design: a model-approved dev plan can still scope pharn/floor/** and .claude/commands/** through /pharn-dev-build. The plan states it; the report to the orchestrator must not describe the BLOCKER as closed."
  evidence: "Not closed here, stated (P0): `/pharn-dev-build` of a model-written, model-approved dev plan can still scope `pharn/floor/**` and `.claude/commands/**`"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/plan-scope-hardening/PLAN.md:97"
  problem: "Code spans are detected per line; a code span wrapped across lines is not, so its `<!--` opens a comment the renderer does not show. That over-masks (fail-closed for items) but can also mask a visible exclusion cue — the header bound must name this case, probed against markdown-it (L56), not only the generic 'not a CommonMark parser'."
  evidence: "an opener is `<!--` outside a back-tick code span on that line"
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/plan-scope-hardening/PLAN.md:180"
  problem: "The ✧ byte-equal pin covers scanLines and commentStart, but scanLines also depends on FENCE_LINE_RE; the constant must be pinned too, or the two copies can drift while the function bodies still compare equal."
  evidence: "✧ pins (`scanLines` + `commentStart` byte-equal to the core's; `CANON_SUBTREES` == protect's)"
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/plan-scope-hardening/PLAN.md:119"
  problem: "The installed-posture flag route ('re-run the setter yourself with --allow-…') does not survive /pharn-build Step 0, which re-runs the setter without the flag and is refused; for the new instruction-file class the only working remedy in an attended run is a hand edit. The message should not offer the flag as a way through a PHARN build (L27)."
  evidence: "instruction files — basename `CLAUDE.md`, `CLAUDE.local.md`, `AGENTS.md`, any depth, case-folded | installed; … | `--allow-instruction-files` (new)"
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/plan-scope-hardening/PLAN.md:1"
  problem: "Five review findings across a hook, three floor modules, two commands, a contract and two config files in one increment; it is one axis (what a plan may scope, and how its `## Files` is read) but large — review should check each file stays inside that axis."
  evidence: "19 `## Files` entries"
```

### Grillers

- **architecture** (P3): fit recognized — the setter ↔ core copy-pair is the established mechanism; no new module,
  no sibling import; the briefing imports the heading regex from the core instead of a third copy.
- **coupling** (P3): no new entanglement; the marker scan reuses the setter's existing `openLoopRuns` shape.
- **comprehension / documentation** (P7): rationale is carried in the plan, the writes-scope guide and the
  CHANGELOG; the module headers must restate the new bounds (finding 3 above covers the comment bound).
- **error-handling** (P7): the change is itself refusal logic; every new path exits 1 and writes nothing; the
  marker scan is fail-closed on an unreadable state dir. Present and adequate — no finding.
- **security** (P2): scanner clean; the change narrows what an untrusted plan can authorize; messages print line
  numbers, never plan text. No finding.
- **testability** (P1): presence recognized — a refusal matrix, ★ PARITY fixtures and ✧ pins are named.
- **a11y, i18n, migrations, observability, performance, privacy**: not applicable — no UI, no strings for end
  users, no schema, no runtime service, no hot path, no personal data (the observability scanner hits are the word
  "spans" in "code span").

## Summary

The plan is grounded in measured corpus data and keeps self-hosting working where it matters. The two
`important` concerns are (1) the colon refusal surfacing late in an unattended loop and (2) making sure the
BLOCKER is reported as narrowed, not closed. The minor ones are build-time obligations: name the wrapped-code-span
bound, pin `FENCE_LINE_RE`, and keep the instruction-file message's remedies reachable.

**ADVISORY VERDICT: 6 concerns raised (0 blocking-severity, 2 important, 4 minor) — for the human to weigh before
/pharn-dev-build.**
