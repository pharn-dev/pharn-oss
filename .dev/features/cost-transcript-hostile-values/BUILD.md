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
