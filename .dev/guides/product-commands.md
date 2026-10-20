# Product commands — the command budget and part files

Moved out of the always-loaded root `CLAUDE.md` at `6ff4dd1` (SKILLS_VERSION 6.46.0) by `claude-md-bootstrap`. The text is the moved text, unchanged except
for the `##` headings added for navigation and the leading indentation Prettier normalizes. The root `CLAUDE.md`
still holds the rules every session needs; this file adds detail and does not override them.

**Read when:** before planning or editing a `.claude/commands/pharn-*.md` product command or one of its part files, or a
`.claude/agents/pharn-*.md` subagent definition. `CONTRIBUTING.md` ("Editing product commands") summarizes the same rules for contributors.

## A product command keeps what a run executes

- **A product command keeps what a run executes; its rationale lives with the owner it would restate
  (6.28.2).** A `/pharn-*` command's body holds its steps, every pinned line and fenced block, its exit-code,
  verdict and stuck-point mappings, its prompts and human gates, its trusted-prefix instruction and its P2
  fences, plus ONE `## What you may claim` block — the command's floor/advisory split and its struck claims.
  Why a rule exists, version and review history, and a contract's or floor module's bounds are NOT restated
  there: they live in that contract, that module's header, the `LIMITS.md` / `THREAT-MODEL.md` section, or
  the CHANGELOG version section, and the command cites the owner (P4 — a restated bound goes stale when its
  owner changes, L25). Its `description:` is one double-quoted line saying what the command does and when
  to use it, with no claim vocabulary. The COMMAND BUDGET section of `.dev/floor/command-hygiene.test.mjs`
  holds this at the floor, bounded to BYTES and VOCABULARY: each product command's bytes against its
  measured ceiling in `COMMAND_BYTE_CEILINGS` (a table closed over the product commands on disk, both
  ways), each description against 250 bytes and a claim-vocabulary regex, and exactly one claims heading
  per command. It never judges meaning — a paraphrased claim passes, and a block's presence is not its
  truth. **Raising a ceiling is a deliberate, visible diff to that table in the PR that needs it** (the
  rule: measured bytes + 10%, rounded up to the next multiple of 512), never a quiet edit to turn a red test
  green. Since 6.70.0 the table also holds a row per `pharn-dev-*` command and its closure ranges over every
  `pharn-*.md`, so a dev command's bytes are budgeted by the same rule; the description, vocabulary and claims-block
  rules still apply to product commands only, and slimming the dev commands is the follow-up `dev-command-slim`.
- **A stage's LOAD SET is budgeted too (stage-load-budget, review finding CTX-2).** A command's file is not all a
  run of it reads. `.dev/floor/stage-load-budget.test.mjs` sums, per product stage:
  - the command family;
  - every PHARN file a step tells the model to read, load or follow (its `STAGE_LOADS` row, each entry anchored by
    its path in the command's text);
  - every registered griller (`/pharn-grill`) or lens (`/pharn-review`);
  - for `/pharn-ship`, the stage its `ROUTE_POLICY` row runs `interactive` (`/pharn-spec`).

  It holds each total to `STAGE_LOAD_CEILINGS`, by the same measured + 10% rule. A regex rule
  (`READ_RE`: read / re-read / follow / load, then a backticked `pharn/…` or `.claude/commands/…` `.md` path) makes
  a new read step name its file in the table. So adding "Read `pharn/pharn-contracts/x.md`" to a command, or
  growing a contract, griller, lens or trusted doc, can turn that test red. Its message names the row to add or
  the ceiling to raise. FLOOR: byte totals over the table's classification. NOT: what a model really reads,
  growth inside the headroom, repetition across contexts, or a read phrased in a way the regex does not match
  (its header lists them).

## A command's text a run needs at only ONE point may live in a PART file

- **A command's text a run needs at only ONE point may live in a PART file, read at that point (6.32.0).** A
  command body is sent with every later request of the conversation it was invoked in, and a file enters context
  only when the model reads it — frontmatter `reads:` loads nothing. So `/pharn-loop` and `/pharn-ship` each keep
  their entry-to-stop steps in their own file and two parts beside it: `pharn-<cmd>-quick.md` (the `--quick` deltas,
  read only for a `--quick` run, at entry) and `pharn-<cmd>-close.md` (the stop steps, the claims block and the Final
  step, read once — the loop's at its first stop, ship's with step 7's return marker after the first verify or at an
  earlier STOP). Since 6.70.0 `/pharn-ship` has a third, `pharn-ship-stages.md` (`part: stages`): `## Running a stage`,
  Step 2 after GATE 1 as one `###` section per item (Step 2.1–2.8) and Step 2b, read once when the run resumes after
  GATE 1 (its structural backstop then decides whether the SPEC is Approved); what that saves is the text held until GATE 1, never the peak after it (a part read stays in
  context). A part is a `.claude/commands/pharn-*.md` file — `pharn/ARCHITECTURE.md §4` keeps stages in commands,
  and `pharn-cli` copies every top-level `pharn-*.md` there that is not `pharn-dev-*` — recognized ONLY by its
  frontmatter (`part_of:` + `part:`), marked to be hidden from both invocation paths (`disable-model-invocation:
true`, `user-invocable: false` — documented keys; the one live probe was inconclusive), framed by a title line and an
  `<!-- end of … -->` line, and loaded by ONE pointer in its command that names its path, its loading condition, its
  trusted status, the compaction re-read and its not-loaded rule (stop; never run it from memory). The command FAMILY
  (file + parts) is the unit of change; its claims block may sit in the close part, and the budget's claims rule
  counts one block per family. `.dev/floor/command-family.mjs` splices a family back into one text for the tests (no
  shipped file imports it), and `.dev/floor/command-family.test.mjs` pins which step headings each file holds, that no
  fenced line, heading or long paragraph sits in two files of a command, each pointer's load-condition and not-loaded
  sentences, and that no other command text names a part — NOT the file of a body line under an unchanged heading.
  FLOOR: the text and the file names; ADVISORY: that a run reads a part at its point, or at all.
- **After a compaction, the orchestrators re-read the step in progress (6.70.0).** A compaction summarises the turn
  that carried the invoked command, so `/pharn-ship` and `/pharn-loop` each open with one paragraph, before their first
  `##` section: re-read the section of the command the step in progress belongs to with one pinned line,
  `node pharn/floor/command-section.mjs .claude/commands/<this command> '<heading>'`, then every part read so far, and
  read the whole file if the line fails. The line's file operand is the command itself, so `/pharn-loop`'s grant for
  it leaves only the heading free. `.dev/floor/command-hygiene.test.mjs` pins the paragraph and the one line in each;
  `pharn/floor/command-section.test.mjs` pins the extractor and that every heading of both orchestrators' files
  resolves. A new heading that two sections share by prefix fails that live test, so name headings to be unique.

## A product subagent definition lives in `.claude/agents/pharn-*.md` (6.64.0)

- **What exists.** One definition, `.claude/agents/pharn-review-lens.md`: the subagent type `/pharn-review` Step 4
  spawns each lens group as (five tools, `omitClaudeMd: true`). Its frontmatter `name:` is its type, and the file name
  takes the same `pharn-` / `pharn-dev-` split as the commands. It is product surface, so editing it bumps
  `SKILLS_VERSION`.
- **One copy of the task.** The definition's body says only its role, a scope guard, the P2 fence and its write rule;
  it restates no command step. The command's prompt carries the whole task, so the `general-purpose` fallback runs the
  same task text.
- **The fallback is a rule, not a choice.** Claude Code discovers `.claude/agents/` only in a session that started
  after the directory existed, and pharn-cli does not install it yet (follow-up `cli-install-agents`). So a command
  that names a product type also names `general-purpose` with the same prompt for when the type is not offered or a
  call is refused, and says so in its report.
- **The bytes are the measured bytes.** `.dev/floor/review-lens-agent.test.mjs` pins the definition's SHA-256 to the
  file the prefix probe measured (`.dev/features/review-lens-grouping/MEASUREMENTS.md`). Changing a byte means
  re-running that probe and re-pinning, never only the hash. The test also closes `.claude/agents/` over the one file;
  a test mutant is never written there, because a file there is a live subagent type of this repo's sessions (L70).
- **The container is whatever answers to the name.** By Claude Code's documentation (not probed), a subagent type is
  its frontmatter `name:`, so any `.claude/agents/*.md` named `pharn-review-lens`, in the reviewed tree or at user
  scope, sets the container its lenses run in; the reviewed tree's family map likewise decides which lenses share a
  context. The command's claims block names both; nothing detects either.
- **The family map and its helper.** `pharn/floor/lens-family-map.json` says which lenses share a subagent; the
  deterministic `pharn/floor/lens-groups.mjs` turns it and the assignment record into the groups Step 3 prints, and
  re-checks which grouped lenses wrote no `findings.json` this run: `absent`, or `stale` (not newer than the run's
  `assignments.json`; an mtime any writer can set, so it catches a skipped write, never a forged one).
  `pharn/floor/lens-groups.test.mjs` pins the map against `count-lenses.mjs` and `lens-scanner-map.json` (every lens
  once, `trust-fence` and the six security lenses each alone, no mixed basis), so a lens added here joins a family in
  the same PR; in an install, a lens the map does not name runs alone. A group runs its lenses one after another, so a
  review's wall clock can rise against one subagent per lens; it is not measured.
