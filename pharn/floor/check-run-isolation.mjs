#!/usr/bin/env node
// pharn/floor/check-run-isolation.mjs — the EXECUTION half and CLI of /pharn-loop's ENTRY ISOLATION CHECK
// (loop-isolation-stop, 7.1.0). The rule — the frozen lists, the outcome, the exit, every bound — is
// `check-run-isolation-core.mjs`'s header; this file reads the machine and prints (P3: it changes when a probe or the
// CLI changes).
//
// ================================ THE CLI — one line, run at /pharn-loop's entry ================================
//   node pharn/floor/check-run-isolation.mjs --feature <name> [--accept-host-execution]
// `/pharn-loop` Step 1a runs it right after `require-loop-record.cjs --open` and before `pre-run-snapshot.mjs --capture`,
// with stdout redirected to `pharn/.run/pharn-loop/<name>/isolation.json` (the witness), and stops (S15,
// `blocked: not-isolated`) on any non-zero exit. `/pharn-ship` does not run it: a person approves its SPEC and decides
// at its end. `--feature` validates the run's slug (gate-run-core FEATURE_SLUG_RE), so a malformed slug fails this line
// at entry the way it fails every other pinned Step 1a line; the record does not carry it, since the witness path
// already names the run.
// Exit: 0 — ISOLATED, or HOST / ISOLATED_WITH_CREDENTIALS with the flag: the record on stdout, one JSON line, nothing on
//          stderr.
//       2 — refused: one stderr line `check-run-isolation: refused <reason> — <fixed text>` (the core's closed REASONS).
//          For `not-isolated` and `credentials-present` the record is on stdout too, so the witness shows the evidence;
//          for `unreadable-home`, `probe-failed`, `usage` and `crashed` stdout is empty — the evidence is unknown.
// A module that fails to load is node's own exit 1; every caller stops on any non-zero exit.
//
// ================================ THE PROBES — existence, names and one key; never a value ================================
// Every path is classified with `lstat` FIRST (L54, L59): a link is never followed, ENOENT/ENOTDIR is the only
// absence, and a credential path holding anything other than the expected kind counts as a hit (fail-closed). Only a
// regular file is ever opened, with O_RDONLY|O_NOFOLLOW|O_NONBLOCK and a READ_CAP, so a FIFO cannot hang the entry.
//   isolation, under the fs root ("/" in production — no env var or flag can move it):
//     /.dockerenv and /run/.containerenv — `lstat` succeeds (any kind); /proc/1/cgroup — a regular file whose first
//     READ_CAP bytes match the core's CGROUP_RE (anything else reads as no evidence).
//   HOME — HOME, else USERPROFILE; it must be absolute and a readable directory (`stat` + `readdir`: HOME itself may be
//     a link to a directory), else `unreadable-home`.
//   credentials, under HOME: `.ssh` (a link, a non-empty directory, an unreadable one, or any other kind); the
//     `lstat`-present files `.config/gh/hosts.yml`, `.git-credentials`, `.netrc`, `.aws/credentials`; `.npmrc` holding
//     the literal `_authToken` (also `<project root>/.npmrc`); SSH_AUTH_SOCK naming a path that is there; and
//     `git config --get-regexp ^credential\..*helper$` (every scope git reads, with HOME as probed) printing a
//     non-empty value — exit 1 is "none", any other exit, a spawn error or the GIT_TIMEOUT_MS bound is `probe-failed`.
//   The env codes are the core's ISOLATION_ENV / CREDENTIAL_ENV, read from process.env.
// A file's CONTENT is searched for one literal and dropped; nothing is echoed, logged or stored.
//
// ================================ BOUNDS (P0), each also in the contract and pharn/LIMITS.md §6 ================================
// • Every input is environment-supplied, and a project's committed `.claude/settings.json` `env` block can set the env
//   ones (HOME included). The check binds the honest operator; it is not a control against a hostile one.
// • A broken git shim that exits 1 reads "no helper"; such a run already stopped at Step 1a's S3 (`git rev-parse HEAD`).
// • The witness is written by the caller's shell redirect, which follows a link planted at that path; every reader of
//   the witness (check-loop-record.mjs, loop-closeout.mjs, render-run-report.mjs) opens it with O_NOFOLLOW and fails
//   closed on such a link. The witness is git-ignored `pharn/.run/` state the Write tool and Bash both reach and reconcile
//   never sees, so every line built from it is faithful only while nobody rewrites it.
//
// TRUST (P2): env values and file contents are reduced to booleans here; only the core's frozen codes and fixed text
// reach stdout or stderr. LOAD GRAPH: runtime-floor.mjs, gate-run-core.mjs (FEATURE_SLUG_RE) and the core — nothing else
// from the floor.

import "./runtime-floor.mjs";
import { lstatSync, statSync, readdirSync, openSync, readSync, fstatSync, closeSync, constants } from "node:fs";
import { spawnSync } from "node:child_process";
import { isAbsolute, join } from "node:path";
import { FEATURE_SLUG_RE } from "./gate-run-core.mjs";
import { CREDENTIAL_ENV, ISOLATION_ENV, PROBE_ENV, evaluate, refusalLine, renderIsolationLine } from "./check-run-isolation-core.mjs";

/** The most bytes read from any one file. */
export const READ_CAP = 64 * 1024;
/** The bound on the one git spawn. */
export const GIT_TIMEOUT_MS = 10_000;

const ABSENT = new Set(["ENOENT", "ENOTDIR"]);

/** `lstat`: `{kind: "absent" | "error" | "file" | "dir" | "link" | "other"}`. Never follows a link. */
function kindOf(path) {
  let st;
  try {
    st = lstatSync(path);
  } catch (e) {
    return { kind: e && ABSENT.has(e.code) ? "absent" : "error" };
  }
  if (st.isSymbolicLink()) return { kind: "link" };
  if (st.isFile()) return { kind: "file" };
  if (st.isDirectory()) return { kind: "dir" };
  return { kind: "other" };
}

/** The first READ_CAP bytes of a regular file as text, or null (not regular, unreadable, a link at open time). */
function readCapped(path) {
  let fd;
  try {
    fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  } catch {
    return null;
  }
  try {
    if (!fstatSync(fd).isFile()) return null;
    const buf = Buffer.alloc(READ_CAP);
    let n = 0;
    for (;;) {
      const got = readSync(fd, buf, n, READ_CAP - n, null);
      if (got === 0 || n + got >= READ_CAP) {
        n += got;
        break;
      }
      n += got;
    }
    return buf.subarray(0, n).toString("utf8");
  } catch {
    return null;
  } finally {
    closeSync(fd);
  }
}

/** A credential path is present: anything but an `lstat` absence (an error is fail-closed). */
function present(path) {
  return kindOf(path).kind !== "absent";
}

/** An isolation marker is there: `lstat` succeeds (any kind). An error is NO evidence — the fail-closed direction here. */
function marker(path) {
  const { kind } = kindOf(path);
  return kind !== "absent" && kind !== "error";
}

/** `.ssh`: a link (never followed), a non-empty or unreadable directory, or any other kind is a hit. */
function sshDirHit(path) {
  const { kind } = kindOf(path);
  if (kind === "absent") return false;
  if (kind !== "dir") return true;
  try {
    return readdirSync(path).length > 0;
  } catch {
    return true;
  }
}

/** `.npmrc`: absent → no hit; a regular file → whether it holds `_authToken`; anything else → hit (fail-closed). */
function npmrcHit(path) {
  const { kind } = kindOf(path);
  if (kind === "absent") return false;
  if (kind !== "file") return true;
  const text = readCapped(path);
  return text === null ? true : text.includes("_authToken");
}

/** The home directory, or null: HOME, else USERPROFILE, absolute and a readable directory. */
function homeOf(env) {
  const h = typeof env.HOME === "string" && env.HOME !== "" ? env.HOME : env.USERPROFILE;
  if (typeof h !== "string" || h === "" || !isAbsolute(h)) return null;
  try {
    if (!statSync(h).isDirectory()) return null;
    readdirSync(h);
  } catch {
    return null;
  }
  return h;
}

/** Is a credential helper configured? true / false, or null when git could not answer. */
export function credentialHelper(env, home, cwd) {
  const r = spawnSync("git", ["config", "--get-regexp", "^credential\\..*helper$"], {
    cwd,
    env: { ...env, HOME: home },
    encoding: "utf8",
    timeout: GIT_TIMEOUT_MS,
    maxBuffer: 1 << 20,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (r.error || r.signal) return null;
  if (r.status === 1) return false;
  if (r.status !== 0) return null;
  return String(r.stdout)
    .split("\n")
    .some((line) => {
      const sp = line.indexOf(" ");
      return sp > 0 && line.slice(sp + 1).trim() !== "";
    });
}

/** Only the env names the core reads, copied as strings. */
function pickEnv(env) {
  const out = {};
  for (const name of [...ISOLATION_ENV.map((e) => e.name), ...CREDENTIAL_ENV, ...PROBE_ENV]) {
    if (typeof env[name] === "string") out[name] = env[name];
  }
  return out;
}

/** The probe the core decides over. `fsRoot` is "/" in production; tests pass a temp directory. */
export function buildProbe({ fsRoot = "/", env = process.env, cwd = process.cwd(), git = credentialHelper } = {}) {
  const picked = pickEnv(env);
  const home = homeOf(picked);
  const cgroup = kindOf(join(fsRoot, "proc", "1", "cgroup")).kind === "file" ? readCapped(join(fsRoot, "proc", "1", "cgroup")) : null;
  const sock = picked.SSH_AUTH_SOCK;
  const at = (rel) => join(home, rel);
  return {
    env: picked,
    fs: {
      dockerenv: marker(join(fsRoot, ".dockerenv")),
      containerenv: marker(join(fsRoot, "run", ".containerenv")),
      proc1Cgroup: cgroup,
    },
    home:
      home === null
        ? { ok: false }
        : {
            ok: true,
            sshDir: sshDirHit(at(".ssh")),
            ghHosts: present(at(join(".config", "gh", "hosts.yml"))),
            gitCredentials: present(at(".git-credentials")),
            netrc: present(at(".netrc")),
            awsCredentials: present(at(join(".aws", "credentials"))),
            npmrc: npmrcHit(at(".npmrc")),
          },
    repo: { npmrc: npmrcHit(join(cwd, ".npmrc")) },
    sshAgent: typeof sock === "string" && sock !== "" && present(sock),
    // git runs with the WHOLE environment — the one the loop's own git calls will see (PATH, GIT_CONFIG_*, XDG_*) — and
    // only HOME pinned to the probed home; the picked copy above is for the core, which reads names, never PATH.
    credentialHelper: home === null ? null : git(env, home, cwd),
  };
}

/** `{feature, accept}` or null (usage). `--feature <name>` once, `--accept-host-execution` at most once, nothing else. */
export function parseArgs(argv) {
  let feature = null;
  let accept = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--feature" && feature === null && i + 1 < argv.length) feature = argv[++i];
    else if (a === "--accept-host-execution" && !accept) accept = true;
    else return null;
  }
  if (typeof feature !== "string" || !FEATURE_SLUG_RE.test(feature)) return null;
  return { feature, accept };
}

/** The whole CLI as a function: `{ code, stdout, stderr }`. `deps.buildProbe` is injectable for the crash test. */
export function run(argv, deps = {}) {
  try {
    const args = parseArgs(argv);
    if (args === null) return { code: 2, stdout: "", stderr: `${refusalLine("usage")}\n` };
    const probe = (deps.buildProbe ?? buildProbe)();
    const r = evaluate(probe, args.accept);
    const stdout = r.record === null ? "" : `${renderIsolationLine(r.record)}\n`;
    if (r.exit === 0) return { code: 0, stdout, stderr: "" };
    return { code: 2, stdout, stderr: `${refusalLine(r.reason)}\n` };
  } catch {
    return { code: 2, stdout: "", stderr: `${refusalLine("crashed")}\n` };
  }
}

if (import.meta.main) {
  const r = run(process.argv.slice(2));
  process.stdout.write(r.stdout);
  process.stderr.write(r.stderr);
  process.exitCode = r.code;
}
