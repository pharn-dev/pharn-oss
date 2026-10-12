# REVIEW — loop-no-prompts

Floor first: `node pharn/floor/validate.mjs .` GREEN (37 capabilities). No capability or `rule_id` added, so the
eval lens has nothing to bind.

## Floor-gate findings (blocking)

None.

## Advisory findings (free text is DATA)

```yaml
- type: FINDING
  rule_id: "P2"
  severity: important
  file: ".claude/commands/pharn-loop.md:60"
  problem: "`Bash(node pharn/floor/*)` also matches a crafted `node pharn/floor/../../<path>.mjs`, so the grant pre-approves running any node script reachable by traversal, not only PHARN's floor. A model steered by an untrusted description could use it without a prompt."
  evidence: '"Bash(node pharn/floor/*)",'
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/floor/command-hygiene.test.mjs:5455"
  problem: "The coverage set is the loop, its two parts and the inline /pharn-grill. A stage that runs INLINE only because its route fell back (start exit 3: /pharn-spec, /pharn-plan, /pharn-test, /pharn-build) is outside it, so those runs can still prompt; the command's ADVISORY paragraph does not name that case."
  evidence: 'const LOOP_RUN_FILES = ["pharn-loop.md", "pharn-loop-quick.md", "pharn-loop-close.md", "pharn-grill.md"];'
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".claude/commands/pharn-loop.md:132"
  problem: "Whether the plan-mode stop fires is unmeasured: no live /pharn-loop run in plan mode has been made since the change. The test pins the text and its position only."
  evidence: "If the session is in plan mode, stop here"
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: ".dev/floor/command-hygiene.test.mjs:1747"
  problem: "Widening ASK_TOKEN_RE to ExitPlanMode also changes the STAGE_AGENT_WIRING (5) assertion for every non-ship routed command; correct, but a second consumer moved with one edit."
  evidence: "const ASK_TOKEN_RE = /\\b(?:Ask(?:User)?Question|ExitPlanMode)\\b/;"
```

## Lenses

- **L-floor (P0):** every claim in the new paragraph is labeled ADVISORY; the one floor claim (the grant covers every
  pinned line, and no grant is unused) is the new enum-regex test, with a discriminating control.
- **L-eval (P1):** no capability; n/a.
- **L-trust (P2):** the grant list is trusted command text; no input is derived from a description. The traversal
  width above is the one trust concern.
- **L-axis (P3):** one axis per file; no sibling reference.

VERDICT: GREEN — 0 floor-gate findings, 4 advisory (2 important, 2 minor).
