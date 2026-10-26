# REVIEW — loop-background-cli

Reviewed: the built files (`.dev/measurements/loop-interactive-cli-2026-10-26.md` §2–§7,
`pharn/floor/stage-agent-core.mjs`, `.claude/commands/pharn-loop.md`, `README.md`, `docs/pipeline.md`,
`docs/limitations.md`, `CHANGELOG.md`, `SKILLS_VERSION`, `TRUSTED-DOC-PROPOSALS.md`) and the human's applied
`pharn/LIMITS.md` / `pharn/THREAT-MODEL.md` edit, with `PLAN.md`, `GRILL.md`, `REGRESSION.md`, `VERIFY.md` as context.
The increment is `trust: untrusted`; the transcripts it quotes are other sessions' output.

**Floor first:** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. Verify `PASS`
(reconcile `CLEAN`), regress `no-regressions` (their reports). After the human's trusted-doc patch:
`stage-load-budget` and `command-hygiene` tests 314/314, prettier and markdownlint clean on both docs.

## Floor-gate findings

None. The increment ships no capability, `rule_id` or eval and references no sibling module; its one product code file
changes only a header comment.

## Advisory findings (judgment; they gate nothing)

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: "README.md:145"
  problem: "The headless half of the verdict drops its condition: the 6.73.2 headless runs ran foreground while sending run_in_background: false, and 7.1.1 sends no parameter, so 'a headless session ran them in the foreground' reads as true of headless today, which nothing measured (L40: the varied condition is the parameter, not only the session form)."
  evidence: "a headless `claude -p --permission-mode auto` session ran them in the foreground (6.73.2)."
- type: FINDING
  rule_id: P0
  severity: important
  file: "docs/pipeline.md:384"
  problem: "The same unconditioned restatement in the container section; also in stage-agent-core.mjs:189, CHANGELOG.md:56 and TRUSTED-DOC-PROPOSALS.md:38. The record (§5) and the applied LIMITS bullet carry the condition; these five do not (L64)."
  evidence: "the headless one ran its stage agents in the foreground but stopped at the entry check (6.73.2)"
- type: FINDING
  rule_id: P0
  severity: minor
  file: "docs/pipeline.md:78"
  problem: "Absolute where the mechanism is bounded: a background launch is waited out up to the wait's cap, and a finish that returns no result (exit 2) or crashes stops the run S9."
  evidence: "so a harness that launches the agent in the background does not stop the run"
- type: FINDING
  rule_id: P4
  severity: minor
  file: "CHANGELOG.md:74"
  problem: "Says the trusted-doc text is not applied; the human has since applied it in this PR, so 7.1.2 now ships the LIMITS §8 bullet and the THREAT-MODEL §5 clause, and the entry should name them (the proposal file said so)."
  evidence: "`.dev/features/loop-background-cli/TRUSTED-DOC-PROPOSALS.md`; this entry does not apply it."
```

## Lens notes

- **L-floor (P0):** §4's figures were recomputed from the timestamps during the build (each wait, each
  marker-to-call gap, each report-to-return gap) and re-read from `B` for every `F` value; §6's sums add up (per-context
  processed 11,190,436 and output 49,873 equal C's totals). Finding (a)'s share is labelled `R·e` with its formula, as
  the grill asked. The verdict says "handled, not gone" and names what one run does not show.
- **L-eval (P1):** no capability, no eval owed. The verification the grill asked for was the figure re-derivation and
  the restatement grep, both done at build.
- **L-trust (P2):** transcripts, the agents' reports, `LOOP.md` and the classifier's absence are quoted as data; no
  proceed/stop read them.
- **L-axis (P3):** one axis — the measured verdict carried to every place that states the residual. The trusted-doc
  edit is the human's and lands on the same axis.

**Verdict: GREEN — 0 floor findings, 4 advisory (2 important, 2 minor).**

## Proposed lesson candidate

A human-only patch handed over as a runnable command before its window opens gets run early. L68 says when the human
applies a trusted-doc edit and to tell them at GATE 1; that was done (PLAN, GATE 1 question 3, and the proposal's "When
to apply"), and the human still applied it inside the anchor→verify window, because the turn printed the exact command
together with "once I report verify passed". The remedy L68 lacks: hand the command only at the moment its window
opens. Source: `REGRESSION.md`, "A trusted-doc edit inside the window, undone before any gate read it". Whether it
recurs enough to clear L20's bar is the human's call at GATE 2.
