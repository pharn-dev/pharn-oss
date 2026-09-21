# GRILL — loop-cost-ledger

**Plan:** `.dev/features/loop-cost-ledger/PLAN.md` · **Spec-hash check:** MATCH
(`b91d773c…a045d` recomputed == the plan's `spec_content_hash`; no drift) · **Step 1b lessons
re-verification (FLOOR):** **GREEN** — exit 0, all 20 cited ids resolve in
`.dev/memory-bank/lessons-learned.md` and are referenced in the plan body.

> **Trust (P2).** The `PLAN.md` is `trust: untrusted` to this stage. Every `problem` / `evidence`
> below quotes it as **DATA**, never as an instruction. No instruction-looking content was found in
> the plan; nothing in it attempted to steer this stage.

**Deterministic pre-checks run (all clean):** `scan-plan-i18n`, `scan-plan-migrations`,
`scan-plan-observability`, `scan-plan-pii`, `scan-plan-secrets` — each `found/mentions: false`.
**Registered grillers:** 13 (`count-grillers.mjs`, read live — not recalled).

---

## Findings

### Axis: honest scope / artifact cost (P7, P0)

```yaml
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/loop-cost-ledger/PLAN.md:223"
  problem: "The plan never states how large cost.json is, and measurement puts it at ~393 KiB of committed JSON for a single 65-minute, one-iteration run — a per-feature repo cost nobody has weighed."
  evidence: '"`requests[]`, one per deduped `requestId`: … `usage` copied verbatim" — measured over the loop-decision-integrity transcript: 275 deduped rows → 402,567 bytes pretty-printed (393.1 KiB), 258.3 KiB minified.'
```

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/loop-cost-ledger/PLAN.md:294"
  problem: "Decision D1 (recurse into usage.iterations[]) is the single largest contributor to that size, and the plan records the decision without recording its measured cost."
  evidence: '"**D1 — `usage.iterations[]` → RECURSE.** Array elements are walked like object values" — the verbatim `usage` copy is 263 KiB of the 393 KiB total (67%), and `iterations[]` duplicates the top-level numbers exactly, so it is redundant bytes by construction.'
```

### Axis: testability / fixture convention (P1, P6)

```yaml
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".dev/features/loop-cost-ledger/PLAN.md:135"
  problem: "The plan introduces committed fixture files under pharn/floor/fixtures/, a directory that does not exist in either floor and a convention with no precedent — every existing floor test builds its transcripts hermetically in a temp dir."
  evidence: '"`pharn/floor/fixtures/cost-ledger/single-session.jsonl` — NEW (**D2**)" — verified live: `ls -d pharn/floor/fixtures .dev/floor/fixtures` → neither exists, and `render-cost-record.test.mjs` builds every fixture with `mkdtempSync(join(tmpdir(), "cost-record-"))` + `writeFileSync`.'
```

```yaml
- type: FINDING
  rule_id: "P2"
  severity: blocking
  file: ".dev/features/loop-cost-ledger/PLAN.md:137"
  problem: "The second fixture is derived from a real transcript and committed to a public Apache-2.0 repo, yet the plan's own no-absolute-path floor rule covers cost.json only — nothing checks the committed fixture, so a stray cwd/gitBranch/home path in it ships unguarded."
  evidence: '"A second fixture derived from a real sidechain-bearing transcript … `usage` + ids only, no message content" — the derivation is described as a property of how it is built, with no checker over the result; `check-cost-ledger.mjs`''s regex runs over a ledger, never over a `.jsonl` fixture.'
```

### Axis: guarantee audit (P0)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/loop-cost-ledger/PLAN.md:223"
  problem: "The determinism claim understates its input set: cost.json embeds markers[] whose ts comes from toISOString() at marker-write time, so identical transcript bytes do NOT reproduce an identical file across runs."
  evidence: '"the same transcript bytes produce the same `cost.json`" → **floor: content-hash**-checkable; the emitter reads no clock" — true of the emitter, but `markers[]` is copied verbatim from a file whose timestamps were written by a different process at a different wall-clock time. This is L37''s shape exactly: the quantifier, not the listed members, is where the claim breaks.'
```

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/loop-cost-ledger/PLAN.md:143"
  problem: "The --verify-transcript mode is specified but has no stated triggering failure; it is justified by a lesson (L43) rather than by an observed defect, which is the P7 bar this repo applies to itself."
  evidence: '"plus a `--verify-transcript` mode — the floor." … "Floor ONLY under `--verify-transcript`, and only while the transcript exists" — no dogfood or eval failure is cited for it.'
```

### Axis: architecture / redundant identity (P3, L35)

```yaml
- type: FINDING
  rule_id: "P3"
  severity: important
  file: ".dev/features/loop-cost-ledger/PLAN.md:122"
  problem: "pharn-cost-ledger/1 is a strict superset of the shipped pharn-cost-record/1, and the plan reuses that file's CODE while creating a second SCHEMA for overlapping data — without answering L35's prior question, must the second copy exist?"
  evidence: '"The `pharn-cost-ledger/1` contract" alongside the live `SCHEMA = "pharn-cost-record/1"` in `render-cost-record.mjs`: both carry coverage, session, window, dedup_key, totals, by_model and a stage view. The plan excludes `render-cost-record.mjs` from scope, so the overlap is locked in rather than resolved.'
```

### Axis: precision of the exemption claim (P6)

```yaml
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/features/loop-cost-ledger/PLAN.md:150"
  problem: "The plan asserts cost.json must join both artifact enumerations to avoid being reported as an escape, without stating when that exemption actually fires — inside /pharn-loop it never does, because regress and verify both run at Step 5, before Step 6 writes the file."
  evidence: '"`pharn/floor/check-regress.mjs` — EDIT. `PIPELINE_ARTIFACTS += \"cost.json\"`." — correct and needed (the LOOP.md precedent is identical), but the firing window is a later run or a separately-invoked regress, not this one.'
```

### Axis: error handling (P5)

```yaml
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".dev/features/loop-cost-ledger/PLAN.md:125"
  problem: "The plan does not say how the emitter treats a torn or malformed markers.jsonl line, although the sibling renderer it reuses explicitly tolerates a torn final transcript line as expected rather than an error."
  evidence: '"Appends one `{seq, kind, stage, iteration, ts, session_id}` record to `.pharn/cost/<name>/markers.jsonl`" — append-only files are torn by an interrupted run, which is precisely the aborted-run case the recovery path exists for.'
```

---

## A hypothesis this grill tested and KILLED

Recorded because a grill that reports only its surviving suspicions overstates its own precision.

L34's text states that five named floor checkers "import Node stdlib only; zero cross-imports between
them", which reads as a floor-wide property and would have made this increment's
`render-cost-ledger.mjs` → `render-cost-record.mjs` import the first breach of it. **Probed rather than
read off (L37): `pharn/floor/` already carries 11 cross-imports**, including
`check-review-assignments.mjs` ← `render-review-assignments.mjs` — the exact checker↔renderer pair this
plan follows. L34's quantifier was scoped to its five files, not the floor. **No finding; the plan's
import is precedented.**

## Summary

The plan is unusually well-grounded: every figure in its Discovery section was re-derived live this run
and each one held — the spec hash matches, the fixture transcript exists, `attributionSkill` really does
collapse the run into one bucket, and every `usage` leaf really is a number or a ≤13-char token. The five
D1–D5 decisions are recorded with their consequences rather than smoothed over, and the plan states its
own coverage boundary (L49) and residual instead of implying uniform verification.

The concerns cluster in two places the plan did not measure.

**The artifact's size is unweighed.** 393 KiB of committed JSON per green loop stop is a real, recurring
repo cost, and decision D1 — recurse into `iterations[]` — is two thirds of it, spent on numbers that
duplicate fields sitting beside them. The plan records D1's fidelity argument and not its price. That is
worth a human's explicit choice, because the decision was taken on a correctness axis alone.

**The committed fixture is the one genuine trust gap.** Everything else in this increment is guarded:
the ledger's absolute-path regex, the closed key set, the leaf-shape rule. The fixture derived from a
real transcript is guarded by none of them — it is `.jsonl` test data, not a ledger — and it lands in a
public repo. The plan's D2 rationale ("usage + ids only, no message content") is a description of intent,
and this repo's own P0 discipline is that an intent is not a check. This is the finding to resolve before
build, and the cheap resolution is to run the same regex over the fixture in its test.

The remaining items are precision rather than soundness: a determinism claim whose input set omits the
markers file, an unresolved L35 question about two overlapping cost schemas, an exemption whose firing
window is unstated, a `--verify-transcript` mode with no triggering failure, and unstated torn-line
handling.

**ADVISORY VERDICT: 9 concerns raised (1 blocking-severity, 5 important, 3 minor) — for the human to
weigh before `/pharn-dev-build`.**

None of the above gates the build. Every finding here rests on this stage's judgment, including the
severities, which are LLM-assigned and advisory (fix #3). The one deterministic result in this run is
the Step 1b lessons re-verification reported in the header, and it is **not** folded into these counts —
it is GREEN, and it certifies the **declaration** only, never that the 20 cited lessons were genuinely
applied.
