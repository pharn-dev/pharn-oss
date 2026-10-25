// .dev/floor/stage-load-budget.test.mjs — THE STAGE LOAD BUDGET (stage-load-budget, review finding CTX-2, 2026-10-12).
//
// WHAT IT BOUNDS. `COMMAND_BYTE_CEILINGS` (`.dev/floor/command-hygiene.test.mjs`, "THE COMMAND BUDGET") caps each product
// command FILE. A stage also reads files its text names — the trusted docs, contracts, the capabilities it applies — and
// an orchestrator runs some stages inline. None of those bytes had a ceiling: a griller, a lens, a contract or a trusted
// doc could grow, and a new "Read `X`" step could be added, with every gate green. This file budgets each product
// stage's LOAD SET:
//   1. the stage's command family — its file and every part whose `part_of:` names it (all modes: the worst case);
//   2. every PHARN-shipped file a step of that family tells the model to read, load or follow — the entries of
//      STAGE_LOADS below, each anchored by its path (or its membership counter's file name) in the family's text;
//   3. the capabilities the stage applies, by the membership the command itself runs (count-grillers.mjs,
//      count-lenses.mjs) — every registered member, so an install that selects fewer is under the number;
//   4. for an orchestrator, the load set of every stage its `ROUTE_POLICY` row (pharn/floor/stage-agent-core.mjs)
//      marks `interactive` in any mode — that stage's command runs in the orchestrator's own context (one level: the
//      policy's keys are the orchestrators, and no stage is one).
// Each path counts once per stage; bytes are UTF-8 after folding `\r\n` to `\n` (what the repository holds).
//
// The rules, each a function over plain data so its negative control runs the SAME predicate on a mutated copy (L60):
//   L1 closure — the product stages on disk (`pharn-*.md` minus `pharn-dev-*` minus parts, parts read from their
//      `part_of:` frontmatter by command-family.mjs) EQUAL the keys of STAGE_LOADS and of STAGE_LOAD_CEILINGS: non-empty,
//      no stage without a row, no row without a stage (L29, L34, L36).
//   L2 existence — every listed path is a regular file; every membership counter exits 0 with at least one member, and
//      each member is a regular file.
//   L3 anchor — every listed path appears in its stage's family text (frontmatter removed, whitespace folded); a
//      membership entry's counter file name appears there.
//   L4 budget — each stage's total is at most its ceiling.
//   L5 read closure — every READ_RE match in a family names a path inside that stage's load set.
//   L6 inline derivation — the inline stages are read from ROUTE_POLICY, never listed here.
// The CI wiring of this repo's instruction-growth check, added by the same increment, is pinned in
// `.dev/floor/instruction-growth-wiring.test.mjs` (a different reason to change: ci.yml and package.json).
//
// THE CEILINGS ARE MEASURED, never chosen — the COMMAND_BYTE_CEILINGS rule, applied unchanged: measured total + 10%,
// rounded up to the next multiple of 512. RAISING ONE IS A DELIBERATE, VISIBLE DIFF in the PR that needs it; the L1, L3,
// L4 and L5 failure messages name the table and the row to add, edit or raise (L2's names the row; L6's names the cell).
//
// ── Honest scope (P0) ─────────────────────────────────────────────────────────────────────────────────────────────────
// FLOOR (what a green run means): over THIS TABLE's classification, every product stage has a row, every listed file
//   exists and is named in its stage's text, no stage's total exceeds its ceiling, and no READ_RE phrasing in a family
//   names a PHARN file outside that stage's set. The totals are byte counts; the classification is a human-reviewed table.
// NOT guaranteed, and never claimed:
//   - that the table matches what a model reads. A model may read more (a `reads:` target, a contract a step only CITES,
//     a part again after compaction) or less (fewer grillers selected, a step skipped). The ceiling bounds the bytes
//     PHARN's text instructs, never the bytes a run loads;
//   - growth inside the headroom: a row grows by up to its 10% (26-34 KB on the grill and review rows) with no red;
//   - contexts: one stage's distinct bytes only — the Constitution in each of up to 11 lens-group subagents (22 when
//     the family map is unusable), a lens group's lens files read in one context, a part re-read
//     after a compaction, the harness prefix and the project's own files (SPEC, PLAN, canon, code, CLAUDE.md, installed
//     SKILL.md files) are outside the number, and an `agent` stage that falls back inline adds its own row's set;
//   - L5's reach: READ_RE sees only a read / re-read / follow / load verb, an optional `the`, then a backticked
//     `pharn/…` or `.claude/commands/…` path ending `.md`. An indirect reference ("Read the contract", "Read that file",
//     "each registered griller"), an unbackticked path, another verb, or a file a step reaches through a CLI's output is
//     not seen — review holds those;
//   - that a path counts once through loadSet itself: L4's dedupe control exercises a Set, not loadSet, so a loadSet
//     rewritten to an array would double-count a shared file and could stay under its ceiling. That error only
//     over-counts (the safe direction); a known residual, kept at stage-load-budget's GATE 2.
// The `pharn-dev-*` commands are outside this budget. Since 6.70.0 each one's FILE has a byte ceiling in
// COMMAND_BYTE_CEILINGS; their load sets are not budgeted (follow-up `dev-command-slim`).

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { POLICY_INLINE, ROUTE_POLICY } from "../../pharn/floor/stage-agent-core.mjs";
import { allParts, commandParts, withoutFrontmatter } from "./command-family.mjs";

const REPO = fileURLToPath(new URL("../../", import.meta.url));
const COMMANDS_REL = ".claude/commands";
const COMMANDS_DIR = join(REPO, COMMANDS_REL);
const SELF = ".dev/floor/stage-load-budget.test.mjs";
const INLINE_CELL = "interactive";

const CONSTITUTION = "pharn/CONSTITUTION.md";
// Counted WHOLE: the text asks for one section, but the Read tool reads files (CTX-10).
const ARCHITECTURE = "pharn/ARCHITECTURE.md";
// `mode: select` of the installed-skills catalogue: "read `…installed-skill-selection.md` and follow it".
const SKILL_SELECTION = "pharn/pharn-core/installed-skill-selection/installed-skill-selection.md";
const GRILLERS = Object.freeze({ members: "pharn/floor/count-grillers.mjs", key: "grillers" });
const LENSES = Object.freeze({ members: "pharn/floor/count-lenses.mjs", key: "lenses" });

/**
 * Per product stage: the PHARN-shipped files (beyond its command family) a step tells the model to read, load or
 * follow in full, and the capability memberships it applies. A file a step only CITES (an owner of bounds, a shape) is
 * not listed. Adding a "Read `<path>`" step means adding its row here (L5 says which).
 */
const STAGE_LOADS = Object.freeze({
  "pharn-build": Object.freeze([
    CONSTITUTION,
    ARCHITECTURE, // trusted prefix: "Read the `pharn/ARCHITECTURE.md §6` build-stage row"
    SKILL_SELECTION, // Step 2b, `mode: select`
    "pharn/pharn-core/seam-resolver/seam-resolver.md", // Step 2c item 2: "follow `…seam-resolver.md`"
  ]),
  "pharn-grill": Object.freeze([
    CONSTITUTION,
    ARCHITECTURE, // trusted prefix: the §6 grill-stage row
    "pharn/pharn-contracts/finding-shape.md", // Step 1.3: "Read `…finding-shape.md` so your … output conforms"
    SKILL_SELECTION, // Step 3, `select`
    GRILLERS, // Step 3b: "Run each registered griller … apply its procedure inline"
  ]),
  "pharn-loop": Object.freeze([
    CONSTITUTION,
    "pharn/pharn-contracts/loop-record.md", // close part: "Read the contract and follow its canonical template"
  ]),
  "pharn-memory-promote": Object.freeze([
    CONSTITUTION,
    ARCHITECTURE, // trusted prefix: "Read the `pharn/ARCHITECTURE.md §5` promotion contract"
  ]),
  "pharn-plan": Object.freeze([
    CONSTITUTION,
    ARCHITECTURE, // trusted prefix: the §6 plan-stage row
  ]),
  "pharn-regress": Object.freeze([CONSTITUTION]),
  "pharn-review": Object.freeze([
    CONSTITUTION,
    SKILL_SELECTION, // Step 4 (each lens-group subagent), `select`
    ".claude/agents/pharn-review-lens.md", // Step 4: `subagent_type: pharn-review-lens`, each group's system prompt
    LENSES, // Step 4: one subagent per family group, each reading its lenses' files
  ]),
  "pharn-ship": Object.freeze([CONSTITUTION]), // + /pharn-spec's set, inline by ROUTE_POLICY (`interactive`)
  "pharn-spec": Object.freeze([
    CONSTITUTION,
    ARCHITECTURE, // trusted prefix: the §6 spec-stage row
    "pharn/pharn-contracts/templates/spec-template.md", // the default template `check-spec.mjs --template-path` prints: "Read that file"
  ]),
  "pharn-test": Object.freeze([CONSTITUTION]),
  "pharn-verify": Object.freeze([CONSTITUTION]),
});

// Measured at stage-load-budget's build (main 8fe73d1, SKILLS_VERSION 6.58.0); each ceiling is the measured total + 10%,
// rounded up to the next multiple of 512. The measured total is in each comment.
const STAGE_LOAD_CEILINGS = Object.freeze({
  "pharn-build": 77824, // 70,669
  "pharn-grill": 285184, // 258,995 — 13 grillers (188,978)
  "pharn-loop": 151040, // 136,903 — re-measured at 6.67.0 (loop-grant-seam-skill, after merging 6.66.0)
  "pharn-memory-promote": 62976, // 56,925
  "pharn-plan": 61440, // 55,565
  "pharn-regress": 34304, // 30,738
  "pharn-review": 375808, // 341,324 — 22 lenses
  "pharn-ship": 162816, // 147,718 — with /pharn-spec inline
  "pharn-spec": 70144, // 63,344
  "pharn-test": 31232, // 28,046
  "pharn-verify": 29696, // 26,940
});

/**
 * A read / re-read / follow / load verb, an optional `the`, then a backticked PHARN-shipped markdown path (under `pharn/`
 * or `.claude/commands/`) — matched over text whose whitespace and blockquote markers are folded, so a wrapped line
 * still matches. The project's own files under `pharn/` (PROJECT_ARTIFACTS) are skipped by readClosureOffenders.
 */
const READ_RE = /\b(?:re-read|read|follow|load)\s+(?:the\s+)?`((?:pharn\/|\.claude\/commands\/)[^`\s]*?\.md)(?=[`\s])/gi;
// The PROJECT's own files that live under pharn/ — never PHARN-shipped, so never in a load set. 7.0.0 added the last three
// (pharn-footprint-move: canon, runtime scratch and the project SPEC template moved under pharn/).
const PROJECT_ARTIFACTS = Object.freeze(["pharn/features/", "pharn/memory-bank/", "pharn/.run/", "pharn/spec-template.md"]);

// ── helpers ───────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The product stages on disk: `pharn-*.md` minus `pharn-dev-*` minus parts (parts from `part_of:`), as stems, sorted. */
function productStages(dir = COMMANDS_DIR) {
  const parts = new Set(allParts(dir).map((p) => p.file));
  return readdirSync(dir)
    .filter((f) => /^pharn-.+\.md$/.test(f) && !f.startsWith("pharn-dev-") && !parts.has(f))
    .map((f) => f.replace(/\.md$/, ""))
    .sort();
}

/** A stage's command family as repo-relative paths: its file, then its parts. */
function familyPaths(stage, dir = COMMANDS_DIR) {
  const file = `${stage}.md`;
  return [file, ...commandParts(dir, file).map((p) => p.file)].map((f) => `${COMMANDS_REL}/${f}`);
}

/** Folds what a wrap can put between two words: line breaks, indentation, and a blockquote's leading `>`. */
function fold(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n[ \t]*>[ \t]?/g, "\n")
    .replace(/\s+/g, " ");
}

/** A stage's family text: each file without its frontmatter, joined, folded. */
function familyText(stage) {
  return fold(
    familyPaths(stage)
      .map((p) => withoutFrontmatter(readFileSync(join(REPO, p), "utf8")))
      .join("\n")
  );
}

/** The bytes the repository holds for a repo-relative file. */
function fileBytes(rel) {
  return Buffer.byteLength(readFileSync(join(REPO, rel), "utf8").replace(/\r\n/g, "\n"), "utf8");
}

function isRegularFile(rel) {
  try {
    return lstatSync(join(REPO, rel)).isFile();
  } catch {
    return false;
  }
}

const memberCache = new Map();
/** Runs a shipped membership counter over the repository: {ok, members[], reason}. */
function runMembers(entry) {
  if (memberCache.has(entry.members)) return memberCache.get(entry.members);
  const r = spawnSync(process.execPath, [join(REPO, entry.members), "."], { cwd: REPO, encoding: "utf8" });
  let out;
  if (r.status !== 0) out = { ok: false, members: [], reason: `exit ${r.status}: ${(r.stderr || "").split("\n")[0]}` };
  else {
    try {
      const doc = JSON.parse(r.stdout);
      const list = doc[entry.key];
      out = Array.isArray(list) ? { ok: true, members: list } : { ok: false, members: [], reason: `no "${entry.key}" array` };
    } catch {
      out = { ok: false, members: [], reason: "stdout is not JSON" };
    }
  }
  memberCache.set(entry.members, out);
  return out;
}

/** An entry's anchor: a path is anchored by itself, a membership entry by its counter's file name. */
const anchorOf = (entry) => (typeof entry === "string" ? entry : basename(entry.members));
const describe = (entry) => (typeof entry === "string" ? JSON.stringify(entry) : `{ members: ${JSON.stringify(entry.members)} }`);

/** The stages a ROUTE_POLICY row runs inline (`interactive` in any mode), sorted; [] for a command with no row. */
function inlineStages(command, policy = ROUTE_POLICY) {
  if (!Object.hasOwn(policy, command)) return [];
  const out = new Set();
  for (const mode of Object.values(policy[command]))
    for (const [stage, cell] of Object.entries(mode)) if (cell === INLINE_CELL) out.add(stage);
  return [...out].sort();
}

/** A stage's own load: its family, its listed paths, its members. */
function ownLoad(stage, { loads = STAGE_LOADS, members = runMembers } = {}) {
  const out = [...familyPaths(stage)];
  for (const entry of loads[stage] ?? []) {
    if (typeof entry === "string") out.push(entry);
    else out.push(...members(entry).members);
  }
  return out;
}

/** A stage's load set: its own load plus the own load of every stage its policy row runs inline. */
function loadSet(stage, { loads = STAGE_LOADS, policy = ROUTE_POLICY, members = runMembers } = {}) {
  const set = new Set(ownLoad(stage, { loads, members }));
  for (const inline of inlineStages(stage, policy)) for (const p of ownLoad(inline, { loads, members })) set.add(p);
  return set;
}

const total = (set, bytesOf = fileBytes) => [...set].reduce((n, p) => n + bytesOf(p), 0);
const ceilingFor = (bytes) => Math.ceil((bytes * 1.1) / 512) * 512;

// ── the rules (each returns offenders; [] is green) ───────────────────────────────────────────────────────────────────

/** L1 — the stages on disk vs a table's keys, both ways; an empty set is never a vacuous pass. */
function closureOffenders(onDisk, table, name) {
  const out = [];
  if (onDisk.length === 0) out.push("no product stage on disk — an empty set is never a vacuous pass");
  for (const s of onDisk) if (!Object.hasOwn(table, s)) out.push(`${s}: a product stage with no row — add ${name}["${s}"] in ${SELF}`);
  for (const k of Object.keys(table))
    if (!onDisk.includes(k)) out.push(`${name}["${k}"]: a row with no stage on disk — delete it from ${SELF}`);
  return out;
}

/** L2 — every listed path is a regular file; every membership counter yields at least one regular file. */
function existenceOffenders(loads, { isFile = isRegularFile, members = runMembers } = {}) {
  const out = [];
  for (const [stage, entries] of Object.entries(loads))
    for (const entry of entries) {
      if (typeof entry === "string") {
        if (!isFile(entry)) out.push(`STAGE_LOADS["${stage}"] lists ${describe(entry)}, which is not a regular file`);
        continue;
      }
      const r = members(entry);
      if (!r.ok) out.push(`STAGE_LOADS["${stage}"] ${describe(entry)}: the counter failed (${r.reason})`);
      else if (r.members.length === 0)
        out.push(`STAGE_LOADS["${stage}"] ${describe(entry)}: no members — an empty set is never a vacuous pass`);
      else
        for (const m of r.members)
          if (!isFile(m)) out.push(`STAGE_LOADS["${stage}"] ${describe(entry)}: member "${m}" is not a regular file`);
    }
  return out;
}

/** L3 — every entry's anchor appears in its stage's family text. */
function anchorOffenders(loads, textOf = familyText) {
  const out = [];
  for (const [stage, entries] of Object.entries(loads)) {
    const text = textOf(stage);
    for (const entry of entries)
      if (!text.includes(anchorOf(entry)))
        out.push(
          `STAGE_LOADS["${stage}"] in ${SELF} lists ${describe(entry)}, but no file of ${stage}'s command family names ` +
            `"${anchorOf(entry)}" — delete that entry, or change it to the file the command now tells the model to read, ` +
            `then re-measure STAGE_LOAD_CEILINGS["${stage}"]`
        );
  }
  return out;
}

/** L4 — a stage's total over its ceiling. */
function budgetOffender(stage, bytes, ceilings = STAGE_LOAD_CEILINGS) {
  if (bytes <= ceilings[stage]) return null;
  return (
    `${stage}: load set ${bytes} bytes > ceiling ${ceilings[stage]} — if the growth is intended, raise ` +
    `STAGE_LOAD_CEILINGS["${stage}"] in ${SELF} to ${ceilingFor(bytes)} (measured + 10%, rounded up to 512) as a ` +
    `visible diff in this PR`
  );
}

/** L5 — every READ_RE match in a stage's text names a path inside its load set (project artifacts excepted). */
function readClosureOffenders(stage, text, set) {
  const out = [];
  for (const m of text.matchAll(READ_RE)) {
    const path = m[1];
    if (PROJECT_ARTIFACTS.some((p) => path.startsWith(p)) || set.has(path)) continue;
    out.push(
      `${stage}'s command family says to read "${path}", which is not in its load set — add "${path}" to ` +
        `STAGE_LOADS["${stage}"] in ${SELF}, then re-measure STAGE_LOAD_CEILINGS["${stage}"] (measured + 10%, rounded ` +
        `up to 512)`
    );
  }
  return [...new Set(out)];
}

// ── L1–L6 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────

test("✧ LOAD L1: the product stages on disk equal STAGE_LOADS' and STAGE_LOAD_CEILINGS' keys", () => {
  const onDisk = productStages();
  assert.ok(onDisk.length > 0);
  assert.deepEqual(closureOffenders(onDisk, STAGE_LOADS, "STAGE_LOADS"), []);
  assert.deepEqual(closureOffenders(onDisk, STAGE_LOAD_CEILINGS, "STAGE_LOAD_CEILINGS"), []);
  // Parts are not stages: each is budgeted inside its command's family.
  for (const p of allParts(COMMANDS_DIR)) assert.ok(!onDisk.includes(p.file.replace(/\.md$/, "")), p.file);
  // CONTROLS (L60): a missing row, an extra row and an empty disk are each red.
  const [first, ...rest] = Object.keys(STAGE_LOADS);
  const missing = Object.fromEntries(rest.map((k) => [k, STAGE_LOADS[k]]));
  assert.deepEqual(closureOffenders(onDisk, missing, "STAGE_LOADS"), [
    `${first}: a product stage with no row — add STAGE_LOADS["${first}"] in ${SELF}`,
  ]);
  const extra = { ...STAGE_LOAD_CEILINGS, "pharn-extra": 512 };
  assert.deepEqual(closureOffenders(onDisk, extra, "STAGE_LOAD_CEILINGS"), [
    `STAGE_LOAD_CEILINGS["pharn-extra"]: a row with no stage on disk — delete it from ${SELF}`,
  ]);
  // An empty disk with an empty table is still red: the emptiness itself is the offender, not a row mismatch.
  assert.deepEqual(closureOffenders([], {}, "STAGE_LOADS"), ["no product stage on disk — an empty set is never a vacuous pass"]);
});

test("✧ LOAD L2: every listed file exists, and every membership counter yields at least one existing member", () => {
  assert.deepEqual(existenceOffenders(STAGE_LOADS), []);
  for (const entry of [GRILLERS, LENSES]) assert.ok(runMembers(entry).members.length > 0, entry.members);
  // Every stage's set holds its own command file (no stage is budgeted at zero).
  for (const s of productStages()) assert.ok(loadSet(s).has(`${COMMANDS_REL}/${s}.md`), s);
  // CONTROLS (L60): a missing file, a failing counter, an empty membership and a member that is not a file are each red.
  assert.deepEqual(existenceOffenders({ "pharn-x": ["pharn/nope.md"] }), [
    'STAGE_LOADS["pharn-x"] lists "pharn/nope.md", which is not a regular file',
  ]);
  const fake = { members: "pharn/floor/count-fake.mjs", key: "fakes" };
  assert.match(
    existenceOffenders({ "pharn-x": [fake] }, { members: () => ({ ok: false, members: [], reason: "exit 2" }) })[0],
    /the counter failed \(exit 2\)/
  );
  assert.match(
    existenceOffenders({ "pharn-x": [fake] }, { members: () => ({ ok: true, members: [] }) })[0],
    /no members — an empty set is never a vacuous pass/
  );
  assert.match(
    existenceOffenders({ "pharn-x": [fake] }, { members: () => ({ ok: true, members: ["pharn/nope.md"] }) })[0],
    /member "pharn\/nope\.md" is not a regular file/
  );
});

test("✧ LOAD L3: every listed file (or membership counter) is named in its stage's command text", () => {
  assert.deepEqual(anchorOffenders(STAGE_LOADS), []);
  // CONTROL (L60): the real grill text with the finding-shape path removed is red, and the message names the row.
  const grill = familyText("pharn-grill");
  const stripped = (stage) =>
    stage === "pharn-grill" ? grill.split("pharn/pharn-contracts/finding-shape.md").join("") : familyText(stage);
  const offenders = anchorOffenders({ "pharn-grill": STAGE_LOADS["pharn-grill"] }, stripped);
  assert.equal(offenders.length, 1);
  assert.match(
    offenders[0],
    /^STAGE_LOADS\["pharn-grill"\] in \.dev\/floor\/stage-load-budget\.test\.mjs lists "pharn\/pharn-contracts\/finding-shape\.md"/
  );
  assert.match(offenders[0], /re-measure STAGE_LOAD_CEILINGS\["pharn-grill"\]$/);
  // A membership entry is anchored by its counter's file name.
  const noCounter = () => grill.split("count-grillers.mjs").join("");
  assert.match(anchorOffenders({ "pharn-grill": [GRILLERS] }, noCounter)[0], /"count-grillers\.mjs"/);
});

test("✧ LOAD L4: every product stage's load set is within its measured ceiling", () => {
  const offenders = productStages()
    .map((s) => budgetOffender(s, total(loadSet(s))))
    .filter(Boolean);
  assert.deepEqual(offenders, [], "raise a ceiling only as a deliberate, visible diff to STAGE_LOAD_CEILINGS");
  // CONTROL (L60): the real grill total one byte over its ceiling is red, and the message names the raise.
  const ceiling = STAGE_LOAD_CEILINGS["pharn-grill"];
  assert.equal(budgetOffender("pharn-grill", ceiling), null);
  assert.equal(
    budgetOffender("pharn-grill", ceiling + 1),
    `pharn-grill: load set ${ceiling + 1} bytes > ceiling ${ceiling} — if the growth is intended, raise ` +
      `STAGE_LOAD_CEILINGS["pharn-grill"] in ${SELF} to ${ceilingFor(ceiling + 1)} (measured + 10%, rounded up to 512) as ` +
      `a visible diff in this PR`
  );
  // Each path counts once: a set, so a file named by two entries (or by a stage and its inline stage) is one load.
  assert.equal(
    total(new Set(["a", "a", "b"]), (p) => (p === "a" ? 10 : 1)),
    11
  );
  // A CRLF checkout measures what the repository holds.
  assert.equal(Buffer.byteLength("x\r\ny".replace(/\r\n/g, "\n")), 3);
});

test("✧ LOAD L5: every 'read / follow / load `pharn/…md`' phrasing names a file in its stage's load set", () => {
  const offenders = productStages().flatMap((s) => readClosureOffenders(s, familyText(s), loadSet(s)));
  assert.deepEqual(offenders, []);
  // CONTROLS (L60), one per verb and per fold: each phrasing of an unlisted contract is red, with the exact row to add.
  const set = loadSet("pharn-grill");
  const row = 'add "pharn/pharn-contracts/cost-ledger.md" to STAGE_LOADS["pharn-grill"] in .dev/floor/stage-load-budget.test.mjs';
  for (const phrase of [
    "Read `pharn/pharn-contracts/cost-ledger.md` in full.",
    "then re-read `pharn/pharn-contracts/cost-ledger.md`.",
    "follow `pharn/pharn-contracts/cost-ledger.md` (cited).",
    "Load the `pharn/pharn-contracts/cost-ledger.md §2` rules.",
    "Read\n   `pharn/pharn-contracts/cost-ledger.md` in full.",
    "> Read the\n> `pharn/pharn-contracts/cost-ledger.md` section.",
  ]) {
    const o = readClosureOffenders("pharn-grill", fold(`${familyText("pharn-grill")}\n${phrase}`), set);
    assert.equal(o.length, 1, phrase);
    assert.ok(o[0].includes(row), o[0]);
  }
  // A command file is a PHARN file too: inlining another stage's command is red until its row is added.
  assert.equal(
    readClosureOffenders("pharn-loop", fold("Read `.claude/commands/pharn-build.md` in full."), loadSet("pharn-loop")).length,
    1
  );
  // Not the rule's: a path only cited, the project's own artifacts, and paths outside PHARN's tree.
  for (const phrase of [
    "the shape `pharn/pharn-contracts/cost-ledger.md` defines",
    "Read `pharn/features/<name>/SPEC.md` live.",
    "Read `pharn/memory-bank/lessons-learned.md` in full.",
    "Read `pharn/pharn-contracts/cost-ledger.mdx`.",
  ])
    assert.deepEqual(readClosureOffenders("pharn-grill", fold(phrase), set), [], phrase);
  // A listed file is not an offender.
  assert.deepEqual(readClosureOffenders("pharn-grill", fold("Read `pharn/pharn-contracts/finding-shape.md`."), set), []);
});

test("✧ LOAD L6: an orchestrator's inline stages are read from ROUTE_POLICY, and their loads count in its set", () => {
  assert.ok(POLICY_INLINE.includes(INLINE_CELL), `ROUTE_POLICY no longer has the "${INLINE_CELL}" cell — re-derive inlineStages`);
  assert.deepEqual(inlineStages("pharn-ship"), ["pharn-spec"]);
  assert.deepEqual(inlineStages("pharn-loop"), []);
  assert.deepEqual(inlineStages("pharn-grill"), [], "a stage with no policy row runs nothing inline");
  const ship = loadSet("pharn-ship");
  for (const p of loadSet("pharn-spec")) assert.ok(ship.has(p), p);
  // CONTROL (L60): the same derivation over a policy whose spec cells are `agent` leaves /pharn-spec out.
  const routed = JSON.parse(JSON.stringify(ROUTE_POLICY));
  for (const mode of Object.values(routed["pharn-ship"])) mode["pharn-spec"] = "agent";
  assert.deepEqual(inlineStages("pharn-ship", routed), []);
  assert.ok(!loadSet("pharn-ship", { policy: routed }).has(`${COMMANDS_REL}/pharn-spec.md`));
});
