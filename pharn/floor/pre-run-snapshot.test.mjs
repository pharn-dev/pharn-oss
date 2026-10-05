// pharn/floor/pre-run-snapshot.test.mjs — the pre-run snapshot (regress-pre-run-snapshot, 6.37.0): the pure rules
// (pre-run-snapshot-core.mjs), the digest per path kind (L59's PATH_KINDS), the capture CLI, the ★ HOOK proof that the
// write tools cannot reach the record (L65), and the ★ WIRING proof that the two pinned command lines run.
//
// The decision rows are tested as ONE HIT baseline plus a one-input mutation per row, so each row is shown to be what
// flips the result (L60). Tests in this file run sequentially; the in-process ones chdir into a throwaway repository.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
  symlinkSync,
  copyFileSync,
  realpathSync,
  truncateSync,
  unlinkSync,
} from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SNAPSHOT_SCHEMA,
  SNAPSHOT_BASENAME,
  DIGEST_MAX_BYTES,
  DIGEST_ABSENT,
  DIGEST_UNHASHABLE,
  PRE_RUN_MISSES,
  PRE_RUN_STATUSES,
  REASON_CODES,
  buildSnapshot,
  validateSnapshot,
  decidePreRun,
  ENTRY_CHANGES_BASENAME,
  entryBlocks,
} from "./pre-run-snapshot-core.mjs";
import {
  pathDigest,
  preRunUnchanged,
  snapshotPath,
  captureSnapshot,
  recordEntryChanges,
  entryChangesUnchanged,
  clearEntryChanges,
} from "./pre-run-snapshot.mjs";
import { MARKER_AGE_CEILING_MS } from "./regress-base-reuse-core.mjs";
import { RECORD_BASENAME } from "./regress-base-reuse-core.mjs";
import { OFFER_BASENAME } from "./head-reuse-offer.mjs";
import { commandFamilyText } from "../../.dev/floor/command-family.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const CLI = join(HERE, "pre-run-snapshot.mjs");
const RUN_MARKER = join(HERE, "run-marker.mjs");
const LOOP_HOOK = join(ROOT, ".claude", "hooks", "require-loop-record.cjs");
const COMMANDS_DIR = join(ROOT, ".claude", "commands");
const FEATURE = "demo";
const sha256 = (b) => createHash("sha256").update(b).digest("hex");
const CLEAN_ENV = { ...process.env };
delete CLEAN_ENV.NODE_TEST_CONTEXT;

// ── The pure rules ─────────────────────────────────────────────────────────────────────────────────────────────────
const NOW = 1_800_000_000_000;
const BASE = "a".repeat(40);
const LOOP_MARKER = Buffer.from('{"schema":"pharn-loop-active/1","started_at":"t1"}\n');
const marker = (bytes, mtimeMs = NOW) => ({ state: "ok", bytes, mtimeMs });
const ABSENT = { state: "absent" };

function record(overrides = {}) {
  return buildSnapshot({
    feature: FEATURE,
    run: { command: "pharn-loop", markerSha256: sha256(LOOP_MARKER) },
    base: BASE,
    paths: [
      ["src/dirty.ts", "1".repeat(64)],
      ["gone.txt", DIGEST_ABSENT],
      ["vendor/lib/", DIGEST_UNHASHABLE],
      ["pharn/features/old/SPEC.md", "2".repeat(64)],
    ],
    ...overrides,
  });
}

const LIVE = {
  "src/dirty.ts": "1".repeat(64),
  "gone.txt": DIGEST_ABSENT,
  "vendor/lib/": DIGEST_UNHASHABLE,
  "pharn/features/old/SPEC.md": "2".repeat(64),
  "src/new.ts": "3".repeat(64),
};

function hitInput(overrides = {}) {
  return {
    feature: FEATURE,
    base: BASE,
    markers: { "pharn-loop": marker(LOOP_MARKER), "pharn-ship": ABSENT },
    now: NOW,
    record: { state: "ok", bytes: Buffer.from(JSON.stringify(record())) },
    inside: ["src/dirty.ts", "gone.txt", "vendor/lib/", "pharn/features/old/SPEC.md", "src/new.ts"],
    liveDigest: (p) => LIVE[p],
    ...overrides,
  };
}

test("HIT baseline: applied — every recorded path with an equal digest, absent included, unhashable never, a new path never", () => {
  const d = decidePreRun(hitInput());
  assert.equal(d.status, "applied");
  assert.deepEqual(d.unchanged, ["src/dirty.ts", "gone.txt", "pharn/features/old/SPEC.md"]);
});

const MUTATIONS = [
  ["no-delivery-run", "no marker at all", (i) => ({ ...i, markers: { "pharn-loop": ABSENT, "pharn-ship": ABSENT } })],
  ["no-delivery-run", "two markers", (i) => ({ ...i, markers: { ...i.markers, "pharn-ship": marker(Buffer.from("x")) } })],
  [
    "no-delivery-run",
    "a marker past the 24 h age",
    (i) => ({ ...i, markers: { ...i.markers, "pharn-loop": marker(LOOP_MARKER, NOW - MARKER_AGE_CEILING_MS - 1) } }),
  ],
  ["no-delivery-run", "an unusable marker", (i) => ({ ...i, markers: { ...i.markers, "pharn-loop": { state: "unusable" } } })],
  ["no-snapshot", "no record", (i) => ({ ...i, record: ABSENT })],
  ["snapshot-malformed", "an unusable record (a link, FIFO, directory, oversize)", (i) => ({ ...i, record: { state: "unusable" } })],
  ["snapshot-malformed", "a record that is not JSON", (i) => ({ ...i, record: { state: "ok", bytes: Buffer.from("{") } })],
  [
    "snapshot-malformed",
    "a record with an extra key",
    (i) => ({ ...i, record: { state: "ok", bytes: Buffer.from(JSON.stringify({ ...record(), x: 1 })) } }),
  ],
  [
    "other-run",
    "another feature",
    (i) => ({ ...i, record: { state: "ok", bytes: Buffer.from(JSON.stringify(record({ feature: "other" }))) } }),
  ],
  [
    "other-run",
    "a re-opened run (new marker bytes)",
    (i) => ({ ...i, markers: { ...i.markers, "pharn-loop": marker(Buffer.from('{"started_at":"t2"}\n')) } }),
  ],
  [
    "other-run",
    "the other delivery command",
    (i) => ({
      ...i,
      record: {
        state: "ok",
        bytes: Buffer.from(JSON.stringify(record({ run: { command: "pharn-ship", markerSha256: sha256(LOOP_MARKER) } }))),
      },
    }),
  ],
  ["base-changed", "another base", (i) => ({ ...i, base: "b".repeat(40) })],
];

for (const [status, label, mutate] of MUTATIONS) {
  test(`one-input mutation → ${status} (${label}); nothing is subtracted`, () => {
    const d = decidePreRun(mutate(hitInput()));
    assert.equal(d.status, status);
    assert.deepEqual(d.unchanged, []);
  });
}

test("first failure decides: no marker AND no record reads no-delivery-run; the order is PRE_RUN_MISSES", () => {
  assert.equal(decidePreRun({ ...hitInput(), markers: {}, record: ABSENT }).status, "no-delivery-run");
  assert.equal(decidePreRun({ ...hitInput(), record: ABSENT, base: "b".repeat(40) }).status, "no-snapshot");
  assert.deepEqual(PRE_RUN_MISSES, ["no-delivery-run", "no-snapshot", "snapshot-malformed", "other-run", "base-changed"]);
  assert.deepEqual(PRE_RUN_STATUSES, ["applied", ...PRE_RUN_MISSES]);
});

test("✧ CLOSURE (L36) — every status the decision returns is a PRE_RUN_STATUSES member, and every member is reachable", () => {
  const seen = new Set([decidePreRun(hitInput()).status, ...MUTATIONS.map(([, , m]) => decidePreRun(m(hitInput())).status)]);
  assert.deepEqual([...seen].sort(), [...PRE_RUN_STATUSES].sort());
});

test("a changed digest is not subtracted (the build edited a pre-run path), and an absent path the build recreated is not either", () => {
  const live = { ...LIVE, "src/dirty.ts": "9".repeat(64), "gone.txt": "8".repeat(64) };
  const d = decidePreRun(hitInput({ liveDigest: (p) => live[p] }));
  assert.deepEqual(d.unchanged, ["pharn/features/old/SPEC.md"]);
});

test("P2 — liveDigest is asked ONLY for an inside path the record holds with a hash or `absent`; a record path not in inside is never opened", () => {
  const asked = [];
  decidePreRun(
    hitInput({
      inside: ["src/dirty.ts", "src/new.ts", "vendor/lib/"],
      liveDigest: (p) => {
        asked.push(p);
        return LIVE[p];
      },
    })
  );
  assert.deepEqual(asked, ["src/dirty.ts"], "gone.txt and the old SPEC are recorded but not inside; vendor/lib/ is unhashable");
});

test("validateSnapshot: the closed shape, both directions", () => {
  assert.equal(validateSnapshot(record()).ok, true);
  const bad = [
    { ...record(), extra: 1 },
    (() => {
      const r = record();
      delete r.base;
      return r;
    })(),
    { ...record(), schema: "pharn-pre-run-snapshot/2" },
    { ...record(), feature: "Bad/Slug" },
    { ...record(), run: { command: "pharn-review", marker_sha256: "1".repeat(64) } },
    { ...record(), run: { command: "pharn-loop", marker_sha256: "xyz" } },
    { ...record(), run: { command: "pharn-loop", marker_sha256: "1".repeat(64), extra: 1 } },
    { ...record(), base: "HEAD" },
    {
      ...record(),
      paths: [
        ["b", DIGEST_ABSENT],
        ["a", DIGEST_ABSENT],
      ],
    },
    {
      ...record(),
      paths: [
        ["a", DIGEST_ABSENT],
        ["a", DIGEST_ABSENT],
      ],
    },
    { ...record(), paths: [["a", "deadbeef"]] },
    { ...record(), paths: [["", DIGEST_ABSENT]] },
    { ...record(), paths: [["a\0b", DIGEST_ABSENT]] },
    { ...record(), paths: [["a".repeat(4097), DIGEST_ABSENT]] },
    { ...record(), paths: [["a", DIGEST_ABSENT, "x"]] },
    { ...record(), paths: "a" },
    null,
    [],
  ];
  for (const r of bad) assert.equal(validateSnapshot(r).ok, false, JSON.stringify(r)?.slice(0, 120));
  assert.equal(record().schema, SNAPSHOT_SCHEMA);
});

test("buildSnapshot sorts by path and refuses a duplicate", () => {
  const r = buildSnapshot({
    feature: FEATURE,
    run: { command: "pharn-ship", markerSha256: "1".repeat(64) },
    base: BASE,
    paths: [
      ["b", DIGEST_ABSENT],
      ["a", DIGEST_ABSENT],
    ],
  });
  assert.deepEqual(
    r.paths.map((p) => p[0]),
    ["a", "b"]
  );
  assert.throws(() =>
    buildSnapshot({
      feature: FEATURE,
      run: { command: "pharn-ship", markerSha256: "1".repeat(64) },
      base: BASE,
      paths: [
        ["a", DIGEST_ABSENT],
        ["a", DIGEST_ABSENT],
      ],
    })
  );
});

// ── The disk: a throwaway repository ──────────────────────────────────────────────────────────────────────────────
function repo() {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "prs-")));
  const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "pipe", encoding: "utf8" });
  git("init", "-q", ".");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  writeFileSync(join(dir, ".gitignore"), ".pharn/\n");
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "src", "a.js"), "a\n");
  writeFileSync(join(dir, "src", "b.js"), "b\n");
  git("add", "-A");
  git("commit", "-qm", "base");
  return { dir, git, base: git("rev-parse", "HEAD").trim() };
}

function inDir(dir, fn) {
  const prev = process.cwd();
  process.chdir(dir);
  try {
    return fn();
  } finally {
    process.chdir(prev);
  }
}

function openLoop(dir, feature = FEATURE) {
  const r = spawnSync(process.execPath, [LOOP_HOOK, "--open", feature, "--cap", "3"], { cwd: dir, encoding: "utf8", env: CLEAN_ENV });
  assert.equal(r.status, 0, r.stderr);
}

function openShip(dir, feature = FEATURE) {
  const r = spawnSync(process.execPath, [RUN_MARKER, "--open", "pharn-ship", feature], { cwd: dir, encoding: "utf8", env: CLEAN_ENV });
  assert.equal(r.status, 0, r.stderr);
}

function capture(dir, name = FEATURE) {
  return spawnSync(process.execPath, [CLI, "--capture", name], { cwd: dir, encoding: "utf8", env: CLEAN_ENV });
}

function readRecord(dir) {
  const gitDir = execFileSync("git", ["rev-parse", "--absolute-git-dir"], { cwd: dir, encoding: "utf8" }).trim();
  return JSON.parse(readFileSync(join(gitDir, SNAPSHOT_BASENAME), "utf8"));
}

// L59 — every path kind the digest rule must classify, at capture AND at check (one function serves both).
test("★ PATH_KINDS — pathDigest classifies the path itself before any read", () => {
  const { dir } = repo();
  try {
    writeFileSync(join(dir, "file.txt"), "content\n");
    symlinkSync("file.txt", join(dir, "link-file"));
    mkdirSync(join(dir, "adir"));
    writeFileSync(join(dir, "adir", "in.txt"), "x\n");
    symlinkSync("adir", join(dir, "link-dir"));
    symlinkSync("nowhere", join(dir, "dangling"));
    symlinkSync("link-loop-b", join(dir, "link-loop-a"));
    symlinkSync("link-loop-a", join(dir, "link-loop-b"));
    const fifo = spawnSync("mkfifo", [join(dir, "fifo")]);
    writeFileSync(join(dir, "big.bin"), "");
    truncateSync(join(dir, "big.bin"), DIGEST_MAX_BYTES + 1); // sparse: the size check fires before any read
    const linkText = (t) => createHash("sha256").update("symlink\0").update(t).digest("hex");
    inDir(dir, () => {
      assert.equal(pathDigest("file.txt"), sha256("content\n"), "a regular file: its content");
      assert.equal(pathDigest("link-file"), linkText("file.txt"), "a link to a file: the link's own text, never the target");
      assert.notEqual(pathDigest("link-file"), sha256("content\n"));
      assert.equal(pathDigest("link-dir"), linkText("adir"), "a link to a directory: its text");
      assert.equal(pathDigest("dangling"), linkText("nowhere"), "a dangling link: its text, never absent");
      assert.equal(pathDigest("link-loop-a"), linkText("link-loop-b"), "a looping link: its text");
      assert.equal(pathDigest("adir"), DIGEST_UNHASHABLE, "a directory");
      assert.equal(pathDigest("adir/"), DIGEST_UNHASHABLE, "git's nested-repository spelling");
      assert.equal(pathDigest("link-dir/in.txt"), DIGEST_UNHASHABLE, "a parent component that is a symlink");
      if (fifo.status === 0) assert.equal(pathDigest("fifo"), DIGEST_UNHASHABLE, "a FIFO is never opened");
      assert.equal(pathDigest("big.bin"), DIGEST_UNHASHABLE, "over DIGEST_MAX_BYTES");
      assert.equal(pathDigest("missing.txt"), DIGEST_ABSENT, "lstat ENOENT");
      assert.equal(pathDigest("missing-dir/x.txt"), DIGEST_ABSENT, "an absent parent");
      assert.equal(pathDigest("file.txt/x"), DIGEST_UNHASHABLE, "ENOTDIR is not absence");
      assert.equal(pathDigest(""), DIGEST_UNHASHABLE);
      assert.equal(pathDigest("../outside"), DIGEST_UNHASHABLE, "never outside the root");
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// The independent review's R4: git prints a name that is not valid UTF-8 and `nulList` decodes it with U+FFFD, so lstat
// of the DECODED name is ENOENT — `absent` at capture AND at check — and a later content change to the real file read as
// unchanged. APFS refuses such names, so this suite pins the rule (any U+FFFD path is unhashable) and, end to end, a
// valid-UTF-8 name that genuinely holds U+FFFD: recorded unhashable, never subtracted, whatever its content does.
test("R4 — a path holding U+FFFD (what a non-UTF-8 name decodes to) is unhashable: never `absent`, never subtracted", () => {
  const { dir, base } = repo();
  try {
    inDir(dir, () => {
      assert.equal(pathDigest("src/�.txt"), DIGEST_UNHASHABLE, "absent on disk, still never `absent`");
    });
    const name = join("src", "x�.txt");
    writeFileSync(join(dir, name), "pre-run content\n");
    openLoop(dir);
    assert.equal(capture(dir).status, 0);
    assert.deepEqual(readRecord(dir).paths, [[name, DIGEST_UNHASHABLE]]);
    writeFileSync(join(dir, name), "the build changed it\n");
    const d = inDir(dir, () => preRunUnchanged({ feature: FEATURE, base, inside: [name] }));
    assert.deepEqual(d, { status: "applied", unchanged: [] }, "counted as before");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI refusals: usage, a bad slug, and no open run — exit 2, a closed reason code, nothing written", () => {
  const { dir } = repo();
  try {
    for (const [args, code] of [
      [[], "usage-error"],
      [["--capture"], "usage-error"],
      [["--capture", "a", "b"], "usage-error"],
      [["--capture", "Bad/Slug"], "usage-error"],
      [["--capture", FEATURE], "no-delivery-run"],
    ]) {
      const r = spawnSync(process.execPath, [CLI, ...args], { cwd: dir, encoding: "utf8", env: CLEAN_ENV });
      assert.equal(r.status, 2, r.stderr);
      assert.match(r.stderr, new RegExp(`refused ${code} —`));
      assert.ok(REASON_CODES.includes(code));
    }
    assert.equal(existsSync(join(dir, ".git", SNAPSHOT_BASENAME)), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("capture under an open loop run records every changed path with its digest, bound to the marker and HEAD", () => {
  const { dir, base } = repo();
  try {
    writeFileSync(join(dir, "src", "a.js"), "a, edited by the user\n");
    rmSync(join(dir, "src", "b.js"));
    mkdirSync(join(dir, "pharn", "features", "abandoned"), { recursive: true });
    writeFileSync(join(dir, "pharn", "features", "abandoned", "SPEC.md"), "old\n");
    openLoop(dir);
    const r = capture(dir);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /recorded 3 changed path\(s\) \(1 absent, 0 unhashable\) for the open pharn-loop run of 'demo'/);
    const rec = readRecord(dir);
    assert.equal(validateSnapshot(rec).ok, true);
    assert.equal(rec.base, base);
    assert.equal(rec.run.command, "pharn-loop");
    assert.equal(rec.run.marker_sha256, sha256(readFileSync(join(dir, ".pharn", "pharn-loop", FEATURE, "active.json"))));
    assert.deepEqual(rec.paths, [
      ["pharn/features/abandoned/SPEC.md", sha256("old\n")],
      ["src/a.js", sha256("a, edited by the user\n")],
      ["src/b.js", DIGEST_ABSENT],
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("WRITE-ONCE PER RUN — a second capture in the same open run is refused `already-captured`; a re-opened run captures again", () => {
  const { dir } = repo();
  try {
    openShip(dir);
    assert.equal(capture(dir).status, 0);
    writeFileSync(join(dir, "src", "built.js"), "the build's own write\n");
    const again = capture(dir);
    assert.equal(again.status, 2);
    assert.match(again.stderr, /refused already-captured/);
    assert.deepEqual(readRecord(dir).paths, [], "the first record stands: the build's write is NOT recorded as pre-run");
    openShip(dir); // a new --open is a new run (new marker bytes) — the core header's re-run bound
    assert.equal(capture(dir).status, 0);
    assert.deepEqual(
      readRecord(dir).paths.map((p) => p[0]),
      ["src/built.js"]
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("preRunUnchanged end to end: the unchanged pre-run path is named, an edited one and a new one are not", () => {
  const { dir, base } = repo();
  try {
    writeFileSync(join(dir, "src", "a.js"), "user edit\n");
    writeFileSync(join(dir, "notes.md"), "user notes\n");
    openLoop(dir);
    assert.equal(capture(dir).status, 0);
    writeFileSync(join(dir, "notes.md"), "edited by the build\n");
    writeFileSync(join(dir, "src", "new.js"), "new\n");
    const d = inDir(dir, () => preRunUnchanged({ feature: FEATURE, base, inside: ["notes.md", "src/a.js", "src/new.js"] }));
    assert.deepEqual(d, { status: "applied", unchanged: ["src/a.js"] });
    assert.equal(inDir(dir, () => preRunUnchanged({ feature: "other", base, inside: ["src/a.js"] })).status, "no-delivery-run");
    assert.equal(
      inDir(dir, () => preRunUnchanged({ feature: FEATURE, base: "b".repeat(40), inside: ["src/a.js"] })).status,
      "base-changed"
    );
    rmSync(join(dir, ".pharn", "pharn-loop", FEATURE, "active.json"));
    assert.equal(inDir(dir, () => preRunUnchanged({ feature: FEATURE, base, inside: ["src/a.js"] })).status, "no-delivery-run");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a record planted as a directory or a symlink reads snapshot-malformed, never followed; a missing one no-snapshot", () => {
  const { dir, base } = repo();
  try {
    openLoop(dir);
    const rp = inDir(dir, () => snapshotPath());
    assert.equal(inDir(dir, () => preRunUnchanged({ feature: FEATURE, base, inside: [] })).status, "no-snapshot");
    mkdirSync(rp);
    assert.equal(inDir(dir, () => preRunUnchanged({ feature: FEATURE, base, inside: [] })).status, "snapshot-malformed");
    rmSync(rp, { recursive: true });
    writeFileSync(join(dir, "elsewhere.json"), JSON.stringify(record()));
    symlinkSync(join(dir, "elsewhere.json"), rp);
    assert.equal(inDir(dir, () => preRunUnchanged({ feature: FEATURE, base, inside: [] })).status, "snapshot-malformed");
    unlinkSync(rp);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("captureSnapshot returns a refusal, never throws, when git names no HEAD (an unborn branch)", () => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "prs-unborn-")));
  try {
    execFileSync("git", ["init", "-q", "."], { cwd: dir });
    openLoop(dir);
    const r = inDir(dir, () => captureSnapshot(FEATURE));
    assert.equal(r.ok, false);
    assert.equal(r.code, "git-failed");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a linked worktree keeps its own record, in its own git dir", () => {
  const { dir } = repo();
  const wt = `${dir}-wt`;
  try {
    execFileSync("git", ["worktree", "add", "-q", "--detach", wt], { cwd: dir });
    openLoop(wt);
    writeFileSync(join(wt, "src", "a.js"), "wt edit\n");
    assert.equal(capture(wt).status, 0);
    const wtGit = execFileSync("git", ["rev-parse", "--absolute-git-dir"], { cwd: wt, encoding: "utf8" }).trim();
    assert.ok(wtGit.includes(join(".git", "worktrees")), wtGit);
    assert.ok(existsSync(join(wtGit, SNAPSHOT_BASENAME)));
    assert.equal(existsSync(join(dir, ".git", SNAPSHOT_BASENAME)), false, "the main checkout has none");
  } finally {
    try {
      execFileSync("git", ["worktree", "remove", "--force", wt], { cwd: dir, stdio: "ignore" });
    } catch {
      /* already gone */
    }
    rmSync(wt, { recursive: true, force: true });
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the record's basename is its own — not 6.33.0's base-reuse record nor 6.34.0's head offer", () => {
  assert.notEqual(SNAPSHOT_BASENAME, RECORD_BASENAME);
  assert.notEqual(SNAPSHOT_BASENAME, OFFER_BASENAME);
});

// ── ★ HOOK — the record is out of the WRITE TOOLS' reach; `.pharn/` is not (the non-vacuity control) ─────────────
const PROTECT = join(ROOT, ".claude", "hooks", "protect-trusted-paths.cjs");
const ENFORCE = join(ROOT, ".claude", "hooks", "enforce-writes-scope.cjs");

function installHooks(projectDir) {
  const d = join(projectDir, ".claude", "hooks");
  mkdirSync(d, { recursive: true });
  for (const h of [PROTECT, ENFORCE]) copyFileSync(h, join(d, h.split("/").pop()));
}

function hookExit(hook, projectDir, filePath) {
  const r = spawnSync(process.execPath, [join(projectDir, ".claude", "hooks", hook.split("/").pop())], {
    cwd: projectDir,
    input: JSON.stringify({ tool_name: "Write", tool_input: { file_path: filePath, content: "{}" }, cwd: projectDir }),
    encoding: "utf8",
    env: { ...CLEAN_ENV, CLAUDE_PROJECT_DIR: projectDir },
  });
  return r.status;
}

function recordFile(projectDir) {
  const gitDir = execFileSync("git", ["rev-parse", "--absolute-git-dir"], { cwd: projectDir, encoding: "utf8" }).trim();
  return join(gitDir, SNAPSHOT_BASENAME);
}

// The independent review's R3: the old title said BOTH guards deny on BOTH layouts, but in a linked worktree only
// enforce-writes-scope denies. Each layout is now pinned to the guard that denies it, over every posture, with and
// without a run open, and under no scope, the build's narrow `src/**` and a whole-tree `**` scope (a set scope REPLACES
// the default, so it is the posture a build actually writes in).
function setPosture(dir, kind) {
  rmSync(join(dir, "pharn.config.json"), { force: true });
  rmSync(join(dir, ".dev"), { recursive: true, force: true });
  if (kind === "installed") writeFileSync(join(dir, "pharn.config.json"), JSON.stringify({ skillsVersion: "6.37.0" }) + "\n");
  if (kind === "dev") mkdirSync(join(dir, ".dev", "floor"), { recursive: true });
}

function setRun(dir, open) {
  rmSync(join(dir, ".pharn", "pharn-loop"), { recursive: true, force: true });
  if (open) {
    mkdirSync(join(dir, ".pharn", "pharn-loop", FEATURE), { recursive: true });
    writeFileSync(join(dir, ".pharn", "pharn-loop", FEATURE, "active.json"), "{}\n");
  }
}

function setScope(dir, scope) {
  rmSync(join(dir, ".pharn", "writes-scope.json"), { force: true });
  if (scope) {
    mkdirSync(join(dir, ".pharn"), { recursive: true });
    writeFileSync(join(dir, ".pharn", "writes-scope.json"), JSON.stringify({ scope, set_by: "test", set_at: "now" }) + "\n");
  }
}

const HOOK_POSTURES = ["unsignalled", "dev", "installed"];
const HOOK_SCOPES = [null, ["src/**"], ["**"]];

/** Every (posture, run, scope) cell for `projectDir`: [label, protect exit, enforce exit]. */
function hookMatrix(projectDir, target) {
  const rows = [];
  for (const posture of HOOK_POSTURES) {
    for (const open of [false, true]) {
      for (const scope of HOOK_SCOPES) {
        setPosture(projectDir, posture);
        setRun(projectDir, open);
        setScope(projectDir, scope);
        const label = `${posture}/${open ? "run" : "no-run"}/${scope ? JSON.stringify(scope) : "no-scope"}`;
        rows.push([label, hookExit(PROTECT, projectDir, target), hookExit(ENFORCE, projectDir, target)]);
      }
    }
  }
  setPosture(projectDir, "unsignalled");
  setRun(projectDir, false);
  setScope(projectDir, null);
  return rows;
}

test("★ HOOK — the write tools never reach the record: protect-trusted-paths denies it in a MAIN checkout, enforce-writes-scope in a LINKED worktree (beside or nested), in every posture, run state and scope", () => {
  const { dir } = repo();
  const beside = `${dir}-wt`;
  const nested = join(dir, ".claude", "worktrees", "agent-x");
  try {
    installHooks(dir);
    const main = hookMatrix(dir, recordFile(dir));
    assert.equal(main.length, 18, "L34: the cell set is counted, not merely iterated");
    for (const [label, p] of main) assert.equal(p, 2, `main checkout, ${label}: protect-trusted-paths denies the .git segment`);
    // Control (non-vacuity): the guards do not deny everything — a .pharn/ path is writable, the reason the record is not kept there.
    const marker = join(dir, ".pharn", "pharn-loop", FEATURE, "active.json");
    assert.equal(hookExit(PROTECT, dir, marker), 0);
    assert.equal(hookExit(ENFORCE, dir, marker), 0, "`.pharn/**` is always writable");

    for (const [layout, wt] of [
      ["beside", beside],
      ["nested", nested],
    ]) {
      mkdirSync(dirname(wt), { recursive: true });
      execFileSync("git", ["worktree", "add", "-q", "--detach", wt], { cwd: dir });
      installHooks(wt);
      const target = recordFile(wt);
      assert.ok(target.includes(join(".git", "worktrees")), target);
      for (const [label, p, e] of hookMatrix(wt, target)) {
        assert.equal(e, 2, `linked worktree (${layout}), ${label}: enforce-writes-scope denies a path inside another git tree`);
        assert.equal(p, 0, `linked worktree (${layout}), ${label}: protect-trusted-paths does NOT deny it — stated, not hidden`);
      }
    }
  } finally {
    for (const wt of [nested, beside]) {
      try {
        execFileSync("git", ["worktree", "remove", "--force", wt], { cwd: dir, stdio: "ignore" });
      } catch {
        /* already gone */
      }
    }
    rmSync(beside, { recursive: true, force: true });
    rmSync(dir, { recursive: true, force: true });
  }
});

test("★ HOOK, the stated bound PINNED — a SEPARATE git dir kept inside the project under a non-.git name is reachable under a `**` scope", () => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "prs-sep-")));
  try {
    const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "pipe", encoding: "utf8" });
    git("init", "-q", "--separate-git-dir", join(dir, "gitdata"), ".");
    writeFileSync(join(dir, ".gitignore"), ".pharn/\n.claude/\ngitdata/\n");
    installHooks(dir);
    const target = recordFile(dir);
    assert.ok(target.startsWith(join(dir, "gitdata")), target);
    const cells = hookMatrix(dir, target);
    const reachable = cells.filter(([, p, e]) => p !== 2 && e !== 2).map(([label]) => label);
    assert.ok(reachable.includes('dev/no-run/["**"]'), "a `**` scope admits it — the bound pre-run-snapshot.mjs's header names");
    assert.ok(reachable.includes("installed/no-run/no-scope"), "installed, no scope, no run open admits it too");
    assert.ok(!reachable.includes("dev/no-run/no-scope"), "control: the dev default still denies it");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── ✧ REPORTED — every human-facing surface of a run names the subtracted paths (the independent review's R1) ────────
// "Reported, never silent" was true of the machine artifacts and false of /pharn-ship --quick, whose item 7 read only the
// exit code and whose SHIP.md recorded `scope: clean` verbatim. Presence only: it never proves a run did what it reads.
test("✧ REPORTED (R1) — ship --quick keeps and records the pre-run paths, ship's roll-up and GATE 2 name them, the loop's summary lists them", () => {
  const quick = readFileSync(join(COMMANDS_DIR, "pharn-ship-quick.md"), "utf8");
  const item7 = quick.slice(quick.indexOf("7. **The scope check: KEPT"), quick.indexOf("8. **The verify step"));
  assert.match(item7, /keep the document's `pre_run_snapshot\.unchanged`/);
  const item11 = quick.slice(quick.indexOf("11. **Step 3 — `SHIP.md` records"), quick.indexOf("12. **Step 3a.**"));
  assert.match(item11, /`pre-run unchanged: <n>` with those paths fenced as quoted\s+DATA/);
  const gate2 = quick.slice(quick.indexOf("**GATE 2 in quick mode**"));
  assert.match(gate2, /`pre-run unchanged` paths as quoted DATA/);
  assert.match(readFileSync(join(COMMANDS_DIR, "pharn-ship-close.md"), "utf8"), /`pre-run unchanged: <n>` from its `pre_run_snapshot`/);
  const ship = readFileSync(join(COMMANDS_DIR, "pharn-ship.md"), "utf8");
  const shipGate2 = ship.slice(ship.indexOf("1. **GATE 2 — post-verify decision.**"));
  assert.match(shipGate2.slice(0, 900), /`pre_run_snapshot\.unchanged` paths as quoted DATA/);
  assert.match(readFileSync(join(COMMANDS_DIR, "pharn-loop-close.md"), "utf8"), /every path `pre_run_snapshot\.unchanged` lists/);
});

// ── ★ WIRING — the pinned lines, EXECUTED, and their STOP branches ───────────────────────────────────────────────
const CAPTURE_RE = /node pharn\/floor\/pre-run-snapshot\.mjs --capture '<name>'/;

function pinnedLine(file, re) {
  const lines = commandFamilyText(COMMANDS_DIR, file)
    .split("\n")
    .filter((l) => re.test(l));
  assert.equal(lines.length, 1, `${file} must contain exactly one line matching ${re}`);
  return lines[0].trim();
}

function runShellLine(dir, line) {
  const resolved = line
    .replace("node pharn/floor/pre-run-snapshot.mjs", `node ${JSON.stringify(CLI)}`)
    .replace("node pharn/floor/run-marker.mjs", `node ${JSON.stringify(RUN_MARKER)}`)
    .replace("node .claude/hooks/require-loop-record.cjs", `node ${JSON.stringify(LOOP_HOOK)}`);
  return spawnSync("sh", ["-c", resolved], { cwd: dir, encoding: "utf8", env: CLEAN_ENV });
}

const WIRING = [
  {
    file: "pharn-loop.md",
    open: /node \.claude\/hooks\/require-loop-record\.cjs --open '<name>' --cap <M>/,
    next: "node pharn/floor/mark-phase.mjs --name '<name>' --kind run-start",
    stopRow: /\bS9\b[\s\S]*`blocked: stage-refused`/,
  },
  {
    file: "pharn-ship.md",
    open: /node pharn\/floor\/run-marker\.mjs --open pharn-ship '<name>'/,
    next: "node pharn/floor/stage-agent.mjs route --command pharn-ship --stage pharn-plan",
    stopRow: /before `\/pharn-plan`/,
  },
];

for (const { file, open, next, stopRow } of WIRING) {
  test(`✧ WIRING: ${file}'s pinned capture line, run right after its pinned open line, records the snapshot; with no run open it exits 2`, () => {
    const { dir } = repo();
    try {
      writeFileSync(join(dir, "src", "a.js"), "dirty before the run\n");
      const cap = pinnedLine(file, CAPTURE_RE).replace("<name>", FEATURE);
      const refused = runShellLine(dir, cap);
      assert.equal(refused.status, 2, "the exit the STOP branch reads is non-zero when no run is open");
      const o = runShellLine(dir, pinnedLine(file, open).replace("<name>", FEATURE).replace("<M>", "3"));
      assert.equal(o.status, 0, o.stderr);
      const r = runShellLine(dir, cap);
      assert.equal(r.status, 0, r.stderr);
      assert.deepEqual(
        readRecord(dir).paths.map((p) => p[0]),
        ["src/a.js"]
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`✧ WIRING: ${file} runs the capture line AFTER its open line, and STOPs on a non-zero exit before the next step`, () => {
    const body = commandFamilyText(COMMANDS_DIR, file);
    const openAt = body.search(open);
    const capAt = body.search(CAPTURE_RE);
    const nextAt = body.indexOf(next, capAt);
    assert.ok(openAt >= 0 && capAt > openAt && nextAt > capAt, "anchors, in order");
    const stop = body.indexOf("**Non-zero → STOP**", capAt);
    assert.ok(stop > capAt && stop < nextAt, "a STOP branch between the capture line and the next step");
    assert.match(body.slice(stop, stop + 200), stopRow);
  });
}

// ── 6.42.0 (loop-entry-preflight, review R1): the ENTRY GATES' changes — a second record, the same rule ─────────────
test("ENTRY CHANGES — written bound to the open run, decided by the snapshot's own rule: subtracted while unchanged, not once edited, never over another base", () => {
  const { dir, base } = repo();
  try {
    writeFileSync(join(dir, "src", "a.js"), "rewritten by an entry gate\n");
    const digest = inDir(dir, () => pathDigest("src/a.js"));
    assert.deepEqual(
      inDir(dir, () => recordEntryChanges(FEATURE, [["src/a.js", digest]])).code,
      "no-delivery-run",
      "no run open → nothing written"
    );
    assert.equal(existsSync(join(dir, ".git", ENTRY_CHANGES_BASENAME)), false);
    openShip(dir);
    assert.deepEqual(
      inDir(dir, () => recordEntryChanges(FEATURE, [["src/a.js", digest]])),
      { ok: true }
    );
    const rec = JSON.parse(readFileSync(join(dir, ".git", ENTRY_CHANGES_BASENAME), "utf8"));
    assert.equal(validateSnapshot(rec).ok, true, "the snapshot's own shape and validator");
    const inside = ["src/a.js", "src/b.js"];
    assert.deepEqual(
      inDir(dir, () => entryChangesUnchanged({ feature: FEATURE, base, inside })),
      {
        status: "applied",
        unchanged: ["src/a.js"],
      }
    );
    assert.equal(inDir(dir, () => entryChangesUnchanged({ feature: FEATURE, base: "f".repeat(40), inside })).status, "base-changed");
    writeFileSync(join(dir, "src", "a.js"), "then the build edited it\n");
    assert.deepEqual(inDir(dir, () => entryChangesUnchanged({ feature: FEATURE, base, inside })).unchanged, []);
    assert.equal(inDir(dir, () => preRunUnchanged({ feature: FEATURE, base, inside })).status, "no-snapshot", "a separate record");
    assert.equal(
      inDir(dir, () => clearEntryChanges()),
      true
    );
    assert.equal(inDir(dir, () => entryChangesUnchanged({ feature: FEATURE, base, inside })).status, "no-snapshot");
    assert.equal(
      inDir(dir, () => clearEntryChanges()),
      true,
      "ENOENT is success"
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("entryBlocks — the snapshot's block is unchanged; the entry block exists only with an entry record and never repeats a snapshot path", () => {
  const pre = { status: "applied", unchanged: ["a", "c"] };
  const none = { status: "no-snapshot", unchanged: [] };
  assert.deepEqual(entryBlocks(pre, none, ["a"]), { preRunBlock: { status: "applied", unchanged: ["a"] }, entryBlock: null });
  assert.equal(entryBlocks(pre, { status: "no-delivery-run", unchanged: [] }, ["a"]).entryBlock, null);
  assert.deepEqual(entryBlocks(pre, { status: "applied", unchanged: ["a", "b"] }, ["a", "b"]), {
    preRunBlock: { status: "applied", unchanged: ["a"] },
    entryBlock: { status: "applied", unchanged: ["b"] },
  });
  assert.deepEqual(entryBlocks(pre, { status: "other-run", unchanged: [] }, ["a"]).entryBlock, { status: "other-run", unchanged: [] });
  assert.notEqual(ENTRY_CHANGES_BASENAME, SNAPSHOT_BASENAME);
});

test("★ HOOK — the entry-changes record is out of the write tools' reach in a main checkout, like the snapshot", () => {
  const { dir } = repo();
  try {
    installHooks(dir);
    const gitDir = execFileSync("git", ["rev-parse", "--absolute-git-dir"], { cwd: dir, encoding: "utf8" }).trim();
    const target = join(gitDir, ENTRY_CHANGES_BASENAME);
    const cells = hookMatrix(dir, target);
    assert.equal(cells.length, 18);
    for (const [label, p] of cells) assert.equal(p, 2, `${label}: protect-trusted-paths denies the .git segment`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
