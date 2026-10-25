# REVIEW — loop-cost-6-73-2

**Verdict: GREEN — 0 floor-gate findings, 4 advisory.** Floor first: `node pharn/floor/validate.mjs .` → `FLOOR:
GREEN — 37 capabilities checked`. The increment under review (`measure.mjs`, the measurement record, three README
sentences, one CHANGELOG entry, and the run records it quotes) is treated as `trust: untrusted`. Nothing in the
quoted run output, `LOOP.md` text or transcripts was followed. Run 1's own guess that the timeout came from "five
gates ran at once" was checked against `entry-gates.mjs` and recorded as wrong, not repeated.

## Floor-gate findings

None.

- **L-floor (P0):** the record claims no guarantee. Every figure carries `R`/`O`/`S` and `m`/`e`, and every estimate
  carries its formula (bytes / 4; mtime differences; 91.75 − 19.1). The one floor operation it relies on, the ledger
  check, is named with its exact output (GREEN, two WARNs) and its bound ("internal consistency"; `--verify-transcript`
  binds only while the transcript exists).
- **L-eval (P1):** no capability is added or changed; `validate` agrees.
- **L-trust (P2):** run output is quoted as DATA (stop states as enum strings, one quoted guess); no free text from a
  run reaches a decision. `measure.mjs`'s new branch copies counts, timestamps and enum strings only.
- **L-axis (P3):** `measure.mjs` still has one reason to change, reading run inputs for the measurement records. The
  README and CHANGELOG edits are confined to the requested section and one entry.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/build-writes-through-tools/measure.mjs:42"
  problem: "The header says `entry_wait_s` is a subset of `orchestrator_between_s` unconditionally; that holds only while every `--wait` falls in a non-stage marker interval, which is /pharn-loop's placement (after the grill's return) and was not checked for /pharn-ship."
  evidence: "`entry_wait_s` is a SUBSET of that bucket, never added to it"
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/build-writes-through-tools/measure.mjs:673"
  problem: "`entry_scripts` misses the `--start` call: the orchestrator issues it in the same Bash call that writes the run-start marker, so its tool_use timestamp falls just before the window and is filtered out; both runs list two waits and an abort only."
  evidence: '[{"call":"wait"},{"call":"wait"},{"call":"abort"}] (run1/measure.json, run2/measure.json)'
- type: FINDING
  rule_id: P6
  severity: important
  file: ".dev/features/loop-cost-6-73-2/VERIFY.md:3"
  problem: "The recorded verify PASS rests on one gate measured in a clean copy; the working tree's own map is FAIL on lint:md from a gitignored scratch file, so the PASS is a judgment about which tree counts, not the raw floor verdict."
  evidence: 'On the raw working-tree map the same helper read **`FAIL`**, with `failing_gates: ["lint:md"]`'
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/measurements/loop-wall-clock-2026-10-25.md:1"
  problem: "Run 2's per-gate durations are file-mtime estimates, and lint's and typecheck's near-zero spans suggest an mtime marks a gate's last write, not its end; the 538 s / 542 s split is labelled R·e but is the weakest figure the record's conclusion about the timeout leans on."
  evidence: "`base:test` 07:30:48 (about 538 s), `test` 07:39:50 (about 542 s, the 540 s timeout plus the kill)"
```

- The two `measure.mjs` findings change no figure in the record: `entry_wait_s` matches the ledger's own
  `waits_union_ms` within 2.2 s (run 1) and 2.9 s (run 2), and no start call is cited.
- The regress hand-exclusion of four pre-existing untracked paths is recorded in `REGRESSION.md` with its evidence;
  not repeated as a finding.

## Restatement check (L64)

Each figure the README and the CHANGELOG restate was matched to the record: "about 19 minutes" (19.10 / 19.69 min),
"5.5–5.9 million processed context tokens" (5,482,796–5,933,481), "about 31 thousand output tokens" (30,189–32,177),
"the 540 s gate timeout", "About 12 of the 19 minutes" (11.9 and 12.9 min). The README's quantifier is "two measured
full-loop runs of one small feature", never "a loop". One overclaim in the record itself ("every full or quick
`/pharn-loop` currently stops at entry") was narrowed during the build to what two runs show.

## Proposed lesson

None. Every failure met here already has a lesson or a named residual. The gitignored path that markdownlint reaches is
L61. The interactive CLI's string `"false"` is the product residual `stage-agent-background`. The helper missing
entry-gate time is the reason the 6.48.0 contract gave the entry record its own keys.
