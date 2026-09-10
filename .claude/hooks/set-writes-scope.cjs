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
//   ... [--allow-claude-dir]                      # opt in to scoping the write-guards' own control surface
//   node .claude/hooks/set-writes-scope.cjs --clear   # run as a command's LAST step, after every write
//
// --clear DELETES .pharn/writes-scope.json, returning enforce-writes-scope.cjs to its fail-closed
// DEFAULT_SAFE_SET. It exists because a SET scope REPLACES that safe-set: a command that finished and
// left its scope behind is STRICTER than the default, so ordinary later work is silently denied
// (measured: with a leftover one-path scope, `pharn/features/**`, `.dev/features/**` and `pharn/pharn-*/**`
// paths the default PERMITS all exit 2). It takes no --target and REFUSES to combine with
// --from-plan / --from-frontmatter: clearing and setting in one call is always a mistake, and the
// refusal is louder than a silently-honored precedence rule. Absent file -> exit 0, no output change
// (idempotent), so a command's last step is safe to run twice or after an early abort.
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
// control surface (CONTROL_SURFACE below: .claude/settings.json + the three hook scripts). A declared
// `writes:` / `## Files` list is `trust: untrusted` input (CONSTITUTION P2): before this check, an entry
// naming a hook produced a scope that enforce-writes-scope.cjs then honored, so an untrusted document
// could authorize disarming a guard. --allow-claude-dir opts back in for the increments that genuinely
// edit a guard; it is an operator ARGV flag, so no declared file can set it for itself.
//
// HONEST BOUND (P0): this test is LEXICAL. Entries are normalized for the comparison (`./`, `a/../`,
// backslashes) but never realpath-resolved, so a symlink declared in `## Files` that resolves onto a
// control file is NOT caught here. Defense in depth, in order: this refusal is the loud EARLY failure at
// declaration time; enforce-writes-scope.cjs realpaths the write target and denies it as out of scope; and
// protect-trusted-paths.cjs realpaths and denies these four paths outright regardless of any scope. This
// refusal buys a clear early failure — it is not the last line of defense.

"use strict";

const fs = require("fs");
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
    } else if (a === "--allow-claude-dir") {
      // Its OWN branch, ahead of the positional fallbacks — otherwise the flag is consumed as the
      // positional `mode` or `file` and silently breaks --from-plan / --from-frontmatter parsing.
      allowClaudeDir = true;
    } else if (!mode) {
      mode = a;
    } else if (!file) {
      file = a;
    } else {
      fail(`unexpected argument: ${a}`);
    }
  }
  return { mode, file, target, allowClaudeDir, clear };
}

// The two pre-write guards' own control surface: the settings file that WIRES both PreToolUse hooks, and
// the three hook scripts. Each is re-read fresh on every tool call, so a write to any one of them disarms
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
];

// Lexical normalization for the MEMBERSHIP TEST ONLY — the emitted scope value is never rewritten. Folds
// `./`, `a/../` and backslashes so a trivial re-spelling (`./.claude/settings.json`) cannot walk past the
// exact-membership test below. NOT a realpath; see the header's HONEST BOUND.
function normalizeForTest(entry) {
  return path.posix.normalize(String(entry).replace(/\\/g, "/"));
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

// --- Mode B: the leading back-tick path of each list item under `## Files`, stopping at the next
// markdown heading of ANY level (an exclusion subsection like `### Explicitly not touched` /
// `### Out of scope` is its own heading) or a head-less prose exclusion cue. A path under either of those
// two section-level forms never enters scope, however the exclusion is worded (P5, fix #7). Residual: an
// inline-marked item (`- `path` — not touched`) IS a path-item, so it is NOT detected — see the plan's
// "Known residuals". ---
function pathsFromPlanFiles(file) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  const start = lines.findIndex((l) => /^##\s+Files\b/.test(l));
  if (start === -1) fail(`no \`## Files\` heading in ${file}`);
  const out = [];
  // Whether a path-item's body is still open (see Boundary 2). Reset by a blank line.
  let inPathItemBody = false;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
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
  return out;
}

function main() {
  const { mode, file, target, allowClaudeDir, clear } = parseArgs(process.argv);

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
        ? "writes-scope cleared: .pharn/writes-scope.json removed -> fail-closed default-safe-set active\n"
        : "writes-scope cleared: no active scope (already absent) -> fail-closed default-safe-set active\n"
    );
    process.exit(0);
  }

  if (!mode || !file || (mode !== "--from-frontmatter" && mode !== "--from-plan")) {
    fail(
      "usage: set-writes-scope.cjs (--from-frontmatter <file.md> [--target <path>] | --from-plan <PLAN.md>) [--allow-claude-dir]\n" +
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

  const record = { scope, set_by: file, set_at: new Date().toISOString() };
  const dir = path.resolve(process.cwd(), ".pharn");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "writes-scope.json"), JSON.stringify(record, null, 2) + "\n");
  process.stdout.write(`writes-scope set: ${scope.length} path(s) from ${file} -> .pharn/writes-scope.json\n`);
  process.exit(0);
}

main();
