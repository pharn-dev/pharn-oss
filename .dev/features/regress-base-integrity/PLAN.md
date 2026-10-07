# PLAN — regress-base-integrity: a regress `no-regressions` never rests on base evidence that cannot show a regression

- spec_content_hash: 75088a82d113bc52cdd3d5fb2e44533e81cba5f520877f5eaa441ced45fb0fd6
- applied_lessons: [L17, L31, L34, L35, L39, L41, L43, L44, L71]
- increment: close the five false-green paths the 2026-10-07 audit reproduced in `/pharn-regress` (P1-B, P2-C, P2-D, P2-E,
  P3-O(a)) — `/pharn-ship` passes the base it captured at GATE 1, a comparison with nothing under test or over unreliable
  base evidence stops instead of reading `no-regressions`, the base worktree leaves the project tree, a total-glob
  `## Files` entry is refused, and the report records how its base was chosen.
- layer(s): pharn-floor (product), pharn-contracts (two contracts), product `.claude/commands` (`/pharn-ship`, its quick
  part, `/pharn-regress`)
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]

## Base

- `origin/main` = `052709d` (SKILLS_VERSION 6.49.2), fetched this run; branch `fix/regress-base-integrity` cut from it.
- Trigger (P7): the production-readiness audit of 2026-10-07 (findings P1-B, P2-C, P2-D, P2-E, P3-O), each REPRODUCED by a
  fixture under the session scratchpad (`regress-chain/f1*.mjs`, `f2`, `f3`, `f6`), re-run by this plan against this
  worktree before any change. Delegated by the maintainer through the orchestrator (brief B1).

## Before — the audit fixtures re-run at `052709d` (this worktree, unchanged)

| fixture                                                     | result at `052709d`                                                                                    |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| f1 build committed, feature dir untracked (dirty ⇒ HEAD)    | `base` = the build commit, `inside` = PLAN/SPEC only, `test {base:1, head:1}` → **`no-regressions`**   |
| f1 control (build uncommitted)                              | `regressions: ["test"]` (correct)                                                                      |
| f1b everything committed + pushed (merge-base = HEAD)       | `base == HEAD`, `inside: []` → **`no-regressions`**                                                    |
| f2 base `test` times out, head fails fast                   | base run `{exit:1, timed_out:true}` → `pre_existing` → **`no-regressions`**; REGRESSION.md silent      |
| f3 `**` in `## Files`                                       | regress **clean** over undeclared `src/evil.js` + `ROOTFILE.txt`; quick-scope exit 0; setter drops it  |
| f3 `*` / `**/*`                                             | partial: `*` covers every root file, `**/*` every nested one; the setter drops both                    |
| f3 `.`                                                      | covers nothing in either reader (setter keeps `.`; the hook's anchored regex matches no real path)     |
| f6 `--no-install`, base resolves HEAD's `node_modules`/.bin | base `test` printed `RESOLVED FROM <project>/node_modules/mydep`, `typecheck` ran HEAD's `.bin/mytool` |

## Confirmed current behavior (read this run)

- **BASE_RULE** `stage-regress-core.mjs` `resolveBaseSource`: explicit `--base` → dirty tree ⇒ `HEAD` → `merge-base HEAD
origin/main` → ask. `phaseBase` turns the source into a SHA and **records nothing about the source**.
- `/pharn-ship` (`pharn-ship.md` step 6 and Step 2b.2) runs `stage-direct.mjs --stage pharn-regress … --budget-ms 570000`
  with **no `--base`**; `/pharn-loop` captures `git rev-parse HEAD` at S3 and passes `--base '<base sha>'`
  (`pharn-loop.md` Step 1a.3, Step 5.2). `stage-direct.mjs` forwards `--base` verbatim. `pharn-ship-quick.md` item 7
  re-derives the scope check's base by the same dirty/merge-base rule.
- **check-regress verdict** classifies `base≠0` as `pre_existing` from `stampToMap` (exits only); `timed_out` is never
  read. `regress-base-reuse-core.mjs` `unreliable()` already refuses a timed-out base gate as REUSABLE evidence.
- **The base worktree** is `REGRESS_PATHS.base = .pharn/pharn-regress/base`, nested in the project; `run-gates.mjs init
--cwd` takes it, and the stamp drops `cwd` at finalize (`run-gates.mjs:1111`). `entry-gates.mjs:522` refuses its base
  slot while that path stands. `/pharn-dev-regress` already puts its base worktree in `$TMP`.
- **check-loop-fresh check E** (`loop-fresh-core.mjs:620`) re-derives the regress verdict from the two stamps with ONLY
  `verdict --base-stamp --head-stamp --base` and compares `verdict, regressions, pre_existing, outside_gates`. So any new
  rule inside `check-regress verdict` must be a function of the stamps alone, or the loop reads its own honest
  inconclusive as `report-verdict-mismatch` (S11 "fabricated") — this decides where each rule below lives.
- **partitionScope** matches declared entries as globs (`**` spans everything); `set-writes-scope.cjs` `isConcrete()`
  drops any entry holding `*`, `?`, `<`, `>`. `FEATURE_SLUG_RE` in `check-regress.mjs:167` is a private, looser copy of
  `gate-run-core.mjs`'s export; every `.dev/features/*` directory already matches the stricter export.

## What this increment does (by item of brief B1)

1. **P1-B — `/pharn-ship` captures its base at GATE 1.** Right after `check-spec-approved.mjs` exits 0 (before the run
   marker opens), one pinned line `git rev-parse --verify HEAD`; its printed SHA is substituted literally as
   `<base sha>` into both regress lines (`--base '<base sha>'`, as the loop's) and into quick item 7, which stops
   re-deriving its base. Non-zero → STOP (no commit to compare against), through Steps 3/3a like every STOP.
   `/pharn-regress` standalone keeps BASE_RULE (it has no run start to capture) and now says so, records the source, and
   tells the reader to pass `--base` after committing.
2. **The vacuous comparison stops (`no-change-under-test`).** After the partition, `inside` minus the closed exemptions
   (this feature's pipeline artifacts + the four trusted docs — `check-regress.mjs`'s own sets, one owner) empty ⇒ the
   HEAD side would judge exactly the base's non-exempt bytes, so no outcome is a feature effect. The stage then REFUSES
   `no-change-under-test` before any gate runs (no report; REGRESSION.md names base, source and remedy). This covers
   base == HEAD (f1: only PLAN/SPEC changed; f1b: nothing changed) and base tree == HEAD tree, and any other base with
   nothing non-exempt changed. See Open question Q1 for the reading of the brief's wording.
3. **P2-C — a timed-out base gate that masks a red head is `inconclusive`.** In `check-regress verdict` (stamp path):
   a gate whose base run `timed_out` and whose head exit ≠ 0 makes the verdict `inconclusive`, `reason_code`
   `base-timed-out` (exit 2), `outside_gates`/`pre_existing`/`regressions` still computed; a `base_timed_out: [ids]` key
   appears whenever any base run timed out. A timed-out base under a green head is not masking anything and stays as
   before. Stamp-only, so check E re-derives the identical verdict. The predicate `timedOutRunIds(stamp)` moves to
   `gate-run-core.mjs` and `unreliable()` calls it (one owner, L35).
4. **P2-D — the base worktree leaves the project tree.** Created by `mkdtempSync(<realpath(os.tmpdir())>/pharn-regress-
base-<12 hex of sha256(realpath(cwd))>-)`, so Node's parent `node_modules` walk and npm's ancestor `.bin` PATH no
   longer reach the HEAD tree; refused `path-containment` if that directory would sit inside the project (a TMPDIR
   pointing into it). Recorded in the progress record (schema `/4`, `baseWorktree`, validated on resume against this
   project's prefix and the temp root — a forged record cannot aim the clear at another directory); cleared at every
   fresh start and at the worktree phase by registration + name prefix (this project's only, so sibling worktrees'
   runs are untouched) and at the legacy nested path (an upgrade leftover); removed at cleanup. A cleanup error renders
   with the path replaced by `<base worktree>`, so no absolute path reaches REGRESSION.md (G10).
   **Why that alone is unsound, so a second rule ships with it:** outside the tree, a `--no-install` or failed/timed-out
   install leaves the base with no dependencies, its gates go red, and a red head reads `pre_existing` — the documented
   `regress-failed-install-false-green` class, now reachable by `--no-install` too. So after the verdict, when the base
   side was produced here with an unreliable install (`--no-install` over a manifest, or an install that exited ≠ 0 or
   timed out) and the checker said `no-regressions` while some gate was red on both sides, the stage REFUSES
   `base-install-unreliable` (no report). A `no-manifest` install, reused and entry-derived evidence are not unreliable.
   This closes `regress-failed-install-false-green` (Q3).
5. **`base_source`** — closed enum `explicit | dirty-head | merge-base` (`BASE_SOURCES`, `stage-regress-core.mjs`;
   `resolveBaseSource` returns these names), carried in the progress record, appended to `regression-report.json` as
   an additive top-level key after `head_install`, rendered on REGRESSION.md's base line (with a warning under
   `dirty-head`), and named on every refusal rendered after the base phase. Contract: `regression-report.md`.
6. **P2-E — total globs are refused, dropped globs reported.** `check-regress.mjs` `declaredClasses(declared)` splits
   the declared patterns: a TOTAL glob (after `normPath`, every character is `*` or `/` — `**`, `*`, `**/*`, `*/**` — or
   the entry `.`) and the entries the write hook does not enforce (`set-writes-scope.cjs` `isConcrete`, imported from
   `plan-files-core.mjs`, which already holds the byte-faithful copy — build-time correction: the first cut copied it a
   third time; L31/L35). `partitionScope` excludes total globs from matching
   (a caller that forgets to refuse still sees the escapes) and returns `totalGlobs` + `unenforcedGlobs`. The callers
   refuse a total glob: `stage-regress.mjs` → `refused plan-files-total-glob`; `quick-scope-core.mjs` and the `scope`
   CLI → exit 2 `total-glob-declared`. `unenforced_globs` is reported in scope.json, the quick check's document and
   REGRESSION.md (advisory: "the write hook does not allow these; a Write-tool write they cover is denied"). Narrow
   globs (`src/foo/*.ts`, `vendor/**`) keep their meaning.
7. **P3-O(a)** — `check-regress.mjs` imports `FEATURE_SLUG_RE` from `gate-run-core.mjs`; the private copy is deleted
   (L35); the slug parity test gains the assertion that check-regress holds no copy and imports the export.

Docs: `/pharn-regress`'s command text (base selection, the three new refusals), the regress-report and stage-exit
contracts, `.dev/guides/floor-gates.md` (stage-regress and quick-scope sections), README's Regress bullet (base
selection), CHANGELOG. LIMITS.md is human-only: a proposed text goes in the final report.

## Applied lessons

- L17 — the "nothing under test" set is `inside` minus EXACTLY `check-regress.mjs`'s closed exemptions (changed-since-base
  is the question; the exemptions are already the answer to "not the build's"), imported, never re-listed.
- L31 — `isConcrete` lives in a CJS hook the floor cannot import, so its floor copy (`plan-files-core.mjs`) is a
  deliberate copy pair: check-regress imports that copy, and a parity test reads the hook's function source and the
  copy's and pins them equal, so the obligation has something ranging over it.
- L34 — `no-change-under-test` is this lesson's shape at the stage level: a verdict quantified over "gates that flipped"
  is vacuously `no-regressions` when nothing under test changed; the domain is asserted non-empty before gates run.
  Every new test also asserts its non-vacuity (a control case that does NOT trip the rule).
- L35 — `timedOutRunIds` gets one owner (gate-run-core) used by both reuse and verdict; `FEATURE_SLUG_RE`'s private copy
  is deleted, not synced; the base SHA has one capture point per run.
- L39 — P2-E is this lesson's two-consumer divergence on `## Files`; the fix makes the second consumer refuse the entry
  the first silently drops and REPORT the ones the hook does not enforce, instead of reading one declaration two ways.
- L41 — the tests that today prove "no base worktree after a HIT" with `existsSync(REGRESS_PATHS.base)` would pass
  vacuously once the worktree moves; each is rewritten to look at the new location (prefix listing in the temp root),
  and the default (no `--base`) path of `/pharn-regress` keeps a test of its own (the f1/f1b fixtures run without it).
- L43 — the timed-out rule reads the base stamp only, so check E's stamps-only re-derivation agrees with the report; the
  two rules that need inputs a stamp does not hold (inside, install) are stage refusals that write no report, so no
  mismatch can be manufactured between a report and its re-derivation.
- L44 — `/pharn-ship`'s base is printed by one block and substituted literally as `<base sha>` into later lines; no
  shell variable carries it.
- L71 — "report dropped globs" is L71's missing plan-gate comparison made visible at the scope check: every declared
  entry the setter drops is listed (`unenforced_globs`), so 37 bullets vs 35 paths is no longer silent there.

## Files

- `.dev/features/regress-base-integrity/PLAN.md` — **NEW.** this plan
- `pharn/floor/check-regress.mjs` — **EDIT.** shared slug import; `timedOutRunIds` masking rule (`base-timed-out`,
  `base_timed_out`); `declaredClasses` + total-glob exclusion in `partitionScope`; `changedUnderTest`; `scope` CLI refusal
- `pharn/floor/check-regress.test.mjs` — **EDIT.** tests for every rule above, with controls
- `pharn/floor/gate-run-core.mjs` — **EDIT.** export `timedOutRunIds(stamp)`
- `pharn/floor/gate-run-core.test.mjs` — **EDIT.** `timedOutRunIds`; slug parity extended to check-regress
- `pharn/floor/regress-base-reuse-core.mjs` — **EDIT.** `unreliable()` calls `timedOutRunIds`
- `pharn/floor/stage-regress-core.mjs` — **EDIT.** `BASE_SOURCES`, `resolveBaseSource` names, `REGRESS_PATHS.legacyBase`,
  progress schema `/4` (`baseSource`, `baseWorktree`), `BASE_WORKTREE_NAME_RE`, `unreliableInstallMasking`
- `pharn/floor/stage-regress-core.test.mjs` — **EDIT.** the core changes
- `pharn/floor/base-worktree.mjs` — **NEW.** the temp base worktree's name, placement check, creation, prefix clear and
  resume validation (one axis: where the BASE checkout lives; grill P3)
- `pharn/floor/base-worktree.test.mjs` — **NEW.** its tests (placement, clear safety on links/foreign entries, validation)
- `pharn/floor/stage-regress.mjs` — **EDIT.** calls base-worktree.mjs; base source; the three refusals; report key;
  render inputs; cleanup-error path redaction
- `pharn/floor/stage-regress.test.mjs` — **EDIT.** f1/f1b/f2/f3/f6 scenarios through the real script; relocated-worktree
  assertions
- `pharn/floor/render-regression.mjs` — **EDIT.** base-source line + dirty-head warning; timed-out line; unenforced globs;
  base on refusals
- `pharn/floor/render-regression.test.mjs` — **EDIT.** the render changes
- `pharn/floor/stage-exit-core.mjs` — **EDIT.** regress `refused` gains `no-change-under-test`, `plan-files-total-glob`,
  `base-install-unreliable`; `unusable` gains `base-worktree-unplaceable`; the `install-unresolved` question text names
  the skip option's cost
- `pharn/floor/stage-exit-core.test.mjs` — **EDIT.** the regress refused set
- `pharn/floor/quick-scope-core.mjs` — **EDIT.** refuse a total glob (`total-glob-declared`); report `unenforced_globs`
- `pharn/floor/check-quick-scope.test.mjs` — **EDIT.** the quick-scope changes
- `pharn/floor/entry-gates.mjs` — **EDIT.** `REGRESS_PATHS.legacyBase` (renamed key; same path, same leftover check)
- `pharn/floor/instruction-files.mjs` — **EDIT.** its `--base-rule` reads `resolveBaseSource`, whose dirty-tree kind is
  now `dirty-head` (added at /pharn-dev-regress: the outside `check-instruction-files` and `stage-verify` suites went
  red at HEAD — the regression this stage exists to catch)
- `pharn/floor/entry-base-evidence.test.mjs` — **EDIT.** renamed key; "no base worktree" checks the temp location
- `pharn/pharn-contracts/regression-report.md` — **EDIT.** `base_source`, `base_timed_out`, the new inconclusive code,
  `unenforced_globs`, the three refusals
- `pharn/pharn-contracts/stage-exit.md` — **EDIT.** regress refused codes; progress schema `/4`
- `.claude/commands/pharn-ship.md` — **EDIT.** GATE-1 base capture; `--base '<base sha>'` on both regress lines
- `.claude/commands/pharn-ship-quick.md` — **EDIT.** item 7 uses the GATE-1 base
- `.claude/commands/pharn-regress.md` — **EDIT.** base selection + `base_source`; the three refusals; temp worktree
- `.dev/floor/command-hygiene.test.mjs` — **EDIT.** `DIRECT_STAGE_WIRING` ship `extra`; the GATE-1 capture line pinned;
  ceilings only if measured over
- `.dev/guides/floor-gates.md` — **EDIT.** stage-regress + quick-scope sections
- `README.md` — **EDIT.** Regress bullet: how the base is chosen; badge
- `SKILLS_VERSION` — **EDIT.** minor bump (verdict semantics)
- `CHANGELOG.md` — **EDIT.** new version section
- `.dev/features/regress-base-integrity/GRILL.md` — **NEW.** written by /pharn-dev-grill under its own scope
- `.dev/features/regress-base-integrity/REGRESSION.md` — **NEW.** /pharn-dev-regress (+ the before/after fixture table)
- `.dev/features/regress-base-integrity/regression-report.json` — **NEW.** /pharn-dev-regress
- `.dev/features/regress-base-integrity/VERIFY.md` — **NEW.** /pharn-dev-verify
- `.dev/features/regress-base-integrity/verify-report.json` — **NEW.** /pharn-dev-verify
- `.dev/features/regress-base-integrity/REVIEW.md` — **NEW.** /pharn-dev-review
- `.dev/features/regress-base-integrity/SHIP.md` — **NEW.** /pharn-dev-ship roll-up

Generated files `npm run docs:generate` rewrites (contracts/commands/floor in `docs/capabilities/**`, README markers) are
added here by exact path once the generator names them, with a setter re-run and `--amend-scope`.

## Contracts satisfied

- `pharn/pharn-contracts/regression-report.md` — additive keys only; `verdict` enum unchanged; consumers read named fields.
- `pharn/pharn-contracts/stage-exit.md` — three refused codes added to the regress registry (closed set, both directions).
- `pharn/pharn-contracts/gate-run-record.md` — unchanged: stamps are read, never reshaped.

## Evals to write (P1)

No Capability is added or changed (floor + commands only); P1's eval obligation does not arise. Each executable change
ships with a test that fails at `052709d` and passes after (checked by running the new tests against a stash of the old
module where practical, and by the fixture table).

## Guarantee audit (P0)

- "`check-regress verdict` never says `no-regressions` when a red head gate's base run timed out" → floor: enum/exit-code
  over the stamp (`timed_out` boolean + exit ints), stamp path only. Bound (L43): the stamp's internal consistency, not
  provenance.
- "a regress with no non-exempt change since base never reads `no-regressions`" → floor: set membership (closed
  exemptions) at the partition. Bound: changed-since-base (L17); a partially committed build with any other dirty
  non-exempt path still compares against a base that holds the committed part — named residual
  `regress-partial-commit-base`, closed only by an explicit `--base` (which `/pharn-ship` and `/pharn-loop` now pass).
- "`/pharn-ship` compares against the commit it started from" → **advisory**: the capture and the substitution are
  orchestration (L19); the floor part is that `stage-regress` resolves and records `--base`, and `base_source: explicit`
  in the report shows it was passed.
- "base gates cannot resolve the HEAD tree's `node_modules`/`.bin`" → **advisory** (a tested structural property: the
  directory is outside the project and Node/npm walk ancestors only; no floor primitive) — narrowed: an inherited `NODE_PATH`, `$HOME/.node_modules`, global installs and
  a `node_modules` in an ancestor of the temp root are still reachable (named bound).
- "a `no-regressions` never rests on a base produced by an unreliable install where a gate was red on both sides" →
  floor: membership over the stage's own install record + the checker's `outside_gates`. Bound: the install record is
  `.pharn/` state while a chain is paused (the existing `regress-paused-chain-integrity` bound).
- "a total-glob `## Files` entry is refused by both scope checks" → floor: regex over the normalized entry. Bound: a
  broad-but-not-total glob (`**/*.js`) is allowed and still diverges from the hook (reported in `unenforced_globs`,
  advisory).
- "`base_source` says how the base was chosen" → floor for the value (closed enum set by code from argv/git); the
  rendered line is advisory text.

## Trust audit (P2)

- `## Files` text (untrusted) becomes only declared patterns; the new classification is a regex over them, and
  `unenforced_globs` entries render fenced as DATA (`quoteData`), JSON-escaped in the documents.
- The temp path and git paths never enter a shell string; the base path travels as an argv element and is redacted from
  rendered cleanup errors.

## Determinism audit (P5)

Every new branch is a membership/equality test: `BASE_SOURCES` membership; `timed_out === true ∧ head ≠ 0`; set
difference against the closed exemptions; a regex over the normalized entry; install kind/exit/timedOut equality.
Terminal fallbacks are refusals with closed reason codes (a human resolves them), never a guess.

## GATE 1 record — questions RESOLVED (delegated orchestrator decision, not a human approval)

The orchestrator approved the plan and answered **Q1 (a), Q2 (a), Q3 (a), Q4 (a), Q5 (a)**: an empty non-exempt changed
set is what makes the comparison meaningless (Q1); refusals that check E never has to re-derive keep S11 intact (Q2);
moving the worktree without the install refusal trades one masking for another (Q3). Version: claim the next free number
when the PR opens (runtime-floor claims 6.50.0 and merges first); after runtime-floor lands, every gated CLI's first import
is `import "./runtime-floor.mjs";`.

### Grill amendments (advisory findings folded in, after GATE 1)

- P3: the temp base-worktree lifecycle moves to its own module, `pharn/floor/base-worktree.mjs` (+ test).
- P0: "base gates cannot resolve the HEAD tree's deps" is a tested structural property, labeled advisory below.
- Error handling: one closed unusable code, `base-worktree-unplaceable` (temp root inside the project, or mkdtemp failed),
  in place of reusing `path-containment`.
- Security: the prefix clear acts only on an lstat'd real directory owned by this uid; a link is unlinked, never
  followed; every removal is best-effort.
- Ship: the GATE-1 capture is never re-run later in a run; a run that no longer holds `<base sha>` STOPs.
- Registry text: `install-unresolved`'s skip option says a both-sides-red gate then stops the stage.

### The questions as asked

- **Q1 (brief item 2 wording).** The brief says "base == HEAD … and the changed set **holds** non-exempt paths →
  inconclusive". Read literally that is the legitimate uncommitted-build case (f1's control, which correctly finds the
  regression). I read it as the audit states it: **no** non-exempt changed path ⇒ stop. I also drop the base == HEAD
  precondition, because the vacuity is the empty non-exempt set itself (base == HEAD, base tree == HEAD tree, or any
  base with nothing non-exempt changed). Options: (a) as planned; (b) restrict to base commit == HEAD commit or equal
  trees, else unchanged.
- **Q2 (refusal vs verdict).** Items 2 and 4b are stage REFUSALS (no report), not a checker `inconclusive`, because check
  E re-derives the verdict from stamps alone and would call an inconclusive it cannot reproduce a fabricated report
  (S11). Both still mean "never `no-regressions`" with a closed reason code; ship stops on the missing report, the loop
  maps `refused` to S9. Options: (a) as planned; (b) put them in the checker and teach check E the extra inputs.
- **Q3 (install rule).** Moving the worktree outside alone makes `--no-install` mask regressions (f6 would read
  `pre_existing` instead of resolving HEAD's deps). So `base-install-unreliable` ships with it and closes the named
  `regress-failed-install-false-green` residual. Options: (a) both; (b) outside only, document the new masking.
- **Q4 (quick item 7).** `/pharn-ship --quick`'s scope check uses the same GATE-1 base instead of re-deriving it
  (a committed build would otherwise empty its `inside` too). Options: (a) include; (b) leave quick unchanged.
- **Q5 (timed-out scope).** Inconclusive only when the timed-out base gate is red at head (the only case that masks).
  Options: (a) as planned; (b) any timed-out base run → inconclusive.
