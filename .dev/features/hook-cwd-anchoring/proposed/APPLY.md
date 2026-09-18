# APPLY — anchor the write guards, and give them the right jurisdiction

**Status: PROPOSED — NOT APPLIED. A human applies this.**

Four files are `editable_by: human only` or hook-protected, so **no write to them was attempted**:

- `.claude/settings.json` — the wiring
- `.claude/hooks/protect-trusted-paths.cjs` — fix #2
- `.claude/hooks/enforce-writes-scope.cjs` — fix #7
- `LIMITS.md` — the new §7 and two corrected cites

The route `CLAUDE.md` forbids — routing an in-repo write through Bash to dodge the guard — was not taken.
That matters more than usual here: this increment exists because agents took exactly that route when a
guard denied them.

## Read this first

```bash
git apply --stat .dev/features/hook-cwd-anchoring/proposed/human-only.patch
less .dev/features/hook-cwd-anchoring/proposed/human-only.patch
```

The sums in `human-only.sha256` are a **consistency** check between two agent-written files, never an
authentication: the patch and its sums could be rewritten to agree. What binds the applied bytes is the
**hook suites run against them** inside the script below, and your reading of the diff.

## Run it

From the repo root, on the feature branch (the script refuses `main`):

```bash
sh .dev/features/hook-cwd-anchoring/proposed/apply.sh
```

It performs, in this order:

1. `check-bash-reconcile.mjs --require-baseline` — the build's epoch must reconcile **CLEAN** first, so the
   re-anchor at the end erases no detected escape.
2. `git apply --check`, then `git apply`.
3. `shasum -a 256 -c` **and** the three hook suites (`enforce-writes-scope`, `protect-trusted-paths`,
   `hook-wiring`) **on the applied bytes**. On any failure it restores the four files from `HEAD` and exits
   non-zero — unverified guard bytes never stay live and never reach a commit.
4. A path-scoped `git commit` of exactly those four files, under your authorship. The commit is what clears
   `check-bash-reconcile.mjs`'s control-surface comparison against `HEAD`.
5. `set-writes-scope.cjs --from-plan` then `reconcile-baseline.mjs --anchor` — in that order (L38), so the
   new epoch's snapshot authorizes the increment's remaining uncommitted paths.

## Then

Resume the chain at **`/pharn-dev-verify`** (not `/pharn-dev-regress`: `check-regress.mjs:123` exempts only
the four trusted docs, so a committed hook script would read there as a scope escape on a correct
workflow — lessons-learned L17).

## If something fails

- **Step 1 red** — an escape was detected in the build's epoch. Do not apply; read `reconcile.json`, and
  treat the escape as a finding, not as something to anchor past.
- **Step 2 red** — the patch no longer applies to this tree. Re-run the build stage's verification block to
  regenerate it against the current `HEAD`.
- **Step 3 red** — the script has already restored the four files; nothing was committed. The failure is in
  the patch, not in your tree.

## What changes, and why it is a `minor` bump

`SKILLS_VERSION` `6.0.0` → `6.1.0`. The wiring and jurisdiction changes are corrections, but the increment
also ships a **new** guard — fix #2 now denies tool writes to git metadata (any `.git` path segment under a
guarded root), because those entries decide which work tree each guard judges. A new guard on the product
surface is a minor bump under `CLAUDE.md`'s rule.

Full reasoning: `.dev/features/hook-cwd-anchoring/PLAN.md`. The interrogation that shaped it, including the
three findings that changed the design: `.dev/features/hook-cwd-anchoring/GRILL.md`.
