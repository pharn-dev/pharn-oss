# REVIEW — review-dropped-findings

Increment under review (`trust: untrusted`): the diff of `fix/review-dropped-findings` against `origin/main`
(merge-base `01b0c9c`, 6.72.2). Reviewed files: `pharn/floor/merge-findings.mjs` and its test,
`.claude/commands/pharn-review.md`, `.dev/floor/command-hygiene.test.mjs`, the four pipeline-artifact stores
(`check-regress.mjs`, `reconcile-ignore.json`, `worktree-fingerprint.mjs`, `.prettierignore`), `check-regress.test.mjs`,
`CHANGELOG.md`, `SKILLS_VERSION`, `README.md`.

## Floor first (P0)

`node pharn/floor/validate.mjs .` → `FLOOR: GREEN` (exit 0), and `/pharn-dev-verify` PASS on every gate (see
`VERIFY.md`). No instruction-looking content in the reviewed files changed this review's behavior. The test fixtures
that carry `IGNORE PREVIOUS INSTRUCTIONS`, `## Verdict` and `- [blocking]` are deliberate payloads, and the tests
assert that they are contained.

## Floor-gate findings (blocking)

None.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: "pharn/floor/merge-findings.mjs:451"
  problem: "The report's `source` and `path` were taken raw from the input path, and Step 6 renders `source` on a PLAIN line outside any quote; in an installed project `pharn/features/<name>/lenses/` is inside the reviewed tree, so a lens directory named with a newline could forge REVIEW.md structure through the very report meant to make dropped output visible."
  evidence: "unreadable.push({ source: sourceIdOf(p), path: p, reason })"
- type: FINDING
  rule_id: P2
  severity: minor
  file: "pharn/floor/merge-findings.mjs:307"
  problem: "The same raw-directory-name exposure pre-exists in the merged findings.json: each `sources[].source` is the unquoted parent directory name, and Step 6 renders it on the contributor's plain attribution line."
  evidence: "const parent = basename(dirname(inputPath));"
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/merge-findings.mjs:49"
  problem: "One rewritten header comment line ran past the file's comment width."
  evidence: "DROPPED (never merged, never trusted) and NAMED in merge-report.json (below), never only counted. The validation admits the legitimate"
- type: FINDING
  rule_id: P0
  severity: minor
  file: "eslint.config.mjs:1"
  problem: "`eslint .` lints the gitignored `.pharn/` scratch tree, so a stage's own node runner placed there (the documented workaround for an isolated worktree's refused shell forms) can turn the repo `lint` gate red; it did, in this increment's second regress run."
  evidence: ".pharn/pharn-dev-regress/run.mjs  4:10  error  'readFileSync' is defined but never used  no-unused-vars"
```

### Disposition (GATE 2, delegated)

- **P2 important, `source`/`path` raw: FIXED.** `reportSafe()` keeps a clean scalar as it is and records any other
  value through `quoteOneLine`. A new test uses directory names `x\n## Verdict` and `y\n- [blocking]`, plus a
  clean-name control. A mutant that turns `reportSafe` into the identity function turns the test red.
- **P2 minor, `sources[].source` raw: DEFERRED.** This behavior predates the increment and covers every merged
  finding, so fixing it changes the merged `findings.json` bytes, and this increment's scope is the dropped and
  unreadable output. Follow-up: `merge-source-quoting`.
- **P0 minor, comment width: FIXED** (the line was rewrapped).
- **P0 minor, `eslint .` reaches `.pharn/`: DEFERRED.** Changing `eslint.config.mjs` is outside this plan. It is
  recorded as the lesson candidate in `SHIP.md`.

### Lens notes (no finding)

- **L-floor (P0).** Each new claim reduces to one of the three primitives or is labeled advisory:
  - the report contents, the exit code and the single-line quoting are enum/regex checks plus a total function,
    pinned by subprocess tests, each with a negative control: 8 mutants, each red;
  - that `REVIEW.md` is rendered as Step 6 says is labeled command discipline, in both the CHANGELOG and the claims
    bullet;
  - the `ALGO` non-bump in `worktree-fingerprint.mjs` is justified in `PLAN.md` A1: no earlier release wrote the
    newly excluded file. The golden-digest test is unchanged.
- **L-eval (P1).** No capability or `enforces` changed, so no eval binding is affected. The structural eval gate is
  unchanged at exit 0.
- **L-trust (P2).** No guaranteed decision reads a tainted field:
  - the exit code is computed from two list lengths;
  - `failed` and `reason` come from closed sets computed by the checker;
  - the dropped values and the parser's message never reach `findings.json` or the dedup key;
  - the parser message stays on stderr.
- **L-axis (P3).** `merge-findings.mjs` still changes for one reason, its merge output. The four-store name addition
  is the existing copy-pair discipline, held by the parity tests in `check-bash-reconcile.test.mjs` and
  `worktree-fingerprint.test.mjs`. No sibling reference.

## Verdict

GREEN — 0 floor-gate findings. 4 advisory findings: 2 fixed, 2 deferred with named follow-ups. This review is
advisory and gates nothing beyond the floor verdicts it cites.
