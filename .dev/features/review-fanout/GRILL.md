# GRILL — review-fanout

- Plan: `.dev/features/review-fanout/PLAN.md` (approved at GATE 1 — delegated: decided by the orchestrating model
  under the maintainer's 2026-10-13 delegation).
- Spec-hash check: recomputed `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md` =
  `75088a82d113bc52cdd3d5fb2e44533e81cba5f520877f5eaa441ced45fb0fd6`, equal to the plan's `spec_content_hash`.
- **Step 1b lessons-declaration verdict (FLOOR): GREEN**, `check-plan-lessons.mjs` exit 0 — 13 cited ids (L24, L25, L29,
  L34, L36, L41, L42, L52, L55, L59, L60, L67, L71) resolve in canon and are referenced in the plan body. This
  covers the declaration only, never that the lessons were applied.
- Contracts read: `pharn/pharn-contracts/finding-shape.md`, `pharn/pharn-contracts/eval-format.md`.
- Grillers: `count-grillers.mjs` registered 13; each one's Procedure was applied inline over the plan.

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`, exit 0)

Findings: none (no secrets, PII or i18n scanner hit). `scan-plan-migrations`: mentions false.
`scan-plan-observability`: mentions false. Neither mention line is a finding by itself; the two grillers' judgment
is recorded below.

## Findings (advisory — none gates `/pharn-dev-build`)

### Inline interrogation

```yaml
- type: FINDING
  rule_id: P5
  severity: important
  file: ".dev/features/review-fanout/PLAN.md:120"
  problem: "An explicit DIRECTORY target whose every file is now skipped (an ignored build dir, a folder of binaries) resolves to an empty target, and the emitter's existing refusal says only 'no resolvable review target' — it names neither the skips nor the override."
  evidence: "plan: '- **An explicit DIRECTORY argument:** … the files `git ls-files … --exclude-standard -- <dir>` lists'; the refusal text in render-review-assignments.mjs renderAssignments() names only the two branches."

- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/review-fanout/PLAN.md:234"
  problem: "The carried-state negative control as written may be unable to fail: if every exec loop in the 18 scanners runs to completion, removing one lastIndex reset changes no output, so the control would pass while proving nothing (L60)."
  evidence: "plan: 'a module-level `/g` regex left un-reset (the equivalence test must fail)'"

- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/review-fanout/PLAN.md:315"
  problem: "The bound for the time limit states the per-spawn ceiling but not the worst case: limits add up sequentially, and one many-sinks line hangs injection, ssrf and path-traversal together (they share SPAN), so the prefilter can take several limits before any lens runs."
  evidence: 'plan: ''"The time limit stops a hung scanner from hanging the prefilter" → floor: `spawnSync`''s `timeout` kills the child.'''

- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/review-fanout/PLAN.md:124"
  problem: "How 'inside a git work tree' is decided is unstated, and so is what happens when git itself is unavailable; a failure of the detection must land on the readdir walk, never on an empty or a crashed resolution."
  evidence: "plan: '- Outside one: today's `readdirSync` walk.'"
```

### Griller: error-handling

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/review-fanout/PLAN.md:146"
  problem: 'I8/I9 refusal messages will quote record values; a value from a JSON record such as {"toString":1} makes a template literal throw, so each new message must type-check before it interpolates (L62).'
  evidence: "plan: '- **I9 scanner failures** — present, an array of `{lens, scanner, reason}`'"
```

### Griller: performance

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/review-fanout/PLAN.md:98"
  problem: "The 5 ms/KiB rate is derived from one 836 KB prose file at one load level; code with long or sink-dense lines may scan slower per KB (n-plus-one is quadratic per line, TST-3), so 'confirmed at build' needs a stated pass criterion."
  evidence: "plan: 'Per spawn: `SCANNER_TIMEOUT_BASE_MS` (30,000) + `SCANNER_TIMEOUT_MS_PER_KIB` (5) × the target's KiB'"
```

### Griller: migrations

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/review-fanout/PLAN.md:151"
  problem: "The persisted assignments.json shape gains two required fields under an unchanged schema string, so a record written by an older emitter reads as malformed rather than as older; the I8/I9 message for an ABSENT field should say the record predates the field."
  evidence: "plan: 'Both fields are required, like `scanner_errors` … The schema string stays `review-assignments/v1`'"
```

### Grillers with no finding

- **testability** — presence recognized: every new behaviour has a named test in `## Files` with a negative control.
- **architecture** — fit recognized. The new shared module sits in the flat floor beside its callers, a precedent
  set by `grill-scan.mjs` and `check-review-assignments.mjs`. No capability-tree edge changes, and no lens or
  contract file is touched.
- **coupling** — clean seams recognized. The emitter and the checker share closed enums by import (the `BASIS_ENUM`
  precedent). The scanners depend on the core only for I/O, and per-file detection stays inside each scanner.
- **security** — scanner clean. The file list travels on stdin, NUL-separated, never through argv or a shell, so a
  path beginning with `-` cannot become an option. Classification uses `lstat`, never a follow-call. An explicitly
  named symlink is still followed by the scanner (user-named, as today), which the plan leaves stated.
- **documentation** — needed and present: the new `--files` surface is documented in each scanner header and the
  core header. Lens prose stays, by the GATE 1 decision (follow-up `lens-scope-wording`).
- **comprehension** — rationale recognized. 512 KiB is derived from the repo's size distribution, 8,000 bytes from
  git's heuristic, and 30 s + 5 ms/KiB from a measured per-KB cost (see the performance finding for its gap).
- **observability** — needed and present: `scanner_failures[]`, the per-entry `scanner_errors[]`, `skipped[]` and
  the stdout summary counts make every degradation visible in the record.
- **privacy** — scanner clean. Paths only, no personal data.
- **i18n** — scanner clean. No user-facing text beyond developer CLI messages.
- **a11y** — no UI.

## Summary

The plan is specific and measured. The concerns cluster on the edges of the new behaviour:

- the refusal a fully skipped directory now produces, which names nothing;
- whether the carried-state control can actually fail;
- the cumulative worst case of the time limit;
- the pass criterion for "confirmed at build";
- the quoting safety of the new refusal messages.

None is a reason to re-plan. Each can be taken inside the plan's existing `## Files`.

ADVISORY VERDICT: 7 concerns raised (0 blocking-severity, 7 advisory: 4 important, 3 minor) — for the human to weigh
before /pharn-dev-build.
