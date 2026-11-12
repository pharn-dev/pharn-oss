# REVIEW — entry-context-guard

Floor first: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. Verify PASS and regress
`no-regressions` stand (`VERIFY.md`, `REGRESSION.md`). Everything below is advisory model judgment over the increment,
which was read as `trust: untrusted`; no instruction-looking content was found in it.

## Floor-gate findings

None. No guarantee is claimed without a floor reduction (the compare and the exit code are floor; the size being this
context's, the probe, and a run obeying the exit are labelled advisory in the core header, the CLI header, the guide,
the CHANGELOG entry and the command text). No capability or `rule_id` is added (P1 not engaged). No capability-tree
sibling reference: the new modules import floor modules in `pharn/floor/`, as the cost ledger does.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P5
  severity: minor
  file: "pharn/floor/check-entry-context.mjs:67"
  problem: "A pharn.config.json that exists but cannot be read (a directory, no permission) is reported with the detail 'is not valid JSON', which names the wrong cause for the person reading the unknown line."
  evidence: 'return "\0unreadable"; // not JSON, so parseEntryThreshold reports it as threshold-malformed'
- type: FINDING
  rule_id: P4
  severity: minor
  file: ".claude/commands/pharn-ship.md:8"
  problem: "/pharn-ship now runs pharn/floor/check-entry-context.mjs but its frontmatter `reads:` does not list it, while /pharn-loop's does; the two lists disagree about the same line."
  evidence: 'reads: [... "pharn/floor/entry-gates.mjs", ...] — no check-entry-context.mjs'
- type: FINDING
  rule_id: P5
  severity: minor
  file: "pharn/floor/entry-context-core.mjs:148"
  problem: "When the only holder of the run-start line is a record whose context is undecidable (bindRun's NO_CONTEXT with a null holder), the reason is `no-holder`, whose sentence says no tool result carries the line; the outcome (go on) is right, the sentence is not."
  evidence: 'if (bound.context === null) return unknown(new Set(held).size > 1 ? "several-holders" : "no-holder");'
- type: FINDING
  rule_id: P2
  severity: minor
  file: ".claude/commands/pharn-loop-close.md:237"
  problem: "The Step 7 bullet tells the orchestrator to quote the witness line verbatim; for `threshold-malformed` that line carries up to 64 characters of the project's config value (through shown()), which is untrusted text reaching the summary — bounded by /pharn-loop's trusted prefix (all such text is quoted as DATA) and by gating nothing."
  evidence: "quote that line verbatim; a `within` line or no witness → nothing"
```

## Dispositions (GATE 2 is delegated: cheap in-scope advisory findings are fixed)

- Finding 1 (unreadable config detail) and finding 2 (`reads:` parity) — cheap, inside `## Files`: fixed in iteration
  2, then regress and verify re-run.
- Finding 3 (`no-holder` sentence for an undecidable holder) — follow-up `entry-context-undecidable-holder-reason`:
  a closed-set change (a new reason) better made with its own test than squeezed in here.
- Finding 4 (config text in the quoted line) — accepted as stated; the trusted prefix already fences quoted text as
  DATA, and the line gates nothing.

## Iteration 2 — the fixes, two merges of `origin/main`, the renumber

Re-read: the fix diff (`readThreshold` in `check-entry-context.mjs` with two tests; one `reads:` line in
`pharn-ship.md`), the two merge commits (CORE-105 at 7.11.0 edited `pharn-loop.md`, `stage-agent*.mjs` and the hygiene
test; CORE-75 at 7.12.0 edited the gate runner and the cost ledger, including `render-cost-ledger.mjs`, whose
`readMarkers` this CLI imports), and the renumber to 7.13.0 (every added `7.11.0` / `7.12.0` found by diffing the added
lines against `origin/main`). No new finding: `pharn-loop.md`'s S15b row, grant and Step 1a block survived the
CORE-105 merge unchanged (87,901 B against the 93,184 B row), `readMarkers` keeps its signature, and the released
`[7.11.0]` and `[7.12.0]` CHANGELOG sections are byte-identical to main's. Regress (base `f47b94e1`) and verify were
re-run on the final tree: `no-regressions`, PASS.

## Proposed lesson candidate

None. No finding shows a recurring mechanism failure (L20's bar): the four are one-off precision slips.

Verdict: **GREEN — 0 floor-gate findings, 4 advisory (2 fixed in iteration 2, 2 named as follow-ups / accepted).**
