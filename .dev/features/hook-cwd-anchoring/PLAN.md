# PLAN — the write guards run, and judge the right tree, whatever Claude's current directory is

- spec_content_hash: 83890d9741dd2f63bfe5112a3fcd6d8c49fd3795233eee719e271eba16fd9487 # fix #4
- applied_lessons: [L1, L5, L7, L16, L17, L18, L19, L20, L22, L25, L26, L27, L29, L31, L34, L36, L37, L38, L40, L41, L42, L43, L44]
- increment: Wire both `PreToolUse` guards through `${CLAUDE_PROJECT_DIR}` so they cannot silently fail to start from another directory; anchor each guard's jurisdiction on the git working tree that contains Claude's current directory, so a subdirectory keeps the repo root and a worktree session is judged — and protected — as that worktree; and deny tool writes to git metadata, which that jurisdiction now depends on.
- layer(s): floor / hooks (`.claude/hooks/`, `.claude/settings.json`) — `pharn/ARCHITECTURE.md §2` primitive #1; product floor comment (`pharn/floor/check-bash-reconcile.mjs`); shipped docs (`pharn/floor/README.md`, `LIMITS.md`); repo-meta. Not a `pharn/` capability layer.
- constitution_refs: [P0, P2, P5, P6, P7]

## Applied lessons

- **L1** — the meta-docs this increment falsifies are scoped: `README.md` (badge, the wiring caveat, the two "with hooks wired … denied" sentences), `CLAUDE.md` (the out-of-root deny-message bullet and the root definition), `pharn/floor/README.md` (the wiring section), `CHANGELOG.md`, `SKILLS_VERSION`, and `LIMITS.md §6`'s two hook line-number cites.
- **L5** — the Bash tool's shell is zsh, which does not word-split an unquoted variable (reproduced this run: a `$G` git prefix failed with `command not found`). The pinned blocks therefore spell every path list literally, never through a list variable.
- **L7** — `## Files` names only what the agent writes. The four hook-protected files travel as a patch plus a human-run script, and sit under the exclusion heading, never in the scope.
- **L16** — a remedy can be its own portability trap. The fail-closed wrapper `… || exit 2` is rejected because Windows PowerShell 5.1 has no `||` (not probed); a parse failure there would stop the guard from ever starting.
- **L17** — the resume point after the human apply is `/pharn-dev-verify`, not `/pharn-dev-regress`: `check-regress.mjs:123` exempts only the four trusted docs, so a committed hook script would read as a scope escape on a correct workflow.
- **L18** — the exclusion block in `## Files` is its own `###` heading, so the setter's list ends structurally.
- **L19** — every Bash write is declared: worktree creation and its `EXIT` trap, the `cp` into it, the throwaway commit, patch and sums generation, staging removal, formatting, and the human's `apply.sh` (apply, test, commit, re-anchor).
- **L20** — this is the second occurrence. `protect-trusted-paths.cjs` header #2 records the first ("anchoring to cwd silently disabled the whole guard whenever the agent ran from a subdirectory"); its in-script fix left the same failure one layer up, in the wiring. The remedy is an executing test, not a comment.
- **L22** — the settings command strings, the verification block and `apply.sh` are pinned literally below.
- **L25** — four rationales that assert the old story are re-derived: `protect-trusted-paths.cjs` header #2, the ANCHOR comment at `protect-trusted-paths.test.cjs:185`, the `settings.json` `_comment`, and the scope-probe comment at `check-bash-reconcile.mjs:236`.
- **L26** — verification runs at the real path inside a `git worktree` of this repo. Handoff sources are staged inside the repo so eslint/prettier resolve the same root configs.
- **L27** — the out-of-root message offers Bash for "temporary/scratch" paths, and in bryff that remedy was reachable for code in a sibling worktree. The branch is split, and each remedy's reachability is asserted per branch.
- **L29** — the new branch joins `everyDenyMessage()`, so the existing per-branch rules iterate it. The wiring test enumerates the closed set of wired guard commands, and the parity matrix is one array the rules iterate.
- **L31** — `workTreeRoot()` is a deliberate copy-pair across two standalone hooks (a shared module would be a new control-surface file); one parity matrix executes both hooks.
- **L34** — every new rule is non-vacuous: exactly two wired guard commands, at least one parity row per shape, and a `.git` rule with allowed controls (`.github/`, `.gitignore`).
- **L36** — the wiring test asserts whole-string equality of each command, not the presence of `${CLAUDE_PROJECT_DIR}`.
- **L37** — the quantified claims were probed, including the members expected to fail; the prototype that exposed the protect-add assumption ran on real git 2.50.1 worktrees.
- **L38** — worktrees are L38's structural remedy, and the bryff logs show the contention; `.pharn/` stays per worktree.
- **L40** — the fail-open's cause was tested by varying the attributed condition: identical payloads give exit 2 from the repo root and exit 1 (`Cannot find module`) from `pharn/pharn-core`.
- **L41** — `protect-trusted-paths.test.cjs:189` ("cwd is a SUBDIRECTORY") spawns the hook by absolute path, so the production path (a relative command resolved in cwd) was exercised by nothing; the new test runs the real `settings.json` strings.
- **L42** — reconcile replays the live guards, so a human-applied control-surface change inside an epoch always reads as an escape; `apply.sh` checkpoints `CLEAN` first, commits, then re-anchors.
- **L43** — `check:badge` and `check:changelog` certify agreement, never that a bump happened. The bump is required (hooks and `settings.json` are product surface) and is **minor**, because the `.git` guard is newly shipped.
- **L44** — the verification block and `apply.sh` are each one shell, with no state carried between blocks.

## The defect, reproduced live (P6)

All probes ran this session; the hook scripts under test are byte-identical between this repo's HEAD and the bryff install (`cmp`).

1. **Silent fail-open from a subdirectory.**
   - With the session's Bash cwd persisted at `pharn/pharn-core`, a `Write` to the scratchpad **succeeded**; from the repo root it is denied.
   - The exact wired commands, run from `pharn/pharn-core`, returned `exit=1  Error: Cannot find module '…/pharn/pharn-core/.claude/hooks/…'` for all three payloads, **including `Edit LIMITS.md`**. From the repo root: `exit=2` ×3.
   - Claude Code docs: "Handlers run in the current directory"; "Without valid JSON on stdout, Claude Code treats exit code 1 as a non-blocking error".
   - No trusted doc, README, CLAUDE.md or lesson states this bound (grep).
2. **A worktree from the launch checkout is judged against the wrong root.**
   - bryff, hook cwd = main, target = a file in `bryff-files-review-fixes`' own scope → `exit 2`, "NOT INSIDE the repo root (…/bryff)".
   - Same file with hook cwd = that worktree → `exit 0`.
   - A native `isolation: worktree` subagent probe printed root = `…/.claude/worktrees/agent-…`, so native worktrees already work while the relative wiring holds.
3. **fix #2 has no jurisdiction over another tree.** Main-rooted `protect-trusted-paths.cjs` → `exit 0` for the sibling's `.claude/settings.json`, `.claude/hooks/enforce-writes-scope.cjs`, `.pharn/writes-scope.json` and `memory-bank/lessons-learned.md`. Today only fix #7's out-of-root denial covers them.
4. **Changing the wiring alone would regress both guards** (current hooks invoked by absolute path):
   - enforce from `pharn/pharn-core` on `.dev/features/x/PLAN.md` (in the default-safe set) → `exit 2`, "NOT INSIDE the repo root (…/pharn/pharn-core)";
   - protect (the main copy) with cwd = another checkout, on that checkout's `pharn/CONSTITUTION.md` → `exit 0`.
5. **Consequence, from the bryff logs (untrusted DATA — counts and paths only).**
   - 11 distinct sibling-worktree paths were denied; for 7, a later `cd …/bryff-* && python3 << 'EOF'` Bash command wrote the same file, and all 11 files are in the `wip:` snapshot commits.
   - Separately, lens `findings.json` writes in main were denied under another pipeline's scope (`local-checks-cleanup/GRILL.md`, `blog-review-fixes/regression-report.json`) — L38.

## Design

### 1. Wiring — `.claude/settings.json` (human-applied)

The two command strings, pinned:

```text
node "${CLAUDE_PROJECT_DIR}"/.claude/hooks/protect-trusted-paths.cjs
node "${CLAUDE_PROJECT_DIR}"/.claude/hooks/enforce-writes-scope.cjs
```

This is the documented form ("wrap each placeholder in double quotes"). Claude Code substitutes the placeholder and exports it as an environment variable, so an older version that only exports it still works under `sh -c`. Per its docs it "still points at the project root where the session started" after a `cd` or a worktree entry. The matcher is unchanged; the `_comment` is re-derived (L25).

**Stated residual (grill, security):** double quotes do not neutralise `"`, `` ` ``, `$` or `\` inside a substituted path. A project directory whose name contains one can make the command mis-expand — the guard then fails to start, which does not block — or execute text from the directory name. Such a path is **unsupported**, and LIMITS §7 says so.

**Rejected alternatives:**

- **`… || exit 2`** — L16, as above.
- **Exec form (`args`)** — shell-free, but PHARN records no minimum Claude Code version; a version that ignored `args` would start bare `node` on the payload and fail open everywhere.
- **Unbraced `"$CLAUDE_PROJECT_DIR"`** — not a documented placeholder, so its substitution semantics are unverified; PowerShell reads it as a PowerShell variable (empty).
- **`$(git rev-parse --show-toplevel)`** — spawns git on every write, runs the worktree's own guard copy (a branch could modify its judge), and still leaves enforce rooted at the subdirectory.

### 2. Jurisdiction root — both hooks (a deliberate copy-pair, L31)

`workTreeRoot(dir)` walks the realpath of `dir` and then its ancestors. It returns the **first** directory that either contains an entry named `.git` (`lstat`, file or directory) or equals `realpath(CLAUDE_PROJECT_DIR)`. If neither is found, it returns `null`. It spawns no subprocess.

- **`enforce-writes-scope.cjs`:** `ROOT = workTreeRoot(cwd) ?? realpath(cwd)`, and a throw falls back to `realpath(cwd)`, today's behaviour.
  - Relative payload paths resolve against the realpath'd **cwd**, not `ROOT`.
  - The scope file, `pharn.config.json` and `.dev/floor` are read at `ROOT`.
- **`protect-trusted-paths.cjs`:** the hook-location `ROOTS` stay byte-identical — seven mutant tests anchor on those lines. One root may then be **added**, never substituted, before `ROOT_PREFIXES` and the inode sets are computed. The add rule, exactly:
  1. `t = workTreeRoot(CWD)`. Nothing is added when `t` is `null` or already in `ROOTS`.
  2. If `t` holds **no** `.git` entry (the walk stopped at `CLAUDE_PROJECT_DIR`), nothing is added. Under the pinned wiring that stop is the hook root itself.
  3. Otherwise resolve `t`'s common directory `C(t)`:
     - a `.git` **directory** → its realpath;
     - a `.git` **file** → the `gitdir:` value resolved against `t`; then that directory's `commondir` resolved against it when readable, else the gitdir itself; realpath.
     - Anything unreadable, or a file with no `gitdir:` line, makes `C(t)` **unresolvable**.
  4. Each hook root `R` contributes `C(R)` only when `R` itself holds a `.git` entry. A root with no `.git` (a subpath install) contributes nothing.
  5. Add `t` **iff** `C(t)` is unresolvable (over-block, the safe direction) or equals a contributed `C(R)`. A resolvable, different `C(t)` is another repository and is not added.
- **Git metadata is write-protected (new guard — grill, security).** `protect-trusted-paths.cjs` denies any tool write whose folded key, relative to any guarded root (the added `t` included), contains `.git` as a path **segment** (`.git`, `.git/…`, `x/.git`, `x/.git/…`; never `.github/…` or `.gitignore`).
  - **Why this is part of making §2 safe:** `.git` entries decide both enforce's root and protect's add rule, and `.git/hooks` / `.git/config` run code on the next git command. Without it, a plan that declared a worktree's `.git` could re-point it and remove fix #2 from that worktree, which today's per-worktree hook copy prevents.
  - It is a separate rule with its own deny reason, not a `DEFAULT_PROTECTED` entry: the derived F4 invariant requires `vendor/third-party/<basename>` to stay writable.
  - The remedy it prints is the git command that owns the change, or a human; it names no Bash write.
- **The canon escape is bound to the target's root (grill, P2).** `canonWriteAuthorized()` reads the scope record only of the root under which the target matched. Without that, a promote-origin record in one tree would authorize the same relative canon path in another.

Worked cases — each is a parity-matrix row, and `protect adds` is the expected value the rule is tested against:

| Claude's cwd                                                                  | enforce `ROOT`  | protect adds  | note                                                                                                                            |
| ----------------------------------------------------------------------------- | --------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| repo root                                                                     | repo root       | —             | already a root                                                                                                                  |
| `pharn/pharn-core`                                                            | repo root       | —             | the probe #4 regression row                                                                                                     |
| `.claude/worktrees/w/src` (native worktree)                                   | `…/w`           | `…/w`         | same common dir                                                                                                                 |
| sibling worktree entered via `EnterWorktree`                                  | that worktree   | that worktree | same common dir; absolute or relative `gitdir:`                                                                                 |
| non-git project subdir, `CLAUDE_PROJECT_DIR` = project                        | project         | —             | the stop holds no `.git`                                                                                                        |
| `mono/apps/web/src`, `.git` at `mono`, `CLAUDE_PROJECT_DIR` = `mono/apps/web` | `mono/apps/web` | —             | the stop holds no `.git`                                                                                                        |
| cwd inside a different git repository                                         | that tree       | —             | different common dir                                                                                                            |
| cwd in a tree whose `.git` file cannot be resolved                            | that tree       | that tree     | over-block                                                                                                                      |
| non-git temp dir, no env var (every existing hermetic test)                   | cwd             | —             | today's behaviour                                                                                                               |
| PHARN installed at `apps/web`, entered via worktree `w` with cwd `w/apps/web` | `w`             | —             | the setter wrote `w/apps/web/.pharn/`; enforce reads `w/.pharn/` → default-safe-set. **Fail-closed residual** (grill, coupling) |

### 3. Deny message — a third branch (L27, L29)

The out-of-root branch splits on one predicate: **the resolved target has an ancestor holding a `.git` entry.** When it does, the Bash "temporary/scratch" bullet is replaced by a bullet whose every clause holds in both shapes the grill surfaced — another checkout or worktree, **or** the same repository outside this guard's root (the monorepo package boundary):

- the path belongs to a git working tree, but not to the tree this guard judges (`ROOT` is named);
- the remedy is to do the work from a session whose current directory is inside the project that owns the file (`EnterWorktree` with its path, a session launched there, or a subagent with `isolation: worktree`) and to set that project's scope there;
- it is not scratch, so writing it through Bash is prohibited.

The predicate is computed **before** `denyMessage()`, which stays pure string composition. A throw selects this no-Bash branch. The verdict stays `exit 2` in every branch.

**Stated residual:** a scratch path under a git-versioned home directory also takes this branch and loses the Bash scratch remedy (friction, not a hole).

### 4. `LIMITS.md` — human-applied patch

- **§6 cites.** The line numbers `enforce-writes-scope.cjs:333` (already stale; live is 338) and `protect-trusted-paths.cjs:555` (shifts with this change) are replaced by the symbol: the `isWrite` test in each hook.
- **New §7, appended: the guards act only when Claude Code starts them, and judge the tree Claude is in.**
  - A hook that cannot start, or that times out, does not block (docs, quoted).
  - An install whose `settings.json` still carries the relative form stays fail-open from every other directory, and `pharn update` never touches that file (pharn-cli `docs/commands/update.md:302`).
  - When Claude's current directory no longer exists, Claude Code runs hooks from the session-start directory, the project root, home or temp. Jurisdiction then becomes that directory.
  - A project path containing `"`, `` ` ``, `$` or `\` is unsupported (§1 residual).
  - Jurisdiction is the working tree containing Claude's current directory: a session cannot write another worktree by path (denied, not unguarded), and a launch-checkout session writing into a nested `.claude/worktrees/<w>/` by path is judged by its own scope, which could name that worktree's hooks if declared.
  - A `.git` entry is trusted as a boundary; tool writes to git metadata are denied, and Bash still reaches it.
  - A PHARN subpath install entered through a worktree reads the wrong scope record and falls back to the default-safe-set (fail-closed).
- `THREAT-MODEL.md` stays byte-identical. §7 bounds its §4 items 2 and 7 through LIMITS' own precedence clause ("If a claim elsewhere contradicts a limit named here, the limit wins").

### 5. Migration for existing installs (`CHANGELOG`, `README`)

Order matters, because probe #4 shows the anchored wiring over pre-fix hooks regresses both guards:

- **Upgrade:** run `pharn update` first (hooks), then change the two `settings.json` commands.
- **Rollback:** restore the relative commands first, then downgrade the hooks.

### Named follow-ups (P7 — recorded, deliberately unbuilt here)

- **`worktree-target-jurisdiction`** — let a session write a registered sibling worktree **by path**. The trigger is real (bryff), but the design is larger; after this increment the supported routes are `EnterWorktree`, subagent isolation, or one session per worktree.
- **`hook-wiring-check`** (grill, observability) — an in-tree floor check that REDs a stage when `settings.json` does not wire the anchored form. It is a new checker, beyond the approved scope, and is put to the human at GATE 2 (P5).
- **pharn-cli** — `pharn status` / `update` should warn on the relative form; that lives in the other repo.
- **Setter from a subdirectory** — `node .claude/hooks/set-writes-scope.cjs` in command prose fails loudly there (exit 1, visible). That failure is closed, so it is left alone.

## Files

- `.claude/hooks/enforce-writes-scope.test.cjs` — EDIT. Root cases (both postures from a subdirectory with and without a scope), the third deny branch in `everyDenyMessage()`, and the ✧ parity matrix — layer floor/hook tests
- `.claude/hooks/protect-trusted-paths.test.cjs` — EDIT. The add rule, the git-metadata rule, the canon record binding, and the ANCHOR comment re-derived — layer floor/hook tests
- `.claude/hooks/hook-wiring.test.cjs` — NEW. Executes the real `settings.json` command strings from a subdirectory — layer floor/hook tests
- `.dev/features/hook-cwd-anchoring/handoff/settings.json` — NEW. Transient staging source, removed after patch generation — layer dev artifact
- `.dev/features/hook-cwd-anchoring/handoff/enforce-writes-scope.cjs` — NEW. Transient staging source — layer dev artifact
- `.dev/features/hook-cwd-anchoring/handoff/protect-trusted-paths.cjs` — NEW. Transient staging source — layer dev artifact
- `.dev/features/hook-cwd-anchoring/handoff/LIMITS-section-7.md` — NEW. Transient fragment appended to `LIMITS.md` in the verification worktree — layer dev artifact
- `.dev/features/hook-cwd-anchoring/proposed/human-only.patch` — NEW. Generated by Bash from the verification worktree — layer dev artifact
- `.dev/features/hook-cwd-anchoring/proposed/human-only.sha256` — NEW. Generated by Bash from the same worktree, in `shasum -c` format — layer dev artifact
- `.dev/features/hook-cwd-anchoring/proposed/apply.sh` — NEW. The human-run apply script pinned below — layer dev artifact
- `.dev/features/hook-cwd-anchoring/proposed/APPLY.md` — NEW. What the script does, what to read first, and where to resume — layer dev artifact
- `pharn/floor/check-bash-reconcile.mjs` — EDIT. Comment only: the scope-probe rationale gains the added cwd root — layer product floor
- `pharn/floor/README.md` — EDIT. The wiring section states the anchored command form, why the relative form fails open, how a worktree session is judged, and the git-metadata rule — layer shipped doc
- `README.md` — EDIT. Badge `pharn-6.0.0` → `pharn-6.1.0`; the wiring caveat with the upgrade/rollback order (lines 179–183); the "with hooks wired … denied" sentences (lines 194, 450) qualified — layer repo-meta
- `CLAUDE.md` — EDIT. The writes-scope out-of-root bullet (three branches), the jurisdiction-root definition, and hard constraint #1's wiring and git-metadata bounds — layer repo-meta
- `CHANGELOG.md` — EDIT. One `### Fixed` entry under `[Unreleased]`, with the minor bump and the ordered migration — layer repo-meta
- `SKILLS_VERSION` — EDIT. `6.0.0` → `6.1.0` (minor: a newly shipped guard alongside the correction) — layer repo-meta

### Explicitly not touched by the agent

- `.claude/settings.json`, `.claude/hooks/enforce-writes-scope.cjs`, `.claude/hooks/protect-trusted-paths.cjs`, `LIMITS.md` — hook-protected (fix #2). Applied only by a human, through `proposed/apply.sh`. The setter refuses the first three without `--allow-claude-dir`, and fix #2 denies all four regardless of scope.
- `THREAT-MODEL.md` — byte-identical (see Design §4).
- `.claude/hooks/set-writes-scope.cjs` — no change (the subpath-in-worktree mismatch is a stated fail-closed residual).
- `MIN_CLI` — stays `0.5.0`. Nothing is relocated; any CLI installs this tree intact, and none writes over an existing `settings.json`.
- `docs/capabilities/**` and the README `CURRENT-STATE` region — the hook count is unchanged and tests are excluded, so no regeneration.

## Build procedure (pinned — L5, L22, L26, L44)

After Step 2b formatting and before the floor, run **one** block from the repo root:

```bash
set -eu
R="$(pwd)"; S="$(mktemp -d)"; W="$S/wt"; F=.dev/features/hook-cwd-anchoring
trap 'git -C "$R" worktree remove --force "$W" 2>/dev/null || true; rm -rf "$S"' EXIT
git worktree add --detach "$W" HEAD
ln -s "$R/node_modules" "$W/node_modules"
cp "$R/$F/handoff/settings.json" "$W/.claude/settings.json"
cp "$R/$F/handoff/enforce-writes-scope.cjs" "$W/.claude/hooks/enforce-writes-scope.cjs"
cp "$R/$F/handoff/protect-trusted-paths.cjs" "$W/.claude/hooks/protect-trusted-paths.cjs"
cat "$R/$F/handoff/LIMITS-section-7.md" >> "$W/LIMITS.md"
node -e 'const fs=require("fs"),f=process.argv[1],s=fs.readFileSync(f,"utf8"),a="(`enforce-writes-scope.cjs:333`,\n`protect-trusted-paths.cjs:555`)",n=s.split(a).length-1;if(n!==1){console.error("LIMITS cite: expected 1 match, got "+n);process.exit(1)}fs.writeFileSync(f,s.replace(a,"(the `isWrite` test in each of `enforce-writes-scope.cjs` and\n`protect-trusted-paths.cjs`)"))' "$W/LIMITS.md"
for f in .claude/hooks/enforce-writes-scope.test.cjs .claude/hooks/protect-trusted-paths.test.cjs .claude/hooks/hook-wiring.test.cjs pharn/floor/check-bash-reconcile.mjs pharn/floor/README.md README.md CLAUDE.md CHANGELOG.md SKILLS_VERSION; do cp "$R/$f" "$W/$f"; done
git -C "$W" add -- .claude/settings.json .claude/hooks/enforce-writes-scope.cjs .claude/hooks/protect-trusted-paths.cjs LIMITS.md .claude/hooks/enforce-writes-scope.test.cjs .claude/hooks/protect-trusted-paths.test.cjs .claude/hooks/hook-wiring.test.cjs pharn/floor/check-bash-reconcile.mjs pharn/floor/README.md README.md CLAUDE.md CHANGELOG.md SKILLS_VERSION
git -C "$W" -c user.name=pharn-verify -c user.email=verify@localhost commit -q -m "throwaway: verify hook-cwd-anchoring"
(cd "$W" && npm run check)
mkdir -p "$R/$F/proposed"
git -C "$W" diff HEAD~1 HEAD -- .claude/settings.json .claude/hooks/enforce-writes-scope.cjs .claude/hooks/protect-trusted-paths.cjs LIMITS.md > "$R/$F/proposed/human-only.patch"
(cd "$W" && shasum -a 256 .claude/settings.json .claude/hooks/enforce-writes-scope.cjs .claude/hooks/protect-trusted-paths.cjs LIMITS.md) > "$R/$F/proposed/human-only.sha256"
rm -r "$R/$F/handoff"
```

Three details are load-bearing:

- **The `EXIT` trap** removes the worktree and the temp dir on every exit, including a red `npm run check`.
- **The throwaway commit** is needed because `check:reconcile` compares the control surface against `HEAD` (`check-bash-reconcile.mjs:350-368`), and an uncommitted guard change would read as an escape. The worktree's removal leaves the commit unreachable. In that worktree `check:reconcile` therefore **cannot** go red, and it is not counted as verification of the patch.
- **The agent commits nothing in the main tree.**

## Chain sequencing — a designed STOP at verify

0. Branch `fix/hook-cwd-anchoring` exists before build; `apply.sh` refuses to commit on `main`.
1. `/pharn-dev-grill` → `/pharn-dev-build`: anchor at Step 0; write the files; run the verification block; floor.
2. `/pharn-dev-regress` runs **before** the apply, over the outside gates.
3. `/pharn-dev-verify` → **expected `FAIL`** (`test`): the new tests assert against the still-unpatched live hooks and the relative wiring. This is the floor reporting un-applied human-only state, not a defect (precedent: `deny-message-phantom-commands/SHIP.md` step 5a). `reconcile` is CLEAN here.
4. **The human reads `proposed/human-only.patch`, then runs `sh .dev/features/hook-cwd-anchoring/proposed/apply.sh`**:

   ```sh
   #!/bin/sh
   set -eu
   F=.dev/features/hook-cwd-anchoring/proposed
   [ "$(git branch --show-current)" != "main" ] || { echo "apply.sh: refusing to commit the guard change on main" >&2; exit 1; }
   node pharn/floor/check-bash-reconcile.mjs --base . --require-baseline
   git apply --check "$F/human-only.patch"
   git apply "$F/human-only.patch"
   if ! { shasum -a 256 -c "$F/human-only.sha256" && node --test .claude/hooks/enforce-writes-scope.test.cjs .claude/hooks/protect-trusted-paths.test.cjs .claude/hooks/hook-wiring.test.cjs; }; then
     git checkout -- .claude/settings.json .claude/hooks/enforce-writes-scope.cjs .claude/hooks/protect-trusted-paths.cjs LIMITS.md
     echo "apply.sh: FAILED - the four files were restored from HEAD; nothing was committed" >&2
     exit 1
   fi
   git commit -q -m "fix(hooks): anchor the write guards on CLAUDE_PROJECT_DIR and Claude's work tree (human-applied)" -- .claude/settings.json .claude/hooks/enforce-writes-scope.cjs .claude/hooks/protect-trusted-paths.cjs LIMITS.md
   node .claude/hooks/set-writes-scope.cjs --from-plan .dev/features/hook-cwd-anchoring/PLAN.md
   node pharn/floor/reconcile-baseline.mjs --anchor --by hook-cwd-anchoring-apply
   echo "apply.sh: applied, tested and committed - resume at /pharn-dev-verify"
   ```

   What each step buys:
   - **The checkpoint** stops the script unless the build's epoch reconciles `CLEAN`, so the re-anchor erases no detected escape (the concern `pharn-dev-build.md:42` names).
   - **Tests on the applied bytes, with restore-on-failure,** mean unverified guard bytes never stay live or reach a commit.
   - **The path-scoped commit** clears `check-bash-reconcile.mjs`'s `HEAD` comparison for the guards and carries the human's own authorship.
   - **Setter-then-anchor** mirrors build Step 0's order (L38); the new snapshot authorizes the uncommitted always-reconciled `pharn/floor/` edits.

5. **Resume at `/pharn-dev-verify`** (L17), then `/pharn-dev-review` → GATE 2.

## Contracts satisfied

- None newly. The apply procedure consumes `pharn/pharn-contracts/reconciliation-record.md` within its stated bounds: no baseline is deleted or hand-edited, and a new epoch is opened by the command itself, only after a `CLEAN` verdict. `finding-shape.md` is unchanged. No `role:` frontmatter is added, so `validate.mjs`'s capability walk is unaffected.

## Evals to write (P1)

No capability is added, so the capability-eval obligation does not attach. The behavior is pinned by hook tests, each an exit-code or string assertion.

**`enforce-writes-scope.test.cjs`** — git fixtures use explicit `-c user.name/user.email`, and `CLAUDE_PROJECT_DIR` is set or removed per case (L41):

- **Subdirectory with a scope.** A declared file is allowed and an undeclared one denied; the scope is read from the sandbox root, and a decoy `.pharn/writes-scope.json` in the subdirectory is ignored.
- **Subdirectory with no scope (the probe #4 regression), both postures.** A dev-repo sandbox allows `.dev/features/x/PLAN.md` from a subdirectory; an installed-project sandbox allows `pharn/features/x/SPEC.md` and denies `.dev/features/x/PLAN.md`.
- **Relative payload from a subdirectory** resolves against cwd: scope `a/x.md` allows `x.md` from `a/`, and scope `x.md` does not.
- **Native worktree** (`git worktree add <main>/.claude/worktrees/w`): with cwd inside `w`, only `w`'s scope applies.
- **`CLAUDE_PROJECT_DIR` stops** — a non-git project and a monorepo package — root = the stop, visible in the out-of-root message.
- **Fallback:** a non-git temp dir with no env var → root = cwd.
- **Three deny branches, both directions (L27).**
  - Out-of-root targets inside a sibling git tree and inside the same repository outside a package root carry the work-tree remedy and no Bash cue.
  - A non-git out-of-root target carries the Bash cue and no work-tree cue.
  - All three branches exit 2, and `everyDenyMessage()` enumerates all three.
- **✧ parity matrix (L31, L34).** Every Design §2 row runs through both hooks. enforce's printed root must equal the row's `enforce ROOT`. protect must deny `<added root>/LIMITS.md` exactly where the row's `protect adds` is a root, and allow it where the row says `—`.

**`protect-trusted-paths.test.cjs`:**

- **Worktree protection.** Hook invoked from checkout A, cwd = worktree B of the same repository (absolute and relative `gitdir:`) → B's `pharn/CONSTITUTION.md`, `.claude/settings.json`, `.pharn/writes-scope.json`, `memory-bank/lessons-learned.md` → exit 2 each.
- **Different repositories.** cwd inside a different git repository → its root `LIMITS.md` → exit 0. The subpath install with a git outer (hook root holds no `.git`) → exit 0.
- **No over-block.** cwd = `docs/` of a git sandbox → a user's `docs/THREAT-MODEL.md` → exit 0. A `CLAUDE_PROJECT_DIR` stop with no `.git` adds nothing.
- **Unresolvable `.git` file** in the cwd tree → that tree's `LIMITS.md` → exit 2.
- **Git metadata** — `.git/config`, `.git/hooks/pre-commit`, `.GIT/config`, a nested `.claude/worktrees/w/.git`, a planted `src/.git` → exit 2, with its own deny reason. Controls `.github/workflows/x.yml`, `.gitignore`, `docs/git.md` → exit 0.
- **Canon record binding.** A promote-origin record in root A does not authorize the same canon key under root B, while it still authorizes A's own.

**`hook-wiring.test.cjs`** (the `sh` cases skip on `win32`; CI is `ubuntu-latest`):

- **Closed set (L29, L34, L36).** The `Write|Edit|MultiEdit|NotebookEdit` matcher carries exactly two command hooks, whose strings equal the two pinned in Design §1.
- **From `pharn/pharn-core`.** Each pinned string runs under `/bin/sh -c` with the placeholder substituted by the repo root and `CLAUDE_PROJECT_DIR` exported: protect on `Edit <repo>/LIMITS.md` → exit 2; enforce on `Write <tmpdir>/pharn-wiring-probe.md` → exit 2 (both scope-independent).
- **Negative control (L40).** The old relative strings, run the same way, exit neither 0 nor 2.
- **Control from the repo root.** Both pinned strings → exit 2.

## Guarantee audit (P0)

- **"Both guards run whatever Claude's current directory is"** → **floor: hook**, NARROWED:
  - only with the pinned wiring — an install keeping the relative form stays fail-open from any other directory, and no PHARN command rewrites that file;
  - only when Claude Code substitutes the placeholder and can start `node` — a hook that cannot start, or times out, does not block (docs, not probed);
  - "current directory" is the hook process's cwd, which Claude Code sets to the session-start directory, the project root, home or temp when Claude's own directory no longer exists;
  - a project path containing `"`, `` ` ``, `$` or `\` is unsupported;
  - pinned by `hook-wiring.test.cjs` under `sh -c` on the CI OS at `npm test` time, while the Git Bash and PowerShell paths are executed by no test.
- **"The writes-scope is judged against the working tree containing Claude's current directory"** → **floor: hook**, NARROWED:
  - a `.git` entry is not verified to be a repository — the new metadata rule denies creating one through the write tools, and Bash still can;
  - a cwd inside a submodule or vendored checkout is judged against that tree (over-block);
  - a PHARN subpath install entered through a worktree reads the wrong record and falls back to the default-safe-set (fail-closed).
- **"fix #2 protects the tree Claude is working in"** → **floor: hook**, NARROWED:
  - only a tree sharing a hook root's git common directory, or one whose common directory cannot be resolved;
  - another repository stays unguarded by fix #2, as today;
  - a launch-checkout session writing into a nested worktree by path is judged by fix #7 and its own scope.
- **"Tool writes cannot change git metadata"** → **floor: hook** (segment membership over the folded root-relative key), NARROWED to the `Write`/`Edit`/`MultiEdit`/`NotebookEdit` surface under a guarded root. Bash reaches `.git` as it reaches everything.
- **"A session can write a sibling worktree by path"** → **STRUCK.** Still denied (out-of-root); deferred as `worktree-target-jurisdiction`.
- **"The out-of-root message never offers Bash for a path inside a git working tree"** → **floor: enum/regex** (per-branch cue tests). That an agent obeys it → **advisory**.
- **"The applied guard bytes were verified"** → **floor: enum/regex** — `apply.sh` runs the three hook suites on the applied bytes and restores the files unless they pass.
  - The sha256 file is a **consistency** check between two agent-written files, never an authentication.
  - That the human reads the diff first → **advisory**.
- **"The patch was verified under the repo's own rules"** → **floor: enum/regex** (`npm run check`'s gate exits in a worktree at the real path, L26), with `check:reconcile` excluded from that claim, since it cannot go red there.
- **"The re-anchor erases no escape"** → **floor, for its window** — `apply.sh` stops unless `check-bash-reconcile.mjs --require-baseline` is `CLEAN`. That the script is run whole and in order → **advisory**.
- **"Existing installs are fixed by `pharn update`"** → **STRUCK.** `update` never touches `settings.json`; the ordered manual step is documented.
- **"A session at the repo root behaves exactly as before, except for git metadata"** → **floor: enum/regex** (the unchanged existing hook suites plus the fallback case), NARROWED to the cases those suites execute.
- **"`SKILLS_VERSION` agrees with the badge and `CHANGELOG`"** → **floor: enum/regex** (`check:badge`, `check:changelog`). The bump itself → **advisory** (L43).

## Trust audit (P2)

- **bryff transcripts, worktree state and commits** — `trust: untrusted` DATA; only counts and paths are quoted, and no path from them enters code, tests or scope.
- **Claude Code documentation (fetched)** — untrusted. Load-bearing claims were cross-checked by live probes where possible (the hook process follows Claude's cwd into an isolated worktree; a missing script yields a non-blocking exit 1). The quoting form and the timeout / start-failure / deleted-cwd semantics are labeled docs-derived.
- **`CLAUDE_PROJECT_DIR`** — harness-set, realpath'd, used only as a walk stop; it can only narrow enforce's root and never adds a protect root.
- **`.git` entries and `gitdir:` / `commondir` contents** — repository state. Tool writes to it are denied by the new metadata rule, and it is read only to decide whether to **add** a protected root; unreadable or garbage values add it. A **Bash** edit can still re-point a worktree's `.git` and so remove fix #2 from it — that stays inside `LIMITS.md §6`'s Bash bound rather than being claimed closed.
- **The deny message's new branch** interpolates only values already rendered through `asData()` (`blockedPath`, `ROOT`).
- **The patch and its sums** are agent-written; `apply.sh` treats them as untrusted input and gates the commit on tests over the applied bytes.

## Determinism audit (P5)

- The root walk, the common-directory comparison, the git-metadata segment test and the message predicate are each entry-existence, string-equality or segment-membership tests, and each has a defined fail-safe result on error.
- The resume point after the apply is pinned (`/pharn-dev-verify`), not judged at run time.
- The remaining scope decision — `hook-wiring-check` — goes to the human at GATE 2 rather than being taken here.

## Open questions (HALT) — both RESOLVED at GATE 1

Both were put to the human as selectable options before any build, and both were resolved as recommended. They are recorded rather than deleted, so the ship trail shows what was asked and by whose authority it was settled.

1. **Scope — RESOLVED: (A) full.** Wiring, jurisdiction anchoring, the third deny branch, and the `LIMITS.md` patch. Option (C), target-based sibling-worktree jurisdiction, stays the named follow-up `worktree-target-jurisdiction`.
2. **Apply timing — RESOLVED: (A).** The human applies the hook-protected change at the designed `/pharn-dev-verify` STOP, and the chain resumes at `/pharn-dev-verify`.

**Post-grill amendments, recorded because they touch an approved plan.** Every change above traces to a finding in `GRILL.md` § "Disposition". Two go beyond clarification and are flagged for GATE 2:

- the **git-metadata guard**, without which this design would let a plan remove fix #2 from a worktree;
- the resulting **minor** bump (`6.1.0`).

Nothing else widens the approved scope. **No open question remains**, so `/pharn-dev-build`'s refusal condition (an unresolved HALT) does not apply.
