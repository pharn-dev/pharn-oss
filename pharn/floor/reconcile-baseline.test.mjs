// pharn/floor/reconcile-baseline.test.mjs — behaviour pins for the reconciliation ANCHOR.
//
// ★ = a case the increment exists for.  ✧ = a PIN.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
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
  const src = readFileSync(join(HERE, "reconcile-baseline.mjs"), "utf8");
  const body = src.slice(src.indexOf("export function hashFile"), src.indexOf("export function snapshotScope"));
  assert.match(body, /openSync\(/, "must open a descriptor");
  assert.match(body, /fstatSync\(fd\)/, "must stat the DESCRIPTOR, not the path");
  assert.match(body, /readFileSync\(fd\)/, "must read the DESCRIPTOR, not the path");
  assert.ok(!/statSync\(abs\)/.test(body), "a path-based stat here is the TOCTOU pattern this replaced");
  assert.ok(!/readFileSync\(abs\)/.test(body), "a path-based read here reopens by name — the race");
  assert.match(body, /closeSync\(fd\)/, "the descriptor must be released on every path");
});

test("hashFile does not leak descriptors across many calls", () => {
  const dir = makeRepo();
  const target = join(dir, "tracked.md");
  const first = hashFile(target);
  for (let i = 0; i < 300; i++) hashFile(target);
  for (let i = 0; i < 300; i++) hashFile(join(dir, "nope.md")); // the throwing path releases too
  assert.equal(hashFile(target), first, "still readable after 600 opens — nothing was leaked");
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
  spawnSync(process.execPath, [ANCHOR, "--anchor", "--base", dir, "--by", "totally-legit"], { encoding: "utf8" });
  const rec = JSON.parse(readFileSync(join(dir, RECORD_PATH), "utf8"));
  assert.equal(rec.anchored_by, "totally-legit");
  // Nothing validates it, and nothing should read it as a permission. Pinned so a future change that
  // starts branching on this field has to delete this test and explain itself.
  const src = readFileSync(join(HERE, "check-bash-reconcile.mjs"), "utf8");
  const branching = /if\s*\([^)]*anchored_by/.test(src);
  assert.equal(branching, false, "the checker must not branch on anchored_by");
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
