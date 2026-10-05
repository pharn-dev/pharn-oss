// pharn/floor/loop-closeout.test.mjs — behaviour pins for /pharn-loop's closeout (6.43.0, loop-closeout-script).
//
// Two kinds of test. (1) STUBBED children, REAL git: `closeLoop` takes the step runner as a parameter, so every
// outcome class is driven by recorded child exits while the branch, staging, commit and undo run against a real
// throwaway repository. (2) ★ END-TO-END: the CLI with its REAL children in a fixture project (L41 — the default
// runner every unit test overrides is exercised too). The argv of every step is compared with the close part's former
// pinned line, carried below as a literal (TODAY), so a dropped flag or a sibling `--command` fails here.
// The executed branch/undo cases moved here from command-hygiene.test.mjs's SHELL-SINK 7 when the branch and undo
// blocks moved into this module.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  COMMIT_BODY,
  DOC_KEYS,
  EXIT,
  GREEN_TOKENS,
  NOT_COMMITTED_REASONS,
  STAGE_ARTIFACTS,
  addArgs,
  buildStageList,
  closeLoop,
  commitArgs,
  commitGateArgs,
  createBranch,
  isLoopBranchOf,
  parseArgs,
  phasePath,
  recordFacts,
  stageListPath,
  undoArgs,
  undoBranch,
} from "./loop-closeout.mjs";
import { commandFamilyText } from "../../.dev/floor/command-family.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const FEATURE = "demo";

// ── fixtures ─────────────────────────────────────────────────────────────────────────────────────────────────

function sh(dir, ...args) {
  return spawnSync("git", args, { cwd: dir, encoding: "utf8" });
}

/** A throwaway repository with a seed commit, the feature directory, SPEC.md, PLAN.md and LOOP.md. */
function fixture({ record = loopRecord(), spec = "Draft", reflog = true } = {}) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "loop-closeout-")));
  sh(dir, "init", "-q");
  if (!reflog) sh(dir, "config", "core.logAllRefUpdates", "false");
  sh(dir, "config", "user.email", "t@example.invalid");
  sh(dir, "config", "user.name", "t");
  sh(dir, "config", "commit.gpgsign", "false");
  if (!reflog) rmSync(join(dir, ".git", "logs"), { recursive: true, force: true });
  writeFileSync(join(dir, "README"), "seed\n");
  writeFileSync(join(dir, "-"), "committed\n");
  writeFileSync(join(dir, ".gitignore"), ".pharn/\n");
  sh(dir, "add", "-A");
  assert.equal(sh(dir, "commit", "-q", "-m", "seed").status, 0, "fixture: the seed commit");
  const base = sh(dir, "rev-parse", "HEAD").stdout.trim();
  const fd = join(dir, "pharn", "features", FEATURE);
  mkdirSync(fd, { recursive: true });
  writeFileSync(join(fd, "SPEC.md"), `---\nspec_id: demo\nstate: ${spec}\nspec_content_hash: ""\n---\n\n## Intent\n\nx\n`);
  writeFileSync(join(fd, "PLAN.md"), "# PLAN\n\n## Files\n\n- `src/a.js` — the change\n");
  if (record !== null) writeFileSync(join(fd, "LOOP.md"), record);
  mkdirSync(join(dir, ".pharn", "pharn-loop", FEATURE), { recursive: true });
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "src", "a.js"), "export const a = 1;\n");
  const head = () =>
    sh(dir, "symbolic-ref", "--short", "-q", "HEAD").stdout.trim() || `detached@${sh(dir, "rev-parse", "HEAD").stdout.trim()}`;
  const hasBranch = (b) => sh(dir, "show-ref", "--verify", "--quiet", `refs/heads/${b}`).status === 0;
  return { dir, base, head, hasBranch, done: () => rmSync(dir, { recursive: true, force: true }) };
}

function loopRecord({ decision = "STOP_GREEN", mode, blocked, iterations = "1", cap = "3" } = {}) {
  return (
    `---\ndecision: ${decision}\n${blocked ? `blocked: ${blocked}\n` : ""}iterations: ${iterations}\ncap: ${cap}\n` +
    `commit: unknown\ndate: 2026-10-05\n${mode ? `mode: ${mode}\n` : ""}---\n\n# LOOP — demo\n\n## Handoff\n\n` +
    "### investigated\n\nx\n\n### learned\n\nx\n\n### next_steps\n\nx\n"
  );
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

/** A step runner that records every step and answers with the given exit per step id. `setScope` writes the scope
 *  record the real setter would (the builder reads it), unless `scopeRecord` says otherwise. */
function stub({ exits = {}, scope = ["src/a.js"], scopeRecord } = {}) {
  const calls = [];
  const run = (s) => {
    calls.push({ id: s.id, script: s.script, args: [...s.args] });
    if (s.id === "set-writes-scope.cjs --from-plan") {
      const rec = scopeRecord ?? { scope, set_by: `pharn/features/${FEATURE}/PLAN.md`, set_at: "x" };
      writeFileSync(join(".pharn", "writes-scope.json"), typeof rec === "string" ? rec : JSON.stringify(rec));
    }
    const status = Object.hasOwn(exits, s.id) ? exits[s.id] : 0;
    return { status, stdout: `${s.id} said hi\n`, stderr: "", error: null };
  };
  return { run, calls, ids: () => calls.map((c) => c.id) };
}

function close(fx, opts = {}) {
  const lines = [];
  const doc = inDir(fx.dir, () => closeLoop({ feature: FEATURE, base: fx.base, log: (s) => lines.push(s), ...opts }));
  assertDoc(doc);
  return { doc, out: lines.join("") };
}

function assertDoc(doc) {
  assert.deepEqual(Object.keys(doc).sort(), [...DOC_KEYS].sort(), "the closing document's keys are closed both ways");
  if (doc.outcome !== null) {
    const ok =
      /^committed pharn-loop\/[a-z0-9-]+$/.test(doc.outcome) ||
      NOT_COMMITTED_REASONS.some((r) => doc.outcome === `not committed: ${r}`) ||
      /^not committed: (STOP_GREEN|STOP_GREEN_QUICK|STOP_CAP|STOP_TERMINAL|INCONCLUSIVE)$/.test(doc.outcome);
    assert.ok(ok, `outcome ${JSON.stringify(doc.outcome)} is not a member of the close part's closed set`);
  }
}

const GREEN_PATH = [
  "check-loop-record.mjs",
  "check-loop-decision.mjs",
  "mark-phase.mjs --kind run-stop",
  "render-cost-ledger.mjs",
  "check-cost-ledger.mjs",
  "render-run-report.mjs",
  "check-loop-fresh.mjs --commit-gate --front",
  "set-writes-scope.cjs --from-plan",
  "reconcile-baseline.mjs --amend-scope",
  "set-writes-scope.cjs --clear",
  "require-loop-record.cjs --close",
];

// The close part's former pinned lines (6.38.0 pharn-loop-close.md), verbatim: each step's argv must equal its line.
const TODAY = {
  "check-loop-record.mjs": "node pharn/floor/check-loop-record.mjs pharn/features/<name>/LOOP.md",
  "check-loop-decision.mjs": "node pharn/floor/check-loop-decision.mjs pharn/features/<name>/LOOP.md",
  "mark-phase.mjs --kind run-stop": "node pharn/floor/mark-phase.mjs --name '<name>' --kind run-stop",
  "render-cost-ledger.mjs": "node pharn/floor/render-cost-ledger.mjs '<name>' --command /pharn-loop --base-sha '<base sha>'",
  "check-cost-ledger.mjs": "node pharn/floor/check-cost-ledger.mjs pharn/features/<name>/cost.json",
  "render-run-report.mjs": "node pharn/floor/render-run-report.mjs '<name>' --base pharn/features",
  "check-loop-fresh.mjs --commit-gate --front":
    "node pharn/floor/check-loop-fresh.mjs --feature '<name>' --base '<base sha>' --commit-gate --front",
  "set-writes-scope.cjs --from-plan": "node .claude/hooks/set-writes-scope.cjs --from-plan pharn/features/<name>/PLAN.md",
  "reconcile-baseline.mjs --amend-scope": "node pharn/floor/reconcile-baseline.mjs --amend-scope",
  "set-writes-scope.cjs --clear": "node .claude/hooks/set-writes-scope.cjs --clear",
  "require-loop-record.cjs --close": "node .claude/hooks/require-loop-record.cjs --close '<name>'",
};

/** A pinned line as tokens, with the two placeholders made single tokens. */
function lineTokens(line) {
  return line.replaceAll("'<base sha>'", "BASE").replaceAll("'<name>'", "NAME").replaceAll("<name>", "NAME").split(" ");
}
/** A recorded step as the line it ran, in the same tokens. */
function callTokens(c, base) {
  const script = c.script.startsWith("/") ? `pharn/floor/${basename(c.script)}` : c.script;
  return ["node", script, ...c.args.map((a) => a.replaceAll(FEATURE, "NAME").replace(base, "BASE"))];
}

// ── argv ─────────────────────────────────────────────────────────────────────────────────────────────────────

test("argv: --feature a slug and --base a 40-hex SHA, --after-repair optional; anything else refuses", () => {
  const sha = "a".repeat(40);
  assert.deepEqual(parseArgs(["--feature", "demo", "--base", sha]), { ok: true, feature: "demo", base: sha, afterRepair: false });
  assert.equal(parseArgs(["--feature", "demo", "--base", sha, "--after-repair"]).afterRepair, true);
  for (const bad of [
    [],
    ["--feature", "demo"],
    ["--feature", "Demo", "--base", sha],
    ["--feature", "x;touch PWNED", "--base", sha],
    ["--feature", "demo", "--base", "HEAD"],
    ["--feature", "demo", "--base", sha.slice(1)],
    ["--feature", "demo", "--base", sha, "--force"],
    ["--feature", "demo", "--base", sha, "stray"],
    ["--feature", "demo", "--feature", "other", "--base", sha],
    ["--feature", "demo", "--base"],
  ]) {
    assert.equal(parseArgs(bad).ok, false, JSON.stringify(bad));
  }
});

test("exit 2 — no feature directory under the invoking directory: nothing runs", () => {
  const fx = fixture();
  try {
    rmSync(join(fx.dir, "pharn", "features", FEATURE), { recursive: true });
    const s = stub();
    const { doc } = close(fx, { run: s.run });
    assert.equal(doc.exit, EXIT.UNUSABLE);
    assert.equal(doc.refusal, "no-feature-dir");
    assert.deepEqual(s.calls, [], "no step ran");
  } finally {
    fx.done();
  }
});

// ── the green commit ─────────────────────────────────────────────────────────────────────────────────────────

test("★ exit 0 — a green stop commits exactly the list, in today's order, with today's argv, then releases", () => {
  const fx = fixture();
  try {
    writeFileSync(join(fx.dir, "pharn", "features", FEATURE, "cost.json"), "{}\n");
    writeFileSync(join(fx.dir, "unrelated.txt"), "a user's own untracked file\n");
    const s = stub();
    const { doc, out } = close(fx, { run: s.run });
    assert.equal(doc.exit, EXIT.COMMITTED, out);
    assert.equal(doc.outcome, "committed pharn-loop/demo");
    assert.equal(doc.branch, "pharn-loop/demo");
    assert.equal(doc.checkout, "pharn-loop/demo", "the checkout stays on the new branch");
    assert.match(doc.commit, /^[0-9a-f]{40}$/);
    assert.equal(doc.released, true);
    assert.equal(doc.freshness, "FRESH");
    assert.deepEqual(s.ids(), GREEN_PATH, "the order of the close part's lines");
    for (const c of s.calls) assert.deepEqual(callTokens(c, fx.base), lineTokens(TODAY[c.id]), `${c.id}'s argv`);
    // What the commit holds: the scoped path and the artifacts that exist — never the unrelated file.
    const files = sh(fx.dir, "show", "--name-only", "--format=", "HEAD").stdout.trim().split("\n").sort();
    assert.deepEqual(files, [
      "pharn/features/demo/LOOP.md",
      "pharn/features/demo/PLAN.md",
      "pharn/features/demo/SPEC.md",
      "pharn/features/demo/cost.json",
      "src/a.js",
    ]);
    assert.equal(sh(fx.dir, "log", "-1", "--format=%s").stdout.trim(), "pharn-loop(demo): STOP_GREEN after 1 iteration(s)");
    assert.equal(sh(fx.dir, "log", "-1", "--format=%b").stdout.trim(), COMMIT_BODY);
    assert.equal(sh(fx.dir, "status", "--porcelain", "--", "unrelated.txt").stdout.trim(), "?? unrelated.txt", "left untouched");
    assert.match(out, /── git commit \(exit 0\)/);
  } finally {
    fx.done();
  }
});

test("exit 0 — a taken branch name moves to the first free suffix", () => {
  const fx = fixture();
  try {
    sh(fx.dir, "branch", "pharn-loop/demo");
    sh(fx.dir, "branch", "pharn-loop/demo-2");
    const { doc } = close(fx, { run: stub().run });
    assert.equal(doc.outcome, "committed pharn-loop/demo-3");
  } finally {
    fx.done();
  }
});

test("exit 0 — a quick record skips the report and commits STOP_GREEN_QUICK", () => {
  const fx = fixture({ record: loopRecord({ decision: "STOP_GREEN_QUICK", mode: "quick" }) });
  try {
    const s = stub();
    const { doc } = close(fx, { run: s.run });
    assert.equal(doc.exit, EXIT.COMMITTED);
    assert.equal(doc.report, "skipped-quick");
    assert.ok(!s.ids().includes("render-run-report.mjs"), "no report in a quick run");
    assert.equal(sh(fx.dir, "log", "-1", "--format=%s").stdout.trim(), "pharn-loop(demo): STOP_GREEN_QUICK after 1 iteration(s)");
  } finally {
    fx.done();
  }
});

// ── terminal non-commits ─────────────────────────────────────────────────────────────────────────────────────

test("exit 3 — a non-green stop over a Draft SPEC: the ledger tail, no commit gate, then the releases", () => {
  const fx = fixture({ record: loopRecord({ decision: "STOP_CAP", iterations: "3" }) });
  try {
    const s = stub();
    const { doc } = close(fx, { run: s.run });
    assert.equal(doc.exit, EXIT.NOT_COMMITTED);
    assert.equal(doc.outcome, "not committed: STOP_CAP");
    assert.equal(doc.freshness, "not-run");
    assert.equal(doc.released, true);
    assert.deepEqual(s.ids(), [...GREEN_PATH.slice(0, 6), "set-writes-scope.cjs --clear", "require-loop-record.cjs --close"]);
    assert.equal(fx.head(), sh(fx.dir, "symbolic-ref", "--short", "HEAD").stdout.trim(), "no branch was made");
    assert.equal(fx.hasBranch("pharn-loop/demo"), false);
  } finally {
    fx.done();
  }
});

test("exit 3 — a blocked stop skips the decision check (N/A) and records INCONCLUSIVE", () => {
  const fx = fixture({ record: loopRecord({ decision: "INCONCLUSIVE", blocked: "unlisted-ask" }) });
  try {
    const s = stub();
    const { doc } = close(fx, { run: s.run });
    assert.equal(doc.exit, EXIT.NOT_COMMITTED);
    assert.equal(doc.outcome, "not committed: INCONCLUSIVE");
    assert.equal(doc.decision_check, "N/A");
    assert.equal(doc.blocked, "unlisted-ask");
    assert.ok(!s.ids().includes("check-loop-decision.mjs"));
  } finally {
    fx.done();
  }
});

test("exit 4 (GRILL G1) — a non-green record over a still-Approved SPEC owes the revert: same outcome, no release", () => {
  const fx = fixture({ record: loopRecord({ decision: "STOP_CAP" }), spec: "Approved" });
  try {
    const s = stub();
    const { doc } = close(fx, { run: s.run });
    assert.equal(doc.exit, EXIT.OWED);
    assert.equal(doc.outcome, "not committed: STOP_CAP");
    assert.equal(doc.released, null);
    assert.ok(!s.ids().includes("set-writes-scope.cjs --clear"), "no release while a model write is owed");
  } finally {
    fx.done();
  }
});

// ── the record repair ────────────────────────────────────────────────────────────────────────────────────────

test("exit 5 — a RED record stops before anything else; --after-repair reports it and goes on", () => {
  const fx = fixture({ record: loopRecord({ decision: "STOP_CAP" }) });
  try {
    let s = stub({ exits: { "check-loop-record.mjs": 1 } });
    let r = close(fx, { run: s.run });
    assert.equal(r.doc.exit, EXIT.REPAIR);
    assert.deepEqual(s.ids(), ["check-loop-record.mjs"], "nothing else ran — no marker, no ledger");
    s = stub({ exits: { "check-loop-record.mjs": 1 } });
    r = close(fx, { run: s.run, afterRepair: true });
    assert.equal(r.doc.record_check, "RED");
    assert.equal(r.doc.exit, EXIT.NOT_COMMITTED);
  } finally {
    fx.done();
  }
});

// ── green stops that do not commit (exit 4) ──────────────────────────────────────────────────────────────────

for (const [label, opts, reason, lastStep] of [
  [
    "a RED decision check",
    { record: loopRecord(), exits: { "check-loop-decision.mjs": 1 } },
    "decision unverifiable",
    "render-run-report.mjs",
  ],
  [
    "a green token that disagrees with the record's mode",
    { record: loopRecord({ decision: "STOP_GREEN_QUICK" }) },
    "decision unverifiable",
    "render-run-report.mjs",
  ],
  [
    "an unreadable decision",
    { record: loopRecord({ decision: "STOP_GREENISH" }), afterRepair: true },
    "decision unverifiable",
    "render-run-report.mjs",
  ],
  [
    "a stale commit gate",
    { exits: { "check-loop-fresh.mjs --commit-gate --front": 4 } },
    "evidence stale",
    "check-loop-fresh.mjs --commit-gate --front",
  ],
  [
    "a crashed commit gate",
    { exits: { "check-loop-fresh.mjs --commit-gate --front": null } },
    "evidence stale",
    "check-loop-fresh.mjs --commit-gate --front",
  ],
  ["a failed setter", { exits: { "set-writes-scope.cjs --from-plan": 1 } }, "stage failed", "set-writes-scope.cjs --from-plan"],
  [
    "a scope set by another plan",
    { scopeRecord: { scope: ["src/a.js"], set_by: "pharn/features/other/PLAN.md" } },
    "stage failed",
    "reconcile-baseline.mjs --amend-scope",
  ],
  [
    "hostile scope JSON (L62)",
    { scopeRecord: { scope: [{ toString: 1 }], set_by: "pharn/features/demo/PLAN.md" } },
    "stage failed",
    "reconcile-baseline.mjs --amend-scope",
  ],
  ["an unparseable scope file", { scopeRecord: "{" }, "stage failed", "reconcile-baseline.mjs --amend-scope"],
]) {
  test(`exit 4 — ${label} → not committed: ${reason}; nothing committed, no release`, () => {
    const fx = fixture(opts.record ? { record: opts.record } : {});
    try {
      const s = stub({ exits: opts.exits ?? {}, scopeRecord: opts.scopeRecord });
      const { doc } = close(fx, { run: s.run, afterRepair: opts.afterRepair ?? false });
      assert.equal(doc.exit, EXIT.OWED);
      assert.equal(doc.outcome, `not committed: ${reason}`);
      assert.equal(doc.released, null);
      assert.equal(s.ids().at(-1), lastStep, "the close stops at the step that failed");
      assert.equal(fx.hasBranch("pharn-loop/demo"), false);
      assert.equal(sh(fx.dir, "rev-list", "--count", "HEAD").stdout.trim(), "1", "no commit");
    } finally {
      fx.done();
    }
  });
}

test("exit 4 — the lock or a test it pins not a regular file → stage failed (builder code 4)", () => {
  for (const plant of [
    (fd) => mkdirSync(join(fd, "AC-TESTS.lock.json")),
    (fd) => symlinkSync(join(fd, "nowhere"), join(fd, "AC-TESTS.lock.json")),
    (fd) => writeFileSync(join(fd, "AC-TESTS.lock.json"), JSON.stringify({ files: [{ path: "test/missing.test.mjs" }] })),
    (fd) => writeFileSync(join(fd, "AC-TESTS.lock.json"), JSON.stringify({ files: [{ path: { toString: 1 } }] })),
  ]) {
    const fx = fixture();
    try {
      plant(join(fx.dir, "pharn", "features", FEATURE));
      const lines = [];
      const { doc } = close(fx, { run: stub().run, log: (x) => lines.push(x) });
      assert.equal(doc.outcome, "not committed: stage failed");
      assert.match(lines.join(""), /builder code 4/);
    } finally {
      fx.done();
    }
  }
});

test("exit 4 — nothing to stage (every candidate absent or ignored) → nothing staged", () => {
  const fx = fixture();
  try {
    writeFileSync(join(fx.dir, ".gitignore"), ".pharn/\npharn/features/\n");
    const { doc } = close(fx, { run: stub({ scope: [] }).run });
    assert.equal(doc.outcome, "not committed: nothing staged");
  } finally {
    fx.done();
  }
});

test("exit 4 — a branch that cannot be created → branch failed, the checkout unchanged", () => {
  const fx = fixture();
  try {
    sh(fx.dir, "branch", "pharn-loop"); // refs/heads/pharn-loop is a file, so pharn-loop/demo cannot be created
    const before = fx.head();
    const { doc } = close(fx, { run: stub().run });
    assert.equal(doc.outcome, "not committed: branch failed");
    assert.equal(fx.head(), before);
    assert.equal(doc.checkout, before);
  } finally {
    fx.done();
  }
});

test("exit 4 — a failed commit hook → commit failed, then the undo: unstaged, back on the original branch, branch deleted", () => {
  const fx = fixture();
  try {
    const before = fx.head();
    const hook = join(fx.dir, ".git", "hooks", "pre-commit");
    writeFileSync(hook, "#!/bin/sh\nexit 1\n");
    chmodSync(hook, 0o755);
    const { doc } = close(fx, { run: stub().run });
    assert.equal(doc.outcome, "not committed: commit failed");
    assert.equal(fx.head(), before);
    assert.equal(fx.hasBranch("pharn-loop/demo"), false);
    assert.equal(sh(fx.dir, "diff", "--cached", "--name-only").stdout, "", "the run's list is unstaged");
    assert.ok(existsSync(join(fx.dir, "src", "a.js")), "the change stays in the working tree");
  } finally {
    fx.done();
  }
});

test("review R1 — the phase file names the git step under way: a commit hook sees `commit`; the run ends `finished`", () => {
  const fx = fixture();
  try {
    const hook = join(fx.dir, ".git", "hooks", "pre-commit");
    writeFileSync(hook, `#!/bin/sh\ncp ${phasePath(FEATURE)} hook-saw.txt\nexit 1\n`);
    chmodSync(hook, 0o755);
    const { doc } = close(fx, { run: stub().run });
    assert.equal(doc.outcome, "not committed: commit failed");
    assert.equal(readFileSync(join(fx.dir, "hook-saw.txt"), "utf8"), "commit\n", "a crash inside the commit step would read `commit`");
    assert.equal(readFileSync(join(fx.dir, phasePath(FEATURE)), "utf8"), "finished\n");
  } finally {
    fx.done();
  }
  // A close that never reaches git writes no phase file.
  const nongreen = fixture({ record: loopRecord({ decision: "STOP_CAP" }) });
  try {
    close(nongreen, { run: stub().run });
    assert.equal(existsSync(join(nongreen.dir, phasePath(FEATURE))), false);
  } finally {
    nongreen.done();
  }
});

test("review R2 (reproduced double commit) — on this run's own pharn-loop branch the closeout refuses, exit 2, nothing run", () => {
  const fx = fixture();
  try {
    assert.equal(close(fx, { run: stub().run }).doc.exit, EXIT.COMMITTED);
    const again = stub();
    const { doc } = close(fx, { run: again.run });
    assert.equal(doc.exit, EXIT.UNUSABLE);
    assert.equal(doc.refusal, "on-loop-branch");
    assert.deepEqual(again.calls, [], "no step ran — no second run-stop marker, no second commit");
    assert.equal(sh(fx.dir, "rev-list", "--count", "HEAD").stdout.trim(), "2", "exactly one commit made");
  } finally {
    fx.done();
  }
  assert.equal(isLoopBranchOf("demo", "pharn-loop/demo"), true);
  assert.equal(isLoopBranchOf("demo", "pharn-loop/demo-12"), true);
  for (const b of ["pharn-loop/demo-x", "pharn-loop/demox", "pharn-loop/demo-", "main", "pharn-loop/demo-2-3", null]) {
    assert.equal(isLoopBranchOf("demo", b), false, String(b));
  }
});

test("exit 4 — a failed add (a listed path outside the repository) → stage failed, then the undo", () => {
  const fx = fixture();
  const outside = realpathSync(mkdtempSync(join(tmpdir(), "loop-closeout-outside-")));
  try {
    writeFileSync(join(outside, "x.js"), "x\n");
    const rel = join("..", basename(outside), "x.js");
    const before = fx.head();
    const { doc } = close(fx, { run: stub({ scope: ["src/a.js", rel] }).run });
    assert.equal(doc.outcome, "not committed: stage failed");
    assert.equal(fx.head(), before);
    assert.equal(fx.hasBranch("pharn-loop/demo"), false);
  } finally {
    fx.done();
    rmSync(outside, { recursive: true, force: true });
  }
});

// ── the staging list ─────────────────────────────────────────────────────────────────────────────────────────

test("buildStageList — regular files and tracked deletions, minus ignored ones, de-duplicated in order; a dangling link is skipped (L54)", () => {
  const fx = fixture();
  try {
    inDir(fx.dir, () => {
      writeFileSync("ignored.log", "x\n");
      writeFileSync(".gitignore", ".pharn/\n*.log\n");
      rmSync("README"); // a tracked deletion
      symlinkSync("nowhere", "dangling");
      writeFileSync(
        join(".pharn", "writes-scope.json"),
        JSON.stringify({
          set_by: "pharn/features/demo/PLAN.md",
          scope: ["src/a.js", "README", "ignored.log", "dangling", "src", "src/a.js", "absent.js"],
        })
      );
      const r = buildStageList(FEATURE);
      assert.equal(r.code, 0);
      assert.deepEqual(r.paths, [
        "src/a.js",
        "README",
        "pharn/features/demo/SPEC.md",
        "pharn/features/demo/PLAN.md",
        "pharn/features/demo/LOOP.md",
      ]);
    });
  } finally {
    fx.done();
  }
});

test("buildStageList — the lock's pinned tests are staged", () => {
  const fx = fixture();
  try {
    inDir(fx.dir, () => {
      mkdirSync("test", { recursive: true });
      writeFileSync(join("test", "ac.test.mjs"), "x\n");
      writeFileSync(join("pharn", "features", FEATURE, "AC-TESTS.lock.json"), JSON.stringify({ files: [{ path: "test/ac.test.mjs" }] }));
      writeFileSync(join(".pharn", "writes-scope.json"), JSON.stringify({ set_by: "pharn/features/demo/PLAN.md", scope: [] }));
      const r = buildStageList(FEATURE);
      assert.equal(r.code, 0);
      assert.ok(r.paths.includes("test/ac.test.mjs"));
      assert.ok(r.paths.includes("pharn/features/demo/AC-TESTS.lock.json"));
    });
  } finally {
    fx.done();
  }
});

test("STAGE_ARTIFACTS is the close part's former list, in its order", () => {
  assert.deepEqual(
    [...STAGE_ARTIFACTS],
    [
      "SPEC.md",
      "PLAN.md",
      "AC-TESTS.md",
      "AC-TESTS.lock.json",
      "GRILL.md",
      "BUILD.md",
      "REGRESSION.md",
      "VERIFY.md",
      "regression-report.json",
      "verify-report.json",
      "LOOP.md",
      "cost.json",
      "RUN-REPORT.md",
    ]
  );
});

// ── the git argv, as the close part carried it ───────────────────────────────────────────────────────────────

test("the add, commit and undo argv equal the close part's former lines", () => {
  const list = stageListPath("<name>");
  assert.equal(list, ".pharn/pharn-loop/<name>/stage.list");
  assert.deepEqual(addArgs(list), ["add", "-A", "--pathspec-from-file=.pharn/pharn-loop/<name>/stage.list", "--pathspec-file-nul"]);
  // One stated difference from the former line: `-q` (independent review R8), so a commit's summary does not crowd the
  // closing JSON line out of the tool result; hook output is still echoed (capped).
  assert.deepEqual(commitArgs(list, "<name>", "<decision>", "<N>"), [
    "commit",
    "-q",
    "--pathspec-from-file=.pharn/pharn-loop/<name>/stage.list",
    "--pathspec-file-nul",
    "-m",
    "pharn-loop(<name>): <decision> after <N> iteration(s)",
    "-m",
    "The SPEC was approved by the model (approved_by: model), not by a person. Nothing was merged or pushed; review this branch before merging.",
  ]);
  assert.deepEqual(
    undoArgs(list, "<branch>").map((u) => [u.literal, ...u.args]),
    [
      [true, "reset", "-q", "--pathspec-from-file=.pharn/pharn-loop/<name>/stage.list", "--pathspec-file-nul"],
      [false, "checkout", "-", "--"],
      [false, "branch", "-d", "<branch>"],
    ]
  );
  assert.deepEqual(commitGateArgs("<name>", "<base sha>"), ["--feature", "<name>", "--base", "<base sha>", "--commit-gate", "--front"]);
});

test("no push, merge or no-verify argument in the closeout or its core (a source scan of string literals)", () => {
  const FORBIDDEN = /["'`](?:push|merge|--no-verify)["'`]/;
  for (const f of ["loop-closeout.mjs", "closeout-core.mjs"]) {
    const src = readFileSync(join(HERE, f), "utf8");
    assert.doesNotMatch(src, FORBIDDEN, f);
    // CONTROL (L60): the same scan fires on an inserted literal.
    assert.match(`${src}\ngitRun(["push", "origin"]);\n`, FORBIDDEN);
  }
});

// ── the record and its enum ──────────────────────────────────────────────────────────────────────────────────

test("recordFacts reads the envelope as the checkers do: quotes stripped, BOM and CRLF tolerated, bad values null", () => {
  assert.deepEqual(recordFacts(loopRecord()), { decision: "STOP_GREEN", mode: "full", blocked: null, hasBlocked: false, iterations: "1" });
  assert.equal(recordFacts(String.fromCharCode(0xfeff) + loopRecord().replaceAll("\n", "\r\n")).decision, "STOP_GREEN");
  assert.equal(recordFacts(loopRecord({ decision: '"STOP_CAP"' })).decision, "STOP_CAP");
  assert.equal(recordFacts(loopRecord({ decision: "toString" })).decision, null, "L15: no prototype member");
  assert.equal(recordFacts(loopRecord({ mode: "fast" })).mode, null);
  assert.equal(recordFacts(loopRecord({ iterations: "0" })).iterations, null);
  assert.equal(recordFacts("no frontmatter").decision, null);
  assert.equal(recordFacts(null).decision, null);
  assert.deepEqual(GREEN_TOKENS, { full: "STOP_GREEN", quick: "STOP_GREEN_QUICK" });
});

test("the decision vocabulary equals check-loop-record.mjs's and check-loop-decision.mjs's own", () => {
  const read = (f) =>
    JSON.parse(`[${readFileSync(join(HERE, f), "utf8").match(/const DECISION_ENUM = new Set\(\[([^\]]*)\]\)/)[1]}]`).sort();
  const mine = read("loop-closeout.mjs");
  assert.equal(mine.length, 5);
  assert.deepEqual(read("check-loop-record.mjs"), mine);
  assert.deepEqual(read("check-loop-decision.mjs"), mine);
});

// ── ★ the branch and undo, executed (moved from command-hygiene.test.mjs SHELL-SINK 7) ───────────────────────

const HOSTILE_BRANCH = "fix';touch${IFS}PWNED_BRANCH;'x";

/** What a failed commit leaves before the undo: a staged change and its list. */
function stageFailed(dir) {
  writeFileSync(join(dir, "README"), "changed by the run\n");
  sh(dir, "add", "README");
  writeFileSync(join(dir, ".pharn", "pharn-loop", FEATURE, "stage.list"), "README\0");
}

test("★ the branch then the undo return to a hostile original branch and run nothing from its name", () => {
  const fx = fixture();
  try {
    assert.equal(sh(fx.dir, "check-ref-format", "--branch", HOSTILE_BRANCH).status, 0, "precondition: git accepts the name");
    assert.equal(sh(fx.dir, "switch", "-q", "-c", HOSTILE_BRANCH).status, 0);
    inDir(fx.dir, () => {
      const b = createBranch(FEATURE);
      assert.equal(b.ok, true);
      assert.equal(b.branch, "pharn-loop/demo");
      stageFailed(fx.dir);
      undoBranch(FEATURE, b.branch);
    });
    assert.equal(existsSync(join(fx.dir, "PWNED_BRANCH")), false);
    assert.equal(fx.head(), HOSTILE_BRANCH, "back on the original branch");
    assert.equal(fx.hasBranch("pharn-loop/demo"), false, "the new branch is deleted");
    assert.equal(sh(fx.dir, "diff", "--cached", "--name-only").stdout, "", "the run's list is unstaged");
    assert.equal(readFileSync(join(fx.dir, "README"), "utf8"), "changed by the run\n", "and its change stays");
  } finally {
    fx.done();
  }
});

test("★ a detached original checkout returns to its commit, still detached", () => {
  const fx = fixture();
  try {
    sh(fx.dir, "switch", "-q", "--detach", "HEAD");
    inDir(fx.dir, () => {
      const b = createBranch(FEATURE);
      stageFailed(fx.dir);
      undoBranch(FEATURE, b.branch);
    });
    assert.equal(fx.head(), `detached@${fx.base}`);
    assert.equal(fx.hasBranch("pharn-loop/demo"), false);
  } finally {
    fx.done();
  }
});

test("★ with no HEAD reflog the return refuses and restores nothing — a tracked file named `-` keeps its edit", () => {
  const fx = fixture({ reflog: false });
  try {
    sh(fx.dir, "switch", "-q", "-c", "orig");
    inDir(fx.dir, () => {
      const b = createBranch(FEATURE);
      writeFileSync(join(fx.dir, "-"), "LOCAL EDIT\n");
      stageFailed(fx.dir);
      undoBranch(FEATURE, b.branch);
    });
    assert.equal(readFileSync(join(fx.dir, "-"), "utf8"), "LOCAL EDIT\n", "the `--` keeps git from reading `-` as a file");
    assert.equal(fx.head(), "pharn-loop/demo", "the checkout stays on the new branch, which the summary reports");
  } finally {
    fx.done();
  }
});

test("★ CONTROL — the stated bound, made visible: a checkout between the branch and the undo sends the return to the WRONG place", () => {
  const fx = fixture();
  try {
    sh(fx.dir, "switch", "-q", "-c", "orig");
    inDir(fx.dir, () => {
      const b = createBranch(FEATURE);
      sh(fx.dir, "switch", "-q", "-c", "intervening"); // e.g. a commit hook that checks out
      stageFailed(fx.dir);
      undoBranch(FEATURE, b.branch);
    });
    assert.equal(fx.head(), "pharn-loop/demo", "`-` names the checkout before the intervening one, not the original");
  } finally {
    fx.done();
  }
});

// ── ★ END-TO-END: the CLI with its real children (L41, L45) ──────────────────────────────────────────────────

/** A fixture project whose floor is this tree's and whose two hooks are copies of this tree's. */
function e2eFixture(opts) {
  const fx = fixture(opts);
  symlinkSync(join(REPO, "pharn", "floor"), join(fx.dir, "pharn", "floor"), "dir");
  mkdirSync(join(fx.dir, ".claude", "hooks"), { recursive: true });
  for (const h of ["set-writes-scope.cjs", "require-loop-record.cjs"])
    copyFileSync(join(REPO, ".claude", "hooks", h), join(fx.dir, ".claude", "hooks", h));
  return fx;
}

function runCli(fx, args) {
  const env = { ...process.env, CLAUDE_PROJECT_DIR: fx.dir };
  delete env.CLAUDE_CODE_SESSION_ID;
  return spawnSync(process.execPath, [join("pharn", "floor", "loop-closeout.mjs"), ...args], { cwd: fx.dir, encoding: "utf8", env });
}

test("★ END-TO-END — a blocked stop, real children: ledger and report written, marker line printed whole, guard closed, exit 3", () => {
  const fx = e2eFixture({ record: loopRecord({ decision: "INCONCLUSIVE", blocked: "stage-refused" }) });
  try {
    const env = { ...process.env, CLAUDE_PROJECT_DIR: fx.dir };
    delete env.CLAUDE_CODE_SESSION_ID;
    // The run as Step 1a opened it: the Stop guard's marker and the run-start marker.
    assert.equal(
      spawnSync(process.execPath, [join(".claude", "hooks", "require-loop-record.cjs"), "--open", FEATURE, "--cap", "3"], {
        cwd: fx.dir,
        env,
      }).status,
      0
    );
    assert.equal(
      spawnSync(process.execPath, [join("pharn", "floor", "mark-phase.mjs"), "--name", FEATURE, "--kind", "run-start"], {
        cwd: fx.dir,
        env,
      }).status,
      0
    );
    // L45 (review R7): the COMMITTED line, read out of the loop's close part, placeholders substituted — never this
    // test's own argv.
    const pinned = commandFamilyText(join(REPO, ".claude", "commands"), "pharn-loop.md")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => /^node pharn\/floor\/loop-closeout\.mjs /.test(l));
    assert.equal(pinned.length, 1, "the close part pins the closeout line exactly once");
    const line = pinned[0].replaceAll("'<name>'", `'${FEATURE}'`).replaceAll("'<base sha>'", `'${fx.base}'`);
    assert.doesNotMatch(line, /<[a-z][^>]*>/, `an unsubstituted placeholder remains in: ${line}`);
    const r = spawnSync("sh", ["-c", line], { cwd: fx.dir, encoding: "utf8", env });
    assert.equal(r.status, EXIT.NOT_COMMITTED, `${r.stdout}${r.stderr}`);
    const lines = r.stdout.trimEnd().split("\n");
    const doc = JSON.parse(lines.at(-1));
    assertDoc(doc);
    assert.equal(doc.outcome, "not committed: INCONCLUSIVE");
    assert.equal(doc.record_check, "GREEN");
    assert.equal(doc.ledger, "emitted");
    assert.equal(doc.report, "rendered");
    assert.equal(doc.released, true);
    assert.ok(
      lines.some((l) => /^marker \d+: run-stop /.test(l)),
      "mark-phase's own line is printed whole (run membership reads it)"
    );
    assert.ok(
      lines.slice(0, -1).every((l) => !l.startsWith("{")),
      "only the closing line starts at column 0 with a brace"
    );
    assert.ok(existsSync(join(fx.dir, "pharn", "features", FEATURE, "cost.json")));
    assert.ok(existsSync(join(fx.dir, "pharn", "features", FEATURE, "RUN-REPORT.md")));
    assert.equal(existsSync(join(fx.dir, ".pharn", "pharn-loop", FEATURE, "active.json")), false, "the Stop guard's marker is closed");
    assert.match(r.stdout, /no re-runs/);
  } finally {
    fx.done();
  }
});

test("★ END-TO-END — a refused argv prints a closing document and exits 2; a crash exit is never 0, 3 or 4", () => {
  const fx = e2eFixture();
  try {
    const r = runCli(fx, ["--feature", "demo;touch PWNED", "--base", fx.base]);
    assert.equal(r.status, EXIT.UNUSABLE);
    assert.equal(JSON.parse(r.stdout.trim()).refusal, "usage");
    assert.equal(existsSync(join(fx.dir, "PWNED")), false);
    // A module that cannot load is node's own exit 1 — outside every outcome class, never read as a decision.
    writeFileSync(join(fx.dir, "broken.mjs"), 'import "./nowhere.mjs";\n');
    const crash = spawnSync(process.execPath, ["broken.mjs"], { cwd: fx.dir });
    assert.equal(crash.status, 1);
    assert.ok(![EXIT.COMMITTED, EXIT.NOT_COMMITTED, EXIT.OWED, EXIT.REPAIR, EXIT.UNUSABLE].includes(crash.status));
  } finally {
    fx.done();
  }
});
