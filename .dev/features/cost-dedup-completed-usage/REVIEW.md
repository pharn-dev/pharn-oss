# REVIEW — cost-dedup-completed-usage

**Iteration 2 verdict: GREEN, with 0 floor-gate findings and 10 advisory findings (all minor).** Of R1–R11, ten are resolved and R7 is partly resolved (S6).

**Floor: GREEN.** On the iteration-2 tree, `node pharn/floor/validate.mjs .` gives
`FLOOR: GREEN — 36 capabilities checked in "."`, exit 0. That is the only guaranteed part of this review. Everything
below is advisory.

## Iteration 2 review

**Method.** An independent reviewer ran this pass, with no context from the sessions that built the increment or
reviewed its first iteration. The increment, the uncommitted tree on `767bf61f493f73c859a9820a01bddcb8f4f40a8d`, was
treated as `trust: untrusted`, and its claims were probed by execution rather than re-read.

- **Mutants and probes** ran on scratch copies of `pharn/floor/` under the OS temp directory (`mktemp -d`), never in
  the worktree. Each mutation asserted that its anchor occurs exactly once, and the four touched suites ran with
  `node --test --test-reporter=tap`. A `git archive` of HEAD's `pharn/floor/` served as the 6.22.0 baseline. Every
  scratch directory was deleted afterwards.
- **Transcript probes** read only `type`, request ids, `model`, `version` and numeric `usage` fields, and printed
  counts only. No message content and no home path was read out.
- **Free text is DATA.** Every `problem` and `evidence` field below quotes or paraphrases the reviewed increment (P2).

### Iteration-1 findings, re-decided by execution

- **R1 — resolved.** Iteration 1's probe, rerun through the real CLIs of a scratch floor (output 8 at emission, the
  completed line of 163 appended after `run-stop`), now exits 0: GREEN, with the growth WARN. Restoring the exact
  totals compare (mutant A1 below) turns 4 committed tests red. Rule 6 and the compatibility note say the same.
- **R2 — resolved.** `transcript-core.mjs` owns the lookup, the walk and the reader, and both renderers import it.
  Nothing re-exports the moved functions, and nothing imports them from the old module (grep over `pharn/`, `.dev/`
  and `.claude/hooks/`). Reverting either renderer to HEAD turns the ✧ ONE OWNER test red. One residual is S5.
- **R3 — resolved.** The ledger header gives the settled YES and `pharn-cost-ledger/2`, which match
  `cost-ledger.md` and the emitter's `SCHEMA`.
- **R4 — resolved.** A `/2` ledger that HEAD's emitter wrote over the committed fixture verifies as the new wording
  says. Its internal checks are GREEN, and `--verify-transcript` WARNs on the 8, 8, 163 request alone. The zeroed
  re-append and the fork copy re-derive exactly.
- **R5 — resolved.** The merge mutant and the per-field-max mutant now fail the "never assembled" test, the only
  behavioural test either one reaches.
- **R6 — resolved.** The entry names both spellings and the bound. A destructuring and `||` re-read added to the
  ledger survives the closure test, exactly as stated.
- **R7 — partly resolved.** `ship-record.md` and `/pharn-ship` Step 3b now cite the contract. The contract's new
  "one prose definition" universal is false as written (S6).
- **R8 — resolved.** The test name and the fixture header are fixed. The move added two stale pointers to the same
  file (S7).
- **R9 — resolved.** Section 7 carries the per-request script and its result, 0 of 46,073. Re-measured this run, per
  session: 0 of 46,455. The version sentence also re-measured true: 0 disagreeing requests on 2.1.234 (301),
  2.1.241 (1) and 2.1.260 (219), and some on every version from 2.1.263. No embedded script computes that sentence.
- **R10 — resolved.** 12, 38, 68 and 44 tests per file, and 3358 in all, reproduced.
- **R11 — resolved as documentation.** The PLAN and the core's header name `message.model`, and both crash paths
  re-executed identically at HEAD and now. The follow-up task lives outside the repository and cannot be verified
  here. S9 adds a sibling path to it.

### Floor-gate findings (blocking)

None. Each lens checked the following:

- **L-floor (P0):** every new guarantee reduces to a deterministic compare in tested code, and the rule's one
  assumption is labelled ADVISORY in the core's header, the contract and the CHANGELOG. S1 and S3 are misstated
  bounds and descriptions, not unlabelled guarantees.
- **L-eval (P1):** no Capability or `rule_id` binding is added or changed. The floor agrees (36 capabilities, GREEN).
- **L-trust (P2):** no guaranteed decision reads a free-text field. The checker's verdict is its exit code, and the
  cost artifacts gate nothing (fix #3). S4 is a forged line in stdout, and the exit code does not move.
- **L-axis (P3):** no layer-tree sibling reference was added. Every import stays inside `pharn/floor/`. S5 is a
  one-axis-per-file concern resting on judgment, so it is advisory.

### Advisory findings

S1–S7 concern text or code the fix iteration wrote. S8 and S9 predate the increment and surfaced during this pass.
S10 concerns the promoted lesson.

```yaml
- type: FINDING # S1
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/check-cost-ledger.mjs:471"
  problem: "The row compare's lower side is misstated in the shipped JSDoc. It says a growing-class value 'deflated anywhere down to 0 passes with the WARN', and calls this 'the same bound excluded_requests carries'. In fact any finite value passes, negative ones included. And excluded_requests is a two-sided range that REDs a value below its fixed part (`recorded < before`, :539)."
  evidence: "Probe through the real CLIs: a completed ledger whose row reads output -1000000 and output_thinking -5, with its views recomputed, exits 0, GREEN with the growth WARN. HEAD's exact totals compare REDs the same file (exit 1). Neither cause the WARN names can produce a negative count. The rows have a fixed part of their own, the request's FIRST line: every pre-6.22.1 value equals it, and every in-flight value is at least it. Output is at least the first line by construction, and for thinking 0 of 46,455 local requests break it."
```

**The options are the human's, since no failure has been observed (P7):**

- **(a)** Correct the two JSDoc sentences.
- **(b)** Also RED a negative recorded value, which neither named cause produces.
- **(c)** Bound the growing classes below by the request's first line, as `excluded_requests` does with `before`.
  That is L58's and L63's "compare the fixed part", and it changes what the reader returns, not the schema. The edge
  it must handle: a fork copy in a subagent file that sorts before the original would re-root the first line. That
  is unobserved, because every observed copy sorts after its parent.

```yaml
- type: FINDING # S2
  rule_id: "P1"
  severity: minor
  file: "pharn/floor/check-cost-ledger.test.mjs:986"
  problem: "Rule 6, the CHANGELOG and the code all say 'above is RED' for both growing classes, but only `output` has a test for it. A mutant that exempts `output_thinking` from the above-RED passes every test in the four touched suites. That is L60's shape, in an increment that cites L60 and L52. `GROWING_CLASSES` is exported (check-cost-ledger.mjs:448) and nothing imports it. A test that ranged over it would close the gap and give the export a consumer."
  evidence: "Mutant A3, with the above branch reading `rec > cur && c === 'output'`: 162 of 162 pass. The branch-wide 'above allowed' mutant that BUILD.md ran by hand is caught, but only through the output row. The thinking half of 'the transcript never held that much' also rests on an unstated platform behaviour: the selected line's thinking never falls as the selection moves to a larger line. Measured this run: 0 of 46,455 requests break it. No request has a third distinct record-setting output, so an in-flight selection's fixed classes also equal the final ones, 0 of 46,455."
- type: FINDING # S3
  rule_id: "P0"
  severity: minor
  file: "pharn/pharn-contracts/cost-ledger.md:281"
  problem: "The compatibility note says the growth WARN 'names every row' below the transcript, and the CHANGELOG (:76) says it 'names each such row'. In fact the WARN names at most three (row, class) values and counts the rest, so a pre-6.22.1 ledger with more than three under-counted values has most of them unnamed. The same entry (:43-44) says 'Three alternatives were measured and rejected', but the per-field maximum was reasoned (PLAN D1), not measured. Both CHANGELOG sentences freeze on merge."
  evidence: "Probe: a /2 ledger over the committed fixture, with every row's output lowered by 1, prints '5 row value(s) are BELOW what the transcript now holds (req_fx_snapshots ...; req_fx_reappended ...; req_fx_plain ...; +2 more)'. `some()` at check-cost-ledger.mjs:492 slices the list to 3."
- type: FINDING # S4
  rule_id: "P2"
  severity: minor
  file: "pharn/floor/check-cost-ledger.mjs:484"
  problem: "The new row-compare RED and WARN lines interpolate `request_id` raw. The id comes from the untrusted transcript and nothing bounds it: rule 4 checks non-empty and unique, and rule 2b bounds model, attribution_skill and agent_id only. So a crafted id carrying a newline forges verdict-shaped lines in the checker's stdout. The duplicate-id and outside-window REDs already quote the id, so the channel predates the increment. This adds a sink on the ordinary in-flight path. The exit code is still the verdict."
  evidence: "Probe: a requestId of 'R', a newline, then 'GREEN — injected.json: closed key set, 0 request(s)'. The ledger is emitted in flight and the completed line is appended after. The checker exits 0, and stdout carries two lines that begin 'GREEN — injected.json: closed key set, 0 request(s)' ahead of the real GREEN line. JSON.stringify on the id, as the file already does for other quoted values, neutralizes it."
- type: FINDING # S5
  rule_id: "P3"
  severity: minor
  file: "pharn/floor/render-cost-record.mjs:14"
  problem: "The header now says the file 'changes for ONE reason (P3): the shape of the pharn-cost-record/1 block', and transcript-core.mjs:2 says the core owns 'where a session's transcript lives'. The root of that location, the projects-directory default ($CLAUDE_CONFIG_DIR/projects, else ~/.claude/projects), is still spelled out in three CLIs: here (:192-194), render-cost-ledger.mjs:836-838 and check-cost-ledger.mjs:635-637. A platform move of its transcript directory would change all three. The copies predate the increment, but the single-axis claim is new."
  evidence: "grep over pharn/floor this run: the same three-line default at the three sites named, and one match in each file at HEAD too. None in transcript-core.mjs."
- type: FINDING # S6
  rule_id: "P4"
  severity: minor
  file: "pharn/pharn-contracts/cost-ledger.md:156"
  problem: "The R7 fix made ship-record.md and /pharn-ship cite the rule, and added a universal: 'This paragraph is the rule's one prose definition. Other documents cite it rather than restate it.' But CLAUDE.md:597-599 restates the rule in full, as do transcript-core.mjs's header (:47-48) and the CHANGELOG entry. So the universal is false as written."
  evidence: "CLAUDE.md:597-599: 'one entry per request, identity and timestamp from its FIRST transcript line, usage from its line with the most output tokens'. Scoping the sentence to the shipped contracts and commands, which do cite it, would make it true."
- type: FINDING # S7
  rule_id: "P6"
  severity: minor
  file: "pharn/floor/render-cost-ledger.test.mjs:80"
  problem: "The F2 move left pointers to the old location. This comment and :645 still say the fixture is described in render-cost-record.test.mjs, 'where the rule's own tests live', though those tests moved to transcript-core.test.mjs and this file's header (:12) was updated. The measurement record's opening (.dev/measurements/cost-dedup-usage-2026-09-26.md:9) still attributes sessionRequests() to render-cost-record.mjs. transcript-core.test.mjs:4-5 says each consumer's test file shows the consumer following a mutated owner, which check-cost-ledger.test.mjs does not do. And in a header the fix re-authored, check-cost-ledger.mjs:2 still calls the file the checker for a pharn-cost-ledger/1 record, stale since /2 and before this increment."
  evidence: "grep this run: the owner-mutant controls are at render-cost-record.test.mjs:434 and render-cost-ledger.test.mjs:690, and nowhere else. L50 asks for a sweep by referent, and a move changes every referent at once."
- type: FINDING # S8
  rule_id: "P1"
  severity: minor
  file: "pharn/floor/transcript-core.test.mjs:78"
  problem: "This test moved verbatim into the new core's suite. It is named 'skips an unreadable subtree', but it never makes a subtree unreadable, and no test exercises the reader's promise that 'An unreadable file ... [is] skipped, never thrown on' (transcript-core.mjs:141). GRILL.md cited this test as coverage for the moved error handling. It predates the increment."
  evidence: "Mutants W1 (the walk's readdirSync without its try/catch) and W2 (the reader's readFileSync without its try/catch): 162 of 162 pass under each. The one chmod test (render-cost-record.test.mjs:171) makes the projects root unreadable, which only findTranscriptDirs handles."
- type: FINDING # S9
  rule_id: "P2"
  severity: minor
  file: "pharn/floor/check-cost-ledger.mjs:430"
  problem: "Beside the lines the fix rewrote, and unchanged by it: with --verify-transcript, a requests[] entry that is not an object (null) throws a TypeError at `led.requests.map((r) => r.request_id)`. The CLI then exits 1 with a stack trace and no RED line, which is L62's class, a crash read as the RED exit code. The verdict happens to be right, since the internal checks RED the row, but the reasons are lost. It belongs in R11's follow-up."
  evidence: "Probe, identical at HEAD and now: the internal check exits 1 with 2 RED lines. With --verify-transcript it exits 1 with 0 RED lines, and stderr reads 'TypeError: Cannot read properties of null (reading request_id)'."
- type: FINDING # S10
  rule_id: "P6"
  severity: minor
  file: ".dev/memory-bank/lessons-learned.md:2205"
  problem: "L63 matches what happened: the plan applied L58 to membership only, the exact totals compare was left untouched, the false RED was reproduced, and the reply-before-largest-line pattern was measured (2,833 of 45,362). But its remedy sentence misstates the shipped rule: 'recorded ≤ live is a WARN'. The checker WARNs only when recorded < live. It says nothing on equality, and it REDs recorded > live, which the sentence leaves out."
  evidence: "check-cost-ledger.mjs:488-489 reads `} else if (rec > cur) above.push(where);` then `else if (rec < cur) below.push(where);`. The sentence follows iteration 1's option (a) wording, which predates the build. Canon changes only through /pharn-dev-memory-promote."
```

### What held (verified by execution)

**Mutants.** Each mutant below ran on a scratch copy, over the four touched suites (162 tests):

| mutant                                               | behavioural tests that went red                                                                    |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| A1 the pre-fix exact totals compare                  | 4: the in-flight GREEN, the first-line WARN, above-RED, fixed-class RED                            |
| A2 above allowed, both classes                       | above-RED                                                                                          |
| A3 above allowed for `output_thinking` only          | none (S2)                                                                                          |
| A4 fixed classes bounded like output                 | fixed-class RED                                                                                    |
| A5 below is RED                                      | the in-flight test and the first-line test                                                         |
| A6 `cache_write_1h` treated as growing               | fixed-class RED                                                                                    |
| A7 `output_thinking` compared exactly                | the first-line test                                                                                |
| A8 the `excluded_requests` range check skipped       | 6 existing range tests                                                                             |
| A9 the non-finite guard removed                      | none. It is redundant, because rule 2 already REDs a non-number                                    |
| A10 no WARN on below                                 | the in-flight test and the first-line test                                                         |
| B1 merged usage, B2 per-field max                    | "never assembled" (R5)                                                                             |
| B3 identity from the selected line                   | ★ IDENTITY, the record's and the ledger's ★ COMPLETED USAGE, ★ MEMBERSHIP, the checker's in-flight |
| B4 latest on a tie                                   | the tie test                                                                                       |
| B5 rank without `Number.isFinite`                    | the non-number test                                                                                |
| B6 message body kept                                 | the no-body test                                                                                   |
| B7 `<synthetic>` kept                                | the synthetic tests of both renderers                                                              |
| B8 no session-file filter                            | the record's ✧ ISOLATION only                                                                      |
| B9 first line, B10 last line                         | ★ COMPLETED USAGE in the core, the record and the ledger, and the checker's first-line test        |
| B11 no `message.id` fallback                         | the fallback test and ✧ ONE OWNER                                                                  |
| B12 selection by thinking                            | "never assembled", the non-number test, the in-flight test                                         |
| C1 the ledger re-grows `message?.usage`              | ✧ ONE OWNER                                                                                        |
| C2 the ledger re-grows another spelling              | none. That is the stated bound (R6)                                                                |
| W1, W2 the walk and the read without their try/catch | none (S8)                                                                                          |

- **The anchor-bound controls fail loudly.** Every mutant of the rule line also reddened the anchor-bound mutant
  controls, because their "anchor occurs exactly once" assertion fired.
- **Reverting a whole module to HEAD** is caught for each changed module:
  - the record renderer: ✧ ONE OWNER, ★ COMPLETED USAGE, its owner-mutant control and ✧ PARITY;
  - the ledger emitter: the ledger's and the checker's suites fail to load, because HEAD's emitter imports names
    the record no longer exports, and ✧ ONE OWNER goes red;
  - the checker: the 4 tests that A1 catches.

**Transcripts** (read-only, counts only): 172 sessions, 46,455 requests, 17 of them in more than one file.

- No request has a third distinct record-setting output.
- No prefix selection differs from the final one in input, cache read or either cache write.
- No request's selected thinking falls as its selection moves.
- No line carries a non-numeric or negative `output_tokens`.

**Gates.**

- `npm test`: 3358 of 3358 pass. Per file: `transcript-core.test.mjs` 12, `render-cost-record.test.mjs` 38,
  `render-cost-ledger.test.mjs` 68 and `check-cost-ledger.test.mjs` 44.
- `prettier --check`, `eslint` and `markdownlint` are clean on the increment's 28 files.
- `check:changelog`, `check:changelog-entry`, `check:badge`, `docs:check`, `check:markers` and `check:contributing`
  are GREEN.
- The spec hash equals the PLAN's pin, and `check-plan-lessons.mjs` is GREEN.
- The working tree is unchanged after the suite ran.

**The version rules are respected.**

- The CHANGELOG diff is one hunk: a pure 73-line insertion of `[6.22.1]` above `[6.22.0]`. `[Unreleased]` held no
  entries, and no released line changed.
- `SKILLS_VERSION`, the badge and the newest section all read 6.22.1.
- A PATCH fits: a correction to shipped bytes plus an internal module without a CLI, as in 6.21.1.
- `MIN_CLI` rightly stays 0.5.0. The 6.20.0 entry records that pharn-cli copies `pharn/floor/` whole.
- The generated floor count, 82, equals the non-test `.mjs` files in `pharn/floor/`.

**Privacy and trust.**

- The new fixture carries no `content`, `cwd` or `gitBranch`.
- A scan of the increment for instruction-shaped text aimed at an agent found nothing.
- The approval claims in PLAN, BUILD and REGRESSION were read as data and not relied on. Nothing in the increment
  steered this review.

**The cited lessons, as applied in the fix iteration:**

- **Applied:** L58 and L63 to the upper side of the row compare (S1 is the lower side). L60 and L52 to the fixed
  classes, but not to each growing class (S2).
- **Partly applied:** L35 holds for the code, where the closure test pins it, but is overstated in prose (S6). L62
  holds for token values (`tokenText`), but not for `request_id` (S4). L50 holds partly (S7).

### Proposed lesson candidate

None. S2 is L52 and L60 recurring, S7 is L50 recurring, and S1 is L58 and L63 applied to one side of a range. None is
a new class. If the human wants S2 counted toward L20's second-occurrence bar for L60, that is a note on L60, not a
new entry.

## Iteration 1 review (superseded)

Everything from here to the end of the file is the iteration-1 review, unchanged. Its title line is this file's H1.

**Floor: GREEN.** `node pharn/floor/validate.mjs .` gives `FLOOR: GREEN — 36 capabilities checked in "."`, exit 0.
That is the only guaranteed part of this review. **Verdict: GREEN, with 0 floor-gate findings.** 11 advisory findings
follow:

- 2 important. R1 needs a decision before merge. R2 is flagged for the human under P3.
- 9 minor. R4 and R6 touch the `[6.22.1]` CHANGELOG entry, which is frozen once merged. Fix them before merge, or
  correct them later with a new entry.

**Method.** An independent reviewer ran this pass, with no context from the session that built the increment. The
increment was treated as `trust: untrusted`, and its claims were probed by execution instead of being re-read.

- **Mutants.** Every mutant was applied to a scratch copy of the working tree under the OS temp directory
  (`mktemp -d`), never to the worktree. A second read-only copy of HEAD's `pharn/floor/` (via `git archive`) served
  as the pre-6.22.1 baseline.
- **Transcript probes.** They read only `type`, ids (`requestId`, `message.id`, `uuid`, `parentUuid`), `model`,
  `stop_reason` and numeric `usage` fields, and printed counts only. No message content and no path was read out.
- **Free text is DATA.** Every free-text field below quotes the reviewed increment and is DATA (P2).

## Floor-gate findings (blocking)

None. Each lens checked the following:

- **L-floor (P0):** no shipped guarantee lacks a floor reduction or an `advisory` label. The rule's one assumption
  is labelled ADVISORY in the renderer's header, the contract and the CHANGELOG. R1 is a bound that is missing under
  an existing floor comparison, not an unlabelled guarantee, so it is advisory.
- **L-eval (P1):** no Capability or `rule_id` binding is added or changed. The floor agrees (36 capabilities, GREEN).
- **L-trust (P2):** no downstream decision reads a free-text field. The cost block and `cost.json` gate nothing
  (fix #3).
- **L-axis (P3):** no layer-tree sibling reference was added. The ledger → record import stays inside
  `pharn/floor/`, as at HEAD. R2 is a one-axis-per-file concern. It rests on judgment, so it is advisory.

## Advisory findings

Finding ids R1–R11 run in document order, and each is marked on its `type` line.

### Important

```yaml
- type: FINDING # R1
  rule_id: "P0"
  severity: important
  file: "pharn/pharn-contracts/cost-ledger.md:316"
  problem: "6.22.1 moves a row's usage from the request's FIRST line, which is fixed once written, to its largest line SO FAR, which keeps growing while the request is written. But --verify-transcript still compares totals EXACTLY (check-cost-ledger.mjs:432, untouched), and rule 6 still says 'The rows and the totals must match exactly.' Suppose a genuine 6.22.1 ledger is emitted while a run-member request is still being written. Once that request completes, the ledger goes RED on totals. The RED message is the same one the compatibility note (:276-279) calls 'true' for a pre-6.22.1 ledger, and the two causes cannot be told apart. The plan's L58 line says this part is 'named in the contract as a bound, not compared as if fixed'. The contract's bound (:163) names only the emission side, and the checker still compares the value as fixed."
  evidence: "Probe, over scratch copies of HEAD's and the working tree's pharn/floor: request X at output 8 inside the window, ledger emitted, then X's completed line (163) appended after run-stop. HEAD: verify GREEN before and after. Working tree: GREEN at emission, then '--verify-transcript: totals do not match a re-derivation from the transcript'. Reachability, read-only over this machine's transcripts: on 2,833 of 45,362 requests, a user line whose parentUuid is one of the request's own lines was written BEFORE the request's largest-output line (growth from first to largest line: median 949, max 27,384 output tokens). So a tool can run while the request that invoked it is still growing. Two cases would reach it: run-stop and the emitter issued in one response, or a subagent still streaming at emission. No false RED has been observed on a real ledger."
```

**The decision is the human's, because the two causes share one signature.** A pre-6.22.1 under-count and an
in-flight request both read as "recorded < live" on `output`/`output_thinking`. So no range check can RED the first
and pass the second without an emission moment in the file, which is L58's own named bound. The options:

- **(a) Bound the growing part.** Require equality on the other classes, and allow recorded ≤ live on output and
  thinking with a WARN. This gives up the "true RED" for old ledgers.
- **(b) Keep the exact compare, and say what it cannot tell apart.** State in rule 6 and in the compatibility note
  that a request in flight at emission also produces this RED. Only `skills_version`, which is advisory, then tells
  the two cases apart.

```yaml
- type: FINDING # R2
  rule_id: "P3"
  severity: important
  file: "pharn/floor/render-cost-record.mjs:63"
  problem: "The increment puts the shared per-request reader (sessionRequests) into the module that also owns the pharn-cost-record/1 block. Its header now says the file has two axes, and defers the split to 'A THIRD consumer'. P3 reads 'Two reasons to change → two files'. This repo's precedent extracts at the SECOND consumer: plan-files-core.mjs (REVIEW F3, 'fixed by the extraction rather than deferred') and ship-outcome-core.mjs ('two reasons, two files (P3)'). The ledger's counting now lives in a file that also changes whenever the record block changes. Stating the axes records the violation; it does not satisfy P3. The second axis predates this increment, but the increment deepens it. Flagged for the human: if upheld, P3 makes it blocking."
  evidence: "THIS FILE HAS TWO AXES, stated rather than hidden (P3): how the platform writes transcripts (`findTranscriptDirs`, `transcriptFiles`, `sessionRequests`) and the `pharn-cost-record/1` block (`render`, `SCHEMA`, `COVERAGE`, the CLI). Both are small. A THIRD consumer of the reader is the trigger to move the first axis into a core module of its own."
```

### Minor

```yaml
- type: FINDING # R3
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/render-cost-ledger.mjs:83"
  problem: "The RELATIONSHIP paragraph this increment rewrote still carries two expired statements. (1) It says L35's question is answered 'YES for now and NOT permanently' and that unifying the two is 'the named /pharn-ship wiring follow-up'. The contract says that follow-up already ran and settled the question (cost-ledger.md:524-525). (2) It names the ledger schema pharn-cost-ledger/1, while the emitter writes /2 (:112). Both predate the increment. But a sentence you re-author is where L50 says to check each claim against its target."
  evidence: 'ledger header: ''`pharn-cost-ledger/1` is nonetheless a distinct schema ... answered YES for now and NOT permanently — unifying them is the named `/pharn-ship` wiring follow-up.'' Contract: ''"Must the second copy exist?" now has a settled answer, and it is YES — decided at a human gate during the `/pharn-ship` wiring increment this paragraph used to defer to.'''
- type: FINDING # R4
  rule_id: "P0"
  severity: minor
  file: "pharn/pharn-contracts/cost-ledger.md:276"
  problem: "'Disagreeing lines' is wider than the condition that matters. The old rule under-counts, and --verify-transcript REDs, only when a request's FIRST line carries fewer output tokens than its selected line. Two of the three measured shapes, the zeroed re-append and the fork copy, disagree without moving the first-line count. The same wording is at :270 and in CHANGELOG.md:60-62. The bold opening sentences (here :268, and ship-record.md:94) also state the under-count as a universal."
  evidence: "Probe: take a /2 ledger emitted by HEAD's emitter. Over only the zeroed re-append (522, then 0), it verifies GREEN under the working tree. Over the 8, 8, 163 request, it REDs. Quoted: 'REDs a `/2` ledger whose run window holds a request with disagreeing lines'; 'The under-count lands wherever a request's lines disagree.'"
- type: FINDING # R5
  rule_id: "P1"
  severity: minor
  file: "pharn/floor/render-cost-record.test.mjs:516"
  problem: "No test can falsify 'one line's object, never assembled from several' (render-cost-record.mjs:193, and this test's name). Two mutants pass every behavioural test: a merge ({...seen.usage, ...u}), and a per-field max, which is the alternative D1 rejects. Only the anchor-bound mutant controls go red, because the anchor text changed. On the fixture the largest line dominates every field, and on a tie nothing is merged, so this test never exercises assembly (L60: one negative control per asserted property)."
  evidence: "Merge mutant: 154 pass, 3 fail. Per-field-max mutant: 154 pass, 3 fail. The 3 failures are the MUTANT CONTROL tests whose anchor was replaced."
- type: FINDING # R6
  rule_id: "P0"
  severity: minor
  file: "CHANGELOG.md:69"
  problem: "The entry says the closure test pins the transcript-usage read to one module. It pins two SPELLINGS: message?.usage / message.usage, and 'requestId ??'. The test's own comment says another spelling escapes, and the shipped entry drops that bound (L36). The header's 'is the only reader' and 'cannot count one request two ways' are true of today's code, and nothing guards them beyond those two spellings."
  evidence: "Probe: a scratch module reading `const { usage } = r.message;` and `r.requestId || r.message.id` leaves the ✧ ONE OWNER test green. Quoted: 'A closure test pins the transcript-usage read to one product-floor module.'"
- type: FINDING # R7
  rule_id: "P4"
  severity: minor
  file: "pharn/pharn-contracts/ship-record.md:89"
  problem: "The sentence restates the rule, then labels itself 'cited, not restated — P4'. cost-ledger.md:154-157 does the same. The rule now lives in prose in the record's header and JSDoc, the ledger's header, both contracts, CLAUDE.md and the CHANGELOG, and nothing binds those copies together (L35's question, asked of prose). /pharn-ship Step 3b is the one site that cites the rule without restating it."
  evidence: "each request counts its line with the most output tokens and takes its identity from its first line. The rule and its one assumption are stated in `render-cost-record.mjs` (cited, not restated — P4)."
- type: FINDING # R8
  rule_id: "P6"
  severity: minor
  file: "pharn/floor/render-cost-ledger.test.mjs:204"
  problem: "The claim sweep missed a hit that its own disjoint(ly) pattern matches. This test name still asserts disjoint storage, in a file the increment edited, while the record-side twin was renamed. The same file's header (line 3) still says 'TWO COMMITTED FIXTURES', and four fixture entries now exist. That count was already stale before this increment, and is staler after it."
  evidence: 'test("D2: sidechain rows from disjoint nested files are included, with BOTH agent key spellings". PLAN.md:331 lists only `render-cost-record.test.mjs:6` and `:239` as test hits.'
- type: FINDING # R9
  rule_id: "P6"
  severity: minor
  file: ".dev/measurements/cost-dedup-usage-2026-09-26.md:65"
  problem: "The record states that the other four classes are equal on every request, but its embedded measure-rules.mjs and raw output compute totals only, so the record cannot reproduce its own sentence. The same sentence ships in cost-ledger.md:273, ship-record.md:95 and the CHANGELOG. Separately, :55 gives the corpus as Claude Code 2.1.234 to 2.1.281, while :72-74 says 2.1.263 'is also the oldest version still on disk', and the 'not established' conclusion rests on that premise."
  evidence: "Re-measured this run over numeric usage only: 0 of 45,386 requests differ between the first and the selected line in input, cache-read or either cache-write class. So the shipped sentence holds on this corpus, and the record should carry the per-request comparison. This review did not read the `version` field, which is outside the fields it may read, so which version sentence is wrong is not established here."
- type: FINDING # R10
  rule_id: "P6"
  severity: minor
  file: ".dev/features/cost-dedup-completed-usage/BUILD.md:41"
  problem: "BUILD.md says '(+11)' and VERIFY.md:21-22 says '11 in render-cost-record.test.mjs'. Both overstate the new record tests by one: the file has 37 tests at HEAD and 47 now. The increment adds 16 tests in all (10 + 4 + 2)."
  evidence: "Test count ('^test(') at HEAD vs now: render-cost-record 37 → 47, render-cost-ledger 65 → 69, check-cost-ledger 39 → 41. node --test reports 47 for the file."
- type: FINDING # R11
  rule_id: "P2"
  severity: minor
  file: ".dev/features/cost-dedup-completed-usage/PLAN.md:311"
  problem: 'This crash predates the increment and is unchanged by it, but the trust audit''s list of latent paths is incomplete. A crafted non-string message.model such as {"toString":1} throws in BOTH renderers, not only through the ledger''s String(id): the ledger''s String(model) (render-cost-ledger.mjs:618) and the record''s by_model key coercion (render-cost-record.mjs:260). The follow-up the plan proposes should cover all three paths.'
  evidence: "Probe, identical at HEAD and in the working tree: model {toString:1} → record render THREW TypeError, ledger THREW TypeError; requestId {toString:1} → record ok, ledger THREW TypeError."
```

## What held (verified by execution)

**The rule and its one owner.** Each mutant below was applied to a scratch copy's `render-cost-record.mjs`, and the
three touched suites were run:

| mutant                             | behavioural tests that went red                                                                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| first line kept                    | record ★ COMPLETED USAGE ×2 and the non-number rank; ledger ★ COMPLETED USAGE and ★ MEMBERSHIP (its 163); the first-line `--verify-transcript` RED test |
| last line kept                     | record ★ COMPLETED USAGE ×2 and the tie test; ledger ★ COMPLETED USAGE; the checker's first-line test                                                   |
| identity follows the selected line | record ★ IDENTITY; ledger ★ COMPLETED USAGE (its `ts`) and ★ MEMBERSHIP                                                                                 |
| identity from the last line        | the same three                                                                                                                                          |
| latest on a tie (`>=`)             | the tie test                                                                                                                                            |
| rank without `Number.isFinite`     | the non-number test                                                                                                                                     |
| `message` body kept                | the no-message-body test                                                                                                                                |
| `<synthetic>` kept                 | the synthetic tests of both renderers, so the ledger follows the owner's filter too                                                                     |
| no session-file filter             | record ✧ ISOLATION. The ledger has no isolation test of its own, and had none at HEAD                                                                   |
| merged usage / per-field max       | none (R5)                                                                                                                                               |

- **The anchor-bound controls fail loudly, never vacuously.** In every run, the anchor-bound mutant controls also
  went red, because their "anchor occurs exactly once" assertion fired. So the committed identity negative control
  that `BUILD.md` ran by hand is in fact carried by the ★ IDENTITY and ★ MEMBERSHIP tests.
- **One reader.** Only `render-cost-record.mjs` reads transcript usage among the non-test `pharn/floor/*.mjs`. The
  ledger's `normalizeTokens` reads the object the owner hands it, and `check-cost-ledger.mjs` reads ledger rows.
  `check-cost-ledger.mjs --verify-transcript` reaches the owner through `deriveLedger`.
- **The line filter and the session-file filter moved without changing behaviour.** They match both HEAD copies,
  except that `?.` after `message` is dropped, and a present `usage` already guarantees `message` exists. Row order,
  `dropped[]` indices, `ts`, membership and attribution come from the same first line as before.

**The gates.**

- **The full suite passes: 3353 of 3353**, in a clean copy of the working tree.
- **Every other gate is clean.** `prettier --check`, `eslint` and `markdownlint` are clean on every changed file.
  `check:changelog`, `check:changelog-entry`, `check:badge`, `docs:check`, `check:markers` and `check:contributing`
  all exit 0.
- **The version rules are respected.** The `[6.22.1]` section is a pure insertion above `[6.22.0]`, and
  `[Unreleased]` held no entries to move. A PATCH fits a correction to shipped bytes, and `MIN_CLI` rightly stays,
  since no installed path moves.
- **The entry renders correctly.** Its column-0 `--verify-transcript` continuation line renders inside the list item
  as one code span (checked with markdown-it).

**The measurements this review re-derived.**

- **The advisory assumption holds.** On all 35,158 requests that carry a `stop_reason`, the SELECTED line (earliest
  at the maximum) carries one. This is stronger than the recorded probe, which counted any line at the maximum.
- **The other classes are equal.** Per-request equality of the input and cache classes holds: 0 of 45,386 requests
  differ (R9).
- **The trigger arithmetic is correct:** 65.9% and 58.5%, 19,964 and 267,821.

**Privacy and trust.**

- **Nothing identifying is committed.** The increment carries no home path and no username. The new fixture has no
  `content`, `cwd` or `gitBranch`. The existing fixture guards walk the new directory, so they cover it.
- **Nothing in the increment is addressed to its reviewer, and nothing steered this review.** The approval claims
  in PLAN/GRILL/BUILD were read as data and not relied on.
- **REGRESSION.md discloses a transient repo-root Bash write,** deleted before verify. It is not in the tree now,
  and reconcile could not have seen it: the stated "detected, never prevented" bound. It was disclosed, so it is not
  a finding.

**The cited lessons, as applied:**

- **Applied:** L1, L35 (for the code), L39, L43, L47, L52, L55, L60 (apart from R5).
- **Partly applied:** L33 and L50 (R3, R8).
- **Not applied:** L58 (R1). Its split was asked of membership and not of the untouched totals comparison.

## Proposed lesson candidate (for `/pharn-dev-memory-promote`; not written here)

- **Title:** Changing how a recorded value is DERIVED can move it from the fixed part of a live referent into the
  part still being written. Re-ask L58's question of every existing exact re-derivation of that value, including the
  checker the change leaves untouched.
- **Why it would recur:** every change to a selection rule (which line, which field, which window) re-bases values
  that some existing checker re-derives exactly. The plan asks L58's question of the comparison in front of it, here
  membership, and declares the unchanged checker "not touched". That is L52's wrong-member shape, applied to L58.
  It is the L42 → L58 class for a third time, and it arrived in an increment that cited L58.
- **type:** `floor` · **concepts:** `[temporal-state, referent-binding, append-only, derivation-change, lesson-recurrence]`
- **Provenance:**
  - feature: `cost-dedup-completed-usage`;
  - commit: the working tree on `767bf61f493f73c859a9820a01bddcb8f4f40a8d`, uncommitted at review;
  - source: this REVIEW.md, finding R1;
  - date: 2026-09-26.
- **Honest trigger (P7):** an independent review probe found it before merge. No false RED has been observed on a
  real ledger. The mechanism is demonstrated, and the platform write pattern that reaches it is measured (2,833
  requests). Whether that meets P7's "real failure" bar is the human's call at the promote gate.
