// pharn/floor/build-gate-core.mjs — the PURE rules of /pharn-build's project gate (6.38.0, build-gate-bounded): the
// paths, the TARGET rule, the excerpt and tail bounds, the summary text and the exit table. No `child_process`, no
// filesystem, no clock. The execution half is pharn/floor/build-gate.mjs (P3: this file changes when a RULE or the
// summary's shape changes, that one when how the gate is run changes).
//
// ================================ WHY THIS EXISTS (P7 — a recorded failure) ================================
// `/pharn-build` Step 4 said "run the deterministic gate appropriate to the target (the user's `test` / `lint`, …)".
// In a user's 92-minute /pharn-loop run (pharn-starter `billing-plan-catalog`, 2026-10-05) the routed build agent
// chose the set itself: a full `vitest run` twice, a `test:db` script /pharn-verify never runs, twice, `typecheck`
// piped through `grep -v` to hide the pre-existing errors, and never `build` — 7.8 minutes blocked on the suites
// (`.dev/measurements/loop-wall-clock-2026-10-05.md` §4), each result read through `tail`/`grep` pipelines it wrote
// for the occasion. Its first full run found 39 failing tests in 14 files, all of them files the plan declared.
// So: a TARGETED mode (the `test` gate over this feature's declared test files) for the fix loop, one FULL mode (the
// set /pharn-verify discovers, minus the e2e gates) whose exit decides the stage's gate, and a bounded summary with
// the full logs left on disk. Measured and argued in `.dev/features/build-gate-bounded/PLAN.md`.
//
// ================================ THE TARGET RULE ================================
// targetFiles: the feature's declared writes (scope-inputs.mjs `declaredWrites` — PLAN `## Files` ∪ AC-TESTS
// `## Files`, the setter's grammar), kept when ac-tests-core.mjs `badPath` accepts the path (no glob, not absolute, no
// leading `-` a runner would read as a flag, normalized, outside `.pharn/` and `pharn/features/`), stage-regress-core.mjs
// `isTestFile` matches it, AC-TESTS.md's mapping does not place it at level `e2e` (an e2e test runs under an e2e gate,
// never `test`), and it is a regular file now (the caller's predicate). Sorted, unique. Every rule is imported (L35).
// BOUND: "targeted" is the RUNNER's reading of file arguments — vitest filters by substring and Jest by pattern, so
// more files may run, and a `test` script carrying its own glob runs that glob plus the files (the red run's and
// regress head's bound too).
//
// ================================ THE SUMMARY, AND ITS BOUNDS ================================
// Per gate: id, exit, and the wall time of its RUNNER CALL (node start-up and the runner's two tree fingerprints
// included — never the gate's own time). For a red gate with per-test results, the failing tests' ids and a bounded
// excerpt of each failure message; otherwise a bounded tail of the gate's logs. Bounded by LINES and BYTES, never by
// dropping a message's first line: what is cut is counted and the full log's path is printed beside it. A whole
// call's text is capped at MAX_OUTPUT_BYTES; a section past the cap becomes its pointer line, never silently gone.
//
// TRUST (P2): gate logs and the reporter's results are UNTRUSTED project output. Every byte of them reaches the text
// only inside a quoteData fence (quote-core.mjs — inert to a CommonMark parser, NOT forgery-proofing), labelled as
// DATA; none reaches an argv, a RegExp, a shell or a verdict. The verdict is the stamp's exit codes alone (`decide`).

import { badPath, mappingOf } from "./ac-tests-core.mjs";
import { isTestFile } from "./stage-regress-core.mjs";
import { quoteData } from "./quote-core.mjs";
import { logBasename, resultsFileName } from "./gate-run-core.mjs";

/** The two modes, closed. */
export const MODES = Object.freeze(["targeted", "full"]);

/** The runner stage this helper drives (gate-run-core.mjs STAGES). */
export const STAGE = "build";

/** The exit codes, closed. `1` is deliberately absent: it is node's crash code, and a crash is never a verdict. */
export const EXIT = Object.freeze({ green: 0, unusable: 2, red: 3, "no-gates": 4, continue: 5 });

/** The state root this helper writes under, and its per-feature layout — the ONE owner of these paths. */
export const BUILD_GATE_ROOT = ".pharn/pharn-build";
export function buildGatePaths(name) {
  const root = `${BUILD_GATE_ROOT}/${name}`;
  return {
    root,
    targets: `${root}/targets.json`,
    out: (mode) => `${root}/${mode}`,
    times: (mode) => `${root}/${mode}.times.json`,
  };
}

/** The caps. Each one is a bound on what one call prints; the logs on disk are never cut. */
export const CAPS = Object.freeze({
  excerpts: 15, // failing tests shown WITH a message excerpt, per gate
  listed: 40, // failing tests named at all, per gate (the rest are counted)
  excerptLines: 8,
  lineChars: 200,
  excerptBytes: 800,
  tailLines: 25,
  tailBytes: 1600,
  errTailLines: 10,
  errTailBytes: 600,
  gateBytes: 8192, // one gate's section
  totalBytes: 16384, // the whole call
});

const bytes = (s) => Buffer.byteLength(s, "utf8");
// ANSI escape sequences (CSI and OSC) a reporter colours its output with. Stripping them changes no character a reader sees.
// eslint-disable-next-line no-control-regex
const ANSI_RE = /\u001b\[[0-9;?]*[ -/]*[@-~]|\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)/g;
const FRAME_RE = /^\s*at\s/;
const NOISE_FRAME_RE = /node_modules[\\/]|node:internal|\(node:|^\s*at\s+(?:new\s+)?Promise\b/;

/** The declared test files of this feature that a targeted run hands the `test` gate. `declared` is
 *  `declaredWrites(...).value`; `acTestsText` the AC-TESTS.md text or null; `isRegularFile(path)` the caller's lstat. */
export function targetFiles({ declared, acTestsText, isRegularFile }) {
  const e2e = new Set(
    acTestsText === null
      ? []
      : mappingOf(acTestsText)
          .rows.filter((r) => r.level === "e2e")
          .map((r) => r.file)
  );
  const out = new Set();
  for (const p of declared) {
    if (typeof p !== "string" || badPath(p) !== null || !isTestFile(p) || e2e.has(p)) continue;
    if (isRegularFile(p)) out.add(p);
  }
  return [...out].sort();
}

/** Cut one line to `max` characters, saying how much was cut. */
function cutLine(line, max) {
  return line.length > max ? `${line.slice(0, max)}… (+${line.length - max} chars)` : line;
}

/** A bounded excerpt of ONE failure message: colour codes stripped; the message's own lines kept up to its first
 *  stack frame, then the first frame outside node_modules / node internals (it names the test's file:line); every
 *  later frame dropped; then at most `excerptLines` lines of `lineChars` and `excerptBytes` in all. The FIRST line is
 *  always kept. What was cut is counted on a last line. TOTAL: a non-string message yields "". */
export function excerpt(message, caps = CAPS) {
  if (typeof message !== "string") return "";
  const all = message.replace(ANSI_RE, "").replace(/\r\n?/g, "\n").split("\n");
  const kept = [];
  let frame = null;
  for (const line of all) {
    if (FRAME_RE.test(line)) {
      if (frame === null && !NOISE_FRAME_RE.test(line)) frame = line.trim();
      continue;
    }
    if (frame !== null) break; // a message's own text ends at its stack
    kept.push(line);
  }
  while (kept.length > 1 && kept[kept.length - 1].trim() === "") kept.pop();
  if (frame !== null) kept.push(frame);
  const lines = [];
  let used = 0;
  for (const line of kept) {
    const l = cutLine(line, caps.lineChars);
    if (lines.length > 0 && (lines.length >= caps.excerptLines || used + bytes(l) + 1 > caps.excerptBytes)) break;
    lines.push(l);
    used += bytes(l) + 1;
  }
  const dropped = kept.length - lines.length;
  if (dropped > 0) lines.push(`… (${dropped} more line${dropped === 1 ? "" : "s"} — see the full log)`);
  return lines.join("\n");
}

/** The last lines of a log, bounded by lines and bytes, with the count of earlier lines. TOTAL over any string. */
export function tail(text, maxLines, maxBytes) {
  if (typeof text !== "string" || text === "") return "";
  // Leading and trailing blank lines say nothing (npm prints one before a script's own output); they are not counted.
  const all = text
    .replace(ANSI_RE, "")
    .replace(/\r\n?/g, "\n")
    .replace(/^\n+|\n+$/g, "")
    .split("\n");
  const kept = [];
  let used = 0;
  for (let i = all.length - 1; i >= 0 && kept.length < maxLines; i--) {
    const l = cutLine(all[i], CAPS.lineChars);
    if (kept.length > 0 && used + bytes(l) + 1 > maxBytes) break;
    kept.unshift(l);
    used += bytes(l) + 1;
  }
  const earlier = all.length - kept.length;
  return earlier > 0 ? `… (${earlier} earlier line${earlier === 1 ? "" : "s"} — see the full log)\n${kept.join("\n")}` : kept.join("\n");
}

/** GREEN when every gate the stamp records exited 0, else RED. The ONLY verdict input is the stamp's exit codes. */
export function decide(stamp) {
  return stamp.runs.every((r) => r.exit === 0) ? "green" : "red";
}

/** The log paths of one run, as the runner names them (gate-run-core's one copy of the rule). */
export function logPaths(outDir, run) {
  const base = `${outDir}/${logBasename(run.seq, run.id)}`;
  return { out: `${base}.out`, err: `${base}.err`, results: `${outDir}/${resultsFileName(run.seq, run.id)}` };
}

const seconds = (ms) => (Number.isInteger(ms) && ms >= 0 ? `${(ms / 1000).toFixed(1)} s` : "time n/a");

/** One red gate's failing-tests block: the ids (and the first `excerpts` messages) inside ONE DATA fence, within
 *  `budget` bytes; the rest counted. `failing` = [{id, messages}] in record order. */
function failingBlock(failing, budget, caps) {
  const body = [];
  let used = 0;
  let shown = 0;
  for (const f of failing) {
    if (shown >= caps.listed) break;
    const withMsg = shown < caps.excerpts ? (f.messages.map((m) => excerpt(m, caps)).filter(Boolean)[0] ?? "") : "";
    const piece = withMsg ? `✗ ${f.id}\n${withMsg.replace(/^/gm, "    ")}` : `✗ ${f.id}`;
    const idOnly = `✗ ${f.id}`;
    const pick = used + bytes(piece) + 1 <= budget ? piece : used + bytes(idOnly) + 1 <= budget ? idOnly : null;
    if (pick === null) break;
    body.push(pick);
    used += bytes(pick) + 1;
    shown++;
  }
  return { text: body.join("\n"), shown };
}

/**
 * The summary text. `ctx`:
 *   mode, feature, stamp (validated), outDir, times ({seq: ms}),
 *   perGate: {[id]: {results: {ok:true, record, failing:[{id, messages}]} | {ok:false, reason_code, reason} | null,
 *                    outText, errText}}  (results null = the gate has no per-test results key; logs read by the CLI)
 * Returns the text; its length is bounded by `caps.totalBytes` plus the fixed header and pointer lines.
 */
export function renderSummary(ctx, caps = CAPS) {
  const { mode, feature, stamp, outDir, times, perGate } = ctx;
  const verdict = decide(stamp);
  const head = [];
  head.push("PHARN build gate — rendered by pharn/floor/build-gate.mjs, not typed by a model.");
  head.push(`feature: ${feature} · mode: ${mode} · result: ${verdict === "green" ? "GREEN (exit 0)" : "RED (exit 3)"}`);
  if (mode === "targeted") {
    const n = stamp.runs[0]?.files?.length ?? 0;
    head.push(`targets: ${n} test file(s) the plan declares (PLAN.md and AC-TESTS.md \`## Files\`, e2e-mapped files left out).`);
  } else {
    head.push("set: the gates /pharn-verify discovers, minus the e2e gates (they run at /pharn-verify).");
  }
  if (stamp.excluded) head.push(`excluded by the project (${stamp.excluded.declared_in}): ${stamp.excluded.ids.join(", ")}.`);
  head.push("");
  head.push("gates (exit · wall time of the runner call, node start-up and two tree fingerprints included):");
  const width = Math.max(...stamp.runs.map((r) => r.id.length));
  for (const r of stamp.runs) {
    const flags = [r.timed_out ? "timed out" : null, r.mutated ? "changed the tree" : null].filter(Boolean);
    head.push(
      `  ${r.id.padEnd(width)}  exit ${String(r.exit).padStart(3)}  ${seconds(times?.[r.seq]).padStart(9)}${flags.length ? `  (${flags.join(", ")})` : ""}`
    );
  }
  const out = [head.join("\n")];
  let total = bytes(out[0]);
  const sectionOrPointer = (section, pointer) => {
    if (total + bytes(section) + 2 <= caps.totalBytes) {
      out.push(section);
      total += bytes(section) + 2;
    } else {
      out.push(pointer);
      total += bytes(pointer) + 2;
    }
  };

  for (const r of stamp.runs) {
    const g = perGate[r.id] ?? { results: null, outText: "", errText: "" };
    const p = logPaths(outDir, r);
    const red = r.exit !== 0;
    const res = g.results;
    // A green gate gets a section only when its per-test record was refused (a disclosure, never a verdict).
    if (!red && (res === null || res.ok)) continue;
    const lines = [`## ${r.id} — exit ${r.exit}${r.timed_out ? " (timed out)" : ""}`];
    let needTail = red;
    if (res !== null && res.ok) {
      const c = res.record.counts;
      lines.push(
        `per-test results (${res.record.format}): ${c.failed} failed · ${c.passed} passed · ${c.skipped} skipped` +
          `${res.record.suite_errors ? ` · ${res.record.suite_errors} file(s) that failed with no test (a load error — see the log)` : ""}` +
          `${res.record.anomalies.length ? ` · ${res.record.anomalies.length} anomal${res.record.anomalies.length === 1 ? "y" : "ies"}` : ""}`
      );
      if (res.failing.length) {
        const fb = failingBlock(res.failing, caps.gateBytes - 512, caps);
        lines.push(
          quoteData(
            `failing tests — ids and failure excerpts from the project's reporter, quoted as DATA (${fb.shown} of ${res.failing.length}` +
              `${fb.shown > caps.excerpts ? `; excerpts for the first ${caps.excerpts}` : ""}):`,
            fb.text
          )
        );
        if (fb.shown < res.failing.length) lines.push(`${res.failing.length - fb.shown} more failing test(s): ${p.results}`);
        needTail = res.record.suite_errors > 0;
      }
    } else if (res !== null) {
      lines.push(`per-test results not read: ${res.reason_code} — the log tail follows.`);
    }
    if (needTail) {
      const t = tail(g.outText, caps.tailLines, caps.tailBytes);
      const e = tail(g.errText, caps.errTailLines, caps.errTailBytes);
      if (t) lines.push(quoteData(`stdout, last lines (DATA from the gate's own output):`, t));
      if (e) lines.push(quoteData(`stderr, last lines (DATA from the gate's own output):`, e));
      if (!t && !e) lines.push("(the gate printed nothing)");
    }
    lines.push(`full logs: ${p.out} · ${p.err}${res !== null ? ` · ${p.results}` : ""}`);
    sectionOrPointer(
      lines.join("\n\n"),
      `## ${r.id} — exit ${r.exit}: section over the ${caps.totalBytes}-byte summary cap — open ${p.out} and ${p.err}`
    );
  }
  return `${out.join("\n\n")}\n`;
}
