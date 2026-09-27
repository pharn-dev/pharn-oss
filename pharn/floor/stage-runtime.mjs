// pharn/floor/stage-runtime.mjs — the MECHANICS every stage script shares (stage-verify-script, 6.26.0; GATE 1
// Q1). No CLI, no emission, no reason codes: each helper RETURNS a result, and the calling stage script keeps its
// own emit wrappers, its own reason codes and its own detail wording. The one piece of detail text supplied here is
// git's failure cause (`gitFailureDetail`, 6.28.3), which each caller quotes after its own words. Callers today:
// `stage-regress.mjs` (6.23.0) and `stage-verify.mjs` (6.26.0); `scope-inputs.mjs` and `quick-scope-core.mjs` use
// `gitSync` too (6.28.0); `feature-name.mjs` uses `containmentWalk` and `lstatSafe` (6.30.0).
//
// ================================ WHY ONE OWNER (L31, L35 — the recorded failure) ================================
// 6.23.0's review repaired these rules one by one inside `stage-regress.mjs`: the `--timeout-ms` digit rule (M7a),
// a trailing `--budget-ms` with no value (M7b), the by-index `--resume` scan (M7c), `--resume` skipping the
// containment walk (A4), and a budget clock that started late (A3). A second stage script that COPIED them would
// have re-opened every one of those seams the day the two copies diverged. So the rules live here once, and both
// scripts import them — the stale-output removal rule (`removeIfPresent`, only ENOENT is absence) included.
//
// ============================== WHAT IS DELIBERATELY NOT HERE ==============================
// • Emission. `stage-regress.mjs` and `stage-verify.mjs` each own their `emit` sentinel, their `emitUnusable`
//   wrappers and their registry-held reason codes (`stage-exit-core.mjs`). A helper here that emitted would put
//   one stage's vocabulary into another's exit, so every helper returns `{ok, …}` or a `{kind}` instead.
// • A stage's own containment LIST (which paths to walk) and its detail WORDING. `containmentWalk` is shared; the
//   `containmentGuard` that names `.pharn/pharn-regress` or `.pharn/pharn-verify` stays in each script.
// • The composition of a rule the two stages apply differently, named rather than hidden: `stage-verify.mjs`'s
//   `--resume` ALSO applies `parseBudgetMs` (so a value-less trailing `--budget-ms` is a `usage-error`), while
//   `stage-regress.mjs`'s `--resume` applies `parseResumeArgv` alone, exactly as in 6.23.0 — GATE 1 kept regress's
//   CLI behaviour unchanged, so the difference is the named follow-up `regress-resume-budget-value`, never a
//   second copy of either rule.
//
// ============================== THE FIXTURE-CLOSURE CONSTRAINT (GRILL G3) ==============================
// `stage-regress.test.mjs`'s ★ WIRING fixture copies the floor modules a regex finds in string literals —
// `["'](?:\.\/)?([a-z0-9-]+\.mjs)["']` — transitively from `stage-regress.mjs`. This module is therefore imported
// as `"./stage-runtime.mjs"`, and the one child it spawns is named in that literal form (`"run-gates.mjs"`), so the
// unchanged fixture still carries every module the script needs. `stage-runtime.test.mjs` pins it (closure parity).
//
// LOAD GRAPH: node builtins and `stage-exit-core.mjs` (for `mayStartSlowStep`), which imports nothing.
//
// TRUST (P2): every operand is argv (already the invoker's own text), a path this floor chose, or git/child
// output handed straight back to the caller. Nothing is evaluated; git and node run as argument vectors, never
// as shell text.

import { lstatSync, mkdirSync, writeFileSync, renameSync, unlinkSync } from "node:fs";
import { dirname, join, sep } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mayStartSlowStep } from "./stage-exit-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_GATES = join(HERE, "run-gates.mjs");

/** ------------------------------------------------------------------------------------------------
 *  argv helpers (the run-gates.mjs pattern). `flag` answers the FIRST occurrence's value, or undefined when the
 *  flag is absent or trails with no value — which is why the value rules below test `has` separately.
 *  ---------------------------------------------------------------------------------------------- */
export function flag(args, name) {
  const i = args.indexOf(name);
  return i !== -1 && i + 1 < args.length ? args[i + 1] : undefined;
}

export function has(args, name) {
  return args.includes(name);
}

/** Every token is either a known flag (a value flag consumes the next token) or a refusal: a positional, or an
 *  unrecognized flag. Returns the FIRST offending token's detail, in argv order. */
export function scanFlags(args, known, valueFlags) {
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith("--")) return { ok: false, detail: `unexpected positional argument ${JSON.stringify(a)}` };
    if (!known.has(a)) return { ok: false, detail: `unrecognized flag ${JSON.stringify(a)}` };
    if (valueFlags.has(a)) i++; // skip its value
  }
  return { ok: true };
}

/** M7(a) — 3-9 digits, `run-gates.mjs run --next`'s OWN `--timeout-ms` rule, so a value a stage would accept but
 *  the runner would refuse deep into a run is caught at the top instead. */
export function parseTimeoutMs(args) {
  const raw = flag(args, "--timeout-ms");
  if (raw === undefined || !/^\d{3,9}$/.test(raw)) {
    return { ok: false, detail: "--timeout-ms is required and must be a 3-9 digit positive integer (matches run-gates.mjs run --next)" };
  }
  return { ok: true, value: Number(raw) };
}

/** M7(b) — a TRAILING `--budget-ms` with no value must not silently mean "unbudgeted": `flag()` returns
 *  `undefined` for it, indistinguishable from the flag being absent. `value` is `null` when the flag is absent. */
export function parseBudgetMs(args) {
  if (has(args, "--budget-ms") && flag(args, "--budget-ms") === undefined) {
    return { ok: false, detail: "--budget-ms requires a value" };
  }
  const raw = flag(args, "--budget-ms");
  if (raw === undefined) return { ok: true, value: null };
  if (!/^\d+$/.test(raw)) return { ok: false, detail: "--budget-ms must be a non-negative integer" };
  return { ok: true, value: Number(raw) };
}

/** M7(c) — a `--resume` invocation accepts `--budget-ms <n>` and nothing else. The scan goes BY INDEX: a value
 *  test by `args.indexOf(a)` always found the FIRST occurrence, so a stray duplicate number
 *  (`--resume --budget-ms 100 100`) read the first number's predecessor and slipped through. `budgetOverride` is
 *  `undefined` when no value was given — see the header for the one composition difference between the stages. */
export function parseResumeArgv(args) {
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--resume") continue;
    if (a === "--budget-ms") continue;
    if (/^\d+$/.test(a) && args[i - 1] === "--budget-ms") continue;
    return { ok: false, detail: `--resume accepts only --budget-ms; got ${JSON.stringify(a)}` };
  }
  const raw = flag(args, "--budget-ms");
  if (raw === undefined) return { ok: true, budgetOverride: undefined };
  if (!/^\d+$/.test(raw)) return { ok: false, detail: "--budget-ms must be a non-negative integer" };
  return { ok: true, budgetOverride: Number(raw) };
}

/** ------------------------------------------------------------------------------------------------
 *  CONTAINMENT (L54) — an `lstat` ENOENT is the only proof of absence; a symlink at ANY component, or an unusable
 *  lstat result, refuses. Mirrors run-gates.mjs's `assertContained` in method, not by import: that function ends
 *  the process through run-gates.mjs's own exit protocol.
 *  ---------------------------------------------------------------------------------------------- */
export function lstatSafe(p) {
  try {
    return { ok: true, stat: lstatSync(p) };
  } catch (e) {
    if (e && e.code === "ENOENT") return { ok: true, stat: null };
    return { ok: false, reason: e.message };
  }
}

export function containmentWalk(rootAbs, targetAbs) {
  if (targetAbs === rootAbs) return { ok: false, reason: `must not BE ${rootAbs}` };
  if (!(targetAbs + sep).startsWith(rootAbs + sep)) return { ok: false, reason: `must resolve strictly inside ${rootAbs}` };
  const rest = targetAbs.slice(rootAbs.length).split(sep).filter(Boolean);
  let cur = rootAbs;
  for (const part of [rootAbs, ...rest]) {
    cur = part === rootAbs ? rootAbs : join(cur, part);
    const r = lstatSafe(cur);
    if (!r.ok) return { ok: false, reason: `cannot lstat ${cur}: ${r.reason}` };
    if (r.stat === null) break; // truly absent — lstat's own ENOENT, never existsSync (L54)
    if (r.stat.isSymbolicLink()) return { ok: false, reason: `refuses a path that traverses a symlink at ${cur}` };
  }
  return { ok: true };
}

/** ------------------------------------------------------------------------------------------------
 *  THE STALE-OUTPUT REMOVAL RULE (GRILL G2; one owner since the GATE 2 fix) — ONLY `ENOENT` is absence. Any other
 *  unlink error (a directory at the path, a read-only parent) PROPAGATES: the caller crashes, exit 1 with no
 *  document, which is never read as a verdict. So a stage that removes its earlier report and then stops with a
 *  refusal or an `unusable` has really removed it — a swallowed error left the earlier report beside a later stop.
 *  Both stage scripts remove their earlier artifacts through this helper, `stage-regress.mjs` since the GATE 2 fix
 *  (before it, regress's own catch-all swallowed every unlink error — the follow-up `regress-stale-unlink-swallow`,
 *  closed here).
 *  ---------------------------------------------------------------------------------------------- */
export function removeIfPresent(relPath) {
  try {
    unlinkSync(relPath);
  } catch (e) {
    if (e && e.code === "ENOENT") return;
    throw e;
  }
}

/** ------------------------------------------------------------------------------------------------
 *  An atomic write of `relPath`: a tmp sibling under `tmpDir` (a stage's own scratch directory), then `rename` — so
 *  no stray tmp file ever lands beside the artifact. The CALLER walks containment first; the residual is the gap
 *  between that walk and the rename, which each stage names.
 *  ---------------------------------------------------------------------------------------------- */
export function atomicWrite(tmpDir, relPath, bytes) {
  mkdirSync(tmpDir, { recursive: true });
  mkdirSync(dirname(relPath), { recursive: true });
  const tmp = join(tmpDir, `${relPath.replace(/[\\/]/g, "_")}.tmp-${process.pid}`);
  writeFileSync(tmp, bytes);
  renameSync(tmp, relPath);
}

/** ------------------------------------------------------------------------------------------------
 *  git helpers. Every call is an ARGUMENT VECTOR (never a shell string); paths are never resolved absolute.
 *
 *  THE OUTPUT CEILING (stage-git-maxbuffer, 6.28.3). `execFileSync`'s default `maxBuffer` is 1 MiB, for stdout and for
 *  stderr each. Past it node fails the call with ENOBUFS, and a whole-repo `git ls-files -z` outgrows 1 MiB on a
 *  mid-size repo: measured, 1,709 paths of 766 bytes list 1,310,803 bytes, and the review that found this measured
 *  17,506 tracked files at 1.42 MB. git printed nothing on stderr for such a listing, so each stage script then
 *  stopped `git-failed` with a detail ending at its colon, before running a gate. GIT_MAX_BUFFER is the ceiling `reconcile-baseline.mjs`'s
 *  `enumerate()` already uses for the reconcile and fingerprint walks. It is a ceiling, not an allocation: 20 calls at
 *  it did not raise a process's resident size (45 MiB before them, 43 after, measured). Past it a call still fails,
 *  and `gitFailureDetail` names ENOBUFS. Every other git spawn in a shipped (non-test) `pharn/floor/*.mjs` module that
 *  can print a listing carries its own explicit ceiling; stage-runtime.test.mjs's ★ GIT CEILING closure holds that,
 *  within the bounds its section states.
 *  ---------------------------------------------------------------------------------------------- */
const GIT_MAX_BUFFER = 1 << 28; // 256 MiB

export function gitSync(args) {
  try {
    return {
      ok: true,
      stdout: execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: GIT_MAX_BUFFER }),
    };
  } catch (e) {
    return { ok: false, error: e, stderr: e && e.stderr ? String(e.stderr) : "", detail: gitFailureDetail(e) };
  }
}

/** Why a gitSync call failed, as the text every stage's `git-failed` detail carries: git's own stderr, trimmed, when
 *  it printed any, then how the call ended — node's error `code` when node set one (ENOBUFS: the output outgrew the
 *  buffer; ENOENT: git could not be started), else git's exit status, else the signal that ended it. Before this, a
 *  failure git never described left `git ls-files failed: ` with nothing after the colon.
 *  Read from the error's STRUCTURED fields only, never parsed out of its message (L6). TOTAL (L62): each field is
 *  typeof-tested before it is used and the whole body sits in a `try`, so an accessor that throws, a Proxy or a
 *  parsed-JSON shape yields the fixed fallback, never a throw. The stderr part is NOT capped — unchanged from before
 *  this function, and an `unusable` exit writes no artifact, so it reaches only the caller, as quoted DATA. */
export function gitFailureDetail(e) {
  try {
    const o = e !== null && typeof e === "object" ? e : {};
    const raw = typeof o.stderr === "string" ? o.stderr : Buffer.isBuffer(o.stderr) ? o.stderr.toString("utf8") : "";
    const said = raw.trim();
    let how;
    if (typeof o.code === "string" && o.code !== "") {
      how = o.code === "ENOBUFS" ? "node error ENOBUFS: git's output exceeded the read buffer" : `node error ${o.code}`;
    } else if (Number.isInteger(o.status)) {
      how = `git exited ${o.status}`;
    } else if (typeof o.signal === "string" && o.signal !== "") {
      how = `git was killed by ${o.signal}`;
    } else {
      how = "git failed with no exit status, signal or error code";
    }
    return said === "" ? how : `${said} (${how})`;
  } catch {
    return "git failed (its error could not be read)";
  }
}

export function nulList(stdout) {
  return stdout.split("\0").filter(Boolean);
}

/** ------------------------------------------------------------------------------------------------
 *  THE BUDGET TRACKER — ONE per PROCESS INVOCATION, never per phase re-entry: a fresh `slowSteps` counter on a
 *  re-entry would silently reset the "first slow step of THIS invocation" clock (`mayStartSlowStep`'s contract).
 *
 *  THE CLOCK (6.23.0 GATE-2 round 2): `invocationStart` is taken by the CALLER as the very first statement of its
 *  `runFresh`/`runResume`, so a fresh invocation's opening fast work is charged against the budget. Node's startup
 *  and module loading before that statement are not (a named bound). `state` is read at CALL time, so a caller that
 *  overrides `budgetMs` before building the tracker (a `--resume --budget-ms`) is honored.
 *  ---------------------------------------------------------------------------------------------- */
export function makeBudget(state, invocationStart) {
  let slowSteps = 0;
  return {
    may: () =>
      mayStartSlowStep({
        elapsedMs: Date.now() - invocationStart,
        timeoutMs: state.timeoutMs,
        budgetMs: state.budgetMs,
        slowStepsThisInvocation: slowSteps,
      }),
    spent: () => {
      slowSteps++;
    },
  };
}

/** ------------------------------------------------------------------------------------------------
 *  THE DRAIN — `run-gates.mjs run --next` until nothing remains, one gate per call, each gate a slow step under the
 *  budget. RETURNS, never emits:
 *    {kind: "done"}                       — the stamp is finalized (or already was: exit 3 is an idempotent repeat);
 *    {kind: "budget"}                     — the next gate may not start; the caller persists and exits `continue`;
 *    {kind: "refused", status, parsed, stdout, stderr} — the runner refused; the CALLER words the detail, so each
 *                                           stage's detail text is its own (regress's is byte-identical to 6.23.0).
 *  ---------------------------------------------------------------------------------------------- */
export function drainGates({ outDir, timeoutMs, budget }) {
  for (;;) {
    if (!budget.may()) return { kind: "budget" };
    const r = spawnSync(process.execPath, [RUN_GATES, "run", "--next", "--out", outDir, "--timeout-ms", String(timeoutMs)], {
      encoding: "utf8",
    });
    let parsed;
    try {
      parsed = JSON.parse(r.stdout || "");
    } catch {
      parsed = null;
    }
    if (r.status === 3) return { kind: "done" }; // already finalized — an idempotent repeat
    if (r.status !== 0 || parsed === null) {
      return { kind: "refused", status: r.status, parsed, stdout: r.stdout, stderr: r.stderr };
    }
    budget.spent();
    if (parsed.finalized || parsed.remaining === 0) return { kind: "done" };
  }
}
