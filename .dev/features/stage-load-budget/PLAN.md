# PLAN — stage-load-budget

- spec_content_hash: 75088a82d113bc52cdd3d5fb2e44533e81cba5f520877f5eaa441ced45fb0fd6
- applied_lessons: [L1, L29, L34, L35, L36, L45, L60, L67]
- increment: Put a CI-run byte ceiling on each product stage's LOAD SET — the command family plus every PHARN-shipped
  file its text tells the model to read or follow in full, the grillers/lenses it applies, and the stages its
  orchestrator runs inline — and run the existing instruction-growth gate over this repository's own `CLAUDE.md` on
  every pull request. Fixes review finding CTX-2 (2026-10-12) for the part that is not already budgeted.
- layer(s): build apparatus only — a `.dev/floor/` test, `.dev/guides/`, CI (`.github/workflows/ci.yml`),
  `package.json`, `CONTRIBUTING.md`, `CHANGELOG.md`. No product-surface byte changes → **no `SKILLS_VERSION` bump**.
- constitution_refs: [P0, P4, P5, P6, P7]

## Trigger (P7) — the observed failure, and what is already covered

The 2026-10-12 independent review (`ctx-report.md`, finding CTX-2, High) measured PHARN's own instruction load at
HEAD `fa983a8` and found no budget on it: "a command file can grow without any RED", the instruction-growth gate
"counts CLAUDE.md / AGENTS.md / `.claude/rules` only" and "runs only inside `/pharn-verify`, never in
`npm run check` or CI". Re-measured this run (P6), the finding is **half right**:

- **Already covered — not re-done here.** Per-FILE ceilings exist: `COMMAND_BYTE_CEILINGS` and the `✧ BUDGET R1–R5`
  tests in `.dev/floor/command-hygiene.test.mjs` (lines ~4700–4890), closed over the 15 product command files on disk
  **including the four part files** (`pharn-loop-close.md`, `pharn-loop-quick.md`, `pharn-ship-close.md`,
  `pharn-ship-quick.md`), run by `npm test` in CI. A single command file therefore cannot grow past its ceiling
  without a red test.
- **Gap (a), measured: no budget on what a stage LOADS beyond its own file.** Every stage also reads files its
  text names — `pharn/CONSTITUTION.md` (7,958 B) in every prefix, `pharn/ARCHITECTURE.md` (23,683 B, read whole by
  the Read tool though the text asks for one section) in five, `finding-shape.md`, `installed-skill-selection.md`,
  `seam-resolver.md`, the default SPEC template, `loop-record.md` — plus the capabilities it applies (full
  `/pharn-grill` applies all 13 registered grillers, 188,978 B; `/pharn-review` hands each of 22 lenses to a
  subagent) and, for an orchestrator, the stages it runs inline (`/pharn-ship` runs `/pharn-spec` through the Skill
  tool — `ROUTE_POLICY` cell `interactive`). None of those bytes has a ceiling: a griller, a lens, a contract or a
  trusted doc can grow, and a new "Read `X`" line can be added, with every gate green.
- **Gap (b): `pharn-dev-*` commands are outside every ceiling.** Already a named follow-up (`dev-command-slim`,
  `.dev/guides/product-commands.md`); they are contributor apparatus, never installed. **Out of scope here** (P7).
- **Gap (c), measured: this repository's own always-loaded set is ungated.** `node pharn/floor/check-instruction-files.mjs --growth --base-rule`
  runs in 0.24 s here and reports `within` (set = `CLAUDE.md` 29,168 B; `AGENTS.md` is git-ignored, not counted), but
  neither `npm run check` nor `ci.yml` runs it, and `.dev/guides/floor-gates.md` states "This repo's dev loop never
  runs it." `CLAUDE.md` went 189,120 → 28,403 B at 6.46.1 (`claude-md-bootstrap`); since then the four PRs that
  touched it added 46, 244, 251 and 224 B. Before it, single PRs added 2–11 KB. Nothing stops that drift returning.

### Measured load sets at `fa983a8` (bytes, `\r\n` folded to `\n`; the classification rule is under "Design")

| stage                                     | files | command family | beyond the family | total   | ceiling (+10%, ↑512) |
| ----------------------------------------- | ----- | -------------- | ----------------- | ------- | -------------------- |
| `pharn-spec`                              | 4     | 26,368         | 36,976            | 63,344  | 70,144               |
| `pharn-plan`                              | 3     | 23,924         | 31,641            | 55,565  | 61,440               |
| `pharn-grill`                             | 18    | 23,012         | 235,983           | 258,995 | 285,184              |
| `pharn-test`                              | 2     | 20,088         | 7,958             | 28,046  | 31,232               |
| `pharn-build`                             | 5     | 24,560         | 46,109            | 70,669  | 77,824               |
| `pharn-regress`                           | 2     | 22,780         | 7,958             | 30,738  | 34,304               |
| `pharn-verify`                            | 2     | 18,982         | 7,958             | 26,940  | 29,696               |
| `pharn-review`                            | 25    | 23,220         | 318,104           | 341,324 | 375,808              |
| `pharn-memory-promote`                    | 3     | 25,284         | 31,641            | 56,925  | 62,976               |
| `pharn-ship` (incl. inline `/pharn-spec`) | 7     | 110,742        | 36,976            | 147,718 | 162,816              |
| `pharn-loop`                              | 5     | 92,888         | 31,108            | 123,996 | 136,704              |

The build re-measures every row at the build's HEAD and writes the ceilings from that measurement (the numbers
above are this plan's measurement, not a pin).

## Applied lessons

- L1 — meta-doc sweep: the increment changes the fact "this repo's dev loop never runs it" in
  `.dev/guides/floor-gates.md`, adds a gate a contributor meets (`CONTRIBUTING.md`, `.dev/guides/product-commands.md`)
  and needs a `CHANGELOG.md` entry; all four are in `## Files`. `CLAUDE.md`'s "One CHANGELOG gate is deliberately
  outside the chain" stays true (the new script is not a CHANGELOG gate), so `CLAUDE.md` is deliberately NOT edited —
  it is the file the new CI step measures.
- L29 — the remedy is quantified over a set ("every product stage"), so the set is enumerated ONCE and every rule
  iterates it: the stages are the product command files on disk that are not parts (discovered with
  `command-family.mjs`'s `allParts`, never a list typed here), and the closure rule holds the table to that set.
- L34 — no rule may pass over an empty domain: the stage set must be non-empty, every stage's load set must contain
  its own command file, and each membership source (`count-grillers.mjs`, `count-lenses.mjs`) must return at least
  one member, else red.
- L35 — one fact, one copy: the inline-stage relation is READ from `pharn/floor/stage-agent-core.mjs` `ROUTE_POLICY`
  (cell `interactive`), the griller/lens membership from the shipped counters, and a command's parts from their
  `part_of:` frontmatter; the table restates none of them. The one rule copied by intent is the ceiling formula
  (+10%, up to a multiple of 512), cited to `COMMAND_BYTE_CEILINGS`, because the two tables budget different things.
- L36 — presence is not closure: besides each table entry being present in its stage's text (cite rule), a
  closure rule scans every family for a read-verb + backticked PHARN `.md` path and requires each match to be in
  that stage's load set, so a new "Read `pharn/…`" line cannot add bytes outside the table.
- L45 — the CI step and the npm script are wiring: the test pins both committed strings AND executes the committed
  CI command line (its flags verbatim, the script path made absolute) in a two-commit fixture repository, once under
  the budget (exit 0) and once over it (exit 1, the negative control).
- L60 — one negative control per asserted property: a missing key and an extra key (closure), a missing file and an
  empty membership (existence), a cite removed from the text (anchor), a total padded one byte over its ceiling
  (budget), a "Read `pharn/…`" line added and the same line wrapped across a line break (read closure), and a policy
  cell flipped from `interactive` to `agent` (inline derivation).
- L67 — the CI step runs a checker that models an external loader; the CHANGELOG entry and the guide repeat by
  citation (not restatement) that its verdict is over `instruction-files-core.mjs`'s model, with that header's
  known-so-far under-count routes, never over the harness's real set.

## Design

**What counts in a stage's load set (the classification rule).** For each product stage `S`:

1. `S`'s command family: its file plus every part whose frontmatter names it (`part_of:`), all modes included —
   the worst case (`--quick` reads the quick part, every run reaches the close part).
2. Every PHARN-shipped file a step of the family tells the model to **read, load or follow** (a PHARN-shipped file
   is one under `pharn/` outside `pharn/features/`, or under `.claude/commands/`). The table lists each with the
   string that anchors it in the text. Current entries: `pharn/CONSTITUTION.md` (all eleven), `pharn/ARCHITECTURE.md`
   (spec, plan, grill, build, memory-promote — counted whole: the Read tool reads files, not sections, CTX-10),
   `pharn/pharn-contracts/templates/spec-template.md` (spec, "Read that file" after `--template-path`),
   `pharn/pharn-contracts/finding-shape.md` (grill Step 1.3),
   `pharn/pharn-core/installed-skill-selection/installed-skill-selection.md` (grill, build, review — `select`
   mode), `pharn/pharn-core/seam-resolver/seam-resolver.md` (build Step 2.2, "follow"),
   `pharn/pharn-contracts/loop-record.md` (loop close part, "Read the contract").
3. The capabilities `S` applies, by the same membership the command runs: grill → `count-grillers.mjs`, review →
   `count-lenses.mjs`. Every registered member counts (worst case: an install may select fewer).
4. For an orchestrator, the load set of every stage its `ROUTE_POLICY` row marks `interactive` in any mode
   (`/pharn-ship` → `/pharn-spec`). `agent` stages run in their own context and are budgeted under their own key;
   `floor-only` and `skipped` stages load no command body.

Each path counts once per stage (a set). NOT counted, and stated as bounds: a file merely **cited** (a contract named
as an owner of bounds or as a shape — e.g. `ac-tests.md` in `/pharn-plan`); frontmatter `reads:` (a declaration,
CTX-11); the project's own files (SPEC, PLAN, canon, code, `CLAUDE.md`, installed `SKILL.md`s); repetition across
contexts (the Constitution in each of ≤22 lens subagents, a part re-read after compaction); and an `agent` stage that
falls back inline (bounded by the sum of that stage's own ceiling).

**The test — new file `.dev/floor/stage-load-budget.test.mjs`** (apparatus; same shape as `COMMAND_BYTE_CEILINGS`):
`STAGE_LOADS` (stage → its extra entries: a path, or `{ members: <counter CLI>, key }`) and `STAGE_LOAD_CEILINGS`
(stage → bytes), then:

- **L1 closure** — the stages on disk equal both tables' keys (non-empty; no stage without a row, no row without a
  stage).
- **L2 existence** — every listed path is a regular file; every membership source exits 0 with ≥ 1 member.
- **L3 anchor** — every listed path appears in its stage's family text (frontmatter excluded, whitespace folded);
  a membership entry's counter file name appears there. The failure message names the table (`STAGE_LOADS` in
  `.dev/floor/stage-load-budget.test.mjs`), the stage key and the entry to edit or delete.
- **L4 budget** — each stage's total (the set above, bytes after `\r\n` → `\n`) ≤ its ceiling. The failure message
  names the stage, the total and the ceiling, and says a ceiling is raised only as a visible diff to the table.
- **L5 read closure** — every match of `READ_RE` (a read/re-read/follow/load verb, an optional `the`, then a
  backticked `pharn/…` or `.claude/commands/…` path ending `.md`, over whitespace-folded text) in a family names a
  path inside that stage's load set; `pharn/features/` paths (the project's own artifacts) are outside the rule.
  The failure message names the table, the stage key and the exact row to add — e.g.
  `add "pharn/pharn-contracts/x.md" to STAGE_LOADS["pharn-grill"] in .dev/floor/stage-load-budget.test.mjs, then
re-measure STAGE_LOAD_CEILINGS["pharn-grill"]` — so a parallel PR that adds a read line knows the remedy without
  reading the test (GATE 1 addition).
- **L6 inline derivation** — `/pharn-ship`'s set contains `pharn-spec.md` because `ROUTE_POLICY` says
  `interactive`, and the derivation reads the policy object (control: the same function over a policy with that cell
  set to `agent` leaves it out).
- **W1–W3 wiring** — `package.json` carries `check:instruction-growth` =
  `node pharn/floor/check-instruction-files.mjs --growth --base-rule`, outside `scripts.check`; `ci.yml` carries the
  step below by name, with its `if:` and both `run:` lines; the CI command line, executed in a fixture repo, exits 0
  on +100 B and 1 on +3,000 B of `CLAUDE.md`.

**The CI step** (after "CHANGELOG per-PR entry check", same `if:` shape, pull requests only — a push to `main` has
already been checked as its PR):

```yaml
- name: Instruction-growth check
  if: ${{ always() && steps.install.outcome == 'success' && github.event_name == 'pull_request' }}
  run: |
    git fetch --no-tags --depth=2 origin "$GITHUB_SHA"
    node pharn/floor/check-instruction-files.mjs --growth --base HEAD^1
```

`HEAD^1` is the PR's base by construction (GitHub's test merge commit), exactly as the per-PR CHANGELOG step argues;
the budget is read from `pharn.config.json` at that base (no `budget` key here → the 2,048 B default). Dependabot is
not exempted: it never touches `CLAUDE.md`, so it measures 0 B.

## Files

- `.dev/floor/stage-load-budget.test.mjs` — NEW: the two tables, rules L1–L6 with a negative control per property,
  and an honest-scope header (FLOOR / NOT guaranteed) — layer: build apparatus (`.dev/floor/`)
- `.dev/floor/instruction-growth-wiring.test.mjs` — NEW (GATE-2 fix pass): W1–W3 and their helpers, moved unchanged
  out of `stage-load-budget.test.mjs` so each file has one reason to change (REVIEW.md P3) — layer: build apparatus
- `.github/workflows/ci.yml` — add the "Instruction-growth check" step above, with a two-line comment — layer: CI
- `package.json` — add `"check:instruction-growth": "node pharn/floor/check-instruction-files.mjs --growth --base-rule"`
  (not added to `scripts.check`) — layer: repo-meta
- `CONTRIBUTING.md` — under "Editing product commands": one paragraph on the stage load budget (what counts, where
  the table is, the raise rule); beside the `check:changelog-entry` bullet: `check:instruction-growth`, why it is
  outside `npm run check`, and that CI runs it on pull requests — layer: repo-meta
- `.dev/guides/floor-gates.md` — the `check-instruction-files.mjs` section: replace "This repo's dev loop never runs
  it." with what now runs it (CI per PR, `npm run check:instruction-growth` locally) — layer: build apparatus
- `.dev/guides/product-commands.md` — one paragraph after the command-budget bullet: a new read instruction or a
  grown contract/griller/lens moves a stage's load-set total, held by `.dev/floor/stage-load-budget.test.mjs` —
  layer: build apparatus
- `CHANGELOG.md` — one `[Unreleased]` entry (no bump): what is now covered, what is not (below) — layer: repo-meta

## Contracts satisfied

- None changed. The CI step invokes `pharn/floor/check-instruction-files.mjs` as documented in its own header and in
  `.dev/guides/floor-gates.md` (cited, not restated — P4); the test reads `ROUTE_POLICY` from
  `pharn/floor/stage-agent-core.mjs` and part membership from `.dev/floor/command-family.mjs`.

## Evals to write (P1)

- No capability is added or changed (no `role:` file), so `validate.mjs`'s eval rule has nothing new to bind. The
  test file is the specification of the new rules; each rule carries its own negative control (L60, above).

## Guarantee audit (P0)

- "No product stage's load set exceeds its recorded ceiling" → **floor: enum/regex + byte count** (a `node --test`
  assertion in CI's Test step) **over the table's classification**. The total is deterministic; WHICH files are in
  the set is the table, written by a human-reviewed plan.
- "The table covers every product stage" → **floor: closure** (L1, both directions, non-empty).
- "A new 'Read `pharn/…`' instruction cannot add bytes outside the table" → **floor: regex** (L5), **narrowed**: only
  phrasings `READ_RE` matches. NOT caught, and stated in the test header: an indirect reference ("Read the contract",
  "Read that file", "each registered griller"), a path without backticks, a verb outside the list, a file a step
  reaches through a CLI's output. Those are held only by review.
- "The table's classification matches what a model actually reads" → **advisory**. A model may read more (a `reads:`
  target, a cited contract, a file twice) or less (an install selects fewer grillers; a step is skipped). The
  ceiling bounds the bytes PHARN's text instructs, never the bytes a run loads.
- "Contexts are budgeted" → **not claimed.** Distinct bytes per stage only; fan-out repetition, compaction re-reads,
  the harness prefix and the project's own instruction files are outside the number (CTX-3/CTX-9/CTX-14 territory).
- "A PR cannot grow this repo's `CLAUDE.md` by more than 2,048 B" → **floor verdict over a model**, inherited from
  `check-instruction-files.mjs` (`LIMITS.md §3e`): bytes added since the PR's base over `instruction-files-core.mjs`'s
  model of the loader, with its known-so-far under-count routes. **Narrowed further:** pull requests only; an admin
  merge bypasses required checks; a per-change budget does not bound growth across PRs that each stay under it
  (`--report` is the tool for the total); and the CI step runs the PR's own copy of the checker and of `ci.yml`, so
  review of `pharn/floor/**` and `.github/workflows/**` is the backstop — the same four bounds `CONTRIBUTING.md` states
  for the per-PR CHANGELOG step.
- "`npm run check:instruction-growth` checks the same thing locally" → **floor verdict**, with `--base-rule`'s base
  (dirty tree → HEAD, i.e. uncommitted growth only; else the merge-base with `origin/main`, else inconclusive exit 2).

## Trust audit (P2)

- The test reads PHARN's own trusted command files, contracts and trusted docs as DATA (byte counts, substring and
  regex membership); nothing it reads is executed or followed. The fixture repo in W3 is written by the test itself.
- The CI step reads the PR's `CLAUDE.md` (contributor input — untrusted) through `check-instruction-files.mjs`, which
  treats every path and frontmatter value as data (its header, "TRUST (P2)"). No free text from it gates anything but
  the checker's own enum verdict.

## Determinism audit (P5)

- Every branch is a membership or integer test: stage set from frontmatter, inline stages from a frozen policy
  object, members from the shipped counters' JSON, totals vs ceilings, regex matches vs a set. No LLM step.

## Risks

- **Parallel increments (CTX-1 grill, CTX-3 review, others).** A PR that adds a "Read `pharn/…`" line to a command,
  or renames a membership counter, turns L3/L5 red after this merges, until it adds or edits its table row — the
  intended visible diff, but friction the orchestrator should tell those agents about. Shrinking a load (fewer
  griller bodies read, lenses grouped into fewer subagents) never reddens: ceilings count every registered member,
  so those changes leave the totals equal or lower.
- **A human edit to `pharn/ARCHITECTURE.md` or `pharn/CONSTITUTION.md`** moves five or eleven totals at once. The
  10% headroom (≥ 2.8 KB on the smallest row) absorbs a normal edit; a large one needs a ceiling raise in the same PR.
- **10% headroom on a 259–341 KB row is 26–34 KB** — one new griller (~14.5 KB) or lens fits without a red. That is
  the `COMMAND_BYTE_CEILINGS` rule applied as is, kept at GATE 1 (answer 2).
- **CI step on a shallow checkout**: the fetch line is what makes `HEAD^1` readable; if it fails the checker exits 2
  (`base-unresolved`) and the step is red, never silently green.

## Open questions — resolved at GATE 1

GATE 1 (2026-10-13): **approved as planned** — delegated: decided by the orchestrating model under the maintainer's
2026-10-13 delegation (not a human approval). Answers:

1. **Keep the read-closure rule (L5)?** **Keep.**
2. **Headroom rule.** **+10%, rounded up to 512** — the `COMMAND_BYTE_CEILINGS` rule.
3. **CI instruction-growth step.** **Yes:** pull requests only, with the default 2,048 B budget read from the base.
4. **`SKILLS_VERSION`.** **No bump**; one `[Unreleased]` entry.

Addition at GATE 1: the L3 and L5 failure messages name the table and the exact row to add or edit (written into the
L3/L5 bullets above).

## GATE 2 — fix pass (delegated decision by the orchestrating model under the maintainer's 2026-10-13 delegation)

Decision: **fix, then the merge path.** One fix-loop pass (build re-anchored → regress → verify), over three items from
`REVIEW.md`:

1. **P3 split:** W1–W3, `ciStepBlock` and the `GROWTH_*` / `CI_*` constants move unchanged into
   `.dev/floor/instruction-growth-wiring.test.mjs` (added to `## Files` above before the re-anchor). The
   `.dev/guides/floor-gates.md` cite and the test headers point at the new file.
2. **P0 wording (CHANGELOG):** name exactly which rules print the row to add or the ceiling to raise (L1, L3, L4, L5),
   rather than "every failure".
3. **P0 wording (CONTRIBUTING):** list all four per-PR CI bounds the per-PR CHANGELOG check states.

Not fixed, recorded as a known residual: the P1 minor (the "each path counts once" control exercises `Set`, not
`loadSet`; a regression would only over-count, the safe direction), stated in the test header's NOT-guaranteed list.
Lesson candidate: declined for promotion (L22 recurring; parallel PRs would collide on the next L-number). Follow-up:
shipped runners for dev regress/verify in isolated worktrees.
