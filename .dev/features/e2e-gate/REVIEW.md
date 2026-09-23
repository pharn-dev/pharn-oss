# REVIEW — e2e-gate

Floor first: `node pharn/floor/validate.mjs .` → **GREEN**. Everything below is advisory unless marked floor-gate.
Method: the four inline lenses plus one independent read-only reviewer agent (findings merged and attributed).

## Iteration 1

### Floor-gate findings

None.

### Advisory findings (the independent reviewer's, confirmed)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "CHANGELOG.md:47"
  problem: "'discovery and the stamps are byte-identical to 6.15.0' is false for stamps (fingerprints hash the installed floor files; head and log hashes differ); only the resolved gate set is unchanged, and the test named 'byte-identical' compares id lists."
  evidence: "With no e2e script, discovery and the stamps are byte-identical to 6.15.0."
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".claude/commands/pharn-verify.md:199"
  problem: "'run here and nowhere else' / 'regress never does' / 'verify only' contradict the explicit --gates path the same change keeps (an explicit e2e command IS run at regress); the true claim is 'never discovered at regress'. Also README:467, CLAUDE.md:321, gate-run-core.mjs:72, test-results-record.md:37."
  evidence: "run here and nowhere else."
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".claude/commands/pharn-loop.md:211"
  problem: "S4 still reads 'the allowlist ∩ package.json scripts is empty', but an e2e-only project now reaches S4 at regress with a NON-empty intersection; the empty-source-set message (gate-run-core.mjs:407) says the same. pharn-loop.md is not in the plan's ## Files (L1)."
  evidence: "gate discovery yields no gates (no `--gates`, and the allowlist ∩ `package.json` scripts is empty)"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".claude/commands/pharn-verify.md:201"
  problem: "'runs last' is false: structural eval-pair gates and reconcile run after e2e; the true order is 'last among the project gates, after build' (also README, CLAUDE.md, the CHANGELOG title)."
  evidence: "and they run **last**, after `build`"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".claude/commands/pharn-ship.md:270"
  problem: "The paragraph says the build gate is discovered 'the same way /pharn-verify Step 3a' does, then says it excludes e2e; /pharn-build Step 4 is prose, so neither statement is enforced."
  evidence: "The e2e gates in that allowlist run at `/pharn-verify` only; this build gate does not include them."
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: "pharn/floor/gate-run-core.mjs:369"
  problem: "The e2e drop at regress leaves no trace (style_skipped exists so a drop is never silent), and for {lint, e2e} + --skip-style the refusal blames --skip-style for the e2e drop."
  evidence: "--skip-style removed every discovered gate, leaving nothing to run"
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: "pharn/floor/gate-run-core.test.mjs:216"
  problem: "The parity test pins regress's brace copy to the full ALLOWLIST but not the hardcoded 'minus the e2e ids' clause; the ALLOWLIST header cites a stale pharn-regress.md:219-221 and says the prose copies are retired, which is false."
  evidence: "those prose copies are retired to a citation of this constant"
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: "pharn/floor/run-gates.test.mjs:1290"
  problem: "The E2E VERDICT test's status/verdict assertions hold in both cases because reconcile is red in the fixture; only the filtered failing_gates assertion tests the claim, and it has no all-green control."
  evidence: "assert.equal(r.status, 1, `${redId}: a red gate must FAIL verify (exit 1)`);"
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: "pharn/floor/gate-run-core.test.mjs:651"
  problem: "The base-side exclusion tests call resolveSet({side:'base'}), a path production never takes (the base copies the head spec); there is no runner-level regress test with an e2e script."
  evidence: "for (const side of SIDES) {"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "CHANGELOG.md:36"
  problem: "The entry implies the `verify: e2e` AC gap is closed, but nothing links an AC's verify level to a gate; a project with no e2e script still has nothing to run such an AC."
  evidence: "an acceptance criterion marked `verify: e2e` had nothing to run it"
```

**Verdict (iteration 1): GREEN — 0 floor-gate findings**; 3 important and 7 minor advisory findings, all taken
into one fix pass because each is a wording or test-strength fix inside the increment's own files (plus
`pharn-loop.md`, added to the plan).

## Iteration 2 — the fixes, re-reviewed

Floor re-checked: `validate.mjs` GREEN; regress `no-regressions`; verify PASS (clean map). Each finding:

- **"byte-identical" (CHANGELOG):** fixed — the claim is now "the resolved gate set is unchanged", with the stamp
  caveat stated; the test is renamed to match.
- **Absolute "only / nowhere else / never" wording:** fixed in pharn-verify.md, README, CLAUDE.md,
  gate-run-core.mjs and the contract — "never _discovered_ at regress; an explicit `--gates` string runs as
  written".
- **`/pharn-loop` S4:** fixed — the row names the e2e-only case, and `pharn-loop.md` joined the plan's `## Files`.
  The refusal message now says the regress set holds only e2e gates.
- **"runs last":** fixed everywhere to "after `build`, last among the project gates".
- **pharn-ship build-gate paragraph:** fixed — labelled advisory; it no longer asserts what `/pharn-build` runs.
- **Silent e2e drop / misattributed refusal:** fixed — `resolveSet` reports `e2e_excluded`, `init` prints it
  (stamp shape unchanged; `run-gates.mjs` joined the plan), pharn-regress.md renders it in REGRESSION.md from that
  output, and the `--skip-style` refusal names both causes. Tested per member and at runner level.
- **Parity test:** extended — a second ✧ test pins regress's "minus the e2e ids" clause to `E2E_SET`; the stale
  header cite is replaced.
- **Vacuous verdict assertions:** fixed — only the project-gate list is asserted, with an all-green control.
- **Base-side path production never takes:** covered — a runner-level `init --stage regress` test (head with an
  e2e script, base via `--spec-from`) asserts the ids, the `e2e_excluded` report and the untouched stamp shape.
- **AC `verify: e2e` gap:** fixed — the CHANGELOG states the bound (nothing links an AC's level to the gate yet).

**Verdict (iteration 2): GREEN — 0 floor-gate findings, 0 open advisory findings.**

## Proposed lesson candidate

None new. Finding 2 is the known P0 shape (an absolute "only/never" written over a rule with a documented
exception); finding 3 is L1 (a meta-doc the change invalidates, missing from `## Files`) — both already canon.
