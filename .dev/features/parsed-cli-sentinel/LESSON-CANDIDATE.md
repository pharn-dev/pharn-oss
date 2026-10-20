# LESSON-CANDIDATE — correcting L31 / L35's "cannot be merged" reason

**Status: proposed, NOT applied.** Nothing under `.dev/memory-bank/` is edited by this increment. This file is a dev
artifact for the maintainer's accept/deny; the model never self-promotes. It carries forward the candidate that
`lessons-canon-root` (6.69.0, #372) deferred in its `SHIP.md` ("lesson: deferred").

## What is stale

`.dev/memory-bank/lessons-learned.md`, read at `dd69efd5` (6.71.0):

- **L35** (heading at :1190), "Why it matters" paragraph: L31 "governs copies that must **both** exist (the
  deliberate `check-provenance` and `lessons-index-core` product/dev pairs, which cannot be merged because a user's
  install ships `pharn/floor/` without `.dev/`)".
- **L31** (heading at :1005), Lesson paragraph: "This repo maintains several deliberate dev/product copy-pairs
  (`check-provenance.mjs`, `lessons-index-core.mjs`, and the four lessons-index wiring sites)."

Why it is wrong now: the stated constraint (an install ships `pharn/floor/` without `.dev/`) forbids only the
`pharn/` → `.dev/` import arrow. The other arrow was already in use before 6.69.0 (at `289eb624^1`, nine non-test
`.dev/floor/*.mjs` files imported `pharn/floor/runtime-floor.mjs`, and others imported
`pharn/floor/frontmatter-core.mjs`). 6.69.0 merged both pairs by making the four `.dev/floor/` lessons files thin
wrappers that import the product modules (`.dev/guides/lessons.md`, "One implementation, two profiles"). The pairs
L35 cites as the example of copies that must both exist were copies that did not have to exist, which is L35's own
prescription applied to its own example. L31's obligation-set point is unaffected (the set is still enumerated, as
`LESSONS_SWEEP_WIRING`); only its example of a live code copy-pair has expired.

## How a correction is done here (read live)

- `.claude/commands/pharn-dev-memory-promote.md`, "The standing division, so it need not be re-derived":
  _annotating_ an existing entry travels the **ordinary gated build path** (declared in a PLAN's `## Files`, scoped by
  `set-writes-scope.cjs --from-plan`, approved at the plan gate); _promoting_ a new entry travels
  `/pharn-dev-memory-promote`, the sole path for an entry that enters canon with provenance. The command cannot edit
  an entry: Step 3's duplicate-id check REDs on an existing id and Step 6 appends a whole entry.
- Step 4 of the same command: a candidate that contradicts an existing entry is surfaced to the human with both
  entries quoted — "Never auto-resolve, auto-merge, or silently supersede".
- Precedent: the only commit in canon's history that changed existing lines (`d851a08f`, #207) moved a provenance
  block; no lesson body has been corrected in place. `lessons-canon-root/SHIP.md` recorded the intent as "through a
  new entry; canon is never edited in place" — a stated intent of that run, not a rule found in the command.
- `.dev/guides/lessons.md` has no correction procedure of its own.

So there are two legitimate paths, and they compose. **Recommendation: A, and B only if you want the old entries
to point at the correction.**

## Option A — a new correcting lesson, L77, through `/pharn-dev-memory-promote` (recommended)

Run `/pharn-dev-memory-promote` for a **lesson**, surfacing artifact `.dev/features/lessons-canon-root/REVIEW.md`.
The candidate below passed `node .dev/floor/check-provenance.mjs <candidate> .dev/memory-bank/lessons-learned.md`
(exit 0, GREEN: id unique, target in enum, type a member, five well-shaped concepts) as a dry run on 2026-10-20 at
`dd69efd5`. `commit` and `date` are re-captured at promotion (Step 1: `git rev-parse HEAD`, `date +%Y-%m-%d`); the
values below are that dry run's captures, not a substitute for them. The id is the next after L76 at `dd69efd5`;
re-derive it from live canon.

```json
{
  "target": ".dev/memory-bank/lessons-learned.md",
  "id": "L77",
  "type": "process",
  "concepts": ["dev-product-boundary", "dependency-direction", "redundant-identity", "remedy-design", "lesson-correction"],
  "provenance": {
    "feature": "lessons-canon-root",
    "commit": "<git rev-parse HEAD at promotion; dry run: dd69efd59f968200650116cae9e0a5afb9cc4936>",
    "source": ".dev/features/lessons-canon-root/REVIEW.md § Proposed lesson candidate + .dev/features/lessons-canon-root/SHIP.md lesson: deferred",
    "date": "<date +%Y-%m-%d at promotion; dry run: 2026-10-20>"
  },
  "title": "A dependency-direction rule forbids one arrow, not both — before keeping a copy-pair because an install strips one side, check whether the stripped side can import the shipped one",
  "body": "<the two paragraphs below>"
}
```

Proposed body (DATA for the gate; the Step-6 render adds the heading, tag line and provenance block):

> **Lesson.** A dependency-direction constraint forbids one arrow, never both. [[L35]] cited the `check-provenance`
> and `lessons-index-core` dev/product pairs as copies that must both exist, "which cannot be merged because a
> user's install ships `pharn/floor/` without `.dev/`", and [[L31]] described them as deliberate copy-pairs. That
> reason forbids only an import from `pharn/` into `.dev/`. The other direction was already in use (at the parent of
> 6.69.0, nine non-test `.dev/floor/*.mjs` files imported `pharn/floor/runtime-floor.mjs`), and `lessons-canon-root`
> (6.69.0) merged both pairs by making the four `.dev/floor/` lessons files thin wrappers over the product modules,
> with a closure test that refuses any grammar declaration in a wrapper. Remedy: before keeping a copy-pair "because
> the install strips one side", check whether the stripped side can import the shipped one; if it can, the copy is
> L35's redundant second copy, not L31's obligatory pair.
>
> **Why it matters.** This corrects the example both lessons rest on, not their rules. L35's question ("must the
> second copy exist?") was right, and its own example answered it wrongly because the reason given was never tested
> against the arrow it actually forbids. L31's rule still governs copies that genuinely must both exist, and the
> obligation set it asked for still stands as `LESSONS_SWEEP_WIRING`; but its named code pairs are no longer copies.
> A reader of L31 or L35 alone still meets the stale example, because canon is append-only by this command: read
> them together with this entry. **Bound (P0):** discipline only; nothing checks which import directions a copy-pair's
> stated reason rules out. **Honest trigger (P7):** the stale reason was found while applying L35 in
> `lessons-canon-root`'s PLAN ("Applied lessons", L35) and recorded in its `REVIEW.md` "Proposed lesson candidate".

After an accepted promotion: `npm run docs:generate` (Step 6b regenerates `docs/lessons-index.md`), then commit.

## Option B — annotate L31 and L35 in place, on the ordinary gated build path (optional, composes with A)

Only if you want the stale sentences to point at the correction from where a reader meets them. Per the standing
division this is a normal increment: declare `.dev/memory-bank/lessons-learned.md` and `docs/lessons-index.md` in a
PLAN's `## Files`, scope it with `--from-plan`, get plan approval, then regenerate the index (each entry's size column
changes). Proposed edits, each a new paragraph inserted directly above the entry's `**Provenance.**` line, leaving
every existing line untouched:

- **L35**, insert:

  > **Correction (6.69.0, [[L77]]).** The parenthesis above that calls the `check-provenance` and
  > `lessons-index-core` pairs copies that "cannot be merged because a user's install ships `pharn/floor/` without
  > `.dev/`" is wrong: that constraint forbids only `pharn/` → `.dev/` imports, and 6.69.0 merged both pairs by making
  > the `.dev/` side thin wrappers over the shipped modules. The pair was an instance of this lesson, not of L31's.

- **L31**, insert:

  > **Correction (6.69.0, [[L77]]).** The code copy-pairs named above no longer exist: since 6.69.0 the four
  > `.dev/floor/` lessons files are thin wrappers over `pharn/floor/`. The obligation set this lesson asked for still
  > stands, as `LESSONS_SWEEP_WIRING`.

B without A would leave the corrections pointing at a nonexistent L77; if only B is wanted, drop the `[[L77]]` cites.

## Decision requested

Accept A / accept A+B / deny. On accept, the promotion runs as its own `/pharn-dev-memory-promote` invocation (its
human accept/deny gate is the authority, not this file), outside this PR.
