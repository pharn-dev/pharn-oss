# PLAN — cost-ledger-path-free-notes

- spec_content_hash: 2f8b92646bdf31d51169f46c74c14c10debdb456291fb0213be63cfc4d77e838
- applied_lessons: [L29, L41, L51, L52]
- increment: Stop `render-cost-ledger.mjs` from interpolating a local filesystem path into the `coverage_note` of an `unavailable` ledger, so an expected transcript absence yields a `cost.json` that `check-cost-ledger.mjs` accepts.
- layer(s): product floor (`pharn/floor/`)
- constitution_refs: [P0, P1, P6, P7]

## The defect (reproduced live this run, at `cd764cc`, 6.8.1)

`renderLedger()` has five `unavailable` branches. Two interpolate a local path into `coverage_note`:

- **no-dir** — `findTranscriptDirs()` returns zero hits → `` `no transcript found for session ${sessionId} under ${projectsDir}` ``
- **empty-selection** — exactly one hit, but the `transcriptFiles()` filter selects nothing (L51's guard) → `` `… under ${projectDir}` ``

The other three do not: **no-session** (`no session id available …`), **multi-dir** (a count, `resolves to N transcript directories`), **no-usage** (`carried no usage-bearing assistant records`).

Reproduction: CLI with `--projects-dir <scratch>/projects` and an absent session id → exit 0, `cost.json` written with
`"coverage_note": "no transcript found for session 0000…0001 under /private/tmp/…/projects"`, and `check-cost-ledger.mjs` → exit 1, `RED — absolute-path-shaped string(s) present: coverage_note = …`.

**P7 trigger:** a real failure — the emitter's own output fails the shipped checker on the ordinary "transcript not reachable" path (every `/pharn-loop` or `/pharn-ship` stop on a machine whose transcript lookup misses).

## Applied lessons

- L29 — the remedy is quantified over the set of `unavailable` branches, so the test ENUMERATES all five reachable branches in one array and every assertion (no `ABS_PATH_RE` hit anywhere, checker zero REDs, `unavailable` + empty requests + zero totals) iterates it — not a test for the two branches in front of me.
- L51 — the empty-selection guard is kept verbatim; only its message changes. The branch is reached through the existing `../decoy` boundary approach (stat and walk disagree), not a race or a production seam.
- L41 — the CLI's production path derives `projectsDir` from `CLAUDE_CONFIG_DIR`/`homedir()` when `--projects-dir` is absent, and every CLI test passes the flag. One CLI case sets `CLAUDE_CONFIG_DIR` to a scratch dir and omits `--projects-dir`, so the default derivation is exercised without touching real transcripts.
- L52 — the assertions target `render-cost-ledger.mjs` itself (the module that carries the defect), via both `renderLedger()` and the real CLI write path, not a neighbouring module.

## Files

- `pharn/floor/render-cost-ledger.mjs` — rewrite the two path-bearing `coverage_note` strings as path-free text that keeps the no-dir vs located-but-empty distinction — layer product floor
- `pharn/floor/render-cost-ledger.test.mjs` — regression tests A (no-dir), B (empty selection), C (CLI write path + default-derivation case), D (negative control), plus the L29 enumeration over all five unavailable branches — layer product floor (test; does not ship)
- `CHANGELOG.md` — one `### Fixed` entry under `[Unreleased]` recording the 6.8.1 → 6.8.2 bump — repo meta
- `SKILLS_VERSION` — 6.8.1 → 6.8.2 (patch: a correction to shipped product-floor bytes) — repo meta
- `README.md` — the shields badge only, 6.8.1 → 6.8.2 (`check-version-badge.mjs` pins it) — repo meta

## Design

- The two notes become, respectively: `no transcript found for session <id> under the configured projects directory` and `a transcript directory matched session <id>, but no transcript file under it was selected`. They name WHAT happened, not WHERE. No replacement identifier derived from the path (no hash, no basename) is added.
- `sessionId` stays interpolated: it is a caller-supplied id, not a path this emitter discovered, and changing how it is rendered is out of scope (see Limits).
- `unavailableLedger()`'s shape is untouched: `coverage: "unavailable"`, `requests: []`, zero totals, all other metadata as before. No schema, checker, `ABS_PATH_RE`, attribution, outcome or run-boundary change.
- `--stdout` output is the same JSON serialization; only the note text differs.

## Contracts satisfied

- `pharn/pharn-contracts/cost-ledger.md` — the existing rule that no string in the ledger matches the absolute-path regex; this makes the emitter honor it on the `unavailable` path instead of relying on the checker to reject it. The contract text does not change.

## Evals to write (P1)

No capability (`role:`) is added or changed, so no eval pair is owed. The floor checker changes and gets `*.test.mjs` cases:

- A: absolute temp `projectsDir`, synthetic UUID with no transcript → `unavailable`, `requests: []`, `totals.requests === 0`, every token class 0, serialized JSON excludes the temp path, `checkLedger()` → zero REDs. Must FAIL on the pre-fix code (the serialized-path assertion and the RED count).
- B: the `../decoy` staging → same assertions.
- C: CLI write to a temp `--repo` with explicit `--projects-dir` → exit 0, `cost.json` excludes the path, `check-cost-ledger.mjs <cost.json>` exits 0; plus a second case with `CLAUDE_CONFIG_DIR=<tmp>` and no `--projects-dir` (L41).
- D: an `unavailable` ledger whose `coverage_note` is replaced with a synthetic absolute path → `checkLedger()` reports the absolute-path RED.
- L29 enumeration: one table of the five branches (no-session, no-dir, multi-dir via a separator-bearing id, empty-selection, no-usage) → each is `unavailable`, has zero `ABS_PATH_RE` hits in any string, and has zero checker REDs.
- The existing successful-transcript tests (row count, determinism, no-abs-path over the real fixture, CLI write) are the unchanged-output control.

## Guarantee audit (P0)

- "an `unavailable` ledger from these five branches contains no absolute-path-shaped string" → floor: enum-regex, `ABS_PATH_RE` via `check-cost-ledger.mjs` rule 3, now also exercised on each branch by the tests. Bounded to the fixtures the tests build. It says nothing about caller-supplied values such as a hostile `--session`.
- "the emitter never writes a local path into `coverage_note`" → advisory in general, since it is a property of source text. It is pinned only for the five enumerated branches as they exist today.
- "the checker still rejects a path in `coverage_note`" → floor: enum-regex, and the negative control proves it is not vacuous.

## Trust audit (P2)

No new untrusted input is ingested. `sessionId` (caller argv/env) was already interpolated and remains so.

## Limits (stated, not fixed — out of scope by the request)

- A `sessionId` that is itself absolute-path-shaped (e.g. `--session /Users/x`) would still produce a note the checker rejects. That is hostile caller input, not a path the emitter introduced, and the brief excludes a general input audit.

## Open questions (HALT)

- none
