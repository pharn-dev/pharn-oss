#!/usr/bin/env node
// pharn/floor/reconcile-baseline.mjs — ANCHOR the worktree state a later reconciliation compares against.
//
// Floor/eval infrastructure — NOT a Capability (no `role:`), exactly like check-verify.mjs and
// check-build-complete.mjs, which live in this floor-ignored dir. It owns ONE axis: "what did the
// reconciled set look like at the moment this epoch opened?" The VERDICT lives in its sibling
// pharn/floor/check-bash-reconcile.mjs (P3 — one axis per file).
//
// WHY THIS FILE EXISTS. The two `PreToolUse` write guards match `Write|Edit|MultiEdit|NotebookEdit`
// only, so a write issued through **Bash** reaches every path in the repo, is not denied, and — with no
// `PostToolUse` hook wired — leaves no record. lessons-learned L19 named that gap in 2026-08-05 with a
// discipline-only remedy; L20's rule is that such a remedy WILL recur and the second occurrence earns a
// floor check. It recurred (L19's own formatter case, L38's contention case, the docs/lessons-index.md
// generator write). This is that check's first half.
//
// THE BASELINE IS RELATIVE TO THE LAST ANCHOR — NOT TO HEAD, and that distinction is the whole design.
// `git status` answers "what changed since the base commit", which is a DIFFERENT question: it misses a
// Bash write that restores HEAD bytes, and it counts every legitimate Write-tool edit as a change with
// no way to separate the two. check-regress.mjs already makes exactly that conflation and lessons-learned
// L17 is the record of it ("changed-since-base tested, written-by-the-build reported"). Repeating it here
// would re-ship L17, so the baseline is a CONTENT-HASH MAP taken at a known instant.
//
// THE SCOPE IS SNAPSHOTTED INTO THE RECORD, deliberately. By the time a reconciliation runs at /verify,
// `.pharn/writes-scope.json` holds VERIFY's scope, not the build's — the single mutable record every
// stage's Step 0 overwrites (lessons-learned L38). check-regress.mjs documents the same trap from the
// other side. So the scope that was live when the epoch opened is copied into the baseline, and the
// checker matches candidates against THAT, never against whatever happens to be on disk later.
//
// FLOOR REDUCTION (pharn/ARCHITECTURE.md §2): primitive #2 (content-hash) over a path set enumerated by
// git's own ignore rules. No LLM, no network, no child process except `git` for enumeration.
//
// TRUST (P2): every path enumerated here is `trust: untrusted` DATA. Paths are used ONLY as readFileSync
// arguments and as object keys — never eval'd, executed, spawned, or interpolated into a shell string
// (git is invoked with execFileSync + an argv array, so no shell parses a filename).
//
// HONEST SCOPE (P0). The reconciled set is exactly `tracked ∪ untracked-not-ignored`. A git-ignored path
// is INVISIBLE here by construction — that is a design choice, not an oversight, and it is what makes
// `.pharn/` scratch, `runs/**` and `node_modules/` cost nothing. Anchoring proves NOTHING about the
// bytes it records: it states what was there, never that it was correct or that a human approved it.
//
// --ANCHOR REFUSES WITH NO USABLE SCOPE (D6, 6.23.0). `snapshotScope()` returning `null` — absent or an
// unusable `.pharn/writes-scope.json` — now means `--anchor` writes NOTHING and exits 2, rather than
// opening an epoch whose `scope_snapshot` a later reconcile cannot use to authorize anything. An explicit
// `{"scope": []}` IS a scope (an authorization to write nothing) and anchors normally. Both shipped
// callers (`/pharn-build`, `/pharn-dev-build`) already run their own Step-0 setter immediately before this
// call, so this only refuses a caller that anchors out of order or against a plan with no parseable
// `## Files` — exactly the caller that would otherwise anchor a baseline no scope could ever clear.
//
// Usage:
//   node pharn/floor/reconcile-baseline.mjs --anchor [--base <dir>] [--by <label>]
//   node pharn/floor/reconcile-baseline.mjs --show   [--base <dir>]
//
// Exit: 0 ok · 2 unusable input / git unavailable / no usable scope to snapshot (D6) / write failed —
// FAIL-CLOSED (P5). Never a silent pass.

import {
  readFileSync,
  writeFileSync,
  writeSync,
  ftruncateSync,
  mkdirSync,
  existsSync,
  statSync,
  openSync,
  fstatSync,
  closeSync,
  readlinkSync,
  constants as fsConstants,
} from "node:fs";
import { resolve, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

export const RECORD_VERSION = 1;
export const RECORD_PATH = ".pharn/reconcile/baseline.json";
export const SCOPE_PATH = ".pharn/writes-scope.json";

function die(reason, code = 2) {
  console.error(`reconcile-baseline: ${reason}`);
  process.exit(code);
}

// --- the reconciled set: tracked ∪ untracked-not-ignored, straight from git's own ignore rules. ------
// -z + split("\0") rather than newline-splitting: a filename may legally contain a newline, and a
// newline-split enumeration would silently truncate one path into two unreadable ones.
export function enumerate(baseDir) {
  let out;
  try {
    out = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
      cwd: baseDir,
      maxBuffer: 1 << 28,
      encoding: "buffer",
    });
  } catch (e) {
    return { ok: false, reason: `git enumeration failed (not a git repo, or git unavailable): ${e.message}` };
  }
  // REJECT a pathname that does not ROUND-TRIP through UTF-8, rather than silently mangling it.
  // `toString("utf8")` replaces invalid bytes with U+FFFD, so such a path would be recorded under a name
  // that resolves to nothing: hashFile returns null, and the real file is never reconciled. A filename
  // is attacker-choosable, so that is an evasion of exactly this checker, and the safe answer is to
  // refuse the whole enumeration (fail-closed, P5) rather than to reconcile a set known to be incomplete.
  const raw = out.toString("utf8");
  if (Buffer.compare(Buffer.from(raw, "utf8"), out) !== 0) {
    return {
      ok: false,
      reason:
        "a pathname in this tree is not valid UTF-8, so the reconciled set cannot be enumerated faithfully — refusing rather than reconciling a partial set",
    };
  }
  const paths = raw.split("\0").filter(Boolean);
  return { ok: true, paths };
}

// ONE DESCRIPTOR, never a path checked and then re-resolved. `statSync(p)` followed by `readFileSync(p)`
// is a TOCTOU race (CWE-367): the name can be re-pointed between the two calls, so the bytes hashed need
// not be the bytes stat'd. That is a defect anywhere; in THIS file it is self-defeating, because the
// whole artifact is an integrity baseline — a reconciler that can be made to hash a different file than
// it inspected cannot support the claim its own header makes. Caught by CodeQL on the PR that introduced
// it (js/file-system-race, high), not by review. `open` → `fstat` → `read` on the SAME fd closes it:
// after openSync the descriptor is bound to one inode, and fstatSync/readFileSync both address the fd.
//
// EVERY SYMLINK IS HASHED BY ITS OWN LINK TEXT (6.20.8) — what git itself stores for a mode-120000 entry,
// whatever the target is: a regular file, a directory, a FIFO, or nothing. NOTHING HERE FOLLOWS A LINK.
// 6.17.1 did this for links whose target is not an openable regular file (a directory or dangling link read
// as null, so every run of a repo tracking one reported a false ESCAPE — .dev/features/reconcile-symlink-hash/).
//
// WHY THE REST FOLLOWED (6.20.8, reproduced before the fix): a link to a REGULAR FILE was still opened with a
// plain `openSync`, which FOLLOWS it, so the TARGET's bytes were recorded under the LINK's path. With a tracked
// `CLAUDE.md -> AGENTS.md` and a writes-scope of [AGENTS.md], an edit of AGENTS.md moved the CLAUDE.md entry
// too; check-bash-reconcile.mjs judges that entry by its path, as text, and reported `ESCAPE … writes-scope
// (snapshot)` on CLAUDE.md — while the live guard, which `realpath`s a target first, ALLOWS a Write to both
// paths. Hashed by its text, a link's entry changes only when the LINK changes (re-pointed, created, removed);
// a write THROUGH it changes the target's own entry, judged under the target's own path, which is the path the
// guard judges. Two further consequences of following go with it: a re-point between two files with identical
// bytes is now seen, and a change to a file OUTSIDE the repo, reached through a tracked link, no longer reads
// as a change to a repo path. (lessons-learned L59: a call that follows a link answers for the target.)
//
//   • THE ORDER: an `O_NOFOLLOW` open FIRST, `readlink` only when that open FAILS. A no-follow open never
//     answers for a link's target: on a link it fails (ELOOP on Linux and darwin). So a regular file is hashed
//     through its fd and never reaches `readlink`: no EINVAL throw per file (measured at grill time, 35.7 ms vs
//     49.6 ms of classification over 2220 paths) and no dependence on which errno a platform raises. After a
//     failed open the branch asks `readlink`, the one call that answers for the NAME; it never reads the errno.
//   • `O_NONBLOCK` is the repo's no-follow read idiom (check-spec.mjs, run-gates.mjs): a FIFO swapped in after
//     enumeration opens without blocking and fails `isFile()`. git never enumerates a FIFO (measured), so it
//     matters only for such a race; a LINK to a FIFO is never opened at all.
//   • readlinkSync(abs) is the one path-addressed call after the open, reached only when the open failed. It
//     reads a property of the NAME in one syscall, so it never hashes bytes other than the ones it inspected.
//     A name that is not a link answers EINVAL and stays null — above all an UNREADABLE regular file (EACCES
//     at the open), which therefore stays a reconcile candidate. That is where 6.17.1's "make the target
//     unreadable to hide a change" guard now lives: on the TARGET's own entry, no longer on the link's
//     (lessons-learned L51 — re-justified against the new input domain, and tested; LINK_TEXT_ERRNOS, the
//     errno set that described which FOLLOW failures fell back to link text, went with the following).
//   • The text is read as a BUFFER and hashed raw. A string read would decode it as UTF-8, and two targets
//     differing only in invalid bytes would decode to the same U+FFFD string and hash equal, so re-pointing
//     one to the other would go unseen. For every valid-UTF-8 target the digest is byte-identical to
//     sha256("symlink\0" + text), the formula a downstream install shipped as a local patch.
//
// BOUNDS, stated:
//   • A change to a link's TARGET is seen only under the target's own path, and only while that path is in the
//     reconciled set: a target outside the repo, or git-ignored, is outside the set like any other path there.
//     The files inside a linked directory are reconciled under their own tracked paths. The worktree
//     fingerprint hashes through this function, so the same holds for it.
//   • `O_NOFOLLOW` governs the FINAL path component only. An ancestor directory swapped for a link after
//     enumeration is still followed by both calls, as before 6.20.8. Where `O_NOFOLLOW` does not exist (`?? 0`,
//     Windows) the open follows a link, and a link to a regular file hashes by its target's bytes — the
//     pre-6.20.8 rule. CI and every measured run are POSIX.
//   • A regular file whose bytes are exactly `symlink\0<text>` hashes equal to that link. That takes a deliberate
//     forgery, which the reconciliation contract already places outside its non-adversarial claim.
//   • A baseline anchored before 6.20.8 recorded a link to a regular file under its TARGET's digest, so the first
//     reconcile of that epoch reports the link as changed: a candidate, and an ESCAPE when no recorded scope
//     names it. Never a silent pass; the next anchor records the text. RECORD_VERSION stays 1, as in 6.17.1:
//     the record's keys and shape did not change, one kind of `entries` value did.
// The open flags for a read that never follows the final component, never blocks on a FIFO, and degrades to a
// plain read where a platform lacks a constant (the check-spec.mjs idiom).
const NO_FOLLOW_READ = fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0) | (fsConstants.O_NONBLOCK ?? 0);

export function hashFile(abs) {
  let fd;
  try {
    fd = openSync(abs, NO_FOLLOW_READ);
    if (!fstatSync(fd).isFile()) return null; // a directory, FIFO or device — a link never gets here (not followed)
    return createHash("sha256").update(readFileSync(fd)).digest("hex");
  } catch {
    // The no-follow open failed: the name is a symlink (hashed by its text), or it is unreadable / gone (null,
    // so a candidate). readlink decides which — never the open's errno.
    return hashLinkText(abs);
  } finally {
    if (fd !== undefined) {
      try {
        closeSync(fd);
      } catch {
        /* already closed / invalid — nothing to reclaim */
      }
    }
  }
}

// sha256 of `symlink\0` + a link's raw target bytes, or null when the name is not a symlink (EINVAL) or
// is gone. The prefix separates the digest domain from a plain content hash of the same bytes.
function hashLinkText(abs) {
  try {
    return createHash("sha256")
      .update("symlink\0")
      .update(readlinkSync(abs, { encoding: "buffer" }))
      .digest("hex");
  } catch {
    return null;
  }
}

export function snapshotScope(baseDir) {
  try {
    const parsed = JSON.parse(readFileSync(resolve(baseDir, SCOPE_PATH), "utf8"));
    if (!parsed || !Array.isArray(parsed.scope)) return null;
    return { scope: parsed.scope.map(String), set_by: String(parsed.set_by ?? ""), set_at: String(parsed.set_at ?? "") };
  } catch {
    return null; // absent OR unusable => null, which the checker reads as "no explicit scope" and
    // resolves by DELEGATING to the live enforce-writes-scope.cjs default (never by copying its set).
  }
}

export function buildRecord(baseDir, by) {
  const en = enumerate(baseDir);
  if (!en.ok) return { ok: false, reason: en.reason };
  const entries = {};
  let hashed = 0;
  for (const rel of en.paths) {
    const h = hashFile(resolve(baseDir, rel));
    if (h !== null) {
      entries[rel] = h;
      hashed++;
    }
  }
  return {
    ok: true,
    record: {
      version: RECORD_VERSION,
      epoch: new Date().toISOString(),
      anchored_by: by,
      scope_snapshot: snapshotScope(baseDir),
      // Further scopes that came legitimately into force DURING this epoch — see amendScope below.
      // Always an array, never absent, so a reader never branches on presence (a baseline written
      // before this field existed reads as `undefined`, which the checker coerces to `[]`).
      scope_amendments: [],
      entry_count: hashed,
      entries,
    },
  };
}

// Replace a descriptor's ENTIRE contents in place — the fd-addressed equivalent of a path write.
//
// `ftruncateSync` is load-bearing, not ceremony. The `writeFileSync(path, …)` this replaces truncated
// implicitly (`O_TRUNC`); a write through an existing descriptor neither truncates nor seeks, so a record
// that got SHORTER would keep the previous tail behind as trailing garbage. The loop is not decoration
// either: `writeSync` may return a SHORT count, and a silently half-written record is precisely the
// artifact this file exists to keep honest.
//
// HONEST BOUND (P0): this is NOT an atomic replacement, and it never was. Truncate-then-write has a
// window in which a crash leaves a partial record — the same window `O_TRUNC` had. Downstream that is
// not a silent pass: check-bash-reconcile.mjs reports an unparseable baseline as INCONCLUSIVE at exit 2
// (fail-closed, P5). Write-temp-then-rename would close the window at the cost of re-introducing a path
// operation and a second inode; no observed failure asks for it (P7).
function replaceThroughFd(fd, text) {
  const buf = Buffer.from(text, "utf8");
  ftruncateSync(fd, 0);
  let off = 0;
  while (off < buf.length) {
    const n = writeSync(fd, buf, off, buf.length - off, off);
    if (n <= 0) throw new Error(`short write at byte ${off} of ${buf.length}`);
    off += n;
  }
}

// APPEND the currently-live writes-scope to an existing epoch's `scope_amendments`.
//
// WHY THIS EXISTS. An epoch spans build -> ship, and exactly one `scope_snapshot` is taken when it
// OPENS — but a run legitimately writes under SEVERAL scopes inside it. The measured case
// (.dev/features/product-features-relocation/REVIEW.md F3): /pharn-*memory-promote writes canon through
// the Edit tool, past both live PreToolUse guards, behind a human accept — and the reconciler reported
// it as `a write reached it outside the guarded tool surface`, because the epoch's snapshot is the
// BUILD stage's scope. Canon is `never_exempt` by deliberate design, and per lessons-learned L7 the
// build/ship scope may never NAME canon, so no `## Files` declaration can fix it from the plan side.
// Without this, every /pharn-dev-ship run that promotes a lesson ends RED — lessons-learned L17's
// failure mode exactly: a changed-since-anchor test reported as a wrote-outside-scope test, blocking on
// the correct designed workflow.
//
// ORDERING IS LOAD-BEARING, the same way --anchor's is (L38): call this AFTER the stage's own Step-0
// setter, never before, or it appends the PREVIOUS stage's scope and authorizes the wrong paths.
//
// FAIL-CLOSED on every unusable input — no baseline, unreadable/malformed record, or no live scope all
// return `{ok:false}` and write NOTHING. In particular a missing live scope is NOT recorded as an empty
// amendment: `{"scope": []}` is truthy downstream and an empty entry would read as "this stage was
// authorized to write nothing", which is a different claim from "no amendment was made".
//
// HONEST BOUND (P0), and it must not be overstated: this is a Bash call, so anything holding Bash can
// append a scope authorizing anything. That grants NO new power — the same actor could already rewrite
// the baseline outright, which pharn/pharn-contracts/reconciliation-record.md already concedes ("an
// accounting tool against tooling that escapes its scope, NOT a control against an attacker"). This
// increment leaves that bound exactly where it was; it does not tighten the detector.
export function amendScope(baseDir) {
  const abs = resolve(baseDir, RECORD_PATH);
  let fd;
  // ONE descriptor for the read AND the write. The previous shape read the DESCRIPTOR but wrote back
  // with `writeFileSync(abs, …)`, which re-resolves the NAME: between the two the path can be replaced,
  // unlinked or pointed at a symlink, so the file receiving the amendment need not be the file whose
  // bytes were amended. That is CWE-367, and CodeQL reported it (js/file-system-race, high) on the
  // analysis AFTER the read-side fix — the read half was corrected and the write half read as covered
  // (lessons-learned L29). `r+` never creates, so a missing baseline still lands in the ENOENT branch
  // exactly as `"r"` did; what it does add is a WRITE-permission requirement at open time, which is why
  // an unwritable record now fails here rather than at the write (`cannot open`, not `cannot write`).
  try {
    fd = openSync(abs, "r+");
  } catch (e) {
    if (e.code === "ENOENT") {
      return { ok: false, reason: `no baseline at ${RECORD_PATH} — run --anchor first` };
    }
    return { ok: false, reason: `cannot open ${RECORD_PATH}: ${e.message}` };
  }
  try {
    let record;
    try {
      record = JSON.parse(readFileSync(fd, "utf8"));
    } catch (e) {
      return { ok: false, reason: `cannot read ${RECORD_PATH}: ${e.message}` };
    }
    if (!record || typeof record !== "object" || !record.entries) {
      return { ok: false, reason: `${RECORD_PATH} is not a usable baseline record` };
    }
    const live = snapshotScope(baseDir);
    if (live === null) {
      return { ok: false, reason: `no usable writes-scope at ${SCOPE_PATH} — set one before amending` };
    }
    // Coerce rather than branch: a baseline anchored before this field existed has no array yet.
    if (!Array.isArray(record.scope_amendments)) record.scope_amendments = [];
    record.scope_amendments.push(live);
    try {
      replaceThroughFd(fd, JSON.stringify(record, null, 2) + "\n");
    } catch (e) {
      return { ok: false, reason: `cannot write ${RECORD_PATH}: ${e.message}` };
    }
    return { ok: true, amendment: live, count: record.scope_amendments.length };
  } finally {
    try {
      closeSync(fd);
    } catch {
      /* already closed / invalid — nothing to reclaim */
    }
  }
}

function main(argv) {
  const args = argv.slice(2);
  let mode = null;
  let baseDir = ".";
  let by = "unknown";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--anchor" || args[i] === "--show" || args[i] === "--amend-scope") mode = args[i];
    else if (args[i] === "--base") baseDir = args[++i] ?? die("--base requires a directory");
    else if (args[i] === "--by") by = args[++i] ?? die("--by requires a label");
    else die(`unknown argument: ${args[i]}`);
  }
  if (!mode) die("usage: reconcile-baseline.mjs (--anchor | --amend-scope | --show) [--base <dir>] [--by <label>]");

  const root = resolve(baseDir);
  if (!existsSync(root) || !statSync(root).isDirectory()) die(`--base is not a directory: ${baseDir}`);

  if (mode === "--amend-scope") {
    const res = amendScope(root);
    if (!res.ok) die(res.reason, 2);
    process.stdout.write(
      `reconcile scope amended: ${res.amendment.scope.length} entr(ies) from ${res.amendment.set_by}` +
        ` (amendment ${res.count}) -> ${RECORD_PATH}\n`
    );
    process.exit(0);
  }

  if (mode === "--show") {
    const abs = resolve(root, RECORD_PATH);
    let fd;
    try {
      fd = openSync(abs, "r");
      process.stdout.write(readFileSync(fd, "utf8"));
    } catch (e) {
      if (e.code === "ENOENT") die(`no baseline at ${RECORD_PATH} — run --anchor first`, 2);
      die(`cannot read ${RECORD_PATH}: ${e.message}`, 2);
    } finally {
      if (fd !== undefined) {
        try {
          closeSync(fd);
        } catch {
          /* already closed / invalid — nothing to reclaim */
        }
      }
    }
    process.exit(0);
  }

  const built = buildRecord(root, by);
  if (!built.ok) die(built.reason);
  // D6 (6.23.0): --anchor REFUSES to open an epoch with no usable scope to snapshot. Before this, a
  // build that skipped its own Step-0 setter (or ran it against a plan with no parseable `## Files`)
  // still anchored successfully with `scope_snapshot: null`, and the checker's no-scope delegation
  // silently absorbed the gap. `{"scope": []}` IS a scope (an explicit "write nothing") and anchors.
  if (built.record.scope_snapshot === null) {
    die("no usable writes-scope at .pharn/writes-scope.json — run the stage's scope-setter first");
  }
  const abs = resolve(root, RECORD_PATH);
  try {
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, JSON.stringify(built.record, null, 2) + "\n");
  } catch (e) {
    die(`cannot write ${RECORD_PATH}: ${e.message}`);
  }
  const s = built.record.scope_snapshot;
  process.stdout.write(
    `reconcile baseline anchored: ${built.record.entry_count} path(s), scope ` +
      (s ? `${s.scope.length} entr(ies) from ${s.set_by}` : "(none set — fail-closed default)") +
      ` -> ${RECORD_PATH}\n`
  );
  process.exit(0);
}

if (import.meta.main) main(process.argv);
