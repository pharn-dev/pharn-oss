#!/usr/bin/env node
// .claude/hooks/protect-trusted-paths.cjs — pre-write floor (CONSTITUTION P2, fix #2).
//
// Deterministic, non-LLM. A Claude Code PreToolUse hook that BLOCKS any Write/Edit/MultiEdit/NotebookEdit to a
// trusted file. Trust-by-location is only real if the location is write-protected at the floor —
// otherwise an injected instruction that gets a Write to pharn/CONSTITUTION.md rewrites the trusted layer.
//
// Protected by default: the four trusted spec docs + CODEOWNERS, the GitHub-layer write-guard itself,
// AND the two pre-write guards' own control surface — the settings files that WIRE the hooks
// (.claude/settings.json and .claude/settings.local.json) plus the three hook scripts. Guarding
// CODEOWNERS locally is "guarding the guard": if the agent could rewrite it, it could delete the
// human-only review requirement and collapse the GitHub-layer trust control (P2). The .claude/ entries
// turn that same idea on this hook itself: each hook file is re-read fresh on every tool call, so
// overwriting one disarms that guard on the very next write, and either settings file can unwire both.
// A guard the agent may rewrite is not a floor op — it is a suggestion (P0).
//
// The control surface includes the writes-scope guard's INPUT, not only its code. .pharn/writes-scope.json
// is the file enforce-writes-scope.cjs reads to decide EVERY write. That hook guards it with a single
// byte-EXACT compare (rel === SCOPE_FILE) while its ALWAYS glob leaves the rest of .pharn/ writable, so
// on a case-insensitive volume .pharn/WRITES-SCOPE.JSON named the same inode and slipped past: the Write
// tool could rewrite the active scope and then write anywhere fix #2 does not backstop. Reproduced live
// (enforce → 0 on the upper-case spelling, 2 on the lower-case one). The entry is added HERE rather than
// by widening that compare because this hook already full-case-folds, strips Windows trailing dot/space,
// and resolves symlinks segment-wise — one entry closes the case-variant AND the broken-symlink-alias
// vector at once. enforce-writes-scope.cjs keeps its own compare (defense in depth), and
// set-writes-scope.cjs is unaffected: it writes the file with fs.writeFileSync, which PreToolUse never sees.
//
// ── MEMORY-BANK CANON (the canon-write denylist) ────────────────────────────────────────────────────
// `memory-bank/` and `.dev/memory-bank/` are denied as ROOTED SUBTREES, with one narrow escape.
//
// WHY IT IS HERE AT ALL. THREAT-MODEL.md §2 #3 calls memory-bank poisoning the "worst persistence
// vector" — write-once-influence-forever, silent and cumulative, with no rollback signal — and §3 maps
// it to the floor primitive "pre-write hook". That mapping did not hold: this file had ZERO memory-bank
// references, so the composed verdict rested entirely on enforce-writes-scope.cjs, whose scope for
// /pharn-build and /pharn-dev-build is parsed from an UNTRUSTED PLAN.md's `## Files`
// (set-writes-scope.cjs --from-plan), and whose CONTROL_SURFACE refusal covers only the four .claude/
// control paths — never canon. A `## Files` entry naming a canon file therefore granted a direct,
// ungated canon write, and no human approves a PRODUCT PLAN.md. Measured before the fix: a Write payload
// naming memory-bank/lessons-learned.md exited 0 here.
//
// NOT A HYPOTHETICAL (P7). It happened twice and both are in canon: lessons-learned L7 (a `writes:`
// over-declaration handed /review "a direct, ungated canon write") and L20 (a `## Files` over-grant
// resolved 6 paths against the human-approved 2, and the over-grant reached
// .dev/memory-bank/lessons-learned.md itself — through `--from-plan`, this exact vector). L20's own rule
// is that the second occurrence of a discipline-only remedy earns a floor check. This is that check.
//
// THE ESCAPE, AND EXACTLY WHAT IT IS NOT. A PreToolUse hook is fed on STDIN, never argv, so
// set-writes-scope.cjs's `--allow-claude-dir` shape is not literally available. The authorization signal
// is instead the ORIGIN of the active writes-scope: canonWriteAuthorized() permits a canon write only
// when .pharn/writes-scope.json parses to an object whose `set_by` is an exact member of
// PROMOTE_COMMANDS and whose `scope` is a SINGLE entry equal to the write target. Every other state —
// absent, unparseable, non-object, wrong origin, multi-entry, or naming a different canon file — DENIES.
//   • What it genuinely buys: `set_by` is written from the setter's ARGV, so NO `writes:` declaration and
//     NO `## Files` entry can set it for itself — the same property set-writes-scope.cjs claims for
//     --allow-claude-dir. /pharn-build and /pharn-dev-build invoke `--from-plan <PLAN.md>`, whose
//     `set_by` is the plan path, so the vector above is closed for a DECLARATION, on the
//     Write/Edit/MultiEdit/NotebookEdit surface.
//   • What it is NOT, and must never be sold as: it is NOT non-self-grantable against an agent holding
//     Bash. set-writes-scope.cjs writes its record with fs.writeFileSync, which PreToolUse never sees,
//     so an agent can run the setter with promote-shaped argv, or forge the record outright, with no
//     human gate. NO mechanism without that hole was found, and none is claimed. It grants nothing new:
//     the same actor could already `cat >> memory-bank/lessons-learned.md`, which this hook has never
//     covered. What changes is that on the guarded tool surface a canon write now costs a SEPARATE,
//     EXPLICIT, auditable act a build plan cannot cause, instead of arriving as an ordinary in-scope
//     build write. That is a NARROWING, not a closure.
//   • It is also NOT evidence a human approved. The floor cannot verify a form answer (LIMITS.md §1d);
//     the promote commands' accept/deny halt stays exactly as advisory as it is today.
//
// A CAPABILITY THIS DELIBERATELY REMOVES. .claude/commands/pharn-dev-memory-promote.md documents a
// second, legitimate canon route: the L1-L17 retro-tagging increment travelled "the ordinary gated build
// path — declared in its PLAN's `## Files`, scoped by --from-plan, approved by a human at the plan
// gate". That route is byte-for-byte the vector above, and the floor cannot tell an honest retag plan
// from a poisoned one, so it is closed. A future canon ANNOTATION is a human hand-edit, or runs under a
// deliberately-set promote-origin scope. Both remedies are named in the canon deny message (L27 — a
// guard that prints an impossible remedy trains the bypass it exists to prevent), and the
// declare-it-in-`writes:`-and-re-run-the-setter remedy is deliberately ABSENT from that message, because
// it is exactly the route this denylist exists to refuse.
//
// ── MATCHING ────────────────────────────────────────────────────────────────────────────────────────
// REPO-RELATIVE, EXACT, CASE- AND UNICODE-FOLDED. Every default entry is a path relative to a guarded
// root, and a write is denied only when the target's own relative path equals one of them under the
// fold. Trust here is by LOCATION, so the match is by location too. The earlier basename and
// path-fragment branches were REMOVED because both over-matched at depth: they denied a USER's own
// docs/ARCHITECTURE.md and docs/THREAT-MODEL.md while PHARN's real docs live under pharn/ — that is
// trust-by-location enforced by name. Exact matching is strictly narrower: it cannot reach a file that
// merely shares a name, and a suffixed path (pharn/ARCHITECTURE.md.bak) is a different key.
// `.claude/commands/**` and `.claude/hooks/*.test.cjs` are deliberately NOT protected: the commands are
// the methodology this repo edits every increment, and a guard that froze its own tests would be
// unmaintainable.
//
// PROTECTED_SUBTREES is the ONE deliberate exception to exact matching, and it is NOT a return to the
// removed branches. A canon directory cannot be spelled as an exact path, so it is matched as a ROOTED
// PREFIX — `<guarded root>/memory-bank/…` — which is still trust-by-LOCATION. The removed fragment
// branch denied a user's docs/ARCHITECTURE.md ANYWHERE in the tree because it matched a path SEGMENT
// wherever it appeared; this matches only what actually sits under a guarded root's canon directory, so
// a nested vendor copy at src/vendor/memory-bank/x.md is untouched. The honest over-block that remains
// is a user's OWN unrelated memory-bank/ at the guarded root — structural, exactly as for the
// root-level THREAT-MODEL.md / LIMITS.md / CODEOWNERS entries.
//
// ── WHAT THIS FILE LEARNED FROM BEING ATTACKED ──────────────────────────────────────────────────────
// The first repo-relative draft of this matcher was correct on every case its author thought of, and
// wrong on five that an adversarial sweep found by RUNNING it. Each guard below exists because a
// specific write reached a trusted file, or a specific input made this hook exit non-blocking:
//   1. The ROOT prefix must be folded too. path.relative() compares case-SENSITIVELY, so an absolute
//      path spelled with a differently-cased root (/users/… for /Users/…) relativized to a `../` escape
//      and read as "outside the repo" — while naming the very same file. Every entry was reachable.
//   2. The anchor must not be cwd. Relativizing the PROTECTED SET against cwd silently disabled the
//      whole guard whenever the agent ran from a subdirectory. cwd is used ONLY where the payload
//      actually means it: resolving a relative write path.
//   3. The anchor must not be __dirname ALONE. Node resolves a module's __dirname THROUGH symlinks, so
//      a hook symlinked in from a dotfiles repo anchored to the dotfiles checkout and left the real
//      project unguarded. Both the as-invoked path and the resolved path are therefore guarded roots.
//   4. `..` must be applied to the REAL parent. path.resolve() collapses `..` lexically, which is not
//      what the kernel does: with `a -> pharn/sub`, `a/../ARCHITECTURE.md` collapses to an unprotected
//      path while open() reaches pharn/ARCHITECTURE.md. Demonstrated by performing the write.
//   5. The fold must be full, not simple. `ſ` (U+017F) lowercases to ITSELF, yet pharn/CONſTITUTION.md
//      opens the real file on this filesystem. Upper-casing first maps ſ→S, ß→SS, ﬅ→ST.
// The lesson is recorded because the shape of the mistake repeats: every one of these was a guard that
// looked obviously correct in the source and was false against the filesystem (P6 — read live state).
//
// ── FAIL-CLOSED ─────────────────────────────────────────────────────────────────────────────────────
// A hook that exits with an unhandled throw exits 1, which Claude Code treats as a NON-BLOCKING error:
// the write proceeds. So every crash in a write-guard is a bypass. Three were found and are closed
// here — a deleted cwd (process.cwd() throws), a literal `null` stdin payload (JSON.parse returns null,
// which then dereferences), and a pathological path (path.join spread past the argument limit) — and
// the decision itself is wrapped so that ANY unexpected error DENIES rather than allows. The canon
// escape inherits this posture in the strictest direction: every failure to read, parse or validate
// .pharn/writes-scope.json returns "not authorized", i.e. the write is DENIED.
//
// ── HONEST BOUNDS (P0) ──────────────────────────────────────────────────────────────────────────────
// • Case-folding is fail-SAFE, not free. On a case-SENSITIVE volume `pharn/constitution.md` is a
//   genuinely different file that this guard nonetheless denies — reproduced on a case-sensitive APFS
//   image, distinct inodes. The trade is deliberate: over-block one same-named file rather than
//   under-block the real doc on the two commonest development platforms. Same for the trailing
//   dot/space strip (Windows semantics) and the Unicode fold, which is close to — but not provably
//   identical with — the filesystem's own equivalence.
// • Root-level entries (THREAT-MODEL.md, LIMITS.md, CODEOWNERS) still over-block a user's own
//   same-named file at the guarded root. That is structural: PHARN's own copies live there. The canon
//   SUBTREES over-block on the same terms and for the same reason.
// • The .pharn/writes-scope.json entry closes the WRITE-TOOL vector only. The claim is "the Write-tool
//   self-escalation is closed", NEVER "the scope file cannot be rewritten" — see the Bash bound below,
//   which reaches it exactly as it reaches every other guarded path.
// • The canon denylist covers the Write/Edit/MultiEdit/NotebookEdit surface ONLY. "Canon cannot be
//   written" is STRUCK. See the Bash bound immediately below — it is the whole ceiling on the canon
//   guarantee, and the escape's authorization record is reachable through it too.
// • CANON_INODES collects only the FOUR NAMED canon files, so a hard-link alias of some OTHER file
//   inside a canon subtree is not caught. A recursive subtree walk on every tool call is the hang risk
//   this file already refuses elsewhere (MAX_RESOLVED_SEGMENTS), and creating a hard link needs Bash,
//   which bypasses this hook entirely. HONEST TRIGGER (P7): CANON_INODES answers NO observed failure —
//   it exists for PARITY with the PROTECTED_INODES coverage the trusted docs already have, so the canon
//   half of a deliberate pair does not silently ship weaker (lessons-learned L31). Said plainly rather
//   than dressed as failure-driven, following the check-plan-lessons sub-check D precedent.
// • Bash-tool writes bypass PreToolUse hooks ENTIRELY. That is by far the largest hole in this guard
//   and no amount of path matching narrows it.
// • PHARN vendored at a SUBPATH of a larger project is not guarded: Claude Code loads .claude/ from
//   the project root, so the outer hook is the one that runs and the inner copy is just files to it.
// • A symlink inside a guarded root that points OUT of it is allowed — deliberately, since a second
//   checkout's CONSTITUTION.md is a different repo's file, and denying it was the original over-match.
//
// Composes with set-writes-scope.cjs, which REFUSES to emit a scope naming the .claude/ control paths
// unless --allow-claude-dir is passed. For every DEFAULT_PROTECTED entry the two remain independent:
// that denylist holds no matter what scope was set, so neutering the setter's refusal still does not
// make a control file writable. THE CANON BRANCH IS THE ONE EXCEPTION, and the qualifier is load-bearing
// (it was previously stated without one, and this increment made that sentence false): a canon write
// CONSULTS .pharn/writes-scope.json, so for canon the two guards are coupled by the record's SHAPE —
// `set_by` plus a one-entry `scope`, as emitted at set-writes-scope.cjs's `const record = {…}`. A ✧ test
// pins that the setter's live output still satisfies canonWriteAuthorized(), so the two cannot drift
// into disagreement unnoticed. The setter's CONTROL_SURFACE deliberately does NOT carry
// .pharn/writes-scope.json: the two sets are pinned equal on the .claude/-prefixed entries by a ✧ test
// in set-writes-scope.test.cjs, and a scope naming the file is inert anyway — both this hook and
// enforce-writes-scope.cjs deny the write regardless of scope.
//
// Wired via .claude/settings.json (PreToolUse matcher: Write|Edit|MultiEdit|NotebookEdit).

"use strict";

const fs = require("fs");
const path = require("path");

function realpathOr(p) {
  try {
    return fs.realpathSync(p);
  } catch {
    return p;
  }
}

// The directory a RELATIVE write path is relative to — the caller's cwd, by definition of the payload.
// process.cwd() THROWS when the working directory has been deleted or made unreadable; unguarded that
// exits 1, which is a non-blocking hook error, so the guard would fail OPEN on it.
const CWD = (() => {
  try {
    return realpathOr(process.cwd());
  } catch {
    return ".";
  }
})();

// The roots this hook guards, derived from the hook's OWN location: <root>/.claude/hooks/<this file>.
// Deliberately NOT cwd (see the header, #2). BOTH spellings of that location are kept, because
// __dirname is symlink-RESOLVED: a hook symlinked in from a dotfiles checkout would otherwise anchor to
// the dotfiles repo and leave the real project unguarded (#3). process.argv[1] is the path as invoked.
const ROOTS = (() => {
  const dirs = [__dirname];
  try {
    if (typeof process.argv[1] === "string" && process.argv[1]) dirs.push(path.dirname(path.resolve(CWD, process.argv[1])));
  } catch {
    /* argv unavailable: __dirname alone still anchors the common case */
  }
  const out = [];
  for (const d of dirs) {
    let base;
    try {
      base = path.resolve(d, "..", "..");
    } catch {
      continue;
    }
    for (const v of [base, realpathOr(base)]) if (v && !out.includes(v)) out.push(v);
  }
  return out.length ? out : [CWD];
})();

const DEFAULT_PROTECTED = [
  // The four trusted spec docs at their real repo-relative locations (anchored paths, never bare
  // basenames — a basename denies a user's own same-named file and protects the wrong one).
  "pharn/CONSTITUTION.md",
  "pharn/ARCHITECTURE.md",
  "THREAT-MODEL.md",
  "LIMITS.md",
  // CODEOWNERS at the three GitHub-recognized locations; whichever exists is a live review gate.
  "CODEOWNERS",
  ".github/CODEOWNERS",
  "docs/CODEOWNERS",
  // The pre-write guards' own control surface. BOTH settings files are here: settings.local.json is a
  // real, loaded settings file that can wire or override the same hooks, so guarding only settings.json
  // left the control surface half-open. Kept identical to CONTROL_SURFACE in set-writes-scope.cjs; the
  // two declarations are pinned equal by a ✧ test in set-writes-scope.test.cjs.
  ".claude/settings.json",
  ".claude/settings.local.json",
  ".claude/hooks/protect-trusted-paths.cjs",
  ".claude/hooks/enforce-writes-scope.cjs",
  ".claude/hooks/set-writes-scope.cjs",
  // The writes-scope guard's INPUT (see the header). Deliberately this ONE file and not ".pharn/**":
  // the rest of .pharn/ is disposable runtime scratch that stages legitimately write, and the
  // product lessons-index cache lives there too. First entry naming a GENERATED file rather than a
  // committed one — the deny is by path, so it holds whether or not the file exists yet.
  ".pharn/writes-scope.json",
];

// Memory-bank canon, denied as ROOTED SUBTREES (see the header). Both halves of the deliberate
// dev/product copy-pair are listed, because the second copy is where a pair's obligation gets dropped
// (lessons-learned L31). No trailing slash here — one is appended once, at fold time.
const PROTECTED_SUBTREES = ["memory-bank", ".dev/memory-bank"];

// The four canon files the two promote commands' TARGET_ENUMs actually name. Used ONLY to collect
// hard-link inodes (a bounded four stats, versus a recursive walk of the subtrees on every tool call).
const CANON_FILES = [
  "memory-bank/lessons-learned.md",
  "memory-bank/pattern-library.md",
  ".dev/memory-bank/lessons-learned.md",
  ".dev/memory-bank/pattern-library.md",
];

// The ONLY writes-scope origins that may authorize a canon write. Exact membership over a literal array
// (ARCHITECTURE.md §2 primitive #3) — never a prefix test, never a pattern: `pharn-dev-memory-promote`
// and `pharn-memory-promote` are named in full so a differently-named command cannot prefix its way in.
const PROMOTE_COMMANDS = [".claude/commands/pharn-memory-promote.md", ".claude/commands/pharn-dev-memory-promote.md"];

// The writes-scope guard's input, read (never written) by the canon escape.
const SCOPE_FILE = ".pharn/writes-scope.json";

const extra = (process.env.PHARN_PROTECTED || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Fold a path to its comparison key: forward slashes, `./` and `a/../` collapsed, Unicode normalized,
// trailing dots/spaces stripped per segment, case folded. Lexical only — never a realpath.
//
// The fold is toUpperCase().toLowerCase(), NOT a bare toLowerCase(): toLowerCase alone is SIMPLE case
// mapping while this filesystem compares with FULL case folding (header, #5). The trailing dot/space
// strip is Windows semantics — the OS drops them, so `LIMITS.md.` opens LIMITS.md there; on POSIX those
// are distinct names and stripping them is a deliberate over-block in the safe direction.
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

const PROTECTED_KEYS = new Set(DEFAULT_PROTECTED.map(toKey));
const ROOT_PREFIXES = ROOTS.map((r) => {
  const k = toKey(r);
  return k.endsWith("/") ? k : k + "/";
});

// Canon subtrees as folded prefixes WITH the trailing slash, so `memory-banked/x.md` cannot match
// `memory-bank`. The bare directory itself is not a write target, so requiring something after the
// slash is correct as well as narrower.
const PROTECTED_SUBTREE_KEYS = PROTECTED_SUBTREES.map((s) => toKey(s) + "/");
const PROMOTE_COMMAND_KEYS = new Set(PROMOTE_COMMANDS.map(toKey));

// PHARN_PROTECTED keeps its ORIGINAL basename/path-fragment semantics, deliberately. Narrowing it to
// exact repo-relative paths would silently strip protection from an operator's existing setting — a
// guard that fails OPEN on a config it used to honor, with no error. There is no over-block victim: an
// env entry is an explicit operator opt-in, unlike the default set, whose bare basenames denied a USER's
// own same-named files. Fragments require a path boundary, so `x/settings.json` does not match
// `settings.json.bak`.
const EXTRA_KEYS = extra.map(toKey);

function matchesExtra(key, entryKey) {
  if (key === entryKey || key.split("/").pop() === entryKey) return true;
  const needle = "/" + entryKey;
  for (let i = key.indexOf(needle); i !== -1; i = key.indexOf(needle, i + 1)) {
    const after = i + needle.length;
    if (after === key.length || key[after] === "/") return true;
  }
  return false;
}

// Hard links have no link to resolve, so realpath returns the alias unchanged and a path match never
// sees the trusted key — while the write mutates the same inode. Only files that ACTUALLY carry a
// second link are collected (nlink > 1), so in the normal case this set is empty and costs nothing.
function collectInodes(rels) {
  const s = new Set();
  for (const root of ROOTS) {
    for (const rel of rels) {
      try {
        const st = fs.statSync(path.join(root, rel));
        if (st.nlink > 1) s.add(st.dev + ":" + st.ino);
      } catch {
        /* absent here: nothing to alias */
      }
    }
  }
  return s;
}

const PROTECTED_INODES = collectInodes(DEFAULT_PROTECTED);
// Kept SEPARATE from PROTECTED_INODES on purpose: an inode hit in that set is unconditionally denied,
// while a canon hit must still route through the escape. Merging them would make a legitimate promote
// write to a canon file that happens to carry a second link undeniable-by-escape, i.e. it would break
// /pharn-memory-promote on a hard-linked canon file for no security gain.
const CANON_INODES = collectInodes(CANON_FILES);

function inodeIn(set, abs) {
  if (!set.size) return false;
  try {
    const st = fs.statSync(abs);
    return set.has(st.dev + ":" + st.ino);
  } catch {
    return false; // absent: cannot be an alias of an existing file
  }
}

// Canonicalize a (possibly not-yet-existent) write target through symlinks, ONE SEGMENT AT A TIME.
//
// WHY segment-wise rather than path.resolve() then realpath: path.resolve() collapses `..` LEXICALLY,
// which is not what the filesystem does (header, #4). Note fs.realpathSync() cannot be used to show
// this either — it resolves `..` lexically too.
//
// A DANGLING symlink is resolved lexically rather than treated as an ordinary missing name, because a
// broken link pointing at an absent protected path (docs/CODEOWNERS) could otherwise be used to CREATE
// that file with attacker-chosen content. Hops are bounded so a self-referential link cannot spin.
const MAX_RESOLVED_SEGMENTS = 4096;

function fsRootOf(p) {
  try {
    return path.parse(path.resolve(p)).root;
  } catch {
    return path.sep;
  }
}

function resolveWriteTarget(p) {
  const raw = String(p).replace(/\\/g, "/");
  const fsRoot = (() => {
    try {
      return path.parse(path.resolve(raw)).root;
    } catch {
      return path.sep;
    }
  })();
  let cur;
  try {
    cur = realpathOr(path.isAbsolute(raw) ? fsRoot : CWD);
  } catch {
    cur = CWD;
  }
  let pending = raw.split("/").filter((s) => s && s !== ".");
  const missing = [];
  let hops = 0;
  let walked = 0;
  while (pending.length) {
    const seg = pending.shift();
    // Once a segment does not exist, nothing below it can be resolved: keep the rest as a lexical tail.
    if (missing.length) {
      missing.push(seg);
      continue;
    }
    // Bound the syscall walk. Resolution costs up to two syscalls per segment, so a path with hundreds
    // of thousands of segments made this hook take minutes — and a guard that HANGS stalls the agent
    // just as effectively as one that allows. Past the cap the remainder is kept lexically: a protected
    // path is three segments deep at most, so nothing reachable is given up.
    if (++walked > MAX_RESOLVED_SEGMENTS) {
      missing.push(seg);
      continue;
    }
    const next = seg === ".." ? path.dirname(cur) : path.join(cur, seg);
    const real = (() => {
      try {
        return fs.realpathSync(next);
      } catch {
        return null;
      }
    })();
    if (real !== null) {
      cur = real;
      continue;
    }
    // A DANGLING symlink still NAMES a target. Treating it as an ordinary missing name would let a
    // broken link pointing at an absent protected path (docs/CODEOWNERS) be used to CREATE that file
    // with attacker-chosen content. Its target is pushed back onto the queue SEGMENT-WISE rather than
    // adopted whole, so every component is still realpath-resolved — adopting it whole left the
    // prefix un-canonicalized (/var/... vs /private/var/...) and the match silently missed.
    let link = null;
    try {
      if (hops < 40 && fs.lstatSync(next).isSymbolicLink()) {
        link = fs.readlinkSync(next);
        hops++;
      }
    } catch {
      link = null;
    }
    if (link !== null) {
      const segs = link
        .replace(/\\/g, "/")
        .split("/")
        .filter((x) => x && x !== ".");
      // An absolute target restarts at the filesystem root; a relative one resolves against the link's
      // own directory, which is exactly `cur`.
      if (path.isAbsolute(link)) cur = realpathOr(fsRootOf(link));
      pending = segs.concat(pending);
      continue;
    }
    missing.push(seg);
  }
  // One join over a pre-joined tail. NOT path.join(cur, ...missing): the spread throws RangeError past
  // the argument limit, and an unhandled throw here exits 1 — a non-blocking error, so the write would
  // proceed. NOT a per-segment reduce either: that is quadratic in the total length.
  return missing.length ? path.join(cur, missing.join("/")) : cur;
}

// Exact membership over the target's path relative to a guarded root (ARCHITECTURE §2 primitive #3),
// plus the inode test for hard links and the operator's PHARN_PROTECTED fragments. Takes an ABSOLUTE
// path — callers pass both the cwd-resolved literal and the symlink-canonicalized target.
function isProtected(abs) {
  const key = toKey(path.resolve(String(abs)));
  if (inodeIn(PROTECTED_INODES, abs)) return true;
  if (EXTRA_KEYS.some((e) => matchesExtra(key, e))) return true;
  for (const prefix of ROOT_PREFIXES) {
    if (!key.startsWith(prefix)) continue; // not under this root (this also rejects the root itself)
    if (PROTECTED_KEYS.has(key.slice(prefix.length))) return true;
  }
  return false;
}

// The target's ROOT-RELATIVE folded key if it sits inside a canon subtree, else null. Returning the key
// (rather than a boolean) is what lets the escape compare the scope's single entry against the very
// path being written, instead of merely against "some canon path".
function canonRelKey(abs) {
  const key = toKey(path.resolve(String(abs)));
  for (const prefix of ROOT_PREFIXES) {
    if (!key.startsWith(prefix)) continue;
    const rel = key.slice(prefix.length);
    for (const sub of PROTECTED_SUBTREE_KEYS) if (rel.startsWith(sub) && rel.length > sub.length) return rel;
  }
  return null;
}

// Is this write authorized by the ORIGIN of the active writes-scope? See the header for what this does
// and does not buy. Every branch that is not an exact match returns false, so the guard is fail-closed
// on an absent, unreadable, unparseable, non-object, wrong-origin, multi-entry or mismatched record.
function canonWriteAuthorized(relKey) {
  if (typeof relKey !== "string" || !relKey) return false;
  for (const root of ROOTS) {
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(path.join(root, SCOPE_FILE), "utf8"));
    } catch {
      continue; // absent or unparseable at this root -> not an authorization
    }
    // JSON.parse("null") returns null and JSON.parse("[]") an array; neither throws.
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) continue;
    // (2) ORIGIN: exact membership over a literal array. This is the argv-derived field.
    if (typeof parsed.set_by !== "string" || !PROMOTE_COMMAND_KEYS.has(toKey(parsed.set_by))) continue;
    // (3) EXACTLY ONE entry, equal to this very target. A promote run resolves `--target` to one path,
    // so this is the shape the legitimate caller emits; anything wider is refused rather than searched.
    if (!Array.isArray(parsed.scope) || parsed.scope.length !== 1) continue;
    if (typeof parsed.scope[0] !== "string") continue;
    if (toKey(parsed.scope[0]) === relKey) return true;
  }
  return false;
}

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function extractPaths(toolInput) {
  if (!toolInput || typeof toolInput !== "object") return [];
  const paths = [];
  for (const k of ["file_path", "path", "notebook_path"]) if (typeof toolInput[k] === "string") paths.push(toolInput[k]);
  // MultiEdit: edits[] each may carry file_path; some shapes nest under .edits
  if (Array.isArray(toolInput.edits)) {
    for (const e of toolInput.edits) if (e && typeof e.file_path === "string") paths.push(e.file_path);
  }
  return paths;
}

// The deny message is composed PER BRANCH, never as one shared string with per-case bullets appended.
// enforce-writes-scope.cjs learned this the hard way (lessons-learned L27): a shared message prints
// every remedy in every case, including the ones that cannot work, and a guard that prints an impossible
// remedy trains the exact bypass it exists to prevent. The two branches are deliberately DISJOINT in
// their remedies — the trusted branch never mentions the promote commands, and the canon branch never
// offers "declare it in `writes:` and re-run the setter", which is precisely the route it refuses.
const DENY_REASONS = {
  trusted: (shown) =>
    `BLOCKED by PHARN floor: ${shown} is (or resolves to) a trusted file (CONSTITUTION P2 / fix #2). Trusted spec is human-only; the build agent may not write it. If a change is genuinely needed, a human edits it outside the agent loop.`,
  canon: (shown) =>
    `BLOCKED by PHARN floor: ${shown} is (or resolves to) memory-bank CANON (CONSTITUTION P2 / fix #2; THREAT-MODEL.md §2 #3 — memory poisoning is silent, cumulative, and has no rollback signal). Canon is written only through the gated promotion path. FIX (pick one): • run /pharn-memory-promote (or /pharn-dev-memory-promote), which after its human accept/deny gate sets a writes-scope whose ORIGIN authorizes exactly this one canon file; • or have a human edit canon by hand, outside the agent loop. Re-scoping a build from a PLAN's \`## Files\` CANNOT authorize this write — that is the specific thing this guard refuses, deliberately.`,
};

const raw = readStdin();
let payload;
try {
  payload = JSON.parse(raw || "{}");
} catch {
  payload = {};
}
// JSON.parse("null") returns null and JSON.parse("42") a number — neither throws, and both then
// dereference into an uncaught TypeError (exit 1, non-blocking, write proceeds).
if (!payload || typeof payload !== "object" || Array.isArray(payload)) payload = {};

const toolName = payload.tool_name || payload.toolName || "";
const toolInput = payload.tool_input || payload.toolInput || {};
const isWrite = /^(Write|Edit|MultiEdit|NotebookEdit)$/i.test(toolName) || (!toolName && extractPaths(toolInput).length);

if (isWrite) {
  // Deny if EITHER the literal path (resolved against CWD, which is what a relative payload path means)
  // OR its symlink-canonicalized real target is protected. Evaluated per path and FAIL-CLOSED: if
  // deciding a path throws, that path is treated as protected rather than waved through.
  let offender = null;
  for (const rawPath of extractPaths(toolInput)) {
    let hit;
    try {
      const literal = path.resolve(CWD, String(rawPath));
      const real = resolveWriteTarget(rawPath);
      if (isProtected(literal) || isProtected(real)) {
        hit = { rawPath, literal, real, kind: "trusted" };
      } else {
        // ORDER MATTERS, and getting it wrong is not theoretical — the first draft of this branch
        // ANDed in `!aliased` and the probe caught it: a canon file that merely HAPPENS to carry a
        // second hard link has nlink > 1, so it lands in CANON_INODES, so the legitimate promote write
        // to the file's own declared path was denied. The inode set exists to catch an alias whose OWN
        // NAME is not canon; it must never re-classify the real path.
        //   • ck !== null  -> the target IS a canon path by name. The escape applies normally.
        //   • ck === null but the inode matches -> a hard-link alias. It can never be the promote
        //     command's `--target`, so there is no key to authorize and it is unconditionally denied.
        const ck = canonRelKey(literal) || canonRelKey(real);
        if (ck !== null) {
          hit = canonWriteAuthorized(ck) ? null : { rawPath, literal, real, kind: "canon" };
        } else if (inodeIn(CANON_INODES, literal) || inodeIn(CANON_INODES, real)) {
          hit = { rawPath, literal, real, kind: "canon" };
        } else {
          hit = null;
        }
      }
    } catch {
      hit = { rawPath, literal: String(rawPath), real: String(rawPath), errored: true, kind: "trusted" };
    }
    if (hit) {
      offender = hit;
      break;
    }
  }
  if (offender) {
    let shown = offender.rawPath;
    try {
      if (!offender.errored && !isProtected(offender.literal) && canonRelKey(offender.literal) === null)
        shown = `${offender.rawPath} -> ${offender.real}`;
    } catch {
      /* keep the raw path in the message */
    }
    // The message is built from the BLOCKED PATH and fixed text only. No field of the writes-scope
    // record ever reaches it: this hook has no asData() control-character fold (enforce-writes-scope.cjs
    // carries one precisely because a record field CAN forge a line in a deny message), so keeping
    // record-derived text out of the message is load-bearing, not stylistic. A ✧ test pins it.
    const reason = (DENY_REASONS[offender.kind] || DENY_REASONS.trusted)(shown);
    // Current Claude Code form:
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: reason,
        },
        decision: "block",
        reason,
      })
    );
    // Also emit on stderr and use exit 2 for older versions that block on non-zero exit:
    process.stderr.write(reason + "\n");
    process.exit(2);
  }
}

// allow
process.exit(0);
