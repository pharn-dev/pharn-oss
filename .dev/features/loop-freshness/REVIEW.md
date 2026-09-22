# REVIEW — loop-freshness

**Floor:** `validate` GREEN. The standing verdicts are verify `PASS` (`reconcile` CLEAN, 2545/2545 tests)
and regress `no-regressions`. Everything below is advisory. The increment was reviewed as
`trust: untrusted`, and nothing in it read as an instruction.

## Floor-gate findings (blocking)

None. Each claim reduces to a floor primitive or carries its bound:

- Freshness (F, G) and log integrity (J) are content-hash comparisons.
- Report↔stamp binding (D) is a hash equality.
- The lapse routing (B) is enum membership over a closed subset.
- The re-derivation (E) re-runs two existing floor checkers and compares their JSON field by field. It adds
  no new decision table.
- That `/pharn-loop` calls the checker at both points and obeys it is labelled advisory, and the hygiene
  pins say they prove presence and order only.
- Recency, provenance, self-integrity and the unauthenticated ledger are each stated as NOT COVERED, in the
  header, the contract, the loop's audit and CHANGELOG.

No Capability was added, so no eval binding is owed.

## Advisory findings

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "pharn/floor/run-gates.mjs:162"
  problem: "run-gates.mjs's containment walk uses `existsSync`, which FOLLOWS a symlink, so a DANGLING symlink component reads as absent and passes the check. Probed: `--out .pharn/linked/gates` with `.pharn/linked` dangling passed containment, then `mkdirSync` threw an uncaught ENOENT. The result was exit 2 with a stack trace, no JSON on stdout and no closed reason_code, where the contract promises `path-containment`. Nothing was written outside the state root (measured), so it fails closed. It is the same defect shape this increment's own ledger check had, which its dangling-link test caught before it shipped."
  evidence: "if (!existsSync(cur)) break;"
```

Not fixed here, deliberately. The runner's containment is a different axis from freshness, and its suite
is not in this plan's `## Files`. Named follow-up: `run-gates-dangling-link-containment`, which means
`lstat` with a try/catch in `assertContained`, plus a dangling-component case in the CONTAINMENT test.

```yaml
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".dev/features/loop-freshness/PLAN.md:234"
  problem: "The build departs from the approved plan's check table in two cells. (1) A report whose reason_code is OUTSIDE the vocabulary is a RERUN `report-malformed`, not a STOP, which makes `report-malformed` uniformly a re-run code whether the JSON is torn or merely out of vocabulary. (2) A NINTH new member, `ledger-malformed`, names a corrupt budget ledger instead of overloading `usage-error`. The checker header, CHANGELOG and CLAUDE.md all describe what shipped. Only the PLAN table is stale."
  evidence: "non-member → 4 `report-malformed`"
```

## Lens notes

- **L-floor (P0).** The fabrication checks (J, E, H) precede the staleness checks (F, G). A test forges a
  reconcile-red report into a retryable one, and it STOPS instead of being re-run. That is the case the
  order exists for. The plan's correction about mutating gates holds: F compares verify's FINAL
  fingerprint, and the suite's F cases edit only after the stamp is taken.
- **L-eval (P1).** 26 tests, 99.74% line coverage of the new file. Each check is broken alone and
  repaired. Every `LAPSE_CODES` member is iterated. The recency bound and the forgery bound are each
  pinned as bounds, not left as prose. The ★ WIRING test executes both committed `pharn-loop.md` lines,
  with a one-cause negative control. The reverse closure has its own mutation control.
- **L-trust (P2).** Gate logs are hashed and never read. The checker's `reason` never quotes an artifact.
  The ledger path is containment-checked with `lstat`, dangling links included.
- **L-axis (P3).** The budget ledger's co-location is stated in the header, as the grill asked.
  `check-loop.mjs` and `check-loop-decision.mjs` are byte-identical. The log naming moved to one
  exported rule (`logBasename`) instead of a second copy.

## Verdict

GREEN at the floor. There are 2 advisory findings (1 important, 1 minor). Neither needs a change inside
this increment's axis: the first is a named follow-up, and the second is recorded in `SHIP.md`.

## Proposed lesson candidate

**Candidate (held for the human, not taken to promotion in this unattended batch):** _"`existsSync` is not
an absence test inside a containment check — it follows symlinks, so a DANGLING link reads as absent; use
`lstat` (try/catch) for every component."_ There are two occurrences: `run-gates.mjs:162` (shipped since #230) and this increment's first ledger draft (caught by its own test). The remedy otherwise reduces to
remembering, which is L20's bar. Source: this REVIEW, advisory finding 1.
