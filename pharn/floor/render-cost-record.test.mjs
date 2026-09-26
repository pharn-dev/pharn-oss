// pharn/floor/render-cost-record.test.mjs — hermetic tests for the measured token-cost renderer. Imports the
// module directly (render-ship-briefing.mjs's export-for-testing convention); every test builds a fresh
// scratch "projects" tree, so nothing ever reads the real ~/.claude.
//
// The transcript reader itself — the lookup, the walk and `sessionRequests()` — lives in
// `transcript-core.mjs` since 6.24.1, and its own tests are in `transcript-core.test.mjs`. This file tests
// the RECORD BLOCK built on it, and shows the block follows that one owner.
//
// The marked groups pin the things that would otherwise be silent forks:
//   ★ DEDUP — one API request is written as SEVERAL transcript lines, so summing every line over-counts
//     (2.34x on the 2026-08-18 corpus) and each request is counted ONCE. Those lines need NOT carry the
//     same usage (measured 2026-09-26), so each request counts at the usage the reader selects. The ★
//     COMPLETED USAGE group pins the block's totals over the fixture holding the three measured shapes. This
//     is the single defect most likely to make every reported number quietly wrong — and until 6.24.1 it did.
//   ✧ ISOLATION — only the named session is read, a session id resolving to more than one transcript
//     directory is REFUSED rather than guessed, and tool-results/ is never walked.
//   ✦ DETERMINISM — rendering twice over unchanged bytes yields byte-identical output (no clock, no random).
//   ⚑ LOOKUP — the transcript is located by SESSION ID (a filename test), never by deriving a directory
//     name from `cwd`. The directory name is opaque to this module on purpose: it is a platform rule this
//     repo cannot pin, and measurement showed it is not a function of the session's cwd at all (a Claude
//     Code worktree session is filed under the WORKTREE while its records carry the MAIN REPO as cwd, and
//     `cwd` is not even stable within one session). Fixtures below therefore spell directory names
//     LITERALLY, in the shapes observed on a real machine — a helper that derived them would rebuild the
//     defect it is meant to catch (lessons-learned L41: a fixture built by the function under test).
//
// `scratch()` takes `dirName` EXPLICITLY for that reason. Do not reintroduce a derivation helper.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdtempSync, writeFileSync, mkdirSync, chmodSync, cpSync, readFileSync, readdirSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { render, aggregate, SCHEMA, COVERAGE } from "./render-cost-record.mjs";
import { findTranscriptDirs } from "./transcript-core.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const CLI = join(here, "render-cost-record.mjs");
const CWD = "/work/repo";

// Directory names observed on a real machine (anonymised to this file's /Users/x/ convention). The
// platform replaces `/` AND `.`, and leaves `_` alone — but NOTHING here derives them; they are data.
const DIR_PLAIN = "-Users-x-Projects-repo";
const DIR_WORKTREE = "-Users-x-Projects-repo--claude-worktrees-wt"; // from …/repo/.claude/worktrees/wt
const DIR_DOTTED = "-Users-x-Projects-my-app-v1-2";
const DIR_UNDERSCORE = "-Users-x-Projects-repo_";

function usage({ input = 0, w1h = 0, w5m = 0, read = 0, out = 0, think = 0 } = {}) {
  return {
    input_tokens: input,
    // The platform publishes BOTH the split and its total. Fixtures carry both, agreeing, because that
    // is what EVERY deduped request carried when measured — no exceptions found, rather than a count
    // that would only set a new expiry date (L47). Numbers: .dev/measurements/cost-record-lookup-2026-09-21.md.
    cache_creation_input_tokens: w1h + w5m,
    cache_creation: { ephemeral_1h_input_tokens: w1h, ephemeral_5m_input_tokens: w5m },
    cache_read_input_tokens: read,
    output_tokens: out,
    output_tokens_details: { thinking_tokens: think },
  };
}

function rec(requestId, u, extra = {}) {
  return JSON.stringify({
    type: "assistant",
    requestId,
    cwd: extra.cwd ?? CWD,
    timestamp: extra.timestamp ?? "2026-08-18T10:00:00.000Z",
    attributionSkill: extra.stage,
    message: { model: extra.model ?? "claude-opus-5", usage: u },
  });
}

/**
 * Build a scratch projects dir containing one session transcript.
 * `dirName` is the LITERAL project-directory name — never derived (see the ⚑ LOOKUP note above).
 */
function scratch({ session = "s1", lines = [], nested = {}, extra = {}, dirName = DIR_PLAIN } = {}) {
  const root = mkdtempSync(join(tmpdir(), "cost-record-"));
  const proj = join(root, dirName);
  mkdirSync(proj, { recursive: true });
  writeFileSync(join(proj, `${session}.jsonl`), lines.join("\n") + "\n");
  for (const [rel, content] of Object.entries(nested)) {
    const p = join(proj, session, rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, content);
  }
  for (const [rel, content] of Object.entries(extra)) {
    const p = join(proj, rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, content);
  }
  return { root, proj };
}

const call = (root, opts = {}) => render({ sessionId: opts.sessionId ?? "s1", projectsDir: root });

// ─── ⚑ LOOKUP ────────────────────────────────────────────────────────────────────────────────────────

test("⚑ LOOKUP: a WORKTREE-shaped directory name resolves — the name is never derived from cwd", () => {
  // Non-vacuity (L34): this case FAILS against the pre-change module, which derived the directory from
  // cwd and so produced `-Users-x-Projects-repo-.claude-worktrees-wt` (one hyphen, dot kept) for the
  // only cwd that could have produced this directory. Measured before the change, not asserted.
  const { root } = scratch({ dirName: DIR_WORKTREE, lines: [rec("r1", usage({ out: 42 }))] });
  const o = call(root);
  assert.equal(o.coverage, "partial");
  assert.equal(o.tokens.output, 42);
});

test("⚑ LOOKUP: a directory name containing dots-as-hyphens resolves", () => {
  const { root } = scratch({ dirName: DIR_DOTTED, lines: [rec("r1", usage({ out: 7 }))] });
  assert.equal(call(root).tokens.output, 7);
});

test("⚑ LOOKUP: an underscore in the directory name resolves (the platform leaves `_` alone)", () => {
  const { root } = scratch({ dirName: DIR_UNDERSCORE, lines: [rec("r1", usage({ out: 5 }))] });
  assert.equal(call(root).tokens.output, 5);
});

test("⚑ LOOKUP: a transcript recording a DIFFERENT cwd is REPORTED, not refused", () => {
  // The retired cwd-mismatch refusal fired on legitimate runs: a worktree session records 2-3 distinct
  // cwds and the renderer only ever saw the first. With a UUID session key the collision it guarded
  // against cannot arise, so the honest answer is to report the run the id names.
  const { root } = scratch({
    dirName: DIR_WORKTREE,
    lines: [rec("r1", usage({ out: 11 }), { cwd: "/somewhere/else" })],
  });
  const o = call(root);
  assert.equal(o.coverage, "partial", "a differing cwd must no longer suppress the report");
  assert.equal(o.tokens.output, 11);
});

test("✧ ISOLATION: a session id in TWO directories is REFUSED — never first-match-wins", () => {
  const root = mkdtempSync(join(tmpdir(), "cost-record-"));
  for (const d of [DIR_PLAIN, DIR_WORKTREE]) {
    mkdirSync(join(root, d), { recursive: true });
    writeFileSync(join(root, d, "s1.jsonl"), rec("r1", usage({ out: 10 })) + "\n");
  }
  assert.equal(findTranscriptDirs(root, "s1").length, 2);
  const o = call(root);
  assert.equal(o.coverage, "unavailable");
  assert.match(o.coverage_note, /resolves to 2 transcript directories/);
  assert.equal(o.requests, 0, "a refusal reports nothing, never a partial guess");
});

test("✧ ISOLATION: only the named session is read; a sibling session in the same dir is ignored", () => {
  const { root, proj } = scratch({ lines: [rec("r1", usage({ out: 10 }))] });
  writeFileSync(join(proj, "other.jsonl"), rec("foreign", usage({ out: 999 })) + "\n");
  assert.equal(call(root).tokens.output, 10);
});

// ─── error paths: an honest block, never a throw ─────────────────────────────────────────────────────

test("honest absence: no session id -> unavailable, never a throw", () => {
  const o = render({ sessionId: null, projectsDir: "/nope" });
  assert.equal(o.coverage, "unavailable");
  assert.equal(o.session_id, null);
  assert.equal(o.requests, 0);
});

test("honest absence: a MISSING projects dir -> unavailable, never a throw", () => {
  // readdirSync throws on a missing directory; a fresh machine (or a wrong CLAUDE_CONFIG_DIR) is a real
  // state, and /pharn-ship embeds this block verbatim, so a stack trace would break its caller.
  const o = render({ sessionId: "s1", projectsDir: join(tmpdir(), "definitely-not-here-xyz-9731") });
  assert.equal(o.coverage, "unavailable");
  assert.match(o.coverage_note, /no transcript found for session s1/);
});

test("honest absence: an UNREADABLE projects dir -> unavailable, never a throw", { skip: process.getuid?.() === 0 }, () => {
  const root = mkdtempSync(join(tmpdir(), "cost-record-"));
  chmodSync(root, 0o000);
  try {
    const o = render({ sessionId: "s1", projectsDir: root });
    assert.equal(o.coverage, "unavailable");
  } finally {
    chmodSync(root, 0o700);
  }
});

test("honest absence: a projects dir with no matching session -> unavailable", () => {
  const { root } = scratch({ lines: [rec("r1", usage())] });
  const o = render({ sessionId: "missing-session", projectsDir: root });
  assert.equal(o.coverage, "unavailable");
  assert.equal(o.requests, 0);
});

test("honest absence: a LOCATED directory that yields no transcript -> unavailable, never a zero `partial`", () => {
  // REVIEW F1. A hit means `<dir>/<id>.jsonl` statted, NOT that aggregate can read a transcript out of
  // `<dir>`. An id holding a path separator satisfies the stat against a file ABOVE the project dir and
  // then escapes aggregate's walk, so files===0 with hits===1. Without the guard this rendered
  // `coverage: "partial"` with zero requests — an absence dressed as a cheap run, embedded verbatim into
  // ship-record.json. The same state is reachable by a TOCTOU unlink, which no test can stage reliably.
  const root = mkdtempSync(join(tmpdir(), "cost-record-"));
  mkdirSync(join(root, DIR_PLAIN), { recursive: true });
  writeFileSync(join(root, "escaped.jsonl"), rec("r1", usage({ out: 99 })) + "\n");
  assert.equal(findTranscriptDirs(root, "../escaped").length, 1, "precondition: the stat DOES hit");
  const o = render({ sessionId: "../escaped", projectsDir: root });
  assert.equal(o.coverage, "unavailable", "a located-but-empty aggregate must not report `partial`");
  assert.equal(o.requests, 0);
  assert.match(o.coverage_note, /no transcript found for session/);
});

test("a non-directory entry beside the project dirs is skipped, never stat-ed as a parent", () => {
  const { root } = scratch({ lines: [rec("r1", usage({ out: 3 }))] });
  writeFileSync(join(root, "stray-file.txt"), "not a project dir\n");
  assert.equal(call(root).tokens.output, 3);
});

// ─── ★ DEDUP ─────────────────────────────────────────────────────────────────────────────────────────

test("★ DEDUP: repeated lines sharing one requestId are counted ONCE", () => {
  const u = usage({ read: 1000, out: 100 });
  const { root } = scratch({ lines: [rec("r1", u), rec("r1", u), rec("r1", u), rec("r2", u)] });
  const o = call(root);
  assert.equal(o.requests, 2, "4 records, 2 distinct requestIds");
  assert.equal(o.tokens.cache_read, 2000);
  assert.equal(o.tokens.output, 200);
});

test("★ DEDUP: a naive sum would have over-counted — the guard is real, not decorative", () => {
  const u = usage({ out: 10 });
  const lines = ["a", "a", "b", "b", "b", "c"].map((id) => rec(id, u));
  const o = call(scratch({ lines }).root);
  assert.equal(o.requests, 3);
  assert.equal(o.tokens.output, 30, "not 60 — the raw line count");
});

test("dedup falls back to message.id when requestId is absent", () => {
  const line = JSON.stringify({
    type: "assistant",
    cwd: CWD,
    timestamp: "2026-08-18T10:00:00.000Z",
    message: { id: "m1", model: "claude-opus-5", usage: usage({ out: 7 }) },
  });
  const o = call(scratch({ lines: [line, line] }).root);
  assert.equal(o.requests, 1);
  assert.equal(o.tokens.output, 7);
});

test("nested subagent transcripts are INCLUDED — else fan-out is invisible", () => {
  const { root } = scratch({
    lines: [rec("parent", usage({ out: 10 }))],
    nested: { "subagents/agent-a.jsonl": rec("child1", usage({ out: 5 })) + "\n" },
  });
  const o = call(root);
  assert.equal(o.requests, 2);
  assert.equal(o.tokens.output, 15);
  assert.equal(o.transcript_files, 2);
});

test("✧ ISOLATION: tool-results/ is never walked (captured tool output, no usage)", () => {
  const { root } = scratch({
    lines: [rec("r1", usage({ out: 10 }))],
    nested: { "tool-results/x.jsonl": rec("leak", usage({ out: 999 })) + "\n" },
  });
  assert.equal(call(root).tokens.output, 10);
});

// ─── token classes ───────────────────────────────────────────────────────────────────────────────────

test("every token class is summed SEPARATELY — cached and uncached are never blended", () => {
  const { root } = scratch({
    lines: [rec("r1", usage({ input: 1, w1h: 2, w5m: 4, read: 8, out: 16, think: 32 }))],
  });
  const t = call(root).tokens;
  assert.deepEqual(t, { input_uncached: 1, cache_write_1h: 2, cache_write_5m: 4, cache_read: 8, output: 16, thinking: 32 });
});

test("INVARIANT: cache_write_1h + cache_write_5m == the record's cache_creation_input_tokens", () => {
  // Measured 2026-09-21 over this repo's own transcripts: 8068/8068 deduped requests carried the
  // `cache_creation` object with the split equal to `cache_creation_input_tokens`; 0 mismatches, 0
  // absent-with-nonzero-total, 0 unaccounted remainder. Pinned as an INVARIANT rather than as that
  // count, which would be a fresh expiry date (lessons-learned L47). The residual is named and
  // deliberately unbuilt: a future record carrying the total with NO split would count 0 here, because
  // the output shape has no bucket for an unsplit total — see the module header.
  const cases = [
    { w1h: 0, w5m: 0 },
    { w1h: 1000, w5m: 0 },
    { w1h: 0, w5m: 250 },
    { w1h: 4096, w5m: 8192 },
  ];
  for (const c of cases) {
    const u = usage(c);
    const { root } = scratch({ lines: [rec("r1", u)] });
    const t = call(root).tokens;
    assert.equal(
      t.cache_write_1h + t.cache_write_5m,
      u.cache_creation_input_tokens,
      `split must account for the whole of cache_creation_input_tokens (${JSON.stringify(c)})`
    );
  }
});

test("a record with NO usage, and a non-assistant record, contribute nothing", () => {
  const { root } = scratch({
    lines: [
      rec("r1", usage({ out: 10 })),
      JSON.stringify({ type: "user", cwd: CWD, message: { content: "x" } }),
      JSON.stringify({ type: "assistant", requestId: "no-usage", cwd: CWD, message: { model: "claude-opus-5" } }),
    ],
  });
  const o = call(root);
  assert.equal(o.requests, 1);
  assert.equal(o.tokens.output, 10);
});

test("a <synthetic> model record is skipped — not a real API call", () => {
  const { root } = scratch({
    lines: [rec("r1", usage({ out: 10 })), rec("r2", usage({ out: 999 }), { model: "<synthetic>" })],
  });
  const o = call(root);
  assert.equal(o.requests, 1);
  assert.equal(o.tokens.output, 10);
});

test("a torn/malformed final line is skipped, never thrown on (a live session is mid-write)", () => {
  const { root, proj } = scratch({ lines: [rec("r1", usage({ out: 10 }))] });
  writeFileSync(join(proj, "s1.jsonl"), rec("r1", usage({ out: 10 })) + '\n{"type":"assis');
  assert.equal(call(root).tokens.output, 10);
});

// ─── grouping ────────────────────────────────────────────────────────────────────────────────────────

test("by_stage groups on attributionSkill; untagged records land in an honest bucket", () => {
  const { root } = scratch({
    lines: [
      rec("r1", usage({ out: 10 }), { stage: "pharn-build" }),
      rec("r2", usage({ out: 5 }), { stage: "pharn-verify" }),
      rec("r3", usage({ out: 1 })),
    ],
  });
  const o = call(root);
  assert.deepEqual(Object.keys(o.by_stage), ["(untagged)", "pharn-build", "pharn-verify"], "sorted");
  assert.equal(o.by_stage["(untagged)"].tokens.output, 1);
  assert.equal(o.by_stage["pharn-build"].requests, 1);
});

test("by_model groups on the recorded model id", () => {
  const { root } = scratch({
    lines: [rec("r1", usage({ out: 10 }), { model: "claude-opus-5" }), rec("r2", usage({ out: 5 }), { model: "claude-haiku-4-5" })],
  });
  const o = call(root);
  assert.deepEqual(Object.keys(o.by_model), ["claude-haiku-4-5", "claude-opus-5"], "sorted");
  assert.equal(o.by_model["claude-opus-5"].tokens.output, 10);
});

test("the window comes from the records' OWN timestamps, never a clock read", () => {
  const { root } = scratch({
    lines: [
      rec("r1", usage({ out: 1 }), { timestamp: "2026-08-18T12:00:00.000Z" }),
      rec("r2", usage({ out: 1 }), { timestamp: "2026-08-18T09:00:00.000Z" }),
    ],
  });
  const o = call(root);
  assert.equal(o.window_start, "2026-08-18T09:00:00.000Z");
  assert.equal(o.window_end, "2026-08-18T12:00:00.000Z");
});

// ─── shape ───────────────────────────────────────────────────────────────────────────────────────────

test("COVERAGE has no `complete` member — a run can never fully account for itself", () => {
  assert.deepEqual([...COVERAGE], ["partial", "unavailable"]);
});

test("both shapes carry the schema and the dedup key", () => {
  const { root } = scratch({ lines: [rec("r1", usage({ out: 1 }))] });
  for (const o of [call(root), render({ sessionId: null, projectsDir: root })]) {
    assert.equal(o.schema, SCHEMA);
    assert.equal(o.dedup_key, "requestId");
    assert.ok(COVERAGE.includes(o.coverage));
  }
});

test("aggregate over an empty directory yields zeros, not a throw", () => {
  const root = mkdtempSync(join(tmpdir(), "cost-record-"));
  const a = aggregate(root, "s1");
  assert.equal(a.files, 0);
  assert.equal(a.total.requests, 0);
});

test("✦ DETERMINISM: rendering twice over unchanged bytes is byte-identical", () => {
  const { root } = scratch({
    lines: [rec("r1", usage({ out: 10 }), { stage: "a" }), rec("r2", usage({ out: 5 }), { stage: "b" })],
  });
  assert.equal(JSON.stringify(call(root)), JSON.stringify(call(root)));
});

// ─── ★ COMPLETED USAGE — the record block over lines that disagree (6.24.1) ──────────────────────────
//
// `fixtures/cost-ledger/usage-snapshots/` holds one request written as 8, 8, 163, one re-appended later with
// zeroed counts, and one whose early line a forked subagent's transcript copies (described in full in
// transcript-core.test.mjs, where the reader's per-request tests live). These tests pin what the RECORD
// BLOCK does with them: it is a consumer of the one owner, and L52's set is every consumer.

const SNAP_SESSION = "00000000-0000-4000-8000-00000000beef";
const SNAP_FIXTURE = join(here, "fixtures", "cost-ledger", "usage-snapshots");

/** Stage the committed fixture under a literal project-directory name (the ⚑ LOOKUP convention). */
function stageSnapshots() {
  const root = mkdtempSync(join(tmpdir(), "cost-record-snap-"));
  const proj = join(root, DIR_PLAIN);
  cpSync(SNAP_FIXTURE, proj, { recursive: true });
  return { root, proj };
}

/** The sums a max-output rule must produce, written as sums so a reader can check them by hand. */
const MAX_RULE = Object.freeze({
  requests: 5,
  input_uncached: 2 + 2 + 3 + 32 + 4,
  cache_write_1h: 764 + 100 + 23271,
  cache_write_5m: 2129 + 200,
  cache_read: 198172 + 223446 + 1000 + 231020 + 2000,
  output: 163 + 522 + 100 + 16886 + 50,
  thinking: 22 + 0 + 0 + 6839 + 10,
});

test("★ COMPLETED USAGE: the block counts each request at its line with the greatest output_tokens — 8, 8, 163 counts 163", () => {
  const { root } = stageSnapshots();
  const o = render({ sessionId: SNAP_SESSION, projectsDir: root });
  assert.equal(o.coverage, "partial");
  assert.equal(o.transcript_files, 2);
  const { requests, ...tokens } = MAX_RULE;
  assert.equal(o.requests, requests, "five requests across two files — C's fork copy is not a sixth");
  assert.deepEqual(o.tokens, tokens);
  assert.equal(o.window_start, "2026-09-26T10:00:00.901Z", "the window reads each request's FIRST line");
});

test("✦ DETERMINISM holds over the per-request selection: two files, disagreeing lines, rendered twice", () => {
  const { root } = stageSnapshots();
  const once = JSON.stringify(render({ sessionId: SNAP_SESSION, projectsDir: root }));
  assert.equal(once, JSON.stringify(render({ sessionId: SNAP_SESSION, projectsDir: root })));
});

test("★ MUTANT CONTROL: the block FOLLOWS the owner — a first-line transcript-core.mjs makes it read 8 (L52, L60)", () => {
  // The whole product floor is copied, then ONLY the owner's rule is mutated. If this renderer still carried
  // its own copy of the reading loop, the mutated floor would count 163 like the control.
  const source = readFileSync(join(here, "transcript-core.mjs"), "utf8");
  const ANCHOR = "else if (outputRank(u) > outputRank(seen.usage)) seen.usage = u;";
  assert.equal(source.split(ANCHOR).length, 2, "the rule's anchor must occur exactly once");
  const mutant = source.replace(ANCHOR, "// MUTANT: the first line's usage is kept");
  assert.notEqual(mutant, source);
  const outputWith = (coreSource) => {
    const dir = mkdtempSync(join(tmpdir(), "cost-record-floor-"));
    for (const f of readdirSync(here)) {
      if (f.endsWith(".mjs") && !f.endsWith(".test.mjs")) copyFileSync(join(here, f), join(dir, f));
    }
    writeFileSync(join(dir, "transcript-core.mjs"), coreSource);
    const { root } = stageSnapshots();
    const r = spawnSync(process.execPath, [join(dir, "render-cost-record.mjs"), "--session", SNAP_SESSION, "--projects-dir", root], {
      encoding: "utf8",
    });
    assert.equal(r.status, 0, r.stderr);
    return JSON.parse(r.stdout).tokens.output;
  };
  assert.equal(outputWith(source), MAX_RULE.output, "CONTROL: the unmutated copy runs and counts the completed lines");
  assert.equal(outputWith(mutant), MAX_RULE.output - 163 + 8, "the mutated owner: nothing in the renderer compensates");
});

// ─── CLI ─────────────────────────────────────────────────────────────────────────────────────────────

const runCli = (args, env = {}) => spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8", env: { ...process.env, ...env } });

test("CLI: prints the block and exits 0", () => {
  const { root } = scratch({ lines: [rec("r1", usage({ out: 10 }))] });
  const r = runCli(["--session", "s1", "--projects-dir", root]);
  assert.equal(r.status, 0);
  const o = JSON.parse(r.stdout);
  assert.equal(o.tokens.output, 10);
});

test("CLI: an unknown argument exits 2 and names itself (the entry-point-guard contract)", () => {
  const r = runCli(["--nope"]);
  assert.equal(r.status, 2);
  assert.equal(r.stderr, "render-cost-record: unknown argument --nope\n");
});

test("CLI: --cwd is GONE and is reported as unknown, not silently accepted", () => {
  const r = runCli(["--cwd", "/work/repo"]);
  assert.equal(r.status, 2, "a retired flag must fail loudly, never no-op");
  assert.equal(r.stderr, "render-cost-record: unknown argument --cwd\n");
});

test("CLI: the projectsDir DEFAULT resolves from CLAUDE_CONFIG_DIR when --projects-dir is absent", () => {
  // lessons-learned L41: every other case here passes --projects-dir for hermeticity, which is exactly
  // what leaves a default reachable only from production. This case reaches it on purpose.
  const home = mkdtempSync(join(tmpdir(), "cost-record-home-"));
  const proj = join(home, "projects", DIR_WORKTREE);
  mkdirSync(proj, { recursive: true });
  writeFileSync(join(proj, "s1.jsonl"), rec("r1", usage({ out: 77 })) + "\n");
  const r = runCli(["--session", "s1"], { CLAUDE_CONFIG_DIR: home });
  assert.equal(r.status, 0);
  assert.equal(JSON.parse(r.stdout).tokens.output, 77, "the CLAUDE_CONFIG_DIR arm of the default was not taken");
});

test(
  "CLI: the projectsDir DEFAULT falls back to the home directory when CLAUDE_CONFIG_DIR is unset",
  {
    skip: process.platform === "win32" ? "homedir() reads USERPROFILE on win32" : false,
  },
  () => {
    const home = mkdtempSync(join(tmpdir(), "cost-record-home-"));
    const proj = join(home, ".claude", "projects", DIR_PLAIN);
    mkdirSync(proj, { recursive: true });
    writeFileSync(join(proj, "s1.jsonl"), rec("r1", usage({ out: 88 })) + "\n");
    const r = runCli(["--session", "s1"], { HOME: home, CLAUDE_CONFIG_DIR: undefined });
    assert.equal(r.status, 0);
    assert.equal(JSON.parse(r.stdout).tokens.output, 88, "the homedir() arm of the default was not taken");
  }
);

test("CLI: the session id is read from CLAUDE_CODE_SESSION_ID when --session is absent", () => {
  const { root } = scratch({ session: "env-session", lines: [rec("r1", usage({ out: 21 }))] });
  const r = runCli(["--projects-dir", root], { CLAUDE_CODE_SESSION_ID: "env-session" });
  assert.equal(r.status, 0);
  assert.equal(JSON.parse(r.stdout).session_id, "env-session");
});
