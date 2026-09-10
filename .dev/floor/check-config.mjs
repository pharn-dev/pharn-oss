#!/usr/bin/env node
// .dev/floor/check-config.mjs — the deterministic pharn.config.json VALIDATOR + per-stage RESOLVER +
// config↔frontmatter AGREEMENT checker for the /pharn-dev-* build loop's model/effort configuration.
//
// Floor primitives (ARCHITECTURE §2): #3 (enum / regex / presence) — every stage `model` is bounded to
// the Claude model namespace (a closed alias set {sonnet,opus,haiku,fable} ∪ `inherit` ∪ an OPEN
// `claude-*` full-id regex — a namespace bound, NOT a closed allowlist: a non-real `claude-*` id validates),
// every `effort` ∈ {low,medium,high,xhigh,max}, a `default` entry present, resolution is the own-property
// membership pick `Object.hasOwn(stages, stage) ? stages[stage] : stages.default` (not inherited — P5), and
// agreement is BIDIRECTIONAL over the closed `DEV_WIRED` set below: each wired stage's command-file
// frontmatter `model:`/`effort:` EQUALS the config-resolved value, AND no `pharn-dev-*` command carrying
// `model:`/`effort:` frontmatter sits OUTSIDE that set — a deterministic equality between two repo files,
// the same drift-detection class as a content-hash (#2).
//
// WHY `DEV_WIRED` IS A CLOSED SET AND NOT "every non-default config stage" (changed alongside the product
// checker). `models.stages` is keyed by PIPELINE STAGE, and since `pharn/floor/check-model-config.mjs`
// landed the SAME map is the source of truth for the ten PRODUCT commands — which include stages the dev
// surface has no command for at all (`spec`, `loop`). Iterating every config key here would look for a
// `pharn-dev-spec.md` that does not exist and RED on a correct repo. The narrowing is therefore to a
// materialized set, NOT to "whichever stages happen to have a file" (lessons-learned L29/L36: the
// enumeration is the deliverable). The distinction is load-bearing in both directions — a file-existence
// test would silently stop checking a RENAMED dev command, and it is the reverse pass, re-keyed onto
// DEV_WIRED below, that keeps an unlisted dev command from quietly gaining a `model:`.
// NON-LLM, dependency-free (Node stdlib only). No network, no child_process, no eval, no dynamic import.
//
// Honest scope (P0): it guarantees the config is SHAPE/ENUM-valid, that a stage RESOLVES deterministically,
// and that the wired commands' static `model:`/`effort:` frontmatter is CONSISTENT with the config. It does
// NOT — cannot — guarantee that a stage actually RUNS UNDER the resolved model/effort at runtime: model and
// effort selection is applied by the Claude Code platform, invisible to any hook / hash / enum. "check-config
// GREEN" must NEVER read as "the stage ran under model X" — that conflation ("written in the config" ⇒
// "therefore guaranteed") is the exact P0 disease this repo exists to prevent. The runtime binding is
// ADVISORY (the platform honoring static frontmatter); this checker owns ONLY config-validity + the
// config↔frontmatter consistency floor.
//
// Trust (P2): pharn.config.json and the command frontmatter are repo-local, human-authored DATA — parsed as
// JSON / YAML frontmatter, NEVER executed. The verdict ranges ONLY over the enum-gated fields (model ∈ the
// bounded namespace, effort ∈ enum, resolved == frontmatter) and rejects any non-member; a poisoned/edited
// config can at most select a DIFFERENT namespace-valid model/effort (a bounded, advisory blast radius),
// never inject an instruction. No guaranteed decision rests on any free-text field (mirrors fix #1).
//
// Usage:
//   node .dev/floor/check-config.mjs [validate] [--config <path>]
//        validate config shape + enums (default mode)                → exit 1 on any RED (prints each), else 0 + GREEN
//   node .dev/floor/check-config.mjs resolve <stage> [--config <path>]
//        print {"model":..,"effort":..} for <stage>
//        (Object.hasOwn(stages, stage) ? stages[stage] : stages.default) → exit 0, else RED
//   node .dev/floor/check-config.mjs agreement [--config <path>] [--commands-dir <dir>]
//        validate + BIDIRECTIONAL config↔frontmatter agreement — (fwd) each DEV_WIRED stage's
//        <commands-dir>/pharn-dev-<stage>.md `model:`/`effort:` EQUALS the config-resolved value, AND (rev)
//        no pharn-dev-*.md carrying `model:`/`effort:` sits outside DEV_WIRED → exit 1 on any RED, else 0 + GREEN
//
// Exit: 1 on any RED / unreadable / malformed; 0 otherwise.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Enums — every branch is a presence / enum / equality membership test (P5); the terminal fallback on any
// non-member is a loud RED, never a guess. These mirror the Claude Code model/effort surface (sub-agents +
// skills frontmatter): aliases + a full model id + `inherit`, and the five effort levels.
const MODEL_ALIASES = ["sonnet", "opus", "haiku", "fable", "inherit"];
const MODEL_ID_RE = /^claude-[a-z0-9][a-z0-9-]*$/; // a full model id, e.g. claude-opus-4-8
const EFFORT_ENUM = ["low", "medium", "high", "xhigh", "max"];
const DEFAULT_CONFIG = "pharn.config.json";
const DEFAULT_COMMANDS_DIR = join(".claude", "commands");

// The closed set of DEV stages the config governs — the `pharn-dev-<stage>.md` files that MUST exist,
// MUST carry `model:`/`effort:`, and MUST equal the config-resolved value. Both agreement passes iterate
// exactly this (see the header for why it is a materialized set rather than a filesystem probe or "every
// config key"). A dev command NOT listed here must carry NO `model:`/`effort:` at all; adding one to a
// dev command means adding its stage here in the same edit, which is the point of the reverse pass.
const DEV_WIRED = ["plan", "build", "review"];

const reds = [];
function red(kind, detail) {
  reds.push({ kind, detail });
}

function isValidModel(m) {
  return typeof m === "string" && (MODEL_ALIASES.includes(m) || MODEL_ID_RE.test(m));
}
function isValidEffort(e) {
  return typeof e === "string" && EFFORT_ENUM.includes(e);
}

function fail() {
  for (const r of reds) console.log(`RED — ${r.kind} failed: ${r.detail}`);
  console.log(`\nRED — ${reds.length} config check(s) failed`);
  return 1;
}

// Read + JSON-parse the config; on any failure push a RED and return undefined (fail-closed).
function readConfig(path) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch (e) {
    red("input", `config unreadable (${path}): ${e.message}`);
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    red("json", `config is not valid JSON (${path}): ${e.message}`);
    return undefined;
  }
}

// The `models.stages` map, or undefined + RED if the shape is wrong (fail-closed).
function stagesOf(cfg) {
  const stages = cfg && cfg.models && cfg.models.stages;
  if (!stages || typeof stages !== "object" || Array.isArray(stages)) {
    red("shape", "missing `models.stages` object");
    return undefined;
  }
  return stages;
}

// Validate every stage entry's shape + enums. `default` MUST be present (it is the resolution fallback).
function validateStages(stages) {
  if (!("default" in stages)) {
    red("default", "missing required `default` stage entry (the resolution fallback)");
  }
  for (const [name, entry] of Object.entries(stages)) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      red("entry", `stage ${JSON.stringify(name)} is not an object with {model, effort}`);
      continue;
    }
    if (!("model" in entry)) red("model", `stage ${JSON.stringify(name)} missing \`model\``);
    else if (!isValidModel(entry.model))
      red(
        "model",
        `stage ${JSON.stringify(name)} model ${JSON.stringify(entry.model)} is not an alias {${MODEL_ALIASES.join(", ")}} nor a claude-* id`
      );
    if (!("effort" in entry)) red("effort", `stage ${JSON.stringify(name)} missing \`effort\``);
    else if (!isValidEffort(entry.effort))
      red("effort", `stage ${JSON.stringify(name)} effort ${JSON.stringify(entry.effort)} not in {${EFFORT_ENUM.join(", ")}}`);
  }
}

// resolve: Object.hasOwn(stages, stage) ? stages[stage] : stages.default (an OWN-PROPERTY membership test, P5) —
// an INHERITED member (toString / constructor / __proto__ / hasOwnProperty) is truthy but is NOT a configured
// stage, so `||`/`??` would leak it (returning {model:undefined,effort:undefined} → silent `{}` at exit 0, the
// exact floor-tool-lies-quietly failure this repo exists to kill). Returns {model, effort}, or undefined + RED.
function resolveStage(stages, stage) {
  const entry = Object.hasOwn(stages, stage) ? stages[stage] : stages.default;
  if (!entry) {
    red("resolve", `stage ${JSON.stringify(stage)} has no entry and no \`default\` fallback`);
    return undefined;
  }
  return { model: entry.model, effort: entry.effort };
}

// Parse a command file's frontmatter `model:`/`effort:` — mirrors count-grillers.mjs `frontmatterRole`
// (the same `---` fence + `^([A-Za-z0-9_]+):\s*(.*)$` line parse + quote-strip), so `model_tier:` (a
// different key) is never mistaken for `model:`. Not an import — those files export nothing (P4: cite).
function frontmatterModelEffort(text) {
  if (!text.startsWith("---")) return {};
  const end = text.indexOf("\n---", 3);
  if (end === -1) return {};
  const raw = text.slice(3, end).trim();
  const out = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    if (m[1] === "model") out.model = m[2].trim().replace(/^["']|["']$/g, "");
    else if (m[1] === "effort") out.effort = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

// --- validate mode: config shape + enums only. ---
function doValidate(configPath) {
  const cfg = readConfig(configPath);
  if (reds.length) return fail();
  const stages = stagesOf(cfg);
  if (reds.length) return fail();
  validateStages(stages);
  if (reds.length) return fail();
  console.log(`GREEN — config valid; ${Object.keys(stages).length} stage(s); default present; every model/effort in enum`);
  return 0;
}

// --- resolve mode: print the resolved {model, effort} for a stage. ---
function doResolve(configPath, stage) {
  if (!stage) {
    console.log("RED — usage: node .dev/floor/check-config.mjs resolve <stage> [--config <path>]");
    return 1;
  }
  const cfg = readConfig(configPath);
  if (reds.length) return fail();
  const stages = stagesOf(cfg);
  if (reds.length) return fail();
  validateStages(stages);
  if (reds.length) return fail();
  const r = resolveStage(stages, stage);
  if (!r) return fail();
  process.stdout.write(JSON.stringify(r) + "\n");
  return 0;
}

// --- agreement mode: validate + BIDIRECTIONAL config↔command-frontmatter consistency. ---
function doAgreement(configPath, commandsDir) {
  const cfg = readConfig(configPath);
  if (reds.length) return fail();
  const stages = stagesOf(cfg);
  if (reds.length) return fail();
  validateStages(stages);
  if (reds.length) return fail();

  // Forward pass (config → command): each DEV_WIRED stage's command frontmatter EQUALS its resolved value.
  // Iterating DEV_WIRED (not the config keys) is what lets `models.stages` also carry the product-only
  // stages `pharn/floor/check-model-config.mjs` governs without REDding a correct repo here.
  const checked = [];
  for (const name of DEV_WIRED) {
    const cmdPath = join(commandsDir, `pharn-dev-${name}.md`);
    let text;
    try {
      text = readFileSync(cmdPath, "utf8");
    } catch (e) {
      red("agreement", `stage ${JSON.stringify(name)} → command file unreadable (${cmdPath}): ${e.message}`);
      continue;
    }
    const fm = frontmatterModelEffort(text);
    // A DEV_WIRED stage need NOT be an own key of `stages` — it may resolve through `default`, and then
    // the command's frontmatter must equal the DEFAULT. So this is the full own-property pick, not
    // `stages[name]`. (`default` is guaranteed present: validateStages REDs without it, above.)
    const want = resolveStage(stages, name);
    if (!want) continue;
    if (fm.model === undefined) red("agreement", `stage ${JSON.stringify(name)} → ${cmdPath} frontmatter has no \`model:\``);
    else if (fm.model !== want.model)
      red(
        "agreement",
        `stage ${JSON.stringify(name)} → ${cmdPath} model ${JSON.stringify(fm.model)} != config ${JSON.stringify(want.model)}`
      );
    if (fm.effort === undefined) red("agreement", `stage ${JSON.stringify(name)} → ${cmdPath} frontmatter has no \`effort:\``);
    else if (fm.effort !== want.effort)
      red(
        "agreement",
        `stage ${JSON.stringify(name)} → ${cmdPath} effort ${JSON.stringify(fm.effort)} != config ${JSON.stringify(want.effort)}`
      );
    checked.push(name);
  }

  // Reverse pass (command → config): a pharn-dev-*.md that CARRIES `model:`/`effort:` frontmatter MUST be
  // in DEV_WIRED — else a command silently gains a model/effort the forward pass (which walks DEV_WIRED)
  // cannot see. It is keyed on DEV_WIRED rather than on "has a config stage" because `models.stages` now
  // also carries the PRODUCT-only stages: keying on config membership would let `pharn-dev-grill.md` gain
  // a `model:` unnoticed the moment a `grill` key existed for the product surface.
  // Fail-closed: an unreadable commands dir is a loud RED, never a silent pass.
  // SAME frontmatter parser as the forward pass, so `model_tier:` (a different key) never counts.
  let dirEntries;
  try {
    dirEntries = readdirSync(commandsDir);
  } catch (e) {
    red("agreement", `commands dir unreadable (${commandsDir}): ${e.message}`);
    return fail();
  }
  const wired = new Set(DEV_WIRED);
  let devSeen = 0;
  for (const fileName of dirEntries) {
    const m = fileName.match(/^pharn-dev-(.+)\.md$/);
    if (!m) continue;
    devSeen++;
    const stage = m[1];
    if (wired.has(stage)) continue; // covered by the forward pass
    let text;
    try {
      text = readFileSync(join(commandsDir, fileName), "utf8");
    } catch {
      continue; // vanished mid-scan; the forward pass owns wired-stage presence
    }
    const fm = frontmatterModelEffort(text);
    if (fm.model !== undefined || fm.effort !== undefined)
      red(
        "agreement",
        `command ${JSON.stringify(fileName)} carries \`model:\`/\`effort:\` frontmatter but \`${stage}\` is not in DEV_WIRED {${DEV_WIRED.join(", ")}} (unwired-command drift)`
      );
  }

  // A walk that discovered ZERO dev commands has not passed — it has failed to look (lessons-learned
  // L34): every per-item assertion above is vacuously true over an empty set.
  if (devSeen === 0) red("agreement", `no pharn-dev-*.md found in ${commandsDir} — the walk found nothing to check`);

  if (reds.length) return fail();
  console.log(
    `GREEN — config valid; ${checked.length}/${DEV_WIRED.length} wired stage(s) [${checked.join(", ")}] agree with command frontmatter; ` +
      `${devSeen} pharn-dev-* command(s) scanned; no unwired command carries model:/effort: (bidirectional)`
  );
  return 0;
}

function getOpt(args, name, dflt) {
  const i = args.indexOf(name);
  return i === -1 ? dflt : args[i + 1];
}

function main() {
  const args = process.argv.slice(2);
  const configPath = getOpt(args, "--config", DEFAULT_CONFIG);
  const commandsDir = getOpt(args, "--commands-dir", DEFAULT_COMMANDS_DIR);
  const mode = args[0] && !args[0].startsWith("--") ? args[0] : "validate";
  if (mode === "validate") return doValidate(configPath);
  if (mode === "resolve") {
    const stage = args[1] && !args[1].startsWith("--") ? args[1] : undefined;
    return doResolve(configPath, stage);
  }
  if (mode === "agreement") return doAgreement(configPath, commandsDir);
  console.log(`RED — unknown mode ${JSON.stringify(mode)} (expected: validate | resolve <stage> | agreement)`);
  return 1;
}

process.exit(main());
