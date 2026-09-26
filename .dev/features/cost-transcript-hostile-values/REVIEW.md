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

## Re-review — the GATE 2 fix pass (2026-09-27)

**Re-review verdict: blocked with 2 floor findings (F1, F2).** There are also 3 advisory findings (F3–F5), all minor.
Of R1–R9, six are fixed and three are partly fixed (R2, R7, R9).

**Floor: GREEN.** `node pharn/floor/validate.mjs .` in the worktree gives `FLOOR: GREEN — 36 capabilities checked in "."`.
That is the only guaranteed part of this re-review. Everything below is advisory. That includes the floor-gate label on
F1 and F2, although each was decided by running the emitter and the checker, not by reading them.

### Scope and method

- **What was reviewed.** The fix pass is the uncommitted working tree on `2c38d9a` (`git diff HEAD`, 16 files). The
  L64 sweep ranged over the whole branch's added prose (`git diff origin/main`). Both were treated as
  `trust: untrusted`.
- **Independence.** An independent reviewer ran this pass, with no context from the sessions that fixed, merged or
  verified the increment. The PLAN and BUILD "Fix pass" sections, REGRESSION.md and VERIFY.md were read as claims and
  checked by execution.
- **Probes.** Every probe ran outside the repo, in the session scratchpad: a copy of the working tree,
  `git archive origin/main pharn/floor`, and one full copy per mutant. Every transcript and markers tree lives under
  `mktemp -d`. This file is the only path this pass wrote in the worktree.
- **Real data.** None. No transcript and no committed `cost.json` was opened in this pass.

### What held (verified by execution)

- **Suites and gates.**
  - In the scratch copy, `npm test` passes 3,831 of 3,831, and `format:check`, `lint`, `lint:md`, `docs:check`,
    `check:markers` and `check:contributing` exit 0.
  - In the worktree, `check:changelog`, `check-changelog-entry.mjs --merge-base origin/main .` and `check:badge` are
    GREEN, and `check-plan-lessons.mjs` is GREEN over the plan's 16 cited ids. The plan's pin equals the sha256 of
    `pharn/ARCHITECTURE.md` (`d831d30d…`).
  - `check-bash-reconcile.mjs --base . --require-baseline` is `CLEAN` on epoch `2026-09-26T22:18:11.368Z`, the one
    VERIFY.md names: 11 paths reconciled, 0 escapes.
- **The merge.**
  - The CHANGELOG from `[6.26.0]` to the end has the same sha256 as `origin/main`'s, and so do the preamble and
    `[Unreleased]`. `[6.26.1]` sits directly above `[6.26.0]`.
  - `SKILLS_VERSION` and the README badge read 6.26.1, and `MIN_CLI` stays 0.5.0. The generated floor count moves
    92 → 93, the new module.
  - #280's `markers[].mode` row is in the field table (a cell diff against `origin/main` and against `df2e880`).
  - No `6.24.2` is left in any tracked or modified file outside this feature's own records.
- **The importer sweep (check 4).** Over the whole worktree, `.dev/` and `.claude/` included, every import of
  `ABS_PATH_RE` or `IDENTITY_MAX` names `cost-value-core.mjs`, and every import of `shown` or `SHOWN_CHARS` names
  `quote-core.mjs`. No static import, dynamic import or re-export reaches an old home. Every importer of
  `quote-core.mjs` sits under `pharn/floor/`, and the non-test importers of `cost-value-core.mjs` are exactly the four
  its header names.
- **The two new tests.** Tests 16 and 17 pass on the unmutated copy. M29 (the record orders its window through `tsMs`)
  fails test 16 and not test 17. M30 (`valText` returns `shown(v)`) fails test 17 and not test 16.
- **L-trust.** A scan of the fix-pass diff found no instruction-looking text addressed to an agent or a reviewer, and
  nothing in it changed this review's behaviour.
- **L-eval.** No `role:`-bearing file is touched, and the floor agrees.

### R1–R9, as fixed

| finding | status | evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1      | fixed  | The three universal sentences are scoped: CHANGELOG [6.26.1] "every FLOOR rule this release adds to the contract", `check-cost-ledger.mjs:40-45`, `cost-ledger.md:384`. A cell diff of the field table against `origin/main` finds nine FLOOR labels this branch adds or widens, and each has a checker op. `skills_version` and `window_start`/`_end` now read ADVISORY. Probed: `skills_version` `{"a":1}` is GREEN, a value beside an `unknown` source is RED, and `window_start` 42 and an inverted window are GREEN. One understatement, harmless in direction: "no checker op" on `window_*`, which rule 4's path walk still reaches. |
| R2      | partly | The whole-line refusal and the unparseable timestamp are now stated in `ship-record.md:121-124`, the CHANGELOG, `render-cost-ledger.mjs:55-62` and `render-cost-record.mjs:36-39`, the site the fix's own sweep found. The replacement sentence is still wider than the code (F1). Apparatus residue, not shipped: `PLAN.md:672` still says "Every refusal is listed in `dropped[]` in the ledger".                                                                                                                                                                                                                                         |
| R3      | fixed  | `cleanScalar` refuses exactly `c < 0x20` and `c === 0x7f`, so "no C0 control character or DEL" is exact, and the C1 admission is stated. The wording is in the CHANGELOG, contract rule 3, the field table, the Residual, both identity REDs (`:340`, `:422`) and `cost-value-core.mjs`'s header. Two restatements outside the diff keep the short form (see "Pre-existing").                                                                                                                                                                                                                                                               |
| R4      | fixed  | Test 16 compares the two windows over `…:05Z` and `…:05.500Z`, after asserting that the string order and the time order differ there. M29 kills it (re-run here). The CHANGELOG now says "one mutant per property the plan names". Apparatus residue: `PLAN.md:176` still says "every asserted property has a named mutant".                                                                                                                                                                                                                                                                                                                |
| R5      | fixed  | The headline is bounded to "the crafted transcript and `cost.json` values this release enumerates". The forgery sentence says a "`\n`-delimited line" and names U+2028, U+2029 and U+0085.                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| R6      | fixed  | The field table now cites the contract's own list (`cost-ledger.md:369-437`): `outcome` rule 5, `tokens.*` and `stage/iteration` rule 7, the whole document rule 8, `excluded_requests` rule 6. The checker header keeps its own numbers (its RULE 6 is the views, its RULE 8 membership), so the CHANGELOG's "Rule 6 is O(rows × markers)" is the contract's number.                                                                                                                                                                                                                                                                       |
| R7      | partly | `quote-core.mjs:24-27` now records the growth, but it names 6 of the 11 modules whose static closure gained `quote-core.mjs` and `loop-record-core.mjs` (F4).                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| R8      | fixed  | `transcript-core.mjs:76-82` names the reuse vector. Probed: a second `req_genuine` line with output 1,000,000 and input 999 replaces the usage in the record and in the ledger row, the model stays the first line's, `dropped` is `[]`, and both checker modes are GREEN.                                                                                                                                                                                                                                                                                                                                                                  |
| R9      | partly | Every "(got …)" slot now prints through `valText`; the one other slot (`:521`) prints a type name. Test 17 passes and M30 kills it. An object still prints `"[object Object]"`: a stated choice that test 17 pins, so R9's JSON-text option was not taken. Three sites that quote file values were left on `shown()`/`keyText()`, and the new sentences state the rule for every value (F3).                                                                                                                                                                                                                                                |

### L64 on the added prose

A grep of the branch's added lines in the CHANGELOG section, both contracts and the touched module headers, for
"every", "each", "all", "any", "never", "only", "no longer", "whole", "total", "none", "always", "nothing" and "no".
Each hit that states a behaviour was read as its own sentence and probed where a probe was cheap. F1–F5 are the
sentences that failed. These held:

- "every transcript value the tooling reads is tested before anything coerces it": each read in `sessionRequests()`,
  `aggregate()` and `buildLedger()` is a `typeof`, a plain-object test, a strict equality, `isIdentityToken`,
  `isTokenCount` or `tsMs`, which tests `typeof` first;
- "a `requestId` that is present and not `null` but fails never falls back";
- "the checker enforces every FLOOR rule this release adds to the contract" (R1 above);
- "a value from the file can no longer print a `\n`-delimited line of its own": each interpolation of a file value is
  `shown()`, `keyText()`, `valText()`, a validated integer, or the unavailable-transcript note, whose one file value
  passed rule 3;
- "a list names at most five members", and "an unforeseen error while checking is exit 2";
- "a forgery closure over every node and every key": test 11 walks both;
- `cost-value-core.mjs`'s load graph (`run-window-core.mjs` has no imports), and `sanitizeUsage`'s "every call from
  outside this function omits it" (three callers, none passes `depth`);
- R8's BOUND (above).

One more, not raised: BUILD.md lists "A genuine transcript carries none" as narrowed, but `cost-ledger.md:339` still
says it. The next sentence there labels it an observed platform behaviour, so it is not wider than stated.

### Floor-gate findings (blocking)

#### F1 — the R2 fix still says `cost.json` lists refusals the ledger never sees

```yaml
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: "pharn/pharn-contracts/ship-record.md:121"
  problem: "The R2 fix says cost.json lists the refused model, attributionSkill and count the record buckets silently, but the record folds every request of the session while the ledger tests and lists only the requests inside its run window, so a refusal on any other request is silent in both artifacts."
  evidence: 'ship-record.md:121-122 ''`cost.json` lists only some of it: a refused model or `attributionSkill` and a refused count appear in its `dropped[]`''; render-cost-record.mjs:37-38 ''a refused model, `attributionSkill` or count lands in its `dropped[]`''. Probe (a copy of the working tree): one crafted request at 09:59:00 (model {"toString":1}, attributionSkill 7, output_tokens -3) before a run window of 10:00:00 to 10:00:09, and one clean request inside it. The record: by_model keys claude-opus-5-5 and unknown, by_stage keys (untagged) and pharn-build. The ledger: 1 row, excluded_requests 1, dropped []. With no markers file: the ledger is unavailable, excluded_requests null, dropped []. Both ledgers are GREEN.'
```

- **Why it is R2 again.** R2 blocked because a crafted line was silent in both artifacts while the contract said
  `cost.json` accounted for it. That still holds for every request outside the ledger's run window. The record folds
  every request `sessionRequests()` returns (`aggregate()`), and the ledger counts a non-member and moves on before it
  tests any of its fields (`render-cost-ledger.mjs:669-675`). In a real run the record therefore holds requests the
  ledger never read: those before the run-start marker, the one that wrote it among them, and those after `cost.json`
  was emitted.
- **The smaller half, in the same sentences.** "A timestamp that does not parse is counted in `cost.json`'s
  `excluded_requests`" (`ship-record.md:123`, the CHANGELOG, `render-cost-ledger.mjs:61-62`) holds only under a known
  window. Under an unknown one `excluded_requests` is `null` (probed).
- **Mitigation already on the page.** The "A SECOND cost figure" paragraph of `ship-record.md` says the two windows
  differ, but it names only the tail ("ORDERING"), not the requests before the run.
- **Remedy.** Scope both sentences to a request inside the ledger's run window, under a known window. Then say that the
  record reads the whole session, so a refusal on a request the ledger excludes, or under an unknown window, is listed
  in neither artifact.

#### F2 — the compatibility note promises a RED the checker does not give

```yaml
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: "CHANGELOG.md:100"
  problem: "The compatibility note says a ledger emitted before 6.26.1 from a transcript carrying a value 6.26.1 refuses is now RED, but the old emitter ran String() on a non-string message.model before bounding it, and the admitted token it wrote stays GREEN in both checker modes while 6.26.1 refuses the same value."
  evidence: 'CHANGELOG [6.26.1], Compatibility: ''A ledger emitted before 6.26.1 from a transcript carrying a value 6.26.1 refuses is now RED''; cost-ledger.md:329, the same sentence in bold; origin/main render-cost-ledger.mjs:622 ''model: sanitizeIdentity(String(model), …)''. Probe (the origin/main emitter, the working-tree checker): message.model 7, 1.5, true and {"a":1} give old ledgers whose model is "7", "1.5", "true" and "[object Object]". For each, the 6.26.1 emitter writes model "unknown" and dropped ["requests[0].model"], while the new checker gives the old ledger 0 REDs plain and 0 under --verify-transcript.'
```

- **Where it sits.** The sentence is in the reviewed state (`df2e880`); the fix pass did not add it. The first review's
  "What held" probed four crafted inputs (a `1.5` count, a 300-character version, an `a b` usage key, a numeric
  `requestId`), and each did go RED. None was a coerced model. The fix pass's L64 sweep narrowed the next sentence of
  the same paragraph ("A genuine transcript carries none") and left this one.
- **Why it blocks.** It states the checker's verdict for a class of old ledgers, and part of that class has no floor op
  behind it: the plain rules see a valid token, and `--verify-transcript` compares ids, counts and
  `excluded_requests`, never `model`. That is the L-floor lens's blocking case, as R1 was. The CHANGELOG is
  append-only once merged.
- **Read literally, it is wider still.** A value both emitters refuse, such as a 200-character `attributionSkill`
  (bounded since 6.5.1), leaves a correct old ledger, and that ledger is GREEN in both modes (probed).
- **Remedy.** Scope the sentence to the two mechanisms the contract's note already lists: a stored value that breaks a
  rule 6.26.1 added, and a re-derivation that differs in its ids or counts. Name the coerced model as a case neither
  catches. Backing it with a check is a separate choice (P7).

### Advisory findings (warn)

All three are the reviewer's judgment of severity. None is the sole basis of a block.

#### F3 — "each value … prints as itself" is false at three sites

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "CHANGELOG.md:84"
  problem: "The new quoting sentence says each value the checker quotes from the file prints a number, boolean or null as itself so its type stays visible, but three sites still print file values through shown() or keyText(), where a number and its string print alike and the view-row compare inverts the rule."
  evidence: 'CHANGELOG [6.26.1] ''a number, boolean or `null` as itself, so its type stays visible''; the same rule at cost-ledger.md:446-448 and check-cost-ledger.mjs:108-110. Probe: membership.start 5 and "5" both print ''(stored "5", recomputed …)'' at check-cost-ledger.mjs:783. An outside-window request_id 7 and "7" both print ''"7"'' at :792. At the view-row compare (:471-488, keyText), by_model[0].model true prints ''("true" vs claude-opus-5-5)'' and the string "true" prints ''(true vs claude-opus-5-5)''. The comment at :308-309 says a key goes through shown(); keys go through keyText().'
```

- **Why advisory.** The one-verdict-line property holds at all three sites: each prints through `shown()`,
  `keyText()` or a validated integer. What is wider than the code is the type-visibility rule, which restates R9's fix
  as a property of every value ([[L64]]).
- **Remedy.** Route `:783` and `:792` through `valText`, and give `keyShown` a form that keeps the type. Or scope the
  three sentences to the "(got …)" slots that test 17 pins. Fix the CHANGELOG sentence before the merge, since the file
  is append-only afterwards.

#### F4 — the LOAD GRAPH sentence names 6 of the 11 modules that grew

```yaml
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: "pharn/floor/quote-core.mjs:24"
  problem: "The LOAD GRAPH sentence added for R7 names six modules whose static graph gained quote-core.mjs and loop-record-core.mjs, but eleven did, so five of those growths, two of them in CLIs on the test-stage path, are still recorded nowhere."
  evidence: "quote-core.mjs:24-27 names check-cost-ledger, test-results-formats, test-results-core, check-verify, check-red-run and loop-fresh-core. Static import closure of every non-test pharn/floor module, origin/main against the working tree: those six, plus ac-gate-core (13 to 15 modules), ac-tests-lock (12 to 14), check-ac-tests (9 to 11), red-run-core (9 to 11) and test-infra-core (7 to 9). The CLIs reach it this way: check-ac-tests and ac-tests-lock import test-infra-core, which imports test-results-core and test-results-formats, and both import quote-core."
```

- **Where it comes from.** R7's own evidence named four modules, and the fix named six. BUILD.md checked that each
  named module loads `quote-core.mjs`, not that no other module does ([[L36]]: presence, not closure).
- **Remedy.** State the set by its rule, as the consumer paragraph above it already does: every module whose static
  graph reaches `test-results-formats.mjs`.

#### F5 — the reader's selection sentence is wide in one corner

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/transcript-core.mjs:73"
  problem: "The reader header says the selection ranks only by an admitted count, so the selected line carries a count both renderers count, but when no line of a request carries an admitted output count the first line is selected and its count is refused."
  evidence: 'transcript-core.mjs:73-74 ''The selection ranks only by a count `isTokenCount` admits, so the selected line carries a count both renderers count.'' Probe: two lines of req_a with output_tokens "x" and -5. The selected usage carries "x"; the record counts 0 for output, and the ledger writes 0 and lists requests[0].tokens.output.'
```

- **Why minor.** It is the owning module's primary sentence, not a restatement, and the property it serves holds: both
  renderers count the class as 0.
- **Remedy.** "…so a line whose count is admitted outranks one whose count is not. When no line's count is admitted,
  the first line is selected, and both renderers count 0 for that class."

### Re-review verdict

**Blocked with 2 floor findings (F1, F2)** — both wording fixes to shipped prose, as R1 and R2 were; R1, R3–R6 and R8
are fixed, and R2, R7 and R9 are partly fixed.

### Pre-existing, outside this increment (recorded, not findings)

- `render-run-report.mjs:34` restates rule 3 as "no control characters", and `:142` as "control-char-free". Both
  predate this branch, sit outside its diff, and describe a predicate that admits C1.
- Contract rule 5 and the checker's `outcome.decision` and `outcome.blocked` REDs (`:524`, `:533`) say
  "control-char-free" of `cleanScalar`, which admits C1. That is rule 5, not rule 3, and it predates this branch.
- `ship-record.md`'s "A SECOND cost figure" paragraph calls `cost.json` `pharn-cost-ledger/1`. The emitter writes
  `/2`.
- The first review's pre-existing list stands. Nothing in it was re-probed here.

### Proposed lesson candidate (for `/pharn-dev-memory-promote`; not written here)

L64 recurred inside the pass that applied it. The sweep grepped each bound's phrase and probed each hit, but it probed
each sentence over the inputs its author had in mind. Each of F1–F3 fell on the first probe that varied the set the
quantifier ranges over:

- F1 relates two artifacts that read different request sets, the whole session and the run window;
- F2 is a compatibility sentence, which the old code's outputs decide, not the new code's refusals;
- F3 restates, for every value, a rule proven at the slots a test pins.

```json
{
  "target": ".dev/memory-bank/lessons-learned.md",
  "id": "L65",
  "type": "contract",
  "concepts": ["universal-quantifier", "restatement", "input-set", "lesson-recurrence"],
  "provenance": {
    "feature": "cost-transcript-hostile-values",
    "commit": "<captured at promotion by git rev-parse HEAD>",
    "source": ".dev/features/cost-transcript-hostile-values/REVIEW.md",
    "date": "<captured at promotion, ISO YYYY-MM-DD>"
  }
}
```

- **Title.** "An L64 probe must range over the set the quantifier names — a sentence relating two artifacts is probed
  over the difference of their inputs, and a compatibility sentence over what the old code wrote".
- **Remedy.** Before probing a hit, name the set its quantifier ranges over, and build the probe from that set's edge:
  for "X lists what Y refuses", an input Y reads and X does not; for "an old artifact is now RED", an artifact the old
  code actually wrote; for "each value", every call site a grep finds.
- **An amendment to L64 may fit better than a new id.** That is a canon decision for the human, not this review's.

### Not probed

- **The installer.** `pharn-cli` is not in this tree, so whether an existing CLI copies the new `cost-value-core.mjs`
  is still unverified. The `MIN_CLI` claim rests on the installer copying `pharn/floor/` whole.
- **Most mutants.** Only M29 and M30 were re-run here, each against tests 16 and 17 only. M1–M28 rest on BUILD.md and
  the first review's four re-runs.
- **Real data.** The first review's 51,023 genuine requests and 53 ledgers were not re-measured. The fix pass changed
  messages, prose, two tests and one test import, and no derivation.
- **The merge's own record.** "56 lines in 14 files" and "439/439 before the merge was committed" were not re-derived.
  The end state was checked instead.
- **The L64 promotion's gate** (`18c12a4`). Only its outputs were checked: the canon entry, the index line, and
  `check-plan-lessons.mjs` over 16 ids.
- **CI's per-PR mode.** `check-changelog-entry.mjs` ran with `--merge-base origin/main`, not against a PR merge
  commit's first parent.
- **Carried over from the first review, still unprobed:** the run report over ledgers carrying the new `dropped[]`
  paths; how `/pharn-loop` and `/pharn-ship` present exit 2; Linux pipes; Windows; time and memory; bidi and other
  format characters.
- **GRILL.md** was not re-read, and the first build's BUILD.md sections were taken as recorded.
