#!/usr/bin/env node
// pharn/floor/check-entry-context.mjs — the CLI of /pharn-loop's ENTRY-CONTEXT GUARD (entry-context-guard). The rule —
// which context, which request, the threshold, the closed reasons and every bound — is `entry-context-core.mjs`'s
// header; this file reads argv, the environment, the markers and the config, and prints (P3).
//
// ================================ THE CLI — one line ================================
//   node pharn/floor/check-entry-context.mjs --feature <name>
//        [--session <id>] [--projects-dir <dir>] [--markers-base <dir>] [--root <dir>]
// `/pharn-loop` Step 1a runs it right after `mark-phase.mjs --kind run-start`, as its own Bash call once that line's
// result is back, with stdout redirected to `pharn/.run/pharn-loop/<name>/entry-context.txt` (the witness its Step 7
// summary quotes), and stops (S15b, `blocked: context-too-large`) on exit 3 alone. `/pharn-ship` runs it at Step 1, right
// after its run-start line, and only warns. The other flags exist for hermetic tests; each defaults as the cost
// ledger's CLI does:
//   --session       CLAUDE_CODE_SESSION_ID
//   --projects-dir  $CLAUDE_CONFIG_DIR/projects, else ~/.claude/projects (a fourth inline copy of this default —
//                   follow-up `projects-dir-default-one-owner`)
//   --markers-base  mark-phase.mjs DEFAULT_BASE (pharn/.run/cost)
//   --root          . — the project root whose pharn.config.json holds `budget.entryContextTokens`
// Exit: 0 — `within`, or `unknown <reason>` (every reason: unknown always means go on); 3 — `over`; 2 — usage (a
//       missing or malformed --feature, an unknown flag). Exactly one stdout line in every case; nothing on stderr but a
//       usage message. A module that fails to load is node's own exit 1, which /pharn-loop also reads as "go on".
// WRITES NOTHING: no file, no directory, no marker. Its only reads are the markers file, the config and the session's
// transcript files.

import "./runtime-floor.mjs";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { FEATURE_SLUG_RE } from "./gate-run-core.mjs";
import { CONFIG_FILE } from "./per-test-results-core.mjs";
import { DEFAULT_BASE as MARKERS_DEFAULT_BASE, markersPath } from "./mark-phase.mjs";
import { readMarkers } from "./render-cost-ledger.mjs";
import { EXIT, decide, measureEntryContext, parseEntryThreshold, unknownVerdict } from "./entry-context-core.mjs";

const USAGE =
  "usage: node pharn/floor/check-entry-context.mjs --feature <name> [--session <id>] [--projects-dir <dir>] [--markers-base <dir>] [--root <dir>]";

const FLAGS = Object.freeze({
  "--feature": "feature",
  "--session": "sessionId",
  "--projects-dir": "projectsDir",
  "--markers-base": "markersBase",
  "--root": "root",
});

/** argv → options, or `{ error }`. Each flag takes one value and may appear once. */
export function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!Object.hasOwn(FLAGS, k)) return { error: `unknown argument ${JSON.stringify(k)}` };
    const key = FLAGS[k];
    if (Object.hasOwn(opts, key)) return { error: `${k} given twice` };
    if (i + 1 >= argv.length) return { error: `${k} needs a value` };
    opts[key] = argv[++i];
  }
  if (typeof opts.feature !== "string" || !FEATURE_SLUG_RE.test(opts.feature)) return { error: "--feature <name> must be a feature slug" };
  return { opts };
}

/** The threshold from the project root's config. No file is the default; a file that exists and cannot be read (a
 *  directory, no permission) is malformed, never absent, and says so. */
function readThreshold(root) {
  let text;
  try {
    text = readFileSync(join(root, CONFIG_FILE), "utf8");
  } catch (e) {
    if (e && e.code === "ENOENT") return parseEntryThreshold(null);
    return { ok: false, reason: "threshold-malformed", detail: `${CONFIG_FILE} exists but cannot be read` };
  }
  return parseEntryThreshold(text);
}

/** Run the check. Returns `{ exit, stdout, stderr }`; never throws. */
export function run(argv, env = process.env) {
  const parsed = parseArgs(argv);
  if (parsed.error) return { exit: EXIT.usage, stdout: "", stderr: `check-entry-context: ${parsed.error}\n${USAGE}\n` };
  const o = parsed.opts;
  try {
    const projectsDir =
      o.projectsDir ?? (env.CLAUDE_CONFIG_DIR ? join(env.CLAUDE_CONFIG_DIR, "projects") : join(homedir(), ".claude", "projects"));
    const markers = readMarkers(markersPath(o.feature, o.markersBase ?? MARKERS_DEFAULT_BASE));
    const threshold = readThreshold(o.root ?? ".");
    const measure = measureEntryContext({ markers, sessionId: o.sessionId ?? env.CLAUDE_CODE_SESSION_ID ?? null, projectsDir });
    const v = decide(measure, threshold);
    return { exit: v.exit, stdout: `${v.line}\n`, stderr: "" };
  } catch {
    const v = unknownVerdict("crashed");
    return { exit: v.exit, stdout: `${v.line}\n`, stderr: "" };
  }
}

// `import.meta.main` — NOT a `file://` + argv[1] compare (L25).
if (import.meta.main) {
  const r = run(process.argv.slice(2));
  process.stdout.write(r.stdout);
  process.stderr.write(r.stderr);
  process.exit(r.exit);
}
