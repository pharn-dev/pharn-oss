# REVIEW — ac-gate-plan-scope

`/pharn-dev-review` of the increment `/pharn-dev-build` produced (the AC gate: a PLAN can no longer scope the test
infrastructure it is judged by, and an unrelated test anomaly no longer voids the AC record — 6.29.0). The increment is
`trust: untrusted`; every quoted string below is DATA. The review ran inline in the building session (the batch
preamble forbids subagents), on the tree `/pharn-dev-verify` passed — so it is the author's own second reading, not an
independent one, and should be weighed as such.

## Floor first (P0)

`node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked in "."`. The increment adds no `role:`
capability, so no `enforces` binding is new; `/pharn-dev-verify` ran every gate green (`VERIFY.md`).

**Verdict: GREEN at the floor — 0 floor-gate (blocking) findings. 12 advisory findings: 4 important, 8 minor.**

## Floor-gate findings (blocking)

None. No guarantee the increment states lacks a floor reduction or an `advisory` label in a way a checker could confirm;
no capability misses an eval binding; no sibling reference.

## Advisory findings

### L-floor (P0)

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: "pharn/floor/ac-tests-lock.mjs:35"
  problem: "The rollback statement says a pre-6.29.0 floor's AC gate reads a /4 lock as INCONCLUSIVE; 6.28.2's ac-gate-core maps an unusable lock to `ac-tests-modified` (EVIDENCE — verify FAIL, /pharn-loop S13). Fail-closed either way, but the named verdict is wrong at three sites: this header, pharn/pharn-contracts/ac-tests.md:262 and PLAN.md:402."
  evidence: 'git show HEAD:pharn/floor/ac-gate-core.mjs — `if (!loaded.ok) add("ac-tests-modified", loaded.why);`'
- type: FINDING
  rule_id: P0
  severity: important
  file: "README.md:640"
  problem: "'A plan may not put any of those … in the build's scope' covers the chained scripts and the `jest` key, which live in package.json — a file a plan MAY name (an advisory NOTE only, by design A3)."
  evidence: "the scripts those chain to (`npm run test:unit`), the files they name …, a `jest` key in `package.json`, and a root `.npmrc`… A plan may not put any of those, or the feature's own lock, in the build's scope."
- type: FINDING
  rule_id: P0
  severity: important
  file: "CLAUDE.md:396"
  problem: "'safe to leave advisory' overstates the composition: it shows that every part of package.json the pin READS is compared at verify and cannot be re-pinned through the build's scope; parts the pin does not read (a `mocha` key, `config`) stay changeable in a plannable package.json, which the NOT-caught list states."
  evidence: "`NOTE —` line and never change the exit code — safe to leave advisory only because the lock is out of the build's scope"
- type: FINDING
  rule_id: P0
  severity: important
  file: "pharn/floor/stage-verify.mjs:228"
  problem: "Design bound, measured, not fixed here (P7): /pharn-verify's chain phase re-runs check-plan-spec-agree only, never the mapping check, so a run that ignores the plan check and the test-stage gate (both RED for the lock route) and sets the scope itself still reaches verify PASS over a lock-scoped build. A5 names this; every shipped route reads the test-stage gate first and /pharn-loop re-reads it after each build. Candidate follow-up `verify-rechecks-test-stage` for the maintainer."
  evidence: "BUILD.md, wE after: 'forced past both: verify PASS (A5's bound — /pharn-verify does not re-run the mapping check)'"
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/pharn-contracts/ac-tests.md:104"
  problem: "'the build cannot re-pin what it changed there' (and :447 'cannot re-pin them') holds through the build's write scope only; a Bash rewrite of the lock is detected by reconcile, never prevented — the contract's reconcile paragraph says so, these two sentences drop it. Likewise :99 'so no build starts over it' holds for a build that reads the test-stage gate."
  evidence: "and since 6.29.0 the build cannot re-pin what it changed there, because the lock is kept out of its scope"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".claude/commands/pharn-plan.md:323"
  problem: "The Floor claim names 'no file a level gate's script names' unconditionally (also pharn/pharn-contracts/ac-tests.md:559); when the tree cannot be read the checker prints a NOTE and checks none — its GREEN line says so since the build's pre-review correction, these two claims do not."
  evidence: "and no root config the lock pins, no file a level gate's script names, and neither this feature's AC-TESTS.md nor its lock is in the build's scope"
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/test-infra-core.mjs:143"
  problem: "EXECUTED_EXTENSIONS holds `.sh` but not `.bash` or `.zsh`, which a test chain runs the same way; a script-named `tools/run.bash` is not pinned, covered only by the NOT-caught list's generic 'an extension outside EXECUTED_EXTENSIONS'."
  evidence: 'export const EXECUTED_EXTENSIONS = Object.freeze([".cjs", ".cts", ".js", ".jsx", ".mjs", ".mts", ".sh", ".ts", ".tsx"]);'
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/test-infra-core.mjs:732"
  problem: "For a /3 lock over a tree the /4 pin cannot compute (a symlinked `.npmrc` or script-named file, a chain past 8 hops), testInfraReds returns the refusal as `changed`, not `unpinned`, while README.md's 6.20–6.28 bullet says such a lock reads `test-infra-unpinned` 'only if' its scripts chain, name a file, or read a jest key or a package-manager config. Same EVIDENCE verdict; the reason name and the 'only if' are off in that edge."
  evidence: "if (!now.ok) return { changed: [`the test infrastructure cannot be pinned now: ${now.reason}`], unpinned: [] };"
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/pharn-contracts/test-results-record.md:193"
  problem: "'read one as their verdict only when it sits in a file an AC maps' predates the build's pre-review correction: the rule is a file an AC maps, in the record of a gate that AC's level reads (ac-tests.md and verify-report.md say so; this sentence does not)."
  evidence: "The red run and the AC gate read one as their verdict only when it sits in a file an AC maps, and report the rest"
- type: FINDING
  rule_id: P0
  severity: minor
  file: "CHANGELOG.md:[6.29.0]"
  problem: "'no install is invalidated' is true of installs, but an in-flight 6.20–6.28 lock whose level gates chain, name a file, or read a jest key or a package-manager config reads RED until /pharn-test re-runs — stated two bullets later under Migration, not beside the MINOR rationale."
  evidence: "(MINOR: a new checker kind, new pin members, lock schema `/4` with `/3` still read, a new record field — no install is invalidated)"
```

### L-eval (P1)

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: "pharn/floor/check-ac-tests.test.mjs:ARTIFACT_HOOK_ROWS"
  problem: "The measured `opens` column pins the write guard's CURRENT spelling behaviour; the parallel write-guard increment (M4+M7) edits the same hooks, so if its merge changes how a spelling resolves, this table fails and must be re-measured. That is the design (L37 — a probed table, never a universal claim), and the separate invariant 'every spelling that opens is RED' would still hold — a merge-order note."
  evidence: 'const ARTIFACT_HOOK_ROWS = [ [LOCK, true, true], … ["pharn/features/demo/ac-tests.lock.json", false, true], …'
```

No capability, so no eval binding to check. Every new export has a test, and every closed set is iterated per member
with a control (the token pass per clause and per PM × word, the L59 path-kind table, both lock schemas both ways, the
anomaly model at the record, the red run, the AC gate, the CLI NOTE and both renderers).

### L-trust (P2)

No instruction-looking content in the reviewed artifacts changed this review. The H2/M6 review text the task quoted was
treated as DATA and each claim re-measured before use (`PLAN.md`, "Trigger"). The new untrusted fields — `anomalies[]`'
ids, titles and reasons, and `unmapped_anomalies[].examples` — reach `VERIFY.md` and `RUN-REPORT.md` fenced (hostile
content tested), the verify report as data compared canonically, and the red run's `NOTE —` lines JSON-quoted, the same
shape as the existing `RED-AS-REQUIRED` lines; no verdict reads them. A script-named path printed in a `--check` RED is
constrained by the candidate rule (no whitespace, quote, bracket or shell character, at most 1024 characters). No
guaranteed decision rests on a tainted field.

### L-axis (P3)

No sibling reference. `unmappedAnomalies` sits in `red-run-core.mjs` beside `observeAc` on purpose: its reading rule
must mirror the match rule's (the pre-review correction was exactly that drift). `check-ac-tests.mjs` spells the lock's
name as a parity-tested literal rather than importing `ac-tests-lock.mjs`'s load graph.

### Cost, for the maintainer (P7) — the proportionality question GATE 1 asked to be flagged

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: "pharn/floor/test-infra-core.mjs:102"
  problem: "The token pass pins a SOURCE file a test-reachable script names literally: measured, a PLAN naming the feature's own src/x.js is test-infra-in-plan RED when pretest runs `node --check src/x.js`, and an edit of it is --check RED. A file a chained step WRITES under a literal name (a cp destination) can likewise make --record-red-run refuse (composed from tested parts, not measured end to end). Both fail closed; the remedy is a test-infra increment that names a directory, a glob or a config instead."
  evidence: "BUILD.md, 'cost — pretest names src/x.js': plan RED test-infra-in-plan for the feature's own src/x.js; --check RED after an edit of it"
```

## Lessons (P7)

One candidate, for Step 2b (proposed here, never written to canon by this stage):

- **LC1 — A pin is only as strong as the scope around its record.** The lock pinned the tests and, since 6.20.0, the
  test infrastructure — and for twelve releases a PLAN could scope the build to the lock itself, so the build re-pinned
  whatever it changed and every content-hash check agreed with the forgery (the review's H2, reproduced in `PLAN.md`,
  "Trigger"). The general failure: adding a record that a later gate compares the tree against, without adding that
  record to the judged stage's exclusion set in the same increment. L43 names the agreement bound; this names where it
  bites — the writer's scope. Remedy shape: when a record is introduced, the checker that bounds the judged stage's
  scope names it (here `ac-artifact-in-plan`), with a ★ HOOK test through the real guard.

Deferred, not dropped: **fail-closed at the wrong granularity is a denial of service** — M6's whole-record refusal
turned one unrelated duplicate into an unmeasurable AC gate for every feature (`PLAN.md`, Part B).
