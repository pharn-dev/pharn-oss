# Writes-scope (fix #7) — detail

Moved out of the always-loaded root `CLAUDE.md` at `6ff4dd1` (SKILLS_VERSION 6.46.0) by `claude-md-bootstrap`. The text is the moved text, unchanged except
for the `##` headings added for navigation and the leading indentation Prettier normalizes. The root `CLAUDE.md`
still holds the rules every session needs; this file adds detail and does not override them.

**Read when:** before planning or editing a write guard, a hook's wiring, a writes-scope, the setter's `--allow-claude-dir` flag, or anything under `.pharn/`; and after any write is denied. The root `CLAUDE.md` section "Writes-scope (fix #7 — fail-closed)" and hard constraint 1 hold the rules; this file holds the postures, the deny bodies and the reasons.

## Why `.pharn/writes-scope.json` is guarded by protect-trusted-paths (hard constraint 1)

Each hook is re-read fresh on every tool call, so a write to one would disarm that guard on the very
next write; and the scope file is the list `enforce-writes-scope.cjs` reads to decide **every**
write, so a Write-tool edit of it was a self-escalation — that hook guards it with one byte-exact
compare while `ALWAYS` leaves the rest of `.pharn/` writable, so on a case-insensitive volume
`.pharn/WRITES-SCOPE.JSON` named the same file and slipped past. It is covered **here** instead
because this hook already case-folds, strips Windows trailing dot/space, and resolves symlinks
segment-wise, which closes the case-variant and dangling-alias vectors together;
`enforce-writes-scope.cjs` keeps its own compare as defense in depth, and `set-writes-scope.cjs` is
unaffected because it writes via `fs.writeFileSync`, which `PreToolUse` never sees. Deliberately the
one file, **not** `.pharn/**` — the rest is disposable runtime scratch stages legitimately write.

## Fail-closed — every posture (dev, unsignalled, installed)

- **Fail-closed — in a dev checkout or an unsignalled tree, always; in an installed project, only while
  PHARN is working (6.24.0).** With no scope file, a dev checkout (`.dev/floor/` present, no
  `skillsVersion`) or an unsignalled tree (neither signal) restricts writes to a default-safe-set — other
  `.pharn/**` (not `writes-scope.json`, which is setter-only), `pharn/features/**`, `.dev/features/**`,
  `pharn/pharn-*/**` (the dev-repo extras — matches the relocated module dirs but **not** `pharn/floor/` or
  the `pharn/` trusted docs) — exactly as before; `.dev/memory-bank/**`, `.dev/floor/**`, `pharn/floor/**`,
  `.claude/**`, and root files stay **denied** until an explicit `writes:` declaration names them. An
  **installed** project (`pharn.config.json` carries a non-empty `skillsVersion`) keeps that SAME
  fail-closed default-safe-set **only while a `/pharn-ship`, `/pharn-loop` or `/pharn-review` run is
  open** (see the run-marker bullet below); **outside an open run it instead denies PHARN's own installed
  surface** — `pharn/**` except `pharn/features/**`, `.claude/**` and `pharn.config.json` (matched
  case-folded; the `pharn/features/` exception is matched as WRITTEN, so a case or trailing-dot variant of it
  is denied — GATE-2 review, B2) — plus `.pharn/writes-scope.json` itself and, on a `/` system, any path
  containing a backslash (there a backslash is part of a file NAME, while the reserved-path fold reads it as
  a separator — a deny list must not guess), and allows every other in-project path, including your ordinary
  source and the files Claude Code loads at session start (`CLAUDE.md`, `AGENTS.md`, `.mcp.json`).
  **Outside the project** it then allows three places, each narrowed to THIS project and THIS session in 6.31.1
  (the maintainer's 2026-09-26 GATE-2 decision D2 had allowed every project's memory folder and both whole temp
  roots, which a security review showed reached another project's auto-memory and another live session's
  scratch): **this project's auto-memory folder**, `<claude-config-dir>/projects/<key>/memory/**`
  (`$CLAUDE_CONFIG_DIR` when set, else `~/.claude`), for the key of the folder holding this session's
  `transcript_path` and the key Claude Code derives from the repository's main checkout (a mirror of an
  undocumented Claude Code derivation that fails closed if it drifts, so a linked-worktree or subdirectory
  session still reaches its memory); **this session's own scratchpad**, the payload's `scratchpad_dir` only in the
  shape Claude Code writes, `<temp root>/claude-<uid>/<key>/<session_id>/scratchpad`; and **an ordinary temp
  path** under `os.tmpdir()` or `/tmp` — never with a `claude-<uid>` folder in its path, never inside the Claude
  config directory (whichever of it and the temp root contains the other), and not inside the home directory
  when that lies inside the temp root. A payload field that is absent, malformed or not in normal form (a `.` or
  `..` segment) grants nothing from the place that needs it. Never a path inside another git tree, never the project root itself, and never another
  SPELLING of the project's own path (a different letter case, Unicode form or trailing dot/space, which on a
  case-insensitive volume reaches the project's own files: it is denied as the project's own — re-review R1);
  every other out-of-project path (another project's memory, dotfiles, `~/.ssh`, `~/.claude/settings*.json`,
  `~/.claude.json`, `~/.claude/hooks/`) stays denied, as every one was before 6.24.0 — "another project" meaning
  another KEY: two paths that differ only in characters outside `[A-Za-z0-9]` share one key and, in Claude Code
  too, one memory folder (`LIMITS.md §7`). A **malformed** `.pharn/writes-scope.json` (present, or not confirmable as absent, but not a readable
  regular file whose JSON is a plain object with an array `scope`) denies **every** write in an installed
  project, `.pharn/**` included, rather than falling back to either default. A **set** scope is authoritative
  in **every** posture — it replaces whichever default is live for non-`.pharn` zones — so
  `writes: [".dev/memory-bank/lessons-learned.md"]` unlocks exactly that file.

## Every write is judged at every target it can reach

- **Every write is judged at every target it can reach (6.24.0, every posture).** The guard resolves a path
  twice — the pre-6.24.0 way (`path.resolve()`, then the realpath of the nearest existing ancestor), judged
  first over every path so every old denial keeps its old message, and the filesystem's way (segment by
  segment, each existing directory at its ON-DISK spelling via `fs.realpathSync.native` — re-review R1 — a
  DANGLING symlink followed to the target it names, `..` applied to a symlink's REAL parent) — and denies if
  either target is denied (GATE-2 review, B1). The second resolution splits on `/` only on a `/`
  system: the first handoff of this fix copied protect-trusted-paths.cjs's `\`-as-separator reading, and
  that made `pharn/features/a\b/../../floor/x.mjs` resolve inside `pharn/features/` while the kernel wrote
  `pharn/floor/x.mjs` — measured in the dev posture too, before it shipped. **Since 6.31.1
  `protect-trusted-paths.cjs` carries a byte-equal copy of that second resolution** (pinned by a ✧ test beside
  the `workTreeRoot()` / `toKey()` pins) and judges it after its own check, alone, so every verdict it changes
  moves toward deny and every old denial keeps its message.

## A PHARN run keeps the fail-closed default standing (installed projects)

- **A PHARN run, in an installed project, is what keeps the fail-closed default standing (6.24.0).** A
  run is open while `.pharn/<pharn-loop|pharn-review|pharn-ship>/<name>/active.json` exists (`lstat`,
  never followed — a torn file, a directory or a dangling link still counts) with a modification time
  within 24 h of now in either direction, or while one of those three state directories is present but is
  not a readable directory — a FILE planted there (the Write tool can plant one; `.pharn/**` is always
  writable) counts as a run open, fail-closed, until someone removes it (GATE-2 review, S1). A stray
  non-directory ENTRY inside a real state directory (a `.DS_Store`) is not a run. The guard never parses a
  marker — presence and age only. `/pharn-ship` and `/pharn-review` open and close theirs with
  `pharn/floor/run-marker.mjs --open|--close <command> <name>`, which exits 2 on every failure (a planted
  file included) and never crashes, and both commands **STOP** when `--open` exits non-zero; `/pharn-loop`
  keeps its existing marker, written by `.claude/hooks/require-loop-record.cjs`, with no second writer
  (L35), and **STOPs** (S9) when its Step 1a snapshot or that marker's `--open` exits non-zero (re-review
  R2). All of these are Bash calls outside the `PreToolUse` gate (L19) — ADVISORY: a run that skips `--open` is
  unguarded between its own scoped steps, and one that skips `--close` leaves the fail-closed default
  standing for at most 24 h. Tree-wide, not per-session — the scope record is already one per tree (L38),
  and a subagent a command spawns must be covered by the marker its own orchestrator opened. In a dev
  checkout or an unsignalled tree the guard never reads these markers, the default is the pre-6.24.0 one, and
  every deny message the old hook printed is byte-identical; the only verdict changes there are toward deny
  (a write through a symlink is also judged at the target it reaches, a path spelled differently from an
  existing directory is also judged at that directory's on-disk spelling, and a guard error denies).

## The root every scope entry is relative to

- **The root every scope entry is relative to is NOT the hook process's cwd (6.1.0).** It is the first
  directory, walking up from Claude's current directory, that holds a `.git` entry or is
  `$CLAUDE_PROJECT_DIR`. A session working from a subdirectory therefore still gets the repo root and the
  repo's scope record, and a session inside a worktree is judged — and protected — as that worktree. The
  wiring in `.claude/settings.json` anchors both guards on `${CLAUDE_PROJECT_DIR}` for the same reason:
  with the old relative command they did not **start** at all from a subdirectory (exit 1, which Claude
  Code treats as non-blocking — both guards silently off). `LIMITS.md §7` carries the bounds.

## When a write is blocked — the five deny bodies

- **When a write is blocked,** the fix is to **declare the path in `writes:` and re-run the
  scope-setter** — _never_ to bypass the hook. The deny message names the blocked path and the active
  scope. `denyMessage()` has **five** bodies (up from three), and the split is what keeps every remedy
  reachable (L27):
  - **in-repo** — declare the path and re-run the setter; in an installed project it may ALSO list any
    open run marker(s) and their close commands, but only when the path would become writable once BOTH
    the scope is released AND the run is closed — never for a reserved path, and never for the scope file
    itself, since neither becomes writable that way. Its **alias** variant (an installed project, a path that
    is another spelling of the project's own — re-review R1) says so and offers only "spell it as the project
    does" or a human write: no scope entry can name that spelling, and it is NOT scratch, so never Bash;
  - **outside every git tree** (the agent scratchpad under `/private/tmp`, say) — no `writes:` entry can
    express it and neither can the fail-closed default, so the only routes are putting the file inside the
    repo, or, **for genuinely temporary/scratch files and only those**, writing it through **Bash**, which
    `PreToolUse` never sees. **In an installed project outside an open run this is no longer categorical**:
    this project's memory folder, this session's scratchpad or an ordinary temp path, in no other git tree,
    IS writable there under the permissive default, so for such a path the message says so and names what is
    holding it (the scope, an open run, or an unreadable run-state directory) instead of claiming nothing can
    help. Its **Claude-state** variant (6.31.1 — an installed project, a path that is Claude Code's own state
    outside the project: another project's memory folder, a file in the config directory, or anything below a
    `claude-<uid>` temp folder) names the two memory keys and the scratchpad rule, offers this session's
    scratchpad as a route only when the call's payload identifies it (and says it cannot be reached otherwise —
    GATE-2 review F2, L27), and offers NO Bash route:
    another project loads its memory into its later sessions, and another session reads back its temp folder;
  - **inside a git tree that is not the one being judged** — another checkout or worktree, or the same
    repository outside this project's root. That is code, not scratch, so **the Bash route is not
    offered**: work from a session whose current directory is inside the project that owns the file
    (`EnterWorktree` with its path, a session launched there, or a subagent with `isolation: worktree`)
    and set that project's scope there. Unchanged in every posture — the permissive default never admits a
    path inside another tree either;
  - **reserved** (NEW, 6.24.0) — an installed project, no scope, no run open, and the path is PHARN's own
    installed surface (`pharn/**` except `pharn/features/**`, `.claude/**`, `pharn.config.json`): declare it
    in `writes:`, use `pharn update`, or a human edits it directly outside the agent — never Bash, and
    never a stale-scope/stale-run bullet (there is neither). Its **backslash** variant (same posture, a path
    containing `\` on a `/` system) says why the guard refuses to guess and offers only "spell it with `/`"
    or a human write;
  - **malformed** (NEW, 6.24.0) — an installed project whose `.pharn/writes-scope.json` exists but is not a
    readable file with a plain-object, array-`scope` shape: release it (`--clear`) or let the running
    command's own first step replace it with a usable one — declaring the path in `writes:` alone does not
    help until the record itself is replaced.

  Routing an **in-repo** write through Bash to dodge the guard is still the thing you must not do — and
  the third branch exists because the old single message offered exactly that for a sibling worktree's
  source files, and agents took it.

## The setter refuses to scope the guards themselves

- **The setter refuses to scope the guards themselves.** `set-writes-scope.cjs` exits non-zero and
  writes nothing if the parsed scope names `.claude/settings.json` or one of the four hook scripts,
  unless `--allow-claude-dir` is passed. A `PLAN.md` is untrusted input, so without this an increment
  could declare its way into disarming a guard. Use the flag only when the increment genuinely edits a
  guard; it is an argv flag, so no declared file can set it for itself. The check is **lexical** (it
  normalizes `./` and `a/../`, but does not resolve symlinks) — it is the loud early failure, not the
  last line of defense.

## What under `.pharn/` is load-bearing

- **What under `.pharn/` is LOAD-BEARING, and what is disposable — because they sit side by side.**
  Exactly three kinds of entry matter, and none is obvious from the filename:
  - **`.pharn/writes-scope.json`** — the fix #7 guard's INPUT. Its path is hard-referenced by both
    hooks and the setter, so it **never moves**, and it is the one `.pharn/` path the write-guard
    protects by name. Deleting it is safe and means "fail-closed default" (dev/unsignalled, or an
    installed project with a run open) or "the permissive default" (an installed project outside an open
    run); editing it by hand is not.
  - **`.pharn/pharn-loop/`, `.pharn/pharn-review/`, `.pharn/pharn-ship/`** (6.24.0) — the RUN MARKERS. **In
    this dev repo the guard never reads them** (dev posture is unaffected by any run state), but in an
    **installed** project a fresh marker under one of these three is what holds the fail-closed default
    standing instead of the newer permissive one. Deleting one early releases that hold; deleting one that
    belongs to a run you are executing removes the guard that run depends on.
  - **`.pharn/lessons-index.md`** — the PRODUCT lessons-index CACHE. Disposable by design (deleting it
    yields `COLD`, which is GREEN), but deleting it to clear scratch costs a regeneration, which is why
    "just delete `.pharn/`" is the wrong reflex.
- **Everything else under `.pharn/` is per-command scratch, and belongs under `.pharn/<command>/`** —
  the shape `/pharn-dev-regress` and `/pharn-dev-verify` already use (`.pharn/pharn-dev-regress/*.json`).
  A stage writing ad-hoc files at the `.pharn/` ROOT is the thing to avoid: it puts throwaway logs and
  captures in the same flat namespace as the two load-bearing entries above, so a human clearing scratch
  cannot tell them apart. **ADVISORY (P0):** no checker enforces the namespace and none is added — this
  is a convention a human and a command author follow, not a floor guarantee. Clearing scratch means
  removing `.pharn/<command>/` directories, never `rm -rf .pharn/`.
