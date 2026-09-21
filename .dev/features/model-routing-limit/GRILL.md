# GRILL — model-routing-limit

**Plan:** `.dev/features/model-routing-limit/PLAN.md` · **Spec-hash check:** MATCH
(`83890d9741dd2f63bfe5112a3fcd6d8c49fd3795233eee719e271eba16fd9487` recomputed over
`pharn/ARCHITECTURE.md` via `.dev/floor/hash-doc.mjs` == the plan's pin) · **Step 1b lessons
re-verification (FLOOR — this stage's only deterministic stop):** **GREEN, exit 0** —

> `GREEN — applied_lessons: L1, L25, L26, L35, L37, L43 (.dev/features/model-routing-limit/PLAN.md); all 6 cited id(s) resolve in .dev/memory-bank/lessons-learned.md and are referenced in the plan body. NOTE (P0): that these lessons were GENUINELY applied is advisory — this checker verifies the DECLARATION, never the application; a body line reading "L1: considered." satisfies the reference check.`

**Griller membership (FLOOR, `pharn/floor/count-grillers.mjs .`):** `{"registered":13}` — a11y,
architecture, comprehension, coupling, documentation, error-handling, i18n, migrations, observability,
performance, privacy, security, testability.

**Deterministic plan scanners (the grillers' floor sub-checks), run live:**

| scanner                       | result                                                                    | exit |
| ----------------------------- | ------------------------------------------------------------------------- | ---- |
| `scan-plan-secrets.mjs`       | `{"found":false,"hits":[]}`                                               | 0    |
| `scan-plan-pii.mjs`           | `{"found":false,"hits":[]}`                                               | 0    |
| `scan-plan-i18n.mjs`          | `{"found":false,"hits":[]}`                                               | 0    |
| `scan-plan-migrations.mjs`    | `{"mentions":false,"hits":[]}`                                            | 0    |
| `scan-plan-observability.mjs` | `{"mentions":true,"hits":[79:observability, 81:telemetry, 82:telemetry]}` | 0    |

---

## Findings

### Axis: guarantee-audit completeness (P0)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: ".dev/features/model-routing-limit/PLAN.md:188"
  problem: "The increment mixes two application models, and the two files the AGENT writes are precisely the two that ASSERT the four human-applied patches already landed — so the repo can sit in a state where SKILLS_VERSION and CHANGELOG describe a LIMITS.md section that does not exist, with every gate green."
  evidence: "`CHANGELOG.md` — EDIT. One `[Unreleased]` entry recording the limit, the `6.3.1` bump ... `SKILLS_VERSION` — EDIT, `6.3.0` → `6.3.1` (**OPEN-4, selected: patch**)."

- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/model-routing-limit/PLAN.md:234"
  problem: '"The patch applies cleanly" is reduced to a floor primitive, but `git apply --check` binds the PATCH to the CURRENT bytes — it never binds the APPLIED RESULT to the plan''s intent, and the application is performed by a human outside every gate, so no floor op covers what actually lands.'
  evidence: '"The patch applies cleanly" → **FLOOR: enum/regex-class** (`git apply --check` exit code), verified at build time in this worktree.'

- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/model-routing-limit/PLAN.md:79"
  problem: "The plan's own prose trips the observability scanner (mentions:true at :79/:81/:82) purely by QUOTING LIMITS §5 inside a cancel-branch argument — and because that concern's shape is ABSENCE, a hit SUPPRESSES rather than raises, so a plan that declares no telemetry whatsoever silences the griller by discussing it. This is §5's own stated inverse-polarity weakness, observed live rather than reasoned about."
  evidence: "axis is observability-interrogated-at-plan-time; its `pharn.config.json` mention at `:162` reads ... argue **there is no configured telemetry sink**."
```

### Axis: eval coverage + the structural/semantic split (P1, `eval-format.md`)

```yaml
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: ".dev/features/model-routing-limit/PLAN.md:218"
  problem: "The 'no evals' argument is sound on its own terms (P1 binds role:-bearing Capabilities and this increment authors none), but the verification it substitutes names only `npm run check` — it does not name the two ★live★ tests that are the actual binding gate for the two code-adjacent edits (OPEN-3(ii) header prose, OPEN-3(iv) config key)."
  evidence: "The verification that replaces it is stated in APPLY.md: `git apply --check` for the patch, and `npm run check` run in this worktree after the human applies it"
```

**Grilled ahead of the build rather than left as a question** (the finding stands; this narrows it):
`pharn/floor/check-model-config.test.mjs:426,434` and `.dev/floor/check-config.test.mjs:350` each run
`agreement` over the **real** root `pharn.config.json`. I ran that exact mode against a config carrying
the proposed extra top-level key:

- `check-model-config.mjs agreement --config <patched> --commands-dir .claude/commands` → **GREEN, exit 0**
  (10/10 product stages agree).
- `.dev/floor/check-config.mjs agreement --config <patched> --commands-dir .claude/commands` → **GREEN,
  exit 0** (3/3 wired stages agree).

So OPEN-3(iv) is not expected to red either live test. **Bound (P0):** that is two executions against a
hand-built fixture, not the tests themselves; the build stage must still run `npm test`.

### Axis: honest scope / smallest increment (P7, P3)

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/model-routing-limit/PLAN.md:161"
  problem: "The human selected all four OPEN-3 sub-answers, so a 'documentation only' increment now edits six paths across four surfaces (trusted doc, README, a floor checker's header, the root config) plus two version files — defensible as one axis ('where this one fact is stated'), but it is no longer the smallest coherent increment, and the plan does not argue the bundle."
  evidence: "**OPEN-3 — all four sub-answers selected.** (i) **Drain** `README.md:499-509` ... (iv) **Add** a top-level pointer key to `pharn.config.json`"
```

### Axes with no findings

- **Trust propagation (P2)** — the plan ingests no untrusted artifact; inputs are repo-local
  human-authored files read live, and the probe fixtures are read for **exit codes** only. The audit at
  `:246` states this correctly and does not overclaim.
- **One axis of change / no sibling imports (P3)** — no module file is authored, so no `reads:` entry
  and no leaf→leaf reference exists to cross a sibling root. (The bundling concern is filed under P7
  above, where it belongs.)
- **Determinism (P5)** — every branch in the plan is an exit code or a membership test, and both
  genuinely unresolvable items (turn scope, platform veto) terminate in **attribute to the checker's
  header**, which is P5's ask-the-human fallback rather than a guess. The four OPEN-\* questions were
  put to the human as a form before any build-stage write.
- **a11y, error-handling, i18n, migrations, performance, privacy, security** — no surface. This
  increment authors no UI, no runtime code path, no data handling, no schema change; the four
  corresponding scanners returned `found:false` / `mentions:false` at exit 0.

---

## Summary (advisory)

The plan's trigger demonstration is the strongest part of it and is genuinely repo-settled: a whole-file
search of all 295 lines of `LIMITS.md`, §5 read in full, both cancel branches checked and shown not to
fire, and three executed probes — one of which (F1) found a **false universal quantifier already shipped**
in `check-model-config.mjs:10-11`, which is a real defect surfaced by this increment rather than a
hypothetical. The Layer-1 / Layer-2 discipline is held, and the reclassification of the fresh-install
bullet from Layer 2 to Layer 1 is correctly justified by execution rather than argument.

The concern worth the human's attention before `/pharn-dev-build` is **the split application model**
(finding 1). Four artifacts are staged for a human to apply; two — `SKILLS_VERSION` and `CHANGELOG.md` —
are written by the agent and are exactly the two that _claim the other four landed_. The plan already
knows this class of gap: its own guarantee audit concedes that nothing detects it, citing L43. What it
does not do is resolve it for the **selected** option — it records the window only as the cost of the
**rejected** alternative. Staging all six, or having the build stage write the version files last and
`APPLY.md` carry them as instructions rather than as committed bytes, would close it.

Findings 2 and 4 are wording/completeness narrowings, not blockers. Finding 3 is a dogfood observation
that costs this increment nothing and may be worth a lesson candidate at GATE 2.

**ADVISORY VERDICT: 5 concerns raised (1 blocking-severity, 1 important, 3 minor) — for the human to
weigh before `/pharn-dev-build`.** This verdict covers the **interrogation only**. It is model judgment
and it gates nothing: the severity labels above are advisory assignments (fix #3), not floor verdicts.
The Step 1b floor result is reported in the header as its own verdict and is deliberately **not** folded
into these counts. Nothing here says the plan is good — that is the human's call.
