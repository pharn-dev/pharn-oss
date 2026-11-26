# PLAN — loop-host-execution-consent (Linear CORE-397)

- spec_content_hash: 8566b4432ed6cc7035de5d925dafe3755086e23b12acacde0dcdda07a43a9167
- applied_lessons: [L29, L60, L64, L68, L87]
- increment: `/pharn-loop` keeps both consents for host execution: the typed `--accept-host-execution` flag and Claude Code's permission prompt for the flagged isolation line. The command says which one decides and that the run runs at most one isolation line, never retrying after a refusal. The Step 7 summary of an S15 stop says whether the check refused or the person refused at the prompt.
- layer(s): product .claude surface (`.claude/commands/pharn-loop.md`, `pharn-loop-close.md`); tests and apparatus
- constitution_refs: [P0, P2, P5, P6, P7]

## Trigger (P7)

Observed in pharn-app (CORE-392, `/pharn-loop --quick --accept-host-execution`, three runs
`prod-db-explicit-target{,-2,-3}`): the person typed the flag and was then asked by Claude Code to approve the
flagged isolation line, on each run. The issue also reports an S15 refusal followed by a second ask on the re-run.
The command never says which of the two is the consent that counts. It does not say whether a run may run the line
again after a refusal. And the S15 summary cannot tell a prompt refusal from a check refusal, because it quotes
"the check's stderr reason code (or that it printed none)", and a refused prompt also prints none.

## Decision (proposed; the human decides at GATE 1)

**Keep both. They are not the same consent, and collapsing either one undoes a recorded fix.**

- **The typed flag is a request the model reads.** The floor sees argv, never who typed it (`check-run-isolation-core.mjs`
  header; `pharn/LIMITS.md §6`). It decides which of the two lines the run runs, and nothing more.
- **The permission prompt is the consent that counts.** Claude Code shows it and the person answers it outside the
  model's control. Collapsing it means putting the flagged line back in `allowed-tools`. That reverts 7.3.0's fix for a
  review HIGH (`loop-marker-integrity`): the model lifted the only start-time stop (S15) with no prompt, and the record
  credited the operator. `command-hygiene.test.mjs` "✧ 7.3.0" pins that the line stays out.
- **Where no prompt appears, the flag alone lifts the stop.** That happens in auto mode, or under an allow rule of the
  person's. The command already says so (Step 1). This plan restates it next to the rule, so the "which consent" answer
  covers both settings.
- **Within one run, at most one isolation line runs, once.** The run never re-runs the line, flagged or not, after a
  refusal or a non-zero exit. A run without the flag never switches to the flagged line, and a prompt the person
  refused is never asked again: S15 ends the run. The second prompt in the issue therefore belongs only to a new run
  the person starts, and each run asks once. That is intended: an approval at the prompt covers this run only.
- **The S15 summary names which refusal happened.** It says either "refused at Claude Code's permission prompt (the
  check never ran)" or the check's reason code. On a run that got past the check with the flag, the summary keeps its
  "(host execution accepted by operator)" line. The model cannot tell whether a prompt appeared before an approved
  call, so it does not claim one.

The other option, collapsing to one consent, is listed as GATE 1's alternative.

## Discovery (read this run)

- `pharn-loop.md` Step 1a: "Run exactly one of these two lines: the second only when the person typed
  `--accept-host-execution` (Step 1). The second is not in this command's `allowed-tools`, so Claude Code may ask the
  person before it runs (7.3.0); wait for the answer, and a refusal is S15". Nothing about a retry, and nothing about
  which consent decides.
- `pharn-loop.md` "No prompt from Claude Code either (6.58.0)" bullet and Step 1 paragraph `--accept-host-execution`
  (7.1.0) already state that the flagged line is ungranted and that the floor cannot know who typed the flag.
- `pharn-loop-close.md` Step 7 isolation bullet: on S15, "the check's stderr reason code instead (or that it printed
  none)". A refused prompt runs no check, so it falls into "printed none", the same text as a crashed line.
- `pharn/LIMITS.md §6` (the 7.1.0 bullet and its sub-bullet "The floor sees argv, never who typed the flag…") already
  says the prompt is answered by a person in the default mode and by nobody in auto mode. It does not say which
  consent counts, or that a run asks once. **`pharn/LIMITS.md` is human-only** (hook-denied, hard constraint 1), so
  this plan cannot write it. The proposed sentence is under "Human-only edit" below.
- The pharn-app records read `isolation: {"outcome":"HOST",…,"accepted_host_execution":true}` on all three runs.
- Byte budgets (`COMMAND_BYTE_CEILINGS`): `pharn-loop.md` 87,293 of 91,136 (3,843 free); `pharn-loop-close.md`
  42,762 of 43,520 (758 free). The close addition must stay under about 400 bytes.
- L87 sweep, run before writing this plan: the four command sentences this build changes were matched in
  40-character windows against every tracked `*.test.*` file (helper `pharn/.run/core397-win.mjs`). Two hits:
  `entry-gates.test.mjs:1617` pins the S15 row's PREFIX `| S15 | Step 1a's isolation check exits non-zero`, which this
  build keeps (it changes only the row's tail), and `command-hygiene.test.mjs:6649` is a comment that shares a phrase.
  The Step 1a paragraph and the close bullet are unpinned. The build re-runs the sweep over its own `-` lines.

## Applied lessons

- L29 — the rule ranges over the set of isolation lines (both of them, unflagged and flagged), not over the flagged
  one alone: the new test asserts the "at most one, never re-run" sentence is in the
  paragraph that introduces BOTH lines, and the S15 summary names both refusal kinds.
- L60 — every new assertion gets a control that the reader can fail: the test is run once against a copy of the command
  with the new sentence removed and against a copy with the flagged line restored to `allowed-tools`, and both must go
  red. The build records the result.
- L64 — the bound restated in two places (Step 1a and the close part) keeps its quantifier: "at most one isolation line
  per run" and "the prompt, where Claude Code shows one", never a bare "the person always approves". The CHANGELOG
  entry is checked against the same wording.
- L68 — the `pharn/LIMITS.md` sentence is a human-only edit: it lands before build Step 0's anchor or after verify,
  committed, never inside the anchor→verify window (an uncommitted trusted-doc edit reds reconcile). The plan names
  the text for the human below.
- L87 — the sentence sweep above was run before planning, and its two hits are dispositioned. The build repeats it on
  the `git diff -U0 -- .claude/commands` `-` lines before regress.

## Files

- `.claude/commands/pharn-loop.md` — Step 1a's isolation paragraph: which consent decides (the permission prompt,
  where Claude Code shows one; with no prompt, as in auto mode or under an allow rule, the typed flag alone), and that
  the run runs at most one isolation line, once, with no switch to the flagged line and no retry after a refusal or a
  non-zero exit; the S15 row's tail adds "or the person refused the flagged line at Claude Code's permission prompt"
  to the trigger and "approve the prompt on a new run" to the way out — layer product .claude surface
- `.claude/commands/pharn-loop-close.md` — Step 7's isolation bullet: on S15, say "refused at Claude Code's
  permission prompt (the check never ran)" when the flagged line was denied, else the reason code as now — layer
  product .claude surface
- `.dev/floor/command-hygiene.test.mjs` — one ✧ test next to the 7.3.0 test: the Step 1a paragraph holds the
  at-most-one sentence and names the prompt as the consent that counts; the S15 row and the close bullet name the
  prompt refusal; plus the controls from L60 — layer test
- `SKILLS_VERSION` — 7.26.0 to 7.26.1 (patch: clarifies shipped command text; no new capability or shape)
- `README.md` — the badge to 7.26.1
- `pharn-install.json` — regenerated by the docs generator (skillsVersion and the changed files' sha256)
- `CHANGELOG.md` — a 7.26.1 section dated 2026-11-26 with one Changed entry (CORE-397), moving any Unreleased entries
  into it per the file's rule

### Human-only edit (not written by this build)

`pharn/LIMITS.md §6`, at the end of the sub-bullet "The floor sees argv, never who typed the flag, and the record of it
is run-writable.", proposed sentence:

> Of the two, the permission prompt is the consent that counts where Claude Code shows one; the typed flag only selects
> the line. A run runs at most one isolation line and never retries after a refusal, so each run asks at most once,
> and an approval covers that run only (CORE-397).

Per L68, commit it before build Step 0 or after verify. After a trusted-doc edit, regenerate `pharn-install.json`.

## Contracts satisfied

- `pharn/pharn-contracts/loop-record.md` — unchanged: S15 writes no record (no feature directory yet); the `isolation`
  field and `blocked: not-isolated` keep their shape.

## Evals to write (P1)

No capability (`role:` file) changes, so no eval. The pinning test:

- `command-hygiene.test.mjs` ✧ 7.26.1 → GREEN on the built command; RED on a copy with the at-most-one sentence
  removed; RED on a copy whose close bullet lacks the prompt-refusal wording. The 7.3.0 test stays unchanged and still
  holds.

## Guarantee audit (P0)

- "the flagged line is never pre-approved" → FLOOR (regex over committed frontmatter, the existing ✧ 7.3.0 test).
  Whether Claude Code then shows a prompt is harness behaviour: ADVISORY, already stated.
- "a run runs at most one isolation line and never retries" → ADVISORY (an instruction to the model). The test pins
  that the text is present (FLOOR over command text), never that a run obeys it.
- "the S15 summary says which refusal happened" → ADVISORY (a model-written screen line). The model sees a denied tool
  call, so the distinction is available to it. Bounded: an approved call does not show whether a prompt appeared,
  so no line claims one.
- "the prompt is the consent that counts" → ADVISORY (a design statement). PHARN sees neither the prompt nor its
  answer.

## Trust audit (P2)

- No new input. The flag is still taken only from the person's typed leading flags, never from a file (Step 1,
  unchanged).

## Determinism audit (P5)

- No new branch: S15 is still "any non-zero exit, or a refusal". The added sentence removes a possible branch (a
  retry).
