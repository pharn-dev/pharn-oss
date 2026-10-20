#!/usr/bin/env python3
"""apply.py — hook-hardening-batch: the maintainer-run patch for five hook-protected files.

The agent may not write these files through any tool (CLAUDE.md hard constraint 1), so this script carries
every edit, and a maintainer runs it once:

    python3 .dev/features/hook-hardening-batch/apply.py

from the root of the checkout that holds the branch `fix/hook-hardening-batch` (the script finds that root
from its own location and refuses if it is not a PHARN checkout).

What it does, in order, and nothing else:
  1. Refuses while the LIMITS.md §9 slot (group G's text) is still empty, and unless group G's 6.68.0 is in the
     checkout (a `## [6.68.0]` CHANGELOG section and `other_gates` in pharn/floor/test-infra-core.mjs), because
     that slot describes G's code.
  2. Reads the five targets and refuses unless each one's sha256 equals the pinned BEFORE hash — so it never
     patches bytes nobody reviewed. Nothing is written on any refusal.
  3. Applies each edit as an exact replacement, in memory, refusing unless its old text occurs exactly once.
  4. Refuses unless each result's sha256 equals the pinned AFTER hash — the bytes the tests and the review saw.
  5. Writes the five files, prints a summary, and deletes itself.

Stdlib only. It runs no other program, and reads nothing but the five targets and the two files step 1 checks.
Readable twin, every edit with its reason: HUMAN-PATCH.md beside this file.
"""

import hashlib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))

# ── The LIMITS.md §9 slot (group G, audit SEC-4) ─────────────────────────────────────────────────────────────
# The orchestrator hands group G's final text over before this script is finalized. While it is None, the
# script refuses to run (step 1). The old text below is the §9 "Agreement, never provenance" bullet as it
# stands on main at 6.67.1.
SLOT_G_LIMITS_9_OLD = r"""- **Agreement, never provenance.** The tests, the reporter config, the `package.json` scripts and
  `pharn.config.json` are agent-editable. `results-exit-contradiction`, the lock and the
  test-infrastructure pin NARROW a forged report and never close it: a self-consistent fabricated lock,
  stamp and results set over the live tree passes. The pin also does not see, among others, a setup file
  a config imports, configuration read from the environment, script chaining, npm's own configuration or
  the runner's version (`pharn/floor/test-infra-core.mjs` states the full list).
"""
# Filled verbatim from group G's .dev/features/test-infra-pin-all-gates/HUMAN-PATCH.md ("New text", its 6.68.0
# revision). Re-check "6.68.0" against G's merged CHANGELOG section before the maintainer runs this script.
SLOT_G_LIMITS_9_NEW = r"""- **Agreement, never provenance.** The tests, the reporter config, the `package.json` scripts and
  `pharn.config.json` are agent-editable. `results-exit-contradiction`, the lock and the
  test-infrastructure pin NARROW a forged report and never close it: a self-consistent fabricated lock,
  stamp and results set over the live tree passes. Since 6.68.0 the pin covers the command of every
  allowlisted gate the project has (its `package.json` script, `pre`/`post` scripts and the scripts it
  chains to), not only the AC level gates'. It DETECTS a change at `/pharn-verify`; it never prevents one,
  and by then the changed command has already run at the build gate, regress and verify. For a gate no AC
  level maps to (`lint`, `typecheck`, `build`, …) it pins the command only, never what the command reads:
  the files it names and its own configuration (`eslint.config.*`, `tsconfig.json`, a Prettier config)
  stay agent-editable. The pin also does not see, among others, a setup file a config imports,
  configuration read from the environment, a chain through another runner (`npm-run-all`, `turbo`), npm
  configuration outside the project root or the runner's version (`pharn/floor/test-infra-core.mjs` states
  the full list).
"""

# ── protect-trusted-paths.cjs ─────────────────────────────────────────────────────────────────────────────────
PROTECT = [
    # TST-11: the fail-closed uncaughtException handler, registered right after the requires.
    (
        r"""const fs = require("fs");
const path = require("path");

function realpathOr(p) {""",
        r"""const fs = require("fs");
const path = require("path");

// A LAST-RESORT backstop (audit TST-11, 2026-10-12): the copy enforce-writes-scope.cjs has carried since 6.24.0, pinned
// to it by a test there. Registered before anything else runs, so an exception thrown anywhere in this process —
// module setup, the payload decode, composing or writing a deny — exits 2 (deny) instead of 1, which Claude Code
// treats as NON-BLOCKING: the write would proceed, a fail-OPEN. It writes only to stderr (never repeating a stdout
// write that may be what just threw) and assumes nothing else still works. It cannot touch an allow, which is a plain
// `process.exit(0)`.
process.on("uncaughtException", () => {
  try {
    process.stderr.write("the trusted-path guard failed while deciding; the write is denied — fail-closed\n");
  } catch {
    /* best effort only — exiting 2 is what matters */
  }
  process.exit(2);
});

function realpathOr(p) {""",
    ),
    # TST-4: an unreadable stdin is null, never "".
    (
        r"""function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}""",
        r"""// The raw payload, or null when stdin cannot be read — never "" for an error (audit TST-4, 2026-10-12): the caller
// used to parse an empty result as `{}`, so an unreadable or empty stdin was not a write and the hook exited 0, a
// fail-OPEN. Byte-equal to enforce-writes-scope.cjs's copy (pinned by a test there).
function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return null;
  }
}""",
    ),
    # TST-4: no input at all denies.
    (
        r"""const raw = readStdin();
let payload;
try {
  payload = JSON.parse(raw || "{}");
} catch {""",
        r"""const raw = readStdin();
// A PreToolUse hook is always handed a payload, so no input is not "nothing to judge": an unreadable stdin and an empty
// one both deny (audit TST-4), with fixed text — never a value read from the input.
if (raw === null) denyMalformedHookInput("stdin could not be read");
if (raw === "") denyMalformedHookInput("empty input");
let payload;
try {
  payload = JSON.parse(raw);
} catch {""",
    ),
]

# ── enforce-writes-scope.cjs ──────────────────────────────────────────────────────────────────────────────────
ENFORCE = [
    (
        r"""function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}""",
        r"""// The raw payload, or null when stdin cannot be read — never "" for an error (audit TST-4, 2026-10-12): the caller
// used to parse an empty result as `{}`, so an unreadable or empty stdin was not a write and the hook exited 0, a
// fail-OPEN. Byte-equal to protect-trusted-paths.cjs's copy (pinned by a test).
function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return null;
  }
}""",
    ),
    (
        r"""let payload;
try {
  payload = JSON.parse(readStdin() || "{}");
} catch {""",
        r"""const raw = readStdin();
// A PreToolUse hook is always handed a payload, so no input is not "nothing to judge": an unreadable stdin and an empty
// one both deny (audit TST-4), with fixed text — never a value read from the input.
if (raw === null) denyMalformedHookInput("stdin could not be read");
if (raw === "") denyMalformedHookInput("empty input");
let payload;
try {
  payload = JSON.parse(raw);
} catch {""",
    ),
]

# ── set-writes-scope.cjs ──────────────────────────────────────────────────────────────────────────────────────
SETTER = [
    # Usage block in the header.
    (
        r"""//   node .claude/hooks/set-writes-scope.cjs [--allow-claude-dir] [--allow-pharn-surface] --from-plan <PLAN.md>
//                                                 # the two operator opt-ins, BEFORE the mode (see OPERATOR FLAGS)""",
        r"""//   node .claude/hooks/set-writes-scope.cjs [--allow-claude-dir] [--allow-pharn-surface] [--allow-exec-config] --from-plan <PLAN.md>
//                                                 # the three operator opt-ins, BEFORE the mode (see OPERATOR FLAGS)""",
    ),
    # The new refusal, described in the header beside the two before it.
    (
        r"""//     scope with that origin is refused, in every mode and posture, with no opt-in.
//
// OPERATOR FLAGS (loop-scope-hardening). --allow-claude-dir and --allow-pharn-surface are honored only BEFORE the mode; one
// placed after `--from-plan` / `--from-frontmatter` is refused.""",
        r"""//     scope with that origin is refused, in every mode and posture, with no opt-in.
//
// ONE MORE REFUSAL (hook-hardening-batch — review finding SEC-5 of 2026-10-12), layered after the PHARN-surface one and
// writing nothing:
//   • EXECUTABLE PROJECT CONFIG, from a plan. In an INSTALLED project a `--from-plan` scope may not name a CI workflow
//     (`.github/workflows/**`) or a git hooks directory: `.husky/**`, and every directory a `core.hooksPath` value
//     names inside the project. Code there runs OUTSIDE the run that wrote it — a workflow on the next push, with the
//     repository's secrets; a hook on the next git command, in the person's own shell — so a model-written plan may
//     not scope it. --allow-exec-config opts back in (an operator flag, independent of the other two). The dev
//     checkout, an unsignalled tree and `--from-frontmatter` are unchanged.
//     WHERE `core.hooksPath` IS READ, without running git (this setter starts no process): the repository found the way
//     git looks for it, the nearest `.git` file, or `.git` directory holding a `HEAD`, at or above the project root (so
//     a project in a subdirectory of a repository reads that repository's config) — its `config` (for a linked worktree, through the `.git` file's `gitdir:` line and
//     that directory's `commondir`) and `config.worktree` — then `/etc/gitconfig`, `$XDG_CONFIG_HOME/git/config` (else
//     `~/.config/git/config`) and `$GIT_CONFIG_GLOBAL` (else `~/.gitconfig`). Every value in every one of those files
//     counts, so a later value cannot hide an earlier one. A relative value is resolved against that repository's
//     work-tree top, as git resolves it (against the project root when there is no repository; `~/` against the home
//     directory), and reserved, when it lies inside the project, at its written path and at its real path
//     (`fs.realpathSync.native` of its nearest existing ancestor). NOT READ: `include` / `includeIf` targets,
//     configuration passed through the environment or `-c`, and a system file at a non-default prefix. The walk up
//     does not stop where git's GIT_CEILING_DIRECTORIES or a filesystem boundary would, and a `.git` file is followed
//     without git's further validity checks. A `~user/` value is never inside the project and reserves
//     nothing; neither does an empty one.
//     FAIL-CLOSED where it reads: a `.git` that cannot be examined or followed to a config file, a file above that
//     exists but is not a readable regular file, or a hooksPath value continued onto the next line with a trailing
//     backslash refuses the plan rather than guess.
//     What it does NOT do: it does not stop a plan's code from running DURING the run — the pinned gates run the
//     project's tests, which execute code the build wrote — and it does not cover a hook manager configured elsewhere
//     (`lefthook.yml`, `.pre-commit-config.yaml`, hook settings in `package.json`), what a workflow or an existing hook
//     runs from elsewhere in the repository (a local action, a script), `package.json` scripts, which a feature
//     legitimately edits, or another CI system's files. Plan entries are matched lexically (`toKey()`); an entry that
//     reaches a reserved directory through a symlink is left to enforce-writes-scope.cjs, which judges the target a
//     write reaches and denies it as out of scope.
//
// OPERATOR FLAGS (loop-scope-hardening). --allow-claude-dir, --allow-pharn-surface and --allow-exec-config are honored only
// BEFORE the mode; one placed after `--from-plan` / `--from-frontmatter` is refused.""",
    ),
    (
        r"""const fs = require("fs");
const path = require("path");

function fail(msg) {""",
        r"""const fs = require("fs");
const os = require("os");
const path = require("path");

function fail(msg) {""",
    ),
    (
        r"""  let allowPharnSurface = false;
  let clear = false;""",
        r"""  let allowPharnSurface = false;
  let allowExecConfig = false;
  let clear = false;""",
    ),
    (
        r"""    } else if (a === "--allow-claude-dir" || a === "--allow-pharn-surface") {""",
        r"""    } else if (a === "--allow-claude-dir" || a === "--allow-pharn-surface" || a === "--allow-exec-config") {""",
    ),
    (
        r"""      if (a === "--allow-claude-dir") allowClaudeDir = true;
      else allowPharnSurface = true;""",
        r"""      if (a === "--allow-claude-dir") allowClaudeDir = true;
      else if (a === "--allow-pharn-surface") allowPharnSurface = true;
      else allowExecConfig = true;""",
    ),
    (
        r"""  return { mode, file, target, allowClaudeDir, allowPharnSurface, clear };
}""",
        r"""  return { mode, file, target, allowClaudeDir, allowPharnSurface, allowExecConfig, clear };
}""",
    ),
    # The class itself, after isReserved().
    (
        r"""  if (key.startsWith("pharn/") && !rel.startsWith("pharn/features/")) return true;
  return false;
}
""",
        r"""  if (key.startsWith("pharn/") && !rel.startsWith("pharn/features/")) return true;
  return false;
}

// ============================== EXECUTABLE PROJECT CONFIG (see the header, ONE MORE REFUSAL) ==================
// The two directories reserved by name. Every `core.hooksPath` inside the project is added by execConfigDirKeys().
const EXEC_CONFIG_DIRS = [".github/workflows", ".husky"];

// True iff `rel` (a plan entry, root-relative as written) lies in one of `dirKeys` (toKey()-folded, root-relative).
// "" is the project root itself, which reserves its top-level entries only: git runs a hook from that directory,
// never from below it.
function isExecConfig(rel, dirKeys) {
  const key = toKey(rel);
  return dirKeys.some((d) => (d === "" ? key !== "." && key !== ".." && !key.includes("/") : key === d || key.startsWith(d + "/")));
}

// The `core.hooksPath` values in one git config file's text. A line reader of git's config syntax: a leading BOM is
// skipped, a line ends at `\n` or `\r\n` (a lone `\r` is a blank, as git reads it), a `[core]` header is matched
// case-insensitively (`[core "x"]` is a subsection, not core), a `hooksPath` key in any letter case, `#`/`;` comments
// outside quotes, and double quotes with `\\`, `\"`, `\n`, `\t` and `\b` escapes. A key with no `=` has no path and is skipped. A value continued onto
// the next line with a trailing backslash is NOT followed: it comes back as null, which the caller refuses.
function hooksPathValues(text) {
  const out = [];
  let section = null;
  const lines = String(text)
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/);
  for (const rawLine of lines) {
    let line = rawLine.replace(/^[ \t\r]+/, "");
    if (line.startsWith("[")) {
      const h = /^\[[ \t]*([A-Za-z0-9.-]+)[ \t]*(?:"(?:[^"\\]|\\.)*"[ \t]*)?\]/.exec(line);
      if (!h) {
        section = null;
        continue;
      }
      section = /"/.test(h[0]) ? null : h[1].toLowerCase();
      line = line.slice(h[0].length).replace(/^[ \t\r]+/, "");
    }
    if (section !== "core") continue;
    const m = /^hookspath[ \t\r]*=([\s\S]*)$/i.exec(line);
    if (m) out.push(configValue(m[1]));
  }
  return out;
}

// One git config value, unquoted and unescaped; leading and trailing blanks outside quotes dropped. null when the value
// continues onto the next line (a trailing backslash).
function configValue(s) {
  let out = "";
  let blanks = "";
  let quoted = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "\\") {
      if (i + 1 >= s.length) return null;
      const n = s[++i];
      out += blanks + (n === "n" ? "\n" : n === "t" ? "\t" : n === "b" ? "\b" : n);
      blanks = "";
    } else if (c === '"') {
      out += blanks;
      blanks = "";
      quoted = !quoted;
    } else if (!quoted && (c === "#" || c === ";")) {
      break;
    } else if (!quoted && (c === " " || c === "\t" || c === "\r")) {
      if (out !== "") blanks += c;
    } else {
      out += blanks + c;
      blanks = "";
    }
  }
  return out;
}

// Every `core.hooksPath` value in the git config files named in the header; `top`, the work-tree top a relative value
// is resolved against (the nearest of `root` and its ancestors holding a `.git` entry — git's own discovery, without
// running git — or null when there is none); and a line per place the reading could not be completed (non-empty
// `errors` refuses the plan — fail-closed). Absent optional files are skipped silently.
function readHooksPathValues(root) {
  const values = [];
  const errors = [];
  const files = [];
  let top = null;
  let dotGit = null;
  for (let dir = path.resolve(root); ;) {
    try {
      const st = fs.statSync(path.join(dir, ".git"));
      // Git walks past a `.git` directory that is not a repository; one with no HEAD is walked past here too. A `.git`
      // file is followed as written.
      if (!st.isDirectory() || fs.existsSync(path.join(dir, ".git", "HEAD"))) {
        dotGit = st;
        top = dir;
        break;
      }
    } catch (e) {
      if (!e || (e.code !== "ENOENT" && e.code !== "ENOTDIR")) {
        errors.push(`${path.join(dir, ".git")} (could not be examined)`);
        break;
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  if (dotGit) {
    const dotGitPath = path.join(top, ".git");
    let gitDir = null;
    if (dotGit.isDirectory()) {
      gitDir = dotGitPath;
    } else if (dotGit.isFile()) {
      try {
        const m = /^gitdir:[ \t]*(.*?)[ \t]*$/m.exec(fs.readFileSync(dotGitPath, "utf8"));
        if (m && m[1]) gitDir = path.resolve(top, m[1]);
        else errors.push(`${dotGitPath} (a file with no \`gitdir:\` line)`);
      } catch {
        errors.push(`${dotGitPath} (a file that could not be read)`);
      }
    } else {
      errors.push(`${dotGitPath} (neither a directory nor a file)`);
    }
    if (gitDir) {
      let commonDir = gitDir;
      try {
        const c = fs.readFileSync(path.join(gitDir, "commondir"), "utf8").trim();
        if (c) commonDir = path.resolve(gitDir, c);
      } catch (e) {
        if (!e || (e.code !== "ENOENT" && e.code !== "ENOTDIR")) errors.push(`${path.join(gitDir, "commondir")} (could not be read)`);
      }
      files.push({ file: path.join(commonDir, "config"), required: true });
      files.push({ file: path.join(gitDir, "config.worktree"), required: false });
    }
  }
  const home = os.homedir();
  files.push({ file: "/etc/gitconfig", required: false });
  files.push({
    file: process.env.XDG_CONFIG_HOME
      ? path.join(process.env.XDG_CONFIG_HOME, "git", "config")
      : path.join(home, ".config", "git", "config"),
    required: false,
  });
  files.push({ file: process.env.GIT_CONFIG_GLOBAL || path.join(home, ".gitconfig"), required: false });
  for (const { file, required } of files) {
    let st;
    try {
      st = fs.statSync(file);
    } catch (e) {
      if (required || !e || (e.code !== "ENOENT" && e.code !== "ENOTDIR")) errors.push(`${file} (could not be examined)`);
      continue;
    }
    if (!st.isFile() && !(file === "/dev/null" && st.isCharacterDevice())) {
      errors.push(`${file} (not a regular file)`);
      continue;
    }
    let found;
    try {
      found = hooksPathValues(fs.readFileSync(file, "utf8"));
    } catch {
      errors.push(`${file} (could not be read)`);
      continue;
    }
    if (found.includes(null))
      errors.push(`${file} (a core.hooksPath value continues onto the next line, which this reader does not follow)`);
    values.push(...found.filter((v) => v !== null));
  }
  return { values, errors, top };
}

// `p`'s real path: the nearest existing ancestor through fs.realpathSync.native, then the segments below it as written.
function realPathOf(p) {
  let head = path.resolve(p);
  const tail = [];
  for (;;) {
    try {
      return path.join(fs.realpathSync.native(head), ...tail);
    } catch {
      const parent = path.dirname(head);
      if (parent === head) return path.resolve(p);
      tail.unshift(path.basename(head));
      head = parent;
    }
  }
}

// The toKey()-folded, root-relative keys of every reserved directory: EXEC_CONFIG_DIRS, and each hooksPath value inside
// the project, at its written path and at its real path. A relative value is resolved against the work-tree top `top`
// (as git does), else against the project root. A value outside the project reserves nothing here.
function execConfigDirKeys(root, top, values) {
  const keys = EXEC_CONFIG_DIRS.map(toKey);
  const realRoot = realPathOf(root);
  for (const v of values) {
    if (v === "" || (v.startsWith("~") && v !== "~" && !v.startsWith("~/"))) continue;
    const abs = path.resolve(top || root, v === "~" || v.startsWith("~/") ? path.join(os.homedir(), v.slice(1)) : v);
    for (const [base, target] of [
      [path.resolve(root), abs],
      [realRoot, realPathOf(abs)],
    ]) {
      const rel = path.relative(base, target);
      if (rel === "") keys.push("");
      else if (rel !== ".." && !rel.startsWith(".." + path.sep) && !path.isAbsolute(rel)) keys.push(toKey(rel.split(path.sep).join("/")));
    }
  }
  return keys;
}
""",
    ),
    (
        r"""  const { mode, file, target, allowClaudeDir, allowPharnSurface, clear } = parseArgs(process.argv);""",
        r"""  const { mode, file, target, allowClaudeDir, allowPharnSurface, allowExecConfig, clear } = parseArgs(process.argv);""",
    ),
    (
        r"""      "usage: set-writes-scope.cjs [--allow-claude-dir] [--allow-pharn-surface] (--from-frontmatter <file.md> [--target <path>] | --from-plan <PLAN.md>)\n" +""",
        r"""      "usage: set-writes-scope.cjs [--allow-claude-dir] [--allow-pharn-surface] [--allow-exec-config] (--from-frontmatter <file.md> [--target <path>] | --from-plan <PLAN.md>)\n" +""",
    ),
    (
        r"""  // Refuse a promotion-origin scope while a /pharn-loop run is open (see the header). Every mode, every posture.""",
        r"""  // Refuse executable project config from a plan, in an installed project (see the header, ONE MORE REFUSAL). Layered
  // after the PHARN-surface refusal; the dev checkout and an unsignalled tree never read a git config file here.
  if (mode === "--from-plan" && !allowExecConfig && isPharnInstalledProject()) {
    const { values, errors, top } = readHooksPathValues(process.cwd());
    if (errors.length) {
      fail(
        "refusing to scope from a plan: the git configuration that says where git hooks run could not be read\n" +
          errors.map((l) => `  • ${l}`).join("\n") +
          "\n" +
          `  Declared in : ${file}\n` +
          "  Why         : this is an installed PHARN project (pharn.config.json has a skillsVersion), where a plan may not scope a git hooks directory (core.hooksPath), and without these files the setter cannot tell which directory that is.\n" +
          "  Fix: make each file above a readable regular file, or remove it; or re-run this setter yourself with --allow-exec-config placed BEFORE --from-plan (an operator flag; no plan can set it).\n" +
          "  Nothing was written; .pharn/writes-scope.json is unchanged."
      );
    }
    const dirKeys = execConfigDirKeys(process.cwd(), top, values);
    const offenders = scope.filter((p) => isExecConfig(p, dirKeys));
    if (offenders.length) {
      fail(
        `refusing to scope, from a plan, files whose code runs outside this run: ${offenders.join(", ")}\n` +
          `  Declared in : ${file}\n` +
          "  Why         : this is an installed PHARN project (pharn.config.json has a skillsVersion); a CI workflow (.github/workflows/**) runs on the next push with the repository's secrets, and a git hooks directory (.husky/**, or a core.hooksPath inside the project) runs on the next git command in your own shell, so code a plan puts there outlives the run that wrote it, and a plan is untrusted input (CONSTITUTION P2).\n" +
          "  If you genuinely mean to change one of them: edit it yourself, outside the agent, or re-run this setter yourself with --allow-exec-config placed BEFORE --from-plan (an operator flag; no plan can set it).\n" +
          "  Nothing was written; .pharn/writes-scope.json is unchanged."
      );
    }
  }

  // Refuse a promotion-origin scope while a /pharn-loop run is open (see the header). Every mode, every posture.""",
    ),
]

# ── LIMITS.md ─────────────────────────────────────────────────────────────────────────────────────────────────
LIMITS = [
    # (d) §3b: the formula is the design estimate; what was measured is §3g.
    (
        r"""loading does not cache between stages (fresh contexts naively cannot). Real cost ≈
`diff_size × (validators + verifiers + lenses + auditors) + rule_overlap` — both terms large,
neither touched by tiered loading.
""",
        r"""loading does not cache between stages (fresh contexts naively cannot). Real cost ≈
`diff_size × (validators + verifiers + lenses + auditors) + rule_overlap` — both terms large,
neither touched by tiered loading.

**Read that formula as the design estimate, not as the measured cost model.** Its repetition term was measured in
aggregate, never per rule file: over the window `.dev/measurements/token-cost-2026-08-18.md` §4 covers, 1.111 billion
tokens were read from the prompt cache against 41.1 million written to it, and caching absorbed 82.6% of what the
same tokens would have cost at the full input price. How many times a named rule file such as `security.md` is
re-sent was not measured. What a run pays each time, measured later, is §3g: a fixed prefix for every fresh context,
and the orchestrator's re-sends — two terms the formula does not name.
""",
    ),
    # (d) §3g, new, after §3f.
    (
        r"""deterministic backstop is §3e's `instruction-growth` gate at `/pharn-verify`. It bounds the bytes one change adds to
the modelled set, never what a plan names, and never growth accumulated across changes that each stay under budget.
""",
        r"""deterministic backstop is §3e's `instruction-growth` gate at `/pharn-verify`. It bounds the bytes one change adds to
the modelled set, never what a plan names, and never growth accumulated across changes that each stay under budget.

### 3g. What was measured: a prefix per fresh context, times fan-out, plus the orchestrator's re-sends

Every fresh context — a routed stage agent, a review lens-family subagent — pays a fixed prefix on its first request,
before any stage work. And every orchestrator step that runs a pinned line is a model request of its own, carrying the
orchestrator's whole context so far. Neither depends on the size of the change.

- **The prefix, measured.** A fresh `general-purpose` agent's first request cache-wrote 68,223–129,646 tokens (median
  91,759) over 29 agents in this repository (`.dev/measurements/pipeline-performance-audit-2026-09-29.md` §3). In
  three real `/pharn-loop` runs in a user project on 6.35.0, every stage agent's first request carried
  288,489–304,974 tokens; in the run measured in depth, about half of that prefix was the project's own instruction
  files, by a bytes/4 estimate (`.dev/measurements/loop-wall-clock-2026-10-05.md` §3). The total scales with the
  number of fresh contexts a run opens: five stage agents in a one-iteration full loop, one more per further
  iteration.
- **The orchestrator's re-sends, estimated.** Counted on the code of 2026-09-29, a green one-iteration full
  `/pharn-loop` made at least 70 pinned or mandated orchestrator tool calls (a static lower bound, not the run's
  request count; the pipeline-performance audit §4). The 57 of them that run a pinned line run one per turn, because
  each branches on the exit code of the one before, so each is a model request that re-sends the orchestrator's
  context. Later releases that folded pinned lines may have moved both figures. The run measured in depth made 52
  orchestrator requests before it stopped in verify; the first carried 434,842 tokens.
- **What this does not say.** Which of the two dominates a run is not established; of the prefix's composition only
  the instruction-file share above is measured; no figure here is priced; and every token figure is the ledgers'
  count, while a bytes-to-tokens conversion is an estimate (§1c).
""",
    ),
    # (a) §6: H1 verbatim (.dev/features/audit-small-fixes/HUMAN-PATCH.md), then the setter's plan refusals.
    (
        r"""- **True statement:** a `Bash` write is **not denied**, and is **not detected at the time it happens**. No
  `PostToolUse` hook is wired (`grep -c PostToolUse .claude/settings.json` → `0`), so nothing observes
  the write, and no record of it exists to reconcile later.
""",
        r"""- **True statement:** a `Bash` write is **not denied**, and is **not detected at the time it happens**. No
  `PostToolUse` hook is wired (`grep -c PostToolUse .claude/settings.json` → `0`), so nothing observes
  the write, and no record of it exists to reconcile later.
- **`Bash` is not the only surface outside the matcher.** (a) A write made through an **MCP server's** tool — a
  filesystem server's `write_file`, say — arrives under that tool's own `mcp__<server>__<tool>` name, which is none
  of `Write|Edit|MultiEdit|NotebookEdit`; even where the matcher's pattern happens to match it, each hook's own
  anchored `isWrite` test does not, so neither guard judges it; the after-the-fact reconciliation
  below covers it exactly as it covers a `Bash` write, and no more. (b) **`"disableAllHooks": true`** in any settings
  file Claude Code loads turns off every hook, both guards included, while the wiring stays exactly as committed.
  `hook-wiring.test.cjs` RED-fails when either project file (`.claude/settings.json`, or `.claude/settings.local.json`
  when present) carries the key — a test of this repository's own files, and tests never ship, so in an install
  nothing PHARN ships checks either file; a user-level `~/.claude/settings.json` lies outside every repository.
- **The setter's refusals of a plan are early, lexical and reachable through `Bash`.** In an installed project
  `set-writes-scope.cjs --from-plan` refuses a plan that names PHARN's own installed files, a CI workflow
  (`.github/workflows/**`) or a git hooks directory (`.husky/**`, or a `core.hooksPath` inside the project), unless
  the operator passes the matching opt-in before the mode (`THREAT-MODEL.md §2` item 10). The setter runs through
  `Bash`, so an agent holding `Bash` can pass the opt-in or write the scope record itself. It finds `core.hooksPath`
  without running git: in the config of the repository holding the project (the nearest repository at or above it) and
  its `config.worktree`, `/etc/gitconfig`, and the XDG and global user files. It does not follow `include` or
  `includeIf`, read configuration passed through the environment or `-c`, or read a system file at another prefix, so
  a hooks directory named only there is not refused. Other executable configuration is not refused at all: a hook
  manager configured elsewhere (`lefthook.yml`, `.pre-commit-config.yaml`, hook settings in `package.json`), what a
  workflow or an existing hook runs from elsewhere in the repository (a local action under `.github/actions/`, a
  script, the project's own tests), another CI system's files, `package.json` scripts, or a tool configuration that
  runs code.
""",
    ),
    # §7: what a running guard controls.
    (
        r"""- **A guard that cannot start, or that times out, still does not block.** That is Claude Code's documented
  behaviour, and no hook can change it.
""",
        r"""- **A guard that cannot start, or that times out, still does not block.** That is Claude Code's documented
  behaviour, and no hook can change it. What a running guard controls is its own exit, and both deny (exit 2) on
  input they cannot use — an empty or unreadable stdin, invalid JSON, a payload that is not an object — and on an
  uncaught exception, through a handler each registers before its first decision. A process
  killed by a signal, or one that fails before that handler is registered, exits otherwise and does not block.
""",
    ),
]

# ── THREAT-MODEL.md ───────────────────────────────────────────────────────────────────────────────────────────
THREAT = [
    # (b) item 8: the Skill tool and the five scoped grants.
    (
        r"""   finding never reaches the human. Stated in full, with its carve-out, at
   `.claude/commands/pharn-review.md` Step 3b — cited, not restated (P4).
""",
        r"""   finding never reaches the human. Stated in full, with its carve-out, at
   `.claude/commands/pharn-review.md` Step 3b — cited, not restated (P4).
   Whether such a skill needs a grant to run through the Skill tool was measured once, for a neighbouring case only:
   in the probe behind CHANGELOG [6.67.0] (Claude Code 2.1.303, `-p`, one run per case), a command-file target that
   declares no `allowed-tools` loaded with no grant and no permission denial; a `.claude/skills/` target, and an
   interactive session's prompting, were not probed. That
   is Claude Code's behaviour, not a PHARN grant. `/pharn-loop` pre-approves the Skill tool only as `Skill(pharn-spec *)`,
   `Skill(pharn-plan *)`, `Skill(pharn-grill *)`, `Skill(pharn-test *)` and `Skill(pharn-build *)`; the grant
   matches by name, so whatever answers to one of those five names runs under it.
""",
    ),
    # (c) item 10, new.
    (
        r"""   `pharn/pharn-contracts/spec-template.md`, "The project template" — cited, not restated (P4).

---
""",
        r"""   `pharn/pharn-contracts/spec-template.md`, "The project template" — cited, not restated (P4).
10. **a model-written PLAN as the write-scope input** — `/pharn-build` sets the writes-scope from the PLAN's
    `## Files` (`set-writes-scope.cjs --from-plan`), and under `/pharn-loop` no human reads that PLAN before it is
    built. So the plan decides which paths the write guard opens, and executable project configuration is in that
    class: CI workflows, git hooks directories and `package.json` scripts all hold code that runs later. The setter
    refuses a plan that scopes the guards' own control surface (in every project) and, in an installed project,
    PHARN's own installed files (6.61.0), a CI workflow (`.github/workflows/**`) or a git hooks directory
    (`.husky/**`, or a `core.hooksPath` inside the project), each unless the operator passes its opt-in before the
    mode. What the last two buy is narrow: a plan cannot name a file under `.github/workflows/`, under `.husky/`, or
    in a `core.hooksPath` directory the setter finds — the files that run on the next push with the repository's
    secrets, or on the next git command in the person's shell. Other routes to code that runs after the run stay
    open: a hook manager configured elsewhere (`lefthook.yml`, `.pre-commit-config.yaml`, hook settings in
    `package.json`), and what a workflow or an existing hook runs from elsewhere in the repository (a local action,
    a script, the project's own tests) — `LIMITS.md §6` lists them. Nor is any of this containment: code a plan writes
    still runs during the run, because the pinned gates run the project's tests. `package.json` scripts are not
    refused, since a feature legitimately edits `package.json`; a changed gate command is at most detected, at
    `/pharn-verify`, by the test-infrastructure pin of a run that carries an AC lock, never prevented
    (`LIMITS.md §9`). The bounds of the refusals — lexical, run through `Bash`, and reading only the git config files
    the setter names — are in `LIMITS.md §6`.

---
""",
    ),
    # §3 table: the row for item 10.
    (
        r"""A change landed by a merge, a pull or a human editor is obeyed as-is |
""",
        r"""A change landed by a merge, a pull or a human editor is obeyed as-is |
| plan as write-scope input | the setter refuses a plan naming the control surface and, in an installed project, PHARN's installed files, a CI workflow or a git hooks directory; both write guards then enforce the scope it emits | enum/regex membership in a setter run through `Bash` — an opt-in, a forged record or a `Bash` write passes it (`LIMITS.md §6`). Hook managers configured elsewhere, files a workflow or hook runs from elsewhere, and `package.json` scripts are not refused; a changed gate command is at most detected, by the AC lock's pin (`LIMITS.md §9`) |
""",
    ),
]

if SLOT_G_LIMITS_9_NEW is not None:
    LIMITS.append((SLOT_G_LIMITS_9_OLD, SLOT_G_LIMITS_9_NEW))

TARGETS = [
    # (path, edits, BEFORE sha256, AFTER sha256)
    (".claude/hooks/protect-trusted-paths.cjs", PROTECT,
     "37b8955a0c696cc1374702f8c7b44f52d4609dac78b42fd5a24bebfe0786a4d7",
     "f3ef97c4bf2eea3e47cda375e70b8ef62a735ab5d90dabe69b560c3c79efe7d3"),
    (".claude/hooks/enforce-writes-scope.cjs", ENFORCE,
     "b2e058d6fcf39c2d87f91f800b883a4ed23199f7c67f7d4fcd2d3632c092bb35",
     "0405e36a510748db52e5fd58f7f1dba1b7258aad497c7bd0e8d6ad6a9fd43309"),
    (".claude/hooks/set-writes-scope.cjs", SETTER,
     "9fd5f30aef239d3a3f2c47dff38bdeac4e2856cda8ccd707eb89f753a1832291",
     "fc81310782457512d4bbc3d2345cb8f8c456c8234f9b23aa2f4db7110d0ff6ac"),
    ("LIMITS.md", LIMITS,
     "94805c21eaff406df8a30fba6976da2a5cdefd9ea992d039bd61ee19a946759b",
     "fe998761b9dc544617f6d6e5fbdcb980ec16585b0867c903223fa81d93a00e94"),
    ("THREAT-MODEL.md", THREAT,
     "ec0c9c789d367d7a5aa848249791d758dc1a4619d32141e05b30dc64caeec52c",
     "f886f61636438effca0c23aa7fac2c3a1f3b9a80a4f55ae7be6e387b3ae4e6e3"),
]


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def patched(root):
    """Return [(rel, new_bytes, before_hex, after_hex, edit_count)], or raise SystemExit with a refusal.
    Reads only; writes nothing."""
    out = []
    for rel, edits, before, after in TARGETS:
        p = os.path.join(root, rel)
        try:
            with open(p, "rb") as f:
                data = f.read()
        except OSError as e:
            raise SystemExit("REFUSED: cannot read %s (%s). Nothing was written." % (rel, e))
        got = sha256(data)
        if got != before:
            raise SystemExit(
                "REFUSED: %s is not the reviewed version (sha256 %s, pinned %s). Nothing was written." % (rel, got, before)
            )
        text = data.decode("utf-8")
        for i, (old, new) in enumerate(edits, 1):
            n = text.count(old)
            if n != 1:
                raise SystemExit("REFUSED: %s edit %d: old text found %d times, expected 1. Nothing was written." % (rel, i, n))
            text = text.replace(old, new, 1)
        out.append((rel, text.encode("utf-8"), before, after, len(edits)))
    return out


def main():
    if SLOT_G_LIMITS_9_NEW is None:
        raise SystemExit("REFUSED: the LIMITS.md §9 slot (group G's text) is still empty. Nothing was written.")
    if not os.path.isfile(os.path.join(ROOT, "SKILLS_VERSION")) or not os.path.isdir(os.path.join(ROOT, ".claude", "hooks")):
        raise SystemExit("REFUSED: %s is not a PHARN checkout. Nothing was written." % ROOT)
    # The §9 slot states group G's 6.68.0 behaviour, so it may land only where G's code already is.
    try:
        with open(os.path.join(ROOT, "CHANGELOG.md"), encoding="utf-8") as f:
            has_g_section = any(line.startswith("## [6.68.0]") for line in f)
        with open(os.path.join(ROOT, "pharn", "floor", "test-infra-core.mjs"), encoding="utf-8") as f:
            has_g_code = "other_gates" in f.read()
    except OSError as e:
        raise SystemExit("REFUSED: cannot check for group G's 6.68.0 (%s). Nothing was written." % e)
    if not (has_g_section and has_g_code):
        raise SystemExit(
            "REFUSED: group G's 6.68.0 (CHANGELOG section and test-infra-core.mjs `other_gates`) is not in this checkout; "
            "merge origin/main after G lands. Nothing was written."
        )
    results = patched(ROOT)
    for rel, data, _before, after, _n in results:
        got = sha256(data)
        if got != after:
            raise SystemExit(
                "REFUSED: %s would come out as sha256 %s, not the reviewed %s. Nothing was written." % (rel, got, after)
            )
    for rel, data, _before, _after, _n in results:
        p = os.path.join(ROOT, rel)
        mode = os.stat(p).st_mode & 0o7777
        tmp = p + ".hook-hardening-batch.tmp"
        with open(tmp, "wb") as f:
            f.write(data)
        os.chmod(tmp, mode)
        os.replace(tmp, p)
    for rel, _data, before, after, n in results:
        print("patched %-42s %2d edit(s)  %s… -> %s…" % (rel, n, before[:12], after[:12]))
    os.remove(os.path.abspath(__file__))
    print("done: 5 files patched; apply.py deleted itself. Next: commit the five files (see HUMAN-PATCH.md).")


if __name__ == "__main__":
    main()
