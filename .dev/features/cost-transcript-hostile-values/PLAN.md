# PLAN — cost-transcript-hostile-values

- spec_content_hash: d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4
- applied_lessons: [L2, L15, L29, L31, L33, L35, L36, L37, L41, L47, L50, L52, L60, L62, L63, L64]
- increment: The product floor's cost tooling stops crashing on a crafted input at every member this increment
  enumerates. It also stops emitting what its own checker REDs. That covers two inputs:
  - a Claude Code TRANSCRIPT, read by `transcript-core.mjs` for `render-cost-record.mjs`, `render-cost-ledger.mjs`
    and `check-cost-ledger.mjs --verify-transcript`. Every value is read through a type and domain test before any
    coercion, and the ledger's `usage` copy is bounded in depth and key shape;
  - a `cost.json` read by `check-cost-ledger.mjs`. The checker now enforces every bound the contract gives the
    file, quotes every file-derived value it prints, and answers each document its closure walks with a verdict. It
    maps an unforeseen internal error to exit 2, never to its RED code. Time and memory are not claimed.
- layer(s): product floor (NEW `pharn/floor/cost-value-core.mjs`; `transcript-core.mjs`, `render-cost-record.mjs`,
  `render-cost-ledger.mjs`, `check-cost-ledger.mjs`, and `shown()` moved into `quote-core.mjs` from
  `test-results-formats.mjs`), floor tests (two new files, five edited), pharn-contracts (`cost-ledger.md`,
  `ship-record.md`), repo meta (CHANGELOG, SKILLS_VERSION, README).
- constitution_refs: [P0, P2, P3, P5, P6, P7]

## The request, and its honest trigger (P7)

The maintainer asked (2026-09-26) to fix REVIEW finding R11 of `cost-dedup-completed-usage` (PR #279). R11: a
crafted non-string `requestId` or `message.model` makes a caller's `String()` coercion throw, in both renderers.

Every failure below is on a **constructed input**, and no real transcript or ledger has been seen to carry one. The
platform writes `req_…`/`msg_…` ids, numeric counts and object `usage`, and the emitter writes well-formed ledgers.
The trigger is a set of demonstrated, reproducible crashes on untrusted input (L62's mechanism), fixed at the
maintainer's explicit direction. The scope grew through five choices the maintainer made in forms (below), each
offered with its measured evidence, and then through two grills' findings. It is not a dogfood failure, and this
plan does not claim one.

## Decisions, in order (P6)

1. **Plan gate (GATE 1).** Base: build on `main` now. Id guard: the reader skips a line whose id is not a non-empty
   string. Scope: the whole wrong-type transcript class. Plan: "Approve as written".
2. **Post-grill gate.** The first grill (`GRILL.md`, 10 advisory concerns) reproduced crash and corruption paths
   beyond the plan. The maintainer selected all four offered items:
   - counts are non-negative safe integers;
   - `message.usage` is a member;
   - the `usage` copy is depth-bounded;
   - the record's identity keys get the ledger's rule-3 bound.
3. **Re-base.** The `cost-dedup-completed-usage` session opened PR #279, which moves the reading loop into
   `pharn/floor/transcript-core.mjs`, and asked for this fix to be stacked on it. The maintainer chose "Stack on
   #279". #279 then merged into `main` as the squash `b9b6a03` (`SKILLS_VERSION` 6.24.1). Its tree is byte-identical to
   the branch head `d87f57e` this plan was first stacked on (`git rev-parse <c>^{tree}`, equal).
   This branch had no commits of its own, so it now sits directly on `main` at `b9b6a03`. This increment is
   therefore **6.24.2**, and its CHANGELOG section goes above `[6.24.1]`. `pharn/ARCHITECTURE.md` is unchanged, so the
   spec pin holds.
4. **The checker's own input.** #279's session flagged S9: a `null` entry in `requests[]` crashes
   `--verify-transcript`. The maintainer chose "Fix the checker class now", so `check-cost-ledger.mjs` becomes total
   over its own input in this increment. This reverses the plan-gate choice to keep it as a follow-up.
5. **Verbatim strings.** The ledger copied `requestId`, `sessionId` and `version` verbatim, and the record copied
   timestamp strings into its window. The maintainer chose "Include it now".
6. **Re-plan gate.** Decisions 3 to 5 changed the plan materially, so it went back to the maintainer, who chose
   "Approve, re-grill, build".
7. **Second grill.** `GRILL.md` round 2 raised 11 advisory concerns (R2-G1 to R2-G11). Each is folded in below
   ("Grill dispositions"). None needs a new choice from the maintainer: each is a correction inside the approved
   scope, or a remedy the grill offered. Adopting them adds six files to `## Files`. That growth is reported at GATE 2.
8. **GATE 2 (2026-09-27): fix, integrate `main`, commit locally.** The chain reached GATE 2 green (verify PASS,
   regress `no-regressions`). The independent review blocked on two wording findings (R1, R2) and raised seven
   advisories. The maintainer chose "Fix + integrate, local only": fix R1 and R2 and every advisory (R3–R9), merge
   `origin/main`, renumber, re-verify, and commit on this branch with no push and no PR. The fixes are the section
   "Fix pass" below.
9. **`main` moved twice; the version is 6.26.1.** #280 (6.25.0) and #281 (6.26.0) merged during the run.
   - The reviewed state was committed first (`df2e880`), and `origin/main` (`008b24b`) was merged into it (`2c38d9a`).
     The app's sync tool refused, because the merge touches sandbox-protected `.claude/commands/*`, so the merge ran
     through git with the sandbox off for that one command. That is the route the maintainer chose for the same
     refusal on 2026-09-26.
   - Conflicts, all textual: CHANGELOG, README, SKILLS_VERSION, and the contract's field table (#280's
     `markers[].mode` row). Every code file merged cleanly.
   - Every `6.24.2` in this branch's added lines became `6.26.1`: 56 lines in 14 files, found by diffing against
     `origin/main`. This plan and the other feature records keep 6.24.2 as history.
   - `pharn/ARCHITECTURE.md` changed in #280 only: a contract-list entry (`stage-exit`) and a Quick-mode paragraph.
     Neither touches the cost value domain. Its one link here is the ledger outcome `gate2-quick`, which rule 5
     already admits. The spec pin moves to `d831d30d…`.
   - A trial of `main` plus the reviewed state, in a scratch worktree, passed the full suite (3,691 pass, 0 fail),
     #280's quick-mode ledger tests included. So the new checker rules RED no ledger #280 writes (R2-G5).
10. **Lesson L64 promoted.** The review's candidate went through `/pharn-dev-memory-promote` (check-provenance GREEN,
    maintainer accept) and was committed with its index (`18c12a4`).

A live check this session (`git fetch`, `gh pr view 280`) found `origin/main` still at `b9b6a03`. Open PR #280
(6.25.0) is `CONFLICTING`. If #280 merges first, this branch is rebased, re-pinned and renumbered at ship. The merge
order is the maintainer's call at GATE 2 (R2-G5). _(Superseded by decision 9: both #280 and #281 merged first.)_

## Measured this run (the evidence the decisions rest on)

Every probe ran from the session scratchpad, importing the modules read-only, over hermetic scratch inputs with a
bounded run window. The transcript probes ran on `main` (`1524c6f`/`ec06f7b`) and again on #279's code. The checker
probe ran on #279's code. The second grill's probes are recorded in `GRILL.md` round 2.

1. **Transcript, wrong type.** `{"toString":1}` or `[{"toString":1}]` makes:
   - both renderers throw (`TypeError: Cannot convert object to primitive value`) at `message.model` and at each of
     the six usage counts;
   - the ledger throw at the resolved id (`requestId`, or `message.id` when `requestId` is absent);
   - the record throw at `attributionSkill`.

   A leaf-walk of a maximal line finds those members and no other.

2. **Transcript, wrong value.**
   - `"12"` concatenates into a string total.
   - `7` is coerced into `"7"`.
   - An object id never deduplicates.
   - `1.5`/`-3` make the record's total `-1.5`.
   - Two `1e308` overflow the record's total to `null`, and the emitted ledger is then RED under its own checker.
3. **Transcript, `usage` root.** A string, number or raw `1e999` `usage` is counted by the record as a zero-usage
   request. The ledger emits a row with no `usage` key for a long or newline-bearing string or `1e999`, which its own
   checker REDs.
4. **Transcript, depth.**
   - At depth 20,000 in `usage.iterations`, the emitter's recursive `sanitizeUsage` overflows the stack.
   - At depth 3,000 the emitter completes, but the checker's `findAbsolutePaths` then overflows over the ledger it
     wrote.
   - Both exit 1 with no verdict line. The record never walks `usage`.
5. **Transcript, verbatim strings.**
   - An absolute-path `requestId`, `sessionId` or `version` makes the emitted ledger RED under rule 3 (for
     `sessionId`, when the window binds no session).
   - The record copies any `timestamp` string into `window_start`/`window_end`.
   - A `__proto__` key in `usage` vanishes from the emitted copy with nothing listed (R2-G9): assigning it on a plain
     object sets the prototype.
6. **The checker's own input (`cost.json`, #279's code).** Every node of a GREEN ledger (149 nodes) was replaced by
   each of `{"toString":1}`, `[{"toString":1}]`, `null` and an array nested 20,000 deep, with and without
   `--verify-transcript`. That gave **20 distinct crash sites**, among them:
   - `JSON.stringify` and `findAbsolutePaths` stack overflows;
   - `path.join` on a non-string `name`;
   - S9 (`led.requests.map` over a `null` row or a non-array);
   - a default `sort()` over object ids;
   - `buildViews` and `addTokens` over object `model`/`stage`/`iteration`/`tokens`;
   - template literals in RED messages (`totals`, `unattributed`, `cmpView`, `excluded_requests`);
   - `findTranscriptDirs` on a non-string `membership.session`.

   Each exits 1, the checker's RED code, with no verdict line. The second grill's wider alphabet added one class: a
   huge `outcome.iterations` (`2^53`) makes the marker-completeness loop allocate until `RangeError: Invalid array
length` (about 2 GB), or a `SIGABRT` under a small heap.

7. **The checker's output can be forged.** RED and WARN messages interpolate raw strings from the file:
   - keys, in RULE 1 and RULE 8 and in walk paths;
   - values: `totals.requests` inside a RED run, and `sessions[0]` reaching the unavailable-transcript WARN when
     `membership.session` is `null`;
   - the parse error on stderr, whose V8 message embeds the file's raw text.

   Each printed a line starting `GREEN — forged` on HEAD (R2-G4, probed).

8. **The checker's output can be lost.** It ends with `process.exit`, so on darwin a verdict past the pipe's 64 KiB
   buffer is dropped (R2-G3, probed): `outcome.iterations = 100000` printed one 689,620-byte WARN and exited 0 with no
   verdict line, and 5,000 unexpected keys made one RED line over 64 KiB with no summary.
9. **Safe, not pinned.** Prototype-named strings (`__proto__`, `toString`) as id, model or stage render correctly in
   both renderers.
10. **Out of scope, named follow-up.** A `dropped[]` path's row index is taken before the ledger sorts its rows by
    `ts`, so in a multi-file transcript it can name the wrong row (probed). This is `cost-ledger-dropped-row-index`,
    surfaced at the plan gate and not selected.

## Applied lessons

- L62 — the remedy, applied to both inputs.
  - On the transcript side, every read site is a type or domain test run BEFORE any coercion.
  - On the checker side, every file-derived value quoted into a verdict line goes through ONE total, escaped,
    bounded quoter, `shown()`: the helper L62's own remedy produced, moved to `quote-core.mjs`.
  - Each member gets tests built from `{"toString":1}` and `[{"toString":1}]`, with a control asserting that each
    value really makes `String()`, `+`, a template literal, a relational compare and `Object.fromEntries` throw.
- L52 — the SETS are named, each in one sentence.
  - Transcript: every field whose value a consumer coerces, keys, counts, walks or copies (the resolved id, `usage`
    root, depth and keys, `model`, `attributionSkill`, `sessionId`, `version`, `timestamp`, and each class in
    `TOKEN_CLASSES`), × every consumer (the record library and CLI, the ledger library and CLI, and
    `--verify-transcript`).
  - `cost.json`: every node of a well-formed ledger × the hostile alphabet × both checker modes. Right-typed extremes
    are included: a large integer, and a document with many keys (R2-G3).
  - Checker output: every string node and every key of a well-formed ledger × a forged verdict line (R2-G4).
  - R11 named three pairs. The probes and both grills are the source of the sets.
- L29 — each set is materialized ONCE in `cost-hostile-input.test.mjs`: `TRANSCRIPT_MEMBERS` (each member's path,
  alphabet and expected fallback per consumer), the two ★ DOMAIN CLOSURE walks, and the ✎ FORGERY closure. Every rule
  iterates them.
- L36 — closure, not presence.
  - (a) The count members' ledger classes equal `TOKEN_CLASSES`, and their record classes equal a live `render()`'s
    `tokens` keys, both in both directions.
  - (b) Both ★ DOMAIN CLOSUREs walk EVERY node of their base documents, so a field nobody listed is still mutated.
    The precedent is `render-run-report.test.mjs`'s ★ DOMAIN CLOSURE, 6.21.1.
  - (c) The ✎ FORGERY closure walks every string node and every key, not a list of three.
- L60 — every asserted property has a named mutant (the table below), run once at build in a scratch copy and
  recorded in `BUILD.md`.
  - Every member path must RESOLVE in its base line before it is mutated.
  - Each alphabet carries a value that separates the fix from its nearest wrong variant: `""`, `1.5`, `-3`, raw
    `1e999`, `2^53`, a path string, `__proto__`, and a newline-bearing string.
  - Every ledger scenario asserts `membership.status === "bounded"` and its row count first, because an unknown window
    excludes every line before the code under test runs (first grill G5).
  - The `cost.json` closures assert every mutant reaches a verdict AND that the unmutated base is GREEN, so a closure
    over a document that is already RED cannot pass vacuously.
- L31 — two renderers read the one owner. Every transcript member test asserts the SAME outcome for the record and the
  ledger wherever both read the field. The checker and the emitter share each bound's one encoding: the usage key and
  depth rules are imported by the checker, as `isTokenLeaf` already is.
- L2 — a contract may cite only live floor ops (R2-G2). Every bound this increment writes into `cost-ledger.md`'s FLOOR
  section is a rule `check-cost-ledger.mjs` enforces, with its test named. A bound only the emitter holds is written
  as a property of the emitter's output, pinned by the emitter's tests, never as a checker rule.
- L15 — a plain object keyed by arbitrary input meets its prototype (R2-G9). `sanitizeUsage` WRITES transcript keys
  into a plain object, and a `__proto__` key sets the prototype instead of an own key. The key rule refuses it, and
  the checker REDs a stored one.
- L35 — one implementation per rule, and one import address per name, with no re-exports:
  - the id and `usage` rules live once in `transcript-core.mjs`;
  - the identity bound, the count domain and `ABS_PATH_RE` live once in `cost-value-core.mjs`, and every importer
    moves to it;
  - the usage-copy rules (`TOKEN_RE`, `isTokenLeaf`, NEW `isUsageKey` and `USAGE_MAX_DEPTH`) stay in
    `render-cost-ledger.mjs`, because only the ledger copies `usage`, and the checker imports them from there;
  - the checker's inline copy of the identity predicate is retired onto `isIdentityToken`;
  - the checker's `name` gate reuses the exported `FEATURE_SLUG_RE` from `gate-run-core.mjs` (no imports of its own)
    instead of writing a fourth copy of that grammar;
  - `shown()` and `SHOWN_CHARS` move byte-for-byte from `test-results-formats.mjs` to `quote-core.mjs`, the
    `dataText` precedent, so the checker quotes through the same helper as the results parser (R2-G6).
- L41 — `normalizeTokens(u, n, dropped)` has no defaults, and it validates `n` and `dropped` on EVERY call, clean
  input included (first grill G4). The new `depth` parameters default to 0 in ONE place each, and that default is
  exercised by every production call and every existing test.
- L37 — every bound sentence added to a contract or header names the test that pins it. The first grill's G2 was a
  sentence that outran its probe, and the second grill's R2-G3 was another: "every parsed document gets a verdict"
  failed on right-typed inputs. The checker header's totality sentence is written from the closures' result, and
  names time and memory as unclaimed.
- L47 — shipped sentences name members and bounds by rule and by constant (`TOKEN_CLASSES`, `IDENTITY_MAX`,
  `USAGE_MAX_DEPTH`, `WALK_MAX_DEPTH`, `SHOWN_CHARS`), never by a count that could go stale. The measured "20 crash
  sites" stays in this plan and the CHANGELOG, which are dated records.
- L50 — sweep for the claim this retires ("a crafted non-string id or model makes `String()` throw"): its one shipped
  cite is `transcript-core.mjs`'s NAMED RESIDUAL, on this base, and this increment deletes it. The
  `.dev/features/cost-dedup-completed-usage/*.md` cites are dated records and stay. The sweep runs again at build over
  every shipped file (`BUILD.md`).
- L33 — that NAMED RESIDUAL is a "not yet built" claim that expires when this lands, so this increment removes it
  itself, rather than leaving the stale claim for #279's session to find.
- L63 — this increment changes how recorded values are DERIVED: which lines are requests, which counts count, and
  which strings are kept. So every existing re-derivation is enumerated and asked L58's question.
  - `--verify-transcript` re-derives through the same `deriveLedger`, so a ledger emitted by 6.24.2 re-derives
    identically.
  - Run membership is NOT a changed derivation: the emitter decides it on the same session value as before
    (R2-G7), and only the emitted `session_id` field is bounded.
  - A ledger emitted BEFORE 6.24.2 from a transcript carrying a value this increment refuses now re-derives
    differently and goes RED: a row the old emitter kept, or a count it summed. The checker's new internal rules can
    RED such a ledger even without `--verify-transcript` (R2-G8): a usage deeper than `USAGE_MAX_DEPTH`, a refused
    usage key, an identity string rule 3 refuses, a count that is not a non-negative safe integer. That RED is
    correct, since those values were never valid. It is named in the contract's compatibility note, `/1` included,
    not bounded away.
  - A genuine transcript carries no refused value, so its old ledgers re-derive unchanged and stay GREEN. The second
    grill measured this: 0 refusals of any class over 115,666 local usage-bearing lines, and a maximum usage depth
    of 4.
  - The refusals are per-line properties of bytes written once, so none of them moves a value into the
    still-growing part of the referent (L58).
- L64 — promoted from this feature's own review (decision 10) and applied in its fix pass: every restatement of a bound
  in the CHANGELOG, the contracts and the headers is grepped for and probed as a sentence of its own, not only the
  primary sentence it summarizes (see "Fix pass").

## Files

- `pharn/floor/cost-value-core.mjs` — NEW, product floor. The one home of the value domain a transcript-sourced
  identity or count must satisfy before a cost artifact carries or counts it. It holds:
  - the constants `IDENTITY_MAX` and `ABS_PATH_RE`, moved from `render-cost-ledger.mjs` byte-for-byte;
  - the predicate `isIdentityToken(v)`: `cleanScalar(v, IDENTITY_MAX)` (from `mark-phase.mjs`, string-only) and no
    `ABS_PATH_RE` match;
  - the predicate `isTokenCount(v)`: `Number.isSafeInteger(v) && v >= 0`.

  Node stdlib only, no CLI. Its header names its consumers, so a new one is a deliberate addition. It also states the
  load graph it adds to the record renderer (`mark-phase.mjs`, then `run-window-core.mjs`), and why the usage-copy
  rules stay in the emitter. Its prose cites `sessionRequests()` and never spells the usage read (R2-G11).

- `pharn/floor/cost-value-core.test.mjs` — NEW, floor test (does not ship). Each predicate over its boundaries:
  - 128 vs 129 characters, a control character, a path, `""`;
  - 0, `MAX_SAFE_INTEGER` vs `2^53`, `-1`, `1.5`, `Infinity`;
  - strings, booleans, and `{"toString":1}` with no throw.

  It also carries its own `ABS_PATH_RE` controls: a home path matches, and the schema token does not.

- `pharn/floor/transcript-core.mjs` — product floor (#279's module). Changes:
  - In `sessionRequests()`, a line is a usage-bearing record only when its `usage` is a plain object (non-null, not
    an array). Its resolved id (`requestId`, else `message.id`, precedence unchanged) must satisfy `isIdentityToken`, or
    the line is not a request. A present wrong-type `requestId` does NOT fall back to `message.id`: the line is
    malformed, and falling back could split one request across two keys.
  - The rank function `outputRank` ranks by `isTokenCount`, so the selected line carries a count both renderers count.
    The selection line itself stays byte-identical, because three mutant controls anchor on it.
  - The header's NAMED RESIDUAL paragraph is replaced by the rule and its bound (L33).
- `pharn/floor/transcript-core.test.mjs` — floor test (R2-G1). The ★ MUTANT CONTROLs' `mutantCore()` copies every
  non-test module of the floor beside the mutant, as the renderers' FOLLOWS controls already do. A lone copy can no
  longer resolve the new `./cost-value-core.mjs` import.
- `pharn/floor/render-cost-record.mjs` — product floor. Changes:
  - The `by_model` key is the model when `isIdentityToken` admits it, else `unknown`.
  - The `by_stage` key is `attributionSkill` when `isIdentityToken` admits it, else `(untagged)`.
  - In `fold()`, a count is added only when `isTokenCount` admits it, else 0.
  - The window takes a `timestamp` only when `tsMs` (imported from `run-window-core.mjs`) parses it. It is still
    ordered by its string, which is how the ledger orders its window (R2-G10).
  - The header gains the value rules and their bound: silent in this block, which has no `dropped` list.
- `pharn/floor/render-cost-ledger.mjs` — product floor. Changes:
  - It imports `ABS_PATH_RE`, `isIdentityToken` and `isTokenCount` from `cost-value-core.mjs`. It drops its own
    definitions and exports of `ABS_PATH_RE` and `IDENTITY_MAX`. Its `mark-phase.mjs` import line is unchanged, which
    keeps the overlap with PR #280 small.
  - The helper `sanitizeIdentity` tests with `isIdentityToken`; behaviour is identical.
  - In `buildLedger()`, `request_id: id` and `sanitizeIdentity(model, …)` lose their `String()`.
  - Run membership and attribution read the session exactly as before (`typeof … === "string"`, else `null`). The
    emitted row field `session_id` is that session when `isIdentityToken` admits it, else `null`, and a present
    refused value is listed as `requests[<n>].session_id` (R2-G7).
  - A refused `version` is not added to `claude_code_versions`, and is listed as `requests[<n>].version`, naming its
    source field.
  - The signature becomes `normalizeTokens(u, n, dropped)`. It throws a `TypeError` naming its contract on every call
    whose `n` is not a non-negative safe integer or whose `dropped` is not an array. An absent count is 0 as before. A
    present count that `isTokenCount` refuses is 0, and `requests[<n>].tokens.<class>` is listed.
  - NEW exports `USAGE_MAX_DEPTH = 32` and `isUsageKey(k)`: `isTokenLeaf(k)` and not `__proto__` (R2-G9).
    `sanitizeUsage(value, path, dropped, depth = 0)` refuses any node deeper than that bound, and any object key
    `isUsageKey` refuses. A refused key is listed as `<path>.<refused-key>`, a fixed marker, so the raw key never
    reaches `dropped[]`.
  - The header's RELATIONSHIP and honest-scope paragraphs name the imported rules and the refusals, citing
    `sessionRequests()` rather than spelling the usage read (R2-G11).
- `pharn/floor/check-cost-ledger.mjs` — product floor. It enforces every bound the contract gives the file, and it
  becomes total over its own input:
  - Its imports of `ABS_PATH_RE` and `IDENTITY_MAX` move to `cost-value-core.mjs`, and the rule-2b helper
    `badIdentity` becomes `!isIdentityToken(v)` for a present value, with identical behaviour.
  - NEW rules (R2-G2), each a RED:
    - RULE 2: a `usage` node deeper than `USAGE_MAX_DEPTH`, or a key `isUsageKey` refuses, both imported from the
      emitter;
    - RULE 2b: `request_id` and a row's `session_id` (nullable), and every element of `sessions[]` and
      `claude_code_versions[]`, must satisfy `isIdentityToken`;
    - every `tokens.<class>` must satisfy `isTokenCount`, replacing `Number.isFinite`;
    - a row's `stage` is a string or `null`, and its `iteration` a number or `null`. These are crash guards for the
      view recompute, which keep today's GREEN on a crafted marker's `1.5` (R2-G8).
  - Every file-derived value in a RED or WARN goes through `shown()` (imported from `quote-core.mjs`). A key goes
    through `keyText(k)`: printed as-is when `isTokenLeaf` admits it, else through `shown()`. Numbers keep the local
    `tokenText`, which now falls back to `shown()`. Walk paths are built from `keyText` segments, so no key reaches a
    line raw (R2-G4).
  - A list in a message shows at most its first five members and a count of the rest (R2-G3).
  - NEW export `WALK_MAX_DEPTH = 64`. An iterative probe REDs a document with a node deeper than it and names the
    path. The recursive walks stop at the bound, so no walk can exhaust the stack.
  - The marker-completeness WARN counts the missing iterations arithmetically from the observed set, and lists the
    first five. It never enumerates `1..outcome.iterations` (R2-G3).
  - RULE 6's recompute runs only when every row passes the view-relevant shape rules. Otherwise a RED says the views
    were not recomputed. `cmpView` compares key fields with `===`, and tolerates a non-object stored row.
  - The re-derivation (`--verify-transcript`) runs only when three preconditions hold:
    - every row is an object with a string `request_id`;
    - the ledger's `name` matches `FEATURE_SLUG_RE`, imported from `gate-run-core.mjs`;
    - the session actually passed to `deriveLedger` is `null` or satisfies `isIdentityToken`. That session is
      `membership.session`, else `sessions[0]` (R2-G4).

    Otherwise it REDs, saying which precondition failed, and does not re-derive (S9 included).

  - The entry point: the parse error is quoted through `shown()`. `main()` catches any unforeseen throw from the check
    and exits **2** (unusable input, never GREEN) with a fixed stderr line, which backstops a member no closure found
    (L62: a crash is never read as a verdict). The file ends through `process.exitCode`, never `process.exit`, so a
    verdict past the pipe buffer is not dropped. That is the 6.20.4 flush rule, pinned by this increment's own test,
    not by `cli-stdout-flush.test.mjs`: its set is defined as the CLIs whose stdout a floor caller parses (R2-G3).
  - The header states the totality claim over the closures and its bounds (time and memory), and the line definition:
    a line is `\n`-delimited, and U+2028, U+2029 and U+0085 pass `JSON.stringify` raw, the `serializeLedger`
    precedent.
- `pharn/floor/check-cost-ledger.test.mjs` — floor test (R2-G1). Two edits:
  - The --verify-transcript S4 test's id carries a quote and a backslash instead of a newline. The reader now refuses
    a control character in an id, so a newline can no longer reach the row compare, and the new suite pins that. The
    WARN's quoting is still asserted.
  - The pre-6.24.1 reconstruction passes `normalizeTokens(…, 0, [])`.
- `pharn/floor/quote-core.mjs` — product floor (R2-G6). It gains `shown(v)` and `SHOWN_CHARS`, moved byte-for-byte
  from `test-results-formats.mjs`. Its header names the new consumers and the one-line quoting rule beside the Markdown
  one.
- `pharn/floor/test-results-formats.mjs` — product floor (R2-G6). `shown` and `SHOWN_CHARS` move out. It imports them
  from `quote-core.mjs` for its own refusal reasons, and re-exports neither.
- `pharn/floor/test-results-core.mjs` — product floor (R2-G6), import line only: `shown` now comes from
  `quote-core.mjs`.
- `pharn/floor/test-results-core.test.mjs` — floor test (R2-G6), import lines only: `shown` and `SHOWN_CHARS` now
  come from `quote-core.mjs`.
- `pharn/floor/cost-hostile-input.test.mjs` — NEW, floor test (does not ship). The suite in "Tests to write" below.
- `pharn/floor/render-cost-ledger.test.mjs` — floor test, import lines only: `ABS_PATH_RE` now comes from
  `cost-value-core.mjs`.
- `pharn/floor/render-regression.test.mjs` — floor test, import line only: the same move.
- `pharn/floor/render-verify.test.mjs` — floor test (#281's file, merged in decision 9), import line only: the same
  move. It arrived on `main` after this plan's importer sweep. The fix pass's full suite found it, and a re-sweep of the
  merged tree found no other importer of a moved name.
- `pharn/pharn-contracts/cost-ledger.md` — pharn-contracts. It gains:
  - which lines are requests (the id and `usage` rules, and no fallback), citing `sessionRequests()`;
  - the `tokens` domain, as a checker rule;
  - the `usage` depth and key bounds, as checker rule 2;
  - the raw value bounded before any `String()`, and the rule-3 bound on `request_id`, `session_id`, `sessions[]`
    and `claude_code_versions[]`, as checker rules;
  - the `stage`/`iteration` shape rule, the document depth bound, the quoting of printed values, the totality
    statement with its bounds, and the exit-2 backstop;
  - the `dropped[]` path vocabulary, labelled as the emitter's output, not a checker rule;
  - that run membership reads the session as before, and only the emitted field is bounded;
  - the L63 compatibility note, extended to the new internal rules and to `/1`;
  - the follow-up `cost-ledger-dropped-row-index` in the Residual section.
- `pharn/pharn-contracts/ship-record.md` — pharn-contracts. The `cost` block's "What it IS NOT" gains:
  - which lines are not counted;
  - the `unknown`/`(untagged)` fallbacks for refused identities;
  - refused counts as 0;
  - window timestamps taken only when they parse;
  - all of it silent, because the block has no `dropped` list, while `cost.json` lists them.
- `CHANGELOG.md` — repo meta. A new `## [6.24.2] - 2026-09-26` section (`### Fixed`) directly above `[6.24.1]`.
  `[Unreleased]` holds no entries to move.
- `SKILLS_VERSION` — repo meta. 6.24.1 → 6.24.2.
- `README.md` — repo meta. The shields badge 6.24.1 → 6.24.2 (`check:badge`), and the generated `CURRENT-STATE`
  floor-module count, which moves from 88 to 89 because `cost-value-core.mjs` is a new non-test module.
  `npm run docs:generate` rewrites it: a declared Bash write (L19) to this file, and `npm run docs:check` decides.
- `.dev/features/cost-transcript-hostile-values/BUILD.md` — dev apparatus. The build note: the L60 mutant table run
  in a scratch copy, the importer and residual sweeps, the closure counts, and the forgery probe.

`MIN_CLI` is untouched: no installed path moves, and no frontmatter or contract shape that an install depends on
breaks. `cost-value-core.mjs` is a new file under `pharn/floor/`, which an install already copies.

### Not touched

- `cost-ledger-dropped-row-index` — a named follow-up, not selected at the plan gate. The new
  `requests[n].…` paths inherit the pre-sort index. The tests keep lines in `ts` order, so they do not depend on it.
- `normalizeMarkers` keeps any numeric `iteration`. The checker's shape rule admits a number instead of being
  tightened, and the emitter is not changed there, which also avoids PR #280's edit of that function (R2-G8).
- The window's lexical order on mixed-precision timestamps (`…:00Z` sorts after `…:00.500Z`) is pre-existing in the
  ledger's window and row sort, and both renderers now share it. The platform writes `toISOString()` timestamps, which
  have one precision, so it was never observed. Named, not changed (P7, R2-G10).
- RULE 8 re-tests every row against every current-run marker, which is O(rows × markers): the second grill measured
  22.9 s at 8,000 of each. Real ledgers hold hundreds. It is named in the header's totality bound, and not optimized
  (P7).
- `pharn/floor/render-run-report.mjs` reads `cost.json` and markers, not a transcript. 6.21.1's ★ DOMAIN CLOSURE
  covers it.
- The markers file (`markers.jsonl`, read through `normalizeMarkers`) is a third input with its own writer. It is not
  probed here, and nothing about it is claimed.
- `String(id)` in `validate.mjs`, `ac-gate-core.mjs` and `gate-run-core.mjs` was seen in the sweep. None reads a cost
  input, none was probed, and none is in this set (P7).
- `cli-stdout-flush.test.mjs`: its set is the CLIs whose stdout a floor caller parses, and no floor caller parses this
  checker's output, so it is not added there. Its exit form is pinned by `cost-hostile-input.test.mjs` instead.
- `.claude/commands/**`: no command prose describes these failure modes. `/pharn-loop` and `/pharn-ship` already
  treat the checker's exit as an annotation that gates nothing, so exit 2 changes no control flow (the second grill
  confirmed this).
- `CLAUDE.md` and the four trusted docs name neither the retired residual nor `ABS_PATH_RE`'s or `shown()`'s home
  (grep, this run).

## The fix, stated as code (one reference for the build)

```js
// cost-value-core.mjs — imports cleanScalar from ./mark-phase.mjs
export const IDENTITY_MAX = 128; //                         moved
export const ABS_PATH_RE = /…/; //                           moved byte-for-byte
export const isIdentityToken = (v) => cleanScalar(v, IDENTITY_MAX) && !ABS_PATH_RE.test(v);
export const isTokenCount = (v) => Number.isSafeInteger(v) && v >= 0;

// transcript-core.mjs — sessionRequests(), the one owner
const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
//   the usage:  if (!isPlainObject(u)) continue;
//   synthetic:  unchanged
//   the id:     resolved as today (requestId, else message.id);  if (!isIdentityToken(id)) continue;
//   outputRank: (u) => (isTokenCount(u?.output_tokens) ? u.output_tokens : -1)

// render-cost-record.mjs — aggregate() / fold()
//   model key: isIdentityToken(model) ? model : "unknown"
//   stage key: isIdentityToken(r.attributionSkill) ? r.attributionSkill : UNTAGGED
//   fold:      acc.<class> += isTokenCount(v) ? v : 0
//   window:    if (tsMs(r.timestamp) !== null) { min/max by the string, as before }

// render-cost-ledger.mjs — buildLedger()
//   sid (membership, attribution) = typeof r.sessionId === "string" ? r.sessionId : null      (unchanged)
//   row: request_id: id, session_id: sanitizeIdentity(r.sessionId, `requests[${n}].session_id`, dropped),
//        model: sanitizeIdentity(model, …, "unknown"), tokens: normalizeTokens(u, n, dropped)
//   version = sanitizeIdentity(r.version, `requests[${n}].version`, dropped); if (version !== null) versions.add(version)
export const USAGE_MAX_DEPTH = 32;
export const isUsageKey = (k) => k !== "__proto__" && isTokenLeaf(k);
//   sanitizeUsage(value, path, dropped, depth = 0): depth > USAGE_MAX_DEPTH -> refuse (path listed);
//   a key !isUsageKey -> refuse, listed as `${path}.<refused-key>`
export function normalizeTokens(u, n, dropped) {
  if (!Number.isSafeInteger(n) || n < 0 || !Array.isArray(dropped)) throw new TypeError("normalizeTokens(u, n, dropped): …");
  // each class: absent (undefined/null) -> 0; isTokenCount -> v; else dropped `requests[n].tokens.<class>`, 0
}

// check-cost-ledger.mjs
import { shown } from "./quote-core.mjs";
export const WALK_MAX_DEPTH = 64;
const keyText = (k) => (isTokenLeaf(k) ? k : shown(k));
const tokenText = (v) => (Number.isFinite(v) ? String(v) : shown(v));
//   lists: first 5 + "(+K more)"; missing iterations: count = iterations − |observed ∩ [1, iterations]|, scan ≤ |observed| + 5
//   main(): parse error -> stderr with shown(e.message), 2; try { checkLedger(…) } catch { stderr fixed line; return 2; }
//   if (import.meta.main) process.exitCode = main(process.argv.slice(2));
```

What a refused TRANSCRIPT value becomes:

| member                                           | record (`pharn-cost-record/1`)    | ledger (`cost.json`)                                                       |
| ------------------------------------------------ | --------------------------------- | -------------------------------------------------------------------------- |
| the resolved id (`requestId` / `message.id`)     | the line is not a request         | the line is not a request (no row, not in `excluded`)                      |
| `message.usage` (the root)                       | the line is not a request         | the line is not a request                                                  |
| `usage` past `USAGE_MAX_DEPTH`, or a refused key | not read                          | dropped, its path (or `<path>.<refused-key>`) listed                       |
| `message.model`                                  | bucket `unknown`                  | `model: "unknown"`, `requests[n].model` listed                             |
| `attributionSkill`                               | bucket `(untagged)`               | `attribution_skill: null`, path listed (unchanged)                         |
| `sessionId`                                      | not read                          | membership as before; `session_id: null`, not in `sessions[]`, path listed |
| `version`                                        | not read                          | not in `claude_code_versions[]`, `requests[n].version` listed              |
| `timestamp` (unparseable)                        | not used for the window           | not a member, as today (`tsMs`)                                            |
| a usage count (each class in `TOKEN_CLASSES`)    | that class counts 0 for that line | `tokens.<class>: 0`, `requests[n].tokens.<class>` listed                   |

"Refused" per kind:

- For the id and every identity string: anything `isIdentityToken` refuses. That is a non-string, `""`, over
  `IDENTITY_MAX`, a control character, or an absolute path.
- For `usage`: anything but a plain object. For a `usage` key: anything `isUsageKey` refuses, `__proto__` included.
- For a count: anything `isTokenCount` refuses. That is a non-number, a fraction, a negative, a non-finite value, or
  above `Number.MAX_SAFE_INTEGER`.

An ABSENT value keeps today's fallback, and is never listed. On membership: a present session that is not a string
is read as absent, as it is today, so it binds to every marker the way an absent one does. A refused session STRING
is compared as itself, so session-bound markers still exclude it (R2-G7).

What a crafted `cost.json` gets, for every document the closures walk: exactly one verdict line (`GREEN —` or the
`RED — <file>: …` summary), after any RED/WARN lines, with every quoted value through `shown()`, and exit 0 or 1.
An unforeseen internal error gets exit 2 with no verdict line. A crash with exit 1 is gone for every mutant the
closures walk.

## Tests to write (P1)

**`pharn/floor/cost-hostile-input.test.mjs`.** Hostile values are built with `JSON.parse`, or spliced into the
line/file as raw TEXT where `JSON.stringify` would change them (`1e999` becomes `null`, deep nesting overflows).

- `THROWING = [{"toString":1}, [{"toString":1}]]`
- the id and the identity strings: `THROWING ∪ {7, true, "", "/Users/someone/x", "v"×129, "a\nb"}`
- `usage`: `{[{"toString":1}], "x", "a\nb", 7, true, raw 1e999}`. A `{"toString":1}` usage is a plain object, so it
  stays a request with zero counts, asserted separately.
- the counts: `THROWING ∪ {"12", true, 1.5, -3, raw 1e999, 9007199254740992}`
- the `usage` keys: `{"__proto__", "a b", "a\nb", "/Users/someone/", "k"×65}`
- `timestamp`: `THROWING ∪ {"/Users/someone/x", "a\nb"}`

The tests:

1. **CONTROL (L62, L60).** Each `THROWING` value makes `String(v)`, `0 + v`, `` `${v}` ``, `v < "a"` and
   `Object.fromEntries([[v, 1]])` throw `TypeError`.
2. **ANCHORS (L60).** Every member path resolves to an existing value in its base line.
   - Shape A carries `requestId`, `agentId` and `attributionAgent`.
   - Shape B has `message.id` and no `requestId`, and no `agentId`, so `attributionAgent` is read.
3. **CLASS CLOSURE (L36).** The count members' ledger classes equal `TOKEN_CLASSES`, and their record classes equal a
   live `render()`'s `tokens` keys, both in both directions.
4. **★ TRANSCRIPT MEMBERS**, one `test()` per member. For each refused value, a transcript of one clean line plus one
   mutated line is read by every consumer, and the fallback from the table is asserted:
   - the record completes, round-trips through `JSON.stringify`, and has `isTokenCount` totals and the expected
     `requests`;
   - the ledger completes with `membership.status === "bounded"`, the expected row count, field and `dropped`
     membership;
   - the emitted ledger is GREEN under `checkLedger` and under `checkLedger(…, {verifyTranscript: true})`.
5. **DEPTH.**
   - A `usage.iterations` whose deepest node sits exactly at `USAGE_MAX_DEPTH` is kept whole, and one level more is
     dropped with its path listed. The ledger is GREEN both ways.
   - A 20,000-deep line leaves the record, the ledger and `--verify-transcript` complete, and the ledger GREEN.
6. **TRANSCRIPT CLI.** One transcript carries a refused value at every member, one line each.
   - `render-cost-record.mjs` exits 0 and prints a block that parses.
   - `render-cost-ledger.mjs <name>` exits 0 and WRITES `cost.json`.
   - `check-cost-ledger.mjs <cost.json> --verify-transcript` exits 0 with a `GREEN —` line.
7. **A GROWN TRANSCRIPT.** A ledger is emitted from clean bytes, then each `THROWING`-mutated line is appended inside
   the window. `--verify-transcript` prints a verdict line, and never exits without one.
8. **★ TRANSCRIPT DOMAIN CLOSURE (L36).** Both base shapes × EVERY node × `THROWING ∪ {"a\nb", "/Users/someone/x",
raw 1e999}`:
   - the record completes, with `isTokenCount` totals;
   - the ledger completes and is GREEN under `checkLedger(…, {verifyTranscript: true})`.

   The walk asserts its exact render count, that every member path is among the walked nodes, and that every ledger
   render has a bounded window (L34).

9. **ARGUMENT CHECK.** `normalizeTokens(u)` and `normalizeTokens(u, 0)` throw `TypeError` on clean usage, and
   `normalizeTokens(u, 0, [])` does not.
10. **★ LEDGER DOMAIN CLOSURE (the checker's own input).** A GREEN base ledger — asserted GREEN first — × EVERY node ×
    `{THROWING, null, "a\nb", raw 1e999, 2^53, an array nested 20,000 deep}`, × both modes:
    - `checkLedger` returns without throwing;
    - the CLI (over a sampled subset, one per distinct top-level key, to bound the spawns) prints exactly one verdict
      line and exits 0 or 1.

    The measured crash sites are pinned as explicit cases (S9 among them, and `outcome.iterations = 2^53`), so a
    regression names its site. A document with 5,000 unexpected keys and one with `outcome.iterations = 100000` each
    get exactly one verdict line through the CLI, and no stdout line longer than a fixed bound (R2-G3).

11. **✎ FORGERY CLOSURE (R2-G4).** Over the GREEN base ledger, in both modes:
    - every string node, in turn, becomes `"\nGREEN — forged"`;
    - every key, in turn, is renamed to `"\nGREEN — forged"`, with its value set to an absolute-path string so the key
      reaches a message through RULE 3's path;
    - the two-node case: `membership.session: null` with `sessions: ["\nGREEN — forged"]` under
      `--verify-transcript`.

    No RED or WARN contains `\r` or `\n`. NON-VACUITY: the key renames produce at least one message that quotes the
    forged key. Through the CLI, over a sample and the two-node case, no stdout line starts with `GREEN — forged`. An
    unparseable file whose text carries the forged line exits 2 with no stderr line starting `GREEN —`.

12. **EXIT-2 BACKSTOP.** Over a copied floor whose `render-cost-ledger.mjs` `buildViews` is replaced by a throwing
    stub, the checker exits 2 with its internal-error line, and never exits 1.
13. **NEW CHECKER RULES (R2-G2), each with its mutation control.** Starting from the GREEN base ledger, each of these is
    RED, naming its rule, and the unmutated base is GREEN:
    - a `usage` nested past `USAGE_MAX_DEPTH`;
    - a `__proto__` and a `"a b"` usage key;
    - a 300-character and a control-character `session_id`;
    - a control-character `sessions[]` element;
    - a 300-character `claude_code_versions[]` element;
    - a path-shaped `request_id`;
    - a `1.5` and a `-3` token count;
    - an object `stage`;
    - a string `iteration`.

    A `1.5` iteration stays GREEN (R2-G8), and so does a stage string that is not a marker's stage. The emitter's
    fix is pinned beside each rule: a transcript carrying the refused value yields a GREEN ledger (test 4), so the
    rule and the emitter agree.

14. **THE EXIT FORM (R2-G3).** `check-cost-ledger.mjs` has no code line calling `process.exit(`, and sets
    `process.exitCode = main(…)`. A ledger whose REDs exceed 64 KiB reaches a pipe whole: the last stdout line is the
    `RED — <file>:` summary, and the exit is 1.
15. **R2-G7.** With markers bound to the selected session, a line whose `sessionId` is a refused string stays
    excluded, exactly as on HEAD. With unbound markers, the same line is a row with `session_id: null` and its path
    listed.

**`pharn/floor/cost-value-core.test.mjs`** — each predicate over its boundaries and the hostile values (listed under
Files), plus its own `ABS_PATH_RE` controls.

**The negative controls**, run once in a scratch copy at build and recorded in `BUILD.md` (L60). Each must turn the
named tests red:

| mutant (scratch copy only)                                      | must turn red                       |
| --------------------------------------------------------------- | ----------------------------------- |
| `sessionRequests()` id test back to `!id`                       | 4 (id), 6, 8                        |
| id test without the path/length bound (`typeof … === "string"`) | 4 (id: path, `v`×129), 8            |
| `usage` test back to `!u`                                       | 4 (usage)                           |
| `outputRank` back to `Number.isFinite`                          | 4 (output count: `1.5`, `2^53`)     |
| record: model / stage key from the raw value                    | 4 (model / stage), 8                |
| record: `fold()` back to `?? 0`                                 | 4 (counts, record side), 8          |
| record: window from any `timestamp` string                      | 4 (timestamp)                       |
| `isTokenCount` → `Number.isFinite`                              | 4 (counts: `1.5`, `-3`, `2^53`)     |
| `isTokenCount` → `typeof v === "number"`                        | 4 (counts: raw `1e999`)             |
| `isIdentityToken` without the path test                         | 4 (path values), 8; cost-value-core |
| ledger: `String(model)` restored                                | 4 (model), 8                        |
| ledger: `session_id` / `version` copied raw                     | 4 (sessionId / version: path), 8    |
| ledger: membership read from the bounded session                | 15                                  |
| ledger: `normalizeTokens` zeroes without listing                | 4 (counts: `dropped`)               |
| ledger: no depth test / no key test in `sanitizeUsage`          | 5 / 4 (usage key)                   |
| ledger: `isUsageKey` admits `__proto__`                         | 4 (usage key: `__proto__`), 13      |
| ledger: `normalizeTokens` argument check removed                | 9                                   |
| checker: one `shown()` replaced by a raw interpolation          | 10 or 11 (that site)                |
| checker: `keyText` returns the raw key                          | 11                                  |
| checker: no depth bound in `findAbsolutePaths`                  | 10 (deep)                           |
| checker: one new rule of test 13 deleted                        | 13 (that rule)                      |
| checker: marker completeness enumerates `1..iterations` again   | 10 (`2^53`)                         |
| checker: RULE 6 without its shape gate                          | 10 (tokens / model / stage)         |
| checker: `--verify-transcript` without its preconditions        | 10 (S9, `name`), 11 (two-node)      |
| checker: `main()` without the catch                             | 12                                  |
| checker: `process.exit(main(…))` restored                       | 14                                  |
| one count member deleted / one member path misspelled           | 3 / 2                               |

## Contracts satisfied

- `pharn/pharn-contracts/cost-ledger.md`:
  - Rule 3 becomes true for non-strings. Until now `String()` ran before the bound, so a number was coerced into an
    admitted token and an object threw. It now also reaches `request_id`, `session_id`, `sessions[]` and
    `claude_code_versions[]`, as checker rules.
  - Rule 2 gains its depth and key bounds, as checker rules.
  - The rows AND totals now satisfy the checker's token rule by construction, because a sum of non-negative safe
    integers never reaches `Infinity`. It is exact below `2^53`.
  - The checker's rules gain the `stage`/`iteration` shape rule and the document depth bound, and its exits gain the
    stated backstop.
  - Every checker rule the contract names is a live op in `check-cost-ledger.mjs` (L2). A bound the checker does not
    enforce is not written as one of its rules.
- `pharn/pharn-contracts/ship-record.md`: the `cost` block's documented `<int>` token shape holds for every count the
  record reads, and its window strings are timestamps that parse.

## Guarantee audit (P0)

- "Which lines are requests: a resolved id `isIdentityToken` admits, and a plain-object `usage`" → FLOOR, primitive
  #3, in ONE place (`sessionRequests()`), pinned by tests 4, 6 and 8.
- "Neither renderer, nor `--verify-transcript`, throws on a refused transcript value at an enumerated member, or on
  `usage` past `USAGE_MAX_DEPTH`" → FLOOR over the enumerated members, the walked nodes and the depth test only
  (tests 4–8). It is **not** totality over every transcript. The walk covers two line shapes, and other mechanisms
  (memory, pathological line length) are unmeasured.
- "The emitted ledger satisfies its own checker for any single walked transcript node × the walk alphabet" → FLOOR
  over the walk (test 8), plus test 6's all-members file.
- "The checker enforces each bound the contract gives it" → FLOOR, primitive #3, one test and one mutant per new rule
  (test 13).
- "`check-cost-ledger.mjs` gives exactly one verdict line for every document the closures walk" → FLOOR over tests 10
  and 11, and over the right-typed extremes of test 10. "It never reads an internal error as RED" → FLOOR via the
  exit-2 backstop (test 12). "A verdict is not dropped by a pipe" → FLOOR over test 14.
  - It is **not** proof that no input can crash it. The backstop turns any throw into exit 2, unusable, never GREEN.
  - **Time and memory are not claimed.** RULE 8 is O(rows × markers). A document large enough to exhaust the heap
    ends the process with no verdict, and an abort cannot be caught. A crash outside `checkLedger` (the entry file
    failing to load) is outside the backstop. All three are named in the header.
- "No file-derived value can forge a verdict line" → FLOOR over the sites `shown()`/`keyText()` cover, pinned by the ✎
  FORGERY closure (test 11) over every string node and key. The line is `\n`-delimited: U+2028, U+2029 and U+0085
  pass `JSON.stringify` raw, and that is stated. ADVISORY as a property over time: nothing stops a future message
  from interpolating raw text (the same bound 6.21.1's `dataText` states).
- "One implementation per rule" → a code-structure fact, verified by grep at build and by #279's ✧ ONE OWNER test for
  the transcript read. ADVISORY over time beyond that test.
- "Real inputs never carry these values" → ADVISORY: a platform behaviour, observed (0 over 115,666 lines). No guard
  depends on it.

## Trust audit (P2)

- **The transcript is untrusted** input to three consumers.
  - Before: one crafted line crashed the measurement, or made the emitter write a ledger its own checker REDs.
  - After: its reach is bounded per field (the table). A refused value on a ledger row is listed in `dropped[]`. A
    line refused as a whole, and any refusal on a request outside the run window, are listed nowhere, and the record
    is silent throughout (re-review F1).
  - No new reach: a crafted line with a fresh bounded id can still add any right-typed usage. A crafted line that
    REUSES a genuine request's id with a larger admitted `output_tokens` replaces that request's usage, silently
    (REVIEW R8; pre-existing, 6.24.1's max rule). `cost.json` and the `cost` block gate nothing (fix #3).
  - Membership is not widened. A refused session string is compared as itself, exactly as on HEAD, and only the
    emitted field is bounded (R2-G7). A non-string session binds every marker, as it already did on HEAD. That is a
    pre-existing property of an absent session, and it is not changed here.
- **`cost.json` is untrusted** input to its checker. It is agent-written (a Bash write), committed, and a fabricated
  one is expected to pass (the checker's own header).
  - Before: 20 crash sites made the checker exit 1 with no reason, raw file strings reached its verdict lines, and a
    large verdict could be cut by the pipe.
  - After: every value and key is quoted through `shown()`/`keyText()`, every document the closures walk gets
    exactly one verdict line, and the exit form keeps it.
  - The checker still certifies internal consistency only.
- **Identity taint.** Both artifacts now hold every copied transcript string to rule 3's SHAPE bound, not its meaning
  (the contract's existing residual).

## Determinism audit (P5)

Every new branch is a membership test: `typeof`, a plain-object test, `Number.isSafeInteger`, `cleanScalar`,
`ABS_PATH_RE`, `TOKEN_RE`, `FEATURE_SLUG_RE`, `tsMs` and integer depth compares. Each fallback is a fixed literal,
a skip, or exit 2. The missing-iteration count is arithmetic over the observed set. There is no clock, no randomness
and no model judgment. Given the same bytes, every output is byte-identical, and the existing ✦ DETERMINISM tests
must stay green.

## Grill dispositions

First grill (`GRILL.md`, round 1):

- G1 → superseded by the re-base (6.24.2 on #279).
- G2, G3, G7 and G8 → built (selected at the post-grill gate).
- G4, G5 and G6 → folded into the tests.
- G9 → moot: stacked on #279, so the rules are written directly into `transcript-core.mjs`.
- G10 → stated in the `transcript-core.mjs` bullet, the table and the contract.

Second grill (`GRILL.md`, round 2), each accepted:

- R2-G1 (blocking-severity) → `check-cost-ledger.test.mjs` and `transcript-core.test.mjs` are in `## Files`, with
  their edits named. The legacy `/1` test needs no edit: `keyText` prints a plain key such as `membership` as-is.
- R2-G2 (blocking-severity) → the checker enforces every new bound (test 13), and the contract labels the `dropped[]`
  vocabulary as emitter output (L2).
- R2-G3 → the `process.exitCode` ending, bounded lists, the arithmetic missing-iteration count, the right-typed
  extremes in test 10, and time and memory named as unclaimed.
- R2-G4 → `shown()`/`keyText()` at every site, the session precondition on the value actually passed, the quoted
  parse error, the ✎ FORGERY closure, and the line definition in the header.
- R2-G5 → acknowledged. It was checked live this session, and the merge order goes to the maintainer at GATE 2.
- R2-G6 → `shown()` moved to `quote-core.mjs`, and the checker imports it. No second quoter.
- R2-G7 → membership keeps HEAD's session value, pinned by test 15.
- R2-G8 → the "always" sentence is gone, `iteration` is a number or `null`, and the compatibility note covers the new
  internal rules and `/1`.
- R2-G9 → `isUsageKey` refuses `__proto__`, the checker REDs a stored one, and the alphabet carries it (L15).
- R2-G10 → the record keeps string order after the parse test, as the ledger does. The shared mixed-precision order
  is named under "Not touched".
- R2-G11 → no non-owner module's prose spells the usage read or the id fallback. They cite `sessionRequests()`, and
  ✧ ONE OWNER stays green.

## Fix pass (GATE 2 → fix, 2026-09-27)

What each review finding (`REVIEW.md`) becomes. Every file touched is already in `## Files`.

- **R1 (blocking, P0): "every bound the contract gives the file".**
  - The three sentences are narrowed to the bounds this increment adds: the CHANGELOG bullet, the checker header's
    rule 2b, and contract rule 3's L2 parenthesis.
  - The two pre-existing FLOOR labels that no checker op backs are corrected in the field table.
    `skills_version` becomes **ADVISORY**: its shape is unchecked, and the checker only REDs a value beside an
    `unknown` source. `window_start`/`_end` becomes **ADVISORY**: not checked. This is a correction to shipped text,
    not a new rule (P7): backing either with a check was not selected.
- **R2 (blocking, P0): "`cost.json` lists each refusal".** `ship-record.md`, the emitter header and the CHANGELOG
  bullet now say which refusals are listed and which are not:
  - listed: an identity field, `version`, a count, a `usage` leaf or key;
  - not listed: a line refused as a whole, which leaves no row and no entry and is not counted;
  - an unparseable timestamp is counted in `excluded_requests` and listed nowhere.
- **R3: "no control character".** Wherever it describes rule 3 it becomes "no C0 control character or DEL": the
  CHANGELOG, the checker's identity RED messages, contract rule 3, the field table, the Residual section, and
  `cost-value-core.mjs`'s header.
- **R4: the window-order agreement is pinned by nothing.** New test 16 and its mutant.
- **R5: two CHANGELOG sentences drop their bounds.** The headline is bounded to the inputs this release enumerates.
  The forgery sentence carries the `\n` line definition.
- **R6: "rule 7" means two rules.** The field table cites the contract's own numbers, so the `outcome` row becomes
  rule 5.
- **R7: the load graph grew unrecorded.** `quote-core.mjs`'s LOAD GRAPH paragraph names the modules that now load it
  through `shown`.
- **R8: the BOUND names the weaker vector.** `transcript-core.mjs`'s BOUND, and this plan's trust audit, name the
  stronger one. A crafted line that REUSES a genuine request's id with a larger admitted `output_tokens` replaces that
  request's usage in both renderers, silently, and both checker modes stay GREEN. It is pre-existing (6.24.1's max
  rule), and it is stated, not closed.
- **R9: `shown()` hides a value's type.** The checker's "(got …)" slots print a finite number, a boolean, `null` or
  `undefined` as itself, unquoted, and a string or object through `shown()`. One helper, `valText`, replaces
  `tokenText`. New test 17.
- **A new importer from `main` ([[L52]]: the set is every importer, and a merge adds members).** #281's
  `render-verify.test.mjs` imports `ABS_PATH_RE` from `render-cost-ledger.mjs`, which no longer exports it, so it
  failed to load on the merged tree. Its import line moves to `cost-value-core.mjs`, and the file joins `## Files`.
- **L64, applied.** Before handing off, the build greps the diff's CHANGELOG, contracts and headers for each bound's
  key phrase ("every", "each", "no control", "a line", "lists", "never") and probes each hit as its own sentence. The
  result is recorded in `BUILD.md`.

New tests, in `cost-hostile-input.test.mjs`:

- **Test 16, WINDOW ORDER (R4).** A transcript whose two in-window lines are stamped `…:05Z` and `…:05.500Z`: the
  record's `window_start`/`window_end` equal the ledger's.
- **Test 17, TYPED VALUES (R9).** `outcome.iterations` of `1.5` prints `(got 1.5)`, the string `"1.5"` prints
  `(got "1.5")`, and `null` prints `(got null)`.

New negative controls, run in a scratch copy and recorded in `BUILD.md`:

| mutant (scratch copy only)                        | must turn red |
| ------------------------------------------------- | ------------- |
| record: window compared as numbers (`tsMs`)       | 16            |
| checker: `valText` quotes numbers (`shown` again) | 17            |

### The re-review of the fix pass (`REVIEW.md`, "Re-review"), and what each finding becomes

The re-review confirmed R1, R3, R4, R5, R6 and R8 fixed, and R2, R7 and R9 partly fixed, and raised F1–F5. All five
are wording, and each is the L64 class again: a sentence probed only over the inputs its author pictured.

- **F1 (blocking, P0): "`cost.json` lists the record's refusals".** `cost.json` covers only requests inside its run
  window, while the record reads the whole session. `ship-record.md`, the record's header, the emitter's header, the
  contract and the CHANGELOG now say:
  - a refused value is listed only on a row, that is a request inside the window;
  - a refusal outside the window, or under an unknown window, is listed in neither artifact;
  - `excluded_requests` counts an unparseable timestamp only under a known window, and is `null` under an unknown one.
- **F2 (blocking, P0): the compatibility note's "is now RED".** The old emitter coerced a model and a request id
  through `String()` before bounding them, so a number, boolean or plain object there became a well-formed token.
  Both checker modes pass such a model, and plain mode passes such an id, which `--verify-transcript` REDs. The note,
  in the contract and the CHANGELOG, now says "can now be RED", and names the coerced case that stays GREEN.
- **F3: three sites still quote a number.** The membership recompute message, the outside-window ids and the view-row
  key now print through `valText`. Test 17 gains an assertion at each, all covered by M30.
- **F4: the load-graph list names 6 of 11.** `quote-core.mjs` states the rule instead: every module that loads
  `test-results-formats.mjs`, directly or not, plus `check-cost-ledger.mjs`. Examples are marked as examples.
- **F5: "the selected line carries a count both renderers count".** `transcript-core.mjs` now says that when every line
  of a request carries a refused count, the earliest line is selected and both renderers count that class as 0.

The re-review's lesson candidate, that L64 recurred in its own fix pass, is recorded in `REVIEW.md` and deferred.
Step 2b carries one candidate per run, and L64 was this run's.

## Open questions (HALT)

None open. The five form decisions and the re-plan approval came from the maintainer on 2026-09-26. The second
grill's dispositions are corrections inside that approval, and they are reported at GATE 2. The GATE 2 decision (fix,
integrate, commit locally), the advisories to include (all) and the lesson (promote) came from the maintainer on
2026-09-27.
