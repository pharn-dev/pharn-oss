#!/usr/bin/env node
// pharn/floor/stage-agent.mjs — the CLI half of stage-model routing (added 6.27.0, stage-model-routing):
// `route` decides whether a pipeline stage runs as a Claude Code subagent, REQUESTED on its configured model,
// `brief` prints that subagent's rules, `report` records its closed result, and `read` consumes it.
// The protocol — the policy table, the fallback reasons and their remedies, the brief's rules, the result
// schema, and the floor/advisory split — is `pharn/floor/stage-agent-core.mjs`'s header (NO NEW CONTRACT,
// P7: the header is the spec, the `run-marker.mjs` precedent). This file is execution only: the config
// probe, the checker spawn, and the result file's containment walk, atomic write and removal (P3).
//
// ── Usage ─────────────────────────────────────────────────────────────────────────────────────────────
//   node pharn/floor/stage-agent.mjs route  --command <pharn-ship|pharn-loop> --stage <stage> --name '<name>'
//                                          [--iteration <N>] [--mode quick] [--config <path>]
//   node pharn/floor/stage-agent.mjs brief  --command <c> --stage <stage> --name '<name>' [--iteration <N>] [--mode quick]
//   node pharn/floor/stage-agent.mjs report --command <c> --name '<name>' --stage <stage> [--iteration <N>]
//                                          --status <done|refused|question> [--row <S4..S10>] [--gate <pass|fail>]
//   node pharn/floor/stage-agent.mjs read   --command <c> --name '<name>' --stage <stage> [--iteration <N>]
// `--iteration` is required exactly for an iterated stage (build, regress, verify). `--mode` is spelled only
// for a column the command's policy holds besides `full` (today: `quick`, for both commands — /pharn-loop's
// since 6.28.0; the accepted set is read from ROUTE_POLICY, never listed here). Every flag
// appears at most once; an unknown flag, a missing value, or a value outside its closed set is refused.
//
// ── Exit codes ────────────────────────────────────────────────────────────────────────────────────────
//   route   0 `agent:<alias>` · 3 `inline:<reason>` (its remedy on stderr) · 2 refused (usage, a skipped
//           stage, or a result path that cannot be cleared) — stdout is exactly ONE line on 0 and 3.
//   brief   0 the brief on stdout · 2 refused (usage, or a cell that is not routed).
//   report  0 the result was written · 2 refused, nothing written.
//   read    0 done · 3 refused · 4 question · 2 unusable (`no-result`, `malformed`, `mismatch`, `unreadable`,
//           `usage`) — one closed line on stdout; the stage-exit numbers (`stage-exit.md`). Anything else,
//           1 included, is a crash, and a caller must read a crash as no verdict.
// Every path ends by setting `process.exitCode`, never `process.exit()` (the 6.20.4 flush rule).
//
// ── THE CONFIG PROBE (`route`, for a routed cell only — a policy-inline cell never consults it) ────────
// 1. `<config>` (default `pharn.config.json` in the invoking directory, `DEFAULT_CONFIG` below — the one
//    literal, L41) is statted with a FOLLOWED stat: ENOENT is `no-config`. This deliberately FOLLOWS a link,
//    because `check-model-config.mjs` reads through one, so a DANGLING config link reads `no-config` for
//    both (L59, pinned by a test). Any other stat error is left to the checker to judge.
// 2. `check-model-config.mjs resolve <key> --config <abs>` — shelled by ABSOLUTE path (resolved from this
//    file's own directory), with an argv array, never a shell string, under `CHECKER_TIMEOUT_MS`. Both
//    spawns are read through `shelledVerdict` (`pharn/floor/shelled-verdict-core.mjs`, applied in
//    `decideRoute`): exit 0 with a `{model, effort}` object decides; a RED — exit 1 WITH its `RED — ` line —
//    goes to step 3; anything else is `resolve-failed`, including exit 1 without that line, which is node's
//    own code for an uncaught throw or a module that cannot load (a crashed or missing checker — GATE-2
//    review A4). `<key>` comes from `STAGE_CONFIG_KEYS`, never from argv, because the checker resolves an
//    unknown stage label to `default` silently.
// 3. `check-model-config.mjs validate --config <abs>`: a RED is `config-red`, exit 0 is `no-stages`, anything
//    else is `resolve-failed`. So a routed stage costs one spawn, and a failure costs two.
// The rules live in the checker, shelled rather than re-implemented (L35); its NOTE (P0) stdout line stays
// true: a resolved alias is what the config DECLARES, never what the stage ran on.
//
// ── CHECKER_TIMEOUT_MS, measured (L24) ────────────────────────────────────────────────────────────────
// `resolve plan` spawned 30 times on the build machine (darwin, Node 24.13.1, other agents running):
// median 89.9 ms, p90 205.8 ms, max 329.9 ms (.dev/features/stage-model-routing/BUILD.md). The bound is
// 10 000 ms — about 30 times the slowest spawn measured, headroom for a cold, loaded CI machine. Past it,
// the child is killed (SIGKILL) and the stage runs inline as `resolve-failed`, never a hang.
//
// ── THE RESULT FILE — `.pharn/<command>/<name>/stage-result.json` (`RESULT_FILE`) ──────────────────────
// A BASH WRITE, OUTSIDE fix #7, declared (L19): `report` writes it and `route`/`read` remove it through
// `fs`, reached through Bash, which `PreToolUse` never sees. All three stay inside the state root:
//   * CONTAINMENT (L54, L59): `.pharn`, `.pharn/<command>` and `.pharn/<command>/<name>` are each tested
//     with `lstat`, one component at a time. A symbolic link — dangling, looping, or to a directory — and
//     anything that is not a directory is REFUSED, never followed and never read as absent; only an lstat
//     ENOENT is absence. The result path itself must be absent or a regular file.
//   * `report` creates only the missing components (non-recursively, one at a time), writes a temp file
//     with an exclusive create, and renames it over the result — atomic on one filesystem.
//   * `read` opens the result with O_NOFOLLOW and reads at most 64 KiB, validates it CLOSED both ways
//     against the expected command/name/stage/iteration (`validateResult`), REMOVES it, then prints. A
//     result it cannot remove is `unusable unreadable`: a result that could answer twice is not consumed.
//     Its stderr names a refused result by ONE fixed code (`READ_DEFECTS`) and nothing else — never a key,
//     a value or a byte the file carries, because a stage agent wrote it (GATE-2 review A7).
//   * `route` removes a leftover result before an Agent spawn (exit 0 only), so a stale file cannot answer
//     for a new agent; a leftover it cannot clear makes it refuse (exit 2), and the orchestrator then runs
//     the stage inline (`route-unavailable`).
// BOUNDS, stated: the walk and the write are not atomic with each other (a component swapped in between is
// a TOCTOU window this file does not close); `.pharn/` is unauthenticated state a Bash write reaches
// (LIMITS.md §6), so a hand-written result is read like an honest one — the shape is floor, the content is
// the stage agent's claim (advisory). No reconcile exemption is needed: `.pharn/` is outside the reconciled
// set, and outside `check-regress.mjs scope`'s inside set (L17).
//
// ── Trust (P2) ────────────────────────────────────────────────────────────────────────────────────────
// Argv values are shape-checked (a clean-scalar guard, then a closed set or an anchored grammar — L14)
// before use, and a refusal never echoes one raw: it names the flag and the vocabulary, and anything quoted
// goes through the total `quote()` (L62) — argv is the orchestrator's, never the stage agent's. The result
// file is DATA from another model: it reaches control flow only through `read`'s exit code and closed line,
// and `read`'s stderr only as a fixed `READ_DEFECTS` code.

import {
  lstatSync,
  statSync,
  openSync,
  readSync,
  fstatSync,
  closeSync,
  writeFileSync,
  renameSync,
  mkdirSync,
  unlinkSync,
  constants,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FEATURE_SLUG_RE } from "./gate-run-core.mjs";
import {
  STAGE_AGENT_COMMANDS,
  STAGES,
  ITERATED_STAGES,
  STAGE_CONFIG_KEYS,
  FULL_MODE,
  INLINE_REMEDIES,
  LOOP_ROWS,
  RESULT_FILE,
  RESULT_STATUSES,
  RESULT_DEFECTS,
  GATES,
  AGENT,
  policyCell,
  modesOf,
  decideRoute,
  renderBrief,
  validateResult,
  buildResult,
  readVerdict,
  unusableVerdict,
  quote,
} from "./stage-agent-core.mjs";

/** The checker spawn's bound — measured, with its margin, in the header. Exported so a test names it. */
export const CHECKER_TIMEOUT_MS = 10_000;

/** `route`'s config path when `--config` is absent, resolved against the invoking directory. THE one
 *  literal (L41); one test reaches it with no `--config` at all. */
export const DEFAULT_CONFIG = "pharn.config.json";

/** The largest result file `read` accepts. A real one is ~200 bytes. */
export const RESULT_MAX_BYTES = 64 * 1024;

/** The file-level codes `read` names on stderr for a result it cannot use. */
export const READ_FILE_DEFECTS = Object.freeze([
  "no-state-dir",
  "state-dir-refused",
  "no-result-file",
  "not-a-regular-file",
  "read-failed",
  "too-large",
  "not-json",
  "not-removed",
]);

/** Every code `read` may print on stderr (`stage-agent: read: <code>`): the file-level ones above, then the
 *  content-level `RESULT_DEFECTS`. Fixed text only (GATE-2 review A7). A usage refusal is not in this set: it
 *  names the orchestrator's own argv, as every subcommand's usage refusal does. */
export const READ_DEFECTS = Object.freeze([...READ_FILE_DEFECTS, ...RESULT_DEFECTS]);

const HERE = dirname(fileURLToPath(import.meta.url));
const CHECKER = join(HERE, "check-model-config.mjs");

/** Each subcommand's closed flag set. */
const FLAGS = Object.freeze({
  route: Object.freeze(["--command", "--stage", "--name", "--iteration", "--mode", "--config"]),
  brief: Object.freeze(["--command", "--stage", "--name", "--iteration", "--mode"]),
  report: Object.freeze(["--command", "--stage", "--name", "--iteration", "--status", "--row", "--gate"]),
  read: Object.freeze(["--command", "--stage", "--name", "--iteration"]),
});

const ITER_RE = /^[1-9][0-9]{0,5}$/;

/** No C0 control character (tab/newline/CR included), no DEL, 1..max characters. The guard that runs
 *  BEFORE any grammar test (L14), composed, never instead. */
function cleanScalar(v, max) {
  if (typeof v !== "string" || v.length < 1 || v.length > max) return false;
  for (let i = 0; i < v.length; i++) {
    const c = v.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) return false;
  }
  return true;
}

function errCode(e) {
  return e && typeof e.code === "string" && /^[A-Z0-9_]{1,40}$/.test(e.code) ? e.code : "error";
}

/**
 * Parse one subcommand's argv. Returns `{ok: true, opts}` or `{ok: false, reason}`. A refusal names the
 * flag and its vocabulary, never the raw value (the mark-phase.mjs precedent, L62).
 */
export function parseArgs(sub, argv) {
  const allowed = FLAGS[sub];
  const seen = {};
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (!allowed.includes(flag))
      return { ok: false, reason: `unknown argument ${quote(flag)} for \`${sub}\` (allowed: ${allowed.join(", ")})` };
    if (Object.hasOwn(seen, flag)) return { ok: false, reason: `${flag} was given more than once` };
    const v = argv[i + 1];
    if (v === undefined || (typeof v === "string" && v.startsWith("--"))) return { ok: false, reason: `${flag} was given with no value` };
    seen[flag] = v;
    i++;
  }
  const o = {};
  const need = (flag) => Object.hasOwn(seen, flag);
  for (const flag of ["--command", "--stage", "--name"]) if (!need(flag)) return { ok: false, reason: `${flag} is required` };
  if (sub === "report" && !need("--status")) return { ok: false, reason: "--status is required" };

  const cmd = seen["--command"];
  if (!cleanScalar(cmd, 64) || !STAGE_AGENT_COMMANDS.includes(cmd))
    return { ok: false, reason: `--command must be one of ${STAGE_AGENT_COMMANDS.join(", ")}` };
  o.command = cmd;
  const stage = seen["--stage"];
  if (!cleanScalar(stage, 64) || !STAGES.includes(stage)) return { ok: false, reason: `--stage must be one of ${STAGES.join(", ")}` };
  o.stage = stage;
  const name = seen["--name"];
  if (!cleanScalar(name, 64) || !FEATURE_SLUG_RE.test(name))
    return { ok: false, reason: `--name must be a feature slug matching ${FEATURE_SLUG_RE}` };
  o.name = name;

  o.iteration = null;
  if (need("--iteration")) {
    const it = seen["--iteration"];
    if (!cleanScalar(it, 6) || !ITER_RE.test(it)) return { ok: false, reason: "--iteration must be a positive integer" };
    o.iteration = Number(it);
  }
  if (ITERATED_STAGES.includes(o.stage) !== (o.iteration !== null)) {
    return { ok: false, reason: `--iteration is required exactly for an iterated stage (${ITERATED_STAGES.join(", ")})` };
  }

  o.mode = FULL_MODE;
  if (need("--mode")) {
    const m = seen["--mode"];
    const columns = modesOf(o.command).filter((x) => x !== FULL_MODE);
    if (!cleanScalar(m, 32) || !columns.includes(m)) {
      return {
        ok: false,
        reason: columns.length
          ? `--mode must be one of ${columns.join(", ")} for ${o.command} (the full mode is spelled by leaving --mode out)`
          : `${o.command} has no policy column besides full, so --mode is refused (the full mode is spelled by leaving --mode out)`,
      };
    }
    o.mode = m;
  }

  if (need("--config")) {
    const c = seen["--config"];
    if (!cleanScalar(c, 4096)) return { ok: false, reason: "--config must be a path without control characters" };
    o.config = c;
  }

  if (sub === "report") {
    const st = seen["--status"];
    if (!cleanScalar(st, 16) || !RESULT_STATUSES.includes(st))
      return { ok: false, reason: `--status must be one of ${RESULT_STATUSES.join(", ")}` };
    o.status = st;
    o.row = null;
    if (need("--row")) {
      const r = seen["--row"];
      if (!cleanScalar(r, 8) || !LOOP_ROWS.includes(r)) return { ok: false, reason: `--row must be one of ${LOOP_ROWS.join(", ")}` };
      o.row = r;
    }
    o.gate = null;
    if (need("--gate")) {
      const g = seen["--gate"];
      if (!cleanScalar(g, 8) || !GATES.includes(g)) return { ok: false, reason: `--gate must be one of ${GATES.join(", ")}` };
      o.gate = g;
    }
    // The cross-field rules have ONE owner, validateResult; a result that would not read back is refused
    // here rather than written.
    const v = validateResult(buildResult(o), o);
    if (!v.ok) return { ok: false, reason: `this result would not read back: ${v.defect}` };
  }
  return { ok: true, opts: o };
}

// ── The containment walk ─────────────────────────────────────────────────────────────────────────────

/** The three state-root components, relative, for messages. */
function stateParts(command, name) {
  return [".pharn", `.pharn/${command}`, `.pharn/${command}/${name}`];
}

/**
 * lstat each state-root component in turn. Returns `{ok: true, firstMissing}` — the index of the first
 * absent component, or -1 when all three exist as real directories — or `{ok: false, reason}` for a
 * symbolic link, a non-directory, or an error other than ENOENT. Never follows a link (L54, L59).
 */
export function walkStateDirs(root, command, name) {
  const rel = stateParts(command, name);
  for (let i = 0; i < rel.length; i++) {
    let st;
    try {
      st = lstatSync(join(root, rel[i]));
    } catch (e) {
      if (e && e.code === "ENOENT") return { ok: true, firstMissing: i };
      return { ok: false, reason: `cannot inspect ${rel[i]} (${errCode(e)})` };
    }
    if (st.isSymbolicLink()) return { ok: false, reason: `${rel[i]} is a symbolic link — refusing to follow it` };
    if (!st.isDirectory()) return { ok: false, reason: `${rel[i]} is not a directory` };
  }
  return { ok: true, firstMissing: -1 };
}

/** The result path's own kind: absent | file | symlink | other | error. lstat only. */
function resultKind(path) {
  try {
    const st = lstatSync(path);
    if (st.isSymbolicLink()) return "symlink";
    return st.isFile() ? "file" : "other";
  } catch (e) {
    return e && e.code === "ENOENT" ? "absent" : "error";
  }
}

function resultRel(command, name) {
  return `.pharn/${command}/${name}/${RESULT_FILE}`;
}

/** Remove a leftover result (route, before a spawn). Returns null on success, else a reason. */
export function clearResult(root, command, name) {
  const walk = walkStateDirs(root, command, name);
  if (!walk.ok) return walk.reason;
  if (walk.firstMissing !== -1) return null;
  const path = join(root, ".pharn", command, name, RESULT_FILE);
  const kind = resultKind(path);
  if (kind === "absent") return null;
  if (kind !== "file") return `${resultRel(command, name)} is not a regular file (${kind}) — clear it by hand`;
  try {
    unlinkSync(path);
  } catch (e) {
    return `cannot remove ${resultRel(command, name)} (${errCode(e)})`;
  }
  return null;
}

/** Write a result atomically (report). Returns null on success, else a reason; nothing is left behind on
 *  a refusal except a component directory the walk had already created. */
export function writeResult(root, result) {
  const { command, name } = result;
  const walk = walkStateDirs(root, command, name);
  if (!walk.ok) return walk.reason;
  const rel = stateParts(command, name);
  if (walk.firstMissing !== -1) {
    for (let i = walk.firstMissing; i < rel.length; i++) {
      try {
        mkdirSync(join(root, rel[i]));
      } catch (e) {
        return `cannot create ${rel[i]} (${errCode(e)})`;
      }
    }
  }
  const dir = join(root, rel[2]);
  const path = join(dir, RESULT_FILE);
  const kind = resultKind(path);
  if (kind !== "absent" && kind !== "file") return `${resultRel(command, name)} is not a regular file (${kind}) — clear it by hand`;
  const tmp = join(dir, `.${RESULT_FILE}.${process.pid}.tmp`);
  try {
    writeFileSync(tmp, `${JSON.stringify(result)}\n`, { flag: "wx" });
  } catch (e) {
    return `cannot write a temporary result beside ${resultRel(command, name)} (${errCode(e)})`;
  }
  try {
    renameSync(tmp, path);
  } catch (e) {
    try {
      unlinkSync(tmp);
    } catch {
      // nothing more to undo
    }
    return `cannot place ${resultRel(command, name)} (${errCode(e)})`;
  }
  return null;
}

/**
 * Consume a result (read). Returns `{verdict: {line, exit}, defect}` — never throws; `defect` is a READ_DEFECTS
 * member, or null for a usable result. A regular result file is removed whether it validates or not, so it can
 * never answer twice; one that cannot be removed is `unusable unreadable` (`not-removed`).
 */
export function consumeResult(root, expect) {
  const { command, name } = expect;
  const walk = walkStateDirs(root, command, name);
  if (!walk.ok) return { verdict: unusableVerdict("unreadable"), defect: "state-dir-refused" };
  if (walk.firstMissing !== -1) return { verdict: unusableVerdict("no-result"), defect: "no-state-dir" };
  const path = join(root, ".pharn", command, name, RESULT_FILE);
  const kind = resultKind(path);
  if (kind === "absent") return { verdict: unusableVerdict("no-result"), defect: "no-result-file" };
  if (kind !== "file") return { verdict: unusableVerdict("unreadable"), defect: "not-a-regular-file" };

  let text;
  let fd = null;
  try {
    fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const st = fstatSync(fd);
    if (!st.isFile()) return { verdict: unusableVerdict("unreadable"), defect: "not-a-regular-file" };
    if (st.size > RESULT_MAX_BYTES) text = null;
    else {
      const buf = Buffer.alloc(st.size);
      let off = 0;
      while (off < st.size) {
        const n = readSync(fd, buf, off, st.size - off, off);
        if (n === 0) break;
        off += n;
      }
      text = buf.subarray(0, off).toString("utf8");
    }
  } catch {
    return { verdict: unusableVerdict("unreadable"), defect: "read-failed" };
  } finally {
    if (fd !== null) {
      try {
        closeSync(fd);
      } catch {
        // already closed
      }
    }
  }

  let outcome;
  if (text === null) outcome = { verdict: unusableVerdict("malformed"), defect: "too-large" };
  else {
    let parsed;
    let parsedOk = true;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsedOk = false;
    }
    if (!parsedOk) outcome = { verdict: unusableVerdict("malformed"), defect: "not-json" };
    else {
      const v = validateResult(parsed, expect);
      outcome = v.ok ? { verdict: readVerdict(v.result), defect: null } : { verdict: unusableVerdict(v.reason), defect: v.defect };
    }
  }
  try {
    unlinkSync(path);
  } catch {
    return { verdict: unusableVerdict("unreadable"), defect: "not-removed" };
  }
  return outcome;
}

// ── The config probe ─────────────────────────────────────────────────────────────────────────────────

/** A FOLLOWED stat: only ENOENT is absence (a dangling link reads absent, as the checker reads it). */
function configPresent(path) {
  try {
    statSync(path);
    return true;
  } catch (e) {
    return !(e && e.code === "ENOENT");
  }
}

/** Shell the checker by absolute path; `status` is null for a spawn error, a signal or the timeout. */
function runChecker(args) {
  const r = spawnSync(process.execPath, [CHECKER, ...args], {
    encoding: "utf8",
    timeout: CHECKER_TIMEOUT_MS,
    killSignal: "SIGKILL",
    maxBuffer: 1024 * 1024,
  });
  if (r.error || r.status === null) return { status: null, stdout: "" };
  return { status: r.status, stdout: typeof r.stdout === "string" ? r.stdout : "" };
}

/** Decide one route. Returns `{token, exit, reason?}` or `{refuse}`. */
export function route(opts, root = process.cwd()) {
  const cell = policyCell(opts.command, opts.mode, opts.stage);
  if (cell === null) return { refuse: "no policy cell for this command, mode and stage" };
  const configPath = resolve(root, opts.config ?? DEFAULT_CONFIG);
  const key = STAGE_CONFIG_KEYS[opts.stage];
  const obs = {};
  // At most four rounds: config, resolve, validate, then a final decision.
  for (let round = 0; round < 4; round++) {
    const d = decideRoute(cell, obs);
    if (d.need === "config") obs.configPresent = configPresent(configPath);
    else if (d.need === "resolve") obs.resolve = runChecker(["resolve", key, "--config", configPath]);
    else if (d.need === "validate") obs.validate = runChecker(["validate", "--config", configPath]);
    else if (d.refuse === "skipped")
      return { refuse: `${opts.stage} does not run in ${opts.command}'s ${opts.mode} mode (policy: skipped), so it has no route` };
    else if (d.refuse) return { refuse: "no route for this policy cell" };
    else return d;
  }
  return { refuse: "the route decision did not converge" };
}

// ── The CLI ──────────────────────────────────────────────────────────────────────────────────────────

function out(line) {
  process.stdout.write(line.endsWith("\n") ? line : `${line}\n`);
}
function err(line) {
  process.stderr.write(`stage-agent: ${line}\n`);
}

function main(argv) {
  const sub = argv[0];
  if (!Object.hasOwn(FLAGS, sub ?? "")) {
    err(`usage: node pharn/floor/stage-agent.mjs <route|brief|report|read> --command <c> --stage <stage> --name '<name>' …`);
    return 2;
  }
  const parsed = parseArgs(sub, argv.slice(1));
  if (!parsed.ok) {
    if (sub === "read") out(unusableVerdict("usage").line);
    err(parsed.reason);
    return 2;
  }
  const o = parsed.opts;
  const root = process.cwd();

  if (sub === "route") {
    const d = route(o, root);
    if (d.refuse) {
      err(d.refuse);
      return 2;
    }
    if (d.exit === 0) {
      const why = clearResult(root, o.command, o.name);
      if (why !== null) {
        err(`${why}; no agent is routed while a leftover result could answer for it`);
        return 2;
      }
    } else {
      err(`${o.stage} runs inline (${d.reason}) — ${INLINE_REMEDIES[d.reason]}`);
    }
    out(d.token);
    return d.exit;
  }

  if (sub === "brief") {
    if (policyCell(o.command, o.mode, o.stage) !== AGENT) {
      err(`${o.stage} is not routed in ${o.command}'s ${o.mode} mode, so it has no brief — it runs inline`);
      return 2;
    }
    const b = renderBrief(o);
    if (!b.ok) {
      err(b.reason);
      return 2;
    }
    process.stdout.write(b.text);
    return 0;
  }

  if (sub === "report") {
    const why = writeResult(root, buildResult(o));
    if (why !== null) {
      err(`${why}; nothing was reported`);
      return 2;
    }
    out(`stage-agent: reported ${o.status}${o.row ? ` ${o.row}` : ""}${o.gate ? ` gate:${o.gate}` : ""} for ${o.stage} of ${o.name}`);
    return 0;
  }

  // read — stderr carries one fixed READ_DEFECTS code, never a byte of the result (GATE-2 review A7).
  const { verdict, defect } = consumeResult(root, { command: o.command, name: o.name, stage: o.stage, iteration: o.iteration });
  out(verdict.line);
  if (defect) err(`read: ${defect}`);
  return verdict.exit;
}

if (import.meta.main) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    // A throw here is a defect; exit 2 would read as a verdict for `read`, so surface it as a crash code
    // the callers already treat as "no verdict" — 1 — with the error code only, never a raw message.
    process.stderr.write(`stage-agent: unexpected failure (${errCode(e)})\n`);
    process.exitCode = 1;
  }
}
