# PLAN — contract-enum-binding

- spec_content_hash: 2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e
- applied_lessons: [L36, L43, L60]
- increment: Bind the two contract enums the 2026-10-12 audit's ARCH-9 names to the code that restates them. Tests
  parse `pharn/pharn-contracts/finding-shape.md`'s severity/type lines and `pharn/pharn-contracts/verify-report.md`'s
  per-consumer verdict table and union sentence, and compare each with the set the code actually uses. Three
  `const` → `export const` edits make the guarded modules' sets importable; the unguarded CLIs are read through their
  own refusal message (the live set), and the emitter through its emitted literals.
- layer(s): product floor (`pharn/floor/` — three one-word export edits; tests), repo meta
- constitution_refs: [P0, P4, P5, P6, P7]
- mode: LIGHT (batch 2026-10-19, group I; no stage commands, per the batch brief)

## The triggering failure (P7)

Audit 2026-10-12 finding ARCH-9 (Medium, still open at `d5453a17`, re-read live at `94ad252b`): the contract enums are
restated in code and no test reads the contract. Adding one verdict or severity means several lockstep edits, and
nothing fails when one is missed. Live sites, re-read this run:

- `finding-shape.md:23` `type: "<enum>" # FINDING | CONSTITUTION_VIOLATION | ...` (an OPEN list), `:25`
  `severity: blocking | important | minor`, `:38` table row `membership in {blocking, important, minor}`.
  `merge-findings.mjs:150-151` `SEVERITY_RANK` / `SEVERITY_ENUM`; `:181` `TYPE_OK` is a SHAPE regex
  (`/^[A-Z][A-Z0-9_]*$/`), not an enum.
- `verify-report.md` "The `verdict` field" table: four consumer rows, and the sentence "The artifact's enum is the
  union — `{PASS, FAIL, INCOMPLETE, INCONCLUSIVE}`". Code: `check-ship.mjs:54` and `check-loop.mjs:135`
  `VERIFY_VERDICTS`, `render-ship-briefing.mjs:94` and `check-ship-briefing.mjs:63` `VERIFY_ENUM`; `check-verify.mjs`
  emits the verdicts as `verdict: "<X>"` literals.
- `gate-run-core.mjs ~:154` (cited by the audit): at `94ad252b` that line is `RESERVED_IDS`, and the file holds no
  verdict set — only prose mentions (`:54-57`). Nothing to bind there; reported, not edited.

## Approach

1. **Guarded modules — export.** `merge-findings.mjs`, `render-ship-briefing.mjs`, `check-ship-briefing.mjs` run their
   CLI under `if (import.meta.main)`, so the tests already import them. Change `const SEVERITY_ENUM`, `const TYPE_OK`,
   and both `const VERIFY_ENUM` to `export const`. No other byte changes.
2. **Unguarded CLIs — read the live set from the refusal.** `check-loop.mjs` and `check-ship.mjs` run `main()` on import,
   so exporting would need an import guard (a refactor the brief excludes, and group D edits `check-loop.mjs`). Both
   `readVerdict` refusals print the set they test against: `.verdict "X" is not one of {A, B, …}`. The test spawns the
   CLI with an off-contract verdict and parses that set. This reads the set the code USES, needs no source change, and
   survives group L moving `check-ship.mjs` (the test spawns `here/check-ship.mjs`; the contract is found by walking up
   to the directory holding `pharn/pharn-contracts/verify-report.md`; the row is matched by the basename
   `check-ship.mjs`, so a path change in the row does not break it — removing the row does, loudly, which is the
   point of a binding).
3. **The emitter — `check-verify.mjs`.** It has no set; it emits literals. Bind the set of `verdict: "<X>"` literals in
   its source to the contract's union sentence (both directions, L36), and the union to the union of the four table
   rows (the contract's internal consistency).
4. **Type is an open list.** The honest binding: every type the contract lists passes `TYPE_OK`, and the contract's list
   still ends in `...`. If a later edit closes the list, the test fails and says a set must replace the shape regex.

Every parser anchors on a stable marker and throws when the anchor is missing or a cell does not have the strict shape
(backticked `UPPER_CASE` tokens joined by `·`), so a reworded row cannot parse to an empty set and pass (L60).

## Applied lessons

- L36: every comparison is set equality (`deepEqual` over sorted arrays), never per-member presence, so an extra value in
  either the code or the contract fails; the emitter scan is the CLOSURE pattern `check-loop.test.mjs` already uses.
- L43: the bound is stated in the tests and the CHANGELOG: agreement between contract and code, never that the enum is
  right. A wrong value written in both stays green.
- L60: each binding has its own negative controls — a contract text with a member added, one with a member removed,
  and one with the anchor removed (which must throw, not parse to `[]`). Non-vacuity is per asserted property.

## Files

- `.dev/features/contract-enum-binding/PLAN.md`
- `pharn/floor/merge-findings.mjs`
- `pharn/floor/render-ship-briefing.mjs`
- `pharn/floor/check-ship-briefing.mjs`
- `pharn/floor/merge-findings.test.mjs`
- `pharn/floor/check-verify.test.mjs`
- `pharn/floor/check-loop.test.mjs`
- `pharn/floor/check-ship.test.mjs`
- `pharn/floor/check-ship-briefing.test.mjs`
- `SKILLS_VERSION`
- `CHANGELOG.md`
- `README.md`

## Version and CHANGELOG

The three `export` edits change product-floor bytes (`pharn/floor/*.mjs`, not tests) → **patch**, 6.64.3 → 6.64.4 (or
origin/main's version + patch at PR time). README badge follows `SKILLS_VERSION`.

## Guarantee audit (P0)

The new tests are floor primitive #3 (enum/regex, set equality) run by `npm test`. They guarantee that the contract's
enum text and the code's set AGREE at test time — not that either is correct (L43), and not that a consumer outside the
four table rows reads the same set. The check-loop/check-ship binding reads the set through the refusal message, so it
also depends on that message printing the set it tests (it does today: `[...allowed].join(", ")`); a message reword
breaks the parse loudly.

## Trust audit (P2)

Inputs are a trusted contract and the repo's own source. No free-text field decides anything.

## Determinism audit (P5)

Pure parsing and set comparison; the spawned CLIs are deterministic over the fixture reports.

## Open questions (HALT)

None.
