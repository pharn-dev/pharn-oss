# REVIEW — setter-dropped-bullets

- Floor first (P0): `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked` (build Step 3).
- Reviewer: an independent read-only subagent, briefed with the diff and the four lenses but not with this session's
  conclusions; it ran read-only commands only (`git diff dde008dc`, grep, the setter under `--check`). Its findings are
  below, each with what this run did about it. Everything here is model judgment: ADVISORY (fix #3).
- The increment under review is `trust: untrusted`; no instruction-looking content was found in it.

## Floor-gate findings (blocking)

None. No P0 guarantee without a floor reduction, no missing eval binding (no Capability changed), no sibling reference.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: "CHANGELOG.md:44"
  problem: "The CHANGELOG said every comment and the ac-tests.md sentence that said the setter 'drops' such an item now says it refuses, while ac-tests-lock.mjs:503 and several unchanged files still said drop or filter."
  evidence: 'The comments and `ac-tests.md` sentences that said the setter "drops" such an item now say it refuses.'
- type: FINDING
  rule_id: P0
  severity: important
  file: "pharn/floor/check-regress.mjs:428"
  problem: "'reaches this partition only through a plan edited after the build's Step 0' overstates it: Step 0 is an advisory Bash step, so a run that skipped it also reaches the partition (same in render-regression.mjs:329 and stage-verify.test.mjs:636)."
  evidence: "so it reaches this partition only through a plan edited after the build's Step 0"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/setter-dropped-bullets/PLAN.md:6"
  problem: "The PLAN describes an annotation-only empty item that clean() never produces; the empty reason fires only for whitespace-only back-ticks, and the promised annotation-only test does not exist."
  evidence: "or is empty once its trailing `(…)` annotation is cut"
- type: FINDING
  rule_id: P2
  severity: minor
  file: ".claude/hooks/set-writes-scope.test.cjs:1830"
  problem: "JSON.stringify escapes C0 controls only; C1 controls, DEL and bidi overrides reach stderr raw, so the test title's 'a control character never reaches the terminal raw' holds for C0 only. No consumer parses the message."
  evidence: "a control character never reaches the terminal raw"
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".claude/hooks/set-writes-scope.test.cjs:182"
  problem: "Older than this change: the real-template test asserts only exit 1, which it gets from 'no `## Files` heading' (the template's list is fenced), so it would pass for any refusal."
  evidence: "assert.equal(r.status, 1);"
- type: FINDING
  rule_id: P1
  severity: minor
  file: "pharn/floor/check-ac-tests.test.mjs:934"
  problem: "buildScopeAllows returns [] on any 'cannot be scoped' refusal without checking that the row held a non-concrete item; the expected tables still catch a mismatch."
  evidence: "if (set.status === 1 && /item\\(s\\) in .* cannot be scoped/.test(set.stderr)) return [];"
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".claude/hooks/set-writes-scope.cjs:1045"
  problem: "A duplicated glob item is named and counted twice, and the new refusal runs before the control-surface, project-relative and canon refusals, so a plan with both kinds is fixed in two rounds."
  evidence: "const dropped = raw.filter((entry) => {"
```

## What was done

- **CHANGELOG (important) — fixed.** `ac-tests-lock.mjs:503` now says "does not scope (… which it refuses since
  7.22.0)". The CHANGELOG names the four files and the contract sentence that changed and lists the unchanged ones that
  still say the hook "drops" such an entry (`stage-regress.mjs`, `quick-scope-core.mjs`, `regression-report.md`) or call
  `isConcrete` the setter's "filter" (`check-build-complete.mjs`, `ac-test-infra-core.mjs`): still true in effect (the
  hook allows none of such an entry), but they predate the refusal. Rewording them needs those files in a plan's
  `## Files`; deferred (SHIP.md).
- **"only after Step 0" (important) — fixed** in all three places: "a plan the setter never judged — edited after the
  build's Step 0, or a run that skipped that advisory Bash step, L19".
- **PLAN annotation-only wording (minor) — corrected** in PLAN.md's "Renumbered again, and amended after review"
  section; the shipped message and the test already describe the reachable case.
- **C1 / DEL / bidi (minor) — bound stated** in the CHANGELOG and the test title. Escaping them in the setter is a
  human-only patch; deferred.
- **Template test (minor) — fixed:** it now asserts `no \`## Files\` heading`.
- **buildScopeAllows, duplicates, refusal order (minor) — not changed.** The HOOK_ROWS test ties the refusal to
  `scopedPath(entry) === null`; a duplicate counted twice is cosmetic; failing fast on the first class is acceptable.

## Callers checked by the reviewer

No `--from-plan` caller breaks: `/pharn-build`, `/pharn-dev-build`, `/pharn-dev-ship`, `/pharn-test` (AC-TESTS.md, where
`check-ac-tests` already REDs `*?<>` as `bad-path`), `/pharn-loop-close` and `loop-closeout.mjs` each read a plan that
`--check` already judged at plan time. `check-spec-unscopable.mjs` reads only the exit code, and its tokens never hold
`*?<>`.

## Lesson candidate

None proposed. The increment is the remedy L20 and L71 named; the recurrence they describe is what it closes. (Two
process frictions — a desktop worktree session's hooks judging from the main checkout, and a human patch reported run
that had not landed — are recorded in SHIP.md, not as canon candidates: the first is already in memory, the second was
caught by checking the file's bytes.)

Verdict: **GREEN** — 0 floor-gate findings; 2 important advisory findings fixed, 5 minor (1 fixed, 1 corrected in the
PLAN, 1 bound stated, 2 accepted).
