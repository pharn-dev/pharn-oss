#!/usr/bin/env node
// .dev/floor/defect-probe-score.mjs — score live grill + triage runs against the fixed defect probe set (CORE-90).
//
// WHAT IT MEASURES. `.dev/probes/defect-probes/manifest.json` lists probes, each a fixed PLAN or SPEC with ONE planted
// defect, the sha256 of every input, and ANCHORS: where a finding about the planted defect is expected to point. A
// run is one headless chain over one probe (`.dev/floor/defect-probe-kit.mjs` builds them); it leaves
// `grill-findings.json` and `grill-triage.json`, and for a SPEC probe the run's own `PLAN.md`. A run CATCHES its probe
// iff the findings file passes grill-findings-core.mjs `validate`, the triage file passes grill-triage-core.mjs
// `checkTriage` against those findings' bytes, and at least one finding MATCHES an anchor and is triaged anything but
// `proceed`. An arm's catch count is the number of caught runs; the per-probe pairs are always printed beside it.
//
// WHY PER FINDING (the ticket's AC 3). Five real, unplanted plans all escalated with 7–10 findings each
// (.dev/features/loop-grill-triage/TRIAGE-CHECK-MEASUREMENT.md), so a verdict-level score cannot tell a caught defect
// from noise. The match is per finding, on the finding's `file` only.
//
// THE MATCH (deterministic, P5). A finding's `file` is `path:line`. Its path matches `pharn/features/<feature>/<file>`
// when the two are equal or one is the other's suffix on a whole path segment (`PLAN.md`, the full relative path, and
// an absolute path ending in it all match; `XPLAN.md` does not). A LINE ANCHOR matches when the line is in
// [start - slack, end + slack]. A PLAN TOKEN (SPEC probes only) matches a finding citing the run's `PLAN.md` at a line
// holding the token as a whole word: the product grill is told to cite `PLAN.md:<line>` in every finding, so a SPEC
// defect is usually cited where the generated plan carries the criterion, and only the run's own plan can say where
// that is. A SPEC probe therefore reads a third file, its run's `PLAN.md`; a PLAN probe reads the two JSON files alone.
//
// TRUST (P2). Run files are another model's output. Only enum-gated / path-checked fields are read (`file`, `id`,
// `severity` via checkTriage, `disposition`); `problem` and `evidence` are never read. The PLAN text is scanned for
// fixed tokens and never interpreted. Output names closed codes, finding ids (already shaped `G<round>-<n>` by
// `validate`), paths this tool built, and sha256s — never a value read from a run file (L62).
//
// FLOOR (primitive #3, and #2 for the hashes): the manifest's closed shape; the sha256 of every input, of the fixture
// tree and of the manifest itself (`--manifest-sha256`); the match; the outcome; the count; `--min`.
// ADVISORY: that a matched finding IS the planted defect (it may cite the line for another reason — the group
// chance-match control bounds this for probes that share line geometry); that the runs ran as the kit wrote them;
// that a count with two runs per probe says anything beyond those runs.
//
// Usage:
//   node .dev/floor/defect-probe-score.mjs verify --manifest <m> [--manifest-sha256 <hex>]
//   node .dev/floor/defect-probe-score.mjs score  --manifest <m> --probe <id> --findings <f> --triage <t> [--plan <p>]
//                                                 [--plan-session <s>] [--manifest-sha256 <hex>]
//   node .dev/floor/defect-probe-score.mjs tally  --manifest <m> --runs <dir> [--probe <id>]… [--min <n>]
//                                                 [--manifest-sha256 <hex>]
// Exit: verify 0 every hash matches · 1 a mismatch | score 0 caught or caught-at-plan · 1 anything else | tally 0 ·
// 1 the catch count (caught + caught-at-plan) is below --min | all: 2 usage, an unreadable or malformed manifest, a manifest sha256 other than --manifest-sha256, an unknown
// probe, or (tally) a selected probe with no run directory.
import "../../pharn/floor/runtime-floor.mjs";
import { createHash } from "node:crypto";
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { validate as validateFindings } from "../../pharn/floor/grill-findings-core.mjs";
import { checkTriage } from "../../pharn/floor/grill-triage-core.mjs";

export const SCHEMA = "pharn-defect-probes/1";
export const TALLY_SCHEMA = "pharn-defect-probes-tally/1";
export const TOP_KEYS = Object.freeze(["schema", "fixture", "probes"]);
export const FIXTURE_KEYS = Object.freeze(["dir", "tree_sha256"]);
export const PROBE_KEYS = Object.freeze([
  "id",
  "kind",
  "feature",
  "class",
  "group",
  "defect",
  "inputs",
  "planted",
  "anchors",
  "plan_tokens",
  "expected_disposition",
]);
export const INPUT_KEYS = Object.freeze(["path", "as", "sha256"]);
export const PLANTED_KEYS = Object.freeze(["as", "start", "end"]);
export const ANCHOR_KEYS = Object.freeze(["file", "start", "end", "slack"]);
export const KINDS = Object.freeze(["plan", "spec"]);
export const DEFECTS = Object.freeze(["commission", "omission"]);
export const INPUT_NAMES = Object.freeze(["SPEC.md", "PLAN.md"]);
export const EXPECTED = Object.freeze(["replan", "spec"]);
export const SLACK_MAX = 5;

/**
 * Every outcome a run can have — closed (L36). Two are catches: `caught` (by the grill and triage) and `caught-at-plan`
 * (a SPEC probe whose plan stage stopped, citing an anchored SPEC line). `stopped-at-plan-unanchored` is neither a catch
 * nor a miss. Both plan outcomes read model free text (the plan session's `result`): ADVISORY, P0 — the floor part is
 * only the line-range overlap of a parsed citation with the probe's SPEC anchors.
 */
export const OUTCOMES = Object.freeze([
  "caught",
  "no-anchor-match",
  "matched-all-proceed",
  "findings-missing",
  "findings-invalid",
  "triage-missing",
  "triage-invalid",
  "caught-at-plan",
  "stopped-at-plan-unanchored",
]);

const SHA_RE = /^[0-9a-f]{64}$/;
const ID_RE = /^p[1-9]\d{0,2}$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TOKEN_RE = /^AC-[1-9]\d{0,3}$/;
const REL_RE = /^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/;

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const hasExactKeys = (o, keys) => Object.keys(o).length === keys.length && keys.every((k) => Object.hasOwn(o, k));
const isSlug = (v) => typeof v === "string" && v.length <= 64 && SLUG_RE.test(v);
const isRel = (v) => typeof v === "string" && v.length <= 200 && REL_RE.test(v) && v.split("/").every((s) => s !== "." && s !== "..");
const isLine = (v) => Number.isSafeInteger(v) && v >= 1;

function checkProbe(p, i, out) {
  const bad = (code) => out.push({ code, index: i });
  if (!isObject(p)) return bad("probe-not-an-object");
  if (!hasExactKeys(p, PROBE_KEYS)) return bad("probe-keys");
  if (typeof p.id !== "string" || !ID_RE.test(p.id)) bad("id");
  if (!KINDS.includes(p.kind)) bad("kind");
  if (!isSlug(p.feature)) bad("feature");
  if (!isSlug(p.class)) bad("class");
  if (p.group !== null && !isSlug(p.group)) bad("group");
  if (!DEFECTS.includes(p.defect)) bad("defect");
  if (!EXPECTED.includes(p.expected_disposition)) bad("expected_disposition");
  const inputs = Array.isArray(p.inputs) ? p.inputs : [];
  const inputsOk =
    inputs.length > 0 &&
    inputs.every((x) => isObject(x) && hasExactKeys(x, INPUT_KEYS) && isRel(x.path) && INPUT_NAMES.includes(x.as) && SHA_RE.test(x.sha256));
  const names = inputsOk ? inputs.map((x) => x.as).sort() : [];
  const namesOk = new Set(names).size === names.length && names.join() === (p.kind === "plan" ? "PLAN.md,SPEC.md" : "SPEC.md");
  if (!inputsOk || !namesOk) bad("inputs");
  const anchors = Array.isArray(p.anchors) ? p.anchors : null;
  const anchorsOk =
    anchors !== null &&
    anchors.every(
      (a) =>
        isObject(a) &&
        hasExactKeys(a, ANCHOR_KEYS) &&
        INPUT_NAMES.includes(a.file) &&
        isLine(a.start) &&
        isLine(a.end) &&
        a.start <= a.end &&
        Number.isSafeInteger(a.slack) &&
        a.slack >= 0 &&
        a.slack <= SLACK_MAX
    );
  if (!anchorsOk) bad("anchors");
  const tokens = Array.isArray(p.plan_tokens) ? p.plan_tokens : null;
  const tokensOk =
    tokens !== null && tokens.every((t) => typeof t === "string" && TOKEN_RE.test(t)) && new Set(tokens).size === tokens.length;
  if (!tokensOk || (p.kind === "plan" && tokens.length > 0)) bad("plan_tokens");
  // L34: a probe with nothing to match against would score every run a miss and read as a real result.
  if (anchorsOk && tokensOk && anchors.length + tokens.length === 0) bad("no-anchor");
  if (p.defect === "omission") {
    if (p.planted !== null) bad("planted");
  } else {
    const pl = p.planted;
    const plOk =
      isObject(pl) && hasExactKeys(pl, PLANTED_KEYS) && names.includes(pl.as) && isLine(pl.start) && isLine(pl.end) && pl.start <= pl.end;
    if (!plOk) bad("planted");
    // A commission probe's own planted range is one of its anchors: the manifest cannot plant one place and look at another.
    else if (anchorsOk && !anchors.some((a) => a.file === pl.as && a.start === pl.start && a.end === pl.end)) bad("planted-not-anchored");
  }
}

/** Validate a manifest's TEXT. Returns {ok: true, manifest} or {ok: false, defects: [{code[, index]}]}. */
export function validateManifest(text) {
  let doc;
  try {
    doc = JSON.parse(text);
  } catch {
    return { ok: false, defects: [{ code: "not-json" }] };
  }
  if (!isObject(doc)) return { ok: false, defects: [{ code: "not-an-object" }] };
  const out = [];
  if (!hasExactKeys(doc, TOP_KEYS)) out.push({ code: "top-keys" });
  if (doc.schema !== SCHEMA) out.push({ code: "schema" });
  const fx = doc.fixture;
  if (!(isObject(fx) && hasExactKeys(fx, FIXTURE_KEYS) && isRel(fx.dir) && SHA_RE.test(fx.tree_sha256))) out.push({ code: "fixture" });
  if (!Array.isArray(doc.probes) || doc.probes.length === 0) return { ok: false, defects: [...out, { code: "probes" }] };
  doc.probes.forEach((p, i) => checkProbe(p, i, out));
  const ids = doc.probes.map((p) => p?.id);
  if (new Set(ids).size !== ids.length) out.push({ code: "duplicate-id" });
  return out.length === 0 ? { ok: true, manifest: doc } : { ok: false, defects: out };
}

/** Every regular file under `dir`, as sorted `/`-separated relative paths. A symlink or other non-file entry throws. */
export function listFiles(dir, prefix = "") {
  const files = [];
  for (const name of readdirSync(join(dir, prefix)).sort()) {
    const rel = prefix === "" ? name : `${prefix}/${name}`;
    const st = lstatSync(join(dir, rel));
    if (st.isDirectory()) files.push(...listFiles(dir, rel));
    else if (st.isFile()) files.push(rel);
    else throw new Error(`not a regular file or directory: ${rel}`);
  }
  return files.sort();
}

/** sha256 over the lines `<sha256 of file>  <relative path>\n`, in sorted path order — the fixture's one digest. */
export function treeSha256(dir) {
  const lines = listFiles(dir).map((rel) => `${sha256(readFileSync(join(dir, rel)))}  ${rel}\n`);
  return sha256(lines.join(""));
}

/** Hash every input and the fixture tree against the manifest. Returns the mismatches: [{path, reason}]. */
export function verifyInputs(manifest, baseDir) {
  const out = [];
  for (const probe of manifest.probes) {
    for (const input of probe.inputs) {
      let got;
      try {
        got = sha256(readFileSync(join(baseDir, input.path)));
      } catch {
        out.push({ path: input.path, reason: "missing" });
        continue;
      }
      if (got !== input.sha256) out.push({ path: input.path, reason: "sha256" });
    }
  }
  let tree;
  try {
    tree = treeSha256(join(baseDir, manifest.fixture.dir));
  } catch {
    tree = null;
  }
  if (tree !== manifest.fixture.tree_sha256) out.push({ path: manifest.fixture.dir, reason: tree === null ? "missing" : "sha256" });
  return out;
}

/** True iff `cited` and `full` are equal, or one is the other's suffix on a whole path segment. */
export function pathMatches(cited, full) {
  const p = cited.startsWith("./") ? cited.slice(2) : cited;
  return p === full || full.endsWith(`/${p}`) || p.endsWith(`/${full}`);
}

/** The 1-based lines of `text` holding any of `tokens` as a whole word (`AC-5` matches, `AC-50` and `XAC-5` do not). */
export function tokenLines(text, tokens) {
  const res = tokens.map((t) => new RegExp(`(?<![A-Za-z0-9-])${t}(?![0-9])`));
  const lines = new Set();
  text.split(/\r?\n/).forEach((line, i) => {
    if (res.some((re) => re.test(line))) lines.add(i + 1);
  });
  return lines;
}

/** Does one finding's `file` (`path:line`, already shape-checked by `validate`) match the probe's anchors? */
export function findingMatches(file, probe, planLines) {
  const cut = file.lastIndexOf(":");
  const path = file.slice(0, cut);
  const line = Number(file.slice(cut + 1));
  const dir = `pharn/features/${probe.feature}/`;
  const onAnchor = probe.anchors.some((a) => pathMatches(path, dir + a.file) && line >= a.start - a.slack && line <= a.end + a.slack);
  return onAnchor || (pathMatches(path, `${dir}PLAN.md`) && planLines.has(line));
}

const CITE_RE = /(?<![A-Za-z0-9_./-])((?:[A-Za-z0-9_.-]+\/)*SPEC\.md):(\d{1,6})(?:\s*[-\u2013]\s*(\d{1,6}))?/g;

/** Every `…SPEC.md:<line>` or `…SPEC.md:<a>-<b>` citation in free text, as {path, start, end} (a reversed range is its first line). */
export function specCitations(text) {
  return [...text.matchAll(CITE_RE)].map((m) => {
    const start = Number(m[2]);
    const end = m[3] !== undefined && Number(m[3]) >= start ? Number(m[3]) : start;
    return { path: m[1], start, end };
  });
}

/**
 * The plan-stage outcome of a SPEC probe's run, or null when there is none to score: a SPEC probe, a plan session file
 * that parses with `is_error: false` and a string `result`. The caller applies it only when the run left no PLAN.md and no
 * findings file. A citation of the probe's SPEC.md whose line range overlaps a SPEC anchor (with its slack) makes it
 * `caught-at-plan`; otherwise `stopped-at-plan-unanchored`. ADVISORY: the citations come from model free text.
 */
export function planStop(probe, planSession) {
  if (probe.kind !== "spec" || planSession === null) return null;
  let s;
  try {
    s = JSON.parse(planSession.toString("utf8"));
  } catch {
    return null;
  }
  if (!isObject(s) || s.is_error !== false || typeof s.result !== "string") return null;
  const full = `pharn/features/${probe.feature}/SPEC.md`;
  const anchors = probe.anchors.filter((a) => a.file === "SPEC.md");
  const hit = specCitations(s.result).some(
    (c) => pathMatches(c.path, full) && anchors.some((a) => c.start <= a.end + a.slack && c.end >= a.start - a.slack)
  );
  return hit ? "caught-at-plan" : "stopped-at-plan-unanchored";
}

/**
 * Score one run. `findings`, `triage`, `plan` (the run's PLAN.md) and `planSession` (its plan.session.json) are the files'
 * bytes (Buffer) or null when absent. `plan` is read for plan tokens; `planSession` only when a SPEC probe's run left
 * neither PLAN.md nor findings (see planStop). Returns {outcome, caught, caught_at_plan, findings, matched,
 * escalated_matched, expected_hit}.
 */
export function scoreRun(probe, { findings, triage, plan, planSession = null }) {
  const result = (outcome, extra = {}) => ({
    outcome,
    caught: outcome === "caught",
    caught_at_plan: outcome === "caught-at-plan",
    findings: 0,
    matched: [],
    escalated_matched: [],
    expected_hit: false,
    ...extra,
  });
  if (findings === null) return result((plan === null && planStop(probe, planSession)) || "findings-missing");
  const v = validateFindings(findings.toString("utf8"));
  if (!v.ok) return result("findings-invalid");
  const planLines = probe.plan_tokens.length > 0 && plan !== null ? tokenLines(plan.toString("utf8"), probe.plan_tokens) : new Set();
  const matched = v.doc.findings.filter((f) => findingMatches(f.file, probe, planLines)).map((f) => f.id);
  const base = { findings: v.doc.findings.length, matched };
  if (triage === null) return result("triage-missing", base);
  const t = checkTriage(triage.toString("utf8"), v.doc, sha256(findings));
  if (!t.ok) return result("triage-invalid", base);
  const disposition = new Map(JSON.parse(triage.toString("utf8")).dispositions.map((d) => [d.id, d.disposition]));
  const escalated = matched.filter((id) => disposition.get(id) !== "proceed");
  const expected_hit = escalated.some((id) => disposition.get(id) === probe.expected_disposition);
  if (matched.length === 0) return result("no-anchor-match", base);
  if (escalated.length === 0) return result("matched-all-proceed", base);
  return result("caught", { ...base, escalated_matched: escalated, expected_hit });
}

function readOrNull(path) {
  try {
    return readFileSync(path);
  } catch {
    return null;
  }
}

/** The run directories `r<n>` under `<runsDir>/<probe id>/`, in numeric order. */
export function runDirs(runsDir, id) {
  let names;
  try {
    names = readdirSync(join(runsDir, id));
  } catch {
    return [];
  }
  return names
    .filter((n) => /^r[1-9]\d{0,2}$/.test(n) && lstatSync(join(runsDir, id, n)).isDirectory())
    .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
}

/**
 * Score every run of the selected probes. Returns {ok: true, tally} or {ok: false, missing: [ids with no run]}.
 * `chance_matches` scores each run of a PLAN probe against every OTHER probe of its group: those probes' plans differ
 * from it only inside their planted ranges, so a match there is a finding on that line for some other reason.
 */
export function tally(manifest, runsDir, ids, manifestSha) {
  const selected = manifest.probes.filter((p) => ids.length === 0 || ids.includes(p.id));
  const missing = selected.filter((p) => runDirs(runsDir, p.id).length === 0).map((p) => p.id);
  if (missing.length > 0) return { ok: false, missing };
  const probes = [];
  const chance = [];
  for (const probe of selected) {
    const runs = runDirs(runsDir, probe.id).map((run) => {
      const dir = join(runsDir, probe.id, run);
      const files = { findings: readOrNull(join(dir, "grill-findings.json")), triage: readOrNull(join(dir, "grill-triage.json")) };
      files.plan = probe.kind === "spec" ? readOrNull(join(dir, "PLAN.md")) : null;
      files.planSession = probe.kind === "spec" ? readOrNull(join(dir, "plan.session.json")) : null;
      const shas = Object.fromEntries(Object.entries(files).map(([k, b]) => [k, b === null ? null : sha256(b)]));
      const peers = manifest.probes.filter((q) => probe.group !== null && q.group === probe.group && q.id !== probe.id);
      for (const peer of peers) {
        const s = scoreRun({ ...peer, feature: probe.feature, plan_tokens: [] }, files);
        chance.push({ probe: probe.id, run, against: peer.id, matched: s.matched, escalated_matched: s.escalated_matched });
      }
      return { run, ...scoreRun(probe, files), sha256: shas };
    });
    probes.push({
      id: probe.id,
      kind: probe.kind,
      class: probe.class,
      expected_disposition: probe.expected_disposition,
      caught: runs.filter((r) => r.caught).length,
      caught_at_plan: runs.filter((r) => r.caught_at_plan).length,
      stopped_unanchored: runs.filter((r) => r.outcome === "stopped-at-plan-unanchored").length,
      total: runs.length,
      runs,
    });
  }
  const sum = (k) => probes.reduce((n, p) => n + p[k], 0);
  const [caught, caughtAtPlan] = [sum("caught"), sum("caught_at_plan")];
  return {
    ok: true,
    tally: {
      schema: TALLY_SCHEMA,
      manifest_sha256: manifestSha,
      catches: caught + caughtAtPlan,
      caught,
      caught_at_plan: caughtAtPlan,
      stopped_unanchored: sum("stopped_unanchored"),
      total: sum("total"),
      probes,
      chance_matches: chance,
    },
  };
}

const USAGE =
  "usage: defect-probe-score.mjs verify --manifest <m> [--manifest-sha256 <hex>]\n" +
  "       defect-probe-score.mjs score --manifest <m> --probe <id> --findings <f> --triage <t> [--plan <p>] [--plan-session <s>] [--manifest-sha256 <hex>]\n" +
  "       defect-probe-score.mjs tally --manifest <m> --runs <dir> [--probe <id>]... [--min <n>] [--manifest-sha256 <hex>]";

const FLAGS = {
  verify: ["--manifest", "--manifest-sha256"],
  score: ["--manifest", "--manifest-sha256", "--probe", "--findings", "--triage", "--plan", "--plan-session"],
  tally: ["--manifest", "--manifest-sha256", "--runs", "--probe", "--min"],
};

/** argv (after `node script`) → {cmd, flags: {name: [values]}} or {error}. */
export function parseArgs(argv) {
  const [cmd, ...rest] = argv;
  if (!Object.hasOwn(FLAGS, cmd ?? "")) return { error: "unknown or missing subcommand" };
  const flags = {};
  for (let i = 0; i < rest.length; i += 2) {
    const name = rest[i];
    if (!FLAGS[cmd].includes(name)) return { error: `unknown argument for ${cmd}` };
    if (rest[i + 1] === undefined) return { error: `${name} needs a value` };
    if (Object.hasOwn(flags, name) && !(cmd === "tally" && name === "--probe")) return { error: `${name} given twice` };
    (flags[name] ??= []).push(rest[i + 1]);
  }
  return { cmd, flags };
}

/** Load and check the manifest named by the flags. Returns {manifest, sha, baseDir} or {error}. */
export function loadManifest(flags) {
  if (!flags["--manifest"]) return { error: "--manifest is required" };
  const path = flags["--manifest"][0];
  let bytes;
  try {
    bytes = readFileSync(path);
  } catch {
    return { error: "manifest unreadable" };
  }
  const sha = sha256(bytes);
  const pinned = flags["--manifest-sha256"]?.[0];
  if (pinned !== undefined && pinned !== sha) return { error: "manifest sha256 differs from --manifest-sha256" };
  const v = validateManifest(bytes.toString("utf8"));
  if (!v.ok)
    return { error: `manifest invalid: ${v.defects.map((d) => (d.index === undefined ? d.code : `${d.code}[${d.index}]`)).join(", ")}` };
  return { manifest: v.manifest, sha, baseDir: dirname(path) };
}

/** Run one CLI invocation. Returns {code, out, err}; the caller prints and exits. */
export function run(argv) {
  const usage = (msg) => ({ code: 2, out: "", err: `${msg}\n${USAGE}\n` });
  const a = parseArgs(argv);
  if (a.error) return usage(a.error);
  const m = loadManifest(a.flags);
  if (m.error) return usage(m.error);
  const { manifest, sha, baseDir } = m;
  if (a.cmd === "verify") {
    const bad = verifyInputs(manifest, baseDir);
    if (bad.length === 0)
      return {
        code: 0,
        out: `GREEN — manifest ${sha}: ${manifest.probes.length} probes, every input and the fixture tree match\n`,
        err: "",
      };
    return { code: 1, out: `RED — ${bad.map((b) => `${b.path} (${b.reason})`).join(", ")}\n`, err: "" };
  }
  if (a.cmd === "score") {
    const id = a.flags["--probe"]?.[0];
    const probe = manifest.probes.find((p) => p.id === id);
    if (!probe) return usage("--probe names no probe in the manifest");
    if (!a.flags["--findings"] || !a.flags["--triage"]) return usage("--findings and --triage are required");
    const files = {
      findings: readOrNull(a.flags["--findings"][0]),
      triage: readOrNull(a.flags["--triage"][0]),
      plan: a.flags["--plan"] ? readOrNull(a.flags["--plan"][0]) : null,
      planSession: a.flags["--plan-session"] ? readOrNull(a.flags["--plan-session"][0]) : null,
    };
    const s = scoreRun(probe, files);
    return { code: s.caught || s.caught_at_plan ? 0 : 1, out: `${JSON.stringify({ probe: probe.id, ...s })}\n`, err: "" };
  }
  if (!a.flags["--runs"]) return usage("--runs is required");
  const ids = a.flags["--probe"] ?? [];
  if (ids.some((id) => !manifest.probes.some((p) => p.id === id))) return usage("--probe names no probe in the manifest");
  const min = a.flags["--min"]?.[0];
  if (min !== undefined && !/^(0|[1-9]\d{0,3})$/.test(min)) return usage("--min must be a non-negative integer");
  const t = tally(manifest, a.flags["--runs"][0], ids, sha);
  if (!t.ok) return usage(`no run directory for: ${t.missing.join(", ")}`);
  const below = min !== undefined && t.tally.catches < Number(min);
  return { code: below ? 1 : 0, out: `${JSON.stringify(t.tally, null, 2)}\n`, err: "" };
}

if (import.meta.main) {
  const r = run(process.argv.slice(2));
  process.stdout.write(r.out);
  process.stderr.write(r.err);
  process.exitCode = r.code;
}
