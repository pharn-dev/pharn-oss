# PLAN — markdownlint-ignore-agents

- spec_content_hash: 4950796f5342df20a298fe22812e45dec3c15317592bd2358a31e149d2dc1c7f
- applied_lessons: [L11, L26, L36, L52, L57]
- increment: `.markdownlint-cli2.jsonc` ignores `.agents`, Codex's gitignored import of this repo's commands, so a bare `npm run lint:md` in a checkout that holds it stops reporting MD025 on files that are not the repo's; a premise test runs the entry against the installed binary with a negative control.
- layer(s): repo-meta (shared style config) + build apparatus (`.dev/floor/` test). No product surface.
- constitution_refs: [P0, P6, P7]

## The failure (measured this run, P6/P7)

Codex's "import from Claude Code" writes `/.agents/skills/*/SKILL.md` (plus `/AGENTS.md` and `/.codex/`). `.gitignore:12`
excludes `/.agents/`, so the directory is untracked (`git ls-files .agents` → 0 paths) and CI never has it. The main
checkout at `/Users/pgalarowicz/Projects/pharn-oss` holds it: 19 `SKILL.md` files. Each wraps a whole
`.claude/commands/*.md` under its own H1 (`# source-command-<name>`, then `## Command Template`, then the command's own
`# /pharn-…` heading), so markdownlint's MD025 (single H1) fires once per file.

Measured in this worktree with that directory copied in (`cp -R`; the copy is gitignored here too, `git check-ignore`
→ `.gitignore:12`):

- `npm run lint:md` → **exit 1**, `Linting: 1487 files`, `Summary: 20 issues in 20 files`. 19 of them are MD025 in
  `.agents/skills/*/SKILL.md`. The prompt reported 18; the live directory holds 19 files, so the count is 19 today.
- The 20th is MD038 in `.pharn/pharn-dev-ship/pr-body.md`, the PR body the previous `/pharn-dev-ship` run in this
  worktree left behind (PR #273, merged as `0eb19be`, HEAD). That is disposable per-command scratch, not this
  increment's subject. See "Environment" below.
- `npm run format:check` → **exit 0**. Prettier 3.9.8 reads `.gitignore` by default:
  `prettier --file-info .agents/skills/source-command-pharn-review/SKILL.md` → `ignored: true`; with
  `--ignore-path .gitignore` alone → `ignored: true`; with `--ignore-path .prettierignore` alone → `ignored: false`.
  The files are prettier-clean anyway: `prettier --ignore-path .prettierignore --list-different .` lists 0 `.agents/`
  paths, and `--check` on one of them exits 0.
- The two sibling import paths: a copy of `/AGENTS.md` linted with `--no-globs` → `0 issues`, exit 0; `/.codex/` holds 0
  `.md` files.

markdownlint-cli2 does not read `.gitignore`, and its `**/*.md` glob descends into dot-directories. That is why
`.pharn/lessons-index.md` and `.claude/worktrees` are already listed. This is the 6.13.1 `.claude/worktrees` failure
(CHANGELOG [6.13.1]) for a second untracked directory.

## Applied lessons

- L11 — this is exactly L11's shape: a whole-repo style gate RED on a file unrelated to the feature, blocking every
  local `/pharn-dev-verify`. The remedy applied is L11's first one, keep the gate clean at its input, by removing
  non-repo files from the gate's reach rather than giving verify a base comparison.
- L26 — every measurement above ran inside this worktree, under the repo's own configs, with `.agents/` placed where
  the importer puts it. None ran against a copy outside the repo, where the configs would not resolve by path.
- L36 — the closure alternative was considered: markdownlint-cli2's `"gitignore": true` would cover every gitignored
  path, not one member. Not taken. It would blanket-exclude `.pharn/`, which the config's own zone note rejects on
  recorded reasoning, and the prompt directs the member form ("the same way"). The cost is L36's: the next untracked
  directory an importer writes is a third member, not a covered case. It is named as a bound in the entry and in the
  CHANGELOG.
- L52 — the existing premise test probes `.claude/worktrees` only, so it says nothing about `.agents`. The new test
  is written for THIS member: it builds a `.agents/skills/<s>/SKILL.md` in a scratch tree and removes the `".agents"`
  line for the negative control.
- L57 — `ignores` entries match only at the root. That is the right reach here: `.gitignore` anchors the path the same
  way (`/.agents/`), and the importer writes at the root. The test builds the directory at the scratch root for the
  same reason.

## Files

- `.markdownlint-cli2.jsonc` — `ignores` gains `".agents"` on a line of its own, directly after `".claude/worktrees"`, with a comment giving the measured reason, why prettier needs no twin, and the bound — layer repo-meta (shared style config)
- `.dev/floor/command-hygiene.test.mjs` — one new premise test after the existing one: in a scratch tree holding this config's bytes plus `a.md` and `.agents/skills/s/SKILL.md` (two H1s, the MD025 shape), a bare run lints 1 file; with the `".agents"` line removed it lints 2. It reuses `lintedCount`, `REPO_ROOT` and `MDL_BIN`, carries the same skip condition, and is read-only (no `--fix`) — layer dev-floor test
- `CHANGELOG.md` — one dated `- 2026-09-25:` entry under `## [Unreleased]`, in a new `### Fixed` group (the section holds no entries today). No `SKILLS_VERSION` bump: every path above is repo-meta or apparatus (CLAUDE.md, "SKILLS_VERSION discipline") — layer repo-meta

### Deliberately NOT in scope

- `.prettierignore`: measured not needed (above). Prettier already excludes `.agents/` through `.gitignore`, so an entry would be an addition with no failure behind it (P7).
- `/AGENTS.md` and `/.codex/` in `ignores`: measured clean or markdown-free (above), so neither has a failure behind it (P7).
- `"gitignore": true`: see L36 above.
- `.pharn/pharn-dev-ship/pr-body.md`: gitignored scratch, not a repo file. See "Environment".
- `SKILLS_VERSION`, `README.md` badge, `MIN_CLI`: no product-surface byte changes.
- The four trusted docs: none mentions the lint config.

## Environment (not part of the diff)

- The `.agents/` copy stays in this worktree through `/pharn-dev-verify`, so the verify run's `lint:md` gate measures
  the condition the prompt asks about. It is gitignored, so it cannot enter the diff. It is removed at the end.
- Before the "after" measurement, `.pharn/pharn-dev-ship/pr-body.md` (the merged PR #273's body) is moved to the session
  scratchpad, not deleted. CLAUDE.md sanctions clearing `.pharn/<command>/` scratch, and the move keeps a copy. This
  run's own PR body is written as `.pharn/pharn-dev-ship/pr-body.txt`, outside the `**/*.md` glob, so it does not
  recreate the RED.

## Contracts satisfied

- None. No capability, contract, rule or command changes. The shared style config is repo-meta.

## Evals to write (P1)

- None: no capability is added or changed. The premise test is the executed check, and it runs in `npm test`.

## Guarantee audit (P0)

- "a bare `lint:md` does not lint `.agents/**`" → advisory configuration, backstopped by the premise test. The test
  executes the installed binary under this config's bytes and is an executed check, not a floor primitive. It is
  **skipped** where the dev toolchain is absent, and a skip exits 0.
- "no repo file loses lint coverage" → measured this run (`git ls-files .agents` → 0). Nothing re-checks it later: a
  future tracked `.agents/` path would silently be unlinted. Named, not closed.
- "`.prettierignore` needs no entry" → measured this run on prettier 3.9.8. It rests on prettier reading `.gitignore`
  by default, which a future prettier or a changed `.gitignore` line could undo. Advisory.
- "the entry still matches what the importer writes" → **not checked by anything.** This is the named residual
  `lint-ignore-reachability-check` in the config's zone note. The premise test proves the entry works on a path WE
  build, never that Codex still writes there.

## Trust audit (P2)

- The `.agents/` files are another tool's output, i.e. untrusted content. This increment never reads their content
  as input: it only counts files and error codes, and the test uses synthetic `# T` bodies. Nothing from them reaches
  a command, a finding or a verdict.

## Determinism audit (P5)

- No branch. The test asserts fixed counts; every check exits on a code.

## Open questions (HALT)

- None. The prompt fixes the approach (a member entry, the 6.13.1 shape), the version posture (no bump) and the
  CHANGELOG location. The `.prettierignore` question it left open is answered by measurement above.
