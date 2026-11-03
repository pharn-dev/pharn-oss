#!/usr/bin/env node
// .claude/hooks/set-writes-scope.cjs — the writes-scope SETTER (CONSTITUTION P0/P5, fix #7).
//
// Deterministic, non-LLM, stdlib-only. Reads a Capability/command's declared `writes:` (Mode A) or a
// PLAN.md's `## Files` list (Mode B) and writes `pharn/.run/writes-scope.json` = { scope, set_by, set_at }.
// The companion pre-write hook (enforce-writes-scope.cjs) reads that file and DENIES any write outside
// the scope, fail-closed to a default-safe-set when the file is absent. Scope is parsed deterministically
// from frontmatter / markdown — no model decides scope; that is what makes `writes:` floor-grade (P5).
//
// Usage (run as a command's FIRST step, before any write):
//   node .claude/hooks/set-writes-scope.cjs --from-frontmatter <capability-or-command.md> [--target <path>]
//   node .claude/hooks/set-writes-scope.cjs --from-plan <PLAN.md>
//   node .claude/hooks/set-writes-scope.cjs [--allow-claude-dir] [--allow-pharn-surface] [--allow-exec-config] [--allow-instruction-files] --from-plan <PLAN.md>
//                                                 # the four operator opt-ins, BEFORE the mode (see OPERATOR FLAGS)
//   node .claude/hooks/set-writes-scope.cjs --check --from-plan <PLAN.md>
//                                                 # every parse and refusal, NOTHING written (see CHECK, 7.3.0)
//   node .claude/hooks/set-writes-scope.cjs --clear   # run as a command's LAST step, after every write
//
// --clear DELETES pharn/.run/writes-scope.json, returning enforce-writes-scope.cjs to its DEFAULT. Since
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
//       `pharn/.run/**` — stricter than the stale scope this flag exists to remove. Deleting the file is
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
//     `--from-plan` scope may not name `pharn/**` except `pharn/features/**` and `pharn/.run/**`, `.claude/**` or `pharn.config.json`:
//     the set enforce-writes-scope.cjs already reserves outside a run, matched by byte-equal copies of its
//     `toKey()` / `isReserved()`. Those are PHARN's floor, guards, commands and config — what judges a run and
//     instructs its later stages — and before this a model-written PLAN could scope a floor script that a
//     pre-approved `/pharn-loop` line then ran. --allow-pharn-surface opts back in (an operator flag). The dev
//     checkout and an unsignalled tree were unchanged until 7.3.0 (below: refused there while a product run is open);
//     `--from-frontmatter` is unchanged.
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
//     not scope it. --allow-exec-config opts back in (an operator flag, independent of the others). Since
//     7.3.0 the class is refused in every posture (below); `--from-frontmatter` is unchanged. The reading described
//     next is the INSTALLED posture's; a dev or unsignalled tree reads the same files best-effort.
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
// 7.3.0 (plan-scope-hardening — review of 2026-11-03: a self-approved plan scoped the floor and CI in this checkout,
// and canon in every posture; then an adversarial review of the first patch). Five changes to the `--from-plan`
// refusals, each writing nothing; `--from-frontmatter` is unchanged:
//   • NOT A PLAIN PROJECT-RELATIVE PATH, every posture, no opt-in. An entry holding a quote, a back-tick, a backslash
//     or a control character is refused, and so is one that — whole, or in any whitespace-separated token — is
//     absolute, climbs out of the project once `..` is collapsed, or is led by `-`: every refusal below tests the
//     relative spelling, so `<abs root>/.dev/memory-bank/…` passed them all and the Step 2b formatter pass rewrote
//     canon through it, and `src/a.js --plugin=./evil.mjs` reached that pass as two arguments and loaded the plugin
//     (adversarial reviews of the first two patches). A path with plain spaces is still scoped.
//   • CANON, every posture, no opt-in. A plan may not name memory-bank canon (CANON_SUBTREES, a set-equal copy of
//     protect-trusted-paths.cjs's PROTECTED_SUBTREES, ✧-pinned). protect-trusted-paths.cjs already denies the Write, but
//     a scope holding canon reached a Bash formatter pass (`/pharn-dev-build` Step 2b rewrote canon — probe D). The route
//     to canon is the promote command's own `--from-frontmatter` scope.
//   • EXECUTABLE PROJECT CONFIG, every posture. The class gains `.github/actions/**` and the file `.mcp.json` (Claude Code
//     starts the servers it names at the next session). In a dev or unsignalled tree the fixed set is refused and every
//     `core.hooksPath` that could be read is added best-effort: there an unreadable git config file is skipped, never a
//     refusal (a worktree or odd layout must not halt every self-hosting build). An installed project keeps the
//     fail-closed reading below.
//   • PHARN'S OWN SURFACE and INSTRUCTION FILES while a product run is open. In a dev or unsignalled tree, while a
//     `/pharn-loop` or `/pharn-ship` run marker is open (`pharn/.run/<pharn-loop|pharn-ship>/<name>/active.json`, under
//     24 h — the scan the promotion-origin refusal performs), the installed project's refusal of PHARN's own surface
//     applies, and so does the instruction-file refusal: a product run's plan is model-written, and in this checkout it
//     could otherwise scope the floor that judges the run. With no marker open, a dev build scopes `pharn/floor/**` and
//     `.claude/commands/**` as before — self-hosting.
//   • INSTRUCTION FILES, installed (and as above). A plan may not name a file Claude Code or another agent loads as
//     standing instructions: basename `CLAUDE.md`, `CLAUDE.local.md` or `AGENTS.md`, at any depth, case-folded.
//     --allow-instruction-files opts back in.
//
// OPERATOR FLAGS (loop-scope-hardening). --allow-claude-dir, --allow-pharn-surface, --allow-exec-config and
// --allow-instruction-files (7.3.0), and --check (7.3.0), are honored only BEFORE the mode; one placed after `--from-plan` /
// `--from-frontmatter` is refused. A pre-approved command line (a `/pharn-*` command's `allowed-tools`) carries a `*` after
// its mode, and `*` matches any text, so an opt-in accepted after the mode could ride on a pre-approved line (and a
// `--check` there would turn a build's scope-set into a no-op that leaves an older scope standing).
//
// CHECK (7.3.0). `--check` runs every parse and every refusal and writes NOTHING: exit 0 prints how many paths the plan
// would scope, exit 1 is the refusal a build's Step 0 would meet. The two plan commands run it on the PLAN they just
// wrote, so a refusal surfaces at plan time instead of at the build. It refuses to combine with --clear.
//
// FENCED CODE (loop-scope-hardening — review finding ENF-1). Mode B never reads a fenced code block: a fenced `## Files` is not
// the list, and fenced lines under the list are not paths. This reader does not track list nesting, so it reads
// the plan two ways — a fence line counts only at 0–3 spaces (CommonMark's top-level rule), and a fence line counts
// at any indentation with a bare closer indented less than its opener ending that block and opening another (what
// happens when a list item ends under a fence) — and refuses when the two lists differ, rather than guess.
// pharn/floor/plan-files-core.mjs holds the same rule; ★ PARITY tests run both over shared fixtures.
//
// LINE ENDINGS, HTML COMMENTS AND BLOCKS, ONE `## Files`, ONE CONTIGUOUS LIST (7.3.0). Lines split on `\r\n`, `\r` or
// `\n`. A comment block (a line beginning `<!--`, through the first line containing `-->`) is never read; an inline
// comment closed on its own line is cut; an unclosed inline `<!--` is literal text. A raw HTML block other than a
// comment inside `## Files` refuses. A second visible `## Files` refuses. The path items form one contiguous list: any
// other line between two items (a label in any spelling, a blockquote, a non-path bullet, a setext underline, an
// indented paragraph after a blank line) refuses, naming both lines. `scanLines` and `commentStart` are byte-equal
// copies of plan-files-core.mjs's (✧-pinned); that file's header states the rules and their bounds, probed against
// markdown-it.
//
// HONEST BOUND (P0): these tests are LEXICAL. Entries are normalized for the comparison (`./`, `a/../`,
// backslashes, case, Unicode, trailing dots/spaces) but never realpath-resolved, so a symlink declared in
// `## Files` that resolves onto a protected file is NOT caught here. Defense in depth, in order: these refusals
// are the loud EARLY failure at declaration time; enforce-writes-scope.cjs realpaths the write target and
// denies it as out of scope; and protect-trusted-paths.cjs realpaths and denies the control files outright
// regardless of any scope. This refusal buys a clear early failure — it is not the last line of defense. Every
// refusal here is also an argv/marker reading by a Bash-run program: an agent holding Bash can pass an opt-in,
// delete a marker, or write the scope record itself (pharn/LIMITS.md §6). And the `## Files` reader is NOT a
// CommonMark parser: an indented code block, an HTML block other than a comment, a setext heading and a `*`/`+`
// bullet are read as their lines look, not as a renderer shows them.

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
  let allowInstructionFiles = false;
  let check = false;
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
    } else if (
      a === "--allow-claude-dir" ||
      a === "--allow-pharn-surface" ||
      a === "--allow-exec-config" ||
      a === "--allow-instruction-files" ||
      a === "--check"
    ) {
      // Its OWN branch, ahead of the positional fallbacks — otherwise the flag is consumed as the
      // positional `mode` or `file` and silently breaks --from-plan / --from-frontmatter parsing. And only
      // BEFORE the mode (see OPERATOR FLAGS in the header).
      if (mode) {
        fail(
          `${a} must come BEFORE the mode (--from-plan / --from-frontmatter), never after it\n` +
            "  Why: a pre-approved command line carries a wildcard after its mode, so an opt-in accepted there could ride on it.\n" +
            "  Nothing was written; pharn/.run/writes-scope.json is unchanged."
        );
      }
      if (a === "--allow-claude-dir") allowClaudeDir = true;
      else if (a === "--allow-pharn-surface") allowPharnSurface = true;
      else if (a === "--allow-exec-config") allowExecConfig = true;
      else if (a === "--allow-instruction-files") allowInstructionFiles = true;
      else check = true;
    } else if (!mode) {
      mode = a;
    } else if (!file) {
      file = a;
    } else {
      fail(`unexpected argument: ${a}`);
    }
  }
  return { mode, file, target, allowClaudeDir, allowPharnSurface, allowExecConfig, allowInstructionFiles, check, clear };
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

// Memory-bank canon (7.3.0) — a set-equal copy of protect-trusted-paths.cjs's PROTECTED_SUBTREES, pinned by a ✧ test.
// A `--from-plan` entry at or under one of them is refused in every posture (see the header).
const CANON_SUBTREES = ["pharn/memory-bank", ".dev/memory-bank"];

// The instruction files (7.3.0): basenames, case-folded, at any depth (see the header).
const INSTRUCTION_FILES = ["claude.md", "claude.local.md", "agents.md"];

// True iff `rel` (a plan entry, root-relative as written) is at or under a canon subtree.
function isCanon(rel) {
  const key = toKey(rel);
  return CANON_SUBTREES.some((s) => key === toKey(s) || key.startsWith(toKey(s) + "/"));
}

// True iff `rel` (a plan entry as written) is not a plain project-relative path (7.3.0 — see the header): it holds a
// quote, a back-tick, a backslash or a control character (C0, DEL; NUL included), or it — or any whitespace-separated
// token of it — is absolute (POSIX, a Windows drive), climbs out of the project once `..` is collapsed, or is led by
// `-`. Tokens are tested too because a tool fed the scope file through a shell may split an entry at its spaces.
function notProjectRelative(rel) {
  const s = String(rel);
  if (/['"`\\]/.test(s) || [...s].some((c) => c.charCodeAt(0) < 0x20 || c.charCodeAt(0) === 0x7f)) return true;
  const bad = (t) => {
    if (t.startsWith("/") || /^[A-Za-z]:/.test(t) || t.startsWith("-")) return true;
    const n = path.posix.normalize(t);
    return n === ".." || n.startsWith("../");
  };
  return bad(s.trim()) || s.split(/\s+/).filter(Boolean).some(bad);
}

// True iff `rel`'s last segment is an instruction file.
function isInstructionFile(rel) {
  return INSTRUCTION_FILES.includes(toKey(rel).split("/").pop());
}

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
  if (key.startsWith("pharn/") && !rel.startsWith("pharn/features/") && !rel.startsWith("pharn/.run/")) return true;
  return false;
}

// ============================== EXECUTABLE PROJECT CONFIG (see the header, ONE MORE REFUSAL) ==================
// The two directories reserved by name. Every `core.hooksPath` inside the project is added by execConfigDirKeys().
// `.github/actions` joined in 7.3.0: GitHub runs a local action with the calling workflow's token and secrets.
const EXEC_CONFIG_DIRS = [".github/workflows", ".github/actions", ".husky"];
// The files reserved by name (7.3.0): `.mcp.json` names the MCP server commands Claude Code starts next session.
const EXEC_CONFIG_FILES = [".mcp.json"];

// True iff `rel` (a plan entry, root-relative as written) is an EXEC_CONFIG_FILES entry or lies in one of `dirKeys`
// (toKey()-folded, root-relative). "" is the project root itself, which reserves its top-level entries only: git runs a
// hook from that directory, never from below it.
function isExecConfig(rel, dirKeys) {
  const key = toKey(rel);
  if (EXEC_CONFIG_FILES.includes(key)) return true;
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

// The open runs at `root` in the named state directories (`pharn-loop`, and since 7.3.0 `pharn-ship`), read the way
// enforce-writes-scope.cjs `scanRuns()` reads them — presence and age only, never parsed — but read-only (no mtime
// refresh). Returns the lines a refusal prints: one per open marker, and one per place the scan could not rule an open
// run out (fail-closed).
const RUN_AGE_CEILING_MS = 24 * 60 * 60 * 1000;
const RUN_NAME_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const RUN_CLOSE = {
  "pharn-loop": (name) => `when no loop is running, close it: node .claude/hooks/require-loop-record.cjs --close ${name}`,
  "pharn-ship": (name) => `when no /pharn-ship run is in progress, close it: node pharn/floor/run-marker.mjs --close pharn-ship ${name}`,
};
function openRuns(root, dirs) {
  const lines = [];
  for (const dir of dirs) lines.push(...openRunsIn(root, dir));
  return [...new Set(lines)];
}
function openLoopRuns(root) {
  return openRunsIn(root, "pharn-loop");
}
function openRunsIn(root, dir) {
  const lines = [];
  const unreadable = (where) =>
    lines.push(
      `${where} — not a readable run-state entry, so an open run cannot be ruled out; if no loop is running, repair or remove it by hand`
    );
  // Both segments of the scratch root (7.0.0): a link at `pharn` reaches `pharn/.run` unseen.
  for (const seg of ["pharn", "pharn/.run"]) {
    try {
      if (fs.lstatSync(path.join(root, seg)).isSymbolicLink()) {
        unreadable(`${seg} (a symbolic link)`);
        return lines;
      }
    } catch (e) {
      if (!e || e.code !== "ENOENT") unreadable(seg);
      return lines;
    }
  }
  const stateDir = path.join(root, "pharn", ".run", dir);
  let st;
  try {
    st = fs.lstatSync(stateDir);
  } catch (e) {
    if (!e || e.code !== "ENOENT") unreadable(`pharn/.run/${dir}`);
    return lines;
  }
  let names;
  try {
    if (!st.isDirectory()) throw new Error("not a directory");
    names = fs.readdirSync(stateDir);
  } catch {
    unreadable(`pharn/.run/${dir}`);
    return lines;
  }
  for (const name of names) {
    const shown = RUN_NAME_RE.test(name)
      ? `pharn/.run/${dir}/${name}/active.json`
      : `a marker under pharn/.run/${dir}/ whose directory name is not a plain slug`;
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
        ? `${shown} — ${RUN_CLOSE[dir](name)}`
        : `${shown} — when no ${dir === "pharn-loop" ? "loop" : "run"} is running, remove it by hand`
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

// CommonMark's three line endings (7.3.0): a lone CR ends a line too, so it cannot fold a heading into the line before.
const LINE_SPLIT_RE = /\r\n|\r|\n/;

// Index of the first `<!--` in `s` outside a back-tick code span and not backslash-escaped, else -1. A run of n
// back-ticks opens a span only when a later run of exactly n back-ticks on the same line closes it (CommonMark);
// otherwise it is literal. A byte-equal copy of plan-files-core.mjs's, pinned by a ✧ test.
function commentStart(s) {
  for (let i = 0; i < s.length;) {
    if (s[i] === "\\") {
      i += 2;
      continue;
    }
    if (s[i] === "`") {
      let n = 0;
      while (s[i + n] === "`") n++;
      let close = -1;
      for (let j = i + n; j < s.length;) {
        if (s[j] !== "`") {
          j++;
          continue;
        }
        let m = 0;
        while (s[j + m] === "`") m++;
        if (m === n) {
          close = j;
          break;
        }
        j += m;
      }
      i = close === -1 ? i + n : close + n;
      continue;
    }
    if (s.startsWith("<!--", i)) return i;
    i++;
  }
  return -1;
}

// Per line, `{ fenced, comment, text }` under one of the two readings (see the header): `fenced` — a fence line
// itself, or a line inside an open fence; `comment` — a line of an HTML comment block (from a line beginning `<!--`
// through the first line containing `-->`); `text` — the line with every inline comment closed on that line cut out.
// A byte-equal copy of plan-files-core.mjs's, pinned by a ✧ test.
function scanLines(lines, nested = false) {
  const out = [];
  let fence = null; // { char, len, indent } while a fenced block is open
  let block = false; // while an HTML comment block is open
  for (const line of lines) {
    if (block) {
      if (line.includes("-->")) block = false;
      out.push({ fenced: false, comment: true, text: line, unclosed: false });
      continue;
    }
    const f = line.match(FENCE_LINE_RE);
    if (f && !(f[2][0] === "`" && f[3].includes("`")) && (nested || /^ {0,3}$/.test(f[1]))) {
      const char = f[2][0];
      const closes = fence !== null && char === fence.char && f[2].length >= fence.len && f[3].trim() === "";
      if (fence === null) fence = { char, len: f[2].length, indent: f[1].length };
      else if (closes && (!nested || f[1].length >= fence.indent)) fence = null;
      else if (closes) fence = { char, len: f[2].length, indent: f[1].length }; // a list item ended; a new block opens
      out.push({ fenced: true, comment: false, text: line, unclosed: false });
      continue;
    }
    if (fence !== null) {
      out.push({ fenced: true, comment: false, text: line, unclosed: false });
      continue;
    }
    if (/^ {0,3}<!--/.test(line)) {
      // A comment block (CommonMark HTML block type 2) ends at the first line containing `-->`, this one included.
      if (!line.includes("-->")) block = true;
      out.push({ fenced: false, comment: true, text: line, unclosed: false });
      continue;
    }
    let text = "";
    let rest = line;
    for (;;) {
      const s = commentStart(rest);
      const e = s === -1 ? -1 : rest.indexOf("-->", s + 2); // from the opener's third character: `<!-->` closes at once
      if (e === -1) {
        text += rest; // no opener, or one left unclosed on this line: literal text
        break;
      }
      text += rest.slice(0, s);
      rest = rest.slice(e + 3);
    }
    // An opener left open on this line: literal text here, flagged for the `## Files` reader to refuse.
    out.push({ fenced: false, comment: false, text, unclosed: commentStart(rest) !== -1 });
  }
  return out;
}

// A line that starts a raw HTML block other than a comment (CommonMark types 1, 3–7) — refused inside `## Files`.
const HTML_BLOCK_RE = /^ {0,3}<(?:[A-Za-z]|\/|\?|![A-Za-z]|!\[CDATA\[)/;

// The columns of a path item's marker and of its text (a tab advances to the next multiple of 4), or null when `line`
// is not a path item: `-`, then spaces or tabs only (never another whitespace character, such as a no-break space),
// then a back-tick path. A byte-equal copy of plan-files-core.mjs's, pinned by a ✧ test.
function pathItemColumns(line) {
  const m = /^([ \t]*)-([ \t]+)`[^`]+`/.exec(line);
  if (!m) return null;
  let col = 0;
  for (const c of m[1]) col = c === "\t" ? col + 4 - (col % 4) : col + 1;
  const indent = col;
  const start = col + 1;
  col = start;
  for (const c of m[2]) col = c === "\t" ? col + 4 - (col % 4) : col + 1;
  return { indent, content: col - start > 4 ? start + 1 : col };
}

// --- Mode B: the leading back-tick path of each list item under the ONE `## Files` (see the header, 7.3.0). The
// items form ONE contiguous list: prose before the first item and after the last, and between two items only blank
// lines and the current item's own wrapped continuation. Any other line after the first item ends the list, and a
// later path item refuses (a nested item right under a wrapped continuation too). A heading ends the section
// (Boundary 1 — an exclusion subsection like `### Explicitly not touched` is its own heading, so its paths are never
// scanned); the exclusion cue (Boundary 2) ends the list before the first item as well, with no blockquote counting
// as a cue there. Before 7.3.0 this comment said a path under an exclusion intro never enters scope "however the
// exclusion is worded"; that held only for the cue's own words (review 2026-11-03), and the first patch's colon rule
// held only for a trailing ASCII colon (adversarial review of that patch). Residual: an inline-marked item
// (`- `path` — not touched`) IS a path-item, so it is NOT detected; an intro before the first item is prose unless it
// uses a cue word. Fenced code and HTML comment blocks are never read: `readPlanFiles` is ONE reading, `nested`
// choosing how a fence line is recognized, and `pathsFromPlanFiles` refuses when the two readings differ. ---
//
// The wrapped-continuation exemption (L28) is deliberately NARROW: only a line that continues an OPEN path-item's
// own text — an indented, non-blank line with NO intervening blank line since that item began. A blank line closes
// the item's body, so an indented paragraph or label after one ends the list. A LAZY continuation (an UNINDENTED line
// continuing an item's paragraph, which markdown permits) is not exempt either; Prettier indents continuations in
// every PLAN in this repo, so the lazy form does not arise here, and where it does the reader refuses rather than
// guessing.
function readPlanFiles(lines, nested) {
  const scanned = scanLines(lines, nested);
  let start = -1;
  let inSection = false; // from the `## Files` heading to the next heading
  let seenItem = false;
  let stop = -1; // the first line that ended the contiguous list (a path item after it refuses)
  let refusal = null;
  let lastItemIndent = -1;
  let lastItemContent = 0; // the previous path item's text column (0 before the first item)
  let lastKind = null; // the last non-blank list line: "item" or "continuation"
  let lastIdx = -1;
  const out = [];
  let inPathItemBody = false;
  for (let i = 0; i < lines.length; i++) {
    const { fenced, comment, text: line, unclosed } = scanned[i];
    if (fenced || comment) {
      // Fenced code and comment blocks are never a heading, an item or a list break — but a blank fenced line still
      // closes an item's body, so the wrapped-continuation exemption never widens.
      if (fenced && inSection && !line.trim()) inPathItemBody = false;
      continue;
    }
    // ONE `## Files` (7.3.0): a second visible heading anywhere in the file refuses — the reader never picks one.
    if (/^##\s+Files\b/.test(line)) {
      if (start === -1) {
        start = i;
        inSection = true;
        continue;
      }
      refusal = { kind: "second-heading", lines: [start + 1, i + 1] };
      break;
    }
    if (!inSection) continue;
    // Boundary 1 — STRUCTURAL: a heading of any level ends the section.
    if (/^\s{0,3}#{1,6}\s/.test(line)) {
      inSection = false;
      continue;
    }
    if (HTML_BLOCK_RE.test(line)) {
      refusal = { kind: "html-block", lines: [i + 1, i + 1] };
      break;
    }
    // An inline `<!--` left open on its line: literal to this reader, but a renderer may hide what follows (fail loud).
    if (unclosed) {
      refusal = { kind: "unclosed-comment", lines: [i + 1, i + 1] };
      break;
    }
    const cols = pathItemColumns(line);
    if (cols) {
      if (stop !== -1) {
        refusal = { kind: "split-list", lines: [stop + 1, i + 1] };
        break;
      }
      if (lastKind === "continuation" && cols.indent > lastItemIndent) {
        refusal = { kind: "split-list", lines: [lastIdx + 1, i + 1] }; // a nested item under a wrapped line
        break;
      }
      // Four or more columns past the previous item's text (or at the margin, before the first item) is code or lazy
      // paragraph text to a renderer, never a list item.
      if (cols.indent >= lastItemContent + 4) {
        refusal = { kind: "indented-item", lines: [i + 1, i + 1] };
        break;
      }
      seenItem = true;
      inPathItemBody = true;
      lastItemIndent = cols.indent;
      lastItemContent = cols.content;
      lastKind = "item";
      lastIdx = i;
      out.push(line.match(/^[ \t]*-[ \t]+`([^`]+)`/)[1].trim());
      continue;
    }
    if (!line.trim()) {
      inPathItemBody = false;
      continue;
    }
    // An indented line while a path item's body is still open (no blank line since the item) is its own wrapped text.
    if (inPathItemBody && /^[ \t]+\S/.test(line)) {
      lastKind = "continuation";
      lastIdx = i;
      continue;
    }
    // Any other line ends the list after the first item; before it, only the exclusion cue does (a blockquote is
    // commentary there, never a cue). `\W*` (not `\s+`) in the cue tolerates markup, e.g. `**not** touched`.
    if (
      stop === -1 &&
      (seenItem ||
        (!/^\s*>/.test(line) &&
          /\bnot\W*(touch|writ|modif|edit|chang)|\bexplicitly\W*excluded|\bout\W*of\W*scope|\boff\W*limits/i.test(line)))
    )
      stop = i;
  }
  return { start, out, refusal };
}

function pathsFromPlanFiles(file) {
  const lines = fs.readFileSync(file, "utf8").split(LINE_SPLIT_RE);
  const top = readPlanFiles(lines, false);
  if (JSON.stringify(top) !== JSON.stringify(readPlanFiles(lines, true))) {
    fail(
      `the \`## Files\` list in ${file} reads differently depending on whether a code fence sits inside a list item\n` +
        "  (a fence line indented four or more columns, or a closing fence indented less than its opening one).\n" +
        "  This reader does not track list nesting, so it refuses to guess. Fix: indent each fence's opening and\n" +
        "  closing lines alike, at most three spaces, in and before `## Files`.\n" +
        "  Nothing was written; pharn/.run/writes-scope.json is unchanged."
    );
  }
  const r = top.refusal;
  if (r && r.kind === "second-heading") {
    fail(
      `${file} has more than one \`## Files\` heading (lines ${r.lines[0]} and ${r.lines[1]})\n` +
        "  This reader refuses to pick one. Fix: keep one `## Files` section, and give any other path list a different heading.\n" +
        "  Nothing was written; pharn/.run/writes-scope.json is unchanged."
    );
  }
  if (r && r.kind === "html-block") {
    fail(
      `line ${r.lines[0]} under \`## Files\` in ${file} starts a raw HTML block, which can hide lines from a rendered PLAN\n` +
        "  This reader refuses to guess what a renderer shows. Fix: remove it; write the list as plain markdown.\n" +
        "  Nothing was written; pharn/.run/writes-scope.json is unchanged."
    );
  }
  if (r && r.kind === "unclosed-comment") {
    fail(
      `line ${r.lines[0]} under \`## Files\` in ${file} opens an HTML comment it does not close, which can hide the lines after it from a rendered PLAN\n` +
        "  This reader refuses to guess what a renderer shows. Fix: close the comment on the same line, or remove it.\n" +
        "  Nothing was written; pharn/.run/writes-scope.json is unchanged."
    );
  }
  if (r && r.kind === "indented-item") {
    fail(
      `line ${r.lines[0]} under \`## Files\` in ${file} is a path item indented four or more columns past the previous item's text (or at the margin, before the first item)\n` +
        "  A renderer shows such a line as code or paragraph text, not a list item, so this reader refuses to scope it.\n" +
        "  Fix: indent it at most to the previous item's text column.\n" +
        "  Nothing was written; pharn/.run/writes-scope.json is unchanged."
    );
  }
  if (r) {
    fail(
      `line ${r.lines[0]} under \`## Files\` in ${file} interrupts the path list and a path item follows it (line ${r.lines[1]})\n` +
        "  This reader cannot tell what that line says about the items after it (a group label, or an exclusion), so it refuses to guess.\n" +
        "  Fix: write ONE contiguous list with no labels or prose between items, and put excluded paths under a `### …` heading after the list.\n" +
        "  Nothing was written; pharn/.run/writes-scope.json is unchanged."
    );
  }
  if (top.start === -1) fail(`no \`## Files\` heading in ${file}`);
  return top.out;
}

function main() {
  const { mode, file, target, allowClaudeDir, allowPharnSurface, allowExecConfig, allowInstructionFiles, check, clear } = parseArgs(
    process.argv
  );

  // --clear is handled FIRST and returns, so it can never fall through into the scope-emitting path.
  if (clear) {
    if (mode || file || target || check) {
      fail(
        "--clear takes no other arguments (got: " +
          [check ? "--check" : null, mode, file, target ? `--target ${target}` : null].filter(Boolean).join(" ") +
          ")\n" +
          "  Why: clearing and setting a scope in one call is always a mistake. Run the set and the\n" +
          "       clear as separate calls — the set at a command's FIRST step, the clear at its LAST.\n" +
          "  Nothing was written; pharn/.run/writes-scope.json is unchanged."
      );
    }
    const scopePath = path.resolve(process.cwd(), "pharn", ".run", "writes-scope.json");
    // Idempotent: an absent file is the SAME end state, not an error — a command's last step must be
    // safe to run twice, and safe to run after an early abort that never set a scope.
    let existed = false;
    try {
      fs.unlinkSync(scopePath);
      existed = true;
    } catch (e) {
      if (e && e.code !== "ENOENT") fail(`could not clear pharn/.run/writes-scope.json: ${e.message}`);
    }
    process.stdout.write(
      existed
        ? 'writes-scope cleared: pharn/.run/writes-scope.json removed -> the guard\'s default now applies (fail-closed, except in an installed project outside an open PHARN run — CLAUDE.md, "Writes-scope")\n'
        : 'writes-scope cleared: no active scope (already absent) -> the guard\'s default applies (fail-closed, except in an installed project outside an open PHARN run — CLAUDE.md, "Writes-scope")\n'
    );
    process.exit(0);
  }

  if (!mode || !file || (mode !== "--from-frontmatter" && mode !== "--from-plan")) {
    fail(
      "usage: set-writes-scope.cjs [--check] [--allow-claude-dir] [--allow-pharn-surface] [--allow-exec-config] [--allow-instruction-files] (--from-frontmatter <file.md> [--target <path>] | --from-plan <PLAN.md>)\n" +
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
          `  Nothing was written; pharn/.run/writes-scope.json is unchanged.`
      );
    }
  }

  // Refuse an entry that is not a plain project-relative path, in EVERY posture, with no opt-in (7.3.0 — see the header):
  // an absolute path or one that climbs out with `..` passes every refusal below, which judge the relative spelling, and
  // a Bash formatter pass then writes it; a leading `-` would be read as a flag by the tools the scope file is fed to.
  if (mode === "--from-plan") {
    const offenders = scope.filter(notProjectRelative);
    if (offenders.length) {
      fail(
        `refusing to scope, from a plan, entries that are not plain project-relative paths: ${offenders.join(", ")}\n` +
          `  Declared in : ${file}\n` +
          "  Why         : an absolute path, or one that climbs out of the project with `..`, is judged by none of the refusals that follow (each tests the project-relative spelling) and reaches the formatter passes that read the scope file; an entry or a space-separated part of one led by `-` would be read as a flag by them, and a quote, a backslash or a control character changes how a shell splits it. A plan is untrusted input (CONSTITUTION P2).\n" +
          "  Fix: name the file by its plain path relative to the project root — no quotes, backslashes or control characters, no `..` that leaves the project, no part starting with `-`. No opt-in opens this.\n" +
          "  Nothing was written; pharn/.run/writes-scope.json is unchanged."
      );
    }
  }

  // Refuse memory-bank canon from a plan, in EVERY posture, with no opt-in (7.3.0 — see the header). Layered after the
  // control-surface refusal. toKey() collapses `..`, so `pharn/features/../memory-bank/x` is judged as canon.
  if (mode === "--from-plan") {
    const offenders = scope.filter(isCanon);
    if (offenders.length) {
      fail(
        `refusing to scope memory-bank canon from a plan: ${offenders.join(", ")}\n` +
          `  Declared in : ${file}\n` +
          "  Why         : canon (pharn/memory-bank/**, .dev/memory-bank/**) changes only through the gated promotion, and a plan is untrusted input (CONSTITUTION P2); a plan-sourced scope over canon also reaches the formatter passes that read the scope file.\n" +
          "  To change canon, run the promote command (/pharn-memory-promote or /pharn-dev-memory-promote), which sets its own scope after its own human gate, or edit it yourself, outside the agent. No opt-in opens canon to a plan.\n" +
          "  Nothing was written; pharn/.run/writes-scope.json is unchanged."
      );
    }
  }

  // The posture, and — in a dev or unsignalled tree — the open product runs, read only when a refusal needs them.
  const installed = mode === "--from-plan" && isPharnInstalledProject();
  let runsCache = null;
  const productRuns = () => (runsCache = runsCache || openRuns(process.cwd(), ["pharn-loop", "pharn-ship"]));
  const runLines = () =>
    productRuns()
      .map((l) => `  • ${l}`)
      .join("\n") + "\n";

  // Refuse PHARN's own surface from a plan: in an installed project (see the header), and since 7.3.0 in a dev or
  // unsignalled tree while a /pharn-loop or /pharn-ship run is open. Layered after the canon refusal.
  if (mode === "--from-plan" && !allowPharnSurface) {
    // Judged as written AND with `..` collapsed: the two raw-prefix exemptions (`pharn/features/`, `pharn/.run/`)
    // must not be a way past this refusal (`pharn/.run/../floor/x.mjs`). Only ever adds refusals.
    const offenders = scope.filter((p) => isReserved(p) || isReserved(path.posix.normalize(String(p).replace(/\\/g, "/"))));
    if (offenders.length && installed) {
      fail(
        `refusing to scope PHARN's own installed files from a plan: ${offenders.join(", ")}\n` +
          `  Declared in : ${file}\n` +
          `  Why         : this is an installed PHARN project (pharn.config.json has a skillsVersion); pharn/** (except pharn/features/** and pharn/.run/**), .claude/** and pharn.config.json are PHARN's floor, guards, commands and config, which judge a run and instruct its later stages, and a plan is untrusted input (CONSTITUTION P2).\n` +
          `  If you genuinely mean to change one of them (your own .claude/ commands or skills included): edit it yourself, outside the agent, or re-run this setter yourself with --allow-pharn-surface placed BEFORE --from-plan (an operator flag; no plan can set it). To update PHARN itself, use \`pharn update\`.\n` +
          `  Nothing was written; pharn/.run/writes-scope.json is unchanged.`
      );
    }
    if (offenders.length && productRuns().length) {
      fail(
        `refusing to scope PHARN's own files from a plan while a /pharn-loop or /pharn-ship run is open: ${offenders.join(", ")}\n` +
          runLines() +
          `  Declared in : ${file}\n` +
          "  Why         : a product run's plan is model-written, and pharn/** (except pharn/features/** and pharn/.run/**), .claude/** and pharn.config.json are the floor, guards, commands and config that judge that run (CONSTITUTION P2).\n" +
          "  If no such run is in progress, close the marker named above and re-run; if you genuinely mean to change one of them during a run, edit it yourself, outside the agent, or re-run this setter yourself with --allow-pharn-surface placed BEFORE --from-plan (an operator flag; no plan can set it). NEVER close a run you are executing.\n" +
          "  Nothing was written; pharn/.run/writes-scope.json is unchanged."
      );
    }
  }

  // Refuse the instruction files from a plan (7.3.0): in an installed project, and in a dev or unsignalled tree while a
  // /pharn-loop or /pharn-ship run is open. Layered after the PHARN-surface refusal.
  if (mode === "--from-plan" && !allowInstructionFiles) {
    const offenders = scope.filter(isInstructionFile);
    const why =
      "CLAUDE.md, CLAUDE.local.md and AGENTS.md (at any depth) are loaded as standing instructions by later sessions, so a line a plan puts there steers every later run, and a plan is untrusted input (CONSTITUTION P2).";
    if (offenders.length && installed) {
      fail(
        `refusing to scope instruction files from a plan: ${offenders.join(", ")}\n` +
          `  Declared in : ${file}\n` +
          `  Why         : this is an installed PHARN project (pharn.config.json has a skillsVersion); ${why}\n` +
          "  If you genuinely mean to change one of them: edit it yourself, outside the agent, or re-run this setter yourself with --allow-instruction-files placed BEFORE --from-plan (an operator flag; no plan can set it).\n" +
          "  Nothing was written; pharn/.run/writes-scope.json is unchanged."
      );
    }
    if (offenders.length && productRuns().length) {
      fail(
        `refusing to scope instruction files from a plan while a /pharn-loop or /pharn-ship run is open: ${offenders.join(", ")}\n` +
          runLines() +
          `  Declared in : ${file}\n` +
          `  Why         : a product run's plan is model-written; ${why}\n` +
          "  If no such run is in progress, close the marker named above and re-run; if you genuinely mean to change one of them during a run, edit it yourself, outside the agent, or re-run this setter yourself with --allow-instruction-files placed BEFORE --from-plan (an operator flag; no plan can set it). NEVER close a run you are executing.\n" +
          "  Nothing was written; pharn/.run/writes-scope.json is unchanged."
      );
    }
  }

  // Refuse executable project config from a plan (see the header, ONE MORE REFUSAL), in every posture since 7.3.0.
  // Layered after the instruction-file refusal. `core.hooksPath` is read fail-closed in an installed project and
  // best-effort elsewhere: in a dev or unsignalled tree a git config file that cannot be read is skipped.
  if (mode === "--from-plan" && !allowExecConfig) {
    const { values, errors, top } = readHooksPathValues(process.cwd());
    if (installed && errors.length) {
      fail(
        "refusing to scope from a plan: the git configuration that says where git hooks run could not be read\n" +
          errors.map((l) => `  • ${l}`).join("\n") +
          "\n" +
          `  Declared in : ${file}\n` +
          "  Why         : this is an installed PHARN project (pharn.config.json has a skillsVersion), where a plan may not scope a git hooks directory (core.hooksPath), and without these files the setter cannot tell which directory that is.\n" +
          "  Fix: make each file above a readable regular file, or remove it; or re-run this setter yourself with --allow-exec-config placed BEFORE --from-plan (an operator flag; no plan can set it).\n" +
          "  Nothing was written; pharn/.run/writes-scope.json is unchanged."
      );
    }
    const dirKeys = execConfigDirKeys(process.cwd(), top, values);
    const offenders = scope.filter((p) => isExecConfig(p, dirKeys));
    if (offenders.length) {
      fail(
        `refusing to scope, from a plan, files whose code runs outside this run: ${offenders.join(", ")}\n` +
          `  Declared in : ${file}\n` +
          `  Why         : ${installed ? "this is an installed PHARN project (pharn.config.json has a skillsVersion); " : ""}a CI workflow or local action (.github/workflows/**, .github/actions/**) runs on the next push with the repository's secrets, a git hooks directory (.husky/**, or a core.hooksPath inside the project) runs on the next git command in your own shell, and .mcp.json names commands Claude Code starts next session, so code a plan puts there outlives the run that wrote it, and a plan is untrusted input (CONSTITUTION P2).\n` +
          "  If you genuinely mean to change one of them: edit it yourself, outside the agent, or re-run this setter yourself with --allow-exec-config placed BEFORE --from-plan (an operator flag; no plan can set it).\n" +
          "  Nothing was written; pharn/.run/writes-scope.json is unchanged."
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
          "  Nothing was written; pharn/.run/writes-scope.json is unchanged."
      );
    }
  }

  // --check (7.3.0): every parse and refusal above ran; write nothing, so the live scope record is untouched.
  if (check) {
    process.stdout.write(
      `writes-scope check: ${scope.length} path(s) from ${file} — nothing written (pharn/.run/writes-scope.json unchanged)\n`
    );
    process.exit(0);
  }

  const record = { scope, set_by: file, set_at: new Date().toISOString() };
  const dir = path.resolve(process.cwd(), "pharn", ".run");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "writes-scope.json"), JSON.stringify(record, null, 2) + "\n");
  process.stdout.write(`writes-scope set: ${scope.length} path(s) from ${file} -> pharn/.run/writes-scope.json\n`);
  process.exit(0);
}

main();
