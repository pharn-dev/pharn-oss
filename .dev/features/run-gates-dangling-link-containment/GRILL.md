# GRILL — run-gates-dangling-link-containment

Plan: `.dev/features/run-gates-dangling-link-containment/PLAN.md` · spec-hash: **match** (`2f8b9264…e838`) ·
Step 1b lessons declaration: **GREEN** (`check-plan-lessons.mjs` exit 0).

Grillers: 13 registered. All five deterministic plan scanners reported no hits. Of the griller axes, only
testability and error-handling apply to a one-function floor fix, and their concerns are below.

**Scope-count check (L20/L53, by hand):** `set-writes-scope.cjs --from-plan` parsed **5 paths against 5
declared bullets**.

## Findings

```yaml
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".dev/features/run-gates-dangling-link-containment/PLAN.md:63"
  problem: "A FILE component (ENOTDIR) is refused under `path-containment`, but a file under `.pharn/` is not an escape. It is a malformed `--out`. Reusing the existing code avoids widening the closed REASON_CODES set, which is the right trade, but a reader of the refusal could take it for an escape verdict."
  evidence: 'That is refused as `path-containment` ("cannot lstat"), which is the branch that already existed.'
```

Recommendation: keep the code. Make the comment say that any non-ENOENT `lstat` error is refused under
`path-containment` because the walk cannot prove the path is safe, not because it proved an escape.

```yaml
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: ".dev/features/run-gates-dangling-link-containment/PLAN.md:72"
  problem: "The 'link target was not created' assertion passes on the UNFIXED code too. The old crash was an ENOENT from `mkdirSync` and wrote nothing, as reproduced. So it is a safety assertion, not the L4 discriminator. The red must come from the exit-document assertions (parsed JSON, `reason_code`)."
  evidence: "and (a) and (c) assert that the link's target was not created"
```

Recommendation: keep it, and say in the test which assertions carry the red. `VERIFY.md` reports the
unfixed run's failing assertion by message, so the red is shown rather than asserted.

## Summary

This is a well-bounded fix to one function, with a reproduction, and the call-site analysis explains why
only `init` crashed. The two concerns are about how honestly the refusal and the test are labelled. Both
are resolved by a comment and a report line, not by a scope change.

ADVISORY VERDICT: 2 concerns raised (0 blocking-severity, 0 important, 2 minor) — for the human to weigh
before `/pharn-dev-build`. The Step 1b floor verdict is GREEN and is reported above, separately.
