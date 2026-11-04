# GRILL — family-grammar-crlf

Plan: `.dev/features/family-grammar-crlf/PLAN.md` · spec-hash: `d5a974303fd0b9568945c60423ae5a89c57d7b65f5baa03657e317fbe64f33a5`
recomputed this run, equal to the plan's pin · **Step 1b lessons-declaration verdict (FLOOR): GREEN** —
`check-plan-lessons.mjs` exit 0, "all 8 cited id(s) resolve … and are referenced in the plan body".

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed; deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13), two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions true — lines 125 (logging). Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings

The grill was run by the same agent that wrote the plan (batch worker G4), so it is self-grilling in substance; the
orchestrator should weigh it as such.

### Inline axes

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/family-grammar-crlf/PLAN.md:69"
  problem: "The zero-capability INCONCLUSIVE also fires on a tree whose pharn/pharn-* holds only role-less markdown (an install trimmed to pharn/pharn-contracts), which today is GREEN — 0."
  evidence: "When `CANON_DIRS` is non-empty, no capability was found and nothing blocking was found, validate prints `FLOOR: INCONCLUSIVE …` and exits 2."
- type: FINDING
  rule_id: P3
  severity: important
  file: ".dev/features/family-grammar-crlf/PLAN.md:59"
  problem: "As first written, symlinked directories made validate RED but left count-lenses/-grillers/-verifiers exiting 0 with the linked lens missing — the same silent drop the HIGH finding names, moved to the registries."
  evidence: "validate.mjs REDs each linked directory at or under `<target>/pharn/` … (original text; revised in the plan to make the counters refuse, Q4)"
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/family-grammar-crlf/PLAN.md:63"
  problem: "A `pharn/` root that is itself a symlink was followed in git mode since 7.2.0's union walk; recording and REDding it changes a working setup (a shared pharn/ linked into several projects) into a RED, with no observed user either way."
  evidence: "a `pharn` root that is itself a link is recorded instead of walked"
- type: FINDING
  rule_id: P2
  severity: minor
  file: ".dev/features/family-grammar-crlf/PLAN.md:171"
  problem: "Validate renders every finding's `file` raw, so a directory NAME carrying a newline can forge a `- [blocking]` line; the new P6/symlinked-dir finding renders a link's path the same way. Pre-existing for every finding, not introduced here."
  evidence: "The new findings render only enum-gated fields and a path from `relative()`; no frontmatter text or link target is echoed into a finding."
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/family-grammar-crlf/PLAN.md:30"
  problem: "griller-extract.mjs keeps its own loose fence: a displaced griller is registered by count-grillers but read as kind-missing by griller-extract (loaded with fewer sections omitted), so the two disagree on that one input."
  evidence: "a displaced fence reads `kind-missing` there (not admitted as pharn-owned, the fail-safe side), so it is left as is and allowlisted"
```

### Griller axes

- **testability (P1)** — presence recognized: `## Evals to write (P1)` lists a twin per behaviour. Layer 2: adequate
  if each ✧ assertion is shown failing on the pre-fix code (the plan's L60 line commits to that); no finding.
- **architecture (P3)** — fit recognized: the shared reader lives in the existing core, `.dev` imports `pharn/floor`
  (the allowed arrow); no leaf→leaf reference. The registry-refusal concern is the inline P3 finding above.
- **coupling (P3)** — clean seams: no shared mutable state; `linkedDirs` is returned data, each consumer decides.
- **error-handling (P7)** — declaration recognized (approach 5, the unreadable file; dangling/looping links in the
  path kinds). No finding.
- **observability (P6)** — the scanner's line 125 is a lesson line mentioning a test, not runtime behaviour; the
  change is a CLI's verdict, observable as its output and exit code. No finding.
- **performance (P7)** — one extra `lstat` per walked entry; no scaling risk recognized.
- **security (P2) / privacy (P2)** — scanner clean; the out-of-tree read the plan removes is a security gain. The
  raw-path render is the minor inline P2 finding above.
- **documentation (P7)** — declaration recognized (floor-checks.md, module headers, CHANGELOG). No finding.
- **comprehension (P7)** — the displaced-lead character class and the zero-capability condition carry their
  rationale in the plan; the build must carry it into the code comments. No finding.
- **migrations (P7)** — no persisted-data shape changes. No finding.
- **a11y (P7) / i18n (P7)** — no UI. No finding.

## Summary

The plan is narrow in mechanism and wide in surface (seven readers, two walks, one exit path). The real risks are
behavioural edges the batch report did not ask about: the zero-capability INCONCLUSIVE on a contracts-only tree, a
symlinked `pharn/` root that worked yesterday, and the registries' treatment of a linked lens (now folded into the
plan as Q4). Each is recorded as an open question for GATE 1 with a recommendation.

ADVISORY VERDICT: 5 concerns raised (0 blocking-severity, 3 important, 2 minor) — for the human to weigh before
/pharn-dev-build.
