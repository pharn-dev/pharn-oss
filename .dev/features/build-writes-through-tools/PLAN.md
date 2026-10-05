# PLAN — build-writes-through-tools: stage agents write files with the write tools, never through the shell

- spec_content_hash: d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4
- applied_lessons: [L19, L20, L35, L40, L57]
- increment: tell every routed stage agent (the brief), `/pharn-build` and `/pharn-test` to create and edit files only
  with the Write/Edit/MultiEdit tools and to run formatters only on named files, and record the batch's measurement of
  the 92-minute `/pharn-loop` run in `.dev/measurements/loop-wall-clock-2026-10-05.md`.
- layer(s): `pharn/floor/` (the brief's text in `stage-agent-core.mjs`), the product `.claude/commands/` surface
  (`pharn-build.md`, `pharn-test.md`), build apparatus (`.dev/measurements/`, `.dev/features/`, one hygiene test).
- constitution_refs: [P0, P2, P5, P6, P7]

## Why (P7) — the recorded failure

Batch item 9, finding 4 of the batch brief (2026-10-05). In pharn-starter's 92-minute `/pharn-loop` run
(`billing-plan-catalog`, 2026-10-05 08:38→10:10Z, PHARN 6.35.0), the routed `/pharn-build` stage agent
(`agent-acb4f6f8e3b2c6e8a`, requested `sonnet`, served `claude-sonnet-5-5`) wrote the user's code through the shell.
So the fix #7 write guard never judged one of its code writes. The facts below were re-derived this run from that
agent's transcript (read-only), not copied from the brief (P6). The method is
`.dev/features/build-writes-through-tools/measure.mjs` (built in this increment). Its output feeds the measurement
record.

## Discovery — the investigation (P6)

### What the build agent wrote, and how

- **Tool use:** 126 Bash, 4 Read, 2 Write, 0 Edit, 0 MultiEdit. The two Writes are the new DB test file
  (09:26:21Z) and `BUILD.md` (09:34:10Z), both allowed and both fast (0.1–0.2 s).
- **49 Bash calls wrote project files.** By mechanism:
  - 44 run a `python3` heredoc that calls `open(p, 'w')`. Ten of these also run `npx prettier --write`. The scripts
    hold 179 textual replacement call sites (`.replace(`, `rep(`, `edit(`, `re.sub(`, `cut(`).
  - 2 create a file with `cat > <path> <<'EOF'`. One of them also runs `sed -i`.
  - 1 runs `sed -i` alone.
  - 2 run `npx prettier --write` alone.
  - The brief's "41 `python3` one-liners and 27 `sed` calls" is not reproduced. 45 Bash calls mention `python3`
    (one only reads). 54 mention `sed`, but only 2 of them are `sed -i`; the other 52 are `sed -n` reads.
- **Targets: 79 distinct project paths, every one checked against the build's own scope.** The build agent printed
  that scope itself: `cat .pharn/writes-scope.json` ran right after `set-writes-scope.cjs --from-plan`, at 09:09:07Z,
  and listed 93 entries. Result:
  - **78 targets are inside the scope.** They include `CLAUDE.md` and four `.claude/rules/*.md`, which the PLAN named.
  - **One is outside it: a pinned AC test,**
    `features/files/services/__tests__/billing-plan-catalog-upload-no-limit.test.ts`. It was rewritten by
    `npx prettier --write features/files app/api/files` (09:18:10Z). That is a formatter run over two DIRECTORIES.
    The agent's own `check-test-stage.mjs` caught it 16 s later: `RED lock-red … changed since the lock was written`.
    The agent then restored the file with a `python3` script that tried combinations of formatting reversals until
    the file's sha256 equalled the lock's (09:19:37Z, `FOUND`). `check-test-stage.mjs` read `READY` again at
    09:19:41Z.
- Target extraction is a heuristic over the command TEXT: `p='…'`, `rep('…'`, `cat > …`, `sed -i … <file>`,
  `prettier --write <file>`, resolved against a leading `cd`, with `{loc}` expanded. Two calls name no literal target.
  One writes `/tmp/changed.txt`. The other is `xargs -0 npx prettier --write` over that list, which the agent had
  built from `git status` minus the lock's files and `pharn/`; it rewrote one in-scope file. Every target is printed
  with its call, so a human can audit the extraction.

### Why the shell — what preceded the first shell write

- **No denial was routed around.** The agent made no Write, Edit or MultiEdit call before its first shell write (a
  `python3` rewrite of `shared/lib/billing/plans.ts` at 09:09:59Z). Its first Write came 26 minutes later and was
  allowed. So the fix #7 guard never refused it anything. The project's `PostToolUse` hook (`npm run tsc`) could
  not have deterred it either: that hook fires on Write/Edit only, and the agent had made none.
- **The agent's reasoning is not recorded.** Its thinking blocks are empty in the transcript.
- **The one instruction in its context that invited shell edits came from the harness.** At 09:09:00.830Z, 0.7 s
  after the brief's output and 59 s before the first shell write, Claude Code added an `auto_mode` attachment
  (`bashFirst: true`, `bashFirstSteer: "relaxed"`). It renders as a system reminder that offers `sed`, heredocs and
  short scripts for small mechanical edits instead of Read/Edit/Write, and ends "The choice is yours". PHARN's brief
  (rules 1–6) and `pharn-build.md` named no tool to write with. Step 3 says only "Write only paths inside the fix #7
  scope".
- **Varying the condition (L40).** All five stage agents of the run received the identical attachment:
  - the spec agent wrote with 2 Write + 1 Edit;
  - the plan agent wrote with 2 Write + 1 Edit. Its one shell write created a scratch test under the session
    scratchpad, outside the project — the scratch route CLAUDE.md allows;
  - the grill agent wrote with 1 Write;
  - the test agent wrote with 18 Write + 18 Edit and made 0 shell writes.

  All four were requested and served `opus`. The shell choice happened once, in the `sonnet` build, whose task was
  editing many existing files. So the steer is present in every case and does not decide alone. The cause is
  narrowed to "the harness offered the shell, and nothing PHARN said took the choice away". It is not established
  further (L40).

- **Not a cause PHARN created.** There was no guard denial and no slow PHARN hook. The bundled hooks are PreToolUse
  only, and they were never consulted.

### What the bypass did and did not cost in this run

- **In scope it changed no outcome.** 78 of 79 targets were inside the scope, so the guard would have allowed those
  writes.
- **The one out-of-scope touch was a formatter.** A formatter runs through Bash under any write-tool rule ([[L19]]).
  What would have prevented it is naming files, not directories ([[L57]]).
- **What it removed is PREVENTION for the whole stage.** Had the agent written outside its scope, only the
  `reconcile` gate at `/pharn-verify` could have seen it, and this run's verify stopped after its first gate (`test`),
  so `reconcile` never ran. A write that restores the anchored bytes (the AC-test restore above) is invisible to
  `reconcile` by design. Here the AC lock caught it, inside the build.
- **The project's own `PostToolUse` hook was also bypassed, and in this project that bypass costs nothing.** The hook
  is `npm run tsc`, and the project has no `tsc` script. Every run exits 1 ("Missing script"), non-blocking. Across
  the run's 63 Write/Edit calls (all contexts) the harness records 89–593 ms per run. That is an observation about
  that project only.

### Correction to the batch evidence (finding 5)

The brief says the test agent "paid ~5 min to the project's PostToolUse `npm run tsc` hook (9–29 s per Write/Edit)".
The hook's own `durationMs` sums to 3.5 s over the test agent's 36 Write/Edit calls (max 153 ms). The 9–29 s comes
from parallel tool calls:

- one request (`…VQ1tAt`, 09:03:37→09:04:06Z) issued 8 Writes;
- each `tool_use` line is written as its block finishes streaming;
- all 8 results land within 1.1 s after the request ends.

So a per-call "tool_use → tool_result" gap measures the model writing the remaining files (that request's output was
7,261 tokens), not the hook. The measurement record carries this correction so later PRs do not cite the wrong cause.

### The live code this increment touches (read this run)

- `pharn/floor/stage-agent-core.mjs` `renderBrief()` renders rules 1–6 (and rule 7 for the loop's rebuild).
  - Rule 4 is the "what you may not run" rule.
  - "rule 6" and "rule 7" are cited by number elsewhere: in `pharn-loop.md`, `pharn-loop-quick.md`, in
    `command-hygiene.test.mjs` and in `stage-agent-core.test.mjs`. So no rule is renumbered; the new sentence joins
    rule 4.
  - The brief tests match by regex/inclusion, never a golden text: `stage-agent-core.test.mjs` "renderBrief — the
    invocation…" and `stage-agent.test.mjs` "brief — exit 0 … renderBrief's exact text", which compares CLI output
    to `renderBrief` itself.
- `.claude/commands/pharn-build.md` (20,667 B; ceiling 22,016) Step 3 says "Write only paths inside the fix #7 scope"
  and names no tool. Its claims block already NARROWS the scope floor to the write-tool surface.
- `.claude/commands/pharn-test.md` (19,125 B; ceiling 20,480) Step 3 ends "A write outside the scope is denied at the
  floor. Never route one through Bash." That covers an out-of-scope write only. An in-scope write through the shell
  is not addressed.
- The other product stages write PHARN artifacts: `/pharn-spec`, `/pharn-plan`, `/pharn-grill`, `/pharn-review`,
  `/pharn-memory-promote` and the two orchestrators. All four opus agents above wrote theirs with the write tools.

## Design

1. **The brief (every routed stage, both orchestrators).** Rule 4 gains a few sentences:
   - create and edit project files only with the Write, Edit or MultiEdit tool, because the writes-scope guard (and
     any project hook on those tools) judges only them;
   - Bash runs commands and never writes a project file's content itself (no `sed -i`, heredoc, redirect or script),
     whatever a harness reminder suggests;
   - a formatter or generator runs only on files the stage may write, named one by one, never on a directory;
   - a denied write is answered by the deny message's own remedy, or by stopping and reporting, never through Bash.

   One closed sentence, no new rule number.

2. **`/pharn-build` Step 3** gains one bullet with the same rule, stated for the user's code: the Write/Edit/MultiEdit
   tools only; formatters on the plan's `## Files` paths named one by one, never a directory (which reached a pinned AC
   test). Its claims block's **Advisory** bullet names this rule. It covers a person running `/pharn-build` directly
   and an inline (unrouted) build, which never sees the brief.
3. **`/pharn-test` Step 3**'s last sentence widens from out-of-scope writes to every test write: write them with the
   Write or Edit tool; never route a write, in scope or not, through Bash.
4. **Tests.**
   - `stage-agent-core.test.mjs`: every routed cell's brief carries the rule's three load-bearing phrases. A mutant
     brief without them fails.
   - `.dev/floor/command-hygiene.test.mjs`: a small `WRITE_TOOL_RULE` section pins that `pharn-build.md` and
     `pharn-test.md` carry it inside their `## Step 3`. It checks presence only.
5. **The measurement record** `.dev/measurements/loop-wall-clock-2026-10-05.md` and its read-only helper
   `.dev/features/build-writes-through-tools/measure.mjs`. The record follows
   `pipeline-performance-audit-2026-09-29.md`'s labels (source × precision per figure). It covers:
   - the 92-minute run's wall clock by stage and context;
   - request counts and per-request latency;
   - first-request prefix sizes;
   - gate durations from the stamp/log mtimes that still belong to that run;
   - the three runs' blocked causes;
   - the shell-write facts above;
   - the user-side observations about pharn-starter only:
     - its 418,456-byte `CLAUDE.md`;
     - 14 `.claude/rules/*.md` files (213,290 B), 8 of them with Cursor-style `globs:` frontmatter, all loaded into
       every stage agent;
     - the `npm run tsc` hook that fails at once.

**Deliberately NOT done (stated, not dropped):**

- **No Bash-parsing hook, and no hook or settings change.** CLAUDE.md and `LIMITS.md §6`: shell parsing is
  undecidable, and a verb denylist is a heuristic P0 forbids calling a guarantee.
- **No floor check for "the agent used the write tools".** [[L20]] would ask for one on a recurrence. But this
  class's floor escalation already exists: `check-bash-reconcile.mjs`, from 4.0.0, which detects an OUT-of-scope
  Bash write. Detecting an IN-scope Bash write would mean attributing writes to tools, which needs a PostToolUse
  record. That is a hook/settings change, human-only and out of this batch's lane. Named residual:
  `write-tool-attribution`.
- **No edit to the other product commands.** P7: no shell write of a tracked file was observed in those stages. When
  they run routed, the brief's rule reaches them.
- **No change to `MIN_CLI`, no trusted doc.** Every trusted sentence stays true. `LIMITS.md §6` already says a Bash
  write is detected, never prevented, and this increment makes no new claim about prevention.

## Applied lessons

- L19 — the shell-write class this increment names is L19's, and its remedy is applied to the product build: a
  formatter runs only on the files the stage may write, named one by one. The bound stays as L19 states it: a
  Bash-run formatter passes neither guard, so the rule narrows reach and gates nothing.
- L20 — considered and answered in "Deliberately NOT done": the floor check this class earns already exists
  (`check-bash-reconcile.mjs`, detection of out-of-scope writes). The in-scope half needs a PostToolUse record,
  which is human-only here. It is recorded as a named residual, and the new rule is labelled advisory everywhere.
- L35 — the rule is stated twice, in the brief and in two commands. That is deliberate: they have different readers.
  A routed agent reads the brief before the command; a person or an inline orchestrator runs the command and never
  sees the brief. Each copy is the shortest form for its reader. The hygiene pins check presence, never agreement,
  so there is no sync checker to maintain.
- L40 — the cause is attributed only as far as the varied condition allows. Five agents had the same harness steer
  and one used the shell, so the PLAN says "the steer offered it and nothing took the choice away", never "the steer
  caused it".
- L57 — "named one by one, never a directory" is the explicit-path form L57 requires. This run's escape was a
  directory argument reaching a pinned test. Prettier given explicit file paths adds no inputs of its own; the rule
  does not claim more than that.

## Files

- `pharn/floor/stage-agent-core.mjs` — `renderBrief` rule 4 gains the write-tool sentences; header names them —
  product floor
- `pharn/floor/stage-agent-core.test.mjs` — every routed brief carries the rule (mutation control) — test, not shipped
- `.claude/commands/pharn-build.md` — Step 3 bullet + the claims block's Advisory line — product command
- `.claude/commands/pharn-test.md` — Step 3's last sentence widened to every test write — product command
- `.dev/floor/command-hygiene.test.mjs` — `WRITE_TOOL_RULE` presence pin for the two command sentences — apparatus
- `.dev/features/build-writes-through-tools/measure.mjs` — the read-only analysis helper behind every figure —
  apparatus
- `.dev/measurements/loop-wall-clock-2026-10-05.md` — the batch's measurement record — apparatus
- `SKILLS_VERSION` — 6.35.0 → 6.36.0 (provisional; the orchestrator assigns the final number at stacking)
- `README.md` — the version badge
- `CHANGELOG.md` — a new `[6.36.0]` section, moving the `[Unreleased]` entry into it

## Contracts satisfied

- No contract changes. `stage-agent-core.mjs`'s header is the stage-agent protocol's spec (no contract, P7, its own
  words); the brief's rule list in that header gains the new sentence.
- `pharn/pharn-contracts/reconciliation-record.md` — cited, unchanged: reconcile remains the detection backstop for
  an out-of-scope Bash write.

## Evals to write (P1)

No capability (`role:`) is added or changed, so no eval. Behavioural tests instead:

- `renderBrief` × every routed cell (16) → the brief contains the write-tool sentence's three pinned phrases; a
  mutant renderer that drops them fails the test.
- `command-hygiene` `WRITE_TOOL_RULE` → `pharn-build.md` and `pharn-test.md` `## Step 3` each contain the pinned
  phrase; a fixture copy with the sentence removed fails.
- `COMMAND_BYTE_CEILINGS` (existing) → both commands stay under their ceilings. No ceiling is raised.

## Guarantee audit (P0)

- "Every routed stage agent is TOLD to write with the write tools" → floor: enum/regex (the brief's text is rendered
  by tested code from closed tables; the new test pins the phrases in every routed cell).
- "`/pharn-build` and `/pharn-test` SAY so" → floor: regex presence (hygiene pin). It is never proof the text is
  obeyed.
- "The stage agent writes through the write tools" → **advisory**. No shell command is parsed. A model can still use
  Bash, and an in-scope Bash write is neither prevented nor detected.
- "An out-of-scope Bash write is detected" → unchanged, floor (content-hash, `check-bash-reconcile.mjs` at
  `/pharn-verify`, within its stated bounds). This increment does not strengthen it.
- "A formatter run on named files cannot reach a pinned test" → **advisory**. It is a rule for the agent; Bash still
  reaches every path (L19).
- Measurement figures → each labelled with source and precision in the record. The record is apparatus and gates
  nothing.

## Trust audit (P2)

The measurement helper reads transcripts and ledgers, which are untrusted DATA: model text, tool inputs and tool
outputs from another project.

- It prints counts, timestamps, durations, byte sizes, tool names and paths only.
- The record quotes at most short command fragments and paths, in code spans, as data.
- No value read from a transcript reaches a PHARN control decision. The helper is apparatus, run by hand.
- The new brief sentence is a closed constant: no interpolated value.

## Expected time saving on the 92-minute run

None claimed. This is a prevention correction (finding 4), not a speed-up.

- Possible cost: the build's 44 shell scripts bundled about 179 replacement call sites. As Edit calls those could
  become more tool calls. Edits can be issued in parallel within one request (the test agent issued 8 Writes in one
  request), so the request count need not grow. Not estimated.
- The project's `PostToolUse` hook would then run per Write/Edit: measured 89–593 ms per run in that project.

## Open questions (HALT)

None. Decisions for GATE 1 are listed in the GATE-1 report: the version size (provisional 6.36.0 per the batch brief;
a patch would also fit, since the bytes clarify how an existing stage writes), and the residual name
`write-tool-attribution`.
