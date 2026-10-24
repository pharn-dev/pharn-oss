# HUMAN-PATCH — audit-low-human-patch

<!-- GENERATED from apply.py by .pharn/audit-low-human-patch/build.py; edit apply.py and re-render, never this file. -->

The readable twin of `apply.py`: every edit it makes to the four hook-protected files, with its reason. The agent
may not write these files through any tool (CLAUDE.md hard constraint 1), so the maintainer applies them by running
the script. This file is for reading; the script's bytes are what count.

## How to apply

1. In a checkout of branch `fix/audit-low-human-patch` at the commit the agent hands over (any directory — the
   script finds the repository root from its own path), optionally check first, writing nothing:

   ```bash
   python3 .dev/features/audit-low-human-patch/apply.py --dry-run
   ```

   then apply:

   ```bash
   python3 .dev/features/audit-low-human-patch/apply.py
   ```

2. It refuses, writing nothing, unless every target's sha256 equals the pinned BEFORE hash, every edit's old text
   occurs exactly once, and every result's sha256 equals the pinned AFTER hash. On success it prints one line per
   file and deletes itself.
3. Do not commit: hand back to the agent, which commits the four files and the script's deletion as one commit
   before it runs the gates (L68: `check:reconcile` reads an uncommitted trusted-doc edit as an escape).

| file | before | after | edits |
| --- | --- | --- | --- |
| `.claude/hooks/enforce-writes-scope.cjs` | `0405e36a5107…` | `04abe70ef2bf…` | 6 |
| `.claude/hooks/protect-trusted-paths.cjs` | `f3ef97c4bf2e…` | `e322a6bb37c9…` | 1 |
| `LIMITS.md` | `fe998761b9dc…` | `577fb5c02d66…` | 3 |
| `THREAT-MODEL.md` | `f886f6163643…` | `e267b13d90cb…` | 1 |

Full hashes (sha256):

```text
.claude/hooks/enforce-writes-scope.cjs
  before 0405e36a510748db52e5fd58f7f1dba1b7258aad497c7bd0e8d6ad6a9fd43309
  after  04abe70ef2bf88973c724672e3ad673849b80f132f196a67256e75f1b187a4a0
.claude/hooks/protect-trusted-paths.cjs
  before f3ef97c4bf2eea3e47cda375e70b8ef62a735ab5d90dabe69b560c3c79efe7d3
  after  e322a6bb37c978299e1f0548909fe0c0b3eecf02f9ae7b1d6a7d1c82e0e81307
LIMITS.md
  before fe998761b9dc544617f6d6e5fbdcb980ec16585b0867c903223fa81d93a00e94
  after  577fb5c02d66dd4abf3ea6f812cb7105ac8bbcc271916a18abf55a63141cc6a8
THREAT-MODEL.md
  before f886f61636438effca0c23aa7fac2c3a1f3b9a80a4f55ae7be6e387b3ae4e6e3
  after  e267b13d90cbeaeba3368823ddda5ae707cb4f0ac622338888c4534e2343a0ac
```

## `.claude/hooks/enforce-writes-scope.cjs`

### .claude/hooks/enforce-writes-scope.cjs — edit 1

**Reason.** TST-12 — the header's DEV posture paragraph: the one ALLOW-direction change.

Old text:

```text
//   on-disk spelling (both: see RESOLUTION, below); and a guard error denies (see A GUARD ERROR DENIES).
//   Every write the pre-6.24.0 hook denied is still denied here, with a byte-identical message.
```

New text:

```text
//   on-disk spelling (both: see RESOLUTION, below); and a guard error denies (see A GUARD ERROR DENIES).
//   Every write the pre-6.24.0 hook denied is still denied here, with a byte-identical message — with ONE exception,
//   in the ALLOW direction (audit TST-12, 2026-10-12): a path strictly inside THIS session's own scratchpad, by the
//   install posture's rule (2) (see THE OUT-OF-PROJECT PLACES), is allowed in every mode, and the out-of-root
//   message gains one bullet naming that scratchpad when this call's payload names one the rule accepts.
```

### .claude/hooks/enforce-writes-scope.cjs — edit 2

**Reason.** TST-12 — the ALIASES section's closing sentence about the dev and unsignalled postures.

Old text:

```text
// denied too, although on APFS it is another directory: an over-block, accepted. The dev and unsignalled
// postures deny every out-of-project path anyway, and keep their pre-6.24.0 message for it (D1).
```

New text:

```text
// denied too, although on APFS it is another directory: an over-block, accepted. The dev and unsignalled
// postures deny every out-of-project path but this session's own scratchpad anyway, and keep their pre-6.24.0
// message for it unless the payload names that scratchpad (D1; TST-12).
```

### .claude/hooks/enforce-writes-scope.cjs — edit 3

**Reason.** TST-12 — THE OUT-OF-PROJECT PLACES: which of the three places the dev and unsignalled postures admit.

Old text:

```text
//       directory when the home directory lies inside the temp root.
// Both session path fields must already be in normal form — absolute, no `.` or `..` segment — or they grant
```

New text:

```text
//       directory when the home directory lies inside the temp root.
// The DEV and UNSIGNALLED postures admit place (2) alone, by this same rule, in every mode — a scope is root-relative,
// so it has no jurisdiction there (audit TST-12, 2026-10-12: those postures denied the agent's own scratchpad and
// sent scratch writes to Bash). (1) and (3) stay install-only.
// Both session path fields must already be in normal form — absolute, no `.` or `..` segment — or they grant
```

### .claude/hooks/enforce-writes-scope.cjs — edit 4

**Reason.** TST-12 — the ctx documentation of `scratchpadKnown`: it is now read by the dev/unsignalled out-of-root body too.

Old text:

```text
// OUT-OF-PROJECT PLACES); `scratchpadKnown` is true iff this call's payload names a scratchpad the rule accepts as
// this session's own (ownScratchpadDir()), which decides whether that body may offer the scratchpad as a route.
```

New text:

```text
// OUT-OF-PROJECT PLACES); `scratchpadKnown` is true iff this call's payload names a scratchpad the rule accepts as
// this session's own (ownScratchpadDir()), which decides whether the Claude-state body, or the dev/unsignalled
// out-of-root body, may offer the scratchpad as a route.
```

### .claude/hooks/enforce-writes-scope.cjs — edit 5

**Reason.** TST-12 — the out-of-root body: in the dev/unsignalled posture, one bullet naming the scratchpad, present only when this call's payload names one the rule accepts (L27); without it the body is byte-identical.

Old text:

```text
      "  • If this file BELONGS to the current work: put it INSIDE the repo, declare that path in `writes:`, and re-run the scope-setter.\n" +
      "  • If it is TEMPORARY/scratch: a path outside the repo is not this guard's jurisdiction — write it with the Bash tool, which `PreToolUse` never sees. That is a boundary, NOT a sanctioned bypass: never route an IN-repo write that way.\n" +
```

New text:

```text
      "  • If this file BELONGS to the current work: put it INSIDE the repo, declare that path in `writes:`, and re-run the scope-setter.\n" +
      (!install && ctx.scratchpadKnown
        ? "  • If it is TEMPORARY/scratch: put it inside this session's own scratchpad, which the Write tool reaches in this posture under any scope (recognised only from the scratchpad_dir and session_id Claude Code passes to hooks).\n"
        : "") +
      "  • If it is TEMPORARY/scratch: a path outside the repo is not this guard's jurisdiction — write it with the Bash tool, which `PreToolUse` never sees. That is a boundary, NOT a sanctioned bypass: never route an IN-repo write that way.\n" +
```

### .claude/hooks/enforce-writes-scope.cjs — edit 6

**Reason.** TST-12 — judge(): the dev/unsignalled posture allows a target strictly inside this session's own scratchpad (the install rule (2), unchanged), in no other git tree and with no backslash ambiguity; `scratchpadKnown` is computed for that posture's message too.

Old text:

```text
        const otherTree = fromRoot !== "" && insideSomeWorkTree(real);
        const allowedRoot = install && fromRoot !== "" && !otherTree && !ambiguous && isAllowedOutOfRoot(real, session);
        if (mode === "permissive" && allowedRoot) return;
        const claudeState = install && fromRoot !== "" && !otherTree && !allowedRoot && isClaudeState(real);
        const scratchpadKnown = claudeState && ownScratchpadDir(session) !== null;
```

New text:

```text
        const otherTree = fromRoot !== "" && insideSomeWorkTree(real);
        // TST-12: the dev and unsignalled postures admit THIS session's own scratchpad, by rule (2), in every mode —
        // and nothing else outside the project (THE OUT-OF-PROJECT PLACES).
        if (!install && fromRoot !== "" && !otherTree && !ambiguous && isInOwnScratchpad(real, session)) return;
        const allowedRoot = install && fromRoot !== "" && !otherTree && !ambiguous && isAllowedOutOfRoot(real, session);
        if (mode === "permissive" && allowedRoot) return;
        const claudeState = install && fromRoot !== "" && !otherTree && !allowedRoot && isClaudeState(real);
        const scratchpadKnown = (claudeState || !install) && ownScratchpadDir(session) !== null;
```

## `.claude/hooks/protect-trusted-paths.cjs`

### .claude/hooks/protect-trusted-paths.cjs — edit 1

**Reason.** SEC-11 — a NUL byte in any payload path denies, before either pass judges it, through the existing malformed-input deny (fixed text; the path is never echoed).

Old text:

```text
if (isWrite) {
  // Deny if EITHER the literal path (resolved against CWD, which is what a relative payload path means)
```

New text:

```text
if (isWrite) {
  // A NUL byte in any payload path denies before either pass judges it (audit SEC-11, 2026-10-12). No file has such a
  // name — Node's `fs` refuses it — so the passes below would judge a name that is no file a write can reach:
  // `LIMITS.md\u0000x` resolved to itself, matched no trusted path, and was allowed. Fixed text; never echoed.
  if (extractPaths(toolInput).some((p) => p.includes("\0"))) denyMalformedHookInput("a path contains a NUL byte");
  // Deny if EITHER the literal path (resolved against CWD, which is what a relative payload path means)
```

## `LIMITS.md`

### LIMITS.md — edit 1

**Reason.** TST-12 — §7: the dev/unsignalled postures now reach one out-of-project place; stated beside the permissive default's three places (L64: the restatement follows the primary).

Old text:

```text
- **A run is open while `.pharn/<pharn-loop|pharn-ship|pharn-review>/<name>/active.json` exists with a
```

New text:

```text
- **In a dev checkout or an unsignalled tree, the one out-of-project place the Write tool reaches is this
  session's own scratchpad (6.73.1, audit TST-12)**, recognised by the rule above, under any scope. The memory
  folder and ordinary temp paths stay denied there, as does every path inside another git tree, and a Claude Code
  that sends no usable `scratchpad_dir` and `session_id` gets no allowance.
- **A run is open while `.pharn/<pharn-loop|pharn-ship|pharn-review>/<name>/active.json` exists with a
```

### LIMITS.md — edit 2

**Reason.** TST-12 — §7: the 6.24.0 sentence 'the only verdict changes … both move toward deny' is scoped to 6.24.0, so the 6.73.1 allow above does not contradict it.

Old text:

```text
  unsignalled tree that, and a guard error now denying instead of crashing open, are the only verdict
  changes, and both move toward deny; the first includes a path spelled with another letter case or
```

New text:

```text
  unsignalled tree that, and a guard error now denying instead of crashing open, are the only verdict
  changes 6.24.0 made, and both move toward deny; the first includes a path spelled with another letter case or
```

### LIMITS.md — edit 3

**Reason.** SEC-9 (LIMITS half) — §9: the environment and lifecycle scripts the project's commands run with, in SECURITY.md's wording (since 6.72.1).

Old text:

```text
  configuration outside the project root or the runner's version (`pharn/floor/test-infra-core.mjs` states
  the full list).
```

New text:

```text
  configuration outside the project root or the runner's version (`pharn/floor/test-infra-core.mjs` states
  the full list).
- **Those commands run with your environment.** The project's gate scripts and `/pharn-regress`'s base install
  (`npm ci` or the lockfile's equivalent, unless `--no-install`) run with your full process environment
  (`pharn/floor/run-gates.mjs` passes `process.env` through), so any secret in it reaches the project's scripts.
  The base install runs the install lifecycle scripts (`preinstall`, `postinstall`, `prepare` and the like) that
  the BASE commit's manifest and lockfile name — the project's own, and its dependencies' as far as the package
  manager runs them — with no `--ignore-scripts`, in that same environment.
```

## `THREAT-MODEL.md`

### THREAT-MODEL.md — edit 1

**Reason.** SEC-13 — §5 names two more free-text channels that shipped commands already name: a stage agent's report (6.27.0) and a prior loop run's Handoff (2.1.0), each with where it is bounded.

Old text:

```text
Measured in `.dev/features/selective-skill-reads/EVAL.md`, not bounded by it. The quantifier is corrected in the heading
```

New text:

```text
Measured in `.dev/features/selective-skill-reads/EVAL.md`, not bounded by it. (4) The **stage-report** channel
(6.27.0): when `/pharn-ship` or `/pharn-loop` routes a stage to its own agent, the Agent tool returns that agent's
final text into the orchestrator's context — a model consuming another model's free text. Control flow reads only
the stage's `finish` exit code and its closed first line (`pharn/floor/stage-agent-core.mjs`), and the floor
verdicts on disk still decide every stop; that the orchestrator never acts on the prose is its own discipline
(`/pharn-loop`'s stage-agent bounds, `pharn-ship-stages.md`). (5) The **handoff** channel
(`pharn/pharn-contracts/loop-record.md`, Residual): `/pharn-loop` Step 1b reads the latest prior `LOOP.md`'s
`## Handoff`, free text a past run wrote, and no person reads it first. Bounded — no branch reads it, it never gates
or sets a flag, it is scoped to one feature's record and quoted as DATA — and not zeroed. The quantifier is corrected in the heading
```
