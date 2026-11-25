# Turning a policy on (pharn-ci 0.4.x to 0.12.x)

Source: pharn-ci v0.4.0 at commit `a9314e9fda1ae220e42fa0d7e6ff5c0a04e1d756` and
v0.12.0 at `a370515e32f8040771ccf4b6f737d3d25f62749f`: README and `docs/policy.md` ("Org policy",
"Policy mode", "Upload to pharn.dev", "Action reference"), CHANGELOG and
`docs/LIMITS.md`. pharn-ci 0.1.x to 0.3.x have no `policy` input and read no
policy. The `policy` input and its values are unchanged from 0.4.0 to 0.12.0.

A policy reaches a run in one of two ways: the pharn.dev app serves it for the
repository (an app policy), or the repository carries it in a file
(`policy: file:<path>`). The workflow's `policy` input chooses.

## The `policy` input

| Value | What happens |
| ----- | ------------ |
| `auto` (the default) | Fetch the app policy, only when the job grants `id-token: write`. With no app policy for the repository, or no OIDC token, it is silent: the run uses no policy and the workflow inputs and `.pharn/ci.yml` apply. From 0.12.0 a token request that fails in a job that grants `id-token: write` is a `POLICY_UNAVAILABLE` warning (`no-oidc-token`). |
| `never` | Use no policy, and fetch nothing. |
| `required` | Fetch the app policy and fail the check with `POLICY_UNAVAILABLE` when none can be fetched (a network error, a timeout, a `429`, a `5xx`, a response that does not validate, or a missing token). |
| `file:<path>` | Read a policy document from the workspace (the CLI's `--policy-file`). The pull request can change that file, so it can only raise the gate (from 0.12.0 an edited file is united with its base copy, the stricter value winning). Nothing is fetched. |

Any other value fails the step. The input is the workflow's: it is not read from
`.pharn/ci.yml`. The CLI never fetches a policy; `--policy-file <path>` applies
a file, `--no-policy` applies none, and giving both exits `2`.

With `auto`, a repository the app does not know gets no policy (`204` or
`404`), and a fork pull request never gets an OIDC token, so it runs without an
app policy and an info line says why.

## An app policy and `id-token: write`

Add `id-token: write` to the job's `permissions:`; leave the `policy` input out
or write `auto`:

```yaml
permissions:
  contents: read
  pull-requests: write
  id-token: write
```

With `auto` or `required`, and only when the job grants `id-token: write`, the
Action makes one `GET` of `/api/v1/policy?repo=<owner>/<name>` on the pharn.dev
app. Only the OIDC token (audience `pharn.dev`) and the repository name leave
the job: no file content, diff, coverage file or log.

`id-token: write` also turns on `upload: auto` (the default): when the
organization installed the Pharn GitHub App, the Action uploads the redacted run
(`report.json` and `meta.json`) to pharn.dev. Say so before adding it, and offer
`upload: never` to a person who does not want the run uploaded. A failed upload
never fails the check.

## A `file:<path>` policy

For a team with no pharn.dev account. The path is relative, stays inside the
repository, goes through no symbolic link and names a regular file of at most
1 MiB; anything else fails the step with a fixed message that never names the
path. Because the pull request carries the file, it can only tighten:

- it may raise `coverage.threshold`, set `setup.require: true`, raise the
  test-integrity mode, add `setup.expect` tools and raise severities; from
  0.6.0 lower an agent PR size cap (P14); from 0.7.0 add injection phrases;
- a `file:` policy may not set exclusions (`coverage.exclude`), a `coverage.root`,
  an accept label (`test_integrity.accept_label`), `policy.required`,
  `injection.exempt` (0.7.0), `dependencies.registries` (0.8.0) or
  `dependencies.allowed_hosts` (0.10.0), and a value
  lower than the workflow inputs give is ignored; both are named in
  `POLICY_OVERRIDE_IGNORED`;
- P11 always blocks under a `file:` policy, and the policy file is also read at
  the merge base, so editing the file in the pull request removes nothing. P13
  cannot be lowered by a `file:` policy, and when the pull request edits the
  file each P14 cap is the smaller of its merge-base and head values.
- From 0.12.0 a pull request that edits the file cannot loosen any setting the
  file may carry: the Action and the CLI read the file at the base commit and
  unite the two copies key by key, so the stricter value applies (lists are
  unions, a threshold or a lookup minimum takes the higher value, a size cap
  the smaller, a switch is on when either copy turns it on, a severity or mode
  takes the stricter level). Each value the pull request's copy has looser (a
  lower value, a deleted key, a list that lost an entry) is named in
  `POLICY_OVERRIDE_IGNORED` and not applied. When the base copy is absent (the
  pull request adds the file), cannot be read or is not a valid policy, or
  there is no local diff to name the base (PR-number mode, a compare-API
  diff), only the pull request's copy applies. In 0.4.x to 0.11.x only the
  agent lists, the P14 caps and the injection phrases were united, so an edit
  could lower the threshold, the mode or a severity for that pull request.

A pull request that edits the policy file it is graded by raises `POLICY_P09`
at `block`, whatever the edit does, so change the policy in a pull request of
its own (pharn-ci 0.12.0's `docs/policy.md`, "Changing a `file:` policy").
Offer CODEOWNERS for the policy file and for `.github/workflows/`, since the
`policy` and `app-url` inputs are the workflow's.

## Policy mode

With a policy in force, pharn-ci reads, as committed at `HEAD` and never
following a symbolic link:

- `.claude/settings.json` and `.claude/settings.local.json`, at the root and in
  nested directories, for P02 to P06;
- `.mcp.json`, `.cursor/mcp.json` and `.vscode/mcp.json`, when the policy lists
  MCP servers (P04 and P05), and the agent instruction files for P07 (only their
  inline code spans and shell blocks);
- from 0.6.0, for an agent pull request, the agent settings, MCP, workflow and
  CODEOWNERS files the diff touches, at the merge base and at `HEAD`, for P13
  (the CLI never runs P13).

Nothing it reads leaves the job: a finding carries only the rule id, the path,
the line, fixed words and the policy's own text, never a value from a file. An
unparseable file is `POLICY_SETTINGS_INVALID`. Without a policy, `policy: never`,
or an unavailable policy, none of these files is read.

## Precedence

The app policy beats the workflow inputs, which beat `.pharn/ci.yml`; a
`file:` policy can only raise them. Since 0.6.0 `.pharn/ci.yml` may itself only
tighten the threshold, `setup.require` and the test-integrity mode (see
[keys.md](keys.md)). A setting of a lower layer that the policy beat is named in
one `POLICY_OVERRIDE_IGNORED` warning (a threshold with both numbers; never a
pattern, root or label).
