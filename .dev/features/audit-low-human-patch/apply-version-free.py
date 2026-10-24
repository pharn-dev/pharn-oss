#!/usr/bin/env python3
"""Second maintainer-run patch for audit-low-human-patch: make LIMITS.md §7's TST-12 cite version-free.

The first patch (apply.py, applied at 1d16b36d and committed in 279a19ca) wrote "(6.73.1, audit TST-12)" into
LIMITS.md §7, citing the branch's provisional version. Renumbering by diff against main (6.72.3) gives this PR another
number, so that cite would be false; LIMITS.md is hook-protected, so only a human may correct it. This edit drops the
version, so no later renumbering can make the cite false again.

    python3 .dev/features/audit-low-human-patch/apply-version-free.py            # apply, then delete this script
    python3 .dev/features/audit-low-human-patch/apply-version-free.py --dry-run  # check the pins, write nothing

Writes NOTHING unless LIMITS.md's sha256 equals BEFORE, the old text occurs exactly once, and the result's sha256
equals AFTER. Stdlib only; the repository root is found from this file's own path.
"""

import hashlib
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
TARGET = "LIMITS.md"
OLD = "session's own scratchpad (6.73.1, audit TST-12)**"
NEW = "session's own scratchpad (audit TST-12)**"
BEFORE = "577fb5c02d66dd4abf3ea6f812cb7105ac8bbcc271916a18abf55a63141cc6a8"
AFTER = "66ff0327c2e15f2b7bf689e2a05a5055db18c8e8c4433f6eb23638c5c08ea812"


def main(argv):
    if argv[1:] not in ([], ["--dry-run"]):
        print("usage: apply-version-free.py [--dry-run]", file=sys.stderr)
        return 2
    path = os.path.join(ROOT, TARGET)
    with open(path, "rb") as fh:
        before = fh.read()
    text = before.decode("utf-8")
    errors = []
    if hashlib.sha256(before).hexdigest() != BEFORE:
        errors.append(f"{TARGET}: sha256 is not the pinned BEFORE {BEFORE[:12]}… — the file moved")
    if text.count(OLD) != 1:
        errors.append(f"{TARGET}: the old text occurs {text.count(OLD)} times (expected exactly 1)")
    after = text.replace(OLD, NEW, 1).encode("utf-8")
    if not errors and hashlib.sha256(after).hexdigest() != AFTER:
        errors.append(f"{TARGET}: the patched sha256 is not the pinned AFTER {AFTER[:12]}…")
    if errors:
        print("REFUSED — nothing was written:", file=sys.stderr)
        for e in errors:
            print("  " + e, file=sys.stderr)
        return 1
    if argv[1:] == ["--dry-run"]:
        print(f"would patch {TARGET}: {BEFORE[:12]}… -> {AFTER[:12]}…\ndry run: every pin holds; nothing was written")
        return 0
    with open(path, "wb") as fh:
        fh.write(after)
    print(f"patched {TARGET}: {BEFORE[:12]}… -> {AFTER[:12]}…")
    os.remove(os.path.abspath(__file__))
    print("deleted .dev/features/audit-low-human-patch/apply-version-free.py")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
