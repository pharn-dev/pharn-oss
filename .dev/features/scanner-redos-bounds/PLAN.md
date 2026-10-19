# PLAN — scanner-redos-bounds

- spec_content_hash: 2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e
- applied_lessons: [L24, L55, L60, L74, L19]
- increment: make the injection, SSRF and path-traversal scanners linear per line (TST-2) and the N+1 scanner linear per file (TST-3), with the regex languages unchanged and every finding on every input unchanged.
- layer(s): product floor (`pharn/floor/`), the scanners behind four `pharn-review` lenses
- constitution_refs: [P0, P1, P2, P5, P6, P7]

## Applied lessons

- L24 — every bound in the four headers is re-derived from the new driver's structure, not carried across; each ★ test is a membership test (completed vs killed under a `spawnSync` timeout) on an input chosen to break the NEW form (many sinks, long chain, long identifier, many `(`), and each is shown to kill the 6.64.2 scanner.
- L55 — the new drivers re-derive what the regex engine decides (which sinks can still match), so they are probed against the engine itself: a differential test compares each new `scanText` with a frozen copy of the 6.64.2 one over fuzzed adversarial lines plus every lens eval case.
- L74 — the oracle shares no predicate with the code under test: it is a literal copy of the 6.64.2 regexes and loop, written into the test file, not imported from the scanner.
- L60 — each differential has negative controls: mutant span limits that over-skip (always line end; depth-counting parens) must diverge from the oracle, and oracle mutants on the N+1 edges (word-boundary start, interval endpoints) must too, so the corpus can falsify each property it is said to cover.
- L19 — formatting runs only on the files this plan names (`npx prettier --write <paths>`), never repo-wide.

## Discovery (live, at origin/main d5453a17, SKILLS_VERSION 6.64.2)

- Reproduced (`.pharn/scanner-redos-bounds/measure.mjs`, scanText in-process): `query(`×8000 1.0 s, `fetch(`×8000 0.9 s, `path.join(`×8000 1.5 s, `.sendFile(`×8000 1.5 s, `fs.a(`×8000 0.8 s, each ~4× per doubling. Also quadratic, not named by the audit: `.innerHTML=`×8000 (the html-injection pattern's `[^;]*?` span, 0.24 s, 4×).
- N+1: `a.`×16000 (32 KB) 2.75 s; a single 80 KB identifier 4.2 s (the same receiver-chain restart, mid-word); `(`×32000 87 ms → also quadratic (the `header` string re-tested by `LOOP_CALL_RE` at every `(`); `inLoop()` is O(intervals) per query hit, so O(n²) on many small loops.
- Sweep of all 18 scanners (`.pharn/scanner-redos-bounds/sweep.mjs`): two others are super-linear too — `scan-code-missing-error-handling.mjs` (`try{`×N 2.9×, `await x(`×N 6.2× per doubling) and `scan-code-missing-timeout.mjs` (`fetch(`×N 3.6×). NOT in this plan (see Open questions).
- The 6.58.1 crypto fix changed the regex, not a line cap; it is the model for the ★ test style (`spawnSync({timeout})`, membership verdict) only.

## Approach

**Injection / SSRF / path-traversal — keep every regex, skip only sinks proven to fail.** Each pattern is still its 6.64.2 regex, run sticky at a sink start. When it fails at sink end `p`, every later sink whose end lies in `[p, R(p)]` fails too, where `R(p)` is the first character the span cannot cross (the sink call's own outer `)` for `SPAN`; the next `;` for html-injection). Proof: a later sink's span reaches no further (`R(p2) ≤ R(p1)` for `p2 ≤ R(p1)`) and its first taint/source start is no earlier. So the driver resumes the sink search at `R(p)`. Every region is scanned O(1) times: O(line length) per pattern. `R` is computed by one forward scan (a `)` is crossable iff a `(` occurred since the previous crossable `)` or `p`). The driver and the two limit functions live in one new module, so the three scanners share one implementation; `SPAN` stays declared in each scanner (its ✧ PIN is kept).

**N+1 — three changes, the regexes' bytes unchanged.** (1) `QUERY_RE` runs sticky at each candidate start (`[A-Za-z_$]`); on failure the scan resumes after the greedy receiver chain from that start, because every start inside that chain fails too (a verb call ends its chain, so only the chain's last word can be the verb). (2) `header` becomes a start index: `LOOP_BRACE_HEADER_RE` tests the same slice, and `LOOP_CALL_RE` is replaced by an exact backward check (`\s*` · `forEach|map` · `\s*` · `.` from the end). (3) `inLoop()` reads a prefix-sum coverage array built once.

**Output unchanged:** same `{found,hits}` shape, same hits, no new signal. A per-line cap was considered and rejected: it changes the output contract (a new signal every consumer must handle) and drops findings on long lines.

## Files

- `pharn/floor/sink-span-core.mjs` — NEW: the sink-skip driver + `parenSpanLimit` / `semicolonSpanLimit` — product floor
- `pharn/floor/sink-span-core.test.mjs` — NEW: unit tests, the frozen-oracle differential over the three scanners, the over-skip negative controls — test
- `pharn/floor/scan-code-injection.mjs` — use the driver; ReDoS/cost header re-derived — product floor
- `pharn/floor/scan-code-ssrf.mjs` — same — product floor
- `pharn/floor/scan-code-path-traversal.mjs` — same — product floor
- `pharn/floor/scan-code-n-plus-one.mjs` — chain skip, header index, coverage array; cost header — product floor
- `pharn/floor/scan-code-injection.test.mjs` — ★ many-sinks ReDoS tests (CLI under timeout) + true-positive twins — test
- `pharn/floor/scan-code-ssrf.test.mjs` — same — test
- `pharn/floor/scan-code-path-traversal.test.mjs` — same — test
- `pharn/floor/scan-code-n-plus-one.test.mjs` — ★ long-chain / long-identifier / many-`(` / many-loops ReDoS tests + the frozen-oracle differential + oracle-mutant controls — test
- `SKILLS_VERSION` — patch bump: planned 6.64.2 → 6.64.3, renumbered to 6.65.1 after `main` released 6.64.3, 6.64.4 and 6.65.0 — repo-meta
- `CHANGELOG.md` — new `[6.65.1]` section (planned as `[6.64.3]`), `### Fixed` — repo-meta
- `README.md` — regenerated `## Current state` (floor checker count +1) via `npm run docs:generate` — generated
- `.dev/features/scanner-redos-bounds/PLAN.md` — this plan
- `.dev/features/scanner-redos-bounds/GRILL.md` — grill artifact
- `.dev/features/scanner-redos-bounds/MEASUREMENTS.md` — before/after timings, the sweep result
- `.dev/features/scanner-redos-bounds/REGRESSION.md` — regress artifact
- `.dev/features/scanner-redos-bounds/regression-report.json` — regress artifact
- `.dev/features/scanner-redos-bounds/VERIFY.md` — verify artifact
- `.dev/features/scanner-redos-bounds/verify-report.json` — verify artifact
- `.dev/features/scanner-redos-bounds/REVIEW.md` — review artifact
- `.dev/features/scanner-redos-bounds/SHIP.md` — ship roll-up

## Contracts satisfied

- `pharn/pharn-contracts/finding-shape.md` — unchanged: the scanners' stdout shape and the lenses' findings do not change.
- The scanner CLI contract (`pharn/floor/code-scanner-cli.mjs`, single and `--files` modes) — unchanged; `scanText` keeps its signature and stays stateless between calls (the batch ≡ single test covers it).

## Evals to write (P1)

- No capability, rule or `rule_id` is added or changed; the four lenses' committed evals must pass unchanged, and the differential runs every one of their eval cases through old and new `scanText`.

## Guarantee audit (P0)

- "each scanner's verdict is identical to 6.64.2 on every input" → NOT a guarantee. Advisory, backed by an argument (the skip lemma) plus the differential test over a fixed corpus; the corpus is evidence, not proof.
- "a scan completes on the ★ shapes within the timeout" → floor-grade test verdict (membership: completed vs killed), for those shapes only.
- "the scanners are linear per line / per file" → the derived bound, stated with its argument and measured; advisory, never "guaranteed linear".
- The scanners' detection guarantees (regex membership, §2 primitive #3) are unchanged.

## Trust audit (P2)

- The input is untrusted code under review. Nothing new is read from it except as data; the change only affects how long matching takes. The ReDoS fix is itself a P2 hardening: crafted input could stall a lens.

## Resolved at GATE 1 (a model decision under the maintainer's delegation, by the batch orchestrator — not a human approval)

- Q1 (resolved — defer): `scan-code-missing-error-handling.mjs` and `scan-code-missing-timeout.mjs`, also found super-linear by the sweep, are deferred to the named follow-up `scanner-redos-sweep-2`, recorded in the CHANGELOG "Not covered" and in MEASUREMENTS.md with the measured growth factors.
- Q2 (resolved — shared): one shared `pharn/floor/sink-span-core.mjs`; the `SPAN` copy-pair and its ✧ PIN stay.
- Grill (GRILL.md) folded in: the skip lemma's precondition on sink regexes (no `)` consumed; html: no `;`; one end per start) is written in the core header and exercised by the differential over every pattern of all three scanners; the old-scanner kill check is a one-time measurement recorded in MEASUREMENTS.md, not a suite property; the fuzz alphabet is named in the test.
