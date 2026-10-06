#!/usr/bin/env python3
"""Follow-up 3 of claude-md-bootstrap: build L69's remedy — pin /pharn-dev-regress Step 1.3's `## Files` reader.

Step 1.3 said only "read the PLAN's `## Files` back-tick paths", so every run hand-wrote an extractor, and in
claude-md-bootstrap one split on the first literal "## Files" and passed an empty --declared (L69). This script
replaces that prose with a pinned line that calls `pathsFromPlanFiles` + `clean` from pharn/floor/plan-files-core.mjs.
That module is the parity-tested twin of the canonical parser in set-writes-scope.cjs (the setter exports nothing,
and re-running it would overwrite the stage's own writes-scope). The line writes `.pharn/pharn-dev-regress/declared.txt`
and exits 2 on a missing or empty `## Files`. Step 1.4's `--declared` reads that file.

It also records the change in the 6.46.1 CHANGELOG entry. `.claude/commands/pharn-dev-*` is apparatus, so no bump.

Usage (repo root):  python3 .dev/features/claude-md-bootstrap/followups/pin_regress_declared.py            # dry run
                    python3 .dev/features/claude-md-bootstrap/followups/pin_regress_declared.py --apply
Stdlib only. Exit 0 = applied, already applied, or dry run printed; 1 = refused (nothing written).
"""
import argparse
import difflib
import pathlib
import re
import sys

CMD = ".claude/commands/pharn-dev-regress.md"
CHANGELOG = "CHANGELOG.md"
VERSION = "6.46.1"

OLD_STEP = (
    "3. **Declared writes.** Read the feature's `.dev/features/<name>/PLAN.md` `## Files` back-tick paths — the\n"
    "   exact scope `/pharn-dev-build` was pinned to.\n"
)
NEW_STEP = (
    "3. **Declared writes.** Extract the feature's `.dev/features/<name>/PLAN.md` `## Files` paths — the exact scope\n"
    "   `/pharn-dev-build` was pinned to — with exactly this line, never a hand-written split\n"
    "   (`.dev/memory-bank/lessons-learned.md` **L69**, cited not restated — P4):\n"
    "\n"
    "   ```bash\n"
    "   node --input-type=module -e \"import {readFileSync} from 'node:fs'; import {pathsFromPlanFiles, clean} from"
    " './pharn/floor/plan-files-core.mjs'; const r = pathsFromPlanFiles(readFileSync(process.argv[1], 'utf8'));"
    " if (!r.ok || r.value.length === 0) { console.error('declared: ' + (r.reason || 'empty ## Files'));"
    " process.exit(2); } console.log(r.value.map(clean).join(','));\" .dev/features/<name>/PLAN.md >"
    " .pharn/pharn-dev-regress/declared.txt\n"
    "   ```\n"
    "\n"
    "   It uses `pharn/floor/plan-files-core.mjs`, the parity-tested twin of the canonical parser in\n"
    "   `set-writes-scope.cjs`; re-running the setter itself would overwrite this stage's own writes-scope. A non-zero\n"
    "   exit (no `## Files`, or an empty one) is a setup error: **stop** and hand to the human, never pass an empty\n"
    "   list.\n"
    "\n"
)
OLD_DECLARED = '     --declared "<PLAN.md ## Files paths>" \\\n'
NEW_DECLARED = '     --declared "$(cat .pharn/pharn-dev-regress/declared.txt)" \\\n'

DONE_BULLET = (
    "  - `/pharn-dev-regress` Step 1.3 (apparatus): L69's remedy. The `## Files` extraction is a pinned line over\n"
    "    `pharn/floor/plan-files-core.mjs` instead of prose, and Step 1.4 reads its output.\n"
)
NOT_CHANGED_PREFIX = "  - **Not changed:** "


def fail(msg):
    print(f"REFUSED — {msg}. Nothing was written.", file=sys.stderr)
    sys.exit(1)


def edit_changelog(text):
    newest = re.search(r"(?m)^## \[(\d+\.\d+\.\d+)\]", text)
    if not newest or newest.group(1) != VERSION:
        fail(f"CHANGELOG's newest section is not [{VERSION}]; add this entry by hand where it belongs")
    if DONE_BULLET in text:
        return text
    lines = text.splitlines(keepends=True)
    idx = [i for i, line in enumerate(lines) if line.startswith(NOT_CHANGED_PREFIX)]
    if not idx:
        fail("the CHANGELOG '**Not changed:**' line was not found")
    i = idx[0]
    if "any command, " in lines[i]:
        lines[i] = lines[i].replace("any command, ", "any product command, ", 1)
    lines.insert(i, DONE_BULLET)
    return "".join(lines)


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--apply", action="store_true", help="write the change (default: print a diff only)")
    ap.add_argument("--root", default=".", help="repository root (default: current directory)")
    args = ap.parse_args()
    root = pathlib.Path(args.root)
    if not (root / "pharn/floor/plan-files-core.mjs").is_file():
        fail("pharn/floor/plan-files-core.mjs is missing, so the pinned line would not run")

    cmd_path, cl_path = root / CMD, root / CHANGELOG
    cmd, cl = cmd_path.read_text(encoding="utf-8"), cl_path.read_text(encoding="utf-8")
    if NEW_STEP in cmd and NEW_DECLARED in cmd:
        new_cmd = cmd
    elif cmd.count(OLD_STEP) == 1 and cmd.count(OLD_DECLARED) == 1:
        new_cmd = cmd.replace(OLD_STEP, NEW_STEP).replace(OLD_DECLARED, NEW_DECLARED)
    else:
        fail(f"Step 1.3 or Step 1.4's --declared line in {CMD} was not found exactly once")
    new_cl = edit_changelog(cl)

    changes = [(p, a, b) for p, a, b in ((CMD, cmd, new_cmd), (CHANGELOG, cl, new_cl)) if a != b]
    if not changes:
        print("Already applied: nothing to do.")
        return
    for p, a, b in changes:
        sys.stdout.writelines(difflib.unified_diff(a.splitlines(True), b.splitlines(True), f"a/{p}", f"b/{p}"))
    if not args.apply:
        print("\nDry run. Re-run with --apply to write these changes.")
        return
    cmd_path.write_text(new_cmd, encoding="utf-8")
    cl_path.write_text(new_cl, encoding="utf-8")
    print(f"\nWritten: {', '.join(p for p, _, _ in changes)}.")
    print("Next: run `npm run check`, then commit.")


if __name__ == "__main__":
    main()
