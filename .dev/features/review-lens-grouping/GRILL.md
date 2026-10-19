# GRILL — review-lens-grouping

Plan `.dev/features/review-lens-grouping/PLAN.md` at `5a89e16` (GATE 1 round 2 approved) · spec hash: MATCH
(`node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md` = `75088a82d113bc52cdd3d5fb2e44533e81cba5f520877f5eaa441ced45fb0fd6`
= the plan's pin) · **Step 1b lessons-declaration verdict (FLOOR): GREEN, exit 0** —
`node pharn/floor/check-plan-lessons.mjs .dev/features/review-lens-grouping/PLAN.md .dev/memory-bank/lessons-learned.md`:

```text
GREEN — applied_lessons: L4, L6, L13, L15, L24, L25, L29, L33, L34, L35, L36, L37, L40, L41, L45, L55, L60, L62, L67, L68, L70, L71 (.dev/features/review-lens-grouping/PLAN.md); all 22 cited id(s) resolve in .dev/memory-bank/lessons-learned.md and are referenced in the plan body. NOTE (P0): that these lessons were GENUINELY applied is advisory — this checker verifies the DECLARATION, never the application; a body line reading "L4: considered." satisfies the reference check.
```

That verdict covers the declaration only. It says nothing about whether the 22 lessons were applied, and it is not
counted in the concerns below.

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194015 B of griller files, 99391 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings (advisory — the plan is `trust: untrusted`; every `problem` / `evidence` below is quoted DATA)

### Trust (P2) — inline axis and the security griller

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/features/review-lens-grouping/PLAN.md:519"
  problem: "The trust audit treats the definition as PHARN's own trusted instruction, but Claude Code loads `.claude/agents/pharn-review-lens.md` from the reviewed working tree (and applies an edit to it within seconds, mid-session), so a branch under review can rewrite the container every lens runs in — its body, `tools:`, and documented keys such as `permissionMode` or `hooks` — while `review-lens-agent.test.mjs` pins only this repo's committed bytes; the plan neither names this channel nor says what Step 1 does when the review target touches `.claude/**`."
  evidence: "The definition's body is trusted instruction, not write-protected (as `.claude/commands/**` is not)."
```

### Guarantee audit (P0) — inline axis and the testability griller

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/review-lens-grouping/PLAN.md:232"
  problem: "Nothing binds the file the build writes to the file the probe measured: Design §3's scope-guard sentence ('no `findings.json` under `pharn/features/`') and §6's write-probe path (`pharn/floor/lens-agent-probe.mjs`) already differ from the probe kit (guard without the `pharn/features/` clause; write path `pharn/floor/lens-agent-probe/findings.json`), so the go/no-go can certify a container the build does not ship; a content-hash of the probed file recorded in MEASUREMENTS.md and compared with the built file would close it."
  evidence: "its scope guard: when the prompt names no lens under `pharn/pharn-review/` and no `findings.json` under `pharn/features/`, it stops and says so (L70);"

- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/review-lens-grouping/PLAN.md:346"
  problem: "'Review sets mirror production' holds for the routing rule only: each grouped eval context holds 7–17 small case files, while the plan's own measurements hand the whole-target family every file of a PR diff (1–568 files in pharn-starter), so the N=1 run cannot show dilution or contamination at production context sizes; and the scoring runs `structural[]` only, leaving every case's `semantic[]` judge unevaluated — neither bound is stated where the GATE 2 decision will read the results."
  evidence: "Review sets mirror production. For each run, the harness runs the real emitter and `lens-groups.mjs` over that family's case files as the target."
```

### Determinism (P5) — inline axis

```yaml
- type: FINDING
  rule_id: P5
  severity: important
  file: ".dev/features/review-lens-grouping/PLAN.md:335"
  problem: "The go/no-go is called a comparison of two integers, but the plan never says which integer: the cache-write class or the all-classes first-request total (cache reads vary between agents), nor which of the two `pharn-review-lens` transcripts counts (the write-probe agent can read the first one's cache), nor that the ratio depends on the probing session's MCP servers and CLAUDE.md, so the branch is not yet a defined test."
  evidence: "Go/no-go, as the human set it: `P_custom` ≤ 50% of `P_gp`, same session."

- type: FINDING
  rule_id: P5
  severity: important
  file: ".dev/features/review-lens-grouping/PLAN.md:244"
  problem: "The helper's exit 1 covers an unreadable record as well as an unreadable map, yet every non-zero exit routes to the one-group-per-lens fallback, which needs the same record (Step 3 reads each lens's files from it); a map fault can fall back safely, a record fault cannot and should stop as the emitter's refusals do."
  evidence: "Exit non-zero → one group per lens with a non-empty review set (today's spawn). Say so in `REVIEW.md`."

- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/features/review-lens-grouping/PLAN.md:553"
  problem: "`## Open questions (HALT)` still lists six questions with their option bullets beneath the heading `/pharn-dev-build` Step 1 reads by judgment for 'unresolved' questions; the answers are recorded in the GATE 1 round 2 section, so the list under the HALT heading invites a false halt or a misread."
  evidence: "None open. All six were resolved at GATE 1 round 2 (above), each by option (a). The options as they were put stay below for the record."
```

### Error handling (P7) — the error-handling griller

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/review-lens-grouping/PLAN.md:250"
  problem: "A group subagent that fails, times out or stops after writing some members' `findings.json` leaves the others absent, which the merge's glob and REVIEW.md cannot tell from 'reviewed, no findings'; grouping raises that loss from one lens to up to four, and the plan declares no per-member check of which `findings.json` files exist after a group returns."
  evidence: "Three rules: apply each lens on its own; a lens's finding names only a file in that lens's list; write each lens's `findings.json` before starting the next."
```

### Architecture and coupling (P3) — the architecture and coupling grillers

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/review-lens-grouping/PLAN.md:11"
  problem: "`pharn/ARCHITECTURE.md §4` names `.claude/commands/` as where the stages live and has no place for a shipped `.claude/agents/` file, so after this lands the trusted architecture is silent on a product location; the plan neither notes the gap nor queues a human-only edit with its L68 timing — a question for the human."
  evidence: "a new product `.claude/` file (`.claude/agents/`)"

- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/review-lens-grouping/PLAN.md:194"
  problem: "The helper becomes a third reader (after the checker and the merge) of the assignment record, whose shape has no contract file, so a record change now ripples into three modules; importing the emitter's exported vocabulary (`BASIS_ENUM`) as `check-review-assignments.mjs` does would keep one owner."
  evidence: "A lens is in a group when its review set is non-empty: its slice, or any `scanner_errors` entry naming it."
```

### Performance and comprehension (P7) — the performance and comprehension grillers

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/review-lens-grouping/PLAN.md:250"
  problem: "Inside a group the lenses run one after another, so a review's wall clock can rise against today's fully parallel spawns (the hygiene and error-handling families serialize four lenses each); the plan estimates the eval's wall clock but not a production review's."
  evidence: "write each lens's `findings.json` before starting the next."

- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/review-lens-grouping/PLAN.md:229"
  problem: "The 2,048 B ceiling on the definition's body is a bare constant with no stated derivation (what it bounds, and what would justify raising it)."
  evidence: "Body: an H1 plus at most 2,048 B, saying four things:"
```

## Griller notes (no finding)

- **testability** — presence recognized: Design §5 (two new test files, budget rows) and §6 (probe, lens evals). Its
  adequacy concern is the P0 finding at `:346`.
- **security** — scanner clean. Its judgment concern is the P2 finding at `:519`.
- **privacy** — scanner clean, and no personal data is handled.
- **observability** — scan `mentions: false`. The change adds no production runtime of its own; `REVIEW.md`'s
  `## Lens agents` block and `assignments.json` are what make a review's grouping visible. No gap warranted.
- **migrations** — no persisted shape changes: the assignment record is untouched and the helper's output is not
  stored.
- **documentation** — declared: the product-commands guide section, the helper's header, the CHANGELOG entry.
- **a11y, i18n** — no UI and no user-facing text.

## Summary

The plan is specific about what it measures and what it leaves advisory. Its biggest open points:

- **The container's integrity in a reviewed working tree (P2).** Claude Code loads the agent definition from the very
  tree under review. The plan's trust audit does not name that channel or a response to a target that touches
  `.claude/**`.
- **Binding the probe to the build (P0).** The probe will measure the kit's bytes, and the plan's own Design §3 / §6
  text already differs from the kit. A hash of the probed file, compared with the built one, would make the go/no-go
  apply to what ships.
- **An undefined go/no-go metric (P5).** Which token class and which transcript the 50% rule reads is unstated.
- **Two failure paths without a stated response:** a helper exit caused by an unreadable record (P5), and a group that
  returns some members' `findings.json` but not all (P7).
- **The eval's reach (P0).** Small grouped contexts and structural-only scoring are bounds GATE 2 should see.

The minor points are a trusted-architecture gap for `.claude/agents/`, a third reader of the uncontracted record,
serial latency inside a group, the resolved-question list sitting under the HALT heading, and an unexplained byte cap.

ADVISORY VERDICT: 11 concerns raised (0 blocking-severity, 6 important, 5 minor) — for the human to weigh before
/pharn-dev-build. The Step 1b lessons-declaration verdict is reported in the header as its own floor result (GREEN) and
is not part of this count.
