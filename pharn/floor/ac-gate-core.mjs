#!/usr/bin/env node
// pharn/floor/ac-gate-core.mjs — /pharn-verify's AC GATE: was every Acceptance Criterion DELIVERED on the head verify run?
// check-verify.mjs `--ac-gate` is its CLI surface and folds its verdict into verify's FLOOR verdict. Contract:
// pharn/pharn-contracts/ac-tests.md ("The AC gate") and pharn/pharn-contracts/verify-report.md (`ac_gate`).
//
// WHY (the queue's item 06 — the requirement the queue exists for, P7): before this, verify's verdict came from
// whole-gate exit codes, and nothing there knew an AC existed. A suite could pass with an AC's test deleted, skipped or
// never collected. P3: this file changes when "what counts as a delivered AC" changes; the mapping grammar
// (ac-tests-core.mjs), the per-test record (test-results-core.mjs), the match rule (red-run-core.mjs observeAc), the
// lock's checks (ac-tests-lock.mjs) and the pin (test-infra-core.mjs) are imported, never restated (L35).
//
// AN AC IS DELIVERED = a locked, once-red test titled `AC-<n>:`, in a file mapped to AC-n, passed on the head run.
// PHARN does not judge whether that test fully captures the AC's intent (P0). The SPEC is the source of the ACs: an AC
// the mapping does not cover has no locked test at all.
//
// PER SPEC KIND (spec-template-core.mjs specVerdict — the reading check-ac-tests.mjs --spec prints):
//   legacy     → NOT-APPLICABLE, stated, never silently GREEN — unless AC evidence (an AC-TESTS.md or a lock) sits
//                beside it, which means `spec_template` was removed after the tests were pinned: `ac-tests-modified`.
//   feature    → TEST-FIRST. Feature-wide EVIDENCE: the lock is a shape-valid test-first lock whose files, mapping and
//                spec pin still hold, and whose spec pin is the SPEC's, else `ac-tests-modified`; its `red_run` is
//                present and bound to its files and mapped ACs, else `ac-never-red`; its test-infrastructure pin holds,
//                else `test-infra-changed`, and a lock without one (/2, /1) is `test-infra-unpinned`; every level gate
//                read ran as the pinned command (`source: discover`, `npm run <id>`, no shell), else
//                `test-infra-changed`. Per AC, over every gate its level maps to that is in the head stamp: a record
//                refused is item 01's own reason (unmeasured); the matched tests (observeAc) — none → `ac-untested`;
//                a matched test id the red run never recorded red for that AC → `ac-never-red`; any `failed` →
//                `ac-not-passed`; else any `skipped` → `ac-skipped`. An AC with no mapping row → `ac-never-red`.
//                A test the red run recorded red for AC-n that the head run does not report at all is `ac-untested`.
//   test-infra → BOOTSTRAP, WEAKER, and labelled so: the lock is a bootstrap lock whose SPEC half holds, else
//                `ac-tests-modified`; per AC, its level's gates that ran as discovered report ≥1 `passed` test (any
//                file), else `ac-untested` — a gate that is not there yet, or a record refused `not-configured`, is the
//                build not having delivered the runner, so a retry can fix it; any other refusal is unmeasured. EVERY
//                gate the level has must be configured (the red run's preflight rule): with `test:e2e` and `e2e` both
//                present and one unconfigured, the AC is `ac-untested`.
//
// THE VERDICT, and what check-verify.mjs does with it: any EVIDENCE reason → FAIL (`ac-evidence` in failing_gates —
// iterating the build cannot fix it; check-loop.mjs stops); else any DELIVERY reason → FAIL (`ac-delivery` — an
// ordinary measurable red the loop iterates on); else any record reason → INCONCLUSIVE (fatal, never a PASS); else
// PASS. The three reason sets are a partition, closure-tested.
//
// BOUNDS (P0), each stated where a reader meets the claim: "passed" is the reporter's word — the tests, the reporter
// config and pharn.config.json are agent-editable, which the lock and the pin NARROW and never close; AGREEMENT, never
// provenance (L43) — a self-consistent fabricated lock + stamp + results set over the live tree passes; a record is
// refused whole on one flaky test or expected failure the report MARKS, or one duplicate id, anywhere in the suite
// (item 01), which makes the gate unmeasured — an unmarked one (vitest `test.fails` or pass on retry, Jest 29's
// `test.failing`) reads as its raw status (test-results-record.md); the pin's own gaps are test-infra-core.mjs's header. The gate does NOT re-check that the SPEC is
// still Approved — it reads the SPEC's pin, never its `state`. Since 6.20.5 a test-first SPEC whose pin cannot be
// read (no `spec_id` or `spec_content_hash` line, an empty one, a value that is not 64 hex — a Draft usually has one
// of these) is `ac-tests-modified`, an EVIDENCE reason: verify FAIL and /pharn-loop S13; before, the comparison was
// skipped and the gate could PASS. A SPEC reverted to Draft that still carries a readable pin equal to the lock's
// still passes here, and /pharn-verify Step 2's chain check and /pharn-loop's freshness check I are what refuse it.
//
// TRUST (P2): test ids and titles are untrusted DATA from the project's reporter; lock paths come from an
// agent-editable file. Both are compared as strings and copied into the report as data — the report NAMES them, and
// no stage follows them. No child process is spawned here (the lock's approval spawn is checkLock's, not the parts
// this module calls), so check-verify.mjs stays spawn-free.

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { acRowsOf } from "./ac-tests-core.mjs";
import {
  DEFAULT_BASE,
  LOCK_NAME,
  MAPPING_NAME,
  SPEC_NAME,
  bootstrapReds,
  lockShapeError,
  modeOf,
  pinReds,
  readSpecFacts,
  redRunReds,
  testFirstReds,
} from "./ac-tests-lock.mjs";
import { LEVEL_GATES } from "./gate-run-core.mjs";
import { observeAc } from "./red-run-core.mjs";
import { specVerdict } from "./spec-template-core.mjs";
import { RECORD_REASONS, testRecord } from "./test-results-core.mjs";

/** The build has not delivered the AC yet — a retry can fix it. */
export const DELIVERY_REASONS = Object.freeze(["ac-not-passed", "ac-skipped", "ac-untested"]);
/** The evidence itself is changed or missing — a retry cannot fix it. */
export const EVIDENCE_REASONS = Object.freeze(["ac-never-red", "ac-tests-modified", "test-infra-changed", "test-infra-unpinned"]);
/** Every reason the gate can carry: the two sets above plus item 01's record refusals, passed through by name. */
export const AC_GATE_REASONS = Object.freeze([...DELIVERY_REASONS, ...EVIDENCE_REASONS, ...RECORD_REASONS].sort());
export const AC_GATE_MODES = Object.freeze(["bootstrap", "not-applicable", "test-first"]);
export const AC_GATE_VERDICTS = Object.freeze(["FAIL", "INCONCLUSIVE", "NOT-APPLICABLE", "PASS"]);
/** What the head run reported for an AC's matched tests. */
export const AC_STATUSES = Object.freeze(["failed", "none", "passed", "skipped", "unavailable"]);
/** The ids check-verify.mjs adds to `failing_gates` (gate-run-core.mjs RESERVED_IDS reserves both). */
export const FAILING_IDS = Object.freeze({ delivery: "ac-delivery", evidence: "ac-evidence" });

export const NOTES = Object.freeze({
  "test-first":
    "an AC is delivered = a locked, once-red test titled AC-<n>:, in a file mapped to AC-<n>, passed on this head run. " +
    "PHARN does not judge whether that test fully captures the AC's intent.",
  bootstrap:
    "BOOTSTRAP evidence (spec_kind: test-infra) — WEAKER than test-first: each level's gate ran as discovered and reported " +
    "at least one passed test; no AC test was shown red before the build.",
  "not-applicable": "not-applicable (legacy spec) — the SPEC carries no AC ids, so no AC gate applies.",
});

const DELIVERY = new Set(DELIVERY_REASONS);
const EVIDENCE = new Set(EVIDENCE_REASONS);
const RECORD = new Set(RECORD_REASONS);
const MAX_DETAIL = 300;
const acNum = (id) => Number(String(id).slice(3));
const bounded = (s) => (s.length > MAX_DETAIL ? `${s.slice(0, MAX_DETAIL - 1)}…` : s);

function readText(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

/** The lock at `<root>/<base>/<feature>/AC-TESTS.lock.json`, parsed and shape-checked: `{ok, lock}` or `{ok: false,
 *  why, present}`. */
function loadLock(root, feature) {
  const text = readText(resolve(root, DEFAULT_BASE, feature, LOCK_NAME));
  if (text === null) return { ok: false, present: false, why: `${LOCK_NAME} is missing` };
  let lock;
  try {
    lock = JSON.parse(text);
  } catch (e) {
    return { ok: false, present: true, why: `${LOCK_NAME} is not JSON: ${e.message}` };
  }
  const shape = lockShapeError(lock, feature);
  return shape ? { ok: false, present: true, why: `${LOCK_NAME}: ${shape}` } : { ok: true, lock };
}

/** Did gate `run` run as the PINNED command — discovered, `npm run <id>`, no shell (grill G4)? */
function ranAsPinned(stamp, run) {
  return (
    stamp.source === "discover" &&
    run.shell === null &&
    Array.isArray(run.argv) &&
    run.argv.length === 3 &&
    run.argv[0] === "npm" &&
    run.argv[1] === "run" &&
    run.argv[2] === run.id
  );
}

/** WHY a level gate did not run as pinned, in the words a reader can act on (6.20.4). The explicit case is named
 *  because its remedy differs from every other evidence reason's: it is /pharn-verify's own `--gates`, so a re-run
 *  without it helps, and setting the build aside does not. `stamp.source` is an enum validateStamp checked; no argv
 *  string is echoed. Only the detail moves — the reason, its class and the verdict are unchanged. */
function notPinnedWhy(stamp) {
  return stamp.source !== "discover"
    ? `the stamp's gate source is ${JSON.stringify(stamp.source)} (an explicit /pharn-verify --gates run) — re-run /pharn-verify without --gates`
    : "it ran with a shell or a command other than the discovered one";
}

function verdictOf(evidence, acs) {
  const reasons = [...evidence.map((e) => e.reason), ...acs.map((a) => a.reason).filter((r) => r !== null)];
  for (const r of reasons) if (!AC_GATE_REASONS.includes(r)) throw new Error(`internal: ${r} is not an AC_GATE_REASONS member`);
  if (reasons.some((r) => EVIDENCE.has(r))) return "FAIL";
  if (reasons.some((r) => DELIVERY.has(r))) return "FAIL";
  if (reasons.some((r) => RECORD.has(r))) return "INCONCLUSIVE";
  return "PASS";
}

const byKey = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function block(mode, evidence, acs) {
  const ev = [...evidence].sort((a, b) => byKey(a.reason, b.reason) || byKey(a.detail, b.detail));
  const rows = [...acs].sort((a, b) => acNum(a.id) - acNum(b.id));
  let verdict = verdictOf(ev, rows);
  // A legacy SPEC with nothing red is NOT-APPLICABLE — said, never a PASS it did not earn.
  if (mode === "not-applicable" && verdict === "PASS") verdict = "NOT-APPLICABLE";
  // The block's own reason on the two verdicts that need one (REVIEW finding 9): NOT-APPLICABLE, and an INCONCLUSIVE
  // from a refused per-test record — the first unmeasured AC, by its closed code.
  const unmeasured = rows.find((a) => a.reason !== null && RECORD.has(a.reason));
  const reason =
    verdict === "NOT-APPLICABLE"
      ? "not-applicable (legacy spec)"
      : verdict === "INCONCLUSIVE" && unmeasured
        ? `${unmeasured.id}: ${unmeasured.reason} — ${unmeasured.detail}`
        : null;
  return { mode, verdict, reason, evidence: ev, acs: rows, note: NOTES[mode] };
}

/** The status the matched observations add up to (failed > skipped > passed; none when there are none). */
function statusOf(observations) {
  if (observations.length === 0) return "none";
  if (observations.some((o) => o.status === "failed")) return "failed";
  if (observations.some((o) => o.status === "skipped")) return "skipped";
  return "passed";
}

function testFirst({ feature, spec, stamp, root, recordOf }) {
  const evidence = [];
  const add = (reason, detail) => evidence.push({ reason, detail: bounded(detail) });
  const loaded = loadLock(root, feature);
  let lock = null;
  if (!loaded.ok) add("ac-tests-modified", loaded.why);
  else if (modeOf(loaded.lock) !== "test-first")
    add(
      "ac-tests-modified",
      "the lock is a bootstrap lock, but the SPEC is a test-first spec_kind (feature or quick) — the tests were never pinned test-first"
    );
  else lock = loaded.lock;

  if (lock) {
    const files = testFirstReds(lock, feature, DEFAULT_BASE, root);
    if (files.length) add("ac-tests-modified", `${files[0]}${files.length > 1 ? ` (+${files.length - 1} more)` : ""}`);
    const facts = readSpecFacts(feature, DEFAULT_BASE, root);
    // Fail-closed (6.20.5): a SPEC whose pin cannot be read cannot be shown to be the one the tests were locked
    // against. This used to SKIP the comparison, so a pin the reader refused (a Draft leftover line, say) read PASS.
    if (!facts.ok)
      add("ac-tests-modified", `${SPEC_NAME}'s pin cannot be read (${facts.reason}) — not the SPEC the tests were locked against`);
    else if (facts.spec.spec_content_hash !== lock.spec.spec_content_hash)
      add("ac-tests-modified", `${SPEC_NAME}'s spec_content_hash is not the one the tests were locked against`);
    if (!lock.red_run)
      add("ac-never-red", `the lock (${lock.schema}) records no red run — the AC tests were never shown to fail before the build`);
    else {
      const bind = redRunReds(lock, feature, DEFAULT_BASE, root);
      if (bind.length) add("ac-never-red", bind[0]);
    }
    if (lock.test_infra === null)
      add("test-infra-unpinned", `the lock (${lock.schema}) carries no test-infrastructure pin — written before 6.20.0`);
    else {
      const infra = pinReds(lock, root);
      if (infra.length) add("test-infra-changed", `${infra[0]}${infra.length > 1 ? ` (+${infra.length - 1} more)` : ""}`);
    }
  }

  const mappingText = readText(resolve(root, DEFAULT_BASE, feature, MAPPING_NAME));
  const parsed = mappingText === null ? { ok: false } : acRowsOf(mappingText);
  const rows = parsed.ok ? parsed.rows : [];
  // The per-test "once-red" check needs a red run the lock still binds; without one, ac-never-red is already feature-wide.
  const redTests =
    lock && lock.red_run && !evidence.some((e) => e.reason === "ac-never-red")
      ? new Map(lock.red_run.acs.map((a) => [a.id, new Set(a.tests)]))
      : null;
  const inStamp = new Map(stamp.runs.map((r) => [r.id, r]));
  const unpinnedRuns = new Set();

  const acs = spec.items.map((item) => {
    const mine = rows.filter((r) => r.id === item.id);
    const level = mine.length ? mine[0].level : item.level;
    const ac = { id: item.id, level, tests: [], status: "none", reason: null, detail: "" };
    if (mine.length === 0) {
      ac.reason = "ac-never-red";
      ac.detail = `no ${MAPPING_NAME} mapping row — no locked, once-red test exists for this criterion`;
      return ac;
    }
    const gateIds = [...new Set(mine.flatMap((r) => LEVEL_GATES[r.level]))].filter((id) => inStamp.has(id));
    if (gateIds.length === 0) {
      ac.status = "unavailable";
      ac.reason = "gate-absent";
      ac.detail = `the head run has none of ${[...new Set(mine.flatMap((r) => LEVEL_GATES[r.level]))].join(", ")}`;
      return ac;
    }
    for (const id of gateIds) if (!ranAsPinned(stamp, inStamp.get(id))) unpinnedRuns.add(id);
    const obs = observeAc({ id: item.id, files: [...new Set(mine.map((r) => r.file))], gateIds, recordOf });
    if (obs.refused) {
      ac.status = "unavailable";
      ac.reason = obs.refused.reason_code;
      ac.detail = bounded(`gate ${obs.refused.gate}: ${obs.refused.reason}`);
      return ac;
    }
    ac.tests = [...new Set(obs.observations.map((o) => o.id))].sort();
    ac.status = statusOf(obs.observations);
    const wasRed = redTests ? (redTests.get(item.id) ?? new Set()) : null;
    const neverRed = wasRed ? ac.tests.filter((t) => !wasRed.has(t)) : [];
    // The reverse (REVIEW finding 1): a test the red run recorded red for this AC that the head run did not report
    // at all — an error-path case registered conditionally, say — leaves the AC's evidence incomplete, so it is not
    // delivered however the rest passed.
    const missing = wasRed ? [...wasRed].filter((t) => !ac.tests.includes(t)) : [];
    if (neverRed.length) {
      ac.reason = "ac-never-red";
      ac.detail = bounded(`${neverRed.length} matched test(s) the red run never recorded red for ${item.id}`);
    } else if (ac.status === "failed") {
      ac.reason = "ac-not-passed";
      ac.detail = `${obs.observations.filter((o) => o.status === "failed").length} of ${obs.observations.length} matched result(s) failed`;
    } else if (ac.status === "skipped") {
      ac.reason = "ac-skipped";
      ac.detail = `${obs.observations.filter((o) => o.status === "skipped").length} of ${obs.observations.length} matched result(s) are skipped`;
    } else if (ac.status === "none") {
      ac.reason = "ac-untested";
      ac.detail = `no test titled \`${item.id}: …\` in a file mapped to ${item.id} was reported by ${gateIds.join(", ")}`;
    } else if (missing.length) {
      ac.reason = "ac-untested";
      ac.detail = bounded(`${missing.length} test(s) the red run recorded red for ${item.id} were not reported by the head run`);
    }
    return ac;
  });
  for (const id of [...unpinnedRuns].sort())
    add("test-infra-changed", `gate ${id} did not run as the pinned \`npm run ${id}\` — ${notPinnedWhy(stamp)}`);
  return block("test-first", evidence, acs);
}

function bootstrap({ feature, spec, stamp, root, recordOf }) {
  const evidence = [];
  const loaded = loadLock(root, feature);
  if (!loaded.ok) evidence.push({ reason: "ac-tests-modified", detail: bounded(loaded.why) });
  else if (modeOf(loaded.lock) !== "bootstrap")
    evidence.push({ reason: "ac-tests-modified", detail: "the lock is a test-first lock, but the SPEC is spec_kind: test-infra" });
  else {
    const reds = bootstrapReds(loaded.lock, feature, DEFAULT_BASE, root);
    if (reds.length) evidence.push({ reason: "ac-tests-modified", detail: bounded(reds[0]) });
  }
  // A level gate counts only when it ran as discovered (`npm run <id>`): the setup increment's evidence is that the
  // project's OWN runner works, not that some command did.
  const ran = stamp.runs.filter((r) => ranAsPinned(stamp, r));
  const byLevel = new Map();
  const levelResult = (level) => {
    if (byLevel.has(level)) return byLevel.get(level);
    const gateIds = LEVEL_GATES[level].filter((id) => ran.some((r) => r.id === id));
    let out;
    if (gateIds.length === 0) {
      // A level gate that DID run, just not as discovered, is not "the runner is not delivered yet" — say which.
      const unpinned = LEVEL_GATES[level].filter((id) => stamp.runs.some((r) => r.id === id));
      out = {
        status: "none",
        reason: "ac-untested",
        detail: unpinned.length
          ? `the ${unpinned.join(", ")} gate ran, but not as the discovered \`npm run <id>\` — ${notPinnedWhy(stamp)}`
          : `no discovered ${LEVEL_GATES[level].join(" or ")} gate ran — the runner is not delivered yet`,
      };
    } else {
      let passed = 0;
      out = null;
      for (const id of gateIds) {
        const rec = recordOf(id);
        if (!rec.ok) {
          out =
            rec.reason_code === "not-configured"
              ? { status: "none", reason: "ac-untested", detail: `gate ${id}: per-test results are not configured yet (not-configured)` }
              : { status: "unavailable", reason: rec.reason_code, detail: bounded(`gate ${id}: ${rec.reason}`) };
          break;
        }
        passed += rec.tests.filter((t) => t.status === "passed").length;
      }
      if (out === null)
        out =
          passed > 0
            ? {
                status: "passed",
                reason: null,
                detail: `${passed} passed test(s) at level ${level} over ${gateIds.join(", ")} — not matched to this AC (BOOTSTRAP)`,
              }
            : { status: "none", reason: "ac-untested", detail: `${gateIds.join(", ")} reported no passed test at level ${level}` };
    }
    byLevel.set(level, out);
    return out;
  };
  const acs = spec.items.map((item) => ({ id: item.id, level: item.level, tests: [], ...levelResult(item.level) }));
  return block("bootstrap", evidence, acs);
}

/**
 * THE AC GATE. Every input is required (L41): `feature` (the slug), `stamp` (a VALIDATED verify stamp), `outDir` (the
 * runner's `<out>` for it — the per-test results files sit there), `root` (the project root the gates ran in).
 * @returns {{mode: string|null, verdict: string, reason: string|null, evidence: {reason: string, detail: string}[], acs: {id: string, level: string|null, tests: string[], status: string, reason: string|null, detail: string}[], note: string|null}}
 */
export function evaluateAcGate({ feature, stamp, outDir, root }) {
  for (const [name, v] of [
    ["feature", feature],
    ["outDir", outDir],
    ["root", root],
  ]) {
    if (typeof v !== "string" || v === "") throw new TypeError(`evaluateAcGate: \`${name}\` must be a non-empty string`);
  }
  if (stamp === null || typeof stamp !== "object" || !Array.isArray(stamp.runs))
    throw new TypeError("evaluateAcGate: `stamp` must be a stamp");
  const specText = readText(resolve(root, DEFAULT_BASE, feature, SPEC_NAME));
  if (specText === null)
    return {
      mode: null,
      verdict: "INCONCLUSIVE",
      reason: `${join(DEFAULT_BASE, feature, SPEC_NAME)} is not readable`,
      evidence: [],
      acs: [],
      note: null,
    };
  const spec = specVerdict(specText);
  const records = new Map();
  const recordOf = (gateId) => {
    if (!records.has(gateId)) records.set(gateId, testRecord({ stamp, outDir, gateId, root }));
    return records.get(gateId);
  };
  if (spec.token === "LEGACY") {
    const present = [MAPPING_NAME, LOCK_NAME].filter((f) => readText(resolve(root, DEFAULT_BASE, feature, f)) !== null);
    if (present.length === 0) return block("not-applicable", [], []);
    // grill G5: `spec_template` is outside the approval pin and SPEC.md is reconcile-exempt, so a legacy reading beside
    // AC evidence means the key was removed after the tests were pinned — never a silent NOT-APPLICABLE.
    return block(
      "not-applicable",
      [
        {
          reason: "ac-tests-modified",
          detail: `the SPEC reads legacy, but ${present.join(" and ")} exist — the SPEC stopped being templated after the AC tests were pinned`,
        },
      ],
      []
    );
  }
  if (spec.token === "UNUSABLE") return { mode: null, verdict: "INCONCLUSIVE", reason: spec.line, evidence: [], acs: [], note: null };
  if (spec.token === "BOOTSTRAP") return bootstrap({ feature, spec, stamp, root, recordOf });
  return testFirst({ feature, spec, stamp, root, recordOf });
}
