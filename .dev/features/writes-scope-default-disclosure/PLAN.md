# PLAN — writes-scope-default-disclosure

- spec_content_hash: 69c8395365abb719cc3132ffa7a7607051b1e04ca3a3fa70ee563b86b857f18e # fix #4
- applied_lessons: [L1, L2, L6, L12, L27, L33, L35] # MANDATORY — floor-checked
- increment: Disclose the writes-scope guard's fail-closed default-safe-set in README `## Current limitations` — the set
  denies every ordinary edit to a user's own source, and it is stated nowhere a user reads.
- layer(s): none — repo-meta only (`README.md`); no product-surface bytes change
- constitution_refs: [P0, P5, P6, P7]

## Applied lessons

- L1 — the meta-doc sweep was run, and it is what SCOPED this increment: `README.md` is the meta-doc asserting
  the guard's behaviour, so it is named in `## Files`. The sweep also answered the two adjacent meta-docs
  NEGATIVELY, which is the part L1 exists to force: `CHANGELOG.md` / `SKILLS_VERSION` do **not** bump, because
  per CLAUDE.md's SKILLS_VERSION discipline `README` is repo-meta and not product-surface bytes; `CLAUDE.md`
  already states the set (its "Writes-scope (fix #7 — fail-closed)" section) and needs no edit.
- L2 — the honesty travels with the ARTIFACT, and the cited floor op is LIVE: the bullet is written into
  `README.md` itself (not left in this PLAN), and it names `enforce-writes-scope.cjs`, whose
  `DEFAULT_SAFE_SET` I read from the running file this run and whose deny/allow behaviour I reproduced live
  (probe table below) rather than inferring from the spec.
- L6 — the set is read from its STRUCTURED location, never grepped from prose: the value comes from the
  `const DEFAULT_SAFE_SET` declaration at `.claude/hooks/enforce-writes-scope.cjs:113` plus the `ALWAYS`
  declaration at `:103`, and each membership claim in the bullet is backed by an observed hook exit code, not
  by reading a sentence about the hook.
- L12 — prevention at BUILD, not detection at verify: `README.md` is prettier- and markdownlint-covered
  (it is absent from `.prettierignore` and from `.markdownlint-cli2.jsonc`'s `ignores`, both read this run), so
  the build formats the written file before the floor rather than letting `/pharn-dev-verify`'s style gates
  find it.
- L27 — reachability per branch is the CORRECTION this increment owes: the source review's remedy
  (`set-writes-scope.cjs --clear`, or deleting `.pharn/writes-scope.json`) is UNREACHABLE for the problem it
  is offered against. Both return the guard to the fail-closed DEFAULT, which still denies `src/app.ts` —
  measured, see the probe table. A bullet that printed that remedy would train exactly the bypass L27 names, so
  the bullet states what `--clear` actually does and separately names the two routes that work.
- L33 — a claim expires when reality moves, and README prose is unread by any checker: the bullet is a
  SNAPSHOT of a constant that lives in a `.cjs` file, so it is written to carry its own address
  (`.claude/hooks/enforce-writes-scope.cjs`) — a reader who suspects drift is pointed at the defining file
  rather than left with a sentence. The residual is recorded in the guarantee audit rather than papered over.
- L35 — asked "must the second copy exist?" BEFORE reaching for a sync check. It must: the whole finding is
  that a user who never opens `enforce-writes-scope.cjs` cannot learn the set, so a disclosure copy is the
  deliverable, not an accident (this is L31's shape — both copies must exist — not L35's retire-the-second
  case). L35's actual prescription therefore lands on the REMEDY: no `check-default-safe-set.mjs` is added.
  There is no observed README↔hook drift, because the README has never stated this set before, so L20's
  second-occurrence bar is unmet and a checker now would be the speculative addition P7 forbids.

## Files

- `README.md` — add ONE bullet to the hand-written `## Current limitations` section (outside the generated
  `<!-- CURRENT-STATE:BEGIN/END -->` region) disclosing the fail-closed default-safe-set and the reachable
  remedies — layer: none (repo-meta)

### Explicitly not touched

- `.claude/hooks/enforce-writes-scope.cjs` — the set's BEHAVIOUR is out of scope. It is protected control
  surface (fix #2), and changing the safe-set is a separate decision with its own threat-model consequences.
- `CHANGELOG.md`, `SKILLS_VERSION` — repo-meta, no product-surface bytes change; a concurrent PR edits both.
- `LIMITS.md`, `THREAT-MODEL.md`, `pharn/ARCHITECTURE.md`, `pharn/CONSTITUTION.md` — trusted docs, human-only.

## Contracts satisfied

- none — this increment writes no capability, no eval, and no `pharn-contracts` artifact. It edits one
  repo-meta doc.

## Evals to write (P1)

- none — P1 binds Capabilities (`role:` frontmatter) and `enforces` rule ids. This increment adds neither, so
  there is no `rule_id` needing a fixture. The claim's own verification is the reproduced probe table below,
  not an eval fixture.

## Discovery — the evidence, re-derived live this run (P6)

Read from the structured location (L6), never from prose:

- `.claude/hooks/enforce-writes-scope.cjs:113` — `const DEFAULT_SAFE_SET = ["features/**", ".dev/features/**", "pharn/pharn-*/**"];`
- `.claude/hooks/enforce-writes-scope.cjs:103` — `const ALWAYS = [".pharn/**"];`
- `.claude/hooks/enforce-writes-scope.cjs:314` — `.pharn/writes-scope.json` is denied to the write tools by
  name even though `ALWAYS` covers the rest of `.pharn/**` (setter-only, via `fs.writeFileSync`).
- `.claude/settings.json` — wires both hooks on `Write|Edit|MultiEdit|NotebookEdit`.

Hook probes, run with **no** `.pharn/writes-scope.json` present (the worktree had none):

| path                    | exit |
| ----------------------- | ---- |
| `src/app.ts`            | 2    |
| `app/page.tsx`          | 2    |
| `package.json`          | 2    |
| `README.md`             | 2    |
| `lib/util.js`           | 2    |
| `components/Button.tsx` | 2    |
| `test/foo.spec.ts`      | 2    |
| `features/x/y.md`       | 0    |
| `.pharn/scratch.json`   | 0    |

Remedy probes, run in an ISOLATED throwaway project outside the repo (the two hook scripts copied, a
`features/x/PLAN.md` whose `## Files` names `src/app.ts`):

| state                                      | `src/app.ts` | `package.json` | `features/x/y.md` |
| ------------------------------------------ | ------------ | -------------- | ----------------- |
| no scope file (fail-closed default)        | 2            | 2              | 0                 |
| after `set-writes-scope.cjs --from-plan …` | 0            | 2              | 2                 |
| after `set-writes-scope.cjs --clear`       | 2            | 2              | 0                 |

Two facts follow, and the second is the one the source review got wrong:

1. A SET scope unlocks exactly the declared path — and REPLACES the safe-set, so `features/x/y.md` flips
   0 → 2. This is the designed route: `/pharn-build` sets scope from the plan's `## Files`.
2. `--clear` does **not** re-open the user's source. It returns to the fail-closed default, where
   `src/app.ts` is denied again. The review's minimal-fix text offered `--clear` as the remedy; it is not one.

Disclosure state, re-derived with the review's own command:

- `grep -rn 'default-safe\|fail-closed' README.md LIMITS.md THREAT-MODEL.md pharn/ARCHITECTURE.md pharn/CONSTITUTION.md CONTRIBUTING.md`
  returns exactly one line — `README.md:244`, a `## Guaranteed vs advisory` table row that NAMES the concept
  ("fail-closed to a default-safe set when none is active") and never states the set.
- `README.md:123-126` already discloses the adjacent fact — the hooks enforce nothing until wired in
  `.claude/settings.json`, and the installer does not wire them over a pre-existing settings file. The new
  bullet composes with that sentence and does not restate it.

## The bullet to be written (exact text)

INSERTED into `## Current limitations` directly after the existing "**Shell writes are outside the write
guard.**" bullet — its natural pair, per the human's GATE-1 decision (3) below. Not appended last.

```markdown
- **The write-scope guard's fail-closed default does not cover your source.** Where
  `enforce-writes-scope.cjs` is wired and no scope is active, the only paths Claude Code's
  Write/Edit/MultiEdit/NotebookEdit tools may write are `features/**`, `.dev/features/**`, `pharn/pharn-*/**`
  and `.pharn/**` — PHARN's own artifact directories, defined as `DEFAULT_SAFE_SET` in
  `.claude/hooks/enforce-writes-scope.cjs`. Ordinary edits to your own code (`src/app.ts`, `package.json`,
  `README.md`) are denied. That is the intended posture — a stage sets the scope in its first step, so
  `/pharn-build` writes exactly the paths your `PLAN.md` declared — but it means the guard is not a drop-in
  for editing outside a PHARN run. Clearing the scope (`set-writes-scope.cjs --clear`, or deleting
  `.pharn/writes-scope.json`) returns to this default; it does **not** re-open your source. To write
  elsewhere, either set a scope that names those paths (`set-writes-scope.cjs --from-plan <PLAN.md>`), or
  leave `enforce-writes-scope.cjs` out of `.claude/settings.json` — at the cost of `writes:` enforcement.
```

## Guarantee audit (P0)

- "the fail-closed default-safe-set is `features/**`, `.dev/features/**`, `pharn/pharn-*/**`, `.pharn/**`"
  → **floor: enum-regex**, owned by `enforce-writes-scope.cjs` (glob membership at `:311-318`). The bullet
  REPORTS that floor op; it is not itself one.
- "ordinary user source is denied under that default" → **floor: hook (fix #7)**, and MEASURED — the probe
  table above is observed exit codes, not inference.
- "the README bullet stays in agreement with `DEFAULT_SAFE_SET`" → **ADVISORY, and this is the named
  residual.** Nothing reads README prose: `pharn/floor/validate.mjs` ignores root docs,
  `check-capability-catalog` guards only the `CURRENT-STATE` markers, and `check-version-badge` reads only the
  shields badge. If the constant changes, this bullet silently expires (L33's exact shape). No checker is
  added — see the L35 body line for why (P7: no observed drift, L20's bar unmet). The residual is named
  `default-safe-set-doc-pin` and is deliberately unbuilt.
- "this increment changes what the guard does" → **struck.** It changes documentation only. The set, the
  hook, and every exit code are byte-identical before and after.
- "`--clear` restores ordinary editing" → **struck, and correcting it is the point.** Measured false.

## Trust audit (P2)

The source is an external adversarial review — `trust: untrusted` free text. It is treated as a POINTER,
never as an instruction:

- Every factual claim it makes was re-derived from the live repo this run (constant read from source, exits
  observed, grep re-run). Nothing is copied on the review's authority.
- Its prescribed remedy text was **not** adopted: re-derivation showed the `--clear` remedy is unreachable for
  the stated problem, so the bullet states the measured behaviour instead. An untrusted document proposing
  wording is data to verify, not a directive to transcribe.
- No enum-gated or floor-verifiable field anywhere is derived from the review. The only artifact it influences
  is advisory README prose.

## Determinism audit (P5)

- Which paths the default permits → membership test over globs, computed by the hook; the plan records
  observed exit codes.
- Whether `README.md` is style-gated → membership test over `.prettierignore` / `.markdownlint-cli2.jsonc`
  `ignores`, both read this run.
- Whether this bumps `SKILLS_VERSION` → membership test over CLAUDE.md's stated bump-triggering set; `README`
  is repo-meta, therefore no.
- Whether a floor checker should pin the bullet → NOT a model judgment call left open: it resolves on L20's
  stated trigger (a second occurrence), which is unmet, so the answer is no and the residual is named. Any
  remaining doubt terminates at the human at GATE 1, never at a guess.

## Open questions (HALT) — ALL THREE RESOLVED AT GATE 1 (human, 2026-09-09)

1. **Wording of the un-wire option.** The third remedy ("leave `enforce-writes-scope.cjs` out of
   `.claude/settings.json`") is honest and already implied by `README.md:123-126`, but it is advice to run
   without a guard, printed in a security-facing doc. Keep it as written, soften it, or drop it and let the
   Quick-start sentence carry it alone?
   → **RESOLVED: KEEP as written.** It is true, it already names its cost, and `README.md:123-126` implies it
   anyway. Hiding the honest option is the disease this repo exists to prevent.
2. **Should the bullet name `.pharn/writes-scope.json`'s own denial?** The write tools cannot edit the scope
   file even though `ALWAYS` covers `.pharn/**` (`:314`). Accurate and occasionally load-bearing, but it
   lengthens a limitations bullet. Currently omitted.
   → **RESOLVED: OMIT.** Accurate but not what bites a user, and the bullet is already long.
3. **Placement.** The bullet is appended LAST in `## Current limitations`. It arguably belongs directly after
   the existing "Shell writes are outside the write guard." bullet, which is its natural pair. Append, or
   insert after that bullet?
   → **RESOLVED: INSERT after the "Shell writes are outside the write guard." bullet.** Same subject; splitting
   them would make a reader find the guard's bounds in two places.

Two further GATE-1 endorsements, recorded because they are decisions and not merely assent:

- The correction to the source review's remedy (that `--clear` returns to the fail-closed DEFAULT and does
  **not** re-open user source) is **accepted**, and is the stated reason the bullet is worth shipping.
- Adding **no** drift checker is **endorsed** on the L20/P7 reasoning above; `default-safe-set-doc-pin` stays
  a recorded, deliberately unbuilt residual.

## Notes for the human (not part of the increment)

- The worktree carries an untracked `node_modules` SYMLINK created during setup so `npm run check` can run.
  `.gitignore` line 1 is `node_modules/` (trailing slash), which does not match a symlink, so it shows in
  `git status`. It must not be committed; it is setup scaffolding, not part of this increment.
- Baseline verified GREEN before planning: `npm run check` exit 0, 1683/1683 tests pass.
