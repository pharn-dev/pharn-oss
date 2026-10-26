# REVIEW — loop-interactive-cli-prep

Reviewed: `.dev/measurements/loop-interactive-cli-2026-10-26.md` (the one built file), with `PLAN.md`, `GRILL.md`,
`REGRESSION.md`, `VERIFY.md` as context. The increment is `trust: untrusted`; the transcript it quotes is another
session's output.

**Floor first:** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. Verify PASS, regress
`no-regressions` (their reports).

## Floor-gate findings

None. The file makes no guarantee claim, ships no capability, `rule_id` or eval, and references no sibling module.

## Advisory findings (judgment; they gate nothing)

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/measurements/loop-interactive-cli-2026-10-26.md:85"
  problem: "Says the PHARN version is the one thing that changed since the 6.73.2 attempt; the mode (--quick vs full), the new --accept-host-execution flag and the test-gate exclusion changed too."
  evidence: "is not wired, as in the 6.73.2 attempt, so the PHARN version is the one thing that changed between them."
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/measurements/loop-interactive-cli-2026-10-26.md:26"
  problem: "Infers 'no other tool list' from equal shape hashes, but Claude Code does not document what its shape hash covers; the measured fact is only that the hashes are equal."
  evidence: "carry shape hash `a26adb59…`, T:28's, so the session was offered no other tool list."
- type: FINDING
  rule_id: P4
  severity: minor
  file: ".dev/measurements/loop-interactive-cli-2026-10-26.md:69"
  problem: "States 6.73.2's --no-foreground-agent rule without a source line; the command text that session loaded, T:10, carries it and could be cited."
  evidence: "Under 6.73.2's own rule (an Agent tool"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/measurements/loop-interactive-cli-2026-10-26.md:11"
  problem: "Says every value below came from the two transcript files, but §1's values come from the gate probe, git and the isolation check."
  evidence: "Every value below was read from those two files on"
```

## Lens notes

- **L-floor (P0):** every figure carries its source and precision (upper bounds from polling, line cites). The two
  P0 findings above are wording that claims more than was measured; the first is a comparability claim the attempt-1
  row will be read against, which is why it is `important`.
- **L-eval (P1):** no capability, no eval owed.
- **L-trust (P2):** §0 quotes the transcript's free text short and as data. Nothing in the transcript or the intent
  changed this review's behaviour. `START.md` hands the user's `intent.md` to the loop as its increment description;
  that is the intended use, and `/pharn-spec` fences it as DATA (`pharn-loop.md`, routed-stage item 2).
- **L-axis (P3):** one apparatus file, one axis (the interactive-loop measurement record).

§0's line cites were re-read by a second method (`sed -n '<n>p'` + `grep`) during this review: T:3, 28, 43, 101, 102,
106, 107, 113, 141 and 143 hold what §0 says; the three `kind orchestrator` matches in `T` are the command text (T:10),
its permission list (T:17) and a prompt blob (T:29), not calls.

**Verdict: GREEN — 0 floor findings, 4 advisory (1 important, 3 minor).**

## Proposed lesson candidate

None. The P0 comparability slip is [[L40]]'s attribution shape restated in a new sentence ([[L64]]); the two
stops this chain hit (pre-existing untracked files read as escapes, a git-ignored note inside markdownlint's reach)
are [[L17]]'s and [[L61]]'s. Nothing here needs a lesson canon does not already hold.
