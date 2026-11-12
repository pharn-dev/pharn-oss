# PLAN — loop-amend-exit6

- spec_content_hash: d19c3ae5ef62837c025d3dffb5e878c114e0c1d4a745caf51b4c114b9e7a8bcf
- applied_lessons: [L29, L36, L64, L68]
- increment: 7.10.1 (PATCH) — in `/pharn-loop`'s amend branch, the re-run spec stage's `stage-agent.mjs finish` exit `6`
  goes to S9b (stop the agent with TaskStop, then halt), as at every routed stage, instead of S18; every other failing
  line of the branch stays S18. The S18 row, the supervisor contract's restatement and a closure test over every
  "whatever `finish` printed" sentence follow, and the 7.10.0 wording "byte-identical" / "once per run" is corrected in
  `docs/limitations.md` and, by the maintainer's patch, in `pharn/LIMITS.md` §1d and `pharn/THREAT-MODEL.md` §5.
- layer(s): product commands (`pharn-loop.md`), pharn-contracts (`supervisor.md`), trusted docs (maintainer's patch),
  shipped docs (`docs/limitations.md`), dev floor tests
- constitution_refs: [P0, P2, P4, P5, P6, P7]

## Applied lessons

- L29 — the exit-6 rule is quantified over a set ("at every routed stage"), so the test ranges over the set: it
  collects every sentence in `pharn-loop.md` that routes a `finish` read and requires each to except exit `6`, rather
  than one assertion written for the amend branch.
- L36 — that collection is a closure assertion: every occurrence of the stems "`finish` printed" and "its `finish` read"
  must carry the exception, so a new branch that routes a `finish` read without it fails, whichever spelling it uses.
- L64 — the S18 rule is restated in three places (the amend branch, the S18 table row, `supervisor.md`'s amend section);
  each is corrected and probed as a sentence of its own, and the "byte-identical" bound is corrected in every
  restatement it has (LIMITS §1d, THREAT-MODEL §5), not only one.
- L68 — the trusted-doc wording is a human-only write: the maintainer runs the patch script after GATE 1 and it is
  committed BEFORE `/pharn-dev-build`'s Step 0 anchors, so reconcile never sees it as an escape.

## The failure (P7)

CodeRabbit's review of PR #433 (7.10.0, merged) found it, and it is real: the amend branch says "**Every other exit in
this branch** — `begin`, the spec stage's report-back … or its `finish` read, either check — → **S18**", while
`## Running a stage` says `stage-agent.mjs finish`'s exit `6` "is **S9b** at every routed stage". Two rows claim one
exit, and S18's remedy never stops the stage agent, which may still be writing. The 7.10.0 grill's concern (G1) asked
that the re-run spec stage's failures map to S18 "never Step 3's S6 / S6b / S9"; the build widened that to every exit,
exit `6` included. The 7.10.0 review's finding 1 (minor) and CodeRabbit both note that "byte-identical" overstates the
append-only check, which compares section lines, not the `##` heading lines, and drops trailing blank lines; and "once
per run" holds while `SPEC.a1.md` stays on disk.

## Files

- `.claude/commands/pharn-loop.md` — the amend branch's S18 sentence excepts the `finish` read's exit `6` (S9b,
  `## Running a stage`); the S18 row says the same — layer product command
- `pharn/pharn-contracts/supervisor.md` — "Any non-zero exit in the branch is S18" gains the exit-`6` exception (S9b) —
  layer pharn-contracts
- `.dev/floor/command-hygiene.test.mjs` — the amend-branch assertion pins the exception; a new closure test over every
  "`finish` printed" / "its `finish` read" sentence in `pharn-loop.md`, with a control that the 7.10.0 sentence fails —
  layer dev floor test
- `docs/limitations.md` — the 7.10.0 sentence states that an amend is refused once `SPEC.a1.md` exists, so "once per
  run" holds only while that file stays on disk — layer shipped docs
- `CHANGELOG.md` — a `[7.10.1]` section, `### Fixed` — repo meta
- `SKILLS_VERSION` — `7.10.1` — repo meta
- `README.md` — the version badge — repo meta

### Not in `## Files` — the maintainer's patch (human-only, fix #2)

A Python patch script in the session scratchpad, run by the maintainer after GATE 1 and committed before the build
anchors (L68); the script is deleted after it runs. It replaces:

- `pharn/LIMITS.md` §1d (the `amend-spec (7.10.0)` bullet): "once per run and append-only: the floor holds the intent,
  the scope and every earlier criterion byte-identical to the archived SPEC" → "once per run (while the run's
  `SPEC.a1.md` stays on disk: a Bash `rm` of it is neither prevented nor detected) and append-only: the floor holds the
  intent, the scope and every earlier criterion line for line equal to the archived SPEC (the `##` heading lines and
  trailing blank lines aside)".
- `pharn/THREAT-MODEL.md` §5: "are byte-identical to the archived SPEC, that at least one criterion is added, and that
  it happens once per run" → "are line for line equal to the archived SPEC (the `##` heading lines and trailing blank
  lines aside), that at least one criterion is added, and that it happens once per run while the run's `SPEC.a1.md`
  stays on disk".

`pharn/ARCHITECTURE.md` is not touched, so `spec_content_hash` stays valid.

## Contracts satisfied

- `pharn/pharn-contracts/supervisor.md` "Amend-spec (7.10.0)" — its S18 sentence now agrees with `pharn-loop.md`'s
  S9b rule (cite, P4).
- `pharn/pharn-contracts/loop-record.md` — unchanged: S9b's `stage-outlived-wait` and S18's `spec-amend-red` are both
  already in `BLOCKED_IDS`.

## Evals to write (P1)

No Capability is added or changed. Tests:

- closure: every occurrence of "`finish` printed" or "its `finish` read" in `pharn-loop.md` has "exit `6`" in the same
  sentence (→ S9b); control: the 7.10.0 amend sentence, spliced back in, fails it (L60);
- the amend-branch assertion: "its `finish` read (its exit `6` alone excepted: **S9b**" precedes "→ **S18**";
- the S18 row names the exit-`6` exception.

## Guarantee audit (P0)

- "the amend branch routes the spec stage's `finish` exit `6` to S9b" → advisory (command prose an agent follows); the
  test pins the text, never a run.
- "every `finish`-read routing sentence in `pharn-loop.md` excepts exit `6`" → enum-regex over the command's text (a
  hygiene test); it covers the two stems it collects, not a sentence that routes a `finish` read in other words.
- the corrected bounds ("line for line", "while `SPEC.a1.md` stays on disk") → each restates `spec-amend-core.mjs`'s
  `checkAmend` and `supervisor-core.mjs`'s `amend-used`, which are enum-regex checks already tested; no new claim.

## Trust audit (P2)

No new input is read. The change narrows which stop an exit code maps to; no free text reaches a decision.

## Determinism audit (P5)

The routing stays a membership test over exit codes: `6` → S9b, any other non-zero → S18.

## GATE 1 and the trusted-doc commit

- GATE 1: the maintainer, in chat, "Approve as written", 2026-11-11.
- The maintainer ran the patch script; its output was committed as `622d508e` before the build anchored (L68), and the
  script was deleted.
- The grill's 3 minor concerns are acted on in the build: the closure test folds whitespace, ranges over
  `pharn-loop.md`, `pharn-loop-quick.md` and `pharn-loop-close.md`, and states its stems-only bound in its own comment.

## Open questions (HALT)

None. The maintainer asked for the trusted-doc wording through a patch script they run (chat, 2026-11-11).
