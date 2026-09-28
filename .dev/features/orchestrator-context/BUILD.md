# BUILD — orchestrator-context

- plan: `.dev/features/orchestrator-context/PLAN.md` (GATE 1: the orchestrator, under the maintainer's in-prompt
  delegation — a model decision, not a human approval); grill folded as G1–G12.
- spec pin: `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md` → `d831d30d…f4f4`, equal to the plan's — no drift.
- scope: `set-writes-scope.cjs --from-plan` (37 → 39 → 40 paths as the plan's `## Files` gained the build note, the
  catalog page and the temporary probe control; each re-set followed by `reconcile-baseline.mjs --amend-scope`),
  anchored once with `--anchor --by pharn-dev-build` before the first write.
- stage model: opus (the session's), inline, as the plan's author. Effort not routed.
- floor: `node pharn/floor/validate.mjs .` → **GREEN — 37 capabilities checked**.
- `npm run check` → **exit 0**: format:check, lint, lint:md (0 issues), docs:check, check:markers, check:badge,
  check:changelog, check:contributing, check:reconcile, and `npm test` **4260 / 4260 pass**.

## What landed

**Four new part files**, each moved VERBATIM out of its command by a one-off mechanical split (the cut is a script, so
no moved line was retyped), then framed: frontmatter (`description`, `disable-model-invocation: true`,
`user-invocable: false`, `kind: pharn-owned`, `trust: trusted`, `part_of`, `part`), a `#` title, one sentence saying
what it is part of and that it changes nothing about the command's trusted prefix, the moved text, and
`<!-- end of <stem> -->`.

| file                  | bytes  | holds                                                                                  |
| --------------------- | ------ | -------------------------------------------------------------------------------------- |
| `pharn-loop.md`       | 42,642 | preamble, Steps 1–5, the stuck-point table, Running a stage, two pointers (was 79,903) |
| `pharn-loop-quick.md` | 11,632 | `## Quick mode`'s body: intro, mode paragraph, items 1–9, its question table           |
| `pharn-loop-close.md` | 30,440 | `## Step 6` (6a–6d), `## Step 7`, `## What you may claim`, `## Final step`             |
| `pharn-ship.md`       | 35,635 | preamble, gates, Step 1, Running a stage, Step 2, Step 2b, two pointers (was 69,421)   |
| `pharn-ship-quick.md` | 11,223 | `## Quick mode`'s body: intro, first-token rule, items 1–12, GATE 2 in quick mode      |
| `pharn-ship-close.md` | 27,754 | Steps 2c, 2d, 3, 3a, 3b, `## What you may claim`, `## Final step`                      |

**Text that is new** (everything else in the six files is 6.31.1's, byte for byte):

- the four pointers — `pharn-loop.md` `## Quick mode` (after its kept first-token paragraph, which is the load
  condition) and `## At the stop — Steps 6 and 7 are in the close part`; `pharn-ship.md` `## Quick mode` and
  `## Closing the run — GATE 2 and every STOP (Steps 2c–3b)`. Each names the exact path, when to read it, that it is
  the command's own trusted text (G1), both framing lines, and its not-loaded rule; each close pointer says a forward
  reference is not a reason to read early (G2);
- Step 1's quick sentence in `pharn-loop.md` ("load its quick part before Step 1a") and the Step 2 sentence in
  `pharn-ship.md` pointing Step 3a at the close part;
- one `**Advisory, the parts (6.32.0):**` bullet in each claims block (G6);
- the `## Step 6 — Stop handling, in this order` heading now opens the loop's close part (moved, not new), because
  markdownlint's MD001 rejects an H1 followed by the `### Step 6a` it used to precede; the main file's pointer took the
  new heading `## At the stop`.

**Two build decisions beyond the plan, both from the measurement below:**

- **Batched reads.** Each part Read is a request, and a request re-sends the WHOLE prompt, not only this text. So the
  quick pointers read the quick part in the same turn as a call the run already makes (the loop: the constitution
  Read; ship: Step 1's pending-start line — this supersedes G3's "after the pending start", keeping "before
  `/pharn-spec`"), and ship reads its close part in the same turn as step 7's return marker after the first
  `/pharn-verify`: every verify outcome leads to GATE 2, a STOP or Step 2b's one retry, so the part is needed within
  about 17 requests at most. The loop cannot do the same: it knows it is stopping only after `check-loop.mjs` answers,
  and reading at every stop check would carry the part through each `CONTINUE`. That batching is ADVISORY, like every
  read — the pointer asks for it.
- **The claims pin for the close pointers** became "Read it once", "and never earlier", "not a reason to read it" —
  the ship pointer's wording changed with the batching.

## Parity (the plan's check 8 — one-off, not a permanent test)

`node .pharn/orchestrator-context/parity.mjs 9490b1b` (scratch) diffs 6.31.1's command file against the command read
with its parts spliced back (`.dev/floor/command-family.mjs`):

| command         | fenced shell lines   | headings (`#`–`####`)                       | prose paragraphs ≥ 80 chars                                   |
| --------------- | -------------------- | ------------------------------------------- | ------------------------------------------------------------- |
| `pharn-loop.md` | **0 lost, 0 gained** | 0 lost, 3 gained (two part titles, pointer) | 2 changed, 6 added (four pointer paragraphs, two part intros) |
| `pharn-ship.md` | **0 lost, 0 gained** | 0 lost, 3 gained (two part titles, pointer) | 2 changed, 6 added (four pointer paragraphs, two part intros) |

The "changed" paragraphs are exactly one edited sentence per command (the loop's Step 1 quick sentence; ship's Step 2
Step-3a pointer) and the claims-block bullet list (a bullet added to a list without blank lines reads as one changed
paragraph). No executed line was lost, duplicated or reworded.

**One behaviour worth naming, because a full run no longer SEES it:** the loop's quick section ended with "A full run
that meets `STOP_GREEN_QUICK` … does not commit". A full run no longer loads that paragraph. The rule it explains still
binds a full run twice: Step 6a and Step 6c in the close part name the green stop per mode ("never the other one"), and
`check-loop-decision.mjs` REDs a record whose mode disagrees (`MODE_MISMATCH`), which blocks the commit.

## Tests

Existing suites now read a command WITH its parts where a pin asks "does the command carry this line":

- `.dev/floor/command-hygiene.test.mjs` — `commandFiles()` lists commands only; `commandAndPartFiles()` every file
  (the L19 formatter scan and the markdownlint corpus report `file:line`, so they stay per file:
  `MARKDOWNLINT_SITES` names `pharn-ship-close.md` now); `commandBody()` and 11 whole-command reads use the family text;
  the two readdir closures (mark-phase, run-marker callers) skip parts; SHELL-SINK reads per command. COMMAND BUDGET:
  R1–R4 per file on disk (parts get rows, the two commands' rows went DOWN: `pharn-loop.md` 86,016 → 47,104,
  `pharn-ship.md` 76,800 → 38,912; parts 33,792 / 12,800 / 30,720 / 12,800 — each measured + 10%, up to 512); R5 one
  claims block per command read with its parts.
- `pharn/floor/{check-loop-fresh,check-quick-scope,check-spec,check-test-stage,run-marker,ship-outcome-core,render-run-report}.test.mjs`
  and `.claude/hooks/require-loop-record.test.cjs` read the family text (the CJS test `require()`s the ESM helper,
  Node 24). `render-{regression,verify,run-report}.test.mjs`'s ENUMERATION sites name `pharn-loop-close.md`, where
  Step 6c's staging list now lives.
- **Declared in `## Files` and NOT edited, because they passed untouched:** `stage-agent-core.test.mjs`,
  `stage-agent.test.mjs`, `check-model-config.test.mjs`, `check-loop.test.mjs`, `check-loop-record.test.mjs`,
  `check-bash-reconcile.test.mjs`, `render-cost-ledger.test.mjs`, `writes-scope-release.test.cjs`,
  `hook-wiring.test.cjs`, `enforce-writes-scope.test.cjs`, and `docs/capabilities/README.md` (the catalog output did
  not move).

New: `.dev/floor/command-family.test.mjs` — R1 closure (4 parts, both ways), R2 frontmatter, R3 pharn-cli's name rule,
R4/R5 framing and one pointer per part with its pinned sentences and section, R6 no line in two files of one command,
R7 placement, R8 no shipped file names the helper, plus two tests of the helper itself. **Each rule has its negative
controls in the suite** (a fifth part, a dropped part, a bad `part_of`, each required key removed, a forbidden key,
five bad names, a missing end line, a deleted and a doubled load, a deleted not-loaded rule, a load moved out of its
section for both kinds, a copied fenced line / heading / paragraph, a stop heading moved back, a stray delta item, a
lost anchor, a lost item, a shipped import) — 9 tests, all green, each control asserted red.
`.dev/floor/capability-catalog-core.{mjs,test.mjs}` — a file with `part_of:` is not listed as a command (control: the
same file without it is); `npm run docs:check` GREEN with no regeneration.

## Installed-project verification (pharn-cli 0.7.0, its own code)

`tsx .pharn/orchestrator-context/install-probe.ts <this tree> <scratch project>` imports pharn-cli's
`collectExpectedInstallPaths` (what `pharn status` and `pharn update` compare and write) and `installCapabilities`
(what `pharn init` runs) from `~/Projects/pharn-cli/src`, with this worktree as the "fetched clone" and no network:

```text
manifest HAS .claude/commands/pharn-loop-quick.md
manifest HAS .claude/commands/pharn-loop-close.md
manifest HAS .claude/commands/pharn-ship-quick.md
manifest HAS .claude/commands/pharn-ship-close.md
install WROTE (byte-identical) .claude/commands/pharn-loop-quick.md
install WROTE (byte-identical) .claude/commands/pharn-loop-close.md
install WROTE (byte-identical) .claude/commands/pharn-ship-quick.md
install WROTE (byte-identical) .claude/commands/pharn-ship-close.md
installed commands (15): pharn-build.md pharn-grill.md pharn-loop-close.md pharn-loop-quick.md pharn-loop.md …
dev commands installed: 0
```

Not measured: an older CLI (≥ `MIN_CLI` 0.5.0) — its filter was read only in 0.7.0; `pharn update` over an install
whose user EDITED `pharn-loop.md` keeps the old file (which never reads a part), so that install keeps 6.31.1's
behaviour until updated with `--force`.

## Live probe of the hiding keys (G7) — INCONCLUSIVE, recorded as such

A throwaway control command WITHOUT the two keys (`pharn-zz-probe.md`, declared in `## Files`) was created beside the
parts, and a fresh haiku subagent reported which names its skill listing held: `pharn-loop` YES, `pharn-ship` YES,
the four parts NO — **and the control NO**. The listing does not read this worktree's `.claude/commands/`, so the probe
says nothing about the keys. The control was deleted before commit. The claim stays the documented one (`skills.md`:
command files take the same frontmatter except `name` and `paths`), labelled unmeasured here.

## Inbound cites of moved sections (L50 — swept by referent)

Every shipped cite of a moved step names the COMMAND and the step or section, and each step keeps its name inside the
command's part, reached through a pointer heading left in the command file — so each resolves in one hop and none was
edited: `pharn-spec.md:275` (`/pharn-loop` Step 6a); `require-loop-record.cjs:21,39,219` (Steps 6a, 6b, 6c);
`check-loop.mjs:31-32,79`, `loop-mode-core.mjs:16,20-21`, `check-loop-decision.mjs:32`, `render-run-report.mjs:12,28`,
`render-cost-ledger.mjs:973` (Steps 6a–7, `## Quick mode`); `check-quick-scope.mjs:3`, `quick-scope-core.mjs:2`
(`/pharn-ship --quick`'s item 7); `loop-record.md:126,150,237,257`, `cost-ledger.md:907`, `ship-record.md:139`,
`spec-template.md:182` (contracts); `CLAUDE.md:304,751,802` (and the spine paragraph, re-pointed). No trusted doc cites
a moved step. Historical feature records under `pharn/features/` and `.dev/features/` are not edited.

## Measurement (bytes MEASURED; requests and tokens ESTIMATED)

`node .pharn/orchestrator-context/measure.mjs` (scratch). Instruction bytes: a command's body as injected (no
frontmatter — measured in all 37 transcripts); a part as a Read result (the whole file plus a 7-byte `cat -n` prefix
per line, an estimate of the rendering). Request profiles are counted from each command's pinned steps (one request per
prescribed tool call, plus the final message) — an ESTIMATE, not a trace. Tokens = bytes ÷ 4 (±15%). Net subtracts
each added request at a whole-prompt size of 30k (lean) or 120k (the transcripts' request-0 prompt minus the command)
tokens, plus 800 tokens of tool traffic per earlier request.

| path                                 | at invocation   | loaded later                           | distinct      | added req | this text, carried | net lean | net heavy |
| ------------------------------------ | --------------- | -------------------------------------- | ------------- | --------- | ------------------ | -------- | --------- |
| loop full, 1 iteration, green        | 77,971 → 40,710 | close 33,534 at the stop               | 77,971→74,244 | 1         | −34%               | 7.0%     | 2.5%      |
| loop full, 3 iterations              | same            | same                                   | same          | 1         | −39%               | 7.0%     | 3.1%      |
| loop full, verify re-run (freshness) | same            | same                                   | same          | 1         | −35%               | 7.1%     | 2.7%      |
| loop full, blocked at S12 (failure)  | same            | same                                   | same          | 1         | −31%               | 6.7%     | 1.8%      |
| loop --quick, 1 iteration            | same            | quick 12,780 at entry; close at stop   | 77,971→87,024 | 1         | −17%               | 2.8%     | 0.5%      |
| loop --quick, 3 iterations           | same            | same                                   | same          | 1         | −22%               | 3.6%     | 1.3%      |
| ship full, GATE 2                    | 67,543 → 33,757 | close 30,603 with verify's marker      | 67,543→64,360 | 0         | −35%               | 7.7%     | 3.5%      |
| ship full, INCOMPLETE + retry        | same            | same (carried through the retry)       | same          | 0         | −29%               | 5.9%     | 2.9%      |
| ship full, STOP at regress (failure) | same            | close at the STOP                      | same          | 1         | −34%               | 6.4%     | 2.0%      |
| ship --quick, GATE 2                 | same            | quick 12,378 at entry; close w/ verify | 67,543→76,738 | 0         | −19%               | 4.4%     | 2.0%      |

"net" is the estimated share of the run's WHOLE prompt volume saved, after the added request. **Read it plainly:** the
command text shrinks by a third on the requests that carry it, and the run's total prompt shrinks by low single-digit
percent in the maintainer's environment (heavier prefix), more in a lean one. A quick path gains least, because its
quick part is loaded anyway; if its quick Read is NOT batched (advisory), one more ~130k-token request cancels the
one-iteration quick loop's gain. Cache effect (reasoned): each part is cache-written once when it enters and read by
later requests — write volume about equal, read volume lower. **No live before/after run was made**; the 37
transcripts predate 6.27.0's routing (every stage inline) and 6.29.0's context-scoped ledger, so none is a baseline for
today's orchestrator, and no historical ledger is reused.

Also measured in those transcripts, recorded for the follow-ups: a Skill invocation injects the stage's whole body into
the orchestrator (`pharn-verify` 40–44 KB, `pharn-regress` 28–33 KB, then), and a second invocation with different
arguments injects it again (`pharn-build`, 28.7 then 29.0 KB).

## Follow-ups (named, not built — P7)

- `inline-stage-reinjection` — the loop's per-iteration inline `/pharn-regress` and `/pharn-verify` (a routing-policy
  question).
- `stage-agent-final-text` — a stage agent's final message returns into the orchestrator unbounded.
- `ship-closeout-script` — Step 3a as one tested script (unchanged).
- `parts-visibility-probe` — a conclusive probe of the two keys on a command FILE, run from a session whose project is
  the tree holding the parts.
