# PLAN — griller-extract-fs-race

- feature: griller-extract-fs-race
- applied_lessons: none

Fixes CodeQL alert #21 (`js/file-system-race`, high) in `pharn/floor/griller-extract.mjs`, shipped in 6.60.0 (#346).
The orchestrator merged #346 with that check failing; this is the correction. Run on the light path under the
maintainer's 2026-10-13 delegation ("no commands at all" for small changes). That choice is a model decision, not a
human approval.

`extractGrillers()` checks each griller path with `lstatSync` (symlink, regular file), resolves it with `realpathSync`
(inside the repo), and then reads it again BY PATH with `readFileSync`. Between the check and the read the path can be
replaced, for example by a symlink to a file outside the repo, and the read follows it. The fix keeps every refusal and
reads through one descriptor:

1. `realpathSync` first: a path that does not resolve is refused, and one that resolves outside the repo is refused, as
   before.
2. `openSync(abs, O_RDONLY | O_NOFOLLOW | O_NONBLOCK)`: a symlink at the final component fails to open (`ELOOP`) and is
   refused as a symlink; `O_NONBLOCK` keeps a FIFO from blocking the open.
3. `fstatSync(fd)`: anything that is not a regular file is refused.
4. `readFileSync(fd)`: the bytes read are the bytes of the file just checked.

One message changes: a griller path that does not exist now reads "cannot be found" (it said "cannot be lstat-ed"),
and the test row that pins it follows.

## Files

- `.dev/features/griller-extract-fs-race/PLAN.md` — **NEW.** This file.
- `pharn/floor/griller-extract.mjs` — **EDIT.** Read through one descriptor.
- `pharn/floor/griller-extract.test.mjs` — **EDIT.** The missing-file message; a FIFO griller is refused without
  blocking.
- `CHANGELOG.md` — **EDIT.** A `[6.60.1]` section.
- `SKILLS_VERSION` — **EDIT.** Patch bump.
- `README.md` — **EDIT.** The version badge.
