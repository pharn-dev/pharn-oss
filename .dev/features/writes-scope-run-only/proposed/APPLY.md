# APPLY — writes-scope-run-only (human-only hook patch)

This build could not, and did not, touch the three human-only files that this increment changes:
`.claude/hooks/enforce-writes-scope.cjs`, `.claude/hooks/set-writes-scope.cjs`, `LIMITS.md`. Everything
else the plan names has already been written, formatted and committed by the agent, on the
`writes-scope-run-only` branch, in the **build stage's own worktree**. This folder is what carries the
three files' change to a human to apply, by hand, from here.

## What to read first

1. **`human-only.patch`** — the exact, unified diff the three files need. It is `git diff HEAD~1 HEAD`
   taken inside a throwaway detached worktree the build verified against (`.pharn/pharn-dev-build/verify-wt`,
   already removed) — never hand-typed. Read it like any other code review before applying it: it is the
   actual guard logic that will decide every future write in every PHARN installation, in the posture this
   plan approved.
2. **`human-only.sha256`** — `shasum -a 256 -c` formatted digests of the three files' bytes **after** the
   patch is applied. `apply.sh` uses this to confirm the bytes that land are exactly the bytes that were
   verified — not a hand-edited variant.
3. This file, for what `apply.sh` actually does and where you resume afterward.

## What `apply.sh` does, in order

Run it **from this worktree's root** (`sh .dev/features/writes-scope-run-only/proposed/apply.sh`) —
**never from `main`**, and the script refuses on `main` by itself as a backstop:

1. **Refuses on `main`.**
2. **Requires a clean reconciliation baseline** (`check-bash-reconcile.mjs --base . --require-baseline`).
   This worktree's baseline was anchored by the build stage's Step 0, right after its own writes-scope was
   set — that is the epoch this checkpoint protects, and an absent or dirty baseline stops the script
   (`INCONCLUSIVE` / `ESCAPE`) rather than applying onto an unverified tree.
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

**`/pharn-dev-verify`** (not `/pharn-dev-regress` — this build's own regress run already covered the
outside-scope gates before this patch existed, and a committed hook script re-run through regress would
read as a scope escape on the correct workflow). The build stage's `VERIFY.md` recorded that verify was
**expected to FAIL on `test`** before this patch landed, because the new hook and floor tests assert the
patched guard's behaviour against hooks that, until you run this script, are still the old ones. Once
`apply.sh` finishes, `/pharn-dev-verify` re-run in this same worktree should find `test` GREEN — the
patched bytes are the ones `apply.sh` just verified live.

## If something goes wrong

- **The reconcile checkpoint refuses (`ESCAPE` or `INCONCLUSIVE`).** Do not delete or hand-edit the
  baseline to silence it — that is exactly the failure mode this checkpoint exists to catch. Investigate
  what changed since the build's anchor first.
- **The verification step fails and the three files are restored.** Nothing was committed; re-run
  `apply.sh` after understanding why (a stale `node_modules`, a shell whose `shasum` differs, …). The
  patch and its checksums are unchanged by a failed attempt.
- **You disagree with the patch itself.** Do not apply it. This folder, and the rest of this build's
  commit, can be discarded or revised like any other proposed change — nothing downstream depends on the
  patch having been applied to continue reviewing the rest of the increment.
