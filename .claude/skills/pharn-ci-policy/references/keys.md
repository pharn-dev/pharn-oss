# Policy keys, rules and default levels (pharn-ci 0.4.x to 0.12.x)

Source: pharn-ci v0.4.0 at commit `a9314e9fda1ae220e42fa0d7e6ff5c0a04e1d756` and
v0.12.0 at `a370515e32f8040771ccf4b6f737d3d25f62749f`: `schema/policy.v1.json`
(the bundled `scripts/policy.v1.json` is a byte copy of v0.12.0's), README and `docs/policy.md` ("Org
policy", "P13", "P14", "Prompt-injection scan", "Dependency safety", "Flaky
tests and JUnit results", "Config"), CHANGELOG and `docs/LIMITS.md`. pharn-ci
0.1.x to 0.3.x read no policy. The schema closes every object
(`additionalProperties: false`), bounds every list at 1000 items and every
string, and requires only `version`.

A policy document is JSON. The smallest valid one is `{ "version": 1 }`. A key
left out sets nothing.

After 0.4.0 the schema gained the `injection` object (0.7.0),
`dependencies.lookup` (0.8.0), `dependencies.allowed_hosts` (0.10.0) and
`test_integrity.signals.TI17` (0.11.0), and from 0.11.0 a login may also be an
Enterprise Managed User login. Some keys the 0.4.0 schema already accepted are
applied from later releases: `policy.rules.P13`, `policy.rules.P14`,
`agents.max_files` and `agents.max_changed_lines` from 0.6.0, and
`flaky.quarantine` and the other `dependencies` keys from 0.8.0. A policy
written with them is validated by every 0.4.x and later release, and applied
only by the release that reads them.

## Rules and their default levels

Each line names a rule, the policy keys that feed it and its default level.
`policy.rules` sets a rule's severity (`block`, `warn`, `info` or `off`); a
`block` finding is an `error` message and fails the check.

- P01, required agent setup, fed by `setup.require` and `setup.expect`: `error` by default (the codes `NO_AGENT_SETUP_FILES` and `AGENT_SETUP_EXPECTED_MISSING`).
- P02, forbidden permission allowed, fed by `setup.forbidden_permissions`: `error` by default (`warn` for `additionalDirectories`); also flags `defaultMode` `bypassPermissions` or `auto`.
- P03, required deny rule missing, fed by `setup.required_permissions_deny`: `error` by default.
- P04, MCP server not allowlisted, fed by `setup.allowed_mcp_servers`: `error` by default.
- P05, forbidden MCP server, fed by `setup.forbidden_mcp_servers`: `error` by default.
- P06, required hook missing, fed by `setup.required_hooks`: `error` by default.
- P07, agent instruction files disagree, fed by `setup.consistency`: `warn` by default.
- P08, forbidden file tracked, fed by `setup.forbidden_files`: `error` by default.
- P09, the pull request loosens what it is graded by (the policy file, the config, a workflow or an agent settings file): `error`, `warn` or `info` by what changed; no key feeds it.
- P10, policy unavailable, fed by `policy.required`: `warn` by default, `error` with `policy: required` or `policy.required: true`; its severity cannot be overridden.
- P11, agent PR changes a protected path, fed by `agents.protected_paths` and `agents.protected_paths_mode`: `error` by default (`block`).
- P12, meant for `agents.require_human_approval`: not enforced in 0.4.x to 0.12.x; no finding, no level.
- P13, agent self-modification (0.6.0): an agent pull request widens what an agent may do in an agent settings file, an MCP config, a workflow or CODEOWNERS. No key feeds it; it runs under any app or `file:` policy. `error` by default; an app policy can set `policy.rules.P13`, a `file:` policy cannot lower it.
- P14, agent PR size cap (0.6.0), fed by `agents.max_files` and `agents.max_changed_lines`: `error` by default, and off until the policy sets a cap (there is no default cap).

The prompt-injection signals PI01 to PI05 (`injection.signals`) and the
test-integrity signals TI01 to TI17 (`test_integrity.signals`) have their own
severities. The dependency signals D01 to D05 have no policy severity: D01, D04
and D05 always block and D02 and D03 always warn.

## Top-level keys

`version`, `coverage`, `setup`, `test_integrity`, `flaky`, `policy`, `agents`,
`dependencies` and, from 0.7.0, `injection` are the only top-level keys the
schema accepts.

### `version` (required)

The number `1`. Not merged: every layer carries the same version.

### `coverage`

Feeds the diff coverage gate (no P rule).

| Key | Meaning |
| --- | ------- |
| `coverage.threshold` | Minimum diff coverage percent, 0 to 100. The larger of the policy's and the repository's value applies. |
| `coverage.exclude` | Globs of files left out of diff coverage. A served policy replaces the repository's list. Not allowed from a `file:` policy. |
| `coverage.root` | Directory relative coverage paths start from, or `null` for the repository root. Not allowed from a `file:` policy. |

### `setup`

Agent setup rules, P01 to P08.

| Key | Feeds | Meaning |
| --- | ----- | ------- |
| `setup.require` | P01 | `true` requires at least one agent setup file; `true` wins over a repository's `false`. |
| `setup.expect` | P01 | Agent tools whose setup files must exist, from the fixed list of tool names (`claude-code`, `cursor`, `copilot`, `codex`, `gemini`, `mcp`, ...); added to the repository's own. |
| `setup.consistency` | P07 | Severity of contradictory instruction files. |
| `setup.forbidden_permissions` | P02 | Permission rules (`Tool` or `Tool(pattern)`) a settings file's `allow` list must not equal, widen or contain. |
| `setup.required_permissions_deny` | P03 | Permission rules that every settings directory must deny, or deny more broadly. |
| `setup.allowed_mcp_servers` | P04 | MCP server names that are allowed. An empty list means any server, so it restricts nothing. |
| `setup.forbidden_mcp_servers` | P05 | MCP server names or command globs that must not be configured. |
| `setup.required_hooks` | P06 | Hooks that must exist, each `{ "event": "PreToolUse", "matcher": "Bash" }` (`event` letters only, `matcher` optional). |
| `setup.forbidden_files` | P08 | Globs of files that must not be tracked. |

### `test_integrity`

Feeds the test-integrity signals TI01 to TI17 (the gate, no P rule).

| Key | Meaning |
| --- | ------- |
| `test_integrity.mode` | `block`, `warn` or `off`. The policy can raise the mode above the workflow input and the config (`block > warn > off`). |
| `test_integrity.signals` | A severity (`block`, `warn`, `info` or `off`) per signal id `TI01` to `TI17`; any other key, `TI18` included, is an error. `TI17` (an assertion that always passes, `warn` by default) is from 0.11.0: an older release rejects the key. `TI15` still validates in 0.12.0 but changes nothing, since 0.12.0 emits no TI15. |
| `test_integrity.accept_label` | The label that signs off test-integrity blocks. Only an app policy may set it; a `file:` policy may not, and `.pharn/ci.yml` never. |

### `flaky`

| Key | Meaning |
| --- | ------- |
| `flaky.quarantine` | From 0.8.0: whether the pharn.dev app's quarantine list applies to the JUnit results (`junit-paths`). The list is applied unless the policy sets `false`; it comes only from the app's own policy response, never from a policy document or a pull request. Test results never change the verdict either way. In 0.4.x to 0.7.x it is accepted and not applied. |

The app's policy response also carries settings that are not keys of this
document, such as `settings.uploadJunit` (`false` keeps the JUnit results out of
a run upload) and `settings.messageMaxBytes`. They are set in the pharn.dev app;
the checker does not know them, and a document that names them fails it.

### `policy`

Policy mode settings and rule severities.

| Key | Meaning |
| --- | ------- |
| `policy.required` | In an app policy, `true` makes agent settings files that could not be read (so P02 to P06 did not run) a `POLICY_SETTINGS_INVALID` error instead of a warning. It does not make a policy that could not be fetched block the check: only the workflow input `policy: required` does that (P10). Not allowed from a `file:` policy (named in `POLICY_OVERRIDE_IGNORED`). pharn-ci 0.12.0's schema and docs state this; earlier docs described it as making an unavailable policy block. |
| `policy.rules` | A severity per rule id `P01` to `P14`. Applied to P01 to P09 and P11 from 0.4.0, and to P13 and P14 from 0.6.0; P10 cannot be overridden, and P12 is accepted and not enforced. |

### `agents`

Agent pull request detection and rules.

| Key | Meaning |
| --- | ------- |
| `agents.labels` | Extra PR labels that mark an agent PR (added to `agent` and `ai-generated`). |
| `agents.extra_logins` | Extra GitHub logins whose PRs are agent PRs (a trailing `[bot]` is allowed; from 0.11.0 also an Enterprise Managed User login such as `dev_acme`). |
| `agents.protected_paths` | Globs an agent PR must not change (P11). A path that matches is one violation; a rename counts by both its old and new path. |
| `agents.protected_paths_mode` | `block` (the default) or `warn`; the stricter of it and `policy.rules.P11` applies. |
| `agents.max_files` | From 0.6.0, P14: most files an agent PR may change, 1 to 100000. A rename counts once; lockfiles, snapshots, `*.generated.*` files and `coverage.exclude` paths do not count (they do when the PR edits the config or a workflow, unless the exclusions are the app policy's). |
| `agents.max_changed_lines` | From 0.6.0, P14: most changed lines (added plus removed) an agent PR may have, 1 to 10000000, counted the same way. |
| `agents.require_human_approval` | Accepted by the schema, not enforced: it is meant for rule P12, which 0.4.x to 0.12.x do not apply. |

For a cap the smaller limit wins: a `file:` policy the pull request edits applies
the smaller of its merge-base and head values for each cap, so it can lower a
cap but never raise or remove one. There is no default cap: set one to turn P14
on.

### `dependencies`

Dependency safety (D01 to D05). From 0.8.0, an app policy with a
`dependencies` key requires the check: a `never` input becomes `auto`, named in
`POLICY_OVERRIDE_IGNORED`.

| Key | Meaning |
| --- | ------- |
| `dependencies.lookup` | From 0.8.0: `true` turns on the registry lookups (D01 to D03) in the Action, whatever the `dependencies` input says. Booleans, `true` wins. |
| `dependencies.registries` | The ecosystems (`npm`, `pypi`) whose added packages are looked up; a served policy narrows them. Each maps to a fixed host list in the Action, so this key never names a host and does not allow one for D05 (`dependencies.allowed_hosts` does). Not allowed from a `file:` policy. |
| `dependencies.min_age_days` | D02: minimum age in days of an added package, 0 to 3650 (default 30). A served policy replaces the default; lower layers can still raise it. |
| `dependencies.min_weekly_downloads` | D03: minimum weekly npm downloads of an added unscoped package, 0 to 1000000000 (default 100). Same merge as `dependencies.min_age_days`. |
| `dependencies.allowed_hosts` | From 0.10.0, D05: the private registry hosts the org runs (Artifactory, Nexus, a private PyPI index) whose URLs D05 accepts besides the four public ones. Exact host names, at most 50, each 1 to 253 of the letters A-Z and a-z, digits, `.` and `-`, matched case-insensitively: no scheme, path, port, user name or wildcard (`npm.corp.example`, not `https://npm.corp.example/` or `*.corp.example`). A URL on an allowed host must still be https with no user name, password or port. An app policy's list replaces the workflow's `dependency-allowed-hosts` input (an input host it leaves out is named in `POLICY_OVERRIDE_IGNORED`); a `file:` policy may not set it (recorded, not applied), and `.pharn/ci.yml` refuses it. A key that widens what D05 lets through: draft it only with the hosts the person names. |

### `injection`

From 0.7.0: the prompt-injection scan of the lines a pull request adds. The scan
runs without this key, with PI01 at `block` and PI02 to PI05 at `warn`.

| Key | Meaning |
| --- | ------- |
| `injection.exempt` | Globs of files no PI signal reads, added to the built-in exemptions (fixtures, test data, test files). Applied from an app policy only: a `file:` policy's exemptions are never applied (`POLICY_OVERRIDE_IGNORED`). |
| `injection.phrases` | Extra phrases (names, matched case-insensitively with white space folded) that PI03 reports in added lines and PI02 in hidden Markdown; a finding names a `PX` id, never the phrase. A `file:` policy's list is united with its merge-base list. |
| `injection.signals` | A severity (`block`, `warn`, `info` or `off`) per signal id `PI01` to `PI05`; any other key is an error. An app policy replaces the default; a `file:` policy can only raise it. |

Each signal has its own key, `injection.signals.PI01` (invisible or
bidirectional Unicode, default `block`) to `injection.signals.PI05` (an
instruction file added inside a vendored directory, default `warn`). An
exemption or an `off` hides findings for every repository the policy covers:
draft them only when the person asks for that specific entry.

## `.pharn/ci.yml` and the workflow inputs may only tighten

A policy is applied over the workflow inputs and `.pharn/ci.yml`. Underneath
it, since 0.6.0, `.pharn/ci.yml` may only tighten the coverage threshold
(`coverage.threshold`: with an input set too, the larger applies), `setup.require`
(`true` stays on when the `require-agent-setup` input is `false`) and the
test-integrity mode (`test_integrity.mode` applies only when it is stricter than
the `test-integrity` input), because the pull request carries the file. An input
still replaces the config's coverage file, root and format, and
`coverage.exclude` is the config's patterns plus the input's.

From 0.8.0 the same holds for dependency safety: `dependencies.lookup` set to
`true` in `.pharn/ci.yml` turns lookups on over the `auto` input but never
overrules a workflow's `dependencies: never`, and its `min_age_days` and
`min_weekly_downloads` only raise the defaults.

A `file:` policy is carried by the pull request too, so it can only raise: a
higher threshold, `setup.require: true`, a stricter mode, more `setup.expect`
tools, higher signal severities, more injection phrases and lower P14 caps.
Exclusions, a root, an accept label, `policy.required`, `injection.exempt`,
`dependencies.registries` and `dependencies.allowed_hosts` are not allowed from
a file. From 0.12.0 a pull request that edits the file is checked with the file
at the base commit united with its copy key by key, so the stricter value
applies to every key the file may set, and each value the pull request made
looser is named in `POLICY_OVERRIDE_IGNORED`; 0.4.x to 0.11.x united only the
agent lists, the P14 caps and the injection phrases.

## Writing the values

- A glob (`coverage.exclude`, `setup.forbidden_files`, `agents.protected_paths`,
  `injection.exempt`) is repository-relative with `*`, `**` and `?` only: no
  leading `./`, `/` or `!`, no trailing `/`, no `//`, no `..` segment and none
  of `\ { } [ ]`.
- A permission rule is `Tool` or `Tool(pattern)`. In a rule `/x` is relative to
  the settings file's project directory and `//x` is absolute, so the system
  `/etc` is `Edit(//etc/**)`.
- A `root` is a normalized repository-relative directory (`.` is the root), not
  absolute, with no `..` segment.
- A login is a GitHub login of at most 39 characters (a letter or digit, then
  letters, digits or `-`), optionally followed by `[bot]`; from 0.11.0 also an
  Enterprise Managed User login `handle_shortcode` (one `_` and a shortcode of
  3 to 8 letters or digits, at most 39 characters, never with `[bot]`). A label
  is at most 50 characters.
- Rules are compared with rules, never with what a command does:
  P02 to P06 are text guards, not a security boundary. `Bash(curl:*)` denied
  does not stop `/usr/bin/curl` or `sh -c`; sandboxing is the boundary.
- `agents.protected_paths` can block Dependabot and Renovate, which count as
  agent PRs: do not protect files those bots must update. The same holds for
  P14 caps: a large Dependabot pull request counts.

## Every key path

The schema's key paths, each of which the checker accepts (and nothing else):

- `version`
- `coverage`: `coverage.threshold`, `coverage.exclude`, `coverage.root`
- `setup`: `setup.require`, `setup.expect`, `setup.consistency`,
  `setup.forbidden_permissions`, `setup.required_permissions_deny`,
  `setup.allowed_mcp_servers`, `setup.forbidden_mcp_servers`,
  `setup.required_hooks`, `setup.forbidden_files`
- `test_integrity`: `test_integrity.mode`, `test_integrity.signals`,
  `test_integrity.signals.TI01`, `test_integrity.signals.TI02`,
  `test_integrity.signals.TI03`, `test_integrity.signals.TI04`,
  `test_integrity.signals.TI05`, `test_integrity.signals.TI06`,
  `test_integrity.signals.TI07`, `test_integrity.signals.TI08`,
  `test_integrity.signals.TI09`, `test_integrity.signals.TI10`,
  `test_integrity.signals.TI11`, `test_integrity.signals.TI12`,
  `test_integrity.signals.TI13`, `test_integrity.signals.TI14`,
  `test_integrity.signals.TI15`, `test_integrity.signals.TI16`,
  `test_integrity.signals.TI17`, `test_integrity.accept_label`
- `flaky`: `flaky.quarantine`
- `policy`: `policy.required`, `policy.rules`, `policy.rules.P01`,
  `policy.rules.P02`, `policy.rules.P03`, `policy.rules.P04`,
  `policy.rules.P05`, `policy.rules.P06`, `policy.rules.P07`,
  `policy.rules.P08`, `policy.rules.P09`, `policy.rules.P10`,
  `policy.rules.P11`, `policy.rules.P12`, `policy.rules.P13`,
  `policy.rules.P14`
- `agents`: `agents.labels`, `agents.extra_logins`, `agents.protected_paths`,
  `agents.protected_paths_mode`, `agents.require_human_approval`,
  `agents.max_files`, `agents.max_changed_lines`
- `dependencies`: `dependencies.lookup`, `dependencies.registries`,
  `dependencies.min_age_days`, `dependencies.min_weekly_downloads`,
  `dependencies.allowed_hosts`
- `injection`: `injection.exempt`, `injection.phrases`, `injection.signals`,
  `injection.signals.PI01`, `injection.signals.PI02`, `injection.signals.PI03`,
  `injection.signals.PI04`, `injection.signals.PI05`

## Example

```json
{
  "version": 1,
  "coverage": { "threshold": 80 },
  "setup": {
    "forbidden_permissions": ["Bash(curl:*)"],
    "required_permissions_deny": ["Bash(rm -rf:*)"]
  },
  "agents": {
    "protected_paths": [".github/workflows/**", "migrations/**"],
    "protected_paths_mode": "block",
    "max_files": 25,
    "max_changed_lines": 800
  },
  "dependencies": { "lookup": true }
}
```
