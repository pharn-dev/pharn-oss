# GRILL — frontmatter-parser-parity

Plan: `.dev/features/frontmatter-parser-parity/PLAN.md` · spec-hash: MATCH (`2c84959c…b12e` recomputed with
`.dev/floor/hash-doc.mjs` equals the pin) · Step 1b lessons-declaration (FLOOR): **GREEN** —
`check-plan-lessons.mjs` exit 0, "all 9 cited id(s) resolve in .dev/memory-bank/lessons-learned.md and are referenced
in the plan body".

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194015 B of griller files, 99391 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding is
not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  observability griller's judgment.

## A measurement made during the grill (grounds G3)

The closure predicate the plan proposes (a regex literal opening `^([A-Za-z_]` or `^-[ \t]+([A-Za-z_]`) was run over
non-test `pharn/floor/*.mjs` and `.dev/floor/*.mjs` at `d5453a17`. It hits exactly ten files: the nine readers the
plan's ENF-4 table names, `frontmatter-core.mjs` itself, and `instruction-files-core.mjs` (the one planned allowlist
entry). No unplanned file is hit, so the allowlist the plan states is the measured one.

## Findings

### testability (P1) — presence recognized; adequacy

```yaml
- type: FINDING
  rule_id: P1
  severity: important
  file: ".dev/features/frontmatter-parser-parity/PLAN.md:116"
  problem: "Swapping readHeaderField's naive fence toggle for fenceStates changes more than the tilde case the plan names: fenceStates (top-level reading) treats a fence line indented 4+ spaces as content, where the toggle's ^\\s* treated it as a fence, and the planned parity fixture covers only the tilde case."
  evidence: "The dev-bullet branch's fence toggle is replaced by `fenceStates` from `plan-files-core.mjs` ... so a backtick fence line inside a tilde fence no longer closes it"
```

### guarantee audit (P0)

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/frontmatter-parser-parity/PLAN.md:134"
  problem: "The anchor closure relaxes an existing ✧ pin — 'every consumer actually APPLIES stripBom' becomes 'calls stripBom or matchFrontmatter' — and the plan does not say so where the relaxation happens, so a reader of the CHANGELOG would not know a pin was widened."
  evidence: "every `CONSUMERS` entry calls `stripBom(` or `matchFrontmatter(`"
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/frontmatter-parser-parity/PLAN.md:1"
  problem: "Both closure rules range over `.mjs` under pharn/floor and .dev/floor only; .claude/hooks/set-writes-scope.cjs parses command frontmatter with its own strict anchor (no BOM strip, fail-closed: 'no YAML frontmatter') and reads the FIRST `writes:` line (findIndex) — a first-wins reader of a gated header the increment cannot touch (hook-protected) and does not name."
  evidence: "## Not changed lists no `.claude/hooks/` entry; the closure rules name `pharn/floor/*.mjs` and `.dev/floor/*.mjs`"
```

### architecture (P3) — fit recognized

Routing the line grammar through `frontmatter-core.mjs` reuses the established shared core (the 6.20.5 `readField`
precedent), and the two `.dev/floor` imports point `.dev` → `pharn` (GATE 1 Q2). No sibling coupling; no new mechanism
where one exists.

### coupling (P3) — clean seams recognized

`fieldEntries` is a pure function returning immutable data; each consumer keeps its own value rule and Map. No shared
mutable state or ordering dependency is introduced. The concurrent group-D edits are a merge-conflict risk, not
coupling, and the plan bounds its edits there to the reader swap.

### comprehension (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/frontmatter-parser-parity/PLAN.md:94"
  problem: "fieldEntries takes LINES while its sibling readField takes the raw BLOCK; the plan does not say why the two signatures differ, so the next maintainer cannot tell whether passing a block to fieldEntries is a bug."
  evidence: "`fieldEntries(lines, re = FIELD_LINE_RE)` — every matching line as `{ key, raw }` in file order"
```

### error-handling (P7) — present and adequate

The one new failure (a repeated `applied_lessons`) has a named RED, ordered before the shape check, with a message
quoting only the count and regions. The BOM change removes a false negative and adds no failure path. No finding.

### documentation (P7) — adequate

No new public surface beyond two core exports; the guide block for `check-plan-lessons.mjs` is in `## Files`, and the
CHANGELOG entry is planned. No finding.

### performance (P7) — no scaling risk recognized

Every change is a per-file, single-pass line scan, as today.

### security (P2), privacy (P2), i18n, a11y, migrations, observability — no axis present

The scans above found nothing; the increment adds no input source, network path, personal data, user-facing text, UI,
schema or runtime signal. No findings.

## Summary

The plan is grounded in two reproduced failures, a tree-wide measurement showing the new refusal REDs no committed
artifact, and a closure predicate whose hit set matches the plan's site list exactly. The concerns are about edges of
the stated scope: the fence swap in `readHeaderField` changes indented-fence semantics as well as the tilde case (G1),
the anchor closure quietly widens an existing ✧ pin (G2), the hook-side frontmatter reader (`set-writes-scope.cjs`,
first-wins on `writes:`, strict anchor) sits outside both closures and is not named as a bound (G3), and
`fieldEntries`' signature choice is unexplained (G4). G3 cannot be fixed in this increment (the hook is protected); it
can be named.

ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 4 advisory: 2 important, 2 minor) — for the human to weigh
before /pharn-dev-build. This verdict covers the interrogation only; the Step 1b floor verdict is reported in the
header.
