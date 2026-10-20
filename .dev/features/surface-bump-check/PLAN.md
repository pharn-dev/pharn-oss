# PLAN — surface-bump-check

- spec_content_hash: 2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e
- applied_lessons: [L20, L29, L32, L34, L35, L36, L43, L45, L60]
- increment: A per-PR checker, `.dev/floor/check-surface-bump.mjs`, that REDs when the PR's own diff touches a path in the bump-triggering product surface and `SKILLS_VERSION` is unchanged; the path set is ONE exported constant, bound by a test to CLAUDE.md's "bump-triggering set" bullet; wired as `npm run check:surface-bump` and a pull-request CI step beside the CHANGELOG per-PR step.
- layer(s): build apparatus (`.dev/floor/`) + repo meta (`package.json`, `.github/workflows/ci.yml`, `CLAUDE.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `.dev/guides/`). No product surface, so no `SKILLS_VERSION` bump; one `[Unreleased]` entry.
- constitution_refs: [P0, P2, P4, P5, P6, P7]

## Finding (audit 2026-10-12, ARCH-2, Medium) — confirmed live this run (P6)

CLAUDE.md "SKILLS_VERSION discipline" says any product-surface byte change MUST bump `SKILLS_VERSION`. Measured on
`origin/main` = `6b49cafd` (6.65.2): no checker compares a PR's changed paths with that set.

- `.dev/floor/check-changelog-entry.mjs` compares two CHANGELOG texts (new entry, append-only, placement). It never
  reads `SKILLS_VERSION` or the diff's path list; a product edit with only an `[Unreleased]` entry is GREEN.
- `.dev/floor/check-skills-version-recorded.mjs` / `check-version-badge.mjs` check that stored copies of the version
  AGREE, which is exactly L43's blind spot: all copies stay in agreement when none moves.
- `git grep` for `PRODUCT_SURFACE` / `bump-triggering` in code: zero hits. The set exists only as CLAUDE.md prose.

Not already fixed; nothing to drop.

## Design decisions

**D1 — a new checker, not a rule inside `check-changelog-entry.mjs`.** That checker's question is "what may one PR do
to the CHANGELOG TEXT", and its `--base-file` mode compares two files with no git at all; a path-set rule needs the
git diff and `SKILLS_VERSION`, which `--base-file` cannot supply. Its 11-state refusal set and its pinned
`check:changelog-entry` script string (test `:642`) and `/pharn-dev-ship` Step 2c block (test `:757`) would all
change. One axis per file (P3). The new checker IMPORTS `REF_RE`, `MAX_REF_LEN`, `MAX_BUFFER` from it and `quote`
from `changelog-core.mjs`, so the ref grammar stays one grammar (L35 — no second copy of the ref validator).

**D2 — what "bumped" means: `SKILLS_VERSION`'s bytes differ between base and head.** No separate "a new
`## [X.Y.Z]` heading was added" rule: once `SKILLS_VERSION` moved, `check:changelog` (in `npm run check` and CI)
already REDs unless the first version heading is the new value (`UNRECORDED`/`NOT_NEWEST`), and
`check:changelog-entry` REDs a version heading that is not first (`HEADING_INSERTED`) or a bump that leaves
`[Unreleased]` entries (`UNRELEASED_NOT_MOVED`). A third copy of that rule would be L35's sync-cost. A DECREASE is
caught by those same two checkers (descending order; released sections frozen), so no `NOT_INCREASED` state (P7 — no
observed failure). Stated in the header as a composition, not claimed by this checker alone.

**D3 — the PR's OWN diff, never what a merge brought in.** The diff is `<base>` → the working tree:
`git diff --no-renames --name-only -z <base>` (tracked, staged or not) ∪ `git ls-files --others --exclude-standard -z`
(untracked). `<base>` is resolved exactly as `check-changelog-entry.mjs` does: `--base-ref <ref>` = that commit (CI:
`HEAD^1` of GitHub's test merge commit, so the diff is the PR's net change by construction); `--merge-base <ref>` =
`git merge-base HEAD <ref>` (local: after `git merge origin/main`, the merge-base IS that main tip, so files the merge
brought in are not in the diff). Head = the working tree, matching `check-changelog-entry.mjs` (which reads the head
CHANGELOG from disk) and `/pharn-dev-ship`, which never commits before GATE 2. In CI the tree is clean, so it equals
`HEAD`. `--no-renames` makes a move OUT of the surface count as a deletion of a surface path; `-z` avoids
`core.quotePath` quoting.

**D4 — the path set: ONE exported constant `PRODUCT_SURFACE = { include: [...], exclude: [...] }` mirroring CLAUDE.md
exactly**, as glob patterns with one matcher (`*` = one segment's characters, `**` = any depth):

- include: `pharn/pharn-contracts/**`, `pharn/pharn-core/**`, `pharn/pharn-pipeline/grillers/**`,
  `pharn/pharn-review/**`, `pharn/floor/*.mjs`, `pharn/floor/*.json`, `pharn/CONSTITUTION.md`, `pharn/ARCHITECTURE.md`, `THREAT-MODEL.md`,
  `LIMITS.md`, `.claude/commands/pharn-*.md`, `.claude/hooks/*.cjs`, `.claude/settings.json`,
  `.claude/agents/pharn-*.md`
- exclude (wins over include): `**/*.test.*`, `.claude/commands/pharn-dev-*.md`

Decided OUT, and said so in the header: `pharn/floor/test-fixtures/**` and `pharn/floor/fixtures/**` (consumed only
by `*.test.*` files, which are apparatus — `pharn/floor/*.mjs` is one level, so they fall out by construction);
`pharn/features/**` (CLAUDE.md: product-PIPELINE artifacts — what a user's run produces, here this repo's own dogfood
runs — not methodology an install receives, and absent from the concrete set); `pharn.spec-template.md` (the
PROJECT's own template, human-only, not shipped, absent from the set and from this repo); `.claude/settings.local.json`
(gitignored, never shipped); `CLAUDE.md`, `README.md`, `CHANGELOG.md`, `SKILLS_VERSION`, `MIN_CLI`, `package.json`,
`.github/**`, `docs/**`, `.dev/**` (repo-meta / apparatus per CLAUDE.md); `pharn/floor/README.md` (Q1).

**D5 — CLAUDE.md is rewritten so its bullet IS the constant.** The bullet's prose names directories loosely
(`.cjs` hooks, `settings.json`); a test cannot bind to that without a second hand-kept token list. The bullet is
rewritten (same meaning, one sentence longer) so every back-ticked token in its "concretely:" list is an include
pattern and every token in a new "**Never in it, even inside those:**" list is an exclude pattern, plus one
"**Checked:**" sentence naming `check:surface-bump`. The test reads the bullet by its three bold anchors (each
asserted found before slicing — L60) and asserts set EQUALITY in both directions with the constant (L36 closure).
Instruction growth: ~+400 B of CLAUDE.md, under the 2,048 B per-PR budget (`check:instruction-growth` measures it).
CLAUDE.md line ~157 ("One CHANGELOG gate is deliberately outside the chain") gains `check:surface-bump`.

**D6 — refusal set (closed, exported, iterated by the tests — L29):** exit 2 `BAD_USAGE` (not exactly one base flag,
unknown flag, ref failing `REF_RE`/`MAX_REF_LEN`), `BASE_UNREADABLE` (ref does not resolve to one commit, merge-base
or diff fails, or `SKILLS_VERSION` absent at base), `HEAD_UNREADABLE` (target not a directory, or
`<target>/SKILLS_VERSION` unreadable); exit 1 `NOT_BUMPED` (≥1 surface path changed, `SKILLS_VERSION` bytes equal at
base and head, after trimming one trailing newline). One FIX string per state (L27). GREEN prints either "no
product-surface path changed (N paths compared)" or "K product-surface path(s) changed; SKILLS_VERSION a → b". The
RED lists up to 10 changed surface paths (JSON-quoted, length-capped — P2: paths are PR-controlled text). A git
failure is never read as an empty diff (L34): every git call that fails is `BASE_UNREADABLE`, never GREEN.

**D7 — wiring.** `package.json` `"check:surface-bump": "node .dev/floor/check-surface-bump.mjs --merge-base origin/main ."`,
kept OUT of `npm run check` (needs a base, like `check:changelog-entry`). `ci.yml`: a new step "SKILLS_VERSION
surface-bump check" directly after "CHANGELOG per-PR entry check", `if: always() && install success && pull_request`
(no Dependabot exemption: a dependency PR touches no surface path and is GREEN), running
`git fetch --no-tags --depth=2 origin "$GITHUB_SHA"` then `node .dev/floor/check-surface-bump.mjs --base-ref HEAD^1`.
`/pharn-dev-ship` Step 2c is NOT changed (Q2).

## Dry run — the classifier over main's history (measured this run, scratch `.pharn/surface-bump-check/dryrun.mjs`)

Each of the last **40** first-parent commits on `origin/main` (`6ff4dd1a` 6.46.0 … `6b49cafd` 6.65.2), diffed against
its first parent — the same diff CI's `--base-ref HEAD^1` takes on the PR's test merge:

- **33** touched surface paths, every one with a `SKILLS_VERSION` change → GREEN.
- **7** touched no surface path (`44b12e81`, `54b8b653`, `937326c3` Dependabot; `835eef48` test(dev) CTX-2;
  `8fe73d19` CHANGELOG/CLAUDE.md; `fa983a80` README + `docs/assets/*.svg`; `2f0eaa2e` README/package.json) → GREEN.
- **False positives: 0.** No unbumped commit carried a surface path. **False negatives in the window: 0 observed** —
  every commit that changed a non-listed product-tree file also bumped: `pharn/floor/lens-scanner-map.json`
  (`d5453a17`), `pharn/floor/lens-family-map.json` (`5bc02bb7`), `pharn/floor/reconcile-ignore.json` (`e1eef77c`,
  `2a2e5a10`), `pharn/floor/README.md` (`e1eef77c`, `7fe26a5e`). Those are the Q1 near-misses: had any shipped
  without a bump, this checker (mirroring CLAUDE.md) would have been GREEN.
- **Positive controls (true positives, outside the window):** `6c5ae8e4` (`pharn/ARCHITECTURE.md`, 3.0.0 → 3.0.0)
  and `e4e85294` (`pharn/floor/check-plan-lessons.mjs` + two `pharn-*` commands, 3.0.0 → 3.0.0) — both on main's
  first-parent chain, i.e. pushed directly, which a PR-only CI step would still not see (bound); and `c338b9d0`
  (`pharn/floor/reconcile-baseline.mjs`, 5.1.0 → 5.1.0), the L43 instance, a branch commit — the `--merge-base`
  local case. All three classify RED.

## Applied lessons

- L43 — this IS L43's named remedy (bind the version to its referent, the product-surface paths changed), and both of
  its stated design problems are answered: the set becomes ONE constant bound to CLAUDE.md (D4/D5), and a bump in a
  sibling commit of the same PR is GREEN because the diff is the PR's whole net change vs its base (D3), never per commit.
- L20 — the trigger is met: `6c5ae8e`, `e4e8529` and `c338b9d` are three occurrences of a discipline-only rule
  failing; the remedy is a floor check (enum/regex + string equality), not a louder note.
- L35 — asked first whether a second copy should exist: the CLAUDE.md prose cannot be drained (it is the rule a
  reader follows), so the constant is bound to it by a test; and the "new version heading" rule is NOT re-implemented
  because `check:changelog` + `check:changelog-entry` already own it (D2).
- L29 — the include and exclude lists are the enumeration, materialized once; the classification tests iterate
  `PRODUCT_SURFACE.include` and `.exclude` (one generated sample path per pattern) rather than hand-picking members,
  and the refusal tests iterate `REFUSAL_STATES`.
- L36 — the CLAUDE.md binding is CLOSURE, not presence: the set of back-ticked tokens in each list must EQUAL the
  constant's list, so an extra token in either place is RED as well as a missing one.
- L60 — every binding anchor (the three bold labels) is asserted found before slicing; each asserted property gets a
  negative control (drop a token, add a token, swap a token across lists; a surface change with no bump; a
  non-surface change; a merged-in surface file).
- L34 — a failed git call is `BASE_UNREADABLE`, never an empty path list; an empty diff is a stated GREEN ("no
  product-surface path changed"), distinguishable in the output from a surface diff that bumped.
- L32 — locally `origin/main` is a mutable alias, so the npm script uses `--merge-base` (a stale alias yields an
  older merge-base whose extra paths arrive with their own bump, never a false RED); CI uses the test merge's `HEAD^1`.
- L45 — the CI step and the npm script are pinned as committed strings, and the committed CI `node` line is EXECUTED
  in a two-commit fixture repository (RED without a bump, GREEN with one), as `instruction-growth-wiring.test.mjs` does.

## Files

- `.dev/floor/check-surface-bump.mjs` — NEW checker: `PRODUCT_SURFACE`, `matchesGlob`, `isProductSurface`,
  `changedPaths`, `main`; header with guarantee, refusal set, trigger, bounds — layer: build apparatus
- `.dev/floor/check-surface-bump.test.mjs` — NEW tests: per-pattern classification + exclusions + decided-out paths;
  CLAUDE.md binding with negative controls; hermetic git fixtures (no bump RED, bump GREEN, non-surface GREEN,
  merged-in main surface file GREEN under `--merge-base`, uncommitted and untracked surface change RED, rename out of
  the surface RED, bad/unresolvable ref exit 2, missing head SKILLS_VERSION exit 2); every `REFUSAL_STATES` member
  reached and has a FIX; wiring pins for package.json and ci.yml plus execution of the committed CI line — layer:
  build apparatus
- `package.json` — add `check:surface-bump` (not in `check`) — layer: repo meta
- `.github/workflows/ci.yml` — add the pull-request step after "CHANGELOG per-PR entry check" — layer: repo meta
- `CLAUDE.md` — rewrite the "bump-triggering set, concretely" bullet as the bound pattern lists (D5); name
  `check:surface-bump` beside `check:changelog-entry` as a gate outside the chain — layer: repo meta
- `CONTRIBUTING.md` — "CHANGELOG entries": add `check:surface-bump` (what it REDs, local command, bounds) — layer:
  repo meta
- `.dev/guides/floor-checks.md` — add a `## check-surface-bump.mjs` CLI section — layer: build apparatus
- `CHANGELOG.md` — one `[Unreleased]` entry dated 2026-10-19 — layer: repo meta

## Contracts satisfied

- None in `pharn-contracts` (apparatus). Follows the floor-checker conventions of its siblings: stdlib-only,
  `import "../../pharn/floor/runtime-floor.mjs"`, `import.meta.main` entry guard, closed exported refusal set,
  argv-array git with `--end-of-options` on ref resolution.

## Evals to write (P1)

No capability is added (no `role:` frontmatter), so no `evals/`; the checker's spec is its `node --test` suite above.

## Guarantee audit (P0)

- "a PR that changes a bump-triggering path without moving `SKILLS_VERSION` is RED" → floor: enum-regex (glob
  membership of git-reported paths) + string equality of two `SKILLS_VERSION` byte strings. Narrowed: on pull requests
  only, judged on GitHub's test merge as of the last CI run; direct pushes and admin merges bypass it (the same bounds
  as `check-changelog-entry.mjs`, cited in the header, not restated at length).
- "the checker's path set equals CLAUDE.md's bump-triggering set" → floor: enum-regex, a test asserting token-set
  equality over the bullet. It binds the TWO TEXTS to each other — never that the set is the RIGHT set (L43's own
  caveat: e.g. `pharn/floor/README.md`, Q1).
- "the bump is the right SIZE (patch/minor/major)" → advisory, NOT claimed. "the new version has a CHANGELOG
  section" → floor, but owned by `check:changelog` + `check:changelog-entry` (D2), cited not re-checked.
- "a merge from `origin/main` does not count" → floor by construction of the base (merge-base / `HEAD^1`), pinned by a
  fixture test; locally only as good as the last fetch (L32), and the direction of a stale alias is stated.
- A PR runs its own copy of the checker and of `ci.yml` → review of `.dev/floor/**` and `.github/workflows/**` is the
  backstop (stated bound).

## Trust audit (P2)

- Input: git-reported path names and `SKILLS_VERSION` bytes from a PR — attacker-controlled text. Paths are matched by
  a closed glob matcher (no regex built from them), and quoted only through `JSON.stringify` with a length cap in the
  report. Refs come from argv and pass `REF_RE`/`MAX_REF_LEN` before git sees them; git runs via `execFileSync` argv
  arrays (no shell). No verdict rests on free text.

## Determinism audit (P5)

- Every branch is a membership test (glob match, refusal-state enum) or a string equality; ambiguity (unreadable
  input) is exit 2, never a guess.

## Open questions (HALT) — resolved at GATE 1

GATE 1 was decided by the batch orchestrator under the maintainer's delegation (a model decision, not a human
approval): **APPROVED**, with:

- **Q1 → (a).** `pharn/floor/*.json` joins BOTH CLAUDE.md's bullet and the constant's include list.
  `lens-family-map.json`, `lens-scanner-map.json` and `reconcile-ignore.json` are runtime data read by shipped
  `pharn/floor/*.mjs` (`lens-groups.mjs`, `merge-findings.mjs`, `reconcile-ignore-core.mjs`) and `/pharn-review`,
  so CLAUDE.md's general rule already covers them; the dry run shows 0 new false positives (all 4 changes in 40
  commits bumped). `pharn/floor/README.md` stays OUT, and the checker header says why: whether it ships depends on
  the external installer (`pharn-cli`), which this repo cannot show (P6); it joins when the maintainer says it ships.
- **Q2 → no.** `/pharn-dev-ship` Step 2c is unchanged; running the check there is the named follow-up
  `dev-ship-surface-bump`. CI is the enforcement point; CONTRIBUTING documents `npm run check:surface-bump` locally.
