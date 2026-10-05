// pharn/floor/stage-direct-core.mjs — the PURE half of the orchestrators' direct stage call (added 6.43.0,
// orchestrator-direct-stage-calls — audit candidate C3). No filesystem, no child_process, no clock. The execution
// half — the scope setter, the markers, the stage script — is `pharn/floor/stage-direct.mjs`, whose header is the
// protocol's spec (P7: no new contract). This file changes when a RULE changes (which stages, which flags, which
// exits close a stage); that one changes when an execution detail does (P3).
//
// WHAT IT ENCODES:
//   * `DIRECT_STAGES` — the ONE closed table: per stage, the script it runs, the thin-caller command whose `writes:` the
//     scope is set from (`--from-frontmatter`), the scope target — IMPORTED from each stage's own path table
//     (`REGRESS_PATHS.stageJson`, `VERIFY_PATHS.stageJson`), never re-typed (L35) — the stage-exit stage name, and
//     the script flags the call passes through. The flag set holds every flag a registry `question` option appends
//     (`stage-exit-core.mjs` REGISTRY — a test holds the two together), so a question's answer can always be
//     appended to the same fresh line.
//   * `parseDirectArgs` — closed in both directions per mode: a FRESH call takes `--stage --name --iteration
//     --timeout-ms --budget-ms` and the stage's flags; a RESUME call takes `--stage --name --resume --budget-ms` and
//     nothing else. No default for any number (L41): the pinned line carries them.
//   * `scriptArgv`, `setterArgv`, `CLEAR_ARGV` — what each child is given.
//   * `returnMarkerDue(exit)` — every exit closes the stage's execution but `continue` (5): a stage SCRIPT that asks
//     a question has ENDED (nothing continues inside it, unlike a stage agent — `stage-agent.mjs finish`), so its
//     return marker is written and an answered re-run is a second execution.
//   * The in-flight lock's path, schema and closed refusals, and `parseLock` — what a held record must look like
//     (GATE-2 review R1; the execution, and why the lock exists, are `stage-direct.mjs`'s header).
// TRUST (P2): argv is the orchestrator's (a validated slug, `<N>`, git's hex, or a ship human's answer the script
// re-validates). This module checks presence, closed membership and control characters only — it never interprets
// a stage flag's VALUE; the script does, as it always has. A refusal names the flag and the vocabulary, and quotes an
// argv string through `JSON.stringify`, which cannot throw on a string (L62).

import { REGRESS_PATHS } from "./stage-regress-core.mjs";
import { VERIFY_PATHS } from "./stage-verify-core.mjs";
import { EXIT_CODE, FEATURE_SLUG_RE } from "./stage-exit-core.mjs";

/** The scope setter every pinned setter line runs, relative to the project root. */
export const SETTER = ".claude/hooks/set-writes-scope.cjs";

/** The setter's release argv. */
export const CLEAR_ARGV = Object.freeze(["--clear"]);

/** THE table (see the header). Frozen at every level; iterate it, never re-list it (L29). */
export const DIRECT_STAGES = Object.freeze({
  "pharn-regress": Object.freeze({
    script: "stage-regress.mjs",
    command: ".claude/commands/pharn-regress.md",
    target: REGRESS_PATHS.stageJson,
    exitStage: "regress",
    valueFlags: Object.freeze(["--base", "--gates", "--install", "--tests"]),
    bareFlags: Object.freeze(["--no-install", "--no-tests"]),
  }),
  "pharn-verify": Object.freeze({
    script: "stage-verify.mjs",
    command: ".claude/commands/pharn-verify.md",
    target: VERIFY_PATHS.stageJson,
    exitStage: "verify",
    valueFlags: Object.freeze(["--gates"]),
    bareFlags: Object.freeze([]),
  }),
});

/** The call's own flags. */
const OWN_VALUE_FLAGS = Object.freeze(["--stage", "--name", "--iteration", "--timeout-ms", "--budget-ms"]);
const RESUME = "--resume";

const ITER_RE = /^[1-9][0-9]{0,5}$/;
const MS_RE = /^[1-9][0-9]{0,8}$/;

/** No C0 control character (tab/newline/CR included), no DEL, 1..max characters (L14). */
function cleanScalar(v, max) {
  if (typeof v !== "string" || v.length < 1 || v.length > max) return false;
  for (let i = 0; i < v.length; i++) {
    const c = v.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) return false;
  }
  return true;
}

/** An argv string, quoted and bounded for a refusal. `JSON.stringify` of a string never throws (L62). */
function shown(s) {
  const q = JSON.stringify(String(s)).replace(/[\u0000-\u001f\u007f]/g, "?"); // eslint-disable-line no-control-regex
  return q.length > 80 ? `${q.slice(0, 80)}…` : q;
}

/**
 * Parse one direct call's argv. Returns `{ok: true, opts}` — `opts` = {stage, name, mode: "fresh" | "resume",
 * iteration, timeoutMs, budgetMs, passthrough: string[]} — or `{ok: false, reason}`. Every flag at most once.
 */
export function parseDirectArgs(argv) {
  if (!Array.isArray(argv)) return { ok: false, reason: "no arguments" };
  const seen = new Map();
  const order = [];
  let resume = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === RESUME) {
      if (resume) return { ok: false, reason: `${RESUME} was given more than once` };
      resume = true;
      continue;
    }
    if (typeof a !== "string" || !a.startsWith("--")) return { ok: false, reason: `unexpected argument ${shown(a)}` };
    if (seen.has(a)) return { ok: false, reason: `${a.length > 40 ? "a flag" : a} was given more than once` };
    const bare = Object.values(DIRECT_STAGES).some((s) => s.bareFlags.includes(a));
    if (bare) {
      seen.set(a, true);
      order.push(a);
      continue;
    }
    const v = argv[i + 1];
    if (v === undefined || (typeof v === "string" && v.startsWith("--")))
      return { ok: false, reason: `${shown(a)} was given with no value` };
    seen.set(a, v);
    order.push(a);
    i++;
  }
  const stage = seen.get("--stage");
  if (stage === undefined) return { ok: false, reason: "--stage is required" };
  if (!cleanScalar(stage, 64) || !Object.hasOwn(DIRECT_STAGES, stage))
    return { ok: false, reason: `--stage must be one of ${Object.keys(DIRECT_STAGES).join(", ")}` };
  const table = DIRECT_STAGES[stage];
  const name = seen.get("--name");
  if (name === undefined) return { ok: false, reason: "--name is required" };
  if (!cleanScalar(name, 64) || !FEATURE_SLUG_RE.test(name))
    return { ok: false, reason: `--name must be a feature slug matching ${FEATURE_SLUG_RE}` };
  const budget = seen.get("--budget-ms");
  if (budget === undefined) return { ok: false, reason: "--budget-ms is required" };
  if (!cleanScalar(budget, 9) || !MS_RE.test(budget))
    return { ok: false, reason: "--budget-ms must be a positive integer of milliseconds" };

  if (resume) {
    const extra = order.filter((f) => !["--stage", "--name", "--budget-ms"].includes(f));
    if (extra.length)
      return {
        ok: false,
        reason: `${RESUME} takes only --stage, --name and --budget-ms (the script reads the rest from its progress record)`,
      };
    return { ok: true, opts: { stage, name, mode: "resume", iteration: null, timeoutMs: null, budgetMs: Number(budget), passthrough: [] } };
  }

  const iteration = seen.get("--iteration");
  if (iteration === undefined) return { ok: false, reason: "--iteration is required for a fresh call" };
  if (!cleanScalar(iteration, 6) || !ITER_RE.test(iteration)) return { ok: false, reason: "--iteration must be a positive integer" };
  const timeout = seen.get("--timeout-ms");
  if (timeout === undefined) return { ok: false, reason: "--timeout-ms is required for a fresh call" };
  if (!cleanScalar(timeout, 9) || !MS_RE.test(timeout))
    return { ok: false, reason: "--timeout-ms must be a positive integer of milliseconds" };

  const passthrough = [];
  for (const f of order) {
    if (OWN_VALUE_FLAGS.includes(f)) continue;
    if (table.bareFlags.includes(f)) {
      passthrough.push(f);
      continue;
    }
    if (!table.valueFlags.includes(f)) {
      const allowed = [...table.valueFlags, ...table.bareFlags];
      return {
        ok: false,
        reason: `${f.length > 40 ? "a flag" : shown(f)} is not a ${stage} flag (allowed: ${allowed.length ? allowed.join(", ") : "none"})`,
      };
    }
    const v = seen.get(f);
    if (!cleanScalar(v, 4096)) return { ok: false, reason: `${f} must be a value without control characters` };
    passthrough.push(f, v);
  }
  return {
    ok: true,
    opts: { stage, name, mode: "fresh", iteration: Number(iteration), timeoutMs: Number(timeout), budgetMs: Number(budget), passthrough },
  };
}

/** The stage script's argv for parsed `opts`. A resume carries no state of its own (L44). */
export function scriptArgv(opts) {
  if (opts.mode === "resume") return [RESUME, "--budget-ms", String(opts.budgetMs)];
  return ["--feature", opts.name, "--timeout-ms", String(opts.timeoutMs), "--budget-ms", String(opts.budgetMs), ...opts.passthrough];
}

/** The setter's argv for a stage: exactly the thin caller's pinned setter line (a hygiene test compares the two). */
export function setterArgv(stage) {
  const t = DIRECT_STAGES[stage];
  return ["--from-frontmatter", t.command, "--target", t.target];
}

/** Does this exit close the stage's execution (write the return marker)? Every exit but `continue`. */
export function returnMarkerDue(exit) {
  return exit !== EXIT_CODE.continue;
}

/** The second (last) line printed when the return marker waits for a resume. */
export const MARKER_DEFERRED_CONTINUE = "marker: deferred (continue)";

// ── THE IN-FLIGHT LOCK (GATE-2 review R1) ─────────────────────────────────────────────────────────────
// ONE lock for both stages, beside (never inside) their state roots: each stage script's fresh start removes its own
// root (`.pharn/pharn-verify/` whole; regress clears `.pharn/pharn-regress/`), so a lock there would be deleted while
// held — and the two stages share the one writes-scope file, which is what a second concurrent call would clobber.

/** The lock's directory and file, relative to the project root. */
export const LOCK_DIR = ".pharn/stage-direct";
export const LOCK_FILE = `${LOCK_DIR}/in-flight.json`;

/** The lock record's schema token. */
export const LOCK_SCHEMA = "pharn-stage-direct-lock/1";

/** The closed reasons a call refuses with because of the lock (exit 2, a `stage-direct: refused (<reason>)` line). */
export const LOCK_REFUSALS = Object.freeze(["in-flight", "lock-unusable"]);

/** The most bytes a lock record is read to (one record is ~150 B). */
export const LOCK_READ_MAX = 4096;

/** The lock record a call writes: one JSON line. */
export function lockRecord({ pid, startedAt, stage, name }) {
  return `${JSON.stringify({ schema: LOCK_SCHEMA, pid, started_at: startedAt, stage, name })}\n`;
}

/**
 * Read a lock record's text. Returns `{pid, startedAt, stage, name}` when it is a well-formed record of this schema —
 * a positive integer pid, a stage of `DIRECT_STAGES`, a feature slug — else null (a torn or foreign file). Never throws.
 */
export function parseLock(text) {
  if (typeof text !== "string") return null;
  let o;
  try {
    o = JSON.parse(text);
  } catch {
    return null;
  }
  if (o === null || typeof o !== "object" || Array.isArray(o) || o.schema !== LOCK_SCHEMA) return null;
  if (!Number.isSafeInteger(o.pid) || o.pid < 1) return null;
  if (typeof o.stage !== "string" || !Object.hasOwn(DIRECT_STAGES, o.stage)) return null;
  if (typeof o.name !== "string" || !FEATURE_SLUG_RE.test(o.name)) return null;
  if (typeof o.started_at !== "string" || o.started_at.length > 40) return null;
  return { pid: o.pid, startedAt: o.started_at, stage: o.stage, name: o.name };
}
