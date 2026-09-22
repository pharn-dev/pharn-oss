// .dev/features/cost-ship-integration-review/integration-probe.mjs — the reproducible probe behind
// INTEGRATION-REVIEW.md. It is an independent integration check of #232 (6.8.2), #233 (6.9.0) and #234
// (6.9.1) through the PRODUCTION CLIs (spawnSync), over isolated tmp dirs, synthetic transcripts and
// explicit timestamps. It never reads a real transcript. Every expected value is a literal computed by
// hand, never read back from the emitter or the checker (L43).
//
// NOT a *.test.mjs: it never joins `npm test`. A FAIL here records a review FINDING (I1b), not a
// regression. Run: node .dev/features/cost-ship-integration-review/integration-probe.mjs
// Exit: 0 when every probe passes, otherwise 1. At the reviewed HEAD 760c5de it exits 1 on I1b by design.
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const R = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "pharn", "floor");
const node = (script, args, env = {}) =>
  spawnSync("node", [join(R, script), ...args], { encoding: "utf8", env: { ...process.env, ...env } });
const results = [];
const rec = (id, pass, detail) => {
  results.push({ id, pass, detail });
};
const S = "00000000-0000-4000-8000-0000000000a9",
  T = "00000000-0000-4000-8000-0000000000b9";
const line = (id, ts, sid, input, extra = {}) =>
  JSON.stringify({
    type: "assistant",
    requestId: id,
    timestamp: ts,
    sessionId: sid,
    isSidechain: false,
    ...extra,
    message: { model: "claude-opus-5", usage: { input_tokens: input, output_tokens: 0, cache_creation: {}, output_tokens_details: {} } },
  });
function world() {
  const root = mkdtempSync(join(tmpdir(), "irev-"));
  mkdirSync(join(root, "projects", "p"), { recursive: true });
  return root;
}
const transcript = (root, sid, lines, subs = {}) => {
  writeFileSync(join(root, "projects", "p", `${sid}.jsonl`), lines.join("\n") + "\n");
  for (const [a, ls] of Object.entries(subs)) {
    mkdirSync(join(root, "projects", "p", sid, "subagents"), { recursive: true });
    writeFileSync(join(root, "projects", "p", sid, "subagents", `${a}.jsonl`), ls.join("\n") + "\n");
  }
};
const markers = (root, name, ms) => {
  mkdirSync(join(root, "cost", name), { recursive: true });
  writeFileSync(
    join(root, "cost", name, "markers.jsonl"),
    ms.map((m) => JSON.stringify({ stage: null, iteration: null, session_id: S, ...m })).join("\n") + "\n"
  );
};
const emit = (root, name, extra = []) =>
  node("render-cost-ledger.mjs", [
    name,
    "--repo",
    root,
    "--projects-dir",
    join(root, "projects"),
    "--markers-base",
    join(root, "cost"),
    ...extra,
  ]);
const costOf = (root, name) => JSON.parse(readFileSync(join(root, "pharn", "features", name, "cost.json"), "utf8"));
const check = (root, name, extra = []) => node("check-cost-ledger.mjs", [join(root, "pharn", "features", name, "cost.json"), ...extra]);
const report = (root, name) => {
  const r = node("render-run-report.mjs", [name, "--repo", root, "--stdout"]);
  return r.stdout;
};
const ABS = /(^|[\s"'`([{=,;])(~[/\\]|[A-Za-z]:[\\/]|\/[A-Za-z0-9._-]+\/)/;

// ---- A: unavailable-transcript privacy ----
{
  const root = world();
  markers(root, "f", [{ seq: 1, kind: "run-start", ts: "2026-09-22T10:00:00.000Z" }]);
  const r = emit(root, "f", ["--session", S]);
  const text = readFileSync(join(root, "pharn/features/f/cost.json"), "utf8");
  const led = JSON.parse(text);
  rec(
    "A1 no-dir: exit 0, unavailable, path-free, checker GREEN",
    r.status === 0 &&
      led.coverage === "unavailable" &&
      !text.includes(root) &&
      !ABS.test(led.coverage_note) &&
      check(root, "f").status === 0,
    led.coverage_note
  );
  const so = emit(root, "f", ["--session", S, "--stdout"]);
  let ok = true;
  try {
    JSON.parse(so.stdout);
  } catch {
    ok = false;
  }
  rec("A2 --stdout is one valid JSON document", ok && so.status === 0, `bytes=${so.stdout.length}`);
  led.coverage_note = "no transcript under /Users/someone/.claude/projects";
  writeFileSync(join(root, "pharn/features/f/cost.json"), JSON.stringify(led));
  const c = check(root, "f");
  rec("A3 deliberately inserted absolute path is still RED", c.status === 1 && /absolute-path/.test(c.stdout), c.stdout.split("\n")[0]);
  // unknown-membership branch (added in 6.9.0) must be path-free too
  const r2 = world();
  transcript(r2, S, [line("x", "2026-09-22T10:00:00.000Z", S, 5)]);
  emit(r2, "g", ["--session", S]);
  const l2 = costOf(r2, "g");
  rec(
    "A4 6.9.0 unknown-membership note is path-free and GREEN",
    l2.membership.status === "unknown" && !JSON.stringify(l2).includes(r2) && check(r2, "g").status === 0,
    l2.coverage_note
  );
}

// ---- B: run-scoped accounting ----
{
  const root = world();
  transcript(root, S, [line("before", "2026-09-22T09:00:00.000Z", S, 100), line("during", "2026-09-22T10:05:00.000Z", S, 10)]);
  markers(root, "f", [
    { seq: 1, kind: "run-start", ts: "2026-09-22T10:00:00.000Z" },
    { seq: 2, kind: "run-stop", ts: "2026-09-22T10:30:00.000Z" },
  ]);
  emit(root, "f", ["--session", S]);
  const led = costOf(root, "f");
  rec(
    "B1 100 before / 10 during → 10 (independent literal)",
    led.totals.tokens.input === 10 && led.membership.excluded_requests === 1 && check(root, "f").status === 0,
    `input=${led.totals.tokens.input} excluded=${led.membership.excluded_requests}`
  );
  rec(
    "B2 membership vs attribution: in-run unmarked row counts and is unattributed",
    led.unattributed.tokens.input === 10 && led.totals.requests === 1,
    JSON.stringify(led.unattributed.tokens.input)
  );
  const first = readFileSync(join(root, "pharn/features/f/cost.json"), "utf8");
  transcript(root, S, [
    line("before", "2026-09-22T09:00:00.000Z", S, 100),
    line("during", "2026-09-22T10:05:00.000Z", S, 10),
    line("later", "2026-09-22T11:00:00.000Z", S, 7777),
  ]);
  emit(root, "f", ["--session", S]);
  const second = costOf(root, "f");
  rec(
    "B3 closed run + later unrelated activity: rerender does not absorb it",
    second.totals.tokens.input === 10 && second.membership.excluded_requests === 2,
    `input=${second.totals.tokens.input}`
  );
  transcript(root, S, [line("before", "2026-09-22T09:00:00.000Z", S, 100), line("during", "2026-09-22T10:05:00.000Z", S, 10)]);
  emit(root, "f", ["--session", S]);
  rec(
    "B4 rerender with same bytes is byte-identical (no double count)",
    readFileSync(join(root, "pharn/features/f/cost.json"), "utf8") === first,
    ""
  );
  const v = check(root, "f", ["--verify-transcript", "--projects-dir", join(root, "projects")]);
  const bad = costOf(root, "f");
  bad.requests = [];
  bad.totals = { requests: 0, tokens: { input: 0, cache_write_5m: 0, cache_write_1h: 0, cache_read: 0, output: 0, output_thinking: 0 } };
  bad.by_model = [];
  bad.by_stage_iteration_model = [];
  bad.unattributed = { requests: 0, tokens: bad.totals.tokens };
  writeFileSync(join(root, "pharn/features/f/cost.json"), JSON.stringify(bad));
  const v2 = check(root, "f", ["--verify-transcript", "--projects-dir", join(root, "projects")]);
  const v3 = check(root, "f");
  rec(
    "B5 --verify-transcript GREEN on faithful, RED on a dropped row the internal check accepts",
    v.status === 0 && v2.status === 1 && v3.status === 0,
    v2.stdout.split("\n").find((l) => l.startsWith("RED")) ?? ""
  );
}
{
  // spec boundary through the REAL mark-phase CLI: pending start before the name exists, then adopt.
  const root = world();
  const env = { CLAUDE_CODE_SESSION_ID: S };
  const p = node("mark-phase.mjs", ["--pending-start", "--base", join(root, "cost")], env);
  const t0 = JSON.parse(readFileSync(join(root, "cost", ".pending", `${S}.json`), "utf8")).ts;
  const a = node("mark-phase.mjs", ["--name", "f", "--kind", "run-start", "--adopt-pending", "--base", join(root, "cost")], env);
  node("mark-phase.mjs", ["--name", "f", "--kind", "run-stop", "--base", join(root, "cost")], env);
  const ms = readFileSync(join(root, "cost", "f", "markers.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
  const t0ms = Date.parse(t0);
  const iso = (d) => new Date(t0ms + d).toISOString();
  transcript(root, S, [line("issuer", iso(-500), S, 50), line("spec", iso(1), S, 20)]);
  const stopMs = Date.parse(ms[1].ts);
  const specInWindow = t0ms + 1 <= stopMs;
  emit(root, "f", ["--session", S]);
  const led = costOf(root, "f");
  rec(
    "B6 spec boundary via real CLI: adopted ts == pending ts, spec request counted, issuer excluded",
    p.status === 0 &&
      a.status === 0 &&
      ms[0].ts === t0 &&
      ms[0].origin === "pending" &&
      (!specInWindow || (led.totals.tokens.input === 20 && led.membership.excluded_requests === 1)),
    `specInWindow=${specInWindow} input=${led.totals.tokens.input}`
  );
}
{
  // resume in a NEW session: selected session T's pre-resume request excluded
  const root = world();
  transcript(root, T, [line("pre", "2026-09-22T11:00:00.000Z", T, 300), line("post", "2026-09-22T12:05:00.000Z", T, 6)]);
  markers(root, "f", [
    { seq: 1, kind: "run-start", ts: "2026-09-22T10:00:00.000Z", session_id: S },
    { seq: 2, kind: "stage-start", stage: "pharn-plan", ts: "2026-09-22T12:00:00.000Z", session_id: T },
    { seq: 3, kind: "run-stop", ts: "2026-09-22T12:30:00.000Z", session_id: T },
  ]);
  emit(root, "f", ["--session", T]);
  const led = costOf(root, "f");
  rec(
    "B7 resume in new session: pre-resume work of that session excluded; other session not collected",
    led.totals.tokens.input === 6 && JSON.stringify(led.sessions) === JSON.stringify([T]),
    `input=${led.totals.tokens.input}`
  );
}
{
  // dedup + subagent within window
  const root = world();
  const d = line("dup", "2026-09-22T10:05:00.000Z", S, 8);
  transcript(root, S, [d, d, line("old", "2026-09-22T09:00:00.000Z", S, 100)], {
    "agent-x": [line("sub", "2026-09-22T10:06:00.000Z", S, 4, { isSidechain: true, agentId: "agent-x" })],
  });
  markers(root, "f", [
    { seq: 1, kind: "run-start", ts: "2026-09-22T10:00:00.000Z" },
    { seq: 2, kind: "run-stop", ts: "2026-09-22T10:30:00.000Z" },
  ]);
  emit(root, "f", ["--session", S]);
  const led = costOf(root, "f");
  rec(
    "B8 dedup (8 once) + subagent (4) in window = 12",
    led.totals.tokens.input === 12 && led.totals.requests === 2,
    `input=${led.totals.tokens.input}`
  );
}

// ---- C: ship outcome applicability (through the CLI emitter + report) ----
function shipDir(root, name, reports) {
  const dir = join(root, "pharn", "features", name);
  mkdirSync(dir, { recursive: true });
  for (const [f, v] of Object.entries(reports)) writeFileSync(join(dir, f), typeof v === "string" ? v : JSON.stringify(v));
  return dir;
}
const GREEN = {
  "verify-report.json": { verdict: "PASS", failing_gates: [] },
  "regression-report.json": { verdict: "no-regressions", regressions: [] },
};
const run1 = [
  { seq: 1, kind: "run-start", ts: "2026-09-22T08:00:00.000Z" },
  { seq: 2, kind: "stage-start", stage: "pharn-regress", iteration: 1, ts: "2026-09-22T08:10:00.000Z" },
  { seq: 3, kind: "stage-start", stage: "pharn-verify", iteration: 1, ts: "2026-09-22T08:20:00.000Z" },
  { seq: 4, kind: "run-stop", ts: "2026-09-22T08:30:00.000Z" },
];
{
  const root = world();
  transcript(root, S, [line("r", "2026-09-22T10:05:00.000Z", S, 1)]);
  shipDir(root, "f", GREEN);
  markers(root, "f", [
    ...run1,
    { seq: 5, kind: "run-start", ts: "2026-09-22T10:00:00.000Z" },
    { seq: 6, kind: "stage-start", stage: "pharn-grill", ts: "2026-09-22T10:01:00.000Z" },
    { seq: 7, kind: "run-stop", ts: "2026-09-22T10:30:00.000Z" },
  ]);
  emit(root, "f", ["--session", S, "--command", "/pharn-ship"]);
  const led = costOf(root, "f");
  const md = report(root, "f");
  rec(
    "C1 new invocation + early stop + old green reports → stop:pharn-grill; verdicts labelled NOT FROM THIS RUN",
    led.outcome.decision === "stop:pharn-grill" && /NOT FROM THIS RUN/.test(md),
    led.outcome.decision
  );
}
{
  const root = world();
  transcript(root, S, [line("r", "2026-09-22T08:05:00.000Z", S, 1)]);
  shipDir(root, "f", { ...GREEN, "LOOP.md": "---\ndecision: STOP_CAP\niterations: 3\n---\n" });
  markers(root, "f", run1);
  emit(root, "f", ["--session", S, "--command", "/pharn-ship"]);
  const ship = costOf(root, "f").outcome;
  emit(root, "f", ["--session", S, "--command", "/pharn-loop"]);
  const loop = costOf(root, "f").outcome;
  rec(
    "C2 ship ignores stale LOOP.md (gate2); loop still copies LOOP.md",
    ship.decision === "gate2" && loop.decision === "STOP_CAP" && loop.source === "LOOP.md",
    `${ship.decision}/${loop.decision}`
  );
}
// ---- I: interactions ----
{
  // I1: early stop + UNAVAILABLE transcript + old green verdicts
  const root = world();
  shipDir(root, "f", GREEN);
  markers(root, "f", [
    ...run1,
    { seq: 5, kind: "run-start", ts: "2026-09-22T10:00:00.000Z" },
    { seq: 6, kind: "stage-start", stage: "pharn-grill", ts: "2026-09-22T10:01:00.000Z" },
    { seq: 7, kind: "run-stop", ts: "2026-09-22T10:30:00.000Z" },
  ]);
  emit(root, "f", ["--session", S, "--command", "/pharn-ship"]);
  const led = costOf(root, "f");
  const md = report(root, "f");
  const tok = md.split("## Tokens")[1].split("## Files")[0];
  rec(
    "I1 unavailable transcript + old greens: outcome stop:pharn-grill, ledger GREEN",
    led.outcome.decision === "stop:pharn-grill" && led.coverage === "unavailable" && check(root, "f").status === 0,
    led.coverage_note
  );
  rec(
    "I1b RUN-REPORT tokens section says usage is UNAVAILABLE (not a measured window)",
    /unavailable|UNAVAILABLE/.test(tok),
    tok.replace(/\s+/g, " ").slice(0, 600)
  );
}
{
  // I2: resumed run spanning sessions — outcome from both sessions' markers, tokens from one
  const root = world();
  transcript(root, T, [line("post", "2026-09-22T12:05:00.000Z", T, 6)]);
  shipDir(root, "f", GREEN);
  markers(root, "f", [
    { seq: 1, kind: "run-start", ts: "2026-09-22T10:00:00.000Z", session_id: S },
    { seq: 2, kind: "stage-start", stage: "pharn-regress", iteration: 1, ts: "2026-09-22T12:01:00.000Z", session_id: T },
    { seq: 3, kind: "stage-start", stage: "pharn-verify", iteration: 1, ts: "2026-09-22T12:02:00.000Z", session_id: T },
    { seq: 4, kind: "run-stop", ts: "2026-09-22T12:30:00.000Z", session_id: T },
  ]);
  emit(root, "f", ["--session", T, "--command", "/pharn-ship"]);
  const led = costOf(root, "f");
  const md = report(root, "f");
  rec(
    "I2 spanning sessions: gate2 + tokens scoped to selected session, labelled",
    led.outcome.decision === "gate2" &&
      led.totals.tokens.input === 6 &&
      /selected session/.test(md) &&
      /other sessions' requests are not/.test(md.replace(/\s+/g, " ")),
    ""
  );
}
{
  // I5: failed emission leaves the OLDER cost.json; check + report then present it
  const root = world();
  transcript(root, S, [line("r", "2026-09-22T08:05:00.000Z", S, 1)]);
  shipDir(root, "f", GREEN);
  markers(root, "f", run1);
  emit(root, "f", ["--session", S, "--command", "/pharn-ship"]);
  const before = readFileSync(join(root, "pharn/features/f/cost.json"), "utf8");
  // run 2 starts and stops at grill; its emission FAILS (bad usage — e.g. a mistyped flag)
  markers(root, "f", [
    ...run1,
    { seq: 5, kind: "run-start", ts: "2026-09-22T10:00:00.000Z" },
    { seq: 6, kind: "stage-start", stage: "pharn-grill", ts: "2026-09-22T10:01:00.000Z" },
    { seq: 7, kind: "run-stop", ts: "2026-09-22T10:30:00.000Z" },
  ]);
  const failed = emit(root, "f", ["--session", S, "--command", "/pharn-ship", "--base-sah", "abc"]);
  const after = readFileSync(join(root, "pharn/features/f/cost.json"), "utf8");
  const c = check(root, "f");
  const md = report(root, "f");
  rec(
    "I5 failed emission (exit 2) leaves the OLD cost.json; checker GREEN on it; report shows the old run's gate2",
    failed.status === 2 && before === after && c.status === 0 && /decision\s+gate2/.test(md),
    `emit exit=${failed.status}`
  );
}
for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.id}${r.detail ? `\n      ${r.detail.slice(0, 300)}` : ""}`);
const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length} probes, ${failed} FAIL`);
process.exit(failed ? 1 : 0);
