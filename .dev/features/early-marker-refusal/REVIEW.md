# REVIEW — early-marker-refusal

Floor first: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. The increment under review
is `trust: untrusted`; no instruction-looking content in it was followed.

Reviewed: `pharn/floor/reconcile-baseline.mjs`, `pharn/floor/reconcile-baseline.test.mjs`,
`.claude/commands/pharn-loop.md`, `.claude/commands/pharn-ship-stages.md`, `.claude/commands/pharn-ship-quick.md`,
`.dev/floor/command-hygiene.test.mjs`, `pharn/pharn-contracts/reconciliation-record.md`, `.dev/guides/floor-checks.md`,
`CHANGELOG.md` 7.24.0.

## Floor-gate findings

None.

## Advisory findings

### L-floor → P0

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".claude/commands/pharn-ship-stages.md:191"
  problem: "The run-marker heading still said it opens immediately after the base capture, which the new epoch check sitting between them made false."
  evidence: "**Open the run marker (6.24.0, D3) — immediately after the base capture, before `/pharn-plan`'s own"
```

Disposition: **fixed during review** (now "immediately after the epoch check"); verify re-run on the fixed tree.

Every other claim reduces or is labeled: the entry check is the same `epochOwnerOpen` predicate (FLOOR within the
7.3.0 bounds, slug regex + directory membership + lstat code membership + integer age compare); that a run calls it is
labeled ADVISORY; "the next run cannot clear a crashed run's marker" is STRUCK in the contract, and the loop step says
plainly that only the command's text forbids running the named close line. No liveness claim is made.

### L-eval → P1

No Capability (`role:` file) is added or changed, so no eval binding applies; `validate` agrees. Behaviour is pinned by
`node --test`: both refusal branches (attributed owner with each `EPOCH_RUN_DIRS` marker; unreadable record), the
non-refusals (same feature, no baseline, absent or aged marker, legacy null snapshot), a bad name asserted separately
from a refusal, the tree unchanged after each check, and each caller's pinned line executed from the command text. The
command-hygiene test pins the ordering at both callers and the quick part's restated order.

### L-trust → P2

`<name>` passes `FEATURE_SLUG_RE` before it is interpolated into a path or the message; every other interpolated name
already passed it (`epochRefusalMessage`'s own invariant). The refusal text is surfaced to the human as DATA, and both
commands tell the run never to execute the close line it names. No decision rests on free text: the commands branch on
the exit code only.

### L-axis → P3

The mode lives in the module that owns `epochOwnerOpen` and the refusal message (one reason to change: the epoch-owner
rule), reached through the module's own CLI; no new import, no sibling reference. The edit stays out of
`enumerate()` / hashing (CORE-346's area).

## Verdict

GREEN — 0 floor-gate findings; 1 advisory finding, fixed in review.

## Lesson candidate

None proposed. The one planning slip (`pharn-install.json` missing from `## Files`, so the build restarted from Step 0)
is already the subject of CLAUDE.md's "declare every path before build Step 0" and the 6.54.0 `plan-widened` rule; it
is not a new mechanism failure.
