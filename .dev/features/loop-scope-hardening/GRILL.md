# GRILL — loop-scope-hardening

**Plan under interrogation:** `.dev/features/loop-scope-hardening/PLAN.md` (GATE 1 approved — delegated: decided by
the orchestrating model under the maintainer's 2026-10-13 delegation, with the GATE-1 amendments folded in).
**Spec-hash check (content-hash floor primitive — surfaced, not blocking here):** live `sha256(ARCHITECTURE.md)` =
`75088a82d113bc52cdd3d5fb2e44533e81cba5f520877f5eaa441ced45fb0fd6` **==** the plan's pin. No drift.
**Step 1b lessons-declaration verdict (FLOOR, `check-plan-lessons.mjs`):** GREEN, exit 0 — `applied_lessons: L26, L29,
L31, L36, L55, L56, L60, L68, L73`, all 9 resolve in canon and are referenced in the plan body. (Declaration only —
never that the lessons were applied.)
**Griller membership (FLOOR, `count-grillers.mjs`):** 13 registered. **Deterministic plan scans (`grill-scan.mjs`):**
no secrets, PII or i18n hit; `scan-plan-migrations` / `scan-plan-observability` mention nothing.

> The plan is `trust: untrusted` to this stage. It quotes review-report text and shell lines as data; no
> instruction-shaped content addressed to the griller was found. The `problem` / `evidence` fields below quote the
> plan as DATA.

## Findings (advisory — none gates `/pharn-dev-build`)

### Architecture / coupling (P3, the copy-pair axis)

```yaml
- type: FINDING
  rule_id: "P3"
  severity: important
  file: ".dev/features/loop-scope-hardening/PLAN.md:246"
  problem: "The plan adds a fifth fence-recognition rule to the floor (check-plan-lessons, loop-record-core, spec-template-core and render-ship-briefing each already carry one), while .dev/guides/floor-orchestration.md records that the fence-pairing rule 'had already been wrong twice, so it is not re-derived'."
  evidence: "Fence lines and every line inside an open fence are skipped entirely"
```

The dual reading genuinely needs an indentation-relaxed variant no existing module offers, and the setter cannot
import a floor module, so a new rule is defensible. Disposition the build can take cheaply: export the core's fence
helper from `plan-files-core.mjs` and make `render-ship-briefing.mjs` its first importer (already planned), so the
new rule has one floor home; name the remaining four as a follow-up (`fence-rule-unify`), not this increment (P7).

### Guarantee audit (P0)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/loop-scope-hardening/PLAN.md:193"
  problem: "Covering the inline build fallback pre-approves the exact `reconcile-baseline.mjs --anchor --by pharn-build` line, so a compromised orchestrator can re-anchor the epoch mid-run and launder an earlier Bash write; the 6.58.0 prefix grant allowed the same, so it is not a regression, but the CHANGELOG and the reworded loop bullet must name it rather than imply the anchor is unreachable."
  evidence: "`reconcile-baseline.mjs` is granted only `--amend-scope` and the inline build's exact `--anchor --by pharn-build`"
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/loop-scope-hardening/PLAN.md:302"
  problem: "pharn/floor/README.md (shipped) describes the setter's refusal set as the control-surface paths behind --allow-claude-dir only; after the patch it is incomplete (no installed-surface refusal, no promote refusal, no flag order), and it is not in ## Files."
  evidence: "`pharn/floor/reconcile-ignore.json` — the `not_a_deny` sentence"
```

### Testability (P1 / L55–L56)

```yaml
- type: FINDING
  rule_id: "P1"
  severity: important
  file: ".dev/features/loop-scope-hardening/PLAN.md:95"
  problem: "The markdown-it differential probe the plan cites from L55/L56 is scratch-only; the committed tests stay example-based, so the CHANGELOG's Not-covered list must say the fence rule is held by fixtures plus a one-time probe, not by a differential test."
  evidence: "the fence model is probed against a reference renderer (markdown-it, already in `node_modules`)"
- type: FINDING
  rule_id: "P1"
  severity: important
  file: ".dev/features/loop-scope-hardening/PLAN.md:224"
  problem: "No planned test exercises the SEC-3 composition end to end: the setter's refusal only matters because protect-trusted-paths.cjs unlocks canon on a promote-origin record, and nothing pins that a refused setter leaves no record the escape could read (and that an absent marker still lets the legitimate promotion through the hook)."
  evidence: "- **(c) ENF-1 — the `## Files` parser tracks fences.**"
```

Suggested case for `set-writes-scope.test.cjs`: in a temp tree, run the setter with the promote origin and a fresh
`.pharn/pharn-loop/x/active.json` (expect exit 1, no record), then pipe a canon `Write` payload into
`protect-trusted-paths.cjs` (expect a deny); remove the marker, re-run the setter (exit 0), and the same payload is
allowed — the control.

### Security (P2)

```yaml
- type: FINDING
  rule_id: "P2"
  severity: minor
  file: ".dev/features/loop-scope-hardening/PLAN.md:373"
  problem: "The new refusal messages print offending plan entries verbatim to stderr, as the control-surface refusal already does; an entry can carry terminal control characters, which a later reader (agent or human) sees raw. Pre-existing pattern, not widened in kind."
  evidence: "the new refusal messages print offending entries"
```

### Comprehension / cost

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/loop-scope-hardening/PLAN.md:183"
  problem: "Adding the four inline-able stage commands roughly doubles the grant list (55 to about 100 exact lines, on the order of 8–9 KB) in a frontmatter sent with every loop turn; the plan quotes only the 4.7 KB loop-files half, so the measured byte cost and the ceiling raise should be stated at GATE 2."
  evidence: "45 more subcommands measured this run"
```

### Coupling (P5, a second reader)

```yaml
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".dev/features/loop-scope-hardening/PLAN.md:281"
  problem: "render-ship-briefing.mjs locates the section with `^##[ \\t]+Files\\s*$` while the core and the setter use `^##\\s+Files\\b`, so a `## Files touched` heading is the scope but not the briefing's section; the plan aligns only the fence rule. Name it as a follow-up rather than widen this increment."
  evidence: "its `extractSection` (the `## Files`, Decision and Contracts sections it quotes to the human) uses the core's fence rule"
```

### Axes with nothing to raise

- **a11y, i18n, privacy, migrations, observability** — no user-facing UI, text catalogue, personal data, schema or
  telemetry is touched; the deterministic scans agree (no hit).
- **performance** — the dual reading parses a PLAN twice (linear, small inputs); the marker scan is one `readdir`.
- **error handling** — every new branch in the setter fails closed with a written-nothing message; `openLoopRuns`
  treats every lstat/readdir error other than ENOENT/ENOTDIR as "open". No finding.

## Summary

The plan's core moves are sound and narrowly stated: the grant becomes the derived pinned set with a closure test,
the setter refuses PHARN's own surface from a plan in an install and refuses a promote-origin scope during a loop,
operator flags must precede the mode so no granted wildcard can carry them, and the `## Files` reader stops reading
fenced code with a refusal where its two readings disagree. The concerns are about completeness of the claims and
tests: one shipped doc (`pharn/floor/README.md`) goes stale, the inline-build grant re-admits the exact `--anchor`
line (pre-existing, must be named), the SEC-3 fix has no end-to-end test with the hook it exists for, the fence rule
is a fifth copy and its reference-renderer probe is not committed, and the grant's byte cost doubled with the
inline-stage amendment. None of these needs a re-plan; each has a cheap disposition at build or in the CHANGELOG.

**ADVISORY VERDICT: 8 concerns raised (0 blocking-severity, 5 important, 3 minor) — for the human to weigh before
/pharn-dev-build.** The Step 1b floor verdict is reported in the header and is not part of this tally.
