# HUMAN-PATCH — reconcile-state-root

`pharn/LIMITS.md` is human-only: `protect-trusted-paths.cjs` denies it to the agent, and no agent may edit it. This
file proposes one wording change for a human to apply by hand. It is **optional for correctness**: the current
sentence stays true, because ignored paths are still outside the reconciled set. But it no longer names the whole
excluded set.

**When to land it (L68):** commit it on its own, or outside a build's anchor→verify window. An uncommitted edit to a
trusted doc reads as a reconcile escape, because reconcile has no attribution.

**Bump:** `pharn/LIMITS.md` ships, so a separate PR that lands this needs its own `SKILLS_VERSION` patch bump and
CHANGELOG entry. If it lands in this branch (already at 7.2.0), add one `### Fixed`/`### Changed` bullet to
`[7.2.0]` instead.

## `pharn/LIMITS.md §6` — the reconcile bounds sentence

Current text (in the bullet that begins "**It IS detected AFTERWARDS, as of `SKILLS_VERSION` 4.0.0**"):

```markdown
Four
bounds, all in `pharn/pharn-contracts/reconciliation-record.md`: ignored paths are outside the
reconciled set; the window is anchor-to-verify;
```

Proposed text:

```markdown
Four
bounds, all in `pharn/pharn-contracts/reconciliation-record.md`: ignored paths, and since 7.2.0 PHARN's own state
root `pharn/.run/` whether or not the project ignores it, are outside the reconciled set; the window is
anchor-to-verify;
```

Optionally, right after "A path still on disk that has left the reconciled set, because it became git-ignored, is only
a warning.", add:

```markdown
A Bash write to `pharn/.run/writes-scope.json` is never reported, because reconcile judges against the scope
snapshot in its own baseline, never against the live scope file.
```
