# APPLY — ac-gate-plan-scope (human-only LIMITS.md sentence)

This build could not, and did not, touch `LIMITS.md`: it is one of the four human-only trusted docs. One sentence
of its §9 ("The Acceptance-Criteria evidence is agreement, not provenance") describes what the test-infrastructure
pin does not see, and 6.31.0 changes that list. This folder carries the sentence to a human. **Nothing in the build
depends on it being applied** — the product floor, the contracts and the tests are complete without it, and
`pharn/floor/test-infra-core.mjs`'s header (the one copy of the list, which §9 already cites) is current.

## Why the sentence changes

§9 says the pin does not see "script chaining" or "npm's own configuration". Since 6.31.0 the pin DOES see a literal
chain through the package manager's own run commands (`npm run test:unit`, `yarn build`, `node --run gen`) and the
root `.npmrc` / `.yarnrc` / `.yarnrc.yml`. So the sentence now understates the pin — not an overclaim, but a
doc-vs-repo mismatch. The replacement narrows those two items to what is still unseen (a chain through any other
runner; npm configuration outside the project root) and adds the in-process bound the GATE-1 review asked to be stated:
code the build writes runs inside the test process and can switch off the assertions or the reporter there, which no
pin reaches.

## What to read first

1. **`human-only.patch`** — the exact unified diff, one sentence of `LIMITS.md §9`. It is `git diff` taken inside a
   throwaway detached worktree the build's runner created at this branch's HEAD, applied the replacement in, ran
   `check-specified-markers.mjs` over (exit 0), and removed — never hand-typed. Read it like any other review.
2. **`human-only.sha256`** — the `shasum -a 256 -c` digest of `LIMITS.md` **after** the patch. `apply.sh` checks it,
   so the bytes that land are exactly the bytes the runner produced. It certifies that the patch and the runner
   agree; it is not a signature (L43).

## What `apply.sh` does, in order

Run it from the worktree root, on this feature's branch (it refuses `main`):

1. `check-bash-reconcile.mjs --require-baseline` — confirms no write escaped the build's scope since its anchor,
   before anything new lands.
2. `git apply --check`, then `git apply` of `human-only.patch`.
3. `shasum -a 256 -c human-only.sha256` and `check-specified-markers.mjs` — on either failing, `LIMITS.md` is restored
   from HEAD and nothing is committed.
4. Commits `LIMITS.md` alone.
5. Re-sets this increment's writes-scope from `PLAN.md` and re-anchors the reconcile baseline
   (`--by ac-gate-plan-scope-apply`), so a later `/pharn-dev-verify` judges the tree from the applied state.

Then re-run `npm run check`.

**Applying it is OPTIONAL, and no gate waits on it** (the orchestrator's GATE-2 decision, under the maintainer's
delegation). The PR merges without it; `proposed/` travels in it as a staged human edit. The expected route is AFTER
the merge, on a fresh branch cut from `main`: run `apply.sh` there (it refuses `main`; its reconcile step needs a
baseline, so on a fresh branch first run `node .claude/hooks/set-writes-scope.cjs --from-plan
.dev/features/ac-gate-plan-scope/PLAN.md` and `node pharn/floor/reconcile-baseline.mjs --anchor --by
ac-gate-plan-scope-limits`), and open a PR that bumps a PATCH and adds its own CHANGELOG entry — `LIMITS.md` ships, so
the sentence bumps (CLAUDE.md, "SKILLS_VERSION discipline").
