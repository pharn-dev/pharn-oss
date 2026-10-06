// pharn/floor/entry-base-evidence.test.mjs — the ENTRY-derived BASE evidence (6.49.0), END TO END through the REAL CLIs
// (L45): a delivery run's marker (its real writer), the pre-run snapshot, `entry-gates.mjs --start/--wait` and
// `stage-regress.mjs`, each run with the line its command PINS (L41). Every fixture counts its own work: each gate and the
// base install append a line to a counter file OUTSIDE the repo, side-tagged by where they ran (entry, head, base), and a
// post-checkout hook counts base worktree checkouts. A HIT is proven by those counters, never by the predicate, and each
// fresh control is asserted to count first (L34). Also here: the I/O edges of the offer/source reads per path kind (L59),
// and the ★ HOOK probe of the offer's storage (L65).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
  chmodSync,
  symlinkSync,
  copyFileSync,
  realpathSync,
  renameSync,
} from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { REGRESS_PATHS, PROGRESS_SCHEMA } from "./stage-regress-core.mjs";
import { ENTRY_PATHS } from "./entry-gates-core.mjs";
import { OFFER_BASENAME } from "./entry-base-evidence-core.mjs";
import { decideEntryFromDisk, materializeEntryBase, readOffer, discardEntryOffer } from "./entry-base-evidence.mjs";
import { readWork, WORK_FILE } from "./stage-work.mjs";
import { DEFAULT_BASE as COST_BASE } from "./mark-phase.mjs";
import { fingerprint, ENTRY_ALGO, ALGO } from "./worktree-fingerprint.mjs";
import { SCHEMA as GATE_RUN_SCHEMA, logBasename, ENTRY_BASE_TEST_ID } from "./gate-run-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const FEATURE = "demo";
const sha256 = (b) => createHash("sha256").update(b).digest("hex");
const CLEAN_ENV = { ...process.env };
delete CLEAN_ENV.NODE_TEST_CONTEXT; // a fixture gate that runs `node --test` must not report to THIS runner

// ── The pinned lines (L41/L45): the exact flags each command runs, substituted, executed against this checkout's floor ──
function pinned(commandFile, re) {
  const line = readFileSync(join(ROOT, ".claude", "commands", commandFile), "utf8")
    .split(/\r?\n/)
    .find((l) => re.test(l));
  assert.ok(line, `${commandFile} still pins ${re}`);
  return line
    .trim()
    .replace(/'<name>'|<name>/g, FEATURE)
    .split(/\s+/)
    .slice(1) // "node"
    .map((tok, i) => (i === 0 ? join(ROOT, tok) : tok));
}
const START = pinned("pharn-loop.md", /^\s*node pharn\/floor\/entry-gates\.mjs --start /);
const WAIT = pinned("pharn-loop.md", /^\s*node pharn\/floor\/entry-gates\.mjs --wait /);
const SNAPSHOT = pinned("pharn-loop.md", /^\s*node pharn\/floor\/pre-run-snapshot\.mjs --capture /);
const REGRESS = pinned("pharn-regress.md", /^node pharn\/floor\/stage-regress\.mjs --feature <name> --timeout-ms \d+ --budget-ms \d+\s*$/);
const LOOP_RECORD = join(ROOT, ".claude", "hooks", "require-loop-record.cjs");
const RUN_MARKER = join(HERE, "run-marker.mjs");
const CHECK_REGRESS = join(HERE, "check-regress.mjs");
const CHECK_LOOP_FRESH = join(HERE, "check-loop-fresh.mjs");
const CHECK_VERIFY = join(HERE, "check-verify.mjs");

const COUNT_JS =
  "import { appendFileSync } from 'node:fs';\n" +
  "const side = /[\\\\/]\\.pharn[\\\\/]pharn-regress[\\\\/]base([\\\\/]|$)/.test(process.cwd()) ? 'base'\n" +
  "  : /[\\\\/]\\.pharn[\\\\/]pharn-entry[\\\\/]/.test(process.env.PHARN_TEST_RESULTS || '') ? 'entry' : 'head';\n" +
  "if (process.env.EBE_COUNTER) appendFileSync(process.env.EBE_COUNTER, `${process.argv[2]} ${side}\\n`);\n";
const TEST_OK = (name, expr) =>
  `import { test } from 'node:test';\nimport assert from 'node:assert/strict';\nimport { add } from './index.js';\ntest('${name}', () => { assert.ok(${expr}); });\n`;

/** A git repo at its BASE commit: three counting gates, an npm lockfile with no dependencies (so the default inferred
 *  install is a real `npm ci` whose postinstall counts), source, an outside test, a post-checkout counter. */
function fixture({ scripts = {}, files = {}, gitignore = ".pharn/\nnode_modules/\n" } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "ebe-"));
  const counter = `${dir}.counter.log`;
  writeFileSync(counter, "");
  const w = (p, c) => {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    writeFileSync(join(dir, p), c);
  };
  const git = (...a) => execFileSync("git", a, { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  git("init", "-q", ".");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  w(".gitignore", gitignore);
  w("count.mjs", COUNT_JS);
  w(
    "package.json",
    JSON.stringify(
      {
        name: "fx",
        version: "1.0.0",
        scripts: {
          test: "node count.mjs test && node --test",
          typecheck: "node count.mjs typecheck",
          build: "node count.mjs build",
          postinstall: "node count.mjs install",
          ...scripts,
        },
      },
      null,
      2
    )
  );
  w(
    "package-lock.json",
    JSON.stringify({ name: "fx", version: "1.0.0", lockfileVersion: 3, requires: true, packages: { "": { name: "fx", version: "1.0.0" } } })
  );
  w("src/index.js", "export function add(a, b) { return a + b; }\n");
  w("src/index.test.js", TEST_OK("add", "add(1, 2) === 3"));
  for (const [p, c] of Object.entries(files)) w(p, c);
  git("add", "-A");
  git("commit", "-q", "-m", "base");
  const base = git("rev-parse", "HEAD").trim();
  const hook = join(dir, ".git", "hooks", "post-checkout");
  mkdirSync(dirname(hook), { recursive: true });
  writeFileSync(hook, '#!/bin/sh\n[ -n "$EBE_COUNTER" ] && echo "worktree base" >> "$EBE_COUNTER"\nexit 0\n');
  chmodSync(hook, 0o755);
  return { dir, counter, base, w, git };
}

function drop(fx) {
  spawnSync(process.execPath, [join(HERE, "entry-gates.mjs"), "--abort", "--feature", FEATURE], { cwd: fx.dir, env: CLEAN_ENV });
  rmSync(fx.dir, { recursive: true, force: true });
  rmSync(fx.counter, { force: true });
}

function node(fx, argv) {
  const r = spawnSync(process.execPath, argv, { cwd: fx.dir, encoding: "utf8", env: { ...CLEAN_ENV, EBE_COUNTER: fx.counter } });
  return { code: r.status, stdout: r.stdout || "", stderr: r.stderr || "" };
}

function lines(fx) {
  return readFileSync(fx.counter, "utf8").split("\n").filter(Boolean);
}

function counts(fx, from) {
  const c = { worktree: 0, install: 0, entry: 0, head: 0, base: 0 };
  for (const l of lines(fx).slice(from)) {
    const [what, side] = l.split(" ");
    if (what === "worktree") c.worktree++;
    else if (what === "install") c.install++;
    else c[side]++;
  }
  return c;
}

/** A delivery run's entry steps, as /pharn-loop Step 1a runs them (or /pharn-ship's, with its marker): the marker, the
 *  pre-run snapshot, the entry start, then the wait read before /pharn-test. Returns the wait document. */
function enter(fx, { command = "pharn-loop" } = {}) {
  const open =
    command === "pharn-loop"
      ? node(fx, [LOOP_RECORD, "--open", FEATURE, "--cap", "3"])
      : node(fx, [RUN_MARKER, "--open", command, FEATURE]);
  assert.equal(open.code, 0, open.stdout + open.stderr);
  const snap = node(fx, SNAPSHOT);
  assert.equal(snap.code, 0, snap.stdout + snap.stderr);
  const start = node(fx, START);
  assert.equal(start.code, 0, start.stdout + start.stderr);
  let wait;
  for (let i = 0; i < 20; i++) {
    wait = node(fx, WAIT);
    if (wait.code !== 5) break;
  }
  return { start, wait, doc: JSON.parse(wait.stdout) };
}

/** The front stages' artifacts and a build: an approved SPEC/PLAN, a source edit and a NEW (inside) test. */
function build(fx, { plan = ["src/index.js", "src/new.test.js"], edits = {} } = {}) {
  const body = "\n## Intent\n\nwhat and why\n\n## Scope\n\nfiller\n\n## Acceptance Criteria\n\nfiller\n\n## Constraints\n\nfiller\n";
  const hash = sha256(body);
  fx.w(`pharn/features/${FEATURE}/SPEC.md`, `---\nspec_id: ${FEATURE}\nstate: Approved\nspec_content_hash: ${hash}\n---\n${body}`);
  fx.w(
    `pharn/features/${FEATURE}/PLAN.md`,
    `---\nspec_id: ${FEATURE}\nspec_content_hash: ${hash}\n---\n\n## Files\n\n${plan.map((p) => `- \`${p}\` — x`).join("\n")}\n`
  );
  fx.w("src/index.js", "export function add(a, b) { return a + b; }\nexport const id = (x) => x;\n");
  fx.w("src/new.test.js", "import { test } from 'node:test';\ntest('new', () => {});\n");
  for (const [p, c] of Object.entries(edits)) fx.w(p, c);
}

/** One regress through the pinned line (or `argv`); its exit, report, block and what it counted. */
function regress(fx, argv = REGRESS) {
  const from = lines(fx).length;
  const r = node(fx, argv);
  let json = null;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    /* a crash */
  }
  const reportPath = join(fx.dir, "pharn", "features", FEATURE, "regression-report.json");
  const report = json && json.status === "done" && existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, "utf8")) : null;
  return { ...r, json, report, be: report ? report.base_evidence : null, counts: counts(fx, from), raw: r.stdout + r.stderr };
}

const gitDir = (fx) => execFileSync("git", ["rev-parse", "--absolute-git-dir"], { cwd: fx.dir, encoding: "utf8" }).trim();
const offerFile = (fx) => join(gitDir(fx), OFFER_BASENAME);

/** Hide the offer for one regress (a control path that cannot use entry evidence), then put it back. */
function withoutOffer(fx, fn) {
  const p = offerFile(fx);
  const aside = `${fx.dir}.offer-aside`;
  renameSync(p, aside);
  try {
    return fn();
  } finally {
    renameSync(aside, p);
  }
}

// ── ★ THE HIT (the acceptance criterion) ───────────────────────────────────────────────────────────────────────────
test("★ entry HIT — a run that began clean at BASE takes its BASE from the entry gates: no worktree, no install, no base gate; HEAD unchanged", () => {
  const fx = fixture();
  try {
    const e = enter(fx);
    assert.equal(e.doc.status, "green", e.wait.stdout);
    assert.deepEqual(
      e.doc.gates.map((g) => g.id),
      [ENTRY_BASE_TEST_ID, "test", "typecheck", "build"],
      "the evidence slot runs first after the (absent) style part"
    );
    assert.ok(existsSync(offerFile(fx)), "the validated --wait published the offer in the git dir");
    const entryLog = readFileSync(join(fx.dir, COST_BASE, FEATURE, "entry.jsonl"), "utf8");
    build(fx);

    const hit = regress(fx);
    assert.equal(hit.code, 0, hit.raw);
    assert.equal(hit.be.source, "entry", JSON.stringify(hit.be));
    assert.equal(hit.be.entry.used, true);
    assert.deepEqual(hit.be.entry.reused_ids, ["test", "typecheck", "build"]);
    assert.deepEqual(hit.be.entry.ignored_ids, ["test"], "entry's verify-shaped full-suite test is not BASE evidence");
    assert.equal(hit.be.reused, false, "6.33.0's own fields keep their meaning: no retained evidence was reused");
    assert.equal(hit.be.recorded, false, "no retained record binds entry-derived evidence");
    assert.deepEqual(hit.counts, { worktree: 0, install: 0, entry: 0, head: 3, base: 0 }, "nothing ran at BASE; HEAD ran in full");
    assert.equal(hit.report.gate_run.base.fingerprint.algo, ENTRY_ALGO, "the report shows the derivation");
    assert.ok(!existsSync(join(fx.dir, REGRESS_PATHS.base)), "no base worktree");

    // The verdict is check-regress.mjs's: re-deriving it over the stamps on disk reproduces the report.
    const again = node(fx, [
      CHECK_REGRESS,
      "verdict",
      "--base-stamp",
      join(REGRESS_PATHS.baseGates, "stamp.json"),
      "--head-stamp",
      join(REGRESS_PATHS.head, "stamp.json"),
      "--base",
      fx.base,
    ]);
    const re = JSON.parse(again.stdout);
    for (const f of ["verdict", "regressions", "pre_existing", "outside_gates"]) assert.deepEqual(re[f], hit.report[f], f);

    // The slot's list IS regress's own outside-test list for this build (✧ parity: one owner, same call).
    const slot = JSON.parse(readFileSync(join(fx.dir, ENTRY_PATHS.baseTests), "utf8"));
    const scope = JSON.parse(readFileSync(join(fx.dir, REGRESS_PATHS.scopeJson), "utf8"));
    assert.deepEqual(slot, scope.outside_tests);

    const md = readFileSync(join(fx.dir, "pharn", "features", FEATURE, "REGRESSION.md"), "utf8");
    assert.match(md, /BASE evidence: taken from this run's ENTRY gates/);
    assert.match(md, /install: none run by this invocation \(the BASE evidence came from this run's entry gates\)\./);
    assert.match(md, /NOT claimed/);

    // The cost ledger: executed 0, install none, evidence entry; the entry observations are untouched by regress.
    const { records } = readWork(join(fx.dir, COST_BASE, FEATURE, WORK_FILE));
    const wk = records.at(-1);
    assert.equal(wk.base.evidence, "entry");
    assert.equal(wk.base.executed, 0);
    assert.equal(wk.base.reused, 3);
    assert.equal(wk.install, null);
    assert.equal(wk.head.executed, hit.counts.head);
    assert.equal(readFileSync(join(fx.dir, COST_BASE, FEATURE, "entry.jsonl"), "utf8"), entryLog, "regress writes no entry observation");
  } finally {
    drop(fx);
  }
});

// ── ★ PARITY — the same tree, a fresh BASE and an entry BASE: the same regression semantics ─────────────────────────
test("★ equivalent environment — fresh BASE (no offer) and entry BASE classify a real regression and a RED-at-BASE gate the same", () => {
  const fx = fixture({
    scripts: { typecheck: "node count.mjs typecheck && exit 1" }, // red at BASE and HEAD: pre_existing
    files: {
      "src/other.js": "import { add } from './index.js';\nexport const addOne = (x) => add(x, 1);\n",
      "src/other.test.js":
        "import { test } from 'node:test';\nimport assert from 'node:assert/strict';\nimport { addOne } from './other.js';\ntest('addOne', () => { assert.equal(addOne(5), 6); });\n",
    },
  });
  try {
    const e = enter(fx);
    assert.equal(e.doc.status, "red", "typecheck is red at entry (the run may continue past it)");
    build(fx, { edits: { "src/index.js": "export function add(a, b) { return a - b; }\n" } }); // breaks the outside test
    const b = regress(fx);
    assert.equal(b.code, 0, b.raw);
    assert.equal(b.be.source, "entry", JSON.stringify(b.be));
    const a = withoutOffer(fx, () => regress(fx));
    assert.equal(a.be.source, "fresh");
    assert.equal(a.be.entry.miss, "no-offer");
    assert.ok(
      a.counts.worktree === 1 && a.counts.install === 1 && a.counts.base === 3,
      `L34: the control counts: ${JSON.stringify(a.counts)}`
    );
    for (const f of ["verdict", "regressions", "pre_existing", "outside_gates"]) assert.deepEqual(b.report[f], a.report[f], f);
    assert.equal(b.report.verdict, "regressions");
    assert.deepEqual(b.report.regressions, ["test"]);
    assert.deepEqual(b.report.pre_existing, ["typecheck"], "a completed RED entry result stays RED in the BASE evidence");
  } finally {
    drop(fx);
  }
});

// ── ENVIRONMENT DIVERGENCE — why the follow-up exists: the nested worktree is not the start environment ──────────────
test("environment divergence — an ignored local input the entry tree has and a nested worktree lacks: entry BASE records the real start (no equality asserted)", () => {
  const fx = fixture({
    scripts: { typecheck: "node count.mjs typecheck && node -e \"process.exit(require('fs').existsSync('.env.local') ? 0 : 1)\"" },
    gitignore: ".pharn/\nnode_modules/\n.env.local\n",
  });
  try {
    fx.w(".env.local", "SECRET=1\n"); // ignored, so the snapshot stays empty and git never copies it into a worktree
    enter(fx);
    build(fx);
    const b = regress(fx);
    assert.equal(b.be.source, "entry");
    assert.equal(b.report.outside_gates.typecheck.base, 0, "the entry tree had .env.local: green at BASE");
    const a = withoutOffer(fx, () => regress(fx));
    assert.equal(a.be.source, "fresh");
    assert.equal(a.report.outside_gates.typecheck.base, 1, "the nested worktree lacks it: red at BASE");
    // Deliberately NOT asserting a.verdict === b.verdict: the two BASE observations differ because their environments do.
  } finally {
    drop(fx);
  }
});

// ── MISS → the exact normal path ───────────────────────────────────────────────────────────────────────────────────
test("a build that edits a pre-existing test MISSes shape-mismatch and runs worktree → install → base-init → drain-base exactly as without an offer", () => {
  // two outside tests, so the edited one leaves a SHORTER, non-empty list (editing the only one would leave a legitimate
  // no-files slot, which needs no entry evidence and HITs)
  const fx = fixture({ files: { "src/other.test.js": TEST_OK("other", "true") } });
  try {
    enter(fx);
    build(fx, {
      plan: ["src/index.js", "src/new.test.js", "src/index.test.js"],
      edits: { "src/index.test.js": TEST_OK("add2", "add(2, 2) === 4") },
    });
    const m = regress(fx);
    assert.equal(m.code, 0, m.raw);
    assert.equal(m.be.source, "fresh");
    assert.equal(m.be.entry.miss, "shape-mismatch");
    rmSync(join(gitDir(fx), "pharn-regress-base-reuse.json")); // the miss run published a retained record; drop it
    const control = withoutOffer(fx, () => regress(fx));
    assert.deepEqual(m.counts, control.counts, "the same work as a run with no offer at all");
    assert.deepEqual(m.counts, { worktree: 1, install: 1, entry: 0, head: 3, base: 3 });
  } finally {
    drop(fx);
  }
});

test("explicit --install / --no-install MISS install-override; a standalone regress (no open run) MISSes no-delivery-run — both fresh", () => {
  const fx = fixture();
  try {
    enter(fx);
    build(fx);
    for (const extra of [["--install", "npm ci"], ["--no-install"]]) {
      const r = regress(fx, [...REGRESS, ...extra]);
      assert.equal(r.code, 0, r.raw);
      assert.equal(r.be.entry.miss, "install-override", extra.join(" "));
      assert.equal(r.be.source, "fresh");
      assert.ok(r.counts.base === 3 && r.counts.worktree === 1);
    }
    rmSync(join(fx.dir, ".pharn", "pharn-loop", FEATURE, "active.json"));
    const r = regress(fx);
    assert.equal(r.be.entry.miss, "no-delivery-run");
    assert.equal(r.be.source, "fresh");
  } finally {
    drop(fx);
  }
});

test("precedence — a published 6.33.0 retained record HITs first (entry never asked); a retained MISS falls through to entry", () => {
  const fx = fixture();
  try {
    enter(fx);
    build(fx);
    const first = withoutOffer(fx, () => regress(fx)); // fresh, publishes a retained record
    assert.equal(first.be.recorded, true);
    const second = regress(fx);
    assert.equal(second.be.reused, true, JSON.stringify(second.be));
    assert.equal(second.be.source, "reused");
    assert.equal(second.be.entry, null, "the entry rule was never asked");
    assert.deepEqual(second.counts, { worktree: 0, install: 0, entry: 0, head: 3, base: 0 });
    rmSync(join(gitDir(fx), "pharn-regress-base-reuse.json"));
    const third = regress(fx);
    assert.equal(third.be.miss, "no-record");
    assert.equal(third.be.source, "entry");
  } finally {
    drop(fx);
  }
});

test("HEAD install drift still refuses head-install-drift before any gate, with an offer present", () => {
  const lock = JSON.stringify({
    name: "fx",
    lockfileVersion: 3,
    requires: true,
    packages: { "": { name: "fx" }, "node_modules/dep": { version: "2.0.0", resolved: "file:dep.tgz", integrity: "sha512-x" } },
  });
  const fx = fixture({ files: { "package-lock.json": lock } });
  try {
    fx.w("node_modules/.package-lock.json", lock.replace('"2.0.0"', '"1.0.0"'));
    enter(fx);
    assert.ok(existsSync(offerFile(fx)));
    build(fx);
    const r = regress(fx);
    assert.equal(r.code, 3, r.raw);
    assert.equal(r.json.reason_code, "head-install-drift");
    assert.equal(r.counts.head, 0, "no gate ran");
  } finally {
    drop(fx);
  }
});

// ── the verdict-time re-decision: a persisted HIT is never trusted ─────────────────────────────────────────────────
test("resume — a persisted entry HIT is re-decided: genuine → HIT; source edited during the pause → source-unbound; offer gone → no-offer", () => {
  const fx = fixture();
  try {
    enter(fx);
    build(fx);
    const first = regress(fx);
    assert.equal(first.be.source, "entry");
    const marker = readFileSync(join(fx.dir, ".pharn", "pharn-loop", FEATURE, "active.json"));
    const record = (entryReuse) => ({
      schema: PROGRESS_SCHEMA,
      feature: FEATURE,
      timeoutMs: 540000,
      budgetMs: null,
      base: fx.base,
      phase: "verdict",
      install: { kind: "cmd", cmd: "npm ci", unmeasured: false, family: "npm" },
      e2eExcluded: [],
      styleSkipped: true,
      installResult: null,
      cleanupResult: null,
      baseReuse: {
        reused: false,
        miss: "no-record",
        requirementSha256: first.be.requirement_sha256,
        stampSha256: null,
        run: { command: "pharn-loop", markerSha256: sha256(marker) },
      },
      installOverride: false,
      entryReuse,
    });
    const genuine = {
      reused: true,
      miss: null,
      offerSha256: first.be.entry.offer_sha256,
      sourceStampSha256: first.be.entry.entry_stamp_sha256,
      run: { command: "pharn-loop", markerSha256: sha256(marker) },
    };
    const resume = (rec) => {
      writeFileSync(join(fx.dir, REGRESS_PATHS.stageJson), JSON.stringify(rec));
      return regress(fx, [join(HERE, "stage-regress.mjs"), "--resume"]);
    };
    const ok = resume(record(genuine));
    assert.equal(ok.code, 0, ok.raw);
    assert.equal(ok.be.source, "entry");
    assert.equal(ok.counts.base, 0);

    // (b) the entry source changes while the chain is paused: the re-decision misses and the BASE side runs.
    const stampPath = join(fx.dir, ENTRY_PATHS.stamp);
    const original = readFileSync(stampPath);
    writeFileSync(stampPath, `${original.toString("utf8")}\n`);
    const moved = resume(record(genuine));
    assert.equal(moved.code, 0, moved.raw);
    assert.equal(moved.be.source, "fresh");
    assert.equal(moved.be.entry.miss, "source-unbound");
    assert.ok(moved.counts.base === 3 && moved.counts.worktree === 1, JSON.stringify(moved.counts));
    writeFileSync(stampPath, original);

    // (c) a forged progress HIT with no offer behind it manufactures nothing.
    rmSync(offerFile(fx));
    const forged = resume(record(genuine));
    assert.equal(forged.be.source, "fresh");
    assert.equal(forged.be.entry.miss, "no-offer");
    assert.equal(forged.counts.base, 3);
  } finally {
    drop(fx);
  }
});

// ── ★ freshness: the derived evidence satisfies check-loop-fresh unchanged ─────────────────────────────────────────
function writeVerifyStampAndReport(dir, { head, digest }) {
  const outDir = join(dir, ".pharn", "pharn-verify", "gates");
  mkdirSync(outDir, { recursive: true });
  const b = logBasename(0, "reconcile");
  writeFileSync(join(outDir, `${b}.out`), "ok\n");
  writeFileSync(join(outDir, `${b}.err`), "");
  const stamp = {
    schema: GATE_RUN_SCHEMA,
    stage: "verify",
    side: null,
    feature: FEATURE,
    head,
    source: "discover",
    source_raw: null,
    style_skipped: false,
    finalized: true,
    fingerprint: { algo: ALGO, init: digest, final: digest },
    required: [],
    runs: [
      {
        seq: 0,
        id: "reconcile",
        exit: 0,
        ran: true,
        timed_out: false,
        mutated: false,
        reason: null,
        argv: ["true"],
        shell: null,
        files: [],
        fp_before: digest,
        fp_after: digest,
        stdout_sha256: sha256(readFileSync(join(outDir, `${b}.out`))),
        stderr_sha256: sha256(""),
        results_sha256: null,
      },
    ],
    aux: { completeness: 0 },
  };
  const stampPath = join(outDir, "stamp.json");
  writeFileSync(stampPath, JSON.stringify(stamp, null, 2));
  const r = spawnSync(process.execPath, [CHECK_VERIFY, "--stamp", stampPath, "--feature", FEATURE, "--ac-gate"], {
    cwd: dir,
    encoding: "utf8",
    env: CLEAN_ENV,
  });
  writeFileSync(join(dir, "pharn", "features", FEATURE, "verify-report.json"), r.stdout);
}

function freshness(fx) {
  const fp = fingerprint(fx.dir, { feature: FEATURE });
  assert.ok(fp.ok);
  writeVerifyStampAndReport(fx.dir, { head: fx.base, digest: fp.digest });
  const r = spawnSync(process.execPath, [CHECK_LOOP_FRESH, "--feature", FEATURE, "--base", fx.base, "--iter", "1", "--repo", fx.dir], {
    encoding: "utf8",
    env: CLEAN_ENV,
  });
  return JSON.parse(r.stdout);
}

test("★ freshness — check-loop-fresh reads FRESH over an entry HIT (C, D, E, H, J pass), with and without a no-files slot (grill G4); a forged derivation stops at C", () => {
  for (const noFiles of [false, true]) {
    const fx = fixture();
    try {
      if (noFiles) {
        // every test file is inside the feature: regress's test is a no-files slot, written with empty logs
        fx.git("rm", "-q", "src/index.test.js");
        fx.git("commit", "-q", "-m", "no outside tests");
        fx.base = fx.git("rev-parse", "HEAD").trim();
      }
      enter(fx);
      build(fx);
      const hit = regress(fx);
      assert.equal(hit.be.source, "entry", JSON.stringify(hit.be));
      if (noFiles) assert.deepEqual(hit.be.entry.no_files_ids, ["test"]);
      const doc = freshness(fx);
      assert.equal(doc.verdict, "FRESH", JSON.stringify(doc));
      for (const id of ["C", "D", "E", "H", "J"]) assert.equal(doc.checks[id], "pass", `${id}: ${JSON.stringify(doc.checks)}`);
      if (!noFiles) {
        const stampPath = join(fx.dir, REGRESS_PATHS.baseGates, "stamp.json");
        const s = JSON.parse(readFileSync(stampPath, "utf8"));
        s.runs[1].reused.stage = "regress";
        writeFileSync(stampPath, JSON.stringify(s, null, 2));
        const forged = freshness(fx);
        assert.equal(forged.reason_code, "stamp-malformed", JSON.stringify(forged));
        assert.equal(forged.checks.C, "fail");
      }
    } finally {
      drop(fx);
    }
  }
});

// ── the slot degrades, never refuses (grill G5/G11) ────────────────────────────────────────────────────────────────
test("no slot — a test path badPath refuses, or a leftover regress BASE checkout, gives an entry run WITHOUT base:test (never unusable), and regress MISSes gate-missing", () => {
  for (const variant of ["dash-path", "leftover-base"]) {
    const fx = fixture(
      variant === "dash-path" ? { files: { "-weird.test.js": "import { test } from 'node:test';\ntest('w', () => {});\n" } } : {}
    );
    try {
      if (variant === "leftover-base") mkdirSync(join(fx.dir, REGRESS_PATHS.base), { recursive: true });
      const e = enter(fx);
      assert.ok(["green", "red"].includes(e.doc.status), `${variant}: the entry check decided, never unusable: ${e.wait.stdout}`);
      assert.ok(!e.doc.gates.some((g) => g.id === ENTRY_BASE_TEST_ID), `${variant}: no slot`);
      assert.ok(
        e.doc.gates.some((g) => g.id === "test"),
        "control: verify's own test still ran"
      );
      build(fx);
      const r = regress(fx);
      assert.equal(r.code, 0, r.raw);
      assert.equal(r.be.entry.miss, "gate-missing", variant);
    } finally {
      drop(fx);
    }
  }
});

test("the offer is published only after a validated green or red --wait: a red entry offers; no open run offers nothing and says nothing", () => {
  const fx = fixture({ scripts: { build: "node count.mjs build && exit 2" } });
  try {
    const e = enter(fx);
    assert.equal(e.doc.status, "red");
    const offer = JSON.parse(readFileSync(offerFile(fx), "utf8"));
    assert.equal(offer.base, fx.base);
    assert.equal(offer.stamp_sha256, sha256(readFileSync(join(fx.dir, ENTRY_PATHS.stamp))));
    assert.equal(e.wait.stderr, "", "a successful publication prints nothing");
    // a new --start discards it (and every later run's offer is its own)
    assert.equal(node(fx, START).code, 0);
    assert.ok(!existsSync(offerFile(fx)), "--start removed the earlier offer");
  } finally {
    drop(fx);
  }
  const fx2 = fixture();
  try {
    // no marker: the wait still decides, its document and exit are the same, and no offer exists
    const start = node(fx2, START);
    assert.equal(start.code, 0, start.stderr);
    let w;
    for (let i = 0; i < 20; i++) if ((w = node(fx2, WAIT)).code !== 5) break;
    assert.equal(w.code, 0, w.stdout);
    assert.equal(w.stderr, "");
    assert.ok(!existsSync(offerFile(fx2)));
  } finally {
    drop(fx2);
  }
});

test("a publication that fails leaves --wait's document and exit byte-identical (a directory planted at the offer path)", () => {
  const fx = fixture();
  try {
    node(fx, [LOOP_RECORD, "--open", FEATURE, "--cap", "3"]);
    node(fx, SNAPSHOT);
    assert.equal(node(fx, START).code, 0);
    let ok;
    for (let i = 0; i < 20; i++) if ((ok = node(fx, WAIT)).code !== 5) break;
    rmSync(offerFile(fx));
    mkdirSync(join(offerFile(fx), "blocker"), { recursive: true }); // rename over a non-empty directory fails
    const again = node(fx, WAIT);
    assert.equal(again.code, ok.code);
    assert.equal(again.stdout, ok.stdout, "the document is unchanged");
    assert.match(again.stderr, /^entry-gates: note — the entry evidence could not be offered to \/pharn-regress \(write-failed\)\n$/);
  } finally {
    drop(fx);
  }
});

// ── I/O edges, per path kind (L54/L59) ─────────────────────────────────────────────────────────────────────────────
function inDir(dir, fn) {
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    return fn();
  } finally {
    process.chdir(cwd);
  }
}

test("path kinds — a link, a dangling link, a directory and a FIFO at the offer / the entry stamp are misses, never followed; a bad log is log-unverified", () => {
  const fx = fixture();
  try {
    enter(fx);
    build(fx);
    const inputs = { feature: FEATURE, base: fx.base, timeoutMs: 540000, installOverride: false };
    // Run the HEAD side once so the head stamp exists (the predicate's first input).
    assert.equal(regress(fx).be.source, "entry");
    const decide = () => inDir(fx.dir, () => decideEntryFromDisk(inputs).decision);
    assert.equal(decide().reused, true, "control");

    const op = offerFile(fx);
    const keep = readFileSync(op);
    const kinds = {
      link: () => symlinkSync(`${op}.real`, op),
      dangling: () => symlinkSync(join(fx.dir, "nowhere"), op),
      directory: () => mkdirSync(op),
      fifo: () => execFileSync("mkfifo", [op]),
    };
    for (const [kind, make] of Object.entries(kinds)) {
      writeFileSync(`${op}.real`, keep);
      rmSync(op, { recursive: true, force: true });
      make();
      assert.equal(decide().miss, "offer-malformed", `offer as ${kind}`);
      rmSync(op, { recursive: true, force: true });
    }
    writeFileSync(op, keep);
    assert.equal(inDir(fx.dir, () => readOffer()).state, "ok");

    const sp = join(fx.dir, ENTRY_PATHS.stamp);
    const stampBytes = readFileSync(sp);
    const sKinds = {
      link: () => symlinkSync(`${sp}.real`, sp),
      directory: () => mkdirSync(sp),
      fifo: () => execFileSync("mkfifo", [sp]),
    };
    for (const [kind, make] of Object.entries(sKinds)) {
      writeFileSync(`${sp}.real`, stampBytes);
      rmSync(sp, { recursive: true, force: true });
      make();
      assert.equal(decide().miss, "source-unusable", `entry stamp as ${kind}`);
      rmSync(sp, { recursive: true, force: true });
    }
    writeFileSync(sp, stampBytes);
    assert.equal(decide().reused, true, "restored");

    // a log edited after the stamp hashed it: materialization refuses and leaves no partial evidence
    const full = inDir(fx.dir, () => decideEntryFromDisk(inputs));
    const src = full.detail.mapping.find((m) => m.id === "typecheck").source;
    const log = join(fx.dir, ENTRY_PATHS.gates, `${logBasename(src.seq, src.id)}.out`);
    writeFileSync(log, "tampered\n");
    const m = inDir(fx.dir, () =>
      materializeEntryBase({ feature: FEATURE, base: fx.base, detail: full.detail, entryStampSha256: full.decision.sourceStampSha256 })
    );
    assert.deepEqual(m, { ok: false, miss: "log-unverified" });
    assert.ok(!existsSync(join(fx.dir, REGRESS_PATHS.baseGates)), "no derived directory survives a failed copy");
    const r = regress(fx);
    assert.equal(r.be.entry.miss, "log-unverified");
    assert.equal(r.be.source, "fresh");
    assert.equal(r.counts.base, 3, "the BASE side ran");
    rmSync(log);
    symlinkSync(`${log}.real`, log);
    assert.deepEqual(
      inDir(fx.dir, () =>
        materializeEntryBase({ feature: FEATURE, base: fx.base, detail: full.detail, entryStampSha256: full.decision.sourceStampSha256 })
      ),
      { ok: false, miss: "log-unverified" },
      "a symlinked log is never followed"
    );
    assert.deepEqual(
      inDir(fx.dir, () => discardEntryOffer()),
      { ok: true }
    );
    assert.equal(decide().miss, "no-offer");
  } finally {
    drop(fx);
  }
});

// ── ★ HOOK — the offer is out of the WRITE TOOLS' reach; `.pharn/` is not (why the offer is not there) — L65 ────────
const PROTECT = join(ROOT, ".claude", "hooks", "protect-trusted-paths.cjs");
const ENFORCE = join(ROOT, ".claude", "hooks", "enforce-writes-scope.cjs");

function installHooks(projectDir) {
  const dir = join(projectDir, ".claude", "hooks");
  mkdirSync(dir, { recursive: true });
  for (const h of [PROTECT, ENFORCE]) copyFileSync(h, join(dir, h.split("/").pop()));
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

test("★ HOOK — both real write guards deny the offer path in a main checkout and a linked worktree; the entry source under .pharn/ is writable", () => {
  const fx = fixture();
  const wt = `${fx.dir}-wt`;
  try {
    installHooks(fx.dir);
    const mainOffer = offerFile(fx);
    assert.equal(realpathSync(dirname(mainOffer)), realpathSync(join(fx.dir, ".git")));
    assert.equal(hookExit(PROTECT, fx.dir, mainOffer), 2, "protect-trusted-paths denies git metadata");
    assert.equal(hookExit(ENFORCE, fx.dir, mainOffer), 2);
    const source = join(fx.dir, ENTRY_PATHS.stamp);
    assert.equal(hookExit(PROTECT, fx.dir, source), 0);
    assert.equal(hookExit(ENFORCE, fx.dir, source), 0, "`.pharn/**` is always writable — why the offer binds it by sha256");
    execFileSync("git", ["worktree", "add", "-q", "--detach", wt], { cwd: fx.dir });
    installHooks(wt);
    const wtOffer = join(execFileSync("git", ["rev-parse", "--absolute-git-dir"], { cwd: wt, encoding: "utf8" }).trim(), OFFER_BASENAME);
    assert.ok(wtOffer.includes(join(".git", "worktrees")), wtOffer);
    assert.equal(hookExit(ENFORCE, wt, wtOffer), 2, "enforce-writes-scope denies a path inside another git tree");
  } finally {
    try {
      execFileSync("git", ["worktree", "remove", "--force", wt], { cwd: fx.dir, stdio: "ignore" });
    } catch {
      /* already gone */
    }
    rmSync(wt, { recursive: true, force: true });
    drop(fx);
  }
});
