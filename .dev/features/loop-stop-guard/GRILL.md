# GRILL — loop-stop-guard

Plan: `.dev/features/loop-stop-guard/PLAN.md` · spec-hash: **match** (`2f8b9264…e838`) · Step 1b lessons
declaration: **GREEN** (`check-plan-lessons.mjs` exit 0).

Grillers: 13 registered. The deterministic scanners reported no hits for `i18n`, `observability`, `pii`
and `secrets`. `migrations` matched "rollback", which here means the wiring's rollback ORDER, not a data
migration, so the axis does not apply. Security, error-handling, testability and documentation were
applied inline.

**Scope-count check (L20/L53, by hand):** `set-writes-scope.cjs --from-plan` parsed **11 paths against 11
declared bullets**.

## Findings

```yaml
- type: FINDING
  rule_id: "P5"
  severity: blocking
  file: ".dev/features/loop-stop-guard/PLAN.md:121"
  problem: "The guard as planned would BLOCK a legitimate ending the loop command itself prescribes. `pharn-loop.md:207-208` says a stop before `pharn/features/<name>/` exists (S6 before a Draft is written) 'writes no record'. But the marker is opened in Step 1a, AFTER S2 names the run and BEFORE /pharn-spec creates the directory. So an S6 thin-intent stop leaves an open marker, no feature directory and no LOOP.md, and the guard would refuse the turn end K times, pushing the model to write a record the command forbids. That is the exact D3 failure (a guard that nags the model into breaking the command's own rule), reached through a path the plan did not trace."
  evidence: "It blocks only when a run is open for THIS session and `pharn/features/<name>/LOOP.md` is absent or empty"
```

Recommendation: make the guard INERT when `pharn/features/<name>/` does not exist. No feature directory
means no record is expected, by the command's own rule. Pin this with a test whose fixture has an open
marker and no feature directory. This is a blocking-severity concern for the human to weigh; as always,
the grill gates nothing.

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/loop-stop-guard/PLAN.md:129"
  problem: "The counter is a per-(session, run) TOTAL, not a consecutive count. Once K blocks are spent, the guard stays silent for that run for the rest of the session, even if the model works for hours and tries to stop again without a record. That is the right bound (a false block must not repeat forever), but the plan presents K as 'up to K times' without saying that it is K per run, not K per attempt."
  evidence: "After K it allows the stop with a `systemMessage`"
```

Recommendation: state "K per run per session, total" in the header, the CLAUDE.md block and the PR.

```yaml
- type: FINDING
  rule_id: "P2"
  severity: minor
  file: ".dev/features/loop-stop-guard/PLAN.md:111"
  problem: "The hook script gains a WRITER mode (`--open`/`--close`) beside its Stop mode. The plan keeps the schema in one file (L35), which is right. But the Stop mode must be proven never to write anything except its counter, or a payload could steer a hook that runs on every turn end into writing state."
  evidence: "The hook script has three modes"
```

Recommendation: a test that the Stop mode, fed every inert and blocking payload, writes nothing under the
state root except `stop-blocks.json`.

## Summary

The design is proportionate: fail-open by construction (JSON at exit 0 is the only way to block),
session-bound, bounded under the platform's own 8-block override, and honest that it cannot force work
or judge a record. Its one real defect is the no-feature-directory path, where the loop legitimately
writes no record and the guard would block anyway. The fix is one membership test.

ADVISORY VERDICT: 3 concerns raised (1 blocking-severity, 1 important, 1 minor) — for the human to weigh
before `/pharn-dev-build`. The Step 1b floor verdict is GREEN and is reported above, separately.
