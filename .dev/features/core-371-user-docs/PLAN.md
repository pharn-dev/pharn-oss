# PLAN — core-371-user-docs

- spec_content_hash: f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d
- applied_lessons: [L64, L75, L78, L85]
- increment: check that the hand-written user docs say what `main` (93c2af1b, `SKILLS_VERSION` 7.25.1) really does,
  and correct only the claims that are false or stale (Linear CORE-371, part A of two; part B owns `CLAUDE.md`, the
  four trusted docs and `.dev/guides/**`).
- layer(s): repo-meta (`docs/limitations.md`, `docs/pipeline.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`)
  plus one installed file, `pharn/floor/README.md` (see D1, the version decision).
- constitution_refs: [P0, P6, P7]

## Discovery (read this run)

Audited, against the live tree at `origin/main` 93c2af1b: `README.md` (outside `CURRENT-STATE`), `docs/guarantees.md`,
`docs/install-manifest.md`, `docs/limitations.md`, `docs/pipeline.md`, `CONTRIBUTING.md`, `SECURITY.md`,
`pharn/floor/README.md`. Method as in `.dev/features/core-350-docs-truth/PLAN.md`: every concrete claim (command and
checker names, flags, file paths, blocked/refusal tokens, `since X.Y.Z` mechanics, constants, lists, CI wiring) checked
with grep / ls / node against the tree, the three hook demos in `pharn/floor/README.md` run live (exit 2, 2, 0 and 2,
2), plus three external reads: `gh api` for ruleset 25907495 and `main`'s classic protection, and the pharn-cli
`v0.21.5` source tarball (its CHANGELOG, `docs/reference/pharn-config.md`, `src/lib/{archetype,gitignore,backup}.ts`,
`package.json` `engines`). `docs/lessons-index.md` freshness: `check-lessons-index.mjs` exit 0.

Claim table summary: **about 200 claims checked, 9 false or stale (F1–F9)**; the rest hold. Verified true, for
example: every checker the guarantees table names exists and takes the flags it names (`--stamp`, `--ac-gate`,
`--base-stamp`, `--verify-transcript`, `--resolve-template-ref`); the spec pin is re-run directly at plan, test and ship
and through `check-plan-spec-agree.mjs` at grill, test, build, regress and verify; every `blocked:` / refusal token the
docs cite occurs in a command or checker; the gate allowlist, `gates.timeoutMs` 100…1 800 000, the 7.15.0 refusal
string (`git show v7.15.0:pharn/floor/gate-exclusion-core.mjs`), the `regress.install` values; the install manifest's
top-level keys, layout, surface order, policies, `models.rules` keys and `LICENSE → pharn/LICENSE`; the always-reconciled
control surface (`reconcile-ignore.json`); the grillers (13) and lenses (22) tour vs `ls`; `MIN_CLI` 0.14.0; the
release job's check list vs the ruleset's required checks plus `gitleaks` (and the owner bypass actor, live); pharn-cli
`engines` `>=24.2.0`, its 0.15.0 release-channel text and the Next + Express example; the measured-run numbers vs the
two measurement files; `run-marker.mjs` refusing `pharn-loop`; `run-gates.mjs` passing `process.env`; no network call in
the floor or hooks.

### False or stale claims

- **F1** — `docs/limitations.md:155` "No pharn-cli release accepts a `supervise` key yet, so do not add one." False:
  pharn-cli **0.18.3** (2026-11-12) accepts it (its CHANGELOG `[0.18.3]`; `docs/reference/pharn-config.md` lists
  `supervise` among the stage names), exactly as 0.18.1 did for `triage`, which the same bullet already states.
- **F2** — `pharn/floor/README.md:62` check 5 "no sibling reference in `reads:` across `pharn-stack-*` / `pharn-skills-*`
  modules". Stale since 3.0.5 (#194): `validate.mjs` CHECK 6 REDs any `pharn-<module>` token in `reads:` other than the
  capability's own module and the base modules `pharn-contracts` / `pharn-core` (`validate.mjs:459-470`, `BASE_MODULES`).
- **F3** — `docs/pipeline.md:227` "Every gate PHARN runs is killed after 540 s" and `:246-247` "Only `/pharn-test`'s red
  run … keeps 540 s." Stale since 7.25.0: `/pharn-test` Step 3c runs the typecheck gate(s) through
  `check-ac-types.mjs --timeout-ms 170000` (`pharn-test.md:212`), a fixed 170 s that ignores `gates.timeoutMs`; an
  unmeasured gate there is a `NOTE`, not a refusal (CHANGELOG [7.25.0]).
- **F4** — `docs/pipeline.md:287-308` "What it needs from your project" / the "typo" sentence: since 7.25.0 `/pharn-test`
  refuses `ac-tests-typecheck` when a type error sits in one of its own mapped test files with a code outside the
  missing-target list (`ac-types-core.mjs`, `pharn-test.md` Step 3c). The doc names neither the step nor the refusal,
  and its "a test that fails on a typo of its own reads the same" now has a partial exception before the pin.
- **F5** — `docs/limitations.md:28-29` "since 7.3.0 the anchor refuses while that other feature's `/pharn-loop` or
  `/pharn-ship` run is open": stale since 7.24.0 — the same `epochOwnerOpen` test runs at `/pharn-loop` entry (Step 1a,
  `reconcile-baseline.mjs --check-epoch`) and in `/pharn-ship` right after GATE 1, so such a run stops there, not at its
  build anchor (CHANGELOG [7.24.0]).
- **F6** — `CONTRIBUTING.md:37` "CI runs these same scripts individually, plus the floor … It does **not** cover all of
  CI: separate workflows run CodeQL and a secret scan". Stale: the `check` job's Test step runs `npm run test:coverage`,
  and on a pull request the same job runs the pharn-ci diff coverage gate (`pharn-dev/pharn-ci` v0.11.0,
  `.pharn/ci.yml` threshold 100, `test-integrity: block`) — neither command exercises it, and CONTRIBUTING never names
  it.
- **F7** — `SECURITY.md:7` "Its security surface is small by design: …" enumerates the surfaces and omits
  `.claude/agents/` — the `pharn-stage` (7.19.0) and `pharn-review-lens` (6.64.0) subagent definitions an install
  receives, whose `tools:` lines bound what a routed stage or lens agent can call.
- **F8** — `docs/pipeline.md:52-54` "Stages do **not** each read the previous one's output … `/pharn-verify` reads the
  plan, its own gates …": since 6.34.0 a delivery run's verify reuses the `/pharn-regress` HEAD gate record for a gate
  regress already ran on the same inputs (`stage-verify.mjs:39-41`, `--reuse-stamp`; `docs/limitations.md:178` says
  so). "It does not read `regression-report.json` at all" stays true.
- **F9** — `pharn/floor/README.md:118-128` "The default set is …" omits `pharn/.run/writes-scope.json`, a
  `DEFAULT_PROTECTED` entry (`protect-trusted-paths.cjs:410`), and the two rooted subtrees the hook denies by separate
  rules: memory-bank canon (`PROTECTED_SUBTREES`, outside a promotion scope) and, since 7.3.0, the delivery runs' state
  `pharn/.run/pharn-{loop,ship,review}/**` (`RUN_STATE_SUBTREES`).

## Proposed edits

- `docs/limitations.md` — F1: "A `supervise` entry needs pharn-cli 0.18.3 or newer (older releases report it as
  rejected); the shipped block names none, for the same reason as `triage`." F5: one clause — since 7.24.0
  `/pharn-loop` makes the same check at entry and `/pharn-ship` right after spec approval, so such a run stops before
  its plan.
- `docs/pipeline.md` — F3: "killed after 540 s (one exception, below)"; the "Where it applies" last sentence names both
  fixed limits of `/pharn-test` (red run 540 s; typecheck step 170 s, noted not refused). F4: one bullet under "What it
  needs from your project" (tests that type-check when the project has a `typecheck`/`type-check` gate; one fix, then
  `ac-tests-typecheck`; the code list is set membership, wrong both ways) and a short qualifier on the typo sentence.
  F8: one parenthetical on verify's reuse of regress's HEAD record.
- `CONTRIBUTING.md` — F6: the Test step runs `npm run test:coverage`, and the pharn-ci diff coverage gate (threshold
  100, test integrity `block`) runs in the same job on a pull request; neither command exercises it.
- `SECURITY.md` — F7: add "the two subagent definitions under `.claude/agents/` (`pharn-stage`, `pharn-review-lens`)".
- `pharn/floor/README.md` — F2: reword check 5. F9: add `pharn/.run/writes-scope.json` to the list and one sentence on
  the two rooted subtrees.
- `CHANGELOG.md` — per D1.

## Applied lessons

- L64 — every restatement of a corrected claim is checked on its own: the typo bound in `docs/guarantees.md:30` (still
  true — `check-test-stage.mjs` does not re-check types) against `docs/pipeline.md:307` (F4); the 540 s limit at
  `docs/pipeline.md:227` and `:247` (F3); the protected set in `pharn/floor/README.md` against the hook source (F9).
- L75 — the sweep lines below name each phrase and each hit with a disposition, so grill can re-run the greps.
- L78 — dated records keep what was true when written: merged CHANGELOG sections, `.dev/features/**` and
  `.dev/measurements/**` are not rewritten; the correction is a new CHANGELOG entry.
- L85 — when `origin/main` moves before the PR, merge it and keep the build's anchor; upstream bytes read `merged`.

## Sweep (L75)

- F1 phrases `supervise\` key`,`release accepts`: one hit,`docs/limitations.md:154-155`(edit).`pharn/LIMITS.md`has no`supervise` claim (no hand-off).
- F2 phrase `pharn-stack-*\` / \`pharn-skills-*`: one hit,`pharn/floor/README.md:62` (edit).
- F3 phrases `keeps 540`, `killed after 540`, `Every gate PHARN runs`: `docs/pipeline.md:227, :247` (edit);
  `.dev/guides/floor-gates.md:115` says the red run keeps 540000 (true; part B).
- F4 phrase `typo`: `docs/pipeline.md:307` (edit); `docs/guarantees.md:30` (true, about `check-test-stage.mjs`);
  `pharn/LIMITS.md:747`, `pharn/pharn-contracts/ac-tests.md:701`, `.claude/commands/pharn-test.md:355`,
  `.dev/guides/floor-ac-tests.md:75` — about the red run's record, true; out of this part's scope.
- F5 phrases `anchor refuses`, `--anchor\` refuses`:`docs/limitations.md:28`(edit);`CLAUDE.md:212`,
`pharn/LIMITS.md:409`,`.dev/guides/floor-checks.md:163`(part B, hand-off: same 7.24.0 omission);`reconciliation-record.md:76` (contract, out of scope).
- F6 phrase `secret scan`: `CONTRIBUTING.md:37` (edit); `:94` is about the release job (true).
- F9 phrase `The default set is`: `pharn/floor/README.md:118` (edit).
- F7, F8: no other enumeration of the security surface or of verify's inputs in the audited files.

## Version decision (D1)

`pharn/floor/README.md` is installed (surface `floor` in `pharn-install.json`, sha256 recorded) but is **outside** the
bump-triggering set (`check-surface-bump.mjs` `PRODUCT_SURFACE`; `docs/install-manifest.md` names it as one of the three
installable paths outside it), so `check:surface-bump` is GREEN either way. CLAUDE.md also says a change to bytes an
install receives bumps, "docs-only" included. Recommended: **(a) patch bump 7.25.1 → 7.25.2** — `SKILLS_VERSION`,
`README.md` badge, `pharn-install.json` regenerated (skillsVersion + the README's sha256), a `## [7.25.2]` CHANGELOG
section that also moves the CORE-357 `[Unreleased]` entry. Alternative (b): no bump, one `[Unreleased]` entry, and an
install's `pharn/floor/README.md` differs from the manifest's sha256 only once a later bump regenerates it.

## Files

GATE 1 (orchestrator decision under delegation, 2026-11-24, not a human approval): F1–F9 approved as proposed, F8 as
the one parenthetical; D1 = (a), patch bump to 7.25.2, moving the CORE-357 `[Unreleased]` entry into the new section
(CONTRIBUTING "CHANGELOG entries"). Base merged before build: `origin/main` 9c438685 (#487, a test-only change).

- `docs/limitations.md` — F1, F5 — layer repo-meta
- `docs/pipeline.md` — F3, F4, F8 — layer repo-meta
- `CONTRIBUTING.md` — F6 — layer repo-meta
- `SECURITY.md` — F7 — layer repo-meta
- `pharn/floor/README.md` — F2, F9 — layer product floor (installed, outside the bump-triggering set)
- `CHANGELOG.md` — a new `## [7.25.2]` section, with the CORE-357 entry moved into it — layer repo-meta
- `SKILLS_VERSION` — 7.25.1 → 7.25.2 — layer repo-meta
- `README.md` — version badge 7.25.2 — layer repo-meta
- `pharn-install.json` — regenerated by `npm run docs:generate` — layer repo-meta (generated)

### Explicitly not touched

- Generated regions (`docs/capabilities/**`, README `CURRENT-STATE`, `docs/lessons-index.md`).
- `README.md` prose, `docs/guarantees.md`, `docs/install-manifest.md` — no false claim found.
- Released CHANGELOG sections, `.dev/features/**`, `.dev/measurements/**` (dated, L78).
- Part B's files and every command, contract and capability.

## Hand-offs (part B / out of scope)

- `CLAUDE.md:212`, `pharn/LIMITS.md:409`, `.dev/guides/floor-checks.md:163` — the epoch-owner refusal also runs at
  `/pharn-loop` entry and after `/pharn-ship` GATE 1 since 7.24.0 (F5's shape).
- `.claude/settings.json` `_comment` (product, hook-protected, not a doc in either set) lists the protected set as the
  trusted docs, CODEOWNERS, git metadata and "this settings.json plus the four hook scripts", omitting
  `settings.local.json`, `pharn/.run/writes-scope.json`, the SPEC template, canon and the run state.

## Contracts satisfied

- None changed. CHANGELOG entry per CONTRIBUTING "CHANGELOG entries".

## Evals to write (P1)

- None: no capability or checker changes.

## Guarantee audit (P0)

- "pharn-cli 0.18.3 accepts `supervise`" → a read of pharn-cli's v0.21.5 source this run (advisory; another repository).
- Every edited sentence stays advisory prose; the corrections name the checker or hook behind each mechanic and claim
  no new guarantee.

## Trust audit (P2)

- `gh api` output and the pharn-cli tarball are read as data; nothing from them steers a decision beyond the claim
  verdicts above.

## Determinism audit (P5)

- No new branch in any tool.

## Resolved at GATE 1

- F1–F9 approved, F8 included; D1 = (a) patch bump 7.25.2 (orchestrator decision under delegation, see `## Files`).
