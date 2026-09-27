// pharn/floor/check-quick-scope.test.mjs — the quick scope check (6.28.0, loop-quick-mode GATE 2, review F1).
//
// What this file holds, and the control each part names (L60):
//   • ★ HOSTILE NAMES — both COMMITTED lines (pharn-loop.md `## Quick mode` item 5, pharn-ship.md `## Quick mode` item
//     7), read out of the command files and run under `sh -c` exactly as written with only `<name>` and `<base sha>`
//     substituted, against every hostile name the fix names: `$(…)`, backticks, `$Q`, commas, both quote kinds, a
//     newline, a leading `-` (a flag's own spelling included) and a surrounding space. Each must exit 1 naming exactly
//     that path, and no command may run. THE CONTROL runs 6.25.0's line the way it instructed, in the same fixture: the
//     canary file appears and `$Q` passes — so the fixture really exercises the hazard.
//   • The line's own shape: only the slug and the base, each single-quoted, and no other shell-active character.
//   • The partition: clean, stray, the AC-TESTS.md union, the closed exemptions, a deletion, the state root, a glob.
//   • Every refusal, by its closed `reason_code`, with a closure over the source (L36).
//   • L35 — one owner: stage-regress.mjs takes both sets from scope-inputs.mjs, this checker decides with
//     check-regress.mjs's `partitionScope`, and importing check-regress.mjs runs nothing.
// The fixture is a throwaway git repo whose `pharn/floor` is a symlink to this directory, excluded through
// `.git/info/exclude`, so a committed line runs byte for byte and git never lists the link.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const CLI = join(HERE, "check-quick-scope.mjs");
const COMMANDS = ["pharn-loop.md", "pharn-ship.md"];

// 6.25.0's committed line, verbatim — the CONTROL only. It is never run anywhere but inside the throwaway fixture.
const OLD_LINE =
  'node pharn/floor/check-regress.mjs scope --changed "<inside, comma-separated>" --declared "<PLAN.md ## Files paths, plus AC-TESTS.md ## Files paths when that file exists>" --feature "<name>"';

const planText = (paths) => `# PLAN\n\n## Files\n\n${paths.map((p) => `- \`${p}\` — declared`).join("\n")}\n\n## Next\n\nx\n`;

/** A git repo with a committed seed, the declared change applied, and the floor reachable at pharn/floor. */
function makeRepo({ declared = ["src/x.js"], acTests = null } = {}) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "quick-scope-")));
  const git = (...a) => {
    const r = spawnSync("git", a, { cwd: dir, encoding: "utf8" });
    assert.equal(r.status, 0, `git ${a.join(" ")}: ${r.stderr}`);
    return r.stdout;
  };
  git("init", "-q");
  git("config", "user.email", "t@example.invalid");
  git("config", "user.name", "t");
  mkdirSync(join(dir, ".git", "info"), { recursive: true });
  appendFileSync(join(dir, ".git", "info", "exclude"), "/pharn/floor\n");
  mkdirSync(join(dir, "pharn", "features", "demo"), { recursive: true });
  symlinkSync(HERE, join(dir, "pharn", "floor"), "dir");
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "src", "x.js"), "export const x = 1;\n");
  writeFileSync(join(dir, "src", "y.js"), "export const y = 1;\n");
  writeFileSync(join(dir, "pharn", "features", "demo", "PLAN.md"), planText(declared));
  if (acTests !== null) writeFileSync(join(dir, "pharn", "features", "demo", "AC-TESTS.md"), acTests);
  git("add", "-A");
  git("commit", "-q", "-m", "seed");
  const base = git("rev-parse", "HEAD").trim();
  writeFileSync(join(dir, "src", "x.js"), "export const x = 2;\n"); // the build's one declared change
  return { dir, base, git };
}

const envWithoutQ = () => {
  const env = { ...process.env };
  delete env.Q;
  return env;
};

/** The one JSON document a run printed, or null when it printed none. */
function parseDoc(stdout) {
  try {
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

function runCli(dir, args) {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd: dir, encoding: "utf8" });
  return { status: r.status, doc: parseDoc(r.stdout), stdout: r.stdout, stderr: r.stderr };
}

/** The ONE committed scope line inside a command's `## Quick mode`, asserted once in the section and once in the file. */
function committedLine(file) {
  const body = readFileSync(join(REPO, ".claude", "commands", file), "utf8");
  const start = body.search(/^## Quick mode — /m);
  assert.ok(start >= 0, `${file} must carry a ## Quick mode section`);
  const rest = body.slice(start + 3);
  const end = rest.search(/^## /m);
  assert.ok(end > 0, `${file}: the heading after ## Quick mode must be found (L60)`);
  const pick = (text) =>
    text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.startsWith("node pharn/floor/check-quick-scope.mjs"));
  assert.equal(pick(rest.slice(0, end)).length, 1, `${file}: ## Quick mode must carry the scope line exactly once`);
  assert.equal(pick(body).length, 1, `${file}: the scope line must appear nowhere else`);
  return pick(rest.slice(0, end))[0];
}

/** Run a committed line in `dir` under `sh -c`, substituting only its two placeholders. */
function runCommitted(line, dir, base) {
  const cmd = line.replace("<name>", "demo").replace("<base sha>", base);
  const r = spawnSync("sh", ["-c", cmd], { cwd: dir, encoding: "utf8", env: envWithoutQ() });
  return { status: r.status, doc: parseDoc(r.stdout), stdout: r.stdout, stderr: r.stderr };
}

/** 6.25.0's instruction, followed literally: list without -z, drop `.pharn/`, paste both lists into OLD_LINE. */
function runOldLine(dir, base, declared) {
  const listed = [
    ...spawnSync("git", ["diff", "--name-only", "--no-renames", base], { cwd: dir, encoding: "utf8" }).stdout.split("\n"),
    ...spawnSync("git", ["ls-files", "--others", "--exclude-standard"], { cwd: dir, encoding: "utf8" }).stdout.split("\n"),
  ].filter((p) => p && !p.startsWith(".pharn/"));
  const cmd = OLD_LINE.replace("<inside, comma-separated>", listed.join(","))
    .replace("<PLAN.md ## Files paths, plus AC-TESTS.md ## Files paths when that file exists>", declared.join(","))
    .replace("<name>", "demo");
  return spawnSync("sh", ["-c", cmd], { cwd: dir, encoding: "utf8", env: envWithoutQ() });
}

// ── The line itself ────────────────────────────────────────────────────────────────────────────────────────────

test("✧ both committed lines take ONLY the slug and the base, each single-quoted, with no other shell-active character", () => {
  for (const file of COMMANDS) {
    const line = committedLine(file);
    assert.deepEqual([...line.matchAll(/<[^>]*>/g)].map((m) => m[0]).sort(), ["<base sha>", "<name>"], file);
    assert.ok(line.includes("--feature '<name>'") && line.includes("--base '<base sha>'"), `${file}: both values single-quoted`);
    const bare = line.replace("'<name>'", "").replace("'<base sha>'", "");
    assert.doesNotMatch(bare, /["'$`\\;|&(){}<>*?!]/, `${file}: no other shell-active character`);
  }
  assert.equal(committedLine("pharn-loop.md"), committedLine("pharn-ship.md"), "the two quick modes pin the same line");
});

test("✧ neither quick section still carries 6.25.0's check-regress.mjs scope line", () => {
  for (const file of COMMANDS) {
    const body = readFileSync(join(REPO, ".claude", "commands", file), "utf8");
    assert.ok(!body.includes(OLD_LINE), `${file} still carries the 6.25.0 line`);
    assert.doesNotMatch(body, /check-regress\.mjs scope --changed "/, `${file} still pastes a list into a double-quoted argument`);
  }
});

// ── ★ HOSTILE NAMES — both committed lines ────────────────────────────────────────────────────────────────────

const HOSTILE = [
  { what: "command substitution", path: "src/$(touch INJECTED).js", canary: "INJECTED" },
  { what: "backticks", path: "src/`touch INJECTED`.js", canary: "INJECTED" },
  { what: "an unset $Q (6.25.0: a false pass onto the declared src/x.js)", path: "src/x$Q.js" },
  { what: "a comma whose halves are declared (6.25.0: a false pass)", path: "src/x.js,src/x.js" },
  { what: "a comma with an exempt half (6.25.0: a false pass)", path: "pharn/features/demo/SPEC.md,src/x.js" },
  { what: "a single quote", path: "src/a'b.js" },
  { what: "a double quote", path: 'src/a"b.js' },
  { what: "a newline", path: "src/a\nb.js" },
  { what: "a leading dash spelling a check-regress flag", path: "--declared" },
  { what: "a leading dash", path: "-n" },
  { what: "a trailing space (a trimming parser reads src/x.js)", path: "src/x.js " },
];

for (const h of HOSTILE) {
  test(`★ HOSTILE — ${h.what}: both committed lines exit 1 naming exactly that path, and no command runs`, () => {
    const { dir, base } = makeRepo();
    try {
      mkdirSync(dirname(join(dir, h.path)), { recursive: true }); // a comma case's first half is a directory name
      writeFileSync(join(dir, h.path), "a stray the plan never declared\n");
      for (const file of COMMANDS) {
        const r = runCommitted(committedLine(file), dir, base);
        assert.equal(r.status, 1, `${file}: ${r.stdout}${r.stderr}`);
        assert.deepEqual(r.doc.escaped, [h.path], `${file}: the escaped set is the hostile name, byte for byte`);
        assert.equal(r.doc.findings.length, 1);
        assert.equal(existsSync(join(dir, "INJECTED")), false, `${file}: a command in a file name ran`);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

test("★ HOSTILE — a DECLARED name carrying $(…) passes as declared, and still runs nothing", () => {
  const hostile = "src/$(touch INJECTED).js";
  const { dir, base } = makeRepo({ declared: ["src/x.js", hostile] });
  try {
    writeFileSync(join(dir, hostile), "declared by the plan\n");
    for (const file of COMMANDS) {
      const r = runCommitted(committedLine(file), dir, base);
      assert.equal(r.status, 0, `${file}: ${r.stdout}${r.stderr}`);
      assert.ok(r.doc.declared.includes(hostile) && r.doc.inside.includes(hostile));
      assert.equal(existsSync(join(dir, "INJECTED")), false, `${file}: a command in a declared name ran`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("★ CONTROL — 6.25.0's line, run as it instructed, runs the file name's command and passes $Q (the fixture exercises the hazard)", () => {
  let fx = makeRepo();
  try {
    writeFileSync(join(fx.dir, "src", "$(touch INJECTED).js"), "x\n");
    runOldLine(fx.dir, fx.base, ["src/x.js"]);
    assert.equal(existsSync(join(fx.dir, "INJECTED")), true, "the old line must execute the name's command — else this control is vacuous");
  } finally {
    rmSync(fx.dir, { recursive: true, force: true });
  }
  fx = makeRepo();
  try {
    writeFileSync(join(fx.dir, "src", "x$Q.js"), "x\n");
    const old = runOldLine(fx.dir, fx.base, ["src/x.js"]);
    assert.equal(old.status, 0, "the old line passes the undeclared src/x$Q.js — the false pass the review measured");
    const fixed = runCommitted(committedLine("pharn-loop.md"), fx.dir, fx.base);
    assert.equal(fixed.status, 1, "the committed line stops on the same tree");
  } finally {
    rmSync(fx.dir, { recursive: true, force: true });
  }
});

// ── The partition ─────────────────────────────────────────────────────────────────────────────────────────────

test("clean — only the declared change: exit 0, escaped empty", () => {
  const { dir, base } = makeRepo();
  try {
    const r = runCli(dir, ["--feature", "demo", "--base", base]);
    assert.equal(r.status, 0, r.stdout);
    assert.deepEqual(r.doc.inside, ["src/x.js"]);
    assert.deepEqual(r.doc.escaped, []);
    assert.equal(r.doc.findings, undefined);
    assert.equal(r.doc.base, base);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a stray: exit 1, a blocking P0 finding naming it", () => {
  const { dir, base } = makeRepo();
  try {
    writeFileSync(join(dir, "src", "stray.js"), "x\n");
    const r = runCli(dir, ["--feature", "demo", "--base", base]);
    assert.equal(r.status, 1, r.stdout);
    assert.deepEqual(r.doc.escaped, ["src/stray.js"]);
    assert.deepEqual(
      {
        type: r.doc.findings[0].type,
        rule_id: r.doc.findings[0].rule_id,
        severity: r.doc.findings[0].severity,
        file: r.doc.findings[0].file,
      },
      { type: "FINDING", rule_id: "P0", severity: "blocking", file: "src/stray.js" }
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the declared set is PLAN.md ∪ AC-TESTS.md `## Files` (a test file declared only in AC-TESTS.md passes)", () => {
  const { dir, base } = makeRepo({ acTests: planText(["src/x.test.js"]) });
  try {
    writeFileSync(join(dir, "src", "x.test.js"), "x\n");
    const r = runCli(dir, ["--feature", "demo", "--base", base]);
    assert.equal(r.status, 0, r.stdout);
    assert.deepEqual(r.doc.declared, ["src/x.js", "src/x.test.js"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an AC-TESTS.md with no `## Files` adds nothing — its test file escapes (the direction that widens the escaped set)", () => {
  const { dir, base } = makeRepo({ acTests: "# AC-TESTS\n\nno files section\n" });
  try {
    writeFileSync(join(dir, "src", "x.test.js"), "x\n");
    const r = runCli(dir, ["--feature", "demo", "--base", base]);
    assert.equal(r.status, 1, r.stdout);
    assert.deepEqual(r.doc.escaped, ["src/x.test.js"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the closed exemptions: this feature's pipeline artifact and a trusted doc are exempt and reported; another feature's artifact escapes", () => {
  const { dir, base } = makeRepo();
  try {
    writeFileSync(join(dir, "pharn", "features", "demo", "GRILL.md"), "x\n");
    writeFileSync(join(dir, "LIMITS.md"), "x\n");
    let r = runCli(dir, ["--feature", "demo", "--base", base]);
    assert.equal(r.status, 0, r.stdout);
    assert.deepEqual([...r.doc.escape_exempt].sort(), ["LIMITS.md", "pharn/features/demo/GRILL.md"]);
    mkdirSync(join(dir, "pharn", "features", "other"), { recursive: true });
    writeFileSync(join(dir, "pharn", "features", "other", "PLAN.md"), "x\n");
    r = runCli(dir, ["--feature", "demo", "--base", base]);
    assert.equal(r.status, 1, r.stdout);
    assert.deepEqual(r.doc.escaped, ["pharn/features/other/PLAN.md"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a deleted undeclared file escapes; a path under .pharn/ is never counted, even with no .gitignore", () => {
  const { dir, base } = makeRepo();
  try {
    mkdirSync(join(dir, ".pharn", "pharn-loop", "demo"), { recursive: true });
    writeFileSync(join(dir, ".pharn", "pharn-loop", "demo", "active.json"), "{}\n");
    let r = runCli(dir, ["--feature", "demo", "--base", base]);
    assert.equal(r.status, 0, r.stdout);
    unlinkSync(join(dir, "src", "y.js"));
    r = runCli(dir, ["--feature", "demo", "--base", base]);
    assert.equal(r.status, 1, r.stdout);
    assert.deepEqual(r.doc.escaped, ["src/y.js"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a declared glob covers what it names and nothing else", () => {
  const { dir, base } = makeRepo({ declared: ["src/**"] });
  try {
    writeFileSync(join(dir, "src", "new.js"), "x\n");
    let r = runCli(dir, ["--feature", "demo", "--base", base]);
    assert.equal(r.status, 0, r.stdout);
    writeFileSync(join(dir, "root.js"), "x\n");
    r = runCli(dir, ["--feature", "demo", "--base", base]);
    assert.equal(r.status, 1, r.stdout);
    assert.deepEqual(r.doc.escaped, ["root.js"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── Refusals, each by its closed reason_code ─────────────────────────────────────────────────────────────────

test("refusals: every bad input exits 2 with its closed reason_code, never 0 or 1", async () => {
  const { REASON_CODES } = await import("./check-quick-scope.mjs");
  const { dir, base, git } = makeRepo();
  try {
    const tree = git("rev-parse", "HEAD^{tree}").trim();
    const cases = [
      [[], "usage-error"],
      [["--feature", "demo"], "usage-error"],
      [["--feature", "demo", "--base"], "usage-error"],
      [["--feature", "demo", "--feature", "demo", "--base", base], "usage-error"],
      [["--feature", "demo", "--base", base, "extra"], "usage-error"],
      [["--feature", "demo", "--base", base, "--changed", "src/x.js"], "usage-error"],
      [["--feature", "../x", "--base", base], "usage-error"],
      [["--feature", "Demo", "--base", base], "usage-error"],
      [["--feature", "demo", "--base", base.toUpperCase()], "usage-error"],
      [["--feature", "demo", "--base", "HEAD"], "usage-error"],
      [["--feature", "demo", "--base", "0".repeat(40)], "base-not-commit"],
      [["--feature", "demo", "--base", tree], "base-not-commit"],
      [["--feature", "absent", "--base", base], "plan-unreadable"],
    ];
    for (const [args, code] of cases) {
      assert.ok(REASON_CODES.includes(code), `fixture sanity: ${code} is a member`);
      const r = runCli(dir, args);
      assert.equal(r.status, 2, `${JSON.stringify(args)}: ${r.stdout}`);
      assert.equal(r.doc.verdict, "inconclusive");
      assert.equal(r.doc.reason_code, code, JSON.stringify(args));
    }
    writeFileSync(join(dir, "pharn", "features", "demo", "PLAN.md"), "# PLAN\n\nno files section\n");
    let r = runCli(dir, ["--feature", "demo", "--base", base]);
    assert.equal(r.status, 2);
    assert.equal(r.doc.reason_code, "plan-files-unparseable");
    // a symlinked feature directory — the containment walk refuses it
    const elsewhere = mkdtempSync(join(tmpdir(), "quick-scope-elsewhere-"));
    writeFileSync(join(elsewhere, "PLAN.md"), planText(["**"]));
    symlinkSync(elsewhere, join(dir, "pharn", "features", "linked"), "dir");
    r = runCli(dir, ["--feature", "linked", "--base", base]);
    assert.equal(r.status, 2, r.stdout);
    assert.equal(r.doc.reason_code, "path-containment");
    rmSync(elsewhere, { recursive: true, force: true });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("✧ CLOSURE (L36) — every reason_code the source emits is a member, and every member but `crashed` has an inconclusive() call", async () => {
  const { REASON_CODES } = await import("./check-quick-scope.mjs");
  assert.equal(REASON_CODES.length, 7, "NON-VACUITY (L34)");
  const src = readFileSync(CLI, "utf8");
  const emitted = new Set([...src.matchAll(/inconclusive\("([a-z-]+)"/g)].map((m) => m[1]));
  for (const code of emitted) assert.ok(REASON_CODES.includes(code), `an emitted code outside the set: ${code}`);
  for (const code of REASON_CODES) {
    if (code === "crashed") assert.match(src, /reason_code: "crashed"/);
    else assert.ok(emitted.has(code), `a member no inconclusive() call emits: ${code}`);
  }
  assert.ok(!emitted.has("crashed"), "a crash is reported by the top-level catch alone");
});

// ── L35 — one owner of each fact ─────────────────────────────────────────────────────────────────────────────

test("✧ ONE OWNER — stage-regress.mjs takes both sets from scope-inputs.mjs; this checker decides with check-regress.mjs's partitionScope", () => {
  const stage = readFileSync(join(HERE, "stage-regress.mjs"), "utf8");
  assert.match(stage, /import \{ declaredWrites, changedPaths \} from "\.\/scope-inputs\.mjs";/);
  assert.doesNotMatch(stage, /"--name-only"/, "stage-regress.mjs must not list the changed paths itself");
  assert.doesNotMatch(stage, /pathsFromPlanFiles\(/, "stage-regress.mjs must not parse `## Files` itself");
  const mine = readFileSync(CLI, "utf8");
  assert.match(mine, /import \{ partitionScope, scopeFindings, normPath \} from "\.\/check-regress\.mjs";/);
  assert.match(mine, /import \{ declaredWrites, changedPaths \} from "\.\/scope-inputs\.mjs";/);
  assert.doesNotMatch(mine, /globMatch|matchesAny|isPipelineArtifact|TRUSTED_DOCS/, "the rule must not be re-implemented here");
  const regress = readFileSync(join(HERE, "check-regress.mjs"), "utf8");
  assert.equal(
    (regress.match(/undeclared\.filter\(\(f\) => TRUSTED_DOCS\.includes\(f\)/g) ?? []).length,
    1,
    "the exemption filter exists once"
  );
  assert.match(regress, /partitionScope\(\{ inside, declared, tests, evalPairs, feature \}\)/, "runScope calls the exported rule");
});

test("✧ importing check-regress.mjs runs nothing (the CLI waits for import.meta.main)", async () => {
  const before = process.exitCode;
  const mod = await import("./check-regress.mjs");
  assert.equal(typeof mod.partitionScope, "function");
  assert.equal(typeof mod.scopeFindings, "function");
  assert.equal(process.exitCode, before, "an import must not set the exit code");
});

test("★ PARITY — over a benign tree, the checker's verdict equals check-regress.mjs scope's CLI given the same lists", () => {
  const { dir, base } = makeRepo({ declared: ["src/x.js", "src/lib/**"], acTests: planText(["src/x.test.js"]) });
  try {
    mkdirSync(join(dir, "src", "lib"), { recursive: true });
    writeFileSync(join(dir, "src", "lib", "a.js"), "x\n");
    writeFileSync(join(dir, "src", "x.test.js"), "x\n");
    writeFileSync(join(dir, "src", "stray.js"), "x\n");
    writeFileSync(join(dir, "pharn", "features", "demo", "BUILD.md"), "x\n");
    const mine = runCli(dir, ["--feature", "demo", "--base", base]);
    const cli = spawnSync(
      process.execPath,
      [
        join(HERE, "check-regress.mjs"),
        "scope",
        "--changed",
        mine.doc.inside.join(","),
        "--declared",
        mine.doc.declared.join(","),
        "--feature",
        "demo",
      ],
      { cwd: dir, encoding: "utf8" }
    );
    const theirs = JSON.parse(cli.stdout);
    assert.equal(mine.status, cli.status);
    assert.deepEqual(mine.doc.escaped, theirs.escaped);
    assert.deepEqual(mine.doc.escape_exempt, theirs.escape_exempt);
    assert.deepEqual(mine.doc.findings, theirs.findings);
    assert.deepEqual(mine.doc.escaped, ["src/stray.js"], "fixture sanity: the parity ranges over a real escape");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("scope-inputs.mjs — changedPaths reports a failed diff by which step failed; declaredWrites refuses a PLAN with no `## Files`", async () => {
  const { changedPaths, declaredWrites } = await import("./scope-inputs.mjs");
  const bad = changedPaths("0".repeat(40));
  assert.equal(bad.ok, false);
  assert.equal(bad.which, "diff");
  const none = declaredWrites("# PLAN\n\nnothing\n", join(tmpdir(), "no-such-dir", "AC-TESTS.md"));
  assert.equal(none.ok, false);
  const some = declaredWrites(planText(["src/a.js", "src/a.js", "src/b.js (gated)"]), join(tmpdir(), "no-such-dir", "AC-TESTS.md"));
  assert.deepEqual(some, { ok: true, value: ["src/a.js", "src/b.js"] });
});
