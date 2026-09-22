# PLAN — docs-sync-6-11

- spec_content_hash: 2f8b92646bdf31d51169f46c74c14c10debdb456291fb0213be63cfc4d77e838
- applied_lessons: [L1, L33, L37, L49, L50]
- increment: bring the hand-written docs up to date with the last 20 commits on `main` (`a3ecc48` … `0bf10f4`, 6.4.3 → 6.11.1).
- layer(s): repo meta only (`README.md`, `CLAUDE.md`, `SECURITY.md`, `CHANGELOG.md`)
- constitution_refs: [P0, P6, P7]

## Why

I read the last 20 commits on `main` (6.4.3 → 6.11.1) file by file and checked every hand-written doc
surface against them. Generated regions and most prose are current, but five sentences are not. Four are
user-facing, and one misleads an agent working in this repo.

## Discovery (live, at `0bf10f4`)

**Surfaces that are already current. No change.**

- **The `docs/` tree is generated.** It holds the capability catalog (the 36 role-bearing capabilities)
  and `docs/lessons-index.md`. `npm run docs:check` is GREEN. None of the 20 commits changed a
  capability, and the three that promoted lessons regenerated the index in the same commit.
- **README's `## Current state` inventory is generated.** It already lists the 11 contracts and the 4 hook
  scripts, `require-loop-record.cjs` included.
- **README prose already covers most of the line:**
  - `cost.json` and `RUN-REPORT.md` (6.5–6.7) in "What PHARN is", the guarantees table and the
    limitations;
  - the run-scoped ledger (6.9.0) in the `check-cost-ledger` row;
  - `check-loop-fresh.mjs` (6.10.0) in "The pipeline".
- **`CLAUDE.md` has a block for every new floor file:** `run-gates`, `gate-run-core`,
  `worktree-fingerprint`, `run-window-core`, `ship-outcome-core`, `render-run-report`, `mark-phase`,
  `check-cost-ledger`, `check-loop-fresh` and `require-loop-record`. Its `npm run check` list equals
  `package.json`'s `scripts.check`.
- **`CONTRIBUTING.md`:** `check:contributing` is GREEN, and no sentence is made false by the 20 commits.
- **`pharn/features/README.md`** describes the artifacts generically and stays true.
- **The four trusted docs.** I grepped them for the installer claim, a model-typed gate map and the Stop
  guard, and found no sentence that the 20 commits made false. The one pending trusted-doc change is
  #243's `LIMITS.md §7` / `CONSTITUTION.md` text in `.dev/features/loop-stop-guard/settings-patch/APPLY.md`,
  which is human-only and is not touched here.

**Sites that are stale. Change.**

1. **The Stop guard ships unregistered, and README does not say so (6.11.0).**
   - Probed in `pharn-cli@f853390`, `src/lib/install-capabilities.ts`: the installer copies every
     `.claude/hooks/*.cjs` except tests. So `require-loop-record.cjs` lands in every install.
   - `.claude/settings.json` wires only `PreToolUse` (probed: `Object.keys(hooks)` → `["PreToolUse"]`).
   - README still says "write-gating hooks" (`README.md:158`) and "# the write guards" (`:170`). A reader
     would take every installed hook to be a wired write guard. The Stop guard is neither.
2. **The gate runner has no row in README's guarantees table (6.8.0).** Since 6.8.0 the verify and
   regress verdict maps are produced by `run-gates.mjs` and validated through `check-verify.mjs --stamp`
   / `check-regress.mjs verdict --base-stamp … --head-stamp …`. Both product commands use that path
   (probed: `--stamp` in `pharn-verify.md`, `--base-stamp` in `pharn-regress.md`). The table lists the
   reconcile gate that feeds verify, but not what makes the map itself floor. The row and its bound are
   taken from `gate-run-record.md` "What a validating stamp PROVES" / "does NOT prove", not paraphrased
   from memory.
3. **README's install tree lists only seven artifacts.** The `pharn/features/<name>/` comment
   (`README.md:180-181`) lists "SPEC PLAN GRILL BUILD REGRESSION VERIFY SHIP". It predates `cost.json`
   and `RUN-REPORT.md` (6.5–6.7, in the 20), and it also omits `LOOP.md` and `BRIEFING.md`. The comment
   column is also misaligned (`# per increment` starts 11 columns right of every other comment).
4. **"The installer copies CONSTITUTION and ARCHITECTURE only" has expired (L33).** Probed in
   `pharn-cli`:
   - `7c54820` (#163, 2026-09-09, first tagged in `v0.4.0`) installs all four trusted docs;
   - `src/lib/layout.ts:96` maps the pharn layout's `docs` to `PHARN_TRUSTED_DOCS`, which holds all four;
   - `MIN_CLI` is `0.5.0`, so every CLI that may install this tree copies all four.

   The enumeration uses the referent, per L50: every cite of "which trusted docs an install receives".
   It searched every tracked `.md`/`.mjs`/`.cjs`/`.json` outside `.dev/features/` and `CHANGELOG.md`
   for two patterns:
   - `THREAT-MODEL.md` or `LIMITS.md` within 140 characters of `install`, `land`, `copy`, "user's
     directory", "in the repo" or "read here", in either order;
   - "two of them", "never land", "design doc ships" and "installer copies".

   It found exactly two sites:
   - `README.md:540-541`, the "Not every design doc ships into an install" limitation;
   - `CLAUDE.md:57-59`, "two of them simply never land in a user's directory".

   The CLAUDE.md paragraph's POINT survives, just for a different reason: the versioning unit is still
   not "files an install contains", because the installer copies only the capabilities selected for the
   project (`installCapabilityDirs(… selection.selected …)`).

5. **SECURITY.md names one hook and one validator (`SECURITY.md:53`).** It says "the `.cjs` hook or the
   `.mjs` validator". There are four hook scripts, the fourth added by 6.11.0, and the product floor is
   many checkers. The line under-scopes what a report may target.

## Files

- `README.md` — sites 1, 2, 3 and 4: the install bullet and tree for the hooks (the Stop guard ships
  unregistered), the trusted docs in the install list, the artifact comment, a gate-runner row plus its
  bound, and the expired limitation removed — repo meta
- `CLAUDE.md` — site 4: the installer-copies sentence, restated with the reason that still holds —
  repo meta
- `SECURITY.md` — site 5: hooks and checkers, plural — repo meta
- `CHANGELOG.md` — `[Unreleased]` → `### Fixed`, one entry naming all five sites, with no version token
  — repo meta
- `.dev/features/loop-stop-guard/settings-patch/APPLY.md` — one added step in "The order": once the
  wiring lands, revise README's dated Stop-guard sentence. This was added after the grill (GRILL finding
  2), so the claim cannot expire unnoticed — dev apparatus

**Folded from `GRILL.md`** (GATE 1 re-decided by the model under the batch delegation):

- Finding 1: CLAUDE.md's `MIN_CLI` argument is bounded to CLIs that honor the gate. `minCliGate` itself
  first shipped in `v0.4.0`.
- Finding 2: the README Stop-guard sentence is split into a durable rule and a dated fact, and `APPLY.md`
  carries the revision step.
- Finding 3: the new row's bound names "that the stage ran at all".

### Deliberately NOT in scope

- **No `SKILLS_VERSION` bump.** `README` / `SECURITY` / `CHANGELOG` are the repo-meta set the bump rule
  exempts, and `CLAUDE.md` is repo guidance, not shipped methodology.
- The four trusted docs (human-only), `.claude/settings.json` (human-only), `pharn-cli`, and every
  generated region.
- CONTRIBUTING.md's and CLAUDE.md's "two load-bearing `.pharn/` entries". `.pharn/reconcile/` has been
  arguably load-bearing since 4.0.0, which is outside the 20 commits and a judgment call. It is named
  here, not changed.

## Guarantee audit (P0)

- The new README row claims exactly what `gate-run-record.md` lists as proved. Its bound states the
  forgery and provenance limits, plus the fact that the stamp alone says nothing about freshness. FLOOR:
  the stamp validation in `check-verify.mjs` / `check-regress.mjs`.
- Everything else is prose about the install, sourced from `pharn-cli` code read this run. That is
  ADVISORY: nothing checks README prose against the installer, and a later `pharn-cli` change can expire
  it exactly as site 4 expired.

## Applied lessons

- L1 — the meta-docs the 20 commits invalidated are this increment's whole scope. Each site is named
  with the commit that expired it.
- L33 — site 4 is a claim that expired when `pharn-cli` v0.4.0 landed, in a file nobody was editing.
- L37 — every install claim was probed against the installer's source, not read off README's own
  wording or a summary.
- L49 — the sweep's coverage boundary is stated. No checker reads README / CLAUDE.md / SECURITY.md prose
  for truth, so these five are the sites a manual read found. That is not a proof that there are no
  others.
- L50 — site 4's enumeration searched for the referent (which docs an install receives), not one
  spelling of the claim.

## Acceptance

- `npm run check` GREEN, including `docs:check`, `check:badge` and `check:contributing`.
- A re-run of the site-4 enumeration finds no remaining claim that the installer omits `THREAT-MODEL.md`
  / `LIMITS.md`.

## Open questions (HALT)

- None. GATE 1 is delegated for this batch.
