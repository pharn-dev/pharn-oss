#!/usr/bin/env node
// pharn/floor/run-marker.mjs — the /pharn-ship and /pharn-review RUN-MARKER writer (6.24.0, D3).
//
// WHY THIS EXISTS. Since 6.24.0, `enforce-writes-scope.cjs` relaxes its no-scope default in an
// INSTALLED project (`pharn.config.json` carries a non-empty `skillsVersion`): with no scope set and no
// PHARN run open, it denies PHARN's own installed surface and its own scope file and allows the rest of
// the project, plus — outside the project — only Claude's memory folders and the temp roots (the hook's
// own header states the whole rule). That relaxation must not stand open while a command is actually
// working with no declared scope of its own (`/pharn-ship` between its own scoped writes, `/pharn-review`,
// which sets no scope at all — see its command file). This is the writer of the marker the guard reads to
// tell "a run is working" from "nothing is happening" in that install posture.
//
// It writes and removes EXACTLY ONE schema, `pharn-run-active/1`, at
// `<root>/.pharn/<command>/<name>/active.json`, for `<command>` in the CLOSED set `RUN_MARKER_COMMANDS`
// below. It deliberately REFUSES `pharn-loop`: that marker (`pharn-loop-active/1`, under
// `.pharn/pharn-loop/<name>/active.json`) already has its owner, `require-loop-record.cjs` — the Stop
// guard for unattended runs — and giving it a second writer would put one schema behind two owners
// (PHARN's own build-loop lesson L35). The write guard reads `.pharn/pharn-loop/**` the same way
// it reads this module's own two directories (presence + age only — see below), so the loop's existing
// marker ALSO holds the write guard's fail-closed default in an install, for free, with no third writer.
//
// PRESENCE AND AGE ONLY — THE GUARD NEVER PARSES A MARKER. `enforce-writes-scope.cjs` treats a run as
// open when `<dir>/<name>/active.json` exists (`lstat`, never followed — a torn file, a directory, or a
// dangling link still counts) with a modification time within 24 h of now, in EITHER direction (the same
// symmetric ceiling `require-loop-record.cjs` uses, `AGE_CEILING_MS` there). It never opens or JSON.parses
// the file. So this schema has exactly the reader `require-loop-record.cjs`'s schema already had, and no
// second reader has to agree with a third writer about a shape. `--open` therefore REFRESHES the age by
// overwriting the file (a later open always wins); `--close` deletes it and is idempotent (deleting an
// absent file is not an error — a command's last step must be safe to run twice, or after an early abort
// that never opened one).
//
// `session_id` (from `CLAUDE_CODE_SESSION_ID`, or `null` when unset) is written for the SAME reason
// `require-loop-record.cjs`'s marker carries one — diagnostic only. Nothing reads it: the write guard's
// scan is TREE-WIDE, not per-session (a run open in one session keeps every session and subagent in that
// tree fail-closed — the scope record is already one per tree, lessons-learned L38, and `/pharn-review`'s
// lens subagents must be covered by the same marker their orchestrator opened).
//
// SYMLINK REFUSAL, one path-component lstat each — the SAME rule `require-loop-record.cjs`'s
// `markerMode()` already enforces for its own marker (not re-derived, ported): refuse the write when
// `.pharn`, `.pharn/<command>`, `.pharn/<command>/<name>`, or the marker file itself is ITSELF a symlink,
// so a crafted alias cannot redirect the write outside the state root or age a marker it does not own.
//
// `<name>` is the slug grammar the deny message's RUN block also uses to decide whether a suggested close
// command is safe to print (`^[a-z0-9][a-z0-9-]{0,63}$`) — a name failing it is refused here too, so a
// marker this writer creates always satisfies the grammar the reader trusts.
//
// NO NEW CONTRACT (P7): the guard reads only a path and an age, and this header is the module's spec —
// the `require-loop-record.cjs` precedent, which carries no separate contract either.
//
// Exports (no default anywhere — the CLI and the reconcile probe (`check-bash-reconcile.mjs`) both pass
// `root` explicitly, so no caller can silently drift onto the wrong tree):
//   RUN_MARKER_COMMANDS      — the closed command enum, `["pharn-review", "pharn-ship"]`
//   markerPath(root, command, name)
//   openRun({ root, command, name, sessionId, now })  -> { ok, path?, marker?, reason? }
//   closeRun({ root, command, name })                 -> { ok, reason? }
//
// CLI:
//   node pharn/floor/run-marker.mjs --open <command> <name>
//   node pharn/floor/run-marker.mjs --close <command> <name>
// `<command>` is Bash-run by `/pharn-ship` and `/pharn-review` — an ADVISORY call outside the
// `PreToolUse` gate (lessons-learned L19): a run that skips `--open` is simply unguarded between its own
// scoped steps, and one that skips `--close` leaves the fail-closed default standing for at most 24 h.
// Both commands STOP when `--open` exits non-zero, so the exit code is the contract (GATE-2 review, S1).
// Exit 0 ok (nothing printed to stdout beyond a one-line confirmation) · 2 refusal, no marker written.
//
// EVERY FAILURE IS EXIT 2, NEVER A CRASH (GATE-2 review, S1). A FILE planted where a directory belongs
// (`.pharn`, `.pharn/<command>`, `.pharn/<command>/<name>` — the Write tool can plant one, since `.pharn/**`
// is always writable) made `mkdirSync` throw, and the CLI exited 1 with a raw stack trace while this header
// promised "0 ok · 2 refusal". openRun()/closeRun() now return every filesystem error as
// `{ ok: false, reason }`, naming the operation, the marker's relative path and the error CODE only (never
// the raw message), and main() turns any other throw into exit 2 as well. What a refusal leaves behind: a
// failed `--open` writes no marker, though `mkdirSync` may already have created a directory on the way.

import { lstatSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

export const RUN_MARKER_COMMANDS = ["pharn-review", "pharn-ship"];

const SCHEMA = "pharn-run-active/1";
const MARKER = "active.json";
const NAME_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

function lstatOrNull(p) {
  try {
    return lstatSync(p);
  } catch {
    return null;
  }
}

/** The marker path this writer/reader agree on: <root>/.pharn/<command>/<name>/active.json. */
export function markerPath(root, command, name) {
  return join(root, ".pharn", command, name, MARKER);
}

function markerDir(root, command, name) {
  return join(root, ".pharn", command, name);
}

// Refuse when ANY path component up to and including the marker file is ITSELF a symlink — the
// `require-loop-record.cjs` `markerMode()` rule, ported rather than re-derived (lstat per component,
// never a single resolved realpath, so an alias anywhere in the chain is caught, not only at the leaf).
function symlinkOnPath(root, command, name) {
  const dir = markerDir(root, command, name);
  const candidates = [join(root, ".pharn"), join(root, ".pharn", command), dir, join(dir, MARKER)];
  for (const p of candidates) {
    const st = lstatOrNull(p);
    if (st && st.isSymbolicLink()) return true;
  }
  return false;
}

function validateArgs(root, command) {
  if (typeof root !== "string" || root === "") return "root is required";
  if (command === "pharn-loop") return "pharn-loop has its own marker owner (require-loop-record.cjs) — refusing";
  if (!RUN_MARKER_COMMANDS.includes(command)) {
    return `unknown command: ${JSON.stringify(command)} (must be one of ${RUN_MARKER_COMMANDS.join(", ")})`;
  }
  return null;
}

/**
 * Open (or refresh) a run marker. `now` may be a Date, an epoch-ms number, or omitted (Date.now()).
 * `root` has NO default — every caller must state which tree it means (L41).
 */
export function openRun({ root, command, name, sessionId, now } = {}) {
  const argErr = validateArgs(root, command);
  if (argErr) return { ok: false, reason: argErr };
  if (typeof name !== "string" || !NAME_RE.test(name)) {
    return { ok: false, reason: `invalid name: ${JSON.stringify(name)} (must match ${NAME_RE})` };
  }
  if (symlinkOnPath(root, command, name)) {
    return { ok: false, reason: "refusing a marker path through a symlink" };
  }
  const dir = markerDir(root, command, name);
  const startedAt = now instanceof Date ? now : new Date(now === undefined ? Date.now() : now);
  if (Number.isNaN(startedAt.getTime())) return { ok: false, reason: `invalid now: ${JSON.stringify(now)}` };
  const sid = typeof sessionId === "string" && sessionId !== "" ? sessionId : null;
  const marker = { schema: SCHEMA, command, name, session_id: sid, started_at: startedAt.toISOString() };
  const path = join(dir, MARKER);
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(path, JSON.stringify(marker) + "\n");
  } catch (e) {
    return { ok: false, reason: fsReason("cannot write", command, name, e) };
  }
  return { ok: true, path, marker };
}

/** Close (remove) a run marker. Idempotent: an already-absent marker is `ok: true`, not a refusal. */
export function closeRun({ root, command, name } = {}) {
  const argErr = validateArgs(root, command);
  if (argErr) return { ok: false, reason: argErr };
  if (typeof name !== "string" || !NAME_RE.test(name)) {
    return { ok: false, reason: `invalid name: ${JSON.stringify(name)} (must match ${NAME_RE})` };
  }
  if (symlinkOnPath(root, command, name)) {
    return { ok: false, reason: "refusing a marker path through a symlink" };
  }
  try {
    rmSync(markerPath(root, command, name), { force: true });
  } catch (e) {
    return { ok: false, reason: fsReason("cannot remove", command, name, e) };
  }
  return { ok: true };
}

// A filesystem refusal, rendered from values this module already validated (the command is a member of the
// closed enum, the name matched NAME_RE) plus the error CODE — a short token — never the raw message.
function fsReason(what, command, name, e) {
  const code = e && typeof e.code === "string" && /^[A-Z0-9_]{1,40}$/.test(e.code) ? e.code : "error";
  return `${what} .pharn/${command}/${name}/${MARKER} (${code}) — check what is on that path under .pharn/ (a file where a directory belongs, or a permission) and fix it by hand; no marker was written or removed`;
}

function main(argv) {
  const args = argv.slice(2);
  const mode = args[0];
  const command = args[1];
  const name = args[2];
  if ((mode !== "--open" && mode !== "--close") || args.length !== 3) {
    process.stderr.write("run-marker: usage: --open <command> <name> | --close <command> <name>\n");
    process.exit(2);
  }
  let result;
  try {
    const root = process.cwd();
    result =
      mode === "--open"
        ? openRun({ root, command, name, sessionId: process.env.CLAUDE_CODE_SESSION_ID, now: Date.now() })
        : closeRun({ root, command, name });
  } catch (e) {
    const code = e && typeof e.code === "string" && /^[A-Z0-9_]{1,40}$/.test(e.code) ? e.code : "error";
    result = { ok: false, reason: `unexpected failure (${code}); no marker was written or removed` };
  }
  if (!result.ok) {
    process.stderr.write(`run-marker: ${result.reason}\n`);
    process.exit(2);
  }
  process.stdout.write(mode === "--open" ? `run-marker opened: ${command}/${name}\n` : `run-marker closed: ${command}/${name}\n`);
  process.exit(0);
}

if (import.meta.main) main(process.argv);
