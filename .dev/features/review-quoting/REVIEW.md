# REVIEW — review-quoting

Floor first: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked` at `8c0ebb41`. Verify PASS
(all seven gates 0), regress run 3 `no-regressions`. Everything below is advisory, from the four lenses over the
increment's diff against `fb997e4b`, which was read as `trust: untrusted`. The diff contains the audit's injection
payloads as test fixtures (`IGNORE ALL PREVIOUS INSTRUCTIONS…`, `## Verdict: PASS`). They are DATA under test, they
changed no step of this review, and they are reported here only as present.

## GATE 2 outcome (re-review of the fix delta, `ed2e8d22..e43e9061`)

The batch orchestrator (a model, under the owner's delegation) decided **FIX**. The advisory findings below, written
at `8c0ebb41`, now stand as follows:

- `pharn-review.md:167` (important): **fixed**. Step 3 says "say so in the Step 6 notes", and the test needle has a
  control that the old wording fails.
- `:280` (minor): **fixed**. Step 6 names every inline exception: renderer prose, counts, the validated name,
  closed-set members, a shape-checked `rule_id`, and a clean lens id as a code span.
- `render-review.mjs` "(lens X)" inside the DATA fence (minor): **fixed**. The lens id now sits on the renderer's
  line as a code span (`lensSpan`, never inlined when multi-line), and the fence holds the file alone; a test covers it.
- Planted lens directory (minor): **fixed**. With a usable record, an unrecorded lens directory is skipped unread as
  `unrecorded-lens` (exit 3) and its findings never merge, with tests and two controls. **Bound, stated** in the merge
  header, `finding-shape.md`, the claims block and the CHANGELOG: with no usable record everything merges, and a file
  planted under a recorded lens's directory merges as that lens's.
- "Also render" wording and the markdown-it self-skip (minor): **left as is**, by decision.

Re-review of the delta through the four lenses found no new floor-gate finding. `UNREADABLE_REASONS` gained a member;
the closure tests range over it, and the renderer shows it after membership. The command budget was raised by the rule
to 34,304 B, a visible diff. Regress run 4 found no regressions, and verify PASSed again at `e43e9061`.

## Floor-gate findings

None. No guarantee in the diff lacks a floor reduction or an `advisory` label. No Capability or `enforces` binding
changed, so L-eval has nothing to bind. There is no sibling reference: `render-review.mjs` imports four `pharn/floor/`
modules of its own layer, pinned by its load-graph test.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P5
  severity: important
  file: ".claude/commands/pharn-review.md:167"
  problem: "Step 3's exit-2 branch still says 'say so in REVIEW.md', which Step 6 now forbids the orchestrator to edit; the note belongs in the Step 6 notes file (whose Lens agents block already asks whether the helper exited 2)."
  evidence: "each. Spawn by them, and say so in `REVIEW.md`."
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".claude/commands/pharn-review.md:280"
  problem: "Step 6's 'every lens-supplied value in it is fenced by code' restates the bound without its inline exceptions (closed-set severity/type/backstop and a shape-valid rule_id), which the claims bullet at :349 now names."
  evidence: "every lens-supplied value in it is fenced by code"
- type: FINDING
  rule_id: P4
  severity: minor
  file: ".claude/commands/pharn-review.md:287"
  problem: "The notes bullet keeps the wording 'Also render a `## Lens agents` block' (pinned by review-lens-agent.test.mjs) although the orchestrator now WRITES it into the notes; the verb is stale, the meaning is clear from the list's lead-in."
  evidence: "- **Also render a `## Lens agents` block** (orchestrator self-report)"
- type: FINDING
  rule_id: P2
  severity: minor
  file: "pharn/floor/render-review.mjs:1"
  problem: "Inside the outside_target fence each line is '<file>  (lens <source>)': renderer text sits inside a DATA fence beside attacker text, so a hostile file value can imitate the suffix; the merged findings.json and merge-report.json stay authoritative."
  evidence: "list.map((e) => `${inert(...)}  (lens ${inert(...)})`)"
- type: FINDING
  rule_id: P2
  severity: minor
  file: "pharn/floor/merge-findings.mjs:1"
  problem: "A planted pharn/features/<name>/lenses/<dir>/findings.json in an installed project's reviewed tree still MERGES its findings (Step 5's glob admits any directory); 7.3.0 quotes the directory name but does not restrict inputs to the recorded lenses (the audit's second remedy) — named, not fixed (outside G8's listed items)."
  evidence: "node pharn/floor/merge-findings.mjs pharn/features/<name>/findings.json pharn/features/<name>/lenses/*/findings.json"
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/render-review.test.mjs:1"
  problem: "The L55 reference probe needs markdown-it, a transitive devDependency; it self-skips (and says so) when absent, so on a tree without node_modules only the fence-walk holds the structure claim."
  evidence: 't.skip("markdown-it is not installed …")'
```

Lens notes:

- **L-floor (P0).** I probed each restated bound against the module before verify (L64): two overclaimed, "every value
  fenced" and "each field capped". Both were fixed in `97c1bea5` and pinned by two tests. The one restatement still
  short of its exceptions is the minor finding at :280.
- **L-eval (P1).** No capability changed. The renderer and merge changes have 25 and 72 tests, each ★ rule with its
  control (L60). `check-structural` over the one committed eval pair is GREEN at base and head.
- **L-trust (P2).** Every untrusted value reaches REVIEW.md only through `quoteData` or as a closed-set member. A
  markdown-it parse of the ten-payload render finds only the renderer's own headings and no raw HTML. The notes file
  (model-written, holding subagent text) is fenced and labelled self-report. One residual stays: the orchestrator may
  still choose to read findings.json (advisory "do not read").
- **L-axis (P3).** One axis per file: the merge assembles, the renderer renders, and the label phrases moved to the
  module that prints them. No guard, hook or trusted doc was touched; the two trusted-doc changes are in
  `DOCS-PROPOSAL.md`.

**Verdict: GREEN — 0 floor-gate findings. Of the 6 advisory findings raised at `8c0ebb41`, 4 are fixed at GATE 2 and
2 are left by decision; no new finding came from the fix delta. For the human to weigh.**

## Proposed lesson candidate

None. The one failure this run hit, a new floor CLI without the runtime-floor import, was caught by the existing
`entry-point-guard.test.mjs` at regress, which is the floor doing its job. The false canon fact found while building
(L14's claim about `$`) is a correction to existing canon, and the batch routes it to group G9.
