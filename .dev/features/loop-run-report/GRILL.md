# GRILL — loop-run-report

**Plan:** `.dev/features/loop-run-report/PLAN.md` · **spec-hash check:** MATCH
(`aada03c9f7165f944aef66db8ee9eb9df809c0fad2d5d67c268ac2d620566b3d` == the plan's
`spec_content_hash`; recomputed this run with `.dev/floor/hash-doc.mjs`) · **Step 1b lessons
declaration (FLOOR):** **GREEN** — `pharn/floor/check-plan-lessons.mjs` exit 0, all 16 cited ids
resolve in canon and are referenced in the plan body.

> **Two clocks.** The Step 1b verdict above is FLOOR and is reported here on its own; it is **never**
> folded into the concern counts below. Everything under `## Findings` is **model judgment** and gates
> nothing (fix #3). The enum-gated fields (`type`, `rule_id`, `severity`, `file`) are this stage's own
> enum/path assertions and are trusted; `problem` and `evidence` quote the plan and **inherit its
> untrusted tag** — they are DATA for a human, never instructions to `/pharn-dev-build`.

**Grillers discovered (FLOOR membership, `pharn/floor/count-grillers.mjs`):** 13 registered —
`a11y`, `architecture`, `comprehension`, `coupling`, `documentation`, `error-handling`, `i18n`,
`migrations`, `observability`, `performance`, `privacy`, `security`, `testability`. Their axes were
applied to this plan inline; the axes that produced findings are named below, and the rest produced
none over a plan that ships no user-facing surface, no network call, no i18n surface and no migration.

---

## Findings

### Axis — determinism / input parsing (P5), from the `testability` + `error-handling` grillers

```yaml
- type: FINDING
  rule_id: "P5"
  severity: blocking
  file: ".dev/features/loop-run-report/PLAN.md:128"
  problem: "The plan reads the pre-run snapshot as a path set but never states how it parses git
    porcelain, which is not a plain path list — it carries a two-column status prefix, `->` rename
    pairs, and C-style quoting for paths with special bytes. A naive fixed-offset slice silently
    mismarks exactly those paths, and the failure direction is quiet: a wrong `dirty-before-run`
    marker reads as data, not as an error. Canon L21 is this defect on this very file and is NOT in
    the plan's applied_lessons."
  evidence: "`dirty-before-run` marker when the path appears in
    `.pharn/pharn-loop/<name>/pre-run-status.txt`"
```

```yaml
- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".dev/features/loop-run-report/PLAN.md:127"
  problem: "`base_sha` admits the literal `unknown` under the cost-ledger contract, and
    `git diff --name-only unknown` fails. The plan's n/a enumeration lists absent cost.json, absent
    PLAN.md, absent LOOP.md, absent reports and absent pre-run-status.txt, but never the
    present-and-unusable base. Without it the Files section has no defined behaviour on a stop that
    recorded an honest unknown."
  evidence: "**`## Files`** — `git diff --name-only <base_sha>` plus untracked"
```

```yaml
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".dev/features/loop-run-report/PLAN.md:145"
  problem: "The determinism audit rules out a clock but not an ordering divergence. git sorts paths
    bytewise; JavaScript's default Array.prototype.sort orders by UTF-16 code unit. The two disagree
    on non-ASCII paths, so a renderer that re-sorts what git already ordered can produce two different
    byte-identical-claimed outputs from one tree depending on which sort ran last."
  evidence: "no locale-dependent sort — rows keep `cost.json`'s own ordering"
```

### Axis — trust propagation (P2), from the `security` + `privacy` grillers

```yaml
- type: FINDING
  rule_id: "P2"
  severity: blocking
  file: ".dev/features/loop-run-report/PLAN.md:124"
  problem: "The token section is specified as a markdown table whose rows carry `model` and `stage`,
    both copied from an untrusted transcript. Probed live against the shipped sanitiser rather than
    read off it: sanitizeIdentity('opus|5', …) returns 'opus|5' unchanged — the ledger's rule 3 bounds
    length, control characters and absolute paths, and does NOT exclude a pipe. One pipe in a model
    identity silently splits a table cell and shifts every column to its right, so the rendered
    numbers stop belonging to the row they appear in."
  evidence: "a markdown table over `by_stage_iteration_model` with all six token classes"
```

```yaml
- type: FINDING
  rule_id: "P2"
  severity: blocking
  file: ".dev/features/loop-run-report/PLAN.md:129"
  problem: "Two requirements in one sentence cannot both hold as written: a PLAN `## Files` line
    copied VERBATIM, and file rows rendered as table entries. A verbatim line containing a pipe
    breaks the row; escaping the pipe makes the copy no longer verbatim. The plan does not say which
    requirement yields, so the build will pick one silently."
  evidence: "the PLAN `## Files` line for that path copied **verbatim as DATA**, labelled
    `planned purpose (PLAN.md)`"
```

### Axis — guarantee audit (P0), from the `architecture` + `documentation` grillers

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/loop-run-report/PLAN.md:171"
  problem: "The claim that the module spawns no child process other than git is to be pinned by a
    test, but the plan does not state the test's mechanism or its bound. The only available mechanism
    is a source-text scan, which cannot see a call assembled at run time — so the assertion is a
    closure over the module's literal text, not over its behaviour, and the audit should say so
    rather than let the line read as a behavioural guarantee."
  evidence: "a test asserts the module spawns no child process other than `git` and opens no network"
```

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/loop-run-report/PLAN.md:122"
  problem: "The report is rendered before the Step 6c commit and after cost.json is written, so it
    lists cost.json among the changed files and necessarily omits itself. That is correct behaviour
    and reads as an omission to anyone comparing the report against the commit it lands in; the
    artifact should state the boundary rather than leave the reader to infer it."
  evidence: "**`## Outcome`** — `decision`, `iterations`, `blocked`, `base_sha`, `command`, `name`"
```

### Axis — one axis of change (P3), from the `coupling` griller

```yaml
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: ".dev/features/loop-run-report/PLAN.md:66"
  problem: "This increment edits three shipped product-floor checkers, and the third is reached for a
    different reason than the first two. check-loop-record.mjs changes because its grammar is being
    shared; check-build-complete.mjs changes because a DIFFERENT private parser must return more than
    it does. Both are 'make a private parser reusable', which is coherent, but the plan does not argue
    that — it just lists them, so a reviewer cannot tell a considered grouping from an accumulated one."
  evidence: "`pharn/floor/check-build-complete.mjs` — EDIT. Its private `## Files` parser also returns
    each item's raw line — layer pharn/floor"
```

---

## Summary

The plan's structure is sound and its two hardest choices — sharing the Handoff grammar rather than
copying it, and excluding a deterministically rendered artifact from the style gates its own stage owns
— were put to the human and answered before approval. The guarantee audit is unusually careful about
what it **strikes** (the file list is not "what the build wrote"; the fence is not forgery-proofing),
which is the right direction.

The concerns cluster in one place: **the plan specifies WHAT each section contains and is thin on HOW
untrusted text reaches the page.** Four of the eight findings are that gap in different clothes — the
porcelain parse, the `unknown` base, the pipe in a model identity, and the verbatim-versus-table
contradiction. None is a design error; each is a decision the build will otherwise make silently, and
two of them (the pipe, the porcelain quoting) fail in the quiet direction, producing a well-formed page
whose numbers or markers belong to the wrong row. The remedy in every case is the same shape: decide
the rendering container before writing the renderer, and prefer a container that cannot be broken by
its contents — a fenced block or a definition list rather than a table cell.

The P3 finding is a note, not an objection: the grouping looks right and simply is not argued.

**The two blocking-severity trust findings are the ones worth reading before build.** They are the only
two where a run produces output that looks correct and is not.

**ADVISORY VERDICT: 8 concerns raised (3 blocking-severity, 5 advisory) — for the human to weigh before
`/pharn-dev-build`.** This interrogation gates nothing: no finding above is a floor verdict, and
`severity` is a model assignment. The one floor-grade result of this stage is the Step 1b lessons
declaration in the header, which was GREEN — and that covers the **declaration**, never that the
lessons were genuinely applied.
