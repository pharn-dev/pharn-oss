#!/usr/bin/env node
// pharn/floor/run-gates.mjs — the EXECUTION half of the gate runner: it runs each gate and records its
// exit code, so the `{gate-id: exit-int}` map both verdict cores consume is produced by tested code
// rather than typed by a model. The grammar/coverage half is gate-run-core.mjs and the hashing half is
// worktree-fingerprint.mjs (P3, one axis per file: this file changes when EXECUTION changes).
//
// ================================== THE SHAPE, AND WHY IT IS THIS ==================================
//
// TWO subcommands, ONE Bash call each, because the harness runs each fenced block as its own process
// and a long suite must not be wrapped in a loop the harness can kill mid-run:
//
//   init      resolves the set ONCE, wipes and recreates <out>, writes the in-progress record, prints the
//             ordered ids. Exits 3 — writing no state — iff the SOURCE set is empty; injected entries
//             never make a set non-empty (gate-run-core computes that refusal before injection, L34).
//   run --next runs exactly the next unrun entry in spec order, prints {ran, exit, timed_out, remaining},
//             and exits 0. A FAILING GATE IS DATA, NOT A RUNNER ERROR — exit 0 with a non-zero `exit`.
//             Exit 3 when nothing remains; exit 2 on a runner error, carrying a closed `reason_code`.
//             The call that runs the LAST entry also finalizes.
//
// The model never types a gate id and never captures an exit code, so there is nothing to mistype or
// omit (lessons-learned L22: pin the command line rather than describing the technique; L30: the gate a
// step ASKS for is the one that gets skipped — here the step asks for nothing).
//
// ===================================== PATH RESOLUTION =====================================
// EVERY path operand — `--out`, `--spec-from`, `--discover`, `--scope-json` — resolves against the
// directory the runner is INVOKED from, and containment is checked against THAT directory's `.pharn/`.
// `--cwd` changes exactly two things: where the gates EXECUTE, and which tree is fingerprinted (and whose
// HEAD is recorded). It never moves the runner's own records.
//
// Why, stated because the other reading was shipped and was wrong (lessons-learned L45): `init` used to
// resolve `--out` and `--spec-from` against `--cwd`, while `run --next` — which takes no `--cwd` — resolved
// `--out` against the invoking directory. The two subcommands therefore disagreed about where the record
// lived whenever `--cwd` was not `.`, and the one caller that passes it (/pharn-regress Step 4b's base
// side, `--cwd .pharn/pharn-regress/base`) failed at `init` with `spec-mismatch`, reading the head record
// from INSIDE the base worktree. Every test ran with the default `--cwd .`, so nothing saw it (L41).
//
// The corollary: `init` and every `run --next` for one `<out>` must be issued from the SAME directory.
// Every pinned caller issues both from the repo root.
//
// ==================================== SINGLE STORE (L35) ====================================
// `<out>/state.json` is the stamp IN PROGRESS (`finalized: false`). Finalizing writes `<out>/stamp.json`
// and REMOVES the state file, so exactly ONE store of the map exists at rest. No `results.json` is ever
// written: a second copy plus an equality check would certify agreement, not the fact (L43).
//
// ===================================== BOUNDS, NAMED =====================================
//   • POSIX only. Process groups, SIGTERM->SIGKILL escalation and `/bin/sh` are assumed.
//   • Gates are assumed ORDER-INDEPENDENT. ALLOWLIST order is fixed and recorded, but a gate needing
//     another's output must build it itself (e.g. a `pretest` script).
//   • A descendant that calls `setsid` leaves the process group and escapes the group kill.
//   • If the HARNESS kills this process before its own `--timeout-ms` fires, the group is orphaned —
//     which is why the invoking command's Bash timeout must exceed `--timeout-ms`, and why
//     `--timeout-ms` is REQUIRED rather than defaulted: floor code carries no harness-specific default,
//     so there is no default for a test to leave unexercised (lessons-learned L41).
//   • `--gates` TOKENS ARE COMMA-SEPARATED, so a command containing a literal comma cannot be expressed
//     there — the same convention check-regress.mjs's `--eval-pairs` uses. Such a gate goes in a wrapper
//     script whose path has no comma. Stated because a split token fails in a confusing place.
//   • NO SHELL COMMAND STRING IS EVER PARSED. argv entries never touch a shell; a `--gates` shell token
//     is handed to `/bin/sh -c '<cmd> "$@"' sh <files…>` so file names arrive as POSITIONAL arguments and
//     are never interpolated into the command text.
//   • Gate stdout/stderr go to files BY FD, never through a pipe buffer, so there is no `maxBuffer` kill
//     and a large log cannot truncate a verdict. Only their sha256 reaches the stamp; no verdict reads
//     their content (P2 — they are untrusted free text).
//   • LOG GROWTH: `init` recreates `<out>`, which bounds growth WITHIN a stage. Across iterations of
//     /pharn-loop the logs accumulate under the git-ignored state root and nothing prunes them. Stated
//     rather than discovered.
//
// TRUST (P2): every operand is a path, an integer or a hex digest. Untrusted inputs — a `--gates`
// string, a `--extra` array, a scope JSON — are shape-gated by gate-run-core.mjs before use and are
// never eval'd, imported, or compiled into a RegExp.
//
// Usage:
//   node pharn/floor/run-gates.mjs init --stage verify|regress [--side base|head] --feature <name>
//        --out <dir> [--cwd <dir>] [--base <featureBase>] [--discover <package.json>] [--gates "<c>[::<id>],…"]
//        [--extra <json-array>] [--scope-json <file>] [--skip-style] [--spec-from <dir>]
//   node pharn/floor/run-gates.mjs run --next --out <dir> --timeout-ms <N>
//
// Exit: init  0 ok · 2 runner error (reason_code) · 3 empty SOURCE set (nothing written)
//       run   0 an entry ran (or none remained to claim) · 2 runner error (reason_code) · 3 nothing left

import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  closeSync,
  readFileSync,
  writeFileSync,
  renameSync,
  rmSync,
  unlinkSync,
} from "node:fs";
import { resolve, join, sep } from "node:path";
import { spawn, spawnSync, execFileSync } from "node:child_process";
import { constants as osConstants } from "node:os";
import { SCHEMA, STRUCTURAL_PREFIX, isReasonCode, resolveSet, completenessArgv, actualForExpected, logBasename } from "./gate-run-core.mjs";
import { fingerprint } from "./worktree-fingerprint.mjs";

const STATE_ROOT = ".pharn";
/** Grace between SIGTERM and SIGKILL, and the pid-reuse margin on a stale lock. */
const KILL_GRACE_MS = 2000;
const LOCK_GRACE_MS = 30000;

/** ------------------------------------------------------------------------------------------------
 *  Emit + exit. One JSON document on stdout, always — a caller parses stdout and branches on the exit
 *  code, never on prose.
 *  ---------------------------------------------------------------------------------------------- */
/** The lock this invocation holds, if any. `emit()` calls `process.exit()`, which does NOT run a
 *  `finally` block — so a try/finally around the work would never release it, and every call would leave
 *  its lock for the next one to recover as stale. Releasing here is what makes the lock a lock rather
 *  than a speed bump that happens to clear itself. Found by the test that asserts the lock is gone after
 *  a NORMAL call, not by reading the code. */
let heldLock = null;

function emit(obj, code) {
  if (heldLock) {
    releaseLock(heldLock);
    heldLock = null;
  }
  console.log(JSON.stringify(obj, null, 2));
  process.exit(code);
}

function fail(reason_code, reason) {
  // Fail-closed: the vocabulary is closed, so a refusal cannot be invented at the call site.
  if (!isReasonCode(reason_code)) throw new Error(`internal: '${reason_code}' is not a closed reason_code`);
  emit({ ok: false, reason_code, reason }, 2);
}

function flag(args, name) {
  const i = args.indexOf(name);
  return i !== -1 && i + 1 < args.length ? args[i + 1] : undefined;
}

function has(args, name) {
  return args.includes(name);
}

/** ------------------------------------------------------------------------------------------------
 *  CONTAINMENT. Every path this runner writes or deletes must resolve STRICTLY inside the state root,
 *  must not BE the state root, and may not traverse a symlink at any component. Checked once per
 *  invocation, before anything is created — a check performed after a write is not a containment check.
 *
 *  `base` is the directory `outDir` is resolved against and whose `.pharn/` is the state root. Both
 *  subcommands pass the INVOKING directory, never `--cwd` (see PATH RESOLUTION in the header).
 *  ---------------------------------------------------------------------------------------------- */
function assertContained(outDir, base) {
  const rootAbs = resolve(base, STATE_ROOT);
  const outAbs = resolve(base, outDir);
  if (outAbs === rootAbs) {
    fail("path-containment", `--out may not BE the state root (${rootAbs}); use a subdirectory such as ${rootAbs}/pharn-verify/gates`);
  }
  if (!(outAbs + sep).startsWith(rootAbs + sep)) {
    fail("path-containment", `--out must resolve strictly inside ${rootAbs}; got ${outAbs}`);
  }
  // Walk every component from the root down. lstat, never stat: stat FOLLOWS the link, which is exactly
  // the case being refused. A component that does not exist yet is fine — it cannot be a symlink.
  //
  // ABSENCE IS PROVEN BY lstat's OWN ENOENT, never by `existsSync` (lessons-learned L54). `existsSync` is a
  // stat, so a DANGLING link read as absent: the walk broke off before lstat saw it, and `mkdirSync` then
  // crashed through the link with no document. The same guard read a FILE component as absent. Any other
  // lstat error (ENOTDIR under a file, EACCES) is refused under `path-containment`. That is because
  // the walk cannot PROVE the path safe, not because it found an escape. The closed vocabulary is not
  // widened for it.
  let cur = rootAbs;
  const restParts = outAbs.slice(rootAbs.length).split(sep).filter(Boolean);
  for (const part of [rootAbs, ...restParts.map((p) => p)]) {
    cur = part === rootAbs ? rootAbs : join(cur, part);
    let st;
    try {
      st = lstatSync(cur);
    } catch (e) {
      if (e && e.code === "ENOENT") break; // truly absent: lstat does not follow links, so a dangling one never lands here
      fail("path-containment", `cannot lstat ${cur}: ${e.message}`);
    }
    if (st.isSymbolicLink()) {
      fail("path-containment", `refusing a --out path that traverses a symlink at ${cur}`);
    }
  }
  return outAbs;
}

/** Atomic write: a temp sibling, then rename. A reader never observes a half-written record. */
function writeAtomic(file, text) {
  const tmp = `${file}.tmp-${process.pid}`;
  writeFileSync(tmp, text, "utf8");
  renameSync(tmp, file);
}

function readJson(file) {
  try {
    return { ok: true, value: JSON.parse(readFileSync(file, "utf8")) };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

function sha256File(file) {
  try {
    return createHash("sha256").update(readFileSync(file)).digest("hex");
  } catch {
    return null;
  }
}

/** ------------------------------------------------------------------------------------------------
 *  THE LOCK. `<out>/lock` holds `{pid, started_ms, timeout_ms}`. Parallel Bash calls are real in this
 *  harness, so two `run --next` invocations could otherwise claim the same entry and double-run a gate.
 *
 *  Staleness has TWO independent triggers, and the second exists because of the first's flaw: a dead pid
 *  is the normal signal, but pids are REUSED, so a long-dead runner's pid may be alive as something
 *  else. The age test bounds that — a lock older than its own `--timeout-ms` plus a grace margin cannot
 *  belong to a live run, whatever the pid says. Neither path is reachable from an end-to-end run (they
 *  need a crashed runner), so each is exercised by a test that CONSTRUCTS the state directly — a default
 *  no test reaches is a default that is wrong for a release line (lessons-learned L41).
 *
 *  THE CLAIM IS ONE CALL SITE, and that is the whole of `claimLock()`'s reason to exist. `wx` —
 *  exclusive create — IS the claim: a separate existence test first would be a check-then-use (CWE-367,
 *  CodeQL js/file-system-race), and so is a SECOND `wx` site, because that rule's "check" is `openSync`
 *  every bit as much as `existsSync` — the first site dominates the second and the name can be replaced
 *  between them. Removing only the `existsSync` member left the pair standing around the member the fix
 *  ADDED, which is why the enumeration, not the member, is what a test may pin (lessons-learned L29/L36).
 *
 *  NOT CLAIMED — and an earlier comment here asserted the opposite, so the retraction is explicit:
 *  two recoveries that both judged the SAME incumbent stale can BOTH end up holding the lock. A unlinks
 *  and creates; B then unlinks A's FRESH lock and creates its own. The exclusive create decides a race
 *  to CREATE on an unheld name; it cannot decide a race to REMOVE a held one, because POSIX has no
 *  conditional unlink. What the lock does hold against is the case an end-to-end run produces — two
 *  runners contending for a LIVE lock. Recovery is best-effort; closing it needs a second protocol
 *  (an exclusive tombstone keyed to the incumbent's bytes), and no observed run has produced the race,
 *  so it is a named residual rather than a build (P7): `run-gates-lock-recovery-race`.
 *  ---------------------------------------------------------------------------------------------- */
function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    // EPERM means the process exists and belongs to another user — alive for our purposes.
    return e.code === "EPERM";
  }
}

function lockPath(outAbs) {
  return join(outAbs, "lock");
}

function isStaleLock(lock, nowMs) {
  if (lock === null || typeof lock !== "object") return true;
  if (!Number.isInteger(lock.pid) || !Number.isInteger(lock.started_ms)) return true;
  if (!pidAlive(lock.pid)) return true;
  const budget = (Number.isInteger(lock.timeout_ms) ? lock.timeout_ms : 0) + LOCK_GRACE_MS;
  return nowMs - lock.started_ms > budget;
}

/** The claim, and the file's ONLY `openSync(lp, …)`. `busy` is EEXIST — the one outcome a caller may
 *  recover from; every other errno is a refusal, exactly as before. */
function claimLock(lp, timeoutMs) {
  let fd;
  try {
    fd = openSync(lp, "wx");
  } catch (e) {
    return { held: false, busy: e.code === "EEXIST" };
  }
  try {
    writeFileSync(fd, JSON.stringify({ pid: process.pid, started_ms: Date.now(), timeout_ms: timeoutMs }));
  } finally {
    closeSync(fd);
  }
  return { held: true, busy: false };
}

function takeLock(outAbs, timeoutMs) {
  const lp = lockPath(outAbs);
  const first = claimLock(lp, timeoutMs);
  if (first.held) return lp;
  if (!first.busy) fail("lock-busy", `another run-gates invocation is starting at ${lp}`);
  // EEXIST: read the incumbent and recover ONLY if it is stale. A record that does not parse cannot be
  // judged live, so it is stale — `isStaleLock(null)` is `true`, never a reason to trust it.
  const r = readJson(lp);
  const lock = r.ok ? r.value : null;
  if (!isStaleLock(lock, Date.now())) {
    fail("lock-busy", `another run-gates invocation holds ${lp} (pid ${lock.pid}); parallel calls are refused`);
  }
  // Stale: recovered. Its in-progress entry, if any, is re-run — `claimed` is cleared below.
  try {
    unlinkSync(lp);
  } catch {
    /* raced with another recovery — the exclusive create below decides who CREATES the next lock */
  }
  if (!claimLock(lp, timeoutMs).held) {
    fail("lock-busy", `another run-gates invocation is starting at ${lp}`);
  }
  return lp;
}

function releaseLock(lp) {
  try {
    unlinkSync(lp);
  } catch {
    /* already gone */
  }
}

/** ------------------------------------------------------------------------------------------------
 *  init
 *  ---------------------------------------------------------------------------------------------- */
function readScopeJson(file) {
  const r = readJson(file);
  if (!r.ok) return { ok: false, reason: `--scope-json is not readable/parseable (${file}): ${r.reason}` };
  const v = r.value;
  if (v === null || typeof v !== "object" || Array.isArray(v)) return { ok: false, reason: `--scope-json must be a JSON object (${file})` };
  // Refuse a scope whose own verdict says the partition is untrustworthy. A gate set derived from an
  // inconclusive or escaped scope would be a set nobody can defend.
  if (Array.isArray(v.escaped) && v.escaped.length > 0) {
    return {
      ok: false,
      reason: `--scope-json reports ${v.escaped.length} escaped path(s) — resolve the scope breach before running gates`,
    };
  }
  if (v.verdict === "inconclusive") {
    return { ok: false, reason: "--scope-json verdict is 'inconclusive' — the inside/outside partition is not usable" };
  }
  const tests = Array.isArray(v.outside_tests) ? v.outside_tests : [];
  const pairs = Array.isArray(v.outside_eval_pairs) ? v.outside_eval_pairs : [];
  for (const t of tests) {
    if (typeof t !== "string" || t.includes("*")) {
      return { ok: false, reason: `--scope-json outside_tests entry ${JSON.stringify(t)} is not an expanded real path` };
    }
  }
  return { ok: true, tests, pairs };
}

function runInit(args) {
  const cwd = flag(args, "--cwd") ?? ".";
  const out = flag(args, "--out");
  if (!out) fail("usage-error", "init requires --out <dir>");
  // Against the INVOKING directory, never `--cwd` — `run --next` resolves `--out` the same way.
  const outAbs = assertContained(out, process.cwd());

  const stage = flag(args, "--stage");
  const side = flag(args, "--side") ?? null;
  const feature = flag(args, "--feature");
  const featureBase = flag(args, "--base") ?? "pharn/features";
  const specFrom = flag(args, "--spec-from");

  // --side base copies the HEAD spec VERBATIM, so the gate set is decided ONCE and both sides are
  // compared over the same keys (check-regress.mjs verdict fails inconclusive on a key-set mismatch).
  if (stage === "regress" && side === "base") {
    if (!specFrom) fail("usage-error", "--side base requires --spec-from <head-out> so the set is decided once");
    // The head record lives beside this side's own record, in the invoking directory's state root —
    // resolving it against `--cwd` looked for it inside the base worktree, where it never is.
    const headStampish = join(resolve(specFrom), "state.json");
    const headFinal = join(resolve(specFrom), "stamp.json");
    const src = existsSync(headFinal) ? headFinal : headStampish;
    const r = readJson(src);
    if (!r.ok) fail("spec-mismatch", `--spec-from has no readable record at ${src}: ${r.reason}`);
    const head = r.value;
    if (head.stage !== "regress" || head.side !== "head" || head.feature !== feature) {
      fail(
        "spec-mismatch",
        `--spec-from record is stage=${head.stage} side=${head.side} feature=${head.feature}; expected regress/head/${feature}`
      );
    }
    // The spec lives in `entries` on an IN-PROGRESS record and is reconstructible from `runs` on a
    // FINALIZED stamp (which drops `entries`). Reading `runs` unconditionally yielded an EMPTY set
    // whenever the head side had not run yet — the common case, since both sides are initialized before
    // either runs. Caught by the test that compares the two sides' printed ids.
    const source = Array.isArray(head.entries) && head.entries.length ? head.entries : head.runs;
    if (!Array.isArray(source) || source.length === 0) {
      fail("spec-mismatch", `--spec-from record at ${src} carries no gate entries to copy`);
    }
    const spec = {
      stage: "regress",
      side: "base",
      feature,
      source: head.source,
      source_raw: head.source_raw ?? null,
      style_skipped: head.style_skipped === true,
      required: [...head.required],
      entries: source.map((r2, i) => ({ id: r2.id, shell: r2.shell ?? null, argv: r2.argv ?? null, files: r2.files ?? [], seq: i })),
    };
    return startRecord(spec, outAbs, cwd, args);
  }

  const discover = flag(args, "--discover");
  let scripts = null;
  if (discover) {
    const r = readJson(resolve(discover));
    if (!r.ok) fail("usage-error", `--discover manifest is not readable/parseable: ${r.reason}`);
    scripts = r.value && typeof r.value === "object" ? r.value.scripts : null;
  }

  const res = resolveSet({
    stage,
    side: stage === "regress" ? side : null,
    gates: flag(args, "--gates") ?? null,
    scripts,
    extras: flag(args, "--extra") ?? null,
    skipStyle: has(args, "--skip-style"),
    feature,
  });
  if (!res.ok) {
    // The empty SOURCE set is the ONE refusal that writes no state and exits 3, so the invoking command
    // routes it to its existing no-gates stop: an interactive HALT under /pharn-verify and
    // /pharn-regress, and an unattended `blocked: no-gates` stop under /pharn-loop (S4). Both are
    // fail-closed; neither is a guess.
    if (res.reason_code === "empty-source-set") emit({ ok: false, reason_code: res.reason_code, reason: res.reason }, 3);
    fail(res.reason_code, res.reason);
  }
  const spec = res.spec;

  // regress/head: the file-addressable inputs come from `check-regress.mjs scope`'s OWN JSON, read from
  // a FILE. No list passes through shell word-splitting — L5's original incident, where an unquoted
  // expansion under zsh turned a whole test list into one bogus path and fabricated a pre-existing red.
  if (stage === "regress" && side === "head") {
    const sj = flag(args, "--scope-json");
    if (!sj) fail("usage-error", "--side head requires --scope-json <file>");
    const s = readScopeJson(resolve(sj));
    if (!s.ok) fail("bad-scope-json", s.reason);
    for (const e of spec.entries) {
      if (e.id === "test") e.files = s.tests;
    }
    const pairEntries = [];
    for (const p of s.pairs) {
      const expected = typeof p === "object" && p !== null ? p.expected : null;
      const actual = typeof p === "object" && p !== null ? p.actual : null;
      if (typeof expected !== "string" || typeof actual !== "string") {
        fail("bad-scope-json", `--scope-json outside_eval_pairs entry ${JSON.stringify(p)} is not {expected, actual}`);
      }
      if (actualForExpected(expected) !== actual) {
        fail(
          "bad-scope-json",
          `outside_eval_pairs ${JSON.stringify(expected)} pairs with ${JSON.stringify(actual)}, which is not its colocated findings.json`
        );
      }
      pairEntries.push({
        id: `${STRUCTURAL_PREFIX}${expected}`,
        shell: null,
        argv: ["node", "pharn/floor/check-structural.mjs", expected, actual, "."],
        files: [],
      });
    }
    if (pairEntries.length) {
      pairEntries.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      spec.entries = [...spec.entries, ...pairEntries].map((e, i) => ({ ...e, seq: i }));
    }
  }

  return startRecord(spec, outAbs, cwd, args, { featureBase });
}

function startRecord(spec, outAbs, cwd, args, opts = {}) {
  // Recreate <out>: `init`'s wipe is what guarantees no STALE injected entry, log or stamp survives from
  // an earlier run of this stage. Containment was asserted before this point.
  rmSync(outAbs, { recursive: true, force: true });
  mkdirSync(outAbs, { recursive: true });

  const fp = fingerprint(cwd, { feature: spec.feature });
  if (!fp.ok) fail("usage-error", `cannot fingerprint the worktree: ${fp.reason}`);

  let head = null;
  try {
    head = execFileSync("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf8" }).trim();
  } catch {
    // not a git repo, or an unborn HEAD — `head` stays null: an honest absence, never a fabricated SHA
  }

  // verify only: capture build-completeness into `aux`, NEVER into `runs[]` (GRILL R1 — folding it in
  // would make INCOMPLETE unreachable and silently disable /pharn-ship Step 2b's retry).
  let completeness = null;
  if (spec.stage === "verify") {
    const argv = completenessArgv(spec.feature, opts.featureBase ?? "pharn/features");
    const outFile = join(outAbs, "completeness.json");
    const r = runSync(argv, cwd, outFile, join(outAbs, "completeness.err"));
    completeness = r.exit;
  }

  const record = {
    schema: SCHEMA,
    stage: spec.stage,
    side: spec.side,
    feature: spec.feature,
    head: head && /^[0-9a-f]{40}$/.test(head) ? head : null,
    source: spec.source,
    source_raw: spec.source_raw,
    style_skipped: spec.style_skipped,
    finalized: false,
    fingerprint: { algo: fp.algo, init: fp.digest, final: null },
    required: spec.required,
    entries: spec.entries,
    runs: [],
    aux: { completeness },
    cwd,
  };
  writeAtomic(join(outAbs, "state.json"), JSON.stringify(record, null, 2));
  emit({ ok: true, stage: spec.stage, side: spec.side, feature: spec.feature, source: spec.source, ids: spec.entries.map((e) => e.id) }, 0);
}

/** ------------------------------------------------------------------------------------------------
 *  Execution. A gate runs in its OWN PROCESS GROUP with stdin ignored, so a timeout kills the whole
 *  tree rather than only the immediate child.
 *  ---------------------------------------------------------------------------------------------- */
function signalExit(signalName) {
  const n = osConstants.signals[signalName];
  return Number.isInteger(n) ? 128 + n : 128;
}

function spawnGate(entry, cwd, outFile, errFile, timeoutMs) {
  return new Promise((done) => {
    let cmd;
    let argv;
    if (entry.shell) {
      // Files arrive as POSITIONAL args after `sh`, so `a b` stays ONE argument and `$(x)` is a literal.
      cmd = "/bin/sh";
      argv = ["-c", `${entry.shell} "$@"`, "sh", ...(entry.files ?? [])];
    } else {
      const base = entry.argv ?? [];
      cmd = base[0];
      argv = base.slice(1);
      if (entry.id === "test" && (entry.files ?? []).length) argv = [...argv, "--", ...entry.files];
    }

    let fdOut;
    let fdErr;
    try {
      fdOut = openSync(outFile, "w");
      fdErr = openSync(errFile, "w");
    } catch (e) {
      if (fdOut !== undefined) closeSync(fdOut);
      return done({ exit: 2, timed_out: false, spawnError: `cannot open gate log files: ${e.message}` });
    }

    let settled = false;
    let timedOut = false;
    let killTimer = null;
    let graceTimer = null;

    const child = spawn(cmd, argv, { cwd, detached: true, stdio: ["ignore", fdOut, fdErr] });

    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (killTimer) clearTimeout(killTimer);
      if (graceTimer) clearTimeout(graceTimer);
      try {
        closeSync(fdOut);
      } catch {
        /* already closed */
      }
      try {
        closeSync(fdErr);
      } catch {
        /* already closed */
      }
      done(result);
    };

    child.on("error", (e) => {
      // A spawn failure is a RUNNER-visible exit code, not a crash: ENOENT and EACCES carry the shell's
      // own conventional codes so a reader sees the same number a shell would have reported.
      const code = e.code === "ENOENT" ? 127 : e.code === "EACCES" ? 126 : 2;
      finish({ exit: code, timed_out: false, spawnError: e.code === "ENOENT" || e.code === "EACCES" ? null : e.message });
    });

    child.on("close", (code, signal) => {
      if (signal) return finish({ exit: timedOut ? 124 : signalExit(signal), timed_out: timedOut, spawnError: null });
      finish({ exit: code === null ? 2 : code, timed_out: timedOut, spawnError: null });
    });

    killTimer = setTimeout(() => {
      timedOut = true;
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        /* group already gone */
      }
      graceTimer = setTimeout(() => {
        try {
          process.kill(-child.pid, "SIGKILL");
        } catch {
          /* group already gone */
        }
      }, KILL_GRACE_MS);
    }, timeoutMs);
  });
}

/** The synchronous variant, used only for the `aux.completeness` capture at init: it is a short,
 *  stdlib-only checker, so it needs neither a process group nor a timeout. */
function runSync(argv, cwd, outFile, errFile) {
  let fdOut;
  let fdErr;
  try {
    fdOut = openSync(outFile, "w");
    fdErr = openSync(errFile, "w");
  } catch {
    return { exit: 2 };
  }
  try {
    const r = spawnSync(argv[0], argv.slice(1), { cwd, stdio: ["ignore", fdOut, fdErr] });
    if (r.error) return { exit: r.error.code === "ENOENT" ? 127 : r.error.code === "EACCES" ? 126 : 2 };
    if (r.signal) return { exit: signalExit(r.signal) };
    return { exit: r.status === null ? 2 : r.status };
  } finally {
    try {
      closeSync(fdOut);
    } catch {
      /* already closed */
    }
    try {
      closeSync(fdErr);
    } catch {
      /* already closed */
    }
  }
}

/** ------------------------------------------------------------------------------------------------
 *  run --next
 *  ---------------------------------------------------------------------------------------------- */
async function runNext(args) {
  const out = flag(args, "--out");
  if (!out) fail("usage-error", "run requires --out <dir>");
  const timeoutRaw = flag(args, "--timeout-ms");
  if (timeoutRaw === undefined || !/^\d{3,9}$/.test(timeoutRaw)) {
    fail("usage-error", "run requires --timeout-ms <N> (a positive integer; floor code carries no harness-specific default)");
  }
  const timeoutMs = Number(timeoutRaw);

  const statePath = join(resolve(out), "state.json");
  if (!existsSync(statePath)) {
    if (existsSync(join(resolve(out), "stamp.json"))) emit({ ok: true, remaining: 0, finalized: true }, 3);
    fail("stamp-missing", `no in-progress record at ${statePath} — run \`init\` first`);
  }
  const r = readJson(statePath);
  if (!r.ok) fail("stamp-malformed", `in-progress record is not parseable (${statePath}): ${r.reason}`);
  const rec = r.value;
  const cwd = rec.cwd ?? ".";
  // The recorded `cwd` is where the gates RUN; the record itself lives under the invoking directory,
  // exactly where `statePath` above was read from (PATH RESOLUTION, header).
  const outAbs = assertContained(out, process.cwd());

  heldLock = takeLock(outAbs, timeoutMs);
  {
    const next = rec.entries[rec.runs.length];
    if (next === undefined) emit({ ok: true, remaining: 0, finalized: rec.finalized === true }, 3);

    const fpBefore = fingerprint(cwd, { feature: rec.feature });
    if (!fpBefore.ok) fail("usage-error", `cannot fingerprint before ${next.id}: ${fpBefore.reason}`);

    // The log names come from gate-run-core's ONE copy of the rule, which check-loop-fresh.mjs re-hashes.
    const logBase = logBasename(next.seq, next.id);
    const outFile = join(outAbs, `${logBase}.out`);
    const errFile = join(outAbs, `${logBase}.err`);

    let exit;
    let timed_out = false;
    let ran = true;
    let reason = null;

    // A file-addressable gate with NO files is recorded as 0 / ran:false — never SKIPPED silently, and
    // never run with an empty list, which for several runners means "everything" (lessons-learned L16).
    const needsFiles = next.id === "test" && Array.isArray(next.files);
    const glob = (next.files ?? []).find((f) => typeof f === "string" && f.includes("*"));
    if (glob !== undefined)
      fail("bad-scope-json", `gate ${next.id} carries a glob-shaped file entry ${JSON.stringify(glob)}; expand it first`);

    if (needsFiles && next.files.length === 0 && rec.stage === "regress") {
      exit = 0;
      ran = false;
      reason = "no-files";
      writeFileSync(outFile, "");
      writeFileSync(errFile, "");
    } else {
      const res = await spawnGate(next, cwd, outFile, errFile, timeoutMs);
      if (res.spawnError) fail("usage-error", `gate ${next.id} could not be started: ${res.spawnError}`);
      exit = res.exit;
      timed_out = res.timed_out;
    }

    const fpAfter = fingerprint(cwd, { feature: rec.feature });
    if (!fpAfter.ok) fail("usage-error", `cannot fingerprint after ${next.id}: ${fpAfter.reason}`);

    rec.runs.push({
      seq: next.seq,
      id: next.id,
      exit,
      ran,
      timed_out,
      // A gate that mutates the tree ITSELF is RECORDED, never refused — `reconcile` runs last and is
      // what judges that write. Refusing here would turn a legitimate generator into a runner error.
      mutated: fpAfter.digest !== fpBefore.digest,
      reason,
      argv: next.argv,
      shell: next.shell,
      files: next.files ?? [],
      fp_before: fpBefore.digest,
      fp_after: fpAfter.digest,
      stdout_sha256: sha256File(outFile),
      stderr_sha256: sha256File(errFile),
    });

    const remaining = rec.entries.length - rec.runs.length;
    if (remaining === 0) {
      // FINALIZE. The refusal is computed here, before anything is written, so a refused run leaves the
      // in-progress record intact and nothing downstream can read a half-valid stamp.
      for (let i = 1; i < rec.runs.length; i++) {
        if (rec.runs[i].fp_before !== rec.runs[i - 1].fp_after) {
          fail(
            "tree-changed-between-gates",
            `the worktree changed between ${rec.runs[i - 1].id} and ${rec.runs[i].id} — the gates did not judge one tree state`
          );
        }
      }
      const notRun = rec.runs.find((x) => x.ran === false && x.reason !== "no-files");
      if (notRun) fail("entry-not-run", `entry ${notRun.id} never ran`);

      rec.finalized = true;
      rec.fingerprint.final = fpAfter.digest;
      const stamp = { ...rec };
      delete stamp.entries;
      delete stamp.cwd;
      writeAtomic(join(outAbs, "stamp.json"), JSON.stringify(stamp, null, 2));
      // Exactly ONE store of the map at rest (L35): the in-progress record is removed, and no
      // results.json is ever written.
      try {
        unlinkSync(statePath);
      } catch {
        /* nothing to remove */
      }
      emit({ ok: true, ran: next.id, exit, timed_out, remaining: 0, finalized: true, stamp: join(out, "stamp.json") }, 0);
    }

    writeAtomic(statePath, JSON.stringify(rec, null, 2));
    emit({ ok: true, ran: next.id, exit, timed_out, remaining, finalized: false }, 0);
  }
}

async function main(argv) {
  const sub = argv[2];
  const args = argv.slice(3);
  if (sub === "init") return runInit(args);
  if (sub === "run") {
    if (!has(args, "--next")) fail("usage-error", "run requires --next");
    return runNext(args);
  }
  emit(
    {
      ok: false,
      reason_code: "usage-error",
      reason:
        'usage: run-gates.mjs init --stage verify|regress [--side base|head] --feature <name> --out <dir> [--cwd <dir>] [--base <featureBase>] [--discover <package.json>] [--gates "<c>[::<id>],…"] [--extra <json>] [--scope-json <f>] [--skip-style] [--spec-from <dir>] | run --next --out <dir> --timeout-ms <N>',
    },
    2
  );
}

if (import.meta.main) {
  main(process.argv).catch((e) => {
    console.error(`run-gates: ${e && e.stack ? e.stack : e}`);
    process.exit(2);
  });
}

export { assertContained, isStaleLock, signalExit, readScopeJson };
