# APPLY — the human-only step for `stage-model-routing`

This directory holds the patch that revises `LIMITS.md §8` — the one edit this build could not make itself,
because the four trusted docs are Write/Edit/MultiEdit/NotebookEdit-denied (fix #2) and the build writes none
of them through Bash either. Nothing here is applied automatically. A person runs it.

## What to read first

```sh
git apply --stat .dev/features/stage-model-routing/proposed/human-only.patch
```

That prints a summary of what changes, without touching anything. Then read `human-only.patch` itself — a
plain unified diff against `LIMITS.md` alone.

## What the patch changes

`LIMITS.md §8` ("The declared per-stage model configuration is not the executed one" — the heading stays,
because § numbers are cited widely). After this increment four of its sentences are false: "Nothing reads
`models.stages` at run time to select a model", "The block is not a runtime control", "PHARN does not attempt
to apply a model … it does not attempt it at all", and the TURN SCOPE bound's "gets no per-stage routing". The
revision:

- names each thing that reads the block and the question each answers — the agreement check (floor: two files
  agree) and stage routing (the decision is floor, applying it is the platform's);
- keeps the struck claim, and adds a marker's `agent:<alias>` route to what must never be read as proof;
- restates the true statement: for a routed stage PHARN REQUESTS the configured model, and `cost.json` records
  what was SERVED — evidence from an undocumented transcript format, not a floor primitive;
- says effort is not routed;
- says what is not routed runs on the orchestrator's model, and that the run records why;
- says deleting the block now loses routing as well as the check;
- cites the checker's TURN SCOPE and PLATFORM VETO bounds by SECTION NAME, not by line — this increment's
  header edit moved the lines `check-model-config.mjs:32-38` named (L50).

Every list is an open form (L47): no new closed count of readers or of routed stages. A second provenance
comment records the revision.

## What `apply.sh` does

`sh .dev/features/stage-model-routing/proposed/apply.sh`, run from the repo root:

1. Refuses on `main` (a trusted-doc commit belongs on the phase branch, merged normally).
2. `git apply --check`, then `git apply`, the patch.
3. Re-runs, on the **applied bytes**: `shasum -a 256 -c human-only.sha256`, `pharn/floor/validate.mjs .`, and
   `.dev/floor/check-specified-markers.mjs .` at the real path (L26). Any failure restores `LIMITS.md` from the
   **index** (`git checkout -- LIMITS.md` — `HEAD`'s content unless you had staged edits to it) and commits
   nothing.
4. On success, commits **only** `LIMITS.md`.

## When to apply

**At GATE 2, after the last `/pharn-dev-verify`, before this phase merges into `main`** — the `ship-quick-mode`
precedent. The chain from `/pharn-dev-grill` through `/pharn-dev-verify` runs green without this patch: nothing
it runs reads `LIMITS.md §8`'s prose (`check-specified-markers.mjs` registers no §8 site, and `validate.mjs` does
not scan it). Applying earlier is not wrong, just unnecessary. Applying **after** the merge would leave `main`'s
§8 saying "nothing reads `models.stages` at run time" while `/pharn-ship` does.

**If a sibling phase edits `LIMITS.md` first** (`loop-quick-mode` is expected to edit §3a and §6), `git apply
--check` or the sum refuses. Regenerate against the current tree — the generator always reads the LIVE file:

```sh
node .dev/features/stage-model-routing/handoff/make-patch.mjs
```

It rewrites `human-only.patch` and `human-only.sha256`. If the sibling edited **§8 itself**, the generator
refuses instead ("find string matched 0 time(s)"): its finds are literals of today's §8, so it never overwrites
another edit. Then re-read §8 and update the finds by hand. The orchestrator sequences the applies so that a
person applies each sibling's patch once (PLAN.md, Chain sequencing 7). A renumber to 6.28.0 on merge edits the
generator's `VERSION` line, then regenerates.

## The ARCHITECTURE pin does not move

This patch never touches `pharn/ARCHITECTURE.md`, so `sha256(pharn/ARCHITECTURE.md)` stays
`d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4`, and no sibling plan needs re-pinning because
of it.

## The out-of-order case (L17, L38)

If the patch is applied **before** the chain's last `/pharn-dev-verify` — say, right after `/pharn-dev-build` —
the chain still resumes correctly, but two floor steps must be re-run first, **in this order**:

1. **Re-run the writes-scope setter** for the plan that is building, so `.pharn/writes-scope.json` holds that
   plan's scope again (the single mutable scope file belongs to whichever stage set it last — L38):

   ```sh
   node .claude/hooks/set-writes-scope.cjs --from-plan .dev/features/stage-model-routing/PLAN.md
   ```

2. **Re-anchor the reconciliation baseline** — the `apply.sh` commit is a git commit, not a Write/Edit call, so
   no guard sees it, but it changes tracked bytes; re-anchoring keeps the epoch honest:

   ```sh
   node pharn/floor/reconcile-baseline.mjs --anchor --by pharn-dev-build
   ```

3. **Resume at `/pharn-dev-verify`**, never at `/pharn-dev-regress` (L17): the patch touches no file
   `/pharn-dev-regress` reads.

## What this patch does NOT do

It never touches `pharn/CONSTITUTION.md`, `pharn/ARCHITECTURE.md`, `THREAT-MODEL.md`, `CODEOWNERS`, either
`.claude/settings*.json`, the four hook scripts, or `pharn.spec-template.md`. It makes exactly one commit,
touching exactly `LIMITS.md`.
