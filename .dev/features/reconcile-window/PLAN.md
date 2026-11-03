# PLAN — reconcile-window (audit 2026-11-03, batch group G7)

- spec_content_hash: d5a974303fd0b9568945c60423ae5a89c57d7b65f5baa03657e317fbe64f33a5
- applied_lessons: [L17, L25, L29, L35, L38, L41, L42, L60, L68, L80, L81]
- increment: a build anchor refuses to replace another open run's reconciliation epoch, `.github/workflows/` joins the always-reconciled set, the cost-ledger's pre-build exception narrows to the record shape the contract defines, and the `pharn/.run/writes-scope.json` finding is answered with a pin rather than a change
- layer(s): pharn-floor (product floor), pharn-contracts, product command (`/pharn-build`), dev apparatus (guide, feature dir), repo meta (CHANGELOG, CLAUDE.md, docs/limitations.md)
- constitution_refs: [P0, P5, P6, P7]

## Applied lessons

- L17 — every new refusal and every new always-reconciled path is checked against the designed workflow first: a run's own re-anchor (loop iteration 2+, ship retry), a closed or stale marker, and an in-scope workflow edit must all stay clean, each pinned by a test.
- L25 — the erase direction and the workflows prefix are restated wherever the bound is stated today (checker bound 3, contract §1/§4/§4a, reconcile-ignore.json, floor-checks.md, CLAUDE.md, docs/limitations.md; LIMITS §6 by DOCS-PROPOSAL), not only in the file whose code changes.
- L29 — the marker directories the anchor reads are one exported enumeration (`EPOCH_RUN_DIRS`), and the tests iterate it rather than asserting one member.
- L35 — `PIPELINE_RE` / `activeFeatureSlug` move into `reconcile-baseline.mjs` (the checker already imports from it) instead of the anchor carrying a second copy of the feature-slug regex; marker names reuse `gate-run-core.mjs` `FEATURE_SLUG_RE`, and the iterated-stage list reuses `stage-agent-core.mjs` `ITERATED_STAGES`.
- L38 — the finding is L38's sibling (one per-tree record, here the baseline): the structural remedy stays isolation, and the new refusal is stated as making one erase LOUD, not as making two runs in one tree safe.
- L41 — the refusal's no-flag path is the production path (both shipped anchor lines pass no new argv); tests exercise the CLI exactly as `/pharn-build` and the loop grant call it.
- L42 — the anchor reads marker presence and age NOW; the bound is stated (a marker closed early, or one older than 24 h, lets the overwrite through).
- L60 — each refusal test asserts its own property (exit 2 AND the prior record byte-identical AND the message names the marker), with a falsifier beside it (same feature re-anchors; closed / stale marker anchors).
- L68 — the workflows prefix's cost is stated: an uncommitted human edit of a workflow file now reads as an escape with no baseline, so it is committed before the gates run; the owner-patch protocol (commit, then re-anchor) is unchanged.
- L80 — every new reconcile fixture that depends on ignore rules passes its `.gitignore` explicitly (the writes-scope pin uses the existing `makeUnignoredStateRootRepo()` posture).
- L81 — no test copies `reconcile-baseline.mjs` into a scratch tree by a hand list; `stage-verify.test.mjs` derives its closure transitively, so the new import from `gate-run-core.mjs` is picked up; no new git spawn is added (stage-runtime.test.mjs's `GIT_SPAWNS` map stays valid).

## The four findings and what each becomes

1. **MEDIUM — a second run's build anchor resets the first run's window.** FIXED. `reconcile-baseline.mjs --anchor`
   reads the baseline already on disk; when it opened the epoch of feature `<A>` (derived from its `scope_snapshot.set_by`
   by the same `activeFeatureSlug` the checker uses) and the anchor about to be written is for a different feature
   (or none), and `pharn/.run/pharn-loop/<A>/active.json` or `pharn/.run/pharn-ship/<A>/active.json` is present
   (`lstat`, never followed) with an mtime within 24 h either way, it exits 2 and writes nothing. The message names the
   marker, says what overwriting would erase, and names the human remedy (finish or close that run, or use a worktree);
   never "delete the baseline". A prior baseline that is unreadable falls back to "any other feature's open
   loop/ship marker refuses". No new argv: both shipped lines (`/pharn-build`, the loop grant
   `--anchor --by pharn-build`, `/pharn-dev-build`) keep working, and in the loop a refused anchor is the build's
   Step-0 HALT, already row S9. `pharn-review` markers are not read (a review never anchors).
   Not covered, stated: runs that open no marker (dev builds, a standalone `/pharn-build`) and two runs of the same
   feature; the structural remedy is still one worktree per run (L38).
2. **MEDIUM — #412 removed `pharn/.run/**` from the reconciled set, `writes-scope.json` included.** WON'T FIX as
   proposed; pinned instead. The proposed fix (reconcile `pharn/.run/writes-scope.json`, add it to
   `always_reconciled.exact`) reds every correct run in a project that does not ignore `pharn/.run/`: every stage's
   setter rewrites that file through Bash by design, both guards deny it to the Write tool, so after a build anchor the
   regress/verify setters' rewrite is a candidate the guards deny → `ESCAPE` on every run (the #408 failure), and as an
   always-reconciled untracked file it would red with no baseline too. Reconcile has no attribution (L68), so a
   hand-edit is indistinguishable from the setter's write: the signal lost in 7.2.0 was a line present on every run.
   What a forged scope can buy is a widened Write-tool write, and that write is still judged against the anchored
   snapshot and amendments, never the live file. New ★ test pins exactly that; the "it is gitignored runtime state"
   wording in reconcile-ignore.json `parity` and contract §4a is corrected to "under the state root, outside the
   reconciled set whether or not ignored".
3. **BLOCKER part 3 — add `.github/workflows/` to `always_reconciled.prefixes`.** FIXED (spelled `.github/workflows/`,
   no leading slash, like the existing prefixes). Effects, all in every project since the JSON ships:
   - Never exemptible; compared against HEAD's committed blobs on every run, with and without a baseline; an added
     untracked workflow file is a candidate. A forged baseline entry no longer hides a Bash edit of a workflow.
   - `apply-plan-deletions.mjs` refuses a plan's `(delete)` of a workflow file (`control-path`), because it reads the
     same set.
   - Visibility, not a deny (`not_a_deny`): an edit a recorded scope covers stays clean.
   - **A legitimate dev edit of `ci.yml`.** With G1 in this release the setter refuses `.github/workflows/**` from any
     plan unless the operator passes `--allow-exec-config`, so such an edit arrives one of two ways. (a) An opted-in
     scope: inside the build window the snapshot authorizes it → CLEAN, exactly as today. (b) An owner-run patch: inside
     an open window it is an escape today already (a tracked path no scope names); the protocol "commit as its own
     commit, then re-run Step 0 (setter, then `--anchor`)" clears it, unchanged. **New cost:** with NO baseline (a
     checkout that never anchored, e.g. the owner's main checkout), an uncommitted workflow edit now reds
     `npm run check` (`check:reconcile`) until committed, and a workflow file already dirty when a build anchors reds
     that build's verify — the L68 cost the trusted docs and floors already carry. CI is unaffected (a clean checkout
     has no diff against HEAD).
4. **LOW (overflow) — `check-cost-ledger.mjs:606-607` silences the missing-marker line for a pre-build stop.**
   FIXED BY NARROWING. #411 A was a false warning on contract-following records (only a BLOCKED stop counts a
   pre-build stop as `iterations: 1`, `loop-record.md`), so restoring the old line would re-ship a false claim. The
   exception was wider than that shape: it also silenced a non-blocked record (a `STOP_GREEN` at 1 whose build marker
   was lost) and a record whose build stage-start carried no iteration. It now applies only when `outcome.blocked` is
   present AND no stage-start names an iterated stage (`ITERATED_STAGES`); everything else warns as before 7.2.0.
5. **LIMITS §6 wording** (the erase direction, :351-356; the always-reconciled list, :360-362) → DOCS-PROPOSAL.md.

## Files

- `pharn/floor/reconcile-baseline.mjs` — the anchor refusal (`EPOCH_RUN_DIRS`, `openEpochOwner`), `PIPELINE_RE` + `activeFeatureSlug` moved here; header — layer product floor
- `pharn/floor/reconcile-baseline.test.mjs` — refusal / falsifier / closure tests — layer product floor (tests)
- `pharn/floor/check-bash-reconcile.mjs` — import the moved helpers (re-export `activeFeatureSlug`); bounds 1 and 3 restated — layer product floor
- `pharn/floor/check-bash-reconcile.test.mjs` — workflows-prefix tests; the writes-scope.json pin — layer product floor (tests)
- `pharn/floor/reconcile-ignore.json` — `.github/workflows/` in `prefixes`; `not_a_deny` / `parity` / `bound` text — layer product floor data
- `pharn/floor/apply-plan-deletions.test.mjs` — a `(delete)` of a workflow file is refused `control-path` — layer product floor (tests)
- `pharn/floor/check-cost-ledger.mjs` — narrowed pre-build exception — layer product floor
- `pharn/floor/check-cost-ledger.test.mjs` — narrowed-exception tests — layer product floor (tests)
- `pharn/pharn-contracts/reconciliation-record.md` — §1 the anchor refusal; §4 table and §4a; struck-claims bound — layer pharn-contracts
- `pharn/pharn-contracts/cost-ledger.md` — the pre-build exception, stated where marker completeness is — layer pharn-contracts
- `.claude/commands/pharn-build.md` — Step 0: what a non-zero anchor exit now also means — layer product command
- `.dev/guides/floor-checks.md` — reconcile and run-marker sections — layer dev apparatus
- `.dev/features/reconcile-window/DOCS-PROPOSAL.md` — LIMITS §6 replacement text for the owner — layer dev apparatus
- `CHANGELOG.md` — `[Unreleased]` entries — repo meta
- `CLAUDE.md` — always-reconciled enumeration gains `.github/workflows/` — repo meta
- `docs/limitations.md` — the same enumeration, and the erase direction in the one-worktree bound — repo meta

## Contracts satisfied

- `pharn/pharn-contracts/reconciliation-record.md` — the baseline record keeps its shape (no new field, `version` stays
  1); the refusal is a CLI exit, stated in §1 beside D6.
- `pharn/pharn-contracts/cost-ledger.md` — WARN-only rule; no shape change.

## Evals / tests to write (P1 — no Capability changes; floor checkers carry tests)

- ★ anchor by feature B while A's `pharn-loop` marker is open → exit 2, A's record byte-identical, stderr names
  `pharn/.run/pharn-loop/a/active.json`; the same for a `pharn-ship` marker (iterating `EPOCH_RUN_DIRS`).
- falsifiers: same feature re-anchors over its own open marker → 0; A's marker absent → 0; A's marker mtime 25 h old
  → 0; a `pharn-review` marker for A → 0; no prior baseline → 0.
- prior baseline unreadable + another feature's open marker → 2; + only the anchoring feature's own marker → 0.
- new scope whose `set_by` is not a feature plan, A's marker open → 2.
- ★ workflows: no baseline + uncommitted edit of a tracked `.github/workflows/ci.yml` → ESCAPE; an added untracked
  workflow → ESCAPE; baseline entry forged to the edited bytes → still ESCAPE; a scope naming it → CLEAN;
  `isAlwaysReconciled` true for `.github/workflows/x.yml`, false for `.github/workflowsx/a.yml` and
  `.github/dependabot.yml`.
- ★ writes-scope pin (`pharn/.run/` not ignored): after the anchor, a Bash rewrite of `writes-scope.json` that adds a
  path, then a write to that path → ESCAPE naming the path only; the scope file itself is never a candidate.
- apply-plan-deletions: `(delete)` of `.github/workflows/old.yml` → refusal `control-path`, file still present.
- cost-ledger: iterations 1, no iteration marker, no `blocked` → WARN; `blocked` + a `pharn-build` stage-start with
  no iteration → WARN; `blocked` + front stages only → no WARN (existing #411 test kept).

## Guarantee audit (P0)

- "an anchor will not replace an epoch opened for another feature whose loop/ship run is open" → floor: enum/regex
  (slug from `set_by`, closed dir set) + `lstat` presence + an integer age compare, in the anchor CLI. ADVISORY that it
  runs at all (a Bash call, L19), and bounded: markers are Bash-writable and presence-only, so a closed or aged marker
  lets the overwrite through; runs without markers and same-feature runs are not distinguished; detection stays
  non-adversarial. "Two runs in one tree are safe" is STRUCK.
- "a change under `.github/workflows/` is reconciled against committed blob ids" → floor: content/blob-id compare +
  prefix membership (existing mechanism, new member). Bounded exactly like the existing set (git-ignored paths
  invisible; a committed change moves HEAD).
- "a forged live scope does not authorize a write at verify" → floor (existing): the checker reads the anchored
  snapshot and amendments; the new test pins it. A Bash write to the scope file itself stays unreported (stated).
- "the cost ledger's marker WARN is silent only for a blocked pre-build stop" → floor: enum membership +
  integer compare; still a WARN, never a verdict.

## Trust audit (P2)

- The prior baseline and the marker paths are untrusted state under `pharn/.run/`: the slug is regex-gated
  (`FEATURE_SLUG_RE`) before it becomes a path segment, markers are never opened or parsed, and the refusal message
  prints only the validated slug and fixed directory names.

## Determinism audit (P5)

- Every branch is a membership test, a regex match, an `lstat` error-code membership or an integer compare; the
  terminal remedy named in the refusal is a human action.

## Decisions taken (GATE 1 may overturn)

- D1 `.github/actions/` is NOT added (the finding names workflows only; this repo has no `.github/actions/`; P7).
  Recommend: leave for a later finding.
- D2 writes-scope.json: won't-fix + pin + wording correction, for the reason in finding 2.
- D3 the anchor keys on the feature slug derived from `set_by` (no new argv, no new record field), and treats an
  unreadable prior baseline conservatively.
- D4 cost-ledger: narrow rather than downgrade to a NOTE (a NOTE on every blocked pre-build stop is the noise #411 A
  removed).
- G1 dependency: the "legitimate dev edit of ci.yml" text cites the setter refusal G1 lands in this release; if G1
  were dropped, the `--allow-exec-config` sentence in CHANGELOG/contract would need a one-line edit.

## Notes

- `npm run check:surface-bump` will RED on this branch (no SKILLS_VERSION bump, per the batch brief); recorded, not
  fixed. Version citations read `7.3.0`.
- Build Step 0 anchors on this plan; every path is declared above before that step.
