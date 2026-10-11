# PLAN — plan-declared-deletions

- spec_content_hash: 75088a82d113bc52cdd3d5fb2e44533e81cba5f520877f5eaa441ced45fb0fd6 # fix #4
- applied_lessons: [L1, L3, L17, L19, L20, L22, L29, L34, L35, L36, L37, L39, L54, L55, L59, L60, L69, L71, L72]
- increment: a PLAN's `## Files` item may carry the marker `` `path` (delete) ``; `/pharn-build` removes every marked path through one pinned floor CLI (`pharn/floor/apply-plan-deletions.mjs`), and `check-build-complete.mjs` requires a marked path ABSENT (an unmarked one still present), so `/pharn-ship`, `/pharn-loop` and their `--quick` modes can delete files and still go green
- layer(s): product floor (`pharn/floor/` — one new CLI, three edits); product contracts (`verify-report.md`, `reconciliation-record.md`); product commands (`pharn-build.md`, `pharn-plan.md`, `pharn-ship.md`, `pharn-ship-close.md`); tests; dev guide; repo-meta. No hook, settings file, trusted doc or capability changes.
- constitution_refs: [P0, P2, P3, P5, P6, P7]
- base: worktree branch `plan-declared-deletions`, cut from `main` at `2acb55a` (6.55.0, #337); `origin/main` fetched this run and equal to it. `pharn/ARCHITECTURE.md` hashed this run with `.dev/floor/hash-doc.mjs` (the pin above). Bumps to **6.56.0** (minor: a newly shipped floor CLI and a new `## Files` marker); renumbered at GATE 2 if `main` moves first.
- lessons index: `node .dev/floor/check-lessons-index.mjs .` exited 0 (GREEN) this run, so the two-step sweep ran: candidates selected from `docs/lessons-index.md`, every cited entry read in full from canon.
- gate1: APPROVED 2026-10-11 by the human, in chat, relayed by the orchestrating agent (a human approval relayed, not a model decision): approved with the RECOMMENDED answer to all four open questions — Q1 (a), Q2 (a), Q3 (a), Q4 (a). See `## Resolved questions (GATE 1)`.

## Applied lessons

- **L1** — the meta-docs whose facts this changes are in `## Files`: `README.md` (the guarantee row and the bound that say "declared concrete paths exist", the floor-checker count in the generated region, the badge), `CHANGELOG.md`, and the floor guide.
- **L3** — `## Files` items gain a second meaning, so every existing declaration was re-audited (measured this run over the 277 committed `PLAN.md` files under `.dev/features/` and `pharn/features/`): 0 carry the marker or a near-miss of it after a path, so no historical plan changes meaning; 85 do carry some other parenthesized annotation after the back-ticks (`(new)`, `(hermetic)`, …), which is why only the exact token and its near-miss spellings are read, never "any annotation".
- **L17** — the scope checks answer "changed since base", not "written by the build"; this plan does not ask them a new question. The "a marked path must be gone" rule goes to the completeness checker, which asks exactly that question of the live tree.
- **L19** — every Bash-side write is declared: the helper's `unlinkSync` is a Bash-reached write outside both hooks, stated in its header, the command, the contract and the CHANGELOG, and judged afterwards by reconcile against the plan's scope (measured below). The build's own scratch probes live under `.pharn/pharn-dev-build/` and are removed before lint.
- **L20** — the marker's near-miss spellings get a refusal in code, not a sentence asking authors to spell it right.
- **L22** — the build deletes through one pinned line with no path in it (`node pharn/floor/apply-plan-deletions.mjs --feature <name>`), never a prose "remove it with `rm`" whose path the model would type into a shell.
- **L29** — the consumers of the shared `## Files` reader are enumerated below (eight call sites, each classified changed / unchanged), and the helper's input path kinds are one enumeration its suite iterates.
- **L34** — a plan whose `## Files` holds ONLY `(delete)` items (the pharn-web-2 hygiene shape) must be `complete`, not "no concrete paths → inconclusive": the non-empty domain is `declared ∪ deletions`, and the empty-domain refusal stays for the case where both are empty.
- **L35** — one owner per fact: the marker grammar lives once, in `plan-files-core.mjs`, read by both the checker and the helper; the helper imports `badPath` (`ac-tests-core.mjs`), `containmentWalk`/`lstatSafe` (`stage-runtime.mjs`), `FEATURE_SLUG_RE` (`gate-run-core.mjs`) and `isAlwaysReconciled`/`loadIgnoreData` (`check-bash-reconcile.mjs`) rather than re-deriving any of them.
- **L36** — the marker is a parameter-free token, but its variant spellings are closed over by a refusal: `(Delete)`, `(DELETE)`, `( delete )`, `(deleted)`, `(deletes)` directly after the path are refused by both readers instead of silently read as an ordinary item (which would leave the file in place and read `complete`).
- **L37** — the maintainer's premise "reconcile already treats a deletion as WARN" was PROBED, not read off `reconciliation-record.md` §3, and it is only half true (table below); the contract sentence is corrected in this increment.
- **L39** — the setter ("what may the hook allow") and the completeness checker ("what state did the plan declare") read one `## Files`; the marker deliberately leaves the setter's answer unchanged (the bare path stays in scope, which the loop's commit needs) and changes only the checker's.
- **L54** — absence of a marked path is decided by `lstat` ENOENT, never `existsSync`: a dangling symlink left at a marked path is PRESENT (undeleted), and a non-ENOENT `lstat` error is inconclusive.
- **L55** — the parser parity is held by executing the real setter over a fixture that carries marked items (the existing ★ PARITY test extended), not by reasoning that the marker sits outside the back-ticks.
- **L59** — the helper never follows a link: it walks the parent with `containmentWalk` (a symlink at any parent component refuses) and `lstat`s the leaf; only a regular file is unlinked. `PATH_KINDS` (regular file, absent, directory, link to a file, link to a directory, dangling link, looping link, symlinked parent) is iterated by its suite.
- **L60** — every new property gets a control that turns it red: each refusal code has a fixture that hits it and one that does not; the near-miss refusal is mutated (exact `(delete)` must still delete); the wiring pin asserts its anchor is found before slicing.
- **L69** — no new hand-written `## Files` reader: the helper and the checker both call `pathsFromPlanFiles`.
- **L71** — this plan's own `## Files` holds no glob and no placeholder, so the setter's count must equal the bullet count (checked at the end of this plan stage and recorded under `## Self-checks`).
- **L72** — `plan-files-core.mjs`'s return shape is EXTENDED (each `entries[]` member gains two booleans), never renamed: `value` stays byte-identical, so every caller outside this plan keeps its answer. The eight callers were grepped (`pathsFromPlanFiles`, `declaredWrites`) and are listed below.

## The trigger (P7) and what was measured this run

**The failure.** A `/pharn-loop` hygiene run in the user's project `pharn-web-2` could not delete two orphaned blog
posts, `.vscode/settings.json` and two unused shadcn components (`aspect-ratio`, `label`): undeclared, the deletion is an
out-of-scope change; declared, `check-build-complete.mjs` requires the path to exist, so verify is `INCOMPLETE`.

**Probed, not read** — a throwaway git repo (`.pharn/pharn-dev-plan/probe.mjs`, removed before commit) with the real
hooks and the real `pharn/floor/` copied in, a PLAN declaring `` `src/ui/label.tsx` (delete) ``,
`` `.vscode/settings.json` (delete) `` and an edited `src/keep.ts`; setter → anchor → deletions → the three checkers:

| scenario                                     | setter scope                         | `check-bash-reconcile`                                                     | `check-build-complete` (today)          | `check-quick-scope`             |
| -------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------- | --------------------------------------- | ------------------------------- |
| A — both marked paths removed with `rm`      | the 3 bare paths (marker not parsed) | exit 0 `CLEAN`; warnings "unreadable during reconcile, treated as changed" | **exit 1 `incomplete`**, both `missing` | exit 0, nothing escaped         |
| B — both marked paths removed with `git rm`  | same                                 | exit 0 `CLEAN`; warnings "present at anchor, absent now"                   | **exit 1 `incomplete`**                 | exit 0                          |
| C — an UNDECLARED file removed with `rm`     | same                                 | **exit 1 `ESCAPE`** `src/undeclared.ts` (denied by the scope snapshot)     | exit 0                                  | **exit 1**, `src/undeclared.ts` |
| D — an UNDECLARED file removed with `git rm` | same                                 | exit 0 `CLEAN`, warning "present at anchor, absent now"                    | exit 0                                  | **exit 1**, `src/undeclared.ts` |

What this settles:

1. **The only blocker for a declared deletion is `check-build-complete.mjs`.** The scope checks (`/pharn-regress`'s
   partition and `check-quick-scope.mjs`, both `partitionScope` over `scope-inputs.mjs`'s lists) already admit a deleted
   path the plan names, because `pathsFromPlanFiles` returns the back-ticked text and the marker sits after it.
2. **The setter needs no change.** `set-writes-scope.cjs` takes the same back-ticked text, so it scopes the bare marked
   path (A–D, column 2). That is load-bearing, not merely harmless: `/pharn-loop`'s commit (`loop-closeout.mjs`
   `buildStageList`) stages "regular files and tracked deletions" **from the plan-derived scope**, so the bare path in
   scope is what makes a green loop commit the deletion. A marker that hid the path from the setter (a `### Delete`
   heading, say) would need a change to that hook-protected file AND would drop the deletion from the loop's commit.
3. **Doc-vs-repo mismatch (P6), surfaced for GATE 1.** `reconciliation-record.md` §3 says a path "present at anchor and
   absent now" is a WARN because "a deletion is not a write". Live, that holds only for a path also gone from git's index
   (`git rm`, B/D). A tracked file removed from the worktree alone (`rm`, `fs.unlinkSync`) is still listed by
   `git ls-files --cached`, `hashFile` returns `null`, and it becomes a candidate "unreadable … treated as changed",
   judged against the scope like any write: permitted when declared (A), an `ESCAPE` when not (C). The maintainer's
   premise ("reconcile is not part of the problem") is therefore true for a DECLARED deletion and false as a general
   statement. Consequence for this plan: the helper deletes with `unlinkSync` (never `git rm`), so its deletions are
   JUDGED by reconcile against the plan's scope, and §3's sentence is corrected to the measured behaviour (open
   question Q3). The `git rm` gap (D: an undeclared deletion reconcile does not report; the scope check does) is named,
   not fixed (follow-up `reconcile-index-removed-deletion`, P7 — no failure has come of it).

## Decisions

### D1 — the marker: ``- `path` (delete)``

Exactly the token `(delete)`, lower-case, separated from the closing back-tick by spaces or tabs and followed by
whitespace or end of line: `/^\s*-\s+`([^`]+)`[ \t]+\(delete\)(?=[ \t]|$)/`, tested against the item's raw line in
`plan-files-core.mjs` (ARCHITECTURE §2 primitive #3, a regex; no judgment, P5). Why this spelling:

- it sits **outside** the back-ticks, so both parsers keep returning the bare path (D2 above) and the setter is untouched;
- `(…)` after a back-ticked path is already the shape authors use for annotations (`(new)`, `(hermetic)`), so it reads
  naturally, and no committed plan uses `(delete)` there today (L3);
- a description elsewhere on the line (``- `a.ts` — keep, see (delete) note``) never matches, because the token must
  follow the path directly.

**Near-misses are refused, not ignored (L36).** `/^\s*-\s+`[^`]+`[ \t]*\(\s*delete[sd]?\s*\)/i`minus the exact form —`(Delete)`,`(DELETE)`,`( delete )`,`(deleted)`,`(deletes)`, and`(delete)`written with no space after the
back-tick — makes`check-build-complete.mjs`inconclusive (exit 2, a reason naming the spelling) and the helper refuse
(`delete-near-miss`). Read silently as an ordinary item, such a line would leave the file in place and read`complete`.
**Bound:** a synonym (`(remove)`,`(rm)`) is an ordinary item; the file stays and nothing reports it.

Inside the back-ticks (`` `path (delete)` ``) is NOT the marker: the setter's `clean()` strips it, the checker sees an
ordinary declared path, and a build that deleted it reads `incomplete` — fail-closed and loud. The same item spelled
both ways (marked and unmarked) is refused as `conflicting-declaration` by both readers.

**Scope of the marker:** PLAN.md's `## Files` only. In `AC-TESTS.md` it has no meaning (the AC files must exist), and
no reader of that file changes. The `### Explicitly not touched` subsection is never scanned, so a marker there is inert.

### D2 — semantics: completeness owns "marked ⇒ absent"

`check-build-complete.mjs` splits the concrete items: unmarked ones must EXIST (today's rule, unchanged), marked ones
must be ABSENT by `lstat` ENOENT (L54). New output keys, additive: `deletions[]` (the concrete marked paths) and
`undeleted[]` (marked paths still present — a regular file, a directory, any link, a dangling one included).
`complete` iff `missing[]` and `undeleted[]` are both empty; `incomplete` (exit 1) otherwise; inconclusive (exit 2)
when both concrete sets are empty, on a near-miss, on a conflicting declaration, or on an `lstat` error other than
ENOENT. A marked glob or placeholder is `skipped[]` as today (the helper refuses it, so the build stops first).
**Every** output, each new inconclusive branch included, keeps `complete` a boolean and `missing[]` / `skipped[]`
string arrays (amended after grill, G2): `stage-verify-core.mjs`'s `checkCompleteness` refuses any other shape as
`child-crashed` before a gate runs, so a new branch that dropped one would turn a refusal into a crash.
**Bound, stated:** "absent" is not "deleted by this build" — a marked path that never existed reads `complete`, and a
typo'd marked path leaves the intended file in place with every checker green (no git in this checker, P7).

### D3 — the scope checks are NOT changed

The maintainer asked whether the scope checks should admit a marked path only as a deletion. Decision: no change. A
marked path that was modified but left in place, or added, is already admitted by declaration exactly as today, and is
then caught where the question belongs: `check-build-complete.mjs` reports it `undeleted` → verify `INCOMPLETE`.
Every pipeline route that runs a scope check also runs `/pharn-verify` afterwards (`/pharn-ship` steps 6–7, its
`--quick` item 7 then verify, every `/pharn-loop` iteration), and verify always captures completeness
(`run-gates.mjs` `aux.completeness`). Teaching `partitionScope` deletion status would give `check-regress.mjs` a second
reason to change and a second reader of the marker (P3, L35, L39). An undeclared deletion stays an escape there
(C, D — measured), and two tests lock that (`check-quick-scope.test.mjs`).

### D4 — how the build deletes: one pinned floor CLI, never `rm` in prose

`pharn/floor/apply-plan-deletions.mjs --feature <name>` (NEW, product floor). `/pharn-build` runs it **unconditionally,
as the last action of Step 3**, after every Write/Edit and before Step 4's gates; with no marked item it deletes
nothing and exits 0. Why a CLI rather than a sentence: the Write/Edit tools cannot delete, so a deletion is a Bash act,
and a PLAN path is untrusted text — `.dev/floor/command-hygiene.test.mjs`'s `SHELL_VALUES` closure (6.30.0,
shell-sink-validation) admits no product-command shell line that carries a PLAN-borne path, and the 6.28.0 review
reproduced `src/$(touch X).js` running in the orchestrator's shell. The pinned line carries only `<name>`, already a
validated member. The routed build agent's brief rule 4 (`WRITE_TOOL_RULE`) already says "Bash runs commands — the
stage's own lines", which this line is; the brief is unchanged.

The helper, in order (fail-closed; validate everything before deleting anything):

1. `--feature` must match `FEATURE_SLUG_RE`; `pharn/features/<name>/PLAN.md` is read after `containmentWalk`.
2. `pathsFromPlanFiles` → the entries marked `delete`. A near-miss → `delete-near-miss`; a path both marked and unmarked
   → `conflicting-declaration`; a marked non-concrete entry (`isConcrete` false) → `delete-not-concrete`.
3. Each marked path: `badPath` (`ac-tests-core.mjs` — absolute, not normalized, `..`, leading `-`, `.pharn/`,
   `pharn/features/`) plus a `.git` segment (case-folded) or a backslash → `bad-path`; a path `isAlwaysReconciled`
   (exact, or case-folded — the guards case-fold) → `control-path` (the guards, the floors, the trusted docs,
   `CODEOWNERS`, the SPEC template, canon: a human deletes those); `containmentWalk` on the parent directory fails →
   `containment`; the leaf by `lstat`: ENOENT → `absent` (idempotent), a regular file → to delete, anything else
   (directory, any link) → `not-a-regular-file`.
4. Only then `unlinkSync` each; a failure other than ENOENT → `unlink-failed`, listing what was already deleted.

One JSON document on stdout: `{feature, deleted[], absent[]}` on exit 0, `{feature, deleted[], reason_code, path,
reason}` on exit 2; paths are JSON-quoted DATA (P2); refusal text never interpolates unescaped PLAN bytes (L62).
Exit: 0 applied · 2 refused (the closed codes above, plus `usage`, `no-plan`, `plan-files-unparseable`) · anything
else = crashed. `/pharn-build`: `0` → Step 4; any other → HALT and quote the document as DATA (under `/pharn-loop`
that is the existing S9 "a stage refuses", unchanged). It imports `runtime-floor.mjs` first and runs only under
`import.meta.main` (`.dev/floor/entry-point-guard.test.mjs`).

**Interaction with the guards, stated (L19).** The writes-scope hooks never see the unlink (Bash). Reconcile does,
afterwards: the build's anchor (Step 0) precedes the helper. For a **tracked** path the unlink leaves it in git's
index, so the deletion is a candidate judged against the plan's scope — permitted, because the setter scoped the bare
marked path (scenario A). For an **untracked** path (amended after grill, G1) nothing is left to enumerate, so it is
reconcile's "present at anchor, absent now" WARN, judged by nothing; the scope checks never see it either (no git
change). That is acceptable only because the helper deletes nothing but marked paths. A control path never reaches
the unlink (step 3). **It is not staged** (`unlinkSync`, not `git rm`): staging would move
it into reconcile's unjudged WARN branch (scenario B), and every other build write is unstaged too; `/pharn-loop`'s
commit stages tracked deletions in scope by itself.

### D5 — the setter and `plan-files-core.mjs` stay in parity without touching the hook

`plan-files-core.mjs`'s `pathsFromPlanFiles` keeps `value` byte-identical and adds, per `entries[]` member,
`delete: boolean` and `deleteNearMiss: boolean`, plus exported `DELETE_MARKER_RE` / `DELETE_NEAR_MISS_RE`. The setter
needs none of it: it scopes the bare path, which is the answer the loop's commit needs (Measured 2). The ★ PARITY test
in `check-build-complete.test.mjs` gains marked items and asserts setter scope == `declared ∪ deletions`, executing
the real `.claude/hooks/set-writes-scope.cjs`. **No hook-protected file changes and no human-applied patch is needed.**

### D6 — the hand-off fields

`verify-report.json` carries `completeness` verbatim from the checker, so `undeleted[]` reaches it with no
`stage-verify` code change (`checkCompleteness` shape-checks only `complete`/`missing`/`skipped`; the new keys are
additive). `VERIFY.md` renders `undeleted[]` as fenced DATA (`render-verify.mjs`). `/pharn-ship`'s two sentences that
DEFINE `INCOMPLETE` as "a plan-declared path is absent" and its GATE-2 presentation line are corrected to name
`.completeness.undeleted[]` (L1 — they would otherwise state a narrower rule than the checker applies). `/pharn-loop`'s
fix-list fields (`stage-agent-core.mjs` `FIX_LIST_SOURCES`, pinned with its count in two suites and in the brief's rule 7) are NOT widened: an `undeleted` path is fixed by the rebuild re-running `/pharn-build`, whose unconditional helper
line deletes it again — open question Q2.

### The callers of the shared `## Files` reader (L29, L72)

| caller                                    | reads                                   | after this increment                                          |
| ----------------------------------------- | --------------------------------------- | ------------------------------------------------------------- |
| `check-build-complete.mjs`                | `entries`                               | CHANGED — D2                                                  |
| `apply-plan-deletions.mjs`                | `entries`                               | NEW — D4                                                      |
| `render-verify.mjs`                       | the report, not the PLAN                | CHANGED — renders `undeleted[]`                               |
| `scope-inputs.mjs` `declaredWrites`       | `value` (via `clean`)                   | unchanged: the bare marked path stays declared (D3)           |
| `stage-verify.mjs` (eval-pair rule)       | `value`                                 | unchanged: a deleted path is no capability directory          |
| `build-gate.mjs` / `build-gate-core.mjs`  | `declaredWrites` + a regular-file lstat | unchanged: a deleted test file is not a regular file, dropped |
| `check-ac-tests.mjs`, `ac-tests-lock.mjs` | AC-TESTS.md `value`; PLAN `value`       | unchanged: the marker has no meaning there (D1)               |
| `render-run-report.mjs`                   | `entries[].line`                        | unchanged: quotes the raw line, marker included, as DATA      |

## Files

- `.dev/features/plan-declared-deletions/PLAN.md` — this plan.
- `pharn/floor/plan-files-core.mjs` — EDIT: `entries[]` gain `delete` and `deleteNearMiss`; export the two marker regexes; `value` byte-identical; header names the marker and the new consumer.
- `pharn/floor/check-build-complete.mjs` — EDIT: marked paths must be absent by lstat; new `deletions[]` and `undeleted[]`; the inconclusive cases of D2; header updated.
- `pharn/floor/check-build-complete.test.mjs` — EDIT: absent/present/dangling-link marked paths, an only-deletions plan, near-miss and conflict refusals, a marked glob skipped, ★ PARITY with marked items against the real setter.
- `pharn/floor/apply-plan-deletions.mjs` — NEW: the deletion CLI of D4.
- `pharn/floor/apply-plan-deletions.test.mjs` — NEW: PATH_KINDS, every refusal code with its control, validate-before-delete, idempotence, and the committed `pharn-build.md` line executed in a throwaway project.
- `pharn/floor/render-verify.mjs` — EDIT: `## Completeness` renders `undeleted[]` as fenced DATA beside `missing[]`.
- `pharn/floor/render-verify.test.mjs` — EDIT: an INCOMPLETE report with `undeleted[]` only, and with both lists, including a hostile path.
- `pharn/floor/check-quick-scope.test.mjs` — EDIT: lock D3 — a deleted marked path is clean, an undeclared deletion escapes.
- `pharn/floor/check-bash-reconcile.test.mjs` — EDIT: lock the measured deletion rows — a declared unlink is CLEAN, an undeclared unlink is ESCAPE, an index-removed path is a WARN.
- `pharn/pharn-contracts/verify-report.md` — EDIT: `completeness` members gain `deletions`, `undeleted`; the trust paragraph names `undeleted[]` as PLAN-borne DATA.
- `pharn/pharn-contracts/reconciliation-record.md` — EDIT: §3's WARN row corrected to the measured behaviour (Q3).
- `.claude/commands/pharn-build.md` — EDIT: Step 3 names the marker's one exception to the write-tool rule and pins the helper line with its exit mapping; one claims line.
- `.claude/commands/pharn-plan.md` — EDIT: the `## Files` note gains rule (4), the `(delete)` marker, its exact spelling and what refuses.
- `.claude/commands/pharn-ship.md` — EDIT: the two `INCOMPLETE` definitions name `.completeness.undeleted[]`.
- `.claude/commands/pharn-ship-close.md` — EDIT: the GATE-2 presentation quotes `.completeness.undeleted[]` beside `missing[]`.
- `.dev/floor/command-hygiene.test.mjs` — EDIT: a wiring pin for the helper line inside `pharn-build.md` Step 3 (anchor asserted found, L60); a byte ceiling raised only if measured over, by the rule.
- `.dev/guides/floor-gates.md` — EDIT: a new `apply-plan-deletions.mjs` / `check-build-complete.mjs` section after `build-gate.mjs`.
- `SKILLS_VERSION` — EDIT: 6.56.0.
- `CHANGELOG.md` — EDIT: the 6.56.0 entry.
- `README.md` — EDIT: version badge; the guarantee row and the bound on `check-build-complete`; the generated region (floor checkers 133 → 134) via `npm run docs:generate`.

### Explicitly not touched

- `.claude/hooks/set-writes-scope.cjs` — hook-protected and not needed (D5, Measured 2).
- `pharn/floor/check-regress.mjs`, `pharn/floor/quick-scope-core.mjs`, `pharn/floor/scope-inputs.mjs`, `pharn/floor/stage-regress.mjs` — D3.
- `pharn/floor/check-bash-reconcile.mjs` — the `git rm` WARN gap is a named follow-up, not fixed here.
- `pharn/floor/stage-verify.mjs`, `pharn/floor/stage-verify-core.mjs` — the capture is merged verbatim (D6).
- `pharn/floor/stage-agent-core.mjs`, `.claude/commands/pharn-loop.md`, `.claude/commands/pharn-loop-quick.md` — Q2.
- `pharn/floor/loop-closeout.mjs` — already stages tracked deletions in scope (its suite's `buildStageList` case).
- `pharn/CONSTITUTION.md`, `pharn/ARCHITECTURE.md`, `THREAT-MODEL.md`, `LIMITS.md` — hook-protected; see `## Human follow-ups`.

## Contracts satisfied

- `verify-report.md` — `completeness` stays "members vary by emitter; treat any subset as valid"; the two new members are documented there and nowhere restated (P4).
- `reconciliation-record.md` — §3 states the deletion rows as measured; §1/§2a/§4a unchanged.
- `gate-run-record.md` — unchanged: `aux.completeness` still holds `check-build-complete.mjs`'s exit, whose codes keep their meaning.
- `stage-exit.md` — unchanged: the helper is a build-step CLI, not a stage script, and emits no `pharn-stage-exit/1` object.

## Evals / tests to write (P1)

No Capability is added or changed, so no `evals/` pair is owed. Every new behaviour gets `node --test` cases in the files
above:

- `plan-files-core` (in `check-build-complete.test.mjs`) → the exact marker sets `delete`; each near-miss sets `deleteNearMiss`; `(delete)` inside the back-ticks, in a later description, or after `(new)` sets neither; `value` is unchanged for a fixture with and without markers.
- `check-build-complete` → marked + absent = complete; marked + present (file, directory, dangling link) = incomplete with `undeleted`; only-deletions plan = complete; near-miss / conflict / non-ENOENT lstat = inconclusive, each document accepted by `stage-verify-core.mjs`'s `checkCompleteness` (G2); ★ PARITY setter scope == `declared ∪ deletions`.
- `apply-plan-deletions` → each `PATH_KINDS` member; each refusal code with a passing control; one bad entry deletes nothing; a second run reports `absent`; the committed `pharn-build.md` line, read from the file, run under `sh -c` in a throwaway project.
- `render-verify` → `undeleted[]` rendered as fenced DATA; a hostile path stays inside the fence.
- `check-quick-scope` / `check-bash-reconcile` → the four probe rows A–D, as locks on behaviour this increment relies on and does not change.

## Guarantee audit (P0)

- "a `(delete)` item is absent after a build `/pharn-verify` calls complete" → floor: enum-regex (the marker) + filesystem `lstat` (path membership), in `check-build-complete.mjs`, carried by `aux.completeness` into `check-verify.mjs`'s `INCOMPLETE`.
- "the helper deletes only the plan's marked, concrete, regular, non-control files inside the project" → floor: regex + set membership + `lstat`/containment, in tested code; that `/pharn-build` runs it, and runs nothing else to delete, → advisory (a Bash call outside the `PreToolUse` gate, L19).
- "an undeclared deletion still stops the run" → floor: the existing scope checks (measured C, D); reconcile only for an unstaged deletion (C), never for an index-removed one (D) — stated, not claimed.
- "the loop commits a declared deletion" → floor-tested existing code (`buildStageList`), fed by the setter's unchanged scope; that a run reaches the commit → advisory.
- "the setter and the core agree" → example-based parity test executing the real setter (L55) — not a proof of equivalence.
- "near-miss spellings are refused" → floor: regex; a synonym is not covered (stated bound).
- **Struck:** "a marked file was deleted by this build" (absence is not attribution); "deletions are prevented outside the plan" (Bash).

## Trust audit (P2)

- `PLAN.md` `## Files` (untrusted) → the marker is read by regex only; paths become `lstat`/`unlink` operands after validation and never reach a shell (the pinned line carries only `<name>`); every path in the helper's JSON, in `undeleted[]`, and in VERIFY.md is quoted as DATA (JSON-quoted or fenced); a refusal names a closed code first.
- A hostile PLAN can at most make the helper delete a regular, tracked-or-untracked, non-control file inside the project that the plan also scoped — the same reach the Write tool already has under that scope (it could truncate the file); reconcile judges a tracked path's deletion against that scope, and an untracked one's only as a WARN (G1).

## Determinism audit (P5)

- Marker, near-miss, conflict, path validity, control-path membership, path kind and absence are all membership tests or regexes; every ambiguous case ends in a refusal for a human (`delete-near-miss`, `conflicting-declaration`, `control-path`, `not-a-regular-file`), never a guess.

## Human follow-ups (trusted docs — none required)

- Optional: `LIMITS.md §6` could add that a deletion staged with `git rm` is reported as a reconcile WARN rather than judged, so only the scope check catches an undeclared one. Nothing in the four trusted docs is made false by this increment, so the PR does not depend on it.

## Named follow-ups (not built — P7)

- `reconcile-index-removed-deletion` — scenario D: an undeclared `git rm` reads `CLEAN` at reconcile (the scope check catches it).
- `plan-declared-directory-deletion` — a marked directory is refused; files are listed one by one.
- `loop-fix-list-undeleted` — only if Q2 is answered (a).

## Amended after grill

`/pharn-dev-grill` (`GRILL.md`) raised two concerns this plan takes; neither changes the approved intent, `## Files` is
unchanged, and the four GATE-1 answers stand.

- **G1** — D4 and the trust audit said the helper's deletion is always judged by reconcile against the scope. That holds
  for a tracked path only; an untracked marked file becomes a WARN. Both sentences now say so.
- **G2** — D2 now requires every `check-build-complete.mjs` output, the new inconclusive branches included, to keep the
  shape `checkCompleteness` accepts, and the checker's suite runs each new branch's document through
  `checkCompleteness` (the test list below gains that case).

## Amended after review (GATE 2: fix-first)

The orchestrator decided fix-first at GATE 2, under the human's delegation, on `REVIEW.md`'s blocking finding. Every fix
stays inside `## Files` above; no path was added.

- **F1 (blocking)**: the helper's refusals also run over the leaf's `realpathSync.native` spelling, and the exact
  control files are matched by `dev`/`ino`. A realpath failure refuses. The spelling-only version deleted `LIMITS.md` via
  `LIMITſ.md` (U+017F) on APFS.
- **F2**: `.pharn/` and `pharn/features/` are refused in any letter case.
- **F3**: refusal rows for the ASCII case variants; on-disk rows gated on a probe of the tmpdir volume; a hard-link row.
- **F4**: `DELETE_MARKER_RE` is tightened to exactly one space. Two spaces or a tab is now a near-miss and is refused.
- **F5**: the import from `check-bash-reconcile.mjs` is stated and accepted in the helper's header, with the follow-up
  `apply-deletions-core-extract`.
- **F6**: the check-then-act gap is stated in the helper's header and in `/pharn-build`'s Floor bullet.
- **F7**: a `(delete)` placed after the description is stated as an ordinary item that nothing reports.

Named follow-up added: `apply-deletions-core-extract` (move the always-reconciled set's loader and matcher into a core
both modules import).

## Self-checks (this stage)

- `node pharn/floor/check-plan-lessons.mjs .dev/features/plan-declared-deletions/PLAN.md .dev/memory-bank/lessons-learned.md` → exit 0 GREEN, all 19 cited ids resolve and are referenced in the body (the declaration, never the application — P0).
- L71 count, measured with `plan-files-core.mjs` (the setter's parity copy, so the live scope record is left alone): 21 `## Files` bullets, 21 parsed paths, 21 concrete — no glob, no placeholder, no cue truncation.
- Prettier and markdownlint run over this file only (L13).

## Resolved questions (GATE 1)

All four resolved by the human at GATE 1 (relayed in chat by the orchestrating agent): the recommended option (a) each.
No open question remains.

- **Q1 → (a)**: the marker is ``- `path` (delete)`` after the back-ticks, near-misses refused (D1).
- **Q2 → (a)**: `/pharn-loop`'s `FIX_LIST_SOURCES` is left unchanged; the follow-up `loop-fix-list-undeleted` stands.
- **Q3 → (a)**: `reconciliation-record.md` §3 is corrected to the measured behaviour in this increment.
- **Q4 → (a)**: the helper refuses every always-reconciled path (exact or case-folded) before deleting anything.

The questions as asked at GATE 1:

- **Q1 — the marker.** (a) ``- `path` (delete)`` exactly, near-misses refused [recommended, D1]; (b) inside the back-ticks, `` `path (delete)` `` (the setter's `clean()` already strips it, but `value` would then carry the marker for every other reader); (c) a `### Delete` subsection (the setter stops at headings, so the path would leave the scope: the hook-protected setter would need a human patch, and the loop's commit would drop the deletion).
- **Q2 — `/pharn-loop`'s fix-list.** (a) leave `FIX_LIST_SOURCES` as is; an `undeleted` path is cleared by the rebuild's unconditional helper line, and VERIFY.md names it [recommended, smallest]; (b) add `.completeness.undeleted[]` to it, the brief's rule 7, `pharn-loop.md` and `pharn-loop-quick.md` (two pinned counts change).
- **Q3 — `reconciliation-record.md` §3.** (a) correct the WARN row to the measured behaviour in this increment [recommended: the helper's claims rest on it, L37]; (b) leave it and open a follow-up.
- **Q4 — the helper's control-path refusal.** (a) refuse every `isAlwaysReconciled` path (exact or case-folded) before deleting [recommended: prevention for the helper's own unlink, mirroring the setter's control-surface refusal]; (b) rely on reconcile's always-reconciled HEAD comparison to detect it after the fact.
