# PLAN — promote-dev-parity

- spec_content_hash: 69c8395365abb719cc3132ffa7a7607051b1e04ca3a3fa70ee563b86b857f18e # fix #4
- applied_lessons: [L2, L13, L19, L20, L22, L27, L29, L30, L31, L34, L36]
- increment: Port the five product-only gate hardenings (`SKILLS_VERSION` 2.2.4–2.2.8) into `/pharn-dev-memory-promote`, adapting each to the dev surface's deliberate divergences, and materialize the `*memory-promote` obligation set in `.dev/floor/command-hygiene.test.mjs` so the pair's gate obligations are enumerated in one place instead of assessed per-file.
- layer(s): n/a — build apparatus only (`.claude/commands/` + `.dev/floor/`); no `pharn/` capability layer is touched
- constitution_refs: [P0, P2, P4, P5, P6, P7]

## Applied lessons

- L2 — the honest-claim port is the instance: the two-clocks paragraph must be written **into the
  command artifact** (not merely reasoned here), and every floor op it cites — `check-provenance.mjs`,
  the fix #7 hook — was read live this run at `.dev/floor/check-provenance.mjs` and
  `.claude/hooks/enforce-writes-scope.cjs`, so no unbacked "enforced by" is imported.
- L13 — this plan and every artifact this increment writes get the stage's own scoped
  `prettier --write` + `markdownlint-cli2 --fix` before the halt; the deterministic style gate stays
  `/pharn-dev-verify`'s, which this increment does not touch.
- L19 — the ported write-channel mandate is scoped to `<canon-file>` **only**, precisely so it does not
  collide with Step 6b's `node .dev/floor/gen-lessons-index.mjs .`, which is a Bash write to a
  _different_, committed file and is already declared as an L19 escape. The plan adds one sentence
  naming that boundary rather than leaving a reader to infer it.
- L20 — this increment's P7 trigger. L31's own provenance (`dev-lessons-index-gate`) is the **first**
  occurrence of "the product half shipped it, the dev half shipped nothing" inside this very
  `*memory-promote` pair; the five missing hardenings are the **second**. A discipline-only remedy has
  now demonstrably recurred in the same pair, so the remedy here is an enumerated assertion, not a note.
- L22 — every ported step pins the **literal command line** (the hash pin, the hash compare, the title
  check, the runtime `date` capture), copied from the product command rather than described in prose,
  so the dev agent has nothing left to choose.
- L27 — the load-bearing non-port. The product's `commit` → `unknown` fallback is **unreachable** on the
  dev surface (`.dev/floor/check-provenance.mjs:66` `COMMIT_RE = /^[0-9a-f]{7,40}$/` rejects it, pinned
  at `.dev/floor/check-provenance.test.mjs:396`), so porting it would print a remedy that guarantees a
  Step-3 RED and trains a bypass. The dev fallback is HALT-and-ask, with the reason stated in the file.
- L29 — the deliverable is the **enumeration**: a single `PROMOTE_GATE_PARITY` array in
  `.dev/floor/command-hygiene.test.mjs` that the rules iterate, not eight hand-written assertions
  authored for whichever obligation was in front of me.
- L30 — the shape being repaired. The dev command today _names_ the Write-tool channel in one advisory
  formatting sub-section (`:250-253`) while its actual Step-6 append prescribes nothing — prose that
  reads as mechanized next to a step that invokes nothing. Every obligation this increment names in the
  dev command is one the dev command invokes or explicitly mandates.
- L31 — the direct diagnosis, and this increment is its third instance in the same pair: the
  `*memory-promote` copy-pair's **code** twins are pinned to agree by ✧ tests, while the pair's
  **command obligations** are enumerated nowhere, so "done" was assessed per-file and the dev half kept
  none of the five.
- L34 — the parity set must not certify itself vacuously: the enumeration gets a non-emptiness assertion
  (an explicit member count) plus a live-existence check over every command file it names, so a renamed
  command or a truncated array fails loudly instead of passing over an empty domain.
- L36 — presence is not closure. Each obligation is asserted **present in its own surface AND absent in
  the other's floor spelling**: a dev step invoking `pharn/floor/check-provenance.mjs` (or a product step
  invoking `.dev/floor/…`) is the exact paste error this pair invites, and a presence-only set would
  stay green through it.

## Files

- `.claude/commands/pharn-dev-memory-promote.md` — port the five hardenings, dev-adapted — layer n/a (build apparatus)
- `.dev/floor/command-hygiene.test.mjs` — add the materialized `PROMOTE_GATE_PARITY` obligation set + its iterating rules — layer n/a (build apparatus)

### Explicitly NOT written by this increment

- `.claude/commands/pharn-memory-promote.md` — the product twin is the reference; it is read, never edited.
- `SKILLS_VERSION` / `CHANGELOG.md` — apparatus-only change (a `pharn-dev-*` command + a `*.test.mjs`),
  so per CLAUDE.md's bump-triggering set neither bumps nor needs an entry.
- `.dev/floor/check-provenance.mjs` and its twin — **no floor checker changes**; this increment adds no
  new floor primitive and reuses the existing ones byte-for-byte.
- `pharn/**`, the four trusted docs, `CODEOWNERS`, `.claude/settings*.json`, `.claude/hooks/*.cjs`.

## Contracts satisfied

- `pharn/ARCHITECTURE.md §5` ("State") — promotion to canon is a **gated** action with **provenance per
  entry**; this increment brings the apparatus's own instance of that contract up to the gate procedure
  the product instance already runs. Cited, not restated (P4).
- `pharn/ARCHITECTURE.md §2` primitives #2 (content-hash) and #3 (enum/regex) — the ported TOCTOU pin
  reduces to #2; the ported title-shape and provenance-shape checks reduce to #3. Both primitives already
  exist; none is added.
- `LIMITS.md §1d` — the ported honest claim cites it for the boundary it already draws: invoking and
  obeying a checker is advisory orchestration, and the floor cannot verify a human said yes.

## The five ports, and each one's dev adaptation

| #     | Hardening (product)                                                                                                                                                  | Dev adaptation                                                                                                                                                                                                                                                                                                                     |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.2.4 | Step 1 pins canon SHA-256; Step 6 re-reads + compares + re-runs `check-provenance`                                                                                   | scratch path `.pharn/pharn-dev-memory-promote/canon-content-hash.txt`; checker `.dev/floor/check-provenance.mjs`. The missing-file branch (`sha256("")`) is **kept and reachable**: `.dev/memory-bank/pattern-library.md` does not exist yet (verified live) while dev `TARGET_ENUM` admits it.                                    |
| 2.2.5 | Step 6 canon write channel: mandate `Write`/`Edit`/`MultiEdit`; forbid shell redirection, Node `fs`, formatter auto-fix; blocked-write remedy; bootstrap via `Write` | scoped to `<canon-file>` only, with an added sentence naming Step 6b's `gen-lessons-index.mjs` Bash write as a _different_ file and therefore outside the mandate (L19). Bootstrap header matched to the live dev canon's own header style, read this run. The existing `:250-253` residue stays but stops being the only mention. |
| 2.2.6 | Step 3 validates `title` shape before any Markdown render                                                                                                            | ported verbatim except the candidate path. Genuinely load-bearing on dev: `.dev/floor/check-provenance.mjs:54` records that `title`/`body` are **IGNORED**, so today an untrusted multi-line or control-char title reaches a `## L<n> — <title>` heading in permanently-retained canon with no shape check at all.                 |
| 2.2.7 | Step 1 captures `feature`/`source`/`date` from live state; Step 2 forbids model-composed provenance                                                                  | `feature` derived from `.dev/features/<name>/…` (not `features/<name>/…`). **`commit` fallback is HALT-and-ask, NOT `unknown`** — see L27 above; the divergence and its pinning test are stated in the file so a future porter does not "complete" the parity by widening it.                                                      |
| 2.2.8 | two-clocks honest claim; Step 5 blocks `AskQuestion` until Step 3 GREEN                                                                                              | ported. Stated honestly as a _partial_ gap: the dev file already carries a two-clocks note inside its Guarantee audit (`:309-312`); what is missing is the top-level honest claim (`:56-59`, currently unconditional) and the Step-5 prerequisite.                                                                                 |

## Preserved divergences (must NOT be erased while porting)

- canon paths `.dev/memory-bank/` vs `memory-bank/`; checker `.dev/floor/` vs `pharn/floor/`
- scratch dir `.pharn/pharn-dev-memory-promote/` vs `.pharn/pharn-memory-promote/`
- **`commit` enum** — dev rejects `unknown`; terminal fallback is HALT-and-ask
- Step 6b — dev regenerates the **committed** `docs/lessons-index.md` (a skip is a loud repo-wide RED);
  product refreshes a **gitignored cache** (a skip degrades to `STALE`)
- `npx prettier` (dev) vs `vendor/bin/prettier` (product) — that was 2.2.3, **not** one of the five, and
  is deliberately left alone
- the dev `TYPE-ENUM:BEGIN/END` marker block and its `check-provenance.test.mjs` equality pin

## Out of scope — recorded follow-up, not built (P7)

- **`promote-nextid-branch-parity`** — a **sixth** asymmetry, deliberately not built here. The product's
  Step-2 next-id rule is a three-branch membership test with a HALT on a foreign id scheme; the dev
  command has a one-liner (`:170-172`). It shipped in the original 2.2.0 body, **not** in the five
  hardenings this increment ports, and the dev surface's canon is house-style **by construction** (the
  apparatus authored every entry), so branch 3 answers no observed failure here. Recorded so the absence
  reads as a decision rather than an oversight.

## Evals to write (P1)

No `role:`-bearing capability is added, so P1's Capability-eval obligation is not triggered. The
increment's own verification is the enumerated test set below, which is where its assertions live:

- `PROMOTE_GATE_PARITY` presence rule → for each obligation × each surface, the command body **matches**
  its surface's pinned invocation/mandate regex
- `PROMOTE_GATE_PARITY` discrimination rule (L4's house pattern) → strip the matched text from the real
  body; the same regex must **stop** matching, so a future loosening fails here rather than certifying a
  command that lost its wiring
- `PROMOTE_GATE_PARITY` cross-surface closure rule (L36) → each command must **not** carry the other
  surface's floor path as an invocation; the dev/product paste error is the failure this pair invites
- `PROMOTE_GATE_PARITY` non-vacuity rule (L34) → every command file the set names exists on disk, and the
  member count is asserted explicitly, so a truncated or renamed set cannot pass over an empty domain

## Guarantee audit (P0)

- "the dev promote command re-verifies canon by content-hash before writing" → **floor: content-hash**
  (primitive #2), owned by the pinned `node -e` compare. **Two clocks, and the bound is the point:** the
  _comparison_ is floor; the command's _act_ of running it is advisory orchestration — nothing forces it.
- "a candidate's `title` cannot reach a canon heading multi-line or control-char-bearing" → **floor:
  enum-regex** (primitive #3), same two-clocks bound. NARROWED and stated: it gates **shape**, never that
  the title is accurate or apt.
- "every byte of canon goes through a hook-gated tool" → **floor: hook** (fix #7) for the
  `Write|Edit|MultiEdit` surface **only**. NARROWED: a Bash write bypasses `PreToolUse` entirely (L19), so
  the mandate is a _prescription_ the floor backstops for one tool surface, never a proof of route.
- "the dev command's `commit` is a real SHA or the run halts" → **floor: enum-regex** at
  `check-provenance.mjs` (which rejects everything but a 7–40 hex SHA). ADVISORY: that the SHA is the
  _true_ HEAD — the checker validates shape, the command supplies the value.
- "the two `*memory-promote` commands carry the same gate obligations" → **floor: enum-regex** over
  command prose (the `PROMOTE_GATE_PARITY` set, run by `npm test`). **NARROWED, and this is the honest
  half:** it pins that each command **contains** the invocation/mandate text. It CANNOT prove a run
  executed it, that a branch is obeyed, or that the flags are right. "The parity is pinned" NEVER means
  "the gate ran".
- "this increment adds a new floor primitive" → **struck.** It adds none. Every checker is reused
  byte-for-byte; what changes is _who_ checks and _what the command prescribes_, exactly as the 2.8.0
  `grill-lessons-reverify` precedent framed it.
- "porting the five hardenings makes the dev gate as strong as the product gate" → **advisory.** It
  makes the two _procedures_ symmetric on the eight enumerated obligations. The dev gate remains
  **stronger** on `commit` (no `unknown`) and the sixth asymmetry (next-id) is left open by design.

## Trust audit (P2)

- **Input.** The candidate `title` / `body` are free text, typically drawn from a
  `.dev/features/<name>/REVIEW.md` finding whose free-text inherited the reviewed increment's
  `trust: untrusted` tag (`pharn/ARCHITECTURE.md §8`, fix #1).
- **What this increment changes.** `title` moves from _entirely ungated_ into the **shape-gated** class
  before it is rendered into a permanently-retained canon heading. That is a narrowing of the untrusted
  surface, not a new trusted field: shape-validity is not truth, and a well-shaped but misleading title
  still passes — held only by the human's Step-5 read.
- **Propagation is unchanged.** `body` stays untrusted DATA, written as markdown, never injected
  downstream as an instruction; `check-provenance.mjs` still ranges only over enum-gated fields and never
  the body, so **no guaranteed decision rests on a tainted field**.
- **The two commands being compared are `trust: trusted` files** (both carry `trust: trusted`
  frontmatter), so the parity test reads trusted input; it introduces no new untrusted ingestion.

## Determinism audit (P5)

- Every ported branch is a membership / regex / exit-code test: the hash compare (equality), the title
  check (character-class + type), `check-provenance.mjs` (enum/regex/presence).
- **Every terminal fallback ends in a question, never a guess:** an untraceable `source`, a `feature` not
  under `.dev/features/<name>/`, and — the dev-specific one — a failed `git rev-parse HEAD` all HALT and
  ask. The product's `unknown` escape is deliberately not available here.
- The parity test branches on regex membership over trusted command bytes; no LLM classification is
  involved in it.

## Open questions (HALT) — ALL RESOLVED at GATE 1

**Status: no open question remains.** The human approved this plan at GATE 1 and answered all three
below. Recorded here so the artifact reflects its approved state (`/pharn-dev-build` Step 1.1 refuses a
plan carrying unresolved questions), and kept rather than deleted so the decisions stay auditable.

1. **Should `PROMOTE_GATE_PARITY` range over BOTH commands, or only the dev one?** Ranging over both is
   what L29/L31 actually prescribe (the set spans the pair; a dev-only set repeats the per-file
   assessment that caused this). The cost: the test then reads
   `.claude/commands/pharn-memory-promote.md`, which a **concurrent PR is editing**, so a product-side
   reword could turn this test red for reasons unrelated to the dev port. Mitigation if we proceed:
   match only pinned command lines and mandated verbs, never incidental prose.
   - **RESOLVED — range over BOTH.** "This is what L29/L31 actually prescribe — the obligation set spans
     the pair, and a dev-only set repeats the exact per-file assessment that let all five hardenings go
     missing. Apply your own mitigation: match only pinned command lines and mandated verbs, never
     incidental prose." Two later PRs (dev-canon citation cleanup; release-step reordering) will also
     edit `pharn-memory-promote.md`; the human will **sequence and rebase them against this one**, and
     the rule is explicitly **not** to be weakened to pre-empt them.
2. **Is eight obligations the right granularity?** The five CHANGELOG hardenings expand to eight
   separately-checkable obligations (2.2.4 → two: pin + re-verify; 2.2.5 → two: channel mandate +
   forbidden routes). Collapsing to five would track the CHANGELOG; keeping eight tracks what is actually
   independently droppable.
   - **RESOLVED — keep EIGHT.** "Eight tracks what is independently droppable, which is what the test is
     for. Note the 5→8 mapping in a comment so the CHANGELOG correspondence stays traceable."
3. **Confirm the `commit` non-port.** The plan hard-refuses to port `unknown` and makes the dev fallback
   HALT-and-ask. Please confirm that is the intended reading of the dev `COMMIT_RE` — the alternative
   (widen the dev checker to admit `unknown`) would be a floor-checker change this plan explicitly does
   not make, and would contradict `.dev/floor/check-provenance.test.mjs:396`.
   - **RESOLVED — confirmed; do NOT port `unknown`.** Dev's `COMMIT_RE = /^[0-9a-f]{7,40}$/` rejects it
     and `.dev/floor/check-provenance.test.mjs:396` pins that divergence deliberately. The dev terminal
     fallback is **HALT-and-ask**; widening the dev checker is **explicitly out of scope**. The in-file
     note explaining this is to be kept, so a future porter does not "complete" the parity by widening it.

## Grill findings folded into the build (advisory — `GRILL.md`)

`/pharn-dev-grill` raised 10 advisory concerns (Step 1b re-verification: GREEN). Four change what gets
written, all inside this plan's already-declared `## Files`; the rest are recorded and answered in
`GRILL.md`.

- **G1 / G7 (P0)** — say plainly, in both the command and the test comment, that a `floor` label covers
  the primitive's **kind**, not a tested implementation: the ported hash-compare and title check are
  **untested inline one-liners**, and the parity test pins **presence of text**, never execution.
- **G6 (P7)** — port the product's `date`-unavailable fallback too, and state that the Step-6 hash
  compare **fails closed** when the Step-1 pin is missing.
- **G9 (P2)** — carry across the product twin's `canon-write-denylist` disclosure: `--from-plan` scoping
  means a dev PLAN naming a canon path still grants an **ungated** canon write, so the write-channel
  mandate must not read as "canon is only writable through this command".
- **G5 (P5)** — record the anti-ratchet instruction **in the test file itself**: a red product-side
  matcher means re-read the product command, never loosen the regex.
