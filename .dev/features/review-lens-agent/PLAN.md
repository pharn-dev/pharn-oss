# PLAN — review-lens-agent

- spec_content_hash: 75088a82d113bc52cdd3d5fb2e44533e81cba5f520877f5eaa441ced45fb0fd6
- applied_lessons: [L4, L13, L24, L25, L29, L33, L35, L36, L37, L40, L45, L55, L60, L67, L68, L70, L71]
- increment: `/pharn-review` Step 4 spawns each lens subagent as a project subagent type, `pharn-review-lens`
  (`.claude/agents/pharn-review-lens.md`), whose definition gives it only Read, Grep, Glob, Bash and Write and starts
  it without the project's `CLAUDE.md` files, and falls back to `general-purpose` when that type is not available.
  It addresses the undelivered half (b) of review finding CTX-3 (each lens subagent pays a fresh 68k–130k-token
  prefix), the follow-up 6.62.0 deferred as `review-lens-grouping`, by a different mechanism than grouping.
- layer(s): product command (`.claude/commands/pharn-review.md`); a new product `.claude/` file
  (`.claude/agents/pharn-review-lens.md`, `pharn/ARCHITECTURE.md §4`: stages live in commands, and this file only
  configures the container a stage's subagents run in); dev apparatus (`.dev/floor/` tests, `.dev/guides/`).
- constitution_refs: [P0, P2, P5, P6, P7]

The slug is `review-lens-agent`, not the deferred name `review-lens-grouping`: the recommended mechanism is a
narrowed subagent definition, not grouping, and a slug that names the rejected option would mislead the next reader.
Grouping stays a named follow-up (Design §7).

## The problem, re-verified this run (P6)

The 2026-10-12 review report is no longer on disk. Its records were read as DATA (P2) and each claim re-checked
against the live tree:

- `.dev/features/review-fanout/PLAN.md` Design §6 and §7, `MEASUREMENTS.md` ("What these numbers do not show"),
  `REVIEW.md` ("Follow-ups") and CHANGELOG [6.62.0] ("Not covered: the 22-subagent fan-out is NOT reduced").
- **Live code.** `.claude/commands/pharn-review.md` Step 4 reads "Spawn **one subagent per lens** (the parallel step —
  the Agent/subagent mechanism)" and names no subagent type, so each lens runs as `general-purpose`. Step 3 lets the
  orchestrator skip a scanner-bound lens whose review set (slice plus `scanner_errors` files) is empty. The four
  scanner-less lenses (`hallucinated-api`, `input-validation`, `race-condition`, `trust-fence`) always run.
  `count-lenses.mjs` reports 22 registered lenses; `lens-scanner-map.json` maps 18 of them.

### Where the per-subagent prefix figure comes from, and why it is stale (L24)

- **68k–130k** is CH1 in `.dev/measurements/pipeline-performance-audit-2026-09-29.md` §3: the first request of 29
  `general-purpose` subagents in this repo, 2026-09-23 to 2026-09-29, cache write 68,223 / 91,759 / 129,646 tokens
  (min / median / max). The same table: `Explore` agents 34,934–46,732; `claude-code-guide` 72,869–73,357. The prefix's
  composition was **not** measured.
- This repo's `CLAUDE.md` was 172,421 B then. It is **29,362 B** now (measured this run; `claude-md-bootstrap`,
  6.46.0). So CH1's range describes a configuration this repo no longer has.
- **302k** is pharn-starter's 2026-10-05 loop (`.dev/measurements/loop-wall-clock-2026-10-05.md`): every stage
  agent's first request carried 302,207–304,974 tokens, with 634,379 B of instruction files attached (`CLAUDE.md`
  418,456 B, 14 `.claude/rules/*.md` 213,290 B, `MEMORY.md` 2,633 B). Measured this run: pharn-starter's `CLAUDE.md`
  is now 41,215 B and `.claude/rules/` 251,046 B.
- `.dev/features/review-fanout/PLAN.md`'s ≈30M–60M estimate for proving grouping inherited the 68k–130k figure.

No token figure in this plan is inherited as a measurement. Each is labelled an estimate, and Open question 1 replaces
the decisive one with a measurement.

### How many lens subagents a review really spawns (measured this run)

The "up to 22" ceiling is reached only by a large target. Measured with the shipped emitter (harness below):

| Corpus (last 40 first-parent commits, each a PR diff) | Reviews with a target | Lenses with a non-empty review set: min / p25 / median / p75 / max | Reviews at 22 |
| ----------------------------------------------------- | --------------------- | ------------------------------------------------------------------ | ------------- |
| pharn-starter (a TypeScript app with PHARN installed) | 32 of 40              | 5 / 8 / 10 / 13 / 15                                               | 0             |
| pharn-oss (this repo, mostly markdown and `.mjs`)     | 40 of 40              | 4 / 8 / 11 / 12 / 16                                               | 0             |

- In pharn-starter the scanner-bound lenses hit in these many of the 32 diffs: duplicated-logic 32, magic-values 26,
  missing-error-handling 26, copy-paste-drift 25, placeholder-as-done 20, secrets-in-code 13, missing-await 12,
  null-deref 11, swallowed-exception 11, injection 9, n-plus-one 5, missing-timeout 5, unsafe-deserialization 2.
  insecure-crypto, off-by-one, path-traversal, resource-leak and ssrf never hit.
- Of the 8 pharn-starter commits without a target, six are dependency bumps whose one added or modified file is over
  the 512 KiB cap, and two have an empty diff against their parent.
- **Past real runs agree.** pharn-starter has 15 committed `/pharn-review` runs (2026-09-15 to 09-22,
  `pharn/features/*-review/`). Their `REVIEW.md` verdict lines self-report 4 to 13 lenses run or contributing of 22
  registered. That is self-reported DATA, but it matches the measurement: orchestrators already skip empty review
  sets.

So a PR-sized review costs about **10 × the per-subagent prefix**: ≈0.7M–1.3M tokens at CH1's range, ≈3M at
pharn-starter's 2026-10-05 302k (estimates; both prefixes predate the `CLAUDE.md` shrinks above).

**Harness (scratch, gitignored, deleted before any lint run).** `.pharn/review-lens-agent/measure/count-spawns.mjs`
imports `computeAssignments` from this worktree's `pharn/floor/render-review-assignments.mjs`. For each commit it
writes the commit's own added or modified blobs (`git cat-file`, the emitter's 512 KiB and NUL-sniff rules applied)
into a temp tree with `pharn/floor` symlinked in, runs the 18 scanners once each, and counts lenses whose slice or
`scanner_errors` is non-empty. `past-runs.mjs` reads each committed run's `lenses/*/findings.json` and its `REVIEW.md`
verdict line. Load average 5–18 during the runs; no timing is reported.

## What Claude Code supports (documentation read 2026-10-18; not probed — L37)

Read from `https://code.claude.com/docs/en/sub-agents` and `https://code.claude.com/docs/en/prompt-caching`. Each line
is a documentation claim, never a measurement:

- **A custom subagent's system prompt is its own body:** subagents defined in `.claude/agents/*.md` "receive only this
  system prompt plus basic environment details like the working directory, not the Claude Code system prompt".
- **`tools:`** narrows the tool set, built-in and MCP. With `tools` omitted, a subagent "Inherits every tool available
  to subagents", MCP tools included. Background subagents keep Read, Grep, Glob, Bash and Write, among others.
- **`omitClaudeMd: true`** starts the subagent "without the user, project, and local CLAUDE.md files in its initial
  context; managed policy files still load". It requires Claude Code v2.1.271 or later. Explore and Plan do this by
  default, which fits CH1's lower `Explore` prefix (34,934–46,732) without proving that it is the cause (L40).
- **Model:** the order is the per-invocation `model` parameter, then the definition's `model:`, then
  `CLAUDE_CODE_SUBAGENT_MODEL`, then the main conversation's model. A `general-purpose` subagent uses
  `CLAUDE_CODE_SUBAGENT_MODEL`, else the main model. So a definition with no `model:` key keeps today's choice.
- **Discovery:** Claude Code watches `.claude/agents/`. The first agent file in a directory that did not exist at
  session start needs a restart. Agent descriptions load at startup and "take up context, so keep them short".
- **Forks** inherit "the same system prompt, tools, model, and message history as the main session", and their first
  request reads the parent's cache. The docs say this "drops the input isolation that subagents otherwise provide".
  Fork mode is off in `-p` and in the Agent SDK unless turned on.
- **Cache:** a non-fork subagent's first request does not read the parent's cache. Parallel sessions in one directory
  that build matching prefixes read each other's cache.
- **Not documented:** what the Agent tool does with a `subagent_type` that does not exist, and how a Claude Code
  version older than v2.1.271 treats the `omitClaudeMd` key.

**pharn-cli (read this run, `~/Projects/pharn-cli` at `12e5393`).** `src/lib/install-manifest.ts` declares the install
surfaces as a closed type, `InstallSurface` = `commands | hooks | trusted-doc | license | features-readme | contracts |
core | floor`. Its header says "a surface upstream ADDS is neither installed nor named here". So a file under
`.claude/agents/` reaches no install until pharn-cli adds that surface.

## Options surveyed

Every token figure here is an estimate at the measured median of 10 spawned lenses per review, with `P_gp` = a
`general-purpose` subagent's first-request prefix (68k–130k in CH1, about 302k in pharn-starter) and `P_custom` = the
prefix of the definition proposed below (unmeasured). Each option is justified under P7 by CTX-3, a measured cost;
none claims a guarantee (P0).

### A. Group lenses by family (the deferred `review-lens-grouping`)

- **Effect:** ≈10 subagents become ≈4–5 (a family with no member to spawn spawns nothing). Saves ≈5.5 × `P_gp` per
  review: ≈0.4M–0.7M at CH1's range, ≈1.7M at 302k.
- **Risk:**
  - Cross-lens contamination: a grouped lens emitting on another lens's concern.
  - Dilution: one context carrying 4–7 lens files (≈15–25k tokens) and the union of their slices.
  - **P2, which the 6.62.0 plan did not weigh:** one hostile file in a shared context can steer every lens in the
    group at once. That is the suppression channel (`THREAT-MODEL.md §5` (2)), which today must succeed once per lens.
    `trust-fence`, the attempt-0 probe, must stay alone either way.
- **Evidence and cost:** per-case equivalence over the 75 lens eval cases, SOLO against GROUPED. The 6.62.0 estimate
  was 450 runs and ≈30M–60M tokens, on the stale prefix. It also assumed `/pharn-dev-eval` can run that comparison.
  It cannot as written: `/pharn-dev-eval` runs ONE lens as a top-level `claude -p --append-system-prompt <lens body>`
  session (Procedure step 5), which is neither a `/pharn-review` subagent nor a group. Any container comparison needs
  a new harness.
- **Decision:** deferred again (Open question 5). B shrinks the very prefix grouping saves on, so A's value is
  measured after B.

### B. A narrowed project subagent definition per lens (RECOMMENDED)

- **Effect:** each spawned lens pays `P_custom` instead of `P_gp`. The definition drops the Claude Code system prompt
  (replaced by a body of ≈1.5 KB), every tool but five (MCP tools and their listing included), and the project's
  `CLAUDE.md` files (in pharn-starter today ≈292 KB of `CLAUDE.md` plus rules, ≈73k tokens at bytes/4 — rules with a
  `paths:` scope load later, so the start-up share is smaller).
  - `P_custom` estimate: 5k–47k. The upper end is CH1's `Explore` prefix, which already omits `CLAUDE.md` but keeps
    its own system prompt and an inherited tool pool.
  - Saving per review: ≈0.2M–1.25M at CH1's range; up to ≈2.5M–3M where `P_gp` is near 302k.
  - It composes with A: grouping later would multiply a much smaller prefix.
- **Risk:**
  - **Finding quality.** The lens loses the Claude Code system prompt and the project's `CLAUDE.md` conventions,
    which can change its judgment. The delegation prompt (Step 4), the lens file, the slice and the installed skills
    are unchanged.
  - **Distribution.** pharn-cli does not install `.claude/agents/`, so installs keep today's cost until it does. A
    fallback keeps them working.
  - **Platform.** `omitClaudeMd` needs v2.1.271+. Older versions and an unknown `subagent_type` are undocumented.
  - **Discovery (L70).** The type is listed to every session in a project holding the file, so the main agent could
    delegate unrelated work to it. The description scopes it, which is advisory.
- **P2:** net narrower. The lens cannot reach MCP tools, WebFetch, WebSearch, Skill or Agent. Bash remains, and Bash
  can do anything a shell can, so this is a smaller tool surface, never a sandbox. Each lens still runs alone in a
  fresh context.
- **Evidence and cost:** Open questions 1 and 2, ≈0.1M–0.3M plus ≈4M–7M tokens (estimates).

### C. Forks (`subagent_type: fork`)

- **Effect:** each fork's first request reads the orchestrator's cache, so the prefix is billed at the cached rate.
  The tokens processed do not shrink: each fork carries the whole orchestrator conversation, which in a user's
  session can be far larger than `P_gp`.
- **Risk:** the docs say a fork "drops the input isolation". Every lens would inherit everything the user's session
  held before `/pharn-review`, plus the main session's exact tool pool and model. Fork mode is also off in `-p` and the
  SDK.
- **Decision:** rejected. Isolation is what P2 asks of a context that reads untrusted code.

### D. Run the lenses inline in the orchestrator

- **Effect:** saves every prefix.
- **Risk:** the orchestrator loads 22 lens files (305,080 B, ≈76k tokens) plus every slice into one context that
  every later request re-sends. Untrusted code would enter the context that runs the merge and renders `REVIEW.md`,
  which Step 3b keeps out today. Cross-lens contamination is at its maximum, and nothing runs in parallel.
- **Decision:** rejected (P2).

### E. Make Step 3's "may skip" a "must skip"

- **Effect:** none measurable. Fifteen past runs already spawned 4–13 lenses, and a lens with an empty review set
  has nothing to review, so its findings are the same either way.
- **Decision:** not adopted. No failure triggers it (P7).

### F. Route lenses to a cheaper model

- **Effect:** changes the price per token, not the token count.
- **Decision:** out of scope. The maintainer runs every stage on opus, and a routed model is requested, never
  observed (`LIMITS.md §8`).

### G. Slim what each lens reads after its prefix (a lens-body extract, like `griller-extract.mjs`)

- **Effect:** the lens file (11–17 KB) plus `pharn/CONSTITUTION.md` (8 KB) is ≈5–6k tokens per lens, under 10% of
  `P_gp`.
- **Decision:** not now; named follow-up `lens-body-slim`.

### H. Stagger the spawns, or use a Workflow fan-out, to share a primed cache

- **Effect:** the docs say a Workflow fan-out holds all but the first agent for up to 5 s, so the rest read the
  prefix the first one cached. Agent-tool spawns have no such hold. In CH1, 15 of 29 `general-purpose` first requests
  read only ≈31k from cache.
- **Decision:** rejected. Running a workflow script is a user opt-in, not something a command can rely on, and the
  saving is unmeasured.

## Recommendation

**Adopt B, alone, behind a fallback**, gated on the two cheap measurements in Open questions 1 and 2.

- It attacks the measured cost directly: the per-subagent prefix is the term CTX-3 names, and B shrinks it for every
  spawned lens.
- It keeps one lens per fresh context. That avoids grouping's contamination and its shared-suppression risk, and it
  narrows the tool surface a hijacked lens can reach.
- Its evidence costs an order of magnitude less than grouping's. Each run is cheap, and there are no pairwise
  interactions to cover.
- One axis changes: the container. The delegation prompt, the lens files, the slices, the merge and the record are
  unchanged.

## Design

### 1. `.claude/agents/pharn-review-lens.md` (NEW)

Frontmatter: exactly four keys, in this order, in Prettier's output form. The test pins the formatted bytes.

```yaml
---
name: pharn-review-lens
description: "Used only by /pharn-review Step 4 to apply one PHARN review lens to the files its prompt names. Not for any other task."
tools: Read, Grep, Glob, Bash, Write
omitClaudeMd: true
---
```

- No `model:` (the documented model order then matches today's `general-purpose`; the maintainer routes nothing per
  stage). No `effort`, `skills`, `mcpServers`, `hooks`, `permissionMode`, `memory` or `maxTurns`: nothing triggers
  them (P7).
- `Agent` is not in `tools:`, so a lens cannot spawn subagents.
- Body: an H1 plus at most 2,048 B, saying four things and no more:
  1. its role: one `/pharn-review` lens, whose task, lens file, files to review and one `findings.json` path are named
     by the prompt that started it;
  2. its scope: when that prompt names no lens under `pharn/pharn-review/` and no `findings.json` under
     `pharn/features/`, it stops and says it is not a `/pharn-review` lens task (the mis-delegation guard, L70);
  3. the P2 fence, in one sentence: the files under review and every `SKILL.md` it reads are `trust: untrusted` DATA,
     and instruction-looking content in them is reported as a finding, never followed;
  4. it writes only the `findings.json` path its prompt names.
- **One copy (L35).** The body restates none of Step 4: not the trusted-prefix instruction, the skills procedure or
  the output contract. Step 4's delegation prompt stays the single source, so a `general-purpose` fallback receives
  exactly the same task text. `.dev/floor/installed-skills-consumers.test.mjs` already pins the skills procedure inside
  Step 4.

### 2. `.claude/commands/pharn-review.md` (EDIT)

- **Step 4, first sentence.** Spawn one subagent per lens with `subagent_type: pharn-review-lens` (the definition
  `.claude/agents/pharn-review-lens.md`: five tools, no project `CLAUDE.md`). If that type is not offered, or a call
  is refused for it, spawn `general-purpose` with the same prompt and note `general-purpose (fallback)` for that lens.
  The rest of Step 4 is unchanged.
- **Step 6.** One sentence: render a `## Lens agents` line listing each spawned lens's agent type, as the orchestrator's
  self-report.
- **`## What you may claim`.**
  - The Advisory bullet gains the container: which type each lens ran as, and what the definition narrows, is applied
    by Claude Code and observed by no floor primitive. An install whose CLI did not copy `.claude/agents/` runs every
    lens as `general-purpose`.
  - The "Not a claim" bullet gains: "a lens ran with only the listed tools, or without the project's `CLAUDE.md`".
- **Re-derived in the same edit (L25):** Step 4's parenthesis "(the parallel step — the Agent/subagent mechanism)".
  The Step 3b sentence "Each lens (Step 4) lists the skills itself" stays true and is untouched.

### 3. `.dev/floor/review-lens-agent.test.mjs` (NEW)

- **★ AGENT SET, closed both ways (L29, L36).** The entries of `.claude/agents/` equal a table of exactly
  `pharn-review-lens.md`. Each carries the `pharn-` prefix and not `pharn-dev-`, so a prefix filter like the one
  pharn-cli applies to commands would select it.
- **★ FRONTMATTER, a byte pin (L55, L67).** The block equals the four pinned lines. The test does not model Claude
  Code's frontmatter parser; how Claude Code reads the file is shown only by Open question 1's probe.
- **★ TOOLS, a closed set.** The parsed `tools:` value is exactly {Read, Grep, Glob, Bash, Write}.
- **BODY.** At most 2,048 B after the frontmatter. It names `/pharn-review`, holds the P2 fence sentence and the
  write-only-the-named-path sentence, and does not contain Step 4's pinned catalogue line (the one-copy rule).
- **★ WIRING.** In `pharn-review.md`:
  - Step 4 contains `subagent_type: pharn-review-lens`, the path `.claude/agents/pharn-review-lens.md`, and the
    fallback sentence naming `general-purpose`;
  - Step 6 contains the `## Lens agents` line;
  - the claims block contains the container line.

  Every section anchor is asserted found before it is sliced (L60).

- **Negative controls (L60), one per asserted property, all in-memory string mutants:** a sixth tool, `Agent` added,
  `mcp__x` added, `Write` dropped, `omitClaudeMd` removed or set `false`, a fifth key, a second agent file, a body
  without the fence, a Step 4 without the fallback, a renamed Step 4 heading. No mutant is ever written under
  `.claude/agents/`, because that path is harness-discovered (L70).

### 4. Budgets

- `.dev/floor/stage-load-budget.test.mjs`: the `pharn-review` `STAGE_LOADS` row gains
  `.claude/agents/pharn-review-lens.md`. It is bytes PHARN ships into every lens context, and Step 4 names the path,
  so the L3 anchor holds. The ceiling (375,808 B) moves only if the measured total passes it, by the rule (measured +
  10%, rounded up to a multiple of 512).
- `.dev/floor/command-hygiene.test.mjs`: `pharn-review.md` is 23,886 of its 24,064 B ceiling, so the Step 4, Step 6
  and claims edits will likely pass it. The `COMMAND_BYTE_CEILINGS` row is then raised by the same rule, as a visible
  diff.

### 5. Guides and `CLAUDE.md` (apparatus; the standing convention only — `LIMITS.md §3f`)

- `CLAUDE.md`:
  - The "SKILLS_VERSION discipline" bullet that lists the product `.claude/` surface gains
    `.claude/agents/pharn-*.md`, so a later edit of the definition bumps (L29).
  - The guidance-index line for product commands gains "or a `.claude/agents/pharn-*.md` definition".

  Together that is about 100 B, under the 2,048 B per-PR growth budget.

- `.dev/guides/product-commands.md`: one new section, at most ≈900 B.
  - What a product subagent definition is.
  - That pharn-cli does not install `.claude/agents/` (`install-manifest.ts`, `InstallSurface`), so a command naming
    one must work without it, and `MIN_CLI` is unchanged (a degraded install, not a broken one —
    `.dev/guides/versioning.md`).
  - That its body restates no step of the command.
  - That `review-lens-agent.test.mjs` pins it.

### 6. Measurements at build (each only if its open question is answered yes)

- **The probe (Open question 1), before build, in a scratch checkout of `main` holding the §1 file at session start.**
  - One `claude -p` session spawns one `pharn-review-lens` and one `general-purpose` subagent, each with the same
    one-line task.
  - The `pharn-review-lens` subagent also attempts one `Write` to a path the fail-closed default denies (for example
    `pharn/floor/lens-agent-probe.mjs`).
  - Recorded: each subagent's first-request usage per token class, read from its transcript with
    `node .dev/features/pipeline-performance-audit/audit.mjs --prefix`, and the guard's deny for the probe write (the
    project hooks fire inside the custom subagent).
  - Go/no-go: build only if `P_custom` ≤ 50% of `P_gp` measured in the same session. The probe varies only the agent
    type (L40).
- **The lens-eval run (Open question 2), after build, before GATE 2.**
  - Each of the 75 cases (`pharn/pharn-review/*/evals/cases/*`) runs once as a `pharn-review-lens` subagent spawned
    from a scratch `claude -p` harness, writing `findings.json` to a scratch path. `trust-fence`'s one case runs 5
    times, the bar its live history set (L4).
  - Each result is scored with `pharn/floor/check-structural.mjs` against its `expected/*.json`.
  - A case that fails structurally is re-run 3 times in each container (L40). It blocks GATE 2 when it fails as
    `pharn-review-lens` and passes as `general-purpose`. When it fails in both, it is reported as a pre-existing
    lens or eval defect.
- Results, both harnesses' shapes and this plan's spawn counts go to `.dev/features/review-lens-agent/MEASUREMENTS.md`.
  The harnesses stay scratch under `.pharn/review-lens-agent/`, as `review-fanout`'s did.

### 7. Not in this increment (named follow-ups)

- `cli-install-agents` (pharn-cli repo): install `.claude/agents/pharn-*.md` as a declared surface, with its
  orphan and update handling. This is what makes the saving reach installs.
- `review-lens-grouping`: kept, re-scoped to "measure after `review-lens-agent`". Its value is ≈5.5 × `P_custom`
  once B lands.
- `lens-body-slim`: option G.
- The `/pharn-dev-eval` harness gap (option A): it runs a lens top-level, not as a `/pharn-review` subagent.

## Applied lessons

- **L4** — the definition changes the container a lens runs in, so a green test over the file proves the plumbing,
  never the lens. Adoption evidence is a live run of the 75 lens eval cases in the new container (Open question 2),
  scored by `check-structural.mjs`. The eval cases run in this repo cannot measure what omitting a real project's
  `CLAUDE.md` does to judgment; that is stated as a bound.
- **L13** — this stage formats its own artifact (`prettier --write`, `markdownlint-cli2 --no-globs --fix` on
  `PLAN.md` only), never repo-wide.
- **L24** — the 68k–130k and 302k prefixes were measured on configurations that have since changed (`CLAUDE.md`
  172,421 → 29,362 B here, 418,456 → 41,215 B in pharn-starter). No cost figure is carried as a measurement. The probe
  measures both containers back to back in one session, and the CHANGELOG states only probe numbers or labelled
  estimates.
- **L25** — every sentence that described the superseded spawn is re-derived in the same edit: Step 4's "(the
  parallel step — the Agent/subagent mechanism)" and the claims block's advisory bullet. Sentences that stay true
  (Step 3b's "each lens lists the skills itself", the stage-load-budget header's "the Constitution in each of up to 22
  lens subagents") are checked and left.
- **L29** — two sets are enumerated where the rules range over them: the agent files under `.claude/agents/` (a
  table the test closes both ways) and the bump-triggering product surface in `CLAUDE.md`, which gains the new path
  class so a later edit of the definition bumps.
- **L33** — the claims that expire when this lands were swept with short invariant substrings (`fan-out`,
  `subagent per lens`, `68k`, `prefix`). CHANGELOG [6.62.0] "Not covered" is frozen, so the new entry carries the
  update. `LIMITS.md §3a` ("`/pharn-review`'s lens fan-out is unchanged"), §3b ("each fresh sub-agent re-pays") and
  §3d stay true, because the fan-out's breadth is unchanged and only each subagent's prefix shrinks.
- **L35** — the lens task text has one copy, Step 4's delegation prompt. The definition's body holds only the role,
  the scope guard, the fence and the write rule, so the `general-purpose` fallback and the custom type receive the
  same task. `MIN_CLI` is not bumped: the fallback makes an older install degraded, not broken.
- **L36** — the `tools:` value and the agent-file set are pinned as closed sets, both directions, never as
  per-member presence.
- **L37** — every Claude Code behaviour this plan relies on (tool narrowing, `omitClaudeMd`, the model order) is a
  documentation reading, labelled so. The probe executes the one claim the go/no-go rests on (the prefix shrinks) and
  one the trust model rests on (the write guard fires inside the custom subagent).
- **L40** — the probe varies only the attributed condition, the agent type, in one session. A lens-eval failure in
  the new container is attributed only after the same case is re-run as `general-purpose`.
- **L45** — a test that reads `.claude/agents/pharn-review-lens.md` by path cannot see that no install receives it:
  pharn-cli's surface list is the layer that ships it. So the command keeps a working fallback, the guide records the
  gap, and `cli-install-agents` is named. The CHANGELOG says plainly that installs keep today's cost until then.
- **L55** — the test pins the frontmatter's bytes instead of modelling Claude Code's parser. Whether Claude Code
  reads the file as intended is shown only against Claude Code itself, by the probe.
- **L60** — each asserted property in the new test has its own in-memory negative control (§3 lists them), and every
  section anchor is asserted found before slicing.
- **L67** — the frontmatter keys come from Claude Code's documented key table, and the plan records what the
  documentation leaves open (an unknown `subagent_type`, `omitClaudeMd` before v2.1.271). That bound list is
  known-so-far, never complete.
- **L68** — no trusted doc needs an edit (L33's line above). If the human wants `LIMITS.md §3a` to mention the
  narrowed container, that human-only edit must land before `/pharn-dev-build` Step 0 or after `/pharn-dev-verify`.
- **L70** — the definition sits in a harness-discovered path on purpose, so its description scopes it to `/pharn-review`
  Step 4, its body stops on a task that is not a lens task, and every test mutant stays in memory, never under
  `.claude/agents/`.
- **L71** — `## Files` names every path explicitly, with no glob bullets. Checked at this stage:
  `set-writes-scope.cjs --from-plan` parsed 12 paths from the 12 bullets (the plan-only scope was then restored).

## Files

- `.claude/agents/pharn-review-lens.md` — **NEW.** The lens subagent definition (Design §1). Product surface.
- `.claude/commands/pharn-review.md` — **EDIT.** Step 4's subagent type and fallback, Step 6's `## Lens agents` line,
  the claims block (Design §2). Product surface.
- `.dev/floor/review-lens-agent.test.mjs` — **NEW.** The pins and negative controls of Design §3.
- `.dev/floor/stage-load-budget.test.mjs` — **EDIT.** The `pharn-review` `STAGE_LOADS` row; its ceiling only if the
  measured total passes it.
- `.dev/floor/command-hygiene.test.mjs` — **EDIT, only if** `pharn-review.md` passes its 24,064 B ceiling: the one
  `COMMAND_BYTE_CEILINGS` row, by the rule.
- `.dev/guides/product-commands.md` — **EDIT.** The product subagent definition section (Design §5).
- `CLAUDE.md` — **EDIT.** Two clauses (Design §5).
- `.dev/features/review-lens-agent/PLAN.md` — **NEW.** This file.
- `.dev/features/review-lens-agent/MEASUREMENTS.md` — **NEW.** The spawn counts above, the probe and the lens-eval
  results (or a statement that they were not run), and both harnesses' shapes.
- `CHANGELOG.md` — **EDIT.** The `## [6.64.0]` entry below.
- `SKILLS_VERSION` — **EDIT.** `6.63.0` → `6.64.0`, renumbered by diff if `main` moves before the merge.
- `README.md` — **EDIT.** The version badge only. No generated region changes: the catalog does not enumerate
  `.claude/agents/`.

No file under `pharn/` changes, and no trusted doc, hook or `settings.json`.

## Contracts satisfied

- `pharn/pharn-contracts/finding-shape.md` §Emission — unchanged. Each lens still writes the same `findings.json`, and
  `merge-findings.mjs` is untouched.
- The assignment record (`render-review-assignments.mjs`, `check-review-assignments.mjs`) — unchanged. The record says
  what was assigned, never which container ran.

## Evals to write (P1)

None. No capability changes, and the definition is not a capability: it carries no `role:` (`count-lenses.mjs` and
`validate.mjs` exclude `.claude/` wholesale). The 22 lenses' 75 committed eval cases are the evidence set for Open
question 2.

## Guarantee audit (P0)

- "The definition has exactly these four frontmatter lines and these five tools" → floor: enum-regex, the
  byte-and-set pins of `review-lens-agent.test.mjs`, over the committed file.
- "`.claude/agents/` holds exactly this one PHARN definition" → floor: enum-regex (the closed table).
- "Step 4 names the type, its path and the fallback" → floor: enum-regex (the wiring pins). That the orchestrator
  makes that call → **advisory**.
- "A `pharn-review-lens` subagent has only those tools, no Claude Code system prompt and no project `CLAUDE.md`" →
  **advisory**. Claude Code applies it, and no PHARN floor primitive observes it (the same class as `LIMITS.md §8`'s
  model routing). The probe is a measurement, never a guarantee.
- "Each lens's prefix shrinks from X to Y" → measured once by the probe, or an estimate; never a guarantee.
- "Lens findings are unchanged" → **advisory**, measured on 75 eval cases at N=1 (trust-fence N=5) if Open question 2
  is answered yes. It says nothing about a real project's `CLAUDE.md` conventions.
- "An install receives the definition" → **not a claim**. pharn-cli does not copy `.claude/agents/`.

## Trust audit (P2)

- **Inputs are unchanged.** Untrusted code and `SKILL.md` bodies still reach a lens only through its own tool calls,
  in its own fresh context. Their free text still reaches `REVIEW.md` only as quoted DATA through `findings.json`
  and the merge.
- **The container is narrower.** No MCP tool, no WebFetch or WebSearch, no Skill, no Agent. That shrinks what a
  hijacked lens can reach. Bash remains, so a hijacked lens can still do anything a shell can (egress included). This
  is a smaller surface, never a sandbox, and it is platform-applied (advisory).
- **The project's `CLAUDE.md` leaves the lens context.** It is user-authored and not PHARN-vetted, so removing it
  removes one steering channel. It can also remove conventions a lens used to judge correctly, which the eval cases
  cannot measure.
- **The definition's body is trusted instruction**, loaded as every lens's system prompt. It is not on
  `protect-trusted-paths.cjs`'s list, which is the same posture as `.claude/commands/**`. In an installed project,
  `.claude/**` is reserved outside a run and refused from a plan-sourced scope (6.61.0), which covers the new path by
  prefix.
- **`trust-fence`, the attempt-0 probe, still runs alone.** Only its container changes. Its injection case is the
  one Open question 2 runs five times.
- **The Step 6 `## Lens agents` line is the orchestrator's self-report**, rendered as a plain list of enum-like
  values (`pharn-review-lens` | `general-purpose (fallback)`). No free text from a lens reaches it.

## Determinism audit (P5)

- Lens membership is still `count-lenses.mjs`, and each slice is still the record's.
- The one new branch is the fallback: the Agent call for `pharn-review-lens` is refused or the type is not offered,
  so `general-purpose` runs with the same prompt. The branch reads a tool result, not a classification. It is
  advisory orchestration, and its terminal state is today's behaviour, not a guess.
- The probe's go/no-go is a comparison of two measured integers.

## SKILLS_VERSION, MIN_CLI and CHANGELOG

- **Bump: minor**, `6.63.0` → `6.64.0`. The increment adds a newly shipped product file (the definition) and changes
  a shipped command step. It changes no contract or frontmatter shape an existing install reads.
- **`MIN_CLI`: unchanged.** An older CLI omits `.claude/agents/`, and Step 4's fallback runs today's
  `general-purpose` spawn. That install is degraded, not broken (`.dev/guides/versioning.md`).
- **CHANGELOG:** a `## [6.64.0] - <date>` section with one `### Added` entry, **"`/pharn-review` runs each lens as a
  `pharn-review-lens` subagent: five tools, no project `CLAUDE.md`, a general-purpose fallback."** Its parts:
  - **What changed:** the definition, Step 4's type and fallback, and Step 6's line.
  - **Why:** CTX-3's second half, with the measured spawn counts (4–16, median 10–11 per PR diff) and the reason the
    older prefix figures are stale.
  - **Measured:** the probe's numbers and the lens-eval results, or "not measured" with the estimates labelled as such.
  - **Checked by:** `review-lens-agent.test.mjs` and its controls.
  - **Not covered:**
    - installs do not receive the file until pharn-cli adds `.claude/agents/` (`cli-install-agents`), so they keep
      today's cost;
    - tool narrowing and `CLAUDE.md` omission are applied by Claude Code (v2.1.271+ for `omitClaudeMd`) and observed
      by nothing in PHARN;
    - the eval cases cannot measure the loss of a real project's `CLAUDE.md` conventions;
    - the fan-out's breadth is unchanged;
    - grouping is still deferred.
  - **Follow-ups:** Design §7.

## Open questions (HALT)

1. **Run the prefix probe before build?** It costs ≈0.1M–0.3M tokens (an estimate) for one `claude -p` session and
   two one-line subagents in a scratch checkout (Design §6).
   - (a) **Recommended:** yes, before build. Build only if `P_custom` ≤ 50% of `P_gp` in the same session, and
     record the deny of the probe's out-of-scope write.
   - (b) Run it at build, after the file is written. This costs the build first.
   - (c) Do not run it. The CHANGELOG then states the effect as an estimate only.
2. **Run the lens eval cases in the new container before GATE 2?** It costs ≈4M–7M tokens (an estimate, counted as
   the 6.62.0 plan counted: first-request prefix plus work, cache re-reads excluded).
   - (a) **Recommended:** yes. All 75 cases at N=1, `trust-fence` at N=5, and the attribution re-runs of Design §6.
     A case that fails only in the new container blocks the merge.
   - (b) Yes, at N=3 for every case: ≈12M–20M tokens, which shows flakiness as well as gross regressions.
   - (c) No. Ship with "no live lens run measured" in the CHANGELOG, as 6.63.0 did for the grill.
3. **Distribution, given that pharn-cli does not install `.claude/agents/`.**
   - (a) **Recommended:** merge with the `general-purpose` fallback, keep `MIN_CLI` unchanged, and open the pharn-cli
     follow-up `cli-install-agents`.
   - (b) Hold this PR until pharn-cli ships the surface, then bump `MIN_CLI`. That blocks on another repo and turns a
     degraded install into a refused one.
4. **Start the lens without the project's `CLAUDE.md` (`omitClaudeMd: true`)?**
   - (a) **Recommended:** yes. A lens's inputs are its lens file, its slice and the installed skills Step 4 already
     feeds it. `CLAUDE.md` is the largest removable share in a real install (≈73k tokens at bytes/4 in pharn-starter
     today). The judgment cost is stated as a bound.
   - (b) No. Narrow the tools and replace the system prompt only, and keep `CLAUDE.md`. The saving is smaller, and the
     lens keeps project conventions.
5. **Lens grouping.**
   - (a) **Recommended:** keep it deferred, re-scoped as `review-lens-grouping` to be measured after this lands (its
     value becomes ≈5.5 × `P_custom`).
   - (b) Build grouping now on top of B. That is two axes in one attempt, and the 6.62.0 plan's evidence cost.
