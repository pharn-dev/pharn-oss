#!/usr/bin/env node
// .dev/floor/stage-model-pairs.mjs — pair a variant arm's defect probe runs with the control arm's, and read the pairs
// (stage-model-tuning, CORE-112).
//
// WHAT IT ANSWERS. One axis changed between two kits built by defect-probe-kit.mjs (a stage's model or effort). For
// each probe the i-th variant run pairs with the i-th control run; each run is scored by defect-probe-score.mjs
// `scoreRun` (the catch), and each of its sessions is read from the `<stage>.session.json` the kit's command wrote
// (`claude -p --output-format json`): minutes, USD, weighted units and the model it was served. The pair table then
// gets one reading from a closed set, computed by a fixed first-match rule (P5):
//
//   1. cannot-decide     arm-not-applied        a complete pair holds a session served outside its expected family
//   2. cannot-decide     fewer-than-six-pairs   fewer than 6 complete pairs (the 2026-09-29 audit's E1 floor)
//   3. cannot-decide     control-caught-none    the control caught nothing in the complete pairs: "no catch was lost"
//                                               would hold over an empty set (L34)
//   4. does-not-support  catch-lost             a complete pair whose control caught and whose variant did not
//   5. does-not-support  no-saving              the variant's chain USD is not below the control's
//   6. supports-change   no-visible-regression-and-saving
//
// `supports-change` means "in these pairs, no catch was lost and the chain cost less" — never "non-inferior", never a
// significance test (one loss is decisive by construction), and never a decision to change a shipped default.
//
// THE SESSION FILE (L67: an external tool's output, modelled from its documented shape as of Claude Code 2.1.323).
// Read: `duration_ms`, `total_cost_usd`, and `modelUsage` — one entry per model, each with `inputTokens`,
// `outputTokens`, `cacheReadInputTokens`, `cacheCreationInputTokens`. Weighted units are the 2026-11-11 baseline's
// formula `input + 1.25·cache_write_5m + 2·cache_write_1h + 0.1·cache_read + 5·output`; `modelUsage` does not split
// cache writes by TTL, so every write is weighted as a 5-minute write. The SERVED model is the `modelUsage` key with the
// most output tokens (ties: the first key in sorted order); it is in the expected family when it starts with
// `claude-<alias>-`. Served effort is recorded nowhere, so an effort arm's application is not checked here.
//
// TRUST (P2). Session and run files are tool and model output. Only numbers, the scorer's closed outcome, and model-id
// keys matching MODEL_RE are read; `result` and every other free-text field never are. The output names closed codes,
// probe ids, run directory names, `--control` positions, sha256s, checked numbers and checked model ids — no absolute
// path, no session id, no value that failed its check (L62).
//
// FLOOR (primitive #3, #2 for the sha256s): the pairing, each outcome (the scorer's), each session's validity, the
// served-family test, the sums and the reading. ADVISORY: that the runs ran as the kits wrote them, that USD is a true
// price (Claude Code computes it), that a probe catch predicts a real plan's, and anything the pairs imply beyond
// themselves.
//
// Usage:
//   node .dev/floor/stage-model-pairs.mjs pair --manifest <m> --manifest-sha256 <hex> --control <runs>... --variant <runs>
//        --probe <id>... [--expect-control <stage>=<alias>]... [--expect-variant <stage>=<alias>]...
//   node .dev/floor/stage-model-pairs.mjs session <file.session.json>
// Exit: pair 0 with a reading | session 0 valid · 1 missing or invalid | both 2 usage: a bad manifest or flag, no
// `--probe`, an unknown probe, or a probe whose control and variant run counts differ or are zero.
import "../../pharn/floor/runtime-floor.mjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_MODELS, STAGE_NAMES, STAGES_BY_KIND } from "./defect-probe-kit.mjs";
import { loadManifest, runDirs, scoreRun, sha256 } from "./defect-probe-score.mjs";

export const SCHEMA = "pharn-stage-model-pairs/1";
export const READINGS = Object.freeze(["supports-change", "does-not-support", "cannot-decide"]);
export const REASONS = Object.freeze([
  "arm-not-applied",
  "fewer-than-six-pairs",
  "control-caught-none",
  "catch-lost",
  "no-saving",
  "no-visible-regression-and-saving",
]);
export const SESSION_STATES = Object.freeze(["valid", "missing", "invalid"]);
export const ALIASES = Object.freeze(["opus", "sonnet", "haiku", "fable"]);
export const MIN_PAIRS = 6;
export const MODEL_RE = /^claude-[a-z0-9][a-z0-9.-]{0,62}$/;
const USAGE_KEYS = ["inputTokens", "outputTokens", "cacheReadInputTokens", "cacheCreationInputTokens"];

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isCount = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0;
const round = (v, places) => Math.round(v * 10 ** places) / 10 ** places;

/** Weighted units of one model's usage (every cache write weighted as a 5-minute write). */
export function weighted(u) {
  return u.inputTokens + 1.25 * u.cacheCreationInputTokens + 0.1 * u.cacheReadInputTokens + 5 * u.outputTokens;
}

/** The modelUsage key with the most output tokens; ties go to the first key in sorted order. */
export function dominantModel(modelUsage) {
  let best = null;
  for (const key of Object.keys(modelUsage).sort())
    if (best === null || modelUsage[key].outputTokens > modelUsage[best].outputTokens) best = key;
  return best;
}

/** One session file's bytes (or null) → {state: "valid", minutes, usd, weighted, model, models, sha256} | {state}. */
export function readSession(bytes) {
  if (bytes === null) return { state: "missing" };
  let doc;
  try {
    doc = JSON.parse(bytes.toString("utf8"));
  } catch {
    return { state: "invalid" };
  }
  if (!isObject(doc) || !isCount(doc.duration_ms) || !isCount(doc.total_cost_usd) || !isObject(doc.modelUsage)) return { state: "invalid" };
  const models = Object.keys(doc.modelUsage).sort();
  const usageOk = (k) => MODEL_RE.test(k) && isObject(doc.modelUsage[k]) && USAGE_KEYS.every((f) => isCount(doc.modelUsage[k][f]));
  if (models.length === 0 || !models.every(usageOk)) return { state: "invalid" };
  return {
    state: "valid",
    minutes: doc.duration_ms / 60000,
    usd: doc.total_cost_usd,
    weighted: models.reduce((s, k) => s + weighted(doc.modelUsage[k]), 0),
    model: dominantModel(doc.modelUsage),
    models,
    sha256: sha256(bytes),
  };
}

function readOrNull(path) {
  try {
    return readFileSync(path);
  } catch {
    return null;
  }
}

/** Score one run directory: the catch, and every stage session the probe's kind runs. */
function readRun(probe, dir, expect) {
  const files = { findings: readOrNull(join(dir, "grill-findings.json")), triage: readOrNull(join(dir, "grill-triage.json")) };
  files.plan = probe.plan_tokens.length > 0 ? readOrNull(join(dir, "PLAN.md")) : null;
  const s = scoreRun(probe, files);
  const sessions = {};
  for (const stage of STAGES_BY_KIND[probe.kind]) {
    const ses = readSession(readOrNull(join(dir, `${stage}.session.json`)));
    sessions[stage] = ses.state === "valid" ? { ...ses, served_expected: ses.model.startsWith(`claude-${expect[stage]}-`) } : ses;
  }
  const valid = Object.values(sessions).every((x) => x.state === "valid");
  return { outcome: s.outcome, caught: s.caught, complete: valid, sessions };
}

/** Sum USD, weighted units and minutes over the given runs: chain totals and per stage. */
function totals(runs) {
  const t = { usd: 0, weighted: 0, minutes: 0, per_stage: {} };
  for (const r of runs)
    for (const [stage, x] of Object.entries(r.sessions)) {
      const p = (t.per_stage[stage] ??= { usd: 0, weighted: 0, minutes: 0 });
      for (const k of ["usd", "weighted", "minutes"]) {
        p[k] += x[k];
        t[k] += x[k];
      }
    }
  const fix = (o) => ({ ...o, usd: round(o.usd, 4), weighted: round(o.weighted, 1), minutes: round(o.minutes, 2) });
  return { ...fix(t), per_stage: Object.fromEntries(Object.entries(t.per_stage).map(([k, v]) => [k, fix(v)])) };
}

/** The reading over the complete pairs, by the header's first-match rule. Returns {reading, reason}. */
export function decide(complete) {
  const r = (reading, reason) => ({ reading, reason });
  const all = complete.flatMap((p) => [p.control, p.variant]);
  if (all.some((side) => Object.values(side.sessions).some((x) => !x.served_expected))) return r("cannot-decide", "arm-not-applied");
  if (complete.length < MIN_PAIRS) return r("cannot-decide", "fewer-than-six-pairs");
  if (!complete.some((p) => p.control.caught)) return r("cannot-decide", "control-caught-none");
  if (complete.some((p) => p.control.caught && !p.variant.caught)) return r("does-not-support", "catch-lost");
  const usd = (side) => complete.reduce((s, p) => s + Object.values(p[side].sessions).reduce((a, x) => a + x.usd, 0), 0);
  if (!(usd("variant") < usd("control"))) return r("does-not-support", "no-saving");
  return r("supports-change", "no-visible-regression-and-saving");
}

/** Pair the runs. Returns {ok: true, doc} or {ok: false, error}. */
export function pair(manifest, sha, o) {
  const pairs = [];
  for (const id of o.probes) {
    const probe = manifest.probes.find((p) => p.id === id);
    const control = o.control.flatMap((dir, source) => runDirs(dir, id).map((run) => ({ source, run, dir: join(dir, id, run) })));
    const variant = runDirs(o.variant, id).map((run) => ({ run, dir: join(o.variant, id, run) }));
    if (control.length === 0 || control.length !== variant.length)
      return { ok: false, error: `probe ${id} has ${control.length} control and ${variant.length} variant runs` };
    variant.forEach((v, i) => {
      const c = control[i];
      const cr = readRun(probe, c.dir, o.expectControl);
      const vr = readRun(probe, v.dir, o.expectVariant);
      pairs.push({
        probe: id,
        control: { source: c.source, run: c.run, ...cr },
        variant: { run: v.run, ...vr },
        complete: cr.complete && vr.complete,
      });
    });
  }
  const complete = pairs.filter((p) => p.complete);
  const side = (k) => totals(complete.map((p) => p[k]));
  const summary = {
    pairs: pairs.length,
    complete: complete.length,
    incomplete_control: pairs.filter((p) => !p.control.complete).length,
    incomplete_variant: pairs.filter((p) => !p.variant.complete).length,
    control_caught: complete.filter((p) => p.control.caught).length,
    variant_caught: complete.filter((p) => p.variant.caught).length,
    catch_lost: complete.filter((p) => p.control.caught && !p.variant.caught).length,
    catch_gained: complete.filter((p) => !p.control.caught && p.variant.caught).length,
    control: side("control"),
    variant: side("variant"),
  };
  return {
    ok: true,
    doc: {
      schema: SCHEMA,
      manifest_sha256: sha,
      expect: { control: o.expectControl, variant: o.expectVariant },
      ...decide(complete),
      summary,
      pairs,
    },
  };
}

const USAGE =
  "usage: stage-model-pairs.mjs pair --manifest <m> --manifest-sha256 <hex> --control <runs>... --variant <runs> --probe <id>...\n" +
  "       [--expect-control <stage>=<alias>]... [--expect-variant <stage>=<alias>]...\n" +
  "       stage-model-pairs.mjs session <file.session.json>";
const SINGLE = ["--manifest", "--manifest-sha256", "--variant"];
const MULTI = ["--control", "--probe", "--expect-control", "--expect-variant"];

/** argv after `pair` → options, or {error}. */
export function parseArgs(argv) {
  const o = { control: [], probes: [], expectControl: { ...DEFAULT_MODELS }, expectVariant: { ...DEFAULT_MODELS } };
  const seen = new Set();
  for (let i = 0; i < argv.length; i += 2) {
    const [name, value] = [argv[i], argv[i + 1]];
    if (!SINGLE.includes(name) && !MULTI.includes(name)) return { error: "unknown argument" };
    if (value === undefined) return { error: `${name} needs a value` };
    if (SINGLE.includes(name) && seen.has(name)) return { error: `${name} given twice` };
    seen.add(name);
    if (name === "--control") o.control.push(value);
    else if (name === "--probe") o.probes.push(value);
    else if (name === "--expect-control" || name === "--expect-variant") {
      const m = /^([a-z]+)=([a-z]+)$/.exec(value);
      if (!m || !STAGE_NAMES.includes(m[1]) || !ALIASES.includes(m[2]))
        return { error: `${name} takes <stage>=<alias>, stage one of ${STAGE_NAMES.join(", ")}, alias one of ${ALIASES.join(", ")}` };
      (name === "--expect-control" ? o.expectControl : o.expectVariant)[m[1]] = m[2];
    } else o[name === "--variant" ? "variant" : name === "--manifest" ? "manifest" : "sha"] = value;
  }
  if (!o.manifest || !o.sha || !o.variant || o.control.length === 0)
    return { error: "--manifest, --manifest-sha256, --control and --variant are required" };
  if (o.probes.length === 0) return { error: "at least one --probe is required" };
  // A probe named twice would pair its runs twice and could lift the pair count past MIN_PAIRS on its own.
  if (new Set(o.probes).size !== o.probes.length) return { error: "a --probe is given twice" };
  return o;
}

/** Run one CLI invocation. Returns {code, out, err}. */
export function run(argv) {
  const usage = (msg) => ({ code: 2, out: "", err: `${msg}\n${USAGE}\n` });
  const [cmd, ...rest] = argv;
  if (cmd === "session") {
    if (rest.length !== 1) return usage("session takes one file");
    const s = readSession(readOrNull(rest[0]));
    return { code: s.state === "valid" ? 0 : 1, out: `${JSON.stringify(s)}\n`, err: "" };
  }
  if (cmd !== "pair") return usage("unknown or missing subcommand");
  const o = parseArgs(rest);
  if (o.error) return usage(o.error);
  const m = loadManifest({ "--manifest": [o.manifest], "--manifest-sha256": [o.sha] });
  if (m.error) return usage(m.error);
  if (o.probes.some((id) => !m.manifest.probes.some((p) => p.id === id))) return usage("--probe names no probe in the manifest");
  const p = pair(m.manifest, m.sha, o);
  if (!p.ok) return usage(p.error);
  return { code: 0, out: `${JSON.stringify(p.doc, null, 2)}\n`, err: "" };
}

if (import.meta.main) {
  const r = run(process.argv.slice(2));
  process.stdout.write(r.out);
  process.stderr.write(r.err);
  process.exitCode = r.code;
}
