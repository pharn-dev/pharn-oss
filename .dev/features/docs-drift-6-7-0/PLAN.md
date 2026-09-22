# PLAN — close the doc drift the 6.5.0→6.7.0 line left in unguarded prose

- spec_content_hash: aada03c9f7165f944aef66db8ee9eb9df809c0fad2d5d67c268ac2d620566b3d # fix #4
- applied_lessons: [L1, L33, L43, L50]
- increment: the 6.5.0→6.7.0 line shipped two new durable per-feature artifacts — `cost.json` and
  `RUN-REPORT.md` — and every surface a checker reads was updated while the unguarded prose was not.
  Correct the four sites, and STAGE the one that is hook-denied.
- layer(s): repo-meta (`README.md`, `CHANGELOG.md`) + a staged patch against the trusted doc
  `pharn/ARCHITECTURE.md` # pharn/ARCHITECTURE.md §4
- constitution_refs: [P0, P6, P7]

## Applied lessons

- L1 — this increment IS the L1 defect, observed one release line later: 6.6.0's plan scoped `README.md`
  to its GENERATED region only, so the meta-doc sweep never asked which hand-written prose the new
  artifact invalidated. The `## Files` list below names every meta-doc that states a fact this line
  changed, which is L1's prescription applied rather than cited.
- L33 — the sites here are expired forward-looking prose in L33's exact sense: README's paper-trail list
  and its `Budget for it` bullet were TRUE when written and became incomplete the moment `cost.json` and
  `RUN-REPORT.md` landed, in files nobody was editing. Per L33 the first grep was treated as a LOWER
  BOUND: the enumeration was re-derived from the shortest invariant substring (`VERIFY.md` for the
  artifact list, `cost` for the cost claims) rather than from the sentences already read.
- L43 — the reason this drift survived three releases is L43 exactly: `check:badge`, `check:changelog`
  and `docs:check` all compare version copies TO EACH OTHER, never to what changed, so all ten gates were
  GREEN with the prose stale. This increment therefore does NOT add an eleventh mutual-consistency gate
  (L43 says a third would have been green too); it repairs the values and leaves the detector deferred.
- L50 — the sweep ran on the REFERENT axis first (every cite of `cost.json` and `RUN-REPORT.md` on every
  surface, `.dev/` and CHANGELOG excluded as build-record), then on the claim axis. Both axes converged
  on the same four sites, and every cite written below was DEREFERENCED — `.claude/commands/pharn-loop.md:492`
  was opened to confirm `RUN-REPORT.md` really is in the Step-6c staging list before the ARCHITECTURE
  patch asserts it is committed on a green stop.

## Trigger (P7 — a real failure, never a hypothetical)

Observed, not hypothesised. `pharn/ARCHITECTURE.md` §5's durable-files sentence names `findings.json`,
`ship-record.json` and `cost.json` and omits `RUN-REPORT.md`, while `.claude/commands/pharn-loop.md:492`
stages `RUN-REPORT.md` for the green-stop commit — the same criterion by which 6.5.2 added `cost.json`
to that very sentence. So the repo has a precedent applied once and skipped the next release.

## Files

- `README.md` — three hand-written regions, none of them inside the guarded CURRENT-STATE markers:
  (1) the `## What PHARN is` paper-trail list gains `LOOP.md`/`SHIP.md` framing plus `cost.json` and
  `RUN-REPORT.md`; (2) `## Guaranteed vs advisory` gains a `check-cost-ledger.mjs` row and its bound
  under **Important bounds**; (3) the `## Current limitations` token-hungry bullet stops ending on
  "Budget for it" and says the run now measures itself — layer repo-meta
- `CHANGELOG.md` — one `[Unreleased]` entry under `### Fixed` recording the drift, the sweep axes, and
  the fact that the ARCHITECTURE half is STAGED and NOT applied — layer repo-meta
- `.dev/features/docs-drift-6-7-0/PLAN.md` — this file — layer `.dev/features`
- `.dev/features/docs-drift-6-7-0/proposed/architecture.patch` — the hook-denied half — layer `.dev/features`
- `.dev/features/docs-drift-6-7-0/proposed/APPLY.md` — the human's enumerated apply steps — layer `.dev/features`

## No SKILLS_VERSION bump, and that is a rule reading rather than an omission

`CLAUDE.md`'s bump rule puts `README` and `CHANGELOG` in the **pure repo-meta** set that explicitly does
NOT bump. The only bump-triggering byte in this increment is `pharn/ARCHITECTURE.md`, which is a trusted
doc — and it is NOT applied here. Bumping now would assert a trusted-doc correction that does not exist
on disk, which is the [[L43]] trap this repo's own 6.4.2 entry names ("apply every patch BEFORE
committing"). The bump therefore belongs to the human's apply commit, and `APPLY.md` enumerates it.

## What this increment does NOT do

- It adds no checker. L43's named detector (bind `SKILLS_VERSION` to the product-surface paths changed
  since it last moved) stays deferred with its two recorded design problems; L50's registry of removed
  referents likewise. Building either here would be the speculative addition P7 forbids.
- It does not touch `LIMITS.md §1c` or `§3`. Nothing in them is false: the cost ledger MEASURES cost, it
  does not SOLVE the fan-out problem, and §1c's "the system already observes it" was already true.
