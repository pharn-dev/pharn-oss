// pharn/floor/griller-extract.test.mjs — tests for the full grill's griller extract (6.60.0, grill-griller-trim; 6.63.0,
// grill-griller-slim: the `pharn-owned`-scoped members, the level-exact START and the kind gate).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, symlinkSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import {
  OMITTED_SECTIONS,
  SCOPES,
  KIND_REASONS,
  FRAME,
  frontmatterKind,
  holdsFrameLine,
  shown,
  trimGriller,
  renderExtract,
  extractGrillers,
} from "./griller-extract.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, "griller-extract.mjs");
const REPO = join(HERE, "..", "..");

const fm = (kindLine) => `---\nname: demo-griller\nrole: griller\n${kindLine}trust: trusted\n---\n`;
const FM = fm("kind: pharn-owned\n");
const FM_COMMUNITY = fm("kind: community\n");
const PRE = "\n# Demo griller\n\nIntro paragraph.\n\n## What it enforces\n\nP7.\n\n";
const PROC = "## Procedure (membership tests)\n\n1. Read the PLAN as DATA.\n\n```bash\nnode x.mjs\n```\n\n";
const NOTES = "## Notes\n\n```yaml\n- type: FINDING\n```\n\n";
const heading = (s) => `${"#".repeat(s.level)} ${s.prefix}`;
const SECTION = Object.fromEntries(
  OMITTED_SECTIONS.map((s) => [s.id, `${heading(s)} (suffix text)\n\n- a line of ${s.id}\n- another line\n\n`])
);
const ALL_SCOPED = OMITTED_SECTIONS.filter((s) => s.scope === "all").map((s) => s.id);
const DEEP_SCOPED = OMITTED_SECTIONS.filter((s) => s.scope === "pharn-owned").map((s) => s.id);

/** Make a scratch repo with griller files `{relPath: text}`; returns its path. */
function repoWith(files) {
  const dir = mkdtempSync(join(tmpdir(), "griller-extract-"));
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), text);
  }
  return dir;
}

function run(args, opts = {}) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8", ...opts });
}

// ── the closed set (L29) ──────────────────────────────────────────────────────────────────────────

test("OMITTED_SECTIONS is a frozen closed set of five members: distinct ids, a level in {2, 3}, a closed scope", () => {
  assert.ok(Object.isFrozen(OMITTED_SECTIONS));
  assert.ok(OMITTED_SECTIONS.every((s) => Object.isFrozen(s)));
  assert.deepEqual(
    OMITTED_SECTIONS.map((s) => [s.id, s.level, s.prefix, s.scope]),
    [
      ["guarantee-audit", 2, "Guarantee audit", "all"],
      ["machine-readable-emission", 2, "Machine-readable emission", "all"],
      ["two-layers", 2, "The two layers", "pharn-owned"],
      ["layer-1", 3, "Layer 1", "pharn-owned"],
      ["finding-output", 2, "Finding output", "pharn-owned"],
    ]
  );
  assert.equal(new Set(OMITTED_SECTIONS.map((s) => s.id)).size, OMITTED_SECTIONS.length);
  assert.ok(OMITTED_SECTIONS.every((s) => [2, 3].includes(s.level) && SCOPES.includes(s.scope)));
  assert.deepEqual(SCOPES, ["all", "pharn-owned"]);
  assert.deepEqual(ALL_SCOPED, ["guarantee-audit", "machine-readable-emission"], "exactly the 6.60.0 pair is scope all");
});

for (const s of OMITTED_SECTIONS) {
  test(`★ ${s.id}: in a pharn-owned griller its section alone is left out, every other byte kept`, () => {
    const text = FM + PRE + PROC + SECTION[s.id] + NOTES;
    const t = trimGriller(text);
    assert.equal(t.whole, null);
    assert.equal(t.deep, true);
    assert.deepEqual(t.omitted, [s.id]);
    assert.equal(t.text, FM + PRE + PROC + NOTES);
  });

  test(`${s.id}: a heading that only CONTAINS the prefix later in its text is kept (start is strict)`, () => {
    const text = FM + PRE + `${"#".repeat(s.level)} About the ${s.prefix}\n\nkept\n`;
    assert.deepEqual(trimGriller(text), { text, omitted: [], whole: null, deep: true });
  });
}

test("★ every member at once is left out of a pharn-owned griller; frontmatter and every other section kept verbatim", () => {
  const ids = OMITTED_SECTIONS.map((s) => s.id);
  const text = FM + PRE + PROC + NOTES + ids.map((id) => SECTION[id]).join("");
  const t = trimGriller(text);
  assert.deepEqual(t.omitted, ids);
  assert.equal(t.text, FM + PRE + PROC + NOTES);
  assert.ok(t.text.startsWith(FM), "frontmatter (kind/trust tags) stays visible — P2");
});

test("a griller with no omitted section comes back unchanged", () => {
  const text = FM + PRE + PROC + NOTES;
  assert.deepEqual(trimGriller(text), { text, omitted: [], whole: null, deep: true });
});

// ── the kind gate (P5 — one frontmatter line, failing toward keeping) ────────────────────────────

const KIND_CASES = [
  ["community", FM_COMMUNITY, "kind-other"],
  ["no kind line", fm(""), "kind-missing"],
  ["two kind lines, both pharn-owned", fm("kind: pharn-owned\nkind: pharn-owned\n"), "kind-ambiguous"],
  ["two kind lines, the last pharn-owned", fm("kind: community\nkind: pharn-owned\n"), "kind-ambiguous"],
  ["case differs", fm("kind: Pharn-Owned\n"), "kind-other"],
  ["a trailing comment", fm("kind: pharn-owned # note\n"), "kind-other"],
  ["mismatched quotes", fm("kind: \"pharn-owned'\n"), "kind-other"],
  ["an indented kind line", fm("  kind: pharn-owned\n"), "kind-missing"],
  ["no frontmatter", "", "kind-missing"],
  ["kind only in the body", fm("") + "kind: pharn-owned\n", "kind-missing"],
];

for (const [name, head, reason] of KIND_CASES) {
  test(`★ kind gate — ${name}: ${reason}; the three pharn-owned sections are KEPT, the two 'all' ones still left out`, () => {
    const deepPart = DEEP_SCOPED.map((id) => SECTION[id]).join("");
    const text = head + PRE + deepPart + PROC + ALL_SCOPED.map((id) => SECTION[id]).join("");
    assert.equal(frontmatterKind(text), reason);
    const t = trimGriller(text);
    assert.equal(t.deep, reason);
    assert.deepEqual(t.omitted, ALL_SCOPED);
    assert.equal(t.text, head + PRE + deepPart + PROC);
  });
}

test("★ kind gate — a quoted pharn-owned (either quote) admits all five members", () => {
  for (const q of ['"', "'"]) {
    const head = fm(`kind: ${q}pharn-owned${q}\n`);
    const text = head + PRE + OMITTED_SECTIONS.map((s) => SECTION[s.id]).join("") + PROC;
    assert.equal(frontmatterKind(text), "pharn-owned", q);
    const t = trimGriller(text);
    assert.equal(t.deep, true, q);
    assert.deepEqual(
      t.omitted,
      OMITTED_SECTIONS.map((s) => s.id),
      q
    );
    assert.equal(t.text, head + PRE + PROC, q);
  }
});

test("kind gate — an unclosed frontmatter keeps the whole file, and reads as kind-missing", () => {
  const text = "---\nkind: pharn-owned\nrole: griller\n\n### Layer 1\nx\n";
  assert.deepEqual(trimGriller(text), { text, omitted: [], whole: "unclosed-frontmatter", deep: "kind-missing" });
});

test("frontmatterKind returns only `pharn-owned` or a KIND_REASONS token (closed set, L36)", () => {
  assert.deepEqual(KIND_REASONS, ["kind-missing", "kind-ambiguous", "kind-other"]);
  assert.ok(Object.isFrozen(KIND_REASONS));
  const seen = new Set([...KIND_CASES.map(([, head]) => frontmatterKind(head + PRE)), frontmatterKind(FM + PRE)]);
  for (const v of [null, 42, "---", "---\nkind: x"]) seen.add(frontmatterKind(v));
  assert.deepEqual([...seen].sort(), ["kind-ambiguous", "kind-missing", "kind-other", "pharn-owned"]);
});

test("★ the summary line counts the kind gate with closed reason tokens and never prints the kind value (P2, L36)", () => {
  const entries = [
    ["a.md", FM],
    ["b.md", fm("kind: SECRET-KIND-VALUE\n")],
    ["c.md", fm("")],
    ["d.md", fm("kind: pharn-owned\nkind: pharn-owned\n")],
  ].map(([path, head]) => {
    const text = head + PRE + PROC;
    return { path, bytes: Buffer.byteLength(text), trimmed: trimGriller(text) };
  });
  const line = renderExtract(entries).split("\n")[0];
  assert.match(line, /; deep omission: 1 pharn-owned, 3 other: b\.md \(kind-other\), c\.md \(kind-missing\), d\.md \(kind-ambiguous\);/);
  assert.doesNotMatch(line, /SECRET-KIND-VALUE/);
  const tokens = [...line.matchAll(/\.md \((kind-[a-z]+)\)/g)].map((m) => m[1]);
  assert.ok(tokens.length === 3 && tokens.every((t) => KIND_REASONS.includes(t)), JSON.stringify(tokens));
});

// ── the fence and heading model (L55/L56 — every mistake must load MORE, never less) ──────────────

test("★ an omitted heading inside a backtick or tilde fence is content, not a heading — at either level", () => {
  for (const h of ["## Guarantee audit", "### Layer 1", "## Finding output"]) {
    for (const f of ["```", "~~~", "````"]) {
      const text = FM + PRE + `${f}\n${h}\nexample\n${f}\n\n` + PROC;
      assert.deepEqual(trimGriller(text), { text, omitted: [], whole: null, deep: true }, `${h} in ${f}`);
    }
  }
});

test("a fence inside an omitted section is dropped with it, and a heading line inside that fence does not end it", () => {
  for (const [open, inner] of [
    ["## Guarantee audit", "## Procedure"],
    ["### Layer 1", "### Layer 2"],
  ]) {
    const text = FM + PRE + `${open}\n\n\`\`\`\n${inner}\n\`\`\`\n\ngone\n\n` + PROC;
    const t = trimGriller(text);
    assert.equal(t.omitted.length, 1, open);
    assert.equal(t.text, FM + PRE + PROC, open);
  }
});

test("a 4-space-indented closer is fence content (CommonMark), so the heading after it stays inside the fence", () => {
  const text = FM + PRE + "```\n    ```\n## Guarantee audit\nin code\n```\n" + PROC;
  assert.deepEqual(trimGriller(text), { text, omitted: [], whole: null, deep: true });
});

test("★ the section ends at a setext heading, and that heading's text is kept with its underline", () => {
  for (const open of ["## Guarantee audit", "### Layer 1"]) {
    for (const u of ["---------", "========="]) {
      const text = FM + PRE + `${open}\ngone\n\nProcedure\nsecond line\n` + u + "\nkeep\n";
      const t = trimGriller(text);
      assert.equal(t.omitted.length, 1, `${open} ${u}`);
      assert.equal(t.text, FM + PRE + "Procedure\nsecond line\n" + u + "\nkeep\n", `${open} ${u}`);
    }
  }
});

test("the section ends at any ATX heading — indented, deeper, or after a list or blockquote marker", () => {
  for (const open of ["## Guarantee audit", "### Layer 1"]) {
    for (const h of ["   ## Procedure", "### Sub", "#### Deeper", "# Top", "- ## Item heading", "> ## Quoted", "1. # Numbered"]) {
      const text = FM + PRE + `${open}\ngone\n${h}\nkeep\n`;
      const t = trimGriller(text);
      assert.equal(t.text, FM + PRE + `${h}\nkeep\n`, `${open} → ${h}`);
    }
  }
});

test("★ START is level-exact: a member's prefix at another level, indented, or with no space is kept", () => {
  for (const h of [
    "## Layer 1 — wrong level",
    "#### Layer 1 — wrong level",
    "### Finding output",
    "### The two layers",
    "### Guarantee audit",
    "#### Machine-readable emission",
    "###Layer 1",
    " ### Layer 1",
    "   ### Layer 1",
    "\t### Layer 1",
    " ## Guarantee audit",
    "- ### Layer 1",
    "> ### Layer 1",
  ]) {
    const text = FM + PRE + `${h}\nkept\n` + PROC;
    assert.deepEqual(trimGriller(text), { text, omitted: [], whole: null, deep: true }, JSON.stringify(h));
  }
});

// GATE 2 F2: the prefix must end at a word boundary — the end of the text, a space or a tab. Before this, every one of
// the six near-misses below was DROPPED (two of them under the 6.60.0 members). Hand-written expectations, never the
// rule's own predicate (review lesson candidate A).
const NEAR_MISSES = [
  "### Layer 10 — x",
  "### Layer 1.5 — x",
  "## Finding outputs (x)",
  "## The two layersets",
  "## Guarantee auditing",
  "## Machine-readable emissions",
  "## Guarantee audit: x",
];
const REAL_FORMS = [
  ["### Layer 1", "layer-1"],
  ["### Layer 1 — x", "layer-1"],
  ["### Layer 1\t— a tab after the prefix", "layer-1"],
  ["### Layer 1 ", "layer-1"],
  ["## Finding output (x)", "finding-output"],
  ["## The two layers (P0)", "two-layers"],
  ["## Guarantee audit (P0)", "guarantee-audit"],
  ["## Machine-readable emission (`findings.json`)", "machine-readable-emission"],
];

test("★ START matches the prefix as a whole word: every near-miss is KEPT, every real form is left out (F2)", () => {
  for (const h of NEAR_MISSES) {
    const text = FM + PRE + `${h}\nkept\n` + PROC;
    assert.deepEqual(trimGriller(text), { text, omitted: [], whole: null, deep: true }, `near-miss kept: ${JSON.stringify(h)}`);
  }
  for (const [h, id] of REAL_FORMS) {
    const text = FM + PRE + `${h}\ngone\n` + PROC;
    const t = trimGriller(text);
    assert.deepEqual(t.omitted, [id], `real form dropped: ${JSON.stringify(h)}`);
    assert.equal(t.text, FM + PRE + PROC, JSON.stringify(h));
  }
  // The heading at the very end of the file (end of text, no newline) is a real form too.
  const eof = trimGriller(FM + PRE + PROC + "### Layer 1");
  assert.deepEqual(eof.omitted, ["layer-1"]);
  assert.equal(eof.text, FM + PRE + PROC);
});

test("closing hashes do not change a heading's text start, so `### Layer 1 ###` is left out like `### Layer 1`", () => {
  const text = FM + PRE + "### Layer 1 ###\ngone\n### Layer 2\nkeep\n";
  const t = trimGriller(text);
  assert.deepEqual(t.omitted, ["layer-1"]);
  assert.equal(t.text, FM + PRE + "### Layer 2\nkeep\n");
});

test("★ the chains: `## The two layers` → `### Layer 1` are both left out up to `### Presence`; the trailing trio goes too", () => {
  const twoLayers =
    "## The two layers (P0)\n\nintro\n\n### Layer 1 — FLOOR\n\nmembership\n\n" +
    "### Presence — what counts as a declaration\n\nkept presence\n\n### Layer 2 — ADVISORY\n\nkept judgment\n\n";
  const tail = "## Finding output\n\n```yaml\n- x\n```\n\n## Machine-readable emission\n\ny\n\n## Guarantee audit\n\nz\n";
  const t = trimGriller(FM + PRE + twoLayers + PROC + tail);
  assert.deepEqual(t.omitted, ["two-layers", "layer-1", "finding-output", "machine-readable-emission", "guarantee-audit"]);
  assert.equal(
    t.text,
    FM + PRE + "### Presence — what counts as a declaration\n\nkept presence\n\n### Layer 2 — ADVISORY\n\nkept judgment\n\n" + PROC
  );
});

test("a thematic break inside Layer 1 ends the drop (the safe direction: the text after it is kept)", () => {
  const text = FM + PRE + "### Layer 1\n\ngone\n\n---\n\nkept after the break\n\n### Layer 2\n\nkept\n";
  const t = trimGriller(text);
  assert.deepEqual(t.omitted, ["layer-1"]);
  assert.equal(t.text, FM + PRE + "---\n\nkept after the break\n\n### Layer 2\n\nkept\n");
});

test("CRLF line endings trim the same way and keep their bytes", () => {
  const lf = FM + PRE + PROC + SECTION["layer-1"] + SECTION["guarantee-audit"] + NOTES;
  const crlf = lf.replace(/\n/g, "\r\n");
  const t = trimGriller(crlf);
  assert.deepEqual(t.omitted, ["layer-1", "guarantee-audit"]);
  assert.equal(t.deep, true, "a CR after the kind value is not part of it");
  assert.equal(t.text, (FM + PRE + PROC + NOTES).replace(/\n/g, "\r\n"));
});

// ENF-3 (6.65.2): a leading UTF-8 BOM used to read as kind-missing (the deep members were kept — fail-closed, but out
// of parity with validate.mjs and count-grillers.mjs, which now count a BOM'd griller). Twin pair (L4): the BOM'd
// griller trims exactly as its clean twin, and the BOM stays as the output's first character (lossless bytes).
test("✧ ENF-3: a BOM'd pharn-owned griller reads pharn-owned and trims as its clean twin, keeping the BOM", () => {
  const bom = String.fromCharCode(0xfeff); // never a literal: it would be invisible in every diff
  const clean = FM + PRE + PROC + SECTION["layer-1"] + SECTION["guarantee-audit"] + NOTES;
  assert.equal(frontmatterKind(bom + clean), "pharn-owned");
  const twin = trimGriller(clean);
  const t = trimGriller(bom + clean);
  assert.deepEqual(t.omitted, twin.omitted);
  assert.deepEqual(t.omitted, ["layer-1", "guarantee-audit"], "precondition: the twin really trims");
  assert.equal(t.deep, true);
  assert.equal(t.whole, null);
  assert.equal(t.text, bom + twin.text);
  // not a mask: a BOM'd unclosed frontmatter still keeps the whole file
  const unclosed = `${bom}---\nname: x\nrole: griller\n\n## Guarantee audit\nx\n`;
  assert.deepEqual(trimGriller(unclosed), { text: unclosed, omitted: [], whole: "unclosed-frontmatter", deep: "kind-missing" });
});

const WHOLE_CASES = [
  ["unclosed-frontmatter", "---\nname: x\nrole: griller\n\n## Guarantee audit\nx\n"],
  ["unclosed-fence", FM + PRE + "## Guarantee audit\n```\nnever closed\n"],
  ["ambiguous-fence", FM + PRE + "- item\n  ```\n## X\n```\n## Guarantee audit\nrendered as code\n" + PROC],
  ["html-block", FM + PRE + "<!--\n## Guarantee audit\n-->\nkeep\n" + PROC],
];

test("★ every keep-whole reason returns the input unchanged with nothing omitted (closed set, L29)", () => {
  for (const [reason, text] of WHOLE_CASES) {
    const t = trimGriller(text);
    assert.deepEqual({ text: t.text, omitted: t.omitted, whole: t.whole }, { text, omitted: [], whole: reason }, reason);
  }
  assert.equal(new Set(WHOLE_CASES.map(([r]) => r)).size, 4);
});

// ── the GATE-1 closure over the committed grillers (L36) ─────────────────────────────────────────

/** Split a griller into its frontmatter (kept verbatim) and its body's lines, each carrying its own terminator. */
function split(text) {
  const close = text.startsWith("---") ? text.indexOf("\n---", 3) : -1;
  const at = close === -1 ? 0 : text.indexOf("\n", close + 1) + 1;
  const lines = text.slice(at).split("\n");
  return { head: text.slice(0, at), raws: lines.map((l, i) => (i < lines.length - 1 ? `${l}\n` : l)) };
}

/**
 * This test's own, simpler model of the omission for a `pharn-owned` griller: a member starts at a column-0 heading of
 * its exact level outside a fence and runs to the next `#` heading (any level, ≤3 spaces of indent) outside a fence.
 * Returns {text, heads: [member ids in file order]} — what the dropped lines SHOULD be.
 */
function modelTrim(text) {
  const { head, raws } = split(text);
  const out = [];
  const heads = [];
  let fence = null;
  let dropping = false;
  for (const raw of raws) {
    const line = raw.replace(/\r?\n$/, "");
    const f = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (fence) {
      if (f && f[1][0] === fence[0] && f[1].length >= fence.length && line.trim() === f[1]) fence = null;
    } else if (f) fence = f[1];
    else {
      const m = line.match(/^(#{1,6}) (.*)$/);
      // The prefix as a whole word, written here as its own regex (F2), not through the extract's helper.
      const word = (s) => new RegExp(`^${s.prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:[ \\t]|$)`);
      const member = m && OMITTED_SECTIONS.find((s) => s.level === m[1].length && word(s).test(m[2].trimStart()));
      if (member) {
        heads.push(member.id);
        dropping = true;
        continue;
      }
      if (/^ {0,3}#{1,6}(?:[ \t]|$)/.test(line)) dropping = false;
    }
    if (!dropping) out.push(raw);
  }
  return { text: head + out.join(""), heads };
}

/**
 * The closure pin, as a function so its discrimination can be tested (L60): the griller is `pharn-owned` by one exact
 * frontmatter line; every member matches exactly one heading of its level; the trim keeps nothing whole and admits the
 * deep members; and the trimmed text is EXACTLY the input minus the members' sections — so a member that also drops a
 * neighbour (`### Layer 2`, `### Presence`, `## Procedure`) fails, not only a missing member.
 */
function pinOffenders(path, text, trim = trimGriller) {
  const off = [];
  if ((text.match(/^kind: pharn-owned$/gm) ?? []).length !== 1) off.push(`${path}: not exactly one \`kind: pharn-owned\` line`);
  const model = modelTrim(text);
  for (const s of OMITTED_SECTIONS) {
    const n = model.heads.filter((id) => id === s.id).length;
    if (n !== 1) off.push(`${path}: ${n} heading(s) match ${s.id} ("${heading(s)}…"), expected 1`);
  }
  const t = trim(text);
  if (t.whole !== null) off.push(`${path}: kept whole (${t.whole})`);
  if (t.deep !== true) off.push(`${path}: deep is ${t.deep}`);
  if (t.text !== model.text) off.push(`${path}: the trimmed text is not the input minus exactly the members' sections`);
  return off;
}

const LIVE = (() => {
  const r = spawnSync(process.execPath, [join(HERE, "count-grillers.mjs"), REPO], { encoding: "utf8" });
  return JSON.parse(r.stdout).grillers.map((p) => ({ path: p, text: readFileSync(join(REPO, p), "utf8") }));
})();
const byName = (name) => LIVE.find((g) => g.path.endsWith(`/${name}/${name}.md`));

test("★ GATE-1 CLOSURE: every committed griller is pharn-owned, every member matches once, and exactly its sections drop", () => {
  assert.ok(LIVE.length >= 13, `L34: ${LIVE.length} registered griller(s), expected at least 13`);
  const offenders = LIVE.flatMap(({ path, text }) => pinOffenders(path, text));
  assert.deepEqual(offenders, []);
});

test("★ the closure DISCRIMINATES (L60): a renamed `### Layer 1`, a greedy trim, and a kept deep member each fail it", () => {
  const { path, text } = byName("a11y");
  const renamed = text.replace(/^### Layer 1/m, "### Floor layer");
  assert.equal(trimGriller(renamed).omitted.includes("layer-1"), false, "a renamed heading is kept");
  assert.match(pinOffenders(path, renamed).join("\n"), /0 heading\(s\) match layer-1/);
  const greedy = (t) => {
    const r = trimGriller(t);
    return { ...r, text: r.text.replace(/^### Layer 2[\s\S]*?(?=^## )/m, "") };
  };
  assert.match(pinOffenders(path, text, greedy).join("\n"), /not the input minus exactly/);
  const shallow = (t) => trimGriller(t.replace(/^kind: pharn-owned$/m, "kind: community"));
  assert.match(pinOffenders(path, text, shallow).join("\n"), /deep is kind-other/);
});

// ── lossless pins over the committed grillers (advisory claim, enum/regex backstops) ──────────────

/** The `##` section starting with `prefix`, up to the next `## ` heading. */
function h2Section(text, prefix) {
  const at = text.search(new RegExp(`^## ${prefix}`, "m"));
  if (at === -1) return null;
  const rest = text.slice(at + 3);
  const end = rest.search(/^## /m);
  return end === -1 ? rest : rest.slice(0, end);
}

/** Offenders when a griller's `## Finding output` rule_id / severity are not restated in its `## Procedure`. */
function restatementOffenders(path, text) {
  const fo = h2Section(text, "Finding output");
  const proc = h2Section(text, "Procedure");
  if (fo === null || proc === null) return [`${path}: no Finding output or Procedure section`];
  const rid = fo.match(/^\s*rule_id: "?([A-Za-z0-9-]+)"?/m)?.[1];
  const sev = fo.match(/^\s*severity: ([a-z]+)/m)?.[1];
  const off = [];
  if (!rid || !proc.includes(`rule_id: ${rid}`)) off.push(`${path}: Finding output rule_id ${rid} is not in the Procedure`);
  if (!sev || !proc.includes(`severity: ${sev}`)) off.push(`${path}: Finding output severity ${sev} is not in the Procedure`);
  return off;
}

test("★ LOSSLESS: each griller's Finding-output rule_id and severity are restated in its Procedure (L43: agreement only)", () => {
  assert.ok(LIVE.length >= 13, "L34: the domain is the committed grillers, never empty");
  assert.deepEqual(
    LIVE.flatMap(({ path, text }) => restatementOffenders(path, text)),
    []
  );
  // NEGATIVE CONTROL (L60): a changed template value is caught.
  const { path, text } = byName("observability");
  const changed = text.replace(/^(\s*rule_id: )P6( # enum-gated)/m, "$1P5$2");
  assert.notEqual(changed, text, "fixture sanity: the template line was found");
  assert.match(restatementOffenders(path, changed).join("\n"), /rule_id P5 is not in the Procedure/);
});

const PRESENCE = "### Presence — what counts as a declaration";
const PRESENCE_GRILLERS = ["a11y", "documentation", "error-handling", "testability"];

test("★ LOSSLESS: the four presence grillers keep their `### Presence` section in the extract", () => {
  for (const name of PRESENCE_GRILLERS) {
    const g = byName(name);
    assert.ok(g, `L34: ${name} is a committed griller`);
    const out = trimGriller(g.text).text;
    assert.ok(out.includes(`\n${PRESENCE}\n`), `${name}: the heading is in the extract`);
    const body = out.slice(out.indexOf(PRESENCE));
    assert.match(body, /^Presence is a \*\*structural\*\* property of the plan/m, name);
    assert.match(body.slice(0, body.indexOf("\n### Layer 2")), /- \*\*Absent\*\*[\s\S]*- \*\*Present\*\*/, name);
  }
  // NEGATIVE CONTROL (L60): without the heading the presence block sits in `### Layer 1` and is left out.
  const g = byName("a11y");
  const out = trimGriller(g.text.replace(`${PRESENCE}\n\n`, "")).text;
  assert.doesNotMatch(out, /Presence is a \*\*structural\*\* property/);
});

test("★ LOSSLESS: the two sentences moved out of `### Layer 1` (i18n, privacy) are in the extract", () => {
  const moved = [
    ["i18n", "The hardcoded-string scanner also **fires on markup the plan merely QUOTES illustratively**"],
    ["privacy", "The PII scanner is biased to well-known shapes + snake_case/SQL-style field declarations"],
  ];
  for (const [name, sentence] of moved) {
    const g = byName(name);
    assert.ok(g, `L34: ${name} is a committed griller`);
    const out = trimGriller(g.text).text;
    assert.ok(out.includes(sentence), `${name}: the moved sentence is in the extract`);
    const l2 = out.slice(out.indexOf("\n### Layer 2"));
    assert.ok(l2.indexOf(sentence) > 0 && l2.indexOf(sentence) < l2.indexOf("\n## Procedure"), `${name}: it sits in Layer 2`);
  }
});

// ── the authoring rule, stated where a griller's author edits or copies it (GATE 2 F1, review finding 1) ─────────

/** The exact sentence each `pharn-owned` griller carries at the end of its `## The two layers` intro (whitespace-folded). */
const AUTHORING_RULE =
  "**Not loaded by a full grill.** For a `kind: pharn-owned` griller, `pharn/floor/griller-extract.mjs` leaves out " +
  "`## The two layers` (this section), `### Layer 1`, `## Finding output`, `## Guarantee audit` and " +
  "`## Machine-readable emission`. Guidance a grill needs belongs under `## Procedure`, `### Layer 2` or a " +
  "`### Presence` section, never under those five headings.";
const fold = (s) => s.replace(/\s+/g, " ");

/** The `## The two layers` intro alone: from its heading to the next heading of any level, outside fences. */
function introOf(text) {
  const lines = text.split("\n");
  const at = lines.findIndex((l) => /^## The two layers(?:[ \t]|$)/.test(l));
  if (at === -1) return null;
  const out = [];
  let fence = false;
  for (const l of lines.slice(at + 1)) {
    if (/^ {0,3}(```|~~~)/.test(l)) fence = !fence;
    if (!fence && /^ {0,3}#{1,6}(?:[ \t]|$)/.test(l)) break;
    out.push(l);
  }
  return out.join("\n");
}

/**
 * Offenders when a griller the kind gate admits does not state the authoring rule in its intro, or when the rule reaches
 * the extract. A griller of any other kind keeps those sections and is not required to carry it.
 */
function authoringOffenders(path, text, trim = trimGriller) {
  if (frontmatterKind(text) !== "pharn-owned") return [];
  const off = [];
  const intro = introOf(text);
  if (intro === null || !fold(intro).includes(AUTHORING_RULE))
    off.push(`${path}: the authoring rule is not in its ## The two layers intro`);
  if (fold(trim(text).text).includes("**Not loaded by a full grill.**")) off.push(`${path}: the authoring rule reaches the extract`);
  return off;
}

test("★ AUTHORING RULE: every committed pharn-owned griller states it in its intro, and it never reaches the extract (F1)", () => {
  const owned = LIVE.filter(({ text }) => frontmatterKind(text) === "pharn-owned");
  assert.ok(owned.length >= 13, `L34: ${owned.length} pharn-owned griller(s), expected at least 13 — never a vacuous pass`);
  assert.deepEqual(
    LIVE.flatMap(({ path, text }) => authoringOffenders(path, text)),
    []
  );
});

test("★ AUTHORING RULE: the sentence names the heading of every OMITTED_SECTIONS member (adding one forces it to change)", () => {
  for (const s of OMITTED_SECTIONS) assert.ok(AUTHORING_RULE.includes(`\`${heading(s)}\``), `${s.id}: "${heading(s)}" is named`);
  assert.equal((AUTHORING_RULE.match(/`#{2,3} [^`]+`/g) ?? []).length, OMITTED_SECTIONS.length + 3, "the five members + three kept homes");
});

test("★ AUTHORING RULE DISCRIMINATES (L60): missing, or moved under ## Procedure, is RED; a community griller is exempt", () => {
  const rule =
    "**Not loaded by a full grill.** For a `kind: pharn-owned` griller, `pharn/floor/griller-extract.mjs` leaves out\n" +
    "`## The two layers` (this section), `### Layer 1`, `## Finding output`, `## Guarantee audit` and\n" +
    "`## Machine-readable emission`. Guidance a grill needs belongs under `## Procedure`, `### Layer 2` or a\n" +
    "`### Presence` section, never under those five headings.\n\n";
  const intro = "## The two layers (P0)\n\nintro\n\n";
  const layer1 = "### Layer 1 — x\n\nmembership\n\n";
  const good = FM + PRE + intro + rule + layer1 + PROC;
  assert.deepEqual(authoringOffenders("good.md", good), [], "control: the fixture that carries it passes");
  assert.match(authoringOffenders("missing.md", FM + PRE + intro + layer1 + PROC).join("\n"), /not in its ## The two layers intro/);
  const moved = authoringOffenders("moved.md", FM + PRE + intro + layer1 + PROC + rule).join("\n");
  assert.match(moved, /not in its ## The two layers intro/);
  assert.match(moved, /reaches the extract/);
  assert.deepEqual(authoringOffenders("community.md", FM_COMMUNITY + PRE + intro + layer1 + PROC), []);
});

// ── the CLI ───────────────────────────────────────────────────────────────────────────────────────

test("★ CLI over this repo: one summary line, a BEGIN/END frame per registered griller, fewer bytes than the files", () => {
  const r = run([REPO]);
  assert.equal(r.status, 0, r.stderr);
  const lines = r.stdout.split("\n");
  const n = LIVE.length;
  assert.match(lines[0], new RegExp(`^grillers: ${n} registered, ${n} printed \\(pharn/floor/griller-extract\\.mjs\\)`));
  const counts = OMITTED_SECTIONS.map((s) => `${s.id} (${n})`).join(", ");
  assert.ok(lines[0].endsWith(`; deep omission: ${n} pharn-owned, 0 other; left out where present: ${counts}; kept whole: none`), lines[0]);
  LIVE.forEach(({ path }, i) => {
    assert.ok(
      lines.includes(
        `${FRAME}${i + 1}/${n} BEGIN: ${path} (left out: two-layers, layer-1, finding-output, machine-readable-emission, guarantee-audit) =====`
      ),
      path
    );
    assert.ok(lines.includes(`${FRAME}${i + 1}/${n} END =====`), path);
  });
  const sum = LIVE.reduce((a, g) => a + Buffer.byteLength(g.text), 0);
  const [, read, printed] = lines[0].match(/— (\d+) B of griller files, (\d+) B printed/).map(Number);
  assert.equal(read, sum);
  assert.ok(
    printed < sum && Buffer.byteLength(r.stdout) < sum,
    `printed ${printed} B, stdout ${Buffer.byteLength(r.stdout)} B, files ${sum} B`
  );
});

test("★ CLI over a pharn-owned and a community griller: the community one keeps its three deeper sections", () => {
  const body = PRE + DEEP_SCOPED.map((id) => SECTION[id]).join("") + PROC + SECTION["guarantee-audit"];
  const dir = repoWith({ "g/a/a.md": FM + body, "g/b/b.md": FM_COMMUNITY + body });
  try {
    const r = run([dir]);
    assert.equal(r.status, 0, r.stderr);
    const line = r.stdout.split("\n")[0];
    assert.match(line, /; deep omission: 1 pharn-owned, 1 other: g\/b\/b\.md \(kind-other\);/);
    assert.match(line, /left out where present: guarantee-audit \(2\), machine-readable-emission \(0\), two-layers \(1\), layer-1 \(1\)/);
    assert.doesNotMatch(line, /community/, "the kind value is never printed");
    const frameB = r.stdout.slice(r.stdout.indexOf("BEGIN: g/b/b.md"));
    assert.match(frameB, /^BEGIN: g\/b\/b\.md \(left out: guarantee-audit\) =====/);
    for (const id of DEEP_SCOPED) assert.ok(frameB.includes(`a line of ${id}`), `community griller keeps ${id}`);
    const frameA = r.stdout.slice(r.stdout.indexOf("BEGIN: g/a/a.md"), r.stdout.indexOf("BEGIN: g/b/b.md"));
    assert.match(frameA, /left out: two-layers, layer-1, finding-output, guarantee-audit/);
    for (const id of DEEP_SCOPED) assert.ok(!frameA.includes(`a line of ${id}`), `pharn-owned griller loses ${id}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI with no argument reads the current directory (the one default, exercised — L41)", () => {
  const dir = repoWith({ "pharn/pharn-pipeline/grillers/demo/demo.md": FM + PRE + PROC + SECTION["guarantee-audit"] });
  try {
    const r = run([], { cwd: dir });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^grillers: 1 registered, 1 printed/);
    assert.match(r.stdout, /BEGIN: pharn\/pharn-pipeline\/grillers\/demo\/demo\.md \(left out: guarantee-audit\)/);
    assert.ok(r.stdout.includes(FM + PRE + PROC.trimEnd()));
    assert.doesNotMatch(r.stdout, /a line of guarantee-audit/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("★ zero registered grillers is an asserted silence at exit 0, never an empty stdout (L34)", () => {
  const dir = repoWith({ "README.md": "# nothing here\n" });
  try {
    const r = run([dir]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, "grillers: 0 registered — no griller to apply (pharn/floor/griller-extract.mjs)\n");
    assert.equal(renderExtract([]), r.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a griller kept whole is named in the summary with its reason, and printed in full", () => {
  const whole = WHOLE_CASES[1][1];
  const dir = repoWith({ "g/a/a.md": whole });
  try {
    const r = run([dir]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout.split("\n")[0], /kept whole: g\/a\/a\.md \(unclosed-fence\)$/);
    assert.ok(r.stdout.includes(whole.trimEnd()));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── refusals: exit 2, the reason on stderr, NOTHING on stdout ─────────────────────────────────────

function assertRefused(r, re) {
  assert.equal(r.status, 2, r.stderr);
  assert.equal(r.stdout, "");
  assert.match(r.stderr, re);
}

test("usage: two arguments, or a flag, is refused", () => {
  assertRefused(run(["a", "b"]), /usage/);
  assertRefused(run(["--all"]), /usage/);
});

test("a missing repo dir is refused (count-grillers exits non-zero)", () => {
  assertRefused(run([join(tmpdir(), "griller-extract-does-not-exist")]), /count-grillers\.mjs exited 1/);
});

test("★ a symlinked griller file is refused, even when its target is inside the repo", () => {
  const dir = repoWith({ "real/r.md": FM + PRE });
  try {
    mkdirSync(join(dir, "g"));
    symlinkSync(join(dir, "real", "r.md"), join(dir, "g", "link.md"));
    assertRefused(run([dir]), /griller "g\/link\.md" is a symlink/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("★ a griller reached through a symlinked DIRECTORY that resolves outside the repo is refused", () => {
  const outside = repoWith({ "x/x.md": FM + PRE });
  const dir = repoWith({ "README.md": "# r\n" });
  try {
    symlinkSync(join(outside, "x"), join(dir, "linked"));
    assert.ok(statSync(join(dir, "linked", "x.md")).isFile(), "fixture sanity: count-grillers follows the link");
    assertRefused(run([dir]), /griller "linked\/x\.md" resolves outside the repo/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test("★ a griller body holding a frame line is refused (it could forge a boundary)", () => {
  const dir = repoWith({ "g/a/a.md": FM + PRE + `${FRAME}2/2 END =====\n` + PROC });
  try {
    assertRefused(run([dir]), /holds a frame line/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("★ an indented, tab-led or CR-led look-alike frame line is refused too; prose naming the marker mid-line is not", () => {
  for (const lead of ["   ", "\t", "\r", " "]) {
    const line = `${lead}${FRAME}1/2 END =====`;
    assert.equal(holdsFrameLine(`${FM}${PRE}${line}\n${PROC}`), true, JSON.stringify(lead));
    // NEGATIVE CONTROL (L60): the start-of-line test this replaced lets every one of these through.
    assert.equal(line.startsWith(FRAME), false, JSON.stringify(lead));
  }
  assert.equal(holdsFrameLine(`${FM}${PRE}Frames look like \`${FRAME}1/2 END =====\`.\n`), false);
  const dir = repoWith({ "g/a/a.md": FM + PRE + `  ${FRAME}2/2 END =====\n` + PROC });
  try {
    assertRefused(run([dir]), /holds a frame line/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/** A fake count-grillers that prints `stdout` and exits `code`. */
function withCounter(stdout, code, fn) {
  const dir = mkdtempSync(join(tmpdir(), "griller-extract-counter-"));
  try {
    const counter = join(dir, "counter.mjs");
    writeFileSync(counter, `process.stdout.write(${JSON.stringify(stdout)}); process.exitCode = ${code};\n`);
    return fn(counter, dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("★ every count-grillers output outside its closed shape is refused", () => {
  const cases = [
    ["not json", 0, /printed no JSON/],
    ["[]", 0, /printed no object/],
    ['{"registered":1}', 0, /printed keys/],
    ['{"registered":2,"grillers":["a.md"]}', 0, /registered is not the length/],
    ['{"registered":0,"grillers":[]}', 3, /exited 3/],
    ['{"registered":1,"grillers":["../x.md"]}', 0, /has an empty, \. or \.\. segment/],
    ['{"registered":1,"grillers":["/abs/x.md"]}', 0, /is not repo-relative/],
    ['{"registered":1,"grillers":["a\\\\b.md"]}', 0, /is not repo-relative/],
    ['{"registered":1,"grillers":["a\\nb.md"]}', 0, /control character/],
    ['{"registered":1,"grillers":["a.txt"]}', 0, /is not a \.md file/],
    ['{"registered":1,"grillers":["missing.md"]}', 0, /cannot be found/],
    ['{"registered":1,"grillers":[{"toString":1}]}', 0, /is not a non-empty string/],
  ];
  for (const [stdout, code, re] of cases) {
    withCounter(stdout, code, (counter, dir) => {
      const r = extractGrillers(dir, { counter });
      assert.equal(r.ok, false, stdout);
      assert.match(r.reason, re, stdout);
    });
  }
});

test("★ a FIFO griller is refused as not a regular file, without blocking the open (6.60.1, one-descriptor read)", () => {
  withCounter('{"registered":1,"grillers":["f.md"]}', 0, (counter, dir) => {
    const made = spawnSync("mkfifo", [join(dir, "f.md")], { encoding: "utf8" });
    assert.equal(made.status, 0, `fixture: mkfifo failed: ${made.stderr}`);
    // A blocking open of a FIFO with no writer would hang this test; the call returning at all is the first pin.
    const r = extractGrillers(dir, { counter });
    assert.equal(r.ok, false);
    assert.match(r.reason, /griller "f\.md" is not a regular file/);
  });
});

test("★ shown() never throws, even on a value whose String() throws (L62)", () => {
  const hostile = JSON.parse('{"toString":1}');
  assert.throws(() => String(hostile), TypeError, "control: String() really throws on this value");
  assert.equal(shown(hostile), '"[object Object]"');
  assert.equal(shown([hostile]), '"[object Array]"');
  assert.equal(shown("x".repeat(300)), JSON.stringify(`${"x".repeat(200)}…`), "long values are cut to 200 characters");
});
