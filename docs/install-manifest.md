# The install manifest (`pharn-install.json`)

`pharn-install.json`, at the root of this repository, declares what a PHARN install receives: every installable file
with its destination, copy policy and SHA-256, the capabilities a project can select, the `models` defaults and the
rules that check them, the layout, and the project paths an install may write. It is written by
[`.dev/floor/gen-install-manifest.mjs`](../.dev/floor/gen-install-manifest.mjs) (`npm run docs:generate`) from the rules
declared in [`.dev/floor/install-manifest-core.mjs`](../.dev/floor/install-manifest-core.mjs), and
[`.dev/floor/check-install-manifest.mjs`](../.dev/floor/check-install-manifest.mjs) (`npm run docs:check`, the CI step
"Docs drift check") fails every pull request whose committed file differs from a fresh generation.

It exists for the installer, [pharn-cli](https://github.com/pharn-dev/pharn-cli) (`npx @pharn-dev/pharn`), so the CLI
can copy what this repository declares instead of re-deriving it. The decision record is
[`.dev/features/install-manifest/RFC.md`](../.dev/features/install-manifest/RFC.md). First shipped in `SKILLS_VERSION`
7.21.0; a tree older than that has no manifest, and the CLI falls back to its own derivation for it.

## Where it comes from (provenance and trust)

- It ships **inside the source tarball only** — the same codeload tarball the CLI already downloads, resolved by the
  same release-tag (or `--ref`) resolution. There is no release asset and no second download, so there is no second
  trust question: the manifest is exactly as trustworthy as the rest of the tree it arrives in.
- It is **data, never executed**. A consumer parses it as JSON and validates every field before use. Treat it as
  untrusted input, like every other byte of the tarball.
- The `sha256` values let a consumer verify, after extraction, that each file it copies is the file the manifest
  describes. They do not authenticate the tarball: whoever can change the tarball can change the manifest with it.

## The source-archive contract

The manifest's rules cover the installable paths. pharn-cli judges **every entry of the tarball**, before it reads the
manifest, and refuses the whole download on the first entry that breaks a rule. So one bad path anywhere in the tree
(a contributor skill under `.claude/skills/`, a fixture under `.dev/`) blocks every `pharn init` and `pharn update` of
that commit. That is why 7.25.3 to 7.25.5 cannot be installed: they carry git symlinks under `.claude/skills/` (one in
7.25.3, seven from 7.25.4), and the CLI refuses the archive on the first one (CORE-380).

**Who owns it.** The rule is pharn-cli's. Its extractor,
[`src/lib/tar-extract.ts`](https://github.com/pharn-dev/pharn-cli/blob/main/src/lib/tar-extract.ts), with the limits in
[`src/lib/repo.ts`](https://github.com/pharn-dev/pharn-cli/blob/main/src/lib/repo.ts), decides; this section restates
it rule for rule, as of pharn-cli's `main` at commit `51a96d29` (2026-11-25). Keeping every installable commit inside it is this
repository's job: every merge to `main` (the CLI's `main` channel installs it) and every release tag. Where this
section and the extractor disagree, the extractor is what users meet, so correct the section.

**Floor or advisory (P0).** On this side it is **advisory**: nothing in this repository checks it today, not
`npm run check`, not CI, not `pharn/floor/validate.mjs`. The one enforcement is pharn-cli's refusal at install time,
which fails closed (a tree that breaks the rule is not installed at all, never partly). **Planned** (CORE-383): a
dev-floor check over `git archive HEAD` that makes the rule floor here. This section will name its script when it
ships.

Every entry of the archive must satisfy all of these:

1. **Type.** A regular file (ustar typeflag `0` or NUL) or a directory (`5`). Everything else is refused: a symbolic
   link (`2`), a hard link (`1`), a character or block device (`3`, `4`), a FIFO (`6`), typeflag `7`, a pax extended
   header (`x`), a GNU long name or long link (`L`, `K`), and any unknown typeflag. The one exception is a pax
   global header (`g`), which `git archive` writes first: it is skipped unread, and still counts toward the entry
   limit. In git terms: commit no symbolic link (mode `120000`).
2. **The path fits ustar.** Only the ustar `name` (100 bytes) and `prefix` (155 bytes) fields are read; a pax record is
   never honoured. A path that does not fit is written by `git archive` into a pax `x` header, which rule 1 refuses.
   `git archive` splits a path at one `/`, leaving at most 154 bytes before it and at most 100 after it, the archive's
   top directory included (measured with git 2.50.1). So a file name over 100 bytes, a directory name over 99 (a
   directory's entry carries a trailing `/`), or a path over 255 bytes counting the top directory cannot fit.
3. **Characters.** The path (`prefix`, `/`, `name`) decodes as strict UTF-8 (invalid bytes are refused, never
   replaced) and holds no character of pharn-cli's unsafe set (`src/lib/terminal-safe.ts`): no C0 or C1 control
   (U+0000 to U+001F, U+007F to U+009F), no U+2028 or U+2029, and no Unicode format character (`\p{Cf}`: bidi
   overrides, zero-width characters, a byte-order mark). It also holds no backslash (`\`) and no colon (`:`).
4. **Shape.** The path is not empty and not absolute (no leading `/`), and no segment is `..`. Its first segment is
   the archive's one top directory: the same for every entry and neither empty nor `.`, and an entry naming the top
   directory alone must be a directory. Below it, no segment is empty (`a//b`) or `.`; a trailing `/` is accepted. The extractor strips
   the top directory and writes each entry through `safeJoin` (`src/lib/validate.ts`), a lexical containment
   backstop behind these rules.
5. **Size.** At most 32 MiB (33,554,432 bytes) as downloaded, which is compressed; at most 128 MiB (134,217,728
   bytes) once decompressed, which is the whole tar stream, headers and padding included; and at most 20,000 entries,
   counting every pax global header and every entry below the top directory (the top directory's own entry is not
   counted). These are `MAX_ARCHIVE_BYTES`, `MAX_EXTRACTED_BYTES` and `MAX_ENTRIES` in `src/lib/repo.ts`.
6. **A well-formed stream.** The gzip decompresses; every header passes its checksum and carries the `ustar` magic;
   its numeric fields are octal (GNU base-256 is refused); no entry runs past the end of the archive; and the archive
   ends with a zero block followed by nothing but zero bytes. `git archive` output meets this by construction; it is
   listed so the restatement is complete.

After extraction the CLI refuses the download on more than the archive's shape: a release whose `SKILLS_VERSION`
differs from its tag, a missing or invalid `pharn-install.json`, and a listed file whose `sha256` does not match (the
sections above). Those are the manifest's rules, not this one.

**Planned narrowing** (pharn-cli CORE-386, not released): pharn-cli is changing to unpack only the paths the manifest
lists, which narrows this rule to the installable paths (already held by the generator, below) plus the download
limits. A pharn-cli release without that change keeps the whole-archive rule above, so this section is updated when
it ships and states which CLI versions it covers.

## Top level

| Field           | Type    | Meaning                                                                                                    |
| --------------- | ------- | ---------------------------------------------------------------------------------------------------------- |
| `$comment`      | string  | A generated-file notice. Not data; ignore it.                                                              |
| `schemaVersion` | integer | `1`. A breaking change to this document's shape bumps it; new optional keys may be added within version 1. |
| `skillsVersion` | string  | The tree's `SKILLS_VERSION`, `X.Y.Z`. The drift check fails when the two differ.                           |
| `layout`        | object  | The tree's layout (below).                                                                                 |
| `capabilities`  | array   | The selectable capabilities (below).                                                                       |
| `files`         | array   | Every installable file (below).                                                                            |
| `models`        | object  | The `models` defaults and the rules that check a `models` block (below).                                   |
| `installRoots`  | object  | The project paths an install may write, and those older trees wrote (below).                               |

The minimum installer version is **not** in the manifest: the root file `MIN_CLI` stays its one source.

## `layout`

| Field                | Type   | Meaning                                                                                          |
| -------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| `name`               | string | `"pharn"`: every surface under `pharn/`, plus the `.claude/` surfaces. The only layout declared. |
| `marker`             | string | `"pharn/pharn-contracts"`, the directory whose presence identifies this layout.                  |
| `capabilitySubtrees` | object | `{"griller": "pharn/pharn-pipeline/grillers", "lens": "pharn/pharn-review"}`.                    |

Every `dest` in `files` is a destination at this layout. The older `flat` layout (every surface at the project root,
this repository before 2026-07-10) has no manifest; it appears only in `installRoots.legacy`.

## `capabilities`

One entry per selectable capability, sorted grillers first, then lenses, each group by name:

| Field     | Type            | Meaning                                                                                                                                        |
| --------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`    | string          | The capability's directory name, unique across both roles.                                                                                     |
| `role`    | string          | `"griller"` or `"lens"`.                                                                                                                       |
| `applies` | string or array | The string `"universal"` (every archetype), or an array of archetypes from `ssr`, `backend`, `spa`, `lib`, in the order the frontmatter lists. |
| `dir`     | string          | The capability's directory, one level below its role's subtree. Every file under it is in `files` with `"capability": <name>`.                 |

`applies` is the capability frontmatter's `applies:` value: `["universal"]` is written as the string `"universal"`, any
other list as the array. The archetype enum is the one `pharn/floor/validate.mjs` enforces (CHECK 4b, which also admits
`universal`); the generator refuses `universal` beside another token, an empty list and a non-string token, and does not
re-check archetype membership. The `pharn-core` skills (`role: skill`) are not selectable: their files are the `core`
surface.

## `files`

One entry per installable file, sorted by `path` (code-unit order), written one entry per line:

| Field        | Type   | Meaning                                                                                                  |
| ------------ | ------ | -------------------------------------------------------------------------------------------------------- |
| `path`       | string | The file's path in the tree (the tarball, below its top directory).                                      |
| `dest`       | string | Where an install writes it, relative to the project root. Equal to `path` except for `LICENSE`.          |
| `surface`    | string | One of the surfaces below.                                                                               |
| `capability` | string | Present only on `capability` files: the owning capability's `name`. Absent on every fixed-surface file.  |
| `policy`     | string | `"managed"` or `"if-absent"` (below).                                                                    |
| `sha256`     | string | The SHA-256 of the file's **raw bytes**, 64 lowercase hex characters. No line-ending folding is applied. |

Surfaces, in the order a path is matched against them (a test file, `**/*.test.*`, is never installable):

| `surface`         | Paths                                                                                        | Notes                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `capability`      | every file under a `capabilities[].dir`                                                      | installed only when the capability is selected                         |
| `commands`        | `.claude/commands/pharn-*.md`, not `pharn-dev-*`                                             | the product commands and their part files                              |
| `agents`          | `.claude/agents/pharn-*.md`, not `pharn-dev-*`                                               | subagent definitions                                                   |
| `hooks`           | `.claude/hooks/*.cjs`                                                                        | the write-guard hooks                                                  |
| `settings`        | `.claude/settings.json`                                                                      | policy `if-absent`                                                     |
| `trusted-doc`     | `pharn/CONSTITUTION.md`, `pharn/ARCHITECTURE.md`, `pharn/THREAT-MODEL.md`, `pharn/LIMITS.md` |                                                                        |
| `license`         | `LICENSE`                                                                                    | `dest` is `pharn/LICENSE`, so the project's own `LICENSE` is untouched |
| `features-readme` | `pharn/features/README.md`                                                                   | the product pipeline's boundary contract                               |
| `contracts`       | `pharn/pharn-contracts/**`                                                                   |                                                                        |
| `core`            | `pharn/pharn-core/**`                                                                        |                                                                        |
| `floor`           | `pharn/floor/**`, not `pharn/floor/test-fixtures/**`                                         | the product floor's checkers                                           |

Policies:

- `managed` — written, recorded, and later replaced or removed only while the project's copy still equals what the
  installer recorded.
- `if-absent` — written only when the project has no such file, and never replaced. `.claude/settings.json` is the one
  such file: a project's existing settings are its own.

## `models`

| Field      | Type   | Meaning                                                                                                    |
| ---------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| `defaults` | object | This repository's root `pharn.config.json` `models` block, verbatim: the block an install starts from.     |
| `rules`    | object | The rules `pharn/floor/check-model-config.mjs` applies to a `models.stages` block, taken from its exports. |

`rules`:

| Field            | Type             | Meaning                                                                                 |
| ---------------- | ---------------- | --------------------------------------------------------------------------------------- |
| `fallbackStage`  | string           | `"default"`: the required entry a stage without its own entry resolves through.         |
| `stages`         | array of strings | The product stage keys a `models.stages` entry may use besides `fallbackStage`.         |
| `aliases`        | array of strings | The model aliases accepted as a `model` value.                                          |
| `modelIdPattern` | string           | A JavaScript regular-expression source; a `model` value matching it is a full model id. |
| `effortLevels`   | array of strings | The accepted `effort` values.                                                           |

A `models.stages` block is valid when it has a `fallbackStage` entry, every key is `fallbackStage` or in `stages`, and
every entry is an object whose `model` is in `aliases` or matches `modelIdPattern` and whose `effort` is in
`effortLevels`. These are the checker's own bindings, so they cannot drift from what the checker enforces.

## `installRoots`

Globs over project-relative paths: `*` matches within one path segment, `**` matches any number of segments (zero
included); an exclude wins over an include. This is the grammar of `.dev/floor/check-surface-bump.mjs`'s `matchesGlob`.

| Field     | Meaning                                                                                                                                                                                                                           |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `include` | The paths an install of this tree may write (every `dest` matches one).                                                                                                                                                           |
| `exclude` | Paths inside `include` that are never written (tests, dev commands and agents, floor test fixtures).                                                                                                                              |
| `legacy`  | Paths older trees installed and this one never writes: the flat layout's surfaces, which also cover the root `THREAT-MODEL.md`/`LIMITS.md` of a pharn-layout install before 7.0.0 and the root `features/README.md` before 5.0.0. |

They let an installer bound the record keys of an older install (what it may treat as its own when it finds orphans,
uninstalls, or writes ignore entries). `legacy` is declared history, not derived from the tree.

## What the generator guarantees, and what a consumer must still check

The generator refuses to write a manifest that breaks any of these, and the drift check keeps the committed file equal
to the generator's output:

- every `path` and `dest` is relative, `/`-separated, with no empty, `.` or `..` segment and no backslash, and every
  segment uses only `A-Z a-z 0-9 . _ -`; no `dest` segment below its first starts with `.` (pharn-cli's own path rules);
- every installable path is a regular file (a symlink, a directory or a submodule is refused, never followed); the
  rest of the tree is not checked here, though pharn-cli holds every entry to
  [the source-archive contract](#the-source-archive-contract);
- `files` is sorted by `path`; every `dest` is unique; `sha256` is 64 lowercase hex characters;
- every `capability` names an entry of `capabilities`, and its file lies under that entry's `dir`;
- every fixed surface and both capability roles contribute at least one entry;
- `skillsVersion` equals `SKILLS_VERSION`.

**A consumer must re-validate all of it anyway**: the manifest is untrusted data that arrives with the tarball. At
minimum, pharn-cli (CORE-194) checks the schema and `schemaVersion`, contains every `path` and `dest` with its own path
guard, holds `name`, `role` and `applies` to its own allowlists, checks the `sha256` of every file after extraction
(refusing the install on a mismatch, before writing anything), and validates the `models.defaults` block against
`models.rules` before writing it.

## What the drift check does not prove

- **That the manifest is right.** Byte equality proves the committed file equals what the rules compute from the tree.
  A wrong rule regenerates cleanly and stays green. Two tests tie the rules to referents instead: every bump-triggering
  product path (`check-surface-bump.mjs` `PRODUCT_SURFACE`) is declared, and the installable paths outside that set are
  exactly `LICENSE`, `pharn/features/README.md` and `pharn/floor/README.md`.
- **That the tarball carries these bytes.** True while `.gitattributes` keeps the tree LF (`* text=auto eol=lf`) and
  declares no `export-ignore`; nothing checks either. The consumer's sha256 verification is the check.
- **Anything about a local, uncommitted tree.** The file list is git's (tracked plus untracked files that are not
  ignored), so a local untracked file under a surface appears in a local generation until it is ignored or removed.
