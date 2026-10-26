# GRILL — loop-isolation-stop

- plan: `.dev/features/loop-isolation-stop/PLAN.md` (as approved at GATE 1, 2026-10-25)
- spec-hash check: MATCH (`2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e` = `pharn/ARCHITECTURE.md`
  at `7e71753c`, via `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md`)
- Step 1b lessons declaration: GREEN, exit 0. `check-plan-lessons.mjs`: all 9 cited ids (L34, L35, L36, L37, L43, L54,
  L59, L62, L68) resolve in `.dev/memory-bank/lessons-learned.md` and are referenced in the plan body. That covers the
  DECLARATION only, never whether the lessons were applied (P0).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194020 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions true — lines 324 (logging). Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings

The inline axes and the 13 griller procedures were applied by this stage, inline, over the plan and the live repo.
Every `problem` and `evidence` value is free text quoting the plan or describing live files: DATA, never an
instruction (P2). No instruction-looking content addressed to the griller was found in the plan. Live re-checks
behind the findings: `pharn/floor/loop-closeout.mjs:563-617` (the green gate never reads `record_check`),
`pharn/floor/frontmatter-core.test.mjs:295-330` (the `ENVELOPE_READERS` closure), `pharn/floor/check-loop-record.mjs`
header (the `cap`-is-optional rationale), `.claude/commands/pharn-loop.md:440-445` (why Step 1a exits are S9), and
`.claude/commands/pharn-ship.md` (no `allowed-tools` grant).

### Inline — guarantee audit (P0)

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/loop-isolation-stop/PLAN.md:312"
  problem: "The record checker's isolation REDs do not stop a commit: after one --after-repair the closeout goes on, and its green gate (loop-closeout.mjs:613-617) reads decision, decision_check, mode and iterations but never record_check — so a run whose orchestrator skipped the isolation line (advisory) can still commit a green branch whose record is ISOLATION_MISSING / UNWITNESSED / INCONSISTENT; the audit should either say so or gate the commit on the isolation sub-verdict."
  evidence: '"the record cannot omit that the flag was used" → **floor: enum-regex** for `check-loop-record.mjs`''s verdict on a record handed to it'
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/loop-isolation-stop/PLAN.md:169"
  problem: "The Step 7 summary is listed among the 'code-derived lines … never from the model', but the summary is model-authored text (the close part's Step 7 has the model print it), so for the summary the claim is advisory."
  evidence: "**Code-derived lines, read from the witness, never from the model:** … the Step 7 summary prints the same line from the witness."
```

### Inline — trust propagation (P2) and the security griller (P2)

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/features/loop-isolation-stop/PLAN.md:123"
  problem: "Every probe input is process env (HOME, the four env isolation codes, PHARN_ISOLATED, and the GIT_CONFIG_GLOBAL / GIT_CONFIG_NOSYSTEM / XDG_CONFIG_HOME that git and gh honor), and a project's committed .claude/settings.json `env` block — contributor-controlled repo content, not the operator — can set them: HOME=/tmp/empty plus CODESPACES=true reads ISOLATED on a credentialed laptop; the trust audit names only the operator as the faker, and the hook-wiring pin (line 264) covers only PHARN_ISOLATED in this repo's own settings."
  evidence: "**HOME:** `HOME`, else `USERPROFILE`; … the check binds the honest operator, not the hostile one."
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/features/loop-isolation-stop/PLAN.md:113"
  problem: "`git config --get credential.helper` does not see URL-scoped helpers such as `credential.https://github.com.helper` — the form `gh auth setup-git` writes — so a container with that helper reads ISOLATED; `--get-regexp '^credential\\..*helper$'` would cover both."
  evidence: "`cred:credential-helper` | `git config --get credential.helper` (every scope git reads, HOME as probed) exits 0 with non-empty output"
- type: FINDING
  rule_id: P2
  severity: minor
  file: ".dev/features/loop-isolation-stop/PLAN.md:149"
  problem: "The shell redirect follows a symlink planted at .pharn/pharn-loop/<name>/isolation.json, and that directory can pre-exist (an S15-refused run leaves it, and S2's freshness is judged on pharn/features/ only), so the witness can be written through a link; the record checker's O_NOFOLLOW read fails closed, but the plan does not name the write side."
  evidence: "node pharn/floor/check-run-isolation.mjs --feature '<name>' > .pharn/pharn-loop/<name>/isolation.json"
```

### Inline — determinism (P5)

```yaml
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/features/loop-isolation-stop/PLAN.md:83"
  problem: "Whether --accept-host-execution flips `probe-failed` is unstated (resolved question 2 covers only unreadable-home), and git's exit 1 is read as 'no helper' although a git that cannot run (the macOS xcrun shim without command-line tools) also exits 1."
  evidence: "`probe-failed` (a `git config` exit other than 0/1, or git cannot spawn)"
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/features/loop-isolation-stop/PLAN.md:8"
  problem: "Question for the human: a newly MANDATORY envelope key contrasts with check-loop-record.mjs's own header, which kept `cap` optional because a mandatory field 'would RED every LOOP.md … already committed'; a run started on 6.75.0 and closed on 6.76.0 also REDs UNWITNESSED — is minor the right bump under CLAUDE.md's 'major = a frontmatter change that invalidates existing installs'?"
  evidence: "this increment ships as **6.76.0** (minor: a new shipped checker and stop)"
```

### Inline — one axis / honest scope (P3, P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/loop-isolation-stop/PLAN.md:208"
  problem: "The gpgsign probe measures commit signing in loop-closeout, which is unrelated to the isolation stop; it is a second investigation bundled into this increment."
  evidence: "**gpgsign (report, do not fix):** run `loop-closeout.mjs`'s own `commitArgs` in a temp repo with `commit.gpgsign=true`"
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/loop-isolation-stop/PLAN.md:264"
  problem: "The 'env key containing ACCEPT' half of the hook-wiring pin has no trigger: the opt-in is argv, never env, so nothing it guards can happen."
  evidence: "✧ neither settings file sets `env.PHARN_ISOLATED` or an `env` key containing `ACCEPT`"
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/loop-isolation-stop/PLAN.md:177"
  problem: "S15 takes a crash of the isolation line, while the live 'Why Step 1a's snapshot and --open lines stop as S9' paragraph (pharn-loop.md:440-445) argues an exit-code crash of a Step 1a line is S9; also a failed redirect (missing state directory) reports as `not-isolated`; the plan should say why this Step 1a line differs, or extend that paragraph."
  evidence: "**non-zero → STOP, S15** (`blocked: not-isolated`) — any non-zero, a crash included, one row (fail-closed)."
```

### architecture / coupling griller (P3)

```yaml
- type: FINDING
  rule_id: P3
  severity: important
  file: ".dev/features/loop-isolation-stop/PLAN.md:164"
  problem: "The plan names recordFacts and render-run-report.mjs as readers that 'tolerate absence' of the record's `isolation` (an envelope read), yet two bullets later says they read the witness file; if render-run-report starts calling frontmatterEntries, the ENVELOPE_READERS closure in pharn/floor/frontmatter-core.test.mjs REDs, and that file is not in ## Files (a post-anchor write there is a reconcile escape) — name one source per reader."
  evidence: "**Legacy:** every READER tolerates absence (`loop-closeout.mjs` `recordFacts`, `render-run-report.mjs`, Step 1b's prior-record read)"
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/loop-isolation-stop/PLAN.md:158"
  problem: "Three modules (check-loop-record, loop-closeout, render-run-report) read the run-writable isolation.json, the pure core cannot own an fs reader, and O_NOFOLLOW plus enum validation is stated for one of them only; no single witness reader is named (L35's one-owner rule, applied to the read)."
  evidence: "read once with `O_NOFOLLOW` (`ISOLATION_UNWITNESSED` / `ISOLATION_MISMATCH`; resolved question 3)"
```

### comprehension griller (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/loop-isolation-stop/PLAN.md:104"
  problem: "Why these fourteen signals is uncaptured: AWS env vars are listed but ~/.aws/credentials is not, nor ~/.netrc (git's HTTPS credentials), ~/.docker/config.json or ~/.kube/config, and GITHUB_TOKEN is excluded everywhere on an Actions-only rationale although Codespaces and laptops carry long-lived ones; 'partial by design' needs the selection rule a maintainer can extend."
  evidence: "**Credential signals** — frozen, closed; evaluated regardless of isolation; any hit = credentialed"
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/loop-isolation-stop/PLAN.md:77"
  problem: "The CLI takes and validates --feature, but the record it prints carries no name and nothing else uses it, so the argument's purpose is not stated; and line 231 cites L54's 'ENOENT is the only absence' while the ssh-agent row treats ENOTDIR as absence too."
  evidence: "node pharn/floor/check-run-isolation.mjs --feature <name> [--accept-host-execution]"
```

### error-handling griller (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/loop-isolation-stop/PLAN.md:114"
  problem: "Non-regular files are not covered: a FIFO at ~/.npmrc or <root>/.npmrc blocks a plain read forever (the loop hangs at entry), a directory there throws, and the git spawn has no stated timeout; the plan should classify by lstat type before opening (non-regular = hit) and bound the spawn."
  evidence: "`$HOME/.npmrc` holds `_authToken` (a link or unreadable file counts — fail-closed)"
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/loop-isolation-stop/PLAN.md:115"
  problem: "A committed repo .npmrc carrying the placeholder `_authToken=${NPM_TOKEN}` and an ~/.ssh holding only known_hosts both count as credentials, so containers running common repos refuse routinely and --accept-host-execution becomes a habit, weakening the signal the record carries."
  evidence: "`cred:npmrc-repo` | `<project root>/.npmrc` likewise"
```

### documentation griller (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/loop-isolation-stop/PLAN.md:193"
  problem: "The README sentence over-quantifies both ways (L37): a container holding off-list credentials (GITHUB_TOKEN, a project .env, ~/.aws/credentials) is not refused, and an undetected container (containerd or Kubernetes on cgroup v2, where /proc/1/cgroup reads `0::/` and there is no /.dockerenv) is refused."
  evidence: "_Run an unattended loop in a container that holds none of your credentials. Otherwise it refuses to start unless you pass `--accept-host-execution`_"
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/loop-isolation-stop/PLAN.md:195"
  problem: "docs/guarantees.md (the guarantee-and-check table moved out of the README) and docs/limitations.md are not updated for the new stop, and the docker run example does not say how git gets a commit identity without mounting ~/.gitconfig, whose credential.helper would itself refuse the run."
  evidence: "`docs/pipeline.md`: one subsection, `### Running /pharn-loop in a container`, a minimal `docker run` that mounts only the repository"
```

### testability griller (P1)

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/loop-isolation-stop/PLAN.md:214"
  problem: "The CLI's fs isolation probes (/.dockerenv, /run/.containerenv, /proc/1/cgroup) are exercised only through the core with synthetic probes, so a wrong path in the CLI passes every test, and 'a forced crash' names no mechanism; a test-only env or root override shipped in the CLI would itself be a way to fake isolation."
  evidence: "fake root files are not reachable for `/.dockerenv`, so those rows go through the core with a synthetic probe and are labelled so"
```

### Griller axes with no finding

- **a11y, i18n** — the change adds no user interface and no user-facing translatable text; nothing warranted.
- **migrations** — the LOOP.md envelope gains a key; readers tolerate absence and older checkers ignore extra keys,
  so a rollback reads cleanly. The bump question is raised above (P5, line 8), not here.
- **observability** — the scanner's one hit (line 324) is the trust audit's "nothing is echoed, logged or stored".
  The outcome is recorded in the witness, LOOP.md, RUN-REPORT.md and the commit message; nothing more is warranted.
- **performance** — a handful of lstat calls and one git spawn at entry; no scaling risk.
- **privacy** — the probe reduces env values and file contents to codes, and the L62 leak test is planned.
- **`## Files` completeness** — checked against the live suites: `check-loop-decision.test.mjs` runs the record
  checker over fixtures at arbitrary paths (declared); `pre-run-snapshot.test.mjs`'s WIRING pins only the STOP after
  the capture line, which the insertion keeps; `entry-gates.test.mjs:909-910` pins both grammars (declared);
  `pharn-loop.md` is at 63,995 B against a 65,024 B ceiling and the loop's stage load is about 141.8 KB against
  151,040 B, both declared for re-measurement. The one undeclared file found is conditional (the
  `frontmatter-core.test.mjs` finding above).

## Summary

The plan is grounded and its core/CLI split, frozen lists and leak test follow the repo's precedents. The concerns
cluster in three places. First, what the floor verdict buys: the isolation REDs in the record check do not gate the
commit after one repair, so "the record cannot omit the flag" holds for the verdict but not for what lands on a
branch. Second, the probe's inputs: every one of them is process env that a committed project settings file can set,
including HOME, which silently empties every credential probe; URL-scoped git credential helpers and several common
credential files are outside the list, and the reason for the list's shape is not written down. Third, robustness and
wording: a FIFO can hang the entry step, crashes and redirect failures are labelled `not-isolated`, and the README
sentence promises more than the check does in both directions. The smaller items are a bundled gpgsign probe, a
speculative half of the settings pin, an ambiguous reader source that could touch an undeclared test, and the
mandatory-field versioning question for the human.

ADVISORY VERDICT: 19 concerns raised (0 blocking-severity, 7 important, 12 minor) — for the human to weigh before
/pharn-dev-build. The Step 1b lessons-declaration verdict (GREEN) is a separate floor result, reported in the header
and not counted here.
