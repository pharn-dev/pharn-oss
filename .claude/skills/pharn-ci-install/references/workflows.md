# Workflow and config templates (pharn-ci 0.12.0)

From pharn-ci 0.12.0's README, `docs/action.md`, `action.yml` and `examples/workflows/`, at its
release commit `a370515e32f8040771ccf4b6f737d3d25f62749f` (tag `v0.12.0`). Copy
the pins exactly; they are the only ones this skill writes.

## Pins

| Action | Pin |
| ------ | --- |
| pharn-ci | `pharn-dev/pharn-ci@a370515e32f8040771ccf4b6f737d3d25f62749f # v0.12.0` |
| checkout | `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1` |
| Node | `actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0` |
| Python | `actions/setup-python@5fda3b95a4ea91299a34e894583c3862153e4b97 # v7.0.0` |
| .NET | `actions/setup-dotnet@a98b56852c35b8e3190ac28c8c2271da59106c68 # v6.0.0` |
| Rust tools | `taiki-e/install-action@8cca0918f8471c33515202b73f56ab27f2bed283 # v2.87.29` |
| upload | `actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2` |
| download | `actions/download-artifact@9000827ccba6bdab643e8b6fd33ac0654aef8333 # v8.0.2` |

Go, Java, pnpm and anything else: reuse the step the repository already pins,
or leave `# TODO: pin <action> to a full commit SHA` in place of the `uses:`
line and say so. Never a tag (`@v4`), a branch or a short SHA.

## `.pharn/ci.yml`

```yaml
# pharn-ci settings. The pharn-ci Action and `pharn-ci check` both read this file.
coverage:
  file: coverage/lcov.info
  threshold: 80
```

- `file`: one path, or a block list of paths and globs (`*`, `**`, `?`),
  relative to the repository root. Quote an entry that starts with `*`:
  `- "**/coverage.cobertura.xml"`.
- `threshold`: a plain number from 0 to 100. Missing inputs fail the check
  when it is set, so a broken coverage step cannot pass.
- `root: packages/core` only for package-relative paths in a single package.
- `exclude:` a block list of globs, only for generated code the person agrees
  to leave out. From 0.11.0 a glob (here or in `file`) longer than 1,024
  characters is a config error that fails the run.
- Only `coverage`, `setup`, `test_integrity` and `dependencies` keys exist; no
  tabs; no `{}`, anchors or `|`. Leave `test_integrity` out: the mode is the
  workflow's `test-integrity` input (see
  [Test integrity](#test-integrity-and-the-accept-label)). Leave `dependencies`
  out too: it can only tighten the workflow's `dependencies` input (see
  [Dependency safety](#dependency-safety-the-dependencies-input)), and this skill
  never writes it.
- `.pharn/ci.yml` can only tighten: a `coverage.threshold` or `setup.require:
  true` in it applies over a looser `threshold` input or `require-agent-setup:
  false` (since 0.6.0). A threshold lives in this file and not in an input for
  that reason too.
- An `exclude:` the setup PR adds shows up on that PR as
  `TEST_INTEGRITY_TI14` (a new coverage exclusion): a warning in mode `warn`,
  a failing check in mode `block`.

## New workflow: `.github/workflows/pharn-ci.yml`

```yaml
name: pharn-ci
on:
  pull_request:
    # With test-integrity: block, also run when the accept label changes:
    # types: [opened, synchronize, reopened, labeled, unlabeled]
  # merge_group:   # uncomment only when the repository uses a merge queue

permissions:
  contents: read
  pull-requests: write

# One run per PR at a time, so pushes do not race on the sticky comment. The github.ref
# fallback gives each merge-queue entry its own group, since merge_group has no PR number.
concurrency:
  group: pharn-ci-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

jobs:
  pharn-ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          fetch-depth: 0
          persist-credentials: false
      # Toolchain, dependencies and the coverage command: see below.
      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
        with:
          node-version: 24
      - run: npm ci
      - run: npm run test:coverage
      - id: pharn-ci
        uses: pharn-dev/pharn-ci@a370515e32f8040771ccf4b6f737d3d25f62749f # v0.12.0
        timeout-minutes: 5
        with:
          test-integrity: warn # or block; never in .pharn/ci.yml
      # report.json for pharn-ci-explain and pharn-ci-cover: the comment cuts long lists.
      - if: always() && steps.pharn-ci.outputs.report-path != ''
        uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2
        with:
          name: pharn-ci-report
          path: ${{ steps.pharn-ci.outputs.report-path }}
```

- `fetch-depth: 0` lets pharn-ci diff against the PR base locally; a shallow
  checkout falls back to the API and can end in `DIFF_UNAVAILABLE`.
- The pharn-ci step's input is `test-integrity`; every other setting is in
  `.pharn/ci.yml`. The one other input this skill writes is `junit-paths`, and
  only when the person asks or the repository already writes JUnit XML (see
  [JUnit results](#junit-results-only-when-asked-or-already-there)). A
  `dependencies`, `fail-on-verdict` or `policy` input is written only for the
  reasons in the sections below; the defaults (`auto`, `true`, `auto`) need no
  line.
- Toolchain lines per ecosystem (the coverage commands are in
  [coverage.md](coverage.md)):
  - Node: `setup-node` with `node-version`, then the lockfile's install
    (`npm ci`, `pnpm install --frozen-lockfile`, `yarn install --immutable`).
  - Python: `setup-python` with `python-version`, then the project's install
    (`pip install -e '.[test]'`, `pip install -r requirements-dev.txt`, ...).
  - .NET: `setup-dotnet` with `dotnet-version`.
  - Rust: `rustup component add llvm-tools-preview`, then `install-action`
    with `tool: cargo-llvm-cov`.
- Required checks are named after the job: a new workflow adds a `pharn-ci`
  check, which the person can make required in their ruleset.

## Existing test job

When a job already runs the tests on `pull_request`, extend it. These edits
only:

1. Its `actions/checkout` step gets `fetch-depth: 0` and
   `persist-credentials: false`, so the pull request's test code cannot read
   the token edit 3 gives `pull-requests: write`. When a later step in the job
   pushes, tags or otherwise needs git credentials, do not set
   `persist-credentials: false`: say so and ask.
2. Its test command writes coverage, in the same run: `npm test` becomes
   `npm run test:coverage` (or the runner's coverage flags). The tests run
   once.
3. It gets a job-level `permissions:` block with what it had plus
   `pull-requests: write`. A job-level block replaces the workflow-level one
   and the repository default, so copy every permission the workflow already
   grants (`contents: read` at least). When the job publishes, calls `gh` or
   otherwise needs more and you cannot tell what, ask.
4. Two steps at the end:

```yaml
      - id: pharn-ci
        if: (github.event_name == 'pull_request' || github.event_name == 'merge_group') && matrix.node == 24
        uses: pharn-dev/pharn-ci@a370515e32f8040771ccf4b6f737d3d25f62749f # v0.12.0
        timeout-minutes: 5
        with:
          test-integrity: warn
      - if: always() && steps.pharn-ci.outputs.report-path != ''
        uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2
        with:
          name: pharn-ci-report
          path: ${{ steps.pharn-ci.outputs.report-path }}
```

- The event condition keeps pharn-ci off `push`: on a push it would gate the
  branch against the previous commit.
- The matrix condition picks one leg (drop it when there is no matrix): the
  legs share one sticky comment and one artifact name.
- Add no `concurrency:` block to someone else's workflow; it would cancel
  their push builds. Without one, an older run can write the comment last.
- Change nothing else: triggers, `paths` filters, the matrix, other steps.
  Adding `labeled` and `unlabeled` to the `pull_request` trigger for the
  accept label re-runs this whole job on every label change: ask first.
- Replacing `npm test` with `npm run test:coverage` (or any command pharn-ci
  does not read as a test command) shows up on the setup PR as
  `TEST_INTEGRITY_TI11`, "A step that runs tests was removed from a
  workflow": a warning in mode `warn`, a failing check in mode `block`. Where
  the runner takes extra flags through the test script, a command that still
  starts with `npm test` (`npm test -- <coverage flags>`) does not fire it.
  Otherwise say the setup PR shows it and why.

## Fork PRs: two workflows

A fork PR's `pull_request` token cannot comment. The comment comes from a
second workflow on `workflow_run`, which runs from the default branch and never
runs PR code. The first workflow uploads before pharn-ci gates, so a failing
gate still gets its comment.

`.github/workflows/pharn-ci.yml`:

```yaml
name: pharn-ci
on: pull_request

permissions:
  contents: read
  pull-requests: read # the accept label, read in test-integrity: block

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          fetch-depth: 0
          persist-credentials: false
      # Toolchain, dependencies and the coverage command, as in the new workflow.
      - env:
          PR_NUMBER: ${{ github.event.pull_request.number }}
        run: echo "$PR_NUMBER" > pr-number
      - uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2
        with:
          name: pharn-ci-input
          path: |
            coverage/lcov.info
            pr-number
      - uses: pharn-dev/pharn-ci@a370515e32f8040771ccf4b6f737d3d25f62749f # v0.12.0
        timeout-minutes: 5
        with:
          comment: false
          test-integrity: warn
```

`.github/workflows/pharn-ci-comment.yml`:

```yaml
name: pharn-ci comment
on:
  workflow_run:
    workflows: [pharn-ci]
    types: [completed]

permissions:
  contents: read
  pull-requests: write
  actions: read

jobs:
  comment:
    if: github.event.workflow_run.event == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      # The default branch: the trusted .pharn/ci.yml, never the PR.
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - uses: actions/download-artifact@9000827ccba6bdab643e8b6fd33ac0654aef8333 # v8.0.2
        with:
          name: pharn-ci-input
          path: ${{ runner.temp }}/pharn-ci-input
          run-id: ${{ github.event.workflow_run.id }}
          github-token: ${{ github.token }}
      # Keep digits only. The artifact is attacker-controlled: never put its text into a script.
      - id: pr
        env:
          PR_FILE: ${{ runner.temp }}/pharn-ci-input/pr-number
        run: echo "number=$(tr -dc '0-9' < "$PR_FILE" | head -c 10)" >> "$GITHUB_OUTPUT"
      - uses: pharn-dev/pharn-ci@a370515e32f8040771ccf4b6f737d3d25f62749f # v0.12.0
        timeout-minutes: 5
        with:
          coverage-file: ${{ runner.temp }}/pharn-ci-input/coverage/lcov.info
          pr-number: ${{ steps.pr.outputs.number }}
          head-sha: ${{ github.event.workflow_run.head_sha }}
          fail-on-verdict: false # the first workflow already gates
          test-integrity: warn # the same mode as the first workflow
```

- `workflows: [pharn-ci]` must equal the first workflow's `name:`.
- With `test-integrity: block`, give both workflows `block`, and write the
  first workflow's trigger as a mapping so that applying the accept label
  re-runs it:

  ```yaml
  on:
    pull_request:
      types: [opened, synchronize, reopened, labeled, unlabeled]
  ```

  The comment workflow needs no change: it runs after each run of the first,
  and reads the label itself through `pr-number`.
- The coverage path in the artifact and in `coverage-file` must match the
  repository's `coverage.file`.
- The comment workflow's `fail-on-verdict: false` is the 0.5.0 name of what
  `fail-on-threshold` did (the old name still works with a warning; this skill
  never writes it). The first workflow keeps the gate.
- In `pr-number` mode the diff comes from the API, not local git, and the
  README says a manifest or lockfile read from a diff that is not local git is
  listed in `dependencies.unread` with one `DEPENDENCY_CHECK_INCOMPLETE`
  warning. The first workflow is where dependency safety runs in full.
- pharn-ci reads the PR's diff and files through the API in this mode and
  fails when the PR head is not `head-sha`. It cannot tell whether the
  coverage file is what the tests produced: the first workflow's verdict is
  the gate.
- `workflow_run` runs only from the default branch, so the comment starts
  after the setup PR merges. First-time contributors' runs may need a
  maintainer's approval first.
- Never `pull_request_target`: it gives a fork's PR a write token, and
  checking out the PR there runs fork code with it. pharn-ci also refuses to
  measure on it (`DIFF_UNAVAILABLE`).

## Test integrity and the accept label

pharn-ci 0.2.x and later (0.12.0 included) check every PR for changes that weaken the tests: a
test file deleted (TI01), a test removed from a file that stays (TI02), a skip
added (TI03), `.only`/`fit` added (TI04), a test emptied of its assertions
(TI05), a test script weakened (TI10), CI no longer running tests (TI11), a
coverage-ignore comment (TI13), a lower threshold or a new exclusion in
`.pharn/ci.yml` (TI14), and warnings or notes for weaker assertions, edited
expected values, bulk snapshot updates, loosened runner settings, mocked
modules under test, lint suppressions and, from 0.11.0, assertions that always
pass (TI06 to TI09, TI12, TI15 to TI17; 0.12.0 no longer emits TI15). From
0.12.0, in `test-integrity: block`, a test file pharn-ci could not read fails
the check too (`TEST_INTEGRITY_INDEX_UNAVAILABLE`), so a Python project needs
`python3` 3.8 or newer on the runner. Each
finding asks for a reviewer to look; most have an ordinary reason. From
0.7.0 a PR that changes JS or TS source (from 0.12.0 also Python) without a
test file that imports it also gets one `TESTS_NOT_EXERCISING_CHANGES` warning, in every mode and never a
failure, so a setup PR that adds source shows it.

- **`test-integrity: warn`** (the default, and what this skill writes): the
  findings are warnings in the comment. Nothing fails because of them.
- **`test-integrity: block`**: a block finding fails the check until it is
  fixed or a reviewer who is not the PR author signs it off with the accept
  label.
- **`off`**: no check. Never write it.

The mode is an Action input, not a `.pharn/ci.yml` key, because the PR under
review carries `.pharn/ci.yml`: pharn-ci lets `test_integrity.mode` there only
make the check stricter than the input (a looser value is ignored with
`TEST_INTEGRITY_MODE_IGNORED`). The workflow is where the floor is set, which
is why CODEOWNERS on `.github/workflows/` matters.

**The accept label** (block mode only). A reviewer who is not the PR author
applies `pharn/accepted` to the PR; the next run turns that PR's block findings
into warnings and the comment names who accepted them. It counts only when the
newest `labeled` event for it was made by a user account other than the PR
author; a bot's or the author's label is ignored with
`TEST_INTEGRITY_ACCEPT_IGNORED`. The label is tied to the PR, not a commit, so
a later push keeps it until someone removes it. Diff coverage is never
affected. For it to work:

- The label must exist in the repository. The person creates it, for example
  `gh label create pharn/accepted --description "Test-integrity findings
  accepted by a reviewer"`; do not run it for them.
- The workflow runs again when the label changes:

  ```yaml
  on:
    pull_request:
      types: [opened, synchronize, reopened, labeled, unlabeled]
  ```

  Otherwise someone pushes or re-runs the check after labeling.
- The token reads the PR and its issue events: `pull-requests: read` or
  `issues: read`. The templates' `pull-requests: write` includes it, and the
  fork template's first workflow has `pull-requests: read`.
- A different label name goes in the `accept-label` input (at most 50
  characters). It is never read from `.pharn/ci.yml`, which refuses
  `test_integrity.accept_label`.
- `push`, `merge_group` and `pull_request_target` runs never read the label,
  so a block there stays a block. With a merge queue and `block`, a PR whose
  findings were accepted still fails its `merge_group` run; say so before
  writing `block` into a workflow that runs on `merge_group`.

## JUnit results (only when asked or already there)

`junit-paths` (0.8.0) reads the JUnit XML the test step writes, fills the
report's `flaky` object and a **🧫 Flaky** comment section and applies the
org's quarantine list from pharn.dev. Test results never change the verdict.
Write it only when the person asks, or when the repository already produces
JUnit XML: a JUnit reporter in the test script or runner config (`jest-junit`,
vitest's `junit` reporter, `pytest --junitxml`, ...) or a `junit.xml` the CI
job already writes or uploads. Use the path that test step writes; with no
such path, ask instead of choosing one. In every other repository leave the
input out.

```yaml
      - run: npm test -- --reporters=default --reporters=jest-junit   # writes junit.xml
      - id: pharn-ci
        if: ${{ !cancelled() }}   # also after a failed test step
        uses: pharn-dev/pharn-ci@a370515e32f8040771ccf4b6f737d3d25f62749f # v0.12.0
        timeout-minutes: 5
        with:
          test-integrity: warn
          junit-paths: junit.xml
```

- Paths and globs (`*`, `**`, `?`) are relative to the workspace, one per line
  or comma separated; a path outside the workspace fails the step. At most 50
  files, 25 MiB and 20,000 test cases are read; the rest is left out with a
  `JUNIT_TOO_LARGE` warning.
- `junit-paths` is an Action input only: `.pharn/ci.yml` does not carry it.
- The `if: ${{ !cancelled() }}` line is the README's example for reporting
  after a failed test step. Add it only with the person's yes: it changes
  when the step runs.
- With an upload (`id-token: write`, see Org policy below) a normalised copy
  of the results goes to pharn.dev, with test names, status, time and failure
  messages redacted and cut, never `system-out` or `system-err`. Say so before
  writing `junit-paths` into a workflow that has `id-token: write`.

## Dependency safety (the `dependencies` input)

pharn-ci 0.8.0 and later check the dependencies a pull request **adds or
changes**, never the whole tree, in npm manifests and lockfiles and in Python
requirements, `pyproject.toml`, `poetry.lock` and `uv.lock`. The `dependencies`
input takes three values, and any other value fails the step:

- **`auto`** (the default, so a workflow with no `dependencies` line runs it).
  It runs the offline checks and makes no network call: D04, lockfile drift (a
  manifest's dependencies changed while the lockfile that governs it did not
  change or does not record them, or a lockfile gives a version the same hash
  algorithm and a different hash), and D05, a source outside the npm and PyPI
  registries (a dependency or lockfile entry from a git repository, a URL off
  `registry.npmjs.org`, `registry.yarnpkg.com`, `pypi.org` and
  `files.pythonhosted.org` and the allowed private hosts (below), or a local
  file, or a requirements file that adds a package index off them). **`auto` blocks on both:** each is a `block`
  finding, an error that makes the verdict `fail`, and `fail-on-verdict` (true
  by default) then fails the step. The test-integrity mode and the accept label
  do not lower it. A Dependabot bump that changes a manifest and its lockfile
  together, and a lockfile-only refresh, give no finding.
- **`lookup`**. `auto` plus a look-up of each added unscoped npm and PyPI
  package in `registry.npmjs.org`, `api.npmjs.org` and `pypi.org`, sending only
  the package name in a `GET`: D01 (the package does not exist, `block`), D02
  (first published fewer than 30 days before the head commit, `warn`) and D03
  (fewer than 100 npm downloads last week, `warn`). A look-up that fails is
  `DEPENDENCY_LOOKUP_UNAVAILABLE`, a warning. It sends names to third parties
  and an unscoped private package name would leak, so write `lookup` only when
  the person asks, after saying so. `dependencies.lookup: true` in
  `.pharn/ci.yml` turns it on over `auto`, never over `never`.
- **`never`**. Nothing runs: no D04, no D05, no look-ups. Never write it unless
  the person chooses it after the private-registry question below or asks for
  it, and then say what it switches off.

The CLI makes no network call, so locally `lookup` runs as `auto`. What the
check misses is in pharn-ci's `docs/LIMITS.md`, Dependency safety.

### Private registries

D05 flags every source outside the four hosts above and the hosts the run
allows. A private registry or mirror that a lockfile records (Artifactory,
Nexus, Verdaccio, GitHub Packages, a private PyPI index) is off the registry
until its host is allowed. A registry set only outside the lockfile (`.npmrc`,
`.yarnrc.yml`, pip configuration) is not seen by D05 for pnpm and yarn berry,
but the person should still hear about it.

Since 0.10.0 the pharn-ci step takes the allow-list as the
`dependency-allowed-hosts` input:

```yaml
        with:
          test-integrity: warn
          dependency-allowed-hosts: npm.corp.example
```

- Each entry is an exact host name, comma or newline separated, at most 50:
  `npm.corp.example`, never `https://npm.corp.example/`, a port or
  `*.corp.example`. An entry that is not a host name fails the step.
- A URL on an allowed host still has to be `https` with no user name, password
  or port, or it stays D05. A sibling such as `evil.npm.corp.example` is not
  the host.
- pharn-ci never calls an allowed host and never looks up a package resolved
  from one in a public registry.
- `.pharn/ci.yml` refuses `dependencies.allowed_hosts`, and a `file:` policy may
  not set it: the pull request can edit both. An app policy's
  `dependencies.allowed_hosts` replaces the input's list and is the control a
  pull request cannot move; a workflow edit in a pull request changes the
  input, which is why CODEOWNERS on `.github/workflows/` matters.

Before writing a workflow, look for a private registry: a lockfile `resolved`
or `registry` host other than `registry.npmjs.org`, `registry.yarnpkg.com`,
`pypi.org` or `files.pythonhosted.org`; a `registry=` line (or
`@scope:registry=`) in `.npmrc`; a registry server in `.yarnrc.yml`; an
`index-url` or `extra-index-url` in a pip config, `requirements*.txt` or
`pyproject.toml`; a `PIP_INDEX_URL` or similar in the CI files. When there is
one, name the host or hosts you found, say that D05 flags dependencies from
off-registry sources, and ask how to proceed, offering only these options and
no workflow written yet:

1. `dependency-allowed-hosts` with the host you found (the first option). The
   person confirms the host name or names the right one: write only a host
   they confirmed, and say that its URLs must be `https` with no credentials or
   port. An org on pharn.dev can put the same host in its app policy instead
   (`dependencies.allowed_hosts`; drafting it is the `pharn-ci-policy` skill's
   job).
2. `dependencies: auto` as it is (write no line). D05 then blocks every PR
   that adds or changes a dependency a lockfile records from the private
   host; D04 keeps running.
3. `dependencies: never`, which switches off D04 as well. Only on the
   person's explicit choice.
4. `fail-on-verdict: false`, which reports and never gates: it lifts every
   gate, not only D05. Only on the person's explicit choice.

Never offer, or invent, an option this reference does not list.

## Upgrading an existing setup

An existing pharn-ci workflow (a `uses: pharn-dev/pharn-ci@` line, a SHA with
a `# vX.Y.Z` comment or a tag) is updated, not duplicated. Before changing
anything, compare its version with the version of this reference's pharn-ci
pin:

- Equal: say the setup is current, and stop.
- Newer: say the setup is ahead of what this version of the skill describes,
  change nothing, and say that updating the pharn-ci plugin gets a skill that
  knows that release. Never move a pin to an older release or offer to, even
  when the newer release is one you cannot confirm.
- Unreadable (a SHA with no `# vX.Y.Z` comment, or a branch): say so, and ask
  which release it is.
- Older: change that `uses:` line to this reference's pin, and nothing else
  unless the person asks.

For an older pin, say what the move brings, from pharn-ci's CHANGELOG, for the
versions it crosses:

| The pin is older than | Behaviour change the upgrade brings |
| --------------------- | ----------------------------------- |
| 0.6.0 | A stricter `coverage.threshold` or `setup.require: true` in `.pharn/ci.yml` now applies over a looser `threshold` input or `require-agent-setup: false`; to get the looser value back, lower it in `.pharn/ci.yml` itself. |
| 0.7.0 | PI01 is an error by default: a PR that adds a zero-width character, a bidi override or isolate, a tag character or a stray byte order mark now fails the check where it passed (test files, `fixtures/`, `__fixtures__/` and `testdata/` are exempt). A PR that changes JS/TS source without a test importing it gets a `warn` verdict where it got `pass` (`TESTS_NOT_EXERCISING_CHANGES`); it never fails the check. |
| 0.8.0 | Dependency safety runs by default (`dependencies: auto`) and D04 and D05 are errors: a PR that changes a manifest's dependencies without its lockfile, or adds a git, URL or local-file dependency, now fails the check where it passed. `dependencies: never` gets the old behaviour back. |
| 0.11.0 | A PR that adds an assertion that always passes gets a `warn` verdict where it got `pass` (`TEST_INTEGRITY_TI17`); it never fails the check unless an org policy sets TI17 to `block`. An exclusion or coverage-file glob longer than 1,024 characters now fails the run. With no diff, `DIFF_UNAVAILABLE` is reported first, so a run under a threshold or `test-integrity: block` fails on it even when the coverage file is also missing. PI01 now flags tag characters after a black flag emoji unless they spell a subdivision flag. With an org policy that sets `forbidden_permissions`, `allowed_mcp_servers` or `forbidden_mcp_servers` at block, a shallow checkout or `pr-number` run now fails with `POLICY_SETTINGS_INVALID`. |
| 0.12.0 | Breaking: a PR that edits `.pharn/ci.yml` (or the `config` input's file) is checked with the config at the merge base, and the edit applies after merge; on a shallow checkout that copy cannot be read and `CONFIG_CHANGED_IN_DIFF` fails the run under a threshold or in `block` (use `fetch-depth: 0`, as these templates do). Under a threshold, a PR that adds or edits a tracked coverage report (`COVERAGE_FILE_TRACKED`), or changes a covered file the diff shows as binary, now fails. In `test-integrity: block`, a test file pharn-ci could not read now fails the check (`TEST_INTEGRITY_INDEX_UNAVAILABLE`, which the accept label lowers), and TI01, TI03, TI05, TI09 and TI10 catch more. Dependency safety reads more lockfile and manifest spellings and fails on a file it cannot read (`DEPENDENCY_CHECK_INCOMPLETE`), and an instruction or Markdown file cut for size fails the injection scan (`INJECTION_TEXT_TRUNCATED`). A PR that changes Python source without a test importing it gets a `warn` (`TESTS_NOT_EXERCISING_CHANGES`). |

Between those rows nothing changes a verdict: 0.9.0 added the `fix` objects
to the report and says verdicts, inputs and the comment are unchanged, 0.9.1
changes only how the release is published, and 0.10.0 adds the opt-in
`dependency-allowed-hosts` input (see
[Private registries](#private-registries)). A pin of 0.12.0 or later crosses
none. Name only the rows the pin crosses (a `# v0.5.0` pin crosses all five, a
`# v0.9.1` pin the last two, a `# v0.11.0` pin only the last). A pin older than 0.5.0 crosses all five as well; for what 0.2.0 to 0.4.0
added (test integrity, the secret scan, the opt-in org policy and upload), see
the Test integrity and Org policy sections.

Also, from the 0.5.0 summary: the input `fail-on-threshold` is renamed
`fail-on-verdict`. The old name still works, with a warning, and is ignored
(with a warning) when both are set. In an existing workflow, tell the person
and rename it only when they say yes; a new file never carries the old name.

## `pharn-ci test` (optional, never written by default)

For a team that wants a failure caused only by quarantined flaky tests not to
fail the job, the pharn-ci CLI can wrap the test command:

```bash
pharn-ci test --junit 'reports/*.xml' --quarantine-file quarantine.json -- npx vitest run
```

It runs the command without a shell, reads the JUnit files and exits `0` when
the command failed, the results show at least one failed test, every failed
test is on the `--quarantine-file` list (a JSON array of test ids,
`<classname>::<name>`) and every matched file was read whole; otherwise it
exits with the command's own code. `--dry-run` prints what would run. It makes
no network call.

- The CLI is not published to npm: it is built from pharn-ci's source
  (`pnpm install && pnpm build`). Never run `npx pharn-ci`, and build nothing
  without asking.
- A quarantine file the pull request can edit lets the pull request quarantine
  its own failures; keep it where the pull request cannot change it.
- This skill does not write the wrapper, the quarantine file or a changed
  test command unless the person asks for it. It changes what makes the job
  fail, so say so, and note that replacing `npm test` shows up as
  `TEST_INTEGRITY_TI11` on the setup PR.

## Dependabot

`.github/dependabot.yml`, only with the person's yes:

```yaml
version: 2
updates:
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
```

## Org policy (only when asked)

pharn-ci 0.4.x and later can apply an org policy: one gate for every repository of an
organization, which a pull request cannot loosen. Offer this section only when
the person wants an org policy; the templates above carry no `policy` input and
no `id-token: write`, and a repository without a policy runs exactly as before.
The policy document itself, its keys and its rules are the
`pharn-ci-policy` skill's business.

The `policy` input of the pharn-ci step takes four values:

- `auto` (the default): fetch the org policy from the pharn.dev app, only when
  the job grants `id-token: write`. A repository with no app policy, or a job
  with no OIDC token, is silent and runs with the workflow inputs and
  `.pharn/ci.yml`.
- `never`: use no policy.
- `required`: fail the check with `POLICY_UNAVAILABLE` when no policy can be
  fetched.
- `file:<path>`: read a policy document from the workspace (see below).

An app policy needs `permissions: id-token: write` on the job, and the step
needs no other input:

```yaml
permissions:
  contents: read
  pull-requests: write
  id-token: write # an app policy; also see upload below
```

`id-token: write` also lets `upload: auto` (the default) upload the redacted
run (`report.json` and `meta.json`) to pharn.dev when the org installed the
Pharn GitHub App. Only the OIDC token and those two files leave the job, and a
failed upload never fails the check. Say so before adding `id-token: write`,
and write `upload: never` in the step when the person does not want the run
uploaded. A fork pull request never gets the token, so it runs without an app
policy and without an upload.

`policy: file:<path>` is for a team with no pharn.dev account (or no app
policy yet): the path is a repository-relative JSON file, nothing is fetched,
and `id-token: write` is not needed for it. The pull request carries that file,
so it can only raise the gate, never lower it. For an app policy leave the
`policy` input out or write `auto`, and keep `required` for a person who wants
a missing policy to fail the check.
