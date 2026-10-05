#!/usr/bin/env python3
"""Apply the human-only LIMITS.md §3e patch proposed by the instruction-growth-gate increment (6.38.0).

LIMITS.md is a trusted doc: the agent's write guard denies it, so a human applies this patch. The script:

  1. checks LIMITS.md's current bytes against the pinned pre-image hash (refuses if the file moved);
  2. inserts section 3e between 3d and the `---` that precedes `## 4.`;
  3. checks the result against the pinned post-image hash before writing anything.

Run from the repository root (stdlib only, Python 3.8+):

    python3 .dev/features/instruction-growth-gate/proposed/apply_limits.py --dry-run   # show the diff, write nothing
    python3 .dev/features/instruction-growth-gate/proposed/apply_limits.py             # apply

Exit: 0 applied (or, with --dry-run, would apply) · 1 refused (nothing written).
"""

import difflib
import hashlib
import sys
from pathlib import Path

TARGET = Path("LIMITS.md")
PRE_SHA256 = "9f6d5811434ce13714aa719864931db889b87e97611643c5857753b48eaa80d6"
POST_SHA256 = "8c07bcaea3bad8d437d4d9400c73b1250c2dfaca569bd1b9752116447b1ceb45"

ANCHOR = (
    "constitution is per-call overhead × fan-out. \"Free because it's frontmatter\" is false at runtime;\n"
    "it is a real per-leaf tax.\n"
    "\n"
    "---\n"
    "\n"
    "## 4. What \"good architecture\" means here\n"
)

SECTION = """
### 3e. The always-loaded instruction set is a model, and its growth gate measures that model

`pharn/floor/check-instruction-files.mjs` models which project files Claude Code attaches to every
session: the root `CLAUDE.md` / `.claude/CLAUDE.md` (else `AGENTS.md`), their `@path` imports, and the
`.claude/rules/**/*.md` files without a `paths:` scope. The model comes from Claude Code's published
memory documentation plus the assumptions its header labels. The harness's actual set may differ in
either direction (versions, settings, `claudeMdExcludes`, HTML-comment stripping, the 4 MiB skip).

- **Struck claim:** "`instruction-growth` PASS means the session prefix did not grow."
- **True statement:** `--growth` (the `/pharn-verify` gate `instruction-growth`, 6.38.0) is a floor
  verdict over that model: the bytes added to the modelled set since a base commit, against
  `budget.instructionGrowthBytes` read from `pharn.config.json` at that base (default 2048). It measures
  changed-since-base, not written-by-the-build; with a dirty working tree only uncommitted growth is
  seen; and a per-change budget does not bound growth accumulated across changes that each stay under it.
- **Under-count routes, known so far and never a complete list:** a catch-all `paths:` pattern spelled
  another way, a YAML error the line reader does not recognise beside `paths:`, an always-loaded file
  made git-ignored, and an uncommitted edit inside an initialised submodule.
- **Not counted:** git-ignored files, `CLAUDE.local.md`, subdirectory `CLAUDE.md` files, directories
  above the project root, `~/.claude/**`, managed policy files, and auto memory.
- `--report` is advisory, and its token figure is bytes/4 (§1c). Whether `pharn update` preserves the
  `budget` key in `pharn.config.json` is not verifiable from this repository; a dropped key falls back to
  the default, which is the strict direction.
"""

INSERT_AT = ANCHOR.index("\n---\n") + 1  # after 3d's last line and its blank line, before the separator


def sha256(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def main(argv) -> int:
    dry = "--dry-run" in argv[1:]
    unknown = [a for a in argv[1:] if a != "--dry-run"]
    if unknown:
        print(f"refused: unknown argument(s) {unknown}; usage: apply_limits.py [--dry-run]", file=sys.stderr)
        return 1
    if not TARGET.is_file():
        print("refused: LIMITS.md not found — run from the repository root", file=sys.stderr)
        return 1
    before = TARGET.read_bytes()
    text = before.decode("utf-8")
    if "### 3e." in text:
        print("refused: LIMITS.md already has a section 3e — nothing to do", file=sys.stderr)
        return 1
    if sha256(before) != PRE_SHA256:
        print(
            f"refused: LIMITS.md is not the pinned pre-image (sha256 {sha256(before)}, expected {PRE_SHA256});"
            " it changed since this patch was written — re-derive the patch",
            file=sys.stderr,
        )
        return 1
    if text.count(ANCHOR) != 1:
        print("refused: the insertion anchor (end of 3d, then `## 4.`) is not found exactly once", file=sys.stderr)
        return 1
    at = text.index(ANCHOR) + INSERT_AT
    after_text = text[:at] + SECTION.lstrip("\n") + "\n" + text[at:]
    after = after_text.encode("utf-8")
    if POST_SHA256 != "__POST__" and sha256(after) != POST_SHA256:
        print(f"refused: the patched result does not match the pinned post-image (got {sha256(after)})", file=sys.stderr)
        return 1
    diff = difflib.unified_diff(
        text.splitlines(keepends=True), after_text.splitlines(keepends=True), "a/LIMITS.md", "b/LIMITS.md"
    )
    sys.stdout.writelines(diff)
    if dry:
        print(f"\n--dry-run: nothing written (result sha256 {sha256(after)})")
        return 0
    TARGET.write_bytes(after)
    print(f"\napplied: LIMITS.md now sha256 {sha256(after)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
