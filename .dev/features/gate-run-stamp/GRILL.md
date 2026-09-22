# GRILL — gate-run-stamp

**Plan under interrogation:** `.dev/features/gate-run-stamp/PLAN.md` (approved at GATE 1, Option B — the
brief's D1–D9 in full). Treated as `trust: untrusted` throughout: its prose is quoted as DATA, and its
self-claims are tested, not believed.

**Spec-hash check (content-hash, surfaced not blocking):** **MATCH.**
`sha256(pharn/ARCHITECTURE.md)` = `31450bf51abb80ee68b95a67b4b9728284efeace82ae5ca78be1f67b21b72134`, equal
to the plan's pinned `spec_content_hash`. No drift finding. (`/pharn-dev-build` is where drift blocks.)

**Step 1b — `applied_lessons` re-verification (FLOOR, the one deterministic stop):** **GREEN**, exit 0.
All 24 cited ids resolve in `.dev/memory-bank/lessons-learned.md` and are referenced in the plan body.
Reported here as its own floor verdict and deliberately **not** folded into the concern counts below —
a deterministic stop and a model-authored concern must not share a tally. **Bound (P0):** this covers the
**declaration**; it says nothing about whether the lessons were genuinely applied.

**Griller membership (FLOOR, `count-grillers.mjs`):** 13 registered. Deterministic sub-checks run over the
plan: `scan-plan-i18n` `{"found":false}`, `scan-plan-pii` `{"found":false}`, `scan-plan-secrets`
`{"found":false}`, `scan-plan-migrations` 1 incidental hit (`:243` "revert", describing git history — not a
planned migration; no finding), `scan-plan-observability` 5 hits on "logging" (the runner's gate logs — see
R9).

---

## Findings

### Axis: guarantee-audit completeness (P0)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: ".dev/features/gate-run-stamp/PLAN.md:157"
  problem: "The plan treats build-completeness as an injected GATE ENTRY while the existing verdict core treats it as a SEPARATE input, and collapsing the two silently destroys the INCOMPLETE verdict that two downstream consumers branch on."
  evidence: "fixed argv in the injected `aux.completeness` entry. The plan never names a gate, never supplies argv, and cannot widen the set"
```

**Why this is the sharpest finding in the set.** `check-verify.mjs:37-45` is explicit that `--complete` is
**not** an entry in the results map, and that "an INCOMPLETE verdict cannot arise without the flag". The
verdict precedence there is ordered: any red gate → `FAIL` (exit 1); else incomplete → `INCOMPLETE` (exit
**3**). If completeness is recorded in `runs[]` and folded into the `gates` map, an incomplete build becomes
a **red gate**, so the verdict is `FAIL` and `INCOMPLETE` becomes unreachable. Two live consumers break:

- `pharn-ship.md:315-321` — Step 2b's single bounded rebuild is "**only** reachable from a step-6
  `.verdict == "INCOMPLETE"`". It would never fire again.
- `check-loop.mjs:43,79` — `VERIFY_VERDICTS` includes `INCOMPLETE` and `measurableRed` is
  `v ∈ {FAIL, INCOMPLETE}` → CONTINUE. A FAIL still continues, so the loop degrades quietly rather than
  loudly — which is worse, because the distinction it was given in order to retry the right thing is gone.

The brief is genuinely ambiguous here and the plan inherited the ambiguity instead of resolving it: the
"Interface for PR 2" list puts `aux.completeness` under `aux`, a **sibling of** `runs[]`, while D3 introduces
it as one of "two entries the runner injects itself" and folds it under the `set ⊇ source` coverage rule.
**Resolve before build:** completeness is captured by the runner (so its exit code is not model-typed) but
must stay **outside** `runs[]` and outside the `gates` map, surfacing to `check-verify.mjs` on the existing
`--complete` path. `reconcile` is the opposite case and is correctly a gate — it already is one today
(`pharn-verify.md:234-235`).

### Axis: documentation / doc-drift the increment creates (P6)

```yaml
- type: FINDING
  rule_id: "P6"
  severity: blocking
  file: ".dev/features/gate-run-stamp/PLAN.md:92"
  problem: "Adding an eleventh contract makes pharn/ARCHITECTURE.md's by-name contract enumeration stale, and that file is human-only, so this increment structurally cannot repair the drift it causes and the plan never mentions it."
  evidence: "- `README.md` — the `CURRENT-STATE` region regenerated, **never hand-edited** — layer repo-meta"
```

`pharn/ARCHITECTURE.md:131-133` lists the contracts by name — "finding-shape (incl. severity enum),
eval-format, seam-config, loop-record, ship-briefing, ship-record, cost-ledger, reconciliation-record,
regression-report, verify-report." `gate-run-record` makes that a stale enumeration of ten. The plan handles
the README (generated, regenerates cleanly) and misses the trusted doc entirely. The agent cannot edit it —
`protect-trusted-paths.cjs` denies at exit 2 — so the remedy is the **human-patch precedent the brief itself
names**: a `.dev/features/gate-run-stamp/architecture-patch/APPLY.md` carrying the proposed text, applied by
a human. This is exactly **L50**'s shape (sweep the cites of the referent that moved, not the claim's
spellings) and the plan's own L50 body line did not reach it. Also worth checking at build time, not
assumed: whether `.dev/floor/specified-primitives.json` needs a `named_artifacts` entry for the new contract.

### Axis: one axis of change (P3)

```yaml
- type: FINDING
  rule_id: "P3"
  severity: important
  file: ".dev/features/gate-run-stamp/PLAN.md:70"
  problem: "gate-run-core.mjs is declared as holding at least four independently-changing concerns, which is the same split the brief's own cited precedent was created to make."
  evidence: "pure spec/stamp grammar, `--gates` grammar, coverage rules, the closed `reason_code` set, ALLOWLIST + STYLE_SET"
```

These change for different reasons: the `--gates` grammar changes when the CLI surface changes; the coverage
rules change when the gate vocabulary changes; stamp validation changes when `gate-run-record.md` changes.
The brief cites `ship-outcome-core.mjs` as its P3 precedent, and that module exists **because** the same
argument was made one increment earlier — "render-cost-ledger changes when the ledger SCHEMA changes, this
changes when /pharn-ship's CONTROL FLOW changes — two reasons, two files". The plan should either split
(stamp grammar/validation vs. set-resolution/coverage) or state the single axis explicitly and defend it.

### Axis: eval coverage and non-vacuity (P1, `eval-format.md` — cited, not restated)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/gate-run-stamp/PLAN.md:141"
  problem: "The between-gates content-hash claim is non-vacuous only if the exclusion sets are correct, and no named test proves end-to-end that a gate mutating a tracked file actually moves the fingerprint."
  evidence: '"No edit happened between gate runs" → **floor: content-hash** (`fp_before`/`fp_after` equality across'
```

The fingerprint excludes `.pharn/` and the feature-artifact set. An over-broad exclusion makes
`fp_before == fp_after` **always**, and the guarantee degrades to a tautology while every unit test stays
green — **L34**'s vacuous-pass shape aimed at the increment's own headline claim. The plan's unit list
("stable across runs; changes on an edit, an add, a delete") exercises the fingerprint **function**; the
runner's `runs[]` path needs its own **mutation control**: a fixture gate that writes a tracked,
non-ignored file must produce `fp_after != fp_before` and `mutated: true` through `run --next`, not through a
direct call to the hashing module. `:126` names "records a self-mutating gate", which is the adjacent
assertion, not this one.

```yaml
- type: FINDING
  rule_id: "P1"
  severity: important
  file: ".dev/features/gate-run-stamp/PLAN.md:115"
  problem: "The structural extra is constrained to a fixed argv containing an <actual> operand whose derivation rule the plan never states, so the one gate that is feature-specific is the one left undefined."
  evidence: "No `role:`-bearing capability is added, so P1's capability-eval obligation does not attach."
```

`--extra` may only add `structural:<expected>` entries "whose argv is exactly
`node pharn/floor/check-structural.mjs <expected> <actual> .`" — but `<actual>` is not derivable from
`<expected>` by any rule the plan gives. Today `pharn-verify.md:199-215` pairs each
`<capDir>/evals/expected/*.json` with that capability's colocated `<capDir>/findings.json`, per
`finding-shape.md`'s emission contract. If the model supplies `<actual>` free-form, the increment has moved
the gate's _keys_ into code while leaving a model-typed _operand_ inside the one gate that is
feature-specific — which is the axis this increment exists to close. Either the runner derives `<actual>`
from `<expected>` by the colocation rule, or `--extra` carries both and validates them.

### Axis: determinism (P5)

```yaml
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".dev/features/gate-run-stamp/PLAN.md:173"
  problem: "The plan describes the empty-gate-set route as the existing no-gates HALT, but under /pharn-loop there is no human and S4 is an unattended stop, so one sentence covers two structurally different terminal behaviours."
  evidence: "`init` exit 3 routes to the **existing** no-gates HALT (loop S4, `pharn-loop.md:176`), never to a guessed gate set."
```

`pharn-verify.md:186-188` / `pharn-regress.md:222-223` HALT and ask a human; `pharn-loop.md:176` S4 records
`stop: blocked: no-gates` with nobody to ask. Both are correct fail-closed behaviours and neither is a
guess, so the substance holds — but the audit line should name both, because "HALT and ask" asserted of the
unattended path is the kind of sentence that later reads as a guarantee nobody can honour.

### Axis: honest scope / no speculation (P7)

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/gate-run-stamp/PLAN.md:191"
  problem: "The mitigation offered for the accepted size risk is a test-authoring rule, which does not address the failure mode the cited lesson actually records."
  evidence: "names the SET it ranges over (L52), because increment size is precisely what makes a one-member test read as"
```

L52's measured failure is a plan making a **true statement about the wrong file** inside a large increment —
found by a review lens reading the diff against the plan's own sentence, after a 2240/2240 green suite. A
set-naming convention for test rules does not reach that. A structural mitigation would: a declared **build
order** with `node pharn/floor/validate.mjs .` and `npm test` run at named checkpoints (core+contract → the
fingerprint module → the runner → the checker flags → the commands), so a mid-increment red is attributed to
a known slice instead of surfacing at the end across 23 files. The plan names no build order at all.

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/gate-run-stamp/PLAN.md:56"
  problem: "The L46 body line promises a per-deferral status-and-trigger record, but the GATE-1 widening to Option B removed nearly every deferral, leaving the declaration describing a plan shape that no longer exists."
  evidence: "each deferred piece's **status and trigger** below, so a reader can tell a shipped remedy from a sentence."
```

Only `MIN_CLI` and PR 2 / PR 3 remain deferred. The line is not false, but it now over-describes what the
plan does — and L46 is precisely the lesson about canon entries that read as handled while their remedy is
still a sentence. Either narrow the line to the two surviving deferrals or drop the citation.

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/gate-run-stamp/PLAN.md:126"
  problem: "The runner writes unbounded per-gate stdout and stderr logs under the state root with no stated size bound, retention rule, or cleanup owner."
  evidence: "self-mutating gate, writes atomically, and **never** writes a `results.json` (L35)."
```

Raised by the `observability` griller's five "logging" hits. The plan's own test list contemplates "5 MiB of
stdout survives"; across ~10 gates, two sides for regress, and up to `--max-iter` iterations, that is a
plausible multi-hundred-MiB accumulation in `.pharn/`. CLAUDE.md's `.pharn/` convention says scratch belongs
under `.pharn/<command>/` and is cleared by removing those directories — the plan should say the logs follow
it and that `init`'s recreate-`<out>` is what bounds growth per stage, or say plainly that growth is
unbounded across iterations.

---

## Summary (prose)

The plan is unusually well-grounded on the axes this stage most often finds empty: the guarantee audit
reduces each claim to a named primitive or labels it advisory, the trust audit tracks taint through the
gate logs by fd and keeps free text out of every verdict, and the determinism audit enumerates the new
membership tests. The measured items (the fingerprint timing, the 21-vs-21 setter parse, the seven report
consumers read individually) are real reads from this run rather than recalled facts.

Two findings are worth stopping on before code is written, and both are **design collisions with live
behaviour rather than omissions of prose**. R1 is the important one: the brief's `aux.completeness` is
ambiguous between an `aux` sibling and an injected gate, and the plan carried that ambiguity forward
unresolved. Resolving it wrongly does not fail loudly — it removes the `INCOMPLETE` verdict, and both
consumers that depend on it degrade into something that still looks like it is working. R2 is a drift the
increment **creates** and cannot itself repair, because the stale enumeration lives in a human-only file;
it needs the APPLY.md route, and the plan's L50 line claimed a referent-first sweep that did not reach it.

The remaining seven are ordinary plan-hardening: one genuine P3 question about the core module's axis count,
one non-vacuity control the headline claim needs, one undefined operand in the structural extra, and four
minor honesty/scope corrections. None of them, and none of the two above, blocks anything — see the verdict.

The interrogation did **not** attempt to re-litigate the GATE-1 scope decision. The sizing evidence is in the
plan, the maintainer read it and chose Option B, and P5's terminal fallback was honoured; R7 only observes
that the mitigation recorded alongside that decision does not match the risk it names.

---

## Verdict

**ADVISORY VERDICT: 9 concerns raised (2 blocking-severity, 7 advisory) — for the human to weigh before
`/pharn-dev-build`.**

This verdict covers the **interrogation only**, and it is model judgment throughout: the severities are
assigned by me and are advisory (fix #3), and nothing in this file gates `/pharn-dev-build`. The Step 1b
lessons-declaration result is a separate floor verdict reported in the header and is not part of these
counts. This is **not** "the plan passed" and **not** a statement that the plan is sound (P0) — it is a list
of the concerns one adversarial reading surfaced, and the deterministic backstops remain exactly where they
were: `/pharn-dev-build`'s spec-hash and open-questions gates, and `pharn/floor/validate.mjs`.
