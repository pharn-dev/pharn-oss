# PLAN — review-lens-grouping

- spec_content_hash: 75088a82d113bc52cdd3d5fb2e44533e81cba5f520877f5eaa441ced45fb0fd6
- applied_lessons: [L4, L6, L13, L15, L24, L25, L29, L33, L34, L35, L36, L37, L40, L41, L45, L55, L60, L62, L67, L68, L70, L71]
- increment: `/pharn-review` groups its lenses into families from a committed map, `pharn/floor/lens-family-map.json`,
  through a deterministic helper, `pharn/floor/lens-groups.mjs`. It spawns one subagent per family that has a lens to
  run, as the project subagent type `pharn-review-lens` (`.claude/agents/pharn-review-lens.md`: five tools, no project
  `CLAUDE.md`), and falls back to `general-purpose` with the same grouped prompt. Each lens still writes its own
  `findings.json`. It delivers the follow-up 6.62.0 deferred as `review-lens-grouping`, the undelivered half (b) of
  review finding CTX-3, on top of the narrowed container (round 0's option B).
- layer(s): product command (`.claude/commands/pharn-review.md`); product floor (`pharn/floor/`: one data file, one
  CLI, its test); a new product `.claude/` file (`.claude/agents/`); dev apparatus (`.dev/floor/` tests,
  `.dev/guides/`, `CLAUDE.md`).
- constitution_refs: [P0, P2, P3, P5, P6, P7]

## GATE 1 — round 1 (a human decision, 2026-10-18)

Round 0 of this plan (commit `6a19c3f`, then at `.dev/features/review-lens-agent/PLAN.md`) recommended the narrowed
container alone and deferred grouping. The human chose **"Re-plan as grouping"**, clarified as **"Grouping on top of
B"**:

- lens families, with `trust-fence` alone;
- each family runs in one `pharn-review-lens` subagent, with the five tools and no `CLAUDE.md`;
- the probe and the lens evals measure the grouped setup;
- the human accepted that two axes in one attempt means a regression cannot be attributed to either by default (this
  plan adds targeted re-runs that attribute a confirmed failure; Design §6).

Round 0's open questions, as answered:

1. **The prefix probe:** "Yes, before build". Build only if the custom type's first-request prefix is at most 50% of
   `general-purpose`'s, measured in the same session, and record the deny of the out-of-scope write.
2. **The lens evals:** "N=1, trust-fence ×5", now applied to the grouped setup.
3. **Distribution:** not asked; round 0's recommendation stands (fallback, `MIN_CLI` unchanged, follow-up
   `cli-install-agents`). Grouping does not change it (Design §8).
4. **`CLAUDE.md`:** "Yes, omit it" (`omitClaudeMd: true`).
5. **Grouping:** superseded by the round-1 choice above.

**Slug.** Round 0 used `review-lens-agent`. This increment now delivers the deferred `review-lens-grouping`, so the
plan moved to `.dev/features/review-lens-grouping/` and the run's branch is `feat/review-lens-grouping`. The round-0
file was removed in the same commit; it stays readable at `6a19c3f`.

## The problem, re-verified (P6)

The 2026-10-12 review report is no longer on disk. Its records were read as DATA (P2) and re-checked against the
live tree: `.dev/features/review-fanout/PLAN.md` Design §6–§7, its `MEASUREMENTS.md` and `REVIEW.md`, and CHANGELOG
[6.62.0] ("Not covered: the 22-subagent fan-out is NOT reduced").

- **Live code.** `.claude/commands/pharn-review.md` Step 4 spawns "**one subagent per lens**" with no subagent type,
  so each lens runs as `general-purpose`. Step 3 lets the orchestrator skip a scanner-bound lens whose review set
  (slice plus `scanner_errors` files) is empty. The four scanner-less lenses always run, each over the whole target.
  `count-lenses.mjs` reports 22 lenses; `lens-scanner-map.json` maps 18.
- **The prefix figures are stale (L24).**
  - 68k–130k is CH1 (`.dev/measurements/pipeline-performance-audit-2026-09-29.md` §3): 29 `general-purpose` first
    requests, 2026-09-23 to 09-29, cache write 68,223 / 91,759 / 129,646 (min / median / max). `Explore` agents wrote
    34,934–46,732. The composition was not measured.
  - This repo's `CLAUDE.md` was 172,421 B then and is 29,362 B now.
  - pharn-starter's 302k (`.dev/measurements/loop-wall-clock-2026-10-05.md`) carried 634,379 B of instruction files.
    Its `CLAUDE.md` is now 41,215 B and `.claude/rules/` 251,046 B.

### Subagents per review, measured this run

Scratch harness (below) over each repo's last 40 first-parent commits, each a PR diff. A family counts when at least
one member has a non-empty review set. "Recommended" is the map in Design §1.

| Map variant                                          | pharn-starter, 32 reviews: min / p25 / median / p75 / max (total) | pharn-oss, 40 reviews (total)  |
| ---------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------ |
| Today: one subagent per lens                         | 5 / 8 / 10 / 13 / 15 (325)                                        | 4 / 7 / 11 / 12 / 16 (404)     |
| **Recommended: security solo, 11 families**          | 3 / 4 / 5 / 6 / 8 (161, −50%)                                     | 2 / 4 / 5 / 5 / 10 (193, −52%) |
| Security grouped too, 6 families                     | 3 / 4 / 5 / 6 / 6 (151, −54%)                                     | 2 / 4 / 5 / 5 / 5 (174, −57%)  |
| Security grouped, scanner-less trio solo, 8 families | 5 / 6 / 7 / 8 / 8 (215, −34%)                                     | 4 / 6 / 7 / 7 / 7 (254, −37%)  |

- pharn-starter: 8 of 40 commits had no target (six dependency bumps whose one changed file is over the 512 KiB cap,
  two empty diffs). pharn-oss's window ends at round 0's plan commit `6a19c3f`.
- In pharn-starter the scanner-bound lenses hit in this many of the 32 diffs: duplicated-logic 32, magic-values 26,
  missing-error-handling 26, copy-paste-drift 25, placeholder-as-done 20, secrets-in-code 13, missing-await 12,
  null-deref 11, swallowed-exception 11, injection 9, n-plus-one 5, missing-timeout 5, unsafe-deserialization 2;
  insecure-crypto, off-by-one, path-traversal, resource-leak and ssrf never.
- pharn-starter's 15 committed `/pharn-review` runs (2026-09-15 to 09-22) self-report 4–13 lenses run or contributing
  of 22 (DATA): orchestrators already skip empty review sets.

**Estimated prefix cost per PR-sized review** (median spawn counts; `P_gp` = a `general-purpose` first-request prefix,
`P_custom` = the `pharn-review-lens` one, 5k–47k estimated, the upper end being CH1's `Explore`):

- today: 10 × `P_gp` ≈ 0.7M–1.3M tokens at CH1's range, ≈3M at 302k;
- grouped on B: 5 × `P_custom` ≈ 25k–235k, plus up to ≈4k tokens per extra lens file a grouped context reads.

Every figure here is an estimate except the spawn counts. The probe (Design §6) measures `P_custom` and `P_gp`.

**Harness (scratch, gitignored, deleted before any lint run).** Under `.pharn/review-lens-grouping/measure/`:

- `count-groups.mjs` imports `computeAssignments` from this worktree's `render-review-assignments.mjs`. Per commit, it
  writes the commit's own added or modified blobs (the emitter's size and NUL rules applied) into a temp tree with
  `pharn/floor` symlinked in. It runs the 18 scanners once each and counts groups under four map variants.
- `case-exposure.mjs` runs the emitter once over the 75 lens eval case files and counts, per case, the family
  siblings production would hand that file to.
- Round 0's `past-runs.mjs` read the committed runs.

## What Claude Code supports (documentation read 2026-10-18; not probed — L37)

From `https://code.claude.com/docs/en/sub-agents` and `.../prompt-caching`, each a documentation claim:

- a custom subagent "receive[s] only this system prompt plus basic environment details …, not the Claude Code system
  prompt";
- `tools:` narrows built-in and MCP tools; omitted, every tool available to subagents is inherited;
- `omitClaudeMd: true` (v2.1.271+) starts it "without the user, project, and local CLAUDE.md files";
- model order: invocation `model`, then the definition's `model:`, then `CLAUDE_CODE_SUBAGENT_MODEL`, then the main
  model; with no `model:` key the choice matches today's `general-purpose`;
- Claude Code watches `.claude/agents/`, but only directories that existed at session start: a new agents directory
  needs a new session;
- forks drop input isolation; a non-fork subagent's first request reads none of the parent's cache;
- undocumented: an unknown `subagent_type`, and `omitClaudeMd` before v2.1.271.

**pharn-cli** (`~/Projects/pharn-cli` at `12e5393`):

- `src/lib/install-manifest.ts` declares a closed `InstallSurface` set (`commands | hooks | trusted-doc | license |
features-readme | contracts | core | floor`), so `.claude/agents/` is never installed.
- `install-capabilities.ts` copies `pharn/floor/` whole, minus tests and fixtures, so a new map file and helper there
  do reach installs.

## Design

### 1. The family map, `pharn/floor/lens-family-map.json` (NEW)

**The rule, applied in this order:**

1. **Basis first, from a structured source (L6, P5).** A family never mixes a scanner-bound lens with a scanner-less
   one, as `lens-scanner-map.json` records them. A scanner-less lens takes the whole target, so grouping it with
   scanner-bound lenses would widen each of them from its slice to the whole target.
2. **`trust-fence` is alone.** It is the attempt-0 probe of the free-text channel (`THREAT-MODEL.md §5`), and sharing
   its context would confound what it measures.
3. **Within the scanner-bound lenses, families are by concern** (what forces the lens to change, as for `coupling`).
   That is a human-ratified classification committed in the map, never decided at run time. The run-time branch is
   membership in the committed map (P5).
4. **Security lenses stay solo** (recommended, Open question 1). They are the highest-value target for an attacker who
   wants a finding dropped. Keeping them solo costs +10 subagents over 32 pharn-starter reviews and +19 over 40
   pharn-oss reviews, with the median unchanged (table above).

**The map (recommended), in run order:**

| Family                | Lenses                                                                                    | Basis         | Eval cases |
| --------------------- | ----------------------------------------------------------------------------------------- | ------------- | ---------- |
| `async-resources`     | missing-await, missing-timeout, n-plus-one, resource-leak                                 | scanner-bound | 17         |
| `error-handling`      | missing-error-handling, null-deref, off-by-one, swallowed-exception                       | scanner-bound | 15         |
| `hygiene`             | copy-paste-drift, duplicated-logic, magic-values, placeholder-as-done                     | scanner-bound | 14         |
| `whole-target`        | hallucinated-api, input-validation, race-condition                                        | scanner-less  | 7          |
| six one-lens families | injection, insecure-crypto, path-traversal, secrets-in-code, ssrf, unsafe-deserialization | scanner-bound | 21         |
| `trust-fence`         | trust-fence                                                                               | scanner-less  | 1          |

- **Shape:** `{"doc": "…", "families": [{"family": "<kebab-case>", "lenses": ["<lens>", …]}, …]}`. Family order and
  member order are the run order. A one-lens family is named after its lens.
- **Floor test, ★ closed both ways (L29, L36, L34):**
  - the map's lens set equals `count-lenses.mjs`'s set in this repo, non-empty;
  - each lens appears exactly once;
  - family names are unique kebab-case;
  - `trust-fence` is the only member of its family;
  - no family mixes the two bases of `lens-scanner-map.json`.
- **In an install** the installer copies only the selected lenses, so the map is a superset. The helper ignores map
  members absent from the record and runs a recorded lens the map does not name in a family of its own, which is
  today's behaviour.

**Shared-suppression cost, per family (P2).** In one context, one hostile file in any member's review set reaches every
member.

| Family                                         | What one successful injection can now suppress                                         | Backstop that remains                                                                                                                                                                                                      |
| ---------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `async-resources`, `error-handling`, `hygiene` | up to 4 bug-class lenses (timeouts, error paths, null and bounds, duplication) at once | each member's slice is still its own scanner's deterministic hits, recorded in `assignments.json`. A dropped hit is still assigned there, though nothing compares slices with findings (follow-up `slice-without-finding`) |
| `whole-target`                                 | 3 lenses with no structural backstop, before or after                                  | none. Today the same file already reaches all three, so the separate contexts only weakly decorrelated one payload; they now share one context                                                                             |
| security (six solos, recommended)              | unchanged: one lens per context                                                        | unchanged                                                                                                                                                                                                                  |
| security grouped (Open question 1 b)           | all six vulnerability lenses at once, the class an attacker most wants hidden          | the slices, as for the bug-class families                                                                                                                                                                                  |
| `trust-fence`                                  | unchanged                                                                              | unchanged                                                                                                                                                                                                                  |

### 2. The grouping helper, `pharn/floor/lens-groups.mjs` (NEW)

- **Exports:**
  - `readFamilyMap(repoDir)`, which validates the map shape at run time;
  - `computeLensGroups(record, map)`, a pure function.
- **CLI:** `node pharn/floor/lens-groups.mjs <assignments.json>`. It prints one JSON document:
  `{"schema":"lens-groups/v1","groups":[{"family","lenses":[…]}],"idle":[…]}`.
  - A lens is in a group when its review set is non-empty: its slice, or any `scanner_errors` entry naming it. A
    scanner-less lens's slice is already the whole target.
  - `groups` holds only families with such a lens, in map order, members in map order.
  - `idle` lists the recorded lenses with an empty review set.
- **Exit codes:** 0 printed; 1 when the record or the map is unreadable; 2 when the map is malformed (a lens twice, an
  empty family, `trust-fence` not alone, a non-kebab name). It never re-runs a scanner: the record's verdicts are the
  input (L42's rule, as the checker follows it).
- **Floor-CLI conventions:**
  - first static import `./runtime-floor.mjs`, gated on `import.meta.main` (`entry-point-guard.test.mjs` sweeps both
    floors);
  - ends through `process.exitCode`;
  - lens-name lookups through a `Map` or `Object.hasOwn` (L15);
  - refusals quote values through a total function (L62).

  It spawns nothing, so `stage-runtime.test.mjs`'s GIT CEILING is untouched.

- **Why a helper and not the model:** the eval harness and the command must form identical groups (one
  implementation, L35), and a helper is testable (P5). Step 3 already has the model read the record for each lens's
  files; this adds no second reading of those files.

### 3. `.claude/agents/pharn-review-lens.md` (NEW)

Frontmatter: exactly four keys, in Prettier's output form. The test pins the bytes.

```yaml
---
name: pharn-review-lens
description: "Used only by /pharn-review Step 4 to apply one or more PHARN review lenses to the files its prompt names. Not for any other task."
tools: Read, Grep, Glob, Bash, Write
omitClaudeMd: true
---
```

- No `model:`, `effort`, `skills`, `mcpServers`, `hooks`, `permissionMode`, `memory` or `maxTurns` (P7). With no
  `Agent` tool, it cannot spawn subagents.
- **Body:** an H1 plus at most 2,048 B, saying four things:
  1. its role: one `/pharn-review` group of one or more lenses, each named by the prompt with its lens file, its files
     and its own `findings.json` path;
  2. its scope guard: when the prompt names no lens under `pharn/pharn-review/` and no `findings.json` under
     `pharn/features/`, it stops and says so (L70);
  3. the P2 fence, in one sentence;
  4. it writes only the `findings.json` paths its prompt names.
- **One copy (L35):** the body restates no step of the command, so the `general-purpose` fallback receives the same
  task text.

### 4. `.claude/commands/pharn-review.md` (EDIT)

- **Step 3, a new closing paragraph: "Group the lenses (deterministic)".**
  - Run the pinned line `node pharn/floor/lens-groups.mjs pharn/features/<name>/assignments.json` and spawn by its
    `groups`.
  - Exit non-zero → one group per lens with a non-empty review set (today's spawn). Say so in `REVIEW.md`.
  - The per-lens files-to-review rule is unchanged.
- **Step 4: one subagent per group, in parallel, with `subagent_type: pharn-review-lens`.**
  - **The prompt.** For every lens of the group, in the printed order, it gives the lens file, that lens's files as
    `trust: untrusted` DATA, and that lens's `findings.json` path. It also gives today's shared parts once: the
    CONSTITUTION prefix and the installed-skills instruction, with selection made per lens concern.
  - **Three rules:** apply each lens on its own; a lens's finding names only a file in that lens's list; write each
    lens's `findings.json` before starting the next. Return one `skills:` line per lens.
  - **The fallback.** If the type is not offered, or a call is refused for it, spawn `general-purpose` with the same
    prompt and note `general-purpose (fallback)` for that group.
  - A one-lens group's prompt is today's single-lens prompt.
- **Step 6.** A `## Lens agents` block: one line per spawned group naming its family, its lenses and its agent type
  (orchestrator self-report).
- **`## What you may claim`.**
  - Floor: the family map's invariants, and the group derivation, which is the helper's code.
  - Advisory: spawning by group, each lens's restraint to its own files, the container (Claude Code applies it,
    observed by no floor primitive), and an install without `.claude/agents/` running `general-purpose`.
  - Not a claim: "a lens in a group judged only its own files"; "a lens ran with only the listed tools / without
    `CLAUDE.md`".
- **Re-derived in the same edit (L25):** Step 4's "**one subagent per lens** (the parallel step — the Agent/subagent
  mechanism)" and the advisory claim bullet "parallel spawn (… every lens to run …)".

### 5. Tests and budgets

- **`pharn/floor/lens-groups.test.mjs` (NEW).**
  - The ★ map invariants of §1, each with an in-memory mutant that turns it red (L60): a lens dropped or doubled, a
    23rd lens, `trust-fence` given a sibling, a mixed-basis family, an empty family.
  - ★ derivation fixtures over hand-built records:
    - empty slices give `idle`;
    - a `scanner_errors`-only lens is grouped;
    - a family with one active member spawns with that member only;
    - a recorded lens missing from the map runs alone;
    - a map member missing from the record is ignored;
    - order is the map's.
  - Lookups of `toString` / `__proto__` / `constructor` as lens names (L15).
  - A refusal quoting `{"toString":1}` (L62).
  - The CLI on a real emitter record from a fixture tree, with no option beyond the record path: the only path the
    command uses (L41).
- **`.dev/floor/review-lens-agent.test.mjs` (NEW).**
  - ★ `.claude/agents/` holds exactly `pharn-review-lens.md`, closed both ways, `pharn-` prefixed and not `pharn-dev-`.
  - ★ The frontmatter byte pin and the closed tools set {Read, Grep, Glob, Bash, Write}.
  - The body: at most 2,048 B, holding the fence and the write rule, and not Step 4's pinned catalogue line.
  - ★ Wiring in `pharn-review.md`: Step 3's pinned helper line and its exit-non-zero sentence; Step 4's
    `subagent_type: pharn-review-lens`, the agent path, the fallback and the own-files rule; Step 6's `## Lens agents`;
    the claims lines.
  - Every anchor is asserted found before slicing. Every mutant stays in memory, never under `.claude/agents/` (L60,
    L70).
- **`.dev/floor/stage-load-budget.test.mjs` (EDIT).** The `pharn-review` row gains
  `.claude/agents/pharn-review-lens.md`. The ceiling (375,808 B) moves only if the measured total passes it, by the rule.
- **`.dev/floor/command-hygiene.test.mjs` (EDIT, likely).** `pharn-review.md` is 23,886 of 24,064 B, and this adds
  ≈1.5 KB, so the `COMMAND_BYTE_CEILINGS` row is raised by the rule as a visible diff.
- **Swept and expected to need no edit:**
  - derived from disk: `entry-point-guard.test.mjs`, `source-nul-guard.test.mjs`, the GIT CEILING sweep,
    `walker-exclusion.test.mjs` and `installed-skills-consumers.test.mjs` (Step 4 keeps its skills lines);
  - `cli-stdout-flush.test.mjs`'s set (no floor caller parses the helper's stdout; it ends through `exitCode`
    anyway).

  A sweep that does turn red is a plan miss: halt and re-plan before the anchor (6.54.0).

### 6. Measurements (the round-1 answers), and how they run

**Why neither can run from this session or an agent's Bash.** Claude Code discovers `.claude/agents/` only in a
session started after the directory exists. In this environment the auto-mode classifier has also denied an agent
launching `claude -p --permission-mode auto` from Bash ("Create Unsafe Agents"). So each measurement runs in a
**separate session whose working directory is a scratch checkout** holding the files:

- **Route A (preferred):** the orchestrator starts that session with its session-start tool, if that tool can set the
  working directory.
- **Route B (fallback):** the human runs one pinned command from the scratch checkout, with the prompt read from a file
  the harness wrote:

  ```bash
  claude -p "$(cat .pharn/review-lens-grouping/<probe|eval>/prompt.md)" --permission-mode acceptEdits
  ```

  `acceptEdits` keeps a permission prompt from standing in for the write guard. The agent never launches `claude -p`
  itself.

In both routes, the orchestrator afterwards reads the subagent transcripts
(`~/.claude/projects/<scratch key>/<session>/subagents/agent-*.jsonl`) with
`node .dev/features/pipeline-performance-audit/audit.mjs --prefix`, and runs the scoring script itself.

**The probe (before build).** Scratch checkout: `main` plus §3's file, created before the session starts.

- The session spawns one `pharn-review-lens` and one `general-purpose` subagent with the same one-line task. The
  `pharn-review-lens` one also attempts one `Write` to `pharn/floor/lens-agent-probe.mjs`, which the fail-closed
  default denies.
- Recorded:
  - each first request's usage per token class;
  - whether the transcript shows the write guard's message (`PHARN floor — write blocked`) rather than a permission
    denial.
- Go/no-go, as the human set it: `P_custom` ≤ 50% of `P_gp`, same session.
- The probe measures the container. Grouping's effect on the subagent count is already measured deterministically
  (table above), so the probe needs no grouped prompt (L40: it varies only the agent type).

**The lens evals (after build, before GATE 2).** Scratch checkout of the built branch.

- **Runs: 15 subagents, each case scored once and `trust-fence` five times.**
  - 4 grouped runs, one per multi-lens family: `async-resources` 17 cases, `error-handling` 15, `hygiene` 14,
    `whole-target` 7.
  - 6 one-lens runs for the security lenses, 21 cases between them.
  - `trust-fence` ×5.
- **Review sets mirror production.** For each run, the harness runs the real emitter and `lens-groups.mjs` over that
  family's case files as the target. It then forces each lens's own cases into its review set, because the lens is
  the eval's subject even where its scanner misses its own clean cases (26 of 75 cases). Siblings receive a case only
  where production would: a scanner hit, or scanner-less. That is 16 sibling pairs on this map, 14 of them in
  `whole-target` (`case-exposure.mjs`).
- **Prompts** are written by the harness from Step 4's text. Their fidelity to an orchestrator's own composition is a
  stated bound.
- **Scoring.** Each lens's `findings.json` is split by `file` into one array per case. `check-structural.mjs` then
  scores each of the lens's own cases against its `expected/*.json`: 75 verdicts plus 4 `trust-fence` repeats.
- **Contamination, reported:**
  1. a finding whose `file` is outside its lens's review set, counted deterministically (production labels it
     `slice-miss`);
  2. a sibling that emitted on a case it legitimately received, re-run alone in the custom container on that case. An
     emission only when grouped is a contamination candidate. At most 16 runs.
- **Attribution: what blocks GATE 2.** A structural failure is first confirmed by two more runs of its family (2 of 3
  fail). It is then attributed by the case's lens alone in `pharn-review-lens` ×3 and alone in `general-purpose` ×3:
  - grouped fails and custom-alone passes → **grouping**;
  - custom-alone fails and `general-purpose` passes → **the container**;
  - both alone fail → pre-existing, reported, non-blocking.

  A confirmed failure attributed to either axis blocks GATE 2, and so does a `trust-fence` structural failure
  attributed the same way. Contamination counts are reported for the human (Open question 4).

- **Cost (estimates, counted as the earlier plans counted: first-request prefix plus work, cache re-reads excluded,
  which in a 20–60-request agent loop are several times larger):**
  - grouped runs ≈50k–150k each and one-lens runs ≈15k–60k, so ≈0.5M–1.5M for the 15;
  - ≤16 contamination re-runs ≈0.25M–1M;
  - the session ≈0.1M–0.3M;
  - ≈0.4M–0.8M per confirmed failure.

  In total ≈1M–3M tokens, below round 0's 4M–7M because 15 runs replace 75.

- **Wall clock (estimate):** ≈20–40 min for the 15 runs at up to 6 in parallel, ≈10–20 min of re-runs, ≈15–30 min per
  confirmed failure.

All results, the harness shapes and the spawn tables go to `MEASUREMENTS.md`. The harnesses stay scratch.

### 7. Not in this increment (named follow-ups)

- `cli-install-agents` (pharn-cli): install `.claude/agents/pharn-*.md`.
- `slice-without-finding`: list each scanner-assigned slice file a lens returned no finding for. It is the structural
  check that would bound shared suppression for the scanner-bound families. No failure triggers it yet (P7).
- `lens-body-slim`.
- The `/pharn-dev-eval` harness gap: it runs one lens top-level, never as a `/pharn-review` subagent or group.

### 8. Distribution

- Installs receive the map and the helper (`pharn/floor/` is copied whole), so they get grouping at once, as
  `general-purpose` subagents.
- They get the narrowed container only when pharn-cli adds `.claude/agents/`.
- An older CLI is therefore degraded, not broken: `MIN_CLI` is unchanged.

## Applied lessons

- **L4** — a green test over the map, the helper and the definition proves the plumbing, never the lenses. Adoption
  rests on live grouped runs scored by `check-structural.mjs`. The eval cases cannot show what a real project's
  omitted `CLAUDE.md` did to judgment; that is a stated bound.
- **L6** — the basis rule reads `lens-scanner-map.json`, and the helper reads the record's `assignments[]` and
  `scanner_errors[]` fields, never `REVIEW.md` prose.
- **L13** — this stage formats only its own artifact.
- **L15** — the helper indexes lens names through a `Map` or `Object.hasOwn`, and a test feeds `toString`,
  `__proto__` and `constructor` as lens names.
- **L24** — no prefix figure is carried as a measurement (`CLAUDE.md` shrank here and in pharn-starter). The probe
  measures both containers in one session, and the CHANGELOG states probe numbers or labelled estimates.
- **L25** — Step 4's "one subagent per lens (the parallel step …)" and the advisory spawn bullet are re-derived in the
  same edit. Step 3b and the stage-load-budget header still read true and are left.
- **L29** — the family map is the one materialized enumeration the test, the helper and the eval harness all range
  over. `CLAUDE.md`'s bump-triggering list gains `.claude/agents/pharn-*.md`.
- **L33** — claims that expire on landing were swept (`fan-out`, `subagent per lens`, `68k`, `prefix`).
  - CHANGELOG [6.62.0] is frozen, so the new entry carries the update.
  - `LIMITS.md §3a` says "`/pharn-review`'s lens fan-out is unchanged", in a paragraph about `--quick`. It becomes
    stale in spirit, because this increment reduces the fan-out. That is a human-only edit (L68, Open question 5).
- **L34** — the map test asserts a non-empty map and a non-empty count-lenses set before the closure rules, and every
  derivation fixture has at least one active group.
- **L35** — one implementation forms the groups, for the command and the harness alike. The Step 4 text is the one
  copy of the task; the definition's body restates none of it. `MIN_CLI` is not bumped.
- **L36** — the map's lens set, the tools set and the agent-file set are closed both ways.
- **L37** — every Claude Code behaviour relied on is a documentation reading, labelled so. The probe executes the two
  that matter: the prefix shrinks, and the write guard fires inside the custom type.
- **L40** — the probe varies only the agent type. A confirmed eval failure is attributed by varying one axis at a time
  (alone in the custom type, alone as `general-purpose`), never read off the grouped run.
- **L41** — the helper's CLI has no option besides the record path, and a test runs exactly that path.
- **L45** — a test reading `.claude/agents/` by path cannot see that installs never receive the file. So Step 4 keeps
  a working fallback, Design §8 says what installs get, and `cli-install-agents` is named.
- **L55** — the frontmatter is byte-pinned rather than parsed by a model of Claude Code's parser. Whether Claude Code
  reads it as intended is shown only by the probe.
- **L60** — each asserted property (map invariants, derivation, frontmatter, wiring) has its own in-memory negative
  control, and every slicing anchor is asserted found.
- **L62** — the helper's refusals quote map and record values through a total function, tested with
  `{"toString":1}`.
- **L67** — the frontmatter keys come from Claude Code's documented table, and what the documentation leaves open is
  listed as known-so-far.
- **L68** — if the human takes Open question 5's `LIMITS.md` edit, it lands before `/pharn-dev-build` Step 0 or after
  `/pharn-dev-verify`.
- **L70** — the definition is harness-discovered on purpose. Its description scopes it, its body stops on a non-lens
  task, and no test mutant is written under `.claude/agents/`.
- **L71** — `## Files` has no glob bullets. Checked at this stage: `set-writes-scope.cjs --from-plan` parsed 15 paths
  from the 15 bullets. The round-0 file `.dev/features/review-lens-agent/PLAN.md` is not a bullet: this plan stage
  removed it with `git rm` in the commit that added this file, so the build never touches it and the branch's net diff
  against `main` does not contain it.

## Files

- `pharn/floor/lens-family-map.json` — **NEW.** The family map (Design §1). Product floor.
- `pharn/floor/lens-groups.mjs` — **NEW.** The grouping helper and CLI (Design §2). Product floor.
- `pharn/floor/lens-groups.test.mjs` — **NEW.** Map invariants, derivation, CLI, controls (Design §5).
- `.claude/agents/pharn-review-lens.md` — **NEW.** The lens subagent definition (Design §3). Product surface.
- `.claude/commands/pharn-review.md` — **EDIT.** Steps 3, 4 and 6 and the claims block (Design §4). Product surface.
- `.dev/floor/review-lens-agent.test.mjs` — **NEW.** Definition pins and command wiring (Design §5).
- `.dev/floor/stage-load-budget.test.mjs` — **EDIT.** The `pharn-review` row; its ceiling only if passed.
- `.dev/floor/command-hygiene.test.mjs` — **EDIT, only if** `pharn-review.md` passes 24,064 B: its
  `COMMAND_BYTE_CEILINGS` row, by the rule.
- `.dev/guides/product-commands.md` — **EDIT.** A short section: product subagent definitions, the install gap, the
  fallback rule, one copy of the task text, the family map and its helper.
- `CLAUDE.md` — **EDIT.** The bump-triggering `.claude/` list gains `.claude/agents/pharn-*.md`, and the product-command
  guidance-index line gains that path (≈100 B, under the 2,048 B per-PR budget).
- `.dev/features/review-lens-grouping/PLAN.md` — **NEW (moved).** This file.
- `.dev/features/review-lens-grouping/MEASUREMENTS.md` — **NEW.** Spawn tables, probe, evals, harness shapes.
- `CHANGELOG.md` — **EDIT.** The `## [6.64.0]` entry below.
- `SKILLS_VERSION` — **EDIT.** `6.63.0` → `6.64.0`, renumbered by diff if `main` moves.
- `README.md` — **EDIT.** The badge, and the generated `## Current state` floor-checker count, 137 → 138
  (`npm run docs:generate`, a Bash write declared here).

No trusted doc, hook, `settings.json`, lens, contract or existing floor module changes.

## Contracts satisfied

- `pharn/pharn-contracts/finding-shape.md` §Emission — unchanged. Every lens still writes its own `findings.json` at
  `pharn/features/<name>/lenses/<lens>/findings.json`, and `merge-findings.mjs` is untouched.
- The assignment record — unchanged. It records what was assigned, never which lenses shared a context. That is in
  `REVIEW.md`'s `## Lens agents` block, as self-report.
- The map and the helper's output have no contract file. Their shapes live in the helper's header and its test, as
  `lens-scanner-map.json`'s does.

## Evals to write (P1)

None. No capability changes, and neither the map, the helper nor the definition is a capability (no `role:`; `.claude/`
and data files are outside `validate.mjs`'s capability walk). The 75 committed lens eval cases are the evidence set
of Design §6.

## Guarantee audit (P0)

- "Every registered lens is in exactly one family, `trust-fence` alone, no family mixing bases" → floor: enum-regex
  (`lens-groups.test.mjs` over the committed map, `count-lenses.mjs` and `lens-scanner-map.json`), in this repo. At run
  time, the helper's shape refusal (exit 2).
- "The groups are a deterministic function of the record and the map" → floor: the helper's code, pinned by its tests.
  That the orchestrator spawns them → **advisory**.
- "The definition has these four frontmatter lines and five tools; `.claude/agents/` holds only it" → floor:
  enum-regex (the byte and set pins).
- "Step 3 runs the helper; Step 4 names the type, the fallback and the own-files rule" → floor: enum-regex (wiring
  pins). That a run follows them → **advisory**.
- "A lens in a group judges only its own files" → **advisory**. A finding outside a lens's review set is labelled
  `slice-miss` by the existing merge: detection, never prevention.
- "A `pharn-review-lens` subagent has only those tools and no project `CLAUDE.md`" → **advisory**, applied by Claude
  Code and observed by no floor primitive (the `LIMITS.md §8` class).
- "The per-review cost falls by X" → measured (spawn counts now; prefixes by the probe) or estimated; never a
  guarantee.
- "Grouping and the container leave lens findings unchanged" → **advisory**, measured on 75 cases at N=1, never on a
  real project's `CLAUDE.md` conventions.
- "An install gets the narrowed container" → **not a claim** until pharn-cli copies `.claude/agents/`.

## Trust audit (P2)

- **What a grouped context changes:** a hostile file in any member's review set reaches every member. Design §1 states
  the cost per family. `trust-fence` stays alone (floor-tested), and the security lenses stay alone (recommended).
- **The scanner-less trio** gains no exposure, because each already receives the whole target. It loses the weak
  decorrelation of separate contexts, and it has no structural backstop either way (`THREAT-MODEL.md §5` (2)).
- **The container is narrower:** no MCP, WebFetch, WebSearch, Skill or Agent tools. Bash remains, so it is a smaller
  surface, never a sandbox. It is platform-applied.
- **The project's `CLAUDE.md` leaves the lens context:** one fewer steering channel, and possibly lost conventions.
- **Inputs are unchanged:** free text from reviewed code reaches `REVIEW.md` only as quoted DATA through
  `findings.json` and the merge. The helper reads only the record's enum-like fields and paths. Its output carries
  lens and family names from the committed map; no free text from the target reaches it.
- **The definition's body is trusted instruction**, not write-protected (as `.claude/commands/**` is not). In an
  installed project `.claude/**` is reserved outside a run and refused from a plan scope (6.61.0).

## Determinism audit (P5)

- Group membership is a lookup in a committed map.
- Activity is a non-empty test over the record.
- The helper's exit code picks grouped or one-per-lens spawning.
- The type fallback reads a tool result.
- The probe's go/no-go compares two integers.

No branch is a model classification, and no fallback ends in a guess.

## SKILLS_VERSION, MIN_CLI and CHANGELOG

- **Bump: minor**, `6.63.0` → `6.64.0`. New shipped files (the map, the helper, the definition) and a changed command
  step; no contract or frontmatter shape an install reads changes.
- **`MIN_CLI`: unchanged** (Design §8).
- **CHANGELOG:** `## [6.64.0] - <date>`, `### Added`, one entry: **"`/pharn-review` runs its lenses in family groups,
  one `pharn-review-lens` subagent per group (five tools, no project `CLAUDE.md`), with a `general-purpose`
  fallback."**
  - **What changed:** the map, the helper, the definition, and Steps 3, 4 and 6.
  - **Why:** CTX-3(b), with the measured spawn counts (median 10–11 → 5) and why the old prefix figures are stale.
  - **Measured:** the spawn tables, and the probe and eval results (or "not measured", estimates labelled).
  - **Checked by:** the two new test files and their controls.
  - **Not covered:**
    - installs get grouping but not the container until `cli-install-agents`;
    - the container is platform-applied (`omitClaudeMd` needs v2.1.271+);
    - a grouped context shares one injection across its members (the per-family table), with no slice-vs-finding
      check;
    - the evals cannot show lost `CLAUDE.md` conventions;
    - the eval prompts are a harness's, not an orchestrator's.
  - **Follow-ups:** Design §7.

## Open questions (HALT)

1. **The security lenses: solo or one family?**
   - (a) **Recommended:** six solo families. They are the class an attacker most wants suppressed. Measured cost: +10
     subagents over 32 pharn-starter reviews and +19 over 40 pharn-oss reviews (+6% and +11%), median unchanged.
   - (b) One `security` family of six: 6 families, max 6 per review. One injection can then hide every vulnerability
     lens at once.
2. **The three non-fence scanner-less lenses: one `whole-target` family or solo?**
   - (a) **Recommended:** one family. Each already sees the whole target, and all three run on every review, so
     grouping saves exactly 2 subagents per review: the largest single saving. The cost is three lenses with no
     structural backstop sharing one context.
   - (b) Solo: +2 subagents on every review (with security solo: pharn-starter 161 → 225, pharn-oss 193 → 273; median
     5 → 7).
3. **If the probe fails the 50% rule:**
   - (a) **Recommended:** halt and return to GATE 1 with the numbers.
   - (b) Build grouping alone on `general-purpose`, without the definition.
4. **Contamination at GATE 2:**
   - (a) **Recommended:** report the two counts for the human to weigh. Block only on confirmed, attributed structural
     failures.
   - (b) Also block on any confirmed contamination candidate.
5. **`LIMITS.md §3a`'s "`/pharn-review`'s lens fan-out is unchanged" (human-only):**
   - (a) **Recommended:** leave it in this increment. It sits in a `--quick` paragraph, where it still reads as "quick
     mode does not change it"; a clarifying edit can follow separately.
   - (b) The human edits it, landing before build Step 0 or after verify (L68).
6. **How the probe and eval sessions run:**
   - (a) **Recommended:** route A, the orchestrator starting a session in the scratch checkout, else route B, the human
     running the pinned command.
   - (b) Route B always.
