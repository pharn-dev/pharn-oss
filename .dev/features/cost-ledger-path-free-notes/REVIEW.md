# REVIEW — cost-ledger-path-free-notes

Floor first: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked`. Everything below is advisory.

Reviewed diff: `pharn/floor/render-cost-ledger.mjs` (2 string literals + a 3-line comment), `pharn/floor/render-cost-ledger.test.mjs` (+7 tests), `CHANGELOG.md`, `SKILLS_VERSION` 6.8.1 → 6.8.2, README badge.

## Floor-gate findings

None.

- **L-floor (P0):** each claim in the CHANGELOG entry is either tied to `ABS_PATH_RE`/`check-cost-ledger.mjs` (enum-regex) or bounded in writing: `sessionId` is still interpolated, and the sibling emitter is out of scope. No unbounded guarantee.
- **L-eval (P1):** no capability or `rule_id` changes. The checker's floor behavior is pinned by the new tests. The negative control (D) proves `ABS_PATH_RE` still fires on `coverage_note`.
- **L-trust (P2):** no new untrusted input. Nothing in the reviewed files changed this review's behavior.
- **L-axis (P3):** the production diff has one reason to change (note wording). The test imports `check-cost-ledger.mjs` and `render-cost-record.mjs`, both from `pharn/floor/`, the same module, so this is not a sibling reference.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: "pharn/floor/render-cost-record.mjs:228"
  problem: "The sibling emitter has the same pattern: two `unavailable` notes interpolate `projectsDir` / `hits[0]`. /pharn-ship Step 3b says to embed that block verbatim into ship-record.json, so a local path lands inside the attested record. No checker applies ABS_PATH_RE there, so nothing REDs. It is a silent leak rather than a refused artifact."
  evidence: "return unavailable(`no transcript found for session ${sessionId} under ${projectsDir}`, sessionId);"
- type: FINDING
  rule_id: P1
  severity: minor
  file: "pharn/floor/render-cost-ledger.test.mjs:413"
  problem: "The L29 enumeration pins the five branches the author listed. It does not bind that list to the source, so a sixth `shell(` call added later would not join it. Today the module has exactly 5 `shell(` calls, so the list is complete now, but nothing keeps it complete."
  evidence: '["no-session", "no-dir", "multi-dir", "empty-selection", "no-usage"]'
- type: FINDING
  rule_id: P7
  severity: minor
  file: "pharn/floor/render-cost-ledger.mjs:448"
  problem: "`sessionId` is still interpolated in four notes. An absolute-path-shaped --session still yields a checker-RED ledger. This is stated in PLAN and CHANGELOG as caller input and out of scope, and is recorded here so it is not lost."
  evidence: "no transcript found for session ${sessionId} under the configured projects directory"
```

## Proposed lesson

None proposed. The defect is a one-off interpolation, and the related lessons (L29, L51) already cover the testing shape used. The sibling-emitter finding is a follow-up fix, not a recurring mechanism failure.

**Verdict: GREEN, with 0 floor findings and 3 advisory findings.**
