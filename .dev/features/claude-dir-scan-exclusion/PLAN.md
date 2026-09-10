# PLAN — close the `.claude/` scan exclusion, and repair the three expired/ambiguous doc claims beside it

- spec_content_hash: bed2c2a58c113a374056ab23d2c74fe1a3395fa62be12e7a654e3b260552e299
- applied_lessons: [L1, L11, L19, L26, L29, L31, L33, L34, L36]
- increment: Close the `.claude/` segment in all five capability walkers and narrow the `npm test` glob that
  reaches past it; replace the expired "no install command yet" footer the 36 generated capability pages
  carry; disambiguate the `-` absent-marker legend in both lessons-index cores; and deliver the canon
  `L10`/`L11` provenance repair as a human-apply patch, because the floor refuses to let a build write canon.
- layer(s): `pharn/floor/` (product floor) + `.dev/floor/` (build apparatus) + repo meta — no capability
  layer is touched (`pharn/ARCHITECTURE.md §4`)
- constitution_refs: [P0, P2, P3, P5, P6, P7]

## Revision note — this is the SECOND draft, and why

The first draft anchored its P7 trigger on a live environmental instance: a nested Claude Code worktree at
`.claude/worktrees/bash-write-claim-wording/`. **That worktree was removed by its own session between
planning and grilling**, and `/pharn-dev-grill` raised 3 blocking-severity and 4 important findings, five of
which were one failure with five faces — the plan treated a transient condition as a standing fact. Every
number it quoted inverted (`validate` 72 → 36, `docs:check` RED → exit 0, `npm test` 3055/2-fail →
1886/0-fail). The human chose **re-plan with corrected evidence**.

This draft therefore anchors on a **reproducible fixture**, not on an observed environment, and every number
below was measured **in this worktree** running **this checkout's own checkers** — the L26-correct location.
The increment's subject, file list and axes are unchanged; only the justification and the verification are.

**This plan is being built on branch `feat/claude-dir-scan-exclusion`**, in a worktree at
`/Users/pgalarowicz/Projects/pharn-oss-wt-claude-dir-scan`, because a concurrent `/pharn-dev-*` chain
(feature `readme-audit-repairs`) holds the main checkout's single mutable `.pharn/writes-scope.json` and is
writing `README.md`, which this increment also writes.

## Scope note — this plan carries FOUR change-reasons, at the human's explicit direction

The first draft scoped axis A alone. At the GATE-1 form the human chose **"Widen to all four defects"** and
**"Fold in"** the `npm test` glob. That is recorded rather than silently absorbed, because it has a real cost:
**P3 says a file changes for exactly one reason**, and `.dev/floor/capability-catalog-core.mjs` is edited for
**two** (its walker exclusion, axis A; its rendered footer, axis C). The file legitimately owns both surfaces
— its own header records the dual-artifact scope note — but the increment does carry two reasons into it, and
a reviewer should see that named. The alternative (four chains) was offered and declined.

**Axis E is excluded by the floor, not by choice.** See `## Axis E` — probed, not assumed.

## The triggering failures (P7 — each REPRODUCIBLE on demand, not an observed environment)

**A — the walkers.** All five capability walkers exclude `.claude/commands/` but not `.claude/`. Verified in
this worktree by reading the constants live: `pharn/floor/validate.mjs`, `count-lenses.mjs`,
`count-grillers.mjs`, `count-verifiers.mjs` and `.dev/floor/capability-catalog-core.mjs` each carry
`` `${sep}.claude${sep}commands${sep}` ``. Reproduced against a fixture built from this checkout's own
`pharn/` tree plus one `.claude/commands/` file, running this checkout's own checkers:

| fixture state                    | `validate` | `count-lenses` | `count-grillers` | `validate` exit |
| -------------------------------- | ---------- | -------------- | ---------------- | --------------- |
| baseline                         | 36         | 22             | 13               | 0               |
| `+ .claude/worktrees/wt1/pharn/` | **72**     | **44**         | **26**           | **0**           |
| `+ .claude/zzz-arbitrary/pharn/` | **72**     | —              | —                | **0**           |
| nested copy removed              | 36         | 22             | 13               | 0               |

Three things this establishes that the first draft's evidence did not. (1) The defect is **not**
`worktrees`-specific — an arbitrarily named `.claude/<x>/` fires it identically, which is the closure argument
rather than an anecdote. (2) `validate` **exits 0 while reporting a doubled count**, so the failure is silent
on the checker that matters most. (3) It is **reversible**, so the fixture is a probe a test can build and
tear down rather than an environment someone must arrange.

This did also occur for real in the main checkout earlier today (`validate` 72, `docs:check` RED, `npm test`
2 failures) — that is what surfaced it. It is recorded as **history**, and the fixture above is the evidence.

**B — the `npm test` glob.** `package.json`'s `test` script passes `".claude/**/*.test.mjs"` and
`".claude/**/*.test.cjs"` **explicitly**. The leading `"**/*.test.mjs"` is not the culprit — measured: `**`
does not descend into dot-directories, so it alone finds 1 of 2 files in a fixture holding a nested duplicate.
The explicit `.claude/**` pattern does descend. Measured in `/tmp/globfx`:

- `node --test "**/*.test.mjs"` → **1 test** (the nested duplicate is skipped)
- `node --test "**/*.test.mjs" ".claude/**/*.test.mjs"` → **2 tests** (the nested duplicate runs)
- `node --test "**/*.test.mjs" ".claude/hooks/*.test.mjs"` → **2 tests** (a real hook test runs; the nested
  duplicate does **not**)

The narrowing loses nothing: `find .claude -name '*.test.*' -not -path '.claude/hooks/*'` returns **0** in
this checkout — all four `.claude/` test files are `.claude/hooks/*.test.cjs`.

**C — the expired install claim.** All 36 pages under `docs/capabilities/` end with
`_No install command yet — this repo has no PHARN CLI or install-token. Copy the source file above._`, while
`npx @pharn-dev/pharn@latest init` is published and documented (`README.md:21`, `:105`, `:127`).
`CHANGELOG.md:1666` records the 2026-08-23 rewrite (`f7c3caa`, #166) that corrected this claim class across
README / SECURITY / CONTRIBUTING / CLAUDE — and it missed the generated surface. Nothing can catch it:
`docs:check` guarantees byte-equality only, and `check-specified-markers` reads a hand-maintained manifest
naming only `CLAUDE.md`, `LIMITS.md`, `THREAT-MODEL.md`, `pharn/ARCHITECTURE.md` and
`pharn/pharn-contracts/finding-shape.md`.

**D — the `-` legend.** `ABSENT = "-"` is rendered into **three** columns (`type`, `concepts`, `promoted`) in
both index cores, while each legend defines `-` for the tag columns only. Canon `L10` therefore shows `-` in
the `promoted` column on a line whose own header reads `0 untagged`, and the dev legend adds "BOTH absence
markers are unexpected … Read that entry in canon either way" — the wrong instruction for that column.
Present in `.dev/floor/lessons-index-core.mjs:282` **and** `pharn/floor/lessons-index-core.mjs:312`.

**E — canon `L10`/`L11`.** `L10` carries **zero** `**Provenance.**` blocks; `L11` carries **two**. The second
names feature `product-pipeline-probe`, promoted `2026-06-30` — L10's own subject, and earlier than L11's own
`2026-07-01`. `git log -S` places it in `0888102` (#25, "product-pipeline-probe … L10"). A **displaced**
block: the repair is a move, and no SHA is reconstructed or invented.

## Applied lessons

- **L1** — the meta-doc sweep is run and its output is in `## Files`: axes A and D change product-surface
  bytes, so `SKILLS_VERSION` bumps `3.1.1 → 3.1.2` (patch — corrections to bytes that already shipped), and
  `CHANGELOG.md` plus the `README.md` shields badge are named with it, because
  `.dev/floor/check-skills-version-recorded.mjs` requires the literal token `3.1.2` in the CHANGELOG and
  `.dev/floor/check-version-badge.mjs` string-compares the badge to `SKILLS_VERSION` (verified live here:
  `SKILLS_VERSION` = `3.1.1`, badge = `badge/pharn-3.1.1-`). A bump leaving either behind is a RED.
- **L11** — a pre-existing red owned by no feature blocks every later feature's verify. This is why the
  increment runs in its **own worktree**: the main checkout currently hosts a concurrent chain, and the two
  plans overlap on `README.md`. Baseline in this worktree is clean — `validate` GREEN at 36,
  `check-lessons-index` exit 0, `check-capability-catalog` exit 0 — so any red this build produces is its own.
- **L19** — `npm run docs:generate` is a **Bash** write and escapes fix #7 entirely. It is declared under
  `### Regenerated` with the affected files named, rather than placed in the authorized list to imply the gate
  covered it. That is the remedy L19 prescribes for generated artifacts: declare it, do not pretend.
- **L26** — the first draft's baseline was measured against a `git archive` copy in a scratch directory
  **outside** the repo, which is exactly the config-resolves-by-path false-green L26 names; the grill found the
  numbers had inverted. This draft measures at the **real path**: every figure above was produced by running
  **this worktree's own** checkers, and the build must re-run the gates here, in the repo, never in a copy.
- **L29** — the remedy is quantified over sets ("every walker", "every claim site"), so the deliverable is the
  **enumeration**, materialized once with the rules iterating it. `.dev/floor/walker-exclusion.test.mjs` holds
  a single `WALKERS` array every assertion loops over; a walker added later is covered for free.
- **L31** — axis D is a deliberate dev/product copy-pair, and L31 says the second copy is where the obligation
  is dropped. Both cores are named in `## Files`, and the fix must **preserve** their deliberate divergence
  (`renderIndex` is already in `DIVERGENT_FUNCTIONS` at `.dev/floor/lessons-index-core.test.mjs:328`): the dev
  legend keeps "`-` in the tag columns is unexpected", the product legend keeps its benign reading, and each
  gains the `promoted`-column sentence. Collapsing them would trip the ✧ divergence pin — correctly.
- **L33** — axis C **is** L33's shape at a new site, and its remedy was applied to the evidence-gathering, not
  merely quoted: the enumeration was re-derived from the shortest invariant substrings (`install command`,
  `install-token`, `no PHARN CLI`, `no installer`, `no versioned release`, `no CLI`) and the first grep was
  treated as a lower bound to beat — 36 files became 43. The extra seven are **frozen audit trail**
  (`CHANGELOG.md:1651`, three `.dev/features/*/PLAN.md`, one `GRILL.md`), **true when written**, deliberately
  left alone; correcting them would falsify the record. Exactly **two** live source sites remain, both in
  `## Files`.
- **L34** — the new probe must not pass vacuously. Its fixture asserts a **non-zero** baseline capability count
  before asserting the nested copy is excluded, so a walker that excluded _everything_ fails the suite instead
  of satisfying it. The baseline row in the table above (36 / 22 / 13, all non-zero) is that control.
- **L36** — axis A is L36's shape: `EXCLUDE_SEGMENTS` pins one member of the `.claude/` subtree and the set is
  not closed, so a sibling walked in with every presence rule green. The fix is **closure**, not a second
  member — adding `` `${sep}.claude${sep}worktrees${sep}` `` would re-certify the one spelling its author was
  looking at. The `.claude/zzz-arbitrary/` row above is the measured proof that a second member would not have
  been enough.

## Axis E — excluded by the floor, delivered as a human-apply patch (PROBED, not assumed)

Per **L37**'s discipline (a guard's bounds are probed against the guard, never read off a doc), the canon write
was tested before this plan asserted anything:

- with a scope whose origin is `.claude/commands/pharn-dev-plan.md` targeting `.dev/memory-bank/lessons-learned.md`,
  an `Edit` payload for that file → `protect-trusted-paths.cjs` **exit 2**, `enforce-writes-scope.cjs` **exit 2**;
- the deny message states the refusal in terms of this exact case: _"Re-scoping a build from a PLAN's `## Files`
  CANNOT authorize this write — that is the specific thing this guard refuses, deliberately."_;
- control: with a scope whose origin is `.claude/commands/pharn-dev-memory-promote.md`, the same payload → **exit 0**.

So `/pharn-dev-build` **cannot** perform axis E, and `/pharn-dev-memory-promote` does not fit either — it
appends a **new** entry behind its own gate; it does not move a misplaced block. The three routes past the guard
are each refused rather than taken: a Bash `sed` (CLAUDE.md: routing an in-repo write through Bash to dodge the
guard "is still the thing you must not do"), forging a promote-shaped `set_by` via the setter's argv (the
self-escalation the guard exists to stop), and unwiring the hook (itself protected). The increment therefore
ships `proposed/APPLY.md` — the precedent `canon-write-denylist` set — containing the exact block move, the
`git log -S` evidence, and the instruction that `npm run docs:generate` must be re-run afterwards, because
applying it changes `L10`'s `promoted` cell, `L10`/`L11` token counts, and the index header total.

## The replacement footer text (named here, not left to the build)

The grill found that the first draft authorized changing a user-facing claim without saying what replaces it.
The build writes **exactly** this, and the test pin at `.dev/floor/capability-catalog-core.test.mjs:151`
retargets to it:

```text
_PHARN installs with `npx @pharn-dev/pharn@latest init`, which selects the capabilities that apply to your
project; there is no per-capability install command. This page documents the source file linked above._
```

**It is ONE line.** The fenced block above wraps for page width; the renderer emits a single line, exactly as
the current footer is a single line. A build that reproduces the wrap changes the rendered bytes of all 36
pages in a way this plan does not authorize — flagged at grill, stated here so the instruction cannot be read
off the wrap.

Each clause is checked against live state rather than asserted: the command is `README.md:105`; "selects the
capabilities that apply to your project" is `README.md:141`; "no per-capability install command" is true
because no such mechanism exists anywhere in the installer's documented surface. It deliberately does **not**
say this capability _will_ be installed — selection is archetype-gated (`applies:`), so `a11y` reaches only
`ssr`/`spa` projects.

## The closure assertion's form (named here, so L36 is not reproduced inside its own fix)

The grill found that "asserts an **arbitrary** subtree is excluded" describes sampling, and sampling names is a
presence set — L36's own defect. The probe therefore asserts closure in **three layers**, and only the first is
the closure claim:

1. **Structural (the closure assertion).** For each entry in `WALKERS`, read the `EXCLUDE_SEGMENTS`
   declaration's source text — the `constSource()` precedent at `.dev/floor/lessons-index-core.test.mjs:430` —
   and require that it contains the segment `` `${sep}.claude${sep}` `` and **no** `.claude`-prefixed member
   narrower than it. A future `.claude/worktrees/` member fails this, which is the point: it forbids the
   per-member repair, not merely the current spelling. **The L6 tension is real and is bounded, not waved
   away** (raised at grill): reading a declaration's source text is a substring test over contents, which is
   the shape L6 says is not a membership test. It is used here because the constant is not exported and no
   structured location exists to read it from — the same reason `constSource()` exists — and the bound is
   that layer 1 proves what the source SAYS, never what the walker DOES. Layer 2 is what tests behaviour, and
   neither layer alone is the guarantee.
2. **Behavioural.** Build the fixture and assert the counts are unchanged for **two** structurally different
   nested paths (`.claude/worktrees/wt1/`, `.claude/zzz-arbitrary/`) — evidence the structural claim has the
   effect it should, never a substitute for it.
3. **Non-vacuity (L34).** Assert the baseline fixture's count is **non-zero** first, so a walker excluding
   everything fails rather than passes.

## Files

- `pharn/floor/validate.mjs` — `EXCLUDE_SEGMENTS`: `.claude/commands/` → `.claude/` — layer floor (product)
- `pharn/floor/count-lenses.mjs` — same one-segment change — layer floor (product)
- `pharn/floor/count-grillers.mjs` — same one-segment change — layer floor (product)
- `pharn/floor/count-verifiers.mjs` — same one-segment change — layer floor (product)
- `.dev/floor/capability-catalog-core.mjs` — same one-segment change (axis A) AND the footer text (axis C) — layer apparatus
- `.dev/floor/walker-exclusion.test.mjs` — NEW: the three-layer enumeration probe over every walker — layer apparatus
- `.dev/floor/capability-catalog-core.test.mjs` — retarget the line-151 footer pin to the text named above — layer apparatus
- `.dev/floor/lessons-index-core.mjs` — legend: name the `promoted` column's `-` (axis D, dev half) — layer apparatus
- `pharn/floor/lessons-index-core.mjs` — legend: same, preserving the deliberate divergence (axis D, product half) — layer floor (product)
- `package.json` — narrow `.claude/**/*.test.{mjs,cjs}` to `.claude/hooks/*.test.{mjs,cjs}` (axis B) — layer meta
- `.dev/features/claude-dir-scan-exclusion/proposed/APPLY.md` — NEW: the human-apply canon patch (axis E) — layer apparatus
- `SKILLS_VERSION` — `3.1.1` → `3.1.2` — layer meta
- `README.md` — shields badge `pharn-3.1.1-` → `pharn-3.1.2-` — layer meta
- `CHANGELOG.md` — `[Unreleased]` entry recording the literal token `3.1.2` — layer meta

### Regenerated (Bash, OUTSIDE fix #7 — L19, declared not disguised)

`npm run docs:generate` rewrites these; they are **not** in the authorized list above, because the generator
writes them through Bash and the `PreToolUse` gate never sees it. Naming them here is the declaration L19
prescribes; it is not a claim that the hook covered them.

- `docs/capabilities/*.md` — 36 pages, footer only (axis C)
- `docs/capabilities/README.md` — content unchanged; regenerated for byte-equality
- `docs/lessons-index.md` — legend only (axis D); the table body does **not** change unless axis E is applied

### Explicitly not touched

- `.dev/memory-bank/lessons-learned.md` — refused by the floor; see `## Axis E`.
- `CHANGELOG.md:1651`, `.dev/features/docs-capability-catalog/{PLAN,GRILL}.md`,
  `.dev/features/readme-adoption-rewrite/PLAN.md` — frozen audit trail carrying the axis-C claim. True when
  written; correcting them would falsify the record (L33).
- The four trusted docs — hook-protected, human-only; none asserts the exclusion set or the footer.
- Every existing walker test. Verified live: each exercises the exclusion **behaviourally** through a
  `.claude/commands/` fixture (`count-lenses.test.mjs:133`, `count-grillers.test.mjs:154`,
  `count-verifiers.test.mjs:202`, `capability-catalog-core.test.mjs:54`) and stays green under a widened
  segment. No test asserts the constant itself.

## Contracts satisfied

- None in `pharn/pharn-contracts/` — no artifact type is added and no artifact shape changes. Axis A corrects
  the enumeration surface the checks in `pharn/ARCHITECTURE.md §7` range over; the checks are untouched. Cited,
  not restated (P4).

## Evals to write (P1)

- **None, and structurally so rather than by exemption.** P1 binds **Capabilities** — `role:`-bearing markdown
  with `evals/cases/*` + `evals/expected/*`. This increment authors no Capability, no rule and no `rule_id`, so
  `validate` CHECK 3 (fix #6) has nothing to bind. Same posture the `product-capability-catalog` increment took.
- The floor-checker equivalent **is** delivered: `.dev/floor/walker-exclusion.test.mjs`, in the three layers
  named above.

## Guarantee audit (P0)

- "a nested checkout under `.claude/` is not counted as product surface" → **FLOOR: enum/regex**
  (`pharn/ARCHITECTURE.md §2` primitive #3) — a path-segment membership test each walker executes.
- "the `.claude/` exclusion is CLOSED, not a two-member list" → **FLOOR: enum/regex**, pinned by the probe's
  layer-1 structural assertion, which forbids any narrower `.claude`-prefixed member.
- "all five walkers agree" → **FLOOR** for the behaviours the probe executes, and **NARROWED, stated**: per L36
  this is a presence set over behaviours the probe **names**. It cannot discover an unnamed divergence; a green
  run never means "the five walkers behave identically".
- "a nested checkout ANYWHERE ELSE is excluded" → **NOT CLAIMED.** A clone at `tmp/` still doubles every count.
  Only `.claude/` is closed, because only `.claude/` produced an observed failure (P7). Reopens when a nested
  checkout outside `.claude/` is observed to break a gate.
- "the `npm test` glob no longer reaches a nested checkout" → **ADVISORY.** Corrected at grill: draft 2 called
  this "FLOOR: enum/regex in the weakest sense", which is the hedge P0 forbids — a claim reduces to a floor
  primitive or it does not, and there is no gradient. It does not: the narrowed pattern is a literal string in
  `package.json` that **no checker reads**, and the measured three-way comparison is evidence gathered once by a
  human-run probe, not a check that re-runs. Nothing prevents the pattern widening again. The named residual is
  `test-glob-check`, unbuilt (L20's bar is a second occurrence; this is the first). Recording this precisely
  matters here more than usual: axis C exists because a page asserted something no checker reads, so mislabeling
  axis B the same way would reproduce the increment's own subject inside its own audit.
- "the new footer is TRUE" → **ADVISORY.** No floor op reads a rendered sentence for its truth — that is the gap
  axis C exists to repair and it is **not** closed by repairing it. `docs:check` still guarantees only
  committed == recomputed. A checker over the claim class is the named residual `expired-claim-check`, unbuilt
  for the same L20 reason. What the plan _does_ buy is that the replacement wording is fixed here, at a gate a
  human read, rather than chosen mid-build.
- "the legend is now unambiguous" → **ADVISORY**, same reason. What IS floor: `docs:check` byte-equality over
  the regenerated index, and the ✧ divergence pin that stops the two cores collapsing into one.
- "`SKILLS_VERSION` 3.1.2 is the correct bump" → **ADVISORY.** Verified live: no checker reads `SKILLS_VERSION`
  to judge a bump's SIZE. What is floor is narrower and both halves are named — the CHANGELOG records the literal
  token (`check:changelog`), the badge agrees with the file (`check:badge`).
- "`npm run check` is green afterwards" → **NOT a guarantee of this increment.** It is an outcome the gates
  measure and own; `/pharn-dev-verify` reads their verdicts.
- "`validate` reporting 36 means the capability count is CORRECT" → **struck.** This corrects **what it walks**,
  never establishes that 36 is right. The catalog's agreement with `validate` stays a second implementation and
  stays **advisory**, as `capability-catalog-core.mjs` already records.
- "axis E is fixed" → **struck, and it is the sharpest claim here.** Axis E is **not applied** by this increment.
  It ships a patch a human must apply; until they do, canon `L10` still carries no provenance and the index still
  renders `-`. `SHIP.md` must say so.

## Trust audit (P2)

- The increment ingests **no untrusted artifact**. Its inputs are this checkout's own floor sources and a fixture
  the probe authors in a temp directory.
- One boundary is worth naming: a nested checkout under `.claude/` is **attacker-influenceable in principle** —
  any directory a contributor or an agent can create — and before this change its contents were enumerated as
  **this repo's product surface**, i.e. a path by which files outside the reviewed tree entered a floor checker's
  input set. The measured `.claude/zzz-arbitrary/` row is that path demonstrated. Closing the segment removes it
  for `.claude/`; it does not remove it for other nested checkouts, so this **narrows an exposure; it does not
  close a class**.
- Axis E's exclusion is itself a P2 outcome, not an inconvenience: `THREAT-MODEL.md §2 #3` ranks memory-bank
  poisoning the worst persistence vector, and the guard that blocked this build is what makes a canon write a
  separate, auditable act a build plan cannot cause. The plan complies with it rather than around it.

## Determinism audit (P5)

- Axes A/B introduce one branch shape: a substring membership test over a normalized repo-relative path, and a
  literal glob pattern — the same shapes already in use. No LLM classification, no readdir-order dependence.
- Axes C/D change rendered string constants only; the renderers stay pure functions of (frontmatter, canon) with
  no timestamps, so two runs remain byte-identical.
- The probe's closure layer reads a declaration's source text and tests membership; its behavioural layer uses
  two fixed, structurally different names rather than a sampled one.
- Terminal fallback: axis E ends in **ask the human** — the patch is proposed, never self-applied.

## Deferred (recorded, not dropped)

- **Nested checkouts outside `.claude/`** — reopens when one is observed to break a gate.
- **`expired-claim-check`** — a floor checker over the "not yet / no X yet" claim class on the shipped surface.
  L20's bar is a **second** occurrence; axis C is the first to reach a generated artifact. Reopens on the next.
- **`test-glob-check`** — a checker pinning the `test` script's globs against a nested-checkout fixture. Same
  L20 reasoning: first occurrence.
- **The concurrent-session hazard.** `.pharn/writes-scope.json` is one mutable file per checkout with no session
  isolation, so two chains in one checkout race: this run's grill write was denied because another chain's setter
  had overwritten it seconds earlier. Worked around here by using a separate worktree. **Not planned** — the
  remedy is unclear (a lock? a per-session scope file?) and the design question belongs to a human, not to this
  increment. Reopens when it recurs or when a human specifies the shape.
- **The audit's four non-defect observations** — the catalog renders 7 of ~14 frontmatter fields (omitting
  `writes`, `trust`); no page shows the floor/advisory split though the taglines encode it exactly (all 18
  scanner-backed lenses say "flag", the 4 scanner-less say "surface"/"keep"); the index drops zero-count roles;
  the `—` absent-marker in the capability tables has no legend. **Not planned:** enhancements with no observed
  failure, and P7 makes a hypothetical an insufficient trigger. Reopens when a reader is recorded misreading one.

## Open questions (HALT)

- None outstanding. GATE 1 answered scope (**widen to all four**), the glob (**fold in**) and the worktree
  (**leave in place** — overtaken by events; the worktree removed itself). The grill's 3 blocking-severity
  findings were answered by this revision: the trigger and the verification are re-anchored on a reproducible
  fixture, the false ordering constraint is dropped, the replacement footer text is named, and the closure
  assertion's form is specified. Axis E's exclusion was determined by probing the guard — the floor answered it,
  not a person.
