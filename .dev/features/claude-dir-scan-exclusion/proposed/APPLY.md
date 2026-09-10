# APPLY — restore canon `L10`'s displaced provenance block (HUMAN MUST APPLY)

**Status: NOT APPLIED.** This increment did not and could not make this change. Until a human applies it,
canon `L10` still carries no provenance and `docs/lessons-index.md` still renders `-` in its `promoted`
column. `SHIP.md` records this as unapplied.

## Why the agent could not do it (probed, not assumed — lessons-learned L37)

`.dev/memory-bank/lessons-learned.md` is memory-bank canon, and the write-guard refuses a canon write whose
writes-scope ORIGIN is a build. Probed live rather than read off a doc:

| scope origin                                   | `Edit` payload for canon              | verdict            |
| ---------------------------------------------- | ------------------------------------- | ------------------ |
| `.claude/commands/pharn-dev-plan.md` (a build) | `.dev/memory-bank/lessons-learned.md` | **exit 2, denied** |
| `.claude/commands/pharn-dev-memory-promote.md` | same path                             | exit 0, allowed    |

`enforce-writes-scope.cjs` denies it too (exit 2), and the deny message names this exact case:

> Re-scoping a build from a PLAN's `## Files` CANNOT authorize this write — that is the specific thing this
> guard refuses, deliberately.

`/pharn-dev-memory-promote` is not a route either: it **appends a new entry** behind its own accept/deny
gate; it does not move a misplaced block. The three ways past the guard were each refused rather than taken
— a Bash `sed` (CLAUDE.md: routing an in-repo write through Bash to dodge the guard "is still the thing you
must not do"), forging a promote-shaped `set_by` through the setter's argv (the self-escalation the guard
exists to stop), and unwiring the hook (itself protected). This file is the sanctioned route, following the
precedent set by `canon-write-denylist` (#200).

## The defect

`L10` carries **zero** `**Provenance.**` blocks. `L11` carries **two**. Measured over all 37 entries, these
are the only two anomalies — every other entry carries exactly one.

The second block under `L11` is **`L10`'s**, and three independent facts say so:

1. **Subject.** It names `feature: product-pipeline-probe`. `L10`'s own body says the defect was "Surfaced
   live by the product-pipeline-probe". `L11`'s body is about `architecture-griller` and a pre-existing
   MD038 cluster — which its **first** provenance block correctly names.
2. **Date order.** The displaced block reads `promoted: 2026-06-30`; `L11`'s own block reads `2026-07-01`.
   Canon is ordered by promotion date, so a `2026-06-30` block sitting after a `2026-07-01` one is out of
   sequence exactly where `L10` (which should hold it) sits before `L11`.
3. **Git.** Searching canon's history for the block's own text returns `0888102` — "product-pipeline-probe:
   first end-to-end product-pipeline probe (+ CF-E fix, L10) (#25)" — the commit that promoted **L10**. The
   block was appended to the wrong entry in that commit:

   ```bash
   git log --oneline -S 'product-pipeline-probe/PROBE.md' -- .dev/memory-bank/lessons-learned.md
   ```

This is a **move**, not a reconstruction. No date, SHA or feature name is invented; the block below is the
bytes already in the file, relocated.

## The change

In `.dev/memory-bank/lessons-learned.md`, **cut** this block — currently the second `**Provenance.**` block
under `## L11`, immediately before `## L12` — and **paste** it at the end of `## L10`'s section, immediately
before the `## L11` heading:

```markdown
**Provenance.**

- feature: `product-pipeline-probe`
- commit: `a66f5872e48265eb39c4c58b6d58c0593f00e8e4`
- surfaced by: `.dev/features/product-pipeline-probe/PROBE.md` (CF-A) + `.dev/features/product-pipeline-probe/REVIEW.md`
  (proposed lesson).
- promoted: 2026-06-30 via gated `/pharn-dev-memory-promote` (human-approved).
```

Nothing else changes: no text is edited, `L11` keeps its own (first) provenance block, and no other entry is
touched.

## After applying — REQUIRED, or `docs:check` goes RED

The index is derived from canon, so the move changes its rendered bytes:

```bash
npm run docs:generate   # regenerates docs/lessons-index.md (and the capability catalog)
npm run docs:check      # must be exit 0
```

Three cells change and it is worth knowing which, so the diff can be read rather than trusted: `L10`'s
`promoted` column becomes `2026-06-30` instead of `-`; `L10` and `L11`'s `~tokens` change (the block moves
between the two sections, and the estimate is `ceil(chars / 4)` over each full section); and the header's
`~N tokens total` is unchanged in principle but may shift by a rounding unit, since the two per-section
`ceil()`s are recomputed.

## Verifying it worked

```bash
# every entry should carry exactly one provenance block — expect NO output
node -e "const s=require('fs').readFileSync('.dev/memory-bank/lessons-learned.md','utf8').split('\n');const i=s.map((l,n)=>/^## L\d+ /.test(l)?n:-1).filter(n=>n>=0);i.forEach((a,k)=>{const b=k+1<i.length?i[k+1]:s.length;const n=s.slice(a,b).join('\n').split('**Provenance.**').length-1;if(n!==1)console.log(s[a].match(/^## (L\d+)/)[1],'->',n)})"

# and the index should no longer render `-` in the promoted column
grep -n '^L10 ' docs/lessons-index.md
```

## What this does NOT claim (P0)

- That the relocated block is **correct** — it asserts only that it belongs to `L10` rather than `L11`, on
  the three grounds above. The block's own contents were not re-derived against `#25`'s diff.
- That anything **prevents a recurrence**. No checker asserts "exactly one provenance block per entry"; the
  live-canon guard in `.dev/floor/lessons-index-core.test.mjs` pins tag lines (`0 untagged`, `0 malformed`)
  and says nothing about provenance. The one-liner above is a verification command a human runs, not a gate.
  A `provenance-block-count-check` is the named residual, unbuilt: per L20 the bar is a second occurrence,
  and this is the first.
