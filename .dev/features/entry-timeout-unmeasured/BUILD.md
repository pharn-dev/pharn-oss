# BUILD — entry-timeout-unmeasured

Built on `fix/entry-timeout-unmeasured` from `origin/main` `471a54bb` (SKILLS_VERSION 6.73.2; re-fetched before Step 0,
unchanged, PR #392 not merged so nothing was folded in). Spec hash re-checked: MATCH. Scope set from the plan (19 paths)
and the reconcile baseline anchored after it.

`entryVerdict` now takes "not measured" from `gate-run-core.mjs` `unmeasuredRuns` (minus the `base:test` slot) and lists
those gates in `unmeasured: [{id, cause}]`, never in `red`/`unattributed`; status is red-first, then `unmeasured` (exit
6), then green. `DOC_KEYS`, `entryDocument` and `documentDefect` carry the closed key for every status. `--wait`'s
TAKEOVER path writes the same `result.json` and re-enters the one `decideDone`, so it needs no change (GRILL concern 2,
read this run). `/pharn-loop` gained S14b `blocked: gates-unmeasured-at-entry` on exit 6 (S14 also copies unmeasured
entries; `--allow-red-entry` covers both), `/pharn-ship` asks on exit 6 with the unmeasured entries, and the S14b remedy
text names the 540 s as "the per-gate timeout this command pins for every gate run" (GRILL concern 1). Tests: the two
tests that pinned "a timeout is red" now assert unmeasured; new core tests cover both causes with measured-red controls,
every style gate, red-first precedence, the L35 one-owner diff and source closure, `EXIT.unmeasured === 6`, and the
closed document over every status; WIRING builds the `6` from `EXIT`; `STUCK_POINTS` has S14b (17). Step 2b formatted the
12 scoped paths that exist (prettier changed `entry-gates-core.mjs` and re-padded the stop table in `pharn-loop.md`);
whole-repo `format:check`, `lint:md`, `lint` and `docs:check` are clean; the six touched suites pass 406/406. Floor:
`node pharn/floor/validate.mjs .` → GREEN (37 capabilities).

Deviation: `SKILLS_VERSION` was written with a Bash `printf` (a declared path, so the guards would have allowed it and
reconcile does not flag it), not with the Write tool.

## GATE 2 fix iteration (2026-10-25)

Before Step 0 the branch fast-forwarded to the review commit (`817b7380`) and merged `origin/main` twice: `56e3989c`
(#392; the `CHANGELOG.md` conflict resolved by moving #392's `[Unreleased]` entry into the then-`[6.74.0]` section) and
`30968218` (#393, which shipped 6.74.0 and had already folded #392's entry into its own section; auto-merged). The plan
was amended (four more paths, the GATE 2 section, the `build-gate-unmeasured` follow-up), the scope re-set from it (23
paths) and the baseline re-anchored after the setter. Spec hash: MATCH.

Renumbered to 6.75.0 by diff (`SKILLS_VERSION` through the Write tool this time, the badge, the CHANGELOG section,
`entry-gates-core.mjs`, `entry-gates.mjs`, `entry-gates.test.mjs`, the hygiene comment, the guide); main's released
`[6.74.0]` and `command-hygiene.test.mjs`'s own 6.74.0 comments are untouched. Review findings 1–8 fixed as the plan's
GATE 2 section lists: the CHANGELOG Why bullet now names `/pharn-build`'s gate as the open case; "green, red or
unmeasured" in the base-evidence comments and test name; `unmeasuredRuns`' header names `entryVerdict`;
`documentDefect` refuses a green document with unmeasured entries (one new defect case, which fails against the
pre-fix rule); the base:test test asserts `unmeasured: []`; the README, ship Continue option and loop S14b prose
wordings. Step 2b formatted 22 of 23 scoped paths (SHIP.md does not exist yet). The six touched suites pass 477/477;
`validate.mjs .` → GREEN (37 capabilities).
