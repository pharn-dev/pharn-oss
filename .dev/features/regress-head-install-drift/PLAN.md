# PLAN — regress-head-install-drift: the HEAD gates do not run over an install that does not match its lockfile

- spec_content_hash: d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4
- applied_lessons: [L27, L35, L41, L43, L59, L62]
- increment: before any HEAD gate runs, `/pharn-regress` and `/pharn-verify` compare npm's record of the installed tree (`node_modules/.package-lock.json`) with the lockfile the project declares; a mismatch, or a lockfile listing packages with no `node_modules` at all, is a new refusal `head-install-drift` naming the install command, in seconds instead of after the gates; every other state is reported, never refused.
- layer(s): pharn-floor (product), pharn-contracts (three contracts amended, none added), product `.claude/commands` (two thin callers)
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]

## Why (P7)

The batch brief's evidence (§2, finding 2), re-read this run, read-only:

- `~/Projects/pharn-starter/pharn/features/billing-plan-catalog/LOOP.md` (the 92-minute run, 2026-10-05): the second
  `/pharn-regress` run ended `regressions` — `typecheck` exit 0 at base, exit 1 at head. The errors sit in
  `sentry.edge.config.ts`, `sentry.server.config.ts`, `shared/lib/sentry/init-options.ts`, which the build did not
  change; `npm ls @sentry/core` showed a stale `@sentry/core@10.75.0` (invalid against `^11.0.0`) at HEAD, while the
  BASE side ran on a fresh `npm ci` (`stage-regress-core.mjs` `INSTALL_RULE`). The lockfile moved on 2026-09-29/30
  (`git log -- package-lock.json`: #175 `@sentry/nextjs` 10.75.0 → 11.0.0, #176, #178); `node_modules/.package-lock.json`
  is dated 2026-10-05 12:10, i.e. reinstalled two hours AFTER the run.
- `.dev/measurements/loop-wall-clock-2026-10-05.md`: that regress took 4 script calls (134 / 188 / 146 / 192 s = 660 s),
  then `/pharn-verify` ran 4.5 min on the same tree. The two other runs (`workspace-wording-ui`, `locales-en-pl-only`,
  2026-09-30, right after #175/#176) record the same Sentry `typecheck` red as "two copies of `@sentry/core` after the
  bump" — consistent with a stale install, **not proven** (that `node_modules` is gone).
- **A second, live occurrence, measured today (read-only):** this repository's own main checkout
  (`/Users/pgalarowicz/Projects/pharn-oss`) has `package-lock.json` at the #302 `markdownlint-cli2` 0.23.3 bump while
  its `node_modules/.package-lock.json` still records 0.23.2 — 12 packages changed, 1 missing
  (`markdown-it/node_modules/argparse`). "Pulled a dependency bump, never re-installed" is the ordinary state of a
  working tree, not an exotic one.

Two environments compared as one: the regress verdict blamed the feature for a red the install caused, and
`/pharn-verify` (absolute threshold, same tree) would FAIL the same way, so `/pharn-loop` would CONTINUE into rebuild
iterations that cannot reach `node_modules`.

## Confirmed current behavior (read this run, branch base 1b737cd = origin/feat/regress-pre-run-snapshot, 6.37.0)

- `stage-regress.mjs` phases `fresh → chain → base → partition → head-init → drain-head → worktree → install →
base-init → drain-base → verdict → cleanup → render`. Only the BASE worktree gets an install (`INSTALL_RULE`:
  `lockfilesAtBase` via `git cat-file -e`, `resolveInstall` → `npm ci` for npm, MEASURED; pnpm/yarn/bun UNMEASURED).
  The HEAD gates run in the user's working tree over whatever `node_modules` it holds; nothing looks at it.
- `stage-verify.mjs` phases `fresh → chain → pairs → verifiers → init → drain → verdict → render`; every refusal is
  raised before `drain`; a refusal writes `VERIFY.md` and no `verify-report.json`.
- `stage-exit-core.mjs` `REGISTRY.regress.refused` = `missing-artifact, chain-red, plan-files-unparseable,
scope-escaped`; `REGISTRY.verify.refused` = the first three. `/pharn-loop` maps every `refused` of either stage to
  **S9** by status (`pharn-loop.md`, "stage-exit mapping"); `/pharn-ship` STOPs on a missing `regression-report.json`
  and on any non-`done` verify exit. So a new refused code needs no orchestrator edit.
- npm (11.12.1, read from `@npmcli/arborist/lib/shrinkwrap.js`): the hidden lockfile has no root entry; npm prefers
  `npm-shrinkwrap.json` over `package-lock.json` when both exist; npm itself trusts the hidden lockfile only when no
  package folder is newer than it (`assertNoNewer`).
- Measured on real trees (2026-10-05): `pharn-starter` (lock 1612 entries, hidden 1340): every entry present in both is
  byte-equal on every field; all 271 non-root lock entries absent from the hidden lockfile carry `optional: true`
  (platform binaries). This worktree after `npm ci`: 0 differences.
- Measured with npm in a scratch project (two local tarball versions, offline): copying a newer `package.json` +
  `package-lock.json` over an installed tree (what `git pull` does) leaves the hidden lockfile at the old version → a
  mismatch; `npm ci` then makes all three agree (the remedy is reachable, L27). **And a false negative:** `npm install
--package-lock-only` rewrites the hidden lockfile to the new version while `node_modules` keeps the old one.

## The design

### The check — `install-drift-core.mjs` (pure) + `install-drift.mjs` (reads the tree)

`readInstallCheck(root)` (no default root, L41) reads, at `root`: `package.json` presence, each lockfile family's
presence (`LOCKFILE_FAMILIES`, below), and for npm the lockfile, `node_modules` and `node_modules/.package-lock.json`.
`statSync` (following a link — a linked `node_modules` is a real layout) then `isFile()`/`isDirectory()` before any read,
so a FIFO, a directory or a dangling link is never read or blocked on (L59); the path-kind fixtures are enumerated. It
hands the parsed values to the pure `installCheck(inputs)`, which returns ONE closed result:

| `state`         | when                                                                                                                                                                                                                                                                           | refuses? |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| `clean`         | npm; every compared entry agrees (or the lock lists no installable package and there is no `node_modules`)                                                                                                                                                                     | no       |
| `drifted`       | npm; ≥ 1 entry `changed`, `missing` or `extraneous`                                                                                                                                                                                                                            | **yes**  |
| `not-installed` | npm; the lock lists ≥ 1 package that would count as `missing` (below) and there is no `node_modules`                                                                                                                                                                           | **yes**  |
| `not-checked`   | with a closed `why`: `no-manifest`, `no-lockfile`, `several-lockfile-families`, `unmeasured-family` (pnpm/yarn/bun), `lockfile-unreadable`, `lockfile-unsupported` (no `packages` map, npm ≤ 6), `node-modules-unreadable`, `no-hidden-lockfile`, `hidden-lockfile-unreadable` | no       |

The comparison, over keys with a `node_modules/` segment only (a workspace's own folder entries are source, not an
install): `changed` = present in both and `version`, `link`, and (`integrity` when both carry one, else `resolved`)
differ — integrity first, so a registry-host difference in `resolved` cannot read as drift; `missing` = in the lock,
absent from the hidden lockfile, and the lock entry carries **none** of `dev`, `peer`, `optional`, `devOptional`
(GATE 1 change); an absent entry that carries one of them is `missing-unchecked` — counted and reported, never drift,
because npm skips an optional package that does not fit the platform (the 271 measured above) and an install
configured with `omit=dev`, `NODE_ENV=production` or `legacy-peer-deps` leaves dev/peer entries absent on every
`npm ci`, which would otherwise be a permanent false stop with no remedy (L27); `extraneous` = in the hidden lockfile,
absent from the lock. Lockfile = `npm-shrinkwrap.json` when present, else `package-lock.json` (npm's own precedence).
Non-string field values are compared by `JSON.stringify` (total over parsed JSON) and shown as `null` (L62).
**Residual, stated:** a dev/peer/optional package that is really needed and really absent reads `clean` (its gate fails
as today); `changed` always counts, so the measured `@sentry/core` case (a changed version) is still caught.

The result also carries `family`, `lockfile`, `counts` `{changed, missing, extraneous, missing_unchecked}`, at most 20 `mismatches`
`{path, kind, lockfile, installed}` sorted by path (DATA), and `remedy` = `resolveInstall(...)`'s command over the
HEAD tree's lockfile families — `INSTALL_RULE`, the one owner of the install command (L35), so `npm ci` for npm, the
command the BASE side runs. `detailText(result)` renders the refusal detail (fixed sentences + the capped list);
`headInstallBlock(result)` the report block `{state, why, family, lockfile, counts}`; `validateHeadInstallBlock` its
closed shape.

`LOCKFILE_FAMILIES` (the file names that mean each family) moves into `stage-regress-core.mjs` beside `INSTALL_RULE`,
and `stage-regress.mjs`'s `lockfilesAtBase` derives from it, so BASE and HEAD read the same names (L35).

### The response — (a) refuse, chosen; (b) and (c) weighed

- **(a) Refuse before any gate**, `refused head-install-drift`, in both stage scripts: `REGRESSION.md` / `VERIFY.md`
  quote the detail (counts, the capped list, the remedy command) as DATA; no report JSON is written (unchanged
  refusal semantics). `/pharn-loop` → **S9** `blocked: stage-refused` by its existing status rule; `/pharn-ship` →
  STOP. A refusal with a reachable one-command remedy beats a false verdict: the user's fix is `npm ci`, not a rebuild.
- **(b) Install at HEAD** — **declined.** `npm ci` deletes `node_modules` first: unattended, it would remove a user's
  `npm link`s and any hand-placed package, in their working tree. No evidence asks for it (P7). Named follow-up only.
- **(c) Label instead of refuse** — **declined as the response** (verify's absolute threshold reads the same tree, so a
  label on regress would not stop the CONTINUE iterations); **kept as the report** for the states that do not refuse:
  `regression-report.json` and `verify-report.json` gain an additive, advisory `head_install` block, and
  `REGRESSION.md` / `VERIFY.md` one line, so a reader of a red verdict sees `not-checked` (e.g. pnpm) when the
  install was not checked.
- **A build that changes the lockfile:** a dependency added through `npm install <pkg>` updates both files → `clean`.
  A lockfile edited without an install is `drifted` → S9 with `npm ci` as the remedy; before this, its gates ran over
  the old `node_modules` and the loop iterated. Named in the contract.

### Where it runs

- **regress:** first thing in `head-init` (after the partition's `scope-escaped` refusal, before `run-gates.mjs init`).
  The result is written to `.pharn/pharn-regress/head-install.json` (new `REGRESS_PATHS.headInstall`, cleared by the
  fresh start like the rest of the scratch) and re-read, validated, at `render` — so a resumed chain reports it, and
  the progress record's schema is untouched (the `scope.json` / `pre_run_snapshot` precedent; the block a resumed
  chain renders is advisory). A resume does not re-check (the gates already ran).
- **verify:** first thing in `init` (before `run-gates.mjs init`), the same function (L35) — this matters most for the
  quick modes, which run no regress: verify is their first gate run. Recorded at `.pharn/pharn-verify/head-install.json`
  (new `VERIFY_PATHS.headInstall`), read at `verdict`, merged by `composeReport` as `head_install` (`MERGED_KEYS`).
  `stage-verify-core.mjs`'s one-import pin stays: it shape-checks a plain object; the caller validates the block.
- **Consequence for verify's verdict:** none for a non-drifted tree — `check-verify.mjs` is untouched and the block is
  not a verdict input. A drifted tree no longer gets a verdict at all: `refused head-install-drift`, no report.
- **Export for the entry pre-flight:** `readInstallCheck(root)` + `refuses(result)` are exported; the sibling
  `loop-entry-preflight` can call them at `/pharn-loop` / `/pharn-ship` entry. Follow-up
  `entry-preflight-install-drift` — not wired here.

## Files

- `pharn/floor/install-drift-core.mjs` — NEW, pure: closed states/whys, the npm comparison, the result, detail text, the report block and its validator — layer pharn-floor
- `pharn/floor/install-drift-core.test.mjs` — NEW: every state and why, the comparison rules, the cap, the measured shapes, L62 controls — layer pharn-floor (test)
- `pharn/floor/install-drift.mjs` — NEW, reads the tree: `readInstallCheck(root)`, `recordInstallCheck`, `readRecordedInstallCheck` — layer pharn-floor
- `pharn/floor/install-drift.test.mjs` — NEW: the path-kind enumeration (regular, link to file, link to dir, dangling, FIFO, directory), shrinkwrap precedence, round-trip of the record — layer pharn-floor (test)
- `pharn/floor/stage-regress-core.mjs` — `LOCKFILE_FAMILIES`; `REGRESS_PATHS.headInstall` — layer pharn-floor
- `pharn/floor/stage-regress-core.test.mjs` — pins for the two additions — layer pharn-floor (test)
- `pharn/floor/stage-regress.mjs` — `lockfilesAtBase` from `LOCKFILE_FAMILIES`; the check at the top of `head-init`; the refusal; the block into the report and the render — layer pharn-floor
- `pharn/floor/stage-regress.test.mjs` — drifted / not-installed refuse before any gate (no `head/` stamp), clean and not-checked proceed with the block in the report — layer pharn-floor (test)
- `pharn/floor/stage-verify-core.mjs` — `VERIFY_PATHS.headInstall`; `composeReport` merges `head_install` — layer pharn-floor
- `pharn/floor/stage-verify-core.test.mjs` — the merge and its refusal of a non-object — layer pharn-floor (test)
- `pharn/floor/stage-verify.mjs` — the check at the top of `init`; the refusal; the block at `verdict` — layer pharn-floor
- `pharn/floor/stage-verify.test.mjs` — the same four cases for verify — layer pharn-floor (test)
- `pharn/floor/stage-exit-core.mjs` — `head-install-drift` in `regress.refused` and `verify.refused` — layer pharn-floor
- `pharn/floor/stage-exit-core.test.mjs` — the two registry pins — layer pharn-floor (test)
- `pharn/floor/render-regression.mjs` — one `HEAD install` line in `renderDone` — layer pharn-floor
- `pharn/floor/render-regression.test.mjs` — the line per state — layer pharn-floor (test)
- `pharn/floor/render-verify.mjs` — the same line in `renderDone` — layer pharn-floor
- `pharn/floor/render-verify.test.mjs` — the line per state — layer pharn-floor (test)
- `pharn/pharn-contracts/regression-report.md` — "The additive `head_install` block" + the refusal — layer pharn-contracts
- `pharn/pharn-contracts/verify-report.md` — the same block for verify — layer pharn-contracts
- `pharn/pharn-contracts/stage-exit.md` — `head-install-drift` in both vocabularies — layer pharn-contracts
- `.claude/commands/pharn-regress.md` — one remedy line under `3` refused — product command
- `.claude/commands/pharn-verify.md` — one remedy line under `3` refused — product command
- `.dev/floor/command-hygiene.test.mjs` — BUILD AMENDMENT: the `composeReport` source pin gains `head_install` (one regex) — apparatus (test)
- `CLAUDE.md` — a short block for the check under the stage-script entries — repo-meta
- `CHANGELOG.md` — the release section — repo-meta
- `SKILLS_VERSION` — minor bump — repo-meta
- `README.md` — the version badge — repo-meta
- `.dev/features/regress-head-install-drift/PLAN.md` — this plan — apparatus
- `.dev/features/regress-head-install-drift/GRILL.md` — grill log — apparatus
- `.dev/features/regress-head-install-drift/BUILD.md` — build record — apparatus
- `.dev/features/regress-head-install-drift/REGRESSION.md` — dev regress render — apparatus
- `.dev/features/regress-head-install-drift/regression-report.json` — dev regress report — apparatus
- `.dev/features/regress-head-install-drift/VERIFY.md` — dev verify render — apparatus
- `.dev/features/regress-head-install-drift/verify-report.json` — dev verify report — apparatus
- `.dev/features/regress-head-install-drift/REVIEW.md` — review record — apparatus
- `.dev/features/regress-head-install-drift/SHIP.md` — ship record — apparatus

## Contracts satisfied

- `stage-exit.md` — a new `refused` member per stage, `refused` semantics unchanged (a render, no report JSON).
- `regression-report.md`, `verify-report.md` — additive keys only ("Extra keys are IGNORED"); every floor field and
  every `check-loop-fresh.mjs` `COMPARED_FIELDS` member keeps its bytes.

## Evals to write (P1)

No capability is added (no `role:` file), so no eval fixture; the floor modules carry `node --test` suites (above).

## Guarantee audit (P0)

- "A drifted npm tree stops before any HEAD gate runs" → floor: enum/regex (tested code over the two files' parsed
  content and closed sets), in the invocation that runs head-init / init.
- "The installed tree matches the lockfile" → **NOT claimed.** The check certifies that npm's own record of what it
  installed agrees with the lockfile (L43): a `node_modules` changed outside npm, or by `npm install
--package-lock-only` (measured), reads `clean`. Every false `clean` is today's behaviour, never a false refusal.
- "pnpm / yarn / bun installs are checked" → **NOT claimed**: `not-checked` `unmeasured-family`, reported.
- The `head_install` block in a report → advisory (re-read from `.pharn/`, which the write tools reach while paused).
- The remedy `npm ci` is reachable → measured once (scratch probe). An npm config that omits dev or peer
  dependencies (`omit`, `NODE_ENV=production`, `legacy-peer-deps`) leaves only `missing-unchecked` entries, which never
  refuse (GATE 1 change), so no refusing state is one `npm ci` cannot clear.

## Trust audit (P2)

`package-lock.json` and the hidden lockfile are project content the build can write: their keys and values are
untrusted. Only enums, integers and booleans branch; package paths and versions reach the refusal detail as JSON
strings inside the existing DATA fence (`renderRefused` → `quoteData(dataText(…))`) and never reach the report block
(counts and enums only). No path is derived from a lockfile key, so no key can steer a read.

## Determinism audit (P5)

Every branch is membership over parsed JSON and file kinds; every unknown is a closed `not-checked` `why`, which
proceeds exactly as today (the status quo), never a guess. No question is added.

## Applied lessons

- L27 — the one remedy (`npm ci`) is printed only for the two refusing states and was measured to reach `clean`; the
  thin callers name it only under `head-install-drift`; `not-checked` prints no remedy; and (GATE 1) an absent
  dev/peer/optional entry never refuses, because for an install that omits them `npm ci` cannot clear it.
- L35 — one owner each: the install command (`resolveInstall`), the lockfile names (`LOCKFILE_FAMILIES`, which
  `lockfilesAtBase` now reads), the check (one function both stage scripts call).
- L41 — `readInstallCheck(root)` has no default root; every test passes it.
- L43 — the check compares two records npm writes, so the claim is agreement, never "the install is right"; the
  measured `--package-lock-only` false negative is named.
- L59 — every path is `stat`ed and kind-checked before a read; the tests enumerate the path kinds.
- L62 — lockfile values may be any JSON: compared via `JSON.stringify`, shown only when a string, with a
  `{"toString":1}` control.

## Expected time saving (the 92-minute run)

- That run: the second regress's 660 s of install and gates and verify's 4.5 min become one refusal in under a second
  at head-init → **≈ 15.5 min** earlier stop, and the stop names `npm ci` instead of a false `typecheck` regression
  diagnosed by hand.
- A loop over the same tree: verify FAILs on the same red → `check-loop.mjs` CONTINUE → each further iteration
  (build 25.5 + regress 11 + verify ≈ 5–10 min, the brief's 25–45 min) cannot reach `node_modules`. At cap 3 that is
  2 × (25–45) = 50–90 min plus iteration 1's ≈ 15.5 min → **≈ 65–105 min** replaced by an S9 stop seconds into
  iteration 1. Only when the install is drifted; otherwise the check costs two JSON parses (measured at build).

## Named residuals (not closed here)

- `entry-preflight-install-drift` — call `readInstallCheck` at `/pharn-loop` / `/pharn-ship` entry (sibling builder).
- `head-install-opt-in` — option (b), an explicit opt-in install at HEAD; no evidence asks for it.
- npm's own freshness walk (`assertNoNewer`) is not mirrored: a hidden lockfile older than a package folder is trusted.
- `/pharn-dev-regress` / `/pharn-dev-verify` (prose) are unchanged.

## GATE 1 (orchestrator, under the user's delegation — a model decision, not a human approval)

Approved with one change, 2026-10-05:

- Response (a) refuse — accepted; (b) declined with the follow-up `head-install-opt-in` named; (c) advisory labelling
  in the `head_install` block — accepted.
- Every `not-checked` state fails open (proceeds as today) and is reported in the `head_install` block.
- **CHANGE:** a `missing` entry counts as drift only when its lockfile entry carries none of `dev`, `peer`,
  `optional`, `devOptional`; the others are `missing-unchecked` (advisory, counted). `changed` and `extraneous` always
  count. No opt-out flag. The residual (a needed dev package that is really absent reads `clean`) is stated above.
- The L43 bound and "a lockfile edited without an install now stops at S9 with `npm ci` as the remedy" are accepted as
  stated bounds; the latter is said in the CHANGELOG.
- Keep the `stage-regress.mjs` diff local.

## Grill amendments (builder, after `/pharn-dev-grill`; GRILL.md has the findings)

- G1 — the `clean` line says what was compared ("npm's record of the installed tree agrees with `<lockfile>`"), never
  "the install is correct".
- G2 — an absent or malformed recorded block renders `head_install: null` and "HEAD install: not recorded"; never a
  refusal, never a made-up state.
- G3 — a test feeds a lockfile key with a newline and a backtick run through the refusal render: one fenced block.
- G5 — integration fixtures git-ignore `node_modules/`; refusal tests assert `reason_code` `head-install-drift`, with a
  matching-hidden-lockfile control that reaches `done`.
- G6 — `--no-install` and `--gates` do not change the HEAD check; the contract says so.
- Declined: G4 (move INSTALL_RULE to a neutral module — pinned imports and contract cites; follow-up only if a third
  stage needs it), G7 (drop the `not-checked` labelling — accepted at GATE 1).

## Open questions (HALT)

None.
