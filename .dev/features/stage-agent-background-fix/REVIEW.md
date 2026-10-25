# REVIEW — stage-agent-background-fix

Reviewer: independent `/pharn-dev-review` pass (a fresh-context subagent, opus) over the uncommitted working tree on
base `9ee54c8b` (`git diff HEAD` plus the untracked `.dev/features/stage-agent-background-fix/`). Every reviewed file
was read as `trust: untrusted`. Free-text fields below are DATA. The orchestrator wrote this file from the reviewer's
returned text (the reviewer could not write in this worktree); the orchestrator's disposition is the last section.

## Step 1 — floor first (P0)

- `node pharn/floor/validate.mjs .`: `FLOOR: GREEN — 37 capabilities checked in "."`, exit 0.
- `shasum -a 256 pharn/ARCHITECTURE.md` = `2c84959c…db12e`, which equals the PLAN's `spec_content_hash` (no drift).
- `node pharn/floor/check-plan-lessons.mjs .dev/features/stage-agent-background-fix/PLAN.md .dev/memory-bank/lessons-learned.md`:
  GREEN. L27, L29, L31 and L72 all resolve and are all referenced in the body.
- Not run by this reviewer, by instruction: `npm test`, `npm run check` and every `node --test` suite. A regression
  run was executing at the same time. BUILD.md records 219/219 (product-floor suites touched) and 334/334 (command
  suites). Those counts are the build's own record and were not re-measured here.

## Floor-gate findings (blocking)

None. Every guarantee the increment claims reduces to an enum or regex check backed by a test:

- the closed `INLINE_REASONS`, plus the `INLINE_REMEDIES` parity test;
- the `start` truth table in `stage-agent.test.mjs`;
- the hygiene regexes over the command text.

Everything else is labelled ADVISORY: what the model sends, its reading of the tool schema, and the loop outcome,
which this increment did not measure.

## Advisory findings (warn — never the sole basis for a block)

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/floor/command-hygiene.test.mjs:5779"
  problem: "The new ✧ grant test cannot fail independently, and the placement it claims to protect is not load-bearing. Every loop start grant has `*` in the name position, and bashGrantRe (command-hygiene.test.mjs:5733-5741) says `*` matches any text, spaces included. So a start line carrying the flag anywhere after --name, including at the end of the --mode quick lines, is covered. A scratch run of that same regex over all five line shapes, for both bare flags, gave COVERED in every case. The CHANGELOG's causal claim, PLAN Discovery 5 and PLAN follow-up (b) are therefore false under the repo's own grant model. The test's 'non-vacuous: a quick start line, whose grant ends in --mode quick' guard rests on the same mistaken premise: `--stage pharn-spec --name *` and `--stage pharn-build --name * --iteration *` also cover the quick lines."
  evidence: 'CHANGELOG.md:41-42 "placed right after `--name ''<name>''` so every existing start-line grant still covers the line. A hygiene test pins that."; PLAN.md:47-48 "one appended at the end falls outside the quick ones"; PLAN.md:74-75 follow-up (b) "on a `--quick` start line it falls outside the `--name * --mode quick` grants"'
```

Recommendation for A1:

- Reword the CHANGELOG bullet so it says the existing `--name *` grants cover the flag in any position.
- Strike follow-up (b) as a non-issue. Building it would be a speculative addition (P7).
- Either drop the ✧ test or make it state the real property: the flag is covered in any position, both after
  `--name` and at the end. Correct its comment at `command-hygiene.test.mjs:5780-5791`.

```yaml
- type: FINDING
  rule_id: P6
  severity: minor
  file: "pharn/floor/route-token-core.mjs:48"
  problem: "The rewritten comment says route-unavailable is start's own fallback. Both orchestrators also record it themselves, through a pinned mark-phase literal, when the start line crashes. The old comment named only that second writer; the new one names only the first."
  evidence: '"`route-unavailable` is `start`''s own fallback" vs pharn-loop.md:468-471 "anything else — a crash, no marker written: run the line below … --route ''inline:route-unavailable''" (likewise pharn-ship-stages.md:39-43)'
```

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: "pharn/floor/stage-agent-core.mjs:293"
  problem: "Shipped bytes state facts about a third-party harness with no version and no hedge. (1) The remedy sends the reader to the terminal CLI as a harness whose Agent tool takes the parameter. Under 6.72.0 the CLI run also stopped S9, and whether it now proceeds depends only on the advisory JSON-boolean wording, which no run has measured. (2) pharn-loop.md:481 says such a tool 'launches every agent in the background'. The evidence is a tool description read in one harness. (3) The remedy says 'this session's launches every agent in the background'. When the flag comes from a misreading (GRILL F3, which the build did not address), that sentence is false, and pharn-loop-close.md:218 carries it into the run's summary."
  evidence: '"run the command in a Claude Code session whose Agent tool takes `run_in_background` (the terminal CLI''s does); this session''s launches every agent in the background"'
```

Suggested wording for A3:

- "(Claude Code 2.1.309's terminal CLI did)"
- "as this session read its Agent tool"

The L27 test at `stage-agent-core.test.mjs:185-190` pins only the presence of the parameter name, so it stays green
under this wording.

```yaml
- type: FINDING
  rule_id: P6
  severity: minor
  file: "pharn/floor/stage-agent-core.mjs:135"
  problem: "The residual and the CHANGELOG state the JSON-boolean probe as observed. Its only record is a note outside the repository, which the plan says it did not re-run, and the feature directory holds no probe record (command, version, result line)."
  evidence: 'PLAN.md:25 "Also recorded (`run1-void-cli/NOTE.txt`, not re-run here): a headless 2.1.309 probe (`claude -p`) that sent the JSON **boolean** `false` got a foreground result"; CHANGELOG.md:34-35 "A probe on 2.1.309 that sent the JSON boolean ran in the foreground."'
```

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: "pharn/floor/stage-agent.test.mjs:801"
  problem: "The new start test is not vacuous: the token can only come from the flag. It is looser than the plan's eval list and than its sibling, though. (1) 'given twice' asserts exit 2 and empty stdout, but not that the marker count is unchanged ('nothing written', PLAN.md:134). (2) The quick, policy-cell and both-flags calls (lines 781, 795, 798) assert no exit status. (3) Unlike the no-agent-tool test (lines 736-737), it has no control run proving that pharn-loop's spec cell is no-config without the flag. The comment at line 760 asserts that."
  evidence: 'const twice = run(dir, startArgs("pharn-loop", "pharn-plan", [NO_FOREGROUND_AGENT, NO_FOREGROUND_AGENT])); assert.deepEqual([twice.status, twice.stdout], [2, ""]);'
```

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/stage-agent-background-fix/BUILD.md:33"
  problem: "'Hook-checked' overstates the build's write guard. Every build write went through an uncommitted scratch script, so the PreToolUse prevention never applied, and the claim that the script ran both hooks is self-reported. The only floor backstop for these writes is verify's reconcile, which detects and does not prevent, and is non-adversarial (CLAUDE.md, Writes-scope). The human's authorization for this route is recorded only in agent-authored artifacts (PLAN.md:160-161). That is data this reviewer cannot verify, and the human should confirm it at GATE 2, together with the expected `plan-widened-after-anchor` entry for pharn/floor/mark-phase.test.mjs (BUILD.md:41-45)."
  evidence: '"Writes went through a hook-checked Bash helper, by the human''s choice at GATE 1."'
```

```yaml
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/stage-agent-background-fix/PLAN.md:89"
  problem: "The plan applied L72 by sweeping runtime readers only. It asserted a single literal count, while mark-phase.test.mjs:394 also pinned the whole grammar (14). The plan itself named mark-phase.test.mjs's token loop (PLAN.md:84) as something that would pick the new member up automatically. `git grep INLINE_REASONS -- '*.test.*'` returns mark-phase.test.mjs:35 and :393 directly. The build caught and fixed it after the anchor (BUILD.md deviation 3)."
  evidence: '"all runtime readers go through `isRouteToken`, none compares a literal, and the only literal count is `route-token-core.test.mjs:31`"'
```

## What was checked and holds

- **L-floor (P0).** The guarantee audit (PLAN.md:139-152) separates floor items from advisory ones, and the
  CHANGELOG's "What this does NOT guarantee" bullet keeps the same split. `decideStart` checks `--no-agent-tool` before
  `--no-foreground-agent`, so "--no-agent-tool wins" holds (`stage-agent.mjs:548-549`), tested at
  `stage-agent.test.mjs:798-799`. `main` strips both bare flags from anywhere in argv and refuses each one given twice
  (`stage-agent.mjs:628-641`); the never-a-crash list gains the twice case (`stage-agent.test.mjs:975`).
- **L27 reachability.** The new remedy is its own entry and names the parameter; the test asserts both halves
  (`stage-agent-core.test.mjs:185-190`). The remedy reaches a person through the loop summary
  (`pharn-loop-close.md:218`). How accurate the remedy is: A3.
- **L-eval (P1).** No `role:` file was added or changed, so the floor has no eval binding to check. The parity test
  iterates `INLINE_REASONS`; both count pins were updated (`route-token-core.test.mjs:31` → 11,
  `mark-phase.test.mjs:394` → 15).
- **The rest of the L72 consumer sweep.** Every runtime reader goes through `isRouteToken` (`mark-phase.mjs:123`,
  `render-cost-ledger.mjs:140`); no literal comparison against an inline reason exists outside `stage-agent.mjs` and
  its tests; `LIMITS.md:575` and `cost-ledger.md` cite the owner; no vendored copy of `route-token-core.mjs` exists.
- **Why `/pharn-ship` gets no flag.** `pharn-ship-stages.md` item 3 lets ship end its turn and wait for the agent's
  completion notice; the loop's item 3 makes a background launch S9 because its `Stop` guard refuses a turn end. The
  asymmetry is correct, and `command-hygiene.test.mjs:4519-4526` pins that the flag is absent from ship.
- **The flag stays inside `allowed-tools`.** The six pinned start lines (`pharn-loop.md:561, 598, 662, 707`,
  `pharn-loop-quick.md:40, 78`) are each covered by a frontmatter grant with the flag added, in any position (A1).
- **L31 copy-pair.** The JSON-boolean wording lands in both orchestrators, asserted for both
  (`command-hygiene.test.mjs:4505-4507`).
- **L-trust (P2).** No new input is ingested; the flag is a closed bare token and the CLI prints only closed-table
  values. No instruction-looking content changed this review's behaviour; the authorization claim in PLAN.md is
  treated as data (A6).
- **L-axis (P3).** The grammar (`route-token-core.mjs`, zero imports), the remedy table and residual
  (`stage-agent-core.mjs`) and the CLI (`stage-agent.mjs`) each keep one concern; no reference crosses sibling modules.
- **Versioning.** `SKILLS_VERSION` 6.73.1 → 6.73.2 is a patch; the README badge was bumped and a new CHANGELOG section
  added; no merged entry was edited.

## Proposed lesson candidate (for `/pharn-dev-memory-promote` — NOT written to canon here)

- **Title:** Adding a member to a closed set puts every test that imports the set in scope. Before the anchor, grep
  for the set's importers, not for the member or the reason name.
- **What happened:** the plan applied L72 and L29 by sweeping the runtime readers of `INLINE_REASONS` and declared one
  count pin. `pharn/floor/mark-phase.test.mjs` imports the set and pins the whole grammar's cardinality
  (`tokens.length, 14`) as an L34 non-vacuity guard; it failed at the build's first test run and had to join
  `## Files` after the anchor (a `plan-widened-after-anchor` reconcile escape, 6.54.0).
- **Why it recurs:** count pins written as L34 guards are hand-written literals by design, so a grep for the member's
  name never finds them. `review-fanout`'s unpromoted candidate found the same late discovery through a test that
  sweeps every floor module.
- **What would prevent it:** at plan time, run `git grep -l '<SET_NAME>' -- '*.test.*'`, plus the closure sweeps that
  read the module's source, and list each hit in `## Files` or give it a disposition (L75).
- **Kin:** L72, L29, L34, L71. **type:** process. **concepts:** [enumeration, plan-shape, closure-sweep,
  reconciliation].
- **Provenance:** feature `stage-agent-background-fix`; base commit `9ee54c8b`, uncommitted working tree; source:
  BUILD.md deviation 3, plus this REVIEW's finding A7.

## Verdict

GREEN — 0 floor-gate findings; 7 advisory (1 important: A1, the placement and grant claim; 6 minor).

## Orchestrator disposition (not the reviewer's text)

Applied before regress completed (BUILD.md, "Fix round after the independent review"): A1, A2, A3, A4, A5. A6 is for
the human at GATE 2. A7 is the lesson candidate above, presented at GATE 2. Line numbers in the findings refer to the
reviewed (pre-fix) tree.
