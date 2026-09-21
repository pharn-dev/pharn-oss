# PLAN — finding-backstop-class (per-contributor backstop label on a merged finding)

- spec_content_hash: 83890d9741dd2f63bfe5112a3fcd6d8c49fd3795233eee719e271eba16fd9487 # fix #4 — sha256(pharn/ARCHITECTURE.md), pinned live this run; /pharn-dev-build refuses on drift
- applied_lessons: [L2, L6, L13, L25, L29, L34, L36, L41, L42, L43]
- increment: Emit, per contributor inside a merged finding's additive `sources[]`, a deterministically derived `backstop` label saying what deterministic detection stood behind that lens for **this file** — and render it in `REVIEW.md` so the human at GATE 2 can see it.
- layer(s): the floor (`pharn/floor/`) + the product `.claude/` command surface — **not** a `pharn-*` capability layer (ARCHITECTURE §4's tree governs capabilities; the floor sits beneath it, §2)
- constitution_refs: [P0, P2, P4, P5, P6, P7]
- skills_version: 6.3.0 → 6.4.0 # minor — a newly shipped capability on the product surface

## Trigger (P7) — demonstrated live this run, not asserted

`pharn/CONSTITUTION.md:104-106` admits an addition only on a real failure surfaced in dogfood or an eval.
Constructed and read, at HEAD `231e422`:

1. Two hand-written `findings.json` at the same `src/handlers/query.ts:42` — `injection` (scanner-bound,
   `scan-code-injection.mjs`) and `trust-fence` (scanner-less, `null` in the map).
2. `node pharn/floor/merge-findings.mjs …` (committed, unmodified) → `{"merged":1,"inputs":2,"dropped":0}`.
   They collapsed to one group, as the degenerate-key note predicts — verified live, `44 rule_id: P2`,
   one value corpus-wide. `severity: blocking` was **max-escalated from `trust-fence`**; `problem` /
   `evidence` came from `sources[0]` = **`injection`**.
3. Rendered exactly as Step 6 mandates (`.claude/commands/pharn-review.md:269-273` — every `sources[]`
   entry, attributed to its lens, quoted DATA).

**Read as a reviewer, the two contributors are structurally identical** — name, severity, problem,
evidence. A `grep -riE 'scanner|deterministic|prefilter|backstop'` over the rendered file matched **only**
the trailing blanket `ADVISORY:` verdict, which is a whole-review label and says nothing per-contributor.
The reader cannot tell that the contributor which **set the group's headline severity** rested on nothing
structural, without already holding `lens-scanner-map.json` in their head.

**The nearest existing signal structurally cannot carry it.** Step 6 also mandates rendering
`unassigned_scanner_bound[]` (`:277-281`). Read live, that set is **file-level**
(`pharn/floor/render-review-assignments.mjs:225-231`): target files in no scanner-bound lens's slice. In
the demo `query.ts` **is** in `injection`'s slice, so it would be **absent** from that list — while the
group still carried a scanner-less contributor driving its severity. A file can be scanner-assigned, and
hence absent from that list, while a specific finding on it rests entirely on a scanner-less lens. The two
questions diverge precisely in the case that matters most.

The gap is the one `pharn-review.md:337-341` already **strikes** ("a skill cannot suppress a finding" —
struck outright for exactly the four scanner-less lenses) and `:205-212` names as the carve-out. This
increment makes that struck claim **legible at the point of consumption**. Evidence retained under
`.pharn/pharn-dev-plan/trigger-demo/` (gitignored scratch).

## Decision — what the label MEANS (chosen by the human at the options halt)

Option **B** was selected over the map-only option **A**: the label is derived from the committed
`pharn/floor/lens-scanner-map.json` **and** the per-run assignment record
`pharn/features/<name>/assignments.json`, so it can speak to **this file**, not merely to the lens.

**Rejected alternatives, recorded as the brief requires:**

- **A new `evidence_source` enum in `pharn-contracts/finding-shape.md`, emitted by each lens** — rejected
  before planning. It changes the required object at `finding-shape.md:20-30`, forcing all 22 lenses and
  their fixtures (not one axis); and a lens declaring its own evidence class is **model-declared**, where
  deriving it from a committed, consistency-tested artifact is floor.
- **Render-time derivation only** (Step 6 reads the map; `merge-findings.mjs` untouched) — considered and
  rejected at the options halt. The join would be **model-performed prose**, which is the same objection
  that sinks the enum option, and it would leave nothing machine-readable for a later consumer.
- **A (map-only)** — rejected by the human in favour of B. Recorded because it was the planner's
  recommendation: A needs no new artifact coupling, but can only say "this lens **has** a scanner", never
  anything about this file.

**Why B is not L42's trap, which is the non-obvious part.** L42 warns that re-executing a policy engine
after the fact answers "would it allow this **now**". B does **not** re-run scanners: it reads the
**recorded** verdict. `pharn-review.md:159-162` and the emitter's own header
(`render-review-assignments.mjs:30`) already establish exactly this — a later re-run answers "would this
scanner hit now", not "what was assigned then". Reading the record is the L42-correct side of that line.

**What B costs, stated not hidden.** The record is **not bound to its producer**: `pharn-review.md:317-323`
records this as measured — a hand-authored record with `generated_by: "typed by hand"` exits 0 GREEN. So
the strong claim is one step weaker than "a regex matched this file", and the rendered text must say only
what the artifacts support. That narrowing is carried in `## Guarantee audit (P0)` below and must be
written into the shipped files, not only here (L2).

## The state enum — five members, and each is forced by B

Materialized as one exported frozen array `BACKSTOP_ENUM`, following the `BASIS_ENUM` precedent at
`render-review-assignments.mjs:60-63`, so the tests iterate **the enumeration** rather than whichever
member the author was looking at (L29, L36).

| value              | condition                                                                                                                                        | what the reader learns                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| `scanner-assigned` | map names a scanner ∧ `basis: scanner-bound` ∧ bare path ∈ `slice`                                                                               | a recorded scanner verdict assigned this file to this lens      |
| `scanner-less`     | map `null` ∧ `basis: whole-target-fallback`                                                                                                      | **no deterministic scanner backs this lens** — this is the axis |
| `scanner-errored`  | `{lens, file}` ∈ the record's `scanner_errors`                                                                                                   | that lens's scanner produced **no verdict** for this file       |
| `slice-miss`       | map names a scanner ∧ `basis: scanner-bound` ∧ **bare path ∈ `target`** ∧ path ∉ `slice` ∧ not errored                                           | a recorded verdict did not place this file in the slice         |
| `unknown`          | record absent/unreadable/malformed · lens absent from record · **bare path ∉ `target`** · map unusable or key-miss · **map↔record disagreement** | nothing can be said about what backed this contributor          |

**`target` membership is the load-bearing gate, and it is what makes `slice-miss` fail-closed** (the
grill's blocking finding). Without it a failed join — a `file` whose base form `canonFile` does not
normalize — would be labelled `slice-miss`, a confident negative produced by a lookup failure and
indistinguishable from a true miss. Gating on `target` sends every uncoverable file to `unknown` instead.

**The bare path is derived precisely, in this order:** take the finding's validated `file`, apply the
existing `canonFile` (strips one leading `./` and a trailing `:col`), then strip the trailing `:<line>`
with a single anchored `/:\d+$/` replace. The result is compared against `Set`s built from the record's
`target` and the lens's `slice`, both of which the emitter writes **repo-relative with forward slashes**
(verified live: `render-review-assignments.mjs:95` and `:108` both
`relative(repoDir, …).split(sep).join("/")`). A lens emitting an absolute or `../` path is therefore
outside `target` and lands in `unknown` — the honest direction.

**Why five and not two.** Two states is the honest arity of the _map_ — but under B the _record_ makes
more distinctions than the map, and collapsing them would state falsehoods: labelling an out-of-slice
finding `scanner-assigned` is untrue, and labelling it `scanner-less` is untrue as well. `scanner-errored`
is kept distinct from `slice-miss` because that is exactly what the record's `scanner_errors` field exists
to separate (`render-review-assignments.mjs:162-169`: "a throw is not a miss"); folding them would re-do
the conflation that field was added to end.

**Disagreement fails closed, and that is L43 applied.** The committed map is the authority on whether a
lens has a scanner; the record is the authority on the slice. Where they contradict each other, the label
is `unknown` — the checker does **not** pick a winner. L43's warning is that a consistency check certifies
agreement, never the fact; here the _useful_ direction is the inverse — detecting **dis**agreement — and
the honest response to it is refusal, not arbitration.

**Naming.** `backstop` is the term `pharn-review.md:198` / `:205-207` already uses for this concept, so the
field name cites the command's own vocabulary rather than coining a synonym. The banned words —
"verified", "confirmed", "corroborated", "high/low confidence" — appear in **no** member name and in **no**
rendered string: every member is a property of the **contributor**, never a claim about the finding.

## Applied lessons

- **L6** — the label is read from **structured locations only**: the map's `scanners[<lens>]`, the record's
  `basis` enum, `scanner`, `slice` and `scanner_errors`. No lens's Layer-1 prose is grepped, and no
  free-text field participates in the derivation.
- **L34** — the anti-vacuity duty. A broken `path:line` → bare-path join would label **everything**
  `slice-miss` and still read as a plausible finding about the lenses. So the suite asserts a **positive**
  `scanner-assigned` case, that the corpus yields **≥ 2 distinct** members, and that the label set is
  non-empty — a suite that certifies a suppressed or uniform emission fails.
- **L29** — the remedy is quantified over a set, so the **enumeration is the deliverable**: one exported
  frozen `BACKSTOP_ENUM` that the tests loop over, not five assertions hand-written per member.
- **L36** — presence is not closure. `backstop` is a parameterized vocabulary that will acquire variant
  spellings, so a **closure** assertion collects every emitted value **and** every rendered label string
  and requires each to map to a member — a variant of _any_ member fails, not just the one that drifted.
- **L43** — the map plus `lens-scanner-map.test.mjs` certify that the mapped scanner **file exists on
  disk** (read live: `:44-48`), never that it ran, matched, or works. The label inherits that bound, and
  map↔record disagreement yields `unknown` rather than an arbitrated answer.
- **L42** — the label reads the **recorded** verdict instead of re-running scanners, because re-execution
  would answer "would this hit now" rather than "what was assigned then".
- **L41** — the two new flags carry defaults, and a default every test overrides is exercised by nothing:
  one test must exercise the **default** resolution of each path, not only the fixture override.
- **L2** — the honesty must travel with the durable artifact. The `scanner-assigned` narrowing (the record
  is unauthenticated) is written into `merge-findings.mjs`'s header **and** `pharn-review.md`'s guarantee
  audit, not only into this ephemeral PLAN.
- **L25** — a rationale comment reaches only the file it sits in, so the render bound is stated in
  `pharn-review.md` as well; and while correcting the stale `pharn/features/<lens>/` wording the claim is
  **re-derived** from Step 4 live rather than carried across.
- **L13** — the artifacts this increment writes are formatted with the scoped prettier +
  markdownlint-cli2 pair, never a repo-wide formatter (whose Bash writes escape the fix #7 scope, L19).

## Render requirements — two constraints that must hold TOGETHER

Discovered live while rendering the trigger evidence, not reasoned about:

1. **Taint separation (P2).** The label is trusted-derived and sits beside `sources[].evidence`, which
   legitimately quotes hostile payloads. So the label goes on the contributor's **plain attribution line**
   and never inside a `>` blockquote; every free-text field stays inside one.
2. **markdownlint-clean (L9/L11).** `pharn/features/<name>/REVIEW.md` is an in-repo `.md` inside
   `lint:md`'s `**/*.md` glob — `.pharn/lessons-index.md` is excluded but `.pharn/**` is not, and no
   `pharn/features/**` exclusion exists either. **Measured this run:** the trigger render REDded
   `npm run lint:md` with 3× `MD028/no-blanks-blockquote` until the adjacent `problem` / `evidence` quotes
   were joined by a `>` continuation line. A render that emits a blank line between two quoted fields
   therefore **breaks a verify gate for every later feature** — the L11 failure mode exactly.

These interact: satisfying (1) by putting the label between two blockquotes is what produces (2)'s
violation. The Step-6 shape must put the label **before** the contributor's single joined quote block.

## Files

- `pharn/floor/merge-findings.mjs` — derive the `backstop` label per contributor; emit it inside `sources[]`; add `--lens-map` / `--assignments`; correct the two stale path comments — layer floor
- `pharn/floor/merge-findings.test.mjs` — the enum-closure, non-vacuity, join, fail-closed and determinism tests — layer floor
- `.claude/commands/pharn-review.md` — Step 6 renders the label on each contributor's attribution line; Step 5 note; guarantee audit line — layer product command surface
- `SKILLS_VERSION` — 6.3.0 → 6.4.0 — layer repo root
- `CHANGELOG.md` — one entry recording the change and the bump — layer repo root
- `README.md` — the shields badge value, which `check-version-badge.mjs` holds equal to SKILLS_VERSION — layer repo root

### Explicitly not touched

- `pharn/pharn-contracts/finding-shape.md` — the six required scalars stay byte-identical; the label is additive inside `sources[]`. See `## Open questions (HALT)` Q1 for why no contract line is added.
- The 22 lenses under `pharn/pharn-review/**` and their eval fixtures — unchanged; no lens emits or reads the label.
- The dedup key, the max-severity escalation, and the `sources[0]` representative text — a real documented defect (`merge-findings.mjs:20-35`), a different axis, and **this label must not be sold as mitigating it**.
- `pharn/floor/lens-scanner-map.json` and `pharn/floor/render-review-assignments.mjs` — read, never written.
- Lens membership (`count-lenses.mjs`) and every scanner.

## Contracts satisfied

- `pharn/pharn-contracts/finding-shape.md` — cited, not restated (P4). The merged object keeps the six
  required scalars conformant; `backstop` lives inside the additive `sources[]`, which
  `merge-findings.mjs:52-58` documents and `check-structural.mjs` ignores.
  `needle_absent_from_enum_gated` continues to scan only the enum-gated fields.
- `review-assignments/v1` — the schema the record declares. **Bound, discovered live and stated:** there is
  **no contract document** for it (`pharn/pharn-contracts/` holds nine files; none names it), so this
  increment consumes an artifact whose shape is defined only in its emitter and checker. Recorded in Q1,
  not fixed here.

## Evals to write (P1)

- `backstop` enum closure → every value the deriver can emit, and every label string Step 6 renders, ∈
  `BACKSTOP_ENUM` — a variant spelling of any member fails (L36).
- scanner-bound vs scanner-less → the trigger fixtures merged into one group **must** receive **different**
  labels; identical labels FAIL. This is the brief's named vacuous-test guard.
- positive join → a `scanner-assigned` case genuinely appears, so a broken `path:line` → bare-path join
  that labels everything `slice-miss` cannot pass green (L34).
- non-vacuity → the fixture corpus yields ≥ 2 distinct members and a non-empty label set (L34).
- absent record → every contributor is `unknown`; **no** member of the confident set is emitted.
- unreadable / malformed record, and a lens missing from it → `unknown`.
- map↔record disagreement → `unknown`, not an arbitrated pick.
- `scanner_errors` → `scanner-errored`, asserted **distinct** from `slice-miss` on the same file.
- default path resolution → exercised for both flags without a fixture override (L41).
- argv parse → an input findings file literally named `--lens-map` is not silently consumed as a flag.
- determinism (P5) → output bytes stay invariant under input-file and intra-array order with the label present.
- render proof → produce an actual `REVIEW.md` from the fixtures and read it. Grepping
  `pharn-review.md` for the field name does **not** discharge this (the brief's wrong-object ban).

## Guarantee audit (P0)

- "the emitted `backstop` value is a deterministic function of the committed map and the record" →
  **floor: enum-regex** (ARCHITECTURE §2 primitive #3). Zero LLM; `BACKSTOP_ENUM` is a closed set.
- "`scanner-less` means no deterministic prefilter exists for that lens" → **floor: enum-regex** over the
  committed, consistency-tested map. **NARROWED (L43):** the map certifies the scanner file **exists**,
  never that it works.
- "`scanner-assigned` means a deterministic regex **matched** this file" → **STRUCK.** The record is not
  bound to its producer (`pharn-review.md:317-323`, measured). The floor claim is exactly: _the record
  states this file was assigned to this lens on a scanner-bound basis, and the committed map agrees that
  lens has a scanner._ The rendered text says only that.
- "a missing, stale or malformed record cannot yield a confident label" → **floor: enum-regex** — every
  unusable input resolves to `unknown`, fail-closed.
- "the label makes a finding more or less likely to be true" → **STRUCK (the disease).** It is a property
  of the **contributor**, never of the finding. A scanner-bound label adds **no** credibility; a
  scanner-less label subtracts a guarantee a reader may otherwise assume. One-directional.
- "the human at GATE 2 will notice the label" → **advisory.** Nothing reads `REVIEW.md`; presence is render
  discipline, not a floor guarantee.
- "this label mitigates the degenerate dedup key" → **STRUCK.** It labels contributors; the key defect is
  untouched.
- net → **no new floor primitive.** This is primitive #3 applied to two artifacts already on the floor.

## Trust audit (P2)

- **Inputs.** Per-lens `findings.json` free-text stays `trust: untrusted` and is unchanged by this
  increment. `assignments.json` is a _new_ input and is consumed for **enum-gated fields only** — the
  `basis` enum, `scanner`, `lens` names, `slice` paths, `scanner_errors` pairs. No free text from it
  reaches the label, and its scalars pass the existing `isCleanScalar` guard before use, so a control-char
  or newline laundered into a record field cannot become a rendered label or a section header.
- **Taint separation at the render — a requirement, not a nicety.** The label is trusted-derived and lands
  beside `sources[].evidence`, which legitimately quotes hostile payloads
  (`merge-findings.mjs:213`). Separation is **structural**: every free-text field stays inside a `>`
  blockquote; the label sits on the contributor's plain attribution line and **never** inside a quote. So a
  trusted-looking string cannot lend its air to the untrusted text beneath it.
- **Fail-closed direction.** An unusable or contradictory record degrades to `unknown` — the direction that
  removes a claim rather than inventing one.
- **Residual, named.** A forged-but-consistent record produces a confident label. Bounded — the review
  gates nothing, and a Bash-capable actor could already edit the findings themselves — but not zeroed, and
  it is why "`scanner-assigned` means a regex matched" is struck above rather than softened.

## Open questions — ALL RESOLVED at the GATE-1 approval (none outstanding)

Recorded here rather than deleted, so the approved record shows what was asked and who answered. Each
answer's provenance is named; none was inferred. `/pharn-dev-build`'s Step-1.1 gate is therefore clear.

- **Q1 → RESOLVED, no contract edit.** Answered by the human at the options halt ("No contract edit;
  named follow-up"). Follow-up slug **`finding-shape-sources-array`**, DEFERRED.
- **Q2 → RESOLVED, five states.** The planner's recommendation, carried by the GATE-1 approval. The
  collapse to four was offered explicitly and not taken.
- **Q3 → RESOLVED, local stdlib reader + ✧ pin test.** The planner's recommendation, carried by the
  GATE-1 approval. The cross-import alternative was offered explicitly and not taken.
- **Q4 → RESOLVED, informational only.** The entry joins the existing `### Added` group under
  `[Unreleased]`; no second `### Added` is opened (MD024 `siblings_only`).

**Amendment during the build: `README.md` added to `## Files`.** `npm test` came back 2165 pass / 1 fail,
the single failure being `check-version-badge` — the README shields badge is held **equal** to
`SKILLS_VERSION` by a floor check, so bumping the version without the badge is a RED. The plan declared
`SKILLS_VERSION` and missed its bound twin. Recorded rather than quietly widened: the remedy is the one
the writes-scope discipline prescribes — **declare the path in `## Files` and re-run the setter**, never
route the write around the hook. This is **L43's shape** seen from the other side: that lesson is about
several stores of one fact going stale together, and here the floor check that binds two of them is
exactly what caught the omission.

**Amendment after the grill (recorded, because it changes the derivation).** `GRILL.md`'s
blocking-severity finding showed that `slice-miss` was **not** fail-closed: a `file` in a base form
`canonFile` does not normalize would fail the join and be labelled `slice-miss`, a confident negative
manufactured by a lookup failure. **Remedy folded into the build, inside the approved scope** — no new
file, no new enum member: `slice-miss` is now gated on the file being present in the record's own
`target` array, and a file the record does not cover resolves to `unknown`. Two consequences follow, both
also from the grill: the bare-path derivation is written down precisely, and stdout gains an explicit
degradation signal so a silent all-`unknown` run is visible to an operator.

## Original questions, as asked

- **Q1 — the two undocumented-artifact gaps.** `finding-shape.md` never mentions `sources[]` **at all**
  (verified live: zero occurrences), and `review-assignments/v1` has no contract file. The human chose "no
  contract edit; named follow-up" at the options halt, so this increment adds none — a label line inside an
  array the contract never introduces would either restate `merge-findings.mjs`'s header (P4,
  `CONSTITUTION.md:75-80`) or force documenting `sources[]` itself, a second axis. Recording the follow-up
  slug **`finding-shape-sources-array`**: the contract defines six scalars and is silent on the additive
  array two shipped files now depend on. Confirm the slug and that it stays deferred.
- **Q2 — five states, or collapse to four?** `scanner-errored` and `slice-miss` could fold into one
  "a scanner exists but no verdict placed this file in its slice". Five is the planner's recommendation
  (the record keeps the distinction deliberately), but the smaller vocabulary is a legitimate cut the human
  may prefer. Decide before the diff halt.
- **Q3 — one map reader or two?** `render-review-assignments.mjs:71-78` already **exports**
  `readScannerMap(repoDir)`. Its signature takes a repo dir, not a path, so it does not fit `--lens-map`.
  Plan: a local stdlib-only reader in `merge-findings.mjs` (matching the floor checkers' zero-cross-import
  norm) plus a ✧ test pinning that both readers accept and reject the same map shapes — L31's obligation
  set, materialized rather than left implicit. Confirm, or require the cross-import instead.
- **Q4 — `CHANGELOG.md` placement.** `### Added` already exists under `[Unreleased]` (line 1521), and the
  section's own comment plus markdownlint MD024 `siblings_only` require joining that group at its top
  rather than opening a second `### Added`. Flagged because it is a build-time constraint, not a judgment
  call — no answer needed unless the entry belongs under a different type.
