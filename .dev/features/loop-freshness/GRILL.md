# GRILL — loop-freshness

Plan: `.dev/features/loop-freshness/PLAN.md` · spec-hash: **match** (`2f8b9264…e838`) · Step 1b lessons
declaration: **GREEN** (`check-plan-lessons.mjs` exit 0).

Grillers: 13 registered. The deterministic scanners reported no hits for `i18n`, `migrations`, `pii` and
`secrets`. `observability` matched "logging", which here means the runner's gate LOG FILES, not
telemetry, so the axis does not apply. The a11y, i18n, privacy, migrations and performance axes do not
apply. Testability, error-handling, security, architecture and documentation were applied inline.

**Scope-count check (L20/L53, done by hand because no floor check exists):** `set-writes-scope.cjs
--from-plan` parsed **17 paths against 17 declared bullets**. The two `###` sub-headings (the
`docs:generate` list and the exclusion block) both end the authorized list, as intended.

## Findings

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/loop-freshness/PLAN.md:274"
  problem: "The NOT-COVERED list omits the checker's own integrity. check-loop-fresh.mjs runs from the worktree and shells the worktree's check-verify/check-regress/front checkers, so a modified checker (or a modified sibling it spawns) can print FRESH over anything. check-bash-reconcile.mjs states exactly this bound for itself (LIMITS.md §6, 'cannot vouch for its own integrity'), and this checker inherits it."
  evidence: "NOT COVERED, each stated in the header, the contract and the PR"
```

Recommendation: add the bound to the header, the contract and the PR. `pharn/floor/` is
always-reconciled, so a modified checker is caught by `reconcile`, which runs from the same worktree.
That is circular, and it should be said so.

```yaml
- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".dev/features/loop-freshness/PLAN.md:165"
  problem: "The plan does not say WHERE in Step 6c the commit-gate call sits, or that it runs after every Step 6b write. The gate is only meaningful if nothing that the fingerprint includes is written between it and `git commit`. Step 6b's writes (LOOP.md, cost.json, RUN-REPORT.md) are all excluded from the fingerprint, but that property holds only for this ordering and nothing states it."
  evidence: "added, `not committed: evidence stale`."
```

Recommendation: make the commit-gate call the FIRST pinned line of Step 6c, before the scope
re-derivation, and have the hygiene pin assert that ordering. Pass `--front` there too: the committed
SPEC's approval is part of what is committed, and the three front checkers cost milliseconds.

```yaml
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: ".dev/features/loop-freshness/PLAN.md:159"
  problem: "The budget ledger (read, count, append, containment) is a second reason for check-loop-fresh.mjs to change: the re-run policy can change without the freshness rules changing. It is small enough to stay in one file, but the header should say it is a deliberate co-location."
  evidence: "D4 kept (counter, not prose)."
```

```yaml
- type: FINDING
  rule_id: "P1"
  severity: important
  file: ".dev/features/loop-freshness/PLAN.md:321"
  problem: "The invocation test's fixture is described but not how its stamps are produced. If they are hand-written JSON, their fingerprints must be computed with the REAL worktree-fingerprint over the fixture's tree, and their logs must exist with matching hashes. Otherwise the positive control passes only because a check was accidentally skipped (L34). The negative control should also isolate ONE cause, the changed tree, so it cannot pass for a different reason."
  evidence: "negative control uses the previous iteration's stamps and a changed tree, and must exit 1."
```

Recommendation: build every fixture through one helper that computes the fingerprint live, writes the
logs, and produces the two reports by RUNNING `check-verify.mjs --stamp` and `check-regress.mjs verdict`.
The negative control should assert `reason_code: tree-moved-since-verify` specifically.

```yaml
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".dev/features/loop-freshness/PLAN.md:83"
  problem: "When check F sends verify for a re-run, the new verify init moves past the regress head stamp, so G then fails and regress is re-run too. That is correct and bounded (one re-run per stage per iteration), but the command prose should say a verify re-run can cascade into a regress re-run, or it will read as a second, unexplained staleness."
  evidence: "On exit 1 the named stage is re-invoked inside the SAME iteration `<N>`"
```

## Summary

The design keeps `check-loop.mjs`'s input signature intact, reuses the checkers by `spawnSync`, and puts
fabrication checks (J, E, H) ahead of staleness checks (F, G), so a forged report stops the run rather
than being "refreshed". The correction about mutating gates is right: F compares against verify's FINAL
fingerprint. The missing pieces are the checker's self-integrity bound, the exact position of the commit
gate, and a fixture recipe strong enough that the positive controls are not vacuous.

ADVISORY VERDICT: 5 concerns raised (0 blocking-severity, 3 important, 2 minor) — for the human to weigh
before `/pharn-dev-build`. The Step 1b floor verdict is GREEN and is reported above, separately.
