# APPLY — canon-write-denylist (human-only; the agent could not land this)

The code change in this directory is **ready and verified but NOT applied**. It could not be applied by
the agent, and that is structural rather than a process slip: **all three write-guard scripts are
protected by the very hook this patch edits**, so no version of this fix is agent-writable. Probed live:

```text
echo '{"tool_name":"Write","tool_input":{"file_path":"<path>"}}' | node .claude/hooks/protect-trusted-paths.cjs
  .claude/hooks/protect-trusted-paths.cjs      -> exit 2   (denied)
  .claude/hooks/enforce-writes-scope.cjs       -> exit 2   (denied)
  .claude/hooks/set-writes-scope.cjs           -> exit 2   (denied)
  .claude/hooks/protect-trusted-paths.test.cjs -> exit 0   (allowed — tests deliberately unprotected)
```

Nothing was bypassed to work around this. See `../BUILD.md` for the full halt record.

## Step 1 — apply the patch (one file)

```bash
cp .dev/features/canon-write-denylist/proposed/protect-trusted-paths.cjs .claude/hooks/protect-trusted-paths.cjs
git diff .claude/hooks/protect-trusted-paths.cjs      # review before keeping
```

`protect-trusted-paths.cjs` here is a **complete replacement** for the current file, not a fragment. It
is the current file plus: `PROTECTED_SUBTREES`, `CANON_FILES`, `PROMOTE_COMMANDS`, `SCOPE_FILE`,
`PROTECTED_SUBTREE_KEYS`, `PROMOTE_COMMAND_KEYS`, a `collectInodes()`/`inodeIn()` refactor of the
existing inode logic, `CANON_INODES`, `canonRelKey()`, `canonWriteAuthorized()`, a two-branch
`DENY_REASONS` table, the reworked decision branch, and the header/bounds prose that goes with them.

## Step 2 — verify by EXECUTING it (do not verify by reading — L37)

```bash
node .dev/features/canon-write-denylist/proposed/probe.mjs   # 59/59, exit 0
```

The probe stages the hook into a throwaway fixture repo under `os.tmpdir()` and asserts every bound this
change claims. It is what found the one real defect this patch had (see "What the probe caught", below).
Its coverage:

- **A** — all six canon paths denied with **no** scope (fail-closed), iterating a materialized
  enumeration (L29/L36).
- **B** — **non-vacuity control** (L34): unrelated writes still exit 0, so the suite cannot pass by
  denying everything.
- **C** — regression: every existing `DEFAULT_PROTECTED` entry still denies.
- **D** — case variants, Unicode full-fold (`ſ`), Windows trailing dot/space.
- **E** — file symlink, **directory** symlink, **dangling** symlink, and hard-link aliases of canon.
- **F** — **the finding's exact vector**: a scope whose `set_by` is a `PLAN.md` does **not** authorize.
- **G** — the escape **allows** a genuine promote-origin scope (both product and dev).
- **H** — 13 near-misses each refused: multi-entry scope, wrong canon file, `.bak` origin, prefix
  lookalike, malformed record, and the hard-link pair.
- **I** — the escape cannot leak to a non-canon protected path (a trusted doc, the guard itself).
- **J** — all four write tools covered, not just `Write`.
- **K** — deny-message branches: each remedy present in its own case and **absent from the other**
  (L27/L29).
- **L** — no writes-scope **record** field ever reaches a deny message (this hook has no `asData()`
  fold).

**What the probe caught, recorded because it is the argument for running it.** The first draft ANDed
`!aliased` into the authorization test. A canon file that merely _happens_ to carry a second hard link
has `nlink > 1`, lands in `CANON_INODES`, and was therefore **denied on its own declared path** — i.e.
`/pharn-memory-promote` would have broken on any hard-linked canon file. Reading the code did not surface
it; executing it did, immediately. The fix splits the branch on `ck !== null` first, and the pair of
assertions in §H (alias denied **and** the same scope still authorizes the real path) is the regression
guard.

**Also verified against the REAL setter**, not a hand-written fixture — the escape's contract with
`set-writes-scope.cjs` holds on live output:

```text
$ node .claude/hooks/set-writes-scope.cjs --from-frontmatter .claude/commands/pharn-memory-promote.md \
      --target memory-bank/lessons-learned.md
writes-scope set: 1 path(s) …
{"scope":["memory-bank/lessons-learned.md"],"set_by":".claude/commands/pharn-memory-promote.md",…}

$ … --from-frontmatter .claude/commands/pharn-dev-memory-promote.md --target .dev/memory-bank/lessons-learned.md
{"scope":[".dev/memory-bank/lessons-learned.md"],"set_by":".claude/commands/pharn-dev-memory-promote.md",…}
```

Both are exactly the one-entry, promote-origin shape `canonWriteAuthorized()` requires, so **both promote
commands keep working**.

## Step 3 — fold the probe into `npm test`

`probe.mjs` is a standalone script, not a `node --test` suite. Port its tables into
`.claude/hooks/protect-trusted-paths.test.cjs` (which **is** agent-writable, so this can be automated
next run). Keep the four properties the tables encode rather than flattening them into per-case
assertions: the **materialized enumerations** (`CANON_PATHS`, `NEAR_MISSES`, `DENY_BRANCHES`) with the
rules **iterating** them (L29/L36), the **non-vacuity guards** on each (L34), the **absent-from-the-other**
half of the deny-message rule (L27), and the hard-link **pair**.

## Step 4 — bump the version and expire the stale prose

`.claude/hooks/*.cjs` is product surface, so applying Step 1 **requires** a `SKILLS_VERSION` bump
(`3.0.2` → the version assigned to this change), the README shields badge updated to match
(`check-version-badge` compares them), and the `CHANGELOG.md` entry moved out of the
"disclosed-but-not-fixed" framing this PR shipped it under.

**Then repair the seven sentences that expire the moment the hook lands** (L33 — a "not yet built" claim
becomes false in a file nobody is editing). The list was built by sweeping **two** invariant substrings,
because the first sweep was a lower bound the second beat — which is the method, not just the result:

1. `.claude/commands/pharn-memory-promote.md:~453-458` — "a plan naming a canon path would grant an
   **ungated** canon write … recorded follow-up: `canon-write-denylist`".
2. `.claude/commands/pharn-dev-memory-promote.md:~100-106` — the retro-tagging route "travelling the
   **ordinary gated build path** … scoped by `--from-plan`", which this patch closes.
3. `.claude/commands/pharn-dev-ship.md:~22-24` — "the canon path is reachable ONLY by invoking
   `/pharn-dev-memory-promote`, **which declares it itself**": still true, but no longer for that reason.
4. `.dev/floor/check-provenance.test.mjs:~410-414` — its HONEST BOUND comment naming the same follow-up.
5. `.dev/floor/command-hygiene.test.mjs:~451` — its restatement of L7's residual.
6. `.claude/hooks/enforce-writes-scope.test.cjs:~159-168, ~282` — the two `memory-bank` scope tests'
   comments; see the jurisdiction note below.
7. `README.md` `## Current limitations` — the bullet this PR added, which describes the gap as **open**.

**On `enforce-writes-scope.test.cjs:159-162` specifically — do NOT delete it.** It asserts that
`enforce-writes-scope.cjs`, scoped to `memory-bank/lessons-learned.md`, allows that path, and that
remains **true**: this patch does not touch that hook. The two guards compose and a write must pass
**both**, so after this change the _composed_ verdict for that payload is DENY while that hook's own
verdict is still ALLOW. The test is pinning a different hook's jurisdiction, so it stays as an assertion;
only its **comment** needs the composition stated, plus a new composition test that runs both hooks over
one payload and asserts the composed result.

## Step 5 — the trusted-doc sentence (human judgment, deliberately not pre-written into the docs)

`THREAT-MODEL.md:67` maps memory poisoning to the "pre-write hook" primitive with no bound. This patch
makes that row **substantially more true** rather than less, so it is not falsified by applying the
patch and **no edit is required**. If you want it sharpened anyway, the suggested replacement for the
`Structural answer` cell is:

> promotion to canon is a **gated write** with per-entry provenance; `memory-bank/**` is denied at the
> pre-write hook unless the active writes-scope's origin is a promote command _(Write/Edit/MultiEdit/NotebookEdit only — Bash bypasses it, §4.2)_

`THREAT-MODEL.md` is human-only and hook-protected; the agent neither edited it nor attempted to.
