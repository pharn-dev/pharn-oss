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
_breadth_. You pay the most for what there is the most of (small changes). This is
the largest practical token problem and it is not yet solved.

> **The gated manual flag is `/pharn-ship --quick` (6.25.0), and it trades checks for cost.** A human chooses it for
> a `spec_kind: quick` SPEC: one to three acceptance criteria, each verified at `unit` or `integration`. It
> keeps both human gates, the grill's two floor stops, the test-first evidence for those criteria,
> `/pharn-regress`'s scope check (a file the run changed outside the plan's `## Files` still stops the run, within
> the bounds §6 states for that check) and `/pharn-verify` with its AC gate. It leaves out: **the regression
> check** — no regression outside the feature is looked for, because nothing compares base and head; **the
> plan interrogation** — `/pharn-grill --quick` runs its floor stops and no griller; and **`BRIEFING.md` and
> `RUN-REPORT.md`** (`cost.json` is still written). Its ledger outcome is `gate2-quick`, which is not
> `gate2`: `gate2` needs a `pharn-regress` stage-start, which a quick run never writes (the bounds of
> trusting those Bash-written markers are in `pharn-contracts/cost-ledger.md`). The `--quick` flag is read by
> the orchestrating model, so honoring it is advisory; what backs it is the SPEC's approved, pinned
> `spec_kind: quick`. Nothing measures whether a change is small: the kind and the flag are what a person
> chose, and a quick SPEC run without the flag takes the full pipeline. There is still no AUTOMATIC
> proportionality, and `/pharn-review`'s lens fan-out is unchanged.
>
> **The unattended one is `/pharn-loop --quick` (6.28.0), and nobody is told the trade before it runs.** The model
> writes and approves the `spec_kind: quick` SPEC itself (`approved_by: model`), and `check-loop.mjs` decides every
> stop over `/pharn-verify`'s verdict alone. The decision's mode is that SPEC's pinned kind, never a flag, so a full
> SPEC still needs a regression verdict. It keeps the grill's floor stops, the test-first evidence, the scope check
> (within the bounds §6 states for that check; it leaves no record, so nothing after its iteration re-checks it) and
> the freshness check (a quick run's verify evidence must still describe the live tree and reproduce from its
> stamp). It leaves out the regression check and `RUN-REPORT.md` (`cost.json` is still written). Like every
> `/pharn-loop` run since 6.45.0, it does not interrogate the plan: the grill runs its two floor stops only. Its
> green stop is `STOP_GREEN_QUICK`, which is not `STOP_GREEN` and claims no regression check; the
> record, the commit message and the summary name the mode after the run. The person who typed `--quick` chose it,
> and the model's reading of that flag is advisory, as for `/pharn-ship`.

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

### 3e. The always-loaded instruction set is a model, and its growth gate measures that model

`pharn/floor/check-instruction-files.mjs` models which project files Claude Code attaches to every
session: the root `CLAUDE.md` / `.claude/CLAUDE.md` (else `AGENTS.md`), their `@path` imports, and the
`.claude/rules/**/*.md` files without a `paths:` scope. The model comes from Claude Code's published
memory documentation plus the assumptions its header labels. The harness's actual set may differ in
either direction (versions, settings, `claudeMdExcludes`, HTML-comment stripping, the 4 MiB skip).

- **Struck claim:** "`instruction-growth` PASS means the session prefix did not grow."
- **True statement:** `--growth` (the `/pharn-verify` gate `instruction-growth`, 6.38.0) is a floor
  verdict over that model: the bytes added to the modelled set since a base commit, against
  `budget.instructionGrowthBytes` read from `pharn.config.json` at that base (default 2048). It measures
  changed-since-base, not written-by-the-build; with a dirty working tree only uncommitted growth is
  seen; and a per-change budget does not bound growth accumulated across changes that each stay under it.
- **Under-count routes, known so far and never a complete list:** a catch-all `paths:` pattern spelled
  another way, a YAML error the line reader does not recognise beside `paths:`, an always-loaded file
  made git-ignored, and an uncommitted edit inside an initialised submodule.
- **Not counted:** git-ignored files, `CLAUDE.local.md`, subdirectory `CLAUDE.md` files, directories
  above the project root, `~/.claude/**`, managed policy files, and auto memory.
- `--report` is advisory, and its token figure is bytes/4 (§1c). Whether `pharn update` preserves the
  `budget` key in `pharn.config.json` is not verifiable from this repository; a dropped key falls back to
  the default, which is the strict direction.

### 3f. What goes into an instruction file is a planning choice, and the rule that steers it is advisory

`/pharn-plan` carries an advisory planning rule (6.38.1): a feature's narrative, rationale, history and limits stay
in its record, and a plan names an instruction file only for a standing convention every future session must obey.
Nothing deterministic stops a plan from naming `CLAUDE.md`, and no behavioural eval covers `/pharn-plan`. The
deterministic backstop is §3e's `instruction-growth` gate at `/pharn-verify`. It bounds the bytes one change adds to
the modelled set, never what a plan names, and never growth accumulated across changes that each stay under budget.

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
results may wire none — with every floor green.** Under an unattended `/pharn-loop` (since 6.45.0) the grill runs
only the observability scanner, not the griller's judgment, so there the plan's telemetry is not judged at all.
Nothing downstream re-checks the promise against the code. `/pharn-verify` runs the project's own discovered gates,
less any the project excludes in `pharn.config.json` `gates.exclude` (6.36.0); a gate result can also be reused from
the same delivery run's `/pharn-regress` (6.34.0). If the project has no telemetry test, or excludes the gate that
runs it, neither does PHARN.

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
  write after the fact. Five bounds, every one stated in that checker's own header or in
  `pharn/floor/pre-run-snapshot.mjs`'s: it fires only if
  `/pharn-regress` runs, or when `check-quick-scope.mjs` (6.28.0) applies that rule — for `/pharn-ship --quick`'s
  item 7 and for every `/pharn-loop --quick` iteration — to inputs it builds by code exactly as that stage's script
  does, without the rest of that stage; it compares _changed since base_, not _written by the build_; it carries
  closed-enum exemptions for the pipeline's own artifacts; a plan that edits its own `## Files`
  (or its `AC-TESTS.md`) defeats it; and, inside a `/pharn-loop` or `/pharn-ship` run (6.37.0), a path already
  changed when the run began whose bytes still equal the run's pre-run snapshot is reported, not counted — so a build
  that writes such a path back to its pre-run bytes is not seen, a path an earlier run escaped with is pre-run state
  for a re-run (reported, not refused), and the snapshot, kept in the git dir out of the write tools' reach, can be
  forged through `Bash`. A smoke alarm, never the guard.
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
  can shape later runs. `protect-trusted-paths.cjs` still denies its own set in every posture.
- **Outside the project, that permissive default allows only this project's auto-memory folder, this
  session's own scratchpad, and ordinary temp paths** — never a path inside another git tree:
  - **This project's auto-memory folder**, `<claude-config-dir>/projects/<key>/memory/**`, where the config
    dir is `$CLAUDE_CONFIG_DIR` when set, else `~/.claude`, for two keys only: the project folder that holds
    this session's transcript, read from the `transcript_path` Claude Code passes every hook, and the key
    Claude Code derives for auto-memory from the repository's main checkout, so a session in a linked
    worktree or in a subdirectory still reaches its project's memory. **That second key mirrors an
    undocumented Claude Code derivation** — a worktree's `.git` file, its `commondir`, and a `gitdir`
    back-pointer that must name this worktree, with the path encoded by turning every character outside
    `[A-Za-z0-9]` into `-` — **and it fails closed if that derivation drifts**: a check that does not hold, or
    a path over 200 characters (Claude Code hashes those, and the hash is not copied), grants nothing.
    Another project's memory folder stays denied: Claude Code loads it into that project's later sessions.
    A project here is a key: two paths that differ only in characters outside `[A-Za-z0-9]` (`…/a-b` and
    `…/a/b`) encode to one key, and Claude Code gives them one memory folder, so the guard allows it to both.
  - **This session's own scratchpad**: the `scratchpad_dir` Claude Code passes, and only in the shape Claude
    Code writes, `<temp root>/claude-<uid>/<key>/<session_id>/scratchpad`, for the payload's own `session_id`.
  - **An ordinary temp path**: under the OS temp directory (`os.tmpdir()`, which honours `$TMPDIR`) or
    `/tmp`, but never with a `claude-<uid>` folder anywhere in its path — Claude Code's per-user state, which
    holds every session's scratchpad and task output — never inside the Claude config directory, whichever of
    it and the temp root contains the other, and never inside the home directory when that lies inside the
    temp root. Claude Code's other temp paths outside a `claude-<uid>` folder (`cc-socks`,
    `claude-mcp-browser-bridge-*`, the desktop app's `ShipIt` update folders) are ordinary temp paths to this rule.
  - Every other out-of-project path stays denied: another project's memory, dotfiles, `~/.ssh`,
    `~/.claude/settings*.json`, `~/.claude.json`, `~/.claude/hooks/`, LaunchAgents.
  - **Fail-closed, and what that costs.** A payload field that is absent or malformed makes the place that
    needs it grant nothing, never a wider one; so does a path field not in normal form (not absolute, or with a
    `.` or `..` segment). So a Claude Code that sends no `scratchpad_dir` gets no
    scratchpad allowance; a PHARN install at a subpath of a repository, whose root holds no `.git`, gets
    nothing from the main-checkout key; and a custom `autoMemoryDirectory`, or a memory directory Claude Code
    keys some other way, is not recognised. The payload fields are set by the harness,
    not the model — a tool call sets only its own input — and the guard checks their shape; it cannot verify
    they are Claude Code's own. The roots are read from the hook's environment, so an environment that points
    `CLAUDE_CONFIG_DIR`, `HOME` or `TMPDIR` at a broad directory widens them.
  - A different spelling of the project's own path is never an out-of-project path: a path that matches the
    project's once letter case, Unicode form and trailing dots/spaces are ignored reaches the project's own
    files on a case-insensitive volume, so it is denied as the project's own (re-review R1) — and so is a
    sibling directory named like the project plus a trailing dot, although on APFS that is another
    directory: an over-block.
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
  `protect-trusted-paths.cjs` now judges that second reading too, after its own: on a system whose separator
  is `/` a backslash is part of a file name, so a symlink named with one — `s\x` pointing at the project
  root, say — no longer carries a write to a trusted doc, or to canon, past it. Its canon exception never
  authorizes a target whose path holds a backslash, and a link inside canon is judged at the canon file it
  reaches. Every verdict this changes moves toward deny, and every write it denied before is denied with the
  same message.
- **Outside a run, an edit the guard allows between a manual `/pharn-build` and `/pharn-verify` is still
  judged by `check-bash-reconcile.mjs` against the build's recorded scope**, and reads as an escape, as an
  editor edit does.
- **The `/pharn-loop` Stop guard acts only when Claude Code starts it, and it fails OPEN.**
  `require-loop-record.cjs` refuses a turn end, at most three times per run, while an unattended loop
  run open in this session has no `LOOP.md`. It cannot make a model do work, cannot judge the record,
  and is satisfied by any non-empty file. A hook that cannot start, times out, or crashes lets the turn
  end, which is the safe direction for a guard that ends turns. Its wiring is exec form, so the
  quote-character bound above does not apply to it.

<!-- §7's out-of-project and every-target bullets were revised in .dev/features/write-guard-narrowing and applied by a human. -->

---

## 8. The declared per-stage model configuration is not the executed one

`pharn.config.json`'s `models.stages` block declares a `model` and an `effort` for each product stage.
Each thing that reads it answers a different question:

- **The agreement check.** `pharn/floor/check-model-config.mjs` holds the block in EQUALITY with the product
  `/pharn-*` commands' static `model:` / `effort:` frontmatter, in both directions (the set is that checker's
  `PRODUCT_STAGES` map — read it there). The frontmatter is what a stage runs under when a person invokes it
  directly. That check is real and it is floor (enum/regex, `ARCHITECTURE.md §2` primitive #3).
- **Stage routing (6.27.0).** `/pharn-ship` and `/pharn-loop` run each stage their routing policy routes as a
  Claude Code subagent, and `pharn/floor/stage-agent.mjs` reads the block at run time, through that checker's
  `resolve`, to choose the model that subagent is requested on. The DECISION is floor (a closed policy table
  and the checker's own exit codes, tested); APPLYING it is the platform's, and the orchestrating model passes
  the model to the Agent call — advisory.

What either certifies is narrower than the config's presence suggests.

- **Struck claim:** "PHARN runs each stage on its configured model" — or any reading of a green
  `check-model-config`, or of an `agent:<alias>` route on a marker, as evidence that `/pharn-plan` ran on
  Opus. The checker's own stdout carries the disclaimer: `NOTE (P0): this is config↔frontmatter EQUALITY —
  never proof a stage RAN under that model.`
- **True statement:** for a routed stage PHARN REQUESTS the configured model, and the stage's marker records
  that request; `cost.json` records the model each request was SERVED — evidence from a transcript format the
  platform does not document, not a floor primitive. Model and effort are applied by the Claude Code
  platform, invisible to any hook, hash or enum, so **no floor primitive in PHARN observes what a stage
  actually ran under**. An agreement check is also structurally blind to both copies being wrong together.
- **Effort is not routed.** The Agent tool takes no effort, so a routed stage runs at the effort it inherits;
  the declared `effort` reaches a stage only when a person invokes the stage command directly.
- **What is not routed runs on the session's model, and the run records why.** A stage the routing policy
  keeps inline, a stage that falls back (the inline reasons `pharn/floor/stage-agent-core.mjs`'s header
  lists), and the orchestrators themselves all run on the model of the session running the orchestrator, not
  on one chosen for the stage. A stage that could have been routed records its reason on its marker; the
  policy's own inline stages are named as such in the run's summary.
- **Deleting the block loses routing as well as the check.** Probed, not reasoned about: a config with no
  `models.stages`, and an absent config file, each exit **0 GREEN by design** in the checker — the
  `check-lessons-index` NO_CANON / COLD precedent, the honest normal state of an install that does not use
  the block — and every stage that could have been routed then runs inline, recording `no-stages` or
  `no-config`.
- **Two further bounds are the CHECKER's claims, cited rather than adopted.** They describe Claude Code's
  behaviour and no file in this repository can settle them, so they are not asserted here.
  `pharn/floor/check-model-config.mjs`'s header states, under "TURN SCOPE", that a command's model override
  "applies for the rest of the current turn" — so a stage run inline as a step inside `/pharn-ship` or
  `/pharn-loop` runs inside the orchestrator's turn and does not get its frontmatter model — and, under
  "PLATFORM VETO", that an organization `availableModels` allowlist, or auto mode, can decline a value
  silently. What a declined model does to an Agent call is not documented either. Read them there.

This is a limit, not a gap awaiting a fix. Observing the executed model is platform-level and invisible to
the three floor primitives by the checker's own account; a PHARN-side "fix" would be a fabricated
guarantee, which is the disease P0 exists to prevent. It reopens if the platform ever exposes the executed
model to a hook.

<!-- §8 was drafted in .dev/features/model-routing-limit and applied by a human (SKILLS_VERSION 6.4.1). -->
<!-- §8 was revised in .dev/features/stage-model-routing and applied by a human (SKILLS_VERSION 6.27.0). -->

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
