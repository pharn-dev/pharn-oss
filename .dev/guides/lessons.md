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
  `pharn/memory-bank/lessons-learned.md`) as a deterministic RED, and both ship orchestrators read that exit
  code as a proceed/stop input. **No new floor primitive** — `check-plan-lessons.mjs` is reused
  byte-for-byte; what changed is **who** checks, not **what** is checkable. All six call sites are
  enumerated in `PLAN_LESSONS_WIRING` (`.dev/floor/command-hygiene.test.mjs`), which pins that each
  command **invokes** the checker **against its own surface's canon** — a dev command pointed at the
  user's `pharn/memory-bank/` is a RED, and vice versa. **The bound is unchanged and is the point:**
  re-verification NARROWS self-attestation; it does **not** close the declaration-vs-application gap.
  A plan may cite `[L1]` having ignored L1 entirely and every stop stays GREEN. "The grill verified the
  lessons were applied" remains struck (P0). And "the wiring is pinned" never means "the check ran".
- A project with **no** `pharn/memory-bank/` is unblocked by construction: `none` short-circuits before the
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
  canon and flag it either way. (The PRODUCT profile keeps the benign reading of `-` on purpose — a user's
  `pharn/memory-bank/` may legitimately hold hand-written entries.) **Neither marker is a floor error:** a `-`
  or `?` regenerates cleanly and `docs:check` stays exit 0, so this is a read-it-and-look signal, not a
  gate — the named `lesson-tagline-render-check` residual.
  - **The PRODUCT surface now has the same two-step sweep, with a deliberately WEAKER guarantee.**
    `/pharn-plan` selects from `pharn/.run/lessons-index.md` and then reads the full entries from the user's
    `pharn/memory-bank/lessons-learned.md`, branching on `pharn/floor/check-lessons-index.mjs --verdict`'s closed
    token set `{NO_CANON, COLD, GREEN, STALE, ENUM_ERROR}` — **membership, never prose, and never the exit
    code alone** (three tokens share exit 0 and each prescribes a different sweep). A stale or absent index is
    regenerated and re-checked (6.69.0, below); an index that still is not `GREEN`, or an invalid canon,
    **degrades to "read canon in full and say so"; it never blocks a plan.** The product
    index is a **gitignored, disposable CACHE** under `pharn/.run/`, not a committed page, so its check is a
    **staleness** comparison whose coverage is machine-local — **not** the dev surface's
    "committed == recomputed" byte-equality. `NO_CANON` (no memory-bank yet) and `COLD` (no cache yet) are
    **GREEN by design**: both are the honest normal state of a fresh install, and REDding there would make
    every first run a false alarm. `/pharn-memory-promote` Step 6b refreshes the cache after an accepted
    promotion — a Bash write, therefore **outside** the fix #7 scope and declared as such (L19), and
    advisory: skipping it just yields a `STALE` the next plan regenerates.
  - **One implementation, two profiles (6.69.0, audit ARCH-6).** Until 6.69.0 the two cores were
    hand-kept SEPARATE COPIES (`pharn/floor/lessons-index-core.mjs` vs `.dev/floor/lessons-index-core.mjs`, and
    likewise `check-lessons-index`, `gen-lessons-index` and `check-provenance`), pinned to agree by ✧ text tests.
    The copies are retired (L35): the grammar, the renderer and the comparison live only under `pharn/floor/`,
    which takes the canon root as a parameter (`--canon-root <dir>`, default `pharn/memory-bank`; plus
    `--strict-commit` on check-provenance). The four `.dev/floor/` files are thin wrappers that pass the dev
    surface's PROFILE — `.dev/memory-bank/`, the committed `docs/lessons-index.md`, `npm run docs:generate`, a
    columns paragraph reading both absence markers as unexpected — and keep what is genuinely different there:
    canon must exist (the product's benign `no-canon` is a throw), the committed-index verdicts (`MISSING` /
    `DRIFT` for the product's `COLD` / `STALE`), and a SHA-only `commit`. A ✧ closure in each dev test refuses any
    other top-level declaration in a wrapper, so the grammar cannot grow back. The dependency still points only
    `.dev/` → `pharn/` (an install ships `pharn/floor/` without `.dev/`). **The flag's bound:** it changes which
    file those four CLIs read; every other product canon path (`check-plan-lessons`'s argument, the promote
    target, `/pharn-plan`'s "read canon" step) stays `pharn/memory-bank/`, so it is not a way to relocate a project's
    memory-bank. Its consumer is this repo: `node pharn/floor/check-lessons-index.mjs --canon-root .dev/memory-bank
. --verdict` runs the product sweep's checker on PHARN's own canon (a dev test pins that it is never
    `NO_CANON`).
  - **`/pharn-plan` regenerates on `COLD` / `STALE` (6.69.0, audit CTX-8).** It used to read canon in full on
    `COLD` with an "optional" warm-up, and on `STALE`. Now both run `node pharn/floor/gen-lessons-index.mjs .`,
    re-check, and on `GREEN` select from the index; only a non-`GREEN` re-check, a failed generator or
    `ENUM_ERROR` falls back to reading canon in full. `LESSONS_SWEEP_WIRING` holds the new line as its fifth
    member; the grant is in `/pharn-loop`'s `allowed-tools`.
