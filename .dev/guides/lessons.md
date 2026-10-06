# Lessons — `applied_lessons` and the lessons indexes

Moved out of the always-loaded root `CLAUDE.md` at `6ff4dd1` (SKILLS_VERSION 6.46.0) by `claude-md-bootstrap`. The text is the moved text, unchanged except
for the `##` headings added for navigation and the leading indentation Prettier normalizes. The root `CLAUDE.md`
still holds the rules every session needs; this file adds detail and does not override them.

**Read when:** before changing a plan or grill stage's lessons step, `pharn/floor/check-plan-lessons.mjs`, either lessons index, or how a command reads a memory-bank. These points elaborate the root `CLAUDE.md` bullet "Every PLAN declares `applied_lessons` (floor-checked)"; `/pharn-dev-plan` Step 1.4 holds the sweep a plan runs.

## `applied_lessons` — sub-check D, re-verification, a project with no memory-bank

- **The one-body-line-per-cited-id rule stopped being convention in 3.0.0 (sub-check D).** It was
  documented from 2.0.0 and enforced by nothing; now a cited id absent from the body is a RED. **The
  bound is the point and must not be overstated:** it proves the id's CHARACTERS appear below the
  header, never that the lesson was read — `L3: considered.` passes. It makes a citation cost a line;
  that is all. **Its P7 trigger was the maintainer's explicit direction, NOT an observed failure** —
  measured across all 150 committed PLAN.md files, 52 cited at least one id and **zero** omitted one
  from the body, so L20's "the second occurrence is the trigger" bar was **not** met. Recorded this way
  because a manufactured trigger would be exactly the disease P0 names.
- **The field is no longer SELF-ATTESTED — a stage that did not author it now re-verifies it
  (`grill-lessons-reverify`, shipped 2.8.0).** Both grill stages run the SAME checker against their own
  canon (`/pharn-dev-grill` → `.dev/memory-bank/lessons-learned.md`, `/pharn-grill` →
  `memory-bank/lessons-learned.md`) as a deterministic RED, and both ship orchestrators read that exit
  code as a proceed/stop input. **No new floor primitive** — `check-plan-lessons.mjs` is reused
  byte-for-byte; what changed is **who** checks, not **what** is checkable. All six call sites are
  enumerated in `PLAN_LESSONS_WIRING` (`.dev/floor/command-hygiene.test.mjs`), which pins that each
  command **invokes** the checker **against its own surface's canon** — a dev command pointed at the
  user's `memory-bank/` is a RED, and vice versa. **The bound is unchanged and is the point:**
  re-verification NARROWS self-attestation; it does **not** close the declaration-vs-application gap.
  A plan may cite `[L1]` having ignored L1 entirely and every stop stays GREEN. "The grill verified the
  lessons were applied" remains struck (P0). And "the wiring is pinned" never means "the check ran".
- A project with **no** `memory-bank/` is unblocked by construction: `none` short-circuits before the
  lessons file is read, so a fresh install is GREEN without an exception being granted anywhere.

## The lessons index is an address book

- **The lessons index is an ADDRESS BOOK, never a substitute for canon.** `/pharn-dev-plan`'s mandatory
  lessons sweep now runs in two steps: **select** candidates from `docs/lessons-index.md`, then **read
  each candidate's full `## L<n>` entry from `.dev/memory-bank/lessons-learned.md`** before declaring
  `applied_lessons`. **"The index was consulted" NEVER means "the relevant lessons were read."**
  `pharn/floor/check-plan-lessons.mjs` is unchanged and still verifies the declaration against **canon**,
  never against the index. The index's `type` / `concepts` columns are model-drafted values a human
  ratified at the promote gate, so **"typed `floor`" never means "about the floor"** — selecting on them
  is advisory context selection. **Every dev canon entry is now tagged** — the legacy L1–L17 were
  retro-tagged, so the index renders every entry tagged (`0 malformed · 0 untagged`; read the live
  counts from `docs/lessons-index.md`, never from this doc — P6) and **both** absence markers
  are now unexpected: a `-` means no tag line, i.e. an entry that reached canon without the promote
  gate's `type`/`concepts`; a `?` means a tag line is present but **failed its gate**. Read that entry in
  canon and flag it either way. (The PRODUCT twin keeps the benign reading of `-` on purpose — a user's
  `memory-bank/` may legitimately hold hand-written entries.) **Neither marker is a floor error:** a `-`
  or `?` regenerates cleanly and `docs:check` stays exit 0, so this is a read-it-and-look signal, not a
  gate — the named `lesson-tagline-render-check` residual.
  - **The PRODUCT surface now has the same two-step sweep, with a deliberately WEAKER guarantee.**
    `/pharn-plan` selects from `.pharn/lessons-index.md` and then reads the full entries from the user's
    `memory-bank/lessons-learned.md`, branching on `pharn/floor/check-lessons-index.mjs --verdict`'s closed
    token set `{NO_CANON, COLD, GREEN, STALE, ENUM_ERROR}` — **membership, never prose, and never the exit
    code alone** (three tokens share exit 0 and each prescribes a different sweep). A stale, absent or
    invalid index **degrades to "read canon in full and say so"; it never blocks a plan.** The product
    index is a **gitignored, disposable CACHE** under `.pharn/`, not a committed page, so its check is a
    **staleness** comparison whose coverage is machine-local — **not** the dev surface's
    "committed == recomputed" byte-equality. `NO_CANON` (no memory-bank yet) and `COLD` (no cache yet) are
    **GREEN by design**: both are the honest normal state of a fresh install, and REDding there would make
    every first run a false alarm. `/pharn-memory-promote` Step 6b refreshes the cache after an accepted
    promotion — a Bash write, therefore **outside** the fix #7 scope and declared as such (L19), and
    advisory: skipping it just yields a `STALE` the next plan degrades on.
  - **The two cores are deliberate SEPARATE COPIES** (`pharn/floor/lessons-index-core.mjs` vs
    `.dev/floor/lessons-index-core.mjs`), the `check-provenance.mjs` precedent. Four constants diverge on
    purpose — `CANON_PATH`, `OUT_PATH`, `GEN`, `REGEN` — as does the **absent/empty-canon semantics**
    (a divergent function, pinned separately: the product copy treats no-canon as a benign no-op where
    the dev copy throws). ✧ tests in
    `.dev/floor/lessons-index-core.test.mjs` pin **both** halves: every shared constant must AGREE and
    those four must DIFFER. The pin lives on the dev side because a user's install ships `pharn/floor/`
    **without** `.dev/`, so the dependency may only point `.dev/` → `pharn/`; the honest consequence is
    that it guards the two copies **in this repo**, and does not travel with the shipped code.
