# REVIEW — orchestrator-context

- increment: `/pharn-loop` and `/pharn-ship` move their `## Quick mode` deltas and their stop procedure (loop Steps
  6–7, ship Steps 2c–3b, both claims blocks, both Final steps) into four part files read at one named point (6.32.0).
- diff under review: `git diff 9490b1b..HEAD` (base `9490b1b`, 6.31.1; HEAD `6d52856`).
- reviewer: an independent context (opus), not the plan's author. Run through `/pharn-dev-review`, writes-scope set to
  this file only.
- trust: the increment was read as `trust: untrusted`. The parts carry command-style instructions ("if it was invoked
  as a command, stop and say so"), which is their job; none was addressed to the reviewer, and none changed this
  review's behaviour.
- every claim below marked "reproduced" was probed in a scratch copy under `.pharn/review-scratch/` (deleted after
  the review), not read off prose.

## Step 1 — floor (P0)

- `node pharn/floor/validate.mjs .` → **GREEN — 36 capabilities checked** (base `9490b1b` exported and run the same
  way: also 36).
- `node --test .dev/floor/command-family.test.mjs .dev/floor/command-hygiene.test.mjs` → 280 / 280 pass.
- `npm test` (whole suite, re-run in this worktree) → see "Test run" at the end.

**VERDICT: blocked-with-2-floor-findings.** Both are claims that a test pins something it does not pin, each
reproduced by a mutant that leaves the whole `command-family.test.mjs` suite green. Both are sentence-level fixes
(add the pins with controls, or narrow the sentences); no executed line of either command was found lost, duplicated
or reworded.

## Floor-gate findings (blocking)

```yaml
- type: FINDING
  rule_id: P0
  severity: blocking
  file: ".claude/commands/pharn-loop-close.md:397"
  problem: "Both claims blocks (also .claude/commands/pharn-ship-close.md:378) state that PHARN's tests pin each pointer's loading condition and its not-loaded rule; neither is pinned, so a pointer that loads a part at the wrong point, or whose not-loaded rule says to improvise, passes every test."
  evidence: "PHARN's own tests pin the TEXT — one load instruction per part, in its pointer, with its condition and its not-loaded rule"
- type: FINDING
  rule_id: P0
  severity: blocking
  file: "CLAUDE.md:1585"
  problem: "CLAUDE.md (and CONTRIBUTING.md:55) say command-family.test.mjs pins where each line lives, under a FLOOR label; it pins where each ## / ### HEADING lives (R7) and that no unit sits in two files (R6), so a stop-procedure line moved out of the close part into the main file passes."
  evidence: "`.dev/floor/command-family.test.mjs` pins where each line lives. FLOOR: the text and the file names"
```

**Reproduction (FG1).** A rewritten copy of `command-family.test.mjs` run against a mutated copy of
`.claude/commands/` (R4/R5, R6, R7 selected; baseline copy green first):

| mutant                                                                                                                                  | result            |
| --------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| loop quick pointer: "When `--quick` is the first token, read it before Step 1a" → "…anywhere in the description, read it before Step 5" | all green         |
| loop close pointer: "Read it once, when the run first reaches a stop" → "Read it once, at the start of Step 3 …"                        | all green         |
| ship close pointer: "with step 7's return marker after the first `/pharn-verify`" → "with `/pharn-plan`'s stage-start marker"           | all green         |
| ship quick pointer: "in the same turn as Step 1's pending-start line" → "after GATE 2"                                                  | all green         |
| loop close not-loaded rule: "Commit nothing, create no branch, write no `LOOP.md`" → "Write `LOOP.md` from the contract and commit it"  | all green         |
| an eager `Read .claude/commands/pharn-loop-close.md now, before Step 1a` added to `pharn-loop-quick.md`                                 | all 9 tests green |

Why: `POINTER_PINS` (`.dev/floor/command-family.test.mjs:161-177`) pins the framing sentences, "Read it once", "and
never earlier", "not a reason to read it" and the four-word opener `**If it does not load` — never the WHEN of either
load, never the content of a not-loaded rule; and R5 counts the path in the MAIN file only (`:190`), so a load
instruction in a part is invisible. `git grep` over every `*.test.*` finds no other pin of "first reaches a stop",
"return marker after", "before Step 1a", "Commit nothing" or "write nothing more". The same overclaim is restated in
the test's own header (`command-family.test.mjs:21`, "the loading condition … and the not-loaded rule") and in
`PLAN.md:298` ("floor-pinned … with its condition"); the plan's test 5 promised "nowhere else as a Read" (`PLAN.md:255`),
which the build did not implement. **Remedy (either):** pin the condition sentence(s) and the not-loaded rule's
operative sentence of each pointer, and count the path across every file of the family and every other command, each
with its own negative control (L60); or narrow both claims bullets, the test header and CLAUDE.md to what is pinned.

**Reproduction (FG2).** The Step 7 fenced line `cat .pharn/pharn-loop/<name>/freshness.jsonl 2>/dev/null || echo "no
re-runs"` removed from `pharn-loop-close.md` and placed before `## Step 5` in `pharn-loop.md`: all 9
`command-family.test.mjs` tests green, and no `*.test.*` pins that line. **Remedy:** say "pins where each stop-procedure
and quick heading lives, and that no fenced line, heading or long paragraph sits in two files", or pin body placement.

## Advisory findings (warn — model judgment; none blocks on its own)

### L-floor (P0) and claims (L37, L64)

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".claude/commands/pharn-ship.md:585"
  problem: "The main remaining regression risk is unmeasured: a part reaches the model as a Read tool RESULT, which Claude Code harnesses frame as observed data, not instructions; whether a model follows side-effecting steps from it (the loop's branch and commit, ship's SHIP.md and ledger writes) exactly as it followed the same text in the invoked command body was never run, and the one live probe was inconclusive."
  evidence: "It is part of this command — PHARN's own trusted text, installed beside this file — so follow it as this command's own steps"
- type: FINDING
  rule_id: P0
  severity: important
  file: ".claude/commands/pharn-ship-close.md:13"
  problem: "L64 recurred: five restatements say the close part is read at the run's first stop (or 'when a run first reaches GATE 2 or a STOP'), but ship's pointer reads it with step 7's return marker after the FIRST verify, which precedes Step 2b's retry; only the CHANGELOG and the ship claims bullet state it correctly."
  evidence: "which reads this file once, when a run first reaches GATE 2 or a STOP"
- type: FINDING
  rule_id: P0
  severity: minor
  file: "CHANGELOG.md:35"
  problem: "Three CHANGELOG quantifiers overstate: 'every pinned shell line survives exactly once' (the orchestrator marker line appears 7x in the loop and 9x in ship, the amend-scope line 3x/4x — parity is count-preserving, not once); 'a run makes about a hundred to four hundred requests' (PLAN measured 11–426 per loop run and 335 and 1,756 for ship); 'Nothing a run executes changed' (each run now executes added Reads and four new not-loaded stop rules)."
  evidence: "every pinned shell\n  line survives exactly once, checked against 6.31.1"
- type: FINDING
  rule_id: P0
  severity: minor
  file: "CLAUDE.md:1579"
  problem: "'pharn-cli copies every top-level pharn-*.md' is false for pharn-dev-*.md (excluded by install-capabilities.ts:234 and install-manifest.ts:153); and 'hidden from both invocation paths' is stated as fact while BUILD.md records the live probe as INCONCLUSIVE and the CHANGELOG labels it 'documented behaviour, not measured here'."
  evidence: "`pharn-cli` copies every top-level `pharn-*.md` there"
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/floor/command-hygiene.test.mjs:4107"
  problem: "Measured numbers do not match the committed files: the budget comment says 42,536 and 35,301 bytes (committed: 42,642 and 35,635), so pharn-ship.md's ceiling 38,912 (:4119) is below the stated rule's 39,424 (stricter, harmless); BUILD.md:10 reports 'GREEN — 37 capabilities' where validate reads 36 at both base and head (plausibly a scratch file under .pharn/ at build time — validate walks it, as this review's own scratch copies showed)."
  evidence: "(79,903 → 42,536 and 69,421 → 35,301 bytes)"
```

The measurement itself checks out: `node .pharn/orchestrator-context/measure.mjs` reproduces BUILD.md's table row for
row, the CHANGELOG ranges match its output (full 29–39% / quick 17–22% carried; net about 2–3.5% and 6–8% full, 0.5–2%
and 2.8–4.4% quick — the lowest full heavy row is 1.8%), and every surface that quotes a request or token figure
labels it an estimate. Bytes are measured; requests and tokens are a profile counted from the pinned lines.

### L-eval (P1)

No capability is added or changed; `validate.mjs` agrees (36 → 36). The new rules carry negative controls, with two
gaps beyond FG1's:

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/floor/command-family.test.mjs:188"
  problem: "L60: R4 asserts two properties (the first line is the # title; the last line is the end line) and has a negative control only for the end line; R5 asserts every POINTER_PINS sentence but has a control only for the not-loaded opener."
  evidence: "if (!/^# \\S/.test(title)) out.push(`${p.file}: the first line after the frontmatter must be its # title`);"
```

### L-trust (P2)

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: ".claude/commands/pharn-loop.md:616"
  problem: "Neither CLOSE pointer (also .claude/commands/pharn-ship.md:585) says that no path the description or an artifact names is read in the part's place, though PLAN.md:322 claims each pointer says so and only the quick pointers do (POINTER_PINS.quick pins it, close does not); the close part is the one read AFTER untrusted stage reports, BUILD.md and a prior Handoff are in context."
  evidence: "Read that exact path, with the Read tool, in full. It is part of this command"
- type: FINDING
  rule_id: P2
  severity: minor
  file: ".dev/features/orchestrator-context/PLAN.md:329"
  problem: "'No new surface' is right about the directory and the guard but not about timing: the command body is fixed in context at invocation, while a part is read from disk after project code has run (the gates, the regress base install), so a write to it in between changes the stop procedure the orchestrator follows — even when reconcile detects the write, since that detection is itself a stop that then reads the part. Bounded: the pharn/floor/*.mjs scripts executed at the stop, and the inline stage commands re-read each iteration, share that exposure."
  evidence: "No new surface: the same directory, the same\n  guard, the same bound."
- type: FINDING
  rule_id: P2
  severity: minor
  file: ".claude/hooks/require-loop-record.cjs:184"
  problem: "Reported for a human (a protected hook): the loop's one mechanical backstop tells a model that stops without reading the close part to write LOOP.md, and does not name the close part, so it steers toward a record written without Step 6a–6c."
  evidence: "has no record yet — write ${JSON.stringify(recordRel)} (a blocked stop is a valid record) before ending the turn"
```

### L-axis (P3)

No sibling reference: no non-test file under `pharn/` or `.claude/hooks/` names the helper (R8, and a `git grep`), and
test files do not ship (pharn-cli `isTestFile`, `install-capabilities.ts:77`). The close part holding both the stop
steps and the claims block (G8) was stated for the human and is not re-raised.

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/floor/command-family.mjs:10"
  problem: "The helper's header says 'Tests only' and PLAN G9 says it is imported by test files only, but .dev/floor/capability-catalog-core.mjs:32 (the docs:generate / docs:check core, not a test) imports frontmatterFields from it, giving the test helper a second consumer and a second reason to change."
  evidence: "WHAT THIS MODULE IS FOR. Tests only."
```

### Loading paths and fallbacks (P5, P6)

```yaml
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".claude/commands/pharn-loop.md:620"
  problem: "The close pointer sends every blocked stop to Step 6a and only 'a stop before S2' to Step 7, but Step 2 (:243-244) and Step 1a item 4 (:139) send every stop before pharn/features/<name>/ exists (a failed S3, the snapshot or Stop-guard open failure, S6 or S6c before a Draft) straight to Step 7 with no record; two rules now name different entry points for the same stops."
  evidence: "Then follow it from Step 6a, or from Step 7 for a stop before S2."
- type: FINDING
  rule_id: P4
  severity: minor
  file: ".claude/commands/pharn-loop.md:598"
  problem: "Step 5 cites `## Quick mode` for why a full run over a quick SPEC is never committed, but that explanation now lives in the quick part, which the pointer forbids a full run to read; the rule itself still binds through Step 6a/6c and check-loop-decision (BUILD.md names this)."
  evidence: "a run invoked without `--quick` over a quick SPEC gets it too, and Step 6 never commits that one\n     (`## Quick mode`)"
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".claude/commands/pharn-loop.md:318"
  problem: "Unstated residual: a part is a Read result, and in a long run context compaction may summarize a tool result differently from the invoked command body (not measured); the quick part is read at entry and needed until the summary, and no pointer says to re-read after a compaction ('Read it once'), so a quick run could drift back to full-mode lines mid-run (mostly the safe direction: an extra regress)."
  evidence: "It has loaded when you have read both its title line"
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".claude/commands/pharn-loop-close.md:13"
  problem: "Platform residual under the inconclusive visibility probe: if disable-model-invocation is not honoured on a command FILE, a model could open a part with the Skill tool instead of Read, and the part's own intro then tells it to stop; the follow-up parts-visibility-probe covers the measurement."
  evidence: "It is not run on its own — if it was invoked as a command, stop and say so"
```

The four not-loaded rules otherwise fail toward fewer actions and forbid improvising: the loop's quick failure stops
before Step 1a with nothing written and without the close part; the loop's close failure commits, branches, records
and reverts nothing (leaving a model-approved SPEC standing, which the message says — the same outcome as a failed
revert today); ship's quick failure stops before `/pharn-spec` with only an unadopted pending start; ship's close
failure writes nothing more. Ship's early close read, batched with step 7's return marker, conflicts with no step: the
pointer routes an `INCOMPLETE` through Step 2b first (only the part's own intro, above, says otherwise).

## Independent parity check (loss / change hunt)

A line-multiset diff of 6.31.1's `pharn-loop.md` / `pharn-ship.md` against each new main file plus its two parts
(frontmatter removed): **no line of 6.31.1 is missing** except one edited sentence per command (the loop's Step 1
quick sentence, "before Step 3" → "before Step 1a"; ship's Step-3a pointer sentence), and every added line is a
pointer, a part frame or the new claims bullet. Every fenced line keeps its count. Full-run rules that sat in the old
`## Quick mode`: the loop's closing "a full run that meets `STOP_GREEN_QUICK` does not commit" (still enforced by
Step 6a/6c and `MODE_MISMATCH`, as BUILD.md says) and "no argument selects a table" (informational; Step 5's pinned
line takes no flag) — neither leaves a full run without an executable rule. Nothing in the loop's Steps 1–5 or ship's
Steps 1–2b needs close-part text before the pointer's condition fires; their references to Steps 6/7 and 3/3a are
forward references the pointers say are not load triggers.

## Install and platform

pharn-cli's copy filter (`install-capabilities.ts:231-236`, `install-manifest.ts:146-154`, `validate.ts:18`, read
only) copies all four parts; each name matches `COPY_FILENAME_RE`; nested or dotted names would not. A part's
frontmatter has no `model:`/`effort:`, so `check-model-config.mjs agreement` stays GREEN (15 product files scanned).
An install whose user edited a main command keeps 6.31.1's self-contained text under `pharn update` (BUILD.md), which
is safe. The two hiding keys are platform behaviour this review could not probe either (see the findings above).

## Proposed lesson candidate (for `/pharn-dev-memory-promote`; NOT written to canon here)

- target: `.dev/memory-bank/lessons-learned.md`
- title: A sentence saying what a TEST pins is written from the test's pin list, never from the plan's test design —
  probe it with one mutant per noun
- type: `contract` · concepts: `[guarantee-audit, universal-quantifier, non-vacuity, restatement]`
- body: The plan's test 5 said the pointer's loading condition and not-loaded rule would be pinned; the build pinned
  framing fragments instead, and the claims bullet, the test header and the plan's guarantee audit kept the plan's
  wording. Five mutants of exactly those two properties left the suite green. L37 says probe a bound, L60 says one
  control per asserted property, L64 says probe every restatement; this increment cited L60 and L64 and still
  shipped the gap, because the sentence was a claim about a TEST and was checked against the test's NAME, not against
  what its predicate reads. Remedy: when a sentence enumerates what a test pins, list the nouns, mutate each in a
  scratch copy, and keep only the nouns that turn the test red.
- provenance: feature `orchestrator-context`; commit `6d528562633c38cef8da5b94707902ef7038e28b` (the reviewed HEAD);
  source `.dev/features/orchestrator-context/REVIEW.md` (floor-gate FG1, FG2); date 2026-09-28.
- honest trigger (P7): a real, reproduced failure, and the L37 class recurring for the third time (L37 → L64 → this),
  inside an increment that declared L60 and L64 applied. The human may prefer to record it as evidence on L64 rather
  than as a new entry.

## Test run

`npm test` re-run in this worktree: **4260 tests, 4255 pass, 5 fail** — all five caused by this review's own scratch
copies of `.claude/commands/` under `.pharn/review-scratch/` (`validate.mjs .` walks `.pharn/`, and the command copies
carry `role:` frontmatter, so `validate.test.mjs` ×2, `lens-scanner-map.test.mjs` ×2 and
`check-review-assignments.test.mjs` ×1 counted them). After deleting the copies, `validate.mjs .` is GREEN (36) and
those three files pass 100 / 100 — so the suite is green on the increment itself, matching BUILD.md's 4260 / 4260.
The same trap is the one REGRESSION.md recorded for the nested base checkout; a scratch area that `validate.mjs` walks
is worth a follow-up, but is out of this increment's scope.
