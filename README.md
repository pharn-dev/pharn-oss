<div align="center">

<p align="center">
  <img src="./docs/assets/pharn-logo.svg" alt="Pharn OSS" width="96">
</p>

<h1 align="center">Pharn OSS</h1>

**Get features shipped right with Claude Code.**

PHARN takes one feature through `spec → plan → grill → test → build → regress → verify → ship`: the intent
you approve, a plan with the files the build may touch, a failing test for each acceptance criterion before
any code exists, and your project's gates run before the final decision is yours.

Every step stays in Git: the spec, the plan, the declared files, the checks that ran and the handoff at the
shipping gate are committed Markdown, so months later you can answer "what was done and why?".

It is open-source methodology, not a black box: Claude Code commands, readable Markdown artifacts,
deterministic hooks, stdlib-only floor checkers, grillers, and review lenses that live in your
repository. PHARN is strict about one thing: claims backed by deterministic checks are named as such;
model or human judgment remains advisory.

```bash
npx @pharn-dev/pharn@latest init
```

[![pharn](https://img.shields.io/badge/pharn-6.68.1-blue)](./CHANGELOG.md)
[![License: Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-green)](./LICENSE)
[![CI](https://github.com/pharn-dev/pharn-oss/actions/workflows/ci.yml/badge.svg)](https://github.com/pharn-dev/pharn-oss/actions/workflows/ci.yml)
[![CodeQL](https://github.com/pharn-dev/pharn-oss/actions/workflows/codeql.yml/badge.svg)](https://github.com/pharn-dev/pharn-oss/actions/workflows/codeql.yml)
[![Floor](https://github.com/pharn-dev/pharn-oss/actions/workflows/floor.yml/badge.svg)](https://github.com/pharn-dev/pharn-oss/actions/workflows/floor.yml)
[![Secrets](https://github.com/pharn-dev/pharn-oss/actions/workflows/gitleaks.yml/badge.svg)](https://github.com/pharn-dev/pharn-oss/actions/workflows/gitleaks.yml)
[![Built for Claude Code](https://img.shields.io/badge/built%20for-Claude%20Code-555)](https://claude.com/claude-code)

</div>

> **Status:** Ready to install and use with Claude Code today. Active development continues;
> functionality that has not shipped yet is explicitly labeled.

---

## Contents

- [What PHARN is](#what-pharn-is)
- [Why it exists](#why-it-exists)
- [Quick start](#quick-start)
- [What gets installed](#what-gets-installed)
- [Commands](#commands)
- [Guaranteed vs advisory](#guaranteed-vs-advisory)
- [More documentation](#more-documentation)
- [PHARN builds PHARN](#pharn-builds-pharn)
- [Design docs](#design-docs)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

---

## What PHARN is

PHARN is an open-source workflow layer for teams using AI agents to change real code. It gives each
increment a trail in Git:

- `SPEC.md` — the human-readable intent PHARN asks you to approve before implementation (or, under the
  unattended `/pharn-loop`, approves for you and records as the model's approval).
- `PLAN.md` — the agent's implementation plan and declared write scope.
- `GRILL.md` — pre-build interrogation of the plan (a quick run's `GRILL.md` — `/pharn-ship --quick` or
  `/pharn-loop --quick` — and every `/pharn-loop` run's, since 6.45.0, records its two floor stops, plus in a full loop
  the deterministic plan scans, and explicitly did not interrogate — see `--quick` under [Quick start](#quick-start)).
- `AC-TESTS.md`, `AC-TESTS.lock.json` — which test covers each acceptance criterion, and the pinned evidence
  that each of those tests failed before the build.
- `BUILD.md`, `REGRESSION.md`, `VERIFY.md`, `SHIP.md` — what changed, what ran, what passed, what did
  not, and where the run stopped (a quick run writes no `REGRESSION.md`: it never runs `/pharn-regress`; an
  unattended loop writes `LOOP.md` instead of `SHIP.md`, and a quick loop's `LOOP.md` records `mode: quick`).
- `cost.json`, `RUN-REPORT.md` — what the run cost and what it did, written by `/pharn-loop` at every
  stop and by `/pharn-ship` at every exit that ends a run. The first is machine-readable token counts
  per stage, iteration and model; the second is the human-readable view over it. Tokens only — PHARN
  ships no price table, so money is your own list price applied to those counts. (A quick run keeps
  `cost.json` but writes no `RUN-REPORT.md`.)

The project is intentionally small-surface: prompts and contracts in Markdown, plus deterministic Node
helpers. There is no hidden service in this repository and no proprietary rule engine needed to inspect
what PHARN is doing.

PHARN is **not** a correctness oracle, a security guarantee, or a replacement for tests and code review.
It preserves intent, narrows some agent write behavior, runs focused plan/code scrutiny, and labels the
boundary between deterministic checks and judgment.

---

## Why it exists

AI made code cheaper to produce. It did not make code cheaper to understand six weeks later.

The expensive questions moved upstream and downstream:

- What did we ask the agent to build?
- Which constraints shaped the plan?
- Which files was the agent supposed to edit?
- What did the workflow actually check?
- Which findings were deterministic, and which were model judgment?
- What should a reviewer, maintainer, or future incident responder trust?

PHARN puts those answers in the repo, where normal engineering tools can diff, review, and preserve
them. The first goal is a feature that ships right; the second is that how it got there can be inspected
later, not taken on trust.

---

## Quick start

PHARN runs on [Claude Code](https://claude.com/claude-code). The `@pharn-dev/pharn` installer requires
Node 24.2 or newer (the installer refuses older). The deterministic floor checkers this repo ships (`pharn/floor/*.mjs`, invoked by the
`/pharn-*` stages) require **Node 24.2 or newer**: their CLI entry points gate on `import.meta.main`, which
Node added in 22.18 / 24.2. Since 6.50.0 every guarded tool refuses an older Node: it prints the required version
and exits `2` instead of exiting `0` without running its checks. CI and local contributor gates use Node 24. In your project root:

```bash
npx @pharn-dev/pharn@latest init
```

Then open Claude Code in the same project and run the full loop:

```text
/pharn-loop implement password reset with a one-time token
```

`/pharn-loop` runs spec → plan → grill → test → build → regress → verify **unattended**. The model approves its
own spec, checks the plan with the grill's two floor stops and its deterministic plan scans (no interrogation and no
model-driven griller, since 6.45.0 — no stage would read them before the build), writes each acceptance criterion's test and shows it fails before any code exists, repeats build →
regress → verify until a deterministic stop — green, the `--max-iter` cap, or a
result it must not retry — commits a green result to a new local branch (never pushed or merged), and
ends with a summary of what was done. While the spec, plan and grill stages work, it runs your project's gates once
in the background on the tree it started from (6.42.0). If one is already red, the run stops before `/pharn-test`
writes anything (`blocked: gates-red-at-entry`); pass `--allow-red-entry` when fixing that gate is the feature.
`/pharn-ship` runs the same check and asks you whether to stop or continue. When it reaches a point that needs a human decision, it stops and
says what it needs instead of guessing. On any stop other than a committed green result it reverts its
own spec approval — a procedural step, so an aborted run can skip it. Start it outside plan mode: in plan mode it stops
at once and asks you nothing (6.58.0). It pre-approves its own commands for the run, but its stage agents run your
project's gates under your session's permission mode, so when nobody will be watching, use one that does not prompt
for them (auto mode, or allow rules).

The test stage needs your project's test runner and its per-test results: a `test` script (and a `test:e2e` or
`e2e` script for end-to-end criteria) whose reporter writes JSON to the path PHARN passes
([Per-test results](./docs/pipeline.md#per-test-results)). Without them the run stops with `blocked: no-test-runner` and suggests a
setup increment to run first. The same split applies when a feature must change the runner itself: its config at
the project root, its test script, or its results format. PHARN pins those before the build, so plan that change as
its own setup increment first, run through `/pharn-ship`. `/pharn-plan` refuses a plan that names a root runner
config.

To approve the spec yourself and decide merge, fix, or abandon at the end, use the one-pass run with
both human gates:

```text
/pharn-ship implement password reset with a one-time token
```

For a small, well-scoped change, both commands take `--quick` (`/pharn-ship --quick`, 6.25.0;
`/pharn-loop --quick`, 6.28.0): a shorter spine that checks less. [Quick mode](./docs/pipeline.md#quick-mode) says
what it skips and what still stops it.

Every stage is also available as its own command; see [Commands](#commands).

Already installed? `npx @pharn-dev/pharn status` reports your installed skills version and drift.
`update` re-fetches the latest skills version, `add` and `remove` manage capabilities, and `list` prints
what is installed. `init` installs into the project rather than onto your `PATH`, so keep the `npx`
prefix unless you installed the CLI globally.

**Two version numbers, on purpose.** The `pharn` badge above tracks
[`SKILLS_VERSION`](./SKILLS_VERSION) — the content an install receives, and what `status` and
`CHANGELOG.md` are keyed to. The npm package `@pharn-dev/pharn` carries the installer's own version.
They move independently and are not meant to match.

---

## What gets installed

The installer reads your project and selects the capabilities that apply before writing files. Detection
is JS/TS-shaped today: it reads `package.json` and scans for `next.config.*`, `app/` route handlers,
`.tsx`/`.jsx`, `migrations/`, and `.sql`, resolving to one or more of `ssr`, `backend`, `spa`, and `lib`
— a project can match several rather than exactly one. (The installer's own documentation gives Next plus
Express as an example resolving to `ssr` and `backend` together.) A repo with none of those signals still
installs the universal capabilities.

You see the selected capability list, with a reason beside each entry, before the installer writes. A
normal install adds:

- product commands in `.claude/commands/`,
- hooks in `.claude/hooks/`: the two write guards, the scope setter they read, and a `Stop` guard for
  `/pharn-loop` (see below),
- the four trusted docs — `pharn/CONSTITUTION.md` and `pharn/ARCHITECTURE.md`, plus `THREAT-MODEL.md` and
  `LIMITS.md` at the root,
- the deterministic floor, contracts, grillers, and review lenses under `pharn/`,
- `pharn.config.json`, pinning the skills version and exact installed commit, and carrying the
  `models.stages` block that sets each product command's model and effort — and, since 6.27.0, the model
  `/pharn-ship` and `/pharn-loop` request for each stage they run as a subagent (see
  [Current limitations](./docs/limitations.md#current-limitations) for what that does and does not reach).

```text
your-repo/
├── .claude/
│   ├── commands/pharn-*.md        # the 11 product commands
│   ├── hooks/*.cjs                # the write guards, their setter, the /pharn-loop Stop guard
│   └── settings.json              # wires the hooks (see the caveat below)
├── pharn/
│   ├── CONSTITUTION.md            # trusted docs (human-only)
│   ├── ARCHITECTURE.md
│   ├── floor/*.mjs                # the deterministic checkers
│   ├── pharn-contracts/           # artifact shapes
│   ├── pharn-pipeline/grillers/   # plan interrogators
│   ├── pharn-review/              # code lenses
│   └── features/<name>/           # per increment, written as you run the pipeline — commit these:
│                                  # SPEC PLAN GRILL AC-TESTS (+ .lock.json) BUILD REGRESSION VERIFY, then SHIP + BRIEFING
│                                  # (/pharn-ship) or LOOP (/pharn-loop), and RUN-REPORT + cost.json
├── THREAT-MODEL.md                # the other two trusted docs
├── LIMITS.md
├── pharn.config.json              # skills version + installed commit + models.stages
└── .pharn/                        # runtime scratch — add to .gitignore
```

The hooks enforce only after they are registered in Claude Code's settings — `.claude/settings.json`, or
`.claude/settings.local.json`, which is loaded too and can wire or override the same hooks. If your
project already has a `.claude/settings.json`, the installer preserves it and warns instead of
overwriting it. Until you copy the hook wiring over, any guarantee that depends on a `PreToolUse` hook is
not active.

`require-loop-record.cjs` is not a write guard. It is a `Stop` hook: while an unattended `/pharn-loop` run
in the session has written no `LOOP.md`, it refuses to let the turn end, a bounded number of times per run,
and it fails open. It does nothing unless your settings register it under `Stop`. As of `6.12.0` the
`settings.json` PHARN ships registers it (matcher-less, exec form). An existing install whose
`settings.json` the installer preserved still needs that entry copied by hand — `pharn update` never
edits it.

Copy the wiring **as it ships**, anchored on the project-directory placeholder:

```json
"command": "node \"${CLAUDE_PROJECT_DIR}\"/.claude/hooks/protect-trusted-paths.cjs"
```

Claude Code runs a hook in Claude's _current_ directory, so a relative `node .claude/hooks/…` stops
starting after any `cd` into a subdirectory: node exits 1, which Claude Code treats as a non-blocking
error, and **both guards are then silently off**. That was the shipped form until `6.1.0`, and it is
measured, not theorised. Upgrading an older install is ordered: run `pharn update` first, then change
these two commands — the anchored wiring over pre-`6.1.0` hooks regresses both guards, so roll back in the
reverse order. Each guard judges the git working tree that contains Claude's current directory;
[`LIMITS.md` §7](./LIMITS.md) states the bounds that remain.

---

## Commands

Two commands cover the normal path. Every other command except `/pharn-review` and `/pharn-memory-promote` is
a pipeline stage those two run, available on its own when you want to inspect or drive one step manually. Those
two are standalone: neither is a pipeline stage, and neither is invoked by `/pharn-loop` or `/pharn-ship`.

| Command                 | Use it when you want to...                                                                                                                                                                                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/pharn-loop`           | Run the full workflow unattended: the model approves the spec, iterates build → regress → verify to a deterministic stop, commits a green result to a local branch, and reports. `--quick` (6.28.0): a quick SPEC, no base comparison.                     |
| `/pharn-ship`           | Run the full workflow once, then present the ship record and briefing at the final human decision gate. `--quick` (6.25.0) runs a shorter spine for a small change and skips `/pharn-regress`'s base comparison.                                           |
| `/pharn-review`         | Run code-review lenses in parallel over any code and merge their structured findings deterministically. This is standalone; it is not a pipeline stage.                                                                                                    |
| `/pharn-spec`           | Convert prose intent into a structured `SPEC.md`, surface gaps, and stop for approval before implementation.                                                                                                                                               |
| `/pharn-plan`           | Convert an approved `SPEC.md` into a `PLAN.md` with declared files and declared promoted lessons.                                                                                                                                                          |
| `/pharn-grill`          | Challenge the plan before code exists and re-check the spec/plan hash chain.                                                                                                                                                                               |
| `/pharn-test`           | Write each acceptance criterion's test before the build, into the files `/pharn-plan` mapped in `AC-TESTS.md`, run them and require each to fail, and pin the evidence. Runs between `/pharn-grill` and `/pharn-build` in `/pharn-ship` and `/pharn-loop`. |
| `/pharn-build`          | Implement the plan after setting the active write scope from `PLAN.md`.                                                                                                                                                                                    |
| `/pharn-regress`        | Re-run existing project suites and record regressions outside the feature.                                                                                                                                                                                 |
| `/pharn-verify`         | Check build artifacts and completeness signals, including declared concrete paths that were never created, and that every acceptance criterion's locked, once-red test passed.                                                                             |
| `/pharn-memory-promote` | Promote one lesson into `memory-bank/` through a gated provenance check.                                                                                                                                                                                   |

The command names are generated and drift-guarded in the [inventory below](#pharn-builds-pharn); the
one-line descriptions in this table are hand-written and are not.

---

## Guaranteed vs advisory

A **guarantee** must reduce to a deterministic, non-LLM operation such as a hook decision, content-hash
comparison, enum/set-membership check, regex scan, or filesystem check. Anything that depends on model
judgment is **advisory**.

- **Guaranteed — narrow claims, each backed by a named checker.** For example: once the hooks are wired, Claude
  Code's Write/Edit/MultiEdit/NotebookEdit tools cannot edit the four trusted docs and are held to the active write
  scope; an approved spec is pinned, so later body drift is detectable; and the verify verdict is computed from a
  gate map the gate runner wrote, not one a model typed. [The full table](./docs/guarantees.md#guaranteed-vs-advisory)
  names the check behind each guarantee and its bounds.
- **Detected, not prevented.** A write issued through `Bash` passes neither write guard. `/pharn-verify` detects a
  **non-adversarial** one that reached a path the active scope would have denied, with the exceptions
  [that guarantee](./docs/guarantees.md#guaranteed-vs-advisory) lists, and fails its verdict; it does not stop the
  write.
- **Advisory** — everything a model judges: whether a plan is wise, whether a review finding is real, whether the
  code satisfies the product intent. A green PHARN floor means the named deterministic checks passed. It does not
  mean the code is correct.

What PHARN does not do today is in [Current limitations](./docs/limitations.md#current-limitations); the full set of
bounds is in [`LIMITS.md`](./LIMITS.md).

---

## More documentation

- [`docs/pipeline.md`](./docs/pipeline.md) — how the workflow works, the stages and what binds them, quick mode,
  your own SPEC template, per-test results, excluding a gate, declaring the base install, acceptance-criteria tests,
  and the capability tour.
- [`docs/guarantees.md`](./docs/guarantees.md) — every guarantee with the check behind it, its bounds, and why a
  hook is not the same as a line in `CLAUDE.md`.
- [`docs/limitations.md`](./docs/limitations.md) — what PHARN does not do today.
- [`docs/capabilities/`](./docs/capabilities/README.md) — the generated catalog of grillers, lenses and skills.

---

## PHARN builds PHARN

PHARN is built with its own workflow, one increment at a time, and the resulting development artifacts
are committed in this repository.

That means the repository contains real specs, plans, grill reports, reviews, regression reports, and
verification records produced while building PHARN itself. You can inspect the process instead of taking
the README's claims on trust.

The inventory below is **generated** from the live repository by `npm run docs:generate` and guarded
byte-for-byte by `npm run docs:check`, so it cannot quietly drift from what is actually built.

<!-- CURRENT-STATE:BEGIN — GENERATED by .dev/floor/gen-capability-catalog.mjs. DO NOT EDIT BETWEEN MARKERS. Regenerate: npm run docs:generate -->

- **Capabilities — 37 built**, counted by the `role:` frontmatter test (mirrors `pharn/floor/validate.mjs`): **13** grillers, **22** lenses, **2** skills (`pharn/pharn-core/installed-skill-selection/`, `pharn/pharn-core/seam-resolver/`), **0** validators, **0** verifiers, **0** auditors. Full list: [`docs/capabilities/README.md`](./docs/capabilities/README.md).
- **Contracts — 15** (`pharn/pharn-contracts/`): `ac-tests`, `cost-ledger`, `eval-format`, `finding-shape`, `gate-run-record`, `loop-record`, `reconciliation-record`, `regression-report`, `seam-config`, `ship-briefing`, `ship-record`, `spec-template`, `stage-exit`, `test-results-record`, `verify-report`.
- **Product commands — 11** (`.claude/commands/`): `/pharn-build`, `/pharn-grill`, `/pharn-loop`, `/pharn-memory-promote`, `/pharn-plan`, `/pharn-regress`, `/pharn-review`, `/pharn-ship`, `/pharn-spec`, `/pharn-test`, `/pharn-verify`.
- **Dev-apparatus commands — 9** (`.claude/commands/`): `/pharn-dev-build`, `/pharn-dev-eval`, `/pharn-dev-grill`, `/pharn-dev-memory-promote`, `/pharn-dev-plan`, `/pharn-dev-regress`, `/pharn-dev-review`, `/pharn-dev-ship`, `/pharn-dev-verify`.
- **Hook scripts — 4** (`.claude/hooks/`): `enforce-writes-scope.cjs`, `protect-trusted-paths.cjs`, `require-loop-record.cjs`, `set-writes-scope.cjs`.
- **Floor checkers — 140** `.mjs` files under `pharn/floor/` (tests excluded).

<!-- CURRENT-STATE:END -->

For concrete examples, browse [`.dev/features/`](./.dev/features/). The development history includes
cases where PHARN's own review workflow raised defects in PHARN changes before those increments were
finished — see [`.dev/features/span-redos-linear/REVIEW.md`](./.dev/features/span-redos-linear/REVIEW.md),
where the review caught a false bound shipped by the very increment that was repairing a false bound.

---

## Design docs

The architecture is specified in four documents:

1. [`pharn/CONSTITUTION.md`](./pharn/CONSTITUTION.md) — the principles that govern commands, rules,
   guarantees, and PHARN's own development process.
2. [`pharn/ARCHITECTURE.md`](./pharn/ARCHITECTURE.md) — the floor, primitives, layer tree, and pipeline.
3. [`THREAT-MODEL.md`](./THREAT-MODEL.md) — the security foundation and attack surface.
4. [`LIMITS.md`](./LIMITS.md) — what PHARN does **not** guarantee.

These trusted docs are protected from edits through Claude Code's Write/Edit/MultiEdit/NotebookEdit tool
surface. Bash writes are outside that protection (see [Current limitations](./docs/limitations.md#current-limitations)). All
four are copied into an install: the first two under `pharn/`, the other two at the project root.

---

## Contributing

PHARN is small-surface on purpose: a rule or enforcer is added in response to a real failure, not merely
because a hypothetical checker could exist.

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the read-first order, required gates, and development loop.
Conduct expectations live in [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md); release history is in
[`CHANGELOG.md`](./CHANGELOG.md).

The floor and hooks carry **zero runtime dependencies** beyond the Node standard library; ESLint,
Prettier, and markdownlint are development-only.

## Security

Found a vulnerability? Please follow [`SECURITY.md`](./SECURITY.md) rather than opening a public issue.

## License

[Apache 2.0](./LICENSE).
