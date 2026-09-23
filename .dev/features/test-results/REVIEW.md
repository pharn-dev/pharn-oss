# REVIEW — test-results

Floor first: `node pharn/floor/validate.mjs .` → **GREEN** (36 capabilities). Everything below is advisory unless it
is marked floor-gate. The increment is `trust: untrusted`; no instruction-looking content was found in it.

Method: the four inline lenses (L-floor/P0, L-eval/P1, L-trust/P2, L-axis/P3), plus one independent read-only
reviewer agent that read the diff and probed its code in memory (its findings are merged below and attributed).

## Iteration 1

### Floor-gate findings (blocking)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: "pharn/pharn-contracts/test-results-record.md:58"
  problem: "init's wipe of <out> is called 'the guarantee that no earlier run's file survives'; it is runner behaviour pinned by tests, not a hook, content-hash or enum/regex check, and a stale-lock re-run is outside it."
  evidence: "keeps `init`'s wipe of `<out>` the guarantee that no earlier run's file survives"
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: "pharn/floor/test-results-core.mjs:13"
  problem: "'NOTHING reads the record, so no verdict can move' overstates: validateStamp now refuses a malformed results_sha256 on all three verdict paths, and the runner has a new refusal when it cannot clear the results path; the same claim appears in the contract, CHANGELOG and CLAUDE.md."
  evidence: "In this increment NOTHING reads the record, so no verdict can move."
```

### Advisory findings

```yaml
- type: FINDING
  rule_id: "P5"
  severity: important
  file: "pharn/floor/test-results-formats.mjs:187"
  problem: "Each nested Playwright suite copies the whole describe path, so a deeply nested (untrusted) report walks in quadratic time: measured 1.9 s at 40k levels, and the 32 MiB cap admits ~1.4M. The comment promises only no stack overflow."
  evidence: "stack.push({ suite: child, describes: [...describes, title], where: `${where}.suites[${c}]` });"
- type: FINDING
  rule_id: "P2"
  severity: important
  file: "pharn/floor/test-results-formats.mjs:124"
  problem: "Untrusted text reaches the refusal `reason` unbounded (a raw status of any length, a 4 KB id, config values), and the contract never marks tests[].id/file/title or `reason` as untrusted data a consumer must fence."
  evidence: "has status ${JSON.stringify(a.status)}, outside the closed map"
- type: FINDING
  rule_id: "P1"
  severity: important
  file: "pharn/floor/test-results-core.test.mjs:240"
  problem: "The playwright-edge capture refuses at its FIRST unknown status (the expected failure), so the real flaky test is never evaluated, and the test does not check which status tripped it."
  evidence: "playwright-edge capture (real retries run: an expected failure + a flaky test, exit 0) → unknown-status"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/test-results-formats.mjs:96"
  problem: "With root '/', the prefix becomes '//' and no path is ever made relative."
  evidence: "if (p.startsWith(r + sep)) return p.slice(r.length + sep.length);"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/pharn-contracts/test-results-record.md:100"
  problem: "'kept exactly as given' is wrong for a Playwright path outside root (it is kept after resolution against rootDir), and the results-unavailable row omits 'absent or unopenable despite a recorded hash'."
  evidence: "A path outside `root`, or a report with no absolute root, is kept exactly as given."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "README.md:487"
  problem: 'The README says a flaky test or test.fail() is ''reported as an unknown status, not a pass'' — it voids the whole record; and the Playwright example''s `: "list"` changes the default reporter (dot on CI), contradicting ''an ordinary test run is unchanged''. The vitest example also replaces a project''s other `test` options when the variable is unset.'
  evidence: 'reporter: results ? [["list"], ["json", { outputFile: results }]] : "list",'
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: "pharn/floor/test-results-core.mjs:79"
  problem: "The open-O_NOFOLLOW|O_NONBLOCK-then-fstat rule exists in two files (run-gates.mjs hashes, the core reads under a cap), and the core also hosts the config reader."
  evidence: "const OPEN_FLAGS = fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW | fsConstants.O_NONBLOCK;"
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: "pharn/floor/run-gates.mjs:267"
  problem: "A directory at the results path (a gate that ran `mkdir $PHARN_TEST_RESULTS`) is refused as path-containment on every stale-lock re-run until init runs again, though the path is already inside the contained <out>."
  evidence: 'fail("path-containment", `cannot clear the results path ${file} before the gate runs: ${e.message}`);'
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: "pharn/floor/run-gates.test.mjs:1018"
  problem: "The FIFO test spawns with no timeout, so a regression hangs instead of failing; the override of an inherited PHARN_TEST_RESULTS, the byte and id caps at their exact boundaries, and Playwright suite errors under exit 0 are untested; the id cap counts UTF-16 units while the contract says characters."
  evidence: "assert.ok(Date.now() - t0 < 20000, `${mode}: the runner blocked`);"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/test-results-formats.mjs:1"
  problem: "Both new modules start with a node shebang but have no CLI, which CLAUDE.md states."
  evidence: "#!/usr/bin/env node"
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: "README.md:470"
  problem: "'later stages will' promises unbuilt work in shipped prose (L33's expiring-claim shape)."
  evidence: "Nothing in the pipeline reads it yet; later stages will."
```

### Lens notes

- **L-eval (P1):** no Capability (`role:`) is added, so no `evals/`; `validate.mjs` agrees (36 capabilities, unchanged).
  Every one of the 11 `RECORD_REASONS` members is reached by a test, and the reverse-closure test asserts it.
- **L-trust (P2):** no untrusted field reaches a RegExp, `eval`, a child process or a verdict. The gap is the
  unfenced free text named above.
- **L-axis (P3):** the formats/core split holds; the duplicated safe-read rule is the remaining finding.

**Verdict (iteration 1): blocked — 2 floor-gate findings** (both P0 wording), 3 important and 8 minor advisory.

## Iteration 2 — the fixes, re-reviewed

Floor re-checked first: `validate.mjs` GREEN; regress `no-regressions`; verify PASS (clean map). Each iteration-1
finding, with what happened to it:

- **P0 blocking — `init`'s wipe called a guarantee:** fixed. The contract now calls it runner behaviour pinned by
  tests, not a floor primitive, and names the stale-lock case.
- **P0 blocking — "no verdict can move":** fixed in all four places (core header, contract, CHANGELOG, CLAUDE.md)
  with the narrowed wording: unchanged for every stamp the runner writes; a malformed `results_sha256` is refused;
  a results path the runner cannot clear is refused.
- **Quadratic Playwright walk:** fixed. `MAX_DEPTH` = 256 describe levels, deeper is `over-cap` (added to
  `FORMAT_REFUSALS`). A 40k-level report now refuses in milliseconds; the boundary is tested both sides.
- **Unbounded untrusted text in reasons:** fixed. Every raw value in a reason goes through `shown()` (64
  characters). The contract gains a Trust section marking `tests[].id/file/title` and `reason` as untrusted data.
- **playwright-edge evaluated only its first status:** fixed. The test asserts the expected failure is the cause,
  then removes it and asserts the real flaky test refuses, then removes that and asserts the plain pass is a record.
- **Root `/`:** fixed in `relativeFile`, tested.
- **Contract rows (file wording, `results-unavailable`):** fixed.
- **README:** fixed. It now says a flaky test or `test.fail()` voids the whole record, both examples merge into the
  project's other options and leave the default reporters untouched when the variable is unset (re-probed against
  vitest 5.0.1 and Playwright 1.63.0), and "later stages will" is gone.
- **Directory at the results path:** fixed. The runner removes it recursively (the path is a fixed basename inside
  the contained `<out>`); only a still-unremovable path is refused, tested with an unremovable child.
- **Tests:** the FIFO drain is bounded (a hang now fails), the inherited-variable override is tested, both caps are
  tested at their exact boundary, Playwright suite errors under exit 0 are tested end to end, and the contract says
  the id cap counts UTF-16 code units.
- **Shebangs on non-CLI modules:** fixed (removed from both).
- **P3 — the safe-read rule in two files:** **declined, with the reason.** The runner HASHES any size in chunks;
  the core READS under a byte cap. Sharing one helper would mean either a floor module that imports the record core
  into the runner (and a second module list in the `★ WIRING` copy set), or moving fs reads into
  `gate-run-core.mjs`, which is pure by contract. The two copies are twelve lines each and pinned by their own
  tests; the config reader stays in the core because the opt-in is part of what a record means.

**Verdict (iteration 2): GREEN — 0 floor-gate findings.** One advisory P3 finding was declined, with its reason
recorded above.

## Proposed lesson candidate

None. Both blocking findings are instances of the already-canon P0 disease (L2's "a contract's honesty must travel"),
not a new mechanism; the quadratic walk is a one-off. `lesson: none` is recorded in SHIP.md with this reason.
