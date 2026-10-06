#!/usr/bin/env python3
"""Follow-up 2 of claude-md-bootstrap (`floor-guide-dedupe`): retire floor-guide summaries their owners already hold.

The four `.dev/guides/floor-*.md` files carry, per CLI, the summary that used to sit in CLAUDE.md. Much of it
restates the CLI's own module header or its contract. This script removes a section's summary only when that is
VERIFIED, never on similarity:

  • owners = every repo file the section names (`pharn/floor/*.mjs`, `.dev/floor/*.mjs`, `.claude/hooks/*.cjs`,
    `pharn/pharn-contracts/*.md`, …) that exists;
  • the summary (the `#` comment lines) is split into sentences; each sentence is normalized (case, whitespace,
    back-ticks, `*`, `_`) and must occur, as a contiguous string, in the normalized text of an owner, with the
    owner's comment markers (`//`, `*`, `#`) stripped;
  • a section is deduplicated only when EVERY sentence is found. Its summary is then replaced by the CLI's own
    command lines plus a pointer to the owner(s). Partly covered sections are left whole and reported.

So nothing is removed that its owner does not state word for word. The bound (P0): equal text is not proof that the
owner still MEANS it in the same context, and a summary sentence that combines two owners' clauses is never found,
so it keeps its section. Default is a report plus a diff; --apply writes. With --apply it also updates the 6.46.1
CHANGELOG "Not done" bullet with the counts. `.dev/guides/` is apparatus, so there is no bump.

Usage (repo root):  python3 .dev/features/claude-md-bootstrap/followups/dedupe_floor_guides.py            # report + diff
                    python3 .dev/features/claude-md-bootstrap/followups/dedupe_floor_guides.py --apply
Stdlib only. Exit 0 = report printed or written; 1 = refused (nothing written).
"""
import argparse
import difflib
import pathlib
import re
import sys

GUIDES = [
    ".dev/guides/floor-checks.md",
    ".dev/guides/floor-gates.md",
    ".dev/guides/floor-ac-tests.md",
    ".dev/guides/floor-orchestration.md",
]
CHANGELOG = "CHANGELOG.md"
VERSION = "6.46.1"
OLD_TODO = (
    "    - the floor guides still restate module headers, and removing that repetition is the follow-up\n"
    "      `floor-guide-dedupe`;\n"
)
MARK = "Deduplicated by `floor-guide-dedupe`"
PATH_RE = re.compile(r"(?:pharn|\.dev|\.claude)/[A-Za-z0-9_./-]+\.(?:mjs|cjs|md|json)")
SENT_SPLIT = re.compile(r"(?<=[.!?])\s+(?=[A-Z(`*\"'])")


def norm(s):
    s = re.sub(r"[`*_]", "", s.lower())
    return re.sub(r"\s+", " ", s).strip()


def owner_text(path):
    out = []
    for line in path.read_text(encoding="utf-8").splitlines():
        out.append(re.sub(r"^\s*(?://+|/\*+|\*+/?|#+)\s?", "", line))
    return norm(" ".join(out))


def parse_sections(text):
    """Split a guide into (preamble, [(heading, body_lines)]). A section body holds one ```bash fence."""
    parts = re.split(r"(?m)^(## .*)$", text)
    pre, secs = parts[0], []
    for i in range(1, len(parts), 2):
        secs.append((parts[i], parts[i + 1]))
    return pre, secs


def analyze(root, body):
    lines = body.splitlines()
    comments = [ln for ln in lines if ln.startswith("#")]
    commands = [ln for ln in lines if ln and not ln.startswith("#") and not ln.startswith("```")]
    prose = " ".join(re.sub(r"^#+\s?", "", ln) for ln in comments)
    sentences = [s for s in SENT_SPLIT.split(prose) if norm(s)]
    names = sorted({m.rstrip(".") for m in PATH_RE.findall(body)})
    owners = [n for n in names if (root / n).is_file() and not n.startswith(".dev/guides/")]
    texts = [owner_text(root / o) for o in owners]
    missing = [s for s in sentences if not any(norm(s) in t for t in texts)]
    return {"sentences": len(sentences), "missing": missing, "owners": owners, "commands": commands}


def replacement(info):
    owners = ", ".join(f"`{o}`" for o in info["owners"])
    return (
        "\n```bash\n" + "\n".join(info["commands"]) + "\n```\n\n"
        f"{MARK}: every sentence of the summary that stood here appears word for word in {owners}. Read that\n"
        "header or contract before running, citing, or planning a change to this CLI.\n\n"
    )


def edit_changelog(text, removed, total):
    newest = re.search(r"(?m)^## \[(\d+\.\d+\.\d+)\]", text)
    if not newest or newest.group(1) != VERSION:
        fail(f"CHANGELOG's newest section is not [{VERSION}]; update the entry by hand")
    if OLD_TODO not in text:
        return text
    new = (
        f"    - `floor-guide-dedupe` removed {removed} of {total} floor-guide summaries, each one whose every sentence\n"
        "      its owner states word for word; the others still restate their owners and are listed by\n"
        "      `.dev/features/claude-md-bootstrap/followups/dedupe_floor_guides.py`;\n"
    )
    return text.replace(OLD_TODO, new)


def fail(msg):
    print(f"REFUSED — {msg}. Nothing was written.", file=sys.stderr)
    sys.exit(1)


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--apply", action="store_true", help="write the change (default: report + diff only)")
    ap.add_argument("--root", default=".", help="repository root (default: current directory)")
    args = ap.parse_args()
    root = pathlib.Path(args.root)

    writes, removed, total = [], 0, 0
    for g in GUIDES:
        path = root / g
        if not path.is_file():
            fail(f"{g} is missing")
        text = path.read_text(encoding="utf-8")
        pre, secs = parse_sections(text)
        out = [pre]
        print(f"\n{g}")
        for heading, body in secs:
            total += 1
            if MARK in body:
                print(f"  already deduplicated  {heading[3:]}")
                removed += 1
                out += [heading, body]
                continue
            info = analyze(root, body)
            found = info["sentences"] - len(info["missing"])
            ok = info["owners"] and info["sentences"] and not info["missing"] and info["commands"]
            status = "DEDUPE" if ok else "keep  "
            print(f"  {status} {found:3}/{info['sentences']:<3} sentences found  {heading[3:]}")
            if ok:
                removed += 1
                out += [heading, replacement(info)]
            else:
                out += [heading, body]
        new_text = "".join(out)
        if new_text != text:
            writes.append((g, path, text, new_text))

    print(f"\n{removed} of {total} sections deduplicated (or already were).")
    cl_path = root / CHANGELOG
    cl = cl_path.read_text(encoding="utf-8")
    new_cl = edit_changelog(cl, removed, total) if writes else cl
    if new_cl != cl:
        writes.append((CHANGELOG, cl_path, cl, new_cl))
    if not writes:
        print("Nothing to write.")
        return
    for g, _, a, b in writes:
        sys.stdout.writelines(difflib.unified_diff(a.splitlines(True), b.splitlines(True), f"a/{g}", f"b/{g}"))
    if not args.apply:
        print("\nDry run. Re-run with --apply to write these changes.")
        return
    for _, path, _, b in writes:
        path.write_text(b, encoding="utf-8")
    print(f"\nWritten: {', '.join(g for g, _, _, _ in writes)}.")
    print("Next: run `npx prettier --write .dev/guides/floor-*.md`, then `npm run check`, then commit.")


if __name__ == "__main__":
    main()
