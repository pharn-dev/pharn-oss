# PLAN — docs-pipeline-lock-wording

- spec_content_hash: 2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e
- applied_lessons: none
- increment: One stale sentence in `docs/pipeline.md` ("What verify proves about acceptance criteria") still lists
  only the level gates' scripts as what `/pharn-test` pins. Since 6.68.0 (#369, audit SEC-4) the lock also pins the
  script of every other allowlisted gate and the scripts those chain to. Add that clause, with its bound.
- layer(s): repo docs (hand-written, not the product surface; no SKILLS_VERSION bump)
- constitution_refs: [P0, P4]

## Trigger (P7)

PR #371 (6.68.1) moved the README's pipeline sections verbatim into `docs/pipeline.md` while PR #369 (6.68.0) widened
the pin, so the moved sentence understates what is pinned. Found by the README-slim agent after its last merge of main.

## Applied lessons

`none`: a one-sentence doc correction; no promoted lesson governs it.

## Change

Append to the sentence's list, after the `gates.exclude` clause: since 6.68.0, the script (with `pre`/`post`) of
every other allowlisted gate verify runs, and the scripts those chain to — only the command, not the files or configs
it reads. The wording restates `pharn/pharn-contracts/ac-tests.md` (`other_gates`, `other_chained`); it adds no claim.

## Files

- `.dev/features/docs-pipeline-lock-wording/PLAN.md` — this plan. — layer: dev trail
- `docs/pipeline.md` — the one sentence. — layer: repo docs
- `CHANGELOG.md` — one dated `[Unreleased]` entry. — layer: repo meta

## Gates

`npm run format:check`, `npm run lint:md`, `npm run check:changelog`, `npm run docs:check`,
`npm run check:changelog-entry`, `npm run check:surface-bump`, `node pharn/floor/validate.mjs .`; CI runs the full suite.
