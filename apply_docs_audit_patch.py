#!/usr/bin/env python3
"""Apply docs-audit-gaps-1-3.patch in a PHARN-OSS worktree."""
import subprocess
import sys
from pathlib import Path

def main():
    repo = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd().resolve()
    patch = repo / "docs-audit-gaps-1-3.patch"
    if not (repo / "SKILLS_VERSION").is_file():
        sys.stderr.write(f"Not PHARN-OSS root: {repo}\n")
        return 2
    if not patch.is_file():
        sys.stderr.write(f"Missing {patch}\n")
        return 2
    for cmd in (
        ["git", "-C", str(repo), "apply", "--check", str(patch)],
        ["git", "-C", str(repo), "apply", str(patch)],
    ):
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode:
            sys.stderr.write(r.stderr or r.stdout)
            return r.returncode
    print(f"Applied {patch.name}")
    print("Run: npm run check:changelog && npm run check:changelog-entry")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())

