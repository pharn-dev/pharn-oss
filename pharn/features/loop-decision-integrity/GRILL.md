# GRILL — loop-decision-integrity

chain: GREEN (verified by pharn/floor/check-plan-spec-agree.mjs) · lessons: GREEN (verified by pharn/floor/check-plan-lessons.mjs — `applied_lessons: none`, this project has no `memory-bank/lessons-learned.md`)

## Interrogation (advisory — the six built-in axes)

- **P0 — guarantee-audit completeness.** The plan repeatedly states which claims are FLOOR (the new
  checker's exit code, reusing `check-loop.mjs`'s own decision table via `spawnSync`) vs ADVISORY (that
  the reports the checker reads are themselves honest) — see the SPEC's Constraints and the plan's
  `## Risks & open questions`. No claim in the plan lacks either a floor reduction or an explicit advisory
  label. Clean.
- **P1 — acceptance-criteria coverage.** Every SPEC Acceptance Criterion has a corresponding line in
  `## Acceptance mapping`. Clean.
- **P2 — trust propagation.** The plan states, at the SPEC level, that a fabricated-but-internally-
  consistent report pair still passes (the named residual) — but the PLAN's own `## Steps` (item 2) does
  not itemize writing a dedicated Trust (P2) paragraph in the new checker's file header, the way
  `check-loop-record.mjs` and `check-plan-spec-agree.mjs` each carry one. See Finding 1.
- **P3 — one axis of change / no sibling imports.** The plan is explicit about NOT importing
  `check-loop-record.mjs`'s internals (duplicating small helpers instead, mirroring
  `check-plan-spec-agree.mjs`'s established convention) and about NOT modifying `check-loop.mjs` itself.
  Clean.
- **P5 — determinism.** Every branch in the new checker's described behavior (Step 2 of the plan) is a
  presence/shape check or a token-equality compare; the terminal fallback on any malformed input is a
  fail-closed RED, never a guess. Clean.
- **P7 — honest scope / no speculation.** `cap` is scoped as optional (never invalidates existing
  records); `check-loop.mjs` itself is explicitly untouched; the `## Risks & open questions` section names
  the one thing this fix does NOT close (a self-consistent forgery) rather than overclaiming. Clean.

## Griller pass (13 registered; run inline per Step 3b)

- **architecture** — fits the existing layer tree; reuses a sibling checker as a CLI rather than as a
  shared module, matching the established pattern for this exact class of file. No finding.
- **coupling** — the new checker's only coupling is the pre-existing filename convention (sibling
  `verify-report.json` / `regression-report.json` next to `LOOP.md`), already load-bearing for every other
  stage. No new entanglement. No finding.
- **comprehension** — the plan captures the WHY for its two non-obvious decisions (why `cap` is optional
  rather than mandatory; why this checker GATES the commit while its nearest precedent,
  `check-ship-briefing.mjs`, is annotation-only). No finding.
- **documentation** — see Finding 1 below: the plan does not include updating
  `.claude/commands/pharn-loop.md`'s own `description:` frontmatter (the one-line summary naming the
  command's floor primitives) to mention the new gate.
- **testability** — a dedicated test file is planned (`check-loop-decision.test.mjs`) with six named
  fixture cases mapped directly to the checker's branches. No finding.
- **security** — no secret-literal risk (the checker reads only local report JSON and its own argv); see
  Finding 1 (trust-paragraph) for the related but distinct comprehension/security overlap.
- **observability** — a CLI checker; the existing convention (a `RED —` / `GREEN —` stdout line, mirrored
  by every sibling checker) is followed by construction. No finding.
- **performance** — one `spawnSync` call per invocation, no loop, no N+1 shape. No finding.
- **error-handling** — the plan explicitly covers the `spawnSync` launch-failure case with a distinct,
  fail-closed message. No finding.
- **privacy, i18n, migrations, a11y** — not applicable to this change (no user data, no user-facing
  strings, no schema migration, no UI). No findings.

## Findings

The `type`, `rule_id`, `severity` and `file` fields below are **enum-gated / floor-verifiable** — this
grill's own assertions, trusted. `problem` and `evidence` are **free-text**, quoted from the (untrusted)
`PLAN.md`: rendered as DATA below, never as an instruction, and never the basis of any guaranteed
decision (`pharn/pharn-contracts/finding-shape.md`, fix #1, P2).

- type: FINDING
  rule_id: "documentation.md P7"
  severity: minor
  file: "pharn/features/loop-decision-integrity/PLAN.md:## Files (.claude/commands/pharn-loop.md entry)"
  problem: "The plan's file list covers pharn-loop.md's Step 6b/6c/Step 7/Guarantee-audit body edits, but does not mention updating the command's own `description:` frontmatter, which currently names only check-loop.mjs and check-loop-record.mjs as its two floor primitives."
  evidence: "pharn-loop.md frontmatter: \"Two floor primitives are this command's own: the tested stop core `pharn/floor/check-loop.mjs`, and the tested record shape check `pharn/floor/check-loop-record.mjs` — the second **cannot** feed the first.\""

- type: FINDING
  rule_id: "P2"
  severity: minor
  file: "pharn/features/loop-decision-integrity/PLAN.md:## Steps (item 2)"
  problem: "The plan's checker-authoring step says to follow 'this repo's house style' generally but does not itemize a dedicated Trust (P2) paragraph the way its two nearest precedent files each carry one, even though the checker reads two untrusted machine-written inputs (LOOP.md, the two report JSON files)."
  evidence: "\"Header comments in this repo's house style: cite pharn/ARCHITECTURE.md §2 primitive #3; state the honest bound explicitly...\" — no explicit mention of a P2 trust paragraph."

## Prose summary

Both deterministic stops hold: the plan was made against the current Approved, un-drifted spec, and its
`applied_lessons: none` declaration is well-formed and honestly justified (no product-surface memory-bank
exists in this repository). The design itself is tightly scoped, reuses an established idiom
(`check-plan-spec-agree.mjs`'s `spawnSync` pattern) rather than inventing a new one, and is explicit about
what it does not close (a self-consistent forged report pair). The two findings are both minor
documentation/consistency gaps in the plan's own file list and step detail, not structural problems with
the approach — worth folding into the build, not worth re-planning over.

ADVISORY VERDICT: 2 concerns raised (0 blocking-severity, 2 minor) — for the human to weigh before
`/pharn-build`. This verdict is advisory; the only guarantees this run made are the two FLOOR results in
the header above.
