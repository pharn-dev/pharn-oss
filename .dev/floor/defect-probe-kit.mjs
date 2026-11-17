#!/usr/bin/env node
// .dev/floor/defect-probe-kit.mjs — build a run kit for the defect probe set: one fresh project per probe × run, and
// one single-line `claude -p` command per run for a person to execute (CORE-90; reused by per-stage model tuning).
//
// WHY A KIT, NOT A RUNNER. A headless `claude -p` session started by an agent is refused in this repository's agent
// sessions, and a measurement that spends money is the user's to start. This tool prepares everything and runs
// nothing: the user runs `commands.txt`, then `score.txt` (defect-probe-score.mjs `tally`).
//
// WHAT AN ARM IS. `--arm` is a checkout of the pharn-oss commit under test (`git worktree add --detach <dir> <ref>` or a
// `git archive` extraction). Its product surface is selected with check-surface-bump.mjs's PRODUCT_SURFACE /
// isProductSurface — the set that versions what an install receives — never a hand-picked list (L81). The project
// gets that surface, a pharn.config.json carrying the arm's `models` block and `skillsVersion`, the fixture, and the
// probe's inputs under pharn/features/<feature>/ under the names the manifest gives. Nothing of the manifest, the other
// probes or the probe id's meaning reaches the project; the run path names only `p<n>/r<n>`.
//
// ISOLATION (L66). Each run writes into its own `runs/<probe>/r<n>/` the kit creates; `--out` must be absent or empty,
// so a kit never mixes with an older one. The run's session output goes beside the project, never inside it. The last
// step of each command copies the run files out of the project after the sessions have exited.
//
// THE SESSION ENVIRONMENT. Every session gets `--model` and `--effort` per stage (defaults: today's routing, plan and
// grill opus, triage sonnet, all high), `--permission-mode acceptEdits`, an explicit `--allowedTools`,
// `--strict-mcp-config` (no MCP servers), `--setting-sources project` (the project's own settings, which wire the
// hooks), `--max-budget-usd` (a per-session runaway bound) and `--output-format json` (time and cost per session).
// Every flag was checked against `claude --help` of Claude Code 2.1.323.
//
// WHERE A STAGE'S MODEL IS SET (stage-model-tuning, CORE-112). Each session is a direct `/pharn-<stage>` invocation, and
// Claude Code selects a directly invoked command's model and effort from the command's own `model:` / `effort:`
// frontmatter for that turn (pharn/floor/check-model-config.mjs, "TURN SCOPE"), so a `--model` flag the frontmatter
// disagrees with is most likely not what runs. A stage a `--model` / `--effort` flag NAMES is therefore also written
// into the run project: the `model:` / `effort:` line of its command's frontmatter and its `models.stages` entry in
// pharn.config.json, when they differ from the arm's, and then THIS repository's check-model-config.mjs `agreement`
// must pass over the project (the arm's copy is never executed). A flag equal to the arm's value changes no byte, so a
// control kit's projects equal the arm; its flags are then redundant with the frontmatter, never evidence they applied.
// What a session was SERVED is read afterwards from its own session file (stage-model-pairs.mjs).
//
// FLOOR: the manifest's shape and every sha256 (defect-probe-score.mjs `verifyInputs`) before anything is written; the
// arm file set (a glob test); argument shapes (regex / set membership); the override's line replacement and the
// agreement exit code. ADVISORY: everything about the runs, including which model and effort a session was served.
//
// Usage:
//   node .dev/floor/defect-probe-kit.mjs build --arm <dir> --out <dir> [--runs <n>] [--probe <id>]...
//        [--model <stage>=<model>]... [--effort <stage>=<level>]... [--max-budget-usd <n>] [--manifest <path>]
// Exit: 0 built · 1 an input's sha256 differs from the manifest, or --out is not empty · 2 usage, an unusable arm or
// manifest, an override the arm cannot take or a project failing agreement, or a failed copy or git call.
import "../../pharn/floor/runtime-floor.mjs";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isProductSurface } from "./check-surface-bump.mjs";
import { loadManifest, verifyInputs } from "./defect-probe-score.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_MANIFEST = join(HERE, "..", "probes", "defect-probes", "manifest.json");
export const STAGES_BY_KIND = Object.freeze({ plan: ["grill", "triage"], spec: ["plan", "grill", "triage"] });
export const STAGE_NAMES = Object.freeze(["plan", "grill", "triage"]);
export const DEFAULT_MODELS = Object.freeze({ plan: "opus", grill: "opus", triage: "sonnet" });
export const EFFORTS = Object.freeze(["low", "medium", "high", "xhigh", "max"]);
export const DEFAULT_BUDGET = "12";
/** USD per session, for KIT.md's estimate only: grill and triage measured (loop-grill-triage), plan assumed. */
export const COST_ESTIMATE = Object.freeze({ plan: 5, grill: 3.1, triage: 0.5 });
export const ALLOWED_TOOLS = Object.freeze([
  "Read",
  "Glob",
  "Grep",
  "Write",
  "Edit",
  "MultiEdit",
  "Bash(node pharn/floor/*)",
  "Bash(node .claude/hooks/set-writes-scope.cjs *)",
  "Bash(npx --no-install prettier *)",
  "Bash(npx --no-install markdownlint-cli2 *)",
]);
/** The files a run leaves for the scorer, by stage that writes them. */
const RUN_FILES = Object.freeze({ grill: "grill-findings.json", triage: "grill-triage.json", plan: "PLAN.md" });
/** Each kit stage's product command — the same stage keys as check-model-config.mjs's PRODUCT_STAGES. */
export const STAGE_COMMANDS = Object.freeze({ plan: "pharn-plan.md", grill: "pharn-grill.md", triage: "pharn-triage.md" });
const MODEL_CONFIG_CLI = join(HERE, "..", "..", "pharn", "floor", "check-model-config.mjs");

const USAGE =
  "usage: defect-probe-kit.mjs build --arm <dir> --out <dir> [--runs <n>] [--probe <id>]... [--model <stage>=<model>]...\n" +
  "       [--effort <stage>=<level>]... [--max-budget-usd <n>] [--manifest <path>]";
const SINGLE = ["--arm", "--out", "--runs", "--max-budget-usd", "--manifest"];
const MULTI = ["--probe", "--model", "--effort"];

/** argv after `build` → options, or {error}. */
export function parseArgs(argv) {
  if (argv[0] !== "build") return { error: "the only subcommand is build" };
  const o = {
    runs: 2,
    probes: [],
    models: { ...DEFAULT_MODELS },
    efforts: { plan: "high", grill: "high", triage: "high" },
    overrides: [],
  };
  const seen = new Set();
  for (let i = 1; i < argv.length; i += 2) {
    const [name, value] = [argv[i], argv[i + 1]];
    if (!SINGLE.includes(name) && !MULTI.includes(name)) return { error: "unknown argument" };
    if (value === undefined) return { error: `${name} needs a value` };
    if (SINGLE.includes(name) && seen.has(name)) return { error: `${name} given twice` };
    seen.add(name);
    if (name === "--probe") o.probes.push(value);
    else if (name === "--model" || name === "--effort") {
      const m = /^([a-z]+)=(.+)$/.exec(value);
      if (!m || !STAGE_NAMES.includes(m[1])) return { error: `${name} takes <stage>=<value>, stage one of ${STAGE_NAMES.join(", ")}` };
      if (name === "--model" && !/^[A-Za-z0-9._[\]-]{1,64}$/.test(m[2])) return { error: "--model value is not a model name" };
      if (name === "--effort" && !EFFORTS.includes(m[2])) return { error: `--effort value must be one of ${EFFORTS.join(", ")}` };
      (name === "--model" ? o.models : o.efforts)[m[1]] = m[2];
      if (!o.overrides.includes(m[1])) o.overrides.push(m[1]);
    } else o[name.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
  }
  if (!o.arm || !o.out) return { error: "--arm and --out are required" };
  if (typeof o.runs === "string") {
    if (!/^([1-9]|10)$/.test(o.runs)) return { error: "--runs must be 1..10" };
    o.runs = Number(o.runs);
  }
  o.maxBudgetUsd ??= DEFAULT_BUDGET;
  if (!/^[1-9]\d{0,2}(\.\d{1,2})?$/.test(o.maxBudgetUsd)) return { error: "--max-budget-usd must be a positive amount" };
  o.manifest ??= DEFAULT_MANIFEST;
  return o;
}

/** Every regular file under arm/pharn and arm/.claude that isProductSurface admits, as `/` paths. Links are skipped. */
export function armSurface(arm) {
  const out = [];
  const walk = (rel) => {
    for (const name of readdirSync(join(arm, rel)).sort()) {
      const child = `${rel}/${name}`;
      const st = lstatSync(join(arm, child));
      if (st.isDirectory() && child !== ".claude/worktrees") walk(child);
      else if (st.isFile() && isProductSurface(child)) out.push(child);
    }
  };
  for (const top of ["pharn", ".claude"]) if (existsSync(join(arm, top))) walk(top);
  return out;
}

/**
 * Set one `key:` line inside a command's leading `---` frontmatter. Returns {text, from} (`from` = the old value,
 * quotes stripped) or {error} when the text has no frontmatter or not exactly one such line in it.
 */
export function setFrontmatterLine(text, key, value) {
  if (!text.startsWith("---\n")) return { error: "no frontmatter" };
  const end = text.indexOf("\n---", 3);
  if (end === -1) return { error: "no frontmatter" };
  const lines = text.slice(0, end).split("\n");
  const re = new RegExp(`^${key}:(.*)$`);
  const hits = lines.flatMap((line, i) => (re.test(line) ? [i] : []));
  if (hits.length !== 1) return { error: `not exactly one ${key}: line` };
  const from = re
    .exec(lines[hits[0]])[1]
    .trim()
    .replace(/^["']|["']$/g, "");
  lines[hits[0]] = `${key}: ${value}`;
  return { text: lines.join("\n") + text.slice(end), from };
}

/**
 * What the run projects carry for the overridden stages: {files: {rel: text}, models, notes} or {error}. A stage whose
 * frontmatter already holds the kit's values contributes nothing, so a control kit changes no byte of the arm.
 */
export function projectOverrides(arm, o, models) {
  const files = {};
  const notes = [];
  const out = structuredClone(models);
  for (const stage of o.overrides) {
    const rel = `.claude/commands/${STAGE_COMMANDS[stage]}`;
    let text;
    try {
      text = readFileSync(join(arm, rel), "utf8");
    } catch {
      return { error: `the arm has no ${rel} to carry the ${stage} override` };
    }
    const m = setFrontmatterLine(text, "model", o.models[stage]);
    const e = m.error ? m : setFrontmatterLine(m.text, "effort", o.efforts[stage]);
    if (e.error) return { error: `the arm's ${rel} cannot carry the ${stage} override (${e.error})` };
    if (m.from === o.models[stage] && e.from === o.efforts[stage]) continue;
    if (out.stages === null || typeof out.stages !== "object") return { error: "the arm's pharn.config.json has no models.stages" };
    files[rel] = e.text;
    out.stages[stage] = { model: o.models[stage], effort: o.efforts[stage] };
    notes.push(`${stage} model ${o.models[stage]}, effort ${o.efforts[stage]}`);
  }
  return { files, models: out, notes };
}

/** This repository's check-model-config.mjs `agreement` over one run project. True on exit 0. */
export function projectAgrees(project) {
  const r = spawnSync(
    process.execPath,
    [MODEL_CONFIG_CLI, "agreement", "--config", join(project, "pharn.config.json"), "--commands-dir", join(project, ".claude", "commands")],
    { stdio: "ignore" }
  );
  return r.status === 0;
}

const q = (s) => `'${s}'`;

/**
 * The one shell line for one run: each stage's session, then the copy of the run files out of the project. Every value
 * from the user is single-quoted or enum-checked: a model name such as `opus[1m]` is a glob to zsh when unquoted.
 */
export function commandLine({ probe, runDir, models, efforts, budget }) {
  const project = join(runDir, "project");
  const feature = join(project, "pharn", "features", probe.feature);
  const stages = STAGES_BY_KIND[probe.kind];
  const sessions = stages.map(
    (stage) =>
      `claude -p ${q(`/pharn-${stage} ${probe.feature}`)} --model ${q(models[stage])} --effort ${efforts[stage]} ` +
      `--permission-mode acceptEdits --allowedTools ${q(ALLOWED_TOOLS.join(","))} --strict-mcp-config ` +
      `--setting-sources project --max-budget-usd ${budget} --output-format json > ${q(join(runDir, `${stage}.session.json`))}`
  );
  const files = stages.map((s) => q(join(feature, RUN_FILES[s])));
  return `cd ${q(project)} && ${sessions.join(" && ")}; cp ${files.join(" ")} ${q(runDir)} 2>/dev/null`;
}

function git(project, args) {
  execFileSync("git", ["-C", project, ...args], { stdio: ["ignore", "ignore", "pipe"] });
}

/** Build the kit. Returns {code, out, err}. */
export function build(o) {
  const fail = (code, msg) => ({ code, out: "", err: `${msg}\n${code === 2 ? `${USAGE}\n` : ""}` });
  const m = loadManifest({ "--manifest": [o.manifest] });
  if (m.error) return fail(2, m.error);
  const { manifest, sha, baseDir } = m;
  if (o.probes.some((id) => !manifest.probes.some((p) => p.id === id))) return fail(2, "--probe names no probe in the manifest");
  const bad = verifyInputs(manifest, baseDir);
  if (bad.length > 0) return fail(1, `RED — ${bad.map((b) => `${b.path} (${b.reason})`).join(", ")}`);
  const arm = resolve(o.arm);
  const out = resolve(o.out);
  if ([arm, out].some((p) => p.includes("'"))) return fail(2, "--arm and --out may not contain a single quote");
  let version, models;
  try {
    version = readFileSync(join(arm, "SKILLS_VERSION"), "utf8").trim();
    models = JSON.parse(readFileSync(join(arm, "pharn.config.json"), "utf8")).models;
  } catch {
    return fail(2, "--arm is not a pharn-oss checkout (SKILLS_VERSION and pharn.config.json are required)");
  }
  if (!/^\d+\.\d+\.\d+$/.test(version) || models === null || typeof models !== "object")
    return fail(2, "--arm holds an unusable SKILLS_VERSION or models block");
  if (existsSync(out) && readdirSync(out).length > 0) return fail(1, "--out is not empty: a kit is always built into a new directory");
  const ov = projectOverrides(arm, o, models);
  if (ov.error) return fail(2, ov.error);
  const surface = armSurface(arm);
  const probes = manifest.probes.filter((p) => o.probes.length === 0 || o.probes.includes(p.id));
  const lines = [];
  let estimate = 0;
  try {
    for (const probe of probes) {
      for (let n = 1; n <= o.runs; n++) {
        const runDir = join(out, "runs", probe.id, `r${n}`);
        const project = join(runDir, "project");
        cpSync(join(baseDir, manifest.fixture.dir), project, { recursive: true });
        for (const rel of surface) cpSync(join(arm, rel), join(project, rel), { recursive: false });
        for (const [rel, text] of Object.entries(ov.files)) writeFileSync(join(project, rel), text);
        writeFileSync(join(project, "pharn.config.json"), `${JSON.stringify({ skillsVersion: version, models: ov.models }, null, 2)}\n`);
        if (ov.notes.length > 0 && !projectAgrees(project))
          return fail(2, "an overridden run project fails check-model-config.mjs agreement: the arm cannot take this override");
        writeFileSync(join(project, ".gitignore"), "pharn/.run/\nnode_modules/\n");
        const feature = join(project, "pharn", "features", probe.feature);
        mkdirSync(feature, { recursive: true });
        for (const input of probe.inputs) cpSync(join(baseDir, input.path), join(feature, input.as));
        git(project, ["init", "-q"]);
        git(project, ["add", "-A"]);
        git(project, [
          "-c",
          "user.name=defect-probe-kit",
          "-c",
          "user.email=kit@localhost",
          "-c",
          "commit.gpgsign=false",
          "commit",
          "-q",
          "-m",
          "fixture",
        ]);
        lines.push(commandLine({ probe, runDir, models: o.models, efforts: o.efforts, budget: o.maxBudgetUsd }));
        estimate += STAGES_BY_KIND[probe.kind].reduce((s, stage) => s + COST_ESTIMATE[stage], 0);
      }
    }
  } catch (err) {
    return fail(2, `building a run failed: ${err.code ?? "error"}`);
  }
  const manifestPath = isAbsolute(o.manifest) ? o.manifest : resolve(o.manifest);
  const score = `node ${q(join(HERE, "defect-probe-score.mjs"))} tally --manifest ${q(manifestPath)} --manifest-sha256 ${sha} --runs ${q(join(out, "runs"))} > ${q(join(out, "tally.json"))}`;
  writeFileSync(join(out, "commands.txt"), `${lines.join("\n")}\n`);
  writeFileSync(join(out, "score.txt"), `${score}\n`);
  const stageRows = STAGE_NAMES.map((s) => `| ${s} | ${o.models[s]} | ${o.efforts[s]} |`).join("\n");
  writeFileSync(
    join(out, "KIT.md"),
    [
      "# Defect probe kit",
      "",
      `- arm: \`${arm}\` (SKILLS_VERSION ${version}, ${surface.length} product-surface files)`,
      `- manifest: \`${manifestPath}\` (sha256 \`${sha}\`)`,
      `- probes: ${probes.map((p) => p.id).join(", ")} · runs per probe: ${o.runs} · runs: ${lines.length}`,
      `- per-session spend cap: USD ${o.maxBudgetUsd} · estimated total: about USD ${Math.round(estimate)}`,
      `- project overrides (command frontmatter and pharn.config.json): ${ov.notes.length > 0 ? ov.notes.join("; ") : "none — every project equals the arm"}`,
      "",
      "| stage | model | effort |",
      "| ----- | ----- | ------ |",
      stageRows,
      "",
      "Run each line of `commands.txt` once, one at a time, then the line in `score.txt`.",
      "",
    ].join("\n")
  );
  return { code: 0, out: `built ${lines.length} runs in ${out} (estimated USD ${Math.round(estimate)})\n`, err: "" };
}

export function run(argv) {
  const o = parseArgs(argv);
  if (o.error) return { code: 2, out: "", err: `${o.error}\n${USAGE}\n` };
  return build(o);
}

if (import.meta.main) {
  const r = run(process.argv.slice(2));
  process.stdout.write(r.out);
  process.stderr.write(r.err);
  process.exitCode = r.code;
}
