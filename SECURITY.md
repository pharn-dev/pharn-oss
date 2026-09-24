# Security Policy

PHARN is an audit-grade methodology — taking security seriously is part of the brand, not an afterthought. We welcome coordinated disclosure of any vulnerability in this repository.

## What this repo is, and its security surface

This repository **is PHARN-OSS** — the audit-grade methodology itself. It is ready to install and use with Claude Code today; active development continues, and functionality that has not shipped yet is explicitly labeled. Its security surface is small by design: four trusted markdown spec docs, the `pharn-dev-*` build and `pharn-*` product commands, the hooks under `.claude/hooks/` — the two `PreToolUse` write guards (`protect-trusted-paths.cjs`, the protected-path guard, and `enforce-writes-scope.cjs`, the writes-scope guard), the scope setter they read (`set-writes-scope.cjs`), and the `/pharn-loop` `Stop` guard (`require-loop-record.cjs`, which fails open by design) — and the deterministic floor (`pharn/floor/`). No transpile step, no bundled runtime dependencies, no network egress, no secrets — stdlib-only Node (`.cjs`/`.mjs`) plus markdown.

PHARN's security model (`THREAT-MODEL.md`, threat model B) starts from one axiom: **prompt injection is not solved.** An agent that must read hostile context — code under review, fetched docs, accumulated memory, another model's output — cannot be made to reliably ignore instructions embedded in that content. Defense therefore rests on the **deterministic floor** (hooks, content-hashes, enum/regex checks that do not depend on model judgment), not on "the model will notice the attack." The security-relevant surfaces of this repo follow from that shape.

## Supported versions

We patch security issues against the **latest** released version only. The current version is recorded in [`SKILLS_VERSION`](./SKILLS_VERSION) — the one version of record (`package.json`'s `version` is deliberately inert; see the [`CHANGELOG.md`](./CHANGELOG.md) preamble).

| Version  | Supported          |
| -------- | ------------------ |
| Latest   | :white_check_mark: |
| < Latest | :x:                |

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues, discussions, or pull requests.**

Instead, report privately through one of these channels:

1. **GitHub Security Advisories (preferred)** — use [private vulnerability reporting](https://github.com/pharn-dev/pharn-oss/security/advisories/new) to open a confidential report. No email is exposed and the report stays embargoed until a fix ships.
2. **Email** — if you cannot use GitHub advisories, email `support@pharn.dev` with `[PHARN SECURITY]` in the subject.

Please include as much of the following as you can — it speeds up triage:

- The type of issue (e.g. prompt injection, write-guard bypass, a floor false-negative, path traversal).
- Full path(s) of the file(s) involved.
- The location of the affected code (branch/commit, or a direct URL).
- Step-by-step reproduction instructions, and any configuration required to reproduce.
- Proof-of-concept, if you have one.
- Impact — how an attacker might exploit the issue.

## Response timeline

- **Initial acknowledgement** — within 3 business days of your report.
- **Preliminary assessment and severity** — within 7 days.
- **Resolution target** — critical issues within 30 days; other issues within 90 days.

We will keep you informed throughout, coordinate disclosure timing with you, and credit you in the advisory unless you ask to remain anonymous.

## Scope

### In scope

- **Prompt injection** in the trusted spec docs, the `pharn-dev-*` / `pharn-*` commands, or a capability — content that bypasses the constitution, or launders untrusted data into a guaranteed decision (the trust-fence; `THREAT-MODEL.md §5`).
- **Write-guard bypass** — any input that makes `protect-trusted-paths.cjs` _allow_ a Write/Edit it should deny to a path it protects — a trusted doc, `CODEOWNERS`, the guards' own settings files and hook scripts, `.pharn/writes-scope.json`, the project SPEC template (`pharn.spec-template.md`), git metadata, or memory-bank canon outside a promotion scope — or makes `enforce-writes-scope.cjs` allow a write outside the active scope (e.g. a path-normalization or path-traversal gap; fix #2 / fix #7, `THREAT-MODEL.md §4`). Writes through the Bash tool are outside both hooks by design (`LIMITS.md §6`), so a Bash write on its own is not a bypass.
- **Floor false-negative** — a logic flaw in `pharn/floor/validate.mjs` (or any `pharn/floor/*.mjs` checker) that reports GREEN for input violating an invariant it claims to enforce (a false guarantee — the exact P0 failure mode).
- Any other defect in the executable floor (a `.claude/hooks/*.cjs` hook or a `pharn/floor/*.mjs` checker) that undermines a guarantee the docs claim.

### Out of scope

- Vulnerabilities in a **user's own project** that adopts the methodology — that is threat model A, the methodology's job rather than this repo's.
- Vulnerabilities in **third-party AI providers** (Claude, or any model you drive the commands with).
- Vulnerabilities in **dev-only devDependencies** (ESLint, Prettier, markdownlint) — report those upstream.
- Social engineering, or attacks requiring physical access to a maintainer's machine.
- Denial of service that does not exploit a specific vulnerability.

## Security best practices for users

The write-guard hook and the floor are defense-in-depth, not a guarantee _of correctness_. When using this repo:

1. **Keep the write-guard hook wired** in `.claude/settings.json` — trust-by-location is only real if the trusted docs are write-protected at the floor.
2. **Review what the agent produces** before you run or merge it — that is the methodology's whole point.
3. **Do not over-trust GREEN.** The floor guarantees structural shape, never that the architecture or content is correct (see `pharn/floor/README.md`, "Honest scope"). Correctness is `/pharn-dev-review`'s (and `/pharn-review`'s) advisory job, and yours.

## Acknowledgements

We appreciate the security research community. Anyone who reports a valid issue in good faith will be credited in the resulting advisory, unless they ask to remain anonymous.

Thank you for helping keep PHARN and its users safe.
