// pharn/floor/grill-round.test.mjs — tests for the re-plan round (7.8.0, loop-replan-rounds): grill-round-core.mjs
// (the round arithmetic, the closed archive set) and the grill-round.mjs CLI (current, next, renames, refusals).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs, { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { SCHEMA as FINDINGS_SCHEMA } from "./grill-findings-core.mjs";
import {
  ARCHIVE_NAMES,
  DEFECT_CODES,
  DEFECT_HINTS,
  EXIT,
  LIVE_NAMES,
  REPLAN_CAP,
  SCHEMA,
  archiveName,
  archivedRounds,
  currentRound,
  decideNext,
  roundArchives,
} from "./grill-round-core.mjs";
import { SCHEMA as TRIAGE_SCHEMA } from "./grill-triage-core.mjs";
import { main } from "./grill-round.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, "grill-round.mjs");

// ── A realistic round (L67, L84): ten findings of mixed severity with long, punctuated free text — the shape of the
// measured grills (.dev/features/loop-grill-triage/TRIAGE-CHECK-MEASUREMENT.md, run g1: 1 blocking, 4 important,
// 5 minor; triage 5 proceed / 5 replan) — and a triage file bound to its exact bytes.
const SEVERITIES = ["blocking", "important", "important", "minor", "important", "minor", "minor", "important", "minor", "minor"];
const RULES = ["P0", "P1", "P2", "P7", "security.md SEC-1", "P3", "P5", "P6", "P7", "P1"];
function findingsDoc(round, n = 10) {
  return {
    schema: FINDINGS_SCHEMA,
    round,
    findings: Array.from({ length: n }, (_, i) => ({
      id: `G${round}-${i + 1}`,
      type: "FINDING",
      rule_id: RULES[i % RULES.length],
      severity: SEVERITIES[i % SEVERITIES.length],
      file: `pharn/features/reauth-binding/PLAN.md:${40 + i * 7}`,
      problem: `Step ${i + 2} rebinds the session after re-authentication but the plan never says what happens to the old token's refresh grant — "revoked", "kept" or "rotated" — so criterion AC-${i + 1} has no test that can fail.`,
      evidence: `"bind the new credential to the session (see SPEC §3, AC-${i + 1})"`,
    })),
  };
}
const DISPOSITION_ORDER = ["replan", "proceed", "replan", "proceed", "replan", "proceed", "replan", "proceed", "replan", "proceed"];
function triageDoc(fdoc, sha, override) {
  return {
    schema: TRIAGE_SCHEMA,
    round: fdoc.round,
    findings_sha256: sha,
    dispositions: fdoc.findings.map((f, i) => ({
      id: f.id,
      disposition: override ?? (f.severity === "blocking" ? "replan" : DISPOSITION_ORDER[i]),
      reason: `The plan has to name the refresh grant's fate before the build; ${f.id} points at a missing test for it.`,
    })),
  };
}

/** A scratch project root holding pharn/features/<name>/ with a round's four live files (round `r`, verdict `v`). */
function project(name = "reauth-binding") {
  const root = mkdtempSync(join(tmpdir(), "grill-round-"));
  const dir = join(root, "pharn", "features", name);
  mkdirSync(dir, { recursive: true });
  return { root, dir, name };
}
function writeRound(dir, round, verdict = "replan") {
  const fdoc = findingsDoc(round);
  // A `blocking` finding may never be `proceed` (grill-triage.md), so an all-proceed round has none.
  if (verdict === "proceed") for (const f of fdoc.findings) if (f.severity === "blocking") f.severity = "important";
  const fbytes = `${JSON.stringify(fdoc, null, 2)}\n`;
  const sha = createHash("sha256").update(fbytes).digest("hex");
  const override = verdict === "replan" ? undefined : verdict;
  writeFileSync(join(dir, "grill-findings.json"), fbytes);
  writeFileSync(join(dir, "grill-triage.json"), `${JSON.stringify(triageDoc(fdoc, sha, override), null, 2)}\n`);
  writeFileSync(join(dir, "PLAN.md"), `---\nspec_id: reauth-binding\n---\n\n## Approach\n\nround ${round} plan\n`);
  writeFileSync(join(dir, "GRILL.md"), `# GRILL\n\nround ${round}\n`);
}
function archive(dir, round) {
  for (const n of roundArchives(round)) writeFileSync(join(dir, n), `archived round ${round}: ${n}\n`);
}
function cli(p, ...args) {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd: p.root, encoding: "utf8" });
  return { code: r.status, out: r.stdout, err: r.stderr };
}
const cleanup = (p) => rmSync(p.root, { recursive: true, force: true });

// ── The core ──────────────────────────────────────────────────────────────────────────────────────────────────────────

test("the cap is two re-plan rounds and the archive set is the eight names derived from it, frozen (L29)", () => {
  assert.equal(REPLAN_CAP, 2);
  assert.deepEqual(LIVE_NAMES, ["PLAN.md", "GRILL.md", "grill-findings.json", "grill-triage.json"]);
  assert.deepEqual(ARCHIVE_NAMES, [
    "PLAN.r1.md",
    "GRILL.r1.md",
    "grill-findings.r1.json",
    "grill-triage.r1.json",
    "PLAN.r2.md",
    "GRILL.r2.md",
    "grill-findings.r2.json",
    "grill-triage.r2.json",
  ]);
  assert.ok(Object.isFrozen(ARCHIVE_NAMES));
  assert.equal(archiveName("grill-findings.json", 2), "grill-findings.r2.json");
  assert.equal(ARCHIVE_NAMES.length, REPLAN_CAP * LIVE_NAMES.length);
});

test("archivedRounds: none is an explicit 0 (L34); complete rounds count; a gap or a partial round is refused (L36)", () => {
  assert.deepEqual(archivedRounds(new Set()), { ok: true, archived: 0 });
  assert.deepEqual(archivedRounds(new Set(roundArchives(1))), { ok: true, archived: 1 });
  assert.deepEqual(archivedRounds(new Set([...roundArchives(1), ...roundArchives(2)])), { ok: true, archived: 2 });
  assert.deepEqual(archivedRounds(new Set(roundArchives(2))), { ok: false, codes: ["gap"] });
  assert.deepEqual(archivedRounds(new Set(roundArchives(1).slice(0, 3))), { ok: false, codes: ["partial-round"] });
  assert.deepEqual(archivedRounds(new Set([...roundArchives(1), "GRILL.r2.md"])), { ok: false, codes: ["partial-round"] });
});

test("currentRound: the next grill's round and what a re-plan reads (live after a stop, else the newest archive)", () => {
  assert.deepEqual(currentRound(0, false), { schema: SCHEMA, round: 1, archived: 0, replan_from: null });
  assert.deepEqual(currentRound(0, true), { schema: SCHEMA, round: 1, archived: 0, replan_from: "live" });
  assert.deepEqual(currentRound(2, false), { schema: SCHEMA, round: 3, archived: 2, replan_from: "r2" });
  assert.deepEqual(currentRound(2, true), { schema: SCHEMA, round: 3, archived: 2, replan_from: "live" });
});

test("decideNext: advance below the cap, cap at round 3, and every refusal", () => {
  const base = { archived: 0, findingsRound: 1, verdict: "replan", destinationsPresent: 0 };
  assert.deepEqual(decideNext(base), { action: "advance", round: 2, archived: 1 });
  assert.deepEqual(decideNext({ ...base, archived: 1, findingsRound: 2 }), { action: "advance", round: 3, archived: 2 });
  assert.deepEqual(decideNext({ ...base, archived: 2, findingsRound: 3 }), { action: "cap" });
  assert.deepEqual(decideNext({ ...base, verdict: "spec" }), { action: "refuse", codes: ["not-replan"] });
  assert.deepEqual(decideNext({ ...base, verdict: "proceed" }), { action: "refuse", codes: ["not-replan"] });
  assert.deepEqual(decideNext({ ...base, findingsRound: 2 }), { action: "refuse", codes: ["round-mismatch"] });
  assert.deepEqual(decideNext({ ...base, destinationsPresent: 1 }), { action: "refuse", codes: ["archive-exists"] });
});

test("every defect code has a hint, and no hint is shared or empty", () => {
  for (const c of DEFECT_CODES) assert.ok(typeof DEFECT_HINTS[c] === "string" && DEFECT_HINTS[c].length > 0, c);
  assert.deepEqual(Object.keys(DEFECT_HINTS).sort(), [...DEFECT_CODES].sort());
  assert.equal(new Set(Object.values(DEFECT_HINTS)).size, DEFECT_CODES.length);
});

// ── The CLI: current ─────────────────────────────────────────────────────────────────────────────────────────────────

test("current: a fresh feature is round 1 with nothing to re-plan from", () => {
  const p = project();
  try {
    const r = cli(p, "current", p.name);
    assert.equal(r.code, 0);
    assert.deepEqual(JSON.parse(r.out), { schema: SCHEMA, round: 1, archived: 0, replan_from: null });
  } finally {
    cleanup(p);
  }
});

test("current after an S16 stop: a live triage bound to round 1 + archived reads `live`; after an advance, the archive", () => {
  const p = project();
  try {
    writeRound(p.dir, 1, "spec");
    assert.deepEqual(JSON.parse(cli(p, "current", p.name).out), { schema: SCHEMA, round: 1, archived: 0, replan_from: "live" });
    archive(p.dir, 1);
    archive(p.dir, 2);
    writeRound(p.dir, 3, "replan");
    assert.deepEqual(JSON.parse(cli(p, "current", p.name).out), { schema: SCHEMA, round: 3, archived: 2, replan_from: "live" });
    rmSync(join(p.dir, "grill-triage.json"));
    assert.deepEqual(JSON.parse(cli(p, "current", p.name).out), { schema: SCHEMA, round: 3, archived: 2, replan_from: "r2" });
  } finally {
    cleanup(p);
  }
});

test("current: a live triage whose round is not 1 + archived does not read `live`", () => {
  const p = project();
  try {
    archive(p.dir, 1);
    writeRound(p.dir, 1);
    assert.deepEqual(JSON.parse(cli(p, "current", p.name).out), { schema: SCHEMA, round: 2, archived: 1, replan_from: "r1" });
  } finally {
    cleanup(p);
  }
});

test("current: a gap, a partial round and a symlinked archive are RED with the code first and no content", () => {
  const p = project();
  try {
    archive(p.dir, 2);
    let r = cli(p, "current", p.name);
    assert.equal(r.code, 1);
    assert.match(r.out, /^RED — gap\n/);
    rmSync(join(p.dir, "PLAN.r2.md"));
    archive(p.dir, 1);
    r = cli(p, "current", p.name);
    assert.match(r.out, /^RED — partial-round\n/);
    rmSync(join(p.dir, "GRILL.r2.md"));
    rmSync(join(p.dir, "grill-findings.r2.json"));
    rmSync(join(p.dir, "grill-triage.r2.json"));
    rmSync(join(p.dir, "PLAN.r1.md"));
    symlinkSync(join(p.dir, "GRILL.r1.md"), join(p.dir, "PLAN.r1.md"));
    r = cli(p, "current", p.name);
    assert.equal(r.code, 1);
    assert.match(r.out, /^RED — not-regular\n/);
    assert.doesNotMatch(r.out, /archived round/);
  } finally {
    cleanup(p);
  }
});

test("usage: a bad slug, a missing feature directory or a wrong argument count exits 2 and prints nothing on stdout", () => {
  const p = project();
  try {
    for (const args of [["current", "Bad_Slug"], ["current", "../x"], ["next"], ["current", "a", "b"], ["frobnicate", p.name]]) {
      const r = cli(p, ...args);
      assert.equal(r.code, 2, args.join(" "));
      assert.equal(r.out, "");
    }
    assert.equal(cli(p, "current", "no-such-feature").code, 2);
  } finally {
    cleanup(p);
  }
});

// ── The CLI: next ────────────────────────────────────────────────────────────────────────────────────────────────────

test("next advances a realistic round-1 `replan` pair: the four live files move to their r1 names byte for byte (L84)", () => {
  const p = project();
  try {
    writeRound(p.dir, 1);
    const before = Object.fromEntries(LIVE_NAMES.map((n) => [n, readFileSync(join(p.dir, n), "utf8")]));
    const r = cli(p, "next", p.name);
    assert.equal(r.code, EXIT.ok, r.out + r.err);
    assert.deepEqual(JSON.parse(r.out), { schema: SCHEMA, round: 2, archived: 1, replan_from: "r1" });
    for (const n of LIVE_NAMES) {
      assert.equal(existsSync(join(p.dir, n)), false, `${n} moved`);
      assert.equal(readFileSync(join(p.dir, archiveName(n, 1)), "utf8"), before[n]);
    }
    assert.deepEqual(JSON.parse(cli(p, "current", p.name).out), { schema: SCHEMA, round: 2, archived: 1, replan_from: "r1" });
  } finally {
    cleanup(p);
  }
});

test("next at round 3 exits 5 (no re-plan round left) and moves nothing (L84)", () => {
  const p = project();
  try {
    archive(p.dir, 1);
    archive(p.dir, 2);
    writeRound(p.dir, 3);
    const r = cli(p, "next", p.name);
    assert.equal(r.code, EXIT.cap);
    assert.equal(r.out, "");
    for (const n of LIVE_NAMES) assert.equal(existsSync(join(p.dir, n)), true);
  } finally {
    cleanup(p);
  }
});

test("next refuses, moving nothing: proceed, spec, round mismatch, a missing live file, invalid findings, unbound triage", () => {
  const cases = [
    ["proceed", (d) => writeRound(d, 1, "proceed"), "not-replan"],
    ["spec", (d) => writeRound(d, 1, "spec"), "not-replan"],
    ["round 2 with nothing archived", (d) => writeRound(d, 2), "round-mismatch"],
    ["no GRILL.md", (d) => (writeRound(d, 1), rmSync(join(d, "GRILL.md"))), "live-missing"],
    ["findings not JSON", (d) => (writeRound(d, 1), writeFileSync(join(d, "grill-findings.json"), "{")), "findings-invalid"],
    [
      "findings edited after triage",
      (d) => (writeRound(d, 1), writeFileSync(join(d, "grill-findings.json"), `${JSON.stringify(findingsDoc(1))}\n`)),
      "triage-invalid",
    ],
  ];
  for (const [label, setup, code] of cases) {
    const p = project();
    try {
      setup(p.dir);
      const present = LIVE_NAMES.filter((n) => existsSync(join(p.dir, n)));
      const r = cli(p, "next", p.name);
      assert.equal(r.code, EXIT.red, label);
      assert.match(r.out, new RegExp(`^RED — ${code}\\n`), label);
      assert.doesNotMatch(r.out, /refresh grant|reauth-binding/, `${label}: no content quoted (L62)`);
      for (const n of present) assert.equal(existsSync(join(p.dir, n)), true, `${label}: ${n} not moved`);
      for (const n of ARCHIVE_NAMES) assert.equal(existsSync(join(p.dir, n)), false, `${label}: no ${n}`);
    } finally {
      cleanup(p);
    }
  }
});

test("next refuses a symlinked live file or a symlinked destination (L54), moving nothing", () => {
  const p = project();
  try {
    writeRound(p.dir, 1);
    writeFileSync(join(p.root, "elsewhere.md"), "outside\n");
    symlinkSync(join(p.root, "elsewhere.md"), join(p.dir, "PLAN.r1.md"));
    let r = cli(p, "next", p.name);
    assert.equal(r.code, EXIT.red);
    assert.match(r.out, /^RED — not-regular\n/);
    rmSync(join(p.dir, "PLAN.r1.md"));
    rmSync(join(p.dir, "PLAN.md"));
    symlinkSync(join(p.root, "elsewhere.md"), join(p.dir, "PLAN.md"));
    r = cli(p, "next", p.name);
    assert.match(r.out, /^RED — not-regular\n/);
    assert.equal(readFileSync(join(p.root, "elsewhere.md"), "utf8"), "outside\n");
  } finally {
    cleanup(p);
  }
});

test("next on an unwritable feature directory fails its first rename, moves nothing and reports rename-failed", (t) => {
  if (process.platform === "win32" || process.getuid?.() === 0) return t.skip("permission bits do not bind here");
  const p = project();
  try {
    writeRound(p.dir, 1);
    chmodSync(p.dir, 0o555);
    const r = cli(p, "next", p.name);
    chmodSync(p.dir, 0o755);
    assert.equal(r.code, EXIT.red);
    assert.match(r.out, /^RED — rename-failed\n/);
    for (const n of LIVE_NAMES) assert.equal(existsSync(join(p.dir, n)), true);
  } finally {
    chmodSync(p.dir, 0o755);
    cleanup(p);
  }
});

// ── The artifact lists know every archive (L29): each list is written out by hand, so this binds each to ARCHIVE_NAMES.

test("★ every artifact list holds every ARCHIVE_NAMES member: regress, reconcile, fingerprint and the green commit", async () => {
  const { STAGE_ARTIFACTS } = await import("./loop-closeout.mjs");
  const { INCLUDED_ARTIFACTS } = await import("./worktree-fingerprint.mjs");
  const reconcile = JSON.parse(readFileSync(join(HERE, "reconcile-ignore.json"), "utf8")).pipeline_artifacts.names;
  const src = readFileSync(join(HERE, "check-regress.mjs"), "utf8");
  const block = src.match(/const PIPELINE_ARTIFACTS = \[([\s\S]*?)\n\];/);
  assert.ok(block, "PIPELINE_ARTIFACTS must be parseable from check-regress.mjs");
  const pipeline = [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  const lists = { PIPELINE_ARTIFACTS: pipeline, "reconcile-ignore names": reconcile, INCLUDED_ARTIFACTS, STAGE_ARTIFACTS };
  for (const [label, list] of Object.entries(lists)) {
    const missing = ARCHIVE_NAMES.filter((n) => !list.includes(n));
    assert.deepEqual(missing, [], `${label} misses ${missing.join(", ")}`);
  }
  // CONTROL (L60): a list without one archive is reported.
  assert.deepEqual(
    ARCHIVE_NAMES.filter(
      (n) =>
        !pipeline
          .slice(1)
          .filter((x) => x !== "GRILL.r2.md")
          .includes(n)
    ),
    ["GRILL.r2.md"]
  );
});

test("two advances then the cap: rounds 1 and 2 archived, round 3 stays live", () => {
  const p = project();
  try {
    writeRound(p.dir, 1);
    assert.equal(cli(p, "next", p.name).code, EXIT.ok);
    writeRound(p.dir, 2);
    assert.equal(cli(p, "next", p.name).code, EXIT.ok);
    writeRound(p.dir, 3);
    assert.equal(cli(p, "next", p.name).code, EXIT.cap);
    for (const n of ARCHIVE_NAMES) assert.equal(existsSync(join(p.dir, n)), true, n);
    assert.deepEqual(JSON.parse(cli(p, "current", p.name).out), { schema: SCHEMA, round: 3, archived: 2, replan_from: "live" });
  } finally {
    cleanup(p);
  }
});

// ── A rename that fails part-way (in-process, so one rename call can be made to fail) ────────────────────────────────

/** Run `main` from `p.root` (it resolves pharn/features/<name> against the cwd), capturing stdout and stderr. */
function runMain(p, ...args) {
  const out = [];
  const err = [];
  const io = { stdout: { write: (s) => out.push(s) }, stderr: { write: (s) => err.push(s) } };
  const cwd = process.cwd();
  process.chdir(p.root);
  try {
    return { code: main(["node", "grill-round.mjs", ...args], io), out: out.join(""), err: err.join("") };
  } finally {
    process.chdir(cwd);
  }
}

/** Make the listed renameSync calls (1-based) throw EIO for the duration of `fn`; every other call is the real one. */
function withFailingRenames(t, failing, fn) {
  const real = fs.renameSync;
  let n = 0;
  t.mock.method(fs, "renameSync", (from, to) => {
    n += 1;
    if (failing.includes(n)) throw Object.assign(new Error("injected rename failure"), { code: "EIO" });
    return real(from, to);
  });
  syncBuiltinESMExports();
  try {
    return fn();
  } finally {
    t.mock.restoreAll();
    syncBuiltinESMExports();
  }
}

test("next: a later rename fails, the files already moved are moved back, and the round is as it was (rename-failed)", (t) => {
  const p = project();
  try {
    writeRound(p.dir, 1);
    const before = Object.fromEntries(LIVE_NAMES.map((n) => [n, readFileSync(join(p.dir, n), "utf8")]));
    // call 1 moves PLAN.md, call 2 (GRILL.md) fails, call 3 moves PLAN.md back
    const r = withFailingRenames(t, [2], () => runMain(p, "next", p.name));
    assert.equal(r.code, EXIT.red);
    assert.match(r.out, /^RED — rename-failed\n/);
    assert.doesNotMatch(r.out, /exists:/);
    for (const n of LIVE_NAMES) assert.equal(readFileSync(join(p.dir, n), "utf8"), before[n], `${n} restored`);
    for (const n of roundArchives(1)) assert.equal(existsSync(join(p.dir, n)), false, `${n} absent`);
  } finally {
    cleanup(p);
  }
});

test("next: a later rename fails and moving back fails too: rename-partial lists the names that exist, no content", (t) => {
  const p = project();
  try {
    writeRound(p.dir, 1);
    // call 1 moves PLAN.md to PLAN.r1.md, call 2 (GRILL.md) fails, call 3 (PLAN.r1.md back) fails
    const r = withFailingRenames(t, [2, 3], () => runMain(p, "next", p.name));
    assert.equal(r.code, EXIT.red);
    const lines = r.out.trimEnd().split("\n");
    assert.equal(lines[0], "RED — rename-partial");
    assert.equal(lines.at(-1), "  exists: GRILL.md, grill-findings.json, grill-triage.json, PLAN.r1.md");
    assert.doesNotMatch(r.out, /round 1 plan|refresh grant/);
    assert.equal(existsSync(join(p.dir, "PLAN.md")), false);
    assert.equal(existsSync(join(p.dir, "PLAN.r1.md")), true);
  } finally {
    cleanup(p);
  }
});

test("usage: a feature path that is a file, not a directory, exits 2 with the reason on stderr", () => {
  const p = project();
  try {
    writeFileSync(join(p.root, "pharn", "features", "plain-file"), "not a directory\n");
    for (const cmd of ["current", "next"]) {
      const r = cli(p, cmd, "plain-file");
      assert.equal(r.code, EXIT.usage, cmd);
      assert.equal(r.out, "");
      assert.match(r.err, /^grill-round: not a directory: pharn\/features\/plain-file\n$/);
    }
    assert.equal(runMain(p, "current", "plain-file").code, EXIT.usage);
  } finally {
    cleanup(p);
  }
});
