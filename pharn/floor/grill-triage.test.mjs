// pharn/floor/grill-triage.test.mjs — tests for the triage file and its verdict (7.7.0, loop-grill-triage):
// grill-triage-core.mjs (checkTriage, skeleton, hints) and the grill-triage.mjs CLI.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { SCHEMA as FINDINGS_SCHEMA } from "./grill-findings-core.mjs";
import {
  DEFECT_CODES,
  DEFECT_HINTS,
  DISPOSITIONS,
  REASON_MAX,
  SCHEMA,
  VERDICT_EXIT,
  VERDICT_SCHEMA,
  checkTriage,
  defectHints,
  formatDefects,
  skeleton,
} from "./grill-triage-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, "grill-triage.mjs");

const finding = (i, over = {}) => ({
  id: `G1-${i}`,
  type: "FINDING",
  rule_id: "P1",
  severity: "important",
  file: "pharn/features/demo/PLAN.md:12",
  problem: `criterion ${i} is not covered by any planned test`,
  evidence: "AC-2 names no test",
  ...over,
});
const fdoc = (findings, over = {}) => ({ schema: FINDINGS_SCHEMA, round: 1, findings, ...over });
const SHA = "a".repeat(64);
const disp = (i, disposition = "proceed", over = {}) => ({ id: `G1-${i}`, disposition, reason: `why ${i}`, ...over });
const triage = (dispositions, over = {}) => ({ schema: SCHEMA, round: 1, findings_sha256: SHA, dispositions, ...over });
const run = (t, f, sha = SHA) => checkTriage(typeof t === "string" ? t : JSON.stringify(t), f, sha);
const codes = (r) => (r.ok ? [] : r.defects.map((d) => (d.index === undefined ? d.code : `${d.code}@${d.index}`)));

// ── checkTriage: the verdict ──────────────────────────────────────────────────────────────────────────────────────────

test("verdict precedence: spec > replan > proceed, with counts and escalated ids in file order", () => {
  const f = fdoc([finding(1), finding(2), finding(3)]);
  const all = run(triage([disp(1), disp(2), disp(3)]), f);
  assert.deepEqual(all.verdict, { schema: VERDICT_SCHEMA, verdict: "proceed", counts: { proceed: 3, replan: 0, spec: 0 }, escalated: [] });
  const rp = run(triage([disp(1, "replan"), disp(2), disp(3, "replan")]), f);
  assert.equal(rp.verdict.verdict, "replan");
  assert.deepEqual(rp.verdict.escalated, ["G1-1", "G1-3"]);
  const sp = run(triage([disp(1, "replan"), disp(2, "spec"), disp(3)]), f);
  assert.equal(sp.verdict.verdict, "spec");
  assert.deepEqual(sp.verdict.counts, { proceed: 1, replan: 1, spec: 1 });
  assert.deepEqual(sp.verdict.escalated, ["G1-1", "G1-2"]);
});

test("L34: zero findings with [] is an explicit proceed; non-empty findings with [] is RED", () => {
  const z = run(triage([]), fdoc([]));
  assert.equal(z.ok, true);
  assert.equal(z.verdict.verdict, "proceed");
  assert.deepEqual(codes(run(triage([]), fdoc([finding(1)]))), ["dispositions-length"]);
});

test("L36: coverage is closed both ways — missing, extra, reordered or duplicated ids are RED", () => {
  const f = fdoc([finding(1), finding(2)]);
  assert.deepEqual(codes(run(triage([disp(1)]), f)), ["dispositions-length"]);
  assert.deepEqual(codes(run(triage([disp(1), disp(2), disp(3)]), f)), ["dispositions-length"]);
  assert.deepEqual(codes(run(triage([disp(2), disp(1)]), f)), ["id@0", "id@1"]);
  assert.deepEqual(codes(run(triage([disp(1), disp(1)]), f)), ["id@1"]);
});

test("Q4: a blocking finding triaged proceed is RED; replan or spec is accepted", () => {
  const f = fdoc([finding(1, { severity: "blocking" }), finding(2)]);
  assert.deepEqual(codes(run(triage([disp(1), disp(2)]), f)), ["blocking-proceed@0"]);
  assert.equal(run(triage([disp(1, "replan"), disp(2)]), f).verdict.verdict, "replan");
  assert.equal(run(triage([disp(1, "spec"), disp(2)]), f).verdict.verdict, "spec");
});

test("the binding: round and findings_sha256 must match the findings file", () => {
  const f = fdoc([finding(1)]);
  assert.deepEqual(codes(run(triage([disp(1)], { round: 2 }), f)), ["round"]);
  assert.deepEqual(codes(run(triage([disp(1)]), f, "b".repeat(64))), ["findings-sha256"], "a triage of another findings file");
  for (const bad of ["A".repeat(64), "a".repeat(63), 42, null]) {
    assert.deepEqual(codes(run(triage([disp(1)], { findings_sha256: bad }), f, bad)), ["findings-sha256"], String(bad));
  }
});

test("shape: not JSON, not an object, repeated keys, top keys, schema, dispositions", () => {
  const f = fdoc([finding(1)]);
  assert.deepEqual(codes(run("{", f)), ["not-json"]);
  assert.deepEqual(codes(checkTriage(42, f, SHA)), ["not-json"]);
  assert.deepEqual(codes(run("[]", f)), ["not-an-object"]);
  const repeated = JSON.stringify(triage([disp(1)])).replace('"disposition":"proceed"', '"disposition":"replan","disposition":"proceed"');
  assert.deepEqual(codes(run(repeated, f)), ["repeated-key"]);
  assert.deepEqual(codes(run({ ...triage([disp(1)]), extra: 1 }, f)), ["top-keys"]);
  assert.deepEqual(codes(run(triage([disp(1)], { schema: "pharn-grill-triage/2" }), f)), ["schema"]);
  assert.deepEqual(codes(run(triage({}), f)), ["dispositions-not-array"]);
  assert.deepEqual(codes(run(triage(["x"]), f)), ["disposition-not-an-object@0"]);
  assert.deepEqual(codes(run(triage([{ ...disp(1), note: "x" }]), f)), ["disposition-keys@0"]);
});

test("disposition enum and reason guards", () => {
  const f = fdoc([finding(1)]);
  for (const bad of ["Proceed", "accept", "", " proceed", "proceed\n", null, 1]) {
    assert.deepEqual(codes(run(triage([disp(1, bad)]), f)), ["disposition@0"], JSON.stringify(bad));
  }
  for (const bad of ["", "   ", "two\nlines", "tab\there", "x".repeat(REASON_MAX + 1), null, 3]) {
    assert.deepEqual(codes(run(triage([disp(1, "proceed", { reason: bad })]), f)), ["reason@0"], JSON.stringify(bad));
  }
  assert.equal(run(triage([disp(1, "proceed", { reason: "x".repeat(REASON_MAX) })]), f).ok, true);
});

test("L62: hostile parsed values in every field never throw and never reach the defects", () => {
  const f = fdoc([finding(1)]);
  const hostile = { toString: 1 };
  for (const key of ["schema", "round", "findings_sha256"]) {
    const r = run(triage([disp(1)], { [key]: hostile }), f);
    assert.equal(r.ok, false, key);
  }
  for (const key of ["id", "disposition", "reason"]) {
    const r = run(triage([disp(1, "proceed", { [key]: hostile })]), f);
    assert.equal(r.ok, false, key);
    assert.ok(!JSON.stringify(r.defects).includes("toString"), key);
  }
});

// ── skeleton and hints ────────────────────────────────────────────────────────────────────────────────────────────────

test("skeleton: round, digest and one empty element per finding; filled all-proceed it checks GREEN", () => {
  const f = fdoc([finding(1), finding(2)]);
  const s = skeleton(f, SHA);
  assert.deepEqual(s, {
    schema: SCHEMA,
    round: 1,
    findings_sha256: SHA,
    dispositions: [
      { id: "G1-1", disposition: "", reason: "" },
      { id: "G1-2", disposition: "", reason: "" },
    ],
  });
  assert.deepEqual(codes(run(s, f)), ["disposition@0", "reason@0", "disposition@1", "reason@1"], "the bare skeleton is not a triage");
  for (const d of s.dispositions) Object.assign(d, { disposition: "proceed", reason: "accepted" });
  assert.equal(run(s, f).verdict.verdict, "proceed");
});

test("DEFECT_HINTS has exactly one non-empty single-line hint per DEFECT_CODES member (closed both ways)", () => {
  assert.deepEqual(Object.keys(DEFECT_HINTS).sort(), [...DEFECT_CODES].sort());
  for (const [c, h] of Object.entries(DEFECT_HINTS)) assert.ok(typeof h === "string" && h.length > 0 && !h.includes("\n"), c);
  assert.deepEqual(defectHints([{ code: "id", index: 0 }, { code: "id", index: 1 }, { code: "round" }]), [
    `  id: ${DEFECT_HINTS.id}`,
    `  round: ${DEFECT_HINTS.round}`,
  ]);
  assert.equal(formatDefects([{ code: "round" }, { code: "id", index: 3 }]), "round, id@3");
});

test("VERDICT_EXIT maps the three dispositions to 0, 3 and 4 — never RED's 1 or usage's 2", () => {
  assert.deepEqual(Object.keys(VERDICT_EXIT).sort(), [...DISPOSITIONS].sort());
  assert.deepEqual(VERDICT_EXIT, { proceed: 0, replan: 3, spec: 4 });
});

// ── the CLI ───────────────────────────────────────────────────────────────────────────────────────────────────────────

const cli = (args, cwd) => spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8", cwd });
const sha256 = (s) => createHash("sha256").update(s).digest("hex");

/** A realistic findings file: the shape five real 7.6.0 grills wrote (8 findings, principle rule ids, one blocking). */
function realisticFindings() {
  const sev = ["blocking", "important", "important", "important", "minor", "minor", "minor", "minor"];
  const rules = ["P6", "P1", "P0", "P2", "P7", "P1", "P3", "P7"];
  return fdoc(
    sev.map((s, i) =>
      finding(i + 1, {
        severity: s,
        rule_id: rules[i],
        file: `pharn/features/demo/PLAN.md:${20 + i * 7}`,
        problem: `the plan leaves concern ${i + 1} to discipline: "quoted" text, a — dash and a backslash \\`,
      })
    )
  );
}

function scratch() {
  const dir = mkdtempSync(join(tmpdir(), "grill-triage-"));
  mkdirSync(join(dir, "f"), { recursive: true });
  return dir;
}

test("L84: a realistic run takes the escalation branch — skeleton, fill one replan, check exits 3 with that id", () => {
  const dir = scratch();
  try {
    const fText = `${JSON.stringify(realisticFindings(), null, 2)}\n`;
    const fPath = join(dir, "f", "grill-findings.json");
    writeFileSync(fPath, fText);
    const sk = cli(["skeleton", fPath], dir);
    assert.equal(sk.status, 0, sk.stderr);
    const t = JSON.parse(sk.stdout);
    assert.equal(t.findings_sha256, sha256(fText), "the digest is over the file's bytes");
    t.dispositions.forEach((d, i) => Object.assign(d, { disposition: i === 0 ? "replan" : "proceed", reason: `reason ${i}` }));
    const tPath = join(dir, "f", "grill-triage.json");
    writeFileSync(tPath, JSON.stringify(t, null, 2));
    const c = cli(["check", tPath, "--findings", fPath], dir);
    assert.equal(c.status, 3, c.stdout + c.stderr);
    const v = JSON.parse(c.stdout);
    assert.deepEqual(v, { schema: VERDICT_SCHEMA, verdict: "replan", counts: { proceed: 7, replan: 1, spec: 0 }, escalated: ["G1-1"] });
    assert.ok(!c.stdout.includes("reason"), "no reason is ever printed");
    // The same triage with the blocking finding proceeded is RED, RED line first, with its hint.
    t.dispositions[0].disposition = "proceed";
    writeFileSync(tPath, JSON.stringify(t));
    const red = cli(["check", tPath, "--findings", fPath], dir);
    assert.equal(red.status, 1);
    assert.match(red.stdout, /^RED — blocking-proceed@0\n {2}blocking-proceed: /);
    // A spec disposition exits 4; all proceed (with the blocking one replanned away) exits 0.
    t.dispositions[0].disposition = "spec";
    writeFileSync(tPath, JSON.stringify(t));
    assert.equal(cli(["check", tPath, "--findings", fPath], dir).status, 4);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI: the findings file is re-hashed — an edit after the triage makes it RED findings-sha256", () => {
  const dir = scratch();
  try {
    const fPath = join(dir, "f", "grill-findings.json");
    writeFileSync(fPath, JSON.stringify(fdoc([finding(1)])));
    const t = JSON.parse(cli(["skeleton", fPath], dir).stdout);
    Object.assign(t.dispositions[0], { disposition: "proceed", reason: "fine" });
    const tPath = join(dir, "f", "grill-triage.json");
    writeFileSync(tPath, JSON.stringify(t));
    assert.equal(cli(["check", tPath, "--findings", fPath], dir).status, 0);
    writeFileSync(fPath, `${JSON.stringify(fdoc([finding(1)]))}\n`);
    const r = cli(["check", tPath, "--findings", fPath], dir);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /^RED — findings-sha256\n/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI: an invalid findings file is RED with grill-findings' own codes, from both subcommands", () => {
  const dir = scratch();
  try {
    const fPath = join(dir, "f", "grill-findings.json");
    writeFileSync(fPath, JSON.stringify(fdoc([finding(1, { rule_id: "testability" })])));
    const s = cli(["skeleton", fPath], dir);
    assert.equal(s.status, 1);
    assert.match(s.stdout, /^RED — grill-findings\.json invalid: rule_id@0\n {2}rule_id: /);
    const tPath = join(dir, "f", "t.json");
    writeFileSync(tPath, JSON.stringify(triage([disp(1)])));
    const c = cli(["check", tPath, "--findings", fPath], dir);
    assert.equal(c.status, 1);
    assert.match(c.stdout, /^RED — grill-findings\.json invalid: rule_id@0/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI: usage errors, missing, directory, symlink and oversize inputs exit 2 with nothing on stdout", () => {
  const dir = scratch();
  try {
    const fPath = join(dir, "f", "grill-findings.json");
    writeFileSync(fPath, JSON.stringify(fdoc([])));
    const tPath = join(dir, "f", "t.json");
    writeFileSync(tPath, JSON.stringify(triage([])));
    for (const args of [
      [],
      ["nope"],
      ["skeleton"],
      ["skeleton", fPath, fPath],
      ["skeleton", "--x"],
      ["check", tPath],
      ["check", tPath, "--findings"],
      ["check", tPath, "--findings", fPath, "--findings", fPath],
      ["check", tPath, tPath, "--findings", fPath],
      ["check", "--x", "--findings", fPath],
    ]) {
      const u = cli(args, dir);
      assert.equal(u.status, 2, JSON.stringify(args));
      assert.equal(u.stdout, "", JSON.stringify(args));
    }
    assert.equal(cli(["skeleton", join(dir, "absent.json")], dir).status, 2);
    assert.match(cli(["check", join(dir, "absent.json"), "--findings", fPath], dir).stderr, /triage file not found/);
    mkdirSync(join(dir, "d.json"));
    assert.match(cli(["skeleton", join(dir, "d.json")], dir).stderr, /not a regular file/);
    symlinkSync(fPath, join(dir, "link.json"));
    assert.match(cli(["skeleton", join(dir, "link.json")], dir).stderr, /not a regular file/);
    const big = join(dir, "big.json");
    writeFileSync(big, " ".repeat(4 * 1024 * 1024 + 1));
    assert.match(cli(["check", tPath, "--findings", big], dir).stderr, /larger than 4194304 bytes/);
    // Zero findings, [] triaged, with the real digest: proceed, exit 0.
    writeFileSync(tPath, JSON.stringify(triage([], { findings_sha256: sha256(JSON.stringify(fdoc([]))) })));
    const ok = cli(["check", tPath, "--findings", fPath], dir);
    assert.equal(ok.status, 0, ok.stdout);
    assert.equal(JSON.parse(ok.stdout).verdict, "proceed");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
