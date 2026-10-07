# GRILL — regress-base-integrity

Plan: `.dev/features/regress-base-integrity/PLAN.md` · spec-hash: `75088a82…fd6` recomputed this run — **matches** the
pin · **Step 1b lessons declaration: GREEN** (`check-plan-lessons.mjs` exit 0; L17, L31, L34, L35, L39, L41, L43, L44,
L71 resolve and are referenced in the body — the declaration, never the application).

Griller membership (`count-grillers.mjs`, FLOOR): 13 registered. Deterministic plan scanners run: `scan-plan-secrets`,
`scan-plan-pii`, `scan-plan-i18n`, `scan-plan-migrations` — no hits; `scan-plan-observability` — one hit, line 50 term
`spans` ("`**` spans everything"), a glob description, not a tracing span: no observability surface in this increment.
`a11y`, `i18n`, `migrations` do not apply (`applies:` ssr/spa/backend; this is floor tooling). GATE 1 itself was a
delegated orchestrator decision (Q1–Q5 all (a)), not a human approval.

## Findings (all ADVISORY)

### Guarantee audit (P0)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/regress-base-integrity/PLAN.md:206"
  problem: "The plan calls 'base gates cannot resolve the HEAD tree's node_modules/.bin' floor by construction; placing a directory is none of the three floor primitives. Label it a tested structural property (advisory), with the bound already listed."
  evidence: "→ floor by construction (the directory is outside the project; Node/npm walk ancestors only)"
```

### Architecture (P3 — one axis per file)

```yaml
- type: FINDING
  rule_id: "P3"
  severity: important
  file: ".dev/features/regress-base-integrity/PLAN.md:145"
  problem: "The temp base-worktree lifecycle (naming, placement check, prefix clearing, resume validation, redaction) is a new axis — where and how the BASE checkout lives — added to stage-regress.mjs, which already orchestrates thirteen phases. A small module (e.g. pharn/floor/base-worktree.mjs, with its own test) would change for that reason alone."
  evidence: "pharn/floor/stage-regress.mjs — EDIT. temp base worktree lifecycle; base source; the three refusals"
```

### Error handling

```yaml
- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".dev/features/regress-base-integrity/PLAN.md:76"
  problem: "Reusing `path-containment` for 'the temp root sits inside the project' conflates it with the symlink walk, and mkdtemp itself failing (ENOSPC, EACCES, a missing TMPDIR) has no named exit at all — it would surface as a crash. One closed unusable code for both would keep the cause readable."
  evidence: "refused `path-containment` if that directory would sit inside the project (a TMPDIR pointing into it)"
```

### Security

```yaml
- type: FINDING
  rule_id: "P2"
  severity: important
  file: ".dev/features/regress-base-integrity/PLAN.md:79"
  problem: "Clearing 'by name prefix' in a shared temp root (Linux /tmp) can meet an entry another local user planted under that prefix: a symlink (must be unlinked, never followed), or a directory owned by someone else (removal throws EPERM — must not crash the stage). The clear should lstat each candidate, act only on a real directory owned by this uid, and be best-effort."
  evidence: "cleared at every fresh start and at the worktree phase by registration + name prefix"
```

### Comprehension / documentation

```yaml
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".dev/features/regress-base-integrity/PLAN.md:57"
  problem: "The GATE-1 base lives in the model's context like the loop's. A /pharn-ship run resumed in a fresh conversation after GATE 1 no longer holds it, and re-capturing then would take a HEAD that may already hold the build. The command should say: never re-run the capture later in the run; without the value, STOP."
  evidence: "its printed SHA is substituted literally as `<base sha>` into both regress lines"
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/regress-base-integrity/PLAN.md:87"
  problem: "The registry's `install-unresolved` option 'Skip the install step' will now lead to a `base-install-unreliable` refusal whenever a gate is red on both sides; the fixed option text (stage-exit-core) does not say so, so a human picks it without knowing the cost."
  evidence: "the stage REFUSES `base-install-unreliable` (no report)"
```

### Testability

```yaml
- type: FINDING
  rule_id: "P1"
  severity: important
  file: ".dev/features/regress-base-integrity/PLAN.md:191"
  problem: "No Capability changes, but the executable changes need test-first evidence per change: the plan should name, per item, the stage-regress.test.mjs case that runs the audit fixture's shape through the REAL script (f1, f1b, f2, f3 x4 patterns, f6), each with its control, and assert the worktree path is outside the fixture repo during a run (not only absent afterwards — L41/L34)."
  evidence: "Each executable change ships with a test that fails at `052709d` and passes after"
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".dev/features/regress-base-integrity/PLAN.md:165"
  problem: "command-hygiene's executed DIRECT_STAGE_WIRING test substitutes `'<base sha>'` only on the loop's lines today; once ship's regress lines carry it, the substitution must apply to ship too, or the executed check runs a literal placeholder as the base."
  evidence: "`DIRECT_STAGE_WIRING` ship `extra`"
```

### Performance, coupling, privacy, observability, error paths elsewhere

No findings: the new checks are set/regex operations over lists the stage already holds; the refusal for nothing-under-test
runs before any gate (it saves the base worktree, install and both gate runs); the prefix clear reads one directory.

## Summary

The plan targets real, reproduced false greens and puts each rule where the loop's freshness check can still re-derive
the report (stamp-only in the checker, stage refusals elsewhere). The concerns are about labeling one property as floor
that is structural, a missing axis split for the worktree lifecycle, the shared-temp-root clear, an unnamed failure exit,
the ship base's lifetime across a resumed conversation, and making each fixture a real-script test with a control.

ADVISORY VERDICT: 8 concerns raised (0 blocking-severity, 6 important, 2 minor) — for the human (here, the delegated
orchestrator) to weigh before /pharn-dev-build. The Step 1b floor verdict above is separate and GREEN.
