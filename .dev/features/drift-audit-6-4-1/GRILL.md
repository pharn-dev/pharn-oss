# GRILL — drift-audit-6-4-1

**Header (this run, against plan v2).** Plan `.dev/features/drift-audit-6-4-1/PLAN.md`, the amended and re-approved version (ten declared paths). **Spec-hash check (floor computation, warns only here):** recomputed `sha256(pharn/ARCHITECTURE.md)` = `83890d9741dd2f63bfe5112a3fcd6d8c49fd3795233eee719e271eba16fd9487`, equal to the plan's pin — no drift. **Step 1b lessons-declaration verdict (FLOOR, exit 0): GREEN** — `applied_lessons: L1, L2, L7, L18, L19, L25, L26, L28, L33, L35, L36, L37, L40, L43, L46, L47, L49`; all 17 cited ids resolve in canon and are referenced in the plan body. That verdict covers the **declaration** only; it says nothing about whether the lessons were applied (P0). It is reported as its own floor verdict and is not part of the concern tally below.

**Registered grillers (membership read from `count-grillers.mjs`, floor):** 13. None was run as an isolated per-griller subagent — that runner is deferred (P7) — and none of the 13 axes bears on a prose-and-bookkeeping increment with no code, UI, schema or data path, so no griller findings are folded in. That is a scoping judgment, stated so the empty set is not read as a clean bill.

## Run history — kept here because this file is rewritten on each grill run

**Run 1 (plan v1, eight paths): 5 concerns — 2 important, 3 minor. Step 1b GREEN.** The maintainer was asked about the important scope concern and chose "Amend the plan to include both"; the plan returned to GATE 1 and v2 was approved as written. Dispositions, each checked against v2 this run:

| Run-1 finding                                                                                                                                                                | Severity  | Disposition in v2                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------- |
| The sweep, scoped to the "attempt 0" claim, could not reach two same-family sites: `LIMITS.md:146` (dead cite) and `pharn-review.md:210-212` (dead cite + closed quantifier) | important | **Resolved by amendment:** E10 and E11 added, Trigger rows 8–9, sweep table and coverage boundary rewritten          |
| E7 restated a closed universal ("every other outcome reverts") that Step 6a's `spec: revert failed` branch contradicts                                                       | important | **Resolved:** E7 now ends "…or the run says it could not", with the reason recorded beside it                        |
| The plan listed `verified by reasoning` as a query but had run a narrower regex                                                                                              | minor     | **Resolved:** the query list now states the exact strings run; the exact string was re-run by the grill, no new site |
| V3 assumed `npm run check` in a clone that has no `node_modules` (L26 false-green shape)                                                                                     | minor     | **Resolved:** V3 links dev dependencies from the live tree and requires a per-gate table showing every gate ran      |
| Two themes bundled; README additions had no triggering failure                                                                                                               | minor     | **Recorded, no action:** Trigger row 7 states it is maintainer direction, not a defect                               |

## Findings — run 2 (ADVISORY — model judgment; none is a floor gate)

Method, so the absence of findings elsewhere is not read as a shrug: every new claim in v2 was tested against live state this run. The closure test's region extraction (`carveOutRegion`, `.dev/floor/command-hygiene.test.mjs:966-1002`) was read, not assumed: it locates its region by the pinned literal `**The carve-out, and it is the sharp half (P0).**` and then expands over contiguous `>` lines, checking back-ticked lens names against `lens-scanner-map.json`. E11 keeps every line `>`-prefixed and adds or removes no lens name, so the plan's "the pin stays intact" holds by reading — and V5 executes the test before and after, which is what actually settles it (L37). A grep over all test and fixture files for E10's and E11's exact strings found no pin. Scope resolution was dry-run against the amended `## Files` and resolved to exactly the ten declared paths.

### Axis: guarantee-audit completeness / mirrored identifiers — P0, P4

```yaml
- type: FINDING
  rule_id: "P4"
  severity: minor
  file: ".dev/features/drift-audit-6-4-1/PLAN.md:98"
  problem: "E7 would put two checker file names (`check-loop-decision.mjs`, `check-loop.mjs`) into README prose that names no loop checker today, creating a mirrored identifier that goes stale silently on a rename; the plan's own L35 line says README should point at the owner rather than restate."
  evidence: "grep for check-loop, check-ship and STOP_GREEN in README.md returns no line. E7: '(`check-loop-decision.mjs` re-runs `check-loop.mjs` and compares)'. README prose is held to prettier and markdownlint only, so a renamed checker would leave this sentence pointing at a file that no longer exists and every gate would stay GREEN."
```

**Handling within the plan's stated latitude (wording may be tightened at build).** Name only the owner of the re-derivation, and describe the other half by behavior: "(`check-loop-decision.mjs` re-runs the loop's stop computation and compares)". That removes one mirrored identifier and keeps the traceable one. A human who prefers no file name at all can say so at GATE 2.

### Axis: honest scope / stale-claim creation — P6, P7

```yaml
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/features/drift-audit-6-4-1/PLAN.md:96"
  problem: "Applying the E6 marker patch as part of this bundle makes a status note in an older audit-trail file false: the plan is silent on it, so the increment that repairs expired 'not yet' claims would leave one behind (L33's shape)."
  evidence: ".dev/features/model-routing-limit/proposed/APPLY.md:8 reads 'One follow-up patch is still PENDING: `LIMITS-version-marker.patch`.' The plan references that patch by path and lists it under 'left as it is', but says nothing about the note that describes it as pending."
```

**Handling within the plan's declared files.** That file is agent-writable but is not in `## Files`, and editing it now would assert an application that has not happened. So the new `APPLY.md` (which is declared) gives the human the one-line status correction to make **after** applying the marker patch, and says why nobody else will. No plan change is needed.

### Axes with no finding

- **Eval coverage (P1):** no Capability or `rule_id` is added, and the plan says `pharn-review.md` is a command outside the capability walk. No finding.
- **Trust propagation (P2):** nothing untrusted steers a decision; audit trails and earlier findings were treated as DATA. No finding.
- **One axis / no sibling imports (P3):** every edit is prose; the new cites go to root docs and to the owning probe directory. No finding.
- **Determinism (P5):** every branch is an exit code or a closed-table membership, and the fallback is the human. No finding.
- **Smallest increment (P7):** the plan grew from eight paths to ten, but by the same defect family the increment exists to fix, at the maintainer's explicit choice; the earlier bundling note stands. No new finding.

## Prose summary

Run 1's substantial concern — that the plan's own sweep was too narrow for the defect it names — was resolved by amendment rather than argued away, and v2 is measurably better grounded: the two sites are in, the query list states what was actually run, the coverage boundary names what is still unswept (`.github/**`, `.dev/memory-bank/**` beyond the anchor phrases, root config files), and the one closed universal the plan itself had introduced (E7) is in open form.

What remains is small. E7 would add a mirrored file name to README, and the bundle silently expires a "PENDING" note in an older audit-trail file. Both are handled inside the plan's stated latitude and its declared files, so neither needs a re-plan. The residual risk this stage cannot reduce is the one the plan already names and the `model-routing-limit` precedent records: the version bump and CHANGELOG entry assert that trusted-doc edits exist, and nothing detects a patch the human skips.

**ADVISORY VERDICT (run 2, plan v2): 2 concerns raised (0 blocking-severity, 0 important, 2 minor) — for the human to weigh before /pharn-dev-build. Run 1's five concerns are dispositioned above. Nothing here gates the build; this is model judgment, and the only deterministic stop in this stage (Step 1b) came back GREEN.**
