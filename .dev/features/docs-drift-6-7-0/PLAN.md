# PLAN — close the doc drift the 6.5.0→6.7.0 line left in unguarded prose

- spec_content_hash: aada03c9f7165f944aef66db8ee9eb9df809c0fad2d5d67c268ac2d620566b3d # fix #4
- applied_lessons: [L1, L33, L43, L50]
- increment: the 6.5.0→6.7.0 line shipped two new durable per-feature artifacts — `cost.json` and
  `RUN-REPORT.md` — and every surface a checker reads was updated while the unguarded prose was not.
  Correct all four sites in ONE commit.
- layer(s): the trusted doc `pharn/ARCHITECTURE.md` (§5) + repo-meta (`README.md`, `CHANGELOG.md`,
  `SKILLS_VERSION`) # pharn/ARCHITECTURE.md §4
- constitution_refs: [P0, P2, P6, P7]

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
  was opened to confirm `RUN-REPORT.md` really is in the Step-6c staging list before §5 asserts it is
  committed on a green stop.

## Trigger (P7 — a real failure, never a hypothetical)

Observed, not hypothesised. `pharn/ARCHITECTURE.md` §5's durable-files sentence named `findings.json`,
`ship-record.json` and `cost.json` and omitted `RUN-REPORT.md`, while `.claude/commands/pharn-loop.md:492`
stages `RUN-REPORT.md` for the green-stop commit — the same criterion by which 6.5.2 added `cost.json`
to that very sentence. So the repo had a precedent applied once and skipped the next release.

## Files

- `pharn/ARCHITECTURE.md` — §5's durable-files sentence gains `RUN-REPORT.md`. **Hook-denied to the
  agent and APPLIED BY THE MAINTAINER outside the agent loop** (probed live: `Edit` on this path →
  exit 2; the control, `Edit` on `README.md` → exit 0). Declared here because the increment changes it;
  fix #2 keeps it denied regardless of this declaration, which is the documented composition of the two
  guards — layer trusted doc
- `SKILLS_VERSION` — `6.7.0` → `6.7.1`. A trusted doc is product surface and this is a correction to
  bytes that already shipped, so the bump size is **patch** — layer repo-meta
- `README.md` — the shields badge (`check:badge` string-compares it to `SKILLS_VERSION`) plus three
  hand-written regions, none inside the guarded CURRENT-STATE markers: (1) the `## What PHARN is`
  paper-trail list gains `cost.json` and `RUN-REPORT.md`; (2) `## Guaranteed vs advisory` gains a
  `check-cost-ledger.mjs` row and its bound under **Important bounds**; (3) the `## Current limitations`
  token-hungry bullet stops ending on "Budget for it" — layer repo-meta
- `CHANGELOG.md` — one `[Unreleased]` entry recording the bump and the sweep axes — layer repo-meta
- `.dev/features/docs-drift-6-7-0/PLAN.md` — this file — layer `.dev/features`

## The ordering, and why no patch file is committed here

The first attempt pushed the `pharn/ARCHITECTURE.md` change as an **UNAPPLIED** `.patch` under
`proposed/` and left it on `main` as a pending TODO; the maintainer reverted it. **The defect was the
ORDERING, not the file** — and that distinction must be stated precisely, because this repo carries 22
committed `.patch` files under `.dev/features/*/proposed/`, so "a patch does not belong in the
repository" would be a false claim about its own convention. What those 22 have in common is that the
trusted-doc edit was APPLIED before or with the commit that carries them; the patch is a build record
of a human-applied change, never an instruction still waiting to be run.

The 6.5.2 precedent sets the correct order and this run follows it: the human applies FIRST, then the
whole increment lands in ONE commit with the trusted-doc change already on disk. **Not committing the
patch here is the maintainer's explicit instruction for this increment** (P5 — ask the human; recorded
as their decision rather than folded in as a rule), and it costs nothing: the diff itself is the record.
Applying first also removes the [[L43]] hazard the first attempt had to work around — a bump asserting
a correction that is not on disk — because here the correction IS on disk before the bump.

## What this increment does NOT do

- It adds no checker. L43's named detector (bind `SKILLS_VERSION` to the product-surface paths changed
  since it last moved) stays deferred with its two recorded design problems; L50's registry of removed
  referents likewise. Building either here would be the speculative addition P7 forbids.
- It does not touch `LIMITS.md §1c` or `§3`. Nothing in them is false: the cost ledger MEASURES cost, it
  does not SOLVE the fan-out problem, and §1c's "the system already observes it" was already true.
