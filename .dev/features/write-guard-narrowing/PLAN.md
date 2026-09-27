# PLAN — the write guards judge the path the kernel writes, and the install-posture out-of-project allowance reaches only this project's memory and this session's scratch

- spec_content_hash: d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4
- applied_lessons: [L19, L22, L24, L26, L27, L29, L31, L36, L37, L41, L50, L54, L59, L64]
- increment: `protect-trusted-paths.cjs` also judges every write at the target the filesystem reaches (M4), and
  `enforce-writes-scope.cjs`'s install-posture out-of-project allowance is narrowed to this project's own
  auto-memory folder, this session's own scratchpad and ordinary temp paths (M7) — both as a proposed patch a
  human applies.
- layer(s): product `.claude/` hooks (human-only, via `proposed/`), `LIMITS.md §7` (human-only, via
  `proposed/`), hook tests, shipped docs, repo-meta
- constitution_refs: [P0, P2, P5, P6, P7]
- stage model: opus (`claude-opus-5-5`), by the maintainer's instruction for this batch — not a
  `pharn.config.json` route; effort not routed

## Applied lessons

- L19 — every Bash write this increment makes (the verify-patch runner, `proposed/human-only.patch` and
  `.sha256`, deleting `handoff/`) is declared in `## Files` and in `BUILD.md`, never passed off as scoped.
- L22 — `apply.sh` is pinned below as literal lines; the human runs one script and chooses nothing.
- L24 — the extra resolution in `protect-trusted-paths.cjs` and the payload reads in `enforce-writes-scope.cjs`
  are re-measured end-to-end on this repo (spawn median, HEAD vs patched), not inherited from 6.24.0's numbers.
- L26 — the patch is verified at the REAL paths in a throwaway `git worktree` of this repo, where `npm run check`
  resolves the repo's own eslint/prettier/markdownlint config, never in a sandbox copy.
- L27 — the new Claude-state variant of the out-of-root deny body gets its remedies asserted per branch: present
  in its own case, absent from every other.
- L29 — the variant joins `everyDenyMessage()` in `enforce-writes-scope.test.cjs`, so every membership rule over
  the deny bodies ranges over it.
- L31 — `resolvePhysicalTarget()` becomes a second deliberate copy (enforce → protect), pinned byte-equal by a ✧
  test beside the existing `workTreeRoot()` / `toKey()` pins; the one helper that deliberately differs
  (`realpathOr`) is named in the pin and in both headers.
- L36 — the exclusions inside a temp root are DENY rules, so their matching folds case (a `CLAUDE-501` or
  `.CLAUDE` spelling reaches the same directory on APFS); the allow rules (memory folder, scratchpad) compare
  exactly, so a fold can never widen them.
- L37 — every quantified sentence the increment writes (LIMITS §7, CLAUDE.md, README, the floor README, the
  CHANGELOG, the hook headers) is probed against the patched hooks, the excluded members included, and the exit
  codes recorded in `BUILD.md`.
- L41 — one test exercises the real environment with no overrides (the default config dir, `os.tmpdir()`, the
  real `/tmp/claude-<uid>`), beside the hermetic HOME/TMPDIR/CLAUDE_CONFIG_DIR fixtures.
- L50 — the sweep for the retracted D2 wording goes by referent (every cite of the out-of-project allowance and
  of protect's `\` reading): the two hooks, `LIMITS.md §7`, `CLAUDE.md`, `README.md`, `pharn/floor/README.md`,
  `pharn/floor/run-marker.mjs`'s header; the CHANGELOG's released `[6.24.0]` entry stays frozen and the new entry
  corrects it.
- L54 — the new resolution walk classifies a component with `lstat` before following it; a dangling link is
  followed to the target it names, never read as absent.
- L59 — the protect M4 fixtures cover the link kinds that matter for this walk: a backslash-named link to a
  directory, a dangling link whose TARGET TEXT carries a backslash, and a link inside a canon subtree.
- L64 — each restatement of a bound (CHANGELOG, README, CLAUDE.md, the floor README) is grepped out of the diff
  and probed like its primary in LIMITS §7 before GATE 2.

## Trigger (P7)

Both findings come from a read-only security review of 6.28.2 and were **reproduced this run** against the live
worktree hooks (`.pharn/pharn-dev-plan/repro.cjs`, decision-only, sandboxes under the OS temp directory):

- **M4 (pre-existing).** A symlink named `s\x` → `.` at the project root. With the scope
  `["LIMITS.md","pharn/CONSTITUTION.md"]`, a Write of `<root>/s\x/LIMITS.md` and of `<root>/s\x/pharn/CONSTITUTION.md`
  gets **protect 0, enforce 0** in both the install and the dev posture; the inodes match
  (`<root>/s\x/LIMITS.md` IS `LIMITS.md`). With a `## Files`-origin scope
  `["memory-bank/lessons-learned.md"]` (`set_by` a PLAN), `s\x/memory-bank/lessons-learned.md` gets **0/0** —
  the `## Files` → canon vector the canon denylist exists to close (L7, L20). Controls: `<root>/LIMITS.md` and
  `memory-bank/lessons-learned.md` → protect 2. With no scope, enforce alone stops it (2). This is the named
  follow-up `protect-backslash-separator` from 6.24.0 (`.dev/features/writes-scope-run-only/PLAN.md`), now with an
  observed failure.
- **M7 (introduced in 6.24.0).** Installed project, no scope, no run: **allowed (0/0)** — another project's
  `~/.claude/projects/<other>/memory/MEMORY.md` (config dir under a temp root, and not); `~/.claude/settings.json`
  and `~/.zshrc` when HOME sits under a temp root; another session's
  `/private/tmp/claude-501/<key>/<session>/scratchpad/gates.sh` and `…/tasks/<id>.output`. The maintainer has
  asked to narrow D2 to this project and this session while keeping its purpose (auto-memory, scratch files).

## Discovery (P6) — live state read this run

- `SKILLS_VERSION` 6.28.2, `MIN_CLI` 0.5.0, branch cut from `main` at 70cb51c; `pharn/ARCHITECTURE.md` hash
  pinned above (`hash-doc.mjs`); lessons index GREEN (`check-lessons-index.mjs` exit 0).
- `protect-trusted-paths.cjs` reads `\` as a separator on the raw path (`resolveWriteTarget`, `raw =
String(p).replace(/\\/g, "/")`) and on a dangling link's text; its literal check folds `\` to `/` through
  `toKey()`. It has no reading that treats `\` as a name character. The canon escape
  (`canonWriteAuthorized`) compares the folded key, and `canonMatch(literal) || canonMatch(real)` takes the first
  match, so a second reading is never judged once the first matched.
- `enforce-writes-scope.cjs` already judges two resolutions (6.24.0 B1): `resolveWriteTarget` then
  `resolvePhysicalTarget` (splits on `/` only on a `/` system, native realpath per segment). Its out-of-project
  allowance is `isAllowedOutOfRoot()`: `<claude-config-dir>/projects/<any one segment>/memory/<more>` or under
  `os.tmpdir()` / `/tmp`, reached only in the install posture with no scope and no run (`mode === "permissive"`),
  after the alias and other-tree tests. The message constant `TWO_ROOTS` names that rule in four places.
- **The PreToolUse payload, confirmed two ways.** (1) The installed Claude Code bundle (2.1.281,
  `$CLAUDE_CODE_EXECPATH`, read only): the hook-input builder returns `{session_id: e.id, transcript_path: Cg(e.id),
cwd, scratchpad_dir: WS() ? Ob(e.id) : undefined, prompt_id, permission_mode, agent_id, agent_type, effort}`;
  a served remote call gets `transcript_path: ""` and no `scratchpad_dir`. `Ob(id)` = `<claude temp
dir>/<gT(originalCwd)>/<id>/scratchpad`, the temp dir being `realpath(<CLAUDE_CODE_TMPDIR or /tmp>/claude-<uid>)`.
  `Cg(id)` = the session file, or `<config>/projects/<wS(originalCwd)>/<id>.jsonl`; the subagent transcripts live
  in `<project dir>/<session>/subagents/`. For a subagent `e.id` is the parent session, so `session_id`,
  `transcript_path` and `scratchpad_dir` are the orchestrator's (observed: this subagent's scratchpad sits under the
  orchestrator's session id). (2) The hooks docs (code.claude.com/docs/en/hooks): `scratchpad_dir` — "Path to the
  session's scratchpad directory … Absent when the session has no scratchpad or the temp directory is unavailable.
  Requires Claude Code v2.1.257 or later"; the example is `/tmp/claude-1000/-home-user-my-project/abc123/scratchpad`.
  Whether a subagent's `session_id`/`transcript_path` are the parent's is not documented; the bundle says yes.
- **The auto-memory key is NOT always the transcript's key.** The bundle's `defaultPath()` builds
  `<UG()>/projects/<key(canonical root of projectRoot)>/memory/`, where the canonical root is the git repository's
  main checkout (a linked worktree maps to it after a back-pointer check) and `UG()` is `CLAUDE_CODE_REMOTE_MEMORY_DIR`
  or the config dir; `autoMemoryDirectory` (settings) and `CLAUDE_COWORK_MEMORY_PATH_OVERRIDE` move it elsewhere. The
  memory docs agree: "The `<project>` path is derived from the git repository, so all worktrees and subdirectories
  within the same repo share one auto memory directory." The transcript is keyed by the session's START directory.
  So the two keys agree for a session started at the repository's main root (or outside git), and differ for one
  started in a subdirectory or a linked worktree. `CLAUDE_CODE_PROJECT_DIR_NAME` overrides both the same way.
- The key encoder in the bundle is `e.replace(/[^a-zA-Z0-9]/g, "-")`, truncated past 200 characters with a hash
  suffix — matching the brief's description.
- Every doc site stating D2 or protect's reading (L50 sweep, by referent): the two hooks' headers and
  messages, `LIMITS.md §7` (three bullets), `CLAUDE.md` ("Writes-scope", four places), `README.md` (the guarantee
  row and the posture paragraph), `pharn/floor/README.md` (both guard sections), `pharn/floor/run-marker.mjs`
  (header), `CHANGELOG.md [6.24.0]` (frozen).
- Tests that execute either guard: the five `.claude/hooks/*.test.cjs`, `pharn/floor/{check-bash-reconcile,
run-marker,check-spec,stage-verify,check-ac-tests}.test.mjs`, `.dev/floor/{command-hygiene,capability-catalog-core,
check-capability-catalog,gen-capability-catalog}.test.mjs`. None but the two guards' own suites sends a payload
  with an out-of-project path, so only those two carry changed expectations.

## Design

### 1. M4 — `protect-trusted-paths.cjs` also judges the target the filesystem reaches

- Add a byte-equal copy of `enforce-writes-scope.cjs`'s `resolvePhysicalTarget(p)` (with its two constants,
  `MAX_LINK_HOPS = 40` and `SEPARATORS`: `/[\\/]/` on a `\` system, `/\//` elsewhere). `MAX_RESOLVED_SEGMENTS` and
  `fsRootOf` already exist in protect with the same bodies. The copy calls protect's own `realpathOr` (the JS
  realpath) for its start directory and an absolute link's filesystem root, where enforce's calls the native one;
  every consumer of the result in protect folds case and Unicode (`toKey`), so the difference cannot move a
  verdict. That difference is named in the pin and both headers (L31).
- **PASS 1 is today's loop, byte for byte** (literal + old walk, trusted → gitmeta → canon → canon inode), run over
  every payload path first, so every denial the old hook makes keeps its message.
- **PASS 2** runs only if pass 1 found no offender, over every path: `physical = resolvePhysicalTarget(rawPath)`,
  then the same order of rules on that one target — `isProtected(physical)` → trusted; `gitMetaRelKey(physical)` →
  gitmeta; `canonMatch(physical)` → the escape, authorized only if `canonWriteAuthorized(cm.rel, cm.root)` AND,
  on a `/` system, the physical target holds no `\` anywhere (the escape is an exact-match ALLOW, and its key
  comes from `toKey()`, which reads `\` as `/` — so `memory-bank/x\..\lessons-learned.md`, a new file beside canon,
  folds onto the authorized file; the whole path is tested rather than the part below the root, which also
  refuses the escape for a project whose own path holds a `\` — already unsupported, `LIMITS.md §7`); else
  `CANON_INODES` → canon. A pass-2 message names `<raw> -> <physical>`. Pass 2 judges the target alone, never
  `a || b`, so a symlink inside canon from an authorized name to another canon file is denied too (it was allowed:
  pass 1 takes the first canon match; `enforce-writes-scope.cjs` already denied it, so the composed verdict for that
  case does not move).
- Every verdict change in protect is toward deny, and only for a write that involves a backslash on a `/` system (in
  the path, a link's name, or a dangling link's text — the canon escape's refusal included) or goes through a canon
  link to another canon file. Pass 1 is untouched, so every write the old hook denies is denied with the old
  message (measured by the protect D1 sweep).
- Header: the reading is added to "WHAT THIS FILE LEARNED" (item 6), the canon-escape section gains the backslash
  refusal, and the honest bound on backslashes is replaced by the new one.

### 2. M7 — the out-of-project allowance: this project, this session, ordinary temp

In `enforce-writes-scope.cjs`, reached exactly where today (install posture, no scope, no run, after the alias and
other-tree tests). The payload's own fields are read once, before the decision:

- `session_id` — a string matching `^[A-Za-z0-9][A-Za-z0-9_.-]{0,255}$` (the bundle's own id grammar), else null;
- `transcript_path` — an absolute string ending `.jsonl`, no NUL, at most 4096 characters, else null;
- `scratchpad_dir` — an absolute string, no NUL, at most 4096 characters, else null.

The camelCase spellings are not read (P7: no observed payload uses them). A missing or malformed field makes the
allowance that needs it **grant nothing** — the pre-6.24.0 posture for that place, never a wider one.

The out-of-project target (already resolved, pass 1 and pass 2 as today) is allowed iff ONE of:

1. **This project's auto-memory folder** (GATE-1 decision 2 = B). The target must lie strictly inside
   `<claude-config-dir>/projects/<key>/memory/` — the existing segment test with `segs[1] === key` — for `key` in:
   - **(1a) the transcript key**: the segment directly below `<claude-config-dir>/projects` on the path to
     `realpath(transcript_path)` (the transcript must lie at least one level below `projects/<key>/`, so a subagent
     transcript `<key>/<session>/subagents/agent-<id>.jsonl` gives the same key). No transcript → nothing here.
   - **(1b) the canonical-root key**: the key Claude Code derives for auto-memory from the repository's main
     checkout, mirrored with fs reads only. `<ROOT>/.git` a directory → the canonical root is ROOT. `<ROOT>/.git` a
     regular file (lstat, never followed) → `gitdir: <p>` (one line) → `gitdir = resolve(ROOT, p)` →
     `<gitdir>/commondir` (a regular file, one line) → `common = resolve(gitdir, it)`, whose basename must be
     `.git` → `dirname(gitdir)` must equal `<common>/worktrees`, compared lexically, as Claude Code compares it
     (amended in build) → `<gitdir>/gitdir` (a regular
     file, one line) must resolve, realpath'd, to `realpath(ROOT)/.git` → the canonical root is `dirname(common)`.
     The path is NFC-normalized (the bundle's own `normalize("NFC")`) and encoded by the documented rule (every
     character outside `[A-Za-z0-9]` → `-`) only when it is at most 200 characters; the long-path hash is never
     copied. A missing file, a symlink or non-regular pointer, a second line, a failed check, no `.git` at all, a
     bare common dir, or a path over 200 characters → nothing from 1b (the transcript key still applies). Pointer
     files are read only after `lstat` says regular and at most 4096 bytes, so no FIFO or giant file is opened.
     This mirrors an UNDOCUMENTED Claude Code derivation (read from the installed bundle); the header and
     `LIMITS.md §7` say so, and that a drift fails closed.
     Exact comparison for both keys (an allow is never widened by a fold).
2. **This session's own scratchpad.** `scratchpad_dir` whose last segment is `scratchpad` and whose parent segment
   equals `session_id`; the target must lie under `realpath(scratchpad_dir)`. Exact comparison. Otherwise nothing.
3. **An ordinary temp path.** Under `os.tmpdir()` or `/tmp` (resolved as today), EXCEPT:
   - a path with a segment matching `/^claude-\d+$/i` below that temp root — Claude Code's per-user state (other
     sessions' scratchpads, every session's task output; this session's scratchpad is admitted by rule 2 alone);
   - a path inside the Claude config directory, or inside the home directory, when that directory itself lies
     inside (or is) the temp root — so `~/.claude/settings.json`, `~/.zshrc` are never temp paths. A home that
     CONTAINS the temp root (HOME=/) excludes nothing, because its dotfiles are not inside it.
     These two are DENY rules inside an allow, so they compare case- and Unicode-folded (`toKey()`), which can only
     widen them. If the config or home directory cannot be determined, rule 3 grants nothing.

Other-tree precedence, the alias rule, the project root never being allowed, and every posture other than the
install permissive one are unchanged. `claudeConfigDir()` keeps its definition (`$CLAUDE_CONFIG_DIR`, else
`~/.claude`). The allowance keeps using `resolveWriteTarget` for its roots, as today.

**Messages (L27).** `TWO_ROOTS` becomes `OUT_OF_PROJECT_PLACES`, naming the three places and both exclusions, in
the four sites it fills today (install posture only — the dev/unsignalled bodies never contain it). A new VARIANT of
the out-of-root body, keyed by `ctx.claudeState` (set by the caller, install posture only, for a denied target inside
the Claude config directory or under a `claude-<uid>` temp directory, when the target does not qualify): WHY says it
is Claude Code's own state outside this project; FIX offers — a note for THIS project's auto-memory goes in the
folder this guard recognises (named by the transcript's key and the main checkout's key; a folder Claude Code keys
some other way is not recognised, so a human saves the note); a scratch file: this session's own scratchpad is
recognised only from the `scratchpad_dir` and `session_id` Claude Code passes to hooks, and otherwise it goes to a
temp directory outside every `claude-<uid>` folder, instead of here (grill G1 — the variant never calls a
`claude-<uid>` path "not scratch", because with no usable payload fields the agent's OWN scratchpad lives there
too); a bullet that says not to reach this path through the Bash tool instead, because another project loads its
auto-memory into its later sessions and another session reads back what is in its temp folder — **no Bash
remedy**; otherwise a human. Its Active-scope line reads "(none set — installed project, no PHARN run open)" when
that is the state, as the alias variant's does. No path appears in a FIX bullet (the suite's slash-command
extractor reads `/tmp` there as a command). `denyMessage()` stays pure string composition.

**Where it lives (grill G5).** Everything the rule knows about Claude Code's own layout — the memory-key
derivation, the scratchpad path, the `claude-<uid>` temp folder, the payload fields — sits in ONE headed section of
`enforce-writes-scope.cjs` whose header names Claude Code as its owner and says a drift fails closed. A separate
module would be a new control-surface file (protect's list, the setter's list, the pins, the wiring), so it stays in
the hook. The section also states (grill G6) that rule 3's folded exclusions read `\` as `/` and are safe only
because the permissive posture denies every backslash path before rule 3 is reached.

### 3. What does not change

The dev and unsignalled postures of `enforce-writes-scope.cjs`: no verdict, no message (the D1 sweep, HEAD vs
patched, must count 0 differences). `set-writes-scope.cjs`, `require-loop-record.cjs`, both settings files,
`THREAT-MODEL.md`, the reconcile delegation (its probes are in-repo paths with no session fields). Every existing
`protect-trusted-paths.cjs` denial and its message (the protect D1 sweep over the existing fixtures' paths must
count 0 differences).

### 4. Docs (L37, L50, L64)

- `LIMITS.md §7` (in the patch): the D2 bullet rewritten for the three places, the two exclusions and the payload
  fields, with the bounds decision B leaves (grill G2): 1b mirrors an undocumented Claude Code derivation and a
  drift fails closed; a PHARN install at a subpath (a root with no `.git`) gets nothing from 1b; a non-git
  project's session started in a subdirectory carries a transcript key Claude Code does not use for memory; a
  custom `autoMemoryDirectory` or remote memory directory is not recognised; a Claude Code that sends no
  `scratchpad_dir` gets no scratchpad allowance. The "every target" bullet gains protect's second reading; the
  install bullet's "`protect-trusted-paths.cjs` is unchanged" loses "unchanged"; a provenance comment closes §7.
- `CLAUDE.md` "Writes-scope" (the D2 sentence, the "every target" bullet, the out-of-root remedy bullet) and hard
  constraint 1 (protect's second reading); `README.md` (guarantee row, the posture paragraph);
  `pharn/floor/README.md` (both guard sections); `pharn/floor/run-marker.mjs` header (cite the hook, restate
  nothing).
- `CHANGELOG.md` `## [6.28.3]`, `### Fixed`, one entry led "Security —".

### 5. Version

`SKILLS_VERSION` 6.28.2 → **6.28.3** (PATCH: a correction to shipped hook bytes — no command, checker, contract,
frontmatter key or path added, moved or removed). `MIN_CLI` stays 0.5.0: same files at the same paths. Renumbered
by diff if another PR releases 6.28.3 first.

**No PHARN version string in the human-only bytes** (GATE-1 requirement). The two hooks and `LIMITS.md` name this
change by its slug, `write-guard-narrowing`, wherever a header would carry "(6.x.y)", so a renumber after another
PR merges never regenerates the patch or its sha256. Version strings stay in `CHANGELOG.md`, `CLAUDE.md`,
`README.md`, `SKILLS_VERSION` and `pharn/floor/README.md`, which renumber normally. The runner checks it: no ADDED
line of `proposed/human-only.patch` may match `/\b6\.28\.\d+\b/`.

## Decisions for GATE 1 (all five decided at GATE 1 — see "GATE 1 record")

1. **Chain sequencing — review before apply.** The new tests assert the patched hooks, so `/pharn-dev-verify` in
   this worktree must FAIL on `test` until the human applies the patch (the 6.24.0 precedent). `/pharn-dev-ship`
   stops on a FAIL. Proposed and APPROVED: **if `verify-report.json` has `failing_gates == ["test"]` and the failing
   test titles (parsed from a TAP run) equal the expected-fail list `BUILD.md` records — each of which passes in the
   verify-patch runner's worktree — continue to `/pharn-dev-review`; any other shape STOPs.**
2. **The memory key.** (A) the transcript's key only; (B) A plus a mirror of Claude Code's canonical-root
   derivation. **B was chosen** — §2 rule 1 is written for it.
3. **Protect's canon escape refuses a backslash target** (§1). **In.**
4. **The Claude-state message variant** (§2). **In.**
5. **Windows' layout** (`%TEMP%\claude\…`, no uid) is not matched. **Out**, as named follow-up
   `windows-claude-temp-layout`.

## Files

- `.dev/features/write-guard-narrowing/PLAN.md` — this plan — layer dev artifact
- `.dev/features/write-guard-narrowing/BUILD.md` — the build record — layer dev artifact
- `.claude/hooks/protect-trusted-paths.test.cjs` — EDIT. M4: the reviewer's repros, the dangling link with a
  backslash in its text, the canon escape's backslash refusal, a symlink inside canon, the controls — layer hook
  tests
- `.claude/hooks/enforce-writes-scope.test.cjs` — EDIT. M7: the D2 tests re-derived for the payload fields, the
  reviewer's repros, the exclusions, the fail-closed field cases, the variant through `everyDenyMessage()`, the ✧
  `resolvePhysicalTarget()` copy pin — layer hook tests
- `pharn/floor/run-marker.mjs` — EDIT. Header only: cite the hook's rule instead of restating it — layer product
  floor
- `pharn/floor/README.md` — EDIT. Both guard sections — layer shipped doc
- `CLAUDE.md` — EDIT. "Writes-scope" and hard constraint 1 — layer repo-meta
- `README.md` — EDIT. The guarantee row and the posture paragraph — layer repo-meta
- `CHANGELOG.md` — EDIT. `## [6.28.3]` — layer repo-meta
- `SKILLS_VERSION` — EDIT. `6.28.2` → `6.28.3` — layer repo-meta
- `.dev/features/write-guard-narrowing/handoff/protect-trusted-paths.cjs` — NEW, transient staging source for the
  patch, deleted after generation — layer dev artifact
- `.dev/features/write-guard-narrowing/handoff/enforce-writes-scope.cjs` — NEW, transient staging source — layer
  dev artifact
- `.dev/features/write-guard-narrowing/handoff/limits-edits.json` — NEW, transient: the `LIMITS.md` edits as
  `[{find, replace}]`, each `find` required to match exactly once — layer dev artifact
- `.dev/features/write-guard-narrowing/proposed/human-only.patch` — NEW, generated by the verify-patch runner (a
  declared Bash write) — layer dev artifact
- `.dev/features/write-guard-narrowing/proposed/human-only.sha256` — NEW, generated by the runner — layer dev
  artifact
- `.dev/features/write-guard-narrowing/proposed/apply.sh` — NEW. The human-run apply script pinned below — layer
  dev artifact
- `.dev/features/write-guard-narrowing/proposed/APPLY.md` — NEW. What to read, what the script does, where to
  resume — layer dev artifact

### Explicitly not touched by the agent

- `.claude/hooks/protect-trusted-paths.cjs`, `.claude/hooks/enforce-writes-scope.cjs`, `LIMITS.md` — human-only
  (fix #2); they travel in `proposed/human-only.patch`, applied by `apply.sh`.
- `.claude/settings.json`, `.claude/settings.local.json`, `.claude/hooks/set-writes-scope.cjs`,
  `.claude/hooks/require-loop-record.cjs`, `CODEOWNERS`, `pharn.spec-template.md`, `pharn/CONSTITUTION.md`,
  `pharn/ARCHITECTURE.md`, `THREAT-MODEL.md` — human-only and byte-identical.
- `MIN_CLI` — stays `0.5.0`. `.claude/commands/**` — no command changes.
- `pharn/floor/reconcile-ignore.json` — no tracked path is newly written through Bash outside this plan.

## Build procedure (pinned — L19, L22, L26)

1. `/pharn-dev-build` Step 0 as written: the setter from this PLAN, then `--anchor`.
2. **Before** writing any handoff hook, capture the HEAD hooks' stderr for the D1 sweeps (step 5) from the
   in-tree hooks (still HEAD's). Then write the agent files and the three `handoff/` sources (the two full hook
   files, `limits-edits.json`).
3. Format only this build's own files (`/pharn-dev-build` Step 2b's pinned block over the scope list), and run
   `npx eslint` read-only over the two handoff `.cjs` files by explicit path.
4. `npm run docs:check` (no generated region is expected to move; a RED means regenerate with
   `npm run docs:generate`, a declared Bash write).
5. Write `.pharn/pharn-dev-build/verify-patch.mjs` with the Write tool and run it ONCE. `spawnSync` with argv
   arrays only; in a `try/finally`:
   - `git worktree add --detach .pharn/pharn-dev-build/verify-wt HEAD`; symlink `node_modules` into it;
   - copy every existing agent-written path from the live scope list, the two handoff hooks to their real paths,
     and apply `limits-edits.json` to its `LIMITS.md` (each `find` exactly once, else exit 1);
   - `git add` those paths; a throwaway commit (author `pharn-verify <verify@localhost>`);
   - run each gate of `scripts.check` individually, then `npm run check`, recording each exit;
   - the D1 sweeps: enforce HEAD vs patched over {dev, unsignalled} × {no scope, scope set, malformed, `{}`, …} ×
     the 6.24.0 path list plus the M7 out-of-project paths → 0 differences expected; protect HEAD vs patched over
     every existing fixture shape without a backslash-named link → 0 differences expected;
   - the behavioural probe (the M4/M7 repros, the controls, the new variant) against the patched hooks;
   - `git diff HEAD~1 HEAD -- .claude/hooks/protect-trusted-paths.cjs .claude/hooks/enforce-writes-scope.cjs
LIMITS.md` → `proposed/human-only.patch`; each file's sha256 (node `crypto`) → `proposed/human-only.sha256`
     as `<hex>  <path>`;
   - the version check: no ADDED line of the patch matches `/\b6\.28\.\d+\b/` (§5), else exit 1;
   - `finally`: `git worktree remove --force`. Exit non-zero on any red.

   `check:reconcile` cannot go red in that worktree (never anchored), so it is not counted.

6. Delete `handoff/` and the runner (declared Bash writes). `git apply --check` the patch against this worktree.
7. Run the full suite in THIS worktree with the TAP reporter and record the failing test titles — the
   expected-fail list — in `BUILD.md`, each checked to be a test this build added or changed.
8. Write `proposed/apply.sh` (below) and `proposed/APPLY.md` with the Write tool.
9. `BUILD.md`: the runner's gate exits, both D1 counts, the probe table with exit codes (L37), the hook cost (L24),
   the expected-fail list. Then the floor: `node pharn/floor/validate.mjs .`.

## Chain sequencing — the designed verify stop, and review before apply

0. The branch is renamed `write-guard-narrowing` at commit time; `apply.sh` refuses `main`.
1. `/pharn-dev-grill` → `/pharn-dev-build` (procedure above) → the floor.
2. `/pharn-dev-regress` before the apply, over the outside gates (both edited hook suites are inside `## Files`);
   expected `no-regressions`.
3. `/pharn-dev-verify` → **expected `FAIL`, `failing_gates == ["test"]`**, the failing tests exactly
   `BUILD.md`'s list. GATE-1 decision 1 (approved): continue to `/pharn-dev-review` ONLY if
   `failing_gates == ["test"]` and the failing test titles from a TAP run equal `BUILD.md`'s expected-fail list,
   each shown passing in the runner's patched worktree; any other shape STOPs. Recorded in `VERIFY.md` and
   `SHIP.md` as a decision delegated to the orchestrating model, with the exact list.
4. `/pharn-dev-review` reviews the whole increment, `proposed/human-only.patch` included → **GATE 2**. The GATE-2
   report names the patch, its sha256 file, what `apply.sh` runs and the expected-fail list; it asks nobody to
   apply the patch — the orchestrator runs an independent review of it first.
5. Only after that review (and any fixes, which regenerate the patch): the maintainer reads the patch and runs
   `sh .dev/features/write-guard-narrowing/proposed/apply.sh` **in this worktree**, which holds the build's
   reconciliation baseline:

   ```sh
   #!/bin/sh
   set -eu
   F=.dev/features/write-guard-narrowing/proposed
   [ "$(git branch --show-current)" != "main" ] || { echo "apply.sh: refusing to commit the guard change on main" >&2; exit 1; }
   node pharn/floor/check-bash-reconcile.mjs --base . --require-baseline
   git apply --check "$F/human-only.patch"
   git apply "$F/human-only.patch"
   if ! { shasum -a 256 -c "$F/human-only.sha256" && node --test .claude/hooks/protect-trusted-paths.test.cjs .claude/hooks/enforce-writes-scope.test.cjs .claude/hooks/set-writes-scope.test.cjs .claude/hooks/hook-wiring.test.cjs .claude/hooks/writes-scope-release.test.cjs pharn/floor/run-marker.test.mjs pharn/floor/check-bash-reconcile.test.mjs pharn/floor/reconcile-baseline.test.mjs pharn/floor/check-spec.test.mjs pharn/floor/check-ac-tests.test.mjs pharn/floor/stage-verify.test.mjs .dev/floor/command-hygiene.test.mjs; }; then
     git checkout -- .claude/hooks/protect-trusted-paths.cjs .claude/hooks/enforce-writes-scope.cjs LIMITS.md
     echo "apply.sh: FAILED - the three files were restored from HEAD; nothing was committed" >&2
     exit 1
   fi
   git commit -q -m "fix(hooks): the write guards judge the path the kernel writes; the out-of-project allowance is this project's and this session's (human-applied)" -- .claude/hooks/protect-trusted-paths.cjs .claude/hooks/enforce-writes-scope.cjs LIMITS.md
   node .claude/hooks/set-writes-scope.cjs --from-plan .dev/features/write-guard-narrowing/PLAN.md
   node pharn/floor/reconcile-baseline.mjs --anchor --by write-guard-narrowing-apply
   echo "apply.sh: applied, tested and committed - resume at /pharn-dev-verify"
   ```

6. Resume at `/pharn-dev-verify` (expected `PASS`; not `/pharn-dev-regress` — the committed hooks would read as a
   scope escape there, L17), then commit, push and open the PR.

## Contracts satisfied

- No contract changes. `pharn/pharn-contracts/reconciliation-record.md` holds unchanged: the reconcile probes are
  in-repo paths, which neither change touches; no baseline is deleted or hand-edited anywhere in this plan.

## Evals and tests to write (P1)

No `role:` capability is added, so no eval pair is owed. The tests, each asserting the PATCHED hooks:

- **Protect (M4):** the reviewer's `s\x -> .` repros (trusted docs; `## Files`-origin canon) → 2, with
  `<raw> -> <physical>` in the message; a dangling link `evil -> s\x/docs/CODEOWNERS` (a backslash in its TEXT) → 2;
  a link `g\it -> .git` and a write to `g\it/config` → 2 (gitmeta, found only by the second reading); the
  promote-origin escape still allows `memory-bank/lessons-learned.md` (control) and refuses
  `memory-bank/x\..\lessons-learned.md`; a symlink inside canon from the authorized name to `pattern-library.md`
  → 2; a user's own `a\b.md` → 0; `pharn\CONSTITUTION.md` → 2 with the OLD message (no arrow). POSIX-only cases skip
  on `\` systems.
- **Enforce (M7), install, no scope, no run:** memory (1a) — the transcript's key allowed (`memory/note.md`,
  `memory/sub/deep.md`, a subagent transcript's key), another project's `MEMORY.md` → 2, the folder itself, the
  transcript file itself, `settings.json` → 2, and each malformed/absent `transcript_path` → 2; memory (1b), in real
  git sandboxes (the orchestrator's probe list) — a main-checkout session, a subdirectory session and a
  linked-worktree session each reach the main checkout's key; a forged `.git` file whose back-pointer names another
  worktree, a submodule-style gitdir with no `commondir`, a pointer that is a symlink, and a bare common dir each
  grant nothing (the transcript key still applies); scratchpad — own (valid id) → 0, another session's
  `scratchpad/gates.sh` and own `tasks/a.output` → 2, a mismatched id or no `scratchpad_dir` → 2, a case variant of
  `claude-<n>` → 2; HOME/config inside a fake TMPDIR — `settings.json`, `.zshrc` → 2, this project's memory there →
  0, an ordinary temp file → 0, HOME=`/` excludes nothing; the real environment (L41) — `/tmp/claude-<uid>/…`
  without a scratchpad → 2, `os.tmpdir()` file → 0, the default config dir's main-checkout key → 0; dev posture and
  a run open unchanged; the "This path qualifies" body with a run open and a transcript key.
- **Deny bodies (L27/L29):** the Claude-state variant in `everyDenyMessage()`; its cue present only there;
  "write it with the Bash tool" absent there; no slash-command citation in it; the variant for a `claude-<uid>`
  path with no usable payload fields never calls it "not scratch" (grill G1).
- **No echo (grill G4):** a `transcript_path`, `scratchpad_dir` and `session_id` each carrying a newline and
  imperative text never appear in any deny body, over every branch the permissive posture can reach.
- **Premises, asserted rather than assumed:** the L41 real-environment test skips (never fakes) when `~/.claude`
  lies in a git tree or is a symlink (grill G3); the 1b tests assert that git wrote the main checkout's realpath
  into the worktree's pointers before relying on it (grill G7 — measured this run on macOS: it does, through `/var`
  and `/private/var` alike).
- **✧ copy pin (L31):** `resolvePhysicalTarget`, `fsRootOf`, `MAX_LINK_HOPS`, `SEPARATORS` byte-equal between
  the two hooks; `realpathOr` named as the deliberate difference.

## Guarantee audit (P0)

- "protect denies a write whose target, read either way, is a protected path" → **floor: hook** (#1) over folded
  exact membership (#3), for `Write|Edit|MultiEdit|NotebookEdit` only; Bash is outside (`LIMITS.md §6`). A hard link
  is still caught only for the named files (unchanged bound).
- "the canon escape refuses a backslash-named target" → **floor: hook**, exact.
- "outside a run, the install posture allows out of the project only this project's memory folder, this session's
  scratchpad and ordinary temp paths" → **floor: hook** over path relations and the payload's fields — **given**
  those fields are Claude Code's. That the payload is Claude Code's, and that `transcript_path` names this project,
  is a property of the harness, not something the hook can verify: **advisory in that sense**, stated in LIMITS §7.
- "a missing or malformed field grants nothing" → **floor: hook**, tested per field.
- "the main checkout's key is the one Claude Code uses for auto-memory" → **advisory**: a mirror of an
  undocumented Claude Code derivation, read from its bundle and probed on this machine. What IS floor is the
  fail-closed direction: any step the mirror does not recognise grants nothing (tested per step).
- "the dev and unsignalled postures are unchanged" and "every old protect denial keeps its message" → **tested**
  (the D1 sweeps, measured once over the listed shapes), not a floor guarantee beyond them.
- "the patch applied is the patch verified" → **content-hash** (`shasum -a 256 -c` in `apply.sh`) — agreement
  between the runner and the applied bytes, not a signature (L43).
- "the human reviews and applies it once" → **advisory** (process).

## Trust audit (P2)

- **The payload's `session_id`, `transcript_path`, `scratchpad_dir`** are harness fields: a tool call sets
  `tool_input` only. They are validated (grammar, absolute, suffix) and used only as path operands and in exact
  comparisons; nothing from them is echoed into a message. An environment that is not Claude Code (a test, a
  reconcile probe) sends none, and gets the fail-closed reading.
- **Environment** (`CLAUDE_CONFIG_DIR`, `HOME`, `TMPDIR`) still widens the roots, as stated since 6.24.0; the
  exclusions read the same environment, so they move with it.
- **A backslash-named link** is attacker-plantable only through Bash (the Write tool cannot create a symlink); the
  fix closes the Write-tool write THROUGH such a link, which is what the guards cover.
- **The `.git` pointer files 1b reads** are repository metadata: the Write tool cannot write them
  (`protect-trusted-paths.cjs` denies any `.git` segment), and a Bash writer that forges them can already write the
  memory folder directly. The back-pointer and `worktrees/` checks mean a forged chain can only name a directory
  whose own `.git` the forger can write. Nothing read from them reaches a message.

## Determinism audit (P5)

Every branch is a membership test: a regex over the session id and a path segment, a suffix test, `path.relative`
containment, a folded-prefix test, and the existing rules. Where a field is absent or malformed, or a directory
cannot be determined, the allowance grants nothing (fail-closed). No model decides a verdict.

## Named follow-ups (recorded, not built — P7)

- `windows-claude-temp-layout` — `%TEMP%\claude\…` (no uid) is not matched by the `claude-<uid>` rule.
- `custom-auto-memory-dir` — `autoMemoryDirectory`, `CLAUDE_CODE_REMOTE_MEMORY_DIR` and
  `CLAUDE_COWORK_MEMORY_PATH_OVERRIDE` move auto-memory where the rule does not look (fail-closed friction, as in
  6.24.0).

## GATE 1 record

**APPROVED on 2026-09-27 by the orchestrator** — a decision made by the orchestrating model under the
maintainer's delegation, **not a human approval**. Its rulings:

1. Chain order approved as proposed (Chain sequencing, step 3), with the exact expected-fail list recorded in
   `VERIFY.md` and `SHIP.md`.
2. Memory key **B**, not A: the maintainer and PHARN's desktop-app users work in linked-worktree sessions, and A
   would silently regress D2's purpose there. The rule as ruled is §2 rule 1 (1a + 1b), with the probe list in
   "Evals and tests to write".
3. The canon backslash refusal: in. 4. The Claude-state variant: in. 5. Windows' layout: out, as the named
   follow-up.

Two requirements added at the gate: **no PHARN version string in the human-only bytes** (§5; the runner checks
it), and **nobody is asked to apply the patch at GATE 2** — the orchestrator reviews it independently first
(Chain sequencing, steps 4–5).

## Amended at grill (2026-09-27)

`/pharn-dev-grill` (`GRILL.md`): Step 1b GREEN; 7 advisory concerns (0 blocking-severity, 4 important, 3 minor),
each amended in place — G1 and G5/G6 in §2 "Messages" and "Where it lives", G2 in §4, G3, G4 and G7 in "Evals and
tests to write". None changes the design or the `## Files`.

## Amended in build (2026-09-27)

Three amendments, each made in place by `/pharn-dev-build` and recorded in `BUILD.md` ("Deviations"):

- §1 — the sentence naming when PASS 2 changes a verdict gained the canon link to another canon file. Checking the
  sentence against the two walks found it (PASS 1 takes the first canon match, the link's own name); a test pins it.
- §2 (1b) — the `<common>/worktrees` check compares lexically, as Claude Code does. The realpath form this plan
  first named disagrees with Claude Code at two edges — a `commondir` spelled through a symlink (realpath accepts
  it, Claude Code does not) and a `worktrees` directory that is itself a symlink (the reverse) — so the mirror now
  compares as Claude Code does. Either way the back-pointer check still has to hold.
- Chain sequencing, step 5 — the pinned `apply.sh` runs twelve suites: every suite that executes either guard or
  reads its source, found by grepping the test tree for the two hook names. `proposed/apply.sh` is byte-identical.

## Open questions (HALT)

- none.
