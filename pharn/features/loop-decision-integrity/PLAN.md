---
spec_id: loop-decision-integrity
spec_content_hash: "8c5e97bd52be683ca0d942c72ab5b7916523bd28f05f2cc422d2a9bca38c5429"
applied_lessons: none
---

## Approach

Close the gap named in `SPEC.md`: `LOOP.md`'s `decision` field is currently self-attested prose — nothing
re-derives it from the reports it summarizes, so a run that skips `/pharn-grill` / `/pharn-regress` /
`/pharn-verify` and hand-writes a plausible-looking record passes `check-loop-record.mjs`'s shape check
undetected, and (on a `STOP_GREEN` claim) that record gets committed unattended.

The fix adds exactly one new deterministic checker, `pharn/floor/check-loop-decision.mjs`, following the
`check-plan-spec-agree.mjs` reuse idiom byte-for-byte: it shells `pharn/floor/check-loop.mjs` (via
`spawnSync`, never imports its internals) against the reports the record's own feature directory holds,
using the record's own `iterations` and a new optional `cap` field, and compares the live re-derived
`decision` token to the one recorded. It never re-implements `check-loop.mjs`'s decision table and never
becomes an input to it — `check-loop.mjs`'s signature stays `{verify-report.json, regression-report.json,
iter, cap}`, unchanged, so the structural "no advisory stage can gate the stop" invariant is untouched.
The new checker consumes the stop's output, after the fact, and gates only the downstream commit.

`cap` is added to the loop-record envelope as an **optional** field (not one of the four mandatory ones)
so every existing `LOOP.md` in this repo's history stays shape-valid with no field to backfill; a record
written by the **updated** `/pharn-loop` always carries it (the value is already known at Step 1 entry),
so the new checker can fully re-derive `STOP_CAP` too, not only the cap-independent decisions
(`STOP_GREEN`, `STOP_TERMINAL`, an un-blocked `INCONCLUSIVE`).

`/pharn-loop`'s Step 6b is extended to run the new checker for every **non-blocked** stop (a blocked stop
never consulted `check-loop.mjs` in the first place, per the existing contract exception, so it is
exempt); Step 6c is extended to require the new checker GREEN, in addition to the existing
`check-loop-record.mjs` GREEN, before staging/branching/committing on `STOP_GREEN` — with a new closed
`not committed: decision unverifiable` outcome added alongside the existing enumerated set.

Every closed-set change this touches — the frontmatter-core consumer list, the `/pharn-loop`
commit-outcome enumeration in this repo's own hygiene test, and the loop-record contract's envelope
table/template — is updated as a materialized list, matching how every existing closed set in this
command is already held (never left to prose agreement).

## Applied lessons

- `none` — this repository's product-surface `memory-bank/lessons-learned.md` does not exist
  (`check-lessons-index.mjs . --verdict` → `NO_CANON`): no lessons have been promoted to this project's
  product-surface canon to sweep. (This is unrelated to this repository's own separate build-apparatus
  canon about building PHARN itself, cited elsewhere as PHARN's own build-loop lessons — that file is not
  this stage's input; `/pharn-plan` is a product-surface command and reads only `memory-bank/`.)

## Steps

1. Add `cap` as an optional envelope field to `pharn/pharn-contracts/loop-record.md` (table + canonical
   template, which `check-loop-record.test.mjs` extracts verbatim and asserts GREEN — so the template
   must stay a valid, GREEN-shaped example after the edit) and to `pharn/floor/check-loop-record.mjs`'s
   shape validation (present ⇒ `^\d+$` and `>= 1`; absent ⇒ no error, unchanged behavior).
2. Write `pharn/floor/check-loop-decision.mjs`: given `<LOOP.md>`, parse its envelope (import
   `FM_RE`/`stripBom` from `pharn/floor/frontmatter-core.mjs`; duplicate the small scalar-cleaning /
   regex helpers in-file, following `check-plan-spec-agree.mjs`'s established no-sibling-import
   convention rather than exporting internals from `check-loop-record.mjs`). Behavior:
   - `decision: INCONCLUSIVE` **and** a `blocked` key present → GREEN, "SKIPPED — blocked stop, nothing
     to re-derive" (the contract's existing exception; never attempt re-derivation).
   - Otherwise: `iterations` and `cap` must both be present and shape-valid (fail-closed RED,
     `MALFORMED`, if either is missing or invalid — a record from the updated command always carries
     both for a non-blocked stop, so this path fires only on a genuinely malformed or pre-this-feature
     record, and nothing currently re-runs this checker against old records automatically).
   - Derive `verify-report.json` / `regression-report.json` as siblings of `<LOOP.md>` (same feature
     directory — the fixed convention every stage already uses).
   - `spawnSync(process.execPath, [check-loop.mjs path, verifyPath, regressPath, "--iter", iterations,
"--cap", cap], { encoding: "utf8" })`; parse its stdout as JSON regardless of its exit code
     (`check-loop.mjs` always emits valid JSON, including on its own exit-2 bad-input path) and read
     `.decision`.
   - Compare the re-derived `.decision` to the record's recorded `decision`:
     - equal → GREEN (this also correctly covers the "both computed INCONCLUSIVE for the same
       missing/malformed reports" case, with no special-casing needed — the token comparison alone
       decides it).
     - not equal → RED, `DECISION_MISMATCH`, quoting both tokens plus `check-loop.mjs`'s own `.reason`.
   - If `spawnSync` itself fails to launch (e.g. `check-loop.mjs` missing) → RED, fail-closed, distinct
     message from a mismatch.
   - Header comments in this repo's house style: cite `pharn/ARCHITECTURE.md §2` primitive #3; state the
     honest bound explicitly — this proves the recorded decision is **re-derivable** from the cited
     reports, never that those reports are themselves honest (an internally-consistent fabricated pair
     still passes); note the deliberate asymmetry with `check-ship-briefing.mjs` (annotation-only,
     because a human GATE-2 already follows it) — here the check **gates** Step 6c specifically because
     `/pharn-loop`'s `STOP_GREEN` commit has no human between the record and the branch.
3. Add `check-loop-decision.mjs` to `pharn/floor/frontmatter-core.test.mjs`'s materialized `CONSUMERS`
   list (it imports and applies `stripBom`, exactly like `check-loop-record.mjs`).
4. Write `pharn/floor/check-loop-decision.test.mjs` (node:test) covering: a genuine `STOP_GREEN` record
   whose cited reports agree (GREEN); a record citing missing reports (RED, reports-missing message); a
   record whose recorded `decision` disagrees with a live re-derivation (RED, mismatch message); a
   blocked `INCONCLUSIVE` record (GREEN, skipped — no reports needed, and none written by the fixture);
   a record missing `cap` on a non-blocked stop (RED, malformed); a genuine `STOP_CAP` record where `cap`
   makes the difference (re-derives correctly only because `cap` is honored, not merely `iterations`).
5. Extend `pharn/floor/check-loop-record.test.mjs` with cases for the new optional `cap` field: absent
   (unchanged GREEN), present and valid (GREEN), present and malformed (RED) — mirroring the existing
   `iterations` test shape.
6. Update `.claude/commands/pharn-loop.md`:
   - `reads:` frontmatter — add `"pharn/floor/check-loop-decision.mjs"`.
   - `version:` bump (advisory versioning of the command file itself, independent of `SKILLS_VERSION`).
   - Step 6b — after `git rev-parse HEAD` captures `commit`, also capture `cap` (already known from Step
     1 as `<M>`) and write it into the `LOOP.md` frontmatter. After the existing
     `check-loop-record.mjs` self-check and its ≤1-repair rule, for every **non-blocked** decision run:
     `node pharn/floor/check-loop-decision.mjs pharn/features/<name>/LOOP.md`. Keep its exit code — it is
     **not** repaired the way a malformed record shape is (an honest run's decision was copied verbatim
     from reports it just read, so a RED here is either a real bookkeeping bug or the exact deceptive
     shortcut this feature targets — neither is "fixed" by editing the record).
   - Step 6c — its opening sentence ("Any other decision skips this step") gains one more precondition:
     `STOP_GREEN` **and** the Step-6b decision-check was GREEN. When the decision-check was RED, treat it
     exactly like the existing "not committed" branches: no branch, no commit, and the new closed outcome
     `not committed: decision unverifiable`.
   - Step 7 — the summary's commit-outcome closed set gains the new member; the bullet listing
     per-iteration verdicts also names the Step-6b decision-check's own verdict for this stop.
   - Guarantee audit — add one new bullet: **"A committed `STOP_GREEN` record's decision was genuinely
     re-derived from the reports it cites"** → **FLOOR** (`check-loop-decision.mjs`, primitive #3 reusing
     `check-loop.mjs`'s own output) — bounded exactly as its own header states (re-derivable ≠ the cited
     reports being honest).
7. Add `"not committed: decision unverifiable"` to `COMMIT_OUTCOMES` in
   `.dev/floor/command-hygiene.test.mjs` (materialized set, mirroring the existing four members) and
   confirm the file's existing closure/discrimination tests pass once the command spells it back-ticked.
8. `pharn/pharn-contracts/loop-record.md` — beyond the envelope table/template edit in Step 1: extend the
   "rule of the contract" FLOOR bullet list with the new re-derivation guarantee and its bound, and note
   in the "extra keys are ignored" section that `cap`, once present, is the one extra key a companion
   checker (not this contract's own checker) reads.
9. `CHANGELOG.md` — one entry under the next release heading (or `[Unreleased]`) naming the new checker,
   the additive `cap` field, and the new `/pharn-loop` gate; state the bump size (minor) and why
   (additive capability, no existing install invalidated).
10. `SKILLS_VERSION` — bump the minor version component per Step 9's entry.

## Files

- `pharn/floor/check-loop-decision.mjs` — new checker; cross-file re-derivation of a `LOOP.md`'s
  `decision` against a live re-run of `check-loop.mjs` over its cited reports.
- `pharn/floor/check-loop-decision.test.mjs` — new test file for the above.
- `pharn/floor/check-loop-record.mjs` — add optional `cap` field shape validation to the envelope check.
- `pharn/floor/check-loop-record.test.mjs` — add cases for the new optional `cap` field.
- `pharn/floor/frontmatter-core.test.mjs` — add `check-loop-decision.mjs` to the materialized `CONSUMERS`
  list.
- `pharn/pharn-contracts/loop-record.md` — document the optional `cap` field (table + template) and the
  new re-derivation guarantee (FLOOR bullet + its bound).
- `.claude/commands/pharn-loop.md` — `reads:` + version bump; Step 6b captures `cap` and invokes the new
  checker; Step 6c gates the `STOP_GREEN` commit on it; Step 7 reports it; Guarantee audit gains one
  bullet.
- `.dev/floor/command-hygiene.test.mjs` — add the new `not committed: decision unverifiable` spelling to
  `COMMIT_OUTCOMES`.
- `CHANGELOG.md` — one entry recording the change and the bump size.
- `SKILLS_VERSION` — minor bump.
- `README.md` — its shields.io version badge, held to `SKILLS_VERSION` by
  `.dev/floor/check-version-badge.mjs` (part of `npm run check`), updates to match; its
  `<!-- CURRENT-STATE:BEGIN/END -->` block also regenerates (see next entry) since it is spliced by the
  same generator.
- `docs/capabilities/` (generated) — `npm run docs:generate` regenerates this directory + README's
  `## Current state` block from live frontmatter whenever the capability count/shape it walks changes;
  `npm run docs:check` REDs on any byte drift (`npm run check`). Never hand-edited (CLAUDE.md, "Three doc
  regions are GENERATED").

### Explicitly not touched

- `pharn/floor/check-loop.mjs` — reused as-is via `spawnSync`; its `{verify-report.json,
regression-report.json, iter, cap}` input signature and its own decision table are unchanged. This is
  the file the whole fix is careful **not** to modify, to keep the "no advisory stage can gate the stop"
  invariant structurally true.
- `pharn/floor/check-bash-reconcile.mjs`, `pharn/floor/reconcile-baseline.mjs` — the reconcile-detection
  gap from the prior incident is a separate, already-closed-by-design mechanism (`STOP_TERMINAL` on a
  reconcile red); out of this SPEC's scope per its own "out of scope" list.
- `.claude/commands/pharn-ship.md`, `.claude/commands/pharn-dev-ship.md` — neither writes a `LOOP.md`;
  no loop-record wiring exists there to extend.
- `pharn/floor/render-ship-briefing.mjs`, `pharn/floor/check-ship-briefing.mjs` — these reference
  `loop-record` only insofar as a `BRIEFING.md` may cite a `LOOP.md` pointer; their own cross-verification
  scope is unrelated to this fix and is not extended by it.

## Acceptance mapping

- SPEC "genuine record → GREEN" / "bad reports or mismatch → RED" / "blocked record → skipped GREEN" →
  `check-loop-decision.mjs`'s three-way branch (Steps 2, 4 above) + its dedicated test file.
- SPEC "existing records without `cap` stay shape-valid" → `check-loop-record.mjs`'s `cap` validation is
  additive-only (Step 1, 5 above).
- SPEC "Step 6c does not run, and reports `not committed: decision unverifiable`, on a RED decision-check"
  → Step 6 (command edit) + Step 7 (hygiene-test closed-set addition) above.
- SPEC "`npm test` green including the four/six new fixtures" → Steps 4–5 above.
- SPEC "`validate.mjs` stays GREEN" → no capability frontmatter is touched (the new file carries no
  `role:`, exactly like every other `pharn/floor/*.mjs`); verified at Verify.
- SPEC "`SKILLS_VERSION` bumped minor, with a `CHANGELOG.md` entry" → Steps 9–10 above.

## Risks & open questions

- The new checker cannot detect a **self-consistent forgery** — a hand-written `LOOP.md` paired with
  hand-written `verify-report.json` / `regression-report.json` that genuinely reduce to the claimed
  decision. This is named in the SPEC's Constraints as an accepted, stated residual: the fix targets an
  **UN-derived** decision reaching an unattended commit, not a fabricated-but-internally-consistent
  report pair. Closing that would mean authenticating the reports themselves (who/what produced them),
  which is out of this increment's scope.
- `check-loop.mjs`'s own exit-2 `INCONCLUSIVE` (bad input) and a recorded non-blocked `INCONCLUSIVE`
  compare as equal tokens by design (Step 2 above) — this is intentional (both represent "the reports
  could not be measured"), not an oversight; flagged here so grill/review can confirm the reasoning
  rather than re-derive it.
