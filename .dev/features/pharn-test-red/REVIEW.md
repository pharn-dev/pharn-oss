# REVIEW — pharn-test-red

Floor first: `node pharn/floor/validate.mjs .` → **GREEN**. Method: the four inline lenses plus one independent
read-only reviewer agent that probed the diff (it reproduced finding 1 with a scratch script and ran 605 tests across
9 suites). Its findings are below, merged and attributed. The increment is `trust: untrusted`; no instruction-looking
content was found.

## Iteration 1

### Floor-gate findings (blocking)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: "pharn/floor/red-run-core.mjs:181"
  problem: "The verdict unioned matches across the level's gates in a Map keyed by test id, so when both e2e gates report the SAME id the later gate's status overwrites the earlier one's: test:e2e `passed` then e2e `failed` read GREEN — a floor verdict contradicting its own 'none passed, no escape hatch' rule (reproduced)."
  evidence: "matches.set(t.id, t.status)"
```

### Advisory findings

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "pharn/floor/ac-tests-lock.mjs:371"
  problem: "--require-red-run returned GREEN for a bootstrap lock, which has no red run; the docs (CLAUDE.md, the contract, the header, CHANGELOG [6.18.0]) call exit 0 'a red run happened', and items 05/06 will branch on it."
  evidence: 'if (lock.schema === SCHEMA && lock.mode === "bootstrap") return checkBootstrap(lock, name, base);'
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "pharn/floor/ac-tests-lock.mjs:206"
  problem: "A bootstrap lock never checked that the SPEC is Approved or that its pin is real: a Draft with an invented 64-hex pin and spec_kind: test-infra got exit 0 from --write-bootstrap and --check (probed); a test-first lock's pin is bound through check-ac-tests, a bootstrap one had only command prose."
  evidence: "const facts = readSpecFacts(name, base);"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/pharn-contracts/ac-tests.md:200"
  problem: "'cannot become a bootstrap one without re-approval' overstates: the floor sees a re-pin, not an approval; the same in CHANGELOG [6.18.0]. spec-template.md's 'never writes it under --model-approve' is command prose, unlabelled."
  evidence: "cannot become a bootstrap one without re-approval."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".claude/commands/pharn-spec.md:49"
  problem: "Files this increment edited still state spec_content_hash == sha256(body) (pharn-spec.md :49/:257/:282, pharn-plan.md :53/:185/:354/:413 and its description), false for a SPEC with a spec_kind line; 'eight template rules' listed seven."
  evidence: "(4) **when `Approved`**, `spec_content_hash == sha256(body)`"
- type: FINDING
  rule_id: "P2"
  severity: minor
  file: "pharn/floor/red-run-core.mjs:131"
  problem: "bindStamp did not check HOW each run was produced: a hand-edited in-progress state.json (a swapped command writing fake results) or an init over another --discover manifest (one e2e gate dropped) still bound."
  evidence: "for (const run of stamp.runs) { const want = acFilesFor(rows, run.id);"
- type: FINDING
  rule_id: "P4"
  severity: minor
  file: ".claude/commands/pharn-test.md:211"
  problem: "The command restated the contract's table of red-run reasons while saying 'cite, do not restate'."
  evidence: "What the reasons mean:"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/run-gates.mjs:25"
  problem: "'EVERY path operand' omitted --ac-tests (also CLAUDE.md); --base was silently accepted at ac-test; --gates/--extra refused only with a value."
  evidence: "EVERY path operand — `--out`, `--spec-from`, `--discover`, `--scope-json` —"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/spec-template-core.mjs:528"
  problem: "validateTemplate accepts a template carrying spec_kind:, so a project template with `spec_kind: test-infra` would start every Draft as a bootstrap SPEC; unstated."
  evidence: "a test pins that a project template with a spec_kind line resolves"
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: "pharn/floor/check-red-run.test.mjs:595"
  problem: "The ★ WIRING test said 'in order' without checking document order; blockedLine read 'set up a e2e … runner'; the reverse-closure test depends on REACHED filled by earlier tests."
  evidence: "run GREEN, in order"
```

**Verdict (iteration 1): blocked — 1 floor-gate finding** (the union overwrite), plus 2 important and 7 minor.

## Iteration 2 — the fixes, re-reviewed

| finding                           | outcome                                                                                                                                                                                                                                                                                                                                |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 union overwrite (blocking)      | **fixed** — every `(gate, test)` observation is kept; `tests` lists each id once. Four order cases (failed/passed, passed/failed, skipped/failed, failed/skipped) each RED with their reason.                                                                                                                                          |
| 2 bootstrap passes require        | **fixed** — `--require-red-run` REDs a bootstrap lock unless `--allow-bootstrap` (only `/pharn-test` Step B passes it; it is a usage error without `--require-red-run`). Contract, CLAUDE.md, header and CHANGELOG say so.                                                                                                             |
| 3 bootstrap never checks approval | **fixed** — `--write-bootstrap` and a bootstrap `--check` SHELL `check-spec-approved.mjs`; the lock suite now builds REAL approved SPECs (template filled, pin from `--hash`) and adds "a Draft with an invented pin" and "drifted after the lock" cases.                                                                              |
| 4 re-approval overclaim           | **fixed** — "without the pin moving … a self-consistent re-pin passes" in the contract and CHANGELOG; spec-template.md labels the `--model-approve` rule advisory.                                                                                                                                                                     |
| 5 stale `sha256(body)`            | **fixed** — every mention in the two edited commands (and `/pharn-plan`'s description) names the pin; the eighth rule is listed.                                                                                                                                                                                                       |
| 6 bindStamp provenance            | **fixed** — the runs must equal what `init --stage ac-test` resolves NOW from `<root>/package.json` and the mapping (ids, order, `shell`, `argv`, files), and `source` must be `discover`. Tests: a swapped argv, a shell entry, a dropped e2e gate, an unreadable or no-longer-resolving manifest.                                    |
| 7 P4 restatement                  | **fixed** — the command cites the contract and keeps only the branch it takes (test defect: revise once; pass-before-build: stop).                                                                                                                                                                                                     |
| 8 runner doc and flags            | **fixed** — `--ac-tests` listed as a path operand (header, CLAUDE.md); `--base`, `--gates`, `--extra`, `--skip-style` refused by presence at ac-test, tested with no and flag-shaped values.                                                                                                                                           |
| 9 template may carry the key      | **stated, not refused** — the brief requires the template validator to accept templates with or without the key, so `spec-template.md` now names the consequence and what stands against it (both advisory).                                                                                                                           |
| 10 tests                          | **fixed** in part — both ★ WIRING tests assert document order, Step B's approval line is executed, `blockedLine` reads "set up a test runner for e2e and unit". **Declined:** the shared `REACHED` set is this suite family's established reverse-closure pattern (`check-ac-tests.test.mjs` uses it); a filtered run is not the gate. |

Re-verified after the fixes: 3104/3104 tests, regress `no-regressions`, verify `PASS` (clean map), reconcile `CLEAN`.

**Verdict (iteration 2): GREEN — 0 floor-gate findings, 0 open advisory findings** (one stated rather than refused,
one declined, each with its reason).

## Proposed lesson candidate

None. Finding 1 is a recurrence of canon L52 (a rule over a set must be exercised over every member — here every
ORDER of the two gates), and finding 3 of L43/L37 (a check that trusted a value it could have re-derived by running
the owning checker).
