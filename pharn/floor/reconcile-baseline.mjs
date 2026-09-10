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
// Usage:
//   node pharn/floor/reconcile-baseline.mjs --anchor [--base <dir>] [--by <label>]
//   node pharn/floor/reconcile-baseline.mjs --show   [--base <dir>]
//
// Exit: 0 ok · 2 unusable input / git unavailable / write failed — FAIL-CLOSED (P5). Never a silent pass.

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, openSync, fstatSync, closeSync } from "node:fs";
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
export function hashFile(abs) {
  let fd;
  try {
    fd = openSync(abs, "r");
    if (!fstatSync(fd).isFile()) return null; // a directory or special file is not a hashable entry
    return createHash("sha256").update(readFileSync(fd)).digest("hex");
  } catch {
    return null; // unreadable / vanished between enumeration and read — recorded as absent, never guessed
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
  if (!existsSync(abs)) return { ok: false, reason: `no baseline at ${RECORD_PATH} — run --anchor first` };
  let record;
  try {
    record = JSON.parse(readFileSync(abs, "utf8"));
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
    writeFileSync(abs, JSON.stringify(record, null, 2) + "\n");
  } catch (e) {
    return { ok: false, reason: `cannot write ${RECORD_PATH}: ${e.message}` };
  }
  return { ok: true, amendment: live, count: record.scope_amendments.length };
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
    if (!existsSync(abs)) die(`no baseline at ${RECORD_PATH} — run --anchor first`, 2);
    process.stdout.write(readFileSync(abs, "utf8"));
    process.exit(0);
  }

  const built = buildRecord(root, by);
  if (!built.ok) die(built.reason);
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
