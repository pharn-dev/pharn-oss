# REVIEW — markdownlint-no-globs

**Floor first:** `node pharn/floor/validate.mjs .` gives `FLOOR: GREEN — 36 capabilities checked`. The
floor-grade verdicts upstream are these: grill Step 1b exit 0, regress `no-regressions`, verify `PASS`
(2891/2891, 0 skipped, reconcile `CLEAN`).

The increment under review is `trust: untrusted`. It contains no instruction-looking content addressed
to the reviewer. All `problem` / `evidence` text below is DATA.

## Floor-gate findings (blocking)

None. No guarantee is claimed without a floor reduction. The closure test is described as a vocabulary
pin. The premise test is described as "floor where the toolchain is installed", with its skip bound
stated. The flag is disclaimed as a write gate everywhere it appears. No capability or `enforces` binding
changed, so P1's eval obligation does not arise. No sibling reference was introduced.

## Advisory findings

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "CHANGELOG.md:45"
  problem: "The Fix bullet's breakdown does not add up: it lists 'the eight dev-stage lines' plus pharn-ship's step (running --fix) plus 'the two memory-promote checks', which is eleven, and the dev memory-promote check is counted twice. The real split is seven dev format steps + /pharn-ship's BRIEFING.md step running --fix, and the dev + product memory-promote checks, which are read-only. The entry freezes on merge, so it must be corrected before then."
  evidence: "Ten invocations gain `--no-globs`: the eight dev-stage lines and `/pharn-ship`'s `BRIEFING.md` format step, which run `--fix`, and the two memory-promote checks, which are read-only"
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/floor/capability-catalog-core.test.mjs:505"
  problem: "The '~5 s' cost is carried over from a DIFFERENT spawn shape (`markdownlint-cli2 CLAUDE.md`, 4.5–4.9 s). The `--config cfg file` shape was count-measured only (1341 files). Timed at review, that shape took 14.6 s under current load (and 0.45 s with --no-globs). This is L24's inherited-performance-claim shape, and CHANGELOG.md:67 repeats the number."
  evidence: "file` linted 1341 files in ~5 s"
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: ".dev/floor/command-hygiene.test.mjs:3"
  problem: "The file header still says it tests command prose and has no paired checker, and it was not re-derived for the new premise section, which spawns a devDependency binary and changes when the tool or `.markdownlint-cli2.jsonc` changes. GRILL raised the same second-axis note before the build, and the build kept the probe here per the approved `## Files`. The header should at least name the exception (L25)."
  evidence: "WHY IT LIVES HERE, with no paired checker (GRILL F4). … This one tests COMMAND PROSE instead"
```

## Lens notes (no finding)

- **L-floor (P0):** "Scoped to this stage's own artifact" at six dev format steps, and `pharn-ship.md`'s
  "scoped to this one file only", were false for markdownlint until this increment. They are now true for
  markdownlint-cli2 0.12.0 and later. The product commands state the pre-0.12.0 residual as unmeasured
  instead of assuming it.
- **L-eval (P1):** the closure is non-vacuous in three independent ways. The detected set equals
  `MARKDOWNLINT_SITES`. A per-site mutation control makes the rule name exactly the stripped file. And a
  replay against the pre-fix `HEAD` commands flags exactly the ten old lines (run at build).
- **L-trust (P2):** the only tool output any test reads is the integer in `Linting: N files`, matched
  by an anchored regex.
- **L-axis (P3):** see the advisory finding above. Each command edit is one line, plus one caveat
  paragraph at each product site.

## Process note (not a finding against the increment)

The PLAN, GRILL, REGRESSION and VERIFY format steps in this run were executed WITH `--no-globs`, which
deviates on purpose from the then-pinned command text. Running the pinned text would have reproduced the
defect under repair. Each printed `Linting: 1 file`.

## Proposed lesson candidate (for `/pharn-dev-memory-promote`, human-gated; NOT written here)

- **title:** An explicit path list is not a scope for a config-driven tool: the config can ADD inputs,
  and root-anchored ignores do not cover nested checkouts.
- **type:** `tooling` · **concepts:** `[writes-scope, bash-escape, formatter, config-globs, live-measurement]`
- **source:** `.dev/features/markdownlint-no-globs/PLAN.md` § "The failure" (the measured
  `Linting: 1340 files` for one named path, and the fixture showing root-only `ignores`) +
  this REVIEW.
- **why it would recur:** L19's remedy ("scope the formatter to the written paths") and L13's per-stage
  steps were accepted because the argv LOOKED scoped. Nothing measured the tool's actual reach, and every
  gate stayed green while it fixed ~1340 files. Any config-driven tool can widen its input the same way
  (config globs, include lists, project files), so the next "scoped" invocation of such a tool inherits
  the same blind spot unless its reach is read from the tool's own count, with a negative control.

## Verdict

**GREEN — 0 floor-gate findings; 3 advisory (1 important, 2 minor).** The important one, the CHANGELOG
arithmetic, should be fixed before merge because the entry freezes on merge.
