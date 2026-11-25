# PLAN — core-371-followups

- spec_content_hash: 8566b4432ed6cc7035de5d925dafe3755086e23b12acacde0dcdda07a43a9167
- applied_lessons: [L50, L64, L68, L75, L78]
- increment: correct the stale claims the CORE-371 audit left on the product surface (part B follow-ups): the
  `--floor-only` invoker sentence in `/pharn-grill`, the `parseResults` attribution in `check-regress.mjs`, the
  "pharn-cli does not copy `.claude/agents/` yet" note in `/pharn-review`, the protected-path list and the posture in
  the `.claude/settings.json` `_comment`, and the control-surface wording in the `set-writes-scope.cjs` header. The
  last two go by the human patch route. Their apparatus restatements are corrected too.
- layer(s): product surface (`.claude/commands/pharn-grill.md`, `.claude/commands/pharn-review.md`,
  `pharn/floor/check-regress.mjs`, plus `.claude/settings.json` and `.claude/hooks/set-writes-scope.cjs` by the human
  patch route), which means a patch bump to 7.25.4. Build apparatus (`.dev/floor/command-hygiene.test.mjs`,
  `.claude/hooks/protect-trusted-paths.test.cjs`). Repo-meta
  (`CHANGELOG.md`, `SKILLS_VERSION`, the README badge, and the generated `pharn-install.json`).
- constitution_refs: [P0, P2, P6, P7]

## Discovery (read this run, main a1d89ee3, SKILLS_VERSION 7.25.3)

Each claim was re-verified against live code this run:

- **S1, STALE.** `.claude/commands/pharn-grill.md:111` reads "`/pharn-loop` invokes this form (inline) in its full
  mode". Live: `pharn/floor/stage-agent-core.mjs` `ROUTE_POLICY` has `pharn-loop.full["pharn-grill"] = AGENT` (7.7.0)
  and `pharn-loop.quick` / `pharn-ship.quick` `"pharn-grill" = "floor-only"`, which is a POLICY name. Both quick parts
  then invoke `/pharn-grill <name> --quick` (`pharn-loop-quick.md:72-76`, `pharn-ship-quick.md:76-78`,
  `pharn-loop.md:814-815`). `grep -- --floor-only .claude/commands pharn/floor/*.mjs` outside `pharn-grill.md` and
  tests returns nothing: no orchestrator passes `--floor-only`. **Restatements:**
  `.dev/floor/command-hygiene.test.mjs:2722-2724` (comment: "/pharn-loop's grill is `floor-only` in both columns
  … its one invocation, `/pharn-grill <name> --floor-only`") is stale, and `:2750` asserts the stale sentence, so the
  test changes with the command.
- **S2, FALSE.** `pharn/floor/check-regress.mjs:100-101` reads "read and checked by per-test-results-core.mjs's own
  `readResultsFile` + `parseResults` + `buildRecord`". Live: `parseResults` is `export function` at
  `pharn/floor/per-test-results-formats.mjs:392`. `check-regress.mjs:165-166` imports `buildRecord` and
  `readResultsFile` from the core and `parseResults` from the formats module. **Restatement:**
  `check-regress.mjs:664-665` reads "per-test-results-core.mjs's own read + parse + build", the same misattribution.
  `.dev/guides/floor-gates.md:203-204` already attributes it correctly.
- **S3, STALE.** `.claude/commands/pharn-review.md:402` reads "(pharn-cli does not copy `.claude/agents/` yet)". Live:
  `pharn-install.json:51-52` lists both agents under `"surface":"agents"`. The pharn-cli `CHANGELOG.md` section for
  0.20.0, dated 2026-11-17 (the sibling checkout, read-only), says "`pharn init` and `pharn update` now install the review lens
  agent, `.claude/agents/pharn-review-lens.md`" and "installs what pharn-oss declares in `pharn-install.json`".
  `.dev/guides/product-commands.md:90-93` states the fallback condition as an install older than pharn-cli's
  `cli-install-agents` work, which stays consistent with the correction. **Restatement:**
  `.dev/floor/stage-agent-type.test.mjs:26-27` (comment: "pharn-cli does not copy `.claude/agents/` yet; follow-up
  `cli-install-agents`), so in an install every stage takes the fallback") is stale. **Left to part A at GATE 1:** PR
  #494 (branch `core-371-followups-dev`) already fixes that comment and `review-lens-agent.test.mjs`'s, so this plan
  does not touch it (a conflict otherwise).
- **S4, STALE (human patch 1).** `.claude/settings.json:2` `_comment`: the protect-trusted-paths list omits
  `.claude/settings.local.json`, `pharn/.run/writes-scope.json`, `pharn/spec-template.md`, memory-bank canon
  (`PROTECTED_SUBTREES`, with the promote-origin escape `canonWriteAuthorized`), `RUN_STATE_SUBTREES` and the two
  other CODEOWNERS locations (`protect-trusted-paths.cjs:385-433`). "Fail-closed to a default-safe-set when none is
  set" omits the installed-project posture (6.24.0, `enforce-writes-scope.cjs` header "THREE POSTURES"). "Up to 3 times
  per run" omits `PHARN_STOP_GUARD_MAX` (`require-loop-record.cjs:121-122, 198-201`). "Any of those control paths"
  under-states `CONTROL_SURFACE` (`set-writes-scope.cjs:252`, six entries). Verified true and kept: exec-form Stop hook,
  fail-open, the inert conditions, 24 h, `onFailure` (7.3.0, 2.1.295, `pharn/LIMITS.md` §7), the
  `${CLAUDE_PROJECT_DIR}` anchoring and the unsupported path characters, "pharn update first", commands and
  `*.test.cjs` not protected, `PHARN_PROTECTED`, and `settings.local.json` gitignored (`.gitignore:2`).
- **S5, STALE (human patch 2).** `.claude/hooks/set-writes-scope.cjs:51` reads "CONTROL_SURFACE below:
  .claude/settings.json + the four hook scripts", and `:246-249` reads "the settings file that WIRES both PreToolUse
  hooks … the same four paths". Live: `CONTROL_SURFACE` holds six paths, including `.claude/settings.local.json`.
  **Restatement:** `.claude/hooks/protect-trusted-paths.test.cjs:253` (comment "F3: the guard's own control surface
  (settings.json + the four hook scripts)"). Its loop covers those five paths, and `settings.local.json` is tested at
  `:670-675`, so the label is corrected, not the loop.

Lessons index: `node .dev/floor/check-lessons-index.mjs .` exit 0 (GREEN). The SELECT-then-READ sweep read L19, L38,
L50, L64, L68, L75 and L78 in full from canon.

## Applied lessons

- L50 — each defect's referent was swept, not only its wording: every `--floor-only` cite, every `parseResults`
  attribution, every "does not copy `.claude/agents/`" cite and every "settings.json + the four hook scripts" cite
  across `.claude/`, `pharn/`, `docs/`, the root docs and `.dev/guides` (dispositions under "Sweep").
- L64 — the CHANGELOG entry restates each correction. Before hand-off, build greps the diff for "0.20.0", "six paths",
  "installed project" and "7.7.0" and probes each hit against the live source named in Discovery.
- L68 — both human-only edits (patch 1 `.claude/settings.json`, patch 2 `.claude/hooks/set-writes-scope.cjs`) land
  BEFORE `/pharn-dev-build` Step 0's anchor: I check the sha256 myself and commit them (plus the `pharn-install.json`
  regeneration they cause) on this branch before the anchor runs. Build does not start until the orchestrator says
  "patched".
- L75 — each sweep phrase below is listed with every hit and one disposition per hit.
- L78 — dated records keep their wording: `.dev/measurements/epic-4-no-go-2026-11-16.md` (states item S3 as of its
  date), `pharn/floor/grill-findings-core.mjs:9` and `pharn/floor/grill-scan.mjs:5-12` ("went/became floor-only in
  6.45.0", past tense and true), `pharn/floor/stage-agent-core.mjs:43-49` ("Before 7.7.0 … was floor-only"), and every
  merged CHANGELOG entry.

## Sweep (L50, L75): phrase → hits → disposition

- `--floor-only` (`.claude/commands`, `pharn/floor/*.mjs`, `pharn/pharn-contracts`, `docs`, `README.md`):
  `pharn-grill.md:2, 109, 114, 125, 126, 179, 223, 379, 382, 416` define or skip the mode and stay true, except
  `:111`, the invoker sentence, which is **edited**. `finding-shape.md:149` and `ARCHITECTURE.md` §6 grill row are
  still true. `command-hygiene.test.mjs:2722-2724, 2746-2750` are **edited**, and
  `installed-skills-consumers.test.mjs:16, 101` are still true.
- `parseResults` attribution: `check-regress.mjs:100-101` **edited**, `check-regress.mjs:664-665` ("read + parse +
  build") **edited**, `.dev/guides/floor-gates.md:203-204` already correct.
- "does not copy" / "agents/ yet" / "cli-install-agents": `pharn-review.md:402` **edited**,
  `stage-agent-type.test.mjs:27` left to PR #494 (part A), `.dev/guides/product-commands.md:91` still true, and the measurement
  record is kept (L78).
- "plus the four hook" / "+ the four hook" / "same four paths": `.claude/settings.json:2` (patch 1),
  `set-writes-scope.cjs:51, 249` (patch 2), `protect-trusted-paths.test.cjs:253` **edited**. Still true:
  `protect-trusted-paths.cjs:10` (names both settings files), `set-writes-scope.test.cjs:512` ("the wiring files"),
  and `pharn/floor/README.md:123` (names `settings.local.json`).

## The corrections (exact intent)

1. `pharn-grill.md` `## --floor-only mode` first sentence becomes: "No orchestrator invokes this form since 7.7.0: a
   full `/pharn-loop` routes the full grill, and a `--quick` run invokes `/pharn-grill <name> --quick` inline. It
   remains for a direct call." The rest of the section is unchanged.
2. `command-hygiene.test.mjs`: the assertion `/`\/pharn-loop`invokes this form \(inline\) in its full mode/` becomes
   `/No orchestrator invokes this form since 7\.7\.0/`, the test title's "its invoker" becomes "no orchestrator invokes
   it", and the section comment states the live cells: `pharn-loop` and `pharn-ship` quick are policy `floor-only`
   and run `/pharn-grill --quick`, and no orchestrator passes `--floor-only`.
3. `check-regress.mjs:100-101` reads "read and checked by per-test-results-core.mjs's `readResultsFile` +
   `buildRecord` and per-test-results-formats.mjs's `parseResults`", and `:664-665` reads "per-test-results-core.mjs's
   read + build and per-test-results-formats.mjs's parse". These are comments only.
4. `pharn-review.md:402`: "(pharn-cli does not copy `.claude/agents/` yet)" becomes "(a pharn-cli older than 0.20.0
   does not copy `.claude/agents/`)".
5. (Dropped at GATE 1: `stage-agent-type.test.mjs` is PR #494's.)
6. `protect-trusted-paths.test.cjs:253` becomes "F3: the guard's own control surface (settings.json + the four hook
   scripts; settings.local.json is under CONTROL SURFACE below)".
7. Patches 1 and 2: the texts reported to the orchestrator (pre/post sha256 below), applied by the human.

## Files

- `.claude/commands/pharn-grill.md` — S1 — layer product command
- `.claude/commands/pharn-review.md` — S3 — layer product command
- `pharn/floor/check-regress.mjs` — S2, comments only — layer product floor
- `.dev/floor/command-hygiene.test.mjs` — S1 pin and comment — layer build apparatus
- `.claude/hooks/protect-trusted-paths.test.cjs` — S5 restatement, comment only — layer build apparatus
- `CHANGELOG.md` — a new 7.25.4 section (moving any Unreleased entries into it) — layer repo-meta
- `SKILLS_VERSION` — 7.25.3 → 7.25.4 (patch: corrections to shipped bytes) — layer repo-meta
- `README.md` — the version badge only — layer repo-meta
- `pharn-install.json` — regenerated by npm run docs:generate (skillsVersion and the changed files' sha256) — layer
  repo-meta (generated)

### Not in `## Files`, by design

- `.claude/settings.json` (patch 1: pre `d218f551…6083e05`, post `f7f867f8…f676a7ad`) and
  `.claude/hooks/set-writes-scope.cjs` (patch 2: pre `668a9b01…dd80f4c3b`, post `9c744813…7645fe6`) — the human
  patch route. The setter refuses both in `## Files` (control surface), and both are committed before the anchor
  (L68). The `pharn-install.json` regeneration their new sha256s cause is committed with them, and build regenerates
  it again for the three product files above.
- Generated regions (`docs/capabilities/**`, README `CURRENT-STATE`, `docs/lessons-index.md`): no edited text feeds
  them (the catalog reads capability frontmatter and command `description:` lines, and none changes). `docs:check` is
  re-run at build.

## Contracts satisfied

- None changed. The CHANGELOG entry follows CONTRIBUTING "CHANGELOG entries" and `.dev/guides/versioning.md`.

## Evals to write (P1)

- None: no capability, rule or checker behaviour changes. The one test edit re-points a presence pin at the corrected
  sentence.

## Guarantee audit (P0)

- "No orchestrator invokes `--floor-only` since 7.7.0" → read from `ROUTE_POLICY` and the command texts (advisory:
  the commands are advisory orchestration). The edited presence pin is enum/regex over committed text, never proof of a
  run.
- "pharn-cli older than 0.20.0 does not copy `.claude/agents/`" → a read of pharn-cli's CHANGELOG (advisory, an
  external project's statement). `pharn-install.json` listing the agents is a byte-equality artifact (`docs:check`).
- The settings comment names what `protect-trusted-paths.cjs` denies. The deny itself is FLOOR (hook), and the comment
  is prose, so it claims no new guarantee and widens none. Its new posture clause narrows the old over-claim.
- Every other edit is a comment or prose correction. No new guarantee.

## Trust audit (P2)

- The pharn-cli CHANGELOG (another repository) is read as data, and its claim is corroborated by this repo's own
  `pharn-install.json`.

## Determinism audit (P5)

- No new branch in any tool.

## Open questions (HALT)

- None open. GATE 1 was decided by the orchestrator under delegation (not a human approval): approved with one change,
  dropping `.dev/floor/stage-agent-type.test.mjs` from `## Files` (PR #494 owns it). If #494 merges first, merge
  `origin/main` and move its `[Unreleased]` entry into the 7.25.4 section. The anchor waits for "patched".
