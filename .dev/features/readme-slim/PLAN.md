# PLAN — slim the root README: move the long sections verbatim into docs/ pages (ARCH-10)

- spec_content_hash: 2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e # fix #4 (sha256 of pharn/ARCHITECTURE.md, read live this run)
- applied_lessons: [L1, L50, L64, L75]
- increment: Cut `README.md` from 81,157 bytes to at most 25 KB by moving "Guaranteed vs advisory", "The pipeline" (with its five subsections), "Current limitations", "How the workflow works", "Why not just CLAUDE.md or AGENTS.md?", "Capability coverage" and the `--quick` detail of "Quick start" VERBATIM into three new pages (`docs/guarantees.md`, `docs/pipeline.md`, `docs/limitations.md`), leaving a short summary and links in the README; repoint every cite of a moved section.
- layer(s): repo-meta (`README.md`, new `docs/*.md` pages, `CHANGELOG.md`, `SKILLS_VERSION`); product contract prose (`pharn/pharn-contracts/test-results-record.md` — one cite); product floor comment (`pharn/floor/test-infra-core.mjs` — one cite); product-floor test (`pharn/floor/check-bash-reconcile.test.mjs`). No `role:` capability.
- constitution_refs: [P0, P4, P6, P7]
- mode: LIGHT (batch 2026-10-19, group M, branch `docs/readme-slim`) — no stage commands; edits + `npm run check` + `node pharn/floor/validate.mjs .`.

> **Trigger (P7 — real).** Audit 2026-10-12 finding ARCH-10 (Medium, OSS readiness): the README is ~81 KB, and three
> sections ("Guaranteed vs advisory" ~18.2 KB, "The pipeline" ~17.9 KB, "Current limitations" ~15.8 KB) are ~64% of it
> and overlap `LIMITS.md`; a stranger cannot reach a first `/pharn-ship` in 15 minutes by reading.

## Files

- `README.md` — EDIT: remove the moved sections, add a short "Guaranteed vs advisory" summary with links, a short "More
  documentation" pointer list, update `## Contents` and the in-page links that pointed at moved anchors; bump the
  badge to the new `SKILLS_VERSION`. The `<!-- CURRENT-STATE:BEGIN -->` … `END` block stays byte-identical (proved by
  `npm run docs:generate` reporting "already current" and `npm run docs:check` GREEN).
- `docs/guarantees.md` — NEW: "Guaranteed vs advisory" and "Why not just CLAUDE.md or AGENTS.md?", verbatim, with an
  intro line; relative links re-based for `docs/`.
- `docs/pipeline.md` — NEW: "How the workflow works", "The pipeline" + its five `###` subsections, the `--quick` detail
  from "Quick start" (under a new `## Quick mode` heading) and "Capability coverage", verbatim, with an intro line;
  relative links re-based; the in-page `#per-test-results` links keep working because the heading moves with them;
  the one position word that named the README ("the current-state block … below") repointed.
- `docs/limitations.md` — NEW: "Current limitations", verbatim, with an intro line; relative links re-based; the two
  position words that named the README ("on this page", "the generated inventory above") repointed to the pages they
  now mean.
- `pharn/pharn-contracts/test-results-record.md` — EDIT: the cite `(README, "Per-test results")` → the new page.
- `pharn/floor/test-infra-core.mjs` — EDIT (comment only): "stated in the contract and the README" → the new page.
- `pharn/floor/check-bash-reconcile.test.mjs` — EDIT: the ✧ "NON-ADVERSARIAL everywhere it is stated" surface list adds
  `docs/guarantees.md` and `docs/limitations.md` (the moved statements of the claim) beside `README.md` (whose summary
  still states it, with the qualifier).
- `CHANGELOG.md` — EDIT: new `## [6.65.3]` section (moves `[Unreleased]` entries, none today).
- `SKILLS_VERSION` — EDIT: 6.65.2 → 6.65.3 (patch).
- `.dev/features/readme-slim/PLAN.md` — this file.

## Bump decision

The README alone is repo-meta and would not bump (CLAUDE.md "SKILLS_VERSION discipline"). But the referent sweep (L50)
found two cites of a moved README section on the product surface — a contract sentence and a product-floor comment —
and repointing them changes shipped bytes, which CLAUDE.md says bumps "prose-only edits included". So: **patch**
6.65.3, a correction to bytes that already shipped. The alternative (leave both cites dead) was rejected: a cite into a
section that no longer exists is the L50 defect itself. The `docs/` pages are repo-meta, like the README they come from.

## Referent sweep (L50, L75) — every cite of a moved README section, with its disposition

Searched (tracked files, excluding `CHANGELOG.md` released entries and `.dev/features/**` historical audit trails):
`README(\.md)?#` (anchor links) — **0 hits**; `README` (prose cites) — classified below; the moved section titles
(`Current limitations`, `Guaranteed vs advisory`, `Per-test results`, `Excluding a gate`, `Your own SPEC template`,
`Acceptance-criteria tests`, `What verify proves`, `The pipeline`).

- `pharn/pharn-contracts/test-results-record.md:66` `(README, "Per-test results")` — **edited** (points at the page).
- `pharn/floor/test-infra-core.mjs:768` "stated in the contract and the README" — **edited**.
- `pharn/floor/runtime-floor.mjs:19` "The README has stated "Node 24.2 or newer"" — **still true** (Quick start stays).
- `pharn/floor/check-bash-reconcile.test.mjs:904` README must match `/non-adversarial/i` — **still true** (the summary
  keeps the qualifier) and **extended** to the two new pages.
- `.dev/floor/capability-catalog-core.mjs:236-237` cites README's install section and `## What gets installed` — **still
  true** (both stay).
- README in-page links into moved sections (`#current-limitations` ×2, `#per-test-results` ×1) — **edited**.
- `pharn/floor/test-results-core.mjs:19`, `pharn/pharn-contracts/gate-run-record.md:97` "Per-test results" — a section
  of `gate-run-record.md`, not the README — **still true**.
- `.dev/guides/floor-gates.md:103` "Per-test results" — its own heading — **still true**.
- `CLAUDE.md:329`, `CONTRIBUTING.md:43`, `.claude/commands/pharn-dev-memory-promote.md:445` cite the CURRENT-STATE
  region — **still true** (the region stays in the README, byte-identical).
- `.dev/floor/check-version-badge.mjs` (badge regex) — **still true** (badge line stays in place).
- Trusted docs (`LIMITS.md`, `THREAT-MODEL.md`, `pharn/*.md`): no cite of a moved README section (`LIMITS.md:271` is a
  Bash example writing to `README.md`) — **still true**.
- `.dev/memory-bank/lessons-learned.md` cites README by line (`README.md:877`, `:158-160`, `:24`) as historical
  measurements inside canon — **still true as history**; canon is not edited here.
- Lint/format configs: `.prettierignore` and `.markdownlint-cli2.jsonc` name no README path; the new `docs/*.md` pages
  are linted and formatted like any markdown (not added to any ignore list).

## Applied lessons

- **L1** — the meta-docs this increment invalidates are in `## Files`: `CHANGELOG.md`, `SKILLS_VERSION`, the README
  badge; `CLAUDE.md`/`CONTRIBUTING.md` were checked and state nothing this changes (their README cites are to the
  CURRENT-STATE region, which stays).
- **L50** — the sweep is by REFERENT (every cite of a moved README section, on every surface), not by claim; the hits and
  dispositions are listed above, and each repointed cite is dereferenced (the target page carries the named heading).
- **L64** — the README's new summary restates guarantees and bounds; it is written as pointers plus the existing
  qualifiers ("non-adversarial", "detected, not prevented", "Write/Edit/MultiEdit/NotebookEdit surface only"), never a
  wider quantifier than the moved primary text, and the CHANGELOG entry claims only a move.
- **L75** — the sweep declaration above lists each hit with one disposition, so a later stage can re-run the greps.

## Guarantee audit (P0)

- "the moved text is verbatim" → **advisory, checked at build time by a one-off diff** (moved paragraphs compared
  against `git show HEAD:README.md`; differences limited to re-based relative links, the three position words, and
  the intro lines). No floor check pins it afterwards.
- "the CURRENT-STATE block is unchanged" → **floor** (`docs:check` byte-equality, primitive #3) — the block equals a
  fresh recompute; plus a one-off byte compare of the region against HEAD.
- "the badge equals SKILLS_VERSION" → **floor** (`check-version-badge.mjs`).
- "README ≤ 25 KB" → measured once (`wc -c`); no checker holds it afterwards (stated, not added — P7).

## Trust audit (P2)

- N/A — no untrusted input is ingested; the moved text is this repo's own trusted-tier prose.

## Evals / tests (P1)

- No capability changes. The one test edit extends an existing ✧ surface list. `npm run check` (incl. `npm test`) and
  `node pharn/floor/validate.mjs .` are the gates.

## Merge note (after build)

`origin/main` moved to 6.66.0 (#364) during the build. It added `### Declaring the base install (6.66.0)` inside "The
pipeline" and moved the generated floor count to 140. The merge carries that subsection into `docs/pipeline.md` at
the same place, regenerates the CURRENT-STATE block, and renumbers this change to **6.66.1**. The verbatim check was
re-run against `origin/main:README.md` (82,330 bytes); README after: 24,851 bytes. `main` then moved to 6.67.1
(badge and generated count only, in README), so a second merge renumbered this change to **6.67.2**.

## Open questions

- None blocking. Bump size is decided above (patch), with the reason.
