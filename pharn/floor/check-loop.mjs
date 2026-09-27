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
//   `.verdict`; (2) on a verify FAIL only, exact array membership of the gate key `reconcile` — and, since 6.20.0,
//   of the AC gate's reserved id `ac-evidence` — in /pharn-verify's `.failing_gates`; (3) an integer `iter >= cap`
//   compare; and (4, since 6.28.0) membership of ONE token of the feature's own SPEC, its `spec_kind`, which picks the
//   table (below). The agent OBEYS the exit code (advisory COMPLIANCE, exactly as it obeys check-verify).
//
// THE MODE (6.28.0, `/pharn-loop --quick`) — the SPEC's pinned kind, never a flag. The table is chosen by
//   pharn/floor/loop-mode-core.mjs's `loopModeOf`, read from the SPEC.md beside the verify report (the first positional's
//   directory; in /pharn-loop that is the feature's own SPEC): `quick` iff that SPEC reads `spec_kind: quick` through the
//   one kind reading `check-spec.mjs --spec-kind` prints, `full` for everything else. No argv names a SPEC or a mode —
//   the parser below still refuses every flag but `--iter` and `--cap` — so a model cannot select the table by passing
//   something (P5). The module is loaded with import() inside a `try`: a load failure or a throw reads `full`, the
//   stricter table, so the quick machinery can only fail toward more evidence (D3) — in this file. The two record
//   checkers take no such fallback: check-loop-decision.mjs and check-loop-record.mjs import its vocabulary
//   (`LOOP_MODES`) statically, so an unloadable module stops each at load (exit 1, never GREEN) before any re-run of
//   this file. (A /pharn-loop run meets check-loop-fresh.mjs first, which imports the same module statically and turns
//   a failed load into INCONCLUSIVE `checker-crashed`, so a run stops at S11 in either mode before any stop is read —
//   fail-closed, grill G8.) The mode is read in ANY state: /pharn-loop's Step 6a
//   reverts a non-green stop's SPEC to Draft before Step 6b re-derives the stop, and the revert never touches the kind
//   line (L42, L58). That the kind is the APPROVED, un-drifted one is check-loop-fresh.mjs check I's (the pin covers the
//   line), which runs before this file at the decision and again at the commit gate.
//
// A SIBLING OF check-ship.mjs, NOT AN OVERLOAD OF IT (P3 — one axis per file):
//   check-ship.mjs is the DEV loop's stop core (Design A): it CONTINUEs on ANY not-floor-green verdict up
//   to the cap, its VERIFY_VERDICTS set does NOT include INCOMPLETE, and it has no terminal outcome. This
//   file is the PRODUCT loop's stop core (Design C). The two tables still differ on three axes —
//   INCOMPLETE is accepted here, STOP_TERMINAL (exit 4) exists here, and a reconcile red is terminal here —
//   so folding them into one file would change the dev loop's Design A for a product-loop reason: two
//   reasons to change one file. Hence a separate file, leaving check-ship.mjs and the dev loop unchanged.
//
// "/review NEVER GATES THE LOOP" IS STRUCTURAL, NOT DISCIPLINE (the core invariant), restated exactly (6.28.0):
//   this helper's inputs are the two verdict reports, `--iter` / `--cap`, and ONE token of the feature's own SPEC —
//   its `spec_kind`, read by the one kind reading from the `SPEC.md` beside the verify report — which chooses the table
//   (verify-only for `quick`, in which the regression report is not read at all). There is still no review, finding,
//   severity, record or fingerprint input: it CANNOT receive a REVIEW.md, a finding, or an LLM-assigned severity (the
//   product spine has no /review stage anyway). So "the loop stops on its FLOOR verdicts alone" is true by
//   construction, not by an agent promise.
//
// DECISION — Design C, retry any measurable red except a reconcile red (ARCHITECTURE §2 primitive #3 —
// enum membership + integer threshold). `v` = verify.verdict ∈ {PASS, FAIL, INCOMPLETE, INCONCLUSIVE};
// `r` = regress.verdict ∈ {no-regressions, regressions, inconclusive}; `fg` = verify.failing_gates, read
// ONLY when v === "FAIL". Precedence top-down — the FULL table (every SPEC that is not positively `quick`):
//   bad input (missing/unparseable report, `.verdict` outside its enum, iter/cap not a positive integer,
//             malformed argv, or v === FAIL with `fg` not an array of strings)
//                                                     → INCONCLUSIVE  exit 2  (FAIL-CLOSED, P5)
//   v === "INCONCLUSIVE"  OR  r === "inconclusive"     → STOP_TERMINAL exit 4  (nothing was measured)
//   v === "FAIL"  ∧  fg includes "ac-evidence"          → STOP_TERMINAL exit 4  (AC evidence changed or missing)
//   v === "FAIL"  ∧  fg includes "reconcile"            → STOP_TERMINAL exit 4  (a detected escape)
//   v === "PASS"  ∧  r === "no-regressions"            → STOP_GREEN    exit 0  (converged)
//   a measurable red (v ∈ {FAIL, INCOMPLETE} or r === "regressions") ∧ iter <  cap
//                                                     → CONTINUE      exit 3  (retry, under cap)
//   a measurable red                                  ∧ iter >= cap
//                                                     → STOP_CAP      exit 1  (bounded: cap hit)
//
// The QUICK table (6.28.0 — the SPEC reads `spec_kind: quick`): the regression report is NEVER opened, present or
// not, stale or fresh; `r` is null and `regress_verdict` is null in the output. Precedence top-down:
//   bad verify input, or bad iter/cap/argv            → INCONCLUSIVE     exit 2
//   v === "INCONCLUSIVE"                              → STOP_TERMINAL    exit 4  (unmeasured)
//   v === "FAIL"  ∧  fg includes "ac-evidence"         → STOP_TERMINAL    exit 4  (ac-evidence)
//   v === "FAIL"  ∧  fg includes "reconcile"           → STOP_TERMINAL    exit 4  (reconcile)
//   v === "PASS"                                      → STOP_GREEN_QUICK exit 0  (verify PASS, no regression verdict)
//   v ∈ {FAIL, INCOMPLETE}  ∧ iter <  cap             → CONTINUE         exit 3
//   v ∈ {FAIL, INCOMPLETE}  ∧ iter >= cap             → STOP_CAP         exit 1
//
// STOP_GREEN_QUICK IS NOT STOP_GREEN (D4). It names where the run ended first and the mode second (6.25.0's
// `gate2-quick` rule), and every consumer compares `decision` by EQUALITY: /pharn-loop's full Step 6c commits only
// STOP_GREEN, its quick section only STOP_GREEN_QUICK, and the ledger copies the token verbatim, so it carries its own
// claim — no regression verdict was read. The token is bound to the SPEC's kind at the floor: a quick SPEC never yields
// STOP_GREEN and a full one never STOP_GREEN_QUICK (both pinned by tests). A run invoked without `--quick` over a quick
// SPEC therefore ends on STOP_GREEN_QUICK, which a full run never commits (D8).
//
// WHY AN AC-EVIDENCE RED IS TERMINAL (6.20.0): check-verify.mjs `--ac-gate` adds `ac-evidence` when the AC evidence
// itself is changed or missing — a pinned test or the lock changed, no red run binds the tests, the test infrastructure
// moved or was never pinned. A rebuild cannot restore evidence taken BEFORE the build, so a retry would spend the
// iterations and reach STOP_CAP for nothing. It is checked BEFORE reconcile because a Bash edit of a pinned test trips
// both (the AC tests are outside the build's scope, so reconcile reports the write), and the AC reading is the more
// specific one. A DELIVERY red (`ac-delivery`) is an ordinary measurable red: it is retried like any failing gate.
//
// `terminal_cause` (6.20.0) names WHICH terminal predicate fired — a CLOSED member of TERMINAL_CAUSES, or null for any
// other decision — so /pharn-loop maps `ac-evidence` to its stuck point S13 by membership, never by reading `reason`.
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
// the plan's `## Files` cannot be fixed by a rebuild and simply runs to STOP_CAP. In the quick table it guarantees
// nothing about regressions outside the feature: none is looked for, and the token says so.
//
// TRUST (P2): every operand is produced by deterministic tooling — two `.verdict` enum strings, one array
// of gate-id strings tested for exact membership, two ints, and the closed mode token loop-mode-core.mjs reduces the
// SPEC to (its body is never interpreted here). NO free-text (`problem`/`evidence`), NO /review input is ever read.
// Inputs are JSON.parsed and used ONLY as string/int operands — never eval'd, executed, spawned, or sent anywhere; the
// one import() loads a fixed sibling path, never a path from input. No child process, no network.
//
// Usage:
//   node pharn/floor/check-loop.mjs <verify-report.json> <regression-report.json> --iter <N> --cap <M>
//   (the SPEC read for the mode is `<dirname of verify-report.json>/SPEC.md` — never an argument)
//
// Output: ONE JSON object {verify_verdict, regress_verdict, floor_green, iter, cap, mode, decision, terminal_cause,
//   reason}; `mode` is "full" | "quick" (null only on an argv refusal, before any path is known); in quick mode
//   `regress_verdict` is null and `floor_green` means verify PASS.
//
// Exit: 0 STOP_GREEN, or STOP_GREEN_QUICK in the quick table · 1 STOP_CAP · 2 INCONCLUSIVE (bad input, fail-closed) ·
//       3 CONTINUE · 4 STOP_TERMINAL (an inconclusive verdict, an AC-evidence red or a reconcile red — stop, never
//       retried).

import { readFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";

// The known verdict enums the two FLOOR stages emit. Unlike check-ship.mjs, VERIFY_VERDICTS INCLUDES
// "INCOMPLETE", which /pharn-verify emits via `--complete`. A `.verdict` outside its set is malformed
// input → INCONCLUSIVE (fail-closed), NOT a silent decision.
const VERIFY_VERDICTS = new Set(["PASS", "FAIL", "INCOMPLETE", "INCONCLUSIVE"]);
const REGRESS_VERDICTS = new Set(["no-regressions", "regressions", "inconclusive"]);

// The one verify gate whose red is never retried — the literal key /pharn-verify writes for
// check-bash-reconcile.mjs's exit code. Matched by exact membership, never by substring.
const RECONCILE_GATE = "reconcile";

// The AC gate's evidence id (check-verify.mjs `--ac-gate`, reserved in gate-run-core.mjs RESERVED_IDS). Exact membership.
const AC_EVIDENCE_GATE = "ac-evidence";

/** Which terminal predicate fired, in precedence order. Closed; the suite asserts it both ways (L36). */
const TERMINAL_CAUSES = Object.freeze(["unmeasured", "ac-evidence", "reconcile"]);

// --- emit one JSON document to stdout, then END. The command captures this verbatim. ---
// THE FLUSH RULE (6.20.4, the check-verify.mjs rule — its header says why): set process.exitCode and unwind with a
// module-private sentinel only the top-level catch swallows, so Node drains stdout before the process ends — a
// spawnSync caller (check-loop-decision.mjs) JSON.parses this output. Any other throw still escapes: a crash stays a
// crash. pharn/floor/cli-stdout-flush.test.mjs pins both.
const EMITTED = Symbol("check-loop: emitted");
function emit(obj, code) {
  console.log(JSON.stringify(obj, null, 2));
  process.exitCode = code;
  throw EMITTED;
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

// --- THE MODE (6.28.0): loop-mode-core.mjs's `loopModeOf` over the verify report's own directory. Loaded with
//     import() inside a `try`, so a module that cannot load, exports nothing, or throws reads "full" — the stricter
//     table (D3). Only the exact token "quick" selects the quick table; anything else a mismatched module returns reads
//     "full" too. No argument names a SPEC or a mode. ---
async function readMode(verifyPath) {
  try {
    const { loopModeOf } = await import("./loop-mode-core.mjs");
    return loopModeOf(dirname(verifyPath)) === "quick" ? "quick" : "full";
  } catch {
    return "full";
  }
}

async function main() {
  const argv = process.argv.slice(2);
  // Strict, fail-closed argv parse (P5): a malformed invocation shape is bad input → INCONCLUSIVE (exit 2),
  // the SAME handling as a bad operand below — never a silent decision. It runs BEFORE the mode is read, so an
  // argv refusal carries `mode: null` (no path is known yet).
  const parsed = parseArgs(argv);
  if (!parsed.ok) {
    emit(
      {
        verify_verdict: null,
        regress_verdict: null,
        floor_green: null,
        iter: null,
        cap: null,
        mode: null,
        decision: "INCONCLUSIVE",
        terminal_cause: null,
        reason: parsed.reason,
      },
      2
    );
  }

  const mode = await readMode(parsed.positional[0]);
  const quick = mode === "quick";
  const verify = readVerdict(parsed.positional[0], "verify-report.json", VERIFY_VERDICTS);
  // The QUICK table never opens the regression report — present or not, stale or fresh. `verdict: null` is not a
  // member of REGRESS_VERDICTS, so no predicate below can read it as one.
  const regress = quick ? { ok: true, verdict: null } : readVerdict(parsed.positional[1], "regression-report.json", REGRESS_VERDICTS);
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
        mode,
        decision: "INCONCLUSIVE",
        terminal_cause: null,
        reason: bad.reason,
      },
      2
    );
  }

  const iter = iterR.value;
  const cap = capR.value;
  const v = verify.verdict;
  const r = regress.verdict;
  // What the reason strings say was read: both verdicts in the full table, verify's alone in the quick one.
  const read = quick ? `verify ${v}; quick table — no regression verdict read` : `verify ${v}, regress ${r}`;

  // Design C. Four deterministic predicates over the verdict enums + one exact array membership. In the quick table
  // `r` is null, so `unmeasured` reduces to verify's own INCONCLUSIVE and green is verify PASS alone.
  const floorGreen = quick ? v === "PASS" : v === "PASS" && r === "no-regressions"; // converged
  const unmeasured = v === "INCONCLUSIVE" || r === "inconclusive"; // a stage could not measure
  const acEvidenceRed = v === "FAIL" && gatesR.gates.includes(AC_EVIDENCE_GATE); // AC evidence changed or missing
  const reconcileRed = v === "FAIL" && gatesR.gates.includes(RECONCILE_GATE); // a detected escape
  // measurableRed === (v ∈ {FAIL, INCOMPLETE} || r === "regressions") — not named as its own const
  // because, by the precedence below, it is exactly what remains once the three predicates above are
  // false (proof in the trailing comment).

  let decision, code, reason;
  let terminal_cause = null;
  if (unmeasured) {
    decision = "STOP_TERMINAL";
    code = 4;
    terminal_cause = "unmeasured";
    reason = `terminal: nothing was measured (${read}) — a retry would be blind; stop`;
  } else if (acEvidenceRed) {
    // A rebuild cannot restore evidence taken before the build (the red run), so a retry buys nothing.
    decision = "STOP_TERMINAL";
    code = 4;
    terminal_cause = "ac-evidence";
    reason =
      `terminal: the ${AC_EVIDENCE_GATE} gate is red (verify FAIL) — the AC evidence itself changed or is missing, and a rebuild ` +
      `cannot restore it${reconcileRed ? `; the ${RECONCILE_GATE} gate is red too` : ""}; stop`;
  } else if (reconcileRed) {
    // A retry would re-anchor the reconciliation baseline in /pharn-build Step 0 and erase this detection.
    decision = "STOP_TERMINAL";
    code = 4;
    terminal_cause = "reconcile";
    reason = `terminal: the ${RECONCILE_GATE} gate is red (verify FAIL) — a retry would re-anchor and erase the detected escape; stop`;
  } else if (floorGreen && quick) {
    // The quick table's green: verify PASS, and NO regression verdict was read — a distinct token, never STOP_GREEN.
    decision = "STOP_GREEN_QUICK";
    code = 0;
    reason = "floor-GREEN (quick table — the SPEC's spec_kind is quick): /pharn-verify PASS; no regression verdict was read — stop";
  } else if (floorGreen) {
    decision = "STOP_GREEN";
    code = 0;
    reason = "floor-GREEN: /pharn-verify PASS and /pharn-regress no-regressions — stop";
  } else if (iter < cap) {
    // Reachable ONLY on a measurable red: `unmeasured` false ⇒ v ∈ {PASS, FAIL, INCOMPLETE} ∧
    // r ∈ {no-regressions, regressions} (full) or r null (quick); `floorGreen` false ⇒ v !== PASS ∨ r === regressions
    // (full) or v !== PASS (quick).
    decision = "CONTINUE";
    code = 3;
    reason = `measurable red (${read}) and iter ${iter} < cap ${cap} — iterate: one build pass, then re-verify`;
  } else {
    decision = "STOP_CAP";
    code = 1;
    reason = `cap reached: measurable red (${read}) and iter ${iter} >= cap ${cap} without floor-GREEN — stop`;
  }

  // Closed by construction: a cause outside TERMINAL_CAUSES cannot be emitted (the suite also scans the literals).
  if (terminal_cause !== null && !TERMINAL_CAUSES.includes(terminal_cause))
    throw new Error(`internal: ${terminal_cause} is not a terminal cause`);
  emit({ verify_verdict: v, regress_verdict: r, floor_green: floorGreen, iter, cap, mode, decision, terminal_cause, reason }, code);
}

// Swallow ONLY the emit sentinel; anything else is a real crash and must still end the process non-zero. `main` is
// async (the mode's import()), so the sentinel arrives as the awaited rejection — caught here exactly as before.
try {
  await main();
} catch (e) {
  if (e !== EMITTED) throw e;
}
