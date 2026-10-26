# PLAN — limits-ac-test-infra-cite

- spec_content_hash: d5a974303fd0b9568945c60423ae5a89c57d7b65f5baa03657e317fbe64f33a5
- applied_lessons: [L68]
- increment: release the maintainer's `pharn/LIMITS.md` §9 cite fix (commit `66a368c9`) as 7.0.2.
- layer(s): trusted doc (human edit, already committed), release metadata
- constitution_refs: [P0, P6]
- base: `origin/main` @ `9a5936f6` (7.0.1)

## Why

7.0.1 (PR #399) renamed `pharn/floor/test-infra-core.mjs` to `ac-test-infra-core.mjs` and merged before the
maintainer applied `.dev/features/floor-test-glob-names/HUMAN-PATCH.md`, so `pharn/LIMITS.md:632` shipped citing a
module that no longer exists. The maintainer applied it on this branch (`66a368c9`, LIMITS.md only). A trusted doc is
product surface, so it ships as a patch release; the released [7.0.1] section is frozen, so its "Not covered" sentence
stays and a new [7.0.2] entry records the fix.

## Applied lessons

- L68 — the human-only edit landed BEFORE this increment's anchor, as its own commit, so reconcile judges it against
  its committed blob and never as an escape.

## Files

- `SKILLS_VERSION` — 7.0.1 → 7.0.2
- `README.md` — the version badge only
- `CHANGELOG.md` — new `## [7.0.2]` section, `### Fixed`
- `.dev/features/limits-ac-test-infra-cite/PLAN.md` — this plan

### Not touched

- `pharn/LIMITS.md` — human-only; already committed by the maintainer (`66a368c9`).

## Guarantee audit (P0)

- "§9 now cites the module that exists" → advisory (a human edit; checked by `git grep` and `ls`).
- "This increment wrote only `## Files`" → floor: content-hash (reconcile against this increment's anchor).

## Open questions (HALT)

- None.
