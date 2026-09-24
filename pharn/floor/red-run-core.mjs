#!/usr/bin/env node
// pharn/floor/red-run-core.mjs — /pharn-test's RED RUN, decided: the preflight (does every AC's level have a runner
// with per-test results?), the binding of a finished ac-test stamp to the mapping and the live tree, and the per-AC
// verdict (did each AC's test fail before the build, for the one reason the record can tell apart?). Contract:
// pharn/pharn-contracts/ac-tests.md, "The red run".
//
// WHY (the queue's item 04, the maintainer's decision — P7): item 03's `/pharn-test` wrote and locked the AC tests but
// never ran them, so a test that cannot fail, is never collected, or is skipped passed unnoticed. The red run runs
// them BEFORE the build and requires each to fail. This module is the floor under that; check-red-run.mjs is its CLI
// and ac-tests-lock.mjs `--record-red-run` re-derives the same verdict before it records anything (L22: the model
// never types the evidence).
//
// P3: it changes when "red for the right reason" changes. The mapping grammar is ac-tests-core.mjs's, the per-test
// record test-results-core.mjs's, the level→gate table gate-run-core.mjs's; this file imports all three and restates
// none.
//
// THE VERDICT, per AC (row `AC-<n> | <level> | <file>`), over the per-test record of EVERY gate its level maps to:
//   • the gate is in the stamp, else `ac-level-unavailable`;
//   • each such gate's record is available, else item 01's own reason (`not-configured`, `results-unavailable`, …),
//     fatal here, by its own name;
//   • entries MATCH when their `file` EQUALS the mapped file (exactly — no case-folding, fail-closed on a
//     case-sensitive volume, grill G13) and their LEAF title starts `AC-<n>:` — never a suite-wide title match,
//     because other features' AC tests share the suite and reuse the ids. Matches are unioned across the gates;
//   • ≥1 match, else `ac-test-not-collected`; none `passed`, else `ac-test-passes-before-build`; none `skipped`, else
//     `ac-test-skipped`. The gate's exit is expected non-zero and is NOT the verdict.
//
// WHAT "FOR THE RIGHT REASON" MEANS HERE, and no more (P0): the record distinguishes COLLECTED-AND-FAILED from
// NOT-COLLECTED (a file that failed to load — a syntax error, or a top-level import of a module the build has not
// written yet, measured on a real vitest run). It cannot tell a test that fails because the behaviour is missing from
// one that fails on a typo in its own body: both are `failed`. That is advisory, and the contract says so.
//
// THE BINDING (grill G1): a verdict is only about THIS mapping's run over THIS tree. bindStamp() requires the stamp to
// validate as `ac-test` for the feature, each run's `files` to equal the mapped files for that gate
// (gate-run-core.mjs acFilesFor), every run to be a gate some level needs, the runs to be EXACTLY what `init` resolves
// now from `<root>/package.json` and the mapping (ids, order, commands, files), and the LIVE fingerprint to equal
// `stamp.fingerprint.final` — the lock and the test files are in the fingerprint, so a test edit or a lock rewrite
// after the run breaks it. Bounded: AGREEMENT, never provenance — a self-consistent fabricated stamp and results set
// over the live tree passes (L43).
//
// TRUST (P2): test ids and titles are untrusted DATA from the project's reporter. They are compared as strings, copied
// into the lock as data, and never interpreted.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { acRowsOf } from "./ac-tests-core.mjs";
import { LEVEL_GATES, acFilesFor, discoverGates, resolveSet, validateStamp } from "./gate-run-core.mjs";
import { RECORD_REASONS, formatFor, loadResultsConfig, testRecord } from "./test-results-core.mjs";
import { fingerprint } from "./worktree-fingerprint.mjs";

/** The red run's OWN reasons. An AC whose gate record is refused carries item 01's RECORD_REASONS member instead. */
export const OWN_REASONS = Object.freeze([
  "ac-level-unavailable",
  "ac-test-not-collected",
  "ac-test-passes-before-build",
  "ac-test-skipped",
]);

/** Every reason an AC can carry: the four above plus item 01's refusals, passed through by name. Sorted, closed. */
export const RED_RUN_REASONS = Object.freeze([...OWN_REASONS, ...RECORD_REASONS].sort());

/** The file name run-gates.mjs writes a finished stamp to, under `<out>`. */
export const STAMP_FILE = "stamp.json";

/** The ONE line an unattended caller prints when a level has no runner (grill G11: the brief's `blocked:
 *  no-test-runner`). Built from closed-set values only — AC ids and levels — so it carries no project text. */
export function blockedLine(unavailable) {
  const acs = unavailable.map((u) => `${u.id} (${u.level})`).join(", ");
  const levels = [...new Set(unavailable.map((u) => u.level))].sort().join(" and ");
  return (
    `blocked: no-test-runner — ${acs}; suggested: /pharn-ship "set up a test runner for ${levels} with per-test results ` +
    `(spec_kind: test-infra)"`
  );
}

/** The feature a mapping belongs to: the name of the directory AC-TESTS.md sits in. */
export function featureOf(acTestsPath) {
  return basename(dirname(resolve(acTestsPath)));
}

/** Read AC-TESTS.md and return its rows (ac-tests-core.mjs acRowsOf), or a refusal. */
export function readRows(acTestsPath) {
  let text;
  try {
    text = readFileSync(acTestsPath, "utf8");
  } catch (e) {
    return { ok: false, reason: `${acTestsPath} is not readable: ${e.code ?? e.message}` };
  }
  const rows = acRowsOf(text);
  return rows.ok ? rows : { ok: false, reason: `${acTestsPath}: ${rows.reason}` };
}

/**
 * PREFLIGHT, before anything runs: for each AC, its level's gates that package.json has (discoverGates), and for
 * each of those a configured per-test results format. An AC is unavailable when its level has no discovered gate,
 * or when ANY of its discovered gates has no results format — the verdict needs every gate's record, so a partly
 * configured level would fail later for a reason a human cannot act on before the run (grill G6).
 * @returns {{unavailable: {id: string, level: string, why: string}[], gates: string[]}}
 */
export function preflight({ rows, scripts, root }) {
  const have = new Set(discoverGates(scripts).map((e) => e.id));
  const config = loadResultsConfig(root);
  const unavailable = [];
  const gates = new Set();
  for (const r of rows) {
    const ids = LEVEL_GATES[r.level].filter((id) => have.has(id));
    if (ids.length === 0) {
      unavailable.push({
        id: r.id,
        level: r.level,
        why: `package.json has no ${LEVEL_GATES[r.level].map((g) => `\`${g}\``).join(" or ")} script`,
      });
      continue;
    }
    const unconfigured = ids.filter((id) => !formatFor(config, id).ok);
    if (unconfigured.length) {
      const f = formatFor(config, unconfigured[0]);
      unavailable.push({
        id: r.id,
        level: r.level,
        why: `no per-test results for ${unconfigured.map((g) => `\`${g}\``).join(", ")} (${f.reason_code})`,
      });
      continue;
    }
    for (const id of ids) gates.add(id);
  }
  return { unavailable, gates: [...gates].sort() };
}

/** Bind a finished stamp to the mapping and the live tree (grill G1). Returns `{ok: true}` or a refusal. `root` is
 *  the project root the gates ran in and the fingerprint is taken over. */
export function bindStamp({ stamp, rows, feature, root }) {
  const v = validateStamp(stamp, { stage: "ac-test", feature });
  if (!v.ok) return { ok: false, reason: `the stamp is not a finished ac-test run of ${feature}: ${v.reason_code} — ${v.reason}` };
  for (const run of stamp.runs) {
    const want = acFilesFor(rows, run.id);
    if (want.length === 0) return { ok: false, reason: `the stamp ran gate ${JSON.stringify(run.id)}, which no mapped level needs` };
    const got = Array.isArray(run.files) ? run.files : [];
    if (JSON.stringify(got) !== JSON.stringify(want)) {
      return { ok: false, reason: `gate ${run.id} ran files other than the mapping's — the stamp is not this mapping's red run` };
    }
  }
  // HOW each gate ran (REVIEW finding 6): the runs must be EXACTLY what `init --stage ac-test` resolves NOW from the live
  // `<root>/package.json` and this mapping — same ids, order, commands and files. Without it a hand-edited in-progress
  // record (a swapped command) or an init over another manifest (one e2e gate dropped) still bound. Bounded: this is the
  // manifest at `<root>/package.json`, the one /pharn-test's pinned init discovers from.
  if (stamp.source !== "discover")
    return { ok: false, reason: "the stamp's gate set was not discovered — an ac-test run never takes --gates" };
  let scripts;
  try {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    scripts = pkg && typeof pkg === "object" ? pkg.scripts : null;
  } catch (e) {
    return { ok: false, reason: `cannot read ${join(root, "package.json")} to re-resolve the red run's gates: ${e.code ?? e.message}` };
  }
  const res = resolveSet({ stage: "ac-test", feature, scripts, acRows: rows });
  if (!res.ok) return { ok: false, reason: `the live package.json no longer resolves this mapping's red run: ${res.reason_code}` };
  const shape = (xs) => JSON.stringify(xs.map((e) => [e.id, e.shell ?? null, e.argv ?? null, e.files ?? []]));
  if (shape(res.spec.entries) !== shape(stamp.runs)) {
    return {
      ok: false,
      reason: "the stamp's gates are not the ones init resolves from the live package.json and mapping — a command or the gate set differs",
    };
  }
  const fp = fingerprint(root, { feature });
  if (!fp.ok) return { ok: false, reason: `cannot fingerprint the tree: ${fp.reason}` };
  if (fp.algo !== stamp.fingerprint.algo || fp.digest !== stamp.fingerprint.final) {
    return { ok: false, reason: "the tree changed since the red run (a test file, the mapping or the lock) — re-run it" };
  }
  return { ok: true };
}

/**
 * THE VERDICT over a bound stamp. Each AC gets `reason: null` (red, as required) or one RED_RUN_REASONS member, and
 * the matched test ids (untrusted data, sorted, unique).
 * @returns {{green: boolean, acs: {id: string, level: string, file: string, reason: string|null, detail: string, tests: string[]}[], gates: {gate: string, results_sha256: string}[]}}
 */
export function verdict({ rows, stamp, outDir, root }) {
  const records = new Map();
  const recordOf = (gateId) => {
    if (!records.has(gateId)) records.set(gateId, testRecord({ stamp, outDir, gateId, root }));
    return records.get(gateId);
  };
  const inStamp = new Set(stamp.runs.map((r) => r.id));
  const acs = [];
  for (const row of rows) {
    const ac = { id: row.id, level: row.level, file: row.file, reason: null, detail: "", tests: [] };
    acs.push(ac);
    const gateIds = LEVEL_GATES[row.level].filter((id) => inStamp.has(id));
    if (gateIds.length === 0) {
      ac.reason = "ac-level-unavailable";
      ac.detail = `the run has none of ${LEVEL_GATES[row.level].join(", ")}`;
      continue;
    }
    // EVERY observation is kept — one per (gate, test) — never one status per test id: two e2e gates can report the
    // same id, and keying by id let the later gate's `failed` overwrite the earlier one's `passed` (REVIEW finding 1).
    const statuses = [];
    const ids = new Set();
    for (const gateId of gateIds) {
      const rec = recordOf(gateId);
      if (!rec.ok) {
        ac.reason = rec.reason_code;
        ac.detail = `gate ${gateId}: ${rec.reason}`;
        break;
      }
      for (const t of rec.tests) {
        if (t.file === row.file && t.title.startsWith(`${row.id}:`)) {
          statuses.push(t.status);
          ids.add(t.id);
        }
      }
    }
    if (ac.reason !== null) continue;
    ac.tests = [...ids].sort();
    const count = (status) => statuses.filter((x) => x === status).length;
    if (statuses.length === 0) {
      ac.reason = "ac-test-not-collected";
      ac.detail = `no test titled \`${row.id}: …\` was collected from ${row.file} — it failed to load, or the title is wrong`;
    } else if (count("passed")) {
      ac.reason = "ac-test-passes-before-build";
      ac.detail = `${count("passed")} of ${statuses.length} matched result(s) passed before the build`;
    } else if (count("skipped")) {
      ac.reason = "ac-test-skipped";
      ac.detail = `${count("skipped")} of ${statuses.length} matched result(s) are skipped`;
    }
  }
  for (const ac of acs) {
    if (ac.reason !== null && !RED_RUN_REASONS.includes(ac.reason))
      throw new Error(`internal: ${ac.reason} is not a RED_RUN_REASONS member`);
  }
  const gates = [...records.entries()]
    .filter(([, rec]) => rec.ok)
    .map(([gate, rec]) => ({ gate, results_sha256: rec.results_sha256 }))
    .sort((a, b) => (a.gate < b.gate ? -1 : 1));
  return { green: acs.every((a) => a.reason === null), acs, gates };
}

/** Read `<out>/stamp.json`: the parsed stamp and the sha256 of its bytes, or a refusal. */
export function readStamp(outDir) {
  const path = join(outDir, STAMP_FILE);
  let bytes;
  try {
    bytes = readFileSync(path);
  } catch (e) {
    return { ok: false, reason: `${path} is not readable (${e.code ?? e.message}) — the red run did not finish` };
  }
  try {
    return { ok: true, stamp: JSON.parse(bytes.toString("utf8")), sha256: createHash("sha256").update(bytes).digest("hex") };
  } catch (e) {
    return { ok: false, reason: `${path} is not JSON: ${e.message}` };
  }
}

/** The whole decision for a finished run: rows, stamp, binding, verdict. Used by both CLIs so they cannot disagree. */
export function evaluateRedRun({ acTestsPath, outDir, root }) {
  const rows = readRows(acTestsPath);
  if (!rows.ok) return { ok: false, reason: rows.reason };
  const st = readStamp(outDir);
  if (!st.ok) return st;
  const feature = featureOf(acTestsPath);
  const bound = bindStamp({ stamp: st.stamp, rows: rows.rows, feature, root });
  if (!bound.ok) return bound;
  return { ok: true, feature, rows: rows.rows, stamp_sha256: st.sha256, ...verdict({ rows: rows.rows, stamp: st.stamp, outDir, root }) };
}
