# ARCHIVE-RUNS — core-383-archive-check

Recorded runs of `.dev/floor/check-source-archive.mjs` against real tags of this repository, 2026-11-25, on git 2.50.1
(Apple Git-155) and Node v24.13.1, from the build worktree. Output is copied verbatim.

## `v7.25.5` — RED (the uninstallable release)

`node .dev/floor/check-source-archive.mjs --ref v7.25.5 .` → exit 1

```text
SOURCE-ARCHIVE: RED — git archive v7.25.5 (1755d6b8f7c261f3ac6bfe559edcb967fe775d23) as codeload serves it: 7 finding(s); pharn-cli would refuse to install it
- [UNSUPPORTED_TYPE] pharn-oss-1755d6b8f7c261f3ac6bfe559edcb967fe775d23/.claude/skills/pharn-ci-cover — type '2' (symbolic link)
- [UNSUPPORTED_TYPE] pharn-oss-1755d6b8f7c261f3ac6bfe559edcb967fe775d23/.claude/skills/pharn-ci-explain — type '2' (symbolic link)
- [UNSUPPORTED_TYPE] pharn-oss-1755d6b8f7c261f3ac6bfe559edcb967fe775d23/.claude/skills/pharn-ci-fix — type '2' (symbolic link)
- [UNSUPPORTED_TYPE] pharn-oss-1755d6b8f7c261f3ac6bfe559edcb967fe775d23/.claude/skills/pharn-ci-install — type '2' (symbolic link)
- [UNSUPPORTED_TYPE] pharn-oss-1755d6b8f7c261f3ac6bfe559edcb967fe775d23/.claude/skills/pharn-ci-policy — type '2' (symbolic link)
- [UNSUPPORTED_TYPE] pharn-oss-1755d6b8f7c261f3ac6bfe559edcb967fe775d23/.claude/skills/pharn-cli — type '2' (symbolic link)
- [UNSUPPORTED_TYPE] pharn-oss-1755d6b8f7c261f3ac6bfe559edcb967fe775d23/.claude/skills/security-audit — type '2' (symbolic link)

Each line names an entry and the extractor rule it breaks (RULES in .dev/floor/check-source-archive.mjs).
```

The seven entries are the seven mode-120000 git symlinks that made pharn-cli refuse the tarball (CORE-380).

## `v7.25.2` — GREEN (the last installable release)

`node .dev/floor/check-source-archive.mjs --ref v7.25.2 .` → exit 0

```text
SOURCE-ARCHIVE: GREEN — git archive v7.25.2 (6e79a2e58936ce8316e191acecfee2e2078c0509) as codeload serves it: 4898 entries (cap 20000), tar 42844160 B (cap 134217728), gzip 11470330 B by Node's gzip (cap 33554432); pharn-cli 51a96d29's extractor rules accept every entry
```

## HEAD after CORE-381

Recorded once CORE-381 (the symlink removal) is merged into this branch.

## What these runs show, and what they do not (P0)

They show the checker's verdicts agree with what happened: the release pharn-cli refused is RED, naming the entries it
refused, and the last release it installed is GREEN. They do not show the checker equals the CLI: it is a port of the
CLI's rules (its header lists the known differences), and the gzip size is Node's, not codeload's.
