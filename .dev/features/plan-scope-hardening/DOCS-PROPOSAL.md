# DOCS-PROPOSAL — plan-scope-hardening (trusted-doc text for the owner)

The four trusted docs are human-only. Each item gives the current text (path:line at `origin/batch/audit-2026-11-03`
== `dd0bb3d3`) and the proposed replacement. The behaviour they describe lands in 7.3.0 with the maintainer-applied
`set-writes-scope.cjs` patch of this increment.

## 1. `pharn/THREAT-MODEL.md:88-91` (§2 item 10, the setter's refusals)

Old:

```text
    refuses a plan that scopes the guards' own control surface (in every project) and, in an installed project,
    PHARN's own installed files (6.61.0), a CI workflow (`.github/workflows/**`) or a git hooks directory
    (`.husky/**`, or a `core.hooksPath` inside the project), each unless the operator passes its opt-in before the
    mode. What the last two buy is narrow: a plan cannot name a file under `.github/workflows/`, under `.husky/`, or
    in a `core.hooksPath` directory the setter finds — the files that run on the next push with the repository's
    secrets, or on the next git command in the person's shell. Other routes to code that runs after the run stay
    open: a hook manager configured elsewhere (`lefthook.yml`, `.pre-commit-config.yaml`, hook settings in
    `package.json`), and what a workflow or an existing hook runs from elsewhere in the repository (a local action,
    a script, the project's own tests) — `pharn/LIMITS.md §6` lists them.
```

New:

```text
    refuses a plan that scopes the guards' own control surface or memory-bank canon (in every project, canon with no
    opt-in — 7.3.0), a CI workflow or local action (`.github/workflows/**`, `.github/actions/**`), a git hooks
    directory (`.husky/**`, or a `core.hooksPath` inside the project) or `.mcp.json` (in every project since 7.3.0),
    and, in an installed project, PHARN's own installed files (6.61.0) and the instruction files `CLAUDE.md`,
    `CLAUDE.local.md` and `AGENTS.md` (7.3.0); in a dev or unsignalled tree it refuses those last two classes while a
    `/pharn-loop` or `/pharn-ship` run marker is open. Each refusal but canon yields to the operator's opt-in before the
    mode. What the executable-config refusal buys is narrow: a plan cannot name a file in those places — the files that
    run on the next push with the repository's secrets, on the next git command in the person's shell, or at the next
    session's start. Other routes to code that runs after the run stay open: a hook manager configured elsewhere
    (`lefthook.yml`, `.pre-commit-config.yaml`, hook settings in `package.json`), and what a workflow or an existing hook
    runs from elsewhere in the repository (a script, the project's own tests) — `pharn/LIMITS.md §6` lists them.
```

## 2. `pharn/LIMITS.md:211-213` (§3f)

Old:

```text
Nothing deterministic stops a plan from naming `CLAUDE.md`, and no behavioural eval covers `/pharn-plan`. The
deterministic backstop is §3e's `instruction-growth` gate at `/pharn-verify`. It bounds the bytes one change adds to
the modelled set, never what a plan names, and never growth accumulated across changes that each stay under budget.
```

New:

```text
Since 7.3.0 the setter refuses a plan that names `CLAUDE.md`, `CLAUDE.local.md` or `AGENTS.md` (at any depth) in an
installed project, unless the operator passes `--allow-instruction-files` before the mode (§6 states the refusals'
bounds); no behavioural eval covers `/pharn-plan`. With the flag, the deterministic backstop is §3e's
`instruction-growth` gate at `/pharn-verify`. It bounds the bytes one change adds to the modelled set, never what a plan
names, and never growth accumulated across changes that each stay under budget.
```

## 3. `pharn/LIMITS.md:322-334` (§6, "The setter's refusals of a plan are early, lexical and reachable through `Bash`")

Old (first sentence, :322-325):

```text
- **The setter's refusals of a plan are early, lexical and reachable through `Bash`.** In an installed project
  `set-writes-scope.cjs --from-plan` refuses a plan that names PHARN's own installed files, a CI workflow
  (`.github/workflows/**`) or a git hooks directory (`.husky/**`, or a `core.hooksPath` inside the project), unless
  the operator passes the matching opt-in before the mode (`pharn/THREAT-MODEL.md §2` item 10). The setter runs through
```

New:

```text
- **The setter's refusals of a plan are early, lexical and reachable through `Bash`.** `set-writes-scope.cjs
  --from-plan` refuses a plan that names memory-bank canon (every project, no opt-in), a CI workflow or local action,
  a git hooks directory or `.mcp.json` (every project), and — in an installed project, or in a dev or unsignalled tree
  while a `/pharn-loop` or `/pharn-ship` run marker is open — PHARN's own installed files or an instruction file,
  unless the operator passes the matching opt-in before the mode (`pharn/THREAT-MODEL.md §2` item 10). The marker test
  reads presence and age only, so a run that deletes or never opens its marker is not covered. The setter runs through
```

Old (:327-334, the `core.hooksPath` reading and what stays unrefused):

```text
  its `config.worktree`, `/etc/gitconfig`, and the XDG and global user files. It does not follow `include` or
```

New (append after "and the XDG and global user files."):

```text
  its `config.worktree`, `/etc/gitconfig`, and the XDG and global user files — fail-closed in an installed project,
  best-effort elsewhere (a file it cannot read is skipped there). It does not follow `include` or
```

and in :331-333 strike the now-refused member: "what a workflow or an existing hook runs from elsewhere in the
repository (a local action under `.github/actions/`, a script, …)" → "(a local action outside `.github/actions/`, a
script, …)".

Add one bound at the end of the bullet:

```text
  The `## Files` reader skips HTML comments, refuses a second `## Files` heading and refuses a `:`-ended label line with
  path items under it (7.3.0); it is still not a CommonMark parser — `plan-files-core.mjs`'s header lists the cases
  where it hides more than a renderer shows, which only ever removes paths.
```

## 4. `pharn/LIMITS.md:492-494` (§7, the installed permissive default)

Old:

```text
  folding reads it as a separator. It allows every other path inside the project, including the files
  Claude Code loads at session start (`CLAUDE.md`, `AGENTS.md`, `.mcp.json`), so a write made outside a run
  can shape later runs. `protect-trusted-paths.cjs` still denies its own set in every posture.
```

New:

```text
  folding reads it as a separator. It allows every other path inside the project, including the files
  Claude Code loads at session start (`CLAUDE.md`, `AGENTS.md`, `.mcp.json`), so a write made outside a run
  can shape later runs; since 7.3.0 a plan can no longer SCOPE those files (§6), but a write outside any scope is
  this default's to judge. `protect-trusted-paths.cjs` still denies its own set in every posture.
```

## 5. Not proposed

- `pharn/LIMITS.md §11` / `THREAT-MODEL.md:141-143` (the owner's bypass and the ruleset) — the BLOCKER's GitHub half;
  the owner's call, not this increment's.
- `pharn/CONSTITUTION.md`, `pharn/ARCHITECTURE.md` — no statement about the setter's refusals.
