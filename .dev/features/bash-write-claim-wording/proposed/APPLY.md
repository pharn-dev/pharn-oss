# APPLY — bound the write-guard claims in the two root trusted docs

**Status: PROPOSED — NOT APPLIED. A human must apply this.**

`LIMITS.md` and `THREAT-MODEL.md` are trusted docs (`trust: trusted`, `editable_by: "human only"`).
`.claude/hooks/protect-trusted-paths.cjs` denies every `Write`/`Edit`/`MultiEdit`/`NotebookEdit` to them,
and **no write was attempted** by this increment. The route CLAUDE.md forbids — routing an in-repo write
through Bash to dodge the guard — was **not taken**.

## What to run

```bash
git apply .dev/features/bash-write-claim-wording/proposed/LIMITS.md.patch
git apply .dev/features/bash-write-claim-wording/proposed/THREAT-MODEL.md.patch
```

Both were generated mechanically (exact-match substitution, each asserted to match exactly once) and both
were verified with `git apply --check` against the live worktree at `d851a08`: **APPLIES CLEANLY**.
`--check` writes nothing; the files in this branch are byte-identical to `main`.

## Why the agent could not do it (probed, not assumed — lessons-learned L37)

| payload                                                       | hook                        | verdict             |
| ------------------------------------------------------------- | --------------------------- | ------------------- |
| `{"tool_name":"Edit","tool_input":{"file_path":"LIMITS.md"}}` | `protect-trusted-paths.cjs` | **exit 2** — denied |
| `{"tool_name":"Bash",…{"command":"printf x >> LIMITS.md"}}`   | `protect-trusted-paths.cjs` | exit 0 — not denied |

The second row is the increment's whole subject, and it is why these patches are handed over rather than
applied: the guard that makes these files human-only is itself scoped to one tool surface.

## L26 bound, stated rather than assumed

L26 warns that a patch verified against a copy **outside** the repo runs under different rules, because
config-driven gates (`eslint`, `prettier`, `markdownlint`) resolve their configuration by path. That
vector is **absent here**, and it was checked rather than hoped: both files are listed in
`.prettierignore` and in `.markdownlint-cli2.jsonc`'s `ignores`, so **no style gate runs over either file
in either location**. The patched copies were still measured for line width against the originals —
`LIMITS.md` adds nothing longer than 127 cols (original max 222); `THREAT-MODEL.md` adds nothing longer
than 293 cols (original max 308). No line I add is the longest line in its file.

## What each hunk corrects, and why

### `LIMITS.md` — 2 hunks

1. **§1d Backstop, the universal quantifier.** The text read _"the pre-write / writes-scope hooks … re-gate
   **every downstream write** and network call regardless of `state`."_ That is false for a `Bash` write,
   which reaches every path in the repo. This is the exact fragment L37 names — a careful reading confirms
   the listed members and never hunts the unlisted exception. The hunk bounds the quantifier to the tool
   surface and points at the new §6.
2. **New §6, "The write guards cover one tool surface; `Bash` is outside it."** `LIMITS.md` did not
   mention `Bash`, shell writes, or sandboxing **anywhere** before this patch — a case-insensitive grep
   over `LIMITS.md` for `bash`, `bypass`, `shell` and `sandbox` returns **no matches** at `d851a08` —
   while `README.md` carried the
   limitation and `THREAT-MODEL.md` carried a partial version of it. Since `LIMITS.md` is the file that
   wins when claims conflict ("If a claim elsewhere contradicts a limit named here, the limit wins"), the
   limit belonged here and was missing.

   §6 records: the wired matcher; a probe table with exit codes; the struck claims; that a `Bash` write is
   **neither denied nor detected at the time it happens** (no `PostToolUse` hook is wired); the one
   partial, advisory detector with its four bounds; and **OS-level sandboxing of the `Bash` process as the
   only true prevention, named as unimplemented and harness-layer** — the same category §1d already uses
   for its out-of-band approval signal.

   **Placement note for the applier:** §6 is a new trailing section rather than a fifth member of §1,
   because §1 is titled "The four **irreducible** limits" and this one _is_ reducible — by a sandbox this
   repository cannot ship. Folding it in would have required either breaking that count or diluting
   "irreducible". Move it if you prefer; the content does not depend on the position.

### `THREAT-MODEL.md` — 3 hunks

1. **§3 map table, `memory poisoning` row.** Floor column read bare `pre-write hook`. Now names the four
   tools and states that a `Bash` write reaches canon unhooked and undetected. This matters more than the
   other two: §2 #3 calls memory-bank poisoning _"the worst persistence vector"_, and the row that answers
   it was the one asserting the guard without its bound.
2. **§4 item 2.** Already said _"Closed against the Write/Edit/MultiEdit surface"_ — the closest thing to
   an honest bound anywhere in the four docs, but it **omits `NotebookEdit`**, which the live matcher has
   carried since it was added. Corrected to the four tools the matcher actually names, and the residual is
   sharpened: the Claude Code permission layer gates **commands, not paths**, and is not a PHARN floor
   primitive, so "rests on the permission layer" should not be read as a path-scoped guarantee.
3. **§4 item 7.** Read _"Closed for writes."_ full stop — the flattest overclaim of the three, since fix #7
   is precisely the guarantee this increment is bounding. Now closed **for writes issued through that tool
   surface**, with the note that `writes:` reverts to being a declaration where `Bash` is available.

## What this patch does NOT do

- It does not change any behavior, checker, or hook. Wording only.
- It does not claim `Bash` writes are prevented, or that the partial detector is a backstop.
- It does not touch `pharn/CONSTITUTION.md` or `pharn/ARCHITECTURE.md`. Neither was audited for this claim
  class in this increment; if the same overclaim lives there, it is unfixed and unreported here.

## SKILLS_VERSION consequence for the applier

`README.md` is repo-meta and does **not** bump. `LIMITS.md` and `THREAT-MODEL.md` **are** two of the four
trusted docs and therefore **are** in the bump-triggering set (CLAUDE.md, "SKILLS_VERSION discipline") —
even though the installer never copies them into a user's project. **So applying these two patches owes a
`SKILLS_VERSION` bump and a `CHANGELOG.md` entry; the README change in this same branch does not.** The
bump size is **patch** — a correction to bytes that already shipped, no new capability, no shape change.
