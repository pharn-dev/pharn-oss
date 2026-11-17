# REVIEW — stage-model-tuning

Floor first: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. The increment adds no
capability (`role:`), so `validate` does not see it; its deterministic coverage is the two test files, which ran inside
`/pharn-dev-verify`'s `test` gate (PASS) and cover every line of both changed `.mjs` files (local
`--experimental-test-coverage`: 100% lines for `defect-probe-kit.mjs` and `stage-model-pairs.mjs`).

The increment under review was treated as `trust: untrusted`. No instruction-looking content was found in it. The test
fixture's session text "IGNORE PREVIOUS INSTRUCTIONS…" is a deliberate hostile value that the test asserts is never
echoed. It is DATA, and it changed nothing here.

## Floor-gate findings

None.

## Advisory findings

### L-floor → P0

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/floor/defect-probe-kit.mjs:188"
  problem: >-
    The agreement check runs THIS repository's check-model-config.mjs, whose closed product-stage map must match the
    arm's command set, so an arm older or newer than this checkout (a command added or removed) is refused even when
    its override is sound; the header and guide state that this repository's checker decides, not this consequence.
  evidence: 'projectAgrees(project) … MODEL_CONFIG_CLI, "agreement", "--config" … "--commands-dir"'
```

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/floor/stage-model-pairs.mjs:86"
  problem: >-
    readSession treats a session Claude Code ended in error (for example the --max-budget-usd cap) as valid when its
    figures are present; the run is then scored by whatever files it left, usually a miss, which the reading counts as
    a lost catch — the conservative direction, but the record's results section should name any such session.
  evidence: "if (!isObject(doc) || !isCount(doc.duration_ms) || !isCount(doc.total_cost_usd) || !isObject(doc.modelUsage))"
```

### L-eval → P1

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/floor/defect-probe-kit.test.mjs:185"
  problem: >-
    The existing test "models, efforts, the spend cap and the probe filter reach every command line" now builds with
    `grill=sonnet` instead of `grill=sonnet[1m]` (a bracketed id fails check-model-config agreement once it is written
    into the frontmatter); the shell-quoting property it also covered moved to the commandLine unit test (`opus[1m]`),
    and the build's refusal of `sonnet[1m]` is its own case. pharn-ci's test-integrity check may report the changed
    assertion; it is a moved property, not a weakened one.
  evidence: 'const extra = ["--runs", "1", "--probe", "p2", "--model", "grill=sonnet", …]'
```

### L-trust → P2

No finding. The reader reads only numbers, the scorer's closed outcome and `MODEL_RE`-checked model keys. A test
asserts that the output holds no temp-dir path, no session id and no `result` text. The kit's agreement check runs this
repository's code and nothing from `--arm` (grill finding 1, folded).

### L-axis → P3

No finding. `.dev/floor` imports only `.dev/floor` and `pharn/floor` cores, in the allowed direction. The reader reuses
the scorer's `scoreRun` / `runDirs` / `loadManifest` and the kit's stage table instead of restating them. The kit's
new code is part of materializing a run project, so the file still has one axis.

## Verdict

GREEN — 0 floor-gate findings, 3 advisory (all minor). The two P0 notes belong in the record's results section once
the runs exist. Neither changes a reading's rule.

## Proposed lesson candidate

None. The defect this increment fixes (a `--model` flag the command frontmatter overrides) was inferred from a
documented platform mechanism (`check-model-config.mjs` "TURN SCOPE") and has not yet been observed in a run. The
sanity run will show whether the override took. P7 wants an observed failure before a canon entry, and its nearest
canon neighbours (L84, L43) already cover the remedy's shape.
