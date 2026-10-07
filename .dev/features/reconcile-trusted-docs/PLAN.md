# PLAN — reconcile-trusted-docs

- feature: reconcile-trusted-docs
- spec_content_hash: 75088a82d113bc52cdd3d5fb2e44533e81cba5f520877f5eaa441ced45fb0fd6
- applied_lessons: [L1, L29, L31, L34, L35, L37, L64, L68]
- increment: the human-only surface (the four trusted docs, CODEOWNERS at its three locations, pharn.spec-template.md) and memory-bank canon join the always-reconciled control surface, compared against HEAD's committed blobs, and a control path ADDED as an untracked file is a candidate too.
- layer(s): product floor (`pharn/floor/`), pharn-contracts (`reconciliation-record.md`)
- constitution_refs: [P0, P2, P5, P6, P7]

## The defect (P7 — measured by the audit, reproduced from the code)

Audit 2026-10-07: "forging clears even a trusted doc — the four docs are not in `always_reconciled`". The audit's
fixture got `CLEAN` after it Bash-edited `LIMITS.md` and rewrote that file's baseline entry. Read live this run:
`isAlwaysReconciled` covers the six `exact` guard files plus the `pharn/floor/` and `.dev/floor/` prefixes, so for
every trusted doc the forgeable baseline is the only reference. A second hole, found while reading
`controlSurfaceChanges()`: it asks `git diff --name-only HEAD`, which never lists an **untracked** file. So a
control path absent at HEAD can be created through Bash, have its baseline entry forged, and read `CLEAN`; with no
baseline at all it reads `NO_BASELINE`. Examples are `pharn.spec-template.md`, which does not exist in this repo,
or a new `pharn/floor/x.mjs`. The coordinator's brief requires that an added file at a control path be an escape.

## Approach

1. **The set** (`pharn/floor/reconcile-ignore.json`, `always_reconciled`):
   - `exact` stays the six guard files, so its parity with `CONTROL_SURFACE` is unchanged.
   - New `human_only` (exact):
     - `pharn/CONSTITUTION.md`, `pharn/ARCHITECTURE.md`, `THREAT-MODEL.md`, `LIMITS.md`;
     - `CODEOWNERS`, `.github/CODEOWNERS`, `docs/CODEOWNERS`;
     - `pharn.spec-template.md`.

     This is `protect-trusted-paths.cjs`'s `DEFAULT_PROTECTED` minus `CONTROL_SURFACE` minus
     `.pharn/writes-scope.json`. That last one is gitignored runtime state, never in the reconciled set, and is
     excluded by name with the reason stated.

   - `prefixes` gains `memory-bank/` and `.dev/memory-bank/`, the hook's `PROTECTED_SUBTREES`. The hook denies the
     whole subtree, so the whole subtree is reconciled. That covers all four canon files and
     `.dev/memory-bank/feature-catalog.md`, and the dev and product halves alike (L31).
   - A ✧ test pins `human_only` and the two canon prefixes set-equal to the hook's own constants, read from the
     hook source exactly as the existing `exact` parity test reads `CONTROL_SURFACE`. A second ✧ test pins
     `never_exempt` ⊆ the always-reconciled set.
2. **Added files**: `controlSurfaceChanges()` returns `git diff --name-only HEAD` ∪ the untracked-not-ignored
   always-reconciled paths (`git ls-files -z --others --exclude-standard`). This runs in both branches, with a
   baseline and without one. It goes through C1's argv `git()` helper, so the GIT CEILING enumeration does not
   move.
3. **Interaction with C1's `merged` class**: unchanged and intended. A trusted doc changed on upstream and merged
   in during the window has bytes equal to HEAD, so it is not in the HEAD diff. It still differs from its baseline
   entry, so it is a candidate; `protect-trusted-paths.cjs` denies it; `classifyMerged` then moves it to `merged`
   by C1's six conditions. A test pins this for a modified, not just an added, `LIMITS.md`.
4. **Contract, header, README, CLAUDE.md, guide, ci.yml comment, CHANGELOG** state the wider set and the
   consequence below. Every restatement of the set is probed (L64).

### The consequence, stated rather than hidden (L68)

Reconcile has no attribution. A human's **uncommitted** edit of a trusted doc, CODEOWNERS, the SPEC template or
canon reads as an escape:

- inside a build's anchor→verify window, as before;
- and now also with **no** baseline, because the HEAD comparison sees it. So `npm run check` (`check:reconcile`)
  on a checkout holding an uncommitted `LIMITS.md` edit REDs, exactly as an uncommitted guard edit already does.

That is the loud direction, deliberately. The clean routes are L68's: land the human edit before the build's Step 0
or after verify, and commit it before running the gates. A committed human edit on the branch during a window is
already an escape today (the baseline sees it); this plan does not change that.

## Applied lessons

- L1 — every surface that lists the always-reconciled set is in `## Files`: the contract, the checker header,
  README, CLAUDE.md, the floor-checks guide, the ci.yml comment, CHANGELOG, SKILLS_VERSION. LIMITS.md and
  THREAT-MODEL.md also list it; they are human-only, so their text goes to GATE 2 as a proposal.
- L29 — the forged-baseline and added-file tests iterate the whole `human_only` list and one file per canon
  prefix from `reconcile-ignore.json`, never a single example member.
- L31 — dev and product canon (`.dev/memory-bank/`, `memory-bank/`) are both members, pinned by the parity test
  against the hook's `PROTECTED_SUBTREES`, which already lists the pair.
- L34 — each iterated test asserts a non-empty set and an ESCAPE per member. The existing ordinary-path
  forged-baseline test, which expects `CLEAN`, stays as the non-vacuity control: forging an ordinary path is
  still silent.
- L35 — must the second copy exist? Yes: the checker cannot import a list from a hook-protected `.cjs`. Delegating
  "is it protected?" to the hook per changed path was considered and rejected. The hook's canon rule reads the
  Bash-writable live scope, so a forger could set a promote scope and drop canon from the HEAD comparison. So it
  is a copy, pinned set-equal by test (the existing `exact` precedent), not a second source of truth.
- L37 — the bound sentences (git-ignored control paths stay invisible; the gitignored `.pharn/writes-scope.json`
  is excluded) are written from a probe, not from reading the code.
- L64 — each restatement of "the always-reconciled control surface (`.claude/hooks/*`, …)" is updated and probed.
- L68 — the human-edit consequence is the contract's and the CHANGELOG's stated cost, with L68's ordering
  remedy named.

## Files

- `pharn/floor/reconcile-ignore.json` — **EDIT.** `always_reconciled.human_only`; `prefixes` += the two canon
  subtrees; the `why` / `parity` text.
- `pharn/floor/check-bash-reconcile.mjs` — **EDIT.** load `human_only`; untracked control paths in
  `controlSurfaceChanges()`; header bounds 5/6.
- `pharn/floor/check-bash-reconcile.test.mjs` — **EDIT.** forged-baseline per `human_only` member and per canon
  prefix; added-file with and without a baseline; untracked `pharn/floor/` file; merged trusted-doc modification;
  the L68 no-baseline consequence; parity pins.
- `pharn/pharn-contracts/reconciliation-record.md` — **EDIT.** the `always_reconciled` row, the claim table, the
  bound and the consequence.
- `.dev/guides/floor-checks.md` — **EDIT.** the reconcile section names the wider set.
- `README.md` — **EDIT.** the limits paragraph's control-surface list; version badge.
- `CLAUDE.md` — **EDIT.** the Writes-scope paragraph's always-reconciled sentence.
- `.github/workflows/ci.yml` — **EDIT.** the comment listing the always-reconciled set (comment only).
- `CHANGELOG.md` — **EDIT.** the 6.52.0 entry.
- `SKILLS_VERSION` — **EDIT.** 6.51.0 → 6.52.0, a minor bump (the reconciler's guaranteed surface widens).
  Tentative; renumber at merge if the regress-integrity PR lands on the stack first.

## Contracts satisfied

- `pharn/pharn-contracts/reconciliation-record.md` — the `always_reconciled` data key is extended. Verdict enum,
  exit codes and record shape are unchanged.

## Evals to write (P1)

No Capability, so `node --test` cases:

- for each `human_only` member: added untracked with a forged baseline → ESCAPE. For `LIMITS.md` (tracked in the
  fixture): Bash-edited with a forged baseline → ESCAPE. Fails on the stack top today (CLEAN).
- for one file per canon prefix: forged baseline → ESCAPE.
- untracked new `pharn/floor/x.mjs` with a forged baseline → ESCAPE (the pre-existing added-file hole).
- no baseline, untracked `pharn.spec-template.md` → ESCAPE, not NO_BASELINE.
- no baseline, uncommitted `LIMITS.md` edit → ESCAPE (the L68 consequence, pinned as behaviour).
- `LIMITS.md` modified on upstream and merged in → `merged`, CLEAN.
- an ordinary path forged → still CLEAN (the existing test, kept: the bound is unchanged for ordinary paths).
- ✧ parity: `human_only` = `DEFAULT_PROTECTED` − `CONTROL_SURFACE` − `.pharn/writes-scope.json`; canon prefixes
  = `PROTECTED_SUBTREES`; `never_exempt` ⊆ always-reconciled.

- GATE-1 additions (orchestrator):
  - a `human_only` escape's finding names the remedy in one line: commit the human edit before running the
    gates, or land it outside the anchor→verify window;
  - NON-VACUITY: an untracked file OUTSIDE the control surface, with no baseline, is still not reported, so
    `ls-files --others` does not widen the check beyond control paths.

## GATE 1

Approved as written. This is a **delegated model decision by the orchestrator, not a human approval**. It
accepted: `CODEOWNERS` at all three locations, canon as whole subtrees, `.pharn/writes-scope.json` excluded by
name, the untracked-file fix and its bound, and the no-baseline L68 consequence. The two additions above were made
at the gate.

## Guarantee audit (P0)

- "a Bash write to a trusted doc / CODEOWNERS / the SPEC template / canon is reported even when its baseline
  entry is forged" → floor: content-hash vs HEAD's committed blob (primitive #2) + path membership (#3), in the
  non-adversarial-baseline sense widened to these paths. Bounded and stated: a COMMITTED change moves HEAD too
  (bound 6, unchanged — Code-Owner review is the backstop); a git-ignored control path is invisible (bound 1); the
  checker runs from the worktree (bound 7).
- "an added file at a control path is a candidate" → floor: git's untracked enumeration plus membership. Bounded:
  an added file that is git-ignored, including through `.git/info/exclude`, is not seen.
- "the four docs are human-only" → unchanged: the hook covers the Write surface only; this only DETECTS a Bash
  write.

## Trust audit (P2)

- Paths remain untrusted DATA; the new git call is argv-only through the literal-pathspec helper. No new
  free-text reaches a decision.

## Open questions (HALT)

None. The judgment calls are resolved above, for the GATE-1 reviewer to accept or override:

- the CODEOWNERS locations: all three;
- canon: the whole subtrees, not just the four files;
- the gitignored scope file: excluded by name.
