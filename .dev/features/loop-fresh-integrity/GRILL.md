# GRILL — loop-fresh-integrity

Plan: `.dev/features/loop-fresh-integrity/PLAN.md` (approved at GATE 1 by the orchestrator under the user's delegation,
2026-09-25 — a delegated model decision, never a human approval; three corrections applied to the plan before this
grill). Spec-hash check: `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md` = `4950796f…d2dc1c7f` **equals** the
pin. **Step 1b lessons-declaration verdict (FLOOR): GREEN** (`check-plan-lessons.mjs` exit 0, 8 ids, each referenced
in the body). That covers the DECLARATION only — never that the lessons were applied.

Method: the inline Step-2 axes; the 13 registered grillers (`count-grillers.mjs`: registered 13) applied inline, with
the five deterministic plan scanners run as their Layer 1; and one independent read-only agent that probed the plan's
claims against the live code (read-only commands and temp-dir probes only). The plan is `trust: untrusted` here: no
instruction-looking content was found in it.

## Scanner layer (FLOOR presence data, advisory reading)

- `scan-plan-secrets.mjs` → `{"found":false,"hits":[]}`; `scan-plan-pii.mjs` → `{"found":false,"hits":[]}`;
  `scan-plan-i18n.mjs` → `{"found":false,"hits":[]}`; `scan-plan-migrations.mjs` → `{"mentions":false,"hits":[]}`.
- `scan-plan-observability.mjs` → `{"mentions":true,"hits":[{"line":130,"term":"tracing"}]}` — incidental (the line
  says a crash's trace tail stays visible in check-test-stage's indented child lines). Read below.

## Findings — inline axes and grillers

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/loop-fresh-integrity/PLAN.md:121"
  problem: "The crash rule covers check-test-stage's DIRECT children only; a checker a child itself shells (check-ac-tests shells check-plan-spec-agree for the pin) is read by that child as its own RED, so a crash one level further down still reaches check I as a RED, and the plan does not state that bound."
  evidence: "`run()` also records whether the child's STDOUT carries a line starting `RED —`"
- type: FINDING
  rule_id: "P3"
  severity: important
  file: ".dev/features/loop-fresh-integrity/PLAN.md:82"
  problem: "stampDerivedMismatch restates check-verify's verdict precedence as a relation inside check-loop-fresh — a second statement of another checker's decision table, and group C is changing that table right now; four hand-written unit cases pin today's two readings but nothing re-checks the relation against the REAL check-verify output."
  evidence: "check-verify's composition, restated as a relation: failing_gates = the gate offenders ∪ AC ids; FAIL iff failing_gates is non-empty"
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/features/loop-fresh-integrity/PLAN.md:60"
  problem: "The L50 referent sweep misses two shipped sentences in pharn-loop.md's guarantee audit that describe E's re-derivation mode ('re-derives the report WITH that flag and compares its ac_gate block'; 'requires the report's failing_gates to equal what check-verify.mjs computes') — their conclusions stay true, their premises become exact only over an unmoved tree."
  evidence: "audit bullet (restored true by fix 1 — no edit)"
- type: FINDING
  rule_id: "P1"
  severity: important
  file: ".dev/features/loop-fresh-integrity/PLAN.md:177"
  problem: "The planned ★ WIRING crash test cannot use a load-time failure of a lock-child module: check-loop-fresh itself imports test-infra-core.mjs, and after this change imports ac-gate-core.mjs (which imports ac-tests-lock.mjs), so a load-time throw would crash check-loop-fresh before check I runs — the test needs a RUNTIME-only throw in ac-tests-lock's --check CLI path."
  evidence: "★ WIRING (check-loop-fresh): the pinned decision line over a lock-child crash → `front-stage-red`"
- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".dev/features/loop-fresh-integrity/PLAN.md:79"
  problem: "Importing ac-gate-core.mjs widens check-loop-fresh's own static import graph (ac-tests-lock, red-run-core, test-results-core, spec-template-core, …); a module in it that cannot load makes check-loop-fresh exit with node's 1 — its own RERUN code — with no JSON, which /pharn-loop's exit-1 branch cannot read. Pre-existing (it already imports test-infra-core.mjs), widened here, and not stated."
  evidence: "export const AC_FAILING_IDS = Object.freeze(Object.values(FAILING_IDS).sort()); // from ./ac-gate-core.mjs"
```

Grillers with no finding, each for a stated reason (a griller emits nothing it cannot name):

- **architecture (P3)** — fit recognized: both fixes stay inside the modules that own the defects; the one new import
  is a constant from a same-layer floor module (check-verify.mjs imports the same module), not a leaf→leaf reach
  across capability roots. The coupling concern it raises is filed above under P3.
- **comprehension (P7)** — rationale recognized: the plan names WHY only the AC part may defer (the AC gate reads the
  live tree) and WHY a spoofed RED line is harmless (it can only restore the pre-fix RED).
- **coupling (P3)** — the one entanglement (a restated precedence) is the P3 finding above.
- **documentation (P7)** — present and adequate: every exit-code and comparison change is carried into the module
  headers, both contracts and CLAUDE.md.
- **error-handling (P7)** — the change IS error handling (a crash is now named, not misfiled); its two gaps are the
  P0 (nested child) and P5 (own load failure) findings above.
- **observability (P6)** — the scanner's one mention is incidental, but the plan's crash path is observable where
  it matters: check-test-stage prints `UNUSABLE —` with the child's trace tail indented, and check I's `reason` names
  the token. No absence finding.
- **performance (P7)** — no scaling risk: E still spawns one check-verify per run; check-test-stage adds one regex
  over a child's stdout.
- **privacy (P2)**, **security (P2)** — scanners clean; the child's stderr tail was already printed before this change
  (no new exposure); no finding.
- **testability (P1)** — presence recognized (a per-fix test plan with named members); the Layer-2 gaps are the P1
  and P3 findings above.
- **a11y**, **i18n** (`applies: ssr, spa`), **migrations** (`applies: backend, ssr`) — this repo declares no
  archetype, so all three ran; no UI, no user-facing string, no schema or data migration; scanners clean.

## Findings — independent agent

The reader was cut off once by a usage limit and resumed; its report reached the orchestrator, which relayed it here.
Its headline: **the moved-tree relation held — 0 violations of rules (1)–(3) across 18 real check-verify runs, with
and without `--ac-gate`** — so no honest report over a moved tree is misread as a mismatch. Its findings, as reported
(file:line cites are the reader's, into the live tree at 137abd3):

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "pharn/floor/check-ac-tests.mjs:275"
  problem: "A crash one level further down still reads as a RED: check-ac-tests turns ANY non-zero exit of check-plan-spec-agree.mjs into a `pin` finding printed `RED — pin: …`, and ac-tests-lock.mjs does the same with check-spec-approved.mjs (bootstrap only). check I runs both checkers itself first, so a LOAD-time crash is already front-stage-red, but an input-dependent crash over AC-TESTS.md is not caught first."
  evidence: 'if (chain.status !== 0) { findings.unshift({ kind: "pin", … }) }'
- type: FINDING
  rule_id: "P5"
  severity: important
  file: "pharn/floor/check-loop-fresh.mjs:114"
  problem: "The crash the review cites cannot reach check I: check-loop-fresh already imports test-infra-core.mjs, so a load-time throw there makes check-loop-fresh itself exit 1 (its RERUN code) with 0 bytes of stdout; importing ac-gate-core.mjs would add ac-gate-core, ac-tests-lock, frontmatter-core, red-run-core and spec-template-core to that graph. Prefer the two ids from a light module, or state and pin the bound; the ★ WIRING crash must be a RUN-TIME throw."
  evidence: 'import { sha256RegularFile } from "./test-infra-core.mjs";'
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: "pharn/pharn-contracts/verify-report.md:270"
  problem: "The doc sweep misses two more shipped sentences that say E always re-derives WITH --ac-gate: verify-report.md:270 and .claude/commands/pharn-verify.md:531, on top of pharn-loop.md:785/:792."
  evidence: "re-derives the report WITH `--ac-gate` and requires"
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: "pharn/floor/check-test-stage.mjs:88"
  problem: "run() merges stdout and stderr and keeps only the last 20 lines; the RED-line test must run over the FULL child stdout, line by line, or stderr can push the summary out or a stderr line could match."
  evidence: "const lines = `${r.stdout ?? \"\"}${r.stderr ?? \"\"}`.split(\"\\n\")"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/gate-run-core.mjs:603"
  problem: "validateStamp does not refuse reserved ids in runs[] (only the writer side does), so a hand-made stamp with a gate named `ac-delivery` would make an honest report read as a mismatch — fail-closed; state it or guard it."
  evidence: "the refusals exist only on the writer side (:267, :446)"
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/features/loop-fresh-integrity/PLAN.md:127"
  problem: "The plan's example of a deliberate child exit 2 is wrong: full-mode check-ac-tests reads only AC-TESTS.md/SPEC.md/PLAN.md, so its exit 2 is one of those reads failing, or bad usage — never 'an unreadable file the mapping names'."
  evidence: "an unreadable file the mapping names"
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: ".dev/features/loop-fresh-integrity/PLAN.md:82"
  problem: "Rule (3) ('any AC id present → FAIL') is right only if group C's INCOMPLETE carries failing_gates [] — which its approved plan does; keep the compat tests for both precedences."
  evidence: "FAIL iff failing_gates is non-empty"
```

Confirmed by the reader: no early output differs between the two check-verify runs; check C matches check-verify's
stamp validation; `--spec` never exits 1; every deliberate exit 1 in both children prints `RED —` first; check I
needs no code change; all three commands refuse on exit 2; no trusted doc is falsified; `FLOOR_MODULES` stays
complete; `[Unreleased]` is empty, `SKILLS_VERSION` 6.20.3, `MIN_CLI` 0.5.0.

## Dispositions (folded into the plan's `## Amended after grill`)

- **Nested-child crash (inline P0 + reader R1)** — STATED, not fixed: the precise residual is an input-dependent crash
  of `check-plan-spec-agree.mjs` over AC-TESTS.md (check-ac-tests' pin check), which still reads as `RED mapping-red`.
  A load-time crash of either grandchild, and any crash over SPEC.md/PLAN.md, is caught first by check I's own runs of
  the same checkers (front-stage-red). Mapping a grandchild crash to unusable would change what check-ac-tests' exit 2
  means to check-test-stage — a protocol change beyond this increment. Named follow-up `nested-child-crash`.
- **Import weight (inline P5 + reader R2)** — ADOPTED the reader's preference: the two AC ids come from
  `gate-run-core.mjs`, which check-loop-fresh already loads, by naming the AC half of the existing `RESERVED_IDS`
  literal (`AC_RESERVED_IDS`) — a split of one store, not a new one — with a ✧ pin that it equals `ac-gate-core.mjs`
  `FAILING_IDS`. check-loop-fresh's import graph does not grow. Its own load failure (exit 1, the RERUN code, no JSON)
  is pre-existing, stated in its header, and named follow-up `loop-fresh-load-crash`.
- **Restated precedence (inline P3 + reader R7)** — ADOPTED: a differential test runs the REAL check-verify with and
  without `--ac-gate` over an enumerated set of honest worlds and requires the relation to hold for each, plus the
  four merge-order unit pins from GATE 1.
- **Doc sweep (inline P6 + reader R3)** — ADOPTED: `pharn-loop.md` (two sentences), `pharn-verify.md:531` and
  `verify-report.md:270` join `## Files`.
- **RED-line test (R4)** — ADOPTED: over the child's full stdout, line-anchored, never the merged/truncated lines.
- **Reserved id as a gate (R5)** — STATED: such a stamp can only be hand-made, and the outcome is a STOP (fail-closed).
- **Exit-2 example (R6)** — CORRECTED in the plan and in check-test-stage's `mapping-red` detail string.
- **Runtime-only wiring crash (inline P1 + R2)** — ADOPTED.

## Prose summary

The plan's two designs hold: the reader measured the moved-tree relation against the real check-verify and found no
honest report it would misread. The concerns were about BOUNDS and PROOF. Fix 2's crash rule is exact for
check-test-stage's own children, and one level further down it is exact except for one narrow case, now stated. Fix
1's relation is a second statement of check-verify's precedence at the moment that precedence changes, so it is now
proved against the real checker by a differential test rather than asserted. The AC ids come from a module the checker
already loads, so the fix does not widen the crash surface it sits beside. Four shipped sentences join the sweep.

## Verdict

ADVISORY VERDICT: 12 concerns raised (0 blocking-severity, 6 important, 6 minor — 5 from the inline axes and 7 from
the independent reader), all dispositioned above — for the human to weigh before /pharn-dev-build. The Step 1b floor
verdict (GREEN) is reported in the header and is not part of this tally.
