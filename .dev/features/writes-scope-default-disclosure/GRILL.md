# GRILL — writes-scope-default-disclosure

**Plan:** `.dev/features/writes-scope-default-disclosure/PLAN.md` ·
**Spec-hash check:** MATCH — recomputed `sha256(pharn/ARCHITECTURE.md)` =
`69c8395365abb719cc3132ffa7a7607051b1e04ca3a3fa70ee563b86b857f18e`, equal to the plan's
`spec_content_hash`; no drift. ·
**Step 1b lessons-declaration verdict (FLOOR):** **GREEN**, exit 0 —
`applied_lessons: L1, L2, L6, L12, L27, L33, L35`; all 7 cited ids resolve in
`.dev/memory-bank/lessons-learned.md` and are referenced in the plan body.

> The Step 1b verdict is a floor exit code and is deliberately kept out of the concern tally below — a
> deterministic stop and a model-authored concern must not share a count.

## Griller membership (FLOOR — enum/regex, read from frontmatter)

`node pharn/floor/count-grillers.mjs .` → `{"registered":13,...}`. Ten declare
`applies: ["universal"]` and were applied; three do not apply to this target (`a11y`, `i18n` →
`["ssr","spa"]`; `migrations` → `["backend","ssr"]`, and this repo has no such archetype).

Deterministic plan scanners run (their grillers apply):

| scanner                       | result               | exit |
| ----------------------------- | -------------------- | ---- |
| `scan-plan-secrets.mjs`       | `{"found":false}`    | 0    |
| `scan-plan-pii.mjs`           | `{"found":false}`    | 0    |
| `scan-plan-observability.mjs` | `{"mentions":false}` | 0    |

`scan-plan-observability` reporting no telemetry mentions is CORRECT here, not a gap: the increment
writes one prose bullet and wires no code path. Per `LIMITS.md §5` this scanner reads the PLAN only and
has no code-side counterpart, so its silence carries no claim about the built result either way.

## Findings

Two of the five below were **measured**, not judged — the probes are quoted in `evidence`.

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/writes-scope-default-disclosure/PLAN.md:125"
  problem: "The bullet's universal quantifier 'the ONLY paths ... may write are ... and `.pharn/**`' is measurably false in one case, so a doc whose subject is the guard's exact bounds overstates them."
  evidence: 'Probed live: `{"tool_name":"Write","tool_input":{"file_path":".pharn/writes-scope.json"}}` piped to enforce-writes-scope.cjs exits 2, despite `.pharn/**` being listed. enforce-writes-scope.cjs:314 — `if (rel === SCOPE_FILE) deny(rel, scope, record);` — fires BEFORE the allow-list test. The human''s GATE-1 decision (2) was to OMIT EXPLAINING this exception; that is a decision about explanation, not about the quantifier, so the two are separable: ''only'' could become ''are limited to'' or `.pharn/**` could be written as `.pharn/**` (runtime scratch) without restoring the omitted sentence.'

- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/writes-scope-default-disclosure/PLAN.md:130"
  problem: "'/pharn-build writes exactly the paths your PLAN.md declared' overstates the mechanism: the setter emits only CONCRETE paths, so a glob or placeholder entry under `## Files` is silently dropped and would then be DENIED at build."
  evidence: 'Probed live in an isolated project: a `## Files` list of two bullets — `` `src/app.ts` `` and `` `src/lib/*.ts` `` — produced `writes-scope set: 1 path(s)`, scope `["src/app.ts"]`. set-writes-scope.cjs''s `isConcrete()` rejects any entry containing `<`, `>`, `*` or `?`, and the drop is SILENT — the printed count is the only signal (the L20 shape). The accurate word is ''exactly the concrete paths''.'

- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/writes-scope-default-disclosure/PLAN.md:149"
  problem: "The named residual `default-safe-set-doc-pin` records WHY it is unbuilt but states no REOPEN TRIGGER, breaking this repo's own convention for deferred residuals."
  evidence: "Every peer deferral in CLAUDE.md states its condition — `product-capability-catalog`: 'Reopens when the first role:-bearing capability is authored outside PHARN's own shipped surface'; `product-eval`: 'Reopens on the same trigger'; LIMITS.md §5: 'Reopens when a real failure surfaces it (P7)'. Without one, the deferral cannot be distinguished later from an oversight — which is the exact reason CLAUDE.md gives for recording the other two at all. The obvious candidate is already implied by the plan's own L20 body line: the first observed disagreement between the bullet and DEFAULT_SAFE_SET."

- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".dev/features/writes-scope-default-disclosure/PLAN.md:173"
  problem: "The Determinism audit calls 'does this bump SKILLS_VERSION' a 'membership test over CLAUDE.md's stated bump-triggering set', but that set lives in CLAUDE.md PROSE with no structured location a checker reads — which is L6's own shape appearing inside an audit that cites L6 elsewhere."
  evidence: "PLAN.md:173 — 'Whether this bumps `SKILLS_VERSION` → membership test over CLAUDE.md's stated bump-triggering set'. Contrast PLAN.md's other three determinism entries, each of which names a real structured reader (the hook's globs, `.prettierignore`, `.markdownlint-cli2.jsonc` ignores). The ANSWER (README is repo-meta, no bump) is correct and independently supported; only the label overstates. No checker reads CLAUDE.md's bump set — verified: nothing under pharn/floor or .dev/floor parses it."

- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/features/writes-scope-default-disclosure/PLAN.md:112"
  problem: "The plan pins README evidence by LINE NUMBER (`README.md:244`, `README.md:123-126`), and this increment inserts a bullet mid-file, so every cite below the insertion point shifts — the addresses are pre-edit and the plan does not say so."
  evidence: "The repo already records this exact hazard for this exact file: .dev/floor/check-version-badge.mjs's header states the badge is located by URL PATTERN, 'never a line number, since editing the README shifts lines'. Harmless for an archival artifact read as a record of the pre-edit state; misleading if read as a post-edit address."
```

## Summary

The plan is unusually well-evidenced for a documentation increment: every factual claim it makes was
re-derived live (the constant read from its declaration, nine hook exits observed, the review's grep
re-run), and it CORRECTS its untrusted source rather than transcribing it — the source review's
`--clear` remedy was measured and found unreachable, which is the increment's actual value.

The concerns cluster on one axis, and it is the axis this increment is about: **a bullet describing the
guard's bounds must itself be bounded exactly.** Two sentences in the proposed text are stated more
strongly than the floor supports — the `only ... .pharn/**` quantifier (G1) and "exactly the paths your
`PLAN.md` declared" (G2). Both were found by probing rather than reading, and both are the P0 shape at
close range: prose about precision, imprecise. Neither is fatal and neither contradicts the human's
GATE-1 decisions; both are one-word or one-clause repairs available at build.

The three minor findings are hygiene against this repo's own recorded conventions: a residual without a
reopen trigger (G3), an audit line calling a prose lookup a membership test (G4), and line-number cites
that this increment will shift (G5).

Nothing here questions the increment's premise, scope, or the decision to add no drift checker — that
reasoning holds and was endorsed at GATE 1.

## Verdict

**ADVISORY VERDICT: 5 concerns raised (0 blocking-severity, 2 important, 3 minor) — for the human to
weigh before `/pharn-dev-build`.**

This verdict covers the **interrogation only** and gates nothing. It is model judgment, not a floor
operation: it is not a claim that the plan is good, and "the grill ran" never means "the plan is sound"
(P0). The one floor-grade stop this stage owns — Step 1b's `check-plan-lessons.mjs` exit — is reported
in the header and returned **GREEN**; that guarantees the lessons **declaration** held, never that the
lessons were **applied**.
