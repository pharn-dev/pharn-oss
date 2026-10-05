// pharn/floor/entry-gates.test.mjs — the entry check's suite (loop-entry-preflight, 6.42.0): the pure rules
// (entry-gates-core.mjs), the CLI end to end in throwaway git repositories (real `npm run` gates, a real detached
// runner), and the ★ WIRING of the pinned lines in /pharn-loop and /pharn-ship, EXECUTED (L45).
//
// Every test that starts a runner aborts it in `finally`, so a failed assertion never leaves a process behind on CI;
// "no gate left running" is observed as ESRCH on the pid the gate itself wrote.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ENTRY_PATHS,
  EXIT,
  STATUSES,
  REASON_CODES,
  DIGEST_ABSENT,
  DIGEST_UNHASHABLE,
  entryVerdict,
  entryDocument,
  documentDefect,
  runnerRecordDefect,
  resultRecordDefect,
  parsePsTable,
  descendantGroups,
  killableGroups,
  listingDiff,
  shown,
  RUNNER_SCHEMA,
  RESULT_SCHEMA,
} from "./entry-gates-core.mjs";
import { STYLE_SET } from "./gate-run-core.mjs";
import { commandFamilyText } from "../../.dev/floor/command-family.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const CLI = join(HERE, "entry-gates.mjs");
const RUN_MARKER = join(HERE, "run-marker.mjs");
const PRE_RUN = join(HERE, "pre-run-snapshot.mjs");
const COMMANDS_DIR = join(ROOT, ".claude", "commands");
const FEATURE = "demo";
const NONCE = "0123456789abcdef0123456789abcdef";
const SHA = `sha256:${"a".repeat(64)}`;

// ── the pure rules ───────────────────────────────────────────────────────────────────────────────────────────────
function run(id, exit, extra = {}) {
  return { id, exit, timed_out: false, mutated: false, ...extra };
}

test("entryVerdict: a red NON-style gate counts whatever the feature directory did; a green run is green", () => {
  const stamp = { runs: [run("lint", 0), run("test", 1), run("build", 0)] };
  const fd = [
    { id: "lint", before: DIGEST_ABSENT, after: DIGEST_ABSENT },
    { id: "test", before: DIGEST_ABSENT, after: SHA },
    { id: "build", before: SHA, after: SHA },
  ];
  const v = entryVerdict({ stamp, featureDir: fd, d0: DIGEST_ABSENT });
  assert.equal(v.status, "red");
  assert.deepEqual(v.red, ["test"]);
  assert.deepEqual(v.unattributed, []);
  const g = entryVerdict({ stamp: { runs: [run("lint", 0), run("test", 0)] }, featureDir: fd, d0: DIGEST_ABSENT });
  assert.equal(g.status, "green");
  assert.deepEqual(g.red, []);
});

test("entryVerdict: a red STYLE gate counts only when the feature directory held d0 before AND after it — every member, every way to miss", () => {
  for (const id of STYLE_SET) {
    const stamp = { runs: [run(id, 1)] };
    const at = (before, after) => entryVerdict({ stamp, featureDir: [{ id, before, after }], d0: DIGEST_ABSENT });
    assert.deepEqual(at(DIGEST_ABSENT, DIGEST_ABSENT).red, [id], `${id}: untouched → counts`);
    for (const [before, after, why] of [
      [DIGEST_ABSENT, SHA, "written during the gate"],
      [SHA, SHA, "written before the gate"],
      [DIGEST_UNHASHABLE, DIGEST_UNHASHABLE, "unhashable"],
    ]) {
      const v = at(before, after);
      assert.deepEqual(v.red, [], `${id}: ${why} → not counted`);
      assert.deepEqual(v.unattributed, [id], `${id}: ${why} → reported as unattributed`);
      assert.equal(v.status, "green");
    }
    assert.deepEqual(entryVerdict({ stamp, featureDir: [], d0: DIGEST_ABSENT }).unattributed, [id], `${id}: no digests → unattributed`);
    assert.deepEqual(
      entryVerdict({ stamp, featureDir: [{ id, before: DIGEST_UNHASHABLE, after: DIGEST_UNHASHABLE }], d0: DIGEST_UNHASHABLE })
        .unattributed,
      [id],
      `${id}: an unhashable d0 never attributes`
    );
    // d0 need not be absent: in /pharn-ship the approved SPEC.md is already there.
    assert.deepEqual(entryVerdict({ stamp, featureDir: [{ id, before: SHA, after: SHA }], d0: SHA }).red, [id]);
  }
});

test("entryVerdict: a timeout is red; `mutated` and `excluded` are reported, never decided on", () => {
  const stamp = {
    runs: [run("test", 0, { timed_out: true }), run("build", 0, { mutated: true })],
    excluded: { declared_in: "pharn.config.json#gates.exclude", ids: ["e2e"] },
  };
  const v = entryVerdict({ stamp, featureDir: [], d0: DIGEST_ABSENT });
  assert.deepEqual(v.red, ["test"]);
  assert.deepEqual(v.mutated, ["build"]);
  assert.deepEqual(v.excluded, ["e2e"]);
});

test("EXIT covers every status, distinct, and never 1 (a crash is never a verdict)", () => {
  assert.deepEqual(Object.keys(EXIT).sort(), [...STATUSES].sort());
  assert.equal(new Set(Object.values(EXIT)).size, STATUSES.length);
  assert.ok(!Object.values(EXIT).includes(1));
});

test("the runner and result records are CLOSED both ways", () => {
  const rec = { schema: RUNNER_SCHEMA, feature: FEATURE, nonce: NONCE, pid: null, timeout_ms: 540000, d0: DIGEST_ABSENT };
  assert.equal(runnerRecordDefect(rec), null);
  assert.equal(runnerRecordDefect({ ...rec, pid: 1234 }), null);
  for (const [why, bad] of [
    ["extra key", { ...rec, x: 1 }],
    ["missing key", Object.fromEntries(Object.entries(rec).filter(([k]) => k !== "d0"))],
    ["bad nonce", { ...rec, nonce: "x" }],
    ["pid 1", { ...rec, pid: 1 }],
    ["bad slug", { ...rec, feature: "../x" }],
    ["bad digest", { ...rec, d0: "sha256:zz" }],
    ["schema", { ...rec, schema: "x" }],
  ]) {
    assert.notEqual(runnerRecordDefect(bad), null, why);
  }
  const done = {
    schema: RESULT_SCHEMA,
    status: "done",
    feature: FEATURE,
    nonce: NONCE,
    stamp_sha256: "b".repeat(64),
    feature_dir: [],
    gate_changes: [{ id: "build", paths: [["next-env.d.ts", "c".repeat(64)]] }],
  };
  assert.equal(resultRecordDefect(done), null);
  for (const [why, bad] of [
    ["extra key", { ...done, detail: "x" }],
    ["no gate_changes", Object.fromEntries(Object.entries(done).filter(([k]) => k !== "gate_changes"))],
    ["a gate change that is not [path, digest]", { ...done, gate_changes: [{ id: "build", paths: [["x", "sha256:zz"]] }] }],
    [
      "a repeated gate_changes id",
      {
        ...done,
        gate_changes: [
          { id: "b", paths: [] },
          { id: "b", paths: [] },
        ],
      },
    ],
    ["bad sha", { ...done, stamp_sha256: "x" }],
    [
      "repeated id",
      {
        ...done,
        feature_dir: [
          { id: "a", before: SHA, after: SHA },
          { id: "a", before: SHA, after: SHA },
        ],
      },
    ],
    ["bad digest", { ...done, feature_dir: [{ id: "a", before: "?", after: SHA }] }],
    ["unknown status", { ...done, status: "maybe" }],
    [
      "unusable without a known reason",
      { schema: RESULT_SCHEMA, status: "unusable", feature: FEATURE, nonce: NONCE, reason_code: "x", runner_reason: null, detail: "" },
    ],
    [
      "unusable with a foreign runner_reason",
      {
        schema: RESULT_SCHEMA,
        status: "unusable",
        feature: FEATURE,
        nonce: NONCE,
        reason_code: "child-refused",
        runner_reason: "x",
        detail: "",
      },
    ],
  ]) {
    assert.notEqual(resultRecordDefect(bad), null, why);
  }
  assert.equal(
    resultRecordDefect({
      schema: RESULT_SCHEMA,
      status: "unusable",
      feature: FEATURE,
      nonce: NONCE,
      reason_code: "child-refused",
      runner_reason: "tree-changed-between-gates",
      detail: "d",
    }),
    null
  );
});

test("L62 — `shown` never throws, on the value whose String() does (control asserted)", () => {
  const hostile = JSON.parse('{"toString":1}');
  assert.throws(() => String(hostile), "control: String() really throws on it");
  assert.equal(typeof shown(hostile), "string");
  assert.equal(typeof shown([hostile]), "string");
  assert.equal(documentDefect(entryDocument({ status: "unusable", feature: FEATURE, reasonCode: "crashed", detail: hostile })), null);
});

test("parsePsTable / descendantGroups: integer rows only; transitive; the root's own group and groups <= 1 never returned", () => {
  const rows = parsePsTable(" 10 1 10\n 11 10 10\n 12 11 12\n 13 12 12\n 14 1 14\nnot a row\n 15 12 0\n 16 13 16\n");
  assert.equal(rows.length, 7);
  assert.deepEqual(descendantGroups(rows, 10), [12, 16]);
  assert.deepEqual(descendantGroups(rows, 99), []);
});

test("killableGroups (review R4): a survivor group is killed only when one of its processes still matches a frozen (pid, ppid, pgid); a reused group id is never signalled", () => {
  const frozen = [
    { pid: 12, ppid: 11, pgid: 12 },
    { pid: 13, ppid: 12, pgid: 12 },
    { pid: 16, ppid: 13, pgid: 16 },
  ];
  assert.deepEqual(killableGroups(frozen, [{ pid: 13, ppid: 12, pgid: 12 }], [12, 16]), [12], "a member of the frozen group");
  assert.deepEqual(killableGroups(frozen, [{ pid: 16, ppid: 1, pgid: 16 }], [12, 16]), [], "reparented or reused: not the frozen triple");
  assert.deepEqual(killableGroups(frozen, [], [12, 16]), []);
});

test("listingDiff + entryVerdict (review R1): only a MUTATED gate's changes are taken; the last such gate's digest wins; a path back at HEAD is recorded with its digest now", () => {
  const before = new Map([
    ["a", "1".repeat(64)],
    ["b", "2".repeat(64)],
  ]);
  const after = new Map([
    ["a", "3".repeat(64)],
    ["c", "4".repeat(64)],
  ]);
  assert.deepEqual(
    listingDiff(before, after, () => "5".repeat(64)),
    [
      ["a", "3".repeat(64)],
      ["b", "5".repeat(64)],
      ["c", "4".repeat(64)],
    ]
  );
  const stamp = { runs: [run("lint", 0), run("build", 0, { mutated: true }), run("e2e", 0, { mutated: true })] };
  const gateChanges = [
    { id: "lint", paths: [["x", "6".repeat(64)]] },
    { id: "build", paths: [["n", "7".repeat(64)]] },
    { id: "e2e", paths: [["n", "8".repeat(64)]] },
  ];
  const v = entryVerdict({ stamp, featureDir: [], d0: DIGEST_ABSENT, gateChanges });
  assert.deepEqual(v.mutated, ["build", "e2e"]);
  assert.deepEqual(v.changed, [["n", "8".repeat(64)]], "lint was not mutated: its listing diff is not taken");
});

// ── the CLI, end to end ──────────────────────────────────────────────────────────────────────────────────────────
/** A gate script: optionally writes its pid, writes files, sleeps, then exits. Committed into the sandbox. */
function gateSource({ exit = 0, sleepMs = 0, pidFile = null, writes = [] }) {
  return [
    'const fs = require("node:fs"); const path = require("node:path");',
    pidFile ? `fs.writeFileSync(${JSON.stringify(pidFile)}, String(process.pid));` : "",
    ...writes.map(
      ([p, c]) =>
        `fs.mkdirSync(path.dirname(${JSON.stringify(p)}), {recursive: true}); fs.writeFileSync(${JSON.stringify(p)}, ${JSON.stringify(c)});`
    ),
    `setTimeout(() => process.exit(${exit}), ${sleepMs});`,
  ].join("\n");
}

function sandbox({ gates = {}, config = null, noPackage = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "entry-gates-"));
  const scripts = {};
  mkdirSync(join(dir, "gates"));
  for (const [id, spec] of Object.entries(gates)) {
    const file = `gates/${id.replace(/[^a-z0-9]/g, "_")}.cjs`;
    writeFileSync(join(dir, file), gateSource(spec));
    scripts[id] = `node ${file}`;
  }
  if (!noPackage) writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "sb", private: true, scripts }));
  if (config) writeFileSync(join(dir, "pharn.config.json"), JSON.stringify(config));
  writeFileSync(join(dir, ".gitignore"), ".pharn/\n");
  writeFileSync(join(dir, "a.txt"), "a\n");
  const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "ignore" });
  git("init", "-q", ".");
  git("add", "-A");
  git("-c", "user.email=t@t", "-c", "user.name=t", "commit", "-qm", "init");
  return dir;
}

function cli(dir, ...args) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd: dir, encoding: "utf8" });
}
const start = (dir, t = "60000") => cli(dir, "--start", "--feature", FEATURE, "--timeout-ms", t);
function wait(dir, budget = "60000") {
  const r = cli(dir, "--wait", "--feature", FEATURE, "--budget-ms", budget);
  const doc = JSON.parse(r.stdout);
  assert.equal(documentDefect(doc), null, `every printed document is well-formed: ${r.stdout}`);
  assert.equal(r.status, EXIT[doc.status], "the exit is the status's");
  return { status: r.status, doc };
}
const abort = (dir) => cli(dir, "--abort", "--feature", FEATURE);
function cleanup(dir) {
  abort(dir);
  rmSync(dir, { recursive: true, force: true });
}
function gone(pid) {
  try {
    process.kill(pid, 0);
    return false;
  } catch (e) {
    return e.code === "ESRCH";
  }
}
function waitForFile(p, ms = 15000) {
  const until = Date.now() + ms;
  while (!existsSync(p) && Date.now() < until) execFileSync("sleep", ["0.1"]);
  assert.ok(existsSync(p), `${p} never appeared`);
}

test("CLI: green — every discovered gate runs once, style first, e2e kept; the document lists them", () => {
  const dir = sandbox({ gates: { test: {}, e2e: {}, lint: {}, build: {} } });
  try {
    const s = start(dir);
    assert.equal(s.status, 0, s.stderr);
    assert.match(s.stdout, /started 4 gate\(s\) .*\(lint, test, build, e2e\)/);
    const { status, doc } = wait(dir);
    assert.equal(status, 0, JSON.stringify(doc));
    assert.deepEqual(
      doc.gates.map((g) => g.id),
      ["lint", "test", "build", "e2e"]
    );
    assert.deepEqual(doc.red, []);
  } finally {
    cleanup(dir);
  }
});

test("CLI: red — a non-style gate's non-zero exit is exit 4, naming it; a style red before any artifact counts too", () => {
  const dir = sandbox({ gates: { lint: { exit: 1 }, test: { exit: 0 }, build: { exit: 2 } } });
  try {
    assert.equal(start(dir).status, 0);
    const { status, doc } = wait(dir);
    assert.equal(status, 4);
    assert.deepEqual(doc.red, ["lint", "build"]);
  } finally {
    cleanup(dir);
  }
});

test("CLI: a front-stage write under pharn/features/<name>/ during the gates neither refuses nor marks a gate mutated; a style red overlapping it is unattributed, a non-style red still counts", () => {
  const spec = join("pharn", "features", FEATURE, "SPEC.md");
  const dir = sandbox({
    gates: {
      lint: { exit: 1, writes: [[spec, "# SPEC\n"]] },
      test: { exit: 1, writes: [[join("pharn", "features", FEATURE, "PLAN.md"), "# PLAN\n"]] },
      build: { exit: 0 },
    },
  });
  try {
    assert.equal(start(dir).status, 0);
    const { status, doc } = wait(dir);
    assert.equal(status, 4, JSON.stringify(doc));
    assert.deepEqual(doc.red, ["test"]);
    assert.deepEqual(doc.unattributed, ["lint"]);
    assert.deepEqual(doc.mutated, [], "the feature directory is outside the entry fingerprint");
  } finally {
    cleanup(dir);
  }
});

test("CLI: a write OUTSIDE the feature directory during a gate is reported as `mutated` (control for the exclusion), with its path; with no run open nothing is recorded", () => {
  const dir = sandbox({ gates: { test: { exit: 0, writes: [["b.txt", "b\n"]] } } });
  try {
    assert.equal(start(dir).status, 0);
    const { status, doc } = wait(dir);
    assert.equal(status, 0);
    assert.deepEqual(doc.mutated, ["test"]);
    assert.deepEqual(doc.changed_paths, ["b.txt"]);
    assert.equal(doc.changes_record, "no-delivery-run");
  } finally {
    cleanup(dir);
  }
});

test("CLI (review R1, reproduced): a `build` gate rewriting a tracked file inside an open run — recorded beside the pre-run snapshot, so the partition reports it while it keeps those bytes", () => {
  const dir = sandbox({ gates: { lint: {}, build: { exit: 0, writes: [["a.txt", "rewritten by the build\n"]] } } });
  try {
    const o = spawnSync(process.execPath, [RUN_MARKER, "--open", "pharn-ship", FEATURE], { cwd: dir, encoding: "utf8" });
    assert.equal(o.status, 0, o.stderr);
    assert.equal(start(dir).status, 0);
    const { status, doc } = wait(dir);
    assert.equal(status, 0, JSON.stringify(doc));
    assert.deepEqual(doc.mutated, ["build"]);
    assert.deepEqual(doc.changed_paths, ["a.txt"], "lint changed nothing; the gates/*.cjs files are not listed");
    assert.equal(doc.changes_record, "recorded");
    const ask = (code) =>
      spawnSync(
        process.execPath,
        [
          "--input-type=module",
          "-e",
          `const m = await import(${JSON.stringify(PRE_RUN)}); const head = (await import("node:child_process")).execFileSync("git", ["rev-parse", "HEAD"], {encoding: "utf8"}).trim(); ${code}`,
        ],
        { cwd: dir, encoding: "utf8" }
      );
    const r = ask(`console.log(JSON.stringify(m.entryChangesUnchanged({ feature: "demo", base: head, inside: ["a.txt"] })));`);
    assert.deepEqual(JSON.parse(r.stdout), { status: "applied", unchanged: ["a.txt"] });
    writeFileSync(join(dir, "a.txt"), "then the build edited it\n");
    const r2 = ask(`console.log(JSON.stringify(m.entryChangesUnchanged({ feature: "demo", base: head, inside: ["a.txt"] })));`);
    assert.deepEqual(JSON.parse(r2.stdout).unchanged, []);
    // A new --start removes the earlier run's record.
    assert.equal(start(dir).status, 0);
    wait(dir);
    const gitDir = execFileSync("git", ["rev-parse", "--absolute-git-dir"], { cwd: dir, encoding: "utf8" }).trim();
    assert.ok(existsSync(join(gitDir, "pharn-entry-gate-changes.json")), "the re-run's build rewrote it again and re-recorded");
  } finally {
    cleanup(dir);
  }
});

test("CLI (review R6): --start refuses `runner-unverifiable`, wiping nothing, when an earlier runner's pid is alive and ps cannot verify it", () => {
  const dir = sandbox({ gates: { test: {} } });
  try {
    mkdirSync(join(dir, ENTRY_PATHS.root), { recursive: true });
    const rec = { schema: RUNNER_SCHEMA, feature: FEATURE, nonce: NONCE, pid: process.pid, timeout_ms: 1000, d0: DIGEST_ABSENT };
    writeFileSync(join(dir, ENTRY_PATHS.runner), JSON.stringify(rec));
    const r = spawnSync(process.execPath, [CLI, "--start", "--feature", FEATURE, "--timeout-ms", "60000"], {
      cwd: dir,
      encoding: "utf8",
      env: { ...process.env, PATH: "/nonexistent-for-the-test" },
    });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /refused runner-unverifiable/);
    assert.deepEqual(JSON.parse(readFileSync(join(dir, ENTRY_PATHS.runner), "utf8")), rec, "nothing was wiped");
    assert.ok(!gone(process.pid), "and nothing was signalled");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI: a timed-out gate is red", () => {
  const dir = sandbox({ gates: { test: { sleepMs: 20000 } } });
  try {
    assert.equal(start(dir, "800").status, 0);
    const { status, doc } = wait(dir);
    assert.equal(status, 4);
    assert.deepEqual(doc.red, ["test"]);
    assert.equal(doc.gates[0].timed_out, true);
  } finally {
    cleanup(dir);
  }
});

test("CLI: no gates — no package.json, or no allowlisted script — is exit 3 at start AND at wait (L34)", () => {
  for (const opts of [{ noPackage: true }, { gates: { other: {} } }]) {
    const dir = sandbox(opts);
    try {
      assert.equal(start(dir).status, 3, JSON.stringify(opts));
      assert.equal(wait(dir).status, 3);
    } finally {
      cleanup(dir);
    }
  }
});

test("CLI: the project's gates.exclude is honoured and disclosed; a malformed one refuses at start (child-refused, its runner reason)", () => {
  const dir = sandbox({ gates: { test: {}, build: { exit: 1 } }, config: { gates: { exclude: ["build"] } } });
  try {
    assert.equal(start(dir).status, 0);
    const { status, doc } = wait(dir);
    assert.equal(status, 0, "the excluded red gate never ran");
    assert.deepEqual(doc.excluded, ["build"]);
  } finally {
    cleanup(dir);
  }
  const bad = sandbox({ gates: { test: {} }, config: { gates: { exclude: ["nope"] } } });
  try {
    const s = start(bad);
    assert.equal(s.status, 2);
    assert.match(s.stderr, /refused child-refused/);
    const { doc } = wait(bad);
    assert.equal(doc.reason_code, "child-refused");
    assert.equal(doc.runner_reason, "bad-gate-exclusion");
  } finally {
    cleanup(bad);
  }
});

test("CLI: continue — the budget is spent while the gates run (exit 5); the same line again gets the verdict", () => {
  const dir = sandbox({ gates: { test: { sleepMs: 2500 } } });
  try {
    assert.equal(start(dir).status, 0);
    const first = wait(dir, "300");
    assert.equal(first.status, 5);
    assert.equal(first.doc.status, "continue");
    assert.equal(wait(dir).status, 0);
  } finally {
    cleanup(dir);
  }
});

test("CLI: --abort stops a running gate (ESRCH on its pid), records `aborted`, and --wait reads it; a second abort is a no-op", () => {
  const pidFile = join(mkdtempSync(join(tmpdir(), "entry-pid-")), "gate.pid");
  const dir = sandbox({ gates: { test: { sleepMs: 30000, pidFile } } });
  try {
    assert.equal(start(dir).status, 0);
    waitForFile(pidFile);
    const pid = Number(readFileSync(pidFile, "utf8"));
    const a = abort(dir);
    assert.equal(a.status, 0);
    assert.match(a.stdout, /gate group\(s\) were stopped/);
    assert.ok(gone(pid), "the gate is not running after --abort");
    const { doc } = wait(dir);
    assert.equal(doc.reason_code, "aborted");
    assert.equal(abort(dir).status, 0);
  } finally {
    cleanup(dir);
    rmSync(dirname(pidFile), { recursive: true, force: true });
  }
});

test("CLI: a new --start supersedes the tree's earlier runner (one per tree, L38) — the earlier gate is gone", () => {
  const pidFile = join(mkdtempSync(join(tmpdir(), "entry-pid-")), "gate.pid");
  const dir = sandbox({ gates: { test: { sleepMs: 30000, pidFile } } });
  try {
    assert.equal(start(dir).status, 0);
    waitForFile(pidFile);
    const first = Number(readFileSync(pidFile, "utf8"));
    rmSync(pidFile);
    const s = start(dir);
    assert.equal(s.status, 0);
    assert.match(s.stdout, /superseded/);
    assert.ok(gone(first), "the superseded runner's gate was stopped");
  } finally {
    cleanup(dir);
    rmSync(dirname(pidFile), { recursive: true, force: true });
  }
});

test("CLI: --abort never signals a pid that is not this runner (a reused pid) — and is a no-op for another feature or no record", () => {
  const dir = sandbox({ gates: { test: {} } });
  try {
    assert.match(abort(dir).stdout, /nothing to abort/);
    mkdirSync(join(dir, ENTRY_PATHS.root), { recursive: true });
    const rec = { schema: RUNNER_SCHEMA, feature: FEATURE, nonce: NONCE, pid: process.pid, timeout_ms: 1000, d0: DIGEST_ABSENT };
    writeFileSync(join(dir, ENTRY_PATHS.runner), JSON.stringify(rec));
    const a = abort(dir);
    assert.equal(a.status, 0);
    assert.match(a.stdout, /no runner is running/);
    assert.ok(!gone(process.pid), "this test process was not signalled");
    writeFileSync(join(dir, ENTRY_PATHS.runner), JSON.stringify({ ...rec, feature: "other" }));
    assert.match(abort(dir).stdout, /another feature/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI: TAKEOVER — the runner killed mid-gate (as a harness that kills a Bash call's descendants would), --wait runs what is left itself, keeping the digests so far", () => {
  const pidFile = join(mkdtempSync(join(tmpdir(), "entry-pid-")), "gate.pid");
  const dir = sandbox({ gates: { lint: { exit: 1 }, test: { sleepMs: 1500, pidFile }, build: { exit: 2 } } });
  try {
    assert.equal(start(dir).status, 0);
    waitForFile(pidFile);
    const runner = JSON.parse(readFileSync(join(dir, ENTRY_PATHS.runner), "utf8"));
    process.kill(-runner.pid, "SIGKILL"); // the runner and run-gates; the gate is its own group and finishes alone
    const progress = JSON.parse(readFileSync(join(dir, ENTRY_PATHS.progress), "utf8"));
    assert.deepEqual(
      progress.feature_dir.map((x) => x.id),
      ["lint"],
      "the gate finished before the kill is in progress.json"
    );
    // A takeover starts a slow step only within the budget (the 6.23.0 rule), so the pinned line is simply run again on
    // exit 5 — exactly what the commands say.
    let r = wait(dir);
    for (let i = 0; i < 5 && r.status === 5; i++) r = wait(dir);
    const { status, doc } = r;
    assert.equal(status, 4, JSON.stringify(doc));
    assert.deepEqual(
      doc.gates.map((g) => g.id),
      ["lint", "test", "build"]
    );
    assert.deepEqual(doc.red, ["lint", "build"], "lint's red is still attributed through the kept digests");
  } finally {
    cleanup(dir);
    rmSync(dirname(pidFile), { recursive: true, force: true });
  }
});

test("CLI: --wait refuses what it cannot bind — no runner, another feature's runner, a foreign result, a changed stamp, a dead runner", () => {
  const dir = sandbox({ gates: { test: {} } });
  try {
    assert.equal(wait(dir).doc.reason_code, "no-runner");
    assert.equal(start(dir).status, 0);
    assert.equal(wait(dir).status, 0);
    const resPath = join(dir, ENTRY_PATHS.result);
    const res = JSON.parse(readFileSync(resPath, "utf8"));
    writeFileSync(resPath, JSON.stringify({ ...res, nonce: NONCE }));
    assert.equal(wait(dir).doc.reason_code, "result-unbound", "another runner's result");
    writeFileSync(resPath, JSON.stringify(res));
    const stampPath = join(dir, ENTRY_PATHS.stamp);
    writeFileSync(stampPath, `${readFileSync(stampPath, "utf8")} `);
    assert.equal(wait(dir).doc.reason_code, "result-unbound", "the stamp is not the one the result names");
    const runner = JSON.parse(readFileSync(join(dir, ENTRY_PATHS.runner), "utf8"));
    writeFileSync(join(dir, ENTRY_PATHS.runner), JSON.stringify({ ...runner, feature: "other" }));
    assert.equal(wait(dir).doc.reason_code, "no-runner");
    writeFileSync(join(dir, ENTRY_PATHS.runner), JSON.stringify(runner));
    rmSync(resPath);
    rmSync(stampPath);
    assert.equal(wait(dir).doc.reason_code, "runner-died", "no result, no runner and no gate run in progress");
    writeFileSync(
      resPath,
      JSON.stringify({
        schema: RESULT_SCHEMA,
        status: "unusable",
        feature: FEATURE,
        nonce: runner.nonce,
        reason_code: "child-refused",
        runner_reason: "tree-changed-between-gates",
        detail: "d",
      })
    );
    const u = wait(dir).doc;
    assert.deepEqual([u.reason_code, u.runner_reason], ["child-refused", "tree-changed-between-gates"]);
  } finally {
    cleanup(dir);
  }
});

test("CLI: a symlinked .pharn/pharn-entry is refused (path-containment), never followed (L54)", () => {
  const dir = sandbox({ gates: { test: {} } });
  const elsewhere = mkdtempSync(join(tmpdir(), "entry-elsewhere-"));
  try {
    mkdirSync(join(dir, ".pharn"));
    symlinkSync(elsewhere, join(dir, ENTRY_PATHS.root));
    const s = start(dir);
    assert.equal(s.status, 2);
    assert.match(s.stderr, /refused path-containment/);
    assert.equal(wait(dir).doc.reason_code, "path-containment");
    assert.deepEqual(execFileSync("ls", ["-A", elsewhere], { encoding: "utf8" }), "", "nothing was written through the link");
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(elsewhere, { recursive: true, force: true });
  }
});

test("CLI: usage — no default for --timeout-ms or --budget-ms (L41), one mode, a slug, no unknown flag", () => {
  const dir = sandbox({ gates: { test: {} } });
  try {
    for (const args of [
      ["--start", "--feature", FEATURE],
      ["--start", "--feature", FEATURE, "--timeout-ms", "5"],
      ["--wait", "--feature", FEATURE],
      ["--start", "--wait", "--feature", FEATURE, "--timeout-ms", "1000"],
      ["--abort", "--feature", "../x"],
      ["--abort", "--feature", FEATURE, "--extra", "x"],
      ["--abort", "--feature"],
      [],
    ]) {
      const r = cli(dir, ...args);
      assert.equal(r.status, 2, JSON.stringify(args));
    }
    const w = cli(dir, "--wait", "--feature", FEATURE);
    assert.equal(JSON.parse(w.stdout).reason_code, "usage-error");
    assert.ok(!existsSync(join(dir, ENTRY_PATHS.root)), "a usage error writes nothing");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("✧ CLOSURE — every reason_code the CLI emits is a member of REASON_CODES, and every member has an emitter (L36)", () => {
  const src = readFileSync(CLI, "utf8");
  const emitted = new Set(
    [...src.matchAll(/(?:unusableDoc\([^,]+,\s*|unusableResult\([^,]+,[^,]+,\s*|refuse\(\s*|fail\(\s*)"([a-z][a-z-]*)"/g)].map((m) => m[1])
  );
  assert.ok(emitted.size > 0, "the scan found nothing — the scan broke");
  for (const c of emitted) assert.ok(REASON_CODES.includes(c), `${c} is not a member`);
  for (const c of REASON_CODES) assert.ok(emitted.has(c), `${c} has no emitter`);
});

// ── ★ WIRING — the pinned lines in both commands, in order, with their branches, EXECUTED ────────────────────────
const LINES = {
  start: "node pharn/floor/entry-gates.mjs --start --feature '<name>' --timeout-ms 540000",
  wait: "node pharn/floor/entry-gates.mjs --wait --feature '<name>' --budget-ms 570000",
  abort: "node pharn/floor/entry-gates.mjs --abort --feature '<name>'",
};
const WIRING = [
  {
    file: "pharn-loop.md",
    startAfter: "node pharn/floor/mark-phase.mjs --name '<name>' --kind run-start",
    // 6.43.0 (orchestrator-direct-stage-calls): the routed stages' `route`/`read` lines are `start`/`finish` lines.
    startBefore: "node pharn/floor/stage-agent.mjs start --command pharn-loop --stage pharn-spec --name '<name>'",
    // 6.45.0: the loop's grill runs inline (floor-only) and has no `finish` line; its stage-start marker anchors it.
    waitAfter: "node pharn/floor/mark-phase.mjs --name '<name>' --kind stage-start --stage pharn-grill",
    waitBefore: "node pharn/floor/stage-agent.mjs start --command pharn-loop --stage pharn-test --name '<name>'",
    abortIn: "\n## At the stop — ",
    rows: [
      /`3` → \*\*S4\*\*/,
      /\*\*S14\*\* \(`blocked: gates-red-at-entry`\)/,
      /`--allow-red-entry`/,
      /`2` or anything else → go on/,
      /`changed_paths`/,
    ],
  },
  {
    file: "pharn-ship.md",
    startAfter: "node pharn/floor/pre-run-snapshot.mjs --capture '<name>'",
    startBefore: "node pharn/floor/stage-agent.mjs start --command pharn-ship --stage pharn-plan --name '<name>'",
    waitAfter: "node pharn/floor/check-plan-lessons.mjs pharn/features/<name>/PLAN.md memory-bank/lessons-learned.md",
    waitBefore: "node pharn/floor/stage-agent.mjs start --command pharn-ship --stage pharn-test --name '<name>'",
    abortIn: "\n## Closing the run — ",
    rows: [/\*\*Stop\*\*/, /\*\*Continue\*\*/, /Never continue without the answer/],
  },
];

function count(hay, needle) {
  return hay.split(needle).length - 1;
}

for (const w of WIRING) {
  test(`★ WIRING: ${w.file} pins start, wait and abort exactly once, in order, with each exit's branch`, () => {
    const body = commandFamilyText(COMMANDS_DIR, w.file);
    for (const [k, line] of Object.entries(LINES)) assert.equal(count(body, line), 1, `${w.file}: the ${k} line, exactly once`);
    const at = (s, from = 0) => body.indexOf(s, from);
    const startAt = at(LINES.start);
    assert.ok(at(w.startAfter) >= 0 && at(w.startAfter) < startAt, "start after the entry steps");
    assert.ok(at(w.startBefore, startAt) > startAt, "start before the first stage");
    const waitAt = at(LINES.wait);
    assert.ok(at(w.waitAfter) >= 0 && at(w.waitAfter) < waitAt, "wait after the grill");
    assert.ok(at(w.waitBefore, waitAt) > waitAt, "wait before the test stage");
    const section = at(w.abortIn);
    const abortAt = at(LINES.abort);
    assert.ok(section >= 0 && abortAt > section && abortAt - section < 600, `abort first in ${w.abortIn}`);
    const branch = body.slice(waitAt, waitAt + 1900);
    for (const re of w.rows) assert.match(branch, re, `${w.file}: the wait line's branch ${re}`);
  });

  test(`★ WIRING: ${w.file}'s three committed lines, EXECUTED in a git sandbox, start → wait (red) → abort`, () => {
    const body = commandFamilyText(COMMANDS_DIR, w.file);
    const line = (k) => {
      const found = body.split("\n").find((l) => l.trim() === LINES[k]);
      assert.ok(found, `${w.file}: the committed ${k} line`);
      return found
        .trim()
        .replace("<name>", FEATURE)
        .replace("node pharn/floor/entry-gates.mjs", `node ${JSON.stringify(CLI)}`);
    };
    const dir = sandbox({ gates: { test: { exit: 1 } } });
    try {
      const sh = (k) => spawnSync("sh", ["-c", line(k)], { cwd: dir, encoding: "utf8" });
      assert.equal(sh("start").status, 0);
      const r = sh("wait");
      assert.equal(r.status, 4, r.stdout);
      assert.deepEqual(JSON.parse(r.stdout).red, ["test"]);
      assert.equal(sh("abort").status, 0);
    } finally {
      cleanup(dir);
    }
  });
}

test("★ WIRING: /pharn-loop's S14 row exists and the opt-in is part of both entry grammars", () => {
  const loop = commandFamilyText(COMMANDS_DIR, "pharn-loop.md");
  assert.match(loop, /^\| S14 \|/m);
  assert.ok(loop.includes("`/pharn-loop [--allow-red-entry] [--max-iter N] <increment description>`"));
  assert.ok(loop.includes("`/pharn-loop --quick [--allow-red-entry] [--max-iter N] <increment description>`"));
});
