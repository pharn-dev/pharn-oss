# PLAN — worktree-session-root: both write guards judge the tree the session is in, read from the payload's `cwd`

- spec_content_hash: 8566b4432ed6cc7035de5d925dafe3755086e23b12acacde0dcdda07a43a9167
- applied_lessons: [L26, L31, L37, L45, L68, L88]
- increment: 7.26.2 (PATCH) — `enforce-writes-scope.cjs` and `protect-trusted-paths.cjs` take Claude's current
  directory from the PreToolUse payload's `cwd` field (an existing absolute directory), not only from the hook
  process's own directory, so a session working in a git worktree is judged against that worktree and the
  worktree's own trusted docs and control surface are guarded.
- layer(s): the two write guards (control surface — the maintainer's patch), `pharn/LIMITS.md §7` (trusted doc —
  the maintainer's patch), `.claude/settings.json` `_comment` (control surface — the maintainer's patch), hook tests,
  product floor README, dev guide, root README, release files
- constitution_refs: [P0, P2, P5, P6, P7]

## Applied lessons

- L26 — the patched hooks were verified at the real path: a full `git clone` of this worktree in the scratchpad, with
  `npm ci`, the guards' own suites, prettier, eslint and markdownlint resolving the repo's own configs; build Step 2
  and verify re-run every gate in the worktree itself.
- L31 — `payloadCwd()` is a new deliberate copy in both guards: a ✧ test pins the two bodies byte-equal, and the
  existing parity matrix gains a payload variant that runs every row through BOTH guards with the session's
  directory in the payload.
- L37 — every quantified sentence the increment writes is executed: "a move never puts a launch-tree file under
  another tree's rules" by the enclosing-tree test (an outer scope of `**` still denies `pharn/floor/x.mjs`) and the
  launch-path test (a launch scope of `**` reaches nothing from a worktree session); "an unusable `cwd` is ignored"
  over eight values.
- L45 — the defect is in the scripts, not the wiring, but the tests run each guard the way Claude Code did in the
  measured session (process cwd = the launch checkout, `CLAUDE_PROJECT_DIR` set, the session in the payload), with a
  negative control: the same writes without `cwd` are denied as `.claude/**`.
- L68 — four files are human-only (the two guards, `.claude/settings.json`, `pharn/LIMITS.md`). The maintainer runs
  one patch script after GATE 1 and it is committed BEFORE `/pharn-dev-build` Step 0 anchors, so reconcile never sees
  it as an escape. No version number appears in the patched text, so a renumber never needs a second patch.
- L88 — this is the before-Step-0 route, so the script is handed over at GATE 1 to run at once; its own refusal is
  the pre-image check (every file must hold its 7.26.1 bytes, else it changes nothing and exits 1, so a second or
  late run refuses). It is never handed over after the build anchors.

## The failure (P7, measured)

pharn-ci CORE-409 (`/pharn-loop` from a desktop-app worktree at `.claude/worktrees/core-409-…`) stopped at Step 1a:
the Write to `pharn/.run/feature-name/candidate.txt` was denied as `.claude/worktrees/<name>/pharn/.run/…`. Three
sibling pharn-ci worktree sessions are blocked the same way, and this session's own probe Write to
`pharn/.run/probe.txt` was denied identically (Claude Code 2.1.332). Root cause: both guards compute their root from
`process.cwd()`; Claude Code starts the hook in `$CLAUDE_PROJECT_DIR` (the main checkout) and passes Claude's
directory only as the payload's `cwd`.

Reproduced on a fixture (main checkout + `.claude/worktrees/w`, both guards installed in the main checkout as
`${CLAUDE_PROJECT_DIR}` names them, dev posture), 7.26.1 hooks vs patched:

| guard / target in the worktree                   | process cwd = worktree | = main (7.26.1) | = main (patched) |
| ------------------------------------------------ | ---------------------- | --------------- | ---------------- |
| enforce `pharn/.run/feature-name/candidate.txt`  | 0                      | **2**           | 0                |
| enforce `pharn/features/x/SPEC.md`               | 0                      | **2**           | 0                |
| protect `.claude/hooks/enforce-writes-scope.cjs` | 2                      | **0**           | 2                |
| protect `.claude/settings.json`                  | 2                      | **0**           | 2                |
| protect `pharn/LIMITS.md`                        | 2                      | **0**           | 2                |

The protect half is an UNDER-protection: once enforce judges the worktree, a worktree path enforce allows (any
in-project path in an installed project with no run open — `CODEOWNERS`, say) would have had no trusted-file guard.
So both guards change together.

## Design

- **Both guards:** read stdin first (hoisted `readStdin()`), `PROCESS_CWD` = the old `CWD`, `SESSION_CWD =
payloadCwd(raw)`, `CWD = SESSION_CWD ?? PROCESS_CWD` (relative payload paths mean the session's directory).
  `payloadCwd()` returns the realpath of the payload's `cwd` when it is a non-empty, NUL-free, absolute path to an
  existing directory, else null; it reads that one field and never renders it.
- **enforce:** `ROOT = sessionRoot(workTreeRoot(PROCESS_CWD) ?? PROCESS_CWD, SESSION_CWD)`. The session's tree
  (`workTreeRoot(SESSION_CWD)`) replaces the launch root unless (a) there is no usable session directory, (b) it is
  in no git tree and under no project dir (an added working directory), or (c) the session's tree strictly encloses
  the launch root. Nested and disjoint trees replace it; their paths are their own, and with a nested root every
  launch-tree path outside it is out of root (denied). `workTreeRoot()` is unchanged, so its three-copy pin holds.
- **protect:** the root-adding block runs for both directories (process, then session), same rule as today: add the
  tree when it shares a hook root's git common dir or that cannot be read. Roots are only ever added, so the change
  can only over-block. `process.argv[1]` still resolves against `PROCESS_CWD`.
- **Moving `cwd`** (after a Bash `cd`): jurisdiction follows the session; stated in `pharn/LIMITS.md §7`.
- **Not in this increment (named follow-up):** `require-loop-record.cjs` (the `/pharn-loop` Stop guard) has the same
  root logic, so in a worktree session it reads the main checkout's markers and is INERT — fail-open by design, so it
  blocks nothing; it is not a write guard and the task names the write guards.

## Files

- `.claude/hooks/enforce-writes-scope.test.cjs` — 29 new cases (both postures; negative control; enclosing tree;
  no-tree directory; relative path; eight unusable `cwd` values; payload parity over every row; the `payloadCwd` pin;
  round 2: a non-git launch directory, a vendored clone, a different repository, the launch checkout's own docs, two
  case-variant `cwd` spellings)
  — hook tests
- `.claude/hooks/protect-trusted-paths.test.cjs` — the argv[1] mutant's anchor follows the renamed `PROCESS_CWD` —
  hook tests
- `.claude/hooks/hook-wiring.test.cjs` — header comment: Claude Code can start a hook outside Claude's directory — hook
  tests
- `pharn/floor/README.md` — the guards' paragraph says the directory comes from the payload's `cwd` — product floor doc
- `.dev/guides/writes-scope.md` — "The root every scope entry is relative to" gains the payload rule — dev guide
- `README.md` — the wiring paragraph's sentence, and the version badge — root doc
- `CHANGELOG.md` — `## [7.26.2]` with this entry — repo meta
- `SKILLS_VERSION` — 7.26.1 → 7.26.2 — repo meta
- `pharn-install.json` — regenerated (`npm run docs:generate`): the four patched files' hashes and the version —
  generated

### Not in `## Files` — the maintainer's patch (human-only, fix #2)

`apply_worktree_session_root.py <repo>` replaces `.claude/hooks/enforce-writes-scope.cjs`,
`.claude/hooks/protect-trusted-paths.cjs`, `.claude/settings.json` and `pharn/LIMITS.md` with bytes verified in a
scratch clone (sha256 pre → post: `e41e56c8…→11a33acc…`, `bdac155c…→f836204c…`, `f7f867f8…→aabae593…`,
`788b3dcd…→7fc572bf…`). It refuses unless all four hold their 7.26.1 bytes. Run after GATE 1, committed by the
orchestrator before build Step 0 (L68).

## Build round 2 (after the independent review)

The review (a read-only subagent, run while round 1's regress measured) found a widening patch 1 introduced: with a
NON-git launch directory under a temp root holding an installed git tree, and the payload `cwd` in that tree, the
launch directory's own `pharn/floor/x.mjs`, `pharn.config.json` and `.claude/settings.json` went from exit 2 to 0 (its
paths read as ordinary temp paths to the nested tree's permissive posture), contradicting the §7 sentence patch 1
wrote. It also found that `payloadCwd()`'s JS realpath keeps a case-variant spelling, which defeated the
enclosing-tree comparison and denied every write for a case-variant spelling of the launch checkout.

- Round 1's in-flight regress was stopped before it reported; round 1's epoch was reconciled first: `CLEAN`, no
  escapes.
- Maintainer's patch 2 (`apply_worktree_session_root_2.py`, pre-image = patch 1's bytes, committed `6314c131` before
  this round's anchor, L68): enforce keeps `LAUNCH` as a constant and denies, as `other-tree`, any target inside it
  (spelled or folded) whenever `ROOT` is not `LAUNCH`, before any out-of-project allowance; both `payloadCwd()` copies
  use `fs.realpathSync.native`; the §7 sentence and two comments are corrected.
- This round re-sets the scope from this PLAN and re-anchors, then rewrites the test file (six new cases, three of
  which fail against patch 1), the CHANGELOG entry and the manifest. Regress and verify run on this round only.

## Contracts satisfied

- `pharn/pharn-contracts/reconciliation-record.md` — unchanged; reconcile asks the live guards, which a process-cwd
  call (no payload `cwd`) still judges exactly as before.

## Evals to write (P1)

- No capability changes (hooks and tests only); the hook suites are the evals.

## Guarantee audit (P0)

- "a worktree session's writes are judged against the worktree" → floor: hook (enforce), executed by the tests.
- "the worktree's trusted docs and control surface are guarded" → floor: hook (protect), executed by the tests.
- "a moved `cwd` never widens a launch-tree file" → floor: hook, executed for the enclosing-tree and launch-path
  cases; BOUNDED: a `Bash`-planted `.git` turns a directory into a tree (stated in §7).
- "the payload's `cwd` is the harness's" → advisory: the guards check its shape only (an existing absolute dir).

## Trust audit (P2)

- payload `cwd` → used as a path, realpath'd and stat'd, never rendered; a forged value can only move enforce's root
  to a tree that is not an ancestor of the launch root, and only add protect roots.

## Open questions (HALT)

- none — the user asked for PR, merge and release; GATE 1 is still theirs.
