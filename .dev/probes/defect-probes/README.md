# Defect probe set

A fixed set of probes, each a PLAN or a SPEC with one planted defect, and a deterministic scorer that counts how many
the pipeline catches. It is the quality measure for changes that alter what the grill, the triage, the plan writer or
their reads see: **a change ships only if the catch count on this set does not drop.** That rule is advisory: a
person applies it to two tallies. `tally --min <n>` makes the integer comparison deterministic; nothing makes anyone run
it.

Build apparatus only. Nothing here ships, nothing here is an eval in the sense of
`pharn/pharn-contracts/eval-format.md`, and nothing here adds a product command.

## What is here

| path                       | what                                                                                    |
| -------------------------- | --------------------------------------------------------------------------------------- |
| `manifest.json`            | the probes: inputs and their sha256, planted range, anchors, expected disposition       |
| `fixture/`                 | the target project the plans talk about: a zero-dependency Node invoicing service       |
| `specs/<feature>/SPEC.md`  | the Approved SPEC two PLAN probes share                                                 |
| `probes/p<n>/`             | each probe's own input: a PLAN with a planted defect, or a SPEC with one                |
| `../../floor/defect-probe-score.mjs` | the scorer (`verify`, `score`, `tally`)                                       |
| `../../floor/defect-probe-kit.mjs`   | the kit builder: one fresh project and one `claude -p` command line per run   |

The CLI reference for both is `.dev/guides/floor-checks.md`, section `defect-probe-score.mjs` /
`defect-probe-kit.mjs`.

| id  | kind | feature            | planted defect                                                                    | expected |
| --- | ---- | ------------------ | --------------------------------------------------------------------------------- | -------- |
| p1  | plan | `invoice-refunds`  | the refund handler selects the invoice by a client-supplied `orgId`               | replan   |
| p2  | plan | `invoice-refunds`  | refund arithmetic in floating-point dollars, against the integer-cents constraint | replan   |
| p3  | plan | `api-key-rotation` | a stored field renamed with no schema-version bump or migration                   | replan   |
| p4  | plan | `api-key-rotation` | omission: the revocation criterion (AC-4) has no step, route, test or mapping     | replan   |
| p5  | spec | `invoice-refunds`  | an added criterion (AC-8) contradicts AC-2                                        | spec     |
| p6  | spec | `api-key-rotation` | an added criterion (AC-7) whose Then is not observable on the public surface      | spec     |

A PLAN probe runs `/pharn-grill` then `/pharn-triage` on a fixed SPEC and PLAN. A SPEC probe runs `/pharn-plan`, then
`/pharn-grill` and `/pharn-triage` on the plan that run wrote. So PLAN probes measure the grill, the triage and what
they read; SPEC probes also measure the plan writer. **A fixed SPEC cannot measure the spec writer's own output**: a
spec-writer change is measured here only where it changes what a later stage reads from a SPEC.

## The catch rule

A run **catches** its probe when all three hold:

1. its `grill-findings.json` passes `pharn/floor/grill-findings-core.mjs` `validate`;
2. its `grill-triage.json` passes `pharn/floor/grill-triage-core.mjs` `checkTriage` against those findings' bytes;
3. at least one finding **matches** an anchor and is triaged anything but `proceed`.

A finding matches when its `file` (`path:line`) names `pharn/features/<feature>/<SPEC.md|PLAN.md>` (equal, or a suffix
of it on whole path segments either way round) and:

- for a **line anchor**, the line is in `[start − slack, end + slack]`;
- for a **plan token** (SPEC probes only), the file is the run's own `PLAN.md` and that line holds the token (an
  acceptance-criterion id such as `AC-8`) as a whole word. The product grill is told to cite `PLAN.md:<line>` in every
  finding, so a SPEC defect is usually cited where the generated plan carries the criterion. This is the one place the
  scorer reads a third file: the run's `PLAN.md`, scanned for fixed tokens only.

Only `file`, `id` and `disposition` (and `severity`, inside `checkTriage`) are read. A finding's `problem` and
`evidence` are never read, so instruction-looking text in them cannot move a score.

The **catch count** of an arm is the number of caught runs, always reported with the per-probe pairs, because one grill
varies from run to run. Reported, never counted: whether a caught finding's disposition equals the expected one, and
the **chance matches** — each run of p1 scored against p2's anchors and the other way round. p1 and p2 are the same plan
with one in-place substitution each (equal line counts; a test checks it), so a finding on the other probe's planted
lines is a finding there for some other reason.

### The anchor rules, per defect kind

- **Commission** (p1, p2, p3, p5, p6): the planted range is an anchor. PLAN anchors have slack 0, because the grill is
  told to cite the first line of a range, and p1's and p2's ranges are adjacent steps. SPEC anchors have slack 1. p5
  also anchors the criterion it contradicts (AC-2), and its plan tokens are `AC-2` and `AC-8`; p6's token is `AC-7`.
- **Omission** (p4): nothing is planted, so there is no line to point at. A finding matches when it cites the omitted
  criterion's lines in `SPEC.md` (slack 1) or the `## Acceptance mapping` heading of `PLAN.md` (slack 0). The stated
  miss: the extracted grillers tell a grill to cite the plan's first line for a whole-plan absence, and that line is not
  an anchor, because every other whole-plan absence (error handling, observability) is cited there too.

## Pre-registration

The manifest pins every input's sha256 and the fixture's tree digest (sha256 over the sorted `<sha256>  <path>` lines of
its files). The manifest's own sha256 is recorded in the measurement record before any run and pinned in every kit's
`score.txt` (`--manifest-sha256`), so a manifest changed after the runs is refused (exit 2). `verify` re-hashes the set;
`npm test` runs it on every push (`.dev/floor/defect-probe-score.test.mjs`).

**A changed probe is a new probe set.** Editing any input, the fixture or the manifest changes the manifest's sha256, and
counts across two manifests are not comparable. Add a probe by adding an entry and recording a new baseline.

## Running an arm

An **arm** is a pharn-oss commit whose product surface is under test.

```sh
git worktree add --detach "$SCRATCH/arm-main" origin/main        # or: git archive <ref> | tar -x -C <dir>
node .dev/floor/defect-probe-kit.mjs build --arm "$SCRATCH/arm-main" --out "$SCRATCH/kit-main" --runs 2
# then run each line of $SCRATCH/kit-main/commands.txt, one at a time, and finally the line in score.txt
```

`build` verifies every sha256 first, then creates `runs/<probe>/r<n>/project/` per run: a copy of `fixture/`, every arm
file `check-surface-bump.mjs`'s `PRODUCT_SURFACE` admits (commands, hooks, agents, settings, floor, contracts,
grillers, lenses, the four trusted docs), a `pharn.config.json` with the arm's `models` block and `skillsVersion`, the
probe's inputs under `pharn/features/<feature>/`, and one git commit. `--out` must be absent or empty, and every run has
its own directory, so no run can read another's output.

Each line of `commands.txt` is one run: `cd` into its project, one `claude -p "/pharn-<stage> <feature>"` per stage
chained with `&&`, then a `cp` of the run files (`grill-findings.json`, `grill-triage.json`, and the run's `PLAN.md` for
a SPEC probe) into `runs/<probe>/r<n>/`, where `tally` reads them. Every session gets:

| flag                                                    | why                                                                   |
| ------------------------------------------------------- | --------------------------------------------------------------------- |
| `--model <m>` / `--effort <e>`                          | per stage; defaults plan opus, grill opus, triage sonnet, all `high`  |
| `--permission-mode acceptEdits` and `--allowedTools`    | Read, Glob, Grep, Write, Edit, MultiEdit, the floor CLIs, the scope setter, scoped prettier and markdownlint |
| `--strict-mcp-config`                                   | no MCP servers, so later arms run with the same tool set              |
| `--setting-sources project`                             | the project's own settings (which wire PHARN's hooks), no user or local settings |
| `--max-budget-usd <n>`                                  | a per-session runaway bound (default 12; a measured grill cost USD 2.51–3.11) |
| `--output-format json > <stage>.session.json`           | each session's time and cost, outside the project                     |

All of these were checked against `claude --help` of Claude Code 2.1.323; none was dropped. Per-stage tuning:
`--model grill=sonnet`, `--effort plan=max`, and so on, any number of times; `--probe p3` limits the kit to listed
probes.

Score with the line in `score.txt`, which is

```sh
node .dev/floor/defect-probe-score.mjs tally --manifest <manifest> --manifest-sha256 <pinned> --runs <kit>/runs > <kit>/tally.json
```

## Comparing two arms

Use the same manifest, the same runs per probe, and the same Claude Code version where possible. Report both tallies'
per-probe pairs side by side. A drop in the count is a regression to explain before shipping; an equal or higher count
with two runs per probe says "no visible regression" at most, never "no regression".

## Bounds (P0)

- **Floor:** the manifest's shape and every sha256; the match (path equality on segments, an integer interval, a
  whole-word token test); the outcome; the count; `--min`.
- **Advisory:** that a matched finding is the planted defect (a finding can cite the line for another reason; the
  chance matches bound this for p1 and p2 only); that the probes are realistic (authored; plans of 6–8 KB, below the
  15–30 KB of real plans); that the runs ran as the kit wrote them; anything a count of two runs per probe implies
  beyond those runs.
- **Not covered:** PLAN probes carry no `AC-TESTS.md` (the grill does not read it); defects a grill can only see from
  code that does not exist yet; the spec writer's own output; any project other than the fixture.
