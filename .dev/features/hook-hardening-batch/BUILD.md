# BUILD — hook-hardening-batch

- plan: `.dev/features/hook-hardening-batch/PLAN.md` (GATE 1 delegated to the batch orchestrator, 2026-10-20 — a model
  decision under the maintainer's delegation, not a human approval)
- spec hash at build: `2c84959c…db12e`, equal to the plan's pin
- floor: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`, exit 0 (this worktree, and the
  measurement worktree with the patch applied)
- anchor: `reconcile-baseline.mjs --anchor --by pharn-dev-build`, taken twice before any build write: once after the
  first setter call, and again after the plan's `## Files` gained `pharn/floor/README.md` and
  `.dev/floor/command-hygiene.test.mjs` (and Approach 3 was revised). No file had been written between the two.

## What landed (agent-written)

- `.dev/features/hook-hardening-batch/apply.py` — the maintainer-run patch: 24 exact replacements over five protected
  files, every target pinned by its BEFORE and AFTER sha256, refusing on drift. It also refuses while group G's 6.68.0
  is absent from the checkout, because the LIMITS §9 slot states G's behaviour. It deletes itself on success.
- `.dev/features/hook-hardening-batch/HUMAN-PATCH.md` — the readable twin, rendered from `apply.py` by
  `.pharn/hhb-tools/render_patch.py` (scratch, uncommitted). Every edit is listed with its old text, new text and reason.
- Tests: `.claude/hooks/{protect-trusted-paths,enforce-writes-scope,set-writes-scope}.test.cjs`, plus one negative in
  `.dev/floor/command-hygiene.test.mjs`.
- Restatements (L64): `.claude/commands/pharn-loop.md` (the setter sentence), `pharn/floor/README.md` (the setter
  paragraph), `.dev/guides/writes-scope.md`, and `CHANGELOG.md` `[6.69.0]`.
- `SKILLS_VERSION` 6.67.1 → 6.69.0 and the README badge. 6.68.0 is group G's, which must merge first (orchestrator,
  2026-10-20).

Not written by the agent: the five protected files. They exist patched only in disposable measurement worktrees.

## The tests, RED before the apply and GREEN after (measured)

- **Before** (this worktree, hooks unpatched), the three hook test files: 462 tests, 425 pass, **37 fail**. All 37 are
  the new or changed tests below; every pre-existing test passes.
  - `protect-trusted-paths.test.cjs`: ★ TST-4 empty stdin; ★ TST-4 unreadable stdin (a directory descriptor); ★ TST-11
    throw after the handler's registration.
  - `enforce-writes-scope.test.cjs`: ★ TST-4 empty stdin; ★ TST-4 unreadable stdin; ✧ PIN `readStdin()` parity and the
    no-`{}` fallback; ✧ PIN `uncaughtException` handler parity and registration order.
  - `set-writes-scope.test.cjs`: 10 ★ class members refused; ★ `.git/config` hooksPath in letter-case, quoted and
    commented forms; ★ BOM and CR-only; ★ lone CR mid-line; ★ continuation fails closed; ★ subdirectory project;
    ★ stray `.git` with no HEAD walked past; ★ linked worktree plus `config.worktree`; ★ global and XDG user config;
    ★ absolute path inside versus outside; ★ `~/`; ★ symlinked hooksPath (L73); ★ hooksPath `.`; ★ every value
    counts; ★ FAIL-CLOSED unreadable config (4 cases); ★ opt-in before versus after the mode; ★ opt-in skips the
    reading; ★ opt-ins independent; ★ L27 remedies per refusal; the operator-flag loop's `--allow-exec-config` case; the
    usage line.
- **Controls, GREEN on both sides:** the whitespace-only stdin denies as invalid JSON; the TST-11 control (a throw before
  the handler exits 1); the neighbours of the class are not refused; subsection, other-section and bare-key cases; absent
  optional files and `GIT_CONFIG_GLOBAL=/dev/null`; dev checkout, unsignalled tree and `--from-frontmatter` unchanged;
  and the enforce backstop (a symlinked parent into `.github/workflows/` is denied in scoped mode).
- **Changed existing test:** `✧ MUTANT: dropping the non-object payload guard` now tells the guard's deny from a crash
  by the message. With the handler, the mutant's crash exits 2 (it exited 1 before). It is GREEN on both sides.
- **After** (patch applied in the measurement worktree): `node --test .claude/hooks/*.test.cjs` → 525 / 525 pass.

## Gates run at the real path (L26)

All of these ran in a disposable `git worktree add --detach` of HEAD `fed364dc`, under the session scratchpad. The patch
was applied there by importing `apply.py`'s `patched()` (the measurement helper `.pharn/hhb-tools/measure.py`), with
this branch's agent-written files copied in:

- `format:check`, `lint`, `lint:md`, `docs:check`, `check:markers`, `check:badge`, `check:changelog`, and
  `check:contributing`: each exit 0.
- `validate`: GREEN.
- `npm test`: 5733 tests, 5732 pass, 0 fail, 1 skipped, exit 0. That run was on the second patch revision; the result
  for the final revision is recorded below when it lands.
- `docs:check` was GREEN with no regeneration, so this increment changes no generated region.
- `check:reconcile` was not run there. The patched hooks and trusted docs are uncommitted in that worktree, so it would
  RED by design (6.53.0, L68).

**End-to-end, the script itself:** a second disposable worktree ran `python3 .dev/features/hook-hardening-batch/apply.py`
on revision 1 of the script.

- It printed five `patched` lines, deleted itself, and left the five files at the pinned AFTER hashes.
- A second run of a fresh copy refused with `is not the reviewed version`, and wrote nothing.

That worktree was removed with `git worktree remove --force`. The precondition added later (group G's 6.68.0) was not
run end to end: no checkout holds G yet. Its two string tests are in `main()`.

## Decisions made during the build

- **Approach 3 revised before any write (grill coupling finding):** plan entries are matched lexically, and the on-disk
  identity check applies to each discovered hooks directory, not to plan entries. Enforce's existing physical-target
  resolution already denies a symlinked-parent write in scoped mode. A test now pins that.
- **Second patch revision, from an independent read-only review (round 1).**
  - The project is found in a subdirectory of a repository, and a relative hooksPath is resolved against the work-tree
    top, as git does.
  - A BOM is skipped.
  - A continued value refuses.
  - The G precondition was added to `apply.py`.
  - Prose corrections: §3b's measured aggregate; §3g "57 pinned lines"; §6's `disableAllHooks` sentence (adapted from
    H1, because tests never ship); hook managers named in §6 and THREAT-MODEL item 10; §7 "uncaught exception"; item 8
    "no permission denial".
- **Third revision, from round 2.**
  - A lone CR is a blank, not a line end. Round 1's CR-only split had let `[core]\n\tfoo = a\r[x]\n\thooksPath = …`
    escape.
  - A `.git` directory with no HEAD is walked past.
  - Test fixtures carry their own `.git`.
- **Kept, and stated in the CHANGELOG:** a non-root hooksPath reserves its whole subtree, and `hooksPath = .` reserves
  every top-level entry. Both over-refuse rarely seen configurations. Narrowing them to git's hook names would be an
  enumeration to keep in sync.

## Measurement worktrees

- `.../scratchpad/hhb-wt2` and `.../scratchpad/hhb-wt3` were removed with `git worktree remove --force` once their
  measurements were done.
- `.../scratchpad/hhb-wt` was removed the same way after its last `npm test` run. `git worktree list` shows no `hhb`
  entry.

## Final revision, measured

- AFTER hashes pinned in `apply.py`:
  - protect `f3ef97c4…`
  - enforce `0405e36a…`
  - setter `fc813107…`
  - LIMITS `fe998761…`
  - THREAT-MODEL `f886f616…`
- In the measurement worktree with the final revision applied:
  - `format:check`, `lint`, `lint:md`, `docs:check`, `check:markers`, `check:badge`, `check:changelog` and
    `check:contributing`: each exit 0.
  - validate: GREEN.
  - `npm test`: 5738 tests, 5737 pass, 0 fail, 1 skipped, exit 0.
  - The hook suites alone: 525 / 525.
- In this worktree, unpatched: the three hook test files ran 462 tests, 425 pass, and 37 fail, all of them the new or
  changed tests listed above.

## After merging origin/main (2026-10-20, before the apply)

- The orchestrator approved route A1 (REVIEW). As step 1, the agent-written half was committed and `origin/main`
  (`038d71d8`, 6.68.1) was merged in. That brought group G's 6.68.0 (#369) and the README slim (#371).
- Conflicts were limited to `CHANGELOG.md`, `SKILLS_VERSION` and the README badge, and all three were resolved.
  `[6.69.0]` is taken by #372, so this increment was renumbered **6.70.0**: the CHANGELOG heading, `SKILLS_VERSION`, the
  badge, `pharn/floor/README.md` and the dev guide. Nothing in `apply.py` names this release's number, so its hashes did
  not move.
- **The five targets after the merge:** each one's sha256 equals its pinned BEFORE hash (no merged PR touched them).
- **`apply.py`'s G check now passes:** one `## [6.68.0]` heading, `other_gates` present in `test-infra-core.mjs`.
- **A read-only precheck** (`.pharn/hhb-tools/precheck.py`, which imports `apply.py` and calls `patched()` without
  writing) reported every result equal to its pinned AFTER hash: `PRECHECK OK`.
- **No README cite to repoint:** neither the patched prose nor this increment's records cite a README section that #371
  moved.
- The build's reconcile epoch is now stale (the merge happened after the anchor). REVIEW A1 steps 3–4 open a fresh one
  after the applied files are committed.
