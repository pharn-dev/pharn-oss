# PLAN — changelog-sectioning

- spec_content_hash: 2f8b92646bdf31d51169f46c74c14c10debdb456291fb0213be63cfc4d77e838
- applied_lessons: [L1, L4, L6, L19, L23, L29, L32, L33, L34, L35, L36, L39, L41, L43, L49, L50, L52]
- increment: Cut `CHANGELOG.md`'s single `## [Unreleased]` block (plus the ghost `[5.0.0]` section) into one `## [X.Y.Z] - YYYY-MM-DD` section per `SKILLS_VERSION` value that existed on `main`, derived from git history by a one-shot deterministic script, with every existing bullet relocated byte-for-byte.
- layer(s): repo meta (`CHANGELOG.md`) + build apparatus (`.dev/features/changelog-sectioning/`). No product surface.
- constitution_refs: [P0, P3, P5, P6, P7]

## Why (a real failure — P7, measured this run)

- **Every bump on `main` is a release.** pharn-cli installs the tip of `main`: `REPO_BRANCH = 'main'`
  (pharn-cli `src/lib/constants.ts:7`, read at pharn-cli `f853390`). `pharn update` sends users to
  `https://github.com/pharn-dev/pharn-oss/blob/main/CHANGELOG.md` (pharn-cli `src/commands/update.ts:218`).
- **That file cannot answer "what changed in my version".** At `main` = `e8b6da2` (`SKILLS_VERSION`
  6.12.1), `CHANGELOG.md` has 2731 lines and three `##` sections:
  - `## [Unreleased]` at `:9–2712`: 140 top-level bullets from 1.1.0 to 6.12.1, grouped by TYPE (`Deferred`
    2, `Fixed` 84, `Changed — BREAKING` 4, `Added` 43, `Changed` 7), not by version;
  - `## [5.0.0] - 2026-09-10` at `:2713`: 2 bullets (`Changed — BREAKING` 1, `Fixed` 1). 5.0.0 never
    existed on `main`;
  - `## [1.0.0] - 2026-06-23` at `:2723`: 5 bullets. Out of scope.
- **Three data defects, re-derived this run:**
  - `:514` is a committed merge-conflict marker (prettier rewrote `>>>>>>>` into `> > > > > > >`). It is
    a separate paragraph between two bullets, not part of either.
  - **21 versions named by a `SKILLS_VERSION` marker never existed on `main`.**
    - Seven are in the `A → B` form the prompt listed: 2.7.7, 3.1.3, 5.0.0, 5.0.1, 5.1.0, 5.1.1, 6.5.1.
    - Fourteen more are in two spellings the prompt did not list: 2.2.0–2.2.7, 2.3.1, 2.3.2, 2.4.3–2.4.5,
      2.5.3.
    - `main` went `4.0.0` (`7035087`) → `5.1.2` (`9bafa0e`) directly.
  - `:2028` says `6.4.3 → 6.5.0`. 6.5.0 existed on `main` for one commit: `8dacaa9` set it and added
    that entry, `b8940d3` reverted both, and `6d2ed46` re-landed the entry as 6.5.2.

### A prior decision this increment overturns (P6: named, not silently reversed)

`4e3daf5` (#199) wrote into the CHANGELOG (now `:2277–2281`): _"`## [Unreleased]` was deliberately NOT
cut into a `## [3.0.2]` section, and no tag was cut: a release heading asserts a release, `git tag -l`
is empty … Cutting release sections and their tags is a human decision about release identity;
follow-up `changelog-release-sections`."_ This increment is that follow-up, and the human decision is
this run's prompt. The premise changed: the installer now ships `main`'s tip, so a `SKILLS_VERSION`
value on `main` is an installed release whether or not a tag exists. **Tags are still not cut.** A
section heading asserts "this version existed on `main` from this date". It does not claim a tag or a
GitHub release. README `:559` ("There are no GitHub releases or git tags yet") stays true.

## Discovery (live, this run)

- `SKILLS_VERSION` history: `git log --first-parent --reverse --format='%H %cs' main -- SKILLS_VERSION`
  → **87** commits, **86** distinct values, from `1.0.0` (`8753940`, 2026-06-24) to `6.12.1` (`e8b6da2`,
  2026-09-23). One value is REVERTED: 6.5.0 (`8dacaa9`, reverted by `b8940d3`, which re-set 6.4.3).
  Semver order equals chronological first-appearance order for all 86. (The prompt's "81 commits / 80
  values" is stale. `main` has moved since it was written.)
- `main` has **2** merge commits on its first-parent chain (`8753940`, `a9a849e`, both June). Everything
  else is a squash. `git log --first-parent -S…` reports `8753940` as the introducing commit for two
  probes, so the merge's first-parent diff is visible to the pickaxe. This was measured, not assumed.
- **A working draft of the script** (scratchpad only, never in the repo) ran over `e8b6da2` in about
  15 s. It found:
  - 142 bullets in scope (140 + 2), 1 droppable line (`:514`) and 0 other orphan lines;
  - 5 lazy continuation lines (`:271`, `:300`, `:2161`, `:2565`, `:2622` — the prompt listed 4);
  - 0 bullets needing a cross-line head probe, and 9 bullets whose last line is too short for a tail
    probe;
  - all 15 invariants GREEN on the rendered output, and **byte-for-byte no change** under
    `prettier --stdin-filepath CHANGELOG.md` and under markdownlint with this repo's config.

  `/pharn-dev-build` re-derives all of it with the committed script, and a mismatch in the flagged set
  is a HALT (Method, step 4).

- **Other sites that read or cite `CHANGELOG.md`** (swept by referent — L50):
  - Code that reads it: `.dev/floor/check-skills-version-recorded.mjs` and its test (needs
    `SKILLS_VERSION` at a version-token boundary, which the new `## [6.12.1]` heading satisfies) and
    `ci.yml:48` (runs that checker). Nothing else parses it.
  - Line-number cites outside `.dev/features/`: exactly one. `pharn/floor/gate-run-core.mjs:15` cites
    `CHANGELOG.md:1817-1818`. That cite has been **dead since the commit that wrote it**: at `04857b3^`,
    `:1817–1818` was the 6.3.0 incident bullet, and `04857b3` inserted its own bullet above it. The
    incident record now sits at `:2146–2147` inside the `:2142` bullet, filed under 6.3.0. It is
    product surface, so **deferred** (see Not in scope).
  - Section cites `CHANGELOG.md §6.3.0` (`.claude/hooks/require-loop-record.cjs:7`,
    `pharn/floor/check-loop-fresh.mjs:8`) point at no section today. After this increment they resolve:
    the incident bullet (`:2142`) is assigned to 6.3.0 by marker and by pickaxe.
  - Prose about the file's structure:
    - `CLAUDE.md:100` ("it may sit under `[Unreleased]`") stays true, and it is out of scope by
      instruction.
    - `README.md:142`, `:559`, `:590`, `SECURITY.md:13` and `CONTRIBUTING.md:37` stay true (each
      checked).
    - The other `[Unreleased]` claims are historical records: under `.dev/features/**`, plus
      `pharn/features/loop-decision-integrity/PLAN.md:121`. All are left alone.
  - Coverage boundary (L49): only `check:changelog` is checker-backed. Every other site above was read
    by hand, and a site nobody greps for is not covered.

## Method — the migration script

Two modules, two test files and one reviewed inputs file, all under
`.dev/features/changelog-sectioning/`. **P3:** the core changes when the method changes, and the CLI
changes when the git plumbing changes, so they are two files. The prompt named `sectionize.mjs`. It
stays the entry point, and its pure core moves into the sibling `sectionize-core.mjs`.

- `sectionize-core.mjs` is pure (no `fs`, no `child_process`). It exports every closed set its tests
  iterate (L29): `STATUSES`, `AUTO_STATUSES`, `TYPE_ORDER`, `MARKER_FORMS`, `PLACEHOLDER_FORMS`,
  `INVARIANTS`, `HALT_CODES`.
- `sectionize.mjs` does the git I/O and the CLI. It calls `execFileSync("git", ["-C", repo, …])` with no
  shell. **Every flag is required and there are no defaults** (L41): `--repo <dir>`, `--ref <rev>` and
  `--overrides <json>`, then exactly one of `--write` or `--verify`.
- `overrides.json` is the **reviewed inputs file**, and all three keys are required:
  - `allowDrop` — the exact text of `:514`;
  - `positional` — the four references below;
  - `overrides` — the six resolutions below.

  They live in data rather than in code so the fixture tests can supply their own. The grill reviews
  every entry.

1. **Pin the input (L32).** Resolve `--ref` to a 40-hex SHA once, and use only that SHA afterwards.
   `--write` refuses unless the working `CHANGELOG.md` is byte-identical to `git show <sha>:CHANGELOG.md`,
   so it migrates exactly what it analysed and cannot run over its own output. The resolved SHA goes
   into `MIGRATION.md`.
2. **Version table.** From `git log --first-parent --reverse --format=%H %cs <sha> -- SKILLS_VERSION`,
   plus `git show <H>:SKILLS_VERSION` for each commit.
   - The first appearance wins, and a re-set of a seen value is not a new version.
   - A value is REVERTED when the first later commit sets a lower value.
   - HALT on a non-semver value, on first-appearance order ≠ semver order, or on a reverted value that
     is re-set later.
   - A version's **window** is the first-parent commits after the previous table version's
     first-appearance commit, up to and including its own.
3. **Parse.** Structure is: `##` headings, `###` type groups, and bullets (a line starting with a
   hyphen and a space in column 0).
   - A bullet runs to the next bullet or heading. It includes indented lines, blank lines followed by more
     of the item, and unindented lazy continuations that directly follow a non-blank bullet line.
   - The `[Unreleased]` intro may hold only blank lines and HTML comments.
   - Only an exact `allowDrop` line may drop. Any other orphan line HALTs, and so does a dropped set that
     differs from `allowDrop`.
   - Sections in `UNTOUCHED = ["1.0.0"]` are captured verbatim as the tail, and must come last.
4. **Assign** each bullet in `[Unreleased]` and `[5.0.0]`.
   - **Mapping (corrected by the review — see Adversarial self-review, finding 4).** A commit maps to
     the earliest version that is **not reverted** and whose first-appearance commit is at or after it in
     first-parent order. `UNTOUCHED` versions count as mappable. A bump commit's own change therefore
     belongs to that bump, and a no-bump commit's change to the next bump. No later bump means
     `[Unreleased]`.
   - **Targets** — the versions a bullet may actually be filed under — exclude reverted **and**
     untouched versions. Landing on an untouched version is `OUT_OF_SCOPE`, never a silent skip.
   - **Marker rule.** Strip `*` and back-ticks, then read every member of the closed `MARKER_FORMS` set.
     Each gap stops at the next `SKILLS_VERSION`.
     - `pair`: `SKILLS_VERSION` followed within ≤ 40 chars by `A → B` (71 in the file). This is the
       prompt's form.
     - `arrow-only`: `SKILLS_VERSION → B` (31).
     - `bumped-to`: `SKILLS_VERSION bumped to B` (6).

     Every `SKILLS_VERSION … X.Y.Z` mention that no form reads is **listed in the report** (3 today:
     "had reached 2.5.1", "bump (it stays 2.5.1", "3.0.2"), so a new spelling surfaces instead of
     vanishing (L33/L36).

     B is classified as one of:
     - `target` — B is a target version;
     - `ghost` — B is not in the table (recorded as "text names B", never used for assignment);
     - `nontarget` — B is in the table but reverted or untouched;
     - `multi` — several distinct Bs appear.

   - **Pickaxe rule.**
     - Run `git log --first-parent --reverse -S<probe> --format=%H <sha> -- CHANGELOG.md`, then count
       the probe's occurrences in `git show <H>:CHANGELOG.md` at each listed commit.
     - The introducing commit is the **last 0 → >0 transition**, not the earliest match.
     - The head probe is the first 60 chars after `-`, lengthened by 10 **within the first line** until
       it is unique in the file. It crosses a line only if the whole first line is not unique; today no
       bullet needs that.
   - **Tail probe.** Take the trailing 60 chars of the last non-empty line (trimmed), lengthened
     leftward until unique. It is skipped if the trimmed line is < 25 chars or never unique.
   - **Status**, first match wins (the order of `STATUSES`):
     1. `UNRESOLVED` — no head introduction.
     2. `DRIFTED` — the tail maps to a different version than the head.
     3. `OUT_OF_SCOPE` — the head maps to an untouched version.
     4. `MULTI` — the marker class is `multi`.
     5. `CONFLICT` — the marker class is `nontarget`, or a `target` B differs from the pickaxe version.
     6. `AGREE` — a `target` B equals the pickaxe version.
     7. `PICKAXE` — no marker, or a ghost.

     Only `AGREE` and `PICKAXE` auto-assign. Every other status needs an `overrides` entry keyed by the
     exact head probe, carrying `status`, `version` and `evidence.sha`/`evidence.reason`. The script
     HALTs if any of these happens:
     - a flagged bullet has no override;
     - an override is stale, duplicated, or its `status` differs from the computed one;
     - its `version` is not a target;
     - its evidence SHA does not resolve.

     A commit-level head/tail disagreement that maps to the **same** version is reported as information,
     not flagged.

5. **Render.**
   - Keep the preamble (`:1–8`) byte-for-byte.
   - Then `## [Unreleased]`, its intro comment (`:10–14`) byte-for-byte, `### Changed`, and this PR's
     own entry `- 2026-09-23: …`.
     - It goes under `### Changed` because the intro comment says entries join their TYPE group.
     - Every count and list in it comes from the run's data.
   - Then one `## [X.Y.Z] - <first-appearance %cs>` section per non-untouched table version, descending.
     **Ghosts get no section. The reverted 6.5.0 gets one**: it was on `main`, so it was installable.
   - Inside a section, type groups follow `TYPE_ORDER`: `Changed — BREAKING`, `Added`, `Changed`,
     `Deprecated`, `Removed`, `Fixed`, `Security`, `Deferred`, then any other in first-seen order.
   - Bullets keep their original relative order and are separated by one blank line.
     - **52** migrated bullets had no blank line before them (430, 433–436, 819, 1587–1606, 2142, 2630,
       2651–2669, 2707–2711), and now get one. That is whitespace between bullets, never bullet bytes.
     - Prettier leaves the result unchanged (measured).
   - Then the `[1.0.0]` tail, byte-for-byte.
   - **An empty version gets exactly one placeholder bullet, directly under its heading, built from one
     `PLACEHOLDER_FORMS` base plus optional suffixes:**
     - Base `recorded-none` — the prompt's text,
       `- No CHANGELOG entry was recorded for this version (bump commit <short>).` It is used **only**
       when no commit in the version's window changed `CHANGELOG.md`, so it is literally true.
     - Base `none-filed` — "No entry in this file is filed under this version (bump commit X);
       CHANGELOG.md changed in its window at Y." It says what is true of **this file**, never that
       nothing was introduced.
     - Suffix: "Reverted by X on DATE."
     - Suffix, one per case: "An entry added at X was re-landed in Y and is filed under [VERSION]." This
       applies when a bullet's head probe had an earlier 0 → >0 transition inside the window.
     - **For 6.5.0 today:** `none-filed` + reverted + re-landed (`8dacaa9` → `6d2ed46`, filed under
       [6.5.2]).
6. **Positional references.** A bullet that says "above" or "below" was written for the old layout. A
   reference to another entry can flip when the two land in different sections (found by the review —
   see Adversarial self-review, new defect class).
   - The script lists **every** migrated bullet using either word: 34 today, many of them internal to
     their own bullet.
   - It **checks** the four references the review resolved. Each `{phrase, referent}` must be unique, must
     have pointed the right way in the input order, and must point the wrong way in the output order.
     Otherwise it HALTs, so the list cannot claim a breakage the render lacks. The four:
     - `:789` in the 3.0.2 bullet, "entry under **Added** below." → the 3.0.3 `check:changelog` entry,
       which now sits above;
     - `:2276` in the 3.0.3 bullet, "on the `#188` entry above" → the 3.0.2 entry, which now sits below;
     - `:1588` in the 2.4.1 bullet, "see the hardening entry below" → the 2.4.2 entry, which now sits
       above;
     - `:2711` in the 1.1.1 bullet, "The `Added` entry above frames" → the 1.1.0 attestation entry,
       which now sits below.
   - The text is not edited. This PR's entry and `MIGRATION.md` name them.
7. **Invariants** (`INVARIANTS`, 15 members). The script re-parses its **own rendered output** with the
   same parser, asserts every invariant, and only then writes. Each failure is `INVARIANT_FAILED` naming
   the member.
   - Non-empty parse (L34).
   - The multiset of migrated bullet texts equals the multiset of output bullet texts, minus the
     placeholders and this PR's single entry.
   - No duplicates.
   - No ghost section, and exactly one section per table version.
   - Headings strictly descend, dates never increase, and dates match the table.
   - The newest version equals `SKILLS_VERSION`.
   - The dropped lines equal `allowDrop` exactly.
   - The preamble, the intro comment and the tail are byte-identical to the input.
   - Every bullet sits under its assigned version and its original group, groups follow `TYPE_ORDER`,
     and relative order is kept.
   - Placeholders are well formed and there is exactly one per empty version.
8. **Two modes.**
   - `--write` writes `CHANGELOG.md` and `MIGRATION.md`.
   - `--verify` recomputes everything from the pinned SHA. It exits 0 only if the working `CHANGELOG.md`
     equals the render byte-for-byte and every invariant holds.
   - `/pharn-dev-build` runs `--verify` **after** its Step 2b formatter pass, so a formatter rewrite of
     a bullet is a RED (L23).
9. **Report** `MIGRATION.md`. It holds:
   - the pinned SHA, the status tally (zeros included) and the marker-form tally;
   - the invariants;
   - the version table, with reverted, re-set, untouched and placeholder versions marked;
   - every ghost as "text names X, shipped as Y", including the removed `[5.0.0]` heading;
   - other stale version text (`:2028`);
   - the positional list (the 4 CONFIRMED, the other 30 as unverified);
   - the unread `SKILLS_VERSION` mentions;
   - the entries introduced by a commit that did not change `SKILLS_VERSION` (filed under the next
     bump);
   - each override with its evidence, the placeholders and the dropped line;
   - the same-version head/tail disagreements;
   - the `[1.0.0]` date discrepancy: the heading says 2026-06-23, and `SKILLS_VERSION` first appears on
     2026-06-24 in `8753940`. It is reported and not changed;
   - the per-bullet assignment table and the bounds.

   Tabular data is written in fenced `text` blocks, and each fence is longer than any back-tick run inside
   it. Rows are trimmed, because prettier strips trailing space inside fences (measured). The report is
   prettier- and markdownlint-clean by construction (measured).

### The overrides the grill must review (the flagged set is the same with all three marker forms)

| `:line` | status         | computed (head / tail)                      | resolution | evidence                                                                                                                                                                                                                                                                                                                                             |
| ------- | -------------- | ------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `:777`  | `DRIFTED`      | 3.0.2 (`f71f501`) / 3.0.3 (`4e3daf5`)       | **3.0.2**  | `f71f501` (#188) introduced the entry, and its `pair` marker names 3.0.2. `4e3daf5` (#199) edited its tail to add the missing `3.0.2` record; that commit's own text says "The version key was added retroactively".                                                                                                                                 |
| `:1588` | `DRIFTED`      | 2.4.1 (`762e28f`) / 2.4.2 (`207f4af`)       | **2.4.1**  | `762e28f` (#124) introduced the entry for its own change, and its `arrow-only` marker names 2.4.1. `207f4af` (#125) rewrote the bullet from character 4931 of 7976: the test counts, the harness and the mutant list, which now describe the suite as of 2.4.2. The headline change is 2.4.1's, and the later text is recorded as an in-bullet edit. |
| `:2663` | `DRIFTED`      | 1.1.0 (`843e74a`) / 2.4.0 (`8f3e5cb`)       | **1.1.0**  | `843e74a` (#65, 2026-07-06, before the 1.1.0 bump at `87c98ff`) introduced "13 grillers". `8f3e5cb` (#123, the scan-plan relocation) edited its tail.                                                                                                                                                                                                |
| `:2710` | `DRIFTED`      | 1.0.0 (`8753940`) / 1.1.0 (`843e74a`)       | **1.1.0**  | See the 1.0.0 note below.                                                                                                                                                                                                                                                                                                                            |
| `:2669` | `OUT_OF_SCOPE` | 1.0.0 (`8753940`) / 1.0.0                   | **1.1.0**  | See the 1.0.0 note below.                                                                                                                                                                                                                                                                                                                            |
| `:2028` | `CONFLICT`     | marker B = 6.5.0 (reverted) / pickaxe 6.5.2 | **6.5.2**  | `8dacaa9` added the entry (6.4.3 → 6.5.0), `b8940d3` reverted it, and `6d2ed46` re-landed it (6.5.2). The last 0 → >0 transition is `6d2ed46`. Its neighbour `:2026` ("6.5.0 → 6.5.1", a ghost) landed in the same `6d2ed46`, so the 6.5.x line shipped as 6.5.2. The text still says 6.5.0; it is byte-preserved, and this PR's entry names it.     |

**The 1.0.0 note (`:2669`, `:2710`) — a genuine tension, resolved and stated, not hidden.**

- By the mapping rule, both belong to 1.0.0: they were introduced in `8753940`, the merge that first
  created `SKILLS_VERSION` = 1.0.0. The governance-files entry even lists `SKILLS_VERSION` itself. The
  review is right that filing it under 1.1.0 reads as "1.1.0 added the file that carries 1.0.0".
- Against that, two facts:
  - `[1.0.0]` is out of scope by instruction.
  - At `8753940`, both entries' own authors put them under `## [Unreleased]`, **below** an already dated
    `## [1.0.0] - 2026-06-23` section. That is, they recorded them as coming after 1.0.0.
- 1.1.0 (`87c98ff`) is the next bump, and it is the only generated section that honours both facts.
- The alternative, folding them into `[1.0.0]`, needs the human to lift the "untouched" constraint. It is
  recorded as a GATE-2 follow-up and is not taken here.

**Classification (live, all three marker forms)**, over 142 bullets:

| status         | count |
| -------------- | ----- |
| `AGREE`        | 82    |
| `PICKAXE`      | 54    |
| `DRIFTED`      | 4     |
| `CONFLICT`     | 1     |
| `OUT_OF_SCOPE` | 1     |
| `MULTI`        | 0     |
| `UNRESOLVED`   | 0     |

The `PICKAXE` count includes all 21 ghost-marked bullets. After the overrides, 0 bullets are
unassigned. 6.5.0 is the only version with no bullet. The prompt's prototype reported 135 / 56 / 78 /
1 / 0 / 5. The file has grown by 7 bullets since then, and AGREE rose because the other two marker
forms are now read.

## Files

- `.dev/features/changelog-sectioning/sectionize-core.mjs` — the pure core described above, exporting
  every closed set its tests iterate — apparatus
- `.dev/features/changelog-sectioning/sectionize.mjs` — git I/O + CLI (`--write` | `--verify`), required
  flags only — apparatus
- `.dev/features/changelog-sectioning/sectionize-core.test.mjs` — fixture unit tests for the core, never
  the live CHANGELOG — apparatus test
- `.dev/features/changelog-sectioning/sectionize.test.mjs` — end-to-end tests through a throwaway git
  repo built in `os.tmpdir()` with the user's git config isolated, driving the real CLI — apparatus test
- `.dev/features/changelog-sectioning/overrides.json` — the reviewed inputs (`allowDrop`, `positional`,
  `overrides`), each resolution with evidence — apparatus data
- `.dev/features/changelog-sectioning/MIGRATION.md` — GENERATED by `sectionize.mjs --write` through a Bash
  `fs.writeFileSync`, declared here because the write escapes the Write-tool guard (L19) — apparatus report
- `CHANGELOG.md` — GENERATED by `sectionize.mjs --write` (Bash write, declared per L19/L39) — repo meta

### Deliberately NOT in scope

- **`SKILLS_VERSION` / README badge / `MIN_CLI`.** No bump. Every touched path is `CHANGELOG.md` or
  `.dev/**`, which `CLAUDE.md:85–89` puts outside the bump-triggering set. That set is listed at
  `CLAUDE.md:90–95`, and none of its members is touched.
- **`CLAUDE.md:95–100`, every checker, and CI.** Those belong to `changelog-per-pr`, which runs after
  this. In particular, no checker is added that holds the section set to git history (L35, below).
- **`pharn/floor/gate-run-core.mjs:15`** (`CHANGELOG.md:1817-1818`). It has been dead since `04857b3`
  wrote it. It is product surface, and fixing it bumps `SKILLS_VERSION`, which this repo-meta increment
  must not do. **Deferred.** The right repair is `CHANGELOG.md §6.3.0`, the section the incident record
  lands in and the form `check-loop-fresh.mjs:8` already uses for the same incident. It should be made
  by the next product-surface increment that touches that file.
- **Every other `CHANGELOG.md:<line>` cite.** All of them are under `.dev/features/**`. They are
  historical records, true of the file as it was when written, and they stay untouched.
- **Git tags and GitHub releases.** Not cut. See "A prior decision this increment overturns".
- **Stale text inside bullets** is not edited. That covers:
  - `:2028`'s "6.5.0";
  - the 21 ghost markers;
  - the four confirmed positional references, and any of the 30 unverified ones that may also flip;
  - in-bullet edits made during a later version (`:1588`'s 2.4.2 test counts, and the review's `:1562` and
    `:1642`).

  This is a relocation. The correction is append-only: this PR's entry and `MIGRATION.md` name each
  case.

## Applied lessons

- **L29** — every closed set is exported and the tests iterate it: `STATUSES` (7), `MARKER_FORMS` (3),
  `PLACEHOLDER_FORMS` (2 bases), `INVARIANTS` (15, one tamper each) and `HALT_CODES`. A final test
  asserts that every halt code was exercised. There is one fixture per member, not one for whichever
  member is live today.
- **L35** — used, deliberately in the negative. The version sections are a second store of "which
  versions exist" beside git history. That copy **must** exist, because it is the user-facing record
  `pharn update` points at, so it is not drained. But **no sync checker is built**. `--verify` is a
  one-shot audit bound to one pinned SHA, not a standing gate, and it is not wired into `npm run check`.
  Whether a standing check is needed is `changelog-per-pr`'s decision.
- **L43** — each bullet is bound to its referent, the git commit that introduced it, and not to another
  copy of the fact. Marker text is only a cross-check: a marker that disagrees is a `CONFLICT`, and one
  that names a non-existent version is a `ghost`. The positional check binds each "above/below" claim
  to its referent's real position, before and after the move. Bound: `check:changelog` still proves
  only that 6.12.1 appears.
- **L4** — measured before planning. The draft ran live over `e8b6da2`, and the tests carry a mutation
  control: an earliest-match implementation files the re-land fixture under a different version.
- **L6** — versions come from the structured `SKILLS_VERSION` history (`git show <H>:SKILLS_VERSION`),
  never from CHANGELOG prose. Prose markers only cross-check.
- **L19** — `CHANGELOG.md` and `MIGRATION.md` are written by the script through Bash, so the Write-tool
  guard never sees them. Both are declared in `## Files`, and the build's reconcile epoch accounts for
  them.
- **L39** — one declaration serves both consumers: the setter, and `check-regress scope --declared`.
  Nothing here is excluded from the setter, so no `### Regenerated` split is needed.
- **L23** — `CHANGELOG.md` and `MIGRATION.md` are under whole-repo `format:check` and `lint:md`. Both are
  clean by construction (measured), and `--verify` runs after Step 2b, so a formatter rewrite of a
  bullet is a RED rather than a silent edit.
- **L32** — `main` is a mutable alias. It is resolved to one SHA at the start, every read uses that SHA,
  and `MIGRATION.md` records it.
- **L34** — the invariants refuse an empty parse. Each invariant's tamper fixture sits beside an
  untampered control that is GREEN on every member.
- **L33** — the prompt's marker list and its seven-ghost count were a **lower bound, not a set**. The
  review found two more marker spellings, and the enumeration was re-derived from the shortest invariant
  substring (`SKILLS_VERSION` followed by a version token). That gives three read forms and three unread
  mentions, all listed.
- **L36** — `MARKER_FORMS` is a closed set with a closure report: every `SKILLS_VERSION … X.Y.Z` mention
  no form reads is listed. Placeholders are checked by a closed-line regex, and statuses by a closure
  assertion.
- **L41** — the CLI has no defaults (every flag is required), and neither does the inputs file (every key
  is required), so there is no untested no-argument path.
- **L52** — the marker test ranges over every member of `MARKER_FORMS`, and the pair form over the four
  spellings measured in the file (bold B, bold pair, back-ticked, wrapped). It does not test one
  member.
- **L1** — meta-doc sweep, in Discovery. README, SECURITY, CONTRIBUTING and `CLAUDE.md` stay true, and
  `gate-run-core.mjs:15` is deferred with its correct repair.
- **L50** — swept by REFERENT: every cite of `CHANGELOG.md`, by line and by section, each classified in
  Discovery. The review's referent check caught that the prior plan named the wrong repair (`§6.8.0`).
- **L49** — the sweep's coverage boundary is stated in Discovery: only `check:changelog` is
  checker-backed.

## Guarantee audit (P0)

- "Every migrated bullet is byte-preserved and appears exactly once" → FLOOR **at migration time, for
  the pinned SHA**. It is an enum/regex-class multiset comparison inside `checkInvariants`, re-run by
  `--verify` after formatting. It is not a standing guarantee: once `main` moves, nothing re-checks it
  (L35).
- "Each bullet is filed under the version whose bump window introduced it" → **ADVISORY.**
  - It is derived deterministically from `git log -S`, but the probes see only a bullet's two ends.
  - The review confirmed the bound live. Of about 1,000 interior segments it probed, two middle edits
    are invisible to head/tail: `:1562` (filed 2.5.0, edited in 2.7.2's window) and `:1642` (filed 3.0.0,
    edited in 3.0.1's window). Both bullets land correctly but carry later text.
  - No commit re-wrapped bullets in bulk: only 11 first-parent commits ever deleted CHANGELOG lines, at
    most 7 each.
  - The 82 marker agreements corroborate the assignment; they do not prove it.
- "A version section means that version existed on `main` from that date" → FLOOR (git's object store),
  for the pinned SHA. No tag or GitHub release is implied, and none exists.
- "These four references now point the wrong way" → FLOOR: an order comparison over the input and the
  rendered output, checked by the script. For the other 30 candidates, nothing is claimed. They are
  listed as unverified.
- "The overrides are correct" → ADVISORY: model judgment with cited evidence, reviewed at the grill. The
  script only proves that each override matches a flagged bullet and that its SHA resolves.
- "`npm run check` stays green" → FLOOR via `/pharn-dev-verify`'s gates.

## Trust audit (P2)

`CHANGELOG.md` text is repo-authored but can be influenced by contributors, so the script treats it as
DATA. It is parsed and never evaluated. Probes are passed to git as argv elements (`-S<probe>`) with no
shell, so no probe can inject a command. The report quotes repo text inside fences longer than any
back-tick run it contains.

## Determinism (P5)

Every branch is a membership or equality test over git output or the parse (status order, marker
classes, the mapping rule, the positional order comparison). Anything unclassifiable is a named HALT,
and the terminal fallback is an override a human or grill reviews, never a guess.

## Tests (the permanent cost, stated — review side note)

Both test files join `npm test` permanently through its `.dev/**/*.test.mjs` glob. They are the first
tests under `.dev/features/`.

- **Why they stay:** they are hermetic (fixtures, and a throwaway git repo with `GIT_CONFIG_GLOBAL` and
  `GIT_CONFIG_SYSTEM` set to `/dev/null`), so the live CHANGELOG moving on cannot break them. They keep
  `--verify` usable as an audit of this migration.
- **The cost, measured on the draft:**
  - the core file takes about 15 ms;
  - the end-to-end file takes about 4 s, most of it in about 150 git calls per migration run;
  - `node --test` runs files in parallel, so wall-clock impact on `npm test` is smaller than the sum.
- **If that cost is not wanted,** renaming them off the `*.test.mjs` glob is a one-line follow-up. It
  is recorded, not taken.

## Acceptance

- `node --test --experimental-test-coverage .dev/features/changelog-sectioning/*.test.mjs` passes, with
  line coverage ≥ 90% on `sectionize-core.mjs`. The coverage table is recorded in `VERIFY.md`. The draft
  measured 100% on the core and 98.8% on `sectionize.mjs`.
- The live `--write` report shows 0 unassigned bullets, all 6 overrides applied with evidence, the 4
  positional references confirmed, and every invariant GREEN. `--verify --ref <pinned sha>` exits 0
  after Step 2b.
- `npm run check` exits 0.

## Adversarial self-review (one round, before build — falsified claims recorded inline)

A fresh read-only agent tried to falsify the first draft of this plan against `e8b6da2`. It rebuilt the
method independently and reproduced the classification exactly. It **falsified** these claims, each
corrected above:

1. **Per-group counts.** "140 bullets: Fixed 85, BREAKING 5" summed to 142, because it counted the two
   `[5.0.0]` bullets. `[Unreleased]` alone has Fixed 84 and BREAKING 4. Corrected in Why.
2. **The deferred repair for `gate-run-core.mjs:15`.** The draft said the cited text was at
   `:1810–1811` and the fix was `§6.8.0`. That text is the 6.8.0 bullet _quoting_ the incident. The
   record itself is the 6.3.0 bullet at `:2146–2147`, and the cite was dead from the commit that wrote
   it (`04857b3`). The repair is `§6.3.0`. Corrected in Discovery and Not in scope.
3. **"Seven ghost versions" and the marker formats.** About 37 bullets use two spellings the `A → B` rule
   cannot see, `SKILLS_VERSION → X` and `SKILLS_VERSION bumped to X`. Between them they name **14 more**
   ghosts. `MARKER_FORMS` now reads all three spellings, and unread mentions are listed. AGREE went from
   61 to 82, and the flagged set is unchanged.
4. **Method text and override table disagreed.** The draft excluded 1.0.0 from the mapping, which makes
   `OUT_OF_SCOPE` unreachable and two overrides stale: the script would HALT. The mapping now ranges
   over non-reverted versions **including** untouched ones, and targets exclude them. The review also
   questioned the 1.1.0 resolution for `:2669`/`:2710`. That tension is now stated in the 1.0.0 note,
   with the alternative recorded for GATE 2.
5. **"The tight bullets at `:2706–2711`".** In fact 52 bullets had no blank line before them. Corrected
   in Render.
6. **The claim that every other `[Unreleased]` mention is under `.dev/features/`.**
   `pharn/features/loop-decision-integrity/PLAN.md:121` is another one, also historical. Corrected in
   Discovery.
7. **The 6.5.0 placeholder contradicted itself.** "No entry … was introduced for this version" is false
   for 6.5.0: `8dacaa9` did introduce `:2028`. The base is now `none-filed` ("is filed under"), and
   "window" is defined.

**New defect class the draft missed:** "above"/"below" references flip when bullets move between
sections. The review found four. They are now CHECKED by the script (Method, step 6), and all 34
candidates are listed.

**Confirmed:**

- 87 commits and 86 values; 142 = 140 + 2; `:514` is the only orphan, and the five lazy continuation
  lines are where stated.
- `8dacaa9` added 2 CHANGELOG lines; `:2142` is 6.3.0.
- `gate-run-core.mjs:15` is the only line cite outside `.dev/features/`.
- README, SECURITY, CONTRIBUTING and `CLAUDE.md` stay true.
- pharn-cli `f853390` has `REPO_BRANCH = 'main'`, and `git tag -l` is empty.
- The overrides at `:777`, `:1588`, `:2663` and `:2028` hold. `:1588`'s evidence now states the full
  extent of `207f4af`'s rewrite.
- **Misassignment risk is low for whole bullets:** every head probe has a single 0 → >0 transition
  except `:2028`, and there was no bulk re-wrap.
- **It is real for content inside a bullet:** see `:1562` and `:1642`, in the Guarantee audit.
- 25 bullets were introduced by commits that did not bump the version. The report lists them, because
  their bytes were installable under the previous label until the next bump.

## Open questions (HALT)

- None. GATE 1 is decided by the model under the user's standing delegation for `/pharn-dev-ship` runs.
  One decision is flagged for the human at GATE 2 rather than taken silently: whether `:2669` and
  `:2710` should be folded into `[1.0.0]`, which would lift the "untouched" constraint.
