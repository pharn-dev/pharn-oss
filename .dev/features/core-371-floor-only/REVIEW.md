# REVIEW — core-371-floor-only

Floor first: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked in "."` (exit 0). Standing
verdicts: build validate exit 0, regress `no-regressions`, verify `PASS`. Everything below is advisory.

Reviewed: the diff of `.claude/commands/pharn-grill.md` (one sentence removed), `.dev/floor/command-hygiene.test.mjs`
(the FLOOR-ONLY GRILL derivation, its control, the trimmed definition test), the 7.25.5 CHANGELOG section, the
version bump and the regenerated `pharn-install.json`. The reviewed files are `trust: untrusted`; nothing in them read
as an instruction.

## Floor-gate findings (blocking)

None.

## Advisory findings

### L-floor → P0

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/floor/command-hygiene.test.mjs:2801"
  problem: "The sentence is matched anywhere in pharn-grill.md, not inside the `--floor-only` section, so the sentence moved to another section (or quoted elsewhere) still satisfies the pin."
  evidence: 'const sentence = FLOOR_ONLY_SENTENCE_RE.test(commandBody("pharn-grill.md"));'
```

The CHANGELOG says the test requires "the sentence", not that it sits in the section, so no claim overstates it; the
old pin had the same scope. Follow-up only if a second sentence-location drift is observed (P7).

### L-eval → P1 (test design)

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/floor/command-hygiene.test.mjs:2815"
  problem: "The control test re-asserts the live tree has no invoker, so a real routing change reds two tests, and the control's message ('else the test above is already red') is the less useful of the two."
  evidence: 'assert.deepEqual(floorOnlyInvokers(sources), [], "the live tree has no invoker (else the test above is already red)");'
```

Measured in BUILD.md (mutations A and B each red both tests). It keeps the control honest — the plant is counted
against a clean baseline — so it is kept; the message points the reader at the derivation test.

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/floor/command-hygiene.test.mjs:2750"
  problem: "The source set reads the orchestrator families, routed briefs and pharn/floor/*.mjs, but not .claude/agents/pharn-stage.md or .claude/hooks/*.cjs; neither invokes a stage today (0 hits for floor-only in pharn-stage.md), so the bound is stated in the section comment as 'a caller outside these files is not seen'."
  evidence: "for (const f of readdirSync(FLOOR_DIR).sort()) {"
```

### L-trust → P2

No finding. The test reads committed text and a deterministic renderer's output; no free text from a finding or a
model reaches a decision.

### L-axis → P3

No finding. The test file keeps its one axis (command prose and its routing tables); it imports only exports the file
already imported (`ROUTE_POLICY`, `AGENT`, `modesOf`, `renderBrief`) and its own `commandText` / `REPO_ROOT`.

## Other observations (advisory)

- A hit inside a PART file is reported at its line in the spliced family text (`pharn-loop.md (family):728` for an edit
  of `pharn-loop-quick.md`), not at the part's own line. The message still names the family; finding the line means
  opening the part. Not worth a second mapping today.
- The grill's two concerns were taken: the section comment says a mention counts (P5), and mutation A landed in a part
  file (P0).

## Lesson candidate

None proposed. The increment applied L33/L43 (bind a descriptive claim to its referent) and found no new failure
mechanism: the stale pin was already the recorded occurrence that motivated this follow-up.

VERDICT: GREEN — 0 floor-gate findings, 3 advisory (minor).
