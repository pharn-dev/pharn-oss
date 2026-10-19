#!/usr/bin/env node
// pharn/floor/seam-config-materialize.mjs — extract the project's seam policy to scratch for the validator.
//
// /pharn-build Step 2c runs this line, then `node pharn/floor/check-seam-config.mjs .pharn/seam-config.json`. It
// replaces an inline `node -e` one-liner (6.67.0, audit LOOP-5): that line's quoted JavaScript held `;` and `|`, so
// /pharn-loop's exact allowed-tools grant could not name it and an inline build stopped on a permission prompt. A
// pinned script line can be granted exactly, and its behavior is tested here instead of retyped by a model (L22).
//
// What it does, reading `pharn.config.json` in the current directory (fail-closed, P5 — every branch a membership
// test, the fallback a HALT the command maps to "ask the human"):
//   (a) the file is ABSENT (ENOENT)               → write the documented default order, which ends in `ask`;
//   (b) present, a JSON object, `seam` absent/null → write the default (`seam ?? default`) — the file is intact;
//   (c) present, a JSON object, `seam` set         → write `seam` as given; validating it is NOT this script's job;
//   (d) unreadable, not valid JSON, or a top level that is not an object (null, an array, a string, a number)
//                                                  → HALT, exit 1, write nothing. Never swap the user's policy for
//                                                    the permissive default without saying so. Since 6.67.0 (d)
//                                                    includes a non-object top level, which the one-liner either
//                                                    crashed on (null) or read as "no seam" (the rest).
// The output is `JSON.stringify(seam, null, 2)` with no trailing newline — byte-identical to the one-liner's. On a
// HALT an existing `.pharn/seam-config.json` is left as it was (the build halts; nothing reads it).
//
// Honest scope (P0): it guarantees which branch ran and what bytes it wrote, nothing about the seam policy itself —
// `check-seam-config.mjs` owns that verdict (its `ask` invariant, the step enum). A `seam` value that is not an
// object is copied as given and refused there. Trust (P2): the config is project input; its values are copied,
// never interpreted, and never quoted into a message — a HALT line carries fixed text and Node's own `e.message`,
// so no parsed value can make the refusal throw (L62).
//
// NON-LLM, dependency-free (Node stdlib only). No network, no child_process, no eval.
//
// Usage:  node pharn/floor/seam-config-materialize.mjs
// Exit:   0 written (one `seam-config: …` line on stdout) | 1 HALT (one `HALT: …` line on stderr).

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const CONFIG_PATH = "pharn.config.json";
const OUT_DIR = ".pharn";
const OUT_PATH = ".pharn/seam-config.json";
// ARCHITECTURE §5's chain; the terminal `ask` is what check-seam-config.mjs requires (P5).
const DEFAULT_SEAM = Object.freeze({
  resolutionOrder: Object.freeze(["official-skill", "pinned-docs", "model", "fetch", "ask"]),
});

function halt(line) {
  console.error(`HALT: ${line}`);
  return 1;
}

function main() {
  let raw;
  try {
    raw = readFileSync(CONFIG_PATH, "utf8");
  } catch (e) {
    if (e?.code !== "ENOENT") return halt(`${CONFIG_PATH} unreadable: ${e?.message}`);
  }

  let seam = DEFAULT_SEAM;
  let source = `default (${CONFIG_PATH} absent)`;
  if (raw !== undefined) {
    let cfg;
    try {
      cfg = JSON.parse(raw);
    } catch (e) {
      return halt(
        `${CONFIG_PATH} is present but not valid JSON (${e?.message}) — refusing to substitute the permissive ` +
          "default for your seam policy; fix the file."
      );
    }
    if (cfg === null || typeof cfg !== "object" || Array.isArray(cfg)) {
      return halt(
        `${CONFIG_PATH} is present but its top level is not a JSON object — refusing to substitute the permissive ` +
          "default for your seam policy; fix the file."
      );
    }
    const own = Object.prototype.hasOwnProperty.call(cfg, "seam") ? cfg.seam : undefined;
    if (own === undefined || own === null) {
      source = `default (${CONFIG_PATH} has no seam block)`;
    } else {
      seam = own;
      source = `${CONFIG_PATH} seam block`;
    }
  }

  try {
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(OUT_PATH, JSON.stringify(seam, null, 2));
  } catch (e) {
    return halt(`could not write ${OUT_PATH}: ${e?.message}`);
  }
  console.log(`seam-config: wrote ${OUT_PATH} from ${source}`);
  return 0;
}

process.exit(main());
