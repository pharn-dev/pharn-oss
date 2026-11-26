# PLAN — loop-entry-peek-before-spec (Linear CORE-398)

- spec_content_hash: 8566b4432ed6cc7035de5d925dafe3755086e23b12acacde0dcdda07a43a9167
- applied_lessons: [L29, L31, L36, L60]
- increment: `/pharn-loop` peeks at the entry gates once more, before the spec stage starts, so a gate that has already finished red stops the run (S14) before the spec stage spends requests, and the command states why a gate still running cannot be named that early.
- layer(s): product .claude surface (`.claude/commands/pharn-loop.md`, `pharn-loop-close.md`); product floor comment (`pharn/floor/entry-gates.mjs` header); tests and apparatus
- constitution_refs: [P0, P5, P6, P7]

## Trigger (P7)

Observed in pharn-app (CORE-392, `/pharn-loop --quick`): `format:check` was red on the base commit, yet the run
stopped at S14 only at the peek after Step 3. The ledger counted 30 requests before the stop (12 unattributed, 18
`pharn-spec`), and the person learned which gate was red only at the end.

## Re-plan (2026-11-26, after a RED-verdict STOP at regress)

The first run of this plan stopped at `/pharn-dev-regress` with `verdict: regressions`: `.dev/floor/command-family.test.mjs`
R4/R5 pins `/pharn-loop`'s close-part pointer sentence verbatim ("… (Step 1a and Step 2 name them), from Step 7."), and
the build reworded it to name Step 3's first peek — an edit this plan did not list, to a file a test outside `## Files`
pins. The human chose at the STOP to keep the rewording and re-plan with the test. So this plan adds the pinning test
to `## Files` and lists the pointer rewording explicitly. (The old wording arguably already covered the new stop,
since S14 is a Step 2 row; the human's choice keeps the explicit mention.) Before the build, every sentence the build
changes in a command is grepped across `*.test.*` files, not only the peek wording. Done at re-plan: each of the six
command lines the build changed was matched (40-character windows) against every tracked `*.test.*` file; only the
close pointer is pinned outside `## Files` (`command-family.test.mjs`). The S14 row's hit in `command-hygiene.test.mjs`
is on its unchanged tail ("… was red on the tree the run started …"), and that suite passed at regress's HEAD run.

## Discovery (read this run)

- `pharn-loop.md` Step 1a item 6 starts the entry gates in the background (`entry-gates.mjs --start`); the first read
  is the `--peek` after Step 3's `check-spec-approved.mjs`, the second after the plan, the final `--wait` before
  `/pharn-test`. Step 1b (read the prior record) sits between the start and Step 3, so a few seconds of runner time
  pass before the spec stage starts.
- `--peek` (7.5.0) is one read: no wait, no takeover, no write. Over the in-progress record only a RED among the gates
  finished so far is a verdict; anything else is exit `5` (continue). So a peek before the spec stage costs no
  request beyond the one Bash call, writes nothing, and can stop only on a red that already finished.
- **Is the current order a deliberate trade-off?** The deliberate part is that the gates run IN PARALLEL with the
  spec, plan and grill stages (6.42.0), so the final read must wait for the slow gates (a test suite) without
  serialising the front. Nothing in the command, `entry-gates.mjs`'s header or `pharn/LIMITS.md` gives a reason
  for not reading what has ALREADY finished before the spec stage (grep of LIMITS for peek / entry gate: no hit).
  The 7.5.0 placement after the spec stage reads as "the earliest boundary that existed then", not as a decision
  against an earlier one. So the earlier peek is added, and the part that cannot be done — naming a gate still
  running, or an unmeasured one (only known when its per-gate timeout kills it, or on a finished result) — is stated.
- A stop at this point precedes `pharn/features/<name>/` (the spec stage creates it), exactly like S14c and S15. The
  command already routes such stops: no record, the Stop guard skips a run with no feature directory
  (`require-loop-record.cjs` line 236), "At the stop" aborts the entry gates once `<name>` exists, and the close part
  is followed from Step 7. What is missing for an S14 / S14b stop there is where the red ids go: normally the record's
  `### next_steps`; with no record, the Step 7 summary must name them.
- The quick part (`pharn-loop-quick.md` item 2) replaces only Step 3's start and brief lines; the new peek sits before
  them and is a separate line, so a `--quick` run runs it as written (quick skips stages, never the entry).
- Byte budgets (`COMMAND_BYTE_CEILINGS`): `pharn-loop.md` 86,261 of 91,136; `pharn-loop-close.md` 42,531 of 43,520.
- `/pharn-ship` (the copy-pair, L31) peeks only after its plan stage. Deliberately OUT of scope: no observed failure
  there (P7), and its spec stage stops at a human gate anyway. Named follow-up `ship-entry-peek-before-spec`.

## Applied lessons

- L29 — the S14/S14b stop sites are a set: the existing `entryStopSites` enumeration already iterates the two rows and
  two bullets; the new trigger wording goes into both rows (S14 and S14b), and the test's `PEEK_WIRING` site list is
  the enumeration of peek boundaries the order assertions range over (three sites, not a one-off assertion for the new one).
- L31 — `PEEK_WIRING` ranges over both orchestrators; this increment changes only the loop's row and names the ship
  copy's exclusion and its follow-up here and in the CHANGELOG, so the second copy is a stated decision, not a drop.
- L36 — the peek line's count becomes exactly three in `pharn-loop.md` (a closure over the pinned spelling, already
  asserted by `count(body, PEEK_LINE) === sites.length`); every mention of the peek points ("the two peeks", "after the
  spec and plan stages", "a peek after Step 3 or after the plan") is reworded, found by grep, not by memory — and
  (re-plan) the grep now covers every changed command sentence against the `*.test.*` files that pin command text,
  which is the set the first run missed.
- L60 — the new site's `after` / `before` anchors are asserted found before slicing (the existing loop asserts
  `after >= from` and `before > at`); a negative control is run once by hand at build: move the new peek after the
  spec start line in a scratch copy and confirm the order test turns red, and record that in the build notes.

## Files

- `.claude/commands/pharn-loop.md` — a third peek block at the top of Step 3, before the spec stage's start line,
  with its branch (exit 4 to S14, exit 6 to S14b, each unless the allow-red-entry flag; every other exit goes on;
  never re-run on 5) and one sentence that this stop precedes the feature directory, so there is no record and the
  close part is followed from Step 7; the bound sentence (a gate still running, or unmeasured, is not named here —
  the later peeks and the final read find it; waiting here would serialise the front the gates run beside); reword
  Step 1's "the two peeks", Step 1a item 6's "peeked at after the spec and plan stages", the S14 and S14b rows'
  trigger, Step 4's "the two peeks above", and the close pointer's "(Step 1a and Step 2 name them)" to name Step 3's
  first peek — layer product .claude surface
- `.claude/commands/pharn-loop-close.md` — Step 7: on an S14 or S14b stop before the feature directory exists, name
  the peek document's red ids and unmeasured entries as DATA, with the row's remedies (the record that would carry
  them does not exist) — layer product .claude surface
- `pharn/floor/entry-gates.mjs` — header comment only: the peek runs before and after the loop's spec stage and after
  its plan stage — layer product floor (comment; no behavior change)
- `pharn/floor/entry-gates.test.mjs` — the PEEK_WIRING loop row gains the pre-spec site (before the spec stage's
  start line) and the closed count becomes three; the comment above the table names the three sites — layer test
- `.dev/floor/command-family.test.mjs` — the close pointer's pinned sentence in its table follows the command's new
  wording, which names Step 3's first peek among the stops before the feature directory exists — layer test
- `.dev/guides/floor-gates.md` — the entry-gates block's 7.5.0 sentence names the new peek point — layer apparatus
- `SKILLS_VERSION` — 7.25.6 to 7.26.0 (minor: a new read point in a shipped command, as 7.5.0's peeks were)
- `README.md` — the badge to 7.26.0
- `pharn-install.json` — regenerated by the docs generator (skillsVersion and the changed files' sha256)
- `CHANGELOG.md` — a 7.26.0 section dated 2026-11-26 with one Changed entry (CORE-398), moving the Unreleased
  entries into it per the file's rule

## Contracts satisfied

- `pharn/pharn-contracts/loop-record.md` — unchanged: a stop before the feature directory writes no record, as for
  S14c and S15; the S14 / S14b blocked ids are the same members.
- `pharn/pharn-contracts/cost-ledger.md` — unchanged: `--peek` appends no observation (entry-gates.mjs header).

## Evals to write (P1)

No capability (no `role:` file) changes, so no eval. The order is pinned by the ★ WIRING test:

- `entry-gates.test.mjs` PEEK_WIRING (loop) → three peek sites, in order: before the spec start line; after
  `check-spec-approved.mjs` and before the plan start; after the plan finish and before `check-plan-spec-agree.mjs`;
  each before the final `--wait`, each with its branch (`4` → S14, `6` → S14b, `--allow-red-entry`, every other exit
  → go on, never re-run on `5`). Negative control at build: the new peek moved after the spec start line → RED.
- The existing ★ WIRING test (start before the spec start line) still holds; the new peek must come AFTER the start
  line (asserted: the site's `after` anchor is the run-start/entry line chain ending at `--start`).

## Guarantee audit (P0)

- "a red gate already finished is named before the spec stage spends requests" → ADVISORY orchestration (the agent
  runs the line); the VERDICT is FLOOR (enum over exit codes, `entry-gates.mjs --peek`'s `decideResult` /
  `inProgressStampView`, unchanged). Bounded, and stated in the command: only a gate that FINISHED red by then;
  a gate still running or unmeasured is found at the later reads.
- "the peek's order in the command" → FLOOR (regex/indexOf over the committed command text, the ★ WIRING test) —
  presence and order of the text, never that a run executes it.
- "this cannot be done for every gate without serialising the front" → ADVISORY (a stated design bound, not a check).

## Trust audit (P2)

- The peek document's `red` / `unmeasured` ids are floor-produced (enum/path); quoted in the summary as DATA, as the
  existing S14 next_steps copy is. No new untrusted input.

## Determinism audit (P5)

- The new branch is a membership test on the peek's exit code, identical to the two existing peeks. No judgment.
