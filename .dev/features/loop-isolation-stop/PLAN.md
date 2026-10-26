# PLAN — loop-isolation-stop

- spec_content_hash: 2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e
- applied_lessons: [L34, L35, L36, L37, L43, L54, L59, L62, L68]
- increment: an unattended `/pharn-loop` refuses to start (Step 1a, new stop S15 `blocked: not-isolated`) unless a new floor checker finds evidence of an isolated environment with no host credentials, or the operator passed `--accept-host-execution`; the outcome is recorded in `LOOP.md`, `RUN-REPORT.md`, the summary and the commit message.
- layer(s): pharn-contracts (`loop-record.md`), product floor (`pharn/floor/`), product commands (`.claude/commands/pharn-loop*.md`, `pharn-ship-stages.md`), tests, root docs
- constitution_refs: [P0, P2, P3, P5, P6, P7]
- base: `7e71753c` (origin/main, SKILLS_VERSION 6.75.0) → this increment ships as **6.76.0** (minor: a new shipped checker and stop)

## Why (P7 — the trigger, stated honestly)

The 2026-10-12 independent review's SEC-1, SEC-3 and SEC-5 each reproduced a way an unattended run executes or
unlocks code with no prompt (a plan-scoped `pharn/floor/<new>.mjs` run under the loop's grant; the promote-shaped
setter; executable git configuration). Each was narrowed in its own PR (6.61.0, 6.67.0, hook-hardening-batch), and each
left the same residual, which `LIMITS.md §6` names: _"The only true prevention is OS-level sandboxing of the `Bash`
process … PHARN does not implement it."_ Today `/pharn-loop` meets that residual with one advisory sentence
(`.claude/commands/pharn-loop.md:221`, _"run an unattended loop only where that is acceptable (a sandbox, a container,
a throwaway checkout)"_), which nothing checks. This increment does not build a sandbox. It turns the advice into a
deterministic refusal at entry, so an unattended run on a credentialed host happens only after an explicit operator
flag that the record cannot omit. Trigger class: independent-review findings with reproductions, plus the
maintainer's direction; no recorded loop run was harmed by the residual.

## Discovery (P6 — read this run)

Read: `CLAUDE.md`, `CONTRIBUTING.md` (gates, CHANGELOG, product commands), `pharn/CONSTITUTION.md` in full,
`LIMITS.md` §1d and §6, `THREAT-MODEL.md` §4, `.claude/commands/pharn-loop.md` (frontmatter grant, entry grammar,
Step 1a, the stuck-point table, Step 2's S9 rationale, `## At the stop`), `pharn-loop-close.md` (Steps 6b–7, Final
step), `pharn-loop-quick.md` (entry), `pharn-ship-stages.md` (its `pre-run-snapshot` line),
`.claude/hooks/require-loop-record.cjs` (header, marker, INERT rules), `pharn/floor/pre-run-snapshot{,-core}.mjs`
(headers), `pharn/pharn-contracts/loop-record.md` (whole), `pharn/floor/check-loop-record.mjs` (header),
`pharn/floor/check-loop-decision.mjs` (header, marker witness), `pharn/floor/loop-closeout.mjs` (commit argv,
envelope readers), `pharn/floor/render-run-report.mjs` (`## Verdicts`), `frontmatter-core.mjs` (flat `key: value`
only), `.dev/floor/command-hygiene.test.mjs` (STUCK_POINTS, derived grants, byte ceilings),
`pharn/floor/entry-gates.test.mjs` (entry-grammar pins), `.claude/hooks/hook-wiring.test.cjs` (settings pins), the
guides `product-commands.md`, `versioning.md`, `generated-docs.md`, `floor-gates.md` (pre-run-snapshot),
`floor-orchestration.md` (stop guard, record, decision, closeout). Lessons index freshness gate: exit 0 (GREEN).

**Four places where the brief and the live repo differ — each resolved here or asked below:**

1. **A Step 1a stop writes no `LOOP.md` today.** The brief says a pre-run-snapshot refusal ends "marker closed,
   LOOP.md written with the stop". Live: `pharn-loop.md:451` — _"A stop before `pharn/features/<name>/` exists (S1, a
   failed S3, any Step 1a stop …) writes no record"_; the Stop guard is INERT without a feature directory
   (`require-loop-record.cjs` header, "WHEN IT BLOCKS"); the close part is followed "from Step 7" for such a stop
   (`pharn-loop.md:855`), and its Final step runs `--close '<name>'` (`pharn-loop-close.md:389-393`). So the marker
   **is** closed (advisory, a Bash step) and **no record** is written. **No pre-existing marker defect was found**
   — there is nothing to fix under the brief's one-line rule. Consequence for the design: a refused run leaves its
   evidence in `.pharn/pharn-loop/<name>/isolation.json` and the Step 7 summary, never in a `LOOP.md`; every
   `LOOP.md` carrying `isolation` therefore belongs to a run that passed the check (resolved question 1).
2. **The stop table's codes are `blocked: <id>` rows, not `INCONCLUSIVE · <id>`.** `INCONCLUSIVE` is the `decision`
   a blocked record carries (`loop-record.md`, "The one exception"). The new row is `S15 … stop blocked: not-isolated`;
   since no record exists for it, `INCONCLUSIVE` appears only in the summary's `decision`.
3. **`/pharn-ship`'s `pre-run-snapshot` line is in `pharn-ship-stages.md` (`### Step 2.1`, line 181), not
   `pharn-ship.md` Step 2.** The one-sentence "ship does not get this check" goes beside it there.
4. **The loop's grant list is DERIVED.** `command-hygiene.test.mjs` (`derivedLoopGrants`, closure both ways) requires
   the `Bash(...)` grants to equal the pinned lines with each `<placeholder>` turned into `*`. So the two new pinned
   lines produce their two grants mechanically; the test needs no hand-listed line, only its STUCK_POINTS row and
   counts. Note: the non-flag grant's trailing `*` also matches the flag variant (bashGrantRe reads `*` as any text);
   both grants are still each "used", so closure holds.

## Design

### 1. The checker — core/CLI split (the `pre-run-snapshot` precedent)

- **`pharn/floor/check-run-isolation-core.mjs` — PURE.** No fs, no env, no child process, no clock. Exports the
  frozen closed lists (the ONE owner, L35), the outcome enum, the reason codes, and two total functions:
  - `classify(probe)` → `{ outcome, evidence }` from a plain probe object (below);
  - `decide({ outcome, evidence }, acceptHostExecution)` → `{ exit: 0 | 2, reason: null | <code>, record }`, where
    `record` is exactly `{ outcome, evidence, accepted_host_execution }`.
    Evidence is emitted in frozen-list order, deduplicated, codes only. `check-loop-record.mjs` re-runs `classify` /
    `decide` over a record's codes (one rule, one owner).
- **`pharn/floor/check-run-isolation.mjs` — CLI**, `import "./runtime-floor.mjs"` (the Node floor every CLI loads) and
  the core, plus `FEATURE_SLUG_RE` from `gate-run-core.mjs`; nothing else from the floor (P3). Builds the probe from the
  real machine, calls the core, prints **one JSON line** — the `record` — to stdout on exit 0 **and** on a rule refusal
  (so the redirect leaves the evidence on disk); stderr carries one line from a closed set.

  ```text
  node pharn/floor/check-run-isolation.mjs --feature <name> [--accept-host-execution]
  ```

  Exit `0` ISOLATED, or HOST / ISOLATED_WITH_CREDENTIALS with the flag · `2` refused: stderr
  `check-run-isolation: refused <reason> — <fixed text>`. Closed reasons: `not-isolated` (HOST), `credentials-present`
  (ISOLATED_WITH_CREDENTIALS), `unreadable-home`, `probe-failed` (a `git config` exit other than 0/1, or git cannot
  spawn), `usage`, `crashed` (a caught throw). A module that cannot load is node's exit 1 — every caller stops on any
  non-zero. The `not-isolated` / `credentials-present` / `unreadable-home` texts name the three ways out (run in a
  container without mounted credentials; `PHARN_ISOLATED=1` for a sandbox the list does not detect; re-run with
  `--accept-host-execution` and own the risk) and cite `LIMITS.md §6`. **No value from any env var or file ever reaches
  stdout or stderr** — only codes and fixed text (L62).

### 2. The rule (in the core; the probe only reports existence/names/one key)

**Isolation evidence** — frozen, closed; one hit = isolated environment:

| code                      | probe (CLI)                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------- |
| `fs:dockerenv`            | `lstat("/.dockerenv")` succeeds                                                    |
| `fs:containerenv`         | `lstat("/run/.containerenv")` succeeds (podman)                                    |
| `fs:proc1-cgroup`         | `/proc/1/cgroup` (read capped) matches `docker\|containerd\|podman\|lxc\|kubepods` |
| `env:REMOTE_CONTAINERS`   | `REMOTE_CONTAINERS === "true"`                                                     |
| `env:CODESPACES`          | `CODESPACES === "true"`                                                            |
| `env:GITPOD_WORKSPACE_ID` | non-empty                                                                          |
| `env:GITHUB_ACTIONS`      | `GITHUB_ACTIONS === "true"`                                                        |
| `operator:PHARN_ISOLATED` | `PHARN_ISOLATED === "1"` — an operator assertion, recorded as such                 |

**Credential signals** — frozen, closed; evaluated regardless of isolation; any hit = credentialed:

| code                             | probe (CLI) — existence/names only; `lstat`, never followed (L54, L59)                                          |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `cred:ssh-dir`                   | `$HOME/.ssh`: a symlink (any target, never followed), a non-empty directory, or any entry whose `readdir` fails |
| `cred:ssh-agent`                 | `SSH_AUTH_SOCK` non-empty and `lstat` of it succeeds or fails other than ENOENT/ENOTDIR                         |
| `cred:gh-hosts`                  | `$HOME/.config/gh/hosts.yml` `lstat` succeeds                                                                   |
| `cred:env:GH_TOKEN`              | non-empty                                                                                                       |
| `cred:git-credentials`           | `$HOME/.git-credentials` `lstat` succeeds                                                                       |
| `cred:credential-helper`         | `git config --get credential.helper` (every scope git reads, HOME as probed) exits 0 with non-empty output      |
| `cred:npmrc-home`                | `$HOME/.npmrc` holds `_authToken` (a link or unreadable file counts — fail-closed)                              |
| `cred:npmrc-repo`                | `<project root>/.npmrc` likewise                                                                                |
| `cred:env:NPM_TOKEN`             | non-empty                                                                                                       |
| `cred:env:AWS_ACCESS_KEY_ID`     | non-empty                                                                                                       |
| `cred:env:AWS_SECRET_ACCESS_KEY` | non-empty                                                                                                       |
| `cred:env:VERCEL_TOKEN`          | non-empty                                                                                                       |
| `cred:env:SUPABASE_ACCESS_TOKEN` | non-empty                                                                                                       |
| `cred:env:STRIPE_SECRET_KEY`     | non-empty                                                                                                       |

**HOME:** `HOME`, else `USERPROFILE`; unset, empty, not absolute, or `lstat` not a directory (ENOENT included) →
`unreadable-home` (fail-closed; refused even with the flag — resolved question 2). POSIX paths throughout.

**Not on the list, by design — each named in the contract with its reason:** `GITHUB_TOKEN` (ephemeral, scoped by
the workflow's `permissions:`, present in every Actions run, so listing it would make `env:GITHUB_ACTIONS` useless);
`ANTHROPIC_API_KEY` and `~/.claude/` (the agent's own model credential — always present, the exfiltration residual
this stop does not touch).

**Outcome** ∈ {`ISOLATED`, `HOST`, `ISOLATED_WITH_CREDENTIALS`}: no isolation code → `HOST`; isolation and no
credential code → `ISOLATED`; isolation and a credential code → `ISOLATED_WITH_CREDENTIALS`. Only `ISOLATED` exits 0
without the flag. A VM or WSL holding the user's credentials reads `HOST` — correct, and not detected separately.

### 3. The opt-in

`--accept-host-execution` is an **operator flag**, the `--allow-red-entry` precedent: it counts only among the leading
flags of the line the human typed (after `--quick`), never inside the description, SPEC, PLAN or any file — ADVISORY,
an instruction to the orchestrator. The command and the LIMITS draft say plainly that **the floor sees only argv and
cannot know who typed it**; what the floor guarantees is that a record cannot omit that the flag was used (§4).
Grammar becomes `/pharn-loop [--allow-red-entry] [--accept-host-execution] [--max-iter N] <increment description>`
(and the `--quick` form likewise).

### 4. The record

- **Pinned lines** (Step 1a, after `--open`, before `--capture`), the `instruction-files.json` redirect precedent:

  ```bash
  node pharn/floor/check-run-isolation.mjs --feature '<name>' > .pharn/pharn-loop/<name>/isolation.json
  node pharn/floor/check-run-isolation.mjs --feature '<name>' --accept-host-execution > .pharn/pharn-loop/<name>/isolation.json
  ```

  The orchestrator runs exactly one: the second only when the operator typed the flag.

- **`LOOP.md` envelope gains a mandatory `isolation` key**, one line, the witness JSON copied verbatim (the frontmatter
  reader is flat `key: value` only; a JSON object is a valid YAML flow mapping):
  `isolation: {"outcome":"ISOLATED","evidence":["fs:dockerenv"],"accepted_host_execution":false}`.
- **`check-loop-record.mjs`** (enum/regex + JSON shape + core re-derivation + witness agreement), REDs: key absent
  (`ISOLATION_MISSING`); not a control-char-clean ≤ 1 KiB scalar, not JSON, not exactly the three keys, outcome outside
  the enum, a code outside the frozen lists or repeated, `accepted_host_execution` not a boolean (`ISOLATION_MALFORMED`);
  outcome ≠ `classify` of the recorded codes, or `decide` of codes + flag exit ≠ 0 — a refused run cannot have a record
  (`ISOLATION_INCONSISTENT`); the value not byte-equal to `.pharn/pharn-loop/<name>/isolation.json`'s line, located from
  the record's own `pharn/features/<name>/LOOP.md` path, read once with `O_NOFOLLOW` (`ISOLATION_UNWITNESSED` /
  `ISOLATION_MISMATCH`; resolved question 3). **Legacy:** every READER tolerates absence (`loop-closeout.mjs`
  `recordFacts`, `render-run-report.mjs`, Step 1b's prior-record read); only the checker REDs it, and it runs on the
  current run's record at closeout — nothing re-checks committed records (the `check-loop-decision.mjs` `cap`
  precedent; the one committed legacy record, `.dev/features/loop-decision-integrity-product/LOOP.md`, is read by no
  test).
- **Code-derived lines, read from the witness, never from the model:** `render-run-report.mjs` `## Verdicts` gains
  `- isolation: <outcome>` (+ `(host execution accepted by operator)` when the flag was used; `n/a` when no witness, or
  for a `/pharn-ship` report); `loop-closeout.mjs` `commitArgs` gains one paragraph, `Isolation: <outcome>` plus the
  same suffix, built from the witness's enum tokens only (P2); the Step 7 summary prints the same line from the witness.

### 5. Wiring

- `pharn-loop.md` Step 1a: the two lines above, between `require-loop-record.cjs --open` and
  `pre-run-snapshot.mjs --capture`; **non-zero → STOP, S15** (`blocked: not-isolated`) — any non-zero, a crash
  included, one row (fail-closed). The refusal takes the pre-run-snapshot path exactly: no feature directory, no
  record; read the close part from Step 7; its Final step releases the scope and closes the marker. The summary quotes
  the stderr reason code and names the three ways out.
- New table row `S15`; the range sentence becomes "S4–S15"; S9's "Step 1a's snapshot or marker `--open`" stays S9.
- Line 221's advice ("run an unattended loop only where that is acceptable …") is replaced by a pointer to Step 1a's
  check and S15.
- `--quick` runs Step 1a unchanged (`pharn-loop-quick.md` item 1 already says so); only its grammar line gains the
  flag.
- `pharn-ship-stages.md` `### Step 2.1`: one sentence beside its `pre-run-snapshot` line — `/pharn-ship` runs no
  isolation check, because a person approves the SPEC at GATE 1 and decides at GATE 2; do not add it by analogy.
- `reads:` frontmatter gains `pharn/floor/check-run-isolation.mjs`.

### 6. Docs

- `README.md`, the `/pharn-loop` intro, as its own paragraph right before "Use the full `/pharn-loop` for a
  feature…": _Run an unattended loop in a container that holds none of your credentials. Otherwise it refuses to start
  unless you pass `--accept-host-execution` to tell it to proceed._ (badge 6.76.0)
- `docs/pipeline.md`: one subsection, `### Running /pharn-loop in a container`, a minimal `docker run` that mounts only
  the repository and passes only the model credential — illustrative, marked advisory, no devcontainer generator.
- `.dev/guides/floor-gates.md`: a `## check-run-isolation.mjs` section (rule, exits, bounds) after `pre-run-snapshot`.
- **Human-only (fix #2), drafted at build in `.dev/features/loop-isolation-stop/HUMAN-PATCH.md`, applied by you:**
  `LIMITS.md §6` (the sandbox stays harness-layer and unimplemented; this version adds a refusal to start unattended
  without evidence of one; the evidence and the override are operator-fakeable by design — it binds the honest, not the
  hostile; the floor sees argv, never who typed it; the agent's own model credential is always present and is the
  exfiltration residual the stop does not touch) and `THREAT-MODEL.md §4` (one item). **Timing (L68): after
  `/pharn-dev-verify`, before the PR** — reconcile cannot attribute a human write inside the anchor→verify window; you
  commit it, then I re-run `npm run check`.

### 7. Probes at build (recorded in `.dev/features/loop-isolation-stop/PROBE.md`)

- **gpgsign (report, do not fix):** run `loop-closeout.mjs`'s own `commitArgs` in a temp repo with
  `commit.gpgsign=true`, an empty `HOME` / `GNUPGHOME`, and no signing key; record git's exit and the outcome it maps
  to (expected: `commit failed` → closeout exit 4 → Step 6d undo; to be measured, not assumed).
- **This laptop:** the CLI's codes and exit here (codes only), for the PR's "laptop" row.
- **L37:** each README / command / LIMITS-draft sentence that quantifies over what the checker accepts is executed
  against at least one case expected to be excluded (e.g. `PHARN_ISOLATED=1` with `~/.ssh` present → refused).
- PR table rows for devcontainer-with-agent-forwarding / `docker run` repo-only / Codespaces / GitHub Actions are
  derived by running the CLI with the corresponding probe environment (env vars + temp HOME + fake root files are
  not reachable for `/.dockerenv`, so those rows go through the core with a synthetic probe and are labelled so).

## Applied lessons

- L34 — every per-code core test iterates the frozen lists, and a ✧ test first asserts both lists are non-empty and
  of their stated length, so a vacuous pass over an emptied list is RED.
- L35 — the two frozen lists, the outcome enum and the reason codes have ONE owner (the core); the CLI, the record
  checker and the contract's table read or are pinned to it, never restate it.
- L36 — the evidence vocabulary is closed both ways: a closure test collects every backticked `fs:` / `env:` /
  `operator:` / `cred:` code in `loop-record.md` and `pharn-loop.md` and requires membership, and S15's
  `blocked: not-isolated` joins STUCK_POINTS so the blocked-spelling closure covers it.
- L37 — the README sentences, the command's flag rule and the LIMITS draft's quantified sentences are probed by
  executing the CLI on an excluded member (§7), not by reading the code.
- L43 — the `isolation` field agrees with the witness file, and both are writable by the run; the plan, contract and
  claims say "agreement between two files, never provenance", never "proves the environment was isolated".
- L54 — every credential probe classifies with `lstat`; ENOENT is the only absence; a dangling `SSH_AUTH_SOCK` link or
  `.ssh` link is a hit, tested.
- L59 — `.ssh` as a symlink counts without being followed (its target may be outside HOME); the CLI test enumerates
  regular / link-to-dir / dangling link for `.ssh` and the socket path.
- L62 — refusal and output text is built only from frozen tokens and fixed phrases; a test plants distinctive values
  in every listed env var and file and asserts none appears on stdout or stderr.
- L68 — the `LIMITS.md` / `THREAT-MODEL.md` edits are sequenced after `/pharn-dev-verify`, and that ordering is put to
  you at GATE 1 (here), not after an escape.

## Files

- `pharn/floor/check-run-isolation-core.mjs` — new: frozen lists, outcomes, reasons, `classify`, `decide` (pure) — product floor
- `pharn/floor/check-run-isolation.mjs` — new: CLI, probe builder, one JSON line out — product floor
- `pharn/floor/check-run-isolation-core.test.mjs` — new: ★ core tests over fake probes — test
- `pharn/floor/check-run-isolation.test.mjs` — new: ★ spawned-CLI tests over temp HOME / sockets / links — test
- `pharn/floor/check-loop-record.mjs` — mandatory `isolation`, shape, re-derivation, witness agreement — product floor
- `pharn/floor/check-loop-record.test.mjs` — new-record RED without `isolation`, each refusal, template GREEN — test
- `pharn/floor/loop-closeout.mjs` — commit-message isolation paragraph from the witness — product floor
- `pharn/floor/loop-closeout.test.mjs` — fixtures carry the field + witness; message paragraph pinned — test
- `pharn/floor/render-run-report.mjs` — `## Verdicts` isolation line from the witness — product floor
- `pharn/floor/render-run-report.test.mjs` — the line, the accepted suffix, `n/a` — test
- `pharn/floor/check-loop-decision.test.mjs` — fixtures gain the field if its suite runs the record check — test
- `pharn/floor/check-loop-fresh.test.mjs` — fixtures gain the field if its suite runs the record check — test
- `pharn/floor/render-cost-ledger.test.mjs` — fixtures gain the field if needed — test
- `pharn/floor/entry-gates.test.mjs` — the two entry-grammar pins gain `[--accept-host-execution]` — test
- `pharn/pharn-contracts/loop-record.md` — the field, template, frozen-list tables, not-on-list reasons, rules — pharn-contracts
- `.claude/commands/pharn-loop.md` — grammar + flag rule, Step 1a lines, S15 row, line-221 pointer, `reads:`, derived grants — product command
- `.claude/commands/pharn-loop-quick.md` — the quick grammar line — product command part
- `.claude/commands/pharn-loop-close.md` — Step 6b `isolation` capture rule; Step 7 isolation line — product command part
- `.claude/commands/pharn-ship-stages.md` — one sentence: ship runs no isolation check — product command part
- `.dev/floor/command-hygiene.test.mjs` — STUCK_POINTS S15 (count 18), ceilings re-measured, flag-position pin, code closure — test
- `.dev/floor/stage-load-budget.test.mjs` — `pharn-loop` load ceiling re-measured if exceeded — test
- `.dev/floor/command-family.test.mjs` — only if a pinned heading/line moves between family files — test
- `pharn/floor/stage-runtime.test.mjs` — GIT CEILING map lists the CLI's one `config` spawn (amendment A13) — test
- `pharn/floor/test-infra-core.test.mjs` — the `.npmrc` closure exempts the CLI's credential-path use (amendment A13) — test
- `.claude/hooks/hook-wiring.test.cjs` — ✧ neither settings file's `env` sets `PHARN_ISOLATED`, a key containing `ACCEPT`, or any other probe input (amendment A3) — test
- `.dev/guides/floor-gates.md` — `## check-run-isolation.mjs` section — dev apparatus
- `docs/pipeline.md` — `### Running /pharn-loop in a container` (advisory example) — root docs
- `docs/guarantees.md` — one row: the entry refusal, floor verdict vs advisory evidence (amendment A10) — root docs
- `docs/limitations.md` — the sandbox bullet names the new refusal and its bounds (amendment A10) — root docs
- `README.md` — the two sentences; version badge — root docs
- `SKILLS_VERSION` — 6.75.0 → 6.76.0 — repo meta
- `CHANGELOG.md` — `## [6.76.0] - <date>` with this entry; `[Unreleased]`'s current entry moved into it — repo meta
- `.dev/features/loop-isolation-stop/HUMAN-PATCH.md` — the drafted LIMITS §6 / THREAT-MODEL §4 text, for you to apply — dev apparatus
- `.dev/features/loop-isolation-stop/PROBE.md` — gpgsign, laptop and outcome-table measurements — dev apparatus

## Contracts satisfied

- `pharn/pharn-contracts/loop-record.md` — extended: a mandatory envelope field `isolation`, its closed shape, and the
  two checker rules (shape + agreement); "Extra keys are ignored" stays true for other keys.
- `pharn/pharn-contracts/finding-shape.md` — cited for the P2 split: the record's `isolation` is enum/regex-gated; no
  free text enters it.
- `pharn/pharn-contracts/reconciliation-record.md` — unchanged; the CLI writes nothing itself (the redirect is a Bash
  write into `.pharn/**`, before the build's anchor, so no epoch sees it).

## Evals / tests to write (P1 — no new Capability; floor checkers carry tests)

- ★ core: each isolation code alone → `ISOLATED`; each credential code alone (no isolation) → `HOST`; isolation + each
  credential code → `ISOLATED_WITH_CREDENTIALS`; flag turns `HOST` / `ISOLATED_WITH_CREDENTIALS` into exit 0 with
  `accepted_host_execution: true`; flag with `ISOLATED` records `true`, exit 0; unreadable HOME refused with and without the flag;
  evidence order = frozen order, no duplicates; ✧ both lists non-empty and of fixed length (L34).
- ★ CLI (spawned): temp HOME without / with `.ssh` (empty dir → no hit; one file → hit; symlink to a dir outside HOME →
  hit; dangling symlink → hit), `.config/gh/hosts.yml`, `.git-credentials`, `.npmrc` with and without `_authToken`
  (home and repo), `credential.helper` set in a temp global config; `SSH_AUTH_SOCK` at a real listening temp unix
  socket → hit, at a dead path → no hit; `PHARN_ISOLATED=1` alone → exit 0; HOME unset; a forced crash → exit 2
  `crashed`; stdout exactly one JSON line, stderr exactly one line; planted secret values in every env var and file
  appear in neither (L62); `--feature` refusals (`usage`).
- ✧ pins: the two Step 1a lines sit between `--open` and `--capture`, each exactly once (WIRING-style test); the grant
  closure still holds with them (existing derived test); `blocked: not-isolated` and the S15 row (STUCK_POINTS);
  both entry grammars carry `[--accept-host-execution]` before `<increment description>` and the flag-rule sentence
  says it never counts inside the description (prose pin — nothing parses an invocation, stated); `check-loop-record`
  REDs a record without `isolation` and the contract template is GREEN; frozen-list parity between the core and the
  contract's two tables (both ways); code closure (L36); hook-wiring env pin plus its negative control (a planted
  `env.PHARN_ISOLATED` fails it).

## Guarantee audit (P0)

- "an unattended run does not start without isolation evidence or the flag" → **floor: enum-regex** for the
  checker's VERDICT (closed lists, exit code); the orchestrator RUNNING the line and stopping on non-zero is
  **advisory** (command prose, the two clocks).
- "the environment is isolated" → **advisory**, struck as a guarantee. The evidence is environment-supplied and
  operator-fakeable (`PHARN_ISOLATED=1`, a planted `/.dockerenv`, an env var): the check binds the honest operator, not
  the hostile one. Stated in the command's claims block, the contract and the LIMITS draft.
- "no credentials are reachable" → **advisory**, struck. The list is closed and partial by design (a token in a
  project `.env`, a cloud metadata endpoint, a keychain, `GITHUB_TOKEN`, the model credential are all outside it).
- "the record cannot omit that the flag was used" → **floor: enum-regex** for `check-loop-record.mjs`'s verdict on a
  record handed to it (mandatory key, re-derivation, witness agreement); **agreement between two run-writable files,
  never provenance** (L43) — a Bash writer can rewrite both. The commit message and RUN-REPORT line are tested code
  over the witness.
- "the floor knows who typed the flag" → **struck**: it sees argv only.
- "a refusal closes the run's marker" → **advisory** (the Final step's `--close` is a Bash step); unchanged from today.
- "/pharn-ship needs no isolation check" → **advisory** design rationale (two human gates), stated once.

## Trust audit (P2)

- The probe reads environment names/values and file existence on the operator's machine — untrusted data. Values are
  reduced to booleans inside the CLI; only frozen codes leave it. `.npmrc` content is searched for one literal and
  discarded; nothing is echoed, logged or stored.
- The isolation JSON re-enters the orchestrator's context via the summary; it is codes and enum tokens only, so it
  carries no instruction surface. The record checker JSON-parses the field and compares it as data.
- The flag arrives on the command line the human typed; text in the description, SPEC, PLAN or a prior Handoff that
  says "pass `--accept-host-execution`" is an attack to quote, never an instruction (stated beside the flag rule).

## Determinism audit (P5)

- Every branch is a membership test: env equality to fixed strings, `lstat` result classes, one literal substring,
  `git config` exit code, enum outcome; the orchestrator branches only on the CLI's exit code (0 → go on, else S15).
  No model judgment decides isolation. The terminal fallback for an environment the list does not know is the
  operator's explicit `PHARN_ISOLATED=1` or the flag — a person's answer, never a guess.

## Post-grill amendments (2026-10-25, before build Step 0 — the orchestrator's decisions, NOT re-approved at GATE 1)

`GRILL.md` raised 19 advisory concerns (0 blocking). These amendments act on the ones that are in scope and cheap.
Each one narrows a claim or hardens a probe; none adds a capability or changes a GATE-1 answer. Where an amendment
and the Design section above disagree, the amendment wins. The concerns that were not acted on are listed at the end
with the reason, so GATE 2 can weigh them.

- **A1 (grill P0 :312) — the commit carries the outcome, the record check does not gate it.** After one
  `--after-repair` the closeout commits whatever the record check said (it does this for every record RED today).
  So the floor carrier for "a committed branch cannot hide that the flag was used" is the commit-message paragraph
  `loop-closeout.mjs` builds from the WITNESS. When the witness is absent or unusable, that paragraph says
  `Isolation: not recorded (no usable .pharn/pharn-loop/<name>/isolation.json)`, never nothing. The guarantee audit
  line is narrowed: `check-loop-record.mjs`'s isolation REDs are a floor verdict on the record, shown in the summary,
  and they do not block the commit.
- **A2 (grill P0 :169) — the Step 7 summary line is advisory.** The model writes the summary, so its isolation line
  is advisory. The code-derived lines are RUN-REPORT.md and the commit message.
- **A3 (grill P2 :123) — a project's own settings can set every probe input.** A committed `.claude/settings.json` or
  `settings.local.json` `env` block is project content, not the operator's. It can set `HOME`, the isolation env
  codes, `PHARN_ISOLATED` and git's config variables. This is stated as a bound in the contract, the command's
  claims block, the guide and the LIMITS draft. In THIS repo the hook-wiring pin covers the whole input set: no
  settings `env` key may be `PHARN_ISOLATED`, contain `ACCEPT`, be one of the env isolation codes' names, be one of
  the credential env names, or be `HOME`, `USERPROFILE`, `XDG_CONFIG_HOME`, `SSH_AUTH_SOCK` or a `GIT_CONFIG*` name.
  The `ACCEPT` half stays because the brief asked for it (grill P7 :264 noted it has no trigger).
- **A4 (grill P2 :113) — URL-scoped credential helpers count.** The probe reads
  `git config --get-regexp ^credential\..*helper$`, which covers `credential.helper` and the
  `credential.<url>.helper` form `gh auth setup-git` writes. Any non-empty value is a hit. Exit 0 with values = hit,
  exit 1 = none, anything else (or a spawn error, or the 10 s spawn timeout) = `probe-failed`. A broken git shim
  that exits 1 reads "none". That run would already have stopped at S3 (`git rev-parse HEAD`), which runs first, so
  the bound is stated rather than handled.
- **A5 (grill P7 :104) — the selection rule, and two more files.** The rule, written in the contract: _a file or env
  var whose presence alone gives a process write, push or deploy access to a remote system (git hosting, a package
  registry, a cloud account, a deploy platform)._ By that rule two files join the list: `cred:netrc`
  (`$HOME/.netrc`, git's HTTPS credentials) and `cred:aws-credentials` (`$HOME/.aws/credentials`, the file form of
  the listed AWS env vars). `~/.docker/config.json` and `~/.kube/config` are named in the contract as NOT on the list
  yet, and why: either can hold only non-secret settings, and the brief named neither. The `GITHUB_TOKEN` reason is
  corrected. It is ephemeral in Actions. In Codespaces it is long-lived, but the codespace's credential helper is
  already a signal (A4), so a codespace reads `ISOLATED_WITH_CREDENTIALS` either way.
- **A6 (grill P7 :114) — no read can hang.** Every file probe classifies with `lstat` first. Only a regular file is
  opened, with `O_RDONLY|O_NOFOLLOW|O_NONBLOCK` and a 64 KiB cap. A link, FIFO, socket, directory or unreadable file
  where a credential file is expected counts as a hit (fail-closed). `/proc/1/cgroup` is read the same way, and
  there a non-regular file reads as no evidence. The git spawn is bounded at 10 s.
- **A7 (grill P5 :83, P3 :177) — what the flag cannot accept, and why S15 takes every non-zero.** The flag accepts
  only the two known outcomes, `HOST` and `ISOLATED_WITH_CREDENTIALS`. `unreadable-home`, `probe-failed`, `usage`
  and `crashed` refuse with or without it, because the evidence is unknown rather than known-bad. Every non-zero
  exit of the line is S15, not S9. One sentence is added beside the live "Why Step 1a's snapshot and `--open` lines
  stop as S9" paragraph: this line's remedy is about the environment (a container, `PHARN_ISOLATED=1` or the flag),
  so a person must see S15's row whatever the exit. The summary quotes the stderr reason code. When there is none (a
  failed redirect, a module that cannot load), it says so.
- **A8 (grill P3 :164, :158) — one source per reader, one owner of the witness grammar.** No reader parses the
  envelope's `isolation`. `recordFacts` is unchanged, and `render-run-report.mjs` and `loop-closeout.mjs` read only
  the witness file. So `frontmatter-core.test.mjs`'s `ENVELOPE_READERS` closure is untouched, and only
  `check-loop-record.mjs` reads the envelope field. The core exports the one pure witness grammar,
  `parseIsolationLine(text)` → the record or null (exactly one line, the three keys, closed values, consistent with
  `classify`/`decide`). Each consumer reads the file with `O_NOFOLLOW` before handing it the text. The redirect's
  WRITE side follows a link planted at the witness path. That is stated as a bound, and the O_NOFOLLOW reads fail
  closed on such a link.
- **A9 (grill P7 :193, :195) — README wording that matches the check.** The README paragraph becomes: _Run an
  unattended loop in a container that holds none of your credentials. At entry it checks a fixed list of container
  markers and credential files and env vars. When it finds no container marker, or finds a credential, it refuses
  to start unless you pass `--accept-host-execution`._ The guide and docs say plainly that a credential off the list
  is not seen, and that an unlisted container (containerd or Kubernetes on cgroup v2, `0::/`) needs
  `PHARN_ISOLATED=1`. The `docker run` example sets git's identity with `-e GIT_AUTHOR_NAME/...` rather than mounting
  `~/.gitconfig`, and says why.
- **A10 (grill P7 :195) — the two summary docs.** `docs/guarantees.md` gains one row and `docs/limitations.md`'s
  sandbox bullet gains one sentence, both added to `## Files` above.
- **A11 (grill P1 :214) — the CLI's fs probes are tested without a fake-isolation input.** The CLI exports
  `buildProbe({ fsRoot, env, home, cwd, git })`. `main()` always passes `fsRoot: "/"`, and no env var or flag
  reaches it. The tests call `buildProbe` with a temp `fsRoot` holding `.dockerenv`, `run/.containerenv` and
  `proc/1/cgroup` (each kind, including a FIFO and a link). They spawn the real CLI for the end-to-end cases. No real input makes the CLI
  throw, so the `crashed` path is pinned two ways. First, the CLI exports `run(argv, deps)`, and a unit test passes
  a `buildProbe` that throws: exit 2, `refused crashed`, nothing on stdout. Second, a spawned copy of the CLI in a
  temp dir with no core beside it shows node's own exit 1 for a module that cannot load, which every caller also
  treats as a stop.
- **A12 (grill P7 :77) — `--feature`'s purpose, and the ENOTDIR wording.** `--feature` validates the run's slug, so
  a malformed slug fails the line at entry the same way it fails every other pinned Step 1a line. The JSON does not
  carry it, because the witness path already names the run. For the socket, `lstat` ENOENT and ENOTDIR both mean "no
  such path" (a path component is a file), and the Applied-lessons L54 line is read with that one addition.

- **A13 (build, 2026-10-25 — the maintainer's choice, asked through the form) — two test files added after the
  anchor, and the epoch re-anchored.** `npm test` found two closures the plan did not name. `stage-runtime.test.mjs`'s
  GIT CEILING map must list every git spawn in a shipped floor module, and the CLI has one (`config`, with a
  `maxBuffer`). `test-infra-core.test.mjs`'s package-manager-config closure counts the literal `".npmrc"`, which the
  CLI uses as a credential path, a different purpose. Neither can be satisfied by the CLI without gaming the scan, so
  each test gets one entry with its reason. Before widening, `npm run check:reconcile` read `CLEAN` (28 paths
  reconciled, 0 escapes, 0 warnings, epoch `2026-10-25T12:57:24.799Z`, anchored by `pharn-dev-build`). Asked whether
  to widen and re-anchor, keep the anchor and take a `plan-widened-after-anchor` FAIL, or revert and rebuild, the
  maintainer chose widen and re-anchor. **Recorded slip:** the first re-anchor ran in parallel with this edit, which
  the build scope blocked. So it re-anchored the unwidened 32-path plan, with no repo write in between. Then this file
  was scoped and edited, and the setter (34 paths) and `--anchor` ran again in that order. The final epoch absorbs
  only the 28 paths the CLEAN preview had already judged.

**Not acted on, with the reason (for GATE 2):** grill P5 :8. The bump stays minor: the brief set it, and no existing
record is re-checked (the `cap` precedent's own argument). A run that starts on 6.75.0 and closes on 6.76.0 REDs
`ISOLATION_MISSING` at its record check, which is stated as the upgrade bound. Grill P7 :208: the gpgsign probe stays,
because the brief asked for it. Grill P7 :115: the `.npmrc` `${VAR}` placeholder and a `known_hosts`-only `~/.ssh`
both still count. The brief's rule says "containing `_authToken`" and ".ssh non-empty", and its last instruction is
not to shorten the list. The routine-refusal cost is stated as a bound, with the remedy (remove the file from the
container, or `PHARN_ISOLATED=1` is NOT a remedy for a credential, only the flag is).

## Resolved questions (answered by the maintainer at GATE 1, 2026-10-25)

All four were put to the maintainer through the interactive form and answered with the recommended option. There are
no open questions left.

1. **Refusal path: same as the snapshot's.** S15 writes no feature directory and no `LOOP.md`. The evidence stays in
   `.pharn/pharn-loop/<name>/isolation.json` and the Step 7 summary, and the Final step closes the marker.
2. **Unreadable HOME: refused even with the flag.** `unreadable-home` is not one of the two refusals
   `--accept-host-execution` flips. The core's `decide` returns exit 2 `unreadable-home` whatever the flag says, and
   the refusal text names setting HOME as the way out.
3. **Witness agreement: yes.** `check-loop-record.mjs` requires the record's `isolation` value to be byte-equal to
   `.pharn/pharn-loop/<name>/isolation.json`'s line (`ISOLATION_UNWITNESSED` / `ISOLATION_MISMATCH`). This is
   agreement between two files the run can write, never provenance (L43).
4. **Human edits: after verify.** The maintainer applies and commits `HUMAN-PATCH.md`'s `LIMITS.md §6` and
   `THREAT-MODEL.md §4` text after `/pharn-dev-verify` and before the PR. Then `npm run check` is re-run (L68).
