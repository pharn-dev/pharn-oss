// pharn/floor/loop-closeout.mjs — /pharn-loop's close after the model has written LOOP.md (6.44.0,
// loop-closeout-script): the deterministic tail of Steps 6b–6c, Step 7's freshness-ledger print and the Final step's
// two releases, in the order the close part's pinned lines ran them, returning ONE closed outcome by exit code.
//
//   node pharn/floor/loop-closeout.mjs --feature '<name>' --base '<base sha>' [--after-repair]
//
// ================================ WHY (P7 — the recorded trigger) ================================
// The green close was 16 pinned blocks plus a mandated `git rev-parse HEAD`, each its own Bash call and so its own
// model request re-sending the orchestrator's whole context (498k–503k tokens per request in the 2026-10-05
// 92-minute pharn-starter run; 2.1–5.8 s per non-Write request). This script replaces 15 of those requests with one
// (net −14).
// The second reason stands on its own: the commit's branch, staging list and undo were model-executed prose that only
// an unattended run reached (L44's recorded failure: a variable carried between blocks emptied a branch delete). Here
// they are tested code the suite executes. The audit's own confirm-first bar for this candidate (orchestrator requests
// >= 20% of a run's) was met by 1 of 3 real runs (15.2 / 14.9 / 21.2%); it was adopted at the user's request
// (.dev/features/loop-closeout-script/PLAN.md, "Why" and "GATE 1").
//
// ================================ THE SEQUENCE (each step exactly as the line it replaced) ================================
//  0. argv: --feature a FEATURE_SLUG_RE member, --base a SHA_RE member (both gate-run-core.mjs, the one owner),
//     --after-repair optional, nothing else, no repeat; then pharn/features/<name>/ must be an lstat directory under
//     the INVOKING directory, and the checkout must NOT already be on pharn-loop/<name> or pharn-loop/<name>-<n> — a
//     second run after a commit (or after a crash that left the branch) would commit again (independent review R2,
//     reproduced). Any refusal → exit 2, nothing run. Never re-run the closeout after a crash or after exit 0/3/4.
//     From the branch step on, the step about to run is written to .pharn/pharn-loop/<name>/closeout-phase
//     (`branch`, `add`, `commit`, `undo`, `committed`, then `finished`), so a crash can be classified (review R1). The closeout runs from the project root, as every
//     pinned line did: floor children resolve from this file's directory, the two hooks and every path operand from
//     the invoking directory.
//  1. check-loop-record.mjs <LOOP.md>. RED without --after-repair → exit 5, NOTHING else run (the ≤1 repair; still
//     advisory — the flag is the model's to pass). With it, a RED is reported and the close goes on.
//  2. The envelope, read with the checkers' own grammar (FM_RE after stripBom; `key: value`, surrounding quotes
//     stripped; cleanScalar before every enum/regex — L14). A value outside its enum/regex reads as null.
//  3. A blocked stop (decision INCONCLUSIVE + a `blocked` key — check-loop-decision.mjs's own skip rule) → `N/A`.
//     Every other → check-loop-decision.mjs <LOOP.md>: exit 0 GREEN, anything else RED.
//  4–7. closeout-core.mjs: run-stop marker, render-cost-ledger --command /pharn-loop --base-sha <base>,
//     check-cost-ledger (only if emitted), render-run-report (skipped when the record's `mode` is quick — the record's
//     mode IS the invocation, Step 6b's capture rule).
//  8. The green gate — enum membership over the record:
//     • decision unreadable → `not committed: decision unverifiable`, exit 4;
//     • decision not in {STOP_GREEN, STOP_GREEN_QUICK}, or a `blocked` key present → `not committed: <decision>`,
//       exit 3 — or exit 4 when SPEC.md's `state` still reads Approved (6a did not run: the model read the stop as
//       green and the record says otherwise, or the revert failed); today that case reached 6c, where the decision
//       check RED'd and 6d reverted, so exit 4 keeps the revert (GRILL G1);
//     • a green token whose decision check is RED, or that disagrees with the record's mode (STOP_GREEN ⇔ full,
//       STOP_GREEN_QUICK ⇔ quick), or whose `iterations` is unreadable → `not committed: decision unverifiable`, exit 4.
//  9. check-loop-fresh.mjs --feature <name> --base <base> --commit-gate --front; non-zero → `evidence stale`, exit 4.
// 10. set-writes-scope.cjs --from-plan pharn/features/<name>/PLAN.md; non-zero → `stage failed`, exit 4. Then
//     reconcile-baseline.mjs --amend-scope — reported, never gating (exit 2 "no baseline" is harmless, as before).
// 11. The staging list: the close part's inline builder moved into `buildStageList`, its rules unchanged — the scope
//     file must be set_by this plan, the lock and every test it pins must be regular non-ignored files, then scope ∪
//     artifacts ∪ pinned, each kept if a regular file or a tracked deletion and not git-ignored, de-duplicated in
//     order. ONE stated difference (L54): absence is an lstat ENOENT, never existsSync, so a dangling symlink at a
//     listed path is skipped instead of being staged as a deletion, and a dangling-link lock refuses. Any refusal →
//     `stage failed`; empty → `nothing staged`; both exit 4. Written NUL-separated to
//     .pharn/pharn-loop/<name>/stage.list after a containmentWalk (lstat, no symlink component).
// 12. The first of pharn-loop/<name>, pharn-loop/<name>-2, … that `git show-ref --verify --quiet` reports absent,
//     then `git switch -c`; non-zero → `branch failed`, exit 4.
// 13. GIT_LITERAL_PATHSPECS=1 git add -A / git commit, both --pathspec-from-file=<list> --pathspec-file-nul; the
//     commit message is `pharn-loop(<name>): <decision> after <N> iteration(s)` plus the fixed second paragraph, with
//     <decision> and <N> the record's enum token and digits. Hooks run (never --no-verify; nothing is pushed or
//     merged). A failed add → `stage failed`, a failed commit → `commit failed`, each followed by the undo the close
//     part prescribed — reset of the list, `git checkout - --`, `git branch -d <branch>` — exit 4. Success → the SHA
//     from `git rev-parse HEAD`, `committed <branch>`, exit 0.
// 14. The freshness ledger (.pharn/pharn-loop/<name>/freshness.jsonl, read only as an lstat regular file), or
//     `no re-runs`.
// 15. Exit 0 or 3 only (no model write follows): set-writes-scope.cjs --clear, then require-loop-record.cjs --close
//     <name> — the Final step's order; `released` says whether both exited 0.
//
// ================================ OUTPUT AND EXIT CODES ================================
// stdout: every step under a `── <step> (exit N)` header, child output indented (closeout-core.mjs `echo`); the LAST
// line is one JSON document whose keys are exactly DOC_KEYS. `outcome` is a member of the close part's closed set or
// null. Exit: 0 committed · 3 not committed, final · 4 not committed with a model write still owed (Step 6d's revert
// and Outcome rewrite, then the Final step) · 5 record RED, repair it and re-run with --after-repair · 2 refused before
// anything ran · ANY OTHER (1 included) a crash: no closing line, the phase reached on stderr — never a commit
// decision. Every child and git call returns a status object; the one top-level catch sets exit 1.
//
// ================================ BOUNDS (P0) ================================
// • FLOOR (tested code over floor verdicts): the commit happens only on a green token that agrees with the record's
//   mode, a GREEN decision re-derivation and an exit-0 commit-gate freshness check; the order above; what the list
//   holds. ADVISORY: that a run invokes this script rather than typing git itself; the ≤1 repair; the model's reading
//   of the exit code.
// • Every git step, the list file, the ledger and the report are Bash-side writes outside fix #7 (L19), as the lines
//   they replaced were, and the commit runs after /pharn-verify's reconcile gate.
// • `git checkout - --` is right only while nothing checks out between the branch step and the undo (a commit hook
//   that checks out sends it elsewhere — the same stated bound the close part carried).
// • A crash after the commit step (a kill) cannot be told from one before it; the close part says to check by hand.
// • A child that hangs regardless of stdin runs until the Bash tool's timeout kills the whole process (a crash).
//
// NON-LLM. Node stdlib + floor cores. TRUST (P2): LOOP.md's envelope reaches a branch or an argv only as enum tokens
// and digits; the body and Handoff are never read. Paths reach git NUL-separated through a file with
// GIT_LITERAL_PATHSPECS=1, never through a shell. Child output is echoed as DATA; no branch reads it.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { FEATURE_SLUG_RE, SHA_RE } from "./gate-run-core.mjs";
import { FM_RE, stripBom, readField } from "./frontmatter-core.mjs";
import { LOOP_MODES } from "./loop-mode-core.mjs";
import { cleanScalar } from "./mark-phase.mjs";
import { containmentWalk, lstatSafe } from "./stage-runtime.mjs";
import { closingLine, echo, floorScript, indent, ledgerSteps, runLedgerTail, runStep, runStop, step } from "./closeout-core.mjs";

export const SCHEMA = "pharn-loop-closeout/1";

/** The exit-code classes, one per outcome class. Anything else (1 included) is a crash. */
export const EXIT = Object.freeze({ COMMITTED: 0, UNUSABLE: 2, NOT_COMMITTED: 3, OWED: 4, REPAIR: 5 });

/** The `not committed:` reasons a green stop can end on — the close part's closed set (Step 7), never a new spelling. */
export const NOT_COMMITTED_REASONS = Object.freeze([
  "decision unverifiable",
  "evidence stale",
  "nothing staged",
  "branch failed",
  "stage failed",
  "commit failed",
]);

/** The green token of each record mode. */
export const GREEN_TOKENS = Object.freeze({ full: "STOP_GREEN", quick: "STOP_GREEN_QUICK" });

// The record's `decision` vocabulary — check-loop-record.mjs's and check-loop-decision.mjs's own, held equal by a test.
const DECISION_ENUM = new Set(["STOP_GREEN", "STOP_GREEN_QUICK", "STOP_CAP", "STOP_TERMINAL", "INCONCLUSIVE"]);
const MODE_ENUM = new Set(LOOP_MODES);
const ITER_RE = /^\d+$/;
const BLOCKED_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

/** The feature's own artifacts, staged by name — moved verbatim from the close part's Step 6c builder. */
export const STAGE_ARTIFACTS = Object.freeze([
  "SPEC.md",
  "PLAN.md",
  "AC-TESTS.md",
  "AC-TESTS.lock.json",
  "GRILL.md",
  "BUILD.md",
  "REGRESSION.md",
  "VERIFY.md",
  "regression-report.json",
  "verify-report.json",
  "LOOP.md",
  "cost.json",
  "RUN-REPORT.md",
]);

/** The commit message's fixed second paragraph — unchanged from the close part's commit line. */
export const COMMIT_BODY =
  "The SPEC was approved by the model (approved_by: model), not by a person. Nothing was merged or pushed; review this branch before merging.";

/** The closing document's keys, closed both ways. */
export const DOC_KEYS = Object.freeze([
  "schema",
  "feature",
  "exit",
  "refusal",
  "outcome",
  "decision",
  "mode",
  "blocked",
  "record_check",
  "decision_check",
  "run_stop",
  "ledger",
  "ledger_check",
  "report",
  "freshness",
  "branch",
  "commit",
  "checkout",
  "released",
]);

const featureDir = (f) => `pharn/features/${f}`;
const recordPath = (f) => `pharn/features/${f}/LOOP.md`;
const specPath = (f) => `pharn/features/${f}/SPEC.md`;
const lockPath = (f) => `pharn/features/${f}/AC-TESTS.lock.json`;
export const stageListPath = (f) => `.pharn/pharn-loop/${f}/stage.list`;
export const phasePath = (f) => `.pharn/pharn-loop/${f}/closeout-phase`;

/** The closed set of phases written to `phasePath` (review R1). */
export const PHASES = Object.freeze(["branch", "add", "commit", "undo", "committed", "finished"]);

/** The branch a run of `feature` creates (pharn-loop/<name> or pharn-loop/<name>-<n>). */
export function isLoopBranchOf(feature, branch) {
  if (typeof branch !== "string") return false;
  const stem = `pharn-loop/${feature}`;
  return branch === stem || (branch.startsWith(`${stem}-`) && /^\d+$/.test(branch.slice(stem.length + 1)));
}

/** Record the step about to run, best effort (a write that fails is reported, never fatal): containment first. */
function writePhase(feature, phase, log) {
  const root = process.cwd();
  const rel = phasePath(feature);
  const walk = containmentWalk(root, join(root, rel));
  try {
    if (!walk.ok) throw new Error(walk.reason);
    mkdirSync(join(root, ".pharn", "pharn-loop", feature), { recursive: true });
    writeFileSync(rel, `${phase}\n`);
  } catch (e) {
    log(`── closeout-phase not written (${phase}): ${e && typeof e.message === "string" ? e.message : "write failed"}\n`);
  }
}
const freshnessPath = (f) => `.pharn/pharn-loop/${f}/freshness.jsonl`;

/** The commit-gate freshness argv — exported so check-loop-fresh.test.mjs EXECUTES exactly what this script passes. */
export function commitGateArgs(feature, base) {
  return ["--feature", feature, "--base", base, "--commit-gate", "--front"];
}

/** Every child step, with the argv each pinned line carried. */
export function loopSteps(feature, base) {
  return Object.freeze({
    recordCheck: step("check-loop-record.mjs", floorScript("check-loop-record.mjs"), [recordPath(feature)]),
    decisionCheck: step("check-loop-decision.mjs", floorScript("check-loop-decision.mjs"), [recordPath(feature)]),
    ...ledgerSteps({ feature, command: "/pharn-loop", baseSha: base }),
    fresh: step("check-loop-fresh.mjs --commit-gate --front", floorScript("check-loop-fresh.mjs"), commitGateArgs(feature, base)),
    setScope: step("set-writes-scope.cjs --from-plan", ".claude/hooks/set-writes-scope.cjs", [
      "--from-plan",
      `${featureDir(feature)}/PLAN.md`,
    ]),
    amend: step("reconcile-baseline.mjs --amend-scope", floorScript("reconcile-baseline.mjs"), ["--amend-scope"]),
    clear: step("set-writes-scope.cjs --clear", ".claude/hooks/set-writes-scope.cjs", ["--clear"]),
    closeGuard: step("require-loop-record.cjs --close", ".claude/hooks/require-loop-record.cjs", ["--close", feature]),
  });
}

// ── git ──────────────────────────────────────────────────────────────────────────────────────────────────────
const GIT_MAX_BUFFER = 1 << 28; // 256 MiB — the stage-runtime.mjs ceiling (a hook's output, a long list)

/** One git call as an argument vector, stdin ignored. Never throws; `status` is a number or null. */
export function gitRun(args, { literal = false } = {}) {
  const env = literal ? { ...process.env, GIT_LITERAL_PATHSPECS: "1" } : process.env;
  let r;
  try {
    r = spawnSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env, maxBuffer: GIT_MAX_BUFFER });
  } catch (e) {
    return { status: null, stdout: "", stderr: "", error: e && typeof e.message === "string" ? e.message : "spawn failed" };
  }
  return {
    status: typeof r.status === "number" ? r.status : null,
    stdout: typeof r.stdout === "string" ? r.stdout : "",
    stderr: typeof r.stderr === "string" ? r.stderr : "",
    error: r.error && typeof r.error.message === "string" ? r.error.message : null,
  };
}

/** The add, commit and undo argv — exported so the tests pin them as the close part carried them. */
export function addArgs(list) {
  return ["add", "-A", `--pathspec-from-file=${list}`, "--pathspec-file-nul"];
}
export function commitArgs(list, feature, decision, iterations) {
  return [
    "commit",
    "-q",
    `--pathspec-from-file=${list}`,
    "--pathspec-file-nul",
    "-m",
    `pharn-loop(${feature}): ${decision} after ${iterations} iteration(s)`,
    "-m",
    COMMIT_BODY,
  ];
}
export function undoArgs(list, branch) {
  return [
    { args: ["reset", "-q", `--pathspec-from-file=${list}`, "--pathspec-file-nul"], literal: true },
    { args: ["checkout", "-", "--"], literal: false },
    { args: ["branch", "-d", branch], literal: false },
  ];
}

// ── the record ───────────────────────────────────────────────────────────────────────────────────────────────

/** The envelope as check-loop-decision.mjs reads it: FM_RE after stripBom, `key: value`, surrounding quotes
 *  stripped. A Map (L15). null when there is no frontmatter or the input is not a string. */
export function readEnvelope(text) {
  if (typeof text !== "string") return null;
  const m = stripBom(text).match(FM_RE);
  if (!m) return null;
  const fields = new Map();
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*):[ \t]*(.*)$/);
    if (kv) fields.set(kv[1], kv[2].trim().replace(/^(["'])(.*)\1$/, "$2"));
  }
  return fields;
}

/** The four facts the close reads, each null when outside its enum/regex. `mode` absent reads `full`. */
export function recordFacts(text) {
  const f = readEnvelope(text);
  if (f === null) return { decision: null, mode: null, blocked: null, hasBlocked: false, iterations: null };
  const d = f.get("decision");
  const decision = cleanScalar(d, 32) && DECISION_ENUM.has(d) ? d : null;
  let mode = "full";
  if (f.has("mode")) {
    const m = f.get("mode");
    mode = cleanScalar(m, 16) && MODE_ENUM.has(m) ? m : null;
  }
  const hasBlocked = f.has("blocked");
  const b = f.get("blocked");
  const blocked = hasBlocked && cleanScalar(b, 64) && BLOCKED_RE.test(b) ? b : null;
  const it = f.get("iterations");
  const iterations = cleanScalar(it, 16) && ITER_RE.test(it) && Number(it) >= 1 ? it : null;
  return { decision, mode, blocked, hasBlocked, iterations };
}

/** Read a regular file's text, or null (absent, not a regular file, unreadable). Never follows a link. */
function readRegular(path) {
  const s = lstatSafe(path);
  if (!s.ok || s.stat === null || !s.stat.isFile()) return null;
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

/** Does SPEC.md's `state` read Approved? The Step 6a rule keys on the state (frontmatter-core readField). */
export function specApproved(feature) {
  const text = readRegular(specPath(feature));
  if (text === null) return false;
  const m = stripBom(text).match(FM_RE);
  return m !== null && readField(m[1], "state") === "Approved";
}

// ── the staging list ─────────────────────────────────────────────────────────────────────────────────────────

/** Present and a regular file (lstat — L54). */
function isRegular(path) {
  const s = lstatSafe(path);
  return s.ok && s.stat !== null && s.stat.isFile();
}
/** Absent by lstat ENOENT — the only proof of absence (L54). */
function isAbsent(path) {
  const s = lstatSafe(path);
  return s.ok && s.stat === null;
}

/**
 * The close part's Step 6c builder, as a function. `code`: 0 built · 3 the scope file was not set from this plan ·
 * 4 the lock, or a test it pins, is not a regular non-ignored file · 1 the scope file or the lock is unreadable or
 * malformed (the inline builder's node crash). Every non-zero code is `stage failed`. Total over hostile JSON (L62):
 * a non-string path is refused by type, never stringified.
 */
export function buildStageList(feature, { git = gitRun } = {}) {
  const ignored = (p) => git(["check-ignore", "-q", "--", p]).status === 0;
  const trackedAtHead = (p) => git(["cat-file", "-e", `HEAD:${p}`], { literal: true }).status === 0;
  let rec;
  try {
    rec = JSON.parse(readFileSync(".pharn/writes-scope.json", "utf8"));
  } catch {
    return { code: 1, paths: [], detail: ".pharn/writes-scope.json is unreadable or not JSON" };
  }
  if (rec === null || typeof rec !== "object" || Array.isArray(rec))
    return { code: 1, paths: [], detail: "the scope record is not an object" };
  if (rec.set_by !== `${featureDir(feature)}/PLAN.md`) return { code: 3, paths: [], detail: "the scope file was not set from this plan" };
  const scope = rec.scope;
  if (!Array.isArray(scope) || !scope.every((p) => typeof p === "string"))
    return { code: 1, paths: [], detail: "the scope is not a list of paths" };
  const artifacts = STAGE_ARTIFACTS.map((f) => `${featureDir(feature)}/${f}`);
  const lock = lockPath(feature);
  let pinned = [];
  if (!isAbsent(lock)) {
    if (!isRegular(lock) || ignored(lock)) return { code: 4, paths: [], detail: "the AC-TESTS lock is not a regular, non-ignored file" };
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(lock, "utf8"));
    } catch {
      return { code: 1, paths: [], detail: "the AC-TESTS lock is not JSON" };
    }
    const files = parsed !== null && typeof parsed === "object" ? parsed.files : undefined;
    if (!Array.isArray(files)) return { code: 1, paths: [], detail: "the AC-TESTS lock has no files list" };
    pinned = files.map((f) => (f !== null && typeof f === "object" ? f.path : undefined));
    for (const p of pinned) {
      if (typeof p !== "string" || !isRegular(p) || ignored(p))
        return { code: 4, paths: [], detail: "a test the lock pins is not a regular, non-ignored file" };
    }
  }
  const keep = [];
  for (const p of scope.concat(artifacts, pinned)) {
    const regular = isRegular(p);
    const deleted = !regular && isAbsent(p) && trackedAtHead(p);
    if (!regular && !deleted) continue;
    if (ignored(p)) continue;
    if (!keep.includes(p)) keep.push(p);
  }
  return { code: 0, paths: keep, detail: null };
}

/** Write the NUL-separated list after a containment walk. Returns null on success, else why. */
function writeStageList(feature, paths) {
  const rel = stageListPath(feature);
  const root = process.cwd();
  const walk = containmentWalk(root, join(root, rel));
  if (!walk.ok) return walk.reason;
  try {
    mkdirSync(join(root, ".pharn", "pharn-loop", feature), { recursive: true });
    writeFileSync(rel, paths.map((p) => `${p}\0`).join(""));
    return null;
  } catch (e) {
    return e && typeof e.message === "string" ? e.message : "write failed";
  }
}

// ── the branch ───────────────────────────────────────────────────────────────────────────────────────────────

/** The first absent pharn-loop/<name>, pharn-loop/<name>-2, …, created with `git switch -c`. */
export function createBranch(feature, { git = gitRun } = {}) {
  let b = `pharn-loop/${feature}`;
  let n = 2;
  while (git(["show-ref", "--verify", "--quiet", `refs/heads/${b}`]).status === 0) {
    b = `pharn-loop/${feature}-${n}`;
    n++;
  }
  const r = git(["switch", "-c", b]);
  return { ok: r.status === 0, branch: b, result: r };
}

/** The undo after a failed add or commit: unstage the list, return to the previous checkout, delete the branch. */
export function undoBranch(feature, branch, { git = gitRun, log = () => {} } = {}) {
  const statuses = [];
  for (const u of undoArgs(stageListPath(feature), branch)) {
    const r = git(u.args, { literal: u.literal });
    echo(log, { id: `git ${u.args.slice(0, 2).join(" ")}` }, r);
    statuses.push(r.status);
  }
  return statuses;
}

/** Where the checkout is: the branch name, or `detached@<sha>`, or null. */
function checkoutNow(git) {
  const s = git(["symbolic-ref", "--short", "-q", "HEAD"]);
  if (s.status === 0 && s.stdout.trim() !== "") return s.stdout.trim();
  const h = git(["rev-parse", "HEAD"]);
  const sha = h.stdout.trim();
  return h.status === 0 && SHA_RE.test(sha) ? `detached@${sha}` : null;
}

// ── the close ────────────────────────────────────────────────────────────────────────────────────────────────

function emptyDoc(feature) {
  const doc = {};
  for (const k of DOC_KEYS) doc[k] = null;
  doc.schema = SCHEMA;
  doc.feature = feature;
  return doc;
}

/** The freshness ledger, as Step 7 printed it. */
function printFreshness(feature, log) {
  const p = freshnessPath(feature);
  const text = readRegular(p);
  if (text !== null) {
    log(`── ${p}\n${indent(text)}`);
  } else if (isAbsent(p)) {
    log(`── ${p}\n  no re-runs\n`);
  } else {
    log(`── ${p}\n  not a regular file — not read\n`);
  }
}

/**
 * The whole close. Returns the closing document (its `exit` is the process exit). `run`, `git` and `log` are
 * parameters so the tests can record every step; the CLI passes the real ones. `trace.phase` names the step reached,
 * for the crash message.
 */
export function closeLoop({ feature, base, afterRepair = false, run = runStep, git = gitRun, log = () => {}, trace = {} }) {
  const doc = emptyDoc(feature);
  const steps = loopSteps(feature, base);
  trace.phase = "preflight";
  const fd = lstatSafe(featureDir(feature));
  if (!fd.ok || fd.stat === null || !fd.stat.isDirectory()) {
    log(`── refused: ${featureDir(feature)}/ is not a directory under the invoking directory — run from the project root\n`);
    doc.exit = EXIT.UNUSABLE;
    doc.refusal = "no-feature-dir";
    return doc;
  }
  const current = git(["symbolic-ref", "--short", "-q", "HEAD"]);
  if (current.status === 0 && isLoopBranchOf(feature, current.stdout.trim())) {
    log("── refused: the checkout is already on this run's pharn-loop branch — the closeout ran before; never re-run it\n");
    doc.exit = EXIT.UNUSABLE;
    doc.refusal = "on-loop-branch";
    return doc;
  }

  trace.phase = "record-check";
  const rc = run(steps.recordCheck);
  echo(log, steps.recordCheck, rc);
  doc.record_check = rc.status === 0 ? "GREEN" : "RED";
  if (doc.record_check === "RED" && !afterRepair) {
    log("── stopped: the record is RED — repair it, then run this line again with --after-repair (nothing else ran)\n");
    doc.exit = EXIT.REPAIR;
    return doc;
  }

  trace.phase = "envelope";
  const facts = recordFacts(readRegular(recordPath(feature)));
  doc.decision = facts.decision;
  doc.mode = facts.mode;
  doc.blocked = facts.blocked;
  const blockedStop = facts.decision === "INCONCLUSIVE" && facts.hasBlocked;

  trace.phase = "decision-check";
  if (blockedStop) {
    doc.decision_check = "N/A";
    log("── check-loop-decision.mjs not run: a blocked stop never consulted check-loop.mjs\n");
  } else {
    const dc = run(steps.decisionCheck);
    echo(log, steps.decisionCheck, dc);
    doc.decision_check = dc.status === 0 ? "GREEN" : "RED";
  }

  trace.phase = "ledger";
  doc.run_stop = runStop({ steps, run, log });
  Object.assign(doc, runLedgerTail({ steps, quick: facts.mode === "quick", run, log }));
  doc.freshness = "not-run";

  let gitReached = false;
  const owed = (reason) => {
    doc.outcome = `not committed: ${reason}`;
    doc.exit = EXIT.OWED;
    return finish();
  };
  const finish = () => {
    trace.phase = "finish";
    if (gitReached) writePhase(feature, "finished", log);
    printFreshness(feature, log);
    doc.checkout = checkoutNow(git);
    if (doc.exit === EXIT.COMMITTED || doc.exit === EXIT.NOT_COMMITTED) {
      trace.phase = "release";
      const c1 = run(steps.clear);
      echo(log, steps.clear, c1);
      const c2 = run(steps.closeGuard);
      echo(log, steps.closeGuard, c2);
      doc.released = c1.status === 0 && c2.status === 0;
    }
    return doc;
  };

  trace.phase = "green-gate";
  if (facts.decision === null) return owed("decision unverifiable");
  const greenToken = facts.decision === GREEN_TOKENS.full || facts.decision === GREEN_TOKENS.quick;
  if (!greenToken || facts.hasBlocked) {
    doc.outcome = `not committed: ${facts.decision}`;
    if (specApproved(feature)) {
      log("── SPEC.md still reads Approved on a stop that is not green: Step 6a did not run — Step 6d's revert is owed\n");
      doc.exit = EXIT.OWED;
    } else {
      doc.exit = EXIT.NOT_COMMITTED;
    }
    return finish();
  }
  const agrees = facts.mode !== null && GREEN_TOKENS[facts.mode] === facts.decision;
  if (doc.decision_check !== "GREEN" || !agrees || facts.iterations === null) return owed("decision unverifiable");

  trace.phase = "commit-gate";
  const fr = run(steps.fresh);
  echo(log, steps.fresh, fr);
  doc.freshness = fr.status === 0 ? "FRESH" : "STALE";
  if (fr.status !== 0) return owed("evidence stale");

  trace.phase = "scope";
  const sc = run(steps.setScope);
  echo(log, steps.setScope, sc);
  if (sc.status !== 0) return owed("stage failed");
  const am = run(steps.amend);
  echo(log, steps.amend, am);

  trace.phase = "stage-list";
  const list = buildStageList(feature, { git });
  if (list.code !== 0) {
    log(`── staging list refused (builder code ${list.code}): ${list.detail}\n`);
    return owed("stage failed");
  }
  if (list.paths.length === 0) {
    log("── staging list empty\n");
    return owed("nothing staged");
  }
  const wrote = writeStageList(feature, list.paths);
  if (wrote !== null) {
    log(`── staging list not written: ${wrote}\n`);
    return owed("stage failed");
  }
  log(`── staging list: ${list.paths.length} path(s) -> ${stageListPath(feature)}\n`);

  trace.phase = "branch";
  gitReached = true;
  writePhase(feature, "branch", log);
  const br = createBranch(feature, { git });
  echo(log, { id: "git switch -c" }, br.result);
  if (!br.ok) return owed("branch failed");
  doc.branch = br.branch;

  trace.phase = "add";
  writePhase(feature, "add", log);
  const add = git(addArgs(stageListPath(feature)), { literal: true });
  echo(log, { id: "git add" }, add);
  if (add.status !== 0) {
    writePhase(feature, "undo", log);
    undoBranch(feature, br.branch, { git, log });
    return owed("stage failed");
  }
  trace.phase = "commit";
  writePhase(feature, "commit", log);
  const cm = git(commitArgs(stageListPath(feature), feature, facts.decision, facts.iterations), { literal: true });
  echo(log, { id: "git commit" }, cm);
  if (cm.status !== 0) {
    writePhase(feature, "undo", log);
    undoBranch(feature, br.branch, { git, log });
    return owed("commit failed");
  }
  trace.phase = "committed";
  writePhase(feature, "committed", log);
  const h = git(["rev-parse", "HEAD"]);
  const sha = h.stdout.trim();
  doc.commit = h.status === 0 && SHA_RE.test(sha) ? sha : null;
  doc.outcome = `committed ${br.branch}`;
  doc.exit = EXIT.COMMITTED;
  return finish();
}

// ── argv ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** `{ok: true, feature, base, afterRepair}` or `{ok: false, detail}`. */
export function parseArgs(argv) {
  const seen = new Set();
  const out = { feature: undefined, base: undefined, afterRepair: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (seen.has(a)) return { ok: false, detail: `${a} given twice` };
    if (a === "--feature" || a === "--base") {
      if (i + 1 >= argv.length) return { ok: false, detail: `${a} needs a value` };
      seen.add(a);
      out[a === "--feature" ? "feature" : "base"] = argv[++i];
    } else if (a === "--after-repair") {
      seen.add(a);
      out.afterRepair = true;
    } else {
      return { ok: false, detail: `unexpected argument ${JSON.stringify(a)}` };
    }
  }
  if (typeof out.feature !== "string" || !FEATURE_SLUG_RE.test(out.feature)) {
    return { ok: false, detail: `--feature must match ${FEATURE_SLUG_RE}` };
  }
  if (typeof out.base !== "string" || !SHA_RE.test(out.base)) return { ok: false, detail: `--base must match ${SHA_RE}` };
  return { ok: true, ...out };
}

function main(argv) {
  const log = (s) => process.stdout.write(s);
  const p = parseArgs(argv);
  if (!p.ok) {
    process.stderr.write(
      `loop-closeout: ${p.detail}\nusage: node pharn/floor/loop-closeout.mjs --feature <name> --base <40-hex> [--after-repair]\n`
    );
    const doc = emptyDoc(null);
    doc.exit = EXIT.UNUSABLE;
    doc.refusal = "usage";
    log(closingLine(doc));
    process.exitCode = EXIT.UNUSABLE;
    return;
  }
  const trace = { phase: "start" };
  try {
    const doc = closeLoop({ feature: p.feature, base: p.base, afterRepair: p.afterRepair, log, trace });
    log(closingLine(doc));
    process.exitCode = doc.exit;
  } catch (e) {
    process.stderr.write(
      `loop-closeout: crashed in phase ${trace.phase}: ${e && typeof e.message === "string" ? e.message : "unknown error"}\n`
    );
    process.exitCode = 1;
  }
}

if (import.meta.main) main(process.argv.slice(2));
