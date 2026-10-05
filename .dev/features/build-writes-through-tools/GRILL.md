# GRILL — build-writes-through-tools

- **Plan:** `.dev/features/build-writes-through-tools/PLAN.md`, approved at GATE 1 by the batch orchestrator under the
  user's delegation.
- **Spec-hash check:** `d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4` recomputed, equal to the pin.
- **Step 1b, the lessons declaration (FLOOR):** `check-plan-lessons.mjs` exit 0, GREEN. `applied_lessons: L19, L20,
L35, L40, L57`; every cited id resolves and is referenced in the body. This is the declaration only, never the
  application (P0).
- **Grillers:** 13 registered (`count-grillers.mjs`). Each one's procedure was applied inline. The deterministic
  plan scanners printed:
  - secrets: `found:false`;
  - PII: `found:false`;
  - i18n: `found:false`;
  - migrations: `mentions:false`;
  - observability: `mentions:true`, but its hits (lines 156, 251) are prose about the measurement record, not a
    runtime surface.

## Findings

The findings are numbered G1–G6 in the order they are listed. The PLAN cites them by these numbers.

**Disposition (2026-10-05).** All six were taken. The PLAN was amended after this grill:

- G1: the rule says "author"; a stage's own pinned Bash lines are commands, not authored content;
- G2: a generator runs only when the plan declares every path it writes;
- G3: the guarantee audit narrows to the brief's TEXT;
- G4: the helper's failure modes are declared;
- G5: a predicate plus a control text replaces the "mutant renderer";
- G6: the hygiene pin is an appended, self-contained block.

```yaml
- type: FINDING
  rule_id: P5
  severity: important
  file: ".dev/features/build-writes-through-tools/PLAN.md:132"
  problem: "The planned wording 'Bash ... never writes a project file's content itself (no ... script)' contradicts lines the stages themselves pin. Those lines write files through Bash: the scope setter, the reconcile anchor, ac-tests-lock.mjs, stage-agent.mjs report, and /pharn-build Step 2c's node -e seam-config extraction. A literal reader must break one rule or the other."
  evidence: "Bash runs commands and never writes a project file's content itself (no `sed -i`, heredoc, redirect or script)"
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/build-writes-through-tools/PLAN.md:134"
  problem: "'A formatter or generator runs only on files ... named one by one' cannot be met by a generator that chooses its own output paths (a migration generator). The honest rule for a generator is CLAUDE.md's: run it only when the plan's ## Files declares the paths it writes."
  evidence: "a formatter or generator runs only on files the stage may write, named one by one, never on a directory"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/build-writes-through-tools/PLAN.md:232"
  problem: "'Every routed stage agent is TOLD' reads as more than the floor covers. The test pins the brief's rendered TEXT. That the agent runs the brief line and reads it is advisory, as the stage-agent-core header already says."
  evidence: '"Every routed stage agent is TOLD to write with the write tools" → floor: enum/regex'
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/build-writes-through-tools/PLAN.md:206"
  problem: "The measurement helper's failure modes are undeclared. Two of the three runs' transcripts are absent on disk, and the 92-minute run's regress logs were overwritten. The plan should say the helper reports an absent input as absent (never a zero), redacts the home directory, and that its figures are machine-local and perishable."
  evidence: "`.dev/features/build-writes-through-tools/measure.mjs` — the read-only analysis helper behind every figure"
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/build-writes-through-tools/PLAN.md:224"
  problem: "The 'mutant renderer' control is not buildable as stated: renderBrief cannot be mutated from the test. The non-vacuity proof needs a predicate applied both to every routed brief and to a control text with the sentence removed (L60: per asserted property)."
  evidence: "a mutant renderer that drops them fails the test"
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/build-writes-through-tools/PLAN.md:205"
  problem: "command-hygiene.test.mjs is shared with other builders in this batch. The new pin should be a self-contained block appended at the end, with its own helpers, so a stacking merge is a clean append."
  evidence: "`.dev/floor/command-hygiene.test.mjs` — `WRITE_TOOL_RULE` presence pin for the two command sentences"
```

## Summary

- **The two important concerns are wording defects in the rule itself.** They would make it self-contradictory or
  unsatisfiable:
  - the stages' own pinned lines write through Bash, so the rule must forbid authoring content through the shell, not
    running commands that write;
  - a generator cannot name its outputs one by one, so the rule must defer to the plan's declaration.
- **The four minor concerns:**
  - tighten the guarantee wording;
  - declare the helper's failure modes;
  - make the test's non-vacuity control concrete;
  - keep the shared hygiene-test edit to a clean append.
- **Notes from the grillers:**
  - architecture and coupling fit: the edit lives inside existing modules and adds no new module edge;
  - documentation and comprehension: the WHY is captured in the plan and will sit in the module header;
  - performance: the brief grows by about 0.6 KB (roughly 150 tokens) per routed agent, which is small against the
    ~302k-token first-request prefix measured in this run — no finding;
  - security, privacy, i18n, migrations and a11y: nothing applies.

ADVISORY VERDICT: 6 concerns raised (0 blocking-severity, 2 important, 4 minor), for the human to weigh before
/pharn-dev-build. This interrogation gates nothing. The Step 1b lessons verdict above is a separate floor result.
