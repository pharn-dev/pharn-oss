# PLAN — triage-model-key

- spec_content_hash: f3d8748edb14bc13dfb4113b5678001380038740c9ac359c5d7d4b7e68a54750
- applied_lessons: [L33, L50]
- increment: `docs/limitations.md` tells a project it may give `/pharn-triage` a `models.stages.triage` key of its own
  once its pharn-cli is 0.18.1 or newer, and why the shipped block still names none.
- layer(s): docs (repo-meta, not product surface); one test comment (apparatus)
- constitution_refs: [P0, P6, P7]

## Applied lessons

- L33 — the "pharn-cli does not accept one yet" claim (CHANGELOG 7.7.1, the reason `docs/limitations.md` suggested no
  key) expired when pharn-cli 0.18.1 shipped. The sweep below used a wrap-tolerant scan (`triage` within 60 characters
  of key/entry/refus/accept, and `pharn-cli` within 80 of `triage`, both orders) over every tracked `.md`, `.mjs`,
  `.cjs` and `.json` outside `.dev/features/`, treating the 7.7.1 entry's own site list as a lower bound.
- L50 — the referent that changed is pharn-cli's `PRODUCT_STAGES` (`src/lib/model-config.ts:40-53` in the sibling
  checkout, version 0.18.2; `CHANGELOG.md` 0.18.1, "A `triage` entry in `models.stages` is accepted"), dereferenced
  live this run. Published versions read live: `npm view @pharn-dev/pharn versions` lists 0.18.1 and 0.18.2.

## The trigger (P7)

7.7.1 (`CHANGELOG.md`, "The cost of `/pharn-triage` resolving through `default` is stated") wrote: "It suggests no
`triage` key, because pharn-cli does not accept one yet." pharn-cli 0.18.1 (2026-11-11) accepts it. The sentence in
`docs/limitations.md:145-147` is now incomplete: a project that wants triage on another model than `default` is told
only to keep `pharn-triage.md` in step with `default`.

## Sweep (L33, L50) — result

| site                                              | says                                                                         | action                                         |
| ------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------- |
| `docs/limitations.md:145-147`                     | `/pharn-triage` has no key in the shipped block, resolves through `default`  | add the 0.18.1 key option and why none ships   |
| `pharn/floor/check-model-config.test.mjs:258-260` | shipped config carries no `triage` entry; "an older pharn-cli refuses" it    | name the boundary: pharn-cli before 0.18.1     |
| `CHANGELOG.md` 7.7.1 entry                        | "pharn-cli does not accept one yet"                                          | released, frozen: corrected by this PR's entry |
| every other hit                                   | grill-triage keys, triage refusals of other files (not the model-config key) | none                                           |

Coverage boundary (L49): tracked text files outside `.dev/features/`; `.dev/features/**` records are dated history and
stay as written.

## Files

- `docs/limitations.md` — the per-stage-models bullet: a project on pharn-cli 0.18.1 or newer may add
  `models.stages.triage` (then `pharn-triage.md`'s frontmatter must match that entry, not `default`); the shipped block
  names none because `MIN_CLI` is 0.14.0 and pharn-cli before 0.18.1 rejects a block naming `triage` — docs
- `pharn/floor/check-model-config.test.mjs` — comment only: "an older pharn-cli" → "pharn-cli before 0.18.1"; no
  assertion changes — apparatus
- `CHANGELOG.md` — one `## [Unreleased]` entry dated 2026-11-11 under `### Changed`, correcting 7.7.1's "does not accept
  one yet" — repo-meta

### Not changed

- `pharn.config.json` keeps no `triage` key and `MIN_CLI` stays 0.14.0: adding the key would make every install on
  pharn-cli 0.14.0–0.18.0 reject the shipped block (memory: publish the CLI before a MIN_CLI bump; raising `MIN_CLI` is
  a separate decision with its own cost, not this docs fix).
- `SKILLS_VERSION`: no product-surface path changes (`docs/` and `*.test.*` are outside the bump set).

## Contracts satisfied

- None changed. The `check-model-config.mjs` agreement rule (a stage with an own key is held to that key; without one,
  to `default`) is cited, not restated (P4).

## Evals to write (P1)

- None: no Capability or rule. The comment edit leaves the `★ live ★ L41` test's assertions unchanged.

## Guarantee audit (P0)

- "pharn-cli 0.18.1 accepts a `triage` key" → advisory: a fact about another repository, read live this run from its
  source and changelog; nothing in this repo checks it.
- "with an own key, `pharn-triage.md` must match that key" → floor: enum/regex (`check-model-config.mjs agreement`,
  existing).
- "the shipped block names no `triage` key" → floor: the existing `★ live ★ L41` test.

## Trust audit (P2)

- No untrusted input is ingested. The pharn-cli source and changelog are read as DATA to state a version boundary.

## Open questions (HALT)

- None.
