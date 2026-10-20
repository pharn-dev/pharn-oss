#!/usr/bin/env node
// .claude/hooks/set-writes-scope.cjs — the writes-scope SETTER (CONSTITUTION P0/P5, fix #7).
//
// Deterministic, non-LLM, stdlib-only. Reads a Capability/command's declared `writes:` (Mode A) or a
// PLAN.md's `## Files` list (Mode B) and writes `.pharn/writes-scope.json` = { scope, set_by, set_at }.
// The companion pre-write hook (enforce-writes-scope.cjs) reads that file and DENIES any write outside
// the scope, fail-closed to a default-safe-set when the file is absent. Scope is parsed deterministically
// from frontmatter / markdown — no model decides scope; that is what makes `writes:` floor-grade (P5).
//
// Usage (run as a command's FIRST step, before any write):
//   node .claude/hooks/set-writes-scope.cjs --from-frontmatter <capability-or-command.md> [--target <path>]
//   node .claude/hooks/set-writes-scope.cjs --from-plan <PLAN.md>
//   node .claude/hooks/set-writes-scope.cjs [--allow-claude-dir] [--allow-pharn-surface] [--allow-exec-config] --from-plan <PLAN.md>
//                                                 # the three operator opt-ins, BEFORE the mode (see OPERATOR FLAGS)
//   node .claude/hooks/set-writes-scope.cjs --clear   # run as a command's LAST step, after every write
//
// --clear DELETES .pharn/writes-scope.json, returning enforce-writes-scope.cjs to its DEFAULT. Since
// 6.24.0 that default is no longer always the fail-closed DEFAULT_SAFE_SET: in a dev checkout, an
// unsignalled tree, or an installed project with a PHARN run open it is (unchanged); in an INSTALLED
// project with NO run open it is instead the newer, more permissive default (it denies PHARN's own
// installed surface and its own scope file and allows the rest of the project — the whole rule, including
// the out-of-project half, is in `enforce-writes-scope.cjs`'s header and `CLAUDE.md`, "Writes-scope"). This command
// never prints which one applies — it only removes the record — because computing that would duplicate
// the hook's own posture/run-marker logic in a second place. It exists because a SET scope REPLACES
// whichever default is live: a command that finished and left its scope behind is STRICTER than either
// default, so ordinary later work is silently denied (measured, in the dev posture: with a leftover
// one-path scope, `pharn/features/**`, `.dev/features/**` and `pharn/pharn-*/**` paths the default
// PERMITS all exit 2). It takes no --target and REFUSES to combine with --from-plan / --from-frontmatter:
// clearing and setting in one call is always a mistake, and the refusal is louder than a
// silently-honored precedence rule. Absent file -> exit 0, no output change (idempotent), so a command's
// last step is safe to run twice or after an early abort.
//
// TWO failure directions this flag must survive, both named because naming only one is how a partial
// rationale narrows the next reader (.dev/memory-bank/lessons-learned.md L25):
//   (1) It must not write `{"scope": []}` as a "cleared" marker. An EMPTY ARRAY IS TRUTHY, so
//       enforce-writes-scope.cjs would compute allow = [...ALWAYS] and deny EVERYTHING outside
//       `.pharn/**` — stricter than the stale scope this flag exists to remove. Deleting the file is
//       the only shape that reaches the safe-set through the already-tested absent-file path.
//   (2) It is a BASH call, so it is outside the PreToolUse gate entirely (L19). Running it is ADVISORY
//       lifecycle hygiene; the FLOOR guarantee is unchanged and belongs to the reader, not to this
//       writer — "no usable scope file => DEFAULT_SAFE_SET". Never write "--clear guarantees cleanup".
//
// `--target` resolves placeholder/glob `writes:` entries (e.g. pharn/features/<name>/PLAN.md) to one concrete
// file before emitting scope — so the hook allowlist is a single artifact path, not a broad directory.
//
// Exits non-zero (and writes nothing) rather than emit an empty/placeholder scope — fail-closed.
//
// It also REFUSES, on the same fail-closed terms, to emit a scope naming the two pre-write guards' own
// control surface (CONTROL_SURFACE below: .claude/settings.json + the four hook scripts). A declared
// `writes:` / `## Files` list is `trust: untrusted` input (CONSTITUTION P2): before this check, an entry
// naming a hook produced a scope that enforce-writes-scope.cjs then honored, so an untrusted document
// could authorize disarming a guard. --allow-claude-dir opts back in for the increments that genuinely
// edit a guard; it is an operator ARGV flag, so no declared file can set it for itself.
//
// TWO MORE REFUSALS (loop-scope-hardening — review findings SEC-1 and SEC-3 of 2026-10-12), each layered
// AFTER the ones above and each writing nothing:
//   • PHARN'S OWN INSTALLED SURFACE, from a plan. In an INSTALLED project (`pharn.config.json` at cwd is a regular
//     file whose JSON carries a non-empty string `skillsVersion` — enforce-writes-scope.cjs's posture signal) a
//     `--from-plan` scope may not name `pharn/**` except `pharn/features/**`, `.claude/**` or `pharn.config.json`:
//     the set enforce-writes-scope.cjs already reserves outside a run, matched by byte-equal copies of its
//     `toKey()` / `isReserved()`. Those are PHARN's floor, guards, commands and config — what judges a run and
//     instructs its later stages — and before this a model-written PLAN could scope a floor script that a
//     pre-approved `/pharn-loop` line then ran. --allow-pharn-surface opts back in (an operator flag). The dev
//     checkout and an unsignalled tree are unchanged; `--from-frontmatter` is unchanged.
//   • A PROMOTION-ORIGIN SCOPE WHILE A `/pharn-loop` RUN IS OPEN. protect-trusted-paths.cjs unlocks a memory-bank
//     canon write only for a record whose `set_by` folds to one of PROMOTE_COMMANDS — and `set_by` is this
//     setter's argv `file`. An unattended loop never promotes, so while a loop marker is open (the test
//     enforce-writes-scope.cjs `scanRuns()` applies, for the `pharn-loop` state directory only, read-only) a
//     scope with that origin is refused, in every mode and posture, with no opt-in.
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
// BEFORE the mode; one placed after `--from-plan` / `--from-frontmatter` is refused. A pre-approved command line (a `/pharn-*`
// command's `allowed-tools`) carries a `*` after its mode, and `*` matches any text, so an opt-in accepted after
// the mode could ride on a pre-approved line.
//
// FENCED CODE (loop-scope-hardening — review finding ENF-1). Mode B never reads a fenced code block: a fenced `## Files` is not
// the list, and fenced lines under the list are not paths. This reader does not track list nesting, so it reads
// the plan two ways — a fence line counts only at 0–3 spaces (CommonMark's top-level rule), and a fence line counts
// at any indentation with a bare closer indented less than its opener ending that block and opening another (what
// happens when a list item ends under a fence) — and refuses when the two lists differ, rather than guess.
// pharn/floor/plan-files-core.mjs holds the same rule; ★ PARITY tests run both over shared fixtures.
//
// HONEST BOUND (P0): these tests are LEXICAL. Entries are normalized for the comparison (`./`, `a/../`,
// backslashes, case, Unicode, trailing dots/spaces) but never realpath-resolved, so a symlink declared in
// `## Files` that resolves onto a protected file is NOT caught here. Defense in depth, in order: these refusals
// are the loud EARLY failure at declaration time; enforce-writes-scope.cjs realpaths the write target and
// denies it as out of scope; and protect-trusted-paths.cjs realpaths and denies the control files outright
// regardless of any scope. This refusal buys a clear early failure — it is not the last line of defense. Every
// refusal here is also an argv/marker reading by a Bash-run program: an agent holding Bash can pass an opt-in,
// delete a marker, or write the scope record itself (LIMITS.md §6). And the `## Files` reader is NOT a
// CommonMark parser: an indented code block, an HTML block or comment holding a fence line, a setext heading and
// a `*`/`+` bullet are read as their lines look, not as a renderer shows them.

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

function fail(msg) {
  process.stderr.write("set-writes-scope: " + msg + "\n");
  process.exit(1);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  let mode;
  let file;
  let target;
  let allowClaudeDir = false;
  let allowPharnSurface = false;
  let allowExecConfig = false;
  let clear = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--target") {
      if (!args[i + 1]) fail("--target requires a path");
      target = args[++i];
    } else if (a === "--clear") {
      // Its OWN branch, ahead of the positional fallbacks — for the same reason --allow-claude-dir
      // needs one: otherwise the flag is swallowed as the positional `mode` and `--clear` silently
      // becomes an unknown-mode usage error instead of a clear.
      clear = true;
    } else if (a === "--allow-claude-dir" || a === "--allow-pharn-surface" || a === "--allow-exec-config") {
      // Its OWN branch, ahead of the positional fallbacks — otherwise the flag is consumed as the
      // positional `mode` or `file` and silently breaks --from-plan / --from-frontmatter parsing. And only
      // BEFORE the mode (see OPERATOR FLAGS in the header).
      if (mode) {
        fail(
          `${a} must come BEFORE the mode (--from-plan / --from-frontmatter), never after it\n` +
            "  Why: a pre-approved command line carries a wildcard after its mode, so an opt-in accepted there could ride on it.\n" +
            "  Nothing was written; .pharn/writes-scope.json is unchanged."
        );
      }
      if (a === "--allow-claude-dir") allowClaudeDir = true;
      else if (a === "--allow-pharn-surface") allowPharnSurface = true;
      else allowExecConfig = true;
    } else if (!mode) {
      mode = a;
    } else if (!file) {
      file = a;
    } else {
      fail(`unexpected argument: ${a}`);
    }
  }
  return { mode, file, target, allowClaudeDir, allowPharnSurface, allowExecConfig, clear };
}

// The two pre-write guards' own control surface: the settings file that WIRES both PreToolUse hooks, and
// the four hook scripts. Each is re-read fresh on every tool call, so a write to any one of them disarms
// a guard on the very next write. Kept identical to the `.claude/` entries of DEFAULT_PROTECTED in
// protect-trusted-paths.cjs — the two guards cover the same four paths, one by denylist, one by refusing
// to authorize them. `.claude/commands/**` and `.claude/hooks/*.test.cjs` are deliberately absent: an
// increment that edits a command, or a hook's own tests, must not need an opt-in flag.
const CONTROL_SURFACE = [
  ".claude/settings.json",
  // settings.local.json is a real, loaded settings file that can wire or override the same hooks, so
  // guarding only settings.json left the control surface half-open.
  ".claude/settings.local.json",
  ".claude/hooks/protect-trusted-paths.cjs",
  ".claude/hooks/enforce-writes-scope.cjs",
  ".claude/hooks/set-writes-scope.cjs",
  ".claude/hooks/require-loop-record.cjs",
];

// The promotion commands whose scope ORIGIN unlocks a canon write in protect-trusted-paths.cjs — a set-equal copy
// of that hook's PROMOTE_COMMANDS, pinned by a ✧ test. Used only to REFUSE (see the header).
const PROMOTE_COMMANDS = [".claude/commands/pharn-memory-promote.md", ".claude/commands/pharn-dev-memory-promote.md"];

// Lexical normalization for the MEMBERSHIP TEST ONLY — the emitted scope value is never rewritten. Folds
// `./`, `a/../` and backslashes so a trivial re-spelling (`./.claude/settings.json`) cannot walk past the
// exact-membership test below. NOT a realpath; see the header's HONEST BOUND. Since the audit's P3-R (2026-10-07) it
// also folds Unicode to NFC and case to lower, the way protect-trusted-paths.cjs keys its denylist: on a
// case-insensitive volume `.CLAUDE/hooks/…` names the same file, and the refusal must not be the layer that misses it.
function normalizeForTest(entry) {
  return path.posix.normalize(String(entry).replace(/\\/g, "/")).normalize("NFC").toLowerCase();
}

// A DELIBERATE COPY of enforce-writes-scope.cjs's `toKey()` (itself pinned byte-equal to protect-trusted-paths.cjs's)
// — pinned byte-equal by a ✧ test. A shared module would be a new control-surface file.
function toKey(rel) {
  return path.posix
    .normalize(String(rel).replace(/\\/g, "/"))
    .normalize("NFC")
    .split("/")
    .map((s) => (s === "." || s === ".." ? s : s.replace(/[. ]+$/, "")))
    .join("/")
    .toUpperCase()
    .toLowerCase();
}

// A DELIBERATE COPY of enforce-writes-scope.cjs's `isReserved()` — PHARN's own installed surface — pinned
// byte-equal by a ✧ test.
function isReserved(rel) {
  const key = toKey(rel);
  if (key === "pharn.config.json") return true;
  if (key.startsWith(".claude/")) return true;
  if (key.startsWith("pharn/") && !rel.startsWith("pharn/features/")) return true;
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

// The installed-project signal enforce-writes-scope.cjs reads, here at cwd (where this setter writes its record).
function isPharnInstalledProject() {
  const abs = path.resolve(process.cwd(), "pharn.config.json");
  try {
    const st = fs.lstatSync(abs);
    if (!st.isFile() || st.isFIFO()) return false;
    const parsed = JSON.parse(fs.readFileSync(abs, "utf8"));
    return typeof parsed.skillsVersion === "string" && parsed.skillsVersion.length > 0;
  } catch {
    return false;
  }
}

// The open `/pharn-loop` runs at `root`, read the way enforce-writes-scope.cjs `scanRuns()` reads its `pharn-loop`
// state directory — presence and age only, never parsed — but read-only (no mtime refresh). Returns the lines the
// refusal prints: one per open marker, and one per place the scan could not rule an open run out (fail-closed).
const RUN_AGE_CEILING_MS = 24 * 60 * 60 * 1000;
const RUN_NAME_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
function openLoopRuns(root) {
  const lines = [];
  const unreadable = (where) =>
    lines.push(
      `${where} — not a readable run-state entry, so an open run cannot be ruled out; if no loop is running, repair or remove it by hand`
    );
  try {
    if (fs.lstatSync(path.join(root, ".pharn")).isSymbolicLink()) {
      unreadable(".pharn (a symbolic link)");
      return lines;
    }
  } catch (e) {
    if (!e || e.code !== "ENOENT") unreadable(".pharn");
    return lines;
  }
  const stateDir = path.join(root, ".pharn", "pharn-loop");
  let st;
  try {
    st = fs.lstatSync(stateDir);
  } catch (e) {
    if (!e || e.code !== "ENOENT") unreadable(".pharn/pharn-loop");
    return lines;
  }
  let names;
  try {
    if (!st.isDirectory()) throw new Error("not a directory");
    names = fs.readdirSync(stateDir);
  } catch {
    unreadable(".pharn/pharn-loop");
    return lines;
  }
  for (const name of names) {
    const shown = RUN_NAME_RE.test(name)
      ? `.pharn/pharn-loop/${name}/active.json`
      : "a marker under .pharn/pharn-loop/ whose directory name is not a plain slug";
    let mst;
    try {
      mst = fs.lstatSync(path.join(stateDir, name, "active.json")); // presence only — never parsed
    } catch (e) {
      if (e && (e.code === "ENOENT" || e.code === "ENOTDIR")) continue; // no marker; a stray non-directory entry
      unreadable(shown);
      continue;
    }
    if (Math.abs(Date.now() - mst.mtimeMs) > RUN_AGE_CEILING_MS) continue; // older than 24 h: not a run (enforce's rule)
    lines.push(
      RUN_NAME_RE.test(name)
        ? `${shown} — when no loop is running, close it: node .claude/hooks/require-loop-record.cjs --close ${name}`
        : `${shown} — when no loop is running, remove it by hand`
    );
  }
  return lines;
}

// Strip a trailing " (annotation)" (e.g. " (gated)") and surrounding whitespace.
function clean(entry) {
  return String(entry)
    .replace(/\s+\([^)]*\)\s*$/, "")
    .trim();
}

// Emit only literal repo-relative paths — no placeholders, globs, or empties.
function isConcrete(entry) {
  return entry.length > 0 && !entry.includes("<") && !entry.includes(">") && !entry.includes("*") && !entry.includes("?");
}

function normalizeRel(p) {
  const rel = path.relative(process.cwd(), path.resolve(process.cwd(), String(p))).replace(/\\/g, "/");
  if (rel === "" || rel === ".." || rel.startsWith("../")) fail(`--target escapes repo root: ${p}`);
  return rel;
}

function globToRegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        re += ".*";
        i++;
      } else {
        re += "[^/]*";
      }
    } else if ("\\^$.|?+()[]{}".includes(c)) {
      re += "\\" + c;
    } else {
      re += c;
    }
  }
  return new RegExp("^" + re + "$");
}

function placeholderToRegExp(entry) {
  let re = "";
  for (let i = 0; i < entry.length; i++) {
    const c = entry[i];
    if (c === "<") {
      const end = entry.indexOf(">", i);
      if (end === -1) return null;
      re += "[^/]+";
      i = end;
    } else if ("\\^$.|?+()[]{}*".includes(c)) {
      re += "\\" + c;
    } else {
      re += c;
    }
  }
  return new RegExp("^" + re + "$");
}

// Resolve a declared writes entry to one concrete path. Literals pass through; placeholders/globs need
// --target and must match it — the emitted scope is the target path, not the pattern.
function resolveEntry(entry, target) {
  const e = clean(entry);
  if (isConcrete(e)) return e;
  if (!target) return null;
  const t = normalizeRel(target);
  if (e.includes("<") || e.includes(">")) {
    const re = placeholderToRegExp(e);
    return re && re.test(t) ? t : null;
  }
  if (e.includes("*") || e.includes("?")) {
    return globToRegExp(e).test(t) ? t : null;
  }
  return null;
}

// --- Mode A: read the `writes:` array from a markdown file's YAML frontmatter. ---
function writesFromFrontmatter(file) {
  const fm = fs.readFileSync(file, "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) fail(`no YAML frontmatter in ${file}`);
  const lines = fm[1].split(/\r?\n/);
  const idx = lines.findIndex((l) => /^writes:/.test(l));
  if (idx === -1) fail(`no \`writes:\` key in the frontmatter of ${file}`);
  const head = lines[idx].replace(/^writes:[ \t]*/, "").trim();
  const items = [];
  if (head.startsWith("[")) {
    // Inline flow array: writes: ["a", "b"]. Prefer quoted strings; else comma-split.
    const quoted = head.match(/"([^"]*)"|'([^']*)'/g);
    if (quoted) for (const q of quoted) items.push(q.slice(1, -1));
    else for (const p of head.replace(/^\[|\]$/g, "").split(",")) items.push(p.trim());
  } else {
    // Block list:  writes:\n  - "a"\n  - b
    if (head) items.push(head.replace(/^["']|["']$/g, ""));
    for (let i = idx + 1; i < lines.length; i++) {
      const li = lines[i].match(/^[ \t]+-[ \t]+(.*)$/);
      if (!li) break;
      items.push(li[1].trim().replace(/^["']|["']$/g, ""));
    }
  }
  return items;
}

// A fence line: optional leading spaces/tabs, a run of 3+ backticks or 3+ tildes, then the rest (an opener's info
// string; a closer's must be blank). A backtick run whose rest holds a backtick is inline code, never a fence.
const FENCE_LINE_RE = /^([ \t]*)(`{3,}|~{3,})(.*)$/;

// --- Mode B: the leading back-tick path of each list item under `## Files`, stopping at the next
// markdown heading of ANY level (an exclusion subsection like `### Explicitly not touched` /
// `### Out of scope` is its own heading) or a head-less prose exclusion cue. A path under either of those
// two section-level forms never enters scope, however the exclusion is worded (P5, fix #7). Residual: an
// inline-marked item (`- `path` — not touched`) IS a path-item, so it is NOT detected — see the plan's
// "Known residuals". Fenced code is never read (see FENCED CODE in the header): `readPlanFiles` is ONE reading,
// `nested` choosing how a fence line is recognized, and `pathsFromPlanFiles` refuses when the two readings differ. ---
function readPlanFiles(lines, nested) {
  let fence = null; // { char, len, indent } while a fenced block is open
  let start = -1;
  const out = [];
  // Whether a path-item's body is still open (see Boundary 2). Reset by a blank line.
  let inPathItemBody = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const f = line.match(FENCE_LINE_RE);
    if (f && !(f[2][0] === "`" && f[3].includes("`")) && (nested || /^ {0,3}$/.test(f[1]))) {
      const char = f[2][0];
      const closes = fence !== null && char === fence.char && f[2].length >= fence.len && f[3].trim() === "";
      if (fence === null) fence = { char, len: f[2].length, indent: f[1].length };
      else if (closes && (!nested || f[1].length >= fence.indent)) fence = null;
      else if (closes) fence = { char, len: f[2].length, indent: f[1].length }; // a list item ended; a new block opens
      continue;
    }
    if (fence !== null) {
      // Fenced content is never a heading, an item or a cue — but a blank line still closes an item's body, so
      // the wrapped-continuation exemption below never widens.
      if (start !== -1 && !line.trim()) inPathItemBody = false;
      continue;
    }
    if (start === -1) {
      if (/^##\s+Files\b/.test(line)) start = i;
      continue;
    }
    // Boundary 1 — STRUCTURAL: any markdown heading of ANY level (`##`, `###`, …) ends the authorized
    // list. An exclusion subsection (`### Explicitly not touched`, `### Out of scope`, `### Excluded`)
    // is its own heading, so its paths are NEVER scanned — independent of the exclusion's wording.
    if (/^\s{0,3}#{1,6}\s/.test(line)) break;
    // Boundary 2 — CUE fallback for a HEAD-LESS prose exclusion intro (`Files NOT written:`), anchored
    // to a NON-path line. `\W*` (not `\s+`) tolerates markdown markup, e.g. `**not** touched`.
    //
    // "A NON-path line" was NOT enough, and the previous version of this comment said it was. An item's
    // description that WRAPS puts ordinary vocabulary on a following line which is neither a path-item nor
    // a blockquote — so a bullet reading "… an in-repo out-of-scope path unchanged" matched `out of scope`
    // and TRUNCATED the authorized list. Measured live: a 5-path plan parsed as 1. Fails CLOSED (a loud
    // deny at the next write), so it was friction rather than a hole, and it was caught only because the
    // printed path count was read. Promoted as .dev/memory-bank/lessons-learned.md L28.
    //
    // The exemption is deliberately NARROW: only a line that continues an OPEN path-item's own text — an
    // indented, non-blank line with NO intervening blank line since that item began. A blank line closes
    // the item's body, so an INDENTED exclusion intro after one still breaks. The wide rule ("exempt every
    // indented line") was rejected for exactly that case: it would let an indented exclusion sub-list enter
    // scope, which fails OPEN, and this parser's failures must land on the friction side.
    //
    // HONEST BOUND, stated because the last version of this comment omitted its own: a LAZY continuation —
    // an UNINDENTED line continuing an item's paragraph, which markdown permits — is still not exempt and
    // still trips the cue. Prettier formats every PLAN in this repo and indents continuations, so the lazy
    // form does not arise here; closing it needs a real markdown parser and has no triggering failure (P7).
    // A blockquote line (`> …`) is EXPLANATORY commentary, never an exclusion-section intro, so it is
    // EXEMPT: an explanatory note under `## Files` that mentions "not touched" (e.g. a reference to the
    // `### Explicitly not touched` subsection) must NOT truncate the authorized list. Only blockquotes
    // are exempted, so a head-less NON-blockquote intro (`Files NOT written:`) and an exclusion-only
    // `## Files` still fail closed (CF-E, .dev/features/product-pipeline-probe/PROBE.md).
    const isPathItem = /^\s*-\s+`[^`]+`/.test(line);
    const isBlockquote = /^\s*>/.test(line);
    // An indented, non-blank line while a path-item's body is still open is that item's own wrapped text.
    // A blank line closes the body; a heading already ended the scan above.
    const isWrappedContinuation = inPathItemBody && !isPathItem && /^\s+\S/.test(line);
    if (isPathItem) inPathItemBody = true;
    else if (!line.trim()) inPathItemBody = false;
    if (
      !isPathItem &&
      !isBlockquote &&
      !isWrappedContinuation &&
      /\bnot\W*(touch|writ|modif|edit|chang)|\bexplicitly\W*excluded|\bout\W*of\W*scope|\boff\W*limits/i.test(line)
    ) {
      break;
    }
    const m = line.match(/^\s*-\s+`([^`]+)`/);
    if (m) out.push(m[1].trim());
  }
  return { start, out };
}

function pathsFromPlanFiles(file) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  const top = readPlanFiles(lines, false);
  if (JSON.stringify(top) !== JSON.stringify(readPlanFiles(lines, true))) {
    fail(
      `the \`## Files\` list in ${file} reads differently depending on whether a code fence sits inside a list item\n` +
        "  (a fence line indented four or more columns, or a closing fence indented less than its opening one).\n" +
        "  This reader does not track list nesting, so it refuses to guess. Fix: indent each fence's opening and\n" +
        "  closing lines alike, at most three spaces, in and before `## Files`.\n" +
        "  Nothing was written; .pharn/writes-scope.json is unchanged."
    );
  }
  if (top.start === -1) fail(`no \`## Files\` heading in ${file}`);
  return top.out;
}

function main() {
  const { mode, file, target, allowClaudeDir, allowPharnSurface, allowExecConfig, clear } = parseArgs(process.argv);

  // --clear is handled FIRST and returns, so it can never fall through into the scope-emitting path.
  if (clear) {
    if (mode || file || target) {
      fail(
        "--clear takes no other arguments (got: " +
          [mode, file, target ? `--target ${target}` : null].filter(Boolean).join(" ") +
          ")\n" +
          "  Why: clearing and setting a scope in one call is always a mistake. Run the set and the\n" +
          "       clear as separate calls — the set at a command's FIRST step, the clear at its LAST.\n" +
          "  Nothing was written; .pharn/writes-scope.json is unchanged."
      );
    }
    const scopePath = path.resolve(process.cwd(), ".pharn", "writes-scope.json");
    // Idempotent: an absent file is the SAME end state, not an error — a command's last step must be
    // safe to run twice, and safe to run after an early abort that never set a scope.
    let existed = false;
    try {
      fs.unlinkSync(scopePath);
      existed = true;
    } catch (e) {
      if (e && e.code !== "ENOENT") fail(`could not clear .pharn/writes-scope.json: ${e.message}`);
    }
    process.stdout.write(
      existed
        ? 'writes-scope cleared: .pharn/writes-scope.json removed -> the guard\'s default now applies (fail-closed, except in an installed project outside an open PHARN run — CLAUDE.md, "Writes-scope")\n'
        : 'writes-scope cleared: no active scope (already absent) -> the guard\'s default applies (fail-closed, except in an installed project outside an open PHARN run — CLAUDE.md, "Writes-scope")\n'
    );
    process.exit(0);
  }

  if (!mode || !file || (mode !== "--from-frontmatter" && mode !== "--from-plan")) {
    fail(
      "usage: set-writes-scope.cjs [--allow-claude-dir] [--allow-pharn-surface] [--allow-exec-config] (--from-frontmatter <file.md> [--target <path>] | --from-plan <PLAN.md>)\n" +
        "       set-writes-scope.cjs --clear"
    );
  }
  if (!fs.existsSync(file)) fail(`file not found: ${file}`);

  const raw = mode === "--from-frontmatter" ? writesFromFrontmatter(file) : pathsFromPlanFiles(file);
  const scope = raw
    .map((entry) => resolveEntry(entry, target))
    .filter((p) => p !== null)
    .filter(isConcrete);
  if (scope.length === 0) {
    if (mode === "--from-frontmatter") {
      fail(
        `no concrete \`writes:\` paths in ${file} (only placeholders/empties${target ? "" : " — pass --target for placeholder/glob entries"}) — use --from-plan`
      );
    }
    fail(`no back-tick paths under \`## Files\` in ${file}`);
  }

  // Refuse the guards' own control surface (fail-closed), LAYERED AFTER the empty-scope check above and
  // never replacing it. Deterministic exact membership over CONTROL_SURFACE (ARCHITECTURE §2 primitive #3)
  // — no model decides it. Nothing is written on this path.
  if (!allowClaudeDir) {
    const offenders = scope.filter((p) => CONTROL_SURFACE.includes(normalizeForTest(p)));
    if (offenders.length) {
      fail(
        `refusing to scope the write-guards' own control surface: ${offenders.join(", ")}\n` +
          `  Declared in : ${file}\n` +
          `  Why         : these files wire and implement the two pre-write guards; a scope over them lets a write disarm a guard on the next tool call (CONSTITUTION P2 — a declared file is untrusted input).\n` +
          `  If this increment genuinely edits a guard, re-run with --allow-claude-dir (an operator flag; no declared file can set it).\n` +
          `  Nothing was written; .pharn/writes-scope.json is unchanged.`
      );
    }
  }

  // Refuse PHARN's own installed surface from a plan, in an installed project (see the header). Layered after the
  // control-surface refusal; the dev checkout and an unsignalled tree never reach the membership test.
  if (mode === "--from-plan" && !allowPharnSurface && isPharnInstalledProject()) {
    const offenders = scope.filter(isReserved);
    if (offenders.length) {
      fail(
        `refusing to scope PHARN's own installed files from a plan: ${offenders.join(", ")}\n` +
          `  Declared in : ${file}\n` +
          `  Why         : this is an installed PHARN project (pharn.config.json has a skillsVersion); pharn/** (except pharn/features/**), .claude/** and pharn.config.json are PHARN's floor, guards, commands and config, which judge a run and instruct its later stages, and a plan is untrusted input (CONSTITUTION P2).\n` +
          `  If you genuinely mean to change one of them (your own .claude/ commands or skills included): edit it yourself, outside the agent, or re-run this setter yourself with --allow-pharn-surface placed BEFORE --from-plan (an operator flag; no plan can set it). To update PHARN itself, use \`pharn update\`.\n` +
          `  Nothing was written; .pharn/writes-scope.json is unchanged.`
      );
    }
  }

  // Refuse executable project config from a plan, in an installed project (see the header, ONE MORE REFUSAL). Layered
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

  // Refuse a promotion-origin scope while a /pharn-loop run is open (see the header). Every mode, every posture.
  if (PROMOTE_COMMANDS.map(toKey).includes(toKey(file))) {
    const open = openLoopRuns(process.cwd());
    if (open.length) {
      fail(
        `refusing a memory-bank promotion scope while a /pharn-loop run is open: ${file}\n` +
          open.map((l) => `  • ${l}`).join("\n") +
          "\n" +
          "  Why: an unattended /pharn-loop never promotes a lesson, and a scope with this origin is what unlocks a canon write (protect-trusted-paths.cjs). Promote after the run ends. NEVER close a run you are executing.\n" +
          "  Nothing was written; .pharn/writes-scope.json is unchanged."
      );
    }
  }

  const record = { scope, set_by: file, set_at: new Date().toISOString() };
  const dir = path.resolve(process.cwd(), ".pharn");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "writes-scope.json"), JSON.stringify(record, null, 2) + "\n");
  process.stdout.write(`writes-scope set: ${scope.length} path(s) from ${file} -> .pharn/writes-scope.json\n`);
  process.exit(0);
}

main();
