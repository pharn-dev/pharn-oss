#!/usr/bin/env python3
"""Follow-up 1 of claude-md-bootstrap: a PERSON runs this to fix one stale comment in a human-only hook.

`.claude/hooks/require-loop-record.cjs:16` says its "WHAT THIS GUARD CANNOT DO" list is repeated verbatim in
CLAUDE.md. Since 6.46.1 CLAUDE.md holds no such text; `.dev/guides/floor-orchestration.md` holds a summary of it
(a paraphrase, not a copy — dedupe_floor_guides.py measured it), so the comment names the guide as a summary.

The hook is protected against the agent's Write/Edit tools (protect-trusted-paths.cjs), so the agent did not run
this against the real file. A human runs it, which is the edit-it-outside-the-agent-loop route CLAUDE.md names.

It also updates the 6.46.1 CHANGELOG entry: the hook is shipped (product surface), so the change rides the 6.46.1
bump already on this branch. If CHANGELOG's newest section is not [6.46.1], or SKILLS_VERSION is not 6.46.1, it
stops: the change would then need its own bump.

Usage (repo root):  python3 .dev/features/claude-md-bootstrap/followups/fix_hook_comment.py            # dry run
                    python3 .dev/features/claude-md-bootstrap/followups/fix_hook_comment.py --apply
Stdlib only. Exit 0 = applied, already applied, or dry run printed; 1 = refused (nothing written).
"""
import argparse
import difflib
import pathlib
import re
import sys

HOOK = ".claude/hooks/require-loop-record.cjs"
GUIDE = ".dev/guides/floor-orchestration.md"
CHANGELOG = "CHANGELOG.md"
VERSION = "6.46.1"

OLD_COMMENT = "// (repeated verbatim from the plan, the PR and CLAUDE.md, never paraphrased into something stronger)\n"
NEW_COMMENT = (
    "// (repeated verbatim from the plan and the PR; .dev/guides/floor-orchestration.md summarizes it, and no copy\n"
    "// may paraphrase it into something stronger)\n"
)

OLD_TODO = (
    "    - `.claude/hooks/require-loop-record.cjs:16` still says its header is repeated in `CLAUDE.md`. That file is\n"
    "      human-only, so a person must edit it.\n"
)
DONE_BULLET = (
    "  - `.claude/hooks/require-loop-record.cjs` (shipped; human-only, so a person applied it with\n"
    "    `.dev/features/claude-md-bootstrap/followups/fix_hook_comment.py`): its header comment no longer says\n"
    "    `CLAUDE.md` repeats its limits verbatim; it names `.dev/guides/floor-orchestration.md` as a summary. Comment only.\n"
)
NOT_CHANGED_PREFIX = "  - **Not changed:** "
NOT_DONE_LINE = "  - **Not done:**\n"


def fail(msg):
    print(f"REFUSED — {msg}. Nothing was written.", file=sys.stderr)
    sys.exit(1)


def edit_changelog(text):
    newest = re.search(r"(?m)^## \[(\d+\.\d+\.\d+)\]", text)
    if not newest or newest.group(1) != VERSION:
        fail(f"CHANGELOG's newest section is not [{VERSION}]; this shipped-hook change needs its own bump")
    if DONE_BULLET in text:
        return text
    if text.count(OLD_TODO) != 1:
        fail("the CHANGELOG 'Not done' bullet for the hook was not found exactly once")
    text = text.replace(OLD_TODO, "")
    lines = text.splitlines(keepends=True)
    idx = [i for i, line in enumerate(lines) if line.startswith(NOT_CHANGED_PREFIX)]
    if len(idx) < 1:
        fail("the CHANGELOG '**Not changed:**' line was not found")
    i = idx[0]
    if "hook, " in lines[i]:
        lines[i] = lines[i].replace("hook, ", "", 1)
    lines.insert(i, DONE_BULLET)
    text = "".join(lines)
    # An emptied "Not done:" list loses its heading line.
    after = text.split(NOT_DONE_LINE, 1)
    if len(after) == 2 and not after[1].startswith("    - "):
        text = after[0] + after[1]
    return text


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--apply", action="store_true", help="write the change (default: print a diff only)")
    ap.add_argument("--root", default=".", help="repository root (default: current directory)")
    args = ap.parse_args()
    root = pathlib.Path(args.root)

    if (root / "SKILLS_VERSION").read_text().strip() != VERSION:
        fail(f"SKILLS_VERSION is not {VERSION}")
    guide = (root / GUIDE).read_text(encoding="utf-8")
    if "WHAT IT CANNOT DO (verbatim from its header)" not in guide:
        fail(f"{GUIDE} no longer holds the guard's limits, so the new comment would be false")

    hook_path, cl_path = root / HOOK, root / CHANGELOG
    hook, cl = hook_path.read_text(encoding="utf-8"), cl_path.read_text(encoding="utf-8")
    if NEW_COMMENT in hook:
        new_hook = hook
    elif hook.count(OLD_COMMENT) == 1:
        new_hook = hook.replace(OLD_COMMENT, NEW_COMMENT)
    else:
        fail(f"the comment line in {HOOK} was not found exactly once")
    new_cl = edit_changelog(cl)

    changes = [(p, a, b) for p, a, b in ((HOOK, hook, new_hook), (CHANGELOG, cl, new_cl)) if a != b]
    if not changes:
        print("Already applied: nothing to do.")
        return
    for p, a, b in changes:
        sys.stdout.writelines(difflib.unified_diff(a.splitlines(True), b.splitlines(True), f"a/{p}", f"b/{p}"))
    if not args.apply:
        print("\nDry run. Re-run with --apply to write these changes.")
        return
    hook_path.write_text(new_hook, encoding="utf-8")
    cl_path.write_text(new_cl, encoding="utf-8")
    print(f"\nWritten: {', '.join(p for p, _, _ in changes)}.")
    print("Next: run `npm run check`, then commit. The hook is part of the always-reconciled control surface, so a")
    print("local `check:reconcile` can report it as an escape until the edit is committed (lessons-learned L68).")


if __name__ == "__main__":
    main()
