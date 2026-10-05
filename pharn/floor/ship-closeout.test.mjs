// pharn/floor/ship-closeout.test.mjs — /pharn-ship's Step 3a as one line (6.44.0, loop-closeout-script).
// Stubbed children pin the order and each step's argv against the close part's former lines (TODAY); the ★ tests run
// the CLI with its real children in a fixture project.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DOC_KEYS, EXIT, baseShaNow, closeShip, parseArgs } from "./ship-closeout.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const SHA = "b".repeat(40);

// The close part's former Step 3a lines (6.38.0 pharn-ship-close.md), verbatim.
const TODAY = [
  "node pharn/floor/mark-phase.mjs --name '<name>' --kind run-stop",
  "node pharn/floor/run-marker.mjs --close pharn-ship '<name>'",
  "node pharn/floor/render-cost-ledger.mjs '<name>' --command /pharn-ship --base-sha '<base sha>'",
  "node pharn/floor/check-cost-ledger.mjs pharn/features/<name>/cost.json",
  "node pharn/floor/render-run-report.mjs '<name>' --base pharn/features",
];
const tokens = (line) => line.replaceAll("'<base sha>'", "BASE").replaceAll("'<name>'", "NAME").replaceAll("<name>", "NAME").split(" ");

function stub(exits = {}) {
  const calls = [];
  const run = (s) => {
    calls.push(["node", `pharn/floor/${basename(s.script)}`, ...s.args.map((a) => a.replaceAll("demo", "NAME").replace(SHA, "BASE"))]);
    return { status: exits[basename(s.script)] ?? 0, stdout: "", stderr: "", error: null };
  };
  return { run, calls };
}
const git = () => ({ ok: true, stdout: `${SHA}\n` });

function assertDoc(doc) {
  assert.deepEqual(Object.keys(doc).sort(), [...DOC_KEYS].sort(), "the closing document's keys are closed both ways");
}

test("★ the six lines in today's order with today's argv: run-stop, then the marker close, the base SHA, the ledger, its check, the report", () => {
  const s = stub();
  const doc = closeShip({ feature: "demo", run: s.run, git, mode: () => "full" });
  assertDoc(doc);
  assert.deepEqual(s.calls, TODAY.map(tokens));
  assert.equal(doc.exit, EXIT.DONE);
  assert.equal(doc.base_sha, SHA);
  assert.deepEqual(
    [doc.run_stop, doc.run_marker_close, doc.ledger, doc.ledger_check, doc.report, doc.mode],
    ["ok", "ok", "emitted", "GREEN", "rendered", "full"]
  );
});

test("a quick run (its run-start marker says so) skips the report; cost.json is still emitted and checked", () => {
  const s = stub();
  const doc = closeShip({ feature: "demo", run: s.run, git, mode: () => "quick" });
  assert.deepEqual(s.calls, TODAY.slice(0, 4).map(tokens));
  assert.equal(doc.report, "skipped-quick");
  assert.equal(doc.mode, "quick");
});

test("nothing gates: a failed run-stop, marker close or emitter is reported and every later item still runs", () => {
  const s = stub({ "mark-phase.mjs": 2, "run-marker.mjs": 2, "render-cost-ledger.mjs": 1 });
  const doc = closeShip({ feature: "demo", run: s.run, git: () => ({ ok: false, stdout: "" }), mode: () => "full" });
  assert.equal(doc.exit, EXIT.DONE);
  assert.deepEqual([doc.run_stop, doc.run_marker_close, doc.ledger, doc.ledger_check], ["failed", "failed", "not-emitted", "not-run"]);
  assert.equal(doc.base_sha, "unknown", "no repository → the literal unknown, as the capture line printed");
  assert.equal(s.calls.at(-1)[1], "pharn/floor/render-run-report.mjs", "the report still runs");
});

test("baseShaNow: a 40-hex SHA or `unknown`, never git's other output", () => {
  assert.equal(
    baseShaNow(() => ({ ok: true, stdout: `${SHA}\n` })),
    SHA
  );
  assert.equal(
    baseShaNow(() => ({ ok: true, stdout: "HEAD\n" })),
    "unknown"
  );
  assert.equal(
    baseShaNow(() => ({ ok: false })),
    "unknown"
  );
});

test("argv: exactly --feature <slug>", () => {
  assert.deepEqual(parseArgs(["--feature", "demo"]), { ok: true, feature: "demo" });
  for (const bad of [[], ["--feature"], ["--feature", "Demo"], ["--feature", "demo", "--x"], ["demo"], ["--feature", "a;b"]]) {
    assert.equal(parseArgs(bad).ok, false, JSON.stringify(bad));
  }
});

test("NO GIT WRITE: the one git call is `rev-parse HEAD`, and neither this module nor the core spawns git otherwise", () => {
  const src = readFileSync(join(HERE, "ship-closeout.mjs"), "utf8");
  const calls = [...src.matchAll(/\bgitSync\(|\bgit\(\s*\[/g)].length;
  assert.equal(calls, 1, "exactly one git invocation site");
  assert.match(src, /git\(\["rev-parse", "HEAD"\]\)/);
  for (const f of ["ship-closeout.mjs", "closeout-core.mjs"]) {
    const text = readFileSync(join(HERE, f), "utf8");
    assert.doesNotMatch(text, /(?:spawnSync|execFileSync|execSync|spawn|exec)\(\s*["'`]git["'`]/, f);
    assert.doesNotMatch(text, /["'`](?:commit|push|merge|add|switch|checkout|reset|branch)["'`]/, `${f}: a git write verb`);
  }
});

// ── ★ END-TO-END ─────────────────────────────────────────────────────────────────────────────────────────────

function project() {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "ship-closeout-")));
  const git = (...a) => spawnSync("git", a, { cwd: dir, encoding: "utf8" });
  git("init", "-q");
  git("config", "user.email", "t@example.invalid");
  git("config", "user.name", "t");
  git("config", "commit.gpgsign", "false");
  writeFileSync(join(dir, ".gitignore"), ".pharn/\n");
  git("add", "-A");
  git("commit", "-q", "-m", "seed");
  mkdirSync(join(dir, "pharn", "features", "demo"), { recursive: true });
  symlinkSync(join(REPO, "pharn", "floor"), join(dir, "pharn", "floor"), "dir");
  const env = { ...process.env, CLAUDE_PROJECT_DIR: dir };
  delete env.CLAUDE_CODE_SESSION_ID;
  const node = (...a) => spawnSync(process.execPath, a, { cwd: dir, encoding: "utf8", env });
  return { dir, node, head: git("rev-parse", "HEAD").stdout.trim(), done: () => rmSync(dir, { recursive: true, force: true }) };
}

for (const quick of [false, true]) {
  test(`★ END-TO-END — a ${quick ? "quick" : "full"} run's Step 3a: marker closed, ledger emitted, report ${quick ? "skipped" : "rendered"}`, () => {
    const p = project();
    try {
      const start = ["pharn/floor/mark-phase.mjs", "--name", "demo", "--kind", "run-start", ...(quick ? ["--mode", "quick"] : [])];
      assert.equal(p.node(...start).status, 0);
      assert.equal(p.node("pharn/floor/run-marker.mjs", "--open", "pharn-ship", "demo").status, 0);
      assert.ok(existsSync(join(p.dir, ".pharn", "pharn-ship", "demo", "active.json")));
      const r = p.node("pharn/floor/ship-closeout.mjs", "--feature", "demo");
      assert.equal(r.status, EXIT.DONE, `${r.stdout}${r.stderr}`);
      const lines = r.stdout.trimEnd().split("\n");
      const doc = JSON.parse(lines.at(-1));
      assertDoc(doc);
      assert.equal(doc.mode, quick ? "quick" : "full");
      assert.equal(doc.base_sha, p.head);
      assert.equal(doc.run_marker_close, "ok");
      assert.equal(existsSync(join(p.dir, ".pharn", "pharn-ship", "demo", "active.json")), false, "the run marker is closed");
      assert.ok(
        lines.some((l) => /^marker \d+: run-stop /.test(l)),
        "mark-phase's own line printed whole"
      );
      assert.ok(existsSync(join(p.dir, "pharn", "features", "demo", "cost.json")));
      assert.equal(existsSync(join(p.dir, "pharn", "features", "demo", "RUN-REPORT.md")), !quick);
    } finally {
      p.done();
    }
  });
}

test("★ END-TO-END — a refused argv exits 2 with a closing document and runs nothing", () => {
  const p = project();
  try {
    const r = p.node("pharn/floor/ship-closeout.mjs", "--feature", "x;touch PWNED");
    assert.equal(r.status, EXIT.UNUSABLE);
    assert.equal(JSON.parse(r.stdout.trim()).refusal, "usage");
    assert.equal(existsSync(join(p.dir, ".pharn", "cost")), false, "no marker was written");
    assert.equal(existsSync(join(p.dir, "PWNED")), false);
  } finally {
    p.done();
  }
});
