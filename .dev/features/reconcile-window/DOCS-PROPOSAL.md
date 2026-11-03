# DOCS-PROPOSAL — reconcile-window (trusted-doc text for the owner to apply)

`pharn/LIMITS.md` is human-only. These are the exact replacements this increment needs, as of
`origin/batch/audit-2026-11-03` @ `fb997e4b` (line numbers from that tree). Each replaces whole lines.

## 1. §6 — why `writes-scope.json` stays outside reconcile (lines 347-349)

Old (`pharn/LIMITS.md:347-349`):

```text
  reconciled set, because it became git-ignored, is only a warning. A Bash write to
  `pharn/.run/writes-scope.json` is never reported, because reconcile judges against the scope snapshot in its own
  baseline, never against the live scope file. **The supported claim is exactly "a write to a path the active
```

New:

```text
  reconciled set, because it became git-ignored, is only a warning. A Bash write to
  `pharn/.run/writes-scope.json` is never reported, because reconcile judges against the scope snapshot in its own
  baseline, never against the live scope file. Reconciling that file would report the setter's own designed rewrite as
  an escape on every correct run, which reconcile cannot tell from a hand-edit; a write a forged scope widens is still
  judged against the snapshot (7.3.0). **The supported claim is exactly "a write to a path the active
```

## 2. §6 — the erase direction of "one worktree per session" (lines 353-355)

Old (`pharn/LIMITS.md:353-355`):

```text
  anchor-to-verify; the model is **one worktree per session** (two sessions
  sharing a tree share `pharn/.run/`, so a second session's writes can surface as this one's escape —
  [[L38]], which this inherits and cannot fix); and there is **no attribution** — it reports *what*,
```

New:

```text
  anchor-to-verify; the model is **one worktree per session** (two sessions
  sharing a tree share `pharn/.run/`, so a second session's writes can surface as this one's escape —
  [[L38]], which this inherits and cannot fix — and the tree holds ONE baseline, so a second run's build anchor
  replaces the first run's window and erases the escapes recorded in it; since 7.3.0 `--anchor` refuses to do that
  while the other feature's `/pharn-loop` or `/pharn-ship` marker is open, but a marker closed early or older than
  24 h, runs that open no marker, and two runs of one feature still erase each other's window,
  `reconciliation-record.md` §1); and there is **no attribution** — it reports *what*,
```

## 3. §6 — the always-reconciled list (lines 360-362)

Old (`pharn/LIMITS.md:360-362`):

```text
  the always-reconciled control surface (`.claude/hooks/*`, `.claude/settings*.json`, `pharn/floor/*`,
  `.dev/floor/*`, and since 6.53.0 the four trusted docs, `CODEOWNERS`, `pharn/spec-template.md` and memory-bank canon,
  an added untracked file included) is compared against **committed blob ids** rather than against the baseline, so that
```

New:

```text
  the always-reconciled control surface (`.claude/hooks/*`, `.claude/settings*.json`, `pharn/floor/*`,
  `.dev/floor/*`, since 6.53.0 the four trusted docs, `CODEOWNERS`, `pharn/spec-template.md` and memory-bank canon, and
  since 7.3.0 the CI exec-config `.github/workflows/*` and `.github/actions/*`, an added untracked file included) is
  compared against **committed blob ids** rather than against the baseline, so that
```

The sentence that follows (:363-365, "The cost, stated ([[L68]]) ... commit it before running the gates") already
covers the new members' cost and needs no change.
