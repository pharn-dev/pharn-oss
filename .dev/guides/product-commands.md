# Product commands — the command budget and part files

Moved out of the always-loaded root `CLAUDE.md` at `6ff4dd1` (SKILLS_VERSION 6.46.0) by `claude-md-bootstrap`. The text is the moved text, unchanged except
for the `##` headings added for navigation and the leading indentation Prettier normalizes. The root `CLAUDE.md`
still holds the rules every session needs; this file adds detail and does not override them.

**Read when:** before planning or editing a `.claude/commands/pharn-*.md` product command or one of its part files. `CONTRIBUTING.md` ("Editing product commands") summarizes the same rules for contributors.

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
  green. The `pharn-dev-*` commands are outside the budget (follow-up `dev-command-slim`).

## A command's text a run needs at only ONE point may live in a PART file

- **A command's text a run needs at only ONE point may live in a PART file, read at that point (6.32.0).** A
  command body is sent with every later request of the conversation it was invoked in, and a file enters context
  only when the model reads it — frontmatter `reads:` loads nothing. So `/pharn-loop` and `/pharn-ship` each keep
  their entry-to-stop steps in their own file and two parts beside it: `pharn-<cmd>-quick.md` (the `--quick` deltas,
  read only for a `--quick` run, at entry) and `pharn-<cmd>-close.md` (the stop steps, the claims block and the Final
  step, read once — the loop's at its first stop, ship's with step 7's return marker after the first verify or at an
  earlier STOP). A part is a `.claude/commands/pharn-*.md` file — `pharn/ARCHITECTURE.md §4` keeps stages in commands,
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
