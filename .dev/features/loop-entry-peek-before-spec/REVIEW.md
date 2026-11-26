# REVIEW — loop-entry-peek-before-spec

- floor first (P0): `node pharn/floor/validate.mjs .` — GREEN (37 capabilities)
- reviewed: the diff against `94347bc8` (`pharn-loop.md`, `pharn-loop-close.md`, `entry-gates.mjs` header,
  `entry-gates.test.mjs`, `command-family.test.mjs`, `floor-gates.md`, version files). The increment is
  `trust: untrusted`; no instruction-looking content was found in it.
- floor-gate findings: none. Every finding below is advisory (fix #3): REVIEW.md is read by no checker.

## Re-review after the GATE 2 "fix" round (2026-11-26)

`validate` GREEN again. The fix's delta against the reviewed tree, read as untrusted DATA:

- `.claude/commands/pharn-loop.md:722` — the early stop now reads "stop as `## At the stop` says — its first line
  aborts the entry gates, still running here — then follow the close part from Step 7". **The P5 finding below is
  resolved**: the route names the section that runs `--abort`, and the reason it matters here.
- `pharn/floor/entry-gates.mjs:12-14` — the header comment no longer breaks mid-sentence and says the pre-spec stop
  aborts too. **The P3 nit below is resolved.**
- `CHANGELOG.md` — the 7.26.0 entry says the stop goes through `## At the stop`, which aborts the runner first.
- New findings on the delta: none. The P7 minor (the peek's timing is unmeasured; follow-up `entry-peek-settle`)
  stands.

## Findings (first review, before the fix)

```yaml
- type: FINDING
  rule_id: P5
  severity: important
  file: ".claude/commands/pharn-loop.md:722"
  problem: "The new stop says 'go to the Step 7 summary', the wording Step 1a's stops use, but it is the first stop before the feature directory with the entry-gate runner still alive, and a reader taking the sentence literally skips '## At the stop', whose first step aborts that runner."
  evidence: "This stop precedes `pharn/features/<name>/`, so there is no record: go to the Step 7 summary, which names the peek document's `red` ids and `unmeasured` entries."
```

Context: S14c, S15 and S15b stop with no runner running (S14c spawns none; S15/S15b precede `--start`), so their
"go to the Step 7 summary" is harmless. Here `--start` has spawned a detached runner, which keeps running every gate
(each up to the per-gate timeout) if `--abort` is skipped. `## At the stop` does say "at every stop once `<name>`
exists" and the next `--start` supersedes a runner, so the cost is wasted machine time, not a wrong verdict. A
one-phrase fix: "stop as `## At the stop` says (it aborts the entry gates first), then follow the close part from
Step 7".

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".claude/commands/pharn-loop.md:714"
  problem: "Whether the new peek reaches a fast red gate in time is unmeasured (grill G1); the increment is the cheap read plus a stated bound, and the CHANGELOG names entry-peek-settle as the measured follow-up."
  evidence: "This read sees only gates that have finished; a gate still running is found by the later peeks or Step 4's final read."
```

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: "pharn/floor/entry-gates.mjs:12"
  problem: "The reworded header comment leaves '`--wait`' alone at the end of a short line, so the sentence reads awkwardly across the wrap; cosmetic only."
  evidence: "// 7.26.0) and after the plan stage, `--wait`"
```

## Lenses with no finding

- L-floor (P0): the command claims no guarantee for the new read; the verdict is the existing `--peek` exit code
  (enum), and the order is pinned by the ★ PEEK_WIRING test (text order, stated as such in the plan). The bound
  (finished gates only) is written in the command.
- L-eval (P1): no capability changed, so no eval is owed; the order test gained a third site with a negative control
  run once (moving the peek after the spec start line turned it red).
- L-trust (P2): the summary copies floor-produced gate ids as DATA, the same treatment as S14's `### next_steps`.
- L-axis (P3): each file changes for one reason; no sibling reference added.
