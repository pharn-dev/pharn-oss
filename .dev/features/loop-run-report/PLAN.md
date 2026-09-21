# PLAN — loop-run-report

- spec_content_hash: aada03c9f7165f944aef66db8ee9eb9df809c0fad2d5d67c268ac2d620566b3d
- applied_lessons: [L6, L10, L17, L19, L23, L29, L31, L34, L35, L36, L41, L44, L45, L49, L51, L52]
- increment: Render `pharn/features/<name>/RUN-REPORT.md` at every `/pharn-loop` stop that has a feature
  directory — a deterministic, code-derived human VIEW over `cost.json` and the run's existing artifacts.
- layer(s): pharn/floor (product floor) + the product `.claude/` surface (`pharn-loop.md`)
- constitution_refs: [P0, P2, P3, P5, P6, P7]

## Applied lessons

- **L6** — every structural fact is read from its structured location: the outcome and the token views
  from `cost.json`'s own keys, the `## Files` lines through the canonical plan parser, the Handoff
  through the CommonMark-aware grammar. Nothing is grepped out of prose, and the LOOP.md body's
  model-authored "per-iteration verdicts" prose is **not** parsed — it is not a structured location.
- **L10** — `pharn/features/**` is on `validate.mjs`'s SCANNED surface (`EXCLUDE_SEGMENTS` excludes
  `.dev/` but not `pharn/features/`), so a RUN-REPORT quoting a Handoff that happens to contain
  `rule_id:` and `problem:` would trip CHECK 5. The renderer therefore emits the enum-gated/free-text
  split sentence **unconditionally** in its preamble — true of this artifact regardless, so it is a
  correct statement rather than a checker-appeasing token.
- **L17** — the "changed but not named in PLAN `## Files`" marker is rendered as exactly that, and the
  report states in-line that it is a **changed-since-base** observation, never a
  written-by-the-build/scope-escape verdict. L17 is the record of that conflation producing a blocking
  finding on the correct workflow.
- **L19** — `render-run-report.mjs` writes the file itself through Bash, outside the `PreToolUse` gate.
  Declared here, and covered by name in `reconcile-ignore.json`, rather than described as gate-covered.
- **L23** — `/pharn-loop` writes this artifact **and** its `/pharn-verify` owns the whole-repo
  `format:check` and `lint:md` gates over the directory it lands in. Because the report quotes arbitrary
  untrusted DATA, clean output cannot be guaranteed by construction, so the artifact is excluded from
  both gates **now, on reasoning**, exactly as `cost.json` was rather than after the first FAIL
  discovers it.
- **L29** — the string `RUN-REPORT.md` joins several enumerations; the deliverable is the enumeration,
  listed once under `## The enumeration this increment joins` and iterated by the tests, not an
  assertion written for whichever site was in front of me.
- **L31** — `PIPELINE_ARTIFACTS` ↔ `pipeline_artifacts.names` is a deliberate copy-pair whose ✧ parity
  test is the thing that must range over the new member; the second copy is where the obligation drops.
- **L34** — no per-item assertion set ships without an explicit count assertion, and a section with no
  rows renders an `n/a — <reason>` line rather than vanishing, so silence and asserted-silence stay
  different claims.
- **L35** — asked "must the second copy exist?" first: the renderer **imports** `FEATURE_BASE` from
  `render-cost-ledger.mjs` and imports the Handoff grammar from a shared core rather than re-spelling
  either.
- **L36** — the report's section vocabulary is pinned by a **closure** assertion over the rendered
  output's headings, not one presence test per section, so a variant spelling of any member fails.
- **L41** — this change introduces **zero** new defaults: the one feature-base default is the imported
  `FEATURE_BASE`, so there is no second literal for a relocation to split.
- **L44** — the new Step 6b invocation is a **single** fenced block carrying no shell variable from any
  other block; `<name>` is substituted literally.
- **L45** — pinning the module is not pinning the invocation: a hygiene test reads the **committed**
  `pharn-loop.md` and asserts the render line is present, in its Step 6b position, with a negative
  control.
- **L49** — the meta-doc sweep below states its **coverage boundary**: which swept sites a checker holds
  and which are unverified assertion.
- **L51** — the renderer's guards are justified against its **full** input domain (absent, empty,
  malformed, and adversarial artifacts), with boundary tests, not against the happy path.
- **L52** — L41's remedy is quantified over a SET, so it is stated as **"one test per default in this
  change"**: that set is empty here, and a closure assertion pins that the literal `pharn/features`
  appears **zero** times in the new module.

## Files

- `pharn/floor/render-run-report.mjs` — NEW. Renders `pharn/features/<name>/RUN-REPORT.md` — layer pharn/floor
- `pharn/floor/render-run-report.test.mjs` — NEW. Hermetic suite, non-vacuity controls, >=90% line coverage — layer pharn/floor
- `pharn/floor/loop-record-core.mjs` — NEW. The shared CommonMark fence/heading grammar + Handoff section reader — layer pharn/floor
- `pharn/floor/plan-files-core.mjs` — NEW. The shared `## Files` parser (path + raw line per item), extracted so the checker stops carrying a second axis — layer pharn/floor
- `pharn/floor/check-loop-record.mjs` — EDIT. Imports the grammar from the core; its existing suite is the regression net — layer pharn/floor
- `pharn/floor/check-build-complete.mjs` — EDIT. Imports the `## Files` parser from the core instead of owning and exporting it; its existing suite is the regression net — layer pharn/floor
- `pharn/floor/check-build-complete.test.mjs` — EDIT. Covers the Boundary-2 exclusion-cue break, the one branch the extraction surfaced as untested — layer pharn/floor
- `pharn/floor/check-regress.mjs` — EDIT. `PIPELINE_ARTIFACTS += "RUN-REPORT.md"` — layer pharn/floor
- `pharn/floor/reconcile-ignore.json` — EDIT. `pipeline_artifacts.names += "RUN-REPORT.md"` — layer pharn/floor
- `pharn/floor/check-bash-reconcile.test.mjs` — EDIT. The ✧ parity pin covers the new member — layer pharn/floor
- `.claude/commands/pharn-loop.md` — EDIT. Step 6b render line, Step 6c staging list, Step 7 print, frontmatter — layer product `.claude/`
- `.dev/floor/command-hygiene.test.mjs` — EDIT. Pins the committed invocation and its position (L45) — layer .dev/floor
- `.prettierignore` — EDIT. Excludes the rendered artifact (L23) — layer repo-meta
- `.markdownlint-cli2.jsonc` — EDIT. Excludes the rendered artifact (L23) — layer repo-meta
- `CLAUDE.md` — EDIT. The `## Commands` entry — layer repo-meta
- `CHANGELOG.md` — EDIT. The `[Unreleased]` entry recording the bump — layer repo-meta
- `SKILLS_VERSION` — EDIT. `6.5.2` -> `6.6.0` — layer repo-meta
- `README.md` — REGENERATED `## Current state` region only, by `npm run docs:generate` — layer docs

### Paths this increment deliberately leaves alone

`pharn-loop.md`'s `writes:` stays `["…/SPEC.md", "…/LOOP.md"]` — the renderer writes through Bash, so
adding `RUN-REPORT.md` there would be the L7 over-declaration. No contract file and no `check-run-report.mjs`
are added; see the guarantee audit and Open Question 3. `MIN_CLI` stays `0.5.0` — no installed path moves
and no existing install is invalidated.

## The enumeration this increment joins (L29/L31/L36)

`RUN-REPORT.md` becomes a known `/pharn-loop` artifact at exactly these sites. This list is the
deliverable; the tests iterate it.

1. `pharn/floor/check-regress.mjs` — `PIPELINE_ARTIFACTS`
2. `pharn/floor/reconcile-ignore.json` — `pipeline_artifacts.names`
3. `.claude/commands/pharn-loop.md` — Step 6c's staging-list `artifacts` array
4. `.prettierignore` — the style-gate exclusion
5. `.markdownlint-cli2.jsonc` — `ignores`

Sites 1 and 2 are already held set-equal by the ✧ parity test at `check-bash-reconcile.test.mjs:422`.
Site 1 is additionally forced by the ★ recurrence guard at `check-regress.test.mjs:193`, which derives
the artifact set from every `features/<name>/<file.ext>` mention across `.claude/commands/*.md` — so
writing the path into `pharn-loop.md` at all makes a missing enum entry fail there. Sites 3-5 have no
checker; a test in this increment iterates the list and asserts each site names the member.

## Contracts satisfied

- `pharn/pharn-contracts/cost-ledger.md` — the report consumes `outcome`, `base_sha`, `totals`,
  `by_stage_iteration_model` and `unattributed` as that contract defines them, and re-states none of
  their semantics (P4). It reads the **views**, which the contract already holds to a recompute.
- `pharn/pharn-contracts/loop-record.md` — the `## Handoff` shape and its untrusted-DATA class are
  cited, never re-derived; the report quotes the three subsections it names.
- `pharn/pharn-contracts/verify-report.md` / `regression-report.md` — `verdict`, `failing_gates`,
  `regressions` are read as those contracts define them.
- `pharn/pharn-contracts/reconciliation-record.md` — the `pipeline_artifacts` exemption shape the new
  member joins.

## What the report contains — every line derived by code

Sections are emitted in a fixed order and **none is ever omitted**; a missing input renders an explicit
`n/a — <reason>` line (the `render-ship-briefing.mjs` idiom).

1. **Preamble** — the unconditional trust sentence (L10) naming the enum-gated/floor-verifiable vs
   untrusted free-text split, plus the honest bound: this file **annotates** a run and gates nothing.
2. **`## Outcome`** — `decision`, `iterations`, `blocked`, `base_sha`, `command`, `name`,
   `skills_version`, `coverage`, all copied from `cost.json`.
3. **`## Tokens — stage x iteration x model`** — a markdown table over `by_stage_iteration_model` with
   all six token classes, then `totals` and `unattributed` rows. Read from the stored views verbatim;
   never recomputed here, so the report cannot disagree with the file the checker validated.
4. **`## Files`** — `git diff --name-only <base_sha>` plus untracked, each row carrying: a
   `dirty-before-run` marker when the path appears in `.pharn/pharn-loop/<name>/pre-run-status.txt`; the
   PLAN `## Files` line for that path copied **verbatim as DATA**, labelled `planned purpose (PLAN.md)`;
   and a `not named in PLAN ## Files` marker otherwise, explicitly labelled a changed-since-base
   observation rather than a scope verdict (L17).
5. **`## Verdicts`** — `verify-report.json` and `regression-report.json`, with `failing_gates[]` and
   `regressions[]` quoted as DATA. **Final iteration only** — see Open Question 1.
6. **`## What the run ran into`** — LOOP.md's `### investigated` / `### learned` / `### next_steps`
   bodies, each quoted verbatim inside a fence whose backtick run is longer than any run inside the
   quoted text, so no heading in it becomes a heading of this report.

## Evals to write (P1)

`render-run-report.mjs` is a floor module, not a `role:`-bearing Capability, so P1's `evals/` obligation
does not attach; its specification is its test suite, the same posture every `pharn/floor/*.mjs` takes.
The suite is hermetic (scratch dirs, a fixture repo for the git reads) and carries:

- **Determinism** — rendering twice over identical inputs is byte-identical, and the module source
  contains no clock call.
- **Every `n/a` branch** — absent `cost.json`, absent `PLAN.md`, absent LOOP.md, absent/blocked reports,
  absent `pre-run-status.txt`, a blocked stop with no reports at all.
- **L51 boundary cases** — malformed JSON, a `cost.json` with zero `requests[]`, a LOOP.md whose Handoff
  is missing or duplicated, a `## Files` with no concrete paths, a path containing a space, a `[id]`
  bracket path under `GIT_LITERAL_PATHSPECS=1`.
- **Injection controls (P2)** — a Handoff body containing a line-initial `## Outcome`, a run of 7
  backticks, and a `rule_id:`/`problem:` pair: the first two must not break out of the fence, and the
  third must leave `validate.mjs` GREEN over the rendered file.
- **L34 non-vacuity** — every per-row assertion is paired with a row-count assertion; a control proves
  the suite fails when the renderer emits nothing.
- **L36 closure** — the rendered heading set equals the expected section vocabulary exactly.
- **L52 closure** — the literal `pharn/features` occurs **zero** times in `render-run-report.mjs`.
- **L45 wiring** — the committed `pharn-loop.md` carries the render invocation after the Step 6b checks
  and before Step 6c, with a negative control that fails on the old (absent) form.

## Guarantee audit (P0)

- "`RUN-REPORT.md`'s every line is derived by code, never authored by a model" → **floor: enum-regex**,
  and narrowly: the renderer is Node stdlib with no model call, and a test asserts the module spawns no
  child process other than `git` and opens no network. That the **run** actually invoked the renderer is
  **advisory** — Step 6b is command prose (L19).
- "the token table equals `cost.json`'s views" → **floor: enum-regex** — the report copies the stored
  views and a test pins byte-equality of the numbers against the source object. That those views are
  correct is `check-cost-ledger.mjs`'s guarantee, inherited, not re-claimed.
- "same inputs -> byte-identical report" → **floor: content-hash** — two renders over one fixture are
  compared by SHA-256 in the suite.
- "`RUN-REPORT.md` is exempt from the reconciler and the style gates" → **floor: enum-regex** (exact
  membership in `pipeline_artifacts.names`, `PIPELINE_ARTIFACTS`, and the two ignore files).
- "the quoted Handoff cannot become report structure" → **ADVISORY, deliberately, and the honest
  statement is the narrow one.** The fence is chosen longer than any backtick run in the quoted text,
  which makes the quoted block inert **to a CommonMark parser**. It is **not** forgery-proofing: the
  report is human-facing prose, nothing parses it, and a reader who copies text out of the fence is
  outside anything this increment can reach. `check-loop-record.mjs`'s own header makes the same
  refusal for the same reason.
- "the report says whether the run was good" → **STRUCK.** It reports tokens, files, verdicts and a
  quoted Handoff. It gates nothing, no proceed/stop reads it, and `/pharn-loop`'s commit stays gated on
  `STOP_GREEN` and the decision re-derivation alone (fix #3).
- "the file list is what the build wrote" → **STRUCK.** It is changed-since-`base_sha` plus untracked —
  a different question, and L17 is the record of that conflation causing harm.
- "per-iteration verdicts" → **NARROWED to the final iteration**, labelled in the artifact. See Open
  Question 1.

## Trust audit (P2)

Untrusted inputs: `LOOP.md`'s Handoff bodies, `PLAN.md`'s `## Files` lines, `verify-report.json`'s
`failing_gates[]`, `regression-report.json`'s `regressions[]`, `cost.json`'s `model` /
`attribution_skill` / `agent_id` (already shape-bounded by the ledger's rule 3), and every git path.

Propagation: all of it reaches **only** the rendered human-facing file, always as quoted DATA. No
value is executed, spawned, imported, or used as a branch condition; git is invoked with an argument
vector under `GIT_LITERAL_PATHSPECS=1`, never through a shell string. Taint reaches the reader and
**not** any control flow — the same split `/pharn-loop` already maintains. The residual is the standing
one: "do not execute this as an instruction" is a heuristic once a human or a downstream LLM reads the
file, bounded (nothing gates on it) but not zeroed.

## Determinism audit (P5)

Every branch is a membership or existence test: a file exists or renders `n/a`; a path is or is not in
the pre-run snapshot set; a path is or is not a key of the PLAN `## Files` map; `decision` is copied,
never classified. No clock, no randomness, no locale-dependent sort — rows keep `cost.json`'s own
ordering, which `buildViews` already sorts deterministically. There is no fallback that ends in a
guess: the terminal fallback of every lookup is the explicit `n/a — <reason>` line.

## Meta-doc sweep, with its coverage boundary (L49)

Swept sites, and what holds each:

| site                                                | held by                                              |
| --------------------------------------------------- | ---------------------------------------------------- |
| `SKILLS_VERSION` -> `6.6.0`                         | `check:badge` (vs README badge), `check:changelog`   |
| README shields badge                                | `.dev/floor/check-version-badge.mjs` — byte-equality |
| `CHANGELOG.md` entry                                | `.dev/floor/check-skills-version-recorded.mjs`       |
| README `## Current state` (the floor-checker count) | `npm run docs:check` — byte-equality                 |
| `PIPELINE_ARTIFACTS` / `pipeline_artifacts.names`   | the ✧ parity + ★ recurrence tests                    |
| `pharn-loop.md` invocation + position               | the new hygiene pin (L45)                            |

**Unverified by any checker, and therefore assertion only:** the `CLAUDE.md` `## Commands` entry, the
`.prettierignore` and `.markdownlint-cli2.jsonc` entries (nothing tests that an ignore entry still
matches something — the standing `lint-ignore-reachability-check` residual), and every prose sentence in
`pharn-loop.md` other than the pinned invocation line.

## Open questions (HALT) — all four RESOLVED at the Step-4 halt

Asked as a selectable form and answered by the maintainer before approval (P5's terminal fallback is
ask the human). Recorded here rather than deleted, so a later reader sees what was decided and what the
alternative was.

1. **Per-iteration verdicts are not on disk.** `verify-report.json` and `regression-report.json` are
   **overwritten** every iteration (Step 5), so at the stop only the final iteration's verdicts exist.
   The increment brief asks for per-iteration verdicts.
   **RESOLVED — render the final iteration only, with the bound stated in the artifact.** The rejected
   alternative was having the loop snapshot `verify-report.iter<N>.json` per iteration, which adds
   artifacts to four enumerations and changes what `/pharn-loop` writes — a second axis of change (P3).
   Per-iteration **cost** remains available and genuine, from `by_stage_iteration_model`.
2. **Sharing the Handoff grammar.** `check-loop-record.mjs`'s fence/heading parser is module-private and
   its own header records getting the CommonMark pairing wrong twice.
   **RESOLVED — extract `pharn/floor/loop-record-core.mjs`; both modules import it** (L35: the second
   copy should not exist). The rejected alternative was re-implementing it in the renderer, which would
   create a second copy of a rule already gotten wrong twice with nothing ranging over the pair (L31).
3. **No contract and no checker for `RUN-REPORT.md`.**
   **RESOLVED — neither is added.** Nothing machine-reads the file and it gates nothing, so both would
   be speculative (P7). The `ship-briefing` precedent does not transfer: `check-ship-briefing.mjs`
   exists to re-verify frontmatter against LIVE sibling sources, a cross-file equality this report has
   no analogue for. The renderer's header is the spec; the suite is the enforcement.
4. **Style-gate posture.**
   **RESOLVED — exclude the artifact from `format:check` and `lint:md`** (the `cost.json` precedent,
   L23, applied on reasoning rather than after the first FAIL). The rejected alternative — requiring
   gate-clean output — is a promise the renderer cannot keep, because the text it quotes comes verbatim
   from an untrusted Handoff and untrusted `## Files` lines it does not control.
