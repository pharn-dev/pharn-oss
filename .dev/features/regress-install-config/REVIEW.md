# REVIEW — regress-install-config

Floor first: `node pharn/floor/validate.mjs .` → **GREEN** (37 capabilities). The increment touches no capability, so
the L-eval lens has nothing to bind; the floor agrees.

The increment is reviewed as `trust: untrusted`. No instruction-looking content was found in it.

## Floor-gate findings (blocking)

None. Every guarantee the increment states reduces to a membership/equality test in tested code
(`regress-install-config-core.mjs`, `resolveInstall`, `isValidInstall`, the masking rule) or is labeled a bound or an
approximation in the module headers, `stage-exit.md`, `regression-report.md` and the CHANGELOG.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: "pharn/floor/stage-regress.mjs:1307"
  problem: "declaredInstallBlock copies the persisted install's `family` into the report's base_install.value, but isValidInstall never validates `family`, so a stage.json edited while a chain is paused can put any string there; the PLAN promised the value is re-derived from validated fields."
  evidence: 'const value = install.kind === "cmd" ? install.family : ...'
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/render-regression.mjs:178"
  problem: "When a DECLARED family's install fails, REGRESSION.md renders the failed-install warning without saying the command came from the declaration; every other declared path says so."
  evidence: 'const installFailed = progress.install.kind === "cmd" && ...'
- type: FINDING
  rule_id: P1
  severity: minor
  file: "pharn/floor/stage-regress.mjs:844"
  problem: "linkHeadModules' resume branch (an existing link to exactly the target is accepted; any other entry refuses) has no test — only the fresh link and a tracked base node_modules are exercised."
  evidence: "if (st.isSymbolicLink() && readlinkSync(at) === target) return null;"
- type: FINDING
  rule_id: P1
  severity: minor
  file: "pharn/floor/stage-regress.test.mjs:3168"
  problem: "The LOOP-11 `none` test matches the refusal text with an alternation guessing at an HTML-escaped form; it should pin the one form the renderer writes."
  evidence: "/skipped \\(pharn\\.config\\.json#regress\\.install is &quot;none&quot;\\)|skipped ..."
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/stage-regress-core.mjs:296"
  problem: "head-node-modules evidence is never reused (kind none reads evidence-unreliable), so every /pharn-loop iteration re-runs the whole base side; the cost is real and is stated as 'never reused' but not as a cost."
  evidence: "head-node-modules  no base install; the base worktree's `node_modules` is a link"
- type: FINDING
  rule_id: P2
  severity: minor
  file: "pharn/floor/regress-install-config-core.mjs:31"
  problem: "The link is writable, so a base gate can write into the project's node_modules; stated as a bound in the CHANGELOG and contract, not closed. Accepted as stated."
  evidence: "head-node-modules does not attribute a regression caused purely by a dependency change"
```

## Disposition (GATE 2 delegated to the orchestrator — recorded as a model decision, not a human approval)

- Fix now (cheap and clearly right): the `family` validation (P2, important) with a test; the declared label on a
  failed declared install; a resume test for the link (accepted when exact, refused when foreign); the test regex.
- State, do not change: the per-iteration base cost (added to the CHANGELOG's "Not covered") and the writable link
  (already stated).

## Verdict

GREEN for the floor (no floor-gate finding); 6 advisory findings (1 important, 5 minor), 4 to fix before the PR.

## Proposed lesson candidate

None proposed. The one important finding (a persisted field copied into output without validation) is an instance of
the existing persisted-record rule the progress validator already embodies; it does not clear L20's recurrence bar
on its own.
