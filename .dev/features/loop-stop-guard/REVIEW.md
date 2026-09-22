# REVIEW — loop-stop-guard

**Floor:** `validate` GREEN. The standing verdicts are verify `PASS` (`reconcile` CLEAN, 2591/2591 tests)
and regress `no-regressions`. Everything below is advisory. The increment was reviewed as
`trust: untrusted`, and nothing in it read as an instruction.

## Floor-gate findings (blocking)

None. The guard is described everywhere as **advisory infrastructure**, never as a floor primitive:

- `pharn-loop.md`'s Guarantee audit;
- the hook header;
- CLAUDE.md;
- CHANGELOG.

Its "what it cannot do" list appears verbatim in the header and is repeated, not paraphrased. The
"inert until wired" state is stated in the command, the header, VERIFY.md and `APPLY.md`, and
`hook-wiring.test.cjs` reports it on its diagnostic channel. No Capability was added.

## Advisory findings

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".claude/hooks/require-loop-record.cjs:260"
  problem: "The guard's session binding assumes the Stop payload's `session_id` equals the `CLAUDE_CODE_SESSION_ID` that `--open` recorded. That equality was OBSERVED (the env var in this session's Bash equals the session's own id), never PROBED through a live Stop event: firing one needs the wiring in `.claude/settings.json`, which is human-only. If the two ever differ, the guard is INERT, which is fail-open and the safe direction. But then it would be silently useless, and no test here can see that."
  evidence: 'if (typeof sessionId !== "string" || sessionId === "") return "";'
```

Named follow-up `stop-guard-live-probe`: once a human applies `APPLY.md`, run one short `/pharn-loop` and
end the turn before Step 6b. Confirm that exactly one refusal renders. State the result in the PR that
records it. Until then the PR and CLAUDE.md say "observed, not probed".

```yaml
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".claude/commands/pharn-loop.md:881"
  problem: "The first draft placed the `--close` paragraph between the Final step's `--clear` block and the 'Why this exists' / ADVISORY paragraphs that explain `--clear`. That makes the rationale read as belonging to `--close`."
  evidence: "**Then close the run for the Stop guard** — after every write"
```

**Fixed at GATE 2**, within the planned files. The `--close` paragraph now ends the Final step. The
hygiene pin (`--close` after `--clear`) and the ★ execution test both still pass, and iteration 2's
regress and verify are green.

## Lens notes

- **L-floor (P0).** The fail-open claim rests on the channel, not on discipline: exit 0 + JSON is the only
  blocking output, and a test drives every CLI failure path to exit 0. The two caps are named apart:
  K = 3 total per run, and the platform's 8 consecutive blocks. The prompt's
  `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` claim was checked against the raw page and struck.
- **L-eval (P1).** 40 guard tests at 96.5% line coverage. The inert set (8) and the fail-open set (12)
  are counted, and each inert case is paired with a blocking control. The regression that killed the
  markers design (a `/pharn-ship` run in progress) is pinned. A ★ test executes the committed `--open` /
  `--close` lines. The wiring suite executes the staged exec-form entry from a subdirectory, with a
  mistyped-path negative control. `workTreeRoot()` is pinned three ways.
- **L-trust (P2).** The payload's free text (`last_assistant_message`, `transcript_path`) is never read.
  The refusal is one closed-set line whose only variable is a JSON-quoted path. A test shows that a
  crafted name cannot break out of the quoting. The Stop mode writes nothing but its counter, which is
  tested across four fixtures.
- **L-axis (P3).** One file owns the marker schema, as its writer and its reader (L35). The Stop mode and
  the marker modes share that schema and nothing else.

## Verdict

GREEN at the floor. There are 2 advisory findings (1 important, which is a named follow-up; 1 minor, fixed
at GATE 2).

## Proposed lesson candidate

None. The summary-model hallucination is an instance of L37 (probe, do not read off), and the raw-page
check that caught it is L37's own remedy. The no-feature-directory conflict was caught by the grill before
the build, which is the pipeline working as intended, not a recurrence.
