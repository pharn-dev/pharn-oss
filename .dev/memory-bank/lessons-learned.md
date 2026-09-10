# Lessons learned

Canonical memory-bank state (`ARCHITECTURE.md §5`). Each entry is promoted by a **gated** `/review` or `/build`
action and carries **provenance** (run / feature / diff); promotion to canon is never silent (P2). The
other three canonical files (`architecture-context`, `feature-catalog`, `pattern-library`) are created
when first needed, not speculatively (P7).

## L1 — `/plan` must scope the meta-docs an increment invalidates

type: process · concepts: [plan-shape, meta-docs, doc-drift]

**Lesson.** When an increment changes a fact asserted in a meta-doc — `CLAUDE.md` test/command counts,
`CHANGELOG.md`, the root `README.md` — `/plan` must name that meta-doc in its _Files_ list, or `/build`
ships stale canon (it writes only the files the plan names). Add a meta-doc sweep to the `/plan`
discovery step (P6): after scoping the built artifacts, ask _"which meta-docs state a fact this
increment changes?"_ and include them.

**Why it matters.** Stale canon in `CLAUDE.md` misleads every future session — it is injected as project
instructions; a missing `CHANGELOG` entry breaks the file's own "all notable changes are documented"
contract. The floor cannot catch this: `validate.mjs` does not scan meta-docs, so it is an advisory gap
that only `/review` surfaces — exactly how this lesson was found.

**Provenance.**

- feature: `structural-checker`
- diff: commit `0de6f7b` — added a third `node --test` suite (5 → 11 tests) and a new floor command,
  without updating `CLAUDE.md` or `CHANGELOG.md`.
- surfaced by: `features/structural-checker/REVIEW.md` — findings **F2** (`CLAUDE.md:60` asserted "5
  tests" vs live 11) and **F3** (missing `CHANGELOG` `[Unreleased]` entry).
- promoted: 2026-06-24 via gated `/review` (human-approved).

## L2 — A contract's honesty must travel with the artifact, and may cite only live floor ops

type: contract · concepts: [guarantee-audit, doc-drift, live-floor-op]

**Lesson.** When a `/build` amends a contract with a normative `MUST`, two checks must pass at
`/review`: (1) the PLAN's `## Guarantee audit (P0)` honesty (what is advisory vs floor-enforced) must
be written **into the artifact**, not just the PLAN — the PLAN is ephemeral, the contract is durable;
(2) any "enforced by `<floor op>`" phrase must cite an op that is **live**, verified by reading the
implementation this run (P6), not merely spec'd. A contract can faithfully cite the spec (P4) and
still import an unbacked guarantee when the cited floor op (at the time, fix #7 / the writes-scope
guard) is unimplemented.

**Why it matters.** This is the core P0 disease ("written in the contract" ≠ "guaranteed") reproduced
inside PHARN's own contracts. `validate.mjs` cannot catch it — it checks structure, not prose honesty
— so only `/review`, reading the live hook + validate.mjs, surfaces it. The remedy is a `/review`
sub-check: for every new `MUST`/"enforced by" in a contract, confirm a live floor reduction or an
explicit `advisory` label.

**Provenance.**

- feature: `structured-findings` (increment 3a)
- diff: `pharn-contracts/finding-shape.md` +21 lines (`## Emission — findings.json`).
- surfaced by: `features/structured-findings/REVIEW.md` — F1 (`finding-shape.md:45` MUST unlabeled)
  and F2 (`ARCHITECTURE.md:73` cites fix #7 writes-scope guard; `protect-trusted-paths.cjs` implements
  only fix #2). The cited gap (fix #7) has since landed — see L3.
- promoted: 2026-06-25 via gated `/review` (human-approved).

## L3 — Making a declarative field load-bearing requires re-auditing every existing declaration of it

type: scoping · concepts: [writes-scope, declaration-audit, fail-closed]

**Lesson.** When an increment turns a previously-advisory declarative field (here `writes:`) into a
floor-enforced gate, the SAME increment must audit every existing value of that field against where the
workflow actually writes. A declaration that was harmless while advisory (`/review`'s
`writes: ["REVIEW.md"]`) becomes a guaranteed block the moment it is enforced and the real artifact
lives elsewhere (`features/<name>/REVIEW.md`): the guard then denies the correct path while permitting
nothing useful.

**Why it matters.** Fail-closed enforcement is only safe if the declarations it reads are already true.
Retrofitting enforcement onto a field that drifted from reality converts latent doc-vs-repo drift (P6)
into active, guaranteed friction — and the friction lands on the next operator, not the author.
`validate.mjs` cannot catch it (it checks structure, not declaration-vs-usage), so only `/review`,
running the new guard live, surfaces it. Remedy: a `/review` sub-check — when a field becomes
load-bearing, diff every declaration of it against actual usage in the same increment.

**Provenance.**

- feature: `writes-scope` (fix #7).
- diff: 9 files (3 new hooks/test + 6 edits); `protect-trusted-paths.cjs` byte-unchanged.
- surfaced by: `features/writes-scope/REVIEW.md` — live, Step 0 scoped to root `REVIEW.md`, denying the
  conventional `features/writes-scope/REVIEW.md` (F1). Pre-flagged in the fix #7 build note.
- applied by: `command-artifact-paths` — re-aligned `/plan` + `/review` `writes:` to `features/<name>/`
  (the re-audit L3 prescribes); reviewed GREEN, the convention confirmed live.
- promoted: 2026-06-25 via gated `/review` (human-approved).

## L4 — An authored fixture passes by construction; a live capability must be measured

type: eval · concepts: [eval-fixture, live-measurement, structural-semantic-split, guarantee-audit]

**Lesson.** A capability's eval fixture (`evals/expected/*`) is **authored to pass** — it proves the
CHECK is shaped right, never that the live capability satisfies it. Do not trust that a capability does
what its fixture says until you measure it **live** (`/pharn-eval`: run the real LLM N times, then count
structural pass/fail with `floor/check-variance.mjs`). The **structural/semantic split** (`eval-format`,
cited per P4) is what **localized** the defect: in the trust-fence attempt-0 before-run, run 5 was
structural-**FAIL** (the enum-gated `file` cited the injection-comment line `:16`, not the destructive
op `:20`) **and** semantic-**PASS** (reasoning sound — blocking grounded in the unenforced authz, the
comment named as an attack) _simultaneously_. A single LLM-judge assertion would have been **masked by
the semantic pass**, leaving the wrong-line emission invisible; splitting the floor-checkable structural
row from the advisory semantic judge is what made the miss a deterministic RED. **"Authored-fixture ≠
live capability" is the empirical form of "written ≠ guaranteed"** (P0).

**Why it matters.** This is the repo's core P0 disease ("written in the contract" ≠ "therefore
guaranteed") reproduced at the eval layer: a green fixture reads as "the capability works," but it only
proves the assertion is well-formed. `floor/validate.mjs` confirms the fixture EXISTS and binds its
`rule_id` (P1) — it cannot run the LLM, so it cannot catch a capability that passes its authored
expected yet drifts live. Only `/pharn-eval` (live emission + `check-variance` counting) closes that
gap, and only the structural/semantic split keeps a structural miss from hiding behind a semantic pass.
Remedy: treat a built + fixture-green capability as **plumbing-in-place, not proven** — the proof is the
live measurement, and that measurement must keep the floor-grade structural rows separate from the
advisory semantic ones.

**Provenance.**

- feature chain: `trust-fence` 3a→3c (`structured-findings` 3a finding-shape emission contract →
  trust-fence `findings.json` plumbing 3b → `/pharn-eval` live runner 3c) + the `trust-fence-baseline`
  before/after record.
- before: first live `/pharn-eval` (5 runs, commit `480fa50`) → flaky-structural **4/5**; run 5
  structural-FAIL (`file` = `:16`) + semantic-PASS — recorded in [[feature-catalog]].
- fix: `trust-fence-cite-action-line` (lens tightened to cite the destructive op; built + reviewed
  GREEN). It deferred the candidate lesson (P7: "only after a fix proves out") — this entry is that
  lesson, now earned.
- after: second live `/pharn-eval` (5 runs, commit `6b90d18`) → **structural 5/5** (`file_resolves`
  4/5→5/5); `node floor/check-variance.mjs … runs .` → exit 0, PASS — recorded in [[feature-catalog]].
- boundary (P0): the after is **advisory evidence** (LLM-produced findings; only the counting is
  floor-grade), NOT a guarantee the lens never drifts — the floor guarantee is the DETECTOR
  (`check-variance` / `check-structural` `file_resolves`).
- promoted: 2026-06-25 via gated `/build` (writes-scope = `memory-bank/feature-catalog.md` +
  `memory-bank/lessons-learned.md`, set from `features/trust-fence-baseline/PLAN.md`); P7 trigger = the
  before→fix→after cycle closed (structural 4/5 → 5/5). Note: prior entries were promoted via `/review`;
  this one via gated `/build` per the `/build` instruction — the gate that makes it non-silent is fix #7
  (writes-scope) + per-entry provenance (`ARCHITECTURE.md §5`), not the command name.

## L5 — A floor verdict is only as trustworthy as the orchestration that captures its inputs

type: tooling · concepts: [input-capture, shell-portability, word-splitting]

**Lesson.** A pipeline stage's deterministic FLOOR verdict (`/regress`, `/verify` — exit-code
comparisons) is only as trustworthy as the ADVISORY orchestration that captures its inputs: the exit
codes and file lists are assembled by the command's Bash, and that assembly can silently corrupt them.
Treat input-capture as a trust boundary — make it robust and self-checking (array-expand or quote shell
lists; assert the expected cardinality; fail-closed on a surprising shape) — and never read a green
floor verdict as a guarantee without accounting for how its inputs were produced.

**Why it matters.** The "two clocks" split (the verdict is floor-grade; the orchestration that feeds it
is advisory) has teeth: a verdict computed over corrupted inputs is GIGO, not a guarantee — the P0
disease ("written" ≠ "guaranteed") reproduced one layer up, at the input boundary. Concretely, on the
first full-pipeline run `/regress`'s `tests` gate ran `node --test $LIST` with an unquoted variable
under zsh (the macOS default shell, which does **not** word-split unquoted expansions); the whole list
was passed as a single bogus path → "could not find" → exit 1 at **both** base and head. Being equal on
both sides it evaded a false _regression_ (1 == 1, classified pre-existing), but it fabricated a
pre-existing red and would have **masked** a real tests-gate regression. The floor core
(`check-regress.mjs`) was correct; its inputs were not. The remedy lives in the orchestration layer, not
the floor.

**Provenance.**

- feature: `pipeline-integration-probe` (first full-pipeline integration run).
- commit: `0ae1b38`.
- surfaced by: `features/pipeline-integration-probe/REVIEW.md` (integration finding,
  `.claude/commands/regress.md:116`) + `REGRESSION.md` observation #2.
- promoted: 2026-06-27 via gated `/memory-promote` (human-approved).

## L6 — Membership/structural facts are read from the structured location, never grepped from free text

type: floor · concepts: [membership-test, frontmatter, enum-gated]

**Lesson.** A structural or membership fact — "does this capability declare `role: verifier`?", "what
paths does this plan write?" — is read from its STRUCTURED location (the `---`-fenced YAML frontmatter, an
enum, `package.json`), never pattern-matched as a substring over file contents. The enum-gated vs free-text
split (fix #1) governs MEMBERSHIP DETECTION, not only finding emission: a `role: verifier` string in prose
or a fenced code block is DATA about verifiers, not a declaration of one. A substring grep over contents is
not a membership test — it conflates documentation with declaration.

**Why it matters.** A prose-matching membership check is monotonically unstable: it silently grew from a
predicted 3 to 8 matches as the repo accumulated prose mentioning `role: verifier` (none real
declarations), so `/verify` could believe verifiers exist when none do, or run garbage over them. This is
the P0 disease ("written" mistaken for "declared/guaranteed") at the membership layer — the same discipline
as the scope-setter reading `## Files` structurally (fix #15) and the finding object's enum-gated vs
free-text split (fix #1). Remedy: read membership deterministically from the structured field
(`floor/count-verifiers.mjs` parses the frontmatter fence and counts `role === "verifier"`); reserve free
text for human-facing DATA. Complements L5.

**Provenance.**

- feature: `verifier-membership-frontmatter`
- commit: `c355221f929769ae78dd90063843e804cb3a8fa4`
- surfaced by: `features/verifier-membership-frontmatter/REVIEW.md` — proposed lesson (triggered by
  `pipeline-integration-probe` finding #3, `REVIEW.md:80` / `VERIFY.md`).
- promoted: 2026-06-29 via gated `/memory-promote` (human-approved).

## L7 — A stage's writes: must equal exactly what it writes — never declare a downstream gate's target upstream

type: scoping · concepts: [writes-scope, over-declaration, canon-write, declaration-audit]

**Lesson.** A pipeline stage's `writes:` declaration must list exactly the paths the stage's own code
writes this run — nothing aspirational, and never the target of a _downstream_ gated action. Declaring
`memory-bank/lessons-learned.md` in `/review`'s `writes:` made the fix #7 setter resolve a two-path scope
the pre-write hook then PERMITTED, silently granting `/review` a direct, ungated canon write — the very
power `/memory-promote`'s `check-provenance` + human accept exist to withhold. A stage that only _proposes_
a lesson must not hold write-scope to canon; route the gated write through the dedicated command, which
declares that path itself.

**Why it matters.** fix #7's guarantee — that a stage may write only its declared outputs — is only as
tight as the declaration it reads; an over-declaration is permissive in the _dangerous_ direction (the
same class as the #15 scope-setter `## Files` leak, and the inverse of L3's too-narrow friction). It is the
P0 disease one layer up: the gate is real, yet a stage can be handed a power the gate was built to withhold
simply by naming the gate's target in its own `writes:`. The floor cannot catch a per-command
over-declaration on its own — `validate.mjs` ignores `.claude/`, and nothing enumerates every command's
`writes:` for canon paths (a named, P7-eligible residual). Remedy: declare only real outputs; keep canon
writable solely through `/memory-promote`; and pin the resolved scope with a test (set-equality to the real
outputs) so a future re-widening fails closed. Complements L3 (same field, opposite failure direction) and
L5/L6 (a floor verdict or membership test is only as trustworthy as the declarations and inputs it reads).

**Provenance.**

- feature: `review-scope-tighten`
- commit: `f225203fda33956f9dc4eeac3d42c66122ed3cdd`
- surfaced by: `features/review-scope-tighten/REVIEW.md` — proposed lesson + finding F1; triggered by
  `pipeline-integration-probe` finding #2 (`features/pipeline-integration-probe/REVIEW.md:101-114`).
- promoted: 2026-06-29 via gated `/memory-promote` (human-approved).

## L8 — The writes-scope setter resolves one --target — favor single-file command outputs

type: scoping · concepts: [writes-scope, setter-resolution, command-design]

**Lesson.** `set-writes-scope.cjs` narrows a placeholder `writes:` entry to exactly ONE concrete `--target`
path per call, and each call OVERWRITES `.pharn/writes-scope.json`. A command that emits ≥2 artifacts under
placeholder paths therefore cannot scope them all in a single setter call — only the entry matching `--target`
survives; the others are filtered out and the fix #7 pre-write hook then DENIES them. When designing a new
command's outputs, prefer a SINGLE scopeable file (fold metadata into it); if two artifacts are genuinely
needed, re-scope per-artifact — call the setter once immediately before each write, as `/pharn-dev-regress` and
`/pharn-dev-verify` do. Never assume one setter call authorizes a multi-file placeholder output.

**Why it matters.** fix #7's fail-closed guarantee is only ergonomic if a command's real outputs are
scopeable; a multi-artifact command under placeholder paths silently loses scope on all-but-one output (the
hook denies the rest), so the design pressure is toward single-file outputs or explicit per-artifact
re-scoping. This shaped `/pharn-spec`: the approved-intent content-hash lives IN `SPEC.md` frontmatter
(computed over the body — non-circular) rather than a sidecar `SPEC.lock.json`, keeping the command's output
to one scopeable path. It is a setter MECHANIC constraining command DESIGN — a new axis on the `writes:`/scope
subsystem of L3 (a too-narrow declaration becomes friction) and L7 (an over-broad declaration leaks power),
both of which concern a declaration's CONTENT; this concerns the setter's RESOLUTION shape. Honest trigger
(P7): the constraint was learned at design time and the sidecar friction was AVOIDED, not hit — surfaced by
reading `set-writes-scope.cjs` live, not by a dogfood failure.

**Provenance.**

- feature: `pharn-spec`
- commit: `8155e699e2587605a991d7c400b7065588b7f990` (working-tree dogfood built on this commit; uncommitted at
  promotion time)
- surfaced by: `.dev/features/pharn-spec/REVIEW.md` (proposed lesson candidate) + the `/pharn-dev-build` note
- promoted: 2026-06-30 via gated `/pharn-dev-memory-promote` (human-approved).

## L9 — An increment's own markdown style is gated by neither /pharn-dev-regress nor /pharn-dev-verify

type: process · concepts: [style-gates, gate-map, stage-seam]

**Lesson.** The per-increment deterministic gates leave the increment's OWN markdown style ungated.
`/pharn-dev-regress` deterministically SKIPS the style gates (`format:check` / `lint:md`) unless the change
touches a shared style config — over outside files byte-identical at base and head a style result cannot
flip, so the skip is sound — and `/pharn-dev-verify`'s canonical gate map (`test` / `validate` / `lint` /
`structural`) OMITS them. So a style regression in an increment's own new files — a command edit, or the
pipeline's own `.dev/features/<name>/*` audit artifacts — passes BOTH stages and surfaces only at the full
`npm run check` (or CI). Remedy: add `format:check` + `lint:md` to `/pharn-dev-verify`'s canonical gate map;
`/pharn-dev-verify` runs only at HEAD with devDeps present, so the style gates are cheap (no `npm ci`) and
make the verify verdict track the full `npm run check`.

**Why it matters.** Each stage's omission is individually defensible — regress proves a style flip
impossible without a shared-config change; verify's four gates target 'is it green with this in it' — but
the SEAM between them is unowned: the increment's own NEW markdown is checked by neither. That is the P0
disease in coverage form — 'the gates passed' read as 'the increment is clean' when `npm run check` (the
documented aggregate, GREEN at baseline) was RED. Concretely this run: the `plan-files-scope` build output
plus its PLAN / GRILL / regression-report artifacts failed `format:check`, and PLAN.md failed `lint:md`
(MD038 spaces-in-code-span, from embedding a back-tick-laden regex in prose, plus MD049 emphasis), yet
`/pharn-dev-regress` returned `no-regressions` (style gates skipped — inside touched no shared config) and
`/pharn-dev-verify`'s four canonical gates were green; only the full `npm run check` was RED, caught and
fixed by hand at verify. The remedy lives in the orchestration layer (`/pharn-dev-verify`'s gate map), not
the floor checker — complements L5 (a floor verdict is only as trustworthy as the inputs the orchestration
captures).

**Provenance.**

- feature: `plan-files-scope`
- commit: `a5de975f68af1fe51790a69f84a998b6e9c77baf`
- surfaced by: `.dev/features/plan-files-scope/REVIEW.md` — advisory P0 finding (the `/pharn-dev-verify` gate
  set) + proposed lesson `verify-include-style-gates`; corroborated by
  `.dev/features/plan-files-scope/VERIFY.md` "Style-gate correction".
- promoted: 2026-06-30 via gated `/pharn-dev-memory-promote` (human-approved).

## L10 — Product-pipeline artifacts sit on the validate-SCANNED surface; `.dev/` dev artifacts don't

type: floor · concepts: [validate-scan-surface, dev-product-boundary, enum-gated]

**Lesson.** The dev/product boundary is symmetric on the WRITE side (dev artifacts → `.dev/features/`, product
artifacts → root `features/`) but ASYMMETRIC at the floor's SCAN side: `validate.mjs` `EXCLUDE_SEGMENTS`
excludes `.dev/` wholesale but NOT root `features/`. So a finding-bearing PRODUCT artifact (e.g. a `/pharn-grill`
`GRILL.md` emitting `rule_id:` + `problem:`) is subject to validate CHECK 5 (fix #1 — it must document the
enum-gated / free-text split or trip RED), whereas the equivalent DEV artifact (`/pharn-dev-grill`'s `GRILL.md`
in excluded `.dev/features/`) is never scanned. Consequence: moving the same pipeline from the dev loop to the
product loop silently subjects its audit artifacts to a floor check they never faced — the first real
product-pipeline run can RED validate for an artifact reason unrelated to the user's code. Remedy: either
exclude finding-bearing product pipeline artifacts from validate's scan (mirroring the `.dev/` exclusion), or
ensure the `pharn-*` commands emit split-documented findings by construction (the `/pharn-grill` command already
instructs honoring the split — making it load-bearing for the floor, not just style).

**Why it matters.** The STYLE-gate half of this same dev/product asymmetry (product artifacts also face
`format:check` + `lint:md` at `/pharn-dev-verify`) is L9's territory — verify's style gates now cover them; THIS
lesson is the validate-CHECK-5 half, which L9 does not touch. Note the trust UPSIDE: a laundered needle in a
product `GRILL.md`'s enum-gated field WOULD be caught by CHECK 5, so the asymmetry also closes a real gap — the
only cost is that benign product findings must document the split. Surfaced live by the product-pipeline-probe:
the product `/pharn-grill` `GRILL.md` landed on the scanned surface and passed CHECK 5 only because the split was
documented; a bare-findings `GRILL.md` would have RED'd the floor.

**Provenance.**

- feature: `product-pipeline-probe`
- commit: `a66f5872e48265eb39c4c58b6d58c0593f00e8e4`
- surfaced by: `.dev/features/product-pipeline-probe/PROBE.md` (CF-A) + `.dev/features/product-pipeline-probe/REVIEW.md`
  (proposed lesson).
- promoted: 2026-06-30 via gated `/pharn-dev-memory-promote` (human-approved).

## L11 — Verify's whole-repo style gates let a pre-existing unrelated error block every later feature's verify

type: process · concepts: [style-gates, gate-map, whole-repo-scope]

**Lesson.** L9 added `format:check` + `lint:md` to `/pharn-dev-verify` so an increment's OWN new markdown is
caught. But those gates are WHOLE-REPO and `/pharn-dev-verify` runs them ONCE at HEAD with no base comparison, so
a PRE-EXISTING style error in an UNRELATED committed file (e.g. another feature's frozen
`.dev/features/<other>/REVIEW.md`) makes THIS feature's verify FAIL even when the feature is clean — and
`/pharn-dev-verify`, unlike `/pharn-dev-regress` (which classifies a base-red gate as pre-existing rather than a
regression), cannot distinguish 'this feature's' from 'pre-existing.' Remedy: keep the repo style-clean at merge
(a red whole-repo style gate silently blocks EVERY later feature's verify until someone fixes the unrelated
file), or give `/pharn-dev-verify` a base-vs-head comparison for the style gates (as `/pharn-dev-regress` already
has) so a pre-existing red is classified, not blamed on the feature.

**Why it matters.** It is the P0 two-clocks split at the gate's SCOPE: the whole-repo verdict answers 'is the
repo green with this in it,' which is correct but conflates repo-cleanliness with FEATURE-cleanliness — so
'verify FAILED' reads as 'this increment is bad' when the increment is spotless and an unrelated committed
artifact is the offender. Concretely this run: a clean `architecture-griller` verify returned FAIL on `lint:md`
solely because of a pre-existing MD038 cluster in #30's `root-apparatus-cleanup/REVIEW.md`; the fix required a
human-approved, out-of-scope cleanup to unblock. Complements L9 (which ADDED the gates) and L5 (the
input/orchestration trust boundary).

**Provenance.**

- feature: `architecture-griller`
- commit: `05a466ed8ca8ab9ab45aa7397c6f081d863d319d`
- surfaced by: `.dev/features/architecture-griller/REVIEW.md` — proposed lesson candidate L-GATE-1.
- promoted: 2026-07-01 via gated `/pharn-dev-memory-promote` (human-approved).

## L12 — Prevent an increment's own style misses at BUILD (format written files), don't only DETECT them at verify

type: process · concepts: [style-gates, prevention-vs-detection, formatter]

**Lesson.** L9 made `/pharn-dev-verify` CATCH an increment's own style misses (it added `format:check` +
`lint:md` to verify's gate map). But detection-at-verify means every increment that writes `.md`/`.js` first
REDS verify and needs a manual format pass — recurring friction, and a wrong-direction one (the floor found
it, but only after the build declared itself done). Add PREVENTION at BUILD: `/pharn-dev-build` runs the
project formatter over its just-written files (new Step 2b, ADVISORY) BEFORE its Step-3 floor, so style
conformance is a build-completion step. Prevention (build) and detection (verify, L9) are COMPLEMENTARY, not
substitutes: the format step is advisory orchestration — running `npm run format` / `markdownlint --fix` is
not a floor op, and a prettier↔markdownlint conflict (e.g. an indented fenced block inside a list item) needs
a manual resolve — so it REDUCES the recurring verify red but NEVER REPLACES verify's deterministic style
gate, which stays the real check.

**Why it matters.** "The build formats its output" cannot be a guarantee — running a formatter is advisory
(the P0 two-clocks split: orchestration is advisory, only the floor verdict guarantees), so making it a build
STEP lowers friction while the guarantee stays at verify's `check-verify.mjs` gate map (L9). Concretely this
run: the `product-loop` increment's new files (`pharn-loop.md`, `check-loop.test.mjs`) plus its
`.dev/features/product-loop/*` pipeline artifacts reddened `format:check` + `lint:md` at `/pharn-dev-verify`
(L9's gates caught them, as designed), forcing `prettier --write` + `markdownlint --fix` + one manual
indented-fence→inline edit before verify went green; `build-format-step` adds Step 2b so future builds
format-then-floor. Also re-confirmed L5 this same run: `/pharn-dev-regress`'s `tests` gate hit the EXACT zsh
unquoted-word-split bug L5 documents (`node --test $LIST` under zsh passed all paths as one bogus arg → "could
not find" → a false pre-existing red equal at base and head), re-corrected with `xargs` per L5's remedy —
evidence L5's input-capture boundary recurs and its fix holds. Complements L9 (detection at verify) and L5
(input-capture robustness); the remedy lives in the build ORCHESTRATION layer (Step 2b), not a floor checker.

**Provenance.**

- feature: `product-loop` (trigger) → `build-format-step` (remedy)
- commit: `6e23a4b66e2ea496ca71ee07ccaf61dfe35b1c70` (working-tree dogfood; the Step 2b remedy edit to
  `.claude/commands/pharn-dev-build.md` is uncommitted at promotion time)
- source: `.dev/features/product-loop/REVIEW.md` (proposed lesson candidate) +
  `.dev/features/build-format-step/PLAN.md`
- promoted: 2026-07-06 via gated `/pharn-dev-memory-promote` (human-approved).

## L13 — Extend the Step-2b format discipline (L12) to every artifact-writing stage, not just `/pharn-dev-build`

type: process · concepts: [style-gates, prevention-vs-detection, gate-map]

**Lesson.** L12 added format-at-BUILD (Step 2b: `/pharn-dev-build` formats its just-written files before its
floor), but Step 2b covers ONLY `/pharn-dev-build`'s outputs. The later artifact-writing stages —
`/pharn-dev-regress` (`REGRESSION.md`), `/pharn-dev-verify` (`VERIFY.md`), `/pharn-dev-review` (`REVIEW.md`),
`/pharn-dev-ship` (`SHIP.md`) — write their OWN markdown AFTER build and have NO equivalent format step, so
those artifacts land unformatted and are first caught by `/pharn-dev-verify`'s whole-repo `format:check`
(L9's gate), forcing a manual `prettier --write` mid-pipeline. Remedy: extend the Step-2b discipline so each
artifact-writing stage runs `prettier --write` over its own artifact before halting — advisory orchestration
exactly like L12's Step 2b; it REDUCES the recurring mid-pipeline red but NEVER replaces verify's
deterministic style gate (L9), which stays the real check.

**Why it matters.** Concretely this run (`applies-scope`): `REGRESSION.md` written by `/pharn-dev-regress`
landed unformatted → `/pharn-dev-verify` `format:check`=1 on the first gate pass → fixed by hand with
`prettier --write`, then all six gates green. This is a NARROW extension of L12 (build-only prevention),
naming a distinct remedy target — the post-build stages' own artifacts. Complements L9 (detection at verify),
L11 (whole-repo scope), and L12 (prevention at build).

**Provenance.**

- feature: `applies-scope`
- commit: `e69ad89cd30b25e0241525e03f00430272349e1b`
- source: `.dev/features/applies-scope/REVIEW.md` (proposed lesson candidate) +
  `.dev/features/applies-scope/VERIFY.md` (L9 build-hygiene note)
- promoted: 2026-07-07 via gated `/pharn-dev-memory-promote` (human-approved).

## L14 — A shape-regex tightening of an enum-gated field must COMPOSE with the control-char guard, never replace it

type: floor · concepts: [enum-gated, control-char-guard, regex-anchoring]

**Lesson.** When you tighten an enum-gated validator (e.g. `merge-findings.mjs`'s `RULE_ID_OK`) from a
permissive "any clean single line" rule to a shape whitelist, layer the shape regex AFTER the existing
`isCleanScalar` / `hasControlChar` guard — never as a replacement. JavaScript `$` (without the `m` flag)
matches at end-of-string OR just before a single trailing newline, so `/^P[0-7]$/.test("P2\n") === true`
and `/^…\d+$/.test("security.md SEC-1\n") === true`. A shape regex used ALONE would re-admit a
trailing-newline control-char vector — exactly the laundering the control-char guard exists to reject.
Compose: `RULE_ID_OK(v) = isCleanScalar(v,120) && (PRINCIPLE.test(v.trim()) || QUALIFIED.test(v.trim()))`,
so the string is provably control-char-free before any anchored regex runs.

**Why it matters.** Concretely (`harden-merge-keying`): FIX 1 replaced a loose `rule_id` check with a
`^P[0-7]$` | `<file>.md <ID>-<n>` whitelist so a prose instruction could not become a trusted-labeled
`REVIEW.md` section header (P2). The plan's "tighten `RULE_ID_OK` from X to Y" phrasing read as REPLACE;
`/pharn-dev-grill` flagged the `$`-before-newline quirk (`GRILL.md` P2 finding), and the build folded the
guard-first composition in with a dedicated test ("a trailing-newline `rule_id` is DROPPED"). Generalizes
to every floor validator that adds an anchored shape check over a field that already had a control-char
guard — the guard must stay the precondition, or the tightening silently reopens the newline hole it was
meant to keep closed. Complements the enum-gated/free-text trust split (fix #1) and L6.

**Provenance.**

- feature: `harden-merge-keying`
- commit: `9418849c9e966451be4473772d0a8ffc3f7cb2e6`
- source: `.dev/features/harden-merge-keying/REVIEW.md` (proposed lesson candidate) +
  `.dev/features/harden-merge-keying/GRILL.md` (P2 finding)
- promoted: 2026-07-09 via gated `/pharn-dev-memory-promote` (human-approved).

## L15 — Index an arbitrary key with an own-property test, never `||`/`??` — inherited prototype members leak silently

type: floor · concepts: [keyed-lookup, prototype-pollution, silent-failure]

**Lesson.** In a determinism-owning floor tool, index a user-supplied or otherwise arbitrary key into a
plain JS object with an OWN-property test (`Object.hasOwn(obj, key)`, a null-prototype map
`Object.create(null)`, or a `Map`) — never `obj[key] || fallback` or `obj[key] ?? fallback`. A plain
object inherits `Object.prototype`, so `obj['toString']` / `obj['constructor']` / `obj['__proto__']` /
`obj['hasOwnProperty']` resolve to inherited members that are BOTH truthy AND non-nullish. So `||` and
`??` alike skip the fallback and hand back the prototype member; a downstream `.model`/`.effort` read
then yields `undefined`, which `JSON.stringify` drops — the tool prints `{}` at EXIT 0: a floor tool
lying quietly, the exact P0 failure class this repo exists to kill. `Object.hasOwn` is the fix because it
tests own-ness, not truthiness/nullishness; the terminal fallback stays the validated `default`, else a
loud RED. Generalizes to EVERY deterministic keyed lookup on arbitrary input (stage names, rule ids,
config keys, frontmatter keys).

**Why it matters.** Concretely (`check-config-routing` / FIX 1): `resolveStage` used
`stages[stage] || stages.default` (`.dev/floor/check-config.mjs:120` pre-fix), and
`node .dev/floor/check-config.mjs resolve toString` printed `{}` at exit 0 — a Fable finding, reproduced
live before the fix. The fix is `Object.hasOwn(stages, stage) ? stages[stage] : stages.default` (`:127`
post-fix), witnessed by a regression test over `toString`/`constructor`/`__proto__`/`hasOwnProperty`/`valueOf`
→ the `default` entry, never `{}`. Complements the enum-gated/free-text trust split (fix #1) and L14
(compose guards, don't replace).

**Provenance.**

- feature: `check-config-routing`
- commit: `fefae018ab7fea913e8a1553ab9a104622cd3bbc`
- source: `.dev/features/check-config-routing/REVIEW.md` (proposed lesson candidate)
- promoted: 2026-07-09 via gated `/pharn-dev-memory-promote` (human-approved).

## L16 — L5's own remedy is a portability trap: `xargs -a` is GNU-only and fabricates a false red

type: tooling · concepts: [input-capture, shell-portability, word-splitting, false-red]

**Lesson.** L5 prescribes `xargs` to expand a gate's file list safely, and L12 records re-hitting L5's zsh
word-split and correcting it "with `xargs` per L5's remedy". This run hit a **third** variant — **inside the
remedy itself**: `xargs -a <file>` is a **GNU extension** that macOS/BSD `xargs` rejects outright
(`xargs: invalid option -- a`), so the **gate command** failed and its exit code was captured as the **gate
result**. Expand a file list through **stdin** (`xargs node --test < list`), which is portable, and treat a
**red baseline on a known-green repo as a signal to investigate the harness — never to accept**. The
generalization beyond `xargs`: a remedy written for one shell/platform is **itself** an input-capture
surface, so L5's "a floor verdict is only as trustworthy as the orchestration that captures its inputs"
applies **recursively to the fix**, not only to the original bug.

**Why it matters.** The failure is silent in the dangerous direction. The bad capture recorded
`tests: 1` at the baseline of a provably green repo; being **equal at base and head** it would have been
classified `pre-existing` rather than a regression — evading a false _regression_ while **masking a real
tests-gate regression**, which is precisely L5's documented failure mode reached _through_ L5's own
remedy. The floor core (`check-regress.mjs`) was correct throughout; only its inputs were wrong, so no
gate could have caught it. It surfaced only because a human-implausible result (a red baseline on a repo
whose full `npm run check` was green) was **investigated instead of recorded**. Complements L5 (the
input-capture trust boundary) and L12 (which re-confirmed L5's zsh form and endorsed the `xargs` remedy
this lesson now qualifies).

**Provenance.**

- feature: `applied-lessons`
- commit: `de83cbbf4ff3ecf90584eae382bc06f49cdc5f46`
- source: `.dev/features/applied-lessons/REVIEW.md` (proposed lesson Candidate A) +
  `.dev/features/applied-lessons/REGRESSION.md` (defect 1), reproduced live before and after the fix
- promoted: 2026-08-05 via gated `/pharn-dev-memory-promote` (human-approved).

## L17 — `check-regress scope` tests changed-since-base, not written-by-the-build

type: scoping · concepts: [writes-scope, scope-check, false-blocking]

**Lesson.** `check-regress.mjs scope` computes `escaped = inside.filter((f) => !matchesAny(f, declared))`
(`pharn/floor/check-regress.mjs:192`) over `git diff <base>`, with **no** exclusion for other pipeline
stages' own artifacts or for human-authored trusted-doc edits. With `base = HEAD` on a working-tree
dogfood, **every** sibling stage's output lands in `inside` and reads as "the build escaped its
`## Files`". It is a **changed-since-base** test being reported as a **written-by-the-build** test — two
different questions. Remedy: exclude the feature's own `.dev/features/<name>/**` pipeline artifacts and
the hook-protected trusted docs from the escape set, or derive "written by the build" from the build's
actual scope record (`.pharn/writes-scope.json`) rather than from the diff.

**Why it matters.** A fail-closed **blocking** finding that fires on the **correct, designed** workflow is
worse than a missing check: it trains the operator to wave through a `P0` fix#7 "the build escaped its
scope" finding, which is exactly the finding that must never be waved through. This run it emitted two
such findings, **both provably false** — `GRILL.md` (written by `/pharn-dev-grill` under its **own** Step-0
writes-scope, by design) and `pharn/ARCHITECTURE.md` (human-authored; the agent **cannot** write it —
`protect-trusted-paths.cjs` denies at exit 2, verified live this run, which is the disproof). The defect
lives in the **advisory orchestration** layer, not the floor verdict core, which was correct throughout.
Complements L3 / L7 / L8 (the `writes:`/scope subsystem — this concerns the scope check's **question**,
where L3 and L7 concern a declaration's **content** and L8 the setter's **resolution**) and L5 (a verdict
is only as trustworthy as the inputs the orchestration captures).

**Provenance.**

- feature: `applied-lessons`
- commit: `de83cbbf4ff3ecf90584eae382bc06f49cdc5f46`
- source: `.dev/features/applied-lessons/REVIEW.md` (proposed lesson Candidate B) +
  `.dev/features/applied-lessons/REGRESSION.md` (defect 2), with the fix #2 hook denial verified live as
  the disproof
- promoted: 2026-08-05 via gated `/pharn-dev-memory-promote` (human-approved).

## L18 — A PLAN's exclusion subsection must be a HEADING — a bold prose intro fails OPEN

type: scoping · concepts: [writes-scope, plan-shape, fail-open]

**Lesson.** In a `PLAN.md`'s `## Files`, the block listing paths the increment must NOT touch has to be its
own markdown **heading** (`### Deliberately NOT in scope`). `set-writes-scope.cjs --from-plan` ends the
authorized list at any heading (`:165` — structural, wording-independent) **or** at a non-path prose cue
(`:179`) whose vocabulary is narrow: `not touch|writ|modif|edit|chang`, `explicitly excluded`,
`out of scope`, `off limits`. A bold prose intro outside that vocabulary — here
`**Deliberately NOT in scope, each with its reason:**` — matches nothing, so the exclusion block is scanned
as ordinary `## Files` items and **every path it names is granted write-scope**.

**Why it matters.** It fails in the **dangerous** direction and silently. The setter reported `16 path(s)`
where the human had approved **13**, handing the build write-scope to `SKILLS_VERSION`,
`.claude/commands/pharn-plan.md`, and the fix #2 trusted doc `pharn/ARCHITECTURE.md` — the over-declaration
class L7 documents, reached this time not through a `writes:` field but through a **plan's prose
formatting**. Nothing would have complained: fix #2 independently denies the trusted doc, and the other two
would simply have been writable. It was caught only because the setter **prints its path count** and that
count was read against the approved list. Remedy: use the heading form (structural, so it cannot depend on
wording), and treat the setter's printed count as a **checkable number**, not decoration. Complements
L3 / L7 / L8 / L17 — the `writes:`/scope family — and is the first entry in it concerning the **PLAN
document's own shape** rather than a declaration's content or the setter's resolution. Confirmed the very
next increment: the `###` form bounded the list to exactly the declared paths.

**Provenance.**

- feature: `lessons-index`
- commit: `0323bf9f63d6fb63e79d8aeab9de6d8a3bcd60fd`
- source: `.dev/features/lessons-index/REVIEW.md` (proposed lesson Candidate A) +
  `.dev/features/lessons-index/PLAN.md` (the corrected exclusion block), reproduced live at build Step 0
- promoted: 2026-08-05 via gated `/pharn-dev-memory-promote` (human-approved).

## L19 — A stage's Bash-run tooling escapes `writes:` scope — repo-wide formatters are the live instance

type: scoping · concepts: [writes-scope, bash-escape, formatter]

**Lesson.** fix #7 gates `Write|Edit|MultiEdit` only, so **any tool a stage invokes through Bash writes
outside the writes-scope unchecked** — and `/pharn-dev-build`'s Step 2b does exactly that today: it says "run
the project formatter over the **just-written files**" while prescribing `npm run format`, which is
`prettier --write .` over the **whole repo**. Every increment that reaches Step 2b silently rewrites any
unformatted file anywhere in the tree and sweeps it into that increment's diff. Either scope the command to
the written files (`npx prettier --write <paths from the plan's ## Files>`) or declare the repo-wide sweep
honestly as an accepted, out-of-scope side effect — but do not let the prose say "just-written files" while
the command says otherwise.

**Why it matters.** It is the `writes:`/scope family's most dangerous axis in principle: L3 is a declaration
too narrow, L7 a declaration too broad, L8 the setter's one-`--target` resolution, L18 the PLAN's own
formatting — all visible in something a human can read — while this one is a write that **never passes the
gate at all** and leaves no trace except a file in the diff nobody declared. Concretely: Step 2b reformatted
`.dev/floor/check-lessons-index.mjs`, a file the approved plan did not name, and it surfaced only because
`check-regress.mjs scope` reported it and the result was **investigated rather than recorded** (L16). The
outcome was benign and in fact useful — that file had been committed format-RED, so the sweep repaired a red
that would otherwise have blocked every later feature's verify (L11) — and that benign-usefulness is
precisely why it survived unnoticed: **the mechanism is wrong, the result usually looks right.** Note the
same escape is unavoidable for any generated artifact (regenerating `docs/lessons-index.md` after a
promotion is a Bash write outside any declared scope); the remedy there is to **declare it**, not to pretend
the gate covered it.

**Provenance.**

- feature: `guard-coverage`
- commit: `0323bf9f63d6fb63e79d8aeab9de6d8a3bcd60fd`
- source: `.dev/features/guard-coverage/REVIEW.md` (proposed lesson Candidate B, finding F2) +
  `.dev/features/guard-coverage/REGRESSION.md` (the scope-escape investigation), with the format-RED
  baseline reproduced live in a `git worktree`
- promoted: 2026-08-05 via gated `/pharn-dev-memory-promote` (human-approved).

## L20 — A promoted lesson whose only remedy is discipline WILL recur — the second occurrence is the trigger to give it a floor check

type: process · concepts: [writes-scope, plan-shape, lesson-recurrence, floor-escalation]

**Lesson.** L18 was promoted with a **discipline-only** remedy — "use the heading form" and "treat the
setter's printed count as a checkable number, not decoration." It recurred on the very next plan that
wrote an exclusion block: `product-capability-catalog`'s block opened with a bold prose intro, and
`set-writes-scope.cjs --from-plan` reported **6 paths against the 2 the human approved**. Canon captured
the failure's **shape** but nothing **enforces** it, and `check-plan-lessons.mjs` structurally cannot —
it verifies that lessons were **declared**, never that a plan's own structure obeys them. When a lesson's
remedy reduces to "the agent should remember," a second occurrence is evidence the remedy is the wrong
kind, not that the reminder was too quiet. Remedy: at `/pharn-dev-plan` Step 4, alongside the existing
`check-plan-lessons.mjs` self-check, re-run `set-writes-scope.cjs --from-plan` and **deterministically
compare the parsed scope set against the plan's own `## Files` bullets**, RED on disagreement — set
membership, `pharn/ARCHITECTURE.md §2` primitive #3, no new floor primitive.

**Why it matters.** It is the P0 disease aimed at the memory-bank itself: "the lesson is in canon" read
as "therefore the failure will not recur." Promotion is a **record**, not an enforcer — and this is the
first live evidence of the gap, which bears directly on what `.dev/memory-bank/` is _for_. The recurrence
also failed in the **dangerous** direction: the over-grant reached `pharn/floor/capability-catalog-core.mjs`
(the file that increment existed to **not** create), `SKILLS_VERSION` (which had to stay unbumped), and
`.dev/memory-bank/lessons-learned.md` itself — a direct canon write, the exact power **L7** says a stage
must never hold. It was caught **only** because the setter prints its count and the count was read; had
that read lapsed, every gate downstream would have been GREEN. Note the sharpest detail: the plan
**cited L18 only after violating it**, and `check-plan-lessons.mjs` returned GREEN both before and after
— which is precisely the declaration-vs-application split that checker already labels advisory.
Complements L3 / L7 / L8 / L17 / L18 (the `writes:`/scope family) and stands apart from all of them: they
each name a defect, this one names a **failure of the correction mechanism**.

**Provenance.**

- feature: `product-capability-catalog`
- commit: `123559e8f22d28f8e0e52ad74f805218f09eddb0`
- source: `.dev/features/product-capability-catalog/REVIEW.md` F1 (proposed lesson Candidate A) +
  `.dev/features/product-capability-catalog/PLAN.md:83` (the corrected exclusion block and its L18 body
  line) + `.dev/features/product-capability-catalog/SHIP.md` (the build HALT), with the 6-vs-2 over-grant
  reproduced live at build Step 0
- promoted: 2026-08-07 via gated `/pharn-dev-memory-promote` (human-approved).

## L21 — L5's input-capture boundary recurred through `git status` — a path-set checker must REJECT a directory-shaped input, not trust its caller

type: process · concepts: [input-capture, lesson-recurrence, floor-escalation, writes-scope, git]

**Lesson.** L5 named input-capture a trust boundary and prescribed discipline: quote/array-expand shell
lists, ASSERT THE EXPECTED CARDINALITY, fail-closed on a surprising shape. It has now recurred on a
different tool. A bare `git status --porcelain` emits an untracked DIRECTORY as one entry
(`.dev/features/<name>/`) rather than the files inside it; fed to `check-regress.mjs scope`, that
directory path matches nothing in a plan's `## Files` (which declares FILES), and the checker emitted the
blocking `P0` finding "the build escaped its plan's `## Files`" over a build that escaped nothing. Per
L20, a second occurrence of a discipline-only remedy is the trigger to move it to the floor, not to write
a third reminder. The reduction is available and needs no new primitive: `check-regress.mjs scope` should
REJECT or EXPAND a directory-shaped `--changed` entry (a trailing `/`, or a path that resolves to a
directory on disk) instead of silently classifying it as an undeclared file — a shape/membership test,
`pharn/ARCHITECTURE.md §2` primitive #3. Until that lands the interim discipline is
`git status --porcelain -uall`, or deriving the changed set from `.pharn/writes-scope.json` rather than
from git at all.

**Why it matters.** It fails in the direction L17 warns about most sharply: a **false blocking** "the
build escaped its plan's `## Files`" trains the operator to wave through the one finding that must never
be waved through — and unlike L17's instance, this one is not a design mismatch in the checker's question
but garbage handed to a correct checker. The evidence standard L20 sets is met exactly: L5's remedy list
**already contained** "assert the expected cardinality," so the reminder was not too quiet — it was the
wrong KIND of remedy, and the family (L5 → this entry) has now cost two investigations to reach the same
conclusion. Note the asymmetry with L20's own instance, which is the reason this one nearly escaped:
L20's recurrence was caught by a number the tooling **prints** (the setter's path count), whereas this one
was caught only because a blocking finding was **investigated rather than recorded** (L16) — there was no
printed number to read, which is itself an argument for the floor-side fix. Complements L5 (the boundary),
L17 (the same checker's other defect), and L20 (the escalation rule this entry applies to itself).

**Provenance.**

- feature: `observability-code-side-limit`
- commit: `93f022218e0bfd6cbbfe8885faa00d72a3686011`
- source: `.dev/features/observability-code-side-limit/REVIEW.md` (proposed lesson candidate) +
  `.dev/features/observability-code-side-limit/REGRESSION.md` (the scope-check investigation), with the
  false blocking finding reproduced live at the regress stage; reframed from a tooling-trap draft to an
  L20 escalation at the promote gate (human-directed)
- promoted: 2026-08-17 via gated `/pharn-dev-memory-promote` (human-approved).

## L22 — A command that prescribes a shell technique in PROSE accumulates wrong implementations — pin the command line

type: tooling · concepts: [shell-portability, command-prescription, lesson-recurrence, false-red]

**Lesson.** When a command tells the agent to achieve something through a shell technique described in
**prose** — "feed `node --test` its list through `xargs`" — rather than pinning a **literal command
line**, the choice it leaves open gets made wrong repeatedly. `/pharn-dev-regress` Step 2 said "through
`xargs` (or a shell array / zsh `${=LIST}`)", which contains **no wrong instruction anywhere**, and
**eight recorded runs still reached for `xargs -a <file>`** — a GNU flag that BSD `xargs` (the macOS
default) rejects outright with `xargs: invalid option -- a`. Remedy: prescribe the exact command line,
and name the wrong forms beside it, so the agent has nothing left to choose.

**Why it matters.** The failure is silent in the worst available way. A bad expansion exits 1 at **both**
base and head, so `check-regress.mjs` classifies it `pre_existing` rather than a regression — it evades a
false alarm while **masking a real tests-gate one**. It is caught only if a red baseline on a
believed-green repo is **investigated instead of recorded**, which is a habit, not a check. L16 already
named this exact flag and L20 already established that a discipline-only remedy recurs; this entry names
**what kind** of remedy replaces the discipline — not a louder warning but the **removal of the choice**.
It generalizes past `xargs`: any command prose that _describes_ a shell technique instead of
_prescribing_ one is an accumulating defect, and the cost is paid by whichever future run happens not to
investigate. Complements L5 (the input-capture boundary), L16 (the specific trap), L20 (the escalation
rule), and L21 (a checker must reject a malformed input rather than trust its caller).

**Provenance.**

- feature: `scope-file-case-guard`
- commit: `40c3c98a8cc1bc1d7cbc72bcc694ca5ea970b89f`
- source: `.dev/features/scope-file-case-guard/REVIEW.md` (proposed lesson Candidate A) +
  `.dev/features/scope-file-case-guard/REGRESSION.md` (the fabricated `tests=1` baseline, investigated
  rather than recorded), with the eighth recurrence reproduced live at the regress stage
- promoted: 2026-08-19 via gated `/pharn-dev-memory-promote` (human-approved).

## L23 — A stage that writes an artifact AND owns a whole-repo gate over it has a self-referential conflict invisible on the happy path

type: process · concepts: [stage-artifact, gate-conflict, happy-path-latency, style-gates]

**Lesson.** `/pharn-dev-verify` Step 4 requires `verify-report.json` to stay the floor helper's JSON
**verbatim** — explicitly **not** formatted — while the **same command** runs whole-repo `format:check`
as one of the gates that **owns its verdict**. The two requirements conflict, but only when
`failing_gates` is non-empty: `JSON.stringify(…, null, 2)` expands `"failing_gates": ["test"]` across
three lines where prettier wants it inline. Every run that ever reached that step did so with a `PASS`
and an empty array, on which the two agree — so the conflict sat latent until the first FAIL, at which
point the stage's own artifact reddened the gate the stage owns. Remedy: exempt the verbatim-required
artifact in the gate's own config (`.prettierignore`), so "verbatim" is **enforced** rather than merely
intended.

**Why it matters.** The **FAIL branch of a gating stage is the least-exercised path in the pipeline**,
and it is precisely the path that runs when something is already wrong — so a defect living there is
discovered at the worst moment, compounding a red the operator is already trying to read. The shape
generalizes: **any stage that both writes an artifact and owns a whole-repo gate covering that
artifact's directory** carries this hazard, and no passing run can reveal it. It is the same family as
the hook header's five "obviously correct in the source, false against the filesystem" defects, moved up
a layer — correct on every input anyone reached, wrong on the first input nobody did. Distinct from the
style-gate family it touches: L9 concerns gate **coverage**, L11 whole-repo **scope**, L12/L13 prevention
**timing** — this one concerns a stage's output colliding with a gate that stage **owns**.

**Provenance.**

- feature: `scope-file-case-guard`
- commit: `40c3c98a8cc1bc1d7cbc72bcc694ca5ea970b89f`
- source: `.dev/features/scope-file-case-guard/REVIEW.md` (proposed lesson Candidate B) +
  `.dev/features/scope-file-case-guard/SHIP.md` (the conflict reproduced on the run's first
  `/pharn-dev-verify` FAIL), with the `.prettierignore` remedy verified live by re-probing an expanded
  non-empty `failing_gates` against `format:check`
- promoted: 2026-08-19 via gated `/pharn-dev-memory-promote` (human-approved).

## L24 — A performance bound inherited from a superseded implementation is an unbacked claim — swapping the implementation mid-build is exactly when it gets inherited

type: floor · concepts: [guarantee-audit, live-measurement, lesson-recurrence, regex-anchoring]

**Lesson.** When a build REPLACES the artifact a claim describes, the claim is VOID until re-measured on
an input chosen to break the NEW artifact — and a mid-build swap is precisely the moment this is missed,
because the prose reads as still-true and only its subject changed. `scanner-nested-paren-span` planned
the DISJOINT span, whose "disjoint branches ⇒ no exponential blowup" argument was SOUND. Mid-build that
span broke two canonical nesting tests and was replaced with an OVERLAPPING one — but the ReDoS paragraph
was carried across and merely SOFTENED (to "no EXPONENTIAL backtracking observed") rather than re-derived,
and its supporting measurements were re-run on shapes that could not exhibit the new failure (`(a)`×800,
`((a))`×800, unclosed `(`×800 — none has an ambiguous decomposition). The shipped result was false by ~9
orders of magnitude: `fetch(` + `((a)`×28 took 7.26 s and ×40 extrapolates to ~7 hours, so ~120 bytes of
crafted input hung the review floor across three floor files.

**Why it matters.** This is [[L4]]'s "authored fixture passes by construction" at the PERFORMANCE-claim
layer, and it is sharper here because the fixtures were not merely authored — they were INHERITED from a
different regex, which is why re-running them proved nothing. The adversarial input for a regex is the
AMBIGUOUS one, not the LARGE one: every inherited fixture was big, and none was ambiguous. Two
corollaries, both earned live in the repair increment. (1) The repair's OWN first draft claimed "linear"
while the per-line bound is quadratic (the engine retries at every sink-callee start) — the defect
reproduced inside its own fix, so the remedy cannot be "be careful" ([[L20]]). (2) The reasoning error is
nameable and reusable: the `)` wall bounds how FAR a span may range, never how many WAYS it may decompose
what it ranges over. Remedy: when a regex or any perf-critical artifact is swapped, re-derive the bound
from the NEW form's structure AND pin it with a regression test whose verdict is a MEMBERSHIP test
(completed vs. killed under a subprocess timeout), never a stopwatch compared to a threshold — the
timeout is also what keeps a red TERMINATING rather than a hang.

**Provenance.**

- feature: `span-redos-linear`
- commit: `bc4769bb5d79caa3592f934fbc4a6b3055363e40`
- source: `.dev/features/span-redos-linear/REVIEW.md` F1 (the repair's own overclaim) +
  `.dev/features/scanner-nested-paren-span/REVIEW.md:75` (which recorded that PLAN and code disagreed
  after the mid-build swap, without catching that the BOUND had gone stale with it)
- promoted: 2026-08-19 via gated `/pharn-dev-memory-promote` (human-approved).

## L25 — A rationale comment reaches only the file it sits in, and it is trusted for the defects it does NOT name

type: tooling · concepts: [lesson-recurrence, floor-escalation, command-prescription, doc-drift]

**Lesson.** `.dev/floor/hash-doc.mjs` carried a twelve-line header explaining why comparing
`import.meta.url` against a `` `file://${process.argv[1]}` `` template is the wrong entry-point guard —
and **ten sibling floor CLIs shipped that exact guard anyway**, for the whole 2.x line, with nothing
detecting it. Two
failures, and the second is the sharp one, found only while repairing the first. (1) The explanation
had **no reach**: its only remedy was "read the other file before writing this line", which is
discipline. (2) The explanation was **incomplete in a load-bearing way**: it named the **symlink**
break and never the **percent-encoding** break — and percent-encoding is the defect that actually bit,
silently no-op'ing ten checkers on any path holding a space or a non-ASCII byte. A partial rationale is
worse than an absent one, because it reads as a completed analysis and quietly narrows what the next
reader thinks to check. The remedy is not a better comment: make the rationale **enforceable** (here,
`.dev/floor/entry-point-guard.test.mjs` bans both wrong spellings on any executable line under either
floor), and when the thing a comment describes is repaired, **re-derive what the comment claims** rather
than carrying it across — [[L24]]'s "the claim is void until re-measured", applied to prose.

**Why it matters.** The failure mode is the quietest one a floor can have: `check-lessons-index.mjs
--verdict` printed the **empty string at exit 0**, and `/pharn-plan` branches on that token's membership
in a closed set — a checker certifying by staying silent, which is the exact inverse of what the floor
exists to do. It reached ten files **beside** the file that explained why it was wrong, which is the
evidence standard [[L20]] sets: the reminder was not too quiet, it was the wrong KIND of remedy.
Sharper than [[L22]] in one respect — L22 covers a **command** prescribing a shell technique in prose,
where the wrong implementations at least differ each time; here a **source comment** prescribed an idiom
**by example**, and ten copies were byte-identical, so no reviewer diffing them would see anything
anomalous. Note also the near-miss the repair itself had to survive: `pathToFileURL(process.argv[1]).href`
is the obvious fix and closes only defect (2)'s sibling — it still no-ops through a symlink — so a repair
guided by the incomplete comment would have shipped a second spelling of the same guard and re-created
the condition. Complements [[L20]] (the escalation rule), [[L22]] (prose that describes instead of
prescribing), and [[L24]] (a claim inherited across a swap).

**Provenance.**

- feature: `entry-point-guard`
- commit: `435414098575cbf6deb602545fc93f40ba407161`
- source: `.dev/features/entry-point-guard/REVIEW.md` (proposed lesson Candidate A + the iteration-2
  disposition table, where the comment's omission was found while closing the drift finding) +
  `.dev/features/entry-point-guard/GRILL.md` F1/F6, with the ten-file spread and the four-shape
  measurement reproduced live before and after the repair
- promoted: 2026-08-19 via gated `/pharn-dev-memory-promote` (human-approved).

## L26 — A patch verified against a copy OUTSIDE the repo is verified under different rules than the repo enforces — config-driven gates resolve by PATH

type: tooling · concepts: [verification-fidelity, style-gates, human-only-patch, false-green]

**Lesson.** A hook-protected file can only be patched by a human, so the agent verifies the change against a sandbox COPY. That copy reproduced both hook test suites faithfully — 75 pass / 3 fail, IDENTICAL to an unpatched control in the same sandbox, a genuine zero-regression proof — while running NONE of `eslint`, `prettier`, or `markdownlint`, because each resolves its configuration relative to the FILE'S PATH and the sandbox had no `eslint.config.mjs` and no `.prettierrc.json`. Two real defects reached the applied hook. The remedy is not "remember to lint the sandbox": verify at the REAL path — generate the patch, apply it in a throwaway `git worktree` of the repo, and run `npm run check` there — so the file is judged by the same config resolution the repo's own gates use.

**Why it matters.** The failure presents as a COMPLETED verification. The sandbox run produced a correct, specific, reassuring number that matched its control exactly, and that number is what gets reported and believed; nothing in it hints that three whole gate families never executed. It is the false-GREEN twin of L16's false-RED — L16's bad expansion fabricates a red that MASKS a real one, this fabricates a green that HIDES an absent check. Confirmed twice in one increment, in opposite directions: (1) the delivered patch failed `lint` (`no-control-regex`) and `format:check` at /pharn-dev-verify; (2) the REPAIR for (1) then ran `prettier --write` on the scratchpad copy, where `.prettierrc.json`'s `printWidth: 140` again did not resolve — silently reformatting unrelated pre-existing lines and inflating the patch from 59/11 to 92/17. The fix for the first instance introduced a larger second one by the same mechanism, which is the sharpest evidence that the defect is the ENVIRONMENT, not the care taken. Distinct from L4 (an authored assertion passes by construction until measured — here the assertions WERE measured, and the gap was in WHICH CHECKS RAN AT ALL) and from L23 (a stage's artifact colliding with a gate that stage owns).

**Provenance.**

- feature: `writes-scope-lifecycle`
- commit: `cd24dee7f560fdbe87f8a4347d67a24ceddd2767` (working-tree dogfood built on this commit; uncommitted at
  promotion time)
- source: `.dev/features/writes-scope-lifecycle/REVIEW.md` (proposed lesson candidate — the
  verification-fidelity finding) + `.dev/features/writes-scope-lifecycle/VERIFY.md` (the first-pass
  gate REDs), with both instances reproduced live
- promoted: 2026-08-19 via gated `/pharn-dev-memory-promote` (human-approved).

## L27 — A remedy added to a SHARED message is printed by every branch — check reachability per branch, or it trains the workaround

type: process · concepts: [lesson-recurrence, floor-escalation, shared-message, fail-open]

**Lesson.** `enforce-writes-scope.cjs`'s `denyMessage()` composes ONE message for every denial, so a FIX
bullet added for one situation is printed for **all** of them — including situations where its remedy
cannot possibly work. For a path outside the repo root, **three** of the four remedies were unreachable:
"add it to the active Capability's `writes:`", "restart the command from the top", and the `--clear`
staleness bullet added one increment earlier, all of which resolve to scope entries that are
repo-root-RELATIVE and therefore inexpressible for such a path. The one route that does work — Bash,
which `PreToolUse` never sees — was the only one the message did not name. Remedy: when a message serves
multiple branches, **the reachability of each remedy is a property to assert per branch**, and the
assertion form that works is "present in its own case AND absent from the other", not merely "present".

**Why it matters.** The failure is invisible to every gate — unreachable advice is still a string, so
tests, lint and the floor all stay green — and its only reader is an agent that follows the advice, fails,
and reaches for whatever does work. **A guard that prints an impossible remedy trains the exact bypass it
exists to prevent**, and trains it undirected, which is worse than naming the boundary. Note the shape of
the recurrence, because it is what makes this a lesson rather than a bug report: `writes-scope-lifecycle`
ADDED the staleness bullet without asking which denials could reach it, and this increment then set out to
fix exactly one unreachable bullet — its approved PLAN pinned only that one — so the same blind spot
produced both the defect and the too-narrow fix, one increment apart, in the same function. That is
[[L20]]'s trigger already met, and the remedy is the kind [[L22]] and [[L25]] prescribe: an enforceable
assertion, not a louder comment. Distinct from [[L2]] (a contract citing a floor op that is not live —
there the CLAIM is false; here every sentence is true, and only its APPLICABILITY is empty).

**Provenance.**

- feature: `out-of-root-deny-message`
- commit: `c7361da79a6946263b1571a5d9d9cf806cce7f5d` (working-tree dogfood built on this commit;
  uncommitted at promotion time)
- source: `.dev/features/out-of-root-deny-message/REVIEW.md` (proposed lesson Candidate A) +
  `.dev/features/out-of-root-deny-message/GRILL.md` G2, with all three unreachable remedies reproduced
  live before the fix
- promoted: 2026-08-19 via gated `/pharn-dev-memory-promote` (human-approved).

## L28 — The plan-scope setter's exclusion CUE fires on an authorized item's own WRAPPED line

type: scoping · concepts: [writes-scope, plan-shape, cue-matching, false-red]

**Lesson.** `set-writes-scope.cjs --from-plan` ends the authorized `## Files` list at a heading
(Boundary 1) or at a head-less prose exclusion cue (Boundary 2). Boundary 2 is anchored to a
non-path, non-blockquote line so that, in the comment's own words, "an authorized item's own description
never trips it". **That holds for a single-line bullet and fails for a WRAPPED one.** A continuation line
is not a path-item and not a blockquote, so an ordinary description that happens to contain
`out of scope` / `not touched` / `not written` matches the cue and **truncates the list there**. Measured
live: a bullet whose second line read "in-repo out-of-scope unchanged" cut a 5-path plan to **1 path**.
Remedy: the cue must skip an item's own continuation lines (a line indented under an open list item is
part of that item, not a section intro), or the exclusion boundary must be heading-only.

**Why it matters.** It fails **CLOSED** — too few paths, a loud deny at the next write — so it is friction
in the [[L3]] direction, not a power leak in the [[L7]] one. What makes it worth canon is how it hides:
the setter prints `1 path(s)` and exits **0**, so the parse looks successful, and the only signal is the
count disagreeing with the plan a human just approved. It was caught solely because [[L20]]'s discipline
of running the setter and **reading the printed count** was followed. The comment beside the regex is what
makes it invisible to a reader — it states the exemption as settled and complete, which is [[L25]]'s
"trusted for the defects it does NOT name", here applied to a regex rationale rather than an entry-point
guard. Note the second-order cost: a plan author who hits this learns to avoid ordinary vocabulary in
their own `## Files` descriptions, which is exactly the "remedy is discipline" shape [[L20]] rejects.

**Provenance.**

- feature: `out-of-root-deny-message`
- commit: `c7361da79a6946263b1571a5d9d9cf806cce7f5d` (working-tree dogfood built on this commit;
  uncommitted at promotion time)
- source: `.dev/features/out-of-root-deny-message/REVIEW.md` (proposed lesson Candidate B) +
  `.dev/features/out-of-root-deny-message/PLAN.md` `## Known residuals`, with the 5→1 truncation
  reproduced live at plan Step 4
- promoted: 2026-08-19 via gated `/pharn-dev-memory-promote` (human-approved).

## L29 — When a lesson's remedy is quantified over a set, the ENUMERATION is the deliverable — an assertion written for one member reads as discharged

type: process · concepts: [lesson-recurrence, branch-coverage, shared-message, floor-escalation]

**Lesson.** [[L27]] prescribed a remedy quantified over a set: when a message serves multiple branches,
assert each remedy's reachability **per branch**. The very next increment cited L27, quoted its rule
verbatim in its own test header, and then wrote five tests that render **one** of `denyMessage()`'s two
branches through a single helper — while its `CHANGELOG` claimed branch-independent coverage. The rule
was read, understood, and applied to half its domain. Remedy: when a lesson's remedy is quantified
("per branch", "per gate", "per stage"), the deliverable is **the enumeration of that set, materialized
in one place, with the rules iterating it** — not an assertion authored for whichever member happened to
be in front of you. Here that is a single `everyDenyMessage()` array the membership tests loop over, so a
branch added later is covered by every rule for free.

**Why it matters.** A per-member assertion and a discharged per-set rule are **indistinguishable at
review time**: both are green tests whose names read correctly, and the set they were meant to range over
is exactly the thing nobody writes down. Note the shape of the recurrence, because it is what makes this
a lesson rather than a bug report: `writes-scope-lifecycle` ADDED an unreachable bullet,
`out-of-root-deny-message` fixed one unreachable BULLET, and `deny-message-phantom-commands` then fixed
one BRANCH — **three consecutive increments in the same function, each correction one scope-step narrower
than the defect class it had just named.** [[L20]] says a discipline-only remedy earns a floor check;
this says what that check must **range over**, which is the part L20 leaves open. Distinct from [[L27]]
(there the remedy was UNREACHABLE — the claim was empty; here every assertion is true and merely PARTIAL)
and from [[L25]] (there the rationale did not reach; here it reached, was quoted verbatim, and was still
under-applied — so "make the rationale enforceable" is necessary and not sufficient). L27's own second
half is the concrete test to reach for: "present in its own case AND **absent from the other**" is
unsatisfiable without naming both cases, which is why the emptiness assertion on the branch that cites no
command is the load-bearing half, not the decorative one.

**Provenance.**

- feature: `deny-message-phantom-commands`
- commit: `41bf01c49fd624fddb849d99ff43bf1860a4e47f`
- source: `.dev/features/deny-message-phantom-commands/REVIEW.md` (proposed lesson Candidate A — the
  blocking floor-gate finding), with the out-of-root branch rendered live and the emptiness assertion
  mutation-tested (an injected `/frobnicate` is caught) before promotion
- promoted: 2026-08-20 via gated `/pharn-dev-memory-promote` (human-approved).

## L30 — A step that RUNS some of the gates it names and ASKS for the rest will fail on the ones it asks for

type: process · concepts: [style-gates, command-prescription, lesson-recurrence, floor-escalation, prevention-vs-detection]

**Lesson.** `/pharn-dev-build` Step 2b named three style gates and **ran two**: prettier and
markdownlint were a scoped, pinned command block, while eslint was a prose bullet asking the agent to
"confirm `npm run lint` is clean". The asked-for gate is the one that got skipped — a
`no-useless-assignment` in freshly-written code passed the build, passed the floor, and surfaced one
stage later as a red `lint` gate at `/pharn-dev-verify`. The two halves are not two instances of one
discipline; they are **two different modes**, and mixing them inside a single step is what hides the
weak one. A block that opens with real commands **reads as mechanized**, so the prose bullet a few
lines down inherits that appearance without inheriting the property. Remedy: within one step, every
gate the step names is a gate the step **invokes**, and the set is materialized once so a member added
later inherits every rule — here a `STEP_2B_GATES` array in `.dev/floor/command-hygiene.test.mjs` that
the membership rules iterate.

**Why it matters.** The mixed mode is invisible to review in a way pure prose is not: nobody reads a
command block that already contains two correct scoped invocations and asks which of its named gates
are missing from it, because the block **looks** like the remedy. That is [[L25]]'s "trusted for the
defects it does NOT name" applied to a command's own procedure rather than to a rationale comment.
Note the recurrence chain, because it is what makes this a lesson rather than a bug report: [[L12]]
created Step 2b to move style conformance from detection-at-verify to prevention-at-build, and it
mechanized the members that were in front of it — so the step shipped **already half-prose**, and the
failure it was created to prevent recurred through its own unmechanized half, at the stage it protects.
[[L20]]'s trigger is therefore met on L12, and [[L22]] names the replacement (remove the choice, pin the
line) while [[L29]] names what the check must range over (the set, enumerated once). Distinct from all
three: [[L22]] is about prose that _describes_ a technique the agent then implements wrongly, and
[[L29]] about a rule applied to half its domain by an author — here the prose is correct, complete, and
implemented by nobody, because the step never asked anyone to run it. The measured detail worth keeping:
a path-less `npx eslint` takes ~1.1s against ~1.1s for `npx eslint .` and ~0.3s for a single file, so a
naive mechanization onto an empty list would have linted the whole repo and reported unrelated
pre-existing errors as the increment's ([[L11]]) — the empty-list guard [[L16]] prescribes is not
optional when closing a gap like this.

**Provenance.**

- feature: `build-step2b-lint`
- commit: `fcf3f5b1a604b296f6de55fbdb6954f0916792f0` (working-tree dogfood built on this commit;
  uncommitted at promotion time)
- source: `.dev/features/validate-bad-target/REVIEW.md` (proposed lesson Candidate A, finding F3) +
  `.dev/features/validate-bad-target/VERIFY.md` (the red `lint` gate reproduced live one stage after the
  build declared itself formatted), with both the dropped-invocation and path-less mutations caught by
  the new enumerated pin before promotion
- promoted: 2026-08-20 via gated `/pharn-dev-memory-promote` (human-approved).

## L31 — A deliberate copy-pair creates an obligation set nothing ranges over — the second copy is where the obligation is dropped

type: process · concepts: [lesson-recurrence, dev-product-boundary, branch-coverage, floor-escalation]

**Lesson.** This repo maintains several deliberate dev/product copy-pairs (`check-provenance.mjs`,
`lessons-index-core.mjs`, and the four lessons-index wiring sites). Where a pair's **code** is pinned to
agree by ✧ tests, a pair's **obligations** — "each plan stage checks the index", "each promote stage
regenerates it" — had **no** enumeration anywhere, and the product half shipped both invocations while
the dev half shipped **neither**, for an entire release line, with every gate green. The failure is not
that someone forgot; it is that **the set of sites was never written down**, so "done" was assessed
per-file. Remedy: when a capability is deliberately duplicated across the dev/product boundary,
materialize the **obligation set** in one place with the rules iterating it, the way `STEP_2B_GATES`
does for a step's gate set.

**Why it matters.** [[L29]] establishes that a remedy quantified over a set needs the set materialized;
this names the **highest-value place to look for such a set** — a deliberate copy-pair, where the second
copy is invisible precisely because the first one is correct and reviewable in isolation. The pairs are
created deliberately and documented carefully, which is what makes the gap durable: a reader auditing
`check-provenance.mjs`'s twin finds a careful note explaining why two copies exist, and nothing anywhere
says what each copy's _callers_ owe. Note the shape of the omission, because it is what makes this a
lesson rather than a bug report: the dev half's prose did name the condition — "if the index is stale or
absent, fall back to reading canon in full" — so a reader comparing the two surfaces would find the
obligation ACKNOWLEDGED on both, and only an execution trace would show one of them had nothing that
could ever detect it. Distinct from [[L29]] (there the set was one function's branches, authored in one
sitting; here it spans two surfaces and two increments months apart), from [[L20]] (which says a
discipline-only remedy recurs — this says _where_ it recurs first), and from [[L25]] (there the
rationale did not reach; here it reached, was correct, and simply never enumerated its own domain).

**Provenance.**

- feature: `dev-lessons-index-gate`
- commit: `9f69e69c79b2c62f9004e1d6a89e4de263fc0133`
- source: `.dev/features/dev-lessons-index-gate/REVIEW.md` Candidate A + `GRILL.md` G1
- promoted: 2026-08-20 via gated `/pharn-dev-memory-promote` (human-approved).

## L32 — A verification method that consults a mutable ALIAS proves reachability, not identity

type: process · concepts: [verification-fidelity, doc-drift, command-prescription, false-green]

**Lesson.** A fix request prescribed confirming the canonical repo slug "against the actual git
remote". The remote still said `pharn-dev/pharn` long after the repository was renamed, because
GitHub's rename redirect keeps the old name resolving indefinitely — so the prescribed authority was
**downstream of the very fact it was meant to establish**, and every check a careful agent would run
against it (does the URL work? does `git fetch` succeed? does the clone command run?) returns green on
the stale name. Following the instruction as written would have rewritten four **already-correct**
README badges to the stale slug and recorded it as an alignment. The remedy: when verifying
**identity** — what is this thing canonically called, where does it really live — an alias that still
resolves is evidence of **reachability only**. Identity must be read from a source that reports the
canonical name itself (`gh api repos/<slug> --jq .full_name`, or a 301-vs-200 status distinction), and
a redirect is precisely the case where reachability and identity diverge silently.

**Why it matters.** The failure is invisible to the ordinary verification instinct, because the stale
alias is not broken — it works, which is what makes it convincing. The request's own stated symptom
("whichever slug is stale 404s for that link class") was **false** for the same reason, so an agent
that reproduced the symptom before fixing would have found nothing wrong and might have closed the
finding. This complements [[L6]] (a membership fact is read from its structured location) by naming the
case L6 does not reach: here the **prescribed** location _is_ structured, _is_ live, and is still wrong
— so "read it from the structured place" is necessary and not sufficient when the structured place
holds a mutable pointer. It sharpens [[L25]]'s "re-derive rather than carry across" by identifying
which inherited thing is most dangerous: not a stale comment, but a stale **method**, which reproduces
the error in every future run that obeys it. And it is distinct from [[L22]] (a command prescribing a
shell _technique_ in prose, where the wrong implementations at least differ each time) — here the
prescription is precise, single-valued, easy to follow, and wrong. Note the direction of the near-miss,
because it is the sharp part: the increment was one command away from making the docs **worse** while
reporting a repaired drift, and only an independent check of the canonical name caught it.

**Provenance.**

- feature: `contributing-gate-chain`
- commit: `aaec922487b73ca3eece40f4672b5b8934249fc5`
- source: `.dev/features/contributing-gate-chain/REVIEW.md` F2 (advisory finding) +
  `.dev/features/contributing-gate-chain/PLAN.md` "Trust audit (P2)", with the 301-vs-200 divergence
  and the identical `created_at` reproduced live before the fix was scoped
- promoted: 2026-08-23 via gated `/pharn-dev-memory-promote` (human-approved).

## L33 — A "not yet built" claim expires the moment the work lands — nothing reads shipped prose, and the repair pass misses the variant spellings

type: process · concepts: [doc-drift, shipped-surface, false-green, enumeration]

**Lesson.** Forward-looking prose — "not yet built", "the NEXT increment", "deferred", "no runner yet
invokes it" — is TRUE when written and becomes FALSE at the exact moment the work lands, in a file
nobody is editing. Nothing detects the transition: `pharn/floor/validate.mjs` walks capability
frontmatter, not claims; the four trusted docs are `.prettierignore`d and markdownlint-excluded; and no
checker anywhere reads a shipped sentence for its tense. Verified live at HEAD `f7c3caa` with
`npm run check` GREEN — 8 gates, 1620/1620 tests — over every site below. Two instances, the second
sharper. (1) `pharn/pharn-contracts/eval-format.md:52` still reads "(the checker that runs these is the
NEXT increment)" while `pharn/floor/check-structural.mjs` ships, is tested, and is invoked by five
commands. `#165` (`71e71ee`, `SKILLS_VERSION` 2.7.14) was the increment whose **entire purpose** was
re-deriving this claim class, and its CHANGELOG entry **names `eval-format.md` as a site it corrected —
for this exact sentence**. It fixed one instance and left a second in the file it named. (2) Seven
product-surface files claim "no runner yet invokes it over … output" — the `a11y`, `comprehension`,
`coupling`, `documentation`, `error-handling`, `migrations`, `performance` grillers — while
`pharn/pharn-contracts/finding-shape.md` now says the opposite: `/pharn-verify` and `/pharn-dev-verify`
run the checker per committed eval pair, and `/pharn-dev-eval` (increment 3c) runs it over each
live-emitted `runs/<i>/findings.json`. **Five of the seven cite `finding-shape.md`'s 3c runner by
name**, so they cite a deferral their own source no longer records. All seven ship committed eval
pairs.

**The enumeration failed twice before it succeeded, and that is the transferable part.** The proposing
prompt named six grillers. A whitespace-normalized scan for `no runner yet invokes it` also found six.
The seventh — `coupling` — spells it `no **live** runner yet invokes it`, and only a scan anchored on
the shortest invariant substring (`runner yet invokes`) found all seven. A claim class does not ship in
one spelling. Remedy: (a) derive the enumeration from the shortest substring that is invariant across
paraphrase, never from the sentence you happened to read; (b) treat every prior enumeration — a
CHANGELOG's list, a prompt's list, your own first grep — as a **lower bound to beat**, never a set to
confirm.

**Why it matters.** This is the P0 disease with its polarity reversed. Everywhere else the danger is
prose that OVERCLAIMS a guarantee; here the prose UNDERCLAIMS — it describes the repo as weaker than it
is — and _that is why nobody looks_: an honest-sounding "not yet built" reads as conservative, so it
survives review by seeming careful. The cost is real: five grillers point a reader at
`finding-shape.md` for a bound that document no longer states, so a contributor re-deriving the
guarantee from the cite gets a stale answer down a trusted-looking chain. [[L20]] says a
discipline-only remedy WILL recur and the second occurrence earns a floor check — this class recurred
**inside** the increment that named it, in the file it named, which is that trigger fired at the
shortest possible range. [[L29]] says a remedy quantified over a set owes the ENUMERATION as its
deliverable; this says which claims silently **join** that set, and demonstrated the failure in its own
evidence-gathering, twice. Distinct from [[L25]], which is about a rationale that did not TRAVEL to
sibling files: these sentences travelled fine, they simply **expired** — a comment can be complete,
local, and false.

**Provenance.**

- feature: `docs-drift-resync`
- commit: `71e71ee03c7e2a0ad1bbfee9daa4c8336addf615`
- source: `.dev/features/docs-drift-resync/PLAN.md` + the CHANGELOG `[Unreleased]` 2.7.13 → 2.7.14
  entry naming `eval-format.md` as a corrected site, re-derived live at HEAD `f7c3caa` against
  `pharn/pharn-contracts/eval-format.md:52`, `pharn/pharn-contracts/finding-shape.md`, and the seven
  grillers
- promoted: 2026-08-23 via gated `/pharn-dev-memory-promote` (human-approved).

## L34 — "For each X, assert P" says nothing when there are no X — a per-item assertion set certifies the suppressed emission

type: floor · concepts: [vacuous-truth, empty-set, fail-closed, eval-design]

**Lesson.** A checker assembled from per-item assertions passes **vacuously** over an empty domain, and
a vacuous pass is indistinguishable from a real one at the verdict. `pharn/floor/check-structural.mjs`
is the instance: its `field_equals`, `file_resolves` and `needle_absent_from_enum_gated` kinds all
iterate `findings`, so an eval that wrote per-finding assertions but omitted `finding_count` certified a
skill that emitted **nothing** — every assertion true, zero findings examined, GREEN. The eval a
Capability ships as its specification (P1) was satisfied by the total absence of the behaviour it
specifies. Remedy, now at `pharn/floor/check-structural.mjs:208-224`: guard the zero-item case
explicitly — membership over the assertion kinds present, plus an integer length test, no judgment (P5).
The legitimate "I expect nothing" intent MUST stay expressible, and that is exactly what distinguishes
the two cases: an eval that genuinely expects an empty result says so with `finding_count == 0` and
stays GREEN. Silence and asserted-silence are different claims; only the second is a specification.

**The shape is widely RECOGNISED and still nothing ranges over it — recognition is not coverage.** Four
other production sites defend the identical shape, each written by hand, sharing no helper (all five
import Node stdlib only; zero cross-imports between them): `pharn/floor/check-verify.mjs:99` and
`pharn/floor/check-regress.mjs:376` carry the byte-identical string `is empty — no gates captured`,
written separately; `.dev/floor/check-variance.mjs:171` dies INCONCLUSIVE on `valid.length === 0`;
`.dev/floor/check-contributing-gates.mjs:108` REDs `EMPTY_CHAIN` because "a set with no members is not a
chain". Six further test files carry hand-written comments defending their **own** tests against passing
vacuously — `check-ship-briefing`, `check-provenance`, `check-contributing-gates`, `command-hygiene`,
`entry-point-guard`, `lessons-index-core`. So the failure mode is understood repo-wide, re-derived
locally at each site, and enforced nowhere as a class — and the one place the hand-rolled guard was
missing is `check-structural`, the checker that executes the eval contract itself.

**Why it matters.** A vacuous pass is the **fail-OPEN** direction of a checker whose entire purpose is to
fail closed, and it is invisible in the direction people look: a suppressed emission and a clean
codebase produce the same GREEN. That makes it the highest-value silent regression an enforcement
pipeline can carry — a lens that stops emitting is certified by its own eval, and P1's "evals are the
spec" degrades to "evals are the spec, unless the output is empty." [[L20]] says a discipline-only
remedy will recur and the second occurrence earns a floor check; here the count reached **five**
hand-written guards before the sixth site slipped, which is that trigger long overdue rather than newly
fired. [[L29]] says a remedy quantified over a set owes the **enumeration** as its deliverable — the
five sites above are that enumeration, materialized in one place for the first time, and the honest
residual is that nothing yet iterates it. Distinct from [[L23]], which also turned on an empty array
hiding a defect: there the emptiness was the **happy path** concealing a self-referential gate conflict
between a stage and its own artifact; here the emptiness is the **domain of quantification** itself, and
the defect is that a universally-quantified claim over it is true for free. Same symptom, different
mechanism — L23's remedy is to exempt an artifact from a gate, this one's is to assert the domain is
non-empty.

**Provenance.**

- feature: `floor-hardening`
- commit: `02c2d17e54f49b4b16395b98799726e5e77c5a01`
- source: `.dev/features/floor-hardening/PLAN.md` (its L7 rows in `## Files` + the `## Guarantee audit`
  line "L7 'per-finding assertions cannot pass vacuously' → **floor: enum-regex**") + the CHANGELOG
  2.7.13 entry, with the five-site recurrence and the six recognition sites re-derived live at HEAD
  `a0cfd0d`
- promoted: 2026-08-23 via gated `/pharn-dev-memory-promote` (human-approved).

## L35 — When one fact is stored twice, retire the second copy — a sync check is a third thing to keep in sync

type: process · concepts: [redundant-identity, remedy-design, version-discipline, sync-cost]

**Lesson.** When the same fact is stored in two places, the first question is whether the second copy
should exist at all — **not** how to keep them agreeing. A sync check is itself a third artifact with its
own wiring, its own invoker and its own failure mode, and it makes the redundancy **permanent by making
it maintained**. Three identities carried the product version: `package.json`'s `version`,
`SKILLS_VERSION`, and the README shields badge. The first read `1.0.0` as a "foundation tag" and sat
stale through the entire 2.x line while every gate stayed green, because nothing bound it and nothing
could have bound it without becoming the fourth thing to maintain. The remedy chosen in `#164` was to
**neutralise the identity, not bind it**: `package.json:4` is now `"version": "0.0.0"` and
`package.json:3` is a `_version_comment` stating the inertness **in the file itself**, so the fact is
self-documenting rather than documented somewhere a reader must find.
`.dev/floor/check-version-badge.mjs` then deliberately does **not** read `package.json` — it names the
field only in its own honest-bounds header (`:26-40`) — and pins the two identities that genuinely
remain: `SKILLS_VERSION` 2.7.15 == the README badge 2.7.15.

**The precise remedy is "retire", not "delete" — and that distinction is the transferable part.** npm
requires a `version` key, so the redundant copy could not be removed; it was drained of authority
instead, which is the general move when a mandatory slot holds a fact that belongs elsewhere. Give the
slot a value that cannot be mistaken for the truth (`0.0.0`, never a plausible-looking number), and put
the reason **at the slot** rather than in a doc. The rejected alternative — pinning `package.json` to
`SKILLS_VERSION` — is recorded, not silently dropped, in `.dev/features/apparatus-batch/PLAN.md` under
"Open questions (HALT)": option (b) "creates a third identity to keep in sync, which is the defect being
fixed."

**Why it matters.** [[L20]] says a discipline-only invariant has earned a floor check on its second
occurrence, and read alone it will send you to build a checker every time. This is the qualifier: **a
sync check is the right remedy only once you have established the second copy must exist.** Reach for it
first and you have converted a deletable redundancy into a maintained one, plus a checker whose own
wiring must now be pinned by a test — the cost L20 never charges. Distinct from [[L31]], and exactly
opposite in prescription: L31 governs copies that must **both** exist (the deliberate `check-provenance`
and `lessons-index-core` product/dev pairs, which cannot be merged because a user's install ships
`pharn/floor/` without `.dev/`) and asks what **ranges over** them; this governs a copy that should
**not** exist and says draining beats binding. Both readings are live in this repo, and the question
that separates them is the same one in both directions: _must the second copy exist?_ — asked before
choosing a remedy, never after.

**Provenance.**

- feature: `apparatus-batch`
- commit: `a0916b8b7ce84f51b97b3dbe053eda7d96d9e804`
- source: `.dev/features/apparatus-batch/PLAN.md` "Open questions (HALT)" (the L11 option-(a)-over-(b)
  record) + the CHANGELOG entry for `#164`, with `package.json:3-4`,
  `.dev/floor/check-version-badge.mjs:26-40` and the live `SKILLS_VERSION`/badge agreement re-derived at
  HEAD `a0cfd0d`
- promoted: 2026-08-23 via gated `/pharn-dev-memory-promote` (human-approved).

## L36 — A per-member presence set is not a closed set — a parameterized value acquires variant spellings, and the enumeration certifies the one its author was looking at

type: floor · concepts: [enumeration, variant-spelling, closure-assertion, presence-vs-closure, parameterized-value]

**Lesson.** An enumeration pinned by one presence assertion per member is satisfied by a set that is not
closed. `ship-lesson-extract` shipped a five-member outcome vocabulary AND the test that enumerates it in
the same diff, and one member arrived under two names — `lesson: not-reached (<stage>)` in three places,
`lesson: not-reached (<stop>)` in the `--loop` section — with every presence rule GREEN, because a matcher
can only pin the spelling its author was looking at. The **parameter** is the fragment at risk: `<stop>`
read naturally in a section about loop stops, so it was re-derived from local context rather than copied.
Remedy: for a value carrying a parameter, add a **closure** assertion — collect every occurrence of the
stem the command writes and require each to match a member — so a variant of **any** member fails, not
just the one that happened to drift.

**Why it matters.** Presence and closure are indistinguishable at review time: both are green tests whose
names read correctly, and the difference only surfaces when a member drifts. This composes two existing
lessons in a way neither predicts. [[L29]] establishes that a remedy quantified over a set owes the
enumeration as its deliverable — it does not say the enumeration must also be _exhaustive over the text_.
[[L34]] establishes that a per-item assertion set says nothing over an empty domain — here the domain was
non-empty and the assertions all true, yet the set still certified a vocabulary the command did not use.
The composition is the new part, and the increment demonstrated it **at range zero**: one file, one
sitting, by the author who had just written both lessons into the plan's `applied_lessons`. Note also what
did _not_ catch it — `npm test`, `validate`, `lint`, `format:check`, `lint:md` and the structural gate were
all green over the defective text; it was found by a **review lens**, and the gate that now catches it
exists only because the lens found it first. Per [[L20]] a discipline-only remedy recurs, which is why the
remedy here is an assertion rather than a note to be careful.

**Provenance.**

- feature: `ship-lesson-extract`
- commit: `313b20b7557b7d407a16c5d04cc9f32268e05b32` (working-tree dogfood built on this commit;
  uncommitted at promotion time)
- source: `.dev/features/ship-lesson-extract/REVIEW.md` § "Floor-gate findings" — the single blocking
  finding (rule_id P5, `.claude/commands/pharn-dev-ship.md:374`) and the candidate proposed under
  § "Proposed lesson candidate"; the closure assertion was mutation-tested against the pre-fix text before
  promotion (it names `` `lesson: not-reached (<stop>)` `` explicitly)
- promoted: 2026-09-08 via gated `/pharn-dev-memory-promote` (human-approved).

## L37 — A doc stating a guard's bounds must be PROBED against the guard, not read off it — the universal quantifier is where the drift lands

type: contract · concepts: [guarantee-audit, verification-fidelity, universal-quantifier, doc-drift, false-green]

**Lesson.** Two sentences written to disclose `enforce-writes-scope.cjs`'s `DEFAULT_SAFE_SET` were
derived by **correctly reading** the hook, and both were wrong at the edges. (1) "the **only** paths …
may write are `features/**`, `.dev/features/**`, `pharn/pharn-*/**` and `.pharn/**`" is false for
`.pharn/writes-scope.json`, denied at `:314` **before** the allow-list is consulted. (2) "`/pharn-build`
writes **exactly the paths** your `PLAN.md` declared" is false for a glob entry, silently dropped by
`set-writes-scope.cjs`'s `isConcrete()` — measured: a two-bullet `## Files` list containing one glob
printed `1 path(s)`. Both survived authoring, a correct reading of the source, and a human plan-gate
approval; both fell to a 30-second probe. The transferable part is **where**: universal quantifiers —
"only", "exactly", "every" — are the fragment a careful reading does not check, because the reader
confirms the **listed** members and never hunts the **unlisted** exception. Remedy: for any sentence
quantifying over what a floor op permits or denies, **execute the op over at least one member you expect
to be excluded**, and record the exit code beside the sentence.

**Why it matters.** This is the P0 disease at its most deniable. Nothing here was sloppy — the author
read the implementation, the reviewer approved the text, and every gate was green over both false
sentences, because **no checker reads README prose**: `validate.mjs` ignores root docs,
`check-capability-catalog` guards only the `CURRENT-STATE` markers, `check-version-badge` reads only the
shields badge. So the failure mode is not "someone did not check"; it is "checking by reading cannot
reach this class". [[L2]] establishes that a contract may cite only a **live** floor op, verified by
reading the implementation **this run** — this is the sharpening: reading is what produced both defects,
so for a **quantified** claim, reading is not the verification, executing is. [[L26]] and [[L32]] are the
same family from the other side (a patch verified against a copy outside the repo; a method that consults
a mutable alias) — all three say the artifact you verify against must be the one that will actually run.
Distinct from [[L36]], which is about an author's **enumeration** acquiring a variant spelling: there the
set was mis-transcribed, here the set was transcribed correctly and the **quantifier around it** was
wrong. A corroborating instance surfaced in the same increment, in a different surface: restoring an
absent `node_modules` changed `npm test` from `1682 pass / 1 skipped` to `1683 pass / 0 skipped`, and the
test that had been self-skipping (`.dev/floor/capability-catalog-core.test.mjs:477`) was
`style: a spliced README passes the repo's prettier and markdownlint unchanged` — the single most
relevant test for the README-only change under review. A suite that skips still exits **0**, so
`check-verify.mjs`'s `PASS iff every gate exit 0` cannot see it: the verdict, too, confirms the members
it was shown and never hunts the one that quietly withdrew.

**Provenance.**

- feature: `writes-scope-default-disclosure`
- commit: `ab9aabdf5ea5177713bda2fee82c7220ec559a7c` (working-tree dogfood built on this commit;
  uncommitted at promotion time)
- source: `.dev/features/writes-scope-default-disclosure/GRILL.md` G1 and G2 (both with their probes
  quoted in `evidence`) + `.dev/features/writes-scope-default-disclosure/REVIEW.md`
  § "Proposed lesson candidate"; the two repairs are visible in `git diff README.md` against the
  approved text quoted in that increment's `PLAN.md`
- promoted: 2026-09-09 via gated `/pharn-dev-memory-promote` (human-approved).

## L38 — Concurrent agent sessions contend for the single writes-scope record, and the scope check then reports a false cause

type: scoping · concepts: [writes-scope, concurrency, shared-state, false-red]

**Lesson.** `.pharn/writes-scope.json` is ONE mutable file, global to the working tree, while every
stage's Step 0 assumes it owns it — so two agent sessions in one tree contend for it, and the contention
surfaces twice over. Observed live: mid-`/pharn-dev-grill`, another session's `/pharn-dev-plan` overwrote
the record (`set_by: .claude/commands/pharn-dev-plan.md`, target
`.dev/features/claude-dir-scan-exclusion/PLAN.md`), and this stage's own `GRILL.md` write was refused
against a scope it never set; re-running Step 0 fixed it and clobbered theirs in turn. Then
`/pharn-dev-regress` exited 1 with a fix #7 escape naming that same untracked file, because `scope`
derives `escaped` from `git diff <base>` plus untracked files — _what changed_, not _what this build
wrote_, and `--feature` exempts only the feature's own artifacts. Remedy: resolve it **structurally** —
run the stage from an isolated detached worktree, where the other session's work is absent by
construction — never by hand-filtering `--changed`, which is the move [[L17]]/[[L20]] exist to forbid.

**Why it matters.** The dangerous half is the second failure, because it is a **blocking finding whose
stated cause is false**: the message reads _"the build escaped its plan's `## Files`"_ when the build's
scope was `['README.md']` for every write, under a guard that had already demonstrably fired on that same
session minutes earlier. A future reader trusting that sentence hunts a scope breach that never happened
— and the tempting fix (edit the `--changed` list until the check passes) is precisely the hand-exclusion
[[L17]] documents and [[L20]] demands be given a floor check instead. The first failure fails **closed**
(a denied legitimate write — loud, recoverable, the safe direction); the second fails toward a **false
accusation**, which is worse because it looks like the system working. Distinct from [[L17]], which
concerns the method's granularity WITHIN one run, and from [[L19]], where a Bash write escapes the gate —
here the gate's own INPUT is the contended resource, which is why neither existing entry reaches it. The
remedy that suggests itself, "don't run two sessions at once", is discipline, which [[L20]] says is the
wrong kind.

**Provenance.**

- feature: `readme-audit-repairs`
- commit: `f0664927c4f00edf20748831c183cc92238133e5`
- source: `.dev/features/readme-audit-repairs/REVIEW.md` § "Proposed lesson candidate" +
  `.dev/features/readme-audit-repairs/REGRESSION.md` § "Run history" (both attempts, with the clobbered
  scope record quoted) + `.dev/features/readme-audit-repairs/GRILL.md` (the denied write)
- promoted: 2026-09-10 via gated `/pharn-dev-memory-promote` (human-approved).

## L39 — One declaration section read by two consumers asking different questions is right for one and silently wrong for the other

type: scoping · concepts: [writes-scope, plan-shape, generated-artifact, shared-parser, false-red]

**Lesson.** A PLAN's `## Files` is parsed by `set-writes-scope.cjs --from-plan` to answer "what may the
pre-write hook allow?" and by `check-regress.mjs scope --declared` to answer "what did the plan authorize?".
Those are different questions and they diverge exactly at GENERATED artifacts: a file a generator writes
through Bash must be EXCLUDED from the first ([[L19]] — do not imply the gate covered it) and INCLUDED in the
second (the plan did authorize it). Sharing one parser makes every increment that regenerates a derived
artifact trip a false fix#7 scope breach, and the natural workaround — widening `--declared` by hand from the
plan's own prose — hands an untrusted document control over a floor helper's authorization set.

**Why it matters.** The false RED is the visible half and the cheap half; the expensive half is the fix.
Clearing it requires letting an untrusted `PLAN.md` define the boundary a floor helper polices, which
composes with [[L19]]'s Bash escape into an undetected write: a plan listing a real source file under a
`### Regenerated` heading would have that path read as authorized, while the hook that would deny a Write to
it is bypassed anyway because the write goes through Bash. Measured live in `claude-dir-scan-exclusion`:
`scope` exited 1 naming **37** escaped paths, all of them genuine generator output, and clearing it required
exactly that widening. The generated-artifact category is standing rather than incidental in this repo —
`docs/capabilities/**`, `docs/lessons-index.md`, the README `CURRENT-STATE` region — so this recurs on every
increment that regenerates anything, which is what makes it a mechanism failure rather than a slip.
Complements [[L19]] (which says declare the Bash write rather than pretend the gate covered it) by naming
what happens when a SECOND consumer reads that declaration for a different purpose, and sits beside [[L17]]
on the other argument of the same helper. The deterministic remedy belongs to `check-regress.mjs` — an
exemption for paths a plan declares as generated, reported in `escape_exempt` the way `--feature`'s already
are — not to the increment that trips it. **Honest bound, recorded rather than smoothed over:** observed
**once**. [[L20]]'s bar for escalating a discipline remedy to a floor check is a second occurrence, so this
entry records the shape and does not yet claim the trigger fired.

**Provenance.**

- feature: `claude-dir-scan-exclusion`
- commit: `4bd1b0c3269504ee55060b2a74ca8f1eca68de23` (working-tree dogfood built on this commit;
  uncommitted at promotion time)
- source: `.dev/features/claude-dir-scan-exclusion/REVIEW.md` R2 (the advisory P2 finding), with the false
  breach and its clearance both reproduced live in that run and recorded in the same feature's
  `REGRESSION.md`
- promoted: 2026-09-10 via gated `/pharn-dev-memory-promote` (human-approved). Promoted as `L38` and
  **renumbered to `L39` when merging `main`**: PR #206 landed its own `L38` first, so the id collided.
  The collision is itself an instance of that entry's subject — see [[L38]], promoted from the other side
  of the same contention.
