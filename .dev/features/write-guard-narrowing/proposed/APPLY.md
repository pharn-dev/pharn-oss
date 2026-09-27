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
     - an ordinary temp path, never with a `claude-<uid>` folder in it and never inside the config or home
       directory when either sits in a temp root.

     The main-checkout key mirrors an undocumented Claude Code derivation, and it fails closed if that
     derivation drifts. A payload field that is absent or malformed grants nothing. A denied write to Claude
     Code's own state gets a new message variant that offers no Bash route.

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
2. **Requires a clean reconciliation baseline** (`check-bash-reconcile.mjs --base . --require-baseline`). An
   absent or dirty baseline stops the script (`INCONCLUSIVE` or `ESCAPE`) instead of applying onto an unverified
   tree. Never delete or hand-edit a baseline to get past it.
3. **`git apply --check`, then `git apply`** the patch onto the three real paths — nothing more.
4. **Verifies the applied bytes**:
   - `shasum -a 256 -c` against `human-only.sha256`;
   - a live `node --test` run of every suite that executes either guard or pins the files they read:
     - the five hook suites (`protect-trusted-paths`, `enforce-writes-scope`, `set-writes-scope`,
       `hook-wiring`, `writes-scope-release`);
     - `run-marker.test.mjs`, `check-bash-reconcile.test.mjs` and `reconcile-baseline.test.mjs`;
     - `check-spec.test.mjs`, `check-ac-tests.test.mjs` and `stage-verify.test.mjs`;
     - `.dev/floor/command-hygiene.test.mjs`.

   **If either check fails, the script restores the three files from HEAD and exits 1, and nothing is
   committed.** It is safe to re-run after investigating.

5. **Commits** exactly the three paths, authored as you (the human running the shell), with a fixed message.
6. **Re-sets the writes-scope from the PLAN, then re-anchors the reconciliation baseline**
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
- **The verification step fails and the three files are restored.** Nothing was committed. Re-run `apply.sh`
  once you understand why (a stale `node_modules`, a `shasum` that differs, …). A failed attempt changes neither
  the patch nor its checksums.
- **You disagree with the patch itself.** Do not apply it. Nothing downstream depends on the patch having been
  applied in order to review the rest of the increment.
