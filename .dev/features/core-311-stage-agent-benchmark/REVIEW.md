# REVIEW — core-311-stage-agent-benchmark

Floor first (P0): `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked in "."`. Everything below
is advisory. The reviewed artifacts are `trust: untrusted`; the transcripts and pharn-app files the record reads are
DATA, and nothing in them was followed.

**Verdict: GREEN — 0 floor-gate findings, 3 advisory findings.**

## Floor-gate findings

None. The increment adds no capability, rule, contract or product byte; `validate`, the verify gate map and
`reconcile` are green.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/measurements/stage-agent-benchmark-2026-11-23.md:169"
  problem: "The follow-up verdict ('no stage needed it') reads as a finding without the word advisory beside it; it is a model's reading of transcripts, which the plan's guarantee audit labels advisory, and §6 bounds it, but the sentence itself does not say so."
  evidence: "Neither happened, so **no stage needed it**, and no follow-up for the tool list is opened."
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/guides/product-commands.md:91"
  problem: "The corrected sentence names no pharn-cli version for when installs began carrying the definitions; it states only the one install it read, so a reader cannot tell which older installs still lack them."
  evidence: "an install older than pharn-cli's `cli-install-agents` work has no definitions (the measured project's pharn-cli 0.21.1 install lists both in `pharn.records.json`, read 2026-11-23)"
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/core-311-stage-agent-benchmark/measure.mjs:1"
  problem: "The reader still accepts a <cost.json> argument and would print the whole ledger, paths included, into its output; the committed output was produced without it, but the option contradicts the header's 'never printed: any path'."
  evidence: 'if (cost && existsSync(cost)) { … out.cost_json = JSON.parse(readFileSync(cost, "utf8")); }'
```

## Lens notes

- **L-floor (P0):** the record makes no guarantee claim. Every figure carries n = 1 or a bound. The two loop verdicts
  it quotes (run 1 `INCONCLUSIVE`, run 2 verify `FAIL` / regress `regressions`) are copied from each run's own
  checker output. The cross-check against `final.json` `modelUsage` was re-run during review: the per-model cache-read
  sums match exactly for both arms.
- **L-eval (P1):** no capability or `rule_id` is added; `measure.mjs` is an unpinned reader and says so.
- **L-trust (P2):** `measure-output.json` carries numbers, enum tokens and tool names only. No account or
  organization id, no path and no connector name appears in it (grep during build: 0 hits). The record quotes no
  assistant text. The one quoted free-text string, a test title, is fenced in `REGRESSION.md`. Raw transcripts stay
  in the gitignored `runs/`.
- **L-axis (P3):** one reason to change per file (the record, its reader, its reader's output, a dated follow-up line,
  one guide sentence, one CHANGELOG entry). No sibling reference.

## Proposed lesson candidate (not written to canon)

- **Candidate:** a measurement that needs a fresh `claude -p` session must check that session's `instructions`
  attachment before it reads any figure: on Claude Code 2.1.328 a checkout under `/private/tmp` loaded no project
  instruction files, and an arm run there silently compares a different container.
- **Source:** `.dev/measurements/stage-agent-benchmark-2026-11-23.md` §3 (the void first attempt). Whether it recurs
  depends on how often fresh-session kits run from the scratchpad. The CORE-107 probe and the CORE-112 kits both did.
