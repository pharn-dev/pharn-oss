# PLAN — orchestrator-context

- spec_content_hash: d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4
- applied_lessons: [L1, L25, L29, L35, L36, L50, L52, L60, L64]
- increment: `/pharn-loop` and `/pharn-ship` stop carrying their quick-mode deltas on a full run and their stop procedure on every request before the stop — each moves, verbatim, into a part file in `.claude/commands/` that the command reads at one named point — with no change to any stage, check, stop decision, routing, ledger or commit rule.
- layer(s): the stages (`.claude/commands/`, `pharn/ARCHITECTURE.md §4`); dev apparatus (`.dev/floor/`)
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]
- base: `origin/main` `9490b1b` (6.31.1); this increment is **6.32.0**
- gate1: APPROVED 2026-09-28 by the orchestrator under the maintainer's instruction in the `/pharn-dev-ship` invocation ("This is an implementation task. Do not stop at an audit or a proposed PLAN") — a MODEL decision, NOT a human approval.

## Applied lessons

- **L1** — the meta-docs this changes are in `## Files`: `CLAUDE.md` (the command convention paragraph and the spine paragraph's two `## Quick mode` cites), `CONTRIBUTING.md` (its claims-block rule), `CHANGELOG.md`, `SKILLS_VERSION` and the README badge.
- **L25** — the moved text keeps its rationale where it already sits; the new load rules are pinned by tests (placement, one load line per part, the fallback), not explained in a comment that reaches one file.
- **L29** — the set of parts is materialized once (each part's `part_of:` frontmatter) and every new rule iterates it, so a fifth part is covered by every rule; no assertion is written for one part.
- **L35** — which parts a command has is stored once, in the part's own frontmatter; the tests, the catalog and the family helper discover it there, and no second list is kept.
- **L36** — the part set gets a closure assertion (parts on disk == the four expected, both ways), not four presence checks.
- **L50** — every inbound cite of a moved section (`/pharn-loop` Steps 6a–7, `/pharn-ship` Steps 2c–3b, either `## Quick mode`, either `## What you may claim`) is swept by referent and classified in `BUILD.md`; each cite names the step, and the step keeps its name inside the command's part, reached from a pointer that keeps the section heading in the main file.
- **L52** — the new tests name the set they range over in their own title ("every part", "every family", "every moved section"), and one test per invariant goes through each of the four parts.
- **L60** — each new property gets its own negative control, run in the suite against a mutated copy: a moved line copied back into the main file, a load line deleted, a fifth part, a part without `disable-model-invocation`, a missing end line, a dotted file name, and an anchor that is not found.
- **L64** — every restatement of the load rule and of its bound (the CHANGELOG entry, `CLAUDE.md`, `CONTRIBUTING.md`, `SHIP.md`) is probed against the pinned sentence before hand-off; the rule is "read at this point", never "never loaded".

## Discovery — how the two orchestrators' instructions reach the model (read this run, P6)

**What enters context, established from the live repo and from 37 real orchestrator transcripts on this machine**
(`~/.claude/projects/*/*.jsonl`, 2026-09-14 → 2026-09-23, Claude Code 2.1.270–2.1.280; scripts under
`.pharn/orchestrator-context/`, scratch):

1. **At invocation, the command BODY enters the main thread, without its frontmatter.** In all 37 runs the
   injected message is the body alone (no `reads:` array in it). So `reads:` costs nothing at run time and loads
   nothing — it is not a loader. Measured on main (bytes, `\n`): `pharn-loop.md` 79,903 on disk, **77,971 body**;
   `pharn-ship.md` 69,421 on disk, **67,543 body**. The Claude Code docs say the same (only the content after the
   frontmatter is sent; checked by a `claude-code-guide` agent against `code.claude.com/docs/en/skills.md`).
2. **The body then rides along on every later request of that conversation.** Main-thread request counts in those
   runs: 11–426 per `/pharn-loop` run (median ≈ 200), 335 and 1,756 for two `/pharn-ship` runs. They predate 6.27.0's
   routing, so they ran every stage inline and are NOT a current-version baseline; they establish the mechanism, not
   today's counts.
3. **An inline stage invoked through the Skill tool injects that stage's whole body into the orchestrator's
   thread**, and a second invocation with different arguments injects it again (measured: `pharn-build` at iteration 1
   and again at iteration 2, 28,718 and 28,970 bytes). The docs say identical re-invocations add a short note instead.
   Today the loop runs `/pharn-regress` (19,327 B) and `/pharn-verify` (17,516 B) inline each iteration with the same
   arguments, and ship runs `/pharn-spec` (26,261 B) inline at GATE 1. These are the ROUTING policy's inline stages,
   out of scope here (the brief forbids routing changes); recorded as context, not changed.
4. **A routed stage agent never sees the orchestrator's command.** Its prompt is one line; its rules come from
   `stage-agent.mjs brief`; it loads its OWN stage command. The only orchestrator text a brief cites is
   `pharn-loop.md` Step 2's stuck-point table (`stage-agent-core.mjs:494`), which stays in the main file.
5. **Nothing loads a file because a command names it.** A backticked path or a link in a command body is text; a
   file enters context only when the model calls Read (or Bash `cat`). Single-file commands in `.claude/commands/`
   have no documented "supporting files" feature (that is `.claude/skills/<name>/` only). So a part enters context
   exactly when the orchestrator Reads it — and then stays for the rest of the conversation.
6. **What is in each body today, by section (bytes):**

   | `/pharn-loop` (77,971)                                 | bytes  | needed                  |
   | ------------------------------------------------------ | ------ | ----------------------- |
   | preamble, "What an unattended run changes", Steps 1–1b | 8,109  | entry, both modes       |
   | Step 2 stuck-point table                               | 10,090 | whole run               |
   | Running a stage                                        | 5,246  | whole run               |
   | `## Quick mode`                                        | 11,767 | quick runs only         |
   | Steps 3, 4, 5                                          | 13,635 | whole run               |
   | Steps 6–6d, Step 7                                     | 19,543 | at the stop only        |
   | `## What you may claim`                                | 8,468  | when claims are written |
   | Final step                                             | 1,095  | at the end only         |

   | `/pharn-ship` (67,543)                           | bytes  | needed                  |
   | ------------------------------------------------ | ------ | ----------------------- |
   | preamble, gates, Step 1, Running a stage         | 10,417 | entry, both modes       |
   | `## Quick mode`                                  | 10,590 | quick runs only         |
   | Step 2, Step 2b                                  | 20,226 | whole run               |
   | Steps 2c, 2d (full mode, GATE 2 only), 3, 3a, 3b | 17,615 | at GATE 2 / a STOP only |
   | `## What you may claim`                          | 8,129  | when claims are written |
   | Final step                                       | 553    | at the end only         |

   So a full `/pharn-loop` run carries 11.8 KB of quick-only text on every request, and every run of either command
   carries 26–29 KB of stop-time text (steps + claims + release) on every request BEFORE its stop — which is almost
   all of them.

7. **The installer copies exactly the top-level `pharn-*.md` files of `.claude/commands/`** (not `pharn-dev-*`; never a
   nested directory), each name matching `^[a-z0-9]+(-[a-z0-9]+)*\.(md|cjs|mjs|json)$` or the install hard-fails
   (read this run in `pharn-cli` 0.7.0 source: `src/lib/install-capabilities.ts:232-236`,
   `src/lib/install-manifest.ts:148-154`, `src/lib/validate.ts:18`). `pharn update` writes from the same manifest, so
   a new top-level file lands on update. A dotted name (`pharn-loop.quick.md`) would be REFUSED; a nested
   `.claude/commands/pharn/…` would be silently absent.
8. **`pharn/ARCHITECTURE.md §4`:** "Stages live in commands, not in a module. `spec → … → ship` are
   `.claude/commands/pharn-*` files; the modules under `pharn/` hold only the capabilities those stages invoke", and
   `pharn-contracts` is "schemas only, ZERO behavior". That is why `slim-commands` (Q1) found that moving a quick
   section under `pharn/pharn-contracts/` needs a human §4 amendment. A part that is itself a `.claude/commands/pharn-*`
   file needs none.
9. **Two Claude Code frontmatter keys** hide a file in `.claude/commands/` from both invocation paths:
   `disable-model-invocation: true` (the model cannot invoke it through the Skill tool, and its description is not
   put in the model's context) and `user-invocable: false` (not in the `/` menu). The docs state that command files
   "support the same frontmatter except `name` and `paths`"; that both keys act on a command FILE is not stated in
   so many words. The build probes the first one live (a fresh subagent lists what it can invoke); the second has
   no probe here (the `/` menu is UI), and its failure mode is benign — a user could type `/pharn-loop-close`, which
   reads as a part and is stopped by its own first paragraph.

## Design — the choice, and why

**Chosen: B + C together, as two part files per command.** The main file keeps everything the run needs from entry to
its stop. Its quick deltas move to `…-quick.md`, read at entry and only under `--quick`. Its stop procedure (the stop
steps, the claims block, the Final step) moves to `…-close.md`, read once when the run first reaches a stop. Moved
text is moved **verbatim**, with only its cross-references re-pointed; nothing is paraphrased, shortened or merged.

| option                                    | what it changes                                                            | why not alone / not chosen                                                                                                                                  |
| ----------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. slim in place**                      | cut rationale left after 6.28.2                                            | 6.28.2 already cut 35%; what remains is small, mostly pinned by tests, and does not change the fact that EVERY section rides on every request. Not pursued. |
| **B. quick on demand**                    | full runs stop carrying 10.6–11.8 KB                                       | chosen; alone it does nothing for quick runs or for the stop text                                                                                           |
| **C. stop text on demand**                | every run carries 26–29 KB less before its stop                            | chosen; the stop text is needed on every run but only at its end                                                                                            |
| contracts location (`slim-commands` Q1 b) | parts under `pharn/pharn-contracts/`                                       | needs a human `§4` amendment; a stage procedure is behaviour, and contracts are "ZERO behavior"                                                             |
| `pharn/floor/` or a printer script        | text in the floor, or printed by a new CLI (the `stage-agent brief` shape) | `§4` puts stages in commands; a new module is what the brief says to avoid; a Bash print is capped at 30 k chars                                            |
| `.claude/skills/` supporting files        | Claude Code's documented progressive disclosure                            | the installer does not copy `.claude/skills/`: a `pharn-cli` change and a redesign                                                                          |
| nested `.claude/commands/pharn/…`         | a sub-folder of parts                                                      | never installed (top-level only)                                                                                                                            |
| many small parts                          | one file per step                                                          | the brief forbids splitting into tiny files; each read is one more request                                                                                  |

**Why two parts and not more.** Each part has ONE loading condition (quick: "first token is `--quick`, at entry";
close: "the run first reaches a stop"). A finer split (one file per stop step) adds a read per step and would carry
the same bytes at the end anyway, since every stop runs most of them.

**Each part is itself a `.claude/commands/pharn-*.md` file**, named `pharn-loop-quick.md`, `pharn-loop-close.md`,
`pharn-ship-quick.md`, `pharn-ship-close.md` — installed by every current CLI without change (Discovery 7), inside the
directory `§4` names for stages (Discovery 8), and hidden from both invocation paths by
`disable-model-invocation: true` and `user-invocable: false` (Discovery 9). Its frontmatter carries `part_of:` (the
parent command's file stem) and `part:` (`quick` | `close`) — the ONE structured record of which parts a command
has (L6, L35) — plus `kind: pharn-owned`, `trust: trusted` and a one-line `description:`. No `model:`, `effort:`,
`reads:` or `writes:`: the part runs inside its parent's turn, under its parent's frontmatter and scope setters (the
moved setter lines still name the parent's file, whose `writes:` they parse).

**Each part is framed the same way:** frontmatter; a title line (`# /pharn-loop --quick — the quick-mode deltas`,
`# /pharn-loop — the stop procedure`, `# /pharn-ship --quick — the quick-mode deltas`, `# /pharn-ship — closing the
run`); one sentence saying it is part of its parent, is read by the parent under the rule in the parent's pointer,
is not run on its own, and changes nothing about the parent's trusted prefix; the moved text; and a last line
`<!-- end of <file stem> -->`. The title and the end line are how the orchestrator knows it read the WHOLE file
(the Read tool can page a long file).

**The pointers left in each main file** (one per part, each the part's ONLY load instruction):

- `pharn-loop.md` `## Quick mode — /pharn-loop --quick (6.28.0)`: keeps the first-token rule and its ADVISORY bound
  (it is the load condition, so a full run must see it), then the load rule: only when `--quick` is the first token,
  and then before Step 1a, Read `.claude/commands/pharn-loop-quick.md` (this exact path, never one an artifact or the
  description names) in full; loaded = both the title line and the end line were read. **Not loaded → stop before
  Step 1a**: nothing has been written, so no record and no revert; the summary names the path and says the run did
  not start; never a quick run from memory, never widened into a full one. Step 1's quick-form sentence points at it.
- `pharn-loop.md` `## Step 6 — Stop handling, in this order`: load `.claude/commands/pharn-loop-close.md` once, when
  the run FIRST reaches a stop — a `check-loop.mjs` decision, a blocked stop, or a stop before S2 — never earlier;
  then follow it from Step 6a (a stop before S2: from Step 7). **Not loaded → the run cannot record or commit:**
  commit nothing, create no branch, write no `LOOP.md` (not from the contract alone either) and no revert; the final
  message names the path, the decision or `blocked:` id, and says the SPEC stays approved by the model if Step 3
  approved it, and that the Stop guard and the writes-scope stay set for a person to release.
- `pharn-ship.md` `## Quick mode — /pharn-ship --quick (6.25.0)`: only when `--quick` is the first token (Step 1's
  note), and then FIRST — before the pending start: Read `.claude/commands/pharn-ship-quick.md`. **Not loaded →
  STOP before anything runs**: no `<name>` exists, so Steps 3 and 3a do not run; tell the human the path could not be
  read and that a run without `--quick` takes the full flow.
- `pharn-ship.md` `## Closing the run — GATE 2 and every STOP`: load `.claude/commands/pharn-ship-close.md` once, when
  the run FIRST reaches GATE 2 (a `PASS` verify, at step 7 or after Step 2b) or any STOP after Step 1 — never earlier,
  and not at GATE 1 (it ends inside `/pharn-spec`); then Step 2c first after a `PASS`, Step 3 first at a STOP. **Not
  loaded →** present the standing verdicts and the stop, say `SHIP.md`, `cost.json` and `RUN-REPORT.md` were not
  written and why, and end the turn; the run marker and the writes-scope stay set for a person to release.

**Every failure direction is the safe one:** a missed quick read runs the full flow over a quick SPEC in the loop
(which then meets `MODE_MISMATCH`, never a commit) or the full ship spine (more checks); a missed close read commits
nothing and writes no record.

## Parity checklist (both commands, both modes) — what must be identical after the move

Every item below is text that executes; each is **moved verbatim or kept**, and the build's family splice (below)
proves the concatenated text still carries it exactly once.

| item                                                | `/pharn-loop` full                        | `/pharn-loop --quick`         | `/pharn-ship` full                  | `/pharn-ship --quick` | owner after          |
| --------------------------------------------------- | ----------------------------------------- | ----------------------------- | ----------------------------------- | --------------------- | -------------------- |
| mode selection, first-token rule                    | Step 1                                    | + quick part load             | Step 1 note                         | + quick part load     | main                 |
| SPEC kind read (`--spec-kind` → `quick`)            | —                                         | quick item 2                  | —                                   | quick item 3          | quick part           |
| approval: model / human                             | Step 3 (`--model-approve`)                | quick item 2                  | GATE 1, step 1                      | quick items 2–3       | main / quick         |
| stage order and routing lines                       | Steps 3–5                                 | quick items 2–5               | Step 2, 2b                          | quick items 4, 6, 9   | main / quick         |
| inline fallback, `read` mapping                     | Running a stage                           | same                          | Running a stage                     | same                  | main                 |
| test-first evidence (`check-test-stage`, preflight) | Step 4                                    | same                          | step 4                              | same (item 5)         | main                 |
| scope set / release                                 | Steps 6a–6c setters, Final step `--clear` | same                          | Steps 2c, 3, 3b setters, Final step | same                  | close part           |
| stage-exit handling (regress/verify mappings)       | Step 2                                    | Step 2 (+ quick table)        | step 7                              | step 7                | main                 |
| questions, refusals, unusable                       | Step 2 rows, Running a stage              | + S6c rows                    | Running a stage                     | same                  | main / quick         |
| freshness + reruns                                  | Step 5.3                                  | quick item 6                  | —                                   | —                     | main / quick         |
| commit-gate freshness                               | Step 6c.0                                 | same                          | —                                   | —                     | close part           |
| `STOP_GREEN` vs `STOP_GREEN_QUICK`                  | Step 5.4, 6a, 6c                          | quick items 7–8               | —                                   | —                     | main / close / quick |
| no full regression claim in quick                   | —                                         | quick items 5, 8, 9           | —                                   | quick items 6, 11     | quick part           |
| cost markers (run-start … run-stop)                 | Step 1a, Steps 3–5, 6b                    | same                          | Step 1, Step 2, 3a                  | quick item 1          | main / close         |
| ledger + run report                                 | Step 6b                                   | quick item 8 (report skipped) | Step 3a                             | quick item 12         | close / quick        |
| record, commit, summary                             | Steps 6b–7                                | quick items 8–9               | Steps 3, 3b                         | quick item 11         | close / quick        |
| Stop guard `--open` / `--close`                     | Step 1a / Final step                      | same                          | —                                   | —                     | main / close         |
| run marker `--open` / `--close`                     | —                                         | —                             | step 1 / Step 3a                    | same                  | main / close         |
| claims block                                        | `## What you may claim`                   | same                          | same                                | same                  | close part           |

## Files

- `.claude/commands/pharn-loop.md` — `## Quick mode` body and Steps 6a–7, the claims block and the Final step moved out; the two pointers and Step 1's quick sentence re-pointed — layer: stages
- `.claude/commands/pharn-loop-quick.md` — NEW part: the loop's quick-mode deltas, moved verbatim — layer: stages
- `.claude/commands/pharn-loop-close.md` — NEW part: Steps 6a–7, `## What you may claim`, Final step, moved verbatim — layer: stages
- `.claude/commands/pharn-ship.md` — `## Quick mode` body and Steps 2c–3b, the claims block and the Final step moved out; two pointers; cross-refs re-pointed — layer: stages
- `.claude/commands/pharn-ship-quick.md` — NEW part: the ship quick-mode deltas, moved verbatim — layer: stages
- `.claude/commands/pharn-ship-close.md` — NEW part: Steps 2c, 2d, 3, 3a, 3b, the claims block, Final step, moved verbatim — layer: stages
- `.dev/floor/command-family.mjs` — NEW test helper (apparatus): discovers a command's parts from their `part_of:` frontmatter and splices them at their original positions — layer: dev apparatus
- `.dev/floor/command-family.test.mjs` — NEW: the COMMAND PARTS rules and their negative controls — layer: dev apparatus
- `.dev/floor/command-hygiene.test.mjs` — reads each command as its family; budget rows for the four parts and lowered rows for the two mains; claims-heading rule per family — layer: dev apparatus
- `.dev/floor/capability-catalog-core.mjs` — a file with `part_of:` is a part, not a product command — layer: dev apparatus
- `.dev/floor/capability-catalog-core.test.mjs` — that rule, with its control — layer: dev apparatus
- `pharn/floor/run-marker.test.mjs` — reads the ship family — layer: tests (never shipped)
- `pharn/floor/check-quick-scope.test.mjs` — reads the families — layer: tests
- `pharn/floor/render-run-report.test.mjs` — reads the families — layer: tests
- `pharn/floor/check-test-stage.test.mjs` — reads the loop family — layer: tests
- `pharn/floor/ship-outcome-core.test.mjs` — reads the ship family — layer: tests
- `pharn/floor/check-loop-fresh.test.mjs` — reads the loop family — layer: tests
- `pharn/floor/check-spec.test.mjs` — reads the ship family — layer: tests
- `pharn/floor/check-loop.test.mjs` — reads the loop family — layer: tests
- `pharn/floor/render-verify.test.mjs` — reads the loop family — layer: tests
- `pharn/floor/render-regression.test.mjs` — reads the loop family — layer: tests
- `pharn/floor/render-cost-ledger.test.mjs` — reads the families — layer: tests
- `pharn/floor/check-loop-record.test.mjs` — reads the loop family — layer: tests
- `pharn/floor/check-bash-reconcile.test.mjs` — reads the families — layer: tests
- `pharn/floor/stage-agent-core.test.mjs` — reads the families — layer: tests
- `pharn/floor/stage-agent.test.mjs` — reads the families — layer: tests
- `pharn/floor/check-model-config.test.mjs` — the parts are product-prefixed files with no `model:`/`effort:` — layer: tests
- `.claude/hooks/require-loop-record.test.cjs` — reads the loop family — layer: tests
- `.claude/hooks/writes-scope-release.test.cjs` — the release rule over files that carry setters — layer: tests
- `.claude/hooks/hook-wiring.test.cjs` — reads the families — layer: tests
- `.claude/hooks/enforce-writes-scope.test.cjs` — reads the families where it reads a command — layer: tests
- `docs/capabilities/**`, `README.md` (CURRENT-STATE region) — regenerated only if the catalog output moves — layer: generated
- `CLAUDE.md` — the command convention paragraph (parts, one claims block per command family), the spine paragraph's two `## Quick mode` cites — layer: repo-meta
- `CONTRIBUTING.md` — the claims-block rule per command family; parts in the budget — layer: repo-meta
- `CHANGELOG.md` — `## [6.32.0]` — layer: repo-meta
- `SKILLS_VERSION` — 6.32.0 — layer: repo-meta
- `README.md` — the version badge — layer: repo-meta
- `.dev/features/orchestrator-context/PLAN.md` — this plan — layer: dev apparatus
- `.dev/features/orchestrator-context/BUILD.md` — the build note, the parity diff, the cite sweep and the measurements — layer: dev apparatus
- `.claude/commands/pharn-zz-probe.md` — TEMPORARY: the G7 live-probe control (a command WITHOUT the two keys), deleted before the build commits — layer: stages (never committed)
- `docs/capabilities/README.md` — regenerated only if the catalog output moves — layer: generated
  (GRILL, REGRESSION, VERIFY, REVIEW and SHIP are written by their own stages under their own scopes.)

A test file above that turns out not to read a moved line needs no edit and is left untouched; the build lists which
were edited. **Not touched:** every `pharn/floor/*.mjs` module (no shipped code changes), every contract, the four
trusted docs, every other command, `pharn-cli`, `MIN_CLI`.

## Tests (P1 — this increment ships no capability, so no eval; the rules below are the spec)

`.dev/floor/command-family.test.mjs`, each rule iterating the part set discovered from frontmatter (L29):

1. **Closure (L36):** the parts on disk are exactly `{pharn-loop: [quick, close], pharn-ship: [quick, close]}`, both
   ways; every `part_of:` names an existing product command; no part names another part. Control: a fifth part file
   in a copy fails.
2. **Frontmatter of every part:** `disable-model-invocation: true`, `user-invocable: false`, `kind: pharn-owned`,
   `trust: trusted`, `part_of`, `part ∈ {quick, close}`; no `model:`, `effort:`, `reads:` or `writes:`. Control: a
   copy without `disable-model-invocation` fails.
3. **Installed-project availability of every part:** top-level, `pharn-` but not `pharn-dev-`, `.md`, and the name
   matches pharn-cli 0.7.0's `COPY_FILENAME_RE` (copied into the test with its source cite, since the CLI is another
   repo). Control: `pharn-loop.quick.md` fails.
4. **Framing of every part:** the title line is the first non-frontmatter line and the end line is the last line.
   Control: a copy missing its end line fails.
5. **One load instruction per part:** the parent's main file names the part's exact path in exactly one Read
   instruction, inside the pointer section that owns it (quick → `## Quick mode`; close → `## Step 6` / `## Closing
the run`), and nowhere else as a Read; the pointer carries the loading condition and the not-loaded rule
   sentences (pinned). Control: the load line deleted fails; the quick path moved into Step 3 fails.
6. **No duplication between a main file and its parts:** no fenced line, no `##`/`###` heading and no paragraph of a
   part appears in its main file, and vice versa. Control: a moved line copied back into the main file fails.
7. **Placement:** every stop-procedure heading (`### Step 6a`–`6d`, `## Step 7`; `## Step 2c`, `2d`, `3`, `3a`, `3b`),
   `## What you may claim` and `## Final step` lives in its command's close part; every quick delta item lives in the
   quick part; the main file keeps Steps 1–5 (loop) / Steps 1, 2, 2b (ship). Control: an anchor that is not found
   fails the test rather than slicing to the end (L60).
8. **Parity by splice — a ONE-OFF build check, recorded in `BUILD.md`, deliberately NOT a permanent test** (a later
   increment legitimately edits these lines, and a test pinned to 6.31.1's bytes would then fail for the wrong
   reason): the family text (main with the quick part spliced at the end of its `## Quick mode` pointer and the close
   part appended) is diffed against 6.31.1's file (`git show 9490b1b:<path>`). The only differences allowed are the
   pointer paragraphs, each part's frame (frontmatter, title, one-sentence intro, end line) and re-pointed
   cross-references, each listed. Every fenced line and every paragraph otherwise appears exactly as often as before.

`command-hygiene.test.mjs` and the other suites keep every existing pin and read the family through
`.dev/floor/command-family.mjs`, so each pin still means "the command carries this line" — plus the placement rules
above say WHERE. The COMMAND BUDGET gains rows for the four parts (measured + 10%, rounded up to 512) and lowers the
two mains' rows to their new measure the same way — a visible diff to `COMMAND_BYTE_CEILINGS`. The claims rule
becomes "exactly one `## What you may claim` heading per command FAMILY".

## Measurement — how the before/after is reported (labelled, never blended)

- **Bytes (measured):** per path, what enters at invocation, what enters later and when, and the distinct total —
  from the files themselves, the body without frontmatter for a command, and for a part the whole file PLUS the Read
  tool's line-number prefix (measured on a live Read of each part in this session).
- **Tool calls added (counted from the text):** one Read at the first stop on every path; one more at entry on a quick
  path.
- **Carried byte-requests (estimate):** instruction bytes × the requests that carry them, over a request profile
  counted from each command's pinned lines for a one-iteration run, a three-iteration run (`CONTINUE` ×2), a
  freshness re-run, a blocked stop at the test stage, ship's `INCOMPLETE` retry and a ship STOP at regress — labelled
  an estimate, with the formula, because no live A/B run is made.
- **Tokens:** only as bytes ÷ a stated range, labelled an estimate; no historical ledger is reused — the 37
  transcripts predate 6.27.0 routing and the 6.29.0 context-scoped ledger, so their run membership and their
  inline-stage profile do not describe today's orchestrator.
- **Cache effect (reasoned, labelled):** a part's bytes are cache-written once when it enters and cache-read by each
  later request; before, the same bytes were cache-written at invocation and read by every request. Write volume is
  about the same; read volume falls.

## Guarantee audit (P0)

- "a full run never carries the quick deltas; no run carries the stop procedure before its stop" → **ADVISORY.** It
  holds when the orchestrating model reads each part only at its pointer's condition; nothing on the floor sees a
  Read. The TEXT that says so is floor-pinned (tests 5–7: one load instruction, in its pointer, with its condition).
- "the command still carries every step, line and stop it carried before" → **floor for the text, over the files
  in this repo** (tests 6 and 8, enum/regex over the family text); never that a run executes it.
- "the parts are installed by `pharn init` / `pharn update`" → **floor for the name rule in this repo** (test 3,
  regex); **measured once** against `pharn-cli` 0.7.0's real manifest code (build step, recorded in `BUILD.md`);
  older CLIs not measured (every CLI ≥ `MIN_CLI` 0.5.0 copies top-level `pharn-*.md` by the same filter, read in 0.7.0
  only).
- "neither the user nor the model can invoke a part" → **ADVISORY, platform behaviour.** Documented for skills, and
  for command files by the docs' "same frontmatter" sentence; probed live once for the model side (the build's
  subagent probe); the `/` menu side is not probed.
- "a part that did not load stops the run safely" → **ADVISORY** (the model's reading of the title and end lines,
  and its obedience to the not-loaded rule). The Stop guard is the loop's one mechanical backstop (a run that ends
  with no `LOOP.md` is refused until the guard's own bound, then logged).
- "this reduces the model's work" → **measured in bytes; estimated in requests and tokens** — never a claim about
  cost in money, and never "the run is cheaper by X%" without the estimate label.
- Every existing floor claim of both commands is unchanged: the moved `## What you may claim` blocks are moved
  byte-for-byte, and no checker, contract or module changes.

## Trust audit (P2)

- **The parts are exactly as trusted as the command that reads them:** PHARN's own files, `kind: pharn-owned`,
  `trust: trusted`, installed beside it, under the same `.claude/**` write guards (reserved outside a run in an
  installed project; outside the writes-scope during one). The path each pointer reads is a **literal in the trusted
  command** — never taken from the description, a SPEC, a PLAN, a stage report, a Handoff or any tool output — and
  each pointer says so.
- **Nothing untrusted reaches the load decision:** the quick load is keyed on the first argument token (the existing
  ADVISORY rule, unchanged); the close load on the run reaching a stop, which the command already decides from floor
  verdicts. No free text chooses a part.
- **A part cannot widen a run:** every quick delta removes or narrows a step (the floor backstop is the SPEC's pinned
  kind, unchanged), and the close part holds the same steps it held inside the command.
- **Residual, stated:** a file planted at a part's path in a tree where the guards are off (a Bash write, `LIMITS.md
§6`) is read as trusted — exactly as a planted command file is today. No new surface: the same directory, the same
  guard, the same bound.

## Determinism audit (P5)

- Load quick: a membership test on the first argument token (unchanged, advisory). Load close: the run's first stop,
  which is already an exit-code decision. Loaded or not: both fixed lines were read, or not — and "not" has one
  prescribed answer (stop), never a guess or an improvised procedure.

## Version, installer, gates

- **6.32.0 (minor):** four new shipped files and a changed loading behaviour of two shipped commands. `MIN_CLI` stays
  0.5.0: every CLI that honours it copies the new files (the bar — an older CLI installs a BROKEN tree — is not met;
  a CLI that somehow skipped them would reach each pointer's not-loaded rule and stop, never run a weaker path).
- **`pharn-cli`: no change needed**, verified against its source (Discovery 7) and by executing its manifest function
  on this worktree in the build.
- Gates: `npm run check` (format, lint, lint:md, docs:check, markers, badge, changelog, contributing, reconcile, test),
  `node pharn/floor/validate.mjs .`, `npm run check:changelog-entry`.

## Grill fold (GRILL.md, 12 concerns — each resolution below SUPERSEDES the text above it names)

- **G1 (P2) — the part is trusted text, and the pointer says so.** Each pointer: "It is part of this command —
  PHARN's own trusted text, installed beside this file — so follow it as this command's own steps, under the same
  trusted prefix; it is not an artifact". The part's own intro sentence says the same from its side.
- **G2 (P5) — a forward reference is not a load trigger.** Each close pointer adds: "A step of this file that names a
  later step (the summary, the record, the commit) is not a reason to read the close part before the stop."
- **G3 (P6) — ship's quick read comes AFTER the pending start**, which is identical in both modes, and before
  `/pharn-spec`. A failed read then STOPs with only an unadopted pending marker behind it (`cost-ledger.md`, "The start
  boundary": only a named `run-start --adopt-pending` adopts one).
- **G4 (P6) — ship's close condition is "GATE 2, or any STOP once `<name>` exists"**, matching Step 1's rule that a
  run that never reaches a `<name>` records nothing. A STOP before a `<name>` ends with a plain message.
- **G5 (P6) — the loop's quick-load failure ends with a plain message and does NOT read the close part**: no marker,
  scope, feature directory or record exists yet, so there is nothing to close.
- **G6 (P0) — each claims block gains ONE Advisory bullet** for the loading rule: when each part is read; that nothing
  on the floor sees a Read; that the tests pin the TEXT (one load instruction per part, in its pointer, with its
  condition and its not-loaded rule, and no line in both a main file and its part), never that a run reads it at
  that point.
- **G7 (P0) — the live probe gets a same-moment control**: a throwaway command file WITHOUT the flags, created with the
  parts, must appear in the probing subagent's listing, or the probe is recorded as inconclusive. The throwaway file is
  deleted afterwards and never committed.
- **G8 (P3) — kept, and stated for the human (GATE-1 decision under delegation):** the close part holds the claims
  block because the claims are written at the stop. The command FAMILY is the unit of change, partitioned by load
  point; a mid-run change that alters a claim edits the main file and the close part, as it edited two sections of one
  file before. Recorded in `CHANGELOG [6.32.0]` and `CLAUDE.md`'s convention paragraph.
- **G9 (P3) — `.dev/floor/command-family.mjs` is imported by TEST files only**, and `command-family.test.mjs` pins it:
  no non-test file under `pharn/` or `.claude/hooks/` names it (a shipped file importing `.dev/` would break an
  install, which ships without `.dev/`).
- **G10 (P2) — the loop's close-not-loaded rule adds:** the Stop guard's refusals that follow are expected on this
  path and are not a reason to write a record; they end at the guard's own bound.
- **G11 (P1) — test 6's compared units:** non-empty fenced lines, `##`/`###` headings, and prose paragraphs of at
  least 80 characters.
- **G12 (P6) — `check-model-config.mjs`'s printed scan count** moves (the parts are product-prefixed files with no
  `model:`/`effort:`); its behaviour and exit codes do not. Named in the CHANGELOG entry.

## Out of scope (named, not built — P7)

- `inline-stage-reinjection` — the loop re-invokes `/pharn-regress` and `/pharn-verify` every iteration; with the same
  arguments current Claude Code adds only a note, but a run that passes different arguments re-injects 36.8 KB per
  iteration. A routing-policy question, not this PR's.
- `stage-agent-final-text` — each stage agent's final message returns into the orchestrator's context; its length is
  unbounded by the brief. A `stage-agent-core.mjs` change.
- `ship-closeout-script` (named in 6.28.2) — Step 3a as one tested script; unchanged.
- baseline caching, HEAD gate reuse, a new orchestration engine, a telemetry subsystem — excluded by the brief.

## Open questions (HALT)

None. The two design questions this plan could have asked — where the parts live (answered by Discovery 7–8: the only
location that is installed today and needs no trusted-doc edit), and whether to move the claims block (yes: it is
read when claims are written, at the stop) — were decided by the orchestrator under the maintainer's delegation.
