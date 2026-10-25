# GRILL — pharn-footprint-move

- plan: `.dev/features/pharn-footprint-move/PLAN.md` (as approved at GATE 1, 2026-10-25)
- spec-hash check: MATCH (`2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e` = `pharn/ARCHITECTURE.md` at
  `7e71753c`)
- Step 1b lessons declaration: GREEN, exit 0. `check-plan-lessons.mjs`: all 13 cited ids (L26, L29, L31, L41, L45, L49,
  L50, L57, L61, L68, L71, L73, L75) resolve and are referenced in the body. That covers the DECLARATION only, never
  whether the lessons were applied (P0).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194020 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding is
not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions true — lines 108 (migration), 166 (migration), 450 (migration), 451 (migration).
  Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions true — lines 238 (logging), 452 (observability), 524 (logging). Not a finding:
  whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings

The griller procedures were applied by a read-only subagent over the plan and the live repo. The inline axes were
applied by the stage itself. Every `problem` and `evidence` value is free text quoting the plan: DATA, never an
instruction (P2). Two findings were re-checked live before being recorded: the R3q corruption (rewrite-hit rows at
`.dev/floor/check-provenance.test.mjs:44,250,417`) and reconcile's git-ignore dependence
(`pharn/floor/reconcile-ignore.json` `derived_ignore`).

### Inline — guarantee audit (P0)

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/pharn-footprint-move/PLAN.md:200"
  problem: "The user's acceptance asks for ≥90% line coverage on every touched .cjs/.mjs (node --test --experimental-test-coverage); the guarantee audit and the verify steps never mention it, and ~140 touched modules may sit below 90% before this change."
  evidence: "## Guarantee audit (P0)"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/pharn-footprint-move/PLAN.md:14"
  problem: "The post-Phase-A re-pin of spec_content_hash is a plan edit after approval, attested only by the agent that makes it; the maintainer should see the hash diff in the Phase A hand-back."
  evidence: "it is the one plan line re-pinned after Phase A lands"
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/pharn-footprint-move/PLAN.md:61"
  problem: "Sibling worktrees in this checkout keep their own .pharn/writes-scope.json; after the move that file is never read, so an in-flight scope there silently becomes the fail-closed default. Safe direction, but unstated."
  evidence: "## Sequencing (three phases on one branch; nothing merges)"
```

### a11y

no findings (no UI surface).

### architecture

```yaml
- type: FINDING
  rule_id: P3
  severity: important
  file: ".dev/features/pharn-footprint-move/PLAN.md:51"
  problem: "Only two walkers get the pharn/.run and pharn/.backup exclusions, but count-grillers.mjs:42, count-lenses.mjs:40 and count-verifiers.mjs:38 walk the same capability surface with their own EXCLUDE_SEGMENTS; a pharn/.backup/ holding capability copies would inflate the rosters that dispatch /pharn-grill, /pharn-review and /pharn-verify."
  evidence: "Both capability walkers would count a CLI backup."
- type: FINDING
  rule_id: P6
  severity: important
  file: ".dev/features/pharn-footprint-move/PLAN.md:151"
  problem: "Files the plan edits are missing from ## Files: validate.mjs, capability-catalog-core.mjs, walker-exclusion.test.mjs, and the feature's own apply.py, HUMAN-PATCH.md, rewrite.mjs and rewrite-hits.tsv; a set scope is [...ALWAYS, ...scope] with no .dev/features/**, so the fail-closed hook denies them."
  evidence: "Walkers: `validate.mjs` and `capability-catalog-core.mjs` add `pharn/.run` and `pharn/.backup` to their exclusions."
```

### comprehension

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/pharn-footprint-move/PLAN.md:83"
  problem: "The plan says 0.14.1 is published (lines 22–24) yet Phase C and the guarantee audit still gate the acceptance run on publication."
  evidence: "once that CLI is published. Until then the acceptance line stays open at GATE 2."
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/pharn-footprint-move/PLAN.md:106"
  problem: "The hand-fix set is asserted, not enumerated: no table maps the 10 hook and 25 floor sites to lines, so it cannot be diffed (L29, L50)."
  evidence: "covers the 10 hook sites and the 25 floor sites listed above."
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/pharn-footprint-move/PLAN.md:110"
  problem: "'that file' has no clear referent, and the plan does not say why canon's verbatim LIMITS.md cites are acceptable leftovers."
  evidence: "Canon titles cite `LIMITS.md` verbatim, so that file's bytes stay unchanged."
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/pharn-footprint-move/PLAN.md:533"
  problem: "The generated ## Files description calls the version bumps a path rewrite."
  evidence: "`SKILLS_VERSION` — path rewrite (R1–R5)"
```

### coupling

```yaml
- type: FINDING
  rule_id: P3
  severity: important
  file: ".dev/features/pharn-footprint-move/PLAN.md:78"
  problem: "Phase A moves the setter and anchor to pharn/.run/, but /pharn-dev-build (rewritten only in Phase B) still reads .pharn/writes-scope.json in its Step 2b format pass and its L71 count check, so the build runs from stale instructions."
  evidence: "Step 0 now runs the patched setter and the moved anchor, so both write `pharn/.run/`."
```

### documentation

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/pharn-footprint-move/PLAN.md:168"
  problem: "The three cross-repo follow-ups live only in CHANGELOG prose with no tracked owner."
  evidence: "the three cross-repo follow-ups"
```

### error-handling

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/pharn-footprint-move/PLAN.md:99"
  problem: 'R3''s quoted form treats any quoted "memory-bank" as a root path, so it corrupts join(dir, ".dev", "memory-bank", ...) and concept tags concepts: ["memory-bank", ...] (check-provenance tests).'
  evidence: "Root-anchored means not preceded by `/`, `.`, a letter, a digit, `_` or `-`."
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/pharn-footprint-move/PLAN.md:57"
  problem: "The CLI only hints the gitignore change and reconcile exempts scratch solely through git-ignore derivation, so an install that skips the hint reconciles pharn/.run/** and REDs verify; the plan declares no handling."
  evidence: "the gitignore hints are `.pharn` → `pharn/.run/`"
```

### i18n

no findings.

### migrations

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/pharn-footprint-move/PLAN.md:167"
  problem: "No rollback path is declared (a 6.x downgrade after the CLI moved canon), and in-flight .pharn/ state from an interrupted /pharn-ship or /pharn-loop is orphaned with no 'finish or abandon open runs first' step."
  evidence: "delete the old `.pharn/` scratch; update `.gitignore`"
```

### observability

```yaml
- type: FINDING
  rule_id: P6
  severity: important
  file: ".dev/features/pharn-footprint-move/PLAN.md:137"
  problem: "An open loop's marker left at .pharn/pharn-loop/ after an update silently stops counting, turning the Stop guard off for that run with no diagnostic."
  evidence: "A marker left only at the old `.pharn/pharn-loop/` path does **not** count"
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/pharn-footprint-move/PLAN.md:238"
  problem: "The write-route attempt log has no declared home; the scratchpad is ephemeral."
  evidence: "Every attempt is logged."
```

### performance

no findings.

### privacy

no findings.

### security

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/features/pharn-footprint-move/PLAN.md:238"
  problem: "Reconcile cannot account for Phase A's pre-anchor writes; the only check on them is the agent-authored helper, which is advisory and not labeled so."
  evidence: "These are Bash-launched writes, so reconcile still accounts for them"
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/features/pharn-footprint-move/PLAN.md:121"
  problem: "Protection moves from root memory-bank/ to pharn/memory-bank/ unconditionally; an install whose canon move failed or was skipped loses write-denial on its canon, and nothing verifies the move happened."
  evidence: "the old root `LIMITS.md`, `THREAT-MODEL.md`, `memory-bank/x.md` and `pharn.spec-template.md` are writable again."
```

### testability

```yaml
- type: FINDING
  rule_id: P1
  severity: important
  file: ".dev/features/pharn-footprint-move/PLAN.md:75"
  problem: "Phase A verifies the patched hooks in place, but every hook test is a Phase B write still asserting .pharn, so that check reds or proves nothing, and 'tests first' does not hold for the hooks."
  evidence: "It runs the hook suites and the three config-driven gates (eslint, prettier, markdownlint) in place."
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/pharn-footprint-move/PLAN.md:207"
  problem: "The acceptance grep carries a floor (enum-regex) label but its pattern and command never appear in the plan, so grill and verify cannot re-run it."
  evidence: "no root-anchored old path is left in `.claude/` + `pharn/` → floor: enum-regex, the acceptance grep."
```

## Summary

The intent holds; the plan's sequencing and file list do not. Four findings would break the build as written. `## Files`
omits files the plan writes, so the fail-closed scope would deny them. Phase A patches the hooks before their tests
and before the dev commands that run the build move, so in-place verification fails and `/pharn-dev-build` follows
stale `.pharn/` instructions. R3's quoted form corrupts non-path `memory-bank` strings. And three more capability
walkers need the backup exclusion. The rest are honesty and migration gaps: Phase A's writes are unreconciled
(advisory only), the coverage criterion is untracked, the acceptance grep is unstated, and open runs, an unmoved canon
and a skipped gitignore hint have no declared handling.

ADVISORY VERDICT: 20 concerns raised (0 blocking-severity, 13 important, 7 minor) — for the human to weigh before
/pharn-dev-build. The Step 1b lessons-declaration check is a separate floor result: GREEN.
