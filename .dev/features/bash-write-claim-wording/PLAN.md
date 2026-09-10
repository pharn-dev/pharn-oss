# PLAN — bash-write-claim-wording

- spec_content_hash: bed2c2a58c113a374056ab23d2c74fe1a3395fa62be12e7a654e3b260552e299
- applied_lessons: [L1, L2, L7, L13, L19, L26, L33, L37, L38]
- increment: Close an internal inconsistency in `README.md`: the Guaranteed-vs-advisory table states the
  writes-scope guarantee without the tool-surface bound in the row's own text, while the limitation
  below understates the exposure. Wording only — no checker, no hook, no behavior change.
- layer(s): none (repo-meta; `README.md` is not product surface, so no `SKILLS_VERSION` bump)
- constitution_refs: [P0, P4, P5, P6, P7]

## Applied lessons

- **L1** — Meta-doc sweep run against **live** state at `d851a08`, not assumed. `README.md` is the only
  meta-doc this increment invalidates: it is repo-meta, so no `SKILLS_VERSION` bump and no `CHANGELOG`
  entry are owed (CLAUDE.md `## SKILLS_VERSION discipline`; precedent `f9d7ab9`, whose own commit
  message states the same rule for the same file). Verified the generated `CURRENT-STATE` region is
  untouched by this edit, so `npm run docs:generate` owes nothing.
- **L2** — The honesty travels **in the artifact**: the bound goes into the table row's own text, not
  only into a note below the table, and every floor op named in the new prose was verified live this run
  (probes A–G below), never cited from the spec.
- **L7** — `## Files` names exactly the one file this increment writes. No trusted doc appears: the two
  trusted-doc patches are handed to the human as diffs, so this stage holds no scope to them.
- **L13** — This stage formats its own artifacts (`prettier` + `markdownlint-cli2 --fix`, scoped to the
  written paths) before halting, rather than leaving it for a mid-pipeline manual pass.
- **L19** — The formatter run above is a **Bash** write and therefore passes neither fix #2 nor fix #7.
  Declared here as a known, accepted escape scoped to this increment's own files — never a repo-wide
  sweep. This lesson is also the increment's **subject**.
- **L26** — The `LIMITS.md` / `THREAT-MODEL.md` patches are human-only, so they are verified **against
  the repo copy in place**, not a sandbox copy. Recorded bound: both files are `.prettierignore`d and
  markdownlint-excluded, so no style gate runs over them in either location — the L26 false-GREEN vector
  (config-driven gates resolving by path) is **absent here**, and that is stated rather than assumed.
- **L33** — The new prose asserts a **negative** ("not implemented", "no checker"). That claim class
  expires silently the moment the work lands, so it is written to name the enforcement point that would
  have to change, and Phase 3 of this task is the increment that would expire it.
- **L37** — The correction is itself a **quantified** claim about what a guard permits, which is the
  exact fragment L37 says a careful reading does not check. Every quantifier below was **executed**, not
  read: probes A–G, with exit codes recorded beside the sentences they license. Probe F is what forced
  the wording change described in `## Discrepancies` — the flat "neither denied nor detected" the task
  prescribed is **false at HEAD**.
- **L38** — Run from an isolated worktree (`.claude/worktrees/bash-write-claim-wording`, branch
  `fix/bash-write-claim-wording`, based on `d851a08`), because two other worktrees are live in this repo
  and `.pharn/writes-scope.json` is one mutable record global to a working tree. Structural, per L38's
  remedy — never hand-filtering `--changed`.

## Probes run live this run (L37 — execute the quantifier, record the exit code)

| #   | Probe                                                                         | Result                                                         |
| --- | ----------------------------------------------------------------------------- | -------------------------------------------------------------- |
| A   | `{"tool_name":"Bash",…"printf x >> README.md"}` → `enforce-writes-scope.cjs`  | **exit 0** — not denied                                        |
| B   | `{"tool_name":"Bash",…"printf x >> LIMITS.md"}` → `protect-trusted-paths.cjs` | **exit 0** — not denied                                        |
| C   | `{"tool_name":"Edit","file_path":"LIMITS.md"}` → `protect-trusted-paths.cjs`  | **exit 2** — control, denied                                   |
| D   | `grep -c PostToolUse .claude/settings.json`                                   | **0** — no PostToolUse wired                                   |
| E   | `isWrite` regex in both hooks                                                 | `^(Write\|Edit\|MultiEdit\|NotebookEdit)$` — re-tested in-hook |
| F   | `check-regress.mjs scope --changed README.md --declared pharn/floor/x.mjs`    | **exit 1**, blocking finding — a partial detector DOES exist   |
| G   | `check-regress.mjs scope --changed README.md --declared README.md`            | **exit 0** — clean when declared                               |

`.claude/settings.json` wires exactly one `PreToolUse` block, matcher
`Write|Edit|MultiEdit|NotebookEdit`, two hook commands; `.claude/settings.local.json` wires no hooks
(read live: its only top-level key is `permissions`).

## Discrepancies from the task brief (reported, not worked around)

1. **"neither denied nor detected" is false at HEAD.** Probe F shows
   `pharn/floor/check-regress.mjs scope` exits **1** with a blocking `P0` finding on a changed path the
   plan did not declare. The checker's own header (`pharn/floor/check-regress.mjs:129-131`) says so
   explicitly: _"This matters most for a Bash-tool write, which bypasses `enforce-writes-scope.cjs`
   entirely (L19) and leaves this check as the last detector."_ Writing the flat claim would have
   introduced a fresh false sentence in the **underclaiming** direction — exactly L33's polarity.
   Resolution: the bullet says **not denied, and not detected at write time**, then names the one
   partial, advisory, after-the-fact detector and its four bounds.
2. **`main` moved during discovery.** The session opened at `8bc6c0a`; live `main` was `4bd1b0c`, and
   two further commits (`f9d7ab9`, `d851a08`) landed mid-run — `f9d7ab9` changed `README.md` by 43 lines
   and added a Guaranteed-table row. Every line cite in this plan is re-derived against `d851a08`.
3. **The table row already carried the bound anaphorically.** Row 3 reads "That **same** tool surface",
   which inherits row 1's phrase. The task's premise ("states the guarantee without naming the bound")
   is therefore not literally true — but the fix stands: a table row is read in isolation, and two rows
   now separate it from its antecedent. Made explicit rather than inherited.

## Files

- `README.md` — EDIT, three sites, wording only. (1) `:263` the hooks mermaid edge — retarget the Bash
  edge from the shared `write proceeds` node to its own terminal, so "the guard allowed it" and "the
  guard never saw it" stop rendering as one outcome. (2) `:298` Guaranteed table row 3 — carry the
  tool-surface bound in the row's own text instead of inheriting it from row 1. (3) `:393` the
  `Shell writes` limitation bullet — not denied, not detected at write time, the one partial detector
  named and bounded, and OS-level sandboxing named as the only true prevention and as unimplemented.
  — layer: none (repo-meta)
- `.dev/features/bash-write-claim-wording/proposed/APPLY.md` — NEW. The human-apply hand-off for the two
  trusted docs (the `canon-write-denylist` / `claude-dir-scan-exclusion` precedent). — layer: none
  (apparatus, never ships)
- `.dev/features/bash-write-claim-wording/proposed/LIMITS.md.patch` — NEW. Exact unified diff, generated
  by exact-match substitution and verified with `git apply --check`. — layer: none (apparatus)
- `.dev/features/bash-write-claim-wording/proposed/THREAT-MODEL.md.patch` — NEW. Same. — layer: none
  (apparatus)

This plan (`PLAN.md`) and the three `proposed/` files above are this stage's **own artifacts**, written
under the fail-closed default safe-set (`.dev/features/**`), not under the `README.md` scope — which was
set from this `## Files` list, narrowed to `README.md`, held for exactly the three README edits, and then
released with `--clear`. Stated because L7 requires the declaration to equal what was actually written.

### Deliberately NOT in scope

- `LIMITS.md`, `THREAT-MODEL.md` — trusted docs, hook-denied to this agent (probe C). Patches are
  produced as exact diffs and handed to the human; **no write is attempted** (fix #2 respected, not
  worked around).
- `SKILLS_VERSION`, `CHANGELOG.md` — `README.md` is repo-meta, outside the bump-triggering set.
- Any checker, hook, or contract — Phase 1 is wording only. The detector Phase 3 would build is a
  separate increment behind its own human gate.
- `pharn/floor/check-regress.mjs`'s named FOLLOW-UP (compare `## Files` across base and HEAD) — a real,
  already-recorded residual, and not this increment's axis (P7).

## Guarantee audit (P0)

- **"the README now states the tool-surface bound"** → **ADVISORY.** No checker reads README prose:
  `validate.mjs` ignores root docs, `check-capability-catalog` guards only the `CURRENT-STATE` markers,
  `check-version-badge` reads only the shields badge. This is the L37 gap, unchanged by this increment.
- **"a Bash write is not denied"** → **FLOOR, verified** (probes A, B, D, E): the wired matcher excludes
  `Bash`, and both hooks re-test it in their own code.
- **"a Bash write is detectable"** → **ADVISORY, and partial** (probe F): `check-regress.mjs scope`
  reports it only if that stage runs, compares changed-since-base rather than written-by-the-build,
  carries closed-enum exemptions, and is defeated by a `## Files` edit its own header documents.
- **"OS-level sandboxing would prevent it"** → **NOT IMPLEMENTED, and labeled as such.** Named as the
  only true prevention; nothing in this tree provides it.
