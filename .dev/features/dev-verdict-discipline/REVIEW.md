# REVIEW — dev-verdict-discipline

**Floor first:** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. Verify PASS on the stamp
path (`verify-report.json`), regress `no-regressions` (`regression-report.json`).

**Verdict: GREEN — 0 floor-gate findings, 7 advisory findings** (4 of them follow-ups outside this plan's `## Files`).

The increment is under review as `trust: untrusted`. Nothing in the reviewed files read as an instruction to the
reviewer.

## Floor-gate findings

None. No guarantee is claimed without a floor reduction or an ADVISORY label: the stamp refusal reduces to
`validateStamp` (enum/regex), `check-ship-record.mjs` to glob membership + string equality + a closed line grammar,
and the command-text pins are labelled as pins over text, never proof a run obeyed them. No Capability changed, so
L-eval has nothing to bind; the new checker and the wiring test carry their own tests, each with a negative control.

## Advisory findings

### L-floor (P0)

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: "pharn/floor/run-gates.mjs:965"
  problem: "gateEnv copies process.env and only ADDS PHARN_TEST_RESULTS when resultsFile is non-null, so with resultsFile null an inherited value passes straight through; run-gates.test.mjs:1066 says null means no variable, which holds only in a clean environment, and it went red the first time this repo's suite ran inside the runner."
  evidence: "const env = { ...process.env }; if (resultsFile !== null) env[RESULTS_ENV] = resultsFile;"
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/check-verify.mjs:255"
  problem: "On the stamp path the 'mutually exclusive with a positional results.json' refusal fires only when the map is the FIRST operand; a map appended after --feature <name> is silently not read. It cannot change the verdict (the stamp alone is read), but a hand-assembled map is ignored instead of refused."
  evidence: "a trailing operand: `check-verify.mjs --stamp <s> --feature demo results.json` read PASS from the stamp (dev-verify-stamp.test.mjs, while it was being written)"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".claude/commands/pharn-dev-verify.md:99"
  problem: "With --timeout-ms 3600000, a harness kill of a background run --next leaves a lock the stale-lock recovery treats as live until its age passes the timeout plus grace, so a re-run can be refused for up to about an hour; the command names the orphaned group but not the wait."
  evidence: "the runner's own `--timeout-ms 3600000` (one hour) is the bound that kills a hung gate"
```

### L-trust (P2)

```yaml
- type: FINDING
  rule_id: P2
  severity: minor
  file: ".dev/floor/check-ship-record.mjs:53"
  problem: "The checker reads PR-controlled SHIP.md text and two report JSONs; parsing is line-anchored with fixed regexes, JSON is read with own-property tests through lstat, every quoted value is a string through quote(), and no value is executed — but it runs the PR's own copy of itself, so its verdict on a PR that edits it is that PR's verdict (stated in its header and NOTE)."
  evidence: "IT JUDGES ITSELF. A pull request runs its OWN copy of this checker and of `ci.yml`"
```

### L-axis (P3) and scope (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".claude/commands/pharn-dev-verify.md:109"
  problem: "35 of 343 committed dev plans declare their own later-stage artifacts (VERIFY.md, verify-report.json, REVIEW.md, SHIP.md) in ## Files; under the stamp path those read INCOMPLETE at verify (this increment hit it). The rule now lives in pharn-dev-verify.md, but the place a plan is written, /pharn-dev-plan's Step 3 template, says nothing — follow-up `dev-plan-files-artifacts`."
  evidence: "So a plan's `## Files` names what the BUILD writes, never this stage's or a later stage's own artifact"
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/floor/check-ship-record.mjs:74"
  problem: "check-ship-record imports parseArgs/readBase/isProductSurface from its sibling check-surface-bump.mjs and MAX_BUFFER from check-changelog-entry.mjs; both are .dev/floor apparatus and the pattern is established (check-surface-bump imports check-changelog-entry), and the pharn/floor/gate-run-core.mjs import runs in the allowed dev→product direction (L77). Recorded so a later change to readBase's shape is known to have two callers."
  evidence: 'import { isProductSurface, parseArgs, readBase, MAX_LISTED, QUOTE_LEN } from "./check-surface-bump.mjs";'
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/check-verify.test.mjs:522"
  problem: "A comment still says /pharn-dev-verify 'types the map'; since this increment it reads a stamp. Test-file comment outside this plan's ## Files — follow-up."
  evidence: "/pharn-dev-verify (which types the map) and .dev/floor/check-ship.mjs see byte-identical output."
```

## Summary

The three review findings are fixed as planned. The dogfood is the useful part: the new dev verify, run on itself,
surfaced three defects before the PR — a plan convention that reads INCOMPLETE, a timeout pin this repo's suite cannot
meet in the foreground, and an environment leak from the runner into the suite. Each was a STOP, recorded verbatim
in `VERIFY.md`, fixed inside the plan's files and re-run; none was proceeded past. Two of them point at product code
(`gateEnv`, and check-verify's operand parsing) that this dev-only increment does not change.

## Proposed lesson candidate

- **title:** A verdict path is only measured once it has run on the repo it judges — pins chosen from the runner's
  documentation (a 570 s timeout, a clean environment, a plan convention) were each wrong for this repo's own suite.
- **type:** process · **concepts:** [dogfood, verification-fidelity, test-environment, timeout-pin]
- **source:** this `REVIEW.md` (findings `pharn/floor/run-gates.mjs:965` and `.claude/commands/pharn-dev-verify.md:109`)
  and `VERIFY.md` § "The three earlier attempts".
- Whether it clears L20's bar is the batch orchestrator's call; this worker does not promote canon.
