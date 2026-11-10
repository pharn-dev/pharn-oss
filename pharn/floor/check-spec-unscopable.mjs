#!/usr/bin/env node
// pharn/floor/check-spec-unscopable.mjs — which acceptance criteria MENTION a path no plan may scope here (7.4.0).
//
// THE FAILURE IT ANSWERS (P7). 2026-11-10, 7.3.1, an installed project: `/pharn-spec --model-approve` approved and
// pinned a SPEC whose AC-13 required correcting `CLAUDE.md`. `set-writes-scope.cjs` refuses a `--from-plan` scope that
// names an instruction file in an installed project (7.3.0), so the run found out only at the plan stage and stopped S10
// after about 17 minutes. This CLI lets `/pharn-spec` see such a criterion before the SPEC is approved and pinned.
//
// ONE OWNER, NO SECOND COPY (L35). The refused paths are decided by `.claude/hooks/set-writes-scope.cjs` and nowhere
// else. That file exports nothing (it runs main() on load) and is guard control surface, so this CLI neither imports
// nor copies its predicates: it writes a throwaway PLAN whose `## Files` lists the candidate tokens under a fresh
// `mkdtemp` directory and RUNS the setter with `--check --from-plan <that file>`, from the project root (the same
// cwd-relative setter path loop-closeout.mjs runs). `--check` runs every parse and refusal and writes nothing. So the
// verdict is the setter's own in THIS project's posture: in an installed project it refuses instruction files
// (CLAUDE.md, CLAUDE.local.md, AGENTS.md at any depth) and PHARN's own surface (pharn/** except pharn/features/** and
// pharn/.run/**, .claude/**, pharn.config.json — the four trusted docs included), and in every posture memory-bank
// canon, CI workflows and local actions, git hooks dirs and .mcp.json. Only its EXIT CODE is read; its printed reason
// is discarded, never parsed (L6).
//
// CANDIDATE TOKENS (enum-regex). Per criterion — from spec-template-core.mjs's AC parser, verify lines dropped — every
// maximal run of [A-Za-z0-9._/-]. Leading `-` and `/` and leading `./` / `../` segments are stripped, because the setter
// refuses an absolute, `..`-escaping or `-`-led entry in EVERY posture for a reason unrelated to this check: unstripped,
// a URL route (`/api/users`) or a relative mention (`../x.md`) would be flagged as unscopable. Trailing `.` and `-` are
// stripped (sentence punctuation). A token is kept when it holds a `/` or a `.` followed by a letter or digit, and is at
// most 255 characters.
//
// SPAWNS. No candidate → CLEAR with no spawn. Otherwise one batch run over every unique token; exit 0 → CLEAR. A non-zero
// batch is attributed by one run per token (at most MAX_TOKENS; more → UNUSABLE). A batch refused with no single token
// refused, a missing setter, a spawn error, a signal or a timeout → UNUSABLE.
//
// Usage (from the project root):  node pharn/floor/check-spec-unscopable.mjs pharn/features/<name>/SPEC.md
// Exit: 0 CLEAR · 1 MENTIONS (one line per hit: AC id, file line, token) · 2 UNUSABLE <code>.
//
// WHAT A HIT MEANS, AND WHAT IT DOES NOT (P0).
//   - FLOOR: the listed criterion's text holds a token, from the closed alphabet above, that the setter's --check refuses
//     as a one-entry plan in this project, now. Enum-regex (the tokenizer) + the setter's own membership tests.
//   - NOT: that the criterion REQUIRES writing that path. A path-token test proves a MENTION — "correct CLAUDE.md" and
//     "the conventions CLAUDE.md states" are both hits. Edit-or-cite is a judgment (/pharn-spec Step 4 / 4a), advisory.
//   - NOT every such criterion (known-so-far misses, L67): a bare name the setter refuses only with its prefix
//     (`CONSTITUTION.md` for `pharn/CONSTITUTION.md`), a path holding a space or a character outside the alphabet, and
//     a file named in prose only ("the project's agent instructions file").
//   - POSTURE AT RUN TIME. In a dev checkout or an unsignalled tree the setter refuses instruction files and PHARN's
//     surface only while a /pharn-loop or /pharn-ship run marker is open. /pharn-loop opens its marker before its spec
//     stage, so this CLI agrees with that run's plan stage; /pharn-ship opens its marker after GATE 1, so at its spec
//     stage in such a tree this CLI reports CLEAR for a criterion the plan stage will refuse. An installed project (the
//     measured case) is refused regardless of markers.
//
// UNTRUSTED INPUT (P2). The SPEC body is untrusted. Output carries only AC ids, file line numbers and tokens from the
// closed alphabet — never criterion prose. The setter's stdout and stderr are discarded.

import "./runtime-floor.mjs";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { specAcceptanceCriteriaText } from "./spec-template-core.mjs";

/** The setter, relative to the project root this CLI is run from (as loop-closeout.mjs runs it). */
export const SETTER = ".claude/hooks/set-writes-scope.cjs";
export const MAX_TOKENS = 64;
export const MAX_TOKEN_LENGTH = 255;
const SPAWN_TIMEOUT_MS = 30_000;
const RUN_RE = /[A-Za-z0-9._/-]+/g;

/** Normalize one raw run to a candidate token, or `null`. Pure. */
export function candidate(raw) {
  let t = String(raw);
  for (let prev = null; prev !== t;) {
    prev = t;
    t = t.replace(/^[-/]+/, "").replace(/^\.\.?\//, "");
  }
  t = t.replace(/[.-]+$/, "");
  if (t === "" || t.length > MAX_TOKEN_LENGTH) return null;
  return t.includes("/") || /\.[A-Za-z0-9]/.test(t) ? t : null;
}

/** The unique candidate tokens of one criterion's lines, in first-seen order. Pure. */
export function tokensOf(lines) {
  const out = [];
  for (const line of lines) {
    for (const m of String(line).matchAll(RUN_RE)) {
      const t = candidate(m[0]);
      if (t !== null && !out.includes(t)) out.push(t);
    }
  }
  return out;
}

/** Run the setter's --check over `tokens` as one plan. Returns "ok" | "refused" | {error}. */
function setterCheck(root, dir, tokens, n) {
  const plan = join(dir, `plan-${n}.md`);
  writeFileSync(plan, "## Files\n\n" + tokens.map((t) => `- \`${t}\` — candidate\n`).join(""));
  const r = spawnSync(process.execPath, [SETTER, "--check", "--from-plan", plan], {
    cwd: root,
    stdio: "ignore",
    timeout: SPAWN_TIMEOUT_MS,
  });
  if (r.error || r.signal !== null || r.status === null) return { error: r.error ? r.error.code || "spawn-error" : "signal" };
  return r.status === 0 ? "ok" : "refused";
}

/**
 * The verdict over one SPEC text, in the project at `root`. Never prints.
 * @returns {{code: 0|1|2, token: string, hits: {id: string, line: number, token: string}[], detail?: string}}
 */
export function verdict(specText, root = process.cwd()) {
  const acs = specAcceptanceCriteriaText(specText);
  if (!acs.templated) return { code: 2, token: "UNUSABLE no-criteria", hits: [], detail: "the SPEC is not templated (no `spec_template`)" };
  if (acs.items.length === 0) {
    return {
      code: 2,
      token: "UNUSABLE no-criteria",
      hits: [],
      detail: "no single `## Acceptance Criteria` section with at least one AC item",
    };
  }
  const perItem = acs.items.map((it) => ({ id: it.id, line: it.line, tokens: tokensOf(it.lines) }));
  const all = [...new Set(perItem.flatMap((p) => p.tokens))];
  if (all.length === 0) return { code: 0, token: "CLEAR", hits: [] };
  if (all.length > MAX_TOKENS) {
    return {
      code: 2,
      token: "UNUSABLE too-many-tokens",
      hits: [],
      detail: `${all.length} candidate tokens, over the ${MAX_TOKENS} this check attributes`,
    };
  }
  if (!existsSync(resolve(root, SETTER)))
    return { code: 2, token: "UNUSABLE no-setter", hits: [], detail: `no ${SETTER} under the project root` };

  const dir = mkdtempSync(join(tmpdir(), "pharn-unscopable-"));
  try {
    const batch = setterCheck(root, dir, all, 0);
    if (typeof batch === "object")
      return { code: 2, token: "UNUSABLE setter-failed", hits: [], detail: `the setter did not finish (${batch.error})` };
    if (batch === "ok") return { code: 0, token: "CLEAR", hits: [] };
    const refused = new Set();
    for (let i = 0; i < all.length; i++) {
      const one = setterCheck(root, dir, [all[i]], i + 1);
      if (typeof one === "object")
        return { code: 2, token: "UNUSABLE setter-failed", hits: [], detail: `the setter did not finish (${one.error})` };
      if (one === "refused") refused.add(all[i]);
    }
    if (refused.size === 0) {
      return { code: 2, token: "UNUSABLE unattributed", hits: [], detail: "the setter refused the tokens together but none alone" };
    }
    const hits = perItem.flatMap((p) => p.tokens.filter((t) => refused.has(t)).map((t) => ({ id: p.id, line: p.line, token: t })));
    return { code: 1, token: "MENTIONS", hits };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function main(argv) {
  const [specPath, extra] = argv;
  if (!specPath || extra !== undefined) {
    console.log("UNUSABLE usage — node pharn/floor/check-spec-unscopable.mjs <SPEC.md>");
    return 2;
  }
  let text;
  try {
    text = readFileSync(specPath, "utf8");
  } catch {
    console.log("UNUSABLE unreadable — the SPEC could not be read");
    return 2;
  }
  const v = verdict(text);
  if (v.code === 0) {
    console.log("CLEAR — no acceptance criterion mentions a path the writes-scope setter refuses from a plan here");
  } else if (v.code === 2) {
    console.log(`${v.token} — ${v.detail}; the check did not run`);
  } else {
    const ids = new Set(v.hits.map((h) => h.id));
    console.log(
      `MENTIONS — ${ids.size} acceptance criteri${ids.size === 1 ? "on mentions" : "a mention"} a path the writes-scope setter refuses from a plan here:`
    );
    for (const h of v.hits) console.log(`${h.id} (line ${h.line}): \`${h.token}\``);
    console.log("A hit means the criterion MENTIONS such a path, never that it requires writing it.");
  }
  return v.code;
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
