# NOTES — audit-small-2026-11-03 (batch group S)

Mode: LIGHT (no `/pharn-dev-ship`). Plan: `PLAN.md`; scope set with
`node .claude/hooks/set-writes-scope.cjs --from-plan .dev/features/audit-small-2026-11-03/PLAN.md` (47 paths). Every
in-repo write went through Edit/Write except `package-lock.json` (`npm audit fix`, declared in `## Files`). Branch
`fix/audit-small` from `origin/batch/audit-2026-11-03` (`dd0bb3d3`). Path:line below is as of this branch.

## Item → outcome

1. **`AskQuestion` → `AskUserQuestion`: fixed.** 10 refs in 5 files: `pharn-dev-plan.md:152,252,263`,
   `pharn-dev-memory-promote.md:57,310,315`, `pharn-spec.md:238`, `pharn-memory-promote.md:247,253`,
   `pharn-dev-ship.md:200`. One test pinned the old name (`.dev/floor/command-hygiene.test.mjs`
   `gate-before-askquestion`, dev and prod regexes) — updated. New ✧ pin: no command file names `AskQuestion`.
2. **Version cites: fixed.** `docs/guarantees.md:4`, `docs/limitations.md:4`, `docs/pipeline.md:4` 6.65.3 → 6.68.1
   (`git show 038d71d8:SKILLS_VERSION` = 6.68.1; CHANGELOG `[6.68.1]` holds the move). The `pharn/features/` move: the
   entry is filed under `[5.1.2]` (CHANGELOG.md, "SKILLS_VERSION 4.0.0 → 5.0.0" text inside `## [5.1.2]`), and the
   2026-09-23 sectioning entry says 5.0.0 never existed on main → `CLAUDE.md:52`, `CONTRIBUTING.md:182`,
   `pharn/features/README.md:30` now cite 5.1.2 (the README heading adds one line saying it was written as 5.0.0).
   The two `5.0.0 relocation` mentions in `.dev/guides/versioning.md:21,32` (a file item 6 edits anyway) now say 5.1.2
   too. `5.0.0` stays where it is history (CHANGELOG, `.dev/features/**`).
3. **SECURITY.md:7: fixed.** `/pharn-ship` and `/pharn-review` via `run-marker.mjs`; `/pharn-loop` via
   `require-loop-record.cjs --open|--close` (`run-marker.mjs:118` `RUN_MARKER_COMMANDS`, `:155` refuses `pharn-loop`).
4. **runtime-floor.mjs:8: fixed (the header was the stale side).** pharn-cli `package.json` `engines.node >=24.2.0`
   (0.16.0); pharn-cli CHANGELOG `[0.8.0]`: `init`/`update` refuse below 24.2.0 themselves. README.md:112-113 was already
   correct; the header now says the installer admitted Node 20 then and refuses older since 0.8.0.
5. **"the human approved": fixed at three sites; one cited site was not a bug.** `pharn-ship-stages.md:140`,
   `pharn-ship-close.md:392`, `check-spec-approved.mjs:126` now say `state: Approved` + pin. `check-spec-approved.mjs:130`
   (`GREEN — spec Approved and un-drifted; safe to plan`) already describes only the state; unchanged (a test pins it,
   `check-spec-approved.test.mjs:214`).
6. **versioning.md publish-first rule: added** (`.dev/guides/versioning.md`, end of `## MIN_CLI`). Verified in pharn-cli
   `src/lib/skills-version.ts:79` that `MIN_CLI` is read "from a fetched clone" (the ref being installed).
7. **release.yml: fixed.** `gh api .../commits/dd0bb3d3/check-runs` names: `floor`, `check`, `gitleaks`,
   `Analyze (javascript-typescript)`, `Socket Security: Project Report`, `release`, `comment`. Ruleset 25907495
   (`bypass_actors: []`) requires floor, check, Analyze, both Socket checks — NOT gitleaks; classic
   `branches/main/protection` requires check, floor, gitleaks, Analyze, Socket Project Report (`enforce_admins: false`).
   Ruleset 18045407 holds pull_request/required_signatures/deletion/non_fast_forward only, owner bypass `always`.
   `REQUIRED_CHECKS` gains `github-actions gitleaks`; the comment cites 25907495 + classic protection. `:13`: run
   41463486661 failed `TAG_ELSEWHERE: v7.1.4 points at 62526d8a…, not 4faed62e…` (40783827195 the same shape) → the
   comment and `CONTRIBUTING.md:89` say a non-bump merge fails TAG_ELSEWHERE, expected. `:64`: `check` measured
   11m02s (dd0bb3d3), 12m53s (ea11383a), 13m43s (62526d8a); the report's 14m25s/14m36s → "11 to 15 minutes". Orchestrator
   extra: the "WHO MAY EDIT" comment now says the setter refuses this file from any plan since 7.3.0 unless a human
   passes `--allow-exec-config`, and a Bash write still reaches it. Test: `.dev/floor/release-workflow.test.mjs` —
   `RULESET_REQUIRED` re-read from 25907495, new `CLASSIC_REQUIRED`, the ✧ list test over their union, `ALL_GREEN`
   now has gitleaks success and an unrequired red `comment`, new ★ "a failed gitleaks run ends the job at once".
8. **Stale headers: fixed (all four verified stale).** `pharn/floor/check-regress.mjs:7` (`.claude/commands/regress.md`
   does not exist → `pharn-regress.md` via `stage-regress.mjs`, and `pharn-dev-regress.md`);
   `.dev/floor/check-variance.mjs:2,7,35,71` (`floor/…` → `.dev/floor/check-variance.mjs`,
   `pharn/floor/check-structural.mjs`; `:71` is the usage message, no test pins it);
   `pharn/pharn-review/trust-fence/trust-fence.md:82` → `pharn/floor/check-structural.mjs`;
   `pharn/pharn-contracts/stage-exit.md:20` → `pharn/pharn-contracts/gate-run-record.md`.
9. **check-surface-bump whitespace version: fixed + test.** `.dev/floor/check-surface-bump.mjs` `VERSION_RE`
   (`/^\d+\.\d+\.\d+$/`, release.yml's TAG_RE minus `v`); `judge()` counts a bump only when the head version matches;
   own NOT_BUMPED wording. Test G9 in `check-surface-bump.test.mjs`: eight non-bare spellings refused, a real bump and a
   no-surface change still GREEN, and an end-to-end `1.0.0 \n` run exits 1.
10. **npm audit fix: done, lockfile only.** Before: 12 (2 low, 6 moderate, 4 high). After: 11 (2 low, 6 moderate,
    3 high). Bumped: eslint 10.13.0 → 10.14.0, @eslint-community/eslint-utils 4.9.1 → 4.10.1, brace-expansion 5.0.6 →
    5.0.12, minimatch → 10.2.6. Left: re2js/markdownlint/markdownlint-cli2/katex/micromark-extension-math (fix =
    downgrade markdownlint-cli2 to 0.23.3, `isSemVerMajor`), eslint family moderates (fix = older major). `npm ci` exit
    0 afterwards; `package.json` unchanged.
11. **Stale "EXPECTED TO FAIL" comments: reworded (comments only).** `enforce-writes-scope.test.cjs` five sections
    (6.24.0 ×2, write-guard-narrowing 6.31.1, hook-hardening-batch 6.71.0, TST-12 6.73.1),
    `protect-trusted-paths.test.cjs` three (6.31.1, 6.71.0, SEC-11 6.73.1), `set-writes-scope.test.cjs` three (6.24.0,
    6.71.0 ×2). Versions from CHANGELOG `[6.73.1]` (SEC-11, TST-12), the writes-scope guide (6.24.0, 6.71.0) and CLAUDE.md
    (6.31.1). All those suites pass (see gates).
12. **instruction-files headers: fixed.** `pharn/floor/instruction-files.mjs:7-10` and `instruction-files-core.mjs:47-48`
    now say `enumerate()`'s list is the reconciled set's source and keeps `pharn/.run/`, which reconcile's set drops
    since 7.2.0 (`reconcile-baseline.mjs:36-37`, `buildRecord` `isStateRootPath`). Behaviour unchanged.
13. **New pins: added.** `.dev/floor/ci-steps.test.mjs` (new): ci.yml "Validate floor" and `check:markers` steps exist
    with the install-gated `if:`, floor.yml's "Validate floor" runs unconditionally, plus a discriminating negative
    control. `.dev/floor/test-globs.test.mjs`: `test:coverage` globs == `test` globs, in order, with a dropped-glob
    control.
14. **README / CLAUDE.md: fixed.** `README.md:264-265` (reconcile leaves `pharn/.run/` out whether or not ignored,
    7.2.0); `README.md:330-332` (gate map validated for internal consistency; a self-consistent fabricated stamp
    passes); `CLAUDE.md:109-112` (ruleset 25907495 binds every account to the required checks since 2026-10-26; the
    owner's bypass skips the review and classic `gitleaks`).
15. **Prompt hygiene: fixed.** `pharn-dev-plan.md` Step 1.4 gains `pharn-plan.md:108-110`'s DATA sentence;
    `pharn-build.md:44-52` trusted prefix treats the existing source it reads as `trust: untrusted` DATA.
16. **`npx --no-install`: fixed in four dev commands; four left to their owners.** Converted: `pharn-dev-plan.md:274-275`,
    `pharn-dev-grill.md:278-279`, `pharn-dev-regress.md:260-261`, `pharn-dev-ship.md:364-365`. NOT converted (owned by
    other groups per GROUPS.md): `pharn-dev-build.md:106,116,126` (G1), `pharn-dev-verify.md:223-224` and
    `pharn-dev-review.md:130-131` (G5), `pharn-dev-memory-promote.md:420-421` (G9; `--check` form). New ✧ pin in
    `command-hygiene.test.mjs` with `NPX_PENDING` = those four; each must still hold a bare line, so the orchestrator
    removes an entry when its owner's branch converts it (the test fails until then). No existing pin broke.
17. **GITHUB_TOKEN: a real gap, fixed + tests.** Why it was excluded (`check-run-isolation-core.mjs:29-31`,
    `loop-record.md:233-235`): in Actions it is ephemeral and in every run, so listing it would make
    `env:GITHUB_ACTIONS` useless. That reason holds only under Actions; in a dev container / Gitpod / `PHARN_ISOLATED=1`
    shell an exported PAT read `ISOLATED`. Fix: new code `cred:env:GITHUB_TOKEN` (after `GH_TOKEN` in
    `CREDENTIAL_CODES`), new `CREDENTIAL_ENV_OFF_ACTIONS`, counted only when `GITHUB_ACTIONS !== "true"`; the CLI reads
    the var; contract table + selection rule updated (`loop-record.md`; the table is pinned to `CREDENTIAL_CODES` by
    `check-run-isolation-core.test.mjs`). Tests: new ★ "GITHUB_TOKEN counts everywhere except GitHub Actions", frozen
    order test covers both sides, CLI env test reads it. `run-gates.mjs:966` passing `process.env` is unchanged: that is
    the documented env-passthrough bound in SECURITY.md, not this gap.
18. **TAKEOVER tests: fixed (virtual clock).** Cause: `entry-gates.mjs:765` gives a takeover its free first step only if
    the wait reached it within `POLL_MS` (250 ms); after it, `mayStartSlowStep` needs elapsed + 300000 <= 300000, so a
    loaded call runs zero or one gate and six calls can all end on exit 5. Fix (`entry-gates.test.mjs`, "THE TAKEOVER
    CLOCK"): both tests' `--wait` calls run with `--import` of `test-fixtures/virtual-clock/preload.mjs`
    (`git=__entry-gates-takeover-never__&ms=1`, so `Date.now()` stays frozen); children keep the real clock;
    assertions unchanged. Measured: both pass alone (10.5 s, 11.0 s) and with 48 extra busy-loop processes at load
    average 84 on 8 cores (15.3 s, 15.8 s). Not measured: the old tests under the same load in this run (no in-repo
    copy was made to keep writes in scope); the failure is the report's, `expected 4, actual 5`.

## Gates

(recorded verbatim below once run)
