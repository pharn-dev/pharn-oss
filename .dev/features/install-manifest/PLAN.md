# PLAN — pharn-oss declares its install manifest (`pharn-install.json`, Linear CORE-193, C8.1)

- spec_content_hash: f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d
- applied_lessons: [L1, L19, L29, L34, L35, L36, L41, L43, L59, L74]
- increment: Generate a committed, drift-checked `pharn-install.json` at the repo root from pharn-oss's own walkers
  and checkers — every installable file with its raw-byte sha256, surface, owning capability, destination and copy
  policy, the selectable capabilities, the `models` defaults and rules, the layout and the install-root globs — plus
  the RFC, the schema doc and a spike diff against pharn-cli's `installManifest`.
- layer(s): `.dev/floor/` (build apparatus: the declaration, generator, checker, tests); `pharn/floor/` (one product
  checker gains exports); repo meta (`pharn-install.json`, `package.json`, `.prettierignore`, `docs/`, CHANGELOG,
  CONTRIBUTING, the generated-docs guide). No capability layer is touched (`pharn/ARCHITECTURE.md §4`).
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]

## Why (P7 — a real failure)

pharn-cli derives the install from pharn-oss internals: a port of the frontmatter rules (`capability-index.ts` plus a
vendored `validate.mjs` and a differential test), a port of `check-model-config.mjs` (`model-config.ts` plus a parity
test), and a hand-held tree layout (`install-manifest.ts`, `install-surfaces.ts`, `layout.ts`). Each upstream change
needs a lockstep CLI release (pharn-cli 0.18.1: 833 lines for one new stage name, 1 of them in `src/`), and a closed
CLI surface list cannot see a surface pharn-oss adds (`.claude/agents/pharn-review-lens.md`, shipped 6.64.0, was not
installed until the CLI's C2.7). Owner decisions for the RFC are recorded in the ticket brief and copied into
`RFC.md` as decided (status "Accepted (owner delegated, 2026-11-16)").

## Discovery (measured in this worktree, P6)

- Spike prototype (scratch, not committed) over `git archive v7.19.0`: pharn-oss's rules select **614** files; the
  CLI's `collectExpectedInstallPaths` (pharn layout, all 35 capabilities) selects **613**; the only difference is
  `.claude/settings.json`, which the CLI copies outside its manifest under a copy-only-when-absent rule. Sources and
  destinations agree for every shared path, `LICENSE → pharn/LICENSE` included. Every bump-triggering
  `PRODUCT_SURFACE` path is selected; the selected paths outside `PRODUCT_SURFACE` are exactly `LICENSE`,
  `pharn/features/README.md` and `pharn/floor/README.md`.
- Layout: the CLI installs in the layout the CLONE has (`detectLayout`, marker `pharn/pharn-contracts`). Every pharn-oss
  release tag (v7.1.2 → v7.19.0) is the `pharn` layout; the flat layout ended at `b42684b5` (#86, 2026-07-10, SKILLS
  1.0.0). The CLI's flat layout over a current tree gives 48 paths that no CLI ever chooses (`.dev/floor/*`, the
  `.claude` surfaces, `PHARN-LICENSE`). Over the last flat tree (`b42684b5^`) it gives 443 paths.
- Capabilities: `enumerateCapabilities` (the catalog core, the same `role:` test as `validate.mjs`) finds 37: 13
  grillers, 22 lenses, 2 `pharn-core` skills. The CLI index finds the same 35 grillers + lenses.
- `pharn/floor/check-model-config.mjs` exports nothing and runs `process.exitCode = main();` at import, so the rules
  cannot be imported today (`route-token-core.test.mjs` reads its source for that reason). The flush test pins that
  line verbatim (`^process\.exitCode = main\(\);$`), and the alias parity test pins `^const MODEL_ALIASES = [`.
- `validate.mjs` exports nothing (a script); its walk lives in `capability-files-core.mjs` (`gitListing`).
- No RFC/design-doc directory exists; per-feature design records live in `.dev/features/<slug>/` (`DOCS-PROPOSAL.md`,
  `MIGRATION.md`, `MEASUREMENTS.md`). User/consumer docs live in `docs/`.
- `.gitattributes` is `* text=auto eol=lf` with no `export-ignore`, so the working tree, `git archive` and codeload
  carry the same LF bytes.

## Decisions (each one a GATE-1 item)

1. **One `dest` per file, at the tree's own layout (`pharn`)** — not a dest per layout. A manifest exists only in trees
   generated from now on, all `pharn` layout, and the CLI installs a clone in the clone's own layout, so a flat dest
   would describe an install no CLI can perform. The flat layout survives only as **legacy install roots** (below), so
   the CLI can still bound record keys of an older flat install until it retires flat (CLI v0.22.0, CORE-186).
2. **Models rules from the checker's own bindings.** `check-model-config.mjs` gains
   `export { PRODUCT_STAGES, MODEL_ALIASES, MODEL_ID_RE, EFFORT_ENUM };`, `import "./runtime-floor.mjs";` as its first
   import, and `if (!import.meta.main) return undefined;` as `main()`'s first line, so importing it runs nothing. Every
   pinned line stays byte-identical (`process.exitCode = main();`, `const MODEL_ALIASES = [`), no existing test is
   edited, and the CLI behaviour is unchanged. Alternative rejected: a new `model-config-rules.mjs` core, which would
   force edits to `route-token-core.test.mjs`'s source parity test.
3. **SKILLS_VERSION 7.19.0 → 7.20.0 (minor).** `pharn-install.json` itself is **outside** the bump-triggering set:
   CLAUDE.md "SKILLS_VERSION discipline" lists it concretely and a root installer-metadata file is not in it (like
   `SKILLS_VERSION` and `MIN_CLI`, it is read by the CLI and never copied into an install), so `check:surface-bump`
   would not RED on it. The bump is triggered by decision 2: `pharn/floor/*.mjs` is in the set, and "any change that
   alters product-surface bytes MUST bump". Minor, because the release newly ships an installer-facing declaration and
   a new export interface. Side effect wanted: the merge becomes release v7.20.0, the first release carrying the
   manifest the CLI develops against. `MIN_CLI` unchanged (an older CLI ignores the file).
4. **Where things live.** RFC: `.dev/features/install-manifest/RFC.md` (the per-feature design-record convention).
   Schema reference: `docs/install-manifest.md` (consumer-facing; linked from the RFC and from the manifest's own
   `"$schema"`-style note). Not `pharn/pharn-contracts/`: contracts install into users' projects and are read by
   PHARN's commands, and the manifest is read by the installer only.
5. **Wiring.** Generator joins `npm run docs:generate`, checker joins `npm run docs:check` — so the existing CI step
   "Docs drift check" (pinned by `lessons-index-core.test.mjs`) and `npm run check` run it on every PR with no
   `ci.yml` edit and no new CI-step contract.
6. **The file list comes from git** (`gitListing`: tracked plus untracked-not-ignored, the set the reconciler treats
   as the project's), falling back to a walk when git cannot answer, then filtered by the install declaration.

## Files

- `.dev/floor/install-manifest-core.mjs` — NEW, the ONE declaration and the pure-as-possible builder. Declares:
  `MANIFEST_PATH = "pharn-install.json"`, `SCHEMA_VERSION = 1`, `LAYOUT` (`name: "pharn"`, marker
  `pharn/pharn-contracts`, capability subtrees `griller → pharn/pharn-pipeline/grillers`, `lens → pharn/pharn-review`),
  `INSTALL_SURFACES` (closed, ordered: `commands` `.claude/commands/pharn-*.md` minus `pharn-dev-*`; `agents`
  `.claude/agents/pharn-*.md` minus `pharn-dev-*`; `hooks` `.claude/hooks/*.cjs`; `settings` `.claude/settings.json`
  policy `if-absent`; `trusted-doc` the four `pharn/*.md`; `license` `LICENSE` dest `pharn/LICENSE`; `features-readme`
  `pharn/features/README.md`; `contracts` `pharn/pharn-contracts/**`; `core` `pharn/pharn-core/**`; `floor`
  `pharn/floor/**` minus `pharn/floor/test-fixtures/**`), `GLOBAL_EXCLUDE` (`**/*.test.*`), the policy enum
  (`managed`, `if-absent`), `LEGACY_INSTALL_ROOTS` (the flat layout's roots and the pre-7.0 root docs, hand-declared
  history, `.claude/**` excluded because it is in the current roots). Builds: `capabilities` from
  `enumerateCapabilities` (griller/lens under their subtree; dir must be a direct child; role ≠ subtree role →
  refuse), `files` (each `{path, dest, surface, capability?, policy, sha256}`; sha256 over raw bytes; a capability
  dir's files are surface `capability`), `models` (`defaults` = root `pharn.config.json` `.models` verbatim; `rules` =
  the checker's exports plus `fallbackStage: "default"`), `installRoots` (`include`/`exclude` derived from the
  declaration, plus `legacy`). Refuses (throws, fail-closed): bad `SKILLS_VERSION` (`VERSION_RE`), an installable path
  that is not a regular file (`lstat`, L59), a surface or the capability set contributing zero entries (L34), a missing
  `models` block. Renders deterministic JSON (top level indented, one `files`/`capabilities` entry per line, trailing
  newline). Reuses `gitListing` (`pharn/floor/capability-files-core.mjs`), `enumerateCapabilities`
  (`capability-catalog-core.mjs`), `matchesGlob`/`VERSION_RE` (`check-surface-bump.mjs`). — dev apparatus
- `.dev/floor/gen-install-manifest.mjs` — NEW generator: writes `pharn-install.json` only on a byte change. — dev
  apparatus
- `.dev/floor/check-install-manifest.mjs` — NEW drift checker: `GREEN` / `RED` with `MISSING`, `DRIFT` or `ENUM_ERROR`
  findings, exit 0/1, a non-directory target RED, `FIX: npm run docs:generate` (`ENUM_ERROR` names the refusal instead,
  since regenerating cannot fix it). — dev apparatus
- `.dev/floor/install-manifest-core.test.mjs` — NEW. Over a complete scratch fixture (`PATH_KINDS`-style: regular,
  link to file, link to dir, dangling): every surface rule, per member of `INSTALL_SURFACES` (L29), with a negative
  control each (dev command, test file, test-fixtures file, a file outside every surface); LICENSE dest; settings
  policy; capability ownership; refusals (role/subtree mismatch, nested capability dir, symlink, empty surface, zero
  capabilities, bad SKILLS_VERSION, no models); raw-byte sha256 (a CRLF file hashes unfolded); determinism (two
  renders identical); the git listing excludes an ignored file. Against the REAL tree (L41): every
  `isProductSurface` path is in `files` (closure, L36), installable minus product surface is exactly `LICENSE`,
  `pharn/features/README.md` and `pharn/floor/README.md`, every `dest` matches `installRoots.include` and none matches
  `legacy`; `models.rules` deep-equals the checker's exports; the `default` literal is bound by spawning the checker on
  a config without `default`; importing `check-model-config.mjs` prints nothing and leaves `process.exitCode` unset.
  — dev apparatus
- `.dev/floor/gen-install-manifest.test.mjs` — NEW: writes, is idempotent (second run writes nothing), CLI exit 0. —
  dev apparatus
- `.dev/floor/check-install-manifest.test.mjs` — NEW: GREEN on a fresh generate; `MISSING`, `DRIFT` (one byte),
  `ENUM_ERROR` (a refusal) each RED with its own FIX text (L27-shaped per state); a non-directory target RED; the
  committed real `pharn-install.json` is GREEN; `package.json` wires the generator into `docs:generate` and the checker
  into `docs:check`. — dev apparatus
- `pharn/floor/check-model-config.mjs` — decision 2: runtime-floor import, export list, import guard in `main()`, a
  header note. No behaviour change. — product floor
- `pharn-install.json` — NEW, generated by `npm run docs:generate` (a Bash write, declared here, L19). — repo meta
- `package.json` — `docs:generate` / `docs:check` gain the two scripts. — repo meta
- `.prettierignore` — `pharn-install.json` (generated bytes, as `docs/capabilities/`). — repo meta
- `docs/install-manifest.md` — NEW schema reference: every field, its type and meaning, the policy enum, the glob
  grammar, the trust note, the bounds. — docs
- `.dev/features/install-manifest/RFC.md` — NEW RFC, "Accepted (owner delegated, 2026-11-16)", the six owner decisions
  as decided, the decisions above, alternatives rejected, migration (CORE-194), bounds. — dev record
- `.dev/features/install-manifest/SPIKE-DIFF.md` — NEW spike report: the harness source (run with `npx tsx` from a
  pharn-cli checkout, read-only), and per layout every path the CLI installs vs the manifest declares, each difference
  explained; plus capability-index and models parity. — dev record
- `CONTRIBUTING.md` — "Regenerate the derived docs before you push": the manifest regenerates with them; any change to
  an installed file (and every `SKILLS_VERSION` bump) changes it. — repo meta
- `.dev/guides/generated-docs.md` — a section: `docs:generate` also writes `pharn-install.json`, held by `docs:check`;
  what changes it; that an `ENUM_ERROR` from it names the refusal. (Revision after GATE 2, below: replaces a
  `CLAUDE.md` sentence.) — dev apparatus
- `CLAUDE.md` — returns to its `main` bytes (revision after GATE 2: the sentence an earlier build added moves to the
  generated-docs guide). — repo meta
- `SKILLS_VERSION` — 7.19.0 → 7.20.0 (decision 3). — repo meta
- `README.md` — the version badge (`check:badge`), and the `CURRENT-STATE` block only if `docs:generate` changes it. —
  repo meta
- `CHANGELOG.md` — `## [7.20.0] - 2026-11-16` above `[7.19.0]`; the `[Unreleased]` entry moves into it. — repo meta

### Not touched

The four trusted docs, `CODEOWNERS`, the hook control surface: no change needed (the manifest's trust story is the
CLI's to write in its THREAT-MODEL under CORE-194; pharn-oss's side is in the RFC and the schema doc). No `ci.yml`
change. `MIN_CLI` unchanged.

## Contracts satisfied

- None in `pharn/pharn-contracts/` (decision 4). The manifest's contract is `docs/install-manifest.md`; its byte
  equality with the tree is the checker's.

## Evals to write (P1)

- No capability changes, so no eval. The tests above are the checker's and generator's specification.

## Guarantee audit (P0)

- "The committed `pharn-install.json` equals what the generator computes from this tree" → floor: content-hash/byte
  equality (`check-install-manifest.mjs`, run by `docs:check` in CI on every PR).
- "Every bump-triggering product path is in the manifest" → floor: enum/set membership in a test over the real tree.
- "Test files and floor test fixtures are excluded" → floor: glob membership over the one declaration, tested per rule.
- "The manifest's model rules cannot diverge from the checker" → floor: they are the checker's own exported bindings
  (no copy), plus a deep-equality test.
- "The manifest is correct / complete for the CLI" → **advisory**. Byte equality is consistency, never correctness: a
  wrong rule regenerates cleanly and stays GREEN (L43). The spike diff is a one-time measurement, not a gate.
- "sha256 equals what the tarball carries" → advisory: true while `.gitattributes` normalizes to LF and declares no
  `export-ignore`; the CLI's verification after extraction (CORE-194) is the floor for it.

## Trust audit (P2)

- Inputs are this repo's own files (frontmatter, `pharn.config.json`, file bytes); the manifest is DATA the CLI must
  validate (CORE-194: schema, `safeJoin`, allowlists, sha256 after extraction) and never execute. Its provenance is the
  tarball's: the same release-tag resolution the CLI already uses; no second fetch path (no release asset).
- `applies`/`role` values are copied as parsed; `validate.mjs` (CI "Validate floor") holds them to their enums. The
  generator does not re-implement that check (P4); the CLI keeps its own allowlists.

## Determinism audit (P5)

- Every branch is glob membership, role equality, an lstat type test or a regex; ordering is code-unit sort by path
  (capabilities: role order, then name). No timestamps. Refusals are throws, surfaced as `ENUM_ERROR`, never a guess.

## Applied lessons

- L35 — the point of the increment: the CLI's copies of pharn-oss rules become a declaration pharn-oss emits, so CORE-194
  can retire the second copies instead of syncing them; `minCli` is left out because `MIN_CLI` is the one copy.
- L43 — byte equality certifies the manifest agrees with the tree, never that the rules are right; stated in the
  guarantee audit, the checker header and the RFC, and the product-surface closure test binds the rules to a referent.
- L36 — closure, not presence: the real-tree test requires every `PRODUCT_SURFACE` path to be in the manifest and names
  the complete set of installable non-surface paths, both ways.
- L29 — the surface rules are one enumeration (`INSTALL_SURFACES`) and the tests iterate it, one negative control per
  member.
- L34 — a surface or capability set contributing zero entries is a refusal, so a wrong target cannot produce a GREEN
  empty manifest.
- L59 — every installable path is classified with `lstat`; a symlink is refused rather than hashed through, and the
  fixture names the link kinds.
- L74 — the spike diff borrows nothing from pharn-oss on the CLI side: the CLI's own `collectExpectedInstallPaths`,
  `parseCapabilityIndex` and `model-config.ts` constants are the reference, run from the CLI checkout.
- L19 — the generator's Bash write of `pharn-install.json` is declared in `## Files`, not assumed covered by the hook.
- L1 — the meta-docs that state the generated-artifact set (`CONTRIBUTING.md`, the generated-docs guide) are in
  `## Files`.
- L41 — the binding tests run against the real tree and the real committed manifest, not only scratch fixtures.

## Risks

- Every future PR that changes an installed byte or bumps `SKILLS_VERSION` must regenerate (a `docs:check` RED says
  so). Same cost as the catalog.
- Another open PR that bumps `SKILLS_VERSION` would conflict; rebase and regenerate.
- `pharn/floor/README.md` ships but is outside `PRODUCT_SURFACE` (edits to it do not bump); recorded in the spike as an
  observation, not fixed here.

## Resolved at GATE 1 (orchestrator, owner-delegated, 2026-11-16)

- Decision 3: minor, 7.20.0. Decision 2: edit `check-model-config.mjs`; keep its pinned lines byte-identical, prove no
  side effect on import, keep its CLI behaviour and exit codes identical. Decision 1: one `dest` at the `pharn`
  layout, flat only as `installRoots.legacy`; the RFC states that a pre-manifest tree (any flat ref included) has no
  manifest and the CLI falls back to its own derivation for one minor (CORE-194).
- Extra requirement 1: `applies` uses the CLI's `CapabilityEntry` shape — the string `"universal"` or an array of
  archetypes (`ssr`, `backend`, `spa`, `lib`); the schema doc states the enum.
- Extra requirement 2: the schema doc separates what the generator refuses to break (relative paths, no `..`, sorted,
  unique `dest`, sha256 as 64 lowercase hex) from what the CLI must still check (all of it: the manifest is untrusted).
- Extra requirement 3: the SPIKE-DIFF harness stays runnable read-only against pharn-cli `main`.
- Folded from GRILL.md: the no-git fallback walks only the declared roots; `["universal"]` renders `"universal"`, and
  `universal` beside another token, an empty list or a non-string token is a refusal; a duplicate `dest` is a refusal.

No open questions remain.

## Revision after GATE 2 (2026-11-17)

The first pull-request run of pharn-ci warned `SETUP_STALE_SI02` on `CLAUDE.md`: three pre-existing lines name paths
absent from this repository (`pharn/spec-template.md` twice, `.github/actions`), and the check runs because the PR
edited `CLAUDE.md`. The one sentence this increment added there moves to `.dev/guides/generated-docs.md` (the guide
CLAUDE.md's index names for a `docs:check` RED), and `CLAUDE.md` returns to its `main` bytes. The build scope was
re-set from this plan and re-anchored before the edit; regress (head side) and verify were re-run on the edited tree.

## Renumbered after rebase (2026-11-17)

`origin/main` released 7.20.0 with #453 while this pull request was open, so this increment ships as **7.21.0**
(decision 3's rule and size unchanged: minor, `pharn/floor/check-model-config.mjs` is the bump-triggering path). Its
CHANGELOG section is a new `## [7.21.0] - 2026-11-17` holding only its own entry. The 7.20.0 figures above are the plan
as approved.
