# GRILL — instruction-growth-gate

Plan: `.dev/features/instruction-growth-gate/PLAN.md` · spec hash: MATCH
(`d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4`) · Step 1b lessons declaration: **GREEN** (floor,
`check-plan-lessons.mjs` exit 0; 9 cited ids resolve and are referenced in the body).

The interrogation was run by an independent read-only agent (opus). It covered the inline axes and the 13 grillers
`count-grillers.mjs` registers. Its findings are quoted below as DATA (P2). Every file:line cite in the plan that it
checked matched the live code, and so did the 13-reader config table.

## Findings

### Base choice (D1) and loop routing

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/instruction-growth-gate/PLAN.md:154"
  problem: "The base-binding residual is wider than the plan says. A dirty tree makes HEAD the base, so feature work committed before verify reads as growth 0 (a multi-session feature, a commit after the build plus one stray untracked file, a verify re-run after loop Step 6c)."
  evidence: "Residual `instruction-growth-base-binding`: a commit made during the run moves HEAD and hides what it committed"
- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".dev/features/instruction-growth-gate/PLAN.md:151"
  problem: "Standalone /pharn-verify on a clean tree with no origin/main (a master default branch, no remote, an unborn HEAD) now fails every time with base-unresolved. A fixed argv cannot carry --base."
  evidence: "else INCONCLUSIVE `base-unresolved` (a gate cannot ask)"
- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".dev/features/instruction-growth-gate/PLAN.md:175"
  problem: "Some INCONCLUSIVE causes cannot be fixed by any build (threshold-malformed at base, base-unresolved), yet check-loop reads them as CONTINUE, so /pharn-loop retries to the cap for nothing."
  evidence: "An INCONCLUSIVE gate (exit 2) is also a red the loop retries to the cap — named."
```

### Anti-gaming and guarantee audit

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/instruction-growth-gate/PLAN.md:174"
  problem: "Under-count routes contradict D6's 'only route' claim: a non-canonical catch-all (`**/*.*`, `./**`), a duplicate `paths:` key, a YAML error the line reader does not recognise, and an always-loaded file made git-ignored."
  evidence: "Over-counts, never under-counts, for the shapes it recognises; a YAML error it does not recognise is a bound."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/instruction-growth-gate/PLAN.md:262"
  problem: "'Runs in every verify' is called floor, but no consumer checks that the id is present (coverageGap ranges over `required`, which holds source ids only). The claim should be narrowed to 'the runner composes it', the same bound reconcile has."
  evidence: "floor for the WIRING (`orderEntries` injects it…; `validateStamp` needs nothing new)"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/instruction-growth-gate/PLAN.md:162"
  problem: "Base reads through git cat-file/ls-tree honour replace refs, so a Bash `git replace` changes the base threshold or base content without moving HEAD; --no-replace-objects closes it cheaply."
  evidence: "`budget.instructionGrowthBytes` read from `git` objects at the BASE commit"
```

### Does the gate address the recorded failure?

```yaml
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/instruction-growth-gate/PLAN.md:163"
  problem: "The recorded failure is cumulative (418 KB over many features). A 2048-B per-change budget does not bound accumulation, and the plan gives no measurement or reason for 2048."
  evidence: "default **2048** when the file or the key is absent at base"
```

### Test coverage and Files list

```yaml
- type: FINDING
  rule_id: "P1"
  severity: important
  file: ".dev/features/instruction-growth-gate/PLAN.md:192"
  problem: "Files misses obliged test pins: stage-runtime.test.mjs:273 asserts exactly 3 slow steps (a, b and the injected reconcile); frontmatter-core.test.mjs CONSUMERS needs the new consumer; pharn-verify.md has 503 bytes of budget left."
  evidence: 'assert.equal(spent, 3, "a, b and the injected reconcile — each a slow step")'
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: ".dev/features/instruction-growth-gate/PLAN.md:242"
  problem: "No negative control separates a line MULTISET from a line SET: no case adds a copy of an existing line (must count) or moves a line within a file (must be free)."
  evidence: 'adds N + removes M > N, N > threshold → RED (anti-gaming, mutant "net bytes" → test red)'
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: ".dev/features/instruction-growth-gate/PLAN.md:232"
  problem: "Not counting depth 5 is the under-count direction, and the docs' 'four hops' does not settle where counting starts."
  evidence: "depth 5 (`import-depth-exceeded`, not counted)"
```

### One owner per fact, one axis per file

```yaml
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: ".dev/features/instruction-growth-gate/PLAN.md:20"
  problem: "Importing resolveBaseSource shares only the decision. The dirty predicate and the merge-base call in stage-regress.mjs:430-447 are not exported, so the new module carries a second copy of BASE_RULE's inputs."
  evidence: "the base choice via `stage-regress-core.mjs` `resolveBaseSource()` (BASE_RULE)"
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: ".dev/features/instruction-growth-gate/PLAN.md:181"
  problem: "The pure core has two reasons to change: Claude Code's loading model and PHARN's growth policy."
  evidence: "import tokenizer, `paths:` reader … line-multiset added bytes, threshold parsing"
```

### Documentation, privacy, dogfood

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/instruction-growth-gate/PLAN.md:165"
  problem: "The new config key and its escape procedure have no declared home in a shipped doc."
  evidence: "Escape for a legitimately large convention: a human raises the key in a separate commit on the base branch"
- type: FINDING
  rule_id: "P2"
  severity: minor
  file: ".dev/features/instruction-growth-gate/PLAN.md:62"
  problem: "scan-plan-pii.mjs flags an email literal; it is the reserved example.com domain in a tokenizer example — benign, recorded."
  evidence: '{"found":true,"hits":[{"line":62,"kind":"email-literal"}]}'
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/instruction-growth-gate/PLAN.md:207"
  problem: "The increment adds a Commands entry to this repo's 172,421-byte CLAUDE.md, the growth the gate exists to stop, without committing to keep it at or under 2048 B."
  evidence: "`CLAUDE.md` — the Commands block entry for the checker (this repo's own CLAUDE.md is NOT gated"
```

## Summary

The verify wiring is sound. The interrogation confirmed four things. A fixed-argv entry before `reconcile` needs no
change in run-gates, stage-verify, check-verify or check-loop. A gate's `git status` cannot move the worktree
fingerprint. Stage-work counts and head-reuse handle a second injected entry. Importing from stage-regress-core.mjs is
cheap. The real gaps are elsewhere:

- The base choice hides committed growth, and it fails verify on a clean tree that has no `origin/main`.
- Several under-count routes undercut D6's "only route" wording.
- A per-change budget cannot by itself bound the cumulative growth that motivated the increment.

Two test files the change breaks are missing from `## Files`.

ADVISORY VERDICT: 15 concerns raised (0 blocking-severity, 7 important, 8 minor), for the human to weigh before
/pharn-dev-build. This verdict covers the interrogation only. The Step 1b floor verdict is reported in the header.
