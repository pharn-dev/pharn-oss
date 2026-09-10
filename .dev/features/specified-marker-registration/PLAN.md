# PLAN — specified-marker-registration

- spec_content_hash: bed2c2a58c113a374056ab23d2c74fe1a3395fa62be12e7a654e3b260552e299 # fix #4
- applied_lessons: [L1, L2, L4, L6, L19, L20, L29, L33, L34, L36, L37]
- increment: Register the four unguarded `(specified; ships with the guarded surface)` annotation
  classes in `.dev/floor/specified-primitives.json` (plus one missing site of an already-registered
  class), and add the missing markers to `pharn/pharn-contracts/finding-shape.md`, so every marker
  in the guarded doc set REDs in both drift directions.
- layer(s): build apparatus (`.dev/floor/`) + `pharn-contracts` (`finding-shape.md`) # pharn/ARCHITECTURE.md §4
- constitution_refs: [P0, P4, P6, P7]

## Applied lessons

- L1 — Meta-doc sweep run: this increment changes product-surface bytes, so `SKILLS_VERSION`,
  `README.md`'s shields badge and `CHANGELOG.md` are named in `## Files`. `CLAUDE.md` was checked and
  is deliberately NOT changed: its `check-specified-markers` block describes the checker's historical
  P7 trigger (the three primitives that surfaced it) and its mechanism, neither of which this
  increment alters — the registration set has never been enumerated there, so nothing goes stale.
- L2 — The contract's honesty travels with the artifact, not only with this PLAN: the bound is
  written INTO `finding-shape.md` as a `## Roster membership` note that cites the LIVE floor op
  (`pharn/floor/merge-findings.mjs`, read this run — its own comment says "NOT roster membership — no
  roster artifact exists"), never a spec'd one.
- L4 — An authored fixture passes by construction, so the new tests do not assert that today's
  manifest is green. They MUTATE the REAL manifest entries (real probe, real marker bytes) in a
  throwaway tree and assert the checker goes RED in each direction.
- L6 — The registration is a membership fact and goes in the STRUCTURED manifest; the tests read the
  registered id set from parsed JSON, never by grepping the checker's printed prose or doc text.
- L19 — Formatting is scoped to the files this increment touches (`npx prettier --write <paths>`),
  never `npm run format`. `npm run docs:generate` is a Bash write outside the fix #7 gate; discovery
  shows the CURRENT-STATE region counts contracts (6) and `pharn/floor` checkers (50), neither of
  which this increment changes, so it should be a no-op — but it is declared here rather than assumed,
  and `docs:check` is run to confirm.
- L20 — This increment IS L20's trigger fired. PR #186's remedy for these findings reduced to
  "remember to register the new markers", and the very same PR did not — the second occurrence. The
  remedy is therefore a manifest entry (a floor check), not another reminder.
- L29 — The remedy is quantified over a set ("each new registration, both directions"), so the
  ENUMERATION is the deliverable: one `NEW_REGISTRATIONS` array in the test file that every rule
  iterates, so a fifth entry added later is covered by every rule for free.
- L33 — The prompt's three findings were treated as a LOWER BOUND TO BEAT, not a set to confirm. A
  scan anchored on the shortest invariant substring (`ships with the guarded surface`) over the whole
  guarded doc set found two sites beyond those three: `pharn/ARCHITECTURE.md:167` (constitution
  injection — a fourth unregistered class) and `pharn/ARCHITECTURE.md:206` (a SECOND archetype-maps
  site, of an already-registered primitive). Leaving them would reproduce L33's exact defect — a
  repair pass that fixes one instance and leaves another in the file it named.
- L34 — Per-item assertions are vacuous over an empty domain, so the tests assert
  `NEW_REGISTRATIONS.length > 0` and that every id in it resolves in the real manifest; an emptied
  array cannot pass by having nothing to check.
- L36 — The presence set is made CLOSED, not per-member. THREAT-MODEL rows 65 and 69 carry the
  BYTE-IDENTICAL cell `content-hash _(specified; ships with the guarded surface)_`, so a per-row
  marker of just that cell would let one row's annotation be deleted while the other kept the check
  green. Each row's marker therefore spans from its row-distinctive left cell through the annotation,
  and a closure assertion requires every `specified_primitives` id in the real manifest to appear in
  the test enumeration — so a renamed or added entry fails rather than silently escaping coverage.
- L37 — Every claim here about what the new entries do is PROBED, not read off the manifest: the four
  probes were executed against the live tree this run (all four not-live), and both drift directions
  are executed per entry in the tests rather than argued from the checker's source.

## Files

- `.dev/floor/specified-primitives.json` — add four `specified_primitives` entries (`seam-record`,
  `community-privilege`, `rule_id-roster`, `constitution-injection`) and one missing `archetype-maps`
  site — layer build-apparatus
- `.dev/floor/check-specified-markers.test.mjs` — add the `NEW_REGISTRATIONS` enumeration + the
  both-directions mutation tests + the closure assertion — layer build-apparatus
- `pharn/pharn-contracts/finding-shape.md` — mark the two unmarked roster claims and add the bound
  note — layer pharn-contracts
- `SKILLS_VERSION` — 3.0.2 → 3.0.7 (assigned) — layer repo-meta
- `README.md` — shields badge 3.0.2 → 3.0.7 — layer repo-meta
- `CHANGELOG.md` — `[Unreleased]` entry — layer repo-meta

### Deliberately NOT written

- `pharn/CONSTITUTION.md`, `pharn/ARCHITECTURE.md`, `THREAT-MODEL.md`, `LIMITS.md` — hook-protected,
  human-only. Their marker bytes are read as-is and registered; none is edited.
- `CLAUDE.md` — see the L1 line above.
- `docs/capabilities/**`, `docs/lessons-index.md`, the README CURRENT-STATE region — generated;
  regenerated by `npm run docs:generate` if `docs:check` reds, never hand-edited.

## Contracts satisfied

- `pharn/pharn-contracts/finding-shape.md` — the increment amends this contract's `rule_id` row to
  state the bound the live implementation actually enforces; cited, not restated (P4).

## Evals to write (P1)

This increment adds no `role:`-bearing capability, so P1's eval obligation does not attach. The
apparatus obligation is the test suite, enumerated over the new registrations:

- each new registration → direction 1: materialize the entry's probe artifact in a throwaway tree
  with every marker intact → checker exits 1, message contains `IS NOW LIVE`
- each new registration, each site → direction 2: delete that ONE marker with the probe absent →
  checker exits 1, message contains `annotation is GONE` and names the site file
- closure → every `specified_primitives` id in the real manifest is in the test enumeration
- liveness → each new entry's probe is currently NOT live in the real repo (so today's GREEN is the
  `absent + present` steady state, not the `live + removed` one)
- integration → the real repo stays GREEN against the real manifest (the existing test, unchanged)

## Guarantee audit (P0)

- "the four newly registered annotation classes now RED in both drift directions" → **floor:
  enum-regex** (`check-specified-markers.mjs` primitive #3: file-existence probe + exact substring),
  wired in `npm run check` as `check:markers`.
- "the probe proves the primitive shipped" → **advisory / NARROWED.** The probe tests file EXISTENCE
  by name. A backstop implemented INSIDE an existing file — a new `validate.mjs` CHECK for
  `community-privilege`, `kind` handling added to an existing hook, a command that writes
  `seam-record.json` without a new floor checker — does NOT flip the probe, and direction 1 stays
  silent. This is the checker's already-stated existence-not-function bound; these entries inherit it
  and it is recorded in each entry's `$comment` rather than left for a reader to infer.
- "registration means the docs are true" → **STRUCK (P0).** The manifest is a hand-maintained address
  book. It cannot DISCOVER an overclaim; it holds the LISTED sites to their bytes. This wording goes
  into the CHANGELOG entry and the PR body verbatim, not just here.
- "`finding-shape.md` now states its roster bound" → **advisory** (prose). Nothing reads the note's
  meaning; the floor holds only its BYTES via the registered marker sites.
- "`SKILLS_VERSION` agrees with the README badge" → **floor: enum-regex**
  (`.dev/floor/check-version-badge.mjs`, wired as `check:badge`).
- "the constitution prefix / pre-egress / roster / seam-record primitives are absent today" →
  **floor: enum-regex** for the probe's verdict; the CLAIM that absence is correct is **advisory** —
  read live this run, not asserted from memory.

## Trust audit (P2)

No untrusted artifact is ingested. Every input is a trusted, human-reviewed repo file (the four
trusted docs, the manifest, the contract). Doc bytes are compared with `String.prototype.includes`
and never parsed, interpreted, or executed — the checker's existing posture, unchanged. No free text
steers a branch here.

## Determinism audit (P5)

- Registration is a static manifest edit; no branch is added.
- The checker's branches remain: probe existence (a filesystem membership test) and exact substring
  presence. Both are deterministic; neither consults a model.
- The tests branch only on the checker's exit code and on parsed JSON — never on printed prose.

## Open questions (HALT)

1. **Scope beyond the three commissioned findings.** The L33 sweep found two further unguarded sites
   (`pharn/ARCHITECTURE.md:167` constitution-injection; `pharn/ARCHITECTURE.md:206` a second
   archetype-maps site). Include them in this increment, or leave them for a follow-up?
2. **A residual this increment CANNOT fix.** `pharn/ARCHITECTURE.md:304` carries the unmarked twin of
   the `finding-shape.md:24` claim — `rule_id: "<P0..P7 | checker ID>" # MUST exist in the roster AND
have an eval (P1, P4)`. `pharn/ARCHITECTURE.md` is hook-protected and human-only, so the marker
   cannot be added by the agent and the site cannot be registered (registering an unmarked site is an
   immediate direction-2 RED). It is reported for a human to edit outside the agent loop.
3. **Probe placement is a judgment, and each has a stated miss.** `seam-record` probes
   `pharn/floor/*seam-record*`; `community-privilege` probes `.claude/hooks/*community*`;
   `rule_id-roster` probes `pharn/pharn-contracts/*roster*`; `constitution-injection` probes
   `.claude/hooks/*inject*`. Each follows the doc's own words about where the missing thing would
   live, and each misses an in-file implementation. Accept, or narrow/widen any of them?

## GATE 1 — plan acceptance (resolved)

**Who approved, and under what authority.** No interactive human sat on this run. The parent session
that commissioned the increment **explicitly delegated the approver role** to this agent for both
`/pharn-dev-ship` gates. This section records the delegation and the answers **because the delegation
does not make the approval floor-grade** — it remains what it always was, **ADVISORY** (P0): the floor
cannot verify that a human said yes, and a delegated yes is not a stronger signal than an undelegated
one. A human reviewing the resulting PR is the real gate; this record exists so that reviewer can see
exactly which judgment calls were made without one.

1. **Include the two extra sites — YES.** L33's remedy is explicit that a prior enumeration is a lower
   bound to beat, and its own recorded failure was a repair pass that corrected one site and left a
   second in the file it named. Excluding them would reproduce that defect inside the increment whose
   purpose is closing this class. Neither addition needs new machinery: `archetype-maps` gains a site
   on an entry that already exists, and `constitution-injection` is the same record shape as the other
   four.
2. **`pharn/ARCHITECTURE.md:304` — REPORTED, not fixed.** Confirmed as out of reach: the file is
   hook-protected. It is NOT registered, because registering a site whose marker is absent is an
   immediate direction-2 RED — the check would fail on a doc nobody had broken. It is carried to the
   PR body as the one edit this increment could not make, with the exact line named.
3. **Probes ACCEPTED as proposed, with the miss recorded per entry.** Each probe follows the doc's own
   words about where the missing artifact would live, and each was executed against the live tree this
   run (all four not-live — L37). The shared miss (an implementation landing INSIDE an existing file
   flips no filename probe) is written into each entry's `$comment`, not left for a reader to infer. A
   content-aware probe type would close it and is deliberately NOT built: P7 wants a real triggering
   failure, and there is none yet. It is carried as the named residual
   `specified-marker-in-file-probe`.
