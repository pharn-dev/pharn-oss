// .dev/floor/stage-agent-type.test.mjs — the `pharn-stage` subagent definition and its wiring into /pharn-loop and
// /pharn-ship (lean-stage-agent, Linear CORE-107, 7.19.0).
//
// WHY IT LIVES IN .dev/. It reads `.claude/agents/` and `.claude/commands/`, which no floor test under `pharn/` owns,
// and an install ships `pharn/floor/` without `.dev/` (review-lens-agent.test.mjs's reason, the same here). It pins
// TEXT, as command-hygiene.test.mjs does; there is no checker to pair it with.
//
// WHAT IT PINS, each with an in-memory negative control (L60). No mutant is ever written under `.claude/agents/`:
// Claude Code discovers that directory, so a file there is a live subagent type of this repo's sessions (L70).
//   ★ CLOSURE: `.claude/agents/` holds exactly `pharn-review-lens.md` and `pharn-stage.md` — each `pharn-` prefixed,
//     never `pharn-dev-` — closed both ways (L36). (review-lens-agent.test.mjs pins the first file's bytes.)
//   ★ BYTES: `pharn-stage.md`'s SHA-256 equals PINNED_SHA256 — the committed bytes, which the CORE-107 prefix probe
//     measures in a fresh session; its reader compares the probed tree's file with this constant, so the probe's
//     fraction applies to the bytes that ship. Then the frontmatter, byte for byte, and the closed eight-tool set.
//   BODY: at most BODY_MAX_BYTES after its H1; it names the brief line as the task and restates no rule of the brief
//     (pharn/floor/stage-agent-core.mjs renderBrief: the constitution read, the write-tool rule, the report line) and no
//     stage command (L35: the brief is the one copy of the task, so the `general-purpose` fallback receives the same).
//   ★ WIRING: item 2 of `## Running a stage` in both orchestrators names the type, its definition, the fallback and its
//     condition, the never-twice rule and the route-line note — and, since 7.20.0 (stage-effort-routing), the `effort`
//     parameter, the no-effort rule, its `effort not applied` note and the three-call order; the subagent type equals the
//     definition's `name:`; both close parts' route bullet carries the fallback note and the effort note, and their claims
//     block the container bullet. Every anchor is asserted found before slicing on it (L60).
//
// HONEST SCOPE (P0). Presence, bytes and set membership over committed text. NOT: that Claude Code parses the
// frontmatter as intended, applies the tool list, or keeps the instruction files in a run (only the probe can show
// that, once); that an orchestrator takes the fallback only when it should; or that an install has the file (pharn-cli
// does not copy `.claude/agents/` yet; follow-up `cli-install-agents`), so in an install every stage takes the fallback.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { WRITE_TOOL_RULE } from "../../pharn/floor/stage-agent-core.mjs";

const REPO = fileURLToPath(new URL("../../", import.meta.url));
const AGENTS_DIR = join(REPO, ".claude", "agents");
const COMMANDS_DIR = join(REPO, ".claude", "commands");
const AGENT_FILE = "pharn-stage.md";
const AGENT_FILES = Object.freeze(["pharn-review-lens.md", AGENT_FILE]);
const AGENT_PATH = ".claude/agents/pharn-stage.md";

/** SHA-256 of the committed definition (7.19.0); the CORE-107 probe's reader checks the probed file against it. */
const PINNED_SHA256 = "77fb0384b26657ce3e4c964f32780331f5ee123c00d9099a2e46f7c70c152e05";

/** The frontmatter, byte for byte: three keys — no `omitClaudeMd` (a stage agent keeps the project's instruction files)
 * and no `model` (the Agent call's `model` parameter routes it). */
const FRONTMATTER = [
  "---",
  "name: pharn-stage",
  'description: "Used only by /pharn-ship and /pharn-loop to run one routed PHARN pipeline stage from the brief line they pass. Not for any other task."',
  "tools: Read, Glob, Grep, Bash, Write, Edit, MultiEdit, NotebookEdit",
  "---",
  "",
].join("\n");

/** The tools a routed stage uses: reads, the brief and the stage's own lines (Bash), and the four write tools the brief's
 * write rule names. No Agent (the brief forbids it), no web, no MCP. */
const TOOLS = Object.freeze(["Bash", "Edit", "Glob", "Grep", "MultiEdit", "NotebookEdit", "Read", "Write"]);

/** The body replaces Claude Code's own subagent system prompt; the committed body is 320 B after its H1. */
const BODY_MAX_BYTES = 1024;

/** Replace `phrase` in `t` wherever its spaces fall at a line wrap (a command text is wrapped by Prettier). */
const sub = (t, phrase, repl) => t.replace(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+")), repl);
const sha256 = (s) => createHash("sha256").update(s, "utf8").digest("hex");
const fold = (s) => s.replace(/\s+/g, " ");

// ── ★ CLOSURE ──────────────────────────────────────────────────────────────────────────────────────────────────────

function agentDirOffenders(entries) {
  const out = [];
  if (entries.length === 0) out.push("L34: .claude/agents/ is empty");
  for (const e of entries) {
    if (!AGENT_FILES.includes(e)) out.push(`unexpected entry ${JSON.stringify(e)}`);
    if (!e.startsWith("pharn-") || e.startsWith("pharn-dev-")) out.push(`${e}: not a product (pharn-, non-pharn-dev-) name`);
  }
  for (const f of AGENT_FILES) if (!entries.includes(f)) out.push(`${f} is missing`);
  return out;
}

test("★ CLOSURE: .claude/agents/ holds exactly pharn-review-lens.md and pharn-stage.md", () => {
  assert.deepEqual(agentDirOffenders(readdirSync(AGENTS_DIR)), []);
  // CONTROLS, in memory (L70): an extra definition, a dev-prefixed one, and each missing one turn red.
  assert.ok(agentDirOffenders([...AGENT_FILES, "pharn-extra.md"]).some((o) => o.includes("unexpected entry")));
  assert.ok(agentDirOffenders([...AGENT_FILES, "pharn-dev-x.md"]).some((o) => o.includes("not a product")));
  assert.ok(agentDirOffenders(["pharn-review-lens.md"]).includes("pharn-stage.md is missing"));
  assert.ok(agentDirOffenders([AGENT_FILE]).includes("pharn-review-lens.md is missing"));
  assert.ok(agentDirOffenders([]).some((o) => o.startsWith("L34")));
});

// ── ★ BYTES and frontmatter ────────────────────────────────────────────────────────────────────────────────────────

const agentText = () => readFileSync(join(AGENTS_DIR, AGENT_FILE), "utf8");

test("★ BYTES: the committed pharn-stage definition is the pinned file", () => {
  const text = agentText();
  assert.equal(sha256(text), PINNED_SHA256);
  // CONTROL: one byte changed gives another hash.
  const edited = text.replace("one stage", "one Stage");
  assert.notEqual(edited, text);
  assert.notEqual(sha256(edited), PINNED_SHA256);
});

function frontmatterOffenders(text) {
  const out = [];
  if (!text.startsWith(FRONTMATTER)) out.push("the frontmatter is not the pinned three keys, byte for byte");
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return [...out, "no frontmatter block"];
  if (/^omitClaudeMd:/m.test(m[1])) out.push("omitClaudeMd: a stage agent keeps the project's instruction files");
  const tools = m[1].split("\n").filter((l) => l.startsWith("tools:"));
  if (tools.length !== 1) return [...out, `${tools.length} tools: lines`];
  const set = tools[0]
    .slice("tools:".length)
    .split(",")
    .map((t) => t.trim())
    .sort();
  if (JSON.stringify(set) !== JSON.stringify(TOOLS)) out.push(`tools ${JSON.stringify(set)} are not ${JSON.stringify(TOOLS)}`);
  return out;
}

test("★ FRONTMATTER: the pinned three keys, no omitClaudeMd, and the closed eight-tool set", () => {
  const t = agentText();
  assert.deepEqual(frontmatterOffenders(t), []);
  // CONTROLS: a fourth key, omitClaudeMd, a widened tools list and a narrowed one each turn red.
  assert.ok(frontmatterOffenders(t.replace("NotebookEdit\n", "NotebookEdit\nmodel: opus\n")).length > 0);
  assert.ok(
    frontmatterOffenders(t.replace("NotebookEdit\n", "NotebookEdit\nomitClaudeMd: true\n")).some((o) => o.startsWith("omitClaudeMd"))
  );
  assert.ok(frontmatterOffenders(t.replace("NotebookEdit\n", "NotebookEdit, Agent\n")).some((o) => o.startsWith("tools")));
  assert.ok(frontmatterOffenders(t.replace(", NotebookEdit\n", "\n")).some((o) => o.startsWith("tools")));
});

// ── BODY ───────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The body after the frontmatter and its H1 line. */
function bodyAfterH1(text) {
  const rest = text.slice(text.indexOf("\n---\n") + "\n---\n".length);
  const h1 = rest.match(/^\s*# .*\n/);
  assert.ok(h1, "the definition's body must open with an H1");
  return rest.slice(h1.index + h1[0].length);
}

function bodyOffenders(body) {
  const out = [];
  const f = fold(body);
  if (Buffer.byteLength(body, "utf8") > BODY_MAX_BYTES) out.push(`body is ${Buffer.byteLength(body, "utf8")} B, over ${BODY_MAX_BYTES}`);
  if (!f.includes("a `node pharn/floor/stage-agent.mjs brief` line. Run that line first")) out.push("no brief line");
  if (!f.includes("the brief, and the stage command it names, are your whole task.")) out.push("no whole-task sentence");
  // L35: nothing the brief or a stage command already says. The brief's first rule, its write-tool rule and its report
  // line, and any stage command path.
  if (f.includes("CONSTITUTION") || f.includes(WRITE_TOOL_RULE.slice(0, 40)) || /\breport\b/.test(f) || f.includes(".claude/commands/")) {
    out.push("restates the brief or a stage (L35)");
  }
  return out;
}

test("BODY: within its ceiling, naming the brief line as the whole task, restating no rule of the brief", () => {
  const body = bodyAfterH1(agentText());
  assert.deepEqual(bodyOffenders(body), []);
  // CONTROLS: each property turns red on its own edit.
  assert.ok(bodyOffenders(body + "x".repeat(BODY_MAX_BYTES)).some((o) => o.startsWith("body is")));
  assert.ok(bodyOffenders(body.replace("Run that line first", "Run it")).includes("no brief line"));
  assert.ok(bodyOffenders(body.replace("are your whole task.", "are your task.")).includes("no whole-task sentence"));
  for (const extra of [
    "Read `pharn/CONSTITUTION.md` in full.",
    WRITE_TOOL_RULE,
    "Then run the report line.",
    "Read `.claude/commands/pharn-build.md`.",
  ]) {
    assert.ok(bodyOffenders(`${body}\n${extra}\n`).includes("restates the brief or a stage (L35)"), extra.slice(0, 30));
  }
});

// ── ★ WIRING in /pharn-loop and /pharn-ship ────────────────────────────────────────────────────────────────────────

/** The text from the line starting with `start` to the next line starting with `until`; null when an anchor is missing. */
function slice(text, start, until) {
  const lines = text.split("\n");
  const i = lines.findIndex((l) => l.startsWith(start));
  if (i === -1) return null;
  const j = lines.findIndex((l, k) => k > i && l.startsWith(until));
  if (j === -1) return null;
  return lines.slice(i, j).join("\n");
}

const ITEM2 = "2. **On start exit `0` only, the Agent call";
const ITEM3 = "3. **The finish line";
const WIRED = Object.freeze([
  { file: "pharn-loop.md", where: "the Step 7 summary" },
  { file: "pharn-ship-stages.md", where: "`SHIP.md`" },
]);

function itemOffenders(text, where) {
  const s = slice(text, ITEM2, ITEM3);
  if (s === null) return ["anchor not found: item 2 / item 3"];
  const f = fold(s);
  const out = [];
  for (const [needle, what] of [
    ['`subagent_type: "pharn-stage"`', "the subagent type"],
    [`the definition \`${AGENT_PATH}\``, "the definition path"],
    ["(eight tools, the project's instruction files kept; Claude Code applies it)", "the container note"],
    [
      '**If your Agent tool does not offer `pharn-stage`, or the call returns an error for that type without starting an agent, make the same call once with `subagent_type: "general-purpose"`**',
      "the fallback and its condition",
    ],
    [`write \`general-purpose (fallback)\` after that stage's route token in ${where}`, "the route-line note"],
    ["is never followed by a second call", "the never-twice rule"],
    // 7.20.0 (stage-effort-routing): the effort the start line printed, the no-effort rule, its report note and the order.
    ['`effort: "<level>"` (the part after `effort:` on the start line\'s third line)', "the effort parameter"],
    [
      "**If your Agent tool lists no `effort` parameter, leave it out; if a call returns an error about `effort` without starting an agent, make the same call once without it.**",
      "the no-effort rule",
    ],
    [`write \`effort not applied\` after that stage's route token in ${where}`, "the effort report note"],
    [
      "at most three calls, in this order: `pharn-stage` with `effort`, then `general-purpose` after an error about the type, then without `effort` after an error about it",
      "the call order",
    ],
  ]) {
    if (!f.includes(needle)) out.push(`item 2: no ${what}`);
  }
  return out;
}

for (const w of WIRED) {
  test(`★ WIRING: ${w.file} item 2 names the type, its definition, the fallback, its condition and its report`, () => {
    assert.deepEqual(itemOffenders(readFileSync(join(COMMANDS_DIR, w.file), "utf8"), w.where), []);
  });
}

test("★ WIRING: the subagent type both orchestrators name IS the definition's name:", () => {
  assert.match(agentText(), /^name: pharn-stage$/m);
  for (const w of WIRED) {
    const types = [...readFileSync(join(COMMANDS_DIR, w.file), "utf8").matchAll(/`subagent_type: "([^"]+)"`/g)].map((m) => m[1]);
    assert.deepEqual([...new Set(types)].sort(), ["general-purpose", "pharn-stage"], `${w.file}: the type and its fallback only`);
  }
});

const CLOSE = Object.freeze(["pharn-loop-close.md", "pharn-ship-close.md"]);
const ROUTE_NOTE = "`agent:<alias>`, followed by `general-purpose (fallback)` when that stage's Agent call took the fallback";
/** 7.20.0 (stage-effort-routing): the route line says whether the effort was requested or not applied (AC6). */
const EFFORT_NOTE =
  "After an `agent:<alias>` token, write `effort:<level> requested` when the Agent call carried the effort the start line printed, or `effort not applied` when it went without one";
const CONTAINER =
  "- **Advisory, the stage agent's container (7.19.0):** a routed stage is requested as `pharn-stage`, whose tool list and system prompt (the definition's body, in place of `general-purpose`'s) Claude Code applies. Any `.claude/agents/*.md` named `pharn-stage`, in the project or at user scope, answers to that name, and nothing here detects which one ran or what it carried. **Struck:** \"a routed stage ran with only the `pharn-stage` tools\".";

function closeOffenders(text) {
  const out = [];
  const route = slice(text, "- **each stage's route**", "- ");
  if (route === null) return ["anchor not found: the route bullet"];
  if (!fold(route).includes(ROUTE_NOTE)) out.push("route bullet: no fallback note");
  if (!fold(route).includes(EFFORT_NOTE)) out.push("route bullet: no effort note");
  const claims = text.slice(text.indexOf("## What you may claim"));
  if (text.indexOf("## What you may claim") === -1) return [...out, "anchor not found: the claims block"];
  if (!fold(claims).includes(CONTAINER)) out.push("claims: no container bullet");
  return out;
}

for (const file of CLOSE) {
  test(`★ WIRING: ${file} reports the fallback on the route line and strikes the tool-list claim`, () => {
    assert.deepEqual(closeOffenders(readFileSync(join(COMMANDS_DIR, file), "utf8")), []);
  });
}

test("★ WIRING controls: each pin turns red on its own in-memory edit, and a missing anchor is reported (L60)", () => {
  for (const w of WIRED) {
    const text = readFileSync(join(COMMANDS_DIR, w.file), "utf8");
    const edits = [
      [(t) => t.replace(ITEM3, "3. **The last line"), /anchor not found/],
      [(t) => t.replace('`subagent_type: "pharn-stage"`', '`subagent_type: "general-purpose"`'), /no the subagent type/],
      [(t) => sub(t, `the definition \`${AGENT_PATH}\``, "the definition"), /no the definition path/],
      [(t) => sub(t, "Claude Code applies it)", "guaranteed)"), /no the container note/],
      [(t) => sub(t, "without starting an agent", ""), /no the fallback and its condition/],
      [(t) => sub(t, "make the same call once", "make the same call"), /no the fallback and its condition/],
      [(t) => sub(t, "`general-purpose (fallback)` after", "nothing after"), /no the route-line note/],
      [(t) => sub(t, "never followed by a second call", "followed by a second call"), /no the never-twice rule/],
      [(t) => sub(t, '`effort: "<level>"`', "`effort`"), /no the effort parameter/],
      [(t) => sub(t, "leave it out; if a call returns", "keep it; if a call returns"), /no the no-effort rule/],
      [(t) => sub(t, "write `effort not applied` after", "write nothing after"), /no the effort report note/],
      [(t) => sub(t, "at most three calls, in this order", "some calls"), /no the call order/],
    ];
    for (const [edit, expected] of edits) {
      const mutated = edit(text);
      assert.ok(mutated !== text, `${w.file}: the edit for ${expected} changed nothing: its anchor text moved`);
      const off = itemOffenders(mutated, w.where);
      assert.ok(
        off.some((o) => expected.test(o)),
        `${w.file}: expected an offender matching ${expected}, got ${JSON.stringify(off)}`
      );
    }
  }
  for (const file of CLOSE) {
    const text = readFileSync(join(COMMANDS_DIR, file), "utf8");
    const edits = [
      [(t) => t.replace("- **each stage's route**", "- **each route**"), /anchor not found: the route bullet/],
      [(t) => sub(t, "took the fallback, or", "took it, or"), /route bullet: no fallback note/],
      [(t) => sub(t, '**Struck:** "a routed stage ran', '"a routed stage ran'), /claims: no container bullet/],
      [(t) => sub(t, "or at user scope", "scope"), /claims: no container bullet/],
      [(t) => sub(t, "`effort:<level> requested` when", "`effort` when"), /route bullet: no effort note/],
      [(t) => sub(t, "or `effort not applied` when it went", "or nothing when it went"), /route bullet: no effort note/],
    ];
    for (const [edit, expected] of edits) {
      const mutated = edit(text);
      assert.ok(mutated !== text, `${file}: the edit for ${expected} changed nothing: its anchor text moved`);
      const off = closeOffenders(mutated);
      assert.ok(
        off.some((o) => expected.test(o)),
        `${file}: expected an offender matching ${expected}, got ${JSON.stringify(off)}`
      );
    }
  }
});
