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
- every installable path is a regular file (a symlink, a directory or a submodule is refused, never followed);
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

## The source-archive contract

**Status: advisory.** Nothing in this repository checks these rules yet. The floor check that will enforce them is
planned as `.dev/floor/check-source-archive.mjs`, run by `npm run check:archive` (CORE-383); until it lands, the
contract below is written down and nothing more (`pharn/CONSTITUTION.md` P0). The one part already on the floor is
narrower: the generator refuses an installable path that is not a regular file (above).

**What it covers: every entry of the archive, not only the installable paths.** pharn-cli downloads this repository
as one codeload tarball (`codeload.github.com/<owner>/<repo>/tar.gz/<sha>`, written by `git archive`) and unpacks the
**whole** archive into a temporary directory before it reads `pharn-install.json` or copies a single file. So every
tracked path counts, including those an install never receives: `.dev/**`, `.github/**`, `.claude/skills/**`, test
files, fixtures. One bad entry anywhere fails every `pharn init` and `pharn update` at that ref.

**Why this section exists.** Releases v7.25.3, v7.25.4 and v7.25.5 could not be installed: the tree tracked seven
git symlinks (mode `120000`) under `.claude/skills/`, a path no install copies, and the extractor refused the whole
archive on the first one (CORE-380). The manifest rules above passed, because they judge installable paths only.

**Who owns it.** pharn-cli owns the rules: they are its extractor, `src/lib/tar-extract.ts` (with the size and count
limits passed in by `src/lib/repo.ts`), read for this section at pharn-cli 0.21.5. This repository owns satisfying
them, on every commit a CLI may fetch. When the two disagree, the code wins and this section is wrong.

A later pharn-cli release narrows the extractor so that it judges only the entries an install needs (pharn-cli
CORE-386). That does not retire this contract: older CLIs stay in use, so the rules keep binding as long as
`MIN_CLI` admits any CLI version that judges every entry. Today `MIN_CLI` is `0.14.0`, and every release from it up to
0.21.5 does. Those older releases differ from 0.21.5 in detail, so this section tracks the newest extractor; the
refusals in rule 1 hold in all of them.

The rules, as pharn-cli 0.21.5 applies them. A break of any one refuses the whole archive, never just the entry:

1. **Entry type.** Every entry is a regular file (typeflag `0` or NUL) or a directory (`5`). The only other type
   tolerated is a pax global header (`g`), which is skipped unread; every `git archive` tarball opens with one.
   Refused: a pax extended header (`x`), a hard link (`1`), a symlink (`2`), a character or block device (`3`, `4`), a
   fifo (`6`), a contiguous file (`7`), a GNU long name or long link (`L`, `K`), and any other typeflag. So the tree
   tracks no symlink. A submodule (gitlink) is not a refused type, but it arrives as an empty directory and installs
   nothing.
2. **The path fits ustar.** pax records are never read, so a path must fit the ustar header: at most 100 bytes in
   the `name` field, or split at one `/` into a `prefix` of at most 155 bytes and a `name` of at most 100 bytes. The
   archive path includes its top directory, and the byte count is of the UTF-8 encoding. For a path that does not
   fit, `git archive` writes a pax `x` header, which rule 1 refuses: in practice, any path segment over 100 bytes, or
   a path too long to split that way.
3. **The path's characters.** `prefix` and `name` are each valid UTF-8 (an invalid byte is refused, never replaced).
   The joined path holds no control character (U+0000–U+001F, U+007F–U+009F), no Unicode format character (category
   `Cf`: bidi overrides, zero-width characters, a byte-order mark), no U+2028 or U+2029, and no backslash (`\`) or
   colon (`:`).
4. **The path's shape.** Not empty, not absolute (no leading `/`). After trailing slashes are dropped: no `..`
   segment anywhere; a first segment (the top directory) that is neither empty nor `.`; and no empty or `.` segment
   below it (`a//b`, `a/./b`).
5. **One root.** Every entry's first segment is the same. An entry with nothing below the top directory must be a
   directory (the top directory's own entry); a file there is refused.
6. **Counts and sizes.** At most 20,000 entries, counting every file and directory below the top directory and every
   pax global header (the top directory's own entry is not counted). At most 32 MiB (33,554,432 bytes) compressed, as
   downloaded. At most 128 MiB (134,217,728 bytes) unpacked, measured as the decompressed tar stream, headers and
   padding included.
7. **A well-formed tar stream.** Every header passes its checksum, carries the `ustar` magic and has octal numeric
   fields; no entry runs past the end of the stream; the stream ends with an end-of-archive block followed only by
   zero bytes. `git archive` output meets these on its own; they are listed so the set is complete.

The extractor never inspects contents: it writes each file's bytes as they are.
