// pharn/floor/reconcile-baseline.test.mjs — behaviour pins for the reconciliation ANCHOR.
//
// ★ = a case the increment exists for.  ✧ = a PIN.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
  symlinkSync,
  unlinkSync,
  chmodSync,
  lstatSync,
} from "node:fs";
import { join, dirname, resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import { enumerate, hashFile, snapshotScope, buildRecord, RECORD_VERSION, RECORD_PATH, SCOPE_PATH } from "./reconcile-baseline.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ANCHOR = join(HERE, "reconcile-baseline.mjs");
const made = [];

function makeRepo() {
  const dir = mkdtempSync(join(tmpdir(), "pharn-anchor-test-"));
  made.push(dir);
  const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "pipe" });
  git("init", "-q");
  git("config", "user.email", "t@example.invalid");
  git("config", "user.name", "t");
  writeFileSync(join(dir, ".gitignore"), "ignored/\n.pharn/\n");
  writeFileSync(join(dir, "tracked.md"), "a\n");
  mkdirSync(join(dir, "ignored"), { recursive: true });
  writeFileSync(join(dir, "ignored/secret.txt"), "invisible\n");
  git("add", "-A");
  git("commit", "-q", "-m", "seed");
  return dir;
}

process.on("exit", () => {
  for (const d of made) {
    try {
      rmSync(d, { recursive: true, force: true });
    } catch {
      /* best-effort */
    }
  }
});

// D6 (6.24.0): --anchor now REFUSES with no usable scope to snapshot, so every happy-path anchor fixture
// below must set one first — exactly what both shipped callers (/pharn-build, /pharn-dev-build) already do.
function seedScope(dir, scope) {
  mkdirSync(join(dir, ".pharn"), { recursive: true });
  writeFileSync(join(dir, SCOPE_PATH), JSON.stringify({ scope, set_by: "pharn/features/x/PLAN.md", set_at: "T" }));
}

test("★ the reconciled set is tracked ∪ untracked-not-ignored — git-ignored paths are absent BY DERIVATION", () => {
  const dir = makeRepo();
  writeFileSync(join(dir, "untracked.md"), "b\n");
  const en = enumerate(dir);
  assert.ok(en.ok);
  assert.ok(en.paths.includes("tracked.md"));
  assert.ok(en.paths.includes("untracked.md"), "an untracked, non-ignored file IS reconciled");
  assert.ok(!en.paths.includes("ignored/secret.txt"), "a git-ignored file is never enumerated");
});

test("★ the scope is SNAPSHOTTED into the record, not left to be read live (L38)", () => {
  const dir = makeRepo();
  mkdirSync(join(dir, ".pharn"), { recursive: true });
  writeFileSync(join(dir, SCOPE_PATH), JSON.stringify({ scope: ["a.md", "b.md"], set_by: "pharn/features/x/PLAN.md", set_at: "T" }));
  const built = buildRecord(dir, "test");
  assert.ok(built.ok);
  assert.deepEqual(built.record.scope_snapshot.scope, ["a.md", "b.md"]);
  assert.equal(built.record.scope_snapshot.set_by, "pharn/features/x/PLAN.md");

  // The live file changing afterwards must NOT change what the record says — that is the whole point.
  writeFileSync(join(dir, SCOPE_PATH), JSON.stringify({ scope: ["LATER.md"], set_by: "pharn/features/verify/PLAN.md", set_at: "T2" }));
  assert.deepEqual(built.record.scope_snapshot.scope, ["a.md", "b.md"]);
});

test("an absent or unusable scope file snapshots as null — never as an empty allow-list", () => {
  const dir = makeRepo();
  assert.equal(snapshotScope(dir), null, "absent => null");
  mkdirSync(join(dir, ".pharn"), { recursive: true });
  writeFileSync(join(dir, SCOPE_PATH), "{ not json");
  assert.equal(snapshotScope(dir), null, "unparseable => null");
  writeFileSync(join(dir, SCOPE_PATH), JSON.stringify({ set_by: "x" }));
  assert.equal(snapshotScope(dir), null, "no scope array => null");
  // null is read downstream as "no explicit scope", which DELEGATES to the live hook's fail-closed
  // default. An empty array would instead read as "an explicit scope allowing nothing" — a different,
  // and wrong, answer.
});

test("hashFile returns null for a directory or a missing path, never a fabricated digest", () => {
  const dir = makeRepo();
  assert.equal(hashFile(join(dir, "nope.md")), null);
  assert.equal(hashFile(join(dir, "ignored")), null, "a directory is not a file");
  assert.match(hashFile(join(dir, "tracked.md")), /^[0-9a-f]{64}$/);
});

// The TOCTOU pair has TWO members — the read AND the write — and the first version of this test
// asserted the read half only (`openSync` + `readFileSync(fd)`), which read as a discharged rule while
// `writeFileSync(abs, …)` still re-resolved the name two lines later. CodeQL reported exactly that on
// the next analysis (js/file-system-race, high). Per lessons-learned L29, the deliverable for a rule
// quantified over a set is the ENUMERATION with the assertion iterating it — so this ranges over every
// `*Sync(abs` call in the region rather than over the members someone thought to name. That also closes
// L36's variant-spelling hole: a `renameSync(abs`/`appendFileSync(abs` added later needs no new rule.
test("★ amendScope reads AND writes ONE descriptor — exactly one path-addressed call, the open (CWE-367)", () => {
  const src = readFileSync(join(HERE, "reconcile-baseline.mjs"), "utf8");
  const region = src.slice(src.indexOf("function replaceThroughFd"), src.indexOf("function main(argv)"));
  // Comments are stripped before the enumeration runs, or the rationale ABOVE the fix — which quotes the
  // `writeFileSync(abs, …)` call it removed — reads as the defect and the rule can never be satisfied by
  // a correct file. The assertion is over CODE; prose is not evidence either way.
  const code = region.replace(/\/\/.*$/gm, "");
  assert.deepEqual(
    code.match(/\b\w+Sync\(abs\b/g),
    ["openSync(abs"],
    "after the open, every operation must address the fd — a path-addressed call re-resolves the name"
  );
  assert.match(code, /openSync\(abs, "r\+"\)/, "one READ-WRITE descriptor, so the write needs no second open");
  assert.match(code, /readFileSync\(fd, "utf8"\)/, "must read the DESCRIPTOR, not the path");
  assert.match(code, /ftruncateSync\(fd, 0\)/, "a write through an fd does not truncate — a shorter record would keep its tail");
  assert.match(code, /writeSync\(fd, buf, off/, "must write the DESCRIPTOR at an explicit offset");
  assert.match(code, /closeSync\(fd\)/, "the descriptor must be released on every path");
});

test("★ hashFile hashes what it INSPECTED — no check-then-reopen-by-name (CWE-367)", () => {
  // A baseline that can be made to hash a different file than it stat'd cannot support the integrity
  // claim its own header makes. The fix is structural: one descriptor, opened once, fstat'd and read
  // through that same fd. Pinned by reading the source, because the race window is not reachable
  // deterministically from a test — an assertion that "raced correctly" would be a flake, not a proof.
  //
  // The rule is a CLOSURE over every path-addressed `*Sync(abs` call in the region, not a list of the two
  // calls someone thought to forbid (L36). The region runs from `hashFile` to `snapshotScope`, so it holds
  // the link-text helper too: `readlinkSync(abs` is the ONE sanctioned second call. It reads a property of
  // the NAME in one syscall and never hashes bytes it did not inspect. A `statSync(abs` or
  // `readFileSync(abs` added later fails here without a new rule. Comments are stripped first, because the
  // rationale above the function quotes calls it does not make.
  //
  // 6.20.8 — ORDERED, and NO-FOLLOW: the open comes first and must never follow a link (L59: a follow-call
  // answers for the target), so its flags must carry O_NOFOLLOW; readlink is asked only after it fails, and the
  // branch never reads the open's errno (the platform's code for "that was a link" is not what decides).
  const src = readFileSync(join(HERE, "reconcile-baseline.mjs"), "utf8");
  const body = src.slice(src.indexOf("export function hashFile"), src.indexOf("export function snapshotScope"));
  const code = body.replace(/\/\/.*$/gm, "");
  assert.deepEqual(
    code.match(/\b\w+Sync\(abs\b/g),
    ["openSync(abs", "readlinkSync(abs"],
    "one no-follow open, then the link-text read — every other operation must address the fd"
  );
  assert.match(code, /openSync\(abs, NO_FOLLOW_READ\)/, 'the open must use the no-follow flag set, never a plain "r"');
  assert.match(
    src,
    /const NO_FOLLOW_READ = fsConstants\.O_RDONLY \| \(fsConstants\.O_NOFOLLOW \?\? 0\) \| \(fsConstants\.O_NONBLOCK \?\? 0\);/,
    "the flag set is the repo's no-follow, non-blocking read idiom"
  );
  assert.doesNotMatch(code, /\.code\b/, "the fallback must ask readlink, never branch on the open's errno");
  assert.match(code, /fstatSync\(fd\)/, "must stat the DESCRIPTOR, not the path");
  assert.match(code, /readFileSync\(fd\)/, "must read the DESCRIPTOR, not the path");
  assert.match(code, /readlinkSync\(abs, \{ encoding: "buffer" \}\)/, "the link text is hashed as raw BYTES, never a decoded string");
  assert.match(code, /closeSync\(fd\)/, "the descriptor must be released on every path");
});

test("hashFile does not leak descriptors across many calls", () => {
  const dir = makeRepo();
  const target = join(dir, "tracked.md");
  symlinkSync("ignored", join(dir, "dir-link"));
  const first = hashFile(target);
  for (let i = 0; i < 300; i++) hashFile(target);
  for (let i = 0; i < 300; i++) hashFile(join(dir, "nope.md")); // the throwing path releases too
  for (let i = 0; i < 300; i++) hashFile(join(dir, "dir-link")); // an OPENED fd that falls back to link text
  assert.equal(hashFile(target), first, "still readable after 900 opens — nothing was leaked");
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// SYMLINKS — hashFile's answer for EVERY kind of path `git ls-files --cached --others` can hand it.
// Trigger: .dev/features/reconcile-symlink-hash/PLAN.md. A tracked directory symlink returned null, so the
// anchor never recorded it and every reconcile reported it as a Bash escape; downstream that ended every
// /pharn-loop run STOP_TERMINAL with zero writes.
//
// The set is materialized ONCE and every rule below iterates it (L29, L52). `linkText` marks a kind hashed by
// its link text; `expect` gives the answer for the others. 6.20.8 (.dev/features/reconcile-symlink-target/):
// EVERY symlink row is a link-text row now — a link to a regular file included — and three rows were added:
// a link to a FIFO (never opened, so it cannot block), a FIFO that is not a link (O_NONBLOCK), and an
// unreadable regular file (where the 6.17.1 "make it unreadable" guard now lives — on the target's own entry).

const sha = (...parts) => parts.reduce((h, p) => h.update(p), createHash("sha256")).digest("hex");
const IS_ROOT = typeof process.getuid === "function" && process.getuid() === 0;
// mkfifo is POSIX, not Node; probe it once so a platform without it SKIPS the FIFO rows by name.
const HAVE_MKFIFO = (() => {
  const d = mkdtempSync(join(tmpdir(), "pharn-fifo-probe-"));
  try {
    return spawnSync("mkfifo", [join(d, "p")]).status === 0;
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
})();
const mkfifo = (p) => execFileSync("mkfifo", [p]);

const PATH_KINDS = [
  {
    kind: "regular file",
    make: (d) => (writeFileSync(join(d, "f.txt"), "hello"), "f.txt"),
    expect: () => sha("hello"),
  },
  {
    // 6.20.8: the TARGET's bytes no longer — they are the target's own entry, judged under its own path.
    kind: "symlink to a regular file",
    linkText: "t.txt",
    make: (d) => (writeFileSync(join(d, "t.txt"), "target bytes"), symlinkSync("t.txt", join(d, "l")), "l"),
  },
  {
    kind: "symlink to a FIFO",
    linkText: "p",
    skip: !HAVE_MKFIFO && "no mkfifo on this platform",
    make: (d) => (mkfifo(join(d, "p")), symlinkSync("p", join(d, "l")), "l"),
  },
  {
    kind: "symlink to a directory",
    linkText: "sub",
    make: (d) => (mkdirSync(join(d, "sub")), symlinkSync("sub", join(d, "l")), "l"),
  },
  {
    kind: "dangling symlink",
    linkText: "nowhere",
    make: (d) => (symlinkSync("nowhere", join(d, "l")), "l"),
  },
  {
    kind: "symlink through a regular file",
    linkText: "t.txt/inner",
    make: (d) => (writeFileSync(join(d, "t.txt"), "x"), symlinkSync("t.txt/inner", join(d, "l")), "l"),
  },
  {
    kind: "symlink loop",
    linkText: "l",
    make: (d) => (symlinkSync("l", join(d, "l")), "l"),
  },
  {
    kind: "plain directory",
    make: (d) => (mkdirSync(join(d, "sub")), "sub"),
    expect: () => null,
  },
  {
    kind: "missing path",
    make: () => "absent",
    expect: () => null,
  },
  {
    // 6.20.8: the link is hashed by its text like every other link — the target is never opened through it.
    // The "make the target unreadable to hide a change" evasion 6.17.1 guarded here is refused one row down,
    // on the TARGET's own entry (L51: re-justified against the new input domain, not deleted as unreachable).
    kind: "symlink to an unreadable regular file",
    linkText: "t.txt",
    make: (d) => (writeFileSync(join(d, "t.txt"), "secret"), chmodSync(join(d, "t.txt"), 0o000), symlinkSync("t.txt", join(d, "l")), "l"),
  },
  {
    // FAIL-CLOSED: an unreadable file is null, so it stays a reconcile candidate ("treated as changed").
    kind: "unreadable regular file",
    skip: IS_ROOT && "root reads a mode-000 file, so the unreadable state cannot be built",
    make: (d) => (writeFileSync(join(d, "t.txt"), "secret"), chmodSync(join(d, "t.txt"), 0o000), "t.txt"),
    expect: () => null,
  },
  {
    // git never enumerates one (measured); reachable only by a race after enumeration. O_NONBLOCK means the
    // open returns instead of waiting for a writer, and it is not a regular file, so null.
    kind: "FIFO (not a link)",
    skip: !HAVE_MKFIFO && "no mkfifo on this platform",
    make: (d) => (mkfifo(join(d, "p")), "p"),
    expect: () => null,
  },
];

function scratch() {
  const dir = mkdtempSync(join(tmpdir(), "pharn-hash-kind-"));
  made.push(dir);
  return dir;
}

const expected = (k) => (k.linkText !== undefined ? sha(`symlink\0${k.linkText}`) : k.expect());

for (const k of PATH_KINDS) {
  test(`★ PATH_KINDS — ${k.kind}: ${k.linkText !== undefined ? "hashed by its link text" : "unchanged rule"}`, { skip: k.skip }, () => {
    const dir = scratch();
    const abs = join(dir, k.make(dir));
    assert.equal(hashFile(abs), expected(k));
    assert.equal(hashFile(abs), expected(k), "hashing is stable across calls");
  });
}

test("★ every link-text kind: RE-POINTING the link changes the digest — detection is kept, not exempted", () => {
  const kinds = PATH_KINDS.filter((k) => k.linkText !== undefined && !k.skip);
  assert.ok(kinds.length >= 6, "non-vacuity (L34): the rule must range over the link-text kinds");
  assert.ok(
    kinds.some((k) => k.kind === "symlink to a regular file"),
    "the kind 6.20.8 moved onto link text is in the range"
  );
  for (const k of kinds) {
    const dir = scratch();
    const abs = join(dir, k.make(dir));
    const before = hashFile(abs);
    unlinkSync(abs);
    symlinkSync("somewhere-else", abs);
    assert.notEqual(hashFile(abs), before, `${k.kind}: a re-pointed link must read as changed`);
  }
});

test("✧ CLOSURE (6.20.8): a row is hashed by its link text IF AND ONLY IF the path IS a symlink — every link, any target", () => {
  // Replaces the 6.17.1 LINK_TEXT_ERRNOS closure: which FOLLOW failures fell back to link text stopped being a
  // question when nothing follows a link. "Is it a link?" is asked here of lstat, which never follows (L59),
  // and ranged over every row in both directions (L36), so a symlink row left on content hashing fails, and so
  // does a link-text row that is not a link.
  let links = 0;
  for (const k of PATH_KINDS) {
    if (k.skip) continue;
    const dir = scratch();
    const abs = join(dir, k.make(dir));
    let isLink = false;
    try {
      isLink = lstatSync(abs).isSymbolicLink();
    } catch {
      /* missing path: not a link */
    }
    if (isLink) links++;
    assert.equal(k.linkText !== undefined, isLink, `${k.kind}: link-text iff symlink`);
  }
  assert.ok(links >= 6, "non-vacuity (L34): the closure ranges over the link kinds");
});

test("★ a link RE-POINTED between two files with IDENTICAL bytes changes its digest (unseen through 6.20.7)", () => {
  // Up to 6.20.7 a link to a regular file hashed its target's BYTES, so this re-point read as unchanged.
  const dir = scratch();
  writeFileSync(join(dir, "a.md"), "same bytes\n");
  writeFileSync(join(dir, "b.md"), "same bytes\n");
  symlinkSync("a.md", join(dir, "l"));
  const before = hashFile(join(dir, "l"));
  unlinkSync(join(dir, "l"));
  symlinkSync("b.md", join(dir, "l"));
  assert.notEqual(hashFile(join(dir, "l")), before, "the link changed, so its entry must");
  assert.equal(hashFile(join(dir, "a.md")), hashFile(join(dir, "b.md")), "premise: the two targets' bytes are identical");
});

test("★ an edit THROUGH a link moves the TARGET's digest and leaves the LINK's alone — in the tree and out of it", () => {
  const dir = scratch();
  writeFileSync(join(dir, "AGENTS.md"), "agents v1\n");
  symlinkSync("AGENTS.md", join(dir, "CLAUDE.md"));
  const outside = scratch();
  writeFileSync(join(outside, "shared.md"), "outside v1\n");
  symlinkSync(join(outside, "shared.md"), join(dir, "ext"));
  const link = hashFile(join(dir, "CLAUDE.md"));
  const target = hashFile(join(dir, "AGENTS.md"));
  const ext = hashFile(join(dir, "ext"));
  writeFileSync(join(dir, "CLAUDE.md"), "agents v2\n"); // written THROUGH the link
  writeFileSync(join(outside, "shared.md"), "outside v2\n");
  assert.equal(hashFile(join(dir, "CLAUDE.md")), link, "the link did not change");
  assert.notEqual(hashFile(join(dir, "AGENTS.md")), target, "the target's own entry carries the edit");
  assert.equal(hashFile(join(dir, "ext")), ext, "a target outside the tree is not a change to the link");
});

test("★ downstream compatibility: a valid-UTF-8 link hashes exactly sha256('symlink\\0' + text)", () => {
  // pharn-starter shipped this formula as a local patch (its PR #93) and pins it in its own tests; a
  // baseline it anchored with that patch must reconcile consistently with this module.
  const dir = scratch();
  symlinkSync("nowhere", join(dir, "dangling"));
  assert.equal(hashFile(join(dir, "dangling")), createHash("sha256").update("symlink\0nowhere").digest("hex"));
});

test("★ a non-UTF-8 link target is hashed by its raw bytes — two targets that decode alike stay distinct", (t) => {
  // Both targets decode to "a�" as a UTF-8 string. A string read would hash them EQUAL, so re-pointing
  // one to the other would go unseen (GRILL finding 1).
  const dir = scratch();
  const one = Buffer.from([0x61, 0xff]);
  const two = Buffer.from([0x61, 0xfe]);
  try {
    symlinkSync(one, join(dir, "one"));
    symlinkSync(two, join(dir, "two"));
  } catch (e) {
    t.skip(`this filesystem refuses a non-UTF-8 link target (${e.code})`);
    return;
  }
  assert.equal(one.toString("utf8"), two.toString("utf8"), "premise: the two targets decode to the same string");
  assert.equal(hashFile(join(dir, "one")), sha("symlink\0", one));
  assert.notEqual(hashFile(join(dir, "one")), hashFile(join(dir, "two")));
});

test("★ the ANCHOR records a tracked directory symlink and a dangling one — the entries the false ESCAPE lacked", () => {
  const dir = makeRepo();
  symlinkSync("ignored", join(dir, "dir-link"));
  symlinkSync("nowhere", join(dir, "dangling"));
  symlinkSync("tracked.md", join(dir, "file-link")); // 6.20.8: a link to a regular file, by its text too
  execFileSync("git", ["add", "dir-link", "dangling", "file-link"], { cwd: dir, stdio: "pipe" });
  const rec = buildRecord(dir, "t").record;
  assert.equal(rec.entries["dir-link"], sha("symlink\0ignored"));
  assert.equal(rec.entries["dangling"], sha("symlink\0nowhere"));
  assert.equal(rec.entries["file-link"], sha("symlink\0tracked.md"));
  assert.notEqual(rec.entries["file-link"], rec.entries["tracked.md"], "never the target's content digest");
  assert.equal(rec.entry_count, Object.keys(rec.entries).length);
});

test("★ the same bytes hash the same; one changed byte changes the digest", () => {
  const dir = makeRepo();
  const before = buildRecord(dir, "t").record.entries["tracked.md"];
  writeFileSync(join(dir, "tracked.md"), "a\n");
  assert.equal(buildRecord(dir, "t").record.entries["tracked.md"], before, "identical bytes => identical digest");
  writeFileSync(join(dir, "tracked.md"), "b\n");
  assert.notEqual(buildRecord(dir, "t").record.entries["tracked.md"], before);
});

test("--anchor writes a well-shaped record and reports its counts", () => {
  const dir = makeRepo();
  seedScope(dir, ["tracked.md"]);
  const r = spawnSync(process.execPath, [ANCHOR, "--anchor", "--base", dir, "--by", "pharn-build"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /reconcile baseline anchored: \d+ path\(s\)/);
  const rec = JSON.parse(readFileSync(join(dir, RECORD_PATH), "utf8"));
  assert.equal(rec.version, RECORD_VERSION);
  assert.equal(rec.anchored_by, "pharn-build");
  assert.equal(rec.entry_count, Object.keys(rec.entries).length, "entry_count agrees with entries");
  assert.match(rec.epoch, /^\d{4}-\d{2}-\d{2}T/);
});

test("`anchored_by` is argv — a LABEL, never an authorization (stated in the contract)", () => {
  const dir = makeRepo();
  seedScope(dir, ["tracked.md"]);
  spawnSync(process.execPath, [ANCHOR, "--anchor", "--base", dir, "--by", "totally-legit"], { encoding: "utf8" });
  const rec = JSON.parse(readFileSync(join(dir, RECORD_PATH), "utf8"));
  assert.equal(rec.anchored_by, "totally-legit");
  // Nothing validates it, and nothing should read it as a permission. Pinned so a future change that
  // starts branching on this field has to delete this test and explain itself.
  const src = readFileSync(join(HERE, "check-bash-reconcile.mjs"), "utf8");
  const branching = /if\s*\([^)]*anchored_by/.test(src);
  assert.equal(branching, false, "the checker must not branch on anchored_by");
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// D6 (6.24.0) — --anchor REFUSES to open an epoch with no usable scope to snapshot.

test("★ D6: --anchor with NO scope file exits 2, names the remedy, and writes nothing", () => {
  const dir = makeRepo(); // no .pharn/writes-scope.json at all
  const r = spawnSync(process.execPath, [ANCHOR, "--anchor", "--base", dir, "--by", "pharn-build"], { encoding: "utf8" });
  assert.equal(r.status, 2, r.stdout);
  assert.match(r.stderr, /no usable writes-scope/);
  assert.match(r.stderr, /scope-setter/);
  assert.equal(existsSync(join(dir, RECORD_PATH)), false, "nothing is written on refusal");
});

test("★ D6: --anchor with a MALFORMED scope record exits 2 and writes nothing", () => {
  const dir = makeRepo();
  mkdirSync(join(dir, ".pharn"), { recursive: true });
  writeFileSync(join(dir, SCOPE_PATH), "{ not json");
  const r = spawnSync(process.execPath, [ANCHOR, "--anchor", "--base", dir, "--by", "pharn-build"], { encoding: "utf8" });
  assert.equal(r.status, 2, r.stdout);
  assert.equal(existsSync(join(dir, RECORD_PATH)), false);
});

test('★ D6: an EXPLICIT empty scope ({"scope": []}) IS a scope and anchors normally', () => {
  const dir = makeRepo();
  seedScope(dir, []);
  const r = spawnSync(process.execPath, [ANCHOR, "--anchor", "--base", dir, "--by", "pharn-build"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const rec = JSON.parse(readFileSync(join(dir, RECORD_PATH), "utf8"));
  assert.deepEqual(rec.scope_snapshot.scope, [], "an empty array is a REAL scope, not null");
});

test("fail-closed: a non-directory --base, a bad flag, and a non-git dir all exit 2", () => {
  const dir = makeRepo();
  assert.equal(spawnSync(process.execPath, [ANCHOR, "--anchor", "--base", join(dir, "tracked.md")], { encoding: "utf8" }).status, 2);
  assert.equal(spawnSync(process.execPath, [ANCHOR, "--bogus"], { encoding: "utf8" }).status, 2);
  assert.equal(spawnSync(process.execPath, [ANCHOR], { encoding: "utf8" }).status, 2, "no mode is a refusal, not a default");
  const plain = mkdtempSync(join(tmpdir(), "pharn-anchor-nogit-"));
  made.push(plain);
  assert.equal(spawnSync(process.execPath, [ANCHOR, "--anchor", "--base", plain], { encoding: "utf8" }).status, 2);
});

test("--show refuses when nothing has been anchored", () => {
  const dir = makeRepo();
  const r = spawnSync(process.execPath, [ANCHOR, "--show", "--base", dir], { encoding: "utf8" });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /run --anchor first/);
});

test("✧ the record path is under .pharn/, which is gitignored — the baseline is never committed", () => {
  assert.ok(RECORD_PATH.startsWith(".pharn/"), "the baseline must be disposable runtime state");
  const gi = readFileSync(resolve(HERE, "..", "..", ".gitignore"), "utf8");
  assert.match(gi, /^\.pharn\/$/m, "this repo must still gitignore .pharn/ for that to hold");
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// --amend-scope — an epoch may hold MORE THAN ONE authorized scope.
// Trigger: .dev/features/product-features-relocation/REVIEW.md F3 (a promote-stage canon write,
// hook-approved and human-accepted, reported as a Bash escape because the epoch's snapshot is the
// BUILD stage's scope).

function anchored(dir, scope) {
  mkdirSync(join(dir, ".pharn"), { recursive: true });
  if (scope) writeFileSync(join(dir, SCOPE_PATH), JSON.stringify(scope));
  execFileSync(process.execPath, [ANCHOR, "--anchor", "--base", dir, "--by", "test"], { stdio: "pipe" });
  return () => JSON.parse(readFileSync(join(dir, RECORD_PATH), "utf8"));
}

test("★ a fresh anchor carries scope_amendments as an EMPTY ARRAY, never absent", () => {
  const dir = makeRepo();
  const built = buildRecord(dir, "test");
  assert.ok(built.ok);
  assert.deepEqual(built.record.scope_amendments, [], "always an array, so no reader branches on presence");
});

test("★ --amend-scope APPENDS the live scope to an existing epoch, preserving the opening snapshot", () => {
  const dir = makeRepo();
  const read = anchored(dir, { scope: ["build.md"], set_by: "PLAN.md", set_at: "T1" });
  writeFileSync(
    join(dir, SCOPE_PATH),
    JSON.stringify({ scope: ["canon.md"], set_by: ".claude/commands/pharn-dev-memory-promote.md", set_at: "T2" })
  );
  const r = spawnSync(process.execPath, [ANCHOR, "--amend-scope", "--base", dir], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);

  const rec = read();
  assert.deepEqual(rec.scope_snapshot.scope, ["build.md"], "the OPENING snapshot is never overwritten");
  assert.equal(rec.scope_amendments.length, 1);
  assert.deepEqual(rec.scope_amendments[0].scope, ["canon.md"]);
  assert.equal(rec.scope_amendments[0].set_by, ".claude/commands/pharn-dev-memory-promote.md");
});

// The write side's one behavioural risk, exercised rather than reasoned about: a write through an
// existing descriptor does not truncate, so without ftruncateSync a record that shrinks keeps the
// previous tail. 4 KiB of trailing whitespace is JSON-LEGAL, so the amend still parses its input — and
// the padding survives verbatim into the output if the truncate is dropped. Delete the `ftruncateSync`
// line and this test fails; that is what makes it a check rather than a restatement.
test("★ --amend-scope REPLACES the record — a longer prior file leaves no trailing bytes", () => {
  const dir = makeRepo();
  const read = anchored(dir, { scope: ["build.md"], set_by: "PLAN.md", set_at: "T1" });
  const abs = join(dir, RECORD_PATH);
  writeFileSync(abs, readFileSync(abs, "utf8") + " ".repeat(4096));
  writeFileSync(join(dir, SCOPE_PATH), JSON.stringify({ scope: ["canon.md"], set_by: "promote", set_at: "T2" }));

  const r = spawnSync(process.execPath, [ANCHOR, "--amend-scope", "--base", dir], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);

  const raw = readFileSync(abs, "utf8");
  assert.equal(raw, JSON.stringify(JSON.parse(raw), null, 2) + "\n", "the previous tail must not survive the rewrite");
  assert.equal(read().scope_amendments.length, 1, "and the amendment itself still landed");
});

test("★ --amend-scope is ORDERED and cumulative — several stages inside one epoch each append", () => {
  const dir = makeRepo();
  const read = anchored(dir, { scope: ["build.md"], set_by: "PLAN.md", set_at: "T1" });
  for (const [p, by] of [
    ["a.md", "one"],
    ["b.md", "two"],
  ]) {
    writeFileSync(join(dir, SCOPE_PATH), JSON.stringify({ scope: [p], set_by: by, set_at: "T" }));
    execFileSync(process.execPath, [ANCHOR, "--amend-scope", "--base", dir], { stdio: "pipe" });
  }
  const rec = read();
  assert.deepEqual(
    rec.scope_amendments.map((a) => a.set_by),
    ["one", "two"],
    "append order is the call order"
  );
});

// L41: the no-baseline and no-live-scope paths are the ones a hermetic suite skips, so they are
// exercised explicitly rather than assumed.
test("★ FAIL-CLOSED: --amend-scope with NO baseline writes nothing and exits 2", () => {
  const dir = makeRepo();
  const r = spawnSync(process.execPath, [ANCHOR, "--amend-scope", "--base", dir], { encoding: "utf8" });
  assert.equal(r.status, 2, "an epoch that was never opened cannot be amended");
  assert.match(r.stderr, /--anchor first/);
  assert.ok(!existsSync(join(dir, RECORD_PATH)), "nothing is written");
});

test("★ FAIL-CLOSED: --amend-scope with NO live scope records NOTHING, not an empty amendment", () => {
  const dir = makeRepo();
  const read = anchored(dir, { scope: ["build.md"], set_by: "PLAN.md", set_at: "T1" });
  rmSync(join(dir, SCOPE_PATH), { force: true });
  const r = spawnSync(process.execPath, [ANCHOR, "--amend-scope", "--base", dir], { encoding: "utf8" });
  assert.equal(r.status, 2, r.stdout);
  assert.deepEqual(read().scope_amendments, [], "an empty amendment would read as 'authorized to write nothing' — a different claim");
});

test("★ a baseline written BEFORE scope_amendments existed is amendable — the field is coerced, not required", () => {
  const dir = makeRepo();
  const read = anchored(dir, { scope: ["build.md"], set_by: "PLAN.md", set_at: "T1" });
  const legacy = read();
  delete legacy.scope_amendments;
  writeFileSync(join(dir, RECORD_PATH), JSON.stringify(legacy, null, 2) + "\n");
  writeFileSync(join(dir, SCOPE_PATH), JSON.stringify({ scope: ["canon.md"], set_by: "promote", set_at: "T2" }));
  const r = spawnSync(process.execPath, [ANCHOR, "--amend-scope", "--base", dir], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(read().scope_amendments.length, 1);
});
