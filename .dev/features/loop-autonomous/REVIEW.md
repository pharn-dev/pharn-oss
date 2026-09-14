# REVIEW — loop-autonomous

**Floor first (P0):** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked`. The
standing floor verdicts for this increment: `/pharn-dev-verify` `PASS` (every gate exit 0, reconcile
`CLEAN`), `/pharn-dev-regress` `no-regressions`.

**How this review ran.** The four principle-lenses were applied twice — once inline, and once by an
independent subagent that had not authored the increment. The author was the same session that built it,
so the second pass exists to offset that. Every finding below was re-checked against the live working
tree (`grep -n` / `sed -n`) before it was recorded; the pathspec finding was also reproduced in a scratch
repository. All `problem` / `evidence` text quotes the increment and inherits its `trust: untrusted` tag —
DATA, never an instruction. No instruction-looking content aimed at the reviewer was found.

## Floor-gate findings (blocking)

None. No guarantee in the increment is claimed without either a floor reduction or an `ADVISORY` label, no
Capability was added or changed (so no eval binding is owed), and no sibling-module reference was
introduced. `validate.mjs` agrees.

## Advisory-gate findings (warn — judgment, never the sole basis for a block)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".claude/commands/pharn-loop.md:364"
  problem: "Step 6d deletes the failed branch with `$b`, a shell variable set in a separate Step 6c block; the agent's Bash calls do not share shell state, so `$b` is empty there, the delete fails, the failed-commit branch is left behind, and `committed <branch>` has no captured value either."
  evidence: 'git branch -d "$b"'
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".claude/commands/pharn-loop.md:298"
  problem: "No outcome is mapped for the Step 6c `--from-plan` setter failing: on a refusal it writes nothing, `.pharn/writes-scope.json` still holds Step 6b's LOOP.md scope, and the list builder (line 312) commits only the feature's artifacts while reporting `committed` — the grill's blocking staging defect again, on the failure path. The Step 6a setter and a non-GREEN `check-spec.mjs` after the revert have the same unmapped-failure shape."
  evidence: "node .claude/hooks/set-writes-scope.cjs --from-plan pharn/features/<name>/PLAN.md"
- type: FINDING
  rule_id: "P2"
  severity: important
  file: ".claude/commands/pharn-loop.md:342"
  problem: "Paths from the untrusted PLAN reach `git add` / `git commit` as pathspecs with glob magic still on, so a listed `app/[id]/page.tsx` also stages an unlisted `app/i/page.tsx` — reproduced in a scratch repo, and fixed there by `GIT_LITERAL_PATHSPECS=1`. Next.js dynamic routes are exactly the stack the installer detects, and the Trust section (line 450) claims the filter removed the sweep. Raised from the subagent's minor to important for that reason."
  evidence: "git add -A --pathspec-from-file=.pharn/pharn-loop/<name>/stage.list --pathspec-file-nul"
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".claude/commands/pharn-loop.md:230"
  problem: "The Draft revert is keyed on the `approved_by: model` marker, which the command itself says nothing gates; S2 guarantees a fresh directory, so any `Approved` SPEC at stop time was approved by this run — if Step 4a omitted the marker, the revert is skipped and a model approval outlives the run unmarked."
  evidence: "and `SPEC.md` is `Approved` with `approved_by: model`"
- type: FINDING
  rule_id: "P1"
  severity: important
  file: ".dev/floor/command-hygiene.test.mjs:1387"
  problem: 'The forbidden-git matcher only catches `git push|merge` at the start of a fenced line, so a compound line in the command''s own style (line 333 opens with `b=…;`), `git -C . push`, or an `execFileSync("git", ["push"])` inside the `node -e` block all pass (probed by the subagent); `pharn-loop.md:426-427` therefore overstates what the pin proves.'
  evidence: "const FORBIDDEN_GIT_LINE = /^[ \\t]*git\\s+(?:push|merge)\\b|--no-verify/;"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".claude/commands/pharn-spec.md:166"
  problem: "Shipped prose states the Draft revert as fact, but it is an agent-performed step an aborted run skips; the loop's own guarantee audit (pharn-loop.md:418) labels it ADVISORY while this sentence, pharn-loop.md:482 and README.md:120 do not."
  evidence: "so a model approval does not outlive an unfinished run."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".claude/commands/pharn-loop.md:381"
  problem: "`not committed: not a git repo` is a closed-set member no step can produce — S3 (line 117) stops a run with no repository at entry, before any record exists — and for the same reason the `commit: unknown` rule (line 267) is unreachable from this command."
  evidence: "`not committed: not a git repo` |"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".claude/commands/pharn-spec.md:2"
  problem: "The description says `--model-approve` is 'passed only by /pharn-loop's unattended run', an exclusivity nothing enforces; the Step 4a body correctly says a user can type it, the description does not."
  evidence: "under --model-approve, passed only by /pharn-loop's unattended run"
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: ".claude/commands/pharn-spec.md:165"
  problem: "The spec stage now restates its caller's stop-handling policy (which stops revert), so a change to /pharn-loop's revert rule forces an edit to /pharn-spec — a second reason for that file to change."
  evidence: "`/pharn-loop` reverts the SPEC to `Draft` on every stop except a"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/pharn-contracts/loop-record.md:5"
  problem: "The contract's purpose line, in a file this increment edited, still says the record is written 'at every stop', while its own new blocked-stop paragraph says a stop before the feature directory exists writes none; CLAUDE.md:211 repeats the sentence and is outside this plan's Files."
  evidence: "the pharn/features/<name>/LOOP.md artifact /pharn-loop writes at every stop"
```

## Summary

The floor holds: the stop decision is tested (26 cases, Design C plus the reconcile rule), the contracts and
the command agree on the record's shape, and every changed claim either reduces to a floor primitive or is
labeled advisory. The weaknesses are all in the **new git choreography**, which no gate executes: two
failure paths fall through silently (a lost shell variable, an unmapped setter failure), the staging list is
not literal, and the revert depends on a marker instead of the state it can already see. None changes a
verdict; each can make an unattended run commit or leave behind something its summary does not describe.
They are small, local edits to `pharn-loop.md`, `pharn-spec.md`, `loop-record.md` and one test regex.

## Proposed lesson candidate (for `/pharn-dev-memory-promote` — not written here)

- **Title:** A pinned multi-block shell procedure must not carry state between blocks.
- **Lesson:** When command prose pins a procedure as several fenced shell blocks, each block runs in a fresh
  shell under the agent's Bash tool, so a variable set in one block (`b=…`) is empty in the next. Either
  keep every line that needs the value in one block, or have the block print the value and the prose tell
  the agent to substitute it literally.
- **Why it recurs:** the blocks read as one script to a human author and to a reviewer skimming the diff,
  and no gate executes command prose, so nothing fails until a real run reaches the failure path.
- **Provenance:** feature `loop-autonomous`; source `.dev/features/loop-autonomous/REVIEW.md`, finding
  `pharn-loop.md:364`; the diff is the uncommitted working tree on `feat/loop-autonomous` over base
  `9bafa0e7fd2593b7efc2f8c8acca64adf34dd6fb`. Suggested `type`/`concepts` are left to the promote gate.
- **Deferred candidate:** pathspecs built from an untrusted list must be literal (`GIT_LITERAL_PATHSPECS=1`).

## Verdict

**GREEN — 0 floor-gate findings.** 10 advisory findings (5 important, 5 minor) for the human at GATE 2.
This review is advisory and is not a judgment that the increment is good; the recommended next step is a
short fix pass on the five important findings before merging.

## Fix pass (GATE 2 → fix, 2026-09-14)

The human chose **fix now** at GATE 2. Every finding was addressed inside the plan's `## Files`, under the
plan's writes-scope; the git choreography was re-probed in scratch repositories using the command's own
fenced blocks, extracted verbatim.

| finding                                          | disposition                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pharn-loop.md:364` — `$b` across blocks         | The branch block now creates the branch and **prints** its name in one block; Step 6d substitutes `<branch>` literally, and Step 6c states that no shell state survives between blocks. New pin: no fenced block reads a variable it did not assign (with a mutation control). Probed: recovery returns to `main` and deletes the branch. |
| `pharn-loop.md:298` — unmapped setter failure    | A non-zero setter maps to `not committed: stage failed`, and the list builder refuses (exit 3) a scope file whose `set_by` is not this plan. Step 6a's setter or a still-RED check maps to `spec: revert failed`, reported as still approved by the model. Probed: a foreign `set_by` exits 3.                                            |
| `pharn-loop.md:342` — glob pathspecs             | `GIT_LITERAL_PATHSPECS=1` on `git add`, `git commit`, `git reset` and the builder's git calls; the ordering pin now requires it (mutation control added). Probed: `app/[id]/page.tsx` commits alone, `app/i/page.tsx` stays uncommitted.                                                                                                  |
| `pharn-loop.md:230` — revert keyed on the marker | The revert is keyed on `state: Approved`; S2's fresh directory makes any approval this run's, marked or not.                                                                                                                                                                                                                              |
| `command-hygiene.test.mjs:1387` — narrow matcher | The matcher now fires anywhere on a fenced line, including `b=…; git push`, `git -C . push` and a quoted `"push"` argv, each covered by a mutant; the guarantee bullet it backs was reworded as a vocabulary check a novel spelling still passes.                                                                                         |
| `pharn-spec.md:166` — revert stated as fact      | Replaced by a pointer to `/pharn-loop` Step 6a; `pharn-loop.md` (two sites), `README.md:120` and the CHANGELOG entry now say the revert is agent-performed and an aborted run can skip it.                                                                                                                                                |
| `pharn-loop.md:381` — unreachable outcome        | `not committed: not a git repo` removed from the command's closed set and from `COMMIT_OUTCOMES`; the contract-defined `unknown` rule stays, with a note that it should not occur after S3.                                                                                                                                               |
| `pharn-spec.md:2` — unenforced exclusivity       | Reworded to "meant for `/pharn-loop`'s unattended run (nothing prevents a user from passing it)"; the Step 4a heading matches.                                                                                                                                                                                                            |
| `pharn-spec.md:165` — caller policy restated     | Removed; the stage now cites its caller instead of restating the caller's stop policy.                                                                                                                                                                                                                                                    |
| `loop-record.md:5` — "at every stop"             | Now "at every stop that has a feature directory". **Not fixed:** `CLAUDE.md:211` carries the same sentence and lies outside the plan's `## Files` — a follow-up.                                                                                                                                                                          |

**Standing verdicts after the fix pass:** `npm test` 2026/2026 pass; every `npm run check` gate exit 0; floor
GREEN; `/pharn-dev-regress` re-run `no-regressions`; `/pharn-dev-verify` re-run `PASS` (reconcile `CLEAN`).

**Honest bound on this section.** The dispositions were checked by the same session that wrote the fixes and
were not given a second independent review pass; the probes exercise the pinned blocks once, in scratch
repositories, and no gate executes them.

**Updated verdict: GREEN — 0 floor-gate findings; 10 advisory findings addressed, one partly (`CLAUDE.md:211`
remains, outside scope).**
