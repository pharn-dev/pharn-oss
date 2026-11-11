# PLAN — loop-s16-rerun-notes

- spec_content_hash: afa7dd5295db60c1a6ee28313854360fb8d560fcdfa69a03309fa01d43c3bf7f
- applied_lessons: [L1, L33, L47, L78]
- increment: Close two follow-ups from the 7.7.0 post-build grill: say what a re-run after an S16 stop is, and state
  the model-config agreement cost of `/pharn-triage` resolving through `models.stages.default` (7.7.1, patch).
- layer(s): product .claude surface (`.claude/commands/pharn-loop.md`); repo meta (README, `docs/`, CHANGELOG,
  SKILLS_VERSION, the `pharn.config.json` note); build apparatus (`.dev/floor/command-hygiene.test.mjs`,
  `.dev/floor/check-config.mjs` comment, `.dev/guides/floor-checks.md`)
- constitution_refs: [P0, P6, P7]

## Why (P7 — the triggering findings)

Two findings in `.dev/features/loop-grill-triage/GRILL.md`, both left open when 7.7.0 merged
(`.dev/features/loop-grill-triage/SHIP.md` names them as follow-ups). Their text is quoted DATA from an advisory stage
(P2):

- **comprehension griller, P7, important** (`loop-grill-triage/PLAN.md:245`): S16's remedy is "a person revises the
  plan or the SPEC, then re-runs", but nothing says what a re-run is — the stop reverts the model-approved SPEC to
  `Draft` and leaves the feature directory, so a reader cannot tell whether a re-run repeats the spec and plan stages
  or how a revised plan is carried in.
- **inline P0, minor** (`loop-grill-triage/PLAN.md:30`): `pharn-triage` has no key in the shipped `pharn.config.json`
  and resolves through `default`, so an install whose kept `models` block sets a `default` other than sonnet/high gets
  a `check-model-config.mjs agreement` RED on `pharn-triage.md`'s frontmatter; routing is unaffected, and nothing a
  user reads states it.

## Discovery (read live this run, 2026-11-11, `origin/main` `3bd10c78`, SKILLS_VERSION 7.7.0)

- **What a `/pharn-loop` re-run does** (`.claude/commands/pharn-loop.md` Step 1a, S1/S2): `feature-name.mjs --fresh`
  prints the first of `<slug>`, `<slug>-2`, … that `pharn/features/` does not hold, and the run "Never reuse[s] or
  overwrite[s]" a feature directory. So a re-run starts from the intent in a NEW directory and reads nothing the
  blocked run wrote: a revised plan or SPEC in the old directory does not reach it.
- **What the stop leaves** (`pharn-loop-close.md` Step 6a): a non-green stop reverts an `Approved` SPEC to `Draft`
  (`spec_content_hash: ""`, `approved_by` removed), and "a human must now approve before any stage reuses this SPEC".
  The directory keeps `PLAN.md`, `GRILL.md`, `grill-findings.json`, `grill-triage.json` and `LOOP.md`.
- **The by-hand route that does carry the work forward:** `/pharn-spec` resumes an existing SPEC — "does a `SPEC.md`
  already exist (resume / revise)" (`pharn-spec.md` Step 1.1) — and its Step 4 takes a `Draft` to `Approved` with the
  human's approval; `/pharn-plan <name>` plans "an existing approved intent" in an existing `pharn/features/<name>/`
  (`pharn-plan.md` Step 0.1 / 1.1) and writes that directory's `PLAN.md`; `/pharn-grill <name>` and the later stages
  take the same `<name>`.
- **S16's two current statements:** the stuck-point row (`pharn-loop.md:457`, remedy cell "…a person revises the plan
  (`replan`) or the SPEC (`spec`), then re-runs") and Step 4's triage-read bullet (`pharn-loop.md:778-781`, "…revise
  the plan (`replan`) or the SPEC (`spec`) from those findings, then re-run."). Every remedy cell in that table is
  padded to the same 296-character column, and the S16 cell's text is about 230 characters, so a short pointer fits
  without prettier re-aligning the table.
- **Pins on that text:** `.dev/floor/command-hygiene.test.mjs:2876` matches the bullet's head (`` `3` (`replan`) or
`4` (`spec`) → **S16** (`blocked: grill-escalation`) ``), which this increment leaves unchanged; the S16 id/blocked
  pair is pinned at `:1926`. No test pins the words "then re-run".
- **Who runs `agreement`:** no command, npm script or CI step in a user's install; it is a user-run CLI mode
  (`check-model-config.mjs` header, `.dev/guides/floor-checks.md:447`). Its RED already names the route —
  `… != config … (via default)` (`check-model-config.mjs:347`). `PRODUCT_STAGES` holds twelve stages, `triage`
  among them (`:95-111`); the shipped `pharn.config.json` `models.stages` has an own key for the other eleven and none
  for `triage`.
- **Where a user reads about `models.stages`:** `docs/limitations.md:141-151` ("editing the config is only half the
  change: update the command frontmatter too, or the checker will tell you"), `docs/guarantees.md:33`, `README.md:233`.
- **A stale count in those same sentences (L1):** `docs/limitations.md:142` and `docs/guarantees.md:33` say "the
  eleven product commands" and `README.md:240` says "the 11 product commands", while `PRODUCT_STAGES` names twelve
  and `ls .claude/commands/pharn-*.md` minus `pharn-dev-*` minus the five parts (`-loop-close`, `-loop-quick`,
  `-ship-close`, `-ship-quick`, `-ship-stages`) is twelve. 7.7.0's `/pharn-triage` made them false. `README.md:240` is
  outside the generated `CURRENT-STATE` markers (`:390-399`).
- **Amendment after the grill (2026-11-11, approved by the maintainer at the grill's question).** `GRILL.md`'s first
  finding showed the sweep above ran in one spelling. Re-run case-insensitively over
  `(eleven|11|twelve|12) (product|/pharn)` across the repo (excluding `node_modules`, `.git`, worktrees,
  `**/features/**`, `CHANGELOG.md` and canon), it finds these further hits, each judged per line (L75's per-hit
  record):
  - `pharn.config.json:2` `_models_stages_note`, "The eleven /pharn-\* commands'" — present tense, false → open form.
  - `.dev/guides/floor-checks.md:407`, "the ELEVEN /pharn-\* product commands'" — present tense, false → open form;
    and `:409-410`, the inline member list "PRODUCT_STAGES: spec plan grill build regress verify ship loop review
    memory-promote ac-test", which omits `triage` — a mirrored closed list → replaced by a pointer to the checker's
    `PRODUCT_STAGES` (L47), keeping the `ac-test` note.
  - `.dev/guides/floor-checks.md:461`, "the eleven PRODUCT commands' frontmatter" — present tense, false → open form.
  - `.dev/floor/check-config.mjs:17` (a comment), "the eleven PRODUCT commands" — present tense, false → open form.
  - `.claude/hooks/writes-scope-release.test.cjs:112` (a comment), "The eleven PRODUCT commands were reworded" — a
    DATED record of the 6.24.0 rewording, true of the eleven that existed then → **kept** (L78).
  - `pharn/floor/check-model-config.mjs:29,82` and `check-model-config.test.mjs` say "twelve" and are TRUE today
    (they mirror `PRODUCT_STAGES`, which a test pins) → kept.
- **pharn-cli refuses a `triage` key** (`GRILL.md`'s second finding, read live in
  `~/Projects/pharn-cli/src/lib/model-config.ts`: `PRODUCT_STAGES` at `:40-52` has no `triage`, and `:145-153` reports
  any other key as "not a product stage"). So the docs note names one remedy only, updating `pharn-triage.md`'s
  frontmatter, until the pharn-cli port lands.
- **Version:** `pharn-loop.md` is product surface (`check:surface-bump`), so the bump is a **patch** (a clarification
  of shipped bytes): 7.7.0 → 7.7.1. `docs/**`, `README.md`, `CHANGELOG.md` and `SKILLS_VERSION` do not bump
  (`check-surface-bump.mjs:65-66`). `MIN_CLI` is untouched: no contract, frontmatter or installed path changes.
- **CHANGELOG shape:** a bumping PR opens `## [7.7.1] - 2026-11-11` above `## [7.7.0]` and MOVES every `[Unreleased]`
  entry into it — today that is the 2026-11-10 "Measured: the triage stage on five real grills" entry (PR #428).

## Applied lessons

- L1 — the meta-docs this increment's subject touches are swept and named in `## Files`: the CHANGELOG, and the three
  sentences in `docs/limitations.md`, `docs/guarantees.md` and `README.md` whose "eleven / 11 product commands" fact
  7.7.0 made false and which sit in exactly the passage the agreement note extends.
- L33 — the count sweep is re-derived from the shortest invariant substrings, case-insensitively, and the first
  one-spelling sweep is treated as a lower bound: it found three sites, the re-run found five more (Discovery,
  "Amendment after the grill").
- L47 — the stale count is retracted into an OPEN form ("the product commands"), never a new closed count ("twelve"),
  so the next product command does not make it false again; the guide's mirrored member list becomes a pointer to
  `PRODUCT_STAGES` for the same reason.
- L78 — the one hit that records a past state (`writes-scope-release.test.cjs:112`, the 6.24.0 rewording of the
  eleven commands that existed then) keeps its count, decided per line.

## Files

- `.claude/commands/pharn-loop.md` — S16 row remedy gains a pointer "(what a re-run is: Step 4)" kept inside the
  296-character column; Step 4's triage-read `3`/`4` bullet gains two sentences after "then re-run.": a `/pharn-loop`
  re-run starts from the intent in a fresh feature directory (S2) and reads nothing this run wrote, so a revision
  reaches it only through the intent passed to it; to carry this run's SPEC and plan forward instead, continue by
  hand in `pharn/features/<name>/` — `/pharn-spec` to revise (on `spec`) and approve the reverted Draft, then
  `/pharn-plan <name>`, which rewrites `PLAN.md` from the approved SPEC, then `/pharn-grill <name>` and the stages
  after it (or `/pharn-ship` naming the same feature, whose `/pharn-spec` resumes the existing SPEC); that route runs
  no triage, so the new grill's findings go to the person, and the blocked run's `grill-triage.json` and `LOOP.md`
  stay beside the new files as its record. — product .claude surface
- `docs/limitations.md` — the per-stage-models bullet: "the eleven product commands'" → "the product commands'" (L47),
  plus one sentence: `/pharn-triage` has no key in the shipped block and resolves through `default`, so a changed
  `default` also changes what `pharn-triage.md`'s frontmatter must say — update it, or `agreement` reports it
  (`via default`); routing reads the block either way. No `triage` key is suggested (pharn-cli refuses one today).
  — repo meta
- `docs/guarantees.md` — row 33: "The eleven product commands'" → "The product commands'" (L47). — repo meta
- `README.md` — line 240 tree comment: "the 11 product commands" → "the product commands" (L47). — repo meta
- `pharn.config.json` — the `_models_stages_note` string: "The eleven /pharn-\* commands'" → "The /pharn-\*
  commands'" (L47); no key or value of `models` changes. — repo meta
- `.dev/guides/floor-checks.md` — `:407` "the ELEVEN /pharn-\* product commands'" and `:461` "the eleven PRODUCT
  commands'" → open form; `:409-410`'s inline `PRODUCT_STAGES` member list → a pointer to the checker's map, keeping
  the `ac-test` file-stem note. — build apparatus
- `.dev/floor/check-config.mjs` — the `:17` comment "the eleven PRODUCT commands" → open form; no code changes. —
  build apparatus
- `.dev/floor/command-hygiene.test.mjs` — a new, separately named test (GRILL.md's P3 finding: not folded into the
  read-order test) asserting that Step 4's S16 bullet says a re-run starts in a fresh feature directory (S2) and names
  the `/pharn-plan <name>` route, so the clarification cannot be dropped silently. — build apparatus
- `SKILLS_VERSION` — 7.7.0 → 7.7.1. — repo meta
- `CHANGELOG.md` — open `## [7.7.1] - 2026-11-11` above 7.7.0, move the `[Unreleased]` entry into it, and add a
  `### Fixed` entry for the two notes and the count. — repo meta

### Not touched

- The four trusted docs (`pharn/LIMITS.md` §8 restates the routing bounds; any change there is a human's patch, and
  none is needed: it states no per-stage key list and no count of product commands this increment found).
- `pharn.config.json`: adding a `triage` key would remove the agreement cost for this repo only, not for an install's
  kept block, and would change routing defaults; the note states the cost instead.
- `pharn-loop-close.md` (the record's `### next_steps` is filled from Step 4's instruction, unchanged in shape),
  `pharn-loop-quick.md` (a quick run has no triage and no S16), and `check-model-config.mjs` (its RED already says
  `via default`).
- pharn-cli's vendored stage list (the separate follow-up, in the pharn-cli repo).
- `.claude/hooks/writes-scope-release.test.cjs` — its "eleven" is a dated record of 6.24.0 (L78).

## Contracts satisfied

- `pharn/pharn-contracts/loop-record.md` — unchanged; the S16 id and its `blocked: grill-escalation` value stay as
  they are (cited, not restated — P4).
- `pharn/pharn-contracts/grill-triage.md` — unchanged; the dispositions and exit codes are cited by the bullet as
  before.

## Evals to write (P1)

- No Capability and no `rule_id` is added or changed, so no eval pair is owed. The one new assertion lives in
  `.dev/floor/command-hygiene.test.mjs` (above).

## Guarantee audit (P0)

- "A `/pharn-loop` re-run starts in a fresh feature directory" → restates S2, which is FLOOR where it holds:
  `feature-name.mjs --fresh` prints only a slug `pharn/features/` does not hold (enum-regex + an absence test). The
  sentence itself is ADVISORY prose.
- "`/pharn-spec` / `/pharn-plan <name>` continue in the same directory" → ADVISORY: a description of those commands'
  documented steps, not a mechanism this increment adds.
- "`agreement` reports `pharn-triage.md` when `default` changes" → FLOOR where it holds: `check-model-config.mjs`
  `agreement` is an equality check (enum-regex class) over the resolved `default`; the doc sentence describing it is
  ADVISORY.
- The new hygiene assertion → FLOOR for the text's presence (a regex over the command file), never proof a reader
  understood it.

## Trust audit (P2)

- The two grill findings quoted under `## Why` are free text from an advisory stage's output; they are DATA that
  motivated the increment, and nothing in the built files executes or forwards them.

## Determinism audit (P5)

- No branch is added. The S16 branch stays a membership test on `grill-triage.mjs check`'s exit code.

## Open questions (HALT)

- None.
