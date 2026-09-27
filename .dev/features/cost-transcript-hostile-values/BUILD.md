# BUILD — cost-transcript-hostile-values

- Plan: `.dev/features/cost-transcript-hostile-values/PLAN.md` — open questions none; spec pin
  `4950796f5342df20a298fe22812e45dec3c15317592bd2358a31e149d2dc1c7f` re-hashed at Step 1: **MATCH**.
- Base: `main` at `b9b6a03` (6.24.1). `origin/main` was still `b9b6a03` when the build started. PR #280 is open and
  `CONFLICTING` (GRILL R2-G5).
- Writes-scope: 21 paths from the plan's `## Files`, set by `set-writes-scope.cjs --from-plan` and anchored
  (`reconcile-baseline.mjs --anchor --by pharn-dev-build`, 2,356 paths) before the first write.
- `SKILLS_VERSION` 6.24.1 → 6.24.2 (PATCH). `MIN_CLI` untouched.

## What landed

- **`pharn/floor/cost-value-core.mjs` (new).** It holds `IDENTITY_MAX` and `ABS_PATH_RE`, moved byte-for-byte from
  the ledger emitter, and the two predicates `isIdentityToken` and `isTokenCount`. Its one import is `cleanScalar`
  from `mark-phase.mjs`, which has no import-time side effects (checked: it loads with ten exports and runs nothing).
- **`transcript-core.mjs`.** `sessionRequests()` now admits a line only with a plain-object usage and an id
  `isIdentityToken` admits, and `outputRank` ranks by `isTokenCount`. The anchored selection line is byte-identical,
  so the three mutant controls that anchor on it still resolve. The NAMED RESIDUAL paragraph is replaced by the rule
  and its bound (L33).
- **`render-cost-record.mjs`.** Its model and stage keys are tested, `fold()` adds only admitted counts, and the
  window takes only a timestamp `tsMs` parses. The window is still ordered by the string, as the ledger's is
  (R2-G10).
- **`render-cost-ledger.mjs`.** The `String()` coercions are gone, and `session_id` and `version` are bounded.
  Membership keeps HEAD's session value (R2-G7). `normalizeTokens(u, n, dropped)` validates its arguments. It gains
  `USAGE_MAX_DEPTH` and `isUsageKey`, and the `usage` copy's depth and key bounds (`__proto__` refused, R2-G9). The
  `mark-phase.mjs` import line is unchanged (R2-G5).
- **`check-cost-ledger.mjs`.**
  - The new rules: usage depth and keys; rule 3 on `request_id`, `session_id`, `sessions[]` and
    `claude_code_versions[]`; `isTokenCount` counts; a typed `stage`/`iteration`; and the document depth probe.
  - `shown()`/`keyText()`/`tokenText()` at every file-derived value, and bounded lists.
  - The arithmetic marker-completeness count, the RULE 6 gate, and the `--verify-transcript` preconditions.
  - The exit-2 backstop and the `process.exitCode` ending.
- **`quote-core.mjs`, `test-results-formats.mjs`, `test-results-core.mjs`.** `shown`/`SHOWN_CHARS` move
  byte-for-byte to `quote-core.mjs`, with no re-export (R2-G6).
- **Contracts.**
  - `cost-ledger.md` gets the field-table rows, "Which transcript lines are requests…" with the `dropped[]`
    vocabulary, the compatibility note (`/1` promise narrowed to what `/2` added), and rules 2, 3, 7 and 8.
  - It also gets the checker's totality statement with its bounds, and two named residuals.
  - `ship-record.md` gets the silent refusals in the `cost` block.
- **Tests.**
  - New files: `cost-hostile-input.test.mjs` (41 tests) and `cost-value-core.test.mjs` (6).
  - Edits: `transcript-core.test.mjs` (`mutantCore()` copies the floor), `check-cost-ledger.test.mjs` (three edits,
    see Deviations), `test-results-core.test.mjs`, `render-cost-ledger.test.mjs` and `render-regression.test.mjs`
    (import lines).
- **Repo meta.** The CHANGELOG `[6.24.2]` section goes above `[6.24.1]`. The README badge moves, and
  `npm run docs:generate` moves the generated floor count 88 → 89, a declared Bash write. It rewrote the 37
  `docs/capabilities/` files byte-identical, so git shows no change there.

## Deviations from the plan, each stated

1. **`## Files` parse, before any write.** Two nested bullets in the check-cost-ledger entry started with a backtick
   (`` `stage` `` and `` `name` ``), so the setter read them as paths. I released the scope, reworded the two
   bullets, set the scope again (21 paths) and re-anchored. No build write had happened.
2. **`check-cost-ledger.test.mjs` got a third edit.** The plan names two. The test "REDs a class that must match
   exactly" decremented each non-growing class by 1. `req_fx_plain`'s `cache_write_5m` is 0 in the fixture, so it
   became −1, which the new token rule now REDs on its own. A class at 0 now steps UP by 1 instead. That is still a
   difference in a class that must match exactly, and the RED it asserts is unchanged.
3. **One planned control could not fail against the planned tests.** "`outputRank` back to `Number.isFinite`" had no
   killer: every test-4 scenario has one line per request, so the rank never compares two lines. Added test
   "4 ★ the per-request selection ranks only by an admitted count" (a request whose later line carries a finite,
   larger, refused count: `9.5`, `2^53`, `1e300`). It kills M4.
4. **The ✎ FORGERY CLOSURE walks every node, not every string node.** The first control run found M19 (a raw
   interpolation of `totals.requests`) caught by tests 10 and PINNED SITES, but not by test 11. The grill's own
   vector was a forged string at that NUMBER node, which a string-only walk never visits. Widened. It now kills M19.
5. **Step 2b ran through a node runner.** It read `.pharn/writes-scope.json` and passed the exact paths to prettier,
   `markdownlint-cli2 --no-globs --fix` and eslint as argv arrays. The pinned `xargs` pipeline was not used, because
   this isolated worktree refuses that shell form. The three gates and the path set are the same.

## Floor and gates (this build)

| check                                                                                                                    | result                                          |
| ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| `node pharn/floor/validate.mjs .`                                                                                        | GREEN — 36 capabilities                         |
| `npm test` (before deviations 3 and 4)                                                                                   | 3,650 / 3,650 pass, 0 fail                      |
| `node --test pharn/floor/cost-hostile-input.test.mjs` (after them)                                                       | 41 / 41 pass                                    |
| `format:check`, `lint`, `lint:md`, `docs:check`, `check:markers`, `check:badge`, `check:changelog`, `check:contributing` | exit 0 each                                     |
| `check-plan-lessons.mjs` on the plan                                                                                     | GREEN — 15 cited ids resolve and are referenced |

The re-run of the whole suite after deviations 3 and 4 is `/pharn-dev-verify`'s `test` gate.

## L60 negative controls (run once, scratch copy of `pharn/floor/`, never the worktree)

Each mutant is one anchored replacement that occurs exactly once. It is applied to a copy, the named test file(s) run
there, and the copy is restored. The unmutated copy is GREEN first (41 + 6 tests). The result is **31 / 31 killed**.

| id   | mutant                                                          | killed by                                                                                           |
| ---- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| M1   | `sessionRequests()` id test back to `!id`                       | 4 (the resolved id), 6, 8                                                                           |
| M2   | id test without the path/length bound                           | 4 (the resolved id), 8                                                                              |
| M3   | usage test back to `!u`                                         | 4 (the usage root)                                                                                  |
| M4   | `outputRank` back to `Number.isFinite`                          | 4 ★ the per-request selection (deviation 3)                                                         |
| M5a  | record: model key from the raw value                            | 4 (the model), 8                                                                                    |
| M5b  | record: stage key from the raw value                            | 4 (attributionSkill), 8                                                                             |
| M6   | record: `fold()` back to `?? 0`                                 | 4 (the counts), 8                                                                                   |
| M7   | record: window from any timestamp string                        | 4 (timestamp)                                                                                       |
| M8   | `isTokenCount` → `Number.isFinite`                              | 4 (the counts); cost-value-core `isTokenCount`                                                      |
| M9   | `isTokenCount` → `typeof v === "number"`                        | 4 (the counts); cost-value-core `isTokenCount`                                                      |
| M10  | `isIdentityToken` without the path test                         | 4 (the resolved id), 8; cost-value-core                                                             |
| M11  | ledger: `String(model)` restored                                | 4 (the model), 8                                                                                    |
| M12a | ledger: `session_id` copied raw                                 | 4 (sessionId), 8                                                                                    |
| M12b | ledger: `version` copied raw                                    | 4 (version), 8                                                                                      |
| M13  | ledger: membership read from the bounded session                | 15                                                                                                  |
| M14  | ledger: `normalizeTokens` zeroes without listing                | 4 (the counts)                                                                                      |
| M15  | ledger: no depth test in `sanitizeUsage`                        | 5 DEPTH                                                                                             |
| M16  | ledger: no key test in `sanitizeUsage`                          | 4 (a usage key)                                                                                     |
| M17  | ledger: `isUsageKey` admits `__proto__`                         | 4 (a usage key), 13                                                                                 |
| M18  | ledger: `normalizeTokens` argument check removed                | 9                                                                                                   |
| M19  | checker: `totals` quoted by a raw interpolation                 | 10 ★ LEDGER DOMAIN CLOSURE, 10 ★ PINNED SITES, 11 (after deviation 4)                               |
| M20  | checker: `keyText` returns the raw key                          | 11                                                                                                  |
| M21  | checker: no depth bound in `findAbsolutePaths`                  | 10 ★ LEDGER DOMAIN CLOSURE                                                                          |
| M22  | checker: the `sessions[]`/`claude_code_versions[]` rule deleted | 13                                                                                                  |
| M23  | checker: marker completeness enumerates `1..iterations` again   | 10 CLI right-typed extremes; 10 ★ PINNED SITES (the file aborts: heap exhausted under a 256 MB cap) |
| M24  | checker: RULE 6 without its shape gate                          | 10 ★ LEDGER DOMAIN CLOSURE, 10 ★ PINNED SITES                                                       |
| M25  | checker: `--verify-transcript` without its preconditions        | 10 ★ LEDGER DOMAIN CLOSURE, 11 (the two-node case)                                                  |
| M26  | checker: `main()` without the catch                             | 12                                                                                                  |
| M27  | checker: `process.exit(main(…))` restored                       | 14                                                                                                  |
| M28a | test: one count member deleted                                  | 3                                                                                                   |
| M28b | test: one member path misspelled                                | 2                                                                                                   |

M19 and M23 were re-run after deviation 4, as targeted runs (`--test-name-pattern`), so that each kill is
attributed to the named test rather than to an aborted file.

## Closure counts (what "every node" means here)

- **★ TRANSCRIPT DOMAIN CLOSURE:** shape A has 28 nodes and shape B 26, × 5 values = **270** renders, each read by the
  record, the ledger and the checker in both modes.
- **★ LEDGER DOMAIN CLOSURE:** the base ledger has 162 nodes, × 7 values × 2 modes = **2,268** `checkLedger` calls.
  The values are the two THROWING values, `null`, `"a\nb"`, raw `1e999`, `2^53` and a 20,000-deep array.
- **✎ FORGERY CLOSURE:** 161 nodes and 150 keys, each × 2 modes. Every renamed key reaches a message, quoted
  (asserted: 300 of 300).
- **Real data (from the second grill, not re-measured here):** 0 refused values over 115,666 local usage-bearing
  lines, and a maximum `usage` depth of 4.

## Sweeps (L50, L35, R2-G11)

- **The retired residual** ("a crafted non-string `requestId` or `message.model` makes a caller's `String()` coercion
  throw"): no shipped file states it any more. The `.dev/features/cost-dedup-completed-usage/` records keep it, as
  dated history.
- **Old homes.** No shipped file imports `ABS_PATH_RE`/`IDENTITY_MAX` from `render-cost-ledger.mjs`, or
  `shown`/`SHOWN_CHARS` from `test-results-formats.mjs`. The ✧ ONE ADDRESS test pins both.
- **`normalizeTokens`:** every call passes three arguments.
- **✧ ONE OWNER:** `message?.usage` and `requestId ??` appear in `transcript-core.mjs` only (grep over every non-test
  floor module). The new headers cite `sessionRequests()`.

## The grill's three forgery vectors, now pinned (R2-G4)

- `totals.requests` carrying a forged line → the ✎ FORGERY CLOSURE (every node), and M19 above.
- `membership.session: null` with a forged `sessions[0]` under `--verify-transcript` → the two-node test. The
  precondition refuses the session, and the CLI prints no line starting `GREEN — forged`.
- An unparseable file whose text carries the forged line → exit 2, with the parse error quoted through `shown()` and
  no stderr line starting `GREEN —`.

## Fix pass — 2026-09-27 (GATE 2 → fix, integrate, commit locally)

The sections above record the first build, as 6.24.2 on `b9b6a03`. This pass follows the maintainer's GATE 2 decision
(`PLAN.md` decisions 8–10, and the section "Fix pass").

### Integration, before the fixes

- The first build was committed as `df2e880`, and L64 was promoted as `18c12a4`.
- `origin/main` (`008b24b`, after #280 at 6.25.0 and #281 at 6.26.0) was merged in as `2c38d9a`:
  - four conflicts, all textual: CHANGELOG, README, SKILLS_VERSION, and the contract's field table;
  - every code file merged cleanly;
  - 56 added lines in 14 files renumbered from 6.24.2 to 6.26.1, found by diff;
  - the merged tree passed 439/439 in the cost suites and their neighbours before the merge was committed.
- The plan's spec pin moved to `d831d30d…`. #280's `ARCHITECTURE.md` change touches nothing here.
- The scope was set from the amended plan, and the epoch was re-anchored after the merge commit, so the merged files
  from `main` are not in this pass's reconciliation window.

### The review's findings, as built

- **R1.** The three universal sentences are narrowed to the bounds this release adds. `skills_version` and
  `window_start`/`_end` are relabelled ADVISORY in the field table.
- **R2.** `ship-record.md`, the emitter header and the CHANGELOG now say which refusals `cost.json` lists and which
  it does not. The L64 sweep, below, found the same claim in `render-cost-record.mjs`'s header as well, and it is
  fixed too.
- **R3.** "no C0 control character or DEL" is used in the CHANGELOG, contract rule 3, the field table, the Residual
  section, the checker's identity messages and header, and `cost-value-core.mjs`'s header.
- **R4.** New test 16. **R9.** New test 17, and `valText` replaces `tokenText` at every "(got …)" site.
- **R5.** The CHANGELOG's headline and forgery sentence carry their bounds.
- **R6.** The `outcome` row cites rule 5.
- **R7.** `quote-core.mjs`'s LOAD GRAPH names the modules that gained it. The claim was checked by computing each
  module's static import closure: `check-cost-ledger.mjs`, `test-results-formats.mjs`, `test-results-core.mjs`,
  `check-verify.mjs`, `check-red-run.mjs` and `loop-fresh-core.mjs` all now load `quote-core.mjs` and
  `loop-record-core.mjs`.
- **R8.** `transcript-core.mjs`'s BOUND, the CHANGELOG and the plan's trust audit name the id-reuse vector.

### L64, applied: every universal phrase in this increment's added prose, probed

A scan of the added lines of the CHANGELOG section, both contracts and every touched module header, for "every",
"each", "all", "any", "never", "only", "no longer", "whole" and "total", found these sentences wider than the code.
Each is narrowed:

- **CHANGELOG headline:** "no longer writes what its own checker REDs" → for the enumerated transcript values.
- **"Every transcript value is tested"** → "every transcript value the tooling reads", in the CHANGELOG, the contract,
  `ship-record.md` and `cost-value-core.mjs`.
- **"A present `requestId` that fails never falls back"** → "present and not `null`". A JSON `null` does fall back,
  because `??` reads it as absent. Fixed in the CHANGELOG, the contract and `transcript-core.mjs`.
- **"A refused field … is listed"** → the identity fields on a request, a version, a count, a `usage` leaf or key.
  The id is excluded, since a refused id makes the line not a request.
- **"Every string or object it prints goes through `shown()`"** → "each value quoted from the file", in the
  CHANGELOG, the contract and the checker header, with the one indirect case named: the re-derivation's WARN carries a
  session only after rule 3 admits it.
- **"An unforeseen error is exit 2" / "turns any unforeseen throw into exit 2"** → "while checking". A module that
  fails to load is outside it.
- **"A genuine transcript carries none"** → "no genuine transcript measured carries one".
- **"Each asserted property has a mutant"** → the negative controls cover one mutant per property the plan names.
- **`quote-core.mjs`'s consumer list** was stale after #281, which added `render-verify.mjs` and `stage-verify.mjs`.
  It now names the rule ("each module that imports this file") instead of a list.
- **`render-cost-record.mjs`'s "`cost.json` lists each one"** is the R2 claim the review had not listed.

### Negative controls for the new tests (scratch copy)

| id  | mutant                                          | killed by            |
| --- | ----------------------------------------------- | -------------------- |
| M29 | record: window compared as numbers (`tsMs`)     | 16 WINDOW ORDER (R4) |
| M30 | checker: `valText` quotes every value (`shown`) | 17 TYPED VALUES (R9) |

The unmutated copy passed both tests first. The total is 33 / 33 killed.

### Gates, this pass

- **Floor and read-only gates:** `validate` GREEN, and `format:check`, `lint`, `lint:md`, `docs:check`,
  `check:markers`, `check:badge`, `check:changelog` and `check:contributing` exit 0 each.
- **Cost suites:** 283 / 283 pass (cost-hostile-input with 43 tests, cost-value-core, check-cost-ledger, quote-core,
  test-results-core, transcript-core and both renderers).
- **The full suite** is `/pharn-dev-verify`'s `test` gate, run in this pass.

### Deviation: an importer that arrived with the merge

The first full-suite run of this pass gave 3,812 of 3,813: `pharn/floor/render-verify.test.mjs`, a file #281 added,
failed to load. It imports `ABS_PATH_RE` from `render-cost-ledger.mjs`, and that module has not exported it since this
increment moved it to `cost-value-core.mjs` with no re-export. The plan's importer sweep predates the merge, so it could
not see the file ([[L52]]: the set is every importer, and a merge adds members).

- The scope was released, the plan amended to declare the file (import line only) and re-set (22 paths). The widened
  scope was recorded on the open epoch with `reconcile-baseline.mjs --amend-scope`, not a re-anchor, so the epoch's
  earlier window stays in force.
- The import moved; the file passes 19 / 19.
- A re-sweep of the merged tree for any import of `ABS_PATH_RE`, `IDENTITY_MAX`, `shown` or `SHOWN_CHARS` from its old
  home found no other.

### Second iteration: the re-review's F1–F5

The focused re-review of this pass (`REVIEW.md`, "Re-review") confirmed six of R1–R9 fixed and three partly fixed. It
found five more sentences wider than the code, two of them blocking, all wording. Each is the L64 class again, now in
the fix pass's own replacement sentences: a sentence probed only over the inputs its author pictured.

- **F1.** `cost.json` covers only its run window, while the record reads the whole session. That is fixed in
  `ship-record.md`, the record's header, the emitter's header, the contract and the CHANGELOG. Each now says a refusal
  is listed only on a row. A refusal outside the window, or under an unknown one, is listed nowhere. `excluded_requests`
  counts an unparseable timestamp only under a known window, and is `null` under an unknown one.
- **F2.** The compatibility note now says "can now be RED", in the contract and the CHANGELOG. It names the case that
  stays GREEN: the old emitter's `String()` turned a number, boolean or plain object model or id into a well-formed
  token. Neither mode REDs such a model, and only `--verify-transcript` REDs such an id.
- **F3.** The membership recompute message, the outside-window ids and the view-row key print through `valText`. Test
  17 gains an assertion at each, and M30 still kills it.
- **F4.** `quote-core.mjs` states the load-graph rule rather than a list, with four examples checked by static import
  closure.
- **F5.** `transcript-core.mjs` states the all-lines-refused case: the earliest line is selected, and both renderers
  count that class as 0.
- **L64 on these sentences.** One more was found and tightened before handing off: "never read field by field" is
  wider than the code, which does read a non-member's model, timestamp and session before the membership test. It
  now reads "only counted, never emitted".

Gates after the iteration:

- The affected suites pass 245 / 245, and M29 and M30 are still killed.
- Formatting and lint are clean, `validate` is GREEN, and `docs:check`, `check:changelog` and `check:badge` exit 0.
- The full suite is `/pharn-dev-verify`'s `test` gate.

## Merge of `main` 6.27.0 (#283) — 2026-09-27 (Auto-fix)

The pull request (#282) was opened, and then conflicted when #283 merged to `main` as 6.27.0. The app's Auto-fix
reported it. This pass merges and renumbers, and changes nothing else in the increment.

- **Merge.** `origin/main` `c85be1b` was merged as `05ad264` with `git merge`: no rebase, no force-push. The plan's
  scope (22 paths) was set first, so each resolution below is a Write-tool edit under it.
- **Four conflicts, all textual:**
  - `SKILLS_VERSION` and the README badge: 6.27.1;
  - the README's generated floor count: 96 (#283 added three modules, this increment one), which `docs:check` confirms;
  - the CHANGELOG: this increment's section, renamed `[6.27.1]`, sits above #283's `[6.27.0]`, byte-for-byte `main`'s;
  - the contract's field table: this increment's table, plus #283's `markers[].route` row.
- **Every code file merged cleanly,** including #283's `route` in `render-cost-ledger.mjs` and its tests. Read against
  this increment:
  - `isRouteToken` tests the type before its regex, so `normalizeMarkers` stays total over a crafted `route`, in the
    emitter and in the checker's membership recompute;
  - #283's contract sentence on the checker's "per-marker rule" still holds: the marker-object RED it leaves out was
    already on `main`.
- **Renumber.** 66 lines in 16 files named 6.26.1 before the merge, and the same 66 name 6.27.1 after it: three in the
  conflict hunks (the `SKILLS_VERSION` line, the badge and the CHANGELOG heading), and 63 in 14 files by replacement.
  `main` never had a 6.26.1, so every occurrence was this increment's. The merge commit's message says 65 lines in 14
  files; the count here is the exact one. The feature records keep their history.
- **Importer sweep ([[L52]]).** Outside files this increment already changed, whose merged versions are this branch's,
  `main`'s tree has no import of `ABS_PATH_RE`, `IDENTITY_MAX`, `shown` or `SHOWN_CHARS` from an old home, and no
  `normalizeTokens` call at the old arity.
- **One test change.** The scratch stage-start marker in `cost-hostile-input.test.mjs` carries `route: "agent:opus"`, so
  the ledger walks (tests 10 and 11) reach #283's field, and test 10 asserts that the walk reaches `markers[].route`.
- **Gates on the merged tree, before the commit:**
  - the cost and routing suites pass 349 / 349;
  - `format:check`, `lint`, `lint:md`, `docs:check`, `check:markers`, `check:badge`, `check:changelog` and
    `check:contributing` exit 0, and `validate` is GREEN;
  - `npm test` passes 3,913 / 3,913.

  After the commit, `check:changelog-entry` is GREEN against `c85be1b`.

- **Epoch.** It was re-anchored after the merge commit (2,421 paths, under the plan's 22-path scope), as after
  `2c38d9a`, so the merge and its resolution are outside this pass's reconciliation window.

## Merge of `main` 6.28.0 (#284) — 2026-09-27 (Auto-fix, again)

Soon after the previous merge was pushed, #284 merged to `main` as 6.28.0, and #282 conflicted again. Auto-fix reported
it. This pass merges, renumbers, and corrects one rule citation.

- **Merge.** `origin/main` `b627409` was merged as `5c6a012`. The app's host-side sync refused for the same reason as
  before (the repository's origin is not confirmed with the app), so git ran with the sandbox off for that one command.
  The plan's scope was set first.
- **Three conflicts, all textual:**
  - `SKILLS_VERSION` and the README badge: 6.28.1;
  - the README's generated floor count: 100 (#284 added four modules, this increment one), which `docs:check` confirms;
  - the CHANGELOG: this increment's section, renamed `[6.28.1]`, sits above #284's `[6.28.0]`, byte-for-byte `main`'s.
- **One citation, corrected.** The contract merged cleanly, but #284's `STOP_GREEN_QUICK` sentence cites "rule 7" for
  the `outcome.decision` bound. On `main` the contract has rules 1–6, and that bound is rule 5; this increment adds a
  rule 7, about counts, so after the merge the sentence named the wrong rule. It now cites rule 5, as do a comment and
  an assertion message #280 left in `check-cost-ledger.test.mjs`, which the first merge carried in unnoticed. The
  CHANGELOG entry records the correction. The released `[6.28.0]` and earlier entries keep their wording.
- **Renumber.** 66 lines in 16 files named 6.27.1 before the merge, and the same 66 name 6.28.1 after it: three in the
  conflict hunks and 63 in 14 files by replacement. `main` never had a 6.27.1.
- **Importer sweep ([[L52]]).** `main`'s tree imports none of the moved names from an old home outside files this
  increment already changed. The only files #284 and this increment both changed are the three conflicted ones and
  the contract.
- **Gates on the merged tree, before the commit:** `format:check`, `lint`, `lint:md`, `docs:check`, `check:markers`,
  `check:badge`, `check:changelog` and `check:contributing` exit 0, `validate` is GREEN, and `npm test` passes
  4,056 / 4,056. After the commit, `check:changelog-entry` is GREEN against `b627409`.
- **Epoch.** It was re-anchored after the merge commit (2,441 paths, under the plan's 22-path scope), as before.
