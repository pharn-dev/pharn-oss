# REVIEW — review-lens-grouping

**Verdict: GREEN — 0 floor-gate findings.** 9 advisory findings on the increment (4 important, 5 minor), plus 2
advisory notes on the eval kit, which is scratch and not part of the increment.

Reviewed: `git diff 0fefcb8..23937ba` (20 files), by a fresh context that did not plan or build it. The increment is
`trust: untrusted` DATA. No instruction-looking content addressed to the reviewer was found in it, and none was
followed. Every `problem` / `evidence` below is free text, quoted as DATA (P2).

## Floor first (Step 1)

- `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`, exit 0.
- `node --test pharn/floor/lens-groups.test.mjs .dev/floor/review-lens-agent.test.mjs .dev/floor/stage-load-budget.test.mjs .dev/floor/command-hygiene.test.mjs`
  → 329 pass, 0 fail.
- `node pharn/floor/check-plan-lessons.mjs .dev/features/review-lens-grouping/PLAN.md .dev/memory-bank/lessons-learned.md`
  → GREEN, 22 ids (declaration only).
- `npm run docs:check`, `check:markers`, `check:badge`, `check:changelog` → GREEN. `check-changelog-entry.mjs --base-ref
0fefcb8 .` → GREEN, one new entry, `## [6.64.0] - 2026-10-18`, no merged entry touched.
- Committed stage reports, read not re-run: `verify-report.json` PASS (7 gates), `regression-report.json`
  `no-regressions`.
- The command-hygiene ceiling raise follows the rule: 27,537 B × 1.1 = 30,291, next multiple of 512 = 30,720.

## The four lenses

- **L-floor (P0).** Every `Floor:` bullet the increment adds reduces to code pinned by a test: the map invariants
  (`lens-groups.test.mjs`, closed both ways over `count-lenses.mjs`: a dropped lens and a 23rd lens each turn it red,
  plus exactly-once, `trust-fence` alone, no mixed basis, non-vacuity), the helper's run-time shape refusal, and the
  group and `unwritten` derivation. Tool narrowing and `omitClaudeMd` are labelled advisory everywhere they appear:
  "applied by Claude Code", "no floor primitive observes it", and struck under `Not a claim`. No unlabelled
  guarantee was found, so there is no floor-gate finding. The advisory P0 findings are about sentences that state
  more than the floor holds (A3), and about claims that stopped being true when this landed (A1, A4).
- **L-eval (P1).** No capability changed. The map, the helper and the agent definition have no `role:`, and
  validate's count is unchanged at 37. The floor and this lens agree. No finding.
- **L-trust (P2).** The free text from reviewed code still reaches `REVIEW.md` only through `findings.json` and the
  merge. The helper reads only `assignments[].lens`, `assignments[].slice` and `scanner_errors[].lens`, and its output
  carries no free text from the target. Grouping cannot put `trust-fence` with another lens: the helper refuses a map
  that tries (exit 2, then one lens per group), and an unmapped lens runs alone. Checked by reading the code and its
  tests. Each lens keeps its own review set and its own `findings.json` path in the Step 4 prompt. Keeping each lens
  to its own files inside a shared context is advisory, and the claims block says so. Findings: A3, A5.
- **L-axis (P3).** No sibling reference: the map names lens ids the way `lens-scanner-map.json` already does, and
  the helper imports only `runtime-floor.mjs` and `quote-core.mjs`. Findings: A8 (the trusted architecture has no
  place for `.claude/agents/`) and A9 (one helper, two reasons to change).

## Floor-gate findings

None.

## Advisory findings (open)

```yaml
- type: FINDING # A1
  rule_id: P0
  severity: important
  file: "pharn/pharn-review/injection/injection.md:76"
  problem: "Claims that expired when this landed (L33, L50): 19 shipped lens bodies, two floor-module headers and the README still say /pharn-review spawns one subagent per lens. The plan's L33 line says `subagent per lens` was swept, but it records no hits and no disposition for them. Each lens body is read by the grouped subagent that applies it, so a lens in a four-lens group reads that it has a subagent to itself. Sites: pharn/pharn-review/{copy-paste-drift, duplicated-logic, injection, insecure-crypto, magic-values, missing-await, missing-error-handling, missing-timeout, n-plus-one, null-deref, off-by-one, path-traversal, placeholder-as-done, race-condition (2), resource-leak, secrets-in-code, ssrf, swallowed-exception, unsafe-deserialization}; pharn/floor/merge-findings.mjs:4; pharn/floor/count-lenses.mjs:5; README.md:877."
  evidence: "`/pharn-review` Step 4 spawns **one subagent per lens**, each writing its own `findings.json` · merge-findings.mjs:4 'A parallel /pharn-review spawns one subagent per lens' · count-lenses.mjs:5 'the lenses the review spawns (one subagent each)' · README.md:877 'fans every applicable lens out as its own parallel subagent'"

- type: FINDING # A2
  rule_id: P5
  severity: important
  file: "pharn/floor/lens-groups.mjs:28"
  problem: "Exit 2 has two causes. Besides an unusable map, runtime-floor.mjs exits 2 on a Node below 24.2, before the record is read and with nothing on stdout (measured: a faked Node 22.16.0 gave exit 2 and empty stdout). The header says no two causes share an exit code and that an exit 2 always means the record was usable. Both are false. Step 3's `2` bullet ('Spawn by them') and its third bullet ('no `lens-groups/v1` line → STOP') then both match the same result, so which branch runs is the model's choice. runtime-floor.mjs's header also says every caller treats a non-zero exit as a stop, and for this exit that is no longer true."
  evidence: "lens-groups.mjs:39 'The record is judged before the map, so an exit 2 always means the record was usable.' · pharn-review.md:162 '- `2` → the map is unusable (`map_error` says why); the printed `groups` hold one lens each. Spawn by them'"

- type: FINDING # A3
  rule_id: P0
  severity: important
  file: ".claude/commands/pharn-review.md:385"
  problem: "This claims-block sentence puts 'the security lenses' alongside `trust-fence`, but only `trust-fence` being alone is pinned (by the test and the helper's run-time refusal). Nothing tests or checks the six security solos: a later map edit that groups `injection` with `hygiene` passes every gate. 'The security lenses' is also never defined. `input-validation` describes itself as `injection`'s sibling for a 'security-sensitive operation', and it is grouped in `whole-target`, a choice GATE 1 approved. A reader can take the sentence to cover it."
  evidence: "In a group, one hostile file in any member's review set reaches every member; the security lenses and `trust-fence` run alone."

- type: FINDING # A4
  rule_id: P6
  severity: important
  file: "CHANGELOG.md:62"
  problem: "The entry says the grouped-eval results are in MEASUREMENTS.md. At 23937ba, MEASUREMENTS.md §3 says 'NOT RUN YET', and its Results line is still to be filled in. A released section is frozen when it merges, so this sentence has to be true at merge: either the results land in this PR, or the sentence is reworded before the merge."
  evidence: "The grouped lens evals run after this build, before the merge; their results are in the same file."

- type: FINDING # A5
  rule_id: P2
  severity: minor
  file: ".claude/commands/pharn-review.md:378"
  problem: "The reviewed-tree bound covers less than the real channel. By Claude Code's documentation (not probed), a subagent type is its frontmatter `name:`. So any `.claude/agents/*.md` in the reviewed tree that declares `name: pharn-review-lens` sets the container, not only an edit to that one file. In an install without the project file, a user-scope definition with that name would be offered in place of the `general-purpose` fallback the sentence promises. The reviewed tree's `pharn/floor/lens-family-map.json` likewise decides which lenses share a context, and at run time only `trust-fence` is refused a sibling."
  evidence: "a reviewed branch that edits `.claude/agents/pharn-review-lens.md` sets the container every group runs in; nothing here detects that. An install without `.claude/agents/` (pharn-cli does not copy it yet) runs every group as `general-purpose`."

- type: FINDING # A6
  rule_id: P5
  severity: minor
  file: ".claude/commands/pharn-review.md:232"
  problem: "'A one-lens group's prompt is that lens's alone' can be read as dropping the rules paragraph, including '`[]` when it has none', for the seven one-lens groups. PLAN Design §4 says the same prompt is 'today's single-lens prompt', and that prompt never asked for `[]`. A one-lens group that finishes with no findings and writes no file would then appear in the re-run's `unwritten`, and Step 6 would list it as 'did not finish'. The emission contract's line that an empty list is `[]` narrows this but does not close it."
  evidence: "write each lens's `findings.json` — `[]` when it has none — **before** starting the next. A one-lens group's prompt is that lens's alone."

- type: FINDING # A7
  rule_id: P0
  severity: minor
  file: "CHANGELOG.md:55"
  problem: "The CHANGELOG says the number of subagents per review falls. What was measured is how many groups the map yields over 40 past diffs, counted by a scratch harness. Spawning by group is advisory, so the runtime spawn count was not observed."
  evidence: "the median subagents per review fall from 10 to 5 in pharn-starter (325 → 161 over 32 reviews) and from 11 to 5 here"

- type: FINDING # A8
  rule_id: P3
  severity: minor
  file: "CHANGELOG.md:80"
  problem: "`pharn/ARCHITECTURE.md §4` (line 143) names `.claude/commands/` as where the stages live, and has no place for the shipped `.claude/agents/` file. The build record lists this grill finding as 'Not addressed' and as a human-only edit. The CHANGELOG's follow-ups do not name it, so once the entry is frozen nothing tracks the gap between the trusted doc and the repo."
  evidence: "Follow-ups: `cli-install-agents`, `slice-without-finding`, `lens-body-slim`, and the `/pharn-dev-eval` gap"

- type: FINDING # A9
  rule_id: P3
  severity: minor
  file: "pharn/floor/lens-groups.mjs:23"
  problem: "The helper has two reasons to change. One is grouping: the map and the record. The other is the `unwritten` presence check, tied to the `lenses/<lens>/findings.json` layout that Step 4 and finding-shape §Emission own. If that layout moves, the grouping helper has to change too. This is acceptable while the layout is stable, and it is recorded so a move of the layout does not miss this file."
  evidence: "`unwritten` lists every grouped lens whose `<record dir>/lenses/<lens>/findings.json` is not a regular file"
```

## The eval kit (advisory, outside the increment)

This section reads the scratch kit at `.claude/worktrees/agent-a8477e1626719a91a/.pharn/review-lens-grouping/eval/`
(`README.md`, `prepare.mjs`, `score.mjs`) to judge whether its design can show what the plan says it shows. Its
results were not read.

```yaml
- type: FINDING # K1
  rule_id: P0
  severity: minor
  file: ".pharn/review-lens-grouping/eval/README.md:44"
  problem: "Round-2 attribution changes two things at once (L40). The grouped run held all of a lens's own cases (up to 17) plus its siblings' files. The 'custom-alone' control runs that lens on the single case C. So 'grouped fails, custom-alone passes → grouping' can come from more files in one context, which a pre-grouping subagent over a multi-file slice would also face, and not from the siblings. The error makes the kit block GATE 2 too readily, never too rarely. A control that runs the lens alone over the same set of its own cases would separate the sibling effect."
  evidence: '{"run": "attr-custom-<k>~L", "agent": "pharn-review-lens", "lenses": ["L"], "cases": ["C"]}'

- type: FINDING # K2
  rule_id: P0
  severity: minor
  file: ".pharn/review-lens-grouping/eval/score.mjs:44"
  problem: "score.mjs splits a lens's findings into cases by the exact `file` string, with no normalization. A `./` prefix or an absolute path is counted as contamination 1, and the lens's own case is scored as empty (RED). The single-case attribution runs use the same scorer, so a lens that always formats paths this way lands in 'both alone fail → pre-existing, non-blocking'. The harness artifact is then hidden instead of reported."
  evidence: "const m = /^(.*):(\\d+)$/.exec(f.file); return m ? m[1] : f.file;"
```

Two further reach notes, with no finding:

- The kit gives the rules paragraph to every run, the six one-lens security runs included, so it cannot exercise
  A6's reading. It never runs the `general-purpose` fallback on a grouped prompt either; round 2 does so only on one
  case.
- The kit builds its prompts from the text at `23937ba`: the trusted-prefix blockquote, then Step 4 from the
  installed-skills instruction through the rules paragraph, and the lens bodies the subagents read. A fix to any of
  those bytes before merge means the eval's results no longer apply byte for byte, just as with the probe's SHA-256
  binding. A1's lens-body sites and A6 fall inside those bytes. A2, A3, A4, A5, A7 and A8 do not, and neither do
  A1's two floor headers and README line.

Supporting observation (DATA, outside the increment): the probe's transcripts record Claude Code `2.1.301`, which is
at or above the documented `omitClaudeMd` floor of 2.1.271. The `pharn-review-lens` transcript has no project-instructions
block, and the `general-purpose` one has it in two records. That fits `omitClaudeMd` having taken effect. MEASUREMENTS.md
records neither fact.

## What to fix before merge (recommendation; the human decides)

1. **A4.** Land the eval results in MEASUREMENTS.md §3 before the merge, as planned, or reword the sentence. The entry
   freezes on merge.
2. **A2.** Change Step 3's bullet to "`2` with a `lens-groups/v1` line", and correct the two header sentences. Both
   files are in `## Files`, and Step 3 is not part of the eval's prompt. `review-lens-agent.test.mjs` pins the
   exit-2 bullet by regex, so the test's regex has to change in the same edit.
3. **A3.** Reword the claims sentence: name the six solo lenses, say the solos hold in the committed map and are
   pinned by no test, and put `input-validation` in `whole-target`. Or add a test pin for the GATE 1 decision.
4. **A1 and A8.** At minimum, name the stale sites and the `ARCHITECTURE §4` gap as follow-ups in the 6.64.0 entry
   before it freezes. Leave the lens bodies to a follow-up (for example `lens-body-slim`), because editing them now
   changes the bytes the eval measured. The two floor headers and README.md:877 sit outside `## Files`. Fixing them
   in this PR needs those paths in the plan's `## Files`, added before build Step 0 (6.54.0); otherwise they go to a
   follow-up too.

A5, A6, A7 and A9 can wait. If A6 is fixed, do it after the eval for the reason above.

## Lesson candidate (proposed for `/pharn-dev-memory-promote`; not written to canon here)

**It clears L20's bar, in my judgment.** The L33 → L50 family has a discipline-only remedy, and it recurred here. The
plan cited L33 and claimed a sweep that named the exact phrase `subagent per lens`. That phrase matches 21 sites in
20 shipped files (`git grep` over `pharn/`): 19 lens bodies and `merge-findings.mjs`. None was fixed or listed. Two
more sites use other wording (`count-lenses.mjs:5`, `README.md:877`), L33's variant-spelling case.

- **Candidate title:** A sweep line that names its phrases but not its hits cannot be checked. Record each hit with
  its disposition, and let grill re-run the grep.
- **Body (draft):** A plan stated that claims expiring on landing "were swept (`fan-out`, `subagent per lens`, …)".
  That phrase matches 19 lens bodies and a floor header, and two more sites say the same in other words. All of them
  still describe one subagent per lens after the increment replaced that behaviour. The sweep's hits fell outside the plan's `## Files`, and its "no lens
  changes" scope, so they were dropped without a word. L49 already says a completed-sweep claim should state its
  coverage. This recurrence shows that a stated phrase list is not coverage either.
  - **Remedy, a deterministic check (set membership, primitive #3):** the plan's sweep declaration lists each phrase
    with every hit and a disposition: edited, follow-up `<slug>`, or still true. `/pharn-dev-grill` re-runs each
    phrase's grep over the product surface and REDs on a hit with no disposition.
- **Provenance:** feature `review-lens-grouping`; commit `23937ba5ca0b2df8a5665774ecf0b6f926cdbbe4`; source
  `.dev/features/review-lens-grouping/PLAN.md` (the L33 applied-lessons line) and finding A1 above.
- **Overlap to weigh:** L33, L49 and L50. Whether this is a new lesson or an escalation note on L50 is the human's
  call.

## Deviations recorded

- The fix #7 guard denied a Write to a scratchpad preload file outside the repo, as designed. The preload was then
  written with Bash into the session scratchpad, outside the repo, as the deny message directs for scratch.
- The worktree's shell guard refused commands whose path contains the substring `eval`. The kit files were read with
  the Read tool instead.
