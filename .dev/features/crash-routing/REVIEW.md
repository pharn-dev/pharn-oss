# REVIEW — crash-routing

**Verdict: GREEN — 0 floor-gate findings open.** The review found one important and six minor findings; all seven were
fixed inside the plan's `## Files` before this was written, and the regress and verify stages were re-run on the fixed
tree (REGRESSION.md, VERIFY.md).

Floor first: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked`. Everything below is
advisory model judgment.

Method: one independent read-only reviewer applied the four lenses (L-floor P0, L-eval P1, L-trust P2, L-axis P3) to
`git diff HEAD` plus the untracked files, probing claims in temp copies. The reviewed increment is `trust: untrusted`;
no instruction-looking content was found in it. The findings are quoted as DATA, with `file` cites as the reviewer gave
them (against the pre-fix tree).

## Findings (as found)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important # floor-gate: verifiable, a test pins it
  file: "pharn/floor/check-loop-fresh.mjs:81-83"
  problem: "The result check tests the keys of the object in memory, not the JSON it prints and not the value of stage_to_rerun. A RERUN result with stage_to_rerun undefined passes, and JSON.stringify drops that key. The output is exit 1 with no stage_to_rerun, which is the exact defect this increment closes."
  evidence: "stub core {code:1, doc:{verdict:'RERUN', stage_to_rerun: undefined, …}} → exit=1, printed JSON has 5 keys and no stage_to_rerun; with stage_to_rerun: null → exit=1 and a null stage"
- type: FINDING
  rule_id: "P0"
  severity: minor # floor-gate
  file: "pharn/floor/check-loop-fresh.mjs:53,95"
  problem: "The crash path runs outside any try, so it can itself throw, giving node's exit 1 with an empty stdout. The header's claim that an async throw lands after the document is printed is false for a microtask, and CLAUDE.md and gate-run-record.md say 'never node's exit 1' with no qualifier."
  evidence: "throw Object.create(null) at load or in evaluate → exit=1, stdout empty; a BigInt in checks → exit=1, stdout empty; queueMicrotask throw at load → exit=1, stdout empty"
- type: FINDING
  rule_id: "P1"
  severity: minor # floor-gate (hermeticity)
  file: "pharn/floor/check-loop-fresh.test.mjs:1535"
  problem: "The new ✧ L35 test calls evaluate() with --repo set to pharn/floor; it asks for a re-run and appends a budget-ledger row inside the source tree (gitignored), so it is not hermetic and every floorCopy() copies the stray folder."
  evidence: 'pharn/floor/.pharn/pharn-loop/demo/freshness.jsonl = {"iter":1,"stage":"verify","reason_code":"report-missing"}'
- type: FINDING
  rule_id: "P1"
  severity: minor # advisory: the behavioral sweep backs it
  file: "pharn/floor/check-loop-fresh.test.mjs (✧ L35, staticClosure)"
  problem: "The 'no static import' pin misses `export … from`, which is also a static load; restoring the old exports that way reopens the defect while the pin stays green. staticClosure has the same matcher gap."
  evidence: 'entry + `export * from "./loop-fresh-core.mjs"`: pin regex → false; with test-infra-core broken → exit=1, 0-byte stdout'
- type: FINDING
  rule_id: "P2"
  severity: minor # floor-gate
  file: "pharn/floor/check-loop-fresh.mjs:47-48"
  problem: "shortPaths does not shorten 'every absolute path': a path with whitespace or a quote leaks directory segments into the reason /pharn-loop copies into a committed record, and it mangles relative paths; the 300-character bound has no test."
  evidence: "'/Users/John Doe/my proj/.pharn/pharn-loop/demo' → '…/John Doe/my proj…/demo'; 'pharn/floor/x.mjs' → 'pharn…/x.mjs'"
- type: FINDING
  rule_id: "P5"
  severity: minor # advisory (command prose)
  file: ".claude/commands/pharn-loop.md:622"
  problem: "At the commit gate any non-zero exit, checker-crashed included, is recorded as `not committed: evidence stale`; the plan's reason for a distinct code applies here and the doc sweep did not reach this line."
  evidence: "'`0` → continue to 1. Any other exit → `not committed: evidence stale`'"
- type: FINDING
  rule_id: "P3"
  severity: minor # advisory
  file: "pharn/floor/ac-tests-lock.mjs:91"
  problem: "shelled-verdict-core.mjs also joins check-verify.mjs's static load graph (check-verify → ac-gate-core → ac-tests-lock); only check-test-stage's widened graph is stated."
  evidence: "ac-gate-core.mjs:72 imports from ./ac-tests-lock.mjs; check-verify.mjs:127 imports ac-gate-core.mjs"
```

## Dispositions (all taken, inside the plan's `## Files`)

1. **Serialized-document check (important).** `check-loop-fresh.mjs` now serializes the document first and judges the
   parsed-back text: exit code in `{0, 1, 2, 4}`, exactly the six keys, the verdict for that code, and a RERUN naming a
   stage (a non-empty string). Tests: RERUN with `stage_to_rerun` undefined, and null → exit 2; a RERUN naming `verify`
   → exit 1 with its document (control).
2. **A total crash path (minor).** `firstLineOf` cannot throw; the document is serialized inside the `try`; process
   `uncaughtException` / `unhandledRejection` handlers map an async throw to the crash document before printing, or to
   exit 2 after it. Tests: `throw Object.create(null)` at load and while checking, a BigInt in the document, a
   microtask throw at load, and a timer throw after printing (the printed FRESH document stands, exit 2). CLAUDE.md and
   `gate-run-record.md` now say "not node's exit 1 — outside the stated residuals".
3. **Hermetic L35 test (minor).** It uses `--commit-gate` over an empty temp repo (the commit gate never writes the
   ledger) and asserts nothing was written; the stray `pharn/floor/.pharn/` it had created was deleted (gitignored
   scratch from this build's own test run).
4. **`export … from` (minor).** The pin matches both static forms, with a mutation control proving the re-export is
   caught; `staticClosure` follows both.
5. **Paths (minor).** `shortPaths` maps the working directory to `.` and the home directory to `~` before the
   boundary-anchored `…/<basename>` rule (a relative path is left alone). Tests: a crash under a directory whose name
   has spaces reads `mkdir './.pharn/pharn-loop/demo'`; a 1,000-character message is bounded. The remaining residual
   (a spaced path outside both directories) is stated in the header.
6. **The commit gate's record (minor).** `pharn-loop.md` names `checker-crashed` at the commit gate: still
   `not committed: evidence stale`, with the JSON's `reason` quoted so a person sees the cause is the checker. The
   token is unchanged (other pins read it).
7. **The widened graph (minor).** `shelled-verdict-core.mjs`'s header states that it is in `check-verify.mjs`'s static
   graph through `ac-tests-lock.mjs` → `ac-gate-core.mjs`, and that a failure to load it is fail-closed where it is
   read.

## What each lens found nothing on (the reviewer's record)

- L-floor: the "identical twin" bound holds (each shelled checker's deeper calls take only SPEC.md, so check I makes
  the same calls first); the ✧ premise holds (every exit-1 return in both grandchildren goes through `red()`);
  `checkLock`'s callers are complete; the core moved without behaviour change (diffed against HEAD).
- L-eval: the new tests discriminate — on the old code each crash case reads `pin` / `mapping-red` / `lock-red`, and
  the `--record-red-run` test would get exit 2 instead of 1.
- L-trust: the stderr excerpt is JSON-escaped and cannot inject a line; the token is read only at the start of stdout;
  check I copies only the token and an indented `RED —` line, never the crash excerpt.
- L-axis: `shelled-verdict-core.mjs` imports nothing and has one reason to change; the entry/core split is sound and
  the restated constants are pinned.

## Proposed lesson candidate

The reviewer proposed one: _validate the bytes you emit, not the object you built_ — the entry checked a JavaScript
object while the loop reads its JSON, and `JSON.stringify` drops an undefined key; L5's input-boundary rule turned to
the output boundary. Its disposition is recorded in SHIP.md (Step 2b).
