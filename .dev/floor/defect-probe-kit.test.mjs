// .dev/floor/defect-probe-kit.test.mjs — hermetic tests for the defect probe kit builder (CORE-90).
//
// NO `claude -p`, NO network. A scratch "arm" (a tiny pharn-oss-shaped tree) and a scratch probe set are built in
// os.tmpdir(); the kit is built from them and its layout, file selection, commands and refusals are asserted. The kit
// itself runs nothing but `git` inside the run projects it creates.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ALLOWED_TOOLS,
  DEFAULT_MANIFEST,
  STAGE_COMMANDS,
  armSurface,
  commandLine,
  parseArgs,
  projectAgrees,
  run,
  setFrontmatterLine,
} from "./defect-probe-kit.mjs";
import { listFiles, sha256, treeSha256 } from "./defect-probe-score.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, "defect-probe-kit.mjs");
const REPO = join(HERE, "..", "..");

function put(root, rel, text) {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), text);
}

/** A scratch arm, a scratch probe set (one PLAN probe, one SPEC probe) and an unused output path. */
function world() {
  const root = mkdtempSync(join(tmpdir(), "defect-probe-kit-"));
  const arm = join(root, "arm");
  for (const rel of [
    "pharn/floor/check-x.mjs",
    "pharn/floor/data.json",
    "pharn/floor/check-x.test.mjs",
    "pharn/pharn-contracts/c.md",
    "pharn/CONSTITUTION.md",
    "pharn/features/README.md",
    ".claude/commands/pharn-grill.md",
    ".claude/commands/pharn-dev-plan.md",
    ".claude/hooks/guard.cjs",
    ".claude/hooks/guard.test.cjs",
    ".claude/settings.json",
    ".claude/agents/pharn-stage.md",
    ".claude/worktrees/w/pharn/floor/other.mjs",
    "src/app.mjs",
  ])
    put(arm, rel, rel);
  symlinkSync(join(arm, "pharn/floor/check-x.mjs"), join(arm, "pharn/floor/link.mjs"));
  put(arm, "SKILLS_VERSION", "7.19.0\n");
  put(arm, "pharn.config.json", JSON.stringify({ models: { stages: { default: { model: "sonnet" } } }, ship: {} }));
  const set = join(root, "set");
  put(set, "fixture/src/a.js", "export const a = 1;\n");
  put(set, "s/SPEC.md", "spec");
  put(set, "s/PLAN.md", "plan");
  const probe = (id, kind) => ({
    id,
    kind,
    feature: kind === "plan" ? "feat-a" : "feat-b",
    class: "c",
    group: null,
    defect: "commission",
    inputs: [
      { path: "s/SPEC.md", as: "SPEC.md", sha256: sha256("spec") },
      ...(kind === "plan" ? [{ path: "s/PLAN.md", as: "PLAN.md", sha256: sha256("plan") }] : []),
    ],
    planted: { as: "SPEC.md", start: 1, end: 1 },
    anchors: [{ file: "SPEC.md", start: 1, end: 1, slack: 0 }],
    plan_tokens: kind === "spec" ? ["AC-1"] : [],
    expected_disposition: "replan",
  });
  const manifest = {
    schema: "pharn-defect-probes/1",
    fixture: { dir: "fixture", tree_sha256: treeSha256(join(set, "fixture")) },
    probes: [probe("p1", "plan"), probe("p2", "spec")],
  };
  put(set, "manifest.json", JSON.stringify(manifest));
  return { root, arm, set, manifest: join(set, "manifest.json"), out: join(root, "kit") };
}

/**
 * Give the scratch arm every product command check-model-config.mjs governs, each with model/effort frontmatter, and a
 * models.stages block that agrees with them (plan and grill opus, everything else the sonnet default; all high).
 */
const PRODUCT_COMMANDS = [
  "spec",
  "plan",
  "grill",
  "triage",
  "supervise",
  "build",
  "regress",
  "verify",
  "ship",
  "loop",
  "review",
  "memory-promote",
  "test",
];
function withCommands(w) {
  for (const name of PRODUCT_COMMANDS) {
    const model = name === "plan" || name === "grill" ? "opus" : "sonnet";
    put(w.arm, `.claude/commands/pharn-${name}.md`, `---\ndescription: "${name}"\nmodel: ${model}\neffort: high\n---\n\n# ${name}\n`);
  }
  const stages = {
    default: { model: "sonnet", effort: "high" },
    plan: { model: "opus", effort: "high" },
    grill: { model: "opus", effort: "high" },
  };
  put(w.arm, "pharn.config.json", JSON.stringify({ models: { stages }, ship: {} }));
  return stages;
}

const args = (w, extra = []) => ["build", "--arm", w.arm, "--out", w.out, "--manifest", w.manifest, ...extra];

test("armSurface copies exactly the product surface: no tests, no dev commands, no links, no nested worktrees", () => {
  const w = world();
  assert.deepEqual(armSurface(w.arm), [
    "pharn/CONSTITUTION.md",
    "pharn/floor/check-x.mjs",
    "pharn/floor/data.json",
    "pharn/pharn-contracts/c.md",
    ".claude/agents/pharn-stage.md",
    ".claude/commands/pharn-grill.md",
    ".claude/hooks/guard.cjs",
    ".claude/settings.json",
  ]);
  rmSync(join(w.arm, ".claude"), { recursive: true });
  assert.equal(armSurface(w.arm).length, 4);
  rmSync(w.root, { recursive: true, force: true });
});

test("build writes one fresh project per probe × run, with the arm's surface, config, fixture and probe inputs", () => {
  const w = world();
  const r = run(args(w, ["--runs", "2"]));
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /^built 4 runs in .* \(estimated USD 24\)\n$/);
  const project = join(w.out, "runs", "p1", "r2", "project");
  assert.deepEqual(
    listFiles(project).filter((f) => !f.startsWith(".git/")),
    [
      ".claude/agents/pharn-stage.md",
      ".claude/commands/pharn-grill.md",
      ".claude/hooks/guard.cjs",
      ".claude/settings.json",
      ".gitignore",
      "pharn.config.json",
      "pharn/CONSTITUTION.md",
      "pharn/features/feat-a/PLAN.md",
      "pharn/features/feat-a/SPEC.md",
      "pharn/floor/check-x.mjs",
      "pharn/floor/data.json",
      "pharn/pharn-contracts/c.md",
      "src/a.js",
    ]
  );
  assert.deepEqual(JSON.parse(readFileSync(join(project, "pharn.config.json"), "utf8")), {
    skillsVersion: "7.19.0",
    models: { stages: { default: { model: "sonnet" } } },
  });
  assert.equal(execFileSync("git", ["-C", project, "log", "--format=%s"], { encoding: "utf8" }), "fixture\n");
  assert.ok(existsSync(join(w.out, "runs", "p2", "r1", "project", "pharn", "features", "feat-b", "SPEC.md")));
  assert.ok(!existsSync(join(w.out, "runs", "p2", "r1", "project", "pharn", "features", "feat-b", "PLAN.md")));
  const lines = readFileSync(join(w.out, "commands.txt"), "utf8").trimEnd().split("\n");
  assert.equal(lines.length, 4);
  assert.equal(new Set(lines.map((l) => /> '([^']+grill\.session\.json)'/.exec(l)[1])).size, 4);
  const score = readFileSync(join(w.out, "score.txt"), "utf8");
  assert.ok(score.includes(`--manifest-sha256 ${sha256(readFileSync(w.manifest))}`));
  assert.ok(score.includes(`--runs '${join(w.out, "runs")}'`));
  assert.match(readFileSync(join(w.out, "KIT.md"), "utf8"), /runs: 4\n- per-session spend cap: USD 12 · estimated total: about USD 24/);
  rmSync(w.root, { recursive: true, force: true });
});

test("models, efforts, the spend cap and the probe filter reach every command line", () => {
  const w = world();
  withCommands(w);
  const extra = ["--runs", "1", "--probe", "p2", "--model", "grill=sonnet", "--effort", "triage=max", "--max-budget-usd", "7.5"];
  const r = run(args(w, extra));
  assert.equal(r.code, 0, r.err);
  const [line, ...rest] = readFileSync(join(w.out, "commands.txt"), "utf8").trimEnd().split("\n");
  assert.equal(rest.length, 0);
  assert.match(
    line,
    /claude -p '\/pharn-plan feat-b' --model 'opus' --effort high .* && claude -p '\/pharn-grill feat-b' --model 'sonnet' --effort high /
  );
  assert.match(line, /claude -p '\/pharn-triage feat-b' --model 'sonnet' --effort max /);
  assert.equal(line.match(/--max-budget-usd 7\.5 /g).length, 3);
  assert.equal(line.match(/--strict-mcp-config --setting-sources project /g).length, 3);
  assert.ok(line.includes(`--allowedTools '${ALLOWED_TOOLS.join(",")}'`));
  assert.match(line, /; cp '[^']+\/PLAN\.md' '[^']+\/grill-findings\.json' '[^']+\/grill-triage\.json' '[^']+\/r1' 2>\/dev\/null$/);
  rmSync(w.root, { recursive: true, force: true });
});

test("commandLine starts in the run's project and writes each session's output beside it", () => {
  const probe = { kind: "plan", feature: "f" };
  const line = commandLine({
    probe,
    runDir: "/k/runs/p1/r1",
    models: { grill: "opus[1m]", triage: "sonnet" },
    efforts: { grill: "high", triage: "low" },
    budget: "12",
  });
  assert.ok(line.startsWith("cd '/k/runs/p1/r1/project' && claude -p '/pharn-grill f' --model 'opus[1m]' --effort high "));
  assert.ok(line.includes("> '/k/runs/p1/r1/grill.session.json' && claude -p '/pharn-triage f' --model 'sonnet' --effort low "));
  assert.ok(
    line.endsWith(
      "; cp '/k/runs/p1/r1/project/pharn/features/f/grill-findings.json' '/k/runs/p1/r1/project/pharn/features/f/grill-triage.json' '/k/runs/p1/r1' 2>/dev/null"
    )
  );
});

test("build refuses a non-empty --out and a changed input with exit 1, before writing a run", () => {
  const w = world();
  put(w.out, "old.txt", "an older kit");
  const busy = run(args(w));
  assert.equal(busy.code, 1);
  assert.match(busy.err, /--out is not empty/);
  rmSync(w.out, { recursive: true });
  writeFileSync(join(w.set, "s/PLAN.md"), "tampered");
  const red = run(args(w));
  assert.equal(red.code, 1);
  assert.equal(red.err, "RED — s/PLAN.md (sha256)\n");
  assert.ok(!existsSync(w.out));
  rmSync(w.root, { recursive: true, force: true });
});

test("build refuses an unusable manifest, arm or output path, and a failed copy, with exit 2", () => {
  const w = world();
  assert.match(run(args(w, ["--probe", "p9"])).err, /--probe names no probe/);
  assert.equal(run(["build", "--arm", w.arm, "--out", w.out, "--manifest", join(w.root, "none.json")]).code, 2);
  assert.match(run(["build", "--arm", w.arm, "--out", join(w.root, "it's"), "--manifest", w.manifest]).err, /single quote/);
  assert.match(run(["build", "--arm", w.set, "--out", w.out, "--manifest", w.manifest]).err, /not a pharn-oss checkout/);
  writeFileSync(join(w.arm, "SKILLS_VERSION"), "seven\n");
  assert.match(run(args(w)).err, /unusable SKILLS_VERSION/);
  writeFileSync(join(w.arm, "SKILLS_VERSION"), "7.19.0\n");
  chmodSync(join(w.arm, "pharn/floor/data.json"), 0o000);
  const failed = run(args(w));
  chmodSync(join(w.arm, "pharn/floor/data.json"), 0o644);
  assert.equal(failed.code, 2);
  assert.match(failed.err, /^building a run failed: E[A-Z]+\n/);
  rmSync(w.root, { recursive: true, force: true });
});

test("parseArgs: defaults, and every argument refusal", () => {
  const d = parseArgs(["build", "--arm", "a", "--out", "o"]);
  assert.equal(d.runs, 2);
  assert.equal(d.maxBudgetUsd, "12");
  assert.equal(d.manifest, DEFAULT_MANIFEST);
  assert.deepEqual(d.models, { plan: "opus", grill: "opus", triage: "sonnet" });
  assert.deepEqual(d.efforts, { plan: "high", grill: "high", triage: "high" });
  assert.deepEqual(d.overrides, []);
  assert.deepEqual(parseArgs(["build", "--arm", "a", "--out", "o", "--model", "grill=sonnet", "--effort", "grill=low"]).overrides, [
    "grill",
  ]);
  assert.equal(parseArgs(["build", "--arm", "a", "--out", "o", "--runs", "10"]).runs, 10);
  const err = (argv) => parseArgs(argv).error;
  assert.match(err(["run"]), /only subcommand/);
  assert.match(err(["build", "--nope", "x"]), /unknown argument/);
  assert.match(err(["build", "--arm"]), /needs a value/);
  assert.match(err(["build", "--arm", "a", "--arm", "b"]), /given twice/);
  assert.match(err(["build", "--model", "build=opus"]), /<stage>=<value>/);
  assert.match(err(["build", "--model", "grill=op us"]), /not a model name/);
  assert.match(err(["build", "--effort", "grill=huge"]), /must be one of/);
  assert.match(err(["build", "--arm", "a"]), /required/);
  assert.match(err(["build", "--arm", "a", "--out", "o", "--runs", "11"]), /1\.\.10/);
  assert.match(err(["build", "--arm", "a", "--out", "o", "--max-budget-usd", "0"]), /positive amount/);
});

test("the CLI prints a usage error and exits 2", () => {
  const r = spawnSync(process.execPath, [CLI, "build"], { encoding: "utf8" });
  assert.equal(r.status, 2);
  assert.equal(r.stdout, "");
  assert.match(r.stderr, /^--arm and --out are required\nusage:/);
});

// ── stage-model-tuning (CORE-112): a stage override reaches the project where Claude Code reads it ─────────────────────

test("an override is written into the stage command's frontmatter and models.stages, and the project agrees", () => {
  const w = world();
  const stages = withCommands(w);
  const r = run(args(w, ["--runs", "1", "--probe", "p1", "--model", "grill=sonnet", "--effort", "grill=medium"]));
  assert.equal(r.code, 0, r.err);
  const project = join(w.out, "runs", "p1", "r1", "project");
  const grill = readFileSync(join(project, ".claude/commands/pharn-grill.md"), "utf8");
  assert.equal(grill, '---\ndescription: "grill"\nmodel: sonnet\neffort: medium\n---\n\n# grill\n');
  for (const name of PRODUCT_COMMANDS.filter((n) => n !== "grill"))
    assert.equal(
      readFileSync(join(project, `.claude/commands/pharn-${name}.md`), "utf8"),
      readFileSync(join(w.arm, `.claude/commands/pharn-${name}.md`), "utf8")
    );
  assert.deepEqual(JSON.parse(readFileSync(join(project, "pharn.config.json"), "utf8")).models.stages, {
    ...stages,
    grill: { model: "sonnet", effort: "medium" },
  });
  assert.equal(projectAgrees(project), true);
  assert.equal(execFileSync("git", ["-C", project, "status", "--porcelain"], { encoding: "utf8" }), "");
  assert.match(
    readFileSync(join(w.out, "KIT.md"), "utf8"),
    /- project overrides \(command frontmatter and pharn\.config\.json\): grill model sonnet, effort medium\n/
  );
  assert.match(readFileSync(join(w.out, "commands.txt"), "utf8"), /'\/pharn-grill feat-a' --model 'sonnet' --effort medium /);
  rmSync(w.root, { recursive: true, force: true });
});

test("an effort-only override goes through the same rewrite, and an unrelated stage's line is never touched", () => {
  const w = world();
  withCommands(w);
  assert.equal(run(args(w, ["--runs", "1", "--probe", "p2", "--effort", "plan=max"])).code, 0);
  const project = join(w.out, "runs", "p2", "r1", "project");
  assert.match(readFileSync(join(project, ".claude/commands/pharn-plan.md"), "utf8"), /\nmodel: opus\neffort: max\n---\n/);
  assert.deepEqual(JSON.parse(readFileSync(join(project, "pharn.config.json"), "utf8")).models.stages.plan, {
    model: "opus",
    effort: "max",
  });
  assert.match(readFileSync(join(w.out, "KIT.md"), "utf8"), /overrides .*: plan model opus, effort max\n/);
  rmSync(w.root, { recursive: true, force: true });
});

test("no flag, or a flag equal to the arm's value, leaves every project's commands and config equal to the arm", () => {
  for (const extra of [[], ["--model", "grill=opus", "--effort", "triage=high"]]) {
    const w = world();
    const stages = withCommands(w);
    const r = run(args(w, ["--runs", "1", ...extra]));
    assert.equal(r.code, 0, r.err);
    for (const id of ["p1", "p2"]) {
      const project = join(w.out, "runs", id, "r1", "project");
      for (const name of PRODUCT_COMMANDS)
        assert.equal(
          readFileSync(join(project, `.claude/commands/pharn-${name}.md`), "utf8"),
          readFileSync(join(w.arm, `.claude/commands/pharn-${name}.md`), "utf8")
        );
      assert.deepEqual(JSON.parse(readFileSync(join(project, "pharn.config.json"), "utf8")).models, { stages });
    }
    assert.match(readFileSync(join(w.out, "KIT.md"), "utf8"), /overrides .*: none — every project equals the arm\n/);
    rmSync(w.root, { recursive: true, force: true });
  }
});

test("build refuses an override the arm cannot take, with exit 2", () => {
  const cases = [
    [
      (w) => rmSync(join(w.arm, ".claude/commands/pharn-triage.md")),
      ["--model", "triage=opus"],
      /has no \.claude\/commands\/pharn-triage\.md/,
    ],
    [
      (w) => put(w.arm, ".claude/commands/pharn-grill.md", "# no frontmatter\n"),
      ["--model", "grill=sonnet"],
      /cannot carry the grill override \(no frontmatter\)/,
    ],
    [
      (w) => put(w.arm, ".claude/commands/pharn-grill.md", "---\nmodel: opus\n---\n"),
      ["--model", "grill=sonnet"],
      /\(not exactly one effort: line\)/,
    ],
    [(w) => put(w.arm, "pharn.config.json", JSON.stringify({ models: {} })), ["--model", "grill=sonnet"], /has no models\.stages/],
    [
      (w) => put(w.arm, ".claude/commands/pharn-review.md", "---\nmodel: haiku\neffort: high\n---\n"),
      ["--model", "grill=sonnet"],
      /fails check-model-config\.mjs agreement/,
    ],
    [() => {}, ["--model", "grill=sonnet[1m]"], /fails check-model-config\.mjs agreement/],
  ];
  for (const [arrange, extra, message] of cases) {
    const w = world();
    withCommands(w);
    arrange(w);
    const r = run(args(w, ["--runs", "1", ...extra]));
    assert.equal(r.code, 2, String(message));
    assert.match(r.err, message);
    rmSync(w.root, { recursive: true, force: true });
  }
});

test("setFrontmatterLine replaces exactly one line inside the leading frontmatter and reports the old value", () => {
  assert.deepEqual(setFrontmatterLine('---\nmodel: "opus"\n---\nmodel: body\n', "model", "sonnet"), {
    text: "---\nmodel: sonnet\n---\nmodel: body\n",
    from: "opus",
  });
  assert.deepEqual(setFrontmatterLine("---\nmodel: opus\n", "model", "x"), { error: "no frontmatter" });
  assert.deepEqual(setFrontmatterLine("---\nmodel: a\nmodel: b\n---\n", "model", "x"), { error: "not exactly one model: line" });
  assert.deepEqual(setFrontmatterLine("---\nmodel_tier: sonnet\n---\n", "model", "x"), { error: "not exactly one model: line" });
  assert.deepEqual(Object.keys(STAGE_COMMANDS), ["plan", "grill", "triage"]);
});

test("a real pharn-oss checkout as the arm: a grill=sonnet project passes this repository's agreement check", () => {
  const w = world();
  const r = run([
    "build",
    "--arm",
    REPO,
    "--out",
    w.out,
    "--manifest",
    w.manifest,
    "--runs",
    "1",
    "--probe",
    "p1",
    "--model",
    "grill=sonnet",
  ]);
  assert.equal(r.code, 0, r.err);
  const project = join(w.out, "runs", "p1", "r1", "project");
  assert.match(readFileSync(join(project, ".claude/commands/pharn-grill.md"), "utf8"), /\nmodel: sonnet\neffort: high\n/);
  assert.equal(
    readFileSync(join(project, ".claude/commands/pharn-plan.md"), "utf8"),
    readFileSync(join(REPO, ".claude/commands/pharn-plan.md"), "utf8")
  );
  assert.deepEqual(JSON.parse(readFileSync(join(project, "pharn.config.json"), "utf8")).models.stages.grill, {
    model: "sonnet",
    effort: "high",
  });
  assert.equal(projectAgrees(project), true);
  rmSync(w.root, { recursive: true, force: true });
});
