# PLAN — amend-comment-width-7103

- spec_content_hash: d19c3ae5ef62837c025d3dffb5e878c114e0c1d4a745caf51b4c114b9e7a8bcf
- applied_lessons: none
- increment: 7.10.3 (PATCH) — rewrap the APPEND-ONLY header comment in `pharn/floor/spec-amend-core.mjs` (lines 20–24)
  so every line fits the file's ~120-column comment width; line 21 runs to 152 characters since 7.10.2. The words stay
  exactly as they are, only the line breaks move. Carried from the 7.10.2 `REVIEW.md` minor advisory finding (P4,
  `pharn/floor/spec-amend-core.mjs:21`).
- layer(s): product floor (`pharn/floor/spec-amend-core.mjs`, comment only), repo meta (CHANGELOG, SKILLS_VERSION,
  README badge)
- constitution_refs: [P0, P4, P7]

## Applied lessons

- none — the change moves line breaks inside one comment and alters no claim, bound, check or test, so no promoted
  lesson bears on it (the lessons index was GREEN; no candidate selected).

## Files

- `pharn/floor/spec-amend-core.mjs` — rewrap the APPEND-ONLY header comment (lines 20–24) to ≤120 columns, same words
  in the same order; no code line changes — layer product floor
- `CHANGELOG.md` — `[7.10.3]` `### Fixed`: the comment rewrap, naming the 7.10.2 review finding — layer repo meta
- `SKILLS_VERSION` — 7.10.3 — layer repo meta
- `README.md` — badge 7.10.3 — layer repo meta

## Contracts satisfied

- None changed. The comment cites the supervisor contract as before (P4); its wording is untouched.

## Evals to write (P1)

- No Capability changes, so no eval. No behavior changes, so no new test; the existing `spec-amend.test.mjs` suite runs
  unchanged at verify.

## Guarantee audit (P0)

- "No behavior changes" → floor: the suite (`npm test`, `spec-amend.test.mjs` included) at verify, plus `git diff`
  touching only `//` comment lines in `spec-amend-core.mjs` (checked at review).
- "Every line of the comment fits ~120 columns" → advisory: no lint rule measures comment width; checked by hand at
  review with `awk 'length > 120'` over the file.
- "The product-surface change bumps SKILLS_VERSION" → floor: enum-regex (`check:surface-bump` on the PR).

## Trust audit (P2)

- No new input.

## Open questions (HALT)

- None.
