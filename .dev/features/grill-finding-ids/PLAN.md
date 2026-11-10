# PLAN — grill-finding-ids

- spec_content_hash: ab4dbd928b96b51bdb54ee12b91e87a95d1ba144013a26b8f20ffa9b4122c7fd
- applied_lessons: [L2, L6, L8, L14, L29, L35, L36, L62, L82, L84]
- increment: part 1 of 3 of restore-loop-grill — a full `/pharn-grill` also writes `pharn/features/<name>/grill-findings.json`, every finding it raises (interrogation, grillers, scanner hits) with a stable id `G<round>-<n>`, and a new floor CLI `grill-findings.mjs` renders that file into a marked section of `GRILL.md` and checks the file, the section and the scanner coverage deterministically. Nothing reads the ids to decide anything yet; part 2 (triage) is their consumer.
- layer(s): pharn-contracts (finding-shape.md, a new emission section), product floor (`pharn/floor/`), product command (`.claude/commands/pharn-grill.md`, plus grants in `pharn-loop.md`)
- constitution_refs: [P0, P1, P2, P3, P4, P5, P6, P7]

## Open questions — RESOLVED at the halt (human-selected, P6, 2026-11-10)

None open. Each question below was asked through a selectable form; the human picked the recommended option for all
four:

- Q1 → **split approved**: part 1 = finding ids (this plan, 7.6.0), part 2 = triage (7.7.0), part 3 = supervisor
  (7.8.0).
- Q2 → **(A) JSON sidecar + render**: `grill-findings.json` is the one source, rendered and byte-checked in
  `GRILL.md`; the finding object is unchanged (MINOR).
- Q3 → **proceed; cite lines later**: part 1's trigger is the maintainer's direction plus the run paths below; the
  maintainer names the exact GRILL.md lines (or the later fix) before part 2's plan.
- Q4 → **4 plans, 2 supervisor calls** in parts 2–3's worst-case cost line.

The questions as asked, kept for the record:

1. **Approve the split, and this plan as part 1?** The brief is too large for one increment (two new commands, a new
   artifact family, two new checkers, a CLI counter, a loop rewrite, five trusted-doc edits). Proposed order below
   (`## The split`). **Recommended: yes — part 1 = finding ids (this plan, 7.6.0), part 2 = grill + triage + re-plan
   in the full loop, with escalation stopping `blocked:` until part 3 (7.7.0), part 3 = supervisor (7.8.0).**
2. **Where does a finding's id live?** Discovery: no floor code parses findings out of `GRILL.md` today (the only
   content reader is `render-ship-briefing.mjs`'s verdict-line convention, `:188`); findings are model-written YAML
   inside prose (`pharn-grill.md:261-279`), and the repo is stdlib-only, so there is no YAML parser.
   - **(A) Recommended — a JSON sidecar as the one source, rendered into `GRILL.md`.** `grill-findings.json` holds the
     findings; `grill-findings.mjs render` prints the `GRILL.md` findings section between two marker lines, and
     `check` re-renders and compares bytes (the `docs:check` / CURRENT-STATE pattern). This is the existing
     `findings.json` → `REVIEW.md` shape (`finding-shape.md:70-89`, `render-review.mjs`), it is a real JSON field
     boundary (fix #1), and it keeps the finding object unchanged: the id is a key beside the six fields **in this
     file only**, so no lens output, `merge-findings.mjs` or eval reads a new shape. That is why this is MINOR, not
     MAJOR.
   - (B) One fenced JSON block inside `GRILL.md` — one file (L8), but the checker must pair CommonMark fences in a
     model-written file (L55's risk).
   - (C) An `id:` line in each YAML finding, regex-read — weakest: a finding without an `id:` line is invisible.
3. **The evidence (P7).** The brief's `<EVIDENCE: …>` slot is unfilled, and nothing in this repo mentions it. I found
   interrogated `/pharn-loop` grill logs in `~/Projects/pharn-starter/.claude/worktrees/agent-adfc1d89170f5e839/pharn/features/`
   (`reauth-binding`, `reauth-per-session`, `erasure-closes-teams`, `retention-gdpr-fixes`; 2026-09-27, before 6.45.0).
   The two I opened ended `STOP_GREEN` while each `GRILL.md` held findings no stage read (e.g. `erasure-closes-teams`
   `GRILL.md:41-42`: nothing shows the cancel is limited to that team's PENDING invitations). **All four record
   `0 blocking-severity`**, and I could not match "a reauth flow that could never work" or "a GDPR erasure that never
   finishes" to a finding line. **Recommended: you name the GRILL.md lines (or the later fix that proved them real)
   before part 2's plan; part 1 proceeds on the same trigger, recorded as the maintainer's direction plus these
   paths.** The zero-blocking fact is itself a design input for part 2: a loop branching on the grill's own
   `severity: blocking` would have done nothing in these runs, which is the case for a separate triage stage.
4. **Worst-case count for parts 2–3.** The brief says 4 grills, 4 triages, 3 plans, 1 supervisor, 1 extra spec. With
   cap 2 and one amend-spec I count **4 plans** (the first plus 3 re-plans) and **2 supervisor calls**: the second
   escalation still needs a supervisor decision, because "cap reached with blocking findings never proceeds without a
   SUPERVISOR decision". **Recommended: use 4 plans / 2 supervisors in parts 2–3's cost line** (estimate in
   `## The split`).

## The failure (P7)

6.45.0 (front-grill-concurrent) made the full loop's grill `floor-only` because "unattended, the grill's findings gate
nothing … no stage reads them before the build" (`pharn/floor/stage-agent-core.mjs:37-42`, policy at `:220-229`). The
premise holds; the brief's remedy is to add stages that read the findings instead of dropping the stage. A stage can
act on a finding only if it can **name** it, and a checker can verify "every finding got a disposition" only if the
set of findings is **enumerable by code**. Today it is neither: the grill emits no id, and its findings exist only as
model-written YAML inside `GRILL.md` prose. This increment makes the set enumerable and named; it decides nothing.

Honest trigger: part 1 alone has no consumer (P7). It is shipped first because parts 2 and 3 cannot be checked without
it, at the maintainer's direction (the brief's own split, "0a finding ids → …"), with the evidence in Q3.

## The split (proposed — only part 1 is planned here)

| part | what                                                                                                                                                                                                                                                            | bump  |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 1    | `grill-findings.json` + ids + `grill-findings.mjs render/check` (this plan)                                                                                                                                                                                     | 7.6.0 |
| 2    | full loop: floor stops → routed full grill → `/pharn-triage` (routed) → `check-grill-triage.mjs` → proceed / re-plan; round counter + `GRILL.r<n>.md` archive as a CLI; escalation (verdict `spec`, or cap hit with `replan`) stops `blocked: grill-escalation` | 7.7.0 |
| 3    | `/pharn-supervise` (routed) + `check-supervisor.mjs` + amend-spec counter + KNOWN RISK in record, summary and commit/PR body; `blocked: grill-escalation` becomes the supervisor call                                                                           | 7.8.0 |

Part 2's interim stop keeps every non-negotiable: a cap hit with blocking findings never proceeds without a decision —
before part 3 that decision is a person's.

**Decisions the brief asked for, recorded for parts 2–3 (each re-opened by its own plan on discovery):**

- **0b — two new commands, as recommended.** A stage is a product command: `check-model-config.mjs:95-110`
  (`PRODUCT_STAGES`) maps key → file and `agreement` enforces `model:`/`effort:` equality; `ROUTE_POLICY` cells name
  stages (`stage-agent-core.mjs:197-245`). Triage and supervisor read different inputs, write different files and
  change for different reasons (P3), so a mode of `/pharn-grill` would put two axes in one file. **Cross-repo cost,
  named:** pharn-cli vendors `check-model-config.mjs` pinned by sha256 (`stage-agent-core.mjs:239-240` residual), so
  part 2 needs a pharn-cli refresh; whether it needs `MIN_CLI` is part 2's to measure (`.dev/guides/versioning.md`:
  only a BROKEN install bumps it).
- **0c — the counters are a CLI.** `pharn/.run/pharn-loop/**` is write-tool-denied since 7.3.0 (CLAUDE.md hard
  constraint 1), so the round and amend-spec counters are a `stage-agent.mjs` (or new CLI) subcommand, never a model
  write.
- **Cost, worst case (cap 2, one amend-spec):** 4 plans, 4 grills, 4 triages, 2 supervisor calls, 1 extra spec.
  From `.dev/measurements/loop-wall-clock-2026-10-05.md` §2 (one run, opus): spec 211.1 s / 22 requests, plan 658.3 s /
  55, grill 361.0 s / 41 (the 6.45.0 header says 43; the ledger and the transcript count differ). Triage and supervisor
  are unmeasured; estimate one spec-sized agent each (~200 s / ~20 requests, `e`). Front total ≈ 4×658 + 4×361 + 6×200
  - 211 ≈ 5,300 s (~88 min) and ≈ 4×55 + 4×43 + 6×20 + 22 ≈ 530 opus requests, against today's front of plan + an 8.5 s
    inline grill. The entry gates start at Step 1a and are read after the front (`pharn-loop.md:740-770`); a longer front
    only makes their result likelier to be ready, so the `--wait` budget (570 s per call, re-run on 5) is not at risk —
    but each re-plan is a new plan stage, so part 2 must decide whether the 7.5.0 `--peek` after the plan runs per round.
- **Trusted-doc text** (`ARCHITECTURE.md:243`, `LIMITS.md:161` and `:279` — the brief's `:155`/`:273` have moved —
  `THREAT-MODEL.md:20`) is owed by part 2 and is drafted in part 2's plan, to be committed by a human before that
  build (L68). **Part 1 changes no trusted-doc sentence**: §6's grill row stays true (a full grill's log still records
  both stops and the findings), and no shipped trusted doc enumerates the feature directory's files.

## Discovery (read live this run)

- `pharn/floor/stage-agent-core.mjs:20-45` header, `:197-245` `ROUTE_POLICY` (the full loop's grill `floor-only`,
  `:222`), `:247-280` `INVOCATIONS` (no loop grill entry). Tests naming `floor-only`: `stage-agent-core`,
  `stage-agent`, `route-token-core`, `stage-direct`, `entry-gates`, `grill-scan`, `render-cost-ledger` `.test.mjs`,
  `.dev/floor/command-hygiene.test.mjs`, `.dev/floor/installed-skills-consumers.test.mjs` — none change in part 1.
- `.claude/commands/pharn-grill.md`: `writes:` `:23`; `--floor-only` `:107-125`; Step 3 `:175`; Step 3b scan + extract
  `:218-259`; finding output `:261-279`; Step 4 `:281-333`; claims `:335-366`. `pharn-loop.md` runs it inline
  `--floor-only` (Step 4, `:695-711`); every fenced line of an inline stage needs an exact grant in the loop's
  `allowed-tools`, both ways (`.dev/floor/command-hygiene.test.mjs:6086-6145`, `loopGrantOffenders`).
- `pharn/pharn-contracts/finding-shape.md` — the object `:18-30`, emission `:70-132`; no id anywhere.
- `pharn/floor/grill-scan.mjs` — `renderScanSection` builds the scanner findings inline (`:108-145`); no export
  returns them as objects.
- `pharn/floor/merge-findings.mjs` exports `TYPE_ENUM` (`:226`), `SEVERITY_ENUM` (`:184`), `RULE_ID_OK` (`:240`).
- A new `pharn/features/<name>/` artifact must be classified in four stores, each test-pinned:
  `check-regress.mjs` `PIPELINE_ARTIFACTS` (`:159`, test `check-regress.test.mjs:210` requires ⊇ every artifact a
  command declares, and `:214-240` classifies every `.json` member as machine- or model-written);
  `reconcile-ignore.json` `pipeline_artifacts.names` (set-equal to the former, `check-bash-reconcile.test.mjs`);
  `worktree-fingerprint.mjs` `INCLUDED_ARTIFACTS` / `EXCLUDED_ARTIFACTS` (`:156`, partition test
  `worktree-fingerprint.test.mjs:267`). `loop-closeout.mjs` `STAGE_ARTIFACTS` (`:144`) is NOT touched: the loop does
  not write the file until part 2.
- `.claude/hooks/set-writes-scope.cjs:45-46, 671-686` — `--target` resolves ONE path per call; `/pharn-plan` re-scopes
  per artifact (`pharn-loop.md:133,137` grants), the precedent this follows (L8).
- pharn-cli `src/lib/executable-unit.ts:17-42` copies the whole floor directory, so two new `pharn/floor/*.mjs` files
  install with no `MIN_CLI` change.
- Lessons index: `check-lessons-index.mjs` GREEN (exit 0); selected from the index, read in full from canon.

## What is built

### 1. `grill-findings.json` — the grill's findings, each with an id (contract: `finding-shape.md`, new section)

```json
{
  "schema": "pharn-grill-findings/1",
  "round": 1,
  "findings": [
    {
      "id": "G1-1",
      "type": "FINDING",
      "rule_id": "P1",
      "severity": "important",
      "file": "pharn/features/<name>/PLAN.md:42",
      "problem": "…",
      "evidence": "…"
    }
  ]
}
```

- Keys closed both ways at both levels; a top-level key repeated in the source text is refused (the 7.3.0
  `check-loop.mjs` rule). `round` a positive integer ≤ 99. `findings` ≤ 500 elements, `[]` allowed.
- **The id is positional and checked:** element `i` (0-based) must carry exactly `G<round>-<i+1>`, so ids are unique,
  contiguous and in file order; a skipped or reordered id is RED. The model writes the ids; the checker refuses any
  other numbering.
- The six other keys are the finding object, unchanged (`finding-shape.md:18-30`): `type` ∈ `TYPE_ENUM`, `severity` ∈
  `SEVERITY_ENUM`, `rule_id` through `RULE_ID_OK` (guard first — L14, L82), `file` a clean `path:line`, `problem` and
  `evidence` non-empty single-line strings, control-character-free, ≤ 2,000 characters.
- Part 1 always writes `round: 1`. Rounds above 1 and the `GRILL.r<n>.md` archive are part 2's.

### 2. `pharn/floor/grill-findings-core.mjs` (pure) + `pharn/floor/grill-findings.mjs` (CLI)

- `validate(text)` → `{ok, doc}` or `{ok:false, defects:[closed codes]}`; codes name keys and indexes, never a value
  read from the file (L62 — any value quoted goes through a total quoting function).
- `render(doc)` → the section, deterministic bytes:

  ````text
  <!-- GRILL-FINDINGS:BEGIN — rendered by pharn/floor/grill-findings.mjs from grill-findings.json; do not edit -->
  ```yaml
  - id: G1-1
    type: FINDING
    rule_id: "P1"
    severity: important
    file: "pharn/features/<name>/PLAN.md:42"
    problem: <JSON.stringify(problem)>
    evidence: <JSON.stringify(evidence)>
  ```
  <!-- GRILL-FINDINGS:END -->
  ````

  Free text goes through `JSON.stringify` (a valid YAML double-quoted scalar; quotes, backslashes and newlines
  escaped), so no rendered line can start a fence or a marker. An empty list renders `Findings: none.` between the
  markers.

- `expectedScannerFindings(planPath, results)` — the scanner findings exactly as `grill-scan.mjs` renders them, from
  one shared builder (below).
- CLI, exit codes in the shelled-verdict convention (`shelled-verdict-core.mjs`: exit 1 always WITH a `RED —` line):
  - `node pharn/floor/grill-findings.mjs render <grill-findings.json>` → 0 and the section on stdout · 1 `RED — …`
    (invalid file) · 2 usage/unreadable.
  - `node pharn/floor/grill-findings.mjs check <grill-findings.json> --grill <GRILL.md> --plan <PLAN.md>` → 0 `GREEN`
    · 1 `RED — <codes>` · 2 usage, an unreadable file, or scanners that cannot run. RED when: the file is invalid;
    `GRILL.md` does not hold exactly one BEGIN and one END marker line, BEGIN first; the bytes between them differ from
    `render`; or a scanner finding `grill-scan` produces for that plan has no element equal on all six finding fields
    (named by scan id and line, never plan text).

### 3. `pharn/floor/grill-scan.mjs` — one builder for the scanner findings

Export `scanFindings(planPath, results)` returning the finding objects `renderScanSection` prints today, and make
`renderScanSection` print from it. **Output byte-identical** (a test pins a fixture's output before/after). The checker
imports it, so the scanner findings it expects come from the same code that printed them (L35 — one copy of the rule).

### 4. `.claude/commands/pharn-grill.md` — full mode writes the file, renders it, checks it

- `writes:` gains `"pharn/features/<name>/grill-findings.json"`; `version` 0.5.0 → 0.6.0.
- `## Finding output`: each finding in full mode also carries `id: G1-<n>`, in the order written; the scanner findings
  `grill-scan.mjs` printed are copied into the file unchanged, ids aside.
- Step 4, full mode only, in this order (pinned lines):
  1. `node .claude/hooks/set-writes-scope.cjs --from-frontmatter .claude/commands/pharn-grill.md --target pharn/features/<name>/grill-findings.json`, then write the file.
  2. `node pharn/floor/grill-findings.mjs render pharn/features/<name>/grill-findings.json` → exit 0: keep stdout
     for `GRILL.md`; exit 1: fix the file once (the codes name the defect) and re-render; still non-zero → `GRILL.md`
     records `findings: NOT rendered (grill-findings.mjs render exit <n>)` and lists the findings as YAML, as before.
  3. Step 0's `GRILL.md` setter line again (the scope moved to the JSON in 1), then write `GRILL.md` with the rendered
     section verbatim in place of the hand-written findings list.
  4. `node pharn/floor/grill-findings.mjs check pharn/features/<name>/grill-findings.json --grill pharn/features/<name>/GRILL.md --plan pharn/features/<name>/PLAN.md`
     → 0: done; 1: one repair round, re-check; still RED → add `findings-check: RED (<first line, quoted>)` to the
     header (outside the markers). **Gates nothing in part 1** — the grill stays advisory.
- The `ADVISORY VERDICT` line stays model-written (`render-ship-briefing.mjs:188` reads it; unchanged).
- `--quick` and `--floor-only`: unchanged, no file.
- Claims block: Floor — the file's shape, ids, render equality and scanner coverage (`grill-findings.mjs check`, when
  it runs); Advisory — running it, that the model listed every finding it formed (a finding the model never writes is
  invisible to the check), and every disposition-free claim about quality.

### 5. Grants, artifact lists, budgets

- `pharn-loop.md` `allowed-tools`: the three new pinned lines, `<name>` → `*` (`grantFor`). The loop never runs them
  in part 1 (its grill is `--floor-only`), but the grant test ranges over every fenced line of the inline grill file.
- `grill-findings.json` joins `check-regress.mjs` `PIPELINE_ARTIFACTS`, `reconcile-ignore.json`
  `pipeline_artifacts.names` and `worktree-fingerprint.mjs` `INCLUDED_ARTIFACTS` (written before the gates, beside
  `GRILL.md`); `check-regress.test.mjs` classifies it `MODEL_WRITTEN` ("/pharn-grill writes it with the Write tool").
- `COMMAND_BYTE_CEILINGS` (`pharn-grill.md` 26,624; `pharn-loop.md`) and `STAGE_LOAD_CEILINGS` (the grill's load set
  grows with `finding-shape.md`) raised by the measured + 10% rule only if the build measures them over.

## Applied lessons

- L2 — the floor/advisory split for the new file is written into `finding-shape.md`'s new section and the grill's
  claims block, citing only `grill-findings.mjs check`, which this increment ships and tests.
- L6 — the checker reads findings from the JSON's structure and the section between two exact marker lines, never by
  grepping `GRILL.md` prose for `id:`.
- L8 — the grill now writes two placeholder-path artifacts, so it re-scopes per artifact (two setter calls), as
  `/pharn-plan` does for PLAN.md and AC-TESTS.md.
- L14 — `rule_id` and every enum field go through the control-character guard before any anchored regex.
- L82 — the guard-first reason recorded in the core's header is the trim-before-regex one, not Perl's `$`.
- L29 — the scanner coverage check iterates `GRILL_SCANS` through `scanFindings`, never a hand-listed subset.
- L35 — one source per fact: the JSON is the findings' source and the `GRILL.md` section is derived from it by code and
  byte-checked; the scanner findings come from one builder shared by `grill-scan.mjs` and the checker.
- L36 — closure, not presence: keys closed both ways, ids exactly `G<round>-<i+1>` for every element, and the
  defect-code set closed and test-enumerated.
- L62 — every refusal quotes through a total function; a test feeds `{"toString":1}` in each field.
- L84 — a test builds a realistic GRILL.md + JSON + plan with scanner hits and asserts both outcomes (GREEN, and RED
  when one scanner finding is removed), so a check that is always GREEN cannot pass.

## Files

- `pharn/pharn-contracts/finding-shape.md` — new section "Emission — grill-findings.json": schema, id rule, render/check, floor vs advisory, readers — layer pharn-contracts
- `pharn/floor/grill-findings-core.mjs` — new: validate, render, expected scanner findings (pure) — layer floor
- `pharn/floor/grill-findings.mjs` — new: `render` / `check` CLI — layer floor
- `pharn/floor/grill-findings.test.mjs` — new: core + CLI tests — layer floor (test)
- `pharn/floor/grill-scan.mjs` — export `scanFindings`; `renderScanSection` prints from it, output unchanged — layer floor
- `pharn/floor/grill-scan.test.mjs` — byte-identical output pin + `scanFindings` tests — layer floor (test)
- `pharn/floor/check-regress.mjs` — `grill-findings.json` in `PIPELINE_ARTIFACTS` — layer floor
- `pharn/floor/check-regress.test.mjs` — classify it `MODEL_WRITTEN` — layer floor (test)
- `pharn/floor/reconcile-ignore.json` — `grill-findings.json` in `pipeline_artifacts.names` — layer floor
- `pharn/floor/worktree-fingerprint.mjs` — `grill-findings.json` in `INCLUDED_ARTIFACTS` — layer floor
- `.claude/commands/pharn-grill.md` — `writes:`, finding output, full-mode Step 4, claims, version 0.6.0 — layer command
- `.claude/commands/pharn-loop.md` — three `allowed-tools` grants only — layer command
- `.dev/floor/command-hygiene.test.mjs` — byte ceilings if measured over; any pin the new Step 4 lines need — apparatus
- `.dev/floor/stage-load-budget.test.mjs` — the grill's load ceiling if measured over — apparatus
- `.dev/guides/floor-checks.md` — new `grill-findings.mjs` section — apparatus
- `SKILLS_VERSION` — 7.5.0 → 7.6.0
- `CHANGELOG.md` — one `[7.6.0]` entry
- `README.md` — version badge; CURRENT-STATE region regenerated by `npm run docs:generate` (floor checker count)

### Not written by this increment

- `pharn/floor/loop-closeout.mjs` `STAGE_ARTIFACTS`, `stage-agent-core.mjs`, `check-model-config.mjs`,
  `pharn.config.json`, every trusted doc, `.claude/commands/pharn-dev-grill.md` (the dev twin keeps its own output) —
  parts 2–3 or out of scope.

## Contracts satisfied

- `finding-shape.md` — each element's six finding fields are the object as defined (`:18-30`), split honored; the new
  section adds the envelope and the id, and changes no existing field or emission rule (P4: the section cites the
  object, it does not restate it).
- `ARCHITECTURE.md §6` grill row — still true; the grill-log holds both stops' results and the findings.

## Evals / tests to write (P1)

No capability is added or changed (no `role:` file), so `validate.mjs`'s eval binding is untouched. Tests:

- `grill-findings.test.mjs`: a valid doc round-trips (render → check GREEN); each defect code from its own fixture
  (closed set enumerated, L36); ids `G1-1,G1-3` RED, `G1-2,G1-1` RED, `G2-1` under `round: 1` RED; repeated top-level
  key RED; extra/missing key at each level RED; each enum field with a trailing newline and with a control character
  RED (L14/L82); `{"toString":1}` in every field refused with a reason, never a throw (L62, with the control that
  `String()` throws); `[]` renders `Findings: none.` and checks GREEN; marker missing / doubled / END first / one byte
  changed between markers → RED; a `problem` holding a newline and a line of three backticks renders on one line;
  realistic plan with secrets + PII hits → GREEN with them, RED with one removed (L84); exit codes 0/1/2 and every
  exit-1 path prints `RED —` first.
- `grill-scan.test.mjs`: fixture output byte-identical to a committed expected string; `scanFindings` equals the YAML
  the section prints.
- `check-regress.test.mjs` / `check-bash-reconcile.test.mjs` / `worktree-fingerprint.test.mjs`: existing parity and
  partition tests cover the three list edits (they fail if any one is missed).
- Hygiene: the grant test covers the three new lines; a new pin that `pharn-grill.md` Step 4 holds the render line
  before the `GRILL.md` write and the check line after it.

## Guarantee audit (P0)

- The file has the closed shape, ids exactly `G<round>-<i+1>`, enum fields in their sets → floor: enum-regex
  (`grill-findings.mjs check`), when it runs.
- `GRILL.md`'s findings section equals the render of the file → floor: content equality (byte compare), when it runs.
- Every scanner finding for the plan is in the file → floor: enum-regex scanners + equality, when it runs.
- That the grill runs `check`, or repairs on RED → advisory (command prose).
- That the file lists every finding the model formed → advisory, and stated as the check's blind spot.
- That the id names the same concern after a re-plan → not claimed; ids are per round (part 2's carried check owns
  continuity).
- Writes only `GRILL.md` and `grill-findings.json` → floor: the fix #7 hook (two `--target` scopes).
- Struck: "every grill finding is triaged", "the ids make findings actionable" — nothing reads them in part 1.

## Trust audit (P2)

- `problem` / `evidence` in the file inherit the plan's `untrusted` tag exactly as in `GRILL.md`; render escapes them
  through `JSON.stringify` inside a YAML fence, so a crafted value cannot end the fence or forge a marker line. The
  checker never interprets them: it compares bytes and enum fields only, and its messages name codes, keys and
  indexes, never a value.
- `id`, `round`, `type`, `severity`, `rule_id`, `file` are the enum-gated half; the id is the model's assertion,
  shape-checked, positional.
- No new consumer of free text: part 1 adds no stage that reads the file, so THREAT-MODEL §5's residual (1) is
  unchanged. Part 2's triage is where it is consumed, and that plan owns the fence.

## Determinism audit (P5)

- Every branch in `check` is membership or equality; the grill's two repair rounds branch on exit codes; no model
  classification decides a branch. The terminal state of a still-RED check is a recorded line, not a guess.

## Version and CHANGELOG

- MINOR, 7.6.0: a new shipped checker and a new artifact (`CLAUDE.md`, bump size). Not MAJOR: the finding object, the
  `findings.json` emission, `merge-findings.mjs` and every existing artifact keep their shape, so no existing install
  reads anything new; `--quick` / `--floor-only` grill output is unchanged. `MIN_CLI` unchanged: pharn-cli copies the
  whole floor directory and every top-level `pharn-*.md` command.
- One new `[7.6.0]` CHANGELOG entry (CONTRIBUTING "CHANGELOG entries"); nothing merged is edited.
