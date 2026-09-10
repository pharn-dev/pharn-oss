# SPEC — bash-write-reconciler

- spec_id: bash-write-reconciler
- state: Draft
- date: 2026-09-10
- base: `d851a08`

> **Artifact-location note.** This increment builds PHARN itself, so its audit trail belongs under
> `.dev/features/` (CLAUDE.md, dev/product boundary). There is no `/pharn-dev-spec` stage — `SPEC.md` is a
> **product**-pipeline artifact. It exists here because the task asked for the out-of-scope statements to
> live in a SPEC, and because a scope boundary this contested deserves its own file rather than a
> subsection of the plan. It is **not** consumed by any checker: no `spec_content_hash` is pinned, and
> `check-spec.mjs` is not run over it. Stated so nobody reads it as a gated artifact.

## Problem

A write issued through the **`Bash`** tool reaches every path in the repository. The `PreToolUse` matcher
in `.claude/settings.json` is `Write|Edit|MultiEdit|NotebookEdit`; both guards re-test that set in their
own code (`enforce-writes-scope.cjs:333`, `protect-trusted-paths.cjs:555`), so neither runs. The write is
**not denied**, and **nothing records that it happened** — no `PostToolUse` hook is wired
(`grep -c PostToolUse .claude/settings.json` → `0`).

PR #208 corrected the _claims_ about this. This increment addresses the _gap_.

## Intent

Make an out-of-scope `Bash` write **deterministically detectable**, and make that detection **fail a
stage whose verdict is already read as a proceed/stop input**.

## The claim this increment must support, literally

> **A `Bash` write to a path the active writes-scope would have denied is detected, and fails
> `/pharn-verify`.**

Every word is load-bearing and each is bounded below. Notably it does **not** say "Bash writes are
prevented", and it does not say "all Bash writes are detected" — only those to paths the guards would
have denied, within the reconciled set.

## Out of scope — stated, not deferred silently

1. **OS-level sandboxing of the `Bash` process.** This is the **only true prevention**, and PHARN does
   not implement it. A filesystem jail, a read-only mount, or an equivalent harness-layer control makes
   the write fail before any hook would be consulted. It is **harness-layer, environment-dependent, and
   not expressible in markdown methodology** — the same category `LIMITS.md §1d` already uses for its
   out-of-band approval signal. Named in `LIMITS.md` (patch handed to a human, this increment).
   Detection is **strictly weaker** than prevention and is never to be described as a substitute.
2. **Rollback of a write that already happened.** The reconciler reports; it never reverts. Reverting
   would require the pre-write content, which nothing captures, and a revert is itself a write.
3. **Any allowlist or denylist of shell verbs.** Shell parsing is undecidable — command substitution,
   `eval`, an interpreter invoked with a here-doc, a compiled binary, a `Makefile` target, or a
   `node -e` one-liner all write files without naming a write verb. A verb list is a **heuristic**, and
   `pharn/CONSTITUTION.md` P0 forbids labelling a heuristic a guarantee. Detection is therefore
   **path comparison plus content hashing**, which is decidable, and **zero model judgment** enters the
   verdict.
4. **Attributing a detected change to a specific command, actor, or `Bash` invocation.** The reconciler
   answers "this path changed and the guards would have denied it"; it does **not** answer "who". The
   `tool_use_id` correlation of item 7 narrows the window, never the culprit.
5. **Detecting a `Bash` write to a path the guards would have PERMITTED.** In-scope Bash writes are
   **clean by design** — a stage's own formatter pass is exactly this, and REDding it would make every
   normal run fail. The rule is about _scope escape_, not about _tool choice_.
6. **Reaching outside the repository root.** `/tmp`, `$HOME`, and absolute paths outside the worktree are
   out of jurisdiction — no writes-scope entry can express them (`enforce-writes-scope.cjs`'s
   `toRel() === null` branch already says so). `/pharn-ship`'s `> /tmp/briefing-draft.md` is unaffected.

## Success criteria

- A Bash write to a path outside the active scope makes `/pharn-verify` emit `FAIL`.
- A Bash write to a path **inside** the active scope leaves the verdict unchanged.
- With no scope set, behaviour matches `enforce-writes-scope.cjs`'s runtime fail-closed default exactly —
  by **delegating to that file**, never by copying its set.
- Every Phase-2 inventory site is classified, and a normal `/pharn-dev-ship` run stays green.
- The control surface is reconciled even when the reconciler's own state file is absent or forged.

## Non-goals restated as claims that must NOT appear

- ~~"PHARN prevents Bash writes."~~ **Struck.** It detects a subset of them, after the fact.
- ~~"The writes-scope guarantee now covers all tools."~~ **Struck.** The _guard_ still covers four tools;
  a second, weaker mechanism _observes_ the fifth.
- ~~"A green verify means no Bash escape occurred."~~ **Struck.** It means none was detected within the
  reconciled set, under the bounds in `## Known bounds` of the PLAN.
