#!/usr/bin/env node
// .claude/hooks/require-loop-record.cjs — the /pharn-loop STOP GUARD: while an unattended /pharn-loop run is
// open in THIS session, ending the turn requires a record (pharn/features/<name>/LOOP.md).
//
// ============================== WHY THIS EXISTS (P7 — a recorded failure) ==============================
//
// The original incident (CHANGELOG.md §6.3.0) was an unattended run that finished early and wrote a summary
// naming the gates it had skipped. #230 made the gate map tested code; #242 (check-loop-fresh.mjs) made a
// stale or skipped stage re-run instead of being reported. What stayed true after both: nothing stops the
// model from ENDING THE TURN anyway — the re-run instruction is command prose. This is the one missing
// refusal: a turn end during an open unattended run requires a record. A run that genuinely cannot
// continue satisfies it by writing a BLOCKED record — the honest ending the loop already knows how to
// produce, and what stuck point S11 (`blocked: stale-evidence`) exists for.
//
// ====================================== WHAT THIS GUARD CANNOT DO ======================================
// (repeated verbatim from the plan, the PR and CLAUDE.md, never paraphrased into something stronger)
//   • It cannot make a model do work. It refuses the turn end; the model decides what to do with the refusal.
//   • It cannot judge a record. Blocking on record quality would contradict the loop's own rules: a second
//     check-loop-record.mjs repair would pass the ≤1 bound, and check-loop-decision.mjs says "do not retry it".
//   • It cannot tell a real record from a fabricated one. `touch LOOP.md` satisfies it; the record's quality
//     is gated at /pharn-loop Step 6b and at the 6c commit gate, not here (LIMITS.md §6, §1d).
//   • It only runs when Claude Code starts it (LIMITS.md §7). A hook that cannot start is a non-blocking
//     notice — the hook-cwd-anchoring incident class, which hook-wiring.test.cjs exists to pin.
//   • It reaches existing installs only by hand: `pharn update` never edits settings.json, and pharn-cli
//     writes that file only when absent, while it does copy the .cjs hooks.
//
// ======================================== WHEN IT BLOCKS ========================================
//
// BLOCK iff all of these hold for some run `<name>`:
//   • `<root>/.pharn/pharn-loop/<name>/active.json` is a regular file (lstat — never through a symlink) with
//     schema `pharn-loop-active/1`, a `name` equal to its directory, and a `session_id` EQUAL to the Stop
//     payload's `session_id`;
//   • its `started_at` is within the AGE CEILING (24 h) of now;
//   • `<root>/pharn/features/<name>/` EXISTS — a stop before that directory exists (S1, a failed S3, S6 before
//     a Draft) writes no record BY THE COMMAND'S OWN RULE, so a guard that demanded one would push the model
//     to break it (GRILL finding 1);
//   • `<root>/pharn/features/<name>/LOOP.md` is absent, or empty / whitespace-only.
// It NEVER blocks on record QUALITY (a LOOP.md check-loop-record.mjs would RED still ends the turn) and NEVER
// on freshness (a non-green stop reverts SPEC.md at Step 6a, which moves the fingerprint legitimately).
//
// INERT when: no marker; the marker's session differs (or is null — CLAUDE_CODE_SESSION_ID was unset when it
// was opened); `permission_mode` is "plan"; the marker is older than the ceiling; no feature directory yet.
//
// ====================================== THE TWO CAPS ======================================
//   • OURS: K blocks per (session, run), a TOTAL — not a consecutive count, and not per attempt. Default 3;
//     PHARN_STOP_GUARD_MAX (an integer 1..7) overrides it. After K, the stop is ALLOWED with a
//     `systemMessage`, so the person sees that the run ended WITHOUT a record — not only the transcript.
//   • THE PLATFORM'S: "Claude Code overrides the hook and ends the turn after 8 consecutive blocks" (hooks
//     reference, Stop input). K is capped at 7 so ours always fires first and says why.
// `stop_hook_active` is NOT a breaker here: open issues report it arriving false on re-entry, and "exit 0 when
// it is true" would make the guard bypassable on the second attempt. It is read by nothing below.
//
// ====================================== FAIL OPEN — and why ======================================
// The OPPOSITE of the write guards, deliberately. A write guard that fails open lets one write through; a
// stop guard that fails closed traps a person in a turn they cannot end. So every error, unreadable file,
// malformed JSON or unwritable counter ALLOWS the stop. The channel enforces it: the guard blocks ONLY by
// printing a complete `{"decision":"block","reason":…}` document and exiting 0. A crash, a partial write or
// any non-zero exit is non-blocking by the platform's own rules — so fail-open is a property of the
// channel, not just of the try/catch.
//
// The block renders as a "Stop hook error" in the UI (anthropics/claude-code#34600) — cosmetic, and the
// reason for the documented `hookSpecificOutput.additionalContext` alternative, which a later increment may
// switch to (one line).
//
// ====================================== EXITS FOR A PERSON ======================================
// Delete the marker (`node .claude/hooks/require-loop-record.cjs --close <name>`), interrupt the turn, or
// unwire the hook. A MODEL can reach the first and the third through Bash too — the LIMITS.md §6 residual,
// stated, not hidden.
//
// ====================================== THE MARKER — ONE OWNER (L35) ======================================
//   node .claude/hooks/require-loop-record.cjs --open <name> --cap <M>   writes the marker (/pharn-loop Step 1a)
//   node .claude/hooks/require-loop-record.cjs --close <name>           removes it (the /pharn-loop Final step)
// The writer and the reader of `pharn-loop-active/1` are this one file, so the schema cannot drift between a
// command's pinned `node -e` and a hook. The writer refuses any name that is not one plain path segment.
// These modes are Bash calls — outside the PreToolUse gate (L19), ADVISORY: a run that skips `--open` is
// simply unguarded, and one that skips `--close` leaves a marker the 24 h ceiling and a present LOOP.md both
// make inert.
//
// TRUST (P2): the payload's `session_id` (string equality), `permission_mode` (membership) are the only
// fields read. `last_assistant_message` and `transcript_path` are NEVER read or quoted. The block `reason`
// re-enters Claude's context as an instruction, so it is one line from a closed set whose only variable is a
// JSON-quoted relative path built from a validated readdir entry.
//
// COST: on the inert path, one readdir of `.pharn/pharn-loop/` (usually absent) — measured in VERIFY.md.
// No child process on any path. No network.
//
// NOT PROTECTED by protect-trusted-paths.cjs (adding it would edit a hook-protected file): a Write-tool edit
// could disarm it. Proportionate for a fail-open, advisory guard that a Bash `--close` can already disarm; a
// Bash edit to it is still caught by `reconcile` (.claude/hooks/* is always-reconciled). Named follow-up.

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const SCHEMA = "pharn-loop-active/1";
const STATE_SUBDIR = path.join(".pharn", "pharn-loop");
const MARKER = "active.json";
const COUNTER = "stop-blocks.json";
const FEATURE_BASE = path.join("pharn", "features");
const RECORD = "LOOP.md";
const DEFAULT_MAX = 3;
const MAX_CEILING = 7; // strictly under the platform's documented 8-consecutive-block override
const AGE_CEILING_MS = 24 * 60 * 60 * 1000;

// Claude's current directory as this hook process sees it, with symlinks resolved (the same construction as
// the two write guards). process.cwd() throws when the directory was deleted; the filesystem root is the
// fallback, where no marker lives, so the guard is INERT there.
const CWD = (() => {
  try {
    return fs.realpathSync(process.cwd());
  } catch {
    try {
      return process.cwd();
    } catch {
      return path.parse(__dirname).root;
    }
  }
})();

// workTreeRoot() is a DELIBERATE THIRD COPY of the function of the same name in protect-trusted-paths.cjs and
// enforce-writes-scope.cjs — a shared module would be a new control-surface file. A ✧ test in
// enforce-writes-scope.test.cjs pins all three byte-equal (L31).
function workTreeRoot(dir) {
  let stop = null;
  try {
    const env = process.env.CLAUDE_PROJECT_DIR;
    if (typeof env === "string" && env !== "") stop = fs.realpathSync(env);
  } catch {
    /* an unresolvable project dir is simply not a stop */
  }
  let cur = dir;
  for (;;) {
    let hasGit = false;
    try {
      fs.lstatSync(path.join(cur, ".git"));
      hasGit = true;
    } catch {
      /* no .git entry here */
    }
    if (hasGit || (stop !== null && cur === stop)) return cur;
    const parent = path.dirname(cur);
    if (parent === cur) return null;
    cur = parent;
  }
}

function rootDir() {
  return workTreeRoot(CWD) ?? CWD;
}

function lstatOrNull(p) {
  try {
    return fs.lstatSync(p);
  } catch {
    return null;
  }
}

/** A plain regular file (never a symlink), read whole; null otherwise. */
function readRegular(p) {
  const st = lstatOrNull(p);
  if (!st || !st.isFile()) return null;
  return fs.readFileSync(p, "utf8");
}

/** Is `name` one plain path segment? Not a grammar — a containment property: no separator, no NUL, not a
 *  dot entry, and it resolves to a direct child of the state directory. */
function isPlainSegment(name, stateDir) {
  if (typeof name !== "string" || name === "" || name === "." || name === "..") return false;
  if (name.includes("/") || name.includes("\\") || name.includes("\0")) return false;
  return path.dirname(path.resolve(stateDir, name)) === path.resolve(stateDir);
}

function maxBlocks(env = process.env) {
  const raw = env.PHARN_STOP_GUARD_MAX;
  if (raw === undefined || !/^[0-9]$/.test(raw)) return DEFAULT_MAX;
  const n = Number(raw);
  return n >= 1 && n <= MAX_CEILING ? n : DEFAULT_MAX;
}

/** The two messages the guard can emit — the CLOSED set (L36). The only variable is a JSON-quoted path. */
function blockReason(recordRel, n, k) {
  return `PHARN Stop guard: the unattended /pharn-loop run open in this session has no record yet — write ${JSON.stringify(recordRel)} (a blocked stop is a valid record) before ending the turn. Refusal ${n} of ${k}.`;
}
function exhaustedMessage(recordRel, k) {
  return `PHARN Stop guard: allowed this turn to end after ${k} refusals — the /pharn-loop run ended WITHOUT a record at ${JSON.stringify(recordRel)}.`;
}

/** The open run in this session that still owes a record, or null. Every anomaly makes a candidate INERT. */
function owingRun(root, sessionId, now) {
  const stateDir = path.join(root, STATE_SUBDIR);
  const st = lstatOrNull(stateDir);
  if (!st || !st.isDirectory()) return null;
  for (const name of fs.readdirSync(stateDir).sort()) {
    if (!isPlainSegment(name, stateDir)) continue;
    const dir = path.join(stateDir, name);
    const dst = lstatOrNull(dir);
    if (!dst || !dst.isDirectory()) continue; // a symlinked entry is not followed
    let marker;
    try {
      const text = readRegular(path.join(dir, MARKER));
      if (text === null) continue;
      marker = JSON.parse(text);
    } catch {
      continue;
    }
    if (marker === null || typeof marker !== "object" || marker.schema !== SCHEMA || marker.name !== name) continue;
    if (typeof marker.session_id !== "string" || marker.session_id !== sessionId) continue;
    const started = Date.parse(marker.started_at);
    if (!Number.isFinite(started) || now - started > AGE_CEILING_MS || started - now > AGE_CEILING_MS) continue;
    const featureDir = path.join(root, FEATURE_BASE, name);
    const fst = lstatOrNull(featureDir);
    if (!fst || !fst.isDirectory()) continue; // no feature directory: the command writes no record here
    const record = path.join(featureDir, RECORD);
    const rst = lstatOrNull(record);
    if (rst && rst.isFile()) {
      const body = fs.readFileSync(record, "utf8");
      if (body.trim() !== "") continue; // a record exists — quality is Step 6b's job, never this guard's
    } else if (rst) {
      continue; // something that is not a regular file sits there: not ours to judge, stay inert
    }
    return { name, dir, recordRel: path.join(FEATURE_BASE, name, RECORD).split(path.sep).join("/") };
  }
  return null;
}

/** Read, bump and persist the per-session count. Throws on any failure — the caller fails OPEN. */
function bumpCounter(dir, sessionId) {
  const file = path.join(dir, COUNTER);
  const st = lstatOrNull(file);
  let counts = {};
  if (st) {
    if (!st.isFile()) throw new Error("counter is not a regular file");
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    if (parsed === null || typeof parsed !== "object" || parsed.schema !== "pharn-loop-stop-blocks/1") throw new Error("bad counter");
    counts = parsed.counts && typeof parsed.counts === "object" ? parsed.counts : {};
  }
  const prior = Number.isInteger(counts[sessionId]) && counts[sessionId] >= 0 ? counts[sessionId] : 0;
  return {
    prior,
    persist(next) {
      const out = { schema: "pharn-loop-stop-blocks/1", counts: { ...counts, [sessionId]: next } };
      const tmp = `${file}.tmp-${process.pid}`;
      fs.writeFileSync(tmp, JSON.stringify(out));
      fs.renameSync(tmp, file);
    },
  };
}

/** The Stop guard. Returns the stdout document (or "" for silent allow). Never throws, never exits non-zero.
 *  `root` / `env` / `now` are injectable so the suite can exercise it in-process (coverage cannot see a
 *  subprocess); the CLI passes none of them. */
function stopGuard(stdinText, { now = Date.now(), root = null, env = process.env } = {}) {
  try {
    const payload = JSON.parse(stdinText);
    if (payload === null || typeof payload !== "object") return "";
    if (payload.permission_mode === "plan") return "";
    const sessionId = payload.session_id;
    if (typeof sessionId !== "string" || sessionId === "") return "";
    const run = owingRun(root ?? rootDir(), sessionId, now);
    if (run === null) return "";
    const k = maxBlocks(env);
    const counter = bumpCounter(run.dir, sessionId);
    if (counter.prior >= k) return JSON.stringify({ systemMessage: exhaustedMessage(run.recordRel, k) });
    counter.persist(counter.prior + 1);
    return JSON.stringify({ decision: "block", reason: blockReason(run.recordRel, counter.prior + 1, k) });
  } catch {
    return ""; // FAIL OPEN — see the header
  }
}

/** --open / --close. These are Bash-run by /pharn-loop and fail CLOSED (exit 2) on a bad name: a writer is not
 *  the guard, and refusing is the safe direction for a write. */
function markerMode(argv, { root = rootDir(), env = process.env, stderr = process.stderr } = {}) {
  const mode = argv[0];
  const name = argv[1];
  const stateDir = path.join(root, STATE_SUBDIR);
  if (!isPlainSegment(name, stateDir)) {
    stderr.write(`require-loop-record: ${mode} needs one plain run name\n`);
    return 2;
  }
  const dir = path.join(stateDir, name);
  const file = path.join(dir, MARKER);
  for (const p of [path.join(root, ".pharn"), stateDir, dir, file]) {
    const st = lstatOrNull(p);
    if (st && st.isSymbolicLink()) {
      stderr.write("require-loop-record: refusing a marker path through a symlink\n");
      return 2;
    }
  }
  if (mode === "--close") {
    fs.rmSync(file, { force: true });
    return 0;
  }
  if (argv[2] !== "--cap" || !/^[1-9][0-9]{0,2}$/.test(argv[3] ?? "") || argv.length !== 4) {
    stderr.write("require-loop-record: usage: --open <name> --cap <M>\n");
    return 2;
  }
  const sid = env.CLAUDE_CODE_SESSION_ID;
  const marker = {
    schema: SCHEMA,
    name,
    session_id: typeof sid === "string" && sid !== "" ? sid : null,
    started_at: new Date().toISOString(),
    cap: Number(argv[3]),
  };
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(marker)}\n`);
  return 0;
}

function main() {
  const argv = process.argv.slice(2);
  if (argv[0] === "--open" || argv[0] === "--close") {
    if (argv[0] === "--close" && argv.length !== 2) {
      process.stderr.write("require-loop-record: usage: --close <name>\n");
      process.exit(2);
    }
    process.exit(markerMode(argv));
  }
  let input = "";
  try {
    input = fs.readFileSync(0, "utf8");
  } catch {
    process.exit(0);
  }
  const out = stopGuard(input);
  if (out) process.stdout.write(`${out}\n`);
  process.exit(0);
}

if (require.main === module) main();

module.exports = {
  stopGuard,
  markerMode,
  workTreeRoot,
  isPlainSegment,
  maxBlocks,
  blockReason,
  exhaustedMessage,
  SCHEMA,
  DEFAULT_MAX,
  MAX_CEILING,
  AGE_CEILING_MS,
};
