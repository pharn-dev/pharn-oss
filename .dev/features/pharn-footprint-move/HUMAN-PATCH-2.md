# HUMAN-PATCH 2 — pharn-footprint-move (the review fix round)

<!-- GENERATED from apply.py's data by an agent-side render script; edit the source and re-render, never this file. -->

The readable twin of `apply.py`: every edit it makes to four hook-protected files, from the REVIEW.md fix round (PLAN.md revision 4). The agent may not write
these files through any tool (CLAUDE.md hard constraint 1), so the maintainer applies them by running the script.
This file is for reading; the script's bytes are what count.

## How to apply

1. In this worktree, at the commit the agent hands over, check first (writes nothing):

   ```bash
   python3 .dev/features/pharn-footprint-move/apply.py --dry-run
   ```

   then apply:

   ```bash
   python3 .dev/features/pharn-footprint-move/apply.py
   ```

2. It refuses, writing nothing, unless every target matches its pinned BEFORE hash, every edit's old text occurs
   exactly once, every result matches its pinned AFTER hash. On success it prints
   one line per file and deletes itself.
3. Do not commit. Hand back to the agent, which commits Phase A as one commit (L68).

| file                                      | →   | before          | after           | edits |
| ----------------------------------------- | --- | --------------- | --------------- | ----- |
| `.claude/hooks/protect-trusted-paths.cjs` | —   | `613da92f3f4f…` | `8aa8e12e2161…` | 1     |
| `.claude/hooks/enforce-writes-scope.cjs`  | —   | `d9fa700c3562…` | `e41e56c881c0…` | 6     |
| `.claude/hooks/set-writes-scope.cjs`      | —   | `cfede2b6ffe1…` | `a2fc1f0bac64…` | 3     |
| `pharn/LIMITS.md`                         | —   | `8ecfd573431f…` | `934d4bb24ed6…` | 4     |

Full hashes (sha256):

```text
.claude/hooks/protect-trusted-paths.cjs
  before 613da92f3f4fca5239e0ec0f63d012e948723ef2fc2e18857123828d35e24675
  after  8aa8e12e2161b8d42267128daa241b0e39a937fded1954db9b578871384cef91
.claude/hooks/enforce-writes-scope.cjs
  before d9fa700c35620af9eed5f219abd33206f423ea079bbb97f8e483d3c667f0dc18
  after  e41e56c881c0c37e5859140711ebe0e74dfa199ac4d01839c874bd15832634cf
.claude/hooks/set-writes-scope.cjs
  before cfede2b6ffe1dac179c483b8c3c3520f92154348ac54f3e348810c9b5873ac8c
  after  a2fc1f0bac649f3558fc79c24c45bb50c7481a6f5d835b42fa35832a905a9d9b
pharn/LIMITS.md
  before 8ecfd573431f7bdf031c097d6a59a9224fbe30a937a29dbbdc040864ca5b9cfa
  after  934d4bb24ed602bc16d87cbc0db79d9ed304c19e5338178383a7d199819d7452
```

## `.claude/hooks/protect-trusted-paths.cjs`

### .claude/hooks/protect-trusted-paths.cjs — edit 1 (near line 102)

Old text:

```text
// removed branches. A canon directory cannot be spelled as an exact path, so it is matched as a ROOTED
// PREFIX — `<guarded root>/memory-bank/…` — which is still trust-by-LOCATION. The removed fragment
// branch denied a user's docs/ARCHITECTURE.md ANYWHERE in the tree because it matched a path SEGMENT
```

New text:

```text
// removed branches. A canon directory cannot be spelled as an exact path, so it is matched as a ROOTED
// PREFIX — `<guarded root>/pharn/memory-bank/…` — which is still trust-by-LOCATION. The removed fragment
// branch denied a user's docs/ARCHITECTURE.md ANYWHERE in the tree because it matched a path SEGMENT
```

## `.claude/hooks/enforce-writes-scope.cjs`

### .claude/hooks/enforce-writes-scope.cjs — edit 1 (near line 35)

Old text:

```text
//     - no run open → PERMISSIVE. Inside the project it denies PHARN's own installed surface — `pharn/**`
//       except `pharn/features/**`, `.claude/**` and `pharn.config.json` (case-folded, see `toKey()` /
//       `isReserved()`) — plus `pharn/.run/writes-scope.json` itself and any path containing a backslash on a
```

New text:

```text
//     - no run open → PERMISSIVE. Inside the project it denies PHARN's own installed surface — `pharn/**`
//       except `pharn/features/**` and `pharn/.run/**`, `.claude/**` and `pharn.config.json` (case-folded, see `toKey()` /
//       `isReserved()`) — plus `pharn/.run/writes-scope.json` itself and any path containing a backslash on a
```

### .claude/hooks/enforce-writes-scope.cjs — edit 2 (near line 144)

Old text:

```text
// payload's session fields, so an environment that points one of them at a broad directory widens it; and a
// HARD link is not resolved by either resolution, so the permissive posture judges it by its own name
// (creating one needs Bash).
//
```

New text:

```text
// payload's session fields, so an environment that points one of them at a broad directory widens it; and a
// HARD link is not resolved by either resolution, so every posture judges it by its own name — under the
// always-writable `pharn/.run/**` too, so a hard link there to a file only this guard covers is writable (protect
// still catches its own files by inode; creating any hard link needs Bash).
//
```

### .claude/hooks/enforce-writes-scope.cjs — edit 3 (near line 483)

Old text:

```text
// bullet the pre-6.24.0 message showed for that exact shape (GATE-2 review, minor 1).
function dotPharnStateBad() {
  // Both segments (7.0.0): the scratch root is `pharn/.run`, and an lstat of that path alone follows a symlink
```

New text:

```text
// bullet the pre-6.24.0 message showed for that exact shape (GATE-2 review, minor 1).
function dotPharnStateBad(root = ROOT) {
  // Both segments (7.0.0): the scratch root is `pharn/.run`, and an lstat of that path alone follows a symlink
```

### .claude/hooks/enforce-writes-scope.cjs — edit 4 (near line 486)

Old text:

```text
  // at `pharn` without seeing it. A link at either segment is malformed; ENOENT at either is absence.
  for (const dot of [path.join(ROOT, "pharn"), path.join(ROOT, "pharn", ".run")]) {
    try {
```

New text:

```text
  // at `pharn` without seeing it. A link at either segment is malformed; ENOENT at either is absence.
  for (const dot of [path.join(root, "pharn"), path.join(root, "pharn", ".run")]) {
    try {
```

### .claude/hooks/enforce-writes-scope.cjs — edit 5 (near line 543)

Old text:

```text
  const scanErrorDirs = [];
  // Both segments of the scratch root (7.0.0), as dotPharnStateBad(): a link at `pharn` or at `pharn/.run`.
  for (const seg of [path.join(root, "pharn"), path.join(root, "pharn", ".run")]) {
    try {
      const dot = fs.lstatSync(seg);
      if (dot.isSymbolicLink()) {
        return { runs: [], scanErrorDirs: RUN_STATE.map((s) => s.dir) };
      }
    } catch (err) {
      if (!err || err.code !== "ENOENT") return { runs: [], scanErrorDirs: RUN_STATE.map((s) => s.dir) };
      break; // absent: nothing below it can hold a run
    }
  }
  for (const { dir } of RUN_STATE) {
```

New text:

```text
  const scanErrorDirs = [];
  // Both segments of the scratch root (7.0.0): the same test as the scope-file check, re-run here because the scan
  // reads later (defense in depth — that check normally refuses the same link first).
  if (dotPharnStateBad(root)) return { runs: [], scanErrorDirs: RUN_STATE.map((s) => s.dir) };
  for (const { dir } of RUN_STATE) {
```

### .claude/hooks/enforce-writes-scope.cjs — edit 6 (near line 1087)

Old text:

```text
      "  Active scope : (none set — installed project, no PHARN run open)\n" +
      "WHY: with no scope set and no PHARN run open, an installed project's default denies PHARN's own installed surface — `pharn/**` except `pharn/features/**`, `.claude/**` and `pharn.config.json` (matched case-folded) — plus its own input `pharn/.run/writes-scope.json`. Your ordinary project source is NOT what this default denies.\n" +
      "FIX (pick one):\n" +
```

New text:

```text
      "  Active scope : (none set — installed project, no PHARN run open)\n" +
      "WHY: with no scope set and no PHARN run open, an installed project's default denies PHARN's own installed surface — `pharn/**` except `pharn/features/**` and `pharn/.run/**`, `.claude/**` and `pharn.config.json` (matched case-folded) — plus its own input `pharn/.run/writes-scope.json`. Your ordinary project source is NOT what this default denies.\n" +
      "FIX (pick one):\n" +
```

## `.claude/hooks/set-writes-scope.cjs`

### .claude/hooks/set-writes-scope.cjs — edit 1 (near line 59)

Old text:

```text
//     file whose JSON carries a non-empty string `skillsVersion` — enforce-writes-scope.cjs's posture signal) a
//     `--from-plan` scope may not name `pharn/**` except `pharn/features/**`, `.claude/**` or `pharn.config.json`:
//     the set enforce-writes-scope.cjs already reserves outside a run, matched by byte-equal copies of its
```

New text:

```text
//     file whose JSON carries a non-empty string `skillsVersion` — enforce-writes-scope.cjs's posture signal) a
//     `--from-plan` scope may not name `pharn/**` except `pharn/features/**` and `pharn/.run/**`, `.claude/**` or `pharn.config.json`:
//     the set enforce-writes-scope.cjs already reserves outside a run, matched by byte-equal copies of its
```

### .claude/hooks/set-writes-scope.cjs — edit 2 (near line 785)

Old text:

```text
  if (mode === "--from-plan" && !allowPharnSurface && isPharnInstalledProject()) {
    const offenders = scope.filter(isReserved);
    if (offenders.length) {
```

New text:

```text
  if (mode === "--from-plan" && !allowPharnSurface && isPharnInstalledProject()) {
    // Judged as written AND with `..` collapsed: the two raw-prefix exemptions (`pharn/features/`, `pharn/.run/`)
    // must not be a way past this refusal (`pharn/.run/../floor/x.mjs`). Only ever adds refusals.
    const offenders = scope.filter((p) => isReserved(p) || isReserved(path.posix.normalize(String(p).replace(/\\/g, "/"))));
    if (offenders.length) {
```

### .claude/hooks/set-writes-scope.cjs — edit 3 (near line 790)

Old text:

```text
          `  Declared in : ${file}\n` +
          `  Why         : this is an installed PHARN project (pharn.config.json has a skillsVersion); pharn/** (except pharn/features/**), .claude/** and pharn.config.json are PHARN's floor, guards, commands and config, which judge a run and instruct its later stages, and a plan is untrusted input (CONSTITUTION P2).\n` +
          `  If you genuinely mean to change one of them (your own .claude/ commands or skills included): edit it yourself, outside the agent, or re-run this setter yourself with --allow-pharn-surface placed BEFORE --from-plan (an operator flag; no plan can set it). To update PHARN itself, use \`pharn update\`.\n` +
```

New text:

```text
          `  Declared in : ${file}\n` +
          `  Why         : this is an installed PHARN project (pharn.config.json has a skillsVersion); pharn/** (except pharn/features/** and pharn/.run/**), .claude/** and pharn.config.json are PHARN's floor, guards, commands and config, which judge a run and instruct its later stages, and a plan is untrusted input (CONSTITUTION P2).\n` +
          `  If you genuinely mean to change one of them (your own .claude/ commands or skills included): edit it yourself, outside the agent, or re-run this setter yourself with --allow-pharn-surface placed BEFORE --from-plan (an operator flag; no plan can set it). To update PHARN itself, use \`pharn update\`.\n` +
```

## `pharn/LIMITS.md`

### pharn/LIMITS.md — edit 1 (near line 300)

Old text:

```text
| ------------------------------------------------------------- | --------------------------- | ------------------------- |
| `{"tool_name":"Bash",…{"command":"printf x >> pharn/LIMITS.md"}}`   | `protect-trusted-paths.cjs` | **exit 0** — not denied   |
| `{"tool_name":"Bash",…{"command":"printf x >> README.md"}}`   | `enforce-writes-scope.cjs`  | **exit 0** — not denied   |
```

New text:

```text
| ------------------------------------------------------------- | --------------------------- | ------------------------- |
| `{"tool_name":"Bash",…{"command":"printf x >> LIMITS.md"}}` (pre-7.0.0 root path; migration) | `protect-trusted-paths.cjs` | **exit 0** — not denied   |
| `{"tool_name":"Bash",…{"command":"printf x >> README.md"}}`   | `enforce-writes-scope.cjs`  | **exit 0** — not denied   |
```

### pharn/LIMITS.md — edit 2 (near line 302)

Old text:

```text
| `{"tool_name":"Bash",…{"command":"printf x >> README.md"}}`   | `enforce-writes-scope.cjs`  | **exit 0** — not denied   |
| `{"tool_name":"Edit","tool_input":{"file_path":"pharn/LIMITS.md"}}` | `protect-trusted-paths.cjs` | exit 2 — denied (control) |

```

New text:

```text
| `{"tool_name":"Bash",…{"command":"printf x >> README.md"}}`   | `enforce-writes-scope.cjs`  | **exit 0** — not denied   |
| `{"tool_name":"Edit","tool_input":{"file_path":"LIMITS.md"}}` (pre-7.0.0 root path; migration) | `protect-trusted-paths.cjs` | exit 2 — denied (control) |

(Both probe tables in this file were measured when the doc sat at the root as `LIMITS.md`; migration: it is
`pharn/LIMITS.md` since 7.0.0, and the verdicts carry over to that path.)

```

### pharn/LIMITS.md — edit 3 (near line 427)

Old text:

```text
| ----------------------------------- | ---------------- | ------------------------------------------------ |
| `pharn/pharn-core`, relative wiring | `Edit pharn/LIMITS.md` | **1** — `Cannot find module`; the write proceeds |
| repo root, relative wiring          | `Edit pharn/LIMITS.md` | 2 — denied                                       |

```

New text:

```text
| ----------------------------------- | ---------------- | ------------------------------------------------ |
| `pharn/pharn-core`, relative wiring | `Edit LIMITS.md` (pre-7.0.0 root path; migration) | **1** — `Cannot find module`; the write proceeds |
| repo root, relative wiring          | `Edit LIMITS.md` (pre-7.0.0 root path; migration) | 2 — denied                                       |

```

### pharn/LIMITS.md — edit 4 (near line 459)

Old text:

```text
  (6.24.0).** With no scope set and no open `/pharn-ship`, `/pharn-loop` or `/pharn-review` run, it denies
  PHARN's installed surface — `pharn/**` except `pharn/features/**`, `.claude/**` and `pharn.config.json`,
  matched case-folded, with the `pharn/features/` exception matched as written, so a case or trailing-dot
  variant of it is denied — plus its own input `pharn/.run/writes-scope.json` and, on a system whose separator
```

New text:

```text
  (6.24.0).** With no scope set and no open `/pharn-ship`, `/pharn-loop` or `/pharn-review` run, it denies
  PHARN's installed surface — `pharn/**` except `pharn/features/**` and `pharn/.run/**`, `.claude/**` and
  `pharn.config.json`, matched case-folded, with the `pharn/features/` and `pharn/.run/` exceptions matched as written, so a case or trailing-dot
  variant of it is denied — plus its own input `pharn/.run/writes-scope.json` and, on a system whose separator
```
