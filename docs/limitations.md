# PHARN limitations

What PHARN does not do today, and the bounds of what it does. This text moved here unchanged from the root
[`README.md`](../README.md) in 6.65.3, apart from re-based links and the two phrases that pointed at the README's own
layout; the full set of bounds is in [`pharn/LIMITS.md`](../pharn/LIMITS.md), and the guarantees these bounds qualify are in
[`guarantees.md`](guarantees.md).

## Current limitations

PHARN is deliberately narrower than the claims many AI-development tools make.

- **Claude Code only today.** The current shipped integration uses Claude Code commands and hooks.
- **Shell writes are still not PREVENTED — they are now DETECTED, and that is a weaker thing.** The
  `PreToolUse` matcher wired in `.claude/settings.json` is `Write|Edit|MultiEdit|NotebookEdit`, and both
  hooks re-test that set in their own code, so a write issued through `Bash` never reaches either one and
  **is not blocked**. **Every write-guard guarantee in these docs — the trusted-doc denylist, the canon
  denylist, and the writes-scope restriction — is scoped to that tool surface and to no other.** What
  changed is that such a write no longer goes unrecorded: `/pharn-build` anchors a content-hash baseline,
  and `/pharn-verify` runs `check-bash-reconcile.mjs`, which re-hashes the tree and asks the **live
  guards** whether each changed path would have been denied. Denied ⇒ the `reconcile` gate fails and the
  verify verdict is `FAIL` — unless the path's bytes are exactly the upstream bytes HEAD merged in from
  `origin`'s default branch during the window, which reports it as `merged` instead: a merge is not a write, while a
  commit the build makes itself still fails. **The claim is exactly "a write to a path the active scope would have denied
  is detected and fails the stage" — never "Bash writes are prevented."** Four bounds, all in
  [`reconciliation-record.md`](../pharn/pharn-contracts/reconciliation-record.md): git-ignored paths are
  outside the reconciled set; the window is anchor→verify; the model is one worktree per session; and
  there is no attribution — it reports _what_, never _who_. A clean verdict means **no escape was
  detected**, not that none occurred. **And this is accounting, not security.** The baseline is
  unauthenticated state inside the writable tree, so a writer who edits a denied file **and** rewrites
  that file's baseline entry gets a silent clean result. What it reliably catches is a **non-adversarial**
  escape — a formatter, a generator, a script, a mistake, which is the whole population of failures it
  was built for. **Deleting** its state is loud (a missing baseline is `INCONCLUSIVE` at verify) and the
  always-reconciled control surface (`.claude/hooks/*`, `.claude/settings*.json`, `pharn/floor/*`,
  `.dev/floor/*`, the four trusted docs, `CODEOWNERS`, `pharn/spec-template.md` and memory-bank canon,
  including a file added there) is anchored in committed blob ids rather than the baseline, so that half
  resists a determined writer — but **forging** an ordinary path's entry does not. The cost: an uncommitted
  human edit of a trusted doc reads as an escape too, so commit it before running the gates. Two further bounds, stated
  rather than solved: the checker runs from the worktree, so it cannot vouch for its own integrity; and
  the anchor is a shell step, so a run that skips it silently reuses an earlier epoch instead of failing.
  **The only true prevention remains OS-level sandboxing of the `Bash` process, which PHARN does not
  implement** — a harness-layer capability, not something markdown methodology can express, and the same
  category the missing authenticated baseline store falls into. Since 7.1.0 an unattended `/pharn-loop` refuses to
  start without evidence of one (a container marker and none of a fixed list of credentials) unless you pass
  `--accept-host-execution`. That is a refusal, not a sandbox: the evidence comes from the environment, so you, or a
  project's own `.claude/settings.json` `env` block, can fake it; the lists are partial; and the agent's own model
  credential is always present.
- **No shell command is ever parsed, and that is deliberate.** The reconciler compares hashes and paths;
  it never reads a `Bash` command string. Shell parsing is undecidable and a verb denylist would be a
  heuristic, which the constitution forbids labelling a guarantee — so `sed -i`, a here-doc, `node -e`, a
  Makefile target and a compiled binary are all equally visible to it, and none is special-cased.
- **The write-scope guard's fail-closed default does not cover your source — except now, in an installed
  project, only while PHARN is actually working (6.24.0).** Where `enforce-writes-scope.cjs` is wired and
  no scope is active, the posture depends on the tree. In PHARN's own dev repo (`.dev/floor/` present AND
  no `skillsVersion` in `pharn.config.json`) or an unsignalled tree, Claude Code's
  Write/Edit/MultiEdit/NotebookEdit tools may write only `pharn/features/**` (plus, in the dev repo,
  `.dev/features/**` and `pharn/pharn-*/**`) — exactly as before. In an **installed** project
  (`pharn.config.json` carries a non-empty `skillsVersion`), that same narrow default now applies **only
  while a `/pharn-ship`, `/pharn-loop` or `/pharn-review` run is open** — a marker file under
  `pharn/.run/<command>/<name>/active.json`, fresh within 24 h. **Outside an open run, the guard instead denies
  PHARN's own installed surface** — `pharn/**` except `pharn/features/**` and `pharn/.run/**`, `.claude/**` and
  `pharn.config.json`, matched case-folded — plus its own input `pharn/.run/writes-scope.json`, and allows
  every other path inside the project, **including your ordinary source** (`src/app.ts`, `package.json`,
  `README.md`). That includes files Claude Code loads at session start — the project's `CLAUDE.md`,
  `AGENTS.md`, `.mcp.json` — so a write made outside a run can shape later runs. Outside a run a path
  containing a backslash is denied too, because on macOS and Linux a backslash is part of a file name and
  the guards' path folding could otherwise judge a different file than the one written. `pharn/.run/**` stays
  writable in every posture, as before — it is the gitignored
  runtime-state directory the guard bootstraps from, composed into the allow-list unconditionally, so it
  stays writable **even under a set scope**; one path inside it is still denied by name:
  `pharn/.run/writes-scope.json`. **Outside the project** the permissive default allows only three places, each
  narrowed to this project and this session in 6.31.1: **this project's auto-memory folder**
  (`<claude-config-dir>/projects/<key>/memory/**`, where the config dir is `$CLAUDE_CONFIG_DIR` or
  `~/.claude`, for the key of the folder that holds this session's transcript and the key Claude Code derives
  from your repository's main checkout, so a linked-worktree or subdirectory session still reaches its
  memory), **this session's own scratchpad**, and **an ordinary temp path** (under the OS temp directory or
  `/tmp`, but never inside a `claude-<uid>` folder, where every Claude Code session keeps its scratchpad and
  task output, never inside the Claude config directory, and not inside your home directory when that lies
  inside the temp directory). It never allows a path inside another git tree, nor another spelling of the project's own
  path: a different letter case or Unicode form reaches the project's own files on a case-insensitive volume,
  so such a path is denied as the project's own. This allowance is **new in 6.24.0**: before it, every
  out-of-project path was denied, as it still is in every other posture — except this session's own scratchpad,
  which PHARN's dev repo and an unsignalled tree also allow since 6.73.1, under any scope. Every other out-of-project path
  stays denied, including another project's memory folder, your dotfiles, `~/.ssh`,
  `~/.claude/settings.json`, `~/.claude.json` and `~/.claude/hooks/`. ("Another project" means another key:
  two paths that differ only in characters outside `[A-Za-z0-9]` share one key and, in Claude Code too, one
  memory folder.) The main-checkout key mirrors how
  Claude Code names its memory folders, which it does not document; if that changes, the key stops matching
  and those writes are denied rather than widened. `protect-trusted-paths.cjs` still denies its own set (the
  trusted docs, `CODEOWNERS`, the guards' own control surface, your SPEC template) in every posture,
  regardless of any scope — and since 6.31.1 it also judges the file a write actually reaches, so a symlink
  whose name holds a backslash no longer carries a write to one of them past it. A
  **malformed** `pharn/.run/writes-scope.json` now denies **every** write in an installed project, rather than
  falling back to a default. The markers are written and removed through **Bash**: `/pharn-ship`,
  `/pharn-review` and `/pharn-loop` stop when opening theirs fails (the loop also when its pre-run snapshot
  does), but a run that skips the step leaves the install unguarded
  between stages, anything other than a directory at a run-state path (`pharn/.run/pharn-review`, say) holds the
  narrow default until someone removes it, and a crashed run's leftover marker holds the
  narrow default for up to 24 h unless it is closed or ages out. Clearing the scope
  (`set-writes-scope.cjs --clear`, or deleting `pharn/.run/writes-scope.json`) returns to whichever default the
  tree and the open-run state compute; it does **not** by itself re-open your source in the dev/unsignalled
  postures, or during an open install run. To write elsewhere, either set a scope that names those paths
  (`set-writes-scope.cjs --from-plan <PLAN.md>`) — noting that a set scope **replaces** the default rather
  than adding to it — or leave `enforce-writes-scope.cjs` out of `.claude/settings.json`, at the cost of
  `writes:` enforcement.
- **The memory-bank denylist covers the write-tool surface only — Bash still reaches canon.**
  `pharn/THREAT-MODEL.md` treats memory-bank poisoning as the worst persistence vector. As of `3.1.1`
  `.claude/hooks/protect-trusted-paths.cjs` **does** deny `Write`/`Edit`/`MultiEdit`/`NotebookEdit` to
  `pharn/memory-bank/**` and `.dev/memory-bank/**`, and the escape is the writes-scope record's **origin**
  (`set_by`), which `set-writes-scope.cjs` writes from its own **argv** — so **no `writes:` declaration
  and no `PLAN.md` `## Files` entry can grant itself a canon write.** That closes the reported vector: a
  `## Files` entry naming `pharn/memory-bank/lessons-learned.md` is now denied rather than silently allowed.
  **What it does NOT close:** `PreToolUse` hooks never see **Bash**, so an agent holding Bash can still
  append to canon, run the setter with promote-shaped argv, or forge the scope record. No mechanism
  without that hole was found and none is claimed. So "canon cannot be written" stays **struck** — what
  changed is that on the guarded tool surface a canon write now costs a separate, explicit
  act that a build plan cannot cause. Keep reviewing `pharn/memory-bank/**` in diffs like any other file.
- **Model judgment remains model judgment.** Architecture quality, review correctness, severity,
  completeness of intent, and semantic correctness are advisory unless a specific deterministic checker
  covers the claim.
- **Approval is workflow discipline, not proof of a person.** A content hash detects drift after a spec is
  marked approved; it does not prove who marked it approved. Under `/pharn-loop` there is no person at
  all: the model approves and records `approved_by: model`, a marker nothing gates on.
- **Build completeness is filesystem-level.** PHARN can detect that a concrete declared path is missing;
  it cannot prove that an existing path was actually modified or implemented correctly.
- **Prompt injection is not solved.** PHARN narrows which data may influence guaranteed decisions, but it
  does not claim to eliminate prompt injection. That includes skills you install yourself: a
  `.claude/skills/<name>/SKILL.md` reaches product stages as untrusted context, and a hostile one can talk a
  lens out of reporting a real finding, which then never reaches you. That is only partly bounded;
  `pharn/THREAT-MODEL.md` §2 (item 8) and §5 state it in full. Since 6.47.0 a stage reads a body-free catalogue of
  your skills and then only the bodies it judges relevant, plus every skill whose metadata it cannot read
  cleanly. That choice is advisory: a skill with a misleading description can be skipped. A skill reached through
  a `.claude` symlink that leaves the project is not read at all.
- **No verifier/auditor capability ships yet.** `/pharn-verify` uses the shipped floor and project gates;
  the verifier plug-in slot remains empty.
- **Several announced modules are not built.** `pharn-audits`, `pharn-skills-*`, `pharn-stack-*`, and the
  rest of `pharn-core` — the constitution engine, the agnostic rule set, and the memory-bank commands
  beyond promotion. What exists is what the [generated inventory](../README.md#pharn-builds-pharn) lists.
- **Per-stage models are routed for most orchestrated stages, effort is not, and nothing proves what a
  stage ran on.** `pharn.config.json`'s `models.stages` is the source of truth for the eleven product
  commands' `model:` / `effort:` frontmatter, and `pharn/floor/check-model-config.mjs` RED-fails when the
  two disagree — so editing the config is only half the change: update the command frontmatter too, or the
  checker will tell you. Since 6.27.0 `/pharn-ship` and `/pharn-loop` also read the block at run time: each
  stage their routing policy routes runs as a subagent, requested on the model the block resolves for it.
  `/pharn-ship`'s spec stage, every `/pharn-regress` and `/pharn-verify`, and any stage that falls back (no
  config; a pre-0.7.0 block, which `pharn update` with `@pharn-dev/pharn` ≥ 0.7.0 migrates; `inherit`; a full
  model id) run on the session's model, the model of the session running the orchestrator, and the run says
  why. Effort is not routed. A green checker means two files agree, and a route records what was REQUESTED:
  `cost.json` shows the model each request was served, which is evidence, never proof. The full bounds — turn scope, the
  platform veto, and what deleting the block costs — are stated once, in [`pharn/LIMITS.md`](../pharn/LIMITS.md) § 8.
- **A routed stage agent may run in the background, and `/pharn-loop` waits it out; that is handled, not gone.**
  The harness decides how an agent is launched. In the measured runs, Claude Code 2.1.310's interactive CLI launched
  every `/pharn-loop` stage agent in the background, and `stage-agent.mjs finish --budget-ms` waited each one out on
  disk; one `--quick` run completed on PHARN 7.1.1. Not measured: a stage longer than one 570 s wait, the wait's cap,
  whether `TaskStop` can stop an agent left running, other Claude Code versions, and a full loop. The bounds live in
  `pharn/floor/stage-agent-core.mjs` (residual `stage-agent-background`); the run is
  [the measurement](../.dev/measurements/loop-interactive-cli-2026-10-26.md).
- **It is token-hungry by construction.** `/pharn-grill` runs the grillers over your plan and
  `/pharn-review` fans the applicable lenses out to parallel subagents, one per lens family; `/pharn-loop` repeats
  build → regress → verify up to the cap, unattended — each pass runs your suite at HEAD and the verify gates,
  and at the base too unless that evidence can be reused: from an earlier pass of the same run (6.33.0) or, since
  6.49.0, from the run's own entry gates. A verify gate is not re-run when the same run's regress already recorded
  its HEAD result on the same inputs (6.34.0). Every delivery run, quick mode included, also runs your gates once in
  the background at entry (6.42.0), and since 6.49.0 one more test-suite run there. That buys parallel scrutiny and costs tokens accordingly.
  Budget for it, or drive individual stages instead of the loop. Since `6.5.0` a run no longer leaves you
  guessing what it spent: `/pharn-loop` and `/pharn-ship` write `cost.json` and `RUN-REPORT.md` into the
  feature directory, with tokens broken down per stage, iteration and model. That is a measurement, not a
  reduction — it tells you the bill, it does not make the run cheaper. For an actual reduction on a small,
  well-scoped change, `/pharn-ship --quick` (6.25.0) is the manual lever: it drops `/pharn-regress`'s
  base-and-head suite run (its scope check still runs), the plan interrogation, and the briefing/run-report
  renders. `/pharn-loop --quick` (6.28.0) is the unattended one: it drops the same base-and-head run on every
  iteration, where the loop multiplied it, plus the run report (every `/pharn-loop` run skips the plan
  interrogation since 6.45.0). There is no
  automatic proportionality — nothing measures whether a change is "small" — the flag is a person's choice (under
  `/pharn-loop --quick` the model then writes and approves the quick SPEC), and a change too large for it stops (S6c,
  under `/pharn-loop --quick`) or takes the full pipeline.
- **Releases are tagged by CI, and `main` still reaches users.** A `SKILLS_VERSION` bump is tagged `v<SKILLS_VERSION>`
  once its required checks pass on `main`, and `@pharn-dev/pharn` 0.15.0 or newer installs the newest such release by
  default; resolving that release uses `api.github.com`'s unauthenticated limit of 60 requests an hour, and when none
  resolves the installer exits 1 rather than fall back. The `main` channel takes every merge before its checks on
  `main` finish, and records no commit when its GitHub lookup fails; a release install always records the commit its
  tag points at ([`pharn/LIMITS.md §11`](../pharn/LIMITS.md)).

[`pharn/LIMITS.md`](../pharn/LIMITS.md) documents what PHARN does not guarantee.
[`pharn/THREAT-MODEL.md`](../pharn/THREAT-MODEL.md) documents the attack surface and trust assumptions.
