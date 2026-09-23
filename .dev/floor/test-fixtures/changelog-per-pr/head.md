# Changelog

All notable changes to PHARN-OSS are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**There is one version number here that means anything.** The entries below are keyed to [`SKILLS_VERSION`](./SKILLS_VERSION) — the version of PHARN's **product surface**: the bytes an install receives (the `pharn/` tree, the product-floor checkers, the four trusted docs, and the `pharn-*` commands). It moves whenever those bytes change, including for prose-only corrections, and it is what the `pharn` badge at the top of the README shows. `package.json`'s `version` is **deliberately inert** (`0.0.0`) and is not a second version to read: this package is `private: true` and never published, so npm's field addresses nothing. It previously read `1.0.0` as a "foundation tag", which made a third identity to keep in sync with `SKILLS_VERSION` and the README badge while nothing stopped a well-meaning bump of it — so a `0.0.0` beside a `2.x` entry is not a contradiction, it is the point.

## [Unreleased]

<!-- Keep a Changelog groups by TYPE within a release, and markdownlint MD024 is `siblings_only`, so
     this section carries exactly ONE heading per type. A new entry joins its existing group at that
     group's top — it does not open a second `### Added`.

     Every PR adds at least one new top-level entry and edits nothing already merged — a released
     section is frozen whole: a correction is a new entry, and a revert keeps the reverted entry and adds
     one saying so. A PR that does not bump
     SKILLS_VERSION writes its entry in this section, starting with its authored date: a hyphen, a space,
     the date as YYYY-MM-DD, a colon and a space. A PR that bumps SKILLS_VERSION opens a section headed
     "## [X.Y.Z] - YYYY-MM-DD" directly above the previous version's, and MOVES every entry in this
     section into it, its own included (a date prefix may stay or go); an emptied [Unreleased] heading
     may stay or be removed.
     `npm run check:changelog` holds this file's shape; the CI step "CHANGELOG per-PR entry check" holds
     each PR's diff. Details and known costs: CONTRIBUTING.md, "CHANGELOG entries". -->

### Added

- 2026-09-23: **Every PR now adds a dated CHANGELOG entry, every `SKILLS_VERSION` bump opens its own dated section, and merged
  entries are append-only — held by two checks over one shared grammar** (no `SKILLS_VERSION` bump: only `.dev/**`, a
  `pharn-dev-*` command, CI and repo meta change) ([`.dev/floor/changelog-core.mjs`](./.dev/floor/changelog-core.mjs),
  [`.dev/floor/check-skills-version-recorded.mjs`](./.dev/floor/check-skills-version-recorded.mjs),
  [`.dev/floor/check-changelog-entry.mjs`](./.dev/floor/check-changelog-entry.mjs),
  [`.dev/features/changelog-per-pr/`](./.dev/features/changelog-per-pr/)). This is the `changelog-per-pr` follow-up the entry
  below names.
  - **The repo-state check, `npm run check:changelog` (extended, still in `npm run check`).** It used to prove only that the
    `SKILLS_VERSION` string appeared somewhere. Now:
    - the first `## [X.Y.Z] - YYYY-MM-DD` section must be `SKILLS_VERSION`'s;
    - sections run strictly newest first, and no date increases downward;
    - every level-2 heading is exactly `[Unreleased]` or that version form;
    - every `[Unreleased]` entry carries a real, non-future authored date, and none is older than the newest section;
    - no entry appears twice.
  - **The per-PR check, `.dev/floor/check-changelog-entry.mjs` (new).** It runs in CI on pull requests, against the merge
    commit's own base (`HEAD^1`). Locally it runs as `npm run check:changelog-entry`, against the merge-base with `origin/main`. It
    refuses a PR that:
    - adds no entry;
    - edits or deletes a merged one;
    - moves or copies an entry into a released section;
    - changes a released section in any other way — its heading, its entries' order or grouping, or a line that belongs to
      no entry (an asterisk bullet, stray prose, a merge-conflict marker);
    - inserts a version section below the newest;
    - bumps and leaves any entry, its own included, under `[Unreleased]`.

    The one permitted edit to a merged entry is re-dating one that stays in `[Unreleased]`, which is how a stale one is
    repaired. It is not in `npm run check`, because it needs a base.

  - **Its grammar follows CommonMark's block rules for the constructs that decide whether a heading renders at all** — list-item boundaries, fence
    opener and closer indentation, and the raw HTML blocks that run to their own closer — so an unclosed block that makes
    GitHub stop rendering the rest of the file hides the base's headings from the diff check too, and it fails closed. Stated
    exceptions: setext headings, asterisk/plus items, headings inside nested items or blockquotes, and HTML blocks that end
    at a blank line — one of those placed directly above a released heading can hide that heading on GitHub.
    Two rounds of the increment's own review demonstrated six holes in earlier versions (a heading hidden behind an in-entry
    fence, text outside any entry, a bump leaving its own entry under `[Unreleased]`, a 4-space fence "closer", an unclosed
    `<pre>`, and regrouped or reordered released entries), and a third review found a one-line HTML opener such as `<!-->`
    read as unclosed; all were fixed before merge.

  - **What neither check proves.** That an entry describes its change, that a date is when anything merged, or that a bump was
    needed or the right size (`lessons-learned` L43; the check that would bind a bump to the product bytes it covers is still
    unbuilt). Direct pushes to `main` are unchecked by the per-PR step, an admin merge bypasses required checks, the verdict is
    for the merge commit as of the PR's last CI run, and a PR runs its own copy of the checker.
  - **Known costs, measured over the last 100 first-parent commits on `main` and documented in `CONTRIBUTING.md`.** 26 of 94
    non-dependabot commits changed no CHANGELOG line and would now need an entry. A released entry corrected in place (#199)
    becomes a new entry. A revert rolls forward, and so does a reverted bump. A no-bump PR rebased over a later bump re-dates its
    entry. A Prettier upgrade that reformats released text needs a maintainer decision.
  - **Deferred.** `pharn/floor/gate-run-core.mjs:15` still cites `CHANGELOG.md:1817-1818`, which now points into `[3.0.2]`. The
    fix is the version-anchored cite `CHANGELOG [6.3.0]`, but the file is product surface, so it waits for the next increment that
    bumps.

### Changed

- 2026-09-23: **`CHANGELOG.md` is cut into one section per `SKILLS_VERSION` that existed on `main`, built from git history** (no `SKILLS_VERSION` bump: only this file and `.dev/**` change). pharn-cli installs the tip of `main` and `pharn update` links here, so every bump on `main` is a release, and one `[Unreleased]` block could not say what changed in a given version. The 142 entries that sat under `[Unreleased]` and `[5.0.0]` were moved byte-for-byte into 84 version sections by `.dev/features/changelog-sectioning/sectionize.mjs`, which files each entry under the version whose bump window introduced it (`git log --first-parent -S`, last introduction wins); 6 needed a reviewed override, and each is listed with its evidence in `.dev/features/changelog-sectioning/MIGRATION.md`. **No entry text was edited, so some entries still name a version they are not filed under:** entries naming 2.2.0, 2.2.1, 2.2.2, 2.2.3, 2.2.4, 2.2.5, 2.2.6, 2.2.7 (filed under 2.2.8); 2.3.1, 2.3.2 (filed under 2.3.3); 2.4.3, 2.4.4, 2.4.5 (filed under 2.4.6); 2.5.3 (filed under 2.5.4); 2.7.7 (filed under 2.7.8); 3.1.3 (filed under 3.2.1); 5.0.0, 5.0.1, 5.1.0, 5.1.1 (filed under 5.1.2); 6.5.1 (filed under 6.5.2) — none of which existed on `main` — and an entry naming 6.5.0 is filed under 6.5.2. For the same reason, 34 entries still say "above" or "below"; where that points at another entry it was written for the old layout, and at least 6 now point the wrong way (all are listed in `MIGRATION.md`). 2 entries that reach `main` in `8753940`, the first-parent commit where `SKILLS_VERSION` 1.0.0 first appears, are filed under `[1.1.0]` by a reviewed override, because `[1.0.0]` is kept byte-for-byte (the evidence is in `MIGRATION.md`). The `## [5.0.0] - 2026-09-10` heading is gone: that version never existed on `main`. `[6.5.0]` keeps a section with a one-line placeholder, because it was on `main` and therefore installable. One line was dropped: a committed merge-conflict marker (`> > > > > > > 940eb16 …`) that sat between two entries. `[1.0.0]` is unchanged. Its heading date (2026-06-23) is the date `126e2b3` first set `SKILLS_VERSION` to 1.0.0, on a branch that reached `main` at `8753940` (2026-06-24). No git tag or GitHub release was cut. Every `CHANGELOG.md:<line>` cite past line 14 elsewhere in the repo now points at moved text; the one outside `.dev/features/` (`pharn/floor/gate-run-core.mjs:15`) was already stale and is deferred to the next product-surface change. The `[Unreleased]` intro comment and `CLAUDE.md` still route a new entry into `[Unreleased]`; giving each bump its own section is the follow-up `changelog-per-pr`.

### Fixed

- 2026-09-23: **A time-bombed hook test no longer fails every branch.** `.claude/hooks/require-loop-record.test.cjs`'s "CLI:
  blocks from a SUBDIRECTORY" test (from #243) dated its `/pharn-loop` marker from a fixed clock (2026-09-22T12:00Z). But the
  CLI subprocess it spawns judges the marker against the real clock under the hook's 24-hour age ceiling, so from
  2026-09-23T12:00Z the test failed on `main` and on every PR. The marker is now dated from the real clock. It is a test-only
  fix, so there is no `SKILLS_VERSION` bump. It was found while shipping `changelog-per-pr`, whose own CI it would have
  turned RED. No other CLI test in that file shares the defect: they open their run with `--open`, which writes the real time.

## [6.12.1] - 2026-09-23

### Fixed

- **`run-gates.mjs` refuses a dangling symlink or a file component in `--out` with a document instead of
  crashing** (`SKILLS_VERSION` 6.12.0 → **6.12.1**, patch: a correction to a shipped floor checker)
  ([`pharn/floor/run-gates.mjs`](./pharn/floor/run-gates.mjs),
  [`.dev/features/run-gates-dangling-link-containment/`](./.dev/features/run-gates-dangling-link-containment/)).
  - **The failure, reproduced at `daaa999`.** `assertContained` used `existsSync` as its absence test.
    `existsSync` stats, and a stat follows a link, so each of these read as absent and the walk stopped
    before `lstat` saw it:
    - a dangling symlink component (`.pharn/linked` → missing);
    - a regular file as a component (`.pharn/afile/gates`);
    - a dangling symlink as the state root itself.

    `init` then crashed in `mkdirSync` with a stack trace, exit 2, and **no JSON document and no closed
    `reason_code`**. Nothing was written outside the state root. `run --next` never reached the walk: it
    reads `state.json` first and exits `stamp-missing`. This is instance (1) of `lessons-learned` L54,
    first recorded in `loop-freshness`'s REVIEW.

  - **Fix.** Absence is now proven only by `lstat`'s own ENOENT. A dangling link is lstat'ed as a symlink
    and refused. Any other `lstat` error is refused under `path-containment` because the walk cannot
    prove the path safe, not because it found an escape. The closed `reason_code` vocabulary is
    unchanged.
  - **Test.** One CONTAINMENT test iterates all three shapes (L52), with the ordinary `--out` as the
    non-vacuity control (L34). Each case was confirmed to crash on the unfixed code before the fix (L4).
  - **Not changed, and named:**
    - `run --next` still reads `state.json` before its containment check. That is a read, and there is no
      observed failure.
    - A general check banning `existsSync` in containment code stays unbuilt; L54 records why.

