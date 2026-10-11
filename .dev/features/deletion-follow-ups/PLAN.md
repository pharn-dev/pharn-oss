# PLAN — deletion-follow-ups

- spec_content_hash: 75088a82d113bc52cdd3d5fb2e44533e81cba5f520877f5eaa441ced45fb0fd6 # fix #4
- applied_lessons: [L17, L19, L29, L34, L35, L37, L42, L48, L50, L54, L59, L60, L64, L68, L72]
- increment: (A) the always-reconciled set's loader and matcher move out of the reconcile CLI into a core module both `check-bash-reconcile.mjs` and `apply-plan-deletions.mjs` import, behaviour unchanged; (B) `check-bash-reconcile.mjs` judges a path that was present at the anchor and is gone from disk (`git rm`, a committed deletion, an untracked file) against the guards and scopes like any other change, and classifies an upstream merge's deletion `merged`
- layer(s): product floor (`pharn/floor/` — one new core, three edits); product contract (`reconciliation-record.md`); product command (`pharn-build.md`, one claims line); tests; dev guides; repo-meta. No hook, settings file or capability changes; no AGENT write to a trusted doc — the branch also carries the human-applied `LIMITS.md §6` sentence (`83c5829`, Q4), which ships in 6.57.0 and is named in its CHANGELOG entry (amended after grill, G1).
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]
- base: worktree branch `deletion-follow-ups`, cut from `origin/main` at `45107f7` (6.56.0, #338), fetched this run. `pharn/ARCHITECTURE.md` hashed this run with `.dev/floor/hash-doc.mjs` (the pin above). Bumps to **6.57.0** (minor — see `## Version`); renumbered at GATE 2 if `main` moves first.
- lessons index: `node .dev/floor/check-lessons-index.mjs .` exited 0 (GREEN) this run, so the two-step sweep ran: candidates selected from `docs/lessons-index.md`, every cited entry read in full from canon.
- gate1: APPROVED 2026-10-11 by the human, in chat ("approve, implement"), relayed by the orchestrating agent (a human approval relayed, not a model decision), with the RECOMMENDED answer to every open question — Q1 (a), Q2 (a), Q3 (a), Q4 (a), Q5 (a). The `LIMITS.md §6` sentence was committed by the human as `83c5829` before the build anchor. See `## Resolved questions (GATE 1)`.

## Applied lessons

- **L17** — B makes reconcile answer "changed since the anchor" for a deletion, so an upstream merge that deletes a file must not read as "the build deleted outside its scope": §2a's `merged` class is extended to deletions (D3), measured as the would-be false RED P3 below.
- **L19** — this stage's probe ran through Bash under `.pharn/pharn-dev-plan/` (git-ignored scratch, removed before commit); the build's probes go under `.pharn/pharn-dev-build/` and are removed before lint.
- **L29** — the deletion kinds are one enumeration, `DELETION_KINDS`, that the new suite rows iterate (D2), not one test per kind someone remembered.
- **L34** — a run with no deletion adds no candidate; every new "judged" row has a control that stays CLEAN (declared) beside the one that turns ESCAPE (undeclared), so the suite cannot pass by reporting everything clean or everything red.
- **L35** — A: the always-reconciled set's loader and matcher get ONE owner, `reconcile-ignore-core.mjs`; the checker re-exports the same function objects (no second copy), and the helper imports the core, not the CLI.
- **L37** — B's premise was PROBED this run against the live checker (table P1–P5), not read off `reconciliation-record.md` §3; the new bound sentences in D2 are written from those rows and each gets a test.
- **L42** — a deleted path is judged by re-executing `protect-trusted-paths.cjs` NOW and the RECORDED scopes, exactly as a modified path is; no new policy input is replayed, so no new temporal-state trap is added.
- **L48** — B turns a SILENT under-report (an undeclared `git rm` read `CLEAN`) into a LOUD one; the merged extension is the only new softening, and it softens only when every §2a condition holds, listing the path in `merged[]` with a warning, never dropping it.
- **L50** — the sweep for the retracted claim ("an index-removed or untracked deletion is a WARN") enumerates the cites of the referent, the `present at anchor, absent now` branch, by grep this run: the checker's line 658–659, its test (163–205), `reconciliation-record.md` §3, `apply-plan-deletions.mjs` 59–61, `pharn-build.md` 306, `.dev/guides/floor-gates.md` 448–449; `CHANGELOG [6.56.0]` is frozen and gets a new `### Changed` entry instead.
- **L54** — "gone from disk" is decided by `lstat` ENOENT (or ENOTDIR) only; any other `lstat` error is a candidate (fail closed), and a path `lstat` still finds is the WARN branch.
- **L59** — `lstat`, never `stat`/`existsSync`: a dangling or re-pointed symlink left at the path is PRESENT, so it is never misread as a deletion.
- **L60** — each new property has a control that turns it red: undeclared vs declared deletion, upstream deletion merged vs the build's own committed deletion, and an `lstat`-present path that stays a WARN.
- **L64** — every restatement of the changed rule is in `## Files` (the contract §3 and §2a, the checker header, the helper header, the `pharn-build.md` claims bullet, both guides, the CHANGELOG), and each is rewritten from the probe rows, not from memory of §3.
- **L68** — the proposed `LIMITS.md §6` sentence is human-only; it must land outside this build's anchor→verify window (Q4 recommends: committed on this branch after GATE 1 and before `/pharn-dev-build` Step 0).
- **L72** — A renames nothing: `loadIgnoreData`, `isAlwaysReconciled`, `isHumanOnly` and `IGNORE_DATA_PATH` keep their names, signatures and return shape, and stay exported from `check-bash-reconcile.mjs`; the callers were grepped (below) and none changes its import except the helper.

## The triggers (P7), stated honestly

- **A (`apply-deletions-core-extract`).** A real review finding: `.dev/features/plan-declared-deletions/REVIEW.md`, the
  minor P3 finding at `apply-plan-deletions.mjs:59` (the helper is the first non-test product-floor module to import
  the reconcile CLI), accepted at GATE 2 as a stated bound with this named follow-up. The maintainer now asks for it.
- **B (`reconcile-index-removed-deletion`).** A **measured gap, not an observed escape.** Measured in the 6.56.0 plan
  (scenario D: an undeclared `git rm` read `CLEAN`, warning only) and re-measured this run (P1–P5 below). A real run
  shows the path is the one agents take: `pharn-starter`'s `remove-contacts-payments-proposals-reports` (2026-09-14)
  deleted all 11 of its files with `git rm` (its PLAN steps 1 and 7), so every deletion went through the unjudged
  branch; all 11 were declared, so nothing escaped and nothing was missed. No run has been observed in which an
  undeclared deletion passed. So the bar met here is the maintainer's explicit direction plus a measurement — the
  same trigger shape `.dev/guides/lessons.md` records for sub-check D — not L20's "second occurrence". Recorded this
  way because a manufactured failure would be the P0 disease.
- **C (`plan-declared-directory-deletion`) — not built here; the evidence is not "none", so Q5 asks.** See `## C`.

## Measured this run (L37)

A throwaway git repo per row (`.pharn/pharn-dev-plan/probe.mjs`, removed before commit): the real hooks copied in,
scope `["src/in.txt"]` anchored with the real `reconcile-baseline.mjs --anchor`, then the real
`check-bash-reconcile.mjs --require-baseline` at `45107f7`.

| row | action after the anchor                                                      | today                                                                | after this increment (D2/D3)                  |
| --- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------- |
| P1  | `git rm src/out.txt` (undeclared)                                            | exit 0 `CLEAN`, warning `present at anchor, absent now: src/out.txt` | exit 1 `ESCAPE` `src/out.txt`                 |
| P1b | `git rm src/in.txt` (declared)                                               | exit 0 `CLEAN`, same warning                                         | exit 0 `CLEAN`, judged and permitted          |
| P2  | an untracked, non-ignored file present at the anchor, unlinked (undeclared)  | exit 0 `CLEAN`, warning only                                         | exit 1 `ESCAPE` (Q1 a)                        |
| P4  | `git rm --cached src/out.txt` (file kept, not ignored)                       | exit 0 `CLEAN`, no warning (enumerated as untracked, same bytes)     | unchanged                                     |
| P5  | `git rm src/out.txt` + the build's own commit                                | exit 0 `CLEAN`, warning only                                         | exit 1 `ESCAPE`                               |
| P3  | upstream deletes `dep.json`; build commits in scope; `git merge` of upstream | exit 0 `CLEAN`, warning only                                         | exit 0 `CLEAN`, `merged: ["dep.json"]` (Q2 a) |

P3 is why D3 exists: without it, B alone turns the maintainer's own "merge `origin/main` mid-ship" workflow into a
verify `FAIL` whenever upstream deleted a file outside the scope.

## Decisions

### D1 — A: one owner for the always-reconciled set

NEW `pharn/floor/reconcile-ignore-core.mjs` (pure; imports `node:fs`, `node:path`, `node:url` only; no `main`, so no
`runtime-floor.mjs` import — the `reconcile-detail-core.mjs` precedent). It receives, **moved verbatim**, from
`check-bash-reconcile.mjs`: `IGNORE_DATA_PATH` (still `join(HERE, "reconcile-ignore.json")` — the same directory, so
the same file), `loadIgnoreData`, `isHumanOnly`, `isAlwaysReconciled`. `check-bash-reconcile.mjs` imports them and
re-exports them under the same names (the 6.55.0 `ESCAPE_REASONS` precedent), so every existing importer is
untouched. `apply-plan-deletions.mjs` imports from the core; its "LOAD GRAPH" header paragraph is replaced by one line
naming the core. **Behaviour is unchanged by construction:** the same function objects are reachable from both
modules, and every existing assertion in `check-bash-reconcile.test.mjs` and `apply-plan-deletions.test.mjs` passes
unedited by A.

Callers of the moved names (L72, grepped this run):

| caller                            | uses                                                         | after A                                |
| --------------------------------- | ------------------------------------------------------------ | -------------------------------------- |
| `check-bash-reconcile.mjs`        | all four, internally                                         | imports from the core, re-exports them |
| `apply-plan-deletions.mjs`        | `loadIgnoreData`, `isAlwaysReconciled`                       | CHANGED: imports from the core         |
| `check-bash-reconcile.test.mjs`   | `loadIgnoreData`, `isAlwaysReconciled`, `isHumanOnly`        | unchanged (re-exports)                 |
| `reconcile-detail-core.test.mjs`  | `import * as checker` (asserts on `ESCAPE_REASONS` et al.)   | unchanged                              |
| `reconcile-baseline.test.mjs:453` | reads the checker's source text (`anchored_by` not branched) | unchanged                              |

### D2 — B: a deletion is a candidate

In the baseline branch, for each `rel` in `baseline.entries` that the enumeration no longer lists:

- `lstat(rel)` throws `ENOENT` or `ENOTDIR` → **a deletion**: pushed to `candidates` (once — deduplicated against the
  control-surface list) and judged exactly as a modified path is: `protect-trusted-paths.cjs` executed, then the
  recorded scopes, then the default probe. A warning still names it, reworded to
  `present at anchor, absent now — judged as a change: <rel>`.
- `lstat(rel)` throws anything else → a candidate too (fail closed, the "unreadable is changed" rule of §3), with the
  same warning.
- `lstat(rel)` succeeds → the path is still on disk but has left the reconciled set (it became git-ignored, e.g.
  `git rm --cached` plus an ignore rule). **Not judged, a WARN**, worded
  `present at anchor, still on disk, no longer in the reconciled set (git-ignored now?) — not judged: <rel>`. This is
  the existing "ignored paths are invisible" bound (header bound 1), now stated for this case; the ignore-rule change
  itself is a candidate when `.gitignore` is tracked, and invisible when it is `.git/info/exclude` (stated, probed at
  build).

`DELETION_KINDS` (the enumeration the suite iterates, L29): tracked unlinked (already judged today — the control),
`git rm`, `git rm` + commit, untracked unlinked, `git rm --cached` + ignored (stays WARN), upstream merge deletion
(D3), the build's own committed deletion after a merge (D3's anti-laundering control). Each kind runs declared and
undeclared where both apply.

**Exemptions are unchanged and apply first:** a deleted active-slug pipeline artifact (`isPipelineArtifact`) or an
`exempt` path is exempted as a modified one is; an always-reconciled path is never exempt.

**Output shape unchanged:** no new key, no new `reason` member; a deletion escape is
`{ file, denied_by, scope_set_by? }` like any other. `reconciled` counts the new candidates.

### D3 — B: `merged` covers an upstream deletion

`classifyMerged` today skips a path absent at HEAD. It gains the deletion case, iff (a)–(c) hold unchanged and:
(d) the baseline entry is the digest of the path's blob at X (it was committed, unedited, at the anchor); (e) the path
is absent from disk (`lstat` ENOENT/ENOTDIR); (f) it is absent at H **and** absent at M. A deletion the build commits
itself leaves the path present at M (M is upstream's), so it stays an escape — the anti-laundering condition holds for
deletions too. Any git failure keeps the escape. The §2a table gains this as one row-pair, and one test per new
condition (L60).

### D4 — what the 6.56.0 helper gains, and what is unchanged

`apply-plan-deletions.mjs` behaviour is unchanged. Its untracked marked deletions, which 6.56.0 left as "only a WARN"
(grill G1), are now judged against the scope, which holds the bare path, so they read `CLEAN`. Its header and the
`pharn-build.md` claims bullet ("reconcile judges a tracked one") are rewritten to "each one". The scope checks
(`check-regress.mjs`, `check-quick-scope.mjs`) are untouched.

### D5 — what can newly go RED, stated

- An undeclared deletion inside the window, tracked or untracked, through any route: the intended change.
- A maintainer's own **committed** local deletion when a stale `.pharn/reconcile/baseline.json` sits in the checkout
  and `npm run check` runs `check:reconcile` (no `--require-baseline`): an ESCAPE, exactly as a committed local
  modification already is (header bound 6). A fast-forward pull of `main` is classified `merged` by D3. CI has no
  baseline, so `NO_BASELINE` stays green there.
- An untracked, non-ignored file present at the anchor and removed by a tool during the build (Q1 a only). Measured
  nowhere; named so it is not a surprise.

## C — not built in this increment; the evidence is NOT "none" (P6, halt-and-ask)

`plan-declared-directory-deletion` is **not in `## Files`**. But the investigation did not come back empty, so this is
put to the human (Q5) rather than declined on the plan's own say-so. Read this run, in `pharn-starter`'s
`pharn/features/` (the only installed project on this machine with pipeline records; `pharn-web-2` is not present):

- **Removal runs are common, and directories are their natural unit.** 15 feature dirs are named for a removal; 6
  PLANs declared deletions at DIRECTORY/GLOB granularity — `remove-snippets-feature` (`features/snippets/**`),
  `remove-snippets-followup`, `remove-posthog` (`shared/lib/posthog/**`, two skill dirs), `audit-fix-2-remove-features`,
  `audit-fix-1-docs-debris`, `local-checks-cleanup` (21 `__snapshots__/` dirs, `.husky/`). All predate 6.56.0
  (file dates 2026-09-14 … 09-22); they used the "glob in `## Files` + `git rm`" convention (`remove-posthog` revision 3).
- **One recorded failure is directory-shaped.** `local-checks-cleanup` (2026-09-15, `LOOP.md`): `INCONCLUSIVE`; 122 of
  its 288 scope escapes were `.snap` deletions its `## Files` declared as 21 directory entries
  (`` `…/__snapshots__/` — delete directory (rm -rf) ``). Its own `learned` line: "Plan entries for deleted directories
  do not cover the files inside them … Bulk deletions need literal file paths."
- **Counter-evidence.** That failure is fixable today without a new marker: 6.56.0's per-file `(delete)` covers it at
  the cost of listing ~122 lines. `remove-contacts-payments-proposals-reports` removed four route dirs by listing 11
  files ("the four folders go with them" — git tracks no directories). No run SINCE 6.56.0 has been observed failing
  for lack of a directory marker (`drop-workspace-billing`, 2026-10-11, failed only on nine FILE deletions — the 6.56.0
  trigger shape, on a pre-6.56.0 install).
- **What 6.56.0 changed for the old convention.** `/pharn-build` now says "never `rm` or `git rm`", and a marked glob
  is refused (`delete-not-concrete`), so the glob + `git rm` route those six runs used is off-route; a directory now
  means one `(delete)` line per file.

What a directory marker would cost: a recursive unlink over files the PLAN does not enumerate — the helper's per-path
validation (control set, on-disk spelling, containment, links) would range over paths no human read; the scope checks
would need the marked directory to declare its contents; `check-build-complete` would need a second absence rule. It is
a different axis from A+B (`plan-files-core.mjs`, the helper's code, `check-build-complete.mjs`), so it would be its
own increment either way. **Bound, unchanged here:** a marked directory is refused (`not-a-regular-file`); an empty
directory left after its files are unlinked is untracked and invisible to every checker.

## Files

- `.dev/features/deletion-follow-ups/PLAN.md` — this plan.
- `pharn/floor/reconcile-ignore-core.mjs` — NEW: `IGNORE_DATA_PATH`, `loadIgnoreData`, `isHumanOnly`, `isAlwaysReconciled`, moved verbatim (D1); header names its two importers and the stated reason for the split.
- `pharn/floor/reconcile-ignore-core.test.mjs` — NEW: identity pins (`checker.X === core.X` for all four names), the helper's import graph (its source imports the core and never `check-bash-reconcile.mjs`), `IGNORE_DATA_PATH` resolves to the committed `reconcile-ignore.json`, and the core imports no floor CLI.
- `pharn/floor/check-bash-reconcile.mjs` — EDIT: import + re-export the four names (D1); deletion candidates (D2); `classifyMerged` deletion case (D3); header bounds 1 and 6 and the `merged` section restated from the probe rows.
- `pharn/floor/check-bash-reconcile.test.mjs` — EDIT: the 6.56.0 deletions test rewritten over `DELETION_KINDS` (D2), the still-on-disk WARN control, a non-ENOENT `lstat` row (skipped when run as root), and D3's merged-deletion rows with the build-committed-deletion control.
- `pharn/floor/apply-plan-deletions.mjs` — EDIT: import from the core; the LOAD GRAPH paragraph and the untracked "only a WARN" sentence rewritten (D1, D4). No code path changes.
- `pharn/pharn-contracts/reconciliation-record.md` — EDIT: §3 (a deletion is a candidate; the WARN row narrowed to a path still on disk that left the set, and legacy schemas), §2a (the deletion case of conditions d–f), §5 one guarantee-audit line.
- `.claude/commands/pharn-build.md` — EDIT: the claims bullet's "reconcile judges a tracked one" → "each one" (D4); byte ceiling raised only if measured over, by the rule.
- `.dev/guides/floor-checks.md` — EDIT: the reconcile section gains a DELETIONS (6.57.0) paragraph and names the core.
- `.dev/guides/floor-gates.md` — EDIT: the deletions section's load-graph and WARN sentences.
- `SKILLS_VERSION` — EDIT: 6.57.0.
- `CHANGELOG.md` — EDIT: the 6.57.0 entry (`### Changed` for B, the correction of `CHANGELOG [6.56.0]`'s WARN sentence by a new entry, and A as an internal line).
- `README.md` — EDIT: version badge; the generated region (floor checkers 134 → 135) via `npm run docs:generate`.

### Explicitly not touched

- `pharn/floor/reconcile-baseline.mjs` — the record shape is unchanged (no new field; `entries` and `anchored_head` already hold what D2/D3 read).
- `pharn/floor/reconcile-detail-core.mjs`, `render-verify.mjs`, `render-run-report.mjs` — an escape's shape is unchanged.
- `pharn/floor/check-regress.mjs`, `quick-scope-core.mjs`, `scope-inputs.mjs`, `check-build-complete.mjs`, `plan-files-core.mjs` — unchanged.
- `pharn/floor/apply-plan-deletions.test.mjs` — passes unedited (A changes no behaviour); D4's effect is pinned in `check-bash-reconcile.test.mjs`.
- `.claude/hooks/*`, `.claude/settings*.json` — hook-protected and not needed.
- `pharn/CONSTITUTION.md`, `pharn/ARCHITECTURE.md`, `THREAT-MODEL.md`, `LIMITS.md` — hook-protected; see `## Human-applied trusted-doc edit`.
- `.dev/memory-bank/lessons-learned.md` — canon; E goes to `/pharn-dev-memory-promote`, never written here.

## Contracts satisfied

- `reconciliation-record.md` — §2 (verdict shape) and the verdict enum unchanged; §2a and §3 amended as above (P4: the rule lives there once; headers cite it).
- `finding-shape.md` — a deletion escape's finding is the existing shape; `problem` stays free text rendered as DATA.
- `gate-run-record.md`, `verify-report.md` — unchanged: the `reconcile` gate keeps its exit codes.

## Evals / tests to write (P1)

No Capability is added or changed, so no `evals/` pair is owed. `node --test` cases:

- `reconcile-ignore-core.test.mjs` → four identity pins; the helper's import line names the core and not the CLI (anchor asserted found, L60); the core's own imports are `node:` modules only.
- `check-bash-reconcile.test.mjs` → per `DELETION_KINDS` member: undeclared → `ESCAPE` naming the path, declared → `CLEAN`; `git rm --cached` + ignore → `CLEAN` with the still-on-disk WARN (control: not a candidate); a parent made unreadable → candidate (skipped as root); D3: upstream deletion merged → `CLEAN`, `merged` lists it; the build's own committed deletion after the merge → `ESCAPE`; each D3 condition broken once → stays `ESCAPE`.
- Existing suites (`apply-plan-deletions.test.mjs`, `check-quick-scope.test.mjs`, `reconcile-detail-core.test.mjs`) pass unedited.

## Guarantee audit (P0)

- "a path present at the anchor and gone from disk at verify is judged like a write" → floor: content-hash baseline membership (primitive #2) + `lstat` ENOENT + path/scope membership (primitive #3), executing the real guard (delegation).
- "an upstream merge's deletion is `merged`, the build's own committed deletion is not" → floor within the non-adversarial claim: object-id equalities and git exit codes, one test per condition; bounded by §2a's existing list (a Bash-movable `origin/HEAD`).
- "A changed no behaviour" → floor-tested identity (`===`) of the exported functions + the unedited suites passing; "moved verbatim" → advisory (the build shows `git diff --color-moved`).
- "a deletion of a path still on disk but now ignored is reported" → a WARN only, stated as a bound, not a guarantee.
- **Struck:** "deletions are prevented" (Bash); "a CLEAN reconcile means no file was deleted" (ignored paths, the window, a forged baseline — bound 5); "every deletion is attributed" (no attribution).

## Trust audit (P2)

- Paths read from the baseline (unauthenticated `.pharn/` state) become `lstat` operands, object keys and git
  pathspecs under `GIT_LITERAL_PATHSPECS` with `execFileSync` argv — the existing discipline; no shell, no regex
  source. A forged baseline entry naming a path that never existed now makes it a candidate (a possible false RED,
  the loud direction) instead of a warning.

## Determinism audit (P5)

- Every new branch is a membership test (`lstat` error code ∈ {ENOENT, ENOTDIR}; path ∈ baseline ∖ enumeration;
  absent ∈ ls-tree result); every unusable answer keeps the path a candidate or an escape (fail closed), never a guess.

## Version

**Minor, 6.57.0.** B changes a shipped floor checker's verdicts — an undeclared `git rm`, committed or untracked
deletion was `CLEAN` and is now `ESCAPE` — and adds a shipped module (the core). It is not a patch: no shipped text was
wrong about the behaviour (6.56.0 stated the WARN correctly); the behaviour itself changes. It is not major: the
output shape, verdict enum, exit codes and record format are unchanged, so no install breaks; the 6.52.0 and 6.54.0
reconcile-verdict changes were minor too. `MIN_CLI` unchanged: no installed path moves (the 6.55.0 new-core
precedent).

## Human-applied trusted-doc edit — `LIMITS.md §6` (D, NOT applied by the agent)

`LIMITS.md` is hook-denied to the agent. Proposed text for the maintainer to paste, describing the state AFTER this
increment (B closes the gap, so the note records the new behaviour rather than the old gap). **Insert** it in the
bullet that begins "**It IS detected AFTERWARDS, as of `SKILLS_VERSION` 4.0.0**", directly after the sentence ending
"…or a forged snapshot, is not." and before "**The supported claim is exactly…**":

> Since 6.57.0 a deletion is judged like a write: a path present at the anchor and gone from disk at verify — removed
> with `rm`, with `git rm`, or by a commit, tracked or untracked — fails the stage when no recorded scope covers it,
> unless upstream deleted it in a merge inside the window (`merged[]`). A path still on disk that has left the
> reconciled set, because it became git-ignored, is only a warning.

Timing (L68): reconcile has no attribution, so the human's edit must land OUTSIDE this build's anchor→verify window,
and committed (since 6.53.0 an uncommitted trusted-doc edit REDs `npm run check`). Q4.

## Lesson candidate for GATE 2 (E — not written here)

Candidate: "a refusal that guards a filesystem action must compare the file's on-disk identity (`realpath.native`
spelling or `dev`/`ino`), not the lexical spelling". It goes to `/pharn-dev-memory-promote` at GATE 2 (Step 2b) of this
run, with source `.dev/features/plan-declared-deletions/REVIEW.md` F1 (the blocking finding: `LIMITſ.md`, U+017F,
deleted `LIMITS.md` on APFS) and feature `plan-declared-deletions`. **Duplicate check, run this run:** `grep -i` over
`.dev/memory-bank/lessons-learned.md` for `realpath`, `dev/ino`, `dev:ino`, `case-insensitive`, `case-fold`,
`U+017F`, `on-disk` and `lexical` found **no entry**. Nearest neighbours, to cite as distinct in the entry: **L36**
(an enumerated value's variant spellings — lexical, inside one set), **L54** / **L59** (a follow-call answers for the
target — link-vs-target identity, not filesystem equivalence of names). The 6.31.1 hook change (judge the filesystem's
target) was never promoted. The product canon is not the target (`.dev/` lesson).

## Amended after grill

`/pharn-dev-grill` (`GRILL.md`) raised three advisory concerns; all are inside the approved intent, `## Files` is
unchanged, and the GATE-1 answers stand.

- **G1** — the header no longer says "no trusted doc changes": `LIMITS.md` changes on this branch by the human's
  `83c5829`, and the 6.57.0 CHANGELOG entry names that sentence (no agent write to `LIMITS.md`).
- **G2** — the "parent made unreadable" row must assert it reached the NEW `lstat` branch (the path is a candidate,
  the verdict is not `INCONCLUSIVE` from enumeration). If git's own enumeration fails first on the fixture, the row is
  replaced by a fixture that reaches the `lstat` error (or dropped, with the reason stated in the test file), never
  kept passing on the wrong branch.
- **G3** — D3's (f) for a deletion: `blobAt` must return `{ absent: true }` at BOTH H and M; a `null` at either (a
  non-blob, a gitlink, an unusual mode, a git failure) keeps the escape — fail closed, pinned by one row (upstream
  replaces the file with a directory → stays an escape).

## Amended after review (GATE 2: fix-first)

The orchestrator decided fix-first at GATE 2, under the human's delegation, on `REVIEW.md`'s three advisory findings.
Every fix stays inside `## Files`; no path was added.

- **F1 (important)** — D2's "lstat still finds it → WARN" was reachable with no ignore rule: a case-only rename on a
  case-insensitive volume and a parent directory replaced by a symlink (CLEAN on macOS, ESCAPE on Linux). The WARN
  now needs git's own proof: `ignoredByGit` (`git check-ignore --stdin -z --no-index`, the path on stdin, exit 0 and
  the path echoed back). Any other answer makes the path a candidate. `GIT_LITERAL_PATHSPECS` is deliberately not set
  there: check-ignore refuses it (exit 128, measured). Rows added: the case alias (staged and committed; skipped with
  its reason on a case-sensitive tmp volume), the symlinked parent, and `ignoredByGit` members/non-members.
- **F2** — §3 names the second invisible ignore route, a new untracked `.gitignore` that ignores itself (`*`), and a
  row pins it as the stated bound (CLEAN, WARN).
- **F3** — "a deletion the build commits itself stays an escape" is qualified in §2a, the checker comment and the
  CHANGELOG: not when upstream removed the same path in the window (the "whoever wrote them" bound).
- The human-applied `LIMITS.md §6` sentence ("A path still on disk that has left the reconciled set, because it
  became git-ignored, is only a warning") is true after F1 without a LIMITS edit.

## Self-checks (plan stage)

- `node pharn/floor/check-plan-lessons.mjs .dev/features/deletion-follow-ups/PLAN.md .dev/memory-bank/lessons-learned.md`
  → exit 0 GREEN, all 15 cited ids resolve and are referenced in the body (the declaration, never the application —
  P0).
- L71 count, measured with `plan-files-core.mjs` (the setter's parity copy, so the live scope record is left alone):
  13 `## Files` bullets, 13 parsed paths, 13 concrete, 0 marked `(delete)` — no glob, no placeholder.
- Prettier and markdownlint run over this file only (L13). The probe script under `.pharn/pharn-dev-plan/` was removed.

## Resolved questions (GATE 1)

All five resolved by the human at GATE 1 (relayed in chat by the orchestrating agent): the recommended option (a)
each. No open question remains.

- **Q1 → (a)**: every baseline path gone from disk is a candidate — `git rm`, committed and untracked deletions (D2).
- **Q2 → (a)**: `merged` is extended to upstream deletions (D3).
- **Q3 → (a)**: A and B ship as one increment, 6.57.0.
- **Q4 → (a)**: the human committed the `LIMITS.md §6` sentence on this branch as `83c5829` (verbatim the proposed
  text, inserted where proposed), before `/pharn-dev-build` Step 0, so it lands outside the anchor→verify window (L68)
  and ships in 6.57.0. The 6.57.0 CHANGELOG entry names it; no agent write touches `LIMITS.md`.
- **Q5 → (a)**: directory deletion stays out of this increment, deferred until a post-6.56.0 run that a per-file list
  cannot reasonably serve.

The questions as asked at GATE 1:

- **Q1 — B's domain.** (a) every baseline path gone from disk: `git rm`, committed deletion AND an untracked file —
  one rule over the reconciled set, which already treats tracked and untracked alike for writes; closes 6.56.0's G1
  [recommended]; (b) only paths tracked at the anchored commit (needs `anchored_head`; a legacy baseline and an
  untracked file stay WARN; more git calls, a distinction no failure motivates).
- **Q2 — upstream deletions.** (a) extend `merged` to deletions (D3) [recommended: P3 shows B alone REDs the
  merge-mid-ship workflow]; (b) leave `merged` as is and accept that RED.
- **Q3 — one increment or two.** (a) A + B in one increment, 6.57.0 [recommended: both edit `check-bash-reconcile.mjs`
  and the helper's header, A changes no behaviour and is pinned by identity, so it does not confound attribution, and
  one PR avoids two bumps over the same lines]; (b) A first as a patch (6.56.1), then B as 6.57.0.
- **Q4 — the `LIMITS.md §6` sentence.** (a) the human commits it on this branch after GATE 1 and before
  `/pharn-dev-build` Step 0, so it rides 6.57.0 and sits outside the window [recommended]; (b) a separate human PR
  after merge, with its own patch bump and CHANGELOG entry; (c) do not add it.
- **Q5 — C (directory deletion).** (a) keep it OUT of this increment and defer: re-open it as its own increment on the
  first post-6.56.0 run that a per-file list cannot reasonably serve (the pre-6.56.0 failure is fixable by listing
  files) [recommended — the strict P7 reading]; (b) accept `local-checks-cleanup` (plus six directory-granular
  removal PLANs) as the trigger and plan it as the NEXT increment, after this one; (c) fold it into this increment (not
  recommended: a different axis, and it enlarges the helper's unlink domain).
