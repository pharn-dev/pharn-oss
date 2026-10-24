#!/usr/bin/env python3
"""Maintainer-run patch for audit-low-human-patch (audit 2026-10-12 LOW findings SEC-11, TST-12, SEC-13, SEC-9).

The four target files are hook-protected (CLAUDE.md hard constraint 1): no agent may write them through any tool,
Bash included. This script is the agent's proposal; a human runs it.

    python3 .dev/features/audit-low-human-patch/apply.py            # apply, then delete this script
    python3 .dev/features/audit-low-human-patch/apply.py --dry-run  # check every pin, write nothing

The repository root is found from this file's own location, so the working directory does not matter.
It writes NOTHING unless every target's sha256 equals its pinned BEFORE hash, every edit's old text occurs exactly
once, and every patched result's sha256 equals its pinned AFTER hash. Stdlib only. HUMAN-PATCH.md beside it is the
readable twin, rendered from EDITS below; these bytes are what count.
"""

import hashlib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))

PROTECT = ".claude/hooks/protect-trusted-paths.cjs"
ENFORCE = ".claude/hooks/enforce-writes-scope.cjs"
LIMITS = "LIMITS.md"
THREAT = "THREAT-MODEL.md"

# Each edit: (file, reason, old, new). `old` must occur EXACTLY once in the file as it stands when the edit is applied
# (edits to one file apply in this order).
EDITS = [
    (
        PROTECT,
        "SEC-11 — a NUL byte in any payload path denies, before either pass judges it, through the existing "
        "malformed-input deny (fixed text; the path is never echoed).",
        r"""if (isWrite) {
  // Deny if EITHER the literal path (resolved against CWD, which is what a relative payload path means)
""",
        r"""if (isWrite) {
  // A NUL byte in any payload path denies before either pass judges it (audit SEC-11, 2026-10-12). No file has such a
  // name — Node's `fs` refuses it — so the passes below would judge a name that is no file a write can reach:
  // `LIMITS.md\u0000x` resolved to itself, matched no trusted path, and was allowed. Fixed text; never echoed.
  if (extractPaths(toolInput).some((p) => p.includes("\0"))) denyMalformedHookInput("a path contains a NUL byte");
  // Deny if EITHER the literal path (resolved against CWD, which is what a relative payload path means)
""",
    ),
    (
        ENFORCE,
        "TST-12 — the header's DEV posture paragraph: the one ALLOW-direction change.",
        r"""//   on-disk spelling (both: see RESOLUTION, below); and a guard error denies (see A GUARD ERROR DENIES).
//   Every write the pre-6.24.0 hook denied is still denied here, with a byte-identical message.
""",
        r"""//   on-disk spelling (both: see RESOLUTION, below); and a guard error denies (see A GUARD ERROR DENIES).
//   Every write the pre-6.24.0 hook denied is still denied here, with a byte-identical message — with ONE exception,
//   in the ALLOW direction (audit TST-12, 2026-10-12): a path strictly inside THIS session's own scratchpad, by the
//   install posture's rule (2) (see THE OUT-OF-PROJECT PLACES), is allowed in every mode, and the out-of-root
//   message gains one bullet naming that scratchpad when this call's payload names one the rule accepts.
""",
    ),
    (
        ENFORCE,
        "TST-12 — the ALIASES section's closing sentence about the dev and unsignalled postures.",
        r"""// denied too, although on APFS it is another directory: an over-block, accepted. The dev and unsignalled
// postures deny every out-of-project path anyway, and keep their pre-6.24.0 message for it (D1).
""",
        r"""// denied too, although on APFS it is another directory: an over-block, accepted. The dev and unsignalled
// postures deny every out-of-project path but this session's own scratchpad anyway, and keep their pre-6.24.0
// message for it unless the payload names that scratchpad (D1; TST-12).
""",
    ),
    (
        ENFORCE,
        "TST-12 — THE OUT-OF-PROJECT PLACES: which of the three places the dev and unsignalled postures admit.",
        r"""//       directory when the home directory lies inside the temp root.
// Both session path fields must already be in normal form — absolute, no `.` or `..` segment — or they grant
""",
        r"""//       directory when the home directory lies inside the temp root.
// The DEV and UNSIGNALLED postures admit place (2) alone, by this same rule, in every mode — a scope is root-relative,
// so it has no jurisdiction there (audit TST-12, 2026-10-12: those postures denied the agent's own scratchpad and
// sent scratch writes to Bash). (1) and (3) stay install-only.
// Both session path fields must already be in normal form — absolute, no `.` or `..` segment — or they grant
""",
    ),
    (
        ENFORCE,
        "TST-12 — the ctx documentation of `scratchpadKnown`: it is now read by the dev/unsignalled out-of-root body too.",
        r"""// OUT-OF-PROJECT PLACES); `scratchpadKnown` is true iff this call's payload names a scratchpad the rule accepts as
// this session's own (ownScratchpadDir()), which decides whether that body may offer the scratchpad as a route.
""",
        r"""// OUT-OF-PROJECT PLACES); `scratchpadKnown` is true iff this call's payload names a scratchpad the rule accepts as
// this session's own (ownScratchpadDir()), which decides whether the Claude-state body, or the dev/unsignalled
// out-of-root body, may offer the scratchpad as a route.
""",
    ),
    (
        ENFORCE,
        "TST-12 — the out-of-root body: in the dev/unsignalled posture, one bullet naming the scratchpad, present only "
        "when this call's payload names one the rule accepts (L27); without it the body is byte-identical.",
        r"""      "  • If this file BELONGS to the current work: put it INSIDE the repo, declare that path in `writes:`, and re-run the scope-setter.\n" +
      "  • If it is TEMPORARY/scratch: a path outside the repo is not this guard's jurisdiction — write it with the Bash tool, which `PreToolUse` never sees. That is a boundary, NOT a sanctioned bypass: never route an IN-repo write that way.\n" +
""",
        r"""      "  • If this file BELONGS to the current work: put it INSIDE the repo, declare that path in `writes:`, and re-run the scope-setter.\n" +
      (!install && ctx.scratchpadKnown
        ? "  • If it is TEMPORARY/scratch: put it inside this session's own scratchpad, which the Write tool reaches in this posture under any scope (recognised only from the scratchpad_dir and session_id Claude Code passes to hooks).\n"
        : "") +
      "  • If it is TEMPORARY/scratch: a path outside the repo is not this guard's jurisdiction — write it with the Bash tool, which `PreToolUse` never sees. That is a boundary, NOT a sanctioned bypass: never route an IN-repo write that way.\n" +
""",
    ),
    (
        ENFORCE,
        "TST-12 — judge(): the dev/unsignalled posture allows a target strictly inside this session's own scratchpad "
        "(the install rule (2), unchanged), in no other git tree and with no backslash ambiguity; `scratchpadKnown` "
        "is computed for that posture's message too.",
        r"""        const otherTree = fromRoot !== "" && insideSomeWorkTree(real);
        const allowedRoot = install && fromRoot !== "" && !otherTree && !ambiguous && isAllowedOutOfRoot(real, session);
        if (mode === "permissive" && allowedRoot) return;
        const claudeState = install && fromRoot !== "" && !otherTree && !allowedRoot && isClaudeState(real);
        const scratchpadKnown = claudeState && ownScratchpadDir(session) !== null;
""",
        r"""        const otherTree = fromRoot !== "" && insideSomeWorkTree(real);
        // TST-12: the dev and unsignalled postures admit THIS session's own scratchpad, by rule (2), in every mode —
        // and nothing else outside the project (THE OUT-OF-PROJECT PLACES).
        if (!install && fromRoot !== "" && !otherTree && !ambiguous && isInOwnScratchpad(real, session)) return;
        const allowedRoot = install && fromRoot !== "" && !otherTree && !ambiguous && isAllowedOutOfRoot(real, session);
        if (mode === "permissive" && allowedRoot) return;
        const claudeState = install && fromRoot !== "" && !otherTree && !allowedRoot && isClaudeState(real);
        const scratchpadKnown = (claudeState || !install) && ownScratchpadDir(session) !== null;
""",
    ),
    (
        LIMITS,
        "TST-12 — §7: the dev/unsignalled postures now reach one out-of-project place; stated beside the permissive "
        "default's three places (L64: the restatement follows the primary).",
        r"""- **A run is open while `.pharn/<pharn-loop|pharn-ship|pharn-review>/<name>/active.json` exists with a
""",
        r"""- **In a dev checkout or an unsignalled tree, the one out-of-project place the Write tool reaches is this
  session's own scratchpad (6.73.1, audit TST-12)**, recognised by the rule above, under any scope. The memory
  folder and ordinary temp paths stay denied there, as does every path inside another git tree, and a Claude Code
  that sends no usable `scratchpad_dir` and `session_id` gets no allowance.
- **A run is open while `.pharn/<pharn-loop|pharn-ship|pharn-review>/<name>/active.json` exists with a
""",
    ),
    (
        LIMITS,
        "TST-12 — §7: the 6.24.0 sentence 'the only verdict changes … both move toward deny' is scoped to 6.24.0, "
        "so the 6.73.1 allow above does not contradict it.",
        r"""  unsignalled tree that, and a guard error now denying instead of crashing open, are the only verdict
  changes, and both move toward deny; the first includes a path spelled with another letter case or
""",
        r"""  unsignalled tree that, and a guard error now denying instead of crashing open, are the only verdict
  changes 6.24.0 made, and both move toward deny; the first includes a path spelled with another letter case or
""",
    ),
    (
        LIMITS,
        "SEC-9 (LIMITS half) — §9: the environment and lifecycle scripts the project's commands run with, in "
        "SECURITY.md's wording (since 6.72.1).",
        r"""  configuration outside the project root or the runner's version (`pharn/floor/test-infra-core.mjs` states
  the full list).
""",
        r"""  configuration outside the project root or the runner's version (`pharn/floor/test-infra-core.mjs` states
  the full list).
- **Those commands run with your environment.** The project's gate scripts and `/pharn-regress`'s base install
  (`npm ci` or the lockfile's equivalent, unless `--no-install`) run with your full process environment
  (`pharn/floor/run-gates.mjs` passes `process.env` through), so any secret in it reaches the project's scripts.
  The base install runs the install lifecycle scripts (`preinstall`, `postinstall`, `prepare` and the like) that
  the BASE commit's manifest and lockfile name — the project's own, and its dependencies' as far as the package
  manager runs them — with no `--ignore-scripts`, in that same environment.
""",
    ),
    (
        THREAT,
        "SEC-13 — §5 names two more free-text channels that shipped commands already name: a stage agent's report "
        "(6.27.0) and a prior loop run's Handoff (2.1.0), each with where it is bounded.",
        r"""Measured in `.dev/features/selective-skill-reads/EVAL.md`, not bounded by it. The quantifier is corrected in the heading
""",
        r"""Measured in `.dev/features/selective-skill-reads/EVAL.md`, not bounded by it. (4) The **stage-report** channel
(6.27.0): when `/pharn-ship` or `/pharn-loop` routes a stage to its own agent, the Agent tool returns that agent's
final text into the orchestrator's context — a model consuming another model's free text. Only the exit code of
`pharn/floor/stage-agent.mjs finish` and its closed first line are floor, and `/pharn-loop`'s stop is still decided
from the floor verdicts on disk; that neither orchestrator's control flow uses the prose is its own discipline
(`pharn-loop.md`, `pharn-ship-stages.md`). (5) The **handoff** channel
(`pharn/pharn-contracts/loop-record.md`, Residual): `/pharn-loop` Step 1b reads the latest prior `LOOP.md`'s
`## Handoff`, free text a past run wrote, and no person reads it first. Bounded — no branch reads it, it never gates
or sets a flag, it is scoped to one feature's record and quoted as DATA — and not zeroed. The quantifier is corrected in the heading
""",
    ),
]

# sha256 of each target before and after every edit above. Rendered by the agent from the bytes on its branch.
# BEGIN PINS
PINS = {
    ".claude/hooks/enforce-writes-scope.cjs": (
        "0405e36a510748db52e5fd58f7f1dba1b7258aad497c7bd0e8d6ad6a9fd43309",
        "04abe70ef2bf88973c724672e3ad673849b80f132f196a67256e75f1b187a4a0",
    ),
    ".claude/hooks/protect-trusted-paths.cjs": (
        "f3ef97c4bf2eea3e47cda375e70b8ef62a735ab5d90dabe69b560c3c79efe7d3",
        "e322a6bb37c978299e1f0548909fe0c0b3eecf02f9ae7b1d6a7d1c82e0e81307",
    ),
    "LIMITS.md": (
        "fe998761b9dc544617f6d6e5fbdcb980ec16585b0867c903223fa81d93a00e94",
        "577fb5c02d66dd4abf3ea6f812cb7105ac8bbcc271916a18abf55a63141cc6a8",
    ),
    "THREAT-MODEL.md": (
        "f886f61636438effca0c23aa7fac2c3a1f3b9a80a4f55ae7be6e387b3ae4e6e3",
        "922f953eb9d1f178b2a938bd2b066d0cfd5baab9843cd8440dc04d18e8dedf0f",
    ),
}
# END PINS


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def plan():
    """Return {file: (before_bytes, after_bytes)} or raise SystemExit with every refusal found."""
    errors = []
    results = {}
    for name in sorted({e[0] for e in EDITS}):
        path = os.path.join(ROOT, name)
        try:
            with open(path, "rb") as fh:
                before = fh.read()
        except OSError as exc:
            errors.append(f"{name}: cannot read ({exc.strerror})")
            continue
        text = before.decode("utf-8")
        for i, (fname, _reason, old, new) in enumerate(EDITS, 1):
            if fname != name:
                continue
            count = text.count(old)
            if count != 1:
                errors.append(f"{name}: edit {i}'s old text occurs {count} times (expected exactly 1)")
                continue
            text = text.replace(old, new, 1)
        results[name] = (before, text.encode("utf-8"))
    return results, errors


def main(argv):
    dry = argv[1:] == ["--dry-run"]
    if argv[1:] not in ([], ["--dry-run"]):
        print("usage: apply.py [--dry-run]", file=sys.stderr)
        return 2
    results, errors = plan()
    for name, (before, after) in sorted(results.items()):
        pin = PINS.get(name)
        if pin is None:
            errors.append(f"{name}: no pinned hashes")
            continue
        if sha256(before) != pin[0]:
            errors.append(f"{name}: sha256 {sha256(before)[:12]}… is not the pinned BEFORE {pin[0][:12]}… — the file moved")
        if sha256(after) != pin[1]:
            errors.append(f"{name}: patched sha256 {sha256(after)[:12]}… is not the pinned AFTER {pin[1][:12]}…")
    if set(PINS) != set(results) and not errors:
        errors.append("the pinned file set does not match the edited file set")
    if errors:
        print("REFUSED — nothing was written:", file=sys.stderr)
        for e in errors:
            print("  " + e, file=sys.stderr)
        return 1
    if dry:
        for name, (before, after) in sorted(results.items()):
            print(f"would patch {name}: {sha256(before)[:12]}… -> {sha256(after)[:12]}…")
        print("dry run: every pin holds; nothing was written")
        return 0
    for name, (_before, after) in sorted(results.items()):
        with open(os.path.join(ROOT, name), "wb") as fh:
            fh.write(after)
    for name, (before, after) in sorted(results.items()):
        print(f"patched {name}: {sha256(before)[:12]}… -> {sha256(after)[:12]}…")
    os.remove(os.path.abspath(__file__))
    print(f"deleted {os.path.relpath(os.path.abspath(__file__), ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
