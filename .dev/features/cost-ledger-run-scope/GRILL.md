# GRILL — cost-ledger-run-scope

**Header.** Plan: `.dev/features/cost-ledger-run-scope/PLAN.md`. Spec-hash check: the recomputed `pharn/ARCHITECTURE.md`
hash `d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4` equals the plan's pin (no drift). **Step 1b
lessons-declaration verdict (FLOOR):** `check-plan-lessons.mjs` exit 0. It prints: GREEN — applied_lessons: L1, L2, L4,
L6, L29, L34, L35, L36, L37, L42, L43, L52, L55, L58, L60, L62, L63, L64; all 18 cited ids resolve in
`.dev/memory-bank/lessons-learned.md` and are referenced in the plan body. That verdict covers the declaration only,
never whether the lessons were applied (P0).

**Griller membership (FLOOR):** `count-grillers.mjs` registered 13 grillers. Each was applied inline. Layer-1 scanners
over the plan:

- `scan-plan-secrets`, `scan-plan-pii` and `scan-plan-i18n` report `found: false`.
- `scan-plan-migrations` reports `mentions: false`.
- `scan-plan-observability` reports `mentions: true` at lines 21 and 82. Both are the feature slug
  `logger-redaction-gaps`, not an observability declaration.

**The GATE-1 decision carried into the build** (orchestrator, under the maintainer's delegation): decisions 1–3 as
recorded, plus three explicit requirements. They are folded into the findings below where they overlap (G5), and
otherwise tracked as build obligations:

- **R1.** A marker line that legitimately appears in a second context (a delivered report quoting it, a human
  paste) degrades to `unknown → unavailable`. State it in the contract as a bound and pin it with a test.
- **R2.** `markerLine()` becomes a load-bearing format. Pin the printer and the matcher agreeing with a test, and say
  in `mark-phase.mjs`'s header that changing the line changes run membership for ledgers emitted afterwards.
- **R3.** The measurement record shows before/after counts for `3c47cb74` and `f34b7a70` from the BUILT code, and
  says plainly that `bb54cf03` — the session behind the roadmap's measured trigger — no longer exists, so that trigger
  cannot be re-derived.

## Findings (advisory — the interrogation gates nothing)

### G1 — guarantee audit (P0)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/cost-ledger-run-scope/PLAN.md:295"
  problem: "The audit says every failure of the binding's two platform assumptions reads as unknown, but the plan's own residual cost-ledger-mention-only is a failure that yields a wrong count."
  evidence: '"Every failure of either reads as `unknown`, never as a count." / residual: "if the orchestrator''s marker output never reaches its own tool result (redirected), and a DIFFERENT context later reads that output back, the reader would bind to the reader"'
```

### G2 — determinism, fail-closed direction (P5)

```yaml
- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".dev/features/cost-ledger-run-scope/PLAN.md:102"
  problem: "The planned record-context rule reads any record without `isSidechain === true` as the main thread, so a platform format change that drops or renames `isSidechain` would put every agent in the main context and bind the whole session to one run — the fail-open direction the plan forbids."
  evidence: '"`isSidechain === true` → `agent:<agentId>` when `agentId` is a bounded identity token, else undeterminable; otherwise `main`"'
```

Remedy proposed for the build:

- Read `main` only on an explicit `isSidechain === false`, and an agent only on `isSidechain === true` with an
  admitted `agentId`. Anything else is undeterminable.
- Require the record's context to AGREE with the file it was read from (`<sid>.jsonl` is main,
  `…/agent-<id>.jsonl` is that agent). Disagreement is undeterminable, so it reads as `unknown`.
- Measured this run: 94,225 of 94,225 usage-bearing records already agree, so no current ledger changes.

### G3 — persisted shape change (migrations griller, P7)

```yaml
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/cost-ledger-run-scope/PLAN.md:1"
  problem: "The plan reshapes a persisted artifact (cost.json's membership gains two keys and a new method) and states only forward read-compatibility, never the old-reader direction or what a revert leaves behind."
  evidence: '"`membership.method` becomes `run-window/2`. `membership` gains `context` (C) and `contexts` (S, sorted)" — no sentence says a <=6.28.x checker reading a 6.29.0 ledger (closed key set, method run-window/1) goes RED'
```

### G4 and G6 — verification adequacy (testability griller, P1): the range check (important), the D2 rewrite (minor)

```yaml
- type: FINDING
  rule_id: "P1"
  severity: important
  file: ".dev/features/cost-ledger-run-scope/PLAN.md:278"
  problem: "No test pins the excluded_requests range check once other contexts' requests inside the window join its fixed part, which is the L63 question for a changed derivation."
  evidence: '"`--verify-transcript`: GREEN; tampered `contexts` RED; a later copy is a WARN; a legacy contaminated ledger RED" — no case with another context''s requests inside AND after a bounded window, re-derived after the session grows'
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: ".dev/features/cost-ledger-run-scope/PLAN.md:284"
  problem: "Rewriting the D2 test makes the attributionAgent spelling unreachable on a sidechain row in a known ledger; the plan should say so in the test and pin the unknown outcome rather than let the assertion silently disappear."
  evidence: '"`with-subagents` moves to the measured shape (`agentId` = file id). Its D2 test is rewritten. A sidechain record with no `agentId` now makes membership unknown, and a test pins that."'
```

### G5 — comprehension (comprehension griller, P7)

```yaml
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/cost-ledger-run-scope/PLAN.md:108"
  problem: "The plan never says which transcript records count as holder evidence, so a maintainer cannot tell whether a quoted marker line in a delivered report or a human paste degrades the binding (GATE-1 requirement R1)."
  evidence: '"Holders: the contexts whose tool-result text carries one of those lines as a WHOLE line."'
```

The shapes were measured this run from the orchestrator's live transcript:

- **Background agent hand-back.** It lands in the parent as a `queue-operation` record and a `user` record with
  string content. Neither is a tool result.
- **Foreground agent report.** A returned report is a `tool_result` block with text blocks.

So under the planned rule, a quoted line in a foreground report degrades the run to `unknown`, and a background
hand-back or a human paste does not. The contract must say so, and two tests pin both directions.

### G7 — architecture and coupling (P3)

```yaml
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: ".dev/features/cost-ledger-run-scope/PLAN.md:211"
  problem: "run-window-core.mjs will own the context half of membership too, so its name and header describe less than it decides; the header must say it owns run membership (window and context), since a rename is out of scope."
  evidence: '"`pharn/floor/run-window-core.mjs` — method `run-window/2`, context vocabulary, binding, the context set, reasons"'
```

- **Fit recognized.** No leaf→leaf reference across `pharn-*` modules. The new edge `transcript-core →
run-window-core` points at a pure module with no imports, so it creates no cycle.
- **Clean seams recognized.** The emitter's dependence on mark-phase's printed line is a real coupling, made explicit
  by the one-owner `markerLine()` and the planned differential (R2).

### G8 — performance (P7)

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/cost-ledger-run-scope/PLAN.md:127"
  problem: "The one-pass reader adds a line split over every tool result in the session; the plan measured a second pass but not this added work, which is where an inherited bound would slip (L24)."
  evidence: '"`transcript-core.mjs` gains `recordContext` and one function that returns the requests ... plus the holders of the given lines and the parent links"'
```

Remedy: a cheap `includes("marker ")` pre-check before splitting, and a re-measure of the built emitter on the 79 MB
session.

### Grillers with no finding (reason noted, not manufactured)

- **a11y, i18n:** no UI and no user-facing strings; scanners clean.
- **privacy:** scanner clean. The new ledger fields are random agent ids, not personal data. The measurement record
  follows the no-home-path precedent.
- **security:** scanner clean. Tool-result text is only compared for equality, and no path is built from a transcript
  value (metas are read by directory listing).
- **documentation:** the new public surface (`membership.context/contexts`, the method, the reasons) is declared in
  the contract, the CHANGELOG, `README.md`, `CLAUDE.md` and the run report. Presence recognized.
- **error-handling:** unreadable or malformed metas and transcripts read as "no link" or skipped lines, and every
  undecidable case ends in `unknown`. Presence recognized.
- **observability:** the rule's outcome is observable through `membership.reason`, `context`/`contexts`,
  `coverage_note` and the checker's WARN/RED lines. The scanner hits are a feature slug. Presence recognized.
- **migrations:** see G3 above; The scanner found no vocabulary, and the judgment finding stands.
- **testability, Layer 1:** a verification approach is present (`## Tests to write`). Adequacy concerns are above.

## Summary

The plan's core rule survives interrogation: it was prototyped on real transcripts and separates every contaminated
set measured. The two concerns worth acting on before the build are:

- **G2**, a fail-open read of `isSidechain` under format drift, closed by requiring explicit values plus
  record/file agreement;
- **G1**, an overclaim in the audit about the mention-only residual.

G3–G5 are gaps in what the contract and tests must say or pin, and G5 coincides with the orchestrator's R1. The
remaining findings are minor.

**ADVISORY VERDICT: 8 concerns raised (0 blocking-severity, 5 important, 3 minor) — for the human to weigh before
/pharn-dev-build.** This covers the interrogation only. The Step 1b lessons verdict above is a separate floor result
and is not in this tally.
