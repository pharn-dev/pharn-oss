# REVIEW — subagent-per-lens-sweep

**Verdict: GREEN — 0 floor-gate findings.** 4 advisory findings (1 important, 3 minor) and 6 notes. Of the 4, one
(R4, a CHANGELOG wording fix) is recommended before merge. The rest are for a follow-up.

Reviewed: `git diff c47707e..0571af0d` (35 files), by a fresh context that did not plan, grill or build it. The diff
includes the human-applied trusted-doc commit `125ff0fe` (H1–H5), whose new text was reviewed for truth here and not
edited. The increment is `trust: untrusted` DATA. No instruction-looking content addressed to the reviewer was found in
it, and none was followed. Every `problem` / `evidence` below is free text, quoted as DATA (P2).

## Floor first (Step 1)

- `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked in "."`, exit 0.
- `node --test` over `.dev/floor/stage-load-budget.test.mjs`, `command-hygiene.test.mjs`, `review-lens-agent.test.mjs`,
  `pharn/floor/lens-groups.test.mjs` and `lens-scanner-map.test.mjs` → 338 pass, 0 fail.
- `npm run docs:check`, `check:badge` and `check:changelog` → GREEN (badge `6.64.2` = `SKILLS_VERSION`, and the newest
  section is `## [6.64.2] - 2026-10-19`). `node .dev/floor/check-changelog-entry.mjs --base-ref c47707e6 .` → GREEN, one
  new entry, no merged entry or released heading changed.
- `node .dev/floor/hash-doc.mjs` → `pharn/ARCHITECTURE.md` `2c84959c…b12e` (equal to the plan's `spec_content_hash`),
  `LIMITS.md` `94805c21…759b` and `THREAT-MODEL.md` `ec0c9c78…ec52c`, the plan's post-patch digests.
  `git diff --stat 125ff0fe..HEAD` over the four trusted docs and `CODEOWNERS` is empty: only the human commit touched
  them.
- The plan's post-build greps, re-run at HEAD: `subagents? per lens($|[^ ]| [^f])` → no hit;
  `isolated lens runner` → no hit; `(pre-runner)` under `pharn/` → exactly the three griller lines (`i18n`, `privacy`,
  `security`).
- I read the committed stage reports and did not re-run them: `verify-report.json` PASS (7 gates, `failing_gates: []`)
  and `regression-report.json` `no-regressions`.

## The four lenses

- **L-floor (P0).** The increment claims no new guarantee. The CHANGELOG labels the truth of the edited sentences
  advisory ("No checker reads these sentences"). Its floor claims reduce to gates that ran green: `docs:check`, the
  stage-load budget, `check:badge`, `check:changelog` and `check:changelog-entry`. The pinned-hash claim for
  `pharn/ARCHITECTURE.md` reduces to the content-hash recompute above. No unlabelled guarantee was found, so there is
  no floor-gate finding. The advisory findings concern truth and wording: R2 (a stale shipped sentence the sweep
  missed) and R4 (the entry's "Checked by" line says more than the greps showed).
- **L-eval (P1).** No capability added or removed, and no `enforces`, frontmatter, `version:` or eval file changed. The
  word-level diff over `pharn/pharn-review`, `pharn/floor` and `.claude/commands` removes only `isolated` (19),
  `lens**,` (18), `(pre-runner)` (16) and E3/E4/E5/E6/E7's spawn words, and adds only the family wording. Validate's count
  is unchanged at 37. The floor and this lens agree. No finding.
- **L-trust (P2).** No new input is ingested, and no finding-emitting path changed. The lens bodies stay
  `trust: trusted` procedure text. The edits add no instruction to them, and their cites are repo files that exist
  (`pharn/floor/lens-family-map.json`, `pharn/floor/lens-groups.mjs`). The trusted-doc text came from a model-written
  plan. Its bytes are pinned, and whether a human read them first is GRILL's P2 concern, which still stands for GATE 2
  (below). No finding of my own.
- **L-axis (P3).** No sibling reference. A lens body citing a `pharn/floor/` data file follows the established
  scanner-citing pattern, and `validate.mjs`'s cross-reference grep is GREEN. But 19 lens bodies still carry a second
  reason to change: the review's spawn policy, which belongs to `/pharn-review` Step 4. This increment keeps that and
  adds a path cite (R1, cited as P4, since restating an owner's mechanism is the single-source failure).

## Truth of the edited sentences, dereferenced

- **E1/E3/E4: "Step 4 spawns one subagent per lens family (`pharn/floor/lens-family-map.json`), each lens writing its
  own `findings.json`".** True. Step 3 runs `lens-groups.mjs` over the record. Step 4 spawns "one subagent per group
  Step 3 printed", and each lens's `findings.json` is written before the next lens starts. The helper builds a group
  from a map family with at least one active member. Two cases fall outside the map's families, both still "one per
  family" in kind: an unmapped lens runs as its own group (install case), and an unusable map (exit 2) gives one group
  per active lens. The six security lenses and `trust-fence` are each alone in the map, so the sentence holds for
  them. Dropping "isolated" is right: a grouped lens shares its context.
- **E2: dropping `(pre-runner)`.** True. Each lens's Layer 1 still has the lens run its scanner inline. The three
  griller lines keep the label, which also holds: `.claude/commands/pharn-grill.md:256` "apply its procedure inline".
- **E5–E8.** True. Step 4 gives the catalogue instruction to each subagent once, and still returns one `skills:`
  line per lens. `render-review-assignments.mjs` writes one `assignments[]` entry per lens it gets from
  `count-lenses.mjs`, so E7's "the lenses the review assigns" holds (see N2 for the parenthetical).
- **E9 (README:877).** True.
- **H1/H2 (ARCHITECTURE §4).** True. `.claude/agents/pharn-review-lens.md` holds a role, a scope guard, the P2 fence and
  a write rule, and Step 4's prompt carries the task. That matches `.dev/guides/product-commands.md`, "One copy of the
  task". See N4 and N5.
- **H3 (LIMITS §3a): "fans out to every lens with a non-empty review set, one subagent per lens family".** True, by the
  helper's code. A lens is active iff its slice is non-empty or a `scanner_errors` entry names it. A family is printed
  iff at least one member is active (`if (members.length > 0) groups.push(…)`), so a family whose members all have
  empty sets is never spawned. Idle members of a printed family are left out of its `lenses`. The scanner-less lenses
  always get the whole resolved target (`render-review-assignments.mjs`: `slice: [...target]`), so a small change
  still fans out to at least `whole-target` and `trust-fence`. The rest of §3a stands. "Every lens" was false since #64
  (`b8b6df01`, which added the scanner map). One edge: if every target file is filtered out, the target is empty and
  even the scanner-less lenses are idle. The sentence covers that case too.
- **H4.** True: `/pharn-review` is not a `/pharn-ship` stage, and `--quick` does not touch it.
- **H5 (THREAT-MODEL surface 8): "each `/pharn-review` lens-group subagent list these".** True. The same wording is at
  `.claude/commands/pharn-review.md:34`.

## Spot-check of the plan's "still-true" dispositions (28 of 91, read at HEAD)

All 28 hold:

- `.claude/commands/pharn-review.md` lines `:2`, `:20`, `:23`, `:61`, `:130`, `:305`, `:374`;
- `.claude/commands/pharn-dev-review.md:110`;
- `.claude/commands/pharn-dev-grill.md:213`;
- `.claude/hooks/enforce-writes-scope.cjs:158`;
- `.dev/guides/product-commands.md:67` and `:93`;
- `LIMITS.md:159` (§3b, `secrets-in-code` still runs alone);
- `README.md:316` and `:494` (but see N1);
- `pharn/floor/lens-groups.mjs:21`;
- `pharn/floor/merge-findings.mjs:44` (now `:45`);
- `pharn/floor/run-marker.mjs:36`;
- `pharn/floor/transcript-core.mjs:54`;
- `pharn/floor/griller-extract.mjs:49`;
- `pharn/pharn-contracts/finding-shape.md:91`;
- `pharn/pharn-contracts/ship-record.md:90`;
- `pharn/pharn-pipeline/grillers/i18n/i18n.md:207`;
- `pharn/pharn-review/insecure-crypto/insecure-crypto.md:77` (the kept per-GRILLER clause);
- `.dev/floor/command-hygiene.test.mjs:1481`;
- `.dev/floor/installed-skills-consumers.test.mjs:18` and `:83`;
- `.dev/floor/stage-load-budget.test.mjs:118`.

The table's dispositions are sound where checked. Its gaps are sites it does not list (R2, R3), not wrong
dispositions.

## Floor-gate findings

None.

## Advisory findings (open)

```yaml
- type: FINDING # R1 (GRILL's P3 concern, confirmed and re-cited)
  rule_id: P4
  severity: important
  file: "pharn/pharn-review/copy-paste-drift/copy-paste-drift.md:82"
  problem: "The sweep replaces one restatement of /pharn-review Step 4's spawn unit with another in 19 lens bodies (18 Two-clocks blockquotes and race-condition.md:159,168), instead of citing the step. This is the same blockquote's second sweep: a0cfd0d2 (#168, 2.7.15) introduced the 'Step 4 spawns one subagent per lens' restatement that 6.64.0 made false, so the next change to Step 4 or the family map repeats the sweep over the same files. True today; not a merge blocker."
  evidence: "`/pharn-review` Step 4 spawns **one subagent per lens family** (`pharn/floor/lens-family-map.json`), each lens writing its own `findings.json`"

- type: FINDING # R2 (new: a site no pinned pattern matches, L33's residual)
  rule_id: P0
  severity: minor
  file: "pharn/floor/lens-scanner-map.json:2"
  problem: "A shipped sentence of the class this increment sweeps is missing from the 153-row table and matched by none of the 15 patterns. Since 6.64.0 the 12 scanner-bound lenses in async-resources, error-handling and hygiene each share a subagent that reads every member's slice, so 'its subagent reads only those' is false for them. Even before 6.64.0, reading only the slice was advisory: pharn-review.md's claims block lists it as advisory, and render-review-assignments.mjs:16 says it is struck."
  evidence: "files with a hit are that lens's scoped slice (its subagent reads only those)"

- type: FINDING # R3 (GRILL G1, confirmed)
  rule_id: P6
  severity: minor
  file: "pharn/floor/installed-skills-core.mjs:12"
  problem: "The twin of E8's corrected sentence still says each /pharn-review lens reads the catalogue; since 6.64.0 Step 4 gives the catalogue instruction to each lens-group subagent once. The site is outside the table (its R3 match spans a line break) and outside ## Files. The 6.64.2 entry names it, but with no follow-up slug."
  evidence: "The product stages `/pharn-build`, full `/pharn-grill` and each `/pharn-review` / lens used to read every listed `SKILL.md` in full. They now read this catalogue first"

- type: FINDING # R4
  rule_id: P0
  severity: minor
  file: "CHANGELOG.md:52"
  problem: "The entry credits all 153 table rows to the 15 pinned greps. GRILL's re-run shows those greps reproduce 152. The 153rd row (pharn-review.md:23) comes only from the wrap-tolerant pass, whose runner was deleted and whose re-implementation found 9 spans, not 7. The Bounds name one leftover stale sentence, with no follow-up slug, while R2 is a second one."
  evidence: "Checked by: the plan's sweep table (153 hits of 15 pinned `git grep` patterns at the base, each with one disposition) … which is left for a follow-up."
```

## Notes (judged, no finding)

- **N1.** `README.md:494` ("runs review lenses in parallel as subagents") and the `pharn-review.md:2` description
  are true at the group level, but members of one family run one after another (`product-commands.md:93`). GATE 1's
  Q2 chose "leave", which is defensible.
- **N2.** `count-lenses.mjs:5` says "(run in family groups, one subagent per group)". An idle lens is assigned but not
  run. The parenthetical describes how the lenses that do run are run, so it is not false.
- **N3.** Several edits split a line instead of reflowing it, which leaves short lines: `merge-findings.mjs:5`
  ("// its own findings.json"), `count-lenses.mjs:6` ("// findings.json the") and the "— but the" lines in the lens
  blockquotes. This is cosmetic, and prettier, ESLint and markdownlint pass.
- **N4.** H1's tree row is a closed list ("PHARN's subagent types: pharn-review-lens …"), like the commands row above
  it, while H2 uses the open form "such as". The row needs an edit when a second type ships. It is not false today.
- **N5.** Neither H1 nor H2 says that pharn-cli does not install `.claude/agents/` yet (`cli-install-agents`). The plan
  left this out on purpose (L33: a "not yet" expires). Neither sentence claims an install receives the directory, and
  Step 4's `general-purpose` fallback covers an install. Not false.
- **N6.** The risk that grouping creates, one hostile file in a member's review set reaching every member of the
  family, is stated in `pharn-review.md`'s claims block (`:394`) and the family map's `doc`, not in `THREAT-MODEL.md`.
  That is 6.64.0's scope, not this increment's.

## GRILL findings, re-judged

- G1 (`installed-skills-core.mjs:12`): confirmed, see R3. The other extra span, `lens-groups.mjs:159`, is still true:
  each active lens runs alone when the map is unusable.
- Wrap pass not reproducible: confirmed, see R4.
- Line-level post-build grep: the concern is valid in principle. At HEAD the grep is clean, and this review's broader
  greps (`per.lens`, `each … lens`, bare `subagent` over the shipped surface) found no stale site beyond R2 and R3.
- P3 restatement: confirmed, see R1.
- P2 advance approval: it stands. I read H1–H5 and found them true, but a model's read is not the control the trust
  audit names. The human should read `git diff c47707e 125ff0fe` at GATE 2.
- P7 bundle: it stands, for attribution only.

## What to fix before merge (recommendation; the human decides)

1. **R4.** Amend the 6.64.2 entry before it freezes. `CHANGELOG.md` is in `## Files`, so a declared write reconciles
   clean.
   - "Checked by": say "152 line hits of 15 pinned `git grep` patterns, plus one found by a line-wrap pass".
   - "Bounds": add `pharn/floor/lens-scanner-map.json`'s "(its subagent reads only those)" next to the
     `installed-skills-core.mjs` sentence, and name one follow-up slug for both.
2. **GATE 2.** The human reads the H1–H5 diff (`125ff0fe`), per GRILL's P2.

**For a follow-up, not this PR:**

- R2 and R3. Both paths are outside `## Files`, and adding them after the anchor is a `plan-widened-after-anchor`
  escape (6.54.0).
- R1, ideally the same follow-up.
  - Give the 19 blockquotes a cite-only form, for example "The lens runner has LANDED (`/pharn-review` Step 4), each
    lens writing its own `findings.json`".
  - Add a regex test so the restatement cannot come back (the lesson candidate below).
  - Doing this now would change the E1–E4 text GATE 1 approved, and would re-open build, regress and verify.

## Lesson candidate (proposed for `/pharn-dev-memory-promote`; not written to canon here)

**In my judgment, it clears L20's bar.** L20 says a remedy that is only discipline will recur, and that the second
occurrence should get a floor check. P4 and L25 ("cite the owner; re-derive, don't carry") have only a discipline
remedy for prose that restates another file's mechanism. Here that failure recurred on the same 18 Two-clocks
blockquotes plus `race-condition`:

1. `a0cfd0d2` (#168, 2.7.15) swept them and wrote "Step 4 spawns one subagent per lens".
2. 6.64.0 made that false.
3. This increment swept them again and restated the new spawn unit.

This lesson is distinct from L33, L50 and L75, which govern how to sweep. This one removes the need for the sweep.

- **Candidate title:** A mechanism restated in N capability bodies needs a sweep each time its owner changes. On the
  second sweep, replace the restatement with a cite and pin its absence.
- **Body (draft):** The "Two clocks" blockquote in 19 `pharn/pharn-review/*` lens bodies restates how `/pharn-review`
  Step 4 spawns lenses.
  - `#168` wrote "one subagent per lens".
  - 6.64.0's grouping made it false.
  - `subagent-per-lens-sweep` rewrote it as "one subagent per lens family (`pharn/floor/lens-family-map.json`)".

  That is true today, and false the next time the map or Step 4 changes. The lens's own point, that the scanner is
  floor and the lens's act is advisory, never needed the spawn unit.
  - **Remedy, deterministic (enum-regex, primitive #3):** the bodies cite the step ("`/pharn-review` Step 4"). A
    `.dev/floor/` hygiene test REDs when a `pharn/pharn-review/*/*.md` body outside `evals/` matches a spawn-unit
    pattern (`subagents? per`, `spawns (one|\*\*one)`).
  - **Bound:** the test sees only the spellings it names (L33's residual).

- **Provenance:** feature `subagent-per-lens-sweep`, commit `0571af0d` (build `5c1a9035`). Source: this REVIEW's R1, and
  GRILL.md's P3 finding.
- **Overlap to weigh:** L25, L33, L47 and L75. Whether this is a new lesson or an escalation note on L25 is the human's
  call.

## Deviations recorded

- The worktree's shell guard refused one compound command (a `for` loop with several `git grep` calls). I ran each part
  as its own plain command. No runner under `.pharn/` was needed, and none was written.
- Step 0 set the scope to this one file (`set-writes-scope.cjs --from-frontmatter … --target …/REVIEW.md`, 1 path). The
  final step releases it with `--clear`.
