# PLAN — family-grammar-crlf

- spec_content_hash: d5a974303fd0b9568945c60423ae5a89c57d7b65f5baa03657e317fbe64f33a5
- applied_lessons: [L29, L34, L35, L36, L37, L59, L60, L77]
- increment: one shared loose-frontmatter reader in frontmatter-core.mjs for the seven copies of validate.mjs's family grammar (CRLF-tolerant, a displaced fence REDs in validate), symlinked directories never descended by the capability walks (a RED in validate under pharn/), validate INCONCLUSIVE over zero capabilities, CHECK 8 no longer skips an unreadable file, and validate's exits moved off `process.exit()` (FLUSH_CLIS).
- layer(s): product floor (pharn/floor) + dev floor (.dev/floor) + tests
- constitution_refs: [P0, P1, P4, P5, P6, P7]

Batch 2026-11-03, group G4 (`fix/family-grammar-crlf`, from `origin/batch/audit-2026-11-03`). No SKILLS_VERSION bump
on this branch (the orchestrator bumps once to 7.3.0); prose citing the version a behaviour lands in says `7.3.0`.

## The defects, re-measured this run (P6)

Probe: a copy of this worktree's `pharn/` in a non-git scratch dir, one lens mutated (scratchpad `g4/probe.mjs`):

| mutation of `pharn-review/trust-fence/trust-fence.md`           | validate.mjs                     | count-lenses |
| --------------------------------------------------------------- | -------------------------------- | ------------ |
| none                                                            | `GREEN — 37`, exit 0             | 22           |
| CRLF                                                            | `GREEN — 36`, exit 0             | 21           |
| a leading `\n`                                                  | `GREEN — 36`, exit 0             | 21           |
| a leading U+200B                                                | `GREEN — 36`, exit 0             | 21           |
| `pharn-review/evil2` → an outside dir holding a `role: lens` md | `RED — 3 finding(s), 38`, exit 1 | 23           |

- **HIGH, family grammar.** Cause confirmed by reading: `raw.split("\n")` leaves a `\r` on every line but the last
  (the block is `trim()`med), and `(.*)$` cannot consume `\r`, so only a LAST-line `role:` survives CRLF. The
  existing "CRLF frontmatter registers" tests in count-lenses/-grillers/-verifiers pass by coincidence: their
  fixtures put `role:` last. The seven copies are as the report lists (validate.mjs:181, count-lenses.mjs:75,
  count-grillers.mjs:77, count-verifiers.mjs:74, check-model-config.mjs:246, .dev/floor/check-config.mjs:158,
  .dev/floor/capability-catalog-core.mjs:84). `griller-extract.mjs:131` `frontmatterKind` also tests the loose fence,
  but its `kind:` reader is already CRLF-tolerant (`[ \t\r]*$`) and a displaced fence reads `kind-missing` there
  (not admitted as pharn-owned, the fail-safe side), so it is left as is and allowlisted, with that reason, in the
  new closure below.
- **MEDIUM, symlinks.** `capability-files-core.mjs` `walkMarkdown` and validate.mjs's `canonDirs()` / `walkExts()`
  use `statSync`, so a link to a directory is descended. The header's bound (line 28, "A symlinked DIRECTORY inside
  the work tree is not descended") is false for the `pharn/` union walk, which every git-mode run adds.
- **LOW, overflow.** (a) validate.mjs:665 prints GREEN over 0 capabilities on a tree whose `pharn/pharn-*` holds only
  garbage. (b) validate.mjs:641 (CHECK 8's read) skips an unreadable file silently. **Correction to the report:** an
  unreadable `.md` capability does not reach :641 silently — the capability loop's unguarded `readFileSync` (:303)
  throws first and prints `INCONCLUSIVE — crashed (EACCES)` (TST-10, pinned by validate.test.mjs:1004). What :641
  silently skips is an unreadable `.json` (an eval judge) or an `.md` outside the capability list. (c) validate.mjs
  ends through `process.exit()` after its prints (:46, :84, :666, :675) and is not in `cli-stdout-flush.test.mjs`'s
  FLUSH_CLIS. merge-findings.mjs:596 (same overflow line) is not in G4's assignment and is left alone.

## Approach

1. **One reader (L35, L77).** `frontmatter-core.mjs` gains the loose family's single definition:
   `LOOSE_FIELD_LINE_RE` (`/^([A-Za-z0-9_]+):\s*(.*)$/`, the grammar unchanged), `looseFrontmatter(text)` →
   `null | { entries, body, displaced }` (one BOM stripped, the same `startsWith("---")` / `indexOf("\n---", 3)` /
   `slice(3, end).trim()` fence, lines split on `/\r?\n/`, read through `fieldEntries`), `looseScalar(raw)` (trim +
   one quote strip) and `looseValue(raw)` (validate's `[a, b]` array rule, else `looseScalar`). `displaced` is true
   when the text does not open with `---` but does after a run of whitespace / format characters
   (`/^[\s\p{Cf}]+(?=---)/u` — a newline, a space, U+200B, a second BOM). The seven copies are replaced by calls;
   `.dev` imports the product core (the allowed arrow, L77), as both dev files already do for `stripBom`.
2. **Who reads a displaced block.** validate.mjs, the three count-* walkers and the catalog read it (validate's
   count and the registry stay in agreement: 37 / 22 in the probe), and **validate REDs** each displaced file whose
   block carries `role:` — `P6/frontmatter-offset`, blocking, naming the file. check-model-config and check-config
   keep treating a displaced fence as no frontmatter (their subject is what Claude Code reads from a command file;
   making them read it would assert an agreement the platform may not see) — unchanged behaviour there.
3. **Symlinks (L59).** `walkMarkdown` classifies each entry with `lstatSync`: a link to a directory is not descended
   and is recorded; a link to a file is still listed (the header's stated bound); a dangling link is skipped as
   before. `listMarkdownFiles` returns `linkedDirs` (sorted, from the walks; git mode's own listing never descends
   a link), and a `pharn` root that is itself a link is recorded instead of walked. validate.mjs REDs each linked
   directory at or under `<target>/pharn/` outside its EXCLUDE_SEGMENTS — `P6/symlinked-dir`, blocking.
   `canonDirs()` and `walkExts()` use `lstatSync` and skip a link to a directory. The header's bound is rewritten
   to what the walk now does (L37: probed by the new tests, not read off the code).
4. **Zero capabilities (L34).** When `CANON_DIRS` is non-empty, no capability was found and nothing blocking was
   found, validate prints `FLOOR: INCONCLUSIVE — 0 capabilities found under pharn/pharn-* in "<target>"` and exits 2.
   A target with no `pharn/pharn-*` (the fixtures that build `pharn-review/` at the root) keeps `GREEN — 0`; a RED
   stays RED.
5. **CHECK 8's read.** The `try { readFileSync } catch { continue }` goes: an unreadable file under the canon
   scope throws, which the TST-10 handler turns into `INCONCLUSIVE — crashed (…)`, exit 2 — the same posture as the
   capability loop.
6. **Flush rule.** validate's exits become `process.exitCode = code; throw EMITTED;` with the existing
   `uncaughtException` handler returning on the sentinel (measured: a top-level ESM throw reaches the handler, the
   module stops, the process ends naturally with the set code, and 300,001 bytes reach a pipe whole). The handler
   prints its INCONCLUSIVE line with `process.stdout.write` and sets `exitCode = 2`. FLUSH_CLIS gains validate.mjs
   with a new form `sentinel-uncaught`; its crash row asserts the TST-10 contract (exit 2, one INCONCLUSIVE line)
   rather than the no-verdict one, and a ★ round-trip proves a >64 KiB RED report arrives whole.

## Applied lessons

- L29 — the loose family is materialised once (frontmatter-core.test.mjs `LOOSE_FAMILY_CLIS`), and the CRLF /
  displaced-fence twins iterate it, rather than one CRLF test per file written for whichever reader was in front.
- L34 — validate's zero-capability verdict over a non-empty `pharn/pharn-*` scope becomes INCONCLUSIVE; the
  "I expect nothing" case (no `pharn/pharn-*` at all) stays expressible as GREEN — 0.
- L35 — the seven hand copies are retired into one reader in the core, not bound by a sync test.
- L36 — closure, not presence: LINE_GRAMMAR_RE is widened to catch the family grammar too (no module but the core
  may carry it), and a new closure says no non-test floor module but the core (and griller-extract, allowlisted
  with its reason) tests the loose `startsWith("---")` fence, so an eighth copy fails a test.
- L37 — capability-files-core.mjs's header bound ("a symlinked DIRECTORY … is not descended") was false and is
  rewritten only after a test executes each link kind against the walk.
- L59 — `lstatSync` before a follow-call, and the walk's tests enumerate the path kinds: regular `.md`, link to an
  `.md`, link to a directory, dangling link, looping link.
- L60 — every ✧ test is a twin/mutant pair: the CRLF fixtures put `role:` on a NON-last line (the existing tests'
  last-line `role:` is exactly the alphabet that cannot fail), and each new assertion is shown to fail on the
  pre-fix code before it is kept.
- L77 — `.dev/floor/check-config.mjs` and `capability-catalog-core.mjs` import the product core; no product file
  imports `.dev/`.

## Files

- pharn/floor/frontmatter-core.mjs — LOOSE_FIELD_LINE_RE, looseFrontmatter, looseScalar, looseValue; header — product floor
- pharn/floor/validate.mjs — shared reader, P6/frontmatter-offset, P6/symlinked-dir, lstat in canonDirs/walkExts, CHECK 8 read, zero-capability INCONCLUSIVE, sentinel exits — product floor
- pharn/floor/count-lenses.mjs — frontmatterRole through looseFrontmatter — product floor
- pharn/floor/count-grillers.mjs — same — product floor
- pharn/floor/count-verifiers.mjs — same — product floor
- pharn/floor/check-model-config.mjs — frontmatterModelEffort through looseFrontmatter (displaced = none) — product floor
- pharn/floor/capability-files-core.mjs — lstat walk, linkedDirs, a linked pharn root, header bound — product floor
- .dev/floor/check-config.mjs — frontmatterModelEffort through the product core — dev floor
- .dev/floor/capability-catalog-core.mjs — parseFrontmatter through the product core — dev floor
- pharn/floor/frontmatter-core.test.mjs — loose reader units, LOOSE_FAMILY_CLIS twins, widened closures — test
- pharn/floor/validate.test.mjs — offset RED, symlinked-dir RED, zero-capability INCONCLUSIVE, CHECK 8 EACCES — test
- pharn/floor/capability-files-core.test.mjs — PATH_KINDS walk test, linkedDirs, linked pharn root — test
- pharn/floor/cli-stdout-flush.test.mjs — validate.mjs row, form sentinel-uncaught, >64 KiB round-trip — test
- pharn/floor/check-model-config.test.mjs — CRLF twin; a displaced command reads as no model — test
- .dev/floor/check-config.test.mjs — CRLF twin — test
- .dev/floor/capability-catalog-core.test.mjs — CRLF twin — test
- .dev/floor/frontmatter-readers.test.mjs — dev closures accept looseFrontmatter, catch the family grammar — test
- .dev/guides/floor-checks.md — validate's exit and walk lines — apparatus doc
- CHANGELOG.md — `## [Unreleased]` `### Fixed` entries — repo meta
- .dev/features/family-grammar-crlf/PLAN.md — this plan
- .dev/features/family-grammar-crlf/GRILL.md — grill log
- .dev/features/family-grammar-crlf/SHIP.md — ship roll-up

## Contracts satisfied

- `pharn/pharn-contracts/finding-shape.md` — the two new validate findings carry enum-gated `rule_id` / `severity` /
  `file` and a fixed free-text `problem` (no input text spliced in; the path is `relative()` as for every finding).
- `pharn/ARCHITECTURE.md §2` primitive #3 — every new verdict is a membership / regex / integer test.

## Evals to write (P1)

No capability is added or changed; the floor's own tests are the evals.

- looseFrontmatter → clean / CRLF (role not last) / BOM+CRLF / `----` fence / leading `\n` / space / U+200B /
  doubled BOM / no fence / unterminated → entries, `displaced`, null as expected.
- LOOSE_FAMILY_CLIS (validate, count-lenses, count-grillers, count-verifiers) → a CRLF capability with `role:` not
  last is counted as its LF twin; a displaced one is counted and validate REDs `P6/frontmatter-offset` (mutant: the
  pre-fix code gives 0 and GREEN).
- validate → a link to an outside dir under `pharn/pharn-review/` → count unchanged, RED `P6/symlinked-dir`; a
  garbage-only `pharn/pharn-review/` → exit 2 INCONCLUSIVE; the root-level `pharn-review/` fixtures → GREEN — 0
  unchanged; an unreadable `.json` under `pharn/pharn-review/` → exit 2 crashed.
- capability-files-core → PATH_KINDS (file, link→file, link→dir, dangling, loop) in walk and git modes.
- check-model-config / check-config → CRLF commands agree as their LF twins; catalog → a CRLF capability enumerates
  as its LF twin.
- cli-stdout-flush → validate's static pin, its crash row, a >64 KiB RED report through a pipe.

## Guarantee audit (P0)

- "a CRLF capability is counted and checked exactly as its LF twin" → floor: enum-regex (the one reader), pinned by
  the family twins — for the seven readers that call it; a future reader that copies a fence instead is caught only
  by the LEXICAL closure (named bound).
- "a displaced role-bearing fence REDs validate" → floor: enum-regex. Bound: only the leading characters
  `[\s\p{Cf}]` count as displacement; any other leading byte (a letter, an HTML comment) still makes the file "not a
  capability", silently, as before.
- "a symlinked directory is never descended by the capability walks" → floor: lstat type test. Bound: a link to an
  `.md` file is still read through the link; a `pharn/` RED covers only links at or under the target's `pharn/`;
  elsewhere a link is skipped silently (git mode already did); TARGET itself is followed (it is the operand).
- "validate never prints GREEN over an empty pharn/pharn-\* scope" → floor: integer test. Bound: a non-empty scope
  holding one valid capability next to garbage is still GREEN over the one.
- "validate's report reaches a pipe whole" → floor-adjacent: the static pin is a proxy; the round-trip
  discriminates only where pipes are asynchronous (darwin), as the test file's header states.
- The trusted docs: no sentence in the four names the walk's symlink handling, the zero-capability GREEN or the
  family grammar (`grep` this run), so no DOCS-PROPOSAL.md.

## Trust audit (P2)

- Capability files and links are untrusted input. The new findings render only enum-gated fields and a path from
  `relative()`; no frontmatter text or link target is echoed into a finding.

## Determinism audit (P5)

- Every branch is a membership/regex/type test (`startsWith`, the displaced-lead regex, `isSymbolicLink()`,
  `capabilities.length === 0`); the fallback for an unreadable file is the existing INCONCLUSIVE, never a guess.

## Open questions (HALT)

- Q1 (recommendation: as planned). A displaced fence: count it and RED (planned), or leave it uncounted and RED?
  Counting keeps validate's count equal to the registry's and runs every other check on the file.
- Q2 (recommendation: as planned). Symlinked directories outside `pharn/` in walk mode (no git): skip silently
  (planned — git mode already never descended them), or RED them too (a pnpm-style tree would RED)?
- Q3 (recommendation: as planned). A `pharn/` root that is itself a link: record and RED (planned, consistent
  "never descended"), or keep following it in git mode as today?
