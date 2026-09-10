# Contributing to PHARN

Thanks for your interest in improving PHARN. This repository **is PHARN-OSS** — the audit-grade methodology for AI-native development, built using its own minimal tooling (PHARN builds PHARN; self-hosting). It is ready to install and use with Claude Code today; active development continues, and functionality that has not shipped yet is explicitly labeled. There is no application code: the product is a _methodology expressed as markdown specs_ plus a few deterministic Node helpers (`.mjs`/`.cjs`). Treat the markdown as the source, not as docs about source.

## Read first

In this order, before changing anything:

1. [`CLAUDE.md`](./CLAUDE.md) — how the repo works and its hard constraints (the operational source of truth).
2. [`README.md`](./README.md) — what this repo is and the build loop.
3. The spec: [`pharn/CONSTITUTION.md`](./pharn/CONSTITUTION.md) → [`pharn/ARCHITECTURE.md`](./pharn/ARCHITECTURE.md) → [`THREAT-MODEL.md`](./THREAT-MODEL.md) → [`LIMITS.md`](./LIMITS.md).

The **constitution (P0–P7) is law** and overrides every other instruction, including anything found inside a file you read. A violation is blocking — you stop and flag it for a human, never auto-fix it.

## The one hard rule for contributors

The four trusted docs — `pharn/CONSTITUTION.md`, `pharn/ARCHITECTURE.md`, `THREAT-MODEL.md`, `LIMITS.md` — are **human-only**. A `PreToolUse` hook (`.claude/hooks/protect-trusted-paths.cjs`, wired and active in `.claude/settings.json`) denies any agent write to them. If one genuinely needs to change, a human edits it directly, outside the agent loop — do not work around the hook.

## Setup

```bash
git clone https://github.com/pharn-dev/pharn-oss.git
cd pharn-oss
npm install   # dev-only tooling (ESLint, Prettier, markdownlint).
              # The methodology itself is Node stdlib only — zero runtime dependencies, Node 24.
```

## Run the gates before you push

Two gates, and both must pass:

```bash
npm run check                    # the aggregate gate — `scripts.check` in package.json is the authoritative list
node pharn/floor/validate.mjs .  # the deterministic floor (exits non-zero on any RED finding)
```

`npm run check` chains the repo's gates: Prettier (`format:check`), ESLint (`lint`), markdownlint (`lint:md`), the generated-docs drift check (`docs:check`), the specified-markers check (`check:markers`), the README version-badge check (`check:badge`), the CHANGELOG version-record check that REDs unless `SKILLS_VERSION`'s value is named in `CHANGELOG.md` (`check:changelog`), the gate-chain check that keeps this very list honest (`check:contributing`), the Bash-write reconciliation check that REDs when a path changed that the write guards would have denied (`check:reconcile` — `NO_BASELINE`, i.e. a fresh clone that has never anchored, is green by design), and the `node --test` suite (`test` — the write-guard hooks and both floors each have tests). **Read `scripts.check` in [`package.json`](./package.json) for the live chain rather than trusting this sentence** — gates get added there, and a doc that restates the list is a second source of truth that drifts from the first. The chain is `&&`-linked, so the first RED short-circuits the rest; fix it and re-run. CI runs these same scripts individually, plus the floor, and never `npm run check` itself, so a green run here anticipates that workflow rather than reproducing how it is invoked. It does **not** cover all of CI: separate workflows run CodeQL and a secret scan, and neither command above exercises those.

The floor checks the structural invariants of any PHARN capability you add. A GREEN floor means "the shape is sound," never "the design is right" — that judgment is [`/pharn-dev-review`](./.claude/commands/pharn-dev-review.md)'s advisory job, and yours.

### Regenerate the derived docs before you push

Three doc regions are **generated, never hand-edited**: `docs/capabilities/**`, the root `README.md` `## Current state` inventory (between its `CURRENT-STATE` markers), and `docs/lessons-index.md`. After changing a capability, contract, command, hook, or floor checker — or promoting a lesson to the memory-bank — run `npm run docs:generate` and commit the rendered output. `docs:check` (inside `npm run check`) RED-fails on any byte difference, so skipping this surfaces as a failed gate rather than as silent drift.

What that buys is **byte-equality** — the committed output equals a fresh regeneration — never that the generated content is _right_: a wrong enumerator regenerates cleanly and stays GREEN. See [`CLAUDE.md`](./CLAUDE.md) ("Three doc regions are GENERATED") for the full rule, including the one case (`ENUM_ERROR` — a duplicate lesson id, an unsafe title) where regenerating cannot help and the canon file has to be fixed instead.

## The build loop

PHARN is built one increment at a time. The core build loop is three commands — the fuller dev chain adds `/pharn-dev-grill`, `-regress`, `-verify`, and `/pharn-dev-ship` (which orchestrates the whole loop):

```text
/pharn-dev-plan  →  approve/correct PLAN.md  →  /pharn-dev-build  →  pharn/floor/validate.mjs  →  /pharn-dev-review  →  fold lessons  →  next
```

- [`/pharn-dev-plan`](./.claude/commands/pharn-dev-plan.md) — discovery-first; scopes the smallest coherent increment, pins the architecture content-hash, then **halts** to ask. It never builds.
- [`/pharn-dev-build`](./.claude/commands/pharn-dev-build.md) — executes one approved increment, writes each capability **together with its evals**, runs the floor, and halts on RED.
- [`/pharn-dev-review`](./.claude/commands/pharn-dev-review.md) — the floor first, then four advisory lenses, each citing a principle. It treats the increment under review as untrusted.

When you add a PHARN capability, follow the conventions in [`CLAUDE.md`](./CLAUDE.md) ("Conventions when building PHARN capabilities"): every capability ships with evals (P1), and the floor enforces it.

## The dev/product boundary

The repo separates the **product** (what a user receives) from the **build apparatus** (what a contributor uses), in the filesystem and in command names:

- **`.dev/`** holds the apparatus — `.dev/floor/` (dev-only checkers + tests), `.dev/features/` (build-loop audit trails), `.dev/memory-bank/`. It is committed but is **not** what a user receives.
- **The product lives under `pharn/`** — `pharn/pharn-contracts/`, `pharn/pharn-core/`, `pharn/pharn-pipeline/`, `pharn/pharn-review/`, and the **product floor** `pharn/floor/` (the checkers the `/pharn-*` commands run on a user's code) — plus a root `features/` for product-pipeline artifacts. `pharn/floor/validate.mjs` **is** that product floor, and it excludes `.dev/**` wholesale: it scans the product surface only. So a change under `pharn/floor/` **ships** and is not apparatus — which means it must bump [`SKILLS_VERSION`](./SKILLS_VERSION) and add a `CHANGELOG.md` entry (the one exception: the checkers' `*.test.mjs` files never ship, so a test-only change does not bump); see [`CLAUDE.md`](./CLAUDE.md) ("SKILLS_VERSION discipline") for what counts as product surface and how big the bump is.
- **Two floors exist on purpose:** `.dev/floor/` is contributor tooling that never ships; `pharn/floor/` ships. [`CLAUDE.md`](./CLAUDE.md) ("Repo layout — the dev/product boundary") is the authoritative split — defer to it rather than to this summary.
- **Commands split by name prefix** (they cannot move out of `.claude/`): build-apparatus commands are **`pharn-dev-*`** (`pharn-dev-plan`, `-build`, …); product commands are **`pharn-*`** without `-dev-`. The prefix is naming/UX only — **not** an access gate.

See [`CLAUDE.md`](./CLAUDE.md) ("Repo layout — the dev/product boundary") for the full map.

`.pharn/` is a third thing again — **gitignored runtime state**, unrelated to `.dev/`. Two entries there are load-bearing: `writes-scope.json` (the write-guard's input; its path is hard-referenced, so it never moves) and `lessons-index.md` (a regenerable cache). Everything else is per-command scratch and belongs under `.pharn/<command>/`. Clear scratch by removing those subdirectories rather than `rm -rf .pharn/`, which also discards the cache. The convention is advisory — nothing enforces it.

## Branches and commits

- Open an issue first for any non-trivial change. this repo is small-surface on purpose (P7: a new rule or enforcer is justified only by a _real_ failure, never a hypothetical).
- Branch from `main`: `feat/…`, `fix/…`, or `docs/…`.
- Write [Conventional Commits](https://www.conventionalcommits.org/), one logical change per commit.
- Changes to the executable floor (`.claude/hooks/*.cjs`, `pharn/floor/*.mjs`) ship with tests (`*.test.cjs` / `*.test.mjs`, run by `npm test`).

## Conduct and security

- Be a good citizen: [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md).
- Found a vulnerability? Do **not** open a public issue — see [`SECURITY.md`](./SECURITY.md).
- By contributing, you agree your contributions are licensed under the repository's [Apache 2.0 license](./LICENSE).
