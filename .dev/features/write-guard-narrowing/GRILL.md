# GRILL — write-guard-narrowing

Plan: `.dev/features/write-guard-narrowing/PLAN.md` (as approved at GATE 1, 2026-09-27). Spec hash:
`d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4` recomputed with `hash-doc.mjs` — **matches** the
pin. **Step 1b (FLOOR): `check-plan-lessons.mjs` exit 0 — GREEN**, verbatim: "GREEN — applied_lessons: L19, L22,
L24, L26, L27, L29, L31, L36, L37, L41, L50, L54, L59, L64 (.dev/features/write-guard-narrowing/PLAN.md); all 14
cited id(s) resolve in .dev/memory-bank/lessons-learned.md and are referenced in the plan body." That verdict
covers the declaration only, never that the lessons were applied (P0).

Stage model: opus (`claude-opus-5-5`), by the maintainer's instruction for this batch — not a `pharn.config.json`
route. The plan under interrogation is `trust: untrusted`; every `problem` / `evidence` below is quoted DATA.

## Grillers (Step 2b)

`count-grillers.mjs` registered 13. Their deterministic scanners, run over the PLAN:
`scan-plan-migrations.mjs` → `{"mentions":false,"hits":[]}`, `scan-plan-observability.mjs` →
`{"mentions":false,"hits":[]}`, `scan-plan-pii.mjs` → `{"found":false,"hits":[]}`, `scan-plan-secrets.mjs` →
`{"found":false,"hits":[]}` — all exit 0. Applied inline, per griller:

- **testability** — presence recognized: "Evals and tests to write" enumerates the protect and enforce cases,
  the deny-body enumeration and the copy pin. Layer 2 → G3.
- **security** — scanner clean. Layer 2 → G1, G4 (the increment is itself a security fix; both are about what the
  new message and the new inputs may do).
- **error-handling** — present and adequate: every new input path fails closed (a missing or malformed payload
  field, pointer file or directory grants nothing; a throw inside the decision denies through the existing
  guard-error path). No finding.
- **architecture** — fit recognized: no new module, no new control-surface file; the new copy of
  `resolvePhysicalTarget` follows the pinned-copy precedent (`workTreeRoot`, `toKey`). No P3 misfit finding.
- **coupling** → G5 (the Claude Code layout knowledge is a second axis of change in one file).
- **documentation** — present: §4 sweeps every site by referent (L50). Layer 2 → G2 (one bound missing).
- **comprehension** — no finding; the plan is long but each rule is stated once, with its test.
- **performance** — present: the hook cost is measured at build (L24). No finding.
- **privacy** — PII scanner clean; the hook reads the `transcript_path` STRING and never the transcript's
  content. No finding.
- **observability**, **migrations**, **a11y**, **i18n** — scanners clean or no surface (a hook with no UI, no
  telemetry, no stored data); no finding.

## Findings

### Trust and remedies (P2, L27)

Finding G1:

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/features/write-guard-narrowing/PLAN.md:192"
  problem: "The Claude-state variant tells the agent a claude-<uid> path is NOT scratch and not to use Bash, but
    when the payload carries no usable scratchpad_dir or session_id (an older Claude Code, the scratchpad feature
    off, a served remote call) the agent's OWN scratchpad also lives under claude-<uid>, so the variant would
    mislabel the agent's own scratch file and offer no reachable route for it."
  evidence: 'a scratch file goes to this session''s own scratchpad or a temp directory outside every
    `claude-<uid>` folder, instead of here; **no Bash bullet** — "This path is NOT scratch"'
```

Finding G4:

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/features/write-guard-narrowing/PLAN.md:425"
  problem: "The trust audit says nothing from the payload's session fields is echoed into a message, but no
    planned test pins it; a crafted transcript_path, scratchpad_dir or session_id carrying a newline and
    imperative text should be shown never to reach any deny body."
  evidence: "They are validated (grammar, absolute, suffix) and used only as path operands and in exact
    comparisons; nothing from them is echoed into a message."
```

### Honest bounds (P0, L37)

Finding G2:

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/write-guard-narrowing/PLAN.md:215"
  problem: "The LIMITS §7 bullet is planned for 'the worktree/subdirectory bound', which decision B removes; the
    bounds that remain for 1b are not listed — a PHARN install at a subpath (ROOT from CLAUDE_PROJECT_DIR with no
    .git) gets nothing from 1b, a non-git project's session started in a subdirectory still carries a transcript
    key Claude Code does not use for memory, and a custom autoMemoryDirectory or remote memory dir is unseen."
  evidence: "the D2 bullet rewritten for the three places, the two exclusions, the payload fields and the
    worktree/subdirectory bound"
```

Finding G6:

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/write-guard-narrowing/PLAN.md:179"
  problem: "Rule 3's folded exclusions go through toKey(), which reads a backslash as a separator; that is safe
    only because the permissive posture denies every backslash path before rule 3 is reached, and the plan does
    not say so, so a later change to the backslash rule could silently reopen rule 3."
  evidence: "These two are DENY rules inside an allow, so they compare case- and Unicode-folded (`toKey()`),
    which can only widen them."
```

### Tests (P1, L41)

Finding G3:

```yaml
- type: FINDING
  rule_id: P1
  severity: important
  file: ".dev/features/write-guard-narrowing/PLAN.md:393"
  problem: "The L41 real-environment test reads the real ~/.claude, whose verdict depends on the machine: a
    dotfiles setup that keeps ~/.claude in a git tree, or links it into one, turns the expected 0 into an
    other-tree 2. It needs a skip guard on that premise, never a faked expectation."
  evidence: "the real environment (L41) — `/tmp/claude-<uid>/…` without a scratchpad → 2, `os.tmpdir()` file →
    0, the default config dir's main-checkout key → 0"
```

Finding G7:

```yaml
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/write-guard-narrowing/PLAN.md:163"
  problem: "The 1b tests compute an expected key from the main checkout's path; whether git writes that path's
    realpath into a worktree's pointers is a platform premise (macOS's /var is a symlink) that must be measured
    and asserted, not assumed. Measured this run (git 2.50.1, macOS): both the pointer and the back-pointer hold
    the realpath, whether git was run through /var or /private/var."
  evidence: "`<ROOT>/.git` a regular file (lstat, never followed) → `gitdir: <p>` (one line) → `gitdir =
    resolve(ROOT, p)`"
```

### One axis of change (P3)

Finding G5:

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/write-guard-narrowing/PLAN.md:144"
  problem: "Claude Code's own layout (the memory-key derivation, the scratchpad path, the claude-<uid> temp
    folder) is a second reason for enforce-writes-scope.cjs to change, beside its scope policy. A separate module
    would be a new control-surface file (protect's list, the setter's list, the pins, the wiring), so keeping it in
    the hook is defensible — but it should sit in one headed section that names Claude Code as its owner."
  evidence: "In `enforce-writes-scope.cjs`, reached exactly where today (install posture, no scope, no run, after
    the alias and other-tree tests)."
```

## Summary

The plan closes both findings with the mechanisms the rest of the hook already uses (a second resolution, fail-closed
membership tests), and the GATE-1 decisions are folded in. The concerns are about edges, not the approach: the new
message must stay truthful for an agent's OWN scratchpad when the payload lacks the fields (G1), a pin for the
no-echo claim (G4), the bounds decision B leaves (G2, G6), and two test premises that depend on the machine (G3,
G7). G5 asks for the Claude Code layout to be one visible section. None changes the design; each is amended into the
plan below its own finding (PLAN.md, "Amended at grill").

ADVISORY VERDICT: 7 concerns raised (0 blocking-severity, 4 important, 3 minor) — for the human to weigh before
/pharn-dev-build. The Step-1b floor verdict above is reported separately and is not counted here.
