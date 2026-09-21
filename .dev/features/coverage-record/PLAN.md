# PLAN — coverage-record

- spec_content_hash: 83890d9741dd2f63bfe5112a3fcd6d8c49fd3795233eee719e271eba16fd9487 # fix #4
- applied_lessons: [L2, L6, L8, L20, L23, L29, L34, L35, L36, L37, L41, L42, L43]
- increment: `/pharn-review` emits a deterministic, machine-readable record of which slice was ASSIGNED to which lens over the resolved target, and a floor checker validates that record's shape and internal consistency.
- layer(s): pharn/floor (deterministic helpers) + the product `.claude/` command surface # pharn/ARCHITECTURE.md §4
- constitution_refs: [P0, P3, P5, P6, P7]

## Applied lessons

- **L2** — the emitter's and checker's own headers must carry the guarantee audit, not only this PLAN: the
  PLAN is ephemeral and the shipped `.mjs` is durable, so the "assigned, never read" bound is written into
  both files' headers, and each may cite only floor ops live at build time.
- **L6** — lens membership is read from `count-lenses.mjs` (the structured location), never grepped from
  `pharn-review.md` prose; this is also why the checker's test suite may not prove anything by grepping the
  command for the word "slice".
- **L8** — checked live before adding a fourth artifact: `/pharn-review` deliberately sets NO writes-scope
  (its Step 0 `--clear`), so its writes ride the fail-closed default's `pharn/features/**`. Adding
  `assignments.json` under that prefix therefore needs no setter change and does not worsen the N-writer
  problem L8 describes.
- **L20** — the record's absence has recurred as a discipline-only remedy (`pharn-review.md:110` has
  instructed "record the resolved target file list" with nothing enforcing it), which is what earns it a
  floor check rather than a louder sentence.
- **L23** — the reason the checker is NOT wired into `/pharn-verify`: a stage that writes an artifact AND
  owns a gate over it carries a self-referential conflict invisible on the happy path. The self-check runs
  inside `/pharn-review` instead, gating nothing downstream.
- **L29** — the two enumerations this increment must extend (`PIPELINE_ARTIFACTS`,
  `reconcile-ignore.json`) are materialized in `## Files`, and invariant I1 is written as set EQUALITY over
  the registered lens set rather than as one presence assertion per lens.
- **L34** — decisive here, and it changed the record's shape: a naive `unassigned[]` would be **vacuously
  empty forever**, because the four scanner-less lenses take the whole target, so every file is nominally
  assigned to something. The record instead carries `unassigned_scanner_bound[]`, and invariant I4 forbids
  a vacuous pass over an empty target.
- **L35** — why the `pharn-contracts/` schema is DEFERRED: the shape would then live in emitter, checker
  and contract, and no checker in this repo reads a record contract as an input (probed live:
  `check-loop-record.mjs:79` hardcodes `DECISION_ENUM` and only cites `loop-record.md`).
- **L36** — I1 is a CLOSURE assertion (the record's lens set equals the registered set, both directions),
  not a per-member presence set that a later-added lens would silently escape.
- **L37** — applied to this increment's own method: the trigger was established by EXECUTING the scanners
  and the merge and comparing sha256s, not by reading `merge-findings.mjs` and reasoning about it; every
  universal quantifier in the Guarantee audit below is one I probed.
- **L41** — the emitter's `--base` default must be exercised by at least one test with the flag ABSENT,
  because `/pharn-review` invokes it without `--base` and that is exactly the path a hermetic suite misses.
- **L42** — the sharpest constraint on the checker: it MUST NOT re-run the scanners to verify a slice.
  Re-execution answers "would this scanner hit NOW", not "was this slice assigned THEN". Slice truth is
  captured at emission; the checker does set algebra over what was recorded.
- **L43** — the honest ceiling on the checker: validating the record against its own fields certifies
  agreement, never that the resolved target was the right one. Stated as an explicit advisory bound rather
  than left for a reader to infer.

## The triggering failure (P7 — dogfood, established BEFORE planning)

Route (a), run live this session over a 6-file target. All 18 mapped scanners were executed over every
target file; **18 of 18 mapped lenses got an empty slice**, which `pharn-review.md:132` explicitly permits
skipping the spawn for.

- **Probe 1 (lens-level).** Run A spawned 22 lenses; run B spawned 1 and skipped 21. Merged
  `findings.json` sha256 **identical**: `4dcba3c0dee6481b1137e72c812895d130a9a378e78f307aab13657d1f9f9b17`.
- **Probe 2 (file-level, decisive).** Tested the strongest counter-hypothesis — that the `lenses/`
  directory tree carries coverage. Run C reviewed 6 files, run D reviewed 1 file (5 never examined), both
  with all 22 lens dirs present. Lens dir trees identical; merged bytes identical; same sha256.
- **Honest nuance.** `merge-findings.mjs` stdout differed in probe 1 (`inputs:22` vs `inputs:1`) but is
  persisted into no artifact and counts INPUT FILES — in probe 2 it reads `inputs:22` for both, across a
  6× coverage difference. It is not a coverage signal.
- **Absence confirmed exhaustively (not a windowed grep).** Full enumeration of `pharn/floor/`,
  `pharn/pharn-contracts/`, `.claude/commands/` — **154 files**. No filename contains
  coverage/target/assign/slice. Repo-wide grep for `target_files|resolved_target|coverage_record|assigned_to|unassigned`
  returns one unrelated prose hit in an old PLAN.md. Every `REVIEW.md` occurrence in `pharn/floor/*.mjs` is
  a comment or provenance citation; **no checker reads it.**

`/pharn-dev-review` **shares the hole but not the shape** — it writes only prose `REVIEW.md`, with no lens
fan-out, no per-lens `findings.json` and no merge, so there is no assignment to record. **Out of scope;
nothing there changes.**

## Files

- `pharn/floor/render-review-assignments.mjs` — NEW. Deterministic emitter: resolves the target, runs
  `count-lenses.mjs`, runs each mapped scanner, writes `assignments.json`. Node stdlib only, no LLM call — layer pharn/floor
- `pharn/floor/render-review-assignments.test.mjs` — NEW. Emitter tests, incl. the L41 absent-`--base` case — layer pharn/floor
- `pharn/floor/check-review-assignments.mjs` — NEW. Floor checker over a record: invariants I1–I6 — layer pharn/floor
- `pharn/floor/check-review-assignments.test.mjs` — NEW. Checker tests, incl. the two mandated failure cases — layer pharn/floor
- `.claude/commands/pharn-review.md` — Step 1/3/6 read the emitter's record; Step 6b self-check; Guarantee audit updated — layer product command surface
- `pharn/floor/check-regress.mjs` — `PIPELINE_ARTIFACTS += "assignments.json"` (L29 enumeration) — layer pharn/floor
- `pharn/floor/reconcile-ignore.json` — `pipeline_artifacts.names += "assignments.json"`, pinned set-equal to the above — layer pharn/floor
- `SKILLS_VERSION` — `6.1.0` → `6.2.0` — layer repo root
- `CHANGELOG.md` — the 6.2.0 entry recording the bump and this change — layer repo root
- `README.md` — the shields version badge, held to `SKILLS_VERSION` by `check-version-badge.mjs` — layer repo root
  <!-- Added DURING the build, not at plan time, and the discovery is worth recording: the badge is a
  SECOND store of the version, and `npm test` RED-failed on it the moment SKILLS_VERSION moved. The plan
  had declared the bump without its dependent — exactly the class `check-version-badge.mjs` exists to
  catch, and the reason it exists is that the badge sat at 1.0.0 through the whole 2.x line unnoticed.
  Declared here and re-scoped rather than written past the guard. -->

### Deliberately NOT in scope

Noted, left alone, per the brief. This block is a **heading**, not a bold prose intro: `set-writes-scope.cjs
--from-plan` ends the authorized list at a heading, and a bold intro outside its narrow cue vocabulary
fails OPEN and grants write-scope to every path named below (**L18**, which recurred here — the first
setter run on this plan reported `10 path(s)` against the 9 declared, leaking `/pharn-dev-review`).

- The degenerate `rule_id` dedup key (`merge-findings.mjs` — all 22 lenses emit `rule_id: P2`). Noted; untouched.
- Lens membership, the merge key, any lens body, and the finding shape. All untouched.
- `/pharn-dev-review`. Untouched.

## The record — derived invariants, each justified against the honesty bound

The record claims **"this slice was ASSIGNED to this lens"**. It never claims a lens READ, reviewed,
covered or examined anything — spawning and each lens's judgment are advisory (`pharn-review.md:31`), and
the Guarantee audit there already strikes "each reads only its slice".

Fields, all floor-reducible: `target[]` (Step 1's deterministic resolution), `lenses_registered[]`
(`count-lenses.mjs`), `assignments[]` (one entry per registered lens: `{lens, basis, slice[]}`), and
`unassigned_scanner_bound[]`.

- **I1 — registered-lens closure.** `assignments[]`'s lens set EQUALS `count-lenses.mjs`'s registered set,
  both directions. _Why sound:_ membership is floor (primitive #3). _Why closure not presence:_ L36 — a
  per-lens presence set is satisfied by a record missing a lens added later.
- **I2 — slice ⊆ target.** Every path in every slice is a member of `target[]`. _Why sound:_ pure set
  membership over recorded fields; one of the two mandated failing tests.
- **I3 — `unassigned_scanner_bound` is exactly `target \ ⋃(scanner-bound slices)`.** Recomputed by set
  algebra from the record's own fields. _Why this field and not `unassigned[]`:_ L34 — the four
  scanner-less lenses take the whole target, so a plain `unassigned[]` is empty by construction and would
  certify nothing. This field measures what no deterministic prefilter reached — the brief's "widest
  nominal assignment on the weakest basis".
- **I4 — non-vacuity guard.** An empty `target[]` is RED unless the record explicitly declares the empty
  target. _Why sound:_ L34 — without it, I1–I3 all pass vacuously and a suppressed emission is
  indistinguishable from a clean one.
- **I5 — basis enum.** Each assignment's `basis ∈ {scanner-bound, whole-target-fallback}`, and a
  `scanner-bound` entry names a scanner present in `lens-scanner-map.json`. Primitive #3.
- **I6 — well-formedness.** No duplicate lens entries; paths control-char-free (the `isCleanScalar`
  discipline `merge-findings.mjs` already applies to enum-gated fields).
- **I7 — scanner errors (added POST-REVIEW, recorded rather than retrofitted silently).**
  `scanner_errors[]` present and well-shaped, every entry inside the target, naming a lens that has an
  assignment, and **disjoint from that lens's slice**. _Why it exists:_ the first implementation folded a
  scanner that failed to RUN into a clean miss, so a wholly broken scanner was indistinguishable from a
  clean target and its files drifted into `unassigned_scanner_bound` with nothing saying why. Same move
  as I3 — make the invisible visible rather than widen a claim. Surfaced by this increment's own
  `/pharn-dev-review` (finding 3), fixed before landing.

**What the checker deliberately does NOT do.** It does not re-run the scanners (**L42** — that answers
"would this hit now", not "was it assigned then"). It does not claim the resolved target was complete or
apt (**L43**). It does not claim any lens read its slice.

### Emitter fail-closed paths (added post-grill, closing GRILL G1 + G4)

The grill raised that the emitter's happy path was specified precisely and its edges not at all. P5
determines both uniquely — the terminal fallback is refuse-or-ask, never a guess — so they are recorded
here rather than invented at build time:

- **No resolvable target** (the command's third Step-1 branch, whose fallback is _ask the human_ — which a
  deterministic emitter structurally cannot do): the emitter **exits non-zero and writes nothing**. It
  never emits an empty-target record, because a record is a claim and "I could not resolve a target" is
  not one. `/pharn-review` then asks, exactly as its Step 1 already prescribes.
- **A registered lens absent from `lens-scanner-map.json`**: the emitter **exits non-zero and writes
  nothing**. It never invents a `basis`. This is reachable only if `lens-scanner-map.test.mjs`'s
  consistency pin has already failed, so the honest response is to refuse rather than paper over it.
- **Both paths get a test** (added to the Evals list below), because an unexercised fail-closed path is
  the L41 blind spot.

## Contracts satisfied

- `pharn/pharn-contracts/finding-shape.md` — cited, not restated (P4). The record is a SEPARATE artifact
  precisely because `finding-shape.md:57` defines `findings.json` as a JSON **array** of finding objects;
  a wrapper object would break that contract and `check-structural.mjs`'s `actual.json` input. Confirmed
  live this run.
- A `pharn-contracts/` schema for the record is **DEFERRED** (see Open questions), not omitted.

## Evals to write (P1)

P1 binds Capabilities (`role:`-bearing `.md`). This increment adds **no Capability** — two floor `.mjs`
helpers and a command edit — so the P1 evals obligation does not attach. The equivalent rigor is the two
`*.test.mjs` suites, which is how every existing `pharn/floor/` checker is gated.

- `check-review-assignments.test.mjs` → **a registered lens missing from the record → non-zero exit** (mandated)
- `check-review-assignments.test.mjs` → **a slice containing a path outside `target[]` → non-zero exit** (mandated)
- `check-review-assignments.test.mjs` → an empty `target[]` with per-item assertions otherwise satisfiable → RED, not a vacuous pass (I4 / L34)
- `check-review-assignments.test.mjs` → a record whose `unassigned_scanner_bound` understates the true set-difference → RED
- `check-review-assignments.test.mjs` → a lens added to the registered set but absent from the record → RED (I1 closure, L36)
- `render-review-assignments.test.mjs` → invoked with **no `--base` flag** → resolves the production default (L41)
- `render-review-assignments.test.mjs` → **no resolvable target → non-zero exit, nothing written** (GRILL G1; never an empty-target record)
- `render-review-assignments.test.mjs` → **a registered lens absent from `lens-scanner-map.json` → non-zero exit, nothing written** (GRILL G4; never an invented `basis`)
- `render-review-assignments.test.mjs` → a target where every mapped scanner misses → emitter records 18 empty slices and a non-empty `unassigned_scanner_bound` (the probe-1 shape, as a fixture)
- `check-regress.test.mjs` / `check-bash-reconcile.test.mjs` → the two enumerations stay set-equal with `assignments.json` added

## Guarantee audit (P0)

- "Every registered lens appears in the record with a declared slice" → **floor: enum-regex** (set equality vs `count-lenses.mjs`)
- "Every recorded slice path is a member of the resolved target" → **floor: enum-regex** (set membership)
- "`unassigned_scanner_bound` is exactly the set-difference" → **floor: enum-regex** (recomputed set algebra)
- "The record cannot pass vacuously over an empty target" → **floor: enum-regex** (integer length test, I4)
- "The recorded slices are the ones the scanners actually produced" → **floor AT EMISSION** (the emitter runs them; no model chooses a slice), **NOT re-verified at check time** — L42. A record hand-edited after emission is not detected by this checker.
- "A lens READ, reviewed, covered or examined its slice" → **ADVISORY — struck.** Nothing on the floor reaches it.
- "The resolved target was the complete or correct set of files to review" → **ADVISORY** (L43). The checker certifies internal agreement, never the target's aptness.
- "`/pharn-review` reviewed these files" → **struck (the disease).** The record says what was ASSIGNED.
- "The checker catches live defects" → **ADVISORY, and stated plainly:** over a deterministic emitter the checker is near-vacuous on the happy path. It earns its place through its test suite and as a regression detector if the emitter drifts.
- "The checker's exit code gates anything" → **NO.** It is consumed only by `/pharn-review`'s own self-check and gates nothing downstream. Named residual: `review-assignments-gate`, deliberately unbuilt (P7 — no failure has yet occurred for a gate).

## Trust audit (P2)

The review target is `trust: untrusted`. The record ranges over **paths and lens names only** — no free
text from the target enters it, so no tainted field reaches any invariant. Target paths are recorded as
DATA and control-char-checked (I6) before they can appear in a record the checker reads. The record adds
**no** new channel from untrusted content to a guaranteed decision: its fields are enum-gated by
construction, and the checker's verdict rests on set algebra over them alone.

## Versioning

- **`SKILLS_VERSION` 6.1.0 → 6.2.0 (minor).** Product-surface bytes change: `.claude/commands/pharn-review.md`
  (a product `pharn-*` command) and `pharn/floor/*.mjs` are both in the bump-triggering set, and a newly
  shipped checker is a new capability → minor, not patch.
- **CHANGELOG entry required**, in the same entry that records the bump.
- **`MIN_CLI` stays `0.5.0`.** No installed path relocates and no frontmatter/contract change invalidates
  an existing install; the two enumeration additions are additive and the CLI reads neither. Per CLAUDE.md,
  `MIN_CLI` bumps only when an older CLI would install a BROKEN tree.

## Risks — the failure modes this increment must catch in itself

- **Vacuous test (L34).** The checker's suite must FAIL when a registered lens is missing from the record
  and when a slice contains a path outside the target. A suite that passes on a one-lens record over an
  empty target proves nothing — I4 exists precisely to make the empty-target case RED rather than green.
- **Instrument-vs-invariant (L6).** Nothing is proven by grepping `pharn-review.md` for "slice". The
  evidence is the checker's exit code over fixtures; membership comes from `count-lenses.mjs`.
- **Truncation-as-absence (L37).** Discharged above with a 154-file enumeration over all three named
  directories, not a windowed grep.
- **Scope creep.** The degenerate `rule_id` key is noted and left. Lens membership, the merge key, lens
  bodies and the finding shape are untouched.
- **The near-vacuous checker.** Stated in the Guarantee audit rather than hidden: over a deterministic
  emitter, the happy path always passes. If review judges this makes the checker not worth its weight, the
  honest alternative is emitter-only with the invariants as emitter assertions — flagged for the grill.
- **Two enumerations drifting (L29).** `PIPELINE_ARTIFACTS` and `reconcile-ignore.json` are pinned
  set-equal by existing tests; both are in `## Files` so the pair moves together or a test fails.

## Open questions (HALT) — ALL RESOLVED at GATE 1

**Status: none outstanding.** Both entries below are recorded decisions, not live questions; this section
is retained as the audit trail of how each was settled, not as a pending halt.

- **RESOLVED (human, GATE 1, 2026-09-20):** the artifact is named **`assignments.json`**. Asked as a
  selectable option against `coverage.json` and a slug-rename variant; the human chose `assignments.json`
  — "Name states the claim: ASSIGNED." The increment slug `coverage-record` is unchanged.
- **RESOLVED (recorded deferral, not a pending question):** the `pharn-contracts/` schema is DEFERRED.
  Reopen trigger: the first
  SECOND consumer of `assignments.json`. Rationale: probed live — no checker in this repo reads a record
  contract as input (`check-loop-record.mjs:79` hardcodes its enum and only cites `loop-record.md`), so a
  contract would be a third store of one shape (L35), and `verify-report.md`'s own preamble records that
  writing a contract made nothing conform to it.
  **Why the name matters (retained rationale for the resolved decision above).** "Coverage" reads as "these
  files were covered/examined", which is exactly the conflation the honesty bound forbids, sitting in the
  filename where every future reader meets it first.
