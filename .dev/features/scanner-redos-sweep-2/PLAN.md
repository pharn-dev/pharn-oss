# PLAN — scanner-redos-sweep-2

- spec_content_hash: 2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e
- applied_lessons: [L24, L60, L74, L19]
- increment: make `scan-code-missing-timeout.mjs` and `scan-code-missing-error-handling.mjs` linear per file, with every regex unchanged and every finding on every input unchanged (the follow-up `scanner-redos-bounds` deferred at its GATE 1).
- layer(s): product floor (`pharn/floor/`), the scanners behind the `missing-timeout` and `missing-error-handling` lenses
- constitution_refs: [P0, P2, P5, P6, P7]

## Applied lessons

- L24 — the cost paragraph in each scanner header is re-derived from the new code's structure, not carried over; each ★ test is a membership verdict (completed vs killed under a `spawnSync` timeout) on a shape chosen to break the new form as well as the old one (unbalanced `(` / `{` runs, nested balanced calls and tries, many hits on one line, a long dotted chain after `await`), and every "(old: killed)" label is measured against the frozen 6.71.0 copy once and recorded in MEASUREMENTS.md.
- L74 — the oracle is a literal copy of the 6.71.0 `scanText` of each scanner (mask, template mask, `matchDelim`, `lineAt`, the regexes and loops), written into the test file; the test imports nothing from the scanners except the `scanText` under test, so the oracle shares no predicate with the new code.
- L60 — every property the new code re-derives gets its own negative control: a source-level mutant of the NEW scanner (written to a temp dir and imported) that breaks exactly that property must disagree with the oracle on the same corpus. Each mutant's replace anchor is asserted found before it is applied.
- L19 — formatting runs only on the files this plan names (`npx prettier --write <paths>`), never repo-wide.

## Discovery (live, at origin/main dd69efd5, SKILLS_VERSION 6.71.0)

- missing-timeout: per call, `matchDelim` scans to EOF on an unbalanced `(` (`fetch(`×N → O(N²)); `lineAt` counts from 0 per hit (O(hits × length)); nested balanced calls re-slice and re-test their args (`fetch(fetch(…))` → O(N²)). MEASUREMENTS of the earlier increment (§4): `fetch(`×N ×3.6 then ×5.4 per doubling.
- missing-error-handling: `matchDelim` to EOF per unbalanced `try {` (O(N²)); `guarded()` loops every range per hit; `lineAt` from 0 per hit; `HANDLED_RE` re-runs on the same long line per hit. Measured: `try{`×N ×2.9, `await x(`×N ×6.2 / ×5.6 per doubling.
- `CALL_RE`, `INDICATOR_RE`, `TRY_RE`, `AWAIT_RE`, `JSONPARSE_RE`, `HANDLED_RE`: each starts on a literal keyword at a word boundary, and the `\s*` / `[\w$.]+` runs after it backtrack at most once over their own run, so each regex is linear per file. `AWAIT_RE` on a long dotted chain with no `(` is measured at build, not assumed.
- No `.dev/guides/floor-*.md` section names these scanners (`grep -n scan-code .dev/guides/floor-*.md` is empty).

## Approach (each step proven equal to the old computation, then tested against it)

**missing-timeout.**

1. One forward pass over `masked` pairs every `(` with its `)` on a stack; a `)` that finds the stack empty is ignored. This equals the old per-open depth scan: a `)` that pops an empty stack has no open `(` to its left that could still be matched by it, and an open left on the stack at the end is exactly an open whose depth scan never returns to 0 (→ -1, skipped as before).
2. The indicator test: every `INDICATOR_RE` match is a whole maximal word run (each alternative is word characters bounded by `\b`), and the slice edges are the characters at `callOpen` / `callClose`, which are `(` / `)` or a template blank — non-word in both copies. So `INDICATOR_RE.test(slice)` is true iff some whole-word indicator match in `maskedForSuppression` starts in `[callOpen + 1, callClose)`. The match starts are precomputed once with the same alternation run global, and each call does one binary search.
3. `lineAt`: newline offsets of `masked` precomputed once; the line is 1 + the number of offsets below the index (binary search).

**missing-error-handling.**

1. One forward brace pass over `maskedForSuppression` (same stack argument), so an unbalanced `try {` costs O(1).
2. `guarded(p)`: the open ranges `(o, c)` are turned into integer intervals `[o + 1, c - 1]`, sorted and merged once; membership is one binary search. Same set of positions, so the same answer.
3. `lineAt` as above; the `HANDLED_RE` result is memoized per line (the regex is non-global, so a repeat test of the same line returns the same value).

**Output unchanged:** same `{found, hits}` shape, same hits, same sort, same dedup. No new signal, no cap.

## Tests

- New `pharn/floor/scan-code-missing-differential.test.mjs`: the two frozen 6.71.0 oracles; the corpus = every eval case of both lenses, every `.mjs` under `pharn/floor/`, hand-written near-misses (an unbalanced call before a balanced one, `fetch\n(`, nested tries with a guarded op after an inner close, a template `.catch(` / indicator, `timeoutMs` / `_signal` word-boundary misses) and seeded-PRNG fuzz documents over a token alphabet holding every call head, indicator token and near-miss word, `( ) { }`, `try {`, `await x(`, a dotted chain, `JSON.parse(`, `.catch(`, comment and quote openers, backticks and `${`, and newlines. ★ DIFFERENTIAL per scanner (non-vacuity: a minimum hit count, and minimum counts of unbalanced opens and of nested ranges in the corpus), ✧ CONTROL (the mutant harness with no edit agrees), ★ NEGATIVE CONTROLS: per property, a mutant that must disagree — timeout: unbalanced `(` paired to EOF; pairing over `maskedForSuppression`; indicator searched in `masked`; indicator without word boundaries; indicator range not bounded by `callClose`; the line taken at `callOpen`. Error handling: unbalanced `try {` given a range to EOF; `guarded` by the last-opened range only (no merge); `.catch` read from `masked`; the memo keyed by something coarser than the line.
- `scan-code-missing-timeout.test.mjs` / `scan-code-missing-error-handling.test.mjs`: ★ ReDoS rows, CLI under a 5 s `spawnSync` timeout, each with the expected verdict: `fetch(`×N, `fetch(`×N nested balanced, `fetch()`×N, `try{`×N unbalanced, `try{`×N nested balanced, `await x(`×N on one line, `await x(`×N inside one try, `await` + a long dotted chain with no `(`; each "(old: killed)" label only where the frozen copy is measured killed.

## Files

- `pharn/floor/scan-code-missing-timeout.mjs` — stack pairing, precomputed indicator starts, newline offsets; cost header re-derived — product floor
- `pharn/floor/scan-code-missing-error-handling.mjs` — brace stack, merged intervals, newline offsets, per-line `.catch` memo; cost header re-derived — product floor
- `pharn/floor/scan-code-missing-differential.test.mjs` — NEW: frozen-oracle differential + per-property mutant controls — test
- `pharn/floor/scan-code-missing-timeout.test.mjs` — ★ ReDoS rows — test
- `pharn/floor/scan-code-missing-error-handling.test.mjs` — ★ ReDoS rows — test
- `SKILLS_VERSION` — patch bump 6.71.0 → 6.71.1 (renumbered against origin/main at PR time) — repo-meta
- `CHANGELOG.md` — new `[6.71.1]` section, `### Fixed` — repo-meta
- `README.md` — version badge (`check:badge`) and anything `npm run docs:generate` regenerates — repo-meta / generated
- `docs/capabilities/**` — only if `npm run docs:generate` changes it — generated
- `.dev/features/scanner-redos-sweep-2/PLAN.md` — this plan
- `.dev/features/scanner-redos-sweep-2/GRILL.md` — grill artifact
- `.dev/features/scanner-redos-sweep-2/MEASUREMENTS.md` — before/after timings, the old-copy kill checks, the `AWAIT_RE` chain measurement
- `.dev/features/scanner-redos-sweep-2/REGRESSION.md` — regress artifact
- `.dev/features/scanner-redos-sweep-2/regression-report.json` — regress artifact
- `.dev/features/scanner-redos-sweep-2/VERIFY.md` — verify artifact
- `.dev/features/scanner-redos-sweep-2/verify-report.json` — verify artifact
- `.dev/features/scanner-redos-sweep-2/REVIEW.md` — review artifact
- `.dev/features/scanner-redos-sweep-2/SHIP.md` — ship roll-up

## Contracts satisfied

- `pharn/pharn-contracts/finding-shape.md` — unchanged: the scanners' stdout and the lenses' findings do not change.
- The scanner CLI contract (`pharn/floor/code-scanner-cli.mjs`, single and `--files` modes) — unchanged; `scanText` keeps its signature and stays stateless between calls.

## Evals to write (P1)

- No capability, rule or `rule_id` is added or changed. Both lenses' committed evals must pass unchanged, and the differential runs every one of their eval cases through old and new `scanText`.

## Guarantee audit (P0)

- "each scanner's verdict is identical to 6.71.0 on every input" → NOT a guarantee: advisory, backed by the equivalence arguments above plus the differential over a fixed corpus (evidence, not proof).
- "a scan completes on the ★ shapes within the timeout" → floor-grade test verdict (membership: completed vs killed), for those shapes only.
- "the scanners are linear per file" → a derived bound with its argument and measurements; advisory, never "guaranteed linear".
- The detection guarantees (regex / paren-match / membership, §2 primitive #3) and the template-mask injection immunity are unchanged: the same masks feed the same reads.

## Trust audit (P2)

- The input is untrusted code under review. Nothing new is read from it; only the cost of reading changes. The fix is P2 hardening: crafted input could stall the two lenses' floor sub-checks.

## Open questions (HALT)

- None. The approach is the one the orchestrator's discovery notes name (one-pass stack, precomputed indicator words + binary search, newline offsets, merged intervals, per-line memo).

## GATE 1 — model decision under the orchestrator's delegation (not a human approval)

- Approved by the model under the batch orchestrator's explicit delegation (2026-10-20 brief: "if your plan matches the discovery notes' approach … and has no open design question, approve it yourself"). The plan matches that approach and has no open question.
