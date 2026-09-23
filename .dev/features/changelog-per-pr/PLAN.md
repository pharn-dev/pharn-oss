# PLAN — changelog-per-pr

- spec_content_hash: 2f8b92646bdf31d51169f46c74c14c10debdb456291fb0213be63cfc4d77e838
- applied_lessons: [L1, L6, L13, L19, L20, L22, L27, L29, L32, L33, L34, L35, L36, L41, L43, L45, L47, L50, L52]
- increment: Hold `CHANGELOG.md` to one dated section per `SKILLS_VERSION` and one new entry per PR, append-only, by extending the repo-state checker `check-skills-version-recorded.mjs` and adding a CI-only per-PR diff checker `check-changelog-entry.mjs` over one shared grammar core.
- layer(s): build apparatus (`.dev/floor/`, a `pharn-dev-*` command) + repo meta (`CHANGELOG.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `package.json`, CI, the PR template). No product surface.
- constitution_refs: [P0, P2, P3, P5, P6, P7]

## Correcting the record: the brief against the live repo (P6)

The brief allows a deviation from its "Target CHANGELOG shape" when the plan states a reason. It was
written before #249 (`changelog-sectioning`, `392817f`) merged, and most of that section no longer
matches the file. Everything below was measured this run at `main` = `392817f`, the base of this branch.
An independent adversarial pass re-measured each number.

- **The blob is gone.** `CHANGELOG.md` has **86** `## [X.Y.Z] - YYYY-MM-DD` headings. `[Unreleased]`
  (`:9`) holds **one** top-level bullet, already dated `2026-09-23:`. There is no legacy blob to move and
  no legacy heading to create (**D1**).
- **`SKILLS_VERSION` is `6.12.1`, not 6.9.2.** `## [6.9.2] - 2026-09-22` already exists at `:271`, so
  nothing is created (**D2**).
- **The brief's `CLAUDE.md` cites moved.** Its `:95–96`, `:628–630` and `:86–91` now sit at `:99–100`,
  `:699–707` and `:90–95`.
- **The live file already satisfies Check 1 as designed.** 0 order violations, 0 `##` headings besides
  `[Unreleased]` and the 86 versions, 149 top-level bullets with 149 unique texts, 0 fenced blocks, 0
  setext underlines, and every date real and not in the future.

Deviations, each with its reason. D3–D7 came from the first draft; D8–D13 from the adversarial round
below.

- **D3 — `UNRELEASED_NOT_MOVED` (Check 2).** The brief says a bump PR "MOVES the current `[Unreleased]`
  bullets into it". Check 1's `STALE_UNRELEASED` tests that only through dates, so a bump on the same day
  as a bullet it forgot to move passes. Check 2 tests the rule itself.
- **D4 — new bullets are placed too (inside `ENTRY_MISPLACED`).** The brief's `ENTRY_MISPLACED` covers
  only bullets present at base. A new bullet under an existing `[6.3.0]` rewrites what 6.3.0 shipped, so a
  new bullet must sit under `[Unreleased]` or under the heading this PR adds.
- **D5 — a shared grammar core, `.dev/floor/changelog-core.mjs`.** Both checks need one grammar. Two
  parsers would be L35's second copy, and P3 makes the grammar its own reason to change.
- **D6 — garbled brief text.** "or a `## ction absent at base" is read as "or the version section this
  PR adds".
- **D7 — typo.** `npm run cck:changelog-entry` is `npm run check:changelog-entry`.
- **D8 — CI compares against the merge commit's first parent, not `pull_request.base.sha`.** On a
  `pull_request` event, actions/checkout checks out `GITHUB_SHA`, GitHub's test merge commit. Its first
  parent is by construction the base the PR is being merged onto. The payload's `base.sha` is a separate
  value, and nothing in the repo can prove the two are equal. If they differ, a revert or an admin merge
  that landed in between would show up as this PR's `ENTRY_CHANGED`. Reverts happen here: `24e2bfe` and
  `b8940d3` each deleted a bullet. The step therefore deepens its own fetch by one commit and passes
  `--base-ref HEAD^1`. That also removes every `${{ }}` from the step except its `if:`.
- **D9 — local runs compare against the merge-base (`--merge-base <ref>`).** The brief's
  `--base-ref origin/main` compares a branch against `main`'s **tip**. If `main` moved during the
  increment, `main`'s newer entries read as this PR's `ENTRY_CHANGED`, and a bump on `main` reads as
  `HEADING_CHANGED`. That is a false RED on correct work. The CLI therefore gains `--merge-base <ref>`,
  which runs `git merge-base HEAD <ref>`. The npm script uses it with `origin/main`. CI keeps `--base-ref`,
  because its checkout already is the merge.
- **D10 — identity is the entry BODY, and only `[Unreleased]` entries may be re-dated.** The body is the
  bullet text with a leading `YYYY-MM-DD:` prefix and its space removed.
  - A bump PR may keep or drop the prefix when it moves an entry, which is what the brief says ("their
    date prefixes may stay").
  - An entry that stays in `[Unreleased]` may change its date. That is the only repair when a stale
    entry reaches `main`: see round-1 finding 10.
  - An entry in a released section must stay byte-identical, prefix included.
- **D11 — `HEADING_INSERTED`.** A version heading absent at base is legal only as the **first** version
  heading at head. Without this rule, a no-bump PR could insert `## [6.11.2] - 2026-09-23` between two
  released sections and file entries there, passing both checks. That creates a ghost version and
  rewrites history, which is what #249 cleaned up and D4 exists to prevent.
- **D12 — the base must be a real CHANGELOG (`EMPTY_BASE`, and refs resolved to one commit).** An empty
  base makes every head bullet "new" and nothing "changed": a vacuous GREEN (L34). The ref is resolved
  with `git rev-parse --verify` to one commit before it is read, so a range such as `main..HEAD` is
  refused. That range passes a character regex, and `git show` answers it with exit 0 and no bytes. A
  base with no version heading is refused as `EMPTY_BASE`.
- **D13 — duplicates.** Check 1 gains `DUPLICATE_ENTRY`: two top-level bullets with the same body. The
  live file has 0. Check 2 judges **each** head occurrence's placement. Without both, copying a bullet into
  `[6.3.0]` and leaving the original in place passes every other rule.

## Adversarial self-review — round 1 (correcting the record)

An independent read-only agent tried to falsify the first draft against the live repo, and ran
experiments in scratch git repos. Its findings and their disposition:

1. **FALSIFIED — "Check 2's `NO_NEW_ENTRY` is the per-PR form of" the `6c5ae8e` / `e4e8529` / `f71f501`
   failures.**
   - `6c5ae8e` and `e4e8529` landed in PR #178, which added 23 CHANGELOG lines and bumped 2.8.0 → 3.0.1.
     So Check 2 would have been GREEN on that PR.
   - `f71f501` added a 7-line entry that never named its version. That is Check 1's `UNRECORDED` failure,
     not `NO_NEW_ENTRY`.
   - Corrected: `NO_NEW_ENTRY`'s trigger is the maintainer's direction, stated as such in "Why".
2. **FALSIFIED — "`CHANGELOG.md:1817-1818` … inside `[3.0.1]`", "the bullet at `:711`".** Line 1817
   sits under `## [3.0.2]` (the heading at `:1721`), and the incident bullet starts at `:706`. Corrected
   below.
3. **FALSIFIED — "`README.md:450`".** The generated floor-checker count is at `:449`. Corrected.
4. **FALSIFIED — "Every hit is classified."** The sweep missed three sites:
   - `CLAUDE.md:81` and `CONTRIBUTING.md:66` state the entry duty for product changes;
   - `.dev/floor/command-hygiene.test.mjs:479`, a comment reading "No ship/loop command performs any git
     operation". It is already false for `/pharn-loop`'s commit and becomes false for ship's new fetch.

   Also missed, harmless: version-anchored cites and bare mentions such as `CLAUDE.md:228`,
   `pharn/floor/validate.mjs:529` and `SECURITY.md:13`. The Docs table now lists them.

5. **FALSIFIED — "142 entries … in one block".** #249's message says 140 entries under `[Unreleased]`.
   142 counted the 2 under `[5.0.0]` as well. Corrected.
6. **FALSIFIED cite, CONFIRMED conclusion — no bump.** `CLAUDE.md:85–89` does not list `CLAUDE.md` or the
   PR template. Neither is in the bump-triggering set at `:90–95`, though, and `670565b` (#245) edited
   `CLAUDE.md` with no bump. Corrected in Version discipline.
7. **FALSIFIED — "errs GREEN … never produces a false RED" (CI base).** Fixed by D8.
8. **DESIGN DEFECT — an empty base passes vacuously.** Fixed by D12.
9. **DESIGN DEFECT — a fake mid-history section passes both checks.** Fixed by D11.
10. **DESIGN DEFECT — a stale `[Unreleased]` entry on `main` has no GREEN repair.**
    - How it gets there: branch protection is `strict: false`, and direct pushes happen (`8dacaa9`,
      `b8940d3`, `24e2bfe`). So a no-bump entry dated before a later bump can reach `main`, and then every
      later PR's Check 1 goes RED.
    - Why the first draft could not repair it: every repair was RED under Check 2.
    - Fix: D10 lets the entry be re-dated in place. The repairing PR adds its own entry too.
11. **DESIGN DEFECT — reverts have no GREEN form.** This is recorded as a known cost with a
    roll-forward remedy (below), not a new exception. The one-line reason: an exception for "revert"
    would need to recognise a revert, and nothing in the bytes does.
12. **DESIGN DEFECT — "may keep" the prefix contradicts full-text identity.** Fixed by D10.
13. **DESIGN DEFECT — the `--output` test is vacuous as worded.** Unvalidated `git show --output=<d>/x`
    writes a file named `x:CHANGELOG.md`, so asserting that `<d>/x` is absent proves nothing. The test now
    asserts the scratch directory is **empty**, with a positive control showing unvalidated git writes
    there.
14. **DESIGN DEFECT — local runs compare against the tip.** Fixed by D9.
15. **DESIGN DEFECT — set-membership placement lets a duplicate into a released section.** Fixed by D13.
16. **RISK — the per-PR rule's cost was not measured.** Now measured and recorded under Known costs.
17. **RISK — "failed … under a discipline-only rule (L20)" overstated.** The old rule **allowed** the
    single block, and the file followed it. So this is a rule change, not a second failure of a
    discipline. Corrected in "Why" and in the L20 line.
18. **RISK — HTML comments.** A column-0 `-` or `##` line inside a comment would parse. Comment
    blocks are now opaque, like fences. Link-reference definitions: none exist. If tags are cut later,
    that increment must teach the grammar to end a bullet at one. Named as a bound (P7).
19. **RISK — heading closure only covers column-0 `##`.** ATX headings with 0–3 leading spaces or a
    tab separator are now classified too, and anything but the two exact forms is `UNKNOWN_HEADING`.
    Setext headings are not recognized, and the guarantee says so. The live file has 0 setext
    underlines.
20. **RISK — CRLF.** The core folds `\r\n` to `\n` before parsing, following the `.dev/floor/hash-doc.mjs`
    precedent.
21. **RISK — ship's GATE-2 presentation list and `--loop` behaviour were untouched.** Both are now in
    scope.
22. **RISK — a subdirectory target and fixture staleness.**
    - The base is read as `<sha>:./CHANGELOG.md`, so it resolves relative to the target and not the repo
      root.
    - `head.md` is a frozen record of this PR's transition. If a fix round changes `CHANGELOG.md`, the
      fixture command is re-run.

Everything else probed came back CONFIRMED:

- the remaining cites;
- the `spec_content_hash`;
- that `--output` option injection is real;
- that fetching a SHA at depth 1 or 2 works on this public repo;
- that the `if:` expression is valid;
- that dependabot PRs carry `user.login` `dependabot[bot]`;
- that no other file imports `check-skills-version-recorded.mjs`;
- that `docs:check` is unaffected;
- the "third copy" and "fourth copy" counts.

## Why (P7, the trigger, measured)

- **Every merge to `main` is a release.** pharn-cli installs the tip of `main` (`REPO_BRANCH = 'main'`,
  pharn-cli `src/lib/constants.ts:7`), and `pharn update` points users at `CHANGELOG.md` (pharn-cli
  `src/commands/update.ts:218`). pharn-cli was **not** read this run. These cites come from the brief
  and from `.dev/features/changelog-sectioning/PLAN.md`, which read them at pharn-cli `f853390`.
- **The file could not say what shipped in which version.** Under `CLAUDE.md:99–100` ("may sit under
  `[Unreleased]`"), 140 entries across ~80 `SKILLS_VERSION` values sat in one block, according to
  #249's commit message. #249 repaired the shape once.
  - Its review (`.dev/features/changelog-sectioning/REVIEW.md:93`) records that nothing holds the repair:
    "the first bump after this merge re-creates the old shape until `changelog-per-pr` lands."
  - Honest weight: the old rule **allowed** that shape. So this is a rule change triggered by a measured
    deficiency and a predicted recurrence. It is not an L20 second failure of a discipline.
- **`UNRECORDED` has a real recorded failure.** `f71f501` bumped 3.0.1 → 3.0.2 and wrote an entry that
  never named `3.0.2`. That trigger is already in the checker's header.
- **The per-PR new-entry rule and append-only are at the maintainer's direction (P5).** They are not
  answers to an observed escape, and the plan does not invent one. The closest observed instances are
  both edits to released text:
  - #249 found and dropped a committed merge-conflict marker (`> > > > > > > 940eb16 …`) sitting between
    two entries;
  - #199 (`4e3daf5`) corrected a released entry in place.

## Known costs (measured over the last 100 first-parent commits on `main`, by the adversarial pass)

- **26 of the 94 non-dependabot commits changed no CHANGELOG line.** Under this rule each would have
  needed an entry. That includes #247 (a lesson promotion) and #219, a maintainer-authored CI bump that
  the dependabot exemption does not cover.
- **Editing a released entry was routine**, for example #199. Under this rule a correction is a new
  entry.
- **Reverts must roll forward.**
  - A plain `git revert` of an entry-adding PR deletes that PR's bullet (`24e2bfe` did), which is
    `ENTRY_CHANGED` plus `NO_NEW_ENTRY`. The remedy is to keep the reverted entry and add a new one saying
    it was reverted.
  - Reverting a **bump** (`8dacaa9` → `b8940d3` took 6.5.0 back to 6.4.3) cannot restore the old version
    number, because Check 1 would then see `NOT_NEWEST` or `OUT_OF_ORDER`. The remedy is to bump forward
    (for example 6.5.1 restoring the old bytes) under a new section.
- **Two PRs in flight.** If one bumps, the other must rebase.
  - A no-bump entry must be dated no earlier than the newest heading (`STALE_UNRELEASED`). That is the
    brief's rebase re-date cost, documented in CONTRIBUTING.
  - A bump PR must move every `[Unreleased]` entry present at its base (`UNRELEASED_NOT_MOVED`).
- **A stale entry that still reaches `main`** turns every later PR's Check 1 RED until one PR re-dates it
  in place (D10) and adds its own entry.

## Design

### The grammar — `.dev/floor/changelog-core.mjs` (pure, no I/O)

- **Line endings.** `\r\n` is folded to `\n` first.
- **Opaque regions.** Inside an opaque region, no line is a heading and no line starts a bullet.
  - **Fences.** A line whose content, after optional leading whitespace, starts with three or more
    backticks or tildes opens a fence. It closes on a later line of the same character, at least as long,
    with only whitespace after it. An unclosed fence runs to EOF.
  - **HTML comments.** A line starting `<!--` (after up to three spaces) opens an HTML comment. It closes
    on the first line containing `-->`, which may be the same line.
- **Headings (ATX only).** A line matching `^ {0,3}(#{1,6})(?:[ \t]+|$)` outside an opaque region is a
  heading. Level-2 headings, trimmed, are classified into a closed `HEADING_KINDS` set:
  - `UNRELEASED`: exactly `## [Unreleased]`;
  - `VERSION`: exactly `^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})$`, the brief's regex;
  - `UNKNOWN`: every other level-2 heading, including one with leading spaces or a tab separator.

  Setext headings are not recognized, and the guarantee is narrowed to say so.

- **Top-level bullets.**
  - A bullet starts at a line beginning with a hyphen and a space at column 0, outside an opaque region.
  - Its text runs until the next top-level bullet or the next heading of any level, with trailing
    whitespace trimmed. So the five column-0 lazy continuations in the live file are absorbed (`:725`,
    `:919`, `:948`, `:2629`, `:2811`).
  - Each bullet records its section: the nearest preceding level-2 heading, or `PREAMBLE`.
  - Its **body** is the text with a leading `- YYYY-MM-DD:` prefix and its space removed (D10). Its
    **date** is that prefix, or none.
- **Only hyphen bullets count.** An asterisk or plus entry is not recognized, so a PR that writes one
  fails closed on `NO_NEW_ENTRY`. The live file uses hyphens for all 149.
- **Dates.** `isCalendarDate` round-trips `YYYY-MM-DD` through `Date.UTC`, so `2026-02-31` is refused.
  This is a third copy of the rule, after the two `isGregorianDate`s in the `check-provenance.mjs` pair.
  Both of those are checkers, so importing either would be a leaf-to-leaf import, which
  `pharn/ARCHITECTURE.md §4` forbids. Extracting a shared core would edit a product checker and force a
  bump, and no failure asks for that (P7).
- **Versions.** `compareVersions` compares the three numeric components.

### Check 1 — `.dev/floor/check-skills-version-recorded.mjs` (repo state, stays in `npm run check`)

- **Structure.** The pure core becomes `checkChangelogText(changelog, version, { now })`.
  `checkSkillsVersionRecorded(targetDir, { now })` wraps it and keeps its input refusals.
- **`main(argv, io)`** returns an exit code and writes through `io.out`, so tests can run it in-process
  for coverage. `import.meta.main` calls it.
- **`REFUSAL_STATES` stays a closed, exported array.**
  - Kept unchanged: `BAD_TARGET`, `MISSING_VERSION`, `ENUM_ERROR`, `MISSING_CHANGELOG`,
    `EMPTY_CHANGELOG`.
  - **`UNRECORDED` changes meaning:** no `VERSION` heading names `SKILLS_VERSION`. Its message still
    reports how often the version occurs as a token in entry text, so an author who can see `6.12.1` in
    the file is told why it does not count (L27). The token-boundary helpers stay for that message.
  - New members:

| State                  | RED when                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| `NOT_NEWEST`           | a heading for `SKILLS_VERSION` exists, but it is not the first `VERSION` heading                       |
| `UNKNOWN_HEADING`      | a level-2 heading outside an opaque region is neither `UNRELEASED` nor `VERSION`                       |
| `UNRELEASED_NOT_FIRST` | a `[Unreleased]` heading is not the first level-2 heading; a second `[Unreleased]` lands here          |
| `OUT_OF_ORDER`         | version headings are not strictly descending (a duplicate lands here), or a date increases downward    |
| `BAD_DATE`             | a heading date or an `[Unreleased]` date prefix is not a real calendar date                            |
| `FUTURE_DATE`          | such a date is later than the checker's UTC date plus one day (the timezone allowance)                 |
| `UNDATED_ENTRY`        | a top-level `[Unreleased]` bullet has no `YYYY-MM-DD:` date prefix                                     |
| `STALE_UNRELEASED`     | an `[Unreleased]` bullet is dated earlier than the newest `VERSION` heading (a bump forgot to move it) |
| `DUPLICATE_ENTRY`      | two top-level bullets anywhere in the file have the same body (D13)                                    |

- **Reporting.** Input refusals short-circuit in the existing precedence: target, then version file,
  then CHANGELOG. The structural states are then collected together, so one run shows every defect.
- **What is allowed.**
  - `[Unreleased]` may be absent, or present with zero bullets, as the brief says.
  - Bullets in version sections are not date-checked. The pre-#249 bullets carry no prefix.
- **Time-monotone against the clock.** Every date comparison is against `now`, which only moves forward,
  or between dates inside the file. So a GREEN tree cannot turn RED by waiting. A **merge** can still turn
  `main` RED (Known costs), and D10 is the repair.
- **The header** keeps its recorded history: the `6c5ae8e` / `e4e8529` / `f71f501` trigger, the L35-before-L20
  argument, and the COPY-PAIR block. It adds:
  - the new GUARANTEE (heading position, order, dates, the `[Unreleased]` date rule, uniqueness, the
    closed heading set, ATX only);
  - the new trigger (above);
  - **what agreement does NOT prove (L43):** a newest heading equal to `SKILLS_VERSION` does not prove
    the bump was the right size, was needed, or covers the product bytes that changed. L43's
    referent-binding check (the product-surface paths changed since the last bump) stays unbuilt, and
    this is not it;
  - that dates are authored claims, never checked against git;
  - **the residual `changelog-record-position` is CLOSED (L33).** It was deferred because pinning a
    position "would re-pin a rendering, which is the L36 defect". `UNKNOWN_HEADING` answers that: it is
    a closure over every level-2 heading, so a variant spelling fails loudly instead of passing unseen.

### Check 2 — `.dev/floor/check-changelog-entry.mjs` (per-PR diff, CI and local, never in `npm run check`)

```text
node .dev/floor/check-changelog-entry.mjs (--base-ref <ref> | --merge-base <ref> | --base-file <path>) [targetDir]
```

- **Head** is `<targetDir>/CHANGELOG.md`, default cwd.
- **Base** comes from one of three flags:
  - `--base-file` reads a file.
  - `--base-ref` resolves the ref with
    `execFileSync("git", ["rev-parse", "--verify", "--quiet", "--end-of-options", ref + "^{commit}"])` to
    one commit, then reads `git show <sha>:./CHANGELOG.md`.
  - `--merge-base` resolves the ref the same way, then runs `git merge-base HEAD <sha>` and reads that
    commit.

  All git calls use an argv array, `cwd: targetDir` and a 64 MiB `maxBuffer`, with no shell.

- **Refs are validated before git sees them (P2).** A ref must match `^[A-Za-z0-9][A-Za-z0-9._/~^@{}-]*$`
  and be at most 256 characters. An argv array blocks shell injection but not **option** injection:
  `git show --output=<f>` writes a file. So a leading `-` is refused, and `--end-of-options` is a second
  layer.
- **Pure core.** `compareChangelogs(baseText, headText)` returns `{ ok, findings }`.

Placement rules, with `NEW` meaning "the first version heading at head, when that heading line is absent
at base" (the bump):

- a base `[Unreleased]` entry may appear at head only under `[Unreleased]` (re-dated or not) or under
  `NEW` (prefix kept or dropped);
- a base entry in any other section may appear only in that same section, **byte-identical**;
- a new entry may appear only under `[Unreleased]` or `NEW`;
- **every** head occurrence is judged against those rules.

Closed `REFUSAL_STATES`, exported and iterated by the tests (L29):

| State                  | Exit | RED when                                                                                                  |
| ---------------------- | ---- | --------------------------------------------------------------------------------------------------------- |
| `BAD_USAGE`            | 2    | not exactly one base flag, an unknown flag, or a ref that fails validation                                |
| `BASE_UNREADABLE`      | 2    | the base file cannot be read, or a git call fails (including a ref that does not name one commit)         |
| `HEAD_UNREADABLE`      | 2    | `<targetDir>/CHANGELOG.md` cannot be read                                                                 |
| `EMPTY_BASE`           | 2    | the base has no `VERSION` heading, so no comparison is meaningful (D12)                                   |
| `NO_NEW_ENTRY`         | 1    | no head body is absent from base                                                                          |
| `ENTRY_CHANGED`        | 1    | a base body is absent from head, or a base entry outside `[Unreleased]` is present but not byte-identical |
| `ENTRY_MISPLACED`      | 1    | some head occurrence sits in a section the placement rules above do not allow                             |
| `HEADING_CHANGED`      | 1    | a base level-2 heading other than `[Unreleased]` is not present verbatim at head                          |
| `HEADING_INSERTED`     | 1    | a head `VERSION` heading absent at base is not the first `VERSION` heading at head (D11)                  |
| `UNRELEASED_NOT_MOVED` | 1    | `NEW` exists, and a base `[Unreleased]` entry still sits under `[Unreleased]` at head (D3)                |

- **Output.** At most 10 entries are quoted per state. Each quote is cut to 100 characters and rendered
  through `JSON.stringify`, because on a fork PR both CHANGELOGs are attacker-authored text (P2).
- **Remedies.** `ENTRY_CHANGED`'s remedy names the stale-branch case (rebase, or use `--merge-base`) and
  the revert roll-forward.

**Bounds, written into the header:**

- It needs a base, so it is not in `npm run check`, and `/pharn-dev-verify` never runs it.
- **Direct pushes to `main` are unchecked**, because the step runs on `pull_request` only. The remedy is
  branch protection, a maintainer setting outside the repo.
  - Live: `main` requires the `check` job, which holds this step.
  - But `enforce_admins` is `false`, and the maintainer merges with `gh pr merge --admin`, which bypasses
    required checks. So a RED here informs the merge decision; it does not stop it.
- The date is the authored date, not the merge date.
- Dependabot PRs are exempt by the step's `if:`. A maintainer-authored dependency bump is not.
- It proves an entry was **added**, never that the entry describes the PR (P0).
- It compares **two texts**. It never proves which commit the base came from beyond the resolved SHA,
  and a caller can pass any `--base-file`.
- **Locally, `origin/main` is a mutable alias (L32).** It reflects the last fetch, which is why ship's
  step fetches first. With `--merge-base`, a stale alias yields an older merge-base, never a false
  `ENTRY_CHANGED`.
- Link-reference definitions are not part of the grammar. None exist, and the increment that adds tag
  compare links must teach the grammar to end a bullet at one.

### CI wiring — `.github/workflows/ci.yml`

A new step in the existing `check` job, directly after "CHANGELOG version-record check":

```yaml
- name: CHANGELOG per-PR entry check
  if: ${{ always() && steps.install.outcome == 'success' && github.event_name == 'pull_request' && github.event.pull_request.user.login != 'dependabot[bot]' }}
  run: |
    git fetch --no-tags --depth=2 origin "$GITHUB_SHA"
    node .dev/floor/check-changelog-entry.mjs --base-ref HEAD^1
```

- **Fetch and base.**
  - `GITHUB_SHA` is the runner's own environment variable, the merge commit that checkout put at `HEAD`.
    Nothing is interpolated into `run:`.
  - `--depth=2` fetches that commit's parents, and `HEAD^1` is the base side of the merge (D8).
  - `persist-credentials: false` is untouched. The anonymous fetch works because the repo is `PUBLIC`
    (`gh repo view`, this run).
- **The `if:` clause.**
  - The install clause keeps the siblings' form, although the step needs no npm dependency. That makes a
    fourth copy of that guard string, under the named residual `ci-if-guard-enumeration`. P7 is not
    triggered: the string has never drifted.
  - A `push` to `main` never runs the step, because of `github.event_name`.

### `package.json`

Add `"check:changelog-entry": "node .dev/floor/check-changelog-entry.mjs --merge-base origin/main ."`
(D9). It is **not** in the `check` chain, and a test pins both facts.

### `/pharn-dev-ship` (`.claude/commands/pharn-dev-ship.md`)

- **A new `## Step 2c — CHANGELOG entry check`**, placed between Step 2b and Step 3. It runs at GATE 2
  only and pins its command lines (L22):

  ```bash
  git fetch --no-tags origin main
  npm run check:changelog-entry
  ```

  - `SHIP.md` records `changelog-entry: exit <n>` verbatim. On a RED-verdict STOP it records
    `changelog-entry: not-reached (<stage>)`.
  - The exit is **presented, never a proceed/stop input**. The chain has already ended, and ship cannot
    write the CHANGELOG, because its `writes:` is `SHIP.md` alone.
  - A non-zero exit is presented as "CI's per-PR step will RED". The remedy is a CHANGELOG edit made by a
    build, never by ship.

- **Under `--loop`:** inherited at the stop, exactly like Step 2b. It is one paragraph beside 2b's
  `--loop` paragraph (`:400`), and never runs inside the iteration body.
- **Step 2, step 6** (the GATE-2 presentation, `:134`): the presented verdicts gain the Step 2c exit.
- **Step 3's roll-up list** gains the `changelog-entry:` line.
- **The guarantee audit** gains one bullet: the verdict belongs to the checker; ship's act of running it
  is advisory.
- **A claim this makes false (L33).** Step 2b's note (`:153`) says ship "performs zero git operations".
  It becomes "performs no git write (no commit, merge or push)", and names the fetch and the checker's
  `git` reads.

### Docs (L1 meta-doc sweep, L50 sweep by referent)

**The referent** is "where a CHANGELOG entry goes, and how CHANGELOG is cited". It was swept with
`git grep -n -i` for `changelog`, `[Unreleased]`, `CHANGELOG.md:<n>`, `check:changelog`,
`check-skills-version-recorded` and `git operation`. `.dev/features/**`, `CHANGELOG.md` and
`node_modules` were excluded as records or out of scope. Each hit is classified below.

| Site                                                                                                                                                                                    | Class                                                 | Action                                                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE.md:99–100` "may sit under `[Unreleased]`"                                                                                                                                       | states the old convention                             | replace with the new rule plus the cite-by-version convention line                                                                                             |
| `CLAUDE.md:699–707` (the `check` chain enumeration)                                                                                                                                     | chain unchanged                                       | add one sentence: the per-PR check is CI-only and outside the chain                                                                                            |
| `CLAUDE.md:81`, `CONTRIBUTING.md:66` (a product change must bump and add an entry)                                                                                                      | still true, narrower                                  | unchanged; the every-PR rule is stated at the `CLAUDE.md:99` replacement and in the new CONTRIBUTING section                                                   |
| `CONTRIBUTING.md:37` "REDs unless `SKILLS_VERSION`'s value is named"                                                                                                                    | describes Check 1's OLD guarantee                     | rewrite that clause, and add a CHANGELOG section covering both checks, the dated rule, append-only, the re-date cost and the roll-forward                      |
| `.github/PULL_REQUEST_TEMPLATE.md:25`                                                                                                                                                   | states the old checkbox                               | replace with the brief's text                                                                                                                                  |
| `CHANGELOG.md` `[Unreleased]` HTML comment (`:11–13`)                                                                                                                                   | routes a new entry by type only                       | keep it directly under the heading and extend it with the dated, bump and append-only rules; it is an opaque region, not an entry, so neither check freezes it |
| `.dev/floor/command-hygiene.test.mjs:479` "No ship/loop command performs any git operation"                                                                                             | false claim in a comment (L33 sibling of ship `:153`) | correct the comment; the assertion under it (heading order) is unchanged                                                                                       |
| `.claude/commands/pharn-dev-*.md`                                                                                                                                                       | 0 CHANGELOG hits                                      | Step 2c added to ship                                                                                                                                          |
| `.github/workflows/ci.yml:48–50`, `package.json:39`, `:42`                                                                                                                              | Check 1's wiring                                      | unchanged                                                                                                                                                      |
| `README.md:24`, `:142`, `:590`; `SECURITY.md:13`; `package.json:3`; `.markdownlint-cli2.jsonc:58`                                                                                       | badge, "keyed to", "release history", config comments | still true; unchanged                                                                                                                                          |
| `CLAUDE.md:228`, `:282`; `.claude/hooks/require-loop-record.cjs:7`; `pharn/pharn-contracts/gate-run-record.md:23`; `pharn/floor/validate.mjs:529`; `pharn/floor/check-loop-fresh.mjs:8` | already version-anchored cites                        | unchanged (they already follow the convention; product ones would bump)                                                                                        |
| `pharn/floor/gate-run-core.mjs:15` `CHANGELOG.md:1817-1818`                                                                                                                             | dead line cite, product surface                       | **deferred**, see below                                                                                                                                        |
| `pharn/features/loop-decision-integrity/*`                                                                                                                                              | product-pipeline records of a past run                | untouched (records)                                                                                                                                            |
| `.dev/memory-bank/lessons-learned.md` mentions                                                                                                                                          | canon, historical                                     | untouched (canon is written only through promote)                                                                                                              |
| `docs/**`                                                                                                                                                                               | 0 hits outside the generated lessons index            | nothing to do                                                                                                                                                  |

Not affected, verified: `docs:check`. The generated `README.md` region counts `pharn/floor/` only
(`README.md:449`), and no command is added or renamed.

### Known defect — recorded, NOT fixed here

- **The defect.** `pharn/floor/gate-run-core.mjs:15` cites `CHANGELOG.md:1817-1818`. Line 1817 now holds
  unrelated text under `## [3.0.2]` (heading at `:1721`).
- **What it means to cite.** The incident is recorded in the `[6.3.0]` section, in the bullet that starts
  at `:706`. `pharn/floor/check-loop-fresh.mjs:8` already cites that incident as `CHANGELOG.md §6.3.0`.
- **The fix** is a version-anchored cite, `CHANGELOG [6.3.0]`. It edits product surface, so it would force
  a `SKILLS_VERSION` bump.
- **Deferred** to the next product-surface increment that touches that file, as #249 deferred it.
- **Line cites under `.dev/features/**`** stay as they are: they record past states.

### Out of scope, deferred rather than dropped

- **L43's referent check** (was a bump needed?) — unbuilt, named in the Check 1 header.
- **Git tags / GitHub releases**, and the link-reference definitions that would come with them. Tags are
  still not cut, carried from #249's SHIP.md.
- **A checker for the cite-by-version convention.** The new `CLAUDE.md` line is discipline only, with no
  observed failure after this increment (P7).
- **An exception for reverts** — rejected, with roll-forward as the remedy (round-1 finding 11).
- **The brief's "split the legacy blob"** — moot, because #249 already did it.

## Files

- `.dev/floor/changelog-core.mjs` — new pure grammar: CRLF fold, fences, HTML comments,
  `HEADING_KINDS`, top-level bullets with section, body and date, `isCalendarDate`, `compareVersions` —
  apparatus
- `.dev/floor/changelog-core.test.mjs` — unit tests for the grammar, iterating `HEADING_KINDS` —
  apparatus test
- `.dev/floor/check-skills-version-recorded.mjs` — extended to the heading-based guarantee, the new
  states, pure `checkChangelogText`, and a returning `main()` — apparatus
- `.dev/floor/check-skills-version-recorded.test.mjs` — fixtures rewritten to the sectioned shape; every
  state iterated — apparatus test
- `.dev/floor/check-changelog-entry.mjs` — new per-PR diff checker — apparatus
- `.dev/floor/check-changelog-entry.test.mjs` — new tests, including the executed CI `run:` block, the
  temp-git `--base-ref` and `--merge-base` paths, and the wiring pins — apparatus test
- `.dev/floor/command-hygiene.test.mjs` — the one false comment at `:479`, and nothing else — apparatus
  test
- `.dev/floor/test-fixtures/changelog-per-pr/base.md` — BASH-written verbatim excerpt of
  `392817f:CHANGELOG.md` through the `[6.12.1]` section, declared here because the write escapes the
  Write-tool guard (L19) — test fixture
- `.dev/floor/test-fixtures/changelog-per-pr/head.md` — BASH-written verbatim excerpt of this branch's
  final `CHANGELOG.md` over the same region, declared for the same reason (L19) — test fixture
- `.github/workflows/ci.yml` — the per-PR step — CI
- `package.json` — the `check:changelog-entry` script, outside `check` — repo meta
- `CHANGELOG.md` — the extended `[Unreleased]` comment and this feature's dated entry — repo meta
- `CLAUDE.md` — the `:99–100` replacement, the cite-by-version line, and the CI-only sentence — repo meta
- `CONTRIBUTING.md` — the corrected `check:changelog` clause and the CHANGELOG section — repo meta
- `.github/PULL_REQUEST_TEMPLATE.md` — the replaced checkbox — repo meta
- `.claude/hooks/require-loop-record.test.cjs` — R7 only: the one CLI test whose marker is dated from a fixed clock — apparatus test
- `.claude/commands/pharn-dev-ship.md` — Step 2c, its `--loop` paragraph, the GATE-2 and roll-up lines,
  the audit bullet, and the zero-git-ops correction — apparatus command

These exact commands write the two fixtures (L22), after the `CHANGELOG.md` edit. They are re-run if a
later fix round changes `CHANGELOG.md`:

```bash
mkdir -p .dev/floor/test-fixtures/changelog-per-pr
git show 392817f:CHANGELOG.md | awk '/^## \[6\.12\.0\] /{exit} {print}' > .dev/floor/test-fixtures/changelog-per-pr/base.md
awk '/^## \[6\.12\.0\] /{exit} {print}' CHANGELOG.md > .dev/floor/test-fixtures/changelog-per-pr/head.md
```

Prettier and markdownlint already exclude `.dev/floor/test-fixtures/` (`.prettierignore:3`, and the
`.markdownlint-cli2.jsonc` `ignores`), so the verbatim bytes are never reformatted.

### Version discipline

**No `SKILLS_VERSION` bump.** The bump-triggering set at `CLAUDE.md:90–95` is:

- the `pharn/` capability tree;
- the `pharn/floor/*.mjs` checkers;
- the four trusted docs;
- the product `.claude/` surface (`pharn-*` commands, `.cjs` hooks, `settings.json`).

No path above is in it:

- `.dev/**` and the `pharn-dev-*` command are apparatus (`CLAUDE.md:85–89`).
- CI, `package.json`, `CHANGELOG.md` and `CONTRIBUTING.md` are named repo meta at `:87–89`.
- `CLAUDE.md` and the PR template are outside the set. `670565b` (#245) edited `CLAUDE.md` with no bump.

`MIN_CLI` is untouched, because no installed path moves. So this PR's entry goes under `[Unreleased]`,
dated `2026-09-23`.

## Contracts satisfied

- None from `pharn/pharn-contracts/`, because this is dev apparatus. The outputs follow the repo's
  checker conventions: a closed exported `REFUSAL_STATES`, a per-finding `fix`, and fail-closed input
  handling (the `check-contributing-gates.mjs` / `check-version-badge.mjs` precedents).

## Evals to write (P1) — tests, since this is not a `role:` capability

Each obligation names the set it ranges over (L52):

- **Check 1 — every member of `REFUSAL_STATES`.**
  - A `BRANCH_CASES` table must equal the exported set in both directions.
  - Each state gets a test for exit 1, its `[STATE]` marker, and no stack trace.
  - Each state gets a test that its remedy is present in its own output and absent from every other
    state's output (L27).
- **Check 2 — every member of `REFUSAL_STATES`.** The same three rules, with the exit code taken from
  the table (1 or 2).
- **Every member of `HEADING_KINDS`** gets a classifying case. The set is asserted non-empty first
  (L34).
- **Scenarios the brief names:**
  - a no-bump PR (GREEN);
  - a bump PR that moves `[Unreleased]` (GREEN), once keeping and once dropping the date prefixes;
  - an edited released bullet (`ENTRY_CHANGED`);
  - an edited `[Unreleased]` bullet (`ENTRY_CHANGED`);
  - a heading inside a code fence, for both checks;
  - THIS PR's transition: `base.md` → `head.md` is GREEN for Check 2, and `head.md` is GREEN for Check
    1's pure core at `6.12.1` with `now` = 2026-09-23;
  - the live CHANGELOG, GREEN for Check 1.
- **Scenarios the rounds added:**
  - a bump that forgets to move: cross-day (`STALE_UNRELEASED`) and same-day (`UNRELEASED_NOT_MOVED`);
  - a new bullet appended to an old section (`ENTRY_MISPLACED`, D4);
  - a fake mid-history section with an entry under it (`HEADING_INSERTED`, D11);
  - a bullet copied into a released section with the original left in place: `ENTRY_MISPLACED` for Check
    2 and `DUPLICATE_ENTRY` for Check 1 (D13);
  - an `[Unreleased]` entry re-dated in place (GREEN) against a released entry re-dated (`ENTRY_CHANGED`)
    (D10);
  - `EMPTY_BASE` from an empty `--base-file`, and a `main..HEAD` ref refused (D12);
  - `--merge-base` in a temp repo whose `main` moved after branching (GREEN), with `--base-ref` on the
    tip of the same repo as the contrast (`ENTRY_CHANGED`);
  - a CRLF head against an LF base (GREEN);
  - an HTML comment holding column-0 hyphen and `##` lines (ignored);
  - a level-2 heading with a leading space (`UNKNOWN_HEADING`);
  - the timezone boundary: now plus one day is GREEN, plus two days is `FUTURE_DATE`;
  - `2026-02-31` gives `BAD_DATE`;
  - a `--output=<dir>/x` ref: `BAD_USAGE`, the scratch directory stays **empty**, and a positive control
    shows unvalidated git writes a file there;
  - an ESC byte in a quoted bullet is escaped in stdout (P2);
  - listed findings are capped;
  - a subdirectory target.
- **The defaults in this change — one test each (L41/L52):**
  - Check 1's `now`: the live-repo CLI run injects none.
  - Check 1's `targetDir`: a CLI run with cwd = repo and no argument.
  - Check 2's `targetDir`: the executed CI `run:` block passes none.
  - Check 2 has no base default, because one of the three flags is required.
- **Invocation (L45):**
  - `ci.yml`'s step, parsed by name: the tests pin its `if:`, its two `run:` lines, the absence of `${{`
    in `run:`, and `persist-credentials: false` on checkout.
  - The `run:` block is then **executed** with `bash -eo pipefail`, from its committed bytes, in a temp
    repo prepared the way actions/checkout prepares one: a depth-1 fetch of a merge commit from a local
    bare `origin`, with `GITHUB_SHA` set and git's global/system config isolated. It must exit 0. A
    negative control, a merge that adds no entry, must exit 1.
  - `package.json`: the script is present, uses `--merge-base origin/main`, and is not in `check`.
  - `pharn-dev-ship.md`: the invocation sits inside Step 2c, and the heading order is 2b, then 2c, then 3.
- **Coverage.** At least 90% line coverage per new or modified `.mjs`, measured with
  `node --test --experimental-test-coverage` over the three test files and recorded in the build output.

## Guarantee audit (P0)

- **Check 1 → floor: enum-regex**, in `npm run check` and in CI. The claim: the newest version section is
  `SKILLS_VERSION`'s; sections are ordered; dates are real and not future; `[Unreleased]` bullets are
  dated and not stale; entries are unique; the level-2 ATX heading set is closed.
  - NARROWED: setext headings are not seen.
- **Check 2 → floor: enum-regex and string set membership.** The claim: the PR added an entry, edited or
  deleted no released entry or heading, inserted no version mid-history, and placed every entry legally.
  - It is floor **only where the CI step runs**: a pull request from a non-dependabot author.
  - Direct pushes and admin merges are outside it.
- **The per-PR step is wired and not disabled → floor: enum-regex over `ci.yml`**, plus an execution of
  its committed `run:` block. NARROWED: neither proves GitHub executed the job.
- **The bump was needed, right-sized, or covers the changed bytes → NOT CLAIMED** (L43).
- **The entry describes the change → advisory** (human review).
- **An entry's date is when it merged → NOT CLAIMED.** It is the authored date.
- **`/pharn-dev-ship` runs the check → advisory** (command prose). The check's verdict is floor.
- **The CHANGELOG is append-only → the VERDICT is floor on PRs via Check 2**; enforcement needs a merge path that honours required checks, which `--admin` does not. One stated exception: an
  `[Unreleased]` entry's date. Outside PRs it is discipline.

## Trust audit (P2)

- **CHANGELOG text.** `CHANGELOG.md` at base and at head is **untrusted** on a fork PR. Both checks only
  parse it and compare strings. No text from it reaches a shell, a decision other than string equality,
  or a terminal unescaped: quotes are length-capped and `JSON.stringify`-escaped.
- **Refs.** A ref is validated against a closed character set, with no leading `-`, before it reaches
  git's argv. `--end-of-options` is a second layer. In CI the only ref is the literal `HEAD^1`.

## Determinism audit (P5)

- **Every branch is a regex, string-equality or set-membership test:**
  - heading class;
  - bullet section and body;
  - body ∈ base;
  - date ≤ now + 1 day;
  - version order;
  - "is the first version heading".
- **No judgment and no guessing.** Nothing classifies by judgment, and neither check has a fallback that
  guesses. Every unusable input is a named refusal.

## Applied lessons

- **L1** — the meta-doc sweep is the Docs table. `CLAUDE.md`, `CONTRIBUTING.md`, the PR template, the
  `[Unreleased]` comment and a stale test comment are in `## Files`, because each states a fact this
  increment changes.
- **L6** — the version is read from its structured location, a line-anchored `## [X.Y.Z] - date` heading,
  not a token anywhere in prose. That removes the narrowing the old header stated against L6.
- **L13** — build, regress, verify, review and ship each format their own artifact. The fixtures sit in
  an excluded directory, so formatting cannot alter their verbatim bytes.
- **L19** — the two fixtures are Bash writes, declared by path in `## Files` with their exact commands.
  Formatters run on named files only.
- **L20** — applied with its bar stated honestly. The per-version rule answers a measured deficiency and
  a predicted recurrence, not a second failure of a discipline (round-1 finding 17). What L20 does
  justify: #249's repair is held by a floor check rather than by a sentence.
- **L22** — `/pharn-dev-ship` Step 2c, CONTRIBUTING, the CI step and the fixture commands all pin literal
  command lines.
- **L27** — each finding carries its own `fix`, and a test asserts each state's remedy is present for it
  and absent from every other state. `ENTRY_CHANGED`'s stale-branch and roll-forward notes print only on
  that branch.
- **L29** — both checks export a closed `REFUSAL_STATES`, and the core exports `HEADING_KINDS`. The tests
  iterate them with a closure assertion in both directions.
- **L32** — `origin/main` is named as a mutable alias. Ship fetches first, local runs use the merge-base
  (D9), and CI uses its own checkout's parent (D8), so no path depends on an alias being current.
- **L33** — the "unbuilt" residual `changelog-record-position` is marked CLOSED where it was declared.
  Both false "no git operation" sentences (ship `:153`, the hygiene test `:479`) are corrected.
- **L34** — every iterated table is asserted non-empty first.
  - `NO_NEW_ENTRY` is the per-PR empty-set guard.
  - `EMPTY_BASE` closes the vacuous-base hole the adversarial pass found.
  - No version heading at all is `UNRECORDED`, never GREEN.
- **L35** — Check 1 is extended, not paralleled, and both checks share one grammar core. The version
  heading is a join key that must exist, so it is bound rather than drained.
- **L36** — `UNKNOWN_HEADING` is a closure over every level-2 ATX heading, leading-space and tab variants
  included, so a variant spelling REDs.
- **L41** — the defaults in this change are enumerated (Check 1 `now`, Check 1 `targetDir`, Check 2
  `targetDir`), and each gets a test that reaches its no-argument path.
- **L43** — Check 1's header and CONTRIBUTING state that the newest heading agreeing with
  `SKILLS_VERSION` proves neither that the bump was needed nor that it was the right size. The referent
  check stays unbuilt and is named.
- **L45** — the CI `run:` block is executed from its committed bytes in a checkout-shaped temp repo, with
  a negative control, so the invocation is tested and not only the script.
- **L47** — no new closed count is written into a doc. Counts in this plan are measurements dated to
  `392817f`, never claims for a doc to carry.
- **L50** — the sweep is by referent, declared with its excluded surfaces, and re-run after the
  adversarial pass found three misses (round-1 finding 4). The one dead cite outside records is deferred
  with its fix.
- **L52** — each test obligation names the set it ranges over (states, heading kinds, defaults, placement
  rules), not a single member.

## Grill dispositions (folded in before build)

`/pharn-dev-grill` (`GRILL.md`) raised 11 advisory concerns. Every fix sits inside a file already listed in
`## Files`, so `## Files` does not change. What the build does for each:

- **P0, self-modification.** The Check 2 header and CONTRIBUTING state that a PR runs its own version of
  the checker, `changelog-core.mjs` and `ci.yml`. So a PR that edits them is judged by the edited code,
  and review of those files is the backstop.
- **P0, enforcement wording.** The guarantee audit's append-only line is corrected here: the VERDICT is
  floor on PRs; enforcement needs a merge path that honours required checks, which `--admin` does not.
- **P7, D11/D13 basis.** The Check 1 and Check 2 headers say `HEADING_INSERTED` and `DUPLICATE_ENTRY`
  close bypasses that review found in this increment's own rule, with no recorded escape.
- **P1, env isolation.** The executed CI-block test builds the child environment from scratch:
  - it sets `PATH`, `HOME`, `GITHUB_SHA`, `GIT_CONFIG_GLOBAL=/dev/null` and `GIT_CONFIG_NOSYSTEM=1`;
  - it passes no inherited `GIT_*` or `GITHUB_*` variable, so the real CI `GITHUB_SHA` cannot leak in.
- **P1, shell fidelity.** The run block executes under `bash -e`, GitHub's default for a `run:` with no
  `shell:` key, not `bash -eo pipefail`.
- **P1, the brief's literal acceptance command.** The build and verify stages run
  `node .dev/floor/check-changelog-entry.mjs --base-ref origin/main` and record its exit.
- **P5/L36, vocabulary closure.** The ship pin also asserts closure: every `changelog-entry:` line the
  command writes matches one of the two members.
- **P3, filename.** The Check 1 header states it now owns the CHANGELOG repo-state convention, and why
  the file keeps its name: its CI step and wiring pins.
- **P3, pin location.** The ship pin stays in `check-changelog-entry.test.mjs`, following the precedent
  of `check-skills-version-recorded.test.mjs` pinning its own invokers. A comment names
  `command-hygiene.test.mjs` as the other home, so a reader finds both.
- **MD038.** No linted doc writes the date prefix as a code span ending in a space. Docs write
  `YYYY-MM-DD:` followed by the words "and a space", or show a full example bullet in a fenced block.
- **Comprehension.** The 64 MiB `maxBuffer` and the 256-character ref cap carry their reasons at the
  constants:
  - 64 MiB is two orders of magnitude over today's ~483 KB CHANGELOG, while execFileSync's 1 MiB default
    would be outgrown within the file's life;
  - 256 characters is far longer than any real ref name (a SHA is 40 or 64), and bounds the argv.

## Review dispositions — iteration 2 (folded in after `REVIEW.md` iteration 1)

`/pharn-dev-review` iteration 1 was blocked by three floor-gate findings, each demonstrated by a probe. The
GATE-2 decision was fix, a model decision under the same delegation as GATE 1. Every fix is inside
`## Files`, so `## Files` does not change. The grammar follows CommonMark list-item boundaries more
closely, and the refusal set grows by one state.

- **R1 — an opaque region opened inside an entry ends where the list item ends.** A fence or HTML comment
  whose opener is indented 2 to 5 columns while an entry is open belongs to that entry. It closes at its own
  closer, or at the first non-blank line indented less than 2 columns, which ends the entry too and is then
  parsed normally.
  - An opener indented 0 or 1 column while an entry is open ends the entry and opens a top-level region.
  - At top level, a fence opener may be indented at most 3 columns (4 or more is indented code).
  - A backtick opener whose info string contains a backtick is not a fence (CommonMark).
  - Three tests asserted the old, wrong premise. They are rewritten, with the probe cases as fixtures.
- **R2 — `SECTION_CHANGED` (new, Check 2).** Released sections are immutable in full, not only in their
  entries:
  - The grammar records each level-2 section's SKELETON: every line not inside a top-level entry (its
    heading, its group headings, and anything before its first entry or outside any entry).
  - For every base section other than `[Unreleased]` and the preamble whose heading is still present at
    head, the skeleton must be byte-identical (after the CRLF fold), or `SECTION_CHANGED`.
  - This closes the asterisk-bullet, stray-prose, renamed-group and conflict-marker holes. An edited entry
    keeps its own `ENTRY_CHANGED`, and a missing heading keeps `HEADING_CHANGED`.
  - `[Unreleased]`'s skeleton (its guidance comment and group headings) stays editable, and so does the
    preamble.
- **R3 — `UNRELEASED_NOT_MOVED` counts EVERY head entry under `[Unreleased]` when NEW exists**, the PR's
  own new entries included. So a bump PR cannot leave its entry in `[Unreleased]`, and cannot open an
  empty section: its fresh entries may sit only under `[Unreleased]` or NEW, and `[Unreleased]` must now
  be empty.
- **Minor dispositions:**
  - strict:false and the Prettier-upgrade cost are written into the bounds and CONTRIBUTING.
  - `git fetch` is named as a ref-updating call, not a read.
  - "ONE new entry" becomes "at least one new entry" everywhere.
  - The header says the checker is not in verify's STANDARD gate set.
  - The PR template keeps the brief's text and restores the `SKILLS_VERSION` clause.
  - A missing target is refused as `HEAD_UNREADABLE` before git runs.
  - CONTRIBUTING qualifies the same-day case.
  - `PREAMBLE_KEY` is imported.
  - The core header names its helpers honestly.
  - The test suite uses one temp HOME, removed after the suite.

## Review dispositions — iteration 3 (folded in after `REVIEW.md` iteration 2)

Review iteration 2 confirmed every iteration-1 fix and found no false RED on legitimate practice. It
demonstrated three more holes, each a claim stronger than the code. GATE-2 decision: fix, a model decision
under the same delegation. `## Files` does not change.

- **R4 — a region closes where CommonMark closes it, and the HTML blocks that run to a closer are
  regions.**
  - A fence closer counts only at indentation of at most 3 columns (5 inside an entry), with tabs measured
    by `indentOf`. Openers are matched with leading tabs as well as spaces.
  - Raw HTML blocks of CommonMark types 1 to 5 (`<pre` / `<script` / `<style` / `<textarea`, `<!--`,
    `<?`, `<!` followed by a letter, `<![CDATA[`) are regions that end at their own closer. An unclosed
    one therefore runs to EOF in the grammar, just as it does on GitHub, and hides the base headings, so the
    diff check fails CLOSED on `HEADING_CHANGED`.
  - Types 6 and 7 end at a blank line, so they can only change how the few lines before the next blank line
    render. They are named as a bound, not modelled.
- **R5 — a released section is frozen WHOLE.** Sections carry their full text (heading to the line before
  the next level-2 heading, CRLF folded, trailing whitespace trimmed) instead of a skeleton.
  - `SECTION_CHANGED` fires when a released section's text differs and no entry-level finding
    (`ENTRY_CHANGED` / `ENTRY_MISPLACED`) already names that section.
  - So regrouping, reordering and blank-line edits are refused too, each reported once, under the most
    specific state that explains it.
- **R6 — the prose says what is enforced.**
  - "a line GitHub renders as a heading is one to both checks" is narrowed to the stated exceptions:
    setext headings, asterisk and plus items, and HTML blocks of types 6 and 7.
  - A heading nested inside a list item's fence is named as a bound.
  - The PR template reads "at least one new entry (dated when it sits under `[Unreleased]`)".

## R7 — a pre-existing time bomb found at ship time (not caused by this increment)

After verify iteration 4 passed, `npm run check` went RED on one test outside this increment:
`.claude/hooks/require-loop-record.test.cjs`, "CLI: blocks from a SUBDIRECTORY".

- **Why.** Its fixture dates the `/pharn-loop` marker from a fixed `NOW` (2026-09-22T12:00Z), but the CLI
  subprocess it spawns judges the marker against the REAL clock, under the hook's 24-hour age ceiling. So
  it has failed on every branch, `main` included, since 2026-09-23T12:00Z.
- **Where it came from.** It landed in #243 (`031c563`). It was measured failing five times in a row, and
  it had passed at verify iteration 4 only because the clock had not yet crossed the ceiling.
- **The fix.** That test alone builds its marker from the real clock (the other CLI tests already use
  `--open`, which writes the real time).
- **Why here.** It is declared above because this PR's CI, like every PR's, would otherwise be RED. The
  file is apparatus (`*.test.*`), so it does not bump.

## Open questions (HALT)

- None. GATE 1, a model decision under the maintainer's standing delegation for queued runs, kept every
  rule the brief did not list: D3, D4, D9, D10, D11, D12, D13. The grill's concerns are resolved by the
  dispositions above, review iteration 1's by R1–R3 and the minor dispositions, and review iteration 2's by R4–R6.
