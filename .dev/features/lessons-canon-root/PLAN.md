# PLAN — lessons-canon-root

- spec_content_hash: 2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e
- applied_lessons: [L1, L19, L22, L29, L31, L35, L36, L41, L72]
- increment: One implementation of the lessons grammar (audit ARCH-6, CTX-8). The four product floor CLIs —
  `lessons-index-core.mjs`, `check-lessons-index.mjs`, `gen-lessons-index.mjs`, `check-provenance.mjs` — take the
  canon root as a parameter (`--canon-root <dir>`, default `memory-bank`; plus `--strict-commit` on
  check-provenance), and the four `.dev/floor/` twins become thin wrappers that call them with the dev root
  (`.dev/memory-bank`) and the dev surface's committed-index / strict-commit settings. `/pharn-plan`'s COLD and
  STALE branches make index generation a mandatory step (generate, re-check, then select from the index and read
  only the candidates), with the one new pinned line granted in `/pharn-loop`'s `allowed-tools`.
- layer(s): product floor (`pharn/floor/`), product commands (`.claude/commands/pharn-plan.md`,
  `pharn-loop.md`), build apparatus (`.dev/floor/`, `.dev/guides/`, `pharn-dev-memory-promote.md`), repo meta
- constitution_refs: [P0, P3, P4, P5, P6, P7]

## Trigger (P7)

Audit 2026-10-12, both findings re-measured live at `6b49caf` (6.65.2):

- **ARCH-6.** The four pairs are still hand-maintained twins. `diff` of each pair, measured this run: the grammar
  CODE is identical, and the only behavioural differences are (a) the canon/out paths and generator names, (b) the
  dev core throws on an absent or empty canon where the product returns `no-canon`, (c) the rendered header prose
  (the product's cache paragraph and its benign reading of `-`), (d) the checker's verdict vocabulary
  (`MISSING/DRIFT` on a committed index vs `COLD/STALE` on a cache), and (e) check-provenance's `COMMIT_RE` (dev
  refuses `unknown`) and its two message strings. Everything else is copied text kept equal by ✧ tests. The
  product hard-codes the root (`lessons-index-core.mjs:66` `CANON_PATH`, `check-provenance.mjs:88`
  `TARGET_ENUM`); no `--canon-root` exists.
- **CTX-8.** `pharn-plan.md:79-81`: on `COLD`, "Read `memory-bank/lessons-learned.md` in full … You may optionally
  warm the cache first"; `STALE` also falls back to reading canon in full. Here canon is ~210 KB. Measured this run:
  `node pharn/floor/check-lessons-index.mjs . --verdict` in this repo prints `NO_CANON`, so this repo cannot run the
  product sweep's checker on its own canon.

## Applied lessons

- L35 — The question asked first is whether the second copy must exist. L35's own text says the pairs "cannot be
  merged because a user's install ships `pharn/floor/` without `.dev/`" — but that only forbids `pharn/` → `.dev/`
  imports. `.dev/` → `pharn/` is the allowed direction (every `.dev/floor/*.mjs` already imports
  `pharn/floor/runtime-floor.mjs`). So the grammar copy is retired, not synced: the dev files keep their paths
  (every caller and npm script keeps working) and hold only their profile.
- L31 — The obligation set of the old pair (each surface checks before selecting, each regenerates after promote)
  is unchanged and stays enumerated in `LESSONS_SWEEP_WIRING`; this increment adds a fifth member (pharn-plan
  regenerates on COLD/STALE) rather than writing a one-off assertion. The ✧ cross-copy text pins (shared
  constants, shared function bodies, the "must DIFFER" pins) are retired with the copy they guarded, and replaced
  by a thinness closure: a dev wrapper may not declare the grammar.
- L29 / L36 — The thinness pin is a closed set: every top-level `const`/`function` a dev wrapper declares must be
  in a short allowlist of profile names; anything else (a re-grown `HEADING_RE`, `TAG_RE`, `COMMIT_RE`,
  `parseLessons`, `cleanScalar` …) fails. Closure, not per-member presence.
- L41 — Every new parameter has a default, and the hermetic tests will pass `--canon-root` explicitly. So each
  CLI keeps (or gains) a no-flag test proving the default is still `memory-bank`, and the canon-root parser's
  default is a single exported constant used by all four CLIs.
- L22 — The new `/pharn-plan` step is a literal fenced line (`node pharn/floor/gen-lessons-index.mjs .`), never
  "warm the cache", and the re-check reuses the already-pinned `--verdict` line, so the loop grant gains exactly one
  line.
- L19 — The generator is a Bash write to `.pharn/lessons-index.md`, outside `/pharn-plan`'s `writes:`. The step
  says so in one clause (benign: `.pharn/**` is scratch, gitignored, outside the reconciled set), as
  `/pharn-memory-promote` Step 6b already does.
- L72 — The dev modules' exported API (`buildIndex`, `checkLessonsIndex` → `{ok, findings, malformedCount}`,
  `generate`, `parseLessons`, `renderIndex`, `CANON_PATH`, `OUT_PATH`, …) is kept exactly, because its callers
  (the dev tests, `npm run docs:*`, two dev commands) are outside this rewrite; changing a return shape would make
  one of them take the wrong branch silently.
- L1 — Meta-docs that state a fact this changes: `.dev/guides/lessons.md` ("two cores are deliberate SEPARATE
  COPIES"), `.dev/guides/floor-checks.md` (both twin sections), `pharn-dev-memory-promote.md:215` (cites the dev
  file's `COMMIT_RE` literal), `CHANGELOG.md`, `README.md` (badge + generated inventory). Swept, see below.

## Design

- **`pharn/floor/canon-root.mjs` (new, ~40 lines + test).** `DEFAULT_CANON_ROOT = "memory-bank"`;
  `parseCanonRoot(raw)` → `{ok, root}` or `{ok:false, reason}`: a repo-relative POSIX path, segments of
  `[A-Za-z0-9._-]`, no `.`/`..` segment, not absolute, no backslash or control char, ≤ 256 chars, a leading `./` and
  trailing `/` normalized away; `takeCanonRoot(args)` pulls one `--canon-root <dir>` from argv (missing value,
  repeat, or invalid → refusal). One parser for all four CLIs (P3) rather than four.
- **`lessons-index-core.mjs`.** A `profile` object (`canonPath`, `outPath`, `gen`, `regen`, `storageNote`,
  `columnsNote`) becomes an optional last parameter of `renderIndex` / `buildIndex`; `productProfile(root)` builds
  the product one (the default, `productProfile()`, renders byte-identically to today; a non-default root puts
  `--canon-root <root>` in the regenerate hint). `CANON_PATH`/`OUT_PATH` stay exported as the default profile's
  values. Grammar, parse and render code unchanged.
- **`check-lessons-index.mjs` / `gen-lessons-index.mjs`.** `checkLessonsIndex(dir, profile)`,
  `generate(dir, profile)`; `main` reads `--canon-root` (invalid → exit 2, stderr only, no token — never a member of
  the verdict set). The FIX hint is the profile's `regen`. Five-token set and exit codes unchanged.
- **`check-provenance.mjs`.** The body moves into `export function checkProvenance(candidatePath, canonPath,
{canonRoot, strictCommit, self})` (reds local, not module-level); `TARGET_ENUM` = `targetEnum(canonRoot)` over
  the fixed two-file list; `strictCommit` selects `/^[0-9a-f]{7,40}$/` and the dev message. CLI: `--canon-root`,
  `--strict-commit`; gains `import "./runtime-floor.mjs"` first and an `import.meta.main` gate so the dev wrapper
  can import it (the entry-point-guard family's rule).
- **Dev wrappers.** `.dev/floor/lessons-index-core.mjs` = `DEV_PROFILE` (paths, `npm run docs:generate`, the dev
  columns prose — byte-identical render) + re-exports + a `buildIndex` that throws the two existing messages on
  `no-canon`. `.dev/floor/check-lessons-index.mjs` maps the product verdicts to its committed-artifact vocabulary
  (`COLD`→`MISSING`, `STALE`→`DRIFT`, `NO_CANON`/`ENUM_ERROR`→`ENUM_ERROR`) and keeps its CLI text.
  `.dev/floor/gen-lessons-index.mjs` throws on `no-canon`. `.dev/floor/check-provenance.mjs` calls
  `checkProvenance(…, {canonRoot: ".dev/memory-bank", strictCommit: true, self: ".dev/floor/check-provenance.mjs"})`.
- **`pharn-plan.md` Step 1.3.** `COLD` and `STALE` → run `node pharn/floor/gen-lessons-index.mjs .`, then the
  `--verdict` line again; `GREEN` → the two-step sweep; anything else → read canon in full and say so. `ENUM_ERROR`
  keeps its own branch (regenerating cannot fix it). "optionally" is gone. `reads:` gains the generator.
- **`pharn-loop.md`.** One grant line, `Bash(node pharn/floor/gen-lessons-index.mjs .)`, next to the
  `check-lessons-index` grant. (`/pharn-ship` and `/pharn-loop` have no lessons step of their own; both run
  `/pharn-plan`'s, so pharn-plan.md is the one site.)
- **Dogfood.** A dev test runs `node pharn/floor/check-lessons-index.mjs --canon-root .dev/memory-bank . --verdict`
  on this repo and requires a member other than `NO_CANON`; `npm run docs:check` itself now runs the product
  grammar on every CI run.

## Files

- `pharn/floor/canon-root.mjs` — new: the one `--canon-root` parser and default. — layer: product floor
- `pharn/floor/canon-root.test.mjs` — new: accept/refuse table, normalization, argv extraction. — layer: test
- `pharn/floor/lessons-index-core.mjs` — profile parameter, `productProfile`. — layer: product floor
- `pharn/floor/lessons-index-core.test.mjs` — default renders unchanged; a custom root's header and hint. — layer:
  test
- `pharn/floor/check-lessons-index.mjs` — `--canon-root`; profile through. — layer: product floor
- `pharn/floor/check-lessons-index.test.mjs` — custom root COLD/GREEN; no flag still NO_CANON there; invalid flag
  exit 2 with no token. — layer: test
- `pharn/floor/gen-lessons-index.mjs` — `--canon-root`; profile through. — layer: product floor
- `pharn/floor/gen-lessons-index.test.mjs` — custom root writes the cache, hint carries the flag. — layer: test
- `pharn/floor/check-provenance.mjs` — `checkProvenance` export, `--canon-root`, `--strict-commit`, runtime floor +
  entry gate. — layer: product floor
- `pharn/floor/check-provenance.test.mjs` — custom root enum, strict commit, default unchanged, import runs
  nothing. — layer: test
- `.claude/commands/pharn-plan.md` — COLD/STALE mandatory generation; `reads:`. — layer: product command
- `.claude/commands/pharn-loop.md` — one `allowed-tools` grant line. — layer: product command
- `.claude/commands/pharn-memory-promote.md` — Step 6b's "the next `/pharn-plan` reads `STALE` and falls back to
  reading canon in full" becomes "regenerates it" (added during build by the L1/L50 sweep: the sentence cites the
  behaviour this increment changes). — layer: product command
- `.dev/floor/lessons-index-core.mjs` — thin wrapper (dev profile). — layer: apparatus
- `.dev/floor/check-lessons-index.mjs` — thin wrapper (committed-index vocabulary). — layer: apparatus
- `.dev/floor/gen-lessons-index.mjs` — thin wrapper. — layer: apparatus
- `.dev/floor/check-provenance.mjs` — thin wrapper (dev root, strict commit). — layer: apparatus
- `.dev/floor/lessons-index-core.test.mjs` — cross-copy text pins → thinness closure + profile pins. — layer: test
- `.dev/floor/check-lessons-index.test.mjs` — unchanged behaviour; dogfood test of the product CLI on dev canon. —
  layer: test
- `.dev/floor/gen-lessons-index.test.mjs` — any import/assertion the wrapper changes. — layer: test
- `.dev/floor/check-provenance.test.mjs` — cross-copy text pins → thinness closure; TYPE_ENUM/TARGET_ENUM read from
  the product module. — layer: test
- `.dev/floor/command-hygiene.test.mjs` — `LESSONS_SWEEP_WIRING` 4 → 5; byte ceilings only if measured over. —
  layer: test
- `.dev/floor/stage-load-budget.test.mjs` — only if the measured load crosses a ceiling. — layer: test
- `.dev/floor/entry-point-guard.test.mjs` — only if its guarded-CLI pins need the new gated CLI listed. — layer:
  test
- `.claude/commands/pharn-dev-memory-promote.md` — the `COMMIT_RE` cite now names `--strict-commit`. — layer:
  apparatus command
- `.dev/guides/lessons.md` — "two cores are deliberate SEPARATE COPIES" → one implementation, two profiles. —
  layer: apparatus doc
- `.dev/guides/floor-checks.md` — the four twin sections. — layer: apparatus doc
- `SKILLS_VERSION` — 6.65.2 → 6.66.0. — layer: repo meta
- `CHANGELOG.md` — the 6.66.0 section. — layer: repo meta
- `README.md` — badge; the generated `## Current state` region (floor checker count +1). — layer: repo meta
- `docs/capabilities/README.md` — generated, only if `docs:generate` changes it. — layer: generated
- `docs/lessons-index.md` — generated; must stay byte-identical (declared so a regenerate is in scope). — layer:
  generated

## Bump

**Minor, 6.65.2 → 6.66.0** (renumbered against `origin/main` at PR time). New shipped options on four product
floor CLIs (`--canon-root`, `--strict-commit`), a new floor module, and a changed `/pharn-plan` procedure. No
default output changes (the default profile renders today's bytes; the verdict set, exit codes and the
check-provenance default are unchanged), so not major. `MIN_CLI` untouched: no installed path moves and no
contract shape changes.

## Evals to write (P1)

No capability (`role:`) is added or changed, so no eval. The floor CLIs carry `node --test` suites (above).

## Guarantee audit (P0)

- `--canon-root` selects which file the checker reads → floor: regex/enum (the parser's grammar) — it never proves
  the root is the RIGHT one; that is the caller's argument.
- the dev surface runs the product grammar → floor: the thinness closure test (enum over declared names) + the
  existing `docs:check` byte-equality over `docs/lessons-index.md`. Not that the grammar is correct (consistency,
  never correctness — unchanged bound).
- the dev provenance checker refuses `unknown` → floor: regex (`strictCommit`), pinned by the dev suite through the
  wrapper.
- `/pharn-plan` regenerates on COLD/STALE → advisory: command prose; the presence of the line is pinned by
  `LESSONS_SWEEP_WIRING` (presence, never that a run executed it). The verdict branch stays a membership test.
- the loop needs no prompt for the new line → floor-adjacent: the grant/pinned-line coverage+closure test; not that
  Claude Code honours the grant.

## Trust audit (P2)

Canon free text (titles) is still DATA, rendered verbatim and refused on a fence or control char — unchanged. The
`--canon-root` value comes from a command's pinned line or a contributor's shell, never from canon or a model's
reading of free text; it is validated before any path join.

## Meta-doc sweep (L1)

`grep` for `deliberate`/`SECOND COPY`/`twin`/`copy-pair` near check-provenance or lessons-index across commands,
guides, CLAUDE.md, README, docs, pharn/floor: hits and dispositions —
`.dev/guides/lessons.md:48` (product twin's benign `-`: still true of the product profile — keep, reword "twin");
`.dev/guides/lessons.md` "The two cores are deliberate SEPARATE COPIES" bullet (rewrite);
`.dev/guides/floor-checks.md:26,217,232,242` + dev sections (rewrite the twin sentences);
`pharn-dev-memory-promote.md:211-218` (COMMIT_RE cite → `--strict-commit`);
`pharn/floor/validate.mjs:566` and `.dev/guides/floor-checks.md:26` ("live in BOTH floors on purpose" — both files
still exist, as entry points; true, keep); `pharn/floor/scan-code-ssrf.test.mjs:414`,
`pharn/floor/quote-core.mjs:17`, `pharn/floor/check-ship-briefing.test.mjs:9` (cite the old precedent in passing;
historically true, tests/comments — keep, out of scope); canon L31/L35 (canon, not editable in this batch — the
lesson-extract records it as a candidate).

## GATE 1 decisions (resolved — recorded, not open)

Approved 2026-10-19 by the batch orchestrator under the maintainer's delegation (a model decision, not a human
approval):

- Q1 → thin wrappers. The dev files keep their paths and exported APIs and hold only the dev profile.
- Q2 → flag only, and the bound is stated where the flag is documented: `--canon-root` changes only which file
  these four CLIs read (and, for check-provenance, which two targets are members). Every other product canon path
  — `check-plan-lessons`'s argument, `/pharn-memory-promote`'s target, `/pharn-plan`'s "read canon" step — stays
  pinned to `memory-bank/`, so the flag is NOT a way to relocate a project's memory-bank.
- Q3 → the new module `pharn/floor/canon-root.mjs`.
- Also directed: record the L31/L35 staleness as a deferred lesson candidate in `SHIP.md` and name it in the
  CHANGELOG entry's "Not covered".
