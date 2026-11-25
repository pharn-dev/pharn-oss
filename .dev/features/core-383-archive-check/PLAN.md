# PLAN — core-383-archive-check: the git archive satisfies pharn-cli's extractor before any tag (CORE-383)

- spec_content_hash: 8566b4432ed6cc7035de5d925dafe3755086e23b12acacde0dcdda07a43a9167
- applied_lessons: [L41, L67, L68, L85, L62, L34]
- increment: a dev-floor checker that builds `git archive` of a commit the way codeload serves it and walks it with
  pharn-cli's extractor rules, wired into `npm run check` and CI's `check` job, so a commit the CLI cannot unpack
  fails CI and `release.yml` never tags it.
- layer(s): build apparatus (`.dev/floor/`), repo-meta (`package.json`, `CONTRIBUTING.md`, `CLAUDE.md`, `CHANGELOG.md`,
  CI) — no product-surface path, so no `SKILLS_VERSION` bump.
- constitution_refs: [P0, P5, P6, P7]

## Trigger (P7)

A real failure, not a hypothetical: v7.25.3, v7.25.4 and v7.25.5 were tagged and every `pharn init`/`update` against
them fails. pharn-cli's `src/lib/tar-extract.ts` refuses the whole codeload tarball on the first non-file entry, and
pharn-oss tracks 7 git symlinks (mode 120000) under `.claude/skills/`. Measured live this run with
`git archive --prefix=pharn-oss-<sha>/ v7.25.5`: 4940 headers — 1 `g`, 4149 `0`, 783 `5` and 7 `2` (the symlinks
`.claude/skills/{pharn-ci-cover,pharn-ci-explain,pharn-ci-fix,pharn-ci-install,pharn-ci-policy,pharn-cli,security-audit}`);
the tar is 42,997,760 bytes, Node's gzip makes it 11,513,284, and the longest entry path is 187 characters. The PRs that
added them touched apparatus paths only, so `check:surface-bump` and the install-manifest generator had no reason to
look, and nothing in pharn-oss unpacks the archive.

## Applied lessons

- L41 — the checker takes its limits as a parameter so tests can use small ones; the defaults (pharn-cli's constants)
  live in ONE exported object, the CLI calls the core with no limits argument, and one test runs the CLI with no
  override against the real defaults (and pins their values against `repo.ts`), so the production path is exercised.
- L67 — the checker models an external tool (pharn-cli's extractor, and git archive's header writer). The fixture list
  is built from the extractor's own refusal set, enumerated as a table the suite iterates: every `throw new
TarExtractError` at pharn-cli 51a96d29 gets a fixture kind, each type flag (`1 2 3 4 6 7 x L K`, an unknown byte),
  each path rule (empty, absolute, `\`, `:`, `..`, no root, two roots, `//`, `/./`, a file at the root, a control or
  format character, invalid UTF-8), the framing rules (checksum, magic, non-octal, truncation, no end marker, data after
  it) and the three limits. Its bound list says "known so far".
- L68 — `.github/workflows/ci.yml` is in the always-reconciled control surface and only a human patch reaches it. This
  plan sequences it BEFORE build Step 0: the patch script is delivered right after GATE 1, the orchestrator has it
  applied, and the applied `ci.yml` is committed alone before the anchor, so the reconcile window never sees it.
- L85 — CORE-381 (the symlink removal) and CORE-382 (the install-manifest doc section) merge to `main` during this run.
  After each `git merge origin/main` the anchor is kept, never re-anchored; upstream bytes land under `merged`.
- L62 — every value quoted into a finding (an entry path, a pax `path` record) goes through one total display function
  that escapes bytes and cannot throw, the port of the CLI's `describeBytes`/`escapeUnsafe`.
- L34 — an archive with no entries, or a `git archive` that produced zero bytes, is not GREEN: an empty tar is a RED
  (`NO_END_MARKER` or an explicit `EMPTY_ARCHIVE`), and the checker reports the entry count it judged on GREEN so a
  vacuous pass is visible.

## Design

`check-source-archive.mjs` has a pure core and a thin CLI:

- `archiveTar(repo, ref)` runs `git archive --format=tar --prefix=pharn-oss-<full sha>/ <ref>` (argv array, no shell)
  and returns the bytes. The prefix models codeload's root for `tar.gz/<sha>` — the longest root the CLI meets, and
  the one `release.yml`'s tags resolve to. git archive honours `export-ignore` from the archived tree's
  `.gitattributes`, as codeload does.
- `checkArchive(tarBytes, limits = CLI_LIMITS)` returns `{ ok, entries, findings[] }`. It walks the tar exactly as
  `extractTar` does (512-byte blocks, checksum signed/unsigned, `ustar` magic, octal size, `g` skipped and counted,
  strict UTF-8 path fields, `prefix/name` rebuilt, unsafe-character set, type allowlist `0`/NUL/`5`, the path rules,
  one root, strip-1, the entry cap counted as the CLI counts it). Where the CLI throws on the first refusal, the
  checker records a finding `{ rule, entry, detail }` and goes on to the next header, so every offending entry is
  named; a framing failure (checksum, magic, non-octal size, truncation) stops the walk, because nothing after it can
  be located. A pax `x` header is reported under the path its `path=` record holds (for display only, escaped), and
  the header after it is not re-judged by the path rules, since the CLI never reaches it.
- The compressed size is `gzipSync(tar).length` against 32 MiB (`MAX_ARCHIVE_BYTES`), the decompressed size is the tar
  length against 128 MiB (`MAX_EXTRACTED_BYTES`), entries against 20,000 (`MAX_ENTRIES`).
- CLI: `node .dev/floor/check-source-archive.mjs [--ref <rev>] [repo-dir]`, default `HEAD` and `.`. Exit 0 GREEN
  (prints the entry count and both sizes), 1 RED (one line per finding: rule id, entry, detail), 2 unusable input (not
  a git repo, an unresolvable ref, a failed `git archive`). Runtime floor import first and `import.meta.main`, like
  every gated CLI (`entry-point-guard.test.mjs` sweeps it).
- Closed rule-id set (the enum a test pins against the CLI's refusals): `UNSUPPORTED_TYPE`, `PAX_EXTENDED_HEADER`,
  `INVALID_UTF8`, `UNSAFE_CHAR`, `EMPTY_PATH`, `ABSOLUTE_PATH`, `BACKSLASH_OR_COLON`, `DOTDOT`, `NO_ROOT`,
  `SECOND_ROOT`, `EMPTY_SEGMENT`, `NOTHING_BELOW_ROOT`, `TOO_MANY_ENTRIES`, `TOO_LARGE_COMPRESSED`,
  `TOO_LARGE_EXTRACTED`, `BAD_CHECKSUM`, `BAD_MAGIC`, `NON_OCTAL`, `TRUNCATED`, `NO_END_MARKER`, `DATA_AFTER_END`.

## Files

- `.dev/floor/check-source-archive.mjs` — the checker (core + CLI) — build apparatus
- `.dev/floor/check-source-archive.test.mjs` — its tests: the enumerated refusal table over hand-built tars, real
  `git archive` fixtures in temp repos (a symlink and a `:` name added with `git update-index --cacheinfo`, a path too
  long for ustar so git writes a pax `x` header), a hard link (hand-built — git never writes one), an over-limit archive
  (small injected limits, plus the real defaults pinned), GREEN on a clean temp repo and on this repo's HEAD, and the
  `package.json` + `ci.yml` wiring pins — build apparatus
- `package.json` — `check:archive` script, added to `check` before `test` — repo-meta
- `CONTRIBUTING.md` — name `check:archive` in "Run the gates before you push" (`check:contributing` requires it) —
  repo-meta
- `CLAUDE.md` — add `check:archive` to the `npm run check` chain list under "Commands" — repo-meta
- `.dev/guides/floor-checks.md` — a `## check-source-archive.mjs` section with usage, rule set and bounds — apparatus
- `CHANGELOG.md` — one dated `[Unreleased]` entry — repo-meta
- `docs/install-manifest.md` — after CORE-382 merges: flip its `## The source-archive contract` label from advisory to
  floor and cite the check (only that section; CORE-382 writes it) — repo-meta
- `.dev/features/core-383-archive-check/ARCHIVE-RUNS.md` — the recorded runs: RED on `v7.25.5`, GREEN on `v7.25.2` and on
  HEAD after CORE-381 — dev artifact

### Applied by a human patch, not written by the build

`.github/workflows/ci.yml` — a "Source-archive check" step (`run: npm run check:archive`, the install-gated `if:` of its
siblings) in the `check` job, before "Test". Delivered as
`patch-CORE-383-1.py` in the batch scratchpad right after GATE 1; applied and committed alone before build Step 0 (L68).

## Contracts satisfied

- None in `pharn-contracts` — apparatus. The behaviour it mirrors is pharn-cli's `src/lib/tar-extract.ts` and
  `src/lib/repo.ts` at 51a96d29, cited in the checker header, not restated as a contract.
- `docs/install-manifest.md` `## The source-archive contract` (CORE-382) gains its floor citation.

## Evals to write (P1)

No Capability is added, so no `evals/`. The checker's tests are its specification:

- each rule id → one hand-built tar that triggers it → RED with that rule and the entry named
- symlink (git, mode 120000) → `UNSUPPORTED_TYPE` naming `.claude/skills/x`-style entry
- hard link (hand-built `1`) → `UNSUPPORTED_TYPE` naming it
- long path segment (git, > 100-char leaf) → `PAX_EXTENDED_HEADER` naming the real path
- `a:b` (git) → `BACKSLASH_OR_COLON` naming it
- over-limit (entries, compressed, extracted, with injected small limits) → the matching `TOO_*` rule
- several offending entries in one archive → one finding each (not first-only)
- clean temp repo and this repo's HEAD → GREEN with a non-zero entry count
- negative controls: each fixture builder's clean twin is GREEN, so a RED comes from the planted entry

## Guarantee audit (P0)

- "a commit whose archive breaks one of the extractor's rules fails `check:archive`" → floor: enum-regex over the
  `git archive` bytes (type-flag membership, path regexes, integer compares).
- "CI fails such a commit, so `release.yml` does not tag it" → advisory at this repo's floor; the step's presence and
  its `if:` are pinned by a test (enum-regex over `ci.yml`), but that GitHub runs the job and that the `check` job stays
  a required check `release.yml` waits for are harness-layer facts (`pharn/LIMITS.md §11`).
- "the rules match pharn-cli's" → advisory: a hand port of `tar-extract.ts` at 51a96d29; it drifts if the CLI changes
  its rules. CORE-384 (later) runs the real CLI in CI. Stated in the header and the guide.
- "whole-archive rule" → kept on purpose: pharn-cli CORE-386 will narrow the CLI to manifest-listed paths, but
  `MIN_CLI` (0.14.0) admits CLIs that judge every entry, so every entry still binds. Stated in a header comment.
- "the compressed size is under the CLI's cap" → advisory as a size: Node's `gzipSync` (zlib default level), not
  codeload's compressor, so the byte count is an estimate of codeload's; the decompressed size and the entry count are
  exact for the bytes git archive writes.
- "codeload serves what `git archive` writes" → advisory: GitHub does not publish codeload's implementation; the model
  (git archive, `pharn-oss-<sha>/` root, `export-ignore` honoured) is stated as a model.
- It judges the committed tree at the ref (`HEAD` by default), never the working tree; an uncommitted symlink is not
  seen until committed. On a pull request, CI's `HEAD` is GitHub's test merge commit.
- `--ref main` channel: a merge reaches pharn-cli's `main` channel before its checks finish, and an owner bypass merge
  skips them (`pharn/LIMITS.md §11`); this check protects the release channel only.

## Trust audit (P2)

- Input: the bytes of this repo's own committed tree, through git. Entry paths are quoted into findings through one
  total escaping function (L62), so a control or format character in a path never reaches the terminal raw. No
  free text drives a verdict: every verdict is a type-flag, regex or integer test.

## Determinism audit (P5)

- Every branch is a membership test (type flag in a set, a character class, an integer compare). No fallback guesses:
  an unusable input exits 2.

## Run order and coordination (orchestrator)

1. GATE 1 (this halt).
2. Write `patch-CORE-383-1.py` (ci.yml step), dry-run it on a scratch copy, STOP and report both shas.
3. After the orchestrator applies it: commit `ci.yml` alone, then `/pharn-dev-grill`, then `/pharn-dev-build` Step 0
   (setter, then anchor).
4. Build. The "GREEN on this repo's HEAD" test is RED until CORE-381 is on this branch, so before `/pharn-dev-regress`
   merge `origin/main` once the orchestrator says CORE-381 merged (keep the anchor, L85). The `docs/install-manifest.md`
   flip waits for CORE-382 the same way.
5. regress → verify → review → GATE 2; open the PR (draft earlier is fine).

## Open questions (HALT)

- None blocking. The orchestrator decides at GATE 1: (a) the ci.yml patch is sequenced before build Step 0 (L68)
  rather than during build as the brief allows — chosen so reconcile never sees a human write; (b) the codeload root is
  modeled as `pharn-oss-<full sha>/`, the longest root, rather than `pharn-oss-<branch>/`.
