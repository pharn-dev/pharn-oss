# APPLY — write-guard-narrowing (human-only hook patch)

**Do not apply this yet.** The orchestrator runs an independent review of this patch at GATE 2, before anyone
applies it (the 6.24.0 guard patch needed three review rounds, and each apply costs a human round). Apply it only
once that review has cleared the bytes that `human-only.sha256` pins.

This build could not, and did not, touch the three human-only files this increment changes:
`.claude/hooks/protect-trusted-paths.cjs`, `.claude/hooks/enforce-writes-scope.cjs` and `LIMITS.md`. Everything else
the plan names was written by the agent. This folder carries the three files' change to a human.

## What to read first

1. **`human-only.patch`** — the exact unified diff of the three files. The verify-patch runner took it with
   `git diff HEAD~1 HEAD` inside a throwaway detached worktree where the patched files were committed at their real
   paths and every gate of `npm run check` ran against them (`BUILD.md` records each exit). It was never
   hand-typed. What it changes:
   - **`protect-trusted-paths.cjs` (review finding M4).** On macOS and Linux a backslash is part of a file name,
     but both of this hook's readings of a path treated it as a separator. So a symlink named `s\x` pointing at
     the project root carried a Write-tool write to `LIMITS.md`, or to canon under a scope a PLAN had set, past
     it. The hook now judges each write a second time, at the target the filesystem reaches, after its old check.
     The new resolution is a byte-equal copy of `enforce-writes-scope.cjs`'s, pinned by a test. The old check
     is unchanged, so every write it denied is denied with the same message. Every verdict the second check
     changes is a denial. The canon exception never authorizes a target whose path holds a backslash.
   - **`enforce-writes-scope.cjs` (review finding M7).** In an installed project with no scope and no PHARN run
     open, a write outside the project was allowed under every project's memory folder and anywhere under the
     temp roots. It is now allowed only in three places:
     - this project's auto-memory folder, for the key of the folder holding the session's `transcript_path`
       and the key Claude Code derives from the repository's main checkout;
     - this session's own scratchpad;
     - an ordinary temp path, never with a `claude-<uid>` folder in it, never inside the config directory, and
       not inside the home directory when that sits in a temp root.

     The main-checkout key mirrors an undocumented Claude Code derivation, and it fails closed if that
     derivation drifts. A project is its key: two paths that differ only in characters outside `[A-Za-z0-9]`
     share one memory folder, as they do in Claude Code. A payload field that is absent or malformed grants
     nothing. A denied write to Claude Code's own state gets a new message variant that offers no Bash route,
     and offers this session's scratchpad only when the call's payload identifies it.

   - **`LIMITS.md §7`.** Four edits:
     - the out-of-project bullet is rewritten, with its bounds;
     - the every-target bullet gains protect's second reading;
     - the install bullet no longer calls protect "unchanged";
     - a provenance comment closes the section.

   No version number appears in the added lines. A renumber, after another PR merges first, therefore changes
   neither this patch nor its checksums. The runner checks that.

2. **`human-only.sha256`** — `shasum -a 256 -c` digests of the three files' bytes **after** the patch is
   applied. `apply.sh` uses it to confirm that the bytes landing are exactly the bytes that were verified. It
   certifies that the patch and the runner agree. It is not a signature.
3. This file, for what `apply.sh` does and where to resume.

## What `apply.sh` does, in order

Run it from the root of **the worktree this build ran in**: `sh .dev/features/write-guard-narrowing/proposed/apply.sh`.
That worktree holds the reconciliation baseline the checkpoint in step 2 reads. **Never run it from `main`**; the
script refuses there by itself as a backstop.

1. **Refuses on `main`.**
2. **Prints the patch's own sha256** (`shasum -a 256 human-only.patch`) as a record. Compare the value with the
   one the orchestrator gives you separately **before you run the script** — run that same `shasum` line
   yourself first — and do not run it if they differ. The script cannot make this comparison for you: a value it
   read from this folder could be changed together with the patch, and it does not pause.
3. **Refuses a patch that touches anything but the three files.** `git apply --numstat` must list exactly
   `.claude/hooks/enforce-writes-scope.cjs`, `.claude/hooks/protect-trusted-paths.cjs` and `LIMITS.md`, once
   each; a hunk for any other path (a new `.claude/settings.local.json`, say — gitignored, so a later `git status`
   would not show it) stops the script with nothing applied.
4. **Requires a clean reconciliation baseline** (`check-bash-reconcile.mjs --base . --require-baseline`), and the
   three files to equal HEAD. An absent or dirty baseline stops the script (`INCONCLUSIVE` or `ESCAPE`) instead
   of applying onto an unverified tree. Never delete or hand-edit a baseline to get past it.
5. **Applies the patch to the three paths only**: `git apply --check`, then `git apply` with one `--include=` per
   path. It snapshots `git status --porcelain --ignored --untracked-files=all` before and after, and requires the
   two to differ in exactly those three paths, each a regular file and not a symlink. What is enforced is that
   set: the patch may change the three files' contents however it says, and nothing else in the working tree may
   move.
6. **Verifies the applied bytes**:
   - `shasum -a 256 -c` against `human-only.sha256`;
   - a live `node --test` run of every suite that executes either guard or pins the files they read:
     - the five hook suites (`protect-trusted-paths`, `enforce-writes-scope`, `set-writes-scope`,
       `hook-wiring`, `writes-scope-release`);
     - `run-marker.test.mjs`, `check-bash-reconcile.test.mjs` and `reconcile-baseline.test.mjs`;
     - `check-spec.test.mjs`, `check-ac-tests.test.mjs` and `stage-verify.test.mjs`;
     - `.dev/floor/command-hygiene.test.mjs`.

**If anything from step 5 on fails — the apply, the working-tree check, a checksum, a test, or the commit itself —
the script restores the three files from HEAD (`git checkout HEAD -- <the three>`) and exits 1.** Nothing is
committed and nothing is re-anchored, so patched bytes are never left behind uncommitted. Steps 1–4 stop before
anything is applied. It is safe to re-run after investigating. A restore touches only the three files: if the
working-tree check names another path, look at that path yourself — the script does not delete what it did not
write.

1. **Commits** exactly the three paths, authored as you (the human running the shell), with a fixed message.
2. **Re-sets the writes-scope from the PLAN, then re-anchors the reconciliation baseline**
   (`--by write-guard-narrowing-apply`). The setter runs before the anchor, so the anchor records the scope that
   is live after your commit.

## Where to resume

**`/pharn-dev-verify`**, in the same worktree. Do not resume at `/pharn-dev-regress`: the committed hook scripts
would read as a scope escape there on the correct workflow (L17). Before the apply, verify is expected to
**FAIL** on `test`, and on nothing else. `BUILD.md` names every expected failure, and each one asserts the patched
guards. Afterwards the same verify is expected to PASS.

## If something goes wrong

- **The reconcile checkpoint refuses (`ESCAPE` or `INCONCLUSIVE`).** Investigate what changed since the anchor.
  Never delete or hand-edit the baseline to silence it: that is the failure mode the checkpoint exists to catch.
- **The patch's sha256 differs from the value you were given, or the script refuses the patch's file list.** Do
  not apply it; tell the orchestrator. The patch in this folder is not the one that was reviewed.
- **A later step fails and the three files are restored.** Nothing was committed or re-anchored. Re-run
  `apply.sh` once you understand why (a stale `node_modules`, a `shasum` that differs, a commit hook, …). A failed
  attempt changes neither the patch nor its checksums.
- **You disagree with the patch itself.** Do not apply it. Nothing downstream depends on the patch having been
  applied in order to review the rest of the increment.
