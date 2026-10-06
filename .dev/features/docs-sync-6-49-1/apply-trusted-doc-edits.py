#!/usr/bin/env python3
"""Apply the pending trusted-doc proposals (docs-sync-6-49-1, SKILLS_VERSION 6.49.1).

LIMITS.md, THREAT-MODEL.md and pharn/ARCHITECTURE.md are human-only: protect-trusted-paths.cjs denies the agent's
write tools on all three, so a human runs this script. Each edit is the text a merged feature proposed:

  .dev/features/regress-pre-run-snapshot/PROTECTED-FOLLOWUPS.md   (6.37.0)  LIMITS §6, §3a
  .dev/features/gate-exclusion-config/PROTECTED-FOLLOWUPS.md      (6.36.0)  LIMITS §5
  .dev/features/front-grill-concurrent/PROTECTED-FOLLOWUPS.md     (6.45.0)  LIMITS §3a, §5; THREAT-MODEL §1;
                                                                            ARCHITECTURE §6
  .dev/features/selective-skill-reads/TRUSTED-DOC-PROPOSAL.md     (6.47.0)  THREAT-MODEL §2 item 8, §3 row, §5;
                                                                            ARCHITECTURE §4

The two LIMITS §5 proposals touch the same paragraph, so they are merged into one replacement. The script also
registers the new catalogue-installed-skills.mjs citation in .dev/floor/specified-primitives.json, in the same
run, so check:markers never sees the manifest and THREAT-MODEL.md out of step.

Usage, from anywhere inside the repo:   python3 .dev/features/docs-sync-6-49-1/apply-trusted-doc-edits.py
  --dry-run       report what would change, write nothing
  --root <dir>    apply to another copy of the tree (default: the repo this script sits in)
  --no-prettier   skip the final `npx prettier --write` over the edited files

Every old text must occur exactly once. An edit whose new text is already present (and old text absent) is
reported as already applied, so a second run is a no-op. Any other mismatch aborts before a single file is
written.
"""

import argparse
import json
import pathlib
import shutil
import subprocess
import sys

EDITS = {
    "LIMITS.md": [
        (
            "§3a /pharn-ship --quick: the scope check counts what the run changed (6.37.0)",
            "> `/pharn-regress`'s scope check (a changed file outside the plan's `## Files` still stops the run, within\n",
            "> `/pharn-regress`'s scope check (a file the run changed outside the plan's `## Files` still stops the run, within\n",
        ),
        (
            "§3a /pharn-loop --quick: every loop skips the interrogation (6.45.0)",
            "> stamp). It leaves out the regression check, the plan interrogation and `RUN-REPORT.md` (`cost.json` is still\n"
            "> written). Its green stop is `STOP_GREEN_QUICK`, which is not `STOP_GREEN` and claims no regression check; the\n",
            "> stamp). It leaves out the regression check and `RUN-REPORT.md` (`cost.json` is still written). Like every\n"
            "> `/pharn-loop` run since 6.45.0, it does not interrogate the plan: the grill runs its two floor stops only. Its\n"
            "> green stop is `STOP_GREEN_QUICK`, which is not `STOP_GREEN` and claims no regression check; the\n",
        ),
        (
            "§5 the consequence paragraph: loop grill judgment (6.45.0) + gate exclusion and reuse (6.34.0, 6.36.0)",
            "results may wire none — with every floor green.** Nothing downstream re-checks the promise against\n"
            "the code. `/pharn-verify` re-runs the project's own gates; if the project has no telemetry test,\n"
            "neither does PHARN.\n",
            "results may wire none — with every floor green.** Under an unattended `/pharn-loop` (since 6.45.0) the grill runs\n"
            "only the observability scanner, not the griller's judgment, so there the plan's telemetry is not judged at all.\n"
            "Nothing downstream re-checks the promise against the code. `/pharn-verify` runs the project's own discovered gates,\n"
            "less any the project excludes in `pharn.config.json` `gates.exclude` (6.36.0); a gate result can also be reused from\n"
            "the same delivery run's `/pharn-regress` (6.34.0). If the project has no telemetry test, or excludes the gate that\n"
            "runs it, neither does PHARN.\n",
        ),
        (
            "§6 older partial backstop: the fifth bound, the pre-run snapshot (6.37.0)",
            "  write after the fact. Four bounds, every one stated in that checker's own header: it fires only if\n"
            "  `/pharn-regress` runs, or when `check-quick-scope.mjs` (6.28.0) applies that rule — for `/pharn-ship --quick`'s\n"
            "  item 7 and for every `/pharn-loop --quick` iteration — to inputs it builds by code exactly as that stage's script\n"
            "  does, without the rest of that stage; it compares _changed since base_, not _written by the build_; it carries\n"
            "  closed-enum exemptions for the pipeline's own artifacts; and a plan that edits its own `## Files`\n"
            "  (or its `AC-TESTS.md`) defeats it. A smoke alarm, never the guard.\n",
            "  write after the fact. Five bounds, every one stated in that checker's own header or in\n"
            "  `pharn/floor/pre-run-snapshot.mjs`'s: it fires only if\n"
            "  `/pharn-regress` runs, or when `check-quick-scope.mjs` (6.28.0) applies that rule — for `/pharn-ship --quick`'s\n"
            "  item 7 and for every `/pharn-loop --quick` iteration — to inputs it builds by code exactly as that stage's script\n"
            "  does, without the rest of that stage; it compares _changed since base_, not _written by the build_; it carries\n"
            "  closed-enum exemptions for the pipeline's own artifacts; a plan that edits its own `## Files`\n"
            "  (or its `AC-TESTS.md`) defeats it; and, inside a `/pharn-loop` or `/pharn-ship` run (6.37.0), a path already\n"
            "  changed when the run began whose bytes still equal the run's pre-run snapshot is reported, not counted — so a build\n"
            "  that writes such a path back to its pre-run bytes is not seen, a path an earlier run escaped with is pre-run state\n"
            "  for a re-run (reported, not refused), and the snapshot, kept in the git dir out of the write tools' reach, can be\n"
            "  forged through `Bash`. A smoke alarm, never the guard.\n",
        ),
    ],
    "THREAT-MODEL.md": [
        (
            "§1 threat model A: the unattended loop runs only the secret scan (6.45.0)",
            "  delivered to the user** — the security griller and the (deferred) AI/LLM-security lens. It is\n",
            "  delivered to the user** — the security griller (in an unattended `/pharn-loop`, since 6.45.0, only its\n"
            "  deterministic secret scan) and the (deferred) AI/LLM-security lens. It is\n",
        ),
        (
            "§2 item 8: delivery through the body-free catalogue (6.47.0)",
            "   their own repo. `/pharn-build`, `/pharn-grill` and `/pharn-review` enumerate these\n"
            "   (`pharn/floor/scan-installed-skills.mjs`) and feed the bodies to the model as untrusted context;\n"
            "   `/pharn-review` hands them to **each lens subagent it spawns**. Same delivery mechanism as 6 — markdown is\n",
            "   their own repo. `/pharn-build`, full `/pharn-grill` and each `/pharn-review` lens subagent list these through a\n"
            "   body-free catalogue (`pharn/floor/catalogue-installed-skills.mjs`, over the same discovery as\n"
            "   `pharn/floor/scan-installed-skills.mjs`) and feed the model the catalogue's descriptions plus the bodies of the\n"
            "   skills they select (`pharn/pharn-core/installed-skill-selection/`), all as untrusted context. Same delivery\n"
            "   mechanism as 6 — markdown is\n",
        ),
        (
            "§3 surface-8 row: the catalogue shares the discovery (6.47.0)",
            "**ENUMERATION ONLY** (`scan-installed-skills.mjs`), and it",
            "**ENUMERATION ONLY** (`scan-installed-skills.mjs`; its catalogue `catalogue-installed-skills.mjs` shares the discovery), and it",
        ),
        (
            "§5 a third named residual, the selection-omission channel (6.47.0)",
            "that includes `trust-fence`, the attempt-0 probe itself. The quantifier is corrected in the heading\n",
            "that includes `trust-fence`, the attempt-0 probe itself. (3) The **selection-omission** channel on surface 8\n"
            "(6.47.0): a stage now reads only the skill bodies it judges relevant from a body-free catalogue, plus every skill\n"
            "whose metadata it cannot read cleanly. A skill whose description is narrower than its body — benign or hostile —\n"
            "can be skipped, and its convention or its argument about a finding then never reaches the stage. The conservative\n"
            "rules in `pharn/pharn-core/installed-skill-selection/installed-skill-selection.md` narrow this; nothing structural\n"
            "closes it, and the catalogue's `ok` status means only \"syntactically readable\", never \"a complete account\".\n"
            "Measured in `.dev/features/selective-skill-reads/EVAL.md`, not bounded by it. The quantifier is corrected in the heading\n",
        ),
    ],
    "pharn/ARCHITECTURE.md": [
        (
            "§4 layer tree: installed-skill-selection under pharn-core (6.47.0)",
            "  └─ pharn-core          L0   seam-resolver — the seam MECHANISM, framework-agnostic.\n",
            "  └─ pharn-core          L0   seam-resolver — the seam MECHANISM, framework-agnostic;\n"
            "                              installed-skill-selection — the advisory procedure for choosing\n"
            "                              which installed skills to read.\n",
        ),
        (
            "§6 stage table, grill row: a floor-only grill-log holds no findings (6.45.0)",
            "| grill   | grill-log            | findings vs plan                             |\n",
            "| grill   | grill-log            | the two floor stops' results + findings vs plan (findings only when the plan is interrogated — not under `--quick` / `--floor-only`) |\n",
        ),
    ],
}

MANIFEST = ".dev/floor/specified-primitives.json"
MANIFEST_ANCHOR = '      "must_exist": "pharn/floor/scan-installed-skills.mjs"\n    }\n'
MANIFEST_ENTRY = (
    "    {\n"
    '      "$comment": [\n'
    '        "THREAT-MODEL.md §2 item 8 and its §3 row cite the installed-skill CATALOGUE by name since 6.49.1",\n'
    '        "(the 6.47.0 selective-skill-reads proposal, applied by a human). Registered for the same reason as",\n'
    '        "scan-installed-skills above, and deliberately not a forward_claims entry for the same reason."\n'
    "      ],\n"
    '      "id": "catalogue-installed-skills",\n'
    '      "cited_in": "THREAT-MODEL.md",\n'
    '      "citation": "catalogue-installed-skills.mjs",\n'
    '      "must_exist": "pharn/floor/catalogue-installed-skills.mjs"\n'
    "    }\n"
)


def plan_text_edits(root):
    """Return {relpath: new_text} for files that change; raise SystemExit on any mismatch."""
    out, problems = {}, []
    for rel, edits in EDITS.items():
        path = root / rel
        text = path.read_text(encoding="utf-8")
        new = text
        for label, old, repl in edits:
            n_old, n_new = new.count(old), new.count(repl)
            if n_old == 1:
                new = new.replace(old, repl, 1)
                print(f"  apply   {rel}: {label}")
            elif n_old == 0 and n_new == 1:
                print(f"  skip    {rel}: {label} (already applied)")
            else:
                problems.append(f"{rel}: {label}: old text found {n_old}x, new text {n_new}x")
        if new != text:
            out[rel] = new
    mpath = root / MANIFEST
    mtext = mpath.read_text(encoding="utf-8")
    if '"id": "catalogue-installed-skills"' in mtext:
        print(f"  skip    {MANIFEST}: catalogue-installed-skills registration (already applied)")
    elif mtext.count(MANIFEST_ANCHOR) == 1:
        mnew = mtext.replace(MANIFEST_ANCHOR, MANIFEST_ANCHOR[:-1] + ",\n" + MANIFEST_ENTRY, 1)
        json.loads(mnew)  # must stay valid JSON
        out[MANIFEST] = mnew
        print(f"  apply   {MANIFEST}: catalogue-installed-skills registration")
    else:
        problems.append(f"{MANIFEST}: anchor after the scan-installed-skills entry found {mtext.count(MANIFEST_ANCHOR)}x")
    if problems:
        print("\nABORTED — nothing was written:", file=sys.stderr)
        for p in problems:
            print(f"  {p}", file=sys.stderr)
        sys.exit(1)
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--root", default=None)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--no-prettier", action="store_true")
    args = ap.parse_args()
    root = pathlib.Path(args.root).resolve() if args.root else pathlib.Path(__file__).resolve().parents[3]
    if not (root / "SKILLS_VERSION").is_file() or not (root / "pharn" / "ARCHITECTURE.md").is_file():
        sys.exit(f"not a pharn-oss tree: {root}")
    print(f"tree: {root}")
    changes = plan_text_edits(root)
    if args.dry_run or not changes:
        print("\ndry run — nothing written." if args.dry_run else "\nnothing to do.")
        return
    for rel, text in changes.items():
        (root / rel).write_text(text, encoding="utf-8")
    print(f"\nwrote {len(changes)} file(s).")
    if args.no_prettier:
        return
    npx = shutil.which("npx")
    if not npx:
        print("npx not found — run `npx prettier --write` over the edited files yourself.")
        return
    files = sorted(changes)
    r = subprocess.run([npx, "prettier", "--write", *files], cwd=root)
    if r.returncode != 0:
        sys.exit(f"prettier exited {r.returncode}")
    print("prettier: done. Next: npm run check")


if __name__ == "__main__":
    main()
