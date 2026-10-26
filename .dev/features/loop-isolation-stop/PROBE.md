# PROBE — loop-isolation-stop

Measurements taken during `/pharn-dev-build` on 2026-10-25, on the maintainer's macOS laptop (Darwin 27.0.0, Node
24.13.1, Apple Git 2.50.1). Every value below is an exit code, an outcome token or an evidence code. No credential
value was printed or recorded.

## 1. gpgsign in a credential-free container (report only; nothing changed)

**Question (brief, item 5).** Does `loop-closeout.mjs` commit under `commit.gpgsign=true` with no signing key in a
credential-free container?

**Method.** A scratch script imported the closeout's own exported `commitArgs`, `addArgs` and `gitRun` (no copy of
the argv). It ran them in a temp repository with `commit.gpgsign=true`, `HOME` and `GNUPGHOME` set to empty temp
directories, and `GIT_CONFIG_NOSYSTEM=1`. Three variants:

| variant                                             | `git add` | `git commit` | git's first stderr line                            |
| --------------------------------------------------- | --------- | ------------ | -------------------------------------------------- |
| `gpg.program` names a path that does not exist      | 0         | 128          | `fatal: cannot exec '…/no-such-gpg': …`            |
| a `gpg` that fails like gpg with no secret key      | 0         | 128          | `error: gpg failed to sign the data:`              |
| default `gpg.program`, no gpg on `PATH` (this host) | 0         | 128          | `error: cannot run gpg: No such file or directory` |

**Answer: no.** The commit fails with exit 128 in every variant. The closeout maps a failed commit to
`not committed: commit failed`. It undoes its own add and branch (Step 6d's undo), exits 4, and the close part then
reverts the model's SPEC approval. So a green run in such a container ends uncommitted, with the change left in the
working tree. This bites when a container inherits `commit.gpgsign=true` from a mounted or copied `~/.gitconfig`;
VS Code dev containers copy it by default. `docs/pipeline.md`'s example passes git's identity through the
environment instead of mounting the config. Not fixed here: the brief asked for a report.

## 2. This laptop (the PR's "laptop" row)

`node pharn/floor/check-run-isolation.mjs --feature demo` with the maintainer's real environment:

- exit 2, `refused not-isolated`;
- outcome `HOST`, evidence `cred:ssh-dir`, `cred:ssh-agent`, `cred:gh-hosts`, `cred:credential-helper`,
  `cred:aws-credentials`, `cred:npmrc-home`.

With `--accept-host-execution` it exits 0 with the same evidence and `accepted_host_execution: true`.

## 3. L37 probes — quantified sentences run against a member expected to be excluded

| sentence (where)                                                                     | probe                                                              | result                                 |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | -------------------------------------- |
| "`PHARN_ISOLATED=1` asserts isolation, never the absence of a credential" (contract) | `PHARN_ISOLATED=1` on this laptop                                  | exit 2 `credentials-present`           |
| "`--accept-host-execution` does not accept unknown evidence" (core, refusal text)    | `HOME= USERPROFILE=` with the flag                                 | exit 2 `unreadable-home`, empty stdout |
| "a malformed slug fails the line at entry" (CLI header)                              | `--feature Bad`                                                    | exit 2 `usage`                         |
| "a credential helper … plain or URL-scoped" (contract)                               | temp global config with `[credential "https://github.com"] helper` | hit (CLI test)                         |
| "a FIFO cannot hang the entry" (CLI header)                                          | `mkfifo ~/.npmrc` in a temp HOME                                   | returns, `cred:npmrc-home` (CLI test)  |

## 4. The PR's outcome table

Docker is not installed on the probing host and no image was pulled, so the container rows are computed by the core
(`evaluate`) over a synthetic probe holding the facts each environment is expected to present. **They are derived,
not measured in those environments.** The laptop row is measured (section 2).

| environment                                                             | outcome                     | exit | evidence codes                                                                                                         |
| ----------------------------------------------------------------------- | --------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------- |
| this laptop (measured)                                                  | `HOST`                      | 2    | `cred:ssh-dir`, `cred:ssh-agent`, `cred:gh-hosts`, `cred:credential-helper`, `cred:aws-credentials`, `cred:npmrc-home` |
| devcontainer, SSH agent and git credentials forwarded (VS Code default) | `ISOLATED_WITH_CREDENTIALS` | 2    | `fs:dockerenv`, `env:REMOTE_CONTAINERS`, `cred:ssh-agent`, `cred:credential-helper`                                    |
| `docker run`, repository mounted, only `ANTHROPIC_API_KEY` passed       | `ISOLATED`                  | 0    | `fs:dockerenv`                                                                                                         |
| Codespaces (the codespace's credential helper configured)               | `ISOLATED_WITH_CREDENTIALS` | 2    | `fs:dockerenv`, `env:CODESPACES`, `cred:credential-helper`                                                             |
| GitHub Actions hosted runner                                            | `ISOLATED`                  | 0    | `env:GITHUB_ACTIONS`                                                                                                   |

A bound the Actions row shows: `actions/checkout` persists the workflow's token as an `http.<url>.extraheader`, which
is not a credential helper. `GITHUB_TOKEN` is off the list by design (contract, "The isolation field"), so a runner
holding a repository-scoped token reads `ISOLATED`. What that token may do is whatever the workflow's
`permissions:` grant.
