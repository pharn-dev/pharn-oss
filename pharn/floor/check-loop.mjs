#!/usr/bin/env node
// pharn/floor/check-loop.mjs — the deterministic STOP-DECISION CORE for the product `/pharn-loop` command.
//
// Floor/eval infrastructure — NOT a Capability (no `role:`; it lives in this floor-ignored dir, exactly
// like check-ship.mjs / check-verify.mjs / check-regress.mjs). It owns the WHOLE deterministic
// stop/continue decision of the product loop so the maximum surface is in tested Node, not in the
// command's prose. The command (.claude/commands/pharn-loop.md) owns only the I/O side-effects (running
// the stages, writing artifacts, the git steps); this helper computes whether the loop STOPS or CONTINUES.
//
// WHY THIS FILE EXISTS — the floor reduction that makes `/pharn-loop` legal (ARCHITECTURE §2 / §7, P0):
//   `/pharn-loop` runs unattended — it approves its own SPEC and iterates build→regress→verify with NO
//   human between iterations — so its termination is safety-critical and MUST be floor, not agent
//   judgment. This helper reduces the stop to deterministic operations: (1) enum membership over the two
//   FLOOR verdicts the existing stages already emit — /pharn-verify's `.verdict` and /pharn-regress's
//   `.verdict`; (2) on a verify FAIL only, exact array membership of the gate key `reconcile` in
//   /pharn-verify's `.failing_gates`; and (3) an integer `iter >= cap` compare. The agent OBEYS the exit
//   code (advisory COMPLIANCE, exactly as it obeys check-verify).
//
// A SIBLING OF check-ship.mjs, NOT AN OVERLOAD OF IT (P3 — one axis per file):
//   check-ship.mjs is the DEV loop's stop core (Design A): it CONTINUEs on ANY not-floor-green verdict up
//   to the cap, its VERIFY_VERDICTS set does NOT include INCOMPLETE, and it has no terminal outcome. This
//   file is the PRODUCT loop's stop core (Design C). The two tables still differ on three axes —
//   INCOMPLETE is accepted here, STOP_TERMINAL (exit 4) exists here, and a reconcile red is terminal here —
//   so folding them into one file would change the dev loop's Design A for a product-loop reason: two
//   reasons to change one file. Hence a separate file, leaving check-ship.mjs and the dev loop unchanged.
//
// "/review NEVER GATES THE LOOP" IS STRUCTURAL, NOT DISCIPLINE (the core invariant):
//   this helper's input signature is exactly { verify-report.json, regression-report.json, iter, cap }.
//   It has NO `/review` parameter — it CANNOT receive a REVIEW.md, a finding, or an LLM-assigned
//   severity (the product spine has no /review stage anyway). So "the loop stops on the two FLOOR
//   verdicts alone" is true by construction, not by an agent promise.
//
// DECISION — Design C, retry any measurable red except a reconcile red (ARCHITECTURE §2 primitive #3 —
// enum membership + integer threshold). `v` = verify.verdict ∈ {PASS, FAIL, INCOMPLETE, INCONCLUSIVE};
// `r` = regress.verdict ∈ {no-regressions, regressions, inconclusive}; `fg` = verify.failing_gates, read
// ONLY when v === "FAIL". Precedence top-down:
//   bad input (missing/unparseable report, `.verdict` outside its enum, iter/cap not a positive integer,
//             malformed argv, or v === FAIL with `fg` not an array of strings)
//                                                     → INCONCLUSIVE  exit 2  (FAIL-CLOSED, P5)
//   v === "INCONCLUSIVE"  OR  r === "inconclusive"     → STOP_TERMINAL exit 4  (nothing was measured)
//   v === "FAIL"  ∧  fg includes "reconcile"            → STOP_TERMINAL exit 4  (a detected escape)
//   v === "PASS"  ∧  r === "no-regressions"            → STOP_GREEN    exit 0  (converged)
//   a measurable red (v ∈ {FAIL, INCOMPLETE} or r === "regressions") ∧ iter <  cap
//                                                     → CONTINUE      exit 3  (retry, under cap)
//   a measurable red                                  ∧ iter >= cap
//                                                     → STOP_CAP      exit 1  (bounded: cap hit)
//
// WHY AN INCONCLUSIVE VERDICT IS TERMINAL: the stage could not measure, so a fix has nothing to be judged
// against and a retry would spend an iteration blind (P5 fail-closed). The checker's OWN exit-2
// INCONCLUSIVE stays reserved for "cannot read a valid verdict" (bad/missing input).
//
// WHY A RECONCILE RED IS TERMINAL: a retry re-enters /pharn-build, whose Step 0 re-anchors the
// reconciliation baseline — and each anchor RESETS it, so a retry would erase the very Bash escape the
// `reconcile` gate just detected, and the next verify could come back clean and reach STOP_GREEN. The
// match is EXACT array membership of the literal gate id /pharn-verify writes into its results map
// (`"reconcile":<rc>`): a gate named `structural:reconcile-x` is a different gate and does not count.
//
// HONEST SCOPE (P0/P7): this guarantees the loop's STOP CONDITION given its inputs — it guarantees NOTHING
// about whether a rebuild CONVERGES (irreducible model work, advisory), and nothing about whether
// /pharn-verify actually ran the reconcile gate (orchestration, advisory). A red whose cause lies outside
// the plan's `## Files` cannot be fixed by a rebuild and simply runs to STOP_CAP.
//
// TRUST (P2): every operand is produced by deterministic tooling — two `.verdict` enum strings, one array
// of gate-id strings tested for exact membership, and two ints. NO free-text (`problem`/`evidence`), NO
// /review input is ever read. Inputs are JSON.parsed and used ONLY as string/int operands — never eval'd,
// executed, spawned, imported, or sent anywhere. No child process, no network.
//
// Usage:
//   node pharn/floor/check-loop.mjs <verify-report.json> <regression-report.json> --iter <N> --cap <M>
//
// Exit: 0 STOP_GREEN · 1 STOP_CAP · 2 INCONCLUSIVE (bad input, fail-closed) · 3 CONTINUE ·
//       4 STOP_TERMINAL (an inconclusive verdict or a reconcile red — stop, never retried).

import { readFileSync, existsSync } from "node:fs";

// The known verdict enums the two FLOOR stages emit. Unlike check-ship.mjs, VERIFY_VERDICTS INCLUDES
// "INCOMPLETE", which /pharn-verify emits via `--complete`. A `.verdict` outside its set is malformed
// input → INCONCLUSIVE (fail-closed), NOT a silent decision.
const VERIFY_VERDICTS = new Set(["PASS", "FAIL", "INCOMPLETE", "INCONCLUSIVE"]);
const REGRESS_VERDICTS = new Set(["no-regressions", "regressions", "inconclusive"]);

// The one verify gate whose red is never retried — the literal key /pharn-verify writes for
// check-bash-reconcile.mjs's exit code. Matched by exact membership, never by substring.
const RECONCILE_GATE = "reconcile";

// --- emit one JSON document to stdout, then exit. The command captures this verbatim. ---
function emit(obj, code) {
  console.log(JSON.stringify(obj, null, 2));
  process.exit(code);
}

// --- strict argv parse (P5, fail-closed). The ONLY valid invocation is exactly two positional report
//     paths plus `--iter <N>` and `--cap <M>`. Extra positionals, an unrecognized flag, a repeated known
//     flag, or a flag missing its value are ALL malformed input → caller emits INCONCLUSIVE (exit 2),
//     NEVER a silent decision. Flag VALUES are consumed in-line so they never leak in as a path. ---
function parseArgs(argv) {
  const KNOWN = new Set(["--iter", "--cap"]);
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      if (!KNOWN.has(a)) return { ok: false, reason: `unrecognized flag: ${a}` };
      if (a in flags) return { ok: false, reason: `repeated flag: ${a}` };
      if (i + 1 >= argv.length) return { ok: false, reason: `${a} requires a value` };
      flags[a] = argv[++i];
    } else {
      positional.push(a);
    }
  }
  if (positional.length !== 2) {
    return { ok: false, reason: `expected exactly 2 positional report paths, got ${positional.length}` };
  }
  return { ok: true, positional, iter: flags["--iter"], cap: flags["--cap"] };
}

// --- read a report file and validate its `.verdict` is a member of `allowed`. A missing / unparseable
//     file, a non-object, or a `.verdict` outside the enum is bad input → fail-closed (P5). The parsed
//     object is returned so the verify report's `failing_gates` can be read on a FAIL. ---
function readVerdict(path, label, allowed) {
  if (!path) return { ok: false, reason: `${label} path not provided` };
  if (!existsSync(path)) return { ok: false, reason: `${label} not found: ${path}` };
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    return { ok: false, reason: `${label} is not valid JSON (${path}): ${e.message}` };
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, reason: `${label} must be a JSON object (${path})` };
  }
  const v = parsed.verdict;
  if (typeof v !== "string" || !allowed.has(v)) {
    return { ok: false, reason: `${label} .verdict ${JSON.stringify(v)} is not one of {${[...allowed].join(", ")}} (${path})` };
  }
  return { ok: true, verdict: v, report: parsed };
}

// --- on a verify FAIL only: `.failing_gates` must be an array of strings. Anything else is bad input,
//     because the reconcile decision cannot be computed from it — fail-closed, never "assume no reconcile". ---
function readFailingGates(report, path) {
  const fg = report.failing_gates;
  if (!Array.isArray(fg) || !fg.every((g) => typeof g === "string")) {
    return { ok: false, reason: `verify-report.json .failing_gates must be an array of strings when .verdict is FAIL (${path})` };
  }
  return { ok: true, gates: fg };
}

// --- parse a positive-integer flag (`--iter 2`). A missing / non-digit / < 1 value is bad input. ---
function posInt(raw, name) {
  if (raw === undefined) return { ok: false, reason: `--${name} not provided` };
  if (!/^\d+$/.test(raw)) return { ok: false, reason: `--${name} must be a positive integer, got ${JSON.stringify(raw)}` };
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return { ok: false, reason: `--${name} must be >= 1, got ${raw}` };
  return { ok: true, value: n };
}

function main() {
  const argv = process.argv.slice(2);
  // Strict, fail-closed argv parse (P5): a malformed invocation shape is bad input → INCONCLUSIVE (exit 2),
  // the SAME handling as a bad operand below — never a silent decision.
  const parsed = parseArgs(argv);
  if (!parsed.ok) {
    emit(
      {
        verify_verdict: null,
        regress_verdict: null,
        floor_green: null,
        iter: null,
        cap: null,
        decision: "INCONCLUSIVE",
        reason: parsed.reason,
      },
      2
    );
  }

  const verify = readVerdict(parsed.positional[0], "verify-report.json", VERIFY_VERDICTS);
  const regress = readVerdict(parsed.positional[1], "regression-report.json", REGRESS_VERDICTS);
  const iterR = posInt(parsed.iter, "iter");
  const capR = posInt(parsed.cap, "cap");
  // `failing_gates` is read ONLY on a verify FAIL; for every other verdict it stays unread, as before.
  const gatesR = verify.ok && verify.verdict === "FAIL" ? readFailingGates(verify.report, parsed.positional[0]) : { ok: true, gates: [] };

  // Fail-closed (P5): any malformed operand → INCONCLUSIVE (exit 2), NEVER a silent decision. Echo back
  // whatever parsed cleanly (nulls otherwise) plus the helper's OWN diagnostic `reason` (not free-text).
  const bad = [verify, regress, iterR, capR, gatesR].find((r) => !r.ok);
  if (bad) {
    emit(
      {
        verify_verdict: verify.ok ? verify.verdict : null,
        regress_verdict: regress.ok ? regress.verdict : null,
        floor_green: null,
        iter: iterR.ok ? iterR.value : null,
        cap: capR.ok ? capR.value : null,
        decision: "INCONCLUSIVE",
        reason: bad.reason,
      },
      2
    );
  }

  const iter = iterR.value;
  const cap = capR.value;
  const v = verify.verdict;
  const r = regress.verdict;

  // Design C. Four deterministic predicates over the two verdict enums + one exact array membership:
  const floorGreen = v === "PASS" && r === "no-regressions"; // converged
  const unmeasured = v === "INCONCLUSIVE" || r === "inconclusive"; // a stage could not measure
  const reconcileRed = v === "FAIL" && gatesR.gates.includes(RECONCILE_GATE); // a detected escape
  // measurableRed === (v ∈ {FAIL, INCOMPLETE} || r === "regressions") — not named as its own const
  // because, by the precedence below, it is exactly what remains once the three predicates above are
  // false (proof in the trailing comment).

  let decision, code, reason;
  if (unmeasured) {
    decision = "STOP_TERMINAL";
    code = 4;
    reason = `terminal: nothing was measured (verify ${v}, regress ${r}) — a retry would be blind; stop`;
  } else if (reconcileRed) {
    // A retry would re-anchor the reconciliation baseline in /pharn-build Step 0 and erase this detection.
    decision = "STOP_TERMINAL";
    code = 4;
    reason = `terminal: the ${RECONCILE_GATE} gate is red (verify FAIL) — a retry would re-anchor and erase the detected escape; stop`;
  } else if (floorGreen) {
    decision = "STOP_GREEN";
    code = 0;
    reason = "floor-GREEN: /pharn-verify PASS and /pharn-regress no-regressions — stop";
  } else if (iter < cap) {
    // Reachable ONLY on a measurable red: `unmeasured` false ⇒ v ∈ {PASS, FAIL, INCOMPLETE} ∧
    // r ∈ {no-regressions, regressions}; `floorGreen` false ⇒ v !== PASS ∨ r === regressions.
    decision = "CONTINUE";
    code = 3;
    reason = `measurable red (verify ${v}, regress ${r}) and iter ${iter} < cap ${cap} — iterate: one build pass, then re-verify`;
  } else {
    decision = "STOP_CAP";
    code = 1;
    reason = `cap reached: measurable red (verify ${v}, regress ${r}) and iter ${iter} >= cap ${cap} without floor-GREEN — stop`;
  }

  emit({ verify_verdict: v, regress_verdict: r, floor_green: floorGreen, iter, cap, decision, reason }, code);
}

main();
