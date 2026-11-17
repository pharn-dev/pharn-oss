# REVIEW — stage-effort-routing

- increment: commits `02c3a530` (the human-authored `pharn/LIMITS.md` §8 edit), `f75b2ea0` (build), `fad25dbc`
  (regress + one test-header comment), `795163b2` (verify), against base `155d1205`.
- floor first (Step 1): `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. Verify PASS
  (all seven gates 0), regress `no-regressions`.
- reviewer: the session's model (opus), the same agent that planned and built the increment, inline inside
  `/pharn-dev-ship`. That is not an independent read, and this file says so; the PR's CI and the maintainer's review
  are the independent ones.
- the reviewed increment is `trust: untrusted`. No instruction-looking content in it changed this review's behaviour.

**VERDICT: GREEN — 0 floor-gate findings, 3 advisory findings (all minor).**

## Floor-gate findings

None.

- **L-floor (P0).** Each new claim reduces or is labelled. FLOOR (enum/regex): `start` prints `effort:<level>` only for
  a member of `AGENT_EFFORTS` (`effortLine`, and `routeFromResolved` sends an out-of-set effort inline, both tested);
  `AGENT_EFFORTS` equals `check-model-config.mjs`'s `EFFORT_ENUM` (the ✧ parity test, with discriminating mutants).
  ADVISORY, and labelled so in `stage-agent-core.mjs`'s header, `pharn/LIMITS.md` §8, both close parts and the
  CHANGELOG: that the Agent call carries the effort, and what effort a stage ran at. The old struck claim ("effort is
  routed") is replaced by an open, conditional form, not by a new closed claim (L47). `EFFORT-PROBE.md` labels its
  measurement as one direct Agent call, not a routed stage.
- **L-eval (P1).** No capability or `rule_id` is added, so no eval pair is owed; `validate` agrees. The tests carry a
  negative control per new assertion: the parity test's two mutants and its missing-line case, the item-2 and close-part
  pins' in-memory edits (`stage-agent-type.test.mjs`), and `decideRoute`'s out-of-set efforts.
- **L-trust (P2).** The effort line is printed by floor code from a config value the checker validated, as a closed
  grammar; the orchestrator copies a member of a five-value set into a tool parameter. A poisoned config can at most
  select a different valid level — the same bounded blast radius `check-model-config.mjs` already states for models.
  No free-text field reaches a decision. The Agent tool's returned text stays THREAT-MODEL §5's residual, unchanged.
- **L-axis (P3).** `route-token-core.mjs` now holds two grammars of one kind (what a routed stage is requested with)
  and its header restates that one axis; it still has zero imports, and the ledger readers that load it gain one frozen
  array and one function. No sibling reference is added.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".claude/commands/pharn-loop.md:596"
  problem: "Item 2's lead-in still reads 'the Agent call, whatever parameters your Agent tool lists', a 6.74.0 phrase about run_in_background, while the same item now makes `effort` conditional on what the tool lists; a reader can take the two as contradictory."
  evidence: "2. **On start exit `0` only, the Agent call, whatever parameters your Agent tool lists:**"
- type: FINDING
  rule_id: P6
  severity: minor
  file: "pharn.config.json:2"
  problem: "The edited `_models_stages_note` still names `stage-agent.mjs route` as the run-time reader; since 6.43.0 the orchestrators call `start`, which now also prints the effort. Pre-existing wording, kept by this increment."
  evidence: "read at run time by pharn/floor/stage-agent.mjs route through that checker's resolve"
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/stage-agent-core.mjs:241"
  problem: "No run has exercised the commands' effort path: no routed stage has been started with `effort`, and the three-call order and the `effort not applied` note have never run, so the first routed loop on 7.20.0 is where the requested effort is first read from a stage agent's transcript."
  evidence: "agent-effort-param-absent — a harness whose Agent tool lists no `effort` (the terminal CLI 2.1.323's embedded"
```

None of the three blocks: the lead-in is pinned by `command-hygiene.test.mjs` (5) and changing it is a wording follow-up;
the config note's `route` predates this increment; the third is the named measurement follow-up.

## Lesson candidate

None proposed. The run's surprises were known ones: the isolated worktree refused the pinned shell forms (the batch's
known workaround, a node runner), and an Edit outside an active scope was denied by the writes-scope guard as designed.
Neither clears L20's bar for this run.
