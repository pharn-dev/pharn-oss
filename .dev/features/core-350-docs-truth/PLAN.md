# PLAN — core-350-docs-truth

- spec_content_hash: f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d
- applied_lessons: [L50, L64, L68, L75, L78]
- increment: check that the hand-written docs say what `main` (08d7f63e, `SKILLS_VERSION` 7.23.0) really does, and
  correct only the claims that are false or stale (Linear CORE-350, the last task of epic CORE-293). Open PRs
  #474–#478 are not on `main` and are not documented here.
- layer(s): repo-meta only by default — `README.md` prose outside the generated block, `CLAUDE.md`,
  `CONTRIBUTING.md`, `SECURITY.md`, `docs/pipeline.md` (hand-written), `CHANGELOG.md` `[Unreleased]`. No `pharn/**`
  or `.claude/**` byte changes and no `SKILLS_VERSION` bump — UNLESS GATE 1 picks option D1(b), which adds one
  trusted-doc edit (`pharn/LIMITS.md` §11, by the human patch route) and a patch bump to 7.23.1.
- constitution_refs: [P0, P2, P6, P7]

## Discovery (read this run)

Audited: `README.md` (outside `CURRENT-STATE`), `CLAUDE.md`, `CONTRIBUTING.md`, `SECURITY.md`, `docs/pipeline.md`,
`docs/guarantees.md`, `docs/limitations.md`, `docs/install-manifest.md`, and the four trusted docs (read-only).
Method: every concrete factual claim (command names and lists, file paths, npm scripts and the `check` chain, floor
checker names, CI step wiring, `since X.Y.Z` mechanics, numeric constants, counts) checked against the live tree with
grep / ls / node, plus one live GitHub read (`gh api .../rulesets`). A reference scanner
(`$SCRATCH/core350-refs.mjs`, not committed) resolved every backticked path and every relative link in the twelve
files: every miss was a runtime or user-project path (`pharn/.run/…`, `cost.json`, `AGENTS.md`), none a dangling
repo reference. `npm run docs:check` is GREEN (catalog, lessons index, install manifest): the generated regions need
no regeneration.

Claim table summary: **about 140 claims checked, 8 false or stale** (F1–F8 below); the rest hold. Verified true,
for example: the `npm run check` chain in CLAUDE.md and CONTRIBUTING equals `package.json` `scripts.check`; all ten
`.dev/guides/*` the Guidance index names exist; the four hook scripts; `check-provenance` / `check-variance` /
`check-config` in `.dev/floor/`; `scan-plan-*` in `pharn/floor/`; `STOP_GREEN_QUICK` in `check-loop.mjs`;
`## Quick mode` in `pharn-ship.md`; "The project template" in the spec-template contract; reconciliation §2a;
`DEV_SAFE_SET_EXTRA = [".dev/features/**", "pharn/pharn-*/**"]`; the ✧ test pinning `npm run docs:check` in
`ci.yml`; README's 13 grillers / 22 lenses tour vs `ls`; 540 s gate timeout and the 1 800 000 ms cap
(`gate-timeout-core.mjs`); `gates.exclude` ids; `models.stages` keys (no `triage` / `supervise`, as
`docs/limitations.md` says); `MIN_CLI` 0.14.0; the release job's check list vs ruleset 25907495's required checks;
`.claude/settings.json` wiring (`onFailure: block` on both guards, exec-form matcher-less `Stop`); SECURITY's
`run-marker.mjs` refusing `pharn-loop` and `run-gates.mjs` passing `process.env`.

### False or stale claims

- **F1** — `CLAUDE.md:158` lists the product commands as `/pharn-spec` … `-memory-promote`, "now built": missing
  `/pharn-triage` (7.7.0) and `/pharn-supervise` (7.9.0), both in `.claude/commands/` and in the generated inventory
  (13 product commands). `README.md:323-335` Commands table: same two missing.
- **F2** — `CLAUDE.md:167-172` "Three per-PR gates are deliberately outside the chain … CI runs all three on pull
  requests only": `package.json` has a fourth, `check:instruction-growth`, outside `scripts.check`, and `ci.yml`'s
  "Instruction-growth check" step runs on pull requests only against `HEAD^1` (CONTRIBUTING "Growing `CLAUDE.md`"
  already documents it).
- **F3** — ruleset 25907495 bypass. Live: `bypass_actors: [{actor_id 7968018 (the owner), bypass_mode "always"}]`,
  `updated_at 2026-11-04`. On 2026-11-03 it was `[]` (`.dev/features/audit-small-2026-11-03/NOTES.md:34`). Docs
  that say it has none / binds every account: `CLAUDE.md:112`; `CONTRIBUTING.md:81, 94, 162`;
  `.github/workflows/release.yml:26, 37` (comments); `pharn/LIMITS.md:824-828` (trusted); test comments
  `.dev/floor/check-surface-bump.test.mjs:19`, `.dev/floor/instruction-growth-wiring.test.mjs:22`. This is a
  GitHub-settings fact, not repo bytes: see open decision D1.
- **F4** — `README.md:226-237` "A normal install adds:" and the tree at `:239-262` omit `.claude/agents/`
  (`pharn-stage.md`, `pharn-review-lens.md`), which `pharn-install.json` lists as installed files (`agents`
  capability row in `docs/install-manifest.md:88`).
- **F5** — `CONTRIBUTING.md:17`: the hook "denies any agent write to them" — false for Bash (CLAUDE.md hard
  constraint 1 says so in so many words).
- **F6** — `SECURITY.md:51` lists the paths `protect-trusted-paths.cjs` protects (a write-guard bypass is in scope)
  and omits the delivery runs' state `pharn/.run/pharn-{loop,ship,review}/**`, denied since 7.3.0
  (`protect-trusted-paths.cjs:110-111`).
- **F7** — `docs/pipeline.md` "/pharn-loop runs the same chain without either human gate" (`:63`): since 7.7.0 a full
  loop adds triage after the grill and, on an escalation, `/pharn-supervise` (7.9.0); the file never names either.
  (`pharn/ARCHITECTURE.md §6` and README `:139` do.)
- **F8** — `README.md:70-71` artifact list names `grill-triage.json` but not `SUPERVISOR.json`, the supervisor's
  record a full loop writes on an escalation.

## Proposed edits

- `CLAUDE.md` — F1: add `-triage` / `-supervise` to the product list. F2: "Four per-PR gates", add
  `npm run check:instruction-growth` (`pharn/floor/check-instruction-files.mjs`, CLAUDE.md growth vs the base's
  budget), "CI runs all four". F3 only under D1(b). Net growth well under the 2 048-byte instruction-growth budget.
- `README.md` — F1: two Commands-table rows (`/pharn-triage`, `/pharn-supervise`, both "a full `/pharn-loop` runs it"),
  and the lead sentence keeps reading true. F4: one bullet and one tree line for `.claude/agents/pharn-*.md` (the two
  subagent definitions `/pharn-ship`, `/pharn-loop` and `/pharn-review` launch). F8: one clause naming
  `SUPERVISOR.json`.
- `CONTRIBUTING.md` — F5: "through Claude Code's Write/Edit/MultiEdit/NotebookEdit tools; a Bash write is not
  blocked". F3 only under D1(b).
- `SECURITY.md` — F6: add "the delivery runs' state under `pharn/.run/pharn-{loop,ship,review}/`" to the list.
- `docs/pipeline.md` — F7: one sentence in the `/pharn-loop` paragraph: a full loop also runs `/pharn-triage` after
  the grill (7.7.0) and, when triage escalates, `/pharn-supervise` (7.9.0); pointer to `pharn/ARCHITECTURE.md §6`.
- `CHANGELOG.md` — one `[Unreleased]` entry dated 2026-11-24 (or, under D1(b), a `[7.23.1]` section).

## Applied lessons

- L50 — the F3 sweep enumerates every cite of the referent that broke (ruleset 25907495), not only the phrase "no
  bypass": the eight hits are listed under F3.
- L64 — each restatement of a corrected claim is checked on its own: F1 in both CLAUDE.md and README, F3 in each of
  its eight hits, F7's stage list against README and ARCHITECTURE.
- L68 — under D1(b) the human applies the LIMITS patch and it is committed BEFORE build Step 0's anchor, so the
  human's write does not read as an escape inside the window.
- L75 — the sweep lines below name each phrase and each hit with a disposition.
- L78 — dated records keep what was true when written: the merged CHANGELOG entries citing "no bypass"
  (`CHANGELOG.md:1115, 1202, 1438, 1453`), `.dev/features/**` notes and `release.yml`'s "read 2026-11-03" are not
  rewritten; a correction is a new entry.

## Sweep (L75)

- F1 phrases "memory-promote, now built", "/pharn-spec /", and any product-command enumeration: hits `CLAUDE.md:158`
  (edit), `README.md:323-335` (edit); `docs/*.md`, `CONTRIBUTING.md`, `.dev/guides/*.md` — no enumeration (no hit).
- F2 phrases `per-PR gates`, `all three on pull`, `outside the chain`: hits `CLAUDE.md:167, :171` (edit); no other.
- F3 phrase `25907495` and `no bypass` / `every account`: `CLAUDE.md:112`, `CONTRIBUTING.md:81, 93, 94, 162`,
  `release.yml:26, 37`, `pharn/LIMITS.md:824, 831`, `.dev/floor/check-surface-bump.test.mjs:19`,
  `.dev/floor/instruction-growth-wiring.test.mjs:22`, `.dev/floor/release-workflow.test.mjs:40` — disposition per
  D1; `CONTRIBUTING.md:93`, `LIMITS.md:831`, `release-workflow.test.mjs:40` are about the check LIST, which still
  matches (no edit); `CHANGELOG.md` and `.dev/features/**` hits are dated (L78, no edit).
- F5 phrases `any agent write`, `denies any`: `CONTRIBUTING.md:17` (edit); `CLAUDE.md:106` is scoped to the four
  tools (true).
- F4 phrase `.claude/agents`: `docs/install-manifest.md:88` (true); README has no hit (edit adds it).

## Files

GATE 1 (model decision under delegation, orchestrator, 2026-11-24): F1, F2, F4–F8 approved; D1 = (b).

- `README.md` — F1 table rows, F4 install bullet and tree line, F8 clause, version badge 7.23.1 — layer repo-meta
- `CLAUDE.md` — F1 command list, F2 per-PR gates, F3 line 112 — layer repo-meta
- `CONTRIBUTING.md` — F5, F3 lines 81, 94, 162 — layer repo-meta
- `SECURITY.md` — F6 — layer repo-meta
- `docs/pipeline.md` — F7 — layer repo-meta
- `CHANGELOG.md` — a new `## [7.23.1]` section — layer repo-meta
- `SKILLS_VERSION` — 7.23.0 → 7.23.1 (patch: a corrected shipped trusted-doc sentence) — layer repo-meta
- `pharn-install.json` — regenerated by `npm run docs:generate` (skillsVersion and the LIMITS.md sha256) — layer
  repo-meta (generated)
- `.dev/floor/check-surface-bump.test.mjs` — F3 comment at :19 only — layer build apparatus
- `.dev/floor/instruction-growth-wiring.test.mjs` — F3 comment at :22 only — layer build apparatus

Not in `## Files`, by design: `pharn/LIMITS.md` §11 (F3) lands by the human patch route
(`$SCRATCH/patch-core-350.py`, expected sha256 `9a4f502c5114e7bab70f00fbae1a71a8f565945bd26cd6f6018c36ed4913a0e2`),
sha-checked and committed BEFORE build Step 0's anchor (L68), so it is outside the build window. The same route
carries the two F3 comment lines in `.github/workflows/release.yml` (`$SCRATCH/patch-core-350b.py`, expected sha256
`0d4507a583df3a9eedcd9f779646e64aaff413de277edef6fe0ffe6a8baf2112`): `set-writes-scope.cjs --from-plan` refuses a
CI workflow in `## Files` (measured this run, exit 1; the override is an operator flag no plan sets), and
`.github/workflows/` is in the always-reconciled surface, so it too is committed before the anchor.

### Explicitly not touched

- Generated regions (`docs/capabilities/**`, README `CURRENT-STATE`, `docs/lessons-index.md`) — `docs:check` GREEN.
- Released CHANGELOG sections, `.dev/features/**`, `.dev/measurements/**` (dated, L78).
- `docs/guarantees.md`, `docs/limitations.md`, `docs/install-manifest.md` — no false claim found.
- The trusted docs, except LIMITS §11 (human patch, above).

## Contracts satisfied

- None changed. CHANGELOG entry per CONTRIBUTING "CHANGELOG entries".

## Evals to write (P1)

- None: no capability or checker changes.

## Guarantee audit (P0)

- "ruleset 25907495 has an owner bypass actor since 2026-11-04" → a live read of GitHub settings (advisory; it can
  change after this run, which is exactly how the old sentence went stale).
- "the product command list matches `.claude/commands/`" → the generated inventory is floor (byte-equality); the
  hand-written list stays advisory and unguarded.
- Every edited sentence remains advisory prose; no new guarantee is claimed.

## Trust audit (P2)

- No free text from another model feeds a decision. `gh api` output is read as data.

## Determinism audit (P5)

- No new branch in any tool.

## Open questions (HALT)

- **D1 (orchestrator / owner):** ruleset 25907495 now carries the owner as bypass actor (`always`), so an admin merge
  can skip the required checks again — the 2026-10-12 audit finding the 2026-10-26 change closed. Either
  (a) the owner removes that bypass actor (repo settings), and the docs stay as they are — recommended, since the docs
  describe the intended protection and the batch's CI-green rule depends on it; or (b) the docs are corrected to the
  live state: CLAUDE.md, CONTRIBUTING (3 lines), release.yml and two test comments, plus `pharn/LIMITS.md` §11 by the
  patch script → product surface, patch bump 7.23.1, ship-record still required for the non-trusted paths (none) —
  only `surface-bump`.
- GATE 1: approve F1, F2, F4–F8 as proposed.
