#!/usr/bin/env node
// pharn/floor/check-model-config.mjs — the deterministic PRODUCT-surface model/effort configuration
// checker: `pharn.config.json`'s `models.stages` block VALIDATED, RESOLVED per stage, and held in
// EQUALITY with the ten `/pharn-*` product commands' platform `model:` / `effort:` frontmatter.
//
// ── THE MECHANISM, read live rather than assumed (P6) ────────────────────────────────────────────────
// Claude Code selects a command's model through STATIC FRONTMATTER and nothing else. `model:` accepts
// the `/model` values (`sonnet` | `opus` | `haiku` | `fable` | a full `claude-*` id | `inherit`) and
// `effort:` accepts `low` | `medium` | `high` | `xhigh` | `max`. There is NO runtime routing hook: no
// command can read a JSON file and switch its own model, and nothing in this repo reads
// `pharn.config.json` at run time. So `models.stages` cannot BE the runtime control — it can only be the
// SOURCE OF TRUTH the static frontmatter is held to, which is what this checker enforces. Simulating
// runtime routing (a command "consulting" the config in prose) would be the exact P0 disease: written in
// the config, therefore believed guaranteed.
//
// ── Floor primitives (ARCHITECTURE §2) ───────────────────────────────────────────────────────────────
// #3 (enum / regex / presence) throughout: every `model` is bounded to the Claude model namespace (the
// closed alias set ∪ `inherit` ∪ an OPEN `claude-*` id regex — a NAMESPACE bound, NOT a closed
// allowlist: a non-real `claude-*` id validates), every `effort` ∈ the five-level enum, a `default` entry
// is present, resolution is the OWN-PROPERTY membership pick, and agreement is a deterministic EQUALITY
// between two repo files (the same drift-detection class as a content-hash, #2).
// NON-LLM, dependency-free (Node stdlib only). No network, no child_process, no eval, no dynamic import.
//
// ── Honest scope (P0) — what GREEN does and does NOT buy ─────────────────────────────────────────────
// FLOOR: the config is shape/enum-valid; a stage resolves deterministically; and each of the ten product
//   commands' static `model:` / `effort:` frontmatter EQUALS its config-resolved value, in both
//   directions (no product command carries model/effort outside the map, no mapped command is missing).
// NOT guaranteed — and these are real holes, not formalities:
//   • THE STAGE IS NOT PROVEN TO HAVE RUN UNDER THAT MODEL. Model and effort are applied by the Claude
//     Code platform, invisible to any hook, hash or enum. "check-model-config GREEN" must NEVER read as
//     "/pharn-plan ran on opus". That conflation is what this repo exists to prevent.
//   • TURN SCOPE. The platform states the override "applies for the rest of the current turn". So it
//     takes effect when a human invokes the stage command DIRECTLY (`/pharn-plan`). A stage invoked as a
//     STEP INSIDE `/pharn-ship` or `/pharn-loop` runs inside the ORCHESTRATOR's turn — those stages do
//     NOT get per-stage routing, and this checker cannot see the difference.
//   • PLATFORM VETO. A value excluded by an organization's `availableModels` allowlist is not used, and
//     in auto mode a model auto mode does not support is not used; the session silently keeps its
//     current model. A GREEN here says nothing about either.
//   • FRESH-INSTALL POSTURE. A target with no `pharn.config.json`, or a config with no `models.stages`,
//     is GREEN BY DESIGN (the `check-lessons-index` NO_CANON / COLD precedent: the honest normal state of
//     an install that does not use the block). The consequence is stated rather than hidden — a user who
//     DELETES the block loses this check rather than failing it.
//   • `model_tier:` IS A DIFFERENT FIELD and is deliberately untouched. It is PHARN's own capability
//     frontmatter (ARCHITECTURE §3.1), inert to the platform. The frontmatter parser below matches the
//     key EXACTLY, so `model_tier:` can never be read as `model:`; and nothing here requires the two to
//     agree, because they answer different questions.
//
// ── Relationship to `.dev/floor/check-config.mjs` (L31) ──────────────────────────────────────────────
// That is the DEV-apparatus checker over the `pharn-dev-*` commands. This is NOT its copy-pair twin —
// unlike `check-provenance.mjs` / `lessons-index-core.mjs`, whose two copies are deliberate duplicates
// pinned to agree. The two files share an idea and almost no substance: a different stage→command map, a
// different filename prefix, a closed product enumeration where the dev side has a closed WIRED subset,
// and a different fresh-install posture (this one is GREEN with no config; that one is RED). The
// DISTINCT BASENAME is the signal — a reader must not go looking for a shared-constant obligation set
// that does not exist here.
//
// ── Trust (P2) ───────────────────────────────────────────────────────────────────────────────────────
// `pharn.config.json` and command frontmatter are repo-local, human-authored DATA — parsed as JSON /
// YAML frontmatter, NEVER executed. The verdict ranges ONLY over enum-gated fields (model ∈ the bounded
// namespace, effort ∈ enum, resolved == frontmatter) and rejects any non-member; a poisoned config can at
// most select a DIFFERENT namespace-valid model/effort (a bounded, advisory blast radius), never inject
// an instruction. No guaranteed decision rests on any free-text field (mirrors fix #1).
//
// Usage:
//   node pharn/floor/check-model-config.mjs [validate] [--config <path>]
//        validate config shape + enums, and that every stage key is a member of the product stage set
//   node pharn/floor/check-model-config.mjs resolve <stage> [--config <path>]
//        print {"model":..,"effort":..} for <stage>, via the own-property pick with a `default` fallback
//   node pharn/floor/check-model-config.mjs agreement [--config <path>] [--commands-dir <dir>]
//        validate + BIDIRECTIONAL config↔frontmatter agreement over the ten product commands
//
// Exit: 1 on any RED / unreadable / malformed; 0 otherwise (including the two GREEN-by-design
// no-configuration states).

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// ── The enumeration IS the deliverable (L29 / L36) ───────────────────────────────────────────────────
// The closed stage → product-command map. Every pass below iterates THIS object; no pass re-derives the
// set by pattern, and no pass asserts over whichever member its author happened to have in front of them.
// `default` is deliberately ABSENT: it is the resolution fallback, never a command.
const PRODUCT_STAGES = {
  spec: "pharn-spec.md",
  plan: "pharn-plan.md",
  grill: "pharn-grill.md",
  build: "pharn-build.md",
  regress: "pharn-regress.md",
  verify: "pharn-verify.md",
  ship: "pharn-ship.md",
  loop: "pharn-loop.md",
  review: "pharn-review.md",
  "memory-promote": "pharn-memory-promote.md",
};

// Enums — every branch is a presence / enum / equality membership test (P5); the terminal fallback on any
// non-member is a loud RED, never a guess. These mirror the Claude Code command-frontmatter surface.
const MODEL_ALIASES = ["sonnet", "opus", "haiku", "fable", "inherit"];
const MODEL_ID_RE = /^claude-[a-z0-9][a-z0-9-]*$/; // a full model id, e.g. claude-opus-4-8
const EFFORT_ENUM = ["low", "medium", "high", "xhigh", "max"];
const DEFAULT_CONFIG = "pharn.config.json";
const DEFAULT_COMMANDS_DIR = join(".claude", "commands");

// A product command file is `pharn-<something>.md` that is NOT `pharn-dev-*` — the product/dev boundary
// is the NAME PREFIX (CLAUDE.md, "Command-naming convention"), because `.claude/commands/` cannot nest.
const PRODUCT_CMD_RE = /^pharn-(?!dev-)(.+)\.md$/;

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
  console.log(`\nRED — ${reds.length} model-config check(s) failed`);
  return 1;
}

// Read + JSON-parse the config. Returns {state, cfg}: `no-config` when the file is absent (a distinct,
// GREEN-by-design state, NOT an error), `error` on any other failure (fail-closed), else `ok`.
function readConfig(path) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch (e) {
    if (e && e.code === "ENOENT") return { state: "no-config" };
    red("input", `config unreadable (${path}): ${e.message}`);
    return { state: "error" };
  }
  let cfg;
  try {
    cfg = JSON.parse(text);
  } catch (e) {
    red("json", `config is not valid JSON (${path}): ${e.message}`);
    return { state: "error" };
  }
  // A parseable non-OBJECT (`null`, `[]`, `"hello"`, `123`) must NOT reach `stagesOf` — there, a missing
  // `.models` is the GREEN-by-design "no block" state, so a scalar config would read as "the block is
  // simply absent" and pass. A file that exists but is not a config object is a loud RED (fail-closed).
  if (cfg === null || typeof cfg !== "object" || Array.isArray(cfg)) {
    red(
      "shape",
      `config is valid JSON but is not an object (${path}): got ${Array.isArray(cfg) ? "array" : cfg === null ? "null" : typeof cfg}`
    );
    return { state: "error" };
  }
  return { state: "ok", cfg };
}

// The `models.stages` map. A config with NO `models` / no `stages` is `no-stages` (GREEN by design — the
// block is optional); a `stages` that is present but is not a plain object is a loud RED (fail-closed).
// `cfg` is guaranteed a plain object here — readConfig REDs on anything else.
function stagesOf(cfg) {
  const models = cfg.models;
  if (models === undefined || models === null) return { state: "no-stages" };
  if (typeof models !== "object" || Array.isArray(models)) {
    red("shape", "`models` is present but is not an object");
    return { state: "error" };
  }
  const stages = models.stages;
  if (stages === undefined || stages === null) return { state: "no-stages" };
  if (typeof stages !== "object" || Array.isArray(stages)) {
    red("shape", "`models.stages` is present but is not an object");
    return { state: "error" };
  }
  return { state: "ok", stages };
}

// Validate every stage entry's shape + enums, and that every key is a PRODUCT stage (or `default`).
// An off-map key is a RED rather than a silent skip: on the product surface it governs nothing, so a
// typo (`bulid`) would otherwise sit in the config looking like a control while controlling nothing.
function validateStages(stages) {
  if (!Object.hasOwn(stages, "default")) {
    red("default", "missing required `default` stage entry (the resolution fallback)");
  }
  for (const [name, entry] of Object.entries(stages)) {
    if (name !== "default" && !Object.hasOwn(PRODUCT_STAGES, name)) {
      red(
        "stage",
        `stage ${JSON.stringify(name)} is not a product stage — expected one of {${Object.keys(PRODUCT_STAGES).join(", ")}} or "default"`
      );
      continue;
    }
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      red("entry", `stage ${JSON.stringify(name)} is not an object with {model, effort}`);
      continue;
    }
    if (!Object.hasOwn(entry, "model")) red("model", `stage ${JSON.stringify(name)} missing \`model\``);
    else if (!isValidModel(entry.model))
      red(
        "model",
        `stage ${JSON.stringify(name)} model ${JSON.stringify(entry.model)} is not an alias {${MODEL_ALIASES.join(", ")}} nor a claude-* id`
      );
    if (!Object.hasOwn(entry, "effort")) red("effort", `stage ${JSON.stringify(name)} missing \`effort\``);
    else if (!isValidEffort(entry.effort))
      red("effort", `stage ${JSON.stringify(name)} effort ${JSON.stringify(entry.effort)} not in {${EFFORT_ENUM.join(", ")}}`);
  }
}

// resolve: `Object.hasOwn(stages, stage) ? stages[stage] : stages.default` — an OWN-PROPERTY membership
// test (P5, lessons-learned L15). An INHERITED member (toString / constructor / __proto__ /
// hasOwnProperty / valueOf) is truthy but is NOT a configured stage, so `||` / `??` would leak it and
// return {model: undefined, effort: undefined} → a silent `{}` at exit 0, which is the floor-tool-lies-
// quietly failure this repo exists to kill. Returns {model, effort}, or undefined + a RED.
function resolveStage(stages, stage) {
  const entry = Object.hasOwn(stages, stage) ? stages[stage] : stages.default;
  if (!entry) {
    red("resolve", `stage ${JSON.stringify(stage)} has no entry and no \`default\` fallback`);
    return undefined;
  }
  return { model: entry.model, effort: entry.effort };
}

// Parse a command file's frontmatter `model:` / `effort:`. Same `---` fence + `^([A-Za-z0-9_]+):\s*(.*)$`
// line parse + quote-strip as `count-grillers.mjs`'s `frontmatterRole` and `.dev/floor/check-config.mjs`
// — a STRUCTURED read of the structured location, never a substring grep (L6). The key match is EXACT,
// which is what keeps `model_tier:` from ever being read as `model:`.
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

// --- validate mode: config shape + enums + product-stage membership. ---
function doValidate(configPath) {
  const c = readConfig(configPath);
  if (c.state === "error") return fail();
  if (c.state === "no-config") {
    console.log(`GREEN — no ${configPath}; nothing declares a per-stage model (GREEN by design: an install need not use the block)`);
    return 0;
  }
  const s = stagesOf(c.cfg);
  if (s.state === "error") return fail();
  if (s.state === "no-stages") {
    console.log(`GREEN — ${configPath} has no \`models.stages\`; nothing declares a per-stage model (GREEN by design)`);
    return 0;
  }
  validateStages(s.stages);
  if (reds.length) return fail();
  console.log(
    `GREEN — config valid; ${Object.keys(s.stages).length} stage(s); default present; every stage a product stage; every model/effort in enum`
  );
  return 0;
}

// --- resolve mode: print the resolved {model, effort} for a stage. ---
function doResolve(configPath, stage) {
  if (!stage) {
    console.log("RED — usage: node pharn/floor/check-model-config.mjs resolve <stage> [--config <path>]");
    return 1;
  }
  const c = readConfig(configPath);
  if (c.state === "error") return fail();
  if (c.state === "no-config") {
    red("resolve", `no ${configPath} — a stage cannot be resolved without one`);
    return fail();
  }
  const s = stagesOf(c.cfg);
  if (s.state === "error") return fail();
  if (s.state === "no-stages") {
    red("resolve", `${configPath} has no \`models.stages\` — a stage cannot be resolved without one`);
    return fail();
  }
  validateStages(s.stages);
  if (reds.length) return fail();
  const r = resolveStage(s.stages, stage);
  if (!r) return fail();
  process.stdout.write(JSON.stringify(r) + "\n");
  return 0;
}

// --- agreement mode: validate + BIDIRECTIONAL config↔product-command-frontmatter consistency. ---
function doAgreement(configPath, commandsDir) {
  const c = readConfig(configPath);
  if (c.state === "error") return fail();
  if (c.state === "no-config") {
    console.log(`GREEN — no ${configPath}; no config to hold the product commands to (GREEN by design)`);
    return 0;
  }
  const s = stagesOf(c.cfg);
  if (s.state === "error") return fail();
  if (s.state === "no-stages") {
    console.log(`GREEN — ${configPath} has no \`models.stages\`; no config to hold the product commands to (GREEN by design)`);
    return 0;
  }
  validateStages(s.stages);
  if (reds.length) return fail();
  const stages = s.stages;

  // Forward pass (config → command), over the CLOSED product enumeration — every stage, whether it has
  // its own config entry or resolves through `default`. That is what makes the config the source of
  // truth for all ten rather than only for the keys someone remembered to write down.
  const checked = [];
  for (const [stage, fileName] of Object.entries(PRODUCT_STAGES)) {
    const cmdPath = join(commandsDir, fileName);
    let text;
    try {
      text = readFileSync(cmdPath, "utf8");
    } catch (e) {
      red("agreement", `stage ${JSON.stringify(stage)} → command file unreadable (${cmdPath}): ${e.message}`);
      continue;
    }
    const fm = frontmatterModelEffort(text);
    const want = resolveStage(stages, stage);
    if (!want) continue;
    const via = Object.hasOwn(stages, stage) ? "own entry" : "default";
    if (fm.model === undefined) red("agreement", `stage ${JSON.stringify(stage)} → ${cmdPath} frontmatter has no \`model:\``);
    else if (fm.model !== want.model)
      red(
        "agreement",
        `stage ${JSON.stringify(stage)} → ${cmdPath} model ${JSON.stringify(fm.model)} != config ${JSON.stringify(want.model)} (via ${via})`
      );
    if (fm.effort === undefined) red("agreement", `stage ${JSON.stringify(stage)} → ${cmdPath} frontmatter has no \`effort:\``);
    else if (fm.effort !== want.effort)
      red(
        "agreement",
        `stage ${JSON.stringify(stage)} → ${cmdPath} effort ${JSON.stringify(fm.effort)} != config ${JSON.stringify(want.effort)} (via ${via})`
      );
    checked.push(stage);
  }

  // Reverse pass (command → config): a PRODUCT command that CARRIES `model:` / `effort:` but is NOT in
  // the map would silently gain a model/effort the config never governs — invisible to the forward pass,
  // which only walks the map. This is what CLOSES the enumeration rather than merely asserting presence
  // over its members (L36). `pharn-dev-*` is excluded by the name regex: it is the other surface, owned
  // by `.dev/floor/check-config.mjs`. Fail-closed: an unreadable commands dir is a loud RED.
  let dirEntries;
  try {
    dirEntries = readdirSync(commandsDir);
  } catch (e) {
    red("agreement", `commands dir unreadable (${commandsDir}): ${e.message}`);
    return fail();
  }
  let productSeen = 0;
  for (const fileName of dirEntries) {
    const m = fileName.match(PRODUCT_CMD_RE);
    if (!m) continue;
    productSeen++;
    if (Object.hasOwn(PRODUCT_STAGES, m[1])) continue; // covered by the forward pass
    let text;
    try {
      text = readFileSync(join(commandsDir, fileName), "utf8");
    } catch {
      continue; // vanished mid-scan; the forward pass owns mapped-command presence
    }
    const fm = frontmatterModelEffort(text);
    if (fm.model !== undefined || fm.effort !== undefined)
      red(
        "agreement",
        `command ${JSON.stringify(fileName)} carries \`model:\`/\`effort:\` frontmatter but is not a mapped product stage (unmapped-command drift)`
      );
  }

  // A walk that discovered ZERO product commands has not passed — it has failed to look (L34). Every
  // per-item assertion above is vacuously true over an empty set, so the emptiness is checked directly.
  if (productSeen === 0)
    red("agreement", `no product command (pharn-*.md, excluding pharn-dev-*) found in ${commandsDir} — the walk found nothing to check`);

  if (reds.length) return fail();
  console.log(
    `GREEN — config valid; ${checked.length}/${Object.keys(PRODUCT_STAGES).length} product stage(s) agree with command frontmatter; ` +
      `${productSeen} product command(s) scanned; none unmapped carries model:/effort: (bidirectional). ` +
      `NOTE (P0): this is config↔frontmatter EQUALITY — never proof a stage RAN under that model.`
  );
  return 0;
}

// Read `--name <value>`. A flag given with NO value (trailing, or immediately followed by another flag)
// is `null` — a distinct third state from "absent" (use the default), so main() can refuse it by name
// instead of letting `undefined` reach readFileSync and surface as a confusing TypeError.
function getOpt(args, name, dflt) {
  const i = args.indexOf(name);
  if (i === -1) return dflt;
  const v = args[i + 1];
  return v === undefined || v.startsWith("--") ? null : v;
}

function main() {
  const args = process.argv.slice(2);
  const configPath = getOpt(args, "--config", DEFAULT_CONFIG);
  const commandsDir = getOpt(args, "--commands-dir", DEFAULT_COMMANDS_DIR);
  for (const [flag, val] of [
    ["--config", configPath],
    ["--commands-dir", commandsDir],
  ]) {
    if (val === null) {
      console.log(`RED — ${flag} was given with no value`);
      return 1;
    }
  }
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
