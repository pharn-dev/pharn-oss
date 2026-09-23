# REVIEW — pharn-test-stage

Floor first: `node pharn/floor/validate.mjs .` → **GREEN**. Method: the four inline lenses plus one independent
read-only reviewer agent that probed the diff in throwaway `/tmp` directories. Its findings are below, merged and
attributed. The increment is `trust: untrusted`; no instruction-looking content was found.

## Iteration 1

### Floor-gate findings (blocking)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: "pharn/floor/check-ac-tests.mjs:180"
  problem: "in-plan-files compares raw `## Files` strings, but the writes-scope setter strips a trailing ' (…)' annotation first: a PLAN entry `tests/ac/a.test.js (gated)` passes the checker while the setter scopes `tests/ac/a.test.js` and the hook allows the build to write it — the guarantee fails open (probed)."
  evidence: 'if (planFiles.has(f)) red("in-plan-files"'
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: ".claude/commands/pharn-test.md:21"
  problem: "Prettier split `writes:` across lines, which the setter cannot parse, so Step 4's `--from-frontmatter … --target …/AC-TESTS.lock.json` re-scope exits 1 ('no concrete writes: paths') and the lock can never be scoped; hygiene Rule A checks only that --target is present (probed)."
  evidence: "writes:\n  [\n    \"<AC test files named in AC-TESTS.md ## Files …>\","
```

### Advisory findings

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "pharn/floor/check-ac-tests.mjs:180"
  problem: "Path comparison is case-sensitive; on case-insensitive APFS a PLAN entry `Tests/ac/a.test.js` passes the checker yet the build's write lands on the AC test file."
  evidence: "planFiles.has(f)"
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".claude/commands/pharn-plan.md:262"
  problem: "Step 4b still says 'exit 0 → end your turn', before the new Step 4c; a model that obeys it never writes AC-TESTS.md."
  evidence: "id is referenced in the plan body → end your turn."
- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".claude/commands/pharn-plan.md:283"
  problem: "'check legacy that way' cannot work: the checker needs AC-TESTS.md first, so with no file it exits 2, not 3; and 'delete nothing' leaves a stray mapping for a legacy SPEC."
  evidence: "The mapping checker below exits **3** on one, so check that way"
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".claude/commands/pharn-plan.md:325"
  problem: "The RED remedy says fix PLAN.md's `## Files`, but the active scope is AC-TESTS.md only, so the hook denies that edit, and Step 4b is not re-run."
  evidence: "fix the mapping (or PLAN.md's `## Files`) and re-run"
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "pharn/floor/reconcile-ignore.json:44"
  problem: "Every stale-chain remedy says 're-plan via /pharn-plan'; after the build anchor that rewrites AC-TESTS.md, which is not reconcile-exempt (PLAN.md is), so a later verify raises a false blocking escape — L17 again."
  evidence: '"names": ["AC-TESTS.md", "AC-TESTS.lock.json"]'
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".claude/commands/pharn-loop.md:594"
  problem: "/pharn-loop runs /pharn-plan, which now writes AC-TESTS.md for a templated SPEC, but the loop's Step-6c commit list lacks it, so a STOP_GREEN commit leaves it uncommitted."
  evidence: 'const artifacts = ["SPEC.md", "PLAN.md", "GRILL.md", "BUILD.md", …'
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "pharn/pharn-contracts/ac-tests.md:1"
  problem: "Nothing requires a mapped test file to be NEW: an existing project test can be mapped and rewritten by /pharn-test, and at regress it is then declared and inside, so it silently leaves the regression comparison."
  evidence: "one line per AC"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/ac-tests-lock.mjs:119"
  problem: "A symlinked AC-TESTS.md makes --write exit 0 recording mapping.sha256: null, though the contract says a symlink refuses the write."
  evidence: "mapping: { path: mappingPath, sha256: sha256RegularFile(mappingPath) }"
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: "pharn/floor/ac-tests-lock.mjs:128"
  problem: "Only the top-level keys are closed: a forged non-null red_run, an extra nested key or a duplicate files entry passes --check GREEN; item 04 will read red_run."
  evidence: "export function lockShapeError(lock, name) {"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/ac-tests-lock.mjs:32"
  problem: "The header says a missing AC-TESTS.md or listed file exits 2 on --check (it exits 1), mapping.path stores the --base spelling so an absolute --base REDs the same file, and test paths resolve against the cwd only."
  evidence: "Exit: 0 written / GREEN · 1 RED (check) · 2 unusable input"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/plan-files-core.mjs:62"
  problem: "Pre-existing: the core's `clean` uses \\s* where the setter uses \\s+, so `src/a(b)` differs between them — the 'byte-faithful copy' header is false; the header also says two consumers where there are four."
  evidence: ".replace(/\\s*\\([^)]*\\)\\s*$/, \"\")"
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: "pharn/floor/check-ac-tests.mjs:236"
  problem: "A nonexistent --features-dir yields no other features, so claimed-elsewhere fails open; a second `## Mapping` is ignored; and exit 3 is decided before the pin, so deleting `spec_template` (outside the body hash) turns an Approved, mapped SPEC 'legacy' without drift."
  evidence: "return out;"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".claude/commands/pharn-test.md:110"
  problem: "'Later stages match the prefix' claims unbuilt work; the hook guarantee is stated without the Bash bound in the description; the CHANGELOG's 'the real setter and guard prove both' overreaches given the (gated) finding."
  evidence: "Later stages match the prefix against the test's leaf title within the mapped file"
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: "README.md:172"
  problem: "Stale text: README 'the 10 product commands', .dev/floor/check-config.mjs 'ten'; pharn-test.md:70 halts on a missing file without the Final --clear step."
  evidence: "the 10 product commands"
```

**Verdict (iteration 1): blocked — 2 floor-gate findings** (one guarantee failing open, one re-scope that cannot
run), 7 important and 9 minor advisory. All taken into one fix pass; see iteration 2.

## Iteration 2 — the fixes, re-reviewed

Floor re-checked: `validate.mjs` GREEN; regress `no-regressions`; verify PASS (clean map). Each finding:

- **Blocking — `in-plan-files` fail-open on `(gated)`:** fixed. Every path goes through the setter's `clean` +
  `isConcrete` and is case-folded before comparison (`scopeKey`), on all three sides; fixtures for `(gated)` and a
  case variant each trip ONLY `in-plan-files`, with a parenthesised-name control that stays GREEN.
- **Blocking — the lock re-scope could not run:** fixed. `writes:` is one line (113 chars), the re-scope was run
  live, and a new ★ hygiene test EXECUTES every pinned `--from-frontmatter … --target …` line in every command.
- **Case folding (APFS):** fixed with the above.
- **`/pharn-plan` 4b ended the turn before 4c:** fixed ("→ go to Step 4c").
- **Legacy detection needed a file that did not exist:** fixed — `check-ac-tests.mjs --spec` (0 / 3 / 2) runs first;
  in full mode a legacy SPEC with a mapping is RED (the `spec_template` key sits outside the body hash).
- **The PLAN.md remedy was denied by the active scope:** fixed — re-scope to PLAN.md, edit, re-run 4b, re-scope back.
- **False reconcile escape after a re-plan:** fixed — AC-TESTS.md is reconcile-exempt like PLAN.md; only the lock is
  `pre_anchor_artifacts`. A re-plan that leaves the lock stale is caught by `--check`. Tests pin both halves.
- **`/pharn-loop` commit list:** fixed — AC-TESTS.md added (`pharn-loop.md` 0.8.1).
- **A mapped file assumed new:** declined as a check (needs a git baseline the checker lacks; P7), stated as a bound
  in the contract and in `/pharn-plan` ("map only NEW test files").
- **Lock (null digest, open nested keys, forged sections, duplicates, path spelling, exit codes):** all fixed and
  tested per case.
- **`plan-files-core` `clean` (`\s*` vs `\s+`):** fixed, with a parity case running the setter; header lists four
  consumers.
- **Checker (missing `--features-dir`, second `## Mapping`):** fixed (exit 2; `malformed-line`).
- **Overclaims and stale text:** fixed — "later stages match" rewritten to what exists; the Bash bound on the hook
  guarantee; the CHANGELOG's "prove both"; README "11 product commands"; the dev config comment; the missing-file
  halt now runs the Final step. Not changed: pipeline-spine strings elsewhere omit `test` deliberately — the
  orchestrated chain does not call `/pharn-test` in 6.17.0, and `pharn-test.md` now says so.

**Verdict (iteration 2): GREEN — 0 floor-gate findings, 0 open advisory findings** (one declined with its reason).

## Proposed lesson candidate

None new. Both blocking findings are recurrences of canon: the formatter-split `writes:` is L45 (an invocation is
covered only by executing it — the new hygiene test is that remedy), and the `(gated)` fail-open is L37/L55 (a
check that re-derives a guard's model must be probed against the guard). Recorded in SHIP.md as `lesson: none`.
