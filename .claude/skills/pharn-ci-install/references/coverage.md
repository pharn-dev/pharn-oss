# Coverage output per ecosystem (pharn-ci 0.1.0 to 0.12.0)

pharn-ci reads lcov and Cobertura XML only, decides which by the first 1 KiB
(`auto`), and matches each file path in the report against the tracked files.
Use the project's own runner and add only what it needs to write one of these.

| Runner | Coverage command | `coverage.file` | Needs |
| ------ | ---------------- | --------------- | ----- |
| Node test runner | `mkdir -p coverage && node --test --experimental-test-coverage --test-reporter=spec --test-reporter-destination=stdout --test-reporter=lcov --test-reporter-destination=coverage/lcov.info` | `coverage/lcov.info` | nothing (Node 22+) |
| c8 + Node | `c8 --all --include 'src/**' --reporter=lcov node --test` | `coverage/lcov.info` | `c8` |
| vitest | `vitest run --coverage --coverage.reporter=lcov` | `coverage/lcov.info` | `@vitest/coverage-v8` (or `-istanbul`) |
| jest | `jest --coverage --coverageReporters=lcov` | `coverage/lcov.info` | nothing |
| pytest | `pytest --cov=<package> --cov-report=xml` | `coverage.xml` | `pytest-cov` |
| .NET | `dotnet test --collect:"XPlat Code Coverage"` | `"**/coverage.cobertura.xml"` | `coverlet.collector` in the test project |
| Rust | `cargo llvm-cov --lcov --output-path lcov.info` | `lcov.info` | `cargo-llvm-cov`, `llvm-tools-preview` |
| Go | `go test -coverprofile=cover.out ./...` then `gcov2lcov -infile cover.out -outfile lcov.info` | `lcov.info` | `gcov2lcov` |
| JaCoCo, Kover | the build's report, converted to Cobertura XML | the converted file | a converter |

- Put the command in a `package.json` script (or the project's task runner)
  when there is one, so CI and people run the same thing.
- The Node runner fails when the lcov destination's directory does not exist:
  keep the `mkdir -p`.
- A dependency the project does not have yet: ask before adding it, and say
  which file it changes (`package.json` and the lockfile, `pyproject.toml`,
  the test `.csproj`). In CI it can be installed in the workflow instead, as
  pharn-ci's vitest example does (`npm install --no-save
  @vitest/coverage-v8`), but a dev dependency keeps local runs the same.
- A dependency the setup PR adds is a dependency pharn-ci 0.8.0 and later
  checks (the `dependencies` input, `references/workflows.md`): the manifest
  and its lockfile must change together, written by the package manager and
  never by hand, or the setup PR itself shows D04, lockfile drift. A
  dependency from a git repository, a URL or a local file is D05. Both fail
  the check.

## New files must show up

A source file no test imports is usually absent from the report, so its added
lines are not counted at all, and a PR that only adds untested files passes as
`NO_COVERABLE_CHANGES`. Make the run report every source file:

- vitest: `coverage.include: ['src/**']` in the vitest config (`coverage.all:
  true` on vitest 1 and 2).
- jest: `collectCoverageFrom: ['src/**/*.{js,ts}']`.
- pytest-cov: `--cov=<package>` (not a bare `--cov`), or `source = ["<package>"]`
  under `[tool.coverage.run]`.
- Node's test runner reports only files a test loaded, and
  `--test-coverage-include` only filters those. Use c8 with `--all --include`
  for this; it is a new dependency, so ask.
- Say in your answer when the runner cannot do this.

## Paths

- lcov `SF:` paths and Cobertura `filename` attributes must name tracked files
  once made relative to the repository root. Absolute paths under the CI
  checkout work; absolute paths from another machine or container
  (`/app/src/a.ts`) never match.
- Cobertura: `<source>` entries inside `<sources>` are joined to relative
  filenames, and the first join that stays inside the repository wins.
  coverage.py writes absolute sources; with `relative_files = true` under
  `[tool.coverage.run]` the report is the same on every machine.
- A runner started in a package directory writes package-relative paths
  (`SF:src/index.ts` from `packages/core`). For one package, set
  `coverage.root: "packages/core"`, a quoted YAML string. For several, one
  root cannot fit them all: run the tests from the repository root, or
  configure each runner to write repo-relative paths, and list every report in
  `coverage.file`.
- Run `scripts/check-coverage.mjs` after every change here: `paths.matched`
  must be above 0 and `blocking` null.

## Auto-discovery

With no `coverage.file`, pharn-ci looks for `coverage/lcov.info`, `lcov.info`,
`coverage.xml`, `coverage/cobertura-coverage.xml` and
`**/coverage.cobertura.xml`, and fails the step when more than one of those
exists. This skill always writes `coverage.file`, so discovery does not apply:
the helper runs it only without `--coverage`, and with `--coverage` reports
`discovery` as `{"kind": "not-run", "files": []}`.

The helper's `coverage[].ignored` is `null` when git cannot say whether a
coverage file is ignored, for example one behind a symlinked directory such as
Bazel's `bazel-out/_coverage/_coverage_report.dat`. Check `.gitignore` for that
path by hand.
