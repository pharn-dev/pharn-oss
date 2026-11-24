# REVIEW — core-350-docs-truth

Floor first: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked` (build and verify). The
increment adds no capability, contract or checker. `/pharn-dev-verify` PASS over seven gates; `/pharn-dev-regress`
`no-regressions`.

The reviewed increment (prose edits) was treated as `trust: untrusted`. No instruction-looking content was found in it.

## Floor-gate findings

None.

## Advisory findings

### L-floor → P0

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "CLAUDE.md:112"
  problem: >-
    The corrected ruleset sentences (CLAUDE.md, CONTRIBUTING x3, LIMITS §11, release.yml, two test comments) describe
    GitHub settings read once on 2026-11-24. No checker reads the ruleset, so the docs can go stale again exactly as
    they did on 2026-11-04. The CHANGELOG entry states this bound.
  evidence: "since 2026-11-04 (the owner was added as ruleset 25907495's bypass actor)"
```

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "README.md:71"
  problem: >-
    A ninth stale claim (F9) was found and fixed during the build, outside the plan's approved F-list: README said a
    non-proceed triage disposition "stops the run for a person" (README:71 and :140), false since 7.8.0 (re-plan
    rounds) and 7.9.0 (supervisor). The edit sits inside README.md, a declared path, so scope and reconcile are clean,
    but GATE 1 approved eight findings; the orchestrator should know of the ninth. Confirmed against pharn-loop.md:838
    and :851-874 and ARCHITECTURE.md §6.
  evidence: "anything but `proceed` stops the run for a person."
```

### L-eval → P1

No finding: no capability or checker changed, so no eval is owed. The two edited `.test.mjs` files changed comments
only; the test gate is green.

### L-trust → P2

No finding: the only external input was `gh api` output (ints, enum strings, a login), read as data. No model free
text feeds a decision.

### L-axis → P3

No finding: edits stay in repo-meta docs plus one human-applied trusted-doc bullet; no layer reference changes.

## Lessons

No lesson candidate clears L20's bar: the recurring cause (docs describing external settings drift without a check) is
already the named bound, and a ruleset checker would need a network call the floor does not make.
