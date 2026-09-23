# PLAN — markdownlint-no-globs

- spec_content_hash: edc3d07df3ef76f983fe3763671eb66aa37c242f46f0e4c0fbca30ce091a5d2c # fix #4, pharn/ARCHITECTURE.md
- applied_lessons: [L4, L11, L13, L16, L19, L20, L22, L25, L26, L29, L31, L34, L36, L37, L38, L45, L50, L52]
- increment: Add `--no-globs` to every command-prescribed `markdownlint-cli2` invocation that names explicit paths (eight dev, two product), so a run lints exactly the named files instead of the named files PLUS the config's `**/*.md` globs; pin the rule with a closure test and a negative control; stop `.markdownlint-cli2.jsonc` from descending into other sessions' worktrees.
- layer(s): `.claude/commands/` (dev apparatus + product surface), `.dev/floor/` tests (apparatus), repo-meta (`.markdownlint-cli2.jsonc`, `SKILLS_VERSION`, `README.md`, `CHANGELOG.md`) # pharn/ARCHITECTURE.md §4 — no `pharn/` capability layer is touched
- constitution_refs: [P0, P5, P6, P7]

## The failure (P7 trigger — observed, human-reported, then re-measured this run)

**Human-reported, 2026-09-23.** A `/pharn-dev-build` Step 2b run (the pinned
`printf '%s\n' "$MD" | xargs npx markdownlint-cli2 --fix` line) rewrote 124 files in ANOTHER Claude
session's worktree, `.claude/worktrees/agent-feedback-other-project-085ad9/`: two tracked test fixtures
(`.dev/floor/test-fixtures/changelog-per-pr/{base,head}.md`, trailing blank line removed) and 122
`node_modules/**/README.md`-type files. The human restored them by hand. That report is the trigger; the
counts in it are the human's, not re-measured here.

**Re-measured this run (P6, read-only, markdownlint-cli2 v0.23.2), from this worktree:**

| invocation (no `--fix`)                            | `Linting:` | wall time  |
| -------------------------------------------------- | ---------- | ---------- |
| `markdownlint-cli2 CLAUDE.md`                      | 1340 files | ~4.5–4.9 s |
| `markdownlint-cli2 --no-globs CLAUDE.md`           | 1 file     | ~0.18 s    |
| `markdownlint-cli2 --no-globs CLAUDE.md README.md` | 2 files    | —          |
| `markdownlint-cli2 --no-globs LIMITS.md` (ignored) | 0 files    | —          |
| `markdownlint-cli2 --no-globs` (no paths at all)   | 0 files    | —          |
| `markdownlint-cli2 --config <tmp cfg> <tmp file>`  | 1341 files | —          |

The `Finding:` line markdownlint prints shows the mechanism directly. Without the flag it lists
`CLAUDE.md **/*.md .dev/**/*.md !node_modules …`, so the config's `globs` are ADDED to the argv
paths. With the flag the two globs are gone and every `ignores` entry stays. So `--no-globs` keeps the
trusted-doc protection (the `LIMITS.md` row). `--config` does NOT suppress the cwd config's globs (last
row). The `Linting:` line goes to **stdout**, and `--no-globs` still reports real issues (a probe
`#  Bad heading` gave `MD019`, exit 1), so the scoped run is not vacuous.

**Why the ignores did not protect the other worktree, measured in a scratch fixture** holding a copy
of this repo's `.markdownlint-cli2.jsonc`: a bare run linted
`.claude/worktrees/x/b.md`, `.claude/worktrees/x/.dev/f/P.md`, **and**
`.claude/worktrees/x/node_modules/p/README.md` (5 files), while the ROOT `node_modules/q/README.md`
was skipped. `ignores` entries match only at the root. With `.claude/worktrees` added to `ignores`, the
same run linted 2 files. The main checkout holds `.claude/worktrees/` (git-excluded through
`.git/info/exclude`, measured: `git check-ignore -v`), which contains 4164 `.md` files plus 502 under
nested `node_modules` (a count, not a lint).

## Applied lessons

- **L4** — an authored assertion passes by construction, so the closure rule gets a mutation control
  over the REAL command bodies: strip `--no-globs` from each and require the rule to name exactly that
  site.
- **L11** — the motivation for the `.claude/worktrees` ignore. From a checkout that holds other
  sessions' worktrees, the whole-repo `lint:md` gate reads their in-progress files, so an unrelated
  file could RED this feature's verify.
- **L13** — every per-stage format step L13 created is one of the sites changed here. The step stays
  as designed; only its markdownlint line gains the flag.
- **L16** — the Step 2b empty-list guard stays. With `--no-globs` a path-less run lints 0 files
  (measured), so for markdownlint the guard becomes defense in depth. It stays load-bearing for eslint,
  and the Step 2b comment is re-derived to say which is which.
- **L19** — this is L19's class recurring inside L19/L16's own remedy. The explicit path was believed
  to scope the run, and it did not. The plan claims no more than the fix does: `--no-globs` narrows the
  TOOL's reach, it does not gate it, so a Bash write still passes neither write guard and L19 stays
  true after this lands.
- **L20** — the recurrence gets a check, not a reminder: the closure test in
  `.dev/floor/command-hygiene.test.mjs`.
- **L22** — the command line is pinned, not described. Each site's literal invocation carries the
  flag, and no prose says "remember to scope it".
- **L25** — the Step 2b rationale comment ("a bare `markdownlint-cli2 --fix` lints … the whole repo")
  was true and incomplete in the load-bearing way: it named the path-less case and not the with-paths
  case, and the with-paths case is the one that bit. The comment is re-derived, not carried across.
- **L26** — the premise probe's positive half runs at the REAL path, with the repo's own config and
  binary (`--no-globs CLAUDE.md` gives 1 file, `--no-globs LIMITS.md` gives 0). Only the negative
  control and the worktree-ignore probe use a scratch tree. That tree holds the repo's config file BYTES
  and the repo's binary, so config resolution is the same as the real run.
- **L29** — the set of invocation sites is materialized once, as `MARKDOWNLINT_SITES`, and every rule
  iterates it.
- **L31** — the set spans the dev/product copy-pair on purpose (`pharn-ship.md`,
  `pharn-memory-promote.md` beside their `pharn-dev-*` twins), so the product half cannot be the
  dropped half.
- **L34** — the closure is not vacuous: the detected-site set must EQUAL the enumeration, so a
  detector that silently stops matching fails.
- **L36** — presence is not closure. The rule ranges over EVERY detected invocation in every command,
  not over the ten sites listed, so an eleventh site written without the flag fails even before it is
  enumerated.
- **L37** — each quantified claim is probed, not read off the tool's `--help`: "lints exactly the named
  file" (1 file), "ignores still apply" (`LIMITS.md` gives 0 files), "a path-less run is harmless"
  (0 files). The probe outputs are recorded in the table above.
- **L38** — the remedy is structural (a flag at every site plus a config ignore), not "don't run two
  sessions at once", which is the discipline L38 rejects.
- **L45** — the behavioral premise test EXECUTES the installed binary under the condition that broke
  it: the repo's real config, whose `globs` are added. The negative control shows the unflagged form
  over-reaches. The suite therefore covers what the invocation does, and not only how it is spelled.
- **L50** — the sweep is by REFERENT: every place that runs markdownlint-cli2 with explicit paths or
  asserts that doing so is scoped, not only the lines spelled `--fix`. That covers the two read-only
  promote checks, the spawn in `.dev/floor/capability-catalog-core.test.mjs`, the ACCEPTED list in
  `command-hygiene.test.mjs` (which asserts the flagless form is "a scoped path"), its header comment,
  and the Step 2b comment.
- **L52** — the test's set is named in the same sentence as the rule: "every invocation in every
  command", with `MARKDOWNLINT_SITES` as the anti-vacuity enumeration. Neither is a single member
  chosen by the author.

## Sweep result (L50 — by referent, then by spelling; coverage boundary stated)

`grep -rn markdownlint` over `.claude/`, `.github/`, `pharn/floor/*.mjs`, `.dev/floor/*.mjs`,
`package.json`, `CONTRIBUTING.md` (run this session). Every hit, classified:

| site                                                                                                                                                        | form                                                    | change                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------- |
| `pharn-dev-plan.md:273`                                                                                                                                     | `npx markdownlint-cli2 --fix <PLAN.md>`                 | add `--no-globs`                               |
| `pharn-dev-grill.md:255`                                                                                                                                    | `npx markdownlint-cli2 --fix <GRILL.md>`                | add `--no-globs`                               |
| `pharn-dev-build.md:110`                                                                                                                                    | `… \| xargs npx markdownlint-cli2 --fix`                | add `--no-globs`; re-derive `:105-106` comment |
| `pharn-dev-regress.md:229`                                                                                                                                  | `npx markdownlint-cli2 --fix <REGRESSION.md>`           | add `--no-globs`                               |
| `pharn-dev-verify.md:223`                                                                                                                                   | `npx markdownlint-cli2 --fix <VERIFY.md>`               | add `--no-globs`                               |
| `pharn-dev-review.md:131`                                                                                                                                   | `npx markdownlint-cli2 --fix <REVIEW.md>`               | add `--no-globs`                               |
| `pharn-dev-ship.md:364`                                                                                                                                     | `npx markdownlint-cli2 --fix <SHIP.md>`                 | add `--no-globs`                               |
| `pharn-dev-memory-promote.md:419`                                                                                                                           | `npx markdownlint-cli2 <canon-file>` (read-only)        | add `--no-globs`                               |
| `pharn-ship.md:489` (PRODUCT)                                                                                                                               | `npx markdownlint-cli2 --fix <BRIEFING.md>`             | add `--no-globs`                               |
| `pharn-memory-promote.md:408` (PRODUCT)                                                                                                                     | `vendor/bin/markdownlint-cli2 <canon-file>` (read-only) | add `--no-globs`                               |
| `.dev/floor/capability-catalog-core.test.mjs:507`                                                                                                           | `spawnSync(markdownlint-cli2, ["--config", cfg, file])` | add `--no-globs`; assert `Linting: 1 file`     |
| `.dev/floor/command-hygiene.test.mjs:39-40,94,96`                                                                                                           | "RIGHT"/ACCEPTED forms without the flag                 | re-state with the flag                         |
| `pharn-dev-verify.md:89`, `ci.yml:32`, `package.json:32`                                                                                                    | `npm run lint:md` (whole-repo, read-only, by design)    | none, because the config ignore covers it      |
| `pharn-dev-build.md:128,135`, `pharn-ship.md:924`, `pharn-memory-promote.md:418`, `pharn-dev-regress.md:185`, `pharn-regress.md:304`, `pharn-review.md:319` | prose naming the tool or config file                    | none                                           |

**Coverage boundary (stated, per L49):** frozen history is deliberately untouched: `CHANGELOG.md`'s
released sections (append-only), `.dev/memory-bank/lessons-learned.md` (canon; L19's text stays
correct), and `.dev/features/**` (historical build records). A markdownlint invocation spelled some way
the detector does not match (through a shell variable, `npm exec`, or `node node_modules/…`) is
outside the sweep and outside the test. The test header states that.

## Files

- `.claude/commands/pharn-dev-plan.md` — Step-4 format line gains `--no-globs` — layer dev-apparatus command
- `.claude/commands/pharn-dev-grill.md` — format line gains `--no-globs` — layer dev-apparatus command
- `.claude/commands/pharn-dev-build.md` — Step 2b `xargs npx markdownlint-cli2 --no-globs --fix`; re-derive the L16 rationale comment (with-paths case named; guard now defense in depth for markdownlint, still load-bearing for eslint) — layer dev-apparatus command
- `.claude/commands/pharn-dev-regress.md` — format line gains `--no-globs` — layer dev-apparatus command
- `.claude/commands/pharn-dev-verify.md` — format line gains `--no-globs` — layer dev-apparatus command
- `.claude/commands/pharn-dev-review.md` — format line gains `--no-globs` — layer dev-apparatus command
- `.claude/commands/pharn-dev-ship.md` — format line gains `--no-globs` — layer dev-apparatus command
- `.claude/commands/pharn-dev-memory-promote.md` — read-only canon check gains `--no-globs` — layer dev-apparatus command
- `.claude/commands/pharn-ship.md` — PRODUCT: Step 2c.3 `BRIEFING.md` format line gains `--no-globs` — layer product command
- `.claude/commands/pharn-memory-promote.md` — PRODUCT: read-only vendored check gains `--no-globs`, plus one sentence on a vendored binary older than 0.12.0 (the flag's first release per the tool's own CHANGELOG), whose behavior is NOT measured — layer product command
- `.dev/floor/command-hygiene.test.mjs` — new `MARKDOWNLINT_SITES` closure section (rule, enumeration equality, discrimination, corpus mutation control, behavioral premise probe) and the ACCEPTED list and header comment re-stated with the flag — layer dev-floor test
- `.dev/floor/capability-catalog-core.test.mjs` — the style test's markdownlint spawn gains `--no-globs` and asserts `Linting: 1 file` (today it lints ~1341 files read-only, ~5 s, and any lint issue anywhere in the tree fails it as "markdownlint flagged the spliced README") — layer dev-floor test
- `.markdownlint-cli2.jsonc` — `ignores` gains `.claude/worktrees`, with a comment naming the measured reason (OPEN QUESTION 1) — layer repo-meta (shared style config)
- `SKILLS_VERSION` — `6.13.0` → `6.13.1` (patch: a correction to two shipped product commands) — layer product-surface version
- `README.md` — shields badge `pharn-6.13.0` → `pharn-6.13.1`, forced by `check:badge` — layer repo-meta
- `CHANGELOG.md` — a new `## [6.13.1] - 2026-09-23` section directly above `[6.13.0]`, one `### Fixed` entry; `[Unreleased]` holds no entries today, so none move — layer repo-meta

### Deliberately NOT in scope

- `pharn/CONSTITUTION.md`, `pharn/ARCHITECTURE.md`, `THREAT-MODEL.md`, `LIMITS.md`: trusted docs and human-only. None of them names a markdownlint invocation.
- `.claude/settings.local.json`: its `Bash(npx markdownlint-cli2:*)` allow-rule already matches the flagged form, and the file is hook-protected anyway.
- `.dev/memory-bank/lessons-learned.md`: a new lesson goes only through `/pharn-dev-memory-promote`, with the human's approval, at GATE 2.
- `.prettierignore` and `eslint.config.mjs`: a follow-up measured the same descent for `prettier --check .`. That is a different tool and a different axis (P3), and no failure has been observed there (P7). Recorded under Open questions as deferred.
- `node_modules` → `**/node_modules` in `ignores`: the only nested `node_modules` measured lives under `.claude/worktrees/`, which the new entry already covers (P7).

## Contracts satisfied

- None in `pharn/pharn-contracts/`: no capability, finding shape, or contract changes. The increment
  keeps the CLAUDE.md "Writes-scope" section's formatter discipline and L19's instruction to scope a
  formatter to the stage's own paths, and it makes that instruction true for markdownlint.

## Evals to write (P1)

- No capability is added or changed (no `role:` file touched), so P1's eval obligation does not
  apply. The executable spec is the test section below.

## Tests to write

- **`✧ every markdownlint-cli2 invocation in a command carries --no-globs`**: the closure. Every line in
  every `.claude/commands/*.md` is checked, after `COMMAND-HYGIENE:SKIP` regions are stripped and shell
  comment lines are excluded. A line matching the invocation detector
  `/\bmarkdownlint-cli2[ \t]+(?:[-<$"']|[\w.\/-]*(?:\/|\.md\b))/` must contain `--no-globs`. The detector
  counts the tool name as an invocation only when an argument-shaped token follows it: a flag, a
  `<placeholder>`, a quoted or `$` argument, or a path. So `.markdownlint-cli2.jsonc`, a back-ticked
  `markdownlint-cli2`, and `[ -x vendor/bin/markdownlint-cli2 ]` are not invocations.
- **`✧ the invocation set is exactly MARKDOWNLINT_SITES`**: the files with a detected invocation EQUAL
  the enumerated set. There are ten files, one invocation each, and the set includes both product
  files. This makes the closure non-vacuous (L34) and keeps the product half from dropping out (L31).
- **`✧ the rule DISCRIMINATES`**: a negative control on literal lines. The rule flags
  `npx markdownlint-cli2 --fix .dev/features/<name>/PLAN.md` (the incident's shape), the Step 2b
  `xargs npx markdownlint-cli2 --fix` line (the incident's line), and
  `vendor/bin/markdownlint-cli2 <canon-file>`. It passes the same three with `--no-globs`. The detector
  does not match `.markdownlint-cli2.jsonc`, a back-ticked name, the `[ -x … ]` test, or `npm run lint:md`.
- **`✧ mutation control over the real corpus`**: for each site, remove `--no-globs` from that command's
  real body. The rule must then report exactly that file (L4).
- **`premise: --no-globs scopes a run to the named files under THIS repo's config`**: spawns the
  installed binary read-only. At the real path, `--no-globs CLAUDE.md` gives `Linting: 1 file` and
  `--no-globs LIMITS.md` gives `Linting: 0 files`, so the ignores survive the flag. In a scratch tree
  holding the repo's config BYTES plus a nested `.claude/worktrees/x/{a.md,node_modules/p/README.md}`,
  the negative control `a.md` without the flag lints more than 1 file, and a bare run lints no
  `.claude/worktrees/**` path. That second assertion pins the new ignore. The test is skipped when the
  binary is absent, like the catalog test, because the stdlib-only `floor` workflow has no `npm ci`.
- **Catalog test**: `.dev/floor/capability-catalog-core.test.mjs`'s spawn asserts `Linting: 1 file` in
  stdout, so the test lints only the spliced README it names.

## Guarantee audit (P0)

- "Every command-prescribed `markdownlint-cli2` invocation with arguments carries `--no-globs`" → **floor:
  enum-regex** (primitive #3), via `command-hygiene.test.mjs` in `npm test` and ci.yml's Test step.
  **NARROWED:** it pins a VOCABULARY. A spelling the detector does not match escapes it: a shell
  variable, `npm exec`, or `node node_modules/…`. The enumeration equality catches a site that STOPS
  being detected, never a new site written in an undetected spelling. It never proves a run executed
  the line.
- "`--no-globs` makes a run lint exactly the named files, and `ignores` still apply" → **measured this
  run** (table above) and **pinned by the premise test** for the installed version and this config.
  **floor where the toolchain is installed**. The test is skipped in the stdlib-only `floor` workflow, and
  a skip exits 0, so `check-verify.mjs` cannot see it (L37's corroborating instance, stated).
- "`lint:md` no longer descends into `.claude/worktrees/`" → **floor via the premise test's
  fixture** (the repo's config bytes, the repo's binary). **NARROWED:** it takes effect only in a
  checkout whose config carries the entry, so a main checkout on an older commit still descends.
- "A `--fix` run can no longer write outside its named files" → **NOT CLAIMED.** `--no-globs` narrows
  the tool's reach; nothing gates it. A Bash-run tool still passes neither write guard, and an explicit
  path into another worktree is still written. L19 remains true (`LIMITS.md §6`). Detection of a
  tracked-path escape stays `check-bash-reconcile.mjs`'s, within this worktree only.
- "The product change reaches users" → **ADVISORY**: only through `pharn update` / a fresh install of
  6.13.1. A vendored `markdownlint-cli2` older than 0.12.0 predates the flag, and its handling of it is
  **not measured**. The command says so.

## Trust audit (P2)

- No untrusted artifact is ingested. The test reads trusted command prose and the tool's own `Linting:`
  count, which is an integer, read by regex.

## Determinism audit (P5)

- Every branch in the new tests is a regex or set-membership test. Nothing is classified by a model.

## Open questions (HALT)

None open. Both were resolved at GATE 1 on 2026-09-23. The human answered through the approval form:
"Include it (Recommended)" and "Approve as written".

1. **RESOLVED: include.** Add `.claude/worktrees` to `.markdownlint-cli2.jsonc`'s `ignores`. It costs
   nothing, because `git ls-files .claude/worktrees` is empty, so no tracked file leaves lint coverage.
   It also stops `npm run lint:md` in a main checkout from reading, and a future unflagged `--fix` from
   rewriting, other sessions' worktrees (measured in the fixture: 5 files linted drops to 2). The P7
   caveat: the observed failure was the `--fix` WRITE. The read-only `lint:md` reach has not yet
   produced an observed false RED. The ignore closes the write route a second time, as defense in
   depth, and closes the read route before it fails.
2. **DEFERRED, not built (recorded for the human):** `prettier --check .` (the `format:check` gate) also
   descends into a nested `.claude/worktrees/` (measured in the fixture: it flagged
   `.claude/worktrees/x/b.md`). `eslint .` was not measured. Both belong to a separate increment with its
   own trigger.

## Grill refinements carried into the build (post-GATE-1; all inside `## Files`)

`GRILL.md` raised advisory concerns. These close inside the approved files, without adding a path:

- **The premise test pins `cwd` on every spawn and asserts EXACT counts.** The fixture gets a second
  unignored root `.md`, so the unflagged negative control discriminates instead of passing vacuously.
  A config copy with the `.claude/worktrees` entry removed is the ignore's own negative control.
- **The detector is widened where that fails closed:** a path-less `xargs … markdownlint-cli2`, a
  `@<version>` suffix, a `*` glob argument, and a backtick or `\` continuation. The blind-spot list is
  corrected to match what it still misses: a shell variable, `node node_modules/…`, the name split
  across lines, and the older `markdownlint` binary. `npm exec` IS matched.
- **`--no-globs` must follow the tool name on the line and come before any shell comment.**
  Negative controls cover the comment case, a back-ticked prose prescription, and the shell-comment
  exclusion.
- **The pre-0.12.0 caveat is also stated at `pharn-ship.md`'s `--fix` line**, not only at the product
  promote check.
- **The sweep's "scoped" prose is recorded, not edited.** Six dev format steps say "Scoped to this
  stage's own artifact", and `pharn-ship.md` says "scoped to this one file only". That claim was false
  until now and becomes true with the flag. The catalog test's "(minus its repo-wide globs)" comment IS
  re-derived, because the spawn beside it changes.
