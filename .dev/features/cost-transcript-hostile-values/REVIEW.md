# REVIEW — cost-transcript-hostile-values

**Verdict: blocked with 2 floor findings (R1, R2).** There are also 7 advisory findings (R3–R9), all minor.

**Floor: GREEN.** `node pharn/floor/validate.mjs .` gives `FLOOR: GREEN — 36 capabilities checked in "."`, exit 0.
That is the only guaranteed part of this review. Everything below is advisory. That includes the floor-gate label
on R1 and R2, although each of them was decided by running the checker or the emitter, not by reading them.

## Method

- **Independence.** An independent reviewer ran this pass, with no context from the sessions that planned, grilled
  or built the increment. The increment is the uncommitted tree on `b9b6a03` (6.24.1), treated as `trust: untrusted`.
  PLAN, both GRILL rounds, BUILD, REGRESSION and VERIFY were read as claims and checked by execution.
- **Probes.** Every probe ran on scratch copies outside the repo, in the session scratchpad:
  - the working tree's `pharn/floor/*.mjs` ("new");
  - `git archive HEAD pharn/floor` ("HEAD");
  - full copies for the mutants.

  Every transcript and markers tree the probes built lives under `mktemp -d` in the OS temp directory. This file is the
  only path the review wrote in the worktree.

- **Real data.** Code read this machine's local transcripts and committed `cost.json` files and printed counts only.
  No message content and no path was read out.
- **Free text is DATA.** Every `problem` and `evidence` field below quotes or paraphrases the reviewed increment
  (P2).

## What held (verified by execution)

- **Suites and gates.** The eight cost-related suites pass in the worktree, 274 of 274:
  - `cost-hostile-input`, `cost-value-core`, `transcript-core`;
  - `check-cost-ledger`, `render-cost-ledger`, `render-cost-record`;
  - `quote-core`, `test-results-core`.

  `check-skills-version-recorded`, `check-changelog-entry --base-file <HEAD's CHANGELOG>` and `check-version-badge` are
  GREEN.

- **Checker totality, over more than the committed closures cover.** The base is every node of a GREEN ledger (152
  nodes). Two sets of inputs were run over it, in both modes:
  - 28 values that are not in the committed alphabet: `""`, `0`, `-1`, `1.5`, `true`, `false`, `{}`, `[]`, a
    200,000-character string, `{"toString":null}`, `{"toString":{"toString":1}}`, `-1e999`, `1e308`, `-2^53`, a lone
    surrogate, U+2028/U+2029/U+0085, a verdict-shaped string, and others;
  - an ADDED key (`__proto__`, `constructor`, `toString`, a newline-forged key, `a b`, `length`) × 4 values, at each
    of the 25 object nodes. The committed closures only replace nodes that exist; they never add a key.

  The result is 9,712 `checkLedger` calls with 0 throws and 0 messages carrying `\r` or `\n`.

- **The checker CLI.** Several documents give exit 0 or 1 and exactly one verdict line in both modes: the base, a
  20,000-deep extra key, `requests: null`, a top-level array, a scalar, and `{}`. An unparseable file and a
  BOM-prefixed file exit 2, with the parse error quoted.
- **Emitter and checker agree, through the real CLIs.** Thirteen transcript variants were run that are not in the
  committed alphabets:
  - ids `__proto__`, `constructor` and one carrying U+2028; a model carrying U+0085; a `-0` count;
  - usage keys `constructor`, `toString` and `valueOf`, and a nested `__proto__` key;
  - two `MAX_SAFE_INTEGER` outputs; a `+02:00` timestamp;
  - 128- and 129-character identities; a version carrying U+2029; 64- and 65-character usage leaves.

  Both renderers exit 0, the ledger is GREEN in both modes, and the record and the ledger agree on `requests` and on
  the `input` and `output` totals.

- **No regression on genuine data.** 172 local sessions and 51,023 requests were read by HEAD's floor and by the new
  one, with 0 differences of any kind:
  - request ids, and the selected usage objects;
  - `render()` output, and serialized ledgers;
  - `dropped[]` entries (none).

  The new checker is GREEN on every ledger either version emitted, 153 of which have rows.

- **Compatibility, as the contract states it:**
  - 53 distinct committed `cost.json` files on this machine (13 `/1`, 40 `/2`) are GREEN under both checkers.
  - Under `--verify-transcript`, 129 files give 127 GREEN and 2 RED under both checkers, with no flips.
  - HEAD's emitter was run over four crafted transcripts: a `1.5` count, a 300-character version, an `a b` usage
    key, and a numeric `requestId`. Each ledger is GREEN under HEAD's checker and RED under the new one. The last is
    RED only with `--verify-transcript`, exactly as the compatibility note's two bullets say.
- **BUILD.md reproduces.** The closure counts match: 162 ledger nodes, 161 non-root, 150 keys; line shapes of 28
  and 26 nodes. Four of the 31 mutants were re-run in scratch (M4, M13, M19, M26), and each dies in the test
  BUILD.md names.
- **L-axis.** The moves are clean:
  - `shown` and `SHOWN_CHARS` moved byte-for-byte, and `ABS_PATH_RE` is identical.
  - No module re-exports a moved name, and nothing imports one from its old home.
  - The importers of `cost-value-core.mjs` are exactly the four modules its header names.
  - ✧ ONE OWNER and ✧ ONE ADDRESS are green.
- **L-trust.** A grep of the diff and the untracked files found no instruction-looking text addressed to an agent or
  a reviewer, and nothing in the increment changed this review's behaviour. The checker's quoted values reach a
  human through `/pharn-loop` and `/pharn-ship` "verbatim". No proceed/stop reads `cost.json` (fix #3), so no
  guaranteed decision rests on a tainted field.
- **L-eval.** No `role:`-bearing file is touched, and the floor agrees (36 capabilities, GREEN).

## Floor-gate findings (blocking)

### R1 — "every bound the contract gives the file" is false for two FLOOR-labelled rows

```yaml
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: "CHANGELOG.md:66"
  problem: "The CHANGELOG entry, contract rule 3 and the checker header each state that check-cost-ledger.mjs enforces every bound the contract gives the file, but two FLOOR-labelled field-table rows, skills_version (FLOOR (shape)) and window_start/_end (FLOOR (from data)), have no checker op at all."
  evidence: 'CHANGELOG.md:66 ''**The checker enforces every bound the contract gives the file:**''; cost-ledger.md:363 ''([[L2]]: a bound named here is one the checker checks)''; check-cost-ledger.mjs:40-41 ''a bound the contract names must be one this file checks''; cost-ledger.md:121 ''| `skills_version` | the version string, or `null` | FLOOR (shape) |''. Probe (new floor, both modes): skills_version {"a":1} or 7, window_start ''yesterday'', window_end 42, an inverted window, and a window matching no row are all GREEN.'
```

- **Where it sits.** The two unbacked labels (`cost-ledger.md:121`, `:125`) predate 6.24.2. The three universal
  sentences are new in this increment. The GRILL R2-G2 disposition was scoped to the bounds 6.24.2 adds; the
  CHANGELOG generalized it to every bound.
- **Why it blocks now.** It is a guarantee with no floor reduction, which is the L-floor lens's blocking case ([[L2]]).
  The CHANGELOG is append-only once merged, so after the merge only a new entry can correct it.
- **Remedy.** Narrow the three sentences to the bounds this increment adds. Separately, either back the two rows with
  a check or relabel them; a named follow-up is enough for those two pre-existing rows.

### R2 — "`cost.json` lists each refusal" is false for a line refused as a whole

```yaml
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: "pharn/pharn-contracts/ship-record.md:121"
  problem: "ship-record.md tells the reader that cost.json lists each refusal the record makes silently, but a transcript line refused as a whole (an id rule 3 refuses, or a usage that is not a plain object) leaves no row, no dropped[] entry and no excluded_requests count, and an unparseable timestamp is counted in excluded_requests but listed nowhere."
  evidence: 'ship-record.md:121 ''All of it is **silent here**, because the block has no `dropped` list. `cost.json` lists each refusal.'' Probe (new floor): requestId 7 -> 1 row, excluded 0, dropped []; usage "abc" -> dropped []; timestamp "yesterday" -> excluded 1, dropped []. The committed test 4 asserts `nothing listed for it` for every not-a-request value.'
```

- **The same overclaim in two more shipped sites.**
  - `render-cost-ledger.mjs:54-58` lists `request_id` among the fields whose refused value "becomes its field's
    fallback … and its path is listed in `dropped[]`".
  - `CHANGELOG.md:63` says "Each refusal is listed in `dropped[]`." in the bullet that begins "The ledger bounds
    `request_id`".

  The PLAN's trust audit carries the same sentence. `cost-ledger.md`'s own paragraph is accurate: "no row, and not
  counted in `excluded_requests`".

- **Why it blocks.** A shipped contract states the opposite of what the code does, and of what a committed test pins.
  A crafted line with a refused id is silent in BOTH artifacts, while the contract tells the reader it is accounted
  for in `cost.json`.
- **Remedy.** Say which refusals `cost.json` lists: the identity fields, `version`, counts, and `usage` leaves and
  keys. Then say that a line refused as a whole, and an unparseable timestamp, are listed nowhere.

## Advisory findings (warn)

All seven are the reviewer's judgment of severity. None is the sole basis of a block.

### R3 — "no control character" admits every C1 control

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "CHANGELOG.md:51"
  problem: "The CHANGELOG, the checker's RED messages and contract rule 3 (now applied to four more fields) describe the identity bound as 'no control character', but isIdentityToken admits all 32 C1 control characters (U+0080 to U+009F, Unicode category Cc), U+0085 and U+009B among them."
  evidence: "CHANGELOG.md:51-52 'rule 3's bound: 1 to 128 characters, no control character, no absolute path'; check-cost-ledger.mjs:409 '(<=${IDENTITY_MAX} chars, no control chars, no path)'. Probe: isIdentityToken('a' + U+0085 + 'b') and isIdentityToken('a' + U+009B + 'b') are both true, and /\\p{Cc}/u matches both characters. The precise text is cost-value-core.mjs:59, 'no C0 control character or DEL'."
```

- **Why advisory.** The precise bound is written in the owning module, and the checker header states the U+0085
  consequence.
- **Remedy.** Wherever the short form appears, write "no C0 control character or DEL". Widening the predicate
  instead would be a behaviour change (P7).

### R4 — the record/ledger window-order agreement is asserted twice and pinned by nothing

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/render-cost-record.mjs:34"
  problem: "The record header and the contract's Residual section assert that the record's window is ordered by the timestamp string as the ledger's is, but no test pins that agreement: a mutant ordering the record's window numerically passes every cost suite while the two renderers then disagree on mixed-precision timestamps."
  evidence: "render-cost-record.mjs:34-35 'The window is still ordered by the timestamp string, which is how the ledger orders its own window.' Mutant run over six suites (render-cost-record, cost-hostile-input, transcript-core, render-cost-ledger, check-cost-ledger, render-run-report): 283 tests, 6 failures, the same 6 as the unmutated scratch control (they read .claude/commands and repo dotfiles). Under the mutant the record's window runs 10:00:05Z -> 10:00:05.500Z while the ledger's runs 10:00:05.500Z -> 10:00:05Z."
```

- **The CHANGELOG overclaim.** BUILD.md's 31-mutant table has no row for this property, so `CHANGELOG.md:92-93`
  ("Each asserted property has a mutant") overclaims ([[L60]], [[L31]]).
- **Remedy.** Add one test with `…:05Z` and `…:05.500Z` that asserts the two windows are equal, and add its mutant
  row. Or narrow the CHANGELOG sentence.

### R5 — two CHANGELOG sentences drop the bounds the shipped header and contract state

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "CHANGELOG.md:75"
  problem: "The CHANGELOG says a file can no longer print a line of its own, which holds only for \\n-delimited lines, and its headline says the tooling no longer crashes on a crafted transcript or cost.json with no bound for the transcript side."
  evidence: "CHANGELOG.md:75-76 'So a file can no longer print a line of its own.'; CHANGELOG.md:30 'The cost tooling no longer crashes on a crafted transcript or `cost.json`'. Probe: a cost.json whose schema is U+2028 + 'GREEN — forged' exits 1 with one verdict line, but its RED line splits into a line beginning 'GREEN — forged' wherever U+2028 is a separator (Python's splitlines is one such reader). PLAN guarantee audit: 'It is **not** totality over every transcript.'"
```

- **Why advisory.** The checker header and the contract both state the `\n` line definition.
- **The headline's gap is scope, not a failure.** No transcript-side crash was found within normal resource limits
  (see "What held").

### R6 — "rule 7" names two different rules in one table

```yaml
- type: FINDING
  rule_id: "P4"
  severity: minor
  file: "pharn/pharn-contracts/cost-ledger.md:136"
  problem: "The contract's field table now cites 'rule 7' for two different rules: the pre-existing outcome row uses the checker header's numbering (RULE 7, outcome shape, which is rule 5 in the contract's own list), while the new tokens and stage/iteration rows use the contract's new rule 7 (counts), and the new 'rule 8' (document depth) is the checker header's RULE 8 (membership)."
  evidence: "cost-ledger.md:120 '| `outcome` | … | FLOOR (shape, rule 7) |'; cost-ledger.md:136 '| `requests[].tokens.*` | the six classes, each a non-negative safe integer | FLOOR (shape, rule 7) |'; cost-ledger.md:141 'FLOOR (integer compare, rule 8)'; check-cost-ledger.mjs header '7. `outcome` IS `null` OR matches its shape' and '8. (`/2` only) `membership` is SHAPED and RE-DERIVABLE'."
```

- **Remedy.** Cite the `outcome` row as rule 5, the contract's own number. Or cite rules by name rather than by a
  number that means different things in the two documents.

### R7 — moving `shown()` grows the verify path's load graph, and nothing records it

```yaml
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: "pharn/floor/test-results-formats.mjs:80"
  problem: "Moving shown() into quote-core.mjs adds quote-core.mjs and loop-record-core.mjs to the static load graph of check-verify.mjs, check-red-run.mjs, loop-fresh-core.mjs and test-results-formats.mjs, and only the transcript-side growth (cost-value-core.mjs's header) is recorded anywhere."
  evidence: "Static import closure, HEAD -> now: check-verify.mjs 15 -> 17, check-red-run.mjs 11 -> 13, loop-fresh-core.mjs 12 -> 14, test-results-formats.mjs 1 -> 3 (added in each: quote-core.mjs, loop-record-core.mjs). quote-core.mjs:4-6 frames exactly this as the P3 cost: 'A load failure anywhere in that graph would then crash the OTHER renderer too'."
```

- **Risk.** Small: `loop-record-core.mjs` has zero imports, and `quote-core.test.mjs`'s ★ LOAD GRAPH pins that.
- **Remedy.** Add one sentence to `quote-core.mjs`'s LOAD GRAPH paragraph naming the verify-path consumers.

### R8 — the new BOUND names the weaker transcript vector

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: "pharn/floor/transcript-core.mjs:76"
  problem: "The new BOUND names only a crafted line with a fresh id, but a crafted line that reuses a genuine request's id with a larger admitted output_tokens silently replaces every token class of that request in both renderers, with nothing listed and both checker modes GREEN."
  evidence: "transcript-core.mjs:76-77 'A crafted line with a fresh, bounded id and right-typed usage is still a request, because nothing here can tell it from a real one.' Probe: req_genuine (output 7, input 3), then a later line with the same id (output 1000000, input 999). The record then shows output 1000000 and input 999; the ledger has 1 row with output 1000000 and input 999 and dropped []; checkLedger is GREEN plain and under --verify-transcript."
```

- **Where it comes from.** The behaviour predates this increment: it follows from 6.24.1's max rule. The increment
  does not widen it, since the rank now admits only valid counts. But the new sentence names the weaker vector, and
  the PLAN's trust audit has the same "fresh" scoping.
- **Remedy.** Name the reuse vector in the BOUND. The transcript is agent-writable (`LIMITS.md §6`).

### R9 — `shown()` erases the offending value's type in RED lines

```yaml
- type: FINDING
  rule_id: "P2"
  severity: minor
  file: "pharn/floor/check-cost-ledger.mjs:419"
  problem: 'shown() renders every non-string as a quoted string, so the checker''s RED lines lose the offending value''s type: the number -3 and the string ''-3'' print the same, and an object prints "[object Object]" where HEAD printed its JSON.'
  evidence: 'HEAD: ''markers[0].seq must be an integer (got {"a":1})'', ''outcome.iterations must be an integer or null (got 1.5)''. Now: ''markers[0].seq must be an integer (got "[object Object]")'', ''outcome.iterations must be an integer or null (got "1.5")'', ''requests[0].tokens.input must be a number: a non-negative safe integer (got "-3")''.'
```

- **Severity.** A cosmetic side effect of the P2 fence.
- **Remedy.** The file's own `tokenText` already prints a finite number unquoted. A JSON-text fallback for plain
  objects would keep the quoter total; `quote-core.mjs`'s `dataText` already does this.

## Pre-existing, outside this increment (recorded, not findings)

- **The price-key check is top-level only.** `check-cost-ledger.mjs:332` says "A price table must never appear, at
  any depth, under any key naming money", but the loop reads top-level keys only. Probed: `requests[0].usage.price_usd
= 5` is GREEN, and a top-level `price_usd` is RED.
- **A second import address.** `render-run-report.mjs:120` re-exports `quoteData` and `dataText`, a second import
  address for two `quote-core.mjs` names ([[L35]]). This increment leaves it untouched.
- **A documented degradation.** `--verify-transcript` on a ledger whose `membership.session` is `null`, with no
  `sessions[0]`, degrades to "the transcript is no longer available", a WARN and GREEN. This behaviour is documented.
- **R1's labels predate 6.24.2.** The two unbacked FLOOR labels behind R1 (`cost-ledger.md:121` and `:125`) are
  older than this increment.

## Proposed lesson candidate (for `/pharn-dev-memory-promote`; not written here)

A real recurrence, not a hypothetical (P7). The plan cited [[L37]], and the builder bound every header and contract
sentence to a named test. Four RESTATEMENTS of those bounds, in other documents, then re-derived the quantifier
upward, and each was false on a probe that took seconds:

- R1: "every bound the contract gives the file", in the CHANGELOG and the checker header;
- R2: "`cost.json` lists each refusal", in `ship-record.md`, the emitter header and the CHANGELOG;
- R3: "no control character";
- R5: "can no longer print a line of its own".

The grill had already caught three sentences of the same shape at plan time (G2, G3, R2-G3).

```json
{
  "target": ".dev/memory-bank/lessons-learned.md",
  "id": "L64",
  "type": "contract",
  "concepts": ["universal-quantifier", "doc-drift", "guarantee-audit", "restatement"],
  "provenance": {
    "feature": "cost-transcript-hostile-values",
    "commit": "<captured at promotion by git rev-parse HEAD>",
    "source": ".dev/features/cost-transcript-hostile-values/REVIEW.md",
    "date": "<captured at promotion, ISO YYYY-MM-DD>"
  }
}
```

- **Title.** "A bound's RESTATEMENT re-derives its quantifier: L37 recurred in the release note and a sibling contract
  of the increment that applied it to the primary text".
- **Remedy.** L37's probe follows every restatement, not only the primary sentence. A CHANGELOG bullet, or a sibling
  contract that summarizes a bound, is a new sentence and is probed like one.

## Not probed

- **The installer.** `pharn-cli` is not in this tree, so it is unverified whether an existing CLI copies the new
  `cost-value-core.mjs`. The MIN_CLI claim rests on the installer copying `pharn/floor/` whole.
- **Time and memory.** Heap exhaustion and RULE 8's O(rows × markers) were not measured. The increment states both as
  unclaimed.
- **Other hostile inputs.** `markers.jsonl`, `LOOP.md`, the verdict reports and `pharn.config.json` were not probed
  as hostile inputs to the emitter or to `--verify-transcript`. They are outside the increment's stated inputs.
  `readSkillsVersion` was read, and it is total.
- **Other format characters.** `isIdentityToken` admits bidi and other format characters (U+202E and the like), and
  `shown()` leaves them raw. Their display effect was not probed; only the line separators were.
- **Linux pipes.** The `process.exitCode` ending was probed on darwin only. On Linux only the static test covers it.
- **Most of BUILD.md's mutants.** 27 of the 31 were not re-run; 4 were.
- **The full suites here.** `npm test` and `npm run check` were not re-run in this worktree; VERIFY.md's gate record
  was relied on. The eight cost-related suites were re-run.
- **The run report.** `render-run-report.mjs` was not run over ledgers that carry the newly admitted or listed values.
- **The commands.** It was not probed how `/pharn-loop` and `/pharn-ship` present the new exit-2 internal-error path.
  Their prose names only GREEN, a WARN or a RED.
- **Windows.** Not probed.

## Verdict

**Blocked with 2 floor findings (R1, R2).** Both are wording fixes to shipped prose. The code, the tests and the
compatibility claims held under every probe above, including 51,023 genuine requests and 53 real ledgers.
