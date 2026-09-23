# VERIFY — changelog-sectioning

This is iteration 2. Iteration 1 returned PASS on the same ten gates. The independent review then found
false prose in the generated `CHANGELOG.md` entry and in `MIGRATION.md`, and the fix loop inside the plan's
`## Files` regenerated both. Every gate below was re-run on the regenerated tree.

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test`                                                                                     | 0    |
| `validate`                                                                                 | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `check:changelog`                                                                          | 0    |
| `sectionize:verify`                                                                        | 0    |
| `check`                                                                                    | 0    |
| `reconcile`                                                                                | 0    |

**VERIFIED: floor gates PASS** (`check-verify.mjs` exit 0).

- **`test`.** `npm test` ran 2632 tests: all pass, none skipped. That includes the 38 in this feature's
  two new files.
- **`reconcile`** is `CLEAN`: 7 paths were reconciled against the build's anchor, with 0 escapes. The fix
  loop's scope was re-set from the plan and recorded on the epoch (`--amend-scope`, amendment 1) before the
  regeneration. The regeneration was a Bash write: `git checkout e8b6da2 -- CHANGELOG.md`, then `--write`.
  So both writes are accounted for rather than invisible.
- **The three extra gates** are this command's advisory composition, not a floor-locked set:
  - `check:changelog` — `SKILLS_VERSION` 6.12.1 is recorded.
  - `sectionize:verify` — it now compares **both** generated files against the render of the pinned input
    `e8b6da2`, and requires all 15 invariants to hold.
  - `check` — the full `npm run check` chain the plan's acceptance names.

## Acceptance, item by item

- **Coverage** (`node --test --experimental-test-coverage` over the two test files): 38/38 pass.
  - `sectionize-core.mjs` has **100.00% line coverage**, 96.17% branch and 99.28% function. The bar was
    ≥ 90% line.
  - `sectionize.mjs` has 98.51% line coverage. It is uncovered at `:221–223`, the halt for an entry that
    moves the unchanged-prefix boundary, and `:331–332`, the rethrow for unexpected errors.
- **Live report.** `MIGRATION.md` shows:
  - 142 bullets migrated into 85 generated sections: 84 hold entries, and `[6.5.0]` holds only its
    placeholder. `[1.0.0]` is kept verbatim.
  - **0 unassigned**, and the status tally `UNRESOLVED 0 · DRIFTED 4 · OUT_OF_SCOPE 1 · MULTI 0 · CONFLICT 1
· AGREE 82 · PICKAXE 54`.
  - All **6 overrides** applied, each reason quoted in a fence.
  - **6 positional references** confirmed by the script's order check: the 4 found at plan review, plus
    the 2 found at code review.
  - Every invariant GREEN.
- **`npm run check`** exits 0.

## Red before green (L4), measured on mutants in scratch copies (re-run for iteration 2)

- **Earliest-match mutant.** `introductions()` was made to return the FIRST 0 → >0 transition. Two tests
  fail:
  - the unit test `introductions: the LAST 0 -> >0 transition is the introducer …`;
  - the end-to-end test `--write files every entry by the rules, over a real git history`.
- **Multiset-invariant mutant.** `sameMultiset` was forced `true`. The tamper test fails with
  `BULLET_MULTISET should be RED under its tamper`.

## What the fix loop changed, and why (from the independent review — REVIEW.md)

- **The 1.0.0 sentence was false.** `SKILLS_VERSION` 1.0.0 was first set by `126e2b3` on 2026-06-23, on a
  side branch that the merge `8753940` brought onto `main` on 2026-06-24. The plan, the prompt and the first
  render all read only the first-parent history, and so misdated it. The script now gathers the first
  commit anywhere in history that set the value.
  - The entry now reads: "Its heading date (2026-06-23) is the date `126e2b3` first set `SKILLS_VERSION` to
    1.0.0, on a branch that reached `main` at `8753940` (2026-06-24)."
  - The two 1.0.0-era overrides now carry the true evidence. The governance-files entry was written in
    `126e2b3` itself, but under `[Unreleased]`. The reframe entry was written in `f0d2ec7`, a no-bump
    commit after 1.0.0, so on the full history the method's own rule puts it in 1.1.0.
- **"85 version sections" became 84.** The count is now `filledCount`, the sections that received an entry.
- **"Every `CHANGELOG.md:<line>` cite … now points at moved text" became "past line 14".** The count is
  derived from the shared prefix of input and output.
- **`--verify` now compares `MIGRATION.md` too.** The report no longer embeds the `--ref` spelling, so the
  pinned SHA alone determines its bytes. An end-to-end test proves that a hand edit to `MIGRATION.md` is RED.
- **`DROPPED_EXACT` now also reads the output.** No `allowDrop` line may reappear. A new tamper case proves
  it. The invariant doc names the two members that read the input.
- **Two more positional references** are listed and checked.
- **Smaller fixes:**
  - override reasons are quoted in fences;
  - the re-landed window filter moved into the core (`relandedIn`, unit-tested);
  - the CLI header no longer overstates what it holds;
  - the entry names the `changelog-per-pr` follow-up.

## A false alarm, recorded rather than dropped

During iteration 1, a spot check printed the `[6.5.0]` placeholder without its "re-landed" suffix. The
cause was the display command, `cut -c1-160`, which truncated a 235-character line (measured with
`awk '{print length}'`). The file was correct, and an in-process `migrate()` produced the same line.
Neither the code nor the output changed.

## GRILL findings: where each one landed

- **G1** (merge precondition) is taken at ship.
- **G2** is in the entry: "2 entries that reach `main` in `8753940`, the first-parent commit where
  `SKILLS_VERSION` 1.0.0 first appears, are filed under `[1.1.0]` by a reviewed override …".
- **G3** is NOT corrected in any generated file. `MIGRATION.md`'s bounds say what a section means, but they
  never relabel the plan's "FLOOR (git's object store)". `PLAN.md` is the approved plan and is outside the
  build scope, so it was not edited. The corrected label is recorded in `REVIEW.md`.
- **G4** is in the header of `sectionize.test.mjs`.
- **G5** is in the header of `sectionize.mjs`, and the fix loop followed it.
- **G6** is in `MIGRATION.md`'s bounds.

## Verifiers (advisory)

No verifiers are registered (`count-verifiers.mjs` → 0), so only the floor gates ran.

---

Verified means the named gates passed. This is NOT a guarantee of correctness beyond what those gates
check. In particular, no gate can tell whether an entry is filed under the version a human would choose.
The assignment is deterministic, and its known bounds are in `MIGRATION.md`, but as a statement of truth
it is advisory.
