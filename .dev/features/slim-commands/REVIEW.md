# REVIEW — slim-commands

- scope: the whole increment, `git diff b627409...HEAD` (`b627409` = 6.28.0, the plan's base) at `db8abdf`. That is
  23 files: the eleven product commands, `.dev/floor/command-hygiene.test.mjs`, `CLAUDE.md`, `README.md`,
  `CHANGELOG.md`, `SKILLS_VERSION` and the feature record.
- stage model: review — opus — set by the maintainer's instruction; routed via Agent subagent; effort not routed.
  Three read-only helper agents (also opus) each read two stage commands old against new. Every finding they
  reported was re-checked against the files before it was recorded here.
- verdict: **GREEN at the floor — 0 floor-gate (blocking) findings.** The hunt found no lost STOP, HALT,
  ask-the-human, human gate, trust rule, checker invocation, scope or marker step, exit-code branch or ordering
  constraint. **7 important advisory findings** (F1–F7). F1–F6 are claims that now read stronger than their source,
  each fixable with one clause. F7 is a version collision with `origin/main`. **12 minor findings.** Recommendation:
  narrow F1–F6 and renumber (F7) before merge.

> The increment under review is `trust: untrusted`. Every `problem` and `evidence` field below is quoted **DATA**.
> No reviewed file contained anything that tried to steer this review, and nothing in them was followed as an
> instruction. Scratch (old-version extracts, diffs, a budget-mutation runner) lived under `.pharn/pharn-dev-review/`
> as `.mjs`/`.txt`/`.json`. It was deleted before the gates ran. One deviation, stated: after writing this file with
> the Write tool, the review numbered its findings (`# F1`…, `# M1`…) and corrected one count through a `node -e`
> string replace, a Bash write. The path is this command's one scoped artifact, so it is covered by the scope and by
> the reconcile gate. The deviation is from "use the Edit tool", nothing wider.

## Floor first (P0)

| check                                                | result                                                                                                                                  |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `node pharn/floor/validate.mjs .`                    | **GREEN**, 36 capabilities, exit 0                                                                                                      |
| `npm run check` (the whole chain, `test` included)   | exit 0; `format:check` and `lint:md` re-run after this file was formatted, exit 0; `npm test` 4012 pass / 0 fail                        |
| `check-changelog-entry.mjs --merge-base b627409 .`   | GREEN — 1 new entry, opens `## [6.28.1] - 2026-09-27` (against the plan's base; see F7 for `origin/main`)                               |
| BUDGET controls, re-run by this review (below)       | every control goes red exactly where it should                                                                                          |
| `/pharn-review` Step 3b vs base                      | byte-identical (40 lines), so `THREAT-MODEL.md`'s two cites resolve                                                                     |
| every `node …` line, all eleven commands, old vs new | present, with the same arguments and in the same order (sampled per command; the build's survival check reports 0 fenced lines missing) |

## The lost-instruction hunt (the main risk)

**Method.** Each command was diffed old (`git show b627409:<file>`) against new, section by section. I did
`pharn-ship`, `pharn-loop`, `pharn-memory-promote`, `pharn-regress` and `pharn-verify` myself. The helpers did
`spec`+`review`, `build`+`grill` and `plan`+`test`. Each removed decision line was classified as rationale or an
executed instruction. Where `BUILD.md` names an owner, the owner file was opened and the sentence located.

**Sample and hit rate.** 130 removed decision-token lines were followed to their claimed destination: 45 in ship,
loop and memory-promote (weighted there, as asked), 30 in spec and review, 26 in build and grill, and 29 in plan and
test.

- **111 of 130 (85%) fully OK.** The text is present in a kept step, a claims bullet, or the owner `BUILD.md` names.
- **0 lost executed instructions.** Every STOP, HALT, ask-the-human, gate, `blocked:` row, exit branch and ordering
  word the sample reached is still in the command, or is a duplicate of one that is.
- **14 dropped or re-broadened bounds.** Four are important (F1, F2, F3, F5); the other ten are minor.
- **5 `BUILD.md` map-pointer errors.** In each, the content survives elsewhere or is pure rationale.
- F4 (build) and F7 were found outside the sample.

**Checked and found intact** (the hunt's positive results):

- **`/pharn-ship`.**
  - Step 2's stage order and every verdict read.
  - The run-marker `--open` right after the GATE-1 backstop, and the `--close` in Step 3a.
  - Four setters, each followed by `--amend-scope`.
  - Step 3's re-scope "on both exit paths".
  - Step 3b's never-self-fill rule and its `stale`/`malformed` → STOP.
  - The routed `read` exits. The removed "`read` says `unusable no-result` and the run STOPs" duplicates
    item 4 of the routed-stage section, which keeps `no-result` under exit `2` → **STOP**.
  - Quick mode items 1–12, numbering frozen.
- **`/pharn-loop`.**
  - Every S1–S13 row.
  - Step 1a's S9 stops on the snapshot and on `require-loop-record.cjs --open`.
  - The Step 5 freshness and stop exits.
  - Step 6b's "at most once" repair, "never repaired by editing `mode`" and "do not retry" (the decision check).
  - Step 6c's gates.
  - The quick question table cut to four rows. Every dropped row (S6, S6b, template S9, grill `--quick` S9, S12,
    S5/S7/S8, verify S4/S9, fresh S4/S13/S11, `ac-evidence` S13) is still stated at the quick item it belongs to
    (items 2–7).
  - The stale "acts only once a human has wired it" sentence is correctly gone: `.claude/settings.json` wires the
    Stop guard.
- **`/pharn-memory-promote`.**
  - The Step 0 ambiguity HALT and the out-of-scope refusal.
  - The setter's `1 path(s)` check.
  - `--amend-scope` "IMMEDIATELY after".
  - Every Step 1/2 HALT, including branch 3's ask.
  - The title check and `check-provenance` → HALT.
  - The Step 5 accept/deny form and "Wait for the answer".
  - Step 6's TOCTOU hash, the re-run gate, the forbidden-channel list and substitute-don't-recompose.
- **The other six** (helper reports, re-checked where a finding rested on them).
  - Build: test-stage gate → setter → `--anchor`, with "HALT on a non-zero exit from EITHER line".
  - Test: the `--unattended` closed line and "Never continue to the build".
  - Plan: the `NO_CANON/COLD/GREEN/STALE/ENUM_ERROR` branches.
  - Spec: Step 4's form and Step 4a's five refusals.
  - Review: run-marker `--open` before Step 3 with "Non-zero → STOP", and the Step 7 `--close` "on EVERY exit".
  - Grill: `--quick` is byte-identical.

**Owners opened and confirmed** (a sample):

- `cost-ledger.md` holds the pending-start boundary, "Run membership" and "Relationship to `pharn-cost-record/1`".
- `run-marker.mjs` (header, lines 20–62) holds the fail-closed hold, the advisory call and the 24 h bound.
- `stage-exit.md` holds regress's per-stop stale-report rules, which replace ship Step 2's F2 paragraph.
- `stage-agent-core.mjs:111` holds `stage-agent-hang`.
- `ship-outcome-core.mjs:113` holds "a skipped or wrong mode marker never yields `gate2`".
- `quick-scope-core.mjs:19` holds the two path sets built by code.
- `reconciliation-record.md` holds `--amend-scope` accounting ("accounted for, never exempt"), which memory-promote
  Step 0 now cites.
- `set-writes-scope.cjs` (header, lines 16–40) holds the release step's "stricter than either default" and early-abort
  text, which every Final step now cites.
- `stage-verify.mjs:57` holds "`/pharn-ship` has no such check" (freshness).
- `loop-record.md:127–129` holds `cap` "additive rather than retroactive".
- `spec-template.md:223` holds the Step 4a quick refusal it cites. `/pharn-spec` Step 4a still says it.

## The BUDGET test (§7) — each rule's control, re-run by this review

The review ran the real `BUDGET` tests over mutated copies of `.claude/commands/`. Only `COMMANDS_DIR` and the
import paths were rewritten in a scratch copy of the test.

| mutation                                                   | exit | red rule                                     |
| ---------------------------------------------------------- | ---: | -------------------------------------------- |
| none                                                       |    0 | — (5/5)                                      |
| `pharn-loop.md` padded to exactly its ceiling (86,016)     |    0 | —                                            |
| `pharn-loop.md` one byte over its ceiling                  |    1 | R2                                           |
| `pharn-memory-promote.md` one byte over, via a 2-byte char |    1 | R2                                           |
| `pharn-ship.md` description containing `ADVISORY`          |    1 | R4                                           |
| `pharn-loop.md` description containing `(P0)`              |    1 | R4                                           |
| `pharn-spec.md` description containing `NEVER means`       |    1 | R4                                           |
| `pharn-spec.md` description "the floor guarantees …"       |    0 | — (the stated bound: a paraphrase passes R4) |
| `pharn-test.md` description of 251 bytes                   |    1 | R3                                           |
| `pharn-test.md` description of exactly 250 bytes           |    0 | —                                            |
| `pharn-review.md` description single-quoted                |    1 | R3                                           |

So a +1-byte overflow and a claim word in a description are each caught, and the at-limit cases pass. Two bounds hold
as the section's own header states:

- R4 matches four literal forms. A lowercase or paraphrased claim ("guarantees", "ensures") passes, the named
  follow-up `description-claim-paraphrase`.
- R5 counts a heading and never reads what the block says.

## Answers to the brief

- **Descriptions.** All eleven say what the command does and when to run it, and none carries claim vocabulary.
  - `/pharn-loop` says "only when the user asks".
  - `/pharn-ship` says "when the user asks to ship it".
  - `/pharn-memory-promote` says "when the user asks to keep it".
  - That wording is **advisory**: it cannot _prevent_ a model from invoking a command. Whether and how the platform
    lets a model invoke a slash command is undocumented, per the plan.
  - If a floor-grade barrier is ever wanted, Claude Code documents a command frontmatter key,
    `disable-model-invocation`, for this. It was not probed in this run (P6), and no failure has triggered it (P7).
  - Two minor wording gaps, M7 and M8.
- **Claims blocks.** In ship, loop, memory-promote and spec most bullets carry their bound verbatim (G5 held for them),
  and `/pharn-ship`'s quick-mode bullet keeps every two-way bound. F1, F2, F3, F5 and F4 are the exceptions.
- **The 41 inbound cites.** The pinned search re-ran and printed the same 41 lines. **18 lines were spot-checked, all
  resolve:**
  - `require-loop-record.cjs:71` → Step 1a `--open`;
  - `check-loop.mjs:31`, `:99`, `:326` → Step 6a and `/pharn-build` Step 0's anchor;
  - `check-quick-scope.mjs:3` → ship item 7;
  - `check-verify.mjs:83` → ship Step 2b;
  - `loop-fresh-core.mjs:189` → Step 1a's `mkdir`;
  - `loop-mode-core.mjs:16` → quick item 6 / S11;
  - `merge-findings.mjs:116` → review Step 3's now/then line (restored);
  - `render-review-assignments.mjs:34`, `:241` → review Step 1's third branch;
  - `render-cost-ledger.mjs:787` → loop Step 7's table;
  - `spec-template.md:223` → spec Step 4a;
  - `ac-tests.md:27` → plan Step 4c;
  - `cost-ledger.md:665` → ship Step 3a;
  - `stage-agent-core.mjs:494` → loop Step 2;
  - `THREAT-MODEL.md:65` → review Step 3b, byte-identical;
  - `check-lessons-index.mjs:37` → plan Step 1 runs it.

  Three cites _outside_ that search name a heading that is now gone (M2).

- **`CLAUDE.md "Writes-scope"` cites.** **Pre-existing, not a regression, and this increment reduced them.**
  - At base, all eleven product commands carried 18 such cites. Three remain:
    - `pharn-ship.md:807` (Step 3's blocked-write remedy);
    - `pharn-regress.md:180`;
    - `pharn-verify.md:151` (untouched by D9).
  - One-line fix for each: replace the `CLAUDE.md` cite with a cite of the header of
    `.claude/hooks/enforce-writes-scope.cjs`, which ships.
  - A deeper instance, also pre-existing: the owner every Final step now cites, `set-writes-scope.cjs`'s header, itself
    defers "the whole rule" to `CLAUDE.md`, "Writes-scope" (and to `enforce-writes-scope.cjs`'s header, which ships).
- **Version.** Three checks:
  - A patch is the right size: no command, checker, contract, frontmatter key or path is added or moved.
  - `MIN_CLI` is unchanged at `0.5.0`, which is correct: the same eleven files sit at the same paths.
  - The CHANGELOG section has the right shape, but see F6 and F7.

## Findings — floor-gate (blocking)

None.

## Findings — advisory (important)

```yaml
# F1
- type: FINDING
  rule_id: P0
  severity: important
  file: ".claude/commands/pharn-ship.md:1007"
  problem: "The claims block's intro re-broadens the old Net's narrowed quantifier: it says every proceed/stop verdict belongs to a sub-stage's checker and that /pharn-ship adds exactly one floor primitive of its own, dropping the 6.27.0 exception that stage-agent.mjs read is a new STOP input and a routed build proceeds on its agent's advisory done gate:pass."
  evidence: "NEW: 'Every proceed/stop verdict belongs to a sub-stage's checker; `/pharn-ship` adds exactly one non-gating floor primitive of its own'. OLD Net: 'Every proceed/stop verdict still belongs to a sub-stage — with the ONE 6.27.0 exception named in the next sentence … Its `read` exit is a new STOP input'. Fix: '…belongs to a sub-stage's checker, except two named below (a `stage-agent.mjs read` STOP and a routed build's advisory `done gate:pass`)'."
# F2
- type: FINDING
  rule_id: P0
  severity: important
  file: ".claude/commands/pharn-test.md:278"
  problem: "The lock is now listed under the fix #7 hook, but the lock is written by ac-tests-lock.mjs through fs in a Bash-run script that the PreToolUse guards never see; the Step 4 sentence that said so was deleted and no owner states it (the contract's own Floor bullet keeps the lock outside the hook)."
  evidence: "NEW: 'Floor: this stage writes only the mapped test files and the lock — the fix #7 hook.' OLD GA2: 'It writes only the mapped test files → FLOOR: hook'. OLD Step 4: 'The write goes through `fs` in a Bash-run script, so the `PreToolUse` guards never see it (`LIMITS.md §6`).' Fix: 'only the mapped test files — the fix #7 hook; the lock is written by `ac-tests-lock.mjs` through `fs`, outside it (`LIMITS.md §6`)'."
# F3
- type: FINDING
  rule_id: P0
  severity: important
  file: ".claude/commands/pharn-review.md:305"
  problem: "The hook-width claim lost its 'Write-tool' qualifier: the command's Bash-run scripts (render-review-assignments.mjs, merge-findings.mjs) and any lens subagent's Bash write are outside PreToolUse, so 'this command writes only inside pharn/features/** or .pharn/**' now reads as covering every write. BUILD.md sends Step 0 to the CHANGELOG only; the qualifier is unmapped."
  evidence: "NEW: 'with no scope file and the run marker open, this command writes only inside `pharn/features/**` or `.pharn/**`'. OLD Step 0: 'every Write-tool write this command performs (Steps 4–6b) is made with a run open, and the guarantee above is the one that holds for them'. Fix: prefix 'its Write-tool writes land only inside …' and add 'a Bash write is outside the hook (`LIMITS.md §6`)'."
# F4
- type: FINDING
  rule_id: P0
  severity: important
  file: ".claude/commands/pharn-build.md:251"
  problem: "The command no longer says anywhere that a Bash write escapes the writes-scope: the Step 0 anchor paragraph that bounded it was cut to one sentence, so the claims bullet 'it writes only within the plan's declared scope — the fix #7 hook', the Untrusted bullet (:268 'cannot … escape the fix #7 scope') and the description ('writing only the files its ## Files names') now read unbounded. The sibling /pharn-test kept this exact bound."
  evidence: "OLD Step 0: 'That is how a **Bash** write — which neither `PreToolUse` guard ever sees — becomes detectable (… `LIMITS.md §6`).' NEW: no Bash, PreToolUse or `LIMITS.md §6` mention except the release step. Fix: append to Floor 3 'Write/Edit/MultiEdit/NotebookEdit surface only; a Bash write is detected at `/pharn-verify`'s reconcile gate, never prevented (`LIMITS.md §6`)'."
# F5
- type: FINDING
  rule_id: P2
  severity: important
  file: ".claude/commands/pharn-plan.md:331"
  problem: "'no decision reads them' is now unscoped; the old sentence scoped it to guaranteed decisions and said taint reaches the model's selection, which does read the index titles. BUILD.md calls this bullet 'verbatim'."
  evidence: "NEW: 'the index reproduces canon titles verbatim and no decision reads them.' OLD: '…no decision reads them — the drift check is a byte comparison, and the lessons gate reads canon. Taint reaches your selection (advisory) and the human-facing plan body; it reaches no guaranteed decision.' Fix: '…and no guaranteed decision reads them; taint reaches your selection (advisory)'."
# F6
- type: FINDING
  rule_id: P0
  severity: important
  file: "CHANGELOG.md:54"
  problem: "The [6.28.1] entry claims every removed bullet maps to a block bullet carrying its bound verbatim, an owner or a duplicate; this review's sample found bounds that were neither carried nor owned (F1–F5), and BUILD.md itself dispositions decision-token lines by section, not per line. Once merged, the section is frozen (append-only), so the claim must be narrowed before merge."
  evidence: "'Every removed bullet maps, in `BUILD.md`, to a block bullet carrying its bound verbatim, an owner stating the same bound, or a duplicate.' Fix: after F1–F5 are narrowed, say '…is mapped in BUILD.md; the review sampled 130 removed decision lines and found 0 lost instructions and 14 dropped bounds, the important ones fixed before merge'."
# F7
- type: FINDING
  rule_id: P6
  severity: important
  file: "SKILLS_VERSION:1"
  problem: "Version collision: origin/main moved to b9c5a46 after the plan was based, and that commit (#282) already released 6.28.1. This branch's SKILLS_VERSION, README badge and CHANGELOG section all say 6.28.1, so merging origin/main will conflict and the number must move."
  evidence: "`git log origin/main`: 'b9c5a46 fix(floor): the cost tooling tests every transcript and cost.json value before coercing it (6.28.1) (#282)'. This review's own worktree was created at b9c5a46 and `git merge --ff-only slim-commands` refused (diverged); it was reset to `db8abdf`. Fix: merge origin/main, renumber this entry to 6.28.2 (SKILLS_VERSION, badge, CHANGELOG heading, the `CLAUDE.md` bullet's '(6.28.1)', the test header's '6.28.1' mentions), re-run `check:changelog` and `check:changelog-entry`."
```

## Findings — advisory (minor)

```yaml
# M1
- type: FINDING
  rule_id: P4
  severity: minor
  file: ".claude/commands/pharn-ship.md:807"
  problem: "Pre-existing cite of CLAUDE.md, 'Writes-scope' — a file an install does not receive; also pharn-regress.md:180 and pharn-verify.md:151. Down from 18 cites at base."
  evidence: '''never bypass the hook (see CLAUDE.md, "Writes-scope")''. Fix: ''(`.claude/hooks/enforce-writes-scope.cjs`, header)''.'
# M2
- type: FINDING
  rule_id: P4
  severity: minor
  file: "pharn/floor/merge-findings.mjs:63"
  problem: "Shipped module headers cite a /pharn-review section this increment removed (also merge-findings.mjs:81, render-review-assignments.mjs:16). The content survives in the claims block; the heading name dangles. D3 kept the modules untouched; BUILD.md names it as an open issue."
  evidence: '''/pharn-review''s own guarantee audit STRIKES "a skill cannot suppress"''; ''its Guarantee audit already strikes''. Fix when those headers next change: ''/pharn-review''s `## What you may claim`''.'
# M3
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".claude/commands/pharn-spec.md:149"
  problem: "Dangling 'It never blocks' — its subject sentence was deleted, so it now follows 'a miss of fit check (1) or (2) is not a warning but a stop' and reads as a contradiction."
  evidence: "'It **never blocks** and it **never judges the intent as good or bad**'. Fix: 'The interrogation never blocks …'."
# M4
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".claude/commands/pharn-review.md:245"
  problem: "Step 6 lost the rendering rule that the backstop asymmetry must not be flattened into a score, and that a scanner-assigned label adds no credibility; the banned-word list survives. The 'closes none of the suppression risk' clause is gone too, and merge-findings.mjs's header does not hold it."
  evidence: "OLD: 'The asymmetry is deliberate and must not be flattened into a score (P0). A `scanner-assigned` label adds **no** credibility to the finding'. Fix: restore the first sentence."
# M5
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".claude/commands/pharn-loop.md:458"
  problem: "The D8 paragraph lost its residual: a record rewritten to mode: quick turns both REDs GREEN, leaving only Step 6c's advisory reading between the run and a commit. Also dropped in loop: 'The ≤1 repair bound is advisory (LIMITS.md §1d)' and '(though the scope itself derives from that input)'."
  evidence: 'OLD: ''a record rewritten to `mode: quick` would turn both GREEN, and only Step 6c''s advisory reading of "a green stop" would stand between the run and a commit …''.'
# M6
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".claude/commands/pharn-build.md:115"
  problem: "'So no stage GATES intent fidelity' was dropped and is unmapped; the Advisory bullet now says fidelity is 'checked downstream' with nothing bounding it. Also minor in build: Step 2c's 'the floor verifies only that the extracted file is valid, never that the extraction faithfully reflects the project's intent' is gone."
  evidence: "OLD: 'Both are ADVISORY … verifier slot, which has zero verifiers today. So no stage GATES intent fidelity'."
# M7
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".claude/commands/pharn-spec.md:2"
  problem: "The description says 'stop for human approval, then pin it' with no hint of the --model-approve path, so a reader of the listing could conclude every pinned SPEC was approved by a person — the conflation LIMITS §1d strikes."
  evidence: "Fix within budget: '…stop for human approval (or approve under --model-approve for /pharn-loop), then pin it.'"
# M8
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".claude/commands/pharn-plan.md:2"
  problem: "'with its declared files and applied lessons' can read as a claim the lessons were applied, which the claims block itself strikes."
  evidence: "Fix: 'its declared files and `applied_lessons` declaration'."
# M9
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".claude/commands/pharn-test.md:293"
  problem: "Pre-existing, now carried into the single claims block: 'after the anchor, a change to AC-TESTS.md … is not exempt' is false for AC-TESTS.md, which reconcile-ignore.json exempts under pipeline_artifacts.names."
  evidence: "reconcile-ignore.json:53 'AC-TESTS.md itself IS exempt (in `pipeline_artifacts.names`)'. Fix: 'a change to the lock or an AC test file is not exempt (AC-TESTS.md is, like PLAN.md)'."
# M10
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".claude/commands/pharn-spec.md:311"
  problem: "Two items now sit under a 'Floor, for what the checker PRINTS' label: 'spec_template is provenance' (old GA9 was not FLOOR), and 'an existing project template is never skipped' without GA11's case-fold condition. The owner, spec-template.md, keeps both."
  evidence: "Helper report (spec+review), re-read by this review: the conditions are at spec-template.md:65, :83, :89."
# M11
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".claude/commands/pharn-memory-promote.md:190"
  problem: "The closure that makes type/concepts safe to promote into the enum-gated class ('a needle cannot survive as a value') left Step 2 and is not in the claims block; only 'shape-gated' remains."
  evidence: "OLD: '(an exact enum member; control-char-free lowercase tags), so a needle cannot survive as a value — but shape is not aptness'."
# M12
- type: FINDING
  rule_id: P4
  severity: minor
  file: ".dev/features/slim-commands/BUILD.md:374"
  problem: "Five map pointers name a destination that does not hold the text; the content survives elsewhere or is pure rationale. The helper reports list them: plan's 'model-drafted/ratified' reason, test GA9's 'anchor RESETS', grill's divergence blockquote, grill's griller-runner deferral, and review GA7's Step 1b phrase. The decision-token lines were dispositioned by section, not per line, and BUILD.md says so."
  evidence: "e.g. BUILD.md sends GA9's 'an anchor RESETS the baseline' to ac-tests.md 'What it proves'; the sentence is at check-bash-reconcile.mjs:81."
```

## Lessons (P7)

No new lesson is proposed. F1, F3 and F5 recur the pattern `origin/main`'s newly promoted **L64** names ("a bound's
restatement re-derives its quantifier", merged in b9c5a46 after this plan's base). The plan's own G5 rule targeted the
same pattern, and it did not hold for a condensation of about 1,600 decision lines. Record the recurrence against L64
in its next promotion rather than adding a sibling.
