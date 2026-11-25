# Writing tests that cover added lines

## Run coverage the way CI does

Use the command from the workflow step that runs before `pharn-dev/pharn-ci`,
with the same working directory, so the local report has the same paths and
format as CI's. Typical forms (pharn-ci reads lcov and Cobertura XML):

| Ecosystem | Command | Report |
| --------- | ------- | ------ |
| vitest | `npx vitest run --coverage --coverage.reporter=lcov` (needs `@vitest/coverage-v8`) | `coverage/lcov.info` |
| jest | `npx jest --coverage --coverageReporters=lcov` | `coverage/lcov.info` |
| Node test runner | `node --test --experimental-test-coverage --test-reporter=lcov --test-reporter-destination=<file>` (the destination directory must exist) | the destination |
| pytest-cov | `pytest --cov --cov-report=xml` | `coverage.xml` |
| coverlet (.NET) | `dotnet test --collect:"XPlat Code Coverage"` | `TestResults/**/coverage.cobertura.xml` |
| cargo-llvm-cov | `cargo llvm-cov --lcov --output-path lcov.info` | `lcov.info` |
| Go | `go test -coverprofile=cover.out ./...`, then `gcov2lcov` | `lcov.info` |

If the command needs a tool or dependency that is not installed, ask before
installing it.

## What counts as covering a line

A line is covered when the coverage report gives it a hit count above 0. Tools
differ on which lines they count: V8-based tools (vitest's v8 provider, Node's
test runner) count most lines of a function body, closing braces included;
istanbul, coverage.py and llvm-cov count statements. One test that takes a
branch therefore often covers several listed lines at once. Lines the tool does
not count are not in the report and not in pharn-ci's denominator.

pharn-ci only checks that a line ran. The tests you write must also check the
result, or they add coverage without adding a test:

- Call the code through its public interface: the module's exports, a route
  handler, a CLI entry point, a public method.
- Assert the observable outcome: the return value, the error type and message
  (`assert.throws`, `expect(...).toThrow`, `pytest.raises`), the state change,
  the output written.
- One behaviour per test, named for the behaviour: `rejects a negative total`,
  not `covers line 8`.
- Cover each branch the uncovered lines belong to: the error path, the early
  return, the fallback, each `case`.
- Keep the repo's conventions: its test file layout, naming, helpers and
  assertion style. Extend the module's existing test file when there is one.

Not tests: calling code and asserting nothing; asserting only that nothing
threw when there is a result to check; snapshotting a whole output to cover
a branch; mocking away the unit under test; `expect(true).toBe(true)`.

## Lines a test cannot reach

Some added lines cannot be run through the public interface without changing
the code: a defensive check that every caller already makes impossible, a
branch for another platform, a `process.exit` in a library. Do not export
internals, add test hooks or restructure the code to reach them: that changes
the production diff, which is the person's call. List each such line with the
reason, and say what the person could do (remove dead code, accept the gap,
or have reviewers agree to a policy change).

If a test shows the code does something other than its name, docs or callers
expect, do not write a test that pins the wrong behaviour. Stop and report
the case.

## Gaming the gate: never

Each of these makes the number go up without testing anything, or hides lines
from the measurement:

- Coverage-ignore comments: `/* c8 ignore ... */`, `/* v8 ignore ... */`,
  `/* istanbul ignore ... */`, `/* node:coverage ignore ... */`,
  `# pragma: no cover`, `#[coverage(off)]`, `[ExcludeFromCodeCoverage]`,
  `// coverage:ignore`, and any equivalent.
- Coverage tool configuration that narrows what is measured: `coverage.exclude`
  in vitest, `coveragePathIgnorePatterns` in jest, `omit` in `.coveragerc`,
  `--test-coverage-exclude`, and the like.
- pharn-ci settings: `threshold`, `exclude`, `coverage-root`, `coverage-file`,
  `fail-on-verdict` (and its old name `fail-on-threshold`), `comment`,
  `test-integrity`, `dependencies`, `junit-paths`, `accept-label` in the
  workflow; anything in `.pharn/ci.yml`; `-diff` or `binary` in
  `.gitattributes`.
- A dependency added to satisfy a test, or a hand-edited lockfile: pharn-ci
  0.8.0 and later flag what a PR adds or changes (D01 to D05).
- A test id added to a quarantine list: the failure stops counting against the
  job, so the test is hidden, not fixed.
- An import of the changed file added to an unrelated test, to clear
  `TESTS_NOT_EXERCISING_CHANGES`: the import runs nothing. A test that imports
  the changed file asserts on its behaviour.
- Skipping, focusing or weakening tests: `.skip`, `.only`, `fit`,
  `fdescribe`, `xit`, `xdescribe`, `.todo`, `@pytest.mark.skip`, `xfail`,
  `[Ignore]`, `#[ignore]`, `t.Skip()`, deleting or loosening an existing
  assertion.
- Test scripts that can pass without the tests passing: `|| true`, `echo` or
  `exit 0` in place of the run, `--passWithNoTests`, `--testPathPattern`,
  `-t`, a removed `pretest` or `posttest`.
- The accept label: applying it is a reviewer's sign-off, never a step of
  this skill.
- Writing, editing or committing a coverage file by hand.
