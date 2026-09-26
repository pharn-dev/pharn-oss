# APPLY — writes-scope-run-only (human-only hook patch)

This build could not, and did not, touch the three human-only files that this increment changes:
`.claude/hooks/enforce-writes-scope.cjs`, `.claude/hooks/set-writes-scope.cjs`, `LIMITS.md`. Everything
else the plan names has already been written, formatted and committed by the agent, on the
`writes-scope-run-only` branch. This folder is what carries the three files' change to a human to apply, by
hand, from here.

**This is the THIRD version of the patch, and the only one to apply.** The first (commit `6b349f8`) was
reviewed before anyone applied it, and `REVIEW.md` blocked it. The second (commit `67847e5`) carried the
GATE-2 fixes (`PLAN.md`, "Amended at GATE 2" and "As built — the GATE-2 fix pass") and was numbered 6.23.0.
Then `stage-regress-script` (#277, `1524c6f`) merged to `main` first and released 6.23.0, so this branch
merged `origin/main` and renumbered by diff to **6.24.0**. This patch is the second one with its version
strings renumbered (25 added lines: hook comments, the setter comment and `LIMITS.md §7`) and nothing else:
turning every `6.24.0` in the three new files back into `6.23.0` reproduces the second patch's
`human-only.sha256` digests exactly. If you kept a copy of either earlier patch, discard it:
`human-only.sha256` pins only the new bytes, so `apply.sh` refuses the old ones.

The three human-only files are byte-identical on `767bf61` (where the fix pass started) and `1524c6f`, so
the merge did not move the lines this patch applies to; the runner regenerated it against the merged tree
and `git apply --check` passes there.

## What to read first

1. **`human-only.patch`** — the exact, unified diff the three files need. It is `git diff HEAD~1 HEAD`
   taken inside a throwaway detached worktree the runner verified against (removed afterwards) — never
   hand-typed. Read it like any other code review before applying it: it is the guard logic that will
   decide every future write in every PHARN installation. What changed since the first patch, in the hook:
   - **Outside the project**, in an installed project with no scope and no run, only two places are
     allowed now — Claude Code's memory folders (`<claude-config-dir>/projects/*/memory/**`) and the temp
     roots (the OS temp directory and `/tmp`), never inside another git tree. That is your D2 decision of
     2026-09-26; the first patch allowed every path in no git tree.
   - **Every path is judged at two targets** — the old `path.resolve()` one first, then the one the
     filesystem reaches (a dangling symlink followed; `..` applied to a symlink's real parent) — and denied
     if either is denied. This fixes the blocking finding (a).
   - **A backslash path is denied in the permissive posture.** Found while verifying (a): read as a
     separator, `\` let a write land in `.claude/commands/` or `pharn/floor/`.
   - **The `pharn/features/` exception is matched as written** (blocking finding (b)).
   - **Anything other than a directory at a run-state path counts as a run open** (important finding 2).
   - The messages: the scan-error sentence, the install stale-scope reason, a non-slug marker name never
     rendered, the `{}` record keeping its origin line.

   `LIMITS.md §7` gains five bullets that state all of this, with its bounds.

2. **`human-only.sha256`** — `shasum -a 256 -c` formatted digests of the three files' bytes **after** the
   patch is applied. `apply.sh` uses this to confirm the bytes that land are exactly the bytes that were
   verified — not a hand-edited variant. It certifies that the patch and the runner agree; it is not a
   signature (L43).
3. This file, for what `apply.sh` actually does and where you resume afterward.

## What `apply.sh` does, in order

Run it **from the worktree the GATE-2 fix pass ran in** — that worktree holds the reconciliation baseline
this checkpoint needs (re-anchored after the merge of `origin/main`, `--by writes-scope-run-only-post-merge`;
`VERIFY.md` records why the first epoch was closed) — from its root:
`sh .dev/features/writes-scope-run-only/proposed/apply.sh`. **Never from `main`**; the script refuses on
`main` by itself as a backstop.

1. **Refuses on `main`.**
2. **Requires a clean reconciliation baseline** (`check-bash-reconcile.mjs --base . --require-baseline`).
   An absent or dirty baseline stops the script (`INCONCLUSIVE` / `ESCAPE`) rather than applying onto an
   unverified tree. Run it in another worktree and it stops with `INCONCLUSIVE`; do not delete or hand-edit a
   baseline to get past that.
3. **`git apply --check`, then `git apply`** the patch — a normal, auditable `git apply` onto the three
   real paths, nothing more.
4. **Verifies the applied bytes**: `shasum -a 256 -c` against `human-only.sha256`, **and** a live
   `node --test` run of every hook and product-floor suite the patch touches or the human-only files feed:
   `enforce-writes-scope.test.cjs`, `set-writes-scope.test.cjs`, `protect-trusted-paths.test.cjs`,
   `hook-wiring.test.cjs`, `writes-scope-release.test.cjs`, `run-marker.test.mjs`,
   `check-bash-reconcile.test.mjs`, `reconcile-baseline.test.mjs`. **If either check fails, the script
   restores all three files from HEAD via `git checkout --` and exits 1 — nothing is committed.** It is
   safe to re-run after investigating: it always starts from a clean `git apply`.
5. **Commits**, scoped to exactly the three paths, authored as you (the human running the shell) — not the
   agent. The commit message is fixed: `feat(hooks): the write guard is fail-closed only while PHARN is
working (human-applied)`.
6. **Re-sets the writes-scope from the PLAN** (`set-writes-scope.cjs --from-plan PLAN.md`) and
   **re-anchors the reconciliation baseline** (`reconcile-baseline.mjs --anchor --by writes-scope-run-only-apply`).
   Setter, then anchor — the same load-bearing order every stage in this chain already follows — so the
   anchor snapshots the scope that is live **after** your commit, not before it.

## Where to resume

**`/pharn-dev-verify`** (not `/pharn-dev-regress` — the committed hook scripts would read as a scope escape
there on the correct workflow, L17). The fix pass's own `VERIFY.md` records verify as **expected to FAIL on
`test`** before this patch lands, and names every failing test: each asserts the patched guard against the
still-unpatched hooks, and each passes against the patched copy. Once `apply.sh` finishes, `/pharn-dev-verify`
re-run in this same worktree should find `test` GREEN.

## If something goes wrong

- **The reconcile checkpoint refuses (`ESCAPE` or `INCONCLUSIVE`).** Do not delete or hand-edit the
  baseline to silence it — that is exactly the failure mode this checkpoint exists to catch. Investigate
  what changed since the anchor first.
- **The verification step fails and the three files are restored.** Nothing was committed; re-run
  `apply.sh` after understanding why (a stale `node_modules`, a shell whose `shasum` differs, …). The
  patch and its checksums are unchanged by a failed attempt.
- **You disagree with the patch itself.** Do not apply it. This folder, and the rest of this build's
  commit, can be discarded or revised like any other proposed change — nothing downstream depends on the
  patch having been applied to continue reviewing the rest of the increment.
