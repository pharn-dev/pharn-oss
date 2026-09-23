# PLAN — e2e-gate

- spec_content_hash: edc3d07df3ef76f983fe3763671eb66aa37c242f46f0e4c0fbca30ce091a5d2c
- applied_lessons: [L1, L29, L31, L34, L35, L36, L41, L52]
- increment: Give PHARN an e2e gate — discovered ONLY when the project has a `test:e2e` or `e2e` script, run by the same runner after `build` at `/pharn-verify`, never discovered at `/pharn-regress`, and yielding per-test results through item 01's core into its own results file.
- layer(s): the product floor (`gate-run-core.mjs`, `test-results-core.mjs`), pharn-contracts (`gate-run-record.md`, `test-results-record.md`), the product `.claude/` surface (`pharn-verify.md`, `pharn-regress.md`, `pharn-ship.md`), repo meta (README, CLAUDE.md, CHANGELOG, SKILLS_VERSION).
- constitution_refs: [P0, P3, P5, P6, P7]

## Correcting the record: the brief against the live repo (P6)

Measured this run on branch `e2e-gate` off `main` = `4db8eae` (`SKILLS_VERSION` 6.15.0, item 01 merged as #256).

1. **The allowlist prose has THREE copies in the commands, not two.** The brief names `/pharn-verify` and
   `/pharn-regress`; `pharn-ship.md:272` carries a third literal enumeration (describing the gate
   `/pharn-build` runs), and `pharn-verify.md:570` / `pharn-regress.md:441` repeat it inside each command's
   determinism audit. The ✧ parity test (`gate-run-core.test.mjs:214`) pins only the first brace-delimited
   copy in verify and regress. The ship copy is retired to a citation of `ALLOWLIST` (L35) rather than edited.
2. **`/pharn-build` does not run the allowlist.** Its Step 4 (`pharn-build.md:261-264`) runs "the user's `test` /
   `lint`" in prose; only `pharn-ship.md:272` describes it as allowlist discovery. This increment does not change
   what `/pharn-build` runs, and the retired ship copy stops implying it would now run e2e.
3. **Item 01's own suite pins the pre-item-02 gate set.** `test-results-core.test.mjs` asserts
   `RESULTS_GATES == ["test"]` and uses `{"test:e2e": "playwright-json"}` as its example of a key OUTSIDE the
   set. Both are correct for 6.15.0 and become wrong the moment this increment lands; they are updated here (the
   out-of-set example becomes `lint`), which is the only edit to an existing test.

## Inherited from item 01 — read from main, not re-decided

`.dev/features/test-results/PLAN.md` and `pharn/pharn-contracts/test-results-record.md`: the env var
`PHARN_TEST_RESULTS` (every gate, its own path); the file name rule `resultsFileName(seq, id)` (a `test:e2e`
gate writes `<seq>-test_e2e.test-results.json`); the store (raw file + `runs[].results_sha256`); the formats
(`playwright-json` covers Playwright, so there is no gap to stop on); the config key `testResults` keyed by gate
id, with keys restricted to `RESULTS_GATES`; the closed `RECORD_REASONS`; and the export
`testRecord({stamp, outDir, gateId, root})`. None of them changes shape here.

## Decisions for the options halt (approved under the overnight delegation — see SHIP.md)

a. **Script names → a closed `E2E_SET = ["test:e2e", "e2e"]`, appended to `ALLOWLIST`.** Both spellings are in
common use (`test:e2e` in create-vue/Nuxt/Vue CLI-style templates, `e2e` in many hand-rolled setups). **If a
project has both, both run as distinct gates** — the precedent is `typecheck` / `type-check`, which already
coexist in `ALLOWLIST` with no precedence rule. A precedence rule would be a second decision per project to get
wrong; running both costs time only in a project that defines both. Discovery stays a Set-membership test
(`discoverGates`: `ALLOWLIST.filter(id => Object.hasOwn(scripts, id))`).

b. **Order → after `build`, by the code.** `discoverGates` returns `ALLOWLIST` order and `orderEntries` keeps the
source order, then `structural:*` (sorted among themselves only), then `reconcile`. Nothing else sorts gates
(the only other `sort` is the regress head side's structural pairs, `run-gates.mjs:512`). A failing `build` does
not stop the e2e gate: every entry runs and a failing gate is DATA (`run-gates.mjs` header); the e2e gate's exit
is recorded and the verdict is computed over all of them.

c. **Stages → `/pharn-verify` only.** `resolveSet` drops `E2E_SET` from a DISCOVERED regress source, both sides
alike (the base side copies the head spec). Reasons: a base-side e2e run doubles an already expensive stage, and
the head-side e2e result is already a verify gate with an absolute threshold, so an e2e failure fails verify
whether or not it is a regression. **Bound, stated:** a regression that only an e2e test catches is not a
_regress_ finding; it is a _verify_ FAIL. An explicit `--gates` string is the user's choice and is never
filtered. A project whose ONLY discoverable scripts are e2e scripts gets `empty-source-set` at regress — its
existing no-gates HALT (or `/pharn-loop`'s S4), never a silent empty run.

d. **Timeout → one value.** `--timeout-ms` is per `run --next` call, i.e. per gate, so the e2e gate already gets
its own 540 s budget; no command changes. An e2e suite that needs longer than 540 s cannot be gated by this
runner — the same stated bound as any suite (`pharn-verify.md`, "--timeout-ms is required"), now named for e2e.
Starting servers and installing browsers stay the project script's job.

e. **Per-test results → `RESULTS_GATES = ["test", ...E2E_SET]`**, imported from `gate-run-core.mjs` (one copy of
the e2e ids). Same `not-configured` semantics as item 01 when the config names no format for the gate.

## Files

- `pharn/floor/gate-run-core.mjs` — `E2E_SET`; `ALLOWLIST` gains its members after `build`; `resolveSet` drops
  them from a discovered regress source; header notes — product floor
- `pharn/floor/run-gates.mjs` — `init` prints the `e2e_excluded` ids the regress rule dropped, so the drop is never
  silent (amended after review) — product floor
- `pharn/floor/gate-run-core.test.mjs` — the new tests below; the parity test unchanged in shape — floor test
  (apparatus)
- `pharn/floor/test-results-core.mjs` — `RESULTS_GATES` built from `E2E_SET` — product floor
- `pharn/floor/test-results-core.test.mjs` — `RESULTS_GATES` expectation and the out-of-set config example
  (correction 3), plus an e2e config case — floor test (apparatus)
- `pharn/floor/run-gates.test.mjs` — the end-to-end cases below — floor test (apparatus)
- `pharn/pharn-contracts/gate-run-record.md` — the e2e ids in the order/coverage rules and the regress exclusion —
  pharn-contracts
- `pharn/pharn-contracts/test-results-record.md` — `RESULTS_GATES` now names the e2e ids — pharn-contracts
- `.claude/commands/pharn-verify.md` — the allowlist enumerations (`:184`, `:570`) and an e2e note under 3a/3c —
  product command
- `.claude/commands/pharn-regress.md` — the allowlist enumerations (`:229`, `:441`) and the exclusion rule —
  product command
- `.claude/commands/pharn-loop.md` — the S4 no-gates row names the regress e2e exclusion (amended after review, L1) —
  product command
- `.claude/commands/pharn-ship.md` — `:272`'s literal copy retired to a citation (L35) — product command
- `README.md` — badge 6.15.0 → 6.16.0; the "Per-test results" subsection names the e2e gates; plus any
  `CURRENT-STATE` bytes `npm run docs:generate` rewrites (a Bash write, declared — L19) — repo meta
- `CLAUDE.md` — the per-test-results paragraph names the e2e gates — repo meta
- `SKILLS_VERSION` — 6.15.0 → 6.16.0 (MINOR: a new gate the product discovers). `MIN_CLI` stays 0.5.0 — repo meta
- `CHANGELOG.md` — `## [6.16.0] - <date>` above `[6.15.0]` — repo meta

### Not written by the build

- No protected path needs an edit: `pharn/ARCHITECTURE.md`, `LIMITS.md` and `THREAT-MODEL.md` never enumerate
  the gate allowlist (searched this run for `typecheck` / `type-check` / `allowlist`). No
  `PROTECTED-FOLLOWUPS.md` for this item.

## Evals to write (P1)

No Capability. The suite is the specification:

- **Absent → byte-identical:** every existing `resolveSet` / `discoverGates` / runner fixture (none has an e2e
  script) passes unchanged, and one new test asserts a manifest with every PRE-6.16 allowlist member resolves to
  exactly the pre-6.16 ids.
- **Present → discovered after `build`**, for each `E2E_SET` member (L52), and both together in `ALLOWLIST`
  order.
- **Regress excludes every `E2E_SET` member**, head and base alike; an e2e-only manifest at regress is
  `empty-source-set`; explicit `--gates` naming an e2e command is kept (control).
- **Runner end to end:** a repo with `test` and `test:e2e` scripts, each writing a real captured report into its
  own `PHARN_TEST_RESULTS`: two distinct results files, each gate's record derived through `testRecord` (vitest
  for `test`, Playwright for `test:e2e`), and the `test` gate's record unchanged by the e2e gate.
- **A failing e2e gate fails verify exactly like a failing `test` gate:** `check-verify.mjs --stamp` over the
  real stamp → `FAIL` with `failing_gates: ["test:e2e"]`.
- **Closure:** `E2E_SET ⊂ ALLOWLIST`, disjoint from `STYLE_SET` and `RESERVED_IDS`; `RESULTS_GATES` is exactly
  `test` plus `E2E_SET`.

## Guarantee audit (P0)

- "an e2e gate is discovered only when the script exists" → floor: enum/regex (Set membership in `discoverGates`).
- "it runs after `build`" → floor: the recorded `seq` order, checked by tests; the runner's order is fixed code.
- "regress never discovers it" → floor: membership filter in `resolveSet`, tested per member.
- "a failing e2e gate fails verify" → floor: `check-verify.mjs`'s absolute threshold over the stamp map (unchanged).
- "the e2e suite is correct / its servers started / browsers installed" → advisory; the project's script owns it.

## Trust audit (P2)

The e2e results file is project output exactly like the `test` gate's: untrusted DATA, handled by item 01's
core unchanged. No new input is read.

## Determinism audit (P5)

Discovery, ordering and the regress exclusion are membership tests over closed sets. No precedence judgment
between the two e2e spellings: both run when both exist.

## Applied lessons

- L1 — the meta-docs this changes are in `## Files`: the three commands' allowlist copies, both contracts,
  README, CLAUDE.md, CHANGELOG.
- L29 — `E2E_SET` is materialized once in `gate-run-core.mjs`; the regress exclusion, `RESULTS_GATES` and the
  tests iterate it.
- L31 — the ship command's third allowlist copy was the one nothing ranged over; it is retired instead of synced.
- L34 — an e2e-only regress source is refused as `empty-source-set` before injection, so the exclusion cannot
  leave a vacuous run.
- L35 — the ship copy becomes a citation; `RESULTS_GATES` imports `E2E_SET` rather than restating it.
- L36 — `E2E_SET` is closed and tested both ways against `ALLOWLIST`, `STYLE_SET` and `RESERVED_IDS`.
- L41 — no new parameter and no new default; the exclusion is a fixed rule, not a flag.
- L52 — every `E2E_SET` member is tested for discovery, order and regress exclusion.

## Open questions (HALT)

None. Decisions a–e are the options halt, approved under the overnight delegation (recorded in SHIP.md).

## Amended after review

- **`pharn-loop.md` added to `## Files`.** Its S4 row defines "no gates" as an empty allowlist ∩ scripts, and an
  e2e-only project now reaches S4 at regress with a non-empty intersection (review finding 3, L1).
- **`run-gates.mjs` added to `## Files`.** Review finding 6: the regress e2e exclusion left no trace. `resolveSet`
  now reports the dropped ids in its spec and `init` prints them as `e2e_excluded` (the stamp shape is untouched),
  so `/pharn-regress` renders them in REGRESSION.md from runner output, never from a model's reading of
  `package.json`.
