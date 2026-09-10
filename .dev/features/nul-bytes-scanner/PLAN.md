# PLAN — nul-bytes-scanner

- spec_content_hash: bed2c2a58c113a374056ab23d2c74fe1a3395fa62be12e7a654e3b260552e299 # fix #4
- applied_lessons: [L19, L20, L25, L26, L29, L34, L35, L36]
- increment: Replace the two raw NUL bytes in `pharn/floor/scan-code-missing-error-handling.mjs` with the sibling `String.fromCharCode(0)` convention, and make that convention enforceable with a floor-family guard test.
- layer(s): product floor (`pharn/floor/`) + build apparatus (`.dev/floor/`) — NOT a `pharn-*` capability layer; `pharn/ARCHITECTURE.md §4`'s layer tree governs the capability modules, and the floor sits beside it.
- constitution_refs: [P0, P3, P5, P6, P7]

## Applied lessons

- **L19** — a stage's Bash-run tooling escapes `writes:` scope, and repo-wide formatters are the live
  instance. Applied: every formatter invocation in this increment is scoped to the artifact just
  written (`npx prettier --write <that file>`), never `npm run format`. The one unavoidable
  Bash-escaping write — `npm run docs:generate`, if the catalog turns out to enumerate the new test
  file — is declared here rather than pretended into scope.
- **L20** — a promoted lesson whose only remedy is discipline WILL recur, and the second occurrence is
  the trigger to give it a floor check. Applied as the **P7 justification** for the guard test below:
  `pharn/floor/merge-findings.mjs:57-59` states the printable-ASCII convention in a comment, and
  `scan-code-missing-error-handling.mjs` is the **second site** of that convention and violated it. The
  trigger is met by an observed defect, not manufactured.
- **L25** — a rationale comment reaches only the file it sits in, and is trusted for the defects it does
  NOT name. Applied: this is L25's exact shape (a correct comment in `merge-findings.mjs`, a sibling
  that never saw it), so the remedy follows L25's own precedent — `.dev/floor/entry-point-guard.test.mjs`
  — and makes the rationale **enforceable** rather than writing a second, better comment.
- **L26** — a patch verified against a copy OUTSIDE the repo is verified under different rules than the
  repo enforces. Applied: the discovery sweep was run from an ad-hoc scratch probe, so it is treated as
  **discovery only**; the load-bearing verification is the committed in-repo test plus `npm run check`,
  which resolve config by path the way CI does.
- **L29** — when a remedy is quantified over a set, the ENUMERATION is the deliverable. Applied: the
  guard materializes its swept surface as one iterated list (`pharn/floor` + `.dev/floor`) and loops
  every rule over it, so a floor script added later is covered for free — rather than an assertion
  authored for the one file in front of me.
- **L34** — "for each X, assert P" says nothing when there are no X. Applied: the guard asserts its
  discovered script set is **non-empty** (an integer length test) before asserting anything per file, so
  a broken glob or a moved directory cannot certify by sweeping nothing.
- **L35** — when one fact is stored twice, the sync check is a third thing to keep in sync. Applied:
  `SKILLS_VERSION` and the README shields badge are exactly that pair, so both are updated in the same
  commit and `check:badge` is run as the confirming gate — not relied on to discover the miss later.
- **L36** — a per-member presence set is not a closed set; the enumeration certifies the spelling its
  author was looking at. Applied: the guard **discovers** its file list from the filesystem
  (`readdirSync`, sorted) instead of hardcoding member names, and tests the raw **byte** (`0x00`) rather
  than any textual spelling of it — so a NUL written by a different authoring route is still caught.

## Files

- `pharn/floor/scan-code-missing-error-handling.mjs` — replace the two raw NUL bytes (lines 314, 320)
  with a `const NUL = String.fromCharCode(0)` declaration + `${NUL}` interpolations; the produced key
  string is byte-identical — layer: product floor
- `.dev/floor/source-nul-guard.test.mjs` — NEW. Sweeps every non-test `.mjs` directly under
  `pharn/floor/` and `.dev/floor/` and REDs on any raw NUL byte; asserts the swept set is non-empty —
  layer: build apparatus (never shipped)
- `SKILLS_VERSION` — `3.0.2` → `3.0.4` (product-surface bytes changed) — layer: repo meta
- `README.md` — shields badge `pharn-3.0.2` → `pharn-3.0.4` — layer: repo meta
- `CHANGELOG.md` — one entry under `## [Unreleased]` → `### Fixed`, recording the fix and the bump —
  layer: repo meta

### Explicitly OUT of scope

- `pharn/floor/merge-findings.mjs` — already correct; it is the convention's source and is left
  byte-unchanged.
- `.claude/hooks/*.cjs`, `.claude/commands/**`, and every `*.md` — a third and fourth surface the guard
  does NOT sweep. Named as a bound below, not silently implied.
- Any widening of the guard to other control characters — no observed failure (P7).

## Contracts satisfied

- **None.** No contract in `pharn/pharn-contracts/` governs the source encoding of a floor script, and
  inventing one to fill this heading would be the speculative addition P7 forbids. The convention this
  increment enforces is stated in `pharn/floor/merge-findings.mjs:57-59` and is cited, not restated (P4).

## Evals to write (P1)

- **None, and the reason is structural, not an exemption.** P1 binds a **Capability** — a `.md` whose
  frontmatter carries `role:` — to `evals/cases/*` + `evals/expected/*`. This increment adds no
  capability and no `rule_id`: it repairs a floor script's source bytes and adds one apparatus test. The
  regression suite for the repaired file is its existing `pharn/floor/scan-code-missing-error-handling.test.mjs`
  (28 tests, measured green at baseline this run), which must still pass unchanged.

## Guarantee audit (P0)

- "No non-test `.mjs` directly under `pharn/floor/` or `.dev/floor/` contains a raw NUL byte" →
  **floor: enum-regex** (`ARCHITECTURE.md §2` primitive #3 — a byte-membership test over a
  filesystem-discovered set), run by `npm test` inside `npm run check` and by CI.
- "The swept set is non-empty, so the sweep cannot pass vacuously" → **floor: enum-regex** (integer
  length test — L34).
- "The scanner's observable behaviour is unchanged" → **advisory** as a general claim, **backstopped by
  floor**: the 28 committed tests re-run and must stay green. The tests pin the behaviours they cover,
  never all behaviour — the honest bound is that the dedup key's produced string is byte-identical by
  construction (`String.fromCharCode(0)` is the same code unit the raw byte encoded).
- "The shipped floor source is printable ASCII" → **NOT CLAIMED, and the narrowing is the point.** The
  guard tests exactly one byte value (`0x00`). Any other non-printable or non-ASCII byte passes
  untouched. Writing "the source is printable ASCII" would be precisely the "written in the contract"
  → "therefore guaranteed" disease.
- "The guard covers every file that ships" → **NOT CLAIMED.** It sweeps two directories, non-recursively,
  non-test `.mjs` only. The `.claude/` hooks and commands, every `.md`, and any nested subdirectory are
  outside it. Bound stated in the test header, not left to the reader.
- "`SKILLS_VERSION` agrees with the README badge" → **floor: enum-regex**, owned by the already-shipped
  `.dev/floor/check-version-badge.mjs` (`check:badge`). This increment adds no primitive here; it obeys
  an existing one.
- "`3.0.4` is the CORRECT version number" → **advisory.** It was assigned externally to avoid collision
  with sibling PRs. No checker knows the right number; `check:badge` only proves the two strings agree
  (its own stated bound).

## Trust audit (P2)

- **The increment ingests no untrusted artifact.** It edits a floor script and adds a test.
- **Taint flow in the edited region is unchanged, and is worth stating because the sibling's rationale is
  security-shaped.** In `merge-findings.mjs` the NUL separator defends a key built from _validated
  enum-gated fields_, where a control character could otherwise launder a collision. In this scanner the
  dedup key is built from `line` (an integer produced by `lineAt`) and `kind` (one of two internal
  literals — `unguarded-await` / `unguarded-json-parse`). **Neither operand is untrusted input, and the
  key never reaches output** — it lives and dies inside a local `Set`. The separator is therefore
  defensive, not load-bearing, and this change neither widens nor narrows the fence.
- The scanner's untrusted input (the scanned code file) reaches only `line`/`kind` classification, which
  this increment does not touch.

## Determinism audit (P5)

- The guard's only branch is `buffer.includes(0)` — a byte-membership test. No LLM classification, no
  heuristic, no fallback chain that could end in a guess.
- The file list is produced by `readdirSync` + a suffix membership test, **sorted**, so a failure message
  is filesystem-order-independent.
- Failures name every offending file and line; the terminal fallback is a RED handed to a human, never a
  repair attempt.

## Open questions (HALT)

- **Approver role for GATE 1 and GATE 2 — RESOLVED BY EXPLICIT DELEGATION, recorded rather than
  assumed (P6).** This run has no interactive human on the agent's side; the invoking session
  explicitly delegated the approver role at both `/pharn-dev-ship` gates to the agent for this
  increment. That delegation is **advisory** and the floor cannot verify it — recorded here so the
  audit trail does not misrepresent an agent self-approval as a human approval. Every deterministic
  gate in the chain is unaffected and still owns its own verdict.
- **Lessons-index freshness gate: GREEN this run** (`.dev/floor/check-lessons-index.mjs .` → exit 0,
  "docs/lessons-index.md matches the index recomputed from canon"), so the two-step sweep ran as
  specified and no fall-back-to-canon-in-full disclosure is owed.
- No other open question. The defect, its single repo-wide occurrence (1 file of 1666 tracked),
  the sibling convention, and the guard-test precedent were all read live this run.
