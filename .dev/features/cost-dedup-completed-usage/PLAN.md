# PLAN — cost-dedup-completed-usage

- spec_content_hash: 4950796f5342df20a298fe22812e45dec3c15317592bd2358a31e149d2dc1c7f
- applied_lessons: [L1, L33, L35, L39, L43, L47, L50, L52, L55, L58, L60]
- increment: Count each transcript request at its completed usage (its line with the greatest `output_tokens`) instead of its first line, in ONE reader both cost renderers share; correct the two expired transcript claims wherever they ship; patch release `SKILLS_VERSION` 6.22.0 → 6.22.1.
- layer(s): product floor (`pharn/floor/`); pharn-contracts (`cost-ledger.md`, `ship-record.md`); product command (`/pharn-ship`); apparatus (tests, one fixture, `.dev/measurements/`, `CLAUDE.md`)
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]

## Trigger (P7) — a measured failure, re-derived this run

The maintainer measured it on 2026-09-26 and named the file. Each point below was re-read or re-measured this run.

1. **Two copies of one rule, not one.** `pharn/floor/render-cost-record.mjs:188-190` keeps the FIRST usage-bearing
   assistant record per `requestId ?? message.id` and sums its `message.usage`. So does `pharn/floor/render-cost-ledger.mjs:607-609`,
   in its own copy of the same loop. The ledger imports only the lookup and the file walk. The session-file filter
   (`render-cost-record.mjs:157-160` / `render-cost-ledger.mjs:568-571`) and the line filter (`:183-187` / `:602-606`) are
   copied too. `check-cost-ledger.mjs --verify-transcript` re-derives through `deriveLedger` → `buildLedger`, which is the
   second copy.
2. **The justification is false on current transcripts.** Both headers (`render-cost-record.mjs:38-40`,
   `render-cost-ledger.mjs:40-41`) say one API response is written as several lines "that each repeat the SAME usage
   object". Measured, read-only, numeric usage fields, ids and timestamps only, never message content:
   - **The maintainer's file**, `…/9a44eb3f…/subagents/agent-ac9a6c6d0cb423fc9.jsonl`, whole file as of 11:22 today:
     245 requests, 184 of them on more than one line, 11 whose lines disagree on `output_tokens`. `req_011CfR5fSd…`
     reads 8, 8, 163. Its first two lines carry no `output_tokens_details` and `stop_reason: null`; the third carries
     `stop_reason: "tool_use"` and 22 thinking tokens. First-line output 7,693 against 35,264 at the largest line. The
     maintainer's own figure (1,657 against 28,707) covers a 233-request window of the same file.
   - **Every local transcript**: 986 files, 44,253 requests, 2026-09-07 to 2026-09-26, Claude Code 2.1.234–2.1.281,
     walked in `transcriptFiles()` order (sorted paths, `tool-results/` skipped). The corpus is live and drifted by a
     few dozen requests between runs.

     | rule, per request                         | output     | thinking   | input   | cache read     |
     | ----------------------------------------- | ---------- | ---------- | ------- | -------------- |
     | first line (today)                        | 25,703,622 | 9,469,497  | 232,414 | 14,352,722,236 |
     | last line in walk order                   | 38,976,711 | 16,183,409 | 232,410 | 14,352,454,415 |
     | greatest `output_tokens`, earliest on tie | 38,996,675 | 16,190,248 | 232,414 | 14,352,722,236 |

     Cache writes (5m 150,553,862; 1h 125,844,583) are equal under all three. So first-line counting reports 66% of
     the output tokens and 58% of the thinking tokens. The other classes are exact.

3. **A second claim from the same measurement expired too.** Both the record's header (`:40-41`) and two shipped docs
   say subagent transcripts are stored DISJOINTLY from the parent. 17 request ids now appear in a parent transcript AND
   in a forked subagent's (`subagents/agent-*.jsonl`, line 2, `isSidechain: true`, the fork's `agentId`). 16 copies
   repeat the final usage. One request's copies, in four agents, repeat an EARLY line: output 9 of 16,886.
4. **Why "keep the last line" is not the fix.** Two more shapes, both measured:
   - **Zeroed re-append:** a request is written again later in the same file, same `uuid` and timestamp, with
     input, output and cache-read counts 0, while its `cache_creation` split and `iterations[]` keep the real values.
     Seen on 2 requests.
   - **Fork copy:** the early-line fork copy above. The subagent's file sorts after the parent's, so "last" picks
     the copy.

   Against the largest line, last-line counting loses 19,964 output tokens and 267,821 cache-read tokens. Among the
   23,773 requests with several lines at the maximum, no two of those lines differ in any token class, so the
   tie-break direction changes no number.

## The design

**D1 — The per-request rule.** A request's `usage` is the `message.usage` of its line with the greatest
`output_tokens`. A value that is not a finite number ranks below every count (`-1`), and the earliest line wins a
tie. Its id and identity (`timestamp`, `sessionId`, `message.model`, `agentId`/`attributionAgent`, `isSidechain`,
`attributionSkill`, `version`) stay its FIRST line's, in `transcriptFiles()` order, exactly as today.

- **Not the last line:** it is wrong on the two measured shapes in Trigger 4. The maintainer's brief allowed either
  last or max, and the data picks max.
- **Not a per-field max:** that assembles a usage object no line carried, and the ledger copies `usage` verbatim.
- **Identity from the first line, not from the selected one (L39, L58).** The reader has two consumers asking
  different questions. The record block asks "how much". The ledger also asks "was it inside the run window, and in
  which stage", and it keys both on the request's timestamp. A first line's timestamp is fixed once written. The
  selected line can change until the request completes. Measured: taking the selected line's timestamp would move
  9,129 requests' timestamps, by up to 301.75 s, and re-decide membership and attribution for no reason the defect
  gives. With the first line, membership, attribution, row `ts`, `window_start/_end` and `excluded_requests` are
  unchanged by construction; only `usage` and `tokens` move.

**D2 — One owner (L35).** `render-cost-record.mjs` exports `sessionRequests(projectDir, sessionId)`, returning
`{ files, requests }`, where `requests` is `[{ id, record, usage }]` in first-occurrence order. It owns the
session-file selection, the line filter (assistant, `message.usage` present, model not `<synthetic>`, an id present)
and the D1 selection. `aggregate()` and `buildLedger()` both consume it. The ledger's three copies are deleted, and
its `SYNTHETIC` constant and `transcriptFiles` import go with them.

- `check-cost-ledger.mjs` needs no edit: `--verify-transcript` reaches the owner through `deriveLedger`.
- L35's question, "must the second copy exist?", is answered **no**: both callers ask for the same per-request read.
  They differ only in what they fold, which stays in each caller.
- **Memory.** The reader must now hold one record per request until the walk ends, because a later line can replace
  the usage. It keeps the first record with `message` reduced to `{ model }`, so no message body is retained or handed
  to a caller. Before, each record was folded and dropped line by line.
- **Why here and not a new core module (P3).** The lookup and the walk already live in `render-cost-record.mjs`, and
  the ledger already imports them. The reader changes for the same reason they do: how the platform writes
  transcripts. A third consumer would be the time to extract a core; none exists.

**D3 — Correct both expired claims, in an OPEN form (L33, L47, L50).** "Several lines, each repeating the SAME usage
object" becomes "several lines, which need not carry the same usage", with the three observed shapes named. "Stored
DISJOINTLY" becomes "included; a forked subagent's transcript can open with a copy of a parent line, which the
grouping counts once, under the parent's identity". No new count goes into a shipped header. The numbers live in the
dated measurement record, the CHANGELOG entry, and one dated sentence in the contract's compatibility note. The
2.34× figure stays: it is a dated measurement of a raw line sum, and it is still true of that corpus.

**D4 — Records already written (L42's question, via L58).** No schema, `dedup_key` or contract shape changes, so
this is a PATCH (6.22.1) and `MIN_CLI` stays 0.5.0. Existing records are not rewritten. A `ship-record.json` `cost`
block sits inside attested content. Stated in `cost-ledger.md` "Compatibility", `ship-record.md` and the CHANGELOG:

- A record written before 6.22.1 under-counts `output` and `output_thinking` (`thinking` in the record block) wherever
  one request's lines disagree. The other four classes are exact.
- `--verify-transcript` re-derives under the current rule. While the transcript exists, it REDs such a ledger on
  totals, and that RED is true: the check answers what the transcript holds NOW under the current rule, and the file
  recorded what the old rule computed THEN.
- The ledger's `skills_version` says which rule wrote it.

The checker's RED message does not change. No failure asks for it (P7), and the note carries the explanation.

**D5 — Tests bound to measured shapes, one negative control per asserted property (L52, L55, L60).** See "Tests to
write".

**D6 — Meta-docs (L1).** `CLAUDE.md`'s cost-ledger comment ("Transcript location + the walk are IMPORTED from
render-cost-record.mjs") gains the per-request rule. `README.md` changes only its badge. The generated `CURRENT-STATE`
region lists names and counts, and this increment adds no product module, command or contract.

## Applied lessons

- **L1** — meta-doc sweep before scoping: `CLAUDE.md` names the import relationship D2 extends, so it is in
  `## Files`. `README.md` carries only the badge. No trusted doc restates either claim (grep this run), so nothing is
  raised for a human.
- **L33** — the sweep for both claims ran on the shortest invariant substrings (`same usage`, `repeat… the same`,
  `disjoint`), case-insensitively, and treated the first grep as a lower bound. Reading the referent found one variant
  it missed: `_same_ usage` in the 2026-08-18 measurement.
- **L35** — the dedup rule, the session-file filter and the line filter were each stored twice. D2 retires the second
  copy rather than binding the two with a parity test. It asked "must the second copy exist?" first, and the answer
  is no.
- **L39** — one reader, two consumers asking different questions (how much / which window and stage). D1 takes usage
  from the selected line and identity from the first line, because one line cannot answer both correctly.
- **L43** — the existing ✧ parity test was GREEN while both renderers under-counted: it certified that they agree,
  never the number. The new ★ tests bind the rule to line shapes measured on real transcripts, and the parity test's
  comment says what it cannot see.
- **L47** — the retracted claims are replaced in an OPEN form ("need not carry the same usage", "can open with a
  copy"), never with a new standing count. Counts go only into dated places.
- **L50** — the sweep ran by REFERENT as well as by claim. Every cite of the 2026-08-18 measurement's findings 1–2 and
  of its 2.34× figure is enumerated under "Sweeps". That is how the second expired claim (disjoint storage) was found.
- **L52** — the remedy "write a test" is quantified over the SET of consumers of the rule: the record renderer, the
  ledger emitter, and `--verify-transcript`. Each gets its own test over the new fixture. The closure test pins the
  transcript-usage read to one module, so a third consumer re-copying it fails.
- **L55** — the old ★ DEDUP fixtures repeat one usage object per request because their author's model said so, and
  they certified that model. The new fixture copies the numbers and envelope shape of the three measured records:
  8/8/163, the zeroed re-append, and the early-line fork copy.
- **L58** — `--verify-transcript` binds a ledger to a live, append-only referent. The part that cannot change after
  emission is each request's first line, and D1 keys membership on it. The part that can change is a request still
  being written at emission, whose largest line may still grow. That part is named in the contract as a bound, not
  compared as if fixed.
- **L60** — each asserted property gets a negative control that can turn it red. The first-line mutant makes "counts
  163" red (8). The last-line mutant makes "counts 522 / 16,886" red (0 / 9). A ledger run over a mutated owner makes
  "the ledger follows the owner" red. The membership boundary is placed between one request's first and last line.
  Every mutation first asserts that its anchor occurs exactly once and that the mutant differs from the source.

## Files

- `pharn/floor/transcript-core.mjs` — NEW (F2): the transcript lookup, the walk and `sessionRequests()`, moved out of
  `render-cost-record.mjs` — layer product floor
- `pharn/floor/transcript-core.test.mjs` — NEW (F2): the core's own tests, moved with it, plus R5's — layer product
  floor tests
- `pharn/floor/check-cost-ledger.mjs` — F1: `--verify-transcript` compares per row, bounding the growing classes —
  layer product floor
- `pharn/floor/render-cost-record.mjs` — D1 + D2: export `sessionRequests()`; `aggregate()` consumes it; the header's
  FLOOR paragraph and its subagent sentence rewritten (D3) — layer product floor
- `pharn/floor/render-cost-ledger.mjs` — D2: `buildLedger()` consumes `sessionRequests()`; its copies of the session
  filter, the line filter and the first-line dedup deleted; the header's dedup paragraph and the RELATIONSHIP section
  corrected (D3) — layer product floor
- `pharn/pharn-contracts/cost-ledger.md` — which line a row's identity and its usage come from, with the advisory bound
  under it; rule 6's platform-behaviour bullet; "Compatibility" gains the pre-6.22.1 note (D4); the relationship
  section's "one implementation" sentence — layer pharn-contracts
- `pharn/pharn-contracts/ship-record.md` — "What it IS": both expired claims (D3) and the pre-6.22.1 note (D4) —
  layer pharn-contracts
- `.claude/commands/pharn-ship.md` — Step 3b item 1: both expired claims, re-stated as a cite of the renderer (D3) —
  layer product command
- `SKILLS_VERSION` — 6.22.1
- `README.md` — the version badge
- `CHANGELOG.md` — `## [6.22.1] - 2026-09-26`, `### Fixed`
- `CLAUDE.md` — the cost-ledger comment's import sentence (D6)
- `pharn/floor/render-cost-record.test.mjs` — the ★ header rewrite, the "disjoint storage" test name, the D5 record
  tests and both mutant controls — layer product floor tests
- `pharn/floor/render-cost-ledger.test.mjs` — the D5 ledger tests: rows, the membership boundary, the owner mutant,
  parity over the new fixture, the one-owner closure — layer product floor tests
- `pharn/floor/check-cost-ledger.test.mjs` — the D5 `--verify-transcript` tests over the new fixture — layer product
  floor tests
- `pharn/floor/fixtures/cost-ledger/usage-snapshots/00000000-0000-4000-8000-00000000beef.jsonl` — NEW: the parent
  transcript, hand-authored from the measured shapes (D5) — layer product floor tests
- `pharn/floor/fixtures/cost-ledger/usage-snapshots/00000000-0000-4000-8000-00000000beef/subagents/agent-fff3333333333333.jsonl`
  — NEW: the forked subagent's transcript (D5) — layer product floor tests
- `.dev/measurements/cost-dedup-usage-2026-09-26.md` — NEW measurement record: corpus, method, the script, raw
  numbers — apparatus
- `.dev/measurements/token-cost-2026-08-18.md` — one dated pointer under extraction traps 1 and 2 — apparatus
- `.dev/features/cost-dedup-completed-usage/PLAN.md` — this plan
- `.dev/features/cost-dedup-completed-usage/GRILL.md` — the grill
- `.dev/features/cost-dedup-completed-usage/BUILD.md` — the build record
- `.dev/features/cost-dedup-completed-usage/REGRESSION.md` — the regress record
- `.dev/features/cost-dedup-completed-usage/regression-report.json` — the regress verdict
- `.dev/features/cost-dedup-completed-usage/VERIFY.md` — the verify record
- `.dev/features/cost-dedup-completed-usage/verify-report.json` — the verify verdict
- `.dev/features/cost-dedup-completed-usage/REVIEW.md` — the review
- `.dev/features/cost-dedup-completed-usage/SHIP.md` — the ship record
- `docs/lessons-index.md` — K7 (fix iteration 2): regenerated by `npm run docs:generate`, a declared Bash write
  (L19), because the index renders each entry's token estimate — generated docs

### Explicitly not touched

- `pharn/floor/render-run-report.mjs` — reads `cost.json` and markers, never a transcript.
- The four trusted docs — none restates either claim (grep this run), and they are human-only in any case.
- `MIN_CLI` — no installed path moves.
- `CHANGELOG.md`'s released sections — `[2.7.0]`'s "What is FLOOR" paragraph restates the same-usage claim. Released
  sections are frozen, and the 6.22.1 entry is the correction.
- The committed fixtures `single-session.jsonl`, `session-continued.jsonl` and `with-subagents/` — measured: no
  request in them has lines that disagree, so every expected number built on them stands.
- The schemas (`pharn-cost-record/1`, `pharn-cost-ledger/2`) and `dedup_key` — the grouping key is unchanged; only
  the choice of line within a group moves.

## Contracts satisfied

- `pharn-contracts/cost-ledger.md` — the ledger's shape and every floor rule are unchanged. The contract gains the
  statement of which line a row's identity and its `usage` come from, and the compatibility note. The checker still
  enforces the same rules (cited, not restated — P4).
- `pharn-contracts/ship-record.md` — the `cost` block's shape (`pharn-cost-record/1`) is unchanged. Its "What it IS"
  paragraph stops asserting the two expired platform behaviours and cites the renderer's rule.

## Tests to write (P1 — a floor checker's specification is its `*.test.mjs`)

**The fixture** (`usage-snapshots/`, session `00000000-0000-4000-8000-00000000beef`). It is hand-authored from the
records measured above: numbers are copied from them, and envelopes are reduced to the fields the readers use. It has
no `content` and no `cwd`, following the `with-subagents/` precedent. Five requests:

- **A `req_fx_snapshots`** — three lines reading output 8, 8, 163. The first two have no `output_tokens_details` and
  `stop_reason: null`, the observed early shape. The last has `stop_reason: "tool_use"` and 22 thinking tokens. Each
  line has its own timestamp (…:00.901, …:00.903, …:01.691). Model `claude-opus-5-5`.
- **B `req_fx_reappended`** — its line (output 522). Then, after other requests, the same line re-appended with the
  same `uuid` and timestamp, input/output/cache-read 0, and the original cache split and `iterations[]`.
- **C `req_fx_forked`** — two parent lines at the final usage (16,886 output, 6,839 thinking; model
  `claude-fable-5-1`). A copy of an EARLY line opens the forked subagent's file: output 9, no thinking detail,
  `stop_reason: null`, `isSidechain: true`, `agentId: "fff3333333333333"`.
- **D `req_fx_plain`** — one ordinary line.
- **E `req_fx_subagent_own`** — the fork's own request.

The expected totals are stated in the test as sums, so they can be checked by hand. First-line rule: A counts 8.
Last-line rule: B counts 0 and C counts 9.

**`render-cost-record.test.mjs`**

1. **★ Fixture preconditions (non-vacuity), read from the raw bytes and never through the module:** A's lines carry
   at least two distinct `output_tokens`. B's last line in file order carries output 0. C's id is present in two
   files. The subagent file sorts after the parent's. If any of these failed, every rule test below would pass for
   free.
2. **★ Completed usage.** `aggregate()` / `render()` totals equal the max-rule sums. Through `sessionRequests()`: A
   reads 163 and 22; B reads 522, input 2 and cache-read 223,446; C is counted once at 16,886.
3. **★ Identity from the first line.** A's `record.timestamp` is its first line's. C's `record` is the parent's
   (`isSidechain` false, no `agentId`).
4. A tie keeps the earliest line's `usage`, told apart by a `service_tier` token.
5. A non-number `output_tokens` (`"999"`) ranks below 3, and an absent one ranks below 0.
6. The returned `record.message` is exactly `{ model }`, so no body is retained.
7. **★ MUTANT CONTROLS (L60).** The module is copied to a temp dir with the selection line replaced, and each
   mutation asserts first that its anchor occurs exactly once and that the mutant differs from the source.
   - First-line rule → A counts 8, so the ★ 163 assertion is falsifiable.
   - Last-line rule → B counts 0 and C counts 9, which is why the rule is max and not last.
8. The ★ DEDUP header paragraph is rewritten (D3), and the "disjoint storage" test name is corrected.

**`render-cost-ledger.test.mjs`**

1. **★ Rows.** A's row has `tokens.output` 163, `tokens.output_thinking` 22 and `usage.output_tokens` 163, and its `ts`
   is A's FIRST line's. C appears once, with `sidechain: false` and `agent_id: null`. B's row has input 2.
2. **★ Membership reads the first line.** A run window closes between A's first and last line (`run-stop` at
   …:01.000). A stays a member (`requests.length` 1, `excluded_requests` 4). A reader keyed on the selected line would
   exclude it.
3. **★ The ledger follows the owner (L60 at the consumer).** The non-test `pharn/floor/*.mjs` are copied to a temp
   dir, and the first-line mutation is applied to the copy's `render-cost-record.mjs`. The copied
   `render-cost-ledger.mjs --stdout` over the fixture reads 8 for A, and the unmutated copy reads 163.
4. **✧ Parity** ranges over both fixtures (`single-session` + `usage-snapshots`). Its comment states the L43 bound:
   agreement was GREEN while both renderers under-counted.
5. **✧ One owner (closure, L35/L52).** Across the non-test `pharn/floor/*.mjs`, exactly one module reads
   `message?.usage` / `message.usage`, and exactly one spells the id fallback `requestId ??`. Both are
   `render-cost-record.mjs`. Negative control: each pattern matches the pre-fix ledger's own spelling, quoted in the
   test. Bound: another spelling escapes (L36), and the test says so.

**`check-cost-ledger.test.mjs`**

1. `--verify-transcript` over `usage-snapshots/`: the freshly emitted ledger is GREEN.
2. **A first-line ledger.** A's row is rewritten to its first line's usage and tokens, and the views are recomputed so
   the file agrees with itself; the internal checks are GREEN. `--verify-transcript` REDs it with "totals do not match
   a re-derivation from the transcript", which is the documented pre-6.22.1 consequence (D4).

Every existing test stays green unchanged: the committed fixtures have no disagreeing lines (Explicitly not touched).

## Guarantee audit (P0)

- "Each request is counted once, at the usage of its line with the greatest `output_tokens`, the earliest on a tie" →
  **floor**: primitive #3 (set membership and an integer compare in a deterministic, tested renderer). Pinned by the ★
  tests and both mutant controls.
- "That line is the request's COMPLETED usage" → **advisory**. It rests on a platform behaviour: a request's lines
  never record more output than its complete one. Observed on all 44,253 requests; the only two whose counts ever fell
  are the zeroed re-appends, which the rule handles. Stated in the renderer's header and in the contract.
- "Identity and timestamp come from the request's first line in walk order, so membership and attribution do not
  move" → **floor** (sorted walk, first-set). Pinned by the ledger's membership boundary test.
- "The rule has one owner" → **floor** for the two spellings the closure test pins (primitive #3), plus the import
  structure. **Bounded:** a re-implementation under another spelling is not caught (L36).
- "The ledger's numbers follow the owner" → pinned by the owner-mutant ledger run (a test's verdict over the emitter's
  output).
- "`--verify-transcript` applies the same rule" → structural (it calls `deriveLedger`). Pinned by the checker tests.
- "A record written before 6.22.1 under-counts output by about 34% and thinking by about 42%" → **advisory**: a dated,
  machine-local measurement over one maintainer's transcripts. It is never a claim about any given ledger.
- "The fixture carries no message content" → a description of how it is built (hand-authored, no `content` key). The
  committed-fixture guard checks absolute paths only, and this plan does not present it as a content check.

## Trust audit (P2)

Transcripts are untrusted input to both renderers.

- **D1 changes which line's numbers count.** A crafted line appended for an EXISTING request id with a larger
  `output_tokens` now raises that request's counted usage. Before, a crafted NEW request id could already add any
  usage. Same class, no new reach: `cost.json` and the `cost` block gate nothing (fix #3). A crafted line still cannot
  take a request's identity unless it is walked first, as before.
- **`outputRank` reads only a finite number** (`Number.isFinite`), so a string or an object never takes part in a
  comparison. The ledger's verbatim `usage` copy still passes `sanitizeUsage` / `isTokenLeaf`.
- **The returned record keeps `message` as `{ model }` only.** No message body leaves the reader (structural, pinned
  by a test).
- **Latent, and not changed here:** the ledger's `String(id)` throws on a crafted non-string id such as a
  `{"toString":1}` `requestId`. That path exists before and after this increment, unchanged. It is proposed as a
  follow-up, not fixed silently here (P7).

## Determinism audit (P5)

The reader walks `transcriptFiles()`'s sorted list, line by line. "First" and "greatest (strict `>`)" are total over
that sequence, and nothing reads a clock or randomness. Given the same bytes, the output is byte-identical: the
existing ✦ DETERMINISM test runs over a fixture, and the new fixture is added to it. No branch rests on model
judgment.

## Sweeps (declared, with their boundaries — L49, L50)

- **By claim.** Case-insensitive grep for `same usage`, `repeat(s|ing)? the same` and `disjoint(ly)`, over `pharn/`,
  `.claude/`, the root docs, `.dev/floor/`, `.dev/measurements/` and `docs/`. Shipped hits:
  - `render-cost-record.mjs:38-41`;
  - `render-cost-ledger.mjs:40-41`;
  - `ship-record.md:86-89`;
  - `pharn-ship.md:803-805`.

  Apparatus hits: `render-cost-record.test.mjs:6` and `:239`; `token-cost-2026-08-18.md:33-36` and `:347`. Released
  CHANGELOG text is frozen. A variant spelling, `_same_ usage` (`token-cost-2026-08-18.md:33`), was found by reading
  the referent, not by the grep.

- **By referent.** The 2026-08-18 measurement's findings 1–2, with every cite of that file and of its 2.34× figure:
  - `render-cost-record.mjs:39-40`;
  - `render-cost-record.test.mjs:7`;
  - `render-cost-ledger.mjs:43`;
  - `ship-record.md:87`;
  - `CHANGELOG.md` (released);
  - the measurement itself.

  The 2.34× figure stays true as a dated over-count of a raw line sum. Only the two findings expired.

- **Readers of transcript usage** (the set D2 must cover, L52). `grep -rln 'message?.usage\|message\.usage\|\.jsonl'`
  over the non-test `pharn/floor/`, `.dev/floor/` and `.claude/hooks/`:
  - `render-cost-record.mjs` and `render-cost-ledger.mjs` read transcript usage;
  - `mark-phase.mjs`, `loop-fresh-core.mjs` and `render-run-report.mjs` read other `.jsonl` files (markers, the
    freshness ledger), never a transcript;
  - `check-cost-ledger.mjs` reaches a transcript only through `deriveLedger`.

  Boundary: a grep, not a proof.

## Post-grill amendments (folded into the build; none changes scope or design)

`GRILL.md` raised 12 advisory concerns, none blocking-severity. Each is applied inside `## Files` as follows:

- **G1 (Guarantee audit, the falling-count sentence):** in sorted walk order THREE requests' counts fall, the two
  zeroed re-appends and the early-line fork copy. Shipped text gives no count here (L47): a request's count can fall in
  walk order, and the rule handles it.
- **G2 (D3):** "under the parent's identity" becomes "under the identity of the copy walked first — the parent's, for
  every observed copy".
- **G3, G4 (D4):** the other classes "were equal on every measured request", dated. The `--verify-transcript` RED is
  stated for a `/2` ledger whose window holds a request with disagreeing lines; a `/1` is declined with a WARN.
- **G5 (D4):** `skills_version` _indicates_ which rule wrote a ledger; it is advisory, because it records the
  configured version, not the code that ran.
- **G6 (fixture provenance):** A–C copy measured records; D–E are ordinary lines with chosen numbers.
- **G7 (sweep):** the comment in `render-cost-ledger.test.mjs`'s "one row per DEDUPED requestId" test is reworded.
- **G8 (closure test):** no other module's prose spells the two pinned patterns, the failure message says so, and the
  negative control runs through the same predicate.
- **G9 (first-line ledger test):** A's row is rebuilt through the emitter's own `sanitizeUsage` / `normalizeTokens`
  over the fixture's raw first line.
- **G10 (P3):** `render-cost-record.mjs`'s header states the file's two axes and the extraction trigger.
- **G11 (privacy):** the measurement record quotes no home path and no username-bearing directory name.
- **G12 (row size):** the CHANGELOG says a row's verbatim `usage` is now the completed line's object.
- **Also from the grill:** on every request carrying a `stop_reason`, the largest line carries it. That is the rule's
  evidence, and it goes into the measurement record.

## Fix iteration 1 — the GATE-2 decisions (2026-09-26, the maintainer, through the form)

The first review (`REVIEW.md`: GREEN, 0 floor-gate, 2 important and 9 minor) reached GATE 2. The maintainer chose to
fix and re-run, to bound R1, to extract a core for R2, and to promote the lesson (L63, written by
`/pharn-dev-memory-promote` under its own scope, before this iteration's build anchor). The iteration adds three
paths to `## Files` and changes nothing outside the design the review exposed:

- **F1 — R1, bound the growing part (L58, L63).** `check-cost-ledger.mjs --verify-transcript` compares ROW by row
  instead of totals:
  - the request-id sets must still be equal;
  - each row's input, cache-read and both cache-write classes must be EQUAL to the re-derived row's;
  - `output` and `output_thinking` must satisfy recorded ≤ re-derived. Above is RED, because the transcript never held
    it. Below is a WARN naming both causes it cannot tell apart: a request still being written at emission, and a
    ledger written before 6.22.1.

  The contract's rule 6 and its compatibility note say the same, and a pre-6.22.1 ledger now reads as that WARN, no
  longer as RED.

- **F2 — R2, one axis per file (P3).** `pharn/floor/transcript-core.mjs` (NEW) takes `findTranscriptDirs`,
  `transcriptFiles`, `sessionRequests` and their helpers. `render-cost-record.mjs` keeps only the
  `pharn-cost-record/1` block and imports the core, and `render-cost-ledger.mjs` imports the core directly. There are
  no re-exports: each function has exactly one import address. `pharn/floor/transcript-core.test.mjs` (NEW) holds the
  core's own tests, moved with it, and the one-owner closure now names `transcript-core.mjs`. The README's generated
  floor count moves by one (`npm run docs:generate`).
- **F3 — the minor findings, each in a file already in scope:**
  - R3: the ledger header's RELATIONSHIP paragraph now gives the settled YES and the `/2` schema.
  - R4: "wherever a request's FIRST line carries fewer output tokens than its largest", replacing "disagreeing lines".
  - R5: a test in which only the selected line's whole object passes. Both a merge mutant and a per-field-max mutant
    fail it, run by hand.
  - R6: the CHANGELOG names the closure's two spellings and its bound.
  - R7: `ship-record.md` cites without restating, and `cost-ledger.md` is the one prose definition.
  - R8: the "disjoint nested files" test name and the fixture-count header.
  - R9: the measurement record carries the per-request equality result and corrects its version sentence.
  - R10: the test counts in `BUILD.md`.
  - R11: the latent crash list below names `message.model` too, and goes to a follow-up task.
- **Trust audit, R11 addition:** a crafted non-string `message.model` throws in both renderers. The paths are the
  ledger's `String(model)` and the record's `by_model` key. This is the same pre-existing class as `String(id)`: present
  before and after the change, and not changed here.

## Fix iteration 2 — the second GATE-2 decisions (2026-09-26, the maintainer, through the form)

The second review (`REVIEW.md`, iteration 2) was GREEN, with 0 floor-gate findings and 10 minor advisory findings,
and reached GATE 2. The maintainer chose "Fix, then commit + PR". The fix covers S1 (the comment only), S2, S3, S4,
S6, S7 and S10. Build, regress and verify re-run after it; no third review. S5, S8 and S9 predate the increment and
go to follow-ups.

The iteration adds no path to `## Files` and changes no design:

- **K1 — S1, the comment only.** `check-cost-ledger.mjs`'s JSDoc on the row compare now says that any lower value
  passes with the WARN, a negative one included. The compare is a range for the reason `excluded_requests` is, but
  unlike that range it has no lower side. A lower bound at the request's first line is named and not built: no
  failure has been observed (P7).
- **K2 — S2.** The "above is RED" test ranges over the exported `GROWING_CLASSES` and pins its two members.
- **K3 — S3.** The contract's compatibility note and the CHANGELOG entry now say the WARN counts every such row value
  and names the first three. The CHANGELOG's "Three alternatives were measured and rejected" now says the first two
  were rejected on measurement and the third by reasoning. The entry is not yet merged, so it is edited in place.
- **K4 — S4.** The checker quotes a `request_id` through `JSON.stringify` in the row compare's RED and WARN lines. The
  same file's two older sinks, the duplicate-id RED and the outside-window RED, take the same quoting. [[L52]]: the
  set is every sink, and the CLI prints each finding as one stdout line. Two tests pin, over all three sinks, that a
  newline-bearing id cannot forge a line.
- **K5 — S6.** `cost-ledger.md`'s "one prose definition" sentence is scoped to what is true. The shipped contracts and
  commands cite the rule. `CLAUDE.md`, the implementing module's header and the CHANGELOG entry summarize it.
- **K6 — S7.** Five pointers the core move left stale:
  - two comments in `render-cost-ledger.test.mjs`;
  - `transcript-core.test.mjs`'s header, on which consumer files carry an owner-mutant control;
  - `check-cost-ledger.mjs:2`, which still names the `/1` record;
  - the measurement record's opening sentence.
- **K7 — S10.** L63's remedy sentence "recorded ≤ live is a WARN" becomes "recorded above live is RED, and recorded
  below live is a WARN". It adds no entry and no provenance.
  - **The lessons index is regenerated.** This plan first said `docs/lessons-index.md` would not change, because it
    renders only titles and tag lines. That was wrong: it also renders each entry's token estimate, which the longer
    sentence moves (L63 ~983 → ~992). `docs:check` REDs until `npm run docs:generate` runs. The path is declared in
    `## Files` above, and the scope is recorded on the epoch with `--amend-scope` before the generator runs.
  - **The route this plan first named was refused by the floor, correctly.** The plan listed canon in `## Files`,
    following the retro-tag precedent that `/pharn-dev-memory-promote`'s "standing division" paragraph records. The
    `Edit` was denied: since the canon-write denylist (3.1.1, #200), `protect-trusted-paths.cjs` refuses canon under
    any build-origin scope ("Re-scoping a build from a PLAN's `## Files` CANNOT authorize this write"). That paragraph
    has been stale since 3.1.1. It is not fixed here and goes to a follow-up.
  - **The route taken, on the maintainer's explicit answer to a second form: a promote-origin scope.** This is the
    L10 provenance repair's precedent (CHANGELOG `[3.1.2]`, `claude-dir-scan-exclusion`):
    1. `set-writes-scope.cjs`, with `--from-frontmatter .claude/commands/pharn-dev-memory-promote.md` and
       `--target .dev/memory-bank/lessons-learned.md`;
    2. `reconcile-baseline.mjs --amend-scope`, immediately after the setter;
    3. the one-sentence `Edit`;
    4. the build scope set again from this plan.

    The scope record says "promote" for what is a correction, the guard's documented hole (`set_by` is written from
    argv). What the guard buys is that the canon write cost a separate, explicit act that this plan could not cause.
    No Bash write touched canon.
- **After verify:**
  - re-apply K7, which was reverted for verify (`VERIFY.md`), under a promote-origin scope, and regenerate the index;
  - commit;
  - merge `origin/main` (6.23.0, PR #277);
  - renumber 6.22.1 → 6.23.1 by diffing the added lines;
  - run `npm run docs:generate`;
  - re-run every gate on the merged tree;
  - open the PR.

## Open questions (HALT)

None open. Resolved at GATE 1 (2026-09-26, the maintainer, through the approval form):

- **Where a request's identity and timestamp come from** → its FIRST line, as D1 recommends. Membership and
  attribution stay unchanged. The alternative, its selected largest line, would move 9,129 measured timestamps by up to
  302 s.
- **The plan** → approved as written.
