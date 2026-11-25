# REVIEW — core-371-followups

The reviewed increment is `trust: untrusted`. Its diff: the build's 9 paths (`git diff HEAD`) and the two
human-applied, pre-anchor commits (`.claude/settings.json`, `.claude/hooks/set-writes-scope.cjs`, plus their
`pharn-install.json` regeneration).

## Step 1 — Floor first

`node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. Standing verdicts: regress
`no-regressions` (`regression-report.json`), verify `PASS` (`verify-report.json`, all seven gates exit 0, reconcile
`CLEAN`).

## Floor-gate findings (blocking)

None.

## Advisory findings

### L-floor → P0

Every edited sentence was probed against its live source, as L64 asks for restatements, including each CHANGELOG
restatement:

- "since 7.7.0 a full `/pharn-loop` routes the full grill": `ROUTE_POLICY["pharn-loop"].full["pharn-grill"] = AGENT`.
- "a `--quick` run invokes `/pharn-grill <name> --quick` inline": `pharn-loop-quick.md:74-76` and
  `pharn-ship-quick.md:76-78`.
- "pharn-cli has installed the `.claude/agents/pharn-*.md` definitions since 0.20.0": pharn-cli `CHANGELOG.md` 0.20.0,
  plus `pharn-install.json` `"surface":"agents"`.
- "`parseResults` … defined in `per-test-results-formats.mjs`": `:392`.
- "six paths": `CONTROL_SURFACE` has 6 entries.
- "fail-closed default holds in an installed project only while a PHARN run is open": the `enforce-writes-scope.cjs`
  "THREE POSTURES" header.
- "`PHARN_STOP_GUARD_MAX` overrides the Stop guard's default of 3": `require-loop-record.cjs:121, 198-201`.
- "pharn-cli copies `settings.json` only when a project has none": pharn-cli 0.20.0 entry ("only when you have none,
  as before") and `require-loop-record.cjs:25-26`.

No edit claims a new guarantee. The settings comment describes a FLOOR hook and now under-claims less. One finding:

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".claude/commands/pharn-grill.md:127"
  problem: "The --floor-only section's closing sentence still tells an orchestrator what to do, although the section now opens by saying no orchestrator invokes the form; it is conditional and kept by the brief, but a reader may see a contradiction."
  evidence: 'Run inside an orchestrator, Step 4''s "end your turn" does not apply: return to it.'
```

### L-eval → P1

No capability, rule or `enforces` change. The one test edit re-points an existing presence pin
(`command-hygiene.test.mjs`) at the corrected sentence. It still asserts the mode line, the skip literal and the scan
pin. One finding, the grill's testability concern restated:

```yaml
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: ".dev/floor/command-hygiene.test.mjs:2752"
  problem: "The old pin asserted a descriptive claim about which orchestrator invokes the mode and kept that claim GREEN for seven minor versions after ROUTE_POLICY changed; the new pin is again a regex over prose, not a derivation from ROUTE_POLICY, so the same freeze can recur."
  evidence: "assert.match(body, /No orchestrator invokes this form since 7\\.7\\.0/);"
```

### L-trust → P2

No finding object is emitted by the increment. The pharn-cli CHANGELOG (another repository) was read as data and
corroborated in-repo. Nothing in the reviewed files tried to steer this review.

### L-axis → P3

Each file still changes for one reason. No sibling reference was added: `check-regress.mjs` comments name
`per-test-results-formats.mjs`, which it already imports. One style finding:

```yaml
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: "pharn/floor/check-regress.mjs:101"
  problem: "Three edited lines (check-regress.mjs:101 and :665, pharn-grill.md:112) now run past the ~120-column wrap their neighbours keep; no gate checks comment or prose width, and the files already hold such lines, so this is readability only."
  evidence: "// `buildRecord` and per-test-results-formats.mjs's `parseResults` — one grammar (L35), with the gate's exit from each map as that record's exit. For"
```

## Proposed lesson candidate (not written to canon)

There is a candidate, but it does not clear L20's bar on this evidence (first observed occurrence). It is recorded for
`/pharn-dev-ship` Step 2b as deferred: "a presence pin over a descriptive claim (who invokes a mode) freezes it: when
its referent table moved (ROUTE_POLICY, 7.7.0) the pin kept the stale sentence green, so pins on such claims should
derive from the table, not regex the prose". Source: this REVIEW, finding P1 above. Provenance would be captured by
`/pharn-dev-memory-promote` if a human takes it.

## Verdict

GREEN — 0 floor-gate findings, 3 advisory (all minor). This verdict is for the human at GATE 2. It does not certify the
increment beyond the floor gates it cites.
