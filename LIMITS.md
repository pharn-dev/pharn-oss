---
file: "LIMITS.md"
trust: trusted
editable_by: "human only"
purpose: "What PHARN does NOT guarantee. Labels the irreducible limits, the residual, and the token cost model honestly. Required by P0 and P7: a limit sold as a guarantee is the disease this whole repo exists to prevent."
---

# PHARN — Limits (what we do not guarantee)

> Per P0 and P7, this file is not optional and not a disclaimer footnote. It is a first-class part
> of the architecture. If a claim elsewhere contradicts a limit named here, the limit wins.

---

## 1. The four irreducible limits

These cannot be reduced to the floor. They are **not bugs to fix** — they are truths to **stop
overselling**. Each has a floor backstop that bounds its blast radius; none has a fix that makes it
a guarantee.

### 1a. Markdown is executable

A Capability body is instructions an LLM executes. A community Capability — pure markdown, zero
`.cjs` — is a prompt-injection delivery mechanism **by design**. You cannot fence the body of a
thing whose purpose is to be executed as instructions.

- **Struck claim:** "markdown-only = safe."
- **Backstop (floor):** `kind: community` cannot declare trusted-write or off-allowlist egress
  (`THREAT-MODEL.md §3`, pre-write hook; pre-egress specified, ships with the guarded surface). Safety comes from the floor, not from the
  absence of `.cjs`. **Live today, and narrower than that sentence reads:** `pharn/floor/validate.mjs`
  enforces `kind` enum membership and restricts `seal` to `kind: pharn-owned`. The markdown-only /
  no-`.cjs` half and the trusted-write half are enforced by **no running check** — the three hooks
  contain zero `kind` references, so both are _(specified; ships with the guarded surface)_.

### 1b. The fence is enforced by the model that may be compromised

The _act_ of honoring a fence ("treat this as data, report instructions as findings") is itself an
instruction the LLM executes, in the same context window as the untrusted block. It is a
prompt-strength contest, and injection is unsolved.

- **Struck claim:** "the trust-fence makes PHARN injection-proof."
- **True statement:** the fence reduces blast radius and converts some attacks into findings. Only
  the deterministic floor (hooks, content-hash, regex) is actually injection-proof.
- **Backstop (floor):** every _guaranteed_ decision is enum-gated (`ARCHITECTURE.md §8`), so
  residual injection can only move _advisory_ judgments.

### 1c. `est_tokens` cannot be computed statically

A Capability's dominant input (the diff, the plan) is runtime-variable, so a static `est_tokens`
in frontmatter is either a constant guess (always wrong) or a function of input size (which
frontmatter cannot express).

- **Struck claim:** "`est_tokens` = cost."
- **True statement:** `est_tokens` is an estimate with a confidence band; the real number is the
  **measured runtime cost** (the system already observes it). `/pharn-estimate` _(specified; ships with the guarded surface)_ reports a range,
  not a promise. The 2.0 cost-per-feature metric is built on _measured_ cost, not the declared
  field.

### 1d. "Approved" is forgeable at the write surface

`state: Approved` and its `spec_content_hash` pin are ordinary frontmatter fields, written by the same
agent that authors the SPEC body — and `check-spec.mjs --hash` hands that agent the exact value to pin.
So `check-spec.mjs` returns GREEN for _any_ body the writer chose to stamp "Approved," and the whole
downstream chain (`check-spec-approved.mjs`, `check-plan-spec-agree.mjs`) reduces to the same
`state`-enum + hash-equality — all of it satisfiable by a non-compliant or prompt-injected agent that
never asked a human. The content-hash proves the body did not drift _after_ the pin; it never proves a
_person_ set the pin. This is the one place enum-gating (§2 primitive #3 — the very backstop §1b leans
on) does not help: enum-gating stops a guaranteed decision from resting on a _tainted free-text_ field,
but the gate's integrity here rests on _who may write the enum field_, and in pure markdown the agent may.

- **Struck claim:** "`state: Approved` is a floor-checked enum, therefore a human approved the intent."
- **True statement:** the floor guarantees the approved body is un-drifted, not that a human approved it.
  "Human-approved intent flows downstream" is a **discipline** assumption, not a floor guarantee — in
  pure PHARN-OSS, `Approved` is forgeable by whatever holds the Write tool. The same holds for GATE 2
  (the post-verify decision) and every between-stage proceed: _invoking and obeying_ the checker is
  advisory orchestration, not a floor primitive (the "two clocks," stated in the checkers themselves).
- **Backstop (floor):** a forged approval moves only the advisory _intent-approval_ signal; it unlocks
  no floor-gated capability — the pre-write / writes-scope hooks (and pre-egress, specified; ships with the guarded surface) re-gate every downstream
  write **issued through the `Write`/`Edit`/`MultiEdit`/`NotebookEdit` tool surface** and network call
  regardless of `state` — in an installed project, while a scope is set or a PHARN run is open; outside
  both, the writes-scope guard no longer gates ordinary project paths (§7) — and the human GATE-2 decision
  still stands between a built increment and merge.
  The quantifier is bounded and the bound is load-bearing: a write issued through **`Bash`** is re-gated
  by neither hook, so this backstop covers that one tool surface and no other — **§6**.
  Closing the gate itself needs an out-of-band approval signal the Write tool
  cannot forge (e.g. a `PreToolUse` hook admitting the Draft→Approved transition only against a
  human-supplied signed marker) — that is **harness-layer**, environment-dependent, not expressible in
  markdown methodology. Until an environment supplies it, this stays a named limit, not a guarantee.

A related bound on the same checker: a valid AC grammar means the AC is PHRASED testably — not that
any test exists, runs, or passes. That bound is `check-spec.mjs`'s, not the pipeline's: for a
templated SPEC that is not `spec_kind: test-infra`, `/pharn-test` writes each criterion's test before
the build and requires it to fail, `/pharn-build` refuses without that evidence, and `/pharn-verify`'s
AC gate requires each locked, once-red test to pass on the head run (6.17.0–6.20.0) — separate checks,
bounded in §9. The template rules are opt-in by the `spec_template` frontmatter key; a SPEC without it
validates under the legacy four-section rule, and the AC stages report it not-applicable.

The template `/pharn-spec` fills may be the project's own, `pharn.spec-template.md` at the project root
(6.14.0), and its guidance comments are instructions. `protect-trusted-paths.cjs` denies it by path,
like the trusted docs — on the `Write`/`Edit`/`MultiEdit`/`NotebookEdit` surface only; a `Bash` write
reaches it (§6). `check-bash-reconcile.mjs` detects such a write only when it lands inside a build's
anchor-to-verify window and the file is not git-ignored, and only from a non-adversarial writer: the
path is not always-reconciled, so a writer who also rewrites its baseline entry gets a silent `CLEAN`.
That window opens after `/pharn-spec` ran, so a write that steered the current SPEC is never detected
by the run it steered. A change landed by a merge, a pull or a human editor is obeyed as-is.

---

## 2. The residual (named, bounded, not zeroed)

When a downstream LLM stage consumes the **free-text** fields of a finding (`problem`, `evidence`),
"do not execute this as an instruction" becomes a heuristic again (`THREAT-MODEL.md §5`). Fix #1
bounds it — free text never alone gates a guaranteed decision — but does not eliminate it. This is
**not the only** place the trust model is not provable on paper (`THREAT-MODEL.md §5` names the known
ones; another is the suppression channel on its §2 surface 8), and it is the one attempt 0 targets.

---

## 3. Token cost model (known constraints, not solved)

State these honestly; do not pretend tiered loading solves them.

### 3a. Cost scales with fan-out breadth, not change size — and that is backwards

A 3-line typo fix still fans out to every lens, each loading its rules + the diff. Tiered loading
optimizes _within_ one assembly (don't load all rules at once); it does **nothing** about fan-out
_breadth_. `quick-mode` exists as a manual flag; there is no automatic proportionality between
breadth and change size. You pay the most for what there is the most of (small changes). This is
the largest practical token problem and it is not yet solved.

### 3b. Rule overlap × stages

The same rule file (`security.md`) is loaded into context 3–4× across a feature's life (security
griller, secrets-in-code lens, security-review auditors — specified; ships with the guarded surface) — each fresh sub-agent re-pays. Tiered
loading does not cache between stages (fresh contexts naively cannot). Real cost ≈
`diff_size × (validators + verifiers + lenses + auditors) + rule_overlap` — both terms large,
neither touched by tiered loading.

### 3c. Cold-start cliff

First run (cold seam-record, cold memory, cold baseline, full seam-fallback chain for every seam)
is dramatically more expensive than the steady state the design implicitly assumes — and the first
run is exactly when a new user decides whether PHARN is worth the price. The cliff is not modeled.

### 3d. Trust + traceability are not token-free

Fencing scaffolding on every untrusted block + re-stating the finding schema + re-injecting the
constitution is per-call overhead × fan-out. "Free because it's frontmatter" is false at runtime;
it is a real per-leaf tax.

---

## 4. What "good architecture" means here

Per P0, claiming the architecture is "proven good" would be the exact disease this repo
prevents. The honest standard:

- Every _guarantee_ reduces to the floor (`ARCHITECTURE.md §2`) **or** is labeled `advisory`.
- The _known_ holes from red-team are closed or labeled (`THREAT-MODEL.md §4`).
- The four irreducible limits (§1) are named, not hidden, and backstopped.
- The residuals (§2, `THREAT-MODEL.md §5`) are named, and the free-text one is the first thing the
  experiment tests.

"Good" = known holes closed or labeled, and limits honest. **Not** "no holes." The unknowns are
discovered by building and measuring, not by more review.

---

## 5. Observability is interrogated at plan time only

The `observability` griller (`pharn/pharn-pipeline/grillers/observability/`) reads **the PLAN** and
nothing else. Its scanner, `pharn/floor/scan-plan-observability.mjs`, is one of five `scan-plan-*`
scanners; there is no `scan-code-*` counterpart, and no lens in `pharn/pharn-review/` reads code for
telemetry wiring.

The consequence, stated plainly: **a plan may declare telemetry, pass the grill, and the diff that
results may wire none — with every floor green.** Nothing downstream re-checks the promise against
the code. `/pharn-verify` re-runs the project's own gates; if the project has no telemetry test,
neither does PHARN.

Two reasons this is a limit rather than a gap awaiting a fix:

- **There is no configured sink.** `pharn.config.json` has no telemetry key — the nearest, since
  6.15.0, is `testResults`, which names a test reporter's format, not a sink — and
  `pharn/pharn-contracts/seam-config.md` names no telemetry concept. A
  project cannot tell PHARN what its logger is, so any code-side check must hardcode a name set and
  will misread every custom sink.
- **Absence is not injection-immune the way presence is.** For a concern whose shape is _absence_, a
  scanner hit is GOOD and therefore _suppresses_ — the inverse of `scan-plan-secrets.mjs`. On code,
  masking stops a comment from suppressing, but a real dead `logger.debug()` call still does.

`pharn/floor/scan-code-swallowed-exception.mjs` is the nearest existing check and is not this: it
reads logger calls inside `catch` bodies with **inverted polarity** — logging there is evidence the
error was _swallowed_. A catch that rethrows and emits nothing is CLEAN to every check PHARN ships.

Reopens when a real failure surfaces it (P7) — a dogfood or eval run where a plan-declared signal
was absent from the built code — or when a sink becomes declarable.

---

## 6. The write guards cover one tool surface; `Bash` is outside it

The `PreToolUse` matcher wired in `.claude/settings.json` is `Write|Edit|MultiEdit|NotebookEdit`, and
both hooks re-test that same set in their own code (the `isWrite` test in each of `enforce-writes-scope.cjs` and
`protect-trusted-paths.cjs`). A write issued through the **`Bash`** tool therefore never reaches
either hook. Probed rather than read off the wiring — §1d's quantifier is precisely why:

| payload                                                       | hook                        | verdict                   |
| ------------------------------------------------------------- | --------------------------- | ------------------------- |
| `{"tool_name":"Bash",…{"command":"printf x >> LIMITS.md"}}`   | `protect-trusted-paths.cjs` | **exit 0** — not denied   |
| `{"tool_name":"Bash",…{"command":"printf x >> README.md"}}`   | `enforce-writes-scope.cjs`  | **exit 0** — not denied   |
| `{"tool_name":"Edit","tool_input":{"file_path":"LIMITS.md"}}` | `protect-trusted-paths.cjs` | exit 2 — denied (control) |

- **Struck claim:** "the trusted docs are write-protected", "`writes:` is enforced", or "canon cannot be
  written", stated without a tool-surface qualifier. Each is true of `Write`/`Edit`/`MultiEdit`/
  `NotebookEdit` and false of `Bash` — including for **this file**, which the probe above reaches.
- **True statement:** a `Bash` write is **not denied**, and is **not detected at the time it happens**. No
  `PostToolUse` hook is wired (`grep -c PostToolUse .claude/settings.json` → `0`), so nothing observes
  the write, and no record of it exists to reconcile later.
- **It IS detected AFTERWARDS, as of `SKILLS_VERSION` 4.0.0 — and detection is strictly weaker than
  prevention.** `/pharn-*build` anchors a content-hash baseline and `/pharn-*verify` runs
  `pharn/floor/check-bash-reconcile.mjs`, which re-hashes the tree and asks the **live guards**, by
  executing them, whether each changed path would have been denied. Denied means the `reconcile` gate
  fails, so the verify verdict is `FAIL`. **The supported claim is exactly "a write to a path the active
  scope would have denied is detected and fails the stage" — never "Bash writes are prevented."** Four
  bounds, all in `pharn/pharn-contracts/reconciliation-record.md`: ignored paths are outside the
  reconciled set; the window is anchor-to-verify; the model is **one worktree per session** (two sessions
  sharing a tree share `.pharn/`, so a second session's writes can surface as this one's escape —
  [[L38]], which this inherits and cannot fix); and there is **no attribution** — it reports *what*,
  never *who*.
- **DELETING it is loud; FORGING it is silent — and that bounds the whole claim.** The baseline lives
  under `.pharn/`, which `Bash` reaches, and nothing authenticates it. Deleting it does not yield a quiet
  green: `/pharn-*verify` passes `--require-baseline`, which makes an absent baseline `INCONCLUSIVE`, and
  the always-reconciled control surface (`.claude/hooks/*`, `.claude/settings*.json`, `pharn/floor/*`,
  `.dev/floor/*`) is compared against **committed blob ids** rather than against the baseline, so that
  half resists a determined writer. But for an **ordinary** path the baseline IS the reference, so a
  writer who edits a denied file **and** rewrites that file's baseline entry obtains a silent `CLEAN` —
  no escape, no warning. **Therefore the guarantee is NON-ADVERSARIAL detection:** it catches tooling
  that escapes its scope — a formatter, a generator, a script, a mistake, which is the entire population
  of the failures [[L19]] and [[L20]] recorded — and it does **not** catch an attacker. "The detector
  cannot be disabled" is **struck**; "it cannot be disabled quietly" is **struck for ordinary paths** and
  true only for the control surface. Closing it needs authenticated state outside the worktree — the same
  harness-layer category as the OS sandbox below, and just as absent.
- **Two further bounds, stated rather than solved.** (1) `/pharn-*verify` runs the **worktree** copy of
  the checker through `Bash`, so a modified checker can print `CLEAN` without reconciling anything;
  `pharn/floor/` is always-reconciled, which means a modified checker is caught **by itself**, and that
  is circular rather than a guarantee. (2) The anchor is a `Bash` step ([[L19]]), so a run that **skips**
  it does not reliably fail — `--require-baseline` is satisfied by whatever earlier epoch is still on
  disk, and the reconciliation then ranges over the wrong window. Only a tree that has **never** anchored
  yields `INCONCLUSIVE`.
- **No shell command is ever parsed, and that is a design constraint rather than an omission.** Shell
  parsing is undecidable and a verb denylist is a heuristic, which P0 forbids labelling a guarantee. The
  reconciler compares hashes and paths, so `sed -i`, a here-doc, `node -e`, a Makefile target and a
  compiled binary are equally visible to it, and none is special-cased.
- **Older partial backstop, advisory and still present.** `pharn/floor/check-regress.mjs scope` exits 1 on a changed
  path the plan's `## Files` did not declare (since 6.17.0 `/pharn-regress` also declares
  `AC-TESTS.md`'s), and before 4.0.0 was the only thing in the tree that could surface such a
  write after the fact. Four bounds, every one stated in that checker's own header: it fires only if
  `/pharn-regress` runs; it compares _changed since base_, not _written by the build_; it carries
  closed-enum exemptions for the pipeline's own artifacts; and a plan that edits its own `## Files`
  (or its `AC-TESTS.md`) defeats it. A smoke alarm, never the guard.
- **The only true prevention is OS-level sandboxing of the `Bash` process** — a filesystem jail, a
  read-only mount, or an equivalent harness-layer control that makes the write fail before any hook
  would be consulted. PHARN does **not** implement it, and cannot: exactly like §1d's out-of-band
  approval signal, it is **harness-layer, environment-dependent, and not expressible in markdown
  methodology**. Until an environment supplies it, this stays a named limit, not a guarantee.

**Why this is not one of §1's four irreducible limits.** It _is_ reducible — the sandbox above reduces
it — just not by anything this repository can ship. §1's four cannot be reduced at all, which is what
"irreducible" means there; folding this one in would dilute that word.

**Detection did not close this limit, and must not be read as having closed it.** A detected write has
already happened: the reconciler reports, it never reverts, and rollback is explicitly out of scope
(nothing captures pre-write content, and a revert is itself a write). What changed in 4.0.0 is that the
write stops being **silent** — it costs a red stage instead of nothing. The distance between "nobody can
do this" and "somebody will notice this happened" is the distance between a prevention and a detection,
and this section names which side PHARN is on.
<!-- §7 was drafted in .dev/features/hook-cwd-anchoring and applied by a human (SKILLS_VERSION 6.1.0). -->

---

## 7. The write guards act only when Claude Code starts them, and judge the tree Claude is in

Every write-guard claim in this file, and `THREAT-MODEL.md §4` items 2 and 7, holds only while both
`PreToolUse` hooks actually **run**. Claude Code runs a command hook in Claude's **current** directory, and
treats a hook that exits with anything other than 0 or 2 — including one whose script cannot be found — as a
non-blocking error. Until `SKILLS_VERSION` 6.1.0 the shipped wiring was a relative `node .claude/hooks/…`,
so after any persisted `cd` into a subdirectory **both guards silently stopped running**. Probed rather than
read off the wiring:

| hook command run from               | payload          | exit                                             |
| ----------------------------------- | ---------------- | ------------------------------------------------ |
| `pharn/pharn-core`, relative wiring | `Edit LIMITS.md` | **1** — `Cannot find module`; the write proceeds |
| repo root, relative wiring          | `Edit LIMITS.md` | 2 — denied                                       |

6.1.0 anchors both commands on `${CLAUDE_PROJECT_DIR}`. The bounds that remain:

- **A guard that cannot start, or that times out, still does not block.** That is Claude Code's documented
  behaviour, and no hook can change it.
- **The fix reaches an install only through its own `settings.json`.** `pharn update` never touches that
  file, so an install upgraded without editing it keeps the relative form and stays fail-open from every
  other directory. Upgrade the hooks first, then the two commands; roll back in the reverse order.
- **"Current directory" is the hook process's.** When Claude's own directory no longer exists, Claude Code
  runs hooks from the session-start directory, the project root, home or temp, and the guards judge that
  directory instead.
- **A project path containing `"`, `` ` ``, `$` or `\` is unsupported.** The placeholder is substituted into
  a shell command, where such a character can make the command mis-expand — the guard then does not start —
  or run text taken from the directory name.
- **Jurisdiction is the git working tree that contains Claude's current directory**, or `CLAUDE_PROJECT_DIR`
  when the walk reaches that first. A session cannot write another worktree by path: that write is denied,
  not unguarded. A launch-checkout session writing into a nested `.claude/worktrees/<name>/` is judged by
  its own writes-scope, which could name that worktree's hooks if a plan declared them.
- **A `.git` entry is trusted as a boundary.** Tool writes to git metadata — any `.git` path segment under a
  guarded root — are denied, because those entries decide jurisdiction. A `Bash` write still reaches them
  (§6), and re-pointing a worktree's `.git` through `Bash` removes the trusted-file guard from that worktree.
- **A PHARN install at a subpath of a repository, entered through a worktree of that repository**, reads a
  different scope record than its setter wrote, and falls back to the default-safe-set — and, because that
  root carries no `skillsVersion` of its own, it keeps the fail-closed default outside a run as well:
  friction, not a hole.
- **In an installed project, `enforce-writes-scope.cjs` is fail-closed only while PHARN is working
  (6.24.0).** With no scope set and no open `/pharn-ship`, `/pharn-loop` or `/pharn-review` run, it denies
  PHARN's installed surface — `pharn/**` except `pharn/features/**`, `.claude/**` and `pharn.config.json`,
  matched case-folded, with the `pharn/features/` exception matched as written, so a case or trailing-dot
  variant of it is denied — plus its own input `.pharn/writes-scope.json` and, on a system whose separator
  is `/`, any path containing a backslash: there a backslash is part of a file name, while the guards' path
  folding reads it as a separator. It allows every other path inside the project, including the files
  Claude Code loads at session start (`CLAUDE.md`, `AGENTS.md`, `.mcp.json`), so a write made outside a run
  can shape later runs. `protect-trusted-paths.cjs` is unchanged and still denies its own set in every
  posture.
- **Outside the project, that permissive default allows exactly two places (6.24.0, the maintainer's
  GATE-2 decision).** A path under Claude Code's memory folders — `<claude-config-dir>/projects/*/memory/**`,
  where the config dir is `$CLAUDE_CONFIG_DIR` when set, else `~/.claude` — or under a temp root, the OS
  temp directory (`os.tmpdir()`, which honours `$TMPDIR`) or `/tmp`, and never one inside another git
  tree. Every other out-of-project path stays denied, as every out-of-project path was in every posture
  before 6.24.0: dotfiles, `~/.ssh`, `~/.claude/settings*.json`, `~/.claude.json`, `~/.claude/hooks/`,
  LaunchAgents. The two roots are read from the hook's environment, so an environment that points
  `CLAUDE_CONFIG_DIR`, `HOME` or `TMPDIR` at a broad directory widens them. A different spelling of the
  project's own path is never an out-of-project path: a path that matches the project's once letter case,
  Unicode form and trailing dots/spaces are ignored reaches the project's own files on a case-insensitive
  volume, so it is denied as the project's own (re-review R1) — and so is a sibling directory named like
  the project plus a trailing dot, although on APFS that is another directory: an over-block.
- **A run is open while `.pharn/<pharn-loop|pharn-ship|pharn-review>/<name>/active.json` exists with a
  modification time within 24 h**, or while one of those three state directories is present but is not a
  readable directory — a file planted there holds the tree fail-closed until someone removes it. The
  markers are written and removed through `Bash` (§6). `/pharn-ship`, `/pharn-review` and `/pharn-loop`
  stop when opening their marker fails (the loop also when its pre-run snapshot does), but a run that
  skips the step is unguarded between its stages, a crashed run's marker
  keeps every session in the tree fail-closed for up to 24 h unless it is closed, and `touch` extends it.
  The posture needs `skillsVersion` at the root the guard judges. A malformed `.pharn/writes-scope.json`
  denies every write in an installed project.
- **Every write is judged at every target it can reach (6.24.0), in every posture.** The guard resolves a
  path both the way `path.resolve()` does and the way the filesystem does — reading each existing
  directory's on-disk spelling, following a dangling symlink to the target it names, and applying `..` to
  a symlink's real parent — and denies the write if either target is denied. In a dev checkout or an
  unsignalled tree that, and a guard error now denying instead of crashing open, are the only verdict
  changes, and both move toward deny; the first includes a path spelled with another letter case or
  Unicode form than an existing directory, now also judged at that directory's own spelling. A hard link
  is not resolved,
  so the permissive default judges it by its own name; creating one needs `Bash`.
- **Outside a run, an edit the guard allows between a manual `/pharn-build` and `/pharn-verify` is still
  judged by `check-bash-reconcile.mjs` against the build's recorded scope**, and reads as an escape, as an
  editor edit does.
- **The `/pharn-loop` Stop guard acts only when Claude Code starts it, and it fails OPEN.**
  `require-loop-record.cjs` refuses a turn end, at most three times per run, while an unattended loop
  run open in this session has no `LOOP.md`. It cannot make a model do work, cannot judge the record,
  and is satisfied by any non-empty file. A hook that cannot start, times out, or crashes lets the turn
  end, which is the safe direction for a guard that ends turns. Its wiring is exec form, so the
  quote-character bound above does not apply to it.

---

## 8. The declared per-stage model configuration is not the executed one

`pharn.config.json`'s `models.stages` block declares a `model` and an `effort` for each product stage,
and `pharn/floor/check-model-config.mjs` holds that block in EQUALITY with the product `/pharn-*`
commands' static `model:` / `effort:` frontmatter, in both directions (the set is that checker's
`PRODUCT_STAGES` map — read it there). That check is real and
it is floor (enum/regex, `ARCHITECTURE.md §2` primitive #3). What it certifies is narrower than the
config's presence suggests.

- **Struck claim:** "PHARN runs each stage on its configured model" — or any reading of a green
  `check-model-config` as evidence that `/pharn-plan` ran on Opus. The checker's own stdout carries the
  disclaimer: `NOTE (P0): this is config↔frontmatter EQUALITY — never proof a stage RAN under that model.`
- **True statement:** two files in this repository agree with each other. Model and effort are applied by
  the Claude Code platform, invisible to any hook, hash or enum, so **no floor primitive in PHARN observes
  what a stage actually ran under**. An agreement check is also structurally blind to both copies being
  wrong together.
- **The block is not a runtime control, and the scope of that statement is exact.** Nothing reads
  `models.stages` at run time to select a model. The files that mention it are the two checkers that
  validate it (`pharn/floor/check-model-config.mjs`, `.dev/floor/check-config.mjs`) and their tests'
  fixtures — a live sweep of the repository, which is weaker than a probe and is stated as such: a
  negative existential is not something executing a check can settle. This is **not** the broader claim
  that `pharn.config.json` is unread — that file **is** read at run time, by
  `.claude/hooks/enforce-writes-scope.cjs` (`skillsVersion`, to choose its posture), by
  `pharn/floor/check-bash-reconcile.mjs` (which copies it into a probe sandbox), and by others since
  (`testResults`, read by `pharn/floor/test-results-core.mjs`, 6.15.0). The block is a source of
  truth the frontmatter is held to, nothing more. PHARN does not attempt to apply a model and fall short;
  it does not attempt it at all.
- **Deleting the block loses the check rather than failing it.** Probed, not reasoned about: a config with
  no `models.stages`, and an absent config file, each exit **0 GREEN by design** — the
  `check-lessons-index` NO_CANON / COLD precedent, the honest normal state of an install that does not use
  the block.
- **Two further bounds are the CHECKER's claims, cited rather than adopted.** They describe Claude Code's
  behaviour and no file in this repository can settle them, so they are not asserted here.
  `pharn/floor/check-model-config.mjs:32-38` states that the override "applies for the rest of the current
  turn" — so a stage invoked as a step inside `/pharn-ship` or `/pharn-loop` runs inside the
  orchestrator's turn and gets no per-stage routing — and that an organization `availableModels` allowlist,
  or auto mode, can decline a value silently. Read them there.

This is a limit, not a gap awaiting a fix. Observing the executed model is platform-level and invisible to
the three floor primitives by the checker's own account; a PHARN-side "fix" would be a fabricated
guarantee, which is the disease P0 exists to prevent. It reopens if the platform ever exposes the executed
model to a hook.

<!-- §8 was drafted in .dev/features/model-routing-limit and applied by a human (SKILLS_VERSION 6.4.1). -->

---

## 9. The Acceptance-Criteria evidence is agreement, not provenance

For a templated SPEC the pipeline carries floor evidence about each Acceptance Criterion
(`pharn/pharn-contracts/ac-tests.md`): a red run shows each criterion's test collected and `failed` before
the build; `AC-TESTS.lock.json` pins the tests, the mapping, the spec pin and the test infrastructure
(content-hash); `check-test-stage.mjs` reads that evidence before the build; and `/pharn-verify`'s AC gate
does not PASS unless each criterion's locked, once-red test `passed` on the head run. Each checker's
verdict is floor (enum membership over the per-test record, content-hash); obeying it is command
discipline, as everywhere (§1d). What the verdicts certify is narrower than "the criteria are met".

- **Struck claim:** "a `PASS` from `/pharn-verify` means every Acceptance Criterion is satisfied" — or any
  reading of the AC gate as evidence about the behaviour rather than about a test's recorded status.
- **True statement:** `passed` and `failed` are the project reporter's words, read from a file the
  project's own test run wrote. PHARN does not re-run or re-judge a test, and does not judge whether a
  test captures its criterion's intent. A test that failed before the build on a typo in its own body
  reads the same as one that failed for the missing behaviour.
- **Agreement, never provenance.** The tests, the reporter config, the `package.json` scripts and
  `pharn.config.json` are agent-editable. `results-exit-contradiction`, the lock and the
  test-infrastructure pin NARROW a forged report and never close it: a self-consistent fabricated lock,
  stamp and results set over the live tree passes. The pin also does not see, among others, a setup file
  a config imports, configuration read from the environment, script chaining, npm's own configuration or
  the runner's version (`pharn/floor/test-infra-core.mjs` states the full list).
- **Weaker and absent evidence are reported, never hidden.** A `spec_kind: test-infra` SPEC gets
  BOOTSTRAP evidence: no test was locked or shown red, and `spec_kind` sits inside the approval pin §1d
  already calls forgeable. A legacy SPEC gets no AC evidence, and verify reports it `not-applicable`.
  What makes a SPEC legacy is the absence of `spec_template`, which the approval pin does not cover, so a
  templated SPEC whose key is removed, with its `AC-TESTS.md` and lock deleted, reads legacy without
  drift. `/pharn-loop` refuses that (`--require-test-first`); under `/pharn-ship` it reaches the human at
  GATE 2 as `ac-tests: not-applicable (legacy spec)`.
- **The test stage runs before the reconcile window.** `/pharn-test` runs before `/pharn-build`'s anchor,
  so its own `Bash` writes are not reconciled (§6); from the anchor on, the lock and the AC tests are
  visible to reconcile.

Closing the provenance gap needs the tests run, and their results captured, where the build cannot
write — harness-layer, the same category as §6's sandbox and §1d's out-of-band approval signal. Like
§6 and §8, this is a limit, not one of §1's four.

<!-- §9 was drafted from .dev/features/verify-ac-gate/PROTECTED-FOLLOWUPS.md (queue item 07) and applied by a human (SKILLS_VERSION 6.20.2). -->
