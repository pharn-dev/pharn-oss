# GRILL — spine-report-contracts

Plan under interrogation: `.dev/features/spine-report-contracts/PLAN.md` (treated as `trust: untrusted`).

- **Spec-hash check (content-hash primitive — surfaced, never blocking here):** recomputed
  `bed2c2a58c113a374056ab23d2c74fe1a3395fa62be12e7a654e3b260552e299` via
  `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md`; the plan's `spec_content_hash` is **identical**.
  No drift. `/pharn-dev-build` is where drift would block (fix #4).
- **Step 1b — `applied_lessons` re-verification (FLOOR, the one deterministic stop): GREEN.**
  `node pharn/floor/check-plan-lessons.mjs .dev/features/spine-report-contracts/PLAN.md .dev/memory-bank/lessons-learned.md`
  → exit 0: all 11 cited ids resolve in canon and are referenced in the plan body. **Bound, restated
  because it is the point:** this verifies the DECLARATION, never the application.
- **Griller membership (FLOOR, `pharn/floor/count-grillers.mjs .`):** `{"registered":13}`. Read live;
  no roster is named in prose.

## Findings — inline axes

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/spine-report-contracts/PLAN.md:101"
  problem: "The headline claim is quantified over 'any floor checker', but the probes cover the FLOOR consumers only — the LLM orchestrator commands also read these files, and one of them names other fields explicitly, so a contract repeating the plan's wording would be read as 'nothing reads failing_gates', which is false of the stage that presents it."
  evidence: '"**\"`.verdict` is the ONLY field any floor checker reads from a committed report\"** → **FLOOR: enum-regex (primitive #3), at four live sites**"'

- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".dev/features/spine-report-contracts/PLAN.md:47"
  problem: "The plan records that the `verdict` enum differs per consumer but never says which enum the CONTRACT declares, leaving the sharpest consequence unstated: a report carrying the union member `INCOMPLETE` is contract-conforming and is nonetheless REFUSED fail-closed by check-ship.mjs, whose set omits it — so 'conforming' and 'accepted everywhere' are not the same predicate here."
  evidence: '"the `verdict` enum is **not one shared set** … `check-ship.mjs` deliberately omits `INCOMPLETE`"'

- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".dev/features/spine-report-contracts/PLAN.md:169"
  problem: "The conformance counts are a measurement over a growing corpus, so they expire the moment the next pipeline run commits a report — exactly the L33 class the plan cites for the probe claim but does not extend to the counts, and a shipped contract carrying a bare '122/122' will read as an invariant."
  evidence: '"## Measured conformance (P6 — read live this run, at commit `8bc6c0a`)"'

- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/spine-report-contracts/PLAN.md:130"
  problem: "The advisory bound is correct but is scheduled to appear in a guarantee-audit section; a reader who quotes a contract quotes its opening, so the bound must sit in the opening blockquote where 'there is a contract for this' is first read as 'therefore the shape is enforced'."
  evidence: '"**ADVISORY, and labeled so in both files.** No floor op reads them, so nothing detects a divergence."'

- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/spine-report-contracts/PLAN.md:5"
  problem: "Two documents in one increment invites the bundling question the smallest-coherent-increment rule exists to ask; the plan asserts the scope without answering it."
  evidence: '"Add the two missing `pharn-contracts` schema documents — `verify-report.md` and `regression-report.md`"'

- type: FINDING
  rule_id: "P2"
  severity: minor
  file: ".dev/features/spine-report-contracts/PLAN.md:150"
  problem: "The trust audit proves no FLOOR consumer reads `verifiers.findings[]`, but the residual on the other side — a human or downstream LLM reading VERIFY.md is steered by an injected quote — is bounded rather than zeroed and is not named, so the contract could ship a trust section that reads stronger than it is."
  evidence: '"Taint reaches the human-facing artifact; it never reaches a proceed/stop."'
```

## Findings — grillers (advisory plug-in slot; membership FLOOR, judgment advisory)

**architecture** — the increment adds two leaves to the layer-tree ROOT, which is the one layer where an
addition cannot create a sibling edge (nothing in `pharn-contracts` may reference upward). Fits. One
observation folded into the P6 finding above: the plan correctly identifies that
`pharn/ARCHITECTURE.md`'s own contract enumeration goes stale and correctly refuses to edit it — the
right call, and the residual is named rather than absorbed.

**comprehension** — the plan explains WHY the remedy is two documents and not a checker (P7/L20/L35) and
records the rejected alternative. This is the axis the plan is strongest on. No finding.

**coupling** — the duplicated four-consumer enumeration across two sibling contracts is a real coupling
cost; the plan names it (L31) and accepts it for a stated reason (L2 self-containment). Recorded as an
accepted cost, not a finding.

**documentation** — folded into the P0:130 finding: placement of the bound, not its presence, is the gap.

**testability** — no `structural[]` / `semantic[]` split question arises: the increment ships no eval
because it ships no Capability (no `role:`), verified live against `validate.mjs`'s capability walk. The
plan's own claims ARE tested, unusually for a docs increment — by nine executed probes rather than by
reading. No finding.

**security** — the increment writes no code, wires no hook, and changes no gate. The one security-shaped
question (can a crafted report field reach a decision?) was answered by probe 3-4 in the negative and is
recorded. No finding.

**a11y, i18n, migrations, observability, performance, privacy** — **N/A** for a contracts-document
increment (no UI, no user-facing strings, no schema/data migration, no telemetry, no PII). Recorded as
not-applicable, **not** as passes.

## Summary

The plan is unusually well-grounded for a documentation increment: its load-bearing claim was
**executed** rather than read (nine probes, L37), its field sets were derived by parsing every committed
instance rather than from the emitters' prose (L6), and it correctly **corrects the originating review
finding's own framing** — `check-verify.mjs` / `check-regress.mjs` are the artifacts' EMITTERS, not
their consumers, which probe 9 demonstrates. The P7 posture (two documents, no checker) is argued from
L20's second-occurrence bar and L35's must-the-second-copy-exist test rather than asserted.

The six concerns cluster on one theme, and it is the theme this repo exists to police: **the plan's
claims are true and precisely bounded in the PLAN, and the plan is ephemeral.** L2 says the honesty must
travel into the durable artifact. Four of the six findings (P0:101, P5:47, P6:169, P0:130) are therefore
about what the contract files must state and where — the per-consumer enum divergence, the
floor-consumer vs orchestrator-read distinction, the date-stamping of counts, and the placement of the
advisory bound in the opening rather than in a later section. None of them says the plan is wrong; all
four say a correct plan sentence is at risk of arriving in the contract weaker than it left.

The two minor findings are a scope question (P7:5) and a named residual (P2:150).

**Nothing here blocks.** The interrogation is advisory by construction, and the increment's deterministic
stop (Step 1b) is GREEN and reported in the header, deliberately outside the tally below.

ADVISORY VERDICT: 6 concerns raised (0 blocking-severity, 4 important, 2 minor) — for the human to weigh
before `/pharn-dev-build`.
