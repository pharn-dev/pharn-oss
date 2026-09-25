# PLAN — review-leftovers-0924

- spec_content_hash: 4950796f5342df20a298fe22812e45dec3c15317592bd2358a31e149d2dc1c7f
- applied_lessons: [L1, L2, L6, L29, L33, L34, L36, L37, L45, L47, L49, L50, L51, L52]
- increment: Fix the six verified leftovers from the 2026-09-24 review of `7e9ed52..b31e540` as ONE patch release (`SKILLS_VERSION` 6.21.0 → 6.21.1), each re-verified against live code at `cf90897` before planning.
- layer(s): pharn-contracts (`ac-tests.md`, `spec-template.md`); product floor (`pharn/floor/`); product commands (`/pharn-ship`, `/pharn-spec`)
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]

## Trigger (P7) — each item re-verified live this run

The user's prompt lists six items from a completed review. None is taken on its word: each was re-derived at `cf90897`
(6.21.0), and the probe is recorded here.

1. **`pharn/pharn-contracts/ac-tests.md:225`** still reads "this pins what RUNS them, so a pinned test cannot pass
   because its runner changed". The same section's "What it does NOT catch" list (`:241-248`) and `LIMITS.md:392-394`
   both name runner parts the pin does not see (a setup file a config imports, env-driven config, `.npmrc`, the
   runner's version). An unqualified universal over a bounded floor op: the P0 disease. Swept for variant spellings
   (`runner changed`, `what RUNS them`, `pins what`, `pin … runner`): the only other hits are
   `test-infra-core.mjs:9-11` (a WHY sentence about what happens WITHOUT the pin, accurate), `README.md:563` and
   `pharn-test.md:185-190` (both list what is pinned and point at the not-caught list). One site.
2. **`ac-tests.md:75`** (the full-mode checker table) says `legacy-spec` is "exit **3**, checked first". Executed:
   full mode returns `1` for every finding (`check-ac-tests.mjs` `main`, the single `return 1`), and the existing test
   `legacy-spec — in FULL mode …` (`check-ac-tests.test.mjs`, via `onlyKind`) already asserts exit 1. The same
   contract's own exit line (`:100`) says 1, so the file contradicts itself. Exit 3 exists only in `--spec` mode
   (`specVerdict`). `check-ac-tests.mjs:74` says "(plus `legacy-spec`, which is its own exit code)" — stale twice: it
   IS a member of `KINDS`, and it has no exit code of its own in full mode. Swept (`legacy-spec`, `legacy (3)`,
   `exit **3**`, `3 legacy`): every other hit (`pharn-test.md:72`, `:329`, `CLAUDE.md:350`, `ac-tests.md:104-108`,
   `:294`, `check-test-stage.mjs`) is about `--spec` mode or `check-test-stage`'s own token, and is correct.
3. **`.claude/commands/pharn-ship.md:1093-1094`** says the terminal stage is "(8, counting `test`, which §6 does not
   list yet)". `pharn/ARCHITECTURE.md` §6 lists `test` (read this run, `:230` and the table row at `:238`; added in
   `b31e540`, 6.20.2). An expired "not yet" claim ([[L33]]). Swept (`§6 does`, `not in §6`, `seven stages`,
   `stages 1–7`, `terminal stage (`): the frontmatter description ("The eighth, terminal pipeline stage … over stages
   1–7"), `:50` and `:924` ("the seven stages") are all consistent with §6 today. One site.
4. **`pharn/floor/render-run-report.mjs` `acGateLines`** guards `ac_gate.acs` / `ac_gate.evidence` as arrays but not
   their elements. Reproduced with the CLI: a `null` element in either array → `TypeError: Cannot read properties of
null`, **exit 1**, and no `RUN-REPORT.md` written. The documented exits are 0 and 2. **The class is wider than the
   item, measured the same way** (a `node --input-type=module` probe of `renderRunReport`): `String()` is not total
   over JSON — `String(JSON.parse('{"toString":1}'))` throws "Cannot convert object to primitive value", and so do a
   template literal and `Array#join` over it. Four more sites crash on the same two shapes: `verify.verdict`
   (`{"toString":1}` → exit 1), `outcome.iterations`, a `null` row in `cost.json`'s `by_stage_iteration_model` (the
   item's exact twin, in the tokens table), and `totals.requests`. All in the same file, all the same defect.
5. **`pharn/floor/gate-run-core.mjs:49`** cites `pharn-ship.md:315-321`, which now points at a `mark-phase` call in
   Step 2, not at Step 2b. **Swept by referent ([[L50]]) and by claim class**: every `file:line` cite on the product
   surface (`grep -rnoE '[A-Za-z0-9_./-]+\.(md|mjs|cjs|json|js|ts):[0-9]+…'` over `pharn/`, `.claude/commands`,
   `.claude/hooks`, the four trusted docs; tests, fixtures and evals excluded). 25 hits, classified below under
   "Sweeps". `gate-run-core.mjs` alone carries **15** line cites; every one was dereferenced, and **each of them now
   points somewhere else** except `check-ship.mjs:139-140`. One more stale cite is outside it:
   `check-plan-spec-agree.mjs:64` → `check-spec-approved.mjs:47-48` (now its TRUST/usage text; the resolution it
   mirrors is at `:60-64`).
6. **Optional, taken (D6).** Since 6.20.7, `check-spec.mjs` reports "the body's first line starts `spec_kind:`" under
   the kind `pin`, which it shares with a hash mismatch. `/pharn-spec`'s re-validate step (`pharn-spec.md:268-273`)
   therefore tells the two apart by the checker's detail TEXT, and its Draft step (`:196`) explains `pin` by the same
   text. The grill (`.dev/features/spec-pin-kind-ambiguity/GRILL.md` finding 1) and the review (`REVIEW.md` finding 3)
   of that increment both proposed a distinct kind; its GATE 1 had fixed `pin`, so both presented it rather than acted.

## Applied lessons

- **L1** — meta-doc sweep done before scoping: `CLAUDE.md` (no sentence names the `pin` kind, `render-run-report`'s
  exits already read 0/2, `check-ac-tests`' full-mode exit is not restated), `README.md` (only the badge moves; the
  generated `CURRENT-STATE` region lists names and counts, and no file is added or removed), `pharn/floor/README.md`
  (states the layout rule, never its kind). The only meta-docs in `## Files` are `CHANGELOG.md`, `README.md`'s badge and
  `SKILLS_VERSION`.
- **L2** — item 1 is a contract whose honesty did not travel with its own sentence; the fix is written INTO
  `ac-tests.md`, pointing at the not-caught list in the same section, not only recorded here.
- **L6** — D6 exists because of it: `/pharn-spec` must branch on the kind TOKEN of `RED — <kind> failed:`, the
  structured field of the checker's output line, never on the detail text after the colon.
- **L29** — item 4's remedy is quantified over a set ("every JSON value the renderer stringifies"), so the deliverable
  is the enumeration: one helper that every site calls, and a domain test that iterates the fixture's own nodes rather
  than a hand-written list of sites.
- **L33** — items 3 and 5 are expired-claim repairs; both were swept past the one site the prompt named (item 5 had 14
  more stale cites in the same file), and every prior enumeration (the prompt's list, my first grep) was treated as a
  lower bound.
- **L34** — the item-4 domain test asserts a counted, non-zero number of renders and that the control render reaches
  every populated block (the tokens table rows, the AC rows, the evidence row), so it cannot pass over an empty domain.
- **L36** — the item-4 domain test is a CLOSURE over the fixture: it walks every node of the three JSON inputs, so a
  field added to the fixture later is mutated for free, instead of a per-site presence list that certifies the sites
  its author was looking at.
- **L37** — every corrected quantified sentence was probed, not read: item 2's exit code was executed, item 4's crash
  was executed for each shape, and item 1's replacement sentence is scoped to the parts the pin lists, whose
  not-caught list `LIMITS.md` confirms.
- **L45** — D6 is a checker change whose production path is a COMMAND's prose. A test runs `check-spec.mjs` on both
  `pin` shapes and requires `/pharn-spec`'s re-validate step to name exactly the kinds it emitted, so a checker fix
  cannot ship while the command still branches on the old spelling.
- **L47** — item 3's repair changes FORM, not value: "(8, counting `test`, which §6 does not list yet)" becomes "§6's
  terminal stage … over every stage before it", with no count to expire. Item 5's repair likewise replaces line
  numbers by NAMES — refreshing the numbers would only set a new expiry date.
- **L49** — every sweep below states its coverage boundary and which of its sites a checker backs: the badge
  (`check-version-badge`), the CHANGELOG shape (`check:changelog`, `check:changelog-entry`) and item 4's domain (T4c)
  are checker-backed; the prose sweeps for items 1, 2, 3 and 5 are not, and are declared as greps with their bounds.
- **L50** — item 5 was swept by REFERENT (every `file:line` cite on the product surface, each dereferenced and
  classified, table below) and not only by the one cite named; every replacement cite was dereferenced in this run.
- **L51** — item 4's guard is justified against the renderer's FULL input domain (any JSON value in any of its three
  JSON inputs), not the one element shape the review reproduced; the extra crash sites were found by probing, not by
  reading.
- **L52** — the item-4 tests name their set in the same sentence: "every node of the fixture's `cost.json`,
  `verify-report.json` and `regression-report.json`, × {`null`, `{"toString":1}`}, plus a `null` appended to every
  array", and the reported case (a `null` in `acs` and in `evidence`) is ALSO pinned through the CLI's WRITE path, the
  one that failed to write.

## Decisions

### D1 — item 1: qualify the pin's claim in `ac-tests.md`

Replace the sentence at `:225` with one that claims only what is pinned and points at the list of what is not:

> The lock pins the test FILES; this pins the parts of what RUNS them listed below, so a pinned test cannot pass
> because one of THOSE parts changed. It is not the whole runner: what the pin does not see is stated after the list.

### D2 — item 2: the full-mode table row and the `KINDS` comment

- `ac-tests.md:75`: `legacy-spec` row → "the SPEC has no `spec_template` (checked first; exits **1** like every kind
  here — exit **3** is `--spec` mode's)". Kept within the column's current widest cell so prettier does not re-pad the
  table.
- `check-ac-tests.mjs:74`: `/** The closed set of RED kinds. In full mode every one exits 1, \`legacy-spec\` included;
  exit 3 is \`--spec\` mode's legacy verdict (specVerdict). */`.
- No new test: the behaviour the corrected sentence states (full mode, legacy SPEC → exit 1, only `legacy-spec`) is
  already pinned by `check-ac-tests.test.mjs` "legacy-spec — in FULL mode …" (`onlyKind` asserts `code === 1`).

### D3 — item 3: `/pharn-ship`'s §6 reconciliation paragraph

`pharn-ship.md:1093-1094` → "`/pharn-ship` **aligns**: it realizes §6's terminal stage as a meta-orchestrator over
every stage before it, and brings the human to that ship **decision** at GATE 2." Open form ([[L47]]).

### D4 — item 4: `render-run-report.mjs` never throws on a JSON value

- **One helper, exported:** `dataText(v)` — a string is itself; anything else is `JSON.stringify(v)`, and `undefined`
  (an absent field) keeps `String()`'s spelling. It is byte-identical to `String()` for every primitive (string,
  number, boolean, `null`, `undefined`), so every well-formed report renders exactly as today; it differs only for an
  object or array, which today renders `[object Object]` / `a,b` or throws. `JSON.stringify` cannot throw on
  `JSON.parse` output (no cycles, no BigInt, no function). The file already uses this idiom once (`regressions[]`);
  that site moves onto the helper, same bytes.
- **One element guard:** `isRecord(v)` (a non-null, non-array object). A non-record element of `ac_gate.acs` renders the
  row `(not an AC entry)  <dataText>`; of `ac_gate.evidence`, `evidence  (not an evidence entry)  <dataText>`; of
  `by_stage_iteration_model`, a table row whose stage cell is `(not a row)` and whose other cells are `-`. Rendered,
  never dropped: a malformed entry and an absent one must not look the same (the header's L34 rule).
- **Every JSON-sourced stringification goes through `dataText`:** `acGateLines` (every field, each `tests[]` element),
  `verdictsSection` (`verify.verdict`, each `failing_gates` element, `regress.verdict`, `regressions[]`),
  `outcomeSection` (`iterations`), `tokensSection` (every cell of every row, `TOTAL`, `unattributed`), and any further
  site the domain test exposes in the build (it is the detector; the build records what it found in `BUILD.md`).
- **Header:** one paragraph under "UNTRUSTED INPUT" stating the rule and its bound (below). The documented exits (0/2)
  become true for every JSON value in those three files.
- **Bound (P0), stated in the header:** the domain is the three JSON inputs this module parses itself. `markers.jsonl`
  (parsed by `render-cost-ledger.mjs` `readMarkers`/`normalizeMarkers`) and `LOOP.md` (parsed by
  `loop-record-core.mjs`) are imported readers and are not in this increment's domain. The domain test ranges over the
  fixture's nodes, so a field no fixture carries is not mutated.
- **Tests (`render-run-report.test.mjs`):**
  - **T4a — the reported case, through the CLI WRITE path:** a `null` in `ac_gate.acs` and a `null` in
    `ac_gate.evidence` (and a `null` row in `by_stage_iteration_model`) → exit 0, `RUN-REPORT.md` written, the two
    marker rows present, the well-formed rows beside them still rendered, and the section set unchanged. Fails before
    the fix (exit 1, no file).
  - **T4b — `dataText` unit:** byte-identical to `String()` over `["", "x", 0, -0, 1.5, 1e21, true, false, null,
undefined]`; total and JSON over `{"toString":1}`, `[{"toString":1}]`, `{"a":{"toString":1}}`.
  - **T4c ★ domain closure:** a well-formed fixture that populates every block (tokens table with rows, `TOTAL` and
    `unattributed`; verify `FAIL` with `failing_gates` and a full `ac_gate`; regress `regressions` with entries). For
    each of the three files, walk EVERY node (root excluded); replace it with each of `null` and `{"toString":1}`; and
    append `null` to every array. Each mutant must render without throwing. Non-vacuity: the mutant count equals the
    walked-node count × 2 + the array count and is > 0, and the unmutated control contains the rows the mutants target.

### D5 — item 5: line-number cites become name cites

Every `file:line` cite in `gate-run-core.mjs`, and the one stale cite in `check-plan-spec-agree.mjs`, is replaced by a
NAME cite (a step heading, a named block, a const), each dereferenced this run:

| site                           | old cite                                            | now points at                                   | new cite                                                                                              |
| ------------------------------ | --------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `gate-run-core.mjs:13`         | `check-verify.mjs:60-65`, `check-regress.mjs:40-49` | TRUST text; stamp-surface text                  | each checker's own `Usage:` block ("results.json : a flat … map written by the command")              |
| `gate-run-core.mjs:49`         | `pharn-ship.md:315-321`                             | a `mark-phase` call in Step 2                   | `/pharn-ship` "Step 2b — The single build-completion retry"                                           |
| `gate-run-core.mjs:50`         | `check-loop.mjs:43,79`                              | a reconcile row; a blank line                   | `check-loop.mjs`'s DECISION table and `VERIFY_VERDICTS`                                               |
| `gate-run-core.mjs:51`         | `pharn-verify.md:234-235`                           | an e2e timeout note in Step 3a                  | `/pharn-verify` Step 3c ("The runner injects `reconcile` itself, always LAST")                        |
| `gate-run-core.mjs:206`        | `mark-phase.mjs:60`, `render-run-report.mjs:97`     | a usage line; a blank line                      | `mark-phase.mjs` `NAME_RE`, `render-run-report.mjs` `SLUG_RE` (the names its ✧ parity test reads)     |
| `gate-run-core.mjs:308`        | `pharn-verify.md:199-215`                           | Step 3a gate discovery                          | `/pharn-verify` Step 3b (the `structural:<expected>` rule, `findings.json` colocated)                 |
| `gate-run-core.mjs:683-685`    | nine cites across seven consumers                   | drifted (e.g. `check-loop.mjs:133` parses argv) | made HISTORICAL: "when 6.8.0 added it, every consumer then … (named) — a consumer added since is not" |
| `check-plan-spec-agree.mjs:64` | `check-spec-approved.mjs:47-48`                     | its TRUST/usage text                            | "mirrors `check-spec-approved.mjs`, which resolves `check-spec.mjs` the same way"                     |

The `:683-685` sentence is re-authored as a dated observation because its present-tense universal ("every live
consumer … reads named fields only") would otherwise need re-proving over consumers added since 6.8.0
(`check-loop-fresh.mjs` among them); a dated reading stays true, and the sentence says it does not cover later ones
([[L37]], [[L47]]). No test: comments only.

### D6 — item 6: a dedicated RED kind `kind-in-body`

- **The kind.** `check-spec.mjs` `validate` (3b) emits `kind-in-body` for a body whose first line starts `spec_kind:`.
  `pin` keeps exactly one meaning: `spec_content_hash` is malformed or differs from the pin. Named for §6's pin
  contract (the axis 6.20.7's plan chose `pin` for), and deliberately NOT rule 8's template-only `spec-kind`.
- **The command branches on membership (P5, [[L6]]).** `/pharn-spec`'s re-validate step: when **every** RED is `pin`,
  the hash is wrong — recompute and re-write it; when **any** other kind appears (`kind-in-body` among them, which no hash
  can fix because the two layouts share one pin), the body is not approvable — back to Draft. The Draft step's kind
  list gains `kind-in-body` in place of `pin` (a Draft never reaches the hash check, so `pin` cannot fire there), and its
  explanation keys on the kind. Two further sentences that name the kind (`:51`, `:179`) follow.
- **Docs that name the kind:** `spec-template.md:162` ("with kind `pin`"), the `pinHash` comment in `check-spec.mjs`
  (`:187`), and `spec-template-core.mjs` `kindLineOpensBody`'s comment (`:94`).
- **Not a breaking change.** The same SPECs are RED and GREEN as before; only the layout RED's kind token changes. The
  one consumer that reads the token is `/pharn-spec`, shipped in the same release. `check-spec-approved.mjs` and
  `check-plan-spec-agree.mjs` read exit codes; `check-ac-tests.mjs` maps any chain failure to its OWN `pin` and its own
  layout finding to its own `spec-kind`, neither of which moves. PATCH, like 6.20.7 itself.
- **Tests (`check-spec.test.mjs`):** the five layout assertions move from `["pin"]` to `["kind-in-body"]` and the detail
  regex to `RED — kind-in-body failed:`; the three drift cases stay `["pin"]` (already asserted); NEW: layout A with a
  wrong hash emits exactly `["kind-in-body", "pin"]` (emission order: (3b) before (4)) (the two kinds are disjoint, and a mixed RED routes to Draft); NEW
  ★ WIRING ([[L45]]): run the checker on the hash-mismatch shape and on the layout shape, and require `/pharn-spec`'s
  re-validate step to name each emitted kind, and its Draft step to name `kind-in-body`.

### Version

`SKILLS_VERSION` 6.21.0 → **6.21.1** (PATCH: corrections to shipped bytes — two contract sentences, two command
paragraphs, comments, a crash on malformed input, and a RED's kind token). `MIN_CLI` stays **0.5.0**: no installed path
moves and no install is invalidated. `CHANGELOG.md` opens `## [6.21.1] - 2026-09-25` (`### Fixed`, plus `### Changed`
for the kind), `[Unreleased]` is empty at this base. `README.md`'s badge follows (`check-version-badge`).

## Files

- `pharn/pharn-contracts/ac-tests.md` — D1 the pin sentence; D2 the `legacy-spec` row — layer pharn-contracts
- `pharn/floor/check-ac-tests.mjs` — D2 the `KINDS` doc comment — layer product floor
- `.claude/commands/pharn-ship.md` — D3 the §6 reconciliation sentence — layer product command
- `pharn/floor/render-run-report.mjs` — D4 `dataText`, `isRecord`, every JSON-sourced site, header paragraph — layer product floor
- `pharn/floor/render-run-report.test.mjs` — D4 tests T4a, T4b, T4c — layer product floor tests
- `pharn/floor/gate-run-core.mjs` — D5 the fifteen line cites — layer product floor
- `pharn/floor/check-plan-spec-agree.mjs` — D5 the one line cite — layer product floor
- `pharn/floor/check-spec.mjs` — D6 the `kind-in-body` kind and its two comments — layer product floor
- `pharn/floor/spec-template-core.mjs` — D6 `kindLineOpensBody`'s comment — layer product floor
- `pharn/floor/check-spec.test.mjs` — D6 the layout tests' kind, the mixed case, the ★ WIRING test — layer product floor tests
- `pharn/pharn-contracts/spec-template.md` — D6 the layout paragraph's kind — layer pharn-contracts
- `.claude/commands/pharn-spec.md` — D6 the four sentences naming the kind; the re-validate branch — layer product command
- `SKILLS_VERSION` — 6.21.1
- `README.md` — the version badge
- `CHANGELOG.md` — `[6.21.1]`
- `.dev/features/review-leftovers-0924/PLAN.md` — this plan
- `.dev/features/review-leftovers-0924/GRILL.md` — the grill
- `.dev/features/review-leftovers-0924/BUILD.md` — the build record
- `.dev/features/review-leftovers-0924/REGRESSION.md` — the regress record
- `.dev/features/review-leftovers-0924/regression-report.json` — the regress verdict
- `.dev/features/review-leftovers-0924/VERIFY.md` — the verify record
- `.dev/features/review-leftovers-0924/verify-report.json` — the verify verdict
- `.dev/features/review-leftovers-0924/REVIEW.md` — the review
- `.dev/features/review-leftovers-0924/SHIP.md` — the ship record

## Contracts satisfied

- `pharn-contracts/ac-tests.md` — D1/D2 make two of its sentences agree with its own not-caught list and exit line.
- `pharn-contracts/spec-template.md` "`spec_kind`" — D6 names the layout RED's kind; the rule and its argument are
  unchanged.
- `pharn-contracts/finding-shape.md` — not touched: no finding object changes.

## Evals to write (P1)

- None. No capability (`role:`-bearing file) is added or changed, and no `rule_id` moves. The regression tests are
  listed under D4 and D6.

## Guarantee audit (P0)

- "`render-run-report.mjs` exits 0 or 2 on any JSON value in `cost.json`, `verify-report.json` and
  `regression-report.json`" → **floor-adjacent, test-pinned**: T4c executes the renderer over every node of a fixture
  × two hostile shapes. Bounded, and stated in the header: a field no fixture carries is not mutated, and
  `markers.jsonl` / `LOOP.md` are imported readers outside the domain. The renderer still gates nothing.
- "a pinned test cannot pass because one of the pinned parts of its runner changed" (D1) → **floor**: content-hash of
  the listed scripts/configs (`test-infra-core.mjs`, compared by `ac-gate-core.mjs`). The sentence now claims only that.
- "`legacy-spec` exits 1 in full mode" (D2) → **floor**, executed; pinned by the existing `onlyKind` test.
- "`/pharn-spec` branches on the RED kind" (D6) → the kind token is **floor** (a fixed string per branch of `validate`,
  pinned by tests); the command's act of branching on it is **advisory** command discipline. The ★ WIRING test pins the
  command's TEXT to the emitted kinds; it cannot prove a model obeyed it.
- D3 and D5 make no guarantee claim: prose and comments, and D5's historical sentence is dated so it cannot expire.

## Trust audit (P2)

- D4 renders more untrusted values than before (a malformed entry's JSON text), always inside the existing fenced DATA
  blocks computed by `fenceFor()` over the whole body, and the verdict cells keep the header's documented inline-span
  exception (unchanged). `JSON.stringify` escapes newlines inside strings, so a mutant cannot open a heading; T4a
  asserts the section set is unchanged.
- D6's detail text stays fixed checker text; the SPEC line's value is still never echoed.

## Determinism audit (P5)

- D6 replaces a branch on detail TEXT with a branch on kind MEMBERSHIP (`pin` only → recompute; any other kind →
  Draft). The terminal fallback in `/pharn-spec` is unchanged (a RED returns the SPEC to Draft and the human).
- D4 adds no branch that a membership test could not drive: `typeof`, `Array.isArray`, `=== null`.

## Sweeps — coverage boundary ([[L49]], [[L50]])

`file:line` cites on the product surface (grep above, 25 hits), classified:

- **Fixed (D5):** the fifteen in `gate-run-core.mjs` and `check-plan-spec-agree.mjs:64`.
- **Accurate, and a trusted doc:** `LIMITS.md:359` → `check-model-config.mjs:32-38` (TURN SCOPE + PLATFORM VETO, read
  this run). Human-only; not touched.
- **Historical labels, not pointers:** `render-cost-ledger.mjs:110` (`render-ship-briefing.mjs:438`, `:365` — the
  defect locations [[L41]]/[[L52]] record); `count-verifiers.mjs:8` (`REVIEW.md:80` of a committed, frozen dev
  artifact).
- **Example data, not cites:** `merge-findings.mjs` (`src/app.ts:10`), `eval-format.md:124`
  (`case-injection-comment.md:20`), `pharn-review.md:258` (`src/app.ts:10`).

The grep's bound: a cite spelled without a `.ext:` suffix (e.g. `§6`, a step name) is not a line cite and is out of
this sweep; a cite in a `*.test.*` file does not ship and was not swept. **No checker backs this sweep, or the prose
sweeps for items 1–3** (each grep and its hits are recorded under "Trigger"): they are complete only to the patterns
searched. A cite added later in the same form is caught by nothing; a floor check banning line cites on the product
surface is a candidate for GATE 2, not built here (P7: it would need an allowlist for the historical labels above).

### Not touched

- `pharn/ARCHITECTURE.md`, `THREAT-MODEL.md`, `LIMITS.md`, `pharn/CONSTITUTION.md` — human-only; nothing here needs
  them changed (item 1's contradiction is resolved on the contract's side).
- `MIN_CLI` — no installed path or contract shape moves.
- The `docs/` generated regions — no file is added or removed and no counted frontmatter changes.

## Open questions (HALT)

- None unresolved. Two scope decisions are left for GATE 1 because they go past the prompt's letter: item 4 covers the
  four measured sibling crash sites (not only `acGateLines`), and item 5 covers the fifteen stale cites in the named
  file plus one outside it (not only `:49`). Item 6 is taken.

## GATE 1 — approval record

**A model decision made under delegation, not a human approval.** The user's prompt asked for all six items as one
`/pharn-dev-ship` increment ending in an opened pull request ("Run them as ONE `/pharn-dev-ship` increment … Open a PR
and merge it only when CI is green and the user has asked for it"), and left item 6 to "if the plan agrees". The
orchestrator approved this plan as written, including the two scope decisions above (item 4's four sibling crash sites,
item 5's sixteen cites) and item 6. The merge is NOT delegated: it waits for the user's explicit request.

## Post-grill amendments (they supersede the text above where they differ)

`GRILL.md` Step 1b: `check-plan-lessons.mjs` exit 0. Its ten advisory findings were checked and all ten are absorbed
here, within the approved design, as orchestrator decisions under the same delegation as GATE 1.

- **G1/G2/G3 → D4's helper.** `dataText(v)` calls `JSON.stringify` ONLY for a non-null object (object or array), inside
  a `try`, and a throw (a value nested too deep for the stack — `JSON.parse` accepts depths `JSON.stringify` cannot walk)
  renders the fixed marker `(value nested too deeply to render)`. Every primitive goes through `String()`, so it is
  byte-identical to `String()` by construction, `±Infinity` (`1e999`) included. `tokensSection`'s
  `Math.max(h.length, ...body.map(…))` spread (a RangeError near 200k rows) becomes a loop. The header's claim is
  bounded: the two measured shapes (a value nested 20,000 deep; 250,000 token rows) render and exit 0, and are tests;
  exhausting memory or another engine limit by sheer size is not claimed. T4b adds `Infinity`, `-Infinity` and the
  deep value.
- **G4 → T4c's fixture and its non-vacuity.** The fixture is a `/2` ledger with a `bounded` `membership` block, so
  `measurementLabel`'s four interpolations (`start`, `end`, `session`, `excluded_requests`) are walked, and they join
  D4's site list. T4c asserts that its walked paths include every KNOWN crash site (named in the test), so the closure
  cannot silently lose one ([[L34]], [[L52]]).
- **G5 → the verdict tokens.** `verify.verdict` and `regress.verdict` render inline only when they are members of their
  closed enums (`PASS | FAIL | INCOMPLETE | INCONCLUSIVE`; `no-regressions | regressions | inconclusive`), restated
  only as a render guard, exactly as `acGateLines` already does for `AC_VERDICTS`. An absent verdict renders `unknown`
  as today; a present, out-of-set one renders `unknown` plus its `dataText` quoted as DATA in a fence. The measured
  heading smuggle (`"PASS\n\n## Briefing…"`) is closed, and the header's inline-span EXCEPTION narrows to file paths.
  A test renders both probes and requires the section set unchanged.
- **G6 → runtime.** T4c's fixture keeps `base_sha: "unknown"`, so no mutant spawns `git`. The measured runtime is
  recorded in `BUILD.md`.
- **G7 → order.** Applied above: `["kind-in-body", "pin"]`, emission order.
- **G8 → the kind's NAME.** `pin-layout` shared a prefix with `pin`, so `includes("pin")`, `/\bpin\b/` or `/RED — pin/`
  would match both, and a model reading the output has the same hazard. The kind is renamed **`kind-in-body`** (applied
  above), which shares no prefix with `pin` or with rule 8's `spec-kind`, and mirrors the `kindInBody` field
  `specAcceptanceCriteria` already reports for the same condition. The ★ WIRING test matches back-ticked tokens
  exactly, and `/pharn-spec` names the token as the text between `RED —` and `failed:`.
- **G9 → D1's wording.** The pin does not stop a test passing; it makes the gate read `test-infra-changed`. D1 becomes:
  "…this pins the parts of what RUNS them listed below, so a change to one of THOSE parts reads `test-infra-changed` at
  `--check` and at the AC gate, and the test's pass no longer counts. It is not the whole runner: what the pin does not
  see is stated after the list." The guarantee-audit line follows.
- **G10 → D5's `:683-685` sentence.** "It was additive: when 6.8.0 added it, every consumer then read named fields
  only (…named…); `check-loop-fresh.mjs` (6.10.0) reads `gate_run.stamp_sha256` by name. A consumer added since is not
  covered by either reading."
