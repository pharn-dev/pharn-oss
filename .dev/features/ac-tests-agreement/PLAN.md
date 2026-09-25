# PLAN — ac-tests-agreement

- spec_content_hash: 4950796f5342df20a298fe22812e45dec3c15317592bd2358a31e149d2dc1c7f
- applied_lessons: [L23, L29, L35, L52]
- increment: Make the /pharn-test stage's lock and mapping checker read a path and a frontmatter value the way the rest of the floor does — one last-wins frontmatter reader, the setter's cleaned path pinned in the lock, mapping cells byte-identical to their `## Files` entry, the hook's NFC + full case fold, and the lock exempt from prettier — fixing five verified review findings (PATCH 6.20.4).
- layer(s): the product floor (`pharn/floor/` cores + checkers), pharn-contracts (`ac-tests.md`), one product command (`pharn-test.md`), repo meta (`.prettierignore`, CHANGELOG, SKILLS_VERSION, README badge).
- constitution_refs: [P0, P3, P4, P5, P6, P7]

## Why (the five findings, measured on `main` = `137abd3`, SKILLS_VERSION 6.20.3)

Each was reproduced by the review's scripts; the two decisive ones were re-run this session against this
machine (APFS): `a1/r5-nfd-hook.mjs` — a build scope naming the NFD spelling of an NFC AC test file is
ALLOWED by `enforce-writes-scope.cjs` and the write lands on the pinned test — and prettier over a
`JSON.stringify(lock, null, 2)` layout exits 1 (measured with `--ignore-path=/dev/null`; `.pharn/` is
git-ignored, so a plain `--check` there silently skips the file).

1. **`ac-tests-lock.mjs` `scalar()` reads the FIRST copy of a duplicated key and strips `#…` before the
   quote.** `check-spec.mjs` (`parseSpec` → `readValue`, object assignment) and `check-plan-spec-agree.mjs`
   (`readCarried`) read the LAST, quote first. `scalar` feeds `mappingFacts` (AC-TESTS.md) and
   `readSpecFacts` (SPEC.md) → the lock, `bootstrapReds`, `testFirstReds`, and the AC gate. Fail-open: a
   test-infra SPEC re-approved by APPENDING a new pin under the old one stays GREEN everywhere; a Draft
   leftover `spec_content_hash: ""` above the real pin makes `readSpecFacts` refuse, and the AC gate's
   `facts.ok &&` then SKIPS its compare. Fail-closed: AC-TESTS.md with stale-then-current pins locks the
   stale one, and verify's AC gate reports `ac-tests-modified` → terminal S13, which re-running
   /pharn-test reproduces.
2. **`mappingFacts` pins the RAW `## Files` entry**; `check-ac-tests.mjs` and `set-writes-scope.cjs` use the
   `clean`ed one. `` - `tests/ac/a.test.js (new)` `` → check GREEN, setter scopes the bare path, `--write`
   exits 2 "… (new) is missing".
3. **Mapping cells are compared folded but consumed verbatim.** `check-ac-tests.mjs` matches a cell to
   `## Files` through `scopeKey` (cleaned + lowercased); `acRowsOf` / `acFilesFor` / `observeAc` use the
   cell as written. A cell differing only in case, or ending in whitespace inside the back-ticks (which
   `MAPPING_RE` admits), passes the check and is never collected (`ac-test-not-collected` forever).
4. **`scopeKey` only lowercases.** No NFC, no full case fold — unlike the hook's `toKey` and
   `spec-template-core.mjs` `foldName`. A PLAN entry naming an AC test file in NFD or with `ſ` for `s`
   passes `in-plan-files` / `claimed-elsewhere`, and the build may overwrite the pinned test on APFS,
   contradicting `/pharn-test`'s "FLOOR: hook — the build cannot write an AC test file".
5. **`AC-TESTS.lock.json` is not in `.prettierignore`,** while every other machine-written
   `pharn/features/*/` artifact is (L23). A test-first dogfood run here fails its own `format:check` at
   verify, and `npm run check` goes RED once `/pharn-loop` Step 6c commits a lock.

## Decisions (proposed — confirm or correct at GATE 1)

- **D1 (finding 1) — ONE reader, in the core that already owns frontmatter.** `pharn/floor/frontmatter-core.mjs`
  gains `readValue(raw)` (check-spec's semantics, moved verbatim: quote resolved first, then an unquoted
  `#` comment stripped) and `readField(block, key)` (last-wins over `^([A-Za-z_][\w-]*):[ \t]*(.*)$`,
  `undefined` when absent — exactly `readCarried`'s loop). `ac-tests-lock.mjs` deletes `scalar` and reads
  `spec_id` / `spec_content_hash` of both AC-TESTS.md and SPEC.md through `readField`. **The two existing
  private copies are RETIRED, not bound (L35)**: `check-spec.mjs` imports `readValue` instead of carrying
  `stripQuotes` / `stripComment` / `readValue`; `check-plan-spec-agree.mjs` builds `readCarried` on
  `readField` and drops its three copies. Their headers justified the copies with "no sibling import
  (P3)"; a core is not a sibling (both already import `frontmatter-core.mjs`), so the reason no longer
  holds. Moving the body verbatim keeps every existing verdict byte-identical. _Alternative (the brief's
  minimum): keep both copies and add only a parity test — a third copy plus a sync check, which L35 names
  as the defect. Q1 — resolved at GATE 1: retire (condition: byte-for-byte move, every existing
  check-spec / check-plan-spec-agree test passes unchanged, the CHANGELOG says the refactor preserves
  behaviour)._
- **D2 (finding 1, the AC gate) — an unreadable SPEC pin is `ac-tests-modified`, not a skip.**
  `ac-gate-core.mjs` `testFirst`: when `readSpecFacts` refuses, add `ac-tests-modified` ("SPEC.md's pin
  cannot be read — it is not the SPEC the tests were locked against"). Fail-closed: a SPEC whose pin the
  floor cannot read cannot be shown to be the one the lock binds, and `ac-tests-modified` is the EVIDENCE
  class, so the loop stops (S13) instead of iterating a build that cannot restore it. With D1 the Draft
  leftover no longer reaches this branch, so it now fires only on a genuinely unusable pin. `testFirstReds`'
  own `fresh.ok &&` skip stays: its mapping-digest check already REDs any byte change to AC-TESTS.md.
  Q3 — resolved at GATE 1: yes. Conditions: the edit stays local to the `readSpecFacts` comparison and
  the module header (a parallel branch edits another emission's `detail` text in the same file); the header
  sentence that says the gate does NOT re-check that the SPEC is still Approved is rewritten to state the
  new bound truthfully — a SPEC whose pin cannot be read (a Draft, or a malformed pin) is now
  `ac-tests-modified`, an evidence reason: verify FAIL and `/pharn-loop` S13 — and a test covers it.
- **D3 (finding 2) — the lock pins what the setter scopes.** `ac-tests-core.mjs` exports
  `scopedPath(entry)` = `clean`, then `isConcrete` or `null` (both imported from `plan-files-core.mjs`, never
  re-derived); `scopeKey` becomes `scopedPath` + fold. `mappingFacts` maps every `## Files` entry through
  `scopedPath` (a `null` — placeholder or glob — is a named refusal, "run check-ac-tests.mjs") before
  de-duplicating, sorting and hashing; `testFirstReds` compares the `## Files` SET through the same
  function and REDs a non-concrete entry by name. No schema change: for every entry without a `(…)`
  annotation `clean` is the identity, so every lock written before this reads unchanged.
- **D4 (finding 3) — every mapping cell is byte-identical to a cleaned `## Files` entry, and carries no
  edge whitespace.** `MAPPING_RE`'s path group becomes `` `([^`\s](?:[^`]*[^`\s])?)` `` (leading whitespace
  was already refused; now trailing is too), so a trailing-space cell is `malformed-line` in the checker AND a
  refusal in `acRowsOf` for every downstream consumer. In `check-ac-tests.mjs` `unlisted-file` becomes exact
  membership in the cleaned `## Files` list, and its detail says when the cell differs only by case or
  Unicode form ("spell it byte-for-byte as listed"); `unmapped-file` becomes exact membership in the cells.
  The closed `KINDS` set is unchanged. So each consumer (`acFilesFor`, `observeAc`, the red run, the AC
  gate) receives exactly the path the setter scoped and `/pharn-test` wrote. `observeAc` is not touched.
- **D5 (finding 4) — the hook's fold, reused.** `scopeKey` folds with `foldName` from
  `spec-template-core.mjs` (NFC, then `toUpperCase().toLowerCase()` — the hook's `toKey` minus its Windows
  trailing dot/space strip, the omission that module already documents). Import direction core → core,
  no cycle (`spec-template-core.mjs` imports only `frontmatter-core.mjs`); the hook is never imported
  into the floor. `in-plan-files` and `claimed-elsewhere` inherit it.
- **D6 (finding 5) — exempt the lock, and make the rule an enumeration (L23, L29).** `.prettierignore`
  gains `pharn/features/*/AC-TESTS.lock.json`. A new ★ test in `check-regress.test.mjs` (the home of
  `PIPELINE_ARTIFACTS`' existing recurrence guard) parses `PIPELINE_ARTIFACTS` from source, takes its
  `.json` members, and requires a CLOSED classification of each: machine-written (a named floor writer
  that `JSON.stringify`s it — must have a `pharn/features/*/<name>` line in `.prettierignore`) or
  model-written (`ship-record.json`, the Write tool in `/pharn-ship`). A new JSON pipeline artifact fails
  until it is classified. Classifying honestly puts **two more** machine-written artifacts on the list:
  `assignments.json` (`render-review-assignments.mjs`) and `findings.json` (`merge-findings.mjs`), both
  written with `JSON.stringify(…, null, 2)` and both absent from `.prettierignore`. Measured: an
  assignments-shaped record (arrays of short strings) fails `prettier --check`; an objects-only findings
  array passes today, so it is listed on L23's "same requirement, list it before the first FAIL" reasoning,
  not on a measured failure. Q2 — resolved at GATE 1: yes, all three are listed.
- **D7 — the command's claim gets its bound.** `.claude/commands/pharn-test.md`'s "The build cannot write an
  AC test file" bound gains one sentence: the claim holds only up to this fold — the `in-plan-files`
  comparison is the hook's fold (NFC + full case fold), and a filesystem equivalence wider than that fold
  (e.g. Windows trailing dots) is not modelled. Condition (GATE 1): the wording stays exact, and whatever
  part of it is advisory is labelled advisory (P0).
- **D8 — dates (GATE 1).** The CHANGELOG section is `## [6.20.4] - 2026-09-25`, the actual date of the build.

## Files

- `pharn/floor/frontmatter-core.mjs` — `readValue` + `readField`, the one frontmatter value reader; header updated.
- `pharn/floor/frontmatter-core.test.mjs` — reader semantics (duplicated, quoted, commented, `feat#3`); ✧ parity: `check-spec.mjs --spec-id` / `--state` and `check-plan-spec-agree.mjs` executed on the same variants agree with `readField`; closure: no other non-test floor module declares `readValue` / `scalar`.
- `pharn/floor/check-spec.mjs` — retire its private `stripQuotes` / `stripComment` / `readValue`; import `readValue` (D1, Q1).
- `pharn/floor/check-plan-spec-agree.mjs` — retire its private copies; `readCarried` on `readField` (D1, Q1).
- `pharn/floor/ac-tests-lock.mjs` — drop `scalar`; `readField`; `## Files` through `scopedPath` in `mappingFacts` and `testFirstReds` (D1, D3).
- `pharn/floor/ac-tests-lock.test.mjs` — regressions from the repros: bootstrap appended pin → `--check` RED; Draft leftover pin line → bootstrap written; stale-then-current AC-TESTS.md pins → the current one locked; an annotated `## Files` entry → locked as its cleaned path, `--check` GREEN; a placeholder entry refused.
- `pharn/floor/ac-tests-core.mjs` — `MAPPING_RE` refuses trailing whitespace; `scopedPath`; `scopeKey` via `foldName` (D3, D4, D5).
- `pharn/floor/check-ac-tests.mjs` — cells byte-identical to a cleaned `## Files` entry (D4).
- `pharn/floor/check-ac-tests.test.mjs` — case-differing cell and trailing-space cell RED (and reach no consumer); NFD, `ſ` and case spellings in PLAN.md → `in-plan-files`, in another feature → `claimed-elsewhere`; exact spellings stay GREEN.
- `pharn/floor/ac-gate-core.mjs` — an unreadable SPEC pin is `ac-tests-modified` (D2, Q3).
- `pharn/floor/ac-gate-core.test.mjs` — that reason; the appended-pin bootstrap SPEC is no longer a bootstrap PASS.
- `pharn/floor/check-regress.test.mjs` — ★ the closed JSON-artifact classification ↔ `.prettierignore` (D6).
- `pharn/floor/run-gates.test.mjs` — (amended during build) its hand-kept `FLOOR_MODULES` becomes an import closure, see "Amended during build".
- `pharn/pharn-contracts/ac-tests.md` — the mapping regex, byte-identical cells, the fold, the lock's cleaned `files`, the last-wins reader, the AC-gate row.
- `.claude/commands/pharn-test.md` — the fold bound on "the build cannot write an AC test file" (D7).
- `.prettierignore` — `AC-TESTS.lock.json`, `assignments.json`, `findings.json` under `pharn/features/*/` (D6, Q2).
- `CHANGELOG.md` — `[6.20.4]`.
- `SKILLS_VERSION` — 6.20.4.
- `README.md` — the version badge; the generated inventory only if `docs:generate` rewrites it — generated.
- `docs/capabilities/README.md` — only if `docs:generate` rewrites it — generated.
- `.dev/features/ac-tests-agreement/PLAN.md` — this plan.
- `.dev/features/ac-tests-agreement/GRILL.md` — the grill.
- `.dev/features/ac-tests-agreement/BUILD.md` — the build record.
- `.dev/features/ac-tests-agreement/REGRESSION.md` — the regress record.
- `.dev/features/ac-tests-agreement/regression-report.json` — the regress verdict.
- `.dev/features/ac-tests-agreement/VERIFY.md` — the verify record.
- `.dev/features/ac-tests-agreement/verify-report.json` — the verify verdict.
- `.dev/features/ac-tests-agreement/REVIEW.md` — the review.
- `.dev/features/ac-tests-agreement/SHIP.md` — the ship record.

## Contracts satisfied

- `pharn/pharn-contracts/ac-tests.md` — "The mapping", "The lock" and "The AC gate" sections are updated to
  the new rules (cited there, not restated here — P4).
- `pharn/pharn-contracts/spec-template.md` / `check-spec.mjs` — unchanged semantics: the SPEC's
  frontmatter reading (last-wins, quote before comment) becomes the single reading every consumer uses.

## Evals to write (P1)

- None: no `role:`-bearing capability changes. Every behaviour change is a floor checker, covered by the
  `*.test.mjs` regressions listed under `## Files` (each review repro becomes a suite test; the repros under
  the session scratchpad import the MAIN checkout and cannot exercise this branch).

## Guarantee audit (P0)

- "The lock, the bootstrap check and the AC gate read the pin check-spec approved" → **floor: enum-regex +
  content-hash**, and ONE implementation (`readField`), pinned by a behavioural parity test that EXECUTES
  both CLIs and a closure test over floor module sources. Bound: the closure is over two function NAMES; a
  differently named reader (e.g. the ship-briefing pair's `stripQuotes`) is not ranged over — those read
  other artifacts and are out of scope, stated.
- "Nothing in the floor REDs a duplicated frontmatter key" → **still true after this increment**, stated:
  the fix is agreement (last-wins everywhere), not refusal. Refusing duplicates would change what
  `check-spec` admits and is not this increment (P7).
- "The lock pins the path the setter scopes" → **floor**: `clean` / `isConcrete` are imported from
  `plan-files-core.mjs`, which is held to the setter by its existing parity tests; no second derivation.
- "Each mapping consumer receives exactly the scoped path" → **floor: enum-regex** — byte equality in the
  checker; `MAPPING_RE` in the shared core refuses edge whitespace for every consumer. Bound: `acRowsOf`
  does not itself re-check cell ∈ `## Files`; a caller that skips `check-ac-tests.mjs` (and
  `check-test-stage.mjs`, which shells it) is not covered — unchanged from today.
- "The build cannot write an AC test file" → **floor: hook + enum-regex**, now under NFC + full case
  folding. Bound (D7): only the fold's equivalence is modelled; the claim holds for the PLAN.md checked.
- "`AC-TESTS.lock.json` never reddens this repo's `format:check`" → **floor: `.prettierignore` membership,
  pinned by a closed-classification test**. Bound: `.prettierignore` is repo meta and does not ship; a
  USER's own formatter gate over `pharn/features/` is not covered by this increment (stated in the
  CHANGELOG entry, not fixed — no user failure reported, P7).

## Trust audit (P2)

- AC-TESTS.md, SPEC.md and PLAN.md are untrusted DATA. The reader only extracts two scalars and the
  `## Files` / `## Mapping` paths; nothing is echoed beyond bounded ids/paths (unchanged). The new
  `unlisted-file` detail quotes the cell and the listed entry through the checker's existing `shown()`
  bound. No new taint path.

## Determinism audit (P5)

- Every new branch is a membership / equality test: last-wins key match, `isConcrete`, byte equality of a
  cell against the cleaned list, a folded-key set lookup, `.prettierignore` line membership. No LLM branch.

## Applied lessons

- L23 — the lock is a machine-written artifact inside the tree a stage's own whole-repo `format:check`
  covers; it is exempted in the gate's config (`.prettierignore`), and `assignments.json` / `findings.json`
  are listed on the same reasoning before a first FAIL finds them.
- L29 — "every machine-written JSON pipeline artifact is prettier-exempt" is quantified over a set, so the
  deliverable is the enumeration: `PIPELINE_ARTIFACTS`' `.json` members, parsed from source, each
  classified in one closed map the test iterates — not a line added for the lock alone.
- L35 — the frontmatter value reader is stored three times; the two existing private copies are retired
  into `frontmatter-core.mjs` rather than bound by a sync check (Q1 asks before doing it).
- L52 — each regression test names its set: the reader's consumers (check-spec, check-plan-spec-agree,
  ac-tests-lock — all three exercised), the fold's variants (case, NFD, `ſ`), both edge-whitespace sides of
  a cell, and both bootstrap and test-first paths of finding 1.

## Open questions (HALT)

- None. Q1, Q2 and Q3 were resolved at GATE 1 (below).

## GATE 1 — delegated decision (recorded 2026-09-25)

GATE 1 was decided by the orchestrating session under the user's delegation (2026-09-24: "fix all findings
… each fix needs to be fixed by using pharn-dev-ship command and needs to ends by merged pull request. you
merge pull requests when the CI are green."). It is a MODEL decision made under that delegation, not a
human approval. Its reply: "GATE 1 approved for group A (ac-tests-agreement). Answers: Q1 yes, Q2 yes, Q3
yes."

- **Q1 — yes:** retire the two private `readValue` copies into `frontmatter-core.mjs`, moved
  byte-for-byte; `check-spec.mjs` and `check-plan-spec-agree.mjs` behave exactly as before and every
  existing test of theirs passes unchanged; the CHANGELOG says the refactor preserves behaviour. (The
  orchestrator notes the parallel `check-spec.mjs` fix starts from `main` after this merges, so there is
  no parallel conflict there.)
- **Q2 — yes:** `assignments.json` and `findings.json` join `AC-TESTS.lock.json` in `.prettierignore`.
- **Q3 — yes:** an unreadable SPEC pin is `ac-tests-modified`; the `ac-gate-core.mjs` edit stays local to
  the `readSpecFacts` comparison and the header, whose "does NOT re-check that the SPEC is still Approved"
  sentence is rewritten to the new, truthful bound; a test covers it.
- **Also:** the CHANGELOG section is dated 2026-09-25; `pharn-test.md`'s "the build cannot write an AC test
  file … up to this fold" wording stays exact and advisory where it is advisory (P0).

## Amended during build (2026-09-25)

- **`pharn/floor/run-gates.test.mjs` added to `## Files`.** D5 makes `ac-tests-core.mjs` import `foldName` from
  `spec-template-core.mjs`, which imports `frontmatter-core.mjs`, so both join `run-gates.mjs`'s import closure. The
  ★ WIRING test that copies the floor into a scratch repo kept a HAND list of modules and failed with the pinned head
  init exiting 1 — a missing module crashes the shelled child. `check-loop-fresh.test.mjs` already replaced the same
  kind of hand list with an import closure after it went stale twice (its own comment cites L29); this is the third
  occurrence of the pattern, so the list becomes explicit ROOTS with the closure DERIVED from their imports, rather
  than two more names typed in. Test-only (no bump). The scope was re-set from this plan and recorded on the open
  reconciliation epoch with `reconcile-baseline.mjs --amend-scope`.
- **Renumbered to 6.20.5 after a rebase (2026-09-25).** The parallel `verify-ac-gate-fixes` increment (#267) merged
  first as 6.20.4. This branch was rebased onto it (only `CHANGELOG.md` conflicted), and its section, `SKILLS_VERSION`,
  the badge and this branch's own "6.20.4" stamps in code, tests and the contract became 6.20.5. The stamps were
  rewritten only on lines this branch added, so #267's text is untouched. A fresh reconciliation epoch was anchored at
  the conflict stop, before any resolution edit, so those edits are reconciled at verify. The earlier sections of this
  plan keep the number they were written with.
