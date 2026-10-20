# PLAN — envelope-duplicate-keys

- spec_content_hash: 2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e
- applied_lessons: [L6, L29, L31, L35, L52, L60]
- increment: A key that appears twice in a `LOOP.md` or `BRIEFING.md` frontmatter envelope is refused by all five
  readers of those envelopes instead of being read last-wins. One helper in `pharn/floor/frontmatter-core.mjs` returns
  an envelope's entries together with the keys that repeat; the two shape checkers RED, the three consumers that gate,
  commit or copy a decision read the envelope as absent, the two contracts say so, and a closure test keeps any new
  envelope reader on the helper.
- layer(s): product floor (`pharn/floor/`), pharn-contracts, build apparatus (`.dev/guides/`), repo meta
- constitution_refs: [P0, P2, P5, P6, P7]

## The trigger (P7), reproduced live this run at `dd69efd5` (SKILLS_VERSION 6.71.0)

Audit ENF-4 (2026-10-12) found the floor's `key: value` readers disagreeing on which copy of a repeated key counts.
6.65.2 (#365, `frontmatter-parser-parity`) fixed the PLAN side and deferred this part in its PLAN's Q1 ("The LOOP.md /
BRIEFING.md duplicate-key refusal stays a named follow-up"). The deferral is still written in
`pharn/floor/frontmatter-core.mjs:84` and `.dev/guides/floor-checks.md:69`.

Scratch runner `.pharn/envelope-duplicate-keys/repro.mjs` (gitignored), a `LOOP.md` whose envelope opens with
`decision: STOP_GREEN` and ends with `decision: STOP_CAP`:

```text
check-loop-record:   0 GREEN — loop-record is well-shaped
check-loop-decision: 1 RED — loop-record's `decision` is "STOP_CAP" (reports absent in the scratch tree)
readOutcome:         {"decision":"STOP_CAP","iterations":1,"source":"LOOP.md"}
recordFacts:         {"decision":"STOP_CAP",...}
briefing readEnvelope("verify_verdict: PASS" then "verify_verdict: FAIL") → FAIL
```

The five readers agree with each other today (last copy), so the defect is not a reader-vs-reader split. It is that
the record means one thing to the floor and another to anyone who reads it top-down: a person reading GATE 2's
briefing sees `verify_verdict: "PASS"` on the first line while the checker certified the `FAIL` copy beneath it, and
a YAML 1.2 parser (which requires unique mapping keys) refuses the file outright. They also agree only because each
of the five carries its own copy of the envelope loop. Nothing ranges over the five, so a sixth reader, or an edit to
one, could start disagreeing with nothing to catch it (L31).

## Measured over the tree

`.pharn/envelope-duplicate-keys/scan.mjs` (gitignored) over every tracked `*LOOP.md` / `*BRIEFING.md`: **one** file
(`pharn/features/loop-decision-integrity/LOOP.md`), **zero** repeated keys. No existing test pins last-wins for an
envelope (grep of the six test files for repeat/duplicate/last copy). The new refusal REDs no committed artifact.

## The five readers (re-read live) and what each does on a repeat

| reader                                                      | today             | after                                                                                                      |
| ----------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------- |
| `pharn/floor/check-loop-record.mjs` `envelope()` (:150)     | last wins         | **RED**, naming the repeated key(s) and their counts, never a value                                        |
| `pharn/floor/check-ship-briefing.mjs` `readEnvelope` (:235) | last wins         | **RED** (`envelope` kind, before the required-field check), keys and counts only                           |
| `pharn/floor/check-loop-decision.mjs` `envelope()` (:208)   | last wins         | **RED**, before the blocked-stop skip (a repeated `blocked` must not reach SKIPPED GREEN)                  |
| `pharn/floor/loop-closeout.mjs` `readEnvelope` (:324)       | last wins         | returns `null` → `recordFacts` all-null → green gate's existing `decision unverifiable`, exit 4, no commit |
| `pharn/floor/render-cost-ledger.mjs` `readOutcome` (:550)   | last wins, copied | returns `null` → no declared outcome copied (the same reading as an envelope with no `decision`)           |

**The refusal covers EVERY key, not only the contract's named fields.** Both contracts keep "extra keys are ignored"
for their MEANING, but a key may appear once: YAML 1.2 makes mapping keys unique, neither writer emits a repeat
(`render-ship-briefing.mjs` renders a fixed key list; `/pharn-loop` follows `loop-record.md`'s template), and `blocked`
— an "extra" key three of the readers act on — is exactly where a named-fields-only rule would leave a gap. See Q1.

## Approach

1. **`pharn/floor/frontmatter-core.mjs`** gains one export, `frontmatterEntries(text)`: `null` when `text` is not a
   string or has no leading frontmatter (via `matchFrontmatter`, so the BOM strip cannot be skipped), else
   `{ entries, repeated }` — `entries` exactly `fieldEntries(m[1].split(/\r?\n/))`, `repeated` the keys seen more
   than once, each once, in first-occurrence order, as `{ key, count }`. Pure; the value rule stays each reader's
   (they differ on purpose: the briefing decodes `yamlScalar`, the ledger strips unmatched quotes). The "WHAT IT DOES
   NOT DO" paragraph at :79-84 is rewritten: `readField` still reads last-wins (SPEC readers), `check-plan-lessons`
   still refuses its one field, and the envelope readers now refuse any repeat through this helper.
2. **The five readers** each replace their `text.match(FM_RE)` + `fieldEntries(...)` pair with `frontmatterEntries`,
   and act on `repeated` as in the table. Each refusal message names the key(s) and counts only (keys are
   `[A-Za-z_][\w-]*` by the line grammar, so quoting one cannot throw or carry a control character — L62's concern
   does not arise, and no value from the file is printed). Comments that say "the last copy of a repeated key wins"
   (`check-loop-record.mjs:154`, `check-ship-briefing.mjs:239`, `render-cost-ledger.mjs:560-561`) are rewritten.
   `check-ship-briefing.mjs`'s `readHeaderField` (a PLAN/SPEC header, not the envelope) is unchanged.
3. **Contracts.** `loop-record.md` "Extra keys and sections are IGNORED" and `ship-briefing.md` "The rule of the
   contract" FLOOR item 1 each gain two sentences: every frontmatter key appears at most once; a repeat is RED from
   the shape checker and read as no envelope by the consumers named above, never resolved to one copy. The
   `briefing_contract_version` stays `0.2.0` — the renderer's bytes do not change and every rendered briefing already
   satisfies the rule.
4. **Release.** `SKILLS_VERSION` 6.71.0 → **6.71.1** (patch, Q2), the README badge, a `## [6.71.1]` CHANGELOG
   section per CONTRIBUTING "CHANGELOG entries". `npm run docs:generate` (a checker and two contracts change); the
   README CURRENT-STATE inventory lists contracts by name only, so no generated byte is expected to move — the
   generator decides, and whatever it rewrites is committed.
5. **Dev guides** (no bump): `.dev/guides/floor-checks.md:66-69` drops "that refusal is a named follow-up";
   `.dev/guides/floor-orchestration.md`'s `check-loop-record`, `check-loop-decision`, `loop-closeout`, cost-ledger and
   `check-ship-briefing` blocks each gain one clause saying a repeated envelope key is refused.

## Tests (one per reader, each with its negative control — L52, L60)

- `frontmatter-core.test.mjs` — `frontmatterEntries`: no frontmatter / non-string → `null`; a BOM'd block reads; a
  clean block → `repeated: []`; `a`,`b`,`a`,`a`,`b` → `[{a,3},{b,2}]` in first-occurrence order; `entries` equals
  `fieldEntries` over the same lines (no reading drifts).
- **Closure (L29, L31):** every non-test `pharn/floor/*.mjs` that calls `fieldEntries(` is classified — either in
  `ENVELOPE_READERS` (the five; each must call `frontmatterEntries(`) or in `HEADER_READERS` with a one-line reason
  (`render-ship-briefing.mjs` and `check-plan-lessons.mjs`: PLAN/SPEC headers; `check-ship-briefing.mjs` appears in
  both, its `readHeaderField` being a header reader). An unclassified caller fails; a listed file that no longer
  matches fails (stale entry). Plus a predicate-discrimination test (L60): the scan sees `fieldEntries(` in a sample
  and does not count a comment-only mention. BOUND: lexical — a reader written without `fieldEntries` is caught by
  the existing line-grammar closure only if it re-declares the regex.
- `check-loop-record.test.mjs` — ★ repeated `decision` (two valid tokens) → RED naming `decision` ×2, value not
  printed; ★ repeated extra key (`blocked` twice) → RED; control: the same record without the repeat → GREEN.
- `check-loop-decision.test.mjs` — ★ a genuine STOP_GREEN fixture (reports + marker) with `decision` repeated → RED
  naming the repeat; control: the same fixture unrepeated → GREEN. ★ a blocked stop with `blocked` repeated → RED,
  not SKIPPED; control: single `blocked` → GREEN SKIPPED.
- `loop-closeout.test.mjs` — `readEnvelope` / `recordFacts` on a repeated `decision` → `null` / all-null; control:
  unrepeated → the decision. One end-to-end closeout run over a green fixture with a repeated key → exit 4 or 5 per
  its existing record-check/green-gate path and **no commit** (branch absent); control: the existing green-commit
  test is the unrepeated twin.
- `render-cost-ledger.test.mjs` — `readOutcome` on a repeated `decision` → `null`; control: unrepeated → the copied
  outcome.
- `check-ship-briefing.test.mjs` — ★ a valid rendered briefing with one field duplicated (the PASS-over-FAIL shape
  above) → RED `envelope` naming the key; control: the same briefing as rendered → GREEN.

Each ★ is run once against the pre-change reader (the refusal undone in a scratch copy) to confirm it fails there.

## Files

- `pharn/floor/frontmatter-core.mjs` — `frontmatterEntries`; the deferral paragraph rewritten — product floor
- `pharn/pharn-contracts/cost-ledger.md` — the declared-outcome / fall-through sentences name a LOOP.md with no single
  readable `decision` (review R1; added AFTER the build anchor — see "Amendment 1") — pharn-contracts
- `pharn/floor/check-loop-record.mjs` — RED on a repeated envelope key — product floor
- `pharn/floor/check-ship-briefing.mjs` — RED on a repeated envelope key — product floor
- `pharn/floor/check-loop-decision.mjs` — RED on a repeated envelope key, before the blocked skip — product floor
- `pharn/floor/loop-closeout.mjs` — `readEnvelope` returns null on a repeat — product floor
- `pharn/floor/render-cost-ledger.mjs` — `readOutcome` returns null on a repeat — product floor
- `pharn/floor/render-run-report.mjs` — the derived-outcome preamble's reason, command-aware (GATE 1 Q3) — product
  floor
- `pharn/floor/render-run-report.test.mjs` — the preamble's two reasons, each the other's control — test
- `pharn/floor/frontmatter-core.test.mjs` — helper tests + envelope-reader closure — test
- `pharn/floor/check-loop-record.test.mjs` — repeat tests + controls — test
- `pharn/floor/check-ship-briefing.test.mjs` — repeat test + control — test
- `pharn/floor/check-loop-decision.test.mjs` — repeat tests + controls — test
- `pharn/floor/loop-closeout.test.mjs` — repeat tests + controls — test
- `pharn/floor/render-cost-ledger.test.mjs` — repeat test + control — test
- `pharn/pharn-contracts/loop-record.md` — a key appears at most once — pharn-contracts
- `pharn/pharn-contracts/ship-briefing.md` — a key appears at most once — pharn-contracts
- `.dev/floor/stage-load-budget.test.mjs` — ONLY if `pharn-loop`'s measured load (it reads `loop-record.md`) exceeds
  its ceiling: re-measured by the documented rule (measured + 10%, rounded up to 512) — build apparatus
- `.dev/guides/floor-checks.md` — the "named follow-up" sentence retired — build apparatus
- `.dev/guides/floor-orchestration.md` — one clause per affected checker block — build apparatus
- `SKILLS_VERSION` — 6.71.1 — repo meta
- `README.md` — the version badge — repo meta
- `CHANGELOG.md` — `## [6.71.1]` — repo meta
- `docs/capabilities/README.md` — only if `npm run docs:generate` rewrites it — generated
- `.dev/features/envelope-duplicate-keys/BUILD.md` — build notes (the ★ pre-change runs) — build apparatus

## Applied lessons

- L6 — the refusal reads only the `---`-fenced envelope through `matchFrontmatter`; a `decision:` line in the body is
  still data, and the tests keep a body repeat GREEN-neutral (the existing body-decision tests stay unchanged).
- L29 — the set "envelope readers" is materialized once, in the closure test's `ENVELOPE_READERS`, and the per-reader
  tests iterate a shared repeated-key shape rather than one hand-built case per file.
- L31 — five readers carry one envelope loop each; the remedy is the obligation set (every `fieldEntries` caller
  classified, every envelope reader on the helper), not five independent edits.
- L35 — the five private `match` + `fieldEntries` pairs collapse onto one core helper rather than being bound to each
  other with a sync check; the value rules, which differ on purpose, stay where they are.
- L52 — "one test per reader", named per reader in `## Tests`, each through the reader's real entry point (CLI for
  the three checkers, the exported function plus one closeout run for the consumers), not one test for the helper.
- L60 — every ★ has a negative control (the unrepeated twin passes) and is run once against the pre-change reader;
  the closure's predicate gets its own discrimination test.

## Contracts satisfied

- `pharn/pharn-contracts/loop-record.md` — "Extra keys and sections are IGNORED" gains the uniqueness rule; the
  envelope table is unchanged.
- `pharn/pharn-contracts/ship-briefing.md` — "The rule of the contract" FLOOR item 1 (envelope shape) gains it.

## Evals to write (P1)

- None: no Capability is added or changed. The checkers are floor infrastructure, tested by their `node --test`
  suites as listed above.

## Guarantee audit (P0)

- "`check-loop-record.mjs` / `check-ship-briefing.mjs` RED a repeated envelope key" → floor: enum-regex (a count over
  the keys the line grammar captured) — given a record handed to the checker; that a stage runs it stays advisory.
- "`check-loop-decision.mjs` REDs it, so `/pharn-loop` Step 6c never commits a green stop whose envelope repeats a
  key" → floor over the checker's verdict; loop-closeout's commit gate already requires that verdict GREEN.
- "loop-closeout and render-cost-ledger never act on either copy" → floor: tested code (`null` → the existing
  unverifiable / no-declared-outcome paths).
- "every envelope reader refuses a repeat" → the closure is LEXICAL (a `fieldEntries(` scan over `pharn/floor/`), and
  the behaviour is pinned per reader by tests; a reader written with neither `fieldEntries` nor the line regex would
  escape both — review territory, stated in the test header.
- NOT claimed: that an envelope with unique keys is truthful, or that the ledger's fall-through after a refused
  envelope is a meaningful outcome (see Q3).

## Trust audit (P2)

- `LOOP.md` / `BRIEFING.md` are untrusted DATA. The refusal reads only keys (grammar-restricted identifiers) and
  counts them; no value is printed in a refusal and no decision rests on a free-text field. The change narrows what
  reaches control flow (an ambiguous envelope reaches none of it).

## Determinism audit (P5)

- Every new branch is `repeated.length > 0`, a count over the captured keys. No fallback guesses a copy.

## Open questions (HALT) — each with the recommended answer

- **Q1 — refuse a repeat of ANY envelope key, or only of the contract's named fields?** Recommend **any key**: YAML
  1.2 already forbids it, both writers never emit one, and `blocked` (an "extra" key three readers act on) would
  otherwise be a gap. The contracts' "extra keys are ignored" keeps its meaning for a key's VALUE. Alternative: only
  the named fields plus `blocked`.
- **Q2 — bump size?** Recommend **patch (6.71.1)**. No valid record becomes invalid: a record with a repeated key is
  not a valid YAML mapping, no writer produces one, and the only committed record has none (measured). It corrects
  how bytes that already shipped read an ambiguous input; no shape a writer emits changes, so `briefing_contract_version`
  stays `0.2.0`.
- **Q3 — render-cost-ledger on a repeat: `null` (fall through to the derived outcome, as for an envelope with no
  `decision` today), or render `outcome: null` outright?** Recommend **`null` → existing fall-through**: it needs no new
  path and no cost-ledger contract change, the outcome's `source` then says `derived`, never `LOOP.md`, so no declared
  copy is claimed. Bound, stated in the CHANGELOG: the run report's derived-source paragraph then says /pharn-loop
  "writes no LOOP.md" — already true today for a `LOOP.md` with no readable `decision`. Inside loop-closeout the ledger
  is reached on such a record only after `check-loop-record` RED and a `--after-repair` re-run, and the green gate
  then refuses the commit (`decision unverifiable`, exit 4).

## GATE 1 — decision (2026-10-20; a model decision made by the orchestrator under the maintainer's delegation)

APPROVED. Q1 → any key. Q2 → patch (renumber at PR time; a sibling may take 6.71.1 first). Q3 → fall through to the
derived outcome, but the run report must not state a falsehood. Measured: `render-run-report.mjs` `outcomePreamble`
(:369) renders "because `<command>` writes no `LOOP.md` to copy one from" for EVERY derived outcome. That is false for
`/pharn-loop` whenever its `LOOP.md` exists but carries no single readable `decision` — a case that predates this
increment (a `LOOP.md` with no `decision` line) and that this increment widens (a repeated key). It is a small render
change, so it is made rather than recorded as a bound:

- `/pharn-ship` (the one command whose outcome is always derived, `SHIP_COMMAND`) keeps the sentence unchanged — it
  is true there.
- Every other command renders "because this run has no `LOOP.md` with a single readable `decision` to copy one
  from" — true whether the file is absent, has no `decision`, or repeats a key.
- The Handoff section's "writes no `LOOP.md` … BY DESIGN" (:1070) is reached only when no `LOOP.md` file exists and is
  left alone.

Two files are added to `## Files` before build Step 0 (so the anchor sees them):

- `pharn/floor/render-run-report.mjs` — the derived-outcome preamble's reason, command-aware — product floor
- `pharn/floor/render-run-report.test.mjs` — `/pharn-ship` keeps "writes no `LOOP.md`"; `/pharn-loop` with a derived
  outcome renders the "single readable `decision`" reason and never "writes no" (each the other's control) — test

## Amendment 1 — one contract added to `## Files` after verify (2026-10-20; a model decision under the delegated GATE 2)

`/pharn-dev-review` finding R1: `pharn/pharn-contracts/cost-ledger.md` says the outcome is copied from the `LOOP.md`
envelope and that "a loop ledger with no `LOOP.md`" reaches the derivation. Since this increment, a `LOOP.md` whose
envelope repeats a key also reaches it, and so did one with no `decision` before. The contract gains one sentence at
each site. The path was added after the build's anchor, so `reconcile` will report it as `plan-widened-after-anchor`.
That is recorded here and in `SHIP.md`, and not hidden.
