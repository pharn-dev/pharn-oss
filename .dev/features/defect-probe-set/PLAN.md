# PLAN — defect-probe-set

- spec_content_hash: f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d
- applied_lessons: [L4, L34, L36, L43, L62, L66, L70, L71, L81]
- increment: a fixed set of probes with one planted defect each, a manifest that pins their bytes and expectations, a
  deterministic per-finding scorer under `.dev/floor/`, a kit builder that materializes headless runs for any arm,
  model and stage, and a measurement record (pending until the user's runs) of the catch count on current `main`
  (Linear CORE-90)
- layer(s): build apparatus only — `.dev/floor/` (two dev CLIs and their tests), `.dev/probes/` (new: the probe set),
  `.dev/measurements/` (the record), `.dev/guides/floor-checks.md` (the CLI reference), repo-meta (three formatter /
  linter ignore lists, `CHANGELOG.md` `[Unreleased]`). Nothing under `pharn/` or `.claude/`. No `SKILLS_VERSION` bump.
- constitution_refs: [P0, P2, P3, P5, P6, P7]

## Open questions — RESOLVED at GATE 1 (2026-11-16)

None open. GATE 1 was decided by the orchestrator as a model decision under the user's delegation ("You make all
decisions"), not by a human: Q1–Q7 below all took the first (recommended) option, with three conditions: commit this
PLAN at once (done, `5347ed43`); prove from the configuration whether unloaded fixture source counts against the 100%
diff-coverage gate (it does not — see "Amendments after the grill"); and check every `claude` flag against
`claude --help` of the installed 2.1.323 before writing `commands.txt` (all exist — same section). The questions as asked:

1. **Target project for the probes.** Recommended: **a small fixture project committed with the probes** (a zero-dependency
   Node service, about 600 lines: invoices, API keys, an integer-cents money module, a versioned JSON store, an audit
   log). The kit overlays the arm's product surface onto a fresh copy of it per run. Rejected alternative: target this
   repository at a pinned commit. The product surface under test IS this repository's code, so overlaying a new arm
   would change the code the plans talk about, and the probes would stop being fixed. No file comes from
   `~/Projects/pharn-app` (orchestrator decision).
2. **Probe count.** Recommended: **4 PLAN probes + 2 SPEC probes** over two features (`invoice-refunds`,
   `api-key-rotation`), 12 runs at 2 per probe. Estimated main-arm cost **about USD 64 (range 50–75)**, under the USD 80
   cap: PLAN probe run = grill (opus, USD 2.5–3.1 measured on larger plans) + triage (sonnet, USD 0.4–0.5) ≈ 3.5, × 8 =
   28; SPEC probe run = plan (opus, unmeasured as a headless session; assumed 4–6) + grill + triage ≈ 9, × 4 = 36.
   A fifth PLAN probe would add about USD 7 and push the upper bound to the cap.
3. **The omission defect.** Recommended: **include one** (probe B2: the plan never covers one acceptance criterion), with
   the anchor rule in the manifest: a finding matches when its `file` cites that criterion's lines in `SPEC.md`, or the
   `## Acceptance mapping` heading line of `PLAN.md` (slack 0). Stated cost: a finding about the omission that cites
   another line is a miss.
4. **What a SPEC probe measures.** Recommended: **state the bound.** A SPEC probe runs `/pharn-plan → /pharn-grill →
/pharn-triage` on a fixed SPEC with a planted defect, so it measures the plan writer and the grill and triage
   downstream of it. A fixed SPEC cannot measure the spec writer's own output; the ticket's "for changes to the spec
   writer" holds only for a change that alters what the plan, grill or triage read from a SPEC.
5. **Raw run outputs.** Recommended: **commit them after the runs** under this feature's audit trail,
   `.dev/features/defect-probe-set/runs/<probe>/r<n>/{grill-findings.json,grill-triage.json}`, plus the scorer's
   `tally` JSON verbatim (`runs/tally.json`), so the count can be re-scored from the repository. They are NOT in
   `## Files`: they do not exist at the first `/pharn-dev-verify`, whose completeness capture would read INCOMPLETE,
   and `.dev/features/**` is a pipeline-artifact directory the default-safe-set admits once the build's scope is
   released. The record itself (`.dev/measurements/…`, in `## Files`) is filled by re-setting this plan's scope.
6. **Formatter and linter scope.** Recommended: **exclude `.dev/probes/` and `.dev/features/defect-probe-set/runs/`**
   from prettier, markdownlint and ESLint, as `.dev/floor/test-fixtures/` already is. The probe inputs are hashed: a
   formatter that rewrites one changes its sha256, and the kit and scorer then refuse the whole set; the raw outputs are
   model-written JSON whose bytes the tally's sha256s pin.
7. **The kit builder in the repository.** Recommended: **commit it** (`.dev/floor/defect-probe-kit.mjs`, tested), because
   CORE-112 reuses the probe set with other models per stage. The alternative is a script in the batch scratch directory,
   which does not survive the session.

## Amendments after the grill (2026-11-16, before the build)

`/pharn-dev-grill` raised one blocking-severity and three important concerns (`GRILL.md`). They change the scorer and
the kit, not `## Files`:

- **Token anchors for SPEC probes (GRILL finding 1).** The product grill is told to cite `PLAN.md:<line>` in every
  `file`, so SPEC.md line anchors alone would score p5 and p6 as misses by construction. A SPEC probe's manifest entry
  therefore also carries `plan_tokens` (the planted criterion ids, e.g. `AC-5`): a finding matches when its `file`
  cites the run's own `PLAN.md` at a line holding one of those tokens as a whole word (a set-membership test over that
  line), or cites the SPEC anchors as before. The scorer reads a third file for those probes only — the run's
  `PLAN.md`, which the kit copies out beside the two JSON files — and `score` takes `--plan <PLAN.md>` for them. So
  AC 2 ("from the two JSON files alone") holds literally for PLAN probes; for SPEC probes it holds with that one stated
  extension, and the plan text is scanned only for fixed tokens, never read as instructions (P2). Bound: a plan that
  names a token on many lines widens the anchor.
- **The omission anchor (finding 2).** Kept as planned and its miss stated: an absence finding that cites the plan's
  first line is not matched, because the first line also receives every other whole-plan absence (error handling,
  observability), and matching it would count noise as a catch.
- **A per-session spend cap and a fixed environment (findings 3 and 4).** Every session gets `--max-budget-usd`
  (default 12, a runaway bound above the measured USD 3.11 grill), `--strict-mcp-config` (no MCP servers) and
  `--setting-sources project` (the run project's own settings, which wire the hooks; no user or local settings), so a
  later arm runs in the same tool environment. All three exist in `claude --help` 2.1.323, as do `--effort` (low,
  medium, high, xhigh, max), `--output-format` (`json`), `--allowedTools`, `--model` and `--permission-mode`
  (`acceptEdits`).
- **Coverage (finding 5, and GATE 1 condition 2).** Proved, not assumed: pharn-ci reads `coverage/lcov.info` from
  `npm run test:coverage` (`node --test --experimental-test-coverage`, no c8); pharn-ci's own reference
  (`NO_COVERABLE_CHANGES`) says a file absent from the report adds nothing to the denominator and that Node's runner
  reports only files a test loaded; and a local run of that runner over a probe-shaped tree listed the test file and the
  module it imports, and not a `.js` file the test only read as bytes. So the fixture's source adds no coverable line
  as long as no test imports it. The same run listed the TEST file too, so every line of the two new test files must
  execute: no untaken branch in a test helper.

## Amendments after the runs (2026-11-17, round 2 of the build)

The user's 12 main-arm runs are in. Two changes, both decided by the orchestrator under the user's delegation:

- **Plan-stage outcomes.** Both p5 plan sessions refused to plan, naming the planted contradiction, and left no
  `PLAN.md`, which the pre-registered rule could only score `findings-missing`. The scorer gains `caught-at-plan` and
  `stopped-at-plan-unanchored` (commit `6f18935a`; the README states the rule, and the record says it was added after
  the runs and before scoring, with the manifest unchanged).
- **Raw outputs in `## Files`.** Question 5's answer put them outside `## Files` because they did not exist at the first
  verify. They exist now, so they are declared here by concrete path, and this round re-anchors the build epoch before
  writing them. Each SPEC probe's `plan.session.json` is committed redacted to `type`, `subtype`, `is_error` and
  `result`, the fields the scorer reads, because the session file also carries session and request ids. `tally.json` is
  re-computed over the committed files, so its sha256s are theirs.

## Applied lessons

- L4 — the reason this increment exists: a griller's 1 KB authored fixture passes by construction; the probe set
  measures the live chain, and the record keeps the floor count (matched ids) apart from the advisory reading (that a
  match is the planted defect).
- L34 — the scorer refuses an empty domain: a manifest with no probes, a `tally` with a selected probe that has no run
  directory, and an anchor list that is empty are usage errors (exit 2), never a vacuous count; zero findings scores
  `no-anchor-match`, never caught.
- L36 — the run outcome is a closed set (`OUTCOMES`) and the manifest's keys, `kind`, `defect` and
  `expected_disposition` are closed enums; the test iterates the outcome set so every member is produced by a case.
- L43 — the scorer's agreement between findings and triage files is `checkTriage`'s agreement, never truth; the record
  says a matched finding is the planted defect only as advisory, and the tally binds each count to the files it read
  (per-run paths and sha256s), not to a second copy of the count.
- L62 — no value read from a run file is quoted into a refusal or an outcome: outcomes and defects are closed codes plus
  finding ids, which `grill-findings-core.mjs` `validate` has already matched to `G<round>-<n>`.
- L66 — every run writes into its own directory the kit creates empty (`runs/<probe>/r<n>/`), the kit refuses a
  non-empty `--out`, and `tally` reads only those directories; no run reads another's output, and no scoring happens
  on a file's mere presence while a session runs (the user scores after the commands exit).
- L70 — the fixture project carries no `.claude/` directory and no `CLAUDE.md` in the repository; the kit materializes
  the overlay (commands, hooks, agents, settings) only inside the scratch run directory, and the kit test asserts no
  committed probe file sits under a `.claude` segment.
- L71 — `## Files` lists concrete paths only, and the setter's printed count was compared with the bullet count at
  this plan's own check: a first draft with two `**` items set 10 paths from 12 bullets, the drop L71 records
  (observation below).
- L81 — the kit selects the overlay from the arm tree with `check-surface-bump.mjs`'s `PRODUCT_SURFACE` /
  `isProductSurface` (imported, not a hand-picked list), so a new product file reaches the run project with no edit
  here.

## Discovery (P6, read this run)

- `main` = `155d1205` (SKILLS_VERSION 7.19.0); this worktree is clean on it. `pharn/ARCHITECTURE.md` hashes to the pin
  above (`node .dev/floor/hash-doc.mjs`). The lessons index freshness gate is GREEN (`check-lessons-index.mjs`, exit 0).
- The two run files and their validators exist and are pure: `pharn/floor/grill-findings-core.mjs` `validate` (schema
  `pharn-grill-findings/1`, positional ids, `file` shaped `path:line`) and `pharn/floor/grill-triage-core.mjs`
  `checkTriage(text, findingsDoc, sha256)` (index-aligned dispositions in `proceed | replan | spec`). The scorer imports
  both (`.dev` → `pharn` only, the allowed direction).
- `/pharn-grill` needs `pharn/features/<name>/{SPEC.md,PLAN.md}` with an Approved, pinned SPEC and the PLAN carrying its
  hash (`check-plan-spec-agree.mjs`), and `applied_lessons` (`none` short-circuits a project with no memory-bank).
  `/pharn-triage` needs `grill-findings.json` beside them. A templated SPEC's `spec_template` value is checked for shape
  and a known id only (rule 7), so a fixed probe SPEC stays valid across arms that keep the template rules.
- Precedent: `.dev/features/loop-grill-triage/GRILL-CHECK-MEASUREMENT.md` and `TRIAGE-CHECK-MEASUREMENT.md` (headless
  `claude -p "/pharn-grill <name>" --model opus --permission-mode acceptEdits` with `--allowedTools` for `node
pharn/floor/*`, the scope setter, scoped prettier and markdownlint; grill 229–284 s, USD 2.51–3.11; triage 34–49 s,
  USD 0.38–0.52; every one of five real plans escalated with 7–10 findings). `.dev/features/selective-skill-reads/EVAL.md`
  pre-registered expectations by sha256 before any run.
- Stage models today (`pharn.config.json` `models.stages`): plan opus/high, grill opus/high, triage → `default`
  sonnet/high.
- `pharn-ci` requires 100% diff coverage (`.pharn/ci.yml`); `npm test` collects `**/*.test.mjs` and `.dev/**/*.test.mjs`,
  so the fixture project's own tests are named `*.test.js` and are never collected here.
- Deferred decisions (`.dev/guides/deferred-decisions.md`): no product capability catalog and no `/pharn-eval`. This
  increment adds neither: it ships nothing, adds no `.claude/commands/` file and no fifth eval kind.

## The increment

### Probe set — `.dev/probes/defect-probes/`

- `fixture/` — the target project (ES modules, Node stdlib, `node --test test/`): `package.json`, `README.md`,
  `src/{server,auth,store,money,invoices,keys,audit}.js`, `test/*.test.js`. No `.claude/`, no `pharn/`, no
  `CLAUDE.md`.
- Two features, each with an Approved templated SPEC (`spec_template: pharn-default@sha256:…`, pinned with
  `check-spec.mjs --hash`) and a base PLAN of realistic size (target 12–18 KB, with Approach, Applied lessons `none`,
  Steps, Files, Explicitly not touched, Acceptance mapping, Risks):
  - `invoice-refunds` — partial and full refunds on paid invoices (7 criteria).
  - `api-key-rotation` — rotate an API key with a 24-hour grace period, revoke a key (6 criteria).
- `specs/<feature>/SPEC.md` holds the shared Approved SPEC of the PLAN probes; `probes/<id>/` holds each probe's own
  input (a PLAN, or a planted SPEC). The kit copies a probe's inputs into `pharn/features/<feature>/` of the run project
  under the basename the manifest names (`as`). Probe ids are neutral (`p1`…`p6`) because the run directory path is
  visible to the model, and the planted-free base plans are not committed (nothing reads them; the manifest's ranges
  and the group test below are the record of what was planted).

| id  | kind | feature            | defect class (planted)                                                                     | expected |
| --- | ---- | ------------------ | ------------------------------------------------------------------------------------------ | -------- |
| p1  | plan | `invoice-refunds`  | authorization: the handler selects the invoice by a client-supplied `orgId` (cross-tenant) | replan   |
| p2  | plan | `invoice-refunds`  | contradiction with a SPEC constraint: refund arithmetic in floating-point dollars          | replan   |
| p3  | plan | `api-key-rotation` | migration: a stored field renamed with no schema-version bump or migration                 | replan   |
| p4  | plan | `api-key-rotation` | omission: one criterion (revocation) has no step, file or test                             | replan   |
| p5  | spec | `invoice-refunds`  | two criteria contradict (over-limit refund is both rejected and capped)                    | spec     |
| p6  | spec | `api-key-rotation` | a criterion whose Then is not observable on the public surface                             | spec     |

- p1 and p2 are in-place, same-line-count substitutions of one base plan, so they share line geometry (`group`), and the
  scorer reports each run's matches against the OTHER probe's anchors as a chance-match control at no extra cost. p3 is
  a same-line-count substitution of the second base plan; p4 removes lines, so it has no group.
- `manifest.json` (`schema: pharn-defect-probes/1`): `fixture.tree_sha256` (sha256 over the sorted `<sha256>  <path>`
  lines of the fixture's files), and per probe: `id`, `kind`, `feature`, `class`, `group` (or `null`), `defect`
  (`commission | omission`), `inputs[]` (`path`, `as` ∈ `SPEC.md | PLAN.md`, `sha256`), `planted` (`file`, `start`, `end`; `null` for omission),
  `anchors[]` (`file` ∈ `SPEC.md | PLAN.md`, `start`, `end`, `slack` 0..5), `expected_disposition` (`replan | spec`).
  A commission probe's anchors include its planted range; p5's anchors add the contradicted criterion's lines.
- `README.md` — the method and the kit's use: what a probe measures, the catch rule, how to build and run a kit for an
  arm, how to score, the comparison rule ("ships only if the count does not drop"), and the bounds.

### The catch rule (deterministic; P5)

A run **catches** its probe iff the findings file passes `grill-findings-core.mjs` `validate`, the triage file passes
`grill-triage-core.mjs` `checkTriage` against those findings' bytes, and at least one finding **matches** an anchor and
carries a disposition other than `proceed`. A finding matches an anchor iff its `file` (`path:line`) has a path equal
to `pharn/features/<feature>/<anchor.file>` on whole path segments (either one may be the other's suffix: `PLAN.md`,
`pharn/features/<feature>/PLAN.md` and an absolute path ending in it all match) and a line in
`[start − slack, end + slack]`. Only the enum-gated / path-checked fields are read (`file`, `id`, `disposition`); a
finding's `problem` and `evidence` are never read (P2). Outcomes, closed: `caught`, `no-anchor-match`,
`matched-all-proceed`, `findings-missing`, `findings-invalid`, `triage-missing`, `triage-invalid`. The **catch count**
of an arm is the number of caught runs; per-probe pairs are always reported beside it. Secondary, reported, never
counted: whether a caught finding's disposition equals `expected_disposition`, and the chance matches above.

### Scorer — `.dev/floor/defect-probe-score.mjs`

- `verify --manifest <m> [--manifest-sha256 <hex>]` — the manifest's shape, and every input's and the fixture tree's
  sha256 against the files. Exit 0 all match · 1 a mismatch (named by path, never by content) · 2 usage/unreadable.
- `score --manifest <m> --probe <id> --findings <f> --triage <t> [--manifest-sha256 <hex>]` — one run. Prints one JSON
  line (outcome, matched ids, escalated matched ids, expected-disposition hit). Exit 0 caught · 1 not caught (any
  outcome but `caught`, including invalid or missing run files) · 2 usage (bad flags, manifest unreadable, malformed or
  not matching `--manifest-sha256`, unknown probe).
- `tally --manifest <m> --runs <dir> [--manifest-sha256 <hex>] [--min <n>]` — every `<dir>/<probe>/r<n>/` of the
  selected probes, reading `grill-findings.json` and `grill-triage.json` in it. Prints JSON:
  per-probe runs (outcome, matched ids, sha256 of each file read), per-probe caught/total, the total catch count, and
  the group chance matches. Exit 0 · 1 the count is below `--min` · 2 usage, or a selected probe with no run directory.
- Pure functions exported for the test (`validateManifest`, `treeSha256`, `matchesAnchor`, `scoreRun`, `tally`); the CLI
  guards `import "../../pharn/floor/runtime-floor.mjs"` first and runs on `import.meta.main`.

### Kit builder — `.dev/floor/defect-probe-kit.mjs`

- `build --arm <dir> --out <dir> [--runs <n>] [--probe <id>]… [--model <stage>=<model>]… [--effort <stage>=<level>]…
[--label <text>]` — `--arm` is a checkout of the pharn-oss commit under test (a `git worktree add --detach` or `git
archive` extraction); `--out` must not exist or be empty. It verifies the manifest and every input sha256 first (the
  scorer's `verify`), then for each probe × run creates `runs/<probe>/r<n>/project/`: a copy of the fixture, every arm
  file `isProductSurface` admits, a `pharn.config.json` holding the arm's `models` block and `skillsVersion` = the arm's
  `SKILLS_VERSION`, the probe's inputs under `pharn/features/<feature>/`, then `git init` and one commit. It writes
  `commands.txt` (one single-line shell command per run: `cd` into the project, then one `claude -p "/pharn-<stage>
<feature>"` per stage chained with `&&`, each with `--model`, `--effort`, `--permission-mode acceptEdits`, an explicit
  `--allowedTools`, `--output-format json` redirected to `runs/<probe>/r<n>/<stage>.session.json` outside the
  project; then, after the sessions exit, a `cp` of the two run files from the project into `runs/<probe>/r<n>/`, the
  layout `tally` reads), `score.txt` (the `tally` line, with the manifest's sha256 pinned) and `KIT.md` (arm, models, efforts, run
  count, cost estimate). Stages: a PLAN probe runs `grill`, `triage`; a SPEC probe runs `plan`, `grill`, `triage`.
  Defaults equal today's routing: plan opus, grill opus, triage sonnet; effort high; `--max-budget-usd 12`,
  `--strict-mcp-config`, `--setting-sources project` on every session (amendments). Exit 0 · 1 a hash mismatch or a
  non-empty `--out` · 2 usage.
- The kit never runs `claude`. The user runs `commands.txt`.

### Measurement record — `.dev/measurements/defect-probes-main-7.19.0.md`

Pre-registration first: the manifest's sha256 and the commit that holds it, written before any run; the arm (`main`
sha), models, efforts, Claude Code version. Then, after the user's runs: the per-probe pairs table, the catch count, the
secondary readings, time and cost per session (from each `*.session.json`), and the bounds. Status `pending` in the
first push. Raw outputs and the `tally` JSON go in `.dev/features/defect-probe-set/runs/` (question 5).

## Files

- `.dev/floor/defect-probe-score.mjs` — the scorer: manifest validation and hashing, per-finding match, run score,
  tally — layer: build apparatus
- `.dev/floor/defect-probe-score.test.mjs` — hermetic test over recorded-shape run outputs written in a temp dir; no
  model, no network — layer: build apparatus
- `.dev/floor/defect-probe-kit.mjs` — the kit builder — layer: build apparatus
- `.dev/floor/defect-probe-kit.test.mjs` — hermetic test: a temp arm tree and a temp manifest, the built layout,
  command lines, refusals — layer: build apparatus
- `.dev/probes/defect-probes/manifest.json` — the pinned probe list — layer: build apparatus
- `.dev/probes/defect-probes/README.md` — the method and the kit's use — layer: build apparatus
- `.dev/probes/defect-probes/specs/invoice-refunds/SPEC.md` — Approved SPEC shared by p1 and p2 — layer: build apparatus
- `.dev/probes/defect-probes/specs/api-key-rotation/SPEC.md` — Approved SPEC shared by p3 and p4 — layer: build apparatus
- `.dev/probes/defect-probes/probes/p1/PLAN.md` — PLAN probe — layer: build apparatus
- `.dev/probes/defect-probes/probes/p2/PLAN.md` — PLAN probe — layer: build apparatus
- `.dev/probes/defect-probes/probes/p3/PLAN.md` — PLAN probe — layer: build apparatus
- `.dev/probes/defect-probes/probes/p4/PLAN.md` — PLAN probe — layer: build apparatus
- `.dev/probes/defect-probes/probes/p5/SPEC.md` — SPEC probe — layer: build apparatus
- `.dev/probes/defect-probes/probes/p6/SPEC.md` — SPEC probe — layer: build apparatus
- `.dev/probes/defect-probes/fixture/package.json` — fixture project — layer: build apparatus
- `.dev/probes/defect-probes/fixture/README.md` — fixture project — layer: build apparatus
- `.dev/probes/defect-probes/fixture/src/server.js` — fixture project — layer: build apparatus
- `.dev/probes/defect-probes/fixture/src/auth.js` — fixture project — layer: build apparatus
- `.dev/probes/defect-probes/fixture/src/store.js` — fixture project — layer: build apparatus
- `.dev/probes/defect-probes/fixture/src/money.js` — fixture project — layer: build apparatus
- `.dev/probes/defect-probes/fixture/src/invoices.js` — fixture project — layer: build apparatus
- `.dev/probes/defect-probes/fixture/src/keys.js` — fixture project — layer: build apparatus
- `.dev/probes/defect-probes/fixture/src/audit.js` — fixture project — layer: build apparatus
- `.dev/probes/defect-probes/fixture/test/helpers.js` — fixture project — layer: build apparatus
- `.dev/probes/defect-probes/fixture/test/money.test.js` — fixture project — layer: build apparatus
- `.dev/probes/defect-probes/fixture/test/store.test.js` — fixture project — layer: build apparatus
- `.dev/probes/defect-probes/fixture/test/auth.test.js` — fixture project — layer: build apparatus
- `.dev/probes/defect-probes/fixture/test/invoices.test.js` — fixture project — layer: build apparatus
- `.dev/measurements/defect-probes-main-7.19.0.md` — the record (pending until the runs) — layer: build apparatus
- `.dev/guides/floor-checks.md` — one `##` section for the two new CLIs (the guidance index points a reader there before
  running one) — layer: build apparatus
- `.prettierignore` — exclude the probe set and the raw outputs (hashed bytes) — layer: repo-meta
- `.markdownlint-cli2.jsonc` — the same two exclusions — layer: repo-meta
- `eslint.config.mjs` — the same two exclusions — layer: repo-meta
- `CHANGELOG.md` — one `[Unreleased]` entry, dated — layer: repo-meta
- `.dev/features/defect-probe-set/runs/p1/r1/grill-findings.json` — raw run output, main arm — layer: build apparatus
- `.dev/features/defect-probe-set/runs/p1/r1/grill-triage.json` — raw run output, main arm — layer: build apparatus
- `.dev/features/defect-probe-set/runs/p1/r2/grill-findings.json` — raw run output, main arm — layer: build apparatus
- `.dev/features/defect-probe-set/runs/p1/r2/grill-triage.json` — raw run output, main arm — layer: build apparatus
- `.dev/features/defect-probe-set/runs/p2/r1/grill-findings.json` — raw run output, main arm — layer: build apparatus
- `.dev/features/defect-probe-set/runs/p2/r1/grill-triage.json` — raw run output, main arm — layer: build apparatus
- `.dev/features/defect-probe-set/runs/p2/r2/grill-findings.json` — raw run output, main arm — layer: build apparatus
- `.dev/features/defect-probe-set/runs/p2/r2/grill-triage.json` — raw run output, main arm — layer: build apparatus
- `.dev/features/defect-probe-set/runs/p3/r1/grill-findings.json` — raw run output, main arm — layer: build apparatus
- `.dev/features/defect-probe-set/runs/p3/r1/grill-triage.json` — raw run output, main arm — layer: build apparatus
- `.dev/features/defect-probe-set/runs/p3/r2/grill-findings.json` — raw run output, main arm — layer: build apparatus
- `.dev/features/defect-probe-set/runs/p3/r2/grill-triage.json` — raw run output, main arm — layer: build apparatus
- `.dev/features/defect-probe-set/runs/p4/r1/grill-findings.json` — raw run output, main arm — layer: build apparatus
- `.dev/features/defect-probe-set/runs/p4/r1/grill-triage.json` — raw run output, main arm — layer: build apparatus
- `.dev/features/defect-probe-set/runs/p4/r2/grill-findings.json` — raw run output, main arm — layer: build apparatus
- `.dev/features/defect-probe-set/runs/p4/r2/grill-triage.json` — raw run output, main arm — layer: build apparatus
- `.dev/features/defect-probe-set/runs/p5/r1/plan.session.json` — the plan stage's result, redacted to `type`, `subtype`, `is_error`, `result` — layer: build apparatus
- `.dev/features/defect-probe-set/runs/p5/r2/plan.session.json` — the plan stage's result, redacted to `type`, `subtype`, `is_error`, `result` — layer: build apparatus
- `.dev/features/defect-probe-set/runs/p6/r1/grill-findings.json` — raw run output, main arm — layer: build apparatus
- `.dev/features/defect-probe-set/runs/p6/r1/grill-triage.json` — raw run output, main arm — layer: build apparatus
- `.dev/features/defect-probe-set/runs/p6/r1/PLAN.md` — raw run output, main arm — layer: build apparatus
- `.dev/features/defect-probe-set/runs/p6/r1/plan.session.json` — the plan stage's result, redacted as above — layer: build apparatus
- `.dev/features/defect-probe-set/runs/p6/r2/grill-findings.json` — raw run output, main arm — layer: build apparatus
- `.dev/features/defect-probe-set/runs/p6/r2/grill-triage.json` — raw run output, main arm — layer: build apparatus
- `.dev/features/defect-probe-set/runs/p6/r2/PLAN.md` — raw run output, main arm — layer: build apparatus
- `.dev/features/defect-probe-set/runs/p6/r2/plan.session.json` — the plan stage's result, redacted as above — layer: build apparatus
- `.dev/features/defect-probe-set/runs/tally.json` — `defect-probe-score.mjs tally` over the committed run files, verbatim — layer: build apparatus

### Explicitly not touched

- `pharn/**`, `.claude/**`, `SKILLS_VERSION`, `MIN_CLI` — apparatus only; nothing ships.
- `pharn/pharn-contracts/eval-format.md` — no fifth `structural` kind; the probe set is not an eval.
- `.claude/commands/pharn-eval.md`, any capability catalog — deferred decisions, unchanged.

## Contracts satisfied

- `pharn/pharn-contracts/finding-shape.md` "Emission — grill-findings.json" and `pharn/pharn-contracts/grill-triage.md`
  — read through their own validators (imported), never re-parsed (P4).
- `pharn/pharn-contracts/spec-template.md` — the probe SPECs are templated and pinned; checked with `check-spec.mjs`
  (`check-spec-approved.mjs` GREEN, `check-plan-spec-agree.mjs` GREEN for every PLAN probe) at build.

## Tests (no Capability is added, so P1's eval rule does not apply; the CLIs carry tests)

- scorer: every member of `OUTCOMES` produced by a case; caught with a matching escalated finding; `no-anchor-match`
  with findings elsewhere and with zero findings; `matched-all-proceed`; missing and invalid findings; missing triage;
  a triage over other findings bytes (`triage-invalid`); path suffix rules both ways and a non-segment suffix refused
  (`XPLAN.md`); slack boundary lines in and just out; omission anchors; manifest refusals (unknown key, bad enum, empty
  probes, empty anchors, commission without planted range in its anchors, duplicate id, bad sha shape); hash mismatch
  in `verify`; `--manifest-sha256` mismatch → 2; `tally` layout, totals, chance matches, `--min` 0/1, missing run dir
  → 2; a `problem` holding an instruction-looking needle and an anchor path changes nothing (P2); CLI exits through
  subprocess.
- kit: the built layout for a temp arm; only `isProductSurface` paths copied (a `*.test.mjs` and a `pharn-dev-*`
  command in the temp arm are not); `pharn.config.json` content; one command line per run with the requested models
  and efforts per stage; separate output paths per run; non-empty `--out` → 1; tampered input → 1; usage → 2; no
  committed probe file under a `.claude` segment and no fixture test named `*.test.mjs`/`*.test.cjs`.
- the committed set: `verify` over the real manifest exits 0 (so CI pins every sha256); every SPEC passes
  `check-spec-approved.mjs` and every PLAN probe passes `check-plan-spec-agree.mjs` against its SPEC and
  `check-plan-lessons.mjs`; the two PLANs of each group have equal line counts and differ only inside their planted
  ranges (the chance-match geometry claim, checked rather than asserted).

### Observation for the orchestrator (not in this increment)

`set-writes-scope.cjs --check --from-plan` exited 0 on a first draft of this plan whose `## Files` held two `**` glob
items, and the scope it wrote omitted both silently (10 paths from 12 items). That is the shape lesson L71 records. The
plan now lists concrete paths only. A follow-up that refuses or reports a dropped glob item is the orchestrator's
call.

## Guarantee audit (P0)

- "the scorer's verdict is a function of the manifest and the two run files" → floor: enum-regex (validators, set
  membership, integer line compare). Its being run on the right files is advisory orchestration.
- "the matched-id count" → floor (enum-regex over `file` and `disposition`). **"a matched finding is the planted
  defect" → advisory**: a finding can cite the planted line for another reason; the chance-match control bounds this
  for p1/p2 only.
- "expectations were fixed before any run" → floor: content-hash (the manifest's sha256 and each input's sha256,
  verified by `verify` and pinned in the kit's score line), plus git history placing the manifest's commit before the
  runs (evidence, not a floor operation).
- "the probes are realistic" → advisory (authored; sizes recorded).
- "2 runs per probe" → advisory (the user runs the commands); the tally reports how many run directories it scored.
- "a change ships only if the count does not drop" → advisory: a comparison rule a human applies; `--min` makes the
  integer compare deterministic, nothing enforces that anyone runs it.
- "no file under `pharn/` or `.claude/commands/`" → floor at the PR: `check:surface-bump` / `check:ship-record` see no
  product path; the write hooks deny every path outside this plan's `## Files` during the build.

## Trust audit (P2)

- Run outputs (`grill-findings.json`, `grill-triage.json`) are another model's output: untrusted. The scorer reads only
  `file`, `id`, `severity`/`disposition` enums through the contract validators; free text is never read, never quoted
  into output, and never steers a branch. The tally prints codes, ids, paths it constructed itself and sha256s.
- The committed raw outputs are DATA; the record quotes no free text from them.
- The kit writes run directories outside the repository; nothing a run writes is read back by any repository gate.

## Determinism audit (P5)

Every branch is a membership or integer test: path-suffix equality, `start − slack ≤ line ≤ end + slack`, disposition
∈ `{replan, spec}`, outcome ∈ `OUTCOMES`, exit-code maps. Nothing classifies a finding by its text. The terminal
fallback for anything the scorer cannot decide (a malformed manifest, a missing run directory) is exit 2 and a human.

## Live measurement (owed to AC 4 and AC 5)

After the build is green and the PR is open with the record `pending`: build a kit for `main` (`155d1205`) under
`$SCRATCH/core-90/kit/` with `--runs 2`, report `commands.txt` and the estimate, and wait. When the user's runs are in:
`tally`, commit the raw outputs, the tally JSON and the filled record, push, and drive CI green.
