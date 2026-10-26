# PLAN — release-workflow

- spec_content_hash: d5a974303fd0b9568945c60423ae5a89c57d7b65f5baa03657e317fbe64f33a5
- applied_lessons: [L34, L35, L43, L45, L64, L67, L68]
- increment: A `release.yml` workflow that, on a push to `main` (or a manual dispatch on `main`), creates the annotated tag `v<SKILLS_VERSION>` and a GitHub release only after the required checks concluded `success` on that exact commit, with the release body cut from `CHANGELOG.md` by a new tested `.dev/floor/changelog-section.mjs` — so pharn-cli's `--ref latest` channel has something verified to resolve.
- layer(s): build apparatus (`.dev/floor/`) + repo meta (`.github/workflows/`, `CHANGELOG.md`, `CONTRIBUTING.md`, `README.md`, `CLAUDE.md`, one `pharn-dev-` command). No product surface, so no `SKILLS_VERSION` bump; one `[Unreleased]` entry. Two trusted-doc edits are proposed in a `HUMAN-PATCH.md` for a human to apply (fix #2).
- constitution_refs: [P0, P2, P4, P5, P6, P7]

## Live state measured this run (P6)

- `origin/main` = `77e01aef` (7.1.2). `git tag` is empty; `gh api repos/pharn-dev/pharn-oss/releases` is empty.
- Ruleset `18045407` ("main protection", branch target) requires five status checks: `floor`, `check`,
  `Analyze (javascript-typescript)`, `Socket Security: Project Report`, `Socket Security: Pull Request Alerts`;
  `strict_required_status_checks_policy: true`; one bypass actor (the owner's user id, `always`).
- **Check runs on main push SHAs** (`gh api …/commits/<sha>/check-runs`), measured on `77e01aef` and `e4b17048`:
  `floor`, `check`, `Analyze (javascript-typescript)`, `Socket Security: Project Report`, `gitleaks`, `comment`.
  **`Socket Security: Pull Request Alerts` does not appear on either.** It is a pull-request-only check. → Q1.
  All required checks are check runs (the commit-status API returned none). Durations on `e4b17048`: `check` 11 min
  20 s, `floor` 7 min 29 s, `Analyze` 2 min 6 s, Socket 3 s — inside the 45-minute bound.
- pharn-cli (`../pharn-cli`, published 0.14.1): `src/lib/validate.ts:31` `RELEASE_TAG_RE = /^v(\d+\.\d+\.\d+)$/`
  (the same language as `^v\d+\.\d+\.\d+$`; it only adds a capture group); `src/lib/constants.ts:27`
  `SKILLS_VERSION_FILE = 'SKILLS_VERSION'`; `src/lib/release.ts` resolves `releases/latest`, then the tag's commit,
  and `src/lib/repo.ts:182` refuses a tree whose `SKILLS_VERSION` differs from the tag. It caps the release object
  read at 1 MiB and its comment cites GitHub's 125,000-character body limit.
- `set-writes-scope.cjs` refuses a `.github/workflows/**` plan entry **only in an installed project**
  (`mode === "--from-plan" && !allowExecConfig && isPharnInstalledProject()`, `:806`); this checkout's
  `pharn.config.json` has no `skillsVersion`, so it is the dev checkout and this plan CAN scope `release.yml`
  (#370 edited `ci.yml` through the dev loop the same way). → Q4.
- `pharn/LIMITS.md §1d` is "'Approved' is forgeable at the write surface"; it says nothing about merges, tags or
  releases. The "§1d" pharn-cli cites for "the tip of main, whether or not its post-merge CI has finished" is
  **pharn-cli's own** `LIMITS.md §1d`. `pharn/THREAT-MODEL.md §4` item 2 is "Trust-by-location without
  write-protection" (the trusted-doc hook). Both docs are human-only. → Q2.
- The claim "every merge to `main` is a release" appears in: `CONTRIBUTING.md:87`, `CLAUDE.md:93`,
  `.claude/commands/pharn-dev-ship.md:269`, `.dev/floor/check-changelog-entry.mjs:53`,
  `.dev/floor/check-skills-version-recorded.mjs:69` (plus released CHANGELOG entries and two test fixtures, which are
  frozen/data and stay — L75 dispositions under Files).
- Lessons index freshness gate: `check-lessons-index.mjs` exit 0 (GREEN) → two-step sweep used.

## Design decisions

**D1 — four jobs' worth of logic in one job, four steps, plain bash over `gh api`, every value through `env:`.** No
`${{ }}` inside any `run:` block (injection hygiene, the `ci.yml` precedent). Job-level env holds the constants the
✧ pins read: `TAG_RE: '^v\d+\.\d+\.\d+$'`, `SKILLS_VERSION_FILE: SKILLS_VERSION`, `POLL_INTERVAL_S: 60`,
`POLL_MAX: 45`, and `REQUIRED_CHECKS` (newline-separated names, see Q1). Steps:

1. **Resolve** — refuse unless `GITHUB_REF == refs/heads/main` (a dispatch on another branch would otherwise tag a
   non-main commit). Read `SKILLS_VERSION`, build `TAG=v<version>`, test it against `TAG_RE` with `node` (a JS
   regex without the `m` flag, so a value with a newline cannot pass the way it could line-by-line in `grep`). Look
   the tag up (`git/matching-refs/tags/<tag>`, exact-ref filter; an annotated tag is dereferenced one level through
   `git/tags/<sha>`). Absent → `action=tag-and-release`. Present and pointing at another commit → exit 1, the tag is
   never moved. Present at this commit → look up a release for it (`releases`, filtered by `tag_name`): a published,
   non-prerelease one → exit 0 "already released" (`action=done`); none → `action=release-only` (Q3); a draft or a
   prerelease → exit 1 (never edit a release a person made).
2. **Wait for required checks** (`if: action != done`) — every `POLL_INTERVAL_S` seconds, up to `POLL_MAX` polls,
   list this SHA's check runs; for each required name take the run with the highest id (a re-run supersedes the run
   it re-ran). Any required run completed with a conclusion other than `success` → exit 1 at once. All completed
   `success` → proceed. The bound → exit 1. The list is non-empty by a ✧ pin, and the step itself refuses an empty
   list (L34 — an empty set must not pass vacuously).
3. **CHANGELOG checks** — `node .dev/floor/check-skills-version-recorded.mjs .` (the newest version section is
   `SKILLS_VERSION`'s) and `node .dev/floor/check-changelog-entry.mjs --base-ref HEAD^1` (the commit's own diff keeps
   the convention; checkout `fetch-depth: 2`). Node 24 via the same pinned `setup-node`; no `npm ci` (stdlib only).
4. **Tag and release** — `node .dev/floor/changelog-section.mjs . "$TAG" > "$RUNNER_TEMP/release-notes.md"`; on
   `tag-and-release`, create the tag object (`git/tags`, `type=commit`, `object=$GITHUB_SHA`, message `$TAG`) then the
   ref (`git/refs`, which fails rather than overwrites an existing ref); then
   `gh release create "$TAG" --verify-tag --title "$TAG" --notes-file … --latest` (not a draft, not a prerelease).

Permissions: workflow-level `permissions: {}`; the job gets `contents: write` and `checks: read` (read-only; the
check-runs API needs it once `permissions:` is explicit — stated, since the brief named only `contents: write`).
`actions/checkout` with `persist-credentials: false`; `gh` gets `GH_TOKEN: ${{ github.token }}` via `env:` on the two
API steps only. Every `uses:` is the SHA `ci.yml` already pins. `concurrency: { group: release, cancel-in-progress: false }`.

**D2 — `changelog-section.mjs` reads the file through `changelog-core.mjs`'s `parseChangelog` (L35 — one grammar).**
`node .dev/floor/changelog-section.mjs <dir> <tag>`: exit 2 when the tag fails `TAG_RE` or usage is wrong; exit 1
when `CHANGELOG.md` is unreadable or has no `## [X.Y.Z] - date` section for that version; exit 0 printing the
section's text below its heading, verbatim (CRLF folded by the grammar), leading blank lines dropped. Exports
`TAG_RE`, `MAX_BODY_BYTES = 125000`, `sectionBody`, `releaseBody`. **Cap:** when the body exceeds `MAX_BODY_BYTES`
UTF-8 bytes (bytes ≥ characters, so this is inside GitHub's 125,000-character limit), it is cut **just before a
top-level entry** — an entry start is recognized only outside fences and raw HTML blocks, so the cut can never leave
one open and swallow the note — at the last such boundary where the kept text plus the note fits, followed by
`… truncated here. The full section: https://github.com/pharn-dev/pharn-oss/blob/<tag>/CHANGELOG.md`. If not even
the first entry fits, the body is the note alone. Largest section today: `[2.1.0]`, 20,843 bytes.
Runtime-floor import first and an `import.meta.main` gate, as every `.dev/floor` CLI (`entry-point-guard.test.mjs`).

**D3 — the workflow test executes the committed `run:` blocks (L45).** `release-workflow.test.mjs` extracts each
step's `run:` block from `release.yml` and runs it under `bash` with a stub `gh` first on `PATH` (canned output per
API path, a call log) and `POLL_INTERVAL_S=0`. That exercises the guard logic as committed; the `--jq` expressions
and the real API are pinned as text only (L67 — the stub models GitHub; its bound is stated, not claimed complete).

**D4 — docs, retracting "every merge to main is a release" where it is now false.** New wording: every merge reaches
the `main` channel (pharn-cli's default today); a merge that bumps `SKILLS_VERSION` becomes a release once its
required checks pass on `main`; an `[Unreleased]` merge is not a release. The CHANGELOG per-PR rule keeps its reason
(the `main` channel still installs every merge).

## Applied lessons

- L34 — the required-check list is a set the wait step quantifies over; the step refuses an empty list and a ✧ pin
  asserts the committed list is exactly the expected names, so "all required checks passed" cannot pass vacuously.
- L35 — `changelog-section.mjs` imports `parseChangelog` from `changelog-core.mjs` instead of a second CHANGELOG
  parser; `TAG_RE` is exported once from it and the workflow's env literal is pinned to its `.source`.
- L43 — the tag-regex pin across repos certifies agreement, not correctness; the plan says so and also binds the
  value to its referent where it can: the ★ execution runs the resolve step against a real `SKILLS_VERSION` file and
  refuses a tag pointing at another commit, which is the property pharn-cli verifies.
- L45 — the guard lives in the workflow's `run:` blocks, so the test executes those committed blocks rather than a
  copy of their logic; a negative control (a failed check, a moved tag) must exit 1.
- L64 — the bound "a red tree never receives a tag" is restated in CONTRIBUTING, README, CLAUDE.md, the CHANGELOG
  entry and HUMAN-PATCH; each restatement is grepped and probed against the workflow before hand-off, and each keeps
  the bounds (admin merges still land on `main`; the `main` channel still installs them).
- L67 — the stub `gh` is a model of GitHub's API; the test header lists what it does not model (pagination, rate
  limits, the `--jq` engine, the ruleset) as known-so-far, never complete.
- L68 — the two trusted-doc edits are human-only; the plan sequences them: the human applies `HUMAN-PATCH.md`
  **after `/pharn-dev-verify`** (or after merge, as a follow-up PR), never inside the build's anchor→verify window.

## Files

- `.github/workflows/release.yml` — new: the release job (D1) — repo meta
- `.dev/floor/changelog-section.mjs` — new: the release-body cutter (D2) — build apparatus
- `.dev/floor/changelog-section.test.mjs` — new: ★ fixture tests of the section cut, the cap and the CLI exits; ✧ `TAG_RE.source` equals the literal — build apparatus
- `.dev/floor/release-workflow.test.mjs` — new: ✧ pins of the workflow text, ★ execution of its `run:` blocks against a stub `gh` (D3) — build apparatus
- `CONTRIBUTING.md` — "CHANGELOG entries" opening paragraph (`:87`) rewritten per D4, plus a short "Releases" paragraph (failed job → fix, re-run via `workflow_dispatch`, never retag) — repo meta
- `README.md` — install section: `--ref latest` recommended for users, `main` for contributors; no claim about pharn-cli's default changing — repo meta (outside the generated markers)
- `CLAUDE.md` — `:93` per D4, and `:108-111` (the owner-bypass sentence) gains: a tag is created only after the required checks passed on that SHA, so `latest` never receives a red tree although the owner can still merge one; kept under the 2,048-byte growth budget — repo meta
- `.claude/commands/pharn-dev-ship.md` — `:269`, one clause per D4 — apparatus (`pharn-dev-`, no bump)
- `.dev/floor/check-changelog-entry.mjs` — `:53` header comment only, per D4 — build apparatus
- `.dev/floor/check-skills-version-recorded.mjs` — `:69` header comment only, per D4 — build apparatus
- `CHANGELOG.md` — one `[Unreleased]` entry — repo meta
- `.dev/features/release-workflow/HUMAN-PATCH.md` — proposed trusted-doc text (Q2) for a human to apply after verify — build apparatus

Not changed, with the reason (L75 dispositions for the sweep above): released CHANGELOG entries (frozen whole);
`.dev/floor/test-fixtures/changelog-per-pr/{base,head}.md` (test data quoting a past entry);
`pharn/pharn-core/seam-resolver/evals/cases/model-not-confident.md:19` (an unrelated "is a release" about a package).

## Contracts satisfied

- None in `pharn/pharn-contracts/` — this is release tooling around the repo, not a capability. The consumer
  contract it serves is pharn-cli's (`src/lib/release.ts` header), cited, not restated (P4).

## Evals to write (P1)

No capability, so no `evals/`. Tests instead:

- `changelog-section.test.mjs`: ★ a fixture CHANGELOG with `[Unreleased]`, two versions, a fenced block holding a
  `## [9.9.9]` line and a `<!-- -->` comment → the section for each version is exactly its text; a missing version →
  exit 1; a bad tag (`7.1.2`, `v7.1`, `v7.1.2\n`, `v7.1.2-rc1`) → exit 2; a body over the cap → cut before an entry,
  ≤ `MAX_BODY_BYTES` bytes, note present with the tag's link; a first entry larger than the cap → the note alone; a
  cut that would otherwise land inside a fence is not chosen; multi-byte text near the cap stays valid UTF-8.
  ✧ `TAG_RE.source === "^v\\d+\\.\\d+\\.\\d+$"` and `MAX_BODY_BYTES <= 125000`.
- `release-workflow.test.mjs`: ✧ triggers (`push` to `main`, `workflow_dispatch`), `concurrency`, permissions
  (workflow `{}`; job exactly `contents: write`, `checks: read`), `persist-credentials: false`, every `uses:` pinned
  to a 40-hex SHA, no `${{` inside a `run:` block, `TAG_RE` env equals the literal and `changelog-section.mjs`'s
  `TAG_RE.source` (pharn-cli `src/lib/validate.ts` `RELEASE_TAG_RE`, cited by path), `SKILLS_VERSION_FILE` equals
  `SKILLS_VERSION` (pharn-cli `src/lib/constants.ts`), `POLL_INTERVAL_S` 60, `POLL_MAX` 45, `REQUIRED_CHECKS` exactly
  the Q1 set. ★ executed: resolve — tag absent → `tag-and-release`; tag at SHA with a published release → exit 0
  `done`; tag at SHA, no release → `release-only`; tag at another SHA → exit 1; annotated tag dereferenced; draft
  release → exit 1; non-main ref → exit 1; bad `SKILLS_VERSION` → exit 1. Wait — all success → 0; one failure → 1
  at once; one missing until the bound → 1; in-progress then success → 0; older failure superseded by a newer success
  → 0; empty list → 1. Tag-and-release — call log shows `git/tags`, `git/refs`, `release create` with `--verify-tag`
  and the title; `release-only` skips the two tag calls.

## Guarantee audit (P0)

- "a release tag is created only after every required check concluded `success` on that SHA" → **floor-adjacent,
  stated as a workflow property, not a PHARN floor primitive.** The decision is a membership test over check-run
  conclusions (primitive #3 in kind) executed by GitHub Actions; the test executes the committed logic against a
  stub. Not guaranteed: that the workflow ran (a disabled workflow, an expired run, an Actions outage), that the
  owner did not create a tag by hand, or that a tag was not later moved (the tag ruleset is a human step, PR
  description (ii)). Wording everywhere: "the release workflow creates a tag only after…", never "guaranteed".
- "`latest` never receives a red tree" → true of trees the workflow tags, bounded as above; an owner bypass still
  lands a red tree on `main`, which the `main` channel installs. Every restatement carries that bound (L64).
- "the release body is that version's CHANGELOG section verbatim" → enum/regex + string slicing in a tested helper;
  except the truncation case, which is stated.
- "a tag is never moved" → the resolve step exits 1 when the tag points elsewhere, and `git/refs` creation fails on
  an existing ref; not proof against a person with admin rights (ruleset, human step).
- "the tag pattern equals pharn-cli's" → a ✧ text pin against a literal copied from pharn-cli, cited by path; it
  certifies agreement with that copy, not with pharn-cli's live source (L43; cross-repo import impossible).
- "the dev loop cannot author `release.yml`" (from the brief) → **false in this checkout**; see Q4.

## Trust audit (P2)

- The release body is `CHANGELOG.md` text — repo content that passed review — written to a file and handed to `gh`
  as `--notes-file`, never interpolated into a shell line. `SKILLS_VERSION` is validated by `TAG_RE` before it
  becomes a URL segment or an argument.
- Check-run names and conclusions come from GitHub's API (another app's output, e.g. Socket); only exact string
  equality with fixed names and with the literal `success` decides anything.
- Fork pull requests never run this workflow (`push` to `main` and `workflow_dispatch` need write access).

## Determinism audit (P5)

Every branch is a membership or equality test: ref equality, regex match, tag object type, SHA equality, release
flags, check name/status/conclusion equality, integer poll count. No fallback guesses; every unexpected state exits 1.

## Human-only steps (go into the PR description; not done by the agent)

1. After merge, run `release.yml` once via `workflow_dispatch` on `main` → creates `v7.1.2` (or the then-current
   version). It needs the tip's own commit to add a CHANGELOG entry (`check-changelog-entry --base-ref HEAD^1`), which
   this PR's merge does.
2. A tag ruleset protecting `v*` from deletion and update (creation stays allowed, or the workflow cannot tag).
3. Optional hardening: split ruleset `18045407` into required status checks with **no** bypass actors, and PR review
   with the owner's bypass kept — a solo maintainer cannot satisfy "1 approval + code-owner review" on their own PRs.
4. Apply `HUMAN-PATCH.md` (Q2) after `/pharn-dev-verify` (L68).

## Known bounds (stated in the workflow header)

- GitHub keeps one pending run per concurrency group: a newer push cancels an older **pending** run (an in-progress
  run is never cancelled). The next run then releases the then-current `SKILLS_VERSION` at its own commit, so a
  version bumped and bumped again before the first run starts gets no tag of its own.
- A failed run is fixed and re-run with `workflow_dispatch` on `main`; it tags the tip at that time, never an older
  commit.

## Open questions (HALT) — resolved at GATE 1 (2026-10-26, by the human, via the form)

Q1 (a) four checks that run on push; Q2 (a) new `LIMITS.md §11` + one `THREAT-MODEL §4` item 2 sentence, in
`HUMAN-PATCH.md`; Q3 (a) create the missing release; Q4 (a) the accurate header note. Plan approved as written.

- **Q1 — the required-check set on a `main` commit.** `Socket Security: Pull Request Alerts` never runs on a push
  SHA (measured on the last two `main` commits). (a) wait for the four that do run on push and document that PR
  Alerts is verified on the pull request by the ruleset — recommended; (b) wait for all five as written — every
  release would time out at 45 minutes.
- **Q2 — the trusted-doc text.** `pharn/LIMITS.md §1d` is about forgeable approval, not releases (the "§1d" that
  matches is pharn-cli's), and `THREAT-MODEL §4` item 2 is about the trusted-doc hook. Both are human-only. (a)
  `HUMAN-PATCH.md` proposes a new `LIMITS.md §11` ("A merge to `main` is not a release") and one sentence on the
  `THREAT-MODEL §4` item 2 closure note naming the release gate as the CI-side counterpart — recommended; (b) the same
  patch, but appended to `§1d`'s backstop bullet as the brief says; (c) no trusted-doc change; CONTRIBUTING, README
  and CLAUDE.md only.
- **Q3 — a tag that exists at this SHA with no release** (a run that created the tag and then failed). (a) create
  the missing release and leave the tag alone — recommended; otherwise the re-run reports "already released" while
  `latest` still resolves the previous release; (b) exit 0 as the brief says.
- **Q4 — the workflow header note.** The brief's sentence ("`.github/workflows/**` is already refused for plan scope
  by `set-writes-scope.cjs`, so the dev loop cannot author this file") is false in this checkout: the refusal applies
  in an installed project only, and this plan scopes `release.yml`. (a) write the accurate note: refused from a plan
  in an installed project; in this dev checkout a plan may scope it, so review is what guards it — recommended; (b)
  omit the note.
