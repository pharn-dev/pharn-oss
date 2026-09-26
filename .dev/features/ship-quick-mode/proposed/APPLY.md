# APPLY — the human-only step for `ship-quick-mode`

This directory holds the patch that lands `LIMITS.md §3a` and `pharn/ARCHITECTURE.md §6` (and, if
`pharn/pharn-contracts/stage-exit.md` exists at generation time, `§4` too) — the two edits this build could
not make itself, because both files are Write/Edit/MultiEdit/NotebookEdit-denied (fix #2). Nothing in this
directory is applied automatically. A human runs it.

## What to read first

```sh
git apply --stat .dev/features/ship-quick-mode/proposed/human-only.patch
```

That prints a summary of what changes and where, without touching anything. Then read
`human-only.patch` itself — it is a plain unified diff against `LIMITS.md` and `pharn/ARCHITECTURE.md`.

## What `apply.sh` does

`sh .dev/features/ship-quick-mode/proposed/apply.sh`, run from the repo root:

1. Refuses on `main` (a trusted-doc commit belongs on the phase branch, merged normally).
2. Confirms `pharn/pharn-contracts/stage-exit.md`'s presence matches what the patch was generated
   against (`absent`, for this patch — see "The conditional §4 line" below); a mismatch means the tree
   moved since generation and says to regenerate.
3. `git apply --check` then `git apply` the patch.
4. Re-runs, on the **applied bytes**: `shasum -a 256 -c human-only.sha256`, `pharn/floor/validate.mjs .`,
   `.dev/floor/check-specified-markers.mjs .`, and `.dev/floor/hash-doc.test.mjs`. Any failure restores
   both files from the **index** (`git checkout -- LIMITS.md pharn/ARCHITECTURE.md` — `HEAD`'s content
   unless you had staged edits to either file) and commits nothing.
5. On success, commits **only** `LIMITS.md` and `pharn/ARCHITECTURE.md`, with the message
   `docs(trusted): quick mode in LIMITS.md and ARCHITECTURE.md (human-applied)`.

## When to apply

**At GATE 2, after the last `/pharn-dev-verify`, before this phase merges into `main`** (Q1 → (a), decided
at GATE 1 under the maintainer's 2026-09-25 delegation). The chain from `/pharn-dev-grill` through
`/pharn-dev-verify` runs, and is designed to run, **green without this patch** — nothing in that chain reads
the prose these two files carry (see `PLAN.md`, "Chain sequencing", item 1, for the enumerated readers and
why each stays unaffected). Applying earlier is not wrong, just unnecessary; applying **after** the merge
would leave `main`'s `LIMITS.md §3a` claim false for however long that gap lasts.

## The ARCHITECTURE pin moves

Applying the patch changes `sha256(pharn/ARCHITECTURE.md)` (folded, `.dev/floor/hash-doc.mjs`'s reading):

- **Old pin:** `4950796f5342df20a298fe22812e45dec3c15317592bd2358a31e149d2dc1c7f`
- **New pin (this patch, `stage-exit: absent`, regenerated at GATE 2 on 2026-09-26 after the review fixes):**
  `7b02b45caf4dfeb8aa2bf6192042024d871708fa9095921735525091b8eff6e3` (the pre-review patch's pin,
  `0e34408a…`, is superseded — its §3a/§6 text carried the review's F1–F3 wording)

If the §4 line is later included (because a sibling's `stage-exit.md` has landed by the time this patch is
regenerated), the new pin will differ from the one printed above — always read it from the generator's own
`new ARCHITECTURE pin: …` line printed at generation time, never from this document after a regeneration.

**Any sibling plan that pinned the OLD hash must be re-pinned** after this merges (`writes-scope-run-only`
and `stage-regress-script` both pin `4950796f…` as of this writing) — one header-line edit, via
`/pharn-dev-plan` or by hand, during that sibling's post-merge rebase. This is the same situation Q1's
recommendation (a) accepted: the re-pin is cheap and the rebase is already a reconcile point.

## The conditional §4 line

This patch was generated with `pharn/pharn-contracts/stage-exit.md` **absent**, so it does **not** touch
`pharn/ARCHITECTURE.md §4`'s `pharn-contracts` name list. If `stage-regress-script` (which introduces
`stage-exit.md`) merges **before** this phase does, `apply.sh`'s own presence check will refuse
(`stage-exit.md is present, the patch expects absent`) rather than apply a now-stale patch. In that case:

```sh
node .dev/features/ship-quick-mode/handoff/make-patch.mjs
```

regenerates `human-only.patch` and `human-only.sha256` against the current tree — the generator re-derives
the §4 name list from the live file and from `pharn/pharn-contracts/*.md` on disk, and includes the `§4`
edit (`ac-tests, stage-exit, spec-template`) automatically once `stage-exit.md` exists. If neither phase's
merge order lands `stage-exit.md` before this one applies, the `§4` line is owed by whichever phase merges
**second** — regenerating this patch after that merge is the remedy either way, and the generator's own
completeness assertion (grill G9) refuses loudly rather than silently if the `pharn-contracts` directory and
its own §4 list ever disagree.

## The out-of-order case (L17, L38)

The design expects this patch to be applied **after** the last `/pharn-dev-verify` in this chain. If it is
applied **earlier** instead — say, right after `/pharn-dev-build` — the chain still resumes correctly, but
two floor steps must be re-run **in this order**, before continuing at `/pharn-dev-verify`:

1. **Re-run the writes-scope setter** for the plan that is currently building, so
   `.pharn/writes-scope.json` reflects that plan's scope again (the single mutable scope file belongs to
   whichever stage set it last — L38):

   ```sh
   node .claude/hooks/set-writes-scope.cjs --from-plan .dev/features/ship-quick-mode/PLAN.md
   ```

2. **Re-anchor the reconciliation baseline** — an `apply.sh` commit is a git commit, not a
   `Write`/`Edit`/`MultiEdit`/`NotebookEdit` call, so it never itself trips a write-guard denial, but it
   does change tracked bytes outside the guards' view; re-anchoring keeps the epoch honest for whatever
   runs next:

   ```sh
   node pharn/floor/reconcile-baseline.mjs --anchor --by pharn-dev-build
   ```

3. **Resume at `/pharn-dev-verify`** (never at `/pharn-dev-regress` — L17): the patch touches no file
   `/pharn-dev-regress` reads or writes, so re-running it would only re-measure the identical regression
   surface.

## What this patch does NOT do

It never touches `pharn/CONSTITUTION.md`, `THREAT-MODEL.md`, `CODEOWNERS`, either `.claude/settings*.json`,
any of the four hook scripts, or `pharn.spec-template.md` — none of those files is named anywhere in
`human-only.patch`. It makes exactly one commit, touching exactly the two files named above.
