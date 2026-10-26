# HUMAN-PATCH — release-workflow

Two trusted docs need text for the release gate. Both are human-only (`protect-trusted-paths.cjs`, fix #2), so the
agent proposes the text and a human applies it. Decided at GATE 1 (Q2 a): a new `pharn/LIMITS.md §11`, and one
sentence on `pharn/THREAT-MODEL.md §4` item 2.

**When to apply (lessons-learned L68).** After `/pharn-dev-verify` has written its report, or after this pull request
merges, as its own pull request. Not inside the build's anchor-to-verify window: `check-bash-reconcile.mjs` cannot
tell your edit from a stray write, and would turn verify `FAIL`. A trusted-doc edit changes product-surface bytes,
so the pull request that carries it bumps `SKILLS_VERSION` (patch) and opens its CHANGELOG section (CLAUDE.md,
"SKILLS_VERSION discipline").

## 1. `pharn/LIMITS.md` — append after §10

```markdown
---

## 11. A merge to `main` is not a release; only the release channel waits for CI

pharn-cli installs one of two channels. The default, `main`, takes the tip of `main`: whatever merged last, before
its checks on `main` have finished. `--ref latest` takes the newest GitHub release. Since `.github/workflows/release.yml`,
a release exists only for a commit on which `floor`, `check`, `Analyze (javascript-typescript)` and
`Socket Security: Project Report` concluded `success`. The workflow tags it `v<SKILLS_VERSION>` and never moves a tag
that points elsewhere.

- **Struck claim:** "every merge to `main` is a release."
- **True statement:** every merge reaches the `main` channel; a merge that bumps `SKILLS_VERSION` also becomes a
  release once its required checks are green on `main`; an `[Unreleased]` merge releases nothing new.
- **Bounds.** The gate is a property of a GitHub Actions workflow, not a PHARN floor primitive.
  - The owner's ruleset bypass still merges a red tree onto `main`, and the `main` channel installs it. The release
    job only keeps that commit from being tagged.
  - A person with admin rights can create or move a tag by hand unless a tag ruleset protects `v*`.
  - The workflow's check list is a copy of the ruleset's. A check added to the ruleset and not to the workflow is
    not waited for. `Socket Security: Pull Request Alerts` is left out on purpose: it runs on pull requests only.
  - A newer push cancels an older _pending_ release run, so a version bumped twice before the first run starts gets
    no tag of its own.
- **Backstop:** pharn-cli refuses a draft or prerelease, a tag that does not match `v<X.Y.Z>`, and a tagged tree
  whose root `SKILLS_VERSION` differs from the tag (pharn-cli `src/lib/release.ts`, `src/lib/repo.ts`).
```

## 2. `pharn/THREAT-MODEL.md` — §4, item 2, append to the closure note

Current text ends: `…outside that window it is neither denied nor detected (residual — \`pharn/LIMITS.md §6\`)._`

Proposed: insert before the closing `_`:

```markdown
The same split holds one layer up, at GitHub: `main`'s ruleset binds other contributors but not the owner's
bypass, so a red tree can still reach `main`; since `release.yml`, only a commit whose required checks
succeeded is tagged, so pharn-cli's `--ref latest` channel does not receive it (`pharn/LIMITS.md §11`).
```

## Checks after applying

```bash
npm run check
node pharn/floor/validate.mjs .
```

`npm run check` includes `check:reconcile`. A trusted-doc edit that is not committed REDs it (the always-reconciled
control surface, L68), so commit first.
