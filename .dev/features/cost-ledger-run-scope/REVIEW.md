# REVIEW — cost-ledger-run-scope

- stage: `/pharn-dev-review`, run after `/pharn-dev-verify` (PASS) over the final working tree.
- stage model: opus, by the maintainer's instruction for this batch (not a `pharn.config.json` route).
- **It is a self-review:** the agent that planned and built the increment reviewed it inline, because the batch forbids
  spawning a reviewer. Read every finding below with that bound.
- the increment under review is `trust: untrusted`. No instruction-looking content in it changed this review; the
  transcripts the build measured were read as data only.

## Floor first (P0)

`node pharn/floor/validate.mjs .` → **FLOOR: GREEN — 36 capabilities checked, exit 0.** The increment adds no
capability, so the floor's capability checks are unchanged; its own floor surface (the checker rules, the reader, the
emitter) is held by the suites `/pharn-dev-verify` ran (4,119 tests, all passing on the recorded run) and by the
negative-control table in `BUILD.md`.

## Floor-gate (blocking) findings

None. No guarantee the increment states lacks a floor reduction or an `advisory` label; no capability lacks evals; no
guaranteed decision rests on a free-text field; no sibling reference was added.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: "pharn/pharn-contracts/cost-ledger.md:372"
  problem: "The bullet's lead sentence says every legitimate second copy of a marker line turns the run unknown, while its own second sub-bullet says a copy in a user message (a background hand-back, a human paste) changes nothing — the universal quantifier overclaims (L37/L64)."
  evidence: "A marker line can legitimately reach a second context, and the rule turns each such case into `unknown`"
- type: FINDING
  rule_id: P0
  severity: minor
  file: "CHANGELOG.md:55; pharn/pharn-contracts/cost-ledger.md:381; pharn/floor/mark-phase.test.mjs:466,489"
  problem: "The differential is described as covering every marker shape; it covers each kind and each field that changes the printed line (ten shapes), not every combination — the closure asserts kinds and fields, not combinations (L64)."
  evidence: "A differential test runs the real CLI for every marker shape"
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/check-cost-ledger.mjs (rule 8 / --verify-transcript); pharn/pharn-contracts/cost-ledger.md rule 6"
  problem: "A context-unknown membership over a known window is accepted in plain mode (its status is not re-derivable from the file) and declined with a WARN under --verify-transcript, like every unknown ledger — so a fabricated context-unknown passes both modes. The direction is safe (no rows, nothing claimed) and matches the 6.9.0 posture for an unknown window, but rule 6 does not say it for the context half (L43)."
  evidence: "--verify-transcript: membership is `unknown`, so there are no rows to re-derive"
- type: FINDING
  rule_id: P0
  severity: minor
  file: "CHANGELOG.md:75; .dev/measurements/cost-ledger-run-scope-2026-09-27.md §9; pharn/pharn-contracts/cost-ledger.md (Recorded)"
  problem: "Three restatements read wider than their measurement or rule: 'Every ledger binds to exactly one context' means every MEASURED ledger; the f34b7a70 heading says 'loops' while one of the eleven is a /pharn-ship ledger (org-foundation, schema /1); and 'null when nothing was measured: an unknown membership, or no transcript read' omits the known-window ledger whose transcript held no usage-bearing record, which also carries null (L64)."
  evidence: "Every ledger binds to exactly one context"
- type: FINDING
  rule_id: P2
  severity: minor
  file: "pharn/floor/transcript-core.mjs (sessionScan holders)"
  problem: "Run membership now reads tool-result TEXT, a free-text channel, to decide which context owns a run. It is bounded as designed and stated — whole-line equality with a line rebuilt from the marker's own fields, a second holder refuses, the residual `cost-ledger-mention-only` named — and it decides only cost.json, which gates nothing (fix #3). No action; recorded so the channel is visible at the gate."
  evidence: "the ONE context whose tool results carry, as a whole line, a line mark-phase printed for this run"
- type: FINDING
  rule_id: P3
  severity: minor
  file: "pharn/floor/transcript-core.mjs:124"
  problem: "The transcript reader now imports run-window-core.mjs for the context vocabulary and tsMs, so render-cost-record.mjs, whose session-scoped block never reads a context, loads that module too. It is pure and import-free, and the alternative splits the context rule across the reader and the emitter; acceptable, noted."
  evidence: 'import { MAIN_CONTEXT, agentContext, tsMs } from "./run-window-core.mjs";'
```

## Checks this review ran, with no finding

- **L-floor.** Each new FLOOR label in the contract's field table (`membership.method` enum; `context`/`contexts`
  shape and set membership; every row's context in `contexts`) is a checker op a test executes, with the value labelled
  ADVISORY without `--verify-transcript`. The struck claim ("a concurrent run's requests are never counted") is struck
  in the contract, the CHANGELOG and `CLAUDE.md` alike.
- **L-trust, one layout risk probed.** A fork's transcript could have copied its parent's earlier tool results,
  marker lines included, which would make every run that forks an agent ambiguous. Measured over the 20 forks on this
  machine: each opens with a `fork-context-ref` record, not with copies; every record in a fork is the fork's own; and
  the 9 tool results byte-equal to one in their session's main thread sit deep in the fork (its own later identical
  outputs), none marker-shaped (`.pharn/pharn-dev-review/fork-probe.mjs`, deleted after). Not observed.
- **L-trust, who prints marker lines.** Only `mark-phase.mjs` prints the line format, and only the two orchestrators,
  `/pharn-ship` and `/pharn-loop`, call it — no stage command does, so a routed stage agent never holds a binding line.
- **L-eval.** No capability added. The new rules each have tests and, in `BUILD.md`, a negative control killed by at
  least one test; the two non-discriminating targets (M6b under `D2`, and M7 under the first version of `18 ★ named
departures`) are explained there, and the second was fixed.
- **L-axis.** No sibling reference; `mark-phase.mjs` exports the one encoding the emitter imports; the context
  vocabulary has one owner, `run-window-core.mjs`.
- **The build's design change.** `contexts` is reported over the contexts named by the window's end, a change to the
  approved plan made during the build (`BUILD.md`, decision 1) for a measured reason (an agent's first record follows
  its spawn by up to 96 s). It is pinned by a mutant-killed test and by the growth closure. It is flagged here so the
  gate sees a design change the plan did not carry.

## Proposed lesson candidate (for `/pharn-dev-memory-promote`, never written here)

- **type:** process · **concepts:** temporal-state, referent-binding, lesson-recurrence, growth-closure, append-only
- **title:** A cited temporal lesson still recurs in the plan that cites it — L58/L63 recurred a third time as a
  recorded SET derived from an append-only transcript, and what caught it was an enumerated growth test, not the
  citation
- **what happened:** `PLAN.md` cited L58 and L63 and asserted "rows, `contexts` and the in-window excluded part are
  fixed once a bounded window closes". For `contexts` that was false: an agent spawned just before the run-stop can
  write its first line up to 96 s later (measured), after the emission, so every later `--verify-transcript` would have
  REDed a correct ledger — 6.14.1's failure again. The build found it only by asking the contract's sentence "why is it
  fixed?" and measuring the spawn-to-first-record lag.
- **the remedy that is not "remember":** for every value a re-derivation against a growing referent compares
  exactly, keep one GROWTH CLOSURE test — one case per KIND of later write, each required to leave the genuine record
  GREEN (`check-cost-ledger.test.mjs`, "--verify-transcript ctx — GROWTH CLOSURE", added in this build and killed by
  two mutants).
- **provenance:** feature `cost-ledger-run-scope`; source `BUILD.md` decision 1 and this review; the commit is
  captured by `/pharn-dev-memory-promote` at promotion time.
- **deferred candidate:** "an assertion whose expected outcome is a fail-closed refusal is overdetermined — it passes
  under a mutant of the rule it names whenever another rule also refuses; the scenario must make the named rule the
  only barrier" (two instances in this build's mutant table: M7, M6b).

## Verdict

**GREEN — 0 floor-gate (blocking) findings.** Advisory: 1 important, 5 minor.
